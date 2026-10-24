/**
 * Arranque y primer recorrido: con la CSP estricta de _headers el juego debe
 * dibujarse completo, sin errores en la consola.
 */

import { test, expect } from './fixtures.js';

test('el inicio se dibuja con la CSP estricta y sin terceros', async ({ page }) => {
  /** @type {string[]} */
  const external = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://localhost')) external.push(request.url());
  });

  await page.goto('/');
  await expect(page.locator('#mode-grid .mode-card')).toHaveCount(3);
  await expect(page.locator('#level-picker .level')).toHaveCount(3);
  await expect(page.locator('#boot-warning')).toHaveCount(0);
  // El color de la tarjeta llega por data-vars (CSSOM), no por style="".
  const background = await page
    .locator('.mode-card')
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(background).toBe('rgb(47, 111, 216)');
  expect(external).toEqual([]);
});

test('una ronda de "Colores" se dibuja y acepta respuestas', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-mode="sequence"]').click();
  await expect(page.locator('#tray .answer')).toHaveCount(3);
  await expect(page.locator('#table .tapita')).toHaveCount(3);
  await expect(page.locator('#tray .answer').first()).toHaveAttribute('aria-disabled', 'false', { timeout: 15_000 });
});
