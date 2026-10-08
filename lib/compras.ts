import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { UPLOADS_DIR, agora, banco, competenciaDaData } from "./db";
import { enviarArquivoFiveManage, excluirArquivoFiveManage, temFiveManage } from "./fivemanage";
import { formatarCentavos } from "./numerario";
import { PERMISSOES, coordenacaoDoPapel, pode } from "./rbac";
import { registrarTrilha } from "./auditoria";
import { forbidden, invalido, naoEncontrado } from "./regras";
import type { Usuario } from "./auth";

export const LIMITE_ANEXO_BYTES = 10_000_000;
export const STATUS = ["rascunho", "enviada", "aprovada", "contestada", "cancelada"] as const;
export type Status = (typeof STATUS)[number];

export type Compra = {
  id: number;
  numero: string;
  data: string;
  competencia: string;
  fornecedor: string;
  descricao: string;
  valor_centavos: number;
  parcelas_total: number;
  status: Status;
  responsavel_id: number;
  setor_id: number | null;
  observacao: string;
  motivo_cancelamento: string;
  criado_em: string;
  atualizado_em: string;
  responsavel_nome?: string;
  rateado_centavos?: number;
  saldo_centavos?: number;
  total_anexos?: number;
};

export type Alocacao = {
  id: number;
  compra_id: number;
  categoria_id: number;
  setor_id: number;
  turma_id: number | null;
  centro_custo_id: number | null;
  projeto_id: number | null;
  valor_centavos: number;
  observacao: string;
  categoria_nome?: string;
  setor_nome?: string;
  turma_nome?: string;
  coordenacao_codigo?: string;
};

export type Anexo = {
  id: number;
  compra_id: number;
  nome_arquivo: string;
  mime: string;
  tamanho_bytes: number;
  legivel: number | null;
  criado_em: string;
};

const SELECT_LISTA = `
  SELECT c.*, u.nome AS responsavel_nome, r.rateado_centavos, r.saldo_centavos, r.total_anexos
    FROM compras c
    JOIN usuarios u ON u.id = c.responsavel_id
    JOIN vw_resumo_compra r ON r.id = c.id`;

export async function fechamentoDaCompetencia(competencia: string) {
  return banco().get(
    "SELECT * FROM fechamentos WHERE competencia = ?",
    [competencia],
  ) as Promise<
    | { competencia: string; fechado_em: string; reaberto_em: string | null; motivo_reabertura: string }
    | undefined
  >;
}

// Mês fechado trava escrita para qualquer perfil; a única saída é a reabertura
// justificada (RF-25 do projeto original).
export async function garantirMesAberto(competencia: string, acao: string) {
  const fechamento = await fechamentoDaCompetencia(competencia);
  if (fechamento && !fechamento.reaberto_em) {
    invalido(`a competência ${competencia} está fechada; reabra com justificativa antes de ${acao}`);
  }
}

async function garantirNaoAprovada(compra: Compra, acao: string, usuario: Usuario) {
  if (compra.status === "aprovada" && !pode(usuario.papel, PERMISSOES.revisaoGerir)) {
    invalido(`compra aprovada não aceita ${acao}; use estorno/cancelamento ou reabra a revisão`);
  }
  if (compra.status === "cancelada") {
    invalido(`compra cancelada não aceita ${acao}`);
  }
}

function podeEditar(usuario: Usuario, compra: Compra): boolean {
  if (pode(usuario.papel, PERMISSOES.comprasEditar)) return true;
  return compra.responsavel_id === usuario.id && pode(usuario.papel, PERMISSOES.comprasEditarProprias);
}

