import type { Metadata } from 'next';
import Link from 'next/link';
import TextPage from '../../components/comercial/text-page.tsx';
import { channels, indexable, privacyStage, siteOrigin } from '../../lib/comercial/config.ts';
import { ROUTES } from '../../lib/comercial/copy.ts';
import { calendarFromEnv, RESPONSE_HOURS } from '../../lib/leads/calendar.ts';
import '../comercial.css';

/**
 * Aviso de Privacidade (plano comercial, secao 08).
 *
 * A pagina publica so afirma o que esta confirmado. Sem a entidade responsavel e o canal de atendimento nas
 * variaveis (NEXT_PUBLIC_SBI_PRIVACIDADE_*), ela aparece identificada como versao de homologacao, com a lista do
 * que a equipe precisa validar antes de publicar -- em vez de inventar um controlador, uma base legal ou um prazo.
 *
 * A divisao de papeis segue o que o plano levantou e ainda depende de contrato: a loja tende a ser controladora
 * dos dados operacionais de clientes e funcionarios, com o SBI operando sob suas instrucoes; os contatos
 * comerciais da cotacao tem finalidade propria do SBI, que ai e controlador.
 */
export async function generateMetadata(): Promise<Metadata> {
  const origin = siteOrigin();
  return {
    title: 'Aviso de Privacidade',
    description: 'Como o SBI trata dados pessoais da operação da loja e dos contatos comerciais.',
    robots: indexable() ? { index: true, follow: true } : { index: false, follow: false },
    ...(origin ? { alternates: { canonical: `${origin}${ROUTES.privacy}` } } : {}),
  };
}

const PENDING = [
  'Entidade responsável pelo tratamento, com razão social e inscrição.',
  'Canal de atendimento ao titular e responsável por responder.',
  'Base legal de cada finalidade, incluindo a captação comercial.',
  'Prazo de retenção por categoria de dado e critério de descarte.',
  'Operadores contratados, com a finalidade de cada um e eventual transferência internacional.',
  'Procedimento de saída: exportação, devolução e eliminação ao fim do contrato.',
  'Fluxo de incidente: quem avalia risco, quem comunica a ANPD e os titulares, e em que prazo.',
];

export default function PrivacyPage() {
  const stage = privacyStage();
  const { salesEmail } = channels();
  const calendar = calendarFromEnv();
  const entity = (process.env.NEXT_PUBLIC_SBI_PRIVACIDADE_ENTIDADE ?? '').trim();
  const contact = (process.env.NEXT_PUBLIC_SBI_PRIVACIDADE_CONTATO ?? '').trim() || salesEmail || '';
  const updated = (process.env.NEXT_PUBLIC_SBI_PRIVACIDADE_ATUALIZADO ?? '').trim();

  return (
    <TextPage>
      <h1>Aviso de Privacidade</h1>

      {stage === 'homologacao' && (
        <div className="c-stage" role="note">
          <p><strong>Versão de homologação.</strong> Este texto descreve o tratamento previsto e ainda não é o aviso publicado. A equipe responsável valida e confirma os itens listados em “O que falta confirmar” antes da publicação.</p>
        </div>
      )}

      <p>
        {entity
          ? <>Responsável pelo tratamento: <strong>{entity}</strong>.</>
          : <>A entidade responsável pelo tratamento ainda não foi confirmada para publicação.</>}
        {updated && <> Última atualização: {updated}.</>}
      </p>

      <h2>Dois conjuntos de dados, duas responsabilidades</h2>
      <p>
        O SBI trata dois conjuntos de dados com papéis diferentes, e a divisão vale por finalidade e por contrato.
      </p>
      <h3>Dados da operação da loja</h3>
      <p>
        Cadastro de clientes, pedidos, pagamentos registrados, catálogo, estoque, metas, contas de usuário e trilha
        de auditoria. A loja define as finalidades desses dados e tende a ser a controladora. O SBI os trata sob as
        instruções da loja, como operador, para fornecer e manter o sistema, e registra em contrato o que pode fazer
        com eles.
      </p>
      <h3>Contatos comerciais</h3>
      <p>
        Nome, empresa, e-mail, cidade/UF e, quando informados, segmento, WhatsApp e mensagem enviados no formulário
        de cotação. Aqui a finalidade é do próprio SBI — responder à solicitação, preparar a proposta e manter o
        registro do atendimento — e o SBI atua como controlador. O conteúdo do formulário não é enviado a
        ferramentas de analytics nem gravado em log de aplicação.
      </p>

      <h2>Acesso por perfil</h2>
      <p>
        Cada pessoa usa a própria conta. O perfil decide o que ela vê: o vendedor acessa o balcão, seus pedidos e seu
        desempenho, com documento de cliente mascarado; o gerente acessa catálogo, estoque, relatórios e usuários da
        loja; a direção acessa os indicadores executivos do ambiente contratado. A API confere o perfil em toda
        requisição, não apenas na tela.
      </p>
      <p>
        O acesso técnico da consultoria e do suporte do SBI é por chamado e finalidade, aprovado pelo responsável da
        loja, com duração limitada, conta individual, autenticação em dois fatores para acessos administrativos e
        registro em auditoria.
      </p>

      <h2>Prazo de resposta ao contato comercial</h2>
      <p>
        Uma solicitação de cotação recebe confirmação automática com protocolo e uma primeira resposta humana em até{' '}
        {RESPONSE_HOURS} horas úteis, contadas na janela de atendimento configurada ({calendar.timeZone}). A
        confirmação automática e a primeira resposta humana são eventos distintos.
      </p>

      <h2>Direitos do titular</h2>
      <p>
        A LGPD assegura ao titular confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação,
        portabilidade, informação sobre compartilhamento e revisão de decisões automatizadas. Para dados da operação
        da loja, o pedido é encaminhado à loja, que é quem define as finalidades. Para contatos comerciais, o pedido
        é atendido diretamente pelo SBI.
      </p>
      <p>
        {contact
          ? <>Canal de atendimento ao titular: <a href={`mailto:${contact}`}>{contact}</a>.</>
          : <>O canal de atendimento ao titular será publicado junto com a versão final deste aviso.</>}
      </p>

      <h2>Incidentes</h2>
      <p>
        Em caso de incidente de segurança com dados pessoais, o suporte preserva evidências, limita o impacto e avisa
        prontamente o responsável da loja quando envolver dados operacionais. A avaliação de risco ou dano relevante
        e as comunicações exigidas à ANPD e aos titulares cabem ao controlador, nos prazos aplicáveis.
      </p>

      <h2>O que falta confirmar</h2>
      <p>Itens que a equipe responsável valida antes de publicar a versão definitiva:</p>
      <ul>{PENDING.map(item => <li key={item}>{item}</li>)}</ul>

      <h2>Referências</h2>
      <ul>
        <li>
          <a href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm" rel="noreferrer">
            Lei 13.709/2018 (LGPD), artigos 5º, 6º, 7º, 18, 46 e 48
          </a>
        </li>
        <li>
          <a href="https://www.gov.br/anpd/pt-br/assuntos/noticias/nova-versao-do-guia-dos-agentes-de-tratamento" rel="noreferrer">
            ANPD · Guia de agentes de tratamento
          </a>
        </li>
        <li>
          <a href="https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis" rel="noreferrer">
            ANPD · Comunicação de incidente de segurança
          </a>
        </li>
      </ul>

      <p><Link href={ROUTES.home}>Voltar para a página inicial</Link> · <Link href={ROUTES.support}>Canais de suporte</Link></p>
    </TextPage>
  );
}
