"use server";

import { exigirUsuario } from "@/lib/auth";
import { PAPEIS, PERMISSOES, nomeDoPapel, pode, type Papel } from "@/lib/rbac";
import { alterarUsuario, criarUsuario } from "@/lib/usuarios";
import { flashErro, flashSucesso, numero, texto } from "@/lib/flash";
import { invalido } from "@/lib/regras";

function exigirGestao(papel: string): void {
  if (!pode(papel, PERMISSOES.usuariosGerir)) {
    flashErro(new Error(`seu perfil (${papel}) não gerencia usuários — a permissão necessária é ${PERMISSOES.usuariosGerir}`));
  }
}

export async function criarUsuarioAction(formData: FormData) {
  const autor = await exigirUsuario();
  exigirGestao(autor.papel);
  const nome = texto(formData, "nome", 120);
  const papelBruto = texto(formData, "papel", 20);
  const papel = papelBruto === "" ? undefined : (papelBruto as Papel);
  try {
    await criarUsuario(
      {
        nome,
        email: texto(formData, "email", 200),
        senha: String(formData.get("senha") ?? ""),
        papel,
      },
      { publico: false, autor },
    );
  } catch (erro) {
    flashErro(erro);
  }
  flashSucesso("/usuarios", `usuário ${nome} criado com o perfil ${papel ? nomeDoPapel(papel) : "comprador"}`);
}

export async function alterarPapelAction(formData: FormData) {
  const autor = await exigirUsuario();
  exigirGestao(autor.papel);
  const papelBruto = texto(formData, "papel", 20);
  let alvo = 0;
  try {
    alvo = numero(formData, "id");
    if (!alvo) invalido("usuário sem identificação");
    if (!PAPEIS.some((p) => p.valor === papelBruto)) invalido("perfil desconhecido");
    await alterarUsuario(alvo, { papel: papelBruto as Papel }, autor);
  } catch (erro) {
    flashErro(erro);
  }
  flashSucesso("/usuarios", `perfil do usuário ${alvo} alterado para ${nomeDoPapel(papelBruto)}`);
}

export async function alternarAtivoAction(formData: FormData) {
  const autor = await exigirUsuario();
  exigirGestao(autor.papel);
  const atual = texto(formData, "ativo", 5);
  const seraAtivo = atual !== "1";
  let alvo = 0;
  try {
    alvo = numero(formData, "id");
    if (!alvo) invalido("usuário sem identificação");
    if (atual !== "1" && atual !== "0") invalido("estado de atividade inválido");
    await alterarUsuario(alvo, { ativo: seraAtivo }, autor);
  } catch (erro) {
    flashErro(erro);
  }
  flashSucesso(
    "/usuarios",
    `usuário ${alvo} ${seraAtivo ? "reativado" : "desativado"}; as sessões abertas foram encerradas`,
  );
}

export async function definirSenhaAction(formData: FormData) {
  const autor = await exigirUsuario();
  exigirGestao(autor.papel);
  let alvo = 0;
  try {
    alvo = numero(formData, "id");
    if (!alvo) invalido("usuário sem identificação");
    const senha = String(formData.get("senha") ?? "");
    if (senha === "") invalido("informe a nova senha");
    await alterarUsuario(alvo, { senha }, autor);
  } catch (erro) {
    flashErro(erro);
  }
  flashSucesso("/usuarios", `nova senha definida para o usuário ${alvo}; ele precisará entrar de novo`);
}
