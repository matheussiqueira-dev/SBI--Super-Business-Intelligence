'use client';
// Venda simulada da demonstracao (secao 12 do plano de evolucao). A venda entra como um unico pedido pago no registro
// da demonstracao: e a mesma transacao que o painel do vendedor, o do gerente e o do CEO passam a ler. Nada vai para a
// API nem para o banco, e as regras de catalogo, estoque e alcada de desconto sao conferidas antes de registrar.
import { useMemo, useState } from 'react';
import Drawer from '../../components/drawer.tsx';
import TableWrap from '../../components/table-wrap.tsx';
import { Icon } from '../../components/brand/icons.tsx';
import { discountMoney, money, parseDecimal, plural } from '../../lib/format.ts';
import { PAYMENT_LABEL } from '../../lib/executive.ts';
import type { PaymentMethod } from '../../lib/demo/ledger.ts';
import {
  DISCOUNT_LIMIT, SALE_PROBLEM_MESSAGE, createSimulatedSale, validateSale, type DemoRole, type SaleInput,
} from '../../lib/demo/state.ts';
import { SELLER_IDS } from '../../lib/demo/scenario.ts';
import { useDemo } from '../../lib/demo/store.tsx';

/** Sacola do roteiro da apresentacao: a sacola coerente mais proxima de R$ 450 no catalogo da loja. */
const SCRIPT_BASKET: readonly string[] = ['CAL-003', 'VES-008', 'CAM-001'];

interface Line { productId: number; units: number }

