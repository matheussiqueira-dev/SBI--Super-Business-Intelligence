# Preparar a apresentação de Banco de Dados

Como montar, carregar e conferir o ambiente que a banca vai consultar. O que mostrar está em [roteiro da apresentação de Banco de Dados](../05-operacao/roteiro-banco-de-dados.md).

A avaliação de dados usa **PostgreSQL e SQL reais**, no ambiente autenticado. A `/demo` sem sessão serve só para mostrar a interface e tem catálogo estático próprio.

---

## 1. O que compõe o ambiente

Três camadas, nesta ordem de dependência:

| Camada | O que é | Quem monta |
| --- | --- | --- |
| Esquema | 20 tabelas do modelo (mais `flyway_schema_history`), 20 views, 17 funções e 11 gatilhos | Flyway, perfil `demo` (`V1` a `V12_2`) |
| Massa | catálogo Apple de 42 SKUs, 60 clientes e 219 pedidos pagos do último ano | `07_carga_olist.sql` |
| Cenário | metas do ano, operação em andamento, dias fortes e fracos | `10_carga_apresentacao.sql` |

O Flyway é a única fonte do esquema (decisão A2): o Hibernate apenas valida. O perfil `demo` tem de estar ativo **desde a primeira migração** do banco; num banco que já passou do `V6` pelo perfil padrão, crie outro banco.

---

## 2. Montar, do zero

Siga [executar o SBI sem Docker](../05-operacao/execucao-local.md) até a API responder HTTP 200 em `http://127.0.0.1:8080/auth/csrf`. Depois, da raiz do repositório:

```bash
cd docs/03-banco-de-dados/pacote-sql
```

```bash
psql -X -h 127.0.0.1 -p 5432 -U postgres -d sbi_demo -W -v ON_ERROR_STOP=1 -f 07_carga_olist.sql
```

```bash
psql -X -h 127.0.0.1 -p 5432 -U postgres -d sbi_demo -W -v ON_ERROR_STOP=1 -f 10_carga_apresentacao.sql
```

A carga Olist imprime `clientes=60 produtos=42 categorias=7 pedidos=219 itens=237 soma=449690.00`. O cenário imprime a data de referência, a meta anual e a linha `pagos=… pendentes=2 cancelados=1 estornos=1 metas_mensais=12 distribuicao=24`.

> `07_carga_olist.sql` **reconstrói** a massa: ela apaga os SKUs `OL-*`, os clientes do recorte e os pedidos associados antes de inserir. Rode-a só num banco de apresentação dedicado. `10_carga_apresentacao.sql` é aditiva: ela preserva a massa e apaga apenas o que ela mesma criou antes.

### Data de referência

Sem `-v ref`, a referência é **hoje** no fuso da loja (`America/Fortaleza`). Para fixar um dia e os números não mudarem de um ensaio para o outro — a referência tem de ser hoje ou um dia já passado:

```bash
psql -X -U postgres -d sbi_demo -v ON_ERROR_STOP=1 -v ref=2026-11-18 -f 10_carga_apresentacao.sql
```

A carga recusa referência no futuro: o painel compararia com dias sem dado. Como as datas da massa Olist são relativas ao dia da carga (`dias_atras`), o histórico nunca envelhece — o mês corrente sempre tem movimento.

---

## 3. Conferir tudo de uma vez

O runner faz a carga duas vezes com a mesma referência, compara a fotografia do banco, roda os testes do cenário e exige a prova de banco completa:

```bash
CONTAINER=sbi-demo-db-1 DB=sbi_demo SUPERUSER=sbi bash docs/03-banco-de-dados/pacote-sql/run_apresentacao.sh
```

Os três valores são os do `docker-compose.demo.yml` subido como `-p sbi-demo`: lá o dono do `sbi_demo` é `sbi` (`POSTGRES_USER`), não `postgres`. Troque-os pelos do seu ambiente — num PostgreSQL nativo, omita `CONTAINER` e informe o dono do seu banco.

Esperado: **17 PASS, 0 FAIL, 0 ERROS**. Rode-o **depois** de `run_bd.sh` (61 PASS) e `run_olist_bd.sh` (7 PASS sem a API, 11 com), para nenhum número daqueles mudar.

