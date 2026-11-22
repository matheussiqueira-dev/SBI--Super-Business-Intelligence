// Catalogo e identificacao da demonstracao por edicao (CT-COM-13x).
//
// A demonstracao comercial existe porque o recorte Olist tem licenca nao comercial: o botao da pagina comercial
// nao pode abrir aquele catalogo. Estes testes travam as tres coisas que fazem a variante servir para isso --
// nada de terceiro na tela, nenhuma pessoa real, e o cenario continuando a fechar com o roteiro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { APPLE_PRODUCTS } from '../lib/demo/apple-catalog.ts';
import { COMERCIAL_PRODUCTS } from '../lib/demo/comercial-catalog.ts';
import { catalogSource, demoCatalog } from '../lib/demo/catalog.ts';
import { basketFor, lowStockFor, peopleFor, storeFor } from '../lib/demo/scenario.ts';
import { productImage, productLine } from '../lib/product-images.ts';

const ICONS = new Set(readdirSync('public/produtos/linhas').map(file => file.replace(/\.svg$/, '')));

test('[CT-COM-130] cada edicao abre a propria demonstracao', () => {
  assert.equal(demoCatalog('academica'), APPLE_PRODUCTS);
  assert.equal(demoCatalog('comercial'), COMERCIAL_PRODUCTS);
  assert.equal(catalogSource('academica'), 'olist');
  assert.equal(catalogSource('comercial'), 'propria');
});

test('[CT-COM-131] o catalogo comercial e proprio: nenhum codigo nem nome em comum com o academico', () => {
  const academicSkus = new Set(APPLE_PRODUCTS.map(([sku]) => sku));
  const academicNames = new Set(APPLE_PRODUCTS.map(([, name]) => name));
  for (const [sku, name] of COMERCIAL_PRODUCTS) {
    assert.ok(!academicSkus.has(sku), `SKU repetido do catalogo academico: ${sku}`);
    assert.ok(!academicNames.has(name), `nome repetido do catalogo academico: ${name}`);
  }
  // Marca de terceiro nao entra numa tela apresentada a cliente.
  const forbidden = /apple|iphone|ipad|macbook|imac|mac mini|airpods|airtag|homepod|apple ?tv|magsafe|belkin|watch series|apple pencil|magic (mouse|keyboard)|smart folio|lightning/i;
  for (const [sku, name] of COMERCIAL_PRODUCTS) {
    assert.ok(!forbidden.test(name), `marca de terceiro no nome: ${name}`);
    assert.ok(!forbidden.test(sku), `marca de terceiro no codigo: ${sku}`);
  }
});

test('[CT-COM-132] o cenario comercial fecha com o roteiro: mesmas categorias, mesma faixa de preco', () => {
  assert.equal(COMERCIAL_PRODUCTS.length, APPLE_PRODUCTS.length);
  COMERCIAL_PRODUCTS.forEach(([, , category, price, cost], index) => {
    const [, , academicCategory, academicPrice, academicCost] = APPLE_PRODUCTS[index]!;
    assert.equal(category, academicCategory);
    assert.equal(price, academicPrice);
    assert.equal(cost, academicCost);
    assert.ok(cost < price, 'custo abaixo do preco em todo item');
  });
});

test('[CT-COM-133] cesta sugerida e itens em alerta existem no catalogo da propria edicao', () => {
  for (const edition of ['academica', 'comercial'] as const) {
    const skus = new Set(demoCatalog(edition).map(([sku]) => sku));
    for (const sku of [...basketFor(edition), ...lowStockFor(edition)]) {
      assert.ok(skus.has(sku), `${edition}: ${sku} nao esta no catalogo`);
    }
  }
});

test('[CT-COM-134] produto comercial cai num icone de linha que existe, sem foto de terceiro', () => {
  for (const [sku, name] of COMERCIAL_PRODUCTS) {
    const line = productLine(name);
    assert.ok(ICONS.has(line), `${name}: icone ${line} nao existe em public/produtos/linhas`);
    const image = productImage(sku, name);
    assert.equal(image.photo, false, `${name} nao pode usar foto do mapa academico`);
    assert.equal(image.src, `/produtos/linhas/${line}.svg`);
  }
  // A edicao comercial nao usa so o icone genérico: as linhas do catalogo aparecem.
  assert.ok(new Set(COMERCIAL_PRODUCTS.map(([, name]) => productLine(name))).size >= 5);
});

test('[CT-COM-135] a demonstracao comercial nao mostra pessoa real nem a unidade academica', () => {
  const academic = peopleFor('academica');
  const commercial = peopleFor('comercial');
  const academicNames = new Set(academic.map(person => person.name));
  for (const person of commercial) {
    assert.ok(!academicNames.has(person.name), `pessoa real na demonstracao comercial: ${person.name}`);
  }
  // Mesmos IDs e papeis: e isso que mantem o mes de referencia do roteiro reconciliando nas duas edicoes.
  assert.deepEqual(commercial.map(({ id, role, managerId }) => ({ id, role, managerId })),
    academic.map(({ id, role, managerId }) => ({ id, role, managerId })));
  assert.notEqual(storeFor('comercial').name, storeFor('academica').name);
  assert.equal(storeFor('comercial').segment, 'Eletrônicos e acessórios');
});
