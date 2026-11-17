'use client';
// Gestao de metas da demonstracao (secao 3.2 do plano de evolucao): editar a meta da loja e a distribuicao por
// vendedor de um mes, com as mesmas restricoes do servidor (nada negativo e a soma fechando exatamente com a loja).
// A meta anterior nao e apagada: fica no historico do periodo, com quem alterou e quando.
import { useMemo, useState } from 'react';
import Drawer from '../../components/drawer.tsx';
import TableWrap from '../../components/table-wrap.tsx';
import { Icon } from '../../components/brand/icons.tsx';
import { MiniMeter } from '../../components/meter.tsx';
import { formatDateTime, formatPercent, money, parseDecimal, sentence } from '../../lib/format.ts';
import { distributionMatches, splitEvenly, sum } from '../../lib/goals.ts';
import { monthLabel, monthGoalView } from '../../lib/demo/metrics.ts';
import { GOAL_PROBLEM_MESSAGE, canEditGoals, createGoalRecord, goalHistory, validateGoal, type DemoRole } from '../../lib/demo/state.ts';
import { SELLER_IDS } from '../../lib/demo/scenario.ts';
import { useDemo } from '../../lib/demo/store.tsx';
import { StateBadge } from './panels.tsx';

/** Meses oferecidos para edicao: os seis ultimos com meta e os que faltam do ano corrente. */
function editablePeriods(periods: readonly string[], goals: readonly string[]): string[] {
  return [...new Set([...periods.slice(-6), ...goals])].sort().slice(-12);
}

