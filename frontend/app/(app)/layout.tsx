import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { menuFor, menuGroups, PASSWORD_PATH, roleLabel } from '../../lib/areas.ts';
import { initials } from '../../lib/format.ts';
import { currentUser } from '../../lib/server/session.ts';
import NavLinks from '../../components/nav-links.tsx';
import LogoutButton from '../../components/logout-button.tsx';
import Sidebar from '../../components/sidebar.tsx';
import AcademicCredits from '../../components/academic-credits.tsx';

const AVATAR: Readonly<Record<string, string>> = { CEO: 'avatar-ceo', GERENTE: 'avatar-gerente', VENDEDOR: 'avatar-vendedor' };

/** Shell das areas internas: menu montado a partir de UserSession.areas, so com telas existentes. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  if (!user) redirect('/entrar');
  // Senha provisoria: nenhuma area de trabalho ate a troca (a API responde 403 PASSWORD_CHANGE_REQUIRED).
  if (user.areas.includes('TROCAR_SENHA')) redirect(PASSWORD_PATH);
  const menu = menuFor(user.areas);
  return (
    <div className="shell">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <Sidebar home={menu[0]?.href ?? '/'}>
        <NavLinks groups={menuGroups(menu)} />
        <div className="account-box">
          <span className={`avatar ${AVATAR[user.role] ?? 'avatar-vendedor'}`} aria-hidden="true">{initials(user.name)}</span>
          <span><strong>{user.name}</strong><br /><span className="muted">{roleLabel(user.role)}</span></span>
          <div className="account-actions"><LogoutButton /></div>
        </div>
        <p className="sidebar-credits"><Link href="/creditos">Créditos das imagens</Link></p>
      </Sidebar>
      <main id="conteudo" className="main" tabIndex={-1}>
        {children}
        <AcademicCredits />
      </main>
    </div>
  );
}
