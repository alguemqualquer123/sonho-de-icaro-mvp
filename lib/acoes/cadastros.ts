"use server";

import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { PERMISSOES, pode } from "@/lib/rbac";
import {
  ENTIDADES,
  criarCadastro,
  desativarCadastro,
  editarCadastro,
  nomeEntidade,
  type Entidade,
} from "@/lib/cadastros";
import { flashErro, numero, opcionalNumero, texto } from "@/lib/flash";
import { invalido } from "@/lib/regras";

function exigirGestao(papel: string): void {
  if (!pode(papel, PERMISSOES.cadastrosGerir)) {
    flashErro(new Error(`seu perfil (${papel}) não gerencia cadastros — a permissão necessária é ${PERMISSOES.cadastrosGerir}`));
  }
}

function entidadeValida(bruto: string): Entidade {
  if (!(ENTIDADES as readonly string[]).includes(bruto)) {
    flashErro(new Error("entidade de cadastro desconhecida; recarregue a página e tente novamente"));
  }
  return bruto as Entidade;
}

// flashSucesso não aceita base com query string; aqui mantemos a aba aberta
// no redirect, então a navegação por ?entidade= não se perde.
function sucesso(entidade: Entidade, mensagem: string): never {
  redirect(`/cadastros?entidade=${entidade}&ok=${encodeURIComponent(mensagem)}`);
}

export async function criarCadastroAction(formData: FormData) {
  const usuario = await exigirUsuario();
  exigirGestao(usuario.papel);
  const entidade = entidadeValida(texto(formData, "entidade", 40));
  try {
    await criarCadastro(
      entidade,
      {
        codigo: texto(formData, "codigo", 40),
        nome: texto(formData, "nome", 120),
        coordenacao_id: opcionalNumero(formData, "coordenacao_id"),
        centro_custo_id: opcionalNumero(formData, "centro_custo_id"),
        tipo: texto(formData, "tipo", 30) || undefined,
      },
      usuario,
    );
  } catch (erro) {
    flashErro(erro);
  }
  sucesso(entidade, `${nomeEntidade(entidade)} criado com sucesso`);
}

export async function editarCadastroAction(formData: FormData) {
  const usuario = await exigirUsuario();
  exigirGestao(usuario.papel);
  const entidade = entidadeValida(texto(formData, "entidade", 40));
  try {
    const id = numero(formData, "id");
    if (!id) invalido("cadastro sem identificação");
    await editarCadastro(
      entidade,
      id,
      {
        nome: texto(formData, "nome", 120),
        centro_custo_id: opcionalNumero(formData, "centro_custo_id"),
        coordenacao_id: opcionalNumero(formData, "coordenacao_id"),
      },
      usuario,
    );
  } catch (erro) {
    flashErro(erro);
  }
  sucesso(entidade, `${nomeEntidade(entidade)} editado com sucesso`);
}

export async function desativarCadastroAction(formData: FormData) {
  const usuario = await exigirUsuario();
  exigirGestao(usuario.papel);
  const entidade = entidadeValida(texto(formData, "entidade", 40));
  try {
    const id = numero(formData, "id");
    if (!id) invalido("cadastro sem identificação");
    const motivo = texto(formData, "motivo", 400);
    if (motivo === "") invalido("informe o motivo da desativação (ou da reativação) antes de confirmar");
    await desativarCadastro(entidade, id, motivo, usuario);
  } catch (erro) {
    flashErro(erro);
  }
  sucesso(entidade, `situação de ${nomeEntidade(entidade)} alternada; o motivo ficou registrado na trilha de auditoria`);
}
