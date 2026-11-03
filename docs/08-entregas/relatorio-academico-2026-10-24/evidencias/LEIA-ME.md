# Evidências da auditoria de 24/10/2026

Padrão de nome: `EV-<área>-<nº>_<descrição>_<data>.<ext>`. Áreas: AV (avatares, *pull request* nº 47), BD (banco), CI (integração contínua), CT (contrato), WEB (frontend), PUB (ambiente publicado), REN (Render), SEC (segurança), QA (métricas). Os identificadores [E-nn] citados no relatório estão no Apêndice K.

| Arquivo | Conteúdo | Origem e ambiente |
| --- | --- | --- |
| `EV-AV-01_avatares-pr47_2026-10-25.json` | Estado do *pull request* nº 47, integração contínua, implantações na Vercel, associação avatar–usuário e *hash* das 14 imagens | GitHub e Vercel, somente leitura (00h00–00h15 de 25/10, horário de Brasília) |
| `EV-AV-02_frontend-unit-pr47_2026-10-25.tap` | Testes do frontend no *commit* `a54635d`: 52/53, com os 11 de avatar aprovados | Node 22.23.4 |
| `EV-BD-01_resultado_bd_pg16_2026-10-24.txt` | Saída do pacote SQL do job `bd`: 61 PASS | PostgreSQL 16.15 local, commit 6046904 |
| `EV-BD-02_resultado_olist_pg16_2026-10-24.txt` | Carga Olist (2 execuções) e 7 PASS | PostgreSQL 16.15 local |
| `EV-BD-03_explain-indices_pg16_2026-10-24.txt` | Planos de execução com e sem varredura sequencial | PostgreSQL 16.15 local |
| `EV-BD-04_neon-producao_2026-10-24.json` | Versão, migrações, contagens, uso de índices, contas e configuração do projeto no banco publicado | Neon, consultas somente leitura (~21:52–23:20 UTC) |
| `EV-BD-05_crud-exemplos-gerente_pg16_2026-10-24.txt` | Roteiro de CRUD executado como gerente (encerrado em ROLLBACK) | PostgreSQL 16.15 local |
| `EV-BD-06_crud-clientes-olist_pg16_2026-10-24.txt` | Roteiro de CRUD de clientes da massa Olist | PostgreSQL 16.15 local |
| `EV-CI-01_execucao-ci-6046904_2026-10-24.json` | Conclusão de cada *job* e etapa da execução 39668791724 do *workflow* CI; execuções dos *workflows* manuais | API do GitHub Actions, somente leitura (23h45, horário de Brasília) |
| `EV-CT-01_npm-test-raiz_2026-10-24.tap` | Validadores de contrato: 47/47 | Node 22.23.4 |
| `EV-CT-02_audit-contract-v5_2026-10-24.json` | Auditoria estática do contrato v5 | Node 22.23.4 |
| `EV-CT-03_validate-contract-v5_2026-10-24.json` | Validação dos esquemas do contrato v5 | Node 22.23.4 |
| `EV-WEB-01_frontend-typecheck-unit_2026-10-24.tap` | Verificação de tipos e 42 testes do frontend (41 aprovados) | Node 22.23.4, TypeScript 6.0.3 |
| `EV-WEB-02_frontend-build-bloqueado-rede_2026-10-24.log` | Build interrompido pelo bloqueio de fontes externas | Ambiente de análise |
| `EV-WEB-03_frontend-unit-apos-correcoes_2026-10-24.tap` | Testes do frontend com as correções propostas: 43/43 | *Branch* local com o *patch* de `correcoes-propostas/`, Node 22.23.4 |
| `EV-WEB-04_cabecalhos-paginas-apos-correcoes_2026-10-24.txt` | Cabeçalhos de segurança das páginas com as correções propostas | Servidor de desenvolvimento do Next.js 16.4.3 |
| `EV-PUB-01_entrar-desktop_2026-10-24.jpg` | Tela de login publicada, largura de computador | Navegador integrado |
| `EV-PUB-02_entrar-mobile-375_2026-10-24.jpg` | Tela de login publicada, 375 px | Navegador integrado |
| `EV-PUB-03_inspecao-publicada_2026-10-24.json` | Requisições GET sem credenciais, cabeçalhos, resumo do OpenAPI publicado e imagens estáticas | 21:58–22:00 e 23:29 UTC (18:58–19:00 e 20:29, horário de Brasília) |
| `EV-PUB-04_operacoes-openapi-publicado_2026-10-24.txt` | 76 operações do OpenAPI publicado com códigos de resposta | `/api/backend/v3/api-docs` |
| `EV-PUB-05_erros-v5-ausentes-no-openapi-publicado_2026-10-24.json` | Códigos de erro do contrato v5 ausentes por operação | Comparação contrato × publicado |
| `EV-REN-01_render-servico-e-implantacoes_2026-10-24.json` | Configuração do serviço `sbi-api` e implantação ativa, sem variáveis de ambiente | API do Render, somente leitura (23h47, horário de Brasília) |
| `EV-SEC-01_npm-audit-frontend_2026-10-24.json` | Auditoria de dependências do frontend | `npm audit` |
| `EV-SEC-02_npm-audit-raiz_2026-10-24.json` | Auditoria de dependências da raiz | `npm audit` |
| `EV-SEC-03_npm-audit-frontend-apos-correcoes_2026-10-24.json` | Auditoria de dependências do frontend com `next` 16.4.3: nenhuma vulnerabilidade em produção | *Branch* local com o *patch* de `correcoes-propostas/` |
| `EV-QA-01_metricas-r0-r1-recalculadas_2026-10-24.txt` | Recálculo das métricas R0 e R1 a partir dos relatórios versionados | `reports/metricas/` |

Nenhum arquivo contém senha, token, hash de senha ou URL de banco. O token CSRF da inspeção foi omitido, e as variáveis de ambiente do Render não foram lidas.
