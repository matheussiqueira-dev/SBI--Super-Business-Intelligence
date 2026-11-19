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

Sem `-v ref`, a data de referência é hoje em `America/Fortaleza`; para fixar um dia, use `-v ref=2026-11-25`. O [guia de preparação](../03-banco-de-dados/preparar-apresentacao.md) detalha o que o cenário grava e como conferir tudo de uma vez.

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
| JDK | Temurin **25.0.4.1+1** portátil em `E:\Programação\A3\tmp\tools\jdk-25` |
| Node | **24.19.0** |
| API nativa | porta **8081**, perfil `demo`, jar `target/order-management-spring-0.0.1-SNAPSHOT.jar` |
| Frontend nativo | porta **3001**, build de produção (`next start`), `BACKEND_ORIGIN=http://127.0.0.1:8081` |

### Subir o cluster sem instalador e sem serviço

Os binários oficiais em `.zip` não instalam nada: basta extrair. A configuração vai toda na linha de comando, então o `postgresql.conf` do cluster fica como o `initdb` o deixou.

```powershell
E:\pg18-ensaio\pgsql\bin\initdb.exe -D E:\pg18-ensaio\data -U postgres --pwfile=<arquivo com a senha> --auth-host=scram-sha-256 --encoding=UTF8 --locale-provider=icu --icu-locale=en-US
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

Os três runners do pacote aceitam o modo nativo: **sem `CONTAINER`**, eles usam o `psql` do `PATH` e as variáveis `PGHOST`, `PGPORT` e `PGPASSWORD` do ambiente, em vez de `docker exec`.

```bash
export PGHOST=127.0.0.1 PGPORT=5436 PGPASSWORD=<senha do superusuário>
```

```bash
DB=sbi_demo SUPERUSER=postgres JAR=target/order-management-spring-0.0.1-SNAPSHOT.jar JDBC_URL=jdbc:postgresql://127.0.0.1:5436/sbi_demo bash docs/03-banco-de-dados/pacote-sql/run_olist_bd.sh
```

```bash
DB=sbi_demo SUPERUSER=postgres bash docs/03-banco-de-dados/pacote-sql/run_apresentacao.sh
```

| Etapa | Resultado medido |
| --- | --- |
| `run_olist_bd.sh` (07 duas vezes, 08, 09 e CT-DEMO-05 pela API nativa) | **11 PASS, 0 FAIL, 0 ERROS** |
| `run_apresentacao.sh` (10 duas vezes, 12 e a prova 11), `ref=2026-11-19` | **17 PASS, 0 FAIL, 0 ERROS** |
| Prova de banco 11 | rodou inteira, com as cinco recusas esperadas na ordem |
| `run_bd.sh` | **não roda nativo**: ele entra como os papéis de banco `vendedor_allan` e `gerente_matheus`, criados sem senha. No contêiner isso funciona pelo socket local em `trust`; no Windows não há socket local e o `pg_hba` pede `scram-sha-256` em `127.0.0.1`. Para demonstrar RLS no modo nativo, aplique a `03_rbac.sql` e use `SET ROLE` (abaixo). |

RLS e `GRANT` por coluna, medidos no banco nativo depois da `03_rbac.sql`: `SELECT count(*) FROM orders` devolveu **317** para o dono `postgres`, **317** com `SET ROLE gerente_matheus` e **95** com `SET ROLE vendedor_allan` (um único vendedor, e zero linhas ao pedir pelo id um pedido de outro vendedor); `SET ROLE vendedor_allan; SELECT unit_cost FROM stock_entry` devolveu `ERROR: permission denied for table stock_entry`.

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
