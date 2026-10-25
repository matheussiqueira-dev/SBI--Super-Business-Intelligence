import type { ReactNode } from 'react';
import { MISSING, moneyParts, type Money } from '../lib/format.ts';

/** Valor em reais com o "R$" em 64% do corpo e na cor de apoio (manual v2.0, figura 12); ausente vira "Não informado". */
export function MoneyValue({ value, missing = MISSING }: { value: Money | number | null | undefined; missing?: string }) {
  const parts = moneyParts(value);
  if (!parts) return <span className="value text">{missing}</span>;
  return <span className="value"><span className="unit">{parts.unit}</span>{parts.amount}</span>;
}

/**
 * Cartao de indicador: rotulo, valor tabular e a regra ou o periodo embaixo (todo indicador diz de onde vem).
 * O valor chega pronto (MoneyValue, numero ou texto) para o cartao nao decidir formato.
 */
export function Kpi({ label, value, note, children }: { label: string; value: ReactNode; note?: ReactNode; children?: ReactNode }) {
  return (
    <div className="card kpi">
      <span className="label">{label}</span>
      {value}
      {children}
      {note && <span className="note">{note}</span>}
    </div>
  );
}

/** Esqueleto com a forma do cartao, sem animacao continua (manual v2.0, estados de tela). */
export function KpiSkeleton() {
  return (
    <div className="card kpi" aria-hidden="true">
      <span className="skeleton skeleton-line" />
      <span className="skeleton skeleton-value" />
      <span className="skeleton skeleton-line" />
    </div>
  );
}
