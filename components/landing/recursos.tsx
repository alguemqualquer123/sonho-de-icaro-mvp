import Reveal from "./reveal";
import {
  IconDashboard,
  IconReceipt,
  IconSplit,
  IconScale,
  IconLock,
  IconReport,
  IconUsers,
  IconHistory,
} from "./icons";

const RECURSOS = [
  {
    icone: IconDashboard,
    titulo: "Dashboard do mês",
    descricao:
      "Resumo imediato do que já foi gasto no mês, compras pendentes de conciliação e o estado do fechamento — tudo em uma tela.",
  },
  {
    icone: IconReceipt,
    titulo: "Compras com comprovante",
    descricao:
      "Registre a compra com foto do comprovante anexada. Cada saída financeira nasce com sua evidência documental.",
  },
  {
    icone: IconSplit,
    titulo: "Rateio analítico",
    descricao:
      "Divida uma compra entre setor, categoria, turma e coordenação (F1 e F2), respeitando o total da nota até o último centavo.",
  },
  {
    icone: IconScale,
    titulo: "Conciliação com a fatura",
    descricao:
      "Pareamento automático e manual com os lançamentos do cartão XP Black, com fila de divergências para revisão.",
  },
  {
    icone: IconLock,
    titulo: "Fechamento mensal travado",
    descricao:
      "Feche o mês com os números bloqueados contra alterações. A reabertura exige justificativa registrada em auditoria.",
  },
  {
    icone: IconReport,
    titulo: "Relatórios com exportação CSV",
    descricao:
      "Recortes por setor, categoria e turma do Berçário ao 9º ano, além do Integral, com exportação CSV pronta para o financeiro.",
  },
  {
    icone: IconUsers,
    titulo: "7 perfis de permissão",
    descricao:
      "Da direção ao lançador: cada usuário vê e faz exatamente o que seu perfil permite, sem gambiarras de acesso.",
  },
  {
    icone: IconHistory,
    titulo: "Trilha de auditoria",
    descricao:
      "Quem criou, alterou, cancelou ou estornou cada registro, quando e por quê. Nada é apagado — eventos novos substituem os antigos.",
  },
];

export default function Recursos() {
  return (
    <section id="recursos" className="lp-section relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-[#a9c4ff]">
              Tudo em um sistema só
            </span>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Recursos feitos para a rotina da escola
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">
              O cartão XP Black corporativo financia o dia a dia de duas coordenações, 14 turmas e o
              Integral. Cada recurso abaixo existe para isso não virar bagunça.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {RECURSOS.map((recurso, i) => {
            const Icone = recurso.icone;
            return (
              <Reveal key={recurso.titulo} delay={(i % 4) * 80} className="h-full">
                <article className="lp-card h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#7c5cff]/25 to-[#4f8cff]/15">
                    <Icone className="h-5 w-5 text-[#a9c4ff]" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-white">{recurso.titulo}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{recurso.descricao}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
