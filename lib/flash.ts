import { redirect } from "next/navigation";
import { mensagemDe } from "./regras";

export function flashErro(erro: unknown): never {
  redirect(`?erro=${encodeURIComponent(mensagemDe(erro))}`);
}

// `base` pode já trazer query (?mes=, ?entidade=); o parâmetro é anexado sem
// duplicar o "?" para o filtro da tela sobreviver ao redirect.
function anexar(base: string, chave: string, valor: string): string {
  const separador = base.includes("?") ? "&" : "?";
  return `${base}${separador}${chave}=${encodeURIComponent(valor)}`;
}

export function flashSucesso(base: string, ok: string): never {
  redirect(anexar(base, "ok", ok));
}

export function flashFiltro(base: string, filtros: Record<string, string>): never {
  let url = base;
  for (const [chave, valor] of Object.entries(filtros)) {
    if (!valor) continue;
    url = anexar(url, chave, valor);
  }
  redirect(url);
}

export function texto(formData: FormData, campo: string, max = 400): string {
  return String(formData.get(campo) ?? "").trim().slice(0, max);
}

export function numero(formData: FormData, campo: string): number {
  const bruto = texto(formData, campo, 20);
  if (bruto === "") return 0;
  const n = Number(bruto);
  if (!Number.isInteger(n) || n < 0) throw new Error(`campo ${campo} inválido`);
  return n;
}

export function opcionalNumero(formData: FormData, campo: string): number | null {
  const bruto = texto(formData, campo, 20);
  if (bruto === "" || bruto === "0") return null;
  const n = Number(bruto);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`campo ${campo} inválido`);
  return n;
}
