# SBI — Roteiro de conclusão do projeto A3

Oct 13, 2026 · @Matheus Henrque Dias Siqueira

## Como executar no IntelliJ

O projeto termina em 7 sessões de trabalho no repositório `matheussiqueira-dev/Conformidade-de-Contrato-da-API-REST`, uma por fase da seção 5, sempre com o prompt mestre da seção 4 colado no início.

### Preparação (uma vez por máquina)

1. Instale a CLI do assistente de código e confirme com `<cli do assistente> --version`. O plugin do IntelliJ não traz a CLI embutida; sem ela no PATH, o plugin avisa que não consegue iniciar (documentação do fornecedor do assistente).
2. Instale o **plugin do assistente de código** pelo Marketplace do IntelliJ e reinicie a IDE (documentação do fornecedor do assistente).
3. Abra o projeto pela raiz do repositório e inicie com `Ctrl+Esc` (Windows/Linux) ou `Cmd+Esc` (Mac), ou rode a CLI do assistente no terminal integrado. As diferenças aparecem no visualizador de diff da IDE e os erros de inspeção são compartilhados automaticamente.
4. No primeiro uso, rode `/config` e deixe a ferramenta de diff em `auto`.
5. Desligue a coautoria automática em commits: `"includeCoAuthoredBy": false` em arquivo de configuração do assistente na pasta do usuário. Guarde as regras de higiene da seção 4 em arquivo de instruções do assistente na pasta do usuário (pasta do usuário), nunca em arquivo versionado no repositório.
6. Mantenha o modo de aprovação manual para edições. No IntelliJ, o modo de aceite automático pode alterar arquivos de configuração que a IDE executa sozinha.

### Modelo e esforço por fase

Use `/model` para escolher o modelo e `/effort` para o nível de esforço (`low`, `medium`, `high`, `xhigh`, `max`). Para a maior parte das tarefas, o nível padrão do modelo basta; suba o esforço quando a sessão pular arquivos, não rodar testes ou não revisar o próprio trabalho (documentação do fornecedor do assistente).

| Fase | Modelo | Esforço | Motivo |
| --- | --- | --- | --- |
| 0. Integrar branches e higiene | Opus | high | Conflitos de Flyway e histórico exigem cuidado |
| 1. Banco e migrações | Opus | xhigh | Mudança de esquema irreversível em produção de demonstração |
| 2. Segurança e contrato de erro | Opus | xhigh | Autorização e formato de erro são o tema central do A3 |
| 3. Endpoints de negócio | Opus | high | Regras de estoque, preço, promoção e metas |
| 4. Frontend SBI v1.1 | Opus ou Sonnet | high | Muitas telas; Sonnet atende se o esforço ficar em high |
| 5. Testes, contrato e CI | Opus | high | Precisa rodar e corrigir até passar |
| 6. Documentação e entrega | Sonnet | medium | Texto e evidências, sem lógica nova |

### Ritual de cada sessão

1. `git switch main && git pull`, depois crie a branch da fase (nomes na seção 5).
2. Cole o prompt mestre e, abaixo dele, `Execute a FASE N`.
3. Revise cada diff antes de aceitar. Ao final, a sessão mostra a saída real dos testes.
4. Abra um PR por fase; outro integrante revisa antes do merge.

## Arquitetura atual verificada

Na main `3be24ca` (verificada em 13/10/2026), a API, o banco e a CI existem e funcionam; o que falta são as telas de negócio, a venda pelo vendedor, as rotas do contrato v3 e as migrações V4 a V6.

&#91;embedded content: arquitetura atual · o que existe e o que falta por camada\]

Cada caixa mostra o que existe hoje e o que a fase correspondente entrega. O site estático de inteligência de vendas continua independente e fica fora deste roteiro: o produto SBI final é o frontend Next.js deste repositório consumindo a API real.

Correções já prontas aguardam integração em 5 branches: `fix/FIX-01-pagamentos`, `fix/FIX-02-status-exclusao`, `chore/19-credenciais-env`, `feat/DOM-02-bigdecimal` (com uma V3 que conflita com a da main) e `docs/plano-restante`.

## Design v1.1: decisões aplicadas da crítica

A v1.1 mantém símbolo, nome e paleta da v1.0 e muda o acabamento: uma fonte, superfícies sem borda e um único destaque de cor por tela.

