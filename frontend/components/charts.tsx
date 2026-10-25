'use client';
// Graficos da identidade v2.0 (manual, secoes 29 e 29b). O SVG e redesenhado pela largura real do cartao, entao os rotulos
// ficam em 12 px no celular (achado 9 do diagnostico). Series na ordem fixa da paleta, a cor segue a entidade, eixo com
// divisoes redondas, grade de 1 px, meta tracejada em Tinta, legenda sempre e tabela equivalente em cada visualizacao.
import { useEffect, useId, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { niceScale } from '../lib/chart-scale.ts';
import { compactNumber, formatDate, money, plural } from '../lib/format.ts';
import TableWrap from './table-wrap.tsx';

/** Largura do conteiner em px (0 ate medir); ref de callback para medir tambem quando o grafico aparece depois. */
function useWidth(): [(node: HTMLDivElement | null) => void, number] {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!node) return;
    const update = () => setWidth(Math.floor(node.getBoundingClientRect().width));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return [setNode, width];
}

/** Caminho com quebra onde o valor e nulo: dia sem custo conhecido interrompe a linha, nunca vira zero. */
function path(points: Array<[number, number] | null>): string {
  let d = '';
  let open = false;
  for (const point of points) {
    if (!point) { open = false; continue; }
    d += `${open ? 'L' : 'M'}${point[0].toFixed(1)},${point[1].toFixed(1)}`;
    open = true;
  }
  return d;
}

/** Posicao da dica sem sair do grafico: centrada no ponto, encostada na borda perto das pontas. */
function tooltipStyle(x: number, width: number): { left: string; transform: string } {
  if (x < 90) return { left: `${Math.max(x - 8, 0)}px`, transform: 'none' };
  if (x > width - 90) return { left: `${Math.min(x + 8, width)}px`, transform: 'translateX(-100%)' };
  return { left: `${x}px`, transform: 'translateX(-50%)' };
}

export interface DailyPoint { date: string; net: number; profit: number | null }

const DAILY_SERIES = [
  { key: 'net', label: 'Faturamento confirmado', end: 'Faturamento', color: 'var(--sbi-data-1)' },
  { key: 'profit', label: 'Lucro bruto', end: 'Lucro', color: 'var(--sbi-data-2)' },
] as const;

