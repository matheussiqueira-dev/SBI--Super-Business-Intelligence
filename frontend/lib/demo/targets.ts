// Motor de metas e indicadores da demonstracao (secao 5 do plano de evolucao). As contas de atingimento, desvio,
// ritmo e projecao reaproveitam goalStatus de lib/executive.ts, a mesma funcao do painel executivo em producao, para
// vendedor, gerente e CEO lerem sempre o mesmo numero. O que entra aqui e o calendario operacional: metas derivadas
// (diaria, semanal, por vendedor) e o quanto falta por dia saem dos dias em que a loja abre.
import { daysInMonth, goalStatus, type GoalStatus } from '../executive.ts';
import { commercialWeek, operatingDaysBetween, operatingDaysElapsed, operatingDaysIn, periodRange } from './calendar.ts';
import { MONTHLY_PLAN } from './scenario.ts';

export const GOAL_STATES = ['META_ATINGIDA', 'PROXIMA_DA_META', 'ABAIXO_DA_META', 'DADOS_INSUFICIENTES', 'SEM_META'] as const;
export type DemoGoalState = (typeof GOAL_STATES)[number];

/** Rotulo, selo e icone de cada estado: a cor nunca e a unica pista (manual v2.0 e WCAG 1.4.1). */
export const GOAL_STATE_LABEL: Readonly<Record<DemoGoalState, string>> = {
  META_ATINGIDA: 'Meta atingida',
  PROXIMA_DA_META: 'Perto da meta',
  ABAIXO_DA_META: 'Abaixo da meta',
  DADOS_INSUFICIENTES: 'Dados insuficientes',
  SEM_META: 'Sem meta cadastrada',
};

/**
 * Rotulo do estado conforme o periodo. Com o mes em curso a comparacao e com o ritmo esperado ate hoje ("no ritmo",
 * "abaixo do ritmo"); com o mes fechado e com a meta cheia ("perto da meta", "abaixo da meta").
 */
export function goalStateLabel(state: DemoGoalState, running = false): string {
  if (state === 'PROXIMA_DA_META') return running ? 'No ritmo da meta' : 'Perto da meta';
  if (state === 'ABAIXO_DA_META') return running ? 'Abaixo do ritmo' : 'Abaixo da meta';
  return GOAL_STATE_LABEL[state];
}
export const GOAL_STATE_PILL: Readonly<Record<DemoGoalState, string>> = {
  META_ATINGIDA: 'pill pill-ok',
  PROXIMA_DA_META: 'pill pill-info',
  ABAIXO_DA_META: 'pill pill-warn',
  DADOS_INSUFICIENTES: 'pill',
  SEM_META: 'pill',
};
export const GOAL_STATE_ICON: Readonly<Record<DemoGoalState, 'sucesso' | 'info' | 'alerta' | 'calendario' | 'meta'>> = {
  META_ATINGIDA: 'sucesso',
  PROXIMA_DA_META: 'info',
  ABAIXO_DA_META: 'alerta',
  DADOS_INSUFICIENTES: 'calendario',
  SEM_META: 'meta',
};

/** Critério dos estados, configurável: fracao do ritmo esperado a partir da qual o periodo ainda esta "perto da meta". */
export interface GoalCriteria { nearRatio: number }
export const DEFAULT_GOAL_CRITERIA: GoalCriteria = { nearRatio: 0.9 };

export interface GoalAssessment extends GoalStatus {
  state: DemoGoalState;
  /** Realizado - meta (negativo = falta). */
  deviation: number | null;
  /** Falta para a meta (0 quando batida). */
  remaining: number | null;
  /** Ritmo cumprido: realizado / esperado hoje, em %. */
  pacePercent: number | null;
  /** Quanto falta por dia de funcionamento restante. */
  perOperatingDay: number | null;
  operatingDaysElapsed: number;
  operatingDaysTotal: number;
  operatingDaysLeft: number;
}

/**
 * Avaliacao da meta de um periodo. `goal` nulo ou zero e "sem meta"; periodo que ainda nao abriu e "dados
 * insuficientes". Atingimento, esperado e projecao vem de goalStatus (lib/executive.ts); o que falta por dia usa os
 * dias de funcionamento que ainda restam.
 */
