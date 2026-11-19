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
