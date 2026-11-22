// Contrato da solicitacao de cotacao (plano comercial, secao 06). Mesma validacao no formulario e no servidor:
// o cliente usa para marcar o campo com erro, o servidor e a autoridade.
//
// Coleta minima: nome, empresa, e-mail e cidade/UF obrigatorios; segmento, WhatsApp e mensagem opcionais.
// Nada alem disso e pedido na pagina -- detalhes da operacao ficam para a conversa comercial.
import { z } from 'zod';

export const UF = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

const UF_SET: ReadonlySet<string> = new Set(UF);

/** Espacos repetidos e espacos nas pontas nao mudam a solicitacao: normalizar antes de validar e de deduplicar. */
export function squeeze(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** "Fortaleza/CE" -> { city, uf }. Aceita a UF em qualquer caixa e espacos ao redor da barra. */
export function parseCityUf(value: string): { city: string; uf: string } | null {
  const parts = squeeze(value).split('/');
  if (parts.length !== 2) return null;
  const city = squeeze(parts[0] ?? '');
  const uf = squeeze(parts[1] ?? '').toUpperCase();
  if (city.length < 2 || city.length > 80 || !UF_SET.has(uf)) return null;
  return { city, uf };
}

/** WhatsApp brasileiro: 10 ou 11 digitos com DDD, com ou sem +55. Guardado so com digitos. */
export function parseWhatsapp(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  const local = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits;
  if (local.length < 10 || local.length > 11) return null;
  if (local[0] === '0' || Number(local.slice(0, 2)) < 11) return null;
  return local;
}

const optionalText = (max: number) =>
  z.string().max(max * 2).transform(squeeze).refine(value => value.length <= max, { message: `Use no máximo ${max} caracteres.` });

/** Campos como chegam do formulario (strings de um <form>), antes de normalizar. */
export const QuoteFormInput = z.object({
  name: z.string().min(1, 'Informe seu nome.').max(240).transform(squeeze)
    .refine(value => value.length >= 2, { message: 'Informe seu nome.' })
    .refine(value => value.length <= 120, { message: 'Use no máximo 120 caracteres.' }),
  company: z.string().min(1, 'Informe o nome da loja.').max(280).transform(squeeze)
    .refine(value => value.length >= 2, { message: 'Informe o nome da loja.' })
    .refine(value => value.length <= 140, { message: 'Use no máximo 140 caracteres.' }),
  email: z.string().min(1, 'Informe um e-mail.').max(254).transform(value => value.trim().toLowerCase())
    .refine(value => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value), { message: 'Informe um e-mail válido.' }),
  cityUf: z.string().min(1, 'Informe cidade e UF, como Fortaleza/CE.').max(120)
    .refine(value => parseCityUf(value) !== null, { message: 'Informe cidade e UF, como Fortaleza/CE.' }),
  segment: optionalText(80).optional().default(''),
  whatsapp: z.string().max(40).optional().default('')
    .refine(value => squeeze(value) === '' || parseWhatsapp(value) !== null, { message: 'Informe DDD e número, como (85) 99999-0000.' }),
  message: optionalText(1000).optional().default(''),
  /** Campo armadilha: fica escondido e vazio para quem usa a pagina. Preenchido, o envio e descartado. */
  site: z.string().max(200).optional().default(''),
});

export type QuoteFormInput = z.input<typeof QuoteFormInput>;

/** Solicitacao normalizada, do jeito que e gravada. */
export interface QuoteRequest {
  readonly name: string;
  readonly company: string;
  readonly email: string;
  readonly city: string;
  readonly uf: string;
  readonly segment: string;
  readonly whatsapp: string;
  readonly message: string;
}

export function normalizeQuote(input: z.output<typeof QuoteFormInput>): QuoteRequest {
  const place = parseCityUf(input.cityUf);
  if (!place) throw new Error('cityUf invalido: valide com QuoteFormInput antes de normalizar.');
  const whatsapp = squeeze(input.whatsapp ?? '');
  return {
    name: input.name,
    company: input.company,
    email: input.email,
    city: place.city,
    uf: place.uf,
    segment: input.segment ?? '',
    whatsapp: whatsapp === '' ? '' : (parseWhatsapp(whatsapp) ?? ''),
    message: input.message ?? '',
  };
}

/** Rotulos da tela, usados tambem na mensagem de erro por campo. */
export const QUOTE_LABELS: Readonly<Record<string, string>> = {
  name: 'Nome', company: 'Loja ou empresa', email: 'E-mail', cityUf: 'Cidade/UF',
  segment: 'Segmento', whatsapp: 'WhatsApp', message: 'Mensagem',
};

export type QuoteFieldErrors = Partial<Record<keyof QuoteRequest | 'cityUf' | 'site', string>>;

/** Primeiro problema de cada campo, na ordem da tela. */
export function quoteFieldErrors(error: z.ZodError): QuoteFieldErrors {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? '');
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

export type LeadState = 'novo' | 'atribuido' | 'respondido' | 'descartado';
export type NotificationState = 'pendente' | 'enviada' | 'falhou' | 'desligada';

export interface Lead {
  readonly protocol: string;
  /** Chave unica do envio: o mesmo conteudo no mesmo dia util recupera o mesmo protocolo. */
  readonly idempotencyKey: string;
  readonly request: QuoteRequest;
  readonly source: string;
  /** ISO 8601 com offset. */
  readonly receivedAt: string;
  /** Vencimento das 24 horas uteis, pelo calendario configurado. */
  readonly dueAt: string;
  readonly state: LeadState;
  readonly owner: string | null;
  readonly backup: string | null;
  /** Primeira resposta humana: para o relogio do retorno. Distinta da confirmacao automatica. */
  readonly firstHumanReplyAt: string | null;
  readonly nextStep: string | null;
  readonly notification: { readonly state: NotificationState; readonly attempts: number; readonly lastError: string | null };
}

export const CONFIRMATION = (protocol: string): string =>
  `Solicitação recebida. Seu protocolo é ${protocol}. Nossa equipe responde em até 24 horas úteis.`;
