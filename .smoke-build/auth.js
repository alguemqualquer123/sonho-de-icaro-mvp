"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.COOKIE_SESSAO = void 0;
exports.hashSenha = hashSenha;
exports.verificarSenha = verificarSenha;
exports.validarForcaSenha = validarForcaSenha;
exports.criarSessao = criarSessao;
exports.definirCookieSessao = definirCookieSessao;
exports.limparCookieSessao = limparCookieSessao;
exports.revogarSessaoAtual = revogarSessaoAtual;
exports.usuarioAtual = usuarioAtual;
exports.encerrarSessoesDoUsuario = encerrarSessoesDoUsuario;
exports.exigirUsuario = exigirUsuario;
exports.exigirPermissao = exigirPermissao;
exports.registrarLogin = registrarLogin;
exports.registrarLogout = registrarLogout;
exports.ipDoPedido = ipDoPedido;
const node_crypto_1 = __importDefault(require("node:crypto"));
const headers_1 = require("next/headers");
const navigation_1 = require("next/navigation");
const db_1 = require("./db");
const rbac_1 = require("./rbac");
const auditoria_1 = require("./auditoria");
exports.COOKIE_SESSAO = "sid";
const TTL_HORAS = Number(process.env.SESSION_TTL_HORAS ?? 12);
const SEGREDO = process.env.SESSION_SECRET ?? "dev-secret-troque-em-producao";
function hashSenha(senha) {
    const salt = node_crypto_1.default.randomBytes(16);
    const hash = node_crypto_1.default.scryptSync(senha, salt, 64);
    return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}
function verificarSenha(senha, armazenada) {
    const [algo, saltHex, hashHex] = armazenada.split("$");
    if (algo !== "scrypt" || !saltHex || !hashHex)
        return false;
    const esperado = Buffer.from(hashHex, "hex");
    const atual = node_crypto_1.default.scryptSync(senha, Buffer.from(saltHex, "hex"), esperado.length);
    return node_crypto_1.default.timingSafeEqual(atual, esperado);
}
function validarForcaSenha(senha) {
    if (senha.length < 8)
        return "a senha precisa de ao menos 8 caracteres";
    if (!/[a-zA-Z]/.test(senha))
        return "a senha precisa de ao menos uma letra";
    if (!/\d/.test(senha))
        return "a senha precisa de ao menos um número";
    return "";
}
function tokenParaHash(token) {
    return node_crypto_1.default.createHmac("sha256", SEGREDO).update(token).digest("hex");
}
function criarSessao(usuarioId, ip) {
    const token = node_crypto_1.default.randomBytes(32).toString("hex");
    const expira = new Date(Date.now() + TTL_HORAS * 3600000).toISOString();
    (0, db_1.banco)()
        .prepare("INSERT INTO sessoes(token_hash, usuario_id, ip, criado_em, expira_em) VALUES (?, ?, ?, ?, ?)")
        .run(tokenParaHash(token), usuarioId, ip, (0, db_1.agora)(), expira);
    return token;
}
async function definirCookieSessao(token) {
    const store = await (0, headers_1.cookies)();
    store.set(exports.COOKIE_SESSAO, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: TTL_HORAS * 3600,
    });
}
async function limparCookieSessao() {
    const store = await (0, headers_1.cookies)();
    store.delete(exports.COOKIE_SESSAO);
}
async function revogarSessaoAtual() {
    const store = await (0, headers_1.cookies)();
    const token = store.get(exports.COOKIE_SESSAO)?.value;
    if (token)
        (0, db_1.banco)().prepare("DELETE FROM sessoes WHERE token_hash = ?").run(tokenParaHash(token));
    await limparCookieSessao();
}
async function usuarioAtual() {
    const store = await (0, headers_1.cookies)();
    const token = store.get(exports.COOKIE_SESSAO)?.value;
    if (!token || token.length < 16)
        return null;
    const linha = (0, db_1.banco)()
        .prepare(`SELECT u.id, u.nome, u.email, u.papel, u.ativo, s.expira_em
         FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
        WHERE s.token_hash = ?`)
        .get(tokenParaHash(token));
    if (!linha)
        return null;
    if (new Date(linha.expira_em) < new Date() || linha.ativo !== 1) {
        (0, db_1.banco)().prepare("DELETE FROM sessoes WHERE token_hash = ?").run(tokenParaHash(token));
        return null;
    }
    return { id: linha.id, nome: linha.nome, email: linha.email, papel: linha.papel, ativo: linha.ativo };
}
function encerrarSessoesDoUsuario(usuarioId) {
    (0, db_1.banco)().prepare("DELETE FROM sessoes WHERE usuario_id = ?").run(usuarioId);
}
async function exigirUsuario() {
    const usuario = await usuarioAtual();
    if (!usuario)
        (0, navigation_1.redirect)("/login");
    return usuario;
}
async function exigirPermissao(permissao) {
    const usuario = await exigirUsuario();
    if (!(0, rbac_1.pode)(usuario.papel, permissao)) {
        const { forbidden } = await Promise.resolve().then(() => __importStar(require("./regras")));
        forbidden(`seu perfil (${usuario.papel}) não tem a permissão ${permissao}`);
    }
    return usuario;
}
async function registrarLogin(usuario, ip) {
    (0, auditoria_1.registrarTrilha)({
        usuario,
        entidade: "sessao",
        entidadeId: String(usuario.id),
        acao: "login",
        depois: { email: usuario.email },
        ip,
    });
}
async function registrarLogout(usuario, ip) {
    (0, auditoria_1.registrarTrilha)({
        usuario,
        entidade: "sessao",
        entidadeId: String(usuario.id),
        acao: "logout",
        ip,
    });
}
function ipDoPedido(headeres) {
    return (headeres.get("x-forwarded-for") ?? "local").split(",")[0].trim();
}
