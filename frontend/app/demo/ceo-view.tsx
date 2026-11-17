'use client';
// Painel do CEO na demonstracao (secao 8 do plano de evolucao). Reaproveita exatamente o painel executivo da area
// autenticada (components/executive-view.tsx): o mesmo componente, as mesmas contas e os mesmos graficos, so com o
// modelo vindo da base sintetica em vez da API. A loja tem uma unidade, entao nao ha consolidacao de filiais.
import { useMemo, useState } from 'react';
import { Model } from '../../lib/executive.ts';
import { ExecutiveView } from '../../components/executive-view.tsx';
import { GoalGauge } from '../../components/exec-charts.tsx';
import { ColumnChart } from '../../components/charts.tsx';
import { Kpi, MoneyValue } from '../../components/kpi.tsx';
import { MiniMeter } from '../../components/meter.tsx';
import PageHeader from '../../components/page-header.tsx';
import TableWrap from '../../components/table-wrap.tsx';
import { Icon } from '../../components/brand/icons.tsx';
import { formatPercent, money, sentence } from '../../lib/format.ts';
import { planCoverage } from '../../lib/goals.ts';
import { ledgerYears, toOverview } from '../../lib/demo/ledger.ts';
import { monthGoalView, monthLabel } from '../../lib/demo/metrics.ts';
import { useDemo } from '../../lib/demo/store.tsx';
import { DerivedTargetsPanel, StateBadge } from './panels.tsx';
import { targetsFor } from '../../lib/demo/metrics.ts';

export default function CeoView({ onNewSale, onEditGoals }: { onNewSale: () => void; onEditGoals: () => void }) {
  const { ledger, model, session, today } = useDemo();
  const [year, setYear] = useState(ledger.year);
  const years = useMemo(() => ledgerYears(ledger), [ledger]);
  const yearModel = useMemo(
    () => (year === ledger.year ? model : new Model(toOverview(ledger, { year }))),
    [year, ledger, model],
  );

  const actions = (
    <>
      <button type="button" className="btn" onClick={onEditGoals}><Icon name="meta" />Metas</button>
      <button type="button" className="btn btn-primary" onClick={onNewSale}><Icon name="mais" />Venda simulada</button>
    </>
  );

  if (session.view === 'metas') return <CeoGoals onEditGoals={onEditGoals} />;

  return (
    <ExecutiveView model={yearModel} year={year} years={years} onYear={setYear} goalsHref={null} actions={actions}
      notice={<p className="notice">Painel executivo sobre a base sintética da demonstração. Os mesmos cálculos do
        ambiente autenticado: faturamento confirmado menos devoluções, custo ausente nunca vira zero e meta comparada
        com a venda total do recorte.</p>} />
  );
}

/** Metas da diretoria: meta anual, cobertura do plano mensal e o acompanhamento mes a mes. */
function CeoGoals({ onEditGoals }: { onEditGoals: () => void }) {
  const { ledger, model, today } = useDemo();
  const annual = model.annualGoalStatus();
  const plan = model.plannedMonths();
  const coverage = planCoverage(model.overview.annualGoal?.amount.amount ?? null, plan.amount);
  const months = useMemo(() => Array.from({ length: 12 }, (_, index) => `${ledger.year}-${String(index + 1).padStart(2, '0')}`)
    .map(period => monthGoalView(model, period, today, null)), [ledger.year, model, today]);
  const period = today.slice(0, 7);
  const targets = useMemo(() => targetsFor(model, period, today), [model, period, today]);
  const series = months.map(view => ({ label: monthLabel(view.period).slice(0, 3), value: view.realized, goal: view.goal ?? 0 }));

  return (
    <div className="stack">
      <PageHeader section="Diretoria · CEO" title={`Metas comerciais · ${ledger.year}`}
        description="Meta anual da loja, cobertura do plano mensal e acompanhamento mês a mês"
        actions={<button type="button" className="btn btn-primary" onClick={onEditGoals}><Icon name="meta" />Configurar metas do mês</button>} />

      <section className="kpis" aria-label="Indicadores do plano anual">
        <Kpi label="Meta anual da loja" value={<MoneyValue value={model.overview.annualGoal?.amount.amount ?? null} />}
             note={`Definida pela diretoria · ${ledger.year}`} />
        <Kpi label="Plano mensal somado" value={<MoneyValue value={plan.amount} />}
             note={`${plan.months} meses com meta cadastrada`} />
        <Kpi label="Cobertura do plano" value={<span className="value">{formatPercent(coverage)}</span>}
             note="Soma das metas mensais ÷ meta anual" />
        <Kpi label="Realizado no ano" value={<MoneyValue value={annual.realized} />}
             note={`Atingimento ${formatPercent(annual.achievement)}`} />
      </section>

      <div className="grid-2">
        <GoalGauge title={`Meta anual da loja · ${ledger.year}`} status={annual}
                   empty="Meta anual não definida na demonstração." />
        <section className="card stack-md" aria-labelledby="plano-mensal">
          <div>
            <h2 id="plano-mensal">Meta × realizado por mês</h2>
            <p className="card-sub">A linha tracejada é a meta da loja de cada mês</p>
          </div>
          <ColumnChart label={`Meta e realizado por mês em ${ledger.year}`} valueLabel="Realizado" goalLabel="Meta da loja" data={series} />
        </section>
      </div>

      <section className="card stack-md" aria-labelledby="acompanhamento">
        <div>
          <h2 id="acompanhamento">Acompanhamento mês a mês</h2>
          <p className="card-sub">Período futuro aparece só como meta: não há venda registrada adiante de hoje</p>
        </div>
        <TableWrap label="Meta, realizado e atingimento por mês"><table>
          <caption className="sr-only">Meta, realizado e atingimento por mês</caption>
          <thead><tr><th scope="col">Mês</th><th scope="col" className="right">Meta</th><th scope="col" className="right">Realizado</th>
            <th scope="col" className="right">Atingimento</th><th scope="col" className="right">Desvio</th>
            <th scope="col">Situação</th></tr></thead>
          <tbody>{months.map(view => (
            <tr key={view.period}>
              <td>{sentence(view.label)}</td>
              <td className="num right">{view.goal === null ? 'Sem meta' : money(view.goal)}</td>
              <td className="num right">{money(view.realized)}</td>
              <td className="num right">{view.goal !== null && view.goal > 0
                ? <MiniMeter realized={view.realized} goal={view.goal} percent={view.assessment.achievement} /> : '—'}</td>
              <td className="num right">{view.assessment.deviation === null ? '—' : money(view.assessment.deviation)}</td>
              <td><StateBadge state={view.assessment.state} running={view.assessment.daysLeft > 0} /></td>
            </tr>
          ))}</tbody>
        </table></TableWrap>
      </section>

      <DerivedTargetsPanel targets={targets} nameOf={id => model.personName(id)} titleId="metas-derivadas-ceo" />
    </div>
  );
}
