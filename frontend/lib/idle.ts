// D-EVO-51: o painel so consulta a API ao vivo enquanto alguem usa a tela. Sem teclado, mouse, toque ou rolagem
// por 10 min, a consulta para; assim uma aba esquecida aberta deixa a API (Render) e o banco (Neon) dormirem.
// A primeira interacao depois disso volta a consultar na hora.
export const IDLE_AFTER_MS = 10 * 60_000;

/** Eventos que contam como uso da tela. */
export const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

export interface IdleTracker {
  /** Registra uso; devolve true quando a tela estava parada e voltou a ser usada. */
  activity(now: number): boolean;
  /** Devolve true quando passou {@link IDLE_AFTER_MS} (ou o limite informado) sem uso. */
  check(now: number): boolean;
}

export function createIdleTracker(idleMs: number, start: number): IdleTracker {
  let last = start;
  let idle = false;
  return {
    activity(now) {
      last = now;
      if (!idle) return false;
      idle = false;
      return true;
    },
    check(now) {
      if (!idle && now - last >= idleMs) idle = true;
      return idle;
    },
  };
}
