-- =====================================================================
-- Cenario de apresentacao do SBI: metas do ano de referencia, operacao em andamento e dias fortes e fracos.
-- Executar DEPOIS do Flyway (perfil demo) e, quando houver, depois de 07_carga_olist.sql, nesta pasta:
--   psql -U <superusuario> -d <banco> -v ON_ERROR_STOP=1 -f 10_carga_apresentacao.sql
--   psql ... -v ref=2026-11-25 -f 10_carga_apresentacao.sql   -- data de referencia explicita
-- Sem -v ref, a referencia e a data de hoje em America/Fortaleza (fuso da loja, StoreTime.ZONE).
--
-- Reproduzivel: tudo que varia vem de hashtext() da chave do registro, nunca de random().
-- Identificavel: cada pedido do cenario fica registrado em apresentacao.pedido, no schema proprio
--                apresentacao (mesmo recurso que a 07 usa com stg_olist), separado da massa ja cadastrada.
-- Transacional: um unico BEGIN/COMMIT com conferencia no fim; a transacao so confirma se as contas baterem.
-- Idempotente: apaga a carga anterior pelo registro antes de inserir. Duas execucoes com a mesma
--              referencia deixam as mesmas contagens, metas e totais.
-- Nunca grava venda no futuro: todo instante e limitado a referencia.
-- =====================================================================
\set ON_ERROR_STOP on

-- Padrao da data de referencia quando -v ref nao e informado.
\if :{?ref}
\else
  \set ref 'hoje'
\endif

BEGIN;

