import type { Metadata } from 'next';
import Link from 'next/link';
import { APPLE_PRODUCTS } from '../../../lib/demo/apple-catalog.ts';
import { PRODUCT_PHOTOS } from '../../../lib/product-photos.ts';
import { DEMO_NOTICE, STORE } from '../../../lib/demo/scenario.ts';
import PageHeader from '../../../components/page-header.tsx';
import TableWrap from '../../../components/table-wrap.tsx';

export const metadata: Metadata = {
  title: 'Créditos das imagens · Demonstração',
  description: 'Fonte do catálogo e licenças das fotos de produto na demonstração pública do SBI.',
};

const APPLE_NAMES = new Map(APPLE_PRODUCTS.map(([sku, name]) => [sku, name]));
const APPLE_PHOTOS = PRODUCT_PHOTOS.flatMap(photo => {
  const names = photo.skus.flatMap(sku => APPLE_NAMES.get(sku) ?? []);
  return names.length > 0 ? [{ ...photo, names }] : [];
});
export default function DemoCreditosPage() {
  return (
    <main className="main" id="conteudo">
      <div className="content stack">
        <PageHeader section={<Link href="/demo">Demonstração</Link>} title="Créditos das imagens"
          description="Fotos de produto do Wikimedia Commons, reduzidas e recortadas para miniatura. Produto sem foto livre mostra o ícone da linha." />
        <section className="card stack-sm" aria-labelledby="demo-catalogo-fonte">
          <h2 id="demo-catalogo-fonte">Catálogo e preços de referência</h2>
          <p>O catálogo vem da massa acadêmica do SBI, baseada no conjunto público da Olist.
            Consulte a <a href="https://github.com/matheussiqueira-dev/SBI--Super-Business-Intelligence/blob/main/docs/03-banco-de-dados/pacote-sql/olist/NOTICE.md">atribuição da massa Olist</a>.</p>
        </section>
        <section className="card">
          <TableWrap label="Créditos das imagens">
            <table>
              <caption className="sr-only">Créditos das imagens</caption>
              <thead><tr><th scope="col">Imagem</th><th scope="col">Usada em</th><th scope="col">Autor</th><th scope="col">Licença</th></tr></thead>
              <tbody>{APPLE_PHOTOS.map(photo => (
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
        <footer className="app-footer">
          <p>{DEMO_NOTICE} · {STORE.name} · Projeto A3 · UNIFG 2026</p>
          <p><Link href="/demo">Voltar para a demonstração</Link> · <Link href="/entrar">Entrar no sistema</Link></p>
        </footer>
      </div>
    </main>
  );
}
