import test from 'node:test';
import assert from 'node:assert/strict';
import { daysLeftInMonth, distributionMatches, planCoverage, remainingPerDay, splitEvenly, sum } from '../lib/goals.ts';

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

// Quanto falta por dia restante (D-EVO-58). O "agora" entra por parametro: o teste nao depende do relogio.
// 2026-11-18 as 12:00Z = dia 18 em America/Fortaleza (UTC-3); novembro tem 30 dias, entao restam 13 dias.
const EM_18_NOV = new Date('2026-11-18T12:00:00Z');

test('[CT-APR-17] dias restantes do mes contam hoje e so valem no mes corrente', () => {
  assert.equal(daysLeftInMonth('2026-11', EM_18_NOV), 13);
  // Ultimo dia do mes: resta o proprio dia.
  assert.equal(daysLeftInMonth('2026-11', new Date('2026-11-30T12:00:00Z')), 1);
  // Primeiro dia: o mes inteiro.
  assert.equal(daysLeftInMonth('2026-11', new Date('2026-11-01T12:00:00Z')), 30);
  // Fevereiro de ano bissexto.
  assert.equal(daysLeftInMonth('2028-02', new Date('2028-02-01T12:00:00Z')), 29);
  // Mes fechado e mes que ainda nao comecou nao tem dia restante.
  assert.equal(daysLeftInMonth('2026-10', EM_18_NOV), null);
  assert.equal(daysLeftInMonth('2026-12', EM_18_NOV), null);
  // Virada do dia no fuso da loja: 00:30Z de 19/11 ainda e 18/11 em Fortaleza.
  assert.equal(daysLeftInMonth('2026-11', new Date('2026-11-19T00:30:00Z')), 13);
});

test('[CT-APR-17] falta por dia restante so sai com denominador valido', () => {
  // 22.219,29 a faltar em 13 dias.
  assert.equal(remainingPerDay(22219.29, '2026-11', EM_18_NOV), 1709.18);
  // Meta ja batida (falta zero ou negativa) nao vira numero.
  assert.equal(remainingPerDay(0, '2026-11', EM_18_NOV), null);
  assert.equal(remainingPerDay(-500, '2026-11', EM_18_NOV), null);
  // Mes fechado nao tem dia restante.
  assert.equal(remainingPerDay(1000, '2026-10', EM_18_NOV), null);
  // Arredonda em centavos: 100 / 13 = 7,6923... -> 7,69
  assert.equal(remainingPerDay(100, '2026-11', EM_18_NOV), 7.69);
});