| Tema | v1.0 (protótipo atual) | v1.1 (implementar) |
| --- | --- | --- |
| Fontes | Space Grotesk, IBM Plex Sans e IBM Plex Mono | IBM Plex Sans em tudo; títulos em 600 com `letter-spacing: -0.01em`; números com `font-variant-numeric: tabular-nums`. Mono só em SKU e número de pedido. Space Grotesk só no logo, já convertido em curvas |
| Cartões | Borda de 1 px em todos | Sem borda; fundo branco sobre Névoa `#F5F6F9`; raio 18 px; espaço de 32 a 48 px entre blocos |
| Indicadores | Caixas com divisórias | Números grandes soltos (40 px, Plex Sans 600 tabular), rótulo acima em Ardósia |
| Cor | Índigo em botão, número e selo | Índigo só na ação principal e no item ativo do menu |
| Selos | Cheios e claros misturados | Sempre fundo claro + texto escuro; só para exceções ("Inativo", "Aguardando pagamento", "Abaixo do mínimo") |
| Pagamento | Lista suspensa | Controle segmentado "Pix · Cartão · Boleto", igual no computador e no celular |
| Quantidade | Número estático | Botões − e + de 44 px com limite no disponível |
| Etapas da venda | Chips com "(atual)" | Barra de progresso de 3 segmentos com `aria-current="step"` |
| Estoque | Alerta em faixa, linha e ícone | Linha destacada + contador no título; entrada em painel lateral |
| Menu | Itens sem tela (Clientes, Minhas vendas, Produtos disponíveis) | Só telas existentes |

Também entram na v1.1, fora do código:

- **Manual de marca:** uma ideia por página, cerca de 12 páginas, capa só com a assinatura (sem o símbolo recortado fora da paleta) e numeração única por página.
- **Protótipo:** remover as 6 pranchas de marca duplicadas e corrigir a altura de Visão geral e Meu desempenho, que hoje cortam conteúdo.
- **Contracapa:** listar só os arquivos que existem (SVG, PNG, favicon) ou criar os tokens e modelos citados.

```css
:root {
  --sbi-font: 'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif;
  --sbi-mono: 'IBM Plex Mono', Consolas, ui-monospace, monospace; /* só SKU e pedido */
  --sbi-surface: #FFFFFF; --sbi-canvas: #F5F6F9;
  --sbi-radius-card: 18px; --sbi-radius-control: 12px;
  --sbi-gap-section: 48px; --sbi-gap-block: 32px;
}
```

## Prompt mestre

Cole o bloco inteiro no início de cada sessão e, na linha seguinte, escreva `Execute a FASE N`. Ele é autossuficiente: quem executa não precisa ler este documento.

