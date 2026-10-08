import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Area,
  Aviso,
  Barra,
  Botao,
  Campo,
  Cabecalho,
  Grade,
  Numero,
  Painel,
  Recado,
  Selo,
  Tabela,
  Valor,
} from "@/components/ui";
import { Selecao } from "@/components/selecao";
import { exigirUsuario } from "@/lib/auth";
import { fechamentoDaCompetencia, listarCompras } from "@/lib/compras";
import {
  candidatosPareamento,
  divergencias,
  listarFaturas,
  listarItens,
  obterFatura,
  situacaoFechamento,
  type ItemFatura,
} from "@/lib/conciliacao";
import {
  criarFaturaAction,
  desfazerParAction,
  fecharMesAction,
  inserirItensAction,
  pareamentoAutomaticoAction,
  parearManualAction,
  reabrirMesAction,
} from "@/lib/acoes/conciliacao";
import { dataPorExtenso, deslocarMes, nomeDoMes, normalizarMes } from "@/lib/datas";
import { formatarCentavos } from "@/lib/numerario";
import { PERMISSOES, nomeDoPapel, pode } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conciliação da fatura",
  description: "Confere os itens da fatura do cartão XP Black com as compras lançadas no sistema.",
};

type Candidato = Awaited<ReturnType<typeof candidatosPareamento>>[number];

const ROTULO_PAREAMENTO: Record<ItemFatura["pareamento"], string> = {
  nenhum: "livre",
  auto: "pareado automático",
  manual: "pareado manual",
};

const EXEMPLO_IMPORTACAO = [
  "2026-03-14;Gráfica Alfa;Impressão de provas F1;1.480,00",
  "14/03/2026|Papelaria Norte|Blocos escolares|812,50",
].join("\n");

function LinkCompra({ id, numero }: { id: number; numero?: string }) {
  return (
    <Link href={`/compras/${id}`} className="text-indigo-300 underline-offset-2 hover:underline">
      {numero ?? `compra ${id}`}
    </Link>
  );
}

