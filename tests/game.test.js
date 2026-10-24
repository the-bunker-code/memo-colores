/**
 * Pruebas de game.js: el estado, las esperas y los toques.
 *
 * Aislamiento: audio.js y storage.js no se reemplazan. Hablan con APIs del
 * navegador que aquí no existen o se simulan mínimamente:
 *   - speechSynthesis: un stub que anota cada frase (spoken) y termina enseguida.
 *   - localStorage: no existe en Node, así que storage.js usa los valores por defecto.
 *   - AudioContext: no existe; audio.js ya lo trata como "sin sonido".
 * Los temporizadores son simulados (mock.timers): las pruebas avanzan el reloj
 * a mano, sin esperar segundos reales.
 */

import { test, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { TIMING } from '../js/config.js';

/** @type {string[]} */
const spoken = [];

class FakeUtterance {
  /** @param {string} text */
  constructor(text) {
    this.text = text;
    /** @type {null | (() => void)} */
    this.onend = null;
    this.onerror = null;
  }
}
Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', { value: FakeUtterance, configurable: true });
Object.defineProperty(globalThis, 'speechSynthesis', {
  configurable: true,
  value: {
    getVoices: () => [],
    addEventListener: () => {},
    cancel: () => {},
    /** @param {FakeUtterance} utterance */
    speak(utterance) {
      spoken.push(utterance.text);
      queueMicrotask(() => utterance.onend?.());
    },
  },
});

const game = await import('../js/game.js');
const { state } = game;

/** Deja correr las promesas pendientes (los `await` de game.js). */
async function flush() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

/**
 * Avanza el reloj simulado de a 50 ms, dejando correr las promesas en cada paso.
 * @param {number} ms
 */
async function advance(ms) {
  for (let elapsed = 0; elapsed < ms; elapsed += 50) {
    mock.timers.tick(50);
    await flush();
  }
}

/** Avanza hasta que la ronda espera la respuesta (o falla si tarda demasiado). */
async function untilAnswering() {
  for (let i = 0; i < 400 && state.phase !== 'answering'; i++) await advance(50);
  assert.equal(state.phase, 'answering', 'la ronda llegó a esperar respuesta');
}

/** @param {Partial<import('../js/storage.js').Settings>} [overrides] */
function freshGame(overrides = {}) {
  game.goHome();
  spoken.length = 0;
  game.updateSettings({ ...state.settings, rounds: 3, level: 'easy', ...overrides });
}

/**
 * Un valor que no es la respuesta esperada.
 * @returns {string|number}
 */
function wrongAnswer() {
  const round = /** @type {NonNullable<typeof state.round>} */ (state.round);
  const wrong = round.options.find((option) => String(option) !== String(round.steps[state.stepIndex]));
  if (wrong === undefined) throw new Error('la ronda no tiene una respuesta incorrecta');
  return wrong;
}

beforeEach(() => mock.timers.enable({ apis: ['setTimeout'] }));
afterEach(() => {
  game.goHome();
  mock.timers.reset();
});

test('una sesión completa llega al final, anuncia el cierre y retrasa los botones', async () => {
  freshGame({ mode: 'missing' });
  game.startGame('missing');

  for (let round = 1; round <= 3; round++) {
    await untilAnswering();
    assert.equal(state.roundNumber, round);
    game.chooseAnswer(/** @type {NonNullable<typeof state.round>} */ (state.round).steps[0]);
    await advance(TIMING.nextRound + 100);
  }

  assert.equal(state.screen, 'end');
  assert.equal(state.endButtonsVisible, false, 'los botones del final esperan');
  await advance(TIMING.endButtons);
  assert.equal(state.endButtonsVisible, true);

  assert.equal(spoken.filter((phrase) => phrase === 'Dos más y guardamos.').length, 1);
  assert.equal(spoken.filter((phrase) => phrase === 'La última y guardamos.').length, 1);
  assert.ok(spoken.includes('Terminamos. Ahora guardamos juntos.'));
  assert.ok(spoken.indexOf('Dos más y guardamos.') < spoken.indexOf('La última y guardamos.'));
});

test('un error nunca castiga: ayuda una vez, no cuenta puntos y la respuesta correcta late', async () => {
  freshGame({ mode: 'cups' });
  game.startGame('cups');
  await untilAnswering();
  const round = /** @type {NonNullable<typeof state.round>} */ (state.round);

  game.chooseAnswer(wrongAnswer());
  assert.equal(state.phase, 'helping');
  assert.equal(state.mood, 'think');
  assert.ok(state.shake, 'la respuesta tiembla un instante');

  // Mientras corre la ayuda, los toques no hacen nada (ni segundo error ni acierto).
  game.chooseAnswer(wrongAnswer());
  game.chooseAnswer(round.steps[0]);
  assert.equal(state.phase, 'helping');
  assert.equal(state.stepIndex, 0);

  await untilAnswering();
  assert.equal(state.pulseValue, round.steps[0], 'la correcta queda latiendo');
  assert.equal(state.helpUsed, true);

  // Desde el segundo error ya no hay narración: solo se marca la correcta.
  game.chooseAnswer(wrongAnswer());
  assert.equal(state.phase, 'answering');
  assert.equal(state.pulseValue, round.steps[0]);
});

test('toques en ráfaga sobre el acierto final cuentan una sola vez', async () => {
  freshGame({ mode: 'missing' });
  game.startGame('missing');
  await untilAnswering();
  const answer = /** @type {NonNullable<typeof state.round>} */ (state.round).steps[0];

  for (let i = 0; i < 6; i++) game.chooseAnswer(answer);
  assert.equal(state.phase, 'solved');
  assert.equal(state.filledSteps.length, 1);

  await advance(TIMING.nextRound + 100);
  assert.equal(state.roundNumber, 2, 'avanzó una sola ronda');
});

test('en "Colores" cada toque correcto avanza un paso y el último resuelve', async () => {
  freshGame({ mode: 'sequence', level: 'medium' });
  game.startGame('sequence');
  await untilAnswering();
  const round = /** @type {NonNullable<typeof state.round>} */ (state.round);
  assert.equal(round.steps.length, 3);

  game.chooseAnswer(round.steps[0]);
  assert.equal(state.stepIndex, 1);
  assert.equal(state.phase, 'answering');
  game.chooseAnswer(round.steps[1]);
  assert.equal(state.stepIndex, 2);
  game.chooseAnswer(round.steps[2]);
  assert.equal(state.phase, 'solved');
  assert.deepEqual(state.filledSteps, round.steps);
});

test('volver al inicio a mitad de una ronda cancela todo lo pendiente', async () => {
  freshGame({ mode: 'sequence' });
  game.startGame('sequence');
  await advance(TIMING.beforeShow + 300);
  assert.equal(state.phase, 'showing');

  game.goHome();
  const spokenAtHome = spoken.length;
  await advance(30_000);

  assert.equal(state.screen, 'home');
  assert.equal(state.round, null);
  assert.equal(state.phase, 'showing', 'la tarea cancelada no cambió la fase');
  assert.equal(spoken.length, spokenAtHome, 'no habla después de cancelar');
});

test('abrir los ajustes durante la ayuda la detiene y no deja cartas trabadas', async () => {
  freshGame({ mode: 'cups' });
  game.startGame('cups');
  await untilAnswering();
  game.chooseAnswer(wrongAnswer());
  assert.equal(state.phase, 'helping');

  game.pauseForSettings();
  await advance(30_000);
  assert.equal(state.phase, 'helping', 'la ayuda cancelada no terminó sola');

  // Al cancelar los ajustes el panel vuelve al inicio; una sesión nueva arranca limpia.
  game.goHome();
  game.startGame('cups');
  await untilAnswering();
  assert.equal(state.roundNumber, 1);
  assert.equal(state.helpUsed, false);
  assert.equal(state.stepIndex, 0);
});

test('empezar dos veces seguidas deja una sola ronda activa', async () => {
  freshGame({ mode: 'missing' });
  game.startGame('missing');
  game.startGame('missing');
  await untilAnswering();

  assert.equal(state.roundNumber, 1);
  assert.equal(spoken.filter((phrase) => phrase === 'Mira las tapitas.').length, 1);
});

test('repetir la pregunta solo funciona cuando le toca responder', async () => {
  freshGame({ mode: 'missing' });
  game.startGame('missing');
  await advance(TIMING.beforeShow + 500);
  assert.equal(state.phase, 'showing');

  const before = spoken.length;
  game.repeatQuestion();
  assert.equal(spoken.length, before, 'no corta la narración mientras se muestra la ronda');

  await untilAnswering();
  const afterAutoQuestion = spoken.length;
  game.repeatQuestion();
  assert.equal(spoken.length, afterAutoQuestion + 1);
  assert.equal(spoken.at(-1), '¿Cuál falta?');
});

test('sin voz el juego funciona igual', async () => {
  freshGame({ mode: 'missing', voice: false });
  game.startGame('missing');
  await untilAnswering();
  game.chooseAnswer(/** @type {NonNullable<typeof state.round>} */ (state.round).steps[0]);
  assert.equal(state.phase, 'solved');
  assert.equal(spoken.length, 0);
});

test('chooseLevel guarda el nivel y no inicia nada', () => {
  freshGame();
  game.chooseLevel('hard');
  assert.equal(state.settings.level, 'hard');
  assert.equal(state.screen, 'home');
});
