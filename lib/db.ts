import { AsyncLocalStorage } from "node:async_hooks";
import fs from "node:fs";
import path from "node:path";
import { Pool, type QueryResultRow } from "pg";

// Acesso a dados em Postgres (Supabase). A API esconde o driver: get/all/run
// são síncronos de assinatura, mas retornam Promise; transações usam
// AsyncLocalStorage para que toda consulta dentro do callback enxergue o mesmo
// cliente, mesmo com requisições interleaving em serverless.
//
// A modelagem financeira continua em centavos inteiros (INTEGER). Nenhum
// cálculo em ponto flutuante entra aqui.

const contexto = new AsyncLocalStorage<import("pg").PoolClient>();

export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : process.env.VERCEL
    ? path.join("/tmp", "sonho-data")
    : path.join(process.cwd(), "data");
// Comprovantes: imagens e PDFs vão para o CDN do FiveManage
// (ver lib/fivemanage.ts); nada é salvo em disco local. UPLOADS_DIR segue
// existindo só para leitura legada e para o fallback em /tmp na Vercel.
// Na Vercel o disco é efêmero: o recomendado é manter
// FIVEMANAGE_API_KEY configurado.
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

export type ResultadoRun = { changes: number; lastInsertRowid: number };

export type Banco = {
  get<T extends QueryResultRow = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T | undefined>;
  all<T extends QueryResultRow = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<ResultadoRun>;
  transaction<U>(funcao: () => Promise<U> | U): Promise<U>;
};

