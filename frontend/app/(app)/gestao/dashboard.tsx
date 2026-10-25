'use client';
// Gestao (WP-3.8) na anatomia do manual v2.0 (secao 28): o que e, quanto e, como evoluiu, o que exige acao e o detalhe.
// Indicadores e graficos seguem o periodo escolhido; metas seguem o mes corrente. Atualiza a cada 15 s com a aba visivel e
// erro nunca vira zero: a ultima leitura continua na tela e a hora dela vira aviso.
import { useMemo, useState } from 'react';
import type { z } from 'zod';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { GetManagementSummaryResponse, GetRevenueReportResponse, ListStockProductsResponse } from '../../../lib/api/generated/sbi.zod.ts';
import { api } from '../../../lib/api/http.ts';
import { formatMonth, formatPercent, formatPeriod, formatTime, initials, label, money, PAYMENT_TYPE, plural, sentence } from '../../../lib/format.ts';
import { ErrorNotice } from '../../../components/feedback.tsx';
import { RankingBars, RevenueChart, StackedBar } from '../../../components/charts.tsx';
import { Kpi, KpiSkeleton, MoneyValue } from '../../../components/kpi.tsx';
import { monthPace } from '../../../lib/goals.ts';
import { Meter, MiniMeter } from '../../../components/meter.tsx';
import { Icon } from '../../../components/brand/icons.tsx';
import PageHeader from '../../../components/page-header.tsx';
import ProductThumb from '../../../components/product-thumb.tsx';
import TableWrap from '../../../components/table-wrap.tsx';

const PERIODS = [['TODAY', 'Hoje'], ['D7', '7 dias'], ['D30', '30 dias'], ['D90', '90 dias']] as const;
const PERIOD_TEXT: Readonly<Record<Period, string>> = { TODAY: 'Hoje', D7: 'Últimos 7 dias', D30: 'Últimos 30 dias', D90: 'Últimos 90 dias' };
/** A cor segue a forma de pagamento, nunca a posicao no ranking (manual v2.0, regras de dados). */
const PAYMENT_COLORS: Readonly<Record<string, string>> = { PIX: 'var(--sbi-data-1)', CARD: 'var(--sbi-data-2)', BOLETO: 'var(--sbi-data-3)' };
const PAYMENT_ORDER = ['PIX', 'CARD', 'BOLETO'];
/** Linhas da tabela "Produtos mais vendidos"; a lista completa fica em Analises. */
const TOP_PRODUCTS = 10;
type Period = (typeof PERIODS)[number][0];
type Summary = z.infer<typeof GetManagementSummaryResponse>;