```markdown
# SBI — Conclusão do Projeto A3 (API REST + PostgreSQL + Next.js)

## 0. Papel
Atue como engenheiro de software sênior (10+ anos em Java/Spring, PostgreSQL, contratos OpenAPI,
segurança e frontend React). Você é o dono técnico da fase pedida: decide, justifica em uma frase
em docs/decisoes/ e executa. Não invente dados, métricas, resultados de teste ou funcionalidades.
Pare e pergunte só antes de ação irreversível: reescrever histórico, force push, apagar branch
remota, apagar dados, mudar CI de outros repositórios.
Antes de editar: leia README.md, docs/requisitos.md, docs/criterios-aceitacao.md, docs/plano-testes.md,
docs/decisoes/, pom.xml, application*.properties, SecurityConfig, GlobalExceptionHandler,
config/openapi/target-loja-gestao-openapi-2026-10-04-v3.json e .github/workflows/ci.yml.
Rode a suíte (./mvnw -q verify; npm test na raiz; npm test em frontend/) e registre a linha de base.

## 1. Estado verificado em 13/10/2026 (main = 3be24ca)
- Backend: Java 25, Spring Boot 4.1.0, Spring Data JPA, Spring Security (sessão + CSRF, papéis
  GERENTE/VENDEDOR), Springdoc, Flyway V1 legado, V2 usuários/autoria, V3 rename client->customer.
- application.properties: ddl-auto=update, Flyway desligado, senha de banco no código (senha123).
- SecurityConfig: /products, /customers, /orders, /payment, /address só para GERENTE; o resto denyAll.
  O VENDEDOR hoje não consegue vender.
- GlobalExceptionHandler não estende ResponseEntityExceptionHandler e tem handler para Exception.
  Verifique se JSON malformado, tipo errado no path, método não suportado e rota inexistente
  devolvem 500 em vez de 400/405/404. Formato atual: {timestamp, status, error, message, details[]}.
- Testes com @Tag("known-defect") excluídos da CI: D003, D006, D011, D012, D016 e regressão de status.
- Contrato alvo v3: 12 caminhos (auth, /management/summary, /performance/me, /goals/monthly,
  /sales/orders, /orders/{id}/cancel, /payment/{id}/refund, /stock/products, /stock/products/{id}/entries).
  Nenhum deles está implementado.
- Frontend (frontend/, Next.js 16.3.8, React 19.3): só a tela de acesso. Nenhuma área de negócio.
- Branches com trabalho fora da main:
  fix/FIX-01-pagamentos (2 commits), fix/FIX-02-status-exclusao (1), chore/19-credenciais-env (1),
  feat/DOM-02-bigdecimal (6; tem V3__money_numeric.sql que conflita com a V3 da main),
  docs/plano-restante (1), a3-contract-validation (5 commits com o prefixo do robô de correção).
- Pacote SQL da disciplina de Banco de Dados (pacote-sql-loja-gestao.zip): 01_evolucao_schema,
  02_views_dashboards (15 views), 03_rbac (roles, GRANT por coluna, RLS), 04_seed_demo (65 pedidos
  pagos de 09/2026), 05_crud_exemplos, 06a/b/c testes (51 PASS em PostgreSQL 16 em 12/10).
  Se não estiver em docs/bd/pacote-sql/, peça o arquivo antes da FASE 1.

## 2. Decisões de arquitetura (obrigatórias)
A1 Sistema único neste repositório: API Spring + PostgreSQL + frontend Next.js. O site estático
   "intelig-ncia-de-vendas-e-rentabilidade" continua demonstração independente; não integrar agora.
A2 Flyway é a única fonte do esquema em todos os perfis: spring.flyway.enabled=true e
   spring.jpa.hibernate.ddl-auto=validate. Massa de demonstração em local separado
   (classpath:db/demo), ativado só no perfil demo via spring.flyway.locations.
   Numeração: V4__money_numeric (renumerar a V3 do DOM-02), V5__catalogo_estoque_metas_promocoes,
   V6__views_dashboards. Nunca edite migração já publicada na main.
A3 Dinheiro: BigDecimal na aplicação, NUMERIC(12,2) no banco, arredondamento HALF_EVEN documentado.
A4 Autorização no servidor, por papel e por dono do dado. A RLS do 03_rbac.sql fica como entrega
   da disciplina de BD, demonstrada via psql com troca de role; a aplicação usa uma conexão única e
   aplica as regras nos serviços. Registre o trade-off em docs/decisoes/.
A5 Um único formato de erro para 400, 401, 403, 404, 405, 409, 415 e 500, documentado no OpenAPI
   como componente ErrorResponse e referenciado em toda operação. Não adicione campos ao formato
   sem atualizar o contrato. 500 nunca expõe stack trace, SQL ou nome de classe.
A6 Frontend fala com a API pela mesma origem: rewrite do Next.js /api/:path* -> backend
   (variável API_ORIGIN), cookie de sessão HttpOnly e token CSRF de /auth/csrf em toda mutação.
   Sem CORS aberto.
A7 Relatórios e painéis leem as views do V6 (consultas nativas ou entidades @Immutable). Nenhum
   número de tela calculado no frontend a partir de listas.
A8 Contas de demonstração criadas no perfil demo com senha vinda de variável de ambiente
   (SBI_DEMO_PASSWORD), gravada com BCrypt. Nenhuma senha versionada.

## 3. Matriz de acesso
GERENTE: tudo.
VENDEDOR: POST /sales/orders (responsável = usuário logado, nunca do corpo); GET /performance/me;
  GET /products e GET /stock/products sem custo; GET /customers com CPF mascarado;
  GET /promotions/active; GET /orders?mine=true.
VENDEDOR recebe 403 em: preço, promoções (escrita), entradas de estoque, metas,
  /management/summary, /analytics/**, estorno, cancelamento de pedido alheio, dados de outro vendedor.

## 4. Endpoints a entregar (além dos 12 do alvo v3)
GET|POST|PUT /categories                     GERENTE
PATCH /products/{id}/price {newPrice, reason} GERENTE; grava histórico; pedidos antigos mantêm preço
GET /products/{id}/price-history              GERENTE
PATCH /products/{id}/status {active}          GERENTE; produto vendido é inativado, nunca excluído (409)
GET|POST /promotions, POST /promotions/{id}/close, GET /promotions/active?productId=
GET /analytics/sales?month=YYYY-MM, GET /analytics/stock   GERENTE
Regras: estoque disponível = saldo − reservado; reserva atômica com UPDATE condicional (409 se
insuficiente); custo médio ponderado na entrada; promoção percentual 1..100, fim > início,
desconto <= valor do item; pedido aguardando pagamento não entra no realizado; estorno desconta
no mês do estorno. Produza config/openapi/target-loja-gestao-openapi-<data>-v4.json.

## 5. Design SBI v1.1 (frontend)
Fonte única IBM Plex Sans (títulos 600, letter-spacing -0.01em; números tabular-nums); Plex Mono
só em SKU e número de pedido; Space Grotesk só no logo SVG oficial. Cartões sem borda, branco
sobre #F5F6F9, raio 18, espaços 32/48. Índigo #3D4ED6 só na ação principal e no item ativo.
Texto #141B26, secundário #556070, borda de campo #8A93A3. Estados com fundo claro e texto:
sucesso #14684F/#E3F6EF, atenção #8A4C00/#FFF6E5, erro #B42318/#FDECEA; só para exceções.
Dados: #3D4ED6, #138A8A, #B26400, #8A4FB0; meta = linha âmbar tracejada nomeada.
Telas (App Router): /entrar, /gestao, /gestao/produtos, /gestao/promocoes, /gestao/estoque,
/gestao/analises, /vender, /meu-desempenho. Menu só com telas existentes. Pagamento como controle
segmentado Pix/Cartão/Boleto; quantidade com − e + de 44 px; etapas como barra de 3 segmentos.
Voz: verbo no botão, sem código HTTP na tela ("Estoque insuficiente: restam 2 unidades.").
WCAG 2.2 AA: contraste, foco visível, alvos >= 44 px, labels, tabelas com th scope, sem rolagem
horizontal em 320 px. Sem emoji.

## 6. Fases (execute só a pedida; cada uma termina com testes verdes e PR)
FASE 0 — Integração (branch por PR)
  Integrar na ordem: chore/19-credenciais-env, fix/FIX-01-pagamentos, fix/FIX-02-status-exclusao,
  feat/DOM-02-bigdecimal (renomear V3__money_numeric para V4__money_numeric e ajustar referências),
  docs/plano-restante. Rebase sobre a main, resolver conflitos, CI verde em cada PR.
  Remover @Tag("known-defect") de cada teste que passar e retirar a exclusão do Surefire quando
  não sobrar nenhum. Não integrar os 5 commits com o prefixo do robô de correção de a3-contract-validation: liste o que
  eles mudam e proponha reaplicar o necessário com mensagens Conventional Commits.
  Remover de docs/ qualquer referência a robô de revisão ou assistente de código.
FASE 1 — Banco
  Copiar o pacote SQL para docs/bd/pacote-sql/. Adaptar 01 e 02 aos nomes reais das tabelas (após
  V3/V4) e criar V5 e V6. Seed 04 em db/demo. Flyway ligado e ddl-auto=validate em todos os perfis.
  Job de CI "bd" com PostgreSQL de serviço rodando 03, 05 e 06a/b/c e falhando em qualquer FAIL.
  Atualizar o ERD em docs/bd/.
FASE 2 — Segurança e contrato de erro
  Matriz de acesso da seção 3 no SecurityConfig e nos serviços (dono do dado). Handlers para
  HttpMessageNotReadable, MethodArgumentTypeMismatch, ConstraintViolation, NoResourceFound,
  HttpRequestMethodNotSupported, HttpMediaTypeNotSupported, ObjectOptimisticLockingFailure.
  Teste MockMvc parametrizado: cada endpoint × {anônimo, VENDEDOR, GERENTE} -> status esperado,
  e corpo de erro validado contra o schema ErrorResponse.
FASE 3 — Endpoints de negócio
  Implementar os 12 caminhos do alvo v3 e os da seção 4, com Bean Validation nos DTOs, DTOs de
  resposta sem campos sensíveis para VENDEDOR, transações e testes de regra. Gerar o contrato v4
  e fazer o OpenAPI ao vivo bater com ele (scripts/audit-contract.mjs e http-contract.mjs).
FASE 4 — Frontend SBI v1.1
  Implementar as 8 telas da seção 5 consumindo a API real, com estados de carregando, vazio e erro
  (nunca mostrar erro como zero). Guarda de rota usando GET /auth/me; a autorização real continua
  no servidor. Logo e favicon a partir do pacote sbi-marca-v1.0 (docs/marca/).
FASE 5 — Testes, contrato e CI
  Playwright: fluxo de venda, entrada de estoque, preço com motivo, promoção, vendedor sem acesso
  a dados alheios; axe-core sem violações WCAG 2.2 AA em todas as rotas e papéis.
  CI: backend, bd, contrato ao vivo, frontend (build, unit, e2e). Métricas R1 com
  scripts/quality-metrics.mjs comparadas ao R0 (reports/metricas/), sem inventar metas: proponha
  metas em docs/decisoes/ para aprovação da equipe.
FASE 6 — Documentação e entrega
  README (como subir com Docker, perfis, contas demo via variável), docs/arquitetura.md com
  diagrama de componentes e matriz de acesso, rastreabilidade requisito -> teste -> evidência,
  roteiro de demonstração de 10 minutos, relatório final com números reais das execuções.

## 7. Higiene do repositório (inegociável)
1. Nenhuma atribuição, assinatura, rodapé, comentário ou metadado que indique uso de assistentes,
   assistente, automação ou ferramenta de geração, em código, docs, commits, PRs ou terminal.
2. Sem trailers de coautoria, links de sessão, IDs de conversa ou créditos automáticos.
3. Commits em Conventional Commits, em inglês, objetivos, sem corpo nem rodapé.
4. Todo código e documento é trabalho técnico revisado e mantido pelo desenvolvedor responsável.
5. Antes de cada commit: git diff --staged revisado e busca por termos de ferramenta ou de assistente vazia.
6. Sem force push na main, sem reescrever histórico publicado, sem senha ou token versionado.

## 8. Definição de pronto da fase
Testes da fase passando com saída real colada no resumo; CI verde; contrato v4 sem divergência
para os caminhos tocados; docs/decisoes/ atualizado; PR aberto com descrição técnica (o que mudou,
como testar, limites). Resumo final: entregue, comandos e resultados reais, decisões, pendências.
Nunca declare algo testado sem ter executado.
```

