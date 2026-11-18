// Sorteio deterministico da base sintetica da demonstracao: a mesma semente sempre produz a mesma loja, entao a
// apresentacao e os testes reproduzem exatamente os mesmos numeros (secao 4.1 do plano de evolucao).

/** Gerador congruente de 32 bits (mulberry32): rapido, sem dependencia e com periodo suficiente para a massa. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Semente estavel a partir de um texto (FNV-1a), para derivar um fluxo por mes ou por vendedor. */
export function seedFrom(text: string, base = 0): number {
  let hash = (2166136261 ^ base) >>> 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash ^ text.charCodeAt(i)) >>> 0;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

export type Random = () => number;

/** Inteiro em [min, max]. */
export function int(rng: Random, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Real em [min, max). */
export function real(rng: Random, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function pick<T>(rng: Random, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick: lista vazia');
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))]!;
}

/** Sorteio com peso (peso <= 0 nunca sai); usado no mix de categorias e no giro dos produtos. */
export function weighted<T>(rng: Random, items: readonly T[], weight: (item: T) => number): T {
  const total = items.reduce((sum, item) => sum + Math.max(0, weight(item)), 0);
  if (total <= 0) return pick(rng, items);
  let draw = rng() * total;
  for (const item of items) {
    draw -= Math.max(0, weight(item));
    if (draw <= 0) return item;
  }
  return items[items.length - 1]!;
}

/** Acontece com probabilidade p (0 a 1). */
export function chance(rng: Random, p: number): boolean {
  return rng() < p;
}

/**
 * Reparte um total inteiro (centavos, pedidos, visitantes) entre pesos, pelo metodo do maior resto: a soma das partes
 * e sempre exatamente o total, sem centavo perdido no arredondamento.
 */
export function shareOut(total: number, weights: readonly number[]): number[] {
  const positive = weights.map(w => Math.max(0, w));
  const sum = positive.reduce((acc, w) => acc + w, 0);
  if (weights.length === 0) return [];
  if (sum <= 0) {
    // Sem peso nenhum: divide igualmente e sobra para os primeiros.
    const base = Math.floor(total / weights.length);
    const rest = total - base * weights.length;
    return weights.map((_, index) => base + (index < rest ? 1 : 0));
  }
  const exact = positive.map(w => (total * w) / sum);
  const parts = exact.map(Math.floor);
  let left = total - parts.reduce((acc, part) => acc + part, 0);
  const order = exact.map((value, index) => ({ index, rest: value - Math.floor(value) }))
    .sort((a, b) => b.rest - a.rest || a.index - b.index);
  for (const { index } of order) {
    if (left <= 0) break;
    parts[index] = (parts[index] ?? 0) + 1;
    left--;
  }
  return parts;
}
