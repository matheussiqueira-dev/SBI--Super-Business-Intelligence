// Adaptador de arquivo da fila comercial. Durabilidade vem do volume do ambiente; o diretorio nunca fica dentro
// de public/ e nao e servido pelo Next.
//
// Restricao unica da chave de idempotencia: o ponteiro chaves/<chave>.txt e criado com a flag "wx", que falha se o
// arquivo existe. Dois envios iguais em paralelo disputam a criacao e so um ganha -- o outro le o ponteiro e devolve
// o protocolo ja gravado. O mesmo vale para o protocolo sorteado, que tambem e criado com "wx".
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Lead, LeadState } from './lead.ts';
import { applyPatch, newLead, sortByReceivedDesc, type LeadPatch, type LeadStore, type SaveInput, type SaveResult } from './store.ts';

const LEADS = 'cotacoes';
const KEYS = 'chaves';

function isExists(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'EEXIST';
}

function isMissing(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'ENOENT';
}

/** Protocolo com formato valido e sem separador de caminho: o nome do arquivo vem dele. */
function safeName(value: string): string {
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(value)) throw new Error('Identificador invalido para nome de arquivo.');
  return value;
}

export function fileStore(root: string): LeadStore {
  const leadPath = (protocol: string) => join(root, LEADS, `${safeName(protocol)}.json`);
  const keyPath = (key: string) => join(root, KEYS, `${safeName(key)}.txt`);

  async function ensure(): Promise<void> {
    await mkdir(join(root, LEADS), { recursive: true });
    await mkdir(join(root, KEYS), { recursive: true });
  }

  async function read(protocol: string): Promise<Lead | null> {
    try {
      return JSON.parse(await readFile(leadPath(protocol), 'utf8')) as Lead;
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  }

  /** Gravacao atomica: escreve ao lado e renomeia, para nunca deixar um JSON pela metade na leitura. */
  async function writeLead(lead: Lead, flag: 'wx' | 'w'): Promise<void> {
    const target = leadPath(lead.protocol);
    if (flag === 'wx') {
      await writeFile(target, JSON.stringify(lead, null, 2), { encoding: 'utf8', flag: 'wx' });
      return;
    }
    const temporary = `${target}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify(lead, null, 2), 'utf8');
    await rename(temporary, target);
  }

  return {
    kind: 'arquivo',

    /**
     * A cotacao e gravada antes do ponteiro da chave, nesta ordem de proposito.
     *
     * Com o ponteiro primeiro, um protocolo sorteado que colidisse deixaria a chave apontando para a cotacao de
     * OUTRA chave; a tentativa seguinte leria esse ponteiro e devolveria o protocolo e os dados de outra loja.
     * Gravando a cotacao primeiro, a flag "wx" do arquivo da cotacao e a propria garantia de protocolo unico e
     * nada fica escrito quando ha colisao.
     *
     * O ponteiro so e aceito como duplicata quando a cotacao apontada carrega a mesma chave. Ponteiro ausente,
     * quebrado ou de outra chave e reescrito, em vez de confundir duas solicitacoes.
     */
    async save(input: SaveInput): Promise<SaveResult> {
      await ensure();
      const lead = newLead(input);
      try {
        await writeLead(lead, 'wx');
      } catch (error) {
        if (!isExists(error)) throw error;
        // Colisao de protocolo sorteado: nada foi gravado, o chamador sorteia outro.
        throw new Error('PROTOCOL_TAKEN');
      }
      const pointer = keyPath(input.idempotencyKey);
      try {
        await writeFile(pointer, input.protocol, { encoding: 'utf8', flag: 'wx' });
        return { lead, created: true };
      } catch (error) {
        if (!isExists(error)) throw error;
      }
      const pointed = await read((await readFile(pointer, 'utf8')).trim());
      if (pointed && pointed.idempotencyKey === input.idempotencyKey) {
        // Outro envio da mesma solicitacao chegou primeiro: a cotacao recem-gravada fica sem referencia e sai.
        await rm(leadPath(input.protocol), { force: true });
        return { lead: pointed, created: false };
      }
      await writeFile(pointer, input.protocol, 'utf8');
      return { lead, created: true };
    },

    get(protocol: string): Promise<Lead | null> {
      return read(protocol).catch(error => {
        if (isMissing(error)) return null;
        throw error;
      });
    },

    async list(options: { state?: LeadState; limit?: number } = {}): Promise<Lead[]> {
      await ensure();
      const files = (await readdir(join(root, LEADS))).filter(name => name.endsWith('.json'));
      const leads: Lead[] = [];
      for (const file of files) {
        const lead = await read(file.slice(0, -'.json'.length));
        if (lead && (!options.state || lead.state === options.state)) leads.push(lead);
      }
      const sorted = sortByReceivedDesc(leads);
      return options.limit ? sorted.slice(0, options.limit) : sorted;
    },

    async update(protocol: string, patch: LeadPatch): Promise<Lead | null> {
      const current = await read(protocol);
      if (!current) return null;
      const updated = applyPatch(current, patch);
      await writeLead(updated, 'w');
      return updated;
    },
  };
}
