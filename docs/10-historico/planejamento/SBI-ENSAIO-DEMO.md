# SBI — Ensaio da demonstração (10 minutos)

> Documento local, fora do repositório. Preparado em 14/10/2026 a partir da verificação do roteiro (`docs/roteiro-demonstracao.md`) contra a stack `sbi-demo`: 30 de 30 passos ok, 18 telas auditadas com axe (WCAG 2.2 AA), 0 violações.

## 1. Antes de começar (15 minutos antes)

1. Docker Desktop aberto e com o motor rodando (`docker info`).
2. No PowerShell, na raiz de `order-management-api`:
   ```powershell
   $env:SBI_DEMO_PASSWORD = '<senha das contas demo, 8 a 72 caracteres>'
   $env:SBI_DB_PASSWORD = [guid]::NewGuid().ToString('N')
   docker compose -f docker-compose.demo.yml -p sbi-demo up --build -d --wait
   ```
   O primeiro build leva alguns minutos. O banco fica em memória: cada subida começa do seed.
3. Abra duas janelas em <http://localhost:3000>: uma normal (vendedora) e uma anônima (gerente).
4. Deixe um terminal aberto na raiz do repositório e a página de Actions do GitHub em outra aba.
5. Rode o passo 7 (contrato ao vivo) uma vez antes, para garantir que o JDK 25 e o Docker respondem.

## 2. Contas e senha

| Conta | Papel |
| --- | --- |
| `allanbarros@sbi.tech` | Vendedora (usada no roteiro) |
| `franciscoferreira@sbi.tech`, `gabrielsousa@sbi.tech` | Vendedores |
| `matheussiqueira@sbi.tech` | Gerente |

A senha é a que você colocar em `SBI_DEMO_PASSWORD` no momento de subir a stack. Ela não fica em arquivo nenhum: combine com quem apresenta e digite na hora. Não use a mesma senha de nenhuma conta real.

## 3. Roteiro em passos curtos

| Min. | Tela | Faça | Fale |
| --- | --- | --- | --- |
| 0:00 | `/entrar` (janela normal) | Entre como `allanbarros@sbi.tech`. | "O menu vem das áreas que o servidor libera para a sessão. O cookie é HttpOnly; o JavaScript não lê a sessão." |
| 0:40 | Menu | Mostre: Vender, Vendas, Clientes, Meu desempenho. | "Vendedora não vê Gestão, Estoque, Produtos." |
| 1:00 | `/vender` | Tecle `/`, digite `CG-20W`, Enter, clique em `+`. Total: R$ 360,00. | "Preço, promoção e total vêm do servidor. Aqui entrou a promoção de 10% em acessórios." |
| 1:40 | Cliente e pagamento | Continuar → CPF `10000000108` (Marina Costa) → Pix → Retirada → Finalizar venda. | "O CPF aparece mascarado para a vendedora. Um duplo clique não cria dois pedidos (Idempotency-Key)." |
| 2:30 | Confirmação | Confirmar pagamento recebido. | "A venda reservou o estoque; o pagamento deu a baixa." |
| 3:00 | `/gestao` | Abra a URL direto como Allan: "Sem acesso a esta área". | "Primeira barreira: URL." |
| 3:30 | `/vendas/5` | Pedido do Francisco: "Pedido não encontrado". | "Terceira barreira, dono do dado: responde 404 e não confirma que o pedido existe." |
| 4:00 | `/gestao/estoque` (janela anônima) | Entre como `matheussiqueira@sbi.tech`, busque `CG-20W`: saldo 28 (era 30). | "A saída aconteceu na confirmação, com custo médio e movimento no extrato." |
| 5:00 | `/gestao` | Clique em 90 dias. Faturamento líquido R$ 186.760,00 (seed R$ 186.400,00 + a venda de agora), 66 pedidos pagos. | "Lucro bruto aparece como '—' porque há itens do seed sem custo: erro nunca vira zero. O painel atualiza a cada 15 s." |
| 6:30 | `/gestao/produtos` | Capa de silicone → Preço → 320,00, motivo "Reajuste do fornecedor" → Alterar preço → Histórico. | "Preço só muda com motivo. O gatilho do banco grava autor e motivo." |
| 7:00 | `/vendas/<id da venda>` | A venda continua com o preço do momento. | "O pedido guarda o preço da venda." |
| 7:30 | Terminal | `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-contract.ps1 -HttpOnly` e abra `reports/contrato/live-v4/live-contract.json`. | "As 45 operações do contrato são chamadas de verdade; `divergences: []`." |
| 9:00 | GitHub Actions | `gh run list --branch main --limit 1`, job `bd`, artefato `bd-reports/resultado_bd.txt`. | "51 verificações SQL: Flyway, seed, RBAC, CRUD e a corrida pela última unidade." |
| 9:40 | Fechamento | Volte para `/gestao`. | Resuma: contrato verificado ao vivo, três barreiras de acesso, dinheiro calculado só no servidor. |

Depois do passo 7 o terminal mostra `git status` com 4 relatórios alterados (só o horário da execução). Antes de qualquer commit, rode `git restore reports/contrato`.

## 4. Riscos ao vivo e plano B

| Risco | Sinal | Plano B |
| --- | --- | --- |
| Docker não sobe ou o build demora | `up --wait` passa de 5 min | Mostre as capturas da seção 5 na ordem do roteiro |
| Sem internet no laboratório | build do frontend falha ao baixar fontes, `gh` sem resposta | Suba a stack em casa antes e não derrube; para o passo 8, use o artefato baixado (`resultado_bd.txt`) |
| Senha digitada errada 5 vezes | "E-mail ou senha inválidos." persiste | A conta fica bloqueada 15 min: troque para `franciscoferreira@sbi.tech` ou `gabrielsousa@sbi.tech` |
| Venda repetida no ensaio | saldo do `CG-20W` diferente de 28 | Normal: cada venda baixa 2 unidades. Para zerar, recrie banco e API: `docker compose -f docker-compose.demo.yml -p sbi-demo up -d --force-recreate --wait db api` |
| Contrato ao vivo demora | passa de 2 min | Mostre o `live-contract.json` já versionado |
| Projetor com resolução baixa | menu cortado | As telas funcionam em 390 px; use zoom do navegador em 90% |

## 5. Capturas (em `A3\output\demo-2026-10-14\`)

Cada tela tem duas versões, `-1440.png` (desktop) e `-390.png` (celular). Resultado bruto da verificação em `resultado.json`.

- Anônimo: `anonimo-entrar`.
- Vendedora: `vendedor-vender`, `vendedor-vender-carrinho`, `vendedor-vender-pagamento`, `vendedor-vender-confirmacao`, `vendedor-vendas`, `vendedor-vendas-68`, `vendedor-vendas-outro-vendedor`, `vendedor-gestao-sem-acesso`, `vendedor-clientes`, `vendedor-clientes-1`, `vendedor-meu-desempenho`.
- Gerente: `gerente-gestao`, `gerente-gestao-90-dias`, `gerente-gestao-estoque`, `gerente-gestao-produtos`, `gerente-gestao-produtos-preco`, `gerente-gestao-produtos-historico`, `gerente-gestao-promocoes`, `gerente-gestao-analises`, `gerente-vender`, `gerente-vendas`, `gerente-vendas-5`, `gerente-clientes`, `gerente-clientes-1`, `gerente-meu-desempenho`.

## 6. Encerrar

`docker compose -f docker-compose.demo.yml -p sbi-demo down -v`. Nada fica salvo.