export async function listarCompras(
  usuario: Usuario,
  filtros: {
    competencia?: string;
    status?: string;
    fornecedor?: string;
    busca?: string;
    setorId?: number;
    limite?: number;
  } = {},
): Promise<Compra[]> {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (!pode(usuario.papel, PERMISSOES.comprasVerTodas)) {
    where.push("c.responsavel_id = ?");
    params.push(usuario.id);
  }
  if (filtros.competencia) {
    where.push("c.competencia = ?");
    params.push(filtros.competencia);
  }
  if (filtros.status && (STATUS as readonly string[]).includes(filtros.status)) {
    where.push("c.status = ?");
    params.push(filtros.status);
  }
  if (filtros.fornecedor) {
    where.push("c.fornecedor = ?");
    params.push(filtros.fornecedor);
  }
  if (filtros.busca) {
    where.push("(c.fornecedor LIKE ? OR c.descricao LIKE ? OR c.numero LIKE ?)");
    const like = `%${filtros.busca}%`;
    params.push(like, like, like);
  }
  if (filtros.setorId) {
    // Um setor pode aparecer de dois jeitos: no destino da compra (c.setor_id)
    // ou dentro do rateio (alocação). Aceitamos os dois para o filtro ser útil
    // mesmo com compras lançadas antes do rateio ser obrigatório.
    where.push(
      "(c.setor_id = ? OR EXISTS (SELECT 1 FROM alocacoes a WHERE a.compra_id = c.id AND a.setor_id = ?))",
    );
    params.push(filtros.setorId, filtros.setorId);
  }
  params.push(Math.min(Math.max(filtros.limite ?? 100, 1), 500));
  return banco().all<Compra>(
    `${SELECT_LISTA}
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY c.data DESC, c.id DESC LIMIT ?`,
    params,
  );
}

export async function obterCompra(id: number): Promise<Compra> {
  const compra = await banco().get<Compra>(`${SELECT_LISTA} WHERE c.id = ?`, [id]);
  if (!compra) naoEncontrado("compra");
  return compra!;
}

// Quem enxerga a compra: quem vê todas (perfis de gestão/auditoria) ou o próprio
// responsável. Ratear não dá leitura sozinho, mas a conferência com alocacoes.editar
// também precisa enxergar para classificar (igual ao filtro de coordenação abaixo).
export function podeVerCompra(usuario: Usuario, compra: Compra): boolean {
  return (
    pode(usuario.papel, PERMISSOES.comprasVerTodas) ||
    compra.responsavel_id === usuario.id ||
    pode(usuario.papel, PERMISSOES.alocacoesEditar)
  );
}

export async function verCompra(id: number, usuario: Usuario): Promise<{ compra: Compra; alocacoes: Alocacao[]; anexos: Anexo[]; eventos: unknown[] }> {
  const compra = await obterCompra(id);
  if (!podeVerCompra(usuario, compra)) forbidden(`você não tem acesso à compra ${compra.numero}`);
  const alocacoes = await listarAlocacoes(id);
  if (!pode(usuario.papel, PERMISSOES.comprasVerTodas)) {
    const coord = coordenacaoDoPapel(usuario.papel);
    if (coord && compra.responsavel_id !== usuario.id) {
      const daCoord = alocacoes.some((a) => a.coordenacao_codigo === coord);
      if (!daCoord) forbidden(`a compra ${compra.numero} está fora da sua coordenação`);
    }
  }
  const anexos = await banco().all<Anexo>(
    "SELECT id, compra_id, nome_arquivo, mime, tamanho_bytes, legivel, criado_em FROM anexos WHERE compra_id = ? ORDER BY id",
    [id],
  );
  const eventos = await banco().all(
    `SELECT e.*, u.nome AS criado_por_nome FROM eventos_financeiros e
      JOIN usuarios u ON u.id = e.criado_por WHERE e.compra_id = ? ORDER BY e.id`,
    [id],
  );
  return { compra, alocacoes, anexos, eventos };
}

export async function listarAlocacoes(compraId: number): Promise<Alocacao[]> {
  return banco().all<Alocacao>(
    `SELECT a.*, cat.nome AS categoria_nome, s.nome AS setor_nome,
            t.nome AS turma_nome, co.codigo AS coordenacao_codigo
       FROM alocacoes a
       JOIN categorias cat ON cat.id = a.categoria_id
       JOIN setores s ON s.id = a.setor_id
       LEFT JOIN turmas t ON t.id = a.turma_id
       LEFT JOIN coordenacoes co ON co.id = t.coordenacao_id
      WHERE a.compra_id = ? ORDER BY a.id`,
    [compraId],
  );
}

