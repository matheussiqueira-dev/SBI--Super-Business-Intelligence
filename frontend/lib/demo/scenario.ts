// Cenário de demonstração da loja. Vendas, metas e estoque são simulados a partir do catálogo da edição
// ([catalog.ts](catalog.ts)): o recorte Olist na acadêmica, o catálogo próprio do SBI na comercial.
//
// O que muda por edição é só a identificação: loja, equipe e os SKUs citados no roteiro. Os identificadores, os
// papéis, os pesos e o mês de referência são os mesmos, então o simulador e a reconciliação do roteiro valem nas
// duas sem recalcular nada.
import { EDITION, isCommercial, type Edition } from '../edition.ts';
import { STORE_LOCATION } from '../store.ts';

/** Semente da base: a mesma loja em toda apresentacao e em todo teste. */
export const DEMO_SEED = 20_261_204;

/** Meses de historico gerados, terminando no mes de hoje (24 = o ano anterior inteiro e o ano corrente ate hoje). */
export const HISTORY_MONTHS = 24;

/** Loja da demonstração comercial: nome, praça e segmento próprios, sem a unidade da operação acadêmica. */
const COMMERCIAL_STORE = { name: 'Loja Modelo SBI', city: 'Fortaleza', state: 'Ceará' } as const;

export function storeFor(edition: Edition = EDITION) {
  return {
    ...(isCommercial(edition) ? COMMERCIAL_STORE : STORE_LOCATION),
    segment: isCommercial(edition) ? 'Eletrônicos e acessórios' : 'Produtos Apple e acessórios',
    size: 'Pequena empresa varejista',
    units: 1,
    openWeekdays: 'segunda a sábado',
  } as const;
}

export const STORE = storeFor();

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

/** Equipe da demonstração acadêmica: os autores do trabalho, creditados na própria tela. */
const ACADEMIC_PEOPLE: readonly ScenarioPerson[] = [
  { id: 1, name: 'Paulo Thiago Gomes Da Silva', role: 'CEO', managerId: null },
  { id: 2, name: 'Matheus Siqueira', role: 'GERENTE', managerId: null },
  { id: 3, name: 'Allan Barros', role: 'VENDEDOR', managerId: 2 },
  { id: 4, name: 'Francisco Ferreira', role: 'VENDEDOR', managerId: 5 },
  { id: 5, name: 'Gabriel Sousa', role: 'GERENTE', managerId: null },
  { id: 6, name: 'Christian Felix Gbedande Azonyetin', role: 'CEO', managerId: null },
  { id: 7, name: 'Bruno Marciano De Amorim Josino', role: 'CEO', managerId: null },
];

/**
 * Equipe da demonstração comercial: nomes inventados, nos mesmos IDs e papéis. Pessoa real não aparece numa
 * tela apresentada a cliente -- e os IDs iguais mantêm o mês de referência reconciliando.
 */
const COMMERCIAL_PEOPLE: readonly ScenarioPerson[] = [
  { id: 1, name: 'Marina Albuquerque', role: 'CEO', managerId: null },
  { id: 2, name: 'Rafael Pontes', role: 'GERENTE', managerId: null },
  { id: 3, name: 'Camila Rego', role: 'VENDEDOR', managerId: 2 },
  { id: 4, name: 'Diego Vilar', role: 'VENDEDOR', managerId: 5 },
  { id: 5, name: 'Sofia Andrade', role: 'GERENTE', managerId: null },
  { id: 6, name: 'Henrique Dantas', role: 'CEO', managerId: null },
  { id: 7, name: 'Luiza Prado', role: 'CEO', managerId: null },
];

export function peopleFor(edition: Edition = EDITION): readonly ScenarioPerson[] {
  return isCommercial(edition) ? COMMERCIAL_PEOPLE : ACADEMIC_PEOPLE;
}

/** Nomes de exibição da equipe. Os vínculos e os IDs são usados somente na simulação. */
export const PEOPLE: readonly ScenarioPerson[] = peopleFor();

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
// Cesta sugerida e itens em alerta: os mesmos lugares do catálogo em cada edição (aparelho, capa dele e
// carregador; e cinco itens de giro alto).
export const basketFor = (edition: Edition = EDITION): readonly string[] => isCommercial(edition)
  ? ['SB-N9P-256', 'SB-CAPA-SIL-N9P', 'SB-CARR-MAG-1M']
  : ['OL-IP18P-256', 'OL-CAPA-SIL-IP18P', 'OL-MAGSAFE-1M'];
export const lowStockFor = (edition: Edition = EDITION): readonly string[] => isCommercial(edition)
  ? ['SB-TAG-1', 'SB-FONE-A5', 'SB-REL-M40', 'SB-SOM-MINI', 'SB-CANETA-PRO']
  : ['OL-AIRTAG-1', 'OL-AIRPODS-5', 'OL-AW-SE3-40', 'OL-HOMEPOD-MINI', 'OL-PENCIL-PRO'];
export const SUGGESTED_BASKET_SKUS: readonly string[] = basketFor();
export const LOW_STOCK_SKUS: readonly string[] = lowStockFor();

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
