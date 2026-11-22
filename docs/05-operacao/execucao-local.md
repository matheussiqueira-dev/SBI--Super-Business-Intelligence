# Executar o SBI sem Docker

O sistema autenticado usa três processos locais. PostgreSQL 18 guarda os dados, a API Spring Boot aplica o Flyway e o Next.js serve a interface e encaminha `/api/backend` para a API. A primeira instalação das dependências usa a internet.

Instale JDK 25, Node.js 24 com npm e PostgreSQL 18 com `createdb` e `psql` disponíveis no `PATH`. Configure `JAVA_HOME` para o JDK 25 e inicie o PostgreSQL. Os exemplos usam a porta 5432 e o papel local `postgres`. Se a sua instalação usar outro papel ou porta, ajuste todos os comandos e a URL JDBC. Use um papel com permissão para criar e possuir o banco de demonstração.

## 1. Criar o banco e iniciar a API

Na raiz do repositório, crie um banco dedicado chamado `sbi_demo`. Faça isso uma vez. O perfil `demo` aplica suas migrações desde o primeiro início e lê as senhas das contas nessa etapa. Um banco que já recebeu as migrações do perfil padrão deve usar outro banco vazio para a demonstração.

No PowerShell 7:

```powershell
createdb -h 127.0.0.1 -p 5432 -U postgres -W sbi_demo
$env:SPRING_PROFILES_ACTIVE = 'demo'
$env:SPRING_DATASOURCE_URL = 'jdbc:postgresql://127.0.0.1:5432/sbi_demo'
$env:SPRING_DATASOURCE_USERNAME = 'postgres'
$env:SPRING_DATASOURCE_PASSWORD = Read-Host 'Senha do PostgreSQL local' -MaskInput
$env:SBI_DEMO_PASSWORD = Read-Host 'Senha das contas demo locais' -MaskInput
$env:SESSION_COOKIE_SECURE = 'false'
.\mvnw.cmd -q -DskipTests package
java -jar target/order-management-spring-0.0.1-SNAPSHOT.jar --server.address=127.0.0.1 --server.port=8080
```

No Bash (Linux ou macOS):

```bash
createdb -h 127.0.0.1 -p 5432 -U postgres -W sbi_demo
export SPRING_PROFILES_ACTIVE=demo
export SPRING_DATASOURCE_URL='jdbc:postgresql://127.0.0.1:5432/sbi_demo'
export SPRING_DATASOURCE_USERNAME=postgres
read -rsp 'Senha do PostgreSQL local: ' SPRING_DATASOURCE_PASSWORD
printf '\n'
read -rsp 'Senha das contas demo locais: ' SBI_DEMO_PASSWORD
printf '\n'
export SPRING_DATASOURCE_PASSWORD SBI_DEMO_PASSWORD
export SESSION_COOKIE_SECURE=false
bash ./mvnw -q -DskipTests package
java -jar target/order-management-spring-0.0.1-SNAPSHOT.jar --server.address=127.0.0.1 --server.port=8080
```

A senha das contas demo precisa de pelo menos 8 caracteres e no máximo 72 bytes. Para usar senhas por conta, configure `SBI_DEMO_PASSWORD_MATHEUS`, `_GABRIEL`, `_ALLAN`, `_FRANCISCO`, `_PAULO`, `_CHRISTIAN` e `_BRUNO` antes da primeira migração. Se apenas algumas variáveis específicas estiverem definidas, as demais contas usam `SBI_DEMO_PASSWORD`. Use `SESSION_COOKIE_SECURE=false` apenas no HTTP de loopback.

## 2. Carregar o catálogo Apple e o histórico Olist

Quando a API responder HTTP 200 em `http://127.0.0.1:8080/auth/csrf`, abra outro terminal. A partir da raiz do repositório, os comandos são os mesmos no PowerShell e no Bash:

```sh
cd docs/03-banco-de-dados/pacote-sql
psql -X -h 127.0.0.1 -p 5432 -U postgres -d sbi_demo -W -v ON_ERROR_STOP=1 -f 07_carga_olist.sql
```

Em seguida, para a apresentação, carregue o cenário com as metas do ano, a operação em andamento e os dias fortes e fracos (aditivo: preserva a massa e refaz só o que ele mesmo criou):

```sh
psql -X -h 127.0.0.1 -p 5432 -U postgres -d sbi_demo -W -v ON_ERROR_STOP=1 -f 10_carga_apresentacao.sql
```

Sem `-v ref`, a data de referência é hoje em `America/Fortaleza`; para fixar um dia, use `-v ref=2026-11-18` — a data tem de ser passada ou hoje, porque a carga recusa referência no futuro. O [guia de preparação](../03-banco-de-dados/preparar-apresentacao.md) detalha o que o cenário grava e como conferir tudo de uma vez.