> **A ordem não é opcional, e `run_bd.sh` é o primeiro.** Os testes `06*` afirmam os números do seed do Guia Visual (Allan 68.400/120.000, loja 186.400/240.000, evolução semanal 38.200/41.600/36.800/42.300/27.500). Num banco que já recebeu a carga Olist e o cenário, `run_bd.sh` devolve **43 PASS, 12 FAIL e 12 ERROS** — BD-01 a BD-06, BD-22, RB-09, RB-11, RB-12, RG-02 e BD-31a, mais o `monthly_goal_period_key` duplicado e os erros em cascata da transação abortada. Não é regressão: é o teste conferindo um estado que a carga mudou de propósito. A sequência é sempre **banco novo → `run_bd.sh` → `run_olist_bd.sh` → `run_apresentacao.sh`**; para repetir só uma etapa depois das cargas, use um banco descartável próprio.

Medido em 18/11/2026: a bateria inteira (**61 + 11 + 17 = 89 PASS, 0 FAIL, 0 ERROS**) rodou duas vezes, em dois bancos independentes — um banco descartável criado vazio e migrado do zero, e o banco da apresentação recriado em seguida. Os dois terminaram com a **mesma fotografia** (`315|376|315|1|12|24|986051.48|749507.30|609|6`) e com o mesmo estado canônico para `ref=2026-11-18`. O cenário da banca é reproduzível do zero, sem depender do histórico daquele contêiner.

| Caso | O que prova |
| --- | --- |
| CT-APR-00 | a carga registrou a data de referência |
| CT-APR-01 | o cenário está completo e identificável (vendas pagas, 2 pendentes, 1 cancelado, 1 estorno) |
| CT-APR-02 | 12 metas mensais, 24 metas por vendedor, meta anual = soma das mensais |
| CT-APR-03 | carga repetida não duplica pedido, meta nem distribuição |
| CT-APR-04 | a distribuição fecha com o plano da loja **em centavos**, em todos os meses |
| CT-APR-05 | a meta de cada equipe é a soma dos seus vendedores |
| CT-APR-06 | a meta anual foi assinada por um CEO |
| CT-APR-07 | nenhum pedido nem pagamento com data no futuro |
| CT-APR-08 | o mês de referência tem um vendedor acima e um abaixo do ritmo |
| CT-APR-09 | reserva viva só nos pendentes; saldo e reserva nunca negativos |
| CT-APR-10 | grão de item e grão de pedido dão o mesmo total; a view difere só pelos estornos |
| CT-APR-11 | toda pessoa física tem nome, e-mail, telefone, CPF e endereço completo |
| CT-APR-12 | pessoa jurídica com CNPJ e sem CPF; nenhum documento repetido |
| CT-APR-13 | 42 SKUs `OL-*` com preço positivo e custo médio informado |
| CT-APR-14 | a carteira tem cliente de compra única e cliente recorrente |
| CT-APR-15 | duas execuções com a mesma referência deixam a **mesma** fotografia do banco |
| CT-APR-16 | a prova de banco `11_prova_banco.sql` roda inteira, sem erro inesperado |

A fotografia comparada em CT-APR-15 são dez números: pedidos, itens, pagamentos, estornos, metas mensais, metas por vendedor, meta anual, faturamento confirmado, saldo e reserva de estoque. Comparar só contagens não bastaria: a primeira versão da carga deixava as contagens iguais e o **saldo** diferente, porque a limpeza não devolvia o estoque.

### O que "reproduzível" quer dizer aqui

A meta do mês de referência **nasce do realizado já corrido** (é a projeção do ritmo, 15% abaixo para um vendedor e 25% acima para o outro). Isso é o que garante um caso acima e um abaixo do ritmo em qualquer data de referência, mas tem uma consequência a conhecer:

- **Mesma referência, nada mais mudou** → mesmas contagens, metas e totais. É isto que CT-APR-15 prova.
- **Mesma referência, depois de registrar vendas novas** (a venda de teste do roteiro, por exemplo) → a carga recalcula a meta a partir do realizado novo, então o plano do mês **muda**. Não é falha de idempotência: é a meta acompanhando o dado.

Na prática, para a apresentação: carregue o cenário **uma vez**, confira, e só então faça a venda de teste. Se recarregar depois, os números do plano serão outros — e o roteiro, que cita valores, precisa ser relido.

Estado canônico (Flyway → `07` → `10` com `ref=2026-11-18`, sem venda extra), que todos os números deste documento usam como base:

