'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ListCustomersResponse } from '../../../lib/api/generated/sbi.zod.ts';
import { api } from '../../../lib/api/http.ts';
import { formatDateTime, plural } from '../../../lib/format.ts';
import { ErrorNotice, Loading } from '../../../components/feedback.tsx';
import CustomerForm from '../../../components/customer-form.tsx';
import { useModal } from '../../../components/use-modal.ts';
import { Icon } from '../../../components/brand/icons.tsx';
import EmptyState from '../../../components/empty-state.tsx';
import PageHeader from '../../../components/page-header.tsx';
import Pager from '../../../components/pager.tsx';
import TableWrap from '../../../components/table-wrap.tsx';

/** Busca por CPF/CNPJ (so digitos) ou prefixo do nome (C-11); documento mascarado para o VENDEDOR (C-12). */
export default function CustomerList() {
  const router = useRouter();
  const [term, setTerm] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const dialog = useModal(drawer);

  useEffect(() => {
    const timer = setTimeout(() => { setQ(term.trim()); setPage(0); }, 250);
    return () => clearTimeout(timer);
  }, [term]);

  const query = useQuery({
    queryKey: ['customers-list', q, page],
    queryFn: ({ signal }) => api.request(`/customers?${new URLSearchParams({ q, page: String(page), size: '20' })}`,
      { signal, schema: ListCustomersResponse }),
    placeholderData: keepPreviousData,
  });
  const data = query.data;

  return (
    <div className="stack">
      <PageHeader section="Atendimento" title="Clientes"
        description="Busque por CPF, CNPJ ou nome. Para o perfil Vendedor, o documento aparece mascarado."
        actions={<button type="button" className="btn btn-primary" onClick={() => setDrawer(true)}><Icon name="mais" />Cadastrar cliente</button>} />
      <section className="card stack-md" aria-label="Lista de clientes">
        <div className="field">
          <label htmlFor="busca-clientes">Buscar cliente</label>
          <input id="busca-clientes" className="input" type="search" autoComplete="off" value={term} onChange={event => setTerm(event.target.value)} />
        </div>
        <ErrorNotice error={query.error} />
        {query.isLoading ? <Loading label="Carregando clientes…" /> : data && data.content.length === 0
          ? <EmptyState icon="clientes" title={q ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}>
              {q ? 'Confira o documento completo ou as primeiras letras do nome, ou use “Cadastrar cliente”.' : 'Use “Cadastrar cliente”: o cadastro fica disponível no PDV.'}
            </EmptyState>
          : data && <><TableWrap label="Clientes" className="only-desktop"><table>
              <caption className="sr-only">Clientes</caption>
              <thead><tr><th scope="col">Nome</th><th scope="col">Documento</th><th scope="col">Contato</th>
                <th scope="col" className="right">Pedidos</th><th scope="col">Último pedido</th></tr></thead>
              <tbody>{data.content.map(customer => (
                <tr key={customer.id}>
                  <td><Link href={`/clientes/${customer.id}`}>{customer.name}</Link></td>
                  <td className="id">{customer.document}</td>
                  <td>{customer.email ?? '—'}{customer.phone && <span className="cell-sub">{customer.phone}</span>}</td>
                  <td className="num right">{customer.ordersCount}</td>
                  <td className="num">{customer.lastOrderAt ? formatDateTime(customer.lastOrderAt) : '—'}</td>
                </tr>
              ))}</tbody>
            </table></TableWrap>
            <ul className="list only-mobile" aria-label="Clientes">
              {data.content.map(customer => (
                <li key={customer.id}>
                  <div className="list-row"><Link className="list-title" href={`/clientes/${customer.id}`}>{customer.name}</Link>
                    <span className="caption num">{plural(customer.ordersCount, 'pedido')}</span></div>
                  <div className="list-row"><span className="caption id">{customer.document}</span>
                    <span className="caption">{customer.lastOrderAt ? `Último: ${formatDateTime(customer.lastOrderAt)}` : 'Sem pedidos'}</span></div>
                </li>
              ))}
            </ul></>}
        {data && <Pager page={data.page} size={data.size} total={data.totalElements} onPage={setPage} noun="clientes" />}
      </section>
      <dialog ref={dialog} className="drawer" aria-labelledby="cadastro-cliente" onClose={() => setDrawer(false)}>
        <div className="stack">
          <div className="drawer-head">
            <h2 id="cadastro-cliente">Cadastrar cliente</h2>
            <button type="button" className="btn btn-quiet" onClick={() => setDrawer(false)}><Icon name="fechar" />Fechar</button>
          </div>
          {drawer && <CustomerForm idPrefix="novo-cliente" onCancel={() => setDrawer(false)}
                                   onCreated={created => { setDrawer(false); router.push(`/clientes/${created.id}`); }}
                                   onExisting={id => { setDrawer(false); router.push(`/clientes/${id}`); }} />}
        </div>
      </dialog>
    </div>
  );
}
