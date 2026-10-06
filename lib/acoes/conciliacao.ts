"use server";

import {
  criarFatura,
  desfazerPar,
  fecharMes,
  inserirItens,
  obterFatura,
  pareamentoAutomatico,
  parearManual,
  reabrirMes,
} from "@/lib/conciliacao";
import { exigirUsuario } from "@/lib/auth";
import { nomeDoMes, normalizarMes } from "@/lib/datas";
import { flashErro, flashSucesso, numero, texto } from "@/lib/flash";
import { parsearCentavos } from "@/lib/numerario";
import { invalido } from "@/lib/regras";

// Ações da tela de conciliação. Todo acesso passa pelas funções de lib/conciliacao,
// que já conferem a permissão conciliacao.gerir / fechamento.gerir e gravam a
// trilha de auditoria. Os redirects de feedback (flash) acontecem SEMPRE fora do
// try, porque redirect() lança exceção.

const TELA = "/conciliacao";

type ItemLido = { data: string; descricao: string; fornecedor: string; valor_centavos: number };

function competenciaDoForm(formData: FormData): string {
  return normalizarMes(texto(formData, "mes", 7));
}

// Aceita AAAA-MM-DD e DD/MM/AAAA (a digitação manual costuma vir no formato BR).
function paraDataIso(bruto: string): string {
  const s = bruto.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (!m) return s;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

// Digitação assistida da fatura: a XP não entrega o arquivo em formato utilizável,
// então o gestor transcreve uma linha por lançamento no formato
//   data;fornecedor;descrição;valor
// Linhas vazias e comentários (#) são ignorados; qualquer erro de formato aborta
// a importação inteira, porque a fatura precisa fechar com o total exato.
function lerLinhasDaFatura(bruto: string): { itens: ItemLido[]; erros: string[] } {
  const itens: ItemLido[] = [];
  const erros: string[] = [];
  bruto.split(/\r?\n/).forEach((linha, indice) => {
    const limpa = linha.trim();
    if (limpa === "" || limpa.startsWith("#")) return;
    const partes = limpa.split(/[;|]/).map((p) => p.trim());
    const numeroDaLinha = indice + 1;
    if (partes.length < 4) {
      erros.push(`linha ${numeroDaLinha}: esperava data;fornecedor;descrição;valor`);
      return;
    }
    const resto = partes.slice(1);
    const valorBruto = resto.pop() ?? "";
    const fornecedor = resto.shift() ?? "";
    const descricao = resto.join(" · ");
    const data = paraDataIso(partes[0]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      erros.push(`linha ${numeroDaLinha}: data "${partes[0]}" inválida (use AAAA-MM-DD)`);
      return;
    }
    if (fornecedor === "") {
      erros.push(`linha ${numeroDaLinha}: falta o fornecedor`);
      return;
    }
    let valor = 0;
    try {
      valor = parsearCentavos(valorBruto);
    } catch {
      erros.push(`linha ${numeroDaLinha}: valor "${valorBruto}" ilegível (use 1.234,56)`);
      return;
    }
    if (valor === 0) {
      erros.push(`linha ${numeroDaLinha}: item com valor zero não entra na fatura`);
      return;
    }
    itens.push({
      data,
      fornecedor: fornecedor.slice(0, 200),
      descricao: descricao.slice(0, 300),
      valor_centavos: valor,
    });
  });
  return { itens, erros };
}

export async function criarFaturaAction(formData: FormData) {
  const usuario = await exigirUsuario();
  const competencia = competenciaDoForm(formData);
  const jaExistia = Boolean(await obterFatura(competencia));
  try {
    await criarFatura(competencia, usuario);
  } catch (erro) {
    flashErro(erro);
  }
  flashSucesso(
    TELA,
    jaExistia
      ? `A fatura de ${nomeDoMes(competencia)} já estava cadastrada: nada foi duplicado.`
      : `Fatura de ${nomeDoMes(competencia)} cadastrada: importe agora os itens recebidos da fatura do cartão.`,
  );
}

export async function inserirItensAction(formData: FormData) {
  const usuario = await exigirUsuario();
  const competencia = competenciaDoForm(formData);
  let importados = 0;
  let criouFatura = false;
  try {
    let destino = numero(formData, "fatura_id");
    if (!destino) {
      const existente = await obterFatura(competencia);
      destino = existente ? existente.id : await criarFatura(competencia, usuario);
      criouFatura = !existente;
    }
    const lidos = lerLinhasDaFatura(texto(formData, "itens", 20000));
    if (lidos.erros.length > 0) {
      invalido(`nenhum item foi importado — ${lidos.erros.slice(0, 4).join("; ")}`);
    }
    if (lidos.itens.length === 0) invalido("nenhuma linha válida encontrada no texto");
    importados = await inserirItens(destino, lidos.itens, usuario);
  } catch (erro) {
    flashErro(erro);
  }
  flashSucesso(
    TELA,
    `${importados} item(ns) da fatura de ${nomeDoMes(competencia)} importado(s)${
      criouFatura ? " (fatura criada automaticamente)" : ""
    }. Rode o pareamento automático em seguida.`,
  );
}

export async function pareamentoAutomaticoAction(formData: FormData) {
  const usuario = await exigirUsuario();
  const competencia = competenciaDoForm(formData);
  let pareados = 0;
  let semPar = 0;
  try {
    const resultado = await pareamentoAutomatico(numero(formData, "fatura_id"), usuario);
    pareados = resultado.pareados;
    semPar = resultado.tolerancia;
  } catch (erro) {
    flashErro(erro);
  }
  flashSucesso(
    TELA,
    `Pareamento automático de ${nomeDoMes(competencia)}: ${pareados} item(ns) conciliado(s), ${semPar} aguardando conferência manual.`,
  );
}

export async function parearManualAction(formData: FormData) {
  const usuario = await exigirUsuario();
  const competencia = competenciaDoForm(formData);
  try {
    await parearManual(numero(formData, "item_id"), numero(formData, "compra_id"), texto(formData, "motivo"), usuario);
  } catch (erro) {
    flashErro(erro);
  }
  flashSucesso(TELA, `Par manual registrado em ${nomeDoMes(competencia)} com o motivo informado.`);
}

export async function desfazerParAction(formData: FormData) {
  const usuario = await exigirUsuario();
  const competencia = competenciaDoForm(formData);
  try {
    await desfazerPar(numero(formData, "item_id"), texto(formData, "motivo"), usuario);
  } catch (erro) {
    flashErro(erro);
  }
  flashSucesso(TELA, `Pareamento desfeito em ${nomeDoMes(competencia)}: o item voltou a divergir.`);
}

export async function fecharMesAction(formData: FormData) {
  const usuario = await exigirUsuario();
  const competencia = competenciaDoForm(formData);
  try {
    await fecharMes(competencia, texto(formData, "motivo"), usuario);
  } catch (erro) {
    flashErro(erro);
  }
  flashSucesso(
    TELA,
    `${nomeDoMes(competencia)} fechada. As compras, rateios e itens de fatura ficaram bloqueados para edição.`,
  );
}

export async function reabrirMesAction(formData: FormData) {
  const usuario = await exigirUsuario();
  const competencia = competenciaDoForm(formData);
  try {
    await reabrirMes(competencia, texto(formData, "justificativa"), usuario);
  } catch (erro) {
    flashErro(erro);
  }
  flashSucesso(TELA, `${nomeDoMes(competencia)} reaberta com justificativa; a trilha guarda quem pediu a reabertura.`);
}
