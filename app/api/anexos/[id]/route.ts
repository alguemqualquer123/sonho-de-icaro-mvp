import fs from "node:fs";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { UPLOADS_DIR } from "@/lib/db";
import { obterAnexo, obterCompra } from "@/lib/compras";
import { usuarioAtual } from "@/lib/auth";
import { PERMISSOES, pode } from "@/lib/rbac";
import { mensagemDe } from "@/lib/regras";

// Download autenticado: local sai do disco; remoto (FiveManage) é feito proxy
// pelo servidor para continuar exigindo login — nunca expomos a URL do CDN.
export async function GET(_request: NextRequest, contexto: { params: Promise<{ id: string }> }) {
  try {
    const usuario = await usuarioAtual();
    if (!usuario) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
    const { id } = await contexto.params;
    const anexo = await obterAnexo(Number(id));
    const compra = await obterCompra(anexo.compra_id);
    const visivel =
      pode(usuario.papel, PERMISSOES.comprasVerTodas) ||
      compra.responsavel_id === usuario.id ||
      pode(usuario.papel, PERMISSOES.alocacoesEditar);
    if (!visivel) return NextResponse.json({ erro: "sem permissão" }, { status: 403 });

    const cabecalhos = {
      "Content-Type": anexo.mime || "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(anexo.nome_arquivo)}`,
      "Cache-Control": "private, max-age=60",
    };
    if (anexo.remoto_url) {
      const remoto = await fetch(anexo.remoto_url);
      if (!remoto.ok) return NextResponse.json({ erro: "arquivo ausente no storage" }, { status: 410 });
      const buffer = Buffer.from(await remoto.arrayBuffer());
      return new NextResponse(buffer, {
        headers: { ...cabecalhos, "Content-Length": String(buffer.byteLength) },
      });
    }

    const absoluto = path.join(UPLOADS_DIR, path.basename(anexo.caminho));
    if (!fs.existsSync(absoluto)) return NextResponse.json({ erro: "arquivo ausente no storage" }, { status: 410 });
    const buffer = fs.readFileSync(absoluto);
    return new NextResponse(buffer, {
      headers: {
        ...cabecalhos,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (erro) {
    return NextResponse.json({ erro: mensagemDe(erro) }, { status: 400 });
  }
}
