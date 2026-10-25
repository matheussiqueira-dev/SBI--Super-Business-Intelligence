# SBI — Plano de publicação e acabamento (ambiente público)

> Documento de trabalho local, na pasta `C:\Users\mathe\Documents\Programação\A3`. Fica fora dos repositórios Git e nunca é versionado.
> Versão 1, 15/10/2026. Continua o `SBI-PLANO-EVOLUCAO.md` (todos os pacotes concluídos; WP-EVO-6 como trabalho futuro).
> Quem executa é um agente de desenvolvimento no IntelliJ. As seções 0 a 8 são instrução. O agente edita apenas a seção 9 (quadro de status) deste arquivo.

---

## 0. Como usar este documento

### 0.1 Ordem de leitura
1. Este documento inteiro, uma vez.
2. No repositório (`A3\order-management-api`, `main` atualizada): `docs/deploy.md`, `docs/roteiro-demonstracao.md`, `docs/decisoes/evolucao.md`, `docs/bd/pacote-sql/README.md`, `.github/workflows/*.yml`.
3. `A3\SBI-ENSAIO-DEMO.md` (ensaio local) e o fim de `A3\SBI-REGISTRO-EXECUCAO.md`.

### 0.2 Precedência (em conflito, vale a primeira)
1. Regras de higiene da seção 2.4 (nenhuma atribuição a ferramenta, assistente ou automação).
2. Invariantes do `SBI-PLANO-MESTRE.md` (seção 5) e do `SBI-PLANO-EVOLUCAO.md` (seção 2).
3. Contrato v5 e decisões publicadas em `docs/decisoes/*`.
4. Este documento.

### 0.3 Recalcular o estado antes de começar
- `git fetch origin --prune`; `git log --oneline origin/main -20`; `gh pr list --state open`.
- Ambiente publicado: `curl -s -o NUL -w "%{http_code}" https://sbi-api-puk8.onrender.com/auth/csrf` (a primeira chamada pode levar até 3 minutos se o serviço estiver dormindo).
- Se o recalculado divergir da fotografia da seção 1, vale o recalculado. Registre a divergência.

---

## 1. Fotografia em 15/10/2026, 10h30

### 1.1 Ambiente publicado
| Peça | Onde | Situação verificada |
| --- | --- | --- |
| Frontend | Vercel, projeto `sbi-app` (root `frontend`, produção a partir da `main`, região `iad1`) | Publicado em `https://sbi-app-alpha.vercel.app`; `BACKEND_ORIGIN=https://sbi-api-puk8.onrender.com` (production, preview, development) |
| API | Render, serviço `sbi-api` (Docker, Virginia, plano gratuito, deploy automático na `main`) | Live; `/auth/csrf` responde 200 pelo próprio domínio e pelo rewrite `/api/backend/*` da Vercel |
| Banco | Neon, projeto `wispy-glade-88962628`, branch `production` (`br-noisy-cherry-b4jcx62e`), PostgreSQL 18.6, região AWS US East 2 | Flyway até V11 (14 linhas no histórico); 66 clientes (60 da massa Olist), 220 produtos Olist, 286 pedidos; 4 contas ativas da equipe (`@sbi.tech`: Matheus gerente; Gabriel, Allan e Francisco vendedores); metas da loja de 09/2026 a 12/2026 |
| Endereço público | `https://sbi-app-alpha.vercel.app` | **Único endereço oficial** do SBI (decisão do responsável em 15/10). O endereço antigo da demonstração estática foi descartado e não deve aparecer em nenhum arquivo, commit, PR ou configuração |

