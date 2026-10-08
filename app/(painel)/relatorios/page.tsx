import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Aviso,
  Botao,
  Campo,
  Cabecalho,
  Grade,
  Numero,
  Painel,
  Recado,
  Selo,
  Tabela,
} from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import { dataPorExtenso, deslocarMes, nomeDoMes, normalizarMes } from "@/lib/datas";
import { formatarCentavos } from "@/lib/numerario";
import { PERMISSOES, nomeDoPapel, pode } from "@/lib/rbac";
import { TIPOS_RELATORIO, gerarRelatorio, resumoMensal, type TipoRelatorio } from "@/lib/relatorios";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Relatórios",
  description: "Recortes financeiros do cartão XP Black e exportação em CSV.",
};

// REGRA ANTI-DUPLA-CONTAGEM (ver cabeçalho de lib/relatorios.ts):
//   total financeiro = soma das compras      -> cada despesa conta uma vez
//   recorte analítico = soma das alocações   -> a mesma despesa pode aparecer em
//   vários recortes (setor, categoria, turma) sem inflar o total.
// Cada relatório abaixo declara de onde vem o seu total, para ninguém somar duas
// telas diferentes e achar que gastou mais do que gastou.
const ORIGEM_TOTAL: Record<TipoRelatorio, "compras" | "alocacoes" | "fatura"> = {
  "por-setor": "alocacoes",
  "por-categoria": "alocacoes",
  "por-turma": "alocacoes",
  "por-coordenacao": "alocacoes",
  "por-fornecedor": "compras",
  "por-responsavel": "compras",
  mensal: "compras",
  pendencias: "alocacoes",
  conciliacao: "fatura",
};

const NOTA_TOTAL: Record<TipoRelatorio, string> = {
  "por-setor":
    "Total do relatório soma alocações (rateio): uma mesma compra aparece em mais de um setor, mas continua sendo um único gasto no total financeiro.",
  "por-categoria":
    "Total do relatório soma alocações (rateio): a divisão por categoria reparte o valor da compra, nunca o multiplica.",
  "por-turma":
    "Total do relatório soma alocações vinculadas a turma: compras rateadas sem turma ficam fora desta lista.",
  "por-coordenacao":
    "Total do relatório soma alocações: a coordenação aparece pelo curso da turma escolhida no rateio.",
  "por-fornecedor":
    "Total do relatório soma compras: cada saída financeira do cartão conta uma única vez, independente do rateio.",
  "por-responsavel":
    "Total do relatório soma compras lançadas por cada responsável: não confunda com o rateio, que distribui o mesmo valor entre setores.",
  mensal:
    "Total do relatório soma compras de todas as competências: este recorte atravessa os meses e não é limitado pelo seletor de competência.",
  pendencias:
    "Total do relatório soma apenas o saldo ainda não rateado de cada compra (total da compra menos as alocações): é trabalho pendente, não despesa nova.",
  conciliacao:
    "Total do relatório soma itens da fatura do cartão sem par no sistema ou pareados manualmente: é a conferência com a fatura, não o rateio.",
};

// Posição da coluna que recebe a linha de total, conforme a forma de cada
// tabela devolvida por gerarRelatorio().
const COLUNA_TOTAL: Record<TipoRelatorio, number> = {
  "por-setor": 2,
  "por-categoria": 2,
  "por-turma": 2,
  "por-coordenacao": 2,
  "por-fornecedor": 1,
  "por-responsavel": 1,
  mensal: 1,
  pendencias: 4,
  conciliacao: 3,
};

