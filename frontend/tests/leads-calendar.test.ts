import test from 'node:test';
import assert from 'node:assert/strict';
import {
  businessDeadline, businessMinutesBetween, calendarFromEnv, DEFAULT_CALENDAR, isBusinessDay, instantAt,
  parseHolidays, parseMinute, parseWeekdays, RESPONSE_HOURS, zonedDate, zonedParts, type BusinessCalendar,
} from '../lib/leads/calendar.ts';

/** Fortaleza nao tem horario de verao: UTC-3 todo o ano. 12:00 local = 15:00 UTC. */
const FORTALEZA = DEFAULT_CALENDAR;

function local(iso: string): Date {
  return new Date(`${iso}-03:00`);
}

test('[CT-COT-001] calendario padrao e o exemplo do plano: seg-sex, 9h-18h, Fortaleza', () => {
  assert.equal(FORTALEZA.timeZone, 'America/Fortaleza');
  assert.equal(FORTALEZA.openMinute, 9 * 60);
  assert.equal(FORTALEZA.closeMinute, 18 * 60);
  assert.deepEqual([...FORTALEZA.weekdays], [1, 2, 3, 4, 5]);
  assert.deepEqual([...FORTALEZA.holidays], []);
  assert.equal(RESPONSE_HOURS, 24);
});

test('[CT-COT-002b] ambiente sem nenhuma variavel entrega exatamente o calendario padrao', () => {
  // Regressao: uma variavel ausente nao pode alterar a janela. Com SBI_COMERCIAL_DIAS vazio o calendario ja
  // nasceu com "so domingo" uma vez, e o vencimento das 24 horas uteis saiu tres semanas a frente.
  assert.deepEqual(calendarFromEnv({}), DEFAULT_CALENDAR);
  assert.deepEqual(
    calendarFromEnv({ SBI_COMERCIAL_FUSO: '', SBI_COMERCIAL_ABERTURA: '', SBI_COMERCIAL_FECHAMENTO: '', SBI_COMERCIAL_DIAS: '', SBI_COMERCIAL_FERIADOS: '' }),
    DEFAULT_CALENDAR,
  );
  // E o prazo calculado com esse calendario cai no terceiro dia util, nao semanas depois.
  const due = businessDeadline(new Date('2026-11-22T12:38:00Z'), 24, calendarFromEnv({}));
  assert.ok(due);
  assert.equal(zonedDate(due, 'America/Fortaleza'), '2026-11-25');
});

test('[CT-COT-002] leitura das variaveis do calendario rejeita valor invalido', () => {
  assert.equal(parseMinute('9', 0), 540);
  assert.equal(parseMinute('09:30', 0), 570);
  assert.equal(parseMinute('25:00', 540), 540);
  assert.equal(parseMinute('abc', 540), 540);
  assert.equal(parseMinute(undefined, 540), 540);
  assert.deepEqual(parseHolidays('2026-12-25, 2027-01-01 lixo 26-12'), ['2026-12-25', '2027-01-01']);
  assert.deepEqual(parseHolidays(undefined), []);
  assert.deepEqual(parseWeekdays('1,2,3', [1, 2, 3, 4, 5]), [1, 2, 3]);
  assert.deepEqual(parseWeekdays('9,x', [1, 5]), [1, 5]);
  assert.deepEqual(parseWeekdays('6,0,6', [1]), [0, 6]);
  assert.deepEqual(parseWeekdays('5,1,3', [1]), [1, 3, 5], 'ordem numerica, nao lexicografica');
  // Variavel ausente ou vazia cai no padrao: "" nao pode virar o dia 0 (Number("") e 0).
  assert.deepEqual(parseWeekdays(undefined, [1, 2, 3, 4, 5]), [1, 2, 3, 4, 5]);
  assert.deepEqual(parseWeekdays('', [1, 2, 3, 4, 5]), [1, 2, 3, 4, 5]);
  assert.deepEqual(parseWeekdays('  ', [1, 2, 3, 4, 5]), [1, 2, 3, 4, 5]);
  assert.deepEqual(parseWeekdays(',,', [1, 2, 3, 4, 5]), [1, 2, 3, 4, 5]);

  const env = calendarFromEnv({
    SBI_COMERCIAL_FUSO: 'America/Sao_Paulo', SBI_COMERCIAL_ABERTURA: '8:00', SBI_COMERCIAL_FECHAMENTO: '17:00',
    SBI_COMERCIAL_DIAS: '1,2,3,4,5,6', SBI_COMERCIAL_FERIADOS: '2026-12-25',
  });
  assert.equal(env.timeZone, 'America/Sao_Paulo');
  assert.equal(env.openMinute, 480);
  assert.equal(env.closeMinute, 1020);
  assert.deepEqual([...env.weekdays], [1, 2, 3, 4, 5, 6]);

  // Fuso invalido e fechamento antes da abertura voltam ao padrao, em vez de produzir uma janela impossivel.
  const broken = calendarFromEnv({ SBI_COMERCIAL_FUSO: 'Marte/Olympus', SBI_COMERCIAL_FECHAMENTO: '7:00' });
  assert.equal(broken.timeZone, 'America/Fortaleza');
  assert.equal(broken.closeMinute, 18 * 60);
});

