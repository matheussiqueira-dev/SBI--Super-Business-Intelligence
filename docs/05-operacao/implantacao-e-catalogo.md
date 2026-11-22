# Implantação, catálogo e aceite

Guia da implantação acompanhada por consultor, do diagnóstico ao aceite em loja. Especificação de origem: seção 05
do plano comercial.

## Etapas

### 1 · Diagnóstico

| SBI · consultoria | Cliente · responsável da loja |
| --- | --- |
| Mapear atendimento, estoque, metas, volumes, localidade, sistema fiscal e meios de pagamento. Definir escopo e pré-requisitos. | Mostrar a rotina real e indicar quem aprova catálogo, acessos e início de operação. |

Saída do diagnóstico: escopo escrito, lista de pré-requisitos, o que fica em paralelo (emissor fiscal,
maquininha) e o que precisa de homologação à parte.

### 2 · Preparação

| SBI · consultoria | Cliente · responsável da loja |
| --- | --- |
| Configurar ambiente e perfis. Entregar modelo de catálogo com exemplo e checklist de validação. | Cadastrar e revisar produtos, referência interna, categoria, preço, saldo, custo e fotos autorizadas. |

**Cadastro no piloto.** Um produto por SKU. A loja usa a tela de Produtos e registra referência interna, nome,
categoria e preço. **Saldo e custo inicial entram pela movimentação de estoque**, não pelo cadastro do produto —
é o fluxo que já existe e o que mantém o custo médio correto.

A referência precisa ser estável, com convenção para variações (cor, capacidade) e revisão de duplicidades antes
da virada. Duplicidade descoberta depois do início custa reconciliação de estoque.

**Fotos.** A loja envia pelo painel de gestão, em Produtos → Foto. Aceita JPEG e PNG, de 64 a 4096 pixels de lado,
até 3 MB; a miniatura é gerada pelo sistema. Detalhes em [fotos-de-produto.md](fotos-de-produto.md).

**Responsabilidades da loja**, registradas no aceite: a exatidão das informações do catálogo e o direito de uso
das fotos enviadas.

**Importação em lote e conectores por API ficam para a fase posterior.** Na primeira etapa a loja usa o painel e
mantém as ferramentas externas homologadas no diagnóstico. Para volume alto, a importação assistida precisa de
prévia, validação por linha e confirmação; para integração por API, de sistema de origem, campos, regras de
sincronização, credenciais limitadas, tratamento de falhas e reconciliação. Cada conector é estimado na proposta.

### 3 · Treinamento presencial

| SBI · consultoria | Cliente · responsável da loja |
| --- | --- |
| Treinar balcão, gestão e direção com venda de teste, cancelamento, estoque, metas, acessos e abertura de chamado. | Participar com os responsáveis, testar com itens representativos e registrar dúvidas. |

Roteiro mínimo do treinamento, com dados da própria loja:

1. **Balcão**: localizar item por referência ou nome, montar o pedido, aplicar desconto dentro da alçada, registrar
   a forma de pagamento, confirmar e ver a baixa no estoque.
2. **Cancelamento e estorno**: o que cada um faz com a reserva e com o saldo.
3. **Gestão**: entrada com custo, ajuste com motivo, estoque mínimo, promoções e metas da equipe.
4. **Direção**: comparação de períodos, metas e exportação do recorte.
5. **Acessos**: criar usuário, senha provisória, troca de senha, bloqueio e desbloqueio.
6. **Suporte**: abrir chamado pelo canal, com o que precisa estar na descrição.

### 4 · Piloto e início

| SBI · consultoria | Cliente · responsável da loja |
| --- | --- |
| Validar o fluxo completo, combinar a janela de virada, acompanhar os primeiros dias e entregar contatos e instruções de contingência. | Conferir saldo na virada, validar a primeira venda, aprovar a entrada e manter catálogo e acessos atualizados. |

## Aceite da implantação

A implantação é aceita quando todos os itens abaixo estão conferidos, com registro:

- [ ] Catálogo conferido: um produto por SKU, sem duplicidade, com preço e categoria revisados.
- [ ] Estoque inicial conferido na virada, com a contagem física batendo com o saldo do sistema.
- [ ] Perfis revisados: cada pessoa com a própria conta e o papel correto.
- [ ] Venda de ponta a ponta reproduzida pela equipe da loja, do balcão ao indicador da gestão.
- [ ] Treinamento concluído, com a lista de presentes.
- [ ] Canal de suporte testado pelo responsável da loja, com protocolo recebido.
- [ ] Contingência combinada: o que a loja faz se o sistema estiver fora, e como reconciliar depois
      ([disponibilidade-e-recuperacao.md](disponibilidade-e-recuperacao.md)).
- [ ] Responsabilidades da loja registradas: exatidão do catálogo e direito de uso das fotos.

## Ambiente do primeiro cliente

Para o piloto, **provisionar ambiente e banco por empresa**, com credenciais, mídias e backups separados. A
hierarquia do protótipo diferencia papéis e autoria, mas não identifica empresa: antes de reunir empresas numa
instalação compartilhada é preciso implementar identificação da empresa em consultas, relatórios, arquivos e
auditoria, com testes de isolamento próprios.

O cliente acessa pelo aplicativo. Credenciais diretas do PostgreSQL ficam restritas à operação autorizada.

### Acesso técnico de suporte

Proposta a validar com a área responsável antes de valer em contrato:

- acesso por chamado e finalidade, aprovado pelo responsável da loja;
- duração limitada, encerrando sozinho;
- conta individual, nunca compartilhada;
- MFA obrigatório para acessos administrativos;
- registro em auditoria, com o chamado que originou o acesso;
- credenciais em configuração segura do ambiente, nunca em arquivo versionado.

## O que depende do responsável pela operação

| Item | Responsável | Evidência necessária |
| --- | --- | --- |
| Região atendida e custo de deslocamento | Comercial | Tabela de regiões e condições |
| Cronograma com a loja | Consultoria e loja | Cronograma assinado |
| Provisionamento do ambiente isolado | Infraestrutura | Ambiente, banco e mídias por empresa |
| Política de acesso técnico com MFA | Segurança | Política aprovada e auditoria ligada |
| Anexo de tratamento de dados | Privacidade e jurídico | Anexo assinado com a loja |