function limparValor(valor: string | undefined): string {
  if (!valor) return "";
  // .env.example traz valores entre aspas; remove aspas e espaços.
  return valor.trim().replace(/^["']+|["']+$/g, "").trim();
}

const URL_BD =
  limparValor(process.env.DATABASE_URL) ||
  limparValor(process.env.SUPABASE_DB_URL) ||
  limparValor(process.env.POSTGRES_URL_NON_POOLING) ||
  limparValor(process.env.POSTGRES_URL) ||
  limparValor(process.env.POSTGRES_PRISMA_URL) ||
  "";
// NOTA: SUPABASE_URL (https://...) de propósito NÃO entra aqui — não é
// connection string Postgres e quebrava o pg quando .env.local era copiado
// do .env.example.

let pool: Pool | undefined;

// O driver pg (pg-connection-string) trata `?sslmode=require` como
// verify-full e SOBRESCREVE `ssl: { rejectUnauthorized: false }` — atrás de
// proxy corporativo / cadeia self-signed isso dá
// "SELF_SIGNED_CERT_IN_CHAIN" mesmo com rejectUnauthorized:false.
// Por isso removemos `sslmode` da URL e forçamos o objeto ssl explícito.
function normalizarConexao(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("sslmode");
    // hints do Supabase/Prisma que o pg não entende; inofensivos mas poluentes
    u.searchParams.delete("supa");
    u.searchParams.delete("pgbouncer");
    return u.toString();
  } catch {
    return url.split("?")[0];
  }
}

function obterPool(): Pool {
  if (!pool) {
    if (!URL_BD) {
      throw new Error(
        "não há conexão com o banco: defina DATABASE_URL nas Environment Variables da Vercel (ou POSTGRES_URL_NON_POOLING / POSTGRES_URL / SUPABASE_DB_URL); em local, copie .env.example para .env.local e reinicie o `next dev`",
      );
    }
    const precisaSSL =
      URL_BD.includes("sslmode=require") || URL_BD.includes("supabase");
    pool = new Pool({
      connectionString: normalizarConexao(URL_BD),
      max: Number(process.env.PG_MAX_CONNECTIONS ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ...(precisaSSL ? { ssl: { rejectUnauthorized: false } } : {}),
    });
  }
  return pool;
}

export function agora(): string {
  return new Date().toISOString();
}

export function competenciaDaData(data: string): string {
  return data.slice(0, 7);
}

const ESQUEMA = /* SQL */ `
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  papel TEXT NOT NULL CHECK (papel IN ('admin','gestor','comprador','lancador','coord_f1','coord_f2','auditor')),
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessoes (
  token_hash TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  ip TEXT NOT NULL DEFAULT '',
  criado_em TEXT NOT NULL,
  expira_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS coordenacoes (
  id SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS turmas (
  id SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  coordenacao_id INTEGER NOT NULL REFERENCES coordenacoes(id),
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS centros_custo (
  id SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'setor',
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS setores (
  id SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  centro_custo_id INTEGER REFERENCES centros_custo(id),
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS fornecedores (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS projetos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS compras (
  id SERIAL PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  data TEXT NOT NULL,
  competencia TEXT NOT NULL,
  fornecedor TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
  parcelas_total INTEGER NOT NULL DEFAULT 1 CHECK (parcelas_total BETWEEN 1 AND 99),
  status TEXT NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','enviada','aprovada','contestada','cancelada')),
  responsavel_id INTEGER NOT NULL REFERENCES usuarios(id),
  setor_id INTEGER REFERENCES setores(id),
  observacao TEXT NOT NULL DEFAULT '',
  motivo_cancelamento TEXT NOT NULL DEFAULT '',
  enviado_por INTEGER REFERENCES usuarios(id),
  enviado_em TEXT,
  aprovado_por INTEGER REFERENCES usuarios(id),
  aprovado_em TEXT,
  contestado_por INTEGER REFERENCES usuarios(id),
  contestado_em TEXT,
  motivo_contestacao TEXT NOT NULL DEFAULT '',
  cancelado_por INTEGER REFERENCES usuarios(id),
  cancelado_em TEXT,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_compras_competencia ON compras(competencia);
CREATE INDEX IF NOT EXISTS idx_compras_fornecedor ON compras(fornecedor);

CREATE TABLE IF NOT EXISTS alocacoes (
  id SERIAL PRIMARY KEY,
  compra_id INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  categoria_id INTEGER NOT NULL REFERENCES categorias(id),
  setor_id INTEGER NOT NULL REFERENCES setores(id),
  turma_id INTEGER REFERENCES turmas(id),
  centro_custo_id INTEGER REFERENCES centros_custo(id),
  projeto_id INTEGER REFERENCES projetos(id),
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
  observacao TEXT NOT NULL DEFAULT '',
  criado_em TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_alocacoes_compra ON alocacoes(compra_id);
CREATE INDEX IF NOT EXISTS idx_alocacoes_setor ON alocacoes(setor_id);
CREATE INDEX IF NOT EXISTS idx_alocacoes_categoria ON alocacoes(categoria_id);

CREATE TABLE IF NOT EXISTS anexos (
  id SERIAL PRIMARY KEY,
  compra_id INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  caminho TEXT NOT NULL,
  mime TEXT NOT NULL DEFAULT '',
  tamanho_bytes INTEGER NOT NULL,
  legivel INTEGER,
  remoto_id TEXT NOT NULL DEFAULT '',
  remoto_url TEXT NOT NULL DEFAULT '',
  criado_por INTEGER NOT NULL REFERENCES usuarios(id),
  criado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS eventos_financeiros (
  id SERIAL PRIMARY KEY,
  compra_id INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('estorno','reembolso','transferencia','correcao')),
  valor_centavos INTEGER NOT NULL,
  motivo TEXT NOT NULL DEFAULT '',
  criado_por INTEGER NOT NULL REFERENCES usuarios(id),
  criado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS faturas (
  id SERIAL PRIMARY KEY,
  competencia TEXT NOT NULL UNIQUE,
  total_centavos INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS itens_fatura (
  id SERIAL PRIMARY KEY,
  fatura_id INTEGER NOT NULL REFERENCES faturas(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  fornecedor TEXT NOT NULL DEFAULT '',
  valor_centavos INTEGER NOT NULL,
  compra_id INTEGER REFERENCES compras(id),
  pareamento TEXT NOT NULL DEFAULT 'nenhum' CHECK (pareamento IN ('nenhum','auto','manual')),
  criado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fechamentos (
  competencia TEXT PRIMARY KEY,
  fechado_em TEXT NOT NULL,
  fechado_por INTEGER NOT NULL REFERENCES usuarios(id),
  reaberto_em TEXT,
  motivo_reabertura TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS trilha_auditoria (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER,
  usuario_nome TEXT NOT NULL DEFAULT '',
  entidade TEXT NOT NULL,
  entidade_id TEXT NOT NULL DEFAULT '',
  acao TEXT NOT NULL,
  antes TEXT,
  depois TEXT,
  motivo TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT '',
  criado_em TEXT NOT NULL
);

CREATE OR REPLACE VIEW vw_resumo_compra AS
SELECT c.id,
       c.valor_centavos,
       COALESCE((SELECT SUM(a.valor_centavos) FROM alocacoes a WHERE a.compra_id = c.id), 0) AS rateado_centavos,
       c.valor_centavos - COALESCE((SELECT SUM(a.valor_centavos) FROM alocacoes a WHERE a.compra_id = c.id), 0) AS saldo_centavos,
       (SELECT COUNT(*) FROM anexos x WHERE x.compra_id = c.id) AS total_anexos
FROM compras c;
`;

type Catalogo = { codigo: string; nome: string };

const COORDENACOES: Catalogo[] = [
  { codigo: "F1", nome: "Coordenação F1" },
  { codigo: "F2", nome: "Coordenação F2" },
];

const TURMAS: (Catalogo & { coordenacao: string })[] = [
  { codigo: "BER", nome: "Berçário", coordenacao: "F1" },
  { codigo: "MATZ", nome: "Maternalzinho", coordenacao: "F1" },
  { codigo: "MAT", nome: "Maternal", coordenacao: "F1" },
  { codigo: "JAR", nome: "Jardim", coordenacao: "F1" },
  { codigo: "INF", nome: "Infantil", coordenacao: "F1" },
  { codigo: "1ANO", nome: "Primeiro ano", coordenacao: "F1" },
  { codigo: "2ANO", nome: "Segundo ano", coordenacao: "F1" },
  { codigo: "3ANO", nome: "Terceiro ano", coordenacao: "F1" },
  { codigo: "4ANO", nome: "Quarto ano", coordenacao: "F2" },
  { codigo: "5ANO", nome: "Quinto ano", coordenacao: "F2" },
  { codigo: "6ANO", nome: "Sexto ano", coordenacao: "F2" },
  { codigo: "7ANO", nome: "Sétimo ano", coordenacao: "F2" },
  { codigo: "8ANO", nome: "Oitavo ano", coordenacao: "F2" },
  { codigo: "9ANO", nome: "Nono ano", coordenacao: "F2" },
];

const CATEGORIAS: Catalogo[] = [
  { codigo: "CAT-ALIM", nome: "Alimentação" },
  { codigo: "CAT-LIMP", nome: "Limpeza e higiene" },
  { codigo: "CAT-PED", nome: "Material escolar e pedagógico" },
  { codigo: "CAT-FER", nome: "Ferramentas" },
  { codigo: "CAT-MAN", nome: "Manutenção" },
  { codigo: "CAT-OBRA", nome: "Obras e reformas" },
  { codigo: "CAT-ELET", nome: "Instalações/materiais elétricos" },
  { codigo: "CAT-HID", nome: "Materiais hidráulicos" },
  { codigo: "CAT-MOB", nome: "Mobiliário e estofados" },
  { codigo: "CAT-BRI", nome: "Brinquedos e recreação" },
  { codigo: "CAT-CANT", nome: "Cantina" },
  { codigo: "CAT-ADM", nome: "Materiais administrativos" },
  { codigo: "CAT-OUT", nome: "Outros" },
];

const CENTROS_CUSTO: (Catalogo & { tipo: string })[] = [
  { codigo: "CC-ADM", nome: "Administração", tipo: "setor" },
  { codigo: "CC-CANT", nome: "Cantina", tipo: "setor" },
  { codigo: "CC-LIMP", nome: "Limpeza", tipo: "setor" },
  { codigo: "CC-MAN", nome: "Manutenção", tipo: "setor" },
  { codigo: "CC-INT", nome: "Integral", tipo: "setor" },
  { codigo: "CC-F1", nome: "Coordenação F1", tipo: "coordenacao" },
  { codigo: "CC-F2", nome: "Coordenação F2", tipo: "coordenacao" },
  { codigo: "CC-REC", nome: "Recreação", tipo: "setor" },
];

const SETORES: (Catalogo & { cc?: string })[] = [
  { codigo: "SET-CANT", nome: "Cantina", cc: "CC-CANT" },
  { codigo: "SET-INT", nome: "Integral", cc: "CC-INT" },
  { codigo: "SET-LIMP", nome: "Limpeza", cc: "CC-LIMP" },
  { codigo: "SET-MAN", nome: "Manutenção", cc: "CC-MAN" },
  { codigo: "SET-OBRA", nome: "Obras/Reformas" },
  { codigo: "SET-CF1", nome: "Coordenação F1", cc: "CC-F1" },
  { codigo: "SET-CF2", nome: "Coordenação F2", cc: "CC-F2" },
  { codigo: "SET-ADM", nome: "Administração", cc: "CC-ADM" },
  { codigo: "SET-REC", nome: "Recreação/Brinquedos", cc: "CC-REC" },
  { codigo: "SET-OUT", nome: "Outros destinos aprovados" },
];

async function semear() {
  const cliente = await obterPool().connect();
  try {
    await cliente.query("BEGIN");
    const { rows } = await cliente.query("SELECT COUNT(*) AS n FROM usuarios");
    const temUsuarios = Number(rows[0]?.n ?? 0);
    if (temUsuarios === 0) {
      for (const c of COORDENACOES) {
        await cliente.query("INSERT INTO coordenacoes(codigo, nome) VALUES ($1, $2) ON CONFLICT (codigo) DO NOTHING", [c.codigo, c.nome]);
      }
      const idCoord = new Map<string, number>();
      for (const r of (await cliente.query("SELECT id, codigo FROM coordenacoes")).rows as { id: number; codigo: string }[]) {
        idCoord.set(r.codigo, r.id);
      }
      for (const t of TURMAS) {
        await cliente.query("INSERT INTO turmas(codigo, nome, coordenacao_id) VALUES ($1, $2, $3) ON CONFLICT (codigo) DO NOTHING", [
          t.codigo,
          t.nome,
          idCoord.get(t.coordenacao),
        ]);
      }
      for (const c of CATEGORIAS) {
        await cliente.query("INSERT INTO categorias(codigo, nome) VALUES ($1, $2) ON CONFLICT (codigo) DO NOTHING", [c.codigo, c.nome]);
      }
      for (const c of CENTROS_CUSTO) {
        await cliente.query("INSERT INTO centros_custo(codigo, nome, tipo) VALUES ($1, $2, $3) ON CONFLICT (codigo) DO NOTHING", [c.codigo, c.nome, c.tipo]);
      }
      const idCc = new Map<string, number>();
      for (const r of (await cliente.query("SELECT id, codigo FROM centros_custo")).rows as { id: number; codigo: string }[]) {
        idCc.set(r.codigo, r.id);
      }
      for (const s of SETORES) {
        await cliente.query("INSERT INTO setores(codigo, nome, centro_custo_id) VALUES ($1, $2, $3) ON CONFLICT (codigo) DO NOTHING", [
          s.codigo,
          s.nome,
          s.cc ? idCc.get(s.cc) ?? null : null,
        ]);
      }
    }
    await cliente.query("COMMIT");
  } catch (erro) {
    try {
      await cliente.query("ROLLBACK");
    } catch {
      // segue para o erro original
    }
    throw erro;
  } finally {
    cliente.release();
  }
}

let inicializacao: Promise<void> | undefined;

async function inicializar(): Promise<void> {
  // Na Vercel o disco é efêmero e só /tmp é gravável; em local sem permissão
  // o mkdir também pode falhar — nenhum dos dois pode derrubar o boot.
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch {
    // segue sem pasta local: fotos usam FiveManage e PDF falha com msg amigável
  }
  await obterPool().query(ESQUEMA);
  await migrarAnexosRemotos();
  await semear();
}

// Bancos criados antes das colunas do FiveManage ganham a migração aqui.
// Código 42701 = coluna já existe: segue sem erro.
async function migrarAnexosRemotos(): Promise<void> {
  for (const ddl of [
    "ALTER TABLE anexos ADD COLUMN remoto_id TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE anexos ADD COLUMN remoto_url TEXT NOT NULL DEFAULT ''",
  ]) {
    try {
      await obterPool().query(ddl);
    } catch (erro) {
      if ((erro as { code?: string })?.code !== "42701") throw erro;
    }
  }
}

async function prontoBD(): Promise<void> {
  inicializacao ??= inicializar();
  await inicializacao;
}

// O driver pg usa placeholders $1, $2, ...; o código da aplicação (conversado
// com versão SQLite) usa "?". Convertemos automaticamente na fronteira; o SQL
// da base nunca usa "?" dentro de literais.
function converterPlaceholders(sql: string, params: unknown[]): [string, unknown[]] {
  if (!sql.includes("?")) return [sql, params];
  let pos = 0;
  const novo = sql.replace(/\?/g, () => `$${++pos}`);
  return [novo, params];
}

async function get<T extends QueryResultRow = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T | undefined> {
  await prontoBD();
  const [novo, novosParams] = converterPlaceholders(sql, params);
  const atual = contexto.getStore();
  const res = atual ? await atual.query(novo, novosParams) : await obterPool().query(novo, novosParams);
  return res.rows[0] as T | undefined;
}

async function all<T extends QueryResultRow = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  await prontoBD();
  const [novo, novosParams] = converterPlaceholders(sql, params);
  const atual = contexto.getStore();
  const res = atual ? await atual.query(novo, novosParams) : await obterPool().query(novo, novosParams);
  return res.rows as T[];
}

async function run(sql: string, params: unknown[] = []): Promise<ResultadoRun> {
  await prontoBD();
  const [novo, novosParams] = converterPlaceholders(sql, params);
  const atual = contexto.getStore();
  const res = atual ? await atual.query(novo, novosParams) : await obterPool().query(novo, novosParams);
  const linha = res.rows[0] as Record<string, unknown> | undefined;
  const lastInsertRowid =
    linha && Object.prototype.hasOwnProperty.call(linha, "id") ? Number(linha.id) : 0;
  return { changes: res.rowCount ?? 0, lastInsertRowid };
}

async function transacao<U>(funcao: () => Promise<U> | U): Promise<U> {
  await prontoBD();
  const atual = contexto.getStore();
  if (atual) return funcao();
  const cliente = await obterPool().connect();
  try {
    await cliente.query("BEGIN");
    const resultado = await contexto.run(cliente, funcao);
    await cliente.query("COMMIT");
    return resultado;
  } catch (erro) {
    try {
      await cliente.query("ROLLBACK");
    } catch {
      // segue para o erro original
    }
    throw erro;
  } finally {
    cliente.release();
  }
}

export function banco(): Banco {
  return { get, all, run, transaction: transacao };
}