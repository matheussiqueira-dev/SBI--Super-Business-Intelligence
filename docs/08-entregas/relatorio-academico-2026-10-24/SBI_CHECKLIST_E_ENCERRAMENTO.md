# SBI — Checklist final de auditoria e relatório de encerramento

Data: 24/10/2026. Versão analisada: commit `3b0242c` (branch `main`), em produção na Vercel e no Render. Situação em 25/10/2026 na seção 4 e no Apêndice M do relatório.

## 1. Checklist final

| Nº | Verificação | Situação | Observação |
| ---: | --- | --- | --- |
| 1 | Todos os capítulos foram desenvolvidos | Conforme | 16 capítulos, referências e 12 apêndices (A a L), incluindo a seção 10.13 sobre os avatares dos usuários (*pull request* nº 47, em integração) |
| 2 | Os conteúdos representam a implementação real | Conforme | Afirmações conferidas contra o código do commit `3b0242c`, o banco publicado, o site publicado, a integração contínua e o serviço da API no Render; uma revisão independente dos capítulos técnicos levou a 19 correções pontuais (por exemplo: categorias sem exclusão, *views* efetivamente lidas pela API, número de capturas, origem da senha no histórico do Git), além da indicação das funções existentes só na API e da redefinição do achado A-10 |
| 3 | As informações acadêmicas estão corretas | Conforme, com pendências | Denominação “Centro Universitário dos Guararapes” confirmada em documento acadêmico emitido pela instituição a um dos integrantes; o local da capa foi mantido como Recife, conforme informado pela equipe, embora os documentos institucionais consultados sejam emitidos em Jaboatão dos Guararapes [PENDENTE DE VALIDAÇÃO — confirmar o local da capa com a coordenação]; [PENDENTE DE VALIDAÇÃO — autorização docente para grupo de quatro integrantes, pois o enunciado de GQS limita a três; não encontrada no Drive, no Trello nem nas mensagens de e-mail consultadas]; [PENDENTE DE VALIDAÇÃO — enunciado ou rubrica escrita de Banco de Dados; não encontrada, e a exigência conhecida (banco funcional com SQL e CRUD) está atendida] |
| 4 | Nomes e registros dos integrantes estão corretos | Conforme, com ressalva | Conferidos com o Manual do projeto v1.0; o RA de Gabriel Sousa Vasconcelos tem 11 dígitos e os demais têm 10, e o Manual, única fonte encontrada, traz o mesmo valor [PENDENTE DE VALIDAÇÃO — confirmação pelo próprio integrante] |
| 5 | Docentes associados às disciplinas corretas | Conforme | GQS: Paulo Thiago Gomes da Silva e Christian Felix Gbedande Azonyetin; BD: Paulo Thiago Gomes da Silva e Bruno Marciano de Amorim Josino, conforme informado |
| 6 | Tecnologias efetivamente verificadas | Conforme, com limitação | Versões lidas dos manifestos e confirmadas em execução para Node, TypeScript e PostgreSQL; JDK 25 e Maven não puderam ser executados no ambiente de análise, mas a compilação e os testes Java constam como aprovados na integração contínua do commit de referência |
| 7 | Diagramas representam a arquitetura real | Conforme | 13 diagramas derivados de código, migrações, configuração e plataformas, com fontes Mermaid editáveis; implantação conferida com Vercel, Render e Neon |
| 8 | Banco de dados corretamente documentado | Conforme | 19 tabelas e 162 colunas no dicionário; paridade com o banco publicado em tabelas, views, funções, gatilhos, CHECK, FK e índices; colunas e UNIQUE não contados no banco publicado |
| 9 | Testes registrados possuem evidências | Conforme | 163 verificações executadas com arquivos em `evidencias/`; aprovação das suítes Java, E2E e de contrato ao vivo confirmada pela integração contínua (execução 39668791724), sem os totais; resultados da equipe marcados como documentados |
| 10 | Métricas calculáveis e reproduzíveis | Conforme | R0 e R1 recalculadas dos relatórios versionados; taxa 162/163 e densidade 20/5,952 KLOC com base declarada |
| 11 | Todas as figuras possuem identificação | Conforme | 25 figuras, 81 quadros e 11 tabelas com título numerado e fonte |
| 12 | Citações corretas | Conforme | 46 obras citadas, conferidas automaticamente contra as 46 referências; nenhuma citação sem referência e nenhuma referência sem citação |
| 13 | Referências verificáveis | Conforme, com limitação | URLs e DOIs informados; normas ISO/IEC/IEEE citadas pelos títulos e escopo, sem acesso ao texto integral |
| 14 | Sumário corresponde aos títulos e páginas | Conforme no PDF | No DOCX, atualizar o sumário e as listas no editor após qualquer alteração (paginação varia entre editores) |
| 15 | Arquivos formatados corretamente | Conforme, com pendência | A4, margens 3/3/2/2 cm, Arial 12, espaçamento 1,5, recuo 1,25 cm, paginação a partir da folha de rosto, citações autor-data; [PENDENTE DE VALIDAÇÃO — modelo institucional da UNIFG, não encontrado no Drive nem nas mensagens consultadas] |
| 16 | Repetição textual desnecessária | Conforme | Resumos no corpo e detalhes nos apêndices (achados, rastreabilidade, casos de uso), por desenho |
| 17 | Inconsistências entre capítulos | Conforme | Revisadas contagens, seções citadas, horários das evidências (registrados em UTC e convertidos para o horário de Brasília), o achado A-10 e a situação das suítes após a consulta à integração contínua |
| 18 | Todos os requisitos possuem situação | Conforme | 26 RF e 7 RNF com situação e nível de verificação |
| 19 | Exposição de credenciais ou informações confidenciais | Conforme | Nenhuma senha, token, hash ou URL de banco; senha do histórico do Git não reproduzida; token CSRF omitido; variáveis de ambiente do Render não lidas; dados de contas do banco publicado resumidos sem dados pessoais além dos e-mails institucionais já publicados no README |
| 20 | A documentação atende às exigências acadêmicas identificadas | Parcial | Atende aos mínimos de GQS (≥ 10 RF, ≥ 5 RNF, ≥ 30 casos, ≥ 3 técnicas de caixa-preta) e à exigência de BD conhecida (banco funcional com SQL e CRUD); a reprodução ao vivo na apresentação depende das ações P1 do capítulo 15, das quais a atualização do `next` já está preparada em `correcoes-propostas/` |

