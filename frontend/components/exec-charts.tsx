'use client';
// Graficos interativos do painel executivo (RF-28) nas regras de dados do manual v2.0: barra em Petroleo (data-1), meta
// tracejada em Tinta (chart-goal) e o ano anterior como marca vazada (chart-compare). Cada coluna e cada barra e um botao:
// clicar filtra o painel inteiro (filtro cruzado) e o item escolhido fica destacado; os demais ficam mais claros, sem
// perder o contraste de 3:1. Teclado: uma parada de Tab por grafico, setas, Home e End percorrem, Enter ou Espaco
// escolhe. Os mesmos valores ficam numa tabela em "Ver dados em tabela".
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { formatPercent, money } from '../lib/format.ts';
import type { GoalStatus } from '../lib/executive.ts';
import { Icon } from './brand/icons.tsx';
import { Meter } from './meter.tsx';

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (step * exp >= value) return step * exp;
  return 10 * exp;
}

const pct = (value: number, max: number) => `${Math.max(0, Math.min(100, (value / max) * 100)).toFixed(2)}%`;
/** Eixo em reais sem o simbolo ("240 mil"), para caber na coluna estreita; dica e tabela trazem o valor completo. */
const axisNumber = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

/** Navegacao por setas com uma unica parada de Tab (roving tabindex). */
function useRoving(count: number) {
  const [focus, setFocus] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const moves: Record<string, number> = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: count - 1 };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const next = Math.max(0, Math.min(count - 1, target));
    setFocus(next);
    refs.current[next]?.focus();
  }
  return { focus: Math.min(focus, Math.max(count - 1, 0)), setFocus, refs, onKeyDown };
}

// ---------------- variacao ----------------

/** Variacao com seta e texto (a cor nunca e a unica pista): verde para cima, vermelho para baixo. */
export function Delta({ value, label }: { value: number | null; label: string }) {
  if (value === null || !Number.isFinite(value)) return <span className="delta">sem base em {label}</span>;
  const up = value >= 0;
  // Base muito pequena: "198,4 vezes" le melhor do que "19.741,1% acima".
  const text = value >= 900 ? `${(value / 100 + 1).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} vezes o de ${label}`
    : `${formatPercent(Math.abs(value))} ${up ? 'acima' : 'abaixo'} de ${label}`;
  return (
    <span className={`delta ${up ? 'delta-up' : 'delta-down'}`}>
      <Icon name={up ? 'seta-cima' : 'seta-baixo'} size={16} />{text}
    </span>
  );
}

// ---------------- colunas (tempo) ----------------

export interface Column { key: number; label: string; name: string; value: number; goal?: number | null; compare?: number | null; note?: string }

