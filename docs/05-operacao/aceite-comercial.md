# Aceite da edição comercial

Estado de cada frente do plano comercial neste checkout, com a evidência de quem já foi verificado e o próximo
passo de quem não foi. Três classificações:

- **Implementado e verificado** — existe no código e um teste ou uma execução comprova o comportamento.
- **Implementado, verificação pendente** — existe no código, mas a prova depende de ambiente ou dado que não há
  aqui.
- **Depende de operação externa** — é decisão, contratação ou configuração de quem opera, não de código.

A distinção entre **revisão local** (esta máquina), **homologação** (ambiente parecido com produção, com dados
descartáveis) e **lançamento real** (loja de verdade) vale para a tabela inteira: tudo marcado como verificado foi
verificado em **revisão local**.

## 1 · Página comercial e login

| Item | Estado | Evidência |
| --- | --- | --- |
| `/` apresenta a oferta na edição comercial | Implementado e verificado | CT-COM-100 |
| Edição acadêmica preservada (307 para `/entrar`, área por perfil) | Implementado e verificado | CT-COM-010, build acadêmico com `/` dinâmica e resposta 307 conferida |
| Landing renderiza sem sessão e sem chamar a API do PDV | Implementado e verificado | CT-COM-100, suíte inteira roda com a API fora |
| Ordem das seções do plano | Implementado e verificado | CT-COM-100 |
| Texto aprovado da primeira dobra e das duas ações | Implementado e verificado | CT-COM-011 |
| Desktop com texto à esquerda e foto à direita; celular com título e botões antes da foto | Implementado e verificado | CT-COM-102 e capturas em `reports/comercial/` |
| Imagens com dimensão reservada, variantes responsivas e alternativa acessível | Implementado e verificado | CT-COM-101 |
| Capturas do próprio produto com dados sintéticos identificados | Implementado e verificado | CT-COM-014, CT-COM-101; geradas por `scripts/comercial-capturas.mjs` a partir de `/demo` |
| Inter e tokens existentes; ação em Petróleo, painel em Tinta, respiro em Névoa | Implementado e verificado | `app/comercial.css` só usa tokens semânticos; CT-WEB-141 barra cor literal |
| Regras públicas exatas no `proxy.ts` | Implementado e verificado | CT-COM-010, CT-COM-106 |
| `noindex` no login e nas áreas privadas; indexação só na edição comercial configurada | Implementado e verificado | CT-COM-005; metadados por página |
| Revelação de ~600 ms, uma vez por aba, sem reiniciar após erro | Implementado e verificado | CT-COM-120, CT-COM-121 |
| Movimento reduzido e ausência do script mostram o estado final | Implementado e verificado | CT-COM-122, CT-COM-123 |
| Sem deslocamento de layout por causa do motion | Implementado e verificado | CT-COM-120 |
| Teclado, foco visível e axe sem violação | Implementado e verificado | CT-COM-103, CT-COM-104, CT-COM-105, CT-COM-113, CT-COM-124 |
| Demonstração comercial com catálogo próprio | **Depende de operação externa** | O recorte Olist tem licença não comercial (CC BY-NC-SA 4.0). A demonstração atual é a acadêmica, com catálogo Apple. Próximo passo: catálogo sintético próprio ou ativos licenciados para uso comercial, antes de usar `/demo` como prova comercial |
| Domínio público e URL canônica | **Depende de operação externa** | Configurar `NEXT_PUBLIC_SBI_SITE_URL`; sem ele a indexação fica desligada de propósito |

## 2 · Cotação, fila e privacidade

| Item | Estado | Evidência |
| --- | --- | --- |
| Campos obrigatórios e opcionais do plano | Implementado e verificado | CT-COT-040, CT-COM-110 |
| Rótulo, erro por campo, retorno acessível, aviso de uso dos dados | Implementado e verificado | CT-COM-110, CT-COM-113 |
| Frase exata da confirmação, com protocolo | Implementado e verificado | CT-COT-042, CT-COM-111 |
| Falha preserva o que foi digitado e permite repetir | Implementado e verificado | CT-COM-110, CT-COT-048 |
| Endpoint de mesma origem, independente do PDV | Implementado e verificado | `/api/cotacao`; CT-COT-060; a suíte roda com a API fora |
| Persistência durável separada do banco do PDV | Implementado e verificado | Adaptadores arquivo, http e memória; CT-COT-023 a CT-COT-030 |
| Protocolo só depois da gravação confirmada | Implementado e verificado | CT-COT-047 (503 sem armazenamento, sem protocolo) |
| Idempotência com restrição única | Implementado e verificado | CT-COT-021 a CT-COT-026, CT-COT-043, CT-COM-112 |
| Validação de formato, tamanho e volume no servidor | Implementado e verificado | CT-COT-041, CT-COT-046 |
| Antispam (armadilha e tempo mínimo) | Implementado e verificado | CT-COT-045 |
| Vencimento em horas úteis, com fim de semana, feriado e fora do expediente | Implementado e verificado | CT-COT-004 a CT-COT-010, CT-COT-044 |
| Notificação fora da requisição, com nova tentativa e alerta | Implementado e verificado | CT-COT-051 a CT-COT-055 |
| Lead persistido continua visível se a notificação falhar | Implementado e verificado | CT-COT-052 |
| Conteúdo do formulário fora de log e de analytics | Implementado e verificado | CT-COT-051, CT-COT-052 |
| Fila permite atribuir responsável e suplente e registrar a primeira resposta humana | Implementado e verificado | `scripts/cotacoes.mjs`, exercitado contra o armazenamento de arquivo |
| Página de privacidade com o que falta confirmar | Implementado e verificado | CT-COM-105 |
| CRM real conectado | **Depende de operação externa** | Contrato do modo `http` documentado; falta o serviço |
| Provedor de e-mail da confirmação | **Depende de operação externa** | Webhook configurável; em desenvolvimento a mensagem vai para caixa de saída local |
| Calendário oficial com feriados | **Depende de operação externa** | Variáveis documentadas; o padrão é o exemplo do plano |
| Texto definitivo do aviso de privacidade | **Depende de operação externa** | Sete itens listados na própria página |

