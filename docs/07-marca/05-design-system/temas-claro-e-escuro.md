# SBI v2 — Especificação dos temas claro e escuro

O tema escuro não é uma inversão automática do claro. Cada token semântico tem um valor próprio para cada tema, e os dois conjuntos passaram pelo mesmo teste de contraste.

## Como o tema é escolhido

- Sem atributo, o tema segue a preferência do sistema (`prefers-color-scheme`).
- `<html data-theme="light">` ou `<html data-theme="dark">` fixa o tema, por exemplo a partir de uma escolha salva do usuário.
- Os componentes usam apenas tokens semânticos (`--sbi-*`); nenhuma regra de componente precisa saber qual tema está ativo. As exceções documentadas são a trilha do medidor de meta, que troca de degrau de Petróleo, e o painel da tela de entrada, que passa a usar a superfície escura.

```html
<link rel="stylesheet" href="tokens.css">
<html data-theme="dark">
```

## Regras do tema escuro

1. Superfícies sobem de tom com a elevação: fundo `#090F16`, superfície `#101821`, hover `#1F2834`. Sombras ficam discretas; a borda separa os planos.
2. O botão primário mantém o Petróleo 600 (`#04729B`) com texto branco, para que a ação tenha a mesma cor nos dois temas.
3. Links e textos selecionados usam Petróleo 300 e 200; o anel de foco e o círculo da marca usam Petróleo 400 (`#64B1D7`).
4. O bloco do símbolo fica branco (`brand-block`) e o círculo passa a `#64B1D7`.
5. Gráficos usam a paleta categórica escura, validada contra a superfície escura (tabela abaixo).
6. Estados (sucesso, atenção, erro, informação) têm fundos escuros próprios e texto claro, sempre com ícone e texto.

## Resultado do teste de contraste

| Tema | Pares de texto (mín. 4,5:1) | Menor razão de texto | Pares de componente (mín. 3:1) | Menor razão de componente |
|---|---|---|---|---|
| Claro | 26 | 4,69:1 — Link sobre bg-hover | 13 | 3,21:1 — Contorno de campo sobre bg-hover |
| Escuro | 26 | 4,84:1 — Texto sobre botão primário (hover) | 13 | 3,31:1 — Botão primário sobre superfície |

Total: **78 de 78 pares aprovados**. A lista completa, com cores e critério de cada par, está em `contraste.csv`.

## Tokens semânticos de cor

### Fundos

| Token | Claro | Escuro |
|---|---|---|
| `--sbi-bg-canvas` | `#F4F6F9` | `#090F16` |
| `--sbi-bg-surface` | `#FFFFFF` | `#101821` |
| `--sbi-bg-subtle` | `#FAFBFD` | `#0D131C` |
| `--sbi-bg-hover` | `#ECEFF4` | `#1F2834` |
| `--sbi-bg-pressed` | `#DEE3E9` | `#28313D` |
| `--sbi-bg-inverse` | `#0D1A2B` | `#F4F6F9` |
| `--sbi-bg-selected` | `#EFF8FE` | `#133240` |
| `--sbi-bg-overlay` | `rgba(14, 26, 43, 0.48)` | `rgba(4, 8, 14, 0.64)` |

### Bordas

| Token | Claro | Escuro |
|---|---|---|
| `--sbi-border-subtle` | `#DEE3E9` | `#262E39` |
| `--sbi-border-default` | `#CCD2DB` | `#37414D` |
| `--sbi-border-control` | `#7B8693` | `#727B88` |
| `--sbi-border-strong` | `#444F5F` | `#A6AFBB` |

### Texto

| Token | Claro | Escuro |
|---|---|---|
| `--sbi-text-primary` | `#0D1A2B` | `#F2F4F6` |
| `--sbi-text-secondary` | `#444F5F` | `#C3CAD2` |
| `--sbi-text-tertiary` | `#5D6977` | `#9FA7B2` |
| `--sbi-text-disabled` | `#A1AAB6` | `#626A73` |
| `--sbi-text-inverse` | `#FFFFFF` | `#0D1A2B` |
| `--sbi-text-link` | `#04729B` | `#96CFED` |
| `--sbi-text-link-hover` | `#025C7D` | `#BFE4F9` |
| `--sbi-text-selected` | `#054761` | `#BFE4F9` |

### Ícones

