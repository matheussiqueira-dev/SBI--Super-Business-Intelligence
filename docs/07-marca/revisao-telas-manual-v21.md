# Revisão das telas contra o manual de identidade visual v2.1

Conferência de 19/11/2026 do código versionado contra
`marca/rebranding-v2/01-manual/SBI-Manual-de-Identidade-Visual-v2.pdf` — **v2.1**, 54 páginas,
25/10/2026 (a v2.1 acrescenta a seção 32, dos avatares, à identidade v2.0).

## Sobre a numeração pedida no plano

O plano pedia "as seções 23, 26 a 31 e 35–36". No manual v2.1 a numeração de seções vai até 32, e o
sumário (página 3) lista título e **página**, não duas numerações. Os números do plano misturam as
duas: **23, 26–31 são seções** e **35–36 são páginas**. O conteúdo conferido, que é o que importa, foi:

| Pedido | No manual v2.1 | Página |
| --- | --- | --- |
| seção 23 | Sistema tipográfico | 27 |
| seção 26 | Design tokens | 32 |
| seção 27 | Componentes UI | 33–34 |
| seção 28 | Diretrizes para dashboards | 35 |
| seção 29 | Visualização de dados: cor e regras | 36 |
| seção 30 | Dark mode e light mode | 38 |
| seção 31 | Responsividade e acessibilidade | 39 |
| páginas 35–36 | as mesmas duas: dashboards e visualização de dados | 35–36 |

Também foi conferida a paleta cromática (página 24), porque as cores de dados dependem dela.

---

## O que confere

**Paleta categórica de dados (seção 29), as oito cores e a ordem.** Os `--sbi-data-1` a `--sbi-data-8`
reproduzem o manual **ao hexadecimal, nos dois temas**. A ordem importa: o manual diz que ela "é o
mecanismo de segurança para daltonismo".

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claro | `#04729B` | `#E26B1B` | `#7454D6` | `#269143` | `#CA488F` | `#DDA317` | `#0B9CC0` | `#D03833` |
| escuro | `#1C8CB4` | `#DE6E29` | `#927EEC` | `#369E4E` | `#D4599B` | `#BF8B00` | `#2DA1C2` | `#DE4F46` |

**Pares claro/escuro declarados na página 38.** Os nove conferem: fundo da aplicação
(`#F4F6F9`/`#090F16`), superfície (`#FFFFFF`/`#101821`), texto principal (`#0D1A2B`/`#F2F4F6`), texto
terciário (`#5D6977`/`#9FA7B2`), contorno de campo (`#7B8693`/`#727B88`), anel de foco e círculo da
marca (`#04729B`/`#64B1D7`) e série 1 de dados (`#04729B`/`#1C8CB4`). A **ação principal** é a única
que o manual declara igual nos dois temas, e o código acerta por omissão: o bloco escuro não a
redefine, então ela mantém `#04729B`.

**Tipografia (seção 23).** O manual pede Inter Display em títulos e valores de 22 px ou mais e Inter
em texto. O código carrega **uma** Inter variável local (`InterVariable-latin.woff2`, pesos 100–900) e
liga `font-optical-sizing: auto`, então o desenho Display entra pelo eixo óptico a partir do tamanho
que o manual indica. É a mesma intenção por outro caminho, não divergência.

**Gráficos sem cor literal.** `charts.tsx` e `exec-charts.tsx` referenciam apenas
`var(--sbi-data-*)` e `var(--sbi-chart-*)`. Nenhum hexadecimal escrito à mão.

**Largura máxima do conteúdo (seção 28).** `--sbi-content-max: 1280px`, igual ao `xl` do quadro de
pontos de quebra.

**Escala de espaço (seção 28).** As dez primeiras medidas do manual (4, 8, 12, 16, 20, 24, 32, 40, 48,
64 px) existem como `--sbi-space-1` a `--sbi-space-16`.

---

## Divergências

### 1. Faltavam três das quatro escalas de dados — corrigido

A seção 29 declara **quatro** paletas de dados. O código tinha só a categórica:

| Paleta do manual | Estava no código? |
| --- | --- |
| Categórica (8 cores, por tema) | sim |
| **Sequencial (magnitude)**, 8 passos | **não** |
| **Divergente (abaixo · acima da meta)**, 7 passos | **não** |
| **Estado em gráficos** (bom · atenção · sério · crítico) | **não** |