A carga registra 42 SKUs Apple, 60 clientes, 219 pedidos pagos e 237 itens. Ela recria os registros da massa, inclusive pedidos associados aos SKUs `OL-*`. Use-a em um banco de demonstração dedicado e descarte os dados do ensaio somente quando decidir reiniciar esse banco. O [guia da massa](../03-banco-de-dados/massa-demonstracao.md) detalha o pacote SQL.

## 3. Iniciar o frontend e conferir

Em outro terminal, a partir da raiz do repositório, use uma das opções:

```powershell
cd frontend
$env:BACKEND_ORIGIN = 'http://127.0.0.1:8080'
npm.cmd ci
npm.cmd run build
npm.cmd run start -- --hostname 127.0.0.1 --port 3000
```

```bash
cd frontend
export BACKEND_ORIGIN='http://127.0.0.1:8080'
npm ci
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

Use a mesma `BACKEND_ORIGIN` no build e no start. Abra [Entrar no SBI](http://127.0.0.1:3000/entrar) e escolha uma conta da [tabela de perfis](../../README.md#contas-de-demonstração). O proxy deve responder HTTP 200 em `http://127.0.0.1:3000/api/backend/auth/csrf`. No sistema, confirme o catálogo Apple em Vender e os vínculos de Allan a Matheus e Francisco a Gabriel em Gestão → Usuários. A [demonstração pública local](http://127.0.0.1:3000/demo) tem seu próprio catálogo estático e funciona com apenas o frontend.

