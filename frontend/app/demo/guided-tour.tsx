'use client';
// Apresentacao guiada (secao 16 do plano de evolucao): o roteiro do bloco pratico da A3 em etapas. Cada etapa diz o
// que mostrar e leva a demonstracao ao perfil, a area e ao recorte certos, para a troca na banca nao depender de
// lembrar o caminho. E um recurso secundario: a demonstracao funciona inteira sem ele.
import { useState } from 'react';
import Drawer from '../../components/drawer.tsx';
import { Icon } from '../../components/brand/icons.tsx';
import { REFERENCE_MONTH } from '../../lib/demo/scenario.ts';
import { ROLE_LABEL, type DemoPeriodKind, type DemoRole } from '../../lib/demo/state.ts';
import { useDemo } from '../../lib/demo/store.tsx';
import { money } from '../../lib/format.ts';

interface Step {
  title: string;
  role: DemoRole;
  view: string;
  period: DemoPeriodKind;
  say: string;
  check: string;
}

const STEPS: readonly Step[] = [
  {
    title: 'Momento 1 — Entrada pública',
    role: 'GERENTE', view: 'visao-geral', period: 'PREV_MONTH',
    say: 'Abrimos o SBI sem login, pela rota /demo. A loja simulada é uma varejista de moda casual com um gerente e três vendedores, e a meta do mês fechado é de R$ 60.000.',
    check: 'Mostre o aviso de ambiente de demonstração, a meta da loja e o atingimento do mês fechado.',
  },
  {
    title: 'Momento 2 — Vendedor',
    role: 'VENDEDOR', view: 'desempenho', period: 'MONTH',
    say: 'No perfil do vendedor aparecem só os dados dele: meta individual, acumulado, o que falta e as próprias vendas. Registramos agora uma venda fictícia pela sacola sugerida do roteiro.',
    check: 'Anote o faturamento e o atingimento antes de registrar. Depois registre a venda e veja os dois números subirem.',
  },
  {
    title: 'Momento 3 — Gerente',
    role: 'GERENTE', view: 'visao-geral', period: 'MONTH',
    say: 'Trocando para o gerente, a mesma venda já está no consolidado da loja: receita, meta, ticket médio e o ranking da equipe mudaram juntos.',
    check: 'Compare o faturamento da loja com o valor anterior: a diferença é exatamente o valor da venda registrada.',
  },
  {
    title: 'Momento 4 — CEO',
    role: 'CEO', view: 'executivo', period: 'MONTH',
    say: 'Na visão executiva a mesma transação entra no resultado financeiro: faturamento, CMV, lucro bruto e margem são recalculados a partir dos itens vendidos.',
    check: 'Mostre o lucro bruto e a margem do recorte, e a projeção de fechamento identificada como estimativa.',
  },
  {
    title: 'Momento 5 — Banco de dados e qualidade',
    role: 'CEO', view: 'metas', period: 'PREV_MONTH',
    say: 'Os três níveis leem o mesmo registro de pedidos: uma venda é uma transação lógica só. As metas ficam por período, com histórico, e período futuro aparece apenas como meta.',
    check: 'Mostre o acompanhamento mês a mês, o mês fechado reconciliando com o cenário de referência e, se quiser, o botão Restaurar demonstração.',
  },
];

export default function GuidedTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { dispatch, announce } = useDemo();
  const [index, setIndex] = useState(0);
  const step = STEPS[Math.min(index, STEPS.length - 1)]!;

  function go(position: number) {
    const target = STEPS[position];
    if (!target) return;
    setIndex(position);
    dispatch({ type: 'role', role: target.role });
    dispatch({ type: 'view', view: target.view });
    dispatch({ type: 'period', kind: target.period });
    announce(`${target.title}. Perfil ${ROLE_LABEL[target.role]}.`);
  }

  return (
    <Drawer open={open} title="Apresentação guiada" onClose={onClose}>
      <div className="stack-sm">
        <p className="caption">Roteiro do bloco prático (cerca de 8 minutos). Cada etapa leva a demonstração ao perfil,
          à área e ao recorte certos. O cenário de referência do mês fechado é {money(REFERENCE_MONTH.netRevenue)} de
          {' '}{money(REFERENCE_MONTH.storeGoal)} ({REFERENCE_MONTH.achievementPercent}% da meta).</p>
        <ol className="stepper" aria-label="Etapas do roteiro">
          {STEPS.map((item, position) => (
            <li key={item.title} className={position === index ? 'done' : undefined}>
              <span className="step-n">{position + 1}</span>
              <button type="button" className="btn btn-ghost btn-compact" aria-current={position === index ? 'step' : undefined}
                      onClick={() => go(position)}>{item.title}</button>
            </li>
          ))}
        </ol>
        <section className="card stack-sm" aria-labelledby="demo-roteiro-etapa">
          <h3 id="demo-roteiro-etapa">{step.title}</h3>
          <p>{step.say}</p>
          <p className="notice"><strong>O que mostrar:</strong> {step.check}</p>
          <div className="actions">
            <button type="button" className="btn" onClick={() => go(Math.max(0, index - 1))} disabled={index === 0}>
              <Icon name="chevron-esquerda" />Etapa anterior
            </button>
            <button type="button" className="btn btn-primary" onClick={() => go(Math.min(STEPS.length - 1, index + 1))}
                    disabled={index === STEPS.length - 1}>
              Próxima etapa<Icon name="chevron-direita" />
            </button>
          </div>
        </section>
      </div>
    </Drawer>
  );
}
