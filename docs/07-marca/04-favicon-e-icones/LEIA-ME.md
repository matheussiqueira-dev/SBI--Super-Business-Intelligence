# SBI v2 — Favicon e ícones do aplicativo

| Arquivo | Tamanho | Uso |
|---|---|---|
| `favicon.ico` | 16, 32 e 48 px | Navegadores sem suporte a SVG; versões desenhadas na grade de pixels |
| `icon.svg` | vetor | Aba do navegador; o bloco fica branco e o círculo claro quando o sistema está no modo escuro |
| `icon-claro.svg`, `icon-escuro.svg` | vetor | Versões fixas para cada fundo |
| `icon-placa.svg` | vetor | Símbolo sobre placa Tinta, para documentos e slides |
| `apple-touch-icon.png` | 180 × 180 | Atalho na tela inicial do iOS (quadrado opaco; o sistema arredonda) |
| `icon-192.png`, `icon-512.png` | 192 e 512 | Manifesto PWA, propósito “any” |
| `icon-maskable-192.png`, `icon-maskable-512.png` | 192 e 512 | Manifesto PWA, propósito “maskable”; símbolo dentro da zona segura de 40% de raio |
| `favicon-16.png`, `favicon-32.png`, `favicon-48.png` | 16, 32, 48 | Fontes do `.ico`, para conferência |
| `manifest.webmanifest` | — | Nome, cores e lista de ícones |

## Next.js (App Router)

Copie para `app/`: `favicon.ico`, `icon.svg` e `apple-touch-icon.png` renomeado para `apple-icon.png`. O Next.js gera as tags `<link>` automaticamente. Para o manifesto, use `app/manifest.ts` ou copie `manifest.webmanifest` e os ícones PWA para `public/`.

```ts
// app/layout.tsx
export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F6F9' },
    { media: '(prefers-color-scheme: dark)', color: '#090F16' },
  ],
};
```

## HTML puro

```html
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
```

O atributo `sizes="32x32"` no `.ico` faz os navegadores que entendem SVG preferirem o `icon.svg`.

## Regras

- O favicon não é o logotipo reduzido: em 16 px usa células inteiras e folga de 2 px.
- Em slides e documentos, use o símbolo isolado (`03-marca`) ou `icon-placa.svg`, nunca o favicon ampliado.
- Ao trocar o ícone em produção, substitua também `app/icon.svg` e `app/apple-icon.png` do repositório.
