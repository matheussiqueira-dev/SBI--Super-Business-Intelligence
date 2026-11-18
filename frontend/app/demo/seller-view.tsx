'use client';
// Painel do vendedor na demonstracao (secao 6 do plano de evolucao): interface operacional com a meta individual, o
// acumulado, o que falta e as proprias vendas. O vendedor nao ve lucro, CMV, margem nem o desempenho individual dos
// colegas: o recorte de dados segue o papel, como na area autenticada.
import { useMemo } from 'react';
import PageHeader from '../../components/page-header.tsx';
import { Icon } from '../../components/brand/icons.tsx';
import { Kpi, MoneyValue } from '../../components/kpi.tsx';
import { formatPercent, money, plural, sentence } from '../../lib/format.ts';
import { demoFilters, dailySeries, monthGoalView, monthLabel, orderHistory, periodForRange, sliceOf, topProducts } from '../../lib/demo/metrics.ts';
import { PERIOD_LABEL } from '../../lib/demo/state.ts';
import { useDemo } from '../../lib/demo/store.tsx';
import { DailyEvolutionPanel, GoalPanel, KpiGrid, OrderHistoryPanel, TopProductsPanel } from './panels.tsx';

export default function SellerView({ onNewSale }: { onNewSale: () => void }) {
  const { ledger, model, session, range, today } = useDemo();
  const sellerId = session.personIds.VENDEDOR;
  const filters = useMemo(() => demoFilters({ sellerId, categoryId: session.filters.categoryId }), [sellerId, session.filters.categoryId]);
  const period = periodForRange(range);
  const slice = useMemo(() => sliceOf(model, ledger, range, filters), [model, ledger, range, filters]);
  const goal = useMemo(() => monthGoalView(model, period, today, sellerId), [model, period, today, sellerId]);
  const daily = useMemo(() => dailySeries(model, filters, range), [model, filters, range]);
  const products = useMemo(() => topProducts(model, filters, range, 8), [model, filters, range]);
  const history = useMemo(() => orderHistory(ledger, range, sellerId, 25), [ledger, range, sellerId]);
  const person = ledger.people.find(entry => entry.id === sellerId);
  const rangeLabel = PERIOD_LABEL[session.filters.kind];

  return (
    <div className="stack">
      <PageHeader section="Meu espaço · Vendedor" title="Meu desempenho"
        description={<>{person?.name} · {rangeLabel.toLowerCase()} · suas vendas pagas, descontadas as devoluções</>}
        actions={<button type="button" className="btn btn-primary" onClick={onNewSale}><Icon name="mais" />Registrar venda simulada</button>} />

      {session.view === 'minhas-vendas' ? (
        <OrderHistoryPanel rows={history} title="Minhas vendas" titleId="minhas-vendas"
          subtitle={`Histórico do recorte (${rangeLabel.toLowerCase()}); venda aguardando pagamento não conta para o realizado`}
          action={<button type="button" className="btn" onClick={onNewSale}><Icon name="mais" />Nova venda simulada</button>} />
      ) : (
        <>
          <GoalPanel titleId="minha-meta" title={`Minha meta de ${monthLabel(period)}`} view={goal}
            subtitle={<>Meta individual definida pelo gerente · {sentence(monthLabel(period))}</>} />

          <KpiGrid slice={slice} financial={false} label="Meus indicadores do recorte" extra={
            <>
              <Kpi label="Minha meta do mês" value={goal.goal === null ? <span className="value text">Sem meta</span> : <MoneyValue value={goal.goal} />}
                   note={`Atingimento ${formatPercent(goal.assessment.achievement)}`} />
              <Kpi label="Falta para a meta" value={goal.assessment.remaining === null
                ? <span className="value text">Sem meta</span> : <MoneyValue value={goal.assessment.remaining} />}
                   note={goal.assessment.perOperatingDay === null ? 'Meta batida ou mês encerrado'
                     : `${money(goal.assessment.perOperatingDay)} por dia em ${plural(goal.assessment.operatingDaysLeft, 'dia de funcionamento', 'dias de funcionamento')}`} />
            </>} />

          <DailyEvolutionPanel data={daily} titleId="minha-evolucao" title="Minha evolução diária"
            subtitle={`Faturamento confirmado por dia no recorte (${rangeLabel.toLowerCase()})`} />

          <div className="grid-2">
            <TopProductsPanel rows={products} titleId="meus-produtos" showMargin={false} title="Meus produtos mais vendidos"
              subtitle="Por faturamento confirmado no recorte" />
            <OrderHistoryPanel rows={history.slice(0, 8)} title="Minhas últimas vendas" titleId="minhas-ultimas"
              subtitle="As oito mais recentes do recorte; a lista completa fica em Minhas vendas"
              action={<button type="button" className="btn btn-ghost btn-compact" onClick={onNewSale}>Nova venda</button>} />
          </div>
        </>
      )}
    </div>
  );
}
