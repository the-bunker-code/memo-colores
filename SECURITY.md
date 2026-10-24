# Seguridad

## Modelo de amenazas

Memo Colores es un **sitio estático sin servidor, sin cuentas y sin formularios de texto**. Lo único que una persona controla son seis ajustes que se eligen de listas cerradas. Eso reduce la superficie a:

| Amenaza                                         | Cómo se mitiga                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inyección de HTML/JS (XSS)                      | `render.js` arma HTML solo con constantes de `config.js` y de las reglas; nada que escribe una persona llega a `innerHTML`. Aun así la CSP prohíbe scripts y estilos escritos en el HTML (`script-src 'self'`, `style-src 'self'`). Si algún día se muestra texto libre, hay que escaparlo (nota en la cabecera de `render.js`). |
| Datos corruptos o manipulados en `localStorage` | `normalizeSettings()` (`storage.js`) acepta solo valores de listas cerradas, ignora cualquier otra clave (incluidas `__proto__` y `constructor`) y vuelve a los valores por defecto si el JSON está roto. Pruebas en `tests/storage.test.js`.                                                                                    |
| Recursos de terceros comprometidos              | No hay: cero peticiones fuera del sitio, sin CDN. La letra y los íconos se copian al repositorio con su licencia.                                                                                                                                                                                                                |
| Página incrustada en otro sitio (clickjacking)  | `frame-ancestors 'none'` y `X-Frame-Options: DENY` desde `_headers` (no disponibles en GitHub Pages, ver abajo).                                                                                                                                                                                                                 |
| Fuga de datos de los niños                      | No se recoge nada: [PRIVACY.md](PRIVACY.md).                                                                                                                                                                                                                                                                                     |
| Dependencias vulnerables                        | Ninguna llega al sitio: las `devDependencies` (ESLint, Prettier, TypeScript, Playwright, axe-core, html-validate) solo corren en desarrollo.                                                                                                                                                                                     |
| Secretos                                        | El proyecto no usa ninguno (`.gitignore` excluye `.env`).                                                                                                                                                                                                                                                                        |

Fuera de alcance: ataques al dispositivo o al navegador, y a la cuenta de hosting.

## Content Security Policy

Va en `_headers` y, repetida, en un `<meta http-equiv="Content-Security-Policy">` de `index.html` para GitHub Pages.

| Directiva                                                          | Valor           | Por qué                                                                                                                                              |
| ------------------------------------------------------------------ | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default-src`                                                      | `'self'`        | Todo lo que no se nombra abajo solo viene de este sitio.                                                                                             |
| `script-src`                                                       | `'self'`        | Solo los módulos de `js/`. Sin `'unsafe-inline'`: no hay `<script>` ni `onclick=` en el HTML.                                                        |
| `style-src`                                                        | `'self'`        | Solo `css/styles.css`. Sin `'unsafe-inline'`: los colores dinámicos se ponen con `element.style.setProperty` (CSSOM), que la CSP permite (`dom.js`). |
| `img-src`, `font-src`, `connect-src`, `manifest-src`, `worker-src` | `'self'`        | Íconos, letra, `fetch` del service worker, manifiesto y `sw.js`, todo propio.                                                                        |
| `object-src`                                                       | `'none'`        | Sin plugins.                                                                                                                                         |
| `base-uri`                                                         | `'none'`        | Nadie puede cambiar la base de las URL relativas.                                                                                                    |
| `form-action`                                                      | `'none'`        | No hay formularios que envíen datos (el del panel usa `method="dialog"`).                                                                            |
| `frame-ancestors`                                                  | `'none'`        | Nadie puede mostrar el juego en un iframe. Solo funciona como cabecera.                                                                              |
| `upgrade-insecure-requests`                                        | (solo cabecera) | Sube a https cualquier recurso http. El servidor local lo quita.                                                                                     |

## Otras cabeceras (`_headers`)

`X-Content-Type-Options: nosniff` · `Referrer-Policy: no-referrer` · `Permissions-Policy` (cámara, micrófono, geolocalización, pagos, USB, serial, HID, MIDI y captura de pantalla desactivados) · `Cross-Origin-Opener-Policy: same-origin` · `Cross-Origin-Resource-Policy: same-origin` · `X-Frame-Options: DENY`. Caché: `index.html`, CSS, JS y `sw.js` con `no-cache` (el navegador pregunta si cambió); la letra, con nombre versionado, un año.

## Limitaciones de GitHub Pages

GitHub Pages no permite cabeceras propias. Con la CSP en `<meta>` se conserva casi todo, pero **se pierde**: `frame-ancestors` y `X-Frame-Options` (otro sitio podría mostrar el juego en un iframe), `Permissions-Policy`, `Cross-Origin-Opener-Policy`/`Resource-Policy`, y el control de caché. Para tener todo, publicar en Cloudflare Pages o Netlify, que leen `_headers`.

## Service worker

`sw.js` atiende solo peticiones GET del mismo origen, usa "primero la red" y guarda copias en una caché versionada. No intercepta nada de otros orígenes. Cómo actualizarlo y cómo desactivarlo: README › Service worker.

## Cómo reportar un problema

Abre un _issue_ en el repositorio o escribe a los autores (ver `package.json`).
