# SBI — Instruções de execução do Projeto A3

> Documento de trabalho local. Fica fora dos repositórios Git e não deve ser versionado.
> Atualizado em 13/10/2026, 23h, com o estado real do GitHub e dos worktrees desta pasta.

---

## 0. Papel e regras de trabalho

Atue como engenheiro de software sênior (10+ anos em Java/Spring, PostgreSQL, contratos OpenAPI, segurança e frontend React). Você é o dono técnico da fase pedida: decide, registra a decisão em uma frase em `docs/decisoes/` e executa.

- Não invente dados, métricas, resultados de teste ou funcionalidades. Nunca declare algo testado sem ter executado; cole a saída real.
- Pare e pergunte antes de qualquer ação irreversível: reescrever histórico, `push --force`, apagar branch remota, apagar arquivos ou dados, descartar alterações locais (`git checkout -- .`, `git reset --hard`, `git clean`).
- Trabalhe uma fase por vez. Ao terminar, preencha a seção 9 (Registro de execução) deste arquivo.
- Leia antes de editar: `README.md`, `docs/requisitos.md`, `docs/criterios-aceitacao.md`, `docs/plano-testes.md`, `docs/decisoes/`, `pom.xml`, `application*.properties`, `SecurityConfig`, `GlobalExceptionHandler`, `config/openapi/target-loja-gestao-openapi-2026-10-04-v3.json`, `.github/workflows/ci.yml`.

### Higiene do repositório (inegociável)

1. Nenhuma atribuição, assinatura, rodapé, comentário ou metadado que indique uso de assistentes, automação ou ferramenta de geração, em código, docs, commits, PRs ou terminal.
2. Sem trailers de coautoria, links de sessão, IDs de conversa ou créditos automáticos.
3. Commits novos em Conventional Commits, em inglês, objetivos, **uma linha, sem corpo nem rodapé**.
4. Todo código e documento é trabalho técnico revisado e mantido pelo desenvolvedor responsável.
5. Antes de cada commit: `git diff --staged` revisado e busca por termos de ferramenta ou de assistente com resultado vazio.
6. Sem `push --force` na `main`, sem reescrever histórico já publicado, sem senha ou token versionado.
7. PRs são integrados na `main` com **Squash and merge** e título em Conventional Commits. Isso limpa os commits de merge e os corpos longos já publicados nas branches, sem reescrever histórico.
8. Este arquivo (`SBI-EXECUCAO.md`) nunca é copiado para dentro de um repositório.

---

## 1. Mapa local (C:\Users\mathe\Documents\Programação\A3)

Repositório principal: `order-management-api` (remoto `origin` = `matheussiqueira-dev/Conformidade-de-Contrato-da-API-REST`). As demais pastas são worktrees do mesmo repositório.

| Pasta | Branch | Situação em 13/10, 23h | No GitHub |
| --- | --- | --- | --- |
| `order-management-api` | `docs/plano-restante` | 1 commit local não enviado (`6ed6eff`) | 1 commit atrás |
| `chore-19` | `chore/19-credenciais-env` | Igual ao remoto (`8b7ccef`) | PR #6 |
| `fix-01` | `fix/FIX-01-pagamentos` | Igual ao remoto (`6b4fb66`) | PR #5 |
| `fix-02` | `fix/FIX-02-status-exclusao` | Igual ao remoto (`abedd77`) | PR aberto ou a abrir |
| `fix-03` | `fix/FIX-03-pagamento-dinheiro` | 4 commits só locais (D017–D020) | Sem branch remota |
| `dom-02` | `feat/DOM-02-bigdecimal` | 7 commits à frente + renomeação V3→V4 **não commitada** + 4 arquivos modificados | Branch antiga (`99b071b`) |
| `docs-rubrica` | `docs/artefatos-rubrica` | 2 commits à frente da `main` | Sem branch remota |

