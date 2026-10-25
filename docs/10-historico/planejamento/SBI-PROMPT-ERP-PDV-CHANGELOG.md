# Changelog — SBI-PROMPT-ERP-PDV.md (v1 → v2, execução noturna)

> Documento local, fora dos repositórios. Data: 14/10/2026, 02h. Base da análise: `main` em `d2fe3c7`.

## Resumo

A v1 conduzia uma sessão por etapa, com parada para aprovação humana no fim de cada uma. A v2 conduz as etapas 2A a 4 numa única execução noturna, sem perguntas e sem pausas. Toda dúvida vira decisão registrada. Toda ação irreversível vira item de aprovação pendente para a manhã. O log da noite serve também como ponto de retomada.

## Alterações e motivos

| # | Alteração | Motivo |
| --- | --- | --- |
| 1 | Removidos os portões "Pare e aguarde ETAPA N aprovada" e "Pare e pergunte". Entrou um protocolo de decisão autônoma (seção 2 do prompt). | Pedido de execução não assistida. Sem portões, o critério de decisão precisa estar escrito, senão o agente improvisa. |
| 2 | "Sem confirmação" foi interpretado como "sem pausas", não como "liberado para o irreversível". Merge na `main`, `push --force`, apagar branch, editar migração publicada e mexer no banco de desenvolvimento são proibidos e viram "Aprovações pendentes". | É a decisão mais segura: preserva a regra da equipe (merge só após revisão de outro integrante) e evita perda de dados sem ninguém para reverter. O resto da execução não para por causa disso. |
| 3 | As etapas rodam em branches empilhadas (2A → 2B → 2C → 3 → 4), cada PR com base na branch anterior, e nada é integrado à noite. | Sem merge na `main`, a etapa seguinte só tem o código da anterior se partir da branch dela. A base empilhada mantém cada diff restrito à sua etapa. |
| 4 | Entrou um roteiro da manhã: squash na ordem da pilha, troca da base do PR filho para `main` e `git merge origin/main`, sem rebase. | Corrige o problema já visto no #10: depois do squash do pai, o filho ainda carrega os commits originais. |
| 5 | Execução num worktree próprio (`../noite`). | Isola o trabalho noturno do checkout em que você trabalha e das worktrees da Fase 0. |
| 6 | Especificação duplicada removida (seções 4, 6, 8 e 9 da v1). A fonte de verdade passa a ser o que a ETAPA 1 publicou na `main`: contrato v4, `modelo-erp-pdv.md`, `erp-pdv.md`, matriz e plano de testes. | A ETAPA 1 refinou e corrigiu a v1 (por exemplo C-06, C-15, REC-d, B-05). Repetir a v1 criaria contradições com o que já foi aprovado. |
| 7 | Mantida no prompt uma seção curta de invariantes (estoque, idempotência, hierarquia, sessão, Flyway, cartão, erro, dinheiro), que prevalece sobre qualquer fonte. | São as regras cujo erro custa mais, como venda duplicada, estoque negativo ou vazamento de dados entre vendedores. Ficam protegidas mesmo se alguma decisão no repositório estiver errada. |
| 8 | Estado atualizado: Fase 0 integrada (#6, #5, #8, #10, #7, #11, #12), `V4__money_numeric.sql` na `main`, #9 substituído pelo #10, ETAPA 1 publicada em `d2fe3c7`. | A v1 dizia "main = 57c3c70" e "V4 aguardando squash", o que já não vale. |
| 9 | Respostas A2A-1 a A2A-4 tratadas como decididas. A recriação do `postgres-order` (A2A-2) fica para a manhã. | Recriar o banco de desenvolvimento apaga dados locais. À noite só o banco descartável da porta 15432 é usado. |
| 10 | Entraram orçamentos de tempo e cortes mínimos por etapa, com prioridades dentro da 2C. | Cinco etapas numa noite são um escopo agressivo. O corte mínimo garante que cada etapa entregue algo revisável, em vez de várias pela metade. |
| 11 | Política para teste vermelho: até 3 ciclos de correção, nunca afrouxar nem desativar teste, e lista de "testes vermelhos herdados". | Sem revisor, a tentação de "fazer passar" mudando o teste é o maior risco de qualidade, e no A3 isso invalidaria as evidências. A lista impede que uma falha herdada esconda uma falha nova. |
| 12 | Plano de contingência para Docker e CI: abrir o Docker Desktop uma vez; se não houver Docker, unitários locais mais push e CI com limite de 30 min. | O registro da Fase 0 mostra execuções sem Docker no Windows; sem esse plano, a execução travaria esperando. |
| 13 | Log da noite (`../SBI-NOITE-2026-10-14.md`) com nove seções fixas, atualizado a cada commit. | Atende ao pedido de log detalhado para a manhã e serve de checkpoint caso a sessão reinicie ou perca contexto. |
| 14 | Checklist humano antes de dormir (energia, Docker, `gh auth`, sessão nova em modo automático). | São condições que o agente não consegue garantir. A suspensão do notebook, sozinha, encerra a execução. |
| 15 | Mantidas e reforçadas as regras de higiene (sem trailers, Conventional Commits de uma linha, `scan_ai.py`), e o log nunca vai para commit. | Suas regras permanentes valem igualmente sem supervisão. |
| 16 | Gatilho trocado de `Execute a ETAPA N` para `Execute a NOITE`. | Uma única execução cobre todas as etapas. |

## O que não mudou

- Stack, arquitetura e decisões A1–A8, DEC-ERP-01..08 e o conteúdo técnico aprovado na ETAPA 1.
- A regra de que a `main` só recebe código revisado por outro integrante.

## Riscos para sua revisão

- **Escopo:** é provável que a noite não feche as cinco etapas inteiras. Confira no Resumo do log quais ficaram no corte mínimo.
- **Pilha longa:** se a 2A tiver problema estrutural, ele se propaga para as etapas seguintes. Revise a 2A primeiro e com mais cuidado.
- **Política local de permissões:** a política do modo automático pode negar comandos como `gh pr create` ou `docker`. O prompt registra e segue, mas uma etapa pode terminar sem PR aberto (só branch enviada).
