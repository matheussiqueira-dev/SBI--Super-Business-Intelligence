// Parametros comerciais da loja ficticia da demonstracao (secao 3 do plano de evolucao). Tudo aqui e dado sintetico
// para demonstracao: nao representa uma empresa real nem media comprovada de mercado. As metas sao o ponto de partida
// do plano; a demonstracao permite editar metas por periodo sem alterar estes valores.

/** Semente da base: a mesma loja em toda apresentacao e em todo teste. */
export const DEMO_SEED = 20_261_204;

/** Meses de historico gerados, terminando no mes de hoje (24 = o ano anterior inteiro e o ano corrente ate hoje). */
export const HISTORY_MONTHS = 24;

export const STORE = {
  name: 'Loja Modelo SBI',
  segment: 'Moda casual e acessórios',
  size: 'Pequena empresa varejista',
  units: 1,
  city: 'Fortaleza (CE)',
  openWeekdays: 'segunda a sábado',
} as const;

/** Plano comercial mensal: valores iniciais da secao 3.1, nao constantes do sistema. */
export const MONTHLY_PLAN = {
  /** Dias de funcionamento previstos no mes, base do plano. */
  operatingDays: 26,
  netRevenue: 60_000,
  salesCount: 400,
  averageTicket: 150,
  grossMarginPercent: 35,
  grossProfit: 21_000,
  cogs: 39_000,
  itemsPerSale: 1.6,
  items: 640,
  conversionPercent: 25,
  perSeller: 20_000,
} as const;

/** Meta anual da loja no ano corrente (plano mensal somado = R$ 708.000; a meta anual e a ambicao arredondada). */
export const ANNUAL_GOAL = 720_000;

/** Meta da loja por mes do ano (indice 0 = janeiro): baixa temporada no inicio do ano e pico em dezembro. */
export const STORE_GOAL_BY_MONTH: readonly number[] = [
  52_000, 52_000, 56_000, 58_000, 60_000, 56_000, 60_000, 60_000, 62_000, 60_000, 60_000, 72_000,
];

/** Ano anterior com metas menores (a loja cresceu): fator aplicado sobre a meta do mes. */
export const PREVIOUS_YEAR_GOAL_FACTOR = 0.88;

export type DemoRoleName = 'CEO' | 'GERENTE' | 'VENDEDOR';

export interface ScenarioPerson {
  id: number;
  name: string;
  role: DemoRoleName;
  managerId: number | null;
  /** Rotulo do posto na demonstracao ("Vendedor 01"), usado no seletor e no roteiro. */
  slot: string | null;
  title: string;
}

/**
 * Equipe da loja: 1 CEO, 1 gerente e 3 vendedores. O gerente acompanha a operacao e nao registra vendas na
 * demonstracao, entao o realizado da loja e exatamente a soma dos tres vendedores (secao 4.2).
 */
export const PEOPLE: readonly ScenarioPerson[] = [
  { id: 1, name: 'Regina Alencar', role: 'CEO', managerId: null, slot: null, title: 'CEO e proprietária' },
  { id: 2, name: 'Marina Duarte', role: 'GERENTE', managerId: null, slot: null, title: 'Gerente da loja' },
  { id: 3, name: 'Bruno Teixeira', role: 'VENDEDOR', managerId: 2, slot: 'Vendedor 01', title: 'Vendedor' },
  { id: 4, name: 'Carla Nogueira', role: 'VENDEDOR', managerId: 2, slot: 'Vendedor 02', title: 'Vendedora' },
  { id: 5, name: 'Diego Matos', role: 'VENDEDOR', managerId: 2, slot: 'Vendedor 03', title: 'Vendedor' },
];

export const SELLER_IDS: readonly number[] = PEOPLE.filter(person => person.role === 'VENDEDOR').map(person => person.id);
export const MANAGER_ID = 2;
export const CEO_ID = 1;

