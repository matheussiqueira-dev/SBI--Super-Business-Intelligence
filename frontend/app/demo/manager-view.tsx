'use client';
// Painel do gerente na demonstracao (secao 7 do plano de evolucao): visao consolidada da loja, comparacao entre os
// vendedores, metas da equipe, estoque e alertas. O gerente ve o consolidado e o individual necessarios a gestao, mas
// nao recebe as acoes exclusivas do CEO (meta anual e visao executiva do negocio).
import { useMemo } from 'react';
import PageHeader from '../../components/page-header.tsx';
import { Icon } from '../../components/brand/icons.tsx';
import { Kpi } from '../../components/kpi.tsx';
import TableWrap from '../../components/table-wrap.tsx';
import { formatPercent, formatPeriod, money, plural, sentence } from '../../lib/format.ts';
import { PAYMENT_LABEL, type PaymentMethod } from '../../lib/executive.ts';
import {
  canceledIn, dailySeries, demoFilters, lowStock, monthGoalView, monthLabel, orderHistory, periodForRange,
  previousMonthRange, refundsIn, sliceOf, stockMovements, targetsFor, teamRows, topProducts,
} from '../../lib/demo/metrics.ts';
import { PERIOD_LABEL } from '../../lib/demo/state.ts';
import { useDemo } from '../../lib/demo/store.tsx';
import {
  AlertsPanel, DailyEvolutionPanel, DerivedTargetsPanel, GoalPanel, KpiGrid, OrderHistoryPanel, PaymentPanel,
  SellerRankingPanel, StateBadge, TeamGoalChart, TeamTablePanel, TopProductsPanel,
} from './panels.tsx';

