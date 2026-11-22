// Base sintetica da demonstracao (secao 4 do plano de evolucao). Um registro de pedidos e a unica fonte: os fatos do
// painel (itens vendidos e estornos) sao derivados dele, entao vendedor, gerente e CEO leem sempre a mesma transacao.
// Dinheiro circula em centavos inteiros e so vira reais na saida, para a soma das partes fechar com o total.
import { DEMO_PRODUCTS } from './catalog.ts';
import {
  ADD_ON_CATEGORY_ID, ADD_ON_CHANCE, ANNUAL_GOAL, CATEGORIES, CONVERSION_RANGE, CUSTOMER_COUNT,
  CUSTOMER_FIRST_NAMES, CUSTOMER_LAST_NAMES, DEMO_SEED, HISTORY_MONTHS, LOW_STOCK_SKUS,
  MAX_ORDER_DISCOUNT_RATE, MONTHLY_PLAN, PAYMENT_MIX, PEOPLE, PEOPLE_BY_ROLE,
  PREVIOUS_YEAR_GOAL_FACTOR, REFERENCE_MONTH, SELLER_IDS, STORE_GOAL_BY_MONTH, WEEKDAY_WEIGHT,
} from './scenario.ts';
import { int, mulberry32, pick, real, seedFrom, shareOut, weighted, type Random } from './random.ts';
import {
  lastCompletePeriod, operatingDaysElapsed, operatingDaysIn, periodOf, periodRange, periodsUntil, weekdayOf,
} from './calendar.ts';
import type { Overview } from '../executive.ts';

export type PaymentMethod = 'PIX' | 'CARD' | 'BOLETO';
export type DemoOrderStatus = 'PAID' | 'CANCELED';

export interface DemoProduct {
  id: number;
  sku: string;
  name: string;
  categoryId: number;
  /** Preco de venda em centavos. */
  price: number;
  /** Preco de compra (custo medio) em centavos. */
  cost: number;
  active: boolean;
  /** Giro relativo, usado no sorteio do produto. */
  turnover: number;
  /** Disponivel em estoque; a venda simulada da demonstracao baixa esta quantidade. */
  stock: number;
  minStock: number;
}

export interface DemoOrderItem {
  productId: number;
  units: number;
  /** Preco unitario em centavos no momento da venda. */
  unitPrice: number;
  /** Desconto comercial do item em centavos (promocao somada ao desconto manual). */
  discount: number;
  /** Custo total do item em centavos; null quando a entrada nao registrou custo. */
  cost: number | null;
}

export interface DemoOrder {
  id: number;
  date: string;
  time: string;
  sellerId: number;
  customerId: number;
  paymentMethod: PaymentMethod;
  status: DemoOrderStatus;
  items: DemoOrderItem[];
  /** Estorno/devolucao do pedido (e do pedido, nunca de um produto). */
  refund: { date: string; amount: number } | null;
  /** Venda registrada pelo visitante durante a demonstracao. */
  simulated: boolean;
}

export interface DemoGoalRecord {
  period: string;
  /** Meta da loja em centavos. */
  storeGoal: number;
  sellers: { sellerId: number; goal: number }[];
  updatedBy: string;
  updatedAt: string;
  /** PLANO = meta inicial da base; DEMONSTRACAO = alterada pelo visitante. */
  source: 'PLANO' | 'DEMONSTRACAO';
}

export interface DemoCustomer { id: number; name: string }

export interface DemoLedger {
  /** Dia da loja (YYYY-MM-DD). */
  today: string;
  year: number;
  /** Meses gerados, em ordem crescente. */
  periods: string[];
  /** Ultimo mes completo: o cenario de referencia. */
  referencePeriod: string;
  people: typeof PEOPLE;
  products: DemoProduct[];
  customers: DemoCustomer[];
  orders: DemoOrder[];
  goals: DemoGoalRecord[];
  /** Meta anual da loja do ano corrente, em centavos. */
  annualGoal: number;
  /** Visitantes por dia de funcionamento (YYYY-MM-DD -> visitantes). */
  visitors: Record<string, number>;
  nextOrderId: number;
  seed: number;
}

