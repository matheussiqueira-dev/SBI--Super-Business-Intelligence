'use client';
// Blocos comuns aos tres paineis da demonstracao. Todos recebem numeros ja calculados pelo motor de metas
// (lib/demo/targets.ts e lib/demo/metrics.ts): a tela nao faz conta, so apresenta — e a mesma medida sai igual no
// vendedor, no gerente e no CEO.
import type { ReactNode } from 'react';
import { Kpi, MoneyValue } from '../../components/kpi.tsx';
import { Meter, MiniMeter } from '../../components/meter.tsx';
import { RankingBars, RevenueChart, StackedBar, ColumnChart } from '../../components/charts.tsx';
import { Icon } from '../../components/brand/icons.tsx';
import EmptyState from '../../components/empty-state.tsx';
import ProductThumb from '../../components/product-thumb.tsx';
import TableWrap from '../../components/table-wrap.tsx';
import { formatDate, formatPercent, formatPeriod, money, MISSING, plural } from '../../lib/format.ts';
import { GOAL_STATE_ICON, GOAL_STATE_PILL, goalStateLabel, type DemoGoalState, type DerivedTargets } from '../../lib/demo/targets.ts';
import type { DemoSlice, GoalView, LedgerOrderView, StockAlert, TeamRow } from '../../lib/demo/metrics.ts';
import type { ProductRow } from '../../lib/executive.ts';

/** Selo do estado da meta: icone, cor e texto juntos (a cor nunca e a unica pista). */
export function StateBadge({ state, running = false }: { state: DemoGoalState; running?: boolean }) {
  return (
    <span className={GOAL_STATE_PILL[state]}><Icon name={GOAL_STATE_ICON[state]} size={16} />{goalStateLabel(state, running)}</span>
  );
}

/** Conclusao em uma frase: o que fazer com a meta do periodo. */
function goalSentence(view: GoalView): string {
  const { assessment: a } = view;
  if (a.state === 'SEM_META') return `Sem meta cadastrada para ${view.label}. Realizado: ${money(view.realized)}.`;
  if (a.state === 'DADOS_INSUFICIENTES') return `${view.label} ainda não teve dia de funcionamento: sem base para avaliar o ritmo.`;
  if (a.state === 'META_ATINGIDA') return `Meta de ${view.label} atingida: ${money(view.realized)} de ${money(view.goal)}.`;
  const perDay = a.perOperatingDay;
  const falta = `Faltam ${money(a.remaining)} para a meta de ${view.label}`;
  if (perDay === null) return `${falta}. O mês fechou em ${formatPercent(a.achievement)} da meta.`;
  return `${falta}: ${money(perDay)} por dia nos ${plural(a.operatingDaysLeft, 'dia de funcionamento', 'dias de funcionamento')} que restam.`;
}

/**
 * Meta do periodo no medidor do manual v2.0: trilha ate a meta, marca do ritmo esperado hoje e a conclusao em texto.
 * Projecao aparece sempre identificada como estimativa, nunca como resultado.
 */
export function GoalPanel({ title, subtitle, view, titleId, children }: {
  title: string; subtitle?: ReactNode; view: GoalView; titleId: string; children?: ReactNode;
}) {
  const { assessment: a } = view;
  const running = a.daysLeft > 0;
  const pace = running && a.expected !== null && view.goal !== null && view.goal > 0 ? a.expected / view.goal : null;
  return (
    <section className="card stack-md" aria-labelledby={titleId}>
      <div className="card-head">
        <div>
          <h2 id={titleId}>{title}</h2>
          {subtitle && <p className="card-sub">{subtitle}</p>}
        </div>
        <StateBadge state={a.state} running={a.daysLeft > 0} />
      </div>
      {view.goal === null || view.goal <= 0
        ? <p className="notice">{goalSentence(view)}</p>
        : <>
          <Meter realized={view.realized} goal={view.goal} pace={pace}
                 head={<><span className="label">Atingimento</span>
                   <span><strong className="kpi-sm">{formatPercent(a.achievement)}</strong>
                     <span className="muted"> · {a.state === 'META_ATINGIDA' ? 'meta atingida' : `faltam ${money(a.remaining)}`}</span></span></>}
                 legend={<><span className="num">Realizado {money(view.realized)}</span>
                   {pace !== null && <span>Marca = ritmo esperado hoje</span>}
                   <span className="num">Meta {money(view.goal)}</span></>} />
          <p className={a.state === 'META_ATINGIDA' ? 'notice notice-ok' : a.state === 'PROXIMA_DA_META' ? 'notice' : 'notice notice-warn'}>
            {goalSentence(view)}
          </p>
          <dl className="facts">
            <div><dt>Desvio da meta</dt><dd className="money">{a.deviation === null ? MISSING : money(a.deviation)}</dd></div>
            <div><dt>Ritmo cumprido</dt><dd className="money">{formatPercent(a.pacePercent)}</dd></div>
            <div><dt>Projeção de fechamento (estimativa)</dt><dd className="money">{a.projection === null ? MISSING : money(a.projection)}</dd></div>
          </dl>
          <p className="caption">Projeção = realizado ÷ dias decorridos × dias do mês. É estimativa linear, não resultado realizado.</p>
        </>}
      {children}
    </section>
  );
}

