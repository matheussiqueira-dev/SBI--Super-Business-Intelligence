# Operação de suporte

Recepção, triagem, escala, escalonamento, atualizações e passagem de plantão. Especificação de origem: seção 09
do plano comercial.

> **Antes de anunciar cobertura contínua.** `NEXT_PUBLIC_SBI_SUPORTE_COBERTURA=continuo` publica "Suporte remoto
> 24 horas, todos os dias". Só configure isso depois que escala, canais e medição estiverem em operação e o teste
> de P1 fora do expediente tiver passado. Sem isso, o padrão publica "Abra chamados a qualquer hora", que é o que
> de fato existe quando há apenas abertura contínua de chamados.

## Porta de entrada

- **Central de chamados hospedada fora do ambiente operacional**, com protocolo, nome da loja, descrição, horário
  e impacto. Fora do ambiente de propósito: ela precisa abrir quando o aplicativo não abre.
- **Número de plantão** como contingência para incidente crítico, quando a central não estiver acessível.
- **Página de status independente**, em domínio próprio, para atualizações de disponibilidade — inclusive se login
  e API falharem.

Os três são configuráveis (`NEXT_PUBLIC_SBI_SUPORTE_URL`, `NEXT_PUBLIC_SBI_PLANTAO_TELEFONE`,
`NEXT_PUBLIC_SBI_STATUS_URL`). Canal não configurado não vira link morto: some da navegação ou aparece com a
indisponibilidade escrita.

O canal de suporte recebe **somente os dados necessários para a triagem**: o que aconteceu, em que tela, a partir
de que horário e quantas pessoas estão afetadas. Nunca senha, documento completo de cliente ou captura com dados
pessoais que não sejam necessários ao diagnóstico.

## Prioridades e metas propostas

| Prioridade | Exemplo | Primeira resposta humana | Atualização ou encaminhamento |
| --- | --- | --- | --- |
| P1 · Operação parada | Loja sem registrar vendas ou muitos usuários sem conseguir entrar | Até 15 min, 24/7 | Atualizar a cada 30 min durante o incidente |
| P2 · Operação degradada | Estoque desatualizado ou tarefa parcialmente indisponível, com alternativa temporária | Até 1 h, 24/7 | Atualizar a cada 2 h enquanto houver impacto |
| P3 · Dúvida ou solicitação | Cadastro, relatório, orientação ou mudança de configuração | Triagem humana até 2 h, 24/7 | Encaminhar ao especialista em até 4 h úteis |

São **metas iniciais a validar com a equipe**, não compromisso de contrato. Viram compromisso depois de
dimensionar o plantão pelo volume e medir o cumprimento por pelo menos um ciclo.

**Primeira resposta, atualização e resolução são medidas diferentes.** A primeira resposta é o contato humano que
assume o chamado — não o aviso automático de abertura.

## Cobertura de pessoas

- Escala semanal com **titular, suplente e responsável pelo incidente**.
- **Nível 1** confirma impacto e comunica. **Nível 2** diagnostica e recupera. **Nível 3** aciona engenharia,
  privacidade ou fornecedor.
- O titular confirma o alerta. **Sem confirmação, o sistema escala ao suplente e depois ao responsável pelo
  incidente** — o escalonamento é automático, não depende de alguém perceber.
- A passagem de turno lista chamados abertos, o que já foi tentado e a próxima ação de cada um.

## Roteiro de incidente

1. Receber ou detectar.
2. Confirmar impacto (quantas lojas, quantas pessoas, o que parou).
3. Classificar a prioridade.
4. Avisar o cliente e publicar status quando o impacto for geral.
5. Aplicar contingência ou restaurar.
6. Verificar a operação com quem abriu o chamado.
7. Fechar com registro.

Para P1, documentar causa, duração, correção e responsável pela prevenção. Pedir evidências **sem senhas e sem
documentos completos**.

## Medição

Acompanhar, por prioridade: cumprimento da primeira resposta, tempo de restauração, reincidência e
disponibilidade. Medir a página comercial separadamente do caminho de login e venda.

**Antes de anunciar a cobertura**, simular um P1 fora do expediente e conferir, de ponta a ponta: alerta disparado,
titular não confirma, escalonamento para o suplente, atualização pública publicada e retorno ao cliente. O
resultado dessa simulação é a evidência que libera a redação de cobertura contínua na página.

## Fila comercial e fila de suporte são coisas diferentes

A fila de cotação ([cotacao-e-fila.md](cotacao-e-fila.md)) atende quem ainda não é cliente e tem prazo em horas
úteis. A fila de suporte atende quem já opera e tem prazo em minutos ou horas corridas, por prioridade. Não as
misture no mesmo canal: prospecção e atendimento a cliente têm donos e prazos diferentes.

## O que depende do responsável pela operação

| Item | Responsável | Evidência necessária |
| --- | --- | --- |
| Contratação da central de chamados | Operação | Central no ar, fora do ambiente da aplicação |
| Página de status em domínio próprio | Infraestrutura | Status acessível com a aplicação fora |
| Escala com titular, suplente e responsável | Suporte | Escala publicada e alertas configurados |
| Teste de P1 fora do expediente | Suporte e engenharia | Registro da simulação, com tempos medidos |
| Publicar a cobertura 24/7 | Produto e suporte | Os quatro itens acima concluídos |
