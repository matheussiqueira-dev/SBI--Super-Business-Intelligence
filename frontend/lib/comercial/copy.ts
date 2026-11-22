// Textos da pagina comercial, em um lugar so (plano comercial, secoes 03 a 06). Ficam em .ts para o teste
// unitario conferir a redacao aprovada sem montar React, e para a revisao comercial achar tudo de uma vez.
//
// Regra que vale para todo este arquivo: a pagina so promete o que o produto entrega hoje. Emissao fiscal,
// adquirencia, operacao offline, marketplaces e varias unidades aparecem como escopo a homologar, nunca como
// recurso incluido.

export const HERO = {
  headline: 'O mesmo número para toda a loja.',
  lead: 'O SBI conecta as vendas do balcão ao estoque e às metas. Sua equipe registra os pedidos, o gerente acompanha o saldo e a direção consulta os resultados da loja no mesmo sistema.',
  primary: { label: 'Solicitar cotação', href: '/#cotacao' },
  secondary: { label: 'Explorar demonstração', href: '/demo' },
  photoAlt: 'Gerente e vendedor conferem juntos o sistema no balcão de uma loja de eletrônicos.',
  photoCredit: 'Foto conceitual gerada para a proposta.',
} as const;

export const NAV = [
  { label: 'Produto', href: '/#produto' },
  { label: 'Implantação', href: '/#implantacao' },
  { label: 'Suporte', href: '/suporte' },
] as const;

/** Secao 04 do plano: o que muda depois de cada acao, na linguagem de quem trabalha na loja. */
export const MODULES = [
  {
    id: 'venda',
    kicker: 'Balcão',
    title: 'Venda no balcão',
    body: 'O vendedor encontra o item pelo código interno (SKU) ou pelo nome, confere disponibilidade e desconto e registra a venda. O pedido reserva as unidades na hora.',
    points: [
      'Busca por referência interna ou nome do produto.',
      'Preço e desconto calculados no servidor, com alçada por perfil.',
      'Pix, cartão ou boleto registrados como forma e situação de pagamento.',
    ],
    shot: { file: 'prova-venda', alt: 'Tela de nova venda do SBI com busca de produto, carrinho e total, com dados de demonstração.' },
  },
  {
    id: 'estoque',
    kicker: 'Estoque',
    title: 'Estoque atualizado pela operação',
    body: 'O pedido reserva os itens e a confirmação do pagamento registrada no SBI dá baixa no estoque. A gerência acompanha entradas, ajustes, estoque mínimo e alertas.',
    points: [
      'Entrada com custo e ajuste com motivo, sempre com autor registrado.',
      'Estoque mínimo e alerta de saldo baixo na visão do gerente.',
      'Extrato de movimentação por produto.',
    ],
    shot: { file: 'prova-estoque', alt: 'Tela de estoque do SBI com saldo, estoque mínimo e movimentações, com dados de demonstração.' },
  },
  {
    id: 'resultados',
    kicker: 'Gestão e direção',
    title: 'Resultados por perfil',
    body: 'O vendedor acompanha seu desempenho. O gerente vê a operação e as metas da equipe. A direção compara períodos e analisa faturamento, metas e produtos mais vendidos.',
    points: [
      'Metas da loja, por equipe e por vendedor.',
      'Comparação entre períodos, ranking de produtos e curva ABC.',
      'Exportação do recorte da tela em Excel e CSV.',
    ],
    shot: { file: 'prova-executivo', alt: 'Painel executivo do SBI com faturamento, metas e comparação de períodos, com dados de demonstração.' },
  },
] as const;

export const AUDIENCE = {
  title: 'Para qual loja o SBI faz sentido',
  lead: 'O primeiro público são lojas físicas de eletrônicos, acessórios e varejo especializado, começando por uma unidade com equipe de vendas e gestor responsável.',
  fits: [
    'Uma unidade com balcão, equipe de vendas e um gestor responsável pelo resultado.',
    'Catálogo com referência interna por item, mantido pela própria loja.',
    'Quem acompanha venda, saldo e meta e hoje reconcilia planilhas no fim do dia.',
  ],
  checks: [
    'Emissão fiscal e adquirência: o SBI registra forma e situação de pagamento. Manter o emissor fiscal ou a maquininha ao lado do SBI é o cenário previsto.',
    'Operação offline, marketplaces e várias unidades: escopos a homologar à parte, avaliados no diagnóstico.',
    'Importação em lote e conectores por API: fase posterior, estimada na proposta.',
  ],
} as const;

