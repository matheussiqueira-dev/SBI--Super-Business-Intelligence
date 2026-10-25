import test from 'node:test';
import assert from 'node:assert/strict';
import { distributionMatches, planCoverage, splitEvenly, sum } from '../lib/goals.ts';

test('[CT-EXEC-120] distribuicao em centavos fecha exatamente com a meta da loja', () => {
  assert.deepEqual(splitEvenly(100000, 3), [33333.34, 33333.33, 33333.33]);
  assert.equal(sum(splitEvenly(240000, 7)), 240000);
  assert.equal(sum([0.1, 0.2]), 0.3);
  assert.ok(distributionMatches(240000, [120000, 120000]));
  assert.ok(!distributionMatches(240000, [120000, 119999.99]));
  assert.ok(distributionMatches(240000, []));
  assert.deepEqual(splitEvenly(10, 0), []);
});

test('[CT-EXEC-120] cobertura do plano mensal frente a meta anual', () => {
  assert.equal(planCoverage(2880000, 960000), 33.333333333333336);
  assert.equal(planCoverage(null, 960000), null);
  assert.equal(planCoverage(0, 960000), null);
});
