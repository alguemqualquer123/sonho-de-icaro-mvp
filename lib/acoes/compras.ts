"use server";

import {
  criarCompra,
  editarCompra,
  revisarCompra,
  cancelarCompra,
  registrarCompensacao,
  salvarAlocacao,
  excluirAlocacao,
  obterCompra,
  salvarAnexo,
  marcarLegibilidadeAnexo,
  removerAnexo,
  type InputAlocacao,
} from "@/lib/compras";
import { exigirUsuario } from "@/lib/auth";
import { flashErro, flashSucesso, texto, numero, opcionalNumero } from "@/lib/flash";
import { parsearCentavos, dividirIgual } from "@/lib/numerario";

// Regra de ouro deste arquivo: flashErro/flashSucesso chamam redirect(), que
// LANÇA uma exceção. Por isso todo flash fica FORA do try — dentro do catch
// apenas o flashErro (que é o caminho de erro), nunca o de sucesso.

function erroCampo(campo: string): never {
  flashErro(new Error(`informe o campo "${campo}"`));
}

function baseDaCompra(fd: FormData): number {
  const compraId = opcionalNumero(fd, "compra_id");
  if (!compraId) erroCampo("compra_id");
  return compraId;
}

export async function criarCompraAction(fd: FormData) {
  const usuario = await exigirUsuario();
  const valorBruto = texto(fd, "valor", 30);
  if (valorBruto === "") erroCampo("valor");
  let id = 0;
  try {
    id = await criarCompra(
      {
        data: texto(fd, "data", 10),
        fornecedor: texto(fd, "fornecedor", 200),
        descricao: texto(fd, "descricao", 400),
        valor_centavos: parsearCentavos(valorBruto),
        parcelas_total: numero(fd, "parcelas_total") || 1,
        setor_id: opcionalNumero(fd, "setor_id"),
        observacao: texto(fd, "observacao"),
      },
      usuario,
    );
  } catch (erro) {
    flashErro(erro);
  }
  flashSucesso(`/compras/${id}`, "compra registrada; agora faça o rateio");
}

export async function editarCompraAction(fd: FormData) {
  const usuario = await exigirUsuario();
  const id = opcionalNumero(fd, "id");
  if (!id) erroCampo("id da compra");
  const valorBruto = texto(fd, "valor", 30);
  const parcelas = numero(fd, "parcelas_total");
  try {
    await editarCompra(
      id,
      {
        data: texto(fd, "data", 10) || undefined,
        fornecedor: texto(fd, "fornecedor", 200) || undefined,
        descricao: texto(fd, "descricao", 400) || undefined,
        valor_centavos: valorBruto === "" ? undefined : parsearCentavos(valorBruto),
        parcelas_total: parcelas > 0 ? parcelas : undefined,
        setor_id: fd.has("setor_id") ? opcionalNumero(fd, "setor_id") : undefined,
        observacao: fd.has("observacao") ? texto(fd, "observacao") : undefined,
      },
      usuario,
      texto(fd, "motivo", 400),
    );
  } catch (erro) {
    flashErro(erro);
  }
  flashSucesso(`/compras/${id}`, "compra atualizada");
}

export async function cancelarCompraAction(fd: FormData) {
  const usuario = await exigirUsuario();
  const id = opcionalNumero(fd, "id");
  if (!id) erroCampo("id da compra");
  const motivo = texto(fd, "motivo", 400);
  if (motivo === "") erroCampo("motivo do cancelamento");
  try {
    await cancelarCompra(id, motivo, usuario);
  } catch (erro) {
    flashErro(erro);
  }
  flashSucesso(`/compras/${id}`, "compra cancelada; o cancelamento ficou registrado como evento novo");
}

const ACÕES_REVISAO = ["enviar-conferencia", "aprovar", "contestar"] as const;

export async function revisarAction(fd: FormData) {
  const usuario = await exigirUsuario();
  const id = opcionalNumero(fd, "compra_id");
  if (!id) erroCampo("compra_id");
  const acao = texto(fd, "acao", 30);
  if (!(ACÕES_REVISAO as readonly string[]).includes(acao)) {
    flashErro(new Error("ação de revisão inválida; use enviar-conferencia, aprovar ou contestar"));
  }
  const motivo = texto(fd, "motivo", 400);
  try {
    await revisarCompra(id, usuario, { acao: acao as (typeof ACÕES_REVISAO)[number], motivo });
  } catch (erro) {
    flashErro(erro);
  }
  const mensagens: Record<string, string> = {
    "enviar-conferencia": "compra enviada para conferência",
    aprovar: "compra aprovada; ela fica travada para edição",
    contestar: "compra contestada; o responsável foi orientado pelo motivo registrado",
  };
  flashSucesso(`/compras/${id}`, mensagens[acao] ?? "revisão registrada");
}

export async function compensarAction(fd: FormData) {
  const usuario = await exigirUsuario();
  const id = opcionalNumero(fd, "compra_id");
  if (!id) erroCampo("compra_id");
  const tipo = texto(fd, "tipo", 20);
  if (tipo !== "estorno" && tipo !== "reembolso") {
    flashErro(new Error("tipo de compensação inválido; use estorno ou reembolso"));
  }
  const valorBruto = texto(fd, "valor", 30);
  if (valorBruto === "") erroCampo("valor");
  const motivo = texto(fd, "motivo", 400);
  if (motivo === "") erroCampo("motivo");
  try {
    await registrarCompensacao(id, tipo, parsearCentavos(valorBruto), motivo, usuario);
  } catch (erro) {
    flashErro(erro);
  }
  flashSucesso(`/compras/${id}`, `${tipo} registrado como evento novo; a compra original não foi apagada`);
}

