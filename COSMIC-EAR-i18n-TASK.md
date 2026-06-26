# Tarea: traducir Cosmic Ear al inglés (i18n ES/EN)

**Para:** agente de código (Codex). Esto es autocontenido; ejecútalo de principio a fin.

## Contexto
"Cosmic Ear" es un juego 3D (Three.js + React vía Babel-en-navegador) que vive como **HTML autónomo** en
`public/apps/cosmic-ear/` y se embebe por iframe en la página Next `app/[locale]/apps/cosmic-ear/jugar/page.tsx`.
**No tiene build** — editas el `.jsx` directo y se sirve tal cual. Toda la UI está **hardcodeada en español** en
`public/apps/cosmic-ear/js/app.jsx` (~1450 líneas, un solo componente). Hay que hacerlo bilingüe ES/EN.

El idioma debe venir por querystring `?lang=es|en` (el sitio Next ya maneja locale `es`/`en`).

## Gotchas (no romper esto)
- El JSX se transpila en el navegador con **Babel 7 classic runtime** (usa `React.createElement` global). Mantén JSX válido.
- Arriba del archivo ya existe el preámbulo: `const { useState, useEffect, useRef } = React; const { createRoot } = ReactDOM;`
- **NO** traduzcas los nombres de `MUSIC_TRACKS` (Space Ambient, Cosmic Song, etc.) ni el título "COSMIC EAR".
- **NO** toques la lógica de juego, audio, ni las URLs de samples/música (R2). Solo texto visible al usuario.
- Es entrenamiento auditivo puro: NO reintroducir el afinador visual ni nombres de notas — los slots dicen "Nota N" / "Note N".

## Paso 1 — Infra i18n en `public/apps/cosmic-ear/js/app.jsx`
Justo **después** del preámbulo de React (las líneas `const { useState... } = React;` / `const { createRoot } = ReactDOM;`),
agrega:

```js
const LANG = new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'es';
const TXT = {
  es: { /* ...ver glosario abajo... */ },
  en: { /* ... */ },
};
const t = TXT[LANG];
```

Luego reemplaza cada texto español visible por `t.<clave>`. Para textos con interpolación usa funciones, p.ej.
`points: (n) => \`+\${n} pts\`` y úsalo como `t.points(n)`.

## Paso 2 — Encontrar TODOS los strings
No te fíes solo del glosario. Busca exhaustivamente texto español visible:

```
grep -noE "[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+|¡[^<]+!|\.\.\." public/apps/cosmic-ear/js/app.jsx
```

Revisa especialmente: pantalla de config/intro, HUD (panel del planeta, velocidad, controles), el panel del
desafío (fases, tiempo, estados), y la **pantalla de Game Over** (al final del archivo, ~líneas 1415+, que incluye
puntaje, botón de reiniciar, etc.). Traduce también cualquier `setMicError("...")` u otros mensajes en español.

## Paso 3 — Glosario ES → EN (claves conocidas; añade las que falten)
| ES (actual en el código) | EN |
|---|---|
| ENTRENAMIENTO AUDITIVO ESPACIAL | SPACE EAR TRAINING |
| CARGANDO SONIDOS... | LOADING SOUNDS... |
| Audio listo ✓ | Audio ready ✓ |
| ACTIVAR MICRÓFONO | ENABLE MICROPHONE |
| Micrófono activo ✓ | Microphone active ✓ |
| Número de Lunas | Number of Moons |
| Duración de la Misión | Mission Duration |
| minutos | minutes |
| Música de Fondo | Background Music |
| INICIAR MISIÓN | START MISSION |
| ACTIVA EL MICRÓFONO | ENABLE THE MICROPHONE |
| Desarrollado por | Developed by |
| Planeta | Planet |
| Velocidad | Speed |
| Dirección | Direction |
| Roll | Roll |
| Acelerar | Accelerate |
| Cantar | Sing |
| ESPACIO (tecla) | SPACE |
| 🎯 Haz click en el planeta | 🎯 Click on the planet |
| Nota (label de slot) / Nota {n} | Note / Note {n} |
| 🎵 Escucha... | 🎵 Listen... |
| 🎉 ¡Completado! | 🎉 Completed! |
| 🎤 ¡Canta! | 🎤 Sing! |
| Tiempo | Time |
| 🎵 Reproduciendo... | 🎵 Playing... |
| 🎤 Escuchando... | 🎤 Listening... |
| ✨ ¡Mantén! | ✨ Hold! |
| pts | pts |
| (Game Over: traducir título, "puntos/score", botón reiniciar/volver, etc.) | (translate as found) |

Las unidades de distancia ("u") y "pts" se quedan igual.

## Paso 4 — Que el wrapper pase el idioma
En `app/[locale]/apps/cosmic-ear/jugar/page.tsx`, cambia el `src` del iframe:

```tsx
// antes:
src="/apps/cosmic-ear/index.html"
// después:
src={`/apps/cosmic-ear/index.html?lang=${locale}`}
```

## Paso 5 — Verificar
1. Sintaxis: que `Babel.transform(<contenido de app.jsx>, { presets:['react'] })` no lance (o carga la página y revisa consola).
2. Levanta el dev server (`npm run dev`) y abre:
   - `http://localhost:3000/es/apps/cosmic-ear/jugar` → todo en español, juego monta (config con "Número de Lunas").
   - `http://localhost:3000/en/apps/cosmic-ear/jugar` → todo en inglés ("Number of Moons", "START MISSION", etc.).
   - Nota: el render WebGL nunca queda "idle"; verifica por DOM/consola, no por screenshot.
3. Que NO queden textos en español en la versión EN (re-corre el grep del Paso 2 mentalmente sobre lo traducido).

## Paso 6 — Commit
Flujo del repo: commit y push **directo a `main`** (deploya en Vercel). Mensaje sugerido:
`feat(apps): Cosmic Ear bilingüe (i18n ES/EN)`. NO incluyas `.claude/settings.local.json`.

## Archivos a tocar (resumen)
- `public/apps/cosmic-ear/js/app.jsx` — infra i18n + reemplazo de strings (el grueso).
- `app/[locale]/apps/cosmic-ear/jugar/page.tsx` — pasar `?lang=${locale}` al iframe.