-- ---------------------------------------------------------------------
-- Autoria e contas: as contas da V6_1/V12_1 sao achadas pelo db_role, que nao muda quando o ambiente
-- publicado renomeia nome e e-mail. O gerente responde pela carga; a meta anual exige um CEO (V12).
-- ---------------------------------------------------------------------
SELECT set_config('app.user_id', (SELECT id::text FROM app_users WHERE db_role = 'gerente_matheus'), true);
DO $$
DECLARE v_faltando text;
BEGIN
    IF app_current_user_id() IS NULL THEN
        RAISE EXCEPTION 'cenario de apresentacao: conta gerente_matheus inexistente (rode o Flyway no perfil demo)';
    END IF;
    SELECT string_agg(d, ', ' ORDER BY d) INTO v_faltando
      FROM (VALUES ('gerente_matheus'), ('gerente_gabriel'), ('vendedor_allan'), ('vendedor_francisco'), ('ceo_paulo')) v(d)
     WHERE NOT EXISTS (SELECT 1 FROM app_users u WHERE u.db_role = v.d AND u.active);
    IF v_faltando IS NOT NULL THEN
        RAISE EXCEPTION 'cenario de apresentacao: contas ausentes ou inativas: %', v_faltando;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM product WHERE active AND sellable) THEN
        RAISE EXCEPTION 'cenario de apresentacao: catalogo vazio (rode 07_carga_olist.sql ou o seed do perfil demo)';
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- Registro da carga: a data de referencia resolvida e os pedidos que o cenario criou.
-- ---------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS apresentacao;
CREATE TABLE IF NOT EXISTS apresentacao.carga (
    id          integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    ref_date    date NOT NULL,
    carregado_em timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS apresentacao.pedido (
    order_id bigint PRIMARY KEY,
    papel    text   NOT NULL,
    chave    text   NOT NULL UNIQUE
);

-- Referencia pedida (ou hoje na loja). A carga recusa referencia no futuro: o painel compararia com dias sem dado.
-- nullif antes do cast: com -v ref=hoje o literal nunca e convertido para date.
CREATE TEMP TABLE ref_cfg ON COMMIT DROP AS
SELECT coalesce(nullif(:'ref', 'hoje')::date, (now() AT TIME ZONE 'America/Fortaleza')::date) AS ref;
DO $$
DECLARE v_ref date; v_hoje date := (now() AT TIME ZONE 'America/Fortaleza')::date;
BEGIN
    SELECT ref INTO v_ref FROM ref_cfg;
    IF v_ref > v_hoje THEN
        RAISE EXCEPTION 'cenario de apresentacao: referencia % esta no futuro (hoje na loja: %)', v_ref, v_hoje;
    END IF;
    RAISE NOTICE 'cenario de apresentacao: data de referencia %', v_ref;
END $$;

-- ---------------------------------------------------------------------
-- Limpeza idempotente: so o que esta carga criou antes, na ordem das FKs.
-- As metas do ano de referencia saem inteiras (meta anual, mensais e distribuicao) e sao regravadas abaixo.
-- ---------------------------------------------------------------------
CREATE TEMP TABLE alvo_pedido ON COMMIT DROP AS
SELECT o.id, o.address_id, ap.papel FROM orders o JOIN apresentacao.pedido ap ON ap.order_id = o.id;

-- Estoque volta ao estado anterior antes de apagar os itens, pelo papel do pedido (o que a carga aplicou):
--   VENDA_PAGA  deu baixa em on_hand   -> devolve on_hand;
--   PENDENTE    reservou (fn_criar_pedido) -> libera reserved;
--   CANCELADO   reservou e liberou (fn_criar_pedido + fn_cancelar_pedido) -> saldo ja esta neutro.
-- Sem isto, duas execucoes deixariam on_hand e reserved diferentes mesmo com as contagens iguais.
UPDATE stock_balance b SET on_hand = b.on_hand + s.q, updated_at = now()
  FROM (SELECT oi.product_id, sum(oi.quantity) AS q
          FROM order_item oi JOIN alvo_pedido a ON a.id = oi.order_id
         WHERE a.papel = 'VENDA_PAGA' GROUP BY oi.product_id) s
 WHERE b.product_id = s.product_id;
UPDATE stock_balance b SET reserved = b.reserved - s.q, updated_at = now()
  FROM (SELECT oi.product_id, sum(oi.quantity) AS q
          FROM order_item oi JOIN alvo_pedido a ON a.id = oi.order_id
         WHERE a.papel = 'PENDENTE' GROUP BY oi.product_id) s
 WHERE b.product_id = s.product_id;

DELETE FROM stock_movement WHERE order_id IN (SELECT id FROM alvo_pedido);
DELETE FROM refund WHERE payment_id IN (SELECT id FROM payment WHERE order_id IN (SELECT id FROM alvo_pedido));
DELETE FROM payment WHERE order_id IN (SELECT id FROM alvo_pedido);
DELETE FROM order_item WHERE order_id IN (SELECT id FROM alvo_pedido);
DELETE FROM orders WHERE id IN (SELECT id FROM alvo_pedido);
DELETE FROM address WHERE id IN (SELECT address_id FROM alvo_pedido WHERE address_id IS NOT NULL);
DELETE FROM apresentacao.pedido;

-- Estornos que esta carga registrou sobre pagamentos da massa (nao sobre pedidos proprios) saem pelo motivo.
DELETE FROM refund WHERE reason LIKE '[apresentacao]%';

-- Metas do ano de referencia: a distribuicao sai antes da meta da loja (o gatilho da soma e DEFERRABLE,
-- entao a ordem dentro da transacao nao importa, mas a FK ON DELETE CASCADE ja levaria seller_goal).
DELETE FROM seller_goal WHERE monthly_goal_id IN (
    SELECT id FROM monthly_goal WHERE extract(year FROM period) = (SELECT extract(year FROM ref) FROM ref_cfg));
DELETE FROM monthly_goal WHERE extract(year FROM period) = (SELECT extract(year FROM ref) FROM ref_cfg);
DELETE FROM annual_goal WHERE year = (SELECT extract(year FROM ref)::smallint FROM ref_cfg);

-- ---------------------------------------------------------------------
-- 1. Vendas pagas do mes de referencia: dias fortes e fracos, vendedores, categorias e pagamentos variados.
--    Cada pedido nasce de uma chave estavel; hashtext(chave) decide dia, itens, quantidade e pagamento.
-- ---------------------------------------------------------------------
DO $$
DECLARE
    v_ref date; v_mes_ini date; v_dias int; v_dias_corridos int;
    v_dia date; v_i int; v_n int; v_chave text; v_order bigint; v_total numeric(12,2);
    v_seller bigint; v_sellers bigint[]; v_vend text[] := ARRAY['vendedor_allan','vendedor_francisco','gerente_gabriel'];
    v_cust bigint[]; v_prod bigint[]; v_pay text;
    v_forte boolean; v_hora time; v_moment timestamp; v_qtd int; v_itens int; v_j int; v_pid bigint;
    v_last4 char(4); v_parc int;
    -- Sorteio com saldo: indice sorteado, candidato da caminhada e saldo livre do candidato.
    v_idx int; v_cand bigint; v_livre int;
    -- Ultimo instante que pode ser gravado: a carga nunca escreve venda nem pagamento no futuro.
    v_agora timestamp; v_tem_dia_util boolean;
BEGIN
    SELECT ref INTO v_ref FROM ref_cfg;
    v_mes_ini := date_trunc('month', v_ref)::date;
    v_dias := extract(day FROM (v_mes_ini + interval '1 month - 1 day'))::int;
    v_dias_corridos := extract(day FROM v_ref)::int;
    v_agora := (now() AT TIME ZONE 'America/Fortaleza') - interval '1 minute';
    -- Domingo fecha a loja, mas se o recorte ja corrido do mes so tiver domingo (referencia no dia 1 que
    -- cai num domingo), a loja abre nesse dia: sem isto a carga terminaria sem venda nenhuma e abortaria.
    SELECT EXISTS (SELECT 1 FROM generate_series(1, v_dias_corridos) n
                    WHERE extract(dow FROM (v_mes_ini + (n - 1))) <> 0) INTO v_tem_dia_util;

    SELECT array_agg(u.id ORDER BY array_position(v_vend, u.db_role)) INTO v_sellers
      FROM app_users u WHERE u.db_role = ANY(v_vend) AND u.active;
    SELECT array_agg(id ORDER BY id) INTO v_cust FROM customer;
    IF v_cust IS NULL THEN RAISE EXCEPTION 'cenario de apresentacao: nenhum cliente cadastrado'; END IF;
    -- Catalogo vendavel com saldo livre, do mais barato ao mais caro: o cenario mistura acessorio e aparelho.
    SELECT array_agg(p.id ORDER BY p.price, p.id) INTO v_prod
      FROM product p JOIN stock_balance b ON b.product_id = p.id
     WHERE p.active AND p.sellable AND b.on_hand - b.reserved > 0;
    IF v_prod IS NULL THEN RAISE EXCEPTION 'cenario de apresentacao: nenhum produto com saldo livre'; END IF;

    FOR v_i IN 1 .. v_dias_corridos LOOP
        v_dia := v_mes_ini + (v_i - 1);
        -- Dia forte a cada tres dias uteis; domingo (0) fecha a loja. Padrao fixo: o grafico repete entre execucoes.
        IF extract(dow FROM v_dia) = 0 AND v_tem_dia_util THEN CONTINUE; END IF;
        v_forte := (v_i % 3) = 1;
        v_n := CASE WHEN v_forte THEN 3 ELSE 1 END;

        FOR v_j IN 1 .. v_n LOOP
            v_chave := 'venda:' || to_char(v_dia, 'YYYY-MM-DD') || ':' || v_j;
            v_seller := v_sellers[1 + (abs(hashtext(v_chave || ':v')) % array_length(v_sellers, 1))];
            v_hora := time '09:00' + ((abs(hashtext(v_chave || ':h')) % 480) * interval '1 minute');
            v_moment := least(v_dia + v_hora, v_ref + time '20:00', v_agora);
            v_pay := (ARRAY['PIX','CARD','BOLETO'])[1 + (abs(hashtext(v_chave || ':p')) % 3)];
            v_last4 := CASE WHEN v_pay = 'CARD' THEN lpad((abs(hashtext(v_chave || ':c')) % 10000)::text, 4, '0')::char(4) END;
            v_parc  := CASE WHEN v_pay = 'CARD' THEN 1 + (abs(hashtext(v_chave || ':n')) % 6) END;

            INSERT INTO orders(moment, status, customer_id, seller_id, fulfillment, client_request_id, request_hash)
            VALUES (v_moment, 'PAID',
                    v_cust[1 + (abs(hashtext(v_chave || ':cl')) % array_length(v_cust, 1))],
                    v_seller, 'PICKUP',
                    md5('sbi-apresentacao:' || v_chave)::uuid,
                    encode(sha256(convert_to('sbi-apresentacao:' || v_chave, 'UTF8')), 'hex'))
            RETURNING id INTO v_order;
            INSERT INTO apresentacao.pedido(order_id, papel, chave) VALUES (v_order, 'VENDA_PAGA', v_chave);

            -- Dia forte leva um aparelho (metade mais cara do catalogo) e um acessorio; dia fraco, so acessorio.
            v_itens := CASE WHEN v_forte THEN 2 ELSE 1 END;
            FOR v_j IN 1 .. v_itens LOOP
                IF v_forte AND v_j = 1 THEN
                    v_idx := 1 + (array_length(v_prod, 1) / 2)
                             + (abs(hashtext(v_chave || ':a')) % greatest(array_length(v_prod, 1) - array_length(v_prod, 1) / 2, 1));
                    v_qtd := 1;
                ELSE
                    v_idx := 1 + (abs(hashtext(v_chave || ':b' || v_j)) % greatest(array_length(v_prod, 1) / 2, 1));
                    v_qtd := 1 + (abs(hashtext(v_chave || ':q' || v_j)) % 2);
                END IF;
                -- O catalogo e montado uma vez, so exigindo uma unidade livre, e a baixa adiante nao tem
                -- guarda: um produto sorteado mais vezes do que o saldo (ha SKU com duas unidades) levaria
                -- on_hand a negativo e o CHECK do V5 abortaria a carga inteira. Medido: com ref=2026-01-20 o
                -- OL-AIRPODS-5 era vendido 7 vezes contra 6 em estoque. Entao a quantidade e limitada ao saldo
                -- livre do momento (descontando o que este mesmo pedido ja leva) e, se nao sobrou nenhuma
                -- unidade, a escolha caminha para o proximo produto do array. Deterministico: a mesma
                -- referencia, no mesmo estado inicial, da sempre o mesmo resultado.
                v_pid := NULL;
                FOR v_k IN 0 .. array_length(v_prod, 1) - 1 LOOP
                    v_cand := v_prod[1 + ((v_idx - 1 + v_k) % array_length(v_prod, 1))];
                    SELECT b.on_hand - b.reserved
                           - coalesce((SELECT sum(oi.quantity) FROM order_item oi
                                        WHERE oi.order_id = v_order AND oi.product_id = v_cand), 0)
                      INTO v_livre
                      FROM stock_balance b WHERE b.product_id = v_cand;
                    IF coalesce(v_livre, 0) > 0 THEN
                        v_pid := v_cand;
                        v_qtd := least(v_qtd, v_livre);
                        EXIT;
                    END IF;
                END LOOP;
                IF v_pid IS NULL THEN
                    RAISE EXCEPTION 'cenario de apresentacao: nenhum produto do catalogo tem saldo livre para o pedido %', v_order;
                END IF;
                INSERT INTO order_item(quantity, price, order_id, product_id, unit_cost)
                SELECT v_qtd, p.price, v_order, p.id, b.avg_cost
                  FROM product p JOIN stock_balance b ON b.product_id = p.id WHERE p.id = v_pid
                ON CONFLICT DO NOTHING;
            END LOOP;

            SELECT sum(price * quantity - discount) INTO v_total FROM order_item WHERE order_id = v_order;
            -- O pagamento confirma 12 min depois da venda, mas nunca depois de agora: o momento ja pode ter
            -- sido limitado a v_agora, e somar 12 min a ele colocaria o pagamento no futuro (e a view de
            -- faturamento data o lancamento pelo pagamento, nao pelo pedido).
            INSERT INTO payment(payment_type, amount, status, payment_date, order_id, due_date, installments, card_last4)
            VALUES (v_pay, v_total, 'APPROVED', least(v_moment + interval '12 minutes', v_agora), v_order,
                    CASE WHEN v_pay = 'BOLETO' THEN v_moment::date + 3 END, v_parc, v_last4);

            -- Baixa de estoque na confirmacao, em ordem crescente de product_id (mesma regra de fn_confirmar_pagamento).
            INSERT INTO stock_movement(product_id, order_id, kind, quantity, created_by, created_at)
            SELECT oi.product_id, v_order, 'SAIDA', oi.quantity, v_seller, (v_moment AT TIME ZONE 'America/Fortaleza')
              FROM order_item oi WHERE oi.order_id = v_order ORDER BY oi.product_id;
            UPDATE stock_balance b SET on_hand = b.on_hand - s.q, updated_at = now()
              FROM (SELECT product_id, sum(quantity) q FROM order_item WHERE order_id = v_order GROUP BY product_id) s
             WHERE b.product_id = s.product_id;
        END LOOP;
    END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 2. Operacao em andamento na data de referencia, pelas funcoes do sistema (reserva, baixa e cancelamento reais):
--    dois pedidos pendentes, um cancelado e um estorno parcial sobre venda paga do mes.
-- ---------------------------------------------------------------------
DO $$
DECLARE
    v_ref date; v_order bigint; v_cust bigint; v_pid bigint; v_pid2 bigint; v_pay_id bigint; v_amount numeric(12,2);
    v_allan bigint; v_francisco bigint; v_gerente bigint;
    -- Ultimo instante gravavel e o dia anterior util do recorte: a carga roda a qualquer hora do dia, entao
    -- um horario fixo como 10:15 seria futuro para quem roda de manha, e a conferencia abortaria a carga.
    v_agora timestamp; v_ontem date;
BEGIN
    SELECT ref INTO v_ref FROM ref_cfg;
    v_agora := (now() AT TIME ZONE 'America/Fortaleza') - interval '1 minute';
    -- O estorno e o cancelamento ficam no dia anterior, mas sem sair do mes de referencia: com a referencia
    -- no dia 1, o dia anterior cairia no mes passado e sumiria do recorte que a banca confere.
    v_ontem := greatest(v_ref - 1, date_trunc('month', v_ref)::date);
    SELECT id INTO v_allan     FROM app_users WHERE db_role = 'vendedor_allan';
    SELECT id INTO v_francisco FROM app_users WHERE db_role = 'vendedor_francisco';
    SELECT id INTO v_gerente   FROM app_users WHERE db_role = 'gerente_matheus';

    -- Produto com saldo livre, barato e caro, para a reserva nao estourar o estoque.
    SELECT p.id INTO v_pid FROM product p JOIN stock_balance b ON b.product_id = p.id
     WHERE p.active AND p.sellable AND b.on_hand - b.reserved >= 2 ORDER BY p.price, p.id LIMIT 1;
    SELECT p.id INTO v_pid2 FROM product p JOIN stock_balance b ON b.product_id = p.id
     WHERE p.active AND p.sellable AND b.on_hand - b.reserved >= 1 AND p.id <> v_pid
     ORDER BY p.price DESC, p.id LIMIT 1;
    IF v_pid IS NULL OR v_pid2 IS NULL THEN
        RAISE EXCEPTION 'cenario de apresentacao: sem produtos com saldo livre para a operacao em andamento';
    END IF;

    -- Pendente de Allan (PIX), criado pelo fluxo real: reserva estoque e deixa o pagamento PENDING.
    PERFORM set_config('app.user_id', v_allan::text, true);
    SELECT id INTO v_cust FROM customer ORDER BY id LIMIT 1;
    v_order := fn_criar_pedido(v_cust, jsonb_build_array(jsonb_build_object('product_id', v_pid, 'quantity', 1)), 'PIX');
    UPDATE orders SET moment = least(v_ref + time '10:15', v_agora) WHERE id = v_order;
    INSERT INTO apresentacao.pedido(order_id, papel, chave) VALUES (v_order, 'PENDENTE', 'pendente:allan');

    -- Pendente de Francisco (CARD) com aparelho: mostra reserva de item de valor alto.
    PERFORM set_config('app.user_id', v_francisco::text, true);
    SELECT id INTO v_cust FROM customer ORDER BY id OFFSET 1 LIMIT 1;
    v_order := fn_criar_pedido(v_cust, jsonb_build_array(jsonb_build_object('product_id', v_pid2, 'quantity', 1)), 'CARD');
    UPDATE orders SET moment = least(v_ref + time '11:40', v_agora) WHERE id = v_order;
    INSERT INTO apresentacao.pedido(order_id, papel, chave) VALUES (v_order, 'PENDENTE', 'pendente:francisco');

    -- Cancelado de Allan: criado e cancelado pelo fluxo real (a reserva volta e o pagamento fica DECLINED).
    PERFORM set_config('app.user_id', v_allan::text, true);
    SELECT id INTO v_cust FROM customer ORDER BY id OFFSET 2 LIMIT 1;
    v_order := fn_criar_pedido(v_cust, jsonb_build_array(jsonb_build_object('product_id', v_pid, 'quantity', 1)), 'BOLETO');
    PERFORM fn_cancelar_pedido(v_order);
    UPDATE orders SET moment = least(v_ontem + time '16:20', v_agora) WHERE id = v_order;
    INSERT INTO apresentacao.pedido(order_id, papel, chave) VALUES (v_order, 'CANCELADO', 'cancelado:allan');

    -- Estorno parcial de 30% sobre a maior venda paga do mes, registrado pelo gerente (fn_estornar exige GERENTE).
    PERFORM set_config('app.user_id', v_gerente::text, true);
    SELECT p.id, round(p.amount * 0.30, 2) INTO v_pay_id, v_amount
      FROM payment p JOIN orders o ON o.id = p.order_id
     WHERE p.status = 'APPROVED' AND o.moment >= date_trunc('month', v_ref) AND o.moment < v_ref + 1
       AND NOT EXISTS (SELECT 1 FROM refund r WHERE r.payment_id = p.id)
     ORDER BY p.amount DESC, p.id LIMIT 1;
    IF v_pay_id IS NOT NULL AND v_amount > 0 THEN
        PERFORM fn_estornar(v_pay_id, v_amount, '[apresentacao] devolucao parcial combinada na loja');
        UPDATE refund SET created_at = least(v_ontem + time '17:00', v_agora) AT TIME ZONE 'America/Fortaleza'
         WHERE payment_id = v_pay_id AND reason LIKE '[apresentacao]%';
    ELSE
        RAISE NOTICE 'cenario de apresentacao: sem venda paga no mes para estornar';
    END IF;

    PERFORM set_config('app.user_id', v_gerente::text, true);
END $$;

-- ---------------------------------------------------------------------
-- 3. Metas do ano de referencia.
--    Meta mensal = soma das metas dos vendedores (regra do gatilho trg_goal_sum_check), reconciliada em centavos:
--    o ultimo vendedor recebe a diferenca, para a soma fechar exatamente com o plano da loja.
--    Mes de referencia: Allan acima do ritmo (meta 15% abaixo do projetado) e Francisco abaixo (25% acima).
--    Meses fechados: o plano da LOJA acompanha o realizado da loja com fator alternado 0,95 / 1,05 (mes
--    batido e mes perdido), distribuido entre os vendedores na proporcao do que cada um fez. Acompanhar o
--    realizado em vez de usar um piso fixo e o que faz o painel mostrar atingimento perto de 100%: com piso
--    de 30 mil por vendedor, nove dos doze meses caiam no piso e o plano deixava de ter relacao com o dado.
--    Meses futuros do ano: repetem o plano do mes de referencia.
--    Equipes: Matheus responde por Allan e Gabriel por Francisco (V12_1); a meta da equipe e a meta do seu vendedor.
-- ---------------------------------------------------------------------
DO $$
DECLARE
    v_ref date; v_ano int; v_mes_ini date; v_dias int; v_corridos int;
    v_allan bigint; v_francisco bigint; v_ceo bigint;
    m record; v_goal bigint; v_plano numeric(12,2); v_a numeric(12,2); v_f numeric(12,2);
    v_real_a numeric; v_real_f numeric; v_real_loja numeric; v_fator numeric;
    -- Pisos usados so quando nao ha realizado nenhum em que se apoiar (mes sem venda).
    v_piso_vendedor numeric(12,2) := 20000.00; v_piso_loja numeric(12,2) := 50000.00;
    v_plano_ref numeric(12,2); v_anual numeric(12,2) := 0;
BEGIN
    SELECT ref INTO v_ref FROM ref_cfg;
    v_ano := extract(year FROM v_ref)::int;
    v_mes_ini := date_trunc('month', v_ref)::date;
    v_dias := extract(day FROM (v_mes_ini + interval '1 month - 1 day'))::int;
    v_corridos := greatest(extract(day FROM v_ref)::int, 1);
    SELECT id INTO v_allan     FROM app_users WHERE db_role = 'vendedor_allan';
    SELECT id INTO v_francisco FROM app_users WHERE db_role = 'vendedor_francisco';
    SELECT id INTO v_ceo       FROM app_users WHERE db_role = 'ceo_paulo';

    FOR m IN SELECT (date_trunc('year', v_ref) + (n || ' month')::interval)::date AS periodo FROM generate_series(0, 11) n LOOP
        -- Realizado no mes, pela mesma definicao do painel (v_lancamento_realizado: pagamento confirmado
        -- menos estorno), para a meta nascer colada no dado que a banca vai ver. v_real_loja inclui a venda
        -- do gerente, que soma na loja e nao tem meta individual (trg_seller_goal_is_seller).
        SELECT coalesce(sum(CASE WHEN l.seller_id = v_allan     THEN l.valor END), 0),
               coalesce(sum(CASE WHEN l.seller_id = v_francisco THEN l.valor END), 0),
               coalesce(sum(l.valor), 0)
          INTO v_real_a, v_real_f, v_real_loja
          FROM v_lancamento_realizado l
         WHERE l.data >= m.periodo AND l.data < (m.periodo + interval '1 month');

        IF m.periodo = v_mes_ini THEN
            -- Mes de referencia: a meta de CADA VENDEDOR sai da projecao do seu proprio ritmo ja corrido,
            -- 15% abaixo para um (fica acima do ritmo) e 25% acima para o outro (fica abaixo). E isto que
            -- da a banca um caso de cada lado, em qualquer data de referencia.
            v_a := CASE WHEN v_real_a > 0 THEN round(v_real_a * v_dias / v_corridos * 0.85, 2) ELSE v_piso_vendedor END;
            v_f := CASE WHEN v_real_f > 0 THEN round(v_real_f * v_dias / v_corridos * 1.25, 2) ELSE v_piso_vendedor END;
            v_plano := v_a + v_f;
            v_plano_ref := v_plano;
        ELSIF m.periodo < v_mes_ini THEN
            -- Mes fechado: o PLANO DA LOJA acompanha o realizado da loja, com fator alternado, para o
            -- painel mostrar mes batido e mes perdido em vez de um piso fixo que o dado nunca alcanca.
            -- A distribuicao vai proporcional ao que cada vendedor fez, e o segundo fecha a diferenca.
            v_fator := CASE WHEN extract(month FROM m.periodo)::int % 2 = 1 THEN 0.95 ELSE 1.05 END;
            -- O piso vale SO para mes sem venda nenhuma. Aplicado como minimo geral, ele passaria por cima
            -- do fator nos meses mais fracos e o plano voltaria a nao ter relacao com o realizado.
            v_plano := CASE WHEN v_real_loja > 0 THEN round(v_real_loja * v_fator, 2) ELSE v_piso_loja END;
            IF v_real_a + v_real_f > 0 THEN
                v_a := round(v_plano * v_real_a / (v_real_a + v_real_f), 2);
            ELSE
                v_a := round(v_plano / 2, 2);
            END IF;
            v_f := v_plano - v_a;
        ELSE
            -- Mes que ainda nao comecou: repete o plano do mes de referencia (plano a cumprir, nao projecao).
            v_plano := coalesce(v_plano_ref, v_piso_loja);
            v_a := round(v_plano / 2, 2);
            v_f := v_plano - v_a;
        END IF;
        INSERT INTO monthly_goal(period, amount, created_by) VALUES (m.periodo, v_plano, v_ceo)
        RETURNING id INTO v_goal;
        -- Reconciliacao em centavos: o segundo vendedor fecha a diferenca contra o plano da loja.
        INSERT INTO seller_goal(monthly_goal_id, seller_id, amount) VALUES (v_goal, v_allan, v_a);
        INSERT INTO seller_goal(monthly_goal_id, seller_id, amount) VALUES (v_goal, v_francisco, v_plano - v_a);
        v_anual := v_anual + v_plano;
    END LOOP;

    -- Meta anual: soma exata das doze metas mensais, assinada por um CEO (gatilho annual_goal_only_ceo).
    PERFORM set_config('app.user_id', v_ceo::text, true);
    INSERT INTO annual_goal(year, amount, updated_by) VALUES (v_ano::smallint, v_anual, v_ceo);
    PERFORM set_config('app.user_id', (SELECT id::text FROM app_users WHERE db_role = 'gerente_matheus'), true);
    RAISE NOTICE 'cenario de apresentacao: meta anual % = R$ %', v_ano, v_anual;
END $$;

-- ---------------------------------------------------------------------
-- 4. Conferencia: a transacao so confirma se o cenario estiver completo e coerente.
-- ---------------------------------------------------------------------
DO $$
DECLARE
    v_ref date; v_ano int; v_mes_ini date;
    v_pagos int; v_pend int; v_canc int; v_estorno int; v_metas int; v_dist int; v_anual numeric; v_soma numeric;
    v_futuro int; v_desc int; v_acima int; v_abaixo int; v_reserva int; v_prod_pendente int; v_pag_futuro int;
BEGIN
    SELECT ref INTO v_ref FROM ref_cfg;
    v_ano := extract(year FROM v_ref)::int;
    v_mes_ini := date_trunc('month', v_ref)::date;

    SELECT count(*) FILTER (WHERE papel = 'VENDA_PAGA'), count(*) FILTER (WHERE papel = 'PENDENTE'),
           count(*) FILTER (WHERE papel = 'CANCELADO')
      INTO v_pagos, v_pend, v_canc FROM apresentacao.pedido;
    SELECT count(*) INTO v_estorno FROM refund WHERE reason LIKE '[apresentacao]%';
    SELECT count(*) INTO v_metas FROM monthly_goal WHERE extract(year FROM period) = v_ano;
    SELECT count(*) INTO v_dist FROM seller_goal sg JOIN monthly_goal g ON g.id = sg.monthly_goal_id
     WHERE extract(year FROM g.period) = v_ano;
    SELECT amount INTO v_anual FROM annual_goal WHERE year = v_ano;
    SELECT sum(amount) INTO v_soma FROM monthly_goal WHERE extract(year FROM period) = v_ano;

    -- Nenhuma venda no futuro e nenhum plano sem distribuicao fechada.
    SELECT count(*) INTO v_futuro FROM orders o
     WHERE o.moment > (now() AT TIME ZONE 'America/Fortaleza');
    SELECT count(*) INTO v_pag_futuro FROM payment
     WHERE payment_date > (now() AT TIME ZONE 'America/Fortaleza');
    SELECT count(*) INTO v_desc FROM monthly_goal g
     WHERE extract(year FROM g.period) = v_ano
       AND g.amount <> (SELECT coalesce(sum(amount), 0) FROM seller_goal WHERE monthly_goal_id = g.id);

    -- O mes de referencia tem um vendedor acima e um abaixo do ritmo da meta.
    SELECT count(*) FILTER (WHERE d.realizado >= d.meta * extract(day FROM v_ref) / extract(day FROM (v_mes_ini + interval '1 month - 1 day'))),
           count(*) FILTER (WHERE d.realizado <  d.meta * extract(day FROM v_ref) / extract(day FROM (v_mes_ini + interval '1 month - 1 day')))
      INTO v_acima, v_abaixo FROM v_desempenho_vendedor d WHERE d.periodo = v_mes_ini;

    -- Pedido pendente mantem reserva de estoque. A conta e sobre OS PRODUTOS DOS PENDENTES DESTA CARGA:
    -- contar `reserved > 0` em toda a tabela nao falharia nunca, porque os pendentes do seed tambem reservam.
    SELECT count(*) INTO v_reserva
      FROM (SELECT oi.product_id, sum(oi.quantity) AS q
              FROM order_item oi JOIN apresentacao.pedido ap ON ap.order_id = oi.order_id
             WHERE ap.papel = 'PENDENTE' GROUP BY oi.product_id) p
      JOIN stock_balance b ON b.product_id = p.product_id
     WHERE b.reserved >= p.q;
    SELECT count(DISTINCT oi.product_id) INTO v_prod_pendente
      FROM order_item oi JOIN apresentacao.pedido ap ON ap.order_id = oi.order_id
     WHERE ap.papel = 'PENDENTE';

    RAISE NOTICE 'cenario de apresentacao: pagos=% pendentes=% cancelados=% estornos=% metas_mensais=% distribuicao=% anual=% soma_mensal=%',
                 v_pagos, v_pend, v_canc, v_estorno, v_metas, v_dist, v_anual, v_soma;
    RAISE NOTICE 'cenario de apresentacao: mes % com % vendedor(es) acima e % abaixo do ritmo; produtos com reserva=%',
                 to_char(v_mes_ini, 'YYYY-MM'), v_acima, v_abaixo, v_reserva;

    IF v_pagos = 0 THEN RAISE EXCEPTION 'cenario de apresentacao: nenhuma venda paga criada no mes de referencia'; END IF;
    IF v_pend <> 2 THEN RAISE EXCEPTION 'cenario de apresentacao: esperado 2 pedidos pendentes, encontrado %', v_pend; END IF;
    IF v_canc <> 1 THEN RAISE EXCEPTION 'cenario de apresentacao: esperado 1 pedido cancelado, encontrado %', v_canc; END IF;
    IF v_metas <> 12 THEN RAISE EXCEPTION 'cenario de apresentacao: esperadas 12 metas mensais, encontrado %', v_metas; END IF;
    IF v_dist <> 24 THEN RAISE EXCEPTION 'cenario de apresentacao: esperadas 24 metas por vendedor, encontrado %', v_dist; END IF;
    IF v_anual IS NULL OR v_anual <> v_soma THEN
        RAISE EXCEPTION 'cenario de apresentacao: meta anual (%) difere da soma das mensais (%)', v_anual, v_soma;
    END IF;
    IF v_futuro > 0 THEN RAISE EXCEPTION 'cenario de apresentacao: % pedido(s) com data no futuro', v_futuro; END IF;
    IF v_pag_futuro > 0 THEN
        RAISE EXCEPTION 'cenario de apresentacao: % pagamento(s) com data no futuro', v_pag_futuro;
    END IF;
    IF v_desc > 0 THEN RAISE EXCEPTION 'cenario de apresentacao: % mes(es) com distribuicao fora do plano da loja', v_desc; END IF;
    IF v_acima < 1 OR v_abaixo < 1 THEN
        RAISE EXCEPTION 'cenario de apresentacao: o mes de referencia precisa de um vendedor acima e um abaixo do ritmo (acima=%, abaixo=%)', v_acima, v_abaixo;
    END IF;
    IF v_prod_pendente = 0 OR v_reserva <> v_prod_pendente THEN
        RAISE EXCEPTION 'cenario de apresentacao: % de % produto(s) dos pedidos pendentes estao com a reserva viva',
                        v_reserva, v_prod_pendente;
    END IF;
END $$;

INSERT INTO apresentacao.carga(id, ref_date) SELECT 1, ref FROM ref_cfg
ON CONFLICT (id) DO UPDATE SET ref_date = excluded.ref_date, carregado_em = now();

COMMIT;
