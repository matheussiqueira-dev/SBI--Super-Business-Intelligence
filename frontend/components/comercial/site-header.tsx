// Cabecalho da oferta comercial: logo, Produto, Implantacao, Suporte, Entrar e Solicitar cotacao.
//
// No celular os itens secundarios entram num <details>: o navegador cuida de abrir, fechar, foco e teclado, e o
// menu continua funcionando sem JavaScript. "Entrar" e a acao principal nunca entram no menu -- ficam sempre
// visiveis, como o plano pede (secao 03).
import Link from 'next/link';
import { SbiLogo } from '../brand/logo.tsx';
import { HERO, NAV, ROUTES } from '../../lib/comercial/copy.ts';

export default function SiteHeader({ supportUrl }: { supportUrl?: string | null }) {
  const items = NAV.map(item => (item.href === ROUTES.support && supportUrl ? { ...item, href: supportUrl } : item));
  return (
    <header className="c-header">
      <div className="c-header-inner">
        <Link href={ROUTES.home} className="c-header-logo" aria-label="SBI — Super Business Intelligence, página inicial">
          <SbiLogo size={28} />
        </Link>

        <nav className="c-header-nav" aria-label="Seções do site">
          <ul>
            {items.map(item => (
              <li key={item.label}>
                <a href={item.href} {...(item.href.startsWith('http') ? { rel: 'noreferrer' } : {})}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="c-header-actions">
          <Link className="btn btn-quiet" href={ROUTES.login}>Entrar</Link>
          <a className="btn btn-primary" href={HERO.primary.href}>{HERO.primary.label}</a>
        </div>

        <details className="c-header-menu">
          <summary aria-label="Abrir menu de seções">
            <span aria-hidden="true" className="c-header-bars" />
            <span className="c-header-menu-text">Menu</span>
          </summary>
          <nav aria-label="Seções do site, menu do celular">
            <ul>
              {items.map(item => (
                <li key={item.label}>
                  <a href={item.href} {...(item.href.startsWith('http') ? { rel: 'noreferrer' } : {})}>{item.label}</a>
                </li>
              ))}
              <li><Link href={ROUTES.demo}>Demonstração</Link></li>
              <li><Link href={ROUTES.privacy}>Privacidade</Link></li>
            </ul>
          </nav>
        </details>
      </div>
    </header>
  );
}
