// Formatacao pt-BR para a tela. Valores monetarios chegam como Money {amount, currency: 'BRL'} (C-05).
export interface Money { amount: number; currency: string }

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Fortaleza' });
const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Fortaleza' });
const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Fortaleza' });

/** Manual de marca: dado ausente e escrito por extenso, nunca zero inventado. */
export const MISSING = 'Não informado';
/** Sinal de menos tipografico (U+2212), nunca o hifen, em valores negativos e descontos (manual v2.0, secao 23). */
export const MINUS = '\u2212';
const oneDecimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const COMPACT_SCALES: readonly (readonly [number, string])[] = [[1, ''], [1e3, ' mil'], [1e6, ' mi'], [1e9, ' bi']];
const brlAmount = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Fortaleza' });
const monthShort = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'America/Fortaleza' });
const percent = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Espacos nao separaveis do Intl viram espaco comum e o hifen de negativo vira o sinal de menos. */
function plain(text: string): string {
  return text.replace(/[\u00A0\u202F]/g, ' ').replace(/-/g, MINUS);
}

function amountOf(value: Money | number): number {
  return typeof value === 'number' ? value : value.amount;
}

export function money(value: Money | number | null | undefined): string {
  if (value === null || value === undefined) return MISSING;
  return plain(brl.format(amountOf(value)));
}

/** Valor de indicador em duas partes, para o "R$" sair menor (manual: 64% do corpo, cor de apoio); null quando ausente. */
export function moneyParts(value: Money | number | null | undefined): { unit: string; amount: string } | null {
  if (value === null || value === undefined) return null;
  const amount = amountOf(value);
  return { unit: 'R$', amount: `${amount < 0 ? MINUS : ''}${brlAmount.format(Math.abs(amount))}` };
}

/** Desconto escrito como subtracao: "− R$ 60,00"; sem desconto, "R$ 0,00". */
export function discountMoney(value: Money | number | null | undefined): string {
  if (value === null || value === undefined) return MISSING;
  const amount = amountOf(value);
  return amount > 0 ? `${MINUS} ${money(amount)}` : money(0);
}

/**
 * Escala e sufixo (mil, mi, bi) calculados aqui, e nao pela notacao compacta do Intl, cujo resultado muda com a
 * versao dos dados de localidade do Node ("R$ 47,0 mil").
 */
function compact(value: number): string {
  const abs = Math.abs(value);
  let index = 0;
  while (index < COMPACT_SCALES.length - 1 && Math.round((abs / COMPACT_SCALES[index]![0]) * 10) / 10 >= 1000) index++;
  const [size, suffix] = COMPACT_SCALES[index]!;
  const scaled = Math.round((abs / size) * 10) / 10;
  return `${value < 0 && scaled > 0 ? '-' : ''}${oneDecimal.format(scaled)}${suffix}`;
}

/** Valor curto para rotulo de grafico: "R$ 47 mil", "R$ 1,2 mi". */
export function compactMoney(value: Money | number): string {
  return plain(`R$ ${compact(amountOf(value))}`).replace(`R$ ${MINUS}`, `${MINUS}R$ `);
}

/** Divisao do eixo, sem a moeda (o titulo do grafico diz "em reais"): "20 mil", "1,2 mi". So em eixos, nunca em cartoes. */
export function compactNumber(value: number): string {
  return plain(compact(value));
}

/** Intervalo de dias no formato do manual, com meia-risca e sem espacos: "1–6 set.", "28 set.–4 out.". */
export function formatShortRange(from: string, to: string): string {
  const month = (iso: string) => monthShort.format(new Date(`${iso}T12:00:00-03:00`)).replace(/\.?$/, '.');
  const day = (iso: string) => String(Number(iso.slice(8, 10)));
  if (from === to) return `${day(from)} ${month(from)}`;
  return from.slice(0, 7) === to.slice(0, 7) ? `${day(from)}–${day(to)} ${month(to)}` : `${day(from)} ${month(from)}–${day(to)} ${month(to)}`;
}

