import type { ReactNode } from 'react';
import { formatPercent } from '../lib/format.ts';
import { meterRatio } from '../lib/goals.ts';

/**
 * Medidor de atingimento (manual v2.0, figura 34): trilha Petroleo 100, preenchimento Petroleo e, no mes corrente, a marca
 * do ritmo esperado em Tinta. O valor exato fica no texto (rotulo e legenda); a barra e decorativa para o leitor de tela.
 */
export function Meter({ realized, goal, pace = null, head, legend }: {
  realized: number; goal: number; pace?: number | null; head?: ReactNode; legend?: ReactNode;
}) {
  const ratio = meterRatio(realized, goal);
  return (
    <div className="meter">
      {head && <div className="meter-head">{head}</div>}
      <div className="meter-track" aria-hidden="true">
        <span className="meter-fill" style={{ width: `${(ratio * 100).toFixed(1)}%` }} />
        {pace !== null && goal > 0 && <span className="meter-pace" style={{ left: `${(pace * 100).toFixed(1)}%` }} />}
      </div>
      {legend && <div className="meter-legend">{legend}</div>}
    </div>
  );
}

/** Medidor curto da tabela de metas: trilha de 64 px e o percentual com uma casa. */
export function MiniMeter({ realized, goal, percent }: { realized: number; goal: number; percent: number | null }) {
  return (
    <span className="meter-mini">
      <span className="meter-track" aria-hidden="true"><span className="meter-fill" style={{ width: `${(meterRatio(realized, goal) * 100).toFixed(1)}%` }} /></span>
      <span className="num">{formatPercent(percent)}</span>
    </span>
  );
}
