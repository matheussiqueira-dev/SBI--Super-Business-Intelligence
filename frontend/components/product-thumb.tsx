'use client';
// Miniatura do produto, com tres fontes em ordem de preferencia:
//
//   1. foto enviada pela loja (V13), quando o produto tem photoVersion -- so as telas que recebem o produto da
//      API passam productId/photoVersion; a demonstracao nao passa, e por isso nunca chama a API;
//   2. foto de licenca livre do mapa local por SKU ou nome (lib/product-images.ts), que segue valendo para o
//      catalogo que ja existe;
//   3. icone da linha deduzido do nome.
//
// A queda acontece no onError de cada etapa: arquivo removido do armazenamento, rede cortada no ensaio ou cache
// frio trocam a imagem em vez de deixar a caixa vazia -- mesmo recurso que user-avatar.tsx usa para o avatar.
import { useState } from 'react';
import { photoThumbUrl, productImage, productLine } from '../lib/product-images.ts';

export { photoThumbUrl };

export interface ProductThumbProps {
  sku?: string;
  name: string;
  size?: number;
  /** Com photoVersion, a miniatura vem da API; sem ele, nenhuma requisicao e feita. */
  productId?: number;
  photoVersion?: number | null;
}

/** Miniatura decorativa ao lado do nome do produto (o nome ja esta no texto, entao alt vazio). */
export default function ProductThumb({ sku, name, size = 40, productId, photoVersion }: ProductThumbProps) {
  const local = productImage(sku, name);
  const remote = productId !== undefined && photoVersion != null ? photoThumbUrl(productId, photoVersion) : null;
  // 'loja' -> 'mapa' -> 'icone': cada falha desce um degrau e nunca volta.
  const [stage, setStage] = useState<'loja' | 'mapa' | 'icone'>(remote ? 'loja' : local.photo ? 'mapa' : 'icone');

  const current = stage === 'loja' && remote ? remote : stage === 'mapa' && local.photo ? local.src : null;
  const src = current ?? `/produtos/linhas/${productLine(name)}.svg`;
  const photo = current !== null;

  return (
    <img className={photo ? 'thumb' : 'thumb thumb-icon'} src={src} alt="" width={size} height={size}
         loading="lazy" decoding="async"
         onError={photo ? () => setStage(stage === 'loja' && local.photo ? 'mapa' : 'icone') : undefined} />
  );
}
