# Roteiro da apresentação de Banco de Dados

Para a banca da disciplina de **Banco de Dados** (UNIFG). O enunciado pede um banco funcional, comandos SQL e CRUD, e avalia o funcionamento do banco, suas tabelas e os dados armazenados. Este roteiro mostra isso no PostgreSQL de verdade e, depois, a mesma informação na interface e na planilha.

Tempo estimado: **12 a 15 minutos** para os passos 1 a 6, mais 5 minutos de perguntas.

---

## Antes de começar

Deixe estes quatro itens prontos e abertos, nesta ordem, **antes** de a banca entrar:

| Item | O que abrir | Confirmação |
| --- | --- | --- |
| 1. Banco | Cliente SQL (IntelliJ Database, DBeaver ou `psql`) conectado ao banco de apresentação | `SELECT version();` responde |
| 2. API | Terminal com a API no perfil `demo` | `http://127.0.0.1:8080/auth/csrf` responde HTTP 200 |
| 3. Interface | Navegador em `http://127.0.0.1:3000/entrar` | A tela de entrada aparece |
| 4. Roteiro SQL | `docs/03-banco-de-dados/pacote-sql/11_prova_banco.sql` aberto no cliente SQL | Os blocos `-- PASSO n` estão visíveis |

A preparação completa do ambiente está em [preparar a apresentação](../03-banco-de-dados/preparar-apresentacao.md). O caminho curto abaixo **recarrega o cenário num banco que já tem o esquema e a massa Olist**: ele roda a `10`, os testes `12` e a prova `11`, nada mais. Banco novo precisa da bateria na ordem — `run_bd.sh`, depois `run_olist_bd.sh`, depois `run_apresentacao.sh` —, que é o que o guia de preparação descreve.

O comando muda com o lugar onde o banco está. `DB` e `SUPERUSER` são sempre obrigatórias — sem elas o script para antes de tocar no banco. `REF` fixa a data de referência: sem ela a referência é **hoje**, e os valores citados neste roteiro mudam.

Com o PostgreSQL nativo, exportando antes `PGHOST`, `PGPORT` e `PGPASSWORD`:

```bash
DB=sbi_demo SUPERUSER=postgres REF=2026-11-18 bash docs/03-banco-de-dados/pacote-sql/run_apresentacao.sh
```

Com o banco em contêiner do `docker-compose.demo.yml`, subido como `-p sbi-demo` (daí o contêiner `sbi-demo-db-1`, banco `sbi_demo`, usuário `sbi`):

```bash
CONTAINER=sbi-demo-db-1 DB=sbi_demo SUPERUSER=sbi REF=2026-11-18 bash docs/03-banco-de-dados/pacote-sql/run_apresentacao.sh
```

O banco do Compose, porém, monta `tmpfs` em `/var/lib/postgresql`: ele nasce **vazio a cada subida**, e o Compose aplica só o Flyway, com as contas e a massa do seed — a massa Olist fica de fora, por opção do próprio arquivo. Carregue a `07` antes (o `run_olist_bd.sh` faz isso), senão o cenário entra num banco sem os 42 SKUs `OL-*`, o CT-APR-13 reclama e os números deste roteiro não saem.

Se o seu banco de apresentação foi criado à mão, fora do Compose — como o contêiner `sbi-apresentacao-db` com o banco `sbi_apresentacao` das medições de 18/11 —, troque os três valores pelos seus: nada no repositório cria esse par, e um nome de contêiner errado falha com `No such container` antes de qualquer SQL.

**Plano local se a internet falhar:** nada deste roteiro depende de internet. Banco, API e interface rodam em `127.0.0.1`; as fotos do catálogo são servidas da pasta `frontend/public/produtos`; o ambiente publicado não é usado. A única etapa que precisou de rede foi a primeira instalação de dependências (`npm ci` e o build do Maven), já feita. Se o PostgreSQL nativo não subir, o mesmo banco sobe em contêiner com `docker compose -f docker-compose.demo.yml -p sbi-demo up --build` e a porta de consulta passa a ser `127.0.0.1:5433`.

---

## Passo 1 — O banco está funcionando e os dados estão armazenados

Execute o bloco **PASSO 1** de `11_prova_banco.sql`.

**O que apontar na tela, em ordem:**

