# SBI — Plano de fechamento (pós-integração)

> Documento de trabalho local, na pasta `C:\Users\mathe\Documents\Programação\A3`. Fica fora dos repositórios Git e nunca é versionado.
> Versão 1, 14/10/2026, 08h45. Continua o `SBI-PLANO-MESTRE.md`, cujos pacotes de trabalho estão todos concluídos.
> Quem executa é um agente de desenvolvimento no IntelliJ. As seções 0 a 6 são instrução. O agente edita apenas a seção 7 (quadro de status) deste arquivo.

---

## 0. Contexto e autorização

### 0.1 Estado verificado em 14/10, 08h45
- `main` em `d34570b`, com o produto completo:
  - migrações V1 a V7 e seed demo V6_1/V6_2;
  - 45 de 45 operações do contrato v4 com `implemented`; `SignedMoney` já usado onde o valor pode ser negativo;
  - frontend em TypeScript;
  - CI com quatro jobs;
  - demonstração em um comando (`docker-compose.demo.yml`);
  - `docs/arquitetura.md`, `docs/roteiro-demonstracao.md`, `docs/relatorio-final.md` e `docs/rastreabilidade.md`.
- CI da `main`: run 38558059579 verde nos jobs backend, banco, contrato e frontend.
- `./mvnw.cmd -q clean verify`: 233 testes, 0 falhas. `npm test`: 36/36 na raiz e 20/20 no frontend.
- PR #19 (`docs/registro-integracao`) aberto, com o registro da integração.

### 0.2 O que o responsável autoriza neste plano (vale só para os itens listados)
| Ação | Autorizada | Condição |
| --- | --- | --- |
| Squash merge do PR #19 e dos PRs que este plano criar | Sim | CI verde; título em Conventional Commits; sem corpo |
| Apagar branches remotas e locais da seção 3 | Sim | Somente as listadas, depois de remover as worktrees que as usam |
| Recriar o banco de desenvolvimento `postgres-order` | Sim | Somente depois de um `pg_dump` verificado (seção 4) |
| `push --force`, reescrever histórico, alterar configurações ou segredos do repositório | Não | Nunca |
| Apagar `a3-contract-validation` ou `conformidade-main` | Não | Ficam para decisão da equipe |

### 0.3 Modo de trabalho
- Não faça perguntas e não pare por dúvida. Escolha a opção mais segura e reversível, registre e siga.
- Fora da tabela 0.2, nenhuma ação irreversível. Se uma for necessária, vai para "Aprovações pendentes" no registro.
- Não invente resultados. Todo "passou" tem comando executado e saída real resumida.
- **Registro:** `A3\SBI-REGISTRO-EXECUCAO.md`. Abra uma seção nova chamada "Fechamento — 14/10" com linha do tempo, decisões `D-FECH-nn`, ocorrências, testes, aprovações pendentes e próxima ação. Atualize depois de cada passo.
- **Commits:**
  - Conventional Commits, em inglês, uma linha, sem corpo nem rodapé, sem trailers de coautoria;
  - o hook `pre-commit` com `scan_ai.py` precisa estar ativo e bloquear; confirme no passo 1.1;
  - nenhuma referência a assistentes, automação ou ferramenta externa em código, docs, commits, PRs ou mensagens de terminal.

---

## 1. Integração pendente e proteção

**1.1 Confirmar a proteção de commit**
1. Verifique que `.git/hooks/pre-commit` existe na worktree principal (`A3\order-management-api`) e chama `..\tmp\scan_ai.py` sobre os arquivos em stage.
2. Prove o bloqueio: crie um arquivo temporário com um termo proibido, tente o commit e confirme que foi bloqueado.
3. Remova o arquivo e registre o resultado.
4. Se o hook não existir, recrie-o com o mesmo comportamento: sai com código diferente de 0 quando encontra algo; varre `git diff --cached --name-only`; cobre `.java .md .sql .properties .yml .yaml .json .mjs .cjs .js .jsx .ts .tsx .css .html .xml .txt .ps1`.

**1.2 Integrar o PR #19**
1. Confirme CI verde e mergeable.
2. Rode `gh pr merge 19 --squash --subject "docs: record the integration of the ERP/PDV stack" --body ""`.
3. Rode `git fetch origin` e confirme que o commit está na `main`.