As três entraram em `frontend/app/tokens.css`, nos três blocos de tema, como `--sbi-data-seq-1..8`,
`--sbi-data-div-1..7` e `--sbi-data-state-{good,warn,severe,critical}`.

**Um desvio deliberado, declarado:** o meio da divergente é `#DEE3E9` no manual — um neutro claro, que
não se lê sobre a superfície escura `#101821`. O token aponta para `var(--sbi-border-subtle)`, que vale
exatamente `#DEE3E9` no tema claro (fiel ao manual) e o neutro escuro equivalente no tema escuro. O
manual declara as três escalas uma única vez, sem variante escura, então essa decisão faltava ser
tomada.

### 2. As cores de estado não servem como cor de texto — tratado no uso

O manual dá quatro cores de estado em gráficos (`#2E9E52`, `#F0AD15`, `#EB7C33`, `#D33B36`) e a própria
tabela 2 avisa que, no tema claro, **6 das 8 categóricas** alcançam 3:1 contra a superfície e que
"âmbar e céu exigem rótulo". São cores de **marca de dado**, com limiar de 3:1, não de texto, que a
WCAG exige em 4,5:1.

No alerta de margem a cor de estado entra como **ponto** de 8 px na pílula, e o nível vem **sempre
escrito** ao lado ("Atenção", "Sério", "Crítico"). Fundo e texto seguem os pares de feedback, já
validados nos dois temas. Assim a cor não carrega a informação sozinha — que é a regra do próprio
manual.

### 3. IBM Plex Mono não é carregada

A seção 23 nomeia a IBM Plex Mono (SIL OFL 1.1) para "código, logs e documentação técnica". O token
`--sbi-font-mono` existe, mas vale `ui-monospace, "SF Mono", Menlo, Consolas, monospace`: a fonte do
manual não é carregada.

**Efeito visual hoje: nenhum.** O token não é usado em nenhum componente ou folha de estilo
(`grep` em `app/` e `components/` encontra apenas a própria declaração). É divergência de
documentação, não de tela. Resolver é escolher entre carregar a fonte ou tirar a IBM Plex Mono do
manual; as duas saídas são decisão de quem revisa, e nenhuma foi tomada aqui.

### 4. A medida de 80 px da escala de espaço não existe

O manual lista 4 a 80 px e diz que "64 e 80 px só em páginas de apresentação". O código para em 64
(`--sbi-space-16`); não há `--sbi-space-20`. Como o sistema autenticado não tem página de
apresentação, a ausência é coerente com o uso — mas a escala versionada está incompleta em relação ao
manual. Não foi acrescentada: token sem uso é peso morto.

### 5. Pontos de quebra: o quadro e a implementação não se correspondem linha a linha

O quadro 20 (página 35) descreve cinco pontos — sm 480, md 768, lg 1024, xl 1280, 2xl — com colunas e
margens por ponto. O CSS usa **duas** consultas de largura (`max-width: 1023px` e `max-width: 767px`,
isto é, as quebras em 768 e 1024) e, para o resto, **cinco consultas de contêiner** (520, 640 e 940 px)
mais `--sbi-content-max: 1280px`.

Não é divergência de comportamento: a consulta de contêiner reage à largura disponível do componente,
que é o que o quadro descreve em palavras ("cartões empilhados", "indicadores 2 × 2"), e sobrevive à
barra lateral melhor que uma consulta de viewport. É divergência de **forma**: quem lê o manual
esperando encontrar cinco pontos de quebra no CSS não os encontra. Registrado, não alterado.

---

## Validação nos dois temas, inclusive nos gráficos

Medido com `@axe-core/playwright` nas marcas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` e `wcag22aa`,
contra a pilha do worktree (API na 8083 sobre o banco descartável, frontend na 3002), nas três telas
alteradas, nos dois temas e em duas larguras. O resultado está em
[evidências da revisão](../10-historico/planejamento/) e no relato da sessão.

O tema é fixado como o seletor da conta o fixa (`localStorage['sbi:tema']` → `html[data-theme]`), com
`colorScheme` do navegador combinando, para o teste medir o mesmo caminho que o usuário usa.
