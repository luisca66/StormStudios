# Registro de la renovación 3D

Bitácora corta de lo **terminado**, para retomar sin perder el hilo aunque se acaben los tokens.
Lo más reciente arriba. Detalle de cada nivel en su plan (`apps-src/<juego>/PLAN-*.md`); método en
`MANUAL-RENOVACION-3D.md`; reparto de agentes en `plantillas-blender/REPARTO-AGENTES.md`.

## Cómo retomar

1. Leer la última entrada de este registro y la sección «En curso».
2. Lanzar agentes con `scripts/agentes/lanzar-agente.ps1` (Astra = `codex exec`, aislada: Claude ejecuta su
   script y la reanuda con `-Reanudar -Mensaje`; Gemini = Gemini CLI con la clave de Luis, trabaja solo).
3. Registros de los agentes: `%LOCALAPPDATA%\StormStudios\agentes\`.

## En curso

- **Cosmic Ear — rediseño completo** (decidido por Luis). Plan: `apps-src/cosmic-ear/PLAN-COSMIC-EAR.md`.
  Todas las piezas integradas: Three 0.160 + módulos, luz nueva, nave (Claude), planetas (Astra), lunas y
  asteroides (Gemini), estación de salida (Claude).
  ✅ **Publicado el 2026-09-26** tras la misión real de Luis cantando en Chrome («funciona perfecto»).
  Cosmic Ear ya tiene `npm run deploy` (build + `scripts/copy-dist.mjs` a `public/apps/cosmic-ear`, como los demás).
  **Siguiente:**
  1. ✅ Escape cierra el afinador y la nave se queda quieta mientras está abierto (commit `5d8ecff`,
     publicado el 2026-09-26).
  2. ✅ Fase 1b paso 2: escena en `scene/cosmic-scene.js`, audio en `audio/`; `App` de 966 a 550 líneas.
     «Nueva misión» (fin del tiempo) ahora apaga motor y música como «Salir». Publicado el 2026-09-26.
  - **Con esto el plan de Cosmic Ear queda completo.**
  - Ojo al probar en el panel del navegador de Claude: si está oculto, `requestAnimationFrame` se pausa y el
    juego parece congelado; una captura de pantalla lo despierta.
  - Para probar sin cantar: `.claude/launch.json` tiene `cosmic-ear-alt` (puerto 5186) por si otro chat
    ocupa el 5180; micrófono simulado inyectando un `getUserMedia` silencioso antes de «Activar micrófono».

## Terminado

### 2026-09-26

- ✅ **Cosmic Ear: estación de salida y asteroides** integrados. Estación (Claude, 6 508 tri, 48 KB): plataforma-trompo violeta bajo la nave, con faroles magenta y luces turquesa que laten, flechas de salida y anillo dorado que gira (`src/scene/station.js`). Asteroides (Gemini vía agy, receta probada antes por Claude; 1 280 tri, 36 KB, sin diferencias): cinturones que giran en uno de cada tres planetas más 90 rocas sueltas, instanciados (`src/scene/asteroids.js`). Misión probada con micrófono simulado: acorde, «¡Canta!» y escucha sin errores; 61 FPS; `npm run build` bien. Sin publicar (falta OK de Luis).

- ✅ **Cosmic Ear: planetas y lunas nuevos** integrados: 5 planetas-instrumento de Astra (piano, cello, corno, coro, fagot; el instrumento del planeta decide su forma, con «Aleatorio» se reparte por id) con anillo que gira, y lunas de Gemini teñidas con el color de su nota. Sin publicar (falta OK de Luis).

- ✅ **Gemini automático y sin costo por token FUNCIONA**: `agy` hizo el kit de lunas de Cosmic Ear de punta a punta (2 640 tri, sin diferencias). Claves: reglas regex en Windows (`command(regex:...modelar\.cmd .*)` y `unsandboxed(...)`), envoltorio `C:\Users\Luis\blender-bpy\modelar.cmd`, telemetría desactivada. Luis no tiene que abrir nada.
- ✅ **Cosmic Ear, fase 2 (luz)**: fuera los modos «legacy»; luz cálida (hemisférica dorado/violeta, sol cálido, contraluz magenta), nebulosa índigo-violeta con dorado y magenta, estrellas cálidas.

- ✅ **Cosmic Ear: nave nueva** (Claude, 3 372 tri) integrada con `shared-3d` (dedupe de Three); la nave de primitivas queda de reserva. Se ve oscura hasta quitar los modos «legacy» de color (fase 2). En curso: planetas (Astra) y lunas (Gemini).

- ✅ **Cosmic Ear, fase 1b paso 1**: `main.jsx` partido en 8 módulos (textos, config, iconos, afinador, cielo, nave, efectos, planetas); `App` queda sola (966 líneas). Misión probada con micrófono simulado: sin errores. Siguiente: paso 2 (escena y audio fuera de `App`).

- 🔧 **Gemini ahora va por Antigravity CLI (`agy` 1.2.11)** con la cuenta de Luis (plan Google AI Pro, Gemini 3.8 Flash High): sin costo por token. Lanzador: `-Agente gemini -Carpeta plantillas-blender -Mensaje plantillas-blender\PROMPT-COLA-GEMINI.txt`; trabaja la cola `COLA-GEMINI.md`. Hecho: permisos en `~/.gemini/antigravity-cli/settings.json` (proyecto de confianza; leer proyecto y blender-bpy; escribir solo en `apps-src`; comando de Blender) y hook de telemetría de Google Cloud desactivado (rompía todas las herramientas; respaldo `hooks.json.bak`). **Pendiente:** el comando de Blender aún se niega (la regla no coincidió; probablemente antepuso `cd`); el prompt ya pide la ruta completa sin `cd`. Próxima sesión: relanzar y, si vuelve a negarse, leer el log en `~/.gemini/antigravity-cli/log/`. Gemini ya dejó `apps-src/cosmic-ear/art/blender/lunas/modelar-lunas.py` sin ejecutar.

- ⚠️ **Gemini por API resultó de pago** (~35 pesos). El lanzador ya no la usa sin `-PagarApiGemini`. Nuevo reparto: lo simple, Claude directo; lo complejo, Astra; Gemini solo por Antigravity (semiautomático). Ver `plantillas-blender/REPARTO-AGENTES.md`.
- ✅ **Cosmic Ear, fase 1a**: Three r128 → 0.160.1 (modos de luz y color «legacy» para verse igual hasta
  reiluminar). Carga sin errores; falta probar una misión con micrófono. Plan con fases, dirección
  visual y reparto: `apps-src/cosmic-ear/PLAN-COSMIC-EAR.md`. **Siguiente: fase 1b**, partir `main.jsx` en módulos.
- ✅ **Publicados** Walking AP Multi (La Pradera) y Batisfera completa (`npm run deploy` de los dos, commit `2ab35d7`).
- ✅ **La Pradera** (nivel 1 de Walking AP Multi) completa: Glub con ojos que parpadean (Claude), castillo
  (Astra), rocas, setos, muralla, portón, cubo de nota, árboles, flores y pasto (Gemini), nubes del kit del
  nivel 5 y mariposas nuevas (código). Vista inicial de ~630 a **33 draw calls**. Pendientes: FPS en la PC de
  Luis, ver la cara de Glub (la cámara va detrás), AO fuerte en muros del castillo a la sombra.
- ✅ **Batisfera completa**: chimeneas hidrotermales y pináculos de Astra en la zona 5 (última pieza del entorno).
- ✅ **Modo automático de agentes**: lanzador, política de Gemini (solo puede ejecutar Blender), instrucciones
  y plantillas de brief para Astra (corto y creativo) y Gemini (receta detallada y probada).
- ✅ `shared-3d` (cargador GLB común, meshopt: la mitad de peso) fusionado a `main` y usado por primera vez en
  un juego (La Pradera).
