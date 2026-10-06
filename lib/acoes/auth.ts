"use server";

import { redirect } from "next/navigation";
import { ipDoPedido, registrarLogin, registrarLogout, criarSessao, definirCookieSessao, revogarSessaoAtual, usuarioAtual, verificarSenha } from "@/lib/auth";
import { usuarioPorEmail, criarUsuario } from "@/lib/usuarios";
import { registrarTrilha } from "@/lib/auditoria";
import { mensagemDe } from "@/lib/regras";
import { texto } from "@/lib/flash";
import { headers } from "next/headers";

export type EstadoForm = { erro?: string; ok?: string };

export async function loginAction(_estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const email = texto(formData, "email", 200).toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const retorno = texto(formData, "retorno", 100) || "/dashboard";
  const ip = ipDoPedido(await headers());

  const usuario = usuarioPorEmail(email);
  if (!usuario || !verificarSenha(senha, usuario.senha_hash)) {
    registrarTrilha({ entidade: "sessao", acao: "login-falhou", depois: { email }, ip });
    return { erro: "e-mail ou senha não conferem" };
  }
  if (usuario.ativo !== 1) return { erro: "esta conta está desativada; fale com o administrador" };

  const token = criarSessao(usuario.id, ip);
  await definirCookieSessao(token);
  await registrarLogin({ id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel, ativo: usuario.ativo }, ip);
  redirect(retorno.startsWith("/") ? retorno : "/dashboard");
}

export async function registroAction(_estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const ip = ipDoPedido(await headers());
  const senha = String(formData.get("senha") ?? "");
  const senha2 = String(formData.get("confirmar") ?? "");
  if (senha !== senha2) return { erro: "as senhas não são iguais" };

  let id = 0;
  let primeiro = false;
  try {
    const resultado = criarUsuario(
      { nome: texto(formData, "nome", 120), email: texto(formData, "email", 200), senha },
      { publico: true, ip },
    );
    id = resultado.id;
    primeiro = resultado.primeiro;
  } catch (erro) {
    return { erro: mensagemDe(erro) };
  }

  const token = criarSessao(id, ip);
  await definirCookieSessao(token);
  const aviso = primeiro
    ? "Primeira conta criada: você entrou como administrador."
    : "Conta criada. Seu perfil inicial é comprador — o administrador pode ajustá-lo.";
  redirect(`/dashboard?ok=${encodeURIComponent(aviso)}`);
}

export async function sairAction() {
  const usuario = await usuarioAtual();
  const ip = ipDoPedido(await headers());
  if (usuario) await registrarLogout(usuario, ip);
  await revogarSessaoAtual();
  redirect("/login?ok=voce-saiu");
}
