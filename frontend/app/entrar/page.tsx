import type { Metadata } from 'next';
import { Suspense } from 'react';
import LoginForm from './login-form.tsx';
import { SbiLogo } from '../../components/brand/logo.tsx';

export const metadata: Metadata = { title: 'Entrar' };

/** Login da identidade v2.0: painel Tinta com a assinatura negativa, o slogan e o cartao do formulario; abaixo de 1024 px, faixa. */
export default function LoginPage() {
  return (
    <main className="login">
      <section className="login-panel" aria-label="Sobre o SBI">
        <SbiLogo layout="descritor" tone="negativa" size={44} />
        <div className="stack-sm">
          <p className="display login-headline">O mesmo número para toda a loja.</p>
          <p className="login-lead">Cada venda baixa o estoque e conta para a meta de quem vendeu. Gerente e vendedor veem o mesmo resultado.</p>
        </div>
        <p className="login-footer"><span>Ambiente de demonstração · dados fictícios</span><span>Projeto A3 · UNIFG 2026</span></p>
      </section>
      <div className="login-form">
        <section className="card" aria-labelledby="login-title">
          <h1 id="login-title">Entrar no SBI</h1>
          <p className="muted">Use o e-mail da loja.</p>
          <Suspense fallback={<p role="status">Carregando…</p>}>
            <LoginForm />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
