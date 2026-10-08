import type { Metadata } from "next";
import Link from "next/link";
import FormRegistro from "@/components/form-registro";
import { Marca } from "@/components/marca";

export const metadata: Metadata = { title: "Criar conta" };

export default function PaginaRegistro() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#051327] px-4 py-10">
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center gap-2" aria-label="Volta para a página inicial">
          <Marca />
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