export interface ScenarioCategory {
  id: number;
  name: string;
  /** Participacao alvo nos pedidos (peso relativo do produto principal da sacola). */
  orderWeight: number;
  /** Participacao alvo na receita, para conferir o mix na documentacao. */
  revenueWeight: number;
}

export const CATEGORIES: readonly ScenarioCategory[] = [
  { id: 1, name: 'Camisetas', orderWeight: 40, revenueWeight: 30 },
  { id: 2, name: 'Calças', orderWeight: 16, revenueWeight: 23 },
  { id: 3, name: 'Bermudas', orderWeight: 13, revenueWeight: 11 },
  { id: 4, name: 'Vestidos', orderWeight: 7, revenueWeight: 12 },
  { id: 5, name: 'Acessórios', orderWeight: 24, revenueWeight: 24 },
];

/** Categorias oferecidas como item adicional na mesma venda (venda casada do varejo). */
export const ADD_ON_CATEGORY_IDS: readonly number[] = [5, 1];

/** Probabilidade de a venda levar um segundo item, antes do ajuste de calibracao. */
export const ADD_ON_CHANCE = 0.52;

/** Faixa aceita da receita de tabela sobre o liquido alvo; fora dela o gerador adiciona ou remove itens adicionais. */
export const GROSS_OVER_NET_RANGE = { min: 1.05, max: 1.0615 } as const;

/** Produto e mes (indice do mes mais antigo gerado) sem custo informado, para exercitar o estado "Nao informado". */
export const MISSING_COST_SKU = 'ACE-011';

/** [sku, nome, categoria, preco de venda, preco de compra, giro relativo]. Preco de compra = custo medio do estoque. */
type ProductRow = readonly [string, string, number, number, number, number];

