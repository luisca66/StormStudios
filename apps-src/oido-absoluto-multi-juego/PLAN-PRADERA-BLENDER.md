# PLAN — Nivel 1 «La Pradera» con modelos de Blender

Piloto del flujo nuevo (`MANUAL-RENOVACION-3D.md`, fase D) y primer nivel con el reparto de tres
agentes (`plantillas-blender/REPARTO-AGENTES.md`). Escrito por Claude el 2026-09-26.
Decidido por Luis: se empieza por La Pradera y **Glub se queda en esencia, pero se mejora su modelo**.
Después de La Pradera sigue **Cosmic Ear, con rediseño completo**.

> Nada se publica sin OK de Luis. Lo marcado **Propuesta** espera su visto bueno.

---

## 1. Diagnóstico (código de `environment.ts`, `player.ts`, `gate.ts` y `renderer.ts`)

| Elemento | Hoy | Mallas (≈ draw calls) |
|---|---|---|
| Glub | Esfera rosa + 2 pies (base y dedo) + 2 manos flotantes; **sin cara** | 7 |
| Castillo | 4 torres cilíndricas con cono, 6 muros de caja, dintel, ~68 almenas sueltas, torreón con 20 almenas | ~104 |
| Muralla perimetral | 5 cajas con textura de piedra de canvas; hueco al norte para el portón | 5 |
| Portón | 2 postes y 2 puertas de caja con bisagra | 4 |
| Árboles | Hasta 90, cada uno tronco + 3 esferas, **un material nuevo por árbol** | hasta ~360 |
| Rocas | Hasta 40 dodecaedros sueltos | hasta ~40 |
| Laberinto de setos | 5 cajas verdes | 5 |
| Nubes | 12 × 5 esferas transparentes | 60 |
| Mariposas | 15 × 3 planos | 45 |
| Objetivo de nota | Cubo de color emisivo | 1 |
| Suelo | Plano con textura de pasto de canvas | 1 |

**Total estimado: ~630 draw calls** (conteo del código, no medido). Las Nubes bajaron de 367 a 173 con
kits instanciados; aquí el margen es todavía mayor: con árboles, rocas, setos, muralla, flores y nubes
instanciados, el nivel debería quedar **por debajo de 150** aunque tenga mucho más detalle.

---

## 2. Dirección visual — ✅ aprobada por Luis el 2026-09-26

**«Pradera de cuento ilustrado a media mañana de primavera.»** Caricatura amable, igual que El Océano,
Glub, el cocodrilo y el unicornio: formas redondas y blandas, colores limpios, nada de realismo.

Qué lo distingue de los otros niveles:
- **Las Nubes** ya son pastel y etéreas. La Pradera es **tierra firme, verde saturado y colores de
  juguete**: techos rojos y azules, flores, madera cálida.
- **El Pantano** será verde oscuro y húmedo. La Pradera es **soleada, seca y alegre**, con cielo limpio.
- Es el primer nivel que ve un alumno: tiene que invitar a explorar. El castillo es el imán visual.

Paleta:

| Uso | Hex |
|---|---|
| Cielo / niebla | `a8d8f0` (un poco más limpio que el `a0cce8` actual) |
| Sol | `fff1d0` (más cálido que el actual `fffaed`) |
| Pasto claro → oscuro | `8fcf5f` → `4f9a3e`; sombra `2f6b3a` |
| Piedra del castillo y la muralla | `e2d3b3` → `b9a582` (piedra cálida, no gris) |
| Techos | rojo teja `d9534f`, azul `4a7fc1` |
| Madera | `8a5a3b`; herrajes `4a4a52` |
| Flores | `ffd84d`, `ff8fb1`, `ffffff`, `b28dff` |
| Glub | rosa `ff4081` (identidad; no cambia), pies y manos `c60055` |

**Glub mejorado, misma esencia** (ojos aprobados por Luis el 2026-09-26): la misma bola rosa con pies grandes y manos flotantes (sin
brazos ni piernas), pero con volumen de verdad: brillo suave, degradado del rosa, dedos de pie mejor
formados y **ojos grandes que parpadean**, como el pez. Hoy no tiene cara.

**Partes rígidas, sin esqueleto.** El manual preveía esqueleto para Glub, pero sus manos y pies ya flotan
separados del cuerpo: son partes rígidas perfectas y `player.ts` ya las anima. El esqueleto se queda para
el cocodrilo.

---

## 3. Piezas y reparto

Criterio de Luis: **lo simple, Gemini; lo que tiene que ser hermoso, Claude; lo complejo en paralelo,
Astra.** Tipos de presupuesto de `apps-src/shared-3d/presupuestos.json`.