| Indicador | Valor |
| --- | --- |
| Faturamento confirmado de 01/11 a 18/11 | R$ 146.726,30 |
| Pedidos pagos no período | 38 |
| Plano da loja de novembro | R$ 198.576,84 |
| Meta anual de 2026 | R$ 986.051,48 |

---

## 4. O que o cenário grava

### Metas

- **Meta anual** do ano de referência, igual à soma exata das doze mensais, assinada por um CEO (`ceo_paulo`). O gatilho `annual_goal_only_ceo` recusa qualquer outro papel.
- **Doze metas mensais** do ano, uma por mês.
- **Distribuição por vendedor**: os dois VENDEDOR (Allan Barros e Francisco Ferreira). O segundo recebe a diferença, para a soma fechar com o plano da loja ao centavo — dois gatilhos de constraint, `seller_goal_sum` e `monthly_goal_sum`, recusam qualquer desencontro pela mesma função `trg_goal_sum_check`, com a verificação adiada para o `COMMIT`.
- **Equipes**: Allan responde a Matheus Siqueira e Francisco a Gabriel Sousa (`V12_1`, pelo `db_role`). A meta da equipe é a meta do seu vendedor.

Como a meta individual é só de VENDEDOR (regra da `V5`, gatilho `seller_goal_is_seller`), a venda do **gerente** Gabriel soma no realizado da loja e não tem meta própria. Por isso o realizado da loja é maior que a soma dos dois vendedores. Isso está escrito na aba Metas da planilha e no roteiro.

### Ritmo do mês de referência

A meta do mês nasce da projeção do realizado já corrido: 15% **abaixo** da projeção para um vendedor (que fica acima do ritmo) e 25% **acima** para o outro (que fica abaixo). O resultado é determinístico e explicável, e dá à banca um caso de cada lado.

Meses já fechados recebem meta de 0,95 ou 1,05 do realizado, alternando pelo mês — assim há mês batido e mês perdido. Meses que ainda não começaram repetem o plano do mês de referência.

### Operação em andamento

Pelas funções reais do banco, não por `UPDATE` de saldo:

| Papel | Como é criado | Efeito no estoque |
| --- | --- | --- |
| 2 pedidos pendentes | `fn_criar_pedido` | reservam saldo, pagamento `PENDING` |
| 1 pedido cancelado | `fn_criar_pedido` + `fn_cancelar_pedido` | reserva devolvida, pagamento `DECLINED` |
| 1 estorno parcial (30%) | `fn_estornar`, como gerente | reduz o faturamento confirmado |
| vendas pagas do mês | `INSERT` + baixa na ordem de `product_id` | mesma regra de `fn_confirmar_pagamento` |

Dias fortes (um a cada três dias úteis) levam um aparelho e um acessório; dias fracos, só acessório. Domingo não tem venda. Datas, vendedor, itens, quantidade e forma de pagamento saem de `hashtext()` da chave do registro — nunca de `random()`, para a carga ser reproduzível.

### Como o cenário fica identificável

O schema `apresentacao` guarda a carga (`apresentacao.carga`: a data de referência) e os pedidos que ela criou (`apresentacao.pedido`: `order_id`, papel e chave). É o mesmo recurso que a `07` usa com `stg_olist`: schema próprio criado pelo script, sem mudar o esquema da aplicação. Para separar o cenário dos dados já cadastrados:

```sql
SELECT ap.papel, count(*) FROM apresentacao.pedido ap GROUP BY ap.papel ORDER BY 1;
SELECT o.* FROM orders o JOIN apresentacao.pedido ap ON ap.order_id = o.id;   -- só o cenário
SELECT o.* FROM orders o LEFT JOIN apresentacao.pedido ap ON ap.order_id = o.id WHERE ap.order_id IS NULL;  -- só a massa
```

A limpeza da próxima execução usa esse registro e desfaz também o efeito no estoque, pelo papel de cada pedido: venda paga devolve `on_hand`, pendente libera `reserved`, cancelado já está neutro.

---

## 5. Carteira de clientes

| Grupo | Quantidade | Documento | Origem |
| --- | --- | --- | --- |
| Pessoa física da massa Olist | 52 | CPF | `olist/clientes.csv`, telefone e endereço gerados no SQL |
| Pessoa jurídica da massa Olist | 8 | CNPJ (alfanumérico, `V10`) | `olist/clientes.csv` |
| Pessoa física do seed do Guia Visual | 6 | CPF | `V6_2`, completada pela `V12_2` |

