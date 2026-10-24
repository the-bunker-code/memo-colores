# Memo Colores

Juego de memoria con tapitas de colores para niñas y niños de **3 a 7 años**. Tiene tres modos:

- **Colores** (_Mira y repite_): las tapitas se encienden una por una y ella toca los colores en el mismo orden.
- **¿Cuál falta?** (_Mira, tapamos y adivina_): una tela tapa la mesa y una tapita desaparece.
- **¿Dónde está?** (_La tapita bajo el vaso_): una tapita se esconde bajo un vaso y ella toca el número del vaso.

Cada modo tiene tres niveles (Principiante, Intermedio, Avanzado) y sesiones de 3, 5 u 8 rondas.

Está hecho con **HTML, CSS y JavaScript, sin framework ni paso de compilación**: lo que se publica son exactamente los archivos del repositorio. La idea es que una persona que está empezando pueda leer el código de arriba a abajo.

- Qué datos guarda (ninguno del niño): [PRIVACY.md](PRIVACY.md)
- Seguridad y modelo de amenazas: [SECURITY.md](SECURITY.md)
- Por qué está hecho así: [ARCHITECTURE.md](ARCHITECTURE.md)
- Cambios: [CHANGELOG.md](CHANGELOG.md) · Auditoría: [AUDIT_REPORT.md](AUDIT_REPORT.md)

## Cómo abrirlo

El código usa módulos de JavaScript (`import` / `export`). Por seguridad, los navegadores no los cargan si abres el archivo con doble clic (`file://`), así que hace falta un servidor local:

```bash
npm start                    # Node 22 o superior. No descarga nada: usa scripts/serve.js
python3 -m http.server 3000  # si tienes Python (sin las cabeceras de _headers)
```

Luego abre `http://localhost:3000`. Si ves el aviso "Cargando… si ves esto, abre con un servidor local", abriste el archivo directamente.

`npm start` aplica las mismas cabeceras de seguridad que el sitio publicado (las lee de `_headers`) y comprime con gzip, así lo que ves en local se comporta como en producción.

## Pruebas y herramientas

Las herramientas son solo para desarrollo (`devDependencies`); el sitio publicado no las usa.

```bash
npm install                       # una vez
npx playwright install chromium   # una vez, para los recorridos en el navegador

npm test               # pruebas unitarias con node:test (sin navegador)
npm run test:coverage  # lo mismo, y falla si rules, storage o spanish bajan del 90 %
npm run test:e2e       # recorridos reales con Playwright, en 390×844 y 1366×900
npm run lint           # ESLint
npm run format         # Prettier (format:check solo revisa)
npm run typecheck      # tipos a partir de los comentarios JSDoc (tsc --noEmit)
npm run validate:html
npm run check          # todo lo anterior junto
```

Qué verifican las pruebas:

- **Unitarias** (`tests/*.test.js`): para cada modo y nivel, 300 rondas con semilla cumplen todas las reglas (respuestas distintas, la secuencia nunca repite un color seguido, las otras respuestas de "¿Cuál falta?" siguen en la mesa…); el barajado es parejo; las frases que dice la voz salen correctas; los ajustes guardados con valores inválidos se corrigen; el estado del juego (esperas, errores, toques en ráfaga, volver al inicio a mitad de una ronda) con relojes simulados; la voz del dispositivo gana a la de red.
- **Recorridos** (`tests/e2e/`): los 9 modos × niveles hasta la pantalla final, un error con la ayuda completa, toques en ráfaga, ajustes (guardar, cancelar, Escape), uso solo con teclado, sin internet, axe-core (WCAG 2.2 AA) en cada pantalla, 20 sesiones seguidas sin fugas de memoria. Fallan si aparece cualquier error en la consola, incluidas las violaciones de la CSP.

## Estructura

```
index.html            estructura de las 3 pantallas y el panel de ajustes (<dialog>)
css/styles.css        todos los estilos, en 9 secciones numeradas, nombres BEM
js/
  main.js             punto de entrada: arranca todo y escucha los clics (data-action)
  game.js             estado del juego y acciones (empezar, responder, ayuda, final)
  rules.js            reglas: genera cada ronda. Lógica pura, sin DOM ni audio
  render.js           dibuja la pantalla a partir del estado
  dom.js              ayudas de dibujo: variables CSS sin style="" y foco que no se pierde
  settings-panel.js   panel de ajustes para adultos
  config.js           datos fijos: colores, modos, niveles, temas, textos, tiempos (TIMING)
  audio.js            voz (Web Speech API) y tonos (Web Audio API, sin archivos)
  storage.js          guarda los ajustes en localStorage y los valida
  mascot.js           la mascota (SVG) con 3 expresiones
  icons.js            íconos de Lucide copiados como SVG, sin CDN
  spanish.js          números y frases en español
fonts/                Fredoka (woff2) y su licencia OFL
icons/                íconos de la app
sw.js                 service worker: el juego funciona sin internet
manifest.webmanifest  para instalarlo en la pantalla de inicio
_headers              cabeceras de seguridad y caché (Cloudflare Pages y Netlify)
scripts/              servidor local y chequeo de sintaxis
tests/                pruebas unitarias (node:test) y recorridos (tests/e2e, Playwright)
```

