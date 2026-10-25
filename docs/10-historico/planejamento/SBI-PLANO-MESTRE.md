# SBI — Plano mestre de execução (documento vivo)

> Documento de trabalho local, na pasta `C:\Users\mathe\Documents\Programação\A3`. Fica fora dos repositórios Git e nunca é versionado.
> Versão 3, 14/10/2026, 05h15. Substitui, como guia de execução, `SBI-PROMPT-ERP-PDV.md` (v2) e a v1. Os dois continuam como histórico.
> Quem executa este documento é um agente de desenvolvimento no IntelliJ. As seções 0 a 11 são instrução. O agente só edita as seções 12 (Quadro de status) e 13 (Histórico do documento).

---

## 0. Como usar este documento

### 0.1 Ordem de leitura obrigatória
1. Este documento inteiro, uma vez.
2. No repositório, nesta ordem: `docs/decisoes/erp-pdv.md`, `docs/decisoes/matriz-acesso.md`, `docs/decisoes/autenticacao-sessao-rbac.md`, `docs/bd/modelo-erp-pdv.md`, `docs/plano-testes.md`, `config/openapi/target-loja-gestao-openapi-2026-10-14-v4.json`.
3. O código dos pacotes `api/sales` e `api/customers`, que são o padrão a seguir (seção 3).

### 0.2 Precedência (em conflito, vale a primeira)
1. Invariantes (seção 5).
2. Contrato v4 e decisões publicadas no repositório (`docs/decisoes/*`, `docs/bd/*`).
3. Este documento.
4. `SBI-EXECUCAO.md`, `SBI-PROMPT-ERP-PDV.md`, `SBI-NOITE-2026-10-14.md`, só como contexto.

Todo conflito encontrado é registrado como ocorrência (seção 10).

### 0.3 Como descobrir o estado real
O estado da seção 2 é uma fotografia de 14/10, 05h15. Antes de trabalhar, recalcule-o assim:
- `git fetch origin --prune` e `git log --oneline` das branches da pilha (seção 2.2);
- `x-status` de cada operação no contrato v4 da branch mais alta da pilha (`implemented` = entregue com teste);
- `gh pr list --state all` para saber o que já foi integrado;
- seção 12 deste documento e o último registro da seção 10.

Se o recalculado divergir da fotografia, vale o recalculado. Atualize a seção 12.

---

## 1. Objetivo e contexto

- **Produto:** SBI (Super Business Intelligence), sistema de loja com gestão (gerente) e venda no balcão (vendedor), sobre uma API REST Spring Boot, PostgreSQL e frontend Next.js.
- **Finalidade acadêmica:** projeto A3 de Garantia da Qualidade de Software e Banco de Dados (UNIFG). O tema é conformidade de contrato da API REST: o que o OpenAPI promete precisa ser o que a API entrega, com Bean Validation, formato único de erro e DTOs coerentes. A disciplina de Banco de Dados exige banco funcional, SQL, CRUD, views, RBAC e testes.
- **Equipe:** Matheus Siqueira, Gabriel Sousa (lidera), Allan Barros, Francisco Ferreira. A `main` só recebe código revisado por outro integrante.
- **Prazo interno de entrega:** 29/11/2026. A semana de provas A1 (19 a 24/10) tem baixa capacidade.
- **Repositório:** `matheussiqueira-dev/Conformidade-de-Contrato-da-API-REST`. Clone principal em `A3\order-management-api`; worktree de trabalho da pilha ERP/PDV em `A3\noite`.

### 1.1 Módulos do produto
| Módulo | Requisitos | Quem usa |
| --- | --- | --- |
| Identidade e acesso (login, sessão, hierarquia, bloqueio) | RF-01, RF-02, RF-17, RF-18 | todos |
| PDV (catálogo, cotação, venda, pagamento, cancelamento) | RF-06, RF-07, RF-13, RF-15, RF-19 | VENDEDOR e GERENTE |
| Clientes (cadastro, perfil, histórico) | RF-03, RF-20, RF-21 | VENDEDOR e GERENTE |
| Backoffice (produtos, insumos, categorias, estoque, movimentos) | RF-04, RF-14, RF-22 | GERENTE |
| Faturamento, metas, desempenho, promoções, análises | RF-09 a RF-12, RF-23 | GERENTE (Meu desempenho: VENDEDOR) |

---

## 2. Estado em 14/10/2026, 05h15

### 2.1 Na `main` (`d2fe3c7`)
- Fase 0 integrada: credenciais por variável de ambiente, correções de pagamento e de pedido, dinheiro em NUMERIC(12,2) (V4), planos de qualidade.
- ETAPA 1 publicada: modelo de dados, matriz de acesso, contrato v4 (rascunho), decisões DEC/REC/C/B/N/A2A.

