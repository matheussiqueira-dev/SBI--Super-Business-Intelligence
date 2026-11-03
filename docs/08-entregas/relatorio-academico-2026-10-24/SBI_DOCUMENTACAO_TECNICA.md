# SBI — Super Business Intelligence: documentação técnica

Versão de referência: commit `6046904bb93a3f2d2e18e6098458fc8acde80714` (branch `main`, 21/10/2026), em produção em <https://sbi-app-alpha.vercel.app>. Documento complementar ao relatório acadêmico `SBI_RELATORIO_ACADEMICO_COMPLETO_2026`, cujos capítulos e apêndices são indicados entre parênteses. Situação verificada em 24/10/2026.

> **Atualização em 25/10/2026.** Os *pull requests* nº 47 a 54 foram integrados e publicados: avatares (`864e0dd`), correções da auditoria (`52a8d34`), identidade visual v2 (`9831563`), créditos (`137e32a`), perfil CEO com as contas dos docentes (`5ca3336`), desempenho (`311bbe9`), endereços do repositório (`dce92fd`) e organização das pastas (`cba16ba`). Este documento continua a descrever a versão de referência; a situação atual está no Apêndice M do relatório.

## 1. Visão geral

O SBI é uma aplicação web de gestão comercial para uma loja de varejo de eletrônicos. Há dois papéis, com hierarquia `GERENTE > VENDEDOR`:

- **Vendedor:** ponto de venda (PDV), vendas, clientes, Meu desempenho e troca de senha.
- **Gerente:** tudo do vendedor, mais visão geral, produtos e preços, estoque, promoções e alçadas de desconto, análises e administração de usuários.

Pagamentos são simulados; não há emissão fiscal, várias lojas nem dados reais de clientes. Os dados de demonstração combinam massa sintética e um recorte anonimizado do conjunto público da Olist.

## 2. Arquitetura

```
navegador ──HTTPS──> Vercel: Next.js 16 / React 19 (projeto sbi-app)
                       │  rewrite /api/backend/* → BACKEND_ORIGIN
                       ▼
                     Render: API Spring Boot 4.1 / Java 25 (Docker, perfil demo)
                       │  JDBC + TLS, conexão direta
                       ▼
                     Neon: PostgreSQL 18.6 (banco neondb; branch por pull request)
```

| Camada | Tecnologia | Observações |
| --- | --- | --- |
| Interface | Next.js 16.3.8, React 19.3, TypeScript 6.0.3, TanStack Query, React Hook Form, Zod 4 | Esquemas Zod gerados do contrato v5 pelo orval (`lib/api/generated/sbi.zod.ts`) |
| API | Spring Boot 4.1, Java 25, Spring Security, Springdoc 2.8.5 | Módulos novos com `JdbcClient`; legado JPA para `/orders`, `/payment`, `/address` |
| Banco | PostgreSQL 18, Flyway (V1–V11 e `db/demo`) | Hibernate em `validate`; regras de integridade no banco |
| Qualidade | JUnit 5, Mockito, AssertJ, JaCoCo, PMD, CPD, SpotBugs, Ajv, Playwright 1.63, axe-core | Integração contínua em quatro jobs |
| Implantação | Vercel, Render, Neon, GitHub Actions | Implantação automática a cada push na `main` |

Diagramas: `diagramas/D01` (contexto), `D03` (implantação), `D04` (componentes), `D08` (sequência da venda) e `D09` (autenticação), com fontes Mermaid em `diagramas/fonte/` (capítulo 5 e Apêndice C).

Implantação verificada em 24/10/2026: interface na Vercel e API no Render (serviço `sbi-api`, Docker, plano gratuito, região Virgínia, verificação de saúde em `/auth/csrf`) no commit `6046904`, com implantação automática a cada commit na `main`; a integração contínua do mesmo commit terminou com sucesso nos quatro jobs.

## 3. Organização do código

