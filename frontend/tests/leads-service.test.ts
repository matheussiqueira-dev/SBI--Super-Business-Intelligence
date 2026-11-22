import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_CALENDAR, type BusinessCalendar } from '../lib/leads/calendar.ts';
import {
  CONFIRMATION, normalizeQuote, parseCityUf, parseWhatsapp, QuoteFormInput, quoteFieldErrors, squeeze, UF,
} from '../lib/leads/lead.ts';
import { memoryStore } from '../lib/leads/memory-store.ts';
import { fileStore } from '../lib/leads/file-store.ts';
import { createRateLimiter, clientKeyFor, MIN_FILL_MS } from '../lib/leads/rate-limit.ts';
import { MESSAGES, receiveQuote } from '../lib/leads/service.ts';
import { notifyLead, notificationPayload, notifyTarget, DEV_OUTBOX } from '../lib/leads/notify.ts';
import { PROTOCOL } from '../lib/leads/protocol.ts';
import type { Lead } from '../lib/leads/lead.ts';

const VALID = {
  name: '  Ana   Souza ', company: 'Eletro Centro', email: ' Ana@EletroCentro.example ',
  cityUf: ' Fortaleza / ce ', segment: 'Eletrônicos', whatsapp: '(85) 99999-0000', message: 'Uma  loja, cinco vendedores.',
};

const MONDAY = new Date('2026-11-23T12:00:00Z'); // segunda, 09:00 em Fortaleza

function options(store: ReturnType<typeof memoryStore> | null, extra: Record<string, unknown> = {}) {
  return { store, calendar: DEFAULT_CALENDAR, now: MONDAY, elapsedMs: 5_000, ...extra };
}

test('[CT-COT-040] normalizacao: espacos, caixa e telefone entram iguais no registro', () => {
  assert.equal(squeeze('  a   b  '), 'a b');
  assert.deepEqual(parseCityUf(' Juazeiro do Norte / ce '), { city: 'Juazeiro do Norte', uf: 'CE' });
  assert.equal(parseCityUf('Fortaleza'), null);
  assert.equal(parseCityUf('Fortaleza/XX'), null);
  assert.equal(parseCityUf('F/CE'), null);
  assert.equal(parseCityUf('Cidade/CE/Extra'), null);
  assert.equal(UF.length, 27);

  assert.equal(parseWhatsapp('(85) 99999-0000'), '85999990000');
  assert.equal(parseWhatsapp('+55 85 99999 0000'), '85999990000');
  assert.equal(parseWhatsapp('8533334444'), '8533334444');
  assert.equal(parseWhatsapp('999990000'), null);
  assert.equal(parseWhatsapp('(05) 99999-0000'), null);
  assert.equal(parseWhatsapp('texto'), null);

  const parsed = QuoteFormInput.parse(VALID);
  const request = normalizeQuote(parsed);
  assert.deepEqual(request, {
    name: 'Ana Souza', company: 'Eletro Centro', email: 'ana@eletrocentro.example',
    city: 'Fortaleza', uf: 'CE', segment: 'Eletrônicos', whatsapp: '85999990000',
    message: 'Uma loja, cinco vendedores.',
  });
});

test('[CT-COT-041] campo obrigatorio ausente volta com erro por campo e nada e gravado', async () => {
  const store = memoryStore();
  const result = await receiveQuote({ name: '', company: '', email: 'nao-email', cityUf: 'Fortaleza' }, options(store));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.status, 400);
  assert.equal(result.failure, 'validacao');
  assert.equal(result.message, MESSAGES.validacao);
  assert.deepEqual(Object.keys(result.fieldErrors ?? {}).sort(), ['cityUf', 'company', 'email', 'name']);
  assert.match(result.fieldErrors?.cityUf ?? '', /Fortaleza\/CE/);
  assert.equal((await store.list()).length, 0);

  // Opcionais longos tambem param no campo certo, sem derrubar o envio inteiro em uma mensagem generica.
  const long = await receiveQuote({ ...VALID, message: 'x'.repeat(1_001) }, options(store));
  assert.equal(long.ok, false);
  if (!long.ok) assert.deepEqual(Object.keys(long.fieldErrors ?? {}), ['message']);

  const badPhone = await receiveQuote({ ...VALID, whatsapp: '12345' }, options(store));
  assert.equal(badPhone.ok, false);
  if (!badPhone.ok) assert.deepEqual(Object.keys(badPhone.fieldErrors ?? {}), ['whatsapp']);
  assert.equal((await store.list()).length, 0);
});

