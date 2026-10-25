import { defineConfig } from '@playwright/test';
const baseURL = process.env.SBI_E2E_BASE_URL || 'http://127.0.0.1:3000';
const origin = new URL(baseURL);
if (origin.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(origin.hostname) || origin.pathname !== '/' || origin.username || origin.password) {
  throw new Error('SBI_E2E_BASE_URL must be a local HTTP origin.');
}
const port = Number(origin.port || 80);
export default defineConfig({
  testDir:'./e2e', testMatch:'**/*.spec.ts', testIgnore:'**/published/**', fullyParallel:false, workers:1, retries:0,
  reporter:[['list'], ['html', { open:'never' }]],
  use:{ baseURL, trace:'off' },
  webServer:{ command:`npm run start -- --hostname 127.0.0.1 --port ${port}`, url:`${origin.origin}/entrar`, reuseExistingServer:false, timeout:60000 },
});
