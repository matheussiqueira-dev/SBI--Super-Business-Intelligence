# Documentação do SBI

Mapa de toda a documentação do projeto, organizada por tema em pastas numeradas na ordem de leitura. O `README.md` da raiz do repositório explica como rodar o sistema; aqui fica o resto.

## Por onde começar

| Quero... | Abra |
| --- | --- |
| Avaliar o projeto | [Relatório final](08-entregas/relatorio-final.md), [relatório acadêmico](08-entregas/relatorio-academico-2026-10-24/) e [roteiro de demonstração](05-operacao/roteiro-demonstracao.md) |
| Entender o que o sistema faz | [Requisitos](01-produto/requisitos.md) e [critérios de aceitação](01-produto/criterios-aceitacao.md) |
| Entender como ele é feito | [Arquitetura](02-arquitetura/arquitetura.md), [decisões](06-decisoes/) e [modelo de dados](03-banco-de-dados/modelo-erp-pdv.md) |
| Ver como ele é testado | [Plano de testes](04-qualidade/plano-testes.md), [catálogo de casos](04-qualidade/catalogo-casos.md), [rastreabilidade](04-qualidade/rastreabilidade.md) e [defeitos](04-qualidade/defeitos.md) |
| Publicar ou apresentar | [Publicação (Vercel, Render e Neon)](05-operacao/deploy.md) e [roteiro de demonstração](05-operacao/roteiro-demonstracao.md) |
| Usar a marca | [Identidade visual v2](07-marca/LEIA-ME.md) |

## Pastas

| Pasta | Conteúdo |
| --- | --- |
| [01-produto/](01-produto/) | O que o sistema deve fazer: [requisitos](01-produto/requisitos.md) (RF e RNF), [critérios de aceitação](01-produto/criterios-aceitacao.md), [validação dos requisitos](01-produto/validacao-requisitos.md) e [avatares dos usuários](01-produto/avatares-usuarios.md) |
| [02-arquitetura/](02-arquitetura/) | Como o sistema é feito: [arquitetura](02-arquitetura/arquitetura.md) (camadas, fluxo de venda, segurança, frontend) e [API legada](02-arquitetura/api-legada.md) (rotas anteriores ao ERP/PDV) |
| [03-banco-de-dados/](03-banco-de-dados/) | [Modelo ERP/PDV](03-banco-de-dados/modelo-erp-pdv.md), [dicionário de dados](03-banco-de-dados/dicionario-dados.md), [migrações](03-banco-de-dados/migracoes.md), [massa de demonstração](03-banco-de-dados/massa-demonstracao.md) e o [pacote SQL](03-banco-de-dados/pacote-sql/) da disciplina, que o CI executa |
| [04-qualidade/](04-qualidade/) | [Plano de qualidade](04-qualidade/plano-qualidade.md), [plano de testes](04-qualidade/plano-testes.md), [catálogo de casos](04-qualidade/catalogo-casos.md), [rastreabilidade](04-qualidade/rastreabilidade.md), [análise de risco](04-qualidade/analise-risco.md), [defeitos](04-qualidade/defeitos.md), [relatório de usabilidade](04-qualidade/relatorio-usabilidade.md) e os [modelos de documento](04-qualidade/templates/) |
| [05-operacao/](05-operacao/) | [Publicação](05-operacao/deploy.md) (Vercel, Render e Neon, variáveis e manutenção) e [roteiro de demonstração](05-operacao/roteiro-demonstracao.md) |
| [06-decisoes/](06-decisoes/) | Registros de decisão: [evolução](06-decisoes/evolucao.md) (D-EVO e D-MAR), [ERP/PDV](06-decisoes/erp-pdv.md), [matriz de acesso](06-decisoes/matriz-acesso.md), [autenticação e sessão](06-decisoes/autenticacao-sessao-rbac.md), [dinheiro](06-decisoes/dinheiro.md), [contrato](06-decisoes/contrato.md), [stack](06-decisoes/stack.md), [regras da loja](06-decisoes/regras-loja.md), [metas de qualidade](06-decisoes/metas-qualidade.md), [frontend e sessão](06-decisoes/arquitetura-frontend-sessao.md) e [integração da fase 0](06-decisoes/integracao-fase0.md) |
| [07-marca/](07-marca/) | Identidade visual v2: manual em PDF e HTML, documentos da marca, logotipos, ícones, design system com fontes (licença OFL incluída), mockups, apresentações e pranchas |
| [08-entregas/](08-entregas/) | O que foi entregue à disciplina: [relatório final](08-entregas/relatorio-final.md), [relatório acadêmico de 24/10](08-entregas/relatorio-academico-2026-10-24/) (DOCX, PDF, planilhas, diagramas, evidências e correções propostas) e o pacote SQL entregue em zip. Ver [08-entregas/README.md](08-entregas/README.md) |
| [09-referencias/](09-referencias/) | Enunciado, manual do projeto A3, plano original, guia visual e direção criativa. Ver [09-referencias/README.md](09-referencias/README.md) |
| [10-historico/](10-historico/) | Etapas encerradas: Trello e planejamento da equipe, sessões, rodadas de testes de 03 a 09/10, contratos ao vivo v4 e v5 e os [planos e registros de execução](10-historico/planejamento/) de outubro. Ver [10-historico/README.md](10-historico/README.md) |

