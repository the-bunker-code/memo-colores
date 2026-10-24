/**
 * Base común de los recorridos con Playwright.
 *
 * - La voz se reemplaza por un stub que anota cada frase en window.__spoken y
 *   termina enseguida. Así las pruebas pueden revisar qué dijo la app.
 * - Cualquier error o advertencia en la consola (incluidas las violaciones de
 *   la CSP) hace fallar la prueba.
 */

import { test as base, expect } from '@playwright/test';

export const STORAGE_KEY = 'memo-colores:settings:v1';

export const test = base.extend({
  page: async ({ page }, use) => {
    /** @type {string[]} */
    const consoleProblems = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') consoleProblems.push(message.text());
    });
    page.on('pageerror', (error) => consoleProblems.push(error.message));

    await page.addInitScript(() => {
      const spoken = /** @type {string[]} */ ([]);
      Object.defineProperty(window, '__spoken', { value: spoken });
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          getVoices: () => [],
          addEventListener: () => {},
          cancel: () => {},
          /** @param {SpeechSynthesisUtterance} utterance */
          speak(utterance) {
            spoken.push(utterance.text);
            setTimeout(() => utterance.onend?.(/** @type {any} */ ({})), 30);
          },
        },
      });
    });

    await use(page);
    expect(consoleProblems, 'consola sin errores ni advertencias').toEqual([]);
  },
});

export { expect };
