/**
 * config.js — Datos fijos del juego: colores de las tapitas, modos, temas,
 * niveles, textos y tiempos.
 * Todo lo que un adulto o un desarrollador podría querer ajustar vive aquí,
 * separado de la lógica. Así cambiar un tiempo o un texto no obliga a leer
 * el resto del código.
 */

/**
 * Colores de las tapitas, en orden del arcoíris. Ese orden es el que usamos
 * para "ordenar de menor a mayor" las respuestas de color: siempre aparecen
 * en la misma secuencia, así la posición de cada color en la bandeja es
 * predecible para la niña.
 * `word` va en femenino porque siempre hablamos de "la tapita roja".
 */
export const COLORS = [
  { id: 'red', word: 'roja', base: '#e5392f', shine: '#ff8f85' },
  { id: 'orange', word: 'naranja', base: '#f7821b', shine: '#ffc483' },
  { id: 'yellow', word: 'amarilla', base: '#f2c200', shine: '#fff184' },
  { id: 'green', word: 'verde', base: '#3aa53a', shine: '#97e48f' },
  { id: 'blue', word: 'azul', base: '#2e7be0', shine: '#93c4ff' },
  { id: 'purple', word: 'morada', base: '#8752df', shine: '#caadff' },
  { id: 'pink', word: 'rosada', base: '#f2468f', shine: '#ffadd0' },
];

export const COLOR_IDS = COLORS.map((color) => color.id);

/** @param {string} id */
export function colorById(id) {
  return COLORS.find((color) => color.id === id);
}

/** Colores fijos de las 3 posiciones de la bandeja (respuestas numéricas). */
export const ANSWER_COLORS = ['#a77bff', '#4f8ef7', '#ff5d8f'];

/** Temas de color. Cada modo tiene el suyo y nunca cambia. */
export const THEMES = {
  home: { main: '#ffa23a', dark: '#e07f12', light: '#fff0d6', skyTop: '#ffe7b8', skyBottom: '#fff8ea', hills: '#b9e48f' },
  blue: { main: '#4f8ef7', dark: '#2f6fd8', light: '#dbe9ff', skyTop: '#c4e2ff', skyBottom: '#eef7ff', hills: '#a8dc86' },
  coral: { main: '#ff7a4d', dark: '#e0582b', light: '#ffe3d6', skyTop: '#ffdcc4', skyBottom: '#fff5ec', hills: '#ffc58f' },
  pink: { main: '#ff5d8f', dark: '#df3b6e', light: '#ffdbe7', skyTop: '#ffd6e5', skyBottom: '#fff1f6', hills: '#ffb6cd' },
};

/**
 * Modos del juego. El orden define el orden de las tarjetas en el inicio.
 * `tips` son los consejos del desplegable "Para el adulto" de ese modo.
 */
export const MODES = [
  {
    id: 'sequence',
    name: 'Colores',
    subtitle: 'Mira y repite',
    icon: 'palette',
    theme: 'blue',
    tips: [
      'Las tapitas se encienden una por una. Luego ella toca los colores en el mismo orden.',
      'Di el color en voz alta junto con la voz del juego: así lo imita.',
      'Si se adelanta mientras se encienden, no pasa nada: los botones esperan.',
      'Cuando acierte 5 rondas seguidas sin ayuda, prueba el nivel siguiente.',
    ],
  },
  {
    id: 'missing',
    name: '¿Cuál falta?',
    subtitle: 'Mira, tapamos y adivina',
    icon: 'eye-off',
    theme: 'coral',
    tips: [
      'Primero mira las tapitas. Luego una tela las tapa y una se va.',
      'Señala las que quedan y nómbralas con ella: "roja, verde..."',
      'Las respuestas incluyen colores que siguen en la mesa: puede descartar mirando.',
    ],
  },
  {
    id: 'cups',
    name: '¿Dónde está?',
    subtitle: 'La tapita bajo el vaso',
    icon: 'cup-soda',
    theme: 'pink',
    tips: [
      'Una tapita se esconde bajo un vaso. Ella toca el número del vaso.',
      'Cada vaso tiene su número y su color, igual que el botón de abajo.',
      'En Avanzado hay dos tapitas: la voz dice cuál buscar.',
      'Con tapitas reales y tres vasos de la cocina pueden jugar lo mismo en la mesa.',
    ],
  },
];

/** @param {string} id */
export function modeById(id) {
  return MODES.find((mode) => mode.id === id) ?? MODES[0];
}

export const LEVELS = [
  { id: 'easy', name: 'Principiante', hint: 'Para empezar', icon: 'signal-low' },
  { id: 'medium', name: 'Intermedio', hint: 'Un poco más', icon: 'signal-medium' },
  { id: 'hard', name: 'Avanzado', hint: 'Reto', icon: 'signal-high' },
];

/** @param {string} id */
export function levelById(id) {
  return LEVELS.find((level) => level.id === id) ?? LEVELS[0];
}

/**
 * Reglas por modo y nivel. `rules.js` y las pruebas leen solo de aquí.
 * - sequence.length: cuántos colores tiene la secuencia (sobre 3 tapitas).
 * - missing.count: cuántas tapitas hay en la mesa antes de tapar.
 * - cups.hidden: cuántas tapitas se esconden; cups.delayMs: espera con los
 *   vasos tapados antes de preguntar (memoria más larga).
 * - showMs / stepMs: tiempo para mirar. "Más tiempo" en ajustes lo multiplica.
 */
export const LEVEL_RULES = {
  sequence: {
    easy: { length: 2, stepMs: 1000 },
    medium: { length: 3, stepMs: 850 },
    hard: { length: 4, stepMs: 750 },
  },
  missing: {
    easy: { count: 3, showMs: 3200 },
    medium: { count: 4, showMs: 2800 },
    hard: { count: 5, showMs: 2400 },
  },
  cups: {
    easy: { hidden: 1, showMs: 2600, delayMs: 0 },
    medium: { hidden: 1, showMs: 1800, delayMs: 1500 },
    hard: { hidden: 2, showMs: 2800, delayMs: 800 },
  },
};

export const ROUND_OPTIONS = [3, 5, 8];

/** Multiplicador de "Tiempo para mirar" en ajustes. */
export const LOOK_TIME = { normal: 1, long: 1.5 };

/** Todos los tiempos del juego, en milisegundos, en un solo lugar. */
export const TIMING = {
  nextRound: 2800, // pausa tras acertar, antes de la ronda siguiente
  helpStep: 700, // pausa entre pasos de la ayuda
  endButtons: 4000, // los botones del final aparecen después de esto
  shake: 350, // duración del temblor al equivocarse
  hop: 600, // salto del avatar al acertar
  cover: 1300, // cuánto tiempo la tela tapa la mesa
  stepGap: 250, // silencio entre colores de la secuencia
  beforeShow: 600, // respiro antes de mostrar
};

/** Consejos generales del desplegable "Para el adulto". */
export const GENERAL_TIPS = [
  'Si elige mal, no digas "no": la app ayuda y marca la respuesta.',
  'Espera 5 segundos antes de ayudar.',
  'Sesiones cortas: al terminar, guarden juntos.',
];

/** Textos fijos de la interfaz y de la voz. */
export const TEXT = {
  hello: '¡Hola! ¿Jugamos?',
  twoMore: 'Dos más y guardamos.',
  lastOne: 'La última y guardamos.',
  endTitle: 'Terminamos',
  endLine: 'Ahora guardamos juntos',
  endSpeech: 'Terminamos. Ahora guardamos juntos.',
  yes: 'Sí.',
  yourTurn: 'Ahora tú.',
  look: 'Mira.',
};