function FormPar({
  item,
  candidatos,
  competencia,
}: {
  item: ItemFatura;
  candidatos: Candidato[];
  competencia: string;
}) {
  if (item.compra_id === null) {
    if (candidatos.length === 0) {
      return <span className="text-[11px] text-white/35">nenhuma compra livre na competência</span>;
    }
    return (
      <form action={parearManualAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="mes" value={competencia} />
        <input type="hidden" name="item_id" value={item.id} />
        <div className="w-64">
          <Selecao
            rotulo="Parear com a compra"
            name="compra_id"
            required
            vazio="selecione a compra"
            opcoes={candidatos.map((c) => ({
              valor: String(c.id),
              rotulo: `${c.numero} · ${c.fornecedor} · ${formatarCentavos(c.valor_centavos)} · ${dataPorExtenso(c.data)}`,
            }))}
          />
        </div>
        <div className="w-52">
          <Campo rotulo="Motivo" name="motivo" required placeholder="ex.: nota fiscal conferida" />
        </div>
        <Botao variante="secundario">parear</Botao>
      </form>
    );
  }
  return (
    <form action={desfazerParAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="mes" value={competencia} />
      <input type="hidden" name="item_id" value={item.id} />
      <div className="w-52">
        <Campo rotulo="Motivo da saída" name="motivo" required placeholder="ex.: compra errada" />
      </div>
      <Botao variante="perigo">desfazer par</Botao>
    </form>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/5 py-2 text-sm last:border-0">
      <span className="text-white/55">{rotulo}</span>
      <span className="tabular-nums text-white/90">{valor}</span>
    </div>
  );
}

export default async function ConciliacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; erro?: string; ok?: string }>;
}) {
  const usuario = await exigirUsuario();
  const params = await searchParams;
  const competencia = normalizarMes(params.mes);

  const podeGerir = pode(usuario.papel, PERMISSOES.conciliacaoGerir);
  const podeFechar = pode(usuario.papel, PERMISSOES.fechamentoGerir);
  const podeReabrir = podeFechar || pode(usuario.papel, PERMISSOES.comprasEditarFechada);

  if (!podeGerir && !podeFechar) {
    return (
      <div>
        <Cabecalho titulo="Conciliação" descricao="Confere a fatura do cartão com os lançamentos do sistema." />
        <Recado searchParams={params} />
        <Aviso tipo="erro">
          Esta rota é exclusiva de quem tem a permissão {PERMISSOES.conciliacaoGerir}. Seu perfil (
          {nomeDoPapel(usuario.papel)}) não concilia a fatura — procure a gestão financeira.
        </Aviso>
      </div>
    );
  }

  const [fatura, compras, divergencia, fechamento, fechamentos, faturasCadastradas] = await Promise.all([
    obterFatura(competencia),
    listarCompras(usuario, { competencia, limite: 500 }),
    divergencias(competencia),
    fechamentoDaCompetencia(competencia),
    situacaoFechamento(),
    listarFaturas(),
  ]);
  const itens = fatura ? await listarItens(fatura.id) : [];
  const candidatos = fatura ? await candidatosPareamento(competencia) : [];
  const comprasAtivas = compras.filter((c) => c.status !== "cancelada");
  const totalLancado = comprasAtivas.reduce((acc, c) => acc + c.valor_centavos, 0);
  const totalFatura = fatura?.total_centavos ?? 0;
  const diferenca = totalFatura - totalLancado;
  const pareados = itens.filter((i) => i.compra_id !== null).length;
  const livres = itens.length - pareados;
  const percentualPareado = itens.length > 0 ? Math.round((pareados / itens.length) * 1000) / 10 : 0;
  const { itensNaoPareados, ausentesNaFatura } = divergencia;
  const registroAtual = fechamentos.find((r) => r.competencia === competencia);
  const mesFechado = Boolean(fechamento && !fechamento.reaberto_em);
  const mesReaberto = Boolean(fechamento?.reaberto_em);
  const temDivergencia = itensNaoPareados.length > 0 || ausentesNaFatura.length > 0;

  return (
    <div>
      <Cabecalho
        titulo={`Conciliação · ${nomeDoMes(competencia)}`}
        descricao="Cada item da fatura do cartão corresponde a uma saída financeira lançada como compra. O rateio não entra aqui: ele só distribui a mesma compra entre setores, sem criar despesa nova."
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/conciliacao?mes=${deslocarMes(competencia, -1)}`}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
            >
              ← mês anterior
            </Link>
            {mesFechado ? (
              <Selo valor="aprovada" rotulo="mês fechado" />
            ) : mesReaberto ? (
              <Selo valor="enviada" rotulo="mês reaberto" />
            ) : (
              <Selo valor="rascunho" rotulo="mês aberto" />
            )}
            <Link
              href={`/conciliacao?mes=${deslocarMes(competencia, 1)}`}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
            >
              próximo mês →
            </Link>
          </div>
        }
      />
      <Recado searchParams={params} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Painel className="p-5">
          <h2 className="text-sm font-semibold text-white">Competência em conferência</h2>
          <p className="mt-0.5 text-[11px] text-white/40">
            Escolha o mês da fatura recebida do cartão. Os meses já cadastrados ficam listados embaixo.
          </p>
          <form method="get" action="/conciliacao" className="mt-4 flex flex-wrap items-end gap-3">
            <div className="w-48">
              <Campo rotulo="Competência" name="mes" type="month" defaultValue={competencia} required />
            </div>
            <Botao variante="secundario">conferir mês</Botao>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {faturasCadastradas.length === 0 ? (
              <p className="text-xs text-white/35">Nenhuma fatura cadastrada ainda.</p>
            ) : (
              faturasCadastradas.slice(0, 8).map((f) => (
                <Link
                  key={f.id}
                  href={`/conciliacao?mes=${f.competencia}`}
                  className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                    f.competencia === competencia
                      ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-100"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {nomeDoMes(f.competencia)} · {formatarCentavos(f.total_centavos)}
                </Link>
              ))
            )}
          </div>
        </Painel>

        <Painel className="p-5">
          <h2 className="text-sm font-semibold text-white">Situação do fechamento</h2>
          <p className="mt-0.5 text-[11px] text-white/40">
            Mês fechado trava qualquer escrita na competência, para todos os perfis. A saída é a reabertura
            justificada, que fica registrada na trilha de auditoria.
          </p>
          <div className="mt-4">
            {!fechamento ? (
              <p className="text-sm text-white/60">
                {nomeDoMes(competencia)} ainda não foi fechada: compras, rateio e conciliação aceitam alterações.
              </p>
            ) : (
              <>
                <Linha
                  rotulo="Estado"
                  valor={
                    mesFechado ? (
                      <Selo valor="aprovada" rotulo="competência fechada" />
                    ) : (
                      <Selo valor="enviada" rotulo="reaberta para ajuste" />
                    )
                  }
                />
                <Linha rotulo="Fechada em" valor={dataPorExtenso(fechamento.fechado_em.slice(0, 10))} />
                <Linha rotulo="Fechada por" valor={registroAtual?.fechado_por ?? "usuário do sistema"} />
                {fechamento.reaberto_em ? (
                  <Linha rotulo="Reaberta em" valor={dataPorExtenso(fechamento.reaberto_em.slice(0, 10))} />
                ) : null}
                {fechamento.motivo_reabertura ? (
                  <p className="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    Justificativa da reabertura: {fechamento.motivo_reabertura}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </Painel>
      </div>

      <div className="mt-4">
        <Grade colunas={4}>
          <Numero
            rotulo="Total da fatura do cartão"
            valor={formatarCentavos(totalFatura)}
            nota={fatura ? `${itens.length} item(ns) digitado(s)` : "fatura ainda não cadastrada"}
          />
          <Numero
            rotulo="Lançado no sistema"
            valor={formatarCentavos(totalLancado)}
            nota={`${comprasAtivas.length} compra(s) na competência`}
          />
          <Numero
            rotulo="Diferença (fatura menos sistema)"
            valor={formatarCentavos(diferenca)}
            nota={diferenca === 0 ? "os totais conferem" : "investigue antes de fechar o mês"}
            tom={diferenca === 0 ? "bom" : Math.abs(diferenca) > 5000 ? "ruim" : "alerta"}
          />
          <Numero
            rotulo="Itens pareados × livres"
            valor={`${pareados} × ${livres}`}
            nota={`${percentualPareado}% da fatura conciliada`}
            tom={itens.length > 0 && livres === 0 ? "bom" : "alerta"}
          />
        </Grade>
        <div className="mt-3">
          <Barra percentual={percentualPareado} tom={itens.length > 0 && livres === 0 ? "emerald" : "amber"} />
        </div>
      </div>

      {mesFechado ? (
        <div className="mt-4">
          <Aviso tipo="aviso">
            {nomeDoMes(competencia)} está fechada: a conciliação continua consultável, mas toda gravação será
            recusada até a reabertura com justificativa.
          </Aviso>
        </div>
      ) : null}

      <Painel className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-white">Fatura da competência</h2>
        <p className="mt-0.5 text-[11px] text-white/40">
          A XP não entrega a fatura em arquivo aproveitável, então a entrada é por digitação assistida: uma linha por
          lançamento, no formato data;fornecedor;descrição;valor.
        </p>

        {!podeGerir ? (
          <div className="mt-4">
            <Aviso tipo="aviso">
              Seu perfil não tem a permissão conciliacao.gerir: você confere os números, mas não digita a fatura nem
              pareia itens.
            </Aviso>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <form action={criarFaturaAction} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <input type="hidden" name="mes" value={competencia} />
              <h3 className="text-sm font-medium text-white">Abrir a fatura de {nomeDoMes(competencia)}</h3>
              <p className="mt-1 text-[11px] text-white/40">
                {fatura
                  ? `A fatura já existe (código ${fatura.id}); criar de novo não duplica nada.`
                  : "Cria o cabeçalho da fatura para, em seguida, importar os itens."}
              </p>
              <div className="mt-3">
                <Botao variante="secundario">criar fatura</Botao>
              </div>
            </form>

            <form action={inserirItensAction} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <input type="hidden" name="mes" value={competencia} />
              {fatura ? <input type="hidden" name="fatura_id" value={fatura.id} /> : null}
              <h3 className="text-sm font-medium text-white">Digitação assistida dos itens</h3>
              <div className="mt-3">
                <Area
                  rotulo="Itens da fatura (um por linha)"
                  name="itens"
                  rows={7}
                  placeholder={EXEMPLO_IMPORTACAO}
                />
              </div>
              <p className="mt-2 text-[11px] text-white/40">
                Exemplo: <span className="text-white/70">{EXEMPLO_IMPORTACAO.split("\n")[0]}</span>. Separador ; ou |.
                Data em AAAA-MM-DD ou DD/MM/AAAA, valor no formato 1.234,56. Linhas vazias e iniciadas por # são
                ignoradas; se qualquer linha tiver erro, nada é importado. Sem fatura no mês, esta ação cria a fatura
                antes de gravar os itens.
              </p>
              <div className="mt-3">
                <Botao>importar itens</Botao>
              </div>
            </form>
          </div>
        )}
      </Painel>

      <Painel className="mt-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <h2 className="text-sm font-semibold text-white">Itens da fatura e pareamento</h2>
            <p className="mt-0.5 text-[11px] text-white/40">
              O pareamento automático exige valor exato, fornecedor parecido e data em até 7 dias; tolerância de
              centavos só com origem e data próximas. Par manual e desfazer sempre pedem motivo.
            </p>
          </div>
          {podeGerir && fatura ? (
            <form action={pareamentoAutomaticoAction}>
              <input type="hidden" name="mes" value={competencia} />
              <input type="hidden" name="fatura_id" value={fatura.id} />
              <Botao variante="secundario">rodar pareamento automático</Botao>
            </form>
          ) : null}
        </div>

        <div className="mt-4">
          <Tabela
            vazio={
              fatura
                ? "A fatura está sem itens: use a digitação assistida acima."
                : `Nenhuma fatura cadastrada para ${nomeDoMes(competencia)}.`
            }
            colunas={["Data", "Fornecedor", "Descrição", "Valor", "Situação", "Compra", "Ação"]}
            linhas={itens.map((item) => [
              dataPorExtenso(item.data),
              item.fornecedor,
              <span key="descricao" className="text-white/60">
                {item.descricao || "-"}
              </span>,
              <Valor key="valor" centavos={item.valor_centavos} />,
              <Selo key="pareamento" valor={item.pareamento} rotulo={ROTULO_PAREAMENTO[item.pareamento]} />,
              item.compra_id ? (
                <LinkCompra key="compra" id={item.compra_id} numero={item.numero} />
              ) : (
                <span key="compra" className="text-[11px] text-white/35">
                  sem compra vinculada
                </span>
              ),
              podeGerir ? (
                <FormPar key="acao" item={item} candidatos={candidatos} competencia={competencia} />
              ) : (
                <span key="acao" className="text-[11px] text-white/35">
                  somente leitura
                </span>
              ),
            ])}
          />
        </div>
      </Painel>

      <Painel className="mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Divergências da competência</h2>
            <p className="mt-0.5 text-[11px] text-white/40">
              Os dois lados da conferência: o que a fatura tem e o sistema não, e o que o sistema tem e a fatura não
              mostrou.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Selo
              valor={itensNaoPareados.length === 0 ? "aprovada" : "contestada"}
              rotulo={`fatura sem par: ${itensNaoPareados.length}`}
            />
            <Selo
              valor={ausentesNaFatura.length === 0 ? "aprovada" : "enviada"}
              rotulo={`compras fora da fatura: ${ausentesNaFatura.length}`}
            />
          </div>
        </div>

        <h3 className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
          Itens da fatura sem lançamento no sistema
        </h3>
        <div className="mt-2">
          <Tabela
            vazio="Todo item da fatura tem uma compra correspondente no sistema."
            colunas={["Data", "Fornecedor", "Valor", "Conferência"]}
            linhas={itensNaoPareados.map((item) => [
              dataPorExtenso(item.data),
              item.fornecedor,
              <Valor key="valor" centavos={item.valor_centavos} />,
              <span key="nota" className="text-[11px] text-amber-200">
                falta lançar a compra
              </span>,
            ])}
          />
        </div>

        <h3 className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
          Compras do sistema ausentes na fatura
        </h3>
        <div className="mt-2">
          <Tabela
            vazio="Nenhuma compra ficou de fora da fatura deste mês."
            colunas={["Número", "Data", "Fornecedor", "Valor", "Conferência"]}
            linhas={ausentesNaFatura.map((c) => [
              <LinkCompra key="numero" id={c.id} numero={c.numero} />,
              dataPorExtenso(c.data),
              c.fornecedor,
              <Valor key="valor" centavos={c.valor_centavos} />,
              <span key="nota" className="text-[11px] text-white/45">
                conferir se a parcela venceu em outro mês
              </span>,
            ])}
          />
        </div>
      </Painel>

      <Painel className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-white">Fechamento da competência</h2>
        <p className="mt-0.5 text-[11px] text-white/40">
          Fechar trava {competencia}: registrar compras, editar lançamento, ratear, anexar comprovante e conciliar
          ficam bloqueados para todos os perfis, inclusive administrador. Só a reabertura justificativa libera a
          escrita, e o pedido fica na trilha de auditoria.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {podeFechar ? (
            <form action={fecharMesAction} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <input type="hidden" name="mes" value={competencia} />
              <h3 className="text-sm font-medium text-white">Fechar {nomeDoMes(competencia)}</h3>
              <p className="mt-1 text-[11px] text-white/40">
                {temDivergencia
                  ? `Há ${itensNaoPareados.length + ausentesNaFatura.length} divergência(s) aberta(s): o sistema vai exigir justificativa com ao menos 10 caracteres.`
                  : "Sem divergências abertas: o fechamento dispensa justificativa longa."}
              </p>
              <div className="mt-3">
                <Area
                  rotulo="Motivo do fechamento"
                  name="motivo"
                  rows={3}
                  placeholder="ex.: fatura do cartão conferida e paga em 10/04"
                />
              </div>
              <div className="mt-3">
                <Botao variante={mesFechado ? "secundario" : "primario"}>fechar mês</Botao>
              </div>
            </form>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <h3 className="text-sm font-medium text-white">Fechar {nomeDoMes(competencia)}</h3>
              <p className="mt-1 text-[11px] text-white/40">
                Seu perfil não tem a permissão fechamento.gerir: peça o fechamento ao gestor financeiro ou ao
                administrador.
              </p>
            </div>
          )}

          {fechamento && podeReabrir ? (
            <form action={reabrirMesAction} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <input type="hidden" name="mes" value={competencia} />
              <h3 className="text-sm font-medium text-white">Reabrir {nomeDoMes(competencia)}</h3>
              <p className="mt-1 text-[11px] text-white/40">
                {mesFechado
                  ? "Use apenas para corrigir um lançamento já conferido; a reabertura exige justificativa de 10 caracteres ou mais."
                  : "A competência já está reaberta: nova reabertura será recusada até o próximo fechamento."}
              </p>
              <div className="mt-3">
                <Area
                  rotulo="Justificativa da reabertura"
                  name="justificativa"
                  rows={3}
                  placeholder="ex.: estorno recebido depois do fechamento"
                />
              </div>
              <div className="mt-3">
                <Botao variante="perigo">reabrir mês</Botao>
              </div>
            </form>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <h3 className="text-sm font-medium text-white">Reabertura</h3>
              <p className="mt-1 text-[11px] text-white/40">
                {fechamento
                  ? "Seu perfil não reabre a competência: são aceitos fechamento.gerir ou compras.editar_fechada."
                  : `Nada para reabrir em ${nomeDoMes(competencia)}: o mês está aberto.`}
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-white/45">
          <Link
            href={`/relatorios?mes=${competencia}`}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10"
          >
            relatórios de {nomeDoMes(competencia)}
          </Link>
          <Link
            href={`/compras?mes=${competencia}`}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10"
          >
            compras do mês
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10"
          >
            visão geral
          </Link>
        </div>
      </Painel>

      {fechamentos.length > 0 ? (
        <Painel className="mt-6 p-5">
          <h2 className="text-sm font-semibold text-white">Histórico de fechamentos</h2>
          <p className="mt-0.5 text-[11px] text-white/40">Competências travadas e reaberturas registradas.</p>
          <div className="mt-4">
            <Tabela
              colunas={["Competência", "Fechada em", "Fechada por", "Reabertura"]}
              linhas={fechamentos.slice(0, 8).map((r) => [
                nomeDoMes(r.competencia),
                dataPorExtenso(r.fechado_em.slice(0, 10)),
                r.fechado_por,
                r.reaberto_em
                  ? `${dataPorExtenso(r.reaberto_em.slice(0, 10))} · ${r.motivo_reabertura || "sem justificativa"}`
                  : "fechada",
              ])}
            />
          </div>
        </Painel>
      ) : null}
    </div>
  );
}
