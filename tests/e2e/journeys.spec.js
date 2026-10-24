/**
 * Recorridos reales: cada modo y nivel de principio a fin, un error con la
 * ayuda completa, toques en ráfaga y una sesión hasta la pantalla final.
 * El reloj es simulado (fixtures.openGame), así que cada uno tarda milisegundos.
 */

import { test, expect, openGame, gameState, runUntil, answerButton } from './fixtures.js';

const MODES = /** @type {const} */ (['sequence', 'missing', 'cups']);
const LEVELS = /** @type {const} */ (['easy', 'medium', 'hard']);

for (const mode of MODES) {
  for (const level of LEVELS) {
    test(`${mode}/${level}: una sesión completa llega a la pantalla final`, async ({ page }) => {
      await openGame(page, { level });
      await page.locator(`[data-mode="${mode}"]`).click();

      for (let round = 1; round <= 3; round++) {
        await runUntil(page, (state) => state.phase === 'answering' && state.roundNumber === round);
        // Un toque por paso, siempre el correcto.
        const steps = (await gameState(page)).steps;
        for (const step of steps) await answerButton(page, step).click();
        await runUntil(
          page,
          (state) => state.phase === 'solved' || state.roundNumber > round || state.screen === 'end',
        );
      }

      await runUntil(page, (state) => state.screen === 'end');
      await expect(page.locator('#screen-end')).toBeVisible();
      await expect(page.locator('#end-stars .icon')).toHaveCount(3);
      // Los botones del final aparecen con retraso, para que el cierre se sienta como cierre.
      await expect(page.locator('#end-buttons')).not.toHaveClass(/is-visible/);
      await runUntil(page, (state) => state.endButtonsVisible);
      await expect(page.locator('#end-buttons')).toHaveClass(/is-visible/);
      await expect(page.getByRole('button', { name: 'Otra vez' })).toBeVisible();
    });
  }
}

test('un error muestra la ayuda completa, no dice "no" y la respuesta correcta queda marcada', async ({ page }) => {
  await openGame(page, { mode: 'cups' });
  await page.locator('[data-mode="cups"]').click();
  await runUntil(page, (state) => state.phase === 'answering');

  const { steps, options } = await gameState(page);
  const wrong = options.find((option) => String(option) !== String(steps[0]));
  await answerButton(page, /** @type {string|number} */ (wrong)).click();

  await runUntil(page, (state) => state.phase === 'helping');
  await expect(page.locator('#tray')).toHaveClass(/tray--waiting/);
  await runUntil(page, (state) => state.phase === 'answering');
  await expect(answerButton(page, steps[0])).toHaveClass(/is-pulsing/);

  const spoken = /** @type {string[]} */ (await page.evaluate(() => /** @type {any} */ (window).__spoken));
  expect(spoken.some((phrase) => /^no\b/i.test(phrase))).toBe(false);
  expect(spoken.at(-1)).toMatch(/Está en el vaso/);

  await answerButton(page, steps[0]).click();
  await expect(page.locator('#tray .is-correct')).toHaveCount(1);
});

test('toques en ráfaga sobre la respuesta correcta avanzan una sola ronda', async ({ page }) => {
  await openGame(page);
  await page.locator('[data-mode="missing"]').click();
  await runUntil(page, (state) => state.phase === 'answering');
  const { steps } = await gameState(page);

  // Seis toques seguidos, sin esperar: dispatchEvent no pasa por las comprobaciones de visibilidad.
  const button = answerButton(page, steps[0]);
  for (let i = 0; i < 6; i++) await button.dispatchEvent('click');

  await runUntil(page, (state) => state.roundNumber === 2);
  await page.clock.runFor(500);
  expect((await gameState(page)).roundNumber).toBe(2);
});

test('volver al inicio a mitad de la ronda no deja nada colgado', async ({ page }) => {
  await openGame(page);
  await page.locator('[data-mode="sequence"]').click();
  await page.clock.runFor(1500);
  await page.locator('#screen-game [data-action="open-settings"]').click();
  await page.getByRole('button', { name: 'Cancelar' }).click();

  await expect(page.locator('#screen-home')).toBeVisible();
  await page.clock.runFor(30_000);
  await expect(page.locator('#screen-home')).toBeVisible();
  expect((await gameState(page)).screen).toBe('home');
});
