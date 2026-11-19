'use client';
// Miniatura do produto. Fica cliente para ter o recurso de queda: quando a foto nao carrega (arquivo
// removido, rede cortada no ensaio, cache frio), a miniatura troca para o icone da linha em vez de deixar
// a caixa vazia -- mesmo recurso que user-avatar.tsx usa para o avatar.
import { useState } from 'react';
import { productImage, productLine } from '../lib/product-images.ts';

/** Miniatura decorativa ao lado do nome do produto (o nome ja esta no texto, entao alt vazio). */
export default function ProductThumb({ sku, name, size = 40 }: { sku?: string; name: string; size?: number }) {
  const image = productImage(sku, name);
  const [failed, setFailed] = useState(false);
  const photo = image.photo && !failed;
  const src = photo ? image.src : `/produtos/linhas/${productLine(name)}.svg`;
  return (
    <img className={photo ? 'thumb' : 'thumb thumb-icon'} src={src} alt="" width={size} height={size}
         loading="lazy" decoding="async"
         onError={image.photo ? () => setFailed(true) : undefined} />
  );
}
