# SBI — Super Business Intelligence

Sistema de loja com **venda no balcão** (vendedor), **gestão** (gerente) e **visão executiva** (CEO), feito no projeto A3 de Garantia da Qualidade de Software e Banco de Dados (UNIFG). O tema é a conformidade de contrato da API REST: o que o OpenAPI promete é o que a API entrega. A conformidade é verificada ao vivo, com Bean Validation, um formato único de erro e testes em todas as camadas.

Trabalho A3 · SBI — Super Business Intelligence, feito pelos alunos Allan Gabriel Almeida Barros (RA 1352524052), Gabriel Sousa Vasconcelos (RA 13526110176), Francisco Miguel de Lemos Sena Ferreira (RA 1352523939) e Matheus Henrique Dias Siqueira (RA 1352623492). O mesmo crédito aparece em todas as telas do sistema.

## O que tem

- **PDV**: busca por SKU ou nome, carrinho com preço e desconto calculados no servidor, Pix, cartão (só os 4 últimos dígitos) ou boleto, retirada ou entrega, reserva de estoque na venda e baixa na confirmação do pagamento.
- **Clientes**: pessoa física e jurídica com dígito verificador (CNPJ numérico ou alfanumérico), documento mascarado para o vendedor, histórico de pedidos e perfil com indicadores de compra.
- **Backoffice do gerente**: produtos e insumos, categorias, preço com motivo e histórico, entradas com custo médio, ajustes com motivo, estoque mínimo e extrato.
- **Gestão**: faturamento, lucro e margem ("Não informado" quando falta custo), metas da loja e da equipe, Meu desempenho, estornos, promoções, desconto manual com alçada (vendedor 5%, gerente 20%) e análises, com exportação do recorte em Excel (`.xlsx` e `.xls`) e CSV — abas Resumo, Vendas e Metas geradas no servidor, a partir das mesmas views dos indicadores, com período inicial e final, atalhos de data e os filtros da tela.
- **Usuários**: cadastro pelo gerente com senha provisória, papel, situação, equipe do vendedor, desbloqueio e redefinição de senha; a sessão do usuário cai na requisição seguinte a qualquer mudança de papel, situação ou senha, e sempre existe um gerente ativo. Conta de CEO só é criada ou alterada por outro CEO.
- **Visão do CEO**: painel executivo com filtros cruzados e drill-down (ano > mês > dia) — faturamento, lucro e preço de compra, mês atual × mês anterior, ano × ano anterior, ranking de vendedores e de produtos, categorias, formas de pagamento, curva ABC, destaques automáticos e exportação CSV — e metas em quatro níveis: anual da loja, mensal, por gerente (soma da equipe) e por vendedor.
- **Segurança**: sessão HttpOnly + CSRF, hierarquia CEO > GERENTE > VENDEDOR em três barreiras (URL, método e dono do dado), bloqueio após 5 falhas de login (contador atômico) e matriz de acesso executável.

## Stack

| Camada | Tecnologia |
| --- | --- |
| API | Java 25, Spring Boot 4.1, Spring Security 7, `JdbcClient` nos módulos novos e JPA no legado, Springdoc |
| Banco | PostgreSQL 18, Flyway V1–V13 (única fonte do esquema, Hibernate em `validate`), views do V6, do V9 e do V12 para os painéis, o resumo do cliente e o painel executivo |
| Frontend | Next.js 16, React 19, TypeScript estrito, Zod 4 gerado do contrato (orval), TanStack Query, identidade visual SBI v2.0 (temas claro e escuro) |
| Testes | JUnit 5, MockMvc, PostgreSQL 18 descartável via Docker Compose (`docker-compose.test.yml`, porta 15432), Playwright + axe, Ajv para o contrato, pacote SQL por `psql` |

Detalhes em [docs/02-arquitetura/arquitetura.md](docs/02-arquitetura/arquitetura.md) e versões em [docs/06-decisoes/stack.md](docs/06-decisoes/stack.md).

## Duas edições