| Caminho | Conteúdo |
| --- | --- |
| `src/main/java/.../api/sales` | PDV: catálogo, cotação, venda idempotente, confirmação, cancelamento, aprovação de desconto |
| `.../api/customers` | Clientes PF/PJ, CPF e CNPJ (inclusive alfanumérico), histórico e resumo |
| `.../api/backoffice` | Produtos e insumos, categorias (sem exclusão), preço com motivo, estoque, movimentos |
| `.../api/management` | Metas, faturamento, estorno, análises |
| `.../api/promotions`, `.../api/discounts` | Promoções e alçadas de desconto manual |
| `.../api/users` | Administração de usuários, troca e redefinição de senha |
| `.../api/common` | `Money`, paginação, usuário da sessão, contexto de banco (`set_config`) |
| `.../config`, `.../security` | `SecurityConfig`, bloqueio de login, versão de sessão, respostas JSON de segurança |
| `.../exceptions` | `GlobalExceptionHandler`, `ErrorResponse`, `ErrorCode` |
| `src/main/resources/db/migration`, `db/demo` | Migrações V1–V11 e massa de demonstração |
| `frontend/app`, `components`, `lib` | Páginas, componentes e cliente HTTP |
| `config/openapi` | Contratos versionados; vigente: `target-loja-gestao-openapi-2026-10-14-v5.json` |
| `docs/`, `reports/`, `scripts/` | Documentação, evidências versionadas e automações |

## 4. API

- **Contrato v5:** OpenAPI 3.1.0, 46 caminhos, 58 operações, 113 esquemas, todas as operações implementadas. Swagger em `/swagger-ui/index.html`.
- **Autenticação:** sessão no servidor (`JSESSIONID` `HttpOnly`, `Secure`, `SameSite=Lax`), CSRF por token sincronizador (`GET /auth/csrf`, cabeçalho `X-CSRF-TOKEN` em toda mutação), BCrypt de custo 12, bloqueio de 15 minutos após 5 falhas, revogação de sessões por `session_version`.
- **Autorização em três barreiras:** URL (`SecurityFilterChain`, negação por padrão), método (`@PreAuthorize` com `RoleHierarchy`) e dono do dado (pedido de outro vendedor responde 404).
- **Erros:** `ErrorResponse {timestamp, status, error, code, message, details}` com 20 códigos estáveis (`VALIDATION_FAILED`, `MALFORMED_REQUEST`, `UNAUTHENTICATED`, `SESSION_REVOKED`, `FORBIDDEN`, `PASSWORD_CHANGE_REQUIRED`, `DISCOUNT_ABOVE_LIMIT`, `NOT_FOUND`, `METHOD_NOT_ALLOWED`, `UNSUPPORTED_MEDIA_TYPE`, `STOCK_INSUFFICIENT`, `IDEMPOTENCY_CONFLICT`, `STATE_CONFLICT`, `DUPLICATE_DOCUMENT`, `RESOURCE_IN_USE`, `CONCURRENT_UPDATE`, `LAST_MANAGER`, `SELF_CHANGE_FORBIDDEN`, `BELOW_COST`, `INTERNAL_ERROR`).
- **Venda:** `POST /sales/orders` exige `Idempotency-Key`; o hash SHA-256 do corpo distingue repetição (200, mesmo pedido) de conflito (409 `IDEMPOTENCY_CONFLICT`). Preço, desconto, total e vendedor nunca vêm do cliente.
- **Conformidade publicada (24/10/2026):** o OpenAPI gerado contém as 58 operações com os mesmos códigos de sucesso, mas omite 109 das 201 respostas de erro do contrato (achado A-02).

Operações por recurso: capítulo 5, quadro “Operações do contrato v5 por recurso e papel”; casos de uso e operações: Apêndice E.

## 5. Banco de dados

| Objeto | Quantidade |
| --- | ---: |
| Tabelas | 19 |
| Colunas | 162 (77 anuláveis) |
| *Views* | 18 |
| Funções | 13 |
| Gatilhos | 8 (3 de restrição, adiados até o COMMIT) |
| Restrições `CHECK` | 52 |
| Chaves estrangeiras | 32 (uma com `ON DELETE CASCADE`) |
| Restrições `UNIQUE` | 13 |
| Índices | 48 (mais 2 da tabela do Flyway) |

