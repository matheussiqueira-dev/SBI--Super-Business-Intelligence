// Aceite da edicao comercial (plano comercial, secao 11). Nenhum teste aqui depende da API do PDV: o servidor
// sobe sem backend, e as falhas de conexao que apareceriam se a landing chamasse /auth/me ou /sales/* derrubariam
// estes testes. E essa a prova de que a pagina publica continua de pe com a venda e o login fora do ar.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

/**
 * Espera as animacoes em curso terminarem. Sem isso o axe pode medir contraste no meio de uma transicao de
 * opacidade -- a revelacao do login e o caso -- e acusar uma violacao que nao existe no estado final.
 */
async function settled(page: Page) {
  await page.evaluate(() => Promise.allSettled(document.getAnimations().map(animation => animation.finished)));
  await page.waitForTimeout(80);
}

async function axe(page: Page, context: string) {
  await settled(page);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const problems = results.violations.map(violation =>
    `${violation.id} (${violation.impact}): ${violation.nodes.map(node => node.target.join(' ')).join(' | ')}`);
  expect(problems, `axe em ${context}`).toEqual([]);
}

/** Campos validos do formulario; cada teste muda a loja para nao esbarrar na idempotencia do anterior. */
async function fillQuote(page: Page, company: string, extra: Record<string, string> = {}) {
  await page.getByLabel(/^Nome/).fill('Ana Souza');
  await page.getByLabel(/Loja ou empresa/).fill(company);
  await page.getByLabel(/^E-mail/).fill('ana@eletrocentro.example');
  await page.getByLabel(/Cidade\/UF/).fill('Fortaleza/CE');
  for (const [label, value] of Object.entries(extra)) await page.getByLabel(new RegExp(label)).fill(value);
  // O servidor descarta envio abaixo do tempo minimo de preenchimento.
  await page.waitForTimeout(1_400);
}

