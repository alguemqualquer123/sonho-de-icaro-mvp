import Reveal from "./reveal";
import { IconArrowDown, IconCheck } from "./icons";

export default function Hero() {
  return (
    <section id="topo" className="lp-section relative overflow-hidden pb-20 pt-32 sm:pb-28 sm:pt-40">
      {/* Glow de fundo */}
      <div className="lp-grid-bg absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-slate-300 backdrop-blur sm:text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E3062F]" aria-hidden="true" />
              Gestão de despesas do cartão XP Black corporativo
            </span>
          </Reveal>

          <Reveal delay={120}>
            <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-7xl">
              Uma compra atende vários setores.
              <br />
              <span className="text-white">Seu relatório precisa saber disso.</span>
            </h1>
          </Reveal>

          <Reveal delay={220}>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg lg:text-xl">
              R$ 50,00 no mercado viram carne para o Integral, ferramentas para a Manutenção e
              material para a Coordenação na mesma nota. O Sonho de Ícaro registra{" "}
              <strong className="font-semibold text-slate-200">uma única saída financeira</strong> e
              faz o <strong className="font-semibold text-slate-200">rateio analítico</strong> entre
              destinos — sem jamais contar o mesmo valor duas vezes.
            </p>
          </Reveal>

          <Reveal delay={320}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="/registro"
                className="w-full rounded-2xl bg-[#0054A6] hover:bg-[#0066C5] px-8 py-4 text-center text-base font-semibold text-white shadow-[0_16px_48px_-16px_rgba(0,84,166,0.8)] transition-transform hover:scale-[1.03] sm:w-auto"
              >
                Criar conta
              </a>
              <a
                href="/login"
                className="w-full rounded-2xl border border-white/15 bg-white/5 px-8 py-4 text-center text-base font-medium text-slate-200 backdrop-blur transition-colors hover:border-white/30 hover:text-white sm:w-auto"
              >
                Entrar
              </a>
            </div>
          </Reveal>

          <Reveal delay={400}>
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 sm:text-sm">
              <li className="flex items-center gap-1.5">
                <IconCheck className="h-4 w-4 text-[#0066C5]" /> Rateio sem dupla contagem
              </li>
              <li className="flex items-center gap-1.5">
                <IconCheck className="h-4 w-4 text-[#0066C5]" /> Valores exatos em centavos
              </li>
              <li className="flex items-center gap-1.5">
                <IconCheck className="h-4 w-4 text-[#0066C5]" /> Trilha de auditoria completa
              </li>
            </ul>
          </Reveal>
        </div>

        {/* Mini-preview do rateio no hero */}
        <Reveal delay={200} className="mt-16 sm:mt-20">
          <div className="relative mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8">
            <div className="flex flex-col items-center gap-4 sm:gap-5">
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#08182E]/80 px-5 py-3 sm:px-8 sm:py-4">
                <span className="text-xs uppercase tracking-widest text-slate-400 sm:text-sm">
                  Compra única — mercado
                </span>
                <span className="text-xl font-bold text-white sm:text-2xl">R$ 50,00</span>
              </div>

              <IconArrowDown className="h-5 w-5 text-[#0066C5]" aria-hidden="true" />

              <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  { valor: "R$ 20,00", destino: "Alimentação", setor: "Integral" },
                  { valor: "R$ 10,00", destino: "Ferramentas", setor: "Manutenção" },
                  { valor: "R$ 8,00", destino: "Materiais", setor: "Cantina" },
                  { valor: "R$ 7,00", destino: "Adm.", setor: "Coordenação F1" },
                  { valor: "R$ 5,00", destino: "Brinquedo", setor: "Recreação" },
                ].map((item) => (
                  <div
                    key={item.setor}
                    className="lp-card rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3 text-center backdrop-blur"
                  >
                    <p className="text-base font-bold text-white sm:text-lg">{item.valor}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{item.destino}</p>
                    <p className="text-[11px] font-medium text-[#9CC6F5]">{item.setor}</p>
                  </div>
                ))}
              </div>

              <p className="text-center text-xs leading-relaxed text-slate-500 sm:text-sm">
                5 destinos no relatório analítico — <strong className="text-slate-300">1 única saída de R$ 50,00</strong> no total geral.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