test('[CT-COT-042] envio valido grava e devolve protocolo com a frase da confirmacao', async () => {
  const store = memoryStore();
  const result = await receiveQuote(VALID, options(store));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.match(result.lead.protocol, PROTOCOL);
  assert.equal(result.message, CONFIRMATION(result.lead.protocol));
  assert.equal(result.message, `Solicitação recebida. Seu protocolo é ${result.lead.protocol}. Nossa equipe responde em até 24 horas úteis.`);
  assert.equal(result.duplicated, false);
  assert.equal(result.lead.state, 'novo');
  assert.equal(result.lead.receivedAt, MONDAY.toISOString());
  // Vencimento: segunda 09:00 + 24 h uteis -> quarta 18:00 UTC (15:00 em Fortaleza).
  assert.equal(result.lead.dueAt, '2026-11-25T18:00:00.000Z');
  assert.equal((await store.list()).length, 1);
});

test('[CT-COT-043] envio duplicado recupera o mesmo protocolo e nao cria outra cotacao', async () => {
  const store = memoryStore();
  const first = await receiveQuote(VALID, options(store));
  // Mesmo conteudo, com espacos e caixa diferentes, mais tarde no mesmo dia util.
  const again = await receiveQuote(
    { ...VALID, name: 'ANA SOUZA', email: 'ANA@eletrocentro.example', cityUf: 'Fortaleza/CE' },
    options(store, { now: new Date('2026-11-23T16:00:00Z') }),
  );
  assert.equal(first.ok && again.ok, true);
  if (!first.ok || !again.ok) return;
  assert.equal(again.duplicated, true);
  assert.equal(again.lead.protocol, first.lead.protocol);
  assert.equal((await store.list()).length, 1);

  // No dia seguinte a mesma loja abre solicitacao nova.
  const tomorrow = await receiveQuote(VALID, options(store, { now: new Date('2026-11-24T12:00:00Z') }));
  assert.equal(tomorrow.ok, true);
  if (tomorrow.ok) assert.equal(tomorrow.duplicated, false);
  assert.equal((await store.list()).length, 2);
});

test('[CT-COT-044] prazo do envio fora do expediente e do fim de semana sai do calendario configurado', async () => {
  const store = memoryStore();
  // Sexta 20:00 local (23:00 UTC): a contagem comeca segunda 09:00 -> quarta 15:00 local.
  const friday = await receiveQuote(VALID, options(store, { now: new Date('2026-11-20T23:00:00Z') }));
  assert.equal(friday.ok, true);
  if (friday.ok) assert.equal(friday.lead.dueAt, '2026-11-25T18:00:00.000Z');

  // Feriado configurado empurra o vencimento em um dia util.
  const holiday: BusinessCalendar = { ...DEFAULT_CALENDAR, holidays: ['2026-11-24'] };
  const other = memoryStore();
  const withHoliday = await receiveQuote(VALID, options(other, { calendar: holiday }));
  assert.equal(withHoliday.ok, true);
  if (withHoliday.ok) assert.equal(withHoliday.lead.dueAt, '2026-11-26T18:00:00.000Z');
});

test('[CT-COT-045] armadilha e envio instantaneo nao gravam e nao revelam qual barreira pegou', async () => {
  const store = memoryStore();
  const trapped = await receiveQuote({ ...VALID, site: 'http://spam.example' }, options(store));
  assert.equal(trapped.ok, false);
  if (!trapped.ok) {
    assert.equal(trapped.status, 400);
    assert.equal(trapped.message, MESSAGES.validacao);
    assert.deepEqual(trapped.fieldErrors, {});
  }

  const instant = await receiveQuote(VALID, options(store, { elapsedMs: MIN_FILL_MS - 1 }));
  assert.equal(instant.ok, false);
  if (!instant.ok) assert.deepEqual(instant.fieldErrors, {});
  assert.equal((await store.list()).length, 0);

  // Sem o tempo informado (JavaScript desligado, envio nativo do formulario) o envio passa.
  const native = await receiveQuote(VALID, options(store, { elapsedMs: undefined }));
  assert.equal(native.ok, true);
});

