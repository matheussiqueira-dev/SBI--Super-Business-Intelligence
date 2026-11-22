// Adaptador de memoria: so para teste e para o modo de desenvolvimento sem disco. Perde tudo ao reiniciar,
// por isso nunca e o adaptador de um ambiente que promete protocolo a um cliente.
import type { Lead, LeadState } from './lead.ts';
import { applyPatch, newLead, sortByReceivedDesc, type LeadPatch, type LeadStore, type SaveInput, type SaveResult } from './store.ts';

export function memoryStore(): LeadStore {
  const byProtocol = new Map<string, Lead>();
  const byKey = new Map<string, string>();
  return {
    kind: 'memoria',
    async save(input: SaveInput): Promise<SaveResult> {
      const seen = byKey.get(input.idempotencyKey);
      if (seen) {
        const existing = byProtocol.get(seen);
        if (existing) return { lead: existing, created: false };
      }
      if (byProtocol.has(input.protocol)) throw new Error('PROTOCOL_TAKEN');
      const lead = newLead(input);
      byProtocol.set(lead.protocol, lead);
      byKey.set(input.idempotencyKey, lead.protocol);
      return { lead, created: true };
    },
    async get(protocol: string): Promise<Lead | null> {
      return byProtocol.get(protocol) ?? null;
    },
    async list(options: { state?: LeadState; limit?: number } = {}): Promise<Lead[]> {
      const all = sortByReceivedDesc([...byProtocol.values()].filter(lead => !options.state || lead.state === options.state));
      return options.limit ? all.slice(0, options.limit) : all;
    },
    async update(protocol: string, patch: LeadPatch): Promise<Lead | null> {
      const current = byProtocol.get(protocol);
      if (!current) return null;
      const updated = applyPatch(current, patch);
      byProtocol.set(protocol, updated);
      return updated;
    },
  };
}