export const PRODUCT_ROWS: readonly ProductRow[] = [
  ['CAM-001', 'Camiseta Básica Branca', 1, 69.9, 43.2, 10],
  ['CAM-002', 'Camiseta Básica Preta', 1, 69.9, 43.2, 10],
  ['CAM-003', 'Camiseta Gola V Cinza', 1, 74.9, 46.8, 8],
  ['CAM-004', 'Camiseta Estampada Surf', 1, 89.9, 55.5, 7],
  ['CAM-005', 'Camiseta Listrada Marinho', 1, 84.9, 77.5, 6],
  ['CAM-006', 'Camiseta Oversized Areia', 1, 99.9, 61.9, 6],
  ['CAM-007', 'Camiseta Polo Piquê Azul', 1, 119.9, 74.3, 5],
  ['CAM-008', 'Camiseta Polo Piquê Branca', 1, 119.9, 74.3, 4],
  ['CAM-009', 'Camiseta Manga Longa Verde', 1, 94.9, 58.8, 4],
  ['CAM-010', 'Camiseta Básica Vinho', 1, 69.9, 43.2, 5],
  ['CAM-011', 'Camiseta Dry Fit Grafite', 1, 109.9, 68.1, 4],
  ['CAM-012', 'Camiseta Estampada Tropical', 1, 89.9, 55.5, 5],
  ['CAM-013', 'Camiseta Infantil Lisa', 1, 59.9, 37.1, 6],
  ['CAM-014', 'Camiseta Regata Branca', 1, 59.9, 37.1, 5],
  ['CAL-001', 'Calça Jeans Reta Azul', 2, 189.9, 129.1, 9],
  ['CAL-002', 'Calça Jeans Skinny Escura', 2, 199.9, 135.9, 8],
  ['CAL-003', 'Calça Jeans Wide Leg', 2, 219.9, 149.5, 6],
  ['CAL-004', 'Calça Sarja Bege', 2, 169.9, 115.5, 7],
  ['CAL-005', 'Calça Sarja Verde Militar', 2, 169.9, 115.5, 5],
  ['CAL-006', 'Calça Alfaiataria Preta', 2, 239.9, 163.1, 5],
  ['CAL-007', 'Calça Moletom Cinza', 2, 149.9, 101.9, 6],
  ['CAL-008', 'Calça Jogger Preta', 2, 159.9, 108.7, 5],
  ['CAL-009', 'Calça Jeans Mom Clara', 2, 209.9, 142.7, 5],
  ['CAL-010', 'Calça Legging Preta', 2, 139.9, 95.1, 7],
  ['CAL-011', 'Calça Pantalona Off White', 2, 229.9, 156.3, 3],
  ['CAL-012', 'Calça Cargo Caqui', 2, 199.9, 135.9, 4],
  ['BER-001', 'Bermuda Jeans Clara', 3, 129.9, 84.4, 7],
  ['BER-002', 'Bermuda Sarja Areia', 3, 119.9, 77.9, 6],
  ['BER-003', 'Bermuda Sarja Marinho', 3, 119.9, 77.9, 6],
  ['BER-004', 'Bermuda Moletom Cinza', 3, 109.9, 71.4, 5],
  ['BER-005', 'Bermuda Tactel Praia', 3, 89.9, 58.4, 6],
  ['BER-006', 'Bermuda Alfaiataria Preta', 3, 139.9, 90.9, 3],
  ['BER-007', 'Bermuda Jeans Destroyed', 3, 134.9, 87.7, 4],
  ['BER-008', 'Bermuda Linho Off White', 3, 139.9, 90.9, 3],
  ['BER-009', 'Bermuda Infantil Estampada', 3, 79.9, 51.9, 4],
  ['BER-010', 'Bermuda Ciclista Preta', 3, 99.9, 64.9, 4],
  ['VES-001', 'Vestido Midi Floral', 4, 219.9, 131.9, 6],
  ['VES-002', 'Vestido Curto Liso Preto', 4, 179.9, 107.9, 6],
  ['VES-003', 'Vestido Longo Estampado', 4, 279.9, 167.9, 4],
  ['VES-004', 'Vestido Tubinho Marinho', 4, 199.9, 119.9, 5],
  ['VES-005', 'Vestido Chemise Jeans', 4, 239.9, 143.9, 4],
  ['VES-006', 'Vestido Tricot Bege', 4, 229.9, 209.9, 3],
  ['VES-007', 'Vestido Linho Off White', 4, 259.9, 155.9, 3],
  ['VES-008', 'Vestido Curto Canelado', 4, 159.9, 95.9, 5],
  ['VES-009', 'Vestido Transpassado Verde', 4, 209.9, 125.9, 4],
  ['VES-010', 'Vestido Festa Plissado', 4, 299.9, 179.9, 2],
  ['ACE-001', 'Cinto de Couro Marrom', 5, 89.9, 48.5, 7],
  ['ACE-002', 'Cinto de Couro Preto', 5, 89.9, 48.5, 7],
  ['ACE-003', 'Boné Aba Curva Preto', 5, 69.9, 37.7, 9],
  ['ACE-004', 'Boné Trucker Marinho', 5, 74.9, 40.4, 6],
  ['ACE-005', 'Meia Esportiva (par)', 5, 24.9, 13.4, 12],
  ['ACE-006', 'Meia Social (kit com 3)', 5, 44.9, 24.2, 8],
  ['ACE-007', 'Carteira de Couro', 5, 109.9, 59.3, 5],
  ['ACE-008', 'Óculos de Sol Quadrado', 5, 119.9, 64.7, 5],
  ['ACE-009', 'Bolsa Transversal Caramelo', 5, 189.9, 102.5, 4],
  ['ACE-010', 'Mochila Casual Preta', 5, 199.9, 107.9, 4],
  ['ACE-011', 'Lenço Estampado', 5, 49.9, 26.9, 4],
  ['ACE-012', 'Pulseira de Couro', 5, 39.9, 21.5, 5],
  ['ACE-013', 'Gorro de Tricot', 5, 54.9, 29.6, 3],
  ['ACE-014', 'Chinelo Slide Preto', 5, 79.9, 43.1, 8],
  ['ACE-015', 'Necessaire Estampada', 5, 59.9, 32.3, 3],
  ['ACE-016', 'Guarda-chuva Compacto', 5, 64.9, 35.0, 2],
];

