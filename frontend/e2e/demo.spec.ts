// Demonstracao publica (CT-DEMO-201 a 206): roteiro completo da secao 17 do plano de evolucao, em sessao sem
// autenticacao. Este arquivo nao usa a massa da API: a demonstracao roda inteira no navegador, entao roda tambem com
// `npx playwright test -c playwright.demo.config.mjs`, sem banco e sem backend no ar.
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
/** iPhone 18 Pro, capa e carregador MagSafe. */
const SALE = 11_706;

const brl = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function axe(page: Page, label: string) {
  const result = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(result.violations.map(violation => `${label}: ${violation.id} (${violation.nodes.length})`)).toEqual([]);
}

/** Valor de um cartao de indicador pelo rotulo, em reais. */
async function kpi(page: Page, label: string): Promise<number> {
  const card = page.locator('.kpi').filter({ has: page.getByText(label, { exact: true }) }).first();
  const text = (await card.locator('.value').first().innerText()).replace(/\s/g, '');
  const digits = text.replace('R$', '').replace(/\./g, '').replace(',', '.');
  return Number(digits);
}

async function role(page: Page, name: 'Vendedor' | 'Gerente' | 'CEO') {
  await page.getByRole('radio', { name, exact: true }).check({ force: true });
  await expect(page.getByRole('radio', { name, exact: true })).toBeChecked();
}

test('[CT-DEMO-201] /demo abre sem sessao, identifica o ambiente e nao chama a API', async ({ page }) => {
  const backend: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname.startsWith('/api/backend')) backend.push(request.url());
  });
  await page.context().clearCookies();
  await page.goto('/demo');
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByText('Ambiente de Demonstração — Dados Simulados').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Visualizar como' })).toBeVisible();
  await expect(page.getByText('Unidade do Shopping Recife', { exact: true })).toBeVisible();
  await expect(page.getByText(/Recife, Pernambuco/)).toBeVisible();
  // Nenhuma chamada a API: a demonstracao nao le dado real nem cria sessao.
  expect(backend).toEqual([]);
  expect((await page.context().cookies()).map(cookie => cookie.name)).not.toContain('JSESSIONID');
  await axe(page, '/demo vendedor');
});

