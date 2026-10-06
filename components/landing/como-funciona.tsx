import Reveal from "./reveal";
import {
  IconCamera,
  IconSplit,
  IconScale,
  IconLock,
  IconReport,
} from "./icons";

const PASSOS = [
  {
    icone: IconCamera,
    titulo: "Registre a compra",
    descricao:
      "Lance a compra única com o valor total, os itens e a foto do comprovante anexada. Uma transação, uma saída financeira — nada mais.",
  },
  {
    icone: IconSplit,
    titulo: "Faça o rateio",
    descricao:
      "Distribua o valor entre setor, categoria, turma e coordenação. O sistema bloqueia qualquer alocação que ultrapasse o total da compra.",
  },
  {
    icone: IconScale,
    titulo: "Concilie com a fatura",
    descricao:
      "Pareie compras com a fatura do cartão XP Black automaticamente ou manualmente. Divergências ficam sinalizadas para revisão.",
  },
  {
    icone: IconLock,
    titulo: "Feche o mês",
    descricao:
      "Ao fechar o mês, os números ficam travados. Precisa mudar algo? Reabra com justificativa registrada na auditoria.",
  },
  {
    icone: IconReport,
    titulo: "Relatórios e exportação",
    descricao:
      "Veja o recorte por setor, categoria, turma ou coordenação e exporte CSV para o financeiro da escola em um clique.",
  },
];

export default function ComoFunciona() {
  return (
    <section id="como-funciona" className="lp-section relative py-20 sm:py-28">
      <div className="lp-orb lp-orb-purple -right-48 top-10 h-[380px] w-[380px] opacity-20" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-[#a9c4ff]">
              Do carrinho ao relatório
            </span>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Como funciona
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">
              Um fluxo de cinco etapas que acompanha a despesa da compra até o fechamento do mês,
              sem planilhas paralelas e sem retrabalho.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
          {PASSOS.map((passo, i) => {
            const Icone = passo.icone;
            return (
              <Reveal key={passo.titulo} delay={i * 90} className="h-full">
                <div className="lp-card h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#7c5cff]/25 to-[#4f8cff]/15">
                      <Icone className="h-5 w-5 text-[#a9c4ff]" />
                    </span>
                    <span className="font-mono text-sm text-slate-600">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-white">{passo.titulo}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{passo.descricao}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
