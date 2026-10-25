import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import Providers from './providers.tsx';
import { THEME_SCRIPT } from '../lib/theme.ts';
import { THEME_COLORS } from '../components/brand/geometry.ts';
import './tokens.css';
import './globals.css';

// Identidade v2.0: uma familia para toda a interface, a Inter 4.1 variavel (peso e tamanho optico; o desenho Display entra
// sozinho a partir de 22 px). Subconjunto latino local com licenca OFL em app/fonts/: o build nao depende de rede.
const inter = localFont({ src: './fonts/InterVariable-latin.woff2', weight: '100 900', variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'SBI — Super Business Intelligence', template: '%s · SBI' },
  description: 'Gestão de loja com vendas, estoque e metas em um só registro.',
  applicationName: 'SBI',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: THEME_COLORS.light },
    { media: '(prefers-color-scheme: dark)', color: THEME_COLORS.dark },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // O tema escolhido na conta entra antes da primeira pintura (data-theme); sem escolha, vale o do sistema.
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
