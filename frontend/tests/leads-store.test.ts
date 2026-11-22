import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileStore } from '../lib/leads/file-store.ts';
import { memoryStore } from '../lib/leads/memory-store.ts';
import { httpStore, LeadStoreError } from '../lib/leads/http-store.ts';
import { DEV_ROOT, quoteMode, resolveStore } from '../lib/leads/runtime.ts';
import { clientKey, idempotencyKey, newProtocol, PROTOCOL, randomSuffix } from '../lib/leads/protocol.ts';
import { DEFAULT_CALENDAR } from '../lib/leads/calendar.ts';
import type { QuoteRequest } from '../lib/leads/lead.ts';
import type { LeadStore, SaveInput, SaveResult } from '../lib/leads/store.ts';

const REQUEST: QuoteRequest = {
  name: 'Ana Souza', company: 'Eletro Centro', email: 'ana@eletrocentro.example',
  city: 'Fortaleza', uf: 'CE', segment: 'Eletrônicos', whatsapp: '85999990000', message: 'Uma loja, cinco vendedores.',
};

function input(overrides: Partial<SaveInput> = {}): SaveInput {
  return {
    protocol: 'SBI-20261123-ACDEFG',
    idempotencyKey: 'a'.repeat(64),
    request: REQUEST,
    source: 'teste',
    receivedAt: '2026-11-23T12:00:00.000Z',
    dueAt: '2026-11-25T18:00:00.000Z',
    ...overrides,
  };
}

