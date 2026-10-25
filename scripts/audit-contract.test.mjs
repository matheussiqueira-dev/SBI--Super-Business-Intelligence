import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { auditContract, parseMatrix, targetPath, v4Path, v5Path, v6Path, matrixPath } from './audit-contract.mjs';
const target = JSON.parse(readFileSync(targetPath, 'utf8'));
test('planned target has references and profile policies', () => {
  const result = auditContract(target);
  assert.deepEqual(result.errors, []);
  assert.equal(result.paths, 12);
  assert.equal(result.operations.length, 13);
});
test('broken reference is detected', () => {
  const doc = structuredClone(target);
  doc.components.schemas.SellerPerformance.properties.seller.$ref = '#/components/schemas/Missing';
  assert.ok(auditContract(doc).errors.some(e => e.includes('Unresolved')));
});
test('protected endpoint cannot declare public security', () => {
  const doc = structuredClone(target);
  doc.paths['/stock/products'].get.security = [];
  assert.ok(auditContract(doc).errors.some(e => e.includes('Missing session')));
});

test('anonymous alternative cannot bypass session policy', () => {
  const doc = structuredClone(target);
  doc.paths['/stock/products'].get.security = [{ sessionAuth: [] }, {}];
  assert.ok(auditContract(doc).errors.some(e => e.includes('Missing session')));
});

test('login and logout require CSRF and document rejection', () => {
  for (const path of ['/auth/login', '/auth/logout']) {
    const doc = structuredClone(target);
    doc.paths[path].post.parameters = [];
    assert.ok(auditContract(doc).errors.some(e => e.includes('Missing required CSRF')));
  }
});

test('session login rejects bearer response and malformed cookie scheme', () => {
  const doc = structuredClone(target);
  doc.components.schemas.AuthResponse.properties.accessToken = { type: 'string' };
  doc.components.securitySchemes.sessionAuth.in = 'header';
  const errors = auditContract(doc).errors;
  assert.ok(errors.some(e => e.includes('must not expose')));
  assert.ok(errors.some(e => e.includes('cookie security')));
});

test('archived v2 still passes its original bearer policies', () => {
  const doc = JSON.parse(readFileSync(new URL('../config/openapi/target-loja-gestao-openapi-2026-10-03-v2.json', import.meta.url)));
  assert.deepEqual(auditContract(doc).errors, []);
});
test('manager policy cannot admit a seller', () => {
  const doc = structuredClone(target);
  doc.paths['/management/summary'].get['x-roles'] = ['GERENTE', 'VENDEDOR'];
  assert.ok(auditContract(doc).errors.some(e => e.includes('Missing manager')));
});
test('seller projection cannot allow unknown root or nested fields', () => {
  for (const name of ['SellerPerformance', 'UserSession', 'Money']) {
    const doc = structuredClone(target);
    delete doc.components.schemas[name].additionalProperties;
    assert.ok(auditContract(doc).errors.some(e => e.includes('Open seller')));
  }
});
test('explicit sensitive field in seller projection is detected', () => {
  const doc = structuredClone(target);
  doc.components.schemas.SellerPerformance.properties.cost = { type: 'number' };
  assert.ok(auditContract(doc).errors.some(e => e.includes('Sensitive field')));
});
test('required path parameters cannot disappear', () => {
  const doc = structuredClone(target);
  doc.paths['/orders/{id}/cancel'].post.parameters = [];
  assert.ok(auditContract(doc).errors.some(e => e.includes('Missing required path')));
});

const v4 = JSON.parse(readFileSync(v4Path, 'utf8'));
const matrix = parseMatrix(readFileSync(matrixPath, 'utf8'));
const auditV4 = (doc, rows = matrix) => auditContract(doc, { matrix: rows }).errors;
test('v4 draft passes with the executable access matrix', () => {
  const result = auditContract(v4, { matrix });
  assert.deepEqual(result.errors, []);
  assert.equal(result.paths, 35);
  assert.equal(result.operations.length, 45);
});
test('v4 accepts implemented operations; v3 stays planning-only', () => {
  const doc = structuredClone(v4);
  doc.paths['/auth/me'].get['x-status'] = 'implemented';
  assert.deepEqual(auditV4(doc), []);
  doc.paths['/auth/me'].get['x-status'] = 'done';
  assert.ok(auditV4(doc).some(e => e.includes('Missing planned operation marker')));
  const v3 = structuredClone(target);
  v3.paths['/auth/me'].get['x-status'] = 'implemented';
  assert.ok(auditContract(v3).errors.some(e => e.includes('Missing planned operation marker')));
});
test('v4 x-roles must match the access matrix', () => {
  const rows = structuredClone(matrix);
  rows.find(r => r.method === 'GET' && r.path === '/stock/products').vendedor = 'PERMIT';
  assert.ok(auditV4(v4, rows).some(e => e.includes('x-roles differ') && e.includes('/stock/products')));
  const missing = matrix.filter(r => r.path !== '/sales/quote');
  assert.ok(auditV4(v4, missing).some(e => e.includes('missing from access matrix')));
  const anonymous = structuredClone(matrix);
  anonymous.find(r => r.method === 'GET' && r.path === '/auth/me').anonymous = 'PERMIT';
  assert.ok(auditV4(v4, anonymous).some(e => e.includes('Anonymous access differs')));
});
test('v4 seller responses stay closed and free of cost data', () => {
  const cost = structuredClone(v4);
  cost.components.schemas.CatalogItem.properties.avgCost = { $ref: '#/components/schemas/Money' };
  assert.ok(auditV4(cost).some(e => e.includes('Sensitive field') && e.includes('avgCost')));
  const open = structuredClone(v4);
  delete open.components.schemas.CustomerOrderSummary.additionalProperties;
  assert.ok(auditV4(open).some(e => e.includes('Open seller projection')));
});
test('v4 request schemas reject unknown properties', () => {
  const doc = structuredClone(v4);
  delete doc.components.schemas.StockAdjustmentRequest.additionalProperties;
  assert.ok(auditV4(doc).some(e => e.includes('Open v4 schema') && e.includes('StockAdjustmentRequest')));
});
test('v4 sale creation requires Idempotency-Key and protected operations keep session security', () => {
  const key = structuredClone(v4);
  key.paths['/sales/orders'].post.parameters = key.paths['/sales/orders'].post.parameters
    .filter(p => p.$ref !== '#/components/parameters/IdempotencyKey');
  assert.ok(auditV4(key).some(e => e.includes('Idempotency-Key')));
  const open = structuredClone(v4);
  open.paths['/sales/catalog'].get.security = [];
  const errors = auditV4(open);
  assert.ok(errors.some(e => e.includes('x-roles and security disagree')));
  assert.ok(errors.some(e => e.includes('Missing session')));
});

