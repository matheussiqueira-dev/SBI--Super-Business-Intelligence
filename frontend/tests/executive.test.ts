import test from 'node:test';
import assert from 'node:assert/strict';
import { filterChips, measuresOf, Model, NO_FILTERS, NO_TEAM, toCsv, variation, without, type Filters, type Overview } from '../lib/executive.ts';
import { GetExecutiveOverviewResponse } from '../lib/api/generated/sbi.zod.ts';

const brl = (amount: number) => ({ amount, currency: 'BRL' as const });
type Pay = 'PIX' | 'CARD' | 'BOLETO';
function sale(date: string, orderId: number, sellerId: number | null, paymentMethod: Pay, productId: number, units: number, net: number,
              cost: number | null, discount = 0) {
  return { date, orderId, sellerId, customerId: orderId + 100, paymentMethod, productId, units, netRevenue: brl(net), discount: brl(discount),
    cost: cost === null ? null : brl(cost) };
}

// Massa sintetica: 2 gerentes (1 e 2), 2 vendedores (3 na equipe do 1, 4 na equipe do 2) e uma CEO (9).
const OVERVIEW: Overview = GetExecutiveOverviewResponse.parse({
  year: 2026, today: '2026-10-24', from: '2025-01-01', to: '2026-12-31',
  annualGoal: { year: 2026, amount: brl(100000), updatedBy: { id: 9, name: 'Diretora' }, updatedAt: '2026-10-01T10:00:00-03:00' },
  monthlyGoals: [
    { period: '2026-09', storeGoal: brl(10000), sellers: [{ sellerId: 3, goal: brl(6000) }, { sellerId: 4, goal: brl(4000) }] },
    { period: '2026-10', storeGoal: brl(12000), sellers: [{ sellerId: 3, goal: brl(7000) }, { sellerId: 4, goal: brl(5000) }] },
  ],
  people: [
    { id: 9, name: 'Diretora', role: 'CEO', active: true, managerId: null },
    { id: 1, name: 'Matheus', role: 'GERENTE', active: true, managerId: null },
    { id: 2, name: 'Gabriel', role: 'GERENTE', active: true, managerId: null },
    { id: 3, name: 'Allan', role: 'VENDEDOR', active: true, managerId: 1 },
    { id: 4, name: 'Francisco', role: 'VENDEDOR', active: true, managerId: 2 },
  ],
  categories: [{ id: 10, name: 'iPhone' }, { id: 11, name: 'Acessórios' }],
  products: [
    { id: 100, sku: 'IP-17', name: 'iPhone 17', categoryId: 10, price: brl(5000), averageCost: brl(3000), active: true },
    { id: 101, sku: 'CP-1', name: 'Capa', categoryId: 11, price: brl(200), averageCost: brl(50), active: true },
    { id: 102, sku: 'CB-1', name: 'Cabo', categoryId: 11, price: brl(100), averageCost: null, active: true },
  ],
  sales: [
    sale('2025-10-10', 5, 4, 'PIX', 100, 1, 4500, 2900),
    sale('2026-09-03', 6, 9, 'PIX', 101, 1, 200, 50),
    sale('2026-09-10', 1, 3, 'PIX', 100, 1, 5000, 3000),
    sale('2026-09-12', 2, 4, 'CARD', 101, 2, 400, 100),
    sale('2026-10-05', 3, 3, 'PIX', 100, 1, 4800, 3000, 200),
    sale('2026-10-05', 3, 3, 'PIX', 101, 1, 200, 50),
    sale('2026-10-20', 4, 2, 'BOLETO', 102, 3, 300, null),
  ],
  refunds: [{ date: '2026-10-06', orderId: 3, sellerId: 3, paymentMethod: 'PIX', amount: brl(500) }],
  generatedAt: '2026-10-24T12:00:00-03:00',
});
const model = new Model(OVERVIEW);
const OCTOBER: Filters = { ...NO_FILTERS, month: 10 };

test('[CT-EXEC-111] medidas: liquido = vendas - estornos; lucro nulo quando falta custo; pedidos distintos', () => {
  const october = model.measures(OCTOBER, model.scope(OCTOBER));
  assert.equal(october.sales, 5300);
  assert.equal(october.refunds, 500);
  assert.equal(october.net, 4800);
  assert.equal(october.cost, 3050);
  assert.equal(october.itemsWithoutCost, 1);
  assert.equal(october.profit, null);
  assert.equal(october.margin, null);
  assert.equal(october.orders, 2);
  assert.equal(october.units, 5);
  assert.equal(october.averageTicket, 2650);
  const known = measuresOf(OVERVIEW.sales.filter(s => s.orderId === 3), OVERVIEW.refunds);
  assert.equal(known.profit, 4500 - 3050);
  assert.equal(Math.round((known.margin ?? 0) * 10) / 10, 32.2);
});

