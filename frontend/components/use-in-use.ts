'use client';
import { useEffect, useRef, useState } from 'react';
import { ACTIVITY_EVENTS, createIdleTracker, IDLE_AFTER_MS } from '../lib/idle.ts';

/** Verificacao do tempo parado; nao precisa ser exata, so bem menor que IDLE_AFTER_MS. */
const CHECK_EVERY_MS = 30_000;

/**
 * true enquanto a tela esta em uso (D-EVO-51). Voltar para a aba tambem conta como uso. {@code onResume} roda
 * quando a tela estava parada e voltou a ser usada, para buscar os dados na hora em vez de esperar o intervalo.
 */
export function useInUse(onResume?: () => void, idleMs: number = IDLE_AFTER_MS): boolean {
  const [inUse, setInUse] = useState(true);
  const resume = useRef(onResume);
  useEffect(() => { resume.current = onResume; });

  useEffect(() => {
    const tracker = createIdleTracker(idleMs, Date.now());
    const onActivity = () => {
      if (tracker.activity(Date.now())) {
        setInUse(true);
        resume.current?.();
      }
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') onActivity(); };
    const options = { passive: true, capture: true } as const;
    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, onActivity, options);
    document.addEventListener('visibilitychange', onVisibility);
    const timer = window.setInterval(() => { if (tracker.check(Date.now())) setInUse(false); }, CHECK_EVERY_MS);
    return () => {
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, onActivity, options);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(timer);
    };
  }, [idleMs]);

  return inUse;
}