### 2.2 Pilha de branches (nada integrado à `main` ainda)
| Etapa | Branch | PR | Base | Situação |
| --- | --- | --- | --- | --- |
| 2A Banco | `feat/db-v5-v6` | #13 | `main` | Concluída. V5, V6, seed demo V6_1/V6_2, Flyway + validate em todos os perfis, job `bd` (51 PASS). CI verde. Aguarda revisão humana. |
| 2B Segurança | `feat/security-error-contract` | #14 | `feat/db-v5-v6` | Concluída. Códigos de erro, hierarquia, bloqueio, matriz executável (221 casos). 452 testes verdes. CI verde. Aguarda revisão. |
| 2C Endpoints | `feat/business-endpoints` | (sem PR) | `feat/security-error-contract` | Em andamento. PDV (7 operações) e clientes (6 operações) `implemented` com testes. Último commit conhecido: `196c680`. Falta o resto (seção 6.1). |
| 3 Frontend | `feat/web-sbi` | — | `feat/business-endpoints` | Não iniciada. |
| 4 Testes e CI | `ci/full-pipeline` | — | `feat/web-sbi` | Não iniciada. |
| 5 Documentação e entrega | `docs/final-delivery` | — | `ci/full-pipeline` | Não iniciada. |

### 2.3 Operações do contrato v4
- **`implemented` (13):** GET `/sales/catalog`; POST `/sales/quote`; POST e GET `/sales/orders`; GET `/sales/orders/{id}`; POST `/sales/orders/{id}/payment`; POST `/orders/{id}/cancel`; GET e POST `/customers`; GET, PUT e DELETE `/customers/{id}`; GET `/customers/{id}/orders`.
- **`planned` (33):**
  - auth: login, csrf, logout, me (já funcionam; viram `implemented` com a verificação ao vivo, D-NOITE-06);
  - `/performance/me`, `/goals/monthly` (GET e PUT), `/management/summary`, `/management/revenue`;
  - `/payment/{id}/refund`;
  - `/promotions/active`, `/promotions` (GET e POST), `/promotions/{id}/close`;
  - `/products` (GET, POST), `/products/{id}` (GET, PUT, DELETE), `/products/{id}/price`, `/products/{id}/status`, `/products/{id}/price-history`;
  - `/categories` (GET, POST), `/categories/{id}` (PUT);
  - `/stock/products`, `/stock/products/{id}/entries`, `/stock/products/{id}/adjustments`, `/stock/products/{id}/min-level`, `/stock/movements`;
  - `/analytics/sales`, `/analytics/stock`.

### 2.4 Decisões da execução noturna já tomadas (em `SBI-NOITE-2026-10-14.md`, seção 4)
D-NOITE-01 a 11, entre elas:
- `StoreTime` com Clock em America/Fortaleza;
- documento só com dígitos na entidade e validação nos serviços;
- `BusinessTables.NAMES` para a limpeza entre testes;
- job `bd` com o jar em perfil demo;
- `/error` direto responde 404;
- PUT de cliente: campo ausente mantém o valor;
- `accept-float-as-int=false`.

Respeite todas. As que ainda não estiverem em `docs/decisoes/erp-pdv.md` entram lá na seção "Decisões da execução noturna" durante a 2C.

---

## 3. Arquitetura e padrões do código (siga o que já existe)

### 3.1 Stack
- **Backend:** Java 25, Spring Boot 4.1, Spring Security 7 (sessão + CSRF), Spring Data JPA (legado) e `JdbcClient` (módulos novos), Springdoc, Flyway, PostgreSQL (CI com 18, pacote validado em 16).
- **Testes:** JUnit 5, Mockito, AssertJ, MockMvc, spring-security-test. Integração no PostgreSQL descartável do `docker-compose.test.yml` (porta 15432), perfil `integration`, sem Testcontainers.
- **Contrato:** Ajv 8 em `scripts/audit-contract.mjs` e `scripts/validate-contract.mjs` (estáticos), `scripts/http-contract.mjs` e `scripts/http-session.mjs` (HTTP ao vivo pelo `scripts/test-contract.ps1`).
- **Frontend:** Next.js 16.3.8, React 19.3, JavaScript (vai para TypeScript na etapa 3), Playwright 1.63.

### 3.2 Padrão dos módulos novos (`src/main/java/com/swee/ordermanagementspring/api/<modulo>/`)
| Arquivo | Papel | Exemplo |
| --- | --- | --- |
| `<Modulo>Controller.java` | Controller fino: validação de parâmetros (`@Valid`, `@Min`, `@Size`), `@AuthenticationPrincipal AppPrincipal`, mapeia para o serviço | `SalesController` |
| `<Modulo>Service.java` | Casos de uso; `@PreAuthorize` (segunda barreira); `@Transactional`; dono do dado via `CurrentUser.owns` (terceira barreira); `DbSessionContext.apply` no início de toda escrita; `AuditService` quando a decisão pedir | `SalesService` |
| `<Modulo>Repository.java` | SQL explícito com `JdbcClient` e `record`; nunca devolve custo para o VENDEDOR; datas com `StoreTime.ZONE` | `SalesRepository` |
| `<Modulo>Dtos.java` | `record`s de requisição e resposta com Bean Validation; polimorfismo com `sealed interface` + `@JsonTypeInfo` | `SalesDtos`, `CustomerDtos` |
| `api/common/*` | `PageResponse`, `MoneyDto`, `Refs` (UserRef etc.), `Addresses`, `CurrentUser`, `DbSessionContext` | reutilize, não duplique |

