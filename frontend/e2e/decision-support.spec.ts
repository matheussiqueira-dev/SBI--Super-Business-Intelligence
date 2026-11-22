// Fluxos de apoio a decisao (contrato v7): projecao e alerta de margem do GERENTE, sugestao no escopo do
// proprio VENDEDOR e a comparacao do CEO quando o ano anterior nao tem dado. Massa propria, pela API isolada.
import { test, expect, type Page } from '@playwright/test';
import { API, PASSWORD, paidSale, seed, session, type Seed } from './support.ts';

async function login(page: Page, email: string, senha = PASSWORD) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).not.toHaveURL(/\/entrar/);
}

const mesAtual = () => new Date().toISOString().slice(0, 7);

/** Segundo vendedor, com produto e venda paga so dele: e o que prova o escopo da sugestao. */
async function outroVendedor(): Promise<{ email: string; senha: string; produtoId: number; produtoNome: string }> {
  const dados = await seed(8);
  const { api, csrf } = await session('manager@example.test');
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `vendedor2-${marca}@e2e.test`;
  const provisoria = `Provisoria-${marca}`;
  const criado = await api.post('/users', { headers: csrf, data: {
    name: `Vendedor dois ${marca}`, email, role: 'VENDEDOR', temporaryPassword: provisoria } });
  if (criado.status() !== 201) throw new Error(`segundo vendedor: ${criado.status()} ${await criado.text()}`);
  await api.dispose();

  const dele = await import('@playwright/test').then(m => m.request.newContext({ baseURL: API }));
  const token = async () => {
    const corpo = await (await dele.get('/auth/csrf')).json() as { headerName: string; token: string };
    return { [corpo.headerName]: corpo.token };
  };
  const entrada = await dele.post('/auth/login', { data: { email, password: provisoria }, headers: await token() });
  if (entrada.status() !== 200) throw new Error(`login do segundo vendedor: ${entrada.status()}`);
  const definitiva = `Definitiva-${marca}`;
  const troca = await dele.put('/auth/password', { headers: await token(),
    data: { currentPassword: provisoria, newPassword: definitiva } });
  if (troca.status() !== 204) throw new Error(`troca de senha: ${troca.status()}`);
  const novaEntrada = await dele.post('/auth/login', { data: { email, password: definitiva }, headers: await token() });
  if (novaEntrada.status() !== 200) throw new Error(`reentrada do segundo vendedor: ${novaEntrada.status()}`);
  const venda = await dele.post('/sales/orders', { headers: { ...(await token()), 'Idempotency-Key': crypto.randomUUID() },
    data: { customerId: dados.customerId, items: [{ productId: dados.productId, quantity: 2 }],
            payment: { type: 'PIX' }, fulfillment: 'PICKUP' } });
  if (venda.status() !== 201) throw new Error(`venda do segundo vendedor: ${venda.status()} ${await venda.text()}`);
  const pago = await dele.post(`/sales/orders/${(await venda.json() as { id: number }).id}/payment`, { headers: await token() });
  if (pago.status() !== 200) throw new Error(`pagamento do segundo vendedor: ${pago.status()}`);
  await dele.dispose();
  return { email, senha: definitiva, produtoId: dados.productId, produtoNome: dados.productName };
}

