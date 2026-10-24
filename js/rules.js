/**
 * rules.js — Las reglas del juego: cómo se arma cada ronda.
 * LÓGICA PURA: no toca el DOM, ni el audio, ni localStorage. Recibe los
 * ajustes y una función `random`, y devuelve objetos. Por eso se puede
 * probar con `node --test` y una semilla fija, sin navegador.
 * Para agregar un modo: escribe su función `create...Round` y regístrala en
 * ROUND_BUILDERS.
 */

import { COLOR_IDS, LEVEL_RULES, colorById, TEXT } from './config.js';
import { capitalize, joinWithAnd, numberWord } from './spanish.js';

/**
 * Una ronda. Es inmutable: lo que la niña hace en ella vive en `state`.
 * @typedef {Object} Round
 * @property {string} key         Identifica la tirada, para no repetirla seguida.
 * @property {'sequence'|'missing'|'cups'} mode
 * @property {'easy'|'medium'|'hard'} level
 * @property {Array<string|number>} options  Las 3 respuestas, ordenadas.
 * @property {Array<string|number>} steps    Respuestas esperadas, en orden (1 o más toques).
 * @property {string} question    Lo que dice el globo y la voz.
 * @property {string[]} [tableColors]  sequence: las 3 tapitas en la mesa, en su posición.
 * @property {string[]} [shownColors]  missing: tapitas antes de tapar.
 * @property {number} [missingIndex]   missing: posición de la que se va.
 * @property {Array<string|null>} [cupColors] cups: qué tapita hay bajo cada vaso.
 * @property {string} [targetColor]    cups: la tapita que se busca.
 */

/* ---------- Utilidades de azar (reciben `random` para poder probarlas) ---------- */

/** Entero entre 0 y max-1. */
function randomInt(max, random) {
  return Math.floor(random() * max);
}

/** Copia mezclada (Fisher-Yates). No modifica el arreglo original. */
export function shuffle(items, random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1, random);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Toma `count` elementos distintos al azar. */
function pickDistinct(items, count, random) {
  return shuffle(items, random).slice(0, count);
}

/** Ordena colores según el arcoíris de config (rojo → rosado). */
export function sortColors(colorIds) {
  return [...colorIds].sort((a, b) => COLOR_IDS.indexOf(a) - COLOR_IDS.indexOf(b));
}

/* ---------- Modo "Colores": repetir una secuencia ---------- */

function createSequenceRound(level, random) {
  const { length } = LEVEL_RULES.sequence[level];
  const tableColors = pickDistinct(COLOR_IDS, 3, random);
  const steps = [];
  while (steps.length < length) {
    const next = tableColors[randomInt(3, random)];
    // Nunca el mismo color dos veces seguidas: un color que "se enciende dos
    // veces" sin pausa visible se confunde con uno solo.
    if (next !== steps[steps.length - 1]) steps.push(next);
  }
  return {
    key: `sequence|${tableColors.join(',')}|${steps.join(',')}`,
    mode: 'sequence',
    level,
    tableColors,
    steps,
    options: sortColors(tableColors),
    question: 'Repite los colores.',
  };
}

/* ---------- Modo "¿Cuál falta?": una tapita desaparece ---------- */

function createMissingRound(level, random) {
  const { count } = LEVEL_RULES.missing[level];
  const shownColors = pickDistinct(COLOR_IDS, count, random);
  const missingIndex = randomInt(count, random);
  const missingColor = shownColors[missingIndex];
  // Las otras dos respuestas son colores que siguen en la mesa: así puede
  // descartar mirando, lo que baja la frustración.
  const remaining = shownColors.filter((color) => color !== missingColor);
  const distractors = pickDistinct(remaining, 2, random);
  return {
    key: `missing|${shownColors.join(',')}|${missingIndex}`,
    mode: 'missing',
    level,
    shownColors,
    missingIndex,
    steps: [missingColor],
    options: sortColors([missingColor, ...distractors]),
    question: '¿Cuál falta?',
  };
}

