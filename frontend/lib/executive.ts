// Painel executivo do CEO (RF-28, RF-29): modelo semantico no navegador, como um modelo importado de BI.
// A API entrega os fatos do ano e do anterior (GET /executive/overview); filtros cruzados, drill-down e comparacoes
// sao calculados aqui, sem nova chamada. Mesmas regras do faturamento do GERENTE (D9, C-20):
// - realizado = itens de pedidos pagos - estornos, no dia do pagamento (ou do estorno);
// - custo ausente nunca vira zero: o lucro do recorte fica nulo ("Não informado");
// - o estorno e do pedido, nao do produto: some dos recortes por produto e categoria (aviso na tela);
// - meta compara com a venda total: filtros de produto, categoria e pagamento nao mudam metas.
import type { z } from 'zod';
import type { GetExecutiveOverviewResponse } from './api/generated/sbi.zod.ts';

export type Overview = z.infer<typeof GetExecutiveOverviewResponse>;
export type SaleFact = Overview['sales'][number];
export type RefundFact = Overview['refunds'][number];
export type Person = Overview['people'][number];
export type Product = Overview['products'][number];
export type PaymentMethod = SaleFact['paymentMethod'];

/** Equipe sem gerente (vendedor sem responsavel, venda de CEO ou pedido antigo sem vendedor). */
export const NO_TEAM = 0;

export interface Filters {
  /** Mes do ano escolhido (1 a 12); null = ano inteiro. */
  month: number | null;
  /** Dia (YYYY-MM-DD) dentro do mes escolhido. */
  day: string | null;
  team: number | null;
  seller: number | null;
  category: number | null;
  product: number | null;
  payment: PaymentMethod | null;
}

export const NO_FILTERS: Filters = { month: null, day: null, team: null, seller: null, category: null, product: null, payment: null };

export type Dimension = 'time' | 'team' | 'seller' | 'category' | 'product' | 'payment';

export const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const;
export const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro',
  'novembro', 'dezembro'] as const;
export const PAYMENT_LABEL: Readonly<Record<PaymentMethod, string>> = { PIX: 'Pix', CARD: 'Cartão', BOLETO: 'Boleto' };

// ---------------- datas (YYYY-MM-DD, sem fuso: o dia ja e o da loja) ----------------

export function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function daysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
}

/** Dias corridos desde 1/1 ate a data, contando o proprio dia (1/1 = 1). */
function dayOfYear(date: string): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86_400_000) + 1;
}

function shiftDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export interface Range { from: string; to: string }

const inRange = (date: string, range: Range) => date >= range.from && date <= range.to;

export function monthRange(year: number, month: number, untilDay?: number): Range {
  const last = daysInMonth(year, month);
  return { from: iso(year, month, 1), to: iso(year, month, Math.min(untilDay ?? last, last)) };
}

// ---------------- dimensoes ----------------

export class Model {
  readonly overview: Overview;
  readonly people: ReadonlyMap<number, Person>;
  readonly products: ReadonlyMap<number, Product>;
  readonly categories: ReadonlyMap<number, string>;

  constructor(overview: Overview) {
    this.overview = overview;
    this.people = new Map(overview.people.map(p => [p.id, p]));
    this.products = new Map(overview.products.map(p => [p.id, p]));
    this.categories = new Map(overview.categories.map(c => [c.id, c.name]));
  }

  get year(): number { return this.overview.year; }
  get today(): string { return this.overview.today; }

  /** Equipe da venda: o GERENTE do vendedor, o proprio GERENTE quando ele vende, ou "sem equipe". */
  teamOf(sellerId: number | null): number {
    if (sellerId === null) return NO_TEAM;
    const person = this.people.get(sellerId);
    if (!person) return NO_TEAM;
    if (person.role === 'GERENTE') return person.id;
    if (person.role === 'VENDEDOR') return person.managerId ?? NO_TEAM;
    return NO_TEAM;
  }

  categoryOf(productId: number): number | null {
    return this.products.get(productId)?.categoryId ?? null;
  }

