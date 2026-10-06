import type { ReactNode } from "react";
import type { Metadata } from "next";
import {
  Aviso,
  Botao,
  Cabecalho,
  Campo,
  Grade,
  Numero,
  Painel,
  Recado,
  Selecao,
  Selo,
  Tabela,
} from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import { PAPEIS, PERMISSOES, nomeDoPapel, pode, type Permissao } from "@/lib/rbac";
import { listarUsuarios, resumoUsuarios, totalUsuarios } from "@/lib/usuarios";
import { alterarPapelAction, alternarAtivoAction, criarUsuarioAction, definirSenhaAction } from "@/lib/acoes/usuarios";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Usuários" };

const OPCOES_PAPEIS = PAPEIS.map((p) => ({ valor: p.valor, rotulo: `${p.nome} — ${p.descricao}` }));

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
          Esta rota é exclusiva de quem tem a permissão {PERMISSOES.usuariosGerir}. Seu perfil ({nomeDoPapel(usuario.papel)})
          não administra usuários — procure o administrador.
        </Aviso>
      </div>
    );
  }

  const linhas = listarUsuarios();
  const resumo = resumoUsuarios();
  const totalCompras = linhas.reduce((soma, l) => soma + l.compras, 0);

  const colunas: (string | ReactNode)[] = ["Nome", "E-mail", "Perfil", "Situação", "Compras registradas", "Gerenciar"];
  const linhasTabela: ReactNode[][] = linhas.map((l) => {
    const ativo = l.ativo === 1;
    const euMesmo = l.id === usuario.id;
    return [
      <span key={`nome-${l.id}`} className="font-medium text-white">
        {l.nome}
        {euMesmo ? <span className="ml-1.5 text-[11px] text-indigo-300">(você)</span> : null}
      </span>,
      <span key={`email-${l.id}`} className="break-all">
        {l.email}
      </span>,
      <Selo key={`papel-${l.id}`} valor={l.papel} rotulo={nomeDoPapel(l.papel)} />,
      <Selo key={`ativo-${l.id}`} valor={ativo ? "ativo" : "inativo"} rotulo={ativo ? "Ativo" : "Desativado"} />,
      <span key={`compras-${l.id}`} className="tabular-nums">
        {l.compras}
      </span>,
      <details key={`gerir-${l.id}`} className="min-w-[240px]">
        <summary className="cursor-pointer list-none rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-center text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white">
          Gerenciar
        </summary>
        <div className="mt-3 space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <form action={alterarPapelAction} className="space-y-3">
            <input type="hidden" name="id" value={l.id} />
            <Selecao rotulo="Perfil de acesso" name="papel" defaultValor={l.papel} opcoes={OPCOES_PAPEIS} />
            <Botao variante="secundario">Salvar perfil</Botao>
          </form>
          <form action={alternarAtivoAction} className="space-y-2 border-t border-white/10 pt-3">
            <input type="hidden" name="id" value={l.id} />
            <input type="hidden" name="ativo" value={String(l.ativo)} />
            <Botao variante={ativo ? "perigo" : "secundario"}>
              {ativo ? "Desativar acesso" : "Reativar acesso"}
            </Botao>
          </form>
          <form action={definirSenhaAction} className="space-y-3 border-t border-white/10 pt-3">
            <input type="hidden" name="id" value={l.id} />
            <Campo
              rotulo="Nova senha"
              name="senha"
              type="password"
              required
              hint="Mínimo de 8 caracteres, com letra e número. As sessões abertas serão encerradas."
            />
            <Botao variante="secundario">Definir senha</Botao>
          </form>
          {euMesmo ? (
            <p className="text-[11px] text-amber-200">
              Você não pode mudar o próprio perfil nem desativar a própria conta por aqui.
            </p>
          ) : null}
        </div>
      </details>,
    ];
  });

  return (
    <div>
      <Cabecalho
        titulo="Usuários"
        descricao="Crie contas, ajuste perfis e acompanhe quem registra compras. Toda mudança fica na trilha de auditoria."
      />
      <Recado searchParams={params} />

      <Grade colunas={4}>
        <Numero rotulo="Contas no sistema" valor={String(totalUsuarios())} />
        <Numero rotulo="Ativos" valor={String(resumo.ativos)} nota={`${resumo.total - resumo.ativos} desativado(s)`} tom="bom" />
        <Numero rotulo="Compras registradas" valor={String(totalCompras)} nota="soma por responsável" />
        <Numero rotulo="Perfis possíveis" valor={String(PAPEIS.length)} nota="de comprador a auditor" />
      </Grade>

      <Painel className="my-5 p-5">
        <h2 className="text-sm font-semibold text-white">Distribuição por perfil</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {resumo.porPapel.map((p) => (
            <li key={p.papel} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              {p.nome}: <span className="tabular-nums font-medium text-white">{p.quantidade}</span>
            </li>
          ))}
        </ul>
      </Painel>

      <Painel className="mb-5 p-5">
        <h2 className="text-sm font-semibold text-white">Nova conta</h2>
        <p className="mt-0.5 text-[11px] text-white/40">
          Só quem gerencia usuários define o perfil. Sem seleção, a conta nasce como compradora.
        </p>
        <form action={criarUsuarioAction} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo rotulo="Nome" name="nome" required placeholder="Nome completo" />
          <Campo rotulo="E-mail" name="email" type="email" required placeholder="pessoa@sonhodeicaro.edu.br" />
          <Campo rotulo="Senha inicial" name="senha" type="password" required hint="Mínimo de 8 caracteres, com letra e número." />
          <div className="flex flex-col justify-end gap-2">
            <Selecao rotulo="Perfil" name="papel" vazio="Comprador (padrão)" opcoes={OPCOES_PAPEIS} />
            <Botao>Criar usuário</Botao>
          </div>
        </form>
      </Painel>

      <Tabela colunas={colunas} linhas={linhasTabela} vazio="Nenhum usuário cadastrado." />

      <Painel className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-white">Matriz de permissões</h2>
        <p className="mt-0.5 text-[11px] text-white/40">
          Legenda: x tem a permissão, – não tem. Fonte da decisão de acesso do sistema (rbac).
        </p>
        <div className="mt-4">
          <Tabela
            colunas={["Permissão", ...PAPEIS.map((p) => p.nome)]}
            linhas={(Object.keys(PERMISSOES) as (keyof typeof PERMISSOES)[]).map((chave) => {
              const permissao: Permissao = PERMISSOES[chave];
              return [
                <span key={`perm-${chave}`} className="font-mono text-xs text-white/80">
                  {permissao}
                </span>,
                ...PAPEIS.map((p) =>
                  pode(p.valor, permissao) ? (
                    <span key={`ok-${chave}-${p.valor}`} className="font-semibold text-emerald-300">
                      x
                    </span>
                  ) : (
                    <span key={`no-${chave}-${p.valor}`} className="text-white/25">
                      –
                    </span>
                  ),
                ),
              ];
            })}
          />
        </div>
      </Painel>
    </div>
  );
}
