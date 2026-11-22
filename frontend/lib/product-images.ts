// De onde vem a imagem de um produto, em ordem de preferencia:
//   1. foto enviada pela loja (V13), quando o produto tem photoVersion -- URL montada por photoThumbUrl;
//   2. foto de licenca livre em public/produtos/, pelo SKU que a API devolve ou pelo nome (D-PUB-13);
//   3. icone da linha deduzido do nome (acessorio sem imagem livre, produto criado pela tela).
import { PRODUCT_PHOTOS } from './product-photos.ts';
import { API_PREFIX } from './api/http.ts';

export interface ProductImage { src: string; photo: boolean }

const BY_SKU = new Map(PRODUCT_PHOTOS.flatMap(photo => photo.skus.map(sku => [sku, photo.file] as const)));
// O resumo do cliente traz so o nome do produto, sem SKU.
const BY_NAME = new Map(PRODUCT_PHOTOS.flatMap(photo => photo.names.map(name => [name, photo.file] as const)));

const LINES: ReadonlyArray<readonly [RegExp, string]> = [
  [/^iphone/i, 'iphone'], [/^ipad/i, 'ipad'], [/^(macbook|imac|mac mini)/i, 'mac'], [/^airpods/i, 'airpods'],
  [/^apple watch/i, 'watch'], [/^(homepod|apple tv)/i, 'casa'],
];

export function productLine(name: string): string {
  return LINES.find(([pattern]) => pattern.test(name.trim()))?.[1] ?? 'acessorio';
}

export function productImage(sku: string | undefined, name: string): ProductImage {
  const file = (sku ? BY_SKU.get(sku.toUpperCase()) : undefined) ?? BY_NAME.get(name);
  return file ? { src: `/produtos/${file}`, photo: true } : { src: `/produtos/linhas/${productLine(name)}.svg`, photo: false };
}

/**
 * Miniatura enviada pela loja. A revisao entra na consulta para o navegador buscar a imagem nova depois de uma
 * troca em vez de servir a antiga do cache; a resposta da API e Cache-Control private, entao nenhuma CDN
 * compartilhada guarda a foto de uma loja.
 *
 * O nome do parametro e `rev`, nao `v`: enquanto a revisao reiniciava em 1 depois de uma remocao, URLs `?v=1`
 * de fotos antigas ficaram guardadas por 30 dias em navegadores que ja visitaram a tela. Revisao inedita por
 * publicacao (V14) resolve a geracao de agora; o nome novo garante que nenhuma dessas URLs antigas seja
 * reaproveitada para um conteudo diferente.
 */
export function photoThumbUrl(productId: number, version: number): string {
  return `${API_PREFIX}/products/${productId}/photo/thumb?rev=${version}`;
}