/** Evolucao diaria: faturamento confirmado e lucro bruto, linhas de 2 px, ponto de 8 px com anel e dica por ponteiro ou teclado. */
export function RevenueChart({ data, label }: { data: readonly DailyPoint[]; label: string }) {
  const [box, width] = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const id = useId();
  if (data.length === 0) return <p className="empty">Sem vendas pagas no período.</p>;

  const narrow = width > 0 && width < 520;
  const H = narrow ? 200 : 240;
  const PAD = { top: 12, right: narrow ? 12 : 84, bottom: 28, left: 52 };
  const values = data.flatMap(d => [d.net, d.profit ?? 0]);
  const { min, max, ticks } = niceScale(Math.min(...values), Math.max(...values));
  const plotW = Math.max(width - PAD.left - PAD.right, 1);
  const plotH = H - PAD.top - PAD.bottom;
  const last = data.length - 1;
  const x = (i: number) => PAD.left + (last === 0 ? plotW / 2 : (i * plotW) / last);
  const y = (v: number) => PAD.top + plotH - ((v - min) / (max - min)) * plotH;
  const lines = {
    net: data.map((d, i) => [x(i), y(d.net)] as [number, number]),
    profit: data.map((d, i) => (d.profit === null ? null : [x(i), y(d.profit)] as [number, number])),
  };
  const xLabels = narrow ? [...new Set([0, last])] : [...new Set([0, Math.floor(last / 2), last])];

  function fromPointer(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const index = Math.round(((event.clientX - rect.left - PAD.left) / plotW) * last);
    setActive(Math.min(Math.max(index, 0), last));
  }
  function onKey(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key === 'ArrowRight') { event.preventDefault(); setActive(i => Math.min((i ?? -1) + 1, last)); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); setActive(i => Math.max((i ?? last + 1) - 1, 0)); }
    if (event.key === 'Home') { event.preventDefault(); setActive(0); }
    if (event.key === 'End') { event.preventDefault(); setActive(last); }
    if (event.key === 'Escape') setActive(null);
  }
  const point = active === null ? null : data[active];
  const lastNet = lines.net[last];
  const lastProfit = lines.profit[last];
  // Rotulos do fim das series nao se sobrepoem: com menos de 14 px entre eles, o de baixo desce.
  const labelY = { net: (lastNet?.[1] ?? 0) + 4, profit: (lastProfit?.[1] ?? 0) + 4 };
  if (lastNet && lastProfit && Math.abs(labelY.net - labelY.profit) < 14) {
    const top = Math.min(labelY.net, labelY.profit) - 7;
    if (labelY.net <= labelY.profit) { labelY.net = top; labelY.profit = top + 14; } else { labelY.profit = top; labelY.net = top + 14; }
  }

  return (
    <figure className="chart">
      <ul className="legend" aria-label="Legenda">
        {DAILY_SERIES.map(s => <li key={s.key}><span className="swatch swatch-line" style={{ background: s.color }} aria-hidden="true" />{s.label}</li>)}
      </ul>
      <div className="chart-box" ref={box} style={{ height: H }}>
        {width > 0 && <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" tabIndex={0} aria-describedby={`${id}-ajuda`}
             aria-label={`${label}: use as setas para percorrer os dias`}
             onPointerMove={fromPointer} onPointerLeave={() => setActive(null)} onKeyDown={onKey} onBlur={() => setActive(null)}>
          {ticks.map(t => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className={t === 0 ? 'axis' : 'grid'} />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="tick">{compactNumber(t)}</text>
            </g>
          ))}
          {xLabels.map(i => (
            <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'} className="tick">
              {formatDate(data[i]?.date ?? '').slice(0, 5)}</text>
          ))}
          <path d={path(lines.net)} className="series" stroke="var(--sbi-data-1)" />
          <path d={path(lines.profit)} className="series" stroke="var(--sbi-data-2)" />
          {!narrow && lastNet && <text x={lastNet[0] + 8} y={labelY.net} className="end-label">{DAILY_SERIES[0].end}</text>}
          {!narrow && lastProfit && <text x={lastProfit[0] + 8} y={labelY.profit} className="end-label">{DAILY_SERIES[1].end}</text>}
          {active !== null && point && <>
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} className="crosshair" />
            <circle cx={x(active)} cy={y(point.net)} r={4} fill="var(--sbi-data-1)" className="dot" />
            {point.profit !== null && <circle cx={x(active)} cy={y(point.profit)} r={4} fill="var(--sbi-data-2)" className="dot" />}
          </>}
        </svg>}
        {active !== null && point && (
          <div className="tooltip" role="status" style={tooltipStyle(x(active), width)}>
            <strong>{formatDate(point.date)}</strong>
            <span><strong className="num">{money(point.net)}</strong> faturamento</span>
            <span><strong className="num">{point.profit === null ? 'Não informado' : money(point.profit)}</strong> lucro{point.profit === null ? ' (falta custo)' : ''}</span>
          </div>
        )}
      </div>
      <p id={`${id}-ajuda`} className="sr-only">Os mesmos valores estão na tabela abaixo.</p>
      <details className="chart-table">
        <summary>Ver dados em tabela</summary>
        <TableWrap label={label}><table>
          <caption className="sr-only">{label}</caption>
          <thead><tr><th scope="col">Dia</th><th scope="col" className="right">Faturamento confirmado</th><th scope="col" className="right">Lucro bruto</th></tr></thead>
          <tbody>{data.map(d => (
            <tr key={d.date}><td className="num">{formatDate(d.date)}</td><td className="num right">{money(d.net)}</td>
              <td className="num right">{d.profit === null ? 'Não informado' : money(d.profit)}</td></tr>
          ))}</tbody>
        </table></TableWrap>
      </details>
    </figure>
  );
}

export interface ColumnDatum { label: string; value: number; goal?: number | null }

/** Valor logo acima da barra; se a meta tracejada passa ate 14 px acima do topo, o valor sobe para cima dela e nao se mistura. */
function valueLabelY(barTop: number, goalY: number | null): number {
  if (goalY !== null && goalY < barTop && barTop - goalY < 14) return goalY - 6;
  return barTop - 6;
}