/**
 * Indicadores do recorte. Faturamento, lucro e margem seguem as mesmas definicoes da area autenticada. Com
 * `financial` desligado o bloco nao mostra lucro, CMV nem margem: e o que o vendedor ve (RF de permissao por perfil).
 */
export function KpiGrid({ slice, label, extra, conversionNote, financial = true }: {
  slice: DemoSlice; label: string; extra?: ReactNode; conversionNote?: string; financial?: boolean;
}) {
  const m = slice.measures;
  return (
    <section className="kpis" aria-label={label}>
      <Kpi label="Faturamento confirmado" value={<MoneyValue value={m.net} />}
           note={m.refunds > 0 ? `Vendas ${money(m.sales)} · devoluções ${money(m.refunds)}` : 'Vendas pagas, sem devoluções no recorte'} />
      {financial && <Kpi label="Lucro bruto" value={<MoneyValue value={m.profit} />}
           note={m.profit === null ? 'Há itens vendidos sem custo informado.' : `Faturamento − CMV ${money(m.cost)}`} />}
      {financial && <Kpi label="Margem bruta" value={<span className={m.margin === null ? 'value text' : 'value'}>{formatPercent(m.margin)}</span>}
           note={m.margin === null ? 'Sem margem enquanto faltar custo.' : 'Lucro bruto ÷ faturamento confirmado'} />}
      <Kpi label="Vendas pagas" value={<span className="value">{m.orders}</span>}
           note={`Ticket médio ${money(m.averageTicket)} · ${slice.itemsPerSale === null ? 'sem itens' : `${slice.itemsPerSale.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} itens por venda`}`} />
      {slice.conversion !== null && <Kpi label="Conversão comercial" value={<span className="value">{formatPercent(slice.conversion)}</span>}
           note={conversionNote ?? `${m.orders} vendas em ${plural(slice.visits, 'visita')} sintéticas`} />}
      <Kpi label="Descontos concedidos" value={<MoneyValue value={m.discount} />}
           note={m.sales + m.discount > 0 ? `${formatPercent((m.discount * 100) / (m.sales + m.discount))} do preço de tabela` : 'Sem vendas no recorte'} />
      {extra}
    </section>
  );
}

/** Metas derivadas da meta mensal: o plano traduzido para o dia, a semana e cada vendedor. */
export function DerivedTargetsPanel({ targets, nameOf, titleId = 'metas-derivadas' }: {
  targets: DerivedTargets | null; nameOf: (sellerId: number) => string; titleId?: string;
}) {
  if (!targets) {
    return (
      <section className="card stack-md" aria-labelledby={titleId}>
        <h2 id={titleId}>Metas derivadas</h2>
        <p className="empty">Sem meta cadastrada para o mês: não há meta diária nem semanal para derivar.</p>
      </section>
    );
  }
  return (
    <section className="card stack-md" aria-labelledby={titleId}>
      <div>
        <h2 id={titleId}>Metas derivadas da meta do mês</h2>
        <p className="card-sub">Calculadas sobre os {targets.operatingDays} dias de funcionamento do mês (o plano prevê {targets.plannedOperatingDays})</p>
      </div>
      <dl className="facts">
        <div><dt>Meta do mês</dt><dd className="money">{money(targets.monthly)}</dd></div>
        <div><dt>Meta por dia de funcionamento</dt><dd className="money">{money(targets.daily)}</dd></div>
        <div><dt>Meta da semana ({formatPeriod(targets.weekFrom, targets.weekTo)}, {plural(targets.weeklyDays, 'dia')})</dt>
          <dd className="money">{money(targets.weekly)}</dd></div>
        <div><dt>Vendas necessárias no ticket de referência</dt><dd className="money">{targets.requiredOrders.toLocaleString('pt-BR')}</dd></div>
        <div><dt>Ticket médio necessário na quantidade do plano</dt><dd className="money">{money(targets.requiredTicket)}</dd></div>
        <div><dt>Itens que a meta exige</dt><dd className="money">{targets.requiredItems.toLocaleString('pt-BR')}</dd></div>
      </dl>
      <TableWrap label="Metas individuais derivadas"><table>
        <caption className="sr-only">Meta individual mensal e diária de cada vendedor</caption>
        <thead><tr><th scope="col">Vendedor</th><th scope="col" className="right">Meta do mês</th>
          <th scope="col" className="right">Meta por dia de funcionamento</th></tr></thead>
        <tbody>{targets.sellers.map(seller => (
          <tr key={seller.sellerId}><td>{nameOf(seller.sellerId)}</td>
            <td className="num right">{money(seller.monthly)}</td><td className="num right">{money(seller.daily)}</td></tr>
        ))}</tbody>
      </table></TableWrap>
    </section>
  );
}

