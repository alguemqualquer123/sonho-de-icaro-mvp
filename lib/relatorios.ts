import { banco } from "./db";
import { coordenacaoDoPapel, PERMISSOES, pode } from "./rbac";
import { invalido } from "./regras";
import { formatarCentavos } from "./numerario";
import type { Usuario } from "./auth";

// REGRA ANTI-DUPLA-CONTAGEM
//   total financeiro  = SUM(compras.valor_centavos)      -> cada despesa conta 1x
//   recorte analítico = SUM(alocacoes.valor_centavos)    -> a mesma despesa pode
//   aparecer em N recortes (setor, categoria, turma), sem inflar o total.
// Nenhum relatório soma itens para compor o total geral.

export type Linha = { chave: string; nome: string; valor_centavos: number; quantidade: number };

export type ResumoMensal = {
  competencia: string;
  total_centavos: number;
  quantidade_compras: number;
  rateado_centavos: number;
  nao_classificado_centavos: number;
  sem_comprovante: number;
  sem_classificar: number;
  estornos_centavos: number;
  canceladas: number;
  por_setor: Linha[];
  por_categoria: Linha[];
  por_coordenacao: Linha[];
  por_turma: Linha[];
  top_fornecedores: Linha[];
  por_responsavel: Linha[];
  fechado: boolean;
};

function filtroEscopo(usuario: Usuario): { sql: string; params: (string | number)[] } {
  if (pode(usuario.papel, PERMISSOES.comprasVerTodas)) return { sql: "", params: [] };
  return { sql: " AND c.responsavel_id = ? ", params: [usuario.id] };
}

function filtroCoordenacao(usuario: Usuario): { sql: string; params: (string | number)[] } {
  const coord = coordenacaoDoPapel(usuario.papel);
  if (!coord) return { sql: "", params: [] };
  return { sql: " AND co.codigo = ? ", params: [coord] };
}

