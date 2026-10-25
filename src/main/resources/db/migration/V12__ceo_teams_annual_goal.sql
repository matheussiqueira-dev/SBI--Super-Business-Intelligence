-- Visao do CEO (docs/decisoes/evolucao.md, D-EVO-42 a D-EVO-47): papel CEO acima do GERENTE, equipe de venda
-- (vendedor -> gerente), meta anual da loja e as views de fato do painel executivo.
-- Hierarquia: CEO > GERENTE > VENDEDOR. Quem tem nivel igual ou acima de um papel faz o que o papel faz.
-- Funcoes e gatilhos usam ${flyway:defaultSchema} no search_path, como na V5.

-- ---------------------------------------------------------------------
-- Papel CEO e conferencia por nivel
-- ---------------------------------------------------------------------
INSERT INTO role(code, name, rank) VALUES ('CEO', 'CEO', 30);

-- Usuario com papel de nivel igual ou acima de p_role (CEO 30 > GERENTE 20 > VENDEDOR 10).
CREATE OR REPLACE FUNCTION app_role_at_least(p_user bigint, p_role varchar) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ${flyway:defaultSchema}, pg_temp AS $$
    SELECT EXISTS (
        SELECT 1 FROM app_users u JOIN role r ON r.code = u.role
         WHERE u.id = p_user AND r.rank >= (SELECT rank FROM role WHERE code = p_role));
$$;

-- V5: promocao exigia o papel GERENTE exato; o CEO, acima dele, tambem libera.
CREATE OR REPLACE FUNCTION trg_promotion_only_manager() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ${flyway:defaultSchema}, pg_temp AS $$
BEGIN
    IF NOT app_role_at_least(NEW.created_by, 'GERENTE') THEN
        RAISE EXCEPTION 'somente gerente libera promocao' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END $$;

-- V5: estorno pela funcao transacional passa a aceitar GERENTE ou CEO; o resto da funcao nao muda.
CREATE OR REPLACE FUNCTION fn_estornar(p_payment_id bigint, p_amount numeric, p_reason varchar)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = ${flyway:defaultSchema}, pg_temp AS $$
DECLARE v_pay payment%ROWTYPE; v_refunded numeric; v_id bigint;
BEGIN
    IF app_current_user_id() IS NULL OR NOT app_role_at_least(app_current_user_id(), 'GERENTE') THEN
        RAISE EXCEPTION 'somente gerente registra estorno' USING ERRCODE = '42501';
    END IF;
    SELECT * INTO v_pay FROM payment WHERE id = p_payment_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'pagamento inexistente' USING ERRCODE = 'P0002'; END IF;
    IF v_pay.status <> 'APPROVED' THEN RAISE EXCEPTION 'pagamento nao confirmado' USING ERRCODE = 'LJ409'; END IF;
    SELECT coalesce(sum(amount), 0) INTO v_refunded FROM refund WHERE payment_id = p_payment_id;
    IF p_amount IS NULL OR p_amount <= 0 OR p_amount > v_pay.amount - v_refunded THEN
        RAISE EXCEPTION 'valor de estorno invalido' USING ERRCODE = '22023';
    END IF;
    INSERT INTO refund(payment_id, amount, reason) VALUES (p_payment_id, p_amount, p_reason) RETURNING id INTO v_id;
    RETURN v_id;
END $$;
-- Ficam como estao: keep_one_active_manager (V8) segue exigindo um GERENTE ativo, porque o gerente opera a loja e o
-- CEO nao conta como gerente; seller_goal_is_seller (V5) segue aceitando so VENDEDOR na meta individual.

-- ---------------------------------------------------------------------
-- Equipe de venda: cada VENDEDOR pode ter um GERENTE responsavel (meta por gerente = soma da equipe)
-- ---------------------------------------------------------------------
ALTER TABLE app_users
    ADD COLUMN manager_id bigint REFERENCES app_users(id) ON DELETE SET NULL,
    ADD CONSTRAINT ck_app_users_manager_not_self CHECK (manager_id <> id);
CREATE INDEX ix_app_users_manager ON app_users(manager_id);

-- So VENDEDOR pertence a uma equipe, e o responsavel e um GERENTE ativo. O vendedor promovido sai da equipe.
CREATE OR REPLACE FUNCTION trg_app_users_team() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ${flyway:defaultSchema}, pg_temp AS $$
BEGIN
    IF NEW.manager_id IS NULL THEN RETURN NEW; END IF;
    IF NEW.role <> 'VENDEDOR' THEN
        IF TG_OP = 'UPDATE' AND OLD.role = 'VENDEDOR' THEN
            NEW.manager_id := NULL;
            RETURN NEW;
        END IF;
        RAISE EXCEPTION 'TEAM_MEMBER: somente VENDEDOR pertence a uma equipe' USING ERRCODE = '23514';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM app_users WHERE id = NEW.manager_id AND role = 'GERENTE' AND active) THEN
        RAISE EXCEPTION 'TEAM_MANAGER: o responsavel pela equipe precisa ser um GERENTE ativo' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER app_users_team BEFORE INSERT OR UPDATE OF manager_id, role ON app_users
    FOR EACH ROW EXECUTE FUNCTION trg_app_users_team();

