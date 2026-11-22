// Secoes de prova, publico, implantacao, dados e FAQ da pagina comercial (plano comercial, secoes 03 a 06).
//
// As capturas sao do proprio produto, tiradas da demonstracao com dados sinteticos (scripts/comercial-capturas.mjs).
// Cada uma carrega o selo "Dados de demonstração" na legenda: a prova mostra a tela de verdade e ninguem confunde
// o numero da imagem com o numero de uma loja.
import Link from 'next/link';
import { AUDIENCE, DATA, DEPLOYMENT, FAQ, MODULES, ROUTES } from '../../lib/comercial/copy.ts';
import { SUPPORT_TEXT, type SupportCoverage } from '../../lib/comercial/config.ts';

export const DEMO_BADGE = 'Dados de demonstração';

function Shot({ file, alt }: { file: string; alt: string }) {
  return (
    <figure className="c-shot">
      <img
        src={`/comercial/${file}-960.webp`}
        srcSet={`/comercial/${file}-640.webp 640w, /comercial/${file}-960.webp 960w`}
        sizes="(min-width: 900px) 52vw, 100vw"
        width={960}
        height={600}
        alt={alt}
        loading="lazy"
        decoding="async"
      />
      <figcaption><span className="c-badge">{DEMO_BADGE}</span> Captura da demonstração pública do SBI.</figcaption>
    </figure>
  );
}

export function Modules() {
  return (
    <section id="produto" className="c-section" aria-labelledby="c-produto-title">
      <div className="c-section-head">
        <p className="c-kicker">Produto</p>
        <h2 id="c-produto-title">Do atendimento ao fechamento</h2>
        <p className="c-section-lead">Use a mesma venda nas três visões: o item reservado no balcão, a baixa no estoque ao confirmar o pagamento e o indicador que a gestão consulta.</p>
      </div>
      <div className="c-modules">
        {MODULES.map(module => (
          <article key={module.id} className="c-module" aria-labelledby={`c-module-${module.id}`}>
            <div className="c-module-text">
              <p className="c-kicker">{module.kicker}</p>
              <h3 id={`c-module-${module.id}`}>{module.title}</h3>
              <p>{module.body}</p>
              <ul className="c-list">
                {module.points.map(point => <li key={point}>{point}</li>)}
              </ul>
            </div>
            <Shot file={module.shot.file} alt={module.shot.alt} />
          </article>
        ))}
      </div>
    </section>
  );
}

export function Audience() {
  return (
    <section id="publico" className="c-section c-section-tint" aria-labelledby="c-publico-title">
      <div className="c-section-head">
        <p className="c-kicker">Público</p>
        <h2 id="c-publico-title">{AUDIENCE.title}</h2>
        <p className="c-section-lead">{AUDIENCE.lead}</p>
      </div>
      <div className="c-two">
        <div className="c-card">
          <h3>Onde o SBI já resolve</h3>
          <ul className="c-list">{AUDIENCE.fits.map(item => <li key={item}>{item}</li>)}</ul>
        </div>
        <div className="c-card">
          <h3>O que confirmamos antes de cotar</h3>
          <ul className="c-list c-list-check">{AUDIENCE.checks.map(item => <li key={item}>{item}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}

export function Deployment() {
  return (
    <section id="implantacao" className="c-section" aria-labelledby="c-implantacao-title">
      <div className="c-section-head">
        <p className="c-kicker">Implantação</p>
        <h2 id="c-implantacao-title">{DEPLOYMENT.title}</h2>
        <p className="c-section-lead">{DEPLOYMENT.lead}</p>
      </div>
      <ol className="c-steps">
        {DEPLOYMENT.steps.map((step, index) => (
          <li key={step.title}>
            <p className="c-step-n" aria-hidden="true">{String(index + 1).padStart(2, '0')}</p>
            <h3>{step.title}</h3>
            <p><span className="c-step-who">SBI</span> {step.sbi}</p>
            <p><span className="c-step-who">Sua loja</span> {step.store}</p>
          </li>
        ))}
      </ol>
      <p className="c-note">{DEPLOYMENT.note}</p>
    </section>
  );
}

export function DataAndSupport({ coverage, supportUrl, statusUrl, dutyPhone }: {
  coverage: SupportCoverage; supportUrl: string | null; statusUrl: string | null; dutyPhone: string | null;
}) {
  const support = SUPPORT_TEXT[coverage];
  return (
    <section id="dados" className="c-section c-section-ink" aria-labelledby="c-dados-title">
      <div className="c-section-head">
        <p className="c-kicker">Dados e suporte</p>
        <h2 id="c-dados-title">{DATA.title}</h2>
        <p className="c-section-lead">{DATA.lead}</p>
      </div>
      <div className="c-two">
        <div className="c-panel">
          <h3>Acesso por perfil</h3>
          <dl className="c-roles">
            {DATA.rows.map(row => (
              <div key={row.role}>
                <dt>{row.role}</dt>
                <dd>{row.access}</dd>
              </div>
            ))}
          </dl>
          <p className="c-panel-note">
            Consulte o <Link href={ROUTES.privacy}>Aviso de Privacidade</Link> para saber como tratamos dados pessoais e como entrar em contato.
          </p>
        </div>
        <div className="c-panel">
          <h3>{support.title}</h3>
          <p>{support.body}</p>
          <ul className="c-links">
            <li>
              {supportUrl
                ? <a href={supportUrl} rel="noreferrer">Central de suporte</a>
                : <Link href={ROUTES.support}>Canais de suporte</Link>}
            </li>
            {statusUrl
              ? <li><a href={statusUrl} rel="noreferrer">Status do serviço</a></li>
              : <li><span className="c-muted">Página de status a publicar</span></li>}
            {dutyPhone && <li><a href={`tel:${dutyPhone}`}>Plantão para operação parada</a></li>}
          </ul>
          <p className="c-panel-note">A central de chamados e a página de status ficam fora do ambiente da loja e continuam acessíveis durante uma indisponibilidade do aplicativo.</p>
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className="c-section" aria-labelledby="c-faq-title">
      <div className="c-section-head">
        <p className="c-kicker">Dúvidas</p>
        <h2 id="c-faq-title">Perguntas frequentes</h2>
      </div>
      <div className="c-faq">
        {FAQ.map(item => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
