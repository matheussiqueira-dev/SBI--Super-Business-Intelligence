'use client';
import { pageRange } from '../lib/format.ts';
import { Icon } from './brand/icons.tsx';

/** Rodape da lista com a contagem e, havendo mais de uma pagina, Anterior e Proxima (page comeca em 0, C-18). */
export default function Pager({ page, size, total, onPage, noun = 'itens' }: {
  page: number; size: number; total: number; onPage: (page: number) => void; noun?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (total === 0) return null;
  return (
    <div className="table-foot">
      <p className="pager-count num">Mostrando {pageRange(page, size, total)} de {total.toLocaleString('pt-BR')} {noun}</p>
      {pages > 1 && <nav className="pager" aria-label="Paginação">
        <span className="pager-count num" aria-live="polite">Página {page + 1} de {pages}</span>
        <button type="button" className="btn btn-sm" disabled={page === 0} onClick={() => onPage(page - 1)}>
          <Icon name="chevron-esquerda" size={16} />Anterior</button>
        <button type="button" className="btn btn-sm" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>
          Próxima<Icon name="chevron-direita" size={16} /></button>
      </nav>}
    </div>
  );
}