export function ColumnChart({ title, columns, selected, onSelect, valueLabel, compareLabel, help, sparseLabels = false }: {
  title: string; columns: readonly Column[]; selected: number | null; onSelect?: (key: number) => void; valueLabel: string;
  compareLabel?: string; help?: string; sparseLabels?: boolean;
}) {
  const id = useId();
  const roving = useRoving(columns.length);
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(1, ...columns.flatMap(c => [c.value, c.goal ?? 0, c.compare ?? 0])));
  const ticks = [1, 0.75, 0.5, 0.25, 0];
  const hasGoal = columns.some(c => (c.goal ?? 0) > 0);
  const hasCompare = columns.some(c => c.compare !== null && c.compare !== undefined);
  const active = hover ?? (selected === null ? null : columns.findIndex(c => c.key === selected));
  const tip = active !== null && active >= 0 ? columns[active] : undefined;
  const describe = (c: Column) => [`${c.name}: ${valueLabel} ${money(c.value)}`,
    c.goal ? `meta ${money(c.goal)}` : null, hasCompare && c.compare !== null && c.compare !== undefined ? `${compareLabel} ${money(c.compare)}` : null,
    c.note ?? null].filter(Boolean).join('; ');

  return (
    <figure className="chart" aria-labelledby={`${id}-title`}>
      <figcaption className="chart-head">
        <span id={`${id}-title`} className="label">{title}</span>
        <ul className="legend" aria-label="Legenda">
          <li><span className="swatch" style={{ background: 'var(--sbi-data-1)' }} aria-hidden="true" />{valueLabel}</li>
          {hasGoal && <li><span className="swatch swatch-goal" aria-hidden="true" />Meta</li>}
          {hasCompare && <li><span className="swatch swatch-compare" aria-hidden="true" />{compareLabel}</li>}
        </ul>
      </figcaption>
      {help && <p className="caption">{help}</p>}
      <div className="colchart" data-selected={selected !== null}>
        <div className="colchart-axis" aria-hidden="true">
          {ticks.map(t => <span key={t} style={{ bottom: `${t * 100}%` }}>{axisNumber.format(max * t)}</span>)}
        </div>
        <div className="colchart-plot">
          {ticks.map(t => <span key={t} className="colchart-grid" style={{ bottom: `${t * 100}%` }} aria-hidden="true" />)}
          <div className="colchart-bars" role="group" aria-label={`${title}. Use as setas para percorrer e Enter para filtrar.`}
               onPointerLeave={() => setHover(null)}>
            {columns.map((c, index) => {
              const isSelected = selected === c.key;
              const content = <>
                <span className="colchart-fill" style={{ height: pct(c.value, max) }} />
                {(c.goal ?? 0) > 0 && <span className="colchart-goal" style={{ bottom: pct(c.goal ?? 0, max) }} />}
                {c.compare !== null && c.compare !== undefined && <span className="colchart-compare" style={{ bottom: pct(c.compare, max) }} />}
              </>;
              return (
                <div key={c.key} className="colchart-col">
                  {onSelect
                    ? <button type="button" className="colchart-bar" aria-pressed={isSelected} aria-label={describe(c)}
                              ref={node => { roving.refs.current[index] = node; }} tabIndex={index === roving.focus ? 0 : -1}
                              onClick={() => onSelect(c.key)} onKeyDown={event => roving.onKeyDown(event, index)}
                              onFocus={() => { roving.setFocus(index); setHover(index); }} onBlur={() => setHover(null)}
                              onPointerEnter={() => setHover(index)}>{content}</button>
                    : <span className="colchart-bar" role="img" aria-label={describe(c)} onPointerEnter={() => setHover(index)}>{content}</span>}
                  <span className={`colchart-label${sparseLabels && index % 5 !== 0 && index !== columns.length - 1 ? ' colchart-label-minor' : ''}`}
                        aria-hidden="true">{c.label}</span>
                </div>
              );
            })}
          </div>
          {tip && (
            <div className="tooltip colchart-tip" role="status"
                 style={{ left: `${((columns.indexOf(tip) + 0.5) / columns.length) * 100}%` }}>
              <strong>{tip.name}</strong>
              <span><strong className="num">{money(tip.value)}</strong> {valueLabel.toLowerCase()}</span>
              {(tip.goal ?? 0) > 0 && <span>Meta <span className="num">{money(tip.goal)}</span> ({formatPercent((tip.value * 100) / (tip.goal ?? 1))})</span>}
              {hasCompare && tip.compare !== null && tip.compare !== undefined && <span>{compareLabel} <span className="num">{money(tip.compare)}</span></span>}
              {tip.note && <span>{tip.note}</span>}
            </div>
          )}
        </div>
      </div>
      <details className="chart-table">
        <summary>Ver dados em tabela</summary>
        <div className="table-wrap" tabIndex={0} role="group" aria-label={`${title} em tabela`}><table>
          <caption className="sr-only">{title}</caption>
          <thead><tr><th scope="col">Período</th><th scope="col" className="right">{valueLabel}</th>
            {hasGoal && <th scope="col" className="right">Meta</th>}{hasCompare && <th scope="col" className="right">{compareLabel}</th>}</tr></thead>
          <tbody>{columns.map(c => (
            <tr key={c.key}><td>{c.name}</td><td className="num right">{money(c.value)}</td>
              {hasGoal && <td className="num right">{c.goal ? money(c.goal) : '—'}</td>}
              {hasCompare && <td className="num right">{c.compare === null || c.compare === undefined ? '—' : money(c.compare)}</td>}</tr>
          ))}</tbody>
        </table></div>
      </details>
    </figure>
  );
}

// ---------------- barras horizontais (rankings) ----------------

export interface RankItem { key: string | number; label: string; value: number; goal?: number | null; detail?: string; prefix?: ReactNode }

