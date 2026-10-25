import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdleTracker, IDLE_AFTER_MS } from '../lib/idle.ts';

test('[CT-WEB-143] painel para de consultar apos 10 min sem uso e volta na primeira interacao', () => {
  assert.equal(IDLE_AFTER_MS, 600_000);
  const tracker = createIdleTracker(IDLE_AFTER_MS, 0);
  assert.equal(tracker.check(IDLE_AFTER_MS - 1), false);
  // Uso antes do limite reinicia a contagem e nao conta como retorno.
  assert.equal(tracker.activity(IDLE_AFTER_MS - 1), false);
  assert.equal(tracker.check(2 * IDLE_AFTER_MS - 2), false);
  assert.equal(tracker.check(2 * IDLE_AFTER_MS - 1), true);
  // Continua parado ate alguem usar a tela; o retorno e avisado uma vez so.
  assert.equal(tracker.check(3 * IDLE_AFTER_MS), true);
  assert.equal(tracker.activity(3 * IDLE_AFTER_MS), true);
  assert.equal(tracker.activity(3 * IDLE_AFTER_MS + 1), false);
  assert.equal(tracker.check(3 * IDLE_AFTER_MS + 2), false);
});