async function proximoNumero(competencia: string): Promise<string> {
  const mensal = competencia.replace("-", "");
  const linha = await banco().get(
    "SELECT COUNT(*)::int AS n FROM compras WHERE competencia = ?",
    [competencia],
  ) as { n: number } | undefined;
  return `C-${mensal}-${String((linha?.n ?? 0) + 1).padStart(3, "0")}`;
}

// Regra financeira central: a soma do rateio nunca pode ultrapassar o total da
// compra. O que falta classificar fica visível como saldo, nunca vira gasto novo.
async function validarRateio(compraId: number, totalCompra: number, ignorarAlocacaoId = 0) {
  const linha = await banco().get(
    `SELECT COALESCE(SUM(valor_centavos), 0)::bigint AS rateado FROM alocacoes
      WHERE compra_id = ? AND id <> ?`,
    [compraId, ignorarAlocacaoId],
  ) as { rateado: number } | undefined;
  const rateado = Number(linha?.rateado ?? 0);
  return { rateado, saldo: totalCompra - rateado };
}

export async function criarCompra(input: {
  data: string;
  fornecedor: string;
  descricao: string;
  valor_centavos: number;
  parcelas_total: number;
  setor_id?: number | null;
  observacao: string;
}, usuario: Usuario): Promise<number> {
  if (!pode(usuario.papel, PERMISSOES.comprasCriar)) forbidden(`${usuario.papel} não pode registrar compras`);
  if (input.valor_centavos <= 0) invalido("o valor da compra deve ser maior que zero");
  if (input.parcelas_total < 1 || input.parcelas_total > 99) invalido("parcelas deve estar entre 1 e 99");
  if (input.valor_centavos % input.parcelas_total !== 0 && input.parcelas_total > 1) {
    // Parcelas com centavos quebrados são permitidas, mas o valor lançado é o
    // da parcela do mês; nada é multiplicado no total.
    invalido(`o valor ${formatarCentavos(input.valor_centavos)} não divide de forma exata em ${input.parcelas_total} parcelas`);
  }
  const competencia = competenciaDaData(input.data);
  await garantirMesAberto(competencia, "registrar compras");

  const id = await banco().transaction(async () => {
    const r = await banco().run(
      `INSERT INTO compras(numero, data, competencia, fornecedor, descricao, valor_centavos,
         parcelas_total, status, responsavel_id, setor_id, observacao, criado_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'rascunho', ?, ?, ?, ?, ?) RETURNING id`,
      [
        await proximoNumero(competencia),
        input.data,
        competencia,
        input.fornecedor,
        input.descricao,
        input.valor_centavos,
        input.parcelas_total,
        usuario.id,
        input.setor_id ?? null,
        input.observacao,
        agora(),
        agora(),
      ],
    );
    await registrarTrilha({
      usuario,
      entidade: "compra",
      entidadeId: r.lastInsertRowid,
      acao: "criar",
      depois: { valor_centavos: input.valor_centavos, fornecedor: input.fornecedor, competencia },
    });
    return Number(r.lastInsertRowid);
  });
  return id;
}

