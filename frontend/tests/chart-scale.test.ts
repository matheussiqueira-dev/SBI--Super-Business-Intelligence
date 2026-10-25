import test from 'node:test';
import assert from 'node:assert/strict';
import { niceScale } from '../lib/chart-scale.ts';

test('[CT-WEB-136] eixo de valor com divisoes redondas: passo de 1, 2 ou 5 x 10^n, zero incluido, nunca quartos', () => {
  assert.deepEqual(niceScale(0, 47_000).ticks, [0, 20_000, 40_000, 60_000]);
  assert.deepEqual(niceScale(0, 25_000).ticks, [0, 10_000, 20_000, 30_000]);
  assert.deepEqual(niceScale(1_200, 9_800).ticks, [0, 5_000, 10_000]);
  assert.deepEqual(niceScale(-3_000, 12_000).ticks, [-5_000, 0, 5_000, 10_000, 15_000]);
  assert.deepEqual(niceScale(0, 0.9).ticks, [0, 0.5, 1]);
  assert.deepEqual(niceScale(0, 0.7, 5).ticks, [0, 0.2, 0.4, 0.6, 0.8]);
  // Valor exato no limite fica no topo da escala, sem divisao extra.
  assert.equal(niceScale(0, 40_000).max, 40_000);
  // Escala vazia (dias sem venda) ainda tem dois pontos.
  assert.ok(niceScale(0, 0).ticks.length >= 2);
  for (const max of [3_333, 6_250, 18_400, 47_000, 186_400, 1_250_000]) {
    const { step, ticks } = niceScale(0, max);
    const mantissa = step / 10 ** Math.floor(Math.log10(step));
    assert.ok([1, 2, 5].includes(mantissa), `passo ${step}`);
    assert.ok(ticks.length >= 3 && ticks.length <= 6, `${max}: ${ticks.length} divisoes`);
    assert.ok(ticks.at(-1)! >= max);
  }
});
