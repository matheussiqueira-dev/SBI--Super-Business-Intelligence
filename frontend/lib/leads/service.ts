// Regra de recebimento de uma cotacao, sem nada de Next: valida, limita volume, grava e devolve o protocolo.
// O handler da rota so traduz HTTP; o teste exercita este modulo direto.
import { businessDeadline, calendarFromEnv, RESPONSE_HOURS, type BusinessCalendar } from './calendar.ts';
import { CONFIRMATION, normalizeQuote, QuoteFormInput, quoteFieldErrors, type Lead, type QuoteFieldErrors } from './lead.ts';
import { clientKey, idempotencyKey, newProtocol } from './protocol.ts';
import { MIN_FILL_MS, type RateLimitResult } from './rate-limit.ts';
import type { LeadStore } from './store.ts';

export type QuoteFailure = 'validacao' | 'volume' | 'indisponivel' | 'falha';

export type QuoteOutcome =
  | { readonly ok: true; readonly lead: Lead; readonly duplicated: boolean; readonly message: string }
  | {
      readonly ok: false; readonly failure: QuoteFailure; readonly status: number; readonly message: string;
      readonly fieldErrors?: QuoteFieldErrors; readonly retryAfterSeconds?: number;
    };

export interface ReceiveOptions {
  readonly store: LeadStore | null;
  readonly storeReason?: string | null;
  readonly calendar?: BusinessCalendar;
  readonly now?: Date;
  readonly source?: string;
  /** Milissegundos entre abrir e enviar o formulario, enviados pela tela. */
  readonly elapsedMs?: number;
  /** Cabecalho Idempotency-Key, quando a tela repete um envio com a mesma chave. */
  readonly idempotencyHeader?: string | null;
  readonly rateLimit?: RateLimitResult;
}

export const MESSAGES = {
  validacao: 'Confira os campos destacados e envie novamente.',
  volume: 'Recebemos vários envios deste acesso. Tente novamente em alguns minutos.',
  indisponivel: 'A solicitação pela página está indisponível agora. Use o canal comercial indicado abaixo.',
  falha: 'Não foi possível registrar a solicitação agora. Seus dados continuam no formulário: tente enviar novamente.',
} as const;

/** Quantas vezes um protocolo e sorteado de novo quando o sorteio colide com um protocolo existente. */
const PROTOCOL_TRIES = 5;

export async function receiveQuote(raw: unknown, options: ReceiveOptions): Promise<QuoteOutcome> {
  if (options.rateLimit && !options.rateLimit.allowed) {
    return { ok: false, failure: 'volume', status: 429, message: MESSAGES.volume, retryAfterSeconds: options.rateLimit.retryAfterSeconds };
  }

  const parsed = QuoteFormInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, failure: 'validacao', status: 400, message: MESSAGES.validacao, fieldErrors: quoteFieldErrors(parsed.error) };
  }

  // Armadilha preenchida ou envio instantaneo: trata como automatizado. A resposta e a mesma de um campo invalido,
  // sem dizer qual barreira pegou, e nada e gravado.
  const trapped = (parsed.data.site ?? '').trim().length > 0;
  const tooFast = options.elapsedMs !== undefined && options.elapsedMs >= 0 && options.elapsedMs < MIN_FILL_MS;
  if (trapped || tooFast) {
    return { ok: false, failure: 'validacao', status: 400, message: MESSAGES.validacao, fieldErrors: {} };
  }

  if (!options.store) {
    return { ok: false, failure: 'indisponivel', status: 503, message: MESSAGES.indisponivel };
  }

  const calendar = options.calendar ?? calendarFromEnv();
  const now = options.now ?? new Date();
  const request = normalizeQuote(parsed.data);
  const due = businessDeadline(now, RESPONSE_HOURS, calendar);
  const key = clientKey(options.idempotencyHeader ?? null) ?? await idempotencyKey(request, now, calendar);

  for (let attempt = 1; attempt <= PROTOCOL_TRIES; attempt += 1) {
    const input = {
      protocol: newProtocol(now, calendar),
      idempotencyKey: key,
      request,
      source: options.source ?? 'site',
      receivedAt: now.toISOString(),
      dueAt: (due ?? now).toISOString(),
    };
    try {
      const { lead, created } = await options.store.save(input);
      return { ok: true, lead, duplicated: !created, message: CONFIRMATION(lead.protocol) };
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'PROTOCOL_TAKEN' && attempt < PROTOCOL_TRIES) continue;
      // Sem conteudo do formulario no log: so o tipo do erro e o modo do armazenamento.
      console.error(`[SBI][cotacao] gravação falhou · modo ${options.store.kind} · ${error instanceof Error ? error.name : 'erro'}`);
      return { ok: false, failure: 'falha', status: 502, message: MESSAGES.falha };
    }
  }
  return { ok: false, failure: 'falha', status: 502, message: MESSAGES.falha };
}
