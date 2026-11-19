-- =====================================================================
-- Prova de Banco de Dados do SBI para a banca: banco funcional, dados armazenados, SQL e CRUD.
-- Cobre os passos 1 a 4 do enunciado, nesta ordem; o passo 5 esta em
-- docs/05-operacao/roteiro-banco-de-dados.md. Executar depois do Flyway (perfil demo),
-- de 07_carga_olist.sql e de 10_carga_apresentacao.sql, a partir desta pasta:
--   psql -X -U <usuario> -d <banco> -v ON_ERROR_STOP=1 -f 11_prova_banco.sql
--
-- O arquivo e escrito para o psql: cada passo se anuncia numa linha \echo 'PASSO n - ...' entre
-- barras de '=', e NAO existe comentario "-- PASSO n". As linhas de meta-comando (\set, \pset,
-- \timing, \echo) sao do cliente psql e nao sao SQL; para rodar passo a passo no painel Database
-- do IntelliJ ou no DBeaver, selecione so as linhas SQL do passo e leve junto o BEGIN dele. Sem
-- o BEGIN, em autocommit, o CRUD do passo 2 nao grava o cliente ficticio: ele quebra, porque a
-- primeira instrucao e uma TEMP TABLE ON COMMIT DROP que some antes do INSERT seguinte. Mas o
-- reajuste de preco de 2.7 grava de verdade, e o SET LOCAL do motivo vira so um WARNING.
--
-- Pelo caminho automatizado nada fica alterado em definitivo: o passo 2 e as quatro primeiras
-- recusas do passo 3 rodam em transacao terminada em ROLLBACK, e a quinta recusa roda fora de
-- transacao explicita mas se desfaz sozinha, pela subtransacao do bloco EXCEPTION - a conferencia
-- logo depois dela mostra que nada ficou. As cinco rejeicoes do passo 3 sao ESPERADAS e ficam em
-- blocos com EXCEPTION que reconhecem so o erro previsto; qualquer outro erro aborta o script
-- (ON_ERROR_STOP), entao o caminho automatizado devolve falha quando aparece erro inesperado.
-- =====================================================================
\set ON_ERROR_STOP on
\pset pager off
\timing off

\echo ''
\echo '==================================================================='
\echo 'PASSO 1 - O banco esta funcionando e os dados estao armazenados'
\echo '==================================================================='

-- 1.1 Conexao, banco, usuario, versao e fuso. A loja trabalha em America/Fortaleza (StoreTime.ZONE).
SELECT current_database()                      AS banco,
       current_user                            AS usuario_conectado,
       inet_server_addr()                      AS servidor,
       inet_server_port()                      AS porta,
       version()                               AS versao_postgresql,
       current_setting('TimeZone')             AS fuso_da_sessao,
       (now() AT TIME ZONE 'America/Fortaleza') AS agora_na_loja;

-- 1.2 Tabelas do modelo com a contagem real de linhas: o que a banca pede como "dados armazenados".
--     A contagem e feita por COUNT(*) em cada tabela, nao por estatistica do planejador.
SELECT t.table_name AS tabela,
       (xpath('/row/c/text()',
              query_to_xml(format('SELECT count(*) AS c FROM public.%I', t.table_name), false, true, '')))[1]::text::bigint AS linhas
  FROM information_schema.tables t
 WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE' AND t.table_name <> 'flyway_schema_history'
 ORDER BY linhas DESC, t.table_name;

-- 1.3 Versao do esquema aplicada pelo Flyway (a migracao e a unica fonte do esquema, decisao A2).
SELECT installed_rank AS ordem, version AS versao, description AS descricao, success AS aplicada
  FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;

-- 1.4 Chaves primarias de cada tabela.
SELECT c.conrelid::regclass AS tabela, c.conname AS restricao,
       string_agg(a.attname, ', ' ORDER BY k.ord) AS colunas
  FROM pg_constraint c
  JOIN unnest(c.conkey) WITH ORDINALITY k(attnum, ord) ON true
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
 WHERE c.contype = 'p' AND c.connamespace = 'public'::regnamespace
 GROUP BY c.conrelid, c.conname
 ORDER BY 1;