### 1.2 Repositório
- `main` contém a pilha de evolução, a publicação (`server.port=${PORT:8080}`, `docs/deploy.md`, carga Olist externa), a automação de branches de preview do Neon (`6f1e892`) e o roteiro do site publicado (`108dc54`).
- PRs/branches ainda fora da `main` no momento da fotografia: `docs/roteiro-metas` (passo 6 com as metas publicadas, PR #35), `fix/olist-account-lookup`, `chore/neon-automation`, `docs/roteiro-publicado` (confirme quais já foram integrados por squash; branch listada como "não integrada" após squash é esperado).
- **Violação de higiene na `main`:** commits `bb74e91` e `7c47806` têm a linha `Co-Authored-By` de assistente; `bb74e91` versionou `frontend/AGENTS.md` e `frontend/<instruções do assistente>.md` (arquivos que o `next dev` do Next 16 gera). Tratamento no WP-PUB-1.

### 1.3 Lacunas de demonstração encontradas no banco publicado
- 2 produtos vendidos sem custo médio (`v_posicao_estoque.custo_medio` nulo): Lucro bruto e Margem bruta aparecem "Não informado" no `/gestao`.
- Categorias Olist sem acento: "Relogios presentes", "Bebes", "Cama mesa banho" (e as demais derivadas dos nomes originais).
- Itens visuais apontados na revisão das capturas (ainda não conferidos na `main`): tabela "Produtos mais vendidos" sem limite no `/gestao`; rodapé do painel do `/entrar` quebrando a linha no meio.

---

## 2. Regras de trabalho

### 2.1 Modo
- Execução contínua, sem perguntas. Ambiguidade: opção mais restritiva em segurança, menor mudança, coerência com o contrato v5. Registre como `D-PUB-nn` em `docs/decisoes/evolucao.md` (seção nova "Publicação") e no registro.
- Não invente resultados. Todo "passou" tem comando executado e saída real resumida no registro.

### 2.2 Autorizado neste plano
| Ação | Condição |
| --- | --- |
| Criar branches, commits, push e PRs com base `main` | Um PR por pacote; CI verde antes de pedir revisão |
| Escrever no banco publicado (Neon `production`) | Somente pelas rotas da API com conta de gerente, ou pelos scripts versionados do pacote (`07_carga_olist.sql`, scripts deste plano). Antes de qualquer escrita, crie um snapshot/branch de segurança do Neon (seção 2.5) |
| Disparar deploy no Render e na Vercel | Somente depois de PR integrado ou para aplicar variável já definida pelo responsável |

### 2.3 Proibido (registre em "Aprovações pendentes" e siga)
- Merge, squash, `push --force`, rebase ou amend de commit já enviado, reescrita de histórico, apagar branch remota.
- Alterar segredos ou variáveis de ambiente no Render, na Vercel, no Neon ou no GitHub (senhas, `SBI_DEMO_PASSWORD`, `SPRING_DATASOURCE_*`, chaves de API). Variável nova sem segredo (ex.: URL pública) pode ser proposta no PR e aplicada pelo responsável.
- Resetar, apagar ou restaurar a branch `production` do Neon; `DROP`, `TRUNCATE` ou `DELETE` amplo no banco publicado fora dos scripts idempotentes já versionados.
- Exibir senha, token ou string de conexão completa em log, commit, PR, registro ou terminal compartilhado. Use variáveis de ambiente lidas de arquivo fora do repositório (`A3\tmp\*.env`, nunca versionado).
- Mudar a senha das contas de demonstração ou desativar a conta do Matheus.

### 2.4 Higiene (vale para tudo)
- Commits em Conventional Commits, inglês, uma linha, **sem corpo e sem rodapé**, sem `Co-Authored-By`, sem link de sessão, sem crédito automático.
- Nenhuma referência a assistentes, automação ou ferramenta externa em código, docs, commits, PRs, nomes de arquivo ou mensagens de terminal.
- Antes de cada commit: `git diff --staged` revisado; hook `pre-commit` com `scan_ai.py` ativo (nunca `--no-verify`).
- Antes de cada PR: varrer o corpo do PR e as mensagens de todos os commits da branch (`git log origin/main..HEAD --format=%B`) com a mesma expressão do `scan_ai.py`; resultado vazio.

### 2.5 Segurança do banco publicado
Antes de qualquer pacote que escreva no Neon:
1. Crie um snapshot ou uma branch de segurança `backup-AAAAMMDD-HHMM` a partir de `production` (console do Neon, CLI `neon` ou API com a chave do responsável lida de variável de ambiente).
2. Registre o nome no registro.
3. Faça a escrita. Se algo der errado, **não restaure sozinho**: registre e peça ao responsável (restauração sobrescreve dados).

### 2.6 Registro
`A3\SBI-REGISTRO-EXECUCAO.md`, seção nova "Publicação — <data>", com linha do tempo, decisões `D-PUB-nn`, ocorrências `O-PUB-nn`, testes reais, aprovações pendentes e próxima ação. Atualize depois de cada passo.

---

## 3. WP-PUB-1 — Higiene de atribuição na `main`

**Branch:** `chore/remove-agent-files` a partir da `main`.

1. Remova do repositório `frontend/AGENTS.md` e `frontend/<instruções do assistente>.md` com `git rm --cached` e apague os arquivos locais.
2. Acrescente ao `frontend/.gitignore` (crie se não existir) e ao `.gitignore` da raiz:
   ```
   AGENTS.md
   <instruções do assistente>.md
   ```
   Confirme que o `next dev` volta a gerá-los localmente e que o `git status` continua limpo.
3. **Barreira nas mensagens de commit (CI):** no workflow de CI, um passo no job mais leve (ou um job `hygiene` novo) que, em `pull_request`, roda:
   ```bash
   git log --format=%B "origin/${GITHUB_BASE_REF}..HEAD" > "$RUNNER_TEMP/msgs.txt"
   node scripts/check-commit-messages.mjs "$RUNNER_TEMP/msgs.txt"   # ver item 4
   ```
   (o checkout precisa de `fetch-depth: 0` para o intervalo existir)
   e falha se encontrar os termos proibidos de `scripts/check-commit-messages.mjs` ou linha de sessão.
4. Versione o verificador como `scripts/check-commit-messages.mjs` (Node, sem dependência nova), com teste Node em `scripts/*.test.mjs` cobrindo: mensagem limpa passa; cada termo proibido falha; corpo vazio passa. O `scan_ai.py` local continua fora do repositório.
5. Ligue também um hook local `commit-msg` (não versionado, mesmo padrão do `pre-commit`) que chama o mesmo verificador.
6. **Histórico (não executar):** registre em "Aprovações pendentes" que `bb74e91` e `7c47806` mantêm a linha de coautoria no histórico da `main`. Só some com reescrita (`git rebase -i` + `push --force` na `main`), que exige decisão da equipe e sincronização de todos os clones. Deixe o procedimento escrito no registro, sem executar.
7. Testes: `npm test` na raiz (verificador), CI verde, e um commit de prova numa branch descartável local (não enviada) mostrando o hook `commit-msg` bloqueando.

**Pronto quando:** arquivos fora do repositório e ignorados; CI rejeita mensagens com atribuição; PR aberto com CI verde.

---

## 4. WP-PUB-2 — Acabamento da demonstração (código + seed + banco publicado)

**Branch:** `fix/demo-polish` a partir da `main`.

### 4.1 Custo dos produtos sem custo
1. Identifique os produtos vendidos sem custo:
   ```sql
   SELECT sku, produto FROM v_posicao_estoque WHERE custo_medio IS NULL;
   ```
2. **Seed (repositório):** na massa demo (`src/main/resources/db/demo/`), acrescente entrada de estoque com custo para esses produtos **numa migração demo nova** (próxima versão livre na localização `db/demo`, ex.: `V11_1__demo_costs.sql`); nunca edite `V6_2`. Use custo plausível (55% a 70% do preço) e registre a escolha como `D-PUB`.
3. Preserve o teste de regra "lucro nulo quando falta custo" com um produto criado dentro do próprio teste. Atualize números esperados dos testes BD/integração e do `docs/relatorio-final.md` se mudarem, explicando a mudança.
4. **Banco publicado:** a migração demo nova roda sozinha no próximo deploy do Render (perfil `demo`). Depois do deploy, confirme que a consulta do item 1 retorna zero linhas e que `/gestao` mostra Lucro bruto e Margem bruta.

### 4.2 Nomes com acento na massa Olist
1. Em `docs/bd/pacote-sql/07_carga_olist.sql`, crie uma tabela de mapeamento (CTE ou tabela temporária `stg_olist.categoria_pt`) com o nome original → nome em português correto (ex.: `relogios_presentes` → "Relógios e presentes", `bebes` → "Bebês", `cama_mesa_banho` → "Cama, mesa e banho", `informatica_acessorios` → "Informática e acessórios", `utilidades_domesticas` → "Utilidades domésticas", `esporte_lazer` → "Esporte e lazer", `beleza_saude` → "Beleza e saúde", `moveis_decoracao` → "Móveis e decoração"…). Cubra as 37 categorias do recorte; categoria sem mapeamento faz a carga falhar (não grave nome sem acento).
2. O nome do produto segue o da categoria: `"<categoria em português> <código>"`.
3. A carga continua idempotente (apaga e regrava só a massa Olist).
4. **Banco publicado:** depois do PR integrado, rode a carga contra o Neon com o script já versionado (`scripts\demo-olist.ps1 -DatabaseUrl`), com a URL lida de variável de ambiente (`$env:SBI_NEON_URL`, definida a partir de `A3\tmp\neon.env`, fora do repositório; host **sem** `-pooler`). Faça o snapshot da seção 2.5 antes.
   - Atenção: a recarga apaga e recria pedidos da massa Olist. Pedidos feitos pela equipe no site publicado com clientes Olist seriam perdidos; verifique antes com `SELECT count(*) FROM orders o JOIN customer c ON c.id=o.customer_id WHERE c.email LIKE '%@example.com' AND o.created_at > now() - interval '7 days';` e registre o número. Se houver pedidos recentes da equipe, pare e registre como aprovação pendente.
5. Confirme com `09` (CT-DEMO-01 a 04) contra o Neon e com a consulta `SELECT name FROM category WHERE name ~ '(Relogios|Bebes|Cama mesa)';` vazia.

### 4.3 Ajustes visuais
1. `/gestao`: "Produtos mais vendidos" mostra os 10 primeiros, com o link "Ver todos" para `/gestao/analises`. Teste E2E novo.
2. `/entrar`: rodapé do painel escuro sem quebra no meio — "Ambiente de demonstração · dados fictícios" numa linha e "Projeto A3 · UNIFG 2026" na outra, em 1280 px e 390 px.
3. Refaça as capturas de `reports/marca/` (gerente e vendedor, desktop e celular) e confira axe 0.

**Testes do pacote:** integração Java completa, `npm test` raiz e frontend, `test-contract.ps1 -HttpOnly -Frontend`, job `bd` (com a etapa Olist), capturas.
**Pronto quando:** PR com CI verde; depois do merge e do deploy, `/gestao` publicado mostra lucro e margem, categorias com acento e no máximo 10 produtos na tabela.

---

## 5. WP-PUB-3 — Verificação automática do ambiente publicado

**Branch:** `ci/published-smoke` a partir da `main`.

1. Workflow novo `.github/workflows/published-smoke.yml`, só com `workflow_dispatch` (manual) e com entrada opcional `base_url` (padrão `https://sbi-app-alpha.vercel.app`).
2. Etapas:
   - aquecer a API: até 6 tentativas de `GET <base_url>/api/backend/auth/csrf` com 30 s de intervalo, aceitando 200;
   - Playwright num projeto separado (`frontend/e2e/published/*.spec.ts`, fora da suíte normal) com `baseURL` vindo da entrada:
     1. login do gerente (`matheussiqueira@sbi.tech`) e do vendedor (`allanbarros@sbi.tech`) com a senha do segredo do GitHub `SBI_DEMO_PASSWORD` (já existe para o job `bd`; não crie segredo novo);
     2. menu certo para cada papel; `/gestao` com os 4 indicadores e o cartão de meta do mês corrente;
     3. perfil de um cliente Olist recorrente com histórico e documento mascarado para o vendedor;
     4. axe WCAG 2.2 AA sem violações em `/entrar`, `/gestao` e `/vender`;
     5. **somente leitura:** nenhuma venda, pagamento ou cadastro é criado no banco publicado.
   - artefatos: relatório HTML do Playwright e capturas.
3. Documente em `docs/deploy.md` como disparar (`gh workflow run published-smoke.yml`).
4. Rode uma vez depois do merge e registre o run.

**Pronto quando:** run manual verde contra o site publicado, sem escrita no banco.

---

## 6. WP-PUB-4 — Documentação do ambiente publicado

**Branch:** `docs/published-environment` a partir da `main` (pode ir junto com o WP-PUB-3 se ficar pequeno).

1. `docs/deploy.md`: endereços reais (`https://sbi-app-alpha.vercel.app` como único endereço do site e `https://sbi-api-puk8.onrender.com` da API), projeto Neon (`wispy-glade-88962628`, branch `production`), região de cada peça, variáveis **sem valores**, como rodar a carga Olist externa, como aquecer, como disparar o smoke.
2. `README.md`: seção curta "Ambiente publicado" com o link do site e o aviso de dados fictícios; sem senha.
3. `docs/relatorio-final.md`: seção "Ambiente de demonstração publicado" com arquitetura (Vercel → rewrite → Render → Neon), sessão HttpOnly preservada pela mesma origem, limitações do plano gratuito (API dorme após 15 min; 1 a 3 min para acordar) e evidência (run do smoke).
4. `docs/roteiro-demonstracao.md`: confirme que o passo de aquecimento (5 minutos antes) e o passo 6 (metas publicadas de outubro a dezembro de 2026) estão coerentes com o banco publicado. Integre ou feche o PR #35 conforme o estado real.
5. `docs/arquitetura.md`: diagrama Mermaid do ambiente publicado.

6. Endereço único: o site do SBI é só `https://sbi-app-alpha.vercel.app`. Acrescente ao verificador de termos do WP-PUB-1 (CI) a proibição do domínio antigo `o endereço antigo`, para que ele nunca volte ao repositório.

**Pronto quando:** PR com CI verde e varredura de termos vazia.

---

## 7. Ações do responsável (o agente não executa; só confere e registra)

| # | Ação | Onde | Conferência pelo agente |
| --- | --- | --- | --- |
| R-1 | Remover do projeto Vercel `sbi-app` o domínio antigo da demonstração estática, deixando só `sbi-app-alpha.vercel.app`, e trocar o campo Website do repositório no GitHub para `https://sbi-app-alpha.vercel.app` | Vercel → `sbi-app` → Settings → Domains; GitHub → About (engrenagem) → Website | `git grep -n "o endereço antigo"` vazio em todas as branches; site do GitHub aponta para o SBI |
| R-2 | Health Check Path `/auth/csrf` | Render → `sbi-api` → Settings | Deploy seguinte fica `live` com health check verde |
| R-3 | Proteger a branch `production` | Neon → Settings → Protect this branch | — |
| R-4 | Decidir sobre a reescrita do histórico (`bb74e91`, `7c47806`) | Equipe | Se aprovada, a própria equipe executa; o agente só atualiza o registro |
| R-5 | Integrar os PRs na ordem: WP-PUB-1 → WP-PUB-2 → WP-PUB-3 → WP-PUB-4 (e o #35, se ainda aberto) | GitHub | CI verde na `main` após cada squash; deploy automático do Render e da Vercel concluído |
| R-6 | Aquecer o ambiente 5 minutos antes de cada ensaio e da apresentação | Navegador ou workflow do smoke | — |

---

## 8. Comandos de referência (Windows, a partir de `A3\order-management-api`)

```powershell
git fetch origin --prune; git switch main; git pull --ff-only
.\mvnw.cmd -q verify
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test.ps1 -Mode Integration
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-contract.ps1 -HttpOnly -Frontend
npm test; cd frontend; npm test; npm run build; npx playwright test; cd ..

# carga Olist no Neon (URL só em variável, carregada de arquivo fora do repositório)
Get-Content ..\tmp\neon.env | ForEach-Object { $k,$v = $_ -split '=',2; Set-Item "env:$k" $v }
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\demo-olist.ps1 -DatabaseUrl $env:SBI_NEON_URL

gh pr create --base main --title "<conventional commit>" --body-file <arquivo>
gh run list --branch <branch> --limit 3; gh run watch <id> --exit-status
gh workflow run published-smoke.yml
```

Formato do `..\tmp\neon.env` (criado pelo responsável, nunca versionado, nunca exibido):
```
SBI_NEON_URL=postgresql://<usuario>:<senha>@<host-do-neon>/neondb?sslmode=require
```

---

## 9. Quadro de status (o agente atualiza)
Legenda: [x] pronto com teste verde · [~] parcial · [ ] não iniciado · [!] bloqueado (ver registro).

| Pacote | Situação | Branch / commit | PR | Observação |
| --- | --- | --- | --- | --- |
| WP-PUB-1 Higiene de atribuição | [x] | `chore/remove-agent-files` / 922f54f, d7d8cbe | #36 | arquivos gerados fora e ignorados; job `hygiene` + `scripts/check-commit-messages.mjs` (7 testes) reprova atribuição e o domínio antigo do site nas mensagens e, com `--tracked`, nos arquivos versionados (D-PUB-11); hook `commit-msg` local provado; CI toda verde; reescrita do histórico em aprovação pendente (R-4); D-PUB-01 a 03 |
| WP-PUB-2 Acabamento da demonstração | [~] | `fix/demo-polish` / e597ea0, 311f1ba | #37 | código pronto e verde: V11_2 (custo sem mudar saldos, D-PUB-04), categorias com acento (D-PUB-05), 10 produtos + "Ver todos" e rodapé (D-PUB-06/07); integração 653/0, Playwright 26/26, bd local 61/0 + Olist 11/0, capturas axe 0; jobs de código verdes, "Create Neon branch" falha pelo limite de branches (O-PUB-06). Parte no Neon depende do merge (backup, V11_2 pelo deploy, recarga Olist) |
| WP-PUB-3 Smoke do ambiente publicado | [~] | `ci/published-smoke` / 0983df5 | #38 | smoke 5/5 contra o site publicado pela máquina local, sem escrita; workflow manual pronto; run no GitHub depende do merge e dos segredos `SBI_SMOKE_*` (D-PUB-08); jobs de código verdes, "Create Neon branch" falha pelo limite |
| WP-PUB-4 Documentação do ambiente publicado | [x] | `docs/published-environment` / c210b89 | #39 | endereço oficial único `sbi-app-alpha.vercel.app` (D-PUB-09); deploy, README, relatório, arquitetura (Mermaid), revisão; #35 aberto para a equipe (D-PUB-10); varredura vazia; jobs de código verdes |
| R-1 a R-6 (responsável) | [~] | — | — | R-1: `git grep` vazio em todas as branches e `sbi-app` só com `sbi-app-alpha.vercel.app`; falta trocar o campo Website do GitHub (ainda no domínio antigo). R-2 já atendido (`healthCheckPath=/auth/csrf`). R-3, R-4, R-5 pendentes (ver "Aprovações pendentes" no registro); R-6 a cada ensaio |
