# Avatares dos usuários

Os avatares aparecem junto ao nome na conta da barra lateral e na lista de usuários da gestão. O componente `frontend/components/user-avatar.tsx` mantém o círculo de 36 px e as cores por papel do SBI. As imagens são decorativas (o nome continua em texto), com dimensões reservadas e fallback para as iniciais durante a carga, em falha da imagem e para usuários sem mapeamento.

| Pessoa | Avatar | Origem |
| --- | --- | --- |
| Matheus Henrique Dias Siqueira | 21 | `21.svg` do ZIP fornecido |
| Gabriel Sousa Vasconcelos | 26 | `26.svg` do ZIP fornecido |
| Francisco Miguel De Lemos Sena Ferreira | 9 | `9.svg` do ZIP fornecido |
| Allan Gabriel Almeida Barros | 12 (ID interno) | `Allan.svg` enviado pelo usuário, substituindo o avatar anterior |
| Bruno Marciano De Amorim Josino | 19 | `19.svg` enviado separadamente pelo usuário |
| Paulo Thiago Gomes Da Silva | 18 (ID interno) | `Paulo.svg` enviado pelo usuário, substituindo o avatar anterior |
| Christian Felix Gbedande Azonyetin | 13 | `13.svg` do ZIP fornecido |

Fonte: [Memoji Avatars (Community)](https://www.figma.com/design/khzxuhK7C7U7UnlzkKufqT/Memoji-Avatars--Community-?node-id=0-1). O ZIP também contém os avatares 2 e 8 e um SVG de conjunto; estes não são usados. Não foi presumida uma licença específica além da identificação da fonte fornecida.

Os assets em `frontend/public/avatares/` são WebP de 192 × 192 px, reduzidos sem recorte para manter a composição original e atender telas de alta densidade. Nenhuma URL temporária do Figma é usada em execução.

O catálogo em `frontend/lib/user-avatars.ts` faz correspondência exata pelo nome completo, ignorando caixa, acentos e espaços repetidos. Reconhece também os quatro nomes abreviados e e-mails confirmados em `V6_1__DemoAccounts.java`; o e-mail conhecido tem precedência para manter o avatar após edição do nome. Nenhum e-mail é inferido para os outros membros. Não há correspondência por primeiro nome ou trecho do nome. Mudanças em nomes não cobertos exigem atualizar o catálogo.

Esta é uma associação visual no frontend: não cria contas, não muda nomes, permissões, tipos gerados da API nem migrações do banco.

## Movimento e interação

O movimento agora vem de expressões faciais: sorriso, surpresa com olhos arregalados, atenção e piscadela. Não há mais flutuação contínua. Os sete atlas de 384 × 384 px em `frontend/public/avatares/expressoes/` contêm quatro quadros de 192 × 192 px: sorriso no alto à esquerda, surpresa no alto à direita, atenção embaixo à esquerda e piscadela embaixo à direita. Foram criadas versões derivadas com `imagegen` a partir dos sete avatares originais; o estado de descanso mantém o arquivo original. São expressões pré-renderizadas com transição visual, não um modelo 3D com rig ou captura facial.

O cursor ou o foco no avatar provoca uma piscadela; o cursor também inclina a cabeça até 10 graus. Enquanto o componente estiver visível e a aba ativa, há uma sequência contínua de expressões, com sorrisos, piscadelas e atenção, combinada a movimentos sutis da cabeça. Quadros duram entre 380 e 1400 ms. Não há loop JavaScript por quadro: o movimento usa CSS e as expressões avançam por temporizadores discretos.

Um botão de 44 × 44 px envolve o círculo visual de 36 px. Clique, toque, Enter ou Espaço no rosto provocam uma reação. A pausa tem um controle separado, “Pausar avatares”, na área da conta, e afeta todos os avatares. A preferência de pausa permanece durante a navegação até ser retomada ou a página ser recarregada.

Todo clique dentro das telas internas dispara uma resposta imediata no avatar da conta, mesmo em áreas vazias ou em controles que interrompam a propagação do evento. Um contador reinicia a resposta visual para cada clique, incluindo cliques repetidos. Não há coleta do texto ou dos dados do elemento clicado. O listener não bloqueia nem altera a ação do controle. A pausa é a exceção explícita e não dispara uma reação ao ser acionada.

## Reações às operações

`MutationCache` no provider observa as operações de escrita já realizadas pelo React Query, sem mudar pedidos, requisições, respostas, permissões ou mensagens. Apenas o avatar da própria conta (`reactToActivity`) acompanha essas operações; os colegas da listagem não recebem reações a ações alheias. No celular uma instância compacta aparece no cabeçalho mesmo com o menu fechado.

| Evento confirmado | Expressão |
| --- | --- |
| Operação em andamento | Atenção |
| Cadastro/alteração salva, pedido criado ou pagamento confirmado | Sorriso |
| Falha `STOCK_INSUFFICIENT` ou `DISCOUNT_ABOVE_LIMIT` | Surpresa |
| Outras falhas ou pedido cancelado | Atenção, sem celebração |

Resultados duram 3,2 segundos e depois retornam à sequência ambiente, ou à atenção se ainda houver uma operação pendente. Operações concorrentes não deixam um sucesso esconder um alerta ativo. Cliques reiniciam uma breve resposta gestual mesmo quando um resultado está ativo, preservando a expressão desse resultado. O encerramento/troca da conta descarta resultados antigos. Cancelamentos e falhas não exibem sorriso de sucesso. Metadados nas mutações do PDV e dos detalhes de venda distinguem criação, pagamento e cancelamento. Consultas periódicas não disparam celebrações. As mensagens em texto permanecem sendo a fonte da explicação e da acessibilidade.

Com `prefers-reduced-motion: reduce`, não há piscadela automática, inclinação, aceno ou transições; as expressões de resultado podem mudar estaticamente. Em falha do atlas, permanece a imagem original. Em falha da imagem original, permanecem as iniciais. Nenhum dado de uso é enviado a serviços de imagem: os atlas são arquivos locais, gerados previamente.
