# Cotação e fila comercial

Como a solicitação de cotação é recebida, gravada, confirmada e atendida. Especificação de origem: seção 06 do
plano comercial.

## O que o caminho garante

1. **A captação não depende do PDV.** O handler `/api/cotacao` não chama a API Java, não lê o cookie de sessão e
   grava em armazenamento próprio. Venda ou login fora do ar não impedem uma loja interessada de pedir cotação.
2. **Protocolo só depois da gravação.** A confirmação é devolvida com o protocolo apenas quando o armazenamento
   confirma a escrita. Sem armazenamento configurado, a resposta é 503 com o canal comercial real — nunca um
   protocolo inventado.
3. **O mesmo envio repetido recupera o mesmo protocolo.** A chave de idempotência é o SHA-256 do conteúdo
   normalizado mais o dia da operação, com restrição única no armazenamento. Recarregar e enviar de novo, clique
   duplo ou nova tentativa após erro de rede não abrem uma segunda solicitação.
4. **Falha de notificação não apaga a cotação.** A confirmação sai depois da resposta, com novas tentativas e
   alerta no fim; a cotação gravada continua visível na fila com o estado da notificação.
5. **O conteúdo do formulário não entra em log nem em analytics.** O alerta de falha identifica pelo protocolo. A
   notificação leva o mínimo para a triagem e não repete a mensagem livre.

## Modos de armazenamento

`SBI_COTACAO_MODO` escolhe o adaptador ([`frontend/lib/leads/`](../../frontend/lib/leads/)):

| Modo | Para quê | Durabilidade |
| --- | --- | --- |
| `arquivo` | Desenvolvimento, homologação e piloto com volume persistente | Do volume do ambiente |
| `http` | Serviço comercial ou CRM da operação | Do serviço |
| `memoria` | Só teste | Nenhuma |
| `desligado` | Padrão em produção sem configuração | A página diz que está indisponível |

### Contrato do modo `http`

O serviço configurado em `SBI_COTACAO_URL` precisa responder a:

```
POST   {base}/cotacoes                corpo SaveInput   -> 201 { lead } | 200 { lead, duplicada: true }
GET    {base}/cotacoes?estado=&limite=                  -> 200 { leads: [...] }
GET    {base}/cotacoes/{protocolo}                      -> 200 { lead } | 404
PATCH  {base}/cotacoes/{protocolo}    corpo LeadPatch   -> 200 { lead } | 404
```

O token vai em `Authorization: Bearer`, a chave de idempotência em `Idempotency-Key`, e o serviço precisa manter a
restrição única dessa chave. A resposta sem a cotação gravada é tratada como erro: nada de protocolo sem registro.

## Prazo de 24 horas úteis

Hora útil é hora dentro da janela configurada, em dia atendido e fora dos feriados. O padrão é o exemplo do plano:
segunda a sexta, 9h–18h, horário de Fortaleza. Recebimento fora da janela começa a contar na abertura seguinte.

Exemplos verificados em [`tests/leads-calendar.test.ts`](../../frontend/tests/leads-calendar.test.ts):

| Recebida em (horário da operação) | Vence em |
| --- | --- |
| Segunda 09:00 | Quarta 15:00 |
| Segunda 22:00 | Quinta 15:00 (conta a partir de terça 09:00) |
| Sexta 17:00 | Quarta 15:00 |
| Sábado 10:00 | Quarta 15:00 |
| Segunda 09:00, com terça feriado | Quinta 15:00 |

**A confirmação automática e a primeira resposta humana são eventos distintos.** O relógio do retorno para na
primeira resposta humana registrada, não no e-mail de recebimento.

Se a intenção comercial for "até o próximo dia útil" em vez de 24 horas úteis, mude a redação da página
([`lib/comercial/copy.ts`](../../frontend/lib/comercial/copy.ts)) e a constante `RESPONSE_HOURS` juntas — publicar
uma e configurar a outra é a forma mais fácil de descumprir o prazo prometido.

## Proteção de volume e antispam

Três barreiras, nenhuma dependendo de serviço externo:

1. **Janela deslizante por origem**: 5 envios por 10 minutos, contados **por instância**. Com mais de uma
   instância, o limite efetivo multiplica; para um teto global, use o limite do provedor ou do WAF na borda.
2. **Campo armadilha** escondido e fora da ordem de tabulação. Preenchido, o envio é descartado.
3. **Tempo mínimo de preenchimento** (1,2 s) informado pela tela.

As duas últimas respondem a mesma mensagem de um campo inválido: a resposta não diz qual barreira pegou.

A conferência de mesma origem usa `Sec-Fetch-Site` e, para quem não envia, `Origin` comparado ao `Host` (ou
`X-Forwarded-Host` atrás de CDN). **Não** usa a URL da requisição: num handler do Next ela vem da reescrita
interna e recusaria envios legítimos — foi exatamente o defeito corrigido em
[`lib/leads/origin.ts`](../../frontend/lib/leads/origin.ts).

## Operar a fila

Sem CRM, a fila é operada pela linha de comando, com acesso ao ambiente — nenhuma rota HTTP nova é exposta:

```powershell
cd frontend
node scripts/cotacoes.mjs listar
node scripts/cotacoes.mjs vencendo --horas 4
node scripts/cotacoes.mjs ver SBI-20261123-ACDEFG
node scripts/cotacoes.mjs atribuir SBI-20261123-ACDEFG --responsavel "Nome" --suplente "Suplente"
node scripts/cotacoes.mjs responder SBI-20261123-ACDEFG --proximo-passo "Diagnóstico em 24/11, 10h"
node scripts/cotacoes.mjs descartar SBI-20261123-ACDEFG --motivo "Fora do público inicial"
```

`responder` registra a **primeira** resposta humana e imprime quantas horas úteis se passaram e se ficou no prazo.
Um segundo contato não reescreve a medida. `vencendo` sai com código 2 quando há algo vencendo, o que serve de
gatilho para alerta na escala comercial.

Com `SBI_COTACAO_MODO=http`, os mesmos comandos operam o serviço configurado.

## Acompanhamento

Medir visitas qualificadas, cliques em cotação, envios aceitos, percentual de primeiras respostas no prazo,
propostas emitidas e implantações fechadas. O conteúdo do formulário fica fora de qualquer ferramenta de
analytics; o que se mede é o evento, não o texto.

## O que depende do responsável pela operação

| Item | Quem decide | Evidência necessária |
| --- | --- | --- |
| Calendário oficial e feriados | Comercial | Calendário publicado e configurado nas variáveis |
| Provedor de e-mail da confirmação | Operação | Webhook configurado e um envio real recebido |
| CRM ou serviço comercial | Comercial | Serviço respondendo ao contrato acima |
| Escala de atendimento com titular e suplente | Comercial | Escala publicada |
| Publicar a promessa de 24 horas úteis | Comercial | Fila, calendário e responsável confirmados |

Enquanto esses itens não existirem, a edição pública deve ficar com a captação desligada ou apontando um canal
real — é o comportamento padrão.
