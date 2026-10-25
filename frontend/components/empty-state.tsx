import type { ReactNode } from 'react';
import { Icon, type IconName } from './brand/icons.tsx';

/** Estado vazio (manual v2.0, figura 27): diz por que esta vazio e oferece a proxima acao. */
export default function EmptyState({ icon, title, children, action }: { icon: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon name={icon} size={24} /></span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action && <div className="actions">{action}</div>}
    </div>
  );
}