export async function salvarAlocacaoAction(fd: FormData) {
  const usuario = await exigirUsuario();
  const compraId = baseDaCompra(fd);
  const valorBruto = texto(fd, "valor", 30);
  if (valorBruto === "") erroCampo("valor da alocação");
  const id = opcionalNumero(fd, "id");
  let alocacaoId = 0;
  try {
    const input: InputAlocacao = {
      compra_id: compraId,
      id: id ?? undefined,
      categoria_id: numero(fd, "categoria_id"),
      setor_id: numero(fd, "setor_id"),
      turma_id: opcionalNumero(fd, "turma_id"),
      centro_custo_id: opcionalNumero(fd, "centro_custo_id"),
      projeto_id: opcionalNumero(fd, "projeto_id"),
      valor_centavos: parsearCentavos(valorBruto),
      observacao: texto(fd, "observacao"),
    };
    alocacaoId = await salvarAlocacao(input, usuario, texto(fd, "motivo", 400));
  } catch (erro) {
    flashErro(erro);
  }
  flashSucesso(
    `/compras/${compraId}`,
    id ? `alocação ${alocacaoId} atualizada` : `alocação ${alocacaoId} registrada; o total da compra não mudou`,
  );
}

export async function excluirAlocacaoAction(fd: FormData) {
  const usuario = await exigirUsuario();
  const compraId = baseDaCompra(fd);
  const id = opcionalNumero(fd, "id");
  if (!id) erroCampo("id da alocação");
  const motivo = texto(fd, "motivo", 400);
  if (motivo === "") erroCampo("motivo da exclusão");
  try {
    await excluirAlocacao(id, usuario, motivo);
  } catch (erro) {
    flashErro(erro);
  }
  flashSucesso(`/compras/${compraId}`, `alocação ${id} excluída; o valor volta a ficar como saldo a classificar`);
}

export async function dividirRateioIgualAction(fd: FormData) {
  const usuario = await exigirUsuario();
  const compraId = baseDaCompra(fd);
  const partes = numero(fd, "partes");
  let repartidas = 0;
  try {
    const compra = await obterCompra(compraId);
    if (partes < 1 || partes > 50) throw new Error("informe de 1 a 50 partes para a divisão igual");
    const saldo = compra.saldo_centavos ?? 0;
    if (saldo <= 0) throw new Error("não há saldo a repartir: o rateio já cobre o total da compra");
    if (saldo < partes) throw new Error("o saldo não comporta tantas partes; cada alocação precisa ser maior que zero");
    const valores = dividirIgual(saldo, partes);
    const base: Omit<InputAlocacao, "valor_centavos" | "observacao"> = {
      compra_id: compraId,
      categoria_id: numero(fd, "categoria_id"),
      setor_id: numero(fd, "setor_id"),
      turma_id: opcionalNumero(fd, "turma_id"),
      centro_custo_id: opcionalNumero(fd, "centro_custo_id"),
      projeto_id: opcionalNumero(fd, "projeto_id"),
    };
    const obs = texto(fd, "observacao");
    for (let i = 0; i < valores.length; i++) {
      await salvarAlocacao(
        { ...base, valor_centavos: valores[i], observacao: `parte ${i + 1} de ${partes}${obs ? ` · ${obs}` : ""}` },
        usuario,
      );
      repartidas += 1;
    }
  } catch (erro) {
    flashErro(erro);
  }
  flashSucesso(`/compras/${compraId}`, `saldo repartido igualmente em ${repartidas} alocação(ões)`);
}

export async function uploadAnexoAction(fd: FormData) {
  const usuario = await exigirUsuario();
  const compraId = baseDaCompra(fd);
  const arquivo = fd.get("arquivo");
  if (typeof arquivo === "string" || !arquivo || typeof arquivo.arrayBuffer !== "function") {
    flashErro(new Error("selecione um comprovante: imagem (jpg, png, webp, heic) ou PDF"));
  }
  const nome = arquivo.name;
  try {
    await salvarAnexo(compraId, arquivo, usuario);
  } catch (erro) {
    flashErro(erro);
  }
  flashSucesso(`/compras/${compraId}`, `comprovante "${nome}" anexado`);
}

export async function marcarLegibilidadeAction(fd: FormData) {
  const usuario = await exigirUsuario();
  const compraId = baseDaCompra(fd);
  const id = opcionalNumero(fd, "id");
  if (!id) erroCampo("id do anexo");
  const legivel = texto(fd, "legivel", 4) === "1";
  const motivo = texto(fd, "motivo", 400);
  if (motivo === "") erroCampo("motivo da avaliação");
  try {
    await marcarLegibilidadeAnexo(id, legivel, motivo, usuario);
  } catch (erro) {
    flashErro(erro);
  }
  flashSucesso(`/compras/${compraId}`, `comprovante ${id} marcado como ${legivel ? "legível" : "ilegível"}`);
}

export async function removerAnexoAction(fd: FormData) {
  const usuario = await exigirUsuario();
  const compraId = baseDaCompra(fd);
  const id = opcionalNumero(fd, "id");
  if (!id) erroCampo("id do anexo");
  const motivo = texto(fd, "motivo", 400);
  if (motivo === "") erroCampo("motivo da remoção");
  try {
    await removerAnexo(id, motivo, usuario);
  } catch (erro) {
    flashErro(erro);
  }
  flashSucesso(`/compras/${compraId}`, `comprovante ${id} removido; a remoção ficou na trilha`);
}