import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { landingPath } from '../lib/areas.ts';
import { currentUser } from '../lib/server/session.ts';
import { HERO } from '../lib/comercial/copy.ts';
import { indexable, siteOrigin } from '../lib/comercial/config.ts';
import { EDITION, isCommercial } from '../lib/edition.ts';
import CommercialHome from '../components/comercial/commercial-home.tsx';
import './comercial.css';

/**
 * Raiz da aplicacao, nas duas edicoes (lib/edition.ts):
 *
 *  - comercial: a pagina publica da oferta. Renderiza sem sessao e sem chamar a API do PDV -- a venda ou o login
 *    fora do ar nao derrubam a landing. Quem ja tem conta entra por "Entrar", que continua levando cada perfil
 *    para a sua primeira area liberada.
 *  - academica (padrao): comportamento original, que leva cada perfil para a primeira area liberada pelo servidor
 *    e manda quem nao tem sessao para o login.
 */
export async function generateMetadata(): Promise<Metadata> {
  if (!isCommercial()) return { robots: { index: false, follow: false } };
  const origin = siteOrigin();
  return {
    title: 'SBI — venda no balcão, estoque e metas no mesmo sistema',
    description: HERO.lead,
    robots: indexable() ? { index: true, follow: true } : { index: false, follow: false },
    ...(origin ? { alternates: { canonical: `${origin}/` }, metadataBase: new URL(origin) } : {}),
  };
}

export default async function Home() {
  if (isCommercial(EDITION)) return <CommercialHome />;
  const user = await currentUser();
  redirect(user ? landingPath(user.areas) : '/entrar');
}
