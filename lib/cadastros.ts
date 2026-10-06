import { agora, banco } from "./db";
import { PERMISSOES, pode } from "./rbac";
import { registrarTrilha } from "./auditoria";
import { forbidden, invalido, naoEncontrado } from "./regras";
import type { Usuario } from "./auth";

export const ENTIDADES = ["categorias", "setores", "turmas", "centros-custo", "fornecedores", "projetos"] as const;
export type Entidade = (typeof ENTIDADES)[number];

type Config = { tabela: string; temCodigo: boolean; buscaUsos: string };

const CONFIG: Record<Entidade, Config> = {
  categorias: { tabela: "categorias", temCodigo: true, buscaUsos: "SELECT COUNT(*)::int AS n FROM alocacoes WHERE categoria_id = ?" },
  setores: { tabela: "setores", temCodigo: true, buscaUsos: "SELECT COUNT(*)::int AS n FROM alocacoes WHERE setor_id = ?" },
  turmas: { tabela: "turmas", temCodigo: true, buscaUsos: "SELECT COUNT(*)::int AS n FROM alocacoes WHERE turma_id = ?" },
  "centros-custo": {
    tabela: "centros_custo",
    temCodigo: true,
    buscaUsos: "SELECT COUNT(*)::int AS n FROM alocacoes WHERE centro_custo_id = ?",
  },
  fornecedores: {
    tabela: "fornecedores",
    temCodigo: false,
    buscaUsos: "SELECT COUNT(*)::int AS n FROM compras WHERE fornecedor = (SELECT nome FROM fornecedores WHERE id = ?)",
  },
  projetos: { tabela: "projetos", temCodigo: false, buscaUsos: "SELECT COUNT(*)::int AS n FROM alocacoes WHERE projeto_id = ?" },
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

export async function listarEntidade(entidade: Entidade) {
  const cfg = CONFIG[entidade];
  const ordem = cfg.temCodigo ? "codigo" : "nome";
  return banco().all(
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
  ) as Promise<Record<string, unknown>[]>;
}

async function garantirGestao(usuario: Usuario, acao: string) {
  if (!pode(usuario.papel, PERMISSOES.cadastrosGerir)) forbidden(`${usuario.papel} não pode ${acao} cadastros`);
}

export async function criarCadastro(
  entidade: Entidade,
  input: { codigo?: string; nome: string; coordenacao_id?: number | null; centro_custo_id?: number | null; tipo?: string },
  usuario: Usuario,
): Promise<number> {
  await garantirGestao(usuario, "criar");
  const cfg = CONFIG[entidade];
  const nome = input.nome.trim();
  if (nome.length < 2) invalido("o nome precisa de ao menos 2 caracteres");
  const codigo = (input.codigo ?? "").trim().toUpperCase();
  if (cfg.temCodigo && codigo.length < 2) invalido("informe um código com ao menos 2 caracteres");

  return banco().transaction(async () => {
    let id: number;
    if (entidade === "turmas") {
      if (!input.coordenacao_id) invalido("a turma precisa de uma coordenação (F1 ou F2)");
      id = (await banco().run("INSERT INTO turmas(codigo, nome, coordenacao_id) VALUES (?, ?, ?) RETURNING id", [codigo, nome, input.coordenacao_id])).lastInsertRowid;
    } else if (entidade === "setores") {
      id = (await banco().run("INSERT INTO setores(codigo, nome, centro_custo_id) VALUES (?, ?, ?) RETURNING id", [codigo, nome, input.centro_custo_id ?? null])).lastInsertRowid;
    } else if (entidade === "centros-custo") {
      id = (await banco().run("INSERT INTO centros_custo(codigo, nome, tipo) VALUES (?, ?, ?) RETURNING id", [codigo, nome, input.tipo ?? "setor"])).lastInsertRowid;
    } else if (cfg.temCodigo) {
      id = (await banco().run(`INSERT INTO ${cfg.tabela}(codigo, nome) VALUES (?, ?) RETURNING id`, [codigo, nome])).lastInsertRowid;
    } else {
      id = (await banco().run(`INSERT INTO ${cfg.tabela}(nome) VALUES (?) RETURNING id`, [nome])).lastInsertRowid;
    }
    await registrarTrilha({
      usuario,
      entidade: `cadastro:${entidade}`,
      entidadeId: id,
      acao: "criar",
      depois: { codigo, nome },
    });
    return id;
  });
}

export async function editarCadastro(
  entidade: Entidade,
  id: number,
  input: { nome?: string; centro_custo_id?: number | null; coordenacao_id?: number | null },
  usuario: Usuario,
) {
  await garantirGestao(usuario, "editar");
  const cfg = CONFIG[entidade];
  const atual = await banco().get(`SELECT * FROM ${cfg.tabela} WHERE id = ?`, [id]) as Record<string, unknown> | undefined;
  if (!atual) naoEncontrado(nomeEntidade(entidade));
  const nome = (input.nome ?? String(atual!.nome ?? "")).trim();
  if (nome.length < 2) invalido("o nome precisa de ao menos 2 caracteres");
  await banco().transaction(async () => {
    if (entidade === "turmas") {
      await banco().run("UPDATE turmas SET nome = ?, coordenacao_id = COALESCE(?, coordenacao_id) WHERE id = ?", [nome, input.coordenacao_id ?? null, id]);
    } else if (entidade === "setores") {
      await banco().run("UPDATE setores SET nome = ?, centro_custo_id = ? WHERE id = ?", [nome, input.centro_custo_id ?? null, id]);
    } else {
      await banco().run(`UPDATE ${cfg.tabela} SET nome = ? WHERE id = ?`, [nome, id]);
    }
    await registrarTrilha({
      usuario,
      entidade: `cadastro:${entidade}`,
      entidadeId: id,
      acao: "editar",
      antes: { nome: atual!.nome },
      depois: { nome },
    });
  });
}

export async function desativarCadastro(entidade: Entidade, id: number, motivo: string, usuario: Usuario) {
  await garantirGestao(usuario, "desativar");
  const cfg = CONFIG[entidade];
  if (motivo.trim().length < 5) invalido("a desativação exige motivo com ao menos 5 caracteres");
  const uso = await banco().get(cfg.buscaUsos, [id]) as { n: number } | undefined;
  const usos = Number(uso?.n ?? 0);
  if (usos > 0) {
    invalido(
      `este cadastro é usado em ${usos} lançamento(s); cadastros em uso não são apagados — descreva no motivo ou reative em vez de desativar`,
    );
  }
  const atual = await banco().get(`SELECT * FROM ${cfg.tabela} WHERE id = ?`, [id]) as Record<string, unknown> | undefined;
  if (!atual) naoEncontrado(nomeEntidade(entidade));
  await banco().transaction(async () => {
    await banco().run(`UPDATE ${cfg.tabela} SET ativo = CASE WHEN ativo = 1 THEN 0 ELSE 1 END WHERE id = ?`, [id]);
    await registrarTrilha({
      usuario,
      entidade: `cadastro:${entidade}`,
      entidadeId: id,
      acao: "alternar-ativo",
      antes: { ativo: atual!.ativo },
      motivo,
    });
  });
}

export async function opcoesCatalogos() {
  return {
    categorias: await banco().all("SELECT id, codigo, nome FROM categorias WHERE ativo = 1 ORDER BY nome"),
    setores: await banco().all("SELECT id, codigo, nome FROM setores WHERE ativo = 1 ORDER BY nome"),
    turmas: await banco().all(
      "SELECT t.id, t.codigo, t.nome, co.codigo AS coordenacao FROM turmas t JOIN coordenacoes co ON co.id = t.coordenacao_id WHERE t.ativo = 1 ORDER BY t.id",
    ),
    centrosCusto: await banco().all("SELECT id, codigo, nome, tipo FROM centros_custo WHERE ativo = 1 ORDER BY nome"),
    projetos: await banco().all("SELECT id, nome FROM projetos WHERE ativo = 1 ORDER BY nome"),
    coordenacoes: await banco().all("SELECT id, codigo, nome FROM coordenacoes ORDER BY id"),
    fornecedores: await banco().all("SELECT DISTINCT fornecedor AS nome FROM compras ORDER BY fornecedor"),
  };
}

export async function criarFornecedorSeNovo(nome: string) {
  const limpo = nome.trim();
  if (!limpo) return;
  await banco().run("INSERT INTO fornecedores(nome) VALUES (?) ON CONFLICT(nome) DO NOTHING", [limpo]);
}

export async function historicoFornecedores() {
  return banco().all("SELECT id, nome, ativo FROM fornecedores ORDER BY nome") as Promise<{ id: number; nome: string; ativo: number }[]>;
}

export function novoRegistroTimestamp() {
  return agora();
}