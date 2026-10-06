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
    <footer className="relative border-t border-white/10 bg-[#0a0a14]/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-[#7c5cff]/30 to-[#4f8cff]/20">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#a9c4ff]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
                  <path d="M5 17c2-7 7-11 14-12-1 7-5 12-12 13" />
                  <path d="M9 15l10-10" />
                  <path d="M5 19l4-4" />
                </svg>
              </span>
              <p className="text-base font-semibold text-white">Sonho de Ícaro</p>
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