export async function editarCompra(
  id: number,
  input: { data?: string; fornecedor?: string; descricao?: string; valor_centavos?: number; parcelas_total?: number; setor_id?: number | null; observacao?: string },
  usuario: Usuario,
  motivo = "",
) {
  const compra = await obterCompra(id);
  if (!podeEditar(usuario, compra)) forbidden(`${usuario.papel} não pode editar a compra ${compra.numero}`);
  await garantirNaoAprovada(compra, "edição", usuario);
  const competencia = competenciaDaData(input.data ?? compra.data);
  await garantirMesAberto(competencia, "editar compras");
  if (motivo === "" && compra.status !== "rascunho") invalido("toda correção fora do rascunho exige motivo");
  const novoValor = input.valor_centavos ?? compra.valor_centavos;
  if (novoValor <= 0) invalido("o valor da compra deve ser maior que zero");
  if (novoValor !== compra.valor_centavos) {
    const { rateado } = await validarRateio(id, novoValor);
    if (rateado > novoValor) {
      invalido(
        `o rateio atual (${formatarCentavos(rateado)}) excede o novo valor (${formatarCentavos(novoValor)}); ajuste as alocações antes`,
      );
    }
  }

  await banco().transaction(async () => {
    await banco().run(
      `UPDATE compras SET data = ?, competencia = ?, fornecedor = ?, descricao = ?, valor_centavos = ?,
         parcelas_total = ?, setor_id = ?, observacao = ?, atualizado_em = ? WHERE id = ?`,
      [
        input.data ?? compra.data,
        competencia,
        input.fornecedor ?? compra.fornecedor,
        input.descricao ?? compra.descricao,
        novoValor,
        input.parcelas_total ?? compra.parcelas_total,
        input.setor_id === undefined ? compra.setor_id : input.setor_id,
        input.observacao ?? compra.observacao,
        agora(),
        id,
      ],
    );
    await registrarTrilha({
      usuario,
      entidade: "compra",
      entidadeId: id,
      acao: "editar",
      antes: { valor_centavos: compra.valor_centavos, fornecedor: compra.fornecedor, data: compra.data },
      depois: { valor_centavos: novoValor, fornecedor: input.fornecedor ?? compra.fornecedor, data: input.data ?? compra.data },
      motivo,
    });
  });
}

type FiltrosRevisao = { acao: "enviar-conferencia" | "aprovar" | "contestar"; motivo?: string };

export async function revisarCompra(id: number, usuario: Usuario, { acao, motivo = "" }: FiltrosRevisao) {
  const compra = await obterCompra(id);
  await garantirMesAberto(compra.competencia, `revisar compras (${acao})`);
  const atual = { valor_centavos: compra.valor_centavos, status: compra.status };

  if (acao === "enviar-conferencia") {
    if (!podeEditar(usuario, compra)) forbidden("só o responsável ou quem tem compras.editar pode enviar para conferência");
    if (compra.status === "aprovada" || compra.status === "enviada") invalido(`a compra já está ${compra.status}`);
    const { saldo } = await validarRateio(id, compra.valor_centavos);
    if (saldo !== 0) {
      invalido(
        saldo > 0
          ? `faltam ${formatarCentavos(saldo)} de rateio para enviar para conferência`
          : `o rateio excede o total em ${formatarCentavos(-saldo)}`,
      );
    }
    await banco().transaction(async () => {
      await banco().run("UPDATE compras SET status = 'enviada', enviado_por = ?, enviado_em = ?, atualizado_em = ? WHERE id = ?", [
        usuario.id, agora(), agora(), id,
      ]);
      await registrarTrilha({ usuario, entidade: "compra", entidadeId: id, acao, antes: atual, depois: { status: "enviada" } });
    });
    return;
  }

  if (!pode(usuario.papel, PERMISSOES.revisaoGerir)) forbidden(`${usuario.papel} não aprova nem contesta compras`);
  if (compra.status !== "enviada") invalido("só compras enviadas para conferência podem ser aprovadas ou contestadas");

  if (acao === "aprovar") {
    await banco().transaction(async () => {
      await banco().run("UPDATE compras SET status = 'aprovada', aprovado_por = ?, aprovado_em = ?, atualizado_em = ? WHERE id = ?", [
        usuario.id, agora(), agora(), id,
      ]);
      await registrarTrilha({ usuario, entidade: "compra", entidadeId: id, acao, antes: atual, depois: { status: "aprovada" } });
    });
    return;
  }

  const motivoLimpo = motivo.trim();
  if (motivoLimpo.length < 5) invalido("a contestação exige motivo com ao menos 5 caracteres");
  await banco().transaction(async () => {
    await banco().run(
      `UPDATE compras SET status = 'contestada', contestado_por = ?, contestado_em = ?,
         motivo_contestacao = ?, atualizado_em = ? WHERE id = ?`,
      [usuario.id, agora(), motivoLimpo, agora(), id],
    );
    await registrarTrilha({
      usuario,
      entidade: "compra",
      entidadeId: id,
      acao,
      antes: atual,
      depois: { status: "contestada" },
      motivo: motivoLimpo,
    });
  });
}

