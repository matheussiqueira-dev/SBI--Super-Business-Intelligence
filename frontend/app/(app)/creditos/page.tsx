import type { Metadata } from 'next';
import { PRODUCT_PHOTOS } from '../../../lib/product-photos.ts';
import PageHeader from '../../../components/page-header.tsx';
import TableWrap from '../../../components/table-wrap.tsx';

export const metadata: Metadata = { title: 'Créditos das imagens' };

/** Atribuicao das fotos de produto (Wikimedia Commons), exigida pelas licencas CC BY e CC BY-SA. */
export default function CreditosPage() {
  return (
    <div className="stack">
      <PageHeader title="Créditos das imagens"
        description="Fotos de produto do Wikimedia Commons, reduzidas e recortadas para miniatura. Produto sem foto livre mostra o ícone da linha." />
      <section className="card">
        <TableWrap label="Créditos das imagens">
          <table>
            <caption className="sr-only">Créditos das imagens</caption>
            <thead><tr><th scope="col">Imagem</th><th scope="col">Usada em</th><th scope="col">Autor</th><th scope="col">Licença</th></tr></thead>
            <tbody>{PRODUCT_PHOTOS.map(photo => (
              <tr key={photo.file}>
                <td><div className="product-cell">
                  <img className="thumb" src={`/produtos/${photo.file}`} alt="" width={40} height={40} loading="lazy" decoding="async" />
                  <a href={photo.page} rel="noreferrer">{photo.title}</a></div></td>
                <td>{photo.names.join(', ')}</td>
                <td>{photo.author}</td>
                <td>{photo.licenseUrl ? <a href={photo.licenseUrl} rel="noreferrer">{photo.license}</a> : photo.license}</td>
              </tr>
            ))}</tbody>
          </table>
        </TableWrap>
      </section>
    </div>
  );
}