export const cents = (value: number): number => Math.round(value * 100);
export const reais = (value: number): number => Math.round(value) / 100;
const brl = (value: number) => ({ amount: reais(value), currency: 'BRL' as const });

/** Receita de tabela do item (sem desconto). */
export const itemGross = (item: DemoOrderItem): number => item.unitPrice * item.units;
/** Receita liquida do item = tabela - desconto. */
export const itemNet = (item: DemoOrderItem): number => itemGross(item) - item.discount;
export const orderGross = (order: DemoOrder): number => order.items.reduce((sum, item) => sum + itemGross(item), 0);
export const orderNet = (order: DemoOrder): number => order.items.reduce((sum, item) => sum + itemNet(item), 0);
export const orderDiscount = (order: DemoOrder): number => order.items.reduce((sum, item) => sum + item.discount, 0);
export const orderUnits = (order: DemoOrder): number => order.items.reduce((sum, item) => sum + item.units, 0);

// ---------------------------------------------------------------- cadastros

function buildProducts(): DemoProduct[] {
  return DEMO_PRODUCTS.map(([sku, name, source, price, cost], index) => {
    const category = CATEGORIES.find(item => item.source === source);
    if (!category) throw new Error(`Categoria Olist sem configuração: ${source}`);
    const low = LOW_STOCK_SKUS.includes(sku);
    const turnover = Math.max(1, Math.round(10 / (1 + price / cents(1_000))));
    const minStock = Math.max(3, Math.round(turnover * 1.1));
    return {
      id: index + 1, sku, name, categoryId: category.id, price, cost, active: true, turnover,
      stock: low ? minStock - 1 - (index % 2) : minStock + 6 + ((index * 7) % 46),
      minStock,
    };
  });
}

function buildCustomers(rng: Random): DemoCustomer[] {
  return Array.from({ length: CUSTOMER_COUNT }, (_, index) => ({
    id: index + 1,
    name: `${pick(rng, CUSTOMER_FIRST_NAMES)} ${pick(rng, CUSTOMER_LAST_NAMES)}`,
  }));
}

/** Meta da loja do mes: plano por mes do ano, com fator menor nos anos anteriores ao corrente. */
export function plannedStoreGoal(period: string, year: number): number {
  const [periodYear, month] = period.split('-').map(Number) as [number, number];
  const base = STORE_GOAL_BY_MONTH[month - 1] ?? 60_000;
  const factor = periodYear < year ? PREVIOUS_YEAR_GOAL_FACTOR ** (year - periodYear) : 1;
  return cents(Math.round((base * factor) / 100) * 100);
}

/**
 * Metas do mes: a da loja vem do plano e a distribuicao divide igualmente entre os vendedores, fechando exatamente em
 * centavos (como o servidor exige). Alem dos meses com historico, entram os meses que faltam do ano corrente: periodo
 * futuro aparece so como meta, nunca como venda realizada.
 */
