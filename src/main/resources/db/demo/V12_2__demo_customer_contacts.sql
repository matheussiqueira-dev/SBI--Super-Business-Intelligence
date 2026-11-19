-- Perfil demo: completa a carteira de pessoas fisicas do seed (D-EVO-56).
--
-- A V6_2 cadastrou os seis clientes da simulacao do Guia Visual com nome, e-mail e CPF, sem telefone e sem
-- endereco. A carteira da apresentacao precisa de nome, e-mail, telefone, CPF e endereco completo
-- (logradouro, numero, bairro, cidade, UF e CEP) em TODA pessoa fisica, porque a banca abre o cadastro do
-- cliente e o pedido com entrega. A V6_2 ja foi aplicada e tem checksum; por isso o acerto vem aqui, numa
-- migracao incremental, e nao editando a migracao antiga.
--
-- Dados sinteticos de demonstracao: e-mail em .test (reservado pela RFC 2606, nunca entregavel), telefone
-- com DDD 85 na faixa 9xxxx-xxxx, logradouro generico, bairro e CEP coerentes com Fortaleza (CE) e numero
-- ficticio. Nenhum dado pessoal real. Os CPFs continuam os da V6_2, com digito verificador valido.

-- Autoria pelo mecanismo do sistema: address nao tem created_by, mas customer.updated_at acompanha a troca.
SELECT set_config('app.user_id', (SELECT id::text FROM app_users WHERE db_role = 'gerente_matheus'), true);

-- Um endereco por cliente (customer.address_id e UNIQUE): cria e vincula numa passada, so para quem nao tem.
WITH destino(email, logradouro, numero, bairro, cidade, uf, cep, telefone) AS (
    VALUES
      ('marina@cliente.test',  'Avenida Central',        '1200', 'Aldeota',       'Fortaleza', 'CE', '60150160', '85991120034'),
      ('pedro@cliente.test',   'Rua das Acacias',         '305', 'Meireles',      'Fortaleza', 'CE', '60165070', '85991120128'),
      ('juliana@cliente.test', 'Rua do Comercio',          '88', 'Centro',        'Fortaleza', 'CE', '60060170', '85991120212'),
      ('lucas@cliente.test',   'Avenida das Palmeiras',  '2410', 'Dionisio Torres', 'Fortaleza', 'CE', '60130240', '85991120306'),
      ('beatriz@cliente.test', 'Rua dos Girassois',       '417', 'Varjota',       'Fortaleza', 'CE', '60160250', '85991120490'),
      ('rodrigo@cliente.test', 'Rua Sao Francisco',       '950', 'Benfica',       'Fortaleza', 'CE', '60020181', '85991120584')
), novo_endereco AS (
    INSERT INTO address(street, number, neighborhood, city, state, zip_code)
    SELECT d.logradouro, d.numero, d.bairro, d.cidade, d.uf, d.cep
      FROM destino d JOIN customer c ON c.email = d.email
     WHERE c.address_id IS NULL
     ORDER BY c.id
    RETURNING id, zip_code, number
)
UPDATE customer c
   SET address_id = e.id,
       phone = d.telefone,
       updated_at = now()
  FROM destino d
  JOIN novo_endereco e ON e.zip_code = d.cep AND e.number = d.numero
 WHERE c.email = d.email AND c.address_id IS NULL;

-- Telefone tambem para quem (por qualquer motivo) ja tinha endereco e seguia sem contato.
UPDATE customer c SET phone = d.telefone, updated_at = now()
  FROM (VALUES
      ('marina@cliente.test',  '85991120034'),
      ('pedro@cliente.test',   '85991120128'),
      ('juliana@cliente.test', '85991120212'),
      ('lucas@cliente.test',   '85991120306'),
      ('beatriz@cliente.test', '85991120490'),
      ('rodrigo@cliente.test', '85991120584')) AS d(email, telefone)
 WHERE c.email = d.email AND (c.phone IS NULL OR btrim(c.phone) = '');

-- A migracao so passa se a carteira do seed ficar completa: sem isto o acerto poderia falhar em silencio.
DO $$
DECLARE v_falta int;
BEGIN
    SELECT count(*) INTO v_falta
      FROM customer c LEFT JOIN address a ON a.id = c.address_id
     WHERE c.email IN ('marina@cliente.test', 'pedro@cliente.test', 'juliana@cliente.test',
                       'lucas@cliente.test', 'beatriz@cliente.test', 'rodrigo@cliente.test')
       AND (c.phone IS NULL OR length(regexp_replace(c.phone, '[^0-9]', '', 'g')) < 10
            OR a.id IS NULL OR a.street IS NULL OR a.number IS NULL OR a.neighborhood IS NULL
            OR a.city IS NULL OR a.state IS NULL OR a.zip_code IS NULL);
    IF v_falta > 0 THEN
        RAISE EXCEPTION 'V12_2: % cliente(s) do seed seguem sem telefone ou endereco completo', v_falta;
    END IF;
END $$;
