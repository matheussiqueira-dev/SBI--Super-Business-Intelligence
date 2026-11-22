// Cliente HTTP unico do SBI (WP-3.3): mesma origem via /api/backend, cookie de sessao HttpOnly, CSRF em toda
// mutacao, Idempotency-Key na venda, ErrorResponse.code traduzido e respostas conferidas pelo Zod fora de producao.
import type { ZodType } from 'zod';
import { messageFor, NETWORK_MESSAGE } from './messages.ts';

export const API_PREFIX = '/api/backend';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly details: readonly string[];

  constructor(status: number, code: string | undefined, message: string, details: readonly string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Resposta que nao bate com o contrato (so verificado em desenvolvimento e teste). */
export class ContractError extends Error {
  constructor(path: string, issues: string) {
    super(`Resposta de ${path} fora do contrato: ${issues}`);
    this.name = 'ContractError';
  }
}

export type Fetcher = (input: string, init: RequestInit) => Promise<Response>;

export interface RequestOptions<T> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  idempotencyKey?: string;
  schema?: ZodType<T>;
}

interface CsrfToken { headerName: string; token: string }

export interface ClientConfig {
  fetcher?: Fetcher;
  /** Chamado em 401 fora do login; no navegador leva para /entrar?next=... (com o motivo quando a sessao foi encerrada). */
  onUnauthorized?: (code: string | undefined) => void;
  validate?: boolean;
}

function errorDetails(body: unknown): { code: string | undefined; details: string[] } {
  if (body && typeof body === 'object') {
    const record = body as { code?: unknown; details?: unknown };
    const code = typeof record.code === 'string' ? record.code : undefined;
    const details = Array.isArray(record.details) ? record.details.filter((d): d is string => typeof d === 'string') : [];
    return { code, details };
  }
  return { code: undefined, details: [] };
}

