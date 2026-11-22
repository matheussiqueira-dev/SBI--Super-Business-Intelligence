# Disponibilidade e recuperação

Arquitetura proposta para operar uma loja de verdade, com o que precisa ser exercitado antes do piloto.
Especificação de origem: seção 10 do plano comercial.

## Ponto de partida

O ambiente de demonstração usa Vercel, Render e Neon, e **não serve para operar uma loja**: o plano gratuito do
Render suspende o serviço por inatividade, e o banco pode escalar a zero. Para a operação comercial é preciso API
paga sempre ativa, banco de produção sem suspensão por inatividade e ambiente independente da demonstração.

- [Render · plano gratuito](https://render.com/docs/free)
- [Neon · scale to zero](https://neon.com/docs/introduction/scale-to-zero)

## Desenho por camada

| Camada | Desenho proposto | Já implementado |
| --- | --- | --- |
| Site e cotação | Landing estática servida por CDN; o formulário grava em base ou serviço comercial independente do PDV; suporte e status em domínios que continuam acessíveis durante incidente do aplicativo | **Sim.** `/` é estática no build comercial, `/api/cotacao` não toca a API Java, suporte e status são links configuráveis |
| Login e aplicação | API com pelo menos duas instâncias quando a disponibilidade exigir; sessões compartilhadas via Spring Session JDBC ou Redis; testar sessão, CSRF e revogação entre instâncias | Não. Hoje a sessão é de servlet, em memória de uma instância |
| PostgreSQL e mídias | Plano, região e recuperação confirmados; pool e limites de conexão ajustados; credencial de migração separada da de aplicação; backups protegidos e restauração testada em ambiente isolado, incluindo fotos e vínculos do catálogo | Parcial. O esquema é todo do Flyway; o restante depende do provisionamento |
| Publicação e alerta | Homologação, migrações compatíveis entre releases, teste de retorno, health checks, deploy com readiness, rollback e monitor externo | Parcial. A CI já roda a bateria completa a cada PR |

## Sessão compartilhada: o que falta

Hoje a sessão vive na memória da instância (`HttpSessionSecurityContextRepository`). Com duas instâncias atrás de
um balanceador, uma pessoa autenticada numa instância aparece deslogada na outra. Antes de ligar a segunda
instância é preciso:

1. adotar Spring Session (JDBC ou Redis) para a sessão sair da memória do processo;
2. conferir que o token CSRF sobrevive à troca de instância;
3. conferir que a revogação (`SessionVersionFilter`, G-01) derruba a sessão **em todas as instâncias** na
   requisição seguinte a uma mudança de papel, situação ou senha;
4. rodar os testes de sessão com duas instâncias no ar, não só com uma.

Sem esses quatro passos, escalar horizontalmente quebra o login em vez de torná-lo mais disponível.

## Verificações sintéticas

Monitor externo, fora da infraestrutura monitorada, com **conta e dados dedicados** — nunca uma conta de pessoa
real e nunca a loja do cliente:

| Verificação | O que confirma | Frequência sugerida |
| --- | --- | --- |
| `GET /` (site) | A oferta pública responde pela CDN | 1 min |
| `GET /entrar` | A tela de login carrega | 1 min |
| `GET {api}/actuator/health` ou equivalente | A API está de pé e o banco responde | 1 min |
| `POST /api/cotacao` com dados sintéticos marcados | A captação grava de verdade | 15 min |
| Login + criação de venda sintética em ambiente dedicado | O caminho que gera receita funciona de ponta a ponta | 15 min |

A venda sintética roda em **ambiente dedicado**, não no ambiente da loja: ela cria pedido e movimenta estoque.
As cotações sintéticas precisam de origem marcada (`source`) para sair dos números do funil.

## Deploy e rollback

- Toda migração precisa ser compatível com a versão anterior da aplicação durante a janela de publicação:
  adicionar coluna e tabela antes, remover depois, nunca os dois no mesmo release. A V13 segue essa regra — é
  aditiva, e a aplicação anterior ignora a tabela nova.
- O deploy só promove a instância nova depois da verificação de prontidão.
- O rollback da aplicação precisa ser possível **sem rollback de migração**. Migração que não pode ser revertida
  (remoção de coluna, mudança de tipo) exige uma janela combinada e um plano próprio.

## Backup e restauração

- Backup do banco com retenção definida, protegido contra remoção acidental.
- Backup das mídias (fotos de produto) junto com o banco: restaurar um sem o outro deixa o catálogo apontando
  para objetos que não existem.
- **Restauração testada em ambiente isolado**, conferindo também as fotos e os vínculos do catálogo. Backup que
  nunca foi restaurado não é backup, é esperança.

## Metas de engenharia sugeridas

| Meta | Valor proposto | Como medir |
| --- | --- | --- |
| Disponibilidade do caminho de login e venda | 99,9% mensais (cerca de 43 min em 30 dias) | Verificação sintética externa, a cada minuto, contando como indisponível toda falha do caminho completo |
| Disponibilidade da página comercial | Medida separadamente | Verificação da CDN |
| RPO | Até 15 min de perda | Intervalo do backup contínuo ou do WAL |
| RTO | Até 2 h para recuperação após desastre | Cronometrado no teste de restauração |

**Valide com testes, orçamento e fornecedores antes de tratar como compromisso de contrato.** O método de medição
precisa estar escrito junto com a meta: sem isso, duas pessoas medem a mesma indisponibilidade de formas
diferentes.

## Contingência da loja

Durante indisponibilidade:

1. acionar o canal externo (central ou plantão);
2. usar o procedimento combinado na implantação, com os meios fiscais e de pagamento que a loja já tem;
3. **identificar cada transação feita fora do sistema** — sem isso a reconciliação não tem como saber o que já
   entrou;
4. depois do retorno, reconciliar pedidos e estoque, conferindo que nada foi lançado duas vezes.

Testar antes do piloto: falha de instância, reinício de sessão, rollback e restauração.

## O que depende do responsável pela operação

| Item | Responsável | Evidência necessária |
| --- | --- | --- |
| API paga sempre ativa e banco sem suspensão | Infraestrutura | Plano contratado e configuração aplicada |
| Spring Session e teste com duas instâncias | Engenharia | Sessão, CSRF e revogação conferidos entre instâncias |
| Monitor externo com contas dedicadas | Infraestrutura | Verificações no ar e alertas chegando à escala |
| Backup com restauração testada, banco e mídias | Infraestrutura | Registro da restauração, com tempo medido |
| Contratualizar 99,9%, RPO e RTO | Produto e jurídico | Medição de pelo menos um ciclo completo |
