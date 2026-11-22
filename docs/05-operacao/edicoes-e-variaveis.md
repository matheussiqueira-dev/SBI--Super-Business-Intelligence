# Edições e variáveis de ambiente

A mesma base de código serve duas edições. A escolha é da variável `NEXT_PUBLIC_SBI_EDICAO`, lida em
[`frontend/lib/edition.ts`](../../frontend/lib/edition.ts).

| Edição | `NEXT_PUBLIC_SBI_EDICAO` | O que muda |
| --- | --- | --- |
| Acadêmica (padrão) | ausente ou `academica` | `/` responde 307 para `/entrar` sem sessão e leva cada perfil para a sua primeira área liberada. O login mostra os créditos do A3. Nada é indexado. |
| Comercial | `comercial` | `/` é a página pública da oferta, renderizada sem sessão e sem chamar a API do PDV. O login troca os créditos pelos links de produto e privacidade. `/privacidade` e `/suporte` entram na navegação. A indexação é liberada só com endereço público configurado. |

Valor inválido cai na edição acadêmica: publicar a comercial é sempre uma escolha explícita.

## Variáveis de build e variáveis de execução

A landing comercial é **estática**: o HTML é gerado no `next build` e servido por CDN, como o plano pede. Toda
variável que a landing lê entra no HTML no momento do build. Na prática:

- **lidas no build** (exigem novo deploy para mudar): todas as `NEXT_PUBLIC_*` e `SBI_COTACAO_MODO`, porque a
  landing decide ali se mostra o formulário ou o aviso de indisponibilidade;
- **lidas na execução** (mudam com reinício): as demais `SBI_*`, usadas pelo handler `/api/cotacao` e pela fila.

`SBI_COTACAO_MODO` aparece nas duas listas de propósito: precisa valer no build **e** na execução, com o mesmo
valor. Em plataformas como a Vercel, uma variável de ambiente do projeto já vale nos dois momentos. Se o build
disser "disponível" e a execução estiver desligada, o envio responde 503 com o canal comercial real — degrada
com a verdade, mas é um desencontro de configuração e precisa ser corrigido.

## Página pública

| Variável | Para que serve | Sem ela |
| --- | --- | --- |
| `NEXT_PUBLIC_SBI_EDICAO` | `comercial` liga a oferta pública | Edição acadêmica |
| `NEXT_PUBLIC_SBI_SITE_URL` | Endereço público (`https://…`), usado na URL canônica | Sem canônica e **sem indexação** |
| `NEXT_PUBLIC_SBI_SUPORTE_URL` | Central de chamados externa (`https://…`) | O cabeçalho e o rodapé apontam para a página interna `/suporte` |
| `NEXT_PUBLIC_SBI_STATUS_URL` | Página de status independente (`https://…`) | O rodapé diz "Status a publicar" |
| `NEXT_PUBLIC_SBI_PLANTAO_TELEFONE` | Plantão para operação parada, em E.164 (`+5585999990000`) | O link de plantão não aparece |
| `NEXT_PUBLIC_SBI_COMERCIAL_EMAIL` | Canal comercial real | Sem canal alternativo quando a cotação está indisponível |
| `NEXT_PUBLIC_SBI_SUPORTE_COBERTURA` | `continuo` publica "Suporte remoto 24 horas, todos os dias" | Publica "Abra chamados a qualquer hora", que é o que vale sem escala confirmada |
| `NEXT_PUBLIC_SBI_PRIVACIDADE_ESTAGIO` | `publicado` tira o selo de homologação do aviso | O aviso aparece identificado como versão de homologação |
| `NEXT_PUBLIC_SBI_PRIVACIDADE_ENTIDADE` | Entidade responsável pelo tratamento | A página diz que ainda não foi confirmada |
| `NEXT_PUBLIC_SBI_PRIVACIDADE_CONTATO` | Canal de atendimento ao titular | Cai no e-mail comercial; sem ele, a página diz que será publicado |
| `NEXT_PUBLIC_SBI_PRIVACIDADE_ATUALIZADO` | Data da última revisão do aviso | A data não aparece |

Link externo só é aceito em `https`, sem credencial embutida. Valor malformado é tratado como ausente: o canal
some da navegação em vez de virar um link quebrado.

`NEXT_PUBLIC_SBI_SUPORTE_COBERTURA=continuo` é uma **declaração de quem opera**, não uma consequência do código.
Só use depois de a escala, os canais e a medição estarem em operação ([suporte-24-7.md](suporte-24-7.md)).

## Cotação e fila comercial

| Variável | Para que serve | Padrão |
| --- | --- | --- |
| `SBI_COTACAO_MODO` | `arquivo`, `http`, `memoria` ou `desligado` | `arquivo` fora de produção, `desligado` em produção |
| `SBI_COTACAO_DIR` | Diretório do modo `arquivo` | `.sbi/cotacoes-dev` fora de produção; obrigatório em produção |
| `SBI_COTACAO_URL` | Base do serviço comercial/CRM no modo `http` | — |
| `SBI_COTACAO_TOKEN` | Credencial desse serviço (nunca versionada) | — |
| `SBI_COTACAO_NOTIFICACAO_URL` | Webhook da confirmação por e-mail | — |
| `SBI_COTACAO_NOTIFICACAO_TOKEN` | Credencial do webhook | — |
| `SBI_COTACAO_CAIXA_SAIDA` | Caixa de saída local, quando não há provedor | `.sbi/cotacoes-dev/caixa-saida` fora de produção |
| `SBI_COMERCIAL_FUSO` | Fuso da janela de atendimento | `America/Fortaleza` |
| `SBI_COMERCIAL_ABERTURA` / `SBI_COMERCIAL_FECHAMENTO` | Janela de atendimento (`9:00`, `18:00`) | `9:00` e `18:00` |
| `SBI_COMERCIAL_DIAS` | Dias atendidos, `0` = domingo | `1,2,3,4,5` |
| `SBI_COMERCIAL_FERIADOS` | Feriados `AAAA-MM-DD`, separados por vírgula | nenhum |