function buildGoals(periods: readonly string[], year: number, referencePeriod: string): DemoGoalRecord[] {
  const planned = [...new Set([...periods, ...Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`)])]
    .filter(period => Number(period.slice(0, 4)) <= year)
    .sort();
  return planned.map(period => {
    const storeGoal = period === referencePeriod ? cents(REFERENCE_MONTH.storeGoal) : plannedStoreGoal(period, year);
    const parts = shareOut(storeGoal, SELLER_IDS.map(() => 1));
    return {
      period, storeGoal,
      sellers: SELLER_IDS.map((sellerId, index) => ({ sellerId, goal: parts[index] ?? 0 })),
      updatedBy: 'Plano comercial da demonstração',
      updatedAt: `${periodRange(period).from}T09:00:00-03:00`,
      source: 'PLANO' as const,
    };
  });
}

// ---------------------------------------------------------------- plano do mes

interface SellerPlan { sellerId: number; sales: number; orders: number }
interface MonthPlan { period: string; net: number; refund: number; sales: number; sellers: SellerPlan[]; canceled: number }

/** Atingimento sorteado do mes: meses acima e abaixo da meta, nunca todos positivos. */
function achievementOf(period: string, seed: number): number {
  const rng = mulberry32(seedFrom(`atingimento:${period}`, seed));
  const draw = rng();
  // Cauda baixa mais pesada: a loja fecha abaixo da meta com mais frequencia do que acima.
  if (draw < 0.18) return real(rng, 0.78, 0.88);
  if (draw < 0.62) return real(rng, 0.88, 0.99);
  if (draw < 0.9) return real(rng, 1.0, 1.08);
  return real(rng, 1.08, 1.16);
}

function monthPlan(period: string, ledger: Pick<DemoLedger, 'today' | 'year' | 'referencePeriod' | 'seed'>,
                   goal: DemoGoalRecord): MonthPlan {
  const seed = ledger.seed;
  const rng = mulberry32(seedFrom(`plano:${period}`, seed));
  const current = period === periodOf(ledger.today);

  if (period === ledger.referencePeriod) {
    // Cenario de referencia da secao 4.2: reconcilia exatamente, sem estorno no mes.
    return {
      period, net: cents(REFERENCE_MONTH.netRevenue), refund: 0, sales: cents(REFERENCE_MONTH.netRevenue),
      sellers: REFERENCE_MONTH.perSeller.map(seller => ({ sellerId: seller.id, sales: cents(seller.netRevenue), orders: seller.orders })),
      canceled: int(rng, 2, 4),
    };
  }

  const total = operatingDaysIn(period).length;
  const elapsed = current ? operatingDaysElapsed(period, ledger.today) : total;
  if (elapsed === 0) return { period, net: 0, refund: 0, sales: 0, sellers: [], canceled: 0 };
  // No mes corrente a meta vale o mes inteiro; o realizado cobre so os dias ja abertos.
  const net = Math.round((goal.storeGoal * achievementOf(period, seed) * elapsed) / total);
  // Estorno ocasional (devolucao): nunca no mes de referencia nem no mes corrente com poucos dias.
  const refundRate = !current && rng() < 0.3 ? real(rng, 0.004, 0.016) : 0;
  const sales = Math.round(net / (1 - refundRate));
  const ticket = cents(MONTHLY_PLAN.averageTicket * real(rng, 0.9, 1.1));
  const weights = SELLER_IDS.map(sellerId => real(mulberry32(seedFrom(`peso:${period}:${sellerId}`, seed)), 0.8, 1.25));
  const parts = shareOut(sales, weights);
  return {
    period, net, refund: sales - net, sales,
    sellers: SELLER_IDS.map((sellerId, index) => {
      const sellerSales = parts[index] ?? 0;
      return { sellerId, sales: sellerSales, orders: Math.max(1, Math.round(sellerSales / ticket)) };
    }),
    canceled: int(rng, 1, 4),
  };
}

// ---------------------------------------------------------------- sacolas

interface Basket { products: readonly DemoProduct[]; gross: number; weight: number }

interface Catalog { byCategory: Map<number, DemoProduct[]>; baskets: Basket[] }

function catalogOf(products: readonly DemoProduct[]): Catalog {
  const byCategory = new Map<number, DemoProduct[]>();
  for (const product of products) {
    const list = byCategory.get(product.categoryId) ?? [];
    list.push(product);
    byCategory.set(product.categoryId, list);
  }
  const accessories = byCategory.get(ADD_ON_CATEGORY_ID) ?? [];
  const baskets = products.flatMap(product => [
    { products: [product], gross: product.price, weight: product.turnover * (1 - ADD_ON_CHANCE) },
    ...accessories.map(accessory => ({
      products: [product, accessory], gross: product.price + accessory.price,
      weight: product.turnover * ADD_ON_CHANCE / accessories.length,
    })),
  ]);
  return { byCategory, baskets };
}

function pickProduct(rng: Random, catalog: Catalog): DemoProduct {
  const category = weighted(rng, CATEGORIES, item => item.orderWeight);
  return weighted(rng, catalog.byCategory.get(category.id)!, product => product.turnover);
}

function addItem(items: DemoOrderItem[], product: DemoProduct): void {
  const existing = items.find(item => item.productId === product.id);
  if (existing) {
    existing.units += 1;
    existing.cost = product.cost * existing.units;
  } else {
    items.push({ productId: product.id, units: 1, unitPrice: product.price, discount: 0, cost: product.cost });
  }
}

function discountCap(gross: number): number {
  return Math.floor(gross * MAX_ORDER_DISCOUNT_RATE);
}

function itemsForTicket(rng: Random, catalog: Catalog, net: number): DemoOrderItem[] {
  const eligible = catalog.baskets.filter(basket => basket.gross >= net && basket.gross - net <= discountCap(basket.gross));
  // Prefere descontos de até 10%, com o teto comercial de 20% para o restante do catálogo.
  const near = eligible.filter(basket => basket.gross * 0.9 <= net);
  const choices = near.length > 0 ? near : eligible;
  const basket = choices.length > 0 ? weighted(rng, choices, option => option.weight)
    : catalog.baskets.reduce((best, option) => Math.abs(option.gross - net) < Math.abs(best.gross - net) ? option : best);
  const items: DemoOrderItem[] = [];
  for (const product of basket.products) addItem(items, product);
  const discount = Math.max(0, Math.min(basket.gross - net, discountCap(basket.gross)));
  const parts = shareOut(discount, items.map(itemGross));
  items.forEach((item, index) => { item.discount = parts[index] ?? 0; });
  return items;
}

/** Hora de atendimento: a loja abre as 9h e fecha as 19h (20h no sabado). */
function saleTime(rng: Random, date: string): string {
  const close = weekdayOf(date) === 6 ? 20 : 19;
  const hour = int(rng, 9, close - 1);
  return `${String(hour).padStart(2, '0')}:${String(int(rng, 0, 59)).padStart(2, '0')}`;
}

/** Pedidos pagos do vendedor no mês, com o mix e os preços de tabela do catálogo Apple. */
function buildSellerOrders(plan: SellerPlan, period: string, days: readonly string[], catalog: Catalog,
                           customers: readonly DemoCustomer[], seed: number): DemoOrder[] {
  if (plan.orders <= 0 || plan.sales <= 0 || days.length === 0) return [];
  const rng = mulberry32(seedFrom(`pedidos:${period}:${plan.sellerId}`, seed));
  const dayWeights = days.map(day => (WEEKDAY_WEIGHT[weekdayOf(day)] ?? 1) * real(rng, 0.72, 1.34));
  const perDay = shareOut(plan.orders, dayWeights);

  // Uma parte uniforme evita que uma venda cara absorva o mês. O restante acompanha o mix do catálogo.
  const baseSales = Math.round(plan.sales * 0.6);
  const baseTickets = shareOut(baseSales, Array<number>(plan.orders).fill(1));
  const mix = baseTickets.map(() => pickProduct(rng, catalog).price);
  const extras = shareOut(plan.sales - baseSales, mix);
  const tickets = baseTickets.map((base, index) => base + (extras[index] ?? 0));
  const orders: DemoOrder[] = [];
  days.forEach((day, index) => {
    for (let count = 0; count < (perDay[index] ?? 0); count++) {
      orders.push({
        id: 0, date: day, time: saleTime(rng, day), sellerId: plan.sellerId,
        customerId: pick(rng, customers).id, paymentMethod: weighted(rng, PAYMENT_MIX, item => item.weight).method,
        status: 'PAID', items: itemsForTicket(rng, catalog, tickets[orders.length]!), refund: null, simulated: false,
      });
    }
  });
  return orders;
}

// ---------------------------------------------------------------- estornos, cancelamentos e visitantes

/**
 * Devolucoes do mes: pedidos sorteados somam exatamente o estorno planejado. O estorno e do pedido (parcial quando e a
 * devolucao de um item) e fica no mes da venda, nunca depois de hoje.
 */
function applyRefunds(orders: readonly DemoOrder[], total: number, period: string, today: string, seed: number): void {
  if (total <= 0) return;
  const rng = mulberry32(seedFrom(`estorno:${period}`, seed));
  const last = periodRange(period).to;
  const limit = last < today ? last : today;
  const candidates = orders.filter(order => order.status === 'PAID' && orderNet(order) > 0)
    .map(order => ({ order, draw: rng() }))
    .sort((a, b) => a.draw - b.draw)
    .map(entry => entry.order);
  let left = total;
  for (const order of candidates) {
    if (left <= 0) break;
    const net = orderNet(order);
    const amount = net <= left ? net : left;
    const date = addDaysLocal(order.date, int(rng, 2, 9));
    order.refund = { date: date > limit ? limit : date, amount };
    left -= amount;
  }
}

function addDaysLocal(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Pedidos cancelados: ficam no historico e nunca entram no faturamento (so pagamento confirmado conta). */
function buildCanceled(plan: MonthPlan, days: readonly string[], catalog: Catalog, customers: readonly DemoCustomer[],
                       seed: number): DemoOrder[] {
  if (plan.canceled <= 0 || days.length === 0) return [];
  const rng = mulberry32(seedFrom(`cancelado:${plan.period}`, seed));
  return Array.from({ length: plan.canceled }, () => {
    const day = pick(rng, days);
    const items: DemoOrderItem[] = [];
    addItem(items, pickProduct(rng, catalog));
    return {
      id: 0, date: day, time: saleTime(rng, day), sellerId: pick(rng, SELLER_IDS),
      customerId: pick(rng, customers).id, paymentMethod: weighted(rng, PAYMENT_MIX, item => item.weight).method,
      status: 'CANCELED' as const, items, refund: null, simulated: false,
    };
  });
}

/** Visitantes do dia a partir dos compradores e de uma conversao sorteada na faixa do varejo. */
function buildVisitors(orders: readonly DemoOrder[], periods: readonly string[], today: string, seed: number): Record<string, number> {
  const buyers = new Map<string, Set<number>>();
  for (const order of orders) {
    if (order.status !== 'PAID') continue;
    (buyers.get(order.date) ?? buyers.set(order.date, new Set()).get(order.date)!).add(order.id);
  }
  const visitors: Record<string, number> = {};
  for (const period of periods) {
    for (const day of operatingDaysIn(period)) {
      if (day > today) continue;
      const rng = mulberry32(seedFrom(`visitas:${day}`, seed));
      const converted = buyers.get(day)?.size ?? 0;
      const rate = real(rng, CONVERSION_RANGE.min, CONVERSION_RANGE.max);
      visitors[day] = converted > 0 ? Math.max(converted, Math.round(converted / rate)) : int(rng, 1, 3);
    }
  }
  return visitors;
}

// ---------------------------------------------------------------- geracao

export interface LedgerOptions { today: string; seed?: number; months?: number }

export function generateLedger({ today, seed = DEMO_SEED, months = HISTORY_MONTHS }: LedgerOptions): DemoLedger {
  const year = Number(today.slice(0, 4));
  const periods = periodsUntil(today, months);
  const referencePeriod = lastCompletePeriod(today);
  const products = buildProducts();
  const catalog = catalogOf(products);
  const customers = buildCustomers(mulberry32(seedFrom('clientes', seed)));
  const goals = buildGoals(periods, year, referencePeriod);

  const orders: DemoOrder[] = [];
  for (const period of periods) {
    const goal = goals.find(item => item.period === period)!;
    const plan = monthPlan(period, { today, year, referencePeriod, seed }, goal);
    const days = operatingDaysIn(period).filter(day => day <= today);
    const monthOrders: DemoOrder[] = [];
    for (const sellerPlan of plan.sellers) {
      monthOrders.push(...buildSellerOrders(sellerPlan, period, days, catalog, customers, seed));
    }
    monthOrders.push(...buildCanceled(plan, days, catalog, customers, seed));
    monthOrders.sort((a, b) => (a.date === b.date ? (a.time < b.time ? -1 : 1) : a.date < b.date ? -1 : 1));
    applyRefunds(monthOrders, plan.refund, period, today, seed);
    orders.push(...monthOrders);
  }
  // Id cronologico: o historico da loja fica na ordem em que atendeu, e o proximo id continua a sequencia.
  orders.forEach((order, index) => { order.id = index + 1; });

  // O histórico mais antigo tem uma entrada sem custo contabilizado, sem mudar o custo atual do catálogo.
  const oldest = periods[0];
  const oldItem = oldest ? orders.find(order => order.status === 'PAID' && order.date.startsWith(oldest))?.items[0] : undefined;
  if (oldItem) oldItem.cost = null;

  return {
    today, year, periods, referencePeriod, people: PEOPLE, products, customers, orders, goals,
    annualGoal: cents(ANNUAL_GOAL), visitors: buildVisitors(orders, periods, today, seed),
    nextOrderId: orders.length + 1, seed,
  };
}

// ---------------------------------------------------------------- fatos do contrato

/**
 * Fatos do painel no formato de GET /executive/overview: um item de pedido pago por fato e um fato de estorno por
 * pedido devolvido. O gerente nao vende na demonstracao, entao o realizado da loja e a soma dos vendedores.
 */
export function toOverview(ledger: DemoLedger, options: { year?: number; generatedAt?: string } = {}): Overview {
  const year = options.year ?? ledger.year;
  const generatedAt = options.generatedAt ?? `${ledger.today}T12:00:00-03:00`;
  const paid = ledger.orders.filter(order => order.status === 'PAID');
  const sales = paid.flatMap(order => order.items.map(item => ({
    date: order.date, orderId: order.id, sellerId: order.sellerId, customerId: order.customerId,
    paymentMethod: order.paymentMethod, productId: item.productId, units: item.units,
    netRevenue: brl(itemNet(item)), discount: brl(item.discount), cost: item.cost === null ? null : brl(item.cost),
  })));
  const refunds = paid.filter(order => order.refund !== null).map(order => ({
    date: order.refund!.date, orderId: order.id, sellerId: order.sellerId, paymentMethod: order.paymentMethod,
    amount: brl(order.refund!.amount),
  }));
  const first = ledger.periods[0] ?? periodOf(ledger.today);
  const ceo = PEOPLE_BY_ROLE.CEO[0]!;
  return {
    year, today: ledger.today, from: periodRange(first).from, to: `${year}-12-31`,
    annualGoal: {
      year, amount: brl(ledger.annualGoal),
      updatedBy: { id: ceo.id, name: ceo.name },
      updatedAt: `${year}-01-05T09:00:00-03:00`,
    },
    monthlyGoals: ledger.goals.map(goal => ({
      period: goal.period, storeGoal: brl(goal.storeGoal),
      sellers: goal.sellers.map(seller => ({ sellerId: seller.sellerId, goal: brl(seller.goal) })),
    })),
    people: ledger.people.map(person => ({
      id: person.id, name: person.name, role: person.role, active: true, managerId: person.managerId,
    })),
    categories: CATEGORIES.map(category => ({ id: category.id, name: category.name })),
    products: ledger.products.map(product => ({
      id: product.id, sku: product.sku, name: product.name, categoryId: product.categoryId,
      price: brl(product.price), averageCost: brl(product.cost), active: product.active,
    })),
    sales, refunds, generatedAt,
  };
}

/** Anos com fatos na base, do mais recente para o mais antigo (seletor de ano do painel executivo). */
export function ledgerYears(ledger: DemoLedger): number[] {
  return [...new Set(ledger.periods.map(period => Number(period.slice(0, 4))))].sort((a, b) => b - a);
}
