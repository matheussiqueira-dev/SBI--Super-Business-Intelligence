'use client';
import { useEffect, useState, type ReactNode } from 'react';

/**
 * Conteiner da tabela com rolagem horizontal propria (a pagina nunca rola de lado, WCAG 1.4.10). Quando a tabela fica mais
 * larga que a tela, a regiao recebe foco e nome para ser rolada pelo teclado (WCAG 2.1.1); sem rolagem, nao vira parada de Tab.
 */
export default function TableWrap({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    if (!node) return;
    const check = () => setScrolls(node.scrollWidth > node.clientWidth + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return (
    <div ref={setNode} className={className ? `table-wrap ${className}` : 'table-wrap'}
         {...(scrolls ? { tabIndex: 0, role: 'group', 'aria-label': `${label}, tabela com rolagem lateral` } : {})}>
      {children}
    </div>
  );
}
