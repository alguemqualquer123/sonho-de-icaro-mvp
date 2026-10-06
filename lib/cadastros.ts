import { agora, banco } from "./db";
import { PERMISSOES, pode } from "./rbac";
import { registrarTrilha } from "./auditoria";
import { forbidden, invalido, naoEncontrado } from "./regras";
import type { Usuario } from "./auth";

export const ENTIDADES = ["categorias", "setores", "turmas", "centros-custo", "fornecedores", "projetos"] as const;
export type Entidade = (typeof ENTIDADES)[number];

type Config = { tabela: string; temCodigo: boolean; buscaUsos: string };

const CONFIG: Record<Entidade, Config> = {
  categorias: { tabela: "categorias", temCodigo: true, buscaUsos: "SELECT COUNT(*) AS n FROM alocacoes WHERE categoria_id = ?" },
  setores: { tabela: "setores", temCodigo: true, buscaUsos: "SELECT COUNT(*) AS n FROM alocacoes WHERE setor_id = ?" },
  turmas: { tabela: "turmas", temCodigo: true, buscaUsos: "SELECT COUNT(*) AS n FROM alocacoes WHERE turma_id = ?" },
  "centros-custo": {
    tabela: "centros_custo",
    temCodigo: true,
    buscaUsos: "SELECT COUNT(*) AS n FROM alocacoes WHERE centro_custo_id = ?",
  },
  fornecedores: {
    tabela: "fornecedores",
    temCodigo: false,
    buscaUsos: "SELECT COUNT(*) AS n FROM compras WHERE fornecedor = (SELECT nome FROM fornecedores WHERE id = ?)",
  },
  projetos: { tabela: "projetos", temCodigo: false, buscaUsos: "SELECT COUNT(*) AS n FROM alocacoes WHERE projeto_id = ?" },
};

export function nomeEntidade(e: string): string {
  const mapa: Record<string, string> = {
    categorias: "categoria",
    setores: "setor",
    turmas: "turma",
    "centros-custo": "centro de custo",
    fornecedores: "fornecedor",
    projetos: "projeto",
  };
  return mapa[e] ?? e;
}

export function listarEntidade(entidade: Entidade) {
  const cfg = CONFIG[entidade];
  const ordem = cfg.temCodigo ? "codigo" : "nome";
  return banco()
    .prepare(
      `SELECT *, (SELECT COUNT(*) FROM alocacoes a WHERE ${
        entidade === "categorias"
          ? "a.categoria_id = " + cfg.tabela + ".id"
          : entidade === "setores"
            ? "a.setor_id = " + cfg.tabela + ".id"
            : entidade === "turmas"
              ? "a.turma_id = " + cfg.tabela + ".id"
              : entidade === "centros-custo"
                ? "a.centro_custo_id = " + cfg.tabela + ".id"
                : entidade === "projetos"
                  ? "a.projeto_id = " + cfg.tabela + ".id"
                  : "1 = 0"
      }) AS usos
        FROM ${cfg.tabela} ORDER BY ativo DESC, ${ordem}`,
    )
    .all() as Record<string, unknown>[];
}

function garantirGestao(usuario: Usuario, acao: string) {
  if (!pode(usuario.papel, PERMISSOES.cadastrosGerir)) forbidden(`${usuario.papel} não pode ${acao} cadastros`);
}

export function criarCadastro(
  entidade: Entidade,
  input: { codigo?: string; nome: string; coordenacao_id?: number | null; centro_custo_id?: number | null; tipo?: string },
  usuario: Usuario,
): number {
  garantirGestao(usuario, "criar");
  const cfg = CONFIG[entidade];
  const nome = input.nome.trim();
  if (nome.length < 2) invalido("o nome precisa de ao menos 2 caracteres");
  const codigo = (input.codigo ?? "").trim().toUpperCase();
  if (cfg.temCodigo && codigo.length < 2) invalido("informe um código com ao menos 2 caracteres");

  return banco()
    .transaction(() => {
      let r: { lastInsertRowid: number | bigint };
      if (entidade === "turmas") {
        if (!input.coordenacao_id) invalido("a turma precisa de uma coordenação (F1 ou F2)");
        r = banco()
          .prepare("INSERT INTO turmas(codigo, nome, coordenacao_id) VALUES (?, ?, ?)")
          .run(codigo, nome, input.coordenacao_id) as unknown as { lastInsertRowid: number };
      } else if (entidade === "setores") {
        r = banco()
          .prepare("INSERT INTO setores(codigo, nome, centro_custo_id) VALUES (?, ?, ?)")
          .run(codigo, nome, input.centro_custo_id ?? null) as unknown as { lastInsertRowid: number };
      } else if (entidade === "centros-custo") {
        r = banco()
          .prepare("INSERT INTO centros_custo(codigo, nome, tipo) VALUES (?, ?, ?)")
          .run(codigo, nome, input.tipo ?? "setor") as unknown as { lastInsertRowid: number };
      } else if (cfg.temCodigo) {
        r = banco()
          .prepare(`INSERT INTO ${cfg.tabela}(codigo, nome) VALUES (?, ?)`)
          .run(codigo, nome) as unknown as { lastInsertRowid: number };
      } else {
        r = banco()
          .prepare(`INSERT INTO ${cfg.tabela}(nome) VALUES (?)`)
          .run(nome) as unknown as { lastInsertRowid: number };
      }
      registrarTrilha({
        usuario,
        entidade: `cadastro:${entidade}`,
        entidadeId: r.lastInsertRowid,
        acao: "criar",
        depois: { codigo, nome },
      });
      return Number(r.lastInsertRowid);
    })();
}

