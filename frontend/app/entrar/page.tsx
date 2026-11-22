import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import LoginForm from './login-form.tsx';
import { SbiLogo } from '../../components/brand/logo.tsx';
import LoginReveal, { REVEAL_SCRIPT } from '../../components/brand/login-reveal.tsx';
import ThemeSwitch from '../../components/theme-switch.tsx';
import AcademicCredits from '../../components/academic-credits.tsx';
import { channels } from '../../lib/comercial/config.ts';
import { isCommercial } from '../../lib/edition.ts';
import { ROUTES } from '../../lib/comercial/copy.ts';

/** O login nunca e indexado, em nenhuma edicao. */
export const metadata: Metadata = { title: 'Entrar', robots: { index: false, follow: false } };

/**
 * Entrada no sistema (manual v2.0, figuras 39 e 40): painel de marca em Tinta com o logotipo negativo, o slogan e o
 * aviso da edicao; formulario sobre a Nevoa, sem cartao extra, com campos de 48 px. Abaixo de 1.024 px o painel
 * vira faixa.
 *
 * Revelacao decorativa de ~600 ms (plano comercial, secao 07): o logotipo oficial e o formulario estao na primeira
 * pintura e utilizaveis desde ela. O que entra em sequencia e a camada decorativa -- bloco, ponto e, por ultimo, o
 * texto de marca e os elementos de apoio. Roda uma vez por aba e nao reinicia depois de um erro de login. Com
 * prefers-reduced-motion: reduce, ou sem o script, a tela aparece direto no estado final.
 */
export default function LoginPage() {
  const commercial = isCommercial();
  const { supportUrl } = channels();
  return (
    <main className="login">
      <script dangerouslySetInnerHTML={{ __html: REVEAL_SCRIPT }} />
      <section className="login-panel" aria-label="Sobre o SBI">
        <SbiLogo tone="negativa" size={32} />
        <div className="stack-sm">
          <p className="login-headline">O mesmo número para toda a loja.</p>
          <p className="login-lead">Cada venda baixa o estoque e conta para a meta de quem vendeu. Gerente e vendedor veem o mesmo resultado.</p>
        </div>
        {commercial ? (
          <p className="login-footer">
            <span>Acesso da equipe da loja</span>
            <span>
              {supportUrl
                ? <a href={supportUrl} rel="noreferrer">Suporte</a>
                : <Link href={ROUTES.support}>Suporte</Link>}
              {' · '}
              <Link href={ROUTES.home}>Conhecer o SBI</Link>
            </span>
          </p>
        ) : (
          <p className="login-footer"><span>Ambiente de demonstração · dados fictícios</span><span>Projeto A3 · UNIFG 2026</span></p>
        )}
        <LoginReveal size={420} />
      </section>
      <div className="login-form">
        <section className="login-box" aria-labelledby="login-title">
          <header>
            <h1 id="login-title">Entrar no SBI</h1>
            <p className="muted">Use o e-mail da loja.</p>
          </header>
          <Suspense fallback={<p role="status" className="muted">Carregando…</p>}>
            <LoginForm />
          </Suspense>
          <div className="login-demo">
            <p>Conheça o SBI e explore os diferentes níveis de gestão de uma loja de varejo.</p>
            <Link className="btn btn-block" href={ROUTES.demo}>Explorar demonstração</Link>
          </div>
          <div className="login-tools"><ThemeSwitch /></div>
        </section>
        {commercial
          ? <p className="login-help"><Link href={ROUTES.home}>Página do produto</Link> · <Link href={ROUTES.privacy}>Privacidade</Link></p>
          : <AcademicCredits centered />}
      </div>
    </main>
  );
}
