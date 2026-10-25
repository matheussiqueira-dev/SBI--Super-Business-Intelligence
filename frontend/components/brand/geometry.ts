// Geometria do simbolo Encaixe (manual de identidade visual v2.1, secao 18): grade de 13 modulos de 10 unidades, bloco que
// funde tres modulos e o circulo do numero, com folga constante de 1 modulo (arco de raio 4, circulo de raio 3, cantos de 2).
// E a mesma de app/icon.svg (favicon). Fica em .ts para os testes unitarios (node --test) lerem sem JSX.

export const BRAND_NAME = 'SBI';
export const BRAND_DESCRIPTOR = 'Super Business Intelligence';
export const BRAND_ACCESSIBLE_NAME = 'SBI — Super Business Intelligence';

export const COLORS = {
  tinta: '#0D1A2B',
  petroleo: '#04729B',
  petroleoClaro: '#64B1D7',
  white: '#FFFFFF',
  grafite300: '#CCD2DB',
} as const;

/** Cor da barra do navegador e do app instalado: o fundo da aplicacao de cada tema (Nevoa e o canvas escuro). */
export const THEME_COLORS = { light: '#F4F6F9', dark: '#090F16' } as const;

export const MODULE = 10;
export const SYMBOL_SIZE = 13 * MODULE;
export const BLOCK_PATH = 'M20 0H110A20 20 0 0 1 130 20V60H100A40 40 0 0 0 60 100V130H20A20 20 0 0 1 0 110V20A20 20 0 0 1 20 0Z';
export const DOT = { cx: 100, cy: 100, r: 30 } as const;

/** "SBI" em Inter Display SemiBold convertido em curvas: altura de maiuscula de 9 modulos, a 4,5 modulos do simbolo. */
export const WORDMARK_PATHS: readonly string[] = [
  'M210.64 111.45C231.96 111.45 245.31 100.82 245.31 84.03C245.31 70.8 236.91 63.01 218.25 58.84L209.13 56.72C197.41 54.01 192.76 50.62 192.76 44.58C192.76 37.21 199.83 32.08 209.79 32.08C220.3 32.08 227.19 37.82 227.85 47.3H243.01C242.47 29.42 229.97 18.55 209.85 18.55C189.98 18.55 176.75 29.3 176.75 45.37C176.75 57.99 185.03 65.91 203.03 70.01L212.69 72.19C224.71 74.97 229.42 78.65 229.42 84.99C229.42 92.91 221.99 97.98 210.76 97.98C198.26 97.98 190.77 91.52 190.64 80.64H175C175 99.91 188.35 111.45 210.64 111.45Z',
  'M259.06 110H295.43C316.26 110 327.2 99.85 327.2 84.69C327.2 71.89 318.86 64.46 308.11 63.19V63.07C317.78 60.41 323.75 53.77 323.75 43.38C323.75 29.3 312.82 20 293.86 20H259.06ZM274.77 97.01V70.62H294.1C304.73 70.62 310.83 75.81 310.83 84.15C310.83 92.42 304.61 97.01 293.73 97.01ZM274.77 58.11V32.99H293.13C302.25 32.99 307.81 37.82 307.81 45.55C307.81 53.22 302.25 58.11 293.13 58.11Z',
  'M356.36 20H340.41V110H356.36Z',
];
/** Caixas dos logotipos: horizontal (nome ao lado) e vertical (nome de 6,45 modulos abaixo, com a largura do simbolo). */
export const HORIZONTAL = { width: 356.36, height: SYMBOL_SIZE } as const;
export const VERTICAL = { width: SYMBOL_SIZE, height: 229.5, wordmark: 'translate(0 165) scale(0.71667) translate(-175 -20)' } as const;

export type LogoTone = 'principal' | 'negativa' | 'mono';

/** Cores por variante: principal segue o tema (Tinta e Petroleo no claro, branco e Petroleo 400 no escuro), negativa sobre Tinta, monocromatica. */
export function toneColors(tone: LogoTone): { block: string; dot: string; text: string; descriptor: string } {
  switch (tone) {
    case 'negativa': return { block: COLORS.white, dot: COLORS.petroleoClaro, text: COLORS.white, descriptor: COLORS.grafite300 };
    case 'mono': return { block: 'currentColor', dot: 'currentColor', text: 'currentColor', descriptor: 'currentColor' };
    default: return { block: 'var(--sbi-brand-block)', dot: 'var(--sbi-brand-dot)', text: 'var(--sbi-text-primary)', descriptor: 'var(--sbi-text-secondary)' };
  }
}