/** Quantidade com a unidade no singular ou no plural: "1 pedido", "3 pedidos". */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count.toLocaleString('pt-BR')} ${count === 1 ? singular : pluralForm}`;
}

/** Mes de referencia (YYYY-MM) por extenso: "outubro de 2026". */
export function formatMonth(period: string): string {
  return monthName.format(new Date(`${period}-15T12:00:00-03:00`));
}

/** Data e hora da loja: "14/10/2026 14h30". */
export function formatDateTime(iso: string): string {
  return `${date.format(new Date(iso))} ${formatTime(iso)}`;
}

/** Hora local da loja no formato do manual: "14h30" (usada em "Bloqueado até 10h15"). */
export function formatTime(iso: string): string {
  return time.format(new Date(iso)).replace(':', 'h');
}

const storeDay = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Fortaleza' });

/** Dias de calendario da loja desde o instante: "hoje", "há 1 dia", "há N dias". */
export function daysSince(iso: string, now: Date = new Date()): string {
  const day = (value: Date) => Date.parse(`${storeDay.format(value)}T00:00:00Z`);
  const days = Math.max(0, Math.round((day(now) - day(new Date(iso))) / 86_400_000));
  return days === 0 ? 'hoje' : days === 1 ? 'há 1 dia' : `há ${days} dias`;
}

export function formatDate(isoDate: string): string {
  // Data sem hora (YYYY-MM-DD) e lida ao meio-dia para nao mudar de dia com o fuso.
  return date.format(new Date(`${isoDate}T12:00:00-03:00`));
}

export function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? MISSING : `${percent.format(value)}%`;
}

/** Periodo de datas (YYYY-MM-DD): "01/09 a 30/09/2026"; com anos diferentes, as duas datas completas. */
export function formatPeriod(from: string, to: string): string {
  const start = new Date(`${from}T12:00:00-03:00`);
  if (from.slice(0, 4) !== to.slice(0, 4)) return `${formatDate(from)} a ${formatDate(to)}`;
  return `${dayMonth.format(start)} a ${formatDate(to)}`;
}

/** Iniciais do avatar: primeira letra do primeiro e do ultimo nome ("Allan Lima" -> "AL"). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]!.charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : '';
  return `${first}${last}`.toLocaleUpperCase('pt-BR');
}

export const ORDER_STATUS: Readonly<Record<string, string>> = {
  PENDING_PAYMENT: 'Aguardando pagamento',
  PROCESSING: 'Em processamento',
  PAID: 'Pago',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
};

/** Selo de estado do pedido (sempre icone e texto): pago e entregue ok, aguardando com calendario, cancelado com X, demais informativos. */
export function statusPill(status: string): string {
  if (status === 'PAID' || status === 'SHIPPED' || status === 'DELIVERED') return 'pill pill-ok';
  if (status === 'PENDING_PAYMENT') return 'pill pill-pending';
  if (status === 'CANCELED') return 'pill pill-err';
  return 'pill pill-info';
}

export const PAYMENT_TYPE: Readonly<Record<string, string>> = { PIX: 'Pix', CARD: 'Cartão', BOLETO: 'Boleto' };

export function label(map: Readonly<Record<string, string>>, key: string): string {
  return map[key] ?? key;
}

/** Remove tudo que nao e digito (CPF, CNPJ, CEP, telefone). */
export function digits(value: string): string {
  return value.replace(/\D/g, '');
}

/** "1.234,56", "1234,56" e "1234.56" -> 1234.56. Com virgula, os pontos sao separadores de milhar. */
export function parseDecimal(value: string): number {
  const text = value.trim().replace(/\s/g, '');
  return Number(text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text);
}

/** Primeira letra maiuscula, para o mes por extenso abrir a frase: "Outubro de 2026 · ...". */
export function sentence(text: string): string {
  return text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1);
}

/** Dia da loja de um instante (ISO com fuso): "14/10/2026". */
export function formatDay(iso: string): string {
  return date.format(new Date(iso));
}

/** Itens da pagina no rodape da tabela: "21–40" (pagina comeca em 0); lista inteira na tela vira so o total. */
export function pageRange(page: number, size: number, total: number): string {
  if (total === 0) return '0';
  const first = page * size + 1;
  const last = Math.min((page + 1) * size, total);
  return first === 1 && last === total ? String(total) : `${first}–${last}`;
}
