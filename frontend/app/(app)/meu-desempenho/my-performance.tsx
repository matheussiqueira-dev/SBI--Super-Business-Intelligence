'use client';
// Meu desempenho (WP-3.11, DEC-ERP-01; manual v2.0, figuras 47 e 48): so os dados da sessao. Meta zero = "Sem meta", sem
// percentual (DOM-08). Realizado, meta, atingimento e falta, o medidor com o ritmo do mes e as ultimas vendas de quem vende.
import { useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { GetMyPerformanceResponse, ListSalesOrdersResponse } from '../../../lib/api/generated/sbi.zod.ts';
import { api } from '../../../lib/api/http.ts';
import { formatDay, formatMonth, formatPercent, label, money, ORDER_STATUS, sentence, statusPill } from '../../../lib/format.ts';
import { ErrorNotice, Loading } from '../../../components/feedback.tsx';
import { Kpi, MoneyValue } from '../../../components/kpi.tsx';
import { monthPace } from '../../../lib/goals.ts';
import { Meter } from '../../../components/meter.tsx';
import { Icon } from '../../../components/brand/icons.tsx';
import EmptyState from '../../../components/empty-state.tsx';
import PageHeader from '../../../components/page-header.tsx';
import TableWrap from '../../../components/table-wrap.tsx';

const STATE: Readonly<Record<string, string>> = { SEM_META: 'Sem meta', EM_ANDAMENTO: 'Em andamento', META_ATINGIDA: 'Meta atingida' };
const STATE_PILL: Readonly<Record<string, string>> = { SEM_META: 'pill', EM_ANDAMENTO: 'pill pill-info', META_ATINGIDA: 'pill pill-ok' };
/** Ultimas vendas no topo de Meu desempenho; a lista inteira fica em Vendas. */
const RECENT = 5;

/** Titulo que diz a conclusao: quanto falta, meta batida ou mes sem meta. */
function conclusion(state: string, remaining: string): string {
  if (state === 'META_ATINGIDA') return 'Você bateu a sua meta do mês.';
  if (state === 'SEM_META') return 'Sem meta definida para este mês.';
  return `Faltam ${remaining} para a sua meta.`;
}

function thisMonth(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit' }).format(new Date());
}

export default function MyPerformance({ manager = false }: { manager?: boolean }) {
  const [month, setMonth] = useState(thisMonth());
  const valid = /^\d{4}-\d{2}$/.test(month);
  const query = useQuery({
    queryKey: ['performance', month],
    queryFn: ({ signal }) => api.request(`/performance/me?period=${month}`, { signal, schema: GetMyPerformanceResponse }),
    enabled: valid,
  });
  const data = query.data;
  const noGoal = data?.state === 'SEM_META';
  return (
    <div className="stack">
      <PageHeader section="Meu espaço" title="Meu desempenho"
        description={`${valid ? sentence(formatMonth(month)) : 'Mês'} · suas vendas pagas, descontados os estornos`}
        actions={<>
          <div className="field"><label htmlFor="mes">Mês</label>
            <input id="mes" className="input" type="month" value={month} onChange={event => setMonth(event.target.value)} /></div>
          <Link className="btn" href="/vendas">{manager ? 'Ver as vendas da loja' : 'Ver minhas vendas'}</Link>
          <Link className="btn btn-primary" href="/vender"><Icon name="mais" />Nova venda</Link>
        </>} />
      <ErrorNotice error={query.error} />
      {query.isLoading && <Loading />}
      {data && <>
        <section className="kpis" aria-label="Seus indicadores do mês">
          <Kpi label="Realizado" value={<MoneyValue value={data.realized} />} note="Vendas pagas menos estornos" />
          <Kpi label="Meta" value={noGoal ? <span className="value text">Sem meta</span> : <MoneyValue value={data.goal} />}
               note={noGoal ? 'O gerente define a meta do mês' : 'Definida pelo gerente'} />
          <Kpi label="Atingimento" value={<span className={noGoal ? 'value text' : 'value'}>{noGoal ? 'Sem meta' : formatPercent(data.achievementPercent)}</span>}
               note="Realizado ÷ meta" />
          <Kpi label="Falta" value={noGoal ? <span className="value text">Sem meta</span> : <MoneyValue value={data.remaining} />}
               note={data.state === 'META_ATINGIDA' ? 'Meta batida' : 'Para chegar à meta'} />
        </section>
        <section className="card stack-md" aria-labelledby="meta-titulo">
          <div className="card-head">
            <div>
              <h2 id="meta-titulo">{conclusion(data.state, money(data.remaining))}</h2>
              <p className="card-sub">{sentence(formatMonth(month))}</p>
            </div>
            <span className={STATE_PILL[data.state] ?? 'pill pill-info'}>{STATE[data.state] ?? data.state}</span>
          </div>
          {noGoal
            ? <p className="muted">Sem meta, o realizado continua contando: <strong className="num">{money(data.realized)}</strong> em {formatMonth(month)}.</p>
            : <Meter realized={data.realized.amount} goal={data.goal.amount} pace={monthPace(month)}
                     legend={<><span className="num">Realizado {money(data.realized)}</span>
                       {monthPace(month) !== null && <span>Marca = ritmo esperado hoje</span>}
                       <span className="num">Meta {money(data.goal)}</span></>} />}
        </section>
        {!manager && <RecentSales />}
      </>}
    </div>
  );
}

/** Ultimas vendas de quem vende (a API ja limita ao vendedor, C-10); mesma consulta da primeira pagina de Vendas. */
function RecentSales() {
  const sales = useQuery({
    queryKey: ['sales', '', 0],
    queryFn: ({ signal }) => api.request(`/sales/orders?${new URLSearchParams({ page: '0', size: '20' })}`, { signal, schema: ListSalesOrdersResponse }),
    placeholderData: keepPreviousData,
  });
  const recent = sales.data?.content.slice(0, RECENT) ?? [];
  return (
    <section className="card stack-md" aria-labelledby="ultimas-titulo">
      <div className="card-head">
        <div>
          <h2 id="ultimas-titulo">Minhas últimas vendas</h2>
          <p className="card-sub">Pedido aguardando pagamento ainda não conta para o realizado</p>
        </div>
        <Link className="card-link" href="/vendas">Ver todas</Link>
      </div>
      <ErrorNotice error={sales.error} />
      {sales.isLoading ? <Loading label="Carregando vendas…" /> : recent.length === 0
        ? <EmptyState icon="vendas" title="Você ainda não registrou vendas" action={<Link className="btn btn-primary" href="/vender">Nova venda</Link>}>
            As vendas pagas aparecem aqui e entram no seu realizado.
          </EmptyState>
        : <>
          <TableWrap label="Minhas últimas vendas" className="only-desktop"><table>
            <caption className="sr-only">Minhas últimas vendas</caption>
            <thead><tr><th scope="col">Pedido</th><th scope="col">Cliente</th><th scope="col">Data</th><th scope="col" className="right">Valor</th><th scope="col">Situação</th></tr></thead>
            <tbody>{recent.map(sale => (
              <tr key={sale.id}>
                <td><Link className="id" href={`/vendas/${sale.id}`}>#{sale.id}</Link></td>
                <td>{sale.customer.name}</td>
                <td className="num">{formatDay(sale.createdAt)}</td>
                <td className="num right">{money(sale.total)}</td>
                <td><span className={statusPill(sale.status)}>{label(ORDER_STATUS, sale.status)}</span></td>
              </tr>
            ))}</tbody>
          </table></TableWrap>
          <ul className="list only-mobile" aria-label="Minhas últimas vendas">
            {recent.map(sale => (
              <li key={sale.id}>
                <div className="list-row"><span className="list-title">{sale.customer.name}</span><strong className="num">{money(sale.total)}</strong></div>
                <div className="list-row"><span className="caption"><Link className="id" href={`/vendas/${sale.id}`}>#{sale.id}</Link> · {formatDay(sale.createdAt)}</span>
                  <span className={statusPill(sale.status)}>{label(ORDER_STATUS, sale.status)}</span></div>
              </li>
            ))}
          </ul>
        </>}
    </section>
  );
}
