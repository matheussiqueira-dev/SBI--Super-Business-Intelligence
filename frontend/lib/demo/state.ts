// Estado da demonstracao (secoes 10, 11 e 12 do plano de evolucao). O que o visitante faz vive aqui: perfil escolhido,
// recorte de periodo, vendas simuladas e metas editadas. Nada disso toca a API nem o banco: a base sintetica e
// recriada da semente e o estado do visitante fica no sessionStorage da propria aba, isolado de outros visitantes.
import { iso, type Range } from '../executive.ts';
import { addDays, periodOf, periodRange, previousPeriod } from './calendar.ts';
import {
  cents, orderNet, type DemoGoalRecord, type DemoLedger, type DemoOrder, type DemoOrderItem, type PaymentMethod,
} from './ledger.ts';
import { CATEGORIES, PEOPLE_BY_ROLE, SELLER_IDS, type DemoRoleName, type ScenarioPerson } from './scenario.ts';
import { shareOut } from './random.ts';

export type DemoRole = DemoRoleName;
export const DEMO_ROLES: readonly DemoRole[] = ['VENDEDOR', 'GERENTE', 'CEO'];

export const ROLE_LABEL: Readonly<Record<DemoRole, string>> = { VENDEDOR: 'Vendedor', GERENTE: 'Gerente', CEO: 'CEO' };

/** Recortes de periodo oferecidos nos paineis (secao 15). */
export type DemoPeriodKind = 'TODAY' | 'D7' | 'MONTH' | 'PREV_MONTH' | 'CUSTOM';
export const PERIOD_LABEL: Readonly<Record<DemoPeriodKind, string>> = {
  TODAY: 'Hoje',
  D7: 'Últimos 7 dias',
  MONTH: 'Mês atual',
  PREV_MONTH: 'Mês anterior',
  CUSTOM: 'Intervalo personalizado',
};

export interface DemoFilters {
  kind: DemoPeriodKind;
  /** Usados apenas quando kind = CUSTOM. */
  from: string;
  to: string;
  categoryId: number | null;
}

export interface DemoSession {
  version: 2;
  role: DemoRole;
  /** Seleção de pessoa independente para cada nível da demonstração. */
  personIds: Record<DemoRole, number>;
  /** Area aberta dentro do perfil. */
  view: string;
  filters: DemoFilters;
  /** Vendas registradas pelo visitante. */
  sales: DemoOrder[];
  /** Metas alteradas pelo visitante, em ordem de alteracao (a ultima do periodo e a que vale). */
  goals: DemoGoalRecord[];
}

export const DEMO_STORAGE_KEY = 'sbi-demo-sessao-v2';
/** Teto de vendas simuladas por visitante, para a aba nao crescer sem limite. */
export const MAX_SIMULATED_SALES = 50;

export const DEFAULT_VIEW: Readonly<Record<DemoRole, string>> = {
  VENDEDOR: 'desempenho', GERENTE: 'visao-geral', CEO: 'executivo',
};

export function initialSession(): DemoSession {
  return {
    version: 2, role: 'VENDEDOR', view: DEFAULT_VIEW.VENDEDOR,
    personIds: {
      VENDEDOR: PEOPLE_BY_ROLE.VENDEDOR[0]!.id,
      GERENTE: PEOPLE_BY_ROLE.GERENTE[0]!.id,
      CEO: PEOPLE_BY_ROLE.CEO[0]!.id,
    },
    filters: { kind: 'MONTH', from: '', to: '', categoryId: null }, sales: [], goals: [],
  };
}

// ---------------------------------------------------------------- periodo

/** Intervalo de datas do recorte; o personalizado e ordenado e nunca passa de hoje. */
export function resolveRange(filters: DemoFilters, today: string): Range {
  switch (filters.kind) {
    case 'TODAY':
      return { from: today, to: today };
    case 'D7':
      return { from: addDays(today, -6), to: today };
    case 'PREV_MONTH':
      return periodRange(previousPeriod(periodOf(today)));
    case 'CUSTOM': {
      const from = filters.from || today;
      const to = filters.to || today;
      const ordered = from <= to ? { from, to } : { from: to, to: from };
      return { from: ordered.from, to: ordered.to > today ? today : ordered.to };
    }
    case 'MONTH':
    default: {
      const { from } = periodRange(periodOf(today));
      return { from, to: today };
    }
  }
}

