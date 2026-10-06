import type { Metadata } from "next";
import Link from "next/link";
import {
  Area,
  Aviso,
  Barra,
  Botao,
  Campo,
  Cabecalho,
  Grade,
  INPUT,
  Numero,
  Painel,
  Recado,
  Selo,
  Tabela,
  Valor,
  Vazio,
} from "@/components/ui";
import { Selecao } from "@/components/selecao";
import { exigirUsuario } from "@/lib/auth";
import { fechamentoDaCompetencia, verCompra, type Alocacao } from "@/lib/compras";
import { opcoesCatalogos } from "@/lib/cadastros";
import { PERMISSOES, nomeDoPapel, pode } from "@/lib/rbac";
import { banco } from "@/lib/db";
import { formatarCentavos } from "@/lib/numerario";
import { dataPorExtenso } from "@/lib/datas";
import { mensagemDe } from "@/lib/regras";
import {
  compensarAction,
  dividirRateioIgualAction,
  editarCompraAction,
  excluirAlocacaoAction,
  marcarLegibilidadeAction,
  removerAnexoAction,
  revisarAction,
  salvarAlocacaoAction,
  cancelarCompraAction,
  uploadAnexoAction,
} from "@/lib/acoes/compras";

export const metadata: Metadata = { title: "Compra" };
export const dynamic = "force-dynamic";

type EventoFin = {
  id: number;
  tipo: string;
  valor_centavos: number;
  motivo: string;
  criado_em: string;
  criado_por_nome: string;
};

type TrilhaLinha = {
  id: number;
  entidade: string;
  entidade_id: string;
  acao: string;
  usuario_nome: string;
  motivo: string;
  criado_em: string;
  antes: string | null;
  depois: string | null;
};

