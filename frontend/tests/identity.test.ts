import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compactNumber, discountMoney, formatDay, formatShortRange, MINUS, money, moneyParts, pageRange, plural, sentence,
} from '../lib/format.ts';
import { meterRatio, monthPace, periodGoal } from '../lib/goals.ts';
import { parseTheme, THEME_KEY, THEME_SCRIPT, themeAttribute } from '../lib/theme.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

test('[CT-WEB-138] valores do manual v2.0: "R$" separado no indicador, sinal de menos, desconto como subtracao e eixo sem moeda', () => {
  assert.deepEqual(moneyParts(186_400), { unit: 'R$', amount: '186.400,00' });
  assert.deepEqual(moneyParts({ amount: -1_234.5, currency: 'BRL' }), { unit: 'R$', amount: `${MINUS}1.234,50` });
  assert.equal(moneyParts(null), null);
  assert.equal(MINUS, '−');
  assert.equal(money(-60), `${MINUS}R$ 60,00`);
  assert.ok(!money(-60).includes('-'), 'hifen no lugar do sinal de menos');
  assert.equal(discountMoney(60), `${MINUS} R$ 60,00`);
  assert.equal(discountMoney(0), 'R$ 0,00');
  assert.equal(discountMoney(null), 'Não informado');
  assert.equal(compactNumber(20_000), '20 mil');
  assert.equal(compactNumber(38_200), '38,2 mil');
  assert.equal(compactNumber(1_200_000), '1,2 mi');
  assert.equal(compactNumber(0), '0');
});

test('[CT-WEB-138] datas e contagens no formato pt-BR do manual: intervalo com meia-risca, dia da loja, plural e mes no inicio da frase', () => {
  assert.equal(formatShortRange('2026-09-01', '2026-09-06'), '1–6 set.');
  assert.equal(formatShortRange('2026-09-28', '2026-10-04'), '28 set.–4 out.');
  assert.equal(formatShortRange('2026-09-30', '2026-09-30'), '30 set.');
  // 01h UTC ainda e o dia anterior em Fortaleza (-03:00).
  assert.equal(formatDay('2026-10-25T01:00:00Z'), '24/10/2026');
  assert.equal(plural(1, 'pedido'), '1 pedido');
  assert.equal(plural(3, 'pedido'), '3 pedidos');
  assert.equal(plural(2, 'disponível', 'disponíveis'), '2 disponíveis');
  assert.equal(plural(1_500, 'unidade'), '1.500 unidades');
  assert.equal(sentence('outubro de 2026'), 'Outubro de 2026');
  assert.equal(pageRange(0, 20, 65), '1–20');
  assert.equal(pageRange(3, 20, 65), '61–65');
  assert.equal(pageRange(0, 20, 6), '6');
});

test('[CT-WEB-139] medidor e meta do periodo: atingimento limitado a trilha, ritmo do mes corrente e meta proporcional aos dias', () => {
  assert.equal(meterRatio(186_400, 240_000), 186_400 / 240_000);
  assert.equal(meterRatio(300_000, 240_000), 1);
  assert.equal(meterRatio(-5, 100), 0);
  assert.equal(meterRatio(50, 0), 0);
  // 25/10/2026 12h em Fortaleza: dia 25 de 31.
  const now = new Date('2026-10-25T15:00:00Z');
  assert.equal(monthPace('2026-10', now), 25 / 31);
  assert.equal(monthPace('2026-09', now), null);
  // Setembro: 240 mil em 30 dias = 8 mil por dia (manual, figura 32).
  assert.equal(periodGoal(240_000, '2026-09', '2026-09-01', '2026-09-06'), 48_000);
  assert.equal(periodGoal(240_000, '2026-09', '2026-09-28', '2026-09-30'), 24_000);
  assert.equal(periodGoal(100, '2026-10', '2026-10-01', '2026-10-01'), 3.23);
});

test('[CT-WEB-140] tema fixado por data-theme: escolha valida, atributo do <html> e script anterior a pintura', () => {
  assert.equal(parseTheme('escuro'), 'escuro');
  assert.equal(parseTheme('claro'), 'claro');
  assert.equal(parseTheme('dark'), 'sistema');
  assert.equal(parseTheme(null), 'sistema');
  assert.equal(themeAttribute('escuro'), 'dark');
  assert.equal(themeAttribute('claro'), 'light');
  assert.equal(themeAttribute('sistema'), null);
  assert.ok(THEME_SCRIPT.includes(`localStorage.getItem('${THEME_KEY}')`));
  assert.ok(THEME_SCRIPT.startsWith('try{') && THEME_SCRIPT.endsWith('catch(e){}'), 'script sem tratamento de erro');
});

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (name === 'node_modules' || name === '.next' || name === 'generated') return [];
    return statSync(path).isDirectory() ? sources(path) : /\.(tsx|css)$/.test(name) ? [path] : [];
  });
}

test('[CT-WEB-141] cores so por tokens: nenhum hexadecimal nem rgb solto fora de tokens.css e da geometria do logotipo', () => {
  const allowed = [join(ROOT, 'app', 'tokens.css')];
  const found = [join(ROOT, 'app'), join(ROOT, 'components')].flatMap(sources)
    .filter(path => !allowed.includes(path))
    .flatMap(path => {
      // Icones do CSS em data URI usam %23000 (cor da mascara, sem efeito na tela).
      const text = readFileSync(path, 'utf8').replace(/url\("data:[^"]*"\)/g, '');
      const hits = text.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g) ?? [];
      return hits.map(hit => `${path}: ${hit}`);
    });
  assert.deepEqual(found, []);
});

test('[CT-WEB-141] tokens.css define os dois temas com os mesmos papeis semanticos', () => {
  const css = readFileSync(join(ROOT, 'app', 'tokens.css'), 'utf8');
  const block = (selector: string) => {
    const start = css.indexOf(selector);
    return css.slice(start, css.indexOf('\n}', start));
  };
  const names = (text: string) => new Set([...text.matchAll(/(--sbi-[a-z0-9-]+):/g)].map(m => m[1]));
  const forced = names(block(':root[data-theme="dark"]'));
  const system = names(block(':root:not([data-theme="light"])'));
  assert.deepEqual([...forced].sort(), [...system].sort(), 'tema escuro fixado e do sistema com papeis diferentes');
  for (const token of ['--sbi-bg-canvas', '--sbi-text-primary', '--sbi-focus-ring', '--sbi-data-1', '--sbi-chart-grid']) {
    assert.ok(forced.has(token), token);
  }
});
