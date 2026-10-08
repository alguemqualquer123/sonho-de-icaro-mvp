"use client";

import { useEffect, useId, useRef, useState } from "react";

export type Opcao = { valor: string; rotulo: string; grupo?: string };

const GATILHO =
  "flex w-full items-center justify-between gap-2 rounded-lg border border-white/15 bg-[#0B2140] px-3.5 py-2.5 text-left text-sm text-white/90 transition hover:border-white/30 focus:outline-none focus-visible:border-indigo-300/70 focus-visible:ring-2 focus-visible:ring-indigo-400/25 aria-[expanded=true]:border-indigo-300/70";

const PAINEL =
  "absolute left-0 right-0 z-40 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-white/15 bg-[#081C36] p-1 shadow-[0_20px_44px_-16px_rgba(0,0,0,0.9)]";

const OPCAO = "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm leading-snug text-white/75";

/**
 * Substituto de <select> feito com div: o nativo pinta a lista com as cores do
 * sistema, e no tema escuro isso deixava opção branca sobre fundo branco.
 */
export function Selecao({
  rotulo,
  name,
  opcoes,
  defaultValor,
  vazio,
  required,
}: {
  rotulo: string;
  name: string;
  opcoes: Opcao[];
  defaultValor?: string;
  vazio?: string;
  required?: boolean;
}) {
  const lista = useId();
  const todas: Opcao[] = vazio ? [{ valor: "", rotulo: vazio }, ...opcoes] : opcoes;
  const inicial = Math.max(
    0,
    todas.findIndex((o) => o.valor === (defaultValor ?? "")),
  );

  const [valor, setValor] = useState(defaultValor ?? "");
  const [aberto, setAberto] = useState(false);
  const [ativa, setAtiva] = useState(inicial);
  const raiz = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);

  const escolhida = todas.find((o) => o.valor === valor);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("pointerdown", fora, true);
    return () => document.removeEventListener("pointerdown", fora, true);
  }, [aberto]);

  useEffect(() => {
    if (aberto) document.getElementById(`${lista}-o${ativa}`)?.scrollIntoView({ block: "nearest" });
  }, [aberto, ativa, lista]);

  function escolher(i: number) {
    const opcao = todas[i];
    if (!opcao) return;
    setValor(opcao.valor);
    setAtiva(i);
    setAberto(false);
    gatilho.current?.focus();
  }

  function teclado(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "Escape") {
      setAberto(false);
      return;
    }
    if (!aberto) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setAberto(true);
      }
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setAtiva(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setAtiva(todas.length - 1);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const passo = e.key === "ArrowDown" ? 1 : -1;
      setAtiva((i) => (i + passo + todas.length) % todas.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      escolher(ativa);
    }
  }

  return (
    <div ref={raiz} className="relative">
      <input type="hidden" name={name} value={valor} />
      <span className="mb-1.5 block text-xs font-medium text-white/60">{rotulo}</span>
      <button
        ref={gatilho}
        type="button"
        className={GATILHO}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={lista}
        aria-required={required}
        onClick={() => setAberto((a) => !a)}
        onKeyDown={teclado}
      >
        <span className={escolhida ? "" : "text-white/40"}>{escolhida?.rotulo ?? (vazio ?? "Escolha…")}</span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden
          className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${aberto ? "rotate-180" : ""}`}
        >
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {aberto ? (
        <ul id={lista} role="listbox" aria-label={rotulo} className={PAINEL}>
          {todas.map((o, i) => (
            <li key={`${o.valor}-${i}`}>
              {o.grupo && o.grupo !== todas[i - 1]?.grupo ? (
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-white/35">
                  {o.grupo}
                </p>
              ) : null}
              <div
                id={`${lista}-o${i}`}
                role="option"
                aria-selected={o.valor === valor}
                onMouseEnter={() => setAtiva(i)}
                onClick={() => escolher(i)}
                className={`${OPCAO} ${ativa === i ? "bg-white/10 text-white" : ""} ${
                  o.valor === valor ? "text-indigo-200" : ""
                }`}
              >
                <span>{o.rotulo}</span>
                {o.valor === valor ? (
                  <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 shrink-0 text-indigo-300">
                    <path d="M4 10.5l3.5 3.5L16 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
