import test from 'node:test';
import assert from 'node:assert/strict';
import { Model, NO_FILTERS, monthRange, type Filters } from '../lib/executive.ts';
import { GetExecutiveOverviewResponse } from '../lib/api/generated/sbi.zod.ts';
import { generateLedger, orderNet, toOverview } from '../lib/demo/ledger.ts';
import {
  applySession, canEditGoals, createGoalRecord, createSimulatedSale, DEMO_ROLES, goalHistory, initialSession,
  reduceSession, resolveRange, restoreSession, serializeSession, validateGoal, validateSale, visitsIn,
  type DemoSession, type SaleInput,
} from '../lib/demo/state.ts';
import { monthGoalView, periodForRange, sliceOf, teamRows, demoFilters } from '../lib/demo/metrics.ts';
import { MANAGER_ID, SELLER_IDS } from '../lib/demo/scenario.ts';

const TODAY = '2026-11-17';
const base = generateLedger({ today: TODAY });
const PERIOD = TODAY.slice(0, 7);
const MONTH = monthRange(2026, 11);
const SELLER = SELLER_IDS[0]!;

/** Sacola do roteiro: calca + vestido + camiseta, R$ 449,70 de preco de tabela. */
function scriptBasket(): SaleInput {
  const sku = (code: string) => base.products.find(product => product.sku === code)!.id;
  return {
    sellerId: SELLER, paymentMethod: 'PIX', customerId: base.customers[0]!.id, discountPercent: 0,
    items: [{ productId: sku('CAL-003'), units: 1 }, { productId: sku('VES-008'), units: 1 }, { productId: sku('CAM-001'), units: 1 }],
  };
}

function withSale(input: SaleInput): { session: DemoSession; amount: number } {
  const order = createSimulatedSale(base, input, new Date('2026-11-17T15:30:00-03:00'));
  const session = reduceSession(initialSession(), { type: 'sale', order });
  return { session, amount: orderNet(order) / 100 };
}

test('[CT-DEMO-141] a venda simulada entra como uma transacao unica e os tres niveis leem a mesma', () => {
  const before = new Model(toOverview(base));
  const storeBefore = before.measures(NO_FILTERS, MONTH);
  const sellerBefore = before.measures(demoFilters({ sellerId: SELLER }), MONTH);

  const { session, amount } = withSale(scriptBasket());
  assert.equal(amount, 449.7);
  const after = new Model(toOverview(applySession(base, session)));
  const storeAfter = after.measures(NO_FILTERS, MONTH);
  const sellerAfter = after.measures(demoFilters({ sellerId: SELLER }), MONTH);

  // Vendedor: receita, quantidade de vendas e ticket medio recalculados.
  assert.equal(round(sellerAfter.net - sellerBefore.net), amount);
  assert.equal(sellerAfter.orders, sellerBefore.orders + 1);
  assert.equal(sellerAfter.averageTicket, round(sellerAfter.sales / sellerAfter.orders));
  assert.notEqual(sellerAfter.averageTicket, sellerBefore.averageTicket);
  // Loja: o consolidado sobe exatamente o mesmo valor, nao um numero solto de cartao.
  assert.equal(round(storeAfter.net - storeBefore.net), amount);
  assert.equal(storeAfter.orders, storeBefore.orders + 1);
  // Diretoria: custo dos itens vendidos, lucro bruto e margem recalculados a partir da mesma transacao.
  const cost = round(storeAfter.cost - storeBefore.cost);
  assert.equal(cost, 149.5 + 95.9 + 43.2);
  assert.equal(round((storeAfter.profit ?? 0) - (storeBefore.profit ?? 0)), round(amount - cost));
  assert.notEqual(storeAfter.margin, storeBefore.margin);
  // Nenhum outro vendedor muda.
  for (const other of SELLER_IDS.filter(id => id !== SELLER)) {
    assert.equal(after.measures(demoFilters({ sellerId: other }), MONTH).net,
      before.measures(demoFilters({ sellerId: other }), MONTH).net, `vendedor ${other}`);
  }
  // O contrato continua valido depois da venda simulada.
  assert.equal(GetExecutiveOverviewResponse.safeParse(toOverview(applySession(base, session))).success, true);
});

