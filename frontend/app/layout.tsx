import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import Providers from './providers.tsx';
import './brand-tokens.css';
import './globals.css';

// Identidade v2.0: Inter 4.1 variavel (peso e tamanho optico; o desenho Display entra sozinho nos titulos) e Plex Mono so em
// SKU, numero de pedido e IDs. Arquivos locais (subconjunto latino, licenca OFL em app/fonts/): o build nao depende de rede.
const inter = localFont({ src: './fonts/InterVariable-latin.woff2', weight: '100 900', variable: '--font-inter', display: 'swap' });
const plexMono = localFont({
  src: [{ path: './fonts/IBMPlexMono-Regular.woff2', weight: '400' }, { path: './fonts/IBMPlexMono-Medium.woff2', weight: '500' }],
  variable: '--font-plex-mono', display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'SBI — Super Business Intelligence', template: '%s · SBI' },
  description: 'Gestão de loja com vendas, estoque e metas em um só lugar.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F6F9' },
    { media: '(prefers-color-scheme: dark)', color: '#090F16' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${plexMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
