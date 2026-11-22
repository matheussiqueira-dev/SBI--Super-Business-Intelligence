// Escolha do adaptador da fila comercial a partir do ambiente, com uma instancia por processo.
//
// Em desenvolvimento e teste, sem nenhuma variavel, o modo e "arquivo" apontando para .sbi/cotacoes-dev (fora do
// Git e descartavel): o fluxo completo e verificavel na maquina, com dados que ninguem confunde com producao.
// Em producao, sem configuracao, o modo e "desligado": a pagina publica diz que a cotacao esta indisponivel e
// aponta o canal comercial real, em vez de devolver um protocolo que nao foi gravado em lugar nenhum.
import { join } from 'node:path';
import { fileStore } from './file-store.ts';
import { httpStore } from './http-store.ts';
import { memoryStore } from './memory-store.ts';
import type { LeadStore } from './store.ts';

export type QuoteMode = 'arquivo' | 'http' | 'memoria' | 'desligado';

const MODES: readonly QuoteMode[] = ['arquivo', 'http', 'memoria', 'desligado'];

export const DEV_ROOT = join('.sbi', 'cotacoes-dev');

export interface QuoteEnv {
  readonly SBI_COTACAO_MODO?: string;
  readonly SBI_COTACAO_DIR?: string;
  readonly SBI_COTACAO_URL?: string;
  readonly SBI_COTACAO_TOKEN?: string;
  readonly NODE_ENV?: string;
}

export function quoteMode(env: QuoteEnv = process.env as QuoteEnv): QuoteMode {
  const declared = (env.SBI_COTACAO_MODO ?? '').trim().toLowerCase();
  if (MODES.includes(declared as QuoteMode)) return declared as QuoteMode;
  if (declared) return 'desligado';
  return env.NODE_ENV === 'production' ? 'desligado' : 'arquivo';
}

export interface StoreResolution {
  readonly mode: QuoteMode;
  readonly store: LeadStore | null;
  /** Motivo para a tela quando nao ha onde gravar. */
  readonly reason: string | null;
}

export function resolveStore(env: QuoteEnv = process.env as QuoteEnv): StoreResolution {
  const mode = quoteMode(env);
  if (mode === 'desligado') return { mode, store: null, reason: 'SBI_COTACAO_MODO não configurado.' };
  if (mode === 'memoria') return { mode, store: memoryStore(), reason: null };
  if (mode === 'arquivo') {
    const dir = (env.SBI_COTACAO_DIR ?? '').trim() || (env.NODE_ENV === 'production' ? '' : DEV_ROOT);
    if (!dir) return { mode: 'desligado', store: null, reason: 'SBI_COTACAO_DIR não configurado para o modo arquivo.' };
    return { mode, store: fileStore(dir), reason: null };
  }
  const baseUrl = (env.SBI_COTACAO_URL ?? '').trim();
  const token = (env.SBI_COTACAO_TOKEN ?? '').trim();
  if (!baseUrl || !token) {
    return { mode: 'desligado', store: null, reason: 'SBI_COTACAO_URL e SBI_COTACAO_TOKEN são obrigatórios no modo http.' };
  }
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== 'https:' && url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
      return { mode: 'desligado', store: null, reason: 'SBI_COTACAO_URL precisa ser https fora da máquina local.' };
    }
  } catch {
    return { mode: 'desligado', store: null, reason: 'SBI_COTACAO_URL não é uma URL válida.' };
  }
  return { mode, store: httpStore({ baseUrl, token }), reason: null };
}

let cached: StoreResolution | null = null;

/** Instancia por processo; os testes passam o ambiente e nao usam o cache. */
export function leadStore(): StoreResolution {
  cached ??= resolveStore();
  return cached;
}

export function resetLeadStore(): void {
  cached = null;
}
