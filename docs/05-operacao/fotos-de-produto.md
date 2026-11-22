# Fotos de produto

Como a loja mantém a foto de cada item do catálogo. Especificação de origem: seção 05 do plano comercial.

## O que mudou

Antes, a miniatura vinha de um mapa fixo no frontend
([`frontend/lib/product-photos.ts`](../../frontend/lib/product-photos.ts)), por SKU ou nome, com imagens de
licença livre. Esse mapa **continua valendo**: ele é o segundo degrau da queda. Agora existe, acima dele, a foto
que a própria loja envia pelo painel de gestão.

Ordem de preferência da miniatura, em [`components/product-thumb.tsx`](../../frontend/components/product-thumb.tsx):

1. foto da loja, quando o produto tem `photoVersion`;
2. foto de licença livre do mapa local, por SKU ou nome;
3. ícone da linha deduzido do nome.

A queda acontece no `onError` de cada etapa. Arquivo removido do armazenamento, rede cortada ou cache frio trocam
a imagem em vez de deixar a caixa vazia. Produto sem foto própria **não gera requisição nenhuma**: `photoVersion`
vem nulo na listagem e a tela já sabe que precisa usar o mapa local.

## Esquema

Migração [`V13__product_photo.sql`](../../src/main/resources/db/migration/V13__product_photo.sql), aditiva e
compatível com os registros existentes: tabela nova, nenhuma coluna alterada, nenhum produto obrigado a ter foto.

- `product_photo.product_id` é a chave primária, com `ON DELETE CASCADE`: uma foto por produto.
- `storage_key` e `thumb_key` são sorteadas (UUID), não derivadas do SKU — o nome do objeto não revela o catálogo.
- `version` sobe a cada troca e entra na URL da imagem, para o navegador buscar a nova em vez de servir a antiga.
- Gatilho `product_photo_only_manager`: terceira barreira, como nas demais tabelas de backoffice. A API já exige
  GERENTE na URL e no serviço; o banco recusa de qualquer forma.
- A trilha ganhou `PRODUCT_PHOTO_CHANGED` e `PRODUCT_PHOTO_REMOVED`.

## API

| Operação | Perfil | Observação |
| --- | --- | --- |
| `GET /products/{id}/photo` | VENDEDOR | Metadados (tipo, bytes, dimensões, versão) |
| `GET /products/{id}/photo/file` | VENDEDOR | Imagem original |
| `GET /products/{id}/photo/thumb` | VENDEDOR | Miniatura, até 320 px no lado maior |
| `PUT /products/{id}/photo` | GERENTE | Multipart, campo `file` |
| `DELETE /products/{id}/photo` | GERENTE | Remove a foto |

A leitura é liberada ao VENDEDOR porque a foto serve o balcão. A resposta da imagem é `Cache-Control: private`
com `ETag` da versão: o navegador reaproveita, nenhuma CDN compartilhada guarda conteúdo de loja.

O contrato está em
[`config/openapi/target-loja-gestao-openapi-2026-10-24-v6.json`](../../config/openapi/target-loja-gestao-openapi-2026-10-24-v6.json)
e os schemas Zod são regerados por `npm run api:generate`. O campo `photoVersion` entrou em `Product` — nulo
quando não há foto.

## Conferência do conteúdo

[`ProductPhotoImage`](../../src/main/java/com/swee/ordermanagementspring/api/backoffice/ProductPhotoImage.java)
não confia no tipo declarado pelo navegador. São três passos:

1. **bytes iniciais** do arquivo (JPEG `FF D8 FF`, PNG `89 50 4E 47 …`);
2. **decodificação de verdade** pelo ImageIO — cabeçalho correto com corpo truncado é recusado aqui;
3. **limites**: 64 a 4096 pixels de lado e, por padrão, 3 MB.

A miniatura é gerada no servidor, no mesmo formato da original, com fundo branco quando o PNG transparente vira
JPEG. Imagem menor que 320 px não é ampliada.

Só JPEG e PNG: são os formatos que o ImageIO do JDK lê e escreve sem dependência nova. WebP e AVIF ficam para
quando houver decisão sobre a biblioteca; a tela diz quais formatos aceita.

## Armazenamento e ordem das escritas

A interface
[`ProductPhotoStorage`](../../src/main/java/com/swee/ordermanagementspring/api/backoffice/ProductPhotoStorage.java)
existe para o adaptador de produção entrar sem mexer no serviço. O adaptador entregue grava em diretório próprio
(`SBI_PRODUCT_PHOTOS_DIR`), com escrita atômica: grava ao lado e move, para nenhuma leitura concorrente pegar
arquivo pela metade.

Na troca, a ordem é:

1. grava o objeto novo;
2. atualiza a linha, somando 1 em `version`;
3. **depois do commit**, remove o objeto antigo.

Assim a foto antiga continua respondendo até a troca terminar, e uma falha no meio deixa, no pior caso, um objeto
órfão — nunca um produto apontando para um objeto que não existe. Se a transação não confirma, os objetos recém
gravados são removidos. Objeto ausente na leitura responde 404, e a tela mostra a queda em vez de falhar.

## O que falta para produção

| Item | Responsável | Evidência necessária |
| --- | --- | --- |
| Bucket S3 ou compatível, privado, com versionamento e ciclo de vida | Infraestrutura | Bucket provisionado e credencial no cofre |
| Adaptador de objeto em nuvem (`ProductPhotoStorage`) | Engenharia | Implementação e teste de integração com o bucket |
| Backup e restauração das mídias junto com o banco | Infraestrutura | Restauração testada com os vínculos do catálogo conferidos |
| Limpeza de objetos órfãos | Engenharia | Rotina com relatório do que removeu |
| Direito de uso das imagens | Loja | Registrado no aceite da implantação |

Até lá, o diretório configurado precisa estar em volume persistente e entrar no backup do ambiente. Um diretório
temporário (o padrão) serve só para desenvolvimento: some ao reiniciar a máquina.

## Testes

- [`ProductPhotoImageTest`](../../src/test/java/com/swee/ordermanagementspring/api/backoffice/ProductPhotoImageTest.java)
  (CT-FOTO-101 a 107): tipo pelos bytes, JPEG e PNG válidos, arquivo que não é imagem, cabeçalho com corpo
  truncado, limites de bytes e de pixels, miniatura sem ampliação.
- [`access-matrix.csv`](../../src/test/resources/security/access-matrix.csv): leitura liberada ao VENDEDOR, envio
  e remoção só do GERENTE, anônimo em 401.
- [CT-FOTO-110](../../frontend/tests/product-images.test.ts): a URL da miniatura é de mesma origem e versionada.
