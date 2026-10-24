/**
 * main.js — Punto de entrada. Conecta las piezas y escucha los toques.
 * Usa delegación de eventos: un solo listener en `document` busca el botón
 * con `data-action` más cercano y llama a su manejador en ACTIONS. Así no
 * hay `onclick` repartidos por el HTML y los botones que render.js crea de
 * nuevo funcionan sin volver a registrar nada.
 */

import { chooseAnswer, chooseLevel, goHome, onChange, repeatQuestion, startGame, state } from './game.js';
import { hydrateIcons } from './icons.js';
import { render } from './render.js';
import { openSettingsPanel, setupSettingsPanel } from './settings-panel.js';

/** Cada acción recibe el elemento tocado y lee sus data-*. */
const ACTIONS = {
  'start-mode': (el) => startGame(el.dataset.mode),
  'choose-level': (el) => chooseLevel(el.dataset.level),
  'choose-answer': (el) => chooseAnswer(el.dataset.value),
  'repeat-question': () => repeatQuestion(),
  'open-settings': () => openSettingsPanel(),
  'go-home': () => goHome(),
  'play-again': () => startGame(state.settings.mode),
};

function handleAction(event) {
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const handler = ACTIONS[el.dataset.action];
  if (handler) handler(el);
}

document.addEventListener('click', handleAction);

// Los elementos con role="button" que no son <button> también responden a
// Enter y Espacio, como un botón de verdad.
document.addEventListener('keydown', (event) => {
  const el = event.target;
  if (!(el instanceof HTMLElement) || el.tagName === 'BUTTON') return;
  if (el.getAttribute('role') !== 'button') return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    handleAction(event);
  }
});

function boot() {
  document.getElementById('boot-warning')?.remove();
  hydrateIcons();
  setupSettingsPanel();
  onChange(render);
  render(state);
}

boot();
