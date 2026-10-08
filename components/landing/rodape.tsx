import { Marca } from "@/components/marca";

const COLUNAS = [
  {
    titulo: "Produto",
    links: [
      { href: "#rateio", label: "O problema" },
      { href: "#como-funciona", label: "Como funciona" },
      { href: "#recursos", label: "Recursos" },
      { href: "#numeros", label: "Números" },
    ],
  },
  {
    titulo: "Confiança",
    links: [
      { href: "#principios", label: "Princípios" },
      { href: "#faq", label: "Perguntas frequentes" },
      { href: "#comecar", label: "Começar agora" },
    ],
  },
  {
    titulo: "Acesso",
    links: [
      { href: "/login", label: "Entrar" },
      { href: "/registro", label: "Criar conta" },
    ],
  },
];

export default function Rodape() {
  return (
    <footer className="relative border-t border-white/10 bg-[#08182E]/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <Marca />
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
              Sistema interno de gestão de despesas do cartão XP Black corporativo: uma compra, uma
              saída financeira, rateio analítico sem dupla contagem e auditoria completa.
            </p>
            <p className="mt-4 text-xs text-slate-600">
              Não armazenamos número completo do cartão, CVV, senha ou token.
            </p>
          </div>

          {COLUNAS.map((coluna) => (
            <nav key={coluna.titulo} aria-label={coluna.titulo}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                {coluna.titulo}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {coluna.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-500 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-600 sm:flex-row">
          <p>© {new Date().getFullYear()} Escola Sonho de Ícaro — uso interno.</p>
          <p>Berçário ao 9º ano · Integral · Coordenações F1 e F2</p>
        </div>
      </div>
    </footer>
  );
}
