'use client';
import { useId, type ReactNode } from 'react';
import { useModal } from './use-modal.ts';
import { Icon } from './brand/icons.tsx';

/** Painel lateral com <dialog> nativo: foco preso, Esc fecha e o foco volta para quem abriu. Raio 16 e sombra de menu. */
export default function Drawer({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useModal(open);
  const id = useId();
  return (
    <dialog ref={ref} className="drawer" aria-labelledby={id} onClose={onClose}>
      <div className="stack">
        <div className="drawer-head">
          <h2 id={id}>{title}</h2>
          <button type="button" className="btn btn-quiet" onClick={onClose}><Icon name="fechar" />Fechar</button>
        </div>
        {open && children}
      </div>
    </dialog>
  );
}
