// Icones de traco do SBI (manual de identidade visual v2.0, figura 13): grade de 24, traco de 1,75 com pontas e juncoes
// arredondadas, cor do texto ao lado (currentColor); 20 px na interface, 16 em selos e tabelas, 24 em destaque.
// Fica em .ts para os testes unitarios.

export type IconName =
  | 'visao-geral' | 'vender' | 'estoque' | 'preco' | 'promocao' | 'analises' | 'clientes' | 'vendas' | 'desempenho' | 'usuarios'
  | 'senha' | 'sair' | 'check' | 'alerta' | 'info' | 'sucesso' | 'erro' | 'seta-cima' | 'seta-baixo' | 'busca' | 'filtro'
  | 'calendario' | 'mais' | 'fechar' | 'chevron-baixo' | 'chevron-direita' | 'chevron-esquerda' | 'menu' | 'tabela' | 'meta'
  | 'sol' | 'lua' | 'monitor';

/** Os 30 icones da figura 13 do manual, na ordem do manual (os 13 primeiros ja existiam na v1.0). */
export const MANUAL_ICONS: readonly IconName[] = [
  'visao-geral', 'vender', 'estoque', 'preco', 'promocao', 'analises', 'clientes', 'vendas', 'desempenho', 'usuarios', 'senha', 'sair',
  'check', 'alerta', 'info', 'sucesso', 'erro', 'seta-cima', 'seta-baixo', 'busca', 'filtro', 'calendario', 'mais', 'fechar',
  'chevron-baixo', 'chevron-direita', 'chevron-esquerda', 'menu', 'tabela', 'meta',
];
/** Seletor de tema da conta, desenhado na mesma construcao. */
export const THEME_ICONS: readonly IconName[] = ['sol', 'lua', 'monitor'];

export const ICON_VIEWBOX = '0 0 24 24';
export const ICON_STROKE = 1.75;

export const ICON_PATHS: Readonly<Record<IconName, readonly string[]>> = {
  'visao-geral': ['M4 4h7v7H4z', 'M13 4h7v4h-7z', 'M13 10h7v10h-7z', 'M4 13h7v7H4z'],
  vender: ['M4 5h2l2 10h10l2-7H7.2', 'M10 19.5a1 1 0 1 0 0 .01', 'M17 19.5a1 1 0 1 0 0 .01'],
  estoque: ['M12 3l8 4.5v9L12 21l-8-4.5v-9z', 'M4 7.5l8 4.5 8-4.5', 'M12 12v9'],
  preco: ['M3.5 12.5l8-8H20v8.5l-8 8z', 'M15.5 8.5a1 1 0 1 0 0 .01'],
  promocao: ['M5 19L19 5', 'M7.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z', 'M16.5 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z'],
  analises: ['M4 20h16', 'M6 16l4-5 3 3 5-7', 'M18 7h-3', 'M18 7v3'],
  clientes: ['M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M3 20c.6-3.4 3-5.5 6-5.5s5.4 2.1 6 5.5', 'M16 4.5a3.5 3.5 0 0 1 0 6.5', 'M18 14.8c1.6.8 2.7 2.6 3 5.2'],
  vendas: ['M6 3h12v18l-3-2-3 2-3-2-3 2z', 'M9 8h6', 'M9 12h6', 'M9 16h3'],
  desempenho: ['M12 20a8 8 0 1 0-8-8', 'M12 12l4-4', 'M4 20l3-3'],
  usuarios: ['M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5'],
  senha: ['M6 11h12v9H6z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3', 'M12 15v2'],
  sair: ['M14 4h5v16h-5', 'M10 8l-4 4 4 4', 'M6 12h10'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  alerta: ['M12 4L2.8 19.5h18.4z', 'M12 10v4.5', 'M12 17.2v.01'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 11v5.5', 'M12 7.8v.01'],
  sucesso: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M8 12.3l2.7 2.7L16 9.7'],
  erro: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M9 9l6 6', 'M15 9l-6 6'],
  'seta-cima': ['M12 19V5', 'M6 11l6-6 6 6'],
  'seta-baixo': ['M12 5v14', 'M6 13l6 6 6-6'],
  busca: ['M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z', 'M15.5 15.5L20 20'],
  filtro: ['M4 6h16', 'M7 12h10', 'M10 18h4'],
  calendario: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v4', 'M16 3v4'],
  mais: ['M12 5v14', 'M5 12h14'],
  fechar: ['M6 6l12 12', 'M18 6L6 18'],
  'chevron-baixo': ['M6 9l6 6 6-6'],
  'chevron-direita': ['M9 6l6 6-6 6'],
  'chevron-esquerda': ['M15 6l-6 6 6 6'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  tabela: ['M4 5h16v14H4z', 'M4 10h16', 'M4 15h16', 'M10 5v14'],
  meta: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M12 12.01V12'],
  sol: ['M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M12 2.5v2', 'M12 19.5v2', 'M2.5 12h2', 'M19.5 12h2', 'M5.3 5.3l1.4 1.4', 'M17.3 17.3l1.4 1.4',
    'M5.3 18.7l1.4-1.4', 'M17.3 6.7l1.4-1.4'],
  lua: ['M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z'],
  monitor: ['M3 5h18v11H3z', 'M8 20h8', 'M12 16v4'],
};

/** Icone decorativo por padrao (o texto ao lado ja nomeia a acao); com rotulo, vira imagem nomeada. */
export function iconA11y(label?: string): Record<string, string | boolean> {
  return label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: false };
}
