/**
 * Pruebas de rules.js: lógica pura, sin DOM ni audio. El azar usa una semilla
 * fija (tests/helpers.js), así que si una prueba falla, falla siempre igual.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { COLOR_IDS, LEVEL_RULES, MODES, LEVELS } from '../js/config.js';
import {
  colorPhrase,
  createRound,
  helpPhrase,
  introPhrase,
  optionWord,
  resultPhrase,
  shuffle,
  sortColors,
} from '../js/rules.js';
import { seededRandom } from './helpers.js';

const ROUNDS_PER_COMBINATION = 300;

/** Todas las combinaciones de modo y nivel. */
const COMBINATIONS = MODES.flatMap((mode) => LEVELS.map((level) => ({ mode: mode.id, level: level.id })));

test('shuffle devuelve una copia con los mismos elementos y no toca el original', () => {
  const original = [1, 2, 3, 4, 5, 6];
  const mixed = shuffle(original, seededRandom(7));
  assert.notEqual(mixed, original);
  assert.deepEqual([...mixed].sort(), original);
  assert.deepEqual(original, [1, 2, 3, 4, 5, 6]);
});

test('shuffle es parejo: en 10.000 barajados cada elemento cae en cada posición ~2.500 veces', () => {
  const random = seededRandom(123);
  const counts = Array.from({ length: 4 }, () => Array(4).fill(0));
  for (let i = 0; i < 10_000; i++) {
    shuffle([0, 1, 2, 3], random).forEach((item, position) => counts[item][position]++);
  }
  for (const row of counts) {
    for (const count of row) assert.ok(count > 2200 && count < 2800, `frecuencia fuera de rango: ${count}`);
  }
});

test('sortColors ordena según el arcoíris de config', () => {
  assert.deepEqual(sortColors(['pink', 'red', 'blue']), ['red', 'blue', 'pink']);
});

for (const { mode, level } of COMBINATIONS) {
  test(`${mode}/${level}: ${ROUNDS_PER_COMBINATION} rondas cumplen todas las reglas`, () => {
    const random = seededRandom(42);
    let previousKey = null;
    for (let i = 0; i < ROUNDS_PER_COMBINATION; i++) {
      const round = createRound({ mode, level }, { previousKey, random });

      assert.equal(round.mode, mode);
      assert.equal(round.level, level);
      assert.ok(Object.isFrozen(round), 'la ronda es inmutable');
      assert.notEqual(round.key, previousKey, 'no repite la tirada anterior');
      assert.equal(round.options.length, 3);
      assert.equal(new Set(round.options).size, 3, 'respuestas distintas');
      assert.ok(round.steps.length >= 1);
      for (const step of round.steps) assert.ok(round.options.includes(step), 'la respuesta está entre las opciones');
      assert.ok(round.question.length > 0);

      if (mode === 'sequence') checkSequence(round, level);
      if (mode === 'missing') checkMissing(round, level);
      if (mode === 'cups') checkCups(round, level);
      previousKey = round.key;
    }
  });
}

/** @param {import('../js/rules.js').Round} round @param {import('../js/config.js').LevelId} level */
function checkSequence(round, level) {
  const tableColors = /** @type {string[]} */ (round.tableColors);
  assert.equal(round.steps.length, LEVEL_RULES.sequence[level].length);
  assert.equal(tableColors.length, 3);
  assert.equal(new Set(tableColors).size, 3, 'tapitas distintas en la mesa');
  assert.deepEqual(round.options, sortColors(tableColors), 'bandeja en orden de arcoíris');
  round.steps.forEach((step, i) => {
    assert.ok(tableColors.includes(String(step)), 'la secuencia usa solo colores de la mesa');
    if (i > 0) assert.notEqual(step, round.steps[i - 1], 'nunca el mismo color dos veces seguidas');
  });
}

/** @param {import('../js/rules.js').Round} round @param {import('../js/config.js').LevelId} level */
function checkMissing(round, level) {
  const shown = /** @type {string[]} */ (round.shownColors);
  const missing = shown[/** @type {number} */ (round.missingIndex)];
  assert.equal(shown.length, LEVEL_RULES.missing[level].count);
  assert.equal(new Set(shown).size, shown.length, 'tapitas distintas');
  assert.deepEqual(round.steps, [missing]);
  // Las otras dos respuestas siguen en la mesa: así puede descartar mirando.
  for (const option of round.options) assert.ok(shown.includes(String(option)));
  assert.deepEqual(round.options, sortColors(/** @type {string[]} */ (round.options)), 'bandeja en orden de arcoíris');
}

