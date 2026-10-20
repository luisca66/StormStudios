# Utility Apps · contrato común

Sección nueva del sitio (decidida por Luis el 2026-10-20): **apps útiles que no forman parte de la
metodología** (Matemáticas Mentales y Memoria sí lo son y se quedan donde están). Cuatro apps, cada una
en su carpeta de `apps-src/`, con su fuente original copiada en `referencia/` (no se versiona).

| Carpeta | App | Origen | Encargo |
|---|---|---|---|
| `metronomo/` | Metrónomo Pro (temas Vórtice, Péndulo, Señal) | `metronomo.html` | Claude |
| `diapason/` | Diapasón: entrenador de notas en el mástil, vista plana y vista POV con selector | `diapason-guitarra*.html` | Astra (`gpt-6-astra`): rediseño POV |
| `etimologica/` | Etimológica: juego de etimología de palabras en español | app Android (Kotlin, Compose, Room) | Gemini 4 Argon |
| `afinador/` | Afinador cromático C2–C7 | app Android (`core-dsp` + Compose) y diseño `Afinador.html` | Sol (`gpt-6.1-sol`) |

## Reglas para todas

- **Proyecto Vite + TypeScript propio**, sin framework salvo que de verdad haga falta (si usas uno,
  Preact o React con versiones exactas). Copia la forma de `apps-src/oido-absoluto-guitarra-juego/`:
  `package.json` con `dev`, `build` (`tsc --noEmit && vite build`) y `deploy`
  (`npm run build && node scripts/copy-dist.mjs`), y `scripts/copy-dist.mjs` que copia `dist/` a
  `public/apps/<carpeta>/` del sitio (mismo código, cambia solo el nombre del destino).
- `vite.config.ts`: `base` = `"/apps/<carpeta>/"` al compilar y `"./"` en desarrollo; `server.host`
  `127.0.0.1`, `strictPort`. Puertos: metrónomo 5191, diapasón 5192, etimológica 5193, afinador 5194.
- **Idioma por `?lang=es|en`** (por defecto `es`). Todos los textos de interfaz en los dos idiomas.
  (Etimológica: el contenido de las palabras es español; la interfaz, bilingüe.)
- Vive dentro de un **iframe a pantalla completa** del sitio (`GameShell`): nada de cabeceras propias
  del sitio, nada de enlaces fuera. Funciona en escritorio y en teléfono (táctil), con teclado en
  escritorio.
- Red: solo Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) y los buckets R2 de Storm
  Studios que ya use la app original. Sin analítica, sin CDNs de scripts.
- Preferencias y progreso en `localStorage`, siempre dentro de `try/catch` (la app funciona sin él).
- Accesible: botones de verdad, foco visible, contraste suficiente, `prefers-reduced-motion`.
- **Solo escribe dentro de tu carpeta.** No toques el sitio Next, ni `public/`, ni otras carpetas.
- Si tu entorno no puede ejecutar `npm install` o compilar, escribe el código igual y dilo en
  `ENTREGA.md`: Claude instala, compila, prueba en el navegador e integra.
- Entrega: el proyecto completo y un `ENTREGA.md` corto (qué hiciste, cómo probarlo, qué falta,
  decisiones que difieren del original).