  personName(id: number | null): string {
    if (id === null) return 'Sem vendedor';
    return this.people.get(id)?.name ?? `Usuário ${id}`;
  }

  teamName(team: number): string {
    return team === NO_TEAM ? 'Sem equipe' : `Equipe ${this.personName(team)}`;
  }

  categoryName(id: number | null): string {
    return id === null ? 'Sem categoria' : this.categories.get(id) ?? `Categoria ${id}`;
  }

  productName(id: number): string {
    return this.products.get(id)?.name ?? `Produto ${id}`;
  }

  /** Gerentes com equipe ou venda propria, para o seletor de equipe. */
  teams(): { id: number; name: string }[] {
    const ids = new Set<number>();
    for (const person of this.overview.people) {
      if (person.role === 'GERENTE' && person.active) ids.add(person.id);
      if (person.role === 'VENDEDOR' && person.managerId !== null) ids.add(person.managerId);
    }
    const list = [...ids].map(id => ({ id, name: this.teamName(id) })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return [...list, { id: NO_TEAM, name: this.teamName(NO_TEAM) }];
  }

  /** Quem vende (VENDEDOR e GERENTE) e quem aparece nos fatos. */
  sellers(): Person[] {
    const sold = new Set(this.overview.sales.map(s => s.sellerId));
    return this.overview.people.filter(p => p.role !== 'CEO' || sold.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  // ---------------- filtros ----------------

  /** Periodo do recorte: dia, mes (ate hoje no mes corrente) ou ano (ate hoje no ano corrente). */
  scope(filters: Filters): Range {
    if (filters.day) return { from: filters.day, to: filters.day };
    if (filters.month) return monthRange(this.year, filters.month);
    return { from: iso(this.year, 1, 1), to: iso(this.year, 12, 31) };
  }

  /** -1 representa "sem vendedor" e "sem categoria" nos filtros e rankings. */
  private orgMatches(sellerId: number | null, filters: Filters, except?: Dimension): boolean {
    if (except !== 'seller' && filters.seller !== null && (sellerId ?? -1) !== filters.seller) return false;
    if (except !== 'team' && filters.team !== null && this.teamOf(sellerId) !== filters.team) return false;
    return true;
  }

  /** O recorte usa produto ou categoria (o estorno nao tem produto: fica fora). */
  productScoped(filters: Filters, except?: Dimension): boolean {
    return (except !== 'product' && filters.product !== null) || (except !== 'category' && filters.category !== null);
  }

  /** Itens do recorte; except deixa uma dimensao de fora (o visual de origem mostra todos e destaca a escolha). */
  sales(filters: Filters, range: Range | null, except?: Dimension): SaleFact[] {
    return this.overview.sales.filter(s => (range === null || inRange(s.date, range))
      && this.orgMatches(s.sellerId, filters, except)
      && (except === 'payment' || filters.payment === null || s.paymentMethod === filters.payment)
      && (except === 'product' || filters.product === null || s.productId === filters.product)
      && (except === 'category' || filters.category === null || (this.categoryOf(s.productId) ?? -1) === filters.category));
  }

  refunds(filters: Filters, range: Range | null, except?: Dimension): RefundFact[] {
    if (this.productScoped(filters, except)) return [];
    return this.overview.refunds.filter(r => (range === null || inRange(r.date, range))
      && this.orgMatches(r.sellerId, filters, except)
      && (except === 'payment' || filters.payment === null || r.paymentMethod === filters.payment));
  }

  // ---------------- medidas ----------------

  measures(filters: Filters, range: Range, except?: Dimension): Measures {
    return measuresOf(this.sales(filters, range, except), this.refunds(filters, range, except));
  }

  /** Recorte e periodo de comparacao: ano contra o mesmo trecho do ano anterior, mes contra o mesmo trecho do mes anterior. */
  comparison(filters: Filters): { current: Range; previous: Range; label: string } {
    const today = this.today;
    if (filters.day) {
      const previous = shiftDays(filters.day, -7);
      return { current: { from: filters.day, to: filters.day }, previous: { from: previous, to: previous },
        label: 'mesmo dia da semana anterior' };
    }
    if (filters.month) {
      const current = monthRange(this.year, filters.month);
      const lastDay = current.to > today && current.from <= today ? Number(today.slice(8, 10)) : daysInMonth(this.year, filters.month);
      const [py, pm] = filters.month === 1 ? [this.year - 1, 12] : [this.year, filters.month - 1];
      return { current: monthRange(this.year, filters.month, lastDay), previous: monthRange(py, pm, lastDay),
        label: lastDay < daysInMonth(this.year, filters.month) ? `${MONTH_NAMES[pm - 1]} até o dia ${lastDay}` : MONTH_NAMES[pm - 1]! };
    }
    const end = today.startsWith(`${this.year}-`) ? today : iso(this.year, 12, 31);
    const previousEnd = `${this.year - 1}${end.slice(4)}`.replace(`${this.year - 1}-02-29`, `${this.year - 1}-02-28`);
    return { current: { from: iso(this.year, 1, 1), to: end }, previous: { from: iso(this.year - 1, 1, 1), to: previousEnd },
      label: end.endsWith('-12-31') ? String(this.year - 1) : `${this.year - 1} até ${end.slice(8, 10)}/${end.slice(5, 7)}` };
  }

  // ---------------- series e rankings ----------------

  /** Serie do grafico de vendas: meses do ano ou dias do mes, sem o filtro de tempo (o grafico e o seletor de tempo). */
  timeSeries(filters: Filters): TimePoint[] {
    const sales = this.sales(filters, null, 'time');
    const refunds = this.refunds(filters, null, 'time');
    if (filters.month === null) {
      return MONTHS.map((label, index) => {
        const month = index + 1;
        const current = monthRange(this.year, month);
        const previous = monthRange(this.year - 1, month);
        return { key: month, label, ...measuresOf(sales.filter(s => inRange(s.date, current)), refunds.filter(r => inRange(r.date, current))),
          previousNet: measuresOf(sales.filter(s => inRange(s.date, previous)), refunds.filter(r => inRange(r.date, previous))).net,
          goal: this.goalFor(filters, month) };
      });
    }
    const month = filters.month;
    return Array.from({ length: daysInMonth(this.year, month) }, (_, index) => {
      const date = iso(this.year, month, index + 1);
      return { key: index + 1, label: String(index + 1), date, ...measuresOf(sales.filter(s => s.date === date), refunds.filter(r => r.date === date)),
        previousNet: null, goal: null };
    });
  }

  /** Ranking de uma dimensao no recorte (sem o filtro da propria dimensao), do maior para o menor valor. */
  ranking(dimension: Exclude<Dimension, 'time'>, filters: Filters): RankRow[] {
    const range = this.scope({ ...filters });
    const sales = this.sales(filters, range, dimension);
    const refunds = dimension === 'product' || dimension === 'category' ? [] : this.refunds(filters, range, dimension);
    const keyOf = (fact: { sellerId: number | null; paymentMethod: PaymentMethod; productId?: number }): string | number | null => {
      switch (dimension) {
        case 'seller': return fact.sellerId ?? -1;
        case 'team': return this.teamOf(fact.sellerId);
        case 'payment': return fact.paymentMethod;
        case 'product': return fact.productId ?? null;
        case 'category': return fact.productId === undefined ? null : this.categoryOf(fact.productId) ?? -1;
      }
    };
    const groups = new Map<string | number, { sales: SaleFact[]; refunds: RefundFact[] }>();
    for (const sale of sales) {
      const key = keyOf(sale);
      if (key === null) continue;
      (groups.get(key) ?? groups.set(key, { sales: [], refunds: [] }).get(key)!).sales.push(sale);
    }
    for (const refund of refunds) {
      const key = keyOf(refund);
      if (key === null) continue;
      (groups.get(key) ?? groups.set(key, { sales: [], refunds: [] }).get(key)!).refunds.push(refund);
    }
    const label = (key: string | number): string => {
      switch (dimension) {
        case 'seller': return this.personName(key === -1 ? null : Number(key));
        case 'team': return this.teamName(Number(key));
        case 'payment': return PAYMENT_LABEL[key as PaymentMethod] ?? String(key);
        case 'product': return this.productName(Number(key));
        case 'category': return this.categoryName(key === -1 ? null : Number(key));
      }
    };
    return [...groups.entries()].map(([key, group]) => ({ key, label: label(key), ...measuresOf(group.sales, group.refunds) }))
      .sort((a, b) => b.net - a.net || a.label.localeCompare(b.label, 'pt-BR'));
  }

  // ---------------- metas ----------------

  monthGoal(month: number): Overview['monthlyGoals'][number] | undefined {
    const period = `${this.year}-${String(month).padStart(2, '0')}`;
    return this.overview.monthlyGoals.find(g => g.period === period);
  }

  /** Meta de um vendedor no mes (0 quando a loja nao distribuiu). */
  sellerGoal(month: number, sellerId: number): number {
    return this.monthGoal(month)?.sellers.find(s => s.sellerId === sellerId)?.goal.amount ?? 0;
  }

  /** Meta da equipe = soma das metas dos vendedores da equipe (D-EVO-44). */
  teamGoal(month: number, team: number): number {
    const goal = this.monthGoal(month);
    if (!goal) return 0;
    return goal.sellers.filter(s => this.teamOf(s.sellerId) === team).reduce((sum, s) => sum + s.goal.amount, 0);
  }

  /** Meta do recorte organizacional (loja, equipe ou vendedor) num mes; null quando o mes nao tem meta. */
  goalFor(filters: Filters, month: number): number | null {
    const goal = this.monthGoal(month);
    if (!goal) return null;
    if (filters.seller !== null) return this.sellerGoal(month, filters.seller);
    if (filters.team !== null) return this.teamGoal(month, filters.team);
    return goal.storeGoal.amount;
  }

  /** Realizado para meta: venda total do recorte organizacional (ignora produto, categoria e pagamento). */
  goalRealized(filters: Filters, range: Range): number {
    const org: Filters = { ...NO_FILTERS, team: filters.team, seller: filters.seller };
    return this.measures(org, range).net;
  }

  /** Mes de referencia: o escolhido; senao o mes corrente no ano corrente; senao dezembro. */
  referenceMonth(filters: Filters): number {
    if (filters.month) return filters.month;
    return this.today.startsWith(`${this.year}-`) ? Number(this.today.slice(5, 7)) : 12;
  }

  monthGoalStatus(filters: Filters): GoalStatus {
    const month = this.referenceMonth(filters);
    const range = monthRange(this.year, month);
    const goal = this.goalFor(filters, month);
    const realized = this.goalRealized(filters, range);
    const total = daysInMonth(this.year, month);
    const elapsed = elapsedDays(this.today, range, total);
    return goalStatus(goal, realized, elapsed, total, `${MONTH_NAMES[month - 1]} de ${this.year}`);
  }

  annualGoalStatus(): GoalStatus {
    const range = { from: iso(this.year, 1, 1), to: iso(this.year, 12, 31) };
    const realized = this.measures(NO_FILTERS, range).net;
    const total = daysInYear(this.year);
    const elapsed = this.today < range.from ? 0 : this.today > range.to ? total : dayOfYear(this.today);
    return goalStatus(this.overview.annualGoal?.amount.amount ?? null, realized, elapsed, total, String(this.year));
  }

  /** Soma das metas mensais do ano (cobertura do plano frente a meta anual). */
  plannedMonths(): { months: number; amount: number } {
    const goals = this.overview.monthlyGoals.filter(g => g.period.startsWith(`${this.year}-`));
    return { months: goals.length, amount: goals.reduce((sum, g) => sum + g.storeGoal.amount, 0) };
  }

  /**
   * Metas por vendedor ou por equipe no mes escolhido (ou no ano, somando os meses ja iniciados). Como nos rankings, o
   * quadro mostra todos e a tela destaca a escolha: so o filtro de equipe restringe o quadro de vendedores. Produto,
   * categoria e pagamento nao entram (meta e da venda total).
   */
  goalBoard(kind: 'seller' | 'team', filters: Filters): GoalRow[] {
    // No acumulado, meta e realizado so dos meses com meta: mes sem meta nao infla o atingimento.
    const started = this.monthsUntilNow();
    const withGoal = started.filter(m => this.monthGoal(m) !== undefined);
    const months = filters.month ? [filters.month] : withGoal.length > 0 ? withGoal : started;
    const ranges = months.map(m => monthRange(this.year, m));
    const org: Filters = kind === 'seller' ? { ...NO_FILTERS, team: filters.team } : NO_FILTERS;
    const keys = new Set<number>();
    for (const m of months) for (const s of this.monthGoal(m)?.sellers ?? []) keys.add(kind === 'seller' ? s.sellerId : this.teamOf(s.sellerId));
    const sales = ranges.flatMap(range => this.sales(org, range));
    const refunds = ranges.flatMap(range => this.refunds(org, range));
    for (const sale of sales) keys.add(kind === 'seller' ? sale.sellerId ?? -1 : this.teamOf(sale.sellerId));
    const rows: GoalRow[] = [];
    for (const key of keys) {
      if (kind === 'seller' && filters.team !== null && this.teamOf(key === -1 ? null : key) !== filters.team) continue;
      const mine = (sellerId: number | null) => kind === 'seller' ? (sellerId ?? -1) === key : this.teamOf(sellerId) === key;
      const goal = months.reduce((sum, m) => sum + (kind === 'seller' ? this.sellerGoal(m, key) : this.teamGoal(m, key)), 0);
      const realized = measuresOf(sales.filter(s => mine(s.sellerId)), refunds.filter(r => mine(r.sellerId))).net;
      const lastMonth = months[months.length - 1] ?? 12;
      const remainingDays = Math.max(0, daysInMonth(this.year, lastMonth) - elapsedDays(this.today, monthRange(this.year, lastMonth), daysInMonth(this.year, lastMonth)));
      rows.push({
        key, label: kind === 'seller' ? this.personName(key === -1 ? null : key) : this.teamName(key),
        team: kind === 'seller' ? this.teamName(this.teamOf(key === -1 ? null : key)) : null,
        goal, realized, achievement: goal > 0 ? (realized * 100) / goal : null, remaining: Math.max(goal - realized, 0),
        perDay: goal > realized && remainingDays > 0 && filters.month !== null ? (goal - realized) / remainingDays : null,
        state: goal === 0 ? 'SEM_META' : realized >= goal ? 'META_ATINGIDA' : 'EM_ANDAMENTO',
      });
    }
    return rows.sort((a, b) => b.realized - a.realized || a.label.localeCompare(b.label, 'pt-BR'));
  }

  /** Meses do ano ja iniciados (todos, em ano passado; nenhum, em ano futuro). */
  monthsUntilNow(): number[] {
    const last = this.today.startsWith(`${this.year}-`) ? Number(this.today.slice(5, 7)) : this.today < `${this.year}` ? 0 : 12;
    return Array.from({ length: last }, (_, i) => i + 1);
  }

  // ---------------- produtos: lucro e preco de compra ----------------

  productTable(filters: Filters): ProductRow[] {
    const ranking = this.ranking('product', filters);
    return ranking.map(row => {
      const product = this.products.get(Number(row.key));
      const price = product?.price.amount ?? null;
      const cost = product?.averageCost?.amount ?? null;
      return {
        ...row, productId: Number(row.key), sku: product?.sku ?? null, category: this.categoryName(this.categoryOf(Number(row.key))),
        price, averageCost: cost,
        unitMargin: price !== null && cost !== null ? price - cost : null,
        unitMarginPercent: price !== null && cost !== null && price > 0 ? ((price - cost) * 100) / price : null,
        markupPercent: price !== null && cost !== null && cost > 0 ? ((price - cost) * 100) / cost : null,
      };
    });
  }

  /** Curva ABC por faturamento: A ate 80% acumulado, B ate 95%, C o resto (Pareto). */
  abc(filters: Filters): AbcResult {
    const rows = this.ranking('product', filters).filter(r => r.net > 0);
    const total = rows.reduce((sum, r) => sum + r.net, 0);
    let running = 0;
    const items = rows.map(row => {
      const before = running;
      running += row.net;
      const klass: 'A' | 'B' | 'C' = total === 0 || before / total < 0.8 ? 'A' : before / total < 0.95 ? 'B' : 'C';
      return { key: Number(row.key), label: row.label, net: row.net, share: total ? row.net / total : 0, cumulative: total ? running / total : 0, klass };
    });
    const classes = (['A', 'B', 'C'] as const).map(klass => {
      const group = items.filter(i => i.klass === klass);
      return { klass, products: group.length, net: group.reduce((sum, i) => sum + i.net, 0), share: total ? group.reduce((sum, i) => sum + i.net, 0) / total : 0 };
    });
    return { total, items, classes };
  }

  // ---------------- destaques automaticos ----------------

  insights(filters: Filters): Insight[] {
    const list: Insight[] = [];
    const { current, previous, label } = this.comparison(filters);
    const now = this.measures(filters, current);
    const before = this.measures(filters, previous);
    const change = variation(now.net, before.net);
    if (change !== null && before.net > 0) {
      const amount = change >= 900 ? `${(change / 100 + 1).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} vezes` : pct(Math.abs(change));
      list.push({ tone: change >= 0 ? 'good' : 'bad', text: change >= 900
        ? `Faturamento ${amount} o de ${label} (${brl(now.net)} contra ${brl(before.net)}).`
        : `Faturamento ${change >= 0 ? 'acima' : 'abaixo'} de ${label}: ${amount} (${brl(now.net)} contra ${brl(before.net)}).` });
    }
    const month = this.monthGoalStatus(filters);
    if (month.goal !== null && month.goal > 0) {
      if (month.realized >= month.goal) list.push({ tone: 'good', text: `Meta de ${month.label} batida: ${brl(month.realized)} de ${brl(month.goal)}.` });
      else if (month.daysLeft > 0) list.push({ tone: month.projection !== null && month.projection >= month.goal ? 'good' : 'warn',
        text: `Faltam ${brl(month.goal - month.realized)} para a meta de ${month.label}: ${brl((month.goal - month.realized) / month.daysLeft)} por dia nos ${month.daysLeft} dias restantes.` });
      else list.push({ tone: 'bad', text: `${capitalize(month.label)} fechou em ${pct(month.achievement ?? 0)} da meta.` });
    }
    const annual = this.annualGoalStatus();
    if (annual.goal !== null && annual.goal > 0 && annual.projection !== null && annual.daysLeft > 0) {
      list.push({ tone: annual.projection >= annual.goal ? 'good' : 'warn',
        text: `No ritmo atual, ${annual.label} fecha em ${brl(annual.projection)}: ${pct((annual.projection * 100) / annual.goal)} da meta anual.` });
    }
    const sellers = this.ranking('seller', filters).filter(r => r.net > 0);
    const total = sellers.reduce((sum, r) => sum + r.net, 0);
    if (sellers[0] && total > 0 && filters.seller === null) {
      list.push({ tone: 'neutral', text: `${sellers[0].label} lidera as vendas do período com ${brl(sellers[0].net)} (${pct((sellers[0].net * 100) / total)} do total).` });
    }
    const categories = this.ranking('category', filters).filter(r => r.net > 0);
    const categoryTotal = categories.reduce((sum, r) => sum + r.net, 0);
    if (categories[0] && categoryTotal > 0 && filters.category === null && filters.product === null && categories.length > 1) {
      list.push({ tone: 'neutral', text: `${categories[0].label} responde por ${pct((categories[0].net * 100) / categoryTotal)} da receita de produtos.` });
    }
    const lowMargin = this.productTable(filters).filter(p => p.margin !== null && p.margin < 10 && p.net > 0);
    if (lowMargin.length > 0) {
      list.push({ tone: 'bad', text: `${lowMargin.length} ${lowMargin.length === 1 ? 'produto vendido' : 'produtos vendidos'} com margem abaixo de 10%: ${lowMargin.slice(0, 3).map(p => p.label).join(', ')}.` });
    } else if (now.itemsWithoutCost > 0) {
      list.push({ tone: 'warn', text: 'Há itens vendidos sem custo informado: o lucro do período aparece como "Não informado".' });
    }
    return list.slice(0, 6);
  }
}

// ---------------- tipos e funcoes de apoio ----------------

export interface Measures {
  /** Vendas dos itens pagos (sem estornos). */
  sales: number;
  refunds: number;
  /** Faturamento liquido = vendas - estornos. */
  net: number;
  /** Custo dos itens com custo informado (preco de compra x quantidade). */
  cost: number;
  itemsWithoutCost: number;
  /** Lucro = liquido - custo; nulo quando algum item nao tem custo. */
  profit: number | null;
  /** Margem sobre o liquido, em %. */
  margin: number | null;
  orders: number;
  units: number;
  customers: number;
  discount: number;
  averageTicket: number | null;
}

export function measuresOf(sales: readonly SaleFact[], refunds: readonly RefundFact[]): Measures {
  let total = 0;
  let cost = 0;
  let units = 0;
  let discount = 0;
  let missing = 0;
  const orders = new Set<number>();
  const customers = new Set<number>();
  for (const sale of sales) {
    total += sale.netRevenue.amount;
    units += sale.units;
    discount += sale.discount.amount;
    if (sale.cost === null) missing += 1; else cost += sale.cost.amount;
    orders.add(sale.orderId);
    if (sale.customerId !== null) customers.add(sale.customerId);
  }
  const refunded = refunds.reduce((sum, r) => sum + r.amount.amount, 0);
  const net = round(total - refunded);
  const profit = missing === 0 ? round(net - cost) : null;
  return {
    sales: round(total), refunds: round(refunded), net, cost: round(cost), itemsWithoutCost: missing, profit,
    margin: profit !== null && net > 0 ? (profit * 100) / net : null,
    orders: orders.size, units, customers: customers.size, discount: round(discount),
    averageTicket: orders.size > 0 ? round(total / orders.size) : null,
  };
}

export interface TimePoint extends Measures {
  key: number;
  label: string;
  date?: string;
  previousNet: number | null;
  goal: number | null;
}

export interface RankRow extends Measures { key: string | number; label: string }

export interface ProductRow extends RankRow {
  productId: number;
  sku: string | null;
  category: string;
  price: number | null;
  averageCost: number | null;
  unitMargin: number | null;
  unitMarginPercent: number | null;
  markupPercent: number | null;
}

export interface AbcResult {
  total: number;
  items: { key: number; label: string; net: number; share: number; cumulative: number; klass: 'A' | 'B' | 'C' }[];
  classes: { klass: 'A' | 'B' | 'C'; products: number; net: number; share: number }[];
}

export type GoalState = 'SEM_META' | 'EM_ANDAMENTO' | 'META_ATINGIDA';

export interface GoalRow {
  key: number;
  label: string;
  team: string | null;
  goal: number;
  realized: number;
  achievement: number | null;
  remaining: number;
  perDay: number | null;
  state: GoalState;
}

export interface GoalStatus {
  label: string;
  goal: number | null;
  realized: number;
  achievement: number | null;
  /** Quanto ja deveria ter sido vendido hoje no ritmo linear da meta. */
  expected: number | null;
  /** Projecao linear do fechamento (realizado / dias corridos x dias do periodo). */
  projection: number | null;
  daysElapsed: number;
  daysLeft: number;
}

export interface Insight { tone: 'good' | 'bad' | 'warn' | 'neutral'; text: string }

function elapsedDays(today: string, range: Range, total: number): number {
  if (today < range.from) return 0;
  if (today > range.to) return total;
  return Number(today.slice(8, 10));
}

export function goalStatus(goal: number | null, realized: number, elapsed: number, total: number, label: string): GoalStatus {
  return {
    label, goal, realized,
    achievement: goal !== null && goal > 0 ? (realized * 100) / goal : null,
    expected: goal !== null && total > 0 ? (goal * elapsed) / total : null,
    projection: elapsed > 0 ? (realized / elapsed) * total : null,
    daysElapsed: elapsed, daysLeft: Math.max(total - elapsed, 0),
  };
}

/** Variacao percentual; nula sem base de comparacao. */
export function variation(current: number, previous: number): number | null {
  return previous === 0 ? null : ((current - previous) * 100) / Math.abs(previous);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const PCT = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const brl = (value: number) => BRL.format(value).replace(/ /g, ' ');
const pct = (value: number) => `${PCT.format(value)}%`;
const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1);

// ---------------- exportacao ----------------

/** CSV do recorte (separador ";" e virgula decimal, como o Excel em portugues abre direto). */
export function toCsv(model: Model, filters: Filters): string {
  const decimal = (value: number | null) => value === null ? '' : value.toFixed(2).replace('.', ',');
  const cell = (value: string) => /[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  const header = ['data', 'pedido', 'vendedor', 'equipe', 'categoria', 'produto', 'sku', 'pagamento', 'unidades', 'receita_liquida',
    'desconto', 'custo', 'lucro'];
  const rows = model.sales(filters, model.scope(filters)).map(s => {
    const cost = s.cost?.amount ?? null;
    return [s.date, String(s.orderId), model.personName(s.sellerId), model.teamName(model.teamOf(s.sellerId)),
      model.categoryName(model.categoryOf(s.productId)), model.productName(s.productId), model.products.get(s.productId)?.sku ?? '',
      PAYMENT_LABEL[s.paymentMethod], String(s.units), decimal(s.netRevenue.amount), decimal(s.discount.amount), decimal(cost),
      decimal(cost === null ? null : s.netRevenue.amount - cost)].map(cell).join(';');
  });
  return [header.join(';'), ...rows].join('\r\n') + '\r\n';
}

/** Descricao dos filtros ativos, para os chips e o anuncio ao leitor de tela. */
export function filterChips(model: Model, filters: Filters): { key: keyof Filters; label: string }[] {
  const chips: { key: keyof Filters; label: string }[] = [];
  if (filters.month) chips.push({ key: 'month', label: `Mês: ${MONTH_NAMES[filters.month - 1]}` });
  if (filters.day) chips.push({ key: 'day', label: `Dia: ${filters.day.slice(8, 10)}/${filters.day.slice(5, 7)}` });
  if (filters.team !== null) chips.push({ key: 'team', label: model.teamName(filters.team) });
  if (filters.seller !== null) chips.push({ key: 'seller', label: `Vendedor: ${model.personName(filters.seller === -1 ? null : filters.seller)}` });
  if (filters.category !== null) chips.push({ key: 'category', label: `Categoria: ${model.categoryName(filters.category === -1 ? null : filters.category)}` });
  if (filters.product !== null) chips.push({ key: 'product', label: `Produto: ${model.productName(filters.product)}` });
  if (filters.payment) chips.push({ key: 'payment', label: `Pagamento: ${PAYMENT_LABEL[filters.payment]}` });
  return chips;
}

/** Remove um filtro; tirar o mes tambem tira o dia (o dia so existe dentro do mes). */
export function without(filters: Filters, key: keyof Filters): Filters {
  return key === 'month' ? { ...filters, month: null, day: null } : { ...filters, [key]: null };
}
