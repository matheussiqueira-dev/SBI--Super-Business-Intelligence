import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BLOCK_PATH, BRAND_ACCESSIBLE_NAME, DOT, MODULE, SYMBOL_SIZE, toneColors } from '../components/brand/geometry.ts';
import { ICON_PATHS, MANUAL_ICONS, THEME_ICONS, iconA11y } from '../components/brand/icons-data.ts';
import { menuFor, menuGroups, PASSWORD_PATH } from '../lib/areas.ts';
import { compactMoney, formatDateTime, formatMonth, formatPeriod, formatTime, initials, MINUS, money, MISSING, statusPill } from '../lib/format.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

test('[CT-WEB-122] nome acessivel unico da marca', () => {
  assert.equal(BRAND_ACCESSIBLE_NAME, 'SBI — Super Business Intelligence');
});

test('[CT-WEB-122] simbolo do componente tem a mesma geometria do favicon app/icon.svg', () => {
  const svg = readFileSync(join(ROOT, 'app', 'icon.svg'), 'utf8');
  assert.match(svg, new RegExp(`viewBox="0 0 ${SYMBOL_SIZE} ${SYMBOL_SIZE}"`));
  assert.ok(svg.includes(`<path class="b" d="${BLOCK_PATH}"/>`));
  assert.ok(svg.includes(`<circle class="d" cx="${DOT.cx}" cy="${DOT.cy}" r="${DOT.r}"/>`));
  // Tinta e Petroleo no tema claro; bloco branco e Petroleo 400 no escuro.
  assert.ok(svg.includes('.b{fill:#0D1A2B}.d{fill:#04729B}@media (prefers-color-scheme: dark){.b{fill:#FFFFFF}.d{fill:#64B1D7}}'));
  // Encaixe: 13 modulos de lado e folga de 1 modulo entre o arco do bloco e o circulo.
  assert.equal(SYMBOL_SIZE, 13 * MODULE);
  const arc = /A(\d+) \1 0 0 0 60 100/.exec(BLOCK_PATH);
  assert.equal(Number(arc?.[1]) - DOT.r, MODULE);
});

test('variantes do logo: principal segue o tema e negativa fica fixa sobre Tinta', () => {
  assert.equal(toneColors('principal').block, 'var(--sbi-brand-block)');
  assert.equal(toneColors('principal').text, 'var(--sbi-text-primary)');
  assert.equal(toneColors('negativa').block, '#FFFFFF');
  assert.equal(toneColors('negativa').dot, '#64B1D7');
});

test('[CT-WEB-123] icones: os 30 da figura 13 do manual v2.0 e os do seletor de tema, decorativos por padrao', () => {
  assert.equal(MANUAL_ICONS.length, 30);
  assert.equal(new Set(MANUAL_ICONS).size, 30);
  assert.deepEqual(MANUAL_ICONS.slice(0, 3), ['visao-geral', 'vender', 'estoque']);
  assert.deepEqual(MANUAL_ICONS.slice(-3), ['menu', 'tabela', 'meta']);
  for (const name of [...MANUAL_ICONS, ...THEME_ICONS]) assert.ok(ICON_PATHS[name].length > 0, name);
  assert.deepEqual(iconA11y(), { 'aria-hidden': true, focusable: false });
  assert.deepEqual(iconA11y('Concluída'), { role: 'img', 'aria-label': 'Concluída' });
});

test('menu em secoes GESTAO, ATENDIMENTO e MEU ESPACO; Trocar senha sempre presente', () => {
  const manager = menuGroups(menuFor(['VENDER', 'VENDAS', 'CLIENTES', 'MEU_DESEMPENHO', 'GESTAO', 'PRODUTOS', 'ESTOQUE', 'PROMOCOES', 'ANALISES', 'USUARIOS']));
  assert.deepEqual(manager.map(g => g.label), ['Gestão', 'Atendimento', 'Meu espaço']);
  assert.deepEqual(manager[0]!.items.map(i => i.label), ['Visão geral', 'Produtos e preços', 'Promoções', 'Estoque', 'Análises', 'Usuários']);
  assert.deepEqual(manager[1]!.items.map(i => i.label), ['Vender', 'Vendas', 'Clientes']);
  assert.deepEqual(manager[2]!.items.map(i => i.href), ['/meu-desempenho', PASSWORD_PATH]);
  const seller = menuGroups(menuFor(['VENDER', 'VENDAS', 'CLIENTES', 'MEU_DESEMPENHO']));
  assert.deepEqual(seller.map(g => g.label), ['Atendimento', 'Meu espaço']);
});

test('[CT-WEB-124] formatos do manual: hora 14h30, periodo, ausente e valor curto', () => {
  assert.equal(formatTime('2026-10-14T17:30:00Z'), '14h30');
  assert.equal(formatTime('2026-10-14T12:05:00Z'), '09h05');
  assert.equal(formatDateTime('2026-10-14T17:30:00Z'), '14/10/2026 14h30');
  assert.equal(formatPeriod('2026-09-01', '2026-09-30'), '01/09 a 30/09/2026');
  assert.equal(formatPeriod('2025-12-15', '2026-01-14'), '15/12/2025 a 14/01/2026');
  assert.equal(formatMonth('2026-10'), 'outubro de 2026');
  assert.equal(MISSING, 'Não informado');
  assert.equal(money(undefined), MISSING);
  assert.equal(compactMoney(47_000), 'R$ 47 mil');
  assert.equal(compactMoney({ amount: 1_234_567, currency: 'BRL' }), 'R$ 1,2 mi');
  assert.equal(compactMoney(999_960), 'R$ 1 mi');
  assert.equal(compactMoney(12_350), 'R$ 12,4 mil');
  assert.equal(compactMoney(950), 'R$ 950');
  assert.equal(compactMoney(0), 'R$ 0');
  assert.equal(compactMoney(-47_000), `${MINUS}R$ 47 mil`);
  assert.equal(money(1234.5), 'R$ 1.234,50');
  assert.equal(initials('Allan Paula Lima'), 'AL');
  assert.equal(initials('marta'), 'M');
  assert.equal(statusPill('PAID'), 'pill pill-ok');
  assert.equal(statusPill('PENDING_PAYMENT'), 'pill pill-pending');
  assert.equal(statusPill('CANCELED'), 'pill pill-err');
  assert.equal(statusPill('PROCESSING'), 'pill pill-info');
});

/** Formas proibidas pelo manual: so "SBI" (maiusculas, sem pontos) e "o SBI". */
const FORBIDDEN: readonly [RegExp, string][] = [
  [/S\.B\.I\./, 'S.B.I.'],
  [/\bSbi\b/, 'Sbi'],
  [/Super BI\b/i, 'Super BI'],
  [/SuperBI/i, 'SuperBI'],
  [/\ba SBI\b/, 'a SBI'],
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (name === 'node_modules' || name === '.next' || name === 'generated') return [];
    return statSync(path).isDirectory() ? files(path) : /\.(tsx?|css|md)$/.test(name) ? [path] : [];
  });
}

test('[CT-WEB-125] nenhum nome proibido da marca na interface nem na documentacao', () => {
  const targets = [join(ROOT, 'app'), join(ROOT, 'components'), join(ROOT, 'lib'), join(ROOT, '..', 'docs')];
  const found = targets.flatMap(files).flatMap(path => {
    const text = readFileSync(path, 'utf8');
    return FORBIDDEN.filter(([pattern]) => pattern.test(text)).map(([, name]) => `${path}: ${name}`);
  });
  assert.deepEqual(found, []);
});
