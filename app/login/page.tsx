import type { Metadata } from "next";
import Link from "next/link";
import FormLogin from "@/components/form-login";
import { totalUsuarios } from "@/lib/usuarios";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string; retorno?: string }>;
}) {
  const params = await searchParams;
  const primeiro = (await totalUsuarios()) === 0;
  const retorno = params.retorno && params.retorno.startsWith("/") ? params.retorno : "/dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070712] px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />
      </div>
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-white/50 hover:text-white">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-500/20 text-xs font-semibold text-indigo-200">SI</span>
          Sonho de Ícaro
        </Link>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Entrar</h1>
          <p className="mt-1 text-sm text-white/50">Controle das despesas do cartão XP Black.</p>
          {primeiro ? (
            <p className="mt-4 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-100">
              Nenhum usuário cadastrado ainda. Crie a primeira conta em <strong>Registrar</strong> — ela vira administradora.
            </p>
          ) : null}
          {params.ok === "voce-saiu" ? (
            <p className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">Sessão encerrada.</p>
          ) : null}
          <div className="mt-6">
            <FormLogin retorno={retorno} />
          </div>
        </div>
      </div>
    </main>
  );
}
