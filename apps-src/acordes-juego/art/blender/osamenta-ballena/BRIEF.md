# BRIEF — Osamenta de ballena y anémonas-farol · Batisfera (`acordes-juego`)

> Escrito por Claude (integrador) el 2026-09-17. Astra modela a partir de este archivo sin abrir el código.
> Carpeta de trabajo: `apps-src/acordes-juego/art/blender/osamenta-ballena/` (checkout principal).
> Plan del entorno: `../../../PLAN-ENTORNO-BLENDER.md` (esta es la pieza 4 de 7).
> Piezas hermanas ya integradas: `../barco-hundido/` (el precedente exacto: **hito grande sobre una
> repisa que sale de la pared**), `../arcos-roca/` (roca) y `../jardin-corales/` (kit y emisión).
> **Plataforma: laptop y escritorio.**

## 1. Qué es y dónde se ve

- Papel: **el hito narrativo de la zona 4** (Zona Abisal, 4 000–6 000 m). Una ballena murió hace años
  y su cuerpo cayó hasta aquí; lo que queda es el esqueleto, y alrededor floreció una colonia que
  vive de él. Es el recordatorio de que aquí abajo la muerte alimenta a todo lo demás.
- Batisfera es un juego de reconocer acordes: el jugador baja por un **pozo vertical** (radio 90 u)
  rodeado de pared de roca y captura criaturas. La osamenta es **decorado**: no se toca ni suena.
- **A esta profundidad no hay nada de luz**: solo se ve lo que brilla solo, y lo poco que alumbra el
  faro de la Batisfera cuando el jugador se acerca. **El hueso pálido es lo que da la silueta.**
- Hoy son una caja, un cilindro, 9 toros y un cono flotando a media agua, más 15 esferas naranjas
  sueltas por la zona como «anémonas».
- Cuántos: 1 osamenta, siempre en el mismo sitio de la pared. Las anémonas-farol son un **kit** que
  el juego repite (ver §3): unas alrededor de la osamenta y otras sueltas por la zona.
- Distancias: se descubre a **50–80 u** (una mancha pálida en lo negro), se ve bien a **20–45 u** y
  el jugador puede pasar **entre las costillas a 3–8 u** (no hay colisión con decorado).

## 2. Ficha técnica (no negociable)

| Dato | Valor |
|---|---|
| Unidades | 1 u de Three.js = 1 m de Blender |
| Ejes en el juego | Y arriba. **−Z apunta al centro del pozo**; +Z es la pared |
| Origen del modelo | **punto de la repisa donde apoya el cráneo–columna**, a la altura de su superficie (y = 0) |
| Colocación | el juego pone el origen a 84 u del eje del pozo, en y ≈ −540, y solo gira el modelo alrededor del eje |
| Pared detrás | cilindro de radio ≈ 96 u con centro en `(0, y, −84)` del espacio local: su cara queda ~12 u detrás del origen y **se curva hacia el jugador** en los extremos. La repisa se funde con esa curva (puede meterse hasta 4 u dentro) |
| Tamaño | esqueleto de **26–32 u** de largo (eslora a lo largo de X) · repisa ≤ 44 u de ancho y ≤ 16 u de fondo · altura total ≤ 14 u sobre la repisa |
| Orientación | columna **paralela a la pared**, el cráneo hacia −X, la caja torácica ligeramente volcada hacia el jugador (se ve el interior de las costillas, no el canto) |
| Anémonas-farol | 3 variantes: `lantern-a` (≤ 2.5 u de alto), `lantern-b` (≤ 3.5 u), `lantern-c` (racimo, ≤ 3 u). Origen en la base; el juego las repite, gira e inclina |
| Presupuesto | osamenta **≤ 26 000 triángulos** y **≤ 6 mallas** · anémonas **≤ 1 200 triángulos cada una** |
| Transparencias | ninguna |
| Cámara del juego | perspectiva, FOV vertical 60°, near 0.1; el mundo se ve a través de un cristal curvo |
| Fondo del juego | agua `#050d18` arriba de la zona a `#01050a` abajo, niebla exponencial 0.022–0.028, **sin sol**, luz ambiente azulada `#cfe8ff` de intensidad 0.12 → 0.05. Nieve marina en suspensión |

## 3. Partes que el juego necesita por separado

Cada parte es un objeto MESH con propiedad personalizada `part`. El **origen del objeto es su pivote**.
Las anémonas van en el **mismo** `.blend`, `.glb` y JSON que la osamenta, separadas en X para los
renders pero **cada una con su propio origen en (0, 0, 0)**.

| `part` | Cuántas | Pivote | Qué hace el juego |
|---|---|---|---|
| `ledge` | 1 | origen del modelo | repisa de roca con el borde roto; fija |
| `skull` | 1 | base del cráneo | cráneo alargado de ballena, mandíbula caída y separada; fijo |
| `spine` | 1 | origen del modelo | columna con vértebras contadas, algunas sueltas y rodadas por el suelo; fija |
| `ribs` | 1 | origen del modelo | costillas, unas en pie y otras partidas o caídas; fijas |
| `colony` | 1 | origen del modelo | lo que vive del hueso: esteras bacterianas, almejas y gusanos zombi (*Osedax*) rojos sobre hueso y repisa | 
| `lantern-a` · `lantern-b` · `lantern-c` | 1 cada una | base de la pieza | anémonas-farol que el juego instancia; **cada una lleva su brillo por vértice** |

**Brillo (importante, esto no es como los arcos):**

- La osamenta **no tiene una parte emisiva aparte**: el hueso es **pálido y mate** (brilla por reflejo,
  no por luz propia) y solo la `colony` lleva **emisión por vértice** (`vertexEmission` como en el
  jardín de corales: un valor por vértice, cero donde no brilla).