test('[CT-DEMO-142] a venda simulada move meta, atingimento e quadro da equipe de forma consistente', () => {
  const { session, amount } = withSale(scriptBasket());
  const ledger = applySession(base, session);
  const before = new Model(toOverview(base));
  const after = new Model(toOverview(ledger));

  const sellerBefore = monthGoalView(before, PERIOD, TODAY, SELLER);
  const sellerAfter = monthGoalView(after, PERIOD, TODAY, SELLER);
  assert.equal(round(sellerAfter.realized - sellerBefore.realized), amount);
  assert.equal(round((sellerAfter.assessment.remaining ?? 0) - (sellerBefore.assessment.remaining ?? 0)), -amount);
  assert.ok((sellerAfter.assessment.achievement ?? 0) > (sellerBefore.assessment.achievement ?? 0));

  const storeAfter = monthGoalView(after, PERIOD, TODAY, null);
  const rows = teamRows(after, PERIOD, TODAY, MONTH);
  // Consolidacao da loja = soma dos vendedores, em centavos.
  const sum = rows.reduce((total, row) => total + Math.round(row.realized * 100), 0);
  assert.equal(sum, Math.round(storeAfter.realized * 100));
  assert.equal(rows.find(row => row.sellerId === SELLER)?.realized, sellerAfter.realized);
  // O gerente nao vende: nao entra no quadro de metas individuais.
  assert.equal(rows.some(row => row.sellerId === MANAGER_ID), false);
});

test('[CT-DEMO-143] a venda simulada baixa o estoque e respeita o disponivel', () => {
  const basket = scriptBasket();
  const productId = basket.items[0]!.productId;
  const before = base.products.find(product => product.id === productId)!.stock;
  const { session } = withSale(basket);
  const ledger = applySession(base, session);
  assert.equal(ledger.products.find(product => product.id === productId)!.stock, before - 1);
  // Acima do disponivel a venda e recusada.
  assert.equal(validateSale(base, { ...basket, items: [{ productId, units: before + 1 }] }, 'VENDEDOR', 0), 'ESTOQUE_INSUFICIENTE');
  assert.equal(validateSale(base, basket, 'VENDEDOR', 0), null);
});

test('[CT-DEMO-144] a venda simulada obedece ao catalogo e a alcada de desconto do papel', () => {
  const basket = scriptBasket();
  const inactive = base.products.find(product => !product.active)!;
  assert.equal(validateSale(base, { ...basket, items: [{ productId: inactive.id, units: 1 }] }, 'GERENTE', 0), 'PRODUTO_INATIVO');
  assert.equal(validateSale(base, { ...basket, items: [{ productId: 99_999, units: 1 }] }, 'GERENTE', 0), 'PRODUTO_INEXISTENTE');
  assert.equal(validateSale(base, { ...basket, items: [{ productId: basket.items[0]!.productId, units: 0 }] }, 'GERENTE', 0), 'QUANTIDADE_INVALIDA');
  assert.equal(validateSale(base, { ...basket, items: [] }, 'GERENTE', 0), 'SEM_ITEM');
  assert.equal(validateSale(base, { ...basket, sellerId: MANAGER_ID }, 'GERENTE', 0), 'VENDEDOR_INVALIDO');
  // Vendedor vai ate 5%; gerente e CEO ate 20% (mesmos limites da tabela discount_policy).
  assert.equal(validateSale(base, { ...basket, discountPercent: 5 }, 'VENDEDOR', 0), null);
  assert.equal(validateSale(base, { ...basket, discountPercent: 5.01 }, 'VENDEDOR', 0), 'DESCONTO_ACIMA_DA_ALCADA');
  assert.equal(validateSale(base, { ...basket, discountPercent: 20 }, 'GERENTE', 0), null);
  assert.equal(validateSale(base, { ...basket, discountPercent: 20.5 }, 'CEO', 0), 'DESCONTO_ACIMA_DA_ALCADA');
  assert.equal(validateSale(base, { ...basket, discountPercent: -1 }, 'GERENTE', 0), 'DESCONTO_ACIMA_DA_ALCADA');
  assert.equal(validateSale(base, basket, 'VENDEDOR', 50), 'LIMITE_DE_VENDAS');
});

test('[CT-DEMO-145] o desconto do pedido e repartido entre os itens sem sobrar centavo', () => {
  const order = createSimulatedSale(base, { ...scriptBasket(), discountPercent: 5 }, new Date('2026-11-17T15:30:00-03:00'));
  const gross = order.items.reduce((sum, item) => sum + item.unitPrice * item.units, 0);
  const discount = order.items.reduce((sum, item) => sum + item.discount, 0);
  assert.equal(discount, Math.round((gross * 5) / 100));
  assert.equal(orderNet(order), gross - discount);
  assert.ok(order.items.every(item => item.discount >= 0 && item.discount <= item.unitPrice * item.units));
  assert.equal(order.simulated, true);
  assert.equal(order.status, 'PAID');
  assert.equal(order.date, TODAY);
});