function dataHora(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatarBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${bytes} B`;
}

function valorDaTrilha(linha: TrilhaLinha): string {
  for (const bruto of [linha.depois, linha.antes]) {
    if (!bruto) continue;
    try {
      const obj = JSON.parse(bruto) as { valor_centavos?: unknown };
      if (typeof obj.valor_centavos === "number") return formatarCentavos(obj.valor_centavos);
    } catch {
      // registro antigo fora do formato JSON: simplesmente não exibe valor
    }
  }
  return "";
}

function FormularioAlocacao({
  compraId,
  alocacao,
  voltarPara,
  catalogos,
}: {
  compraId: number;
  alocacao: Alocacao | null;
  voltarPara: string;
  catalogos: Awaited<ReturnType<typeof opcoesCatalogos>>;
}) {
  const editando = alocacao !== null;
  return (
    <form action={salvarAlocacaoAction} className="space-y-4">
      <input type="hidden" name="compra_id" value={compraId} />
      {editando ? <input type="hidden" name="id" value={alocacao!.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Selecao
          rotulo="Categoria"
          name="categoria_id"
          required
          defaultValor={alocacao ? String(alocacao.categoria_id) : undefined}
          opcoes={catalogos.categorias.map((c: any) => ({ valor: String(c.id), rotulo: String(c.nome) }))}
        />
        <Selecao
          rotulo="Setor"
          name="setor_id"
          required
          defaultValor={alocacao ? String(alocacao.setor_id) : undefined}
          opcoes={catalogos.setores.map((s: any) => ({ valor: String(s.id), rotulo: String(s.nome) }))}
        />
        <Selecao
          rotulo="Turma (opcional)"
          name="turma_id"
          vazio="sem turma vinculada"
          defaultValor={alocacao?.turma_id ? String(alocacao.turma_id) : ""}
          opcoes={catalogos.turmas.map((t: any) => ({
            valor: String(t.id),
            rotulo: `${t.codigo} · ${t.nome}`,
            grupo: t.coordenacao,
          }))}
        />
        <Selecao
          rotulo="Centro de custo (opcional)"
          name="centro_custo_id"
          vazio="usar o centro do setor"
          defaultValor={alocacao?.centro_custo_id ? String(alocacao.centro_custo_id) : ""}
          opcoes={catalogos.centrosCusto.map((c: any) => ({ valor: String(c.id), rotulo: String(c.nome), grupo: c.tipo }))}
        />
        <Selecao
          rotulo="Projeto (opcional)"
          name="projeto_id"
          vazio="sem projeto"
          defaultValor={alocacao?.projeto_id ? String(alocacao.projeto_id) : ""}
          opcoes={catalogos.projetos.map((p: any) => ({ valor: String(p.id), rotulo: String(p.nome) }))}
        />
        <Campo
          rotulo="Valor desta parte"
          name="valor"
          required
          placeholder="1.234,56"
          defaultValue={alocacao ? apenasCentavosDecimais(alocacao.valor_centavos) : undefined}
          hint="parte do valor JÁ LANÇADO; somar alocações não aumenta o total da compra"
        />
      </div>
      <Area rotulo="Observação" name="observacao" rows={2} defaultValue={alocacao?.observacao || undefined} placeholder="justificativa da fatia, aluno/atividade beneficiada" />
      {editando ? (
        <Campo rotulo="Motivo da correção" name="motivo" placeholder="obrigatório fora do rascunho" />
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Botao>{editando ? "Salvar alocação" : "Adicionar alocação"}</Botao>
        {editando ? (
          <Link href={voltarPara} className="text-xs text-white/50 hover:text-white">
            cancelar edição
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function apenasCentavosDecimais(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

export default async function CompraDetalhe({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ alocacao?: string; editar?: string; erro?: string; ok?: string }>;
}) {
  const usuario = await exigirUsuario();
  const [{ id: idBruto }, query] = await Promise.all([params, searchParams]);
  const compraId = Number(idBruto);

  if (!Number.isInteger(compraId) || compraId <= 0) {
    return (
      <div>
        <Cabecalho titulo="Compra indisponível" />
        <Aviso tipo="erro">identificador de compra inválido.</Aviso>
      </div>
    );
  }

  let dados: Awaited<ReturnType<typeof verCompra>>;
  try {
    dados = await verCompra(compraId, usuario);
  } catch (erro) {
    return (
      <div>
        <Cabecalho titulo="Compra indisponível" />
        <Aviso tipo="erro">{mensagemDe(erro)}</Aviso>
      </div>
    );
  }
  const { compra, alocacoes, anexos } = dados;
  const eventos = dados.eventos as EventoFin[];

  const papel = usuario.papel;
  const ehResponsavel = compra.responsavel_id === usuario.id;
  const podeEditarEsta = pode(papel, PERMISSOES.comprasEditar) || (ehResponsavel && pode(papel, PERMISSOES.comprasEditarProprias));
  const podeRatear = pode(papel, PERMISSOES.alocacoesEditar) || pode(papel, PERMISSOES.alocacoesEditarCoord);
  const podeGerirAnexos = pode(papel, PERMISSOES.anexosGerir);
  const podeCancelar = pode(papel, PERMISSOES.comprasCancelar);
  const podeRevisar = pode(papel, PERMISSOES.revisaoGerir);

  const fechamento = await fechamentoDaCompetencia(compra.competencia);
  const mesFechado = Boolean(fechamento && !fechamento.reaberto_em);
  const compraCancelada = compra.status === "cancelada";
  const aprovadaTravada = compra.status === "aprovada" && !podeRevisar;
  const tudoTravado = mesFechado || compraCancelada || aprovadaTravada;

  const rateado = compra.rateado_centavos ?? 0;
  const saldo = compra.saldo_centavos ?? 0;
  const percentual = compra.valor_centavos > 0 ? Math.round((rateado / compra.valor_centavos) * 1000) / 10 : 0;

  const catalogos = await opcoesCatalogos();
  const ccNome = new Map(catalogos.centrosCusto.map((c: any) => [c.id, c.nome]));
  const projetoNome = new Map(catalogos.projetos.map((p: any) => [p.id, p.nome]));

  const alocacaoEditando = query.alocacao
    ? alocacoes.find((a) => a.id === Number(query.alocacao)) ?? null
    : null;

  // A trilha por compra não tem função pronta em lib/auditoria.ts filtrando por
  // entidade composta; a consulta abaixo é feita direto no banco (aceito aqui).
  const trilha = await banco().all<TrilhaLinha>(
    `SELECT id, entidade, entidade_id, acao, usuario_nome, motivo, criado_em, antes, depois
       FROM trilha_auditoria
      WHERE (entidade = 'compra' AND entidade_id = ?)
         OR (entidade IN ('alocacao', 'anexo') AND
             (COALESCE(
                (CASE WHEN depois IS NOT NULL THEN (depois::jsonb ->> 'compra_id') ELSE NULL END),
                (CASE WHEN antes IS NOT NULL THEN (antes::jsonb ->> 'compra_id') ELSE NULL END)
              ) = ?
              OR (entidade = 'anexo' AND entidade_id IN (SELECT CAST(id AS TEXT) FROM anexos WHERE compra_id = ?))))
      ORDER BY id DESC LIMIT 80`,
    [String(compra.id), String(compra.id), compra.id],
  );

  const linkVoltar = <Link href="/compras" className="text-xs text-indigo-300 hover:underline">← voltar para compras</Link>;

  return (
    <div>
      <Cabecalho
        titulo={compra.numero}
        descricao={`${compra.fornecedor} · ${dataPorExtenso(compra.data)} · responsável ${compra.responsavel_nome ?? compra.id} · ${compra.parcelas_total === 1 ? "à vista" : `1/${compra.parcelas_total} parcela (saída única deste mês)`} · perfil atual: ${nomeDoPapel(papel)}`}
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <Selo valor={compra.status} />
            {mesFechado ? <Selo valor="aprovada" rotulo="mês fechado" /> : null}
            {linkVoltar}
          </div>
        }
      />
      <Recado searchParams={query} />

      {compra.motivo_cancelamento ? <Aviso tipo="aviso">cancelamento registrado: {compra.motivo_cancelamento}</Aviso> : null}
      {compra.status === "contestada" ? <Aviso tipo="erro">compra contestada na conferência; ajuste o apontado e reenvie.</Aviso> : null}
      {aprovadaTravada ? (
        <Aviso tipo="aviso">compra aprovada fica travada para edição: correções entram como estorno/reembolso/cancelamento, nunca apagamento. Só a gestão de revisão reabre a edição.</Aviso>
      ) : null}
      {mesFechado ? (
        <Aviso tipo="aviso">a competência {compra.competencia} está fechada; nenhuma escrita é aceita até uma reabertura justificada.</Aviso>
      ) : null}

      <Grade colunas={3}>
        <Numero rotulo="Total da compra (saída única)" valor={formatarCentavos(compra.valor_centavos)} nota={compra.descricao || "sem descrição"} />
        <Numero rotulo="Rateado" valor={formatarCentavos(rateado)} nota={`${percentual}% do total distribuído`} tom="bom" />
        <Numero
          rotulo="Saldo a classificar"
          valor={formatarCentavos(saldo)}
          nota={saldo === 0 ? "rateio completo: pronto para enviar à conferência" : "ainda não distribuído entre setor/categoria/turma"}
          tom={saldo > 0 ? "alerta" : "bom"}
        />
      </Grade>

      {!podeEditarEsta && !podeRatear && !podeGerirAnexos && !podeCancelar && !podeRevisar ? (
        <p className="mt-3 text-xs text-white/45">seu perfil não pode alterar esta compra — as telas abaixo estão somente para leitura.</p>
      ) : null}

      {/* ------------------------------------------------ RATEIO ---------- */}
      <Painel className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-white">Rateio desta compra</h2>
        <p className="mt-0.5 text-[11px] text-white/45">
          O rateio distribui o valor já lançado entre setor, categoria, turma e centro de custo. Ele NUNCA aumenta o
          total da compra: a soma das alocações fica sempre ≤ {formatarCentavos(compra.valor_centavos)}.
        </p>
        <div className="mt-3 max-w-xl">
          <Barra percentual={percentual} tom={saldo === 0 ? "emerald" : "amber"} />
          <p className="mt-1 text-xs text-white/50">
            {percentual}% rateado · saldo a classificar:{" "}
            <span className={saldo > 0 ? "font-semibold text-amber-200" : "text-emerald-200"}>{formatarCentavos(saldo)}</span>
          </p>
        </div>

        <div className="mt-4">
          <Tabela
            colunas={["Categoria", "Setor", "Turma / coordenação", "Centro de custo", "Projeto", "Valor", "Observação", "Ações"]}
            vazio="Nenhuma alocação lançada: o valor inteiro está como saldo a classificar."
            linhas={alocacoes.map((a) => [
              <span key="c">{a.categoria_nome}</span>,
              <span key="s">{a.setor_nome}</span>,
              <span key="t">
                {a.turma_nome ?? "—"}
                {a.coordenacao_codigo ? <span className="ml-1 text-[11px] text-white/40">({a.coordenacao_codigo})</span> : null}
              </span>,
              <span key="cc">{(a.centro_custo_id ? ccNome.get(a.centro_custo_id) : null) ?? "—"}</span>,
              <span key="pj">{(a.projeto_id ? projetoNome.get(a.projeto_id) : null) ?? "—"}</span>,
              <span key="v" className="whitespace-nowrap tabular-nums text-white">
                <Valor centavos={a.valor_centavos} negativoPermitido={false} />
              </span>,
              <span key="o" className="max-w-[200px] text-xs text-white/50">
                {a.observacao || "—"}
              </span>,
              <div key="x" className="flex flex-wrap items-center gap-1.5">
                {podeRatear && !tudoTravado ? (
                  <>
                    <Link href={`/compras/${compra.id}?alocacao=${a.id}`} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70 hover:bg-white/10">
                      editar
                    </Link>
                    <form action={excluirAlocacaoAction} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="compra_id" value={compra.id} />
                      <input name="motivo" required minLength={5} placeholder="motivo" className="w-28 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white outline-none placeholder:text-white/30" />
                      <Botao variante="perigo">excluir</Botao>
                    </form>
                  </>
                ) : (
                  <span className="text-[11px] text-white/35">{a.id}</span>
                )}
              </div>,
            ])}
          />
          <p className="mt-2 text-xs text-white/55">
            Total do rateio: <span className="tabular-nums font-semibold text-white">{formatarCentavos(rateado)}</span> — a
            soma das alocações confere com o que saiu do cartão; ela não é uma despesa nova.
          </p>
        </div>

        {podeRatear && !tudoTravado ? (
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <div className={`${alocacaoEditando ? "rounded-xl border border-indigo-400/40 bg-indigo-500/10 p-4" : "rounded-xl border border-white/10 bg-white/[0.02] p-4"}`}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/55">
                {alocacaoEditando ? `Editando alocação ${alocacaoEditando.id}` : "Nova alocação"}
              </h3>
              <FormularioAlocacao compraId={compra.id} alocacao={alocacaoEditando} voltarPara={`/compras/${compra.id}`} catalogos={catalogos} />
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/55">Repartir o saldo igualmente</h3>
              <p className="mb-3 text-[11px] text-white/45">
                Cria N alocações de mesmo valor somando exatamente o saldo restante ({formatarCentavos(saldo)}) — útil
                quando a despesa se divide entre várias turmas ou unidades. Se o rateio já estiver completo, não há
                saldo a repartir.
              </p>
              <form action={dividirRateioIgualAction} className="space-y-4">
                <input type="hidden" name="compra_id" value={compra.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Selecao
                    rotulo="Categoria comum"
                    name="categoria_id"
                    required
opcoes={catalogos.categorias.map((c: any) => ({ valor: String(c.id), rotulo: String(c.nome) }))}
                  />
                  <Selecao
                    rotulo="Setor comum"
                    name="setor_id"
                    required
                    opcoes={catalogos.setores.map((s: any) => ({ valor: String(s.id), rotulo: String(s.nome) }))}
                  />
                  <Campo rotulo="Quantidade de partes" name="partes" type="number" required min={1} placeholder="3" hint="o saldo é dividido em partes iguais (centavos sobram para as primeiras)" />
                  <Selecao
                    rotulo="Turma (opcional)"
                    name="turma_id"
                    vazio="sem turma"
                    opcoes={catalogos.turmas.map((t: any) => ({ valor: String(t.id), rotulo: `${t.codigo} · ${t.nome}`, grupo: t.coordenacao }))}
                  />
                </div>
                <Botao variante="secundario">Repartir o saldo igualmente</Botao>
              </form>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-xs text-white/45">
            {tudoTravado ? "Escrita bloqueada (mês fechado, compra cancelada ou aprovada travada)." : "seu perfil não pode alterar o rateio desta compra."}
          </p>
        )}
      </Painel>

      {/* ------------------------------------------- COMPROVANTES ------- */}
      <Painel className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-white">Comprovantes</h2>
        <p className="mt-0.5 text-[11px] text-white/45">Imagens (jpg, png, webp, heic) ou PDF do comprovante do cartão, até 10 MB.</p>

        {(podeGerirAnexos || ehResponsavel) && !tudoTravado ? (
          <form action={uploadAnexoAction} encType="multipart/form-data" className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="compra_id" value={compra.id} />
            <label className="block min-w-56 flex-1">
              <span className="mb-1.5 block text-xs font-medium text-white/60">Arquivo do comprovante</span>
              <input
                type="file"
                name="arquivo"
                required
                accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                className="block w-full text-sm text-white/70 file:mr-3 file:rounded-xl file:border-0 file:bg-indigo-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-400"
              />
            </label>
            <Botao>Anexar comprovante</Botao>
          </form>
        ) : (
          <p className="mt-3 text-xs text-white/45">seu perfil não pode alterar os comprovantes desta compra.</p>
        )}

        <div className="mt-4">
          <Tabela
            colunas={["Arquivo", "Tamanho", "Enviado em", "Legibilidade", "Ações"]}
            vazio="Nenhum comprovante anexado. Sem ele a conferência costuma contestar."
            linhas={anexos.map((x) => [
              <a key="n" href={`/api/anexos/${x.id}`} className="break-all font-medium text-indigo-300 hover:underline">
                {x.nome_arquivo}
              </a>,
              <span key="t">{formatarBytes(x.tamanho_bytes)}</span>,
              <span key="d" className="whitespace-nowrap text-xs text-white/60">{dataHora(x.criado_em)}</span>,
              <span key="l">
                {x.legivel === null ? <Selo valor="nenhum" rotulo="sem avaliação" /> : x.legivel === 1 ? <Selo valor="ativo" rotulo="legível" /> : <Selo valor="inativo" rotulo="ilegível" />}
              </span>,
              <div key="x" className="flex flex-wrap items-center gap-2">
                {podeGerirAnexos && !tudoTravado ? (
                  <>
                    <form action={marcarLegibilidadeAction} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={x.id} />
                      <input type="hidden" name="compra_id" value={compra.id} />
                      <input name="motivo" required minLength={5} placeholder="motivo" className="w-28 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white outline-none placeholder:text-white/30" />
                      <Botao variante="secundario" name="legivel" value="1">Legível</Botao>
                      <Botao variante="perigo" name="legivel" value="0">Ilegível</Botao>
                    </form>
                    <form action={removerAnexoAction} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={x.id} />
                      <input type="hidden" name="compra_id" value={compra.id} />
                      <input name="motivo" required minLength={5} placeholder="motivo da remoção" className="w-32 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white outline-none placeholder:text-white/30" />
                      <Botao variante="fantasma">Remover</Botao>
                    </form>
                  </>
                ) : (
                  <span className="text-[11px] text-white/35">{"—"}</span>
                )}
              </div>,
            ])}
          />
        </div>
      </Painel>

      {/* ------------------------------------------------- REVISÃO -------- */}
      <Painel className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-white">Revisão</h2>
        <p className="mt-0.5 text-[11px] text-white/45">
          Fluxo: rascunho → enviada → aprovada (ou contestada). Compra aprovada fica travada: correções viram
          estorno/reembolso/cancelamento como eventos novos, nunca edição que apaga o registro.
        </p>

        <div className="mt-4 flex flex-wrap items-start gap-4">
          {podeEditarEsta && !mesFechado && (compra.status === "rascunho" || compra.status === "contestada") ? (
            <form action={revisarAction} className="flex flex-col gap-2">
              <input type="hidden" name="compra_id" value={compra.id} />
              <input type="hidden" name="acao" value="enviar-conferencia" />
              <Botao>Enviar para conferência</Botao>
              {saldo !== 0 ? (
                <p className="max-w-xs text-[11px] text-amber-200">
                  {saldo > 0
                    ? `o envio só libera quando fechar o rateio: faltam ${formatarCentavos(saldo)} a classificar.`
                    : `atenção: o rateio excede o total em ${formatarCentavos(-saldo)}; ajuste as alocações antes de enviar.`}
                </p>
              ) : null}
            </form>
          ) : null}

          {podeRevisar && !mesFechado && compra.status === "enviada" ? (
            <>
              <form action={revisarAction} className="flex flex-col gap-2">
                <input type="hidden" name="compra_id" value={compra.id} />
                <input type="hidden" name="acao" value="aprovar" />
                <Botao>Aprovar compra</Botao>
                <p className="max-w-xs text-[11px] text-white/40">aprovar trava a compra para o responsável e para lançadores.</p>
              </form>
              <form action={revisarAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="compra_id" value={compra.id} />
                <input type="hidden" name="acao" value="contestar" />
                <input name="motivo" required minLength={5} placeholder="motivo da contestação" className={`${INPUT} w-56`} />
                <Botao variante="perigo">Contestar</Botao>
              </form>
            </>
          ) : null}

          {compra.status === "aprovada" && !podeRevisar ? (
            <Vazio>compra aprovada — a gestão de revisão é quem aprova, contesta ou reabre a edição.</Vazio>
          ) : null}
          {compra.status === "enviada" && !podeRevisar ? <p className="text-xs text-white/45">aguardando a gestão de revisão aprovar ou contestar.</p> : null}
        </div>
      </Painel>

      {/* ------------------------------------------------ CORREÇÕES ------- */}
      <Painel className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-white">Correções</h2>
        <p className="mt-0.5 text-[11px] text-white/45">
          Nada é apagado: cancelamento, estorno e reembolso entram como eventos novos ligados a esta compra.
        </p>

        {podeEditarEsta && !tudoTravado ? (
          <div className="mt-3">
            {query.editar ? (
              <form action={editarCompraAction} className="space-y-4 rounded-xl border border-indigo-400/40 bg-indigo-500/10 p-4">
                <input type="hidden" name="id" value={compra.id} />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Campo rotulo="Data" name="data" type="date" defaultValue={compra.data} />
                  <Campo rotulo="Fornecedor" name="fornecedor" defaultValue={compra.fornecedor} />
                  <Campo rotulo="Descrição" name="descricao" defaultValue={compra.descricao} />
                  <Campo rotulo="Novo valor (deixe vazio para manter)" name="valor" placeholder={apenasCentavosDecimais(compra.valor_centavos)} />
                  <Campo rotulo="Parcelas (vazio mantém)" name="parcelas_total" type="number" min={1} />
                  <Selecao
                    rotulo="Setor"
                    name="setor_id"
                    vazio="sem setor"
                    defaultValor={compra.setor_id ? String(compra.setor_id) : ""}
                    opcoes={catalogos.setores.map((s: any) => ({ valor: String(s.id), rotulo: String(s.nome) }))}
                  />
                </div>
                <Area rotulo="Observação" name="observacao" rows={2} defaultValue={compra.observacao || undefined} />
                <Campo rotulo="Motivo da correção" name="motivo" required={compra.status !== "rascunho"} placeholder="obrigatório fora do rascunho" />
                <Botao>Salvar dados da compra</Botao>
              </form>
            ) : (
              <Link href={`/compras/${compra.id}?editar=1`} className="text-xs text-indigo-300 hover:underline">
                corrigir dados da compra (data, fornecedor, valor…)
              </Link>
            )}
          </div>
        ) : null}

        {pode(papel, PERMISSOES.comprasEditar) && !mesFechado && !compraCancelada ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <form action={compensarAction} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <input type="hidden" name="compra_id" value={compra.id} />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/55">Estorno / reembolso</h3>
              <Campo rotulo="Valor do evento" name="valor" required placeholder="1.234,56" hint="ex.: devolução parcial da loja ou reembolso interno" />
              <Area rotulo="Motivo" name="motivo" rows={2} placeholder="o que ocorreu, nota/cupom associado" />
              <div className="flex gap-2">
                <Botao variante="secundario" name="tipo" value="estorno">Registrar estorno</Botao>
                <Botao variante="secundario" name="tipo" value="reembolso">Registrar reembolso</Botao>
              </div>
            </form>

            {podeCancelar ? (
              <form action={cancelarCompraAction} className="space-y-3 rounded-xl border border-rose-400/25 bg-rose-500/[0.05] p-4">
                <input type="hidden" name="id" value={compra.id} />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-200">Cancelar a compra</h3>
                <p className="text-[11px] text-white/50">
                  O cancelamento não apaga o lançamento: registra um evento corretor do valor total e marca a compra
                  como cancelada.
                </p>
                <Area rotulo="Motivo do cancelamento" name="motivo" rows={2} placeholder="ex.: compra desfeita na loja no mesmo dia" />
                <Botao variante="perigo">Cancelar compra</Botao>
              </form>
            ) : null}
          </div>
        ) : null}

        {eventos.length > 0 ? (
          <div className="mt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/55">Eventos financeiros desta compra</h3>
            <Tabela
              colunas={["Tipo", "Valor do evento", "Motivo", "Registrado por", "Data"]}
              linhas={eventos.map((e) => [
                <span key="t">{e.tipo}</span>,
                <span key="v" className="whitespace-nowrap tabular-nums"><Valor centavos={e.valor_centavos} /></span>,
                <span key="m" className="text-xs text-white/60">{e.motivo || "—"}</span>,
                <span key="p" className="text-xs text-white/60">{e.criado_por_nome}</span>,
                <span key="d" className="whitespace-nowrap text-xs text-white/60">{dataHora(e.criado_em)}</span>,
              ])}
            />
          </div>
        ) : null}
      </Painel>

      {/* ------------------------------------------------- TRILHA --------- */}
      <Painel className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-white">Trilha desta compra</h2>
        <p className="mt-0.5 text-[11px] text-white/45">Compra, alocações e anexos: histórico apêndice-only de quem fez o quê.</p>
        <div className="mt-4">
          <Tabela
            colunas={["Quando", "Ator", "Origem", "Ação", "Valor envolvido", "Motivo"]}
            vazio="Sem registros de auditoria para esta compra."
            linhas={trilha.map((t) => [
              <span key="q" className="whitespace-nowrap text-xs text-white/60">{dataHora(t.criado_em)}</span>,
              <span key="a" className="text-xs text-white/75">{t.usuario_nome || "sistema"}</span>,
              <span key="e" className="text-[11px] uppercase tracking-wide text-white/40">{t.entidade} #{t.entidade_id}</span>,
              <span key="c" className="font-medium text-white/85">{t.acao}</span>,
              <span key="v" className="whitespace-nowrap tabular-nums text-xs">{valorDaTrilha(t) || "—"}</span>,
              <span key="m" className="max-w-[260px] text-xs text-white/50">{t.motivo || "—"}</span>,
            ])}
          />
        </div>
      </Painel>

      <p className="mt-4 text-[11px] text-white/35">
        Anexos desta compra: {anexos.length} · alocações: {alocacoes.length} · competência {compra.competencia} ·{" "}
        {compra.observacao ? `observação: ${compra.observacao}` : "sem observação interna"}
      </p>
    </div>
  );
}