## 2. Ações que dependem da equipe

| Ação | Responsável | Como fazer |
| --- | --- | --- |
| Aplicar as correções propostas (A-03, A-04, A-05, A-12, A-16) | Responsável pelo repositório | Seguir `correcoes-propostas/LEIA-ME.md`: `git am`, `npm test`, *push* da *branch* e *pull request*; aguardar a integração contínua e conferir os cabeçalhos no ambiente publicado |
| Criar as contas de avaliação dos docentes (A-08) | Gerente do SBI | Tela Usuários, papel adequado e senha provisória entregue por canal seguro; a troca no primeiro acesso é obrigatória |
| Restringir a pasta oficial do Drive (A-07) | Proprietário da pasta | Compartilhar → Acesso geral → “Restrito” (ou manter “Qualquer pessoa com o link” com o papel “Leitor”) e adicionar integrantes e docentes por e-mail |
| Completar as respostas de erro no OpenAPI (A-02) | Equipe de *backend* | Anotar os controladores ou usar um `OpenApiCustomizer` e incluir os códigos de erro em `scripts/live-contract.mjs` |
| Confirmar dados acadêmicos | Equipe e coordenação | Local da capa, autorização do grupo de quatro integrantes, rubrica de BD, RA de Gabriel Sousa Vasconcelos e modelo institucional |
| Atualizar o sumário do DOCX | Quem editar o DOCX | No Word: selecionar tudo e pressionar F9 após qualquer alteração |

## 3. Relatório de encerramento

