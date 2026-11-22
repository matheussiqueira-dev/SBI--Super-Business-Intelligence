#!/usr/bin/env node
// Capturas do proprio produto para a prova dos modulos da pagina comercial (plano comercial, secoes 03 e 07).
//
// A fonte e a demonstracao publica (/demo): catalogo e base sinteticos montados no navegador, sem login e sem
// chamar a API. Nenhuma tela de loja real entra na pagina publica, e a legenda de cada imagem identifica os dados
// como de demonstracao.
//
// Uso (na pasta frontend, com o servidor da edicao comercial no ar):
//   node scripts/comercial-capturas.mjs [--base http://127.0.0.1:3100] [--out public/comercial] [--evidencias ../reports/comercial]
//
// Gera, para cada prova, um PNG de origem em 1280x800 (fator 2) e, com Pillow, as variantes WebP de 960 e 640 px
// que o <img> da pagina declara. As evidencias de aceite (desktop, celular e login) vao para --evidencias.
import { mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { chromium, devices } from '@playwright/test';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const BASE = flag('base', 'http://127.0.0.1:3100').replace(/\/+$/, '');
const OUT = flag('out', join('public', 'comercial'));
const EVIDENCE = flag('evidencias', join('..', 'reports', 'comercial'));
const TMP = join(OUT, '_origem');

/** Aguarda a demonstracao montar a base sintetica no navegador. */
async function openDemo(page) {
  await page.goto(`${BASE}/demo`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { level: 1 }).first().waitFor({ state: 'visible' });
  await page.waitForTimeout(600);
}

/** O perfil da demonstracao e um grupo de radio ("Visualizar como") no toolbar. */
async function switchRole(page, label) {
  await page.getByRole('radio', { name: label, exact: true }).check({ force: true });
  await page.waitForTimeout(500);
}

async function openArea(page, name) {
  await page.getByRole('button', { name }).first().click();
  await page.waitForTimeout(500);
}

const SHOTS = [
  {
    file: 'prova-venda',
    async go(page) {
      await switchRole(page, 'Vendedor');
      await page.getByRole('button', { name: /registrar venda simulada/i }).first().click();
      await page.getByRole('dialog').waitFor({ state: 'visible' });
      await page.waitForTimeout(500);
    },
  },
  {
    file: 'prova-estoque',
    async go(page) {
      await switchRole(page, 'Gerente');
      await openArea(page, /estoque e giro/i);
    },
  },
  {
    file: 'prova-executivo',
    async go(page) {
      await switchRole(page, 'CEO');
      await openArea(page, /painel executivo/i);
    },
  },
];

const EVIDENCES = [
  { file: 'landing-desktop', path: '/', viewport: { width: 1440, height: 900 }, full: true },
  { file: 'landing-celular', path: '/', mobile: true, full: true },
  { file: 'cotacao-desktop', path: '/#cotacao', viewport: { width: 1440, height: 900 }, full: false },
  { file: 'login-desktop', path: '/entrar', viewport: { width: 1440, height: 900 }, full: false },
  { file: 'login-celular', path: '/entrar', mobile: true, full: false },
  { file: 'privacidade-desktop', path: '/privacidade', viewport: { width: 1440, height: 900 }, full: false },
  { file: 'suporte-celular', path: '/suporte', mobile: true, full: false },
];

/** Reduz o PNG de origem para as variantes WebP declaradas no <img>. Pillow ja e usado por product-thumbnails.py. */
function toWebp(source, target, width, height, quality) {
  const script = `
from PIL import Image
import sys
img = Image.open(sys.argv[1]).convert('RGB')
img = img.resize((int(sys.argv[3]), int(sys.argv[4])), Image.LANCZOS)
img.save(sys.argv[2], 'WEBP', quality=int(sys.argv[5]), method=6)
print(sys.argv[2])
`;
  const result = spawnSync('python', ['-c', script, source, target, String(width), String(height), String(quality)], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Pillow falhou para ${target}: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

async function main() {
  await mkdir(TMP, { recursive: true });
  await mkdir(EVIDENCE, { recursive: true });
  const browser = await chromium.launch();
  try {
    // --- provas dos modulos, a partir da demonstracao ---
    for (const shot of SHOTS) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: 'pt-BR' });
      const page = await context.newPage();
      await openDemo(page);
      await shot.go(page);
      const source = join(TMP, `${shot.file}.png`);
      await page.screenshot({ path: source });
      await context.close();
      console.log(toWebp(source, join(OUT, `${shot.file}-960.webp`), 960, 600, 80));
      console.log(toWebp(source, join(OUT, `${shot.file}-640.webp`), 640, 400, 78));
    }

    // --- evidencias de aceite ---
    for (const evidence of EVIDENCES) {
      const context = await browser.newContext({
        ...(evidence.mobile ? devices['Pixel 7'] : { viewport: evidence.viewport, deviceScaleFactor: 2 }),
        locale: 'pt-BR',
      });
      const page = await context.newPage();
      await page.goto(`${BASE}${evidence.path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(900);
      await page.screenshot({ path: join(EVIDENCE, `${evidence.file}.png`), fullPage: evidence.full });
      console.log(join(EVIDENCE, `${evidence.file}.png`));
      await context.close();
    }
  } finally {
    await browser.close();
  }
  // O PNG de origem nao e versionado: a pagina publica carrega so as variantes WebP.
  await rm(TMP, { recursive: true, force: true });
}

await main();
