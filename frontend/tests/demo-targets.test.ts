import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessGoal, conversionPercent, deriveTargets, goalStateLabel, itemsPerSale, operatingProjection,
} from '../lib/demo/targets.ts';
import { operatingDaysIn } from '../lib/demo/calendar.ts';
import { MONTHLY_PLAN } from '../lib/demo/scenario.ts';

// Novembro de 2026 abre 25 dias (fecha nos cinco domingos); ate 17/11 ja abriu 14.
const PERIOD = '2026-11';
const TODAY = '2026-11-17';

test('[CT-DEMO-121] sem meta cadastrada nao ha atingimento, desvio nem ritmo', () => {
  for (const goal of [null, 0]) {
    const assessment = assessGoal({ goal, realized: 12_000, period: PERIOD, today: TODAY, label: 'novembro' });
    assert.equal(assessment.state, 'SEM_META');
    assert.equal(assessment.achievement, null);
    assert.equal(assessment.deviation, null);
    assert.equal(assessment.remaining, null);
    assert.equal(assessment.pacePercent, null);
    assert.equal(assessment.perOperatingDay, null);
  }
});

test('[CT-DEMO-122] atingimento, desvio e o que falta por dia de funcionamento', () => {
  const assessment = assessGoal({ goal: 60_000, realized: 38_012.77, period: PERIOD, today: TODAY, label: 'novembro' });
  assert.equal(assessment.achievement, (38_012.77 * 100) / 60_000);
  assert.equal(assessment.deviation, 38_012.77 - 60_000);
  assert.equal(assessment.remaining, 60_000 - 38_012.77);
  assert.equal(assessment.operatingDaysTotal, operatingDaysIn(PERIOD).length);
  assert.equal(assessment.operatingDaysElapsed, 14);
  assert.equal(assessment.operatingDaysLeft, assessment.operatingDaysTotal - 14);
  assert.equal(assessment.perOperatingDay, (60_000 - 38_012.77) / assessment.operatingDaysLeft);
  // Esperado e projecao seguem a regra linear ja usada no painel executivo (dias de calendario).
  assert.equal(assessment.expected, (60_000 * 17) / 30);
  assert.equal(assessment.projection, (38_012.77 / 17) * 30);
});

test('[CT-DEMO-123] estados da meta: atingida, no ritmo, abaixo e dados insuficientes', () => {
  const of = (realized: number, today = TODAY) =>
    assessGoal({ goal: 60_000, realized, period: PERIOD, today, label: 'novembro' }).state;
  assert.equal(of(60_000), 'META_ATINGIDA');
  assert.equal(of(70_000), 'META_ATINGIDA');
  // Esperado em 17/11 = 34.000; 90% disso = 30.600.
  assert.equal(of(34_000), 'PROXIMA_DA_META');
  assert.equal(of(30_600), 'PROXIMA_DA_META');
  assert.equal(of(30_599), 'ABAIXO_DA_META');
  // Mes que ainda nao comecou nao tem base para avaliar.
  assert.equal(of(0, '2026-10-31'), 'DADOS_INSUFICIENTES');
  // Criterio configuravel: exigindo 100% do ritmo, 34.000 ja nao esta "no ritmo".
  assert.equal(assessGoal({ goal: 60_000, realized: 34_000, period: PERIOD, today: TODAY, label: 'novembro',
    criteria: { nearRatio: 1.01 } }).state, 'ABAIXO_DA_META');
});

test('[CT-DEMO-124] o rotulo do estado muda com o periodo em curso ou fechado', () => {
  assert.equal(goalStateLabel('PROXIMA_DA_META', true), 'No ritmo da meta');
  assert.equal(goalStateLabel('PROXIMA_DA_META', false), 'Perto da meta');
  assert.equal(goalStateLabel('ABAIXO_DA_META', true), 'Abaixo do ritmo');
  assert.equal(goalStateLabel('ABAIXO_DA_META', false), 'Abaixo da meta');
  assert.equal(goalStateLabel('META_ATINGIDA', true), 'Meta atingida');
  assert.equal(goalStateLabel('SEM_META'), 'Sem meta cadastrada');
});

test('[CT-DEMO-125] mes fechado: nao ha dia restante, entao nao ha quanto falta por dia', () => {
  const closed = assessGoal({ goal: 60_000, realized: 56_700, period: '2026-10', today: TODAY, label: 'outubro' });
  assert.equal(closed.daysLeft, 0);
  assert.equal(closed.operatingDaysLeft, 0);
  assert.equal(closed.perOperatingDay, null);
  // Com o mes fechado o esperado e a meta cheia: 94,5% dela fica em "Perto da meta".
  assert.equal(closed.state, 'PROXIMA_DA_META');
  assert.equal(goalStateLabel(closed.state, closed.daysLeft > 0), 'Perto da meta');
  assert.equal(Math.round((closed.achievement ?? 0) * 10) / 10, 94.5);
  const missed = assessGoal({ goal: 60_000, realized: 51_112.32, period: '2026-07', today: TODAY, label: 'julho' });
  assert.equal(missed.state, 'ABAIXO_DA_META');
  assert.equal(goalStateLabel(missed.state, missed.daysLeft > 0), 'Abaixo da meta');
});

test('[CT-DEMO-126] metas derivadas saem dos dias de funcionamento, nunca de 30 dias ou 4 semanas', () => {
  const targets = deriveTargets({
    period: PERIOD, monthly: 60_000, today: TODAY,
    sellerGoals: [{ sellerId: 3, goal: 20_000 }, { sellerId: 4, goal: 20_000 }, { sellerId: 5, goal: 20_000 }],
  });
  const days = operatingDaysIn(PERIOD).length;
  assert.equal(targets.operatingDays, days);
  assert.equal(targets.plannedOperatingDays, MONTHLY_PLAN.operatingDays);
  assert.equal(targets.daily, 60_000 / days);
  assert.notEqual(targets.daily, 60_000 / 30);
  // Semana comercial de 16 a 21 de novembro: seis dias de funcionamento.
  assert.equal(targets.weeklyDays, 6);
  assert.equal(targets.weekly, (60_000 / days) * 6);
  assert.equal(targets.weekFrom, '2026-11-16');
  assert.equal(targets.weekTo, '2026-11-21');
  assert.deepEqual(targets.sellers, [
    { sellerId: 3, monthly: 20_000, daily: 20_000 / days },
    { sellerId: 4, monthly: 20_000, daily: 20_000 / days },
    { sellerId: 5, monthly: 20_000, daily: 20_000 / days },
  ]);
  assert.equal(targets.requiredOrders, 400);
  assert.equal(targets.requiredTicket, 150);
  assert.equal(targets.requiredItems, 640);
});

test('[CT-DEMO-127] mes sem dia de funcionamento nao divide por zero', () => {
  const targets = deriveTargets({ period: PERIOD, monthly: 0, today: TODAY, sellerGoals: [] });
  assert.equal(targets.daily, 0);
  assert.equal(targets.weekly, 0);
  assert.deepEqual(targets.sellers, []);
  assert.equal(operatingProjection(1000, 0, 25), null);
  assert.equal(operatingProjection(1000, 10, 0), null);
  assert.equal(operatingProjection(1000, 10, 25), 2500);
});

test('[CT-DEMO-128] conversao e itens por venda nao inventam zero sem base', () => {
  assert.equal(conversionPercent(0, 0), null);
  assert.equal(conversionPercent(10, 0), null);
  assert.equal(conversionPercent(250, 1000), 25);
  assert.equal(itemsPerSale(0, 0), null);
  assert.equal(itemsPerSale(640, 400), 1.6);
});
