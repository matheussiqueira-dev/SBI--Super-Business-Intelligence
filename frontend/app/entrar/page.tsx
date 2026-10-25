import type { Metadata } from 'next';
import { Suspense } from 'react';
import LoginForm from './login-form.tsx';
import { SbiLogo, SbiSymbol } from '../../components/brand/logo.tsx';
import ThemeSwitch from '../../components/theme-switch.tsx';

export const metadata: Metadata = { title: 'Entrar' };

/**
 * Entrada no sistema (manual v2.0, figuras 39 e 40): painel de marca em Tinta com o logotipo negativo, o slogan e o aviso de
 * dados ficticios; formulario sobre a Nevoa, sem cartao extra, com campos de 48 px. Abaixo de 1.024 px o painel vira faixa.
 */
export default function LoginPage() {
  return (
    <main className="login">
      <section className="login-panel" aria-label="Sobre o SBI">
        <SbiLogo tone="negativa" size={32} />
        <div className="stack-sm">
          <p className="login-headline">O mesmo número para toda a loja.</p>
          <p className="login-lead">Cada venda baixa o estoque e conta para a meta de quem vendeu. Gerente e vendedor veem o mesmo resultado.</p>
        </div>
        <p className="login-footer"><span>Ambiente de demonstração · dados fictícios</span><span>Projeto A3 · UNIFG 2026</span></p>
        <SbiSymbol tone="mono" decorative size={420} className="login-mark" />
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
          <div className="login-tools"><ThemeSwitch /></div>
        </section>
      </div>
    </main>
  );
}