**Fontes consultadas.** Repositório oficial (commit `3b0242c`, 113 commits na `main`, 1.245 arquivos); integração contínua (execução 39668791724 do *workflow* CI e histórico dos *workflows* manuais, pela API do GitHub Actions); aplicação publicada (`https://sbi-app-alpha.vercel.app`, inspeção GET sem credenciais); Vercel (implantação de produção READY do commit `3b0242c`); Render (serviço `sbi-api` e implantação ativa do commit `3b0242c`, sem leitura de variáveis); Neon (consultas somente leitura); pasta oficial do Drive (4 arquivos); quadro do Trello (94 cartões, 448 ações); enunciado de GQS e plano da equipe; documentos locais de planejamento; busca nas mensagens de e-mail do responsável por autorização do grupo, rubrica de BD e modelo institucional.

**Funcionalidades documentadas.** Autenticação e sessão, administração de usuários, PDV com cotação e venda idempotente, confirmação e cancelamento, clientes PF e PJ com CNPJ alfanumérico, histórico e resumo do cliente, Meu desempenho, visão geral, produtos e preços, estoque, promoções, alçadas e aprovação de desconto, análises, estorno e metas (estes dois apenas pela API) e rotas legadas.

**Funcionalidade em integração.** Avatares dos usuários com expressões pré-renderizadas e reações às operações (*pull request* nº 47, commit `a54635d`), documentados na seção 10.13 com o avatar de cada integrante e docente: integração contínua aprovada, 11/11 testes de avatar aprovados localmente, implantação na Vercel falhando por erro de provisionamento e produção ainda sem o recurso. Recomenda-se confirmar os termos de uso das imagens antes da publicação.

**Requisitos identificados.** 26 funcionais, 7 não funcionais, 24 regras de negócio, 20 casos de uso e 85 critérios de aceitação.

**Entidades de dados catalogadas.** 19 tabelas, 162 colunas, 18 views, 13 funções, 8 gatilhos, 52 CHECK, 32 FK, 13 UNIQUE e 48 índices.

**Diagramas produzidos.** 13 tipos em 15 arquivos (o modelo físico foi dividido em três), em PNG e Mermaid.

**Testes encontrados.** 44 classes de teste Java (128 métodos unitários e 119 de integração), 61 verificações SQL e 11 da massa Olist, 47 testes dos validadores de contrato, 42 testes de lógica do frontend, 8 especificações E2E com 26 casos, fumaça publicada com 5 casos e catálogo formal com 43 casos.

**Testes efetivamente executados.** 163 (162 aprovados): 61 SQL, 7 Olist, 47 de contrato, 42 de frontend (1 reprovado por dependência da versão do Node), 1 verificação de tipos e 5 no ambiente publicado; além da auditoria estática do contrato, da comparação do OpenAPI publicado (58/58 operações; 92/201 respostas de erro) e do recálculo das métricas R0 e R1. A integração contínua do commit de referência confirmou a aprovação das suítes Java, E2E com axe e de contrato ao vivo (4/4 *jobs*). Com as correções propostas, os testes do frontend passaram a 43/43.

**Defeitos documentados.** 20 da equipe (2 críticos, 7 altos, 7 médios, 4 baixos), todos corrigidos e nenhum formalmente encerrado; 17 achados desta auditoria (1 alto, 6 médios, 10 baixos), todos abertos, cinco deles com correção proposta e validada localmente.

**Correções preparadas.** *Patch* com 5 commits (Conventional Commits) para A-03, A-04, A-05, A-12 e A-16, validado localmente (tipos, 43/43 testes, nenhuma vulnerabilidade nas dependências de produção, cabeçalhos presentes nas páginas) e aplicado sem conflito sobre `origin/main`. Não foi enviado ao repositório, em respeito à restrição de não alterar a aplicação nem o repositório sem decisão da equipe.

