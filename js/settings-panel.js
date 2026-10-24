/**
 * settings-panel.js — El panel "Ajustes para adultos" (<dialog> nativo).
 * Trabaja sobre una COPIA de los ajustes: lo que el adulto toca no cambia
 * el juego hasta que pulsa "Guardar y empezar". Por eso "Cancelar" no tiene
 * que deshacer nada. Si se cierra sin guardar a mitad de una sesión, el
 * juego vuelve al inicio (la ronda ya quedó cortada al abrir el panel).
 */

import { LEVELS, MODES, ROUND_OPTIONS } from './config.js';
import { goHome, pauseForSettings, startGame, state, updateSettings } from './game.js';
import { normalizeSettings } from './storage.js';

/** Secciones del panel: cada una es un grupo de "pastillas". */
const SECTIONS = [
  { key: 'mode', legend: 'Modo', options: MODES.map((m) => ({ value: m.id, label: m.name })) },
  { key: 'level', legend: 'Nivel', options: LEVELS.map((l) => ({ value: l.id, label: l.name })) },
  { key: 'rounds', legend: 'Rondas por sesión', options: ROUND_OPTIONS.map((n) => ({ value: n, label: String(n) })) },
  {
    key: 'lookTime',
    legend: 'Tiempo para mirar',
    options: [
      { value: 'normal', label: 'Normal' },
      { value: 'long', label: 'Más tiempo' },
    ],
  },
  {
    key: 'voice',
    legend: 'Voz',
    options: [
      { value: true, label: 'Sí' },
      { value: false, label: 'No' },
    ],
  },
  {
    key: 'sound',
    legend: 'Sonidos',
    options: [
      { value: true, label: 'Sí' },
      { value: false, label: 'No' },
    ],
  },
];

let draft = null;
let dialog = null;

/** Prepara el panel una sola vez, al arrancar. */
export function setupSettingsPanel() {
  dialog = document.getElementById('settings');
  const form = document.getElementById('settings-form');

  form.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !draft) return;
    const section = SECTIONS.find((s) => s.key === input.name);
    const option = section?.options.find((o) => String(o.value) === input.value);
    if (option) draft = { ...draft, [input.name]: option.value };
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const saved = normalizeSettings(draft);
    closeWithoutSideEffects();
    updateSettings(saved);
    startGame(saved.mode);
  });

  form.addEventListener('click', (event) => {
    const button = event.target.closest('[data-settings]');
    if (!button) return;
    if (button.dataset.settings === 'home') {
      closeWithoutSideEffects();
      goHome();
    }
    if (button.dataset.settings === 'cancel') closeWithoutSaving();
  });

  // Tecla Escape: el navegador dispara "cancel".
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeWithoutSaving();
  });
}

/** Abre el panel con una copia de los ajustes actuales. */
export function openSettingsPanel() {
  pauseForSettings();
  draft = { ...state.settings };
  document.getElementById('settings-fields').innerHTML = SECTIONS.map(sectionHTML).join('');
  dialog.showModal();
}

function closeWithoutSideEffects() {
  draft = null;
  if (dialog.open) dialog.close();
}

function closeWithoutSaving() {
  closeWithoutSideEffects();
  // Al abrir el panel se cortó la ronda: no se puede seguir a medias.
  if (state.screen !== 'home') goHome();
}

function sectionHTML(section) {
  const pills = section.options
    .map((option) => {
      const checked = String(draft[section.key]) === String(option.value);
      const id = `setting-${section.key}-${option.value}`;
      return `<input class="pill__input" type="radio" name="${section.key}" id="${id}"
        value="${option.value}" ${checked ? 'checked' : ''}>
      <label class="pill" for="${id}">${option.label}</label>`;
    })
    .join('');
  return `<fieldset class="settings__section">
      <legend class="settings__legend">${section.legend}</legend>
      <div class="settings__pills">${pills}</div>
    </fieldset>`;
}
