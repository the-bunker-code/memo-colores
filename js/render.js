/**
 * render.js — Dibuja la pantalla a partir del estado. Solo lee `state`.
 * Arma HTML con template strings y lo pone zona por zona con updateZone (dom.js).
 * Todo lo que se interpola sale de config.js o de las reglas (constantes del
 * código), nunca de lo que escribe una persona, así que no hace falta escapar;
 * si algún día se muestra texto libre, hay que escaparlo antes de interpolarlo.
 * ¿Por qué alcanza sin framework? La pantalla es chica (unas 10 zonas), el
 * estado cambia pocas veces por segundo y cada zona se redibuja entera en
 * menos de un milisegundo. Un framework resolvería un problema que aquí no
 * existe y agregaría cosas que un junior tendría que aprender primero.
 */

import { ANSWER_COLORS, GENERAL_TIPS, LEVELS, MODES, THEMES, colorById, levelById, modeById } from './config.js';
import { updateZone } from './dom.js';
import { icon } from './icons.js';
import { mascotSVG } from './mascot.js';

/** @typedef {import('./game.js').GameState} GameState */
/** @typedef {import('./rules.js').Round} Round */

/**
 * Busca un elemento fijo de index.html. Si falta, es un error de programación.
 * @param {string} id
 * @returns {HTMLElement}
 */
const $ = (id) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Falta #${id} en index.html`);
  return element;
};

/** Punto de entrada: redibuja todo lo visible. @param {GameState} state */
export function render(state) {
  applyTheme(state);
  showScreen(state.screen);
  if (state.screen === 'home') renderHome(state);
  if (state.screen === 'game') renderGame(state);
  if (state.screen === 'end') renderEnd(state);
}

/* ---------- Tema y pantallas ---------- */

/** @param {GameState} state */
function applyTheme(state) {
  const themeName = state.screen === 'home' ? 'home' : modeById(state.settings.mode).theme;
  const theme = THEMES[themeName];
  const root = document.documentElement.style;
  root.setProperty('--theme-main', theme.main);
  root.setProperty('--theme-dark', theme.dark);
  root.setProperty('--theme-light', theme.light);
  root.setProperty('--sky-top', theme.skyTop);
  root.setProperty('--sky-bottom', theme.skyBottom);
  root.setProperty('--hills', theme.hills);
}

/** @param {GameState['screen']} screen */
function showScreen(screen) {
  for (const name of ['home', 'game', 'end']) {
    $(`screen-${name}`).hidden = name !== screen;
  }
}

/* ---------- Piezas reutilizables ---------- */

/**
 * Una tapita (objeto de juego).
 * @param {string} colorId
 * @param {{ size?: 'normal'|'small'|'mini'|'chip', lit?: boolean, highlighted?: boolean, number?: number|null }} [options]
 */
function tapitaHTML(colorId, { size = 'normal', lit = false, highlighted = false, number = null } = {}) {
  const color = colorById(colorId);
  const classes = ['tapita', `tapita--${size}`];
  if (lit) classes.push('is-counted');
  if (highlighted) classes.push('is-highlighted');
  const badge = number ? `<span class="tapita__number">${number}</span>` : '';
  return `<span class="${classes.join(' ')}" data-vars="--base:${color.base};--shine:${color.shine}">${badge}</span>`;
}

/**
 * @param {string} id
 * @param {string} mood
 */
function mascotInto(id, mood) {
  const el = $(id);
  if (el.dataset.mood !== mood) {
    el.innerHTML = mascotSVG(mood);
    el.dataset.mood = mood;
  }
}

/* ---------- Inicio ---------- */

/** @param {GameState} state */
function renderHome(state) {
  mascotInto('home-mascot', 'happy');

  updateZone(
    $('level-picker'),
    LEVELS.map((level) => {
      const selected = level.id === state.settings.level;
      return `<button type="button" class="level ${selected ? 'is-selected' : ''}" role="radio"
        aria-checked="${selected}" data-action="choose-level" data-level="${level.id}">
        ${icon(level.icon, { size: 26, strokeWidth: 3 })}
        <span class="level__name">${level.name}</span>
        <span class="level__hint">${level.hint}</span>
      </button>`;
    }).join(''),
  );

  updateZone(
    $('mode-grid'),
    MODES.map((mode) => {
      const theme = THEMES[mode.theme];
      return `<button type="button" class="mode-card" data-action="start-mode" data-mode="${mode.id}"
        data-vars="--card-main:${theme.main};--card-dark:${theme.dark}">
        <span class="mode-card__deco" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="mode-card__icon">${icon(mode.icon, { size: 32, strokeWidth: 3 })}</span>
        <span class="mode-card__text">
          <span class="mode-card__name">${mode.name}</span>
          <span class="mode-card__subtitle">${mode.subtitle}</span>
        </span>
      </button>`;
    }).join(''),
  );
}

