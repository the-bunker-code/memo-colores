/**
 * game.js — El estado del juego y las acciones que lo cambian.
 * Es el único archivo que modifica `state`. La interfaz (main.js) solo llama
 * acciones, y render.js solo lee el estado. Después de cada cambio se llama
 * a notify(), que avisa a quien esté escuchando (el render).
 * Aquí también viven las secuencias con espera: mostrar la ronda, la ayuda
 * paso a paso y la pausa entre rondas.
 */

import { LEVEL_RULES, LOOK_TIME, TEXT, TIMING } from './config.js';
import { createRound, colorPhrase, helpPhrase, introPhrase, optionWord, resultPhrase } from './rules.js';
import {
  configureAudio, playCountTone, playNeutralTone, playSoftErrorTone, playSuccessTone, say, stopSpeaking, unlockAudio,
} from './audio.js';
import { loadSettings, normalizeSettings, saveSettings } from './storage.js';

/**
 * Lo que se ve en la mesa. Se reinicia en cada ronda.
 * @typedef {Object} TableView
 * @property {number|null} litIndex     Tapita encendida (modo Colores).
 * @property {number|null} litNumber    Número que se muestra encima de ella.
 * @property {boolean} covered          La tela tapa la mesa (modo ¿Cuál falta?).
 * @property {'all'|'gone'|'help'|'found'} missingSlot  Estado del hueco.
 * @property {boolean} cupsLifted       Vasos levantados (modo ¿Dónde está?).
 * @property {number|null} highlightCup Vaso resaltado durante la ayuda.
 */

/**
 * El estado completo.
 * @typedef {Object} GameState
 * @property {'home'|'game'|'end'} screen
 * @property {import('./storage.js').Settings} settings
 * @property {number} roundNumber        Ronda actual, desde 1.
 * @property {number} totalRounds
 * @property {import('./rules.js').Round|null} round
 * @property {string|null} previousKey   Tirada anterior, para no repetirla.
 * @property {'showing'|'answering'|'helping'|'solved'} phase
 * @property {number} stepIndex          Cuántos toques correctos lleva en la ronda.
 * @property {boolean} helpUsed          Ya recibió la ayuda en esta ronda.
 * @property {Array<string|number>} filledSteps  Respuestas ya acertadas (para la consigna).
 * @property {string|number|null} pulseValue     Respuesta que late tras la ayuda.
 * @property {{ value: string|number, nonce: number }|null} shake  Respuesta que tiembla.
 * @property {boolean} hopping           El avatar salta (acierto).
 * @property {'idle'|'think'|'happy'} mood
 * @property {boolean} endButtonsVisible
 * @property {TableView} table
 */

/** @returns {TableView} */
function freshTable() {
  return { litIndex: null, litNumber: null, covered: false, missingSlot: 'all', cupsLifted: false, highlightCup: null };
}

/** @type {GameState} */
export const state = {
  screen: 'home',
  settings: loadSettings(),
  roundNumber: 0,
  totalRounds: 0,
  round: null,
  previousKey: null,
  phase: 'showing',
  stepIndex: 0,
  helpUsed: false,
  filledSteps: [],
  pulseValue: null,
  shake: null,
  hopping: false,
  mood: 'happy',
  endButtonsVisible: false,
  table: freshTable(),
};

configureAudio(state.settings);

/* ---------- Avisos de cambio ---------- */

const listeners = new Set();

/** Registra una función que se llama cada vez que cambia el estado. */
export function onChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((listener) => listener(state));
}

/* ---------- Tareas con espera que se cancelan solas ----------
 * La ronda, la ayuda y el final usan `await wait(ms)`. Si mientras esperan la
 * niña vuelve al inicio o el adulto abre los ajustes, esa tarea ya no sirve.
 * Para eso existe `roundId`: sube al empezar una ronda, al volver al inicio y
 * al abrir los ajustes. Cada tarea guarda el número con el que empezó y,
 * después de cada espera, pregunta `isStale(id)`. Si el número cambió, la
 * tarea termina sin tocar nada. Así no quedan voces ni animaciones sueltas.
 */
let roundId = 0;
const isStale = (id) => id !== roundId;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let nonce = 0;

function lookMs(ms) {
  return ms * (LOOK_TIME[state.settings.lookTime] ?? 1);
}

/* ---------- Acciones públicas ---------- */

/** Cambia el nivel desde la pantalla de inicio y lo guarda. */
export function chooseLevel(level) {
  updateSettings({ ...state.settings, level });
}

