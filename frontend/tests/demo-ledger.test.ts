import test from 'node:test';
import assert from 'node:assert/strict';
import { GetExecutiveOverviewResponse } from '../lib/api/generated/sbi.zod.ts';
import { Model, NO_FILTERS, monthRange, type Filters } from '../lib/executive.ts';
import { generateLedger, orderGross, orderNet, toOverview, type DemoLedger } from '../lib/demo/ledger.ts';
import { operatingDaysIn, isOperating, lastCompletePeriod, periodsUntil, commercialWeek } from '../lib/demo/calendar.ts';
import { REFERENCE_MONTH, SELLER_IDS, MANAGER_ID, CEO_ID, LOW_STOCK_SKUS, CLEARANCE_SKUS } from '../lib/demo/scenario.ts';
import { shareOut } from '../lib/demo/random.ts';

/** Dia fixo da loja: a base e os testes sao reproduzidos sempre iguais. */
const TODAY = '2026-11-17';
const ledger = generateLedger({ today: TODAY });
const overview = toOverview(ledger);
const model = new Model(overview);
const reference = ledger.referencePeriod;
const referenceMonth = Number(reference.slice(5, 7));
const REF: Filters = { ...NO_FILTERS, month: referenceMonth };
const refRange = monthRange(Number(reference.slice(0, 4)), referenceMonth);

test('[CT-DEMO-101] a base sintetica obedece ao contrato de GET /executive/overview', () => {
  const parsed = GetExecutiveOverviewResponse.safeParse(overview);
  assert.equal(parsed.success, true, parsed.success ? '' : JSON.stringify(parsed.error.issues.slice(0, 3)));
});

test('[CT-DEMO-102] a mesma semente e o mesmo dia produzem exatamente a mesma loja', () => {
  const again = generateLedger({ today: TODAY });
  assert.deepEqual(toOverview(again), overview);
  const other = generateLedger({ today: TODAY, seed: 7 });
  assert.notDeepEqual(toOverview(other).sales, overview.sales);
});

test('[CT-DEMO-103] nenhuma venda, devolucao ou visita e registrada depois de hoje', () => {
  assert.equal(overview.sales.filter(sale => sale.date > TODAY).length, 0);
  assert.equal(overview.refunds.filter(refund => refund.date > TODAY).length, 0);
  assert.equal(Object.keys(ledger.visitors).filter(day => day > TODAY).length, 0);
  assert.equal(ledger.orders.filter(order => order.date > TODAY).length, 0);
});

test('[CT-DEMO-104] periodo futuro aparece so como meta: dezembro tem meta e nenhuma venda', () => {
  const december = model.monthGoal(12);
  assert.ok(december, 'dezembro precisa de meta cadastrada');
  assert.equal(model.measures(NO_FILTERS, monthRange(ledger.year, 12)).orders, 0);
  assert.equal(model.plannedMonths().months, 12);
});

test('[CT-DEMO-105] a loja fecha no domingo: nao ha venda em dia sem funcionamento', () => {
  const sunday = overview.sales.find(sale => !isOperating(sale.date));
  assert.equal(sunday, undefined);
  assert.ok(operatingDaysIn(reference).length >= 24 && operatingDaysIn(reference).length <= 27);
});

test('[CT-DEMO-106] o mes fechado reconcilia com o cenario de referencia da secao 4.2', () => {
  const measures = model.measures(REF, refRange);
  assert.equal(measures.net, REFERENCE_MONTH.netRevenue);
  assert.equal(measures.orders, REFERENCE_MONTH.orders);
  assert.equal(measures.averageTicket, REFERENCE_MONTH.averageTicket);
  assert.equal(measures.refunds, 0);
  assert.equal(model.monthGoal(referenceMonth)?.storeGoal.amount, REFERENCE_MONTH.storeGoal);
  const achievement = (measures.net * 100) / REFERENCE_MONTH.storeGoal;
  assert.equal(Math.round(achievement * 10) / 10, REFERENCE_MONTH.achievementPercent);
  // Margem bruta proxima dos 34% do cenario (o mix de produtos decide o custo exato).
  assert.ok(measures.margin !== null && measures.margin > 33.4 && measures.margin < 34.6, `margem ${measures.margin}`);
});

test('[CT-DEMO-107] a distribuicao por vendedor do mes fechado fecha com o total da loja', () => {
  let total = 0;
  for (const seller of REFERENCE_MONTH.perSeller) {
    const measures = model.measures({ ...REF, seller: seller.id }, refRange);
    assert.equal(measures.net, seller.netRevenue, `vendedor ${seller.id}`);
    assert.equal(measures.orders, seller.orders, `pedidos do vendedor ${seller.id}`);
    total += measures.net;
  }
  assert.equal(total, REFERENCE_MONTH.netRevenue);
  // O gerente e a CEO nao vendem na demonstracao: o realizado da loja e so dos vendedores.
  assert.equal(model.measures({ ...REF, seller: MANAGER_ID }, refRange).orders, 0);
  assert.equal(model.measures({ ...REF, seller: CEO_ID }, refRange).orders, 0);
});

test('[CT-DEMO-108] cada meta mensal distribui exatamente a meta da loja entre os vendedores', () => {
  for (const goal of overview.monthlyGoals) {
    const distributed = goal.sellers.reduce((sum, seller) => sum + Math.round(seller.goal.amount * 100), 0);
    assert.equal(distributed, Math.round(goal.storeGoal.amount * 100), goal.period);
    assert.ok(goal.storeGoal.amount >= 0);
    for (const seller of goal.sellers) assert.ok(SELLER_IDS.includes(seller.sellerId));
  }
});

