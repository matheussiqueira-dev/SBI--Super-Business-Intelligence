// Moldura das paginas de texto da edicao comercial (privacidade e suporte): mesmo cabecalho e rodape da landing,
// conteudo em uma coluna de leitura. Nao le sessao nem chama a API.
import type { ReactNode } from 'react';
import { channels } from '../../lib/comercial/config.ts';
import SiteFooter from './site-footer.tsx';
import SiteHeader from './site-header.tsx';

export default function TextPage({ children }: { children: ReactNode }) {
  const { supportUrl, statusUrl } = channels();
  return (
    <div className="c-site">
      <a className="skip-link" href="#conteudo">Ir para o conteúdo</a>
      <SiteHeader supportUrl={supportUrl} />
      <main id="conteudo">
        <article className="c-prose">{children}</article>
      </main>
      <SiteFooter supportUrl={supportUrl} statusUrl={statusUrl} />
    </div>
  );
}
