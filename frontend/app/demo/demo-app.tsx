'use client';
// Casca da demonstracao publica (secoes 9 e 10 do plano de evolucao): identificacao do ambiente, seletor "Visualizar
// como" entre Vendedor, Gerente e CEO, menu lateral adaptado ao perfil, recorte de periodo compartilhado e o botao que
// restaura o estado inicial. A troca de perfil e imediata, sem recarregar a aplicacao: muda so o estado desta aba.
import { useState } from 'react';
import Link from 'next/link';
import Sidebar from '../../components/sidebar.tsx';
import ThemeSwitch from '../../components/theme-switch.tsx';
import ConfirmDialog from '../../components/confirm-dialog.tsx';
import AcademicCredits from '../../components/academic-credits.tsx';
import { Icon, type IconName } from '../../components/brand/icons.tsx';
import { formatDate } from '../../lib/format.ts';
import { CATEGORIES, DEMO_NOTICE, SELLER_IDS, STORE } from '../../lib/demo/scenario.ts';
import { PERIOD_LABEL, ROLE_LABEL, DEMO_ROLES, type DemoPeriodKind, type DemoRole } from '../../lib/demo/state.ts';
import { useDemo } from '../../lib/demo/store.tsx';
import SellerView from './seller-view.tsx';
import ManagerView from './manager-view.tsx';
import CeoView from './ceo-view.tsx';
import SaleDialog from './sale-dialog.tsx';
import GoalsDialog from './goals-dialog.tsx';
import GuidedTour from './guided-tour.tsx';

interface Area { id: string; label: string; icon: IconName }

/** Menu de cada perfil: so telas que existem na demonstracao, na ordem em que o roteiro usa. */
const AREAS: Readonly<Record<DemoRole, readonly Area[]>> = {
  VENDEDOR: [
    { id: 'desempenho', label: 'Meu desempenho', icon: 'desempenho' },
    { id: 'minhas-vendas', label: 'Minhas vendas', icon: 'vendas' },
  ],
  GERENTE: [
    { id: 'visao-geral', label: 'Visão geral', icon: 'visao-geral' },
    { id: 'equipe-metas', label: 'Equipe e metas', icon: 'meta' },
    { id: 'estoque', label: 'Estoque e giro', icon: 'estoque' },
  ],
  CEO: [
    { id: 'executivo', label: 'Painel executivo', icon: 'executivo' },
    { id: 'metas', label: 'Metas comerciais', icon: 'meta' },
  ],
};

const PERIODS: readonly DemoPeriodKind[] = ['TODAY', 'D7', 'MONTH', 'PREV_MONTH', 'CUSTOM'];

