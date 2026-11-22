import type { Metadata } from 'next';
import Link from 'next/link';
import TextPage from '../../components/comercial/text-page.tsx';
import { channels, indexable, siteOrigin, supportCoverage, SUPPORT_TEXT } from '../../lib/comercial/config.ts';
import { ROUTES } from '../../lib/comercial/copy.ts';
import '../comercial.css';

/**
 * Pagina de suporte (plano comercial, secao 09). Existe para ser a porta de entrada mesmo quando o aplicativo
 * esta fora: e estatica, nao chama a API e aponta para a central e o status, que ficam em dominios proprios.
 *
 * As metas da tabela sao as metas propostas no plano, identificadas como tal. A redacao de cobertura continua
 * vinda de NEXT_PUBLIC_SBI_SUPORTE_COBERTURA: "Suporte remoto 24 horas" so aparece quando a equipe declara que
 * escala e canais estao operando.
 */
export async function generateMetadata(): Promise<Metadata> {
  const origin = siteOrigin();
  return {
    title: 'Suporte',
    description: 'Como abrir um chamado do SBI, o que cada prioridade significa e onde acompanhar a disponibilidade.',
    robots: indexable() ? { index: true, follow: true } : { index: false, follow: false },
    ...(origin ? { alternates: { canonical: `${origin}${ROUTES.support}` } } : {}),
  };
}

const PRIORITIES = [
  {
    level: 'P1 · Operação parada',
    example: 'A loja não registra vendas ou várias pessoas não conseguem entrar.',
    first: 'Até 15 min, 24/7',
    update: 'Atualização a cada 30 min durante o incidente',
  },
  {
    level: 'P2 · Operação degradada',
    example: 'Estoque desatualizado ou uma tarefa parcialmente indisponível, com alternativa temporária.',
    first: 'Até 1 h, 24/7',
    update: 'Atualização a cada 2 h enquanto houver impacto',
  },
  {
    level: 'P3 · Dúvida ou solicitação',
    example: 'Cadastro, relatório, orientação ou mudança de configuração.',
    first: 'Triagem até 2 h, 24/7',
    update: 'Encaminhamento ao especialista em até 4 h úteis',
  },
];

export default function SupportPage() {
  const { supportUrl, statusUrl, dutyPhone, salesEmail } = channels();
  const coverage = supportCoverage();
  const support = SUPPORT_TEXT[coverage];

  return (
    <TextPage>
      <h1>Suporte</h1>
      <p>{support.title} {support.body}</p>

      <h2>Onde abrir o chamado</h2>
      <ul>
        {supportUrl
          ? <li><a href={supportUrl} rel="noreferrer">Central de chamados do SBI</a> — registre loja, descrição, horário e impacto. A central devolve um número de protocolo.</li>
          : <li>A central de chamados ainda não foi publicada. Enquanto isso, use o contato comercial abaixo para falar com a equipe.</li>}
        {statusUrl
          ? <li><a href={statusUrl} rel="noreferrer">Página de status</a> — disponibilidade e andamento de incidentes, em domínio próprio, acessível mesmo se o aplicativo estiver fora.</li>
          : <li>A página de status ainda não foi publicada.</li>}
        {dutyPhone && <li><a href={`tel:${dutyPhone}`}>Plantão para operação parada</a> — contingência quando a central não estiver acessível.</li>}
        {salesEmail && <li><a href={`mailto:${salesEmail}`}>{salesEmail}</a> — assuntos comerciais e de proposta.</li>}
      </ul>
      <p>
        Envie no chamado apenas o necessário para a triagem: o que aconteceu, em que tela, a partir de que horário e
        quantas pessoas estão afetadas. Não envie senha, documento completo de cliente nem imagem de tela com dados
        pessoais que não sejam necessários ao diagnóstico.
      </p>

      <h2>Prioridades e metas propostas</h2>
      <p>
        As metas abaixo são as propostas do plano comercial e valem como compromisso depois que a equipe confirmar a
        escala de plantão e medir o cumprimento. Primeira resposta, atualização e resolução são medidas diferentes:
        a primeira resposta é o contato humano que assume o chamado, não o aviso automático de abertura.
      </p>
      <table>
        <thead>
          <tr><th scope="col">Prioridade</th><th scope="col">Exemplo</th><th scope="col">Primeira resposta humana</th><th scope="col">Atualização ou encaminhamento</th></tr>
        </thead>
        <tbody>
          {PRIORITIES.map(row => (
            <tr key={row.level}>
              <td><strong>{row.level}</strong></td>
              <td>{row.example}</td>
              <td>{row.first}</td>
              <td>{row.update}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Como o chamado anda</h2>
      <ol>
        <li>Recepção e registro, com protocolo.</li>
        <li>Triagem humana: confirmar o impacto e classificar a prioridade.</li>
        <li>Atendimento: nível 1 comunica, nível 2 diagnostica e recupera, nível 3 aciona engenharia, privacidade ou fornecedor.</li>
        <li>Atualizações ao cliente no intervalo da prioridade e status público quando o impacto for geral.</li>
        <li>Fechamento com registro. Em P1, também causa, duração, correção e responsável pela prevenção.</li>
      </ol>

      <h2>Enquanto a operação estiver parada</h2>
      <p>
        O procedimento de contingência do balcão é combinado na implantação, junto com os meios fiscais e de pagamento
        que a loja já usa. Cada transação feita fora do sistema é identificada e reconciliada depois do retorno, para
        não gerar lançamento duplicado de pedido ou de estoque.
      </p>

      <p><Link href={ROUTES.home}>Voltar para a página inicial</Link> · <Link href={ROUTES.privacy}>Aviso de Privacidade</Link> · <Link href={ROUTES.login}>Entrar no SBI</Link></p>
    </TextPage>
  );
}
