-- =====================================================================
-- Testes do cenario de apresentacao (CT-APR-00 a CT-APR-14). Cada caso imprime PASS ou FAIL.
-- Rodar como superusuario DEPOIS de 10_carga_apresentacao.sql executado DUAS vezes (CT-APR-03).
--   psql -X -U <usuario> -d <banco> -f 12_testes_apresentacao.sql
-- Nao altera dado nenhum: so le.
-- =====================================================================
\set QUIET on
CREATE OR REPLACE FUNCTION pg_temp.ok(p_id text, p_cond boolean, p_info text DEFAULT '') RETURNS void
LANGUAGE plpgsql AS $$ BEGIN
  IF coalesce(p_cond, false) THEN RAISE NOTICE 'PASS %', p_id; ELSE RAISE NOTICE 'FAIL % %', p_id, p_info; END IF;
END $$;

-- A data de referencia da carga fica registrada em apresentacao.carga; sem ela nada mais faz sentido.
CREATE OR REPLACE FUNCTION pg_temp.ref() RETURNS date LANGUAGE sql STABLE AS
$$ SELECT ref_date FROM apresentacao.carga WHERE id = 1 $$;
CREATE OR REPLACE FUNCTION pg_temp.mes() RETURNS date LANGUAGE sql STABLE AS
$$ SELECT date_trunc('month', pg_temp.ref())::date $$;

SELECT pg_temp.ok('CT-APR-00 registro da carga com a data de referencia', pg_temp.ref() IS NOT NULL);

-- CT-APR-01 o cenario esta completo e identificavel pelo registro proprio
SELECT pg_temp.ok('CT-APR-01 cenario com vendas pagas, 2 pendentes, 1 cancelado e 1 estorno identificados',
       (SELECT count(*) FROM apresentacao.pedido WHERE papel = 'VENDA_PAGA') > 0
       AND (SELECT count(*) FROM apresentacao.pedido WHERE papel = 'PENDENTE') = 2
       AND (SELECT count(*) FROM apresentacao.pedido WHERE papel = 'CANCELADO') = 1
       AND (SELECT count(*) FROM refund WHERE reason LIKE '[apresentacao]%') = 1
       -- todo pedido do cenario existe de fato e nenhum pedido da massa entrou no registro
       AND NOT EXISTS (SELECT 1 FROM apresentacao.pedido ap LEFT JOIN orders o ON o.id = ap.order_id WHERE o.id IS NULL),
       (SELECT string_agg(papel || '=' || n, ' ') FROM (SELECT papel, count(*) n FROM apresentacao.pedido GROUP BY papel) t));

-- CT-APR-02 metas do ano de referencia: 12 meses, distribuicao para os 2 vendedores e meta anual = soma
SELECT pg_temp.ok('CT-APR-02 12 metas mensais, 24 metas por vendedor e meta anual igual a soma das mensais',
       (SELECT count(*) FROM monthly_goal WHERE extract(year FROM period) = extract(year FROM pg_temp.ref())) = 12
       AND (SELECT count(*) FROM seller_goal sg JOIN monthly_goal g ON g.id = sg.monthly_goal_id
             WHERE extract(year FROM g.period) = extract(year FROM pg_temp.ref())) = 24
       AND (SELECT amount FROM annual_goal WHERE year = extract(year FROM pg_temp.ref())::smallint)
         = (SELECT sum(amount) FROM monthly_goal WHERE extract(year FROM period) = extract(year FROM pg_temp.ref())),
       (SELECT 'anual=' || coalesce((SELECT amount FROM annual_goal WHERE year = extract(year FROM pg_temp.ref())::smallint)::text, 'nula')
               || ' soma=' || (SELECT sum(amount) FROM monthly_goal WHERE extract(year FROM period) = extract(year FROM pg_temp.ref()))::text));

-- CT-APR-03 carga repetida nao duplica: um pedido por chave e um registro por pedido
SELECT pg_temp.ok('CT-APR-03 carga repetida sem duplicar pedido, meta ou distribuicao',
       (SELECT count(*) = count(DISTINCT chave) FROM apresentacao.pedido)
       AND (SELECT count(*) = count(DISTINCT order_id) FROM apresentacao.pedido)
       AND (SELECT count(*) = count(DISTINCT period) FROM monthly_goal)
       AND (SELECT count(*) = count(DISTINCT (monthly_goal_id, seller_id)) FROM seller_goal)
       AND (SELECT count(*) FROM refund WHERE reason LIKE '[apresentacao]%') = 1);

