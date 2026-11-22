// Rotas publicas da aplicacao, em lista exata (plano comercial, secao 11).
//
// Fica fora de proxy.ts para o teste unitario exercitar a regra sem carregar o runtime do Next, e para a revisao
// ver num lugar so tudo o que abre sem cookie de sessao:
//
//   /entrar      autenticacao.
//   /demo e /demo/*  demonstracao sem login: nao chama a API nem le cookie.
//   /privacidade e /suporte  paginas da oferta; o suporte precisa abrir durante indisponibilidade do aplicativo.
//   /api/cotacao handler da cotacao, de mesma origem e independente do PDV.
//
// A raiz depende da edicao:
//   comercial -> publica, porque "/" e a pagina da oferta e precisa abrir sem sessao;
//   academica -> nao publica, para o proxy continuar respondendo 307 para /entrar como antes desta mudanca.
//     Sem isso, "/" entraria na pagina, que chama redirect() ja com a resposta em streaming: o Next nao consegue
//     mais trocar o status e devolve 200 com meta refresh. O destino seria o mesmo, o caminho seria pior.
//
// Nada de prefixo solto: "/entrar-agora" ou "/api/cotacao/fila" nao sao publicos. Liberar rota aqui nao afrouxa
// autorizacao nenhuma -- as telas internas confirmam a area no servidor e a API recusa por perfil de qualquer forma.
import { EDITION, isCommercial, type Edition } from './edition.ts';

export const PUBLIC_PATHS: ReadonlySet<string> = new Set([
  '/entrar', '/demo', '/privacidade', '/suporte', '/api/cotacao',
]);

export const PUBLIC_PREFIXES: readonly string[] = ['/demo/'];

export function isPublicPath(pathname: string, edition: Edition = EDITION): boolean {
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  if (path === '/') return isCommercial(edition);
  return PUBLIC_PATHS.has(path) || PUBLIC_PREFIXES.some(prefix => path.startsWith(prefix));
}
