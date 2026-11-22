import type { Metadata } from 'next';
import Link from 'next/link';
import { isCommercial } from '../../../lib/edition.ts';
import { DEMO_PRODUCTS } from '../../../lib/demo/catalog.ts';
import { PRODUCT_PHOTOS } from '../../../lib/product-photos.ts';
import { DEMO_NOTICE, STORE } from '../../../lib/demo/scenario.ts';
import PageHeader from '../../../components/page-header.tsx';
import TableWrap from '../../../components/table-wrap.tsx';

export const metadata: Metadata = {
  title: 'Créditos das imagens · Demonstração',
  description: 'Fonte do catálogo e licenças das fotos de produto na demonstração pública do SBI.',
};

// Os creditos acompanham o catalogo da edicao: na comercial os produtos sao proprios e nenhuma foto de terceiro
// entra na tela, entao a tabela de licencas nao tem o que listar -- e dizer "fotos do Wikimedia" ali seria falso.
const CATALOG_NAMES = new Map(DEMO_PRODUCTS.map(([sku, name]) => [sku, name]));
const CREDITED_PHOTOS = PRODUCT_PHOTOS.flatMap(photo => {
  const names = photo.skus.flatMap(sku => CATALOG_NAMES.get(sku) ?? []);
  return names.length > 0 ? [{ ...photo, names }] : [];
});
const COMMERCIAL = isCommercial();
export default function DemoCreditosPage() {
  return (
    <main className="main" id="conteudo">
      <div className="content stack">
        <PageHeader section={<Link href="/demo">Demonstração</Link>} title="Créditos das imagens"
          description={COMMERCIAL
            ? 'Catálogo e equipe inventados para a demonstração comercial. As miniaturas são os ícones de linha do próprio SBI.'
            : 'Fotos de produto do Wikimedia Commons, reduzidas e recortadas para miniatura. Produto sem foto livre mostra o ícone da linha.'} />
        <section className="card stack-sm" aria-labelledby="demo-catalogo-fonte">
          <h2 id="demo-catalogo-fonte">Catálogo e preços de referência</h2>
          {COMMERCIAL
            ? <>
                <p>Produtos, códigos, nomes da loja e nomes da equipe são próprios do SBI e inventados para esta
                  demonstração. Nenhum dado de cliente real, nenhuma marca de terceiro e nenhuma foto de terceiro
                  entram aqui: as miniaturas são os ícones de linha do projeto.</p>
                <p>A faixa de preço por item espelha o varejo de eletrônicos e serve para o simulador fechar com as
                  metas da tela. Não é tabela de preço de nenhuma loja.</p>
              </>
            : <p>O catálogo vem da massa acadêmica do SBI, baseada no conjunto público da Olist.
                Consulte a <a href="https://github.com/matheussiqueira-dev/SBI--Super-Business-Intelligence/blob/main/docs/03-banco-de-dados/pacote-sql/olist/NOTICE.md">atribuição da massa Olist</a>.</p>}
        </section>
        {CREDITED_PHOTOS.length > 0 && <section className="card">
          <TableWrap label="Créditos das imagens">
            <table>
              <caption className="sr-only">Créditos das imagens</caption>
              <thead><tr><th scope="col">Imagem</th><th scope="col">Usada em</th><th scope="col">Modelo na foto</th><th scope="col">Autor</th><th scope="col">Licença</th></tr></thead>
              <tbody>{CREDITED_PHOTOS.map(photo => (
                <tr key={photo.file}>
                  <td><div className="product-cell">
                    <img className="thumb" src={`/produtos/${photo.file}`} alt="" width={40} height={40} loading="lazy" decoding="async" />
                    <a href={photo.page} rel="noreferrer">{photo.title}</a></div></td>
                  <td>{photo.names.join(', ')}</td>
                  <td>{photo.modelDepicted
                    ? <span className="muted">{photo.modelDepicted}</span>
                    : 'o modelo do produto'}</td>
                  <td>{photo.author}</td>
                  <td>{photo.licenseUrl ? <a href={photo.licenseUrl} rel="noreferrer">{photo.license}</a> : photo.license}</td>
                </tr>
              ))}</tbody>
            </table>
          </TableWrap>
        </section>}
        <footer className="app-footer">
          <p>{DEMO_NOTICE} · {STORE.name}{COMMERCIAL ? '' : ' · Projeto A3 · UNIFG 2026'}</p>
          <p><Link href="/demo">Voltar para a demonstração</Link> · <Link href="/entrar">Entrar no sistema</Link></p>
        </footer>
      </div>
    </main>
  );
}