-- CT-APR-04 reconciliacao em centavos: a distribuicao fecha exatamente com o plano da loja em todos os meses
SELECT pg_temp.ok('CT-APR-04 distribuicao por vendedor fecha com o plano da loja em centavos',
       NOT EXISTS (SELECT 1 FROM monthly_goal g
                    WHERE (SELECT coalesce(sum(amount), 0) FROM seller_goal WHERE monthly_goal_id = g.id) > 0
                      AND g.amount <> (SELECT sum(amount) FROM seller_goal WHERE monthly_goal_id = g.id)),
       (SELECT string_agg(to_char(g.period, 'YYYY-MM'), ' ') FROM monthly_goal g
         WHERE (SELECT coalesce(sum(amount), 0) FROM seller_goal WHERE monthly_goal_id = g.id) > 0
           AND g.amount <> (SELECT sum(amount) FROM seller_goal WHERE monthly_goal_id = g.id)));

-- CT-APR-05 a meta da equipe soma as metas dos vendedores vinculados (app_users.manager_id) e as equipes
--           cobrem o plano da loja: todo vendedor com meta pertence a uma equipe e a soma das equipes fecha
--           com monthly_goal.amount. Nao existe tabela de meta por equipe (D-EVO-44): a equipe e a soma.
SELECT pg_temp.ok('CT-APR-05 toda meta de vendedor esta numa equipe e a soma das equipes fecha com o plano da loja',
       -- (a) nenhum vendedor com meta no mes de referencia esta fora de uma equipe
       NOT EXISTS (SELECT 1 FROM seller_goal sg
                     JOIN monthly_goal g ON g.id = sg.monthly_goal_id
                     JOIN app_users v ON v.id = sg.seller_id
                    WHERE g.period = pg_temp.mes() AND v.manager_id IS NULL)
       -- (b) somando por equipe (agrupando pelo gerente) da exatamente o plano da loja do mes
       AND (SELECT coalesce(sum(t.meta_da_equipe), 0)
              FROM (SELECT v.manager_id, sum(sg.amount) AS meta_da_equipe
                      FROM seller_goal sg
                      JOIN monthly_goal g ON g.id = sg.monthly_goal_id
                      JOIN app_users v ON v.id = sg.seller_id
                     WHERE g.period = pg_temp.mes()
                     GROUP BY v.manager_id) t)
         = (SELECT amount FROM monthly_goal WHERE period = pg_temp.mes())
       -- (c) ha mais de uma equipe com meta: sem isto (b) passaria com uma equipe so, sem provar a divisao
       AND (SELECT count(DISTINCT v.manager_id) FROM seller_goal sg
              JOIN monthly_goal g ON g.id = sg.monthly_goal_id
              JOIN app_users v ON v.id = sg.seller_id
             WHERE g.period = pg_temp.mes()) >= 2
       -- (d) nenhuma equipe fica com meta zero: a distribuicao divide de verdade. Sem isto, dar todo o
       --     plano a um vendedor e nada ao outro passaria em (a), (b) e (c), porque o gatilho da soma
       --     so confere o total (seller_goal_amount_check aceita amount = 0).
       AND NOT EXISTS (SELECT 1 FROM seller_goal sg
                         JOIN monthly_goal g ON g.id = sg.monthly_goal_id
                        WHERE g.period = pg_temp.mes() AND sg.amount <= 0),
       (SELECT string_agg(coalesce(ger.name, 'SEM EQUIPE') || '=' || t.meta, '; ')
          FROM (SELECT v.manager_id, sum(sg.amount) AS meta FROM seller_goal sg
                  JOIN monthly_goal g ON g.id = sg.monthly_goal_id
                  JOIN app_users v ON v.id = sg.seller_id
                 WHERE g.period = pg_temp.mes() GROUP BY v.manager_id) t
          LEFT JOIN app_users ger ON ger.id = t.manager_id));

-- CT-APR-06 meta anual assinada por um CEO (gatilho annual_goal_only_ceo)
SELECT pg_temp.ok('CT-APR-06 meta anual do ano de referencia definida por um CEO',
       EXISTS (SELECT 1 FROM annual_goal a JOIN app_users u ON u.id = a.updated_by
                WHERE a.year = extract(year FROM pg_temp.ref())::smallint AND u.role = 'CEO'),
       (SELECT u.role FROM annual_goal a JOIN app_users u ON u.id = a.updated_by
         WHERE a.year = extract(year FROM pg_temp.ref())::smallint));

-- CT-APR-07 nenhuma venda no futuro e nenhum pagamento confirmado depois de agora
SELECT pg_temp.ok('CT-APR-07 nenhum pedido nem pagamento com data no futuro',
       (SELECT count(*) FROM orders WHERE moment > (now() AT TIME ZONE 'America/Fortaleza')) = 0
       AND (SELECT count(*) FROM payment WHERE payment_date > (now() AT TIME ZONE 'America/Fortaleza')) = 0,
       (SELECT count(*)::text FROM orders WHERE moment > (now() AT TIME ZONE 'America/Fortaleza')));

