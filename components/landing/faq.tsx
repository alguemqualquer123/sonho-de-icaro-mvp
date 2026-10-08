import Reveal from "./reveal";
import { IconPlus } from "./icons";

const PERGUNTAS = [
  {
    pergunta: "Como o sistema evita contar a mesma compra duas vezes?",
    resposta:
      "A compra e as alocações são entidades separadas. Totais gerais somam apenas compras — uma nota de R$ 50,00 conta R$ 50,00, nunca R$ 250,00. Relatórios por setor, categoria e turma somam alocações, que são recortes analíticos do mesmo dinheiro. Os dois conjuntos sempre fecham no mesmo valor total.",
  },
  {
    pergunta: "O rateio pode ficar com sobra ou falta de centavos?",
    resposta:
      "Não. Todos os valores são armazenados como inteiros em centavos, sem ponto flutuante. O sistema só aceita o rateio quando a soma das alocações fecha exatamente com o total da compra — e jamais permite que a soma ultrapasse esse total.",
  },
  {
    pergunta: "E se uma compra for cancelada ou estornada?",
    resposta:
      "Cancelamento e estorno são registrados como eventos novos na trilha de auditoria, com autor, data/hora e justificativa. Nenhum lançamento é apagado: o histórico permanece intacto e os relatórios passam a refletir o evento corretivo.",
  },
  {
    pergunta: "Os dados do cartão XP Black ficam salvos?",
    resposta:
      "Não, em nenhuma hipótese. O sistema não armazena número completo do cartão, CVV, senha ou token. A conciliação usa apenas valores, datas e descrições da fatura, o suficiente para parear compras — automaticamente ou manualmente.",
  },
  {
    pergunta: "Posso alterar um mês que já foi fechado?",
    resposta:
      "Somente reabrindo o fechamento, e isso exige justificativa registrada. Com o mês fechado, os números ficam travados contra alterações. Toda reabertura e todo ajuste ficam visíveis na auditoria para quem tiver permissão de conferir.",
  },
  {
    pergunta: "Quem pode ver o quê?",
    resposta:
      "São 7 perfis de permissão, da direção ao lançador. Cada perfil define o que o usuário pode criar, editar, conciliar, fechar e exportar. A exportação em CSV gera relatórios por setor, categoria e turma prontos para o financeiro da escola.",
  },
];

export default function Faq() {
  return (
    <section id="faq" className="lp-section relative py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-[#9CC6F5]">
              Dúvidas que o financeiro sempre tem
            </span>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Perguntas frequentes
            </h2>
          </Reveal>
        </div>

        <div className="lp-faq mt-12 space-y-3">
          {PERGUNTAS.map((item, i) => (
            <Reveal key={item.pergunta} delay={i * 60}>
              <details className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur">
                <summary className="flex items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5">
                  <span className="text-sm font-semibold text-white sm:text-base">
                    {item.pergunta}
                  </span>
                  <IconPlus className="lp-faq-chevron h-4 w-4 shrink-0 rotate-45 text-[#9CC6F5]" />
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-slate-400 sm:px-6 sm:pb-6">
                  {item.resposta}
                </p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
