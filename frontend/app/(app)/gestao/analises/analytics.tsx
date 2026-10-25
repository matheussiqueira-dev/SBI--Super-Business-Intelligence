'use client';
// Analises (WP-3.11): views do V6 por mes (semanas, formas de pagamento, margem, promocoes) e posicao de estoque.
// Margem e custo ficam "Nao informado" quando falta custo (C-20); nunca zero inventado. Cada pergunta tem a forma do manual
// v2.0 (quadro 21): colunas com a meta do periodo, barra 100% para composicao e tabela para o detalhe.
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { GetManagementSummaryResponse, GetSalesAnalyticsResponse, GetStockAnalyticsResponse } from '../../../../lib/api/generated/sbi.zod.ts';
import { api } from '../../../../lib/api/http.ts';
import { formatMonth, formatPercent, formatShortRange, label, money, PAYMENT_TYPE, plural, sentence } from '../../../../lib/format.ts';
import { ErrorNotice, Loading } from '../../../../components/feedback.tsx';
import { periodGoal } from '../../../../lib/goals.ts';
import { ColumnChart, StackedBar } from '../../../../components/charts.tsx';
import { Kpi, MoneyValue } from '../../../../components/kpi.tsx';
import PageHeader from '../../../../components/page-header.tsx';
import TableWrap from '../../../../components/table-wrap.tsx';

const PAYMENT_COLORS: Readonly<Record<string, string>> = { PIX: 'var(--sbi-data-1)', CARD: 'var(--sbi-data-2)', BOLETO: 'var(--sbi-data-3)' };
const PAYMENT_ORDER = ['PIX', 'CARD', 'BOLETO'];

function thisMonth(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit' }).format(new Date());
}