/** Mes de referencia do recorte, para a meta mensal: o mes do fim do intervalo. */
export function periodFor(range: Range): string {
  return periodOf(range.to);
}

// ---------------------------------------------------------------- venda simulada

export interface SaleInput {
  sellerId: number;
  items: readonly { productId: number; units: number }[];
  paymentMethod: PaymentMethod;
  customerId: number;
  /** Desconto comercial do pedido em % (dentro da alcada do papel). */
  discountPercent: number;
}

/** Alcada de desconto manual por papel, como no banco (V11): o vendedor vai ate 5%, o gerente e o CEO ate 20%. */
export const DISCOUNT_LIMIT: Readonly<Record<DemoRole, number>> = { VENDEDOR: 5, GERENTE: 20, CEO: 20 };

export type SaleProblem = 'SEM_ITEM' | 'QUANTIDADE_INVALIDA' | 'PRODUTO_INEXISTENTE' | 'PRODUTO_INATIVO'
  | 'ESTOQUE_INSUFICIENTE' | 'DESCONTO_ACIMA_DA_ALCADA' | 'VENDEDOR_INVALIDO' | 'LIMITE_DE_VENDAS';

export const SALE_PROBLEM_MESSAGE: Readonly<Record<SaleProblem, string>> = {
  SEM_ITEM: 'Escolha ao menos um produto para a venda.',
  QUANTIDADE_INVALIDA: 'A quantidade de cada item precisa ser um número inteiro maior que zero.',
  PRODUTO_INEXISTENTE: 'Produto não encontrado no catálogo da demonstração.',
  PRODUTO_INATIVO: 'Produto fora de linha não pode ser vendido.',
  ESTOQUE_INSUFICIENTE: 'Estoque disponível insuficiente para a quantidade pedida.',
  DESCONTO_ACIMA_DA_ALCADA: 'Desconto acima da alçada do perfil ativo.',
  VENDEDOR_INVALIDO: 'Escolha um vendedor disponível para o perfil em exibição.',
  LIMITE_DE_VENDAS: 'A demonstração aceita até 50 vendas simuladas por visitante. Use "Restaurar demonstração".',
};

export function saleSellers({ role, personIds }: DemoSession): readonly ScenarioPerson[] {
  const sellers = PEOPLE_BY_ROLE.VENDEDOR;
  if (role === 'VENDEDOR') return sellers.filter(person => person.id === personIds.VENDEDOR);
  if (role === 'GERENTE') return sellers.filter(person => person.managerId === personIds.GERENTE);
  return sellers;
}

/** Confere a venda simulada contra a equipe, o catálogo, o estoque e a alçada de desconto. */
export function validateSale(ledger: DemoLedger, input: SaleInput, session: DemoSession): SaleProblem | null {
  if (session.sales.length >= MAX_SIMULATED_SALES) return 'LIMITE_DE_VENDAS';
  if (!saleSellers(session).some(person => person.id === input.sellerId)) return 'VENDEDOR_INVALIDO';
  if (input.items.length === 0) return 'SEM_ITEM';
  if (!Number.isFinite(input.discountPercent) || input.discountPercent < 0) return 'DESCONTO_ACIMA_DA_ALCADA';
  if (input.discountPercent > DISCOUNT_LIMIT[session.role]) return 'DESCONTO_ACIMA_DA_ALCADA';
  for (const item of input.items) {
    if (!Number.isInteger(item.units) || item.units <= 0) return 'QUANTIDADE_INVALIDA';
    const product = ledger.products.find(candidate => candidate.id === item.productId);
    if (!product) return 'PRODUTO_INEXISTENTE';
    if (!product.active) return 'PRODUTO_INATIVO';
    if (item.units > product.stock) return 'ESTOQUE_INSUFICIENTE';
  }
  return null;
}

/**
 * Monta a venda simulada como um pedido pago de hoje: preco e custo vem do catalogo e o desconto do pedido e repartido
 * entre os itens em centavos, para a soma dos itens fechar com o total do pedido.
 */
