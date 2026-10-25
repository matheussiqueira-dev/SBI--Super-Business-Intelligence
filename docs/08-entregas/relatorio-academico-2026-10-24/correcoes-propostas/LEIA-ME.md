# Correções propostas para os achados A-03, A-04, A-05, A-12 e A-16

> **Atualização em 25/10/2026.** O *patch* foi aplicado com `git am` na *branch* `fix/security-and-display-findings` e integrado à `main` pelo *pull request* nº 49 (`b1e22f0`), com todas as verificações da integração contínua aprovadas; os cabeçalhos aparecem no ambiente publicado. No *merge* com a identidade visual v2, `compactMoney` passou a compartilhar o cálculo de escala com `compactNumber`. A-08 foi atendido pelo *pull request* nº 48 (contas criadas por migração, com o papel CEO), e A-07 ficou como “Qualquer pessoa com o link: Editor” por decisão do responsável. Ver o Apêndice M do relatório.

Arquivo: `SBI_correcoes_achados_A03_A04_A05_A12_A16.patch` (5 *commits* em Conventional Commits, gerados com `git format-patch` sobre o *commit* `3b0242c`, atual `main`).

As correções foram preparadas e validadas em uma *branch* local e **não foram enviadas ao repositório**: o escopo da auditoria vedou alterar a aplicação ou o repositório sem decisão da equipe. A aplicação e a abertura do *pull request* ficam com o responsável pelo repositório.

## Conteúdo

| *Commit* | Achado | Alteração | Arquivos |
| --- | --- | --- | --- |
| `fix(deps): upgrade next to 16.4.3` | A-04 | `next` 16.3.8 → 16.4.3 (fora da faixa afetada pelos avisos críticos, até 16.4.0); `package-lock.json` atualizado com npm 11, sem outras mudanças | `frontend/package.json`, `frontend/package-lock.json` |
| `fix(frontend): add security headers to pages` | A-05 | CSP com `frame-ancestors 'none'`, `base-uri`, `form-action` e `object-src`; `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy` em todas as páginas, exceto `/api/backend/*` | `frontend/next.config.mjs`, `frontend/tests/security-headers.test.ts` |
| `fix(frontend): hide goal bar when there is no goal` | A-16 | “Meu desempenho” deixa de desenhar a barra de meta quando o estado é `SEM_META`, como já faz a visão geral | `frontend/app/(app)/meu-desempenho/my-performance.tsx` |
| `fix(frontend): format compact money without Intl compact notation` | A-03 | `compactMoney` calcula escala e sufixo (mil, mi, bi), e o resultado deixa de depender da versão do Node (“R$ 47 mil” em Node 22 e 24) | `frontend/lib/format.ts`, `frontend/tests/brand.test.ts` |
| `fix(config): disable SQL logging by default` | A-12 | `spring.jpa.show-sql=${SPRING_JPA_SHOW_SQL:false}`; produção não muda, pois já usa `false` | `src/main/resources/application.properties`, `docs/deploy.md` |

A CSP não restringe scripts e estilos: o App Router do Next.js injeta *scripts* em linha, e uma política com `script-src` exige *nonce* por requisição, o que fica como complemento da ação EV-09 do capítulo 15.

## Validação realizada (24/10/2026)

- `npm run typecheck`: aprovado.
- `npm test` do frontend: 43/43 aprovados em Node 22.23.4, contra 41/42 antes das correções (evidência `EV-WEB-03`).
- `npm audit --omit=dev`: nenhuma vulnerabilidade nas dependências de produção (evidência `EV-SEC-03`); restam avisos em dependências de desenvolvimento trazidas pelo `orval` (`undici` alto; `fast-uri` e outros três moderados).
- Servidor de desenvolvimento do Next.js 16.4.3: cabeçalhos presentes em `/`, `/entrar`, `/meu-desempenho` e `/icon.svg`, e ausentes em `/api/backend/*` (evidência `EV-WEB-04`).
- `npm ci --dry-run`: *lockfile* coerente.
- O *patch* foi aplicado com `git am` sobre `origin/main` sem conflitos e não toca arquivos do *pull request* aberto nº 47; aplicado também sobre esse *pull request* (`a54635d`), resultou em verificação de tipos aprovada e 54/54 testes do frontend.

Não validado neste ambiente, por depender da integração contínua: *build* de produção (bloqueado pelo acesso às fontes do Google), testes E2E com axe, testes Java e a implantação.

## Como aplicar

```bash
git switch main && git pull
git switch -c fix/security-and-display-findings
git am <pasta>/SBI_correcoes_achados_A03_A04_A05_A12_A16.patch
cd frontend && npm ci && npm run typecheck && npm test && cd ..
git push -u origin fix/security-and-display-findings
gh pr create --base main --title "fix: address audit findings A-03, A-04, A-05, A-12 and A-16" --body "Upgrades next to 16.4.3, adds page security headers, hides the goal bar without a goal, makes compactMoney independent of the Node version and disables SQL logging by default."
```

Depois da implantação, conferir no ambiente publicado:

```bash
curl -sI https://sbi-app-alpha.vercel.app/entrar | grep -i "content-security\|x-frame\|nosniff\|referrer\|permissions"
```

## Fora deste *patch*

| Achado | Motivo | Ação |
| --- | --- | --- |
| A-02 (109 respostas de erro ausentes no OpenAPI publicado) | Exige anotar os controladores Java (`@ApiResponse`) ou um `OpenApiCustomizer` que leia o contrato v5; não foi possível compilar Java 25 neste ambiente | Implementar e comparar também os códigos de erro em `scripts/live-contract.mjs` (ação EV-04) |
| A-08 (contas dos docentes) | Criar contas e senhas é decisão da equipe e exige canal seguro | Gerente cria as três contas pela tela Usuários; senha provisória entregue por canal seguro; troca obrigatória no primeiro acesso (ação EV-02) |
| A-07 (pasta do Drive editável por *link*) | A alteração de permissão cabe ao proprietário da pasta | Proprietário: Compartilhar → Acesso geral → “Restrito” (ou “Qualquer pessoa com o link” com o papel “Leitor”), adicionando a equipe e os docentes por e-mail (ação EV-03) |
| A-17 (bloqueio só por conta) | Mudança de comportamento de autenticação, fora do escopo de correção pontual | Limitar tentativas também por origem (ação EV-12 do capítulo 15) |
