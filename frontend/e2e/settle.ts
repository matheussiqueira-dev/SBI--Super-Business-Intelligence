// Espera as animacoes da tela terminarem antes de medir.
//
// Fica fora do support.ts de proposito: o support exige o runner de banco descartavel, e a demo.spec roda
// tambem sem banco e sem API (playwright.demo.config.mjs).
import type { Page } from '@playwright/test';

/**
 * Espera as animacoes finitas terminarem.
 *
 * A revelacao do login (~600 ms, plano comercial secao 07) faz o texto do painel entrar por opacidade. Medido:
 * com a revelacao a 44% o axe acusa color-contrast em .login-lead e nos dois spans do rodape -- ele le a cor ja
 * misturada com o fundo. Na tela parada nao ha violacao nenhuma. Numa maquina rapida o axe comeca depois dos
 * 600 ms e passa; na CI, nem sempre, e o teste reprovava por tempo em vez de por acessibilidade.
 *
 * Animacao infinita (indicador de carga) fica de fora para a espera nao travar.
 */
export async function settled(page: Page): Promise<void> {
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter(animation => (animation.effect?.getComputedTiming().iterations ?? 1) !== Infinity)
    .map(animation => animation.finished.catch(() => undefined))).then(() => undefined));
}
