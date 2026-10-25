/** Escala do eixo de valor com divisoes redondas (identidade v2.0): passo de 1, 2 ou 5 x 10^n e cerca de quatro intervalos,
 *  para o eixo mostrar 0, 20 mil, 40 mil e 60 mil, nunca quartos como 6.250. O zero sempre entra na escala. */
export function niceScale(minValue: number, maxValue: number, intervals = 4): { min: number; max: number; step: number; ticks: number[] } {
  const lo = Math.min(0, minValue);
  const hi = Math.max(0, maxValue);
  const raw = (hi - lo || 1) / intervals;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map(factor => factor * power).find(candidate => candidate >= raw) ?? 10 * power;
  const min = Math.floor(lo / step) * step;
  const max = Math.max(Math.ceil(hi / step) * step, min + step);
  const ticks: number[] = [];
  // toPrecision evita residuos de ponto flutuante em passos decimais (0,2 + 0,4 = 0,6000000000000001).
  for (let i = 0; min + i * step <= max + step / 2; i++) ticks.push(Number((min + i * step).toPrecision(12)));
  return { min, max, step, ticks };
}
