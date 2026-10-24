# Matriz de acesso (ERP/PDV)

Data: 14/10/2026. Fonte executável: [`src/test/resources/security/access-matrix.csv`](../../src/test/resources/security/access-matrix.csv). Esta página espelha o CSV; em divergência, vale o CSV, e os testes CT-SEC-101 a CT-SEC-103 falham. Contexto de segurança: [autenticacao-sessao-rbac.md](autenticacao-sessao-rbac.md).

## Legenda

| Valor | Significado | Asserção do CT-SEC-101 |
| --- | --- | --- |
| `PERMIT` | Acesso liberado ao papel | Status diferente de 401 e 403 |
| `OWN` | Liberado, restrito aos objetos do próprio vendedor | Como `PERMIT` no próprio objeto; objeto de outro vendedor → 404; listas filtradas |
| `401` | Sem sessão | 401 `UNAUTHENTICATED` com corpo `ErrorResponse` |
| `403` | Papel sem permissão | 403 `FORBIDDEN` com corpo `ErrorResponse` |

Regras de leitura:

- `{id}` é substituído por um objeto existente da massa do teste; `**` por `index.html`; método `*` significa todos os métodos HTTP.
- Mutações são enviadas com token CSRF válido; a ausência do token é coberta à parte (CT-SEC-104).
- GERENTE herda tudo do VENDEDOR (RF-17): em toda linha com `PERMIT`/`OWN` para o VENDEDOR, o GERENTE tem `PERMIT`.
- CEO herda tudo do GERENTE (RF-27, D-EVO-42, 24/10/2026): em toda linha com `PERMIT` para o GERENTE, o CEO tem `PERMIT`; `/executive/**` é só do CEO. A coluna `ceo` do CSV é conferida pelo CT-SEC-123.
- Os contratos v4 e v5 são auditados contra este CSV pelas colunas `vendedor`/`gerente`, e o v6 também pela coluna `ceo`: `x-roles` de cada operação tem de bater com os papéis liberados (`scripts/audit-contract.mjs`).

## Matriz

| Método | Caminho | Anônimo | VENDEDOR | GERENTE | CEO |
| --- | --- | --- | --- | --- | --- |
| POST | `/auth/login` | PERMIT | PERMIT | PERMIT | PERMIT |
| GET | `/auth/csrf` | PERMIT | PERMIT | PERMIT | PERMIT |
| POST | `/auth/logout` | PERMIT | PERMIT | PERMIT | PERMIT |
| GET | `/v3/api-docs`, `/v3/api-docs.yaml`, `/v3/api-docs/swagger-config` | PERMIT | PERMIT | PERMIT | PERMIT |
| GET | `/swagger-ui.html`, `/swagger-ui/**` | PERMIT | PERMIT | PERMIT | PERMIT |
| * | `/error` | PERMIT | PERMIT | PERMIT | PERMIT |
| GET | `/auth/me` | 401 | PERMIT | PERMIT | PERMIT |
| PUT | `/auth/password` (troca da propria senha, contrato v5) | 401 | PERMIT | PERMIT | PERMIT |
| GET | `/sales/catalog` | 401 | PERMIT | PERMIT | PERMIT |
| POST | `/sales/quote` | 401 | PERMIT | PERMIT | PERMIT |
| POST | `/sales/orders` | 401 | PERMIT | PERMIT | PERMIT |
| GET | `/sales/orders`, `/sales/orders/{id}` | 401 | OWN | PERMIT | PERMIT |
| POST | `/sales/orders/{id}/payment` | 401 | OWN | PERMIT | PERMIT |
| POST | `/sales/orders/{id}/discount-approval` (contrato v5) | 401 | 403 | PERMIT | PERMIT |
| POST | `/orders/{id}/cancel` | 401 | OWN | PERMIT | PERMIT |
| GET, POST | `/customers` | 401 | PERMIT | PERMIT | PERMIT |
| GET, PUT | `/customers/{id}` | 401 | PERMIT | PERMIT | PERMIT |
| DELETE | `/customers/{id}` | 401 | 403 | PERMIT | PERMIT |
| GET | `/customers/{id}/orders` | 401 | PERMIT | PERMIT | PERMIT |
| GET | `/customers/{id}/summary` (contrato v5; valores do VENDEDOR so dos pedidos dele) | 401 | PERMIT | PERMIT | PERMIT |
| POST | `/customers/{id}/address` (legado) | 401 | 403 | PERMIT | PERMIT |
| GET | `/performance/me`, `/promotions/active` | 401 | PERMIT | PERMIT | PERMIT |
| GET, POST | `/promotions`; POST `/promotions/{id}/close` | 401 | 403 | PERMIT | PERMIT |
| GET, POST | `/products`; GET, PUT, DELETE `/products/{id}`; PATCH `/products/{id}/price`, `/products/{id}/status`; GET `/products/{id}/price-history` | 401 | 403 | PERMIT | PERMIT |
| GET, POST | `/categories`; PUT `/categories/{id}` | 401 | 403 | PERMIT | PERMIT |
| GET | `/stock/products`, `/stock/movements`; POST `/stock/products/{id}/entries`, `/stock/products/{id}/adjustments`; PATCH `/stock/products/{id}/min-level` | 401 | 403 | PERMIT | PERMIT |
| GET, PUT | `/goals/monthly` | 401 | 403 | PERMIT | PERMIT |
| GET | `/management/summary`, `/management/revenue`, `/analytics/sales`, `/analytics/stock` | 401 | 403 | PERMIT | PERMIT |
| POST | `/payment/{id}/refund` | 401 | 403 | PERMIT | PERMIT |
| GET | `/discount-policy`; PUT `/discount-policy/{role}` (contrato v5) | 401 | 403 | PERMIT | PERMIT |
| GET, POST | `/users`; GET, PUT `/users/{id}`; PATCH `/users/{id}/role`, `/users/{id}/status`; POST `/users/{id}/unlock`, `/users/{id}/password-reset` (contrato v5) | 401 | 403 | PERMIT | PERMIT |
| PATCH | `/users/{id}/manager` (equipe do vendedor, contrato v6) | 401 | 403 | PERMIT | PERMIT |
| todos | `/orders/**` legado (exceto `cancel`), `/payment/**` legado (exceto `refund`), `/address/**` | 401 | 403 | PERMIT | PERMIT |
| GET | `/executive/overview` (painel executivo, contrato v6) | 401 | 403 | 403 | PERMIT |
| PUT | `/executive/goals/annual` (meta anual, contrato v6) | 401 | 403 | 403 | PERMIT |

