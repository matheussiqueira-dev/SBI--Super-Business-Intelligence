# Auditoria de imagem por SKU do catálogo Apple

Levantamento de 19/11/2026, feito cruzando `docs/03-banco-de-dados/pacote-sql/olist/produtos.csv`
(nome de catálogo, SKU por SKU) com `scripts/product-thumbnails.json` (arquivo, autor, licença e
página de origem de cada foto). Substitui a nota vaga de "várias fotos são de geração ou cor
diferentes" da seção 6 do [guia de preparação](preparar-apresentacao.md) pela lista fechada.

## Cobertura

| | Quantidade |
| --- | --- |
| SKUs no catálogo | **42** |
| SKUs com foto própria | **36**, em **32** arquivos `.webp` (5 arquivos servem dois SKUs cada) |
| SKUs com ícone de família (`linhas/acessorio.svg`) | **6** |
| Arquivos em `frontend/public/produtos` | 33 |
| Entradas do manifesto com autor, licença e origem | 32 de 32 |

Os seis sem foto: `OL-AIRTAG-1`, `OL-AIRTAG-4`, `OL-CAPA-SIL-IP18P`, `OL-FOLIO-IPAD11`,
`OL-FONTE-35W`, `OL-PEL-IP17`.

## Divergências: 18 dos 36 SKUs fotografados

### Geração diferente da nomeada no SKU (10)

| SKU | Nome do catálogo | Modelo na foto |
| --- | --- | --- |
| `OL-AIRPODS-5` | AirPods 5 | AirPods **4** |
| `OL-AIRPODS-5-SF` | AirPods 5 com estojo de recarga sem fio | AirPods **4** (mesmo arquivo) |
| `OL-AIRPODS-MAX2` | AirPods Max **2** | AirPods Max (1ª) |
| `OL-AW-S12-42` | Apple Watch Series **12** 42 mm | Apple Watch **S10** |
| `OL-AW-S12-46-CEL` | Apple Watch Series **12** 46 mm GPS + Cellular | Apple Watch **S10** (mesmo arquivo) |
| `OL-AW-SE3-40` | Apple Watch SE **3** 40 mm | Apple Watch SE **2** 40 mm |
| `OL-AW-ULTRA4` | Apple Watch Ultra **4** | Apple Watch Ultra **3** |
| `OL-IPAD-AIR-11` | iPad Air 11 pol. **M4** | iPad Air 11-inch **M3** |
| `OL-MAC-MINI-M6` | Mac mini **M6** | Mac mini **2024** (M4) |
| `OL-MBA15-M5` | MacBook Air 15 pol. **M5** | MacBook Air 15-inch **M4** |

### Cor diferente da nomeada no SKU (2)

| SKU | Nome do catálogo | Cor na foto |
| --- | --- | --- |
| `OL-IP16-128` | iPhone 16 128 GB **Preto** | **Ultramarine** |
| `OL-IP17-256` | iPhone 17 256 GB **Azul** | **Lavender** |

### Produto ou variante diferente (6)

| SKU | Nome do catálogo | O que a foto mostra |
| --- | --- | --- |
| `OL-IP18PM-256` | iPhone 18 Pro **Max** | iPhone 18 **Pro** (mesmo arquivo do `OL-IP18P-256`) |
| `OL-PENCIL-PRO` | Apple Pencil **Pro** | Apple Pencil **2ª geração** |
| `OL-PENCIL-USBC` | Apple Pencil **(USB-C)** | Apple Pencil **2ª geração** (mesmo arquivo) |
| `OL-ADP-USBC-P2` | Adaptador **USB-C** para P2 | adaptador **Lightning** para P2 — conector errado |
| `OL-CAPA-TRP-IP17` | Capa transparente para iPhone **17** | capa em um iPhone **16 Pro Max** |
| `OL-PUL-LOOP-42` | **Pulseira** loop esportiva 42 mm | um **Apple Watch SE 2**, não a pulseira (arquivo do `OL-AW-SE3-40`) |

