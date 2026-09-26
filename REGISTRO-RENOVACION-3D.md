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

## Terminado

### 2026-09-26

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
