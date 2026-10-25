import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { avatarClass, menuFor, menuGroups, PASSWORD_PATH, roleLabel } from '../../lib/areas.ts';
import { initials } from '../../lib/format.ts';
import { currentUser } from '../../lib/server/session.ts';
import NavLinks from '../../components/nav-links.tsx';
import LogoutButton from '../../components/logout-button.tsx';
import Sidebar from '../../components/sidebar.tsx';
import ThemeSwitch from '../../components/theme-switch.tsx';
import AcademicCredits from '../../components/academic-credits.tsx';

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
          <span className={`avatar ${avatarClass(user.role)}`} aria-hidden="true">{initials(user.name)}</span>
          <span><span className="account-name">{user.name}</span><span className="account-role">{roleLabel(user.role)}</span></span>
          <LogoutButton compact />
        </div>
        <div className="account-tools">
          <span className="caption">Tema</span>
          <ThemeSwitch />
        </div>
      </Sidebar>
      <main id="conteudo" className="main" tabIndex={-1}>
        <div className="content">
          {children}
          <footer className="app-footer">
            <p>Dados de demonstração · valores fictícios · Projeto A3 · UNIFG 2026</p>
            <p><Link href="/creditos">Créditos das imagens</Link></p>
            <AcademicCredits />
          </footer>
        </div>
      </main>
    </div>
  );
}