## 3 · Catálogo e fotos

| Item | Estado | Evidência |
| --- | --- | --- |
| Esquema da foto ligado ao ID do produto, aditivo | Implementado e verificado | V13 aplicada em PostgreSQL 18 real; `FlywayMigrationTest` |
| Chave no PostgreSQL, arquivo em armazenamento privado | Implementado e verificado | `ProductPhotoStorage`; o diretório não é servido estaticamente |
| Autorização conferida no backend | Implementado e verificado | `access-matrix.csv` (leitura VENDEDOR, escrita GERENTE), gatilho da V13 |
| Conteúdo do arquivo e tamanho validados | Implementado e verificado | CT-FOTO-101 a CT-FOTO-105 |
| Miniatura gerada | Implementado e verificado | CT-FOTO-102, CT-FOTO-106 |
| Substituição sem derrubar a foto anterior | Implementado e verificado | Ordem das escritas em `ProductPhotoService`; objeto antigo só sai depois do commit |
| Envio interrompido e falha entre gravação e atualização | Implementado e verificado | Objetos novos removidos no rollback; pior caso é objeto órfão, nunca registro apontando para objeto inexistente |
| Fallback quando a mídia está indisponível | Implementado e verificado | 404 na mídia ausente; `ProductThumb` desce para o mapa local e depois para o ícone |
| Fallback dos produtos existentes preservado | Implementado e verificado | `lib/product-photos.ts` intacto; CT-WEB do mapa local segue passando |
| Contrato e clientes gerados atualizados | Implementado e verificado | Contrato validado sem achados, auditoria sem erros, `npm run api:generate` |
| Tela do gerente para enviar, substituir e remover | Implementado, verificação pendente | `PhotoForm` em Produtos. Falta exercitar o envio real pela tela: o E2E do backoffice exige a bateria com banco descartável e API no ar |
| Adaptador de objeto em nuvem | **Depende de operação externa** | Bucket privado, credencial e ciclo de vida; interface pronta |
| Backup das mídias junto com o banco | **Depende de operação externa** | Restauração conjunta a testar |

## 4 · Operação, suporte e recuperação

| Item | Estado | Evidência |
| --- | --- | --- |
| Guia de implantação com etapas e aceite | Implementado e verificado | [implantacao-e-catalogo.md](implantacao-e-catalogo.md) |
| Responsabilidade da loja por exatidão e direito de uso das fotos | Implementado e verificado | Registrada no guia e na própria tela de envio |
| Suporte no site e no login, com central e status configuráveis | Implementado e verificado | CT-COM-003, CT-COM-004, CT-COM-105 |
| Redação de cobertura só com declaração explícita | Implementado e verificado | CT-COM-004 |
| Documentação de recepção, triagem, escala e escalonamento | Implementado e verificado | [suporte-24-7.md](suporte-24-7.md) |
| Arquitetura de disponibilidade e recuperação documentada | Implementado e verificado | [disponibilidade-e-recuperacao.md](disponibilidade-e-recuperacao.md) |
| Variáveis documentadas com exemplo sem credenciais | Implementado e verificado | [edicoes-e-variaveis.md](edicoes-e-variaveis.md) |
| Sessão compartilhada entre instâncias | Não implementado | Hoje a sessão vive na memória da instância. Os quatro passos estão listados em disponibilidade-e-recuperacao.md |
| Health checks e monitor externo | **Depende de operação externa** | Verificações propostas, com contas dedicadas |
| Teste de restauração de banco e mídias | **Depende de operação externa** | Procedimento documentado |
| Simulação de P1 fora do expediente | **Depende de operação externa** | É o que libera a redação de cobertura 24/7 |
| Metas de 99,9%, RPO 15 min e RTO 2 h | **Depende de operação externa** | Propostas, com método de medição; validar antes de contratualizar |

## Como reproduzir a verificação

```powershell
# Frontend: unitários, tipos e build nas duas edições
cd frontend
npm run typecheck
npm test
npm run api:check
$env:NEXT_PUBLIC_SBI_EDICAO = 'comercial'; npm run build
npm run test:e2e:comercial          # aceite da edição comercial, sem a API no ar
Remove-Item Env:NEXT_PUBLIC_SBI_EDICAO; npm run build

# Backend: bateria completa com PostgreSQL descartável
cd ..
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test.ps1 -Mode Integration

# Contrato
npm run contract
node scripts\audit-contract.mjs config\openapi\target-loja-gestao-openapi-2026-11-20-v7.json
```

As capturas de evidência (landing desktop e celular, cotação, login desktop e celular, privacidade e suporte)
ficam em [`reports/comercial/`](../../reports/comercial/) e são regeradas por:

```powershell
cd frontend; node scripts/comercial-capturas.mjs --base http://127.0.0.1:3000
```

## Liberação por etapa

A página de interesse pode ir ao ar depois de testar a captação, o aviso de privacidade e a rotina comercial.
Para **vender implantação e suporte com dados reais** ainda faltam: ambiente isolado por empresa, armazenamento de
objetos em nuvem para as fotos, restauração validada, escala de plantão testada, canais externos contratados e o
aceite de uma loja piloto.
