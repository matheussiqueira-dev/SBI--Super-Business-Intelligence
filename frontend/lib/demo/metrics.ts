// Leituras que os paineis da demonstracao usam. Tudo sai do mesmo modelo semantico (lib/executive.ts) sobre o mesmo
// registro de pedidos, entao vendedor, gerente e CEO nunca mostram numeros diferentes para a mesma medida. Metas sao
// do mes; indicadores, graficos e rankings seguem o recorte de periodo escolhido (secao 15 do plano de evolucao).
import {
  measuresOf, NO_FILTERS, type Filters, type Measures, type Model, type ProductRow, type Range,
} from '../executive.ts';
import { daysBetween, operatingDaysBetween, periodOf, periodRange } from './calendar.ts';
import { assessGoal, conversionPercent, deriveTargets, itemsPerSale, type DerivedTargets, type GoalAssessment } from './targets.ts';
import { orderNet, orderUnits, type DemoLedger, type DemoOrder, type DemoProduct } from './ledger.ts';
import { visitsIn } from './state.ts';
import { MONTHLY_PLAN, SELLER_IDS } from './scenario.ts';

/** Filtros do modelo a partir das escolhas da demonstracao. */
export function demoFilters({ sellerId = null, categoryId = null, managerId = null }: {
  sellerId?: number | null; categoryId?: number | null; managerId?: number | null;
} = {}): Filters {
  return { ...NO_FILTERS, seller: sellerId, category: categoryId, team: managerId };
}

export interface DemoSlice {
  measures: Measures;
  /** Visitantes da loja no recorte (base da conversao); 0 quando o recorte nao tem dia de funcionamento. */
  visits: number;
  /** Conversao comercial da loja em %; null sem visitantes no recorte. */
  conversion: number | null;
  /** Itens por venda do recorte; null sem venda. */
  itemsPerSale: number | null;
  /** Dias de funcionamento do recorte. */
  operatingDays: number;
}

/** Medidas do recorte. A conversao e sempre da loja: o modelo nao tem atendimentos por vendedor. */
export function sliceOf(model: Model, ledger: DemoLedger, range: Range, filters: Filters): DemoSlice {
  const measures = model.measures(filters, range);
  const visits = visitsIn(ledger, range);
  const storeScope = filters.seller === null && filters.team === null;
  const storeOrders = filters.category === null ? measures.orders : model.measures(NO_FILTERS, range).orders;
  return {
    measures, visits,
    conversion: storeScope ? conversionPercent(storeOrders, visits) : null,
    itemsPerSale: itemsPerSale(measures.units, measures.orders),
    operatingDays: operatingDaysBetween(range.from, range.to).length,
  };
}

/** Serie diaria do recorte para o grafico de evolucao (faturamento e lucro bruto por dia). */
export function dailySeries(model: Model, filters: Filters, range: Range): { date: string; net: number; profit: number | null }[] {
  const sales = model.sales(filters, range);
  const refunds = model.refunds(filters, range);
  return daysBetween(range.from, range.to).map(date => {
    const measures = measuresOf(sales.filter(sale => sale.date === date), refunds.filter(refund => refund.date === date));
    return { date, net: measures.net, profit: measures.profit };
  });
}

/** Produtos do recorte, do maior para o menor faturamento. */
export function topProducts(model: Model, filters: Filters, range: Range, limit?: number): ProductRow[] {
  const rows = productTableIn(model, filters, range);
  return limit === undefined ? rows : rows.slice(0, limit);
}