function currentMonth(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit' }).format(new Date());
}

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>('D30');
  const [productFilter, setProductFilter] = useState('');
  const month = currentMonth();
  const live = { refetchInterval: 15_000, refetchIntervalInBackground: false } as const;

  const revenue = useQuery({
    queryKey: ['revenue', period],
    queryFn: ({ signal }) => api.request(`/management/revenue?period=${period}`, { signal, schema: GetRevenueReportResponse }),
    placeholderData: keepPreviousData,
    ...live,
  });
  const summary = useQuery({
    queryKey: ['summary', month],
    queryFn: ({ signal }) => api.request(`/management/summary?period=${month}`, { signal, schema: GetManagementSummaryResponse }),
    ...live,
  });
  const lowStock = useQuery({
    queryKey: ['low-stock'],
    queryFn: ({ signal }) => api.request('/stock/products?belowMin=true&sellable=true&size=5', { signal, schema: ListStockProductsResponse }),
    ...live,
  });

  const report = revenue.data;
  const matching = useMemo(() => {
    const term = productFilter.trim().toLowerCase();
    return (report?.topProducts ?? []).filter(p => !term || p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term));
  }, [report, productFilter]);
  const products = matching.slice(0, TOP_PRODUCTS);
  const updated = revenue.dataUpdatedAt ? formatTime(new Date(revenue.dataUpdatedAt).toISOString()) : null;
  const stale = Boolean(revenue.error && report);
  const missingCost = report !== undefined && report.grossProfit === null;
  const range = report ? `, de ${formatPeriod(report.period.from, report.period.to)}` : '';
  const payments = report ? [...report.byPaymentMethod].sort((a, b) => PAYMENT_ORDER.indexOf(a.method) - PAYMENT_ORDER.indexOf(b.method)) : [];

  return (
    <div className="stack">
      <PageHeader section="Gestão" title="Visão geral da loja"
        description={<>{PERIOD_TEXT[period]}{range} · somente pagamentos confirmados, descontados os estornos
          {updated && <> · <span aria-live="polite" className={stale ? 'pill pill-warn' : undefined}>Atualizado às {updated}</span></>}</>}
        actions={<>
          <fieldset className="segmented">
            <legend className="sr-only">Período</legend>
            {PERIODS.map(([value, text]) => (
              <label key={value}><input type="radio" name="periodo" value={value} checked={period === value} onChange={() => setPeriod(value)} />
                <span>{text}</span></label>
            ))}
          </fieldset>
          <Link className="btn btn-primary" href="/vender"><Icon name="mais" />Nova venda</Link>
        </>} />

      <ErrorNotice error={revenue.error}>
        {report && <p>Os números abaixo são da última leitura bem-sucedida{updated ? `, às ${updated}` : ''}.</p>}
      </ErrorNotice>

      {revenue.isLoading && <section className="kpis" aria-label="Indicadores do período" aria-busy="true">
        <p role="status" className="sr-only">Carregando faturamento…</p>
        <KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton />
      </section>}

      {report && <>
        <section className="kpis" aria-label="Indicadores do período">
          <Kpi label="Faturamento confirmado" value={<MoneyValue value={report.netRevenue} />}
               note={report.refunds.amount > 0 ? `Descontados ${money(report.refunds)} em estornos` : 'Sem estornos no período'} />
          <Kpi label="Lucro bruto" value={<MoneyValue value={report.grossProfit} />}
               note={missingCost ? 'Há itens vendidos sem custo informado.' : `Cobertura de custo de ${formatPercent(report.costCoveragePercent)}`} />
          <Kpi label="Margem bruta"
               value={<span className={report.grossMarginPercent === null ? 'value text' : 'value'}>{formatPercent(report.grossMarginPercent)}</span>}
               note={missingCost ? 'Sem margem enquanto faltar custo.' : 'Lucro bruto ÷ faturamento confirmado'} />
          <Kpi label="Pedidos pagos" value={<span className="value">{report.ordersPaid}</span>}
               note={`Ticket médio ${money(report.averageTicket)} · ${plural(report.unitsSold, 'unidade')}`} />
        </section>

        <div className="grid-main">
          <section className="card stack-md" aria-labelledby="evolucao-titulo">
            <div>
              <h2 id="evolucao-titulo">Evolução diária</h2>
              <p className="card-sub">Faturamento confirmado e lucro bruto por dia, em reais</p>
            </div>
            <RevenueChart label="Faturamento confirmado e lucro bruto por dia"
                          data={report.daily.map(d => ({ date: d.date, net: d.netRevenue.amount, profit: d.grossProfit?.amount ?? null }))} />
          </section>
          <section className="card stack-md" aria-labelledby="atencao-titulo">
            <div>
              <h2 id="atencao-titulo">Precisa de atenção</h2>
              <p className="card-sub">Exceções agora, com o caminho para resolver</p>
            </div>
            <ul className="attn">
              <LowStockItem count={report.lowStockCount} products={lowStock.data?.content ?? []} failed={Boolean(lowStock.error)} />
              {report.pendingPaymentCount > 0
                ? <li><span className="attn-icon is-info"><Icon name="calendario" /></span><div>
                    <p className="attn-title">Pedidos aguardando pagamento</p>
                    <p>{plural(report.pendingPaymentCount, 'pedido')} somam {money(report.pendingPaymentAmount)} e mantêm o estoque reservado.</p>
                    <Link href="/vendas?situacao=PENDING_PAYMENT">Ver pedidos pendentes</Link></div></li>
                : <li><span className="attn-icon is-success"><Icon name="sucesso" /></span><div>
                    <p className="attn-title">Nenhum pedido aguardando pagamento</p>
                    <p>Todo pedido criado já foi pago ou cancelado.</p></div></li>}
              {missingCost && <li><span className="attn-icon is-warning"><Icon name="alerta" /></span><div>
                <p className="attn-title">Vendas sem custo informado</p>
                <p>Lucro e margem ficam como “Não informado” até o custo entrar pelo registro de entrada.</p>
                <Link href="/gestao/estoque">Abrir estoque</Link></div></li>}
            </ul>
          </section>
        </div>

        <div className="grid-main">
          <Goals summary={summary.data} error={summary.error} month={month} />
          <section className="card stack-md" aria-labelledby="pagamentos-titulo">
            <div>
              <h2 id="pagamentos-titulo">Formas de pagamento</h2>
              <p className="card-sub">Participação no faturamento confirmado do período</p>
            </div>
            <StackedBar label="Participação de cada forma de pagamento" colors={PAYMENT_COLORS}
                        items={payments.map(m => ({ key: m.method, label: label(PAYMENT_TYPE, m.method), value: m.netRevenue.amount, orders: m.ordersPaid }))} />
          </section>
        </div>

        <div className="grid-main">
          <section className="card stack-md" aria-labelledby="produtos-titulo">
            <div className="card-head">
              <div>
                <h2 id="produtos-titulo">Produtos mais vendidos</h2>
                <p className="card-sub">Por faturamento confirmado no período</p>
              </div>
              <div className="field"><label htmlFor="filtro-produto" className="sr-only">Buscar produto</label>
                <input id="filtro-produto" className="input" type="search" placeholder="Buscar produto" value={productFilter}
                       onChange={event => setProductFilter(event.target.value)} /></div>
            </div>
            {products.length === 0 ? <p className="empty">Nenhum produto vendido no período.</p>
              : <><TableWrap label="Produtos mais vendidos" className="only-desktop"><table>
              <caption className="sr-only">Produtos mais vendidos</caption>
              <thead><tr><th scope="col">Produto</th><th scope="col" className="right">Unid.</th><th scope="col" className="right">Faturamento</th>
                <th scope="col" className="right">Lucro</th></tr></thead>
              <tbody>{products.map(p => (
                <tr key={p.productId}><td><div className="product-cell"><ProductThumb sku={p.sku} name={p.name} />
                  <span>{p.name}<span className="cell-sub id">{p.sku}</span></span></div></td>
                  <td className="num right">{p.unitsSold}</td>
                  <td className="num right">{money(p.netRevenue)}</td><td className="num right">{money(p.grossProfit)}</td></tr>
              ))}</tbody>
            </table></TableWrap>
              <ul className="list only-mobile" aria-label="Produtos mais vendidos">
                {products.map(p => (
                  <li key={p.productId}>
                    <div className="product-cell"><ProductThumb sku={p.sku} name={p.name} />
                      <span><span className="list-title">{p.name}</span><span className="cell-sub id">{p.sku}</span></span></div>
                    <div className="list-row"><span className="caption num">{plural(p.unitsSold, 'unidade')} · lucro {money(p.grossProfit)}</span>
                      <strong className="num">{money(p.netRevenue)}</strong></div>
                  </li>
                ))}
              </ul></>}
            {matching.length > TOP_PRODUCTS && <p className="muted">
              Mostrando {TOP_PRODUCTS} de {matching.length}. <Link href="/gestao/analises">Ver todos</Link></p>}
          </section>
          <section className="card stack-md" aria-labelledby="ranking-titulo">
            <div>
              <h2 id="ranking-titulo">Vendedores no período</h2>
              <p className="card-sub">Faturamento confirmado de cada pessoa</p>
            </div>
            <RankingBars label="Vendedores do maior para o menor faturamento"
                         items={report.bySeller.map(s => ({ key: s.seller.id, label: s.seller.name, value: s.netRevenue.amount, detail: plural(s.ordersPaid, 'pedido') }))} />
          </section>
        </div>
      </>}
    </div>
  );
}

