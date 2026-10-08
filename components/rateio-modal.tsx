"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Selecao } from "./selecao";
import { INPUT } from "./ui";
import { dividirRateioIgualAction, salvarAlocacaoAction } from "@/lib/acoes/compras";

export type AlocacaoEditavel = {
  id: number;
  categoria_id: number;
  setor_id: number;
  turma_id: number | null;
  centro_custo_id: number | null;
  projeto_id: number | null;
  valor_centavos: number;
  observacao: string;
};

export type CatalogoRateio = {
  categorias: { id: number; nome: string }[];
  setores: { id: number; nome: string }[];
  turmas: { id: number; codigo: string; nome: string; coordenacao: string }[];
  centrosCusto: { id: number; nome: string; tipo: string }[];
  projetos: { id: number; nome: string }[];
};

function centavosParaEntrada(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

const ROTULO = "mb-1.5 block text-xs font-medium text-white/60";

/**
 * Rateio com um modal só: o destino (setor) numa lista e o valor da parte.
 * As demais dimensões (categoria, turma, centro de custo, projeto) continuam
 * existindo no banco, mas ficam recolhidas em "Mais opções" para não poluir.
 */
export function RateioModal({
  compraId,
  catalogo,
  categoriaPadraoId,
  exigirTurma = false,
  saldo,
  alocacao = null,
  abertoInicial = false,
  limparUrlAoFechar = false,
}: {
  compraId: number;
  catalogo: CatalogoRateio;
  categoriaPadraoId: number;
  exigirTurma?: boolean;
  saldo: number;
  alocacao?: AlocacaoEditavel | null;
  abertoInicial?: boolean;
  limparUrlAoFechar?: boolean;
}) {
  const editando = alocacao !== null;
  const [aberto, setAberto] = useState(abertoInicial);
  const [dividir, setDividir] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  function fechar() {
    setAberto(false);
    if (limparUrlAoFechar) router.replace(pathname);
  }

  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAberto(false);
      if (limparUrlAoFechar) router.replace(pathname);
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [aberto, limparUrlAoFechar, router, pathname]);

  const setores = catalogo.setores.map((s) => ({ valor: String(s.id), rotulo: s.nome }));
  const categorias = catalogo.categorias.map((c) => ({ valor: String(c.id), rotulo: c.nome }));
  const turmas = catalogo.turmas.map((t) => ({
    valor: String(t.id),
    rotulo: `${t.codigo} · ${t.nome}`,
    grupo: t.coordenacao,
  }));
  const centros = catalogo.centrosCusto.map((c) => ({ valor: String(c.id), rotulo: c.nome, grupo: c.tipo }));
  const projetos = catalogo.projetos.map((p) => ({ valor: String(p.id), rotulo: p.nome }));

  const campoTurma = exigirTurma ? (
    <Selecao
      rotulo="Turma (obrigatória para o seu perfil)"
      name="turma_id"
      required
      vazio="escolha a turma da sua coordenação"
      defaultValor={alocacao?.turma_id ? String(alocacao.turma_id) : ""}
      opcoes={turmas}
    />
  ) : null;

  return (
    <>
      {!abertoInicial ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500 px-3.5 py-2 text-sm font-medium text-white shadow-[0_0_24px_-6px] shadow-indigo-500/70 transition hover:bg-indigo-400"
        >
          <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4">
            <path d="M10 4v12M4 10h12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {editando ? "Editar alocação" : "Ratear"}
        </button>
      ) : null}

      {aberto ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-10 backdrop-blur-sm"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) fechar();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-rateio"
            className="w-full max-w-lg rounded-2xl border border-white/12 bg-[#0A2540] p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.95)]"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="titulo-rateio" className="text-base font-semibold text-white">
                  {editando ? "Editar alocação" : "Ratear a compra"}
                </h2>
                <p className="mt-0.5 text-[11px] text-white/45">
                  Escolha o destino e informe o valor desta parte. O total da compra não muda — isto só distribui o que
                  já saiu do cartão.
                </p>
              </div>
              <button
                type="button"
                onClick={fechar}
                aria-label="fechar"
                className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4">
                  <path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <form action={dividir ? dividirRateioIgualAction : salvarAlocacaoAction} className="space-y-4">
              <input type="hidden" name="compra_id" value={compraId} />
              {editando ? <input type="hidden" name="id" value={alocacao!.id} /> : null}

              <Selecao
                rotulo="Destino (setor)"
                name="setor_id"
                required
                vazio="escolha o destino"
                defaultValor={alocacao ? String(alocacao.setor_id) : ""}
                opcoes={setores}
              />

              {campoTurma}

              {dividir ? (
                <label className="block">
                  <span className={ROTULO}>Quantidade de partes iguais</span>
                  <input
                    name="partes"
                    type="number"
                    required
                    min={1}
                    defaultValue={2}
                    className={INPUT}
                  />
                  <span className="mt-1 block text-[11px] text-white/35">
                    o saldo de {centavosParaEntrada(saldo) ? `R$ ${centavosParaEntrada(saldo)}` : "R$ 0,00"} é dividido
                    em partes iguais
                  </span>
                </label>
              ) : (
                <label className="block">
                  <span className={ROTULO}>Valor desta parte</span>
                  <input
                    name="valor"
                    required
                    inputMode="decimal"
                    placeholder="1.234,56"
                    defaultValue={alocacao ? centavosParaEntrada(alocacao.valor_centavos) : undefined}
                    className={INPUT}
                  />
                  <span className="mt-1 block text-[11px] text-white/35">aceita 1.234,56, R$ 1234,56 ou 1234.56</span>
                </label>
              )}

              <details className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
                <summary className="cursor-pointer text-xs font-medium text-white/55 hover:text-white/80">
                  Mais opções (categoria, turma, centro de custo, projeto)
                </summary>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Selecao
                    rotulo="Categoria"
                    name="categoria_id"
                    defaultValor={alocacao ? String(alocacao.categoria_id) : String(categoriaPadraoId)}
                    opcoes={categorias}
                  />
                  {!exigirTurma ? (
                    <Selecao
                      rotulo="Turma (opcional)"
                      name="turma_id"
                      vazio="sem turma"
                      defaultValor={alocacao?.turma_id ? String(alocacao.turma_id) : ""}
                      opcoes={turmas}
                    />
                  ) : null}
                  <Selecao
                    rotulo="Centro de custo (opcional)"
                    name="centro_custo_id"
                    vazio="usar o centro do setor"
                    defaultValor={alocacao?.centro_custo_id ? String(alocacao.centro_custo_id) : ""}
                    opcoes={centros}
                  />
                  <Selecao
                    rotulo="Projeto (opcional)"
                    name="projeto_id"
                    vazio="sem projeto"
                    defaultValor={alocacao?.projeto_id ? String(alocacao.projeto_id) : ""}
                    opcoes={projetos}
                  />
                </div>
              </details>

              <label className="block">
                <span className={ROTULO}>Observação (opcional)</span>
                <textarea
                  name="observacao"
                  rows={2}
                  defaultValue={alocacao?.observacao || undefined}
                  placeholder="justificativa da fatia, aluno/atividade beneficiada"
                  className={INPUT}
                />
              </label>

              {editando ? (
                <label className="block">
                  <span className={ROTULO}>Motivo da correção</span>
                  <input name="motivo" placeholder="obrigatório fora do rascunho" className={INPUT} />
                </label>
              ) : null}

              {!editando ? (
                <button
                  type="button"
                  onClick={() => setDividir((d) => !d)}
                  className="text-xs text-indigo-300 hover:underline"
                >
                  {dividir ? "＋ Adicionar uma parte só" : "÷ Repartir o saldo em partes iguais"}
                </button>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-500 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
                >
                  {editando ? "Salvar alocação" : dividir ? "Repartir o saldo" : "Adicionar ao rateio"}
                </button>
                <button
                  type="button"
                  onClick={fechar}
                  className="text-xs text-white/50 transition hover:text-white"
                >
                  cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