/** @param {import('../js/rules.js').Round} round @param {import('../js/config.js').LevelId} level */
function checkCups(round, level) {
  const cups = /** @type {Array<string|null>} */ (round.cupColors);
  const hidden = cups.filter(Boolean);
  assert.equal(cups.length, 3);
  assert.equal(hidden.length, LEVEL_RULES.cups[level].hidden);
  assert.equal(new Set(hidden).size, hidden.length, 'tapitas distintas bajo los vasos');
  assert.ok(COLOR_IDS.includes(/** @type {string} */ (round.targetColor)));
  assert.equal(round.steps[0], cups.indexOf(/** @type {string} */ (round.targetColor)) + 1, 'el vaso correcto');
  assert.deepEqual(round.options, [1, 2, 3]);
}

test('un modo desconocido cae en "Colores" en vez de romper', () => {
  const round = createRound(/** @type {any} */ ({ mode: 'volar', level: 'easy' }), { random: seededRandom(1) });
  assert.equal(round.mode, 'sequence');
});

test('sin `random` ni `previousKey` también crea una ronda válida', () => {
  assert.equal(createRound({ mode: 'cups', level: 'easy' }).options.length, 3);
});

test('si la tirada se repite, createRound vuelve a intentarlo', () => {
  const settings = /** @type {const} */ ({ mode: 'cups', level: 'easy' });
  const first = createRound(settings, { random: seededRandom(5) });
  // Misma semilla y misma tirada anterior: el primer intento coincide, el segundo no.
  let calls = 0;
  const random = seededRandom(5);
  const counting = () => {
    calls++;
    return random();
  };
  const second = createRound(settings, { previousKey: first.key, random: counting });
  assert.notEqual(second.key, first.key);
  assert.ok(calls > 3, 'tuvo que reintentar');
});

/* ---------- Frases: la niña las imita, así que deben salir correctas ---------- */

test('colorPhrase dice el color solo y con mayúscula', () => {
  assert.equal(colorPhrase('red'), 'Roja.');
  assert.equal(colorPhrase('orange'), 'Naranja.');
});

test('resultPhrase: una frase corta y correcta por modo', () => {
  const sequence = /** @type {any} */ ({ mode: 'sequence', steps: ['red', 'blue'] });
  assert.equal(resultPhrase(sequence), 'Sí. Roja y azul.');
  assert.equal(resultPhrase({ ...sequence, steps: ['red', 'blue', 'green'] }), 'Sí. Roja, azul y verde.');
  assert.equal(resultPhrase(/** @type {any} */ ({ mode: 'missing', steps: ['green'] })), 'Sí. Faltaba la verde.');
  assert.equal(resultPhrase(/** @type {any} */ ({ mode: 'cups', steps: [2] })), 'Sí. En el vaso dos.');
});

test('helpPhrase narra la solución', () => {
  const sequence = /** @type {any} */ ({ mode: 'sequence', steps: ['red', 'blue'] });
  assert.equal(helpPhrase(sequence, 1), 'Ahora va la azul.');
  assert.equal(helpPhrase(/** @type {any} */ ({ mode: 'missing', steps: ['pink'] })), 'Faltaba la rosada.');
  assert.equal(helpPhrase(/** @type {any} */ ({ mode: 'cups', steps: [3] })), 'Está en el vaso tres.');
});

test('introPhrase distingue una tapita de varias', () => {
  assert.equal(introPhrase(/** @type {any} */ ({ mode: 'sequence' })), 'Mira y escucha.');
  assert.equal(introPhrase(/** @type {any} */ ({ mode: 'missing' })), 'Mira las tapitas.');
  assert.equal(introPhrase(/** @type {any} */ ({ mode: 'cups', cupColors: ['red', null, null] })), 'Mira la tapita.');
  assert.equal(
    introPhrase(/** @type {any} */ ({ mode: 'cups', cupColors: ['red', null, 'blue'] })),
    'Mira las tapitas.',
  );
});

test('optionWord dice el color o el número del vaso', () => {
  assert.equal(optionWord(/** @type {any} */ ({ mode: 'sequence' }), 'green'), 'Verde.');
  assert.equal(optionWord(/** @type {any} */ ({ mode: 'cups' }), 1), 'Uno');
});
