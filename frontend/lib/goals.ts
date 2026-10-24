// Planejamento de metas do CEO (RF-29): contas em centavos para a distribuicao fechar exatamente com a meta da loja,
// como o servidor exige (GoalsService e o gatilho adiado da V5).

const cents = (value: number) => Math.round(value * 100);

/** Soma exata em reais (via centavos). */
export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + cents(value), 0) / 100;
}

/** Divide o total em partes iguais de centavos; a sobra do arredondamento vai para as primeiras partes. */
export function splitEvenly(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const all = cents(total);
  const base = Math.floor(all / parts);
  const rest = all - base * parts;
  return Array.from({ length: parts }, (_, index) => (base + (index < rest ? 1 : 0)) / 100);
}

/** A distribuicao fecha com a meta da loja (ou nao ha distribuicao: meta so da loja). */
export function distributionMatches(store: number, sellers: readonly number[]): boolean {
  return sellers.length === 0 || cents(sum(sellers)) === cents(store);
}

/** Meta anual coberta pelas metas mensais ja definidas, em %. */
export function planCoverage(annual: number | null, planned: number): number | null {
  return annual === null || annual <= 0 ? null : (planned * 100) / annual;
}