test('[CT-EXEC-112] estorno fica fora do recorte por produto ou categoria; equipe e vendedor recortam os dois', () => {
  const accessories = model.measures({ ...OCTOBER, category: 11 }, model.scope(OCTOBER));
  assert.equal(accessories.net, 500);
  assert.equal(accessories.refunds, 0);
  assert.ok(model.productScoped({ ...OCTOBER, product: 100 }));
  assert.equal(model.measures({ ...OCTOBER, team: 1 }, model.scope(OCTOBER)).net, 4500);
  assert.equal(model.measures({ ...OCTOBER, seller: 2 }, model.scope(OCTOBER)).net, 300);
  assert.equal(model.measures({ ...OCTOBER, payment: 'BOLETO' }, model.scope(OCTOBER)).net, 300);
});

test('[CT-EXEC-113] equipe: vendedor vai para a equipe do gerente, gerente para a propria e CEO fica sem equipe', () => {
  assert.equal(model.teamOf(3), 1);
  assert.equal(model.teamOf(2), 2);
  assert.equal(model.teamOf(9), NO_TEAM);
  assert.equal(model.teamOf(null), NO_TEAM);
  assert.deepEqual(model.teams().map(t => t.name), ['Equipe Gabriel', 'Equipe Matheus', 'Sem equipe']);
});

test('[CT-EXEC-114] ranking mostra todos da dimensao e respeita os outros filtros (filtro cruzado)', () => {
  const sellers = model.ranking('seller', { ...OCTOBER, seller: 3 });
  assert.deepEqual(sellers.map(r => [r.label, r.net]), [['Allan', 4500], ['Gabriel', 300]]);
  assert.deepEqual(model.ranking('seller', { ...OCTOBER, team: 2 }).map(r => r.label), ['Gabriel']);
  assert.deepEqual(model.ranking('team', OCTOBER).map(r => [r.label, r.net]), [['Equipe Matheus', 4500], ['Equipe Gabriel', 300]]);
  // A categoria escolhida recorta o ranking de produtos; o proprio produto escolhido so e destacado.
  const products = model.ranking('product', { ...OCTOBER, category: 11, product: 101 });
  assert.deepEqual(products.map(r => [r.label, r.net, r.refunds]), [['Cabo', 300, 0], ['Capa', 200, 0]]);
  assert.deepEqual(model.ranking('category', OCTOBER).map(r => [r.label, r.net]), [['iPhone', 4800], ['Acessórios', 500]]);
  assert.deepEqual(model.ranking('payment', OCTOBER).map(r => [r.label, r.net]), [['Pix', 4500], ['Boleto', 300]]);
});

test('[CT-EXEC-115] comparacao: mes corrente contra o mesmo trecho do mes anterior; ano contra o mesmo trecho do ano anterior', () => {
  const month = model.comparison(OCTOBER);
  assert.deepEqual(month.current, { from: '2026-10-01', to: '2026-10-24' });
  assert.deepEqual(month.previous, { from: '2026-09-01', to: '2026-09-24' });
  assert.equal(month.label, 'setembro até o dia 24');
  assert.equal(model.measures(OCTOBER, month.previous).net, 5600);
  assert.equal(Math.round((variation(4800, 5600) ?? 0) * 10) / 10, -14.3);
  const year = model.comparison(NO_FILTERS);
  assert.deepEqual(year.previous, { from: '2025-01-01', to: '2025-10-24' });
  assert.equal(model.measures(NO_FILTERS, year.previous).net, 4500);
  const september = model.comparison({ ...NO_FILTERS, month: 9 });
  assert.equal(september.label, 'agosto');
  assert.deepEqual(model.comparison({ ...OCTOBER, day: '2026-10-20' }).previous, { from: '2026-10-13', to: '2026-10-13' });
});

test('[CT-EXEC-116] serie: meses com meta e ano anterior; drill-down abre os dias do mes', () => {
  const year = model.timeSeries(NO_FILTERS);
  assert.equal(year.length, 12);
  assert.deepEqual([year[9]!.net, year[9]!.previousNet, year[9]!.goal], [4800, 4500, 12000]);
  assert.deepEqual([year[8]!.net, year[8]!.goal], [5600, 10000]);
  assert.equal(year[0]!.goal, null);
  assert.equal(model.timeSeries({ ...NO_FILTERS, team: 1 })[9]!.goal, 7000);
  const days = model.timeSeries(OCTOBER);
  assert.equal(days.length, 31);
  assert.equal(days[4]!.net, 5000);
  assert.equal(days[5]!.net, -500);
});

