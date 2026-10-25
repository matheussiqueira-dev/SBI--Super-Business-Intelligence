# SBI v2 — Design system

Tokens, componentes e fontes da identidade visual v2 do SBI. Os arquivos são independentes de framework: funcionam em HTML puro e no frontend Next.js do projeto.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `tokens.json` | Tokens no formato Design Tokens (DTCG: `$value`, `$type`, `$description`), com temas claro e escuro |
| `tokens.css` | Os mesmos tokens como variáveis CSS (`--sbi-*`), tema claro, tema escuro e movimento reduzido |
| `components.css` | Componentes com prefixo `sbi-` (botões, campos, selos, avisos, cartões, tabelas, navegação, avatar, gráficos) |
| `avatares/` | Avatares dos usuários (WebP de 192 px) e atlas de expressões (384 px); origem e licença em `avatares/LEIA-ME.md` |
| `fonts.css` e `fonts/` | Inter, Inter Display e IBM Plex Mono em WOFF2, com as licenças SIL OFL 1.1 |
| `guia-de-componentes.html` | Guia visual com exemplos vivos, código e regras de uso; alterna claro e escuro |
| `temas-claro-e-escuro.md` | Especificação completa dos dois temas |
| `acessibilidade.md` | Critérios WCAG 2.2, resultados medidos e pendências |
| `contraste.csv` | Os 78 pares de contraste medidos, com cores, critério e resultado |

## Uso

```html
<link rel="stylesheet" href="fonts.css">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="components.css">
<body class="sbi-root">
  <button class="sbi-btn sbi-btn--primary">Criar pedido</button>
</body>
```

No Next.js, importe os três arquivos no layout raiz (por exemplo, `app/layout.tsx`) e troque `brand-tokens.css`. O mapa de migração dos tokens v1.0 está no apêndice D do manual.

## Convenção de nomes

`--sbi-` + categoria + papel + variação: `--sbi-text-secondary`, `--sbi-action-primary-hover`, `--sbi-space-4` (16 px). Primitivos (`--sbi-petroleo-600`) existem para referência; o código de tela usa os semânticos.

## Escalas

- Espaço (px): 0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80.
- Raios (px): 4, 6, 8, 12, 16 e pílula.
- Pontos de quebra (px): 480, 768, 1024, 1280, 1536.
- Controles: 32, 40 e 48 px; alvo de toque de 44 px.

### Tipografia (desktop)

| Estilo | Tamanho/altura (px) | Peso |
|---|---|---|
| `display` | 40/48 | 600 |
| `heading-1` | 30/38 | 600 |
| `heading-2` | 22/30 | 600 |
| `heading-3` | 17/24 | 600 |
| `body-lg` | 16/24 | 400 |
| `body` | 15/22 | 400 |
| `body-strong` | 15/22 | 600 |
| `label` | 14/20 | 500 |
| `caption` | 13/18 | 400 |
| `overline` | 12/16 | 600 |
| `kpi` | 28/34 | 600 |
| `kpi-sm` | 20/26 | 600 |
| `table` | 14/20 | 400 |
| `table-head` | 12/16 | 600 |
| `button` | 15/20 | 600 |
| `code` | 13/20 | 400 |

Valores monetários: sempre com centavos e algarismos tabulares (`font-variant-numeric: tabular-nums`). Formato compacto (“R$ 186,4 mil”) só em eixos de gráfico.