export default function GoalsDialog({ open, onClose, role }: { open: boolean; onClose: () => void; role: DemoRole }) {
  const { base, ledger, model, session, dispatch, announce, today } = useDemo();
  const periods = useMemo(() => editablePeriods(ledger.periods, ledger.goals.map(goal => goal.period)), [ledger]);
  const [period, setPeriod] = useState(() => periods[periods.length - 1] ?? today.slice(0, 7));
  const current = ledger.goals.find(goal => goal.period === period);
  const [store, setStore] = useState(() => String((current?.storeGoal ?? 0) / 100));
  const [sellers, setSellers] = useState<Record<number, string>>(() => Object.fromEntries(
    SELLER_IDS.map(id => [id, String(((current?.sellers.find(entry => entry.sellerId === id)?.goal) ?? 0) / 100)])));
  const [problem, setProblem] = useState('');
  const [saved, setSaved] = useState('');

  function load(next: string) {
    const goal = ledger.goals.find(entry => entry.period === next);
    setPeriod(next);
    setStore(String((goal?.storeGoal ?? 0) / 100));
    setSellers(Object.fromEntries(SELLER_IDS.map(id => [id, String(((goal?.sellers.find(entry => entry.sellerId === id)?.goal) ?? 0) / 100)])));
    setProblem('');
    setSaved('');
  }

  const storeValue = parseDecimal(store || '0');
  const sellerValues = SELLER_IDS.map(id => parseDecimal(sellers[id] ?? '0'));
  const distributed = sum(sellerValues.map(value => (Number.isFinite(value) ? value : 0)));
  const matches = Number.isFinite(storeValue) && distributionMatches(storeValue, sellerValues.map(value => (Number.isFinite(value) ? value : 0)));

  function divide() {
    const parts = splitEvenly(Number.isFinite(storeValue) ? storeValue : 0, SELLER_IDS.length);
    setSellers(Object.fromEntries(SELLER_IDS.map((id, index) => [id, String(parts[index] ?? 0)])));
    setProblem('');
  }

  function save() {
    const input = {
      period, storeGoal: Number.isFinite(storeValue) ? storeValue : -1,
      sellers: SELLER_IDS.map((id, index) => ({ sellerId: id, goal: Number.isFinite(sellerValues[index]) ? sellerValues[index]! : -1 })),
    };
    const invalid = validateGoal(input, role);
    if (invalid) { setProblem(GOAL_PROBLEM_MESSAGE[invalid]); return; }
    dispatch({ type: 'goal', record: createGoalRecord(input, role) });
    setProblem('');
    setSaved(`Meta de ${monthLabel(period)} salva na demonstração: ${money(input.storeGoal)}.`);
    announce(`Meta de ${monthLabel(period)} alterada para ${money(input.storeGoal)} na demonstração.`);
  }

  const history = goalHistory(base, session, period);
  const comparison = useMemo(() => ledger.periods.slice(-6)
    .map(item => monthGoalView(model, item, today, null)), [ledger.periods, model, today]);

  if (!canEditGoals(role)) {
    return (
      <Drawer open={open} title="Metas comerciais" onClose={onClose}>
        <p className="notice notice-warn">{GOAL_PROBLEM_MESSAGE.SEM_PERMISSAO}</p>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} title="Metas comerciais da demonstração" onClose={onClose}>
      <div className="stack-sm">
        <p className="notice">A alteração vale só nesta aba da demonstração. A meta anterior fica no histórico do mês;
          “Restaurar demonstração” devolve o plano original.</p>
        {problem && <p className="notice notice-error" role="alert">{problem}</p>}
        {saved && <p className="notice notice-ok" role="status">{saved}</p>}

        <div className="field">
          <label htmlFor="demo-meta-periodo">Mês</label>
          <select id="demo-meta-periodo" className="select" value={period} onChange={event => load(event.target.value)}>
            {periods.map(item => <option key={item} value={item}>{sentence(monthLabel(item))}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="demo-meta-loja">Meta da loja (R$)</label>
          <input id="demo-meta-loja" className="input" type="text" inputMode="decimal" value={store}
                 onChange={event => setStore(event.target.value)} />
        </div>

        <fieldset className="plain-fieldset stack-sm">
          <legend>Meta individual por vendedor (R$)</legend>
          {SELLER_IDS.map(id => (
            <div className="field" key={id}>
              <label htmlFor={`demo-meta-${id}`}>{model.personName(id)}</label>
              <input id={`demo-meta-${id}`} className="input" type="text" inputMode="decimal" value={sellers[id] ?? '0'}
                     onChange={event => setSellers(current => ({ ...current, [id]: event.target.value }))} />
            </div>
          ))}
          <p className={matches ? 'caption' : 'notice notice-warn'}>
            Distribuído: <span className="num">{money(distributed)}</span> de <span className="num">{money(Number.isFinite(storeValue) ? storeValue : 0)}</span>.
            {matches ? ' A soma fecha com a meta da loja.' : ' A soma precisa ser igual à meta da loja.'}
          </p>
          <button type="button" className="btn" onClick={divide}>Dividir igualmente entre os vendedores</button>
        </fieldset>

        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={save}><Icon name="check" />Salvar meta na demonstração</button>
          <button type="button" className="btn" onClick={onClose}>Fechar</button>
        </div>

        <section className="stack-sm" aria-labelledby="demo-meta-historico">
          <h3 id="demo-meta-historico">Histórico da meta de {monthLabel(period)}</h3>
          <TableWrap label={`Histórico da meta de ${monthLabel(period)}`}><table>
            <caption className="sr-only">Alterações da meta do mês</caption>
            <thead><tr><th scope="col">Origem</th><th scope="col" className="right">Meta da loja</th>
              <th scope="col">Responsável</th><th scope="col">Quando</th></tr></thead>
            <tbody>{history.map((record, index) => (
              <tr key={`${record.period}-${index}`}>
                <td>{record.source === 'PLANO' ? 'Plano da base' : 'Alteração na demonstração'}</td>
                <td className="num right">{money(record.storeGoal / 100)}</td>
                <td>{record.updatedBy}</td>
                <td className="num">{formatDateTime(record.updatedAt)}</td>
              </tr>
            ))}</tbody>
          </table></TableWrap>
        </section>

        <section className="stack-sm" aria-labelledby="demo-meta-comparacao">
          <h3 id="demo-meta-comparacao">Comparação entre meses</h3>
          <TableWrap label="Meta e realizado dos últimos meses"><table>
            <caption className="sr-only">Meta, realizado e atingimento por mês</caption>
            <thead><tr><th scope="col">Mês</th><th scope="col" className="right">Meta</th>
              <th scope="col" className="right">Realizado</th><th scope="col" className="right">Atingimento</th>
              <th scope="col">Situação</th></tr></thead>
            <tbody>{comparison.map(view => (
              <tr key={view.period}>
                <td>{sentence(view.label)}</td>
                <td className="num right">{view.goal === null ? 'Sem meta' : money(view.goal)}</td>
                <td className="num right">{money(view.realized)}</td>
                <td className="num right">{view.goal !== null && view.goal > 0
                  ? <MiniMeter realized={view.realized} goal={view.goal} percent={view.assessment.achievement} />
                  : formatPercent(null)}</td>
                <td><StateBadge state={view.assessment.state} running={view.assessment.daysLeft > 0} /></td>
              </tr>
            ))}</tbody>
          </table></TableWrap>
        </section>
      </div>
    </Drawer>
  );
}