export function assessGoal({ goal, realized, period, today, label, criteria = DEFAULT_GOAL_CRITERIA }: {
  goal: number | null; realized: number; period: string; today: string; label: string; criteria?: GoalCriteria;
}): GoalAssessment {
  const [year, month] = period.split('-').map(Number) as [number, number];
  const total = daysInMonth(year, month);
  const { from, to } = periodRange(period);
  const elapsed = today < from ? 0 : today > to ? total : Number(today.slice(8, 10));
  const base = goalStatus(goal, realized, elapsed, total, label);
  const operatingTotal = operatingDaysIn(period).length;
  const operatingElapsed = today < from ? 0 : today > to ? operatingTotal : operatingDaysElapsed(period, today);
  const operatingLeft = Math.max(operatingTotal - operatingElapsed, 0);
  const extra = { operatingDaysElapsed: operatingElapsed, operatingDaysTotal: operatingTotal, operatingDaysLeft: operatingLeft };

  if (goal === null || goal <= 0) {
    return { ...base, ...extra, state: 'SEM_META', deviation: null, remaining: null, pacePercent: null, perOperatingDay: null };
  }
  const remaining = Math.max(goal - realized, 0);
  const pacePercent = base.expected !== null && base.expected > 0 ? (realized * 100) / base.expected : null;
  const perOperatingDay = remaining > 0 && operatingLeft > 0 ? remaining / operatingLeft : null;
  const state: DemoGoalState = realized >= goal ? 'META_ATINGIDA'
    : operatingElapsed === 0 ? 'DADOS_INSUFICIENTES'
      : pacePercent !== null && pacePercent >= criteria.nearRatio * 100 ? 'PROXIMA_DA_META'
        : 'ABAIXO_DA_META';
  return { ...base, ...extra, state, deviation: realized - goal, remaining, pacePercent, perOperatingDay };
}

// ---------------------------------------------------------------- metas derivadas

export interface DerivedTargets {
  period: string;
  /** Meta mensal da loja. */
  monthly: number;
  /** Dias de funcionamento previstos no plano (base da meta diaria do plano). */
  plannedOperatingDays: number;
  /** Dias em que a loja abre no mes, pelo calendario. */
  operatingDays: number;
  /** Meta por dia de funcionamento. */
  daily: number;
  /** Meta da semana comercial de hoje, proporcional aos dias de funcionamento dela. */
  weekly: number;
  weeklyDays: number;
  weekFrom: string;
  weekTo: string;
  /** Meta individual mensal e diaria de cada vendedor. */
  sellers: { sellerId: number; monthly: number; daily: number }[];
  /** Quantidade de vendas necessaria no ticket medio de referencia. */
  requiredOrders: number;
  /** Ticket medio necessario para a meta com a quantidade de vendas do plano. */
  requiredTicket: number;
  /** Itens que a meta exige no indice de itens por venda do plano. */
  requiredItems: number;
}

/**
 * Metas derivadas da meta mensal (secao 3.1): diaria pelos dias de funcionamento, semanal proporcional aos dias da
 * semana comercial, individual por vendedor, e o que a meta exige em quantidade de vendas e ticket medio.
 */
export function deriveTargets({ period, monthly, sellerGoals, today, plan = MONTHLY_PLAN }: {
  period: string; monthly: number; sellerGoals: readonly { sellerId: number; goal: number }[]; today: string;
  plan?: { operatingDays: number; salesCount: number; averageTicket: number; itemsPerSale: number };
}): DerivedTargets {
  const operatingDays = operatingDaysIn(period).length;
  const { from, to } = periodRange(period);
  const reference = today >= from && today <= to ? today : from;
  const week = commercialWeek(reference, period);
  const weeklyDays = operatingDaysBetween(week.from, week.to).length;
  const daily = operatingDays > 0 ? monthly / operatingDays : 0;
  return {
    period, monthly, plannedOperatingDays: plan.operatingDays, operatingDays, daily,
    weekly: daily * weeklyDays, weeklyDays, weekFrom: week.from, weekTo: week.to,
    sellers: sellerGoals.map(seller => ({
      sellerId: seller.sellerId, monthly: seller.goal, daily: operatingDays > 0 ? seller.goal / operatingDays : 0,
    })),
    requiredOrders: plan.averageTicket > 0 ? Math.ceil(monthly / plan.averageTicket) : 0,
    requiredTicket: plan.salesCount > 0 ? monthly / plan.salesCount : 0,
    requiredItems: Math.round((plan.salesCount > 0 ? monthly / plan.averageTicket : 0) * plan.itemsPerSale),
  };
}

// ---------------------------------------------------------------- conversao e projecao

/**
 * Conversao comercial = compradores / atendimentos elegiveis, em %. Sem visitantes registrados no recorte a conversao
 * nao existe (null): zero inventado passaria por "ninguem comprou".
 */
export function conversionPercent(orders: number, visits: number): number | null {
  if (visits <= 0) return null;
  return (orders * 100) / visits;
}

/** Projecao linear do fechamento pelos dias de funcionamento; e estimativa, nunca realizado. */
export function operatingProjection(realized: number, elapsed: number, total: number): number | null {
  if (elapsed <= 0 || total <= 0) return null;
  return (realized / elapsed) * total;
}

/** Itens por venda do recorte; sem venda nao existe media. */
export function itemsPerSale(units: number, orders: number): number | null {
  return orders > 0 ? units / orders : null;
}
