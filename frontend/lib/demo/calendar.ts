// Calendario operacional da loja da demonstracao: a loja abre de segunda a sabado e fecha no domingo. Toda meta
// derivada (diaria, semanal, por vendedor) e todo ritmo vem dos dias em que a loja realmente abre, nunca de uma
// divisao por quatro semanas ou por trinta dias (secao 3.1 do plano de evolucao).
import { daysInMonth, iso } from '../executive.ts';

/** Dia da semana fechado (0 = domingo no horario da loja). */
export const CLOSED_WEEKDAY = 0;

/** Dia da semana de uma data YYYY-MM-DD, sem fuso (a data ja e o dia da loja). */
export function weekdayOf(date: string): number {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** A loja abre neste dia? */
export function isOperating(date: string): boolean {
  return weekdayOf(date) !== CLOSED_WEEKDAY;
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Quantidade de dias de calendario entre duas datas, contando as duas pontas. */
export function dayCount(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

/** Todos os dias de calendario do intervalo (ordem crescente). */
export function daysBetween(from: string, to: string): string[] {
  if (to < from) return [];
  return Array.from({ length: dayCount(from, to) }, (_, index) => addDays(from, index));
}

/** Dias em que a loja abre no intervalo. */
export function operatingDaysBetween(from: string, to: string): string[] {
  return daysBetween(from, to).filter(isOperating);
}

/** Dias em que a loja abre no mes (YYYY-MM). */
export function operatingDaysIn(period: string): string[] {
  const [year, month] = period.split('-').map(Number) as [number, number];
  return operatingDaysBetween(iso(year, month, 1), iso(year, month, daysInMonth(year, month)));
}

/** Dias de abertura do mes ja decorridos, incluindo hoje quando a loja abre. */
export function operatingDaysElapsed(period: string, today: string): number {
  return operatingDaysIn(period).filter(day => day <= today).length;
}

export function periodOf(date: string): string {
  return date.slice(0, 7);
}

/** Primeiro e ultimo dia do mes. */
export function periodRange(period: string): { from: string; to: string } {
  const [year, month] = period.split('-').map(Number) as [number, number];
  return { from: iso(year, month, 1), to: iso(year, month, daysInMonth(year, month)) };
}

/** Mes anterior a um periodo YYYY-MM. */
export function previousPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number) as [number, number];
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
}

/** Os `count` meses que terminam no mes de `today`, em ordem crescente. */
export function periodsUntil(today: string, count: number): string[] {
  const periods: string[] = [periodOf(today)];
  while (periods.length < count) periods.unshift(previousPeriod(periods[0]!));
  return periods;
}

/** Ultimo mes fechado: o anterior ao mes de hoje (cenario de referencia da secao 4.2). */
export function lastCompletePeriod(today: string): string {
  return previousPeriod(periodOf(today));
}

/** Semana comercial (segunda a sabado) que contem a data, limitada ao mes. */
export function commercialWeek(date: string, period = periodOf(date)): { from: string; to: string } {
  const weekday = weekdayOf(date);
  // Domingo fecha a semana anterior; nos outros dias a semana comeca na segunda.
  const backToMonday = weekday === CLOSED_WEEKDAY ? 6 : weekday - 1;
  const { from: first, to: last } = periodRange(period);
  const monday = addDays(date, -backToMonday);
  return { from: monday < first ? first : monday, to: (() => { const end = addDays(monday, 5); return end > last ? last : end; })() };
}
