# Arquitectura y decisiones

## Principio: que un junior pueda leerlo de arriba a abajo

Sin framework, sin bundler, sin TypeScript compilado en el sitio publicado. Las herramientas de desarrollo (ESLint, Prettier, `tsc --noEmit` sobre JSDoc, Playwright, axe-core) existen solo como `devDependencies`. Una optimización que haga el código más difícil de leer solo entra si resuelve un problema medido y lleva un comentario con el porqué.

## Capas y flujo en una sola dirección

```
clic → main.js (data-action) → game.js (acción) → state → notify() → render.js
                                   │
                                   ├── rules.js    reglas puras (sin DOM, sin audio)
                                   ├── audio.js    voz y tonos
                                   └── storage.js  ajustes validados
```

| Capa                                                   | Regla                                                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `rules.js`, `spanish.js`, `storage.js` (normalización) | Puras: no tocan DOM, audio ni red. El azar entra por el parámetro `random`, así las pruebas usan una semilla. |
| `game.js`                                              | Único que modifica `state`. Las esperas (`await wait()`) se cancelan con `roundId`/`isStale()`.               |
| `render.js`                                            | Solo lee `state`. Dibuja por zonas con `updateZone()`.                                                        |
| `config.js`                                            | Datos fijos: colores, modos, niveles, temas, textos, `TIMING`.                                                |

## Decisiones

**Esperas cancelables (`roundId`).** Cada ronda, la ayuda y el final son funciones `async` con `await wait(ms)`. Si la niña vuelve al inicio o el adulto abre los ajustes, esas tareas ya no sirven. `roundId` sube en cada uno de esos momentos; cada tarea guarda el suyo y revisa `isStale(id)` después de esperar. Alternativa descartada: guardar y cancelar cada temporizador (más código y fácil de olvidar uno). Probado en `tests/game.test.js`.

**Fase de la ronda como candado de toques.** `chooseAnswer` solo hace algo si `state.phase === 'answering'`; `solveRound` y `runHelp` cambian la fase en el mismo instante en que empiezan. Por eso toques en ráfaga, doble toque o tocar durante la ayuda no pueden contar dos veces. `repeatQuestion` usa el mismo candado para no cortar la narración (`say()` interrumpe la frase en curso).

**Redibujo por zonas con `updateZone()` (`dom.js`).** Cada zona (bandeja, mesa, consigna…) es un `innerHTML` que solo se reemplaza si el HTML cambió, y después se devuelve el foco al mismo control. Sin esto el foco caía en `<body>` en cada toque y el teclado era inutilizable; además se reiniciaban las animaciones. Alternativa descartada: DOM virtual o una librería; la pantalla es chica y no hay un problema de rendimiento que medir.

**CSP estricta sin `'unsafe-inline'`.** Nada de `style=""`: los valores dinámicos (color de cada tapita, ancho de la barra) viajan en `data-vars="--base:#e5392f"` y `applyStyleVars()` los pone con `element.style.setProperty`, que la CSP permite. Los valores salen de `config.js`, nunca de una persona.

**Voz: local antes que de red (`chooseVoice`).** Las voces de red mandan cada frase a un servidor. Una voz del dispositivo (`localService`) siempre gana, aunque sea de un español menos preferido; entre las locales se respeta el orden es-MX, es-US, es-419, es-PE, es-CO, es-AR, es-ES, es. Si solo hay voces de red, se usan (el juego sin voz es peor para esta edad) y está documentado en PRIVACY.md.

**Tonos con oscilador.** No hay archivos de sonido: cero peso, cero peticiones, y el error es un tono grave y suave por diseño.

**Modo offline con "primero la red".** `sw.js` baja siempre lo publicado si hay internet y usa la copia si no hay. Alternativa descartada: "primero la caché" (rápido pero deja a la gente atrapada en una versión vieja sin bundler que ponga huellas en los nombres).

**Tipos con JSDoc.** `jsconfig.json` con `checkJs` y `strict`; `npm run typecheck` corre `tsc --noEmit`. Los ids de modo, nivel y los ajustes tienen `@typedef`.

**Temas por modo con dos pares de color.** `main`/`dark` son la identidad (fondos, bordes); `strong`/`strongDark` son para superficies con texto blanco encima y cumplen 4,5:1.

## Presupuesto de rendimiento

Ver la tabla antes/después en [AUDIT_REPORT.md](AUDIT_REPORT.md).
