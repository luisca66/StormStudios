# PLAN — Nivel 3 «El Cosmos» con modelos de Blender

Escrito por Claude el 2026-09-26, con el método de `MANUAL-RENOVACION-3D.md` y el reparto de
`plantillas-blender/REPARTO-AGENTES.md`. Plantilla: `PLAN-PRADERA-BLENDER.md`.
Luis delegó en Claude las decisiones de diseño («la pedagogía ya está; lo que tú decidas probablemente es
mejor»). Si algo no le gusta al jugar, se cambia.

> Nada se publica sin OK de Luis.

---

## 1. Diagnóstico (código de `environment.ts` `buildCosmos`, `player.ts`, `gate.ts`, `renderer.ts`)

| Elemento | Hoy | Mallas (≈ draw calls) |
|---|---|---|
| Nave del jugador | Primitivas oscuras (casco `262638`, alas cilíndricas aplastadas, 2 motores, cabina de esfera) | 9 |
| Luz | Hemisférica violeta 0.45 y sol lila 0.5: todo se ve casi negro | — |
| Estrellas | 600 `Points` | 1 |
| Nebulosas | 5 grupos de 3–5 esferas translúcidas | ~20 |
| Planetas | 3 esferas lisas (marte, neptuno, júpiter), 2 con toro plano | 5 |
| Asteroides | 40 dodecaedros sueltos casi negros, giran; son obstáculos | 40 |
| Objetivo de nota | Cristal: esfera + 6 conos + anillo + luz propia | 8 |
| Portal (agujero de gusano) | 5 toros de colores + disco + haz vertical + luz, en (280, 0, 280) | 7 |
| Estrellas fugaces | Cilindros que nacen y mueren | variable |

**Total ≈ 90 draw calls**, poco para el nivel; el problema no es el rendimiento sino que **se ve oscuro y
genérico**, y la nave del jugador es la más pobre de los cinco personajes.

## 2. Dirección visual — decidida por Claude (delegación de Luis, 2026-09-26)

**«Cosmos de libro de cuentos: una noche azul profunda llena de maravillas.»** Caricatura amable como
el resto de Walking AP Multi: planetas redondos con personalidad, anillos gruesos, un cohete de juguete.

Qué lo distingue:
- **Cosmic Ear** es violeta-dorado, cálido, «sistema solar de juguete musical».
- **El Cometa** es hielo cian, soledad y velocidad.
- **El Cosmos** es **azul medianoche con acentos turquesa y coral**, luminoso (se ve todo, nada negro),
  con galaxias espirales y planetas de colores de caramelo. Sensación de explorar, no de peligro.

| Uso | Hex |
|---|---|
| Fondo (cielo) | `0b1438`, nebulosas que suben a `1d2e6e` |
| Hemisférica | cielo `9cc4ff`, suelo `2a1f5c`, intensidad 1.3 |
| Estrella principal (sol) | `eaf4ff`, 1.8 |
| Contraluz | coral `ff9e7a`, 0.6 |
| Acentos | turquesa `3fe0d0`, coral `ff7a6b`, amarillo estrella `ffe66d`, rosa aurora `ff8fd8`, lavanda `b8a4ff` |
| Roca | azul pizarra `3a4a78` → `8a9ccf` |

## 3. Piezas y reparto

| # | Pieza | Carpeta | Quién | Tipo | Partes que mueve el juego |
|---|---|---|---|---|---|
| 1 | **Cohete del jugador** | `cohete/` | **Claude** | protagonista | `body` (todo lo fijo), `wing` ×2 (se inclinan al girar), `flame` (crece con la velocidad) |
| 2 | **Portal (agujero de gusano)** | `portal-cosmos/` | **Astra** | hito | `ring` ×n (giran), `core` (late) |
| 3 | Asteroides (3 variantes) | `asteroides-cosmos/` | Gemini | instanciado | ninguna (obstáculos: el juego guarda radio) |
| 4 | Planetas de fondo (3 con personalidad) | `planetas-cosmos/` | Gemini | hito | `ring` (gira) |
| 5 | Cristal de nota | `cristal-nota/` | Gemini | objetivo | `crystal` (se tiñe con la nota), `ring` (gira) |
| — | Estrellas, nebulosas, galaxias espirales, estrellas fugaces | — | Claude, código | — | efectos |
| — | Luz y fondo | — | Claude, código | — | paleta de §2; copiar a `shared-3d/inspector/presets.ts` |

## 4. Oleadas

- **Ola 0 (Claude):** luz y fondo nuevos en el juego y en `presets.ts`; nebulosas y galaxias en código;
  recetas de Gemini probadas antes de encargarlas.
- **Ola 1 (en paralelo):** Claude → cohete · Astra → portal · Gemini → asteroides → planetas → cristal (cola).
- **Ola 2 (Claude):** integrar lo que llega, medir draw calls, prueba jugando; registro al día.

## 5. Medidas que los modelos deben respetar (del código)

| Pieza | Medida | Fuente |
|---|---|---|
| Arena | 700 m (`arenaSize`); profundidad −250…250 | `state.ts`, `player.ts` |
| Nave | frente **+Z**; largo ≈ 3.6 m, envergadura ≈ 4.2 m; alas pivotan en x = ±1.4 | `buildSpaceship` |
| Motor | brillo en z = −2.0, luz en z = −1.5 | `buildSpaceship` |
| Asteroides | radio 2–8.5 m (el juego escala); colisión por radio | `buildCosmos` |
| Planetas | radio 14–20 m, a 250–330 m del centro | `buildCosmos` |
| Cristal | ~5 m de diámetro con puntas (escala 2.5 en el juego) | `renderer.ts` |
| Portal | anillo exterior de radio 16 m, en (280, 0, 280), acostado (normal +Y); activa a 8 m | `gate.ts` |

## 6. Tablero (solo Claude lo edita)

Estados: `⏳ en cola` → `📝 brief listo` → `🔨 en curso` → `📦 entregada` → `🎮 integrada` → `🚀 publicada`.

| Pieza | Carpeta | Dueño | Estado | Ronda |
|---|---|---|---|---|
| Luz, fondo, nebulosas, galaxias | — | Claude | 🎮 luz azul medianoche, nebulosas de sprites suaves, 3 galaxias espirales; `presets.ts` al día | — |
| Cohete | `cohete/` | Claude | 🎮 4 296 tri, alas que se inclinan y llama que crece con la velocidad | v1 |
| Portal | `portal-cosmos/` | Astra | 🎮 17 756 tri, 3 aros que giran + remolino; de pie mirando al centro; brillo lavanda en código | v1 (sin rondas) |
| Asteroides | `asteroides-cosmos/` | Gemini | 🎮 40 asteroides en 3 draw calls que dan tumbos (antes 40) | v1 |
| Planetas | `planetas-cosmos/` | Gemini | 🎮 3 planetas, 2 con anillo que gira | v1 |
| Cristal de nota | `cristal-nota/` | Gemini | 🎮 estrella de cristal teñida con la nota, aro que gira | v1 |

## 7. Resultado (2026-09-26) — nivel completo, sin publicar

Todo en una tarde con el reparto automático: Gemini hizo 3 kits a la primera (recetas probadas antes por
Claude), Astra el portal en una sola entrega, Claude el cohete, la luz y la integración. Probado en el
navegador: vuelo, llama, alas, cristal, portal y planetas, sin errores; La Pradera sigue igual.
Vista junto al portal: **15 draw calls, ~39 000 triángulos** (`renderer.info`).

Pendientes: que Luis juegue el nivel; publicar con su OK.