-- 1.5 Relacoes do modelo: toda chave estrangeira, com a tabela e a coluna que ela aponta.
--     Aqui estao os quatro grupos que a banca vai conferir:
--       cliente/endereco, pedido/itens/pagamento, produto/estoque e metas.
SELECT c.conrelid::regclass AS tabela_filha,
       string_agg(af.attname, ', ' ORDER BY kf.ord) AS coluna,
       c.confrelid::regclass AS tabela_pai,
       c.conname AS chave_estrangeira,
       CASE c.confdeltype WHEN 'a' THEN 'NO ACTION (protege o pai)' WHEN 'c' THEN 'CASCADE'
                          WHEN 'n' THEN 'SET NULL' WHEN 'r' THEN 'RESTRICT' ELSE c.confdeltype::text END AS ao_excluir_o_pai
  FROM pg_constraint c
  JOIN unnest(c.conkey) WITH ORDINALITY kf(attnum, ord) ON true
  JOIN pg_attribute af ON af.attrelid = c.conrelid AND af.attnum = kf.attnum
 WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
 GROUP BY c.oid, c.conrelid, c.confrelid, c.conname, c.confdeltype
 ORDER BY 1, 4;

-- 1.6 Restricoes de dominio (CHECK) e de unicidade das tabelas dos quatro grupos: o que o banco recusa.
SELECT c.conrelid::regclass AS tabela,
       c.conname AS restricao,
       CASE c.contype WHEN 'c' THEN 'CHECK' WHEN 'u' THEN 'UNIQUE' END AS tipo,
       pg_get_constraintdef(c.oid) AS regra
  FROM pg_constraint c
 WHERE c.connamespace = 'public'::regnamespace AND c.contype IN ('c', 'u')
   AND c.conrelid::regclass::text IN ('customer', 'address', 'orders', 'order_item', 'payment', 'refund',
                                      'product', 'stock_balance', 'monthly_goal', 'seller_goal', 'annual_goal')
 ORDER BY 1, 3, 2;

-- 1.7 Gatilhos que o banco usa para manter as regras de negocio (autoria, soma das metas, estoque, historico de preco).
SELECT c.relname AS tabela, t.tgname AS gatilho, p.proname AS funcao,
       CASE WHEN t.tgdeferrable THEN 'adiado para o COMMIT' ELSE 'imediato' END AS momento
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_proc p ON p.oid = t.tgfoid
 WHERE NOT t.tgisinternal AND c.relnamespace = 'public'::regnamespace
 ORDER BY 1, 2;

-- 1.8 Dicionario das colunas dos quatro grupos (tipo, obrigatoriedade e padrao).
SELECT table_name AS tabela, ordinal_position AS pos, column_name AS coluna,
       format_type(a.atttypid, a.atttypmod) AS tipo,
       CASE WHEN is_nullable = 'NO' THEN 'obrigatoria' ELSE 'opcional' END AS preenchimento,
       column_default AS padrao
  FROM information_schema.columns ic
  JOIN pg_attribute a ON a.attrelid = (quote_ident(ic.table_schema) || '.' || quote_ident(ic.table_name))::regclass
                      AND a.attname = ic.column_name
 WHERE table_schema = 'public'
   AND table_name IN ('customer', 'address', 'orders', 'order_item', 'payment', 'monthly_goal', 'seller_goal', 'annual_goal')
 ORDER BY table_name, ordinal_position;

\echo ''
\echo '==================================================================='
\echo 'PASSO 2 - CRUD completo no mesmo cliente ficticio, em transacao'
\echo '==================================================================='

BEGIN;
-- Autoria pelo mecanismo do sistema: as colunas created_by/updated_by leem app_current_user_id().
-- As contas sao achadas pelo db_role, que nao muda quando o ambiente publicado renomeia nome e e-mail.
SELECT set_config('app.user_id', (SELECT id::text FROM app_users WHERE db_role = 'gerente_matheus'), true);

-- 2.0 Estado ANTES: quantos clientes existem e se o documento da demonstracao ja esta em uso.
SELECT count(*) AS clientes_antes,
       count(*) FILTER (WHERE cpf = '52998224725') AS com_este_cpf_antes
  FROM customer;

