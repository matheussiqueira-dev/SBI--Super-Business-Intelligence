import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { userAvatar } from '../lib/user-avatars.ts';

const assignments = [
  ['Matheus Henrique Dias Siqueira', 21],
  ['Gabriel Sousa Vasconcelos', 26],
  ['Francisco Miguel De Lemos Sena Ferreira', 9],
  ['Allan Gabriel Almeida Barros', 12],
  ['Bruno Marciano De Amorim Josino', 19],
  ['Paulo Thiago Gomes Da Silva', 18],
  ['Christian Felix Gbedande Azonyetin', 13],
] as const;

test('os sete nomes solicitados apontam para imagens WebP locais nao vazias', () => {
  for (const [name, number] of assignments) {
    const src = userAvatar({ name });
    assert.equal(src, `/avatares/avatar-${number}.webp`);
    const data = readFileSync(join(process.cwd(), 'public', src!));
    assert.ok(data.length > 100);
    assert.equal(data.toString('ascii', 0, 4), 'RIFF');
    assert.equal(data.toString('ascii', 8, 12), 'WEBP');
    const atlas = readFileSync(join(process.cwd(), 'public', 'avatares', 'expressoes', `avatar-${number}.webp`));
    assert.ok(atlas.length > 100);
    assert.equal(atlas.toString('ascii', 8, 12), 'WEBP');
  }
});

test('preserva as quatro contas demo com nomes abreviados e e-mails existentes', () => {
  for (const [name, email, number] of [
    ['Matheus Siqueira', 'matheussiqueira@sbi.tech', 21],
    ['Gabriel Sousa', 'gabrielsousa@sbi.tech', 26],
    ['Francisco Ferreira', 'franciscoferreira@sbi.tech', 9],
    ['Allan Barros', 'allanbarros@sbi.tech', 12],
  ] as const) {
    assert.equal(userAvatar({ name }), `/avatares/avatar-${number}.webp`);
    assert.equal(userAvatar({ name: 'Nome atualizado', email: ` ${email.toUpperCase()} ` }), `/avatares/avatar-${number}.webp`);
  }
});

test('normaliza caixa, espacos e acentos, mas nao associa nomes parciais ou desconhecidos', () => {
  assert.equal(userAvatar({ name: '  MÁTHEUS   HENRIQUE DIAS SIQUEIRA  ' }), '/avatares/avatar-21.webp');
  for (const name of ['', 'Matheus', 'Bruno Josino', 'Outra Pessoa', '__proto__', 'Allan Barros Filho']) {
    assert.equal(userAvatar({ name, email: 'novo@example.test' }), null, name);
  }
  assert.equal(userAvatar({ name: 'Allan Barros', email: 'matheussiqueira@sbi.tech' }), '/avatares/avatar-21.webp');
});
