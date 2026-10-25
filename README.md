# SBI — Super Business Intelligence

Sistema de loja com **venda no balcão** (vendedor), **gestão** (gerente) e **visão executiva** (CEO), feito no projeto A3 de Garantia da Qualidade de Software e Banco de Dados (UNIFG). O tema é a conformidade de contrato da API REST: o que o OpenAPI promete é o que a API entrega. A conformidade é verificada ao vivo, com Bean Validation, um formato único de erro e testes em todas as camadas.

Trabalho A3 · SBI — Super Business Intelligence, feito pelos alunos Allan Gabriel Almeida Barros (RA 1352524052), Gabriel Sousa Vasconcelos (RA 13526110176), Francisco Miguel de Lemos Sena Ferreira (RA 1352523939) e Matheus Henrique Dias Siqueira (RA 1352623492). O mesmo crédito aparece em todas as telas do sistema.

## O que tem

- **PDV**: busca por SKU ou nome, carrinho com preço e desconto calculados no servidor, Pix, cartão (só os 4 últimos dígitos) ou boleto, retirada ou entrega, reserva de estoque na venda e baixa na confirmação do pagamento.
- **Clientes**: pessoa física e jurídica com dígito verificador (CNPJ numérico ou alfanumérico), documento mascarado para o vendedor, histórico de pedidos e perfil com indicadores de compra.
- **Backoffice do gerente**: produtos e insumos, categorias, preço com motivo e histórico, entradas com custo médio, ajustes com motivo, estoque mínimo e extrato.
- **Gestão**: faturamento, lucro e margem ("Não informado" quando falta custo), metas da loja e da equipe, Meu desempenho, estornos, promoções, desconto manual com alçada (vendedor 5%, gerente 20%) e análises.
- **Usuários**: cadastro pelo gerente com senha provisória, papel, situação, equipe do vendedor, desbloqueio e redefinição de senha; a sessão do usuário cai na requisição seguinte a qualquer mudança de papel, situação ou senha, e sempre existe um gerente ativo. Conta de CEO só é criada ou alterada por outro CEO.
- **Visão do CEO**: painel executivo com filtros cruzados e drill-down (ano > mês > dia) — faturamento, lucro e preço de compra, mês atual × mês anterior, ano × ano anterior, ranking de vendedores e de produtos, categorias, formas de pagamento, curva ABC, destaques automáticos e exportação CSV — e metas em quatro níveis: anual da loja, mensal, por gerente (soma da equipe) e por vendedor.
- **Segurança**: sessão HttpOnly + CSRF, hierarquia CEO > GERENTE > VENDEDOR em três barreiras (URL, método e dono do dado), bloqueio após 5 falhas de login (contador atômico) e matriz de acesso executável.

## Stack

| Camada | Tecnologia |
| --- | --- |
| API | Java 25, Spring Boot 4.1, Spring Security 7, `JdbcClient` nos módulos novos e JPA no legado, Springdoc |
| Banco | PostgreSQL 18, Flyway V1–V12 (única fonte do esquema, Hibernate em `validate`), views do V6, do V9 e do V12 para os painéis, o resumo do cliente e o painel executivo |
| Frontend | Next.js 16, React 19, TypeScript estrito, Zod 4 gerado do contrato (orval), TanStack Query, identidade visual SBI v2.0 (temas claro e escuro) |
| Testes | JUnit 5, MockMvc, PostgreSQL 18 descartável via Docker Compose (`docker-compose.test.yml`, porta 15432), Playwright + axe, Ajv para o contrato, pacote SQL por `psql` |

Detalhes em [docs/arquitetura.md](docs/arquitetura.md) e versões em [docs/decisoes/stack.md](docs/decisoes/stack.md).

## Ambiente publicado

A demonstração publicada roda em <https://sbi-app-alpha.vercel.app> (frontend na Vercel, API no Render, banco no Neon) e abre de qualquer navegador, sem instalar nada. **Os dados são de demonstração:** seed sintético e a massa Olist, com pedidos públicos anonimizados e nomes e documentos sintéticos; nenhuma pessoa real. Lá as contas são as dos integrantes da equipe (dois gerentes e dois vendedores) e as de CEO dos professores avaliadores, com e-mail e senha combinados com a equipe, fora do repositório; a tabela da seção seguinte vale para a stack local. O plano gratuito do Render dorme o serviço sem acesso: a primeira requisição pode levar de 1 a 3 minutos. Publicação, variáveis e manutenção: [docs/deploy.md](docs/deploy.md).

