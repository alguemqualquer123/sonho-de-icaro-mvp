import Link from "next/link";
import type { ReactNode } from "react";
import { formatarCentavos } from "@/lib/numerario";

export const SUPERFICIE = "rounded-2xl border border-white/10 bg-white/[0.03]";
export const INPUT =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-indigo-400/60 focus:bg-white/[0.07]";

export function Painel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`${SUPERFICIE} ${className}`}>{children}</section>;
}

export function Cabecalho({
  titulo,
  descricao,
  acoes,
}: {
  titulo: string;
  descricao?: string;
  acoes?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">{titulo}</h1>
        {descricao ? <p className="mt-1 max-w-2xl text-sm text-white/55">{descricao}</p> : null}
      </div>
      {acoes ? <div className="flex flex-wrap items-center gap-2">{acoes}</div> : null}
    </div>
  );
}

export function Numero({
  rotulo,
  valor,
  nota,
  tom = "neutro",
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  tom?: "neutro" | "bom" | "alerta" | "ruim";
}) {
  const cores = {
    neutro: "text-white",
    bom: "text-emerald-300",
    alerta: "text-amber-300",
    ruim: "text-rose-300",
  }[tom];
  return (
    <div className={`${SUPERFICIE} p-4`}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-white/45">{rotulo}</p>
      <p className={`mt-2 text-xl font-semibold tabular-nums ${cores}`}>{valor}</p>
      {nota ? <p className="mt-1 text-xs text-white/45">{nota}</p> : null}
    </div>
  );
}

const SELOS: Record<string, string> = {
  rascunho: "bg-slate-400/15 text-slate-200 border-slate-300/25",
  enviada: "bg-amber-400/15 text-amber-200 border-amber-300/25",
  aprovada: "bg-emerald-400/15 text-emerald-200 border-emerald-300/25",
  contestada: "bg-rose-400/15 text-rose-200 border-rose-300/25",
  cancelada: "bg-zinc-500/15 text-zinc-300 border-zinc-400/25",
  auto: "bg-emerald-400/15 text-emerald-200 border-emerald-300/25",
  manual: "bg-indigo-400/15 text-indigo-200 border-indigo-300/25",
  nenhum: "bg-amber-400/15 text-amber-200 border-amber-300/25",
  ativo: "bg-emerald-400/15 text-emerald-200 border-emerald-300/25",
  inativo: "bg-zinc-500/15 text-zinc-300 border-zinc-400/25",
};

export function Selo({ valor, rotulo }: { valor: string; rotulo?: string }) {
  const classe = SELOS[valor] ?? "bg-white/10 text-white/70 border-white/15";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${classe}`}>
      {rotulo ?? valor}
    </span>
  );
}

export function Aviso({ tipo, children }: { tipo: "erro" | "ok" | "aviso"; children: ReactNode }) {
  const cores = {
    erro: "border-rose-400/30 bg-rose-500/10 text-rose-100",
    ok: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
    aviso: "border-amber-400/30 bg-amber-500/10 text-amber-100",
  }[tipo];
  return <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${cores}`}>{children}</div>;
}

export function Campo({
  rotulo,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
  min,
  step,
  hint,
}: {
  rotulo: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  min?: number | string;
  step?: number | string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-white/60">{rotulo}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        min={min}
        step={step}
        className={INPUT}
      />
      {hint ? <span className="mt-1 block text-[11px] text-white/35">{hint}</span> : null}
    </label>
  );
}

export function Area({
  rotulo,
  name,
  defaultValue,
  rows = 3,
  placeholder,
}: {
  rotulo: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-white/60">{rotulo}</span>
      <textarea name={name} rows={rows} defaultValue={defaultValue} placeholder={placeholder} className={INPUT} />
    </label>
  );
}

export type Opcao = { valor: string; rotulo: string; grupo?: string };

export function Botao({
  children,
  variante = "primario",
  type = "submit",
  name,
  value,
}: {
  children: ReactNode;
  variante?: "primario" | "secundario" | "perigo" | "fantasma";
  type?: "submit" | "button";
  name?: string;
  value?: string;
}) {
  const classes = {
    primario: "bg-indigo-500 text-white hover:bg-indigo-400 shadow-[0_0_24px_-6px] shadow-indigo-500/70",
    secundario: "bg-white/10 text-white hover:bg-white/15 border border-white/10",
    perigo: "bg-rose-500/80 text-white hover:bg-rose-500",
    fantasma: "text-white/70 hover:text-white hover:bg-white/5",
  }[variante];
  return (
    <button
      type={type}
      name={name}
      value={value}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition ${classes}`}
    >
      {children}
    </button>
  );
}

export function BotaoLink({
  href,
  children,
  variante = "primario",
}: {
  href: string;
  children: ReactNode;
  variante?: "primario" | "secundario";
}) {
  const classes = {
    primario: "bg-indigo-500 text-white hover:bg-indigo-400",
    secundario: "bg-white/10 text-white hover:bg-white/15 border border-white/10",
  }[variante];
  return (
    <Link href={href} className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition ${classes}`}>
      {children}
    </Link>
  );
}

export function Tabela({
  colunas,
  linhas,
  vazio,
}: {
  colunas: (string | ReactNode)[];
  linhas: ReactNode[][];
  vazio?: string;
}) {
  if (linhas.length === 0) return <Vazio>{vazio ?? "Nada por aqui ainda."}</Vazio>;
  return (
    <div className={`${SUPERFICIE} overflow-x-auto`}>
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-white/45">
            {colunas.map((c, i) => (
              <th key={i} className="px-4 py-3 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, i) => (
            <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
              {linha.map((celula, j) => (
                <td key={j} className="px-4 py-3 align-middle text-white/85">
                  {celula}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className={`${SUPERFICIE} px-4 py-10 text-center text-sm text-white/45`}>{children}</div>;
}

export function Valor({ centavos, negativoPermitido = true }: { centavos: number; negativoPermitido?: boolean }) {
  const texto = formatarCentavos(centavos);
  return (
    <span className={`tabular-nums ${negativoPermitido && centavos < 0 ? "text-rose-300" : ""}`}>{texto}</span>
  );
}

export function Barra({ percentual, tom = "indigo" }: { percentual: number; tom?: "indigo" | "emerald" | "amber" }) {
  const cor = { indigo: "bg-indigo-400", emerald: "bg-emerald-400", amber: "bg-amber-400" }[tom];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className={`h-full rounded-full ${cor}`} style={{ width: `${Math.max(0, Math.min(100, percentual))}%` }} />
    </div>
  );
}

export function Grade({ children, colunas = 4 }: { children: ReactNode; colunas?: 2 | 3 | 4 }) {
  const c = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[colunas];
  return <div className={`grid grid-cols-1 gap-3 ${c}`}>{children}</div>;
}

export function Linhas({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

export function Recado({ searchParams }: { searchParams: { erro?: string; ok?: string } }) {
  if (searchParams.erro) return <Aviso tipo="erro">{searchParams.erro}</Aviso>;
  if (searchParams.ok) return <Aviso tipo="ok">{searchParams.ok}</Aviso>;
  return null;
}
