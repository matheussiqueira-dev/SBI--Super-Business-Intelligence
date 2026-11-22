// Confirmacao e aviso da fila, fora da requisicao (plano comercial, secao 06).
//
// Regras que o plano cobra e que este modulo cumpre:
//   - a cotacao gravada continua visivel mesmo se a notificacao falhar: o envio nunca desfaz a gravacao;
//   - nova tentativa com espera crescente e, no fim, alerta de falha com o protocolo (nunca o conteudo);
//   - em desenvolvimento, nada sai da maquina: a mensagem vai para uma caixa de saida local descartavel;
//   - a confirmacao automatica e a primeira resposta humana sao eventos distintos -- este modulo so faz a primeira.
//
// O conteudo do formulario nao entra em log nem em analytics. A mensagem leva o minimo para a triagem.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Lead, NotificationState } from './lead.ts';

export interface NotifyEnv {
  readonly SBI_COTACAO_NOTIFICACAO_URL?: string;
  readonly SBI_COTACAO_NOTIFICACAO_TOKEN?: string;
  readonly SBI_COTACAO_CAIXA_SAIDA?: string;
  readonly NODE_ENV?: string;
}

export const DEV_OUTBOX = join('.sbi', 'cotacoes-dev', 'caixa-saida');

export type NotifyTarget =
  | { readonly kind: 'http'; readonly url: string; readonly token: string }
  | { readonly kind: 'caixa'; readonly dir: string }
  | { readonly kind: 'desligada'; readonly reason: string };

export function notifyTarget(env: NotifyEnv = process.env as NotifyEnv): NotifyTarget {
  const url = (env.SBI_COTACAO_NOTIFICACAO_URL ?? '').trim();
  const token = (env.SBI_COTACAO_NOTIFICACAO_TOKEN ?? '').trim();
  if (url && token) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' || parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') {
        return { kind: 'http', url, token };
      }
    } catch {
      // cai nos proximos casos
    }
    return { kind: 'desligada', reason: 'SBI_COTACAO_NOTIFICACAO_URL inválida.' };
  }
  const outbox = (env.SBI_COTACAO_CAIXA_SAIDA ?? '').trim() || (env.NODE_ENV === 'production' ? '' : DEV_OUTBOX);
  if (outbox) return { kind: 'caixa', dir: outbox };
  return { kind: 'desligada', reason: 'Nenhum provedor de notificação configurado.' };
}

/** Carga da notificacao: o que a fila precisa para triar, sem repetir a mensagem livre do formulario. */
export function notificationPayload(lead: Lead): Record<string, unknown> {
  return {
    protocolo: lead.protocol,
    recebidaEm: lead.receivedAt,
    venceEm: lead.dueAt,
    origem: lead.source,
    contato: { nome: lead.request.name, email: lead.request.email, whatsapp: lead.request.whatsapp || null },
    loja: { empresa: lead.request.company, cidade: lead.request.city, uf: lead.request.uf, segmento: lead.request.segment || null },
    temMensagem: lead.request.message.length > 0,
  };
}

export interface NotifyOutcome {
  readonly state: NotificationState;
  readonly attempts: number;
  readonly lastError: string | null;
}

const ATTEMPTS = 3;
const BACKOFF_MS = [500, 2_000];

async function post(target: Extract<NotifyTarget, { kind: 'http' }>, lead: Lead, fetcher: typeof fetch): Promise<void> {
  const response = await fetcher(target.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', Accept: 'application/json',
      Authorization: `Bearer ${target.token}`, 'Idempotency-Key': lead.idempotencyKey,
    },
    body: JSON.stringify(notificationPayload(lead)),
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}

export interface NotifyOptions {
  readonly target?: NotifyTarget;
  readonly fetcher?: typeof fetch;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly onAlert?: (message: string) => void;
}

/**
 * Entrega a confirmacao com novas tentativas. Nunca lanca: o retorno descreve o resultado e o chamador grava o
 * estado na cotacao. A falha final emite alerta identificado pelo protocolo.
 */
export async function notifyLead(lead: Lead, options: NotifyOptions = {}): Promise<NotifyOutcome> {
  const target = options.target ?? notifyTarget();
  const fetcher = options.fetcher ?? fetch;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>(resolve => { setTimeout(resolve, ms); }));
  const alert = options.onAlert ?? ((message: string) => { console.error(message); });

  if (target.kind === 'desligada') return { state: 'desligada', attempts: 0, lastError: target.reason };

  let lastError = '';
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      if (target.kind === 'caixa') {
        await mkdir(target.dir, { recursive: true });
        await writeFile(join(target.dir, `${lead.protocol}.json`), JSON.stringify(notificationPayload(lead), null, 2), 'utf8');
      } else {
        await post(target, lead, fetcher);
      }
      return { state: 'enviada', attempts: attempt, lastError: null };
    } catch (error) {
      lastError = error instanceof Error ? `${error.name}: ${error.message}` : 'erro desconhecido';
      if (attempt < ATTEMPTS) await sleep(BACKOFF_MS[attempt - 1] ?? 2_000);
    }
  }
  alert(`[SBI][cotacao] confirmacao nao enviada apos ${ATTEMPTS} tentativas · protocolo ${lead.protocol} · ${lastError}`);
  return { state: 'falhou', attempts: ATTEMPTS, lastError };
}