-- 2.1 CREATE: endereco e cliente, devolvendo os IDs gerados.
--     O endereco entra primeiro porque customer.address_id aponta para ele.
CREATE TEMP TABLE prova_ids (rotulo text PRIMARY KEY, id bigint NOT NULL) ON COMMIT DROP;

WITH novo_endereco AS (
    INSERT INTO address(street, number, neighborhood, city, state, zip_code)
    VALUES ('Rua da Apresentacao', '250', 'Aldeota', 'Fortaleza', 'CE', '60150000')
    RETURNING id
)
INSERT INTO prova_ids(rotulo, id) SELECT 'address', id FROM novo_endereco
RETURNING rotulo, id AS address_id;

WITH novo_cliente AS (
    INSERT INTO customer(customer_type, name, cpf, email, phone, address_id)
    VALUES ('INDIVIDUAL', 'Cliente da Banca', '52998224725', 'banca.pf@example.com', '85988887777',
            (SELECT id FROM prova_ids WHERE rotulo = 'address'))
    RETURNING id
)
INSERT INTO prova_ids(rotulo, id) SELECT 'customer', id FROM novo_cliente
RETURNING rotulo, id AS customer_id;

-- 2.1b Estado APOS O CREATE: um cliente a mais e o documento agora em uso.
SELECT count(*) AS clientes_apos_create,
       count(*) FILTER (WHERE cpf = '52998224725') AS com_este_cpf_apos_create
  FROM customer;

-- 2.2 READ: os dois registros numa consulta com JOIN, como a interface os mostra.
SELECT c.id AS cliente_id, c.customer_type AS tipo, c.name AS nome, c.cpf, c.email, c.phone, c.version AS versao,
       u.name AS cadastrado_por, c.created_at,
       a.id AS endereco_id, a.street AS logradouro, a.number AS numero, a.neighborhood AS bairro,
       a.city AS cidade, a.state AS uf, a.zip_code AS cep
  FROM customer c
  JOIN address a   ON a.id = c.address_id
  JOIN app_users u ON u.id = c.created_by
 WHERE c.id = (SELECT id FROM prova_ids WHERE rotulo = 'customer');

-- 2.3 UPDATE: telefone e e-mail do mesmo cliente; a coluna version acompanha a alteracao.
UPDATE customer
   SET phone = '85997776666', email = 'banca.novo@example.com', version = version + 1, updated_at = now()
 WHERE id = (SELECT id FROM prova_ids WHERE rotulo = 'customer')
RETURNING id, name, phone, email, version, updated_at;

-- 2.4 READ depois do UPDATE: confere que o valor gravado e o novo.
SELECT c.id AS cliente_id, c.name AS nome, c.phone AS telefone, c.email, c.version AS versao,
       a.city AS cidade, a.state AS uf
  FROM customer c JOIN address a ON a.id = c.address_id
 WHERE c.id = (SELECT id FROM prova_ids WHERE rotulo = 'customer');

-- 2.5 DELETE: o registro descartavel sai porque nao tem pedido associado.
DELETE FROM customer WHERE id = (SELECT id FROM prova_ids WHERE rotulo = 'customer')
RETURNING id, name, cpf;
DELETE FROM address WHERE id = (SELECT id FROM prova_ids WHERE rotulo = 'address')
RETURNING id, street, city;

-- 2.6 Estado APOS O DELETE, ainda dentro da transacao: o cliente da sessao nao existe mais e a
--     contagem voltou ao valor de 2.0. A sequencia completa e 2.0 -> 2.1b -> 2.6 -> 2.8.
SELECT count(*) AS clientes_apos_delete,
       count(*) FILTER (WHERE cpf = '52998224725') AS com_este_cpf_apos_delete
  FROM customer;

-- 2.7 Mudanca de preco com motivo, autoria e historico (gatilho trg_product_price_history).
SET LOCAL app.reason = 'Reajuste de tabela demonstrado na banca';
UPDATE product SET price = price + 10.00
 WHERE id = (SELECT id FROM product WHERE active ORDER BY sku LIMIT 1)