export function resumoMensal(usuario: Usuario, competencia: string): ResumoMensal {
  if (!/^\d{4}-\d{2}$/.test(competencia)) invalido("competência deve estar no formato AAAA-MM");
  const escopo = filtroEscopo(usuario);
  const paramsBase = [competencia, ...escopo.params];

  const totais = banco()
    .prepare(
      `SELECT COALESCE(SUM(CASE WHEN c.status <> 'cancelada' THEN c.valor_centavos ELSE 0 END), 0) AS total,
              COALESCE(SUM(CASE WHEN c.status = 'cancelada' THEN 1 ELSE 0 END), 0) AS canceladas,
              COUNT(*) AS quantidade
         FROM compras c WHERE c.competencia = ? ${escopo.sql}`,
    )
    .get(...paramsBase) as { total: number; canceladas: number; quantidade: number };

  const rateio = banco()
    .prepare(
      `SELECT COALESCE(SUM(a.valor_centavos), 0) AS rateado
         FROM alocacoes a JOIN compras c ON c.id = a.compra_id
        WHERE c.competencia = ? AND c.status <> 'cancelada' ${escopo.sql}`,
    )
    .get(...paramsBase) as { rateado: number };

  const pendencias = banco()
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN r.total_anexos = 0 AND c.status <> 'cancelada' THEN 1 ELSE 0 END), 0) AS sem_comprovante,
         COALESCE(SUM(CASE WHEN r.saldo_centavos > 0 AND c.status <> 'cancelada' THEN 1 ELSE 0 END), 0) AS sem_classificar,
         COALESCE(SUM(CASE WHEN c.status <> 'cancelada' THEN r.saldo_centavos ELSE 0 END), 0) AS nao_classificado
       FROM compras c JOIN vw_resumo_compra r ON r.id = c.id
       WHERE c.competencia = ? ${escopo.sql}`,
    )
    .get(...paramsBase) as { sem_comprovante: number; sem_classificar: number; nao_classificado: number };

  const estornos = banco()
    .prepare(
      `SELECT COALESCE(SUM(e.valor_centavos), 0) AS v FROM eventos_financeiros e
        JOIN compras c ON c.id = e.compra_id
       WHERE c.competencia = ? AND e.tipo IN ('estorno','reembolso') ${escopo.sql}`,
    )
    .get(...paramsBase) as { v: number };

  const agrupar = (select: string, join: string, where = "", ordens = 30): Linha[] =>
    banco()
      .prepare(
        `SELECT ${select}, SUM(a.valor_centavos) AS valor_centavos, COUNT(DISTINCT a.compra_id) AS quantidade
           FROM alocacoes a JOIN compras c ON c.id = a.compra_id ${join}
          WHERE c.competencia = ? AND c.status <> 'cancelada' ${escopo.sql} ${where}
          GROUP BY 1 ORDER BY valor_centavos DESC LIMIT ?`,
      )
      .all(competencia, ...escopo.params, ordens) as Linha[];

  return {
    competencia,
    total_centavos: totais.total,
    quantidade_compras: totais.quantidade,
    rateado_centavos: rateio.rateado,
    nao_classificado_centavos: pendencias.nao_classificado,
    sem_comprovante: pendencias.sem_comprovante,
    sem_classificar: pendencias.sem_classificar,
    estornos_centavos: estornos.v,
    canceladas: totais.canceladas,
    por_setor: agrupar("s.codigo AS chave, s.nome AS nome", "JOIN setores s ON s.id = a.setor_id"),
    por_categoria: agrupar("cat.codigo AS chave, cat.nome AS nome", "JOIN categorias cat ON cat.id = a.categoria_id"),
    por_coordenacao: agrupar(
      "COALESCE(co.codigo, 'SEM COORDENACAO') AS chave, COALESCE(co.nome, 'Sem coordenação') AS nome",
      "LEFT JOIN turmas t ON t.id = a.turma_id LEFT JOIN coordenacoes co ON co.id = t.coordenacao_id",
    ),
    por_turma: agrupar(
      "COALESCE(t.codigo, 'SEM TURMA') AS chave, COALESCE(t.nome, 'Sem turma') AS nome",
      "LEFT JOIN turmas t ON t.id = a.turma_id",
    ),
    top_fornecedores: banco()
      .prepare(
        `SELECT c.fornecedor AS chave, c.fornecedor AS nome, SUM(c.valor_centavos) AS valor_centavos, COUNT(*) AS quantidade
           FROM compras c WHERE c.competencia = ? AND c.status <> 'cancelada' ${escopo.sql}
          GROUP BY c.fornecedor ORDER BY valor_centavos DESC LIMIT 10`,
      )
      .all(...paramsBase) as Linha[],
    por_responsavel: banco()
      .prepare(
        `SELECT CAST(u.id AS TEXT) AS chave, u.nome AS nome, SUM(c.valor_centavos) AS valor_centavos, COUNT(*) AS quantidade
           FROM compras c JOIN usuarios u ON u.id = c.responsavel_id
          WHERE c.competencia = ? AND c.status <> 'cancelada' ${escopo.sql}
          GROUP BY u.id ORDER BY valor_centavos DESC LIMIT 10`,
      )
      .all(...paramsBase) as Linha[],
    fechado: (() => {
      const f = banco().prepare("SELECT reaberto_em FROM fechamentos WHERE competencia = ?").get(competencia) as
        | { reaberto_em: string | null }
        | undefined;
      return Boolean(f && !f.reaberto_em);
    })(),
  };
}

export const TIPOS_RELATORIO = [
  { tipo: "por-setor", nome: "Gastos por setor" },
  { tipo: "por-categoria", nome: "Gastos por categoria" },
  { tipo: "por-turma", nome: "Gastos por turma" },
  { tipo: "por-coordenacao", nome: "Gastos por coordenação" },
  { tipo: "por-fornecedor", nome: "Gastos por fornecedor" },
  { tipo: "por-responsavel", nome: "Compras por responsável" },
  { tipo: "mensal", nome: "Evolução mensal" },
  { tipo: "pendencias", nome: "Pendências (comprovante e classificação)" },
  { tipo: "conciliacao", nome: "Divergências da fatura" },
] as const;

export type TipoRelatorio = (typeof TIPOS_RELATORIO)[number]["tipo"];

export type Tabela = { colunas: string[]; linhas: (string | number)[][]; total_centavos: number };

export function gerarRelatorio(
  tipo: TipoRelatorio,
  usuario: Usuario,
  competencia = "",
): Tabela {
  if (!TIPOS_RELATORIO.some((t) => t.tipo === tipo)) invalido(`relatório desconhecido: ${tipo}`);
  const escopo = filtroEscopo(usuario);
  const whereComp = competencia ? " AND c.competencia = ?" : "";
  const params = competencia ? [competencia, ...escopo.params] : [...escopo.params];

  const porAlocacao = (select: string, join: string): Tabela => {
    const linhas = banco()
      .prepare(
        `SELECT ${select}, SUM(a.valor_centavos) AS v, COUNT(DISTINCT a.compra_id) AS q
           FROM alocacoes a JOIN compras c ON c.id = a.compra_id ${join}
          WHERE 1=1 ${whereComp} AND c.status <> 'cancelada' ${escopo.sql}
          GROUP BY 1 ORDER BY v DESC`,
      )
      .all(...params) as { chave: string; nome: string; v: number; q: number }[];
    return {
      colunas: ["Código", "Nome", "Valor", "Compras"],
      linhas: linhas.map((l) => [l.chave, l.nome, formatarCentavos(l.v), l.q]),
      total_centavos: linhas.reduce((acc, l) => acc + l.v, 0),
    };
  };

  switch (tipo) {
    case "por-setor":
      return porAlocacao("s.codigo AS chave, s.nome AS nome", "JOIN setores s ON s.id = a.setor_id");
    case "por-categoria":
      return porAlocacao("cat.codigo AS chave, cat.nome AS nome", "JOIN categorias cat ON cat.id = a.categoria_id");
    case "por-turma":
      return porAlocacao(
        "COALESCE(t.codigo,'-') AS chave, COALESCE(t.nome,'Sem turma') AS nome",
        "LEFT JOIN turmas t ON t.id = a.turma_id",
      );
    case "por-coordenacao": {
      const coord = filtroCoordenacao(usuario);
      const linhas = banco()
        .prepare(
          `SELECT COALESCE(co.codigo,'-') AS chave, COALESCE(co.nome,'Sem coordenação') AS nome,
                  SUM(a.valor_centavos) AS v, COUNT(DISTINCT a.compra_id) AS q
             FROM alocacoes a JOIN compras c ON c.id = a.compra_id
             LEFT JOIN turmas t ON t.id = a.turma_id LEFT JOIN coordenacoes co ON co.id = t.coordenacao_id
            WHERE 1=1 ${whereComp} AND c.status <> 'cancelada' ${escopo.sql} ${coord.sql}
            GROUP BY 1 ORDER BY v DESC`,
        )
        .all(...params, ...coord.params) as { chave: string; nome: string; v: number; q: number }[];
      return {
        colunas: ["Coordenação", "Nome", "Valor", "Compras"],
        linhas: linhas.map((l) => [l.chave, l.nome, formatarCentavos(l.v), l.q]),
        total_centavos: linhas.reduce((acc, l) => acc + l.v, 0),
      };
    }
    case "por-fornecedor": {
      const linhas = banco()
        .prepare(
          `SELECT c.fornecedor AS nome, SUM(c.valor_centavos) AS v, COUNT(*) AS q
             FROM compras c WHERE 1=1 ${whereComp} AND c.status <> 'cancelada' ${escopo.sql}
            GROUP BY c.fornecedor ORDER BY v DESC`,
        )
        .all(...params) as { nome: string; v: number; q: number }[];
      return {
        colunas: ["Fornecedor", "Valor", "Compras"],
        linhas: linhas.map((l) => [l.nome, formatarCentavos(l.v), l.q]),
        total_centavos: linhas.reduce((acc, l) => acc + l.v, 0),
      };
    }
    case "por-responsavel": {
      const linhas = banco()
        .prepare(
          `SELECT u.nome AS nome, SUM(c.valor_centavos) AS v, COUNT(*) AS q
             FROM compras c JOIN usuarios u ON u.id = c.responsavel_id
            WHERE 1=1 ${whereComp} AND c.status <> 'cancelada' ${escopo.sql}
            GROUP BY u.nome ORDER BY v DESC`,
        )
        .all(...params) as { nome: string; v: number; q: number }[];
      return {
        colunas: ["Responsável", "Valor", "Compras"],
        linhas: linhas.map((l) => [l.nome, formatarCentavos(l.v), l.q]),
        total_centavos: linhas.reduce((acc, l) => acc + l.v, 0),
      };
    }
    case "mensal": {
      const linhas = banco()
        .prepare(
          `SELECT c.competencia AS comp,
                  SUM(CASE WHEN c.status <> 'cancelada' THEN c.valor_centavos ELSE 0 END) AS total,
                  COUNT(*) AS q
             FROM compras c WHERE 1=1 ${escopo.sql} GROUP BY c.competencia ORDER BY c.competencia`,
        )
        .all(...escopo.params) as { comp: string; total: number; q: number }[];
      return {
        colunas: ["Competência", "Total (compras)", "Compras"],
        linhas: linhas.map((l) => [l.comp, formatarCentavos(l.total), l.q]),
        total_centavos: linhas.reduce((acc, l) => acc + l.total, 0),
      };
    }
    case "pendencias": {
      const linhas = banco()
        .prepare(
          `SELECT c.numero, c.data, c.fornecedor, c.valor_centavos, r.saldo_centavos, r.total_anexos, u.nome
             FROM compras c JOIN vw_resumo_compra r ON r.id = c.id JOIN usuarios u ON u.id = c.responsavel_id
            WHERE (r.saldo_centavos > 0 OR r.total_anexos = 0) AND c.status <> 'cancelada'
              ${whereComp.replace("c.competencia", "c.competencia")} ${escopo.sql}
            ORDER BY c.data DESC LIMIT 500`,
        )
        .all(...params) as {
        numero: string;
        data: string;
        fornecedor: string;
        valor_centavos: number;
        saldo_centavos: number;
        total_anexos: number;
        nome: string;
      }[];
      return {
        colunas: ["Número", "Data", "Fornecedor", "Total", "Não classificado", "Comprovantes", "Responsável"],
        linhas: linhas.map((l) => [
          l.numero,
          l.data,
          l.fornecedor,
          formatarCentavos(l.valor_centavos),
          formatarCentavos(l.saldo_centavos),
          l.total_anexos,
          l.nome,
        ]),
        total_centavos: linhas.reduce((acc, l) => acc + l.saldo_centavos, 0),
      };
    }
    case "conciliacao": {
      const whereCompF = competencia ? " AND f.competencia = ?" : "";
      const linhas = banco()
        .prepare(
          `SELECT i.data, i.fornecedor, i.descricao, i.valor_centavos, i.pareamento, c.numero
             FROM itens_fatura i JOIN faturas f ON f.id = i.fatura_id
             LEFT JOIN compras c ON c.id = i.compra_id
            WHERE (i.compra_id IS NULL OR i.pareamento = 'manual') ${whereCompF}
            ORDER BY i.data DESC LIMIT 500`,
        )
        .all(competencia ? [competencia] : []) as {
        data: string;
        fornecedor: string;
        descricao: string;
        valor_centavos: number;
        pareamento: string;
        numero: string | null;
      }[];
      return {
        colunas: ["Data", "Fornecedor", "Descrição", "Valor", "Situação", "Compra"],
        linhas: linhas.map((l) => [
          l.data,
          l.fornecedor,
          l.descricao,
          formatarCentavos(l.valor_centavos),
          l.pareamento === "manual" ? "par manual" : "ausente no sistema",
          l.numero ?? "-",
        ]),
        total_centavos: linhas.reduce((acc, l) => acc + l.valor_centavos, 0),
      };
    }
  }
  invalido(`relatório não implementado: ${tipo}`);
}

export function paraCsv(tabela: Tabela): string {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const cabecalho = tabela.colunas.map(esc).join(";");
  const corpo = tabela.linhas.map((l) => l.map(esc).join(";"));
  return [`\uFEFF${cabecalho}`, ...corpo].join("\r\n");
}