1. **Conexão e versão** (1.1): nome do banco, usuário conectado, `PostgreSQL 18.x`, e a hora da loja em `America/Fortaleza`. Diga: *"é um PostgreSQL 18 de verdade, não um arquivo nem um mock"*.
2. **Tabelas com a contagem real** (1.2): as 20 tabelas do modelo com o número de linhas de cada uma, contado por `COUNT(*)` (a consulta deixa de fora `flyway_schema_history`, que é controle do Flyway, não dado da loja). Aponte `orders`, `order_item`, `payment`, `customer` e `product`. Diga: *"estes são os dados armazenados"*.
3. **Chaves e relações** (1.4 e 1.5): a chave primária de cada tabela e **toda** chave estrangeira, com a coluna, a tabela-pai e o que acontece ao excluir o pai. Os quatro grupos que o enunciado pede aparecem aqui:
   - cliente ↔ endereço: `customer.address_id → address.id`
   - pedido ↔ itens ↔ pagamento: `order_item.order_id → orders.id` e `payment.order_id → orders.id`
   - produto ↔ estoque: `stock_balance.product_id → product.id`, `stock_entry`, `stock_movement`
   - metas: `seller_goal.monthly_goal_id → monthly_goal.id` (com `ON DELETE CASCADE`) e `annual_goal.updated_by → app_users.id`
4. **Restrições** (1.6): mostre `ck_customer_document_type` (pessoa física exige CPF, jurídica exige CNPJ), `ck_customer_cpf` (onze dígitos) e `payment_order_id_key` (um pagamento por pedido). Diga: *"o banco recusa dado inválido; não é a tela que decide"*.
5. **Gatilhos** (1.7): `annual_goal_only_ceo`, `monthly_goal_sum` e `seller_goal_sum` (adiados para o `COMMIT`), `trg_product_price_history`, `trg_stock_entry_apply`.

**Saída esperada:** 20 tabelas, nenhuma com zero linhas nas cinco principais; a última migração do Flyway é a `12.2`.

> O diagrama e o dicionário completos estão em [modelo ERP/PDV](../03-banco-de-dados/modelo-erp-pdv.md) e [dicionário de dados](../03-banco-de-dados/dicionario-dados.md). Tenha o diagrama aberto numa aba, para a pergunta "mostre o modelo".

---

## Passo 2 — CRUD completo no mesmo cliente, numa transação

Execute o bloco **PASSO 2**. Ele roda inteiro dentro de `BEGIN ... ROLLBACK`: nada fica gravado.

**O que apontar:**

| Sub-passo | Comando | O que mostrar |
| --- | --- | --- |
| 2.0 | `SELECT count(*)` | quantos clientes existem **antes** |
| 2.1 | `INSERT` em `address` e em `customer` | os dois IDs gerados, devolvidos por `RETURNING` |
| 2.1b | `SELECT count(*)` | um cliente **a mais** |
| 2.2 | `SELECT ... JOIN address JOIN app_users` | cliente e endereço juntos, com quem cadastrou (`created_by`, preenchido pelo próprio banco) |
| 2.3 | `UPDATE` de telefone e e-mail | `RETURNING` com os valores novos e `version` somando 1 |
| 2.4 | `SELECT` de novo | o valor gravado é o novo |
| 2.5 | `DELETE` do cliente e do endereço | sai porque **não tem pedido** |
| 2.6 | `SELECT count(*)` | a contagem voltou ao valor de 2.0 |
| 2.7 | `UPDATE product SET price` com motivo | o gatilho grava preço antigo, preço novo, autor e motivo em `product_price_history` |
| — | `ROLLBACK` | |
| 2.8 | `SELECT count(*)` | depois do `ROLLBACK`, o banco está exatamente como antes: zero cliente da banca, zero e-mail da banca |

Diga em 2.8: *"usei uma transação; o `ROLLBACK` desfez tudo, inclusive o reajuste de preço — a massa da apresentação continua intacta"*.

**Saída esperada:** a contagem de clientes sobe 1 em 2.1b, volta em 2.6 e segue igual em 2.8. O histórico de preço mostra uma linha com o motivo "Reajuste de tabela demonstrado na banca".

---

## Passo 3 — Integridade: o banco recusa o que não pode entrar

Execute o bloco **PASSO 3**. Cada tentativa inválida está dentro de um bloco com `EXCEPTION` que reconhece **só** o erro previsto, então o roteiro continua depois de cada recusa.

**Saída esperada — cinco linhas `NOTICE`, nesta ordem:**

```
OK 1/4 - CPF duplicado recusado (client_cpf_key)
OK 2/4 - documento incompativel com o tipo recusado (ck_customer_document_type)
OK 3/4 - CPF fora do formato recusado (ck_customer_cpf)
OK 4/4 - exclusao de cliente com N pedido(s) recusada (orders_client_id_fkey)
OK 5/5 - distribuicao fora do plano da loja recusada (trg_goal_sum_check)
```

