import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_EDITION, EDITIONS, isCommercial, parseEdition } from '../lib/edition.ts';
import { channels, indexable, privacyStage, publicUrl, siteOrigin, supportCoverage, SUPPORT_TEXT } from '../lib/comercial/config.ts';
import { AUDIENCE, FAQ, FOOTER, HERO, MODULES, NAV, QUOTE, ROUTES } from '../lib/comercial/copy.ts';
import { isPublicPath } from '../lib/public-routes.ts';
import { REVEAL_FLAG, REVEAL_SCRIPT } from '../components/brand/reveal.ts';

test('[CT-COM-001] edicao invalida ou ausente cai na academica: publicar o comercial e sempre explicito', () => {
  assert.equal(DEFAULT_EDITION, 'academica');
  assert.deepEqual([...EDITIONS].sort(), ['academica', 'comercial']);
  for (const value of [undefined, null, '', ' ', 'COMERCIAl ', 'producao', 'comercial-x']) {
    const parsed = parseEdition(value);
    assert.ok(EDITIONS.includes(parsed), `${String(value)} -> ${parsed}`);
  }
  assert.equal(parseEdition('COMERCIAl '), 'comercial');
  assert.equal(parseEdition('producao'), 'academica');
  assert.equal(isCommercial('comercial'), true);
  assert.equal(isCommercial('academica'), false);
});

test('[CT-COM-002] link externo so entra na navegacao se for https sem credencial', () => {
  assert.equal(publicUrl('https://suporte.sbi.tech/'), 'https://suporte.sbi.tech/');
  assert.equal(publicUrl('http://suporte.sbi.tech'), null);
  assert.equal(publicUrl('https://user:senha@suporte.sbi.tech'), null);
  assert.equal(publicUrl('javascript:alert(1)'), null);
  assert.equal(publicUrl('suporte.sbi.tech'), null);
  assert.equal(publicUrl(undefined), null);
  assert.equal(publicUrl('  '), null);
});

test('[CT-COM-003] canal nao configurado some em vez de virar link morto', () => {
  const none = channels({});
  assert.deepEqual(none, { supportUrl: null, statusUrl: null, dutyPhone: null, salesEmail: null });

  const full = channels({
    NEXT_PUBLIC_SBI_SUPORTE_URL: 'https://suporte.sbi.tech/hc',
    NEXT_PUBLIC_SBI_STATUS_URL: 'https://status.sbi.tech',
    NEXT_PUBLIC_SBI_PLANTAO_TELEFONE: '+55 (85) 99999-0000',
    NEXT_PUBLIC_SBI_COMERCIAL_EMAIL: 'Comercial@SBI.tech',
  });
  assert.equal(full.supportUrl, 'https://suporte.sbi.tech/hc');
  assert.equal(full.statusUrl, 'https://status.sbi.tech/');
  assert.equal(full.dutyPhone, '+5585999990000');
  assert.equal(full.salesEmail, 'comercial@sbi.tech');

  // Valor malformado e tratado como ausente, nunca repassado cru para a tela.
  const bad = channels({ NEXT_PUBLIC_SBI_PLANTAO_TELEFONE: '85 99999-0000', NEXT_PUBLIC_SBI_COMERCIAL_EMAIL: 'sem-arroba' });
  assert.equal(bad.dutyPhone, null);
  assert.equal(bad.salesEmail, null);
});

test('[CT-COM-004] "Suporte remoto 24 horas" so aparece quando a equipe declara a cobertura', () => {
  assert.equal(supportCoverage(undefined), 'abertura');
  assert.equal(supportCoverage('parcial'), 'abertura');
  assert.equal(supportCoverage(' CONTINUO '), 'continuo');
  assert.match(SUPPORT_TEXT.continuo.title, /24 horas/);
  assert.doesNotMatch(SUPPORT_TEXT.abertura.title, /24 horas/);
  assert.match(SUPPORT_TEXT.abertura.title, /Abra chamados a qualquer hora/);
});

test('[CT-COM-005] indexacao e canonica so na edicao comercial com endereco publico configurado', () => {
  assert.equal(siteOrigin('https://sbi.tech/comercial'), 'https://sbi.tech');
  assert.equal(siteOrigin('http://sbi.tech'), null);
  assert.equal(siteOrigin(undefined), null);
  assert.equal(indexable('comercial', 'https://sbi.tech'), true);
  assert.equal(indexable('comercial', null), false);
  assert.equal(indexable('academica', 'https://sbi.tech'), false);
});

test('[CT-COM-006] aviso de privacidade nasce identificado como homologacao', () => {
  assert.equal(privacyStage(undefined), 'homologacao');
  assert.equal(privacyStage('rascunho'), 'homologacao');
  assert.equal(privacyStage('publicado'), 'publicado');
});