Os 18 restantes conferem com o modelo nomeado: `OL-AIRPODS-PRO3`, `OL-APPLETV-4K`,
`OL-CABO-LTN-1M`, `OL-CABO-USBC-1M`, `OL-HOMEPOD-MINI`, `OL-IMAC24-M4`, `OL-IP17E-256`,
`OL-IP18P-256`, `OL-IPAD-11-128`, `OL-IPAD-MINI-128`, `OL-IPAD-PRO-11`, `OL-IPAIR-256`,
`OL-MAGSAFE-1M`, `OL-MBA13-M5`, `OL-MBP14-M5`, `OL-MOUSE-USBC`, `OL-PUL-ESP-46`, `OL-TECLADO-TID`.

## Por que a correção não é só "procurar a foto certa"

As divergências se separam em dois grupos, e só um deles tem correção por substituição de arquivo.

**Estruturalmente sem foto possível (12 SKUs).** O catálogo nomeia gerações que não existiam quando as
fotos foram buscadas — AirPods 5, AirPods Max 2, Apple Watch Series 12, SE 3, Ultra 4, iPad Air M4,
Mac mini M6, MacBook Air 15 M5, iPhone 18 Pro Max. Foto de licença livre de um aparelho que não
existe não é difícil de achar: ela **não pode** existir. Para esses, a escolha é de produto, não de
busca:

