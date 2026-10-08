"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Area, Botao, Campo, INPUT } from "./ui";
import { Selecao } from "./selecao";
import { criarCompraAction } from "@/lib/acoes/compras";

type Campos = Record<string, string>;
type Rascunho = { campos: Campos; enviado: boolean; atualizadoEm: string };

const PREFIXO = "sonho-icaro:nova-compra:";

/**
 * Rascunho local: enquanto a compra não é enviada, os campos ficam guardados no
 * navegador (localStorage) e voltam se a pessoa sair e reabrir a tela. O rascunho
 * some quando o envio dá certo ou quando se clica em cancelar/descartar.
 */
export function FormNovaCompra({
  usuarioId,
  dataInicial,
  fornecedores,
  temErro,
}: {
  usuarioId: number;
  dataInicial: string;
  fornecedores: string[];
  temErro: boolean;
}) {
  const chave = `${PREFIXO}${usuarioId}`;
  const formRef = useRef<HTMLFormElement>(null);
  const [rascunho, setRascunho] = useState<Campos | null>(null);
  const [restaurado, setRestaurado] = useState(false);
  const [versao, setVersao] = useState(0);

  function apagar() {
    try {
      localStorage.removeItem(chave);
    } catch {
      // armazenamento indisponível (aba privada): segue sem rascunho
    }
  }

  function gravar(enviado: boolean) {
    const form = formRef.current;
    if (!form) return;
    const campos: Campos = {};
    for (const [k, v] of new FormData(form).entries()) {
      if (typeof v === "string") campos[k] = v;
    }
    try {
      localStorage.setItem(chave, JSON.stringify({ campos, enviado, atualizadoEm: new Date().toISOString() }));
    } catch {
      // sem armazenamento: nada a fazer
    }
  }

  // Ao abrir a tela: descarta o rascunho já enviado com sucesso ou restaura o que
  // estava sendo digitado. O remonte via `versao` repõe os valores nos campos.
  useEffect(() => {
    let bruto: string | null = null;
    try {
      bruto = localStorage.getItem(chave);
    } catch {
      return;
    }
    if (!bruto) return;
    let r: Rascunho | null = null;
    try {
      r = JSON.parse(bruto) as Rascunho;
    } catch {
      r = null;
    }
    if (!r || !r.campos || typeof r.campos !== "object") {
      try {
        localStorage.removeItem(chave);
      } catch {
        // sem armazenamento
      }
      return;
    }
    if (r.enviado && !temErro) {
      try {
        localStorage.removeItem(chave);
      } catch {
        // sem armazenamento
      }
      return;
    }
    setRascunho(r.campos);
    setRestaurado(true);
    setVersao((v) => v + 1);
    // Se voltamos por erro do servidor, o rascunho segue vivo e "reaberto".
    if (r.enviado) {
      try {
        localStorage.setItem(chave, JSON.stringify({ campos: r.campos, enviado: false, atualizadoEm: new Date().toISOString() }));
      } catch {
        // sem armazenamento
      }
    }
  }, [chave, temErro]);

  function descartar() {
    apagar();
    setRascunho(null);
    setRestaurado(false);
    setVersao((v) => v + 1);
  }

  const d = (campo: string, padrao = "") => rascunho?.[campo] ?? padrao;

  return (
    <>
      {restaurado ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-100">
          <span>rascunho restaurado — continuamos de onde você parou.</span>
          <button
            type="button"
            onClick={descartar}
            className="rounded-lg border border-white/15 px-2.5 py-1 text-[11px] text-amber-100 transition hover:bg-white/10"
          >
            descartar rascunho
          </button>
        </div>
      ) : null}

      <form
        ref={formRef}
        action={criarCompraAction}
        className="space-y-4"
        onChange={() => gravar(false)}
        onBlur={() => gravar(false)}
        onSubmit={() => gravar(true)}
      >
        <div key={versao} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Data da compra" name="data" type="date" defaultValue={d("data", dataInicial)} required />
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/60">Fornecedor</span>
              <input
                name="fornecedor"
                required
                list="fornecedores-historico"
                placeholder="comece a digitar ou escolha um histórico"
                defaultValue={d("fornecedor")}
                className={INPUT}
              />
            </label>
          </div>
          <datalist id="fornecedores-historico">
            {fornecedores.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>

          <Area
            rotulo="Descrição"
            name="descricao"
            rows={2}
            defaultValue={d("descricao")}
            placeholder="o que foi comprado, número da nota, observações do pedido"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Valor (saída única)"
              name="valor"
              required
              placeholder="1.234,56"
              defaultValue={d("valor")}
              hint="aceita 1.234,56, R$ 1234,56 ou 1234.56"
            />
            <Selecao
              rotulo="Parcelas no total"
              name="parcelas_total"
              defaultValor={d("parcelas_total", "1")}
              opcoes={Array.from({ length: 12 }, (_, i) => ({
                valor: String(i + 1),
                rotulo: i === 0 ? "à vista (1 parcela)" : `${i + 1} parcelas`,
              }))}
            />
          </div>

          <Area
            rotulo="Observação interna (opcional)"
            name="observacao"
            rows={2}
            defaultValue={d("observacao")}
            placeholder="contexto para a conferência"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Botao>Registrar compra e ir para o rateio</Botao>
          <Link
            href="/compras"
            onClick={apagar}
            className="text-xs text-white/50 transition hover:text-white"
          >
            cancelar e voltar para a lista
          </Link>
        </div>
      </form>
    </>
  );
}