/* ---------- Juego ---------- */

/** @param {GameState} state */
function renderGame(state) {
  const { round } = state;
  if (!round) return;
  const mode = modeById(round.mode);

  const avatar = $('avatar');
  mascotInto('avatar', state.mood);
  avatar.classList.toggle('is-hopping', state.hopping);

  renderProgress(state);

  updateZone(
    $('mode-chip'),
    `
    <span class="mode-chip__icon">${icon(mode.icon, { size: 18, strokeWidth: 3 })}</span>
    <span>${mode.name} · ${levelById(round.level).name}</span>`,
  );

  updateZone(
    $('question'),
    `
    <span class="question__speaker">${icon('volume-2', { size: 24 })}</span>
    <span class="question__text">${round.question}</span>`,
  );

  updateZone($('prompt-card'), PROMPT[round.mode](state, round));
  updateZone($('table'), TABLE[round.mode](state, round));
  $('table').className = `table table--${round.mode}`;
  renderTray(state, round);

  updateZone($('adult-tips'), [...mode.tips, ...GENERAL_TIPS].map((tip) => `<li>${tip}</li>`).join(''));
}

/** @param {GameState} state */
function renderProgress(state) {
  const done = state.roundNumber - 1 + (state.phase === 'solved' ? 1 : 0);
  const percent = Math.round((done / state.totalRounds) * 100);
  const bar = $('progress');
  bar.setAttribute('aria-valuenow', String(done));
  bar.setAttribute('aria-valuemax', String(state.totalRounds));
  updateZone(
    bar,
    `
    <span class="progress__fill" data-vars="--progress:${percent}%"></span>
    <span class="progress__text">${state.roundNumber} / ${state.totalRounds}</span>`,
  );
}

/** Caja de resultado: "?" hasta acertar, luego la respuesta. */
/**
 * @param {string} content
 * @param {boolean} filled
 */
function resultBox(content, filled) {
  return `<span class="result-box ${filled ? 'is-filled' : ''}">${filled ? content : '?'}</span>`;
}

/** @type {Record<import('./config.js').ModeId, (state: GameState, round: Round) => string>} */
const PROMPT = {
  sequence(state, round) {
    const boxes = round.steps.map((color, i) => {
      const filled = i < state.filledSteps.length;
      return resultBox(tapitaHTML(String(color), { size: 'mini' }), filled);
    });
    return `<div class="prompt-card__line prompt-card__line--slots"
      data-vars="--slots:${boxes.length}">${boxes.join('')}</div>`;
  },

  missing(state, round) {
    const solved = state.phase === 'solved';
    return `<div class="prompt-card__line">
      <span class="prompt-card__icon">${icon('eye-off', { size: 34, strokeWidth: 3 })}</span>
      <span class="prompt-card__arrow">${icon('arrow-right', { size: 34, strokeWidth: 3.5 })}</span>
      ${resultBox(tapitaHTML(String(round.steps[0]), { size: 'mini' }), solved)}
    </div>`;
  },

  cups(state, round) {
    const solved = state.phase === 'solved';
    const answer = Number(round.steps[0]);
    const number = `<span class="result-box__number" data-vars="--answer-color:${ANSWER_COLORS[answer - 1]}">${answer}</span>`;
    return `<div class="prompt-card__line">
      ${tapitaHTML(round.targetColor ?? '', { size: 'small' })}
      <span class="prompt-card__arrow">${icon('arrow-right', { size: 34, strokeWidth: 3.5 })}</span>
      <span class="prompt-card__icon">${icon('cup-soda', { size: 34, strokeWidth: 3 })}</span>
      ${resultBox(number, solved)}
    </div>`;
  },
};

