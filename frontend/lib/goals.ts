// Contas dos medidores e da meta do periodo (manual v2.0, figuras 32 e 34) e do planejamento de metas do CEO (RF-29).
// Ficam em .ts para os testes unitarios.

/** Fracao preenchida da trilha (0 a 1); meta zero ou negativa nao tem atingimento. */
export function meterRatio(realized: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(Math.max(realized / goal, 0), 1);
}

function daysIn(month: string): number {
  const [year, monthNumber] = month.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

/** Ritmo esperado hoje: dias decorridos do mes da loja (America/Fortaleza) sobre os dias do mes; null fora do mes corrente. */
export function monthPace(period: string, now: Date = new Date()): number | null {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  if (today.slice(0, 7) !== period) return null;
  return Number(today.slice(8, 10)) / daysIn(period);
}

/** Meta do periodo = meta mensal proporcional aos dias do periodo dentro do mes, em centavos arredondados. */
export function periodGoal(monthGoal: number, month: string, start: string, end: string): number {
  const days = Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
  return Math.round((monthGoal * days * 100) / daysIn(month)) / 100;
}

// Planejamento de metas do CEO: contas em centavos para a distribuicao fechar exatamente com a meta da loja, como o
// servidor exige (GoalsService e o gatilho adiado da V5).

const cents = (value: number) => Math.round(value * 100);

/** Soma exata em reais (via centavos). */
export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + cents(value), 0) / 100;
}

/** Divide o total em partes iguais de centavos; a sobra do arredondamento vai para as primeiras partes. */
export function splitEvenly(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const all = cents(total);
  const base = Math.floor(all / parts);
  const rest = all - base * parts;
  return Array.from({ length: parts }, (_, index) => (base + (index < rest ? 1 : 0)) / 100);
}

/** A distribuicao fecha com a meta da loja (ou nao ha distribuicao: meta so da loja). */
export function distributionMatches(store: number, sellers: readonly number[]): boolean {
  return sellers.length === 0 || cents(sum(sellers)) === cents(store);
}

/** Meta anual coberta pelas metas mensais ja definidas, em %. */
export function planCoverage(annual: number | null, planned: number): number | null {
  return annual === null || annual <= 0 ? null : (planned * 100) / annual;
}
