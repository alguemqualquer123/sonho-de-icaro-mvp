"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPLOADS_DIR = exports.DATA_DIR = void 0;
exports.banco = banco;
exports.agora = agora;
exports.competenciaDaData = competenciaDaData;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
exports.DATA_DIR = process.env.DATA_DIR
    ? node_path_1.default.resolve(process.env.DATA_DIR)
    : node_path_1.default.join(process.cwd(), "data");
exports.UPLOADS_DIR = node_path_1.default.join(exports.DATA_DIR, "uploads");
const globalCache = globalThis;
function abrir() {
    node_fs_1.default.mkdirSync(exports.UPLOADS_DIR, { recursive: true });
    const db = new better_sqlite3_1.default(node_path_1.default.join(exports.DATA_DIR, "app.db"));
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    return db;
}
function banco() {
    if (!globalCache.__banco) {
        const db = abrir();
        db.exec(ESQUEMA);
        semear(db);
        globalCache.__banco = db;
    }
    return globalCache.__banco;
}
function agora() {
    return new Date().toISOString();
}
function competenciaDaData(data) {
    return data.slice(0, 7);
}
// Toda a modelagem financeira usa centavos inteiros (INTEGER). Nenhum cálculo
// em ponto flutuante entra aqui — princípio herdado do projeto original.
const ESQUEMA = /* SQL */ `
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS turmas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  coordenacao_id INTEGER NOT NULL REFERENCES coordenacoes(id),
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS centros_custo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'setor',
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS setores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  centro_custo_id INTEGER REFERENCES centros_custo(id),
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS fornecedores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS projetos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS compras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  compra_id INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  caminho TEXT NOT NULL,
  mime TEXT NOT NULL DEFAULT '',
  tamanho_bytes INTEGER NOT NULL,
  legivel INTEGER,
  criado_por INTEGER NOT NULL REFERENCES usuarios(id),
  criado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS eventos_financeiros (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  compra_id INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('estorno','reembolso','transferencia','correcao')),
  valor_centavos INTEGER NOT NULL,
  motivo TEXT NOT NULL DEFAULT '',
  criado_por INTEGER NOT NULL REFERENCES usuarios(id),
  criado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS faturas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competencia TEXT NOT NULL UNIQUE,
  total_centavos INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS itens_fatura (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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

CREATE VIEW IF NOT EXISTS vw_resumo_compra AS
SELECT c.id,
       c.valor_centavos,
       COALESCE((SELECT SUM(a.valor_centavos) FROM alocacoes a WHERE a.compra_id = c.id), 0) AS rateado_centavos,
       c.valor_centavos - COALESCE((SELECT SUM(a.valor_centavos) FROM alocacoes a WHERE a.compra_id = c.id), 0) AS saldo_centavos,
       (SELECT COUNT(*) FROM anexos x WHERE x.compra_id = c.id) AS total_anexos
FROM compras c;
`;
const COORDENACOES = [
    { codigo: "F1", nome: "Coordenação F1" },
    { codigo: "F2", nome: "Coordenação F2" },
];
const TURMAS = [
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
const CATEGORIAS = [
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
const CENTROS_CUSTO = [
    { codigo: "CC-ADM", nome: "Administração", tipo: "setor" },
    { codigo: "CC-CANT", nome: "Cantina", tipo: "setor" },
    { codigo: "CC-LIMP", nome: "Limpeza", tipo: "setor" },
    { codigo: "CC-MAN", nome: "Manutenção", tipo: "setor" },
    { codigo: "CC-INT", nome: "Integral", tipo: "setor" },
    { codigo: "CC-F1", nome: "Coordenação F1", tipo: "coordenacao" },
    { codigo: "CC-F2", nome: "Coordenação F2", tipo: "coordenacao" },
    { codigo: "CC-REC", nome: "Recreação", tipo: "setor" },
];
const SETORES = [
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
function semear(db) {
    const temUsuarios = db.prepare("SELECT COUNT(*) AS n FROM usuarios").get().n;
    if (temUsuarios > 0)
        return;
    const semearTx = db.transaction(() => {
        const coord = db.prepare("INSERT INTO coordenacoes(codigo, nome) VALUES (?, ?)");
        for (const c of COORDENACOES)
            coord.run(c.codigo, c.nome);
        const idCoord = new Map(db.prepare("SELECT id, codigo FROM coordenacoes").all().map((r) => [r.codigo, r.id]));
        const turma = db.prepare("INSERT INTO turmas(codigo, nome, coordenacao_id) VALUES (?, ?, ?)");
        for (const t of TURMAS)
            turma.run(t.codigo, t.nome, idCoord.get(t.coordenacao));
        const categoria = db.prepare("INSERT INTO categorias(codigo, nome) VALUES (?, ?)");
        for (const c of CATEGORIAS)
            categoria.run(c.codigo, c.nome);
        const cc = db.prepare("INSERT INTO centros_custo(codigo, nome, tipo) VALUES (?, ?, ?)");
        for (const c of CENTROS_CUSTO)
            cc.run(c.codigo, c.nome, c.tipo);
        const idCc = new Map(db.prepare("SELECT id, codigo FROM centros_custo").all().map((r) => [r.codigo, r.id]));
        const setor = db.prepare("INSERT INTO setores(codigo, nome, centro_custo_id) VALUES (?, ?, ?)");
        for (const s of SETORES)
            setor.run(s.codigo, s.nome, s.cc ? idCc.get(s.cc) ?? null : null);
    });
    semearTx();
}
