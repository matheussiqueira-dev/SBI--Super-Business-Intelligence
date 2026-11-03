# Histórico

Documentos de etapas encerradas do projeto, arquivados na organização de pastas de 25/10/2026 (D-EVO-53, em [evolucao.md](../06-decisoes/evolucao.md)). Cada um continua como foi escrito e vale para a data que traz; na mudança de pasta, só os links relativos foram corrigidos.

Cada item guarda aqui o caminho que tinha, sem o prefixo `docs/`. Para abrir um caminho antigo citado no texto (entre crases), use a tabela:

| Antes | Agora | Conteúdo |
| --- | --- | --- |
| `docs/gestao/` | [gestao/](gestao/) | Índice da equipe por card, briefings dos cards do Trello e plano do que faltava (04 a 09/10) |
| `docs/planejamento-loja.md` | [planejamento-loja.md](planejamento-loja.md) | Planejamento da loja, 04/10 |
| `docs/execucao-sessao.md` | [execucao-sessao.md](execucao-sessao.md) | Sessão e acesso (API-01 e UI-01), 04/10 |
| `docs/revisao-equipe.md` | [revisao-equipe.md](revisao-equipe.md) | Pacote de revisão da equipe, 14/10 |
| `docs/decisoes/contract-testing.md` | [decisoes/contract-testing.md](decisoes/contract-testing.md) | Spike de contrato, 03 e 04/10 |
| `reports/gestao/` | [reports/gestao/](reports/gestao/) | Sincronização GitHub e Trello de 04/10 e revisão do Trello de 01/10, com as exportações do quadro |
| `reports/execucoes/` | [reports/execucoes/](reports/execucoes/) | Relatórios das rodadas formais de 03 a 09/10 |
| `reports/contrato/live-v4/` | [reports/contrato/live-v4/](reports/contrato/live-v4/) | Contrato ao vivo do v4, 14/10 |
| `reports/contrato/live-v5/` | [reports/contrato/live-v5/](reports/contrato/live-v5/) | Contrato ao vivo do v5, 14/10 |

O último relatório ao vivo versionado, do contrato v6, continua em `reports/contrato/live-v6/`. Cada nova execução grava em `target/contrato/`, fora do Git.

As saídas brutas que deixaram de ser versionadas na mesma mudança continuam no histórico do Git, por exemplo no commit `311bbe9` (`main` de 25/10/2026): `jacoco/`, `surefire-reports/`, `pmd.xml`, `cpd.xml` e `spotbugsXml.xml` de `reports/metricas/r0-baseline/` e `reports/metricas/r1/`, e a pasta `reports/execucoes/integration-2026-10-04-000623/`, citada em [run-2026-10-03-continuacao.md](reports/execucoes/run-2026-10-03-continuacao.md). Para ler um arquivo, use `git show 311bbe9:<caminho>`; para extrair uma pasta, `git archive 311bbe9 <pasta> | tar -x`.
