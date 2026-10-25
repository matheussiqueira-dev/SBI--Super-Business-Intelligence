'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import type { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApproveOrderDiscountBody, ApproveOrderDiscountResponse, CancelOrderResponse, ConfirmSalePaymentResponse, GetSalesOrderResponse,
} from '../../../../lib/api/generated/sbi.zod.ts';
import { ApiError, api } from '../../../../lib/api/http.ts';
import { invalidateAfterSale } from '../../../../lib/api/invalidate.ts';
import { discountMoney, formatDateTime, label, money, ORDER_STATUS, statusPill, PAYMENT_TYPE } from '../../../../lib/format.ts';
import { ErrorNotice, Loading } from '../../../../components/feedback.tsx';
import { Field } from '../../../../components/customer-form.tsx';
import ConfirmDialog from '../../../../components/confirm-dialog.tsx';
import EmptyState from '../../../../components/empty-state.tsx';
import PageHeader from '../../../../components/page-header.tsx';
import ProductThumb from '../../../../components/product-thumb.tsx';
import { StatusMessage, useStatusMessage } from '../../../../components/status-message.tsx';
import TableWrap from '../../../../components/table-wrap.tsx';

function NotFound() {
  return (
    <section className="card">
      <EmptyState icon="vendas" title="Pedido não encontrado" action={<Link className="btn" href="/vendas">Voltar para vendas</Link>}>
        Ele não existe ou pertence a outro vendedor.
      </EmptyState>
    </section>
  );
}

/** Pedido de outro vendedor responde 404 na API e aparece como "Pedido nao encontrado" (WP-3.6). */
export default function SaleDetail({ orderId, manager = false }: { orderId: number | null; manager?: boolean }) {
  const client = useQueryClient();
  const status = useStatusMessage();
  const [askCancel, setAskCancel] = useState(false);
  const key = ['sale', orderId];
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => api.request(`/sales/orders/${orderId}`, { signal, schema: GetSalesOrderResponse }),
    enabled: orderId !== null,
  });
  const updated = (message: string) => (order: z.infer<typeof GetSalesOrderResponse>) => {
    client.setQueryData(key, order);
    void invalidateAfterSale(client);
    status.show(message);
  };
  const confirm = useMutation({
    mutationFn: () => api.request(`/sales/orders/${orderId}/payment`, { method: 'POST', schema: ConfirmSalePaymentResponse }),
    onSuccess: updated('Pagamento confirmado. Estoque baixado e venda contada na meta.'),
  });
  const cancel = useMutation({
    mutationFn: () => api.request(`/orders/${orderId}/cancel`, { method: 'POST', schema: CancelOrderResponse }),
    onSuccess: updated('Pedido cancelado. A reserva de estoque foi liberada.'),
  });

  if (orderId === null || (query.error instanceof ApiError && query.error.status === 404)) return <NotFound />;
  if (query.isLoading) return <Loading label="Carregando venda…" />;
  if (query.error || !query.data) return <ErrorNotice error={query.error} />;
  const order = query.data;
  const pending = order.status === 'PENDING_PAYMENT';
  const busy = confirm.isPending || cancel.isPending;
  return (
    <div className="stack">
      <PageHeader section={<><Link href="/vendas">Vendas</Link> / <span className="id">#{order.id}</span></>}
        title={<>Venda <span className="id">#{order.id}</span></>}
        badge={<span className={statusPill(order.status)}>{label(ORDER_STATUS, order.status)}</span>}
        description={`${formatDateTime(order.createdAt)} · ${order.customer.name} · vendida por ${order.seller.name}`}
        actions={pending ? <>
          <button type="button" className="btn btn-danger" disabled={busy} onClick={() => setAskCancel(true)}>
            {cancel.isPending ? 'Cancelando…' : 'Cancelar pedido'}</button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => confirm.mutate()}>
            {confirm.isPending ? 'Confirmando…' : 'Confirmar pagamento recebido'}</button>
        </> : undefined} />
      <StatusMessage message={status.message} onClose={status.clear} />
      <ErrorNotice error={confirm.error ?? cancel.error} />
      {pending && <p className="notice">O pedido reserva o estoque e ainda não conta para o realizado. Confirme quando o pagamento entrar.</p>}
      <section className="card stack-md" aria-labelledby="itens-titulo">
        <h2 id="itens-titulo">Itens e pagamento</h2>
        <dl className="facts">
          <div><dt>Cliente</dt><dd>{order.customer.name}</dd></div>
          <div><dt>Vendedor</dt><dd>{order.seller.name}</dd></div>
          <div><dt>Pagamento</dt><dd>{label(PAYMENT_TYPE, order.payment.type)}</dd></div>
          <div><dt>Entrega</dt><dd>{order.fulfillment === 'DELIVERY' && order.shippingAddress
            ? `${order.shippingAddress.street}, ${order.shippingAddress.number} · ${order.shippingAddress.city}/${order.shippingAddress.state}`
            : 'Retirada na loja'}</dd></div>
        </dl>
        <TableWrap label="Itens da venda"><table>
          <caption className="sr-only">Itens da venda</caption>
          <thead><tr><th scope="col">Produto</th><th scope="col" className="right">Qtd.</th><th scope="col" className="right">Unitário</th>
            <th scope="col" className="right">Desconto</th><th scope="col" className="right">Subtotal</th></tr></thead>
          <tbody>{order.items.map(item => (
            <tr key={item.productId}>
              <td><div className="product-cell"><ProductThumb sku={item.sku} name={item.name} /><span>{item.name}<span className="cell-sub id">{item.sku}</span></span></div></td>
              <td className="num right">{item.quantity}</td>
              <td className="num right">{money(item.unitPrice)}</td>
              <td className="num right">{discountMoney(item.discount)}</td>
              <td className="num right">{money(item.subtotal)}</td>
            </tr>
          ))}</tbody>
        </table></TableWrap>
        <dl className="totals">
          <div><dt>Subtotal</dt><dd className="num">{money(order.subtotal)}</dd></div>
          <div className="discount"><dt>Descontos</dt><dd className="num">{discountMoney(order.discountTotal)}</dd></div>
          <div className="total"><dt>Total</dt><dd className="num">{money(order.total)}</dd></div>
        </dl>
        {order.manualDiscount && <p className="muted">
          Desconto manual de {order.manualDiscount.percent.toString().replace('.', ',')}% ({money(order.manualDiscount.amount)}), já incluído nos itens.
          Motivo: {order.manualDiscount.reason}.{order.manualDiscount.approvedBy ? ` Aprovado por ${order.manualDiscount.approvedBy.name}.` : ''}</p>}
      </section>
      {manager && pending && <DiscountApproval orderId={order.id} onDone={updated('Desconto aplicado. Total e valor do pagamento recalculados.')} />}
      <ConfirmDialog open={askCancel} title={`Cancelar o pedido #${order.id}?`} confirmLabel="Cancelar pedido" cancelLabel="Manter pedido"
                     onCancel={() => setAskCancel(false)} onConfirm={() => { setAskCancel(false); cancel.mutate(); }}>
        <p>A reserva de estoque é liberada e o pedido não pode ser reaberto.</p>
      </ConfirmDialog>
    </div>
  );
}