Cada push na `main` publica sozinho a API (Render) e o frontend (Vercel). Cada pull request ganha uma branch própria do banco no Neon, migrada pelo Flyway, que some quando o PR fecha.

## Subir tudo com Docker (um comando)

Requisito: Docker Desktop. O ambiente de demonstração usa um banco descartável em memória, separado do banco de desenvolvimento `postgres-order`, e já entra com o seed demo (contas, catálogo e vendas).

```powershell
$env:SBI_DEMO_PASSWORD = 'escolha-uma-senha'   # senha das contas demo, de 8 a 72 caracteres
$env:SBI_DB_PASSWORD = [guid]::NewGuid().ToString('N')
docker compose -f docker-compose.demo.yml -p sbi-demo up --build
```

No Linux ou no macOS:

```bash
export SBI_DEMO_PASSWORD='escolha-uma-senha'
export SBI_DB_PASSWORD="$(openssl rand -hex 16)"
docker compose -f docker-compose.demo.yml -p sbi-demo up --build
```

Abra <http://localhost:3000> e entre com uma das contas abaixo. Cada conta usa a senha da sua variável (`SBI_DEMO_PASSWORD_MATHEUS`, `_GABRIEL`, `_ALLAN`, `_FRANCISCO`, `_PAULO`, `_CHRISTIAN` e `_BRUNO`) ou, sem ela, a de `SBI_DEMO_PASSWORD`. As senhas não ficam no repositório: defina-as no terminal ou num `.env` ao lado do `docker-compose.demo.yml` (ignorado pelo git).

| Conta | Perfil |
| --- | --- |
| `paulo@sbi.tech`, `christian@sbi.tech`, `bruno@sbi.tech` (professores avaliadores) | CEO |
| `matheussiqueira@sbi.tech`, `gabrielsousa@sbi.tech` | Gerente |
| `allanbarros@sbi.tech` (equipe de Matheus), `franciscoferreira@sbi.tech` (equipe de Gabriel) | Vendedor |

Para encerrar e apagar tudo: `docker compose -f docker-compose.demo.yml -p sbi-demo down`.

### Massa de demonstração (Olist) e acesso ao banco por SQL

Para mostrar um histórico de clientes volumoso (60 clientes, 219 pedidos, recorte do conjunto público da Olist, CC BY-NC-SA 4.0, com o catálogo trocado por 42 produtos Apple a preço de mercado), carregue a massa por SQL depois de subir a stack:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\demo-olist.ps1 -Check
```

O banco de demonstração fica acessível só nesta máquina, para o painel Database do IntelliJ, o DBeaver ou o `psql`: `jdbc:postgresql://127.0.0.1:5433/sbi_demo`, usuário `sbi`, senha de `SBI_DB_PASSWORD`. O roteiro de CRUD da apresentação é `docs/bd/pacote-sql/08_crud_clientes_olist.sql`. Detalhes em [docs/bd/massa-demonstracao.md](docs/bd/massa-demonstracao.md).

## Desenvolvimento no VS Code (um atalho)

Requisitos: Docker Desktop aberto, JDK 25 e Node. Com **Ctrl+Shift+B** (tarefa "SBI: iniciar tudo", em `.vscode/tasks.json`), o `scripts/dev.ps1` sobe um PostgreSQL descartável em `127.0.0.1:5434`, a API no perfil `demo` em <http://localhost:8080> e o frontend em <http://localhost:3000>, cada um no seu terminal. O banco é recriado a cada início, e o stack `sbi-demo` é parado se estiver ocupando a porta 3000.

As senhas ficam em `.env.local` (fora do git), gerado na primeira execução: `SBI_DEMO_PASSWORD` é a senha das contas demo da tabela acima. Para encerrar, feche os terminais da tarefa e rode a tarefa "SBI: parar banco".

## Perfis da API