## Roteiro por fases

As 7 fases cabem até o prazo interno de 29/11, com a semana de provas A1 (19 a 24/10) reservada para trabalho leve de banco. Datas e responsáveis são proposta: os nomes seguem os cards já atribuídos no Trello e precisam ser confirmados pela equipe.

&#91;embedded content: calendário proposto · 7 fases até 29/11\]

As fases 2 e 3 correm em paralelo porque usam branches diferentes; a fase 4 começa quando a 3 já expõe as primeiras rotas.

| Fase | Branch | Responsável / revisor (proposta) | Pronto quando |
| --- | --- | --- | --- |
| 0. Integração | um PR por branch existente | Gabriel / Allan | 5 branches na main, nenhum teste `known-defect` restante, CI verde |
| 1. Banco | `feat/db-v5-v6` | Matheus / Gabriel | Flyway ligado e `validate` em todos os perfis; job `bd` com 51 casos passando |
| 2. Segurança e erros | `feat/security-error-contract` | Allan / Matheus | Teste da matriz endpoint × papel verde; nenhum 500 para entrada inválida |
| 3. Endpoints de negócio | `feat/business-endpoints` | Gabriel / Francisco | 12 caminhos v3 + extensões implementados; OpenAPI ao vivo igual ao contrato v4 |
| 4. Frontend SBI v1.1 | `feat/web-sbi` | Matheus / Francisco | 8 telas usando a API real; axe sem violações |
| 5. Testes e CI | `ci/full-pipeline` | Allan / Gabriel | CI com backend, bd, contrato, frontend e e2e; métricas R1 publicadas |
| 6. Documentação e entrega | `docs/final-delivery` | Francisco / Matheus | README, rastreabilidade, roteiro de demo e relatório com números reais |

