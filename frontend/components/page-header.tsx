import type { ReactNode } from 'react';

/**
 * Cabecalho de tela (manual v2.0, secao 28): secao do menu ou trilha, um titulo por tela, a regra do dado logo abaixo e
 * as acoes a direita. A trilha so aparece quando ha tela de origem (cliente, venda).
 */
export default function PageHeader({ section, title, description, actions, titleId, badge }: {
  section?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode; titleId?: string; badge?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="page-head-text">
        {section && <p className="page-section">{section}</p>}
        <h1 id={titleId}>{title}{badge && <span className="title-badge">{badge}</span>}</h1>
        {description && <p className="page-desc">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}