---

## 2. Higiene do repositório (um PR: `chore/sanitize-reports`, base `main`)

**2.1 Caminhos locais em relatórios versionados**
Hoje 10 arquivos na `main` contêm `C:\Users\mathe\...`:

| Arquivo |
| --- |
| `reports/execucoes/integration-2026-10-04-000623/TEST-com.swee.ordermanagementspring.OrderManagementSpringApplicationTests.xml` |
| `reports/metricas/r0-baseline/cpd.xml` |
| `reports/metricas/r0-baseline/pmd.xml` |
| `reports/metricas/r0-baseline/spotbugsXml.xml` |
| `reports/metricas/r0-baseline/surefire-reports/TEST-com.swee.ordermanagementspring.OrderManagementSpringApplicationTests.xml` |
| `reports/metricas/r1/cpd.xml` |
| `reports/metricas/r1/pmd.xml` |
| `reports/metricas/r1/spotbugsXml.xml` |
| `reports/metricas/r1/surefire-reports/TEST-com.swee.ordermanagementspring.api.backoffice.BackofficeApiTest.xml` |
| `reports/metricas/r1/surefire-reports/TEST-com.swee.ordermanagementspring.security.LoginLockoutIntegrationTest.xml` |

1. Troque o caminho do repositório (`C:\Users\mathe\Documents\Programação\A3\order-management-api`, com qualquer separador ou escape) por `<repo>`. Troque qualquer outro caminho do perfil de usuário (`C:\Users\mathe\...`) por `<home>\...`.
2. Remova as linhas de PATH e de variáveis de ambiente que os relatórios do Surefire gravam (propriedades `java.library.path`, `PATH`, `user.dir`, `user.home` e semelhantes), mantendo o XML válido.
3. Não altere números, contagens nem resultados.
4. Corrija a causa:
   - em `scripts/quality-metrics.mjs`, normalize os caminhos ao copiar os relatórios;
   - no `pom.xml` ou no script de coleta, impeça que o Surefire grave propriedades de sistema nos XMLs publicados em `reports/`, ou filtre-as na cópia.
5. Prova: `git grep -nI -e "C:\\Users" -e "AppData" -e "PATH=" -e "user.home"` sem resultado em `reports/` e `docs/`; o XML continua válido (parse com Node ou Python); `node scripts/quality-metrics.mjs` gera relatórios já normalizados.

**2.2 Exports do Trello e citações antigas**
| Arquivo | Ação |
| --- | --- |
| `reports/gestao/historico/revisao-2026-10-01/antes.json`, `depois.json` e outros exports do Trello em `reports/gestao/` que contenham nome de ferramenta | Substituir o nome da ferramenta por "ferramenta externa", mantendo o JSON válido e o restante intacto |
| Manual da disciplina (`docs/referencias/Manual-Projeto-A3.*`) | Manter: o texto é do professor. Registrar como exceção em `docs/decisoes/integracao-fase0.md` |
| Citação do prefixo de commit antigo em relatório ou decisão (C6) | Manter: é registro histórico. Registrar como exceção no mesmo documento |

**Prova:** rode o `scan_ai.py` sobre todo o repositório (todos os arquivos rastreados). Sobram só as exceções registradas.

**2.3 PR e merge**
1. Abra o PR `chore: sanitize local paths and tool names in versioned reports`.
2. Com CI verde, faça o squash merge (autorizado).

---

## 3. Limpeza de branches e worktrees

**3.1 Remover as worktrees locais** (a partir de `A3\order-management-api`)
1. Rode `git worktree list`.
2. Para cada worktree em `fix-01`, `fix-02`, `fix-03`, `chore-19`, `docs-rubrica`, `dom-02`, `erp-modelagem` e `baseline`, confirme `git -C <pasta> status --porcelain` vazio.
3. Com o status vazio, rode `git worktree remove <pasta>`.
4. Se houver alteração não commitada, não remova: registre como aprovação pendente.
5. Mantenha a worktree `noite` até o fim da seção 5, porque ela pode ser útil para a verificação.