1. **ícone de família**, como nos outros seis acessórios — diz a verdade ("não temos foto deste
   modelo") e é o que a miniatura já faz quando um arquivo falha; ou
2. **manter a foto da geração vizinha** e dizer no crédito **qual modelo aparece na imagem**, em vez
   de deixar a legenda implicar que é o do SKU.

A segunda opção preserva a aparência da demonstração e deixa de ser enganosa, mas exige um campo novo
no manifesto (algo como `modeloNaFoto`) e a exibição dele em `/creditos` e `/demo/creditos`.

**Corrigível por substituição (6 SKUs).** Aqui o produto exato existe e a foto está simplesmente
errada: `OL-ADP-USBC-P2` (conector trocado), `OL-PENCIL-PRO` e `OL-PENCIL-USBC` (dois produtos
distintos servidos pela foto de um terceiro), `OL-CAPA-TRP-IP17` (capa no aparelho errado),
`OL-PUL-LOOP-42` (mostra um relógio em vez da pulseira) e `OL-IP16-128` (cor errada de um modelo que
existe). Esses pedem busca, verificação de licença e crédito de imagens novas — trabalho de
sourcing, um arquivo por vez, que **não** foi feito aqui: assertar autoria e licença sem conferir a
página de origem seria pior que a divergência que se quer corrigir.

`OL-IP17-256` fica entre os dois grupos: depende de existir foto livre do iPhone 17 na cor azul.

## Lista final por SKU (20/11/2026)

Critério: **exata** = a fonte nomeia o mesmo produto e geração que o SKU, sem contradição;
**ilustrativa** = a fonte nomeia produto, geração ou cor diferente, e o manifesto declara o que a foto
mostra (`modelDepicted`, visível na coluna "Modelo na foto" de `/creditos` e `/demo/creditos`);
**indisponível** = não há foto de licença livre e o SKU cai no ícone da linha.

| SKU | Situação | Licença | Arquivo | Modelo na foto |
| --- | --- | --- | --- | --- |
| `OL-ADP-USBC-P2` | ilustrativa | CC BY-SA 4.0 | `adaptador-usbc-p2.webp` | adaptador Lightning para P2 |
| `OL-AIRPODS-5` | ilustrativa | CC0 | `airpods.webp` | AirPods 4 |
| `OL-AIRPODS-5-SF` | ilustrativa | CC0 | `airpods.webp` | AirPods 4 |
| `OL-AIRPODS-MAX2` | **exata** | CC BY-SA 4.0 | `airpods-max-2.webp` | — |
| `OL-AIRPODS-PRO3` | **exata** | CC BY-SA 4.0 | `airpods-pro.webp` | — |
| `OL-AIRTAG-1` | **exata** | CC BY 2.0 | `airtag.webp` | — |
| `OL-AIRTAG-4` | **exata** | CC BY 2.0 | `airtag.webp` | — |
| `OL-APPLETV-4K` | **exata** | CC0 | `apple-tv.webp` | — |
| `OL-AW-S12-42` | ilustrativa | CC BY-SA 4.0 | `apple-watch-series-12.webp` | Apple Watch Series 12; a fonte nao informa o |
| `OL-AW-S12-46-CEL` | ilustrativa | CC BY-SA 4.0 | `apple-watch-series-12.webp` | Apple Watch Series 12; a fonte nao informa o |
| `OL-AW-SE3-40` | ilustrativa | CC0 | `apple-watch-se.webp` | Apple Watch SE 2 de 40 mm |
| `OL-AW-ULTRA4` | ilustrativa | CC BY-SA 4.0 | `apple-watch-ultra.webp` | Apple Watch Ultra 3 |
| `OL-CABO-LTN-1M` | **exata** | CC BY 2.0 | `cabo-lightning.webp` | — |
| `OL-CABO-USBC-1M` | **exata** | CC BY 2.0 | `cabo-usbc.webp` | — |
| `OL-CAPA-SIL-IP18P` | ilustrativa | CC BY-SA 4.0 | `capa-silicone-ip17.webp` | capa de silicone do iPhone 17, na cor preta |
| `OL-CAPA-TRP-IP17` | ilustrativa | CC BY-SA 4.0 | `capa-transparente.webp` | capa transparente em um iPhone 16 Pro Max |
| `OL-FOLIO-IPAD11` | indisponível | — | ícone da linha | — |
| `OL-FONTE-35W` | indisponível | — | ícone da linha | — |
| `OL-HOMEPOD-MINI` | **exata** | CC0 | `homepod-mini.webp` | — |
| `OL-IMAC24-M4` | **exata** | CC0 | `imac.webp` | — |
| `OL-IP16-128` | ilustrativa | CC BY 4.0 | `iphone-16.webp` | iPhone 16 na cor Ultramarine |
| `OL-IP17-256` | ilustrativa | CC0 | `iphone-17.webp` | iPhone 17 na cor Lavender |
| `OL-IP17E-256` | **exata** | CC BY-SA 4.0 | `iphone-17e.webp` | — |
| `OL-IP18P-256` | **exata** | CC BY-SA 4.0 | `iphone-18-pro.webp` | — |
| `OL-IP18PM-256` | **exata** | CC BY-SA 4.0 | `iphone-18-pro-max.webp` | — |
| `OL-IPAD-11-128` | **exata** | CC BY-SA 4.0 | `ipad.webp` | — |
| `OL-IPAD-AIR-11` | **exata** | CC0 | `ipad-air-m4.webp` | — |
| `OL-IPAD-MINI-128` | **exata** | CC0 | `ipad-mini.webp` | — |
| `OL-IPAD-PRO-11` | **exata** | CC0 | `ipad-pro.webp` | — |
| `OL-IPAIR-256` | **exata** | CC0 | `iphone-air.webp` | — |
| `OL-MAC-MINI-M6` | ilustrativa | CC BY 4.0 | `mac-mini.webp` | Mac mini (M4, 2024) |
| `OL-MAGSAFE-1M` | **exata** | CC BY-SA 4.0 | `magsafe.webp` | — |
| `OL-MBA13-M5` | **exata** | CC BY-SA 4.0 | `macbook-air-13.webp` | — |
| `OL-MBA15-M5` | ilustrativa | CC0 | `macbook-air-15.webp` | MacBook Air de 15 pol. (M4) |
| `OL-MBP14-M5` | **exata** | CC0 | `macbook-pro.webp` | — |
| `OL-MOUSE-USBC` | **exata** | Domínio públic | `magic-mouse.webp` | — |
| `OL-PEL-IP17` | indisponível | — | ícone da linha | — |
| `OL-PENCIL-PRO` | **exata** | CC0 | `apple-pencil-pro.webp` | — |
| `OL-PENCIL-USBC` | ilustrativa | CC BY-SA 4.0 | `apple-pencil.webp` | Apple Pencil de 2a geracao |
| `OL-PUL-ESP-46` | **exata** | CC BY-SA 2.0 | `pulseira-esportiva.webp` | — |
| `OL-PUL-LOOP-42` | ilustrativa | CC0 | `apple-watch-se.webp` | Apple Watch SE 2 de 40 mm |
| `OL-TECLADO-TID` | **exata** | CC BY-SA 4.0 | `magic-keyboard.webp` | — |

### Cobertura

| | 8c2a7db | agora | |
| --- | --- | --- | --- |
| Foto exata | 20 | **24** | +4 |
| Imagem ilustrativa | 19 | **15** | −4 |
| Foto indisponível | 3 | **3** | = |
| Total de SKUs | 42 | **42** | preços somam 204.144,00, intactos |

Quatro fotos novas entraram nesta rodada, cada licença conferida na API do Commons e a **descrição**
lida antes de aceitar o arquivo — nome de arquivo não basta:

| Arquivo do Commons | Licença | Autor | Vai para | A descrição diz |
| --- | --- | --- | --- | --- |
| `AppleWatchSeries12.jpg` | CC BY-SA 4.0 | Piperpet | `OL-AW-S12-42`, `OL-AW-S12-46-CEL` | "A Light Gold aluminum Apple Watch **Series 12**" |
| `IPad Air 8th 2026.jpg` | CC0 | Wncallmethat | `OL-IPAD-AIR-11` | "**iPad Air M4** on a mirror" |
| `IPhone 18 Pro Max rear.jpg` | CC BY-SA 4.0 | 茅野ふたば | `OL-IP18PM-256` | "iPhone **18 Pro Max** rear" |
| `AirPods Max 2 Midnight model.jpg` | CC BY-SA 4.0 | Kyu3a | `OL-AIRPODS-MAX2` | "**AirPods Max 2** のミッドナイトモデル" |

As duas do Apple Watch Series 12 **seguem como ilustrativas**, e não por desleixo: a fonte dá a geração
certa mas **não informa o tamanho da caixa**, e os dois SKUs se distinguem justamente por isso (42 mm e
46 mm + Cellular). Saíram de uma foto de **Series 10**, que era geração errada, para a geração certa com
o tamanho declarado como não informado — ganho real, ainda que não chegue a "exata".

O `iphone-18-pro.webp` deixou de ter modelo declarado porque passou a servir **só** o `OL-IP18P-256`,
que ele retrata exatamente; antes ele cobria também o Pro Max. Três arquivos ficaram sem SKU e saíram
do manifesto e do disco: `apple-watch-series.webp`, `ipad-air.webp` e `airpods-max.webp`.

### Os três sem foto, e por que continuam assim

`OL-FOLIO-IPAD11`, `OL-FONTE-35W` e `OL-PEL-IP17`. Buscas feitas nesta rodada, todas sem resultado
utilizável: `Apple Smart Folio iPad 11` (só o **Smart Keyboard** Folio), `Apple 35W power adapter`,
`Belkin screen protector`. Ficam no ícone da linha, que é a resposta honesta.

### Onde a busca se esgotou

Para estes a geração nomeada no SKU não existe no Commons com licença livre, e nenhuma consulta desta
rodada mudou isso: `AirPods 5`, `Apple Watch SE 3`, `Apple Watch Ultra 4` (há Ultra 1 a 3),
`Mac mini M6`, `MacBook Air M5 15`, `Apple Pencil USB-C`, `iPhone 16` preto avulso (há o 16 **Plus** e
o 16 **Pro** em preto), `iPhone 17` azul (há o 17 **Pro Max** em cores), capa transparente de iPhone 17,
adaptador USB-C para P2 e pulseira loop esportiva. Todas ficam **ilustrativas com o modelo declarado**.

## O que isto muda para a banca

Nada no banco. Nenhuma referência de foto é persistida no PostgreSQL (decisão D-PUB-13): a miniatura é
do frontend, resolvida pelo SKU que a API devolve. A avaliação é de banco, SQL e CRUD, e a foto do
catálogo é ilustrativa. A auditoria existe para a divergência estar **escrita e fechada**, não
descoberta por uma pergunta.
