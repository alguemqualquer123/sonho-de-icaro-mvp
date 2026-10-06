import type { ReactNode } from "react";
import type { Metadata } from "next";
import {
  Aviso,
  Botao,
  BotaoLink,
  Cabecalho,
  Painel,
  Recado,
  Tabela,
  type Opcao,
} from "@/components/ui";
import { Selecao } from "@/components/selecao";
import { exigirUsuario } from "@/lib/auth";
import { listarTrilha } from "@/lib/auditoria";
import { listarUsuarios } from "@/lib/usuarios";
import { PERMISSOES, pode } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Auditoria" };

const ATALHOS = ["compra", "alocacao", "anexo", "usuario", "fatura", "conciliacao", "fechamento", "sessao", "cadastro"];

const ROTULOS_LIMITE = ["100", "200", "500", "1000"];

// antes/depois são JSON gravado como texto; se algo vier corrompido,
// exibimos a string crua em vez de esconder o registro.
function diff(bruto: string | null): string {
  if (bruto === null || bruto === "") return "—";
  try {
    const dados: unknown = JSON.parse(bruto);
    if (dados !== null && typeof dados === "object") {
      const pares = Object.entries(dados as Record<string, unknown>).map(([chave, valor]) => `${chave}: ${String(valor)}`);
      return pares.length > 0 ? pares.join(" · ") : "{}";
    }
    return String(dados);
  } catch {
    return bruto;
  }
}

function hora(iso: string): string {
  return iso.replace("T", " ").slice(0, 16);
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ entidade?: string; usuario?: string; limite?: string; erro?: string; ok?: string }>;
}) {
  const usuario = await exigirUsuario();
  const params = await searchParams;

  if (!pode(usuario.papel, PERMISSOES.auditoriaVer)) {
    return (
      <div>
        <Cabecalho titulo="Auditoria" descricao="Trilha de tudo que mexe nos dados do sistema." />
        <Aviso tipo="aviso">
          Esta rota exige a permissão {PERMISSOES.auditoriaVer} (Administrador, Gestor financeiro ou Auditor). Seu
          perfil ({usuario.papel}) não pode consultar a trilha.
        </Aviso>
      </div>
    );
  }

  const entidadeFiltro = (params.entidade ?? "").trim().slice(0, 40);
  const usuarioFiltro = Number.parseInt(params.usuario ?? "", 10) || 0;
  const limite = Math.min(Math.max(Number.parseInt(params.limite ?? "", 10) || 200, 1), 1000);

  // A trilha grava cadastros como "cadastro:categorias" etc.; o atalho
  // "cadastro" agrupa todos, por isso buscamos sem filtro e peneiramos aqui.
  const [bruto, contas] = await Promise.all([
    listarTrilha(limite, entidadeFiltro === "cadastro" ? "" : entidadeFiltro, usuarioFiltro),
    listarUsuarios(),
  ]);
  const linhas =
    entidadeFiltro === "cadastro" ? bruto.filter((l) => l.entidade.startsWith("cadastro")) : bruto;
  const opcoesUsuario: Opcao[] = contas.map((u) => ({ valor: String(u.id), rotulo: `${u.nome} (${u.email})` }));
  const opcoesEntidade: Opcao[] = ATALHOS.map((e) => ({ valor: e, rotulo: e }));
  const opcoesLimite: Opcao[] = ROTULOS_LIMITE.map((n) => ({ valor: n, rotulo: `últimos ${n} eventos` }));

  const colunas: (string | ReactNode)[] = [
    "Data e hora (UTC)",
    "Ator",
    "Entidade",
    "Registro",
    "Ação",
    "Antes → Depois",
    "Motivo",
    "IP",
  ];
  const linhasTabela: ReactNode[][] = linhas.map((l) => [
    <span key={`data-${l.id}`} className="whitespace-nowrap tabular-nums text-xs">
      {hora(l.criado_em)}
    </span>,
    <span key={`ator-${l.id}`} className="font-medium text-white/90">
      {l.usuario_nome || "sistema"}
    </span>,
    <span key={`ent-${l.id}`} className="font-mono text-xs">
      {l.entidade}
    </span>,
    <span key={`reg-${l.id}`} className="tabular-nums text-xs">
      {l.entidade_id || "—"}
    </span>,
    <span key={`acao-${l.id}`} className="text-xs">
      {l.acao}
    </span>,
    <div key={`diff-${l.id}`} className="max-w-[320px] space-y-1 font-mono text-[11px] leading-relaxed">
      <p className="text-white/55">
        <span className="text-white/30">antes: </span>
        {diff(l.antes)}
      </p>
      <p className="text-white/80">
        <span className="text-white/30">depois: </span>
        {diff(l.depois)}
      </p>
    </div>,
    <span key={`motivo-${l.id}`} className="text-xs text-white/70">
      {l.motivo || "—"}
    </span>,
    <span key={`ip-${l.id}`} className="font-mono text-[11px] text-white/45">
      {l.ip || "—"}
    </span>,
  ]);

  return (
    <div>
      <Cabecalho
        titulo="Auditoria"
        descricao={`Quem fez o quê, quando e por quê. Mostrando até ${limite} evento(s${entidadeFiltro ? `, entidade "${entidadeFiltro}"` : ""}${usuarioFiltro ? `, usuário ${usuarioFiltro}` : ""}}.`}
      />
      <Recado searchParams={params} />

      <Painel className="mb-4 border-amber-400/20 bg-amber-500/[0.04] p-4">
        <p className="text-sm font-medium text-amber-100">Trilha apêndice-only: nada aqui pode ser editado ou apagado.</p>
        <p className="mt-1 text-xs text-amber-100/70">
          Cada linha é inserida no momento do fato e nunca é reescrita. Corrigir um registro exige um novo evento — o
          anterior continua visível. É por isso que cadastros em uso são desativados em vez de apagados.
        </p>
      </Painel>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-white/45">Atalhos por entidade:</span>
        {ATALHOS.map((e) => (
          <BotaoLink key={e} href={`/auditoria?entidade=${e}${usuarioFiltro ? `&usuario=${usuarioFiltro}` : ""}`} variante="secundario">
            {e}
          </BotaoLink>
        ))}
        <BotaoLink href="/auditoria" variante="secundario">
          limpar filtros
        </BotaoLink>
      </div>

      <form action="/auditoria" method="get" className="mb-5 grid items-end gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Selecao
          rotulo="Entidade"
          name="entidade"
          vazio="Todas as entidades"
          defaultValor={entidadeFiltro || undefined}
          opcoes={opcoesEntidade}
        />
        <Selecao
          rotulo="Usuário"
          name="usuario"
          vazio="Todos os usuários"
          defaultValor={usuarioFiltro ? String(usuarioFiltro) : undefined}
          opcoes={opcoesUsuario}
        />
        <Selecao rotulo="Quantidade" name="limite" defaultValor={String(limite)} opcoes={opcoesLimite} />
        <Botao>Filtrar</Botao>
      </form>

      <Tabela
        colunas={colunas}
        linhas={linhasTabela}
        vazio="Nenhum evento de auditoria para os filtros escolhidos."
      />
    </div>
  );
}
