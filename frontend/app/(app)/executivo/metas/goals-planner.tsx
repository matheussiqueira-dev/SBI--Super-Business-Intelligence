'use client';
// Metas do CEO (RF-29, D-EVO-44): meta anual da loja, metas mensais com a distribuicao por vendedor agrupada por
// equipe (a meta do gerente e a soma da equipe) e o realizado de cada mes. A meta anual so o CEO grava; a mensal
// usa PUT /goals/monthly, que o CEO alcanca pela hierarquia.
import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SaveAnnualGoalResponse, SaveMonthlyGoalsResponse } from '../../../../lib/api/generated/sbi.zod.ts';
import { api } from '../../../../lib/api/http.ts';
import { formatDateTime, formatPercent, money, parseDecimal } from '../../../../lib/format.ts';
import { Model, MONTH_NAMES, monthRange, NO_FILTERS, NO_TEAM, type Person } from '../../../../lib/executive.ts';
import { distributionMatches, planCoverage, splitEvenly, sum } from '../../../../lib/goals.ts';
import { ErrorNotice, Loading } from '../../../../components/feedback.tsx';
import { Field } from '../../../../components/customer-form.tsx';
import Drawer from '../../../../components/drawer.tsx';
import { StatusMessage, useStatusMessage } from '../../../../components/status-message.tsx';
import { overviewKey, selectableYears, storeYear, useOverview } from '../use-overview.ts';

const amount = (value: number) => ({ amount: value, currency: 'BRL' as const });
const toInput = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });

export default function GoalsPlanner() {
  const client = useQueryClient();
  const [year, setYear] = useState(storeYear);
  const [editing, setEditing] = useState<number | null>(null);
  const message = useStatusMessage();
  const overview = useOverview(year);
  const model = useMemo(() => overview.data ? new Model(overview.data) : null, [overview.data]);

  if (overview.isLoading) return <Loading label="Carregando metas…" />;
  if (!model) return <ErrorNotice error={overview.error} />;

  const refresh = (text: string) => { void client.invalidateQueries({ queryKey: overviewKey(year) }); message.show(text); };
  const annual = model.overview.annualGoal;
  const planned = model.plannedMonths();
  const coverage = planCoverage(annual?.amount.amount ?? null, planned.amount);
  const sellers = model.overview.people.filter(p => p.role === 'VENDEDOR' && p.active);
  const managers = model.overview.people.filter(p => p.role === 'GERENTE' && p.active);

  return (
    <div className="stack">
      <header className="toolbar">
        <div className="stack-sm">
          <p className="muted">Diretoria / Metas</p>
          <h1>Metas da loja</h1>
          <p className="muted">Anual (CEO), mensal da loja, por gerente (soma da equipe) e por vendedor.</p>
        </div>
        <div className="field"><label htmlFor="metas-ano">Ano</label>
          <select id="metas-ano" className="select" value={year} onChange={event => setYear(Number(event.target.value))}>
            {selectableYears().map(y => <option key={y} value={y}>{y}</option>)}</select></div>
      </header>
      <StatusMessage message={message.message} onClose={message.clear} />
      <ErrorNotice error={overview.error} />

      <div className="grid-2">
        <AnnualGoalCard year={model.year} current={annual?.amount.amount ?? null}
                        updated={annual ? `${annual.updatedBy.name}, ${formatDateTime(annual.updatedAt)}` : null}
                        onSaved={value => refresh(`Meta anual de ${model.year} gravada: ${money(value)}.`)} />
        <section className="card stack-sm" aria-labelledby="cobertura">
          <h2 id="cobertura" className="label">Plano mensal × meta anual</h2>
          <p><span className="money"><strong>{money(planned.amount)}</strong></span> em {planned.months} {planned.months === 1 ? 'mês' : 'meses'} com meta
            {coverage !== null && <> · {formatPercent(coverage)} da meta anual</>}.</p>
          <p className="caption">{coverage === null ? 'Defina a meta anual para acompanhar a cobertura do plano.'
            : coverage < 100 ? `Faltam ${money((annual?.amount.amount ?? 0) - planned.amount)} para as metas mensais cobrirem a meta anual.`
              : 'As metas mensais já cobrem a meta anual.'}</p>
          <p className="caption">Realizado do ano: <span className="money">{money(model.annualGoalStatus().realized)}</span>.</p>
        </section>
      </div>

      <section className="card stack-sm" aria-labelledby="metas-mensais">
        <h2 id="metas-mensais" className="label">Metas mensais de {model.year}</h2>
        <div className="table-wrap" tabIndex={0} role="group" aria-labelledby="metas-mensais"><table>
          <caption className="sr-only">Metas mensais</caption>
          <thead><tr><th scope="col">Mês</th><th scope="col" className="right">Meta da loja</th><th scope="col" className="right">Realizado</th>
            <th scope="col" className="right">Atingimento</th><th scope="col">Distribuição</th><th scope="col"><span className="sr-only">Ações</span></th></tr></thead>
          <tbody>{MONTH_NAMES.map((name, index) => {
            const month = index + 1;
            const goal = model.monthGoal(month);
            const realized = model.measures(NO_FILTERS, monthRange(model.year, month)).net;
            return (
              <tr key={name}>
                <td>{name}</td>
                <td className="num right">{goal ? money(goal.storeGoal) : '—'}</td>
                <td className="num right">{money(realized)}</td>
                <td className="num right">{goal && goal.storeGoal.amount > 0 ? formatPercent((realized * 100) / goal.storeGoal.amount) : '—'}</td>
                <td>{goal ? (goal.sellers.length > 0 ? `${goal.sellers.length} vendedores` : 'Só a loja') : 'Sem meta'}</td>
                <td><button type="button" className="btn btn-ghost" aria-label={`${goal ? 'Editar' : 'Definir'} meta de ${name}`}
                            onClick={() => setEditing(month)}>{goal ? 'Editar' : 'Definir'}</button></td>
              </tr>
            );
          })}</tbody>
        </table></div>
      </section>

      <section className="card stack-sm" aria-labelledby="equipes">
        <h2 id="equipes" className="label">Equipes de venda</h2>
        <p className="caption">A meta de cada gerente é a soma das metas dos vendedores da equipe. Para mudar alguém de equipe, use <Link href="/gestao/usuarios">Usuários</Link>.</p>
        <ul className="stack-sm">
          {[...managers.map(m => m.id), NO_TEAM].map(team => {
            const members = sellers.filter(s => (s.managerId ?? NO_TEAM) === team);
            if (team === NO_TEAM && members.length === 0) return null;
            return <li key={team}><strong>{model.teamName(team)}</strong>: {members.length ? members.map(s => s.name).join(', ') : 'nenhum vendedor'}</li>;
          })}
        </ul>
      </section>

      <Drawer open={editing !== null} title={editing ? `Meta de ${MONTH_NAMES[editing - 1]} de ${model.year}` : ''} onClose={() => setEditing(null)}>
        {editing !== null && <MonthGoalForm model={model} month={editing} sellers={sellers}
          onSaved={() => { refresh(`Meta de ${MONTH_NAMES[editing - 1]} gravada.`); setEditing(null); }} />}
      </Drawer>
    </div>
  );
}