test('[CT-COT-046] limite de volume responde 429 com Retry-After e nada e gravado', async () => {
  const store = memoryStore();
  const blocked = await receiveQuote(VALID, options(store, { rateLimit: { allowed: false, retryAfterSeconds: 120 } }));
  assert.equal(blocked.ok, false);
  if (!blocked.ok) {
    assert.equal(blocked.status, 429);
    assert.equal(blocked.failure, 'volume');
    assert.equal(blocked.retryAfterSeconds, 120);
  }
  assert.equal((await store.list()).length, 0);

  const limiter = createRateLimiter({ limit: 2, windowMs: 1_000 });
  assert.equal(limiter.check('ip', 0).allowed, true);
  assert.equal(limiter.check('ip', 100).allowed, true);
  const third = limiter.check('ip', 200);
  assert.equal(third.allowed, false);
  assert.equal(third.retryAfterSeconds, 1);
  // Outra origem tem janela propria; a janela anterior expira.
  assert.equal(limiter.check('outro-ip', 200).allowed, true);
  assert.equal(limiter.check('ip', 1_500).allowed, true);

  assert.equal(clientKeyFor(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' })), '203.0.113.7');
  assert.equal(clientKeyFor(new Headers({ 'x-real-ip': '203.0.113.9' })), '203.0.113.9');
  assert.equal(clientKeyFor(new Headers()), 'sem-origem');
});

test('[CT-COT-047] sem armazenamento configurado a resposta e 503 e nenhum protocolo e inventado', async () => {
  const result = await receiveQuote(VALID, options(null, { storeReason: 'SBI_COTACAO_MODO não configurado.' }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 503);
    assert.equal(result.failure, 'indisponivel');
    assert.match(result.message, /canal comercial/i);
    assert.doesNotMatch(result.message, /SBI-/);
  }
});

test('[CT-COT-048] falha de gravacao devolve erro que permite repetir, sem perder o que foi digitado', async () => {
  const failing = { ...memoryStore(), save: async () => { throw new Error('EIO'); } };
  const result = await receiveQuote(VALID, options(failing as never));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 502);
    assert.equal(result.failure, 'falha');
    assert.match(result.message, /tente enviar novamente/i);
  }
});

test('[CT-COT-049] colisao de protocolo e resolvida sorteando outro, nao com erro', async () => {
  const store = memoryStore();
  await store.save({
    protocol: 'SBI-20261123-ACDEFG', idempotencyKey: 'z'.repeat(64),
    request: normalizeQuote(QuoteFormInput.parse(VALID)), source: 't',
    receivedAt: MONDAY.toISOString(), dueAt: MONDAY.toISOString(),
  });
  let tries = 0;
  const colliding = {
    ...store,
    save: async (input: Parameters<typeof store.save>[0]) => {
      tries += 1;
      return store.save(tries === 1 ? { ...input, protocol: 'SBI-20261123-ACDEFG' } : input);
    },
  };
  const result = await receiveQuote({ ...VALID, email: 'outra@loja.example' }, options(colliding as never));
  assert.equal(result.ok, true);
  assert.equal(tries, 2, 'a segunda tentativa usa outro protocolo sorteado');
});

test('[CT-COT-050] chave de idempotencia do cliente tem prioridade sobre o resumo do conteudo', async () => {
  const store = memoryStore();
  const header = 'f'.repeat(32);
  const first = await receiveQuote(VALID, options(store, { idempotencyHeader: header }));
  // Conteudo diferente, mesma chave do cliente: e a mesma tentativa de envio.
  const retry = await receiveQuote({ ...VALID, message: 'mudei o texto' }, options(store, { idempotencyHeader: header }));
  assert.equal(first.ok && retry.ok, true);
  if (!first.ok || !retry.ok) return;
  assert.equal(retry.duplicated, true);
  assert.equal(retry.lead.protocol, first.lead.protocol);
});