test.describe('landing comercial', () => {
  test('[CT-COM-100] "/" abre sem sessao, sem a API no ar, e na ordem do plano', async ({ page }) => {
    const failed: string[] = [];
    page.on('requestfailed', request => failed.push(request.url()));
    await page.setViewportSize(DESKTOP);
    await page.goto('/');

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('O mesmo número para toda a loja.');
    await expect(page.getByText(/O SBI conecta as vendas do balcão ao estoque e às metas/)).toBeVisible();

    // Nenhuma chamada ao backend: a landing nao toca /api/backend nem /auth/me.
    await page.waitForLoadState('networkidle');
    expect(failed.filter(url => url.includes('/api/backend') || url.includes('/auth/'))).toEqual([]);

    // Cabecalho com Produto, Implantacao, Suporte, Entrar e a acao principal.
    const header = page.getByRole('banner');
    for (const name of ['Produto', 'Implantação', 'Suporte']) {
      await expect(header.getByRole('link', { name, exact: true })).toBeVisible();
    }
    await expect(header.getByRole('link', { name: 'Entrar', exact: true })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Solicitar cotação' })).toHaveAttribute('href', '/#cotacao');

    // Secoes na ordem: primeira dobra, modulos, publico, implantacao, dados e suporte, FAQ, cotacao.
    const sections = await page.locator('main > section, main > div.c-hero, main > .c-hero').evaluateAll(
      nodes => nodes.map(node => node.id || 'hero'));
    expect(sections).toEqual(['hero', 'produto', 'publico', 'implantacao', 'dados', 'faq', 'cotacao']);

    // Rodape com Entrar, Suporte, Status e Privacidade.
    const footer = page.getByRole('contentinfo');
    for (const name of ['Entrar', 'Demonstração', 'Suporte', 'Privacidade']) {
      await expect(footer.getByRole('link', { name, exact: true })).toBeVisible();
    }
  });

  test('[CT-COM-101] foto e capturas tem dimensao reservada, variante responsiva e alternativa', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/');
    const hero = page.locator('.c-hero-media img');
    await expect(hero).toHaveAttribute('width', '960');
    await expect(hero).toHaveAttribute('height', '720');
    await expect(hero).toHaveAttribute('srcset', /640w.*960w.*1280w/);
    expect((await hero.getAttribute('alt'))?.length ?? 0).toBeGreaterThan(20);

    // As tres provas carregam de verdade (naturalWidth > 0) e identificam os dados de demonstracao.
    const shots = page.locator('.c-shot img');
    await expect(shots).toHaveCount(3);
    for (let i = 0; i < 3; i += 1) {
      const shot = shots.nth(i);
      await shot.scrollIntoViewIfNeeded();
      await expect(shot).toHaveAttribute('loading', 'lazy');
      await expect.poll(() => shot.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    }
    await expect(page.getByText('Dados de demonstração').first()).toBeVisible();
  });

  test('[CT-COM-102] celular: titulo e botoes antes da foto, sem rolagem horizontal', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/');

    // A ordem do DOM e a ordem da tela: o titulo e as acoes vem antes da imagem.
    const titleY = (await page.getByRole('heading', { level: 1 }).boundingBox())?.y ?? -1;
    const actionY = (await page.getByRole('link', { name: 'Explorar demonstração' }).first().boundingBox())?.y ?? -1;
    const photoY = (await page.locator('.c-hero-media img').boundingBox())?.y ?? -1;
    expect(titleY).toBeGreaterThanOrEqual(0);
    expect(actionY).toBeGreaterThan(titleY);
    expect(photoY).toBeGreaterThan(actionY);

    // Nada transborda a largura da tela.
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    // O menu do celular abre e fecha pelo teclado, sem JavaScript proprio.
    const menu = page.getByRole('group').filter({ hasText: 'Menu' }).first();
    await expect(menu).toBeVisible();
    await page.getByText('Menu', { exact: true }).click();
    await expect(page.getByRole('navigation', { name: /menu do celular/i }).getByRole('link', { name: 'Produto' })).toBeVisible();
  });

  test('[CT-COM-103] navegacao por teclado chega as acoes principais com foco visivel', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/');
    // O primeiro Tab precisa sair do documento, nao da barra do navegador: focar o <body> deixa o ponto de
    // partida determinado, senao a primeira parada varia conforme o momento em que a pagina ganhou o foco.
    await page.locator('body').evaluate(body => body.focus());
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Ir para o conteúdo' })).toBeFocused();

    // Em poucas paradas o foco passa pelas acoes do cabecalho, sempre com anel visivel.
    const reached: string[] = [];
    for (let i = 0; i < 10; i += 1) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        if (!element) return null;
        const outline = getComputedStyle(element, ':focus-visible').outlineStyle;
        return { text: (element.textContent ?? '').trim().slice(0, 40), outline };
      });
      if (focused?.text) reached.push(focused.text);
      if (focused) expect(focused.outline, `sem contorno em "${focused.text}"`).not.toBe('none');
    }
    expect(reached.join(' | ')).toContain('Solicitar cotação');
    expect(reached.join(' | ')).toContain('Entrar');
  });

  for (const [name, viewport] of [['desktop', DESKTOP], ['celular', MOBILE]] as const) {
    test(`[CT-COM-104] axe sem violacao na landing (${name})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      // As capturas entram com loading lazy: rolar ate o fim garante que o axe ve a pagina inteira.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(600);
      await axe(page, `landing ${name}`);
    });
  }

  test('[CT-COM-105] privacidade e suporte abrem sem sessao e passam no axe', async ({ page }) => {
    for (const path of ['/privacidade', '/suporte']) {
      await page.setViewportSize(DESKTOP);
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await axe(page, path);
      await page.setViewportSize(MOBILE);
      await page.goto(path);
      await axe(page, `${path} celular`);
    }
    // O aviso de privacidade nasce identificado como homologacao enquanto a equipe nao confirma os dados.
    await page.setViewportSize(DESKTOP);
    await page.goto('/privacidade');
    await expect(page.getByText(/Versão de homologação/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'O que falta confirmar' })).toBeVisible();
  });

  test('[CT-COM-106] rota interna sem sessao volta para o login com o destino autorizado', async ({ page }) => {
    await page.goto('/gestao/produtos');
    await expect(page).toHaveURL('/entrar?next=%2Fgestao%2Fprodutos');
    await expect(page.getByRole('heading', { name: 'Entrar no SBI' })).toBeVisible();
  });
});

test.describe('cotação', () => {
  test('[CT-COM-110] campo invalido marca o campo, nao envia e preserva o que foi digitado', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/#cotacao');
    await page.getByLabel(/^Nome/).fill('Ana Souza');
    await page.getByLabel(/^E-mail/).fill('nao-email');
    await page.waitForTimeout(1_400);
    await page.getByRole('button', { name: 'Enviar solicitação' }).click();

    // O Next tem o proprio role="alert" (anunciador de rota): o resumo e procurado dentro do formulario.
    await expect(page.locator('form.c-quote-form').getByRole('alert')).toContainText(/Confira/);
    const email = page.getByLabel(/^E-mail/);
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Informe um e-mail válido.')).toBeVisible();
    // O erro esta ligado ao campo para o leitor de tela.
    const describedBy = await email.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`#${describedBy}`)).toHaveText('Informe um e-mail válido.');
    // Nada foi apagado.
    await expect(page.getByLabel(/^Nome/)).toHaveValue('Ana Souza');
    await expect(page.getByText(/Seu protocolo é/)).toHaveCount(0);
  });

  test('[CT-COM-111] envio valido devolve protocolo e a frase da confirmacao', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/#cotacao');
    await fillQuote(page, 'Eletro Centro CT111', { 'WhatsApp': '(85) 99999-0000', 'Mensagem': 'Uma loja, cinco vendedores.' });
    await page.getByRole('button', { name: 'Enviar solicitação' }).click();

    const done = page.getByRole('status');
    await expect(done).toContainText('Solicitação recebida. Seu protocolo é SBI-');
    await expect(done).toContainText('Nossa equipe responde em até 24 horas úteis.');
    await expect(done).toContainText(/A confirmação automática e a primeira resposta da equipe são avisos diferentes/);
  });

  test('[CT-COM-112] o mesmo envio repetido recupera o mesmo protocolo', async ({ page }) => {
    const send = async () => {
      // "/" e nao "/#cotacao": sair de uma URL que so difere no fragmento e navegacao no mesmo documento, e o
      // formulario continuaria substituido pela confirmacao do envio anterior.
      await page.goto('/');
      await page.locator('#cotacao').scrollIntoViewIfNeeded();
      await fillQuote(page, 'Eletro Centro CT112');
      await page.getByRole('button', { name: 'Enviar solicitação' }).click();
      const text = await page.getByRole('status').textContent();
      return /SBI-\d{8}-[A-Z0-9]{6}/.exec(text ?? '')?.[0];
    };
    await page.setViewportSize(DESKTOP);
    const first = await send();
    const again = await send();
    expect(first).toBeTruthy();
    expect(again).toBe(first);
  });

  test('[CT-COM-113] o formulario e a confirmacao passam no axe', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/#cotacao');
    await axe(page, 'formulário de cotação');
    await fillQuote(page, 'Eletro Centro CT113');
    await page.getByRole('button', { name: 'Enviar solicitação' }).click();
    await expect(page.getByRole('status')).toContainText('Seu protocolo é');
    await axe(page, 'confirmação de cotação');
  });
});

