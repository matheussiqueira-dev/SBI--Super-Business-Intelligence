// Adaptador HTTP da fila comercial: grava no servico comercial/CRM configurado pela operacao, que passa a ser a
// interface de atendimento (consultar leads, atribuir responsavel e suplente, registrar a primeira resposta humana).
//
// Contrato esperado do servico, em docs/05-operacao/cotacao-e-fila.md:
//   POST   {base}/cotacoes             corpo SaveInput        -> 201 { lead } | 200 { lead, duplicada: true }
//   GET    {base}/cotacoes?estado=&limite=                    -> 200 { leads: Lead[] }
//   GET    {base}/cotacoes/{protocolo}                        -> 200 { lead } | 404
//   PATCH  {base}/cotacoes/{protocolo} corpo LeadPatch        -> 200 { lead } | 404
//
// O token vai no cabecalho Authorization e nunca e registrado em log. O corpo da solicitacao sai desta aplicacao
// so para este destino configurado.
import type { Lead, LeadState } from './lead.ts';
import type { LeadPatch, LeadStore, SaveInput, SaveResult } from './store.ts';

export interface HttpStoreConfig {
  readonly baseUrl: string;
  readonly token: string;
  readonly timeoutMs?: number;
  readonly fetcher?: typeof fetch;
}

export class LeadStoreError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'LeadStoreError';
    this.status = status;
  }
}

function leadOf(body: unknown): Lead {
  const lead = (body as { lead?: unknown } | null)?.lead;
  if (!lead || typeof lead !== 'object' || typeof (lead as Lead).protocol !== 'string') {
    throw new LeadStoreError(502, 'Resposta do serviço comercial sem a cotação gravada.');
  }
  return lead as Lead;
}

export function httpStore({ baseUrl, token, timeoutMs = 8_000, fetcher = fetch }: HttpStoreConfig): LeadStore {
  const base = baseUrl.replace(/\/+$/, '');

  async function call(path: string, init: RequestInit): Promise<{ status: number; body: unknown }> {
    const response = await fetcher(`${base}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json', Authorization: `Bearer ${token}`,
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 404) return { status: 404, body: null };
    const body: unknown = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new LeadStoreError(response.status, 'Serviço comercial recusou a gravação.');
    return { status: response.status, body };
  }

  return {
    kind: 'http',
    async save(input: SaveInput): Promise<SaveResult> {
      const { status, body } = await call('/cotacoes', {
        method: 'POST',
        body: JSON.stringify(input),
        headers: { 'Idempotency-Key': input.idempotencyKey },
      });
      const duplicated = status === 200 || (body as { duplicada?: unknown } | null)?.duplicada === true;
      return { lead: leadOf(body), created: !duplicated };
    },
    async get(protocol: string): Promise<Lead | null> {
      const { status, body } = await call(`/cotacoes/${encodeURIComponent(protocol)}`, { method: 'GET' });
      return status === 404 ? null : leadOf(body);
    },
    async list(options: { state?: LeadState; limit?: number } = {}): Promise<Lead[]> {
      const query = new URLSearchParams();
      if (options.state) query.set('estado', options.state);
      if (options.limit) query.set('limite', String(options.limit));
      const { body } = await call(`/cotacoes${query.size > 0 ? `?${query}` : ''}`, { method: 'GET' });
      const leads = (body as { leads?: unknown } | null)?.leads;
      return Array.isArray(leads) ? (leads as Lead[]) : [];
    },
    async update(protocol: string, patch: LeadPatch): Promise<Lead | null> {
      const { status, body } = await call(`/cotacoes/${encodeURIComponent(protocol)}`, {
        method: 'PATCH', body: JSON.stringify(patch),
      });
      return status === 404 ? null : leadOf(body);
    },
  };
}