export function editarCadastro(
  entidade: Entidade,
  id: number,
  input: { nome?: string; centro_custo_id?: number | null; coordenacao_id?: number | null },
  usuario: Usuario,
) {
  garantirGestao(usuario, "editar");
  const cfg = CONFIG[entidade];
  const atual = banco().prepare(`SELECT * FROM ${cfg.tabela} WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!atual) naoEncontrado(nomeEntidade(entidade));
  const nome = (input.nome ?? String(atual!.nome ?? "")).trim();
  if (nome.length < 2) invalido("o nome precisa de ao menos 2 caracteres");
  banco()
    .transaction(() => {
      if (entidade === "turmas") {
        banco()
          .prepare("UPDATE turmas SET nome = ?, coordenacao_id = COALESCE(?, coordenacao_id) WHERE id = ?")
          .run(nome, input.coordenacao_id ?? null, id);
      } else if (entidade === "setores") {
        banco()
          .prepare("UPDATE setores SET nome = ?, centro_custo_id = ? WHERE id = ?")
          .run(nome, input.centro_custo_id ?? null, id);
      } else {
        banco().prepare(`UPDATE ${cfg.tabela} SET nome = ? WHERE id = ?`).run(nome, id);
      }
      registrarTrilha({
        usuario,
        entidade: `cadastro:${entidade}`,
        entidadeId: id,
        acao: "editar",
        antes: { nome: atual!.nome },
        depois: { nome },
      });
    })();
}

export function desativarCadastro(entidade: Entidade, id: number, motivo: string, usuario: Usuario) {
  garantirGestao(usuario, "desativar");
  const cfg = CONFIG[entidade];
  if (motivo.trim().length < 5) invalido("a desativação exige motivo com ao menos 5 caracteres");
  const usos = (banco().prepare(cfg.buscaUsos).get(id) as { n: number }).n;
  if (usos > 0) {
    invalido(
      `este cadastro é usado em ${usos} lançamento(s); cadastros em uso não são apagados — descreva no motivo ou reative em vez de desativar`,
    );
  }
  const atual = banco().prepare(`SELECT * FROM ${cfg.tabela} WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!atual) naoEncontrado(nomeEntidade(entidade));
  banco()
    .transaction(() => {
      banco().prepare(`UPDATE ${cfg.tabela} SET ativo = CASE WHEN ativo = 1 THEN 0 ELSE 1 END WHERE id = ?`).run(id);
      registrarTrilha({
        usuario,
        entidade: `cadastro:${entidade}`,
        entidadeId: id,
        acao: "alternar-ativo",
        antes: { ativo: atual!.ativo },
        motivo,
      });
    })();
}

export function opcoesCatalogos() {
  const db = banco();
  return {
    categorias: db.prepare("SELECT id, codigo, nome FROM categorias WHERE ativo = 1 ORDER BY nome").all() as { id: number; codigo: string; nome: string }[],
    setores: db.prepare("SELECT id, codigo, nome FROM setores WHERE ativo = 1 ORDER BY nome").all() as { id: number; codigo: string; nome: string }[],
    turmas: db
      .prepare("SELECT t.id, t.codigo, t.nome, co.codigo AS coordenacao FROM turmas t JOIN coordenacoes co ON co.id = t.coordenacao_id WHERE t.ativo = 1 ORDER BY t.id")
      .all() as { id: number; codigo: string; nome: string; coordenacao: string }[],
    centrosCusto: db.prepare("SELECT id, codigo, nome, tipo FROM centros_custo WHERE ativo = 1 ORDER BY nome").all() as { id: number; codigo: string; nome: string; tipo: string }[],
    projetos: db.prepare("SELECT id, nome FROM projetos WHERE ativo = 1 ORDER BY nome").all() as { id: number; nome: string }[],
    coordenacoes: db.prepare("SELECT id, codigo, nome FROM coordenacoes ORDER BY id").all() as { id: number; codigo: string; nome: string }[],
    fornecedores: db.prepare("SELECT DISTINCT fornecedor AS nome FROM compras ORDER BY fornecedor").all() as { nome: string }[],
  };
}

export function criarFornecedorSeNovo(nome: string) {
  const limpo = nome.trim();
  if (!limpo) return;
  banco().prepare("INSERT INTO fornecedores(nome) VALUES (?) ON CONFLICT(nome) DO NOTHING").run(limpo);
}

export function historicoFornecedores() {
  return banco().prepare("SELECT id, nome, ativo FROM fornecedores ORDER BY nome").all() as { id: number; nome: string; ativo: number }[];
}

export function novoRegistroTimestamp() {
  return agora();
}