/** @type {Record<import('./config.js').ModeId, (state: GameState, round: Round) => string>} */
const TABLE = {
  sequence(state, round) {
    const { table } = state;
    const showingOrHelping = state.phase === 'showing' || state.phase === 'helping';
    const items = (round.tableColors ?? []).map((color, i) => {
      const lit = table.litIndex === i;
      return tapitaHTML(color, { lit, highlighted: lit && showingOrHelping, number: lit ? table.litNumber : null });
    });
    return `<div class="table__row">${items.join('')}</div>
      <p class="sr-only">${state.phase === 'answering' ? round.question : 'Mira las tapitas.'}</p>`;
  },

  missing(state, round) {
    const { table } = state;
    const shownColors = round.shownColors ?? [];
    const items = shownColors.map((color, i) => {
      if (i !== round.missingIndex || table.missingSlot === 'all') return tapitaHTML(color);
      if (table.missingSlot === 'help') return tapitaHTML(color, { highlighted: true });
      if (table.missingSlot === 'found') return tapitaHTML(color, { lit: true });
      return '<span class="hole" aria-label="Aquí había una tapita"></span>';
    });
    const cloth = table.covered ? '<span class="cloth" aria-label="Una tela tapa las tapitas"></span>' : '';
    const size = shownColors.length > 4 ? 'table__row--tight' : '';
    return `<div class="table__row ${size}">${items.join('')}</div>${cloth}`;
  },

  cups(state, round) {
    const { table } = state;
    const cups = (round.cupColors ?? []).map((color, i) => {
      const highlighted = table.highlightCup === i;
      const tapita =
        table.cupsLifted && color
          ? tapitaHTML(color, { lit: highlighted, highlighted: highlighted && state.phase === 'helping' })
          : '';
      return `<div class="cup-slot ${table.cupsLifted ? 'is-lifted' : ''} ${highlighted ? 'is-highlighted' : ''}">
          <span class="cup-slot__spot">${tapita}</span>
          ${cupSVG(i)}
        </div>`;
    });
    return `<div class="table__row table__row--cups">${cups.join('')}</div>`;
  },
};

/** Un vaso de papel con su número del color de su botón. */
/** @param {number} index */
function cupSVG(index) {
  const color = ANSWER_COLORS[index];
  return `<svg class="cup" viewBox="0 0 100 116" aria-hidden="true">
    <path d="M14 14 H86 L76 110 Q75 114 71 114 H29 Q25 114 24 110 Z" fill="#fff8ec" stroke="#e2c493" stroke-width="4" stroke-linejoin="round"/>
    <rect x="6" y="4" width="88" height="16" rx="8" fill="#ffe3b3" stroke="#e2c493" stroke-width="4"/>
    <circle cx="50" cy="66" r="22" fill="${color}"/>
    <text x="50" y="76" text-anchor="middle" font-family="Fredoka, ui-rounded, system-ui, sans-serif"
      font-weight="700" font-size="30" fill="#fff">${index + 1}</text>
  </svg>`;
}

/* ---------- Bandeja de respuestas ---------- */

/**
 * @param {GameState} state
 * @param {Round} round
 */
function renderTray(state, round) {
  const waiting = state.phase === 'showing' || state.phase === 'helping';
  const lastValue = round.steps[round.steps.length - 1];
  const tray = $('tray');
  tray.classList.toggle('tray--waiting', waiting);

  const html = round.options
    .map((value, position) => {
      const classes = ['chunky', 'answer'];
      if (state.phase === 'solved' && String(value) === String(lastValue)) classes.push('is-correct');
      if (state.pulseValue !== null && String(value) === String(state.pulseValue)) classes.push('is-pulsing');
      if (state.shake && String(value) === String(state.shake.value)) classes.push('is-shaking');
      const disabled = state.phase !== 'answering';
      return `<button type="button" class="${classes.join(' ')}" data-action="choose-answer"
        data-value="${value}" aria-disabled="${disabled}" aria-label="${answerLabel(round, value)}">
        ${round.mode === 'cups' ? numberAnswerHTML(Number(value), position) : colorAnswerHTML(String(value))}
      </button>`;
    })
    .join('');
  updateZone(tray, html);
}

/**
 * @param {Round} round
 * @param {string|number} value
 */
function answerLabel(round, value) {
  return round.mode === 'cups' ? `Vaso ${value}` : colorById(String(value)).word;
}

/** @param {string} colorId */
function colorAnswerHTML(colorId) {
  return `${tapitaHTML(colorId, { size: 'chip' })}
    <span class="answer__word">${colorById(colorId).word}</span>`;
}

/**
 * @param {number} n
 * @param {number} position
 */
function numberAnswerHTML(n, position) {
  const color = ANSWER_COLORS[position];
  const dots = Array.from({ length: n }, () => '<i></i>').join('');
  return `<span class="answer__number" data-vars="--answer-color:${color}">${n}</span>
    <span class="answer__dots" data-vars="--dot:${color}">${dots}</span>`;
}

/* ---------- Final ---------- */

/** @param {GameState} state */
function renderEnd(state) {
  mascotInto('end-mascot', 'happy');
  updateZone(
    $('end-stars'),
    Array.from({ length: state.totalRounds }, () =>
      icon('star', { size: 44, fill: 'currentColor', strokeWidth: 2 }),
    ).join(''),
  );
  $('end-stars').setAttribute('aria-label', `${state.totalRounds} estrellas`);
  $('end-stars').setAttribute('role', 'img');
  $('end-buttons').classList.toggle('is-visible', state.endButtonsVisible);
}