export default function DemoApp() {
  const { ledger, session, dispatch, range, today, announcement, announce } = useDemo();
  const [sale, setSale] = useState(false);
  const [goals, setGoals] = useState(false);
  const [tour, setTour] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const areas = AREAS[session.role];
  const area = areas.find(item => item.id === session.view) ?? areas[0]!;
  const sellerName = ledger.people.find(person => person.id === session.sellerId)?.name ?? '';

  function changeRole(role: DemoRole) {
    dispatch({ type: 'role', role });
    announce(`Visualizando como ${ROLE_LABEL[role]}. O recorte de período foi mantido.`);
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <Sidebar home="/demo">
        <nav className="nav" aria-label={`Áreas do perfil ${ROLE_LABEL[session.role]}`}>
          <div className="nav-group" role="group" aria-labelledby="demo-menu-perfil">
            <span className="nav-group-label" id="demo-menu-perfil">{ROLE_LABEL[session.role]}</span>
            {areas.map(item => (
              <button key={item.id} type="button" className="nav-item" aria-current={item.id === area.id ? 'page' : undefined}
                      onClick={() => dispatch({ type: 'view', view: item.id })}>
                <Icon name={item.icon} />{item.label}
              </button>
            ))}
          </div>
          <div className="nav-group" role="group" aria-labelledby="demo-menu-apresentacao">
            <span className="nav-group-label" id="demo-menu-apresentacao">Apresentação</span>
            <button type="button" className="nav-item" onClick={() => setTour(true)}><Icon name="tabela" />Apresentação guiada</button>
            <button type="button" className="nav-item" onClick={() => setConfirmReset(true)}><Icon name="info" />Restaurar demonstração</button>
          </div>
        </nav>
        <div className="demo-store">
          <span className="caption">Empresa simulada</span>
          <strong>{STORE.name}</strong>
          <span className="caption">{STORE.segment} · {STORE.units} loja · {STORE.city}</span>
          <span className="caption">Dia da loja: {formatDate(today)}</span>
        </div>
        <div className="account-tools">
          <span className="caption">Tema</span>
          <ThemeSwitch />
        </div>
      </Sidebar>

      <main id="conteudo" className="main" tabIndex={-1}>
        <div className="content stack">
          <div className="demo-bar">
            <p className="demo-flag"><Icon name="info" size={16} /><strong>{DEMO_NOTICE}</strong>
              <span>Nenhum dado real é lido ou alterado. As operações valem apenas nesta aba.</span></p>
            <div className="actions">
              <Link className="btn btn-ghost btn-compact" href="/entrar">Entrar no sistema real</Link>
            </div>
          </div>

          <section className="card stack-md" aria-labelledby="demo-controles">
            <div className="card-head">
              <div>
                <h2 id="demo-controles">Visualizar como</h2>
                <p className="card-sub">Alterne entre os três níveis de gestão da loja; o recorte de período é mantido</p>
              </div>
              <nav aria-label="Nível em exibição"><ol className="breadcrumb">
                <li><span>Demonstração</span></li>
                <li><span>{ROLE_LABEL[session.role]}</span></li>
                <li><span aria-current="location">{area.label}</span></li>
              </ol></nav>
            </div>

            <div className="toolbar">
              <fieldset className="segmented">
                <legend className="sr-only">Visualizar como</legend>
                {DEMO_ROLES.map(role => (
                  <label key={role}>
                    <input type="radio" name="demo-perfil" value={role} checked={session.role === role}
                           onChange={() => changeRole(role)} />
                    <span>{ROLE_LABEL[role]}</span>
                  </label>
                ))}
              </fieldset>
              <div className="actions">
                <button type="button" className="btn" onClick={() => setTour(true)}>Iniciar apresentação guiada</button>
                <button type="button" className="btn btn-primary" onClick={() => setSale(true)}><Icon name="mais" />Registrar venda simulada</button>
              </div>
            </div>

            <div className="filters">
              {session.role === 'VENDEDOR' && (
                <div className="field">
                  <label htmlFor="demo-vendedor">Vendedor em exibição</label>
                  <select id="demo-vendedor" className="select" value={session.sellerId}
                          onChange={event => {
                            const sellerId = Number(event.target.value);
                            dispatch({ type: 'seller', sellerId });
                            announce(`Visão do vendedor ${ledger.people.find(person => person.id === sellerId)?.name ?? ''}.`);
                          }}>
                    {SELLER_IDS.map(id => {
                      const person = ledger.people.find(entry => entry.id === id);
                      return <option key={id} value={id}>{person?.slot ? `${person.slot} · ${person.name}` : person?.name ?? id}</option>;
                    })}
                  </select>
                  <p className="caption">Escolha demonstrativa: na aplicação autenticada cada vendedor vê só os próprios dados.</p>
                </div>
              )}
              <div className="field">
                <label htmlFor="demo-periodo">Período</label>
                <select id="demo-periodo" className="select" value={session.filters.kind}
                        onChange={event => {
                          const kind = event.target.value as DemoPeriodKind;
                          dispatch({ type: 'period', kind });
                          announce(`Recorte: ${PERIOD_LABEL[kind]}.`);
                        }}>
                  {PERIODS.map(kind => <option key={kind} value={kind}>{PERIOD_LABEL[kind]}</option>)}
                </select>
              </div>
              {session.filters.kind === 'CUSTOM' && (
                <>
                  <div className="field">
                    <label htmlFor="demo-de">De</label>
                    <input id="demo-de" className="input" type="date" max={today} value={session.filters.from || range.from}
                           onChange={event => dispatch({ type: 'custom', from: event.target.value, to: session.filters.to || range.to })} />
                  </div>
                  <div className="field">
                    <label htmlFor="demo-ate">Até</label>
                    <input id="demo-ate" className="input" type="date" max={today} value={session.filters.to || range.to}
                           onChange={event => dispatch({ type: 'custom', from: session.filters.from || range.from, to: event.target.value })} />
                  </div>
                </>
              )}
              <div className="field">
                <label htmlFor="demo-categoria">Categoria</label>
                <select id="demo-categoria" className="select" value={session.filters.categoryId ?? ''}
                        onChange={event => {
                          const categoryId = event.target.value === '' ? null : Number(event.target.value);
                          dispatch({ type: 'category', categoryId });
                          announce(categoryId === null ? 'Todas as categorias.' : `Categoria: ${CATEGORIES.find(item => item.id === categoryId)?.name ?? ''}.`);
                        }}>
                  <option value="">Todas</option>
                  {CATEGORIES.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </div>
            </div>
            <p className="caption">Indicadores, gráficos e rankings seguem o período escolhido. As metas são sempre do mês
              de referência do recorte, e o filtro de categoria não altera metas (meta é da venda total).</p>
            <p role="status" aria-live="polite" className="sr-only">{announcement}</p>
            {session.sales.length > 0 && (
              <p className="notice notice-ok" role="status">
                {session.sales.length === 1 ? '1 venda simulada registrada nesta aba' : `${session.sales.length} vendas simuladas registradas nesta aba`}
                {' '}· os três painéis já consideram {session.sales.length === 1 ? 'ela' : 'elas'}.
                {' '}<button type="button" className="btn btn-ghost btn-compact" onClick={() => setConfirmReset(true)}>Restaurar demonstração</button>
              </p>
            )}
          </section>

          {session.role === 'VENDEDOR' && <SellerView onNewSale={() => setSale(true)} />}
          {session.role === 'GERENTE' && <ManagerView onNewSale={() => setSale(true)} onEditGoals={() => setGoals(true)} />}
          {session.role === 'CEO' && <CeoView onNewSale={() => setSale(true)} onEditGoals={() => setGoals(true)} />}

          <footer className="app-footer">
            <p>{DEMO_NOTICE} · {STORE.name} · valores fictícios · Projeto A3 · UNIFG 2026</p>
            <p><Link href="/entrar">Entrar no sistema</Link> · <Link href="/creditos">Créditos das imagens</Link></p>
            <AcademicCredits />
          </footer>
        </div>
      </main>

      <SaleDialog open={sale} onClose={() => setSale(false)} role={session.role} sellerId={session.sellerId} />
      <GoalsDialog open={goals} onClose={() => setGoals(false)} role={session.role} />
      <GuidedTour open={tour} onClose={() => setTour(false)} />
      <ConfirmDialog open={confirmReset} title="Restaurar a demonstração?" confirmLabel="Restaurar" cancelLabel="Manter como está"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          dispatch({ type: 'restore' });
          setConfirmReset(false);
          announce('Demonstração restaurada: metas e resultados voltaram ao estado inicial.');
        }}>
        <p>As vendas simuladas e as metas alteradas nesta aba serão descartadas. A base sintética volta ao estado
          inicial, com as metas do plano comercial.</p>
        <p className="caption">Nenhum dado real é afetado: a demonstração nunca gravou nada fora desta aba.</p>
      </ConfirmDialog>
    </div>
  );
}
