/**
 * audio.js — La voz (Web Speech API) y los tonos (Web Audio API).
 * Los tonos se generan con un oscilador: no hay archivos de sonido que
 * cargar. Si el navegador no tiene voz en español, o no tiene voz, el juego
 * funciona igual: `say` se resuelve y sigue.
 */

const VOICE_LANGS = ['es-MX', 'es-US', 'es-419', 'es-PE', 'es-CO', 'es-AR', 'es-ES', 'es'];
const MAX_SPEECH_MS = 5000;

let audioContext = null;
let chosenVoice = null;
let voiceEnabled = true;
let soundEnabled = true;

/** Activa o apaga voz y sonidos según los ajustes. */
export function configureAudio({ voice, sound }) {
  voiceEnabled = voice;
  soundEnabled = sound;
  if (!voice) stopSpeaking();
}

/**
 * Los navegadores bloquean el audio hasta el primer toque del usuario.
 * Se llama al elegir un modo.
 */
export function unlockAudio() {
  try {
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === 'suspended') audioContext.resume();
  } catch {
    audioContext = null;
  }
  pickVoice();
}

function pickVoice() {
  const synth = globalThis.speechSynthesis;
  if (!synth) return;
  const voices = synth.getVoices();
  for (const lang of VOICE_LANGS) {
    const exact = voices.find((v) => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase());
    if (exact) { chosenVoice = exact; return; }
  }
  chosenVoice = voices.find((v) => v.lang.toLowerCase().startsWith('es')) ?? null;
}

// Las voces llegan tarde en Chrome: volvemos a elegir cuando aparecen.
globalThis.speechSynthesis?.addEventListener?.('voiceschanged', pickVoice);

export function stopSpeaking() {
  try { globalThis.speechSynthesis?.cancel(); } catch { /* sin voz */ }
}

/**
 * Dice una frase. Interrumpe la anterior para que no se forme una cola.
 * Se resuelve al terminar de hablar, o a los 5 s como máximo.
 * @param {string} text
 * @returns {Promise<void>}
 */
export function say(text) {
  const synth = globalThis.speechSynthesis;
  if (!voiceEnabled || !synth || !text) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    try {
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = chosenVoice?.lang ?? 'es-MX';
      if (chosenVoice) utterance.voice = chosenVoice;
      utterance.rate = 0.9;
      utterance.pitch = 1.05;
      utterance.onend = finish;
      utterance.onerror = finish;
      synth.speak(utterance);
      setTimeout(finish, MAX_SPEECH_MS);
    } catch {
      finish();
    }
  });
}

/** Un tono seno corto. */
function tone(frequency, durationSec, volume = 0.12, delaySec = 0) {
  if (!soundEnabled || !audioContext) return;
  const start = audioContext.currentTime + delaySec;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  // Subida y bajada suaves: evitan el "clic" de cortar la onda de golpe.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + durationSec + 0.02);
}

/** Tono que sube con el número: 1 grave, 2 un poco más agudo... */
export function playCountTone(n) { tone(330 + n * 20, 0.08); }

/** Acierto: tres notas ascendentes (do, mi, sol). */
export function playSuccessTone() {
  [523, 659, 784].forEach((f, i) => tone(f, 0.12, 0.12, i * 0.11));
}

/** Error: un tono grave y suave. Nunca un sonido feo. */
export function playSoftErrorTone() { tone(240, 0.14, 0.08); }

/** Neutro: tapar, destapar, mover un vaso. */
export function playNeutralTone() { tone(440, 0.07, 0.06); }
