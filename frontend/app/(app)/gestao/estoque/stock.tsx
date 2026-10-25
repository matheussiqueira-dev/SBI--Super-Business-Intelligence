'use client';
// Estoque (WP-3.9): posicao com custo medio, contador abaixo do minimo, entrada, ajuste e minimo em painel lateral,
// extrato de movimentos com filtros. Ajuste de saida acima do disponivel volta 409 e a mensagem mostra o disponivel.
import { useState, type FormEvent } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';
import {
  ChangeMinLevelResponse, CreateStockAdjustmentResponse, CreateStockEntryResponse, ListStockMovementsResponse, ListStockProductsResponse,
} from '../../../../lib/api/generated/sbi.zod.ts';
import { ApiError, api } from '../../../../lib/api/http.ts';
import { availableFromDetails } from '../../../../lib/cart.ts';
import { formatDateTime, money, parseDecimal } from '../../../../lib/format.ts';
import { ErrorNotice, Loading, errorMessage } from '../../../../components/feedback.tsx';
import { Field } from '../../../../components/customer-form.tsx';
import Drawer from '../../../../components/drawer.tsx';
import EmptyState from '../../../../components/empty-state.tsx';
import PageHeader from '../../../../components/page-header.tsx';
import Pager from '../../../../components/pager.tsx';
import ProductThumb from '../../../../components/product-thumb.tsx';
import { StatusMessage, useStatusMessage } from '../../../../components/status-message.tsx';
import TableWrap from '../../../../components/table-wrap.tsx';

type StockProduct = z.infer<typeof ListStockProductsResponse>['content'][number];
type Panel = { kind: 'entry' | 'adjust' | 'min'; product: StockProduct } | null;

const KINDS: Readonly<Record<string, string>> = {
  ENTRADA: 'Entrada', RESERVA: 'Reserva', LIBERACAO: 'Liberação', SAIDA: 'Saída', DEVOLUCAO: 'Devolução',
  AJUSTE_ENTRADA: 'Ajuste de entrada', AJUSTE_SAIDA: 'Ajuste de saída',
};
const REASONS: Readonly<Record<string, string>> = {
  PERDA: 'Perda', AVARIA: 'Avaria', USO_INTERNO: 'Uso interno', INVENTARIO: 'Inventário', DEVOLUCAO_FORNECEDOR: 'Devolução ao fornecedor',
};

/** Confirmacao de cada painel, com o produto e o numero que mudou. */
function savedMessage(panel: NonNullable<Panel>): string {
  if (panel.kind === 'entry') return `Entrada registrada para ${panel.product.name}. O saldo e o custo médio foram atualizados.`;
  if (panel.kind === 'adjust') return `Ajuste registrado para ${panel.product.name}. O movimento está no extrato.`;
  return `Estoque mínimo de ${panel.product.name} atualizado.`;
}

