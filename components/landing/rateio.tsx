import Reveal from "./reveal";
import { IconNoDouble, IconSplit } from "./icons";

const ALOCACOES = [
  {
    valor: "R$ 20,00",
    centavos: 2000,
    item: "Carne",
    destino: "Alimentação",
    setor: "Integral",
    cor: "#E3062F",
  },
  {
    valor: "R$ 10,00",
    centavos: 1000,
    item: "Ferramentas",
    destino: "Infraestrutura",
    setor: "Manutenção",
    cor: "#0066C5",
  },
  {
    valor: "R$ 8,00",
    centavos: 800,
    item: "Materiais",
    destino: "Consumo",
    setor: "Cantina",
    cor: "#0054A6",
  },
  {
    valor: "R$ 7,00",
    centavos: 700,
    item: "Material administrativo",
    destino: "Escritório",
    setor: "Coordenação F1",
    cor: "#003F8F",
  },
  {
    valor: "R$ 5,00",
    centavos: 500,
    item: "Peça para brinquedo",
    destino: "Reparo",
    setor: "Recreação",
    cor: "#0066C5",
  },
] as const;

export default function Rateio() {
  return (
    <section id="rateio" className="lp-section relative overflow-hidden py-20 sm:py-28">

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Narrativa do problema */}
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-[#9CC6F5]">
                <IconSplit className="h-4 w-4" />
                O problema real
              </span>
            </Reveal>
            <Reveal delay={100}>
              <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                Uma compra atende vários setores.{" "}
                <span className="text-[#9CC6F5]">A planilha não sabe lidar com isso.</span>
              </h2>
            </Reveal>
            <Reveal delay={180}>
              <p className="mt-5 text-base leading-relaxed text-slate-400 sm:text-lg">
                Quando a escola faz uma compra única de <strong className="text-slate-200">R$ 50,00 no mercado</strong>,
                aquele mesmo carrinho leva carne para a alimentação do Integral, ferramentas para a
                Manutenção, materiais para a Cantina, material administrativo para a Coordenação F1 e
                uma peça para o brinquedo da Recreação.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">
                Na planilha, só existem saídas ruins: atribuir os R$ 50,00 inteiros a um único setor
                (mentindo para os outros quatro), <strong className="text-slate-200">repetir a linha cinco vezes</strong> e
                inflar o total geral, ou esconder o rateio numa nota obscura que ninguém audita.
              </p>
            </Reveal>
          </div>

          <Reveal delay={160}>
            <div className="relative flex h-full flex-col justify-center gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8">
              <div className="flex items-start gap-4 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4">
                <IconNoDouble className="mt-0.5 h-6 w-6 shrink-0 text-red-300/80" />
                <div>
                  <p className="text-sm font-semibold text-red-200/90">O que NÃO pode acontecer</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">
                    Os R$ 50,00 aparecerem cinco vezes nos totais: <span className="font-mono text-red-300/80 line-through">R$ 250,00</span>{" "}
                    registrados a partir de uma nota de R$ 50,00.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-6 w-6 shrink-0 text-emerald-300/90" aria-hidden="true">
                  <path d="M4 12.5l5 5L20 6.5" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-emerald-200/90">O que o sistema garante</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">
                    Uma despesa aparece em <strong className="text-slate-200">N recortes analíticos</strong> (setor,
                    categoria, turma, coordenação), mas{" "}
                    <strong className="text-slate-200">conta exatamente 1× no total</strong> — sempre R$ 50,00.
                  </p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                A soma das alocações de uma compra nunca ultrapassa o valor total dela. O sistema
                valida isso a cada centavo salvo.
              </p>
            </div>
          </Reveal>
        </div>

        {/* Diagrama do rateio */}
        <Reveal delay={100} className="mt-16 sm:mt-20">
          <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-[#08182E]/70 p-5 backdrop-blur-xl sm:p-8">
            <h3 className="text-center text-sm font-semibold uppercase tracking-widest text-slate-400">
              Anatomia de uma compra de R$ 50,00
            </h3>

            {/* Compra central */}
            <div className="lp-pulse mx-auto mt-6 flex w-full max-w-md items-center justify-between gap-4 rounded-2xl border border-[#0066C5]/40 bg-[#0054A6]/10 px-5 py-4 sm:px-7">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#9CC6F5]">Saída financeira</p>
                <p className="text-lg font-bold text-white sm:text-xl">Mercado — compra única</p>
              </div>
              <p className="text-xl font-bold tabular-nums text-white sm:text-2xl">R$ 50,00</p>
            </div>

            {/* Conector em leque (somente telas grandes) */}
            <svg
              viewBox="0 0 500 64"
              className="mx-auto mt-2 hidden h-16 w-full max-w-4xl lg:block"
              aria-hidden="true"
            >
              <path d="M250 0 V14" stroke="rgba(0,84,166,0.6)" strokeWidth="1.5" fill="none" />
              {[50, 150, 250, 350, 450].map((x) => (
                <path
                  key={x}
                  d={`M250 14 C250 40 ${x} 34 ${x} 64`}
                  className="lp-flow-line"
                  stroke="#0066C5"
                  strokeWidth="1.5"
                  fill="none"
                />
              ))}
            </svg>

            {/* Conector simples (telas menores) */}
            <div className="mx-auto my-2 h-8 w-px bg-[#0066C5]/50 lg:hidden" aria-hidden="true" />

            {/* Destinos */}
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {ALOCACOES.map((a, i) => (
                <Reveal key={a.setor} delay={i * 90} className="h-full">
                  <div className="lp-card h-full rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur">
                    <div className="flex items-center justify-between">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: a.cor, boxShadow: `0 0 12px ${a.cor}` }}
                        aria-hidden="true"
                      />
                      <p className="text-base font-bold tabular-nums text-white">{a.valor}</p>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-200">{a.setor}</p>
                    <p className="text-xs text-slate-400">{a.destino}</p>
                    <p className="mt-1.5 text-xs leading-snug text-slate-500">{a.item}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* Barra de verificação anti-dupla-contagem */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#051327]/80">
              <div className="grid gap-px sm:grid-cols-3">
                <div className="p-4 text-center sm:p-5">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Total geral (compras)</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-white">R$ 50,00 — 1×</p>
                </div>
                <div className="p-4 text-center sm:p-5">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Relatórios analíticos</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-[#9CC6F5]">5 recortes — R$ 50,00</p>
                </div>
                <div className="p-4 text-center sm:p-5">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Soma das alocações</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-emerald-300">
                    20 + 10 + 8 + 7 + 5 = R$ 50,00
                  </p>
                </div>
              </div>
              {/* Barra proporcional em centavos */}
              <div className="flex h-2 w-full" role="img" aria-label="Barra proporcional do rateio: 40% Integral, 20% Manutenção, 16% Cantina, 14% Coordenação F1, 10% Recreação">
                {ALOCACOES.map((a) => (
                  <div
                    key={a.setor}
                    style={{ width: `${(a.centavos / 5000) * 100}%`, backgroundColor: a.cor }}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