test('[CT-EXEC-117] metas: anual com ritmo e projecao, do mes, por equipe (soma dos vendedores) e por vendedor', () => {
  const annual = model.annualGoalStatus();
  assert.equal(annual.realized, 10400);
  assert.equal(annual.daysElapsed, 297);
  assert.equal(Math.round(annual.expected ?? 0), 81370);
  assert.equal(Math.round(annual.projection ?? 0), 12781);
  const month = model.monthGoalStatus(NO_FILTERS);
  assert.deepEqual([month.goal, month.realized, month.daysLeft, month.projection], [12000, 4800, 7, 6200]);
  assert.equal(model.monthGoalStatus({ ...NO_FILTERS, seller: 4 }).goal, 5000);
  assert.deepEqual(model.plannedMonths(), { months: 2, amount: 22000 });
  const sellers = model.goalBoard('seller', OCTOBER);
  assert.deepEqual(sellers.map(r => [r.label, r.goal, r.realized, r.state]),
    [['Allan', 7000, 4500, 'EM_ANDAMENTO'], ['Gabriel', 0, 300, 'SEM_META'], ['Francisco', 5000, 0, 'EM_ANDAMENTO']]);
  assert.equal(Math.round(sellers[0]!.achievement ?? 0), 64);
  assert.equal(Math.round(sellers[0]!.perDay ?? 0), Math.round(2500 / 7));
  const teams = model.goalBoard('team', OCTOBER);
  assert.deepEqual(teams.map(r => [r.label, r.goal, r.realized]), [['Equipe Matheus', 7000, 4500], ['Equipe Gabriel', 5000, 300]]);
  // Acumulado: so setembro e outubro tem meta; venda de mes sem meta nao entra no atingimento.
  const yearToDate = model.goalBoard('team', NO_FILTERS);
  assert.deepEqual(yearToDate.map(r => [r.label, r.goal, r.realized]),
    [['Equipe Matheus', 13000, 9500], ['Equipe Gabriel', 9000, 700], ['Sem equipe', 0, 200]]);
  const onlySeptember = new Model({ ...OVERVIEW, monthlyGoals: OVERVIEW.monthlyGoals.slice(0, 1) });
  assert.deepEqual(onlySeptember.goalBoard('team', NO_FILTERS).map(r => [r.label, r.goal, r.realized]),
    [['Equipe Matheus', 6000, 5000], ['Equipe Gabriel', 4000, 400], ['Sem equipe', 0, 200]]);
});

test('[CT-EXEC-118] lucro x preco de compra por produto e curva ABC', () => {
  const rows = model.productTable(OCTOBER);
  const iphone = rows.find(r => r.productId === 100)!;
  assert.deepEqual([iphone.price, iphone.averageCost, iphone.unitMargin, iphone.unitMarginPercent], [5000, 3000, 2000, 40]);
  assert.equal(Math.round(iphone.markupPercent ?? 0), 67);
  assert.equal(iphone.profit, 1800);
  const cable = rows.find(r => r.productId === 102)!;
  assert.deepEqual([cable.averageCost, cable.unitMargin, cable.profit], [null, null, null]);
  const abc = model.abc(OCTOBER);
  assert.deepEqual(abc.items.map(i => [i.label, i.klass]), [['iPhone 17', 'A'], ['Cabo', 'B'], ['Capa', 'C']]);
  assert.deepEqual(abc.classes.map(c => c.products), [1, 1, 1]);
});

test('[CT-EXEC-119] destaques, filtros ativos e exportacao CSV do recorte', () => {
  const insights = model.insights(OCTOBER).map(i => i.text);
  assert.ok(insights.some(text => text.startsWith('Faturamento abaixo de setembro até o dia 24: 14,3%')), insights.join('\n'));
  assert.ok(insights.some(text => text.includes('para a meta de outubro de 2026') && text.includes('7 dias restantes')), insights.join('\n'));
  assert.ok(insights.some(text => text.startsWith('No ritmo atual, 2026 fecha em')), insights.join('\n'));
  assert.ok(insights.some(text => text.startsWith('Allan lidera')), insights.join('\n'));
  assert.ok(insights.length <= 6);

  const filters: Filters = { ...OCTOBER, day: '2026-10-05', team: 1, category: 11, payment: 'PIX' };
  assert.deepEqual(filterChips(model, filters).map(c => c.label),
    ['Mês: outubro', 'Dia: 05/10', 'Equipe Matheus', 'Categoria: Acessórios', 'Pagamento: Pix']);
  assert.deepEqual(without(filters, 'month'), { ...filters, month: null, day: null });

  const csv = toCsv(model, OCTOBER).trimEnd().split('\r\n');
  assert.equal(csv[0], 'data;pedido;vendedor;equipe;categoria;produto;sku;pagamento;unidades;receita_liquida;desconto;custo;lucro');
  assert.equal(csv.length, 4);
  assert.equal(csv[1], '2026-10-05;3;Allan;Equipe Matheus;iPhone;iPhone 17;IP-17;Pix;1;4800,00;200,00;3000,00;1800,00');
  assert.ok(csv[3]!.endsWith(';300,00;0,00;;'));
});
