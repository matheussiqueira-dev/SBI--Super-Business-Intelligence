// Recebimento da cotacao, de mesma origem (plano comercial, secoes 06 e 11).
//
// Independente do PDV: nao chama a API Java, nao le o cookie de sessao e grava num armazenamento proprio. A venda
// ou o login fora do ar nao impedem a captacao.
//
// O protocolo so e devolvido depois da gravacao confirmada. A confirmacao por e-mail sai depois da resposta,
// com after(), e a falha dela nunca apaga a cotacao gravada.
import { after } from 'next/server';
import { EDITION } from '../../../lib/edition.ts';
import { notifyLead } from '../../../lib/leads/notify.ts';
import { isSameOrigin } from '../../../lib/leads/origin.ts';
import { clientKeyFor, limiter } from '../../../lib/leads/rate-limit.ts';
import { leadStore } from '../../../lib/leads/runtime.ts';
import { receiveQuote } from '../../../lib/leads/service.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } as const;

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } });
}

/** Corpo aceito: JSON ou o formulario nativo, para o envio funcionar antes de o JavaScript da pagina carregar. */
async function readBody(request: Request): Promise<unknown> {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/json')) return request.json();
  if (type.includes('form')) return Object.fromEntries(await request.formData());
  return null;
}

export async function POST(request: Request): Promise<Response> {
  // Mesma origem: o formulario publico e servido pelo proprio site (lib/leads/origin.ts explica a regra).
  if (!isSameOrigin(request.headers)) {
    return json({ erro: 'origem', mensagem: 'Origem não permitida.' }, 403);
  }

  const body = await readBody(request).catch(() => null);
  if (body === null || typeof body !== 'object') {
    return json({ erro: 'validacao', mensagem: 'Envie os campos do formulário.' }, 400);
  }

  const payload = body as Record<string, unknown>;
  const elapsed = Number(payload.elapsedMs);
  const { store, reason } = leadStore();
  const outcome = await receiveQuote(payload, {
    store,
    storeReason: reason,
    source: typeof payload.source === 'string' && payload.source.length <= 40 ? payload.source : `site:${EDITION}`,
    elapsedMs: Number.isFinite(elapsed) ? elapsed : undefined,
    idempotencyHeader: request.headers.get('idempotency-key'),
    rateLimit: limiter.check(clientKeyFor(request.headers)),
  });

  if (!outcome.ok) {
    const headers: Record<string, string> = outcome.retryAfterSeconds
      ? { 'Retry-After': String(outcome.retryAfterSeconds) } : {};
    return json({ erro: outcome.failure, mensagem: outcome.message, campos: outcome.fieldErrors ?? {} }, outcome.status, headers);
  }

  // Uma cotacao recuperada por idempotencia nao dispara outra confirmacao.
  if (!outcome.duplicated && store) {
    const lead = outcome.lead;
    after(async () => {
      const result = await notifyLead(lead);
      await store.update(lead.protocol, { notification: result }).catch(() => null);
    });
  }

  return json({
    protocolo: outcome.lead.protocol,
    mensagem: outcome.message,
    venceEm: outcome.lead.dueAt,
    duplicada: outcome.duplicated,
  }, outcome.duplicated ? 200 : 201);
}

/** Qualquer outro metodo: 405 com Allow, para o cliente nao insistir. */
export async function GET(): Promise<Response> {
  return json({ erro: 'metodo', mensagem: 'Use POST para enviar uma solicitação.' }, 405, { Allow: 'POST' });
}