**3.2 Apagar branches remotas** (`git push origin --delete <branch>`)
- Integradas nesta rodada: `feat/db-v5-v6`, `feat/security-error-contract`, `feat/business-endpoints`, `feat/web-sbi`, `ci/full-pipeline`, `docs/final-delivery`, `docs/registro-integracao` (depois do #19), `chore/sanitize-reports` (depois do merge).
- Integradas antes: `fix/FIX-01-pagamentos`, `fix/FIX-02-status-exclusao`, `fix/FIX-03-pagamento-dinheiro`, `chore/19-credenciais-env`, `docs/artefatos-rubrica`, `docs/erp-pdv-modelagem`, `docs/plano-restante`.
- Fechada sem merge: `feat/DOM-02-bigdecimal` (substituída pelo #10).
- **Não apagar:** `main`, `a3-contract-validation`, `conformidade-main`.

Antes de cada exclusão, confirme que o PR correspondente está `merged`, ou `closed` no caso do #9, com:

```
gh api repos/matheussiqueira-dev/Conformidade-de-Contrato-da-API-REST/pulls?state=all
```

**3.3 Apagar as branches locais correspondentes**
Use `git branch -d`, que só apaga o que já está integrado. Se o `-d` recusar, use `-D` só para as branches da seção 3.2: elas foram integradas por squash, e por isso o Git não as reconhece como integradas.

**3.4 Limite conhecido**
Apagar `ci/full-pipeline` tira o commit `c5694db` da lista de branches, mas o GitHub mantém a referência do PR (`refs/pull/<n>/head`). Remover de vez exige pedido ao suporte do GitHub. O conteúdo é um PATH sem segredo, então registre e não faça mais nada.

---

## 4. Banco de desenvolvimento `postgres-order`

1. **Situação:** rode `docker ps -a --filter name=postgres-order`. Se o contêiner não existir, registre e pule para o passo 6.
2. **Backup:**
   - suba o contêiner, se estiver parado;
   - rode `docker exec postgres-order pg_dump -U postgres -d order_management -Fc -f /tmp/order_management.dump`;
   - copie com `docker cp` para `A3\tmp\backup\order_management-<data>.dump`;
   - confirme tamanho maior que zero e `pg_restore --list` sem erro.
3. **Recriar:** só com o backup verificado, rode `docker rm -f postgres-order` e suba de novo pelo `docker-compose.yml` do repositório, com a senha via variável de ambiente, conforme o README.
4. **Migrar:** suba a API no perfil de desenvolvimento descrito no README. O Flyway aplica V1 a V7 e o Hibernate valida.
5. **Prova:**
   - `flyway_schema_history` com 7 versões e sucesso;
   - a aplicação sobe sem erro de validação;
   - `GET /auth/csrf` responde 200.
6. Registre o caminho do backup no registro.

---

## 5. Verificação funcional da demonstração (prepara o ensaio humano)

1. **Subir:** siga o README com `docker compose -f docker-compose.demo.yml -p sbi-demo up --build -d`, com `SBI_DEMO_PASSWORD` e `SBI_DB_PASSWORD` gerados na sessão. Nunca grave essas senhas em arquivo versionado.
2. **Executar `docs/roteiro-demonstracao.md` passo a passo com Playwright** contra `http://localhost:3000`:
   - vendedor: login, venda Pix por SKU, tentativa de abrir `/gestao` e venda de colega;
   - gerente: estoque baixado, faturamento atualizado, preço com motivo, promoção, ajuste de estoque;
   - contrato ao vivo sem divergência; job `bd` com 51 PASS.

   Para cada passo, registre "ok" ou a falha com evidência.
3. **Capturas de tela** de todas as telas nos dois papéis, em 1440 px e em 390 px, salvas em `A3\output\demo-<data>\`, fora do repositório.
4. **Acessibilidade:** rode axe em todas as rotas para os dois papéis. Zero violações WCAG 2.2 AA é o critério.
5. **Correções:** cada falha encontrada é corrigida em branch `fix/demo-<assunto>`, com teste que reproduz a falha. PR, CI verde e squash merge (autorizado).
6. **Encerrar:** `docker compose -p sbi-demo down -v`.
7. **Checklist humano:** gere `A3\SBI-ENSAIO-DEMO.md`, fora do repositório, com:
   - o roteiro de 10 minutos em passos curtos;
   - o que falar em cada tela;
   - as contas e onde fica a senha;
   - os riscos ao vivo e o plano B (vídeo ou capturas);
   - a lista das capturas.

---

## 6. Metas de qualidade e pacote de revisão da equipe (um PR: `docs/quality-goals-review`)

**6.1 Metas propostas** (`docs/decisoes/metas-qualidade.md`, estado "Proposta, aguardando aprovação da equipe")
- **Base:** números reais de R0 (`reports/metricas/r0-baseline/`) e R1 (`reports/metricas/r1/`) em cobertura JaCoCo, PMD, CPD e SpotBugs.
- **Proposta por métrica:**
  - cobertura: piso = R1 arredondado para baixo;
  - PMD e SpotBugs: nenhuma violação nova de prioridade alta;
  - CPD: duplicação não aumenta.
- Cada meta tem uma linha de justificativa e a regra de CI que a aplicaria, sem ainda ativar a regra.

**6.2 Pacote de revisão** (`docs/revisao-equipe.md`), para Gabriel, Allan e Francisco:
- o que mudou desde 13/10, por módulo, com links para os PRs #13 a #19;
- como rodar a demo e os testes;
- o que cada um revisa: banco e SQL (Matheus/Gabriel), segurança (Allan), endpoints e contrato (Gabriel/Francisco), frontend (Francisco/Matheus);
- uma checklist de aceite por área;
- as decisões que ainda precisam de voto da equipe: metas de qualidade, teto de desconto DEC-01, HALF_UP × HALF_EVEN, `a3-contract-validation`.

**6.3 PR e merge**
1. Abra o PR `docs: propose quality goals and the team review package`.
2. Com CI verde, faça o squash merge.

---

## 7. Quadro de status (o agente atualiza)
Legenda: [x] pronto com evidência · [~] parcial · [ ] não iniciado · [!] bloqueado (ver registro).

| Item | Situação | Evidência (commit, PR, comando) |
| --- | --- | --- |
| 1.1 Hook pre-commit provado | [x] | hook em order-management-api/.git/hooks/pre-commit chama ../tmp/scan_ai.py (stage); sonda bloqueada: commit exit 1, HEAD 079940c inalterado |
| 1.2 Merge do #19 | [x] | squash a7f56f7 na main |
| 2 Higiene dos relatórios | Feito | PR #20 → cd70e64; grep de caminhos 0; varredura só com as 4 exceções registradas; quality-metrics normaliza na cópia |
| 3.1 Worktrees removidas | Feito | 8 worktrees removidas com status vazio; noite mantida até a seção 5 |
| 3.2/3.3 Branches apagadas | Feito (exceto chore/sanitize-reports local, após a seção 5) | 16 remotas apagadas (restam main, a3-contract-validation, conformidade-main); 15 locais com -D; refs/pull/17 mantém c5694db (limite registrado) |
| 4 postgres-order recriado | Não aplicável | contêiner postgres-order inexistente (docker ps -a); sem backup; passo 6 registrado |
| 5 Demo verificada e ensaio preparado | [x] (merge do #21 pendente: negado pela política local) | roteiro com Playwright 30/30; axe 0 violações em 18 telas; 52 capturas em A3\output\demo-2026-10-14; contrato ao vivo 45/45 sem divergência; bd 51 PASS (run 38560409810); falha do roteiro corrigida em fde10c1, PR #21 verde; SBI-ENSAIO-DEMO.md; stack derrubada |
| 6 Metas e pacote de revisão | [~] PR aberto, merge negado pela política local | 3554ccf, PR #22 (docs/decisoes/metas-qualidade.md, docs/revisao-equipe.md) |

---

## 8. Encerramento
1. Confirme a CI da `main` verde depois do último merge.
2. Rode `./mvnw.cmd -q clean verify` e `npm test` (raiz e frontend) na `main` atualizada.
3. Atualize a seção 7, o registro e a seção 9 do `A3\SBI-EXECUCAO.md`.
4. Termine com um resumo:
   - o que foi feito, com commits e PRs;
   - o resultado real dos testes e da CI;
   - o caminho do backup;
   - as falhas encontradas na demo e como foram corrigidas;
   - as aprovações pendentes;
   - o que só uma pessoa pode fazer: ensaiar a demo, a revisão da equipe e o voto das decisões.
