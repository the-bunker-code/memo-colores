/**
 * spanish.js — Pequeñas ayudas de idioma para la voz y los textos.
 * La voz es un modelo que la niña imita (ecolalia), así que las frases deben
 * salir correctas: "una tapita" y no "uno tapita", "roja y azul" y no
 * "roja, azul". Concentrar esas reglas aquí evita errores repartidos.
 */

const NUMBER_WORDS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'];

/**
 * Número en palabras (0 a 12). Con `feminine` el 1 se dice "una".
 * @param {number} n
 * @param {{ feminine?: boolean }} [options]
 */
export function numberWord(n, { feminine = false } = {}) {
  if (n === 1 && feminine) return 'una';
  return NUMBER_WORDS[n] ?? String(n);
}

/** Pone la primera letra en mayúscula. @param {string} text */
export function capitalize(text) {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

/**
 * Une palabras como se dice en español: "roja", "roja y azul",
 * "roja, azul y verde".
 * @param {string[]} words
 */
export function joinWithAnd(words) {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} y ${words[words.length - 1]}`;
}