### Checklist de correções já conhecidas

- [ ] Senha `senha123` fora de `application.properties` e do `docker-compose.yml` (PR #6)
- [ ] Pagamento: boleto vencido, boleto sem vencimento, valor diferente do total, tipo com locale (D003, D006, D012, D016)
- [ ] Exclusão de recurso inexistente devolve 404 (D011) e regressão de status é bloqueada
- [ ] Migração de dinheiro renumerada de V3 para V4
- [ ] `ddl-auto=update` substituído por `validate` com Flyway ligado
- [ ] Vendedor consegue criar venda e ver só o próprio desempenho
- [ ] JSON malformado, tipo errado e rota inexistente sem resposta 500
- [ ] Commits com o prefixo do robô de correção de `a3-contract-validation` reaplicados com mensagem correta ou descartados
- [ ] Referência a robô de revisão removida de `docs/gestao`
- [ ] Altura de Visão geral e Meu desempenho corrigida no protótipo
- [ ] Pranchas de marca duplicadas removidas do protótipo

## Testes e definição de pronto

O projeto está pronto para entrega quando as cinco camadas de teste abaixo passam na CI da main e cada requisito aponta para um teste e uma evidência.

| Camada | Ferramenta | O que prova | Onde roda |
| --- | --- | --- | --- |
| Regras de domínio | JUnit 5, Mockito, AssertJ | Estoque, preço, promoção, pagamento, metas | `./mvnw verify` |
| Segurança e erro | MockMvc, Spring Security Test | Matriz endpoint × papel e formato único de erro | `./mvnw verify` |
| Banco | psql + scripts 03, 05 e 06a/b/c | CRUD, constraints, views, GRANT e RLS | job `bd` da CI |
| Contrato | Ajv 8 (`scripts/audit-contract.mjs`, `http-contract.mjs`) | OpenAPI ao vivo = contrato v4, inclusive respostas de erro | job de contrato |
| Interface | Playwright + axe-core | Fluxos do gerente e do vendedor; WCAG 2.2 AA | job frontend |

### Checklist de entrega (29/11)

- [ ] CI verde na main com os cinco jobs
- [ ] Nenhum `@Tag("known-defect")` e nenhum `@Disabled` sem ID de defeito
- [ ] Contrato v4 versionado em `config/openapi/` e sem divergência na auditoria
- [ ] Métricas R1 (cobertura, PMD, CPD, SpotBugs) publicadas ao lado do R0, com a comparação real
- [ ] Rastreabilidade requisito → critério → caso de teste → evidência em `docs/`
- [ ] Ambiente de demonstração sobe com um comando, contas criadas a partir de variável de ambiente
- [ ] Roteiro de demonstração de 10 minutos ensaiado por toda a equipe
- [ ] Busca no repositório por termos de ferramenta ou de assistente sem resultado
- [ ] Cards do Trello em Concluído só com revisão nominal registrada

## Decisões pendentes e riscos

Seis decisões da equipe destravam as fases 0 a 3; sem elas, o prompt manda registrar a escolha mais simples e seguir.

| Decisão | Bloqueia | Opção padrão se ninguém decidir |
| --- | --- | --- |
| Teto de desconto da loja (DEC-01) | Fase 3, promoções | Sem teto além de 100% e do valor do item; texto `[A DEFINIR NA REUNIÃO DEC-01]` na tela |
| Destino dos 5 commits com o prefixo do robô de correção e da branch `a3-contract-validation` | Fase 0 | Reaplicar o conteúdo útil com mensagens corretas; a branch só é apagada com aprovação da equipe |
| RLS aplicada pela aplicação ou só na demonstração via psql (A4) | Fase 1 | Só via psql; a aplicação aplica as regras nos serviços |
| Estorno descontado no mês do estorno ou da venda (AMB-06) | Fase 3, análises | Mês do estorno, como nas views já testadas |
| Vendedor pode cancelar o próprio pedido pendente | Fase 2 | Não; só o gerente cancela |
| Metas de qualidade R1 (cobertura, PMD, SpotBugs) | Fase 5 | Publicar R1 contra R0 sem meta fixa; metas propostas em `docs/decisoes/` |

**Riscos**

- **Escopo do frontend:** 8 telas em cerca de 3 semanas. Mitigação: a fase 4 começa por Vender e Visão geral, que sustentam a demonstração.
- **Semana de provas (19 a 24/10):** baixa capacidade. Mitigação: só a fase 1, que é de banco e pode ser feita em blocos curtos.
- **Conflitos de migração:** duas V3 e um pacote SQL escrito com nomes anteriores ao rename `client → customer`. Mitigação: `ddl-auto=validate` na CI acusa qualquer divergência.
- **Clones antigos:** quem clonou antes de 08/10 tem histórico reescrito. Mitigação: clonar de novo antes da fase 0.
- **Ambiente Windows sem Docker ligado:** testes de integração e de contrato não rodam localmente. Mitigação: confiar na CI e registrar o que não rodou.

## Fontes

- documentação do fornecedor do assistente
- JetBrains Marketplace, página do plugin do assistente de código
- documentação do fornecedor do assistente
- Repositório `matheussiqueira-dev/Conformidade-de-Contrato-da-API-REST`, main `3be24ca` e branches remotas, conferidos em 13/10/2026
- `docs/gestao/plano-restante-2026-10-07.md` (branch `docs/plano-restante`)