| Token | Claro | Escuro |
|---|---|---|
| `--sbi-icon-default` | `#5D6977` | `#9FA7B2` |
| `--sbi-icon-strong` | `#0D1A2B` | `#F2F4F6` |

### Ações

| Token | Claro | Escuro |
|---|---|---|
| `--sbi-action-primary` | `#04729B` | `#04729B` |
| `--sbi-action-primary-hover` | `#025C7D` | `#167AA2` |
| `--sbi-action-primary-pressed` | `#054761` | `#025C7D` |
| `--sbi-action-on-primary` | `#FFFFFF` | `#FFFFFF` |
| `--sbi-action-secondary-hover` | `#ECEFF4` | `#1F2834` |
| `--sbi-action-disabled-bg` | `#ECEFF4` | `#202730` |
| `--sbi-action-disabled-text` | `#A1AAB6` | `#626A73` |

### Foco e marca

| Token | Claro | Escuro |
|---|---|---|
| `--sbi-focus-ring` | `#04729B` | `#64B1D7` |
| `--sbi-brand-block` | `#0D1A2B` | `#FFFFFF` |
| `--sbi-brand-dot` | `#04729B` | `#64B1D7` |

### Sucesso

| Token | Claro | Escuro |
|---|---|---|
| `--sbi-success-text` | `#0B6834` | `#78D694` |
| `--sbi-success-bg` | `#E5FAEA` | `#142D1B` |
| `--sbi-success-border` | `#78D694` | `#265937` |
| `--sbi-success-solid` | `#137D41` | `#137D41` |

### Atenção

| Token | Claro | Escuro |
|---|---|---|
| `--sbi-warning-text` | `#92500B` | `#FFC669` |
| `--sbi-warning-bg` | `#FFF4E3` | `#37250E` |
| `--sbi-warning-border` | `#FFC669` | `#714D1D` |
| `--sbi-warning-solid` | `#ED9E20` | `#ED9E20` |

### Erro

| Token | Claro | Escuro |
|---|---|---|
| `--sbi-danger-text` | `#B02523` | `#FDA19B` |
| `--sbi-danger-bg` | `#FFEFEE` | `#3B1C1A` |
| `--sbi-danger-border` | `#FDA19B` | `#7A3A36` |
| `--sbi-danger-solid` | `#C52C2A` | `#C52C2A` |
| `--sbi-danger-solid-hover` | `#B02523` | `#B02523` |

### Informação

| Token | Claro | Escuro |
|---|---|---|
| `--sbi-info-text` | `#025C7D` | `#96CFED` |
| `--sbi-info-bg` | `#EFF8FE` | `#122C39` |
| `--sbi-info-border` | `#96CFED` | `#205670` |

### Gráficos

| Token | Claro | Escuro |
|---|---|---|
| `--sbi-chart-grid` | `#DEE3E9` | `#262E39` |
| `--sbi-chart-axis` | `#CCD2DB` | `#37414D` |
| `--sbi-chart-label` | `#5D6977` | `#9FA7B2` |
| `--sbi-chart-goal` | `#0D1A2B` | `#F2F4F6` |
| `--sbi-chart-compare` | `#A1AAB6` | `#5C646F` |

## Paleta categórica de dados

A ordem é fixa: a série 1 sempre usa a cor 1. Uma nona série vira “Outros”.

| Ordem | Nome | Claro | Escuro |
|---|---|---|---|
| 1 | Petróleo | `#04729B` | `#1C8CB4` |
| 2 | Laranja | `#E26B1B` | `#DE6E29` |
| 3 | Violeta | `#7454D6` | `#927EEC` |
| 4 | Verde | `#269143` | `#369E4E` |
| 5 | Magenta | `#CA488F` | `#D4599B` |
| 6 | Âmbar | `#DDA317` | `#BF8B00` |
| 7 | Céu | `#0B9CC0` | `#2DA1C2` |
| 8 | Vermelho | `#D03833` | `#DE4F46` |

Validação: separação entre cores vizinhas para daltonismo ΔE 9,0 (claro) e 9,1 (escuro), com mínimo de 8; separação em visão normal ΔE 26,9 e 22,5, com mínimo de 15 (simulação pelo modelo de Machado, Oliveira e Fernandes, 2009). No tema claro, âmbar e céu ficam abaixo de 3:1 contra a superfície e por isso exigem rótulo ou tabela equivalente.
