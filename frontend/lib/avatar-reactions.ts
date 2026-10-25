export type AvatarExpression = 'idle' | 'happy' | 'surprised' | 'focused' | 'wink';
export type AvatarAction = 'saved' | 'sale-created' | 'payment-confirmed' | 'order-canceled';
export type AvatarReaction = Readonly<{ expression: AvatarExpression; reason: string }>;
export type AvatarSnapshot = AvatarReaction & Readonly<{ pulse: number; paused: boolean }>;

export const IDLE_REACTION: AvatarSnapshot = { expression: 'idle', reason: '', pulse: 0, paused: false };

export function reactionFor(action: AvatarAction, error?: unknown): AvatarReaction {
  if (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    return code === 'STOCK_INSUFFICIENT' || code === 'DISCOUNT_ABOVE_LIMIT'
      ? { expression: 'surprised', reason: 'Uma condição da operação precisa de atenção.' }
      : { expression: 'focused', reason: 'A operação não foi concluída. Confira a mensagem na tela.' };
  }
  if (action === 'order-canceled') return { expression: 'focused', reason: 'Pedido cancelado.' };
  return { expression: 'happy', reason: action === 'payment-confirmed' ? 'Pagamento confirmado!'
    : action === 'sale-created' ? 'Pedido criado com sucesso!' : 'Alteração salva com sucesso!' };
}

/** Um resultado so e celebrado depois da resposta; operacoes concorrentes nao escondem alertas. */
export function createAvatarReactions(schedule: (callback: () => void, delay: number) => () => void = (callback, delay) => {
  const timer = setTimeout(callback, delay);
  return () => clearTimeout(timer);
}) {
  let snapshot: AvatarSnapshot = IDLE_REACTION;
  let result: AvatarReaction | null = null;
  let interaction: AvatarReaction | null = null;
  let pulse = 0;
  let paused = false;
  let cancelResult: (() => void) | undefined;
  let cancelInteraction: (() => void) | undefined;
  const pending = new Set<symbol>();
  const listeners = new Set<() => void>();
  function publish() {
    const reaction = result ?? (pending.size ? { expression: 'focused' as const, reason: 'Processando a operação…' } : interaction ?? IDLE_REACTION);
    snapshot = { ...reaction, pulse, paused };
    listeners.forEach(listener => listener());
  }
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => snapshot,
    interact() {
      if (paused) return;
      pulse++;
      interaction = { expression: pulse % 3 === 0 ? 'surprised' : 'wink', reason: 'Interação recebida.' };
      cancelInteraction?.();
      cancelInteraction = schedule(() => { interaction = null; publish(); }, 850);
      publish();
    },
    togglePaused() { paused = !paused; publish(); },
    begin() { const token = Symbol(); pending.add(token); publish(); return token; },
    finish(token: symbol, action: AvatarAction, error?: unknown) {
      if (!pending.delete(token)) return;
      const next = reactionFor(action, error);
      // Um sucesso simultaneo nao apaga um alerta ainda visivel.
      if (!result || result.expression === 'happy' || next.expression !== 'happy') {
        cancelResult?.();
        result = next;
        cancelResult = schedule(() => { result = null; publish(); }, 3200);
      }
      publish();
    },
    reset() {
      cancelResult?.(); cancelInteraction?.(); cancelResult = undefined; cancelInteraction = undefined;
      pending.clear(); result = null; interaction = null; pulse = 0; publish();
    },
  };
}

export const avatarReactions = createAvatarReactions();
