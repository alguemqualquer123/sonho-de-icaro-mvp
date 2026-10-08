import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Aviso, Botao, Campo, Cabecalho, Painel, Recado, Selecao, Selo } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import { PAPEIS, PERMISSOES, nomeDoPapel, pode, type Permissao } from "@/lib/rbac";
import { listarUsuarios, resumoUsuarios } from "@/lib/usuarios";
import { dataPorExtenso } from "@/lib/datas";
import {
  alterarPapelAction,
  alternarAtivoAction,
  criarUsuarioAction,
  definirSenhaAction,
} from "@/lib/acoes/usuarios";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Usuários" };

const OPCOES_PAPEIS = PAPEIS.map((p) => ({ valor: p.valor, rotulo: `${p.nome} — ${p.descricao}` }));

function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const usuario = await exigirUsuario();
  const params = await searchParams;

  if (!pode(usuario.papel, PERMISSOES.usuariosGerir)) {
    return (
      <div>
        <Cabecalho titulo="Usuários" descricao="Gestão de contas e perfis de acesso do sistema." />
        <Aviso tipo="aviso">
          Esta rota é exclusiva de quem tem a permissão {PERMISSOES.usuariosGerir}. Seu perfil (
          {nomeDoPapel(usuario.papel)}) não administra usuários — procure o administrador.
        </Aviso>
      </div>
    );
  }

  const linhas = listarUsuarios();
  const resumo = resumoUsuarios();

  return (
    <div>
      <Cabecalho
        titulo="Usuários"
        descricao="Crie as contas da equipe, escolha o perfil de acesso de cada pessoa e desative quem saiu. Quem registra compras pelo sistema é sempre identificado."
      />
      <Recado searchParams={params} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-white/40">
            {resumo.ativos} ativa(s) · {resumo.total} conta(s)
          </p>
          {linhas.length === 0 ? (
            <Painel className="px-4 py-10 text-center text-sm text-white/45">Nenhuma conta cadastrada.</Painel>
          ) : (
            linhas.map((l) => <CartaoUsuario key={l.id} linha={l} euMesmo={l.id === usuario.id} />)
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Painel className="p-5">
            <h2 className="text-sm font-semibold text-white">Nova conta</h2>
            <p className="mt-1 text-xs text-white/45">
              A senha inicial é definida por você. Sem escolher perfil, a conta nasce como compradora.
            </p>
            <form action={criarUsuarioAction} className="mt-4 space-y-3">
              <Campo rotulo="Nome completo" name="nome" required placeholder="Ex.: Maria Aparecida Souza" />
              <Campo rotulo="E-mail" name="email" type="email" required placeholder="maria@sonhodeicaro.edu.br" />
              <Campo
                rotulo="Senha inicial"
                name="senha"
                type="password"
                required
                hint="Mínimo de 8 caracteres, com letra e número."
              />
              <Selecao rotulo="Perfil de acesso" name="papel" vazio="Comprador (padrão)" opcoes={OPCOES_PAPEIS} />
              <Botao>Criar conta</Botao>
            </form>
          </Painel>

          <Painel className="p-5">
            <h2 className="text-sm font-semibold text-white">Distribuição por perfil</h2>
            <ul className="mt-3 space-y-1.5">
              {resumo.porPapel
                .filter((p) => p.quantidade > 0)
                .map((p) => (
                  <li key={p.papel} className="flex items-center justify-between gap-3 text-xs text-white/60">
                    <span>{p.nome}</span>
                    <span className="tabular-nums font-medium text-white">{p.quantidade}</span>
                  </li>
                ))}
            </ul>
          </Painel>
        </aside>
      </div>

      <details className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03]">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-white/80 hover:text-white">
          Matriz de permissões de cada perfil
        </summary>
        <div className="border-t border-white/10 p-5">
          <p className="mb-3 text-xs text-white/45">
            É isto que o sistema aceita em cada perfil. A interface apenas reflete a tabela; a decisão acontece no
            servidor.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-white/45">
                  <th className="py-2 pr-3 font-medium">Permissão</th>
                  {PAPEIS.map((p) => (
                    <th key={p.valor} className="px-2 py-2 text-center font-medium" title={p.descricao}>
                      {p.nome}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(Object.keys(PERMISSOES) as (keyof typeof PERMISSOES)[]).map((chave) => {
                  const permissao: Permissao = PERMISSOES[chave];
                  return (
                    <tr key={chave} className="border-b border-white/5 last:border-0">
                      <td className="py-2 pr-3 font-mono text-xs text-white/70">{permissao}</td>
                      {PAPEIS.map((p) => (
                        <td key={p.valor} className="px-2 py-2 text-center">
                          {pode(p.valor, permissao) ? (
                            <span className="font-semibold text-emerald-300">sim</span>
                          ) : (
                            <span className="text-white/20">–</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </div>
  );
}

function CartaoUsuario({
  linha,
  euMesmo,
}: {
  linha: { id: number; nome: string; email: string; papel: string; ativo: number; criado_em: string; compras: number };
  euMesmo: boolean;
}) {
  const ativo = linha.ativo === 1;
  const acoes: ReactNode[] = [];

  if (!euMesmo) {
    acoes.push(
      <form key="papel" action={alterarPapelAction} className="flex items-end gap-2">
        <div className="min-w-[11rem] flex-1">
          <Selecao rotulo="Perfil" name="papel" defaultValor={linha.papel} opcoes={OPCOES_PAPEIS} />
        </div>
        <input type="hidden" name="id" value={linha.id} />
        <Botao variante="secundario">Salvar</Botao>
      </form>,
      <form key="ativo" action={alternarAtivoAction} className="flex items-end">
        <input type="hidden" name="id" value={linha.id} />
        <input type="hidden" name="ativo" value={String(linha.ativo)} />
        <Botao variante={ativo ? "perigo" : "secundario"}>{ativo ? "Desativar acesso" : "Reativar acesso"}</Botao>
      </form>,
      <form key="senha" action={definirSenhaAction} className="flex items-end gap-2">
        <div className="min-w-[11rem] flex-1">
          <Campo rotulo="Nova senha" name="senha" type="password" required />
        </div>
        <input type="hidden" name="id" value={linha.id} />
        <Botao variante="secundario">Definir</Botao>
      </form>,
    );
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-sm font-semibold text-white/80">
          {iniciais(linha.nome)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-white">
            {linha.nome}
            {euMesmo ? <span className="ml-2 text-xs font-normal text-indigo-300">esta é a sua conta</span> : null}
          </h2>
          <p className="truncate text-xs text-white/45">{linha.email}</p>
          <p className="mt-1.5 text-[11px] text-white/35">
            cadastrada em {dataPorExtenso(linha.criado_em)} · {linha.compras} compra(s) como responsável
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Selo valor={linha.papel} rotulo={nomeDoPapel(linha.papel)} />
          <Selo valor={ativo ? "ativo" : "inativo"} rotulo={ativo ? "Ativa" : "Desativada"} />
        </div>
      </div>

      {euMesmo ? (
        <p className="mt-3 border-t border-white/10 pt-3 text-xs text-amber-200">
          Para trocar o seu próprio perfil ou desativar esta conta, peça a outra pessoa com acesso de administrador —
          o sistema bloqueia para você não se trancar fora.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-white/10 pt-3">{acoes}</div>
      )}
    </article>
  );
}