/** Colunas com a meta do periodo (manual, figura 32): barras de ate 24 px com topo de 4 px, valor em cima e meta tracejada. */
export function ColumnChart({ data, label, valueLabel, goalLabel = 'Meta do período' }: {
  data: readonly ColumnDatum[]; label: string; valueLabel: string; goalLabel?: string;
}) {
  const [box, width] = useWidth();
  if (data.length === 0) return <p className="empty">Sem vendas pagas no mês.</p>;
  const hasGoal = data.some(d => (d.goal ?? 0) > 0);
  const H = 240;
  const PAD = { top: 20, right: 8, bottom: 28, left: 52 };
  const values = data.flatMap(d => [d.value, d.goal ?? 0]);
  const { min, max, ticks } = niceScale(Math.min(...values), Math.max(...values));
  const plotW = Math.max(width - PAD.left - PAD.right, 1);
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / data.length;
  const barW = Math.min(24, Math.max(slot * 0.45, 8));
  const cx = (i: number) => PAD.left + slot * i + slot / 2;
  const y = (v: number) => PAD.top + plotH - ((v - min) / (max - min)) * plotH;
  const zero = y(Math.max(min, 0));

  return (
    <figure className="chart">
      <ul className="legend" aria-label="Legenda">
        <li><span className="swatch" style={{ background: 'var(--sbi-data-1)' }} aria-hidden="true" />{valueLabel}</li>
        {hasGoal && <li><span className="swatch swatch-goal" aria-hidden="true" />{goalLabel}</li>}
      </ul>
      <div className="chart-box" ref={box} style={{ height: H }}>
        {width > 0 && <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label={`${label}. Os valores estão na tabela abaixo.`}>
          {ticks.map(t => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className={t === 0 ? 'axis' : 'grid'} />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="tick">{compactNumber(t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const top = y(Math.max(d.value, 0));
            const height = Math.max(zero - top, d.value > 0 ? 1 : 0);
            const r = Math.min(4, height);
            const left = cx(i) - barW / 2;
            return (
              <g key={d.label}>
                {height > 0 && <path className="bar" fill="var(--sbi-data-1)"
                  d={`M${left},${zero}V${top + r}Q${left},${top} ${left + r},${top}H${left + barW - r}Q${left + barW},${top} ${left + barW},${top + r}V${zero}Z`} />}
                {(d.goal ?? 0) > 0 && <line className="goal" x1={cx(i) - barW / 2 - 8} x2={cx(i) + barW / 2 + 8} y1={y(d.goal ?? 0)} y2={y(d.goal ?? 0)} />}
                {slot >= 44 && <text x={cx(i)} y={valueLabelY(top, (d.goal ?? 0) > 0 ? y(d.goal ?? 0) : null)} textAnchor="middle" className="value-label">{compactNumber(d.value)}</text>}
                <text x={cx(i)} y={H - 8} textAnchor="middle" className="tick">{d.label}</text>
              </g>
            );
          })}
        </svg>}
      </div>
      <details className="chart-table">
        <summary>Ver dados em tabela</summary>
        <TableWrap label={label}><table>
          <caption className="sr-only">{label}</caption>
          <thead><tr><th scope="col">Período</th><th scope="col" className="right">{valueLabel}</th>{hasGoal && <th scope="col" className="right">{goalLabel}</th>}</tr></thead>
          <tbody>{data.map(d => (
            <tr key={d.label}><td>{d.label}</td><td className="num right">{money(d.value)}</td>
              {hasGoal && <td className="num right">{(d.goal ?? 0) > 0 ? money(d.goal ?? 0) : 'Sem meta'}</td>}</tr>
          ))}</tbody>
        </table></TableWrap>
      </details>
    </figure>
  );
}

export interface ShareItem { key: string; label: string; value: number; orders?: number }

/** Composicao em barra 100% (ate 6 partes): a cor vem do mapa da entidade, nunca da posicao; legenda com valor e percentual. */
export function StackedBar({ items, colors, label }: { items: readonly ShareItem[]; colors: Readonly<Record<string, string>>; label: string }) {
  const total = items.reduce((sum, item) => sum + Math.max(item.value, 0), 0);
  if (items.length === 0 || total === 0) return <p className="empty">Sem vendas pagas no período.</p>;
  const share = (value: number) => (Math.max(value, 0) / total) * 100;
  return (
    <figure className="chart" aria-label={label}>
      <div className="stacked" aria-hidden="true">
        {items.map(item => <span key={item.key} style={{ width: `${share(item.value).toFixed(2)}%`, background: colors[item.key] ?? 'var(--sbi-data-8)' }} />)}
      </div>
      <ul className="stacked-legend">
        {items.map(item => (
          <li key={item.key}>
            <span className="swatch" style={{ background: colors[item.key] ?? 'var(--sbi-data-8)' }} aria-hidden="true" />
            <span><strong>{item.label}</strong>{item.orders !== undefined ? ` · ${plural(item.orders, 'pedido')}` : ''}</span>
            <span className="num">{money(item.value)} · {share(item.value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export interface RankItem { key: string | number; label: string; value: number; detail?: string }

/** Quem vende mais: barras horizontais ordenadas da maior para a menor, uma cor so (uma medida) e o valor escrito ao lado. */
export function RankingBars({ items, label }: { items: readonly RankItem[]; label: string }) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const top = Math.max(...sorted.map(item => item.value), 0);
  if (sorted.length === 0 || top <= 0) return <p className="empty">Sem vendas pagas no período.</p>;
  return (
    <ol className="share" aria-label={label}>
      {sorted.map(item => (
        <li key={item.key}>
          <span className="share-label">{item.label}</span>
          <span className="share-value"><strong className="num">{money(item.value)}</strong>{item.detail ? ` · ${item.detail}` : ''}</span>
          <span className="share-track" aria-hidden="true"><span className="share-bar" style={{ width: `${((Math.max(item.value, 0) / top) * 100).toFixed(1)}%` }} /></span>
        </li>
      ))}
    </ol>
  );
}