export default function ManagerView({ onNewSale, onEditGoals }: { onNewSale: () => void; onEditGoals: () => void }) {
  const { ledger, model, session, range, today } = useDemo();
  const filters = useMemo(() => demoFilters({ categoryId: session.filters.categoryId }), [session.filters.categoryId]);
  const period = periodForRange(range);
  const rangeLabel = PERIOD_LABEL[session.filters.kind];
  const rangeText = formatPeriod(range.from, range.to);

  const slice = useMemo(() => sliceOf(model, ledger, range, filters), [model, ledger, range, filters]);
  const storeGoal = useMemo(() => monthGoalView(model, period, today, null), [model, period, today]);
  const team = useMemo(() => teamRows(model, period, today, range), [model, period, today, range]);
  const daily = useMemo(() => dailySeries(model, filters, range), [model, filters, range]);
  const products = useMemo(() => topProducts(model, filters, range), [model, filters, range]);
  const targets = useMemo(() => targetsFor(model, period, today), [model, period, today]);
  const low = useMemo(() => lowStock(ledger), [ledger]);
  const canceled = useMemo(() => canceledIn(ledger, range), [ledger, range]);
  const refunds = useMemo(() => refundsIn(ledger, range), [ledger, range]);
  const movements = useMemo(() => stockMovements(ledger, range, 20), [ledger, range]);
  const history = useMemo(() => orderHistory(ledger, range, null, 25), [ledger, range]);
  const previous = useMemo(() => {
    const previousRange = previousMonthRange(period);
    return { range: previousRange, measures: model.measures(filters, previousRange) };
  }, [model, filters, period]);

  const payments = useMemo(() => model.ranking('payment', filters).map(row => ({
    key: String(row.key), label: PAYMENT_LABEL[row.key as PaymentMethod] ?? String(row.label), value: row.net, orders: row.orders,
  })), [model, filters]);
  const ranking = useMemo(() => team.map(row => ({
    key: row.sellerId, label: row.name, value: row.periodNet,
    detail: `${plural(model.measures(demoFilters({ sellerId: row.sellerId }), range).orders, 'venda')}`,
  })).sort((a, b) => b.value - a.value), [team, model, range]);

  const above = team.filter(row => row.goal > 0 && row.realized >= row.goal);
  const below = team.filter(row => row.goal > 0 && row.realized < row.goal);
  const turnoverTop = products.slice(0, 5);
  const turnoverLow = [...products].sort((a, b) => a.units - b.units).slice(0, 5);

  const header = (
    <PageHeader section="Gestão · Gerente"
      title={session.view === 'equipe-metas' ? 'Equipe e metas' : session.view === 'estoque' ? 'Estoque e giro' : 'Visão geral da loja'}
      description={<>{rangeLabel} ({rangeText}) · somente pagamentos confirmados, descontadas as devoluções</>}
      actions={<>
        <button type="button" className="btn" onClick={onEditGoals}><Icon name="meta" />Configurar metas</button>
        <button type="button" className="btn btn-primary" onClick={onNewSale}><Icon name="mais" />Registrar venda simulada</button>
      </>} />
  );

  if (session.view === 'equipe-metas') {
    return (
      <div className="stack">
        {header}
        <section className="card stack-md" aria-labelledby="situacao-equipe">
          <div>
            <h2 id="situacao-equipe">Quem está acima e abaixo da meta</h2>
            <p className="card-sub">Meta individual de {monthLabel(period)}</p>
          </div>
          <ul className="insights">
            <li className={above.length > 0 ? 'insight-good' : 'insight-warn'}>
              <Icon name={above.length > 0 ? 'sucesso' : 'alerta'} />
              <span>{above.length === 0 ? 'Nenhum vendedor bateu a meta individual ainda.'
                : `${above.map(row => row.name).join(', ')} ${above.length === 1 ? 'está' : 'estão'} com a meta individual batida.`}</span>
            </li>
            <li className={below.length > 0 ? 'insight-warn' : 'insight-good'}>
              <Icon name={below.length > 0 ? 'alerta' : 'sucesso'} />
              <span>{below.length === 0 ? 'Toda a equipe está com a meta individual batida.'
                : below.map(row => `${row.name} precisa de ${money(row.remaining)}`).join('; ') + '.'}</span>
            </li>
          </ul>
        </section>
        <div className="grid-2">
          <GoalPanel titleId="meta-loja-equipe" title={`Meta da loja · ${monthLabel(period)}`} view={storeGoal}
            subtitle="Meta coletiva; a soma das metas individuais fecha com ela" />
          <TeamGoalChart rows={team} periodLabel={monthLabel(period)} />
        </div>
        <TeamTablePanel rows={team} periodLabel={monthLabel(period)} rangeLabel={rangeText} />
        <DerivedTargetsPanel targets={targets} nameOf={id => model.personName(id)} />
      </div>
    );
  }

  if (session.view === 'estoque') {
    return (
      <div className="stack">
        {header}
        <section className="kpis" aria-label="Indicadores de estoque">
          <Kpi label="Produtos cadastrados" value={<span className="value">{ledger.products.length}</span>}
               note={`${ledger.products.filter(product => product.active).length} à venda`} />
          <Kpi label="Abaixo do mínimo" value={<span className="value">{low.length}</span>}
               note={low.length === 0 ? 'Estoque acima do mínimo' : 'Reposição pendente'} />
          <Kpi label="Unidades vendidas no recorte" value={<span className="value">{slice.measures.units}</span>}
               note={`${slice.itemsPerSale === null ? 'sem vendas' : `${slice.itemsPerSale.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} itens por venda`}`} />
          <Kpi label="Disponível total" value={<span className="value">{ledger.products.reduce((sum, product) => sum + product.stock, 0)}</span>}
               note="Estoque sintético da demonstração" />
        </section>
        <AlertsPanel low={low} canceled={canceled} refunds={refunds} missingCost={slice.measures.itemsWithoutCost} />
        <section className="card stack-md" aria-labelledby="estoque-baixo">
          <div>
            <h2 id="estoque-baixo">Produtos abaixo do estoque mínimo</h2>
            <p className="card-sub">Disponível menor que o mínimo cadastrado</p>
          </div>
          {low.length === 0 ? <p className="empty">Nenhum produto vendável abaixo do mínimo.</p>
            : <TableWrap label="Produtos abaixo do mínimo"><table>
              <caption className="sr-only">Produtos abaixo do estoque mínimo</caption>
              <thead><tr><th scope="col">Produto</th><th scope="col">SKU</th><th scope="col" className="right">Disponível</th>
                <th scope="col" className="right">Mínimo</th><th scope="col" className="right">Falta</th></tr></thead>
              <tbody>{low.map(product => (
                <tr key={product.id}><td>{product.name}</td><td><span className="id">{product.sku}</span></td>
                  <td className="num right">{product.stock}</td><td className="num right">{product.minStock}</td>
                  <td className="num right">{product.gap}</td></tr>
              ))}</tbody>
            </table></TableWrap>}
        </section>
        <div className="grid-2">
          <TopProductsPanel rows={turnoverTop} titleId="maior-giro" title="Produtos de maior giro"
            subtitle={`Mais unidades vendidas no recorte (${rangeText})`} limit={5} />
          <TopProductsPanel rows={turnoverLow} titleId="menor-giro" title="Produtos de menor giro"
            subtitle={`Menos unidades vendidas entre os vendidos no recorte (${rangeText})`} limit={5} />
        </div>
        <section className="card stack-md" aria-labelledby="movimentacoes">
          <div>
            <h2 id="movimentacoes">Movimentações do recorte</h2>
            <p className="card-sub">Saídas de estoque geradas pelas vendas pagas; cada venda é a própria movimentação</p>
          </div>
          {movements.length === 0 ? <p className="empty">Sem movimentação no recorte.</p>
            : <TableWrap label="Movimentações de estoque"><table>
              <caption className="sr-only">Movimentações de estoque do recorte</caption>
              <thead><tr><th scope="col">Data</th><th scope="col">Produto</th><th scope="col">Tipo</th>
                <th scope="col" className="right">Unidades</th></tr></thead>
              <tbody>{movements.map((movement, index) => (
                <tr key={`${movement.date}-${movement.productId}-${index}`}>
                  <td className="num">{movement.date.split('-').reverse().join('/')}</td>
                  <td>{movement.product}</td><td>{movement.kind === 'SAIDA' ? 'Saída (venda)' : 'Entrada'}</td>
                  <td className="num right">{movement.units}</td></tr>
              ))}</tbody>
            </table></TableWrap>}
        </section>
      </div>
    );
  }

  return (
    <div className="stack">
      {header}
      <KpiGrid slice={slice} label="Indicadores da loja no recorte"
        conversionNote={`${slice.measures.orders} vendas em ${plural(slice.visits, 'visita')} sintéticas · meta de 25%`} />

      <div className="grid-main">
        <GoalPanel titleId="meta-loja" title={`Meta da loja · ${monthLabel(period)}`} view={storeGoal}
          subtitle={<>Realizado = vendas pagas menos devoluções · {sentence(monthLabel(period))}</>}>
          <div className="actions">
            <button type="button" className="btn btn-ghost btn-compact" onClick={onEditGoals}>Configurar metas</button>
          </div>
        </GoalPanel>
        <AlertsPanel low={low} canceled={canceled} refunds={refunds} missingCost={slice.measures.itemsWithoutCost} />
      </div>

      <div className="grid-main">
        <DailyEvolutionPanel data={daily} title="Evolução diária da loja"
          subtitle={`Faturamento confirmado e lucro bruto por dia (${rangeText})`} />
        <section className="card stack-md" aria-labelledby="mes-a-mes">
          <div>
            <h2 id="mes-a-mes">{sentence(monthLabel(period))} × mês anterior</h2>
            <p className="card-sub">Escopo próprio: sempre meses fechados, não o recorte escolhido</p>
          </div>
          <dl className="facts">
            <div><dt>{sentence(monthLabel(period))} até hoje</dt><dd className="money">{money(storeGoal.realized)}</dd></div>
            <div><dt>Mês anterior fechado</dt><dd className="money">{money(previous.measures.net)}</dd></div>
            <div><dt>Ticket médio do mês anterior</dt><dd className="money">{money(previous.measures.averageTicket)}</dd></div>
            <div><dt>Margem bruta do mês anterior</dt><dd className="money">{formatPercent(previous.measures.margin)}</dd></div>
          </dl>
          <p className="caption">{formatPeriod(previous.range.from, previous.range.to)} · {previous.measures.orders} vendas pagas.</p>
          <StateBadge state={storeGoal.assessment.state} running={storeGoal.assessment.daysLeft > 0} />
        </section>
      </div>

      <div className="grid-main">
        <SellerRankingPanel items={ranking} rangeLabel={rangeText} />
        <PaymentPanel items={payments} />
      </div>

      <TeamTablePanel rows={team} periodLabel={monthLabel(period)} rangeLabel={rangeText} />

      <div className="grid-main">
        <TopProductsPanel rows={products} title="Produtos mais vendidos" subtitle={`Por faturamento confirmado no recorte (${rangeText})`} />
        <OrderHistoryPanel rows={history.slice(0, 10)} title="Últimas vendas da loja" titleId="ultimas-loja"
          subtitle="Dez mais recentes do recorte, com devoluções e cancelamentos" />
      </div>
    </div>
  );
}
