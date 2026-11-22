#!/usr/bin/env node
// Fila comercial pela linha de comando (plano comercial, secao 06).
//
// E a interface interna restrita de atendimento quando a operacao ainda nao tem CRM: consultar solicitacoes,
// atribuir responsavel e suplente, registrar a primeira resposta humana e ver o que esta perto de vencer.
// Nao abre nenhuma rota HTTP nova -- quem roda precisa de acesso ao ambiente, e o acesso ja e controlado ali.
// Com SBI_COTACAO_MODO=http, os mesmos comandos operam o servico comercial configurado.
//
// Uso (na pasta frontend):
//   node scripts/cotacoes.mjs listar [--estado novo|atribuido|respondido|descartado] [--limite 20]
//   node scripts/cotacoes.mjs vencendo [--horas 4]
//   node scripts/cotacoes.mjs ver <protocolo>
//   node scripts/cotacoes.mjs atribuir <protocolo> --responsavel <nome> [--suplente <nome>]
//   node scripts/cotacoes.mjs responder <protocolo> --proximo-passo "<texto>"
//   node scripts/cotacoes.mjs descartar <protocolo> --motivo "<texto>"
import { businessMinutesBetween, calendarFromEnv } from '../lib/leads/calendar.ts';
import { resolveStore } from '../lib/leads/runtime.ts';

const STATES = ['novo', 'atribuido', 'respondido', 'descartado'];

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const positional = [];
  const flags = {};
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token.startsWith('--')) {
      const name = token.slice(2);
      const next = rest[i + 1];
      if (next === undefined || next.startsWith('--')) flags[name] = 'true';
      else { flags[name] = next; i += 1; }
    } else {
      positional.push(token);
    }
  }
  return { command, positional, flags };
}

function fail(message) {
  console.error(`erro: ${message}`);
  process.exit(1);
}

function hhmm(minutes) {
  const sign = minutes < 0 ? '-' : '';
  const total = Math.abs(minutes);
  return `${sign}${Math.floor(total / 60)}h${String(total % 60).padStart(2, '0')}`;
}

/** Quanto falta (ou passou) do prazo, em horas uteis do calendario configurado. */
function slack(lead, calendar, now) {
  const due = new Date(lead.dueAt);
  if (Number.isNaN(due.getTime())) return { minutes: 0, late: false };
  return now <= due
    ? { minutes: businessMinutesBetween(now, due, calendar), late: false }
    : { minutes: -businessMinutesBetween(due, now, calendar), late: true };
}

function line(lead, calendar, now) {
  const { minutes, late } = slack(lead, calendar, now);
  const place = `${lead.request.city}/${lead.request.uf}`;
  const owner = lead.owner ? `${lead.owner}${lead.backup ? ` (supl. ${lead.backup})` : ''}` : '—';
  const replied = lead.firstHumanReplyAt ? 'respondido' : late ? `VENCIDO ${hhmm(minutes)}` : `faltam ${hhmm(minutes)}`;
  return [
    lead.protocol.padEnd(20),
    lead.state.padEnd(11),
    lead.request.company.slice(0, 26).padEnd(26),
    place.padEnd(22),
    owner.slice(0, 22).padEnd(22),
    replied,
  ].join(' ');
}

function header() {
  return ['PROTOCOLO'.padEnd(20), 'ESTADO'.padEnd(11), 'LOJA'.padEnd(26), 'CIDADE/UF'.padEnd(22), 'RESPONSÁVEL'.padEnd(22), 'PRAZO'].join(' ');
}