export function createSimulatedSale(ledger: DemoLedger, input: SaleInput, now: Date = new Date()): DemoOrder {
  const items: DemoOrderItem[] = input.items.map(entry => {
    const product = ledger.products.find(candidate => candidate.id === entry.productId)!;
    return { productId: product.id, units: entry.units, unitPrice: product.price, discount: 0, cost: product.cost * entry.units };
  });
  const prices = items.map(item => item.unitPrice * item.units);
  const gross = prices.reduce((sum, price) => sum + price, 0);
  const parts = shareOut(Math.round(gross * input.discountPercent / 100), prices);
  items.forEach((item, index) => { item.discount = parts[index] ?? 0; });
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return {
    id: ledger.nextOrderId, date: ledger.today, time, sellerId: input.sellerId, customerId: input.customerId,
    paymentMethod: input.paymentMethod, status: 'PAID', items, refund: null, simulated: true,
  };
}

// ---------------------------------------------------------------- metas editadas

export type GoalProblem = 'META_NEGATIVA' | 'DISTRIBUICAO_DIFERENTE' | 'PERIODO_INVALIDO' | 'VENDEDOR_INVALIDO' | 'SEM_PERMISSAO';

export const GOAL_PROBLEM_MESSAGE: Readonly<Record<GoalProblem, string>> = {
  META_NEGATIVA: 'Meta não pode ser negativa.',
  DISTRIBUICAO_DIFERENTE: 'A soma das metas individuais precisa ser igual à meta da loja.',
  PERIODO_INVALIDO: 'Informe o mês no formato AAAA-MM.',
  VENDEDOR_INVALIDO: 'Distribua a meta apenas entre os vendedores da loja.',
  SEM_PERMISSAO: 'O perfil ativo não edita metas. Troque para Gerente ou CEO.',
};

/** Só gerente e CEO editam metas, como na aplicação autenticada (área METAS). */
export function canEditGoals(role: DemoRole): boolean {
  return role === 'GERENTE' || role === 'CEO';
}

export interface GoalInput { period: string; storeGoal: number; sellers: readonly { sellerId: number; goal: number }[] }

/** Mesmas restricoes do servidor: nada negativo, periodo AAAA-MM e distribuicao fechando exatamente com a loja. */
export function validateGoal(input: GoalInput, role: DemoRole): GoalProblem | null {
  if (!canEditGoals(role)) return 'SEM_PERMISSAO';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.period)) return 'PERIODO_INVALIDO';
  if (!Number.isFinite(input.storeGoal) || input.storeGoal < 0) return 'META_NEGATIVA';
  for (const seller of input.sellers) {
    if (!SELLER_IDS.includes(seller.sellerId)) return 'VENDEDOR_INVALIDO';
    if (!Number.isFinite(seller.goal) || seller.goal < 0) return 'META_NEGATIVA';
  }
  const distributed = input.sellers.reduce((sum, seller) => sum + cents(seller.goal), 0);
  if (input.sellers.length > 0 && distributed !== cents(input.storeGoal)) return 'DISTRIBUICAO_DIFERENTE';
  return null;
}

export function createGoalRecord(input: GoalInput, { role, personIds }: DemoSession, now: Date = new Date()): DemoGoalRecord {
  const person = PEOPLE_BY_ROLE[role].find(candidate => candidate.id === personIds[role])!;
  return {
    period: input.period, storeGoal: cents(input.storeGoal),
    sellers: input.sellers.map(seller => ({ sellerId: seller.sellerId, goal: cents(seller.goal) })),
    updatedBy: `${person.name} · ${ROLE_LABEL[role]}`, updatedAt: now.toISOString(), source: 'DEMONSTRACAO',
  };
}

// ---------------------------------------------------------------- reducer

export type DemoAction =
  | { type: 'role'; role: DemoRole }
  | { type: 'person'; role: DemoRole; personId: number }
  | { type: 'view'; view: string }
  | { type: 'period'; kind: DemoPeriodKind }
  | { type: 'custom'; from: string; to: string }
  | { type: 'category'; categoryId: number | null }
  | { type: 'sale'; order: DemoOrder }
  | { type: 'goal'; record: DemoGoalRecord }
  | { type: 'hydrate'; session: DemoSession }
  | { type: 'restore' };

