// Calendario comercial e contagem de horas uteis (plano comercial, secao 06).
//
// A promessa publica e "em até 24 horas úteis". Hora util e hora dentro da janela de atendimento, em dia de semana
// configurado e fora dos feriados. Uma solicitacao recebida fora da janela comeca a contar na abertura seguinte.
// O exemplo do plano -- segunda a sexta, 9h-18h, horario de Fortaleza -- e o padrao; a equipe formaliza o calendario
// nas variaveis documentadas em docs/05-operacao/edicoes-e-variaveis.md antes de publicar a promessa.

export interface BusinessCalendar {
  /** Fuso IANA da operacao comercial. */
  readonly timeZone: string;
  /** Minuto do dia em que a janela abre e fecha (9h = 540). */
  readonly openMinute: number;
  readonly closeMinute: number;
  /** Dias da semana atendidos, 0 = domingo. */
  readonly weekdays: readonly number[];
  /** Feriados em AAAA-MM-DD, no fuso da operacao. */
  readonly holidays: readonly string[];
}

export const DEFAULT_CALENDAR: BusinessCalendar = {
  timeZone: 'America/Fortaleza',
  openMinute: 9 * 60,
  closeMinute: 18 * 60,
  weekdays: [1, 2, 3, 4, 5],
  holidays: [],
};

/** "9:00" ou "9" -> 540. */
export function parseMinute(value: string | undefined, fallback: number): number {
  const raw = (value ?? '').trim();
  if (!raw) return fallback;
  const match = /^(\d{1,2})(?::(\d{2}))?$/.exec(raw);
  if (!match) return fallback;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? '0');
  if (hour > 24 || minute > 59) return fallback;
  const total = hour * 60 + minute;
  return total >= 0 && total <= 24 * 60 ? total : fallback;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseHolidays(value: string | undefined): string[] {
  return (value ?? '').split(/[,\s]+/).map(item => item.trim()).filter(item => DATE.test(item));
}

export function parseWeekdays(value: string | undefined, fallback: readonly number[]): number[] {
  // O token vazio sai antes do Number: "".split(/[,\s]+/) devolve [""] e Number("") e 0, o que transformaria
  // uma variavel ausente em "so domingo" em vez de cair no padrao.
  const days = (value ?? '').split(/[,\s]+/).map(item => item.trim()).filter(item => item !== '')
    .map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6);
  return days.length > 0 ? [...new Set(days)].sort((a, b) => a - b) : [...fallback];
}

/** Calendario das variaveis de ambiente; o que faltar vem do padrao do plano. */
export function calendarFromEnv(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): BusinessCalendar {
  const timeZone = (env.SBI_COMERCIAL_FUSO ?? '').trim() || DEFAULT_CALENDAR.timeZone;
  const openMinute = parseMinute(env.SBI_COMERCIAL_ABERTURA, DEFAULT_CALENDAR.openMinute);
  const closeMinute = parseMinute(env.SBI_COMERCIAL_FECHAMENTO, DEFAULT_CALENDAR.closeMinute);
  return {
    timeZone: isValidTimeZone(timeZone) ? timeZone : DEFAULT_CALENDAR.timeZone,
    openMinute,
    closeMinute: closeMinute > openMinute ? closeMinute : DEFAULT_CALENDAR.closeMinute,
    weekdays: parseWeekdays(env.SBI_COMERCIAL_DIAS, DEFAULT_CALENDAR.weekdays),
    holidays: parseHolidays(env.SBI_COMERCIAL_FERIADOS),
  };
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone });
    return true;
  } catch {
    return false;
  }
}

interface ZonedParts { year: number; month: number; day: number; minuteOfDay: number; weekday: number }

const WEEKDAYS: Readonly<Record<string, number>> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let cached = formatters.get(timeZone);
  if (!cached) {
    cached = new Intl.DateTimeFormat('en-US', {
      timeZone, hour12: false, weekday: 'short',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
    formatters.set(timeZone, cached);
  }
  return cached;
}

/** Data e hora locais do fuso da operacao, a partir de um instante. */
export function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts = new Map(formatter(timeZone).formatToParts(instant).map(part => [part.type, part.value]));
  const hour = Number(parts.get('hour')); // Intl com hour12:false devolve 24 na meia-noite em alguns runtimes.
  return {
    year: Number(parts.get('year')),
    month: Number(parts.get('month')),
    day: Number(parts.get('day')),
    minuteOfDay: (hour === 24 ? 0 : hour) * 60 + Number(parts.get('minute')),
    weekday: WEEKDAYS[parts.get('weekday') ?? 'Sun'] ?? 0,
  };
}

