"use client";

import { useEffect, useState } from "react";
import { Marca } from "@/components/marca";
import { IconClose, IconMenu } from "./icons";

const NAV_LINKS = [
  { href: "#rateio", label: "O problema" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#recursos", label: "Recursos" },
  { href: "#principios", label: "Princípios" },
  { href: "#faq", label: "FAQ" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/10 bg-[#051327]/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="#topo" className="flex items-center gap-2.5">
          <Marca />
          <span className="hidden rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-slate-400 md:inline">
            XP Black
          </span>
        </a>

        {/* Navegação desktop */}
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Seções da página">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-slate-300 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTAs desktop */}
        <div className="hidden items-center gap-3 lg:flex">
          <a
            href="/login"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 backdrop-blur transition-colors hover:border-white/25 hover:text-white"
          >
            Entrar
          </a>
          <a
            href="/registro"
            className="rounded-xl bg-[#0054A6] hover:bg-[#0066C5] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_28px_-10px_rgba(0,84,166,0.7)] transition-transform hover:scale-[1.03]"
          >
            Criar conta
          </a>
        </div>

        {/* Toggle mobile */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 backdrop-blur lg:hidden"
        >
          {open ? <IconClose className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
        </button>
      </div>

      {/* Menu mobile */}
      {open && (
        <div className="border-t border-white/10 bg-[#051327]/95 px-4 pb-6 pt-3 backdrop-blur-xl lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Menu móvel">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-3">
            <a
              href="/login"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm font-medium text-slate-200"
            >
              Entrar
            </a>
            <a
              href="/registro"
              className="rounded-xl bg-[#0054A6] hover:bg-[#0066C5] px-4 py-2.5 text-center text-sm font-semibold text-white"
            >
              Criar conta
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
