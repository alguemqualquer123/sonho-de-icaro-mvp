"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type Opcao = { valor: string; rotulo: string; grupo?: string };

type Item = { key: string; valor: string; rotulo: string; grupo?: string; vazio?: boolean };

// Dropdown 100% em div (nada de <select> nativo): a lista suspensa do navegador
// herdava fundo claro/transparente do SO. Aqui o painel é sólido (zinc-950)
// no tema escuro do site. O valor vai ao form via <input type="hidden">,
// então funciona com server actions sem mudar nenhuma chamada.
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
  const inicial = defaultValor ?? (vazio || opcoes.length === 0 ? "" : opcoes[0].valor);
  const [valor, setValor] = useState(inicial);
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [destaque, setDestaque] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);
  const campoBusca = useRef<HTMLInputElement>(null);

  const selecionada = opcoes.find((o) => o.valor === valor);
  const textoBotao = selecionada
    ? `${selecionada.grupo ? `${selecionada.grupo} · ` : ""}${selecionada.rotulo}`
    : (vazio ?? "Selecione…");

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return opcoes;
    return opcoes.filter(
      (o) => o.rotulo.toLowerCase().includes(q) || (o.grupo ?? "").toLowerCase().includes(q),
    );
  }, [busca, opcoes]);

  const itens: Item[] = useMemo(() => {
    const lista: Item[] = vazio ? [{ key: "__vazio", valor: "", rotulo: vazio, vazio: true }] : [];
    for (const o of filtradas) lista.push({ key: o.valor, valor: o.valor, rotulo: o.rotulo, grupo: o.grupo });
    return lista;
  }, [filtradas, vazio]);

  // Seções com cabeçalho de grupo (só mostra o cabeçalho quando o grupo muda).
  const secoes: { cabecalho?: string; item: Item }[] = useMemo(() => {
    let anterior: string | undefined;
    return itens.map((item) => {
      const cabecalho = item.grupo !== anterior ? item.grupo : undefined;
      anterior = item.grupo;
      return { cabecalho, item };
    });
  }, [itens]);

  const comBusca = opcoes.length > 6;

  useEffect(() => {
    if (!aberto) return;
    setBusca("");
    setDestaque(0);
    const aoClicarFora = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  useEffect(() => {
    if (aberto && comBusca) campoBusca.current?.focus();
  }, [aberto, comBusca]);

  const escolher = (v: string) => {
    setValor(v);
    setAberto(false);
  };

  const aoTeclar = (e: React.KeyboardEvent) => {
    if (!aberto) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setAberto(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setAberto(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setDestaque((d) => (d + 1) % Math.max(itens.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDestaque((d) => (d - 1 + Math.max(itens.length, 1)) % Math.max(itens.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const alvo = itens[destaque];
      if (alvo) escolher(alvo.valor);
    }
  };

  return (
    <div ref={raiz} className="block">
      <span className="mb-1.5 block text-xs font-medium text-white/60">{rotulo}</span>
      <div className="relative" onKeyDown={aoTeclar}>
        <input type="hidden" name={name} value={valor} />
        {/* Validação nativa do required: input escondido mas renderizado
            (1px, sem pointer) participa da validação do form; o hidden não. */}
        {required ? (
          <input
            aria-hidden
            tabIndex={-1}
            autoComplete="off"
            value={valor}
            onChange={() => {}}
            onFocus={(e) => e.target.blur()}
            required
            className="pointer-events-none absolute left-3 top-1/2 h-px w-px -translate-y-1/2 opacity-0"
          />
        ) : null}
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={aberto}
          onClick={() => setAberto((a) => !a)}
          className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-zinc-950 px-3.5 py-2.5 text-left text-sm text-white outline-none transition ${
            aberto ? "border-indigo-400/60" : "border-white/10 hover:border-white/25"
          } ${!selecionada ? "text-white/40" : ""}`}
        >
          <span className="truncate">{textoBotao}</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
            className={`shrink-0 text-white/50 transition-transform ${aberto ? "rotate-180" : ""}`}
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {aberto ? (
          <div
            role="listbox"
            className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/70"
          >
            {comBusca ? (
              <div className="border-b border-white/10 p-2">
                <input
                  ref={campoBusca}
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value);
                    setDestaque(0);
                  }}
                  placeholder="filtrar…"
                  className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-indigo-400/60"
                />
              </div>
            ) : null}
            <div className="max-h-60 overflow-y-auto p-1.5">
              {secoes.map(({ cabecalho, item }, i) => {
                const ativo = valor === item.valor;
                return (
                  <div key={item.key}>
                    {cabecalho ? (
                      <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                        {cabecalho}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      role="option"
                      aria-selected={ativo}
                      onClick={() => escolher(item.valor)}
                      onMouseEnter={() => setDestaque(i)}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                        ativo
                          ? "bg-indigo-500/25 text-white"
                          : item.vazio
                            ? "text-white/50 hover:bg-white/5 hover:text-white/80"
                            : "text-white/85 hover:bg-indigo-500/15 hover:text-white"
                      } ${destaque === i ? "ring-1 ring-inset ring-indigo-400/50" : ""}`}
                    >
                      <span className="truncate">{item.rotulo}</span>
                      {ativo ? <Check /> : null}
                    </button>
                  </div>
                );
              })}
              {itens.length === 0 ? (
                <p className="px-2.5 py-3 text-center text-xs text-white/40">nada encontrado para “{busca}”</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0 text-indigo-300">
      <path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