async function main() {
  const { command, positional, flags } = parseArgs(process.argv.slice(2));
  const { mode, store, reason } = resolveStore();
  if (!store) fail(`captação de cotações desligada (${reason}). Configure SBI_COTACAO_MODO.`);
  const calendar = calendarFromEnv();
  const now = new Date();
  const protocol = positional[0];

  switch (command) {
    case 'listar': {
      const state = flags.estado;
      if (state && !STATES.includes(state)) fail(`estado inválido: use ${STATES.join(', ')}`);
      const limit = flags.limite ? Number(flags.limite) : 50;
      const leads = await store.list({ ...(state ? { state } : {}), limit: Number.isFinite(limit) ? limit : 50 });
      console.log(`fila ${mode} · ${leads.length} solicitação(ões)${state ? ` em "${state}"` : ''}\n`);
      if (leads.length === 0) return;
      console.log(header());
      for (const lead of leads) console.log(line(lead, calendar, now));
      return;
    }

    case 'vencendo': {
      const hours = Number(flags.horas ?? '4');
      const threshold = (Number.isFinite(hours) ? hours : 4) * 60;
      const leads = (await store.list()).filter(lead => {
        if (lead.firstHumanReplyAt || lead.state === 'descartado') return false;
        const { minutes, late } = slack(lead, calendar, now);
        return late || minutes <= threshold;
      });
      console.log(`sem primeira resposta humana e vencendo em até ${hours}h úteis: ${leads.length}\n`);
      if (leads.length === 0) return;
      console.log(header());
      for (const lead of leads) console.log(line(lead, calendar, now));
      // Codigo de saida 2 serve de gatilho para alerta na escala comercial.
      if (leads.length > 0) process.exitCode = 2;
      return;
    }

    case 'ver': {
      if (!protocol) fail('informe o protocolo');
      const lead = await store.get(protocol);
      if (!lead) fail(`protocolo não encontrado: ${protocol}`);
      const { minutes, late } = slack(lead, calendar, now);
      console.log(`protocolo       ${lead.protocol}`);
      console.log(`estado          ${lead.state}`);
      console.log(`recebida em     ${lead.receivedAt}`);
      console.log(`vence em        ${lead.dueAt} (${late ? `vencido ${hhmm(minutes)}` : `faltam ${hhmm(minutes)}`} úteis)`);
      console.log(`origem          ${lead.source}`);
      console.log(`responsável     ${lead.owner ?? '—'}${lead.backup ? ` · suplente ${lead.backup}` : ''}`);
      console.log(`1ª resposta     ${lead.firstHumanReplyAt ?? 'ainda não registrada'}`);
      console.log(`próximo passo   ${lead.nextStep ?? '—'}`);
      console.log(`confirmação     ${lead.notification.state} (${lead.notification.attempts} tentativa(s))${lead.notification.lastError ? ` · ${lead.notification.lastError}` : ''}`);
      console.log('');
      console.log(`contato         ${lead.request.name} · ${lead.request.email}${lead.request.whatsapp ? ` · ${lead.request.whatsapp}` : ''}`);
      console.log(`loja            ${lead.request.company} · ${lead.request.city}/${lead.request.uf}${lead.request.segment ? ` · ${lead.request.segment}` : ''}`);
      if (lead.request.message) console.log(`mensagem        ${lead.request.message}`);
      return;
    }

    case 'atribuir': {
      if (!protocol) fail('informe o protocolo');
      const owner = flags.responsavel;
      if (!owner || owner === 'true') fail('informe --responsavel <nome>');
      const updated = await store.update(protocol, {
        state: 'atribuido', owner, backup: flags.suplente && flags.suplente !== 'true' ? flags.suplente : null,
      });
      if (!updated) fail(`protocolo não encontrado: ${protocol}`);
      console.log(`${protocol}: responsável ${updated.owner}${updated.backup ? `, suplente ${updated.backup}` : ''}`);
      return;
    }

    case 'responder': {
      if (!protocol) fail('informe o protocolo');
      const step = flags['proximo-passo'];
      if (!step || step === 'true') fail('informe --proximo-passo "<texto>"');
      const current = await store.get(protocol);
      if (!current) fail(`protocolo não encontrado: ${protocol}`);
      if (current.firstHumanReplyAt) {
        // O relogio do retorno para na PRIMEIRA resposta humana: um segundo contato nao reescreve a medida.
        console.log(`${protocol}: primeira resposta já registrada em ${current.firstHumanReplyAt}; só o próximo passo foi atualizado.`);
        await store.update(protocol, { nextStep: step });
        return;
      }
      const updated = await store.update(protocol, {
        state: 'respondido', firstHumanReplyAt: now.toISOString(), nextStep: step,
      });
      const spent = businessMinutesBetween(new Date(updated.receivedAt), now, calendar);
      const onTime = now <= new Date(updated.dueAt);
      console.log(`${protocol}: primeira resposta humana registrada em ${updated.firstHumanReplyAt}`);
      console.log(`${protocol}: ${hhmm(spent)} úteis desde o recebimento · ${onTime ? 'no prazo' : 'FORA do prazo'}`);
      return;
    }

    case 'descartar': {
      if (!protocol) fail('informe o protocolo');
      const why = flags.motivo && flags.motivo !== 'true' ? flags.motivo : null;
      if (!why) fail('informe --motivo "<texto>"');
      const updated = await store.update(protocol, { state: 'descartado', nextStep: why });
      if (!updated) fail(`protocolo não encontrado: ${protocol}`);
      console.log(`${protocol}: descartado · ${why}`);
      return;
    }

    default:
      console.log(`uso: node scripts/cotacoes.mjs <comando>

  listar     [--estado ${STATES.join('|')}] [--limite 20]
  vencendo   [--horas 4]                      sai com código 2 quando há algo vencendo
  ver        <protocolo>
  atribuir   <protocolo> --responsavel <nome> [--suplente <nome>]
  responder  <protocolo> --proximo-passo "<texto>"
  descartar  <protocolo> --motivo "<texto>"

fila atual: ${mode}`);
      process.exitCode = command ? 1 : 0;
  }
}

await main();