Diga: *"se o banco tivesse **aceitado** qualquer um desses, o script falharia na hora — a prova é que ele recusa, não que ele não reclama"*. A quinta é a mais interessante: a soma das metas dos vendedores tem de fechar com o plano da loja, e a verificação é adiada para o `COMMIT`, o que permite trocar a distribuição inteira dentro de uma transação.

### Se a banca perguntar por RLS ou por permissão de coluna

Os papéis de banco e as políticas vêm da `03_rbac.sql`, que o Flyway **não** aplica. No contêiner, quem
a aplica é o `run_bd.sh`. Num banco nativo ele não roda — exige contêiner —, então aplique a `03` à mão
antes, uma vez:

```bash
psql -X -U postgres -d sbi_demo -v ON_ERROR_STOP=1 -f docs/03-banco-de-dados/pacote-sql/03_rbac.sql
```

Sem ela, o `SET ROLE gerente_matheus` abaixo para com `role "gerente_matheus" does not exist`. Com ela
no lugar, a resposta é a **mesma consulta com três papéis de banco diferentes**, no cliente SQL que já
está aberto, sem trocar de conexão:

```sql
SELECT count(*) FROM orders;                                   -- dono do esquema: 315
SET ROLE gerente_matheus;  SELECT count(*) FROM orders;         -- gerente: 315
RESET ROLE;
SELECT set_config('app.user_id',
                  (SELECT id::text FROM app_users WHERE email = 'allanbarros@sbi.tech'), false);
SET ROLE vendedor_allan;   SELECT count(*) FROM orders;         -- vendedor: 95
SELECT count(*) FROM orders WHERE id = 5;                       -- pedido de outro vendedor: 0 linhas
SELECT unit_cost FROM stock_entry LIMIT 1;                      -- ERROR: permission denied for table stock_entry
RESET ROLE;
```

O `set_config` resolve o id pelo e-mail, como o resto do pacote SQL faz, e roda antes do `SET ROLE`
porque só o dono do esquema lê `app_users`. Nesta massa o id do Allan é 2; o `SELECT` evita depender
disso. Ele é indispensável nesta forma: `SET ROLE` troca o `current_user` e **não** o `session_user`, e
`app_current_user_id()` procura primeiro um usuário com `db_role = session_user` — que aqui não existe
—, caindo então em `app.user_id`.

**Saída esperada: 315, 315 e 95**, depois zero linhas e a recusa de permissão. O dono do esquema não
passa pela política; o gerente tem `USING (true)`; o vendedor tem
`USING (seller_id = app_current_user_id())` e vê só os pedidos dele — pedir pelo id um pedido de outro
vendedor devolve **zero linhas**, não erro. A última linha é o `GRANT` por coluna: o vendedor não
alcança o custo.

Quem preferir mostrar a entrada de verdade, com um login por papel, consegue isso **dentro do contêiner
onde a `03_rbac.sql` foi aplicada** — o `pg_hba` de lá aceita o socket local sem senha. Troque o nome do
contêiner, o banco e o usuário pelos do seu ambiente:

```bash
docker exec <contêiner> psql -X -At -U vendedor_allan -d <banco> -c "SELECT count(*) FROM orders"
```

Aqui o `set_config` não entra, e por um motivo que vale contar se perguntarem: entrando **como**
`vendedor_allan`, o `session_user` é ele, então `app_current_user_id()` já o encontra por
`db_role = session_user` e nem olha o `app.user_id`.

Numa instalação nativa esse login por papel não funciona: não há socket local no Windows, o `pg_hba`
pede senha em `127.0.0.1` e os papéis da `03_rbac.sql` nascem sem senha. É por isso que a forma com
`SET ROLE` acima é a que vale nos dois ambientes.

Diga: *"no ambiente autenticado quem restringe é a API, porque a aplicação conecta com um usuário de
banco só; a RLS está aqui para mostrar que o banco também faz isso, por política e por coluna"*.

---

## Passo 4 — Consulta analítica e meta × realizado

Execute o bloco **PASSO 4**.

**O que apontar:**

1. **Grão do item** (4.1): uma linha por item, unindo `orders`, `order_item`, `product`, `category`, `payment`, `customer`, o vendedor e o gerente da equipe. Seis tabelas e duas vezes `app_users` (vendedor e gerente).
2. **Grão do pedido** (4.2): uma linha por pedido, com os itens agregados por `LATERAL`. A coluna `conferencia` diz "confere" quando o total dos itens é igual ao valor do pagamento.
3. **Controle do grão** (4.3) — **este é o ponto a destacar**:

   | caminho | pedidos | receita |
   | --- | --- | --- |
   | grão de item | 38 | 151.586,00 |
   | grão de pedido | 38 | 151.586,00 |
   | view do sistema (com estornos) | 38 | 146.726,30 |

   Diga: *"os dois grãos dão o mesmo número, então o `JOIN` não multiplicou pedido nem receita. A view difere em R$ 4.859,70, que é exatamente o estorno do período — ela subtrai estorno por definição"*.
