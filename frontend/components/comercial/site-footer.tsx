// Rodape da oferta comercial: Entrar, Suporte, Status e Privacidade (plano comercial, secao 03).
// Canal nao configurado nao vira link morto -- ou aponta para a pagina interna, ou diz que falta publicar.
import Link from 'next/link';
import { SbiLogo } from '../brand/logo.tsx';
import { FOOTER, ROUTES } from '../../lib/comercial/copy.ts';

export default function SiteFooter({ supportUrl, statusUrl }: { supportUrl: string | null; statusUrl: string | null }) {
  return (
    <footer className="c-footer">
      <div className="c-footer-inner">
        <div className="c-footer-brand">
          <SbiLogo tone="negativa" size={26} />
          <p>{FOOTER.tagline}</p>
        </div>
        <nav aria-label="Links do rodapé">
          <ul>
            <li><Link href={ROUTES.login}>Entrar</Link></li>
            <li><Link href={ROUTES.demo}>Demonstração</Link></li>
            <li>
              {supportUrl ? <a href={supportUrl} rel="noreferrer">Suporte</a> : <Link href={ROUTES.support}>Suporte</Link>}
            </li>
            <li>
              {statusUrl ? <a href={statusUrl} rel="noreferrer">Status</a> : <span className="c-muted">Status a publicar</span>}
            </li>
            <li><Link href={ROUTES.privacy}>Privacidade</Link></li>
          </ul>
        </nav>
      </div>
      <p className="c-footer-fine">
        {FOOTER.product}. Emissão fiscal, processamento de pagamento, operação offline, marketplaces e gestão de
        várias unidades são escopos a homologar à parte e não estão incluídos na oferta inicial.
      </p>
    </footer>
  );
}
