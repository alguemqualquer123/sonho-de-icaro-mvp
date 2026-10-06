import { agora, banco } from "./db";
import { PERMISSOES, pode } from "./rbac";
import { registrarTrilha } from "./auditoria";
import { forbidden, invalido, naoEncontrado } from "./regras";
import { fechamentoDaCompetencia } from "./compras";
import { formatarCentavos } from "./numerario";
import type { Usuario } from "./auth";

export type Fatura = { id: number; competencia: string; total_centavos: number; criado_em: string };
export type ItemFatura = {
  id: number;
  fatura_id: number;
  data: string;
  descricao: string;
  fornecedor: string;
  valor_centavos: number;
  compra_id: number | null;
  pareamento: "nenhum" | "auto" | "manual";
  numero?: string;
};

async function exigirConciliacao(usuario: Usuario) {
  if (!pode(usuario.papel, PERMISSOES.conciliacaoGerir)) {
    forbidden(`${usuario.papel} não trabalha com a fatura do cartão`);
  }
}

function semAcentos(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function fornecedoresSemelhantes(a: string, b: string): boolean {
  const x = semAcentos(a);
  const y = semAcentos(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.includes(y) || y.includes(x)) return true;
  return x.slice(0, 4) === y.slice(0, 4) && x.slice(0, 4).length === 4;
}

function diasEntre(a: string, b: string): number {
  return Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;
}

export async function listarFaturas(): Promise<Fatura[]> {
  return banco().all<Fatura>("SELECT * FROM faturas ORDER BY competencia DESC");
}

export async function obterFatura(competencia: string): Promise<Fatura | undefined> {
  return banco().get<Fatura>("SELECT * FROM faturas WHERE competencia = ?", [competencia]);
}

export async function criarFatura(competencia: string, usuario: Usuario): Promise<number> {
  await exigirConciliacao(usuario);
  if (!/^\d{4}-\d{2}$/.test(competencia)) invalido("competência deve estar no formato AAAA-MM");
  const existente = await obterFatura(competencia);
  if (existente) return existente.id;
  return banco().transaction(async () => {
    const r = await banco().run("INSERT INTO faturas(competencia, criado_em) VALUES (?, ?) RETURNING id", [competencia, agora()]);
    await registrarTrilha({ usuario, entidade: "fatura", entidadeId: r.lastInsertRowid, acao: "criar", depois: { competencia } });
    return Number(r.lastInsertRowid);
  });
}

export async function inserirItens(
  faturaId: number,
  itens: { data: string; descricao: string; fornecedor: string; valor_centavos: number }[],
  usuario: Usuario,
): Promise<number> {
  await exigirConciliacao(usuario);
  if (itens.length === 0) invalido("nenhum item recebido");
  for (const i of itens) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(i.data)) invalido(`data inválida: ${i.data}`);
    if (i.valor_centavos === 0) invalido("item com valor zero não entra na fatura");
  }
  const fatura = await banco().get("SELECT * FROM faturas WHERE id = ?", [faturaId]) as Fatura | undefined;
  if (!fatura) naoEncontrado("fatura");
  const fechada = await fechamentoDaCompetencia(fatura!.competencia);
  if (fechada && !fechada.reaberto_em) invalido(`a competência ${fatura!.competencia} está fechada`);

  return banco().transaction(async () => {
    for (const i of itens) {
      await banco().run(
        `INSERT INTO itens_fatura(fatura_id, data, descricao, fornecedor, valor_centavos, criado_em)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [faturaId, i.data, i.descricao.slice(0, 300), i.fornecedor.slice(0, 200), i.valor_centavos, agora()],
      );
    }
    const totalLinha = await banco().get(
      "SELECT COALESCE(SUM(valor_centavos), 0)::bigint AS t FROM itens_fatura WHERE fatura_id = ?",
      [faturaId],
    ) as { t: number } | undefined;
    const total = Number(totalLinha?.t ?? 0);
    await banco().run("UPDATE faturas SET total_centavos = ? WHERE id = ?", [total, faturaId]);
    await registrarTrilha({
      usuario,
      entidade: "fatura",
      entidadeId: faturaId,
      acao: "itens",
      depois: { quantidade: itens.length, total_centavos: total },
    });
    return itens.length;
  });
}

export async function listarItens(faturaId: number): Promise<ItemFatura[]> {
  return banco().all<ItemFatura>(
    `SELECT i.*, c.numero FROM itens_fatura i LEFT JOIN compras c ON c.id = i.compra_id
      WHERE i.fatura_id = ? ORDER BY i.data DESC, i.id DESC`,
    [faturaId],
  );
}

export async function candidatosPareamento(competencia: string) {
  return banco().all<{ id: number; numero: string; data: string; fornecedor: string; valor_centavos: number }>(
    `SELECT c.id, c.numero, c.data, c.fornecedor, c.valor_centavos
       FROM compras c
      WHERE c.competencia = ? AND c.status <> 'cancelada'
        AND c.id NOT IN (SELECT COALESCE(compra_id, 0) FROM itens_fatura WHERE compra_id IS NOT NULL)
      ORDER BY c.data`,
    [competencia],
  );
}

export async function pareamentoAutomatico(faturaId: number, usuario: Usuario): Promise<{ pareados: number; tolerancia: number }> {
  await exigirConciliacao(usuario);
  const fatura = await banco().get("SELECT * FROM faturas WHERE id = ?", [faturaId]) as Fatura | undefined;
  if (!fatura) naoEncontrado("fatura");
  const itens = (await listarItens(fatura!.id)).filter((i) => i.compra_id === null);
  const compras = await candidatosPareamento(fatura!.competencia);
  const usadas = new Set<number>();
  let pareados = 0;

  await banco().transaction(async () => {
    for (const item of itens) {
      const exato = compras.find(
        (c) =>
          !usadas.has(c.id) &&
          c.valor_centavos === item.valor_centavos &&
          fornecedoresSemelhantes(c.fornecedor, item.fornecedor) &&
          diasEntre(c.data, item.data) <= 7,
      );
      if (exato) {
        await banco().run("UPDATE itens_fatura SET compra_id = ?, pareamento = 'auto' WHERE id = ?", [exato.id, item.id]);
        usadas.add(exato.id);
        pareados += 1;
        continue;
      }
      // Tolerância de centavos (R$ 0,05) só quando fornecedor e data batem:
      // pareamento aproximado nunca é automático sem origem parecida.
      const aproximado = compras.find(
        (c) =>
          !usadas.has(c.id) &&
          Math.abs(c.valor_centavos - item.valor_centavos) <= 5 &&
          fornecedoresSemelhantes(c.fornecedor, item.fornecedor) &&
          diasEntre(c.data, item.data) <= 3,
      );
      if (aproximado) {
        await banco().run("UPDATE itens_fatura SET compra_id = ?, pareamento = 'auto' WHERE id = ?", [aproximado.id, item.id]);
        usadas.add(aproximado.id);
        pareados += 1;
      }
    }
    await registrarTrilha({
      usuario,
      entidade: "conciliacao",
      entidadeId: fatura!.id,
      acao: "pareamento-automatico",
      depois: { analisados: itens.length, pareados },
    });
  });
  return { pareados, tolerancia: itens.length - pareados };
}

export async function parearManual(itemFaturaId: number, compraId: number, motivo: string, usuario: Usuario) {
  await exigirConciliacao(usuario);
  if (motivo.trim().length < 5) invalido("o pareamento manual exige motivo");
  const item = await banco().get("SELECT * FROM itens_fatura WHERE id = ?", [itemFaturaId]) as ItemFatura | undefined;
  const compra = await banco().get("SELECT id, numero, valor_centavos FROM compras WHERE id = ?", [compraId]) as
    | { id: number; numero: string; valor_centavos: number }
    | undefined;
  if (!item) naoEncontrado("item de fatura");
  if (!compra) naoEncontrado("compra");
  if (item!.compra_id) invalido("este item já está pareado");
  const usado = await banco().get("SELECT COUNT(*)::int AS n FROM itens_fatura WHERE compra_id = ?", [compraId]) as { n: number } | undefined;
  if ((usado?.n ?? 0) > 0) invalido("esta compra já foi conciliada com outro item da fatura");
  const diferenca = Math.abs(item!.valor_centavos - compra!.valor_centavos);
  if (diferenca > 100) {
    invalido(
      `diferença de ${formatarCentavos(diferenca)} entre fatura e compra exige conferência: ajuste o lançamento ou pareie item a item`,
    );
  }
  await banco().transaction(async () => {
    await banco().run("UPDATE itens_fatura SET compra_id = ?, pareamento = 'manual' WHERE id = ?", [compraId, itemFaturaId]);
    await registrarTrilha({
      usuario,
      entidade: "conciliacao",
      entidadeId: itemFaturaId,
      acao: "par-manual",
      depois: { compra: compra!.numero, diferenca_centavos: diferenca },
      motivo,
    });
  });
}

export async function desfazerPar(itemFaturaId: number, motivo: string, usuario: Usuario) {
  await exigirConciliacao(usuario);
  if (motivo.trim().length < 5) invalido("desfazer um pareamento exige motivo");
  const item = await banco().get("SELECT * FROM itens_fatura WHERE id = ?", [itemFaturaId]) as ItemFatura | undefined;
  if (!item) naoEncontrado("item de fatura");
  const fatura = await banco().get("SELECT * FROM faturas WHERE id = ?", [item!.fatura_id]) as Fatura;
  const fechada = await fechamentoDaCompetencia(fatura.competencia);
  if (fechada && !fechada.reaberto_em) invalido(`a competência ${fatura.competencia} está fechada`);
  await banco().transaction(async () => {
    await banco().run("UPDATE itens_fatura SET compra_id = NULL, pareamento = 'nenhum' WHERE id = ?", [itemFaturaId]);
    await registrarTrilha({
      usuario,
      entidade: "conciliacao",
      entidadeId: itemFaturaId,
      acao: "desfazer-par",
      antes: { compra_id: item!.compra_id },
      motivo,
    });
  });
}

export async function divergencias(competencia: string) {
  const itensNaoPareados = await banco().all<ItemFatura>(
    `SELECT i.*, c.numero FROM itens_fatura i LEFT JOIN compras c ON c.id = i.compra_id
      JOIN faturas f ON f.id = i.fatura_id
     WHERE f.competencia = ? AND i.compra_id IS NULL ORDER BY i.data DESC`,
    [competencia],
  );
  const comprasNaFatura = new Set(
    (
      await banco().all<{ compra_id: number }>(
        `SELECT i.compra_id FROM itens_fatura i JOIN faturas f ON f.id = i.fatura_id
          WHERE f.competencia = ? AND i.compra_id IS NOT NULL`,
        [competencia],
      )
    ).map((r) => r.compra_id),
  );
  const ausentesNaFatura = (
    await banco().all<{ id: number; numero: string; data: string; fornecedor: string; valor_centavos: number }>(
      `SELECT c.id, c.numero, c.data, c.fornecedor, c.valor_centavos FROM compras c
        WHERE c.competencia = ? AND c.status <> 'cancelada'`,
      [competencia],
    )
  ).filter((c) => !comprasNaFatura.has(c.id));
  return { itensNaoPareados, ausentesNaFatura };
}

export async function fecharMes(competencia: string, motivo: string, usuario: Usuario) {
  if (!pode(usuario.papel, PERMISSOES.fechamentoGerir)) forbidden(`${usuario.papel} não fecha a competência`);
  if (!/^\d{4}-\d{2}$/.test(competencia)) invalido("competência deve estar no formato AAAA-MM");
  const existente = await fechamentoDaCompetencia(competencia);
  if (existente && !existente.reaberto_em) invalido(`a competência ${competencia} já está fechada`);
  const { itensNaoPareados, ausentesNaFatura } = await divergencias(competencia);
  const temDivergencia = itensNaoPareados.length > 0 || ausentesNaFatura.length > 0;
  if (temDivergencia && motivo.trim().length < 10) {
    invalido(
      `há ${itensNaoPareados.length} item(ns) da fatura sem par e ${ausentesNaFatura.length} compra(s) ausente(s) na fatura; descreva a justificativa com ao menos 10 caracteres`,
    );
  }
  await banco().transaction(async () => {
    if (existente) {
      await banco().run(
        "UPDATE fechamentos SET fechado_em = ?, fechado_por = ?, reaberto_em = NULL, motivo_reabertura = '' WHERE competencia = ?",
        [agora(), usuario.id, competencia],
      );
    } else {
      await banco().run("INSERT INTO fechamentos(competencia, fechado_em, fechado_por) VALUES (?, ?, ?)", [competencia, agora(), usuario.id]);
    }
    await registrarTrilha({
      usuario,
      entidade: "fechamento",
      entidadeId: competencia,
      acao: "fechar",
      depois: { itens_sem_par: itensNaoPareados.length, compras_ausentes: ausentesNaFatura.length },
      motivo,
    });
  });
}

export async function reabrirMes(competencia: string, motivo: string, usuario: Usuario) {
  if (!pode(usuario.papel, PERMISSOES.fechamentoGerir) && !pode(usuario.papel, PERMISSOES.comprasEditarFechada)) {
    forbidden(`${usuario.papel} não reabre a competência`);
  }
  if (motivo.trim().length < 10) invalido("a reabertura exige justificativa com ao menos 10 caracteres");
  const existente = await fechamentoDaCompetencia(competencia);
  if (!existente) invalido(`a competência ${competencia} não está fechada`);
  if (existente.reaberto_em) invalido(`a competência ${competencia} já está reaberta`);
  await banco().transaction(async () => {
    await banco().run("UPDATE fechamentos SET reaberto_em = ?, motivo_reabertura = ? WHERE competencia = ?", [agora(), motivo.trim(), competencia]);
    await registrarTrilha({ usuario, entidade: "fechamento", entidadeId: competencia, acao: "reabrir", motivo });
  });
}

export async function situacaoFechamento() {
  return banco().all<{ competencia: string; fechado_em: string; reaberto_em: string | null; motivo_reabertura: string; fechado_por: string }>(
    `SELECT f.competencia, f.fechado_em, f.reaberto_em, f.motivo_reabertura, u.nome AS fechado_por
       FROM fechamentos f JOIN usuarios u ON u.id = f.fechado_por ORDER BY f.competencia DESC`,
  );
}