/** Desempenho da equipe: meta e realizado do mes, com quem esta acima e abaixo. */
export function TeamTablePanel({ rows, periodLabel, rangeLabel, titleId = 'equipe' }: {
  rows: readonly TeamRow[]; periodLabel: string; rangeLabel: string; titleId?: string;
}) {
  return (
    <section className="card stack-md" aria-labelledby={titleId}>
      <div>
        <h2 id={titleId}>Desempenho da equipe</h2>
        <p className="card-sub">Meta e realizado de {periodLabel}; a última coluna é o faturamento do recorte ({rangeLabel})</p>
      </div>
      {rows.length === 0 ? <p className="empty">Sem vendedores com meta ou venda no mês.</p> : <>
        <TableWrap label="Desempenho da equipe" className="only-desktop"><table>
          <caption className="sr-only">Meta, realizado e atingimento por vendedor</caption>
          <thead><tr><th scope="col">Vendedor</th><th scope="col" className="right">Meta do mês</th>
            <th scope="col" className="right">Realizado</th><th scope="col" className="right">Atingimento</th>
            <th scope="col" className="right">Desvio</th><th scope="col" className="right">Ticket médio</th>
            <th scope="col">Situação</th><th scope="col" className="right">Recorte</th></tr></thead>
          <tbody>{rows.map(row => (
            <tr key={row.sellerId}>
              <td>{row.name}</td>
              <td className="num right">{row.goal > 0 ? money(row.goal) : 'Sem meta'}</td>
              <td className="num right">{money(row.realized)}</td>
              <td className="num right">{row.goal > 0 ? <MiniMeter realized={row.realized} goal={row.goal} percent={row.achievement} /> : '—'}</td>
              <td className="num right">{row.goal > 0 ? money(row.deviation) : '—'}</td>
              <td className="num right">{money(row.averageTicket)}</td>
              <td><StateBadge state={row.assessment.state} running={row.assessment.daysLeft > 0} /></td>
              <td className="num right">{money(row.periodNet)}</td>
            </tr>
          ))}</tbody>
        </table></TableWrap>
        <ul className="list only-mobile" aria-label="Desempenho da equipe">
          {rows.map(row => (
            <li key={row.sellerId}>
              <div className="list-row"><span className="list-title">{row.name}</span><StateBadge state={row.assessment.state} running={row.assessment.daysLeft > 0} /></div>
              <p className="caption num">Realizado {money(row.realized)}{row.goal > 0 ? ` · meta ${money(row.goal)} · ${formatPercent(row.achievement)}` : ' · sem meta'}</p>
            </li>
          ))}
        </ul>
      </>}
    </section>
  );
}

/** Comparativo meta x realizado por vendedor, em colunas. */
export function TeamGoalChart({ rows, periodLabel }: { rows: readonly TeamRow[]; periodLabel: string }) {
  return (
    <section className="card stack-md" aria-labelledby="comparativo-equipe">
      <div>
        <h2 id="comparativo-equipe">Meta × realizado por vendedor</h2>
        <p className="card-sub">{periodLabel} · a linha tracejada é a meta individual</p>
      </div>
      <ColumnChart label={`Meta e realizado por vendedor em ${periodLabel}`} valueLabel="Realizado" goalLabel="Meta do vendedor"
                   data={rows.map(row => ({ label: row.name.split(' ')[0] ?? row.name, value: row.realized, goal: row.goal }))} />
    </section>
  );
}