/** Tabela de produtos restrita ao recorte de datas (model.productTable usa o recorte do proprio modelo). */
export function productTableIn(model: Model, filters: Filters, range: Range): ProductRow[] {
  const sales = model.sales(filters, range, 'product');
  const byProduct = new Map<number, typeof sales>();
  for (const sale of sales) {
    (byProduct.get(sale.productId) ?? byProduct.set(sale.productId, []).get(sale.productId)!).push(sale);
  }
  return [...byProduct.entries()].map(([productId, items]) => {
    const product = model.products.get(productId);
    const price = product?.price.amount ?? null;
    const cost = product?.averageCost?.amount ?? null;
    const measures = measuresOf(items, []);
    return {
      ...measures, key: productId, label: model.productName(productId), productId,
      sku: product?.sku ?? null, category: model.categoryName(model.categoryOf(productId)),
      price, averageCost: cost,
      unitMargin: price !== null && cost !== null ? price - cost : null,
      unitMarginPercent: price !== null && cost !== null && price > 0 ? ((price - cost) * 100) / price : null,
      markupPercent: price !== null && cost !== null && cost > 0 ? ((price - cost) * 100) / cost : null,
    };
  }).sort((a, b) => b.net - a.net || a.label.localeCompare(b.label, 'pt-BR'));
}

export interface GoalView {
  period: string;
  label: string;
  goal: number | null;
  realized: number;
  assessment: GoalAssessment;
}

/** Meta da loja, da equipe ou do vendedor no mês de referência. */
export function monthGoalView(model: Model, period: string, today: string, sellerId: number | null, managerId: number | null = null): GoalView {
  const range = periodRange(period);
  const monthly = model.overview.monthlyGoals.find(record => record.period === period);
  let goal: number | null = monthly?.storeGoal.amount ?? null;
  if (monthly && (sellerId !== null || managerId !== null)) {
    goal = monthly.sellers.filter(row => sellerId !== null ? row.sellerId === sellerId : model.teamOf(row.sellerId) === managerId)
      .reduce((sum, row) => sum + row.goal.amount, 0);
  }
  const realized = model.goalRealized(demoFilters({ sellerId, managerId }), range);
  const label = monthLabel(period);
  return { period, label, goal, realized, assessment: assessGoal({ goal, realized, period, today, label }) };
}

const MONTH_LABEL = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Fortaleza' });
export function monthLabel(period: string): string {
  return MONTH_LABEL.format(new Date(`${period}-15T12:00:00-03:00`));
}

export interface TeamRow {
  sellerId: number;
  name: string;
  goal: number;
  realized: number;
  achievement: number | null;
  remaining: number;
  deviation: number;
  orders: number;
  averageTicket: number | null;
  assessment: GoalAssessment;
  /** Faturamento do recorte escolhido (escopo diferente da meta, que e do mes). */
  periodNet: number;
}

/** Desempenho da equipe: meta e realizado do mes, mais o faturamento do recorte escolhido. */
export function teamRows(model: Model, period: string, today: string, range: Range, managerId: number | null = null): TeamRow[] {
  const monthScope = periodRange(period);
  const sellerIds = SELLER_IDS.filter(id => managerId === null || model.teamOf(id) === managerId);
  return sellerIds.map(sellerId => {
    const filters = demoFilters({ sellerId });
    const monthMeasures = model.measures(filters, monthScope);
    const { goal, assessment } = monthGoalView(model, period, today, sellerId);
    return {
      sellerId, name: model.personName(sellerId), goal: goal ?? 0, realized: monthMeasures.net,
      achievement: assessment.achievement, remaining: assessment.remaining ?? 0, deviation: assessment.deviation ?? 0,
      orders: monthMeasures.orders, averageTicket: monthMeasures.averageTicket, assessment,
      periodNet: model.measures(filters, range).net,
    };
  }).sort((a, b) => b.realized - a.realized);
}

/** Metas derivadas do mes (diaria, semanal, individual e o que a meta exige em vendas e ticket). */
export function targetsFor(model: Model, period: string, today: string, managerId: number | null = null): DerivedTargets | null {
  const goal = model.overview.monthlyGoals.find(record => record.period === period);
  if (!goal) return null;
  const sellers = goal.sellers.filter(row => managerId === null || model.teamOf(row.sellerId) === managerId);
  const monthly = managerId === null ? goal.storeGoal.amount : sellers.reduce((sum, row) => sum + row.goal.amount, 0);
  const plan = {
    ...MONTHLY_PLAN,
    salesCount: managerId === null ? MONTHLY_PLAN.salesCount : MONTHLY_PLAN.salesCount * sellers.length / SELLER_IDS.length,
  };
  return deriveTargets({
    period, monthly, today, plan,
    sellerGoals: sellers.map(seller => ({ sellerId: seller.sellerId, goal: seller.goal.amount })),
  });
}