RETURNING sku, name, price AS preco_novo;
SELECT p.sku, h.old_price AS preco_antigo, h.new_price AS preco_novo, u.name AS alterado_por,
       h.reason AS motivo, h.changed_at AS quando
  FROM product_price_history h
  JOIN product p   ON p.id = h.product_id
  JOIN app_users u ON u.id = h.changed_by
 WHERE p.id = (SELECT id FROM product WHERE active ORDER BY sku LIMIT 1)
 ORDER BY h.changed_at DESC LIMIT 3;

ROLLBACK;

-- 2.8 Estado APOS O ROLLBACK: o banco voltou ao que era antes do passo 2. Nada do CRUD ficou gravado.
SELECT count(*) AS clientes_apos_rollback,
       count(*) FILTER (WHERE cpf = '52998224725') AS com_este_cpf_apos_rollback,
       count(*) FILTER (WHERE email = 'banca.novo@example.com') AS com_email_da_banca
  FROM customer;

\echo ''
\echo '==================================================================='
\echo 'PASSO 3 - Integridade: o banco recusa o que nao pode entrar'
\echo '==================================================================='

BEGIN;
SELECT set_config('app.user_id', (SELECT id::text FROM app_users WHERE db_role = 'gerente_matheus'), true);

-- Cada bloco tenta uma operacao invalida e espera a rejeicao. Reconhece SO o erro previsto:
-- se a operacao for aceita, o bloco levanta excecao e o script falha; se vier outro erro, ele propaga.
DO $$
DECLARE v_cpf text;
BEGIN
    SELECT cpf INTO v_cpf FROM customer WHERE cpf IS NOT NULL ORDER BY id LIMIT 1;
    IF v_cpf IS NULL THEN RAISE EXCEPTION 'prova de integridade: nenhum cliente com CPF na massa'; END IF;
    BEGIN
        INSERT INTO customer(customer_type, name, cpf, email)
        VALUES ('INDIVIDUAL', 'CPF repetido', v_cpf, 'repetido@example.com');
        RAISE EXCEPTION 'prova de integridade FALHOU: o banco aceitou CPF duplicado (%)', v_cpf;
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'OK 1/5 - CPF duplicado recusado (client_cpf_key): %', SQLERRM;
    END;
END $$;

DO $$
BEGIN
    BEGIN
        -- Pessoa fisica com CNPJ: ck_customer_document_type exige CPF para INDIVIDUAL e CNPJ para CORPORATE.
        INSERT INTO customer(customer_type, name, cnpj, email)
        VALUES ('INDIVIDUAL', 'PF com CNPJ', '11222333000181', 'incompativel@example.com');
        RAISE EXCEPTION 'prova de integridade FALHOU: o banco aceitou pessoa fisica com CNPJ';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'OK 2/5 - documento incompativel com o tipo recusado (ck_customer_document_type): %', SQLERRM;
    END;
END $$;

DO $$
BEGIN
    BEGIN
        -- CPF com mascara: o banco guarda somente os onze digitos (ck_customer_cpf).
        INSERT INTO customer(customer_type, name, cpf, email)
        VALUES ('INDIVIDUAL', 'CPF com mascara', '529.982.247-25', 'mascara@example.com');
        RAISE EXCEPTION 'prova de integridade FALHOU: o banco aceitou CPF com mascara';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'OK 3/5 - CPF fora do formato recusado (ck_customer_cpf): %', SQLERRM;
    END;
END $$;

DO $$
DECLARE v_id bigint; v_nome text; v_pedidos int;
BEGIN
    SELECT c.id, c.name, count(o.id) INTO v_id, v_nome, v_pedidos
      FROM customer c JOIN orders o ON o.customer_id = c.id
     GROUP BY c.id, c.name ORDER BY count(o.id) DESC, c.id LIMIT 1;
    IF v_id IS NULL THEN RAISE EXCEPTION 'prova de integridade: nenhum cliente com pedido na massa'; END IF;
    BEGIN
        DELETE FROM customer WHERE id = v_id;
        RAISE EXCEPTION 'prova de integridade FALHOU: o banco excluiu o cliente % com % pedido(s)', v_nome, v_pedidos;
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'OK 4/5 - exclusao de cliente com % pedido(s) recusada (orders_client_id_fkey): %', v_pedidos, SQLERRM;
    END;