Regras do padrão:
- views do V6 são lidas por `JdbcClient` com `record` (B-09), nunca como entidade JPA;
- erros saem por exceções mapeadas no `GlobalExceptionHandler` com `code` (ver `ErrorResponse`); não monte JSON de erro à mão;
- a regra de URL nova entra na `SecurityFilterChain` e na `access-matrix.csv` no mesmo commit; o `AccessMatrixTest` falha se faltar;
- toda operação do v4 só vira `x-status: implemented` quando tem teste verde (C-02); rode `node scripts/audit-contract.mjs` depois de mudar.

### 3.3 Testes (padrão)
- `api/<modulo>/<Modulo>ApiTest.java`: integração MockMvc no perfil `integration`, com limpeza por `BusinessTables.NAMES` e fixtures em `support/` (ex.: `PdvFixtures`).
- Unitários puros para cálculo e regra (ex.: `PricingTest`, `RequestHashTest`, `DocumentFormatTest`).
- Concorrência com `ExecutorService` + `CountDownLatch` (ex.: `SalesConcurrencyTest`).
- Cada teste cita no nome ou no `@DisplayName` o ID do `docs/plano-testes.md` (CT-...).

---

## 4. Regras de trabalho

### 4.1 Modo
- Execução contínua: não faça perguntas e não espere aprovação. Diante de ambiguidade, erro de dependência ou bloqueio, aplique a seção 4.2, registre e siga.
- Não invente resultados. Todo "passou" tem comando executado e saída real resumida no registro.

### 4.2 Decisão autônoma
| Situação | Ação |
| --- | --- |
| Especificação ambígua ou omissa | Coerência com o v4, opção mais restritiva em segurança, menor mudança. Registre como `D-EXEC-nn` em `docs/decisoes/erp-pdv.md` (seção "Decisões da execução") e no registro. |
| Teste falhando | Até 3 ciclos de causa raiz e correção. Nunca apague, desative ou afrouxe teste. Persistindo: commit, teste continua vermelho, entra em "Testes vermelhos herdados" com causa provável, e você segue. |
| Dependência ou versão ausente | Última estável verificada (`npm view`, Maven Central), versão exata, registro em `docs/decisoes/stack.md`. |
| Docker parado | Tente abrir o Docker Desktop uma vez e espere 3 min. Sem Docker: unitários locais, push e CI (`gh run watch`, máximo 30 min). |
| CI ou GitHub fora do ar | Continue localmente e registre a CI como pendente. |
| Precisaria editar migração já publicada (`main` ou PR aberto) | Crie a próxima versão (`V7`, `V8`...). |
| Conflito entre branches da pilha | `git merge` da branch-pai na filha, sem rebase; resolva e rode os testes da área. |
| Sessão reiniciada | Recalcule o estado (seção 0.3) e siga do primeiro item não concluído da seção 12. |

### 4.3 Ações proibidas (registre em "Aprovações pendentes" e siga)
- merge, squash ou push na `main`; `push --force`; rebase, `reset --hard` ou amend de commit já enviado; `git clean`; apagar branch; fechar, reabrir ou aprovar PR; alterar configurações ou segredos do repositório;
- editar migração publicada;
- mexer no banco de desenvolvimento `postgres-order` (só o descartável da porta 15432 pode ser criado e destruído);
- alterar arquivos fora do repositório, exceto: as seções 12 e 13 deste documento, o registro da seção 10 e a lista de extensões de `A3\tmp\scan_ai.py`;
- instalar software global (exceto abrir o Docker Desktop); versionar senha ou token; comentar em PR ou issue de outras pessoas.

### 4.4 Commits e PRs
- **Commit:** Conventional Commits, em inglês, uma linha, sem corpo nem rodapé, sem trailers de coautoria. Commits pequenos, um por operação ou tela concluída, com push normal logo depois.
- **Antes de cada commit:** revise `git diff --staged` e rode `python ..\tmp\scan_ai.py <pasta alterada>` depois do `git add`, com resultado vazio (o caminho é relativo à worktree `A3\noite`).
- **PR:** `gh pr create --base <branch-pai>`, título em Conventional Commits, descrição técnica (o que mudou, como testar, limites, testes vermelhos herdados, decisões `D-EXEC`). Use `--draft` se a CI estiver vermelha ou o corte mínimo não tiver sido atingido. Nunca integre.
- **Higiene:** nenhuma atribuição, assinatura, marca, rodapé, comentário, metadado ou referência a assistentes, automação ou ferramenta externa em código, docs, commits, PRs ou mensagens de terminal. Todo código e documento é trabalho técnico do desenvolvedor responsável.

---

## 5. Invariantes (valem acima de qualquer outra fonte)
1. Preço, desconto e total calculados só no servidor. Propriedade desconhecida no corpo responde 400. O vendedor do pedido é o usuário da sessão.
2. Estoque:
   - reserva por `UPDATE` condicional (`on_hand - reserved >= q`);
   - saída só na confirmação do pagamento;
   - toda atualização de vários produtos em ordem crescente de `product_id`;
   - CHECKs do banco como última barreira; violação responde 409, nunca 500; o estoque nunca fica negativo.
