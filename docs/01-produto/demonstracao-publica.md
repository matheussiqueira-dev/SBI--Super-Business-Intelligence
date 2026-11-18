# Demonstração pública (`/demo`)

Abra a [demonstração pública](https://sbi-app-alpha.vercel.app/demo) pelo navegador ou use **Explorar demonstração** na [tela de login](https://sbi-app-alpha.vercel.app/entrar). Na execução local, abra [`/demo`](http://127.0.0.1:3000/demo) com o frontend em execução.

O catálogo usa os produtos e preços do recorte Apple do projeto. Vendas, estoque e metas são simulados na aba. O cenário do site publicado corresponde à revisão em produção na Vercel.

## 1. Arquitetura e isolamento

A demonstração **não desliga a autenticação** e **não cria endpoint público nenhum**. Ela roda inteira no navegador:

| Camada | O que acontece |
| --- | --- |
| Rota | `proxy.ts` libera `/demo` do redirecionamento para `/entrar`. As demais rotas continuam redirecionando sem o cookie `JSESSIONID`, e cada área autenticada continua conferindo a sessão em `/auth/me` (a API é a autoridade final). |
| Dados | `lib/demo/ledger.ts` gera a base sintética a partir de uma semente fixa, no próprio navegador. Nenhuma chamada a `/api/backend`, nenhum cookie, nenhuma leitura do banco. |
| Estado do visitante | Perfil, recorte, vendas simuladas e metas editadas ficam em `sessionStorage` **da aba**, sob a chave `sbi-demo-sessao-v2`. Cada aba tem seu estado. A nova versão começa com o catálogo Apple e IDs próprios para os perfis do cenário. |
| Interface | Os painéis reaproveitam os componentes da aplicação autenticada (`components/`) e o mesmo motor de indicadores (`lib/executive.ts`). O painel do CEO é literalmente o mesmo componente da área autenticada (`components/executive-view.tsx`), só com o modelo vindo da base sintética. |

Consequências:

- O seletor "Visualizar como" **não é elevação de privilégio**: ele troca o recorte de dados de um conjunto fictício
  que já está no navegador. Nenhum endpoint protegido é chamado, e nenhuma sessão é criada (CT-DEMO-204).
- Operações da demonstração (venda, meta, filtro, restauração) nunca saem da aba. O banco de produção não é tocado.
- Com a API fora do ar (plano gratuito do Render dormindo), `/demo` continua funcionando: é a rota mais segura para
  abrir a apresentação.

## 2. Cenário comercial simulado

| Item | Valor |
| --- | --- |
| Empresa | Loja Modelo SBI, varejo de produtos Apple e acessórios em Fortaleza (CE) |
| Gerente 1 | Matheus Siqueira, equipe de Allan Barros |
| Gerente 2 | Gabriel Sousa, equipe de Francisco Ferreira |
| CEO | Paulo Thiago Gomes Da Silva, Christian Felix Gbedande Azonyetin e Bruno Marciano De Amorim Josino |
| Catálogo | 42 SKUs em 7 categorias. Preços e custos de referência vêm do CSV Olist |
| Calendário | Segunda a sábado. O plano comercial usa 26 dias de funcionamento por mês |
| Histórico | 24 meses até o mês corrente |

A receita da loja soma as vendas dos dois vendedores. A visão de gerente mostra os indicadores da loja e os dados individuais da equipe selecionada. Os três CEOs visualizam o mesmo consolidado.

O catálogo estático em [`apple-catalog.ts`](../../frontend/lib/demo/apple-catalog.ts) é gerado pelo comando `python scripts/demo-catalog.py` a partir de [`olist/produtos.csv`](../03-banco-de-dados/pacote-sql/olist/produtos.csv). Se alterar o CSV, gere o arquivo e rode `python scripts/demo-catalog.py --check`, a mesma conferência da CI. O build do frontend usa o arquivo versionado. Os parâmetros de metas e os perfis ficam em [`scenario.ts`](../../frontend/lib/demo/scenario.ts).

### Metas mensais iniciais do plano

| Indicador | Referência para um mês de R$ 60.000 |
| --- | ---: |
| Faturamento líquido | R$ 60.000 |
| Vendas | 30 |
| Ticket médio | R$ 2.000 |
| Itens por venda | 1,40 |
| Itens vendidos | 42 |
| Taxa de conversão | 25% |
| Meta de cada vendedor | R$ 30.000 |

A meta da loja varia por mês. O plano usa R$ 52.000 em janeiro e fevereiro, R$ 72.000 em dezembro e R$ 720.000 de meta anual. No último mês fechado, a demonstração usa o cenário de referência da seção seguinte.

## 3. Base sintética

`generateLedger({ today, seed })` produz um **registro de pedidos** (produtos, clientes, pedidos com itens, devoluções,
cancelamentos, metas, estoque e visitantes). Os fatos do painel (`sales` e `refunds`) são **derivados** desse registro
por `toOverview`, no formato exato de `GET /executive/overview`. Uma venda é uma transação lógica só: os três níveis
leem a mesma.

- **Determinismo.** A mesma semente e o mesmo dia produzem exatamente a mesma loja (CT-DEMO-102).
- **Dinheiro em centavos.** Tudo circula como inteiro e só vira reais na saída; a soma dos itens fecha com o total do
  pedido, sem centavo perdido (CT-DEMO-109).
- **Conformidade com o contrato.** A base é validada contra o schema Zod gerado do OpenAPI v6 (CT-DEMO-101).
- **Calibração.** A receita planejada no mês é repartida por vendedor e por venda. O gerador monta pedidos a partir dos preços de tabela do catálogo e distribui o desconto comercial entre os itens pelo método do maior resto. Cada pedido respeita o teto de 20%.
- **Variação.** O histórico inclui dias de maior movimento, pedidos de valores distintos, devoluções, cancelamentos, cinco produtos abaixo do estoque mínimo e um item antigo com custo ausente. O painel apresenta o lucro desse recorte como “Não informado”.
- **Nada no futuro.** Períodos futuros aparecem apenas como meta: dezembro tem meta cadastrada e nenhuma venda
  (CT-DEMO-103 e CT-DEMO-104).

### Cenário de referência do mês fechado

O último mês completo é calibrado para a apresentação. O custo, a margem e o lucro bruto são calculados a partir dos itens de cada venda.

| Vendedor | Meta | Realizado | Vendas pagas |
| --- | ---: | ---: | ---: |
| Allan Barros | R$ 30.000,00 | R$ 26.700,00 | 14 |
| Francisco Ferreira | R$ 30.000,00 | R$ 30.000,00 | 16 |
| Total | R$ 60.000,00 | R$ 56.700,00 | 30 |

O consolidado fecha em 94,5% da meta, com ticket médio de R$ 1.890,00. Os testes CT-DEMO-106 e 107 conferem a reconciliação.

## 4. Motor de metas e indicadores

As contas vivem em dois lugares, sem duplicação:

- [`frontend/lib/executive.ts`](../../frontend/lib/executive.ts) — já em produção no painel do CEO: medidas, filtros,
  rankings, metas por loja, equipe e vendedor, curva ABC e destaques.
- [`frontend/lib/demo/targets.ts`](../../frontend/lib/demo/targets.ts) — o que a demonstração acrescenta: estados da
  meta, desvio, metas derivadas pelo calendário operacional e conversão comercial. O atingimento, o ritmo esperado e a
  projeção vêm de `goalStatus`, a mesma função do painel autenticado.

### Definições usadas em cada cálculo

| Indicador | Fórmula | Definição |
| --- | --- | --- |
| Faturamento confirmado (receita líquida) | `vendas − devoluções` | Soma dos itens de pedidos com **pagamento confirmado**, no dia do pagamento, já descontados os descontos comerciais do item. Pedido cancelado e pedido aguardando pagamento não entram. A devolução é do pedido, no dia em que foi registrada. |
| CMV (preço de compra) | `Σ custo unitário × quantidade` | Custo dos itens vendidos. Item sem custo informado **não vira zero**: o lucro e a margem do recorte ficam nulos ("Não informado"). |
| Lucro bruto | `receita líquida − CMV` | Nunca confundido com faturamento. Não existe lucro líquido na demonstração: não há dados de despesas e impostos. |
| Margem bruta | `(lucro bruto ÷ receita líquida) × 100` | Nula quando falta custo ou quando não há receita no recorte. |
| Ticket médio | `vendas ÷ pedidos pagos` | Vendas antes das devoluções, dividido pela quantidade de pedidos pagos distintos. |
| Itens por venda | `unidades ÷ pedidos pagos` | Nulo sem venda no recorte. |
| Atingimento | `(realizado ÷ meta) × 100` | Nulo quando não há meta (meta zero ou mês sem meta). |
| Desvio da meta | `realizado − meta` | Negativo quando falta. |
| Ritmo esperado hoje | `meta × dias decorridos ÷ dias do mês` | Regra linear por dias de calendário, a mesma já usada no painel autenticado. |
| Ritmo cumprido | `(realizado ÷ ritmo esperado) × 100` | Base do estado da meta durante o mês. |
| Projeção de fechamento | `(realizado ÷ dias decorridos) × dias do mês` | **Estimativa**, sempre identificada como tal na tela; nunca aparece como resultado realizado. |
| Falta por dia (vendedor e gerente) | `falta ÷ dias de funcionamento restantes` | Usa o calendário operacional (a loja fecha no domingo), não 30 dias nem 4 semanas. |
| Falta por dia (CEO) | `falta ÷ dias de calendário restantes` | Vem dos destaques de `lib/executive.ts`, reaproveitados do painel autenticado sem alteração; a tela escreve "dias restantes". |
| Conversão comercial | `(vendas pagas ÷ visitantes) × 100` | Só da loja: o modelo não tem atendimento por vendedor. Nula sem visitante no recorte. |

> **Duas bases de dias, duas finalidades.** Ritmo esperado, ritmo cumprido e projeção medem o *andamento do mês* e usam
> dias de calendário: saem da mesma `goalStatus` de `lib/executive.ts` nos três perfis, portanto vendedor, gerente e CEO
> mostram o mesmo ritmo, igual ao painel autenticado. A falta por dia e as metas derivadas medem o *esforço exigido*
> e saem em duas bases: nos painéis de vendedor e gerente usam dias de funcionamento, porque a loja fecha no
> domingo; nos destaques do painel do CEO a falta por dia usa dias de calendário, porque ali o componente de
> produção entra sem alteração. Não é o mesmo indicador calculado de dois jeitos: são indicadores diferentes, e a
> tela nomeia a base de cada número ("dias do mês", "dias de funcionamento" e "dias restantes").

### Metas derivadas

| Meta derivada | Cálculo |
| --- | --- |
| Meta por dia de funcionamento | `meta mensal ÷ dias de abertura do mês` (não ÷ 30) |
| Meta da semana | `meta diária × dias de funcionamento da semana comercial` (segunda a sábado, limitada ao mês) |
| Meta individual mensal | Distribuição da meta da loja entre os vendedores (soma exata, em centavos) |
| Meta individual diária | `meta individual ÷ dias de abertura do mês` |
| Vendas necessárias | `meta ÷ ticket médio de referência` |
| Ticket necessário | `meta ÷ quantidade de vendas do plano` |
| Itens exigidos | `(meta ÷ ticket médio de referência) × itens por venda do plano`, arredondado |

### Estados da meta

Cinco estados, com rótulo, ícone e selo — a cor nunca é a única pista:

| Estado | Critério | Rótulo (mês em curso / mês fechado) |
| --- | --- | --- |
| Meta atingida | `realizado ≥ meta` | Meta atingida |
| Perto da meta | `ritmo cumprido ≥ 90%` | No ritmo da meta / Perto da meta |
| Abaixo | `ritmo cumprido < 90%` | Abaixo do ritmo / Abaixo da meta |
| Dados insuficientes | o mês ainda não teve dia de funcionamento | Dados insuficientes |
| Sem meta | meta nula ou zero | Sem meta cadastrada |

O limiar de 90% é configurável (`GoalCriteria.nearRatio`).

## 5. Os três painéis

| Perfil | Áreas | O que vê | O que **não** vê |
| --- | --- | --- | --- |
| Vendedor | Meu desempenho, Minhas vendas | Meta individual do mês, acumulado, atingimento, falta, ticket médio, itens por venda, evolução diária, produtos mais vendidos e o próprio histórico | Lucro, CMV, margem, conversão da loja e o desempenho individual dos colegas |
| Gerente | Visão geral, Equipe e metas, Estoque e giro | Consolidado e estoque da loja, ranking e meta da equipe selecionada, alertas e configuração de metas | A visão executiva da diretoria (meta anual, cobertura do plano, curva ABC) |
| CEO | Painel executivo, Metas comerciais | O painel executivo completo da aplicação autenticada (KPIs com variação, destaques, metas, drill-down ano → mês → dia, rankings com filtro cruzado, lucro × preço de compra, curva ABC, exportação CSV) e o plano anual | — |

Ao trocar de perfil ou de pessoa, a aba mantém o recorte de período. Use os seletores de vendedor, gerente e CEO em exibição para percorrer as duas equipes e o painel executivo.

## 6. Venda simulada e integração entre níveis

O botão **Registrar venda simulada** abre um painel com vendedor, cliente, produtos, quantidade, forma de pagamento e
desconto. A venda entra como **um pedido pago de hoje** no registro da demonstração. Regras conferidas antes de
registrar, iguais às do sistema real:

- produto precisa existir e estar à venda;
- quantidade inteira e positiva, dentro do estoque disponível;
- desconto dentro da alçada do papel ativo: 5% para o vendedor, 20% para gerente e CEO (os mesmos limites da tabela
  `discount_policy`, migração V11);
- teto de 50 vendas simuladas por visitante.

A sacola sugerida tem iPhone 18 Pro 256 GB, capa de silicone com MagSafe e carregador MagSafe. Os três itens somam **R$ 11.706,00** no catálogo de referência. O vendedor registra em seu nome. O gerente opera para os vendedores da equipe em exibição e o CEO pode escolher qualquer vendedor.

Depois de registrada, a mesma transação aparece nos três níveis (CT-DEMO-141 e CT-DEMO-202):

| Nível | O que muda |
| --- | --- |
| Vendedor | Receita, quantidade de vendas, ticket médio, atingimento e o que falta para a meta |
| Gerente | Faturamento da loja (+ o mesmo valor), ranking, quadro da equipe, meta coletiva e gráficos |
| CEO | Faturamento consolidado, CMV dos itens vendidos, lucro bruto, margem e a evolução do ano |
| Estoque | Disponível de cada produto da sacola é baixado |

Nada é alterado "na mão" em cartões soltos: todos os números saem do mesmo registro.

## 7. Metas configuráveis

Gerente e CEO abrem **Configurar metas** e editam, por mês: a meta da loja e a distribuição entre os vendedores, com
as mesmas restrições do servidor — nada negativo, período `AAAA-MM` e a soma das metas individuais fechando exatamente
com a meta da loja (em centavos). O botão "Dividir igualmente" usa a mesma função da tela de metas autenticada.

A meta anterior **não é apagada**: fica no histórico do mês, com responsável e data. O painel traz ainda a comparação
entre os últimos meses (meta, realizado, atingimento e situação). O vendedor não edita metas.

## 8. Filtros

Recorte compartilhado pelos painéis: Hoje, Últimos 7 dias, Mês atual, Mês anterior e Intervalo personalizado
(ordenado e nunca adiante de hoje), mais o filtro de categoria e a seleção da pessoa de cada perfil.

Escopos explicitamente diferentes, sinalizados na tela:

- indicadores, gráficos e rankings seguem o recorte;
- **metas são sempre do mês de referência do recorte** (o mês em que o recorte termina);
- o filtro de categoria muda indicadores, mas **não muda metas** (meta é da venda total);
- o cartão "mês × mês anterior" compara o mês de referência do recorte com o mês imediatamente anterior, então
  trocar o recorte troca o par de meses comparado.

## 9. Restaurar e isolamento entre visitantes

**Restaurar demonstração** (menu lateral, aviso de vendas simuladas e diálogo de confirmação) descarta as vendas
simuladas e as metas editadas da aba e devolve a base ao estado inicial, com as metas do plano. O `sessionStorage` é
limpo. Como a base vem da semente, o estado inicial é sempre o mesmo.

O conteúdo guardado na aba é conferido na leitura (vendedor da equipe, cliente existente, produto à venda, quantidade
e desconto dentro do item, data dentro da janela, distribuição de meta fechando): qualquer adulteração descarta o
estado e a demonstração começa limpa (CT-DEMO-150).

## 10. Testes

| Arquivo | Casos | Cobre |
| --- | --- | --- |
| `frontend/tests/demo-ledger.test.ts` | CT-DEMO-101 a 116 | Conformidade com o contrato, determinismo, calendário, reconciliação do mês de referência, distribuição de metas, integridade monetária, realismo, custo ausente e desempenho da geração |
| `frontend/tests/demo-targets.test.ts` | CT-DEMO-121 a 128 | Atingimento, desvio, ritmo, projeção, estados da meta, metas derivadas, divisão por zero e ausência de dados |
| `frontend/tests/demo-state.test.ts` | CT-DEMO-141 a 153 | Venda simulada como transação única nos três níveis, estoque, alçada de desconto, restauração, metas editadas com histórico, filtros, isolamento entre visitantes e rejeição de estado adulterado |
| `frontend/e2e/demo.spec.ts` | CT-DEMO-201 a 207 | Fluxo ponta a ponta sem sessão, venda simulada nos três perfis, restauração, isolamento entre visitantes, bloqueio das rotas protegidas, entrada pela tela de login e acessibilidade (axe, WCAG 2.2 AA) |

```bash
cd frontend && npm run typecheck && npm test && npm run build
```

```bash
cd frontend && npm run test:e2e:demo
```

`npm run test:e2e:demo` usa `playwright.demo.config.mjs` e **não precisa de banco nem da API no ar**, porque `/demo`
não chama o backend. O arquivo também entra no `npm run test:e2e` do CI.

Consulte os relatórios do job `frontend` da CI para os resultados do commit em verificação. O cenário Apple tem casos específicos para os 42 SKUs, os vínculos entre as equipes e a operação de venda por perfil.

### Histórico da dependência em 17/11/2026

O Next.js 16.4.3 é alcançado por dois alertas de divulgação de informação entre *root params*
(GHSA-mfr8-8qww-v76h e GHSA-vc7v-qv4w-wrv8, ambos CWE-362, corrigidos em 16.4.5). Os dois exigem `'use cache'`
chamado por `unstable_cache()` ou `'use cache'` aninhado com `next/root-params`, recursos que este projeto não usa, e
nenhum deles alcança `/demo`, que roda sem cache de servidor. Na ocasião, a atualização para 16.4.5 passou no build, na verificação de tipos, nos 112 testes unitários, na conferência do contrato e nos seis testes ponta a ponta. O `npm audit --omit=dev` também passou.

## 11. Arquivos

| Arquivo | Para quê |
| --- | --- |
| `frontend/app/demo/page.tsx` | Rota pública; calcula o dia da loja no servidor (render sob demanda) e monta o contexto |
| `frontend/app/demo/demo-app.tsx` | Casca: aviso de ambiente, seletor "Visualizar como", menu por perfil, recorte, restauração |
| `frontend/app/demo/seller-view.tsx`, `manager-view.tsx`, `ceo-view.tsx` | Os três painéis |
| `frontend/app/demo/panels.tsx` | Blocos comuns (meta, indicadores, equipe, produtos, alertas, histórico) |
| `frontend/app/demo/sale-dialog.tsx`, `goals-dialog.tsx`, `guided-tour.tsx` | Venda simulada, metas e apresentação guiada |
| `frontend/lib/demo/scenario.ts` | Parâmetros comerciais (empresa, equipe e plano de metas) |
| `frontend/lib/demo/apple-catalog.ts` | Catálogo gerado a partir do CSV Olist, com preço e custo em centavos |
| `frontend/lib/demo/ledger.ts` | Geração da base sintética e conversão para o formato do contrato |
| `frontend/lib/demo/calendar.ts`, `random.ts` | Calendário operacional e sorteio determinístico |
| `frontend/lib/demo/targets.ts`, `metrics.ts` | Motor de metas e leituras dos painéis |
| `frontend/lib/demo/state.ts`, `store.tsx` | Estado do visitante, validações e contexto React |
| `frontend/components/executive-view.tsx` | Painel executivo sem fonte de dados própria, compartilhado pela área autenticada e pela demonstração |

## 12. Roteiro da apresentação (bloco prático, ~8 min)

A demonstração traz o roteiro embutido em **Iniciar apresentação guiada**: cinco etapas que levam a tela ao perfil, à
área e ao recorte certos, com o que dizer e o que mostrar.

1. **Entrada pública.** Abra `/demo` (ou clique em "Explorar demonstração" no login). Mostre o aviso de ambiente, a
   loja simulada e, no recorte "Mês anterior", a meta de R$ 60.000 com R$ 56.700 realizados (94,5%).
2. **Vendedor.** Selecione Allan Barros ou Francisco Ferreira e escolha “Mês atual”. Registre a sacola sugerida de R$ 11.706,00 e confira o aumento do faturamento.
3. **Gerente.** Selecione o gerente da equipe do vendedor. Compare o faturamento da loja e o realizado da equipe com os valores anteriores à venda.
4. **CEO.** Troque para CEO: a mesma transação entra no resultado financeiro (CMV, lucro bruto e margem recalculados)
   e a projeção aparece identificada como estimativa.
5. **Banco de dados e qualidade.** Em Metas comerciais, mostre o acompanhamento mês a mês, o mês fechado reconciliando
   com o cenário de referência e o histórico de metas. Feche com **Restaurar demonstração**.

## 13. Limites conhecidos

- A base sintética vive no navegador: recarregar a aba mantém o que o visitante fez (sessionStorage), fechar a aba
  descarta. Não há persistência entre dispositivos, por desenho.
- A conversão comercial é da loja; não há atendimento por vendedor no modelo.
- Não há lucro líquido, porque não há despesas, impostos nem folha na simulação.
- Duas bases de dias convivem, de propósito. O ritmo esperado, o ritmo cumprido e a projeção usam dias de calendário
  nos três perfis, pela mesma `goalStatus` de `lib/executive.ts` que o painel autenticado já usa, de modo que vendedor,
  gerente e CEO leem o mesmo ritmo. A falta por dia e as metas derivadas usam dias de funcionamento nos painéis de
  vendedor e gerente, porque não se vende com a loja fechada, e dias de calendário nos destaques do painel do CEO,
  que é o componente de produção reaproveitado sem alteração. Unificar as duas bases mexeria na regra do sistema
  autenticado, o que está fora do escopo da demonstração.
- A loja simulada tem uma unidade. Não há consolidação de filiais nem multiempresa.
