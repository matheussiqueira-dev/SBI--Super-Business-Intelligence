# Demonstração pública (`/demo`)

Rota pública que abre o SBI sem cadastro, sem senha e sem sessão, com uma loja de varejo simulada e os três níveis de
gestão (vendedor, gerente e CEO) em um seletor único. Serve para a apresentação da A3 e para qualquer avaliador que
abra a aplicação publicada sem credenciais.

- Local: <http://127.0.0.1:3000/demo> (`cd frontend && npm run dev`) ou `npm run build && npm run start`.
- Publicada: `/demo` do domínio do frontend (<https://sbi-app-alpha.vercel.app/demo>), **depois** de um deploy que
  contenha esta branch. Enquanto não houver deploy conferido, não afirme que está publicada.
- Entrada pela tela de login: botão **Explorar demonstração** em `/entrar`.

Todos os números da demonstração são **dados sintéticos para demonstração**. Não representam uma empresa real nem
média comprovada de mercado.

## 1. Arquitetura e isolamento

A demonstração **não desliga a autenticação** e **não cria endpoint público nenhum**. Ela roda inteira no navegador:

| Camada | O que acontece |
| --- | --- |
| Rota | `proxy.ts` libera `/demo` do redirecionamento para `/entrar`. As demais rotas continuam redirecionando sem o cookie `JSESSIONID`, e cada área autenticada continua conferindo a sessão em `/auth/me` (a API é a autoridade final). |
| Dados | `lib/demo/ledger.ts` gera a base sintética a partir de uma semente fixa, no próprio navegador. Nenhuma chamada a `/api/backend`, nenhum cookie, nenhuma leitura do banco. |
| Estado do visitante | Perfil, recorte, vendas simuladas e metas editadas ficam em `sessionStorage` **da aba**, sob a chave `sbi-demo-sessao-v1`. Visitantes diferentes (outra aba, outro navegador, outro computador) não compartilham nada. |
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
| Empresa | Loja Modelo SBI — moda casual e acessórios, pequena empresa varejista, 1 loja física (Fortaleza/CE) |
| Equipe | 1 CEO (Regina Alencar), 1 gerente (Marina Duarte) e 3 vendedores: Vendedor 01 (Bruno Teixeira), Vendedor 02 (Carla Nogueira) e Vendedor 03 (Diego Matos) |
| Catálogo | 62 SKUs em 5 categorias (camisetas, calças, bermudas, vestidos e acessórios), com preço de venda e preço de compra |
| Calendário | Abre de segunda a sábado e fecha no domingo; o plano comercial usa 26 dias de funcionamento por mês |
| Histórico | 24 meses, terminando no mês corrente; nenhuma venda registrada depois de hoje |

O gerente acompanha a operação e **não registra vendas** na demonstração, então o realizado da loja é exatamente a
soma dos três vendedores — o que torna a reconciliação visível na tela.

Parâmetros em [`frontend/lib/demo/scenario.ts`](../../frontend/lib/demo/scenario.ts).

### Metas mensais iniciais (plano)

| Indicador | Meta mensal |
| --- | ---: |
| Faturamento líquido comercial | R$ 60.000 |
| Quantidade de vendas | 400 |
| Ticket médio | R$ 150 |
| Margem bruta | 35% |
| Lucro bruto-alvo | R$ 21.000 |
| Custo das mercadorias-alvo | R$ 39.000 |
| Itens por venda | 1,60 |
| Itens vendidos | 640 |
| Taxa de conversão | 25% |
| Vendas por vendedor | R$ 20.000 |

A margem de 35% é uma hipótese comercial da simulação, não um benchmark. A meta da loja varia por mês no plano
(R$ 52.000 em janeiro e fevereiro, R$ 72.000 em dezembro) e a meta anual de 2026 é R$ 720.000.

## 3. Base sintética

`generateLedger({ today, seed })` produz um **registro de pedidos** (produtos, clientes, pedidos com itens, devoluções,
cancelamentos, metas, estoque e visitantes). Os fatos do painel (`sales` e `refunds`) são **derivados** desse registro
por `toOverview`, no formato exato de `GET /executive/overview`. Uma venda é uma transação lógica só: os três níveis
leem a mesma.

- **Determinismo.** A mesma semente e o mesmo dia produzem exatamente a mesma loja (CT-DEMO-102).
- **Dinheiro em centavos.** Tudo circula como inteiro e só vira reais na saída; a soma dos itens fecha com o total do
  pedido, sem centavo perdido (CT-DEMO-109).
- **Conformidade com o contrato.** A base é validada contra o schema Zod gerado do OpenAPI v6 (CT-DEMO-101).
- **Calibração.** Cada mês tem um alvo de receita (meta × atingimento sorteado) e de quantidade de vendas; as sacolas
  saem do mix da loja e a diferença entre o preço de tabela e o alvo vira desconto comercial, repartido entre pedidos
  e itens pelo método do maior resto. Assim o mês fecha no centavo.
- **Realismo.** Dias fortes e fracos (peso por dia da semana), vendedores com desempenhos diferentes, categorias com
  rentabilidades distintas, produtos de maior e menor giro, meses acima e abaixo da meta, devoluções e cancelamentos
  ocasionais, cinco produtos abaixo do estoque mínimo, duas pontas de estoque com margem abaixo de 10% e um mês antigo
  com item sem custo informado (para o lucro aparecer como "Não informado", nunca zero).
- **Nada no futuro.** Períodos futuros aparecem apenas como meta: dezembro tem meta cadastrada e nenhuma venda
  (CT-DEMO-103 e CT-DEMO-104).

### Cenário de referência do mês fechado

O último mês completo é calibrado para reconciliar exatamente com o cenário da seção 4.2 do plano de evolução:

| Métrica | Alvo | Resultado da base |
| --- | ---: | ---: |
| Meta da loja | R$ 60.000,00 | R$ 60.000,00 |
| Vendas realizadas | R$ 56.700,00 | R$ 56.700,00 |
| Atingimento | 94,5% | 94,5% |
| Quantidade de vendas | 378 | 378 |
| Ticket médio | R$ 150,00 | R$ 150,00 |
| Margem bruta | 34% | 34,0% |
| Lucro bruto | R$ 19.278,00 | R$ 19.301,10 |

| Vendedor | Meta | Realizado | Vendas |
| --- | ---: | ---: | ---: |
| Vendedor 01 · Bruno Teixeira | R$ 20.000,00 | R$ 17.300,00 | 118 |
| Vendedor 02 · Carla Nogueira | R$ 20.000,00 | R$ 18.900,00 | 126 |
| Vendedor 03 · Diego Matos | R$ 20.000,00 | R$ 20.500,00 | 134 |
| Total | R$ 60.000,00 | R$ 56.700,00 | 378 |

Receita, quantidade de vendas, ticket e a distribuição por vendedor batem no centavo. O lucro bruto depende do mix de
produtos efetivamente sorteado, então fica próximo do alvo (margem entre 33,4% e 34,6%, conferido em CT-DEMO-106).

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
| Falta por dia | `falta ÷ dias de funcionamento restantes` | Usa o calendário operacional (a loja fecha no domingo), não 30 dias nem 4 semanas. |
| Conversão comercial | `(vendas pagas ÷ visitantes) × 100` | Só da loja: o modelo não tem atendimento por vendedor. Nula sem visitante no recorte. |

### Metas derivadas

| Meta derivada | Cálculo |
| --- | --- |
| Meta por dia de funcionamento | `meta mensal ÷ dias de abertura do mês` (não ÷ 30) |
| Meta da semana | `meta diária × dias de funcionamento da semana comercial` (segunda a sábado, limitada ao mês) |
| Meta individual mensal | Distribuição da meta da loja entre os vendedores (soma exata, em centavos) |
| Meta individual diária | `meta individual ÷ dias de abertura do mês` |
| Vendas necessárias | `meta ÷ ticket médio de referência` |
| Ticket necessário | `meta ÷ quantidade de vendas do plano` |

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
| Gerente | Visão geral, Equipe e metas, Estoque e giro | Consolidado da loja, meta coletiva, comparação entre vendedores, quem está acima e abaixo, ranking, formas de pagamento, alertas operacionais, estoque abaixo do mínimo, giro e configuração de metas | A visão executiva da diretoria (meta anual, cobertura do plano, curva ABC) |
| CEO | Painel executivo, Metas comerciais | O painel executivo completo da aplicação autenticada (KPIs com variação, destaques, metas, drill-down ano → mês → dia, rankings com filtro cruzado, lucro × preço de compra, curva ABC, exportação CSV) e o plano anual | — |

A troca de perfil é imediata (estado da aba, sem recarregar), mantém o recorte de período e troca o menu lateral, o
breadcrumb e o título. Na visão do vendedor há um seletor entre os três vendedores fictícios, marcado na tela como
escolha demonstrativa.

## 6. Venda simulada e integração entre níveis

O botão **Registrar venda simulada** abre um painel com vendedor, cliente, produtos, quantidade, forma de pagamento e
desconto. A venda entra como **um pedido pago de hoje** no registro da demonstração. Regras conferidas antes de
registrar, iguais às do sistema real:

- produto precisa existir e estar à venda;
- quantidade inteira e positiva, dentro do estoque disponível;
- desconto dentro da alçada do papel ativo: 5% para o vendedor, 20% para gerente e CEO (os mesmos limites da tabela
  `discount_policy`, migração V11);
- teto de 50 vendas simuladas por visitante.

O botão **Sacola sugerida do roteiro** monta a sacola da apresentação: Calça Jeans Wide Leg + Vestido Curto Canelado +
Camiseta Básica Branca = **R$ 449,70** de preço de tabela. Como todos os preços do catálogo terminam em `,90`, não há
sacola de três itens que feche em R$ 450,00 exatos sem um desconto artificial; R$ 449,70 é a sacola coerente mais
próxima da referência de R$ 450 do plano.

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
(ordenado e nunca adiante de hoje), mais o filtro de categoria e, na visão do vendedor, a escolha do vendedor.

Escopos explicitamente diferentes, sinalizados na tela:

- indicadores, gráficos e rankings seguem o recorte;
- **metas são sempre do mês de referência do recorte** (o mês em que o recorte termina);
- o filtro de categoria muda indicadores, mas **não muda metas** (meta é da venda total);
- o cartão "mês atual × mês anterior" compara meses fechados, independentemente do recorte.

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
| `frontend/tests/demo-ledger.test.ts` | CT-DEMO-101 a 115 | Conformidade com o contrato, determinismo, calendário, reconciliação do mês de referência, distribuição de metas, integridade monetária, realismo, custo ausente e desempenho da geração |
| `frontend/tests/demo-targets.test.ts` | CT-DEMO-121 a 128 | Atingimento, desvio, ritmo, projeção, estados da meta, metas derivadas, divisão por zero e ausência de dados |
| `frontend/tests/demo-state.test.ts` | CT-DEMO-141 a 152 | Venda simulada como transação única nos três níveis, estoque, alçada de desconto, restauração, metas editadas com histórico, filtros, isolamento entre visitantes e rejeição de estado adulterado |
| `frontend/e2e/demo.spec.ts` | CT-DEMO-201 a 206 | Fluxo ponta a ponta sem sessão, venda simulada nos três perfis, restauração, isolamento entre visitantes, bloqueio das rotas protegidas, entrada pela tela de login e acessibilidade (axe, WCAG 2.2 AA) |

```bash
cd frontend && npm run typecheck && npm test && npm run build
```

```bash
cd frontend && npm run test:e2e:demo
```

`npm run test:e2e:demo` usa `playwright.demo.config.mjs` e **não precisa de banco nem da API no ar**, porque `/demo`
não chama o backend. O arquivo também entra no `npm run test:e2e` do CI.

## 11. Arquivos

| Arquivo | Para quê |
| --- | --- |
| `frontend/app/demo/page.tsx` | Rota pública; calcula o dia da loja no servidor (render sob demanda) e monta o contexto |
| `frontend/app/demo/demo-app.tsx` | Casca: aviso de ambiente, seletor "Visualizar como", menu por perfil, recorte, restauração |
| `frontend/app/demo/seller-view.tsx`, `manager-view.tsx`, `ceo-view.tsx` | Os três painéis |
| `frontend/app/demo/panels.tsx` | Blocos comuns (meta, indicadores, equipe, produtos, alertas, histórico) |
| `frontend/app/demo/sale-dialog.tsx`, `goals-dialog.tsx`, `guided-tour.tsx` | Venda simulada, metas e apresentação guiada |
| `frontend/lib/demo/scenario.ts` | Parâmetros comerciais (empresa, equipe, catálogo, plano de metas) |
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
2. **Vendedor.** Troque para Vendedor 01, recorte "Mês atual". Anote o faturamento e o atingimento, registre a venda
   pela sacola sugerida (R$ 449,70) e mostre os dois subindo.
3. **Gerente.** Troque o perfil: o faturamento da loja subiu exatamente R$ 449,70, e o ranking e o quadro da equipe
   acompanham.
4. **CEO.** Troque para CEO: a mesma transação entra no resultado financeiro (CMV, lucro bruto e margem recalculados)
   e a projeção aparece identificada como estimativa.
5. **Banco de dados e qualidade.** Em Metas comerciais, mostre o acompanhamento mês a mês, o mês fechado reconciliando
   com o cenário de referência e o histórico de metas. Feche com **Restaurar demonstração**.

## 13. Limites conhecidos

- A base sintética vive no navegador: recarregar a aba mantém o que o visitante fez (sessionStorage), fechar a aba
  descarta. Não há persistência entre dispositivos, por desenho.
- A conversão comercial é da loja; não há atendimento por vendedor no modelo.
- Não há lucro líquido, porque não há despesas, impostos nem folha na simulação.
- O painel executivo da demonstração é o mesmo da área autenticada: o ritmo esperado que ele mostra segue a regra
  linear por dias de calendário já em produção, enquanto o "falta por dia" dos painéis de vendedor e gerente usa dias
  de funcionamento. Os dois estão rotulados na tela.
- A loja simulada tem uma unidade. Não há consolidação de filiais nem multiempresa.
