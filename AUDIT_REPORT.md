# Informe de auditoría — Memo Colores

Fecha: 2026-10-24 · Alcance: todo el proyecto (HTML, CSS, 12 módulos JS, recursos, despliegue). Cada bloque de cambios tiene su commit y su tag `pre-audit-*` para volver atrás.

## Resumen ejecutivo

1. El juego ya tenía una buena arquitectura (capas separadas, esperas cancelables con `roundId`, ajustes validados, final anunciado, errores sin castigo). Se conservó.
2. **Privacidad (ALTO):** cada visita cargaba Google Fonts (el IP de un niño llegaba a un tercero) y la voz podía elegir una voz de red. Ahora hay **0 peticiones a terceros** y la voz prefiere las del dispositivo.
3. **Accesibilidad (ALTO):** faltaba `lang`; el foco caía en `<body>` tras cada toque (teclado inutilizable); varios contrastes estaban entre 1,8:1 y 3,2:1. Corregido; axe-core (WCAG 2.2 AA) pasa en las 3 pantallas y el panel.
4. **Seguridad:** no había CSP. Ahora es estricta, sin `'unsafe-inline'`, y la prueba falla ante cualquier violación en consola. No se encontró ningún camino de XSS (todo lo interpolado son constantes del código).
5. **Estado y concurrencia:** el candado por fase aguanta toques en ráfaga y cancelaciones; un bug real: tocar el altavoz durante la narración la cortaba (corregido).
6. **Calma visual (principios 1 y 6):** la mascota y el latido eran infinitos y el error se sacudía; ahora se mueven 3 veces y el error es un toque suave.
7. **Pruebas:** de 0 a 52 unitarias y 64 recorridos; cobertura 100 % de líneas en reglas, ajustes y español; 20 sesiones seguidas sin fugas de memoria.
8. **Lighthouse (móvil):** Rendimiento 100, Accesibilidad 89 → **100**, Buenas prácticas 96 → **100**, SEO 90 → **100**.
9. Funciona sin internet y se instala en la pantalla de inicio. Tipos JSDoc: de 175 errores a 0.
10. Riesgos abiertos: ver abajo (GitHub Pages sin cabeceras, voz de red como último recurso, pruebas en iOS pendientes).

## Hallazgos

| #   | Riesgo | Categoría            | Hallazgo                                                                                                                                                                                                                    | Estado                                                                               |
| --- | ------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | ALTO   | Privacidad           | Google Fonts en cada visita (`index.html` original, líneas 5-7)                                                                                                                                                             | **Corregido** — Fredoka propia, 0 terceros                                           |
| 2   | ALTO   | Privacidad           | `pickVoice` podía elegir una voz de red (`audio.js`)                                                                                                                                                                        | **Corregido** — `chooseVoice()`; ver "Riesgos abiertos"                              |
| 3   | ALTO   | Accesibilidad        | Sin `lang` en `<html>` (WCAG 3.1.1)                                                                                                                                                                                         | **Corregido**                                                                        |
| 4   | ALTO   | Accesibilidad        | Foco perdido en cada `notify()` (reproducido: tras Enter en un nivel, `activeElement` era `<body>`)                                                                                                                         | **Corregido** — `updateZone()` + prueba de teclado                                   |
| 5   | ALTO   | Accesibilidad        | Contraste: nivel elegido 1,83; logo 2,13; tarjetas coral 2,58 y rosa 2,91; botón azul 3,21; número rosado 2,91; foco 2,39                                                                                                   | **Corregido** (cambio visible aprobado)                                              |
| 6   | MEDIO  | Seguridad            | Sin CSP ni cabeceras; `style=""` en el HTML y en `render.js`                                                                                                                                                                | **Corregido**                                                                        |
| 7   | MEDIO  | Cumplimiento         | HTML inválido (metas y `<title>` dentro de `<body>`, `charset=utf8`, restos `claude:viewport-fit-sides`, sin descripción ni favicon → 404)                                                                                  | **Corregido** — `html-validate` sin errores                                          |
| 8   | MEDIO  | Experiencia infantil | Animaciones infinitas (mascota, latido) y error con sacudida lateral                                                                                                                                                        | **Corregido** (cambio visible aprobado)                                              |
| 9   | MEDIO  | Estado y voz         | `repeatQuestion()` cortaba la narración con `say()`                                                                                                                                                                         | **Corregido** — [CAMBIO DE COMPORTAMIENTO]                                           |
| 10  | MEDIO  | Accesibilidad        | `aria-live` sobre todo el tablero; `role="radio"` sin teclas; `aria-label` en `<span>`; tapitas sin nombre; foco al cambiar de pantalla                                                                                     | **Corregido**                                                                        |
| 11  | BAJO   | Mantenibilidad       | Código muerto `keydown` para `role="button"`; temporizador de voz sin limpiar; `resume()` sin `catch`                                                                                                                       | **Corregido**                                                                        |
| 12  | BAJO   | Calidad              | Sin pruebas, tipos, linter, formato, README, licencia, CI                                                                                                                                                                   | **Corregido**                                                                        |
| 13  | BAJO   | Experiencia infantil | En el nivel Avanzado de "¿Cuál falta?" (5 tapitas) pueden coincidir rojo, naranja y rosado                                                                                                                                  | **Pendiente** (no se cambió; decisión de diseño de colores)                          |
| 14  | BAJO   | Accesibilidad        | El juego depende del color (inherente a su objetivo). Las respuestas de color llevan su nombre escrito y las tapitas tienen nombre para el lector de pantalla, pero la mesa no tiene una marca no cromática para daltonismo | **Aceptado con justificación**; mejora posible: marca/forma por color                |
| 15  | BAJO   | Experiencia infantil | El engranaje de ajustes está visible y sin candado para el niño; abrirlo corta la ronda                                                                                                                                     | **Pendiente** (un candado, p. ej. mantener pulsado, cambia lo que el niño ve y hace) |
| 16  | BAJO   | Experiencia infantil | La ayuda con voz sale en el primer error de cada ronda (no hay un N configurable de errores); es una decisión de diseño de la serie                                                                                         | **Aceptado** (el principio 1 se cumple)                                              |

