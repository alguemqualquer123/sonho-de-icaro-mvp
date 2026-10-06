import Reveal from "./reveal";

const NUMEROS = [
  {
    valor: "1×",
    rotulo: "saída por compra",
    detalhe: "cinco recortes analíticos, um único lançamento no total",
  },
  {
    valor: "5",
    rotulo: "destinos no rateio",
    detalhe: "setor, categoria, turma, coordenação e atividade",
  },
  {
    valor: "14",
    rotulo: "turmas acompanhadas",
    detalhe: "do Berçário ao 9º ano, além do Integral",
  },
  {
    valor: "2 + 1",
    rotulo: "coordenações e Integral",
    detalhe: "F1, F2 e Integral como recortes de despesa",
  },
  {
    valor: "7",
    rotulo: "perfis de permissão",
    detalhe: "acesso granular da direção ao lançador",
  },
  {
    valor: "0",
    rotulo: "ponto flutuante",
    detalhe: "todos os valores armazenados em centavos inteiros",
  },
];

export default function Numeros() {
  return (
    <section id="numeros" className="lp-section relative py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 backdrop-blur-xl sm:p-10">
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
              {NUMEROS.map((n) => (
                <div key={n.rotulo} className="text-center">
                  <p className="text-3xl font-bold tabular-nums text-white sm:text-4xl lg:text-5xl">
                    <span className="lp-text-gradient">{n.valor}</span>
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-200">{n.rotulo}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{n.detalhe}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
