# Privacidad

Memo Colores lo usan niñas y niños pequeños, así que la regla es: **no se recoge nada**.

## Qué se guarda

Solo los ajustes del adulto, en el `localStorage` del navegador de ese dispositivo, bajo la clave `memo-colores:settings:v1`:

| Dato              | Valores posibles                    |
| ----------------- | ----------------------------------- |
| Modo              | Colores, ¿Cuál falta?, ¿Dónde está? |
| Nivel             | Principiante, Intermedio, Avanzado  |
| Rondas por sesión | 3, 5 u 8                            |
| Voz               | sí / no                             |
| Sonidos           | sí / no                             |
| Tiempo para mirar | normal / más tiempo                 |

No se guarda nombre, edad, puntajes, historial de partidas ni ningún identificador.

## Qué sale del dispositivo

**Nada.** El juego no hace peticiones a otros sitios: la letra, los íconos y los sonidos (que se generan con un oscilador) están en el propio sitio. No hay analíticas, cookies, publicidad ni registros. Esto lo verifican las pruebas automáticas (`tests/e2e/smoke.spec.js` falla si aparece cualquier petición fuera del sitio, y la CSP del sitio lo bloquea).

Una excepción que depende del dispositivo y no del juego: la **voz**. El juego usa la síntesis de voz del navegador (Web Speech API) y **prefiere siempre una voz instalada en el dispositivo**. Si el dispositivo no tiene ninguna voz local en español, el navegador podría ofrecer una voz de red (por ejemplo, las voces "Google" de Chrome), que envía cada frase (por ejemplo "Roja y azul.") a un servidor del proveedor del navegador. Las frases no contienen datos personales. Para evitarlo del todo, apaga la voz en _Ajustes para adultos_ o instala una voz en español en el sistema.

## Cómo borrar los datos

Ajustes del navegador → Privacidad → Borrar datos del sitio (o, en el navegador, DevTools → Application → Storage → Clear site data). Si instalaste el juego en la pantalla de inicio, esto también borra la copia sin internet.

## Fuentes y licencias

La letra Fredoka (SIL OFL 1.1) y los íconos de Lucide (ISC) se sirven desde este mismo sitio.