export const DEPLOYMENT = {
  title: 'Implantação com a sua equipe',
  lead: 'Um consultor conhece a rotina da sua loja, orienta a preparação do catálogo, conduz o treinamento presencial e acompanha o piloto. A proposta define região, cronograma e quais ferramentas podem funcionar em paralelo ou precisam de integração.',
  steps: [
    {
      title: 'Diagnóstico',
      sbi: 'Mapear atendimento, estoque, metas, volumes, localidade, sistema fiscal e meios de pagamento. Definir escopo e pré-requisitos.',
      store: 'Mostrar a rotina real e indicar quem aprova catálogo, acessos e início de operação.',
    },
    {
      title: 'Preparação',
      sbi: 'Configurar ambiente e perfis. Entregar modelo de catálogo com exemplo e checklist de validação.',
      store: 'Cadastrar e revisar produtos, referência, categoria, preço, saldo, custo e fotos autorizadas.',
    },
    {
      title: 'Treinamento presencial',
      sbi: 'Treinar balcão, gestão e direção com venda de teste, cancelamento, estoque, metas, acessos e abertura de chamado.',
      store: 'Participar com os responsáveis, testar com itens representativos e registrar dúvidas.',
    },
    {
      title: 'Piloto e início',
      sbi: 'Validar o fluxo completo, combinar a janela de virada e acompanhar os primeiros dias, com contatos e instruções de contingência.',
      store: 'Conferir saldo na virada, validar a primeira venda, aprovar a entrada e manter catálogo e acessos atualizados.',
    },
  ],
  note: 'A loja é responsável pela exatidão do catálogo e pelo direito de uso das fotos que enviar. O aceite da implantação pede catálogo e estoque inicial conferidos, perfis revisados, uma venda de ponta a ponta reproduzida, treinamento concluído e canal de suporte testado pelo responsável da loja.',
} as const;

export const DATA = {
  title: 'Dados da loja e acesso por perfil',
  lead: 'Controle quem vê os dados da loja. Cada pessoa usa sua própria conta e acessa as informações de acordo com seu perfil.',
  rows: [
    { role: 'Vendedor', access: 'Balcão, seus pedidos e seu desempenho. Documento do cliente aparece mascarado.' },
    { role: 'Gerente', access: 'Catálogo, estoque, promoções, relatórios e usuários da loja, respeitando as alçadas.' },
    { role: 'Direção', access: 'Indicadores executivos, metas e comparação de períodos do ambiente contratado.' },
    { role: 'Consultoria e suporte SBI', access: 'Acesso técnico por chamado e finalidade, aprovado, com duração limitada, conta individual, MFA e auditoria.' },
  ],
} as const;

export const FAQ = [
  {
    q: 'Quem cadastra os produtos?',
    a: 'A equipe da loja inclui o catálogo, com a referência interna, a foto e os dados de venda de cada item. O consultor fornece o roteiro e ajuda a validar uma amostra.',
  },
  {
    q: 'Posso continuar usando o sistema fiscal ou a maquininha?',
    a: 'Informe ao consultor as ferramentas que já usa. A proposta indica o que pode funcionar em paralelo e quais conexões precisam ser avaliadas. Emissão fiscal e processamento de pagamento não estão incluídos na oferta inicial.',
  },
  {
    q: 'Como recebo uma proposta?',
    a: 'Envie os dados da loja no formulário. A equipe comercial responde em até 24 horas úteis e, se precisar entender melhor a operação, combina um diagnóstico antes de fechar valores e prazo.',
  },
  {
    q: 'O SBI atende mais de uma loja?',
    a: 'A oferta inicial é por unidade. Gestão de várias unidades em um só ambiente depende de homologação específica e entra no diagnóstico.',
  },
  {
    q: 'A demonstração usa dados reais?',
    a: 'Não. A demonstração roda no seu navegador com catálogo e dados sintéticos, sem cadastro e sem login, e nada do que você faz nela é gravado.',
  },
] as const;

export const QUOTE = {
  title: 'Vamos entender a sua loja.',
  lead: 'Envie seus dados para solicitar uma cotação. Nossa equipe responde em até 24 horas úteis com os próximos passos.',
  submit: 'Enviar solicitação',
  consent: 'Usaremos estes dados para responder à sua solicitação.',
  unavailableTitle: 'Solicitação pela página indisponível',
} as const;

export const FOOTER = {
  product: 'SBI — Super Business Intelligence',
  tagline: 'Venda no balcão, estoque e metas no mesmo registro.',
} as const;

/** Rotas da oferta comercial. Suporte, status e privacidade tambem aceitam link externo configurado. */
export const ROUTES = {
  home: '/',
  quote: '/#cotacao',
  login: '/entrar',
  demo: '/demo',
  privacy: '/privacidade',
  support: '/suporte',
} as const;
