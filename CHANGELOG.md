# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [1.0.0] — 2026-10-24

Primera versión auditada y lista para publicar.

### Cambios que el niño nota

- Colores con más contraste: los botones y tarjetas azul, coral y rosa son un poco más oscuros; el nivel elegido y el engranaje llevan texto oscuro; el título es un coral más profundo; el número rosado y el morado de las respuestas son un poco más fuertes.
- Al equivocarse, el botón se hunde un instante en vez de sacudirse de lado a lado.
- La mascota y el latido de la respuesta correcta se mueven 3 veces y quedan quietos (antes no paraban).
- Tocar la pregunta (altavoz) mientras se muestra la ronda ya no corta la narración; solo repite cuando le toca responder.

### Agregado

- Funciona sin internet y se puede instalar en la pantalla de inicio (`sw.js`, `manifest.webmanifest`).
- Letra Fredoka propia (`fonts/`), sin pedir nada a Google.
- `_headers` con CSP estricta y cabeceras de seguridad; la CSP también va como `<meta>` para GitHub Pages.
- Pruebas: 52 unitarias (`node:test`) y 64 recorridos en el navegador (Playwright + axe-core). Tipos con JSDoc, ESLint, Prettier, validación de HTML, CI en GitHub Actions y Lighthouse CI.
- Documentación: README, ARCHITECTURE, SECURITY, PRIVACY, AUDIT_REPORT.

### Corregido

- **Privacidad:** se elimina Google Fonts (cada visita enviaba el IP del niño a un tercero). La voz prefiere las voces del dispositivo sobre las de red.
- **Accesibilidad:** `lang="es"`; el foco ya no se pierde en cada toque (antes el teclado era inutilizable); contraste WCAG AA; el lector de pantalla recibe una frase corta por fase en vez de todo el tablero; las tapitas tienen nombre; el foco pasa a la pantalla nueva; el botón de la pregunta incluye su texto visible en su nombre.
- **HTML válido:** estructura de `<head>`/`<body>` correcta, `charset` UTF-8, descripción y favicon (antes cada visita pedía un `/favicon.ico` que daba 404).
- Código muerto (`keydown` para `role="button"`) y temporizador de voz sin limpiar.

### Compatibilidad con datos guardados

La clave de `localStorage` sigue siendo `memo-colores:settings:v1`; los ajustes guardados antes se leen igual (prueba con un objeto v1 real).
