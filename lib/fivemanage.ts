const BASE = "https://api.fivemanage.com/api/v3";

// Comprovantes (fotos) vão para o CDN do FiveManage; PDF continua em disco
// local e o disco local é fallback se a API falhar. A chave vive em
// FIVEMANAGE_API_KEY (.env.local, fora do git).

export function chaveFiveManage(): string {
  const v = process.env.FIVEMANAGE_API_KEY;
  if (!v) return "";
  return v.trim().replace(/^["']+|["']+$/g, "").trim();
}

export function temFiveManage(): boolean {
  return chaveFiveManage().length > 0;
}

export type ArquivoRemoto = { id: string; url: string };

function erroApi(acao: string, status: number, corpo: string): Error {
  return new Error(`FiveManage: ${acao} falhou (HTTP ${status}): ${corpo.slice(0, 200)}`);
}

export async function enviarArquivoFiveManage(entrada: {
  buffer: Buffer;
  nome: string;
  mime: string;
}): Promise<ArquivoRemoto> {
  const chave = chaveFiveManage();
  if (!chave) throw new Error("FiveManage: defina FIVEMANAGE_API_KEY no .env.local");
  const fd = new FormData();
  fd.append("file", new Blob([new Uint8Array(entrada.buffer)], { type: entrada.mime }), entrada.nome);
  fd.append("filename", entrada.nome);
  fd.append("path", "sonho-de-icaro/comprovantes");
  fd.append("metadata", JSON.stringify({ name: entrada.nome }));
  const resp = await fetch(`${BASE}/file`, {
    method: "POST",
    headers: { Authorization: chave },
    body: fd,
  });
  const texto = await resp.text();
  if (!resp.ok) throw erroApi("upload", resp.status, texto);
  let dado: { status?: string; data?: { id?: string; url?: string } };
  try {
    dado = JSON.parse(texto) as typeof dado;
  } catch {
    throw new Error(`FiveManage: resposta de upload inválida: ${texto.slice(0, 200)}`);
  }
  if (!dado.data?.id || !dado.data?.url) {
    throw new Error(`FiveManage: upload sem id/url: ${texto.slice(0, 200)}`);
  }
  return { id: dado.data.id, url: dado.data.url };
}

export async function excluirArquivoFiveManage(id: string): Promise<void> {
  const chave = chaveFiveManage();
  if (!chave || !id) return;
  const resp = await fetch(`${BASE}/file/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: chave },
  });
  // 404 = já sumiu do CDN; nada a fazer.
  if (resp.ok || resp.status === 404) return;
  throw erroApi("exclusão", resp.status, await resp.text());
}