Toda pessoa física tem **nome, e-mail, telefone, CPF e endereço completo** (logradouro, número, bairro, cidade, UF e CEP) — CT-APR-11 falha se faltar qualquer campo. Os 58 CPFs e os 8 CNPJs conferem no dígito verificador.

Dados sintéticos: e-mails em `example.com` e `.test` (domínios reservados, RFC 2606), telefones fictícios com DDD 85, endereços fictícios coerentes. Nenhum dado pessoal real, nenhum envio externo. CPF e contatos completos ficam fora das exportações analíticas: a aba Vendas traz o **nome** do cliente, não o documento.

A carteira tem cliente de compra única e cliente recorrente (CT-APR-14); o maior histórico é de 14 pedidos pagos (`CLI-001`, Larissa Esteves), usado no roteiro `08_crud_clientes_olist.sql`.

---

## 6. Catálogo e fotos

42 SKUs Apple de `olist/produtos.csv`, com preço de mercado pesquisado em 15/10/2026, custo médio e peso. Preços e nomes na base conferem com o CSV, SKU por SKU.

Cobertura de imagem medida no checkout (contando foto e ícone **separadamente**):

| | Quantidade | Observação |
| --- | --- | --- |
| SKUs com foto própria | **36** | em 32 arquivos `.webp`; 5 arquivos servem dois SKUs cada |
| SKUs com ícone de família | **6** | `OL-PEL-IP17`, `OL-AIRTAG-1`, `OL-CAPA-SIL-IP18P`, `OL-FONTE-35W`, `OL-FOLIO-IPAD11`, `OL-AIRTAG-4` |

Os seis são acessórios sem imagem de licença livre disponível e caem no ícone `linhas/acessorio.svg`. Todas as 32 entradas do manifesto têm autor, licença e página de origem registrados (`scripts/product-thumbnails.json` e `frontend/lib/product-photos.ts`); os créditos aparecem em `/creditos` e em `/demo/creditos`. Licenças em uso: CC BY-SA 4.0 (13), CC0 (12), CC BY 2.0 (3), CC BY 4.0 (2), CC BY-SA 2.0 (1) e domínio público (1).

Os arquivos são servidos localmente, de `frontend/public/produtos`: a apresentação não depende de internet para as imagens. Se uma foto não carregar, a miniatura cai no ícone da linha em vez de deixar a caixa vazia.

Nenhuma referência de foto é persistida no PostgreSQL (decisão D-PUB-13: a miniatura é do frontend, pelo SKU que a API já devolve). Um produto criado pela tela de CRUD mostra o ícone da família, não uma foto — e a cobertura acima não é reproduzível por SQL, só pelo manifesto do frontend.

**Pendência registrada, agora com a lista fechada:** **18 dos 36** SKUs fotografados mostram geração, cor ou produto diferentes do nomeado no SKU. A [auditoria de imagem por SKU](auditoria-fotos-catalogo.md) tem a tabela completa e separa os dois casos: **12** nomeiam gerações que não existem (AirPods 5, Apple Watch Series 12, Mac mini M6, iPhone 18 Pro Max e outras), para as quais foto de licença livre do modelo exato **não pode** existir — a escolha ali é entre o ícone de família e declarar no crédito qual modelo aparece; e **6** têm o produto exato disponível e só precisam de imagem nova, com busca e verificação de licença uma a uma. Nenhuma troca de arquivo foi feita. A banca de Banco de Dados avalia banco, SQL e CRUD; a foto do catálogo é ilustrativa.

---

## 7. Exportação

`GET /analytics/export` gera o recorte em `.xlsx` (Excel principal), `.xls` (BIFF8 real) e CSV. Fica sob `/analytics/**`, portanto GERENTE e, pela hierarquia, CEO; vendedor recebe 403 e anônimo 401. O arquivo é montado no servidor, a partir das mesmas views dos indicadores, numa transação REPEATABLE READ.

