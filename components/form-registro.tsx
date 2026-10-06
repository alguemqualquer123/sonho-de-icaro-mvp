"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registroAction, type EstadoForm } from "@/lib/acoes/auth";
import { Botao, INPUT } from "@/components/ui";

export default function FormRegistro() {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(registroAction, {});
  return (
    <form action={acao} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-white/60">Nome completo</span>
        <input name="nome" required className={INPUT} placeholder="Como você aparece na escola" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-white/60">E-mail corporativo</span>
        <input name="email" type="email" required autoComplete="username" className={INPUT} placeholder="voce@escola.com.br" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-white/60">Senha</span>
          <input name="senha" type="password" required minLength={8} autoComplete="new-password" className={INPUT} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-white/60">Confirmar senha</span>
          <input name="confirmar" type="password" required minLength={8} autoComplete="new-password" className={INPUT} />
        </label>
      </div>
      <p className="text-[11px] leading-relaxed text-white/40">
        A senha precisa de ao menos 8 caracteres, uma letra e um número. A primeira conta criada recebe o perfil de
        administrador; as seguintes entram como comprador e o administrador ajusta o perfil depois.
      </p>
      {estado.erro ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{estado.erro}</p>
      ) : null}
      <Botao>Criar conta</Botao>
      {pendente ? <p className="text-xs text-white/40">criando sua conta…</p> : null}
      <p className="text-xs text-white/45">
        Já tem conta?{" "}
        <Link href="/login" className="text-indigo-300 underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
