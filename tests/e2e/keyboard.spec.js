/**
 * Uso solo con teclado. Antes de updateZone() cada toque reemplazaba los botones
 * y el foco caía en <body>: quien usaba teclado tenía que volver a empezar.
 */

import { test, expect } from './fixtures.js';

test('el foco se queda en el botón de nivel después de elegirlo', async ({ page }) => {
  await page.goto('/');
  const medium = page.locator('.level[data-level="medium"]');
  await medium.focus();
  await page.keyboard.press('Enter');
  await expect(medium).toHaveClass(/is-selected/);
  await expect(medium).toBeFocused();
});

test('el foco no se pierde al tocar una respuesta con el teclado', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-mode="missing"]').focus();
  await page.keyboard.press('Enter');
  const first = page.locator('#tray .answer').first();
  await expect(first).toHaveAttribute('aria-disabled', 'false', { timeout: 15_000 });
  await first.focus();
  await page.keyboard.press('Enter');
  // Acierte o falle, la bandeja se redibuja: el foco debe seguir dentro de ella.
  await expect(page.locator('#tray .answer:focus')).toHaveCount(1);
});