Mecanismos principais: reserva atômica de estoque (`UPDATE ... WHERE on_hand - reserved >= q`); itens processados em ordem de `product_id`; custo médio ponderado por gatilho; histórico de preço por gatilho com autor e motivo; soma das metas conferida no COMMIT; pelo menos um gerente ativo garantido por gatilho; apenas os quatro últimos dígitos do cartão armazenados; *views* para realizado, faturamento, margens, desempenho e posição de estoque; RLS demonstrativa em `docs/bd/pacote-sql/03_rbac.sql`.

Dicionário completo: `SBI_DICIONARIO_DE_DADOS.xlsx` e Apêndice D. Modelos: `diagramas/D05` (conceitual), `D06` (lógico), `D07a/b/c` (físico).

## 6. Execução local

Pilha completa (Docker Desktop):

```bash
export SBI_DEMO_PASSWORD='<senha das contas de demonstração, 8 a 72 caracteres>'
export SBI_DB_PASSWORD="$(openssl rand -hex 16)"
docker compose -f docker-compose.demo.yml -p sbi-demo up --build
# interface: http://localhost:3000 · banco: 127.0.0.1:5433 (sbi_demo / sbi)
```

Somente o banco e o pacote SQL, sem Docker (procedimento usado em 24/10/2026, diretório `reproducao/`):

```bash
export PGHOST=<socket> PGPORT=<porta> PGUSER=<superusuário de teste>
./reproducao/apply_migrations.sh <repositório> order_management_test
cp reproducao/run_bd_local.sh <repositório>/docs/bd/pacote-sql/
cd <repositório>/docs/bd/pacote-sql
DB=order_management_test SUPERUSER=<superusuário de teste> bash run_bd_local.sh   # esperado: PASS 61, FAIL 0
```

Variáveis da API: `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` (obrigatória), `SPRING_PROFILES_ACTIVE`, `SBI_DEMO_PASSWORD` ou `SBI_DEMO_PASSWORD_<NOME>`, `SESSION_COOKIE_SECURE`, `SPRING_JPA_SHOW_SQL`. Interface: `BACKEND_ORIGIN` (gravada no build). Nenhum valor de segredo fica no repositório.

Manual completo de instalação: Apêndice I. Manual do usuário: Apêndice J.

## 7. Testes e qualidade

| Suíte | Comando | Resultado em 24/10/2026 |
| --- | --- | --- |
| Pacote SQL (job `bd`) | `run_bd.sh` / `run_bd_local.sh` | 61/61 (PostgreSQL 16.15) |
| Massa Olist por SQL | `07`, `08`, `09` do pacote | 7/7 |
| Validadores de contrato | `npm test` (raiz) | 47/47 |
| Auditoria do contrato v5 | `audit-contract.mjs`, `validate-contract.mjs` | 0 erros; 236 esquemas |
| Frontend | `npm run typecheck`, `npm test` | tipos aprovados; 41/42 (CT-WEB-124 depende da versão do Node) |
| Ambiente publicado | GET sem credenciais | 5/5 |
| Java unitários e integração | `./mvnw -q verify`, `scripts/test.ps1 -Mode Integration` | não reexecutados localmente; aprovados na CI do commit `6046904` (execução 39668791724); 233 e 649 documentados |
| Contrato ao vivo, E2E e axe | `scripts/test-contract.ps1 -HttpOnly -Frontend` | não reexecutados localmente; aprovados na mesma execução da CI; 58/58 e 24/24 documentados |
| Fumaça do ambiente publicado | *workflow* `published-smoke.yml` | sem execução registrada no GitHub Actions; 5/5 documentado em 15/10 |

Métricas R0 (06/10) → R1 (14/10), recalculadas dos relatórios versionados em `reports/metricas/`: testes 17 → 544; cobertura de instruções 33,3% → 93,1%; de *branches* 10,0% → 80,5%; de linhas 32,6% → 90,4%; PMD 44 → 105; CPD 9 → 18 blocos; SpotBugs 46 → 83, nenhum de prioridade alta.

Casos, rastreabilidade, defeitos e achados: `SBI_PLANO_DE_TESTES.xlsx` e Apêndices A, B, F, G e H.

## 8. Avatares dos usuários (em integração)

Atualização em 25/10/2026: integrado (`864e0dd`) e publicado, junto com as contas dos docentes; ver o Apêndice M do relatório.

