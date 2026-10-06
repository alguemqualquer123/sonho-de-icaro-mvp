import Reveal from "./reveal";
import { IconCheck } from "./icons";

export default function ChamadaFinal() {
  return (
    <section id="comecar" className="lp-section relative overflow-hidden py-20 sm:py-28">
      <div className="lp-orb lp-orb-purple lp-float-slow left-1/2 top-1/2 h-[520px] w-[520px] -translate-y-1/2" aria-hidden="true" />

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            Chega de planilha que <span className="lp-text-gradient">duplica despesa.</span>
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            Uma conta, um clique e a próxima compra de R$ 50,00 já entra rateada entre o Integral, a
            Manutenção, a Cantina, a Coordenação e a Recreação — com os totais fechando no centavo.
          </p>
        </Reveal>
        <Reveal delay={220}>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="/registro"
              className="lp-shimmer w-full rounded-2xl bg-gradient-to-r from-[#7c5cff] to-[#4f8cff] px-8 py-4 text-base font-semibold text-white shadow-[0_16px_48px_-16px_rgba(124,92,255,0.8)] transition-transform hover:scale-[1.03] sm:w-auto"
            >
              Criar conta
            </a>
            <a
              href="/login"
              className="w-full rounded-2xl border border-white/15 bg-white/5 px-8 py-4 text-base font-medium text-slate-200 backdrop-blur transition-colors hover:border-white/30 hover:text-white sm:w-auto"
            >
              Entrar
            </a>
          </div>
        </Reveal>
        <Reveal delay={300}>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 sm:text-sm">
            <li className="flex items-center gap-1.5">
              <IconCheck className="h-4 w-4 text-[#7c5cff]" /> Fechamento mensal com trava
            </li>
            <li className="flex items-center gap-1.5">
              <IconCheck className="h-4 w-4 text-[#7c5cff]" /> Conciliação com a fatura
            </li>
            <li className="flex items-center gap-1.5">
              <IconCheck className="h-4 w-4 text-[#7c5cff]" /> Auditoria de cada alteração
            </li>
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