4. **Meta × realizado por vendedor** (4.4), pela view `v_desempenho_vendedor`: mês, vendedor, equipe, meta, realizado, atingimento, falta e situação.
5. **Meta × realizado da loja** (4.5): plano, soma da distribuição e realizado. Explique: *"o realizado da loja inclui a venda do gerente, que soma na loja e não tem meta individual — meta individual é só de VENDEDOR, é uma regra do banco"*.
6. **Meta anual** (4.6): valor, quem definiu, o papel (CEO) e a soma das mensais — iguais.
7. **Reconciliação** (4.8): guarde esta linha; é a referência dos passos 5 e 6.

**Saída esperada no recorte de 01/11 a 18/11/2026**, antes da venda de teste do passo 6:

| indicador | valor |
| --- | --- |
| pedidos pagos | 38 |
| vendas confirmadas | R$ 151.586,00 |
| estornado | −R$ 4.859,70 |
| **faturamento confirmado** | **R$ 146.726,30** |
| plano do mês | R$ 198.576,84 |

Depois da venda de teste de R$ 503,00 do passo 6, o faturamento confirmado passa a R$ 147.229,30 em 39 pedidos.

---

## Passo 5 — A interface mostra o mesmo número

Troque para o navegador. Entre com cada perfil e aponte o número que a banca acabou de ver no SQL.

| Perfil | Conta | Tela | O que apontar |
| --- | --- | --- | --- |
| Vendedor | `allanbarros@sbi.tech` | Meu desempenho | Realizado, meta, atingimento e **quanto falta por dia restante** do mês. Só os dados dele. |
| Gerente | `matheussiqueira@sbi.tech` | Gestão → Análises | Faturamento confirmado do mês = **R$ 146.726,30**, o mesmo do passo 4. Realizado por semana, formas de pagamento, margem por produto e a recomendação de reposição. |
| CEO | `paulo@sbi.tech` | Painel executivo | Meta anual R$ 986.051,48, as 12 metas mensais, comparação com o ano anterior, contribuição por equipe e categoria, curva ABC. |

Mostre também a separação de papéis: com o gerente logado, abrir o Painel executivo responde **403**; com o vendedor, as telas de gestão não aparecem no menu e a API responde **403**. Diga: *"quem decide o que cada papel vê é o servidor, não a tela"*.

---

## Passo 6 — Uma venda nova entra no banco e aparece em tudo

Este é o fecho: prova que o sistema **grava** e que o número da banca vem do banco.

1. Entre como **vendedor** (`allanbarros@sbi.tech`) e registre uma venda em **Vender**: escolha um cliente, um produto com saldo, pagamento PIX, e confirme o pagamento.
2. Volte ao cliente SQL e rode:

   ```sql
   SELECT o.id, o.status, p.status AS pagamento, p.amount, c.name AS cliente, u.name AS vendedor
     FROM orders o JOIN payment p ON p.order_id = o.id
     JOIN customer c ON c.id = o.customer_id JOIN app_users u ON u.id = o.seller_id
    ORDER BY o.id DESC LIMIT 1;

   SELECT kind, quantity FROM stock_movement WHERE order_id = (SELECT max(id) FROM orders) ORDER BY id;
   ```

   **Saída esperada:** o pedido novo com `status = PAID` e `pagamento = APPROVED`, e dois movimentos de estoque: `RESERVA 1` e `SAIDA 1`.
3. Volte a **Meu desempenho**: o realizado e a falta mudaram pelo valor exato da venda.
4. **Persistência:** encerre a API com Ctrl+C, suba de novo e abra a tela outra vez. O pedido e o realizado continuam lá — o dado está no PostgreSQL, não na memória da aplicação.

Medido nesta preparação: a venda de R$ 503,00 levou o realizado do mês de R$ 146.726,30 para R$ 147.229,30 e o de Allan de R$ 53.326,30 para R$ 53.829,30 (atingimento 70,6% → 71,3%); depois de reiniciar a API, os mesmos valores.

---

## Passo 7 (opcional) — Exportar e conferir na planilha

Em **Gestão → Análises**, no cartão **Exportar**: o período já vem igual ao mês da tela; use um atalho de data se quiser outro recorte, e baixe em **Excel (.xlsx)**.

Abra o arquivo e aponte:

