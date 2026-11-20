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

**Corrigido em 20/11 com medição:** o ponto ganhou contorno de 1 px em `--sbi-text-secondary`, o mesmo
token que a marca do ano anterior do gráfico (`.colchart-compare`) já usava. Medido: âmbar (`#F0AD15`)
e laranja (`#EB7C33`) ficam em **1,96:1** e **2,81:1** contra a superfície clara, abaixo dos 3:1 que a
WCAG 2.2 (1.4.11) pede para objeto gráfico; o contorno dá **7,63:1** no tema claro e **8,86:1** no
escuro contra o fundo da pílula. O contraste passa a estar no contorno, não no preenchimento — que é
como o próprio sistema já resolvia a marca do gráfico.

### 3. IBM Plex Mono não é carregada

A seção 23 nomeia a IBM Plex Mono (SIL OFL 1.1) para "código, logs e documentação técnica". O token
`--sbi-font-mono` existe, mas vale `ui-monospace, "SF Mono", Menlo, Consolas, monospace`: a fonte do
manual não é carregada.

**Efeito visual hoje: nenhum.** O token não é usado em nenhum componente ou folha de estilo
(`grep` em `app/` e `components/` encontra apenas a própria declaração).

**Decisão de 20/11: não carregar a fonte, e o motivo é medido.** O manual reserva a IBM Plex Mono para
"código, logs e documentação técnica", e o produto **não tem nenhuma dessas superfícies** — zero
`<pre>`, `<code>` ou `<samp>` em `app/` e `components/`. O caso que parecia pedir mono, o identificador
de máquina, o manual resolve por outro caminho: a desambiguação **`ss02`** da Inter, que a seção 23
nomeia. E o projeto **já faz isso**: a classe `.id` aplica `font-feature-settings: "ss02" 1` e é usada
em **oito telas** para o SKU. Então não há contexto de uso, e carregar uma segunda família para nada
custaria uma requisição e bytes em toda navegação. O token fica **reservado**, com o motivo escrito
nele: a primeira superfície de código que aparecer carrega a fonte e troca o valor ali.

### 4. A medida de 80 px da escala de espaço não existe

O manual lista 4 a 80 px e diz que "64 e 80 px só em páginas de apresentação". O código para em 64
(`--sbi-space-16`); não há `--sbi-space-20`.

**Decisão de 20/11: não acrescentar, e com uma medição que fecha o caso.** Não é só que falta o 80 px —
o **64 px também não tem uso**: `grep -c sbi-space-16` em `globals.css` devolve **zero**. Os dois são,
pelo manual, exclusivos de página de apresentação, e o produto não tem nenhuma. Acrescentar o 80 px
daria a impressão de que existe um contexto que não existe, e um token sem consumidor é peso morto que
a próxima pessoa tem de interpretar. O motivo está escrito ao lado do `--sbi-space-16`: entra junto com
a primeira página de apresentação, se houver.

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

## Contraste medido das séries, marcadores e linha de meta (20/11/2026)

Medido por cálculo da razão de contraste da WCAG 2.2 sobre os tokens resolvidos (`var()` incluído),
contra a **superfície** de cada tema (`#FFFFFF` no claro, `#101821` no escuro). Objeto gráfico — série,
marcador, linha de meta — exige **3:1** (1.4.11); rótulo é texto e exige **4,5:1**.

### O que os gráficos do projeto realmente usam

Levantamento antes de medir: o projeto usa **quatro** das oito cores categóricas — `--sbi-data-1`, `-2`,
`-3` e `-8` — mais as quatro de estado. **Âmbar (`-6`) e céu (`-7`), justamente as duas que o manual
ressalva, não são usadas em lugar nenhum.** A ressalva do manual, portanto, não pega neste produto.