test('[CT-DEMO-202] venda simulada atualiza vendedor, gerente e CEO a partir da mesma transacao', async ({ page }) => {
  await page.goto('/demo');

  // Etapa 1: Allan e seus indicadores atuais.
  await role(page, 'Vendedor');
  await expect(page.getByRole('combobox', { name: 'Vendedor em exibição' })).toHaveValue('3');
  await expect(page.getByRole('heading', { name: 'Meu desempenho' })).toBeVisible();
  const sellerBefore = await kpi(page, 'Faturamento confirmado');
  const sellerOrdersBefore = await kpi(page, 'Vendas pagas');

  // Etapa 2: registra a venda ficticia da sacola do roteiro.
  await page.getByRole('button', { name: 'Registrar venda simulada' }).first().click();
  const drawer = page.getByRole('dialog', { name: 'Registrar venda simulada' });
  await expect(drawer).toBeVisible();
  await drawer.getByRole('button', { name: 'Sacola sugerida do roteiro' }).click();
  await expect(drawer.getByText('Total da venda')).toBeVisible();
  await expect(drawer.locator('dl.facts')).toContainText(brl(SALE));
  await drawer.getByRole('button', { name: 'Registrar venda simulada' }).click();
  await expect(drawer).toBeHidden();
  await expect(page.getByText('1 venda simulada registrada nesta aba')).toBeVisible();

  const sellerAfter = await kpi(page, 'Faturamento confirmado');
  expect(sellerAfter - sellerBefore).toBeCloseTo(SALE, 2);
  expect(await kpi(page, 'Vendas pagas')).toBe(sellerOrdersBefore + 1);

  // Etapa 3: gerente ve a mesma venda no consolidado da loja.
  await role(page, 'Gerente');
  await expect(page.getByRole('heading', { name: 'Visão geral da loja' })).toBeVisible();
  const storeAfter = await kpi(page, 'Faturamento confirmado');
  await expect(page.getByRole('table', { name: 'Meta, realizado e atingimento por vendedor' }).first())
    .toContainText(brl(sellerAfter));
  await expect(page.getByRole('combobox', { name: 'Gerente em exibição' })).toHaveValue('2');

  // Etapa 4: CEO ve o impacto no resultado financeiro, com custo e margem recalculados.
  await role(page, 'CEO');
  await expect(page.getByRole('heading', { name: 'Painel executivo' })).toBeVisible();
  await expect(page.getByText('Lucro bruto').first()).toBeVisible();
  await expect(page.getByText('Preço de compra (custo)')).toBeVisible();

  // Etapa 5: restaura e confere que os valores originais voltaram.
  await page.getByRole('button', { name: 'Restaurar demonstração' }).first().click();
  const confirm = page.getByRole('alertdialog', { name: 'Restaurar a demonstração?' });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Restaurar' }).click();
  await expect(page.getByText('venda simulada registrada nesta aba')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Meu desempenho' })).toBeVisible();
  expect(await kpi(page, 'Faturamento confirmado')).toBeCloseTo(sellerBefore, 2);
  expect(storeAfter).toBeGreaterThan(sellerAfter);
});

test('[CT-DEMO-207] o catálogo Apple e as duas equipes seguem a pessoa em exibição', async ({ page }) => {
  await page.goto('/demo');
  await page.getByLabel('Vendedor em exibição').selectOption({ label: 'Francisco Ferreira' });
  await page.getByRole('button', { name: 'Registrar venda simulada' }).first().click();
  const drawer = page.getByRole('dialog', { name: 'Registrar venda simulada' });
  await expect(drawer.getByLabel('Vendedor', { exact: true })).toHaveValue('4');
  const options = drawer.getByLabel('Produto', { exact: true }).locator('option');
  await expect(options).toHaveCount(43);
  await expect(options.filter({ hasText: /OL-IP18P-256.*10\.799,00/ })).toHaveCount(1);
  await expect(options.filter({ hasText: /OL-MBP14-M5.*21\.599,00/ })).toHaveCount(1);
  await drawer.getByRole('button', { name: 'Cancelar' }).click();

  await role(page, 'Gerente');
  const team = page.getByRole('table', { name: 'Meta, realizado e atingimento por vendedor' }).first();
  await expect(team).toContainText('Allan Barros');
  await expect(team).not.toContainText('Francisco Ferreira');
  await page.getByLabel('Gerente em exibição').selectOption({ label: 'Gabriel Sousa' });
  await expect(team).toContainText('Francisco Ferreira');
  await expect(team).not.toContainText('Allan Barros');
  await page.getByRole('button', { name: 'Registrar venda simulada' }).first().click();
  await expect(drawer.getByLabel('Vendedor', { exact: true }).locator('option')).toHaveCount(1);
  await expect(drawer.getByLabel('Vendedor', { exact: true })).toHaveValue('4');
  await drawer.getByRole('button', { name: 'Cancelar' }).click();

  await role(page, 'CEO');
  const executive = page.getByLabel('CEO em exibição');
  await expect(executive.locator('option')).toHaveText([
    'Paulo Thiago Gomes Da Silva', 'Christian Felix Gbedande Azonyetin', 'Bruno Marciano De Amorim Josino',
  ]);
  await executive.selectOption({ label: 'Christian Felix Gbedande Azonyetin' });
  await expect(page.getByRole('heading', { name: 'Painel executivo' })).toBeVisible();
});

test('[CT-DEMO-203] a alteracao de um visitante nao vaza para outro', async ({ page, browser }) => {
  await page.goto('/demo');
  const before = await kpi(page, 'Faturamento confirmado');
  await page.getByRole('button', { name: 'Registrar venda simulada' }).first().click();
  const drawer = page.getByRole('dialog', { name: 'Registrar venda simulada' });
  await drawer.getByRole('button', { name: 'Sacola sugerida do roteiro' }).click();
  await drawer.getByRole('button', { name: 'Registrar venda simulada' }).click();
  await expect(page.getByText('1 venda simulada registrada nesta aba')).toBeVisible();
  expect(await kpi(page, 'Faturamento confirmado')).toBeCloseTo(before + SALE, 2);

  // Outro visitante (outro contexto, outro armazenamento) ve a base intacta.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto('/demo');
  expect(await kpi(otherPage, 'Faturamento confirmado')).toBeCloseTo(before, 2);
  await expect(otherPage.getByText('venda simulada registrada nesta aba')).toBeHidden();
  await other.close();
});

test('[CT-DEMO-204] o seletor de perfil publico nao libera a aplicacao autenticada', async ({ page }) => {
  await page.goto('/demo');
  await role(page, 'CEO');
  await expect(page.getByRole('heading', { name: 'Painel executivo' })).toBeVisible();
  // Mesmo "como CEO" na demonstracao, as telas internas continuam exigindo sessao.
  for (const path of ['/executivo', '/gestao', '/vender', '/gestao/usuarios']) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/entrar\\?next=${encodeURIComponent(path).replace(/\//g, '%2F')}`));
    await expect(page.getByRole('heading', { name: 'Entrar no SBI' })).toBeVisible();
  }
  expect((await page.context().cookies()).map(cookie => cookie.name)).not.toContain('JSESSIONID');
});

test('[CT-DEMO-205] a tela de login leva a demonstracao e o fluxo real continua de pe', async ({ page }) => {
  await page.goto('/entrar');
  await expect(page.getByRole('heading', { name: 'Entrar no SBI' })).toBeVisible();
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible();
  await axe(page, '/entrar com o botão da demonstração');
  await page.getByRole('link', { name: 'Explorar demonstração' }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByText('Ambiente de Demonstração — Dados Simulados').first()).toBeVisible();
  await page.getByRole('link', { name: 'Entrar no sistema real' }).click();
  await expect(page).toHaveURL(/\/entrar$/);
});

test('[CT-DEMO-206] filtros, metas e acessibilidade nos tres perfis', async ({ page }) => {
  await page.goto('/demo');
  // O recorte e compartilhado: trocar de perfil mantem o periodo escolhido.
  await page.getByLabel('Período').selectOption('PREV_MONTH');
  await role(page, 'Gerente');
  await expect(page.getByLabel('Período')).toHaveValue('PREV_MONTH');
  // Cenario de referencia do mes fechado: R$ 56.700,00 de R$ 60.000,00.
  expect(await kpi(page, 'Faturamento confirmado')).toBeCloseTo(56_700, 2);
  await expect(page.getByText('94,5%').first()).toBeVisible();
  await axe(page, '/demo gerente');

  // Metas: edicao com a distribuicao fechando com a meta da loja.
  await page.getByRole('button', { name: 'Configurar metas' }).first().click();
  const goals = page.getByRole('dialog', { name: 'Metas comerciais da demonstração' });
  await expect(goals).toBeVisible();
  await goals.getByLabel('Meta da loja (R$)').fill('66000');
  await expect(goals.getByText('A soma precisa ser igual à meta da loja.')).toBeVisible();
  await goals.getByRole('button', { name: 'Dividir igualmente entre os vendedores' }).click();
  await expect(goals.getByText('A soma fecha com a meta da loja.')).toBeVisible();
  await goals.getByRole('button', { name: 'Salvar meta na demonstração' }).click();
  await expect(goals.getByText('salva na demonstração')).toBeVisible();
  await goals.getByRole('button', { name: 'Fechar' }).first().click();
  await expect(goals).toBeHidden();

  // Filtro de categoria muda indicadores, nunca a meta.
  await page.getByLabel('Categoria').selectOption({ label: 'Áudio' });
  expect(await kpi(page, 'Faturamento confirmado')).toBeLessThan(56_700);

  await role(page, 'CEO');
  await expect(page.getByRole('heading', { name: 'Painel executivo' })).toBeVisible();
  await axe(page, '/demo ceo');
});