Fora de `docs/`, o repositório guarda evidências geradas em [`reports/`](../reports/) (capturas da marca v1, contrato ao vivo do v6, resumos de métricas) e o contrato OpenAPI em [`config/openapi/`](../config/openapi/).

## Onde estava cada documento

A organização em pastas é de 25/10/2026 (D-EVO-54). Documentos antigos, o relatório acadêmico, os comentários das migrações do Flyway (que não podem mudar sem alterar o checksum) e o histórico arquivado citam os caminhos antigos. Use a tabela para achá-los:

| Antes | Agora |
| --- | --- |
| `docs/requisitos.md` | [01-produto/requisitos.md](01-produto/requisitos.md) |
| `docs/criterios-aceitacao.md` | [01-produto/criterios-aceitacao.md](01-produto/criterios-aceitacao.md) |
| `docs/validacao-requisitos.md` | [01-produto/validacao-requisitos.md](01-produto/validacao-requisitos.md) |
| `docs/user-avatars.md` | [01-produto/avatares-usuarios.md](01-produto/avatares-usuarios.md) |
| `docs/arquitetura.md` | [02-arquitetura/arquitetura.md](02-arquitetura/arquitetura.md) |
| `docs/api-legada.md` | [02-arquitetura/api-legada.md](02-arquitetura/api-legada.md) |
| `docs/bd/` | [03-banco-de-dados/](03-banco-de-dados/) (mesmos arquivos, inclusive `pacote-sql/`) |
| `docs/plano-qualidade.md` | [04-qualidade/plano-qualidade.md](04-qualidade/plano-qualidade.md) |
| `docs/plano-testes.md` | [04-qualidade/plano-testes.md](04-qualidade/plano-testes.md) |
| `docs/catalogo-casos.md` | [04-qualidade/catalogo-casos.md](04-qualidade/catalogo-casos.md) |
| `docs/rastreabilidade.md` | [04-qualidade/rastreabilidade.md](04-qualidade/rastreabilidade.md) |
| `docs/analise-risco.md` | [04-qualidade/analise-risco.md](04-qualidade/analise-risco.md) |
| `docs/defeitos.md` | [04-qualidade/defeitos.md](04-qualidade/defeitos.md) |
| `docs/relatorio-usabilidade.md` | [04-qualidade/relatorio-usabilidade.md](04-qualidade/relatorio-usabilidade.md) |
| `docs/templates/` | [04-qualidade/templates/](04-qualidade/templates/) |
| `docs/deploy.md` | [05-operacao/deploy.md](05-operacao/deploy.md) |
| `docs/roteiro-demonstracao.md` | [05-operacao/roteiro-demonstracao.md](05-operacao/roteiro-demonstracao.md) |
| `docs/decisoes/` | [06-decisoes/](06-decisoes/) (mesmos arquivos) |
| `docs/relatorio-final.md` | [08-entregas/relatorio-final.md](08-entregas/relatorio-final.md) |
| `docs/referencias/` | [09-referencias/](09-referencias/) |
| `docs/historico/` | [10-historico/](10-historico/) |
| `A3/marca/rebranding-v2/` (fora do repositório) | [07-marca/](07-marca/), sem o `SBI-rebranding-v2.zip`, que repetia os mesmos arquivos |
| `A3/entregas/` (fora do repositório) | [08-entregas/](08-entregas/) |
| `A3/planejamento/` (fora do repositório) | [10-historico/planejamento/](10-historico/planejamento/), sem o PDF do roteiro de conclusão, que repetia o `.md` |

## Convenções

- Documento novo entra na pasta do tema; se não couber em nenhuma, a pasta certa ainda não existe e vale uma decisão em [evolução](06-decisoes/evolucao.md).
- Decisões recebem ID (`D-EVO-nn`, `D-MAR-nn`, `D-PUB-nn`, `DEC-ERP-nn` etc.) e ficam em [06-decisoes/](06-decisoes/); casos de teste seguem os IDs do [catálogo](04-qualidade/catalogo-casos.md).
- Relatório de uma rodada de testes nova vai para `reports/execucoes/`; saídas brutas de ferramenta (JaCoCo, Surefire, contrato ao vivo) ficam em `target/` e nos artefatos do CI, fora do Git.
- Etapa encerrada vai para [10-historico/](10-historico/), com o caminho antigo registrado no índice de lá.