async function withTempDir<T>(body: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'sbi-cotacao-'));
  try {
    return await body(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('[CT-COT-020] protocolo tem o formato ditavel e nao usa caractere ambiguo', () => {
  const protocol = newProtocol(new Date('2026-11-23T12:00:00Z'), DEFAULT_CALENDAR);
  assert.match(protocol, PROTOCOL);
  assert.ok(protocol.startsWith('SBI-20261123-'));
  // Data do fuso da operacao, nao do UTC: 23/11 22:00 em Fortaleza ainda e 23/11.
  assert.ok(newProtocol(new Date('2026-11-24T01:00:00Z'), DEFAULT_CALENDAR).startsWith('SBI-20261123-'));
  for (const char of '01258BILOSZ') {
    assert.ok(!randomSuffix(200).includes(char), `sufixo nao deve conter ${char}`);
  }
  assert.equal(randomSuffix(6).length, 6);
  // Sorteio com todos os bytes acima da faixa de rejeicao ainda termina (o gerador e chamado de novo).
  let call = 0;
  const suffix = randomSuffix(3, size => {
    call += 1;
    return new Uint8Array(size).fill(call === 1 ? 255 : 0);
  });
  assert.equal(suffix, '333');
});

test('[CT-COT-021] chave de idempotencia e um resumo: nao guarda conteudo e muda com o dia', async () => {
  const monday = new Date('2026-11-23T12:00:00Z');
  const key = await idempotencyKey(REQUEST, monday, DEFAULT_CALENDAR);
  assert.match(key, /^[0-9a-f]{64}$/);
  assert.ok(!key.includes('ana'), 'a chave nao pode carregar o e-mail');

  // Mesmo conteudo, mesmo dia -> mesma chave. Horario diferente no mesmo dia nao muda.
  assert.equal(await idempotencyKey(REQUEST, new Date('2026-11-23T20:00:00Z'), DEFAULT_CALENDAR), key);
  // Dia seguinte -> chave nova: a loja pode abrir outra solicitacao.
  assert.notEqual(await idempotencyKey(REQUEST, new Date('2026-11-24T12:00:00Z'), DEFAULT_CALENDAR), key);
  // Qualquer campo diferente -> chave nova.
  for (const patch of [{ email: 'b@c.example' }, { company: 'Outra' }, { message: '' }, { whatsapp: '' }, { uf: 'SP' }]) {
    assert.notEqual(await idempotencyKey({ ...REQUEST, ...patch }, monday, DEFAULT_CALENDAR), key, JSON.stringify(patch));
  }
  // Separador: mover texto de um campo para o outro nao pode gerar a mesma chave.
  const a = await idempotencyKey({ ...REQUEST, city: 'Fortaleza', segment: 'x' }, monday, DEFAULT_CALENDAR);
  const b = await idempotencyKey({ ...REQUEST, city: 'Fortalezax', segment: '' }, monday, DEFAULT_CALENDAR);
  assert.notEqual(a, b);
});

test('[CT-COT-022] chave do cliente e aceita so no formato esperado', () => {
  assert.equal(clientKey('9b1f0c3a-5d7e-4f10-8a2b-6c5d4e3f2a1b'), '9b1f0c3a5d7e4f108a2b6c5d4e3f2a1b');
  assert.equal(clientKey('ABCDEF0123456789abcdef0123456789'), 'abcdef0123456789abcdef0123456789');
  assert.equal(clientKey('curto'), null);
  assert.equal(clientKey('../../escapa'), null);
  assert.equal(clientKey(null), null);
});

async function dedupeContract(store: LeadStore): Promise<void> {
  const first = await store.save(input());
  assert.equal(first.created, true);
  assert.equal(first.lead.state, 'novo');
  assert.equal(first.lead.notification.state, 'pendente');

  // Mesma chave, protocolo sorteado diferente: recupera o protocolo do primeiro envio e nao cria outra cotacao.
  const again = await store.save(input({ protocol: 'SBI-20261123-HJKMNP' }));
  assert.equal(again.created, false);
  assert.equal(again.lead.protocol, first.lead.protocol);
  assert.equal((await store.list()).length, 1);

  // Chave diferente: cotacao nova.
  const other = await store.save(input({ protocol: 'SBI-20261123-QRTUVW', idempotencyKey: 'b'.repeat(64) }));
  assert.equal(other.created, true);
  assert.equal((await store.list()).length, 2);

  // Protocolo repetido com chave nova e recusado para o chamador sortear outro.
  await assert.rejects(
    () => store.save(input({ protocol: first.lead.protocol, idempotencyKey: 'c'.repeat(64) })),
    /PROTOCOL_TAKEN/,
  );

  assert.equal((await store.get(first.lead.protocol))?.protocol, first.lead.protocol);
  assert.equal(await store.get('SBI-20261123-XXXXXX'), null);

  const updated = await store.update(first.lead.protocol, {
    state: 'respondido', owner: 'comercial-1', backup: 'comercial-2',
    firstHumanReplyAt: '2026-11-23T14:00:00.000Z', nextStep: 'Diagnóstico agendado',
  });
  assert.equal(updated?.state, 'respondido');
  assert.equal(updated?.owner, 'comercial-1');
  assert.equal(updated?.firstHumanReplyAt, '2026-11-23T14:00:00.000Z');
  assert.equal(await store.update('SBI-20261123-XXXXXX', { state: 'descartado' }), null);
  assert.deepEqual((await store.list({ state: 'respondido' })).map(lead => lead.protocol), [first.lead.protocol]);
  assert.equal((await store.list({ limit: 1 })).length, 1);
}

test('[CT-COT-023] memoria: a mesma chave recupera o mesmo protocolo', async () => {
  await dedupeContract(memoryStore());
});

test('[CT-COT-024] arquivo: a restricao unica da chave vale em disco', async () => {
  await withTempDir(async dir => {
    await dedupeContract(fileStore(dir));
    const keys = await readdir(join(dir, 'chaves'));
    assert.equal(keys.length, 2, 'uma chave por solicitacao distinta');
    const leads = await readdir(join(dir, 'cotacoes'));
    assert.equal(leads.length, 2);
    // O JSON gravado tem o que a fila precisa para atender.
    const saved = JSON.parse(await readFile(join(dir, 'cotacoes', leads[0] ?? ''), 'utf8')) as Record<string, unknown>;
    for (const field of ['protocol', 'idempotencyKey', 'request', 'receivedAt', 'dueAt', 'state', 'notification']) {
      assert.ok(field in saved, `falta ${field} no registro`);
    }
  });
});

test('[CT-COT-025] arquivo: envios simultaneos com a mesma chave geram um protocolo so', async () => {
  await withTempDir(async dir => {
    const store = fileStore(dir);
    const results = await Promise.all(
      ['ACDEFG', 'HJKMNP', 'QRTUVW', 'XY3467', '9ACDEF'].map(suffix =>
        store.save(input({ protocol: `SBI-20261123-${suffix}` })).catch((error: unknown) => error as Error)),
    );
    const saved = results.filter((result): result is SaveResult => !(result instanceof Error));
    assert.equal(saved.length, 5, 'nenhum envio deve falhar: os perdedores leem o protocolo ja gravado');
    const protocols = new Set(saved.map(result => result.lead.protocol));
    assert.equal(protocols.size, 1, `um protocolo so, veio ${[...protocols].join(', ')}`);
    assert.equal(saved.filter(result => result.created).length, 1, 'so um envio cria');
    assert.equal((await store.list()).length, 1);
  });
});

test('[CT-COT-026] arquivo: ponteiro quebrado nunca devolve a cotacao de outra loja', async () => {
  await withTempDir(async dir => {
    const store = fileStore(dir);
    const first = await store.save(input());
    const pointer = (key: string) => join(dir, 'chaves', `${key}.txt`);

    // Ponteiro para um protocolo que nao existe (gravacao interrompida): refaz sob a mesma chave, sem perder nada.
    await writeFile(pointer('d'.repeat(64)), 'SBI-20261123-ZZZZZZ', 'utf8');
    const missing = await store.save(input({ protocol: 'SBI-20261123-34679A', idempotencyKey: 'd'.repeat(64) }));
    assert.equal(missing.created, true);
    assert.equal(missing.lead.protocol, 'SBI-20261123-34679A');
    assert.equal((await readFile(pointer('d'.repeat(64)), 'utf8')).trim(), 'SBI-20261123-34679A');

    // Ponteiro de uma chave apontando para a cotacao de OUTRA chave: o conteudo alheio nao pode ser devolvido.
    await writeFile(pointer('e'.repeat(64)), first.lead.protocol, 'utf8');
    const crossed = await store.save(input({ protocol: 'SBI-20261123-CDEFGH', idempotencyKey: 'e'.repeat(64) }));
    assert.equal(crossed.created, true);
    assert.notEqual(crossed.lead.protocol, first.lead.protocol);
    assert.equal(crossed.lead.idempotencyKey, 'e'.repeat(64));
    assert.equal((await readFile(pointer('e'.repeat(64)), 'utf8')).trim(), 'SBI-20261123-CDEFGH');

    // Colisao de protocolo nao deixa ponteiro orfao: nada e gravado quando o protocolo ja existe.
    await assert.rejects(
      () => store.save(input({ protocol: first.lead.protocol, idempotencyKey: 'f'.repeat(64) })),
      /PROTOCOL_TAKEN/,
    );
    assert.equal((await readdir(join(dir, 'chaves'))).includes(`${'f'.repeat(64)}.txt`), false);
  });
});

test('[CT-COT-027] arquivo: identificador que escaparia do diretorio e recusado', async () => {
  await withTempDir(async dir => {
    const store = fileStore(dir);
    await assert.rejects(() => store.save(input({ protocol: '../fora' })), /Identificador invalido/);
    await assert.rejects(() => store.save(input({ idempotencyKey: '../../chave' })), /Identificador invalido/);
    await assert.rejects(() => store.get('..\\windows'), /Identificador invalido/);
  });
});

test('[CT-COT-028] http: duplicada pelo servico comercial nao vira cotacao nova', async () => {
  const calls: { url: string; headers: Record<string, string>; method: string }[] = [];
  const lead = { ...input(), state: 'novo', owner: null, backup: null, firstHumanReplyAt: null, nextStep: null, notification: { state: 'pendente', attempts: 0, lastError: null } };
  const store = httpStore({
    baseUrl: 'https://crm.example/api/',
    token: 'segredo',
    fetcher: (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), headers: init?.headers as Record<string, string>, method: init?.method ?? 'GET' });
      return new Response(JSON.stringify({ lead, duplicada: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch,
  });
  const result = await store.save(input());
  assert.equal(result.created, false);
  assert.equal(result.lead.protocol, input().protocol);
  assert.equal(calls[0]?.url, 'https://crm.example/api/cotacoes');
  assert.equal(calls[0]?.headers.Authorization, 'Bearer segredo');
  assert.equal(calls[0]?.headers['Idempotency-Key'], input().idempotencyKey);
});

test('[CT-COT-029] http: 404 e ausencia, erro do servico nao vira sucesso, resposta sem lead e recusada', async () => {
  const notFound = httpStore({
    baseUrl: 'https://crm.example', token: 't',
    fetcher: (async () => new Response(null, { status: 404 })) as typeof fetch,
  });
  assert.equal(await notFound.get('SBI-20261123-ACDEFG'), null);
  assert.equal(await notFound.update('SBI-20261123-ACDEFG', { state: 'descartado' }), null);

  const broken = httpStore({
    baseUrl: 'https://crm.example', token: 't',
    fetcher: (async () => new Response('{}', { status: 500 })) as typeof fetch,
  });
  await assert.rejects(() => broken.save(input()), LeadStoreError);

  const empty = httpStore({
    baseUrl: 'https://crm.example', token: 't',
    fetcher: (async () => new Response(JSON.stringify({ ok: true }), { status: 201 })) as typeof fetch,
  });
  await assert.rejects(() => empty.save(input()), /sem a cotação gravada/);
});

test('[CT-COT-030] producao sem configuracao fica desligada; desenvolvimento usa dados descartaveis', () => {
  assert.equal(quoteMode({ NODE_ENV: 'production' }), 'desligado');
  assert.equal(quoteMode({ NODE_ENV: 'development' }), 'arquivo');
  assert.equal(quoteMode({ SBI_COTACAO_MODO: 'MEMORIA' }), 'memoria');
  assert.equal(quoteMode({ SBI_COTACAO_MODO: 'inventado' }), 'desligado');

  const dev = resolveStore({ NODE_ENV: 'development' });
  assert.equal(dev.mode, 'arquivo');
  assert.equal(dev.store?.kind, 'arquivo');
  assert.ok(DEV_ROOT.includes('.sbi'), 'os dados de desenvolvimento ficam fora do Git');

  const off = resolveStore({ NODE_ENV: 'production' });
  assert.equal(off.store, null);
  assert.match(off.reason ?? '', /SBI_COTACAO_MODO/);

  // Modo http sem credencial completa nao sobe pela metade: desliga e explica.
  assert.equal(resolveStore({ SBI_COTACAO_MODO: 'http', SBI_COTACAO_URL: 'https://crm.example' }).store, null);
  assert.match(resolveStore({ SBI_COTACAO_MODO: 'http', SBI_COTACAO_URL: 'https://crm.example' }).reason ?? '', /TOKEN/);
  assert.equal(resolveStore({ SBI_COTACAO_MODO: 'http', SBI_COTACAO_URL: 'http://crm.example', SBI_COTACAO_TOKEN: 't' }).store, null);
  assert.equal(resolveStore({ SBI_COTACAO_MODO: 'http', SBI_COTACAO_URL: 'nao-url', SBI_COTACAO_TOKEN: 't' }).store, null);
  assert.equal(resolveStore({ SBI_COTACAO_MODO: 'http', SBI_COTACAO_URL: 'https://crm.example', SBI_COTACAO_TOKEN: 't' }).store?.kind, 'http');
  assert.equal(resolveStore({ SBI_COTACAO_MODO: 'http', SBI_COTACAO_URL: 'http://127.0.0.1:4000', SBI_COTACAO_TOKEN: 't' }).store?.kind, 'http');
  // Modo arquivo em producao exige diretorio declarado.
  assert.equal(resolveStore({ NODE_ENV: 'production', SBI_COTACAO_MODO: 'arquivo' }).store, null);
  assert.equal(resolveStore({ NODE_ENV: 'production', SBI_COTACAO_MODO: 'arquivo', SBI_COTACAO_DIR: '/var/sbi' }).store?.kind, 'arquivo');
});