O *pull request* nº 47 (`feat/user-profile-avatars`, commit `a54635d`, aberto em 24/10/2026) acrescenta avatares aos perfis e reações animadas às operações; não está na produção (seção 10.13 do relatório).

| Pessoa | Avatar | Associação |
| --- | --- | --- |
| Matheus Henrique Dias Siqueira | 21 | `matheussiqueira@sbi.tech` (gerente) |
| Gabriel Sousa Vasconcelos | 26 | `gabrielsousa@sbi.tech` (gerente) |
| Allan Gabriel Almeida Barros | 12 | `allanbarros@sbi.tech` (vendedor) |
| Francisco Miguel de Lemos Sena Ferreira | 9 | `franciscoferreira@sbi.tech` (vendedor) |
| Paulo Thiago Gomes da Silva | 18 | nome completo (sem conta) |
| Christian Felix Gbedande Azonyetin | 13 | nome completo (sem conta) |
| Bruno Marciano de Amorim Josino | 19 | nome completo (sem conta) |

- **Arquivos:** `frontend/lib/user-avatars.ts` (catálogo), `frontend/lib/avatar-reactions.ts` (regras), `frontend/components/user-avatar.tsx` (componente), `frontend/components/avatar-motion-toggle.tsx` (pausa), `frontend/app/providers.tsx` (`MutationCache`), imagens em `frontend/public/avatares/` e `frontend/public/avatares/expressoes/`.
- **Movimento:** animações e transições CSS e temporizadores; sem biblioteca de animação. Expressões: repouso, sorriso, surpresa, atenção e piscadela, em imagens pré-renderizadas.
- **Reações da própria conta:** atenção durante a operação; sorriso em alteração salva, pedido criado ou pagamento confirmado; surpresa em `STOCK_INSUFFICIENT` ou `DISCOUNT_ABOVE_LIMIT`; atenção em cancelamento e demais falhas (3,2 s); piscadela a cada clique nas telas internas.
- **Acessibilidade:** botão de 44 × 44 px com nome acessível; “Pausar avatares”; respeito a `prefers-reduced-motion`; imagens decorativas com o nome em texto.
- **Verificação:** 11/11 testes unitários de avatar (52/53 da suíte; falha só no CT-WEB-124); E2E `avatars.spec.ts` aprovado na CI do PR; 54/54 com as correções propostas aplicadas sobre o PR.
- **Antes de integrar:** confirmar os termos de uso das imagens (arquivo comunitário do Figma), resolver a falha de provisionamento na Vercel e cadastrar no catálogo os e-mails dos docentes quando as contas forem criadas.

## 9. Pontos de atenção

| ID | Ponto | Ação recomendada |
| --- | --- | --- |
| A-04 | `next` 16.3.8 com avisos críticos publicados em 22/10/2026 | Aplicar a correção preparada (`next` 16.4.3) e confirmar build e E2E na CI |
| A-02 | OpenAPI publicado sem 109 respostas de erro do contrato | Anotar as respostas nos controladores e comparar erros no `live-contract.mjs` |
| A-08 | Contas de avaliação dos docentes inexistentes no banco publicado | Criar as contas e entregar as senhas por canal seguro |
| A-07 | Pasta oficial do Drive editável por qualquer pessoa com o link | Restringir a leitores nomeados |
| A-05 | Páginas sem CSP e proteção contra enquadramento | Aplicar a correção preparada (cabeçalhos em `next.config.mjs`) |
| A-03, A-12, A-16 | Formatação compacta dependente do Node; `show-sql` ativo no perfil padrão; barra de meta sem meta | Aplicar as correções preparadas |
| A-17 | Bloqueio por conta sem limitação por origem | Limitar tentativas por origem e usar bloqueio progressivo |
| A-01, A-09, A-13, A-14 | Documentação, relatório de contrato ao vivo, defeitos e Trello desatualizados | Atualizar antes da apresentação |

Lista completa dos 17 achados e roteiro de evolução: capítulo 15 e Apêndice H. As correções preparadas para A-03, A-04, A-05, A-12 e A-16 estão em `correcoes-propostas/`, com instruções de aplicação; não foram enviadas ao repositório.