Sin hallazgos: **Seguridad/almacenamiento** (`normalizeSettings` ya rechazaba tipos, rangos, ids, prototipos y JSON corrupto; solo se agregaron pruebas) y **barajado/armado de rondas** (Fisher-Yates correcto, ids en vez de texto, sin repetir tirada; 300 rondas por modo y nivel comprobadas).

## Principios de la serie

| #   | Principio                               | Antes               | Ahora                                                          |
| --- | --------------------------------------- | ------------------- | -------------------------------------------------------------- |
| 1   | Equivocarse no castiga                  | Parcial (sacudida)  | Cumple                                                         |
| 2   | Final anunciado, botones con retraso    | Cumple              | Cumple (con prueba)                                            |
| 3   | Variedad sin caos                       | Cumple              | Cumple                                                         |
| 4   | Un toque, objetivos grandes             | Cumple              | Cumple (prueba ≥44 px a 360 px)                                |
| 5   | Voz que acompaña, funciona sin voz      | Cumple              | Cumple (prueba sin voz)                                        |
| 6   | Calma visual, `prefers-reduced-motion`  | Parcial (infinitas) | Cumple (prueba: 0 animaciones activas con movimiento reducido) |
| 7   | Anclas visuales constantes              | Cumple              | Cumple                                                         |
| 8   | Guía para el adulto y ajustes separados | Cumple              | Cumple                                                         |

## Métricas antes y después

Lighthouse 12, móvil, Chrome headless, servidor local con gzip (`scripts/serve.js`); una corrida cada una.

| Métrica                                                  | Antes               | Después                              | Límite                |
| -------------------------------------------------------- | ------------------- | ------------------------------------ | --------------------- |
| Rendimiento / Accesibilidad / Buenas prácticas / SEO     | 100 / 89 / 96 / 90  | 100 / **100 / 100 / 100**            | ≥90 / ≥95 / ≥95 / ≥90 |
| Peticiones en la primera carga                           | 16                  | 18                                   | ≤ 20                  |
| Peticiones a terceros                                    | **2**               | **0**                                | 0                     |
| LCP                                                      | 1,5 s               | 1,7 s                                | ≤ 2,0 s               |
| FCP                                                      | 1,5 s               | 1,0 s                                | —                     |
| CLS                                                      | 0,001               | 0,019                                | ≤ 0,05                |
| TBT                                                      | 0 ms                | 0 ms                                 | —                     |
| HTML+CSS+JS (gzip)                                       | 25,4 KB             | 30,0 KB                              | ≤ 60 KB               |
| Letra (woff2)                                            | (Google, no medida) | 29,7 KB                              | ≤ 80 KB               |
| Transferencia total en la primera carga                  | 62 KB               | 79 KB                                | —                     |
| Errores de tipos (`tsc`)                                 | 175                 | 0                                    | 0                     |
| Pruebas unitarias / recorridos                           | 0 / 0               | 52 / 64                              | —                     |
| Cobertura (líneas) `rules`, `storage`, `spanish`         | 0 %                 | 100 %                                | ≥90 %                 |
| DOM tras 1 sesión → 20 sesiones: nodos / escuchas / heap | no medido           | 1206 → 1206 / 21 → 21 / 2,2 → 2,5 MB | sin crecimiento       |

La subida de peticiones (+2) y peso (+17 KB) viene de funciones nuevas: la letra propia (30 KB, antes la servía Google), el manifiesto, el ícono de la pestaña y los módulos precargados. LCP y CLS suben un poco por la misma razón y siguen dentro del presupuesto. El tiempo "toque → volteo visible" no aplica a este juego (no hay cartas); el botón responde en el mismo cuadro (`:active`).

## Riesgos que quedan abiertos

