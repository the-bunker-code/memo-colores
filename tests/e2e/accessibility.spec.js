/**
 * Accesibilidad: axe-core (WCAG 2.2 AA) en cada pantalla, foco, teclado,
 * tamaño de lo que se toca y movimiento reducido.
 */

import AxeBuilder from '@axe-core/playwright';
import { test, expect, openGame, runUntil, gameState, answerButton } from './fixtures.js';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** @param {import('@playwright/test').Page} page */
async function violations(page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}

test('el documento declara el idioma y tiene un solo h1', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.locator('h1')).toHaveCount(1);
});

test('axe: inicio sin violaciones', async ({ page }) => {
  await openGame(page);
  expect(await violations(page)).toEqual([]);
});

for (const mode of /** @type {const} */ (['sequence', 'missing', 'cups'])) {
  test(`axe: juego (${mode}) sin violaciones`, async ({ page }) => {
    await openGame(page, { level: 'hard' });
    await page.locator(`[data-mode="${mode}"]`).click();
    await runUntil(page, (state) => state.phase === 'answering');
    expect(await violations(page)).toEqual([]);
  });
}

test('axe: pantalla final y panel de ajustes sin violaciones', async ({ page }) => {
  await openGame(page, { rounds: 3 });
  await page.locator('[data-mode="missing"]').click();
  for (let round = 1; round <= 3; round++) {
    await runUntil(page, (state) => state.phase === 'answering' && state.roundNumber === round);
    await answerButton(page, (await gameState(page)).steps[0]).click();
  }
  await runUntil(page, (state) => state.endButtonsVisible);
  // Los botones aparecen con un fundido de 0,6 s: axe mide el contraste con la opacidad final.
  await expect(page.locator('#end-buttons')).toHaveCSS('opacity', '1');
  expect(await violations(page)).toEqual([]);

  await page.getByRole('button', { name: 'Inicio' }).click();
  await page.locator('#screen-home [data-action="open-settings"]').click();
  expect(await violations(page)).toEqual([]);
});

test('al cambiar de pantalla el foco pasa a la pantalla nueva, no a <body>', async ({ page }) => {
  await openGame(page);
  await page.locator('[data-mode="cups"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#screen-game')).toBeFocused();
});

test('el lector de pantalla recibe una frase corta por fase, no el tablero entero', async ({ page }) => {
  await openGame(page, { mode: 'missing' });
  await page.locator('[data-mode="missing"]').click();
  await expect(page.locator('#status')).toHaveText('Mira las tapitas.');
  await runUntil(page, (state) => state.phase === 'answering');
  await expect(page.locator('#status')).toHaveText('¿Cuál falta?');
  await expect(page.locator('#table')).not.toHaveAttribute('aria-live', /.+/);
});

test('lo que se toca mide 44×44 px o más en un celular de 360 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await openGame(page, { level: 'hard' });
  /** @type {string[]} */
  const small = [];
  /** @param {string} selector */
  const measure = async (selector) => {
    for (const box of await page.locator(selector).evaluateAll((els) =>
      els.map((el) => {
        const { width, height } = el.getBoundingClientRect();
        return { label: el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 20) ?? '', width, height };
      }),
    )) {
      if (box.width < 44 || box.height < 44) small.push(`${selector} "${box.label}" ${box.width}×${box.height}`);
    }
  };
  await measure('#screen-home button');
  await page.locator('[data-mode="cups"]').click();
  await runUntil(page, (state) => state.phase === 'answering');
  await measure('#screen-game button:visible');
  expect(small).toEqual([]);
});

test('con movimiento reducido no queda ninguna animación', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const animated = await page.evaluate(
    () =>
      document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations !== 1)
        .length,
  );
  expect(animated).toBe(0);
});