export async function cancelarCompra(id: number, motivo: string, usuario: Usuario) {
  const compra = await obterCompra(id);
  if (!pode(usuario.papel, PERMISSOES.comprasCancelar)) forbidden(`${usuario.papel} não pode cancelar compras`);
  if (compra.status === "cancelada") invalido("a compra já está cancelada");
  const motivoLimpo = motivo.trim();
  if (motivoLimpo.length < 5) invalido("o cancelamento exige motivo com ao menos 5 caracteres");
  await garantirMesAberto(compra.competencia, "cancelar compras");
  await banco().transaction(async () => {
    await banco().run(
      "UPDATE compras SET status = 'cancelada', motivo_cancelamento = ?, cancelado_por = ?, cancelado_em = ?, atualizado_em = ? WHERE id = ?",
      [motivoLimpo, usuario.id, agora(), agora(), id],
    );
    // Cancelar nunca apaga: registra como evento novo na mesma compra.
    await banco().run(
      "INSERT INTO eventos_financeiros(compra_id, tipo, valor_centavos, motivo, criado_por, criado_em) VALUES (?, 'correcao', ?, ?, ?, ?)",
      [id, -compra.valor_centavos, `cancelamento: ${motivoLimpo}`, usuario.id, agora()],
    );
    await registrarTrilha({
      usuario,
      entidade: "compra",
      entidadeId: id,
      acao: "cancelar",
      antes: { status: compra.status },
      depois: { status: "cancelada" },
      motivo: motivoLimpo,
    });
  });
}

export async function registrarCompensacao(
  id: number,
  tipo: "estorno" | "reembolso",
  valorCentavos: number,
  motivo: string,
  usuario: Usuario,
) {
  const compra = await obterCompra(id);
  if (!pode(usuario.papel, PERMISSOES.comprasEditar)) forbidden(`${usuario.papel} não registra ${tipo}`);
  if (valorCentavos <= 0) invalido(`o valor do ${tipo} deve ser maior que zero`);
  if (motivo.trim().length < 5) invalido(`o ${tipo} exige motivo com ao menos 5 caracteres`);
  await garantirMesAberto(compra.competencia, `registrar ${tipo}`);
  await banco().transaction(async () => {
    await banco().run(
      "INSERT INTO eventos_financeiros(compra_id, tipo, valor_centavos, motivo, criado_por, criado_em) VALUES (?, ?, ?, ?, ?, ?)",
      [id, tipo, valorCentavos, motivo.trim(), usuario.id, agora()],
    );
    await registrarTrilha({
      usuario,
      entidade: "compra",
      entidadeId: id,
      acao: tipo,
      depois: { valor_centavos: valorCentavos },
      motivo,
    });
  });
}

export type InputAlocacao = {
  compra_id: number;
  id?: number;
  categoria_id: number;
  setor_id: number;
  turma_id?: number | null;
  centro_custo_id?: number | null;
  projeto_id?: number | null;
  valor_centavos: number;
  observacao?: string;
};

