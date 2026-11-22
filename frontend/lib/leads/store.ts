// Persistencia da fila comercial (plano comercial, secoes 06 e 11).
//
// Requisito: a captacao nao pode depender do banco operacional do PDV. Uma venda que nao registra ou um login que
// nao entra nao podem impedir a loja interessada de pedir cotacao. Por isso o armazenamento e uma interface com
// adaptadores e nenhum deles fala com a API Java:
//
//   arquivo (SBI_COTACAO_MODO=arquivo) -> diretorio proprio, durável no volume do ambiente; o padrao de
//                                         desenvolvimento e homologacao aponta para dados descartaveis.
//   http    (SBI_COTACAO_MODO=http)    -> grava no servico comercial/CRM configurado, de mesma rede, pelo
//                                         contrato documentado em docs/05-operacao/cotacao-e-fila.md.
//   memoria (SBI_COTACAO_MODO=memoria) -> so testes; perde tudo ao reiniciar.
//   desligado (padrao sem configuracao) -> a pagina publica diz que a cotacao esta indisponivel e aponta o canal real.
//
// Sem configuracao nao existe protocolo de producao: o protocolo so e devolvido depois da gravacao confirmada.
import type { Lead, LeadState, NotificationState, QuoteRequest } from './lead.ts';

export interface SaveInput {
  readonly protocol: string;
  readonly idempotencyKey: string;
  readonly request: QuoteRequest;
  readonly source: string;
  readonly receivedAt: string;
  readonly dueAt: string;
}

export interface SaveResult {
  readonly lead: Lead;
  /** false quando a chave de idempotencia ja existia: o protocolo devolvido e o do primeiro envio. */
  readonly created: boolean;
}

export interface LeadPatch {
  readonly state?: LeadState;
  readonly owner?: string | null;
  readonly backup?: string | null;
  readonly firstHumanReplyAt?: string | null;
  readonly nextStep?: string | null;
  readonly notification?: { readonly state: NotificationState; readonly attempts: number; readonly lastError: string | null };
}

export interface LeadStore {
  readonly kind: 'arquivo' | 'http' | 'memoria';
  /** Grava respeitando a restricao unica da chave de idempotencia. */
  save(input: SaveInput): Promise<SaveResult>;
  get(protocol: string): Promise<Lead | null>;
  /** Mais recentes primeiro. */
  list(options?: { readonly state?: LeadState; readonly limit?: number }): Promise<Lead[]>;
  update(protocol: string, patch: LeadPatch): Promise<Lead | null>;
}

export function newLead(input: SaveInput): Lead {
  return {
    protocol: input.protocol,
    idempotencyKey: input.idempotencyKey,
    request: input.request,
    source: input.source,
    receivedAt: input.receivedAt,
    dueAt: input.dueAt,
    state: 'novo',
    owner: null,
    backup: null,
    firstHumanReplyAt: null,
    nextStep: null,
    notification: { state: 'pendente', attempts: 0, lastError: null },
  };
}

export function applyPatch(lead: Lead, patch: LeadPatch): Lead {
  return {
    ...lead,
    state: patch.state ?? lead.state,
    owner: patch.owner === undefined ? lead.owner : patch.owner,
    backup: patch.backup === undefined ? lead.backup : patch.backup,
    firstHumanReplyAt: patch.firstHumanReplyAt === undefined ? lead.firstHumanReplyAt : patch.firstHumanReplyAt,
    nextStep: patch.nextStep === undefined ? lead.nextStep : patch.nextStep,
    notification: patch.notification ?? lead.notification,
  };
}

export function sortByReceivedDesc(leads: readonly Lead[]): Lead[] {
  return [...leads].sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : a.receivedAt > b.receivedAt ? -1 : 0));
}