/** Produtos mais vendidos do recorte. */
export function TopProductsPanel({ rows, title, subtitle, limit = 8, titleId = 'produtos', showMargin = true }: {
  rows: readonly ProductRow[]; title: string; subtitle: string; limit?: number; titleId?: string; showMargin?: boolean;
}) {
  const shown = rows.slice(0, limit);
  return (
    <section className="card stack-md" aria-labelledby={titleId}>
      <div>
        <h2 id={titleId}>{title}</h2>
        <p className="card-sub">{subtitle}</p>
      </div>
      {shown.length === 0 ? <p className="empty">Nenhum produto vendido no recorte.</p>
        : <TableWrap label={title}><table>
          <caption className="sr-only">{title}</caption>
          <thead><tr><th scope="col">Produto</th><th scope="col" className="right">Unid.</th>
            <th scope="col" className="right">Faturamento</th>
            {showMargin && <th scope="col" className="right">Margem</th>}</tr></thead>
          <tbody>{shown.map(row => (
            <tr key={row.productId}>
              <td className="cell-product"><div className="product-cell"><ProductThumb sku={row.sku ?? undefined} name={row.label} size={32} />
                <span>{row.label}<span className="cell-sub"><span className="id">{row.sku ?? '—'}</span> · {row.category}</span></span></div></td>
              <td className="num right">{row.units}</td>
              <td className="num right">{money(row.net)}</td>
              {showMargin && <td className={`num right${row.margin !== null && row.margin < 10 ? ' margin-low' : ''}`}>{formatPercent(row.margin)}</td>}
            </tr>
          ))}</tbody>
        </table></TableWrap>}
    </section>
  );
}

/** Evolucao diaria do recorte: faturamento e lucro bruto por dia. */
export function DailyEvolutionPanel({ data, title, subtitle, titleId = 'evolucao' }: {
  data: readonly { date: string; net: number; profit: number | null }[]; title: string; subtitle: string; titleId?: string;
}) {
  return (
    <section className="card stack-md" aria-labelledby={titleId}>
      <div>
        <h2 id={titleId}>{title}</h2>
        <p className="card-sub">{subtitle}</p>
      </div>
      <RevenueChart label={title} data={data} />
    </section>
  );
}

/** Participacao das formas de pagamento no faturamento do recorte. */
const PAYMENT_COLORS: Readonly<Record<string, string>> = { PIX: 'var(--sbi-data-1)', CARD: 'var(--sbi-data-2)', BOLETO: 'var(--sbi-data-3)' };

export function PaymentPanel({ items, titleId = 'pagamentos' }: {
  items: readonly { key: string; label: string; value: number; orders?: number }[]; titleId?: string;
}) {
  return (
    <section className="card stack-md" aria-labelledby={titleId}>
      <div>
        <h2 id={titleId}>Formas de pagamento</h2>
        <p className="card-sub">Participação no faturamento confirmado do recorte</p>
      </div>
      <StackedBar label="Participação de cada forma de pagamento" colors={PAYMENT_COLORS} items={items} />
    </section>
  );
}

/** Ranking de vendedores pelo faturamento do recorte. */
export function SellerRankingPanel({ items, rangeLabel, titleId = 'ranking' }: {
  items: readonly { key: number; label: string; value: number; detail?: string }[]; rangeLabel: string; titleId?: string;
}) {
  return (
    <section className="card stack-md" aria-labelledby={titleId}>
      <div>
        <h2 id={titleId}>Ranking comercial</h2>
        <p className="card-sub">Faturamento confirmado de cada vendedor no recorte ({rangeLabel})</p>
      </div>
      <RankingBars label="Vendedores do maior para o menor faturamento" items={items} />
    </section>
  );
}