async function garantirCatalogos(input: InputAlocacao) {
  const categoria = await banco().get("SELECT id, ativo FROM categorias WHERE id = ?", [input.categoria_id]) as { ativo: number } | undefined;
  if (!categoria) invalido("categoria inválida");
  if (categoria!.ativo !== 1) invalido("a categoria escolhida está desativada");
  const setor = await banco().get("SELECT id, ativo FROM setores WHERE id = ?", [input.setor_id]) as { ativo: number } | undefined;
  if (!setor) invalido("setor inválido");
  if (setor!.ativo !== 1) invalido("o setor escolhido está desativado");
  if (input.turma_id) {
    const turma = await banco().get("SELECT id, ativo FROM turmas WHERE id = ?", [input.turma_id]) as { ativo: number } | undefined;
    if (!turma) invalido("turma inválida");
    if (turma!.ativo !== 1) invalido("a turma escolhida está desativada");
  }
  if (input.valor_centavos <= 0) invalido("cada alocação precisa ser maior que zero");
}

async function garantirPermissaoRateio(usuario: Usuario, compra: Compra, turmaId: number | null) {
  if (pode(usuario.papel, PERMISSOES.alocacoesEditar)) {
    if (podeEditar(usuario, compra)) return;
  }
  const coord = coordenacaoDoPapel(usuario.papel);
  if (coord && pode(usuario.papel, PERMISSOES.alocacoesEditarCoord)) {
    if (!turmaId) invalido(`o perfil ${usuario.papel} precisa escolher uma turma da coordenação ${coord}`);
    const turma = await banco().get(
      "SELECT co.codigo AS coord FROM turmas t JOIN coordenacoes co ON co.id = t.coordenacao_id WHERE t.id = ?",
      [turmaId],
    ) as { coord: string } | undefined;
    if (!turma || turma.coord !== coord) forbidden(`você só rateia turmas da coordenação ${coord}`);
    return;
  }
  forbidden(`${usuario.papel} não pode editar o rateio`);
}