/* ---------- Modo "¿Dónde está?": la tapita bajo el vaso ---------- */

function createCupsRound(level, random) {
  const { hidden } = LEVEL_RULES.cups[level];
  const colors = pickDistinct(COLOR_IDS, hidden, random);
  const positions = pickDistinct([0, 1, 2], hidden, random);
  /** @type {Array<string|null>} */
  const cupColors = [null, null, null];
  positions.forEach((position, i) => { cupColors[position] = colors[i]; });
  const targetColor = colors[0];
  const answer = cupColors.indexOf(targetColor) + 1; // vasos numerados 1, 2, 3
  const question = hidden > 1 ? `¿Dónde está la ${colorById(targetColor).word}?` : '¿Dónde está?';
  return {
    key: `cups|${cupColors.join(',')}|${targetColor}`,
    mode: 'cups',
    level,
    cupColors,
    targetColor,
    steps: [answer],
    options: [1, 2, 3],
    question,
  };
}

const ROUND_BUILDERS = {
  sequence: createSequenceRound,
  missing: createMissingRound,
  cups: createCupsRound,
};

/**
 * Crea una ronda nueva que no repite la tirada anterior.
 * @param {{ mode: string, level: string }} settings
 * @param {{ previousKey?: string|null, random?: () => number }} [context]
 * @returns {Round}
 */
export function createRound(settings, { previousKey = null, random = Math.random } = {}) {
  const build = ROUND_BUILDERS[settings.mode] ?? ROUND_BUILDERS.sequence;
  let round = build(settings.level, random);
  // Con 7 colores hay muchas combinaciones; 50 intentos sobran.
  for (let tries = 0; round.key === previousKey && tries < 50; tries++) {
    round = build(settings.level, random);
  }
  return Object.freeze(round);
}

/* ---------- Frases ---------- */

/** Palabra de un color con mayúscula, para decirla sola: "Roja." */
export function colorPhrase(colorId) {
  return `${capitalize(colorById(colorId).word)}.`;
}

/**
 * Lo que dice la voz al acertar, después de "Sí.".
 * Frases cortas y correctas, para que sirvan de modelo.
 * @param {Round} round
 */
export function resultPhrase(round) {
  if (round.mode === 'sequence') {
    return `${TEXT.yes} ${capitalize(joinWithAnd(round.steps.map((id) => colorById(id).word)))}.`;
  }
  if (round.mode === 'missing') {
    return `${TEXT.yes} Faltaba la ${colorById(round.steps[0]).word}.`;
  }
  return `${TEXT.yes} En el vaso ${numberWord(Number(round.steps[0]))}.`;
}

/**
 * Lo que narra la voz durante la ayuda, al final.
 * @param {Round} round
 * @param {number} stepIndex  En "Colores", el paso que le toca.
 */
export function helpPhrase(round, stepIndex = 0) {
  if (round.mode === 'sequence') {
    return `Ahora va la ${colorById(round.steps[stepIndex]).word}.`;
  }
  if (round.mode === 'missing') return `Faltaba la ${colorById(round.steps[0]).word}.`;
  return `Está en el vaso ${numberWord(Number(round.steps[0]))}.`;
}

/** Frase que se dice antes de mostrar. @param {Round} round */
export function introPhrase(round) {
  if (round.mode === 'sequence') return 'Mira y escucha.';
  if (round.mode === 'missing') return 'Mira las tapitas.';
  return round.cupColors.filter(Boolean).length > 1 ? 'Mira las tapitas.' : 'Mira la tapita.';
}

/**
 * Lo que la voz dice al tocar una respuesta correcta a mitad de camino.
 * @param {Round} round
 * @param {string|number} value
 */
export function optionWord(round, value) {
  if (round.mode === 'cups') return capitalize(numberWord(Number(value)));
  return colorPhrase(String(value));
}
