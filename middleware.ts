import { NextResponse, type NextRequest } from "next/server";

// Checa apenas a presença do cookie: a validação real da sessão (expiração,
// usuário ativo) acontece na camada de dados, em lib/auth.ts.
const PUBLICAS = ["", "/", "/login", "/registro", "/favicon.ico", "/manifest.webmanifest"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLICAS.includes(pathname)) return NextResponse.next();
  if (pathname.startsWith("/_next") || pathname.startsWith("/api/auth")) return NextResponse.next();

  const token = request.cookies.get("sid")?.value;
  if (!token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("retorno", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
