import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { overflowing, PASSWORD, seed } from './support.ts';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// Tema escuro da identidade v2.0: segue a preferencia do sistema (prefers-color-scheme).
test.use({ colorScheme: 'dark' });

async function violations(page: Page, path: string): Promise<string[]> {
  const result = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return result.violations.map(v => `${path}: ${v.id} ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`);
}

test('[CT-WEB-137] tema escuro: login e telas dos dois perfis sem violacao WCAG 2.2 AA e sem rolagem horizontal em 320 px', async ({ page }) => {
  await seed();
  await page.goto('/entrar');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(9, 15, 22)');
  expect(await violations(page, '/entrar')).toEqual([]);
  await page.getByLabel('E-mail', { exact: true }).fill('manager@example.test');
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).not.toHaveURL(/\/entrar/);
  for (const path of ['/gestao', '/gestao/estoque', '/gestao/produtos', '/gestao/usuarios', '/vender', '/vendas', '/clientes', '/meu-desempenho']) {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(await violations(page, path)).toEqual([]);
    await page.setViewportSize({ width: 320, height: 720 });
    expect(await overflowing(page), path).toEqual([]);
  }
});
