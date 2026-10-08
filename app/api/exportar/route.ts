import { NextResponse, type NextRequest } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { PERMISSOES, pode } from "@/lib/rbac";
import { gerarRelatorio, paraCsv, TIPOS_RELATORIO, type TipoRelatorio } from "@/lib/relatorios";
import { mensagemDe } from "@/lib/regras";

// Exportação CSV. O total da última linha segue a regra anti-dupla-contagem:
// relatórios de alocação somam rateio; os demais somam compras.
export async function GET(request: NextRequest) {
  try {
    const usuario = await usuarioAtual();
    if (!usuario) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
    if (!pode(usuario.papel, PERMISSOES.exportar)) {
      return NextResponse.json({ erro: `o perfil ${usuario.papel} não pode exportar` }, { status: 403 });
    }
    const busca = request.nextUrl.searchParams;
    const tipo = (busca.get("tipo") ?? "por-setor") as TipoRelatorio;
    const mes = busca.get("mes") ?? "";
    if (!TIPOS_RELATORIO.some((t) => t.tipo === tipo)) {
      return NextResponse.json({ erro: "relatório desconhecido" }, { status: 400 });
    }
    const tabela = await gerarRelatorio(tipo, usuario, mes);
    const nome = `${tipo}${mes ? `-${mes}` : ""}.csv`;
    return new NextResponse(paraCsv(tabela), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nome}"`,
      },
    });
  } catch (erro) {
    return NextResponse.json({ erro: mensagemDe(erro) }, { status: 400 });
  }
}
