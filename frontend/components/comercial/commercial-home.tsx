// Pagina publica da oferta comercial, na ordem do plano (secao 03): cabecalho, primeira dobra, modulos do
// produto, publico, implantacao, dados e suporte, FAQ, formulario e rodape.
//
// Nada aqui le sessao nem chama a API do PDV: a pagina renderiza com a venda e o login fora do ar. A unica
// informacao vinda do servidor e a configuracao da edicao (canais e estado da captacao).
import { channels, supportCoverage } from '../../lib/comercial/config.ts';
import { QUOTE } from '../../lib/comercial/copy.ts';
import { quoteMode } from '../../lib/leads/runtime.ts';
import Hero from './hero.tsx';
import QuoteForm from './quote-form.tsx';
import SiteFooter from './site-footer.tsx';
import SiteHeader from './site-header.tsx';
import { Audience, DataAndSupport, Deployment, Faq, Modules } from './sections.tsx';

export default function CommercialHome() {
  const { supportUrl, statusUrl, dutyPhone, salesEmail } = channels();
  const coverage = supportCoverage();
  const quoteAvailable = quoteMode() !== 'desligado';

  return (
    <div className="c-site">
      <a className="skip-link" href="#conteudo">Ir para o conteúdo</a>
      <SiteHeader supportUrl={supportUrl} />
      <main id="conteudo">
        <Hero />
        <Modules />
        <Audience />
        <Deployment />
        <DataAndSupport coverage={coverage} supportUrl={supportUrl} statusUrl={statusUrl} dutyPhone={dutyPhone} />
        <Faq />
        <section id="cotacao" className="c-section c-quote" aria-labelledby="c-cotacao-title">
          <div className="c-quote-head">
            <p className="c-kicker">Cotação</p>
            <h2 id="c-cotacao-title">{QUOTE.title}</h2>
            <p className="c-section-lead">{QUOTE.lead}</p>
          </div>
          <QuoteForm available={quoteAvailable} salesEmail={salesEmail} supportUrl={supportUrl} />
        </section>
      </main>
      <SiteFooter supportUrl={supportUrl} statusUrl={statusUrl} />
    </div>
  );
}
