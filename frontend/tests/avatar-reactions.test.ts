import test from 'node:test';
import assert from 'node:assert/strict';
import { createAvatarReactions, reactionFor } from '../lib/avatar-reactions.ts';

function fixture() {
  const timers = new Map<number, () => void>();
  let nextId = 0;
  const store = createAvatarReactions((callback, delay) => {
    assert.ok(delay === 3200 || delay === 850);
    const id = ++nextId;
    timers.set(id, callback);
    return () => { timers.delete(id); };
  });
  return { store, tick() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback()); } };
}

test('operacao pendente concentra, pagamento confirmado sorri e depois volta ao descanso', () => {
  const { store, tick } = fixture();
  const token = store.begin();
  assert.equal(store.getSnapshot().expression, 'focused');
  store.finish(token, 'payment-confirmed');
  assert.equal(store.getSnapshot().expression, 'happy');
  assert.equal(store.getSnapshot().reason, 'Pagamento confirmado!');
  tick();
  assert.equal(store.getSnapshot().expression, 'idle');
});

test('estoque insuficiente e desconto acima do limite surpreendem; falha e cancelamento nao celebram', () => {
  for (const code of ['STOCK_INSUFFICIENT', 'DISCOUNT_ABOVE_LIMIT']) {
    assert.equal(reactionFor('sale-created', { code }).expression, 'surprised');
  }
  assert.equal(reactionFor('payment-confirmed', new Error('network')).expression, 'focused');
  assert.equal(reactionFor('order-canceled').expression, 'focused');
  assert.equal(reactionFor('sale-created').expression, 'happy');
  assert.equal(reactionFor('saved').expression, 'happy');
});

test('concorrencia: sucesso nao esconde alerta; fim do aviso volta a operacao ainda pendente', () => {
  const { store, tick } = fixture();
  const bad = store.begin();
  const good = store.begin();
  const slow = store.begin();
  store.finish(bad, 'sale-created', { code: 'STOCK_INSUFFICIENT' });
  store.finish(good, 'saved');
  assert.equal(store.getSnapshot().expression, 'surprised');
  tick();
  assert.equal(store.getSnapshot().expression, 'focused');
  store.finish(slow, 'saved');
  assert.equal(store.getSnapshot().expression, 'happy');
  tick();
  assert.equal(store.getSnapshot().expression, 'idle');
});

test('troca de sessao limpa pendencias; resposta antiga e finalizacao duplicada sao ignoradas', () => {
  const { store, tick } = fixture();
  const old = store.begin();
  store.reset();
  store.finish(old, 'saved');
  assert.equal(store.getSnapshot().expression, 'idle');
  const current = store.begin();
  store.finish(current, 'saved');
  store.finish(current, 'saved', { code: 'STOCK_INSUFFICIENT' });
  assert.equal(store.getSnapshot().expression, 'happy');
  store.reset();
  tick();
  assert.equal(store.getSnapshot().expression, 'idle');
});

test('assinatura deixa de receber eventos depois da limpeza', () => {
  const { store } = fixture();
  let calls = 0;
  const unsubscribe = store.subscribe(() => { calls++; });
  store.begin();
  assert.equal(calls, 1);
  unsubscribe();
  store.begin();
  assert.equal(calls, 1);
  store.reset();
});

test('cada clique reinicia a resposta, inclusive cliques repetidos; depois ela expira', () => {
  const { store, tick } = fixture();
  for (let click = 1; click <= 9; click++) {
    store.interact();
    assert.equal(store.getSnapshot().pulse, click);
    assert.equal(store.getSnapshot().expression, click % 3 === 0 ? 'surprised' : 'wink');
  }
  tick();
  assert.equal(store.getSnapshot().expression, 'idle');
  assert.equal(store.getSnapshot().pulse, 9);
});

test('clique confirma interacao sem esconder processamento, sucesso ou alerta', () => {
  const { store } = fixture();
  const token = store.begin();
  store.interact();
  assert.equal(store.getSnapshot().expression, 'focused');
  assert.equal(store.getSnapshot().pulse, 1);
  store.finish(token, 'saved', { code: 'STOCK_INSUFFICIENT' });
  store.interact();
  assert.equal(store.getSnapshot().expression, 'surprised');
  assert.notEqual(store.getSnapshot().reason, 'Interação recebida.');
  assert.equal(store.getSnapshot().pulse, 2);
  store.reset();
});

test('pausa global ignora cliques e sobrevive a troca de tela; retomar volta a reagir', () => {
  const { store } = fixture();
  store.togglePaused();
  store.interact();
  assert.equal(store.getSnapshot().paused, true);
  assert.equal(store.getSnapshot().pulse, 0);
  store.reset();
  assert.equal(store.getSnapshot().paused, true);
  store.togglePaused();
  store.interact();
  assert.equal(store.getSnapshot().paused, false);
  assert.equal(store.getSnapshot().pulse, 1);
  store.reset();
});