test('[CT-DEMO-109] a receita liquida de cada item fecha com o total do pedido, em centavos', () => {
  for (const order of ledger.orders) {
    const items = order.items.reduce((sum, item) => sum + item.unitPrice * item.units - item.discount, 0);
    assert.equal(items, orderNet(order), `pedido ${order.id}`);
    assert.ok(orderNet(order) <= orderGross(order));
    assert.ok(order.items.every(item => item.discount >= 0 && item.discount <= item.unitPrice * item.units));
    assert.ok(order.items.every(item => Number.isInteger(item.units) && item.units > 0));
  }
  // Nenhum centavo perdido: a soma dos fatos do contrato e a soma dos pedidos pagos.
  const facts = overview.sales.reduce((sum, sale) => sum + Math.round(sale.netRevenue.amount * 100), 0);
  const orders = ledger.orders.filter(order => order.status === 'PAID').reduce((sum, order) => sum + orderNet(order), 0);
  assert.equal(facts, orders);
});

test('[CT-DEMO-110] a base tem variacao comercial plausivel, com meses acima e abaixo da meta', () => {
  const months = ledger.periods.filter(period => period.startsWith(`${ledger.year}-`) && period < `${ledger.year}-${String(Number(TODAY.slice(5, 7))).padStart(2, '0')}`);
  const results = months.map(period => {
    const month = Number(period.slice(5, 7));
    const realized = model.measures(NO_FILTERS, monthRange(ledger.year, month)).net;
    return { period, goal: model.monthGoal(month)?.storeGoal.amount ?? 0, realized };
  });
  assert.ok(results.some(item => item.realized > item.goal), 'algum mes precisa superar a meta');
  assert.ok(results.some(item => item.realized < item.goal), 'algum mes precisa ficar abaixo da meta');
  // Devolucoes, cancelamentos e estoque baixo existem na base.
  assert.ok(overview.refunds.length > 0);
  assert.ok(ledger.orders.some(order => order.status === 'CANCELED'));
  assert.equal(ledger.products.filter(product => product.active && product.stock < product.minStock).length, LOW_STOCK_SKUS.length);
  // Produtos de ponta de estoque ficam com margem unitaria abaixo de 10%.
  for (const sku of CLEARANCE_SKUS) {
    const product = ledger.products.find(item => item.sku === sku)!;
    assert.ok(((product.price - product.cost) * 100) / product.price < 10, sku);
  }
});

test('[CT-DEMO-111] custo ausente nunca vira zero: o mes mais antigo tem item sem custo', () => {
  const oldest = ledger.periods[0]!;
  const month = Number(oldest.slice(5, 7));
  const year = Number(oldest.slice(0, 4));
  const yearModel = new Model(toOverview(ledger, { year }));
  const measures = yearModel.measures({ ...NO_FILTERS, month }, monthRange(year, month));
  assert.ok(measures.itemsWithoutCost > 0, 'o mes mais antigo precisa exercitar o custo ausente');
  assert.equal(measures.profit, null);
  assert.equal(measures.margin, null);
  // Nos meses do ano corrente o custo esta completo.
  assert.equal(model.measures(REF, refRange).itemsWithoutCost, 0);
});

test('[CT-DEMO-112] a base cobre dois anos e o ano anterior serve de comparacao', () => {
  assert.equal(ledger.periods.length, 24);
  assert.equal(ledger.periods[ledger.periods.length - 1], TODAY.slice(0, 7));
  assert.equal(reference, lastCompletePeriod(TODAY));
  assert.deepEqual(periodsUntil(TODAY, 3), ['2026-09', '2026-10', '2026-11']);
  const previous = new Model(toOverview(ledger, { year: ledger.year - 1 }));
  assert.ok(previous.measures(NO_FILTERS, { from: `${ledger.year - 1}-01-01`, to: `${ledger.year - 1}-12-31` }).net > 0);
});

test('[CT-DEMO-113] calendario: semana comercial e reparticao em centavos sem sobra', () => {
  // 17/11/2026 e uma terca: a semana comercial vai de segunda a sabado.
  assert.deepEqual(commercialWeek('2026-11-17'), { from: '2026-11-16', to: '2026-11-21' });
  // A semana nao passa do mes.
  assert.deepEqual(commercialWeek('2026-11-02'), { from: '2026-11-02', to: '2026-11-07' });
  assert.equal(shareOut(100, [1, 1, 1]).reduce((sum, part) => sum + part, 0), 100);
  assert.deepEqual(shareOut(10, [1, 1, 1]), [4, 3, 3]);
  assert.deepEqual(shareOut(5, []), []);
  assert.deepEqual(shareOut(6, [0, 0]), [3, 3]);
});

test('[CT-DEMO-114] visitantes sinteticos sustentam uma conversao plausivel', () => {
  const days = operatingDaysIn(reference);
  const visits = days.reduce((sum, day) => sum + (ledger.visitors[day] ?? 0), 0);
  const conversion = (REFERENCE_MONTH.orders * 100) / visits;
  assert.ok(conversion > 18 && conversion < 32, `conversao ${conversion}`);
  for (const day of days) assert.ok((ledger.visitors[day] ?? 0) > 0, day);
});

test('[CT-DEMO-115] a geracao da base e rapida o bastante para a demonstracao', () => {
  const started = performance.now();
  const built: DemoLedger = generateLedger({ today: TODAY });
  const model2 = new Model(toOverview(built));
  model2.timeSeries(NO_FILTERS);
  const elapsed = performance.now() - started;
  assert.ok(elapsed < 2000, `geracao levou ${elapsed.toFixed(0)} ms`);
});