Sobre o escopo, para não haver mal-entendido: quem pode exportar é decidido pelo papel da sessão, no servidor, e a tela não consegue ampliar isso — mas **o recorte do gerente é a loja inteira**, igual ao que a própria tela de Análises já mostra a ele (`/analytics/sales` e `/management/summary` não filtram por equipe; a equipe é uma dimensão de leitura, decisão D-EVO-44, não uma barreira de acesso). Para o arquivo de uma equipe, use o filtro de vendedor. O vendedor não exporta: ele não tem a área Análises.

Na tela: **Gestão → Análises**, cartão **Exportar**. O período inicial e final já vêm iguais ao mês mostrado, há atalhos (mês atual, mês anterior, últimos 30 e 90 dias, ano atual) e os filtros de vendedor, categoria e forma de pagamento.

| Aba | Conteúdo | Grão |
| --- | --- | --- |
| Resumo | recorte, período, fuso, filtros, autor e os totais | — |
| Vendas | detalhe das vendas e uma linha por estorno (receita negativa) | item de pedido |
| Metas | plano da loja e distribuição por vendedor, com realizado e atingimento | mês × vendedor |

A aba só entra quando tem dado para o recorte. Somar a coluna *Receita líquida* da aba Vendas dá exatamente o **Faturamento confirmado** do Resumo.

> Atenção ao somar no Excel: a aba Vendas do `.xlsx` e do `.xls` termina com uma linha `Total do recorte | Faturamento confirmado`. Selecionar a coluna inteira soma o dobro; o certo é somar as linhas de detalhe ou simplesmente ler a linha de total. O CSV não traz essa linha, então a soma dele fecha direto.

Limitações conhecidas, tratadas: o `.xls` tem 65.536 linhas por aba, então acima de 65.000 linhas de detalhe a resposta é 400 apontando o `.xlsx`; a janela do pedido é limitada a 732 dias; com filtro de categoria os estornos ficam fora, porque estorno não pertence a uma categoria (a tela avisa).

Limitação **não** tratada, registrada: o recorte é montado inteiro em memória antes de virar arquivo, e o único limite é a janela de 732 dias. Na massa de demonstração isso são algumas centenas de linhas e não pesa; com volume de loja real, uma janela longa pediria geração em fluxo (no POI, `SXSSFWorkbook` para o `.xlsx`) ou agregação no servidor. Fora do escopo desta apresentação.

Proteção contra fórmula: no formato Excel uma célula de texto nunca é avaliada como fórmula, qualquer que seja o prefixo. No CSV, que é texto puro, valor começando com `=`, `+`, `-`, `@`, TAB ou CR recebe um apóstrofo de guarda. Verificado com um nome de produto `=1+1 iPhone "injetado"; DDE`: no `.xlsx` a célula fica com tipo texto (`s`, não `f`), no `.xls` com tipo 1 (texto) e no CSV com a guarda e as aspas escapadas.

A guarda vale **só para texto vindo do banco**. Valor que o servidor mesmo gerou — data, número, rótulo — sai sem apóstrofo: com a guarda em cima de um total negativo (`-3.241,70`), o Excel leria texto e a coluna deixaria de somar. É o caso de um recorte em que o estorno supera as vendas.

### Quando a planilha não compara com a meta

A meta é sempre do **mês inteiro** e, fora o filtro de vendedor, da **loja inteira**. Comparar com ela um realizado que cobre parte do mês, ou que um filtro reduziu, daria um atingimento falso: o numerador encolhe e o denominador não. Nesses casos o Resumo não escreve percentual — escreve o motivo e aponta a aba Metas. Só com período de **meses inteiros** — do dia 1 ao último dia do mês, mesmo que o mês ainda esteja em curso — e sem filtro é que o Resumo escreve as duas linhas do plano: "Plano da loja nos meses do periodo" e "Atingimento do plano" no Excel, "Plano da loja no periodo" e "Atingimento do plano (%)" no CSV. A aba Metas diz, no próprio cabeçalho, que não segue o recorte parcial nem os filtros de categoria e pagamento.

### Verificações feitas na exportação