O CSV lista cada método e caminho em uma linha (85 linhas além do cabeçalho em 24/10/2026), inclusive cada rota legada mapeada hoje no Spring.

## Exceção temporária (ETAPA 2B)

Na ETAPA 2C, `GET`/`POST /customers` e `GET`/`PUT /customers/{id}` passaram para o `api/customers` do v4, que mascara o documento para o VENDEDOR, e ficaram liberadas ao VENDEDOR como a matriz prevê (D-NOITE-10); a restrição temporária da D-NOITE-05 e a lista de pendências do `AccessMatrixTest` foram removidas.

## Diferenças em relação ao SBI-EXECUCAO

| Delta | Mudança |
| --- | --- |
| DELTA-01 | VENDEDOR passa a ler, cadastrar e editar clientes; documento mascarado; exclusão só do GERENTE. |
| DELTA-02 | O PDV usa catálogo próprio (`/sales/catalog`, sem custo nem saldo físico); `/products` e `/stock` ficam só com o GERENTE. |
| DELTA-04 | Vendas do vendedor em `GET /sales/orders`, no lugar de `GET /orders?mine=true`; o `/orders` legado fica intocado e só do GERENTE. |
| DELTA-06 | Histórico do cliente visível ao VENDEDOR com a exceção controlada da DEC-ERP-02. |
| DELTA-07 | VENDEDOR cancela a própria venda pendente (DEC-ERP-06); o SBI-EXECUCAO previa "Não". |

## Testes que usam a matriz

- **CT-SEC-101**: cada linha × {anônimo, VENDEDOR, GERENTE, CEO} → asserção da legenda, com corpo de erro validado contra `ErrorResponse`.
- **CT-SEC-102**: lê todos os mapeamentos do `RequestMappingHandlerMapping` e falha se algum par método/caminho não tiver linha. Em 14/10 o Spring registrava, além dos controladores, `GET /v3/api-docs`, `GET /v3/api-docs.yaml`, `GET /v3/api-docs/swagger-config`, `GET /swagger-ui.html` e `/error` (todos os métodos), conferidos com o log `TRACE` do `RequestMappingHandlerMapping` ao subir o jar da `main`. `POST /auth/logout` é tratado pelo filtro de logout e não aparece nesse mapeamento; tem linha mesmo assim.
- **CT-SEC-103**: toda linha com `PERMIT`/`OWN` para o VENDEDOR é exercida pelo GERENTE nas duas camadas (URL e `@PreAuthorize`).
- **CT-SEC-123**: toda linha com `PERMIT` para o GERENTE é liberada ao CEO, `/executive/**` responde 403 ao VENDEDOR e ao GERENTE, e o CEO passa nos casos de uso de método do GERENTE e do VENDEDOR (`MethodSecurityHierarchyTest`).

## Documentação pública

`/v3/api-docs/**` e `/swagger-ui/**` continuam públicos porque a CI compara o OpenAPI ao vivo com o contrato (CT-CONTRACT-102) sem sessão. Risco aceito: qualquer pessoa com acesso à rede vê a lista de rotas, parâmetros e schemas, mas nenhum dado de negócio; todas as rotas de negócio continuam exigindo sessão e papel. Mitigação disponível se a API for exposta fora do ambiente acadêmico: `springdoc.api-docs.enabled=false` no perfil de produção, mantendo a documentação nos perfis de teste e demo.