export default function Analytics() {
  const [month, setMonth] = useState(thisMonth());
  const valid = /^\d{4}-\d{2}$/.test(month);
  const sales = useQuery({
    queryKey: ['analytics-sales', month],
    queryFn: ({ signal }) => api.request(`/analytics/sales?month=${month}`, { signal, schema: GetSalesAnalyticsResponse }),
    enabled: valid,
  });
  // Mesma chave da Visao geral: no mes corrente a meta ja vem do cache.
  const goals = useQuery({
    queryKey: ['summary', month],
    queryFn: ({ signal }) => api.request(`/management/summary?period=${month}`, { signal, schema: GetManagementSummaryResponse }),
    enabled: valid,
  });
  const stock = useQuery({
    queryKey: ['analytics-stock'],
    queryFn: ({ signal }) => api.request('/analytics/stock', { signal, schema: GetStockAnalyticsResponse }),
  });
  const data = sales.data;
  const monthGoal = goals.data && goals.data.state !== 'SEM_META' ? goals.data.storeGoal.amount : 0;
  const payments = data ? [...data.byPaymentMethod].sort((a, b) => PAYMENT_ORDER.indexOf(a.method) - PAYMENT_ORDER.indexOf(b.method)) : [];
  return (
    <div className="stack">
      <PageHeader section="Gestão" title="Análises"
        description={`${valid ? sentence(formatMonth(month)) : 'Mês'} · pagamentos confirmados menos estornos; margem só onde há custo informado`}
        actions={<div className="field"><label htmlFor="mes-analise">Mês</label>
          <input id="mes-analise" className="input" type="month" value={month} onChange={event => setMonth(event.target.value)} /></div>} />
      <ErrorNotice error={sales.error} />
      {sales.isLoading && <Loading />}
      {data && <>
        <div className="grid-main">
          <section className="card stack-md" aria-labelledby="semanas-titulo">
            <div>
              <h2 id="semanas-titulo">Realizado por semana</h2>
              <p className="card-sub">{monthGoal > 0 ? 'Meta do período = meta mensal proporcional aos dias da semana' : 'Sem meta da loja para este mês'}</p>
            </div>
            <ColumnChart label={`Realizado por semana em ${formatMonth(month)}`} valueLabel="Realizado"
                         data={data.weekly.map(w => ({ label: formatShortRange(w.start, w.end), value: w.realized.amount,
                           goal: monthGoal > 0 ? periodGoal(monthGoal, month, w.start, w.end) : null }))} />
          </section>
          <section className="card stack-md" aria-labelledby="formas-titulo">
            <div>
              <h2 id="formas-titulo">Formas de pagamento</h2>
              <p className="card-sub">Participação no faturamento confirmado do mês</p>
            </div>
            <StackedBar label="Participação de cada forma de pagamento" colors={PAYMENT_COLORS}
                        items={payments.map(m => ({ key: m.method, label: label(PAYMENT_TYPE, m.method), value: m.netRevenue.amount, orders: m.ordersPaid }))} />
          </section>
        </div>
        <section className="card stack-md" aria-labelledby="margem-titulo">
          <div>
            <h2 id="margem-titulo">Margem por produto</h2>
            <p className="card-sub">Margem = faturamento − custo; produto com item sem custo fica sinalizado</p>
          </div>
          {data.productMargins.length === 0 ? <p className="empty">Sem vendas pagas no mês.</p> : <TableWrap label="Margem por produto"><table>
            <caption className="sr-only">Margem por produto</caption>
            <thead><tr><th scope="col">Produto</th><th scope="col" className="right">Unid.</th><th scope="col" className="right">Faturamento</th>
              <th scope="col" className="right">Custo</th><th scope="col" className="right">Margem</th><th scope="col" className="right">%</th></tr></thead>
            <tbody>{data.productMargins.map(m => (
              <tr key={m.productId} className={m.itemsWithoutCost > 0 ? 'is-alert' : undefined}>
                <td>{m.name}{m.itemsWithoutCost > 0 && <span className="cell-sub"><span className="pill pill-warn">{plural(m.itemsWithoutCost, 'item sem custo', 'itens sem custo')}</span></span>}</td>
                <td className="num right">{m.units}</td><td className="num right">{money(m.netRevenue)}</td><td className="num right">{money(m.cost)}</td>
                <td className="num right">{money(m.grossMargin)}</td><td className="num right">{formatPercent(m.marginPercent)}</td></tr>
            ))}</tbody>
          </table></TableWrap>}
        </section>
        <div className="grid-2">
          <section className="card stack-md" aria-labelledby="promo-uso-titulo">
            <div>
              <h2 id="promo-uso-titulo">Uso de promoções</h2>
              <p className="card-sub">Itens vendidos com promoção e o desconto concedido</p>
            </div>
            {data.promotionUsage.length === 0 ? <p className="empty">Nenhuma promoção usada no mês.</p> : <TableWrap label="Uso de promoções"><table>
              <caption className="sr-only">Uso de promoções</caption>
              <thead><tr><th scope="col">Promoção</th><th scope="col" className="right">Itens</th><th scope="col" className="right">Desconto</th><th scope="col" className="right">Faturamento</th></tr></thead>
              <tbody>{data.promotionUsage.map(u => (
                <tr key={u.promotionId}><td>{u.name}</td><td className="num right">{u.items}</td><td className="num right">{money(u.discountTotal)}</td><td className="num right">{money(u.netRevenue)}</td></tr>
              ))}</tbody>
            </table></TableWrap>}
          </section>
          <section className="card stack-md" aria-labelledby="desconto-manual-titulo">
            <div>
              <h2 id="desconto-manual-titulo">Descontos manuais</h2>
              <p className="card-sub">Concedidos no balcão em pedidos pagos, por vendedor</p>
            </div>
            {data.manualDiscounts.length === 0 ? <p className="empty">Nenhum desconto manual em pedidos pagos no mês.</p> : <TableWrap label="Descontos manuais por vendedor"><table>
              <caption className="sr-only">Descontos manuais por vendedor</caption>
              <thead><tr><th scope="col">Vendedor</th><th scope="col" className="right">Pedidos</th><th scope="col" className="right">Concedido</th><th scope="col" className="right">Aprovados pelo gerente</th></tr></thead>
              <tbody>{data.manualDiscounts.map(d => (
                <tr key={d.seller.id}><td>{d.seller.name}</td><td className="num right">{d.orders}</td><td className="num right">{money(d.amount)}</td><td className="num right">{d.approvedByManager}</td></tr>
              ))}</tbody>
            </table></TableWrap>}
          </section>
        </div>
      </>}
      <section className="stack-md" aria-labelledby="estoque-analise">
        <div>
          <h2 id="estoque-analise">Estoque agora</h2>
          <p className="page-desc">Saldo físico de todos os produtos ativos, pelo custo médio e pelo preço atual</p>
        </div>
        <ErrorNotice error={stock.error} />
        {stock.data && <div className="kpis">
          <Kpi label="Produtos ativos" value={<span className="value">{stock.data.products}</span>} note={plural(stock.data.units, 'unidade')} />
          <Kpi label="Valor a custo" value={<MoneyValue value={stock.data.valueAtCost} />}
               note={stock.data.productsWithoutCost > 0 ? `${plural(stock.data.productsWithoutCost, 'produto')} sem custo informado` : 'Saldo × custo médio'} />
          <Kpi label="Valor a preço de venda" value={<MoneyValue value={stock.data.valueAtPrice} />} note="Saldo × preço atual" />
          <Kpi label="Abaixo do mínimo" value={<span className="value">{stock.data.belowMin.length}</span>}
               note={stock.data.belowMin.length > 0 ? <Link href="/gestao/estoque?abaixo=1">{stock.data.belowMin.map(p => p.name).slice(0, 2).join(', ')}{stock.data.belowMin.length > 2 ? '…' : ''}</Link> : 'Nenhum produto abaixo do mínimo'} />
        </div>}
      </section>
    </div>
  );
}