| # | Pieza | Carpeta | Quién | Tipo | Partes que mueve el juego |
|---|---|---|---|---|---|
| 1 | **Glub** (jugador) | `glub/` | **Claude** | protagonista | `body`, `eye` ×2 (parpadeo), `foot` ×2, `hand` ×2 |
| 2 | **Castillo** (hito central) | `castillo/` | **Astra** | hito | `static`; `flag` ×n (ondean). Medidas atadas a los colisionadores actuales (§5) |
| 3 | Rocas (3 variantes) | `rocas-pradera/` | Gemini | instanciado | ninguna |
| 4 | Setos del laberinto (recto, esquina, topiario) | `setos/` | Gemini | instanciado | ninguna |
| 5 | Muralla perimetral (tramo de 8 m, torreta de esquina) | `muralla/` | Gemini | instanciado | ninguna |
| 6 | Portón de madera (compuerta del nivel) | `porton/` | Gemini | objetivo | `door` ×2 con pivote en la bisagra |
| 7 | Objetivo de nota (cubo de cristal con marco) | `cubo-nota/` | Gemini | objetivo | `glow` (el juego lo tiñe con el color de la nota) |
| 8 | Árboles (3 variantes + arbusto) | `arboles/` | Gemini | instanciado | ninguna |
| 9 | Flores y matas de pasto (4–5 variantes) | `flores/` | Gemini | instanciado | ninguna |
| — | Nubes | — | Claude, código | — | se reusa el kit de nubes del nivel 5 con otro color |
| — | Mariposas | — | Claude, código | — | alas instanciadas, sin modelo |
| — | Suelo, luz y niebla | — | Claude, código | — | paleta de §2; se copia a `shared-3d/inspector/presets.ts` |

Si una pieza de Gemini no convence tras sus 2 rondas, Claude la termina desde el mismo script.

---

## 4. Oleadas (como máximo un encargo abierto por agente)

**Ola 0 — Claude, en cuanto Luis apruebe §2**
- Luz y paleta en el juego y en `presets.ts`; `dedupe` de Three y conexión de `shared-3d` en este juego.
- Bloqueo: el nivel procedural actual ya tiene las medidas finales (§5) y sirve de bloqueo; no hace
  falta otro.
- Briefs de la Ola 1 y prompts listos para pegar.

**Ola 1 — los tres en paralelo**
- Astra: castillo · Gemini: rocas (la más simple, sirve para calibrar a Gemini) · Claude: Glub.

**Ola 2 — Gemini en cadena; Claude integra lo que va llegando**
- Gemini: setos → muralla → portón → cubo de nota → árboles → flores (uno a la vez).
- Astra, si le quedan tokens: pieza pendiente de otro juego (p. ej. las chimeneas de Batisfera, brief
  listo), sin tocar La Pradera.

**Ola 3 — cierre**
- Capturas del nivel completo, draw calls y triángulos; Luis mide FPS en su PC; publicación con OK.
- Comparar contra El Océano (rondas por pieza, peso, draw calls) y actualizar `MANUAL-RENOVACION-3D.md`.

---

## 5. Medidas que los modelos deben respetar (vienen del código)

| Pieza | Medida | Fuente |
|---|---|---|
| Arena | 300 × 300 m; Glub nace en el centro | `state.ts` (`arenaSize: 300`) |
| Castillo | Centro en (0, 0, −40) del juego; muralla de 40 × 40 m, muros de 6 m de alto y 2 m de grueso; 4 torres de radio 3 y 10 m de alto; torreón de 10 × 15 × 10 m; entrada de 6 m de ancho y 5 m de alto al frente (+Z) | `buildCastle` |
| Muralla perimetral | 6 m de alto, 1.5 m de grueso; hueco central de ~6 m al norte para el portón | `buildOuterWalls` |
| Portón | Postes 0.8 × 4.5 × 0.8 m en x = ±3.4; puertas de 3 × 4 × 0.25 m con bisagras en x = ±3.0, y = 2.0 | `gate.ts` |
| Glub | Cuerpo de radio 1 con centro a 1.5 m; pies en x = ±0.6, y = 0.3; manos en x = ±1.1, y = 1.5 | `buildGlub` |
| Cubo de nota | 1.4 m de lado | `renderer.ts` |

El bloqueo de la Ola 0 puede ajustar estas medidas; si cambian, se actualizan los colisionadores en el
mismo paso.

---

## 6. Tablero (solo Claude lo edita)

Estados: `⏳ en cola` → `📝 brief listo` → `🔨 en curso` → `📦 entregada` → `👀 capturas con Luis` → `✅ aprobada` →
`🎮 integrada` → `🚀 publicada`.

| Pieza | Carpeta | Dueño | Estado | Ronda |
|---|---|---|---|---|
| Dirección visual (§2) | — | Luis | ✅ aprobada; luz y paleta ya en el juego | — |
| Glub | `glub/` | Claude | 🎮 v1 integrado con `shared-3d` (GLB 110 kB, parpadeo); falta OK de Luis. Ojo: la cámara va detrás y casi no se ve la cara | v1 |
| Castillo | `castillo/` | Astra | 🔨 v1: script de Astra ejecutado por Claude (su sandbox no carga bpy); 100 284 tri, pasa 2.5× el presupuesto → ronda 1 | v1 |
| Rocas | `rocas-pradera/` | Gemini | 🔨 lanzado en Antigravity; sin archivos aún | — |
| Setos | `setos/` | Gemini | ⏳ | — |
| Muralla | `muralla/` | Gemini | ⏳ | — |
| Portón | `porton/` | Gemini | ⏳ | — |
| Cubo de nota | `cubo-nota/` | Gemini | ⏳ | — |
| Árboles | `arboles/` | Gemini | ⏳ | — |
| Flores | `flores/` | Gemini | ⏳ | — |