/** Empieza una sesión con el modo elegido. */
export function startGame(mode = state.settings.mode) {
  unlockAudio();
  updateSettings({ ...state.settings, mode });
  state.screen = 'game';
  state.roundNumber = 1;
  state.totalRounds = state.settings.rounds;
  state.previousKey = null;
  playRound();
}

/** Vuelve al inicio y cancela todo lo pendiente. */
export function goHome() {
  roundId++;
  stopSpeaking();
  state.screen = 'home';
  state.round = null;
  state.mood = 'happy';
  state.endButtonsVisible = false;
  notify();
}

/** Repite la pregunta en voz alta (globo con altavoz). */
export function repeatQuestion() {
  if (state.round) say(state.round.question);
}

/** El adulto abrió los ajustes: se detiene todo lo que estaba en curso. */
export function pauseForSettings() {
  roundId++;
  stopSpeaking();
}

/** Guarda ajustes nuevos (ya validados por normalizeSettings). */
export function updateSettings(next) {
  state.settings = normalizeSettings(next);
  configureAudio(state.settings);
  saveSettings(state.settings);
  notify();
}

/**
 * La niña tocó una respuesta.
 * @param {string|number} value
 */
export function chooseAnswer(value) {
  if (state.phase !== 'answering' || !state.round) return;
  const expected = state.round.steps[state.stepIndex];
  if (String(value) === String(expected)) {
    handleCorrect(expected);
  } else {
    handleMistake(value);
  }
}

/* ---------- Una ronda ---------- */

async function playRound() {
  const id = ++roundId;
  const round = createRound(state.settings, { previousKey: state.previousKey });
  state.previousKey = round.key;
  Object.assign(state, {
    round,
    phase: 'showing',
    stepIndex: 0,
    helpUsed: false,
    filledSteps: [],
    pulseValue: null,
    shake: null,
    hopping: false,
    mood: 'idle',
    table: freshTable(),
  });
  notify();

  // Anticipar el cierre, como "en dos canciones guardamos".
  const roundsLeft = state.totalRounds - state.roundNumber + 1;
  if (roundsLeft === 2) await say(TEXT.twoMore);
  if (roundsLeft === 1) await say(TEXT.lastOne);
  if (isStale(id)) return;

  await wait(TIMING.beforeShow);
  if (isStale(id)) return;

  await SHOW[round.mode](round, id);
  if (isStale(id)) return;

  state.phase = 'answering';
  notify();
  say(round.question);
}

/** Cómo se muestra cada modo antes de que la niña responda. */
const SHOW = {
  async sequence(round, id) {
    await say(introPhrase(round));
    if (isStale(id)) return;
    await playSequence(round, id, LEVEL_RULES.sequence[round.level].stepMs);
    if (isStale(id)) return;
    await say(TEXT.yourTurn);
  },

  async missing(round, id) {
    say(introPhrase(round));
    await wait(lookMs(LEVEL_RULES.missing[round.level].showMs));
    if (isStale(id)) return;
    state.table.covered = true;
    playNeutralTone();
    notify();
    say('Tapamos.');
    await wait(TIMING.cover);
    if (isStale(id)) return;
    state.table.covered = false;
    state.table.missingSlot = 'gone';
    playNeutralTone();
    notify();
  },

  async cups(round, id) {
    const rules = LEVEL_RULES.cups[round.level];
    state.table.cupsLifted = true;
    notify();
    say(introPhrase(round));
    await wait(lookMs(rules.showMs));
    if (isStale(id)) return;
    state.table.cupsLifted = false;
    playNeutralTone();
    notify();
    await wait(rules.delayMs);
  },
};

/** Enciende las tapitas de la secuencia una por una, con tono y voz. */
async function playSequence(round, id, stepMs) {
  for (let i = 0; i < round.steps.length; i++) {
    const color = round.steps[i];
    state.table.litIndex = round.tableColors.indexOf(color);
    state.table.litNumber = i + 1;
    playCountTone(i + 1);
    notify();
    await Promise.all([say(colorPhrase(color)), wait(lookMs(stepMs))]);
    if (isStale(id)) return;
    state.table.litIndex = null;
    notify();
    await wait(TIMING.stepGap);
    if (isStale(id)) return;
  }
}

/* ---------- Acierto ---------- */

let tapCounter = 0;

