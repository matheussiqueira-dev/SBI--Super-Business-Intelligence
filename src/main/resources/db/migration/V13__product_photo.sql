-- Foto do produto enviada pela loja (plano comercial, secao 05).
--
-- Hoje a miniatura vem de um mapa fixo no frontend (frontend/lib/product-images.ts), por SKU ou nome. Esta
-- migracao cria o vinculo que falta para a loja manter as proprias fotos: o arquivo vai para armazenamento de
-- objetos privado e aqui fica so a chave, presa ao ID do produto.
--
-- Compativel com o que ja existe: tabela nova, nenhuma coluna alterada e nenhum produto obrigado a ter foto.
-- Produto sem linha aqui continua caindo no mapa local e, na falta dele, no icone da linha.
--
-- Uma foto por produto (product_id e a chave primaria). Trocar a foto atualiza a linha e soma 1 em version --
-- a versao entra na URL da imagem, entao o navegador e a CDN buscam a nova em vez de servir a antiga do cache.

CREATE TABLE product_photo (
    product_id   bigint       PRIMARY KEY REFERENCES product(id) ON DELETE CASCADE,
    -- Chave sorteada, nao derivada do SKU: o nome do objeto no armazenamento nao revela o catalogo da loja.
    storage_key  varchar(200) NOT NULL UNIQUE,
    thumb_key    varchar(200) NOT NULL UNIQUE,
    content_type varchar(40)  NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png')),
    byte_size    integer      NOT NULL CHECK (byte_size > 0),
    width        integer      NOT NULL CHECK (width > 0),
    height       integer      NOT NULL CHECK (height > 0),
    version      integer      NOT NULL DEFAULT 1 CHECK (version > 0),
    uploaded_by  bigint       NOT NULL DEFAULT app_current_user_id() REFERENCES app_users(id),
    uploaded_at  timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE product_photo IS 'Foto do produto mantida pela loja; o arquivo fica em armazenamento de objetos e aqui fica a chave.';
COMMENT ON COLUMN product_photo.version IS 'Sobe a cada troca; entra na URL da imagem para invalidar cache.';

-- Terceira barreira, como nas demais tabelas de backoffice (V5 e V12): a API ja exige GERENTE na URL e no
-- servico, e o banco recusa de qualquer forma quem nao tem o papel.
CREATE OR REPLACE FUNCTION trg_product_photo_only_manager() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ${flyway:defaultSchema}, pg_temp AS $$
BEGIN
    IF NOT app_role_at_least(NEW.uploaded_by, 'GERENTE') THEN
        RAISE EXCEPTION 'somente GERENTE envia foto de produto' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER product_photo_only_manager BEFORE INSERT OR UPDATE ON product_photo
    FOR EACH ROW EXECUTE FUNCTION trg_product_photo_only_manager();

-- ---------------------------------------------------------------------
-- Trilha de auditoria das duas operacoes novas (mesma forma da V11 e da V12).
-- ---------------------------------------------------------------------
ALTER TABLE audit_event DROP CONSTRAINT ck_audit_event_action;
ALTER TABLE audit_event ADD CONSTRAINT ck_audit_event_action CHECK (action IN (
    'LOGIN_SUCCEEDED','LOGIN_FAILED','ACCOUNT_LOCKED','LOGOUT','CUSTOMER_CREATED','CUSTOMER_UPDATED',
    'CUSTOMER_DELETED','STOCK_ADJUSTED','PRODUCT_STATUS_CHANGED','ORDER_CANCELED',
    'USER_CREATED','USER_UPDATED','USER_ROLE_CHANGED','USER_STATUS_CHANGED','ACCOUNT_UNLOCKED',
    'PASSWORD_RESET','PASSWORD_CHANGED','DISCOUNT_APPROVED','DISCOUNT_POLICY_CHANGED','USER_TEAM_CHANGED',
    'ANNUAL_GOAL_SAVED','PRODUCT_PHOTO_CHANGED','PRODUCT_PHOTO_REMOVED'));
