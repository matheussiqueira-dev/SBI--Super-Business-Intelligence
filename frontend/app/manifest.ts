import type { MetadataRoute } from 'next';

/** Manifesto do app (identidade v2.0): nome, cores e icones de 192 e 512 px; o maskable tem o simbolo dentro da zona segura. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SBI — Super Business Intelligence',
    short_name: 'SBI',
    description: 'Gestão de loja com vendas, estoque e metas em um só lugar.',
    lang: 'pt-BR',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#F4F6F9',
    theme_color: '#0D1A2B',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
