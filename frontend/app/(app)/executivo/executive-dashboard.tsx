'use client';
// Painel executivo do CEO (RF-28, D-EVO-45): KPIs com variacao, destaques automaticos, metas (anual, do mes, por
// gerente e por vendedor), vendas com drill-down (ano > mes > dia), rankings com filtro cruzado, lucro x preco de
// compra e curva ABC. Clicar em qualquer barra filtra o painel inteiro; os chips mostram e desfazem cada filtro.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ErrorNotice, Loading } from '../../../components/feedback.tsx';
import { ColumnChart, Delta, GoalGauge, RankBars, StackedShare } from '../../../components/exec-charts.tsx';
import Tabs from '../../../components/tabs.tsx';
import ProductThumb from '../../../components/product-thumb.tsx';
import { formatPercent, formatTime, money } from '../../../lib/format.ts';
import {
  filterChips, Model, MONTH_NAMES, NO_FILTERS, PAYMENT_LABEL, toCsv, variation, without,
  type Filters, type PaymentMethod, type ProductRow,
} from '../../../lib/executive.ts';
import { selectableYears, storeYear, useOverview } from './use-overview.ts';

type ProductMeasure = 'net' | 'units' | 'profit';
const PRODUCT_MEASURES: readonly [ProductMeasure, string][] = [['net', 'Faturamento'], ['units', 'Unidades'], ['profit', 'Lucro']];
const STATE_LABEL: Readonly<Record<string, string>> = { SEM_META: 'Sem meta', EM_ANDAMENTO: 'Em andamento', META_ATINGIDA: 'Meta atingida' };
const units = (value: number) => `${value.toLocaleString('pt-BR')} un.`;