3. Idempotência por (`seller_id`, `client_request_id`) com `request_hash`. A chave de um vendedor nunca devolve o pedido de outro.
4. Hierarquia GERENTE > VENDEDOR nas regras de URL e de método, com três barreiras. Objeto de outro dono responde 404. A matriz executável cobre todas as rotas.
5. Sessão + CSRF. Bloqueio após 5 falhas por 15 min, com resposta igual e BCrypt executado nos quatro casos.
6. Flyway como única fonte do esquema; `ddl-auto=validate` em todos os perfis; nenhum `create-drop`.
7. Nenhum fluxo grava número completo de cartão (D022).
8. Formato único de erro (`ErrorResponse` com `code`); entrada inválida nunca responde 500.
9. Dinheiro em `BigDecimal`/NUMERIC(12,2) com HALF_UP; `Money {amount, currency: "BRL"}` no contrato (C-05).
10. VENDEDOR nunca recebe custo, margem, saldo físico ou realizado de colegas (DOM-03).

---

## 6. Pacotes de trabalho

Cada pacote traz: escopo, regras, arquivos sugeridos, testes e "pronto quando". Os schemas exatos estão no v4; em divergência com este texto, vale o v4 e a ocorrência é registrada.

### 6.1 ETAPA 2C — Endpoints (branch `feat/business-endpoints`, worktree `A3\noite`)

**WP-2C.3 Catálogo: produtos e categorias** (`api/backoffice/catalog`)
- **Operações:**
  - GET `/products` (filtros `q`, `sellable`, `active`, paginação C-18);
  - POST `/products`;
  - GET, PUT e DELETE `/products/{id}`;
  - PATCH `/products/{id}/price` {newPrice, reason 5..200};
  - PATCH `/products/{id}/status` {active};
  - GET `/products/{id}/price-history`;
  - GET e POST `/categories`; PUT `/categories/{id}`.
- **Regras:**
  - tipo PHYSICAL/DIGITAL em `oneOf` (C-17);
  - preço só por PATCH `/price`, situação só por PATCH `/status`;
  - SKU editável no PUT, gravado em maiúsculas; SKU ou nome de categoria duplicado responde 409 `STATE_CONFLICT` (C-16);
  - DELETE de produto já vendido responde 409 `RESOURCE_IN_USE` (inativar em vez de apagar);
  - PATCH de preço chama `DbSessionContext.apply(user, reason)` antes do `UPDATE`, e o gatilho da V5 grava o histórico com autor e motivo;
  - `sellable=false` = insumo (DEC-ERP-03).
- **Testes:** CT-SALE-104 (preço alterado não muda o item vendido), duplicidade de SKU, DELETE com venda, VENDEDOR 403 (matriz), histórico com autor e motivo (equivalente a RG-03), validação de `oneOf`.
- **Pronto quando:** as 11 operações estão `implemented` com teste verde.

**WP-2C.4 Estoque** (`api/backoffice/stock`)
- **Operações:**
  - GET `/stock/products` (filtros `q`, `belowMin`, `sellable`; `StockProduct` paginado conforme REC-b);
  - POST `/stock/products/{id}/entries`;
  - POST `/stock/products/{id}/adjustments`;
  - PATCH `/stock/products/{id}/min-level`;
  - GET `/stock/movements` (filtros `productId`, `kind`, `from`, `to`; índice B-07).
- **Regras:**
  - na entrada, o gatilho da V5 atualiza saldo e custo médio ponderado, e a API não recalcula;
  - `salePrice` opcional na entrada: se informado e diferente, altera o preço com histórico e motivo "Entrada de estoque" (REC-a);
  - ajuste OUT exige disponível ≥ quantidade, senão 409 `STOCK_INSUFFICIENT`;
  - ajuste IN só aceita o motivo `INVENTARIO` (C-15) e não altera o custo médio;
  - motivo obrigatório; ajuste grava `audit_event` `STOCK_ADJUSTED`;
  - autor via `DbSessionContext` e `created_by` preenchido pela sessão (nunca NULL explícito).
- **Testes:** CT-STOCK-108, CT-STOCK-109 (pela API: 409, nunca 500), entrada recalcula custo médio (equivalente a RG-05 e BD-18), movimentos filtrados e paginados, VENDEDOR 403.
- **Pronto quando:** as 5 operações estão `implemented`.

**WP-2C.5 Faturamento** (`api/management`)
- **Operação:** GET `/management/revenue?period=TODAY|D7|D30|D90`, que responde `RevenueReport` com:
  - período, faturamento bruto, estornos e líquido;
  - pedidos pagos, unidades vendidas, ticket médio;
  - lucro bruto e margem; cobertura de custo;
  - série diária; quebra por forma de pagamento, por vendedor e por produto (top produtos);
  - contagem de estoque abaixo do mínimo; pendentes (quantidade e valor); `generatedAt`.
- **Regras:**
  - lê `v_faturamento_diario` e as demais views do V6 (B-09);
  - períodos são datas fechadas em America/Fortaleza (C-21);
  - lucro = líquido − custo conhecido; fica nulo se algum item vendido no período não tiver custo; margem = lucro ÷ líquido (C-20);
  - pedido pendente não entra no realizado; estorno conta no mês do estorno.
