import type { Metadata } from 'next';
import Link from 'next/link';
import { PRODUCT_PHOTOS } from '../../../lib/product-photos.ts';
import { DEMO_NOTICE, STORE } from '../../../lib/demo/scenario.ts';
import PageHeader from '../../../components/page-header.tsx';
import TableWrap from '../../../components/table-wrap.tsx';

export const metadata: Metadata = {
  title: 'Créditos das imagens · Demonstração',
  description: 'Fontes e licenças das fotos de produto e dos avatares que aparecem na demonstração pública do SBI.',
};

/**
 * Creditos das imagens para quem chega pela demonstracao publica. A pagina equivalente da area autenticada vive sob
 * /creditos, que exige sessao: o visitante anonimo ve as mesmas fotos, entao a atribuicao precisa estar ao alcance
 * dele. Mesma fonte de dados da pagina interna (lib/product-photos.ts), sem chamar a API e sem ler cookie.
 */
export default function DemoCreditosPage() {
  return (
    <main className="main" id="conteudo">
      <div className="content stack">
        <PageHeader section={<Link href="/demo">Demonstração</Link>} title="Créditos das imagens"
          description="Fotos de produto do Wikimedia Commons, reduzidas e recortadas para miniatura. Produto sem foto livre mostra o ícone da linha." />
        <section className="card stack-sm" aria-label="Avatares da equipe">
          <h2>Avatares da equipe</h2>
          <p>Avatares do arquivo <a href="https://www.figma.com/design/khzxuhK7C7U7UnlzkKufqT/Memoji-Avatars--Community-?node-id=0-1" rel="noreferrer">Memoji Avatars (Community), no Figma</a>, selecionados para os perfis da equipe.</p>
          <p>As expressões faciais são versões derivadas desses avatares.</p>
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
        <footer className="app-footer">
          <p>{DEMO_NOTICE} · {STORE.name} · valores fictícios · Projeto A3 · UNIFG 2026</p>
          <p><Link href="/demo">Voltar para a demonstração</Link> · <Link href="/entrar">Entrar no sistema</Link></p>
        </footer>
      </div>
    </main>
  );
}
