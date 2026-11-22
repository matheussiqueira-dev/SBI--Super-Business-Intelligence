// Catalogo da demonstracao, por edicao.
//
// Academica: o recorte Olist (apple-catalog.ts), que tem licenca CC BY-NC-SA 4.0 -- livre para o trabalho
// academico e vedado para uso comercial. Comercial: catalogo proprio do SBI (comercial-catalog.ts).
//
// A escolha e por edicao, nao por rota: /demo e a mesma tela nas duas, e a edicao entra no build. Assim o botao
// da pagina comercial leva a uma demonstracao que pode ser apresentada a um cliente.
import { EDITION, isCommercial, type Edition } from '../edition.ts';
import { APPLE_PRODUCTS } from './apple-catalog.ts';
import { COMERCIAL_PRODUCTS } from './comercial-catalog.ts';

/** [SKU, nome, categoria de origem, preco em centavos, custo em centavos]. */
export type DemoProduct = readonly [sku: string, name: string, category: string, price: number, cost: number];

export function demoCatalog(edition: Edition = EDITION): readonly DemoProduct[] {
  return isCommercial(edition) ? COMERCIAL_PRODUCTS : APPLE_PRODUCTS;
}

export const DEMO_PRODUCTS: readonly DemoProduct[] = demoCatalog();

/** Origem do catalogo da edicao, para a pagina de creditos dizer a verdade em cada uma. */
export function catalogSource(edition: Edition = EDITION): 'olist' | 'propria' {
  return isCommercial(edition) ? 'propria' : 'olist';
}
