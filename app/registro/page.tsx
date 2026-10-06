import type { Metadata } from "next";
import Link from "next/link";
import FormRegistro from "@/components/form-registro";

export const metadata: Metadata = { title: "Criar conta" };

export default function PaginaRegistro() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070712] px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 right-1/4 h-[420px] w-[720px] rounded-full bg-fuchsia-600/15 blur-[120px]" />
      </div>
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-white/50 hover:text-white">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-500/20 text-xs font-semibold text-indigo-200">SI</span>
          Sonho de Ícaro
        </Link>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Criar conta</h1>
          <p className="mt-1 text-sm text-white/50">Quem registra compras, rateia e acompanha o mês.</p>
          <div className="mt-6">
            <FormRegistro />
          </div>
        </div>
      </div>
    </main>
  );
}