END $$;

-- A distribuicao por vendedor tem de fechar com o plano da loja: o gatilho da soma e adiado para o COMMIT,
-- por isso a rejeicao aparece no COMMIT e nao no INSERT. Aqui o bloco e fechado com ROLLBACK de propósito.
ROLLBACK;

DO $$
DECLARE v_goal bigint; v_vend bigint;
BEGIN
    SELECT id INTO v_vend FROM app_users WHERE role = 'VENDEDOR' AND active ORDER BY id LIMIT 1;
    BEGIN
        PERFORM set_config('app.user_id', (SELECT id::text FROM app_users WHERE db_role = 'gerente_matheus'), true);
        INSERT INTO monthly_goal(period, amount) VALUES (date '1999-01-01', 100000.00) RETURNING id INTO v_goal;
        INSERT INTO seller_goal(monthly_goal_id, seller_id, amount) VALUES (v_goal, v_vend, 1.00);
        -- Força a verificação adiada agora, sem precisar de COMMIT.
        SET CONSTRAINTS ALL IMMEDIATE;
        RAISE EXCEPTION 'prova de integridade FALHOU: o banco aceitou distribuicao (1,00) diferente do plano (100000,00)';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'OK 5/5 - distribuicao fora do plano da loja recusada (trg_goal_sum_check): %', SQLERRM;
    END;
END $$;

-- O bloco acima roda fora de transacao explicita: o DO ja desfez o proprio trabalho ao levantar a excecao
-- interna. Confere que a meta de teste nao ficou gravada.
SELECT count(*) AS meta_de_teste_restante FROM monthly_goal WHERE period = date '1999-01-01';

\echo ''
\echo '==================================================================='
\echo 'PASSO 4 - Consultas analiticas: pedido, itens, pagamento, produto e equipe'
\echo '==================================================================='

-- 4.1 Grao de ITEM: uma linha por item do pedido, com produto, pagamento, vendedor e equipe.
--     O pagamento e 1:1 com o pedido (payment_order_id_key), entao ele se repete por item nesta forma.
--     Por isso a receita desta consulta vem do ITEM, nunca de payment.amount.
SELECT o.id AS pedido, (o.moment)::date AS data, o.status,
       cli.name AS cliente,
       vend.name AS vendedor, coalesce(ger.name, '(sem gerente)') AS equipe,
       p.sku, p.name AS produto, cat.name AS categoria,
       oi.quantity AS qtd, oi.price AS preco_unitario, oi.discount AS desconto,
       oi.price * oi.quantity - oi.discount AS receita_do_item,
       pay.payment_type AS forma_pagamento, pay.status AS status_pagamento
  FROM orders o
  JOIN order_item oi ON oi.order_id = o.id
  JOIN product p     ON p.id = oi.product_id
  JOIN category cat  ON cat.id = p.category_id
  JOIN payment pay   ON pay.order_id = o.id
  JOIN customer cli  ON cli.id = o.customer_id
  JOIN app_users vend ON vend.id = o.seller_id
  LEFT JOIN app_users ger ON ger.id = vend.manager_id
 WHERE pay.status = 'APPROVED'
   AND (pay.payment_date)::date >= date_trunc('month', (SELECT ref_date FROM apresentacao.carga WHERE id = 1))
 ORDER BY o.id, p.sku
 LIMIT 25;