export default function SaleDialog({ open, onClose, role, sellerId }: {
  open: boolean; onClose: () => void; role: DemoRole; sellerId: number;
}) {
  const { ledger, session, dispatch, announce } = useDemo();
  const [seller, setSeller] = useState(sellerId);
  const [lines, setLines] = useState<Line[]>([]);
  const [choice, setChoice] = useState('');
  const [units, setUnits] = useState('1');
  const [payment, setPayment] = useState<PaymentMethod>('PIX');
  const [customer, setCustomer] = useState(String(ledger.customers[0]?.id ?? 1));
  const [discount, setDiscount] = useState('0');
  const [problem, setProblem] = useState('');

  const sellable = useMemo(() => ledger.products.filter(product => product.active)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), [ledger.products]);
  const byId = useMemo(() => new Map(ledger.products.map(product => [product.id, product])), [ledger.products]);
  const limit = DISCOUNT_LIMIT[role] ?? 0;
  const customers = useMemo(() => ledger.customers.slice(0, 20), [ledger.customers]);

  const gross = lines.reduce((sum, line) => sum + (byId.get(line.productId)?.price ?? 0) * line.units, 0);
  const percent = parseDecimal(discount || '0');
  const discountValue = Number.isFinite(percent) && percent > 0 ? Math.round((gross * percent) / 100) : 0;
  const net = Math.max(0, gross - discountValue);

  function reset() {
    setLines([]);
    setChoice('');
    setUnits('1');
    setDiscount('0');
    setProblem('');
  }

  function addLine() {
    const productId = Number(choice);
    const quantity = Number(units);
    const product = byId.get(productId);
    if (!product) { setProblem('Escolha um produto do catálogo.'); return; }
    if (!Number.isInteger(quantity) || quantity <= 0) { setProblem(SALE_PROBLEM_MESSAGE.QUANTIDADE_INVALIDA); return; }
    const already = lines.find(line => line.productId === productId)?.units ?? 0;
    if (already + quantity > product.stock) {
      setProblem(`${SALE_PROBLEM_MESSAGE.ESTOQUE_INSUFICIENTE} ${product.name}: ${product.stock} em estoque.`);
      return;
    }
    setProblem('');
    setLines(current => {
      const existing = current.find(line => line.productId === productId);
      return existing
        ? current.map(line => line.productId === productId ? { ...line, units: line.units + quantity } : line)
        : [...current, { productId, units: quantity }];
    });
    setUnits('1');
  }

  function fillScript() {
    const chosen = SCRIPT_BASKET
      .map(sku => ledger.products.find(product => product.sku === sku))
      .filter((product): product is NonNullable<typeof product> => product !== undefined && product.active && product.stock > 0);
    setLines(chosen.map(product => ({ productId: product.id, units: 1 })));
    setDiscount('0');
    setProblem('');
  }

  function submit() {
    const input: SaleInput = {
      sellerId: seller, items: lines, paymentMethod: payment, customerId: Number(customer),
      discountPercent: Number.isFinite(percent) ? percent : -1,
    };
    const invalid = validateSale(ledger, input, role, session.sales.length);
    if (invalid) { setProblem(SALE_PROBLEM_MESSAGE[invalid]); return; }
    const order = createSimulatedSale(ledger, input);
    dispatch({ type: 'sale', order });
    const name = ledger.people.find(person => person.id === seller)?.name ?? 'vendedor';
    announce(`Venda simulada de ${money(net / 100)} registrada para ${name}. Os três painéis já consideram a venda.`);
    reset();
    onClose();
  }

  return (
    <Drawer open={open} title="Registrar venda simulada" onClose={onClose}>
      <div className="stack-sm">
        <p className="notice">Venda fictícia: entra apenas no estado desta aba, baixa o estoque simulado e passa a contar
          para o vendedor, para a loja e para o resultado do CEO. Nenhum registro real é criado.</p>
        {problem && <p className="notice notice-error" role="alert">{problem}</p>}

        <div className="form-grid">
          <div className="field">
            <label htmlFor="demo-venda-vendedor">Vendedor</label>
            <select id="demo-venda-vendedor" className="select" value={seller} onChange={event => setSeller(Number(event.target.value))}
                    disabled={role === 'VENDEDOR'}>
              {SELLER_IDS.map(id => <option key={id} value={id}>{ledger.people.find(person => person.id === id)?.name ?? id}</option>)}
            </select>
            {role === 'VENDEDOR' && <p className="caption">O vendedor registra apenas as próprias vendas.</p>}
          </div>
          <div className="field">
            <label htmlFor="demo-venda-cliente">Cliente</label>
            <select id="demo-venda-cliente" className="select" value={customer} onChange={event => setCustomer(event.target.value)}>
              {customers.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
            </select>
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="demo-venda-produto">Produto</label>
            <select id="demo-venda-produto" className="select" value={choice} onChange={event => setChoice(event.target.value)}>
              <option value="">Escolha um produto</option>
              {sellable.map(product => (
                <option key={product.id} value={product.id} disabled={product.stock <= 0}>
                  {product.name} · {money(product.price / 100)}{product.stock <= 0 ? ' · sem estoque' : ` · ${product.stock} em estoque`}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="demo-venda-qtd">Quantidade</label>
            <input id="demo-venda-qtd" className="input" type="number" min={1} max={99} step={1} value={units}
                   onChange={event => setUnits(event.target.value)} />
          </div>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={addLine}><Icon name="mais" />Adicionar à sacola</button>
          <button type="button" className="btn btn-ghost" onClick={fillScript}>Sacola sugerida do roteiro</button>
        </div>

        {lines.length === 0
          ? <p className="empty">Sacola vazia. Adicione ao menos um produto.</p>
          : <TableWrap label="Sacola da venda simulada"><table>
            <caption className="sr-only">Itens da venda simulada</caption>
            <thead><tr><th scope="col">Produto</th><th scope="col" className="right">Qtd.</th>
              <th scope="col" className="right">Preço</th><th scope="col" className="right">Total</th>
              <th scope="col"><span className="sr-only">Remover</span></th></tr></thead>
            <tbody>{lines.map(line => {
              const product = byId.get(line.productId);
              return (
                <tr key={line.productId}>
                  <td>{product?.name ?? line.productId}</td>
                  <td className="num right">{line.units}</td>
                  <td className="num right">{money((product?.price ?? 0) / 100)}</td>
                  <td className="num right">{money(((product?.price ?? 0) * line.units) / 100)}</td>
                  <td><button type="button" className="btn btn-ghost btn-compact"
                              aria-label={`Remover ${product?.name ?? 'item'} da sacola`}
                              onClick={() => setLines(current => current.filter(item => item.productId !== line.productId))}>Remover</button></td>
                </tr>
              );
            })}</tbody>
          </table></TableWrap>}

        <div className="form-grid">
          <div className="field">
            <label htmlFor="demo-venda-pagamento">Forma de pagamento</label>
            <select id="demo-venda-pagamento" className="select" value={payment}
                    onChange={event => setPayment(event.target.value as PaymentMethod)}>
              {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map(key => <option key={key} value={key}>{PAYMENT_LABEL[key]}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="demo-venda-desconto">Desconto do pedido (%)</label>
            <input id="demo-venda-desconto" className="input" type="text" inputMode="decimal" value={discount}
                   onChange={event => setDiscount(event.target.value)} />
            <p className="caption">Alçada do perfil ativo: até {limit}% (mesma regra do banco de dados).</p>
          </div>
        </div>

        <dl className="facts">
          <div><dt>Preço de tabela</dt><dd className="money">{money(gross / 100)}</dd></div>
          <div><dt>Desconto</dt><dd className="money">{discountMoney(discountValue / 100)}</dd></div>
          <div><dt>Total da venda</dt><dd className="money">{money(net / 100)}</dd></div>
        </dl>
        <p className="caption">{plural(lines.reduce((sum, line) => sum + line.units, 0), 'item', 'itens')} na sacola ·
          {' '}{session.sales.length} de 50 vendas simuladas nesta aba.</p>

        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={submit} disabled={lines.length === 0}>
            <Icon name="check" />Registrar venda simulada
          </button>
          <button type="button" className="btn" onClick={() => { reset(); onClose(); }}>Cancelar</button>
        </div>
      </div>
    </Drawer>
  );
}