test('[CT-DEMO-146] restaurar devolve o estado inicial e nada sobrevive da sessao', () => {
  const { session } = withSale(scriptBasket());
  const edited = reduceSession(session, { type: 'goal', record: createGoalRecord(
    { period: PERIOD, storeGoal: 90_000, sellers: SELLER_IDS.map(id => ({ sellerId: id, goal: 30_000 })) }, 'GERENTE') });
  assert.equal(edited.sales.length, 1);
  assert.equal(edited.goals.length, 1);
  const restored = reduceSession(edited, { type: 'restore' });
  assert.deepEqual(restored, initialSession());
  assert.deepEqual(toOverview(applySession(base, restored)), toOverview(base));
});

test('[CT-DEMO-147] metas editadas valem para o periodo, preservam o historico e recusam valores invalidos', () => {
  const input = { period: PERIOD, storeGoal: 72_000, sellers: SELLER_IDS.map(id => ({ sellerId: id, goal: 24_000 })) };
  assert.equal(validateGoal(input, 'GERENTE'), null);
  assert.equal(validateGoal(input, 'VENDEDOR'), 'SEM_PERMISSAO');
  assert.equal(validateGoal({ ...input, storeGoal: -1 }, 'CEO'), 'META_NEGATIVA');
  assert.equal(validateGoal({ ...input, sellers: [{ sellerId: SELLER, goal: -5 }] }, 'CEO'), 'META_NEGATIVA');
  assert.equal(validateGoal({ ...input, sellers: [{ sellerId: SELLER, goal: 1 }] }, 'CEO'), 'DISTRIBUICAO_DIFERENTE');
  assert.equal(validateGoal({ ...input, period: '2026-13' }, 'CEO'), 'PERIODO_INVALIDO');
  assert.equal(validateGoal({ ...input, sellers: [{ sellerId: 404, goal: 72_000 }] }, 'CEO'), 'VENDEDOR_INVALIDO');
  assert.equal(canEditGoals('VENDEDOR'), false);

  const session = reduceSession(initialSession(), { type: 'goal', record: createGoalRecord(input, 'CEO') });
  const ledger = applySession(base, session);
  const model = new Model(toOverview(ledger));
  assert.equal(model.monthGoal(11)?.storeGoal.amount, 72_000);
  assert.equal(model.sellerGoal(11, SELLER), 24_000);
  // A meta do plano continua no historico, com responsavel e data.
  const history = goalHistory(base, session, PERIOD);
  assert.equal(history.length, 2);
  assert.equal(history[0]?.source, 'PLANO');
  assert.equal(history[0]?.storeGoal, 6_000_000);
  assert.equal(history[1]?.source, 'DEMONSTRACAO');
  assert.ok(history[1]?.updatedBy.includes('CEO'));
  // Os outros meses nao mudam.
  assert.equal(model.monthGoal(10)?.storeGoal.amount, 60_000);
});

test('[CT-DEMO-148] o recorte de periodo resolve intervalos coerentes e nunca passa de hoje', () => {
  const filters = initialSession().filters;
  assert.deepEqual(resolveRange({ ...filters, kind: 'TODAY' }, TODAY), { from: TODAY, to: TODAY });
  assert.deepEqual(resolveRange({ ...filters, kind: 'D7' }, TODAY), { from: '2026-11-11', to: TODAY });
  assert.deepEqual(resolveRange({ ...filters, kind: 'MONTH' }, TODAY), { from: '2026-11-01', to: TODAY });
  assert.deepEqual(resolveRange({ ...filters, kind: 'PREV_MONTH' }, TODAY), { from: '2026-10-01', to: '2026-10-31' });
  assert.deepEqual(resolveRange({ ...filters, kind: 'CUSTOM', from: '2026-10-05', to: '2026-10-01' }, TODAY),
    { from: '2026-10-01', to: '2026-10-05' });
  assert.deepEqual(resolveRange({ ...filters, kind: 'CUSTOM', from: '2026-11-01', to: '2027-01-01' }, TODAY),
    { from: '2026-11-01', to: TODAY });
  assert.equal(periodForRange({ from: '2026-10-01', to: '2026-10-31' }), '2026-10');
});