- **Testes:** valores conferidos contra o seed demo, com os números das views (os mesmos dos testes BD-01 a BD-05 e BD-22), lucro nulo quando falta custo, período vazio sem número fictício.
- **Pronto quando:** a operação está `implemented`.

**WP-2C.6 Correção do D022 (cartão no `/payment` legado)**
- O serviço legado passa a gravar só os 4 últimos dígitos (coluna `card_last4`, B-05) e nunca o número completo.
- Migração nova `V7__mask_card_numbers.sql` mascara os dados existentes, sem editar a V5.
- Testes: a resposta e o banco não contêm o número completo; o contrato do baseline legado continua passando.
- Atualize `docs/defeitos.md` (D022 corrigido, com evidência).

**WP-2C.7 Demais endpoints do roteiro**
- GET `/performance/me`:
  - fonte: `v_meu_desempenho`;
  - meta zero exibe "Sem meta", sem porcentagem (DOM-08);
  - VENDEDOR vê só os próprios dados (CA-11-02).
- GET e PUT `/goals/monthly`:
  - a soma da distribuição tem de ser igual à meta da loja;
  - o serviço valida antes do banco (400 `VALIDATION_FAILED`); o gatilho adiado da V5 é a última barreira;
  - só VENDEDOR recebe meta individual.
- GET `/management/summary`: metas da loja e da equipe, fechado e sem `stockAlerts` (REC-e).
- POST `/payment/{id}/refund`:
  - responde 201 `RefundResponse` (C-07), estorno parcial ou total;
  - pagamento não aprovado responde 409;
  - valor acima do saldo estornável responde 400;
  - realizado no mês do estorno.
- Promoções:
  - GET e POST `/promotions`; POST `/promotions/{id}/close`; GET `/promotions/active?productId=`;
  - tipo PERCENT 1..100 ou AMOUNT; fim > início; escopo por produto, categoria ou nenhum;
  - `activePromotion` = maior desconto para uma unidade, empate fica com o menor id (C-09);
  - promoção inválida ou vencida no pedido responde 409 (C-08).
- GET `/analytics/sales?month=YYYY-MM` e GET `/analytics/stock`: views `v_evolucao_semanal_loja`, `v_vendas_forma_pagamento`, `v_margem_produto`, `v_uso_promocoes`, `v_posicao_estoque`, `v_alerta_estoque`.
- **Testes:** CA-09-01, CA-09-02, CA-10-01 a CA-10-03, CA-11-01, CA-11-02 e CA-12-01, CA-12-02 (`docs/criterios-aceitacao.md`), estorno (BD-22, BD-23), promoção fora do escopo (BD-27).

**WP-2C.8 Verificação ao vivo do contrato**
- Crie `scripts/live-contract.mjs`, ou evolua `http-contract.mjs`:
  - compare `/v3/api-docs` com o v4 em toda operação `implemented` (caminho, método, parâmetros, schemas de requisição e resposta, inclusive erros);
  - valide respostas reais com Ajv.
- Ligue o script ao `scripts/test-contract.ps1` e ao passo de contrato da `ci.yml`.
- Depois disso, as operações de auth passam a `implemented` (D-NOITE-06).
- **Testes:** CT-CONTRACT-102.
- **Pronto quando:** a divergência é zero nas operações `implemented`.

**WP-2C.9 Fechamento da 2C**
- Rode `.\mvnw.cmd -q verify`, `scripts\test.ps1 -Mode Integration`, `scripts\test-contract.ps1` e `npm test`.
- Atualize `docs/decisoes/erp-pdv.md` (decisões `D-NOITE` e `D-EXEC`), `docs/plano-testes.md` (situação dos CT) e `docs/defeitos.md`.
- Abra o PR com `gh pr create --base feat/security-error-contract`.

- **Corte mínimo da 2C:** WP-2C.3, 2C.4 e 2C.6 prontos, mais o que já existe.
- **Corte completo:** WP-2C.3 a 2C.9.

### 6.2 ETAPA 3 — Frontend (branch `feat/web-sbi` a partir de `feat/business-endpoints`)

