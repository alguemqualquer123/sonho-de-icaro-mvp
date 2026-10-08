import type { Metadata } from "next";
import Link from "next/link";
import {
  Aviso,
  Botao,
  BotaoLink,
  Cabecalho,
  Grade,
  INPUT,
  Numero,
  Painel,
  Recado,
  Selo,
  Tabela,
  Valor,
} from "@/components/ui";
import { Selecao } from "@/components/selecao";
import { exigirUsuario } from "@/lib/auth";
import { listarCompras } from "@/lib/compras";
import { opcoesCatalogos } from "@/lib/cadastros";
import { PERMISSOES, pode } from "@/lib/rbac";
import { nomeDoMes, normalizarMes, deslocarMes, dataPorExtenso } from "@/lib/datas";
import { formatarCentavos, somarCentavos } from "@/lib/numerario";

export const metadata: Metadata = { title: "Compras" };
export const dynamic = "force-dynamic";

const STATUS_OPCOES = ["rascunho", "enviada", "aprovada", "contestada", "cancelada"];

export default async function ComprasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; status?: string; q?: string; setor?: string; erro?: string; ok?: string }>;
}) {
  const usuario = await exigirUsuario();
  const params = await searchParams;
  const competencia = normalizarMes(params.mes);
  const status = params.status && STATUS_OPCOES.includes(params.status) ? params.status : "";
  const busca = (params.q ?? "").trim();
  const setorId = Number(params.setor ?? "") > 0 ? Number(params.setor) : 0;
  const catalogos = await opcoesCatalogos();

  const compras = await listarCompras(usuario, {
    competencia,
    status: status || undefined,
    busca: busca || undefined,
    setorId: setorId || undefined,
  });

  const totalCompras = somarCentavos(...compras.map((c) => c.valor_centavos));
  const totalRateado = somarCentavos(...compras.map((c) => c.rateado_centavos ?? 0));
  const totalSaldo = somarCentavos(...compras.map((c) => c.saldo_centavos ?? 0));

  const colunas = [
    "Número",
    "Data",
    "Fornecedor",
    "Total da compra",
    "Rateado",
    "Saldo a classificar",
    "Comprovantes",
    "Responsável",
    "Status",
  ];

  const linhas = compras.map((c) => {
    const saldo = c.saldo_centavos ?? 0;
    return [
      <Link key="n" href={`/compras/${c.id}`} className="font-medium text-indigo-300 hover:underline">
        {c.numero}
      </Link>,
      <span key="d" className="whitespace-nowrap text-xs text-white/60">
        {dataPorExtenso(c.data)}
      </span>,
      <span key="f" className="max-w-[220px] truncate font-medium text-white">
        {c.fornecedor}
      </span>,
      <span key="v" className="whitespace-nowrap tabular-nums">
        <Valor centavos={c.valor_centavos} negativoPermitido={false} />
      </span>,
      <span key="r" className="whitespace-nowrap tabular-nums text-emerald-200">
        {formatarCentavos(c.rateado_centavos ?? 0)}
      </span>,
      <span key="s" className={`whitespace-nowrap tabular-nums ${saldo > 0 ? "text-amber-200" : "text-white/40"}`}>
        {formatarCentavos(saldo)}
      </span>,
      <span key="a" className="tabular-nums">
        {(c.total_anexos ?? 0) === 0 ? (
          <span className="text-amber-200">nenhum</span>
        ) : (
          `${c.total_anexos ?? 0} arquivo(s)`
        )}
      </span>,
      <span key="p" className="text-xs text-white/60">
        {c.responsavel_nome}
      </span>,
      <Selo key="st" valor={c.status} />,
    ];
  });

  return (
    <div>
      <Cabecalho
        titulo={`Compras · ${nomeDoMes(competencia)}`}
        descricao="Cada linha aqui é UMA saída do cartão XP Black. Rateio é distribuição interna: nunca aumenta o total."
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/compras?mes=${deslocarMes(competencia, -1)}${status ? `&status=${status}` : ""}${busca ? `&q=${encodeURIComponent(busca)}` : ""}${setorId ? `&setor=${setorId}` : ""}`}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
            >
              ← mês anterior
            </Link>
            <Link
              href={`/compras?mes=${deslocarMes(competencia, 1)}${status ? `&status=${status}` : ""}${busca ? `&q=${encodeURIComponent(busca)}` : ""}${setorId ? `&setor=${setorId}` : ""}`}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
            >
              próximo mês →
            </Link>
            {pode(usuario.papel, PERMISSOES.comprasCriar) ? <BotaoLink href="/compras/nova">Nova compra</BotaoLink> : null}
          </div>
        }
      />
      <Recado searchParams={params} />

      <Painel className="mb-4 p-4">
        <form method="get" action="/compras" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[10rem_11rem_12rem_1fr_auto]">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-white/60">Mês de referência</span>
            <input type="month" name="mes" defaultValue={competencia} className={INPUT} />
          </label>
          <Selecao
            rotulo="Status"
            name="status"
            defaultValor={status}
            vazio="todos os status"
            opcoes={STATUS_OPCOES.map((s) => ({ valor: s, rotulo: s }))}
          />
          <Selecao
            rotulo="Setor"
            name="setor"
            defaultValor={setorId ? String(setorId) : ""}
            vazio="todos os setores"
            opcoes={catalogos.setores.map((s: any) => ({ valor: String(s.id), rotulo: s.nome }))}
          />
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-white/60">Busca</span>
            <input type="search" name="q" defaultValue={busca} placeholder="fornecedor, descrição ou número" className={INPUT} />
          </label>
          <div className="flex items-end">
            <Botao variante="secundario">Filtrar</Botao>
          </div>
        </form>
      </Painel>

      <Grade colunas={3}>
        <Numero rotulo="Total das compras listadas" valor={formatarCentavos(totalCompras)} nota={`${compras.length} lançamento(s) no filtro`} />
        <Numero rotulo="Já rateado" valor={formatarCentavos(totalRateado)} nota="soma das alocações" tom="bom" />
        <Numero
          rotulo="Saldo aguardando classificação"
          valor={formatarCentavos(totalSaldo)}
          nota="continua sendo a mesma saída do cartão"
          tom={totalSaldo > 0 ? "alerta" : "bom"}
        />
      </Grade>

      <p className="mt-2 text-[11px] text-white/40">
        Legenda: o total acima soma os valores das compras listadas — uma compra entra uma única vez. As colunas
        &quot;Rateado&quot; e &quot;Saldo&quot; apenas mostram quanto do mesmo valor já foi distribuído entre setor,
        categoria, turma e centro de custo.
      </p>

      <div className="mt-4">
        {compras.length === 0 ? (
          <Aviso tipo="aviso">
            Nenhuma compra neste recorte.{" "}
            {pode(usuario.papel, PERMISSOES.comprasCriar)
              ? "Use o botão “Nova compra” para registrar a primeira saída do mês."
              : "Peça ao responsável pelo cartão para registrar as compras do mês."}
          </Aviso>
        ) : null}
        <Tabela colunas={colunas} linhas={linhas} vazio="Nenhuma compra encontrada com estes filtros." />
      </div>
    </div>
  );
}