export interface StockAlert extends DemoProduct { gap: number }

/** Produtos vendaveis com o disponivel abaixo do minimo. */
export function lowStock(ledger: DemoLedger): StockAlert[] {
  return ledger.products.filter(product => product.active && product.stock < product.minStock)
    .map(product => ({ ...product, gap: product.minStock - product.stock }))
    .sort((a, b) => b.gap - a.gap);
}

export interface CanceledSummary { count: number; amount: number }

/** Pedidos cancelados no recorte: ficam no historico e nunca entram no faturamento. */
export function canceledIn(ledger: DemoLedger, range: Range): CanceledSummary {
  const orders = ledger.orders.filter(order => order.status === 'CANCELED' && order.date >= range.from && order.date <= range.to);
  return { count: orders.length, amount: orders.reduce((sum, order) => sum + orderNet(order), 0) / 100 };
}

export interface RefundSummary { count: number; amount: number }

export function refundsIn(ledger: DemoLedger, range: Range): RefundSummary {
  const refunded = ledger.orders.filter(order => order.refund !== null && order.refund.date >= range.from && order.refund.date <= range.to);
  return { count: refunded.length, amount: refunded.reduce((sum, order) => sum + (order.refund?.amount ?? 0), 0) / 100 };
}

export interface LedgerOrderView {
  order: DemoOrder;
  customer: string;
  net: number;
  units: number;
  discount: number;
}

/** Historico de pedidos do recorte (um vendedor ou a loja), do mais recente para o mais antigo. */
export function orderHistory(ledger: DemoLedger, range: Range, sellerId: number | null, limit = 50): LedgerOrderView[] {
  const names = new Map(ledger.customers.map(customer => [customer.id, customer.name]));
  return ledger.orders
    .filter(order => order.date >= range.from && order.date <= range.to && (sellerId === null || order.sellerId === sellerId))
    .sort((a, b) => (a.date === b.date ? (a.time < b.time ? 1 : -1) : a.date < b.date ? 1 : -1))
    .slice(0, limit)
    .map(order => ({
      order, customer: names.get(order.customerId) ?? 'Cliente da demonstração',
      net: orderNet(order) / 100, units: orderUnits(order),
      discount: order.items.reduce((sum, item) => sum + item.discount, 0) / 100,
    }));
}

export interface StockMovement { date: string; productId: number; product: string; kind: 'SAIDA' | 'ENTRADA'; units: number }

/**
 * Movimentacoes do estoque no recorte: a saida e o item do pedido pago (o pedido e a propria movimentacao) e a entrada
 * e a reposicao sintetica do mes, para a tela de estoque nao supor que o disponivel caiu do ceu.
 */
export function stockMovements(ledger: DemoLedger, range: Range, limit = 40): StockMovement[] {
  const names = new Map(ledger.products.map(product => [product.id, product.name]));
  const out: StockMovement[] = [];
  for (const order of ledger.orders) {
    if (order.status !== 'PAID' || order.date < range.from || order.date > range.to) continue;
    for (const item of order.items) {
      out.push({ date: order.date, productId: item.productId, product: names.get(item.productId) ?? '—', kind: 'SAIDA', units: item.units });
    }
  }
  return out.sort((a, b) => (a.date === b.date ? b.units - a.units : a.date < b.date ? 1 : -1)).slice(0, limit);
}

/** Periodo (AAAA-MM) de referencia das metas do recorte: o mes em que o recorte termina. */
export function periodForRange(range: Range): string {
  return periodOf(range.to);
}

/** Mes anterior fechado, como recorte de comparacao. */
export function previousMonthRange(period: string): Range {
  const [year, month] = period.split('-').map(Number) as [number, number];
  const previous = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
  return periodRange(previous);
}