function AnnualGoalCard({ year, current, updated, onSaved }: { year: number; current: number | null; updated: string | null; onSaved: (value: number) => void }) {
  const [problem, setProblem] = useState('');
  const save = useMutation({
    mutationFn: (value: number) => api.request('/executive/goals/annual', { method: 'PUT', body: { year, amount: amount(value) }, schema: SaveAnnualGoalResponse }),
    onSuccess: response => onSaved(response.amount.amount),
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = parseDecimal(String(new FormData(event.currentTarget).get('annual') ?? ''));
    if (!Number.isFinite(value) || value < 0 || value > 9_999_999_999.99) { setProblem('Meta anual: informe um valor em reais, de 0 a 9.999.999.999,99.'); return; }
    setProblem('');
    save.mutate(Math.round(value * 100) / 100);
  }
  return (
    <section className="card stack-sm" aria-labelledby="meta-anual">
      <h2 id="meta-anual" className="label">Meta anual da loja · {year}</h2>
      <p>{current === null ? 'Ainda não definida.' : <span className="money"><strong>{money(current)}</strong></span>}
        {updated && <span className="muted"> · por {updated}</span>}</p>
      <form className="stack-sm" onSubmit={submit} aria-busy={save.isPending} key={`${year}-${current}`}>
        <Field id="annual" label="Nova meta anual (R$)" hint="Somente o CEO define. Ex.: 2.880.000,00" error={problem || undefined}>
          <input id="annual" name="annual" className="input" inputMode="decimal" required defaultValue={current === null ? '' : toInput(current)}
                 aria-invalid={problem ? true : undefined} aria-describedby={problem ? 'annual-error' : undefined} />
        </Field>
        <ErrorNotice error={save.error} />
        <div className="actions"><button type="submit" className="btn btn-primary" disabled={save.isPending}>{save.isPending ? 'Salvando…' : 'Salvar meta anual'}</button></div>
      </form>
    </section>
  );
}

function MonthGoalForm({ model, month, sellers, onSaved }: { model: Model; month: number; sellers: readonly Person[]; onSaved: () => void }) {
  const existing = model.monthGoal(month);
  const initial = Object.fromEntries(sellers.map(s => [s.id, toInput(existing?.sellers.find(g => g.sellerId === s.id)?.goal.amount ?? 0)]));
  const [store, setStore] = useState(existing ? toInput(existing.storeGoal.amount) : '');
  const [values, setValues] = useState<Record<number, string>>(initial);
  const [distribute, setDistribute] = useState(existing ? existing.sellers.length > 0 : sellers.length > 0);
  const [problem, setProblem] = useState('');
  const save = useMutation({
    mutationFn: (body: unknown) => api.request('/goals/monthly', { method: 'PUT', body, schema: SaveMonthlyGoalsResponse }),
    onSuccess: onSaved,
  });
  const storeValue = parseDecimal(store);
  const parsed = sellers.map(s => ({ id: s.id, value: parseDecimal(values[s.id] ?? '0') }));
  const distributed = sum(parsed.map(p => (Number.isFinite(p.value) ? p.value : 0)));
  const teams = [...new Set(sellers.map(s => s.managerId ?? NO_TEAM))];

  function evenly() {
    if (!Number.isFinite(storeValue) || storeValue <= 0) { setProblem('Informe primeiro a meta da loja.'); return; }
    const parts = splitEvenly(storeValue, sellers.length);
    setValues(Object.fromEntries(sellers.map((s, index) => [s.id, toInput(parts[index] ?? 0)])));
    setProblem('');
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(storeValue) || storeValue < 0) { setProblem('Meta da loja: informe um valor em reais.'); return; }
    if (distribute && parsed.some(p => !Number.isFinite(p.value) || p.value < 0)) { setProblem('Meta de vendedor: informe valores em reais, sem negativos.'); return; }
    const shares = distribute ? parsed : [];
    if (!distributionMatches(storeValue, shares.map(p => p.value))) {
      setProblem(`A soma dos vendedores (${money(distributed)}) precisa ser igual à meta da loja (${money(storeValue)}).`);
      return;
    }
    setProblem('');
    save.mutate({ period: `${model.year}-${String(month).padStart(2, '0')}`, storeGoal: amount(Math.round(storeValue * 100) / 100),
      sellers: shares.map(p => ({ sellerId: p.id, goal: amount(Math.round(p.value * 100) / 100) })) });
  }

  return (
    <form className="stack" onSubmit={submit} aria-busy={save.isPending}>
      <Field id="meta-loja" label="Meta da loja no mês (R$)">
        <input id="meta-loja" className="input" inputMode="decimal" required value={store} onChange={event => setStore(event.target.value)} />
      </Field>
      <label className="check"><input type="checkbox" checked={distribute} onChange={event => setDistribute(event.target.checked)} />
        Distribuir entre os vendedores (a soma precisa fechar com a meta da loja)</label>
      {distribute && <>
        <div className="actions"><button type="button" className="btn" onClick={evenly}>Distribuir igualmente</button></div>
        {teams.map(team => {
          const members = sellers.filter(s => (s.managerId ?? NO_TEAM) === team);
          const subtotal = sum(members.map(s => { const v = parseDecimal(values[s.id] ?? '0'); return Number.isFinite(v) ? v : 0; }));
          return (
            <fieldset key={team} className="plain-fieldset stack-sm">
              <legend className="label">{model.teamName(team)} · meta do gerente <span className="money">{money(subtotal)}</span></legend>
              <div className="form-grid">
                {members.map(s => (
                  <Field key={s.id} id={`meta-${s.id}`} label={s.name}>
                    <input id={`meta-${s.id}`} className="input" inputMode="decimal" value={values[s.id] ?? ''}
                           onChange={event => setValues(v => ({ ...v, [s.id]: event.target.value }))} />
                  </Field>
                ))}
              </div>
            </fieldset>
          );
        })}
        <p className={distributionMatches(Number.isFinite(storeValue) ? storeValue : 0, parsed.map(p => (Number.isFinite(p.value) ? p.value : 0))) ? 'notice notice-ok' : 'notice notice-warn'}
           role="status">Distribuído: {money(distributed)} de {Number.isFinite(storeValue) ? money(storeValue) : '—'}.</p>
      </>}
      {problem && <p className="notice notice-error" role="alert">{problem}</p>}
      <ErrorNotice error={save.error} />
      <div className="actions"><button type="submit" className="btn btn-primary" disabled={save.isPending}>{save.isPending ? 'Salvando…' : 'Salvar meta do mês'}</button></div>
    </form>
  );
}
