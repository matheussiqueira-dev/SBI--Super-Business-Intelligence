'use client';
import { useState } from 'react';
import { authApi } from '../lib/api/auth.ts';
import { api } from '../lib/api/http.ts';
import { Icon } from './brand/icons.tsx';

const auth = authApi(api);

/** Sair da conta. Na barra lateral e so o icone (nome acessivel "Sair"); nas demais telas, icone e texto. */
export default function LogoutButton({ compact = false }: { compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try {
      await auth.logout();
    } finally {
      window.location.assign('/entrar');
    }
  }
  if (compact) {
    return (
      <button type="button" className="btn btn-quiet btn-icon" onClick={logout} disabled={busy} aria-label={busy ? 'Saindo…' : 'Sair'} title="Sair">
        <Icon name="sair" />
      </button>
    );
  }
  return <button type="button" className="btn btn-quiet" onClick={logout} disabled={busy}><Icon name="sair" />{busy ? 'Saindo…' : 'Sair'}</button>;
}