- aba **Resumo**: o recorte (período, fuso, filtros, quem gerou) e o **Faturamento confirmado** igual ao do passo 4;
- aba **Vendas**: o grão está escrito no topo (item de pedido, com uma linha por estorno); somar a coluna *Receita líquida* dá o mesmo faturamento confirmado;
- aba **Metas**: plano da loja e distribuição por vendedor, com realizado e atingimento.

Reconciliação medida nesta preparação, para 01/11 a 18/11/2026 e para a equipe de Matheus Siqueira (vendedor Allan Barros), no estado canônico — **10 indicadores, iguais em cada fonte que os publica** (o traço marca onde aquela fonte não traz o indicador):

| indicador | PostgreSQL | painel | planilha |
| --- | --- | --- | --- |
| Faturamento confirmado | 146.726,30 | 146.726,30 | 146.726,30 |
| Receita das vendas (já sem desconto) | 151.586,00 | — | 151.586,00 |
| Estornos | 4.859,70 | — | 4.859,70 |
| Pedidos pagos | 38 | — | 38 |
| Soma das linhas da aba Vendas | 146.726,30 | — | 146.726,30 |
| Plano da loja de 2026-11 | 198.576,84 | 198.576,84 | 198.576,84 |
| Soma das semanas do painel | 146.726,30 | 146.726,30 | — |
| Soma das formas de pagamento | 146.726,30 | 146.726,30 | — |
| Equipe de Matheus — realizado | 53.326,30 | 53.326,30 | 53.326,30 |
| Equipe de Matheus — meta | 75.545,59 | 75.545,59 | 75.545,59 |

O `.xls` sai do mesmo recorte, para quem precisar do formato antigo. O CSV é a opção complementar.

---

## Perguntas prováveis e onde está a resposta

| Pergunta | Resposta curta | Onde mostrar |
| --- | --- | --- |
| "Como você garante que o dado não está inventado na tela?" | A tela não calcula faturamento: o número sai da view `v_lancamento_realizado`, e a planilha sai das mesmas views, no servidor. | passo 4.3 e passo 7 |
| "O que é faturamento confirmado?" | Pagamento aprovado menos estorno, pela data do pagamento. Uma definição só, numa view só. | `v_lancamento_realizado`, passo 4.3 |
| "E se o `JOIN` duplicar a receita?" | Os dois grãos dão o mesmo total; é a prova 4.3. | passo 4.3 |
| "Quem pode definir a meta anual?" | Só CEO, por gatilho no banco (`annual_goal_only_ceo`), não por regra de tela. | passo 1.7 e passo 3 |
| "A soma das metas dos vendedores pode não fechar?" | Não: `trg_goal_sum_check`, adiado para o `COMMIT`. | passo 3, recusa 5/5 |
| "Posso excluir um cliente com histórico?" | Não: a chave estrangeira recusa. | passo 3, recusa 4/4 |
| "Por que a margem às vezes diz 'Não informado'?" | Produto sem custo informado não vira margem zero; o sistema diz que não sabe. | Análises, coluna Margem |
| "Esses dados são reais?" | Não. Catálogo Apple com preços de mercado pesquisados, carteira sintética, e-mails em `.test`, CPF e CNPJ fictícios com dígito verificador válido. Base pública Olist como origem do histórico, creditada em `olist/NOTICE.md`. | [massa de demonstração](../03-banco-de-dados/massa-demonstracao.md) |
| "Dá para refazer o cenário?" | Sim: `10_carga_apresentacao.sql` com a mesma data de referência deixa exatamente as mesmas contagens, metas e totais. | `run_apresentacao.sh` |

---

## Se algo der errado no meio

| Sintoma | O que fazer |
| --- | --- |
| A interface não carrega | Os passos 1 a 4 são no cliente SQL e não dependem dela. Siga no SQL e volte à tela depois. |
| A API não sobe | O banco continua consultável. O passo 5 e o 6 ficam para o fim; os passos 1 a 4 e o 7 (pela planilha já gerada) seguem. |
| O banco não sobe | Suba o contêiner: `docker compose -f docker-compose.demo.yml -p sbi-demo up --build`, e conecte em `127.0.0.1:5433`. |
| Um número na tela não bate com o SQL | Confira se o recorte é o mesmo: mês, fuso (`America/Fortaleza`) e perfil. O faturamento confirmado desconta estorno; a receita bruta não. |
| A venda de teste falha por estoque | Escolha outro produto: a tela mostra o saldo disponível. Pedido pendente reserva saldo sem dar baixa. |

Não há senha nem dado pessoal real neste roteiro. As senhas das contas de demonstração ficam em variáveis de ambiente, fora do repositório.
