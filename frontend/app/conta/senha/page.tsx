import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { menuFor, PASSWORD_PATH } from '../../../lib/areas.ts';
import { currentUser } from '../../../lib/server/session.ts';
import PasswordForm from './password-form.tsx';
import LogoutButton from '../../../components/logout-button.tsx';
import { SbiLogo } from '../../../components/brand/logo.tsx';

export const metadata: Metadata = { title: 'Minha senha' };

/** Fora do grupo (app): com senha provisoria o layout das areas redireciona para ca, sem laco. Formulario sobre a Nevoa. */
export default async function PasswordPage() {
  const user = await currentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(PASSWORD_PATH)}`);
  const required = user.areas.includes('TROCAR_SENHA');
  const back = menuFor(user.areas)[0]?.href;
  return (
    <main className="login login-single">
      <div className="login-form">
        <section className="login-box" aria-labelledby="senha-titulo">
          <SbiLogo size={32} />
          <header>
            <h1 id="senha-titulo">{required ? 'Troque a senha provisória' : 'Alterar minha senha'}</h1>
            <p className="muted">
              {required
                ? `Olá, ${user.name}. Para continuar, crie uma senha só sua.`
                : 'Ao trocar a senha, as suas outras sessões abertas são encerradas.'}
            </p>
          </header>
          <PasswordForm email={user.email} />
          <div className="actions">
            {back && <a className="btn btn-ghost" href={back}>Voltar sem alterar</a>}
            <LogoutButton />
          </div>
        </section>
      </div>
    </main>
  );
}