| Caso | Resultado |
| --- | --- |
| Anônimo | 401 |
| Vendedor | 403 (não tem a área Análises) |
| Gerente e CEO | 200 nos três formatos |
| `.xlsx` | assinatura `50 4b 03 04` (zip), abre no openpyxl, 3 abas |
| `.xls` | assinatura `d0 cf 11 e0 a1 b1 1a e1` (OLE2/CFB), abre no xlrd, 3 abas, célula de data com tipo 3 e dinheiro com tipo 2 |
| CSV | BOM UTF-8, separador `;`, vírgula decimal |
| Filtro de vendedor | 16 linhas, R$ 53.326,30 (igual ao realizado de Allan no painel) |
| Filtro de pagamento | 17 linhas, R$ 51.084,00 (igual ao PIX do painel) |
| Filtros combinados | 2 linhas, R$ 9.849,00 |
| Intervalo vazio | 200, zero linhas de detalhe, só a aba Resumo |
| Período invertido | 400, "O periodo final nao pode ser anterior ao inicial." |
| Janela acima de 732 dias | 400, com o limite na mensagem |
| Fórmula em campo livre | neutralizada nos três formatos |
| Total negativo no CSV | sai como número, sem apóstrofo |

---

## 8. Reconciliação entre PostgreSQL, painel e planilha

Conferida em 18/11/2026, para o recorte 01/11 a 18/11/2026 e para a equipe de Matheus Siqueira (vendedor Allan Barros). Os treze indicadores batem nos três lugares:

| Indicador | PostgreSQL | Painel | Planilha |
| --- | --- | --- | --- |
| Faturamento confirmado | 146.726,30 | 146.726,30 | 146.726,30 |
| Receita das vendas (já sem desconto) | 151.586,00 | — | 151.586,00 |
| Estornos | 4.859,70 | — | 4.859,70 |
| Pedidos pagos | 38 | — | 38 |
| Soma das linhas da aba Vendas | 146.726,30 | — | 146.726,30 |
| Pedidos distintos na aba Vendas | 38 | — | 38 |
| Plano da loja de 2026-11 | 198.576,84 | 198.576,84 | 198.576,84 |
| Soma das semanas do painel | 146.726,30 | 146.726,30 | — |
| Soma das formas de pagamento | 146.726,30 | 146.726,30 | — |
| Equipe de Matheus — realizado | 53.326,30 | 53.326,30 | 53.326,30 |
| Equipe de Matheus — na aba Vendas | 53.326,30 | — | 53.326,30 |
| Equipe de Matheus — meta | 75.545,59 | 75.545,59 | 75.545,59 |
| Equipe de Matheus — realizado na aba Metas | 53.326,30 | 53.326,30 | 53.326,30 |

São os números do estado canônico, isto é, logo depois de seguir a montagem e **antes** da venda de teste do roteiro. Depois dela, tudo sobe pelo valor da venda — a seção 9 mostra o antes e o depois.

Os números batem porque há **uma** definição de faturamento confirmado — pagamento aprovado menos estorno, cada perna na sua data: a venda pela data do pagamento, o estorno pela data em que foi registrado — e ela vive no banco, nas views, não no código de tela. O painel lê `v_lancamento_realizado`. A planilha monta o detalhe a partir de `v_fato_venda_item` e `v_fato_estorno`, que aplicam a mesma regra, e soma essas linhas no servidor; na aba Metas ela lê `v_desempenho_vendedor` para o realizado de cada vendedor e `v_lancamento_realizado` para o realizado da loja (`ExportService`). Nenhum dos dois reescreve a regra por conta própria; é por isso que os totais coincidem.

---

## 9. Venda de teste no fluxo autenticado

Medido nesta preparação, como fecho do roteiro:

| Momento | Realizado do mês | Allan (realizado/meta) | Atingimento |
| --- | --- | --- | --- |
| Antes | 146.726,30 | 53.326,30 / 75.545,59 | 70,6% |
| Depois da venda de R$ 503,00 | 147.229,30 | 53.829,30 / 75.545,59 | 71,3% |
| Depois de reiniciar a API | 147.229,30 | 53.829,30 / 75.545,59 | 71,3% |

O pedido ficou `PAID` com pagamento `APPROVED` e gerou dois movimentos de estoque, `RESERVA 1` e `SAIDA 1` — a reserva na criação e a baixa na confirmação, como manda a regra da `V5`.

---

## 10. O que foi verificado nas telas alteradas

