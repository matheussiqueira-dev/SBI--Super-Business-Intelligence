// Configuracao da edicao comercial: canais externos, endereco publico e estado da captacao de cotacoes.
// Tudo opcional. Cada canal nao configurado some da navegacao ou aparece com a indisponibilidade escrita na tela --
// o site nunca promete um canal que nao existe (plano comercial, secoes 03, 06 e 09).
import { EDITION, isCommercial, type Edition } from '../edition.ts';

/** Link externo aceito na navegacao publica: so https, sem credencial e sem fragmento. */
export function publicUrl(value: string | undefined | null): string | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Origem do site publico, usada na URL canonica e no JSON-LD. Sem configuracao, nao ha canonica. */
export function siteOrigin(value: string | undefined | null = process.env.NEXT_PUBLIC_SBI_SITE_URL): string | null {
  const url = publicUrl(value);
  return url ? new URL(url).origin : null;
}

export interface CommercialChannels {
  /** Central de chamados hospedada fora do ambiente operacional (continua acessivel durante incidente do app). */
  readonly supportUrl: string | null;
  /** Pagina de status independente. */
  readonly statusUrl: string | null;
  /** Telefone de plantao para incidente critico, em formato E.164 (so digitos e "+"). */
  readonly dutyPhone: string | null;
  /** Canal comercial real para quando a captacao do site estiver indisponivel. */
  readonly salesEmail: string | null;
}

const PHONE = /^\+[1-9]\d{7,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function phone(value: string | undefined): string | null {
  const raw = (value ?? '').replace(/[\s()-]/g, '');
  return PHONE.test(raw) ? raw : null;
}

function email(value: string | undefined): string | null {
  const raw = (value ?? '').trim().toLowerCase();
  return EMAIL.test(raw) && raw.length <= 254 ? raw : null;
}

export function channels(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): CommercialChannels {
  return {
    supportUrl: publicUrl(env.NEXT_PUBLIC_SBI_SUPORTE_URL),
    statusUrl: publicUrl(env.NEXT_PUBLIC_SBI_STATUS_URL),
    dutyPhone: phone(env.NEXT_PUBLIC_SBI_PLANTAO_TELEFONE),
    salesEmail: email(env.NEXT_PUBLIC_SBI_COMERCIAL_EMAIL),
  };
}

/**
 * Redacao do suporte na pagina publica (plano comercial, secao 04). "continuo" so entra quando a equipe confirma
 * escala, canal e cobertura: a variavel e a declaracao de quem opera, nao uma consequencia do codigo.
 */
export type SupportCoverage = 'continuo' | 'abertura';

export function supportCoverage(value: string | undefined = process.env.NEXT_PUBLIC_SBI_SUPORTE_COBERTURA): SupportCoverage {
  return (value ?? '').trim().toLowerCase() === 'continuo' ? 'continuo' : 'abertura';
}

export const SUPPORT_TEXT: Readonly<Record<SupportCoverage, { title: string; body: string }>> = {
  continuo: {
    title: 'Suporte remoto 24 horas, todos os dias.',
    body: 'Abra um chamado pelo canal de suporte e acompanhe pelo protocolo. Se a operação estiver parada, o plantão prioriza o incidente e informa a próxima atualização.',
  },
  abertura: {
    title: 'Abra chamados a qualquer hora.',
    body: 'Confira os horários de atendimento e a cobertura do plantão na central. A abertura de chamado é contínua; o atendimento humano segue a escala publicada.',
  },
};

/** Aviso de privacidade publicado ou em homologacao: muda o selo e o texto da pagina /privacidade. */
export type PrivacyStage = 'publicado' | 'homologacao';

export function privacyStage(value: string | undefined = process.env.NEXT_PUBLIC_SBI_PRIVACIDADE_ESTAGIO): PrivacyStage {
  return (value ?? '').trim().toLowerCase() === 'publicado' ? 'publicado' : 'homologacao';
}

/** A indexacao so e liberada na edicao comercial com endereco publico configurado. */
export function indexable(edition: Edition = EDITION, origin: string | null = siteOrigin()): boolean {
  return isCommercial(edition) && origin !== null;
}