| Perfil | Uso |
| --- | --- |
| padrão | Desenvolvimento com o banco `postgres-order` (`docker compose up -d postgres`) e a senha em `SPRING_DATASOURCE_PASSWORD`. |
| `demo` | Aplica também `db/demo` (V6_1, contas da equipe com BCrypt de `SBI_DEMO_PASSWORD_<NOME>` ou `SBI_DEMO_PASSWORD`; V6_2, massa sintética; V11_1, promoção de Acessórios até dezembro; V11_2, custo da carga inicial de iPhone e AirPods; V12_1, contas de CEO dos professores e equipes de venda). Precisa estar ativo desde a primeira migração do banco. |
| `integration` (testes) | PostgreSQL descartável da porta 15432 (`docker-compose.test.yml`), com as tabelas de negócio esvaziadas por `TRUNCATE`. |
| `contract` | API isolada dos testes HTTP de contrato, com contas sintéticas e senha gerada por execução. |

Variáveis: `SPRING_DATASOURCE_PASSWORD` é obrigatória, e a API não sobe sem ela. `SESSION_COOKIE_SECURE=false` só vale para HTTP local. `BACKEND_ORIGIN` é a origem da API usada pelo frontend (padrão `http://127.0.0.1:8080`). Nenhuma senha fica no repositório.

## Testes

Execute no PowerShell, na raiz do repositório, com JDK 25 em `JAVA_HOME` e Docker ativo:

```powershell
.\mvnw.cmd -q verify                                                                        # unitários (233)
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test.ps1 -Mode Integration     # integração (649), JaCoCo, PMD, CPD, SpotBugs
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-contract.ps1 -HttpOnly -Frontend  # contrato ao vivo + E2E e axe
npm test; node scripts\audit-contract.mjs config\openapi\target-loja-gestao-openapi-2026-10-24-v6.json  # auditoria estática do contrato v6
cd frontend; npm run typecheck; npm run api:check; npm test; npm run build
node scripts\quality-metrics.mjs                                                           # métricas de target/ em reports\metricas\ultima (fora do Git)
```

A CI (`.github/workflows/ci.yml`) roda quatro jobs de teste, cada um com seus relatórios como artefato, e, nos pull requests, o job `hygiene`, que barra rodapé de coautoria, crédito a ferramenta e endereço antigo do site nas mensagens de commit e nos arquivos versionados:
- `test (backend)`;
- `bd`: Flyway, seed demo e pacote SQL com 61 PASS, mais 11 PASS da massa Olist;
- `contract`: auditoria estática e verificação ao vivo das 61 operações do contrato v6;
- `frontend`: typecheck, schemas sem diff, testes unitários, build, E2E e axe.

## Documentação

| Assunto | Documento |
| --- | --- |
| Arquitetura, fluxo de venda e segurança | [docs/arquitetura.md](docs/arquitetura.md) |
| Roteiro de demonstração (12 minutos) | [docs/roteiro-demonstracao.md](docs/roteiro-demonstracao.md) |
| Relatório final com números reais | [docs/relatorio-final.md](docs/relatorio-final.md) |
| Requisitos, critérios e rastreabilidade | [docs/requisitos.md](docs/requisitos.md), [docs/criterios-aceitacao.md](docs/criterios-aceitacao.md), [docs/rastreabilidade.md](docs/rastreabilidade.md) |
| Plano de testes, defeitos e métricas | [docs/plano-testes.md](docs/plano-testes.md), [docs/defeitos.md](docs/defeitos.md), [reports/metricas/comparativo-r0-r1.md](reports/metricas/comparativo-r0-r1.md) |
| Modelo de dados e pacote SQL | [docs/bd/modelo-erp-pdv.md](docs/bd/modelo-erp-pdv.md), [docs/bd/pacote-sql/](docs/bd/pacote-sql/) |
| Decisões | [docs/decisoes/](docs/decisoes/) (ERP/PDV, evolução D-EVO, matriz de acesso, autenticação, dinheiro, stack) |
| Histórico | [docs/historico/](docs/historico/) (Trello e planejamento, sessão de 04/10, rodadas de 03 a 09/10, contratos ao vivo v4 e v5) |
| Identidade visual | Manual SBI v2.0 aplicado ([docs/arquitetura.md](docs/arquitetura.md), decisões D-MAR-01 a D-MAR-15); [reports/marca/](reports/marca/) guarda as capturas da marca v1.0, nos dois papéis anteriores ao perfil CEO |
| Contrato | [config/openapi/target-loja-gestao-openapi-2026-10-24-v6.json](config/openapi/target-loja-gestao-openapi-2026-10-24-v6.json) e Swagger em `/swagger-ui/index.html` |
| Rotas legadas (`/orders`, `/payment`, `/address`) | [docs/api-legada.md](docs/api-legada.md) |
