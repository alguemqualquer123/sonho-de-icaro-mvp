import Link from "next/link";
import type { ReactNode } from "react";
import Nav from "@/components/nav";
import { exigirUsuario } from "@/lib/auth";
import { PERMISSOES, pode, nomeDoPapel } from "@/lib/rbac";
import { sairAction } from "@/lib/acoes/auth";

export default async function LayoutPainel({ children }: { children: ReactNode }) {
  const usuario = await exigirUsuario();
  const itens = [
    { href: "/dashboard", rotulo: "Visão geral", perm: null },
    { href: "/compras", rotulo: "Compras", perm: null },
    { href: "/conciliacao", rotulo: "Conciliação", perm: PERMISSOES.conciliacaoGerir },
    { href: "/relatorios", rotulo: "Relatórios", perm: PERMISSOES.relatoriosVer },
    { href: "/cadastros", rotulo: "Cadastros", perm: PERMISSOES.cadastrosVer },
    { href: "/usuarios", rotulo: "Usuários", perm: PERMISSOES.usuariosGerir },
    { href: "/auditoria", rotulo: "Auditoria", perm: PERMISSOES.auditoriaVer },
  ]
    .filter((i) => !i.perm || pode(usuario.papel, i.perm))
    .map(({ href, rotulo }) => ({ href, rotulo }));

  return (
    <div className="min-h-screen bg-[#070712]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[380px] w-[380px] rounded-full bg-indigo-700/15 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-[320px] w-[320px] rounded-full bg-fuchsia-700/10 blur-[120px]" />
      </div>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070712]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-[11px] font-bold text-white shadow-[0_0_20px_-4px] shadow-indigo-500/80">
              SI
            </span>
            <span className="text-sm font-semibold tracking-tight text-white">Sonho de Ícaro</span>
            <span className="hidden text-xs text-white/35 sm:inline">cartão XP Black</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-white/80">{usuario.nome}</p>
              <p className="text-[11px] text-white/35">{nomeDoPapel(usuario.papel)}</p>
            </div>
            <form action={sairAction}>
              <button
                type="submit"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-6 lg:grid-cols-[190px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Nav itens={itens} usuario={{ nome: usuario.nome, papel: nomeDoPapel(usuario.papel) }} />
        </aside>
        <main className="min-w-0 pb-16">{children}</main>
      </div>
    </div>
  );
}