Em produção, sem `SBI_COTACAO_MODO` a captação fica desligada **de propósito**: é melhor a página dizer que a
solicitação está indisponível e apontar o canal real do que devolver um protocolo que não foi gravado em lugar
nenhum. Detalhes de operação em [cotacao-e-fila.md](cotacao-e-fila.md).

Variável de calendário ausente ou vazia cai no padrão. Isso é testado
([CT-COT-002b](../../frontend/tests/leads-calendar.test.ts)) porque já houve um defeito aqui: `SBI_COMERCIAL_DIAS`
vazia virava "só domingo" e o vencimento das 24 horas úteis saía três semanas à frente.

## Foto de produto (API)

| Variável | Para que serve | Padrão |
| --- | --- | --- |
| `SBI_PRODUCT_PHOTOS_DIR` | Diretório privado dos objetos | pasta temporária do sistema |
| `SBI_PRODUCT_PHOTOS_MAX_BYTES` | Tamanho máximo aceito | `3145728` (3 MB) |

O diretório **nunca** pode ficar dentro de uma pasta servida estaticamente: os bytes só saem pela API, que
confere a sessão antes. Detalhes em [fotos-de-produto.md](fotos-de-produto.md).

## Exemplo sem credenciais

```bash
# Edição comercial publicada
NEXT_PUBLIC_SBI_EDICAO=comercial
NEXT_PUBLIC_SBI_SITE_URL=https://exemplo.sbi.tech
NEXT_PUBLIC_SBI_SUPORTE_URL=https://suporte.exemplo.sbi.tech
NEXT_PUBLIC_SBI_STATUS_URL=https://status.exemplo.sbi.tech
NEXT_PUBLIC_SBI_COMERCIAL_EMAIL=comercial@exemplo.sbi.tech
NEXT_PUBLIC_SBI_SUPORTE_COBERTURA=abertura
NEXT_PUBLIC_SBI_PRIVACIDADE_ESTAGIO=homologacao

SBI_COTACAO_MODO=http
SBI_COTACAO_URL=https://crm.exemplo.sbi.tech/api
SBI_COTACAO_TOKEN=<definido no cofre do ambiente, nunca aqui>
SBI_COMERCIAL_FUSO=America/Fortaleza
SBI_COMERCIAL_FERIADOS=2026-12-25,2027-01-01

SBI_PRODUCT_PHOTOS_DIR=/var/lib/sbi/fotos-produto
```

Nenhuma credencial fica no repositório. Em desenvolvimento, as variáveis ficam em `.env.local`, já ignorado pelo
Git; em produção, no cofre de variáveis do provedor.

## Rodar as duas edições localmente

```powershell
cd frontend
$env:NEXT_PUBLIC_SBI_EDICAO = 'comercial'; $env:SBI_COTACAO_MODO = 'memoria'; npm run build; npm start
Remove-Item Env:NEXT_PUBLIC_SBI_EDICAO, Env:SBI_COTACAO_MODO; npm run build; npm start   # edição acadêmica
```

As duas variáveis entram no HTML no build: sem `SBI_COTACAO_MODO`, o build de produção publica a landing com o
aviso de captação indisponível em vez do formulário, que é o padrão seguro descrito acima.

A landing, a cotação, o aviso de privacidade e o suporte funcionam **sem a API Java no ar** — é justamente o que
os testes de aceite provam. Um comando só, que faz o próprio build comercial antes de subir:

```powershell
cd frontend; npm run test:e2e:comercial
```

## A demonstração também muda de edição

`/demo` é a mesma tela nas duas edições, com catálogo e identificação próprios em cada uma
([`lib/demo/catalog.ts`](../../frontend/lib/demo/catalog.ts)):

| | Acadêmica | Comercial |
| --- | --- | --- |
| Catálogo | recorte Olist (CC BY-NC-SA 4.0, **uso não comercial**) | catálogo próprio do SBI, produtos inventados |
| Loja | Unidade do Shopping Recife | Loja Modelo SBI, Fortaleza |
| Equipe | os autores do trabalho | nomes inventados, nos mesmos papéis |
| Miniaturas | fotos de licença livre, creditadas na própria tela | ícones de linha do projeto |

Os identificadores, os pesos e o mês de referência são os mesmos nas duas, então o roteiro guiado e a
reconciliação do cenário valem igual. É por isso que o botão “Explorar demonstração” da página comercial pode ser
mostrado a um cliente: ele não abre a massa acadêmica.

## Limites conhecidos

- O **formulário de cotação precisa de JavaScript**. O caminho nativo do formulário não consegue devolver erro por
  campo preservando o que foi digitado, então a página diz isso num `<noscript>` e oferece o canal comercial, em
  vez de entregar meio caminho. O resto da landing (conteúdo, navegação, FAQ) funciona sem script.
- A **tela de login também precisa de JavaScript** para o formulário aparecer (`useSearchParams` dentro de
  `Suspense`), comportamento que já existia antes da edição comercial. O painel de marca e a composição aparecem
  no estado final sem script.