const v5 = JSON.parse(readFileSync(v5Path, 'utf8'));
test('v5 keeps every v4 operation and passes with the executable access matrix', () => {
  const result = auditContract(v5, { matrix });
  assert.deepEqual(result.errors, []);
  const v5Operations = new Set(result.operations.map(o => `${o.method} ${o.path}`));
  for (const o of auditContract(v4, { matrix }).operations) assert.ok(v5Operations.has(`${o.method} ${o.path}`), `${o.method} ${o.path}`);
});
test('v5 user administration stays manager-only and closed', () => {
  const rows = structuredClone(matrix);
  const row = rows.find(r => r.method === 'GET' && r.path === '/users');
  if (row) row.vendedor = 'PERMIT';
  else rows.push({ method: 'GET', path: '/users', anonymous: '401', vendedor: 'PERMIT', gerente: 'PERMIT' });
  const implemented = structuredClone(v5);
  implemented.paths['/users'].get['x-status'] = 'implemented';
  assert.ok(auditContract(implemented, { matrix: rows }).errors.some(e => e.includes('x-roles differ') && e.includes('/users')));
  const open = structuredClone(v5);
  delete open.components.schemas.UserCreateRequest.additionalProperties;
  assert.ok(auditContract(open, { matrix }).errors.some(e => e.includes('Open v4 schema') && e.includes('UserCreateRequest')));
});
test('planned operations wait for their matrix row; implemented ones require it', () => {
  const doc = structuredClone(v5);
  doc.paths['/users'].get['x-status'] = 'planned';
  const rows = matrix.filter(r => r.path !== '/users');
  assert.ok(!auditContract(doc, { matrix: rows }).errors.some(e => e.includes('GET /users') && e.includes('access matrix')));
  doc.paths['/users'].get['x-status'] = 'implemented';
  assert.ok(auditContract(doc, { matrix: rows }).errors.some(e => e.includes('missing from access matrix: GET /users')));
});

const v6 = JSON.parse(readFileSync(v6Path, 'utf8'));
test('v6 keeps every v5 operation, gives the CEO every manager route and passes with the matrix', () => {
  const result = auditContract(v6, { matrix });
  assert.deepEqual(result.errors, []);
  const v6Operations = new Map(result.operations.map(o => [`${o.method} ${o.path}`, o.roles]));
  for (const o of auditContract(v5, { matrix }).operations) {
    const key = `${o.method} ${o.path}`;
    assert.ok(v6Operations.has(key), key);
    if (o.roles.includes('GERENTE')) assert.ok(v6Operations.get(key).includes('CEO'), key);
  }
  for (const key of ['GET /executive/overview', 'PUT /executive/goals/annual']) assert.deepEqual(v6Operations.get(key), ['CEO']);
  assert.deepEqual(v6Operations.get('PATCH /users/{id}/manager'), ['CEO', 'GERENTE']);
});
test('v6 executive area cannot admit a manager and manager routes must admit the CEO', () => {
  const doc = structuredClone(v6);
  doc.paths['/executive/overview'].get['x-roles'] = ['CEO', 'GERENTE'];
  assert.ok(auditContract(doc).errors.some(e => e.includes('Missing executive policy')));
  const rows = structuredClone(matrix);
  rows.find(r => r.method === 'GET' && r.path === '/stock/products').ceo = '403';
  assert.ok(auditContract(v6, { matrix: rows }).errors.some(e => e.includes('x-roles differ') && e.includes('/stock/products')));
  const managerOnly = structuredClone(v6);
  managerOnly.paths['/management/summary'].get['x-roles'] = ['GERENTE'];
  assert.ok(auditContract(managerOnly).errors.some(e => e.includes('Missing manager policy')));
});
test('access matrix keeps accepting the two-role header of the archived contracts', () => {
  assert.deepEqual(parseMatrix(['method,path,anonymous,vendedor,gerente', 'GET,/x,401,403,PERMIT'].join('\n')),
    [{ method: 'GET', path: '/x', anonymous: '401', vendedor: '403', gerente: 'PERMIT' }]);
  assert.throws(() => parseMatrix('method,path,ceo'), /Unexpected access matrix header/);
});