-- 4.2 Grao de PEDIDO: uma linha por pedido. Os itens entram agregados, por isso a soma de receita
--     nao duplica nada. O total do pedido confere com o valor do pagamento.
SELECT o.id AS pedido, (pay.payment_date)::date AS data_pagamento,
       vend.name AS vendedor, coalesce(ger.name, '(sem gerente)') AS equipe,
       pay.payment_type AS forma_pagamento,
       i.itens, i.unidades, i.receita AS receita_do_pedido, pay.amount AS valor_do_pagamento,
       CASE WHEN i.receita = pay.amount THEN 'confere' ELSE 'DIVERGE' END AS conferencia
  FROM orders o
  JOIN payment pay ON pay.order_id = o.id
  JOIN app_users vend ON vend.id = o.seller_id
  LEFT JOIN app_users ger ON ger.id = vend.manager_id
  JOIN LATERAL (SELECT count(*) AS itens, sum(oi.quantity) AS unidades,
                       sum(oi.price * oi.quantity - oi.discount) AS receita
                  FROM order_item oi WHERE oi.order_id = o.id) i ON true
 WHERE pay.status = 'APPROVED'
   AND (pay.payment_date)::date >= date_trunc('month', (SELECT ref_date FROM apresentacao.carga WHERE id = 1))
 ORDER BY i.receita DESC
 LIMIT 15;

-- 4.3 Prova de que o JOIN nao multiplicou pedido nem receita: os dois graos dao o mesmo total.
WITH recorte AS (
    SELECT date_trunc('month', (SELECT ref_date FROM apresentacao.carga WHERE id = 1))::date AS de,
           (SELECT ref_date FROM apresentacao.carga WHERE id = 1) AS ate
), por_item AS (
    SELECT count(DISTINCT o.id) AS pedidos, sum(oi.price * oi.quantity - oi.discount) AS receita
      FROM orders o JOIN order_item oi ON oi.order_id = o.id JOIN payment pay ON pay.order_id = o.id, recorte r
     WHERE pay.status = 'APPROVED' AND (pay.payment_date)::date BETWEEN r.de AND r.ate
), por_pedido AS (
    SELECT count(*) AS pedidos, sum(i.receita) AS receita
      FROM orders o JOIN payment pay ON pay.order_id = o.id, recorte r
      JOIN LATERAL (SELECT sum(oi.price * oi.quantity - oi.discount) AS receita
                      FROM order_item oi WHERE oi.order_id = o.id) i ON true
     WHERE pay.status = 'APPROVED' AND (pay.payment_date)::date BETWEEN r.de AND r.ate
), pela_view AS (
    -- A view do sistema (faturamento confirmado = pagamento aprovado menos estorno) no mesmo recorte.
    SELECT count(DISTINCT l.order_id) FILTER (WHERE l.tipo = 'VENDA') AS pedidos, sum(l.valor) AS receita
      FROM v_lancamento_realizado l, recorte r
     WHERE l.data BETWEEN r.de AND r.ate
)
SELECT 'grao de item'   AS caminho, pedidos, receita FROM por_item
UNION ALL SELECT 'grao de pedido', pedidos, receita FROM por_pedido
UNION ALL SELECT 'view do sistema (com estornos)', pedidos, receita FROM pela_view;

-- 4.4 Meta x realizado por mes e por vendedor, pela view do projeto (v_desempenho_vendedor).
--     Esta e a tabela que a banca compara com o grafico da tela e com a aba Metas da planilha.
SELECT to_char(d.periodo, 'YYYY-MM') AS mes, d.vendedor,
       coalesce(ger.name, '(sem gerente)') AS equipe,
       d.meta, d.realizado, d.atingimento_pct AS atingimento_percentual, d.falta, d.situacao
  FROM v_desempenho_vendedor d
  JOIN app_users v ON v.id = d.seller_id
  LEFT JOIN app_users ger ON ger.id = v.manager_id
 WHERE extract(year FROM d.periodo) = extract(year FROM (SELECT ref_date FROM apresentacao.carga WHERE id = 1))
 ORDER BY d.periodo, d.vendedor;

-- 4.5 Meta x realizado da loja por mes: o plano, a soma da distribuicao e o realizado de todos
--     (inclui a venda do gerente, que soma na loja e nao tem meta individual).
SELECT to_char(g.period, 'YYYY-MM') AS mes,
       g.amount AS plano_da_loja,
       (SELECT coalesce(sum(sg.amount), 0) FROM seller_goal sg WHERE sg.monthly_goal_id = g.id) AS soma_da_distribuicao,
       coalesce((SELECT sum(l.valor) FROM v_lancamento_realizado l
                  WHERE l.data >= g.period AND l.data < g.period + interval '1 month'), 0) AS realizado_da_loja,
       u.name AS meta_definida_por
  FROM monthly_goal g JOIN app_users u ON u.id = g.created_by
 WHERE extract(year FROM g.period) = extract(year FROM (SELECT ref_date FROM apresentacao.carga WHERE id = 1))
 ORDER BY g.period;

