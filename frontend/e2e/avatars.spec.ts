import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { session } from './support.ts';

test('os sete avatares e seus atlas sao servidos sem alteracao', async ({ request }) => {
  for (const number of [9, 12, 13, 18, 19, 21, 26]) {
    for (const folder of ['avatares', 'avatares/expressoes']) {
      const file = `${folder}/avatar-${number}.webp`;
      const response = await request.get(`/${file}`);
      expect(response.status(), file).toBe(200);
      expect(response.headers()['content-type'], file).toContain('image/webp');
      expect((await response.body()).equals(readFileSync(join(process.cwd(), 'public', file))), file).toBe(true);
    }
  }
});

test('conta autenticada: expressoes continuas, cada clique, pausa e movimento reduzido', async ({ page }) => {
  test.setTimeout(60_000);
  // A guarda de support.ts exige a API e o banco descartaveis; nunca cria conta em producao.
  const { api, csrf } = await session('manager@example.test');
  const email = `avatar-${crypto.randomUUID()}@example.test`;
  const temporary = `Temp!${crypto.randomUUID()}`;
  const definitive = `Final!${crypto.randomUUID()}`;
  try {
    const created = await api.post('/users', { headers: csrf, data: {
      name: 'Allan Gabriel Almeida Barros', email, role: 'VENDEDOR', temporaryPassword: temporary,
    } });
    expect(created.status()).toBe(201);
  } finally { await api.dispose(); }

  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(temporary);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/conta\/senha$/);
  await page.getByLabel('Senha atual').fill(temporary);
  await page.getByLabel('Nova senha', { exact: true }).fill(definitive);
  await page.getByLabel('Repita a nova senha').fill(definitive);
  await page.getByRole('button', { name: 'Salvar nova senha' }).click();
  await expect(page).toHaveURL(/\/vender$/);
  await page.goto('/vendas');

  const avatar = page.locator('.account-box .avatar-control');
  await expect(avatar.locator('.avatar-original')).toHaveAttribute('src', '/avatares/avatar-12.webp');
  await expect.poll(() => avatar.locator('.avatar-expression img').evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth === 384)).toBe(true);
  await avatar.scrollIntoViewIfNeeded();
  await expect(avatar).toHaveAttribute('data-visible', 'true');
  await expect.poll(() => avatar.locator('.avatar-face').evaluate(node => getComputedStyle(node).animationName)).toBe('avatar-alive');
  const frames = await avatar.evaluate(node => new Promise<string[]>(resolve => {
    const seen = new Set<string>();
    const observer = new MutationObserver(() => { seen.add(node.getAttribute('data-expression') ?? ''); });
    observer.observe(node, { attributes: true, attributeFilter: ['data-expression'] });
    setTimeout(() => { observer.disconnect(); resolve([...seen]); }, 3400);
  }));
  expect(frames.length).toBeGreaterThanOrEqual(2);

  const heading = page.getByRole('heading', { level: 1 });
  let pulse = Number(await avatar.getAttribute('data-pulse'));
  await heading.click();
  await expect(avatar).toHaveAttribute('data-pulse', String(++pulse));
  await heading.dblclick();
  await expect(avatar).toHaveAttribute('data-pulse', String(pulse += 2));
  await heading.evaluate(node => node.addEventListener('click', event => event.stopPropagation()));
  await heading.click();
  await expect(avatar).toHaveAttribute('data-pulse', String(++pulse));
  await avatar.focus();
  await page.keyboard.press('Enter');
  await expect(avatar).toHaveAttribute('data-pulse', String(++pulse));
  await expect(avatar).toHaveAttribute('data-paused', 'false');

  await page.getByRole('button', { name: 'Pausar avatares', exact: true }).click();
  await expect(avatar).toHaveAttribute('data-paused', 'true');
  await heading.click();
  await expect(avatar).toHaveAttribute('data-pulse', String(pulse));
  await page.getByRole('button', { name: 'Retomar avatares', exact: true }).click();
  await expect(avatar).toHaveAttribute('data-paused', 'false');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => avatar.locator('.avatar-face').evaluate(node => getComputedStyle(node).animationName)).toBe('none');
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(axe.violations.map(violation => violation.id)).toEqual([]);
  for (const width of [320, 390, 760]) {
    await page.setViewportSize({ width, height: 850 });
    await expect(page.locator('.sidebar-avatar .avatar-control')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