test('[CT-COT-003] data e hora locais da operacao a partir do instante', () => {
  const parts = zonedParts(new Date('2026-11-23T12:00:00Z'), 'America/Fortaleza');
  assert.deepEqual(parts, { year: 2026, month: 11, day: 23, minuteOfDay: 9 * 60, weekday: 1 });
  assert.equal(zonedDate(new Date('2026-11-24T02:30:00Z'), 'America/Fortaleza'), '2026-11-23');
  // Meia-noite local nao vira "24:00".
  assert.equal(zonedParts(new Date('2026-11-23T03:00:00Z'), 'America/Fortaleza').minuteOfDay, 0);
  assert.equal(instantAt({ year: 2026, month: 11, day: 23 }, 9 * 60, 'America/Fortaleza').toISOString(), '2026-11-23T12:00:00.000Z');
});

test('[CT-COT-004] dentro da janela, 24 horas uteis caem no terceiro dia util', () => {
  // Segunda 09:00 local. Sobram 9 h na segunda, 9 h na terca e as 6 h restantes acabam quarta 15:00.
  const due = businessDeadline(local('2026-11-23T09:00:00'), 24, FORTALEZA);
  assert.ok(due);
  assert.equal(zonedDate(due, FORTALEZA.timeZone), '2026-11-25');
  assert.equal(zonedParts(due, FORTALEZA.timeZone).minuteOfDay, 15 * 60);
});

test('[CT-COT-005] recebimento fora do expediente comeca a contar na abertura seguinte', () => {
  // Segunda 22:00 local: a contagem comeca terca 09:00, entao termina quinta 15:00, igual ao caso de terca 09:00.
  const night = businessDeadline(local('2026-11-23T22:00:00'), 24, FORTALEZA);
  const morning = businessDeadline(local('2026-11-24T09:00:00'), 24, FORTALEZA);
  assert.ok(night && morning);
  assert.equal(night.toISOString(), morning.toISOString());
  assert.equal(zonedDate(night, FORTALEZA.timeZone), '2026-11-26');

  // Antes de abrir no mesmo dia tambem comeca na abertura do dia.
  const early = businessDeadline(local('2026-11-24T06:00:00'), 24, FORTALEZA);
  assert.equal(early?.toISOString(), morning.toISOString());
});

test('[CT-COT-006] fim de semana nao conta: sabado e domingo passam inteiros', () => {
  // Sabado 10:00 local -> comeca segunda 09:00 -> termina quarta 15:00.
  const saturday = businessDeadline(local('2026-11-21T10:00:00'), 24, FORTALEZA);
  assert.ok(saturday);
  assert.equal(zonedDate(saturday, FORTALEZA.timeZone), '2026-11-25');
  assert.equal(zonedParts(saturday, FORTALEZA.timeZone).minuteOfDay, 15 * 60);

  // Sexta 17:00: 1 h na sexta, 9 h na segunda, 9 h na terca, 5 h na quarta -> quarta 14:00.
  const friday = businessDeadline(local('2026-11-20T17:00:00'), 24, FORTALEZA);
  assert.ok(friday);
  assert.equal(zonedDate(friday, FORTALEZA.timeZone), '2026-11-25');
  assert.equal(zonedParts(friday, FORTALEZA.timeZone).minuteOfDay, 14 * 60);
});

