import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { overflowing, PASSWORD } from './support.ts';
import { STUDENTS, WORK_TITLE } from '../lib/credits.ts';

const BRAND = 'SBI — Super Business Intelligence';

async function login(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).not.toHaveURL(/\/entrar/);
}

const MANAGER_ROUTES = [
  ['/gestao', 'Visão geral'], ['/gestao/produtos', 'Produtos e preços'], ['/gestao/promocoes', 'Promoções'],
  ['/gestao/estoque', 'Estoque'], ['/gestao/analises', 'Análises'], ['/gestao/usuarios', 'Usuários'],
  ['/vender', 'Vender'], ['/vendas', 'Vendas'], ['/clientes', 'Clientes'], ['/meu-desempenho', 'Meu desempenho'],
] as const;
const ROUTES = {
  'manager@example.test': MANAGER_ROUTES,
  'seller@example.test': [['/vender', 'Vender'], ['/vendas', 'Vendas'], ['/clientes', 'Clientes'], ['/meu-desempenho', 'Meu desempenho']],
  'ceo@example.test': [['/executivo', 'Painel executivo'], ['/executivo/metas', 'Metas'], ...MANAGER_ROUTES],
} as const;

/** [CT-WEB-130] Credito do trabalho A3 com os quatro alunos e RAs. */
async function expectCredits(page: Page) {
  // Nas areas internas o credito fica no rodape da pagina; nas telas sem menu, logo abaixo do formulario.
  const credits = page.locator('.credits');
  await expect(credits).toContainText(WORK_TITLE);
  for (const student of STUDENTS) await expect(credits).toContainText(`${student.name} · RA ${student.ra}`);
}

for (const [email, routes] of Object.entries(ROUTES)) {
  test(`[CT-WEB-120] [CT-WEB-130] logo, item ativo e credito do trabalho em todas as rotas (${email.split('@')[0]})`, async ({ page }) => {
    await login(page, email);
    const nav = page.getByRole('navigation', { name: 'Áreas' });
    for (const [path, item] of routes) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('complementary', { name: 'Navegação principal' }).getByRole('img', { name: BRAND })).toBeVisible();
      await expect(nav.locator('a[aria-current="page"]')).toHaveCount(1);
      await expect(nav.getByRole('link', { name: item, exact: true })).toHaveAttribute('aria-current', 'page');
      await expectCredits(page);
    }
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
  });
}

test('[CT-WEB-121] favicon, icones e manifesto servidos; tela de login com a assinatura da marca', async ({ page, request }) => {
  const icon = await request.get('/icon.svg');
  expect(icon.status()).toBe(200);
  expect(icon.headers()['content-type']).toContain('image/svg+xml');
  expect(await icon.text()).toContain('#04729B');
  expect((await request.get('/apple-icon.png')).status()).toBe(200);
  expect((await request.get('/favicon.ico')).status()).toBe(200);
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.status()).toBe(200);
  const { icons } = await manifest.json() as { icons: { src: string; purpose?: string }[] };
  expect(icons.some(i => i.purpose === 'maskable')).toBe(true);
  for (const { src } of icons) expect((await request.get(src)).status(), src).toBe(200);

  await page.goto('/entrar');
  await expectCredits(page);
  await expect(page).toHaveTitle(/SBI/);
  await expect(page.getByRole('img', { name: BRAND })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Entrar no SBI', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(result.violations.map(v => v.id)).toEqual([]);
  await page.setViewportSize({ width: 320, height: 720 });
  expect(await overflowing(page)).toEqual([]);
});

test('[CT-WEB-121] em 320 px o menu recolhe na faixa superior e abre pelo botao de 44 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await login(page, 'seller@example.test');
  const nav = page.getByRole('navigation', { name: 'Áreas' });
  await expect(nav).toBeHidden();
  const toggle = page.getByRole('button', { name: 'Menu' });
  expect((await toggle.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  await toggle.click();
  await expect(nav).toBeVisible();
  await nav.getByRole('link', { name: 'Vendas', exact: true }).click();
  await expect(page).toHaveURL(/\/vendas$/);
  await expect(nav).toBeHidden();
  expect(await overflowing(page)).toEqual([]);
});

test('[CT-WEB-121] rota inexistente mostra a pagina de nao encontrada da marca', async ({ page }) => {
  await login(page, 'seller@example.test');
  const response = await page.goto('/rota-que-nao-existe');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Página não encontrada.' })).toBeVisible();
  await expectCredits(page);
});

test('[CT-WEB-127] rodape do login em duas linhas inteiras em 1280 px e 390 px', async ({ page }) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
    await page.goto('/entrar');
    const lines = page.locator('.login-footer span');
    await expect(lines).toHaveText(['Ambiente de demonstração · dados fictícios', 'Projeto A3 · UNIFG 2026']);
    for (const line of await lines.all()) {
      const { height, lineHeight } = await line.evaluate(el => ({
        height: el.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(el).lineHeight) }));
      expect(height, `largura ${width}`).toBeLessThan(lineHeight * 1.5);
    }
    expect(await overflowing(page), `largura ${width}`).toEqual([]);
  }
});