export function reduceSession(state: DemoSession, action: DemoAction): DemoSession {
  switch (action.type) {
    case 'role':
      // Trocar de perfil mantem o recorte de periodo e abre a area inicial do novo perfil.
      return { ...state, role: action.role, view: DEFAULT_VIEW[action.role] ?? state.view };
    case 'person':
      if (!PEOPLE_BY_ROLE[action.role].some(person => person.id === action.personId)) return state;
      return { ...state, personIds: { ...state.personIds, [action.role]: action.personId } };
    case 'view':
      return { ...state, view: action.view };
    case 'period':
      return { ...state, filters: { ...state.filters, kind: action.kind } };
    case 'custom':
      return { ...state, filters: { ...state.filters, kind: 'CUSTOM', from: action.from, to: action.to } };
    case 'category':
      return { ...state, filters: { ...state.filters, categoryId: action.categoryId } };
    case 'sale':
      return state.sales.length >= MAX_SIMULATED_SALES ? state : { ...state, sales: [...state.sales, action.order] };
    case 'goal':
      return { ...state, goals: [...state.goals, action.record] };
    case 'hydrate':
      // Estado guardado na aba, ja conferido por restoreSession.
      return action.session;
    case 'restore':
      return initialSession();
    default:
      return state;
  }
}

// ---------------------------------------------------------------- base + estado do visitante

/**
 * Registro efetivo da demonstracao: a base sintetica com as vendas simuladas somadas, o estoque baixado por elas e as
 * metas editadas no lugar das do plano. E a unica fonte dos tres paineis, entao uma venda aparece nos tres de uma vez.
 */
export function applySession(base: DemoLedger, session: DemoSession): DemoLedger {
  if (session.sales.length === 0 && session.goals.length === 0) return base;
  const soldUnits = new Map<number, number>();
  for (const order of session.sales) {
    for (const item of order.items) soldUnits.set(item.productId, (soldUnits.get(item.productId) ?? 0) + item.units);
  }
  const goals = base.goals.map(goal => {
    const edits = session.goals.filter(record => record.period === goal.period);
    return edits.length > 0 ? edits[edits.length - 1]! : goal;
  });
  for (const record of session.goals) {
    if (!goals.some(goal => goal.period === record.period)) goals.push(record);
  }
  return {
    ...base,
    products: base.products.map(product => {
      const sold = soldUnits.get(product.id) ?? 0;
      return sold > 0 ? { ...product, stock: Math.max(0, product.stock - sold) } : product;
    }),
    orders: [...base.orders, ...session.sales],
    goals: goals.sort((a, b) => a.period.localeCompare(b.period)),
    nextOrderId: base.nextOrderId + session.sales.length,
  };
}

/** Historico de uma meta: a do plano e cada alteracao do visitante, na ordem. */
export function goalHistory(base: DemoLedger, session: DemoSession, period: string): DemoGoalRecord[] {
  return [
    ...base.goals.filter(goal => goal.period === period),
    ...session.goals.filter(record => record.period === period),
  ];
}

/** Visitantes do recorte, somados dia a dia (base da conversao comercial). */
export function visitsIn(ledger: DemoLedger, range: Range): number {
  let total = 0;
  for (const [day, visits] of Object.entries(ledger.visitors)) {
    if (day >= range.from && day <= range.to) total += visits;
  }
  return total;
}