const ROTULO_ORIGEM: Record<"compras" | "alocacoes" | "fatura", string> = {
  compras: "compras (uma linha por saída financeira)",
  alocacoes: "alocações (rateio entre setores, turmas e categorias)",
  fatura: "itens da fatura do cartão",
};

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; mes?: string; erro?: string; ok?: string }>;
}) {
  const usuario = await exigirUsuario();
  const params = await searchParams;
  const competencia = normalizarMes(params.mes);
  const tipo: TipoRelatorio = TIPOS_RELATORIO.some((t) => t.tipo === params.tipo)
    ? (params.tipo as TipoRelatorio)
    : TIPOS_RELATORIO[0].tipo;
  const nomeTipo = TIPOS_RELATORIO.find((t) => t.tipo === tipo)?.nome ?? tipo;

  const podeVer = pode(usuario.papel, PERMISSOES.relatoriosVer);
  const podeExportar = pode(usuario.papel, PERMISSOES.exportar);

  if (!podeVer) {
    return (
      <div>
        <Cabecalho titulo="Relatórios" descricao="Recortes financeiros do cartão XP Black corporativo." />
        <Recado searchParams={params} />
        <Aviso tipo="erro">
          Seu perfil ({nomeDoPapel(usuario.papel)}) não tem a permissão relatorios.ver: procure a gestão financeira
          para receber os recortes de que precisa.
        </Aviso>
      </div>
    );
  }

  const [tabela, resumo] = await Promise.all([
    gerarRelatorio(tipo, usuario, competencia),
    resumoMensal(usuario, competencia),
  ]);
  const indiceTotal = COLUNA_TOTAL[tipo];

  const corpo: ReactNode[][] = tabela.linhas.map((linha) => linha.map((celula) => String(celula)));
  const linhaTotal: ReactNode[] = tabela.colunas.map((coluna, indice) => {
    if (indice === 0) {
      return (
        <span key={coluna} className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
          Total do relatório
        </span>
      );
    }
    if (indice === indiceTotal) {
      return (
        <span key={coluna} className="font-semibold tabular-nums text-emerald-300">
          {formatarCentavos(tabela.total_centavos)}
        </span>
      );
    }
    return (
      <span key={coluna} className="text-white/25">
        -
      </span>
    );
  });

  return (
    <div>
      <Cabecalho
        titulo={`Relatórios · ${nomeTipo}`}
        descricao="O total financeiro do mês soma compras. Os recortes analíticos somam alocações: o mesmo gasto pode aparecer em setor, categoria e turma sem ser contado duas vezes no total."
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/relatorios?tipo=${tipo}&mes=${deslocarMes(competencia, -1)}`}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
            >
              ← mês anterior
            </Link>
            <Selo valor="rascunho" rotulo={nomeDoMes(competencia)} />
            <Link
              href={`/relatorios?tipo=${tipo}&mes=${deslocarMes(competencia, 1)}`}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
            >
              próximo mês →
            </Link>
            {podeExportar ? (
              <a
                href={`/api/exportar?tipo=${tipo}&mes=${competencia}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
              >
                baixar CSV
              </a>
            ) : null}
          </div>
        }
      />
      <Recado searchParams={params} />

      <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Painel className="p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Relatórios</h2>
            <ul className="mt-3 space-y-1">
              {TIPOS_RELATORIO.map((t) => {
                const ativo = t.tipo === tipo;
                return (
                  <li key={t.tipo}>
                    <Link
                      href={`/relatorios?tipo=${t.tipo}&mes=${competencia}`}
                      className={`block rounded-lg px-2.5 py-1.5 text-xs transition ${
                        ativo
                          ? "bg-indigo-500/15 font-medium text-indigo-100"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {t.nome}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Painel>

          <Painel className="mt-4 p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Competência</h2>
            <form method="get" action="/relatorios" className="mt-3 space-y-3">
              <input type="hidden" name="tipo" value={tipo} />
              <Campo rotulo="Mês de referência" name="mes" type="month" defaultValue={competencia} required />
              <Botao variante="secundario">gerar relatório</Botao>
            </form>
            <p className="mt-3 text-[11px] text-white/35">
              Evolução mensal e divergências da fatura atravessam todas as competências.
            </p>
          </Painel>
        </aside>

        <div className="min-w-0">
          <Painel className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-white">
                {nomeTipo} · {nomeDoMes(competencia)}
              </h2>
              <Selo
                valor={ORIGEM_TOTAL[tipo] === "compras" ? "auto" : ORIGEM_TOTAL[tipo] === "fatura" ? "manual" : "enviada"}
                rotulo={`total soma ${ROTULO_ORIGEM[ORIGEM_TOTAL[tipo]]}`}
              />
            </div>
            <p className="mt-1 text-[11px] text-white/40">{NOTA_TOTAL[tipo]}</p>
            <div className="mt-4">
              <Tabela
                vazio="Nenhum lançamento no recorte escolhido: ajuste a competência ou lance as despesas do mês."
                colunas={tabela.colunas}
                linhas={[...corpo, linhaTotal]}
              />
            </div>
            <p className="mt-3 text-[11px] text-white/35">
              {tabela.linhas.length} linha(s) · valores em reais, calculados em centavos inteiros · resultado restrito
              ao escopo do perfil {nomeDoPapel(usuario.papel)}.
            </p>
            {!podeExportar ? (
              <div className="mt-4">
                <Aviso tipo="aviso">
                  Seu perfil não tem a permissão exportar: a exportação CSV está indisponível, mas a leitura abaixo é
                  liberada.
                </Aviso>
              </div>
            ) : null}
          </Painel>

          <Painel className="mt-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-white">Resumo do mês</h2>
              <Link href={`/dashboard?mes=${competencia}`} className="text-xs text-indigo-300 hover:underline">
                abrir na visão geral →
              </Link>
            </div>
            <p className="mt-1 text-[11px] text-white/40">
              Total e quantidade vêm das compras; rateado e pendências vêm das alocações. Os dois números não devem
              ser somados entre si.
            </p>
            <div className="mt-4">
              <Grade colunas={4}>
                <Numero
                  rotulo="Total do mês (compras)"
                  valor={formatarCentavos(resumo.total_centavos)}
                  nota={`${resumo.quantidade_compras} lançamento(s)`}
                />
                <Numero
                  rotulo="Já rateado (alocações)"
                  valor={formatarCentavos(resumo.rateado_centavos)}
                  nota="distribuição entre setores e turmas"
                  tom="bom"
                />
                <Numero
                  rotulo="Não classificado"
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
            </div>
            <div className="mt-4 space-y-1 text-xs text-white/50">
              <p>
                Estornos e reembolsos registrados: {formatarCentavos(resumo.estornos_centavos)} · compras canceladas:{" "}
                {resumo.canceladas}.
              </p>
              <p>
                {resumo.fechado
                  ? `${nomeDoMes(competencia)} está fechada: os números acima estão travados até uma reabertura justificada.`
                  : `${nomeDoMes(competencia)} segue aberta para lançamento, rateio e conciliação.`}
              </p>
              <p>
                Conciliação da fatura em {dataPorExtenso(`${competencia}-01`)}:{" "}
                <Link href={`/conciliacao?mes=${competencia}`} className="text-indigo-300 hover:underline">
                  conferir itens da fatura
                </Link>
                .
              </p>
            </div>
          </Painel>
        </div>
      </div>
    </div>
  );
}