/** Pontas de estoque: preco de compra alto deixa a margem abaixo de 10% e o painel do CEO avisa. */
export const CLEARANCE_SKUS: readonly string[] = ['CAM-005', 'VES-006'];

/** Produtos com o disponivel abaixo do estoque minimo, para o alerta operacional do gerente. */
export const LOW_STOCK_SKUS: readonly string[] = ['CAL-001', 'CAM-001', 'ACE-005', 'VES-002', 'BER-005'];

/** Produtos fora de linha (inativos), para a tela nao supor que todo cadastro esta a venda. */
export const INACTIVE_SKUS: readonly string[] = ['ACE-016', 'CAM-014'];

/**
 * Cenario de referencia do mes fechado (secao 4.2): a base sintetica e calibrada para reconciliar exatamente estes
 * valores no ultimo mes completo, e os demais meses variam em torno do plano.
 */
export const REFERENCE_MONTH = {
  storeGoal: 60_000,
  netRevenue: 56_700,
  achievementPercent: 94.5,
  orders: 378,
  averageTicket: 150,
  perSeller: [
    { id: 3, netRevenue: 17_300, orders: 118 },
    { id: 4, netRevenue: 18_900, orders: 126 },
    { id: 5, netRevenue: 20_500, orders: 134 },
  ],
} as const;

/** Receita de tabela gerada sobre o liquido alvo: a diferenca vira desconto comercial (cerca de 5,8% da tabela). */
export const GROSS_OVER_NET = 1.061;

/** Teto de desconto por pedido na base sintetica (promocao somada ao desconto manual dentro da alcada). */
export const MAX_ORDER_DISCOUNT_RATE = 0.2;

/** Formas de pagamento e participacao alvo no varejo da loja. */
export const PAYMENT_MIX: readonly { method: 'PIX' | 'CARD' | 'BOLETO'; weight: number }[] = [
  { method: 'PIX', weight: 42 },
  { method: 'CARD', weight: 52 },
  { method: 'BOLETO', weight: 6 },
];

/** Peso de movimento por dia da semana (0 = domingo, fechado): sabado e o dia mais forte. */
export const WEEKDAY_WEIGHT: readonly number[] = [0, 0.78, 0.86, 0.94, 1.0, 1.26, 1.52];

/** Faixa de conversao diaria (compradores / visitantes) usada para gerar os visitantes sinteticos. */
export const CONVERSION_RANGE = { min: 0.21, max: 0.29 } as const;

/** Nomes sinteticos de clientes da base (combinados em nome completo pelo gerador). */
export const CUSTOMER_FIRST_NAMES: readonly string[] = [
  'Ana', 'Beatriz', 'Carlos', 'Daniela', 'Eduardo', 'Fernanda', 'Gustavo', 'Helena', 'Igor', 'Juliana',
  'Kleber', 'Larissa', 'Marcos', 'Natália', 'Otávio', 'Patrícia', 'Rafael', 'Sabrina', 'Thiago', 'Vanessa',
  'William', 'Yara', 'Bruno', 'Camila', 'Diego', 'Elisa', 'Felipe', 'Gabriela', 'Henrique', 'Isabela',
];
export const CUSTOMER_LAST_NAMES: readonly string[] = [
  'Almeida', 'Barbosa', 'Cavalcante', 'Dias', 'Esteves', 'Freitas', 'Gomes', 'Holanda', 'Ibiapina', 'Lima',
  'Martins', 'Nunes', 'Oliveira', 'Pinheiro', 'Queiroz', 'Rocha', 'Sales', 'Teixeira', 'Vasconcelos', 'Xavier',
];

/** Quantidade de clientes da base sintetica. */
export const CUSTOMER_COUNT = 240;

export const DEMO_NOTICE = 'Ambiente de Demonstração — Dados Simulados';
