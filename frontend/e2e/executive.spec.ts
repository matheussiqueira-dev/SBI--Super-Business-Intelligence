// Painel executivo do CEO (RF-28, RF-29): conta CEO sintetica do runner de contrato (ceo@example.test).
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { overflowing, paidSale, PASSWORD, seed } from './support.ts';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const MONTH = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'America/Fortaleza' }).format(new Date());

async function login(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).not.toHaveURL(/\/entrar/);
}

async function axe(page: Page, label: string) {
  const result = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(result.violations.map(v => `${label}: ${v.id} ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
}

function chips(page: Page) {
  return page.getByRole('list', { name: 'Filtros ativos' });
}

test('[CT-WEB-131] CEO entra no Painel executivo: KPIs, destaques, metas, vendas e rankings; axe e 320 px sem rolagem lateral', async ({ page }) => {
  const data = await seed(10);
  await paidSale(data, 2);
  await login(page, 'ceo@example.test');
  await expect(page).toHaveURL(/\/executivo$/);
  await expect(page.getByRole('heading', { name: 'Painel executivo', level: 1 })).toBeVisible();
  const net = page.locator('.kpi').filter({ hasText: 'Faturamento líquido' }).locator('.value');
  await expect(net).toBeVisible();
  await expect(net).not.toHaveText('R$ 0,00');
  await expect(page.locator('.kpi').filter({ hasText: 'Preço de compra (custo)' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Destaques do período' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Meta anual da loja/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mês atual × mês anterior' })).toBeVisible();
  await expect(page.getByRole('group', { name: /Faturamento líquido por mês/ })).toBeVisible();
  await axe(page, 'visao geral');

  await page.getByRole('tab', { name: 'Equipe e metas' }).click();
  await expect(page.getByRole('heading', { name: /^Meta por gerente/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ranking de vendedores' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Meta por vendedor/ })).toBeVisible();
  await axe(page, 'equipe e metas');

  await page.getByRole('tab', { name: 'Produtos e margem' }).click();
  await expect(page.getByRole('heading', { name: /^Produtos mais vendidos/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lucro × preço de compra por produto' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Curva ABC do faturamento' })).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: data.productName });
  // Produto do seed: preco R$ 59,90 e custo R$ 20,00 (margem unitaria R$ 39,90, 66,6%).
  await expect(row).toContainText('R$ 59,90');
  await expect(row).toContainText('R$ 20,00');
  await expect(row).toContainText('66,6%');
  await axe(page, 'produtos e margem');

  await page.setViewportSize({ width: 320, height: 720 });
  expect(await overflowing(page)).toEqual([]);
});

test('[CT-WEB-132] filtro cruzado e drill-down: mes abre os dias, produto recorta o painel e os chips desfazem', async ({ page }) => {
  const data = await seed(10);
  await paidSale(data, 1);
  await login(page, 'ceo@example.test');
  await page.getByRole('button', { name: new RegExp(`^${MONTH} de \\d{4}: Faturamento líquido`) }).click();
  await expect(page.getByRole('heading', { name: new RegExp(`^Vendas por dia · ${MONTH}`) })).toBeVisible();
  await expect(chips(page)).toContainText(`Mês: ${MONTH}`);
  await expect(page.getByRole('navigation', { name: 'Nível do gráfico' })).toContainText(MONTH);

  await page.getByRole('tab', { name: 'Produtos e margem' }).click();
  await page.getByRole('button', { name: `Filtrar painel por ${data.productName}` }).click();
  await expect(chips(page)).toContainText(`Produto: ${data.productName}`);
  await expect(page.getByText('Com filtro de produto ou categoria, os estornos ficam fora')).toBeVisible();
  await expect(page.locator('.kpi').filter({ hasText: 'Unidades vendidas' }).locator('.value')).toHaveText('1');
  await page.getByRole('button', { name: `Remover filtro Produto: ${data.productName}` }).click();
  await expect(chips(page)).not.toContainText('Produto:');

  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(chips(page)).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Filtros limpos' })).toHaveCount(1);
});

test('[CT-WEB-133] CEO grava a meta anual e a meta do mes distribuida entre os vendedores', async ({ page }) => {
  await login(page, 'ceo@example.test');
  await page.goto('/executivo/metas');
  await expect(page.getByRole('heading', { name: 'Metas da loja', level: 1 })).toBeVisible();
  await page.getByLabel('Nova meta anual (R$)').fill('1.200.000,00');
  await page.getByRole('button', { name: 'Salvar meta anual' }).click();
  await expect(page.getByText(/Meta anual de \d{4} gravada: R\$ 1\.200\.000,00\./)).toBeVisible();

  await page.getByRole('button', { name: new RegExp(`^(Definir|Editar) meta de ${MONTH}$`) }).click();
  const drawer = page.getByRole('dialog');
  await drawer.getByLabel('Meta da loja no mês (R$)').fill('3.000,00');
  const distribute = drawer.getByRole('checkbox', { name: /Distribuir entre os vendedores/ });
  if (!(await distribute.isChecked())) await distribute.check();
  await drawer.getByRole('button', { name: 'Distribuir igualmente' }).click();
  await expect(drawer.getByText('Distribuído: R$ 3.000,00 de R$ 3.000,00.')).toBeVisible();
  await axe(page, 'meta do mes');
  await drawer.getByRole('button', { name: 'Salvar meta do mês' }).click();
  await expect(page.getByText(`Meta de ${MONTH} gravada.`)).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: MONTH })).toContainText('R$ 3.000,00');
  await axe(page, 'metas');
});

test('[CT-WEB-134] GERENTE e VENDEDOR nao veem a Diretoria; /executivo responde Sem acesso', async ({ page }) => {
  for (const email of ['manager@example.test', 'seller@example.test']) {
    await page.context().clearCookies();
    await login(page, email);
    const nav = page.getByRole('navigation', { name: 'Áreas' });
    await expect(nav.getByRole('link', { name: 'Vender', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Painel executivo' })).toHaveCount(0);
    await page.goto('/executivo');
    await expect(page.getByRole('heading', { name: 'Sem acesso a esta área' })).toBeVisible();
  }
});

test('[CT-WEB-135] usuarios: GERENTE nao tem acao sobre conta de CEO e define a equipe do vendedor', async ({ page }) => {
  await login(page, 'manager@example.test');
  await page.goto('/gestao/usuarios');
  const ceo = page.getByRole('row').filter({ hasText: 'ceo@example.test' });
  await expect(ceo).toContainText('CEO');
  await expect(ceo.getByRole('button')).toHaveCount(0);
  await page.getByLabel('Papel', { exact: true }).selectOption('VENDEDOR');
  const seller = page.getByRole('row').filter({ hasText: 'seller@example.test' });
  await seller.getByRole('button', { name: 'Equipe: Vendedor sintetico' }).click();
  await page.getByRole('dialog').getByLabel('Gerente responsável').selectOption({ label: 'Gerente sintetico' });
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar equipe' }).click();
  await expect(page.getByText('Equipe de Vendedor sintetico atualizada.')).toBeVisible();
  await expect(seller).toContainText('Gerente sintetico');
  await page.getByRole('button', { name: 'Cadastrar usuário' }).click();
  await expect(page.getByRole('dialog').getByLabel('Papel').locator('option')).toHaveText(['Vendedor', 'Gerente']);
});
