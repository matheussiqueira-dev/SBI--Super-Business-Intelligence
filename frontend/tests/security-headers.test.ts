import test from 'node:test';
import assert from 'node:assert/strict';

const configUrl = new URL('../next.config.mjs', import.meta.url).href;

test('paginas recebem CSP contra enquadramento e cabecalhos de seguranca; rotas da API ficam de fora', async () => {
  const config = (await import(configUrl)).default;
  const rules: Array<{ source: string; headers: Array<{ key: string; value: string }> }> = await config.headers();
  assert.equal(rules.length, 1);
  const [rule] = rules;
  const headers = new Map(rule!.headers.map(header => [header.key, header.value]));
  assert.match(headers.get('Content-Security-Policy') ?? '', /frame-ancestors 'none'/);
  assert.match(headers.get('Content-Security-Policy') ?? '', /object-src 'none'/);
  assert.equal(headers.get('X-Frame-Options'), 'DENY');
  assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
  assert.ok(headers.has('Permissions-Policy'));
  assert.equal(rule!.source, '/:path((?!api/backend/).*)');
});
