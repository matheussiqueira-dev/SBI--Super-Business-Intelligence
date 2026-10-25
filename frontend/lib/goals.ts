// Contas dos medidores e da meta do periodo (manual v2.0, figuras 32 e 34). Ficam em .ts para os testes unitarios.

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
