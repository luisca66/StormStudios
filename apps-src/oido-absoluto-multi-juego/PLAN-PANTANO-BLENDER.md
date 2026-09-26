# PLAN — Nivel 4 «El Pantano» con modelos de Blender

Escrito por Claude el 2026-09-26 con el método de `MANUAL-RENOVACION-3D.md` y el reparto de
`plantillas-blender/REPARTO-AGENTES.md`. Plantillas: `PLAN-PRADERA-BLENDER.md` y `PLAN-COSMOS-BLENDER.md`.
Pedido de Luis: **«El cocodrilito me fascina: conservar el estilo pero mejorado. El entorno es el que
necesita mucho trabajo.»** El resto de las decisiones de diseño las toma Claude (delegación de Luis).

> Nada se publica sin OK de Luis.

---

## 1. Diagnóstico (`buildSwamp` en `environment.ts`, `buildCrocodile` en `player.ts`, `gate.ts`)

| Elemento | Hoy | Mallas |
|---|---|---|
| Cocodrilo | Cajas verdes: cuerpo, panza, 5 escamas, cabeza (cráneo, hocico, mandíbula), ojos amarillos que parpadean, cola de 4 segmentos, 4 patas con 3 garras | ~40 |
| Luz y niebla | Hemisférica 0.22 y sol verde 0.38, niebla verde oscura densa: **casi no se ve nada** | — |
| Manglares | 120 árboles: tronco + 2–3 raíces + 2 copas, **un material por copa** | ~600 |
| Arbustos | ~70 grupos de 2–4 esferas | ~200 |
| Juncos | 80 cilindros + espigas | ~120 |
| Nenúfares | 40 discos + flores | ~55 |
| Rocas con musgo | 20 × 2 esferas | 40 |
| Árboles del borde | 56 cilindros | 56 |
| Arañas | 14 × ~22 mallas, casi negras | ~300 |
| Agua | 15 discos translúcidos | 15 |
| Portal | 4 aros verdes + disco + 8 lianas; el «arco» de piedra es **una caja plana** | 14 |

**Total ≈ 1 400 mallas**; la vista inicial pide **354 draw calls** (medido con `renderer.info`) aunque la
niebla tapa casi todo.

## 2. Dirección visual — decidida por Claude (delegación de Luis, 2026-09-26)

**«Pantano encantado al anochecer: agua que brilla, luciérnagas y hongos luminosos.»** Luis pidió
(2026-09-26) **conservar lo oscuro, turbio y la humedad**: eso es su carácter. La niebla verde densa y la
penumbra se quedan; lo que cambia son los modelos y los **puntos de luz propia** dentro de la niebla
(hongos, luciérnagas, fuego fatuo, nenúfares, agua que brilla). La luz general sube apenas, lo justo para
que el cocodrilo y las formas cercanas se lean. Caricatura amable, formas redondas, como los otros niveles.

Qué lo distingue: **La Pradera** es mediodía verde saturado y seco; **El Pantano** es penumbra húmeda,
verde musgo, con destellos turquesa, lima y cálidos. Nada de terror: las arañas, si quedan, son simpáticas.

| Uso | Hex |
|---|---|
| Cielo / niebla | la de hoy (`0.07, 0.14, 0.05`, densidad 0.013): se conserva; a lo sumo se afina tras ver los modelos |
| Hemisférica | la de hoy con un leve aumento (0.22 → ~0.35) para que el cocodrilo se lea |
| Sol | verde tenue de hoy (0.38) |
| Barro | `4a4a2c` → `34361f` |
| Agua | `2f8f7a` con brillo `5ff0d0` |
| Vegetación | musgo `3f7a3a` → `6fae52`; corteza de manglar `6b5a3e` → `4a3b28` |
| Acentos luminosos | luciérnaga `d8ff5a`, hongo turquesa `5ff0d0`, hongo magenta `ff6fd0`, nenúfar rosa `ff9ec4` |
| Cocodrilo (identidad, se conserva) | piel `2d5a27`, lomo `21401a`, panza `b8c78c`, ojos `ffe64d` que brillan |

**Cocodrilo mejorado, misma esencia:** mismas proporciones y pivotes (cuerpo largo, cabeza con hocico
largo, ojos amarillos saltones que parpadean, cola de 4 segmentos, 4 patas con garras), pero con formas
redondeadas y biseladas, escamas de lomo en fila, dientecitos, fosas nasales, cejas y manchas más claras.
**Partes rígidas, sin esqueleto**: `player.ts` ya anima patas, cola, cabeza y parpadeo, y así se conserva
el movimiento que a Luis le gusta.