type StockItem = z.infer<typeof ListStockProductsResponse>['content'][number];

/** Exceção de estoque: ate tres produtos com o disponivel e o minimo, e o caminho direto para a lista filtrada. */
function LowStockItem({ count, products, failed }: { count: number; products: readonly StockItem[]; failed: boolean }) {
  if (count === 0) {
    return <li><span className="attn-icon is-success"><Icon name="sucesso" /></span><div>
      <p className="attn-title">Estoque acima do mínimo</p>
      <p>Nenhum produto vendável abaixo do mínimo.</p>
      <Link href="/gestao/estoque">Abrir estoque</Link></div></li>;
  }
  const shown = products.slice(0, 3);
  return (
    <li><span className="attn-icon is-warning"><Icon name="alerta" /></span><div>
      <p className="attn-title">{plural(count, 'produto')} abaixo do mínimo</p>
      {failed || shown.length === 0
        ? <p>Disponível menor que o estoque mínimo.</p>
        : <p>{shown.map(p => `${p.name}: ${plural(p.available, 'disponível', 'disponíveis')}, mínimo ${p.minLevel}`).join('; ')}
            {count > shown.length ? `; e mais ${count - shown.length}` : ''}.</p>}
      <Link href="/gestao/estoque?abaixo=1">Ver produtos abaixo do mínimo</Link></div></li>
  );
}