export function RankBars({ title, items, selected, onSelect, format = money, limit = 8, empty = 'Sem vendas no recorte.', headingLevel = 2 }: {
  title: string; items: readonly RankItem[]; selected?: string | number | null; onSelect?: (key: string | number) => void;
  format?: (value: number) => string; limit?: number; empty?: string; headingLevel?: 2 | 3;
}) {
  const id = useId();
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, limit);
  const roving = useRoving(shown.length);
  const max = niceMax(Math.max(1, ...items.flatMap(i => [i.value, i.goal ?? 0])));
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section className="stack-md" aria-labelledby={id}>
      <Heading id={id}>{title}</Heading>
      {items.length === 0 ? <p className="empty">{empty}</p> : <>
        <ol className="rankbars" data-selected={selected !== null && selected !== undefined}>
          {shown.map((item, index) => {
            const isSelected = selected === item.key;
            const body = <>
              <span className="rankbars-name">{item.prefix}<span><span className="rankbars-pos" aria-hidden="true">{index + 1}.</span> {item.label}
                {item.detail && <span className="muted rankbars-detail"> · {item.detail}</span>}</span></span>
              <span className="rankbars-track" aria-hidden="true">
                <span className="rankbars-fill" style={{ width: pct(Math.max(item.value, 0), max) }} />
                {(item.goal ?? 0) > 0 && <span className="rankbars-goal" style={{ left: pct(item.goal ?? 0, max) }} />}
              </span>
              <span className="rankbars-value"><strong className="num">{format(item.value)}</strong>
                {(item.goal ?? 0) > 0 && <> · {formatPercent((item.value * 100) / (item.goal ?? 1))} da meta</>}</span>
            </>;
            return (
              <li key={item.key}>
                {onSelect
                  ? <button type="button" className="rankbars-row" aria-pressed={isSelected}
                            ref={node => { roving.refs.current[index] = node; }} tabIndex={index === roving.focus ? 0 : -1}
                            onClick={() => onSelect(item.key)} onKeyDown={event => roving.onKeyDown(event, index)}
                            onFocus={() => roving.setFocus(index)}>{body}</button>
                  : <div className="rankbars-row">{body}</div>}
              </li>
            );
          })}
        </ol>
        {items.length > limit && (
          <button type="button" className="btn btn-ghost btn-compact" aria-expanded={all} onClick={() => setAll(value => !value)}>
            {all ? `Mostrar os ${limit} primeiros` : `Mostrar todos (${items.length})`}</button>
        )}
      </>}
    </section>
  );
}

// ---------------- meta: realizado, ritmo e projecao ----------------

/**
 * Meta do periodo no medidor do manual v2.0 (figura 34): trilha ate a meta e, com o periodo em curso, a marca do ritmo
 * esperado hoje. O aviso diz o que falta por dia ou a projecao linear do fechamento.
 */
export function GoalGauge({ title, status, empty }: { title: string; status: GoalStatus; empty: string }) {
  const id = useId();
  if (status.goal === null || status.goal <= 0) {
    return (
      <section className="card stack-md" aria-labelledby={id}>
        <h2 id={id}>{title}</h2>
        <p className="notice">{empty} Realizado em {status.label}: <strong>{money(status.realized)}</strong>.</p>
      </section>
    );
  }
  const goal = status.goal;
  const running = status.daysLeft > 0;
  const reached = status.realized >= goal;
  const projectionReaches = status.projection !== null && status.projection >= goal;
  const pace = running && status.expected !== null ? status.expected / goal : null;
  return (
    <section className="card stack-md" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      <Meter realized={status.realized} goal={goal} pace={pace}
             head={<><span className="label">Atingimento</span>
               <span><strong className="kpi-sm">{formatPercent(status.achievement)}</strong>
                 <span className="muted"> · {reached ? 'meta atingida' : `faltam ${money(goal - status.realized)}`}</span></span></>}
             legend={<><span className="num">Realizado {money(status.realized)}</span>
               {pace !== null && <span>Marca = ritmo esperado hoje</span>}
               <span className="num">Meta {money(goal)}</span></>} />
      <p className={reached || projectionReaches ? 'notice notice-ok' : 'notice notice-warn'}>
        {reached ? 'Meta atingida.' : !running ? `Fechou em ${formatPercent(status.achievement)} da meta.`
          : projectionReaches ? `No ritmo atual, a meta é batida (${money(status.projection)}).`
            : `Faltam ${money(goal - status.realized)}: ${money((goal - status.realized) / status.daysLeft)} por dia em ${status.daysLeft} dias.`
              + (status.projection !== null ? ` No ritmo atual, fecha em ${money(status.projection)}.` : '')}
      </p>
    </section>
  );
}