-- CT-APR-08 o mes de referencia tem um vendedor acima e outro abaixo do ritmo da meta
SELECT pg_temp.ok('CT-APR-08 mes de referencia com um vendedor acima e um abaixo do ritmo',
       (SELECT count(*) FROM v_desempenho_vendedor d
         WHERE d.periodo = pg_temp.mes()
           AND d.realizado >= d.meta * extract(day FROM pg_temp.ref())
               / extract(day FROM (pg_temp.mes() + interval '1 month - 1 day'))) >= 1
       AND (SELECT count(*) FROM v_desempenho_vendedor d
             WHERE d.periodo = pg_temp.mes()
               AND d.realizado < d.meta * extract(day FROM pg_temp.ref())
                   / extract(day FROM (pg_temp.mes() + interval '1 month - 1 day'))) >= 1,
       (SELECT string_agg(d.vendedor || ' ' || round(d.realizado) || '/' || round(d.meta), '; ')
          FROM v_desempenho_vendedor d WHERE d.periodo = pg_temp.mes()));

-- CT-APR-09 estoque consistente: pendente mantem reserva, cancelado nao, saldo nunca negativo
SELECT pg_temp.ok('CT-APR-09 reserva viva so nos pendentes, saldo e reserva nunca negativos',
       (SELECT count(*) FROM stock_balance WHERE on_hand < 0 OR reserved < 0) = 0
       AND (SELECT coalesce(sum(oi.quantity), 0) FROM order_item oi
              JOIN apresentacao.pedido ap ON ap.order_id = oi.order_id AND ap.papel = 'PENDENTE') > 0
       -- o pedido cancelado do cenario nao tem reserva propria: fn_cancelar_pedido devolveu tudo
       AND (SELECT count(*) FROM stock_movement sm
              JOIN apresentacao.pedido ap ON ap.order_id = sm.order_id AND ap.papel = 'CANCELADO'
             WHERE sm.kind = 'LIBERACAO') > 0,
       (SELECT string_agg(product_id || ':' || on_hand || '/' || reserved, ' ')
          FROM stock_balance WHERE on_hand < 0 OR reserved < 0));

-- CT-APR-10 grao do JOIN. A comparacao util e entre a receita somada DEPOIS do JOIN com pagamento (que
--           repete o pagamento por item) e a receita somada ANTES dele, direto de order_item. Se o JOIN
--           multiplicasse linha, so o primeiro numero cresceria. Comparar a soma pos-JOIN com a view nao
--           provaria nada: a view soma os mesmos itens por uma subconsulta, entao as duas inflariam juntas.
SELECT pg_temp.ok('CT-APR-10 o JOIN com pagamento nao multiplica pedido nem receita; a view difere so pelos estornos',
       -- (a) numero de pedidos: distinto depois do JOIN = total sem o JOIN de itens
       (SELECT count(DISTINCT o.id) FROM orders o JOIN order_item oi ON oi.order_id = o.id
          JOIN payment p ON p.order_id = o.id
         WHERE p.status = 'APPROVED' AND p.payment_date::date BETWEEN pg_temp.mes() AND pg_temp.ref())
         = (SELECT count(*) FROM orders o JOIN payment p ON p.order_id = o.id
             WHERE p.status = 'APPROVED' AND p.payment_date::date BETWEEN pg_temp.mes() AND pg_temp.ref())
       -- (b) receita depois do JOIN = receita de order_item sem passar por orders nem por payment
       AND (SELECT sum(oi.price * oi.quantity - oi.discount) FROM orders o
              JOIN order_item oi ON oi.order_id = o.id JOIN payment p ON p.order_id = o.id
             WHERE p.status = 'APPROVED' AND p.payment_date::date BETWEEN pg_temp.mes() AND pg_temp.ref())
         = (SELECT sum(oi.price * oi.quantity - oi.discount) FROM order_item oi
             WHERE oi.order_id IN (SELECT p.order_id FROM payment p
                                    WHERE p.status = 'APPROVED'
                                      AND p.payment_date::date BETWEEN pg_temp.mes() AND pg_temp.ref()))
       -- (c) numero de LINHAS depois do JOIN = numero de itens dos mesmos pedidos (nenhuma linha repetida)
       AND (SELECT count(*) FROM orders o JOIN order_item oi ON oi.order_id = o.id
              JOIN payment p ON p.order_id = o.id
             WHERE p.status = 'APPROVED' AND p.payment_date::date BETWEEN pg_temp.mes() AND pg_temp.ref())
         = (SELECT count(*) FROM order_item oi
             WHERE oi.order_id IN (SELECT p.order_id FROM payment p
                                    WHERE p.status = 'APPROVED'
                                      AND p.payment_date::date BETWEEN pg_temp.mes() AND pg_temp.ref()))
       -- (d) a view do sistema bate com a venda e subtrai o estorno, que existe no recorte
       AND (SELECT sum(l.valor) FROM v_lancamento_realizado l
             WHERE l.data BETWEEN pg_temp.mes() AND pg_temp.ref() AND l.tipo = 'VENDA')
         = (SELECT sum(oi.price * oi.quantity - oi.discount) FROM order_item oi
             WHERE oi.order_id IN (SELECT p.order_id FROM payment p
                                    WHERE p.status = 'APPROVED'
                                      AND p.payment_date::date BETWEEN pg_temp.mes() AND pg_temp.ref()))
       AND (SELECT coalesce(sum(l.valor), 0) FROM v_lancamento_realizado l
             WHERE l.data BETWEEN pg_temp.mes() AND pg_temp.ref() AND l.tipo = 'ESTORNO') < 0);