// ---------------------------------------------------------------- persistencia na aba

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;
const PAYMENTS: readonly PaymentMethod[] = ['PIX', 'CARD', 'BOLETO'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Le o estado guardado na aba. O conteudo do sessionStorage e editavel pelo visitante, entao tudo e conferido contra o
 * catalogo e o calendario da base; qualquer coisa fora do esperado descarta o estado e a demonstracao comeca limpa.
 */
export function restoreSession(raw: string | null, ledger: DemoLedger): DemoSession | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.version !== 2) return null;
  const fresh = initialSession();
  const role = DEMO_ROLES.includes(parsed.role as DemoRole) ? (parsed.role as DemoRole) : fresh.role;
  const rawIds = isRecord(parsed.personIds) ? parsed.personIds : {};
  const personIds = { ...fresh.personIds };
  for (const profile of DEMO_ROLES) {
    const id = Number(rawIds[profile]);
    if (PEOPLE_BY_ROLE[profile].some(person => person.id === id)) personIds[profile] = id;
  }
  const view = typeof parsed.view === 'string' && parsed.view.length <= 40 ? parsed.view : DEFAULT_VIEW[role]!;
  const filtersRaw = isRecord(parsed.filters) ? parsed.filters : {};
  const kind = (['TODAY', 'D7', 'MONTH', 'PREV_MONTH', 'CUSTOM'] as const).includes(filtersRaw.kind as DemoPeriodKind)
    ? (filtersRaw.kind as DemoPeriodKind) : fresh.filters.kind;
  const first = periodRange(ledger.periods[0] ?? periodOf(ledger.today)).from;
  const inWindow = (value: unknown): string => typeof value === 'string' && DATE.test(value) && value >= first && value <= ledger.today ? value : '';
  const categoryId = CATEGORIES.find(category => category.id === filtersRaw.categoryId)?.id ?? null;

  const products = new Map(ledger.products.map(product => [product.id, product]));
  const customers = new Set(ledger.customers.map(customer => customer.id));
  const sales: DemoOrder[] = [];
  if (Array.isArray(parsed.sales)) {
    for (const entry of parsed.sales.slice(0, MAX_SIMULATED_SALES)) {
      if (!isRecord(entry) || !Array.isArray(entry.items) || entry.items.length === 0 || entry.items.length > ledger.products.length) return null;
      if (!SELLER_IDS.includes(Number(entry.sellerId)) || !PAYMENTS.includes(entry.paymentMethod as PaymentMethod)) return null;
      if (typeof entry.date !== 'string' || !DATE.test(entry.date) || entry.date < first || entry.date > ledger.today) return null;
      if (!customers.has(Number(entry.customerId))) return null;
      const items: DemoOrderItem[] = [];
      for (const item of entry.items) {
        if (!isRecord(item)) return null;
        const product = products.get(Number(item.productId));
        const units = Number(item.units);
        if (!product || !product.active || !Number.isInteger(units) || units <= 0 || units > 99) return null;
        const discount = Number(item.discount);
        const gross = product.price * units;
        if (!Number.isInteger(discount) || discount < 0 || discount > gross) return null;
        items.push({ productId: product.id, units, unitPrice: product.price, discount, cost: product.cost * units });
      }
      const time = typeof entry.time === 'string' && /^\d{2}:\d{2}$/.test(entry.time) ? entry.time : '12:00';
      sales.push({
        id: ledger.nextOrderId + sales.length, date: entry.date, time, sellerId: Number(entry.sellerId),
        customerId: Number(entry.customerId), paymentMethod: entry.paymentMethod as PaymentMethod, status: 'PAID',
        items, refund: null, simulated: true,
      });
    }
  }

  const goals: DemoGoalRecord[] = [];
  if (Array.isArray(parsed.goals)) {
    for (const entry of parsed.goals.slice(0, 60)) {
      if (!isRecord(entry) || typeof entry.period !== 'string' || !PERIOD.test(entry.period)) return null;
      const storeGoal = Number(entry.storeGoal);
      if (!Number.isInteger(storeGoal) || storeGoal < 0 || storeGoal > 999_999_999_999) return null;
      if (!Array.isArray(entry.sellers)) return null;
      const sellers: { sellerId: number; goal: number }[] = [];
      for (const seller of entry.sellers) {
        if (!isRecord(seller) || !SELLER_IDS.includes(Number(seller.sellerId))) return null;
        const goal = Number(seller.goal);
        if (!Number.isInteger(goal) || goal < 0) return null;
        sellers.push({ sellerId: Number(seller.sellerId), goal });
      }
      if (sellers.length > 0 && sellers.reduce((sum, seller) => sum + seller.goal, 0) !== storeGoal) return null;
      goals.push({
        period: entry.period, storeGoal, sellers,
        updatedBy: typeof entry.updatedBy === 'string' ? entry.updatedBy.slice(0, 80) : 'Demonstração',
        updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt.slice(0, 40) : `${ledger.today}T12:00:00-03:00`,
        source: 'DEMONSTRACAO',
      });
    }
  }

  return {
    version: 2, role, personIds, view,
    filters: { kind, from: inWindow(filtersRaw.from), to: inWindow(filtersRaw.to), categoryId },
    sales, goals,
  };
}

/** Só o que o visitante mudou vai para a aba; a base sintetica volta da semente a cada carregamento. */
export function serializeSession(session: DemoSession): string {
  return JSON.stringify({
    version: session.version, role: session.role, personIds: session.personIds, view: session.view, filters: session.filters,
    sales: session.sales.map(order => ({
      date: order.date, time: order.time, sellerId: order.sellerId, customerId: order.customerId,
      paymentMethod: order.paymentMethod,
      items: order.items.map(item => ({ productId: item.productId, units: item.units, discount: item.discount })),
    })),
    goals: session.goals,
  });
}

/** Total liquido de um pedido em reais, para a mensagem de confirmacao da venda simulada. */
export function orderTotal(order: DemoOrder): number {
  return orderNet(order) / 100;
}

export const TODAY_ISO = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
export { iso };