A mesma base serve o trabalho acadêmico e a oferta comercial, pela variável `NEXT_PUBLIC_SBI_EDICAO`:

- **acadêmica** (padrão): `/` leva cada perfil para a sua área e manda quem não tem sessão para o login. É o
  comportamento descrito no restante deste README.
- **comercial**: `/` é a página pública da oferta, que renderiza sem sessão e sem chamar a API do PDV, com
  `/privacidade`, `/suporte` e a captação de cotações em `/api/cotacao`, independente do banco do PDV.

O guia das edições e de todas as variáveis está em
[docs/05-operacao/edicoes-e-variaveis.md](docs/05-operacao/edicoes-e-variaveis.md); o estado de cada frente, com
o que já foi verificado e o que depende de operação externa, em
[docs/05-operacao/aceite-comercial.md](docs/05-operacao/aceite-comercial.md).

## Ambiente publicado

[Entrar no SBI](https://sbi-app-alpha.vercel.app/entrar) abre o sistema autenticado no navegador, com frontend na Vercel, API no Render e banco no Neon. O banco de apresentação reúne o seed e a massa Olist, com o catálogo Apple e histórico de pedidos públicos anonimizados. Use as contas combinadas com a equipe. O primeiro acesso à API pode demorar quando o serviço gratuito do Render está ocioso. Consulte o [guia de publicação e manutenção](docs/05-operacao/deploy.md).

[Explorar demonstração](https://sbi-app-alpha.vercel.app/demo) abre a simulação pública com o catálogo Apple e os três níveis de gestão. Ela roda no navegador, com vendas e metas simuladas nesta aba. Consulte a [demonstração pública](docs/01-produto/demonstracao-publica.md).

Cada push na `main` publica sozinho a API (Render) e o frontend (Vercel). Cada pull request ganha uma branch própria do banco no Neon, migrada pelo Flyway, que some quando o PR fecha.

## Executar localmente sem Docker

O [guia de execução nativa](docs/05-operacao/execucao-local.md) cobre PowerShell e Bash com JDK 25, Node.js 24 e PostgreSQL 18. Ele mostra como aplicar o Flyway, carregar a massa Apple com `psql` e subir o frontend. Abra [Entrar no SBI local](http://127.0.0.1:3000/entrar) depois que a stack estiver pronta.

## Subir tudo com Docker

Use Docker com Compose. A stack de apresentação sobe PostgreSQL, API e frontend localmente, sem depender da partida a frio do Render. O banco descartável em memória recebe o seed demo com contas, catálogo base e vendas.

```powershell
$env:SBI_DEMO_PASSWORD = 'escolha-uma-senha'   # senha das contas demo, de 8 a 72 caracteres
$env:SBI_DB_PASSWORD = [guid]::NewGuid().ToString('N')
docker compose -f docker-compose.demo.yml -p sbi-demo up --build --wait
```

No Linux ou no macOS:

```bash
export SBI_DEMO_PASSWORD='escolha-uma-senha'
export SBI_DB_PASSWORD="$(openssl rand -hex 16)"
docker compose -f docker-compose.demo.yml -p sbi-demo up --build --wait
```

Abra [Entrar no SBI local](http://127.0.0.1:3000/entrar) quando o Compose estiver pronto. Encerre com `docker compose -f docker-compose.demo.yml -p sbi-demo down`. O banco em memória é descartado ao parar o contêiner.

### Contas de demonstração

As contas abaixo valem para os modos locais. Cada conta usa a senha da sua variável (`SBI_DEMO_PASSWORD_MATHEUS`, `_GABRIEL`, `_ALLAN`, `_FRANCISCO`, `_PAULO`, `_CHRISTIAN` e `_BRUNO`) ou, sem ela, a de `SBI_DEMO_PASSWORD`. As senhas não ficam no repositório: defina-as no terminal ou num `.env` ao lado do `docker-compose.demo.yml` (ignorado pelo git).

| Conta | Perfil |
| --- | --- |
| `paulo@sbi.tech`, `christian@sbi.tech`, `bruno@sbi.tech` (professores avaliadores) | CEO |
| `matheussiqueira@sbi.tech`, `gabrielsousa@sbi.tech` | Gerente |
| `allanbarros@sbi.tech` (equipe de Matheus), `franciscoferreira@sbi.tech` (equipe de Gabriel) | Vendedor |

### Massa de demonstração (Olist) e acesso ao banco por SQL

Para mostrar um histórico de clientes volumoso (60 clientes, 219 pedidos, recorte do conjunto público da Olist, CC BY-NC-SA 4.0, com o catálogo trocado por 42 produtos Apple a preço de mercado), carregue a massa por SQL depois de subir a stack:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\demo-olist.ps1 -Check
```

O banco de demonstração fica acessível só nesta máquina, para o painel Database do IntelliJ, o DBeaver ou o `psql`: `jdbc:postgresql://127.0.0.1:5433/sbi_demo`, usuário `sbi`, senha de `SBI_DB_PASSWORD`. Detalhes em [docs/03-banco-de-dados/massa-demonstracao.md](docs/03-banco-de-dados/massa-demonstracao.md).

Para a apresentação de Banco de Dados, carregue também o cenário com as metas do ano, a operação em andamento e os dias fortes e fracos (`10_carga_apresentacao.sql`, aditivo e com data de referência configurável) e use os roteiros do pacote:

| Arquivo | Para que serve |
| --- | --- |
| `10_carga_apresentacao.sql` | grava o cenário: metas do ano com distribuição reconciliada em centavos, meta anual de CEO, pedidos pendentes, cancelado e estorno pelas funções do banco |
| `11_prova_banco.sql` | prova de banco em cinco passos: versão e dicionário, CRUD em transação com `ROLLBACK`, cinco recusas de integridade e as consultas analíticas com controle do grão do `JOIN` |
| `08_crud_clientes_olist.sql` | roteiro de CRUD e consultas sobre a massa Olist |
| `run_apresentacao.sh` | confere tudo: carga duas vezes, fotografia igual, testes do cenário e a prova completa (17 PASS) |

O passo a passo está em [preparar a apresentação](docs/03-banco-de-dados/preparar-apresentacao.md) e o que mostrar à banca em [roteiro da apresentação de Banco de Dados](docs/05-operacao/roteiro-banco-de-dados.md).

## Desenvolvimento no VS Code (um atalho)

Requisitos: Docker Desktop aberto, JDK 25 e Node. Com **Ctrl+Shift+B** (tarefa "SBI: iniciar tudo", em `.vscode/tasks.json`), o `scripts/dev.ps1` sobe um PostgreSQL descartável em `127.0.0.1:5434`, a API no perfil `demo` em <http://localhost:8080> e o frontend em <http://localhost:3000>, cada um no seu terminal. O banco de desenvolvimento é recriado a cada início. Se a porta 3000 estiver ocupada, o script informa a colisão. Para trocar do Compose para o VS Code, encerre a stack de apresentação explicitamente.

As senhas ficam em `.env.local` (fora do git), gerado na primeira execução: `SBI_DEMO_PASSWORD` é a senha das contas demo da tabela acima. Para encerrar, feche os terminais da tarefa e rode a tarefa "SBI: parar banco".

## Perfis da API

| Perfil | Uso |
| --- | --- |
| padrão | Desenvolvimento com o banco `postgres-order` (`docker compose up -d postgres`) e a senha em `SPRING_DATASOURCE_PASSWORD`. |
| `demo` | Aplica também `db/demo` (V6_1, contas da equipe com BCrypt de `SBI_DEMO_PASSWORD_<NOME>` ou `SBI_DEMO_PASSWORD`; V6_2, massa sintética; V11_1, promoção de Acessórios até dezembro; V11_2, custo da carga inicial de iPhone e AirPods; V12_1, contas de CEO dos professores e equipes de venda; V12_2, telefone e endereço completos dos clientes do seed). Precisa estar ativo desde a primeira migração do banco. |
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

A CI (`.github/workflows/ci.yml`) roda quatro jobs de teste, cada um com seus relatórios como artefato, e, nos pull requests, o job `hygiene`, que barra rodapé de coautoria, link de sessão e endereço antigo do site nas mensagens de commit e nos arquivos versionados:
- `test (backend)`;
- `bd`: Flyway, seed demo e pacote SQL com 61 PASS, mais 11 PASS da massa Olist e 17 PASS do cenário da apresentação (`run_apresentacao.sh`);
- `contract`: auditoria estática e verificação ao vivo das operações do contrato v6;
- `frontend`: typecheck, schemas sem diff, testes unitários, build, E2E e axe.

## Documentação

| Assunto | Documento |
| --- | --- |
| Mapa de toda a documentação, por tema, e onde estava cada arquivo | [docs/README.md](docs/README.md) |
| Arquitetura, fluxo de venda e segurança | [docs/02-arquitetura/arquitetura.md](docs/02-arquitetura/arquitetura.md) |
| Roteiro de demonstração (12 minutos) | [docs/05-operacao/roteiro-demonstracao.md](docs/05-operacao/roteiro-demonstracao.md) |
| Relatório final e entregas acadêmicas | [docs/08-entregas/relatorio-final.md](docs/08-entregas/relatorio-final.md) e [docs/08-entregas/](docs/08-entregas/README.md) (relatório acadêmico, planilhas, diagramas, evidências, pacote SQL entregue) |
| Requisitos, critérios e rastreabilidade | [docs/01-produto/requisitos.md](docs/01-produto/requisitos.md), [docs/01-produto/criterios-aceitacao.md](docs/01-produto/criterios-aceitacao.md), [docs/04-qualidade/rastreabilidade.md](docs/04-qualidade/rastreabilidade.md) |
| Plano de testes, defeitos e métricas | [docs/04-qualidade/plano-testes.md](docs/04-qualidade/plano-testes.md), [docs/04-qualidade/defeitos.md](docs/04-qualidade/defeitos.md), [reports/metricas/comparativo-r0-r1.md](reports/metricas/comparativo-r0-r1.md) |
| Modelo de dados e pacote SQL | [docs/03-banco-de-dados/modelo-erp-pdv.md](docs/03-banco-de-dados/modelo-erp-pdv.md), [docs/03-banco-de-dados/pacote-sql/](docs/03-banco-de-dados/pacote-sql/) |
| Decisões | [docs/06-decisoes/](docs/06-decisoes/) (ERP/PDV, evolução D-EVO, matriz de acesso, autenticação, dinheiro, stack) |
| Histórico | [docs/10-historico/](docs/10-historico/README.md) (Trello e planejamento, sessão de 04/10, rodadas de 03 a 09/10, contratos ao vivo v4 e v5) |
| Edição comercial | [Edições e variáveis](docs/05-operacao/edicoes-e-variaveis.md), [cotação e fila](docs/05-operacao/cotacao-e-fila.md), [implantação e catálogo](docs/05-operacao/implantacao-e-catalogo.md), [fotos de produto](docs/05-operacao/fotos-de-produto.md), [operação de suporte](docs/05-operacao/suporte-24-7.md), [disponibilidade e recuperação](docs/05-operacao/disponibilidade-e-recuperacao.md) e [aceite comercial](docs/05-operacao/aceite-comercial.md) |
| Identidade visual | Manual, design system, logotipos e mockups da v2 em [docs/07-marca/](docs/07-marca/LEIA-ME.md), aplicados nas telas (decisões D-MAR-01 a D-MAR-15); [reports/marca/](reports/marca/) guarda as capturas da marca v1.0, nos dois papéis anteriores ao perfil CEO |
| Contrato | [config/openapi/target-loja-gestao-openapi-2026-10-24-v6.json](config/openapi/target-loja-gestao-openapi-2026-10-24-v6.json) e Swagger em `/swagger-ui/index.html` |
| Rotas legadas (`/orders`, `/payment`, `/address`) | [docs/02-arquitetura/api-legada.md](docs/02-arquitetura/api-legada.md) |