test('[CT-COT-007] feriado configurado nao conta hora util', () => {
  const withHoliday: BusinessCalendar = { ...FORTALEZA, holidays: ['2026-11-24'] };
  assert.equal(isBusinessDay('2026-11-24', FORTALEZA), true);
  assert.equal(isBusinessDay('2026-11-24', withHoliday), false);
  assert.equal(isBusinessDay('2026-11-21', FORTALEZA), false);

  // Segunda 09:00 com terca feriado: 9 h segunda, terca pulada, 9 h quarta, 6 h quinta -> quinta 15:00.
  const due = businessDeadline(local('2026-11-23T09:00:00'), 24, withHoliday);
  assert.ok(due);
  assert.equal(zonedDate(due, FORTALEZA.timeZone), '2026-11-26');
  assert.equal(zonedParts(due, FORTALEZA.timeZone).minuteOfDay, 15 * 60);
});

test('[CT-COT-008] calendario sem dia util nao inventa prazo', () => {
  assert.equal(businessDeadline(local('2026-11-23T09:00:00'), 24, { ...FORTALEZA, weekdays: [] }), null);
  // Prazo zero devolve o proprio instante, sem avancar janela.
  const now = local('2026-11-23T09:00:00');
  assert.equal(businessDeadline(now, 0, FORTALEZA)?.toISOString(), now.toISOString());
});

test('[CT-COT-009] horas uteis consumidas medem o cumprimento do prazo', () => {
  // Segunda 09:00 -> segunda 12:00 = 3 h uteis.
  assert.equal(businessMinutesBetween(local('2026-11-23T09:00:00'), local('2026-11-23T12:00:00'), FORTALEZA), 180);
  // Sexta 17:00 -> segunda 10:00 = 1 h na sexta + 1 h na segunda.
  assert.equal(businessMinutesBetween(local('2026-11-20T17:00:00'), local('2026-11-23T10:00:00'), FORTALEZA), 120);
  // Sabado inteiro nao soma nada.
  assert.equal(businessMinutesBetween(local('2026-11-21T00:00:00'), local('2026-11-22T23:59:00'), FORTALEZA), 0);
  assert.equal(businessMinutesBetween(local('2026-11-23T12:00:00'), local('2026-11-23T09:00:00'), FORTALEZA), 0);

  // O vencimento calculado consome exatamente as 24 horas prometidas.
  const from = local('2026-11-20T17:00:00');
  const due = businessDeadline(from, 24, FORTALEZA);
  assert.ok(due);
  assert.equal(businessMinutesBetween(from, due, FORTALEZA), 24 * 60);
});

test('[CT-COT-010] fuso com horario de verao nao perde nem duplica hora util', () => {
  // Lisboa muda para o horario de verao em 29/03/2026. A janela de 9h-18h continua com 9 h uteis por dia.
  const lisbon: BusinessCalendar = { ...FORTALEZA, timeZone: 'Europe/Lisbon' };
  const friday = instantAt({ year: 2026, month: 3, day: 27 }, 9 * 60, 'Europe/Lisbon');
  const due = businessDeadline(friday, 24, lisbon);
  assert.ok(due);
  // 9 h sexta + 9 h segunda (ja no horario de verao) + 6 h terca -> terca 15:00 local.
  assert.equal(zonedDate(due, 'Europe/Lisbon'), '2026-03-31');
  assert.equal(zonedParts(due, 'Europe/Lisbon').minuteOfDay, 15 * 60);
  assert.equal(businessMinutesBetween(friday, due, lisbon), 24 * 60);
});