test('[CT-DEMO-149] o filtro de categoria muda indicadores, mas nunca a meta do mes', () => {
  const model = new Model(toOverview(base));
  const all = sliceOf(model, base, MONTH, demoFilters());
  const shirts = sliceOf(model, base, MONTH, demoFilters({ categoryId: 1 }));
  assert.ok(shirts.measures.net > 0 && shirts.measures.net < all.measures.net);
  assert.equal(monthGoalView(model, PERIOD, TODAY, null).goal, 60_000);
  // Conversao e sempre da loja; por vendedor nao existe (o modelo nao tem atendimento por pessoa).
  assert.equal(sliceOf(model, base, MONTH, demoFilters({ sellerId: SELLER })).conversion, null);
  assert.equal(all.conversion, (all.measures.orders * 100) / visitsIn(base, MONTH));
});

test('[CT-DEMO-150] o estado guardado na aba e conferido: conteudo adulterado e descartado', () => {
  const { session } = withSale(scriptBasket());
  const restored = restoreSession(serializeSession(session), base);
  assert.ok(restored);
  assert.equal(restored.sales.length, 1);
  assert.equal(orderNet(restored.sales[0]!), 44_970);
  assert.equal(restored.sales[0]!.simulated, true);

  const tampered = (change: (value: Record<string, unknown>) => void) => {
    const value = JSON.parse(serializeSession(session)) as Record<string, unknown>;
    change(value);
    return restoreSession(JSON.stringify(value), base);
  };
  assert.equal(tampered(value => { (value.sales as Record<string, unknown>[])[0]!.sellerId = 1; }), null, 'vendedor fora da equipe');
  assert.equal(tampered(value => { (value.sales as Record<string, unknown>[])[0]!.date = '2027-01-01'; }), null, 'data futura');
  assert.equal(tampered(value => { (value.sales as Record<string, unknown>[])[0]!.customerId = 999_999; }), null, 'cliente inexistente');
  assert.equal(tampered(value => {
    const items = (value.sales as { items: Record<string, unknown>[] }[])[0]!.items;
    items[0]!.units = -5;
  }), null, 'quantidade negativa');
  assert.equal(tampered(value => {
    const items = (value.sales as { items: Record<string, unknown>[] }[])[0]!.items;
    items[0]!.discount = 999_999;
  }), null, 'desconto maior que o item');
  assert.equal(tampered(value => { value.version = 2; }), null, 'versao desconhecida');
  assert.equal(restoreSession('{', base), null, 'JSON invalido');
  assert.equal(restoreSession(null, base), null, 'aba sem estado');
  // Meta adulterada (distribuicao que nao fecha) tambem e descartada.
  const withGoal = reduceSession(session, { type: 'goal', record: createGoalRecord(
    { period: PERIOD, storeGoal: 60_000, sellers: SELLER_IDS.map(id => ({ sellerId: id, goal: 20_000 })) }, 'CEO') });
  const bad = JSON.parse(serializeSession(withGoal)) as { goals: { sellers: { goal: number }[] }[] };
  bad.goals[0]!.sellers[0]!.goal = 1;
  assert.equal(restoreSession(JSON.stringify(bad), base), null);
});

test('[CT-DEMO-151] trocar de perfil mantem o recorte e nao muda os dados da loja', () => {
  let session = initialSession();
  session = reduceSession(session, { type: 'period', kind: 'PREV_MONTH' });
  for (const role of DEMO_ROLES) {
    session = reduceSession(session, { type: 'role', role });
    assert.equal(session.filters.kind, 'PREV_MONTH', role);
  }
  assert.equal(session.role, 'CEO');
  assert.equal(session.view, 'executivo');
  // Trocar de perfil nao altera o registro: o modelo continua identico.
  assert.deepEqual(toOverview(applySession(base, session)), toOverview(base));
  // Um vendedor fora da equipe nao e aceito no seletor demonstrativo.
  assert.equal(reduceSession(session, { type: 'seller', sellerId: 404 }).sellerId, session.sellerId);
});

test('[CT-DEMO-152] visitantes diferentes nao compartilham alteracoes: cada estado e independente', () => {
  const visitorA = withSale(scriptBasket()).session;
  const visitorB = initialSession();
  const ledgerA = applySession(base, visitorA);
  const ledgerB = applySession(base, visitorB);
  assert.equal(ledgerA.orders.length, base.orders.length + 1);
  assert.equal(ledgerB.orders.length, base.orders.length);
  assert.deepEqual(toOverview(ledgerB), toOverview(base));
  // A base compartilhada nunca e alterada no lugar.
  assert.equal(base.orders.length, generateLedger({ today: TODAY }).orders.length);
});

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