function handleCorrect(expected) {
  const round = state.round;
  state.pulseValue = null;
  state.filledSteps = [...state.filledSteps, expected];
  state.stepIndex++;

  if (round.mode === 'sequence') {
    // Cada toque enciende su tapita en la mesa, con su número encima.
    state.table.litIndex = round.tableColors.indexOf(String(expected));
    state.table.litNumber = state.stepIndex;
    playCountTone(state.stepIndex);
    say(optionWord(round, expected));
  }

  if (state.stepIndex < round.steps.length) {
    const tap = ++tapCounter;
    const id = roundId;
    notify();
    setTimeout(() => {
      if (tap !== tapCounter || isStale(id)) return;
      state.table.litIndex = null;
      notify();
    }, 700);
    return;
  }
  solveRound();
}

async function solveRound() {
  const id = roundId;
  const round = state.round;
  state.phase = 'solved';
  state.mood = 'happy';
  state.hopping = true;
  state.table.missingSlot = 'found';
  if (round.mode === 'cups') {
    state.table.cupsLifted = true;
    state.table.highlightCup = Number(round.steps[0]) - 1;
  }
  playSuccessTone();
  notify();

  setTimeout(() => {
    if (isStale(id)) return;
    state.hopping = false;
    notify();
  }, TIMING.hop);

  await Promise.all([say(resultPhrase(round)), wait(TIMING.nextRound)]);
  if (isStale(id)) return;

  if (state.roundNumber < state.totalRounds) {
    state.roundNumber++;
    playRound();
  } else {
    endSession();
  }
}

/* ---------- Error: nunca castiga ---------- */

function handleMistake(value) {
  playSoftErrorTone();
  state.shake = { value, nonce: ++nonce };
  const shakeNonce = state.shake.nonce;
  notify();
  setTimeout(() => {
    if (state.shake?.nonce !== shakeNonce) return;
    state.shake = null;
    notify();
  }, TIMING.shake);

  if (!state.helpUsed) {
    state.helpUsed = true;
    runHelp();
  } else {
    // A partir del segundo error ya no hay narración: solo marca la correcta.
    state.pulseValue = state.round.steps[state.stepIndex];
    notify();
  }
}

/**
 * La ayuda paso a paso: la mascota piensa, la voz narra la solución con el
 * objeto resaltado y al final la respuesta correcta queda latiendo.
 * Mientras dura, los botones no responden (phase = 'helping').
 */
async function runHelp() {
  const id = roundId;
  const round = state.round;
  state.phase = 'helping';
  state.mood = 'think';
  notify();
  await wait(TIMING.shake + 150);
  if (isStale(id)) return;

  await HELP[round.mode](round, id);
  if (isStale(id)) return;

  state.pulseValue = round.steps[state.stepIndex];
  state.phase = 'answering';
  state.mood = 'idle';
  notify();
}

const HELP = {
  async sequence(round, id) {
    await say(TEXT.look);
    if (isStale(id)) return;
    // Repite toda la secuencia más lenta y luego marca la que sigue.
    await playSequence(round, id, LEVEL_RULES.sequence[round.level].stepMs * 1.4);
    if (isStale(id)) return;
    const next = round.steps[state.stepIndex];
    state.table.litIndex = round.tableColors.indexOf(next);
    state.table.litNumber = state.stepIndex + 1;
    notify();
    await Promise.all([say(helpPhrase(round, state.stepIndex)), wait(TIMING.helpStep * 2)]);
    if (isStale(id)) return;
    state.table.litIndex = null;
  },

  async missing(round, id) {
    await say(TEXT.look);
    if (isStale(id)) return;
    state.table.missingSlot = 'help';
    playNeutralTone();
    notify();
    await Promise.all([say(helpPhrase(round)), wait(TIMING.helpStep * 3)]);
    if (isStale(id)) return;
    state.table.missingSlot = 'gone';
  },

  async cups(round, id) {
    await say(TEXT.look);
    if (isStale(id)) return;
    state.table.cupsLifted = true;
    state.table.highlightCup = Number(round.steps[0]) - 1;
    playNeutralTone();
    notify();
    await Promise.all([say(helpPhrase(round)), wait(TIMING.helpStep * 3)]);
    if (isStale(id)) return;
    state.table.cupsLifted = false;
    state.table.highlightCup = null;
    playNeutralTone();
  },
};

/* ---------- Final ---------- */

async function endSession() {
  const id = ++roundId;
  state.screen = 'end';
  state.mood = 'happy';
  state.endButtonsVisible = false;
  notify();
  say(TEXT.endSpeech);
  await wait(TIMING.endButtons);
  if (isStale(id)) return;
  state.endButtonsVisible = true;
  notify();
}
