// Cenário de demonstração da loja. Vendas, metas e estoque são simulados a partir do catálogo Apple da massa Olist.

/** Semente da base: a mesma loja em toda apresentacao e em todo teste. */
export const DEMO_SEED = 20_261_204;

/** Meses de historico gerados, terminando no mes de hoje (24 = o ano anterior inteiro e o ano corrente ate hoje). */
export const HISTORY_MONTHS = 24;

export const STORE = {
  name: 'Loja Modelo SBI',
  segment: 'Produtos Apple e acessórios',
  size: 'Pequena empresa varejista',
  units: 1,
  city: 'Fortaleza (CE)',
  openWeekdays: 'segunda a sábado',
} as const;

/** Plano comercial da loja. Valores de referência para derivar as metas operacionais. */
export const MONTHLY_PLAN = {
  operatingDays: 26,
  salesCount: 30,
  averageTicket: 2_000,
  itemsPerSale: 1.4,
  conversionPercent: 25,
} as const;

/** Meta anual da loja. */
export const ANNUAL_GOAL = 720_000;

/** Meta da loja por mês, com pico em dezembro. */
export const STORE_GOAL_BY_MONTH: readonly number[] = [
  52_000, 52_000, 56_000, 58_000, 60_000, 56_000, 60_000, 60_000, 62_000, 60_000, 60_000, 72_000,
];

export const PREVIOUS_YEAR_GOAL_FACTOR = 0.88;

export type DemoRoleName = 'CEO' | 'GERENTE' | 'VENDEDOR';

export interface ScenarioPerson {
  id: number;
  name: string;
  role: DemoRoleName;
  managerId: number | null;
}

/** Nomes de exibição da equipe. Os vínculos e os IDs são usados somente na simulação. */
export const PEOPLE: readonly ScenarioPerson[] = [
  { id: 1, name: 'Paulo Thiago Gomes Da Silva', role: 'CEO', managerId: null },
  { id: 2, name: 'Matheus Siqueira', role: 'GERENTE', managerId: null },
  { id: 3, name: 'Allan Barros', role: 'VENDEDOR', managerId: 2 },
  { id: 4, name: 'Francisco Ferreira', role: 'VENDEDOR', managerId: 5 },
  { id: 5, name: 'Gabriel Sousa', role: 'GERENTE', managerId: null },
  { id: 6, name: 'Christian Felix Gbedande Azonyetin', role: 'CEO', managerId: null },
  { id: 7, name: 'Bruno Marciano De Amorim Josino', role: 'CEO', managerId: null },
];

export const PEOPLE_BY_ROLE: Readonly<Record<DemoRoleName, readonly ScenarioPerson[]>> = {
  VENDEDOR: PEOPLE.filter(person => person.role === 'VENDEDOR'),
  GERENTE: PEOPLE.filter(person => person.role === 'GERENTE'),
  CEO: PEOPLE.filter(person => person.role === 'CEO'),
};
export const SELLER_IDS = PEOPLE_BY_ROLE.VENDEDOR.map(person => person.id);

/** Categorias da carga Olist, com rótulos de exibição e pesos sintéticos para o mix de vendas. */
export const CATEGORIES = [
  { id: 1, source: 'Acessorios', name: 'Acessórios', orderWeight: 58 },
  { id: 2, source: 'Audio', name: 'Áudio', orderWeight: 15 },
  { id: 3, source: 'Casa inteligente', name: 'Casa inteligente', orderWeight: 4 },
  { id: 4, source: 'Computadores', name: 'Computadores', orderWeight: 2 },
  { id: 5, source: 'Smartphones', name: 'Smartphones', orderWeight: 9 },
  { id: 6, source: 'Tablets', name: 'Tablets', orderWeight: 5 },
  { id: 7, source: 'Wearables', name: 'Wearables', orderWeight: 7 },
] as const;

export const ADD_ON_CATEGORY_ID = CATEGORIES[0].id;
export const ADD_ON_CHANCE = 0.4;
export const SUGGESTED_BASKET_SKUS = ['OL-IP18P-256', 'OL-CAPA-SIL-IP18P', 'OL-MAGSAFE-1M'] as const;
export const LOW_STOCK_SKUS: readonly string[] = ['OL-AIRTAG-1', 'OL-AIRPODS-5', 'OL-AW-SE3-40', 'OL-HOMEPOD-MINI', 'OL-PENCIL-PRO'];

/** Último mês completo do roteiro. As compras dos dois vendedores reconciliam com este cenário. */
export const REFERENCE_MONTH = {
  storeGoal: 60_000,
  netRevenue: 56_700,
  achievementPercent: 94.5,
  orders: 30,
  averageTicket: 1_890,
  perSeller: [
    { id: 3, netRevenue: 26_700, orders: 14 },
    { id: 4, netRevenue: 30_000, orders: 16 },
  ],
} as const;

/** Teto de desconto comercial por pedido na base sintética. */
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