-- Gerente rebaixado ou desativado libera a equipe (os vendedores ficam "sem equipe" ate nova atribuicao).
CREATE OR REPLACE FUNCTION trg_app_users_release_team() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ${flyway:defaultSchema}, pg_temp AS $$
BEGIN
    IF OLD.role = 'GERENTE' AND (NEW.role <> 'GERENTE' OR NOT NEW.active) THEN
        UPDATE app_users SET manager_id = NULL WHERE manager_id = NEW.id;
    END IF;
    RETURN NULL;
END $$;
CREATE TRIGGER app_users_release_team AFTER UPDATE OF role, active ON app_users
    FOR EACH ROW EXECUTE FUNCTION trg_app_users_release_team();

-- ---------------------------------------------------------------------
-- Meta anual da loja, definida so pelo CEO
-- ---------------------------------------------------------------------
CREATE TABLE annual_goal (
    year       smallint      PRIMARY KEY CHECK (year BETWEEN 2000 AND 2100),
    amount     numeric(12,2) NOT NULL CHECK (amount >= 0),
    updated_by bigint        NOT NULL DEFAULT app_current_user_id() REFERENCES app_users(id),
    updated_at timestamptz   NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION trg_annual_goal_only_ceo() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ${flyway:defaultSchema}, pg_temp AS $$
BEGIN
    IF NOT app_role_at_least(NEW.updated_by, 'CEO') THEN
        RAISE EXCEPTION 'somente CEO define a meta anual' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER annual_goal_only_ceo BEFORE INSERT OR UPDATE ON annual_goal
    FOR EACH ROW EXECUTE FUNCTION trg_annual_goal_only_ceo();

-- ---------------------------------------------------------------------
-- Fatos do painel executivo (decisao A7: a tela le views). Mesmas regras do V6: so pagamento APPROVED, dia do
-- pagamento (America/Fortaleza), receita = preco x quantidade - desconto, custo nulo quando o item nao tem custo.
-- O estorno fica em fato proprio, no dia do estorno, porque e do pedido e nao de um produto.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_fato_venda_item AS
SELECT p.payment_date::date                   AS data,
       o.id                                   AS order_id,
       o.seller_id,
       o.customer_id,
       p.payment_type                         AS forma_pagamento,
       oi.product_id,
       pr.category_id,
       oi.quantity                            AS unidades,
       oi.price * oi.quantity - oi.discount   AS receita_liquida,
       oi.discount                            AS desconto,
       oi.unit_cost * oi.quantity             AS custo
  FROM order_item oi
  JOIN orders o   ON o.id = oi.order_id
  JOIN payment p  ON p.order_id = o.id AND p.status = 'APPROVED'
  JOIN product pr ON pr.id = oi.product_id;

CREATE OR REPLACE VIEW v_fato_estorno AS
SELECT (r.created_at AT TIME ZONE 'America/Fortaleza')::date AS data,
       o.id           AS order_id,
       o.seller_id,
       p.payment_type AS forma_pagamento,
       r.amount       AS valor
  FROM refund r
  JOIN payment p ON p.id = r.payment_id
  JOIN orders o  ON o.id = p.order_id;

-- Auditoria da troca de equipe (mesma trilha das demais operacoes de usuario).
ALTER TABLE audit_event DROP CONSTRAINT ck_audit_event_action;
ALTER TABLE audit_event ADD CONSTRAINT ck_audit_event_action CHECK (action IN (
    'LOGIN_SUCCEEDED','LOGIN_FAILED','ACCOUNT_LOCKED','LOGOUT','CUSTOMER_CREATED','CUSTOMER_UPDATED',
    'CUSTOMER_DELETED','STOCK_ADJUSTED','PRODUCT_STATUS_CHANGED','ORDER_CANCELED',
    'USER_CREATED','USER_UPDATED','USER_ROLE_CHANGED','USER_STATUS_CHANGED','ACCOUNT_UNLOCKED',
    'PASSWORD_RESET','PASSWORD_CHANGED','DISCOUNT_APPROVED','DISCOUNT_POLICY_CHANGED','USER_TEAM_CHANGED',
    'ANNUAL_GOAL_SAVED'));