**Limitações identificadas.** Suítes Java, E2E e contrato ao vivo não reexecutadas localmente (JDK 25, Maven Central e Docker indisponíveis), com aprovação confirmada apenas pela conclusão das etapas da integração contínua, porque relatórios e *logs* não puderam ser baixados; fumaça publicada sem execução registrada no GitHub Actions; build do frontend bloqueado pelo acesso a fontes externas; telas autenticadas do ambiente publicado não inspecionadas, por ausência de credencial fornecida por canal seguro e de contas de docentes no banco publicado; pacote SQL executado em PostgreSQL 16, e não 18; participação individual não plenamente comprovável pelas fontes.

**Pendências de validação.** Local da capa; termos de uso das imagens dos avatares; autorização para grupo de quatro integrantes; rubrica de Banco de Dados; RA de Gabriel Sousa Vasconcelos; modelo institucional de formatação; criação das contas de avaliação dos docentes; restrição da pasta do Drive; aplicação das correções propostas; aprovação nominal dos planos de qualidade e de risco.

**Situação da normalização ABNT.** Elementos pré-textuais (capa, folha de rosto, resumo, abstract, listas de figuras, quadros, tabelas e siglas, sumário), textuais e pós-textuais (referências e apêndices) conforme NBR 14724:2024, citações conforme NBR 10520:2023, referências conforme NBR 6023:2025, numeração progressiva conforme NBR 6024:2012 e sumário conforme NBR 6027:2012. Folha de aprovação, dedicatória e agradecimentos não foram incluídos por serem opcionais ou dependentes da instituição.

**Artefatos finais entregues.** `SBI_RELATORIO_ACADEMICO_COMPLETO_2026.pdf` e `.docx`; `SBI_DOCUMENTACAO_TECNICA.md`; `SBI_DICIONARIO_DE_DADOS.xlsx`; `SBI_PLANO_DE_TESTES.xlsx`; `diagramas/` (15 PNG e 15 fontes Mermaid); `evidencias/` (26 arquivos e índice); `reproducao/` (2 scripts e instruções); `correcoes-propostas/` (*patch* e instruções); este checklist.

## 4. Situação em 25/10/2026

Depois da análise, oito *pull requests* foram integrados à `main` e publicados entre 04h29 e 09h37 (horário de Brasília), com todas as verificações da integração contínua aprovadas. O relatório ganhou o Apêndice M, que registra esta situação sem alterar o corpo da auditoria.

| Item | Situação |
| --- | --- |
| *Pull request* nº 50 (identidade visual v2) | Integrado (`a03f6bd`) e publicado; as capturas do relatório são da versão de referência |
| *Pull request* nº 47 (avatares) | Integrado (`687cfc2`) e publicado; as imagens dos avatares respondem 200 |
| *Pull request* nº 51 (créditos dos avatares) | Integrado (`daafee0`) |
| *Pull request* nº 48 (perfil CEO) | Integrado (`e7e5f2c`) e publicado: papel CEO, painel executivo, planejamento de metas |
| *Pull request* nº 52 (desempenho) | Integrado (`af1f10f`) e publicado: BCrypt de custo 10, painéis pausados após 10 min sem uso, cache de inicialização da API corrigido |
| *Pull request* nº 53 (endereços do repositório) | Integrado (`2123f8d`) |
| *Pull request* nº 54 (organização das pastas) | Integrado (`56a1b69`): relatórios brutos fora do Git, saídas de contrato em `target/contrato/`, histórico em `docs/historico/`; caminhos do relatório referem-se à versão de referência |
| A-03, A-04, A-05, A-12, A-16 | Corrigidos pelo *pull request* nº 49 (`b1e22f0`); cabeçalhos de segurança conferidos no ambiente publicado |
| A-08 | Contas dos três docentes criadas com o papel CEO pela migração `V12_1`; acesso conferido pela equipe |
| A-07 | Pasta mantida como “Qualquer pessoa com o link: Editor” por decisão do responsável (risco aceito) |
| A-02, A-17 | Abertos |
| Implantação na Vercel | Falha “Resource provisioning failed” resolvida: um banco Supabase pausado, sem uso pelo SBI, estava conectado ao projeto |