export async function salvarAlocacao(input: InputAlocacao, usuario: Usuario, motivo = ""): Promise<number> {
  await garantirCatalogos(input);
  const compra = await obterCompra(input.compra_id);
  await garantirPermissaoRateio(usuario, compra, input.turma_id ?? null);
  await garantirNaoAprovada(compra, "alteração do rateio", usuario);
  await garantirMesAberto(compra.competencia, "alterar o rateio");

  return banco().transaction(async () => {
    const { rateado } = await validarRateio(compra.id, compra.valor_centavos, input.id ?? 0);
    if (rateado + input.valor_centavos > compra.valor_centavos) {
      const excede = rateado + input.valor_centavos - compra.valor_centavos;
      invalido(
        `o rateio não pode ultrapassar o total da compra (${formatarCentavos(compra.valor_centavos)}); excede em ${formatarCentavos(excede)}`,
      );
    }
    if (input.id) {
      await banco().run(
        `UPDATE alocacoes SET categoria_id = ?, setor_id = ?, turma_id = ?, centro_custo_id = ?,
           projeto_id = ?, valor_centavos = ?, observacao = ? WHERE id = ? AND compra_id = ?`,
        [
          input.categoria_id,
          input.setor_id,
          input.turma_id ?? null,
          input.centro_custo_id ?? null,
          input.projeto_id ?? null,
          input.valor_centavos,
          input.observacao ?? "",
          input.id,
          compra.id,
        ],
      );
      await registrarTrilha({
        usuario,
        entidade: "alocacao",
        entidadeId: input.id,
        acao: "editar",
        depois: { valor_centavos: input.valor_centavos, compra_id: compra.id },
        motivo,
      });
      return input.id;
    }
    const r = await banco().run(
      `INSERT INTO alocacoes(compra_id, categoria_id, setor_id, turma_id, centro_custo_id, projeto_id, valor_centavos, observacao, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        compra.id,
        input.categoria_id,
        input.setor_id,
        input.turma_id ?? null,
        input.centro_custo_id ?? null,
        input.projeto_id ?? null,
        input.valor_centavos,
        input.observacao ?? "",
        agora(),
      ],
    );
    await registrarTrilha({
      usuario,
      entidade: "alocacao",
      entidadeId: r.lastInsertRowid,
      acao: "criar",
      depois: { valor_centavos: input.valor_centavos, compra_id: compra.id },
    });
    return Number(r.lastInsertRowid);
  });
}

export async function excluirAlocacao(id: number, usuario: Usuario, motivo = "") {
  const alocacao = await banco().get("SELECT * FROM alocacoes WHERE id = ?", [id]) as Alocacao | undefined;
  if (!alocacao) naoEncontrado("alocação");
  const compra = await obterCompra(alocacao!.compra_id);
  await garantirPermissaoRateio(usuario, compra, alocacao!.turma_id);
  await garantirNaoAprovada(compra, "exclusão de alocação", usuario);
  await garantirMesAberto(compra.competencia, "excluir alocação");
  await banco().transaction(async () => {
    await banco().run("DELETE FROM alocacoes WHERE id = ?", [id]);
    await registrarTrilha({
      usuario,
      entidade: "alocacao",
      entidadeId: id,
      acao: "excluir",
      antes: { valor_centavos: alocacao!.valor_centavos, compra_id: compra.id },
      motivo,
    });
  });
}

export type ResumoRateio = {
  chave: string;
  nome: string;
  valor_centavos: number;
  percentual: number;
};

export async function resumoRateio(compraId: number, eixo: "setor" | "categoria" | "turma" | "coordenacao"): Promise<ResumoRateio[]> {
  const mapa: Record<string, string> = {
    setor: "s.codigo AS chave, s.nome AS nome",
    categoria: "cat.codigo AS chave, cat.nome AS nome",
    turma: "COALESCE(t.codigo, 'SEM TURMA') AS chave, COALESCE(t.nome, 'Sem turma') AS nome",
    coordenacao: "COALESCE(co.codigo, 'SEM COORDENACAO') AS chave, COALESCE(co.nome, 'Sem coordenação') AS nome",
  };
  const sel = mapa[eixo];
  if (!sel) invalido(`eixo de resumo inválido: ${eixo}`);
  const totalLinha = await banco().get("SELECT valor_centavos FROM compras WHERE id = ?", [compraId]) as
    | { valor_centavos: number }
    | undefined;
  const total = totalLinha?.valor_centavos;
  if (total === undefined) naoEncontrado("compra");
  const linhas = await banco().all<{ chave: string; nome: string; valor_centavos: number }>(
    `SELECT ${sel}, SUM(a.valor_centavos)::bigint AS valor_centavos
       FROM alocacoes a
       JOIN categorias cat ON cat.id = a.categoria_id
       JOIN setores s ON s.id = a.setor_id
       LEFT JOIN turmas t ON t.id = a.turma_id
       LEFT JOIN coordenacoes co ON co.id = t.coordenacao_id
       WHERE a.compra_id = ? GROUP BY 1, 2 ORDER BY valor_centavos DESC`,
    [compraId],
  );
  return linhas.map((l) => ({ ...l, valor_centavos: Number(l.valor_centavos), percentual: Math.round((Number(l.valor_centavos) / total!) * 1000) / 10 }));
}

// ---- anexos -------------------------------------------------------------

const EXTENSOES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
};

export async function salvarAnexo(
  compraId: number,
  arquivo: { name: string; type: string; arrayBuffer: () => Promise<ArrayBuffer> },
  usuario: Usuario,
): Promise<number> {
  const compra = await obterCompra(compraId);
  if (!pode(usuario.papel, PERMISSOES.anexosGerir) && compra.responsavel_id !== usuario.id) {
    forbidden(`${usuario.papel} não pode anexar comprovantes a outras compras`);
  }
  await garantirMesAberto(compra.competencia, "anexar comprovantes");
  const ext = EXTENSOES[arquivo.type];
  if (!ext) invalido("envie uma imagem (jpg, png, webp, heic) ou PDF");
  const buffer = Buffer.from(await arquivo.arrayBuffer());
  if (buffer.byteLength === 0) invalido("o arquivo está vazio");
  if (buffer.byteLength > LIMITE_ANEXO_BYTES) invalido("o arquivo excede 10 MB");
  // Fotos vão para o CDN do FiveManage; PDF fica em disco e o disco também
  // é o fallback se a API falhar — o upload nunca quebra por causa do CDN.
  let caminho = "";
  let remotoId = "";
  let remotoUrl = "";
  let destino: "fivemanager" | "local" = "local";
  const nomeEnvio = `compra-${compra.id}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
  if (arquivo.type !== "application/pdf" && temFiveManage()) {
    try {
      const remoto = await enviarArquivoFiveManage({ buffer, nome: nomeEnvio, mime: arquivo.type });
      remotoId = remoto.id;
      remotoUrl = remoto.url;
      caminho = `fivemanager:${remoto.id}`;
      destino = "fivemanager";
    } catch {
      // cai para o disco local abaixo
    }
  }
  if (destino === "local") {
    caminho = `anexo-${crypto.randomBytes(12).toString("hex")}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, caminho), buffer);
  }
  return banco().transaction(async () => {
    const r = await banco().run(
      "INSERT INTO anexos(compra_id, nome_arquivo, caminho, mime, tamanho_bytes, remoto_id, remoto_url, criado_por, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
      [compra.id, arquivo.name.slice(0, 200), caminho, arquivo.type, buffer.byteLength, remotoId, remotoUrl, usuario.id, agora()],
    );
    await registrarTrilha({
      usuario,
      entidade: "anexo",
      entidadeId: r.lastInsertRowid,
      acao: "upload",
      depois: { compra_id: compra.id, nome: arquivo.name, tamanho_bytes: buffer.byteLength, destino },
    });
    return Number(r.lastInsertRowid);
  });
}

export async function obterAnexo(id: number) {
  const anexo = await banco().get("SELECT * FROM anexos WHERE id = ?", [id]) as
    | (Anexo & { caminho: string; remoto_id: string; remoto_url: string })
    | undefined;
  if (!anexo) naoEncontrado("anexo");
  return anexo!;
}

export async function marcarLegibilidadeAnexo(id: number, legivel: boolean, motivo: string, usuario: Usuario) {
  if (!pode(usuario.papel, PERMISSOES.anexosGerir)) forbidden(`${usuario.papel} não avalia legibilidade`);
  const anexo = await obterAnexo(id);
  if (motivo.trim().length < 5) invalido("a legibilidade exige motivo com ao menos 5 caracteres");
  await banco().transaction(async () => {
    await banco().run("UPDATE anexos SET legivel = ? WHERE id = ?", [legivel ? 1 : 0, id]);
    await registrarTrilha({
      usuario,
      entidade: "anexo",
      entidadeId: id,
      acao: legivel ? "legivel" : "ilegivel",
      antes: { legivel: anexo.legivel },
      depois: { legivel: legivel ? 1 : 0 },
      motivo,
    });
  });
}

export async function removerAnexo(id: number, motivo: string, usuario: Usuario) {
  if (!pode(usuario.papel, PERMISSOES.anexosGerir)) forbidden(`${usuario.papel} não remove anexos`);
  const anexo = await obterAnexo(id);
  if (motivo.trim().length < 5) invalido("a remoção do comprovante exige motivo");
  // Apaga do CDN sem travar a remoção se a API falhar; o resultado vai na trilha.
  let remoto = "nao-aplica";
  if (anexo.remoto_id) {
    try {
      await excluirArquivoFiveManage(anexo.remoto_id);
      remoto = "ok";
    } catch {
      remoto = "falha";
    }
  }
  await banco().transaction(async () => {
    await banco().run("DELETE FROM anexos WHERE id = ?", [id]);
    if (!anexo.remoto_id) fs.rmSync(path.join(UPLOADS_DIR, anexo.caminho), { force: true });
    await registrarTrilha({
      usuario,
      entidade: "anexo",
      entidadeId: id,
      acao: "excluir",
      antes: { compra_id: anexo.compra_id, nome: anexo.nome_arquivo },
      depois: { remoto },
      motivo,
    });
  });
}