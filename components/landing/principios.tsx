import Reveal from "./reveal";
import {
  IconOne,
  IconNoDouble,
  IconScale,
  IconCoins,
  IconHistory,
  IconShield,
} from "./icons";

const PRINCIPIOS = [
  {
    icone: IconOne,
    titulo: "Uma transação = uma saída financeira",
    descricao:
      "Cada compra existe uma única vez no sistema. Rateio é análise, não dinheiro: um valor distribuído entre destinos continua sendo uma só saída.",
  },
  {
    icone: IconNoDouble,
    titulo: "Alocações nunca ultrapassam a compra",
    descricao:
      "A soma das fatias rateadas de uma compra não pode passar do total dela. O sistema valida em centavos antes de salvar qualquer alocação.",
  },
  {
    icone: IconScale,
    titulo: "Totais sem dupla contagem",
    descricao:
      "Totais gerais somam compras. Relatórios por setor, categoria e turma somam alocações. Os dois mundos fecham no mesmo número, cada um do seu lado.",
  },
  {
    icone: IconCoins,
    titulo: "Centavos inteiros, zero ponto flutuante",
    descricao:
      "Todo valor é armazenado como inteiro em centavos. Sem arredondamento binário, sem R$ 0,01 fantasma fechando o mês errado.",
  },
  {
    icone: IconHistory,
    titulo: "Tudo é auditável",
    descricao:
      "Quem criou, alterou, cancelou ou estornou, quando e por quê. Cancelamento e estorno são eventos novos — nenhum registro jamais é apagado.",
  },
  {
    icone: IconShield,
    titulo: "Nenhum dado sensível do cartão",
    descricao:
      "Número completo, CVV, senha e token não existem neste sistema. Trabalhamos apenas com valores e descrições que a fatura permite conciliar.",
  },
];

export default function Principios() {
  return (
    <section id="principios" className="lp-section relative py-20 sm:py-28">
      <div className="lp-orb lp-orb-purple -left-40 bottom-0 h-[400px] w-[400px] opacity-15" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-[#a9c4ff]">
              Inegociáveis
            </span>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Seis princípios que nenhum relatório fere
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">
              Não são funcionalidades: são invariantes do sistema. Se um número contradiz qualquer um
              deles, o problema é do sistema — e ele não deixa acontecer.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:gap-5">
          {PRINCIPIOS.map((principio, i) => {
            const Icone = principio.icone;
            return (
              <Reveal key={principio.titulo} delay={(i % 2) * 90} className="h-full">
                <article className="lp-card flex h-full gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur sm:gap-5 sm:p-7">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#7c5cff]/25 to-[#4f8cff]/15">
                    <Icone className="h-5 w-5 text-[#a9c4ff]" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-white sm:text-lg">
                      <span className="mr-2 font-mono text-sm text-slate-500">{String(i + 1).padStart(2, "0")}</span>
                      {principio.titulo}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{principio.descricao}</p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
