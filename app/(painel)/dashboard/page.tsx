import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho, Grade, Numero, Painel, Recado, Selo, Barra, Valor, Vazio } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import { resumoMensal } from "@/lib/relatorios";
import { listarCompras } from "@/lib/compras";
import { deslocarMes, nomeDoMes, normalizarMes, dataPorExtenso } from "@/lib/datas";
import { formatarCentavos } from "@/lib/numerario";

export const metadata: Metadata = { title: "Visão geral" };

function ListaAnalitica({
  titulo,
  linhas,
  total,
  vazio,
}: {
  titulo: string;
  linhas: { chave: string; nome: string; valor_centavos: number; quantidade: number }[];
  total: number;
  vazio: string;
}) {
  return (
    <Painel className="p-5">
      <h2 className="text-sm font-semibold text-white">{titulo}</h2>
      <p className="mt-0.5 text-[11px] text-white/40">Rateio (alocações) — a mesma compra pode aparecer em mais de um recorte.</p>
      <ul className="mt-4 space-y-3">
        {linhas.length === 0 ? (
          <li className="text-sm text-white/40">{vazio}</li>
        ) : (
          linhas.slice(0, 7).map((l) => {
            const percentual = total > 0 ? Math.round((l.valor_centavos / total) * 1000) / 10 : 0;
            return (
              <li key={l.chave}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-white/85">{l.nome}</span>
                  <span className="shrink-0 tabular-nums text-white/60">
                    {formatarCentavos(l.valor_centavos)}
                    <span className="ml-1.5 text-[11px] text-white/35">{percentual}%</span>
                  </span>
                </div>
                <div className="mt-1.5">
                  <Barra percentual={percentual} />
                </div>
              </li>
            );
          })
        )}
      </ul>
    </Painel>
  );
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; erro?: string; ok?: string }>;
}) {
  const usuario = await exigirUsuario();
  const params = await searchParams;
  const competencia = normalizarMes(params.mes);
  const [resumo, compras] = await Promise.all([
    resumoMensal(usuario, competencia),
    listarCompras(usuario, { competencia, limite: 200 }),
  ]);
  const pendencias = compras.filter(
    (c) => c.status !== "cancelada" && ((c.saldo_centavos ?? 0) > 0 || (c.total_anexos ?? 0) === 0),
  );

  return (
    <div>
      <Cabecalho
        titulo={`Visão geral · ${nomeDoMes(competencia)}`}
        descricao="O total financeiro soma compras. Os recortes abaixo somam alocações — por isso um mesmo gasto aparece em vários recortes, mas nunca é contado duas vezes no total."
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard?mes=${deslocarMes(competencia, -1)}`}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
            >
              ← mês anterior
            </Link>
            {resumo.fechado ? <Selo valor="aprovada" rotulo="mês fechado" /> : null}
            <Link
              href={`/dashboard?mes=${deslocarMes(competencia, 1)}`}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
            >
              próximo mês →
            </Link>
          </div>
        }
      />
      <Recado searchParams={params} />

      <Grade colunas={4}>
        <Numero rotulo="Total do mês (compras)" valor={formatarCentavos(resumo.total_centavos)} nota={`${resumo.quantidade_compras} lançamento(s)`} />
        <Numero rotulo="Já rateado" valor={formatarCentavos(resumo.rateado_centavos)} nota="soma das alocações" tom="bom" />
        <Numero
          rotulo="Aguardando classificação"
          valor={formatarCentavos(resumo.nao_classificado_centavos)}
          nota={`${resumo.sem_classificar} compra(s) com saldo`}
          tom={resumo.nao_classificado_centavos > 0 ? "alerta" : "bom"}
        />
        <Numero
          rotulo="Sem comprovante"
          valor={String(resumo.sem_comprovante)}
          nota="compras sem arquivo anexado"
          tom={resumo.sem_comprovante > 0 ? "alerta" : "bom"}
        />
      </Grade>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Numero rotulo="Estornos e reembolsos" valor={formatarCentavos(resumo.estornos_centavos)} nota="eventos vinculados, não apagam a compra" />
        <Numero rotulo="Compras canceladas" valor={String(resumo.canceladas)} nota="registradas como evento novo" />
        <Numero rotulo="Distribuição atual" valor={`${resumo.por_setor.length} setores`} nota={`${resumo.por_categoria.length} categorias usadas`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ListaAnalitica titulo="Por setor" linhas={resumo.por_setor} total={resumo.rateado_centavos} vazio="Nenhum rateio lançado neste mês." />
        <ListaAnalitica titulo="Por categoria" linhas={resumo.por_categoria} total={resumo.rateado_centavos} vazio="Nenhuma categoria usada neste mês." />
        <ListaAnalitica titulo="Por coordenação (turmas)" linhas={resumo.por_coordenacao} total={resumo.rateado_centavos} vazio="Nenhuma alocação vinculada a turma." />
        <ListaAnalitica titulo="Por turma" linhas={resumo.por_turma} total={resumo.rateado_centavos} vazio="Nenhuma turma usada neste mês." />
      </div>

      <Painel className="mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">Pendências para fechar o mês</h2>
          <Link href={`/relatorios?mes=${competencia}`} className="text-xs text-indigo-300 hover:underline">
            ver relatório completo →
          </Link>
        </div>
        {pendencias.length === 0 ? (
          <Vazio>Nada pendente: todas as compras têm rateio completo e comprovante.</Vazio>
        ) : (
          <ul className="mt-3 divide-y divide-white/5">
            {pendencias.slice(0, 8).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link href={`/compras/${c.id}`} className="text-sm font-medium text-white hover:underline">
                    {c.numero} · {c.fornecedor}
                  </Link>
                  <p className="text-[11px] text-white/40">
                    {dataPorExtenso(c.data)} · {c.responsavel_nome}
                    {(c.total_anexos ?? 0) === 0 ? " · sem comprovante" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <Valor centavos={c.valor_centavos} />
                  {(c.saldo_centavos ?? 0) > 0 ? (
                    <p className="text-[11px] text-amber-200">
                      {formatarCentavos(c.saldo_centavos ?? 0)} por classificar
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Painel>
    </div>
  );
}
