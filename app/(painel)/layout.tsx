import Link from "next/link";
import type { ReactNode } from "react";
import Nav from "@/components/nav";
import { Marca } from "@/components/marca";
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
    <div className="min-h-screen bg-[#051327]">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#051327]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Marca />
            <span className="hidden border-l border-white/10 pl-3 text-xs text-white/45 sm:inline">
              cartão XP Black
              <br />
              controle de compras
            </span>
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
        <div className="h-px w-full bg-indigo-500/40" aria-hidden="true" />
      </header>

      <div className="relative mx-auto grid max-w-7xl gap-6 px-3 py-5 sm:gap-8 sm:px-4 sm:py-6 lg:grid-cols-[190px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Nav itens={itens} usuario={{ nome: usuario.nome, papel: nomeDoPapel(usuario.papel) }} />
        </aside>
        <main className="min-w-0 pb-16">{children}</main>
      </div>
    </div>
  );
}
