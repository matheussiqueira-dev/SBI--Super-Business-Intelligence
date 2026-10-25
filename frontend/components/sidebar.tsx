'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SbiLogo, SbiSymbol } from './brand/logo.tsx';
import { Icon } from './brand/icons.tsx';

/**
 * Barra lateral de 248 px com o logotipo horizontal; abaixo de 1.024 px vira a barra superior de 56 px com o simbolo e
 * "Menu" (manual v2.0, secao 31), e o menu recolhivel fecha ao trocar de tela.
 */
export default function Sidebar({ home, children }: { home: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => { setOpen(false); }, [pathname]);
  return (
    <aside className="sidebar" aria-label="Navegação principal" data-open={open}>
      <div className="sidebar-top">
        <a className="brand-link" href={home}>
          <span className="brand-full"><SbiLogo size={28} /></span>
          <span className="brand-compact"><SbiSymbol size={28} /></span>
        </a>
        <button type="button" className="btn btn-quiet nav-toggle" aria-expanded={open} aria-controls="menu-principal"
                onClick={() => setOpen(value => !value)}>
          <Icon name={open ? 'fechar' : 'menu'} />{open ? 'Fechar menu' : 'Menu'}
        </button>
      </div>
      <div className="sidebar-body" id="menu-principal">{children}</div>
    </aside>
  );
}