| Token | Onde | Claro | Escuro | Exigência |
| --- | --- | --- | --- | --- |
| `--sbi-data-1` | barra, linha, ponto, 1ª fatia | **5,40** | **4,65** | 3:1 |
| `--sbi-data-2` | 2ª série, 2ª fatia | **3,31** | **5,42** | 3:1 |
| `--sbi-data-3` | 3ª fatia (boleto) | **5,27** | **5,46** | 3:1 |
| `--sbi-data-8` | fatia sem cor própria | **4,89** | **4,52** | 3:1 |
| `--sbi-chart-goal` | linha de meta tracejada | **17,50** | **16,21** | 3:1 |
| `--sbi-chart-label` | rótulo do eixo (texto) | **5,60** | **7,36** | 4,5:1 |

**Os seis passam nos dois temas.** A linha de meta, que é o marcador mais importante do painel, passa
com folga em ambos.

### Os três casos que ficam abaixo de 3:1 — e por que cada um está certo assim

| Token | Claro | Escuro | Leitura |
| --- | --- | --- | --- |
| `--sbi-chart-compare` | 2,35 | 2,99 | **Não é defeito.** A marca do ano anterior é um círculo com **borda de 2 px** em `--sbi-text-secondary` (8,30:1 no claro): o contraste está no contorno, e o preenchimento é só o miolo. A WCAG se satisfaz com o limite do objeto, não com a área. |
| `--sbi-chart-grid` | 1,29 | 1,30 | Linha de grade é **decoração**: o dado se lê sem ela, e levá-la a 3:1 transformaria o gráfico numa gaiola. Fica como está, de propósito. |
| `--sbi-chart-axis` | 1,52 | 1,72 | Mesma leitura da grade. O **rótulo** do eixo, que é o que carrega informação, passa em 4,5:1. |

### Escalas sequencial e divergente: medidas, e a medição é a documentação

| Escala | Claro | Escuro |
| --- | --- | --- |
| Sequencial (8 passos) | passos 1–4 entre **1,22** e **2,61**; 5–8 entre 3,55 e 9,81 | passos 1–6 acima de 3,60; 7–8 em **2,56** e **1,82** |
| Divergente (7 passos) | pontas em 4,21 e 5,40; meio e vizinhos entre **1,29** e **2,61** | ponta clara 4,24; meio em **1,30** |

Isso **não** é defeito a corrigir: numa escala ordenada de magnitude a ponta clara é clara por
definição, e o meio da divergente é um neutro que precisa recuar. O que a medição estabelece é a regra
para quem consumir: **passo claro de escala ordenada não se lê contra a superfície sozinho** — pede
contorno, rótulo ou legenda ao lado, como o manual já exige para âmbar e céu. As duas escalas seguem
**sem consumidor** no projeto (entraram porque o manual as declara e a revisão era fechar a lacuna); a
divergente é o encaixe natural da comparação "abaixo · acima da meta" do CEO, se ela for adiante.

### Legendas e tabelas equivalentes

Conferido no código e no E2E: todo gráfico tem `<figcaption>` com `<ul class="legend">` nomeando cada
série em texto, e **tabela equivalente** com `<caption class="sr-only">` — no `ColumnChart` a marca do
ano anterior vira uma coluna que mostra `—` quando o mês não tem base. Então nenhuma informação dos
gráficos depende de distinguir cor: há nome na legenda e número na tabela. As 12 pílulas de nível do
alerta de margem foram conferidas uma a uma no E2E (`CT-WEB-143`): todas trazem o nível escrito.

## Validação nos dois temas, inclusive nos gráficos

Medido com `@axe-core/playwright` nas marcas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` e `wcag22aa`,
contra a pilha do worktree (API na 8083 sobre o banco descartável, frontend na 3002), nas três telas
alteradas, nos dois temas e em duas larguras. O resultado está em
[evidências da revisão](../10-historico/planejamento/) e no relato da sessão.

O tema é fixado como o seletor da conta o fixa (`localStorage['sbi:tema']` → `html[data-theme]`), com
`colorScheme` do navegador combinando, para o teste medir o mesmo caminho que o usuário usa.
