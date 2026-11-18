'use client';
// Contexto da demonstracao publica: monta a base sintetica da semente, guarda o que o visitante faz na propria aba e
// entrega um unico modelo semantico para os tres paineis. Sem chamada de API, sem cookie e sem banco: trocar de perfil,
// registrar venda ou editar meta nunca sai do navegador do visitante (secao 11 do plano de evolucao).
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { Model, type Range } from '../executive.ts';
import { generateLedger, toOverview, type DemoLedger } from './ledger.ts';
import {
  DEMO_STORAGE_KEY, applySession, initialSession, reduceSession, resolveRange, restoreSession, serializeSession,
  type DemoAction, type DemoSession,
} from './state.ts';

export interface DemoContextValue {
  /** Base sintetica da semente, sem o que o visitante fez. */
  base: DemoLedger;
  /** Base com as vendas simuladas e as metas editadas: a fonte dos tres paineis. */
  ledger: DemoLedger;
  /** Modelo semantico (mesmas contas do painel executivo em producao). */
  model: Model;
  session: DemoSession;
  dispatch: (action: DemoAction) => void;
  /** Intervalo do recorte escolhido. */
  range: Range;
  today: string;
  /** Mensagem para leitores de tela depois de cada acao. */
  announcement: string;
  announce: (message: string) => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ today, children }: { today: string; children: ReactNode }) {
  const [session, raw] = useReducer(reduceSession, undefined, initialSession);
  const [announcement, setAnnouncement] = useState('');
  const loaded = useRef(false);

  const base = useMemo(() => generateLedger({ today }), [today]);
  const ledger = useMemo(() => applySession(base, session), [base, session]);
  const model = useMemo(() => new Model(toOverview(ledger)), [ledger]);
  const range = useMemo(() => resolveRange(session.filters, today), [session.filters, today]);

  // O estado guardado entra depois da primeira pintura (sessionStorage nao existe no servidor).
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      const stored = restoreSession(window.sessionStorage.getItem(DEMO_STORAGE_KEY), base);
      if (stored) raw({ type: 'hydrate', session: stored });
    } catch {
      // Aba sem armazenamento (janela privada ou bloqueio): a demonstracao segue sem guardar nada.
    }
  }, [base]);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.sessionStorage.setItem(DEMO_STORAGE_KEY, serializeSession(session));
    } catch {
      // Sem espaco ou sem permissao: a demonstracao continua, so nao sobrevive ao recarregamento.
    }
  }, [session]);

  const dispatch = useCallback((action: DemoAction) => {
    if (action.type === 'restore') {
      try {
        window.sessionStorage.removeItem(DEMO_STORAGE_KEY);
      } catch {
        // Nada a limpar.
      }
    }
    raw(action);
  }, []);

  const announce = useCallback((message: string) => setAnnouncement(message), []);

  const value = useMemo<DemoContextValue>(
    () => ({ base, ledger, model, session, dispatch, range, today, announcement, announce }),
    [base, ledger, model, session, dispatch, range, today, announcement, announce],
  );
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const value = useContext(DemoContext);
  if (!value) throw new Error('useDemo precisa do DemoProvider.');
  return value;
}