/** Valor ausente sai em texto (manual v1.0), nao na fonte de numeros. */
function valueClass(value: unknown): string {
  return value === null || value === undefined ? 'value text' : 'value';
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ExecutiveDashboard() {
  const [year, setYear] = useState(storeYear);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [tab, setTab] = useState('visao');
  const [measure, setMeasure] = useState<ProductMeasure>('net');
  const [announcement, setAnnouncement] = useState('');
  const overview = useOverview(year);
  const model = useMemo(() => overview.data ? new Model(overview.data) : null, [overview.data]);

  function apply(next: Filters, message: string) {
    setFilters(next);
    setAnnouncement(message);
  }
  /** Clicar no item ja escolhido desfaz o filtro (como no BI). */
  function toggle<K extends 'team' | 'seller' | 'category' | 'product' | 'payment'>(key: K, value: Filters[K], label: string) {
    const off = filters[key] === value;
    apply({ ...filters, [key]: off ? null : value }, off ? `Filtro removido: ${label}` : `Filtro aplicado: ${label}`);
  }
  function selectMonth(month: number | null) {
    apply({ ...filters, month, day: null }, month ? `Drill-down em ${MONTH_NAMES[month - 1]}: vendas por dia` : 'Voltou ao ano inteiro');
  }

  if (overview.isLoading) return <Loading label="Carregando o painel executivo…" />;
  if (!model) return <ErrorNotice error={overview.error} />;

  const scope = model.scope(filters);
  const { current, previous, label: compareLabel } = model.comparison(filters);
  const now = model.measures(filters, current);
  const before = model.measures(filters, previous);
  const chips = filterChips(model, filters);
  const productScoped = model.productScoped(filters);
  const updated = overview.dataUpdatedAt ? formatTime(new Date(overview.dataUpdatedAt).toISOString()) : null;
  const periodText = filters.day ? `dia ${filters.day.slice(8, 10)}/${filters.day.slice(5, 7)}/${model.year}`
    : filters.month ? `${MONTH_NAMES[filters.month - 1]} de ${model.year}` : `ano de ${model.year}`;
  const sellerOptions = model.sellers().filter(p => filters.team === null || model.teamOf(p.id) === filters.team);

  const timeSeries = model.timeSeries(filters);
  const timeColumns = timeSeries.map(point => ({
    key: point.key, label: point.label, value: point.net, goal: point.goal, compare: point.previousNet,
    name: filters.month ? `${point.label} de ${MONTH_NAMES[filters.month - 1]}` : `${MONTH_NAMES[point.key - 1]} de ${model.year}`,
    note: point.refunds > 0 ? `estornos ${money(point.refunds)}` : undefined,
  }));
  const goalSeries = model.timeSeries({ ...NO_FILTERS, team: filters.team, seller: filters.seller }).map(point => ({
    key: point.key, label: point.label, name: `${MONTH_NAMES[point.key - 1]} de ${model.year}`, value: point.net, goal: point.goal,
  }));

  const kpis = (
    <section className="kpis" aria-label="Indicadores do recorte">
      <div className="card kpi"><span className="label">Faturamento líquido</span><span className="value">{money(now.net)}</span>
        <Delta value={variation(now.net, before.net)} label={compareLabel} />
        <span className="note">Vendas {money(now.sales)} · estornos {money(now.refunds)}</span></div>
      <div className="card kpi"><span className="label">Lucro bruto</span><span className={valueClass(now.profit)}>{money(now.profit)}</span>
        {now.profit !== null && before.profit !== null ? <Delta value={variation(now.profit, before.profit)} label={compareLabel} /> : null}
        <span className="note">{now.profit === null ? 'Há itens vendidos sem custo informado.' : `Margem ${formatPercent(now.margin)}`}</span></div>
      <div className="card kpi"><span className="label">Preço de compra (custo)</span><span className="value">{money(now.cost)}</span>
        <span className="note">{now.sales > 0 ? `${formatPercent((now.cost * 100) / now.sales)} das vendas` : 'Sem vendas no recorte'}
          {now.itemsWithoutCost > 0 ? ` · ${now.itemsWithoutCost} ${now.itemsWithoutCost === 1 ? 'item' : 'itens'} sem custo` : ''}</span></div>
      <div className="card kpi"><span className="label">Pedidos pagos</span><span className="value">{now.orders}</span>
        <Delta value={variation(now.orders, before.orders)} label={compareLabel} />
        <span className="note">Ticket médio {money(now.averageTicket)}</span></div>
      <div className="card kpi"><span className="label">Unidades vendidas</span><span className="value">{now.units}</span>
        <span className="note">{now.orders > 0 ? `${(now.units / now.orders).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por pedido` : 'Sem pedidos'} · {now.customers} clientes</span></div>
      <div className="card kpi"><span className="label">Descontos concedidos</span><span className="value">{money(now.discount)}</span>
        <span className="note">{now.sales + now.discount > 0 ? `${formatPercent((now.discount * 100) / (now.sales + now.discount))} do preço de tabela` : 'Sem vendas no recorte'}</span></div>
    </section>
  );

  const month = model.monthGoalStatus(filters);
  const momMonth = model.referenceMonth(filters);
  const momRanges = model.comparison({ ...filters, month: momMonth, day: null });
  const momNow = model.measures({ ...filters, day: null }, momRanges.current);
  const momBefore = model.measures({ ...filters, day: null }, momRanges.previous);
  const previousMonth = momMonth === 1 ? { year: model.year - 1, month: 12 } : { year: model.year, month: momMonth - 1 };
  const previousFull = model.measures({ ...filters, day: null }, {
    from: `${previousMonth.year}-${String(previousMonth.month).padStart(2, '0')}-01`,
    to: `${previousMonth.year}-${String(previousMonth.month).padStart(2, '0')}-31` });
  const orgLabel = filters.seller !== null ? model.personName(filters.seller === -1 ? null : filters.seller)
    : filters.team !== null ? model.teamName(filters.team) : 'da loja';

  const overviewTab = (
    <div className="stack">
      <section className="card stack-sm" aria-labelledby="destaques">
        <h2 id="destaques" className="label">Destaques do período</h2>
        {(() => {
          const insights = model.insights(filters);
          return insights.length === 0 ? <p className="muted">Sem vendas suficientes no recorte para destacar.</p>
            : <ul className="insights">{insights.map(item => <li key={item.text} className={`insight-${item.tone}`}>
              <span className="insight-dot" aria-hidden="true" /><span>{item.text}</span></li>)}</ul>;
        })()}
      </section>
      <div className="grid-3">
        <GoalGauge title={`Meta anual da loja · ${model.year}`} status={model.annualGoalStatus()}
                   empty="Meta anual não definida. Defina em Metas." />
        <GoalGauge title={`Meta do mês · ${MONTH_NAMES[momMonth - 1]} (${orgLabel})`} status={month}
                   empty="Sem meta para este mês." />
        <section className="card stack-sm" aria-labelledby="mes-a-mes">
          <h2 id="mes-a-mes" className="label">Mês atual × mês anterior</h2>
          <dl className="facts">
            <div><dt>{MONTH_NAMES[momMonth - 1]} (até o dia {momRanges.current.to.slice(8, 10)})</dt><dd className="money">{money(momNow.net)}</dd></div>
            <div><dt>{momRanges.label}</dt><dd className="money">{money(momBefore.net)}</dd></div>
            <div><dt>{MONTH_NAMES[previousMonth.month - 1]} fechado</dt><dd className="money">{money(previousFull.net)}</dd></div>
          </dl>
          <p><Delta value={variation(momNow.net, momBefore.net)} label={momRanges.label} /></p>
          <p className="caption">Pedidos: {momNow.orders} contra {momBefore.orders} · ticket {money(momNow.averageTicket)} contra {money(momBefore.averageTicket)}.</p>
        </section>
      </div>
      <section className="card stack-sm" aria-labelledby="vendas-tempo">
        <div className="toolbar">
          <h2 id="vendas-tempo" className="label">Vendas {filters.month ? `por dia · ${MONTH_NAMES[filters.month - 1]} de ${model.year}` : `por mês · ${model.year}`}</h2>
          <nav aria-label="Nível do gráfico"><ol className="breadcrumb">
            <li>{filters.month ? <button type="button" className="btn btn-ghost btn-compact" onClick={() => selectMonth(null)}>Ano {model.year}</button>
              : <span aria-current="location">Ano {model.year}</span>}</li>
            {filters.month && <li><span aria-current="location">{MONTH_NAMES[filters.month - 1]}</span></li>}
          </ol></nav>
        </div>
        <ColumnChart title={filters.month ? 'Faturamento líquido por dia' : 'Faturamento líquido por mês'} columns={timeColumns}
                     valueLabel="Faturamento líquido" compareLabel={`${model.year - 1}`} sparseLabels={filters.month !== null}
                     selected={filters.month ? (filters.day ? Number(filters.day.slice(8, 10)) : null) : null}
                     help={filters.month ? 'Clique em um dia para filtrar o painel por ele.' : 'Clique em um mês para abrir os dias (drill-down) e filtrar o painel.'}
                     onSelect={key => {
                       if (!filters.month) { selectMonth(key); return; }
                       const day = `${model.year}-${String(filters.month).padStart(2, '0')}-${String(key).padStart(2, '0')}`;
                       const off = filters.day === day;
                       apply({ ...filters, day: off ? null : day }, off ? 'Filtro de dia removido' : `Filtro aplicado: dia ${key}`);
                     }} />
      </section>
      <div className="grid-2">
        <section className="card">
          <RankBars title="Formas de pagamento" items={model.ranking('payment', filters).map(r => ({
            key: r.key, label: r.label, value: r.net, detail: `${r.orders} pedidos` }))}
                    selected={filters.payment} onSelect={key => toggle('payment', key as PaymentMethod, PAYMENT_LABEL[key as PaymentMethod])} />
        </section>
        <section className="card stack-sm">
          <RankBars title="Categorias" items={model.ranking('category', filters).map(r => ({
            key: r.key, label: r.label, value: r.net, detail: `${r.units} un.` }))}
                    selected={filters.category} onSelect={key => toggle('category', Number(key), model.categoryName(Number(key) === -1 ? null : Number(key)))} />
          <p className="caption">Receita dos itens; estornos são do pedido e não entram por categoria.</p>
        </section>
      </div>
    </div>
  );

  const sellerBoard = model.goalBoard('seller', filters);
  const teamTab = (
    <div className="stack">
      <div className="grid-2">
        <section className="card stack-sm">
          <RankBars title={`Meta por gerente · ${filters.month ? MONTH_NAMES[filters.month - 1] : `acumulado de ${model.year}`}`}
                    items={model.goalBoard('team', filters).map(r => ({ key: r.key, label: r.label, value: r.realized, goal: r.goal, detail: STATE_LABEL[r.state] }))}
                    selected={filters.team} onSelect={key => toggle('team', Number(key), model.teamName(Number(key)))} />
          <p className="caption">Meta da equipe = soma das metas dos vendedores dela; o realizado inclui as vendas do próprio gerente.</p>
        </section>
        <section className="card">
          <RankBars title="Ranking de vendedores" items={model.ranking('seller', filters).map(r => ({
            key: r.key, label: r.label, value: r.net, detail: `${r.orders} pedidos · ticket ${money(r.averageTicket)}` }))}
                    selected={filters.seller} onSelect={key => toggle('seller', Number(key), model.personName(Number(key) === -1 ? null : Number(key)))} />
        </section>
      </div>
      <section className="card stack-sm" aria-labelledby="meta-vendedor">
        <h2 id="meta-vendedor" className="label">Meta por vendedor · {filters.month ? `${MONTH_NAMES[filters.month - 1]} de ${model.year}` : `acumulado de ${model.year} (meses com meta)`}</h2>
        {sellerBoard.length === 0 ? <p className="empty">Sem metas nem vendas no período.</p>
          : <div className="table-wrap" tabIndex={0} role="group" aria-labelledby="meta-vendedor"><table>
            <caption className="sr-only">Meta por vendedor</caption>
            <thead><tr><th scope="col">Vendedor</th><th scope="col">Equipe</th><th scope="col" className="right">Meta</th>
              <th scope="col" className="right">Realizado</th><th scope="col" className="right">Atingimento</th><th scope="col" className="right">Falta</th>
              {filters.month && <th scope="col" className="right">Por dia</th>}<th scope="col">Situação</th></tr></thead>
            <tbody>{sellerBoard.map(r => (
              <tr key={r.key} aria-selected={filters.seller === r.key}>
                <td>{r.label}</td><td>{r.team}</td><td className="num right">{r.goal > 0 ? money(r.goal) : '—'}</td>
                <td className="num right">{money(r.realized)}</td><td className="num right">{r.achievement === null ? '—' : formatPercent(r.achievement)}</td>
                <td className="num right">{r.goal > 0 ? money(r.remaining) : '—'}</td>
                {filters.month && <td className="num right">{r.perDay === null ? '—' : money(r.perDay)}</td>}
                <td><span className={`pill ${r.state === 'META_ATINGIDA' ? 'pill-ok' : r.state === 'EM_ANDAMENTO' ? 'pill-warn' : ''}`}>{STATE_LABEL[r.state]}</span></td>
              </tr>
            ))}</tbody>
          </table></div>}
      </section>
      <section className="card stack-sm">
        <ColumnChart title={`Metas mensais de ${model.year} · ${orgLabel}`} columns={goalSeries} valueLabel="Realizado"
                     selected={filters.month} onSelect={key => selectMonth(filters.month === key ? null : key)}
                     help="Realizado contra a meta de cada mês; clique em um mês para filtrar o painel." />
      </section>
    </div>
  );

  const products = model.productTable(filters);
  const productValue = (row: ProductRow) => measure === 'units' ? row.units : measure === 'profit' ? row.profit ?? 0 : row.net;
  const productRanking = [...products].sort((a, b) => productValue(b) - productValue(a));
  const abc = model.abc(filters);
  const productTab = (
    <div className="stack">
      {productScoped && <p className="notice notice-warn">Com filtro de produto ou categoria, os estornos ficam fora: eles são do pedido, não de um produto.</p>}
      <div className="grid-2">
        <section className="card stack-sm">
          <fieldset className="segmented">
            <legend className="sr-only">Medida do ranking de produtos</legend>
            {PRODUCT_MEASURES.map(([value, text]) => (
              <label key={value}><input type="radio" name="medida-produto" value={value} checked={measure === value} onChange={() => setMeasure(value)} />
                <span>{text}</span></label>
            ))}
          </fieldset>
          <RankBars title={`Produtos mais vendidos · ${PRODUCT_MEASURES.find(m => m[0] === measure)?.[1]}`} limit={10}
                    format={measure === 'units' ? units : money}
                    items={productRanking.map(r => ({ key: r.productId, label: r.label, value: productValue(r),
                      detail: measure === 'profit' && r.profit === null ? 'sem custo' : `${r.units} un.`,
                      prefix: <ProductThumb sku={r.sku ?? undefined} name={r.label} size={32} /> }))}
                    selected={filters.product} onSelect={key => toggle('product', Number(key), model.productName(Number(key)))} />
        </section>
        <section className="card stack-sm" aria-labelledby="curva-abc">
          <h2 id="curva-abc" className="label">Curva ABC do faturamento</h2>
          <StackedShare title="Participação de cada classe na receita" parts={abc.classes.map(c => ({
            key: c.klass, label: `Classe ${c.klass} (${c.products} ${c.products === 1 ? 'produto' : 'produtos'})`, share: c.share,
            tone: c.klass === 'A' ? 'abc-a' : c.klass === 'B' ? 'abc-b' : 'abc-c' }))} />
          <p className="caption">A: produtos que somam os primeiros 80% da receita; B: até 95%; C: o restante. Foque estoque e vitrine na classe A.</p>
          <ol className="rank">{abc.items.slice(0, 5).map(item => <li key={item.key}>{item.label} · <span className="num">{money(item.net)}</span>
            <span className="muted"> · {formatPercent(item.share * 100)} · classe {item.klass}</span></li>)}</ol>
        </section>
      </div>
      <ProductMarginTable rows={products} selected={filters.product}
                          onSelect={id => toggle('product', id, model.productName(id))} />
    </div>
  );

  return (
    <div className="stack">
      <header className="toolbar">
        <div className="stack-sm">
          <p className="muted">Diretoria / Painel executivo</p>
          <h1>Painel executivo</h1>
          <p className="muted">Recorte: {periodText} · vendas pagas menos estornos.{updated && <span aria-live="polite"> Atualizado às {updated}.</span>}</p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={() => download(`sbi-vendas-${scope.from}-${scope.to}.csv`, toCsv(model, filters))}>Exportar CSV</button>
          <Link className="btn btn-primary" href="/executivo/metas">Definir metas</Link>
        </div>
      </header>

      <ErrorNotice error={overview.error}><p>Os números abaixo são da última atualização bem-sucedida.</p></ErrorNotice>

      <section className="card stack-sm" aria-labelledby="filtros-titulo">
        <h2 id="filtros-titulo" className="sr-only">Filtros</h2>
        <div className="filters">
          <div className="field"><label htmlFor="exec-ano">Ano</label>
            <select id="exec-ano" className="select" value={year} onChange={event => { setYear(Number(event.target.value)); apply(NO_FILTERS, `Ano ${event.target.value}`); }}>
              {selectableYears().map(y => <option key={y} value={y}>{y}</option>)}</select></div>
          <div className="field"><label htmlFor="exec-mes">Mês</label>
            <select id="exec-mes" className="select" value={filters.month ?? ''} onChange={event => selectMonth(event.target.value ? Number(event.target.value) : null)}>
              <option value="">Ano inteiro</option>
              {MONTH_NAMES.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></div>
          <div className="field"><label htmlFor="exec-equipe">Equipe (gerente)</label>
            <select id="exec-equipe" className="select" value={filters.team ?? ''}
                    onChange={event => apply({ ...filters, team: event.target.value === '' ? null : Number(event.target.value), seller: null },
                      event.target.value === '' ? 'Todas as equipes' : `Filtro aplicado: ${model.teamName(Number(event.target.value))}`)}>
              <option value="">Todas</option>
              {model.teams().map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></div>
          <div className="field"><label htmlFor="exec-vendedor">Vendedor</label>
            <select id="exec-vendedor" className="select" value={filters.seller ?? ''}
                    onChange={event => apply({ ...filters, seller: event.target.value === '' ? null : Number(event.target.value) },
                      event.target.value === '' ? 'Todos os vendedores' : `Filtro aplicado: ${model.personName(Number(event.target.value))}`)}>
              <option value="">Todos</option>
              {sellerOptions.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></div>
          <div className="field"><label htmlFor="exec-categoria">Categoria</label>
            <select id="exec-categoria" className="select" value={filters.category ?? ''}
                    onChange={event => apply({ ...filters, category: event.target.value === '' ? null : Number(event.target.value) },
                      event.target.value === '' ? 'Todas as categorias' : `Filtro aplicado: ${model.categoryName(Number(event.target.value))}`)}>
              <option value="">Todas</option>
              {model.overview.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
          <div className="field"><label htmlFor="exec-pagamento">Pagamento</label>
            <select id="exec-pagamento" className="select" value={filters.payment ?? ''}
                    onChange={event => apply({ ...filters, payment: (event.target.value || null) as PaymentMethod | null },
                      event.target.value === '' ? 'Todas as formas de pagamento' : `Filtro aplicado: ${PAYMENT_LABEL[event.target.value as PaymentMethod]}`)}>
              <option value="">Todas</option>
              {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map(key => <option key={key} value={key}>{PAYMENT_LABEL[key]}</option>)}</select></div>
        </div>
        {chips.length > 0 && <div className="toolbar">
          <ul className="chips" aria-label="Filtros ativos">
            {chips.map(chip => <li key={chip.key} className="chip">{chip.label}
              <button type="button" aria-label={`Remover filtro ${chip.label}`} onClick={() => apply(without(filters, chip.key), `Filtro removido: ${chip.label}`)}>×</button></li>)}
          </ul>
          <button type="button" className="btn btn-ghost btn-compact" onClick={() => apply(NO_FILTERS, 'Filtros limpos')}>Limpar filtros</button>
        </div>}
        <p className="caption">Clique nas barras dos gráficos para filtrar o painel; clique de novo para desfazer. Comparação: {compareLabel}.</p>
        <p role="status" className="sr-only">{announcement}</p>
      </section>

      {kpis}

      <Tabs label="Visões do painel" active={tab} onChange={setTab} tabs={[
        { id: 'visao', label: 'Visão geral', content: overviewTab },
        { id: 'equipe', label: 'Equipe e metas', content: teamTab },
        { id: 'produtos', label: 'Produtos e margem', content: productTab },
      ]} />
    </div>
  );
}

type SortKey = 'label' | 'units' | 'net' | 'cost' | 'profit' | 'margin' | 'price' | 'averageCost' | 'unitMarginPercent';
const COLUMNS: readonly [SortKey, string][] = [
  ['label', 'Produto'], ['price', 'Preço de venda'], ['averageCost', 'Preço de compra'], ['unitMarginPercent', 'Margem unitária'],
  ['units', 'Unidades'], ['net', 'Receita'], ['cost', 'Custo'], ['profit', 'Lucro'], ['margin', 'Margem realizada'],
];

/** Lucro x preco de compra: preco atual, custo medio atual, margem unitaria e o realizado no recorte; ordenavel. */
function ProductMarginTable({ rows, selected, onSelect }: { rows: readonly ProductRow[]; selected: number | null; onSelect: (id: number) => void }) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'net', desc: true });
  const sorted = [...rows].sort((a, b) => {
    if (sort.key === 'label') return sort.desc ? b.label.localeCompare(a.label, 'pt-BR') : a.label.localeCompare(b.label, 'pt-BR');
    const x = a[sort.key] ?? Number.NEGATIVE_INFINITY;
    const y = b[sort.key] ?? Number.NEGATIVE_INFINITY;
    return sort.desc ? y - x : x - y;
  });
  return (
    <section className="card stack-sm" aria-labelledby="lucro-compra">
      <h2 id="lucro-compra" className="label">Lucro × preço de compra por produto</h2>
      <p className="caption">Preço de compra = custo médio atual do estoque. Margem unitária = (preço − custo) ÷ preço. Abaixo de 10% fica em destaque.</p>
      {rows.length === 0 ? <p className="empty">Nenhum produto vendido no recorte.</p> : <div className="table-wrap" tabIndex={0} role="group" aria-labelledby="lucro-compra"><table>
        <caption className="sr-only">Lucro e preço de compra por produto</caption>
        <thead><tr>{COLUMNS.map(([key, text]) => (
          <th key={key} scope="col" className={key === 'label' ? undefined : 'right'}
              aria-sort={sort.key === key ? (sort.desc ? 'descending' : 'ascending') : 'none'}>
            <button type="button" className="th-button" onClick={() => setSort(s => ({ key, desc: s.key === key ? !s.desc : key !== 'label' }))}>{text}</button>
          </th>
        ))}<th scope="col"><span className="sr-only">Filtrar</span></th></tr></thead>
        <tbody>{sorted.map(r => (
          <tr key={r.productId} aria-selected={selected === r.productId}>
            <td className="cell-product"><div className="product-cell"><ProductThumb sku={r.sku ?? undefined} name={r.label} size={32} />
              <span>{r.label}<br /><span className="mono muted">{r.sku ?? '—'} · {r.category}</span></span></div></td>
            <td className="num right">{r.price === null ? '—' : money(r.price)}</td>
            <td className="num right">{r.averageCost === null ? '—' : money(r.averageCost)}</td>
            <td className={`num right${r.unitMarginPercent !== null && r.unitMarginPercent < 10 ? ' margin-low' : ''}`}>
              {r.unitMargin === null ? '—' : `${money(r.unitMargin)} (${formatPercent(r.unitMarginPercent)})`}</td>
            <td className="num right">{r.units}</td>
            <td className="num right">{money(r.net)}</td>
            <td className="num right">{r.itemsWithoutCost > 0 ? '—' : money(r.cost)}</td>
            <td className="num right">{r.profit === null ? '—' : money(r.profit)}</td>
            <td className={`num right${r.margin !== null && r.margin < 10 ? ' margin-low' : ''}`}>{r.margin === null ? '—' : formatPercent(r.margin)}</td>
            <td><button type="button" className="btn btn-ghost btn-compact" aria-pressed={selected === r.productId}
                        aria-label={`${selected === r.productId ? 'Remover filtro' : 'Filtrar painel por'} ${r.label}`}
                        onClick={() => onSelect(r.productId)}>{selected === r.productId ? 'Remover' : 'Filtrar'}</button></td>
          </tr>
        ))}</tbody>
      </table></div>}
    </section>
  );
}