test('[CT-COM-010] rotas publicas sao a lista exata do plano; o resto exige sessao', () => {
  for (const edition of EDITIONS) {
    for (const path of ['/entrar', '/demo', '/demo/', '/demo/creditos', '/privacidade', '/suporte', '/api/cotacao']) {
      assert.equal(isPublicPath(path, edition), true, `${path} deveria ser publica na edicao ${edition}`);
    }
    for (const path of [
      '/vender', '/gestao', '/gestao/produtos', '/executivo', '/conta/senha', '/clientes/1',
      '/entrar-agora', '/demonstracao', '/privacidade-interna', '/suporte-tecnico',
      '/api/cotacao/fila', '/api/outra',
    ]) {
      assert.equal(isPublicPath(path, edition), false, `${path} nao deveria ser publica na edicao ${edition}`);
    }
  }
  // A raiz e publica so na edicao comercial. Na academica ela continua passando pelo proxy, que responde 307
  // para /entrar: a pagina so e alcancada com cookie, e o redirecionamento nao vira meta refresh.
  assert.equal(isPublicPath('/', 'comercial'), true);
  assert.equal(isPublicPath('/', 'academica'), false);
});

test('[CT-COM-011] primeira dobra usa o texto aprovado e as duas acoes do plano', () => {
  assert.equal(HERO.headline, 'O mesmo número para toda a loja.');
  assert.equal(
    HERO.lead,
    'O SBI conecta as vendas do balcão ao estoque e às metas. Sua equipe registra os pedidos, o gerente acompanha o saldo e a direção consulta os resultados da loja no mesmo sistema.',
  );
  assert.equal(HERO.primary.label, 'Solicitar cotação');
  assert.equal(HERO.primary.href, '/#cotacao');
  assert.equal(HERO.secondary.label, 'Explorar demonstração');
  assert.equal(HERO.secondary.href, '/demo');
  assert.ok(HERO.photoAlt.length > 20, 'a foto precisa de alternativa descritiva');
  assert.match(HERO.photoCredit, /conceitual/i);
});

test('[CT-COM-012] cabecalho e rodape levam Produto, Implantacao, Suporte, Entrar e cotacao', () => {
  assert.deepEqual(NAV.map(item => item.label), ['Produto', 'Implantação', 'Suporte']);
  assert.deepEqual(NAV.map(item => item.href), ['/#produto', '/#implantacao', '/suporte']);
  assert.deepEqual(ROUTES, {
    home: '/', quote: '/#cotacao', login: '/entrar', demo: '/demo', privacy: '/privacidade', support: '/suporte',
  });
});

test('[CT-COM-013] a oferta nao promete escopo a homologar', () => {
  const fine = FOOTER.product + ' ';
  assert.match(fine, /SBI/);
  const limits = AUDIENCE.checks.join(' ');
  for (const topic of [/fiscal/i, /offline/i, /marketplace/i, /unidades/i]) {
    assert.match(limits, topic, `limite ausente: ${topic}`);
  }
  // Nenhum texto da pagina pode afirmar que emite nota ou processa pagamento.
  const all = [HERO.lead, ...MODULES.flatMap(m => [m.body, ...m.points]), ...FAQ.map(f => f.a)].join(' ');
  assert.doesNotMatch(all, /emit[ei]\s+(a\s+)?nota|emiss[ãa]o fiscal incluída|processa(mos)? (o )?pagamento/i);
});

test('[CT-COM-014] cada modulo tem captura propria com alternativa descritiva', () => {
  assert.equal(MODULES.length, 3);
  const files = MODULES.map(module => module.shot.file);
  assert.deepEqual(files, ['prova-venda', 'prova-estoque', 'prova-executivo']);
  for (const module of MODULES) {
    assert.match(module.shot.alt, /demonstração/i, `${module.id}: a alternativa identifica os dados de demonstração`);
    assert.ok(module.points.length >= 2);
  }
});

test('[CT-COM-015] confirmacao do formulario e o aviso de uso dos dados estao na redacao do plano', () => {
  assert.equal(QUOTE.title, 'Vamos entender a sua loja.');
  assert.match(QUOTE.lead, /24 horas úteis/);
  assert.equal(QUOTE.consent, 'Usaremos estes dados para responder à sua solicitação.');
  assert.equal(QUOTE.submit, 'Enviar solicitação');
});

test('[CT-COM-020] script da revelacao marca a aba e nunca lanca', () => {
  assert.match(REVEAL_SCRIPT, /try\{/);
  assert.match(REVEAL_SCRIPT, /catch\(e\)\{\}/);
  assert.ok(REVEAL_SCRIPT.includes(REVEAL_FLAG));
  assert.ok(REVEAL_SCRIPT.includes("d.dataset.sbiReveal='on'"));
  assert.ok(REVEAL_SCRIPT.includes("d.dataset.sbiReveal='off'"));

  // Executa o script duas vezes com sessionStorage e document simulados: a segunda vez entra em "off".
  const store = new Map<string, string>();
  const html = { dataset: {} as Record<string, string> };
  const run = new Function('sessionStorage', 'document', REVEAL_SCRIPT);
  const fakeStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } };
  run(fakeStorage, { documentElement: html });
  assert.equal(html.dataset.sbiReveal, 'on');
  run(fakeStorage, { documentElement: html });
  assert.equal(html.dataset.sbiReveal, 'off');

  // sessionStorage indisponivel (aba privada, cookie bloqueado): nenhum atributo, estado final.
  const blocked = { documentElement: { dataset: {} as Record<string, string> } };
  const throwing = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
  assert.doesNotThrow(() => run(throwing, blocked));
  assert.equal(blocked.documentElement.dataset.sbiReveal, undefined);
});
