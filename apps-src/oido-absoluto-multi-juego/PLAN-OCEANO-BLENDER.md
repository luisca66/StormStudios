# PLAN — Rediseño del Nivel 2 «El Océano» con modelos de Blender

> Escrito por Claude (integrador) el 2026-09-15 a pedido de Luis. Juego: `oido-absoluto-multi-juego`
> (Walking AP Multi, puerto 5173, launch `oido-multi`). Flujo: `PLAN-3D-BLENDER.md` §6.
> Nada se publica sin OK de Luis.

## 1. Diagnóstico (visto en el juego, 2026-09-15)

| Problema | Dónde | Quién lo arregla |
|---|---|---|
| El pez aparece **dentro del domo** de Atlántida: spawn en `(0,-20,0)` y el colisionador del domo llega hasta y≈-5 | `player.ts resetPosition` + `environment.ts buildAtlantisCastle` | Claude (integración) |
| ~~Pez de esferas y cilindros~~ ✅ resuelto: modelo de Blender cargado desde JSON | `player.ts buildFish` + `blender-fish.ts` | hecho |
| ~~Objetivo de nota = «piñata» de conos~~ ✅ resuelto: almeja con perla, con faro de luz del color de la nota | `renderer.ts` + `blender-clam.ts` | hecho |
| Atlántida con cilindros de 8 lados; es el hito central y se ve de primitivas | `environment.ts buildAtlantisCastle` | **modelador** → pieza 3 |
| Compuerta = disco metálico plano en el suelo; la cinemática de desbloqueo no luce | `gate.ts` nivel 2 | **modelador** → pieza 4 |
| Ballena = esfera estirada con cajas de cola | `environment.ts spawnWhale` | **modelador** → pieza 5 |
| Corales = esferas aplastadas; rocas = esferas; algas = cilindros rectos | `environment.ts buildOcean` | **modelador** → pieza 6 (kit) |
| Cangrejos y calamares de primitivas (los calamares se cambian por tortugas) | `spawnCrab`, `spawnSquid` | **modelador** → piezas 7–8 |
| ~~Pecera de vidrio; fondo plano; luz sin cáusticas~~ ✅ resuelto: hondonada de arena, textura de arena y agua soleada con cáusticas | `buildOcean` | hecho |

## 2. Dirección

**Arrecife tropical soleado con una Atlántida hundida en el centro.** Batisfera ya ocupa el mar
profundo y oscuro con criaturas realistas; este nivel debe sentirse distinto: agua turquesa
iluminada desde arriba, cáusticas en la arena, corales de color, estilo **caricatura amable**
(coherente con Glub, el cocodrilo y el unicornio del juego). Renovar modelos **y**
entorno/iluminación (resuelve el «por definir» de `PLAN-3D-BLENDER.md` para este juego).
**Aprobado por Luis el 2026-09-15**, con tortugas marinas en lugar de calamares.

Paleta del nivel: agua `#1f7a99` → profundo `#0f4a66`; arena `#d9c28f`; luz de sol `#fff3d6`;
acentos de coral `#ff6f61`, `#ffb347`, `#c86bfa`, `#3fd2c7`; oro atlante `#d9a441`.

## 3. Piezas para el modelador de Blender (en orden)

Cada una tiene o tendrá `art/blender/<carpeta>/BRIEF.md`. Una a la vez; Luis aprueba renders antes
de pasar a la siguiente. Quién modela lo elige Luis en Codex: el pez lo hizo **Sol**; la almeja la hace **Astra**.

| # | Pieza | Carpeta | Estado | Contrato con el juego (resumen) |
|---|---|---|---|---|
| 1 | **Pez protagonista** | `pez/` | ✅ integrado (2026-09-15): modelado por **Sol** (v1 + ronda 1); Claude corrigió pedúnculo, párpados e iris | ≈2.7 u, frente +Z, cámara 5.5 u detrás y 1.8 u arriba; partes `body`, `tail`, `fin` ×2, `dorsal` |
| 2 | Almeja con perla (objetivo de nota) | `almeja/` | ✅ integrada (2026-09-15): Astra v1 sin rondas; espera abierta y se cierra al tocarla | se ve a 80–130 u; gira en Y, rebota ×1.4 al tocarla; `pearl` teñida con el color de la nota; valva superior abre |
| 3 | Atlántida hundida (hito central) | `atlantida/` | ⏳ | centro `(0,-50,0)`, radio ≈60 u, alto ≈45 u; colisionadores simples en `meta`; ≤ 40 k tri |
| 4 | Portal atlante (compuerta) | `portal/` | ⏳ | `(110,-50,110)`, radio de disparo 5 u, abre en 0.7 s; cinemática a 15 u; partes marco + hojas del iris + `glow` |
| 5 | Ballena jorobada | `ballena/` | ⏳ | ≈40 u de largo, órbita r=80 u; `tail` con batido vertical, `flipper` ×2 |
| 6 | Kit de arrecife instanciado | `arrecife/` | ⏳ | 4 corales, 3 rocas, alga por segmentos (se mece), anémona; ≤ 1.5 k tri por variante |
| 7 | Cangrejo | `cangrejo/` | ⏳ | ×4 en la arena, ≈7 u; `leg` segment 0–5, `claw` ×2 |
| 8 | Tortuga marina (sustituye los 8 calamares) | `tortuga/` | ⏳ elegida por Luis | ×3–4 nadando en órbitas amplias (r 35–85 u, y −30…0); ≈3 u; `flipper` ×4 con remada, `head`; obstáculo esférico móvil |

## 4. Trabajo de Claude en paralelo (sin tokens de Astra)

1. ✅ Spawn fuera de Atlántida (2026-09-15): `(0,-12,-105)` mirando al palacio; cámara colocada detrás
   desde el primer cuadro. Falta reajustar colisionadores cuando llegue la pieza 3.
2. ✅ Pecera de vidrio eliminada (2026-09-15): el fondo es una hondonada de arena que sube en los bordes
   (`getFloorHeight`); pez y notas no bajan de ella. Pendiente: poblar el borde con el kit de arrecife
   (pieza 6).
3. ✅ Iluminación (2026-09-15): sol cálido `#fff3d6` casi vertical, hemisférica cielo turquesa /
   rebote de arena, niebla turquesa `#2c86a3`, dos capas de cáusticas que se cruzan sobre la arena,
   9 rayos de sol y la superficie del agua vista desde abajo. 60 fps en la PC de Luis; falta teléfono.
4. ✅ Arena (2026-09-15): textura procedural con ondas y grano, manchas por vértice y dunas suaves.
   Con la luz nueva ya se lee como arena cálida.
5. Inspector `dev/` y atajo `?dev=1` para ver cada pieza sin jugar.
6. Medir FPS en escritorio y teléfono con todo el nivel cargado antes de publicar.
