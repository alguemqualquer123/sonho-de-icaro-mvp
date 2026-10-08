import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { banco, agora } from "./db";
import { pode, type Permissao } from "./rbac";
import { registrarTrilha } from "./auditoria";

export const COOKIE_SESSAO = "sid";
const TTL_HORAS = Number(process.env.SESSION_TTL_HORAS ?? 12);
const SEGREDO = process.env.SESSION_SECRET ?? "dev-secret-troque-em-producao";

export type Usuario = {
  id: number;
  nome: string;
  email: string;
  papel: string;
  ativo: number;
};

export function hashSenha(senha: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(senha, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verificarSenha(senha: string, armazenada: string): boolean {
  const [algo, saltHex, hashHex] = armazenada.split("$");
  if (algo !== "scrypt" || !saltHex || !hashHex) return false;
  const esperado = Buffer.from(hashHex, "hex");
  const atual = crypto.scryptSync(senha, Buffer.from(saltHex, "hex"), esperado.length);
  return crypto.timingSafeEqual(atual, esperado);
}

export function validarForcaSenha(senha: string): string {
  if (senha.length < 8) return "a senha precisa de ao menos 8 caracteres";
  if (!/[a-zA-Z]/.test(senha)) return "a senha precisa de ao menos uma letra";
  if (!/\d/.test(senha)) return "a senha precisa de ao menos um número";
  return "";
}

function tokenParaHash(token: string): string {
  return crypto.createHmac("sha256", SEGREDO).update(token).digest("hex");
}

export async function criarSessao(usuarioId: number, ip: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expira = new Date(Date.now() + TTL_HORAS * 3600_000).toISOString();
  await banco().run(
    "INSERT INTO sessoes(token_hash, usuario_id, ip, criado_em, expira_em) VALUES (?, ?, ?, ?, ?)",
    [tokenParaHash(token), usuarioId, ip, agora(), expira],
  );
  return token;
}

export async function definirCookieSessao(token: string) {
  const store = await cookies();
  store.set(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_HORAS * 3600,
  });
}

export async function limparCookieSessao() {
  const store = await cookies();
  store.delete(COOKIE_SESSAO);
}

export async function revogarSessaoAtual() {
  const store = await cookies();
  const token = store.get(COOKIE_SESSAO)?.value;
  if (token) await banco().run("DELETE FROM sessoes WHERE token_hash = ?", [tokenParaHash(token)]);
  await limparCookieSessao();
}

export async function usuarioAtual(): Promise<Usuario | null> {
  const store = await cookies();
  const token = store.get(COOKIE_SESSAO)?.value;
  if (!token || token.length < 16) return null;
  const linha = await banco().get(
    `SELECT u.id, u.nome, u.email, u.papel, u.ativo, s.expira_em
       FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.token_hash = ?`,
    [tokenParaHash(token)],
  ) as (Usuario & { expira_em: string }) | undefined;
  if (!linha) return null;
  if (new Date(linha.expira_em) < new Date() || linha.ativo !== 1) {
    await banco().run("DELETE FROM sessoes WHERE token_hash = ?", [tokenParaHash(token)]);
    return null;
  }
  return { id: linha.id, nome: linha.nome, email: linha.email, papel: linha.papel, ativo: linha.ativo };
}

export async function encerrarSessoesDoUsuario(usuarioId: number) {
  await banco().run("DELETE FROM sessoes WHERE usuario_id = ?", [usuarioId]);
}

export async function exigirUsuario(): Promise<Usuario> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  return usuario;
}

export async function exigirPermissao(permissao: Permissao): Promise<Usuario> {
  const usuario = await exigirUsuario();
  if (!pode(usuario.papel, permissao)) {
    const { forbidden } = await import("./regras");
    forbidden(`seu perfil (${usuario.papel}) não tem a permissão ${permissao}`);
  }
  return usuario;
}

export async function registrarLogin(usuario: Usuario, ip: string) {
  await registrarTrilha({
    usuario,
    entidade: "sessao",
    entidadeId: String(usuario.id),
    acao: "login",
    depois: { email: usuario.email },
    ip,
  });
}

export async function registrarLogout(usuario: Usuario, ip: string) {
  await registrarTrilha({
    usuario,
    entidade: "sessao",
    entidadeId: String(usuario.id),
    acao: "logout",
    ip,
  });
}

export function ipDoPedido(headeres: Headers): string {
  return (headeres.get("x-forwarded-for") ?? "local").split(",")[0].trim();
}