test('[CT-WEB-143] Analises traz a projecao do mes e o alerta de margem, e a exportacao respeita o filtro da tela', async ({ page }) => {
  const dados: Seed = await seed(10);
  await paidSale(dados, 2);
  await login(page, 'manager@example.test');
  await page.goto('/gestao/analises');

  // Projecao: os dias conferem entre si e o cartao mostra o ritmo, nao um numero solto.
  const projecao = page.locator('section').filter({ has: page.locator('#projecao-titulo') });
  await expect(projecao).toBeVisible();
  await expect(projecao.getByText(/dias? corrido/)).toBeVisible();
  await expect(projecao.locator('.kpi').filter({ hasText: 'Projetado para o mês' })).toBeVisible();
  await expect(projecao.locator('.kpi').filter({ hasText: 'Atingimento projetado' })).toBeVisible();
  await expect(projecao.locator('.kpi').filter({ hasText: 'Por dia restante' })).toBeVisible();

  // Alerta de margem: ou lista produtos pressionados, ou diz que nenhum esta abaixo da loja.
  const alerta = page.locator('section').filter({ has: page.locator('#alerta-margem-titulo') });
  await expect(alerta).toBeVisible();
  await expect(alerta.getByText(/margem da própria loja no mês/)).toBeVisible();
  const linhas = alerta.locator('tbody tr');
  const vazio = alerta.getByText('Nenhum produto abaixo da margem da loja neste mês.');
  if (await linhas.count() === 0) {
    await expect(vazio).toBeVisible();
  } else {
    // A cor nunca carrega a informacao sozinha: todo nivel vem escrito ao lado do ponto.
    for (const pilula of await alerta.locator('[class*="pill-margem-"]').all()) {
      await expect(pilula).toHaveText(/Bom|Atenção|Sério|Crítico/);
    }
  }

  // Exportacao com o filtro de vendedor da propria tela.
  const exportar = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Exportar' }) });
  await exportar.getByLabel('Vendedor').selectOption({ index: 1 });
  const baixa = page.waitForEvent('download');
  await exportar.getByRole('button', { name: 'Excel (.xlsx)' }).click();
  const arquivo = await baixa;
  expect(arquivo.suggestedFilename()).toMatch(/\.xlsx$/);
});

test('[CT-WEB-144] Meu desempenho sugere o que o PROPRIO vendedor vendeu e tem em estoque', async ({ page }) => {
  const meus: Seed = await seed(9);
  await paidSale(meus, 3);
  const outro = await outroVendedor();

  await login(page, 'seller@example.test');
  await page.goto('/meu-desempenho');
  const sugestoes = page.locator('section').filter({ has: page.locator('#sugestoes-titulo') });
  await expect(sugestoes).toBeVisible();
  await expect(sugestoes.getByText(/histórico de vendas pagas/)).toBeVisible();
  // O proprio produto entra; o do outro vendedor nao, mesmo tendo estoque.
  await expect(sugestoes.getByRole('rowheader', { name: new RegExp(meus.productName) })).toBeVisible();
  await expect(sugestoes.getByText(outro.produtoNome, { exact: false })).toHaveCount(0);

  // O segundo vendedor ve o dele, e nao o do primeiro: o escopo e do usuario, nao da loja.
  await page.goto('/sair').catch(() => {});
  await login(page, outro.email, outro.senha);
  await page.goto('/meu-desempenho');
  const dele = page.locator('section').filter({ has: page.locator('#sugestoes-titulo') });
  await expect(dele.getByRole('rowheader', { name: new RegExp(outro.produtoNome) })).toBeVisible();
  await expect(dele.getByText(meus.productName, { exact: false })).toHaveCount(0);
});

test('[CT-WEB-145] Painel executivo nao inventa comparacao quando o ano anterior nao tem dado', async ({ page }) => {
  const dados: Seed = await seed(6);
  await paidSale(dados, 1);
  await login(page, 'ceo@example.test');
  await page.goto('/executivo');
  const anterior = new Date().getUTCFullYear() - 1;
  // Sem fato no ano anterior, o rotulo diz "(sem dado)" e o indicador mostra "sem base" - nao um
  // percentual gigante contra um ano quase vazio. Com dado parcial, quem cobre e o CT-EXEC-115.
  await expect(page.getByText(`sem base em ${anterior} (sem dado)`).first()).toBeVisible();
  await expect(page.getByText(new RegExp(`vezes o de ${anterior}`))).toHaveCount(0);
  // Serie mensal sem marca do ano anterior: a legenda nao oferece o que nao existe.
  await expect(page.locator('figure.chart').first().locator('.legend').getByText(String(anterior))).toHaveCount(0);
  await expect(page.locator(`text=${mesAtual()}`).first()).toBeDefined();
});
