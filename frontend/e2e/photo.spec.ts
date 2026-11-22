// Ciclo da foto de produto pela tela do gerente (CT-WEB-15x), com a API isolada no ar.
//
// O que este arquivo trava: depois do envio a miniatura tem de aparecer carregada na lista NA MESMA navegacao,
// sem recarregar a pagina -- era aqui que o produto continuava no icone, porque o estagio da queda tinha sido
// escolhido quando ainda nao havia foto. E depois de remover e enviar outra, a URL e o validador precisam ser
// diferentes dos da primeira foto: com revisao reiniciando em 1, as duas publicacoes ficavam com o mesmo
// endereco e o mesmo ETag, e o cache de 30 dias podia devolver a imagem antiga.
import { test, expect, type Page } from '@playwright/test';
import { deflateSync } from 'node:zlib';
import { PASSWORD, seed } from './support.ts';

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (const byte of data) c = CRC[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, body: Buffer): Buffer {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(body.length);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([head, typed, crc]);
}

/** PNG RGB de cor cheia: valido para o ImageIO do servidor e com bytes diferentes por cor. */
function png(side: number, rgb: readonly [number, number, number]): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(side, 0);
  header.writeUInt32BE(side, 4);
  header[8] = 8;   // 8 bits por canal
  header[9] = 2;   // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: side }, () => rgb).flat())]);
  const raw = Buffer.concat(Array.from({ length: side }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function login(page: Page) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill('manager@example.test');
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).not.toHaveURL(/\/entrar/);
}

/** Linha do produto na lista de Produtos, filtrada pelo SKU sintetico. */
async function productRow(page: Page, sku: string) {
  await page.goto('/gestao/produtos');
  await page.getByLabel('Nome ou SKU').fill(sku);
  const row = page.getByRole('row').filter({ hasText: sku });
  await expect(row).toBeVisible();
  return row;
}

test('[CT-WEB-150] foto enviada aparece na lista sem recarregar, troca, cai no icone e volta com URL inedita', async ({ page }) => {
  const data = await seed();
  await login(page);
  const row = await productRow(page, data.sku);
  const thumb = row.locator('img').first();

  // Antes de qualquer envio: produto criado pela tela nao tem foto propria nem imagem no mapa local.
  await expect(thumb).toHaveAttribute('src', /\/produtos\/linhas\//);

  const upload = async (bytes: Buffer, action: string) => {
    await row.getByRole('button', { name: 'Foto', exact: true }).click();
    await page.getByLabel('Nova foto').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: bytes });
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(page.getByText(/foto atualizada\./)).toBeVisible();
  };

  // Primeiro envio: a miniatura precisa aparecer carregada de verdade, sem recarregar a pagina.
  await upload(png(160, [10, 40, 200]), 'Enviar foto');
  await expect(thumb).toHaveAttribute('src', /\/photo\/thumb\?rev=\d+/);
  await expect.poll(() => thumb.evaluate((img: HTMLImageElement) => img.naturalWidth),
    { timeout: 10_000 }).toBeGreaterThan(0);
  const first = await thumb.getAttribute('src');

  // Troca: endereco novo e imagem carregada de novo, ainda sem recarregar.
  await upload(png(160, [220, 30, 30]), 'Substituir foto');
  await expect(thumb).not.toHaveAttribute('src', first!);
  await expect(thumb).toHaveAttribute('src', /\/photo\/thumb\?rev=\d+/);
  await expect.poll(() => thumb.evaluate((img: HTMLImageElement) => img.naturalWidth),
    { timeout: 10_000 }).toBeGreaterThan(0);

  // Remocao: a lista volta para o icone da linha na mesma navegacao.
  await row.getByRole('button', { name: 'Foto', exact: true }).click();
  await page.getByRole('button', { name: 'Remover foto', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remover foto', exact: true }).click();
  await expect(page.getByText(/foto removida\./)).toBeVisible();
  await expect(thumb).toHaveAttribute('src', /\/produtos\/linhas\//);

  // Reenvio depois da remocao: nem a URL nem o validador podem repetir os da primeira foto.
  await upload(png(160, [20, 160, 60]), 'Enviar foto');
  await expect(thumb).toHaveAttribute('src', /\/photo\/thumb\?rev=\d+/);
  await expect.poll(() => thumb.evaluate((img: HTMLImageElement) => img.naturalWidth),
    { timeout: 10_000 }).toBeGreaterThan(0);
  const third = await thumb.getAttribute('src');
  expect(third).not.toBe(first);

  const before = await page.request.get(first!);
  const now = await page.request.get(third!);
  expect(now.status()).toBe(200);
  expect(now.headers().etag).toBeTruthy();
  expect(now.headers().etag).not.toBe(`"${(first ?? '').replace(/.*rev=/, 'r')}-t"`);
  // A URL da primeira revisao responde o conteudo de agora, e diz que nao pode ser guardada.
  expect(before.status()).toBe(200);
  expect(before.headers()['cache-control']).toContain('no-cache');
  expect(await before.body()).toEqual(await now.body());
});

test('[CT-WEB-151] envio invalido explica o motivo e a foto publicada continua na lista', async ({ page }) => {
  const data = await seed();
  await login(page);
  const row = await productRow(page, data.sku);
  const thumb = row.locator('img').first();

  await row.getByRole('button', { name: 'Foto', exact: true }).click();
  await page.getByLabel('Nova foto').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: png(160, [10, 40, 200]) });
  await page.getByRole('button', { name: 'Enviar foto', exact: true }).click();
  await expect(page.getByText(/foto atualizada\./)).toBeVisible();
  await expect(thumb).toHaveAttribute('src', /\/photo\/thumb\?rev=\d+/);
  const published = await thumb.getAttribute('src');

  // Arquivo que nao e imagem: o servidor confere o conteudo, nao o tipo declarado.
  await row.getByRole('button', { name: 'Foto', exact: true }).click();
  await page.getByLabel('Nova foto').setInputFiles({ name: 'nao-e-imagem.png', mimeType: 'image/png', buffer: Buffer.from('isto nao e uma imagem') });
  await page.getByRole('button', { name: 'Substituir foto', exact: true }).click();
  // A mensagem vem do servidor: a regra de conteudo explica o motivo em vez de um erro generico.
  await expect(page.getByRole('alert').filter({ hasText: /JPEG ou PNG|imagem|arquivo/i }).first()).toBeVisible();

  // A foto que estava publicada continua la, com o mesmo endereco.
  await page.getByRole('button', { name: 'Fechar', exact: true }).click().catch(() => undefined);
  const again = await productRow(page, data.sku);
  await expect(again.locator('img').first()).toHaveAttribute('src', published!);
});