## Cómo fluye la información

```
   clic del niño
        │
        ▼
   main.js ── busca el data-action del botón ──▶ game.js (acción)
                                                    │
                                     cambia `state` y llama a notify()
                                                    │
                                                    ▼
                                    render.js dibuja lo que cambió
```

Solo `game.js` modifica `state`; `render.js` solo lo lee. `rules.js` no sabe que existen el navegador ni el audio.

## Decisiones de diseño para el niño

- **Sin "no" ni castigo.** Al equivocarse suena un tono suave, el botón se hunde un instante y la app muestra el camino correcto con voz; la respuesta correcta queda marcada.
- **Final anunciado.** La voz dice "Dos más y guardamos" y "La última y guardamos". Los botones de la pantalla final aparecen a los 4 segundos.
- **Ancla visual.** Cada modo tiene siempre su color y la mascota es siempre la misma (la tapita roja con cara, igual que en _Dados y Tapitas_).
- **Calma visual.** Sin confeti ni parpadeos. La mascota y el latido de la respuesta se mueven 3 veces y descansan. Con "reducir movimiento" activado en el sistema no hay animaciones.
- **Voz que acompaña.** Frases cortas y correctas, para que sirvan de modelo. Si no hay voz, el juego funciona igual.

## Despliegue (GitHub Pages)

Es un sitio estático: se publica la carpeta tal como está. No hace falta compilar.

1. Sube el repositorio a GitHub.
2. _Settings → Pages → Build and deployment_: **Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. El archivo `.nojekyll` evita que GitHub procese el sitio con Jekyll. Las carpetas `tests/`, `scripts/` y `node_modules/` se publican pero no se usan.

GitHub Pages **no permite cabeceras propias**: la CSP igual se aplica gracias al `<meta http-equiv="Content-Security-Policy">` de `index.html`, pero se pierden `frame-ancestors`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` y el control de caché (detalle en [SECURITY.md](SECURITY.md)). **Cloudflare Pages** y **Netlify** leen `_headers` y aplican todo; ahí el comando de build es ninguno y la carpeta de salida es `/`.

### Service worker (funcionar sin internet)

`sw.js` usa la estrategia "primero la red": con internet siempre se baja la versión publicada; sin internet se usa la última copia. Nadie queda atrapado en una versión vieja.

- **Al agregar, quitar o renombrar un archivo**: agrégalo a `FILES` en `sw.js` y a los `modulepreload` de `index.html` (si es un módulo de `js/`), y sube `VERSION` (`'v1'` → `'v2'`). `tests/assets.test.js` falla si se te olvida.
- **Para desactivarlo si algo sale mal**, reemplaza todo `sw.js` por esto y publica:

  ```js
  // Service worker que se borra a sí mismo y borra las copias guardadas.
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', async () => {
    for (const name of await caches.keys()) await caches.delete(name);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll()) client.navigate(client.url);
  });
  ```

  Cada dispositivo lo aplica la próxima vez que abra el juego con internet. Para un solo dispositivo: Ajustes del navegador → Privacidad → Borrar datos del sitio.

### Instalarlo en la pantalla de inicio

- **Android (Chrome):** abrir el juego → menú ⋮ → "Instalar app".
- **iPhone o iPad (Safari, iOS 16.4 o superior):** abrir el juego → botón Compartir → "Agregar a inicio".

## Ejercicio: agregar un modo nuevo

Una buena forma de entender el código es agregar un modo. Por ejemplo, "Contar tapitas": hay de 1 a 3 tapitas en la mesa y ella toca el número.

1. **`config.js`:** agrega el modo a `MODES` (nombre, ícono, tema, consejos para el adulto), sus reglas por nivel en `LEVEL_RULES`, y el id al tipo `ModeId`.
2. **`rules.js`:** escribe `createContarRound(level, random)` y regístrala en `ROUND_BUILDERS`. Es una función pura: devuelve un objeto `Round`.
3. **`game.js`:** agrega cómo se muestra (`SHOW`) y cómo es la ayuda (`HELP`) del modo nuevo.
4. **`render.js`:** agrega su consigna (`PROMPT`) y su mesa (`TABLE`).
5. **`tests/rules.test.js`:** agrega la regla que debe cumplir la ronda; los modos nuevos entran solos en el recorrido de 300 rondas.

Corre `npm test` en cada paso y `npm run check` al terminar.

## Créditos

- Íconos: [Lucide](https://lucide.dev), licencia ISC.
- Letra: [Fredoka](https://github.com/hafontia/Fredoka-One), licencia SIL Open Font License 1.1 (`fonts/OFL.txt`). Se sirve desde este sitio; no se usa Google Fonts.

## Licencia

[MIT](LICENSE) © 2026 Enrique Lazo Bello (ENLABE), The Bunker Code y colaboradores. Los íconos de Lucide y la letra Fredoka mantienen sus propias licencias.