test('[CT-COT-051] confirmacao vai para a caixa de saida local e nao carrega a mensagem do formulario', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sbi-outbox-'));
  try {
    const store = fileStore(join(dir, 'fila'));
    const result = await receiveQuote(VALID, { store, calendar: DEFAULT_CALENDAR, now: MONDAY, elapsedMs: 5_000 });
    assert.equal(result.ok, true);
    if (!result.ok) return;

    const outcome = await notifyLead(result.lead, { target: { kind: 'caixa', dir: join(dir, 'caixa') } });
    assert.equal(outcome.state, 'enviada');
    assert.equal(outcome.attempts, 1);
    assert.deepEqual(await readdir(join(dir, 'caixa')), [`${result.lead.protocol}.json`]);

    const sent = await readFile(join(dir, 'caixa', `${result.lead.protocol}.json`), 'utf8');
    assert.match(sent, /Eletro Centro/);
    assert.doesNotMatch(sent, /cinco vendedores/, 'a mensagem livre nao sai na notificacao');
    const payload = notificationPayload(result.lead) as Record<string, unknown>;
    assert.equal(payload.temMensagem, true);
    assert.equal(JSON.stringify(payload).includes('cinco vendedores'), false);
    assert.equal(payload.protocolo, result.lead.protocol);

    // O estado da notificacao fica gravado na cotacao, para a fila ver o que falta reenviar.
    await store.update(result.lead.protocol, { notification: outcome });
    assert.equal((await store.get(result.lead.protocol))?.notification.state, 'enviada');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('[CT-COT-052] falha de notificacao tenta de novo, alerta e preserva a cotacao gravada', async () => {
  const store = memoryStore();
  const result = await receiveQuote(VALID, options(store));
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const alerts: string[] = [];
  const waits: number[] = [];
  let calls = 0;
  const outcome = await notifyLead(result.lead, {
    target: { kind: 'http', url: 'https://crm.example/hook', token: 't' },
    fetcher: (async () => { calls += 1; return new Response('erro', { status: 500 }); }) as typeof fetch,
    sleep: async (ms: number) => { waits.push(ms); },
    onAlert: message => { alerts.push(message); },
  });
  assert.equal(outcome.state, 'falhou');
  assert.equal(outcome.attempts, 3);
  assert.equal(calls, 3);
  assert.deepEqual(waits, [500, 2_000], 'espera crescente entre tentativas');
  assert.equal(alerts.length, 1);
  assert.match(alerts[0] ?? '', new RegExp(result.lead.protocol));
  assert.doesNotMatch(alerts[0] ?? '', /ana@eletrocentro/, 'o alerta identifica pelo protocolo, nao pelo contato');

  // A cotacao continua la, com o estado da notificacao registrado.
  await store.update(result.lead.protocol, { notification: outcome });
  const kept = await store.get(result.lead.protocol);
  assert.equal(kept?.protocol, result.lead.protocol);
  assert.equal(kept?.notification.state, 'falhou');
  assert.equal(kept?.notification.lastError, 'Error: HTTP 500');
});

test('[CT-COT-053] primeira tentativa que funciona nao repete o envio', async () => {
  const lead = { protocol: 'SBI-20261123-ACDEFG', idempotencyKey: 'a'.repeat(64) } as Lead;
  let calls = 0;
  const outcome = await notifyLead(
    { ...lead, request: { name: 'A', company: 'B', email: 'a@b.example', city: 'C', uf: 'CE', segment: '', whatsapp: '', message: '' }, receivedAt: '', dueAt: '', source: 's', state: 'novo', owner: null, backup: null, firstHumanReplyAt: null, nextStep: null, notification: { state: 'pendente', attempts: 0, lastError: null } },
    {
      target: { kind: 'http', url: 'https://crm.example/hook', token: 't' },
      fetcher: (async () => { calls += 1; return new Response('{}', { status: 202 }); }) as typeof fetch,
    },
  );
  assert.equal(outcome.state, 'enviada');
  assert.equal(calls, 1);
});

test('[CT-COT-054] destino da notificacao: http so com credencial completa, senao caixa local', () => {
  assert.deepEqual(notifyTarget({ NODE_ENV: 'development' }), { kind: 'caixa', dir: DEV_OUTBOX });
  assert.deepEqual(notifyTarget({ NODE_ENV: 'production' }), { kind: 'desligada', reason: 'Nenhum provedor de notificação configurado.' });
  assert.equal(notifyTarget({
    SBI_COTACAO_NOTIFICACAO_URL: 'https://crm.example/hook', SBI_COTACAO_NOTIFICACAO_TOKEN: 't',
  }).kind, 'http');
  // URL insegura com token nao cai silenciosamente na caixa local: desliga e explica.
  assert.deepEqual(notifyTarget({
    SBI_COTACAO_NOTIFICACAO_URL: 'http://crm.example/hook', SBI_COTACAO_NOTIFICACAO_TOKEN: 't',
  }), { kind: 'desligada', reason: 'SBI_COTACAO_NOTIFICACAO_URL inválida.' });
  assert.equal(notifyTarget({ SBI_COTACAO_CAIXA_SAIDA: '/tmp/fila', NODE_ENV: 'production' }).kind, 'caixa');
});

test('[CT-COT-055] notificacao desligada nao e registrada como enviada', async () => {
  const lead = {
    protocol: 'SBI-20261123-ACDEFG', idempotencyKey: 'a'.repeat(64),
    request: { name: 'A', company: 'B', email: 'a@b.example', city: 'C', uf: 'CE', segment: '', whatsapp: '', message: '' },
    source: 's', receivedAt: '', dueAt: '', state: 'novo' as const, owner: null, backup: null,
    firstHumanReplyAt: null, nextStep: null, notification: { state: 'pendente' as const, attempts: 0, lastError: null },
  };
  const outcome = await notifyLead(lead, { target: { kind: 'desligada', reason: 'sem provedor' } });
  assert.equal(outcome.state, 'desligada');
  assert.equal(outcome.attempts, 0);
  assert.equal(outcome.lastError, 'sem provedor');
});

test('[CT-COT-056] quoteFieldErrors devolve so o primeiro problema de cada campo', () => {
  const parsed = QuoteFormInput.safeParse({ name: '', company: '', email: '', cityUf: '' });
  assert.equal(parsed.success, false);
  if (parsed.success) return;
  const errors = quoteFieldErrors(parsed.error);
  for (const [field, message] of Object.entries(errors)) {
    assert.equal(typeof message, 'string');
    assert.ok(message.length > 0, `${field} sem mensagem`);
  }
});

test('[CT-COT-060] mesma origem e decidida pelos cabecalhos do navegador, nao pela URL interna do Next', async () => {
  const { isSameOrigin } = await import('../lib/leads/origin.ts');
  // O formulario da propria pagina.
  assert.equal(isSameOrigin(new Headers({ 'sec-fetch-site': 'same-origin' })), true);
  // Navegacao direta (o proprio usuario abriu o endereco).
  assert.equal(isSameOrigin(new Headers({ 'sec-fetch-site': 'none' })), true);
  // Pagina de outro site postando no handler.
  assert.equal(isSameOrigin(new Headers({ 'sec-fetch-site': 'cross-site', origin: 'https://outro.example' })), false);
  assert.equal(isSameOrigin(new Headers({ 'sec-fetch-site': 'same-site' })), false);

  // Navegador sem Sec-Fetch-Site: compara Origin com Host, nunca com a URL da requisicao.
  assert.equal(isSameOrigin(new Headers({ origin: 'http://127.0.0.1:3100', host: '127.0.0.1:3100' })), true);
  assert.equal(isSameOrigin(new Headers({ origin: 'https://SBI.tech', host: 'sbi.tech' })), true);
  assert.equal(isSameOrigin(new Headers({ origin: 'http://127.0.0.1:3100', host: 'localhost:3100' })), false);
  assert.equal(isSameOrigin(new Headers({ origin: 'https://outro.example', host: 'sbi.tech' })), false);
  assert.equal(isSameOrigin(new Headers({ origin: 'nao-url', host: 'sbi.tech' })), false);
  assert.equal(isSameOrigin(new Headers({ origin: 'https://sbi.tech' })), false, 'sem host nao da para confirmar');
  // Atras de CDN o host do navegador chega em x-forwarded-host.
  assert.equal(isSameOrigin(new Headers({ origin: 'https://sbi.tech', host: 'interno:3000', 'x-forwarded-host': 'sbi.tech' })), true);
  assert.equal(isSameOrigin(new Headers({ origin: 'https://sbi.tech', host: 'interno', 'x-forwarded-host': 'sbi.tech, interno' })), true);

  // Cliente sem cabecalho de navegador (curl, verificacao sintetica) passa; o limite de volume cuida do resto.
  assert.equal(isSameOrigin(new Headers()), true);
});