-- 4.6 Meta anual do ano de referencia, com autoria (somente CEO, gatilho annual_goal_only_ceo).
SELECT a.year AS ano, a.amount AS meta_anual, u.name AS definida_por, u.role AS papel, a.updated_at AS quando,
       (SELECT sum(amount) FROM monthly_goal WHERE extract(year FROM period) = a.year) AS soma_das_metas_mensais
  FROM annual_goal a JOIN app_users u ON u.id = a.updated_by
 WHERE a.year = extract(year FROM (SELECT ref_date FROM apresentacao.carga WHERE id = 1))::smallint;

-- 4.7 Composicao do mes de referencia por forma de pagamento e por categoria: o que os graficos mostram.
SELECT f.forma_pagamento, count(DISTINCT f.order_id) AS pedidos, sum(f.unidades) AS unidades,
       sum(f.receita_liquida) AS receita,
       round(100.0 * sum(f.receita_liquida) / nullif(sum(sum(f.receita_liquida)) OVER (), 0), 1) AS participacao_pct
  FROM v_fato_venda_item f
 WHERE f.data >= date_trunc('month', (SELECT ref_date FROM apresentacao.carga WHERE id = 1))
   AND f.data <= (SELECT ref_date FROM apresentacao.carga WHERE id = 1)
 GROUP BY f.forma_pagamento
 ORDER BY receita DESC;

SELECT cat.name AS categoria, count(DISTINCT f.order_id) AS pedidos, sum(f.unidades) AS unidades,
       sum(f.receita_liquida) AS receita,
       CASE WHEN count(*) FILTER (WHERE f.custo IS NULL) > 0 THEN 'Nao informado'
            ELSE to_char(sum(f.receita_liquida) - sum(f.custo), 'FM999999990.00') END AS margem
  FROM v_fato_venda_item f
  JOIN product p    ON p.id = f.product_id
  JOIN category cat ON cat.id = p.category_id
 WHERE f.data >= date_trunc('month', (SELECT ref_date FROM apresentacao.carga WHERE id = 1))
   AND f.data <= (SELECT ref_date FROM apresentacao.carga WHERE id = 1)
 GROUP BY cat.name
 ORDER BY receita DESC;

-- 4.8 Reconciliacao final do recorte: o numero unico que a banca confere na tela e na planilha.
--     Guarde esta linha: ela e a referencia da conferencia entre PostgreSQL, painel e Excel.
SELECT to_char(date_trunc('month', c.ref_date), 'YYYY-MM') AS mes_de_referencia,
       date_trunc('month', c.ref_date)::date AS de, c.ref_date AS ate,
       count(DISTINCT l.order_id) FILTER (WHERE l.tipo = 'VENDA')   AS pedidos_pagos,
       count(*) FILTER (WHERE l.tipo = 'ESTORNO')                   AS estornos,
       coalesce(sum(l.valor) FILTER (WHERE l.tipo = 'VENDA'), 0)    AS vendas_confirmadas,
       coalesce(sum(l.valor) FILTER (WHERE l.tipo = 'ESTORNO'), 0)  AS estornado,
       coalesce(sum(l.valor), 0)                                    AS faturamento_confirmado,
       (SELECT amount FROM monthly_goal WHERE period = date_trunc('month', c.ref_date)) AS plano_do_mes
  FROM apresentacao.carga c
  LEFT JOIN v_lancamento_realizado l
         ON l.data >= date_trunc('month', c.ref_date) AND l.data <= c.ref_date
 WHERE c.id = 1
 GROUP BY c.ref_date;

\echo ''
\echo '==================================================================='
\echo 'FIM - os quatro passos deste arquivo rodaram sem erro inesperado.'
\echo 'O passo 5 (ordem de execucao, o que apontar na tela e o plano local)'
\echo 'esta em docs/05-operacao/roteiro-banco-de-dados.md'
\echo '==================================================================='
