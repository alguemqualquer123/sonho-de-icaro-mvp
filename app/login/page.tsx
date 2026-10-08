import type { Metadata } from "next";
import Link from "next/link";
import FormLogin from "@/components/form-login";
import { Marca } from "@/components/marca";
import { totalUsuarios } from "@/lib/usuarios";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string; retorno?: string }>;
}) {
  const params = await searchParams;
  // Se o banco estiver fora do ar / sem DATABASE_URL na Vercel, a página deve
  // continuar renderizando (com aviso) em vez de estourar Digest 500.
  let primeiro = false;
  let erroBanco: string | null = null;
  try {
    primeiro = (await totalUsuarios()) === 0;
  } catch (erro) {
    erroBanco = erro instanceof Error ? erro.message : String(erro);
  }
  const retorno = params.retorno && params.retorno.startsWith("/") ? params.retorno : "/dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#051327] px-4 py-10">
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center gap-2" aria-label="Volta para a página inicial">
          <Marca />
        </Link>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Entrar</h1>
          <p className="mt-1 text-sm text-white/50">Controle das despesas do cartão XP Black.</p>
          {erroBanco ? (
            <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
              Não foi possível alcançar o banco de dados: {erroBanco}. Confira a variável
              DATABASE_URL na Vercel e tente de novo.
            </p>
          ) : null}
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