## 3. Piezas y reparto

| # | Pieza | Carpeta | Quién | Tipo | Partes que mueve el juego |
|---|---|---|---|---|---|
| 1 | **Cocodrilo** | `cocodrilo/` | **Claude** | protagonista | `body`, `head`, `eye` ×2 (parpadeo), `tail` ×4 (encadenados), `leg` ×4 |
| 2 | **Portal del pantano** | `portal-pantano/` | **Astra** | objetivo | `frame` (arco), `ring` ×n (giran), `core` (late) |
| 3 | Manglares (3 variantes + árbol de borde alto y ancho) | `manglares/` | Gemini | instanciado | ninguna |
| 4 | Rocas con musgo y tronco caído | `rocas-pantano/` | Gemini | instanciado | ninguna |
| 5 | Plantas de agua (nenúfar, nenúfar con flor, juncos, helecho, arbusto) | `plantas-pantano/` | Gemini | instanciado | ninguna |
| 6 | Hongos luminosos (3 variantes) | `hongos/` | Gemini | instanciado | ninguna (emisión en el material) |
| — | Agua con brillo, niebla baja, luciérnagas instanciadas, luz | — | Claude, código | — | efectos |
| — | Arañas | — | después | — | se decide al ver el nivel nuevo |

**Límites del nivel (pedido de Luis: «se ven muy falsos»).** Hoy son 56 cilindros pelados en fila. Se
cambian por un **borde de selva cerrada**: 2–3 filas escalonadas de manglares grandes (la variante de
borde, escalas y giros al azar), arbustos y raíces entre ellos y copas que se tocan, todo instanciado y
metido en la niebla, para que no se vea una línea ni el final del mundo. La colisión sigue siendo la de hoy.

## 4. Oleadas

- **Ola 1 (en paralelo):** Astra → portal · Claude → cocodrilo · Claude prueba las recetas de Gemini.
- **Ola 2:** Gemini → manglares → rocas → plantas → hongos (cola) · Claude → luz, agua, niebla y
  luciérnagas en código.
- **Ola 3 (Claude):** integrar, medir draw calls, probar jugando; registro al día.

## 5. Medidas que los modelos deben respetar (del código)

| Pieza | Medida | Fuente |
|---|---|---|
| Arena | 280 × 280 m (`HALF` 140); el cocodrilo nace en el centro | `buildSwamp` |
| Cocodrilo | modelo mira a −Z y el juego lo gira π; cuerpo 1.2 × 0.6 × 3.0 con centro en (0, 0.5, 0); cabeza con pivote en (0, 0.6, −1.5); ojos en (±0.45, 0.92, −1.65); cola: segmentos de 0.8/0.7/0.6/0.5 m desde z = 1.5, y = 0.5; patas con pivote en (±0.7, 0.8, ±1.0), largo 0.84 hasta el suelo | `buildCrocodile` |
| Portal | centro en (120, 3.5, 120) mirando al centro del nivel; aro exterior radio 3.6 m; se activa a 5 m | `gate.ts` |
| Manglares | alto 4–11 m, tronco de radio 0.2–0.5 m; colisión radio ~0.5 | `spawnMangroves` |
| Arbustos | montículos de 2–4 m de radio; colisión radio 3 | `spawnSwampBushes` |

## 6. Tablero (solo Claude lo edita)

| Pieza | Carpeta | Dueño | Estado | Ronda |
|---|---|---|---|---|
| Luz, agua, niebla, luciérnagas | — | Claude | ⏳ | — |
| Cocodrilo | `cocodrilo/` | Claude | 📦 modelado (14 partes, 5 056 tri, mismos pivotes); falta integrar | v1 |
| Portal | `portal-pantano/` | Astra | 📦 script entregado; falta que Claude lo ejecute y revise | v1 |
| Manglares | `manglares/` | Gemini | 📝 receta en prueba (`_recetas-pantano/modelo-manglares.txt`) | — |
| Rocas y tronco | `rocas-pantano/` | Gemini | ⏳ | — |
| Plantas de agua | `plantas-pantano/` | Gemini | ⏳ | — |
| Hongos luminosos | `hongos/` | Gemini | ⏳ | — |
