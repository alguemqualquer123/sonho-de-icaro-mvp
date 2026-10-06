"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type ItemNav = { href: string; rotulo: string };

export default function Nav({ itens, usuario }: { itens: ItemNav[]; usuario: { nome: string; papel: string } }) {
  const pathname = usePathname();
  return (
    <>
      <div className="hidden lg:block">
        <nav className="space-y-1">
          {itens.map((item) => {
            const ativo = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-xl px-3 py-2 text-sm transition ${
                  ativo ? "bg-indigo-500/15 font-medium text-indigo-100" : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.rotulo}
              </Link>
            );
          })}
        </nav>
        <p className="mt-6 border-t border-white/10 pt-4 text-xs text-white/40">
          {usuario.nome}
          <br />
          <span className="text-white/25">{usuario.papel}</span>
        </p>
      </div>
      <nav className="flex gap-1 overflow-x-auto pb-1 lg:hidden">
        {itens.map((item) => {
          const ativo = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition ${
                ativo ? "bg-indigo-500/20 text-indigo-100" : "text-white/55 hover:bg-white/5"
              }`}
            >
              {item.rotulo}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