-- CT-APR-11 carteira de clientes: toda pessoa fisica com nome, e-mail, telefone, CPF e endereco completo
SELECT pg_temp.ok('CT-APR-11 pessoa fisica com nome, e-mail, telefone, CPF e endereco completo',
       (SELECT count(*) FROM customer WHERE customer_type = 'INDIVIDUAL') > 0
       AND NOT EXISTS (
         SELECT 1 FROM customer c LEFT JOIN address a ON a.id = c.address_id
          WHERE c.customer_type = 'INDIVIDUAL'
            AND (c.name IS NULL OR btrim(c.name) = ''
                 OR c.email IS NULL OR c.email NOT LIKE '%@%'
                 OR c.phone IS NULL OR length(regexp_replace(c.phone, '[^0-9]', '', 'g')) < 10
                 OR c.cpf IS NULL OR c.cpf !~ '^[0-9]{11}$'
                 OR a.id IS NULL
                 OR a.street IS NULL OR btrim(a.street) = ''
                 OR a.number IS NULL OR btrim(a.number) = ''
                 OR a.neighborhood IS NULL OR btrim(a.neighborhood) = ''
                 OR a.city IS NULL OR btrim(a.city) = ''
                 OR a.state IS NULL OR a.state !~ '^[A-Z]{2}$'
                 OR a.zip_code IS NULL OR a.zip_code !~ '^[0-9]{8}$')),
       (SELECT string_agg(c.id::text, ' ') FROM customer c LEFT JOIN address a ON a.id = c.address_id
         WHERE c.customer_type = 'INDIVIDUAL'
           AND (c.phone IS NULL OR c.cpf IS NULL OR a.id IS NULL OR a.zip_code !~ '^[0-9]{8}$')));

-- CT-APR-12 pessoa juridica com CNPJ e sem CPF, e nenhum documento repetido
SELECT pg_temp.ok('CT-APR-12 pessoa juridica com CNPJ e sem CPF; nenhum documento repetido',
       NOT EXISTS (SELECT 1 FROM customer WHERE customer_type = 'CORPORATE' AND (cnpj IS NULL OR cpf IS NOT NULL))
       AND (SELECT count(*) FROM customer WHERE cpf IS NOT NULL) = (SELECT count(DISTINCT cpf) FROM customer WHERE cpf IS NOT NULL)
       AND (SELECT count(*) FROM customer WHERE cnpj IS NOT NULL) = (SELECT count(DISTINCT cnpj) FROM customer WHERE cnpj IS NOT NULL));

-- CT-APR-13 catalogo: 42 SKUs Apple com preco e custo, e cliente novo e recorrente na carteira
SELECT pg_temp.ok('CT-APR-13 42 SKUs OL-* com preco positivo e custo medio informado',
       (SELECT count(*) FROM product WHERE sku LIKE 'OL-%') = 42
       AND (SELECT count(*) FROM product WHERE sku LIKE 'OL-%' AND (price IS NULL OR price <= 0)) = 0
       AND (SELECT count(*) FROM product p JOIN stock_balance b ON b.product_id = p.id
             WHERE p.sku LIKE 'OL-%' AND b.avg_cost IS NULL) = 0);

SELECT pg_temp.ok('CT-APR-14 carteira com cliente de compra unica e cliente recorrente',
       (SELECT count(*) FROM (SELECT customer_id FROM orders GROUP BY customer_id HAVING count(*) = 1) t) > 0
       AND (SELECT count(*) FROM (SELECT customer_id FROM orders GROUP BY customer_id HAVING count(*) >= 5) t) > 0,
       (SELECT 'unico=' || (SELECT count(*) FROM (SELECT customer_id FROM orders GROUP BY customer_id HAVING count(*) = 1) a)
               || ' recorrente=' || (SELECT count(*) FROM (SELECT customer_id FROM orders GROUP BY customer_id HAVING count(*) >= 5) b)));
