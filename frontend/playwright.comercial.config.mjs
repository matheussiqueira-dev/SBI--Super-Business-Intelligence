// Edicao comercial: roda sem banco e sem a API no ar. A landing, a cotacao, a privacidade e o suporte nao chamam
// o backend -- e justamente isso que estes testes provam.
//
// Uso: npm run test:e2e:comercial -- um comando, sem preparo nenhum antes.
// A configuracao faz o proprio build antes de subir o servidor, com NEXT_PUBLIC_SBI_EDICAO=comercial e a fila de
// cotacoes em modo memoria. Isso nao e conveniencia: a landing e estatica, entao a edicao E o estado da captacao
// entram no HTML no momento do build (docs/05-operacao/edicoes-e-variaveis.md). Rodar a suite sobre um build
// feito com outras variaveis -- o build padrao, por exemplo -- reprova os testes do formulario, porque o HTML
// publicado traz o aviso de captacao indisponivel em vez dos campos.
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
    command: `npm run build && npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: `${origin.origin}/`,
    // Sem reaproveitar servidor: um servidor de outra edicao no ar faria a suite passar ou falhar pelo motivo
    // errado, e e justamente a edicao que estes testes conferem.
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_SBI_EDICAO: 'comercial',
      // Memoria: o teste nao deixa arquivo para tras e cada execucao comeca com a fila vazia.
      SBI_COTACAO_MODO: 'memoria',
    },
  },
});
