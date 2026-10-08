import fs from "node:fs";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import {UPLOADS_DIR } from "@/lib/db";
import { obterAnexo, obterCompra, podeVerCompra } from "@/lib/compras";
import { usuarioAtual } from "@/lib/auth";
import { mensagemDe } from "@/lib/regras";

// Download autenticado: o arquivo nunca é servido por URL pública nem pré-assinada.
export async function GET(_request: NextRequest, contexto: { params: Promise<{ id: string }> }) {
  try {
    const usuario = await usuarioAtual();
    if (!usuario) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
    const { id } = await contexto.params;
    const anexo = obterAnexo(Number(id));
    const compra = obterCompra(anexo.compra_id);
    if (!podeVerCompra(usuario, compra)) return NextResponse.json({ erro: "sem permissão" }, { status: 403 });

    const absoluto = path.join(UPLOADS_DIR, path.basename(anexo.caminho));
    if (!fs.existsSync(absoluto)) return NextResponse.json({ erro: "arquivo ausente no storage" }, { status: 410 });
    const buffer = fs.readFileSync(absoluto);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": anexo.mime || "application/octet-stream",
        "Content-Length": String(buffer.byteLength),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(anexo.nome_arquivo)}`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (erro) {
    return NextResponse.json({ erro: mensagemDe(erro) }, { status: 400 });
  }
}