export default function Stock({ initialBelowMin = false }: { initialBelowMin?: boolean }) {
  const client = useQueryClient();
  const status = useStatusMessage();
  const [q, setQ] = useState('');
  const [belowMin, setBelowMin] = useState(initialBelowMin);
  const [page, setPage] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const position = useQuery({
    queryKey: ['stock', q, belowMin, page],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ q, page: String(page), size: '20' });
      if (belowMin) params.set('belowMin', 'true');
      return api.request(`/stock/products?${params}`, { signal, schema: ListStockProductsResponse });
    },
    placeholderData: keepPreviousData,
  });
  const below = useQuery({
    queryKey: ['stock-below-count'],
    queryFn: ({ signal }) => api.request('/stock/products?belowMin=true&size=1', { signal, schema: ListStockProductsResponse }),
  });
  const refresh = () => client.invalidateQueries({ predicate: query => ['stock', 'stock-below-count', 'movements'].includes(String(query.queryKey[0])) });
  const data = position.data;

  return (
    <div className="stack">
      <PageHeader section="Gestão" title="Estoque"
        badge={below.data && below.data.totalElements > 0 ? <span className="pill pill-warn">{below.data.totalElements} abaixo do mínimo</span> : undefined}
        description="Disponível = saldo físico − reservado em pedidos aguardando pagamento. Custo médio visível só para o perfil Gerente." />
      <StatusMessage message={status.message} onClose={status.clear} />
      <section className="card stack-md" aria-labelledby="posicao-titulo">
        <div>
          <h2 id="posicao-titulo">Posição</h2>
          <p className="card-sub">Saldo, reservado e disponível por produto; entrada e ajuste ficam registrados no extrato</p>
        </div>
        <div className="toolbar">
          <div className="field"><label htmlFor="busca-estoque">Nome ou SKU</label>
            <input id="busca-estoque" className="input" type="search" value={q} onChange={event => { setQ(event.target.value); setPage(0); }} /></div>
          <label className="check"><input type="checkbox" checked={belowMin} onChange={event => { setBelowMin(event.target.checked); setPage(0); }} />Só abaixo do mínimo</label>
        </div>
        <ErrorNotice error={position.error} />
        {position.isLoading ? <Loading label="Carregando estoque…" /> : data && data.content.length === 0
          ? <EmptyState icon="estoque" title={belowMin ? 'Nenhum produto abaixo do mínimo' : 'Nenhum produto encontrado'}>
              {belowMin ? 'Todos os produtos estão com o disponível acima do estoque mínimo.' : 'Confira o nome ou o SKU digitado.'}
            </EmptyState>
          : data && <TableWrap label="Posição de estoque"><table>
              <caption className="sr-only">Posição de estoque</caption>
              <thead><tr><th scope="col">Produto</th><th scope="col" className="right">Saldo</th><th scope="col" className="right">Reservado</th>
                <th scope="col" className="right">Disponível</th><th scope="col" className="right">Mínimo</th><th scope="col" className="right">Custo médio</th>
                <th scope="col"><span className="sr-only">Ações</span></th></tr></thead>
              <tbody>{data.content.map(p => (
                <tr key={p.productId} className={p.belowMin ? 'is-alert' : undefined}>
                  <td><div className="product-cell"><ProductThumb sku={p.sku} name={p.name} />
                    <span>{p.name}<span className="cell-sub"><span className="id">{p.sku}</span>{!p.sellable && <> · Insumo</>}{!p.active && <> · Inativo</>}</span>
                      {p.belowMin && <span className="pill pill-warn">Abaixo do mínimo</span>}</span></div></td>
                  <td className="num right">{p.onHand}</td>
                  <td className="num right">{p.reserved}</td>
                  <td className="num right"><strong>{p.available}</strong></td>
                  <td className="num right">{p.minLevel}</td>
                  <td className="num right">{p.avgCost ? money(p.avgCost) : 'Não informado'}</td>
                  <td><div className="actions">
                    <button type="button" className="btn btn-sm" onClick={() => setPanel({ kind: 'entry', product: p })}>Entrada</button>
                    <button type="button" className="btn btn-sm" onClick={() => setPanel({ kind: 'adjust', product: p })}>Ajuste</button>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => setPanel({ kind: 'min', product: p })}>Mínimo</button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table></TableWrap>}
        {data && <Pager page={data.page} size={data.size} total={data.totalElements} onPage={setPage} noun="produtos" />}
      </section>
      <Movements />
      <Drawer open={panel !== null} onClose={() => setPanel(null)}
              title={panel ? `${panel.kind === 'entry' ? 'Entrada' : panel.kind === 'adjust' ? 'Ajuste' : 'Estoque mínimo'} · ${panel.product.name}` : ''}>
        {panel && <StockForm panel={panel} onDone={() => { void refresh(); status.show(savedMessage(panel)); setPanel(null); }} />}
      </Drawer>
    </div>
  );
}

const SUBMIT_LABEL: Readonly<Record<NonNullable<Panel>['kind'], string>> = { entry: 'Registrar entrada', adjust: 'Registrar ajuste', min: 'Salvar mínimo' };

function StockForm({ panel, onDone }: { panel: NonNullable<Panel>; onDone: () => void }) {
  const [problem, setProblem] = useState('');
  // Ajuste de entrada so aceita Inventario: o motivo ja vem escolhido ao trocar o tipo.
  const [direction, setDirection] = useState<'OUT' | 'IN'>('OUT');
  const id = panel.product.productId;
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      const text = (name: string) => String(form.get(name) ?? '').trim();
      if (panel.kind === 'entry') {
        const cost = text('unitCost');
        const price = text('salePrice');
        return api.request(`/stock/products/${id}/entries`, { method: 'POST', schema: CreateStockEntryResponse, body: {
          quantity: Number(text('quantity')), unitCost: cost ? { amount: parseDecimal(cost), currency: 'BRL' } : null,
          ...(price ? { salePrice: { amount: parseDecimal(price), currency: 'BRL' } } : {}),
          ...(text('note') ? { note: text('note') } : {}) } });
      }
      if (panel.kind === 'adjust') {
        return api.request(`/stock/products/${id}/adjustments`, { method: 'POST', schema: CreateStockAdjustmentResponse, body: {
          direction: text('direction'), quantity: Number(text('quantity')), reason: text('reason'), ...(text('note') ? { note: text('note') } : {}) } });
      }
      return api.request(`/stock/products/${id}/min-level`, { method: 'PATCH', schema: ChangeMinLevelResponse, body: { minLevel: Number(text('minLevel')) } });
    },
    onSuccess: onDone,
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const quantity = Number(form.get('quantity'));
    if (panel.kind !== 'min' && (!Number.isInteger(quantity) || quantity < 1 || quantity > 100_000)) {
      setProblem('Informe uma quantidade inteira entre 1 e 100.000.');
      return;
    }
    if (panel.kind === 'adjust' && form.get('direction') === 'IN' && form.get('reason') !== 'INVENTARIO') {
      setProblem('Ajuste de entrada só aceita o motivo Inventário.');
      return;
    }
    setProblem('');
    mutation.mutate(form);
  }
  const stockError = mutation.error instanceof ApiError && mutation.error.code === 'STOCK_INSUFFICIENT'
    ? `Estoque insuficiente: ${availableFromDetails(mutation.error.details).get(id) ?? panel.product.available} disponíveis.` : null;

  return (
    <form className="stack" onSubmit={submit} aria-busy={mutation.isPending}>
      <p className="muted">Saldo {panel.product.onHand} · reservado {panel.product.reserved} · disponível {panel.product.available}</p>
      {panel.kind === 'entry' && <div className="form-grid">
        <Field id="entrada-qtd" label="Quantidade"><input id="entrada-qtd" name="quantity" className="input" type="number" min={1} max={100000} required /></Field>
        <Field id="entrada-custo" label="Custo unitário (opcional)" hint="Vazio = custo não informado"><input id="entrada-custo" name="unitCost" className="input" inputMode="decimal" /></Field>
        <Field id="entrada-preco" label="Novo preço de venda (opcional)"><input id="entrada-preco" name="salePrice" className="input" inputMode="decimal" /></Field>
        <Field id="entrada-nota" label="Observação (opcional)"><input id="entrada-nota" name="note" className="input" maxLength={200} /></Field>
      </div>}
      {panel.kind === 'adjust' && <div className="form-grid">
        <Field id="ajuste-direcao" label="Tipo"><select id="ajuste-direcao" name="direction" className="select" value={direction}
                                                       onChange={event => setDirection(event.target.value === 'IN' ? 'IN' : 'OUT')}>
          <option value="OUT">Saída</option><option value="IN">Entrada (inventário)</option></select></Field>
        <Field id="ajuste-qtd" label="Quantidade"><input id="ajuste-qtd" name="quantity" className="input" type="number" min={1} max={100000} required /></Field>
        <Field id="ajuste-motivo" label="Motivo"><select key={direction} id="ajuste-motivo" name="reason" className="select" required
                                                      defaultValue={direction === 'IN' ? 'INVENTARIO' : ''}>
          <option value="" disabled>Escolha o motivo</option>
          {Object.entries(REASONS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></Field>
        <Field id="ajuste-nota" label="Observação (opcional)"><input id="ajuste-nota" name="note" className="input" maxLength={200} /></Field>
      </div>}
      {panel.kind === 'min' && <Field id="minimo" label="Estoque mínimo">
        <input id="minimo" name="minLevel" className="input" type="number" min={0} max={100000} defaultValue={panel.product.minLevel} required /></Field>}
      {(problem || mutation.error) && <p className="notice notice-error" role="alert">{problem || stockError || errorMessage(mutation.error)}</p>}
      <div className="actions"><button type="submit" className="btn btn-primary" disabled={mutation.isPending}>{mutation.isPending ? 'Salvando…' : SUBMIT_LABEL[panel.kind]}</button></div>
    </form>
  );
}

function Movements() {
  const [filters, setFilters] = useState({ kind: '', from: '', to: '' });
  const [page, setPage] = useState(0);
  const query = useQuery({
    queryKey: ['movements', filters, page],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ page: String(page), size: '20' });
      for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
      return api.request(`/stock/movements?${params}`, { signal, schema: ListStockMovementsResponse });
    },
    placeholderData: keepPreviousData,
  });
  const set = (key: keyof typeof filters) => (value: string) => { setFilters(current => ({ ...current, [key]: value })); setPage(0); };
  const data = query.data;
  return (
    <section className="card stack-md" aria-labelledby="extrato-titulo">
      <div>
        <h2 id="extrato-titulo">Extrato de movimentos</h2>
        <p className="card-sub">Cada entrada, reserva, saída e ajuste, com quem registrou</p>
      </div>
      <div className="form-grid">
        <Field id="mov-tipo" label="Tipo"><select id="mov-tipo" className="select" value={filters.kind} onChange={event => set('kind')(event.target.value)}>
          <option value="">Todos</option>{Object.entries(KINDS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></Field>
        <Field id="mov-de" label="De"><input id="mov-de" className="input" type="date" value={filters.from} onChange={event => set('from')(event.target.value)} /></Field>
        <Field id="mov-ate" label="Até"><input id="mov-ate" className="input" type="date" value={filters.to} onChange={event => set('to')(event.target.value)} /></Field>
      </div>
      <ErrorNotice error={query.error} />
      {query.isLoading ? <Loading label="Carregando movimentos…" /> : data && data.content.length === 0
        ? <p className="empty">Nenhum movimento no filtro escolhido.</p>
        : data && <TableWrap label="Movimentos de estoque"><table>
            <caption className="sr-only">Movimentos de estoque</caption>
            <thead><tr><th scope="col">Quando</th><th scope="col">Produto</th><th scope="col">Tipo</th><th scope="col" className="right">Qtd.</th>
              <th scope="col">Motivo</th><th scope="col">Por</th></tr></thead>
            <tbody>{data.content.map(m => (
              <tr key={m.id}><td className="num">{formatDateTime(m.createdAt)}</td><td>{m.product.name}</td><td>{KINDS[m.kind] ?? m.kind}
                {m.orderId ? <span className="id subtle"> #{m.orderId}</span> : null}</td><td className="num right">{m.quantity}</td>
                <td>{m.reason ? REASONS[m.reason] ?? m.reason : '—'}{m.note ? <span className="muted"> · {m.note}</span> : null}</td>
                <td>{m.createdBy?.name ?? '—'}</td></tr>
            ))}</tbody>
          </table></TableWrap>}
      {data && <Pager page={data.page} size={data.size} total={data.totalElements} onPage={setPage} noun="movimentos" />}
    </section>
  );
}