- Las anémonas-farol sí brillan de verdad, también **por vértice**: el pie apagado y la corona encendida.
- Color de la luz de la zona 4: **rosa `#ff7fd0`** (la zona 2 es violeta y la 3 ámbar). Admite
  variación hacia magenta apagado `#e06aa8` y hacia crema rosado `#ffd0e8`. Las esteras bacterianas
  pueden tirar a blanco azulado muy tenue `#cfe8ff`.

`meta` en el JSON (claves en la raíz, como en las piezas anteriores):

- `lanternAnchors`: 8–12 puntos `[x, y, z]` sobre hueso y repisa donde el juego planta anémonas.
- `lanterns`: por cada variante, `{ "height": alto en u, "glowCenter": [x, y, z] }`.
- `ribGaps`: 2–3 puntos entre costillas por donde el jugador puede pasar.
- `wallRadius`: 96 · `wallCenter`: [0, 0, −84] · `forward`: "−Z".

## 4. Dirección artística

- Estilo: **realista estilizado**, como el barco y las criaturas. Formas grandes y legibles; a esta
  profundidad **manda la silueta pálida del esqueleto contra el negro**.
- Hueso: **no blanco de museo**. Marfil sucio `#b9b3a4` a gris pardo `#7d7a70`, más oscuro donde
  la colonia lo está comiendo, con la superficie picada. Las vértebras se cuentan, la caja torácica
  está abierta y **falta alguna costilla**; nada de esqueleto completo y ordenado.
- Cráneo: alargado, de ballena de barbas, con la **mandíbula separada** y caída junto al cuerpo;
  es lo que hace que se lea «ballena» y no «dinosaurio».
- Colonia: esteras bacterianas como una película pálida sobre el hueso, almejas blancas en racimos
  y **gusanos zombi rojo apagado `#7a2f3a`** clavados en las vértebras, como un pelo corto y denso.
- Roca de la repisa: la misma familia que el barco y los arcos, azul negruzco `#0d151d` a `#293946`,
  con estratos horizontales.
- Materiales: todo rugoso (roughness ≥ 0.85), metalness 0.
- Libertad de Astra: proporciones del cráneo, cuántas vértebras y costillas, cuáles faltan, reparto
  de la colonia y forma de las tres anémonas, siempre dentro de medidas y presupuesto.
- **No**: calaveras humanas, restos de barco, tesoro, ni gore. Tono de hallazgo natural y silencioso,
  no de terror. La escena es **triste y hermosa**, no macabra.

## 5. Renders de revisión

Cycles, 32–48 muestras, denoise. **Fondo casi negro `#01050a`** con niebla volumétrica ligera, la
emisión activa y **sin luz cenital**: en esta zona no hay sol. Para que se vea el hueso, usa una luz
fría y débil **desde la posición del jugador** (el faro de la Batisfera). Incluir un plano curvo de
radio 96 detrás como pared, solo para los renders. Nombres fijos:

1. `render-juego.png` — a 65 u desde el centro del pozo, FOV 60, 1600×900: ¿se lee «esqueleto de ballena» en la niebla?
2. `render-oscuro.png` — la misma cámara **sin el faro**, solo emisión, 1600×900: qué queda cuando el jugador no alumbra.
3. `render-cerca.png` — a 20 u, vista 3/4 desde abajo, FOV 60, 1600×900: aquí se juzga el estilo.
4. `render-craneo.png` — acercamiento al cráneo y la mandíbula con la colonia, 1200×900.
5. `render-anemonas.png` — las 3 anémonas en fila a 6 u, con y sin faro (dos paneles), 1600×900.
6. `render-perfil.png` — el conjunto de perfil a 45 u, sin niebla, con la curva de radio 96, 1600×900.

## 6. Criterios de aceptación

- [ ] Medidas, origen y ejes de la ficha técnica; la repisa sigue la curva de radio 96.
- [ ] ≤ 26 000 triángulos y ≤ 6 mallas la osamenta; ≤ 1 200 cada anémona (lo imprime `kit.export_parts`).
- [ ] Existen `ledge`, `skull`, `spine`, `ribs`, `colony` y las tres `lantern-*`, con su pivote, y `meta` completo.
- [ ] En `render-juego.png` se reconocen cráneo, columna y costillas sin explicación.
- [ ] En `render-oscuro.png` queda un dibujo legible de luz rosa, no una mancha informe.
- [ ] El hueso **no** es emisivo: solo `colony` y las anémonas llevan `vertexEmission`, con ceros exactos donde no brillan.
- [ ] En `render-cerca.png` no hay cajas, cilindros ni toros sueltos que delaten primitivas.
- [ ] El `.glb` muestra el pigmento (colores de vértice conectados al material).
- [ ] El script corre con `bpy-run.ps1` desde la instalación de Luis y regenera todo.

## 7. Entregables

En esta carpeta: `modelar-osamenta.py`, `osamenta-ballena.blend`, `osamenta-ballena.glb`,
`osamenta-ballena.json` (`kit.export_parts` con `meta`), los 6 renders y `ENTREGA.md`.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 apps-src\acordes-juego\art\blender\osamenta-ballena\modelar-osamenta.py
```

**Aviso del integrador (pasó en el jardín de corales):** Blender invalida la referencia al atributo
de color cuando se añaden otros atributos después, y `kit.export_parts` exporta el JSON **sin
pigmento**. Reasigna `ob.data.color_attributes.active_color` **por nombre** justo antes de exportar
y comprueba que cada malla del JSON traiga `vertexColor`.

## 8. Rondas

Máximo 2 rondas de corrección. Si se agotan los tokens, Claude continúa desde `modelar-osamenta.py`.
