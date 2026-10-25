import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Smoke publico sem credenciais ou escrita de dados; pode rodar separado do smoke autenticado. */
test('publicacao: avatares e expressoes correspondem aos arquivos desta revisao', async ({ request }) => {
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

test('publicacao: login acessivel e rota protegida exige sessao', async ({ page }) => {
  await page.goto('/entrar');
  await expect(page.getByRole('heading', { name: 'Entrar no SBI', level: 1 })).toBeVisible();
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Senha', { exact: true })).toBeVisible();
  await page.goto('/gestao/usuarios');
  await expect(page).toHaveURL(/\/entrar\?next=/);
});
