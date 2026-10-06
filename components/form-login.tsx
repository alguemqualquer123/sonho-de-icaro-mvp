"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type EstadoForm } from "@/lib/acoes/auth";
import { Botao, INPUT } from "@/components/ui";

export default function FormLogin({ retorno }: { retorno: string }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(loginAction, {});
  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="retorno" value={retorno} />
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-white/60">E-mail</span>
        <input name="email" type="email" required autoComplete="username" className={INPUT} placeholder="voce@escola.com.br" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-white/60">Senha</span>
        <input name="senha" type="password" required autoComplete="current-password" className={INPUT} placeholder="mínimo de 8 caracteres" />
      </label>
      {estado.erro ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{estado.erro}</p>
      ) : null}
      <Botao>Entrar</Botao>
      {pendente ? <p className="text-xs text-white/40">entrando…</p> : null}
      <p className="text-xs text-white/45">
        Ainda sem conta?{" "}
        <Link href="/registro" className="text-indigo-300 underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
