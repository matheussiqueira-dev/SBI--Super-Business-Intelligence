-- Revisao inedita por publicacao de foto (plano comercial, secao 05).
--
-- Na V13 a revisao era um contador por produto: comecava em 1 e somava 1 na troca. Depois de remover e enviar
-- outra foto, a revisao voltava a 1 -- e a URL (?v=1) e o validador ("v1") de duas fotos diferentes do mesmo
-- produto ficavam iguais. Com Cache-Control de 30 dias, o navegador podia continuar servindo a foto antiga.
--
-- Agora a revisao vem de uma sequencia: nenhum numero se repete na instalacao, nem depois de uma remocao. A
-- revisao deixa de ser "quantas vezes esta foto mudou" e passa a ser um identificador da publicacao.
--
-- Aditiva: nenhuma tabela criada, nenhuma coluna removida, e as linhas que existem ficam como estao.

CREATE SEQUENCE product_photo_version_seq AS integer;

-- Base que ja tem fotos: a sequencia comeca acima da maior revisao gravada, para a proxima publicacao nao
-- reaproveitar um numero que ja esteve numa URL. Base nova: o COALESCE deixa o primeiro nextval em 1.
SELECT setval('product_photo_version_seq', (SELECT COALESCE(MAX(version), 0) FROM product_photo) + 1, false);

ALTER TABLE product_photo ALTER COLUMN version SET DEFAULT nextval('product_photo_version_seq');
ALTER SEQUENCE product_photo_version_seq OWNED BY product_photo.version;

COMMENT ON COLUMN product_photo.version IS
    'Revisao da publicacao da foto, inedita na instalacao; entra na URL e no validador de cache da imagem.';
