// Limitacao de volume e protecao antispam do formulario publico (plano comercial, secao 06).
//
// Tres barreiras baratas, nenhuma depende de servico externo:
//   1. janela deslizante por origem (IP), contada neste processo;
//   2. campo armadilha vazio (lead.ts, campo "site");
//   3. tempo minimo entre abrir e enviar o formulario.
//
// A contagem e por instancia: com mais de uma instancia, o limite efetivo e o limite x instancias. Para um teto
// global vale o limite do provedor/WAF na borda, registrado em docs/05-operacao/cotacao-e-fila.md.

export interface RateLimitConfig {
  readonly limit: number;
  readonly windowMs: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = { limit: 5, windowMs: 10 * 60_000 };

/** Tempo minimo entre a abertura e o envio do formulario: abaixo disso o envio e tratado como automatizado. */
export const MIN_FILL_MS = 1_200;

export interface RateLimitResult {
  readonly allowed: boolean;
  /** Segundos sugeridos no cabecalho Retry-After quando bloqueado. */
  readonly retryAfterSeconds: number;
}

export function createRateLimiter(config: RateLimitConfig = DEFAULT_RATE_LIMIT) {
  const hits = new Map<string, number[]>();
  return {
    check(key: string, now: number = Date.now()): RateLimitResult {
      const window = now - config.windowMs;
      const recent = (hits.get(key) ?? []).filter(time => time > window);
      if (recent.length >= config.limit) {
        const oldest = recent[0] ?? now;
        hits.set(key, recent);
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((oldest + config.windowMs - now) / 1000)) };
      }
      recent.push(now);
      hits.set(key, recent);
      // Memoria limitada: sem a limpeza, uma rajada de origens diferentes cresceria sem fim no processo.
      if (hits.size > 5_000) {
        for (const [entry, times] of hits) if (times.every(time => time <= window)) hits.delete(entry);
      }
      return { allowed: true, retryAfterSeconds: 0 };
    },
    reset(): void {
      hits.clear();
    },
  };
}

/**
 * Origem da requisicao para a contagem. Atras de proxy confiavel (Vercel, CDN) o primeiro endereco de
 * x-forwarded-for e o do cliente; sem cabecalho, cai em "sem-origem" e todas as requisicoes dividem a janela.
 */
export function clientKeyFor(headers: Headers): string {
  const forwarded = (headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim();
  return forwarded || headers.get('x-real-ip')?.trim() || 'sem-origem';
}

export const limiter = createRateLimiter();