/** Historico de vendas (um vendedor ou a loja). A venda registrada na demonstracao aparece marcada. */
export function OrderHistoryPanel({ rows, title, subtitle, action, titleId = 'historico' }: {
  rows: readonly LedgerOrderView[]; title: string; subtitle: string; action?: ReactNode; titleId?: string;
}) {
  return (
    <section className="card stack-md" aria-labelledby={titleId}>
      <div className="card-head">
        <div>
          <h2 id={titleId}>{title}</h2>
          <p className="card-sub">{subtitle}</p>
        </div>
        {action}
      </div>
      {rows.length === 0
        ? <EmptyState icon="vendas" title="Sem vendas no recorte">Escolha outro período ou registre uma venda simulada.</EmptyState>
        : <TableWrap label={title}><table>
          <caption className="sr-only">{title}</caption>
          <thead><tr><th scope="col">Venda</th><th scope="col">Cliente</th><th scope="col">Data</th>
            <th scope="col" className="right">Itens</th><th scope="col" className="right">Desconto</th>
            <th scope="col" className="right">Valor</th><th scope="col">Situação</th></tr></thead>
          <tbody>{rows.map(({ order, customer, net, units, discount }) => (
            <tr key={order.id}>
              <td><span className="id">#{order.id}</span>{order.simulated && <span className="pill pill-promo">simulada</span>}</td>
              <td>{customer}</td>
              <td className="num">{formatDate(order.date)} {order.time}</td>
              <td className="num right">{units}</td>
              <td className="num right">{discount > 0 ? money(discount) : '—'}</td>
              <td className="num right">{money(net)}</td>
              <td>{order.status === 'CANCELED' ? <span className="pill pill-err"><Icon name="fechar" size={16} />Cancelada</span>
                : order.refund ? <span className="pill pill-warn"><Icon name="alerta" size={16} />Devolução {money(order.refund.amount / 100)}</span>
                  : <span className="pill pill-ok"><Icon name="check" size={16} />Paga</span>}</td>
            </tr>
          ))}</tbody>
        </table></TableWrap>}
    </section>
  );
}

/** Alertas operacionais do recorte: o que exige acao agora. */
export function AlertsPanel({ low, canceled, refunds, missingCost, titleId = 'alertas' }: {
  low: readonly StockAlert[]; canceled: { count: number; amount: number }; refunds: { count: number; amount: number };
  missingCost: number; titleId?: string;
}) {
  return (
    <section className="card stack-md" aria-labelledby={titleId}>
      <div>
        <h2 id={titleId}>Alertas operacionais</h2>
        <p className="card-sub">Exceções do recorte, com o que fazer em seguida</p>
      </div>
      <ul className="attn">
        {low.length === 0
          ? <li><span className="attn-icon is-success"><Icon name="sucesso" /></span><div>
              <p className="attn-title">Estoque acima do mínimo</p>
              <p>Nenhum produto vendável abaixo do estoque mínimo.</p></div></li>
          : <li><span className="attn-icon is-warning"><Icon name="alerta" /></span><div>
              <p className="attn-title">{plural(low.length, 'produto')} abaixo do mínimo</p>
              <p>{low.slice(0, 3).map(item => `${item.name}: ${item.stock} disponível, mínimo ${item.minStock}`).join('; ')}
                {low.length > 3 ? `; e mais ${low.length - 3}` : ''}.</p>
              <p className="caption">Reposição é decisão do gerente; a demonstração só aponta a exceção.</p></div></li>}
        {canceled.count > 0
          ? <li><span className="attn-icon is-info"><Icon name="info" /></span><div>
              <p className="attn-title">{plural(canceled.count, 'venda cancelada', 'vendas canceladas')} no recorte</p>
              <p>Somam {money(canceled.amount)} em preço de tabela e não entram no faturamento: só pagamento confirmado conta.</p></div></li>
          : <li><span className="attn-icon is-success"><Icon name="sucesso" /></span><div>
              <p className="attn-title">Nenhuma venda cancelada no recorte</p>
              <p>Toda venda registrada foi paga.</p></div></li>}
        {refunds.count > 0 && <li><span className="attn-icon is-warning"><Icon name="alerta" /></span><div>
          <p className="attn-title">{plural(refunds.count, 'devolução', 'devoluções')} no recorte</p>
          <p>{money(refunds.amount)} devolvidos já estão descontados do faturamento confirmado.</p></div></li>}
        {missingCost > 0 && <li><span className="attn-icon is-warning"><Icon name="alerta" /></span><div>
          <p className="attn-title">Itens vendidos sem custo informado</p>
          <p>{plural(missingCost, 'item', 'itens')} sem preço de compra: lucro e margem do recorte ficam como “{MISSING}”.</p></div></li>}
      </ul>
    </section>
  );
}