/** G-04: o GERENTE aplica no pedido pendente o desconto que passou da alcada do vendedor. */
function DiscountApproval({ orderId, onDone }: { orderId: number; onDone: (order: z.infer<typeof ApproveOrderDiscountResponse>) => void }) {
  const [problem, setProblem] = useState('');
  const approve = useMutation({
    mutationFn: (body: unknown) => api.request(`/sales/orders/${orderId}/discount-approval`, { method: 'POST', body, schema: ApproveOrderDiscountResponse }),
    onSuccess: onDone,
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = { percent: Number(String(form.get('percent') ?? '').replace(',', '.')), reason: String(form.get('reason') ?? '').trim() };
    const check = ApproveOrderDiscountBody.safeParse(body);
    setProblem(check.success ? '' : 'Informe um percentual de 0,01 a 100 com até 2 casas e um motivo de 5 a 200 caracteres.');
    if (check.success) approve.mutate(body);
  }
  return (
    <section className="card stack-md" aria-labelledby="aprovar-desconto">
      <div>
        <h2 id="aprovar-desconto">Aprovar desconto (gerente)</h2>
        <p className="card-sub">Substitui o desconto manual do pedido; o total e o valor do pagamento são recalculados.</p>
      </div>
      <form className="stack-md" onSubmit={submit} aria-busy={approve.isPending}>
        <div className="form-grid">
          <Field id="aprovar-percentual" label="Percentual (%)"><input id="aprovar-percentual" name="percent" className="input" inputMode="decimal" required /></Field>
          <Field id="aprovar-motivo" label="Motivo" hint="De 5 a 200 caracteres"><input id="aprovar-motivo" name="reason" className="input" required minLength={5} maxLength={200} /></Field>
        </div>
        {problem && <p className="notice notice-error" role="alert">{problem}</p>}
        <ErrorNotice error={approve.error} />
        <div className="actions"><button type="submit" className="btn btn-primary" disabled={approve.isPending}>{approve.isPending ? 'Aplicando…' : 'Aplicar desconto'}</button></div>
      </form>
    </section>
  );
}