test.describe('revelação do login', () => {
  test('[CT-COM-120] logotipo e formulario no primeiro quadro; a sequencia nao desloca o layout', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/entrar');

    // Primeira pintura: o logotipo oficial e o formulario ja estao utilizaveis.
    await expect(page.getByRole('img', { name: 'SBI — Super Business Intelligence' }).first()).toBeVisible();
    const email = page.getByLabel('E-mail');
    await expect(email).toBeVisible();
    await email.click();
    await expect(email).toBeFocused();

    // A revelacao roda nesta aba.
    await expect(page.locator('html')).toHaveAttribute('data-sbi-reveal', 'on');

    // Nenhum deslocamento de layout durante a sequencia: a caixa do formulario fica parada.
    const box = async () => JSON.stringify(await page.locator('.login-box').boundingBox());
    const before = await box();
    await page.waitForTimeout(800);
    expect(await box()).toBe(before);

    // Depois de 600 ms tudo esta opaco e estatico.
    const opacity = await page.locator('.login-mark-dot').evaluate(node => getComputedStyle(node).opacity);
    expect(Number(opacity)).toBe(1);
  });

  test('[CT-COM-121] roda uma vez por aba e nao reinicia depois de um erro de login', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/entrar');
    await expect(page.locator('html')).toHaveAttribute('data-sbi-reveal', 'on');

    // Segunda visita na mesma aba: entra direto no estado final.
    await page.goto('/entrar?next=%2Fgestao');
    await expect(page.locator('html')).toHaveAttribute('data-sbi-reveal', 'off');

    // Tentativa de login sem API: o erro aparece e a revelacao continua desligada nesta aba.
    await page.getByLabel('E-mail').fill('ninguem@sbi.tech');
    await page.getByLabel('Senha', { exact: true }).fill('senha-invalida');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.locator('form').getByRole('alert')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-sbi-reveal', 'off');
  });

  test('[CT-COM-122] movimento reduzido entrega o estado final, sem animacao', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce', viewport: DESKTOP });
    const page = await context.newPage();
    await page.goto('/entrar');
    for (const selector of ['.login-mark-block', '.login-mark-dot']) {
      const style = await page.locator(selector).evaluate(node => {
        const computed = getComputedStyle(node);
        return { name: computed.animationName, opacity: computed.opacity };
      });
      expect(style.name, `${selector} nao deve animar com movimento reduzido`).toBe('none');
      expect(Number(style.opacity)).toBe(1);
    }
    await context.close();
  });

  test('[CT-COM-123] sem script a composição aparece no estado final', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: DESKTOP });
    const page = await context.newPage();
    await page.goto('/entrar');
    // Sem script nao ha atributo: o CSS so anima com data-sbi-reveal="on", entao nada fica invisivel esperando
    // uma animacao que nunca vai rodar. O painel de marca, o logotipo e o texto aparecem prontos.
    await expect(page.locator('html')).not.toHaveAttribute('data-sbi-reveal', 'on');
    for (const selector of ['.login-mark-block', '.login-mark-dot', '.login-panel > .stack-sm', '.login-panel > .login-footer']) {
      await expect(page.locator(selector)).toHaveCSS('opacity', '1');
    }
    await expect(page.getByText('O mesmo número para toda a loja.')).toBeVisible();
    // O formulario em si depende de JavaScript (useSearchParams + Suspense), comportamento que ja existia antes
    // da revelacao e que esta registrado em docs/05-operacao/edicoes-e-variaveis.md.
    await expect(page.getByText('Carregando…')).toBeVisible();
    await context.close();
  });

  test('[CT-COM-125] a landing pública funciona sem JavaScript até o envio da cotação', async ({ browser }) => {
    // Sem JavaScript na pagina, o motor de papeis do Playwright (getByRole) nao resolve nenhum papel -- e limite
    // da ferramenta, nao da pagina. Por isso este teste usa seletores de CSS e de texto.
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: DESKTOP });
    const page = await context.newPage();
    await page.goto('/');

    // Com o script da pagina desligado, as APIs de geometria e de papel do Playwright (boundingBox, toBeVisible,
    // getByRole) nao enxergam os elementos -- limite da ferramenta, nao da pagina: page.evaluate continua
    // funcionando e o proprio layout do navegador responde. A medida vem dai.
    const drawn = (selector: string) =>
      expect.poll(async () => page.locator(selector).first().evaluate(node => {
        const rect = node.getBoundingClientRect();
        return Math.round(Math.min(rect.width, rect.height));
      }), { message: `${selector} sem caixa` }).toBeGreaterThan(0);

    await expect(page.locator('h1')).toHaveText('O mesmo número para toda a loja.');
    await drawn('a[href="/#cotacao"]');
    await drawn('.c-hero-media img');
    await drawn('a[href="/entrar"]');

    // O FAQ abre sem script, porque e <details>/<summary> nativo.
    const faq = page.locator('.c-faq details', { hasText: 'Quem cadastra os produtos?' });
    await expect(faq).toHaveJSProperty('open', false);
    await faq.locator('summary').click();
    await expect(faq).toHaveJSProperty('open', true);
    await expect(page.locator('.c-faq details[open] p')).toHaveText(/A equipe da loja inclui o catálogo/);

    // O envio em si precisa de JavaScript e a pagina diz isso, com o canal comercial no lugar da promessa.
    await expect.poll(() => page.locator('form.c-quote-form').evaluate(node => node.textContent ?? ''))
      .toContain('O envio pela página precisa de JavaScript');
    await context.close();
  });

  test('[CT-COM-124] axe no login, desktop e celular', async ({ page }) => {
    for (const viewport of [DESKTOP, MOBILE]) {
      await page.setViewportSize(viewport);
      await page.goto('/entrar');
      await page.waitForTimeout(700);
      await axe(page, `login ${viewport.width}px`);
    }
  });
});