/** Metas do mes: medidor da loja com o ritmo esperado e a tabela meta, realizado, falta e atingimento por pessoa. */
function Goals({ summary, error, month }: { summary: Summary | undefined; error: unknown; month: string }) {
  const goal = summary?.storeGoal.amount ?? 0;
  const realized = summary?.storeRealized.amount ?? 0;
  const pace = monthPace(month);
  return (
    <section className="card stack-md" aria-labelledby="meta-titulo">
      <div>
        <h2 id="meta-titulo">Vendedores e metas</h2>
        <p className="card-sub">{sentence(formatMonth(month))} · Realizado = vendas pagas menos estornos</p>
      </div>
      <ErrorNotice error={error} />
      {summary && (summary.state === 'SEM_META'
        ? <p className="notice">A meta da loja para {formatMonth(month)} não foi definida. Realizado até agora: <strong>{money(summary.storeRealized)}</strong>.</p>
        : <Meter realized={realized} goal={goal} pace={pace}
                 head={<><span className="label">Meta da loja</span>
                   <span><strong className="kpi-sm">{formatPercent(summary.achievementPercent)}</strong>
                     <span className="muted"> · {summary.state === 'META_ATINGIDA' ? 'meta atingida' : `faltam ${money(summary.remaining)}`}</span></span></>}
                 legend={<><span className="num">Realizado {money(summary.storeRealized)}</span>
                   {pace !== null && <span>Marca = ritmo esperado hoje</span>}
                   <span className="num">Meta {money(summary.storeGoal)}</span></>} />)}
      {summary && summary.team.length > 0 && <><TableWrap label="Vendedores e metas" className="only-desktop"><table>
        <caption className="sr-only">Meta e realizado por pessoa em {formatMonth(month)}</caption>
        <thead><tr><th scope="col">Pessoa</th><th scope="col" className="right">Meta</th><th scope="col" className="right">Realizado</th>
          <th scope="col" className="right">Falta</th><th scope="col" className="right">Atingimento</th></tr></thead>
        <tbody>{summary.team.map(member => {
          const noGoal = member.state === 'SEM_META';
          return (
            <tr key={member.seller.id}>
              <td><span className="person"><span className="avatar avatar-sm" aria-hidden="true">{initials(member.seller.name)}</span>{member.seller.name}</span></td>
              <td className="num right">{noGoal ? 'Sem meta' : money(member.goal)}</td>
              <td className="num right">{money(member.realized)}</td>
              <td className="num right">{noGoal ? '—' : money(Math.max(member.goal.amount - member.realized.amount, 0))}</td>
              <td className="num right">{noGoal ? 'Sem meta individual'
                : <MiniMeter realized={member.realized.amount} goal={member.goal.amount} percent={member.achievementPercent} />}</td>
            </tr>
          );
        })}</tbody>
        <tfoot><tr>
          <td>Total da loja</td>
          <td className="num right">{summary.state === 'SEM_META' ? 'Sem meta' : money(summary.storeGoal)}</td>
          <td className="num right">{money(summary.storeRealized)}</td>
          <td className="num right">{summary.state === 'SEM_META' ? '—' : money(summary.remaining)}</td>
          <td className="num right">{summary.state === 'SEM_META' ? 'Sem meta' : formatPercent(summary.achievementPercent)}</td>
        </tr></tfoot>
      </table></TableWrap>
        <ul className="list only-mobile" aria-label={`Meta e realizado por pessoa em ${formatMonth(month)}`}>
          {summary.team.map(member => (
            <li key={member.seller.id}>
              <div className="list-row">
                <span className="person"><span className="avatar avatar-sm" aria-hidden="true">{initials(member.seller.name)}</span>
                  <span className="list-title">{member.seller.name}</span></span>
                {member.state === 'SEM_META' ? <span className="caption">Sem meta individual</span>
                  : <MiniMeter realized={member.realized.amount} goal={member.goal.amount} percent={member.achievementPercent} />}
              </div>
              <p className="caption num">Realizado {money(member.realized)}{member.state === 'SEM_META' ? ''
                : ` · meta ${money(member.goal)} · falta ${money(Math.max(member.goal.amount - member.realized.amount, 0))}`}</p>
            </li>
          ))}
        </ul></>}
    </section>
  );
}
