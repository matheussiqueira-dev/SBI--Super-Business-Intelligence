// Protocolo e chave de idempotencia da cotacao (plano comercial, secao 06).
//
// O protocolo e o que a pessoa ve na confirmacao e repete ao falar com o comercial: data da operacao mais seis
// caracteres sorteados, sem as letras e numeros que se confundem ao ditar (0/O, 1/I/L, 2/Z, 5/S, 8/B).
//
// A chave de idempotencia e o resumo do conteudo normalizado mais o dia da operacao: o mesmo envio repetido
// (recarregar e enviar de novo, clique duplo, tentativa apos erro de rede) recupera o mesmo protocolo, e um envio
// de conteudo diferente abre uma solicitacao nova. A chave nao guarda o conteudo -- e um SHA-256 de 64 hex.
import { zonedDate, type BusinessCalendar } from './calendar.ts';
import type { QuoteRequest } from './lead.ts';

const ALPHABET = '34679ACDEFGHJKMNPQRTUVWXY';

export const PROTOCOL = /^SBI-\d{8}-[34679ACDEFGHJKMNPQRTUVWXY]{6}$/;

/** Sufixo sorteado com o gerador criptografico da plataforma (Node e Edge expoem o mesmo crypto global). */
export function randomSuffix(length = 6, random: (size: number) => Uint8Array = size => globalThis.crypto.getRandomValues(new Uint8Array(size))): string {
  // Rejeicao por faixa: 250 = 25 * 10, o maior multiplo de 25 abaixo de 256, para cada letra sair com a mesma chance.
  const limit = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  let out = '';
  while (out.length < length) {
    for (const byte of random(length * 2)) {
      if (byte >= limit) continue;
      out += ALPHABET[byte % ALPHABET.length];
      if (out.length === length) break;
    }
  }
  return out;
}

export function newProtocol(receivedAt: Date, calendar: BusinessCalendar, suffix: string = randomSuffix()): string {
  return `SBI-${zonedDate(receivedAt, calendar.timeZone).replaceAll('-', '')}-${suffix}`;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Chave unica do envio. Entram os campos normalizados e o dia local da operacao: a mesma loja pode abrir uma
 * solicitacao nova no dia seguinte sem recuperar o protocolo antigo.
 */
export async function idempotencyKey(request: QuoteRequest, receivedAt: Date, calendar: BusinessCalendar): Promise<string> {
  const fields = [
    request.email, request.company.toLowerCase(), request.name.toLowerCase(),
    `${request.city.toLowerCase()}/${request.uf}`, request.segment.toLowerCase(), request.whatsapp,
    request.message.toLowerCase(), zonedDate(receivedAt, calendar.timeZone),
  ];
  // "\u0000" nao aparece nos campos normalizados: separa sem deixar dois conteudos diferentes virarem a mesma chave.
  return sha256Hex(fields.join('\u0000'));
}

/** Chave vinda do cliente (cabecalho Idempotency-Key): aceita so o formato de um UUID ou hex de 32 a 64. */
export function clientKey(value: string | null): string | null {
  const raw = (value ?? '').trim().toLowerCase();
  return /^[0-9a-f]{32,64}$/.test(raw.replaceAll('-', '')) ? raw.replaceAll('-', '') : null;
}
