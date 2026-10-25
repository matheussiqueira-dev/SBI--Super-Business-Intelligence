import type { Metadata } from 'next';
import { PRODUCT_PHOTOS } from '../../../lib/product-photos.ts';
import PageHeader from '../../../components/page-header.tsx';
import TableWrap from '../../../components/table-wrap.tsx';

export const metadata: Metadata = { title: 'Créditos das imagens' };

/** Fontes das imagens de produto e dos avatares da equipe. */
export default function CreditosPage() {
  return (
    <div className="stack">
      <PageHeader title="Créditos das imagens"
        description="Fotos de produto do Wikimedia Commons, reduzidas e recortadas para miniatura. Produto sem foto livre mostra o ícone da linha." />
      <section className="card stack-sm" aria-label="Avatares da equipe">
        <h2>Avatares da equipe</h2>
        <p>Avatares do arquivo <a href="https://www.figma.com/design/khzxuhK7C7U7UnlzkKufqT/Memoji-Avatars--Community-?node-id=0-1" rel="noreferrer">Memoji Avatars (Community), no Figma</a>, selecionados para os perfis da equipe.</p>
        <p>As expressões faciais são versões derivadas, criadas com auxílio de IA a partir desses avatares.</p>
      </section>
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
