/**
 * Pruebas de spanish.js: la voz es un modelo que la niña imita, así que
 * "una tapita" y "roja y azul" deben salir bien.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { capitalize, joinWithAnd, numberWord } from '../js/spanish.js';

test('numberWord dice los números de 0 a 12 y deja pasar los demás', () => {
  assert.equal(numberWord(0), 'cero');
  assert.equal(numberWord(3), 'tres');
  assert.equal(numberWord(12), 'doce');
  assert.equal(numberWord(40), '40');
});

test('numberWord dice "una" en femenino', () => {
  assert.equal(numberWord(1), 'uno');
  assert.equal(numberWord(1, { feminine: true }), 'una');
  assert.equal(numberWord(2, { feminine: true }), 'dos');
});

test('capitalize', () => {
  assert.equal(capitalize('roja'), 'Roja');
  assert.equal(capitalize(''), '');
});

test('joinWithAnd une como se dice en español', () => {
  assert.equal(joinWithAnd([]), '');
  assert.equal(joinWithAnd(['roja']), 'roja');
  assert.equal(joinWithAnd(['roja', 'azul']), 'roja y azul');
  assert.equal(joinWithAnd(['roja', 'azul', 'verde']), 'roja, azul y verde');
});
