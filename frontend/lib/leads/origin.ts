// Conferencia de mesma origem do handler da cotacao.
//
// Nao usa a URL da requisicao: num handler do Next a URL vem da reescrita interna e nem sempre carrega o host que
// o navegador usou, entao comparar com ela recusa envios legitimos. A autoridade e o par de cabecalhos que o
// navegador manda: Sec-Fetch-Site quando existe e, para quem nao envia, Origin comparado ao Host.
//
// Fica fora de route.ts para o teste unitario rodar sem o runtime do Next.

/** Requisicao sem Origin e sem Sec-Fetch-Site (curl, verificacao sintetica, teste) passa: a barreira e contra o
 *  navegador de outro site, nao contra cliente automatizado -- o volume desses e limitado pelo rate limit. */
export function isSameOrigin(headers: Headers): boolean {
  const site = headers.get('sec-fetch-site');
  // "none" e navegacao direta (o proprio usuario abriu a pagina); "same-origin" e a pagina chamando a si mesma.
  if (site) return site === 'same-origin' || site === 'none';

  const origin = headers.get('origin');
  if (!origin) return true;
  const host = headers.get('x-forwarded-host') ?? headers.get('host');
  if (!host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host.split(',')[0]?.trim().toLowerCase();
  } catch {
    return false;
  }
}
