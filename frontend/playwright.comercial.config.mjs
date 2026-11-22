// Edicao comercial: roda sem banco e sem a API no ar. A landing, a cotacao, a privacidade e o suporte nao chamam
// o backend -- e justamente isso que estes testes provam.
//
// Uso: npm run test:e2e:comercial
// O servidor sobe com NEXT_PUBLIC_SBI_EDICAO=comercial e a fila de cotacoes em modo memoria. O build precisa ter
// sido feito com as mesmas variaveis publicas: a landing e estatica, entao a edicao e o estado da captacao entram
// no HTML no momento do build (docs/05-operacao/edicoes-e-variaveis.md).
import { defineConfig } from '@playwright/test';

const baseURL = process.env.SBI_E2E_BASE_URL || 'http://127.0.0.1:3200';
const origin = new URL(baseURL);
if (origin.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(origin.hostname) || origin.pathname !== '/' || origin.username || origin.password) {
  throw new Error('SBI_E2E_BASE_URL must be a local HTTP origin.');
}
const port = Number(origin.port || 80);

export default defineConfig({
  testDir: './e2e', testMatch: '**/comercial.spec.ts', fullyParallel: false, workers: 1, retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-comercial' }]],
  outputDir: 'test-results-comercial',
  use: { baseURL, trace: 'off' },
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: `${origin.origin}/`,
    reuseExistingServer: true,
    timeout: 60_000,
    env: {
      NEXT_PUBLIC_SBI_EDICAO: 'comercial',
      // Memoria: o teste nao deixa arquivo para tras e cada execucao comeca com a fila vazia.
      SBI_COTACAO_MODO: 'memoria',
    },
  },
});