Para encerrar os processos Java e Next.js, pressione Ctrl+C nos terminais correspondentes. O PostgreSQL nativo conserva o banco entre execuções. Para usar o ambiente descartável de apresentação, siga o [modo com Docker Compose](../../README.md#subir-tudo-com-docker).

---

## 4. Ensaio nativo no Windows, medido em 19/11/2026

Esta seção registra um ensaio real deste modo, com as versões, os comandos, as portas e os resultados efetivos. Ele rodou **em paralelo** ao ambiente da banca (PostgreSQL em contêiner na 5435, API na 8080, frontend na 3000), em portas e diretórios exclusivos, sem tocar nele.

| Peça | Valor medido |
| --- | --- |
| Binários | `postgresql-18.7-1-windows-x64-binaries.zip` do EDB, 389.515.503 B, sha256 `ead0bbc27fb678fa24dcf86b738981323042abd073c744103bf7f3aed23f9a33`, extraído em `E:\pg18-ensaio\pgsql` |
| Servidor | **PostgreSQL 18.7 on x86_64-windows** (msvc-19.44), `PGDATA` em `E:\pg18-ensaio\data`, porta **5436**, apenas `127.0.0.1` |
| Locale do cluster | `UTF8`, provedor **ICU** com `en-US`; as categorias de libc ficam no padrão do Windows (`Portuguese_Brazil.1252`) |
| Autenticação | `scram-sha-256` para `127.0.0.1`, senha do superusuário gerada e guardada fora do repositório |
| Serviço do Windows | **nenhum** — `Get-Service *postgre*` devolve 0; o servidor roda em primeiro plano num terminal |
| JDK | Temurin **25.0.4.1+1** portátil; o `JAVA_HOME` é `E:\Programação\A3\tmp\tools\jdk-25\jdk-25.0.4.1+1`, não a pasta `jdk-25` que o contém — apontar para a de cima faz o `mvnw` parar com "JAVA_HOME ... is not defined correctly". É o caminho que o `scripts/test.ps1` monta sozinho |
| Node | **24.19.0** |
| API nativa | porta **8081**, perfil `demo`, jar `target/order-management-spring-0.0.1-SNAPSHOT.jar` |
| Frontend nativo | porta **3001**, build de produção (`next start`), `BACKEND_ORIGIN=http://127.0.0.1:8081` |

### Subir o cluster sem instalador e sem serviço

Os binários oficiais em `.zip` não instalam nada: basta extrair. A configuração vai toda na linha de comando, então o `postgresql.conf` do cluster fica como o `initdb` o deixou.

O `--pwfile` aponta para um arquivo de uma linha só com a senha do superusuário: crie-o antes e apague-o depois do `initdb`. Assim a senha não entra no comando nem no histórico do terminal.

```powershell
E:\pg18-ensaio\pgsql\bin\initdb.exe -D E:\pg18-ensaio\data -U postgres --pwfile=E:\pg18-ensaio\senha-postgres.txt --auth-host=scram-sha-256 --encoding=UTF8 --locale-provider=icu --icu-locale=en-US
```

```powershell
E:\pg18-ensaio\pgsql\bin\postgres.exe -D E:\pg18-ensaio\data -p 5436 -c listen_addresses=127.0.0.1 -c timezone=UTC -c log_timezone=UTC -c lc_messages=C
```

Pare o servidor com `E:\pg18-ensaio\pgsql\bin\pg_ctl.exe -D E:\pg18-ensaio\data -m fast stop` **antes** de fechar o terminal. Fechar a janela deixa o `postmaster` órfão: o `pg_ctl` passa a dizer que nenhum servidor está executando, a porta continua ocupada e a próxima subida morre com `pre-existing shared memory block is still in use`.

Depois, crie o banco vazio e siga as seções 1 a 3 trocando a porta:

```powershell
E:\pg18-ensaio\pgsql\bin\psql.exe -h 127.0.0.1 -p 5436 -U postgres -d postgres -c "CREATE DATABASE sbi_demo OWNER postgres"
```

### Três coisas que o Windows exige e o Linux não

- **`-c lc_messages=C` não é enfeite.** O `initdb` herda o locale do sistema, e um cluster em português responde `ERRO:` e `NOTA:` em vez de `ERROR:` e `NOTICE:`. O pacote SQL conta mensagens `ERROR:` para provar que o banco recusou o que devia recusar: sem essa opção, o CT-DEMO-06 falha com as três recusas tendo acontecido. Medido. As legendas do próprio `psql` (`(1 linha)`) seguem o locale do cliente e não afetam o pacote.
- **O Git Bash converte caminhos POSIX em caminhos do Windows** ao chamar o `docker.exe`: `--tmpfs /var/lib/postgresql` morre com `invalid mount path: 'C'` e `-w /tmp/pacote-sql` com `Cwd must be an absolute path`. Use `MSYS_NO_PATHCONV=1` antes do `docker run`. Nos runners do pacote o `cd` já vai dentro de um `sh -c`, que resolve o caso deles.
- **O frontend do ensaio precisa de uma cópia própria.** Dois `next` no mesmo diretório disputam o `.next`, e o Turbopack não compila fora da raiz do workspace — uma *junction* de `node_modules` apontando para fora dessa raiz quebra o build. O ensaio rodou numa cópia em `E:\pg18-ensaio\frontend-nativo`, com `.next` e `node_modules` próprios.

### Carga e prova pelo psql nativo

**Dois** dos três runners aceitam o modo nativo: `run_olist_bd.sh` e `run_apresentacao.sh`. Sem `CONTAINER`, eles usam o `psql` do `PATH` e as variáveis `PGHOST`, `PGPORT` e `PGPASSWORD` do ambiente, em vez de `docker exec`. O `run_bd.sh` continua só no contêiner, pelo motivo da última linha da tabela abaixo.

Os binários extraídos não entram no `PATH` sozinhos, e a API embutida que o `run_olist_bd.sh` sobe para o CT-DEMO-05 entra no banco pelo JDBC, com a senha em `SPRING_DATASOURCE_PASSWORD` — `PGPASSWORD` não serve para ela.

O CT-DEMO-05 também **entra como Allan e como Matheus** pela API, então precisa de `SBI_DEMO_PASSWORD`, e tem de ser a mesma senha de quando o Flyway criou as contas neste banco: a `V6_1__DemoAccounts` grava o BCrypt dela na migração. Sem a variável, o `scripts/demo-olist-api.mjs` para antes da primeira requisição (`Defina SBI_DEMO_PASSWORD`) e a bateria fecha em **7 PASS**, não 11 — com o `run_olist_bd.sh` saindo com código 1. No Git Bash:

```bash
export PATH="/e/pg18-ensaio/pgsql/bin:$PATH"
read -rsp 'Senha do superusuário do cluster nativo: ' PGPASSWORD
printf '\n'
read -rsp 'Senha das contas demo locais: ' SBI_DEMO_PASSWORD
printf '\n'
export PGHOST=127.0.0.1 PGPORT=5436 PGPASSWORD SBI_DEMO_PASSWORD
export SPRING_DATASOURCE_PASSWORD="$PGPASSWORD"
```

```bash
DB=sbi_demo SUPERUSER=postgres JAR=target/order-management-spring-0.0.1-SNAPSHOT.jar JDBC_URL=jdbc:postgresql://127.0.0.1:5436/sbi_demo bash docs/03-banco-de-dados/pacote-sql/run_olist_bd.sh
```

```bash
DB=sbi_demo SUPERUSER=postgres bash docs/03-banco-de-dados/pacote-sql/run_apresentacao.sh
```

| Etapa | Resultado medido |
| --- | --- |
| `run_olist_bd.sh` (07 duas vezes, 08, 09 e CT-DEMO-05 pela API nativa, que ele mesmo sobe na porta **18081**) | **11 PASS, 0 FAIL, 0 ERROS** |
| `run_apresentacao.sh` (10 duas vezes, 12 e a prova 11), `ref=2026-11-19` | **17 PASS, 0 FAIL, 0 ERROS** |
| Prova de banco 11 | rodou inteira, com as cinco recusas esperadas na ordem |
| `run_bd.sh` | **não roda nativo**: ele entra como os papéis de banco `vendedor_allan`, `vendedor_francisco` e `gerente_matheus`, criados sem senha. No contêiner isso funciona pelo socket local em `trust`; no Windows não há socket local e o `pg_hba` pede `scram-sha-256` em `127.0.0.1`. Para demonstrar RLS no modo nativo, aplique a `03_rbac.sql` e use `SET ROLE`, como abaixo. |

RLS e `GRANT` por coluna no modo nativo, depois de aplicar a `03_rbac.sql`. O `set_config` é parte do teste, não enfeite: a política do vendedor compara `seller_id` com `app_current_user_id()`, que lê `app.user_id`.

```sql
SELECT count(*) FROM orders;                                   -- dono postgres
SET ROLE gerente_matheus;  SELECT count(*) FROM orders;         -- política USING (true)
RESET ROLE;
SELECT set_config('app.user_id',
                  (SELECT id::text FROM app_users WHERE email = 'allanbarros@sbi.tech'), false);
SET ROLE vendedor_allan;   SELECT count(*) FROM orders;         -- só os pedidos dele
SELECT unit_cost FROM stock_entry LIMIT 1;                      -- ERROR: permission denied for table stock_entry
RESET ROLE;
```

Medido no banco nativo: **317**, **317** e **95**, com um único vendedor distinto, zero linhas ao pedir pelo id um pedido de outro vendedor, e a recusa de permissão na última linha. O mesmo bloco roda no banco em contêiner — é o que o [roteiro da apresentação](roteiro-banco-de-dados.md) usa no passo 3, lá com os números daquele banco.

### Estado do banco nativo e fluxo autenticado

O cenário foi carregado com `ref=2026-11-19`, o dia do ensaio. Os números **não** são os do banco da banca: as datas da massa Olist são relativas ao dia da carga, então cada dia de referência produz o seu próprio recorte.

| Indicador | Banco nativo (`ref=2026-11-19`) |
| --- | --- |
| Pedidos pagos de 01/11 a 19/11 | 41 |
| Vendas confirmadas | R$ 179.541,00 |
| Estornado | −R$ 4.859,70 |
| Faturamento confirmado | R$ 174.681,30 |
| Plano da loja de novembro | R$ 236.289,87 |
| Meta anual de 2026 | R$ 1.061.415,34 |

Entrando como Allan (`allanbarros@sbi.tech`) na API nativa: `POST /sales/orders` criou o pedido **nº 568** (AirPods Pro 3, PIX, cliente Beatriz Nunes, R$ 1.999,00) em `PENDING_PAYMENT`; a mesma `Idempotency-Key` com o mesmo corpo devolveu o mesmo pedido em vez de criar outro; `POST /sales/orders/568/payment` deixou o pedido `PAID` com pagamento `APPROVED`. No SQL nativo, os dois movimentos de estoque `RESERVA 1` e `SAIDA 1` em `OL-AIRPODS-PRO3`, e o saldo caindo de 20 para 19 disponíveis.

| Indicador | Antes | Depois | Depois de reiniciar a API |
| --- | --- | --- | --- |
| Allan — realizado | R$ 64.425,30 | R$ 66.424,30 | R$ 66.424,30 |
| Allan — falta / atingimento | R$ 22.040,23 · 74,5 % | R$ 20.041,23 · 76,8 % | R$ 20.041,23 · 76,8 % |
| Loja — faturamento confirmado | R$ 174.681,30 | R$ 176.680,30 | R$ 176.680,30 |
| Pedidos pagos no SQL | 41 | 42 | 42 |

Na tela `Meu desempenho` da porta 3001: Realizado R$ 66.424,30, Meta R$ 86.465,53, Falta R$ 20.041,23 e "R$ 1.670,10 por dia nos 12 dias restantes do mês", com o pedido **#568 · Beatriz Nunes · 19/11/2026 · R$ 1.999,00 · Pago** no topo de *Minhas últimas vendas*.

A exportação do gerente fecha com os dois: o `.xlsx` traz 42 pedidos pagos e **R$ 176.680,30** de faturamento confirmado no Resumo, as 61 linhas de detalhe da aba Vendas somam exatamente esse valor, a aba Metas repete plano R$ 236.289,87 e Allan R$ 86.465,53 / R$ 66.424,30, e o recorte só de Allan soma **R$ 66.424,30** em 19 linhas. O `.xls` saiu em OLE2 com tipos de célula de texto, número e data; o CSV, com BOM e vírgula decimal. Período invertido e janela acima de 732 dias continuam devolvendo 400 com a mensagem correta.

---

## 5. Ambiente da banca de 23/11/2026: banco em contêiner, API na 8082 e frontend na 3002

A banca usa a **versão corrigida**, que não está no checkout principal. Ela mora no worktree `E:\Programação\A3\worktrees\pendencias-escopo`, na branch `fix/desempenho-loja-recife`, e sobe na API **8082** com o frontend **3002**. É essa que tem o *Desempenho da loja* para o gerente e a identificação da unidade no rodapé.

O par **8081 e 3001**, servido pelo checkout principal `E:\Programação\A3\order-management-api`, é a versão anterior. Ele continua funcionando e compartilha o mesmo banco, mas **não é o que vai à banca**: nele o gerente não vê o painel da loja e o rodapé não identifica a unidade. Deixar os dois no ar ao mesmo tempo é possível, porque as portas não colidem; a confusão é só humana, então abra a 3002.

As duas versões apontam para o **mesmo banco canônico**, e nenhuma delas o recria.

| Peça | Valor medido em 22/11/2026 |
| --- | --- |
| Contêiner | `sbi-apresentacao-db`, imagem `postgres:18`, `RestartPolicy=no` |
| Servidor | **PostgreSQL 18.6** (Debian 18.6-1.pgdg13+2), `PGDATA=/var/lib/postgresql/18/docker`, `TimeZone=Etc/UTC` |
| Publicação | `127.0.0.1:5435->5432/tcp` — só esta máquina |
| Banco e papel | banco `sbi_apresentacao`, usuário `sbi`, senha igual à `SBI_DB_PASSWORD` do `.env.local` do checkout principal (fora do git) |
| Persistência | volume **anônimo** `d234d3c88818977c58c948d2f66976bab5d9d2ae379b348c65b1cec2ca344ee7` em `/var/lib/postgresql`. Não é `tmpfs`: o banco sobrevive a parar e subir o contêiner |
| Esquema | Flyway na **12.2**, 18 migrações, todas `success` |
| Papéis de RLS no cluster | `loja_gerente` e `loja_vendedor` sem login; `gerente_matheus`, `gerente_gabriel`, `vendedor_allan` e `vendedor_francisco` com login |
| JDK e Node | Temurin **25.0.4.1+1** em `E:\Programação\A3\tmp\tools\jdk-25\jdk-25.0.4.1+1` e Node **24.19.0** |

O `flyway_schema_history` marca 18/11 23:43 UTC, antes de o volume existir: os carimbos vieram junto com os dados, então não servem para datar este contêiner.

### Antes de tudo: a correção ainda não está commitada

No worktree, o que diferencia a versão da banca está **na árvore de trabalho**, não em commit. O `git status` de `fix/desempenho-loja-recife` mostra `frontend/app/(app)/layout.tsx`, `frontend/app/(app)/meu-desempenho/page.tsx`, `frontend/app/(app)/meu-desempenho/my-performance.tsx`, `frontend/app/demo/demo-app.tsx`, `frontend/lib/demo/scenario.ts`, `frontend/e2e/demo.spec.ts` e `docs/01-produto/demonstracao-publica.md` modificados, mais `frontend/lib/store.ts` **não rastreado** — é ele que define `Unidade do Shopping Recife`.

Um `git stash`, um `git checkout .` ou um `git clean -fd` nesse worktree desfaz a versão da banca, e o `clean` apaga o `store.ts` sem deixar cópia. Não rode nenhum dos três ali antes da apresentação.

### Retomar a versão corrigida depois de reiniciar

O banco primeiro. Abra o Docker Desktop e espere o daemon subir; o contêiner costuma voltar sozinho. Se não voltar, `docker start sbi-apresentacao-db` o traz de volta com os dados — ele está parado, não perdido. **Não use `docker run` nem `docker compose` para "recriar" este banco**: um contêiner novo nasce com um volume novo e vazio.

```powershell
docker ps --filter name=sbi-apresentacao-db --format "{{.Names}} | {{.Status}} | {{.Ports}}"
docker exec sbi-apresentacao-db pg_isready -U sbi -d sbi_apresentacao
```

Depois a API, **a partir do worktree**. Nesta máquina o JDK é portátil e **não está no `PATH`**: um PowerShell novo não resolve `java`, e `$env:JAVA_HOME` vem vazio. As duas primeiras linhas abaixo resolvem isso, com a mesma pegadinha da seção 4 — o caminho termina em `jdk-25.0.4.1+1`, não na pasta `jdk-25` que a contém. O jar do worktree já contém os endpoints `/performance/me`, `/performance/me/suggestions` e `/management/projection`, que alimentam o painel da loja; se precisar refazê-lo, use `.\mvnw.cmd -q -DskipTests package` nesse mesmo diretório.

```powershell
cd E:\Programação\A3\worktrees\pendencias-escopo
$env:JAVA_HOME = 'E:\Programação\A3\tmp\tools\jdk-25\jdk-25.0.4.1+1'
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
$env:SPRING_PROFILES_ACTIVE = 'demo'
$env:SPRING_DATASOURCE_URL = 'jdbc:postgresql://127.0.0.1:5435/sbi_apresentacao'
$env:SPRING_DATASOURCE_USERNAME = 'sbi'
$env:SPRING_DATASOURCE_PASSWORD = Read-Host 'SBI_DB_PASSWORD do .env.local' -MaskInput
$env:SESSION_COOKIE_SECURE = 'false'
java -jar target/order-management-spring-0.0.1-SNAPSHOT.jar --server.address=127.0.0.1 --server.port=8082
```

As variáveis `SBI_DEMO_PASSWORD*` **não** são necessárias: elas só são lidas durante a migração que cria as contas, e ela já rodou neste banco. As senhas que funcionam são as que estavam no ambiente naquele dia — as do `.env.local` do checkout principal, que o worktree não tem.

Por fim a interface, em outro terminal. A porta do backend entra **no build**, não só no start: o `rewrites()` do `next.config.mjs` é resolvido por `next build` e gravado em `.next/routes-manifest.json`. Por isso a mesma `BACKEND_ORIGIN` vai nos dois.

```powershell
cd E:\Programação\A3\worktrees\pendencias-escopo\frontend
$env:BACKEND_ORIGIN = 'http://127.0.0.1:8082'
npm.cmd run build
npm.cmd run start -- --hostname 127.0.0.1 --port 3002
```

O `npm.cmd run build` só é necessário se o `.next` do worktree for anterior à última alteração em `frontend/`. Para ver qual porta está gravada no build atual, sem reconstruir:

```powershell
node -e "require('./.next/routes-manifest.json').rewrites.afterFiles.forEach(r=>console.log(r.source,'->',r.destination))"
```

Abra [Entrar no SBI na 3002](http://127.0.0.1:3002/entrar). O proxy responde HTTP 200 em `http://127.0.0.1:3002/api/backend/auth/csrf`.

### O que foi efetivamente iniciado e verificado em 22/11/2026

| Peça | Estado encontrado | Ação |
| --- | --- | --- |
| `sbi-apresentacao-db` na 5435 | já no ar e `healthy` | nada — preservado |
| API na 8082 (worktree) | já no ar, respondendo `/auth/csrf` | nada — conferida, não reiniciada |
| Frontend na 3002 (worktree) | parado | **iniciado** com `BACKEND_ORIGIN=http://127.0.0.1:8082` |
| API 8081 e frontend 3001 (checkout principal) | no ar, da versão anterior | deixados como estavam |

Conferido no navegador, na 3002:

- **Matheus** (`matheussiqueira@sbi.tech`, gerente) abre *Meu desempenho* no escopo **Loja**, intitulado **Desempenho da loja**: Realizado da loja **R$ 146.726,30**, Meta da loja **R$ 198.576,84**, Atingimento **73,9 %** e Falta **R$ 51.850,54**, em novembro de 2026.
- **Allan** (`allanbarros@sbi.tech`, vendedor) abre *Meu desempenho* com a sua meta individual: Realizado **R$ 53.326,30**, Meta **R$ 75.545,59** com a legenda "Definida pelo gerente", Atingimento **70,6 %** e Falta **R$ 22.219,29**. Suas últimas vendas param em 18/11/2026.
- O rodapé das duas contas identifica **Unidade do Shopping Recife · Recife, Pernambuco**.
- O catálogo Apple aparece em *Vender* com preços, estoque e promoções.

Os valores da tela batem com o `GET /goals/monthly?period=2026-11` da própria API, que devolve `storeGoal` 198576.84, Allan 75545.59 e Francisco 123031.25.

### Subir a API num banco já carregado não apaga nada

Medido antes de encostar no banco da banca: o dump foi restaurado num banco descartável, a API subiu contra ele e as contagens foram comparadas linha a linha. O Flyway não migrou nada e nenhuma tabela mudou.

```
Successfully validated 18 migrations
Current version of schema "public": 12.2
Schema "public" is up to date. No migration necessary.
```

Isso casa com o código: o perfil `demo` só acrescenta `classpath:db/demo` às `locations` do Flyway, `clean-disabled` é o padrão `true`, não há `data.sql`, callback, `FlywayMigrationStrategy` nem bean de seed, e o único `TRUNCATE` do projeto pertence ao perfil `contract`, que exige a URL descartável da porta 15432.

### Estado do banco em `ref=2026-11-18`

As datas da massa Olist são relativas ao dia da carga, então estes números são só deste banco. Eles **não** são os da seção 4, que usou `ref=2026-11-19`.

| Indicador | Banco da banca (`ref=2026-11-18`) |
| --- | --- |
| Pedidos pagos de 01/11 a 18/11 | 38 |
| Vendas confirmadas | R$ 151.586,00 |
| Estornado | −R$ 4.859,70 |
| Faturamento confirmado | R$ 146.726,30 |
| Ticket médio por pedido | R$ 3.989,11 |
| Plano da loja de novembro | R$ 198.576,84 |
| Meta anual de 2026 | R$ 986.051,48 |
| Allan — meta e realizado de novembro | R$ 75.545,59 · R$ 53.326,30 (70,6 %) |
| Francisco — meta e realizado de novembro | R$ 123.031,25 · R$ 59.055,00 (48,0 %) |
| Massa | 315 pedidos, 376 itens, 315 pagamentos, 66 clientes, 49 produtos (42 SKUs `OL-*`), 7 contas, 1 estorno, 426 movimentos de estoque |

O último lançamento do banco é de 18/11/2026, então o recorte de 01/11 a 18/11 pega novembro inteiro.

### A exportação de 01/11 a 18/11/2026

`GET /analytics/export` com `from`, `to` e `format` (`XLSX` padrão, `XLS`, `CSV`), mais os filtros `seller`, `category` e `payment`. É `GET`: pede o cookie de sessão, não o header CSRF. A regra de URL é `hasRole(GERENTE)`, e o CEO herda.

A bateria rodou duas vezes no ambiente da banca, direto na API da 8082 e pelo proxy da 3002, com **10 PASS e 0 FAIL** nas duas:

- os três formatos em HTTP 200, anexados como `sbi-analises-2026-11-01-a-2026-11-18.<ext>`;
- o `.xlsx` com as abas **Resumo**, **Vendas** e **Metas**;
- **54 linhas de detalhe** na aba Vendas — 53 vendas e 1 estorno — somando exatamente os **R$ 146.726,30** do Resumo, o mesmo valor que o SQL devolve;
- o CSV com BOM, `;` como separador e vírgula decimal;
- o recorte só de Allan (`seller=2`) saindo menor, como esperado;
- período invertido e janela acima de 732 dias devolvendo 400 com a mensagem certa, e a chamada sem sessão devolvendo 401.

Pela tela, em *Gestão → Análises*, ajustar o período e clicar no formato dispara `GET /api/backend/analytics/export?from=2026-11-01&to=2026-11-18&format=XLSX`.

### O que torna este ambiente frágil

O volume é **anônimo** e o contêiner tem `RestartPolicy=no`. Parar e subir preserva tudo, e nenhum `docker compose down -v` de outro projeto o alcança, porque ele não pertence a projeto nenhum. O que o apaga é `docker rm -v sbi-apresentacao-db`, que leva o volume junto, e remover o contêiner sem o `-v`, que deixa o volume órfão para o próximo `docker volume prune` recolher — um volume anônimo não tem nome que o identifique depois. "Clean / Purge data" do Docker Desktop apaga tudo de uma vez.

### Backup e restauração, conferidos no PowerShell 7

O dump sai **de dentro do contêiner** e vem para o host com `docker cp`. Não use `>` nem `<` com o `docker exec`: o PowerShell não implementa redirecionamento de entrada, e `pg_restore ... < arquivo.dump` falha antes de tocar no banco. Guarde o arquivo **fora do repositório** — o `.gitignore` cobre `.env*`, não `*.dump`.

```powershell
docker exec sbi-apresentacao-db pg_dump -U sbi -d sbi_apresentacao -Fc -f /tmp/sbi_apresentacao.dump
docker cp sbi-apresentacao-db:/tmp/sbi_apresentacao.dump E:\Programação\A3\tmp\backup-banca\sbi_apresentacao-2026-11-22.dump
docker exec sbi-apresentacao-db rm -f /tmp/sbi_apresentacao.dump
```

Para provar o dump sem arriscar a banca, restaure num contêiner **descartável**, com nome, volume e porta próprios — nada compartilhado com o `sbi-apresentacao-db`:

```powershell
$env:SBI_DB_PASSWORD = Read-Host 'SBI_DB_PASSWORD do .env.local' -MaskInput
docker run -d --name sbi-restauracao-teste -p 127.0.0.1:5437:5432 `
  -e POSTGRES_DB=sbi_restaurado -e POSTGRES_USER=sbi -e POSTGRES_PASSWORD=$env:SBI_DB_PASSWORD `
  -v sbi-restauracao-teste-data:/var/lib/postgresql postgres:18
```

Os papéis vêm **antes** da restauração. Um `pg_dump` de banco não carrega papéis, que são do cluster, e as políticas de RLS do dump citam `loja_gerente` e `loja_vendedor` pelo nome. Sem eles, o `pg_restore --exit-on-error` para na primeira política — medido: `ERROR: role "loja_gerente" does not exist`, em `CREATE POLICY items_gerente ON public.order_item FOR SELECT TO loja_gerente`. São os mesmos seis papéis da `03_rbac.sql`:

```powershell
docker exec sbi-restauracao-teste psql -X -q -U sbi -d postgres -v ON_ERROR_STOP=1 `
  -c "CREATE ROLE loja_gerente NOLOGIN" `
  -c "CREATE ROLE loja_vendedor NOLOGIN" `
  -c "CREATE ROLE gerente_matheus LOGIN IN ROLE loja_gerente" `
  -c "CREATE ROLE gerente_gabriel LOGIN IN ROLE loja_gerente" `
  -c "CREATE ROLE vendedor_allan LOGIN IN ROLE loja_vendedor" `
  -c "CREATE ROLE vendedor_francisco LOGIN IN ROLE loja_vendedor"
```

Então o arquivo entra no contêiner e o `pg_restore` usa o caminho **de dentro dele**:

```powershell
docker cp E:\Programação\A3\tmp\backup-banca\sbi_apresentacao-2026-11-22.dump sbi-restauracao-teste:/tmp/sbi.dump
docker exec sbi-restauracao-teste pg_restore --exit-on-error -U sbi -d sbi_restaurado /tmp/sbi.dump
```

Conferido em 22/11/2026: o `pg_restore --exit-on-error` terminou com código **0**, sem uma linha de saída. A fotografia restaurada saiu **idêntica** à original nas contagens — 315 pedidos, 376 itens, 315 pagamentos, 66 clientes, 49 produtos, 7 contas, 12 metas mensais, 24 metas de vendedor, 1 estorno, 426 movimentos de estoque — e nos R$ 146.726,30 de 01/11 a 18/11. A consulta por papel também bate: `SET ROLE gerente_matheus` vê **315** pedidos e `vendedor_allan`, com `app.user_id` apontando para Allan, vê **95**.

No fim, apague só o descartável. O contêiner e o volume da banca ficam:

```powershell
docker rm -f -v sbi-restauracao-teste
docker volume rm sbi-restauracao-teste-data
```

No Git Bash, e só nele, estes comandos precisam de `MSYS_NO_PATHCONV=1` antes do `docker`, senão `/tmp/sbi.dump` vira um caminho do Windows — é a mesma conversão descrita na seção 4. No PowerShell não há essa conversão.

### O que `REF=2026-11-18` reproduz, e o que não

`REF` chega à `10_carga_apresentacao.sql`, que a lê em `:'ref'` e, sem ela, usa hoje em `America/Fortaleza`. Ela fixa a referência **do cenário**: as metas do ano, a operação em andamento e os dias fortes e fracos.

A `07_carga_olist.sql` **não tem** esse parâmetro. Ela data a massa a partir de `now()` no momento em que roda. Então refazer o banco pela bateria — `run_bd.sh`, `run_olist_bd.sh` e `run_apresentacao.sh`, como descreve o [guia de preparação](../03-banco-de-dados/preparar-apresentacao.md) — produz um cenário **coerente e reproduzível para as condições daquela carga**, com o mesmo formato e as mesmas regras, mas **não** os números desta tabela: o recorte Olist terá se deslocado junto com o dia.

Para recuperar a **fotografia exata** do ensaio — os 38 pedidos pagos, os R$ 146.726,30, as metas de Allan e Francisco —, o caminho é o dump validado acima. A reconstrução por SQL é o plano para quando o dump também se perder.
