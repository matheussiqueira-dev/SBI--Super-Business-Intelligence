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
  const icon = `/produtos/linhas/${productLine(name)}.svg`;
  // Candidatos do melhor para o ultimo recurso. productImage devolve o proprio icone quando nao tem foto livre,
  // entao o icone entra uma vez so.
  const chain = [...(remote ? [remote] : []), ...(local.photo ? [local.src] : []), icon];

  // O estado guarda o INDICE na cadeia, nao o degrau com nome. Era o nome que prendia a miniatura: o estado
  // inicial ('icone', escolhido quando o produto ainda nao tinha foto) nunca voltava atras, entao a lista
  // continuava no icone depois do primeiro envio ate alguem recarregar a pagina. Com indice, a foto nova entra
  // na frente da cadeia e aparece na mesma navegacao (CT-WEB-150).
  //
  // A key fecha o resto: se a cadeia desta vez ja tinha caido (midia ausente, rede cortada), o indice de uma
  // cadeia antiga nao pode valer para a nova, e o onError atrasado da imagem anterior morre com o componente
  // que o disparou em vez de derrubar a foto que acabou de ser publicada.
  return <Candidates key={chain.join('|')} chain={chain} size={size} />;
}

function Candidates({ chain, size }: { chain: readonly string[]; size: number }) {
  const [step, setStep] = useState(0);
  const last = step >= chain.length - 1;
  return (
    <img className={last ? 'thumb thumb-icon' : 'thumb'} src={chain[step]} alt="" width={size} height={size}
         loading="lazy" decoding="async"
         onError={last ? undefined : () => setStep(current => current + 1)} />
  );
}
