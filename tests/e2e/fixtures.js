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
      // Este aviso lo escribe Playwright cuando bloquea el service worker (ver playwright.config.js).
      if (message.text() === 'Service Worker registration blocked by Playwright') return;
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

/**
 * Arranca la página con el reloj simulado (page.clock) y 3 rondas por sesión,
 * para que un recorrido completo tarde milisegundos y no minutos.
 * @param {import('@playwright/test').Page} page
 * @param {Partial<Record<string, unknown>>} [settings]
 */
export async function openGame(page, settings = {}) {
  const stored = JSON.stringify({ rounds: 3, ...settings });
  await page.addInitScript(
    ([key, value]) => {
      localStorage.setItem(key, value);
    },
    [STORAGE_KEY, stored],
  );
  await page.clock.install();
  await page.goto('/');
  await expect(page.locator('#mode-grid .mode-card')).toHaveCount(3);
}

/**
 * Estado del juego, leído del mismo módulo que usa la página.
 * @param {import('@playwright/test').Page} page
 */
export async function gameState(page) {
  return page.evaluate(async () => {
    // @ts-expect-error: URL del navegador (corre dentro de la página), no un archivo que TypeScript pueda abrir.
    const { state } = await import('/js/game.js');
    return {
      screen: /** @type {string} */ (state.screen),
      phase: /** @type {string} */ (state.phase),
      roundNumber: /** @type {number} */ (state.roundNumber),
      totalRounds: /** @type {number} */ (state.totalRounds),
      stepIndex: /** @type {number} */ (state.stepIndex),
      steps: /** @type {Array<string|number>} */ (state.round?.steps ?? []),
      options: /** @type {Array<string|number>} */ (state.round?.options ?? []),
      endButtonsVisible: /** @type {boolean} */ (state.endButtonsVisible),
    };
  });
}

/**
 * Adelanta el reloj simulado hasta que se cumpla la condición.
 * @param {import('@playwright/test').Page} page
 * @param {(state: Awaited<ReturnType<typeof gameState>>) => boolean} done
 * @param {number} [maxMs]  Tope de tiempo simulado.
 * @param {number} [stepMs]  De cuánto en cuánto avanza el reloj entre revisiones.
 */
export async function runUntil(page, done, maxMs = 60_000, stepMs = 100) {
  for (let elapsed = 0; elapsed < maxMs; elapsed += stepMs) {
    if (done(await gameState(page))) return;
    await page.clock.runFor(stepMs);
  }
  throw new Error(`La condición no se cumplió en ${maxMs} ms simulados: ${JSON.stringify(await gameState(page))}`);
}

/**
 * Toca una respuesta por su valor.
 * @param {import('@playwright/test').Page} page
 * @param {string|number} value
 */
export function answerButton(page, value) {
  return page.locator(`#tray .answer[data-value="${value}"]`);
}
