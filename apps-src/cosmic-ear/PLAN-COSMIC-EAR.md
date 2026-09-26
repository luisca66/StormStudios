# PLAN — Cosmic Ear: rediseño completo

Decidido por Luis el 2026-09-26: después de La Pradera, **Cosmic Ear se rediseña completo**. Escrito por
Claude el mismo día. Reparto y flujo: `plantillas-blender/REPARTO-AGENTES.md` (modo automático).
Registro de avance: `REGISTRO-RENOVACION-3D.md` (raíz).

## 1. Qué es hoy

App «Desglose auditivo»: el alumno pilotea una nave entre planetas; al hacer clic en uno suena un
**acorde** (el planeta y sus lunas son las notas) y debe **cantar cada nota** con el micrófono (afinador
propio `PitchTrackerV2`). Opciones: instrumento, número de lunas (1–6 = notas extra), duración.

| Punto | Hoy |
|---|---|
| Código | `src/main.jsx`, 1 740 líneas: React (HUD y menús) + Three (escena) + audio + afinador juntos |
| Three | ✅ **0.160.1 desde 2026-09-26** (antes r128), con `useLegacyLights` y color lineal para verse igual |
| Arte | ~70 mallas de primitivas: nave de cajas y conos, planetas y lunas esferas, estrellas en `Points` |
| Cámara | tercera persona detrás de la nave (0, 3, 10) |

## 2. Fases

| Fase | Qué | Quién | Estado |
|---|---|---|---|
| 1a | Three r128 → 0.160 | Claude | ✅ 2026-09-26 (carga sin errores; falta probar una misión con micrófono en la PC de Luis) |
| 1b | Partir `main.jsx` en módulos: `audio/` (samples, música), `pitch/` (afinador), `scene/` (nave, planetas, cielo), `ui/` (menús y HUD React), `game/` (estado y puntaje). Sin cambiar comportamiento | Claude | ⏳ siguiente |
| 1c | Conectar `shared-3d` (`dedupe: ["three"]` en `vite.config.js`) y quitar los dos modos «legacy» al reiluminar | Claude | ⏳ |
| 2 | Dirección visual (§3), luz y cielo nuevos | Claude | ⏳ propuesta abajo |
| 3 | Modelos (§4) en modo automático | Claude, Astra, Gemini | ⏳ |
| 4 | Integración, prueba con micrófono, FPS, publicar | Claude + Luis | ⏳ |

## 3. Dirección visual — **Propuesta** (Claude decide si Luis no la cambia)

**«Sistema solar de juguete musical».** Planetas como instrumentos-mundo: cada uno con anillos que vibran
cuando suena su acorde y lunas que brillan del color de su nota al cantarla (los 12 colores de
`NOTE_COLORS` ya existen). Nebulosa violeta y dorada, estrellas cálidas.

Qué lo distingue: **El Cometa** es hielo, cian y soledad; **El Cosmos** (Walking AP Multi, nivel 3) será
otro espacio. Cosmic Ear es **cálido, colorido y lleno de vida**: violeta `#2a1650` → índigo `#120a2e` de
fondo, acentos dorado `#ffcf5a`, magenta `#ff6fb5`, turquesa `#3fd2c7`.

## 4. Piezas y reparto (propuesta)

| Pieza | Quién | Por qué |
|---|---|---|
| Nave del jugador (partes: casco, cabina, motor con brillo, alerones que se inclinan al alabear) | **Claude** | Protagonista en pantalla todo el tiempo: tiene que ser hermosa |
| Kit de 5 planetas-instrumento (piano, cello, corno, coro, fagot: forma y anillos inspirados en cada uno) | **Astra** | Complejo y creativo, en paralelo a la nave |
| Kit de lunas (3 formas, la nota las tiñe) | Gemini | Simple, receta |
| Asteroides y polvo decorativo (kit instanciado) | Gemini | Simple, receta |
| Estación/baliza de inicio | Gemini | Simple, receta |
| Nebulosa, estrellas, estela del motor | Claude, código | Son efectos |

## 5. Riesgos

- El afinador y el audio no se tocan en la fase 1b: solo se mueven de archivo. Probar cantando.
- React + Three en el mismo componente: la escena pasa a una clase `CosmicScene` que React crea y destruye.
