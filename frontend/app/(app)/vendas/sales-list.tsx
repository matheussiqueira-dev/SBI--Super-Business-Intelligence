'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ListSalesOrdersResponse } from '../../../lib/api/generated/sbi.zod.ts';
import { api } from '../../../lib/api/http.ts';
import { formatDateTime, label, money, ORDER_STATUS, PAYMENT_TYPE, statusPill } from '../../../lib/format.ts';
import { ErrorNotice, Loading } from '../../../components/feedback.tsx';
import { Icon } from '../../../components/brand/icons.tsx';
import EmptyState from '../../../components/empty-state.tsx';
import PageHeader from '../../../components/page-header.tsx';
import Pager from '../../../components/pager.tsx';
import TableWrap from '../../../components/table-wrap.tsx';

/** Filtro e pagina vao para o endereco sem nova chamada ao servidor: voltar do detalhe reabre a mesma lista. */
function syncAddress(status: string, page: number) {
  const params = new URLSearchParams();
  if (status) params.set('situacao', status);
  if (page > 0) params.set('pagina', String(page + 1));
  const query = params.toString();
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
}

/** ?situacao= so com um estado conhecido; ?pagina= comeca em 1 no endereco e em 0 na API. */
function fromAddress(params: Pick<URLSearchParams, 'get'>): { status: string; page: number } {
  const situacao = params.get('situacao') ?? '';
  const pagina = params.get('pagina') ?? '';
  return {
    status: Object.hasOwn(ORDER_STATUS, situacao) ? situacao : '',
    page: /^\d{1,4}$/.test(pagina) ? Math.max(Number(pagina) - 1, 0) : 0,
  };
}

/** VENDEDOR ve so as proprias vendas; GERENTE ve todas (C-10). Tabela no computador e lista no celular (manual v2.0, secao 31). */
export default function SalesList({ manager }: { manager: boolean }) {
  const params = useSearchParams();
  const [status, setStatus] = useState(() => fromAddress(params).status);
  const [page, setPage] = useState(() => fromAddress(params).page);
  useEffect(() => { syncAddress(status, page); }, [status, page]);
  const query = useQuery({
    queryKey: ['sales', status, page],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ page: String(page), size: '20' });
      if (status) params.set('status', status);
      return api.request(`/sales/orders?${params}`, { signal, schema: ListSalesOrdersResponse });
    },
    placeholderData: keepPreviousData,
  });
  const data = query.data;
  return (
    <div className="stack">
      <PageHeader section="Atendimento" title="Vendas"
        description={manager ? 'Todas as vendas da loja. O pedido conta no realizado de quem vendeu quando o pagamento é confirmado.'
          : 'As vendas feitas por você. O pedido conta no seu realizado quando o pagamento é confirmado.'}
        actions={<Link className="btn btn-primary" href="/vender"><Icon name="mais" />Nova venda</Link>} />
      <section className="card stack-md" aria-label="Lista de vendas">
        <div className="toolbar">
          <div className="field">
            <label htmlFor="filtro-status">Situação</label>
            <select id="filtro-status" className="select" value={status} onChange={event => { setStatus(event.target.value); setPage(0); }}>
              <option value="">Todas</option>
              {Object.entries(ORDER_STATUS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
            </select>
          </div>
        </div>
        <ErrorNotice error={query.error} />
        {query.isLoading ? <Loading label="Carregando vendas…" /> : data && data.content.length === 0
          ? page > 0
            ? <EmptyState icon="vendas" title="Esta página não tem vendas" action={<button type="button" className="btn" onClick={() => setPage(0)}>Ir para a primeira página</button>} />
            : status
            ? <EmptyState icon="filtro" title={`Nenhuma venda com a situação “${label(ORDER_STATUS, status)}”`}
                          action={<button type="button" className="btn" onClick={() => { setStatus(''); setPage(0); }}>Ver todas as vendas</button>} />
            : <EmptyState icon="vendas" title={manager ? 'Nenhuma venda registrada ainda' : 'Você ainda não registrou vendas'}
                          action={<Link className="btn btn-primary" href="/vender">Nova venda</Link>}>
                As vendas pagas aparecem aqui e entram no realizado de quem vendeu.
              </EmptyState>
          : data && <>
            <TableWrap label="Vendas" className="only-desktop"><table>
              <caption className="sr-only">Vendas</caption>
              <thead><tr>
                <th scope="col">Pedido</th><th scope="col">Data</th><th scope="col">Cliente</th>
                {manager && <th scope="col">Vendedor</th>}<th scope="col">Pagamento</th><th scope="col">Situação</th><th scope="col" className="right">Total</th>
              </tr></thead>
              <tbody>{data.content.map(sale => (
                <tr key={sale.id}>
                  <td><Link href={`/vendas/${sale.id}`} className="id">#{sale.id}</Link></td>
                  <td className="num">{formatDateTime(sale.createdAt)}</td>
                  <td>{sale.customer.name}</td>
                  {manager && <td>{sale.seller.name}</td>}
                  <td>{label(PAYMENT_TYPE, sale.paymentType)}</td>
                  <td><span className={statusPill(sale.status)}>{label(ORDER_STATUS, sale.status)}</span></td>
                  <td className="num right">{money(sale.total)}</td>
                </tr>
              ))}</tbody>
            </table></TableWrap>
            <ul className="list only-mobile" aria-label="Vendas">
              {data.content.map(sale => (
                <li key={sale.id}>
                  <div className="list-row"><span className="list-title">{sale.customer.name}</span><strong className="num">{money(sale.total)}</strong></div>
                  <div className="list-row">
                    <span className="caption"><Link className="id" href={`/vendas/${sale.id}`}>#{sale.id}</Link> · {formatDateTime(sale.createdAt)}
                      {' · '}{label(PAYMENT_TYPE, sale.paymentType)}{manager ? ` · ${sale.seller.name}` : ''}</span>
                    <span className={statusPill(sale.status)}>{label(ORDER_STATUS, sale.status)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </>}
        {data && <Pager page={data.page} size={data.size} total={data.totalElements} onPage={setPage} noun="vendas" />}
      </section>
    </div>
  );
}
