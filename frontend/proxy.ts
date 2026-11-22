// Next.js 16: sem cookie de sessao, qualquer tela interna vai para /entrar?next=... (WP-3.4).
// A checagem de area acontece no layout de cada area, com /auth/me; a API e a autoridade final.
//
// A lista exata das rotas publicas, e o porque de cada uma, esta em lib/public-routes.ts.
import { NextResponse, type NextRequest } from 'next/server';
import { isPublicPath } from './lib/public-routes.ts';

export function proxy(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) return NextResponse.next();
  if (request.cookies.has('JSESSIONID')) return NextResponse.next();
  const login = new URL('/entrar', request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== '/') login.searchParams.set('next', next);
  return NextResponse.redirect(login);
}

export const config = {
  // O matcher deixa de fora o que nunca precisa de sessao (estatico do Next e arquivos com extensao) e tambem
  // /api/backend, que repassa o cookie para a API Java decidir. O resto passa por isPublicPath.
  matcher: ['/((?!api/backend|_next/static|_next/image|favicon.ico|icon.svg|.*\\.[a-z0-9]+$).*)'],
};