export function createClient({ fetcher = (input, init) => fetch(input, init), onUnauthorized, validate }: ClientConfig = {}) {
  const shouldValidate = validate ?? process.env.NODE_ENV !== 'production';
  let csrf: CsrfToken | null = null;

  async function raw(path: string, init: RequestInit): Promise<Response> {
    try {
      return await fetcher(`${API_PREFIX}${path}`, { credentials: 'same-origin', cache: 'no-store', ...init });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new ApiError(0, undefined, NETWORK_MESSAGE);
    }
  }

  async function refreshCsrf(signal?: AbortSignal): Promise<CsrfToken> {
    const response = await raw('/auth/csrf', { headers: { Accept: 'application/json' }, ...(signal ? { signal } : {}) });
    if (!response.ok) throw new ApiError(response.status, undefined, messageFor(undefined, response.status));
    csrf = (await response.json()) as CsrfToken;
    return csrf;
  }

  async function request<T = unknown>(path: string, options: RequestOptions<T> = {}): Promise<T> {
    const method = options.method ?? 'GET';
    const mutation = method !== 'GET';
    const send = async (token: CsrfToken | null) => {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (options.body !== undefined) headers['Content-Type'] = 'application/json';
      if (token) headers[token.headerName] = token.token;
      if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
      return raw(path, {
        method, headers, ...(options.signal ? { signal: options.signal } : {}),
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      });
    };
    let response = await send(mutation ? (csrf ?? await refreshCsrf(options.signal)) : null);
    let failure: unknown;
    if (mutation && response.status === 403) {
      // O token CSRF muda no login e no logout; uma nova tentativa com token fresco cobre a troca de sessao.
      // 403 de regra de negocio (DISCOUNT_ABOVE_LIMIT, PASSWORD_CHANGE_REQUIRED) nao se repete.
      failure = await response.json().catch(() => null);
      const code = errorDetails(failure).code;
      if (code === undefined || code === 'FORBIDDEN') {
        failure = undefined;
        response = await send(await refreshCsrf(options.signal));
      }
    }
    if (!response.ok) {
      const body: unknown = failure !== undefined ? failure : await response.json().catch(() => null);
      const { code, details } = errorDetails(body);
      // Senha atual errada na troca de senha tambem responde 401, mas a sessao continua valida.
      const wrongCurrentPassword = path === '/auth/password' && code === 'UNAUTHENTICATED';
      if (response.status === 401 && path !== '/auth/login' && !wrongCurrentPassword) onUnauthorized?.(code);
      throw new ApiError(response.status, code, messageFor(code, response.status), details);
    }
    if (response.status === 204) return null as T;
    const data: unknown = await response.json();
    if (options.schema && shouldValidate) {
      const parsed = options.schema.safeParse(data);
      if (!parsed.success) throw new ContractError(path, parsed.error.message);
      return parsed.data;
    }
    return data as T;
  }

  /**
   * Envia um arquivo em multipart (foto de produto). Mesmo tratamento de CSRF, erro e contrato do request; o
   * Content-Type nao e definido aqui de proposito, para o navegador escrever o boundary do multipart.
   */
  async function upload<T = unknown>(path: string, field: string, file: File, options: { schema?: ZodType<T>; signal?: AbortSignal } = {}): Promise<T> {
    const send = async (token: CsrfToken) => {
      const body = new FormData();
      body.append(field, file);
      return raw(path, {
        method: 'PUT',
        headers: { Accept: 'application/json', [token.headerName]: token.token },
        body,
        ...(options.signal ? { signal: options.signal } : {}),
      });
    };
    let response = await send(csrf ?? await refreshCsrf(options.signal));
    let failure: unknown;
    if (response.status === 403) {
      failure = await response.json().catch(() => null);
      const code = errorDetails(failure).code;
      if (code === undefined || code === 'FORBIDDEN') {
        failure = undefined;
        response = await send(await refreshCsrf(options.signal));
      }
    }
    if (!response.ok) {
      const body: unknown = failure !== undefined ? failure : await response.json().catch(() => null);
      const { code, details } = errorDetails(body);
      if (response.status === 401) onUnauthorized?.(code);
      // Regra de conteudo (formato, tamanho, dimensao) traz uma explicacao escrita para quem usa: essa passa adiante.
      const fromServer = typeof (body as { message?: unknown })?.message === 'string' ? (body as { message: string }).message : '';
      const useServerMessage = response.status === 400 && fromServer.length > 0 && fromServer.length <= 300;
      throw new ApiError(response.status, code, useServerMessage ? fromServer : messageFor(code, response.status), details);
    }
    const data: unknown = await response.json();
    if (options.schema && shouldValidate) {
      const parsed = options.schema.safeParse(data);
      if (!parsed.success) throw new ContractError(path, parsed.error.message);
      return parsed.data;
    }
    return data as T;
  }

  /**
   * Baixa um arquivo da API (exportacao). Passa pelo mesmo tratamento de erro do request: codigo do
   * contrato traduzido para pt-BR e 401 levando ao login. A tela nunca mostra a mensagem interna do
   * servidor nem o numero do status.
   */
  async function download(path: string): Promise<Blob> {
    const response = await raw(path, { method: 'GET' });
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      const { code, details } = errorDetails(body);
      if (response.status === 401) onUnauthorized?.(code);
      // 400 de regra (periodo invertido, janela longa demais, recorte grande demais para .xls) traz uma
      // explicacao util escrita para quem usa: essa passa adiante; as demais viram a mensagem do codigo.
      const fromServer = typeof (body as { message?: unknown })?.message === 'string'
        ? (body as { message: string }).message : '';
      const useServerMessage = response.status === 400 && fromServer.length > 0 && fromServer.length <= 300;
      throw new ApiError(response.status, code, useServerMessage ? fromServer : messageFor(code, response.status), details);
    }
    return response.blob();
  }

  return {
    request,
    upload,
    download,
    refreshCsrf,
    /** Depois de login e logout o token anterior deixa de valer. */
    resetCsrf: () => { csrf = null; },
  };
}

export type ApiClient = ReturnType<typeof createClient>;

function redirectToLogin(code: string | undefined) {
  if (typeof window === 'undefined') return;
  const next = window.location.pathname + window.location.search;
  const reason = code === 'SESSION_REVOKED' ? '&sessao=encerrada' : '';
  window.location.assign(`/entrar?next=${encodeURIComponent(next)}${reason}`);
}

/** Instancia do navegador. */
export const api = createClient({ onUnauthorized: redirectToLogin });