- **GitHub Pages no permite cabeceras:** se conserva la CSP vía `<meta>`, pero no `frame-ancestors`, `Permissions-Policy`, COOP ni control de caché. Cloudflare Pages o Netlify aplican todo con el mismo `_headers`.
- **Voz de red como último recurso:** si el dispositivo no tiene ninguna voz local en español (p. ej. Chrome en Linux sin speech-dispatcher), se usa una de red y la frase sale del dispositivo. Es una decisión consciente (sin voz el juego es peor para esta edad); apagar la voz en los ajustes la evita. Documentado en PRIVACY.md.
- **No probado en iPhone/Safari real:** las pruebas corren en Chromium. Puntos a revisar a mano: `speechSynthesis.getVoices()` vacío al inicio (el código reintenta con `voiceschanged`), `AudioContext` bloqueado hasta el primer toque (`unlockAudio()` al elegir un modo), `<dialog>` y el service worker.
- **La voz real no se probó automáticamente:** las pruebas usan un stub de `speechSynthesis`. Conviene escuchar una sesión completa en el dispositivo de uso.
- **El CI de GitHub Actions no se ejecutó** (el proyecto no tiene remoto todavía); los mismos pasos corren en local con `npm run check` y están en verde.
- Hallazgos 13, 14 y 15 (arriba).

## Para el adulto: lo que el niño va a notar

Se tocó lo que ve y oye, siempre dentro de la misma identidad (mismas mascotas, mismos colores por modo):

1. **Colores un poco más intensos.** El azul, el coral y el rosa de las tarjetas y de la etiqueta del modo son algo más oscuros para que el texto blanco se lea mejor; el nivel que está elegido ahora tiene texto oscuro sobre el naranja; el engranaje, el título y los números de las respuestas también cambian de tono. Cada modo conserva su color de siempre.
2. **Al equivocarse, el botón se hunde un poquito** y vuelve (antes se sacudía de lado a lado). El tono suave y la ayuda con voz siguen igual.
3. **La mascota y la respuesta que "late" se mueven 3 veces y descansan.** Si a ella le llamaba la atención que no pararan, puede que lo extrañe; es para que haya menos distracción.
4. **Tocar el altavoz de la pregunta mientras el juego muestra la ronda ya no hace nada** (antes cortaba lo que la voz estaba diciendo). Cuando le toca responder, sí repite.
5. **Cómo presentárselo:** no hace falta explicar nada. Si nota un color distinto, se lo puede nombrar con la voz del juego ("el azul"); la mascota y los sonidos son los mismos. Conviene jugar una sesión juntos la primera vez y escuchar que la voz suene bien en el dispositivo.

Y lo que no se ve: el juego ya no pide nada a internet (la letra viaja con el juego), guarda solo los ajustes del adulto, y funciona sin conexión después de la primera visita.

---

## Anexo: antes y después de los cambios de lógica

El detalle completo está en los commits (`git log --oneline`, tags `pre-audit-*`). Estos son los bloques con cambio de comportamiento o de seguridad.

### Voz: elegir la del dispositivo (`js/audio.js`)

**Antes**

```js
function pickVoice() {
  const synth = globalThis.speechSynthesis;
  if (!synth) return;
  const voices = synth.getVoices();
  for (const lang of VOICE_LANGS) {
    const exact = voices.find((v) => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase());
    if (exact) {
      chosenVoice = exact;
      return;
    }
  }
  chosenVoice = voices.find((v) => v.lang.toLowerCase().startsWith('es')) ?? null;
}
```

**Después**

```js
export function chooseVoice(voices) {
  const normalizedLang = (voice) => voice.lang.replace('_', '-').toLowerCase();
  const find = (pool) => {
    for (const lang of VOICE_LANGS) {
      const exact = pool.find((voice) => normalizedLang(voice) === lang.toLowerCase());
      if (exact) return exact;
    }
    return pool.find((voice) => normalizedLang(voice).startsWith('es')) ?? null;
  };
  return find(voices.filter((voice) => voice.localService)) ?? find([...voices]);
}

function pickVoice() {
  const synth = globalThis.speechSynthesis;
  if (!synth) return;
  chosenVoice = chooseVoice(synth.getVoices());
}
```

### Repetir la pregunta (`js/game.js`) — [CAMBIO DE COMPORTAMIENTO]

**Antes**

```js
export function repeatQuestion() {
  if (state.round) say(state.round.question);
}
```

**Después**

```js
export function repeatQuestion() {
  if (state.round && state.phase === 'answering') say(state.round.question);
}
```

### Redibujo sin perder el foco ni usar `style=""` (`js/render.js`, `js/dom.js`)

**Antes** (bandeja; el mismo patrón en nivel, modos, mesa y consigna)

```js
tray.innerHTML = round.options
  .map((value, position) => {
    /* … */
  })
  .join('');
// …y en tapitaHTML():
return `<span class="${classes.join(' ')}" style="--base:${color.base};--shine:${color.shine}">${badge}</span>`;
```

**Después**

```js
updateZone(tray, html); // dom.js: no toca el DOM si no cambió; si cambió, devuelve el foco al mismo botón
// …y en tapitaHTML():
return `<span class="${classes.join(' ')}" ${a11y} data-vars="--base:${color.base};--shine:${color.shine}">${badge}</span>`;
// dom.js → applyStyleVars() lee data-vars y llama element.style.setProperty (permitido por la CSP)
```