Duas telas mudaram: **Gestão → Análises** (cartão Exportar e a recomendação de reposição) e **Meu desempenho** (quanto falta por dia restante). Medido em 18/11/2026 contra a stack local, com `@axe-core/playwright` nas marcas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` e `wcag22aa`:

| Combinação | axe | Rolagem horizontal |
| --- | --- | --- |
| Análises · desktop · escuro | 0 violações | não |
| Análises · desktop · claro | 0 violações | não |
| Análises · 320 px · escuro | 0 violações | não |
| Análises · 320 px · claro | 0 violações | não |
| Meu desempenho · desktop · escuro | 0 violações | não |
| Meu desempenho · desktop · claro | 0 violações | não |
| Meu desempenho · 320 px · escuro | 0 violações | não |
| Meu desempenho · 320 px · claro | 0 violações | não |
| Análises · zoom de 200% (640 px úteis) | 0 violações | não |

Também conferido no cartão Exportar: todos os campos e botões são alcançáveis pelo teclado na ordem do documento (`tabIndex` 0), cada campo tem rótulo associado por `id`, os botões têm 44 px de altura em 320 px (alvo de toque do manual) e cabem na largura, o resultado é anunciado numa região viva (`role="status"`) e o arquivo baixa de verdade pelo navegador (`GET /api/backend/analytics/export?...&format=XLSX` → 200). Nenhuma cor literal foi escrita: as duas telas usam apenas classes e tokens do design system já existentes.

## 11. O que não foi validado

Registrado para não passar por pronto:

- **Revisão de marca contra o manual em PDF**: a seção 7 do plano pede a leitura do `SBI-Manual-de-Identidade-Visual-v2.pdf` indicado, a conferência das seções 23, 26 a 31 e 35–36 contra o design system versionado, e o registro de divergência entre a cópia v2.1 e a v2.2. **Não foi feita.** O que foi feito nas duas telas alteradas está na seção 10: axe (WCAG 2.2 AA) nos dois temas, 320 px, zoom de 200%, teclado, alvo de toque e ausência de cor literal — tudo sobre classes e tokens que já existiam. Nenhuma decisão de tipografia, paleta ou componente novo foi tomada nesta alteração, então nada entrou fora do design system; mas a conferência do manual continua devendo.
- **Comparação ano a ano do CEO**: o recorte Olist cobre os últimos 365 dias, então 2025 só tem novembro e dezembro. No Painel executivo de 2026 a comparação com "o mesmo trecho do ano anterior" fica distorcida (o acumulado de 2026 compara com uma fatia quase vazia de 2025) e dez dos doze pontos da série do ano anterior ficam em zero. A seção 3 do plano pede meses equivalentes do ano anterior; **não foi atendida**. Corrigir exige estender o recorte da massa para dois anos (`montar_recorte.py`), não a carga de apresentação. Para a banca: use a comparação **mês a mês**, que tem dado dos dois lados, e não a anual.
- **Insight de margem pressionada e projeção para o gerente**: a seção 5 do plano pede, na linha do gerente, produtos com margem pressionada e projeção além do desvio. Nenhuma das duas existe: Análises lista todos os produtos vendidos com a margem calculada, sem limiar nem destaque, e nenhuma tela de GERENTE projeta o fechamento do mês (a projeção existe só no Painel executivo, do CEO). O que o gerente ganhou nesta alteração foi a recomendação de reposição, com limiar do próprio produto. **As outras duas ficam devendo.**
- **Referência nos primeiros dias do mês** — **tratado em 19/11/2026, aguardando revisão.** A projeção do mês de referência passou a ser ancorada: abaixo de sete dias corridos, a média diária é a média ponderada entre o ritmo do mês (peso = corridos/7) e a média diária do mês anterior, que é um mês fechado. Medido na rota nativa: `ref=2026-11-01` saía com meta anual de **R$ 4.409.325,10** e plano de novembro de **R$ 1.910.244,75**; agora sai com **R$ 1.195.252,94** e **R$ 303.208,67**. O peso chega a 1 exatamente em sete dias, então não há salto, e de sete dias em diante o cálculo é o de antes: `ref=2026-11-18` devolve a mesma fotografia (`314|375|314|1|12|24|985989.28|749507.30|601|5`) e o `run_apresentacao.sh` fecha em **17 PASS, 0 FAIL, 0 ERROS**. Uma consequência a conhecer: com a projeção ancorada, estar acima ou abaixo do ritmo volta a ser um fato do dado e não uma construção da carga, que por isso **não garante mais um vendedor de cada lado** nos primeiros dias — nesse caso ela avisa e segue, em vez de parar, e de sete dias em diante a exigência continua valendo. Para a banca, continue usando uma referência com alguns dias corridos.

- **Fotos de modelo incorreto** (seção 6): **auditadas e fechadas em 19/11/2026, não corrigidas.** A [auditoria de imagem por SKU](auditoria-fotos-catalogo.md) lista as **18** divergências dos 36 SKUs fotografados (10 de geração, 2 de cor, 6 de produto ou variante) e separa as **12** para as quais não pode existir foto de licença livre do modelo exato — porque o SKU nomeia uma geração que não existe — das **6** que só precisam de imagem nova. Nenhum arquivo foi trocado.
- **Ambiente publicado** (Vercel, Render, Neon): nada foi publicado nem alterado nesta preparação. Tudo acima foi medido no PostgreSQL 18 local em contêiner, com a API e o frontend em `127.0.0.1`.
- **Modo nativo no Windows**: os números deste documento foram medidos num PostgreSQL 18 em contêiner (porta 5435 em `127.0.0.1`), que é também o que os runners do pacote usam por padrão (`docker exec … psql`). A via nativa **deixou de ser uma pendência**: ela foi executada em 19/11/2026, com binários portáteis do PostgreSQL 18.7, numa porta e num diretório exclusivos, e está registrada na seção 4 de [executar o SBI sem Docker](../05-operacao/execucao-local.md) — `run_olist_bd.sh` e `run_apresentacao.sh` passaram lá (11 e 17 PASS) pelo `psql` nativo. Duas ressalvas ficam: os números daquele banco são de outra data de referência, e o `run_bd.sh` continua só no contêiner, porque entra como papéis de banco sem senha.
- **Suíte E2E completa**: a verificação acima foi dirigida às duas telas alteradas. A suíte `frontend/e2e` inteira não rodou, porque ela exige o banco descartável da porta 18080 (`A3_CONTRACT_ISOLATED=1`), fora do escopo desta preparação. O que rodou: **771 testes do backend** (`mvnw -Pintegration test`, 0 falhas, 0 erros, 0 ignorados, numa única execução de 18/11/2026 no PostgreSQL 18 descartável da porta 15432; 46 relatórios em `target/surefire-reports`), **117 testes unitários do frontend** (`npm test` em `frontend/`, 0 falhas), typecheck, build e o pacote SQL (61 + 7 + 17 PASS).
- **Contraste medido com instrumento**: o axe cobre contraste de texto e passou nos dois temas, mas as marcas de dados dos gráficos (séries, meta tracejada) não foram medidas uma a uma; elas não mudaram nesta alteração.
- **`03_rbac.sql`**: os papéis de banco, os `GRANT` por coluna e as políticas de RLS existem só no pacote SQL autônomo e **não** são aplicados pelo Flyway. A aplicação conecta com um único usuário de banco; quem restringe o acesso por papel no ambiente autenticado é a API (`SecurityConfig` e `@PreAuthorize`), conferida pela matriz de acesso. O que **está** pronto para a banca: como o `run_bd.sh` roda nesse mesmo banco, a `03` fica aplicada nele, e a RLS pode ser mostrada na hora, sem trocar de ambiente — medido em 18/11/2026, `SELECT count(*) FROM orders` devolveu **315** para o dono `sbi`, **315** para `gerente_matheus` (política `USING (true)`) e **95** para `vendedor_allan` (política `seller_id = app_current_user_id()`), que vê só os pedidos dele e recebe zero linhas ao pedir o pedido de outro vendedor pelo id. O `GRANT` por coluna também responde: `vendedor_allan` lendo custo recebe `permission denied for table stock_entry`. Os comandos estão no [roteiro](../05-operacao/roteiro-banco-de-dados.md), no passo 3.
- **Orientação de produto para o vendedor**: a seção 5 do plano pede, em *Meu desempenho*, uma sugestão de produtos ou categorias com estoque e histórico de venda complementar, no escopo do próprio vendedor. Não foi feita: nenhum endereço da API entrega, para o vendedor, o seu histórico por produto ou categoria cruzado com estoque, e inventá-lo no navegador a partir da lista de pedidos daria uma recomendação não reproduzível. O que a tela ganhou foi a parte verificável do pedido: quanto falta por dia restante, com a base de dias escrita ao lado. A sugestão de produto exigiria um campo novo em `GET /performance/me`, calculado no servidor.
