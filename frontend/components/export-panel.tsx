'use client';
// Exportacao do recorte de analises (D-EVO-55): periodo inicial e final, atalhos de datas, filtros da tela
// e os formatos Excel (.xlsx principal e .xls real) mais o CSV complementar.
//
// O arquivo e gerado NO SERVIDOR, em /analytics/export, a partir das mesmas views dos indicadores. A tela
// so monta o endereco do recorte: ela nao consegue ampliar o escopo autorizado, porque quem decide o que
// entra no arquivo e o papel da sessao, conferido na API.
import { useId, useState } from 'react';
import { api } from '../lib/api/http.ts';
import { formatDate, PAYMENT_TYPE } from '../lib/format.ts';

/** Formatos oferecidos, na ordem em que a tela os mostra. */
const FORMATS = [
  { id: 'XLSX', label: 'Excel (.xlsx)', hint: 'Formato Excel principal' },
  { id: 'XLS', label: 'Excel 97-2003 (.xls)', hint: 'Compatibilidade com leitores antigos' },
  { id: 'CSV', label: 'CSV', hint: 'Texto separado por ponto e virgula' },
] as const;

type FormatId = (typeof FORMATS)[number]['id'];

export interface ExportOption { id: number; name: string }

export interface ExportPanelProps {
  /** Periodo inicial sugerido (YYYY-MM-DD); normalmente o primeiro dia do mes que a tela mostra. */
  defaultFrom: string;
  /** Periodo final sugerido (YYYY-MM-DD). */
  defaultTo: string;
  /** Hoje na loja (YYYY-MM-DD): limite dos atalhos e do campo de data, para nao pedir recorte futuro. */
  today: string;
  sellers?: readonly ExportOption[];
  categories?: readonly ExportOption[];
}

// Datas sao tratadas em UTC a partir do texto ISO, nunca com o fuso do navegador: o recorte e o da loja
// (America/Fortaleza), que chega pronto na prop `today`.
const yearOf = (iso: string) => Number(iso.slice(0, 4));
const monthOf = (iso: string) => Number(iso.slice(5, 7));
const pad = (value: number) => String(value).padStart(2, '0');

/** Primeiro e ultimo dia do mes de uma data ISO. */
function monthBounds(iso: string): { from: string; to: string } {
  const year = yearOf(iso);
  const month = monthOf(iso);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(last)}` };
}

function shiftMonths(iso: string, months: number): string {
  const date = new Date(Date.UTC(yearOf(iso), monthOf(iso) - 1 + months, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-01`;
}

function shiftDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function ExportPanel({ defaultFrom, defaultTo, today, sellers = [], categories = [] }: ExportPanelProps) {
  const id = useId();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo > today ? today : defaultTo);
  // O periodo sugerido vem da tela. Quando a tela troca de mes, o recorte do arquivo acompanha: sem isto o
  // estado inicial ficaria congelado e o arquivo sairia de um mes diferente do que os indicadores mostram.
  // A escolha propria da pessoa e preservada: so volta a seguir a tela quando a sugestao muda.
  const [seguido, setSeguido] = useState({ from: defaultFrom, to: defaultTo });
  if (seguido.from !== defaultFrom || seguido.to !== defaultTo) {
    setSeguido({ from: defaultFrom, to: defaultTo });
    setFrom(defaultFrom);
    setTo(defaultTo > today ? today : defaultTo);
  }
  const [seller, setSeller] = useState('');
  const [category, setCategory] = useState('');
  const [payment, setPayment] = useState('');
  const [busy, setBusy] = useState<FormatId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const invalid = !from || !to || to < from;

  /** Atalhos de data; cada um fecha no maximo em "hoje na loja". */
  const shortcuts: { label: string; apply: () => void }[] = [
    { label: 'Mês atual', apply: () => { const b = monthBounds(today); setFrom(b.from); setTo(today); } },
    {
      label: 'Mês anterior',
      apply: () => { const b = monthBounds(shiftMonths(today, -1)); setFrom(b.from); setTo(b.to); },
    },
    { label: 'Últimos 30 dias', apply: () => { setFrom(shiftDays(today, -29)); setTo(today); } },
    { label: 'Últimos 90 dias', apply: () => { setFrom(shiftDays(today, -89)); setTo(today); } },
    { label: 'Ano atual', apply: () => { setFrom(`${today.slice(0, 4)}-01-01`); setTo(today); } },
  ];

  function query(format: FormatId): string {
    const params = new URLSearchParams({ from, to, format });
    if (seller) params.set('seller', seller);
    if (category) params.set('category', category);
    if (payment) params.set('payment', payment);
    return `/analytics/export?${params}`;
  }

  async function run(format: FormatId) {
    setBusy(format);
    setError(null);
    setDone(null);
    try {
      // Pelo cliente unico do SBI: cookie de sessao, erro traduzido para pt-BR e 401 levando ao login.
      const blob = await api.download(query(format));
      const name = `sbi-analises-${from}-a-${to}.${format.toLowerCase()}`;
      const url = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement('a'), { href: url, download: name });
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDone(name);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível gerar o arquivo.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card stack-md" aria-labelledby={`${id}-titulo`}>
      <div>
        <h2 id={`${id}-titulo`}>Exportar</h2>
        <p className="card-sub">
          Abas Resumo, Vendas e Metas do mesmo período, fuso e escopo dos indicadores. O detalhe vai no grão do
          item de pedido, com uma linha por estorno: somar a receita líquida das linhas dá o faturamento confirmado.
        </p>
      </div>

      <div className="filters">
        <div className="field">
          <label htmlFor={`${id}-de`}>Período inicial</label>
          <input id={`${id}-de`} className="input" type="date" value={from} max={today}
                 onChange={event => setFrom(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`${id}-ate`}>Período final</label>
          <input id={`${id}-ate`} className="input" type="date" value={to} min={from} max={today}
                 onChange={event => setTo(event.target.value)} />
        </div>
        {sellers.length > 0 && <div className="field">
          <label htmlFor={`${id}-vendedor`}>Vendedor</label>
          <select id={`${id}-vendedor`} className="input" value={seller} onChange={event => setSeller(event.target.value)}>
            <option value="">Todos</option>
            {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>}
        {categories.length > 0 && <div className="field">
          <label htmlFor={`${id}-categoria`}>Categoria</label>
          <select id={`${id}-categoria`} className="input" value={category} onChange={event => setCategory(event.target.value)}>
            <option value="">Todas</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>}
        <div className="field">
          <label htmlFor={`${id}-pagamento`}>Forma de pagamento</label>
          <select id={`${id}-pagamento`} className="input" value={payment} onChange={event => setPayment(event.target.value)}>
            <option value="">Todas</option>
            {Object.entries(PAYMENT_TYPE).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
      </div>

      <div className="stack-sm">
        <p className="card-sub" id={`${id}-atalhos-rotulo`}>Atalhos de data</p>
        <div className="actions" role="group" aria-labelledby={`${id}-atalhos-rotulo`}>
          {shortcuts.map(s => (
            <button key={s.label} type="button" className="btn btn-sm" onClick={s.apply}>{s.label}</button>
          ))}
        </div>
      </div>

      {invalid
        ? <p className="empty" role="status">Escolha um período em que a data final não seja anterior à inicial.</p>
        : <p className="card-sub" role="status">
            Recorte do arquivo: {formatDate(from)} a {formatDate(to)}
            {category && categories.length > 0 ? ' · estornos ficam fora quando há filtro de categoria' : ''}
          </p>}

      <div className="actions">
        {FORMATS.map(f => (
          <button key={f.id} type="button" className={f.id === 'XLSX' ? 'btn btn-primary' : 'btn'}
                  disabled={invalid || busy !== null} onClick={() => run(f.id)} title={f.hint}>
            {busy === f.id ? 'Gerando…' : f.label}
          </button>
        ))}
      </div>

      <div role="status" className="status-slot">
        {error && <p className="notice notice-error">{error}</p>}
        {!error && done && <p className="notice notice-ok">Arquivo gerado: {done}</p>}
      </div>
    </section>
  );
}
