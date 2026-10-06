"use client";

import { useEffect, useState } from "react";
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
          ? "border-b border-white/10 bg-[#070712]/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="#topo" className="group flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-[#7c5cff]/30 to-[#4f8cff]/20 backdrop-blur">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#a9c4ff]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
              <path d="M5 17c2-7 7-11 14-12-1 7-5 12-12 13" />
              <path d="M9 15l10-10" />
              <path d="M5 19l4-4" />
            </svg>
          </span>
          <span className="text-sm font-semibold tracking-wide text-white sm:text-base">
            Sonho de Ícaro
            <span className="ml-2 hidden rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-slate-400 md:inline">
              XP Black
            </span>
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
            className="lp-shimmer rounded-xl bg-gradient-to-r from-[#7c5cff] to-[#4f8cff] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_28px_-10px_rgba(124,92,255,0.7)] transition-transform hover:scale-[1.03]"
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
        <div className="border-t border-white/10 bg-[#070712]/95 px-4 pb-6 pt-3 backdrop-blur-xl lg:hidden">
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
              className="rounded-xl bg-gradient-to-r from-[#7c5cff] to-[#4f8cff] px-4 py-2.5 text-center text-sm font-semibold text-white"
            >
              Criar conta
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