**WP-3.1 TypeScript**
- Converta `frontend/` para TypeScript estrito (`strict`, `noUncheckedIndexedAccess`) e mantenha os testes `node --test` e Playwright.
- Dependências novas com versão exata, verificada com `npm view`, registradas em `docs/decisoes/stack.md`: `typescript`, `@types/react`, `@types/node`, `zod` 4.x, `orval` (dev), `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `@axe-core/playwright`.

**WP-3.2 Contrato para código**
- `orval` lê o v4 e gera schemas Zod em `frontend/lib/api/generated/` (`client: 'zod'`, `version: 4` fixo).
- Script `api:generate`; na CI, gera e roda `git diff --exit-code`.
- Os formulários usam esses schemas; as respostas passam por `safeParse` em desenvolvimento e teste.

**WP-3.3 Cliente HTTP único** (`lib/api/http.ts`, evolução de `lib/auth-client.mjs`)
- Mesma origem via rewrite `/api/backend/:path*` → `BACKEND_ORIGIN`.
- CSRF em toda mutação; `Idempotency-Key` no POST `/sales/orders`.
- `ErrorResponse.code` vira mensagem pt-BR, sem código HTTP na tela.
- 401 → `/entrar?next=...`; 403 → "Sem acesso a esta área".

**WP-3.4 Layout, menu e guarda**
- `frontend/proxy.ts` (Next.js 16) redireciona para `/entrar` quando não há cookie de sessão. O matcher exclui `/entrar`, `/api/backend`, `_next` e estáticos.
- Layout de servidor por área chama `/auth/me` repassando o cookie e redireciona quem não tem a área.
- Menu montado a partir de `areas`, só com telas existentes. A API continua sendo a autoridade.

**WP-3.5 `/vender`** (pensada para teclado; barra de 3 etapas com `aria-current="step"`)
1. **Itens:**
   - foco na busca ao abrir e com "/"; leitor de código de barras (SKU + Enter) adiciona direto quando há correspondência exata;
   - setas navegam os resultados; Enter adiciona;
   - botões − e + de 44 px, limitados ao disponível;
   - o total vem de POST `/sales/quote` com debounce de 300 ms; a promoção vem pré-preenchida pelo `activePromotion` (C-08).
2. **Cliente e pagamento:**
   - busca por CPF/CNPJ ou nome, com "Cadastrar cliente" em painel lateral;
   - controle segmentado Pix · Cartão (4 últimos dígitos, parcelas, autorização) · Boleto;
   - retirada ou entrega (endereço só na entrega);
   - "Finalizar venda" chama POST `/sales/orders` e fica desabilitado durante o envio.
3. **Confirmação:**
   - Pix e Cartão: "Confirmar pagamento recebido" chama POST `/sales/orders/{id}/payment`;
   - Boleto: o pedido fica aguardando, e a confirmação acontece em `/vendas/[id]`;
   - "Cancelar venda" disponível enquanto o pedido está pendente.

- Carrinho e `Idempotency-Key` (`crypto.randomUUID()`) ficam juntos em `sessionStorage` por usuário, com `try/catch`, e só são apagados depois de 201/200.
- Em 409 `STOCK_INSUFFICIENT`: preserve o carrinho, recarregue a disponibilidade e mostre "Estoque insuficiente: restam N unidades de X."

**WP-3.6 `/vendas` e `/vendas/[id]`**
- Lista com filtro de status: o VENDEDOR vê as dele, o GERENTE vê todas.
- Detalhe com itens, pagamento, "Confirmar pagamento recebido" e "Cancelar venda".
- Pedido de outro vendedor mostra "Pedido não encontrado".

**WP-3.7 `/clientes` e `/clientes/[id]`**
- Busca, paginação e cadastro (PF/PJ).
- Perfil com documento mascarado para o VENDEDOR e edição sem documento, com `version` (conflito vira mensagem "Os dados mudaram; recarregue").
- Histórico paginado com itens; total, vendedor e link só nos pedidos próprios ou para o GERENTE (DEC-ERP-02).

**WP-3.8 `/gestao` (visão geral e faturamento)**
- **Estrutura do painel de referência** `https://sbi-app-alpha.vercel.app`:
  - breadcrumb; título e subtítulo;
  - seletor Hoje · 7 · 30 · 90 dias;
  - 4 indicadores: faturamento líquido, lucro bruto, margem bruta, pedidos pagos;
  - linha de faturamento × lucro bruto por dia;
  - participação por forma de pagamento, no lugar de canal;
  - ranking de vendedores; produtos com busca; alerta de estoque abaixo do mínimo; meta do mês.
- **Comportamento:**
  - "Atualizado às HH:MM:SS"; `refetchInterval` de 15 s só com a aba visível;
  - erro nunca vira zero;
  - lucro e margem mostram "—" com nota quando falta custo.

**WP-3.9 `/gestao/estoque`**
- Posição: saldo, reservado, disponível, mínimo, custo médio.
- Contador "N abaixo do mínimo" no título.
- Entrada e ajuste em painel lateral; extrato de movimentos com filtros.

**WP-3.10 `/gestao/produtos`**
- Tabela com filtro Produtos · Insumos; criar e editar em painel lateral.
- Preço com motivo e histórico; ativar e inativar; categorias.

**WP-3.11 Demais telas:** `/gestao/promocoes`, `/gestao/analises` (gráficos das views), `/meu-desempenho` (meta como linha âmbar tracejada e nomeada).

**WP-3.12 Design SBI v1.1 e acessibilidade**
- **Tipografia:** IBM Plex Sans (títulos 600, `letter-spacing: -0.01em`, números `tabular-nums`). Plex Mono só em SKU e número de pedido. Space Grotesk só no logo.
- **Superfícies:** cartões sem borda, brancos sobre `#F5F6F9`, raio 18 px, espaços de 32 e 48 px.
- **Cores:**
  - índigo `#3D4ED6` só na ação principal e no item ativo do menu;
  - texto `#141B26`, secundário `#556070`, borda de campo `#8A93A3`;
  - estados com fundo claro, só para exceções: sucesso `#14684F/#E3F6EF`, atenção `#8A4C00/#FFF6E5`, erro `#B42318/#FDECEA`;
  - dados `#3D4ED6`, `#138A8A`, `#B26400`, `#8A4FB0`.
