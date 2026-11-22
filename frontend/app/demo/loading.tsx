import BrandScreen from '../../components/brand-screen.tsx';

/** Tela de espera da demonstração pública.
 *
 *  Antes isto era app/loading.tsx e valia para a aplicação inteira. Um loading.tsx cria um limite de Suspense em
 *  toda rota abaixo dele e, no HTML, o Next entrega primeiro este fallback e só depois o conteúdo real, dentro de
 *  um bloco escondido que um script coloca no lugar. Nas páginas públicas da edição comercial (/, /privacidade e
 *  /suporte) isso deixava a página em "Carregando…" para quem não executa JavaScript, rastreadores que não
 *  renderizam incluídos — justamente onde a indexação importa. O limite agora fica só nas rotas que ganham algo
 *  com ele: entrar, demonstração e conta, todas atrás de navegação do próprio app. */
export default function Loading() {
  return <BrandScreen><p className="muted" role="status">Carregando…</p></BrandScreen>;
}
