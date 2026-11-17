// Demonstracao publica: roda sem banco e sem a API no ar, porque /demo nao chama o backend.
// Uso: npm run test:e2e:demo (ou npx playwright test -c playwright.demo.config.mjs).
import { defineConfig } from '@playwright/test';
const baseURL = process.env.SBI_E2E_BASE_URL || 'http://127.0.0.1:3100';
const origin = new URL(baseURL);
if (origin.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(origin.hostname) || origin.pathname !== '/' || origin.username || origin.password) {
  throw new Error('SBI_E2E_BASE_URL must be a local HTTP origin.');
}
const port = Number(origin.port || 80);
export default defineConfig({
  testDir: './e2e', testMatch: '**/demo.spec.ts', fullyParallel: false, workers: 1, retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-demo' }]],
  outputDir: 'test-results-demo',
  use: { baseURL, trace: 'off' },
  webServer: { command: `npm run start -- --hostname 127.0.0.1 --port ${port}`, url: `${origin.origin}/demo`, reuseExistingServer: true, timeout: 60000 },
});