- **Voz:** verbo no botão, nada de código HTTP na tela, sem emoji.
- **WCAG 2.2 AA:**
  - contraste e foco visível;
  - alvos ≥ 44 px;
  - `label` em todo campo e `th scope` em tabelas;
  - sem rolagem horizontal em 320 px.
- **Marca:** logo e favicon de `docs/marca/`, se existirem; senão, um wordmark textual "SBI" em Plex Sans 600.

- **Testes:** testes de lógica com `node --test` e CT-WEB-101 a 104.
- **Corte mínimo da etapa 3:** WP-3.1 a 3.5 e 3.7.
- **Corte completo:** WP-3.1 a 3.12.

### 6.3 ETAPA 4 — Testes e CI (branch `ci/full-pipeline` a partir de `feat/web-sbi`)
- **WP-4.1:** complete os CT do `docs/plano-testes.md` que ainda faltarem (verifique um a um e marque a situação no próprio plano).
- **WP-4.2:** e2e Playwright CT-WEB-101 a 109, inclusive axe-core sem violações WCAG 2.2 AA em todas as rotas e para os dois papéis.
- **WP-4.3:** CI com os jobs `test` (backend), `bd`, `contract` (auditoria estática + verificação ao vivo) e `frontend` (build, unit, `api:generate` sem diff, e2e + axe). Relatórios como artefatos.
- **WP-4.4:** métricas R1 com `scripts/quality-metrics.mjs` (JaCoCo, PMD, CPD, SpotBugs) em `reports/metricas/r1/`, comparadas ao R0, sem meta inventada; metas só propostas em `docs/decisoes/`.
- **WP-4.5:** rastreabilidade RF → CA → CT → evidência (arquivo de teste, execução da CI) em `docs/rastreabilidade.md`.
- **Corte mínimo:** WP-4.3 e 4.5.

### 6.4 ETAPA 5 — Documentação e entrega (branch `docs/final-delivery` a partir de `ci/full-pipeline`)
- **WP-5.1 README:**
  - como subir tudo com Docker em um comando;
  - perfis (padrão, `integration`, `demo`, `contract`);
  - contas demo pela variável `SBI_DEMO_PASSWORD`;
  - comandos de teste.
- **WP-5.2** `docs/arquitetura.md`: diagrama de componentes (Mermaid), camadas, fluxo de venda, segurança em três barreiras, matriz de acesso resumida.
- **WP-5.3** `docs/roteiro-demonstracao.md`: roteiro de 10 minutos, nesta ordem:
  1. login do vendedor;
  2. venda com Pix;
  3. tentativa de acesso indevido (403/404);
  4. login do gerente e baixa no estoque;
  5. faturamento;
  6. preço com motivo;
  7. contrato ao vivo sem divergência;
  8. job `bd` com 51 PASS.
- **WP-5.4** `docs/relatorio-final.md`: números reais das execuções (testes, CI, métricas R0 × R1, defeitos encontrados e corrigidos).
- **WP-5.5:** checagem final da definição de pronto da seção 6.5.

### 6.5 Definição de pronto do projeto (29/11)
- [ ] CI verde na `main` com os jobs `test`, `bd`, `contract` e `frontend`.
- [ ] Nenhum `@Tag("known-defect")` e nenhum `@Disabled` sem ID de defeito.
- [ ] Contrato v4 com todas as operações `implemented` e sem divergência ao vivo.
- [ ] Métricas R1 publicadas ao lado do R0.
- [ ] Rastreabilidade RF → CA → CT → evidência.
- [ ] Ambiente de demonstração sobe com um comando, com contas via variável de ambiente.
- [ ] Roteiro de demonstração ensaiado.
- [ ] Varredura de termos de ferramenta ou de assistente sem resultado no repositório.

---

## 7. Integração (feita por pessoas, não pelo agente)
1. Revise e integre por Squash and merge, na ordem da pilha: #13 → #14 → PR da 2C → PR da 3 → PR da 4 → PR da 5.
2. Depois de cada squash, no PR seguinte:
   - `gh pr edit <n> --base main`;
   - `git merge origin/main` na branch dele (sem rebase);
   - espere a CI.
3. Aprovações pendentes registradas pelo agente (seção 10) são decididas aqui. Exemplo: recriar o `postgres-order` de desenvolvimento (A2A-2) com `pg_dump` antes.

---

## 8. Comandos (Windows, a partir de `A3\noite`)
```
git fetch origin --prune
.\mvnw.cmd -q verify
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test.ps1 -Mode Integration
.\mvnw.cmd -Pintegration test -Dtest=NomeDoTeste
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-contract.ps1
node scripts\audit-contract.mjs
npm test
cd frontend; npm test; npm run build; npx playwright test
docker compose -f docker-compose.test.yml up -d    (só o descartável)
gh run list --branch <branch> --limit 3; gh run watch <id> --exit-status
gh pr create --base <branch-pai> --title "<conventional commit>" --body-file <arquivo>
python ..\tmp\scan_ai.py <pasta>
```
`scan_ai.py` ignora `.js`, `.jsx`, `.cjs`, `.css` e `.html`. Na etapa 3, acrescente essas extensões à lista do script.

---