/** AAAA-MM-DD do dia local da operacao. */
export function zonedDate(instant: Date, timeZone: string): string {
  const { year, month, day } = zonedParts(instant, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function offsetMinutes(instant: Date, timeZone: string): number {
  const { year, month, day, minuteOfDay } = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(year, month - 1, day, 0, minuteOfDay, 0, 0);
  // Segundos e milissegundos do instante nao entram em asUtc; descontar para nao distorcer o offset.
  const truncated = Math.floor(instant.getTime() / 60_000) * 60_000;
  return (asUtc - truncated) / 60_000;
}

/** Instante UTC de um horario de parede do fuso da operacao (duas passadas cobrem a troca de offset). */
export function instantAt(date: { year: number; month: number; day: number }, minuteOfDay: number, timeZone: string): Date {
  const naive = Date.UTC(date.year, date.month - 1, date.day, 0, minuteOfDay, 0, 0);
  let instant = new Date(naive - offsetMinutes(new Date(naive), timeZone) * 60_000);
  instant = new Date(naive - offsetMinutes(instant, timeZone) * 60_000);
  return instant;
}

function nextDay(date: { year: number; month: number; day: number }): { year: number; month: number; day: number } {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

export function isBusinessDay(date: string, calendar: BusinessCalendar): boolean {
  const [year, month, day] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)).getUTCDay();
  return calendar.weekdays.includes(weekday) && !calendar.holidays.includes(date);
}

/** Ate quantos dias corridos a busca avanca antes de desistir (feriado longo e escala parada). */
const MAX_DAYS = 400;

/**
 * Instante em que se completam `hours` horas uteis contadas de `from`. Recebimento fora da janela comeca a contar
 * na abertura seguinte. Devolve null se o calendario nao tem dia util nos proximos MAX_DAYS dias.
 */
export function businessDeadline(from: Date, hours: number, calendar: BusinessCalendar = DEFAULT_CALENDAR): Date | null {
  if (!(hours > 0)) return new Date(from.getTime());
  if (calendar.weekdays.length === 0) return null;
  let remaining = Math.round(hours * 60);
  let cursor = new Date(from.getTime());
  let day = zonedParts(cursor, calendar.timeZone);
  for (let guard = 0; guard < MAX_DAYS; guard += 1) {
    const date = `${day.year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
    if (isBusinessDay(date, calendar)) {
      const opens = instantAt(day, calendar.openMinute, calendar.timeZone);
      const closes = instantAt(day, calendar.closeMinute, calendar.timeZone);
      const start = cursor.getTime() > opens.getTime() ? cursor : opens;
      const available = Math.floor((closes.getTime() - start.getTime()) / 60_000);
      if (available > 0) {
        if (available >= remaining) return new Date(start.getTime() + remaining * 60_000);
        remaining -= available;
      }
    }
    const tomorrow = nextDay(day);
    cursor = instantAt(tomorrow, 0, calendar.timeZone);
    day = { ...tomorrow, minuteOfDay: 0, weekday: 0 };
  }
  return null;
}

/** Horas uteis consumidas entre dois instantes: usado para medir o cumprimento do prazo. */
export function businessMinutesBetween(from: Date, to: Date, calendar: BusinessCalendar = DEFAULT_CALENDAR): number {
  if (to.getTime() <= from.getTime()) return 0;
  let total = 0;
  let day = zonedParts(from, calendar.timeZone);
  let cursor = new Date(from.getTime());
  for (let guard = 0; guard < MAX_DAYS; guard += 1) {
    const date = `${day.year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
    if (isBusinessDay(date, calendar)) {
      const opens = instantAt(day, calendar.openMinute, calendar.timeZone);
      const closes = instantAt(day, calendar.closeMinute, calendar.timeZone);
      const start = Math.max(cursor.getTime(), opens.getTime());
      const end = Math.min(to.getTime(), closes.getTime());
      if (end > start) total += Math.floor((end - start) / 60_000);
    }
    const tomorrow = nextDay(day);
    cursor = instantAt(tomorrow, 0, calendar.timeZone);
    if (cursor.getTime() >= to.getTime()) break;
    day = { ...tomorrow, minuteOfDay: 0, weekday: 0 };
  }
  return total;
}

/** Horas uteis prometidas na pagina publica e usadas no vencimento da fila. */
export const RESPONSE_HOURS = 24;