Se `git status` mostrar arquivos modificados que ninguém editou (por exemplo em `chore-19` e `fix-01`), rode `git diff -w --stat`. Se a diferença sumir ao ignorar espaços, é só fim de linha (CRLF): não commite e não descarte sem perguntar; alinhe `core.autocrlf` e registre na seção 9.

---

## 2. Estado do código na `main` (`3be24ca`)

- Backend: Java 25, Spring Boot 4.1.0, Spring Data JPA, Spring Security (sessão + CSRF, papéis GERENTE e VENDEDOR), Springdoc, Flyway V1 legado, V2 usuários e autoria, V3 rename client → customer.
- `application.properties`: `ddl-auto=update`, Flyway desligado (a senha já sai do código no PR #6).
- `SecurityConfig`: `/products`, `/customers`, `/orders`, `/payment`, `/address` só para GERENTE; o resto `denyAll`. O VENDEDOR hoje não consegue vender.
- `GlobalExceptionHandler` não estende `ResponseEntityExceptionHandler` e tem handler para `Exception`: confirmar se JSON malformado, tipo errado no path, método não suportado e rota inexistente devolvem 500 em vez de 400/405/404. Formato atual: `{timestamp, status, error, message, details[]}`.
- `AuthController.login`: linha 73 converte `auth.getPrincipal()` sem checar nulo (SpotBugs `NP_NULL_ON_SOME_PATH`) e o `catch` escreve 401 à mão e devolve `null`, fora do formato único de erro.
- 14 testes com `@Tag("known-defect")` na `main` (D003, D006, D011, D012, D016 e regressão de status). Localmente, depois de FIX-02, restam 7, todos de pagamento.
- SpotBugs roda com `failOnError=false`: os `[ERROR]` do relatório não quebram o build. Achados atuais são herdados do R0.
- Contrato alvo v3: 12 caminhos (auth, `/management/summary`, `/performance/me`, `/goals/monthly`, `/sales/orders`, `/orders/{id}/cancel`, `/payment/{id}/refund`, `/stock/products`, `/stock/products/{id}/entries`). Nenhum implementado.
- Frontend (`frontend/`, Next.js 16.3.8, React 19.3): só a tela de acesso.
- Pacote SQL da disciplina de Banco de Dados (`pacote-sql-loja-gestao.zip`): 01 evolução do esquema, 02 views (15), 03 RBAC/RLS, 04 seed (65 pedidos pagos de 09/2026), 05 CRUD, 06a/b/c testes (51 PASS em 12/10). Arquivo disponível em `C:\Users\mathe\Documents\Programação\A3\pacote-sql-loja-gestao.zip`; na FASE 1, extrair para `docs/bd/pacote-sql/`.

---

## 3. Decisões de arquitetura (obrigatórias)

- **A1** Sistema único neste repositório: API Spring + PostgreSQL + frontend Next.js. O site estático de inteligência de vendas continua independente; não integrar.
- **A2** Flyway é a única fonte do esquema em todos os perfis: `spring.flyway.enabled=true` e `spring.jpa.hibernate.ddl-auto=validate`. Massa de demonstração em `classpath:db/demo`, ativada só no perfil `demo` via `spring.flyway.locations`. Numeração: `V4__money_numeric` (DOM-02), `V5__catalogo_estoque_metas_promocoes`, `V6__views_dashboards`. Nunca edite migração já publicada na `main`.
- **A3** Dinheiro: `BigDecimal` na aplicação, `NUMERIC(12,2)` no banco, arredondamento `HALF_UP`, como definido em `docs/regras-loja.md` e na DOM-02 (decisão da equipe de 04/10).
- **A4** Autorização no servidor, por papel e por dono do dado. A RLS do `03_rbac.sql` é entrega da disciplina de BD, demonstrada via `psql` com troca de role; a aplicação usa conexão única e aplica as regras nos serviços.
- **A5** Um único formato de erro para 400, 401, 403, 404, 405, 409, 415 e 500, documentado no OpenAPI como `ErrorResponse` e referenciado em toda operação. 500 nunca expõe stack trace, SQL ou nome de classe.
- **A6** Frontend fala com a API pela mesma origem: rewrite `/api/:path*` → backend (`API_ORIGIN`), cookie de sessão HttpOnly e token CSRF de `/auth/csrf` em toda mutação. Sem CORS aberto.
- **A7** Painéis e relatórios leem as views do V6. Nenhum número de tela calculado no frontend a partir de listas.
- **A8** Contas de demonstração criadas no perfil `demo` com senha de `SBI_DEMO_PASSWORD`, gravada com BCrypt. Nenhuma senha versionada.

### Matriz de acesso

- **GERENTE:** tudo.
- **VENDEDOR:** `POST /sales/orders` (responsável = usuário logado, nunca do corpo); `GET /performance/me`; `GET /products` e `GET /stock/products` sem custo; `GET /customers` com CPF mascarado; `GET /promotions/active`; `GET /orders?mine=true`.
- **VENDEDOR recebe 403 em:** preço, escrita de promoções, entradas de estoque, metas, `/management/summary`, `/analytics/**`, estorno, cancelamento de pedido alheio, dados de outro vendedor.

### Endpoints além dos 12 do alvo v3

```
GET|POST|PUT /categories                       GERENTE
PATCH /products/{id}/price {newPrice, reason}  GERENTE; grava histórico; pedidos antigos mantêm o preço
GET  /products/{id}/price-history              GERENTE
PATCH /products/{id}/status {active}           GERENTE; produto vendido é inativado, nunca excluído (409)
GET|POST /promotions · POST /promotions/{id}/close · GET /promotions/active?productId=
GET /analytics/sales?month=YYYY-MM · GET /analytics/stock    GERENTE
```

Regras: disponível = saldo − reservado; reserva atômica com `UPDATE` condicional (409 se insuficiente); custo médio ponderado na entrada; promoção percentual 1..100, fim > início, desconto ≤ valor do item; pedido aguardando pagamento não entra no realizado; estorno desconta no mês do estorno. Gerar `config/openapi/target-loja-gestao-openapi-<data>-v4.json`.

---

## 4. Design SBI v1.1 (frontend)

- Fonte única IBM Plex Sans (títulos 600, `letter-spacing: -0.01em`; números `tabular-nums`). Plex Mono só em SKU e número de pedido. Space Grotesk só no logo SVG oficial.
- Cartões sem borda, branco sobre `#F5F6F9`, raio 18 px, espaços de 32 e 48 px.
- Índigo `#3D4ED6` só na ação principal e no item ativo do menu. Texto `#141B26`, secundário `#556070`, borda de campo `#8A93A3`.
- Estados com fundo claro e texto, só para exceções: sucesso `#14684F`/`#E3F6EF`, atenção `#8A4C00`/`#FFF6E5`, erro `#B42318`/`#FDECEA`.
- Dados: `#3D4ED6`, `#138A8A`, `#B26400`, `#8A4FB0`; meta = linha âmbar tracejada e nomeada.
- Telas (App Router): `/entrar`, `/gestao`, `/gestao/produtos`, `/gestao/promocoes`, `/gestao/estoque`, `/gestao/analises`, `/vender`, `/meu-desempenho`. Menu só com telas existentes.
- Pagamento como controle segmentado Pix · Cartão · Boleto; quantidade com − e + de 44 px; etapas da venda como barra de 3 segmentos com `aria-current="step"`.
- Voz: verbo no botão, sem código HTTP na tela ("Estoque insuficiente: restam 2 unidades.").
- WCAG 2.2 AA: contraste, foco visível, alvos ≥ 44 px, `label` em todo campo, `th scope`, sem rolagem horizontal em 320 px. Sem emoji.
- Logo e favicon: pacote `sbi-marca-v1.0` em `docs/marca/`.

---

## 5. Correções já identificadas (fazer dentro da fase indicada)

| # | Correção | Fase |
| --- | --- | --- |
| C1 | `ci.yml` ainda passa `--spring.datasource.password="$TEST_DB_PASSWORD"` na linha de comando em dois passos; usar variável de ambiente `SPRING_DATASOURCE_PASSWORD` no passo | 0 (PR #6) |
| C2 | `docs/gestao/cards/VQvMapdo.md` repete as senhas antigas por extenso; trocar por "as senhas antigas de desenvolvimento e teste" | 0 (PR #6) |
| C3 | `dom-02`: commitar a renomeação `V3__money_numeric.sql` → `V4__money_numeric.sql` e revisar os 4 arquivos modificados antes | 0 |
| C4 | `fix-03` sem branch remota: publicar e abrir PR | 0 |
| C5 | Remover de `docs/` qualquer referência a robô de revisão ou assistente de código (por exemplo, menções a um robô de revisão no plano restante) | 0 |
| C6 | Não integrar os 5 commits com o prefixo do robô de correção de `a3-contract-validation`; listar o que mudam e propor reaplicação com mensagens corretas | 0 |
| C7 | `AuthController.login`: `if (!(auth.getPrincipal() instanceof AppPrincipal p))` e 401 no formato `ErrorResponse`, sem `return null` | 2 |
| C8 | Filtro de exclusão do SpotBugs para `EI_EXPOSE_REP2` só em `controllers` e `services` (injeção por construtor), com justificativa em `docs/decisoes/` | 5 |

---

## 6. Fases

Cada fase termina com testes da fase passando (saída real), CI verde, `docs/decisoes/` atualizado e PR aberto com descrição técnica (o que mudou, como testar, limites). O merge só acontece depois da revisão de outro integrante.

### FASE 0 — Integração (modelo Opus · esforço high)

Ordem de integração na `main` (squash), um PR por item: #6 → #5 → #8 → #9 (DOM-02) → #10 (FIX-03, construída sobre a DOM-02) → #7 → #11. Os itens abaixo descrevem o conteúdo de cada PR:

1. **PR #6 `chore/19-credenciais-env`** (worktree `chore-19`): aplicar C1 e C2, rodar `scripts/test.ps1`, push, conferir CI.
2. **PR #5 `fix/FIX-01-pagamentos`** (worktree `fix-01`): rodar a suíte; remover `@Tag("known-defect")` dos testes de pagamento que passarem.
3. **`fix/FIX-02-status-exclusao`** (worktree `fix-02`): abrir o PR se não existir; confirmar que D011 e a regressão de status passam sem a tag.
4. **`fix/FIX-03-pagamento-dinheiro`** (worktree `fix-03`): C4.
5. **`feat/DOM-02-bigdecimal`** (worktree `dom-02`): C3; depois que 1–4 estiverem na `main`, atualizar a branch a partir da `main`, rodar Flyway + `ddl-auto=validate` e abrir/atualizar o PR.
6. **`docs/plano-restante`** (pasta `order-management-api`): C5, push do commit local, PR.
7. **`docs/artefatos-rubrica`** (worktree `docs-rubrica`): C5, push, PR.
8. C6 registrado em `docs/decisoes/`.

Pronto quando: os PRs estão abertos e verdes; nenhum `known-defect` sobra depois dos merges; a exclusão `known-defect` do Surefire foi retirada no último PR.

### FASE 1 — Banco (Opus · xhigh)

Branch `feat/db-v5-v6`. Copiar o pacote SQL para `docs/bd/pacote-sql/`. Adaptar 01 e 02 aos nomes reais (após V3/V4) e criar V5 e V6. Seed 04 em `db/demo`. Flyway ligado e `ddl-auto=validate` em todos os perfis. Job de CI `bd` com PostgreSQL de serviço rodando 03, 05 e 06a/b/c, falhando em qualquer FAIL. Atualizar o ERD em `docs/bd/`.

### FASE 2 — Segurança e contrato de erro (Opus · xhigh)

Branch `feat/security-error-contract`. Matriz de acesso da seção 3 no `SecurityConfig` e nos serviços. Handlers para `HttpMessageNotReadableException`, `MethodArgumentTypeMismatchException`, `ConstraintViolationException`, `NoResourceFoundException`, `HttpRequestMethodNotSupportedException`, `HttpMediaTypeNotSupportedException`, `ObjectOptimisticLockingFailureException`. C7. Teste MockMvc parametrizado: cada endpoint × {anônimo, VENDEDOR, GERENTE} → status esperado, com corpo validado contra `ErrorResponse`.

### FASE 3 — Endpoints de negócio (Opus · high)

Branch `feat/business-endpoints`. Os 12 caminhos do alvo v3 e os da seção 3, com Bean Validation nos DTOs, DTOs de resposta sem campos sensíveis para VENDEDOR, transações e testes de regra. Gerar o contrato v4 e fazer o OpenAPI ao vivo bater com ele (`scripts/audit-contract.mjs`, `scripts/http-contract.mjs`).

### FASE 4 — Frontend SBI v1.1 (Opus · high)

Branch `feat/web-sbi`. As 8 telas da seção 4 consumindo a API real, com estados de carregando, vazio e erro (erro nunca aparece como zero). Guarda de rota com `GET /auth/me`; a autorização real continua no servidor. Começar por Vender e Visão geral.

### FASE 5 — Testes, contrato e CI (Opus · high)

Branch `ci/full-pipeline`. Playwright: venda, entrada de estoque, preço com motivo, promoção, vendedor sem acesso a dados alheios; axe-core sem violações WCAG 2.2 AA em todas as rotas e papéis. CI com jobs backend, bd, contrato ao vivo e frontend (build, unit, e2e). C8. Métricas R1 com `scripts/quality-metrics.mjs` comparadas ao R0 (`reports/metricas/`); metas apenas propostas em `docs/decisoes/`.

### FASE 6 — Documentação e entrega (Sonnet · medium)

Branch `docs/final-delivery`. README (subir com Docker, perfis, contas demo via variável), `docs/arquitetura.md` com diagrama e matriz de acesso, rastreabilidade requisito → critério → teste → evidência, roteiro de demonstração de 10 minutos, relatório final com números reais.

---

## 7. Decisões pendentes da equipe

Sem resposta, registre a opção padrão em `docs/decisoes/` e siga.

| Decisão | Opção padrão |
| --- | --- |
| Teto de desconto da loja (DEC-01) | Sem teto além de 100% e do valor do item; tela mostra `[A DEFINIR NA REUNIÃO DEC-01]` |
| Commits com o prefixo do robô de correção e branch `a3-contract-validation` | Reaplicar o conteúdo útil; a branch só é apagada com aprovação da equipe |
| RLS na aplicação ou só via `psql` | Só via `psql` |
| Estorno no mês do estorno ou da venda (AMB-06) | Mês do estorno |
| Vendedor cancela o próprio pedido pendente | Não |
| Metas de qualidade R1 | Publicar R1 contra R0 sem meta fixa |

---

## 8. Definição de pronto do projeto (29/11)

- [ ] CI verde na `main` com os jobs backend, bd, contrato e frontend
- [ ] Nenhum `@Tag("known-defect")` e nenhum `@Disabled` sem ID de defeito
- [ ] Contrato v4 versionado e sem divergência na auditoria
- [ ] Métricas R1 publicadas ao lado do R0
- [ ] Rastreabilidade requisito → critério → teste → evidência
- [ ] Ambiente de demonstração sobe com um comando, contas via variável de ambiente
- [ ] Roteiro de demonstração ensaiado
- [ ] Busca no repositório por termos de ferramenta ou de assistente sem resultado

---

## 9. Registro de execução

Preencha ao final de cada sessão: data, fase, branch/PR, comandos executados, resultado real (testes, falhas, CI), decisões e pendências.

| Data | Fase | Branch / PR | Comandos e resultado real | Pendências |
| --- | --- | --- | --- | --- |
| 13/10 | 0 | `main` @ `3be24ca` (linha de base, worktree `baseline` sem branch) | JDK 25.0.4.1 portátil. `mvnw -q verify`: exit 0, 90 testes (XML do Surefire), 0 falhas; `npm test` na raiz: 23/23; `npm test` em `frontend/`: 3/3. CI da `main` (run 38060322968): success. | Integração com PostgreSQL não rodada na linha de base (coberta pelo CI). |
| 13/10 | 0 | `chore/19-credenciais-env` / #6 | `git merge origin/main` (sem conflito); C1: `ci.yml` passa `SPRING_DATASOURCE_PASSWORD: ${{ env.TEST_DB_PASSWORD }}` no `env` dos dois passos e não usa mais `--spring.datasource.password`; C2: card VQvMapdo sem as senhas por extenso. `scripts/test.ps1`: 96 testes, BUILD SUCCESS; `scripts/test.ps1 -Mode Integration`: 101 testes, 0 falhas, BUILD SUCCESS; `npm test`: 23/23. Commit `1ef144d`. CI push + pull_request: success. | Merge (squash) pela equipe. |
| 13/10 | 0 | `fix/FIX-01-pagamentos` / #5 | `git merge origin/main` (sem conflito); `mvnw -q verify`: exit 0, 104 testes, 0 falhas. Nenhum teste de pagamento com `known-defect`; os 7 que restam na branch são D011/regressão (escopo da FIX-02). Head `6b4fb66`. CI: success. | Merge (squash). |
| 13/10 | 0 | `fix/FIX-02-status-exclusao` / #8 (já existia) | `git merge origin/main`: conflito em `CustomerService.java` resolvido com os nomes da `main`; `ClientException` → `CustomerException` (`Customer Error`); commit local `4e9ded0` enviado. `mvnw -q verify`: exit 0, 130 testes, 0 falhas; D011 e regressão de status rodam sem a tag. Head `abedd77`. CI: success. | Merge (squash). |
| 13/10 | 0 | `feat/DOM-02-bigdecimal` / #9 | Merge de FIX-01 (conflitos em `Order`, `CustomerService`, `ProductAndOrderCalculationTest`, `OrderPersistenceTest`, `OrderServiceRulesTest`, `TestData`: mantido BigDecimal + nomes customer) e FIX-02. C3: `V3__money_numeric.sql` → `V4__money_numeric.sql`, `FlywayMigrationTest` (contagens 4/3/3+1), `Money.java`, `docs/decisoes/dinheiro.md`. `pom.xml`: `known-defect` fora de `test.excludedGroups` (zero tags). `mvnw -q -Pintegration clean verify` com `docker-compose.test.yml`: exit 0, 166 testes, 0 falhas. Perfil `migration` em esquema vazio: Flyway V1→V4 aplicadas, aplicação iniciou com `ddl-auto=validate`, `price`/`amount` em `numeric(12,2)`. Commit `75a7082`; descrição do PR atualizada. CI: success. | Depois do merge de #6, #5 e #8, atualizar a branch com a `main` e rodar de novo. |
| 13/10 | 0 | `fix/FIX-03-pagamento-dinheiro` / #10 (novo) | C4: merge da DOM-02 atualizada (conflito em `dinheiro.md` resolvido com V4); `V4__money_numeric.sql` (mensagem V4), `FlywayMigrationTest` (D020 com alvo 3), `ConcurrencyTest` (`getCustomer`). `mvnw -q -Pintegration clean verify`: exit 0, 176 testes, 0 falhas. Branch publicada; PR com base `feat/DOM-02-bigdecimal`. Head `cf6384c`. CI: success. | Ordem: a FIX-03 foi criada sobre a DOM-02, então só entra depois do #9 (diferente da ordem 4→5 da seção 6). |
| 13/10 | 0 | `docs/plano-restante` / #7 | `git merge origin/main`; commit local `6ed6eff` enviado. C5: orientação do prefixo do robô de correção trocada por Conventional Commits em 64 cards; "robô de revisão" e o nome do robô de revisão removidos do plano; link de assistente de código removido de 3MmXle4G. C6/item 8: `docs/decisoes/integracao-fase0.md`. Busca (`scan_ai.py`) nos arquivos alterados: só restam as menções a do prefixo do robô de correção do próprio registro C6 e "uso de assistentes" (nome do tópico da rubrica). Head `f729585`. CI: success. | Merge (squash). |
| 13/10 | 0 | `docs/artefatos-rubrica` / #11 (novo) | C5: `docs/defeitos.md` sem "revisão por robô". Branch publicada, PR aberto. Busca nos arquivos alterados: 0 ocorrências. Head `d458030`. CI: success. | Revisão nominal dos documentos. |
| 13/10 | 0 | PRs #5–#8 (descrições) | Removido o bloco gerado automaticamente pelo app de revisão de PR das descrições de #5, #6, #7 e #8 (originais salvos em `A3/tmp/pr*-orig.md`). | O app continua instalado e pode reescrever a descrição em novos commits; reviews e comentários do bot (#5: 24, #6: 10, #7: 3, #8: 4, #9: 6) não foram apagados: decisão da equipe. |
| 13/10 | 0 | Observações | `git status` limpo em `chore-19` e `fix-01` (sem diferença de fim de linha). O merge na `main` pelo `gh pr merge` foi bloqueado pela política local de permissão; os merges ficam com a equipe (squash, ordem #6 → #5 → #8 → #9 → #10 → #7 → #11). | A3 pede `HALF_EVEN`, mas DOM-02 e `regras-loja.md` usam `HALF_UP` (confirmado em 04/10): decidir antes da Fase 1/3. Worktree `A3/baseline` pode ser removido. |
| 14/10 | 0 | `main` (verificação antes de atualizar #9, #10, #7, #11) | `git fetch origin --prune`: `origin/main` continua em `3be24ca` (sem novos commits). `gh pr list -R matheussiqueira-dev/Conformidade-de-Contrato-da-API-REST --state all`: #5, #6 e #8 com `state=OPEN`, `mergedAt=null`; #9, #10, #7 e #11 também abertos. Pelo passo 1 da sessão, parado sem atualizar nenhuma branch, sem merge local, sem push e sem mudança em PR. | Fazer o squash de #6 → #5 → #8 na `main` (título em Conventional Commits; os títulos atuais de #5, #6 e #8 não seguem o padrão). Depois retomar a partir do passo 2 (dom-02). |
| 14/10 | 0 | `main` (segunda verificação) | `git fetch origin --prune` e `git ls-remote origin refs/heads/main`: `main` em `57c3c70`, sem commit novo. `gh pr list --state all`: #5, #6 e #8 com `state=OPEN`, `mergedAt=null`. A `main` local está em `606f316` (histórico antigo do upstream). Os squashes não estão no GitHub. Parado no passo 1: nenhuma branch atualizada, nenhum push. | Fazer o squash de #6 → #5 → #8 pelo GitHub e conferir com `git ls-remote origin refs/heads/main`. |
| 14/10 | 2C | `feat/business-endpoints` / #15 (base `feat/security-error-contract`) | 45 operações do v4 `implemented` (PDV, clientes, catálogo, estoque, faturamento, metas, desempenho, estorno, promoções, análises, autenticação); D022 corrigido (V7). `mvnw -q clean verify`: exit 0, 233 testes, 0 falhas; `scripts/test.ps1 -Mode Integration`: 541 testes, 0 falhas, BUILD SUCCESS; `scripts/test-contract.ps1 -HttpOnly`: exit 0 (http-contract 6/6, http-session 7/7, live-contract 45/45 sem divergência); `npm test`: 35/35; `audit-contract`: sem erros. CI (`test`, `bd`) no head `b301da6`: success. | Revisão e merge na ordem #13 → #14 → #15; revisar `Money` mínimo 0 no v4 para lucro/líquido negativos; CT-SEC-111 parcial; conferência do faturamento contra o seed demo. |
| 14/10 | 3 | `feat/web-sbi` / #16 (base `feat/business-endpoints`) | Frontend em TypeScript estrito com Zod 4 gerado do v4 (orval), cliente HTTP único, proxy + guarda por área, PDV, vendas, clientes, gestão, estoque, produtos, promoções, análises e meu desempenho; design SBI v1.1. `npx tsc --noEmit`: 0 erros; `npm test`: 20/20; `npm run build`: 14 rotas; `scripts/test-contract.ps1 -HttpOnly -Frontend`: exit 0 (Playwright 8/8: CT-WEB-101, 102, 103, 104 e 109 com axe WCAG 2.2 AA e 320 px). CI (`test`, `bd`) no head `8ef24d3`: success. | Revisão e merge depois do #15; CT-WEB-105 a 108 na ETAPA 4; E2E de fluxo para produtos e promoções. |
| 14/10 | 4 | `ci/full-pipeline` / #17 (base `feat/web-sbi`) | CI em quatro jobs (test backend, bd, contract, frontend) com artefatos; casos restantes (CT-PRODUCT-001/002, CT-COST-003, CT-SEC-111, CT-WEB-105..108, CT-E2E-002, CT-UI-001/002); métricas R1 com comparativo R0; `docs/rastreabilidade.md`. `scripts/test.ps1 -Mode Integration`: 544 testes, 0 falhas; `test-contract.ps1 -HttpOnly -Frontend`: Playwright 14/14; CI 38545269733 no head `33d37cd`: quatro jobs success. | Merge depois do #16; histórico de `c5694db` (ambiente da JVM nos XML) some com squash merge ou exige decisão sobre a branch. |
| 14/10 | 5 | `docs/final-delivery` / #18 (base `ci/full-pipeline`) | Demonstração em um comando (`docker-compose.demo.yml`: banco em memória, API perfil demo, web), README, arquitetura, roteiro de 10 min, relatório final, defeitos atualizados. Fumaça da demo pela porta 3000: login dos dois perfis, faturamento D90 = R$ 186.400,00 / 65 pedidos (igual ao modelo). CI 38546915079 no head `e5e7f2f`: quatro jobs success (frontend após rerun por falha transitória de fontes). | Merge #13→#18; CI na main; ensaio do roteiro; decisão sobre 8 arquivos históricos com termos de ferramenta. |
| 14/10 | Fechamento | `main` cd70e64; PRs #19 a #22 | #19 e #20 integrados (a7f56f7, cd70e64); 16 branches remotas apagadas; worktrees antigas removidas; postgres-order inexistente (sem backup). Demo verificada com Playwright 30/30, axe 0 violações em 18 telas, 52 capturas em `A3\output\demo-2026-10-14`, `SBI-ENSAIO-DEMO.md`. Na `main`: `mvnw -q clean verify` 233/0; `npm test` 36/36 e 20/20; contrato ao vivo 45/45 sem divergência; CI 38560409810 quatro jobs success; bd 51 PASS. PR #21 (roteiro) e #22 (metas e revisão) abertos com CI verde. | Squash de #21 e #22 (negado à sessão pela política local); remover a worktree `noite` e a branch local `chore/sanitize-reports`; ensaio humano da demo; revisão e voto da equipe. |
