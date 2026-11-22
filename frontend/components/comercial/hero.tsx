// Primeira dobra (plano comercial, secao 03). No desktop, texto e botoes a esquerda e foto a direita. No celular,
// titulo, descricao e acoes vem antes da foto -- a ordem do DOM ja e essa, sem reordenacao por CSS, para o leitor
// de tela e a navegacao por teclado seguirem a mesma sequencia que a tela mostra.
//
// A foto tem largura e altura declaradas e variantes por viewport: o espaco e reservado antes de a imagem chegar,
// entao a chegada dela nao empurra o texto (CLS).
import Link from 'next/link';
import { HERO } from '../../lib/comercial/copy.ts';

export default function Hero() {
  return (
    <section className="c-hero" aria-labelledby="c-hero-title">
      <div className="c-hero-text">
        <h1 id="c-hero-title">{HERO.headline}</h1>
        <p className="c-hero-lead">{HERO.lead}</p>
        <p className="c-hero-actions">
          <a className="btn btn-primary btn-lg" href={HERO.primary.href}>{HERO.primary.label}</a>
          <Link className="btn btn-lg" href={HERO.secondary.href}>{HERO.secondary.label}</Link>
        </p>
      </div>
      <figure className="c-hero-media">
        <picture>
          <source
            media="(max-width: 719px)"
            type="image/webp"
            srcSet="/comercial/loja-varejo-m480.webp 480w, /comercial/loja-varejo-m720.webp 720w"
            sizes="100vw"
          />
          <img
            src="/comercial/loja-varejo-960.webp"
            srcSet="/comercial/loja-varejo-640.webp 640w, /comercial/loja-varejo-960.webp 960w, /comercial/loja-varejo-1280.webp 1280w"
            sizes="(min-width: 1040px) 46vw, 100vw"
            width={960}
            height={720}
            alt={HERO.photoAlt}
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        <figcaption>{HERO.photoCredit}</figcaption>
      </figure>
    </section>
  );
}