## 9. Riscos conhecidos
- Pilha longa: um problema estrutural na 2A ou na 2B se propaga para cima. Se aparecer, corrija na branch de origem e propague com `git merge` para as filhas.
- Sessões interrompidas por limite de uso ou de contexto (aconteceu às 03:00). Faça commit e push a cada operação concluída e mantenha o registro atualizado.
- Política local de permissões pode negar `gh`, `docker` ou acesso fora da worktree: registre e use uma alternativa.
- Prazo: etapas 3 a 5 coincidem com a semana de provas A1. Os cortes mínimos garantem uma demonstração mesmo com escopo parcial.

---

## 10. Registro de execução
- **Arquivo:** `A3\SBI-REGISTRO-EXECUCAO.md`, cumulativo. Nunca é versionado. Crie-o se não existir.
- **Uma seção por sessão, com:**
  - início e fim;
  - estado recalculado no início;
  - linha do tempo (HH:MM, ação, comando, resultado);
  - decisões `D-EXEC-nn`;
  - ocorrências `O-nn`;
  - testes (comandos e contagens reais);
  - testes vermelhos herdados;
  - aprovações pendentes;
  - changelog (commits, `git diff --stat`, PRs);
  - próxima ação.
- **Frequência:** atualize depois de cada commit; é o ponto de retomada.
- **Ao fim de cada etapa:** acrescente uma linha na seção 9 de `A3\SBI-EXECUCAO.md`.

---

## 11. Encerramento de cada sessão
1. Rode a suíte da branch atual.
2. Faça commit e push.
3. Atualize a seção 12 deste documento e o registro.
4. Se uma etapa terminou, abra o PR dela.
5. Termine com um resumo:
   - o que foi entregue;
   - testes reais;
   - PRs;
   - pendências;
   - aprovações pendentes;
   - próximo pacote de trabalho.

---

## 12. Quadro de status (o agente atualiza)
Legenda: [x] pronto com teste verde · [~] parcial · [ ] não iniciado · [!] bloqueado (ver registro).

| Pacote | Situação | Branch / commit | Observação |
| --- | --- | --- | --- |
| 2A Banco | [x] | feat/db-v5-v6 · PR #13 | aguarda revisão |
| 2B Segurança | [x] | feat/security-error-contract · PR #14 | aguarda revisão |
| 2C.1 PDV | [x] | feat/business-endpoints · 664e7b1 | 7 operações |
| 2C.2 Clientes | [x] | feat/business-endpoints · 196c680 | 6 operações |
| 2C.3 Catálogo | [x] | feat/business-endpoints · f68136b | 11 operações; BackofficeApiTest verde |
| 2C.4 Estoque | [x] | feat/business-endpoints · f68136b | 5 operações; CT-STOCK-108 verde |
| 2C.5 Faturamento | [x] | feat/business-endpoints · bc58e2a | GET /management/revenue implemented; ManagementApiTest 4/4 |
| 2C.6 D022 | [x] | feat/business-endpoints · 9bcc6d3 | card_last4 + V7 (card_number nulo, CHECK); defeitos.md atualizado |
| 2C.7 Demais endpoints | [x] | feat/business-endpoints · c4bb2bc, 042b656, 49b1576 | 11 operações implemented (performance, goals 2, summary, refund, promotions 4, analytics 2) |
| 2C.8 Contrato ao vivo | [x] | feat/business-endpoints · b478ebf, 0c48a1a | live-contract.mjs: 45/45 operações, divergência zero; auth implemented; ligado ao test-contract.ps1 e à ci.yml |
| 2C.9 Fechamento e PR | [x] | feat/business-endpoints · b301da6 · PR #15 | verify 233/0; integração 541/0; contrato ao vivo 45/0; CI verde; base feat/security-error-contract |
| 3.1–3.12 Frontend | [x] | feat/web-sbi · 8ef24d3 · PR #16 | 14 rotas; npm test 20/20; Playwright 8/8 (CT-WEB-101..104, 109); CI verde; CT-WEB-105..108 na ETAPA 4 |
| 4.1–4.5 Testes e CI | [x] | ci/full-pipeline · 33d37cd · PR #17 | CI em 4 jobs verde (run 38545269733); 544 testes Java; Playwright 14/14; métricas R1; rastreabilidade |
| 5.1–5.5 Entrega | [x] | docs/final-delivery · e5e7f2f · PR #18 | demo em um comando verificado; README, arquitetura, roteiro, relatório; DoD: 5/8 itens, restam merge (CI na main), ensaio e decisão sobre 8 arquivos históricos |

---

## 13. Histórico do documento
- 14/10/2026, 07h05: quadro da seção 12 atualizado pela execução das etapas 2C a 5 (PRs #15 a #18); detalhes em `SBI-REGISTRO-EXECUCAO.md`.
- v3 (14/10/2026, 05h15): plano mestre único; estado após a noite (2A e 2B concluídas, 2C com PDV e clientes); pacotes de trabalho detalhados até a entrega; registro cumulativo.
- v2 (14/10/2026, 02h): execução noturna (`SBI-PROMPT-ERP-PDV.md`).
- v1 (14/10/2026, 00h): prompt por etapas (`SBI-PROMPT-ERP-PDV-v1.md`).
