# BRIEF — Chimeneas hidrotermales y pináculos · Batisfera (`acordes-juego`)

> Escrito por Claude (integrador) el 2026-09-17. Astra modela a partir de este archivo sin abrir el código.
> Carpeta de trabajo: `apps-src/acordes-juego/art/blender/chimeneas-hidrotermales/` (checkout principal).
> Plan del entorno: `../../../PLAN-ENTORNO-BLENDER.md` (esta es la pieza 5 de 7, la última de Astra).
> Piezas hermanas ya integradas: `../jardin-corales/` (kit instanciado con emisión por vértice),
> `../arcos-roca/` y `../salientes-roca/` (la roca del pozo), `../barco-hundido/`.
> **Plataforma: laptop y escritorio.**

## 1. Qué es y dónde se ve

- Papel: **el fondo de la fosa** (Zona Hadal, 6 000–11 000 m, y = −600 a −750). Es donde termina la
  bajada y donde vive el **Leviatán**. Tiene que sentirse como el fondo del mundo: quieto, enorme y
  con la única fuente de calor de todo el juego.
- Batisfera es un juego de reconocer acordes: el jugador baja por un **pozo vertical** (radio 90 u)
  rodeado de pared de roca, hasta un suelo ondulado en y = −750. Esto es **decorado**: no se toca.
- Hoy son 12 conos oscuros como pináculos y 6 conos con una brasa encima como chimeneas.
- **Es un kit**: el juego repite las piezas por el fondo de la fosa (ver §3), no las coloca a mano.
- Distancias: los pináculos se descubren a **60–110 u** como siluetas contra el negro; las chimeneas
  se descubren por su **penacho y su brasa**, y el jugador se les acerca a **8–25 u**.
- **Aquí no hay luz ninguna**: solo la brasa de las chimeneas y lo poco que alumbra el faro de la
  Batisfera. La zona 5 brilla en **verde agua `#7fffc8`** (la 2 violeta, la 3 ámbar, la 4 rosa),
  pero **el calor es naranja**: esa mezcla es justo lo que da carácter a esta zona.

## 2. Ficha técnica (no negociable)

| Dato | Valor |
|---|---|
| Unidades | 1 u de Three.js = 1 m de Blender |
| Ejes en el juego | Y arriba. El fondo de la fosa es el plano y = 0 del modelo |
| Origen de cada pieza | **el punto donde se apoya en el suelo**, en su eje (y = 0) |
| Colocación | el juego las planta de pie sobre el suelo del fondo (entre 40 y 85 u del eje del pozo), girándolas alrededor de Y y escalándolas entre **0.6 y 1.8** |
| Suelo | ondulado, ±4 u de relieve: **la base de cada pieza debe ser ancha y sobrada**, para que no se vea flotar. Puede meterse 1.5 u bajo el suelo |
| Tamaño | `spire` **34–52 u de alto** · `stack` (chimenea alta) **12–20 u** · `cluster` (grupo de chimeneas bajas) **6–10 u** · `flange` (repisa/hongo de chimenea muerta) ≤ 6 u de alto y ≤ 9 u de ancho |
| Presupuesto | `spire` **≤ 5 000 triángulos** · `stack` **≤ 4 000** · `cluster` **≤ 4 000** · `flange` **≤ 2 500**; **≤ 14 000 el kit entero** |
| Transparencias | ninguna |
| Cámara del juego | perspectiva, FOV vertical 60°, near 0.1; el mundo se ve a través de un cristal curvo |
| Fondo del juego | agua `#01050a` a `#000203`, niebla exponencial 0.028–0.032, **sin sol**, luz ambiente azulada `#cfe8ff` de intensidad 0.05 → 0.02. Nieve marina en suspensión |

## 3. Partes que el juego necesita por separado

Cada pieza es un objeto MESH con propiedad personalizada `part`. El **origen del objeto es su
pivote** (su apoyo en el suelo). Las cuatro van en el **mismo** `.blend`, `.glb` y JSON, separadas
en X para los renders pero **cada una con su propio origen en (0, 0, 0)** en el JSON.

| `part` | Qué es | Brillo |
|---|---|---|
| `spire` | **pináculo**: aguja de roca enorme, el esqueleto de la fosa. Sustituye a los conos de hoy | ninguno, salvo alguna veta verde agua muy tenue |
| `stack` | **chimenea alta activa** («fumarolero negro»): torre de mineral con la **boca abierta arriba**, costras y goterones | boca y grietas al rojo |
| `cluster` | **grupo de chimeneas bajas**, 3–5 bocas de distinta altura sobre una base común | bocas al rojo, más suave |
| `flange` | **chimenea muerta con repisas** en forma de hongo, donde se acumula el agua caliente | casi nada: un hilo verde agua bajo las repisas |

**Brillo por vértice**, como en el jardín de corales (`vertexEmission`: un valor por vértice, **cero
exacto** donde no brilla). Nada de partes emisivas aparte.

- **Calor** (bocas y grietas de `stack` y `cluster`): naranja `#ff7a2f` en el centro, apagándose a
  rojo oscuro `#8f2412` hacia fuera. Es el **único calor del juego**; tiene que leerse como fuego
  bajo el agua, no como una lámpara.
- **Vida** (vetas de `spire` y el hilo de `flange`): verde agua `#7fffc8` muy tenue, casi al límite
  de verse. Son bacterias, no luces.

`meta` en el JSON (claves en la raíz):

- `plumes`: por cada parte que humea, la lista de bocas `[x, y, z]` de donde sale el penacho. El
  juego ya sabe dibujar columnas de partículas calientes; las pondrá exactamente ahí.
- `pieces`: por cada `part`, `{ "height": alto en u, "footprint": ancho de la base en u }`.
- `forward`: "−Z".

## 4. Dirección artística

- Estilo: **realista estilizado**, como el resto. A esta profundidad manda la silueta y el poco
  brillo; el detalle fino desaparece.
- **Escala**: esto es lo más importante de la pieza. Los pináculos tienen que **empequeñecer a la
  Batisfera** (que mide unos 4 u). Si el jugador no siente que está en el fondo de un lugar enorme,
  la pieza no funciona.
- Pináculos: roca de la misma familia que la pared, azul negruzco `#0d151d` a `#293946`, con
  estratos y aristas rotas; **más delgados y más altos que un cono**, algunos ligeramente
  inclinados, alguno partido a media altura.
- Chimeneas: mineral **negro y poroso** `#161013` a `#2c2022`, con costras de azufre pálido
  `#6b5a3a`, goterones y anillos de crecimiento. La boca es irregular, nunca un círculo limpio.
- Alrededor de las bocas puede haber una alfombra corta de bacterias blanquecinas `#b8c4bb`.
- Materiales: todo rugoso (roughness ≥ 0.88), metalness 0.
- Libertad de Astra: número de bocas del `cluster`, cuántas repisas tiene `flange`, qué pináculo
  está partido, reparto del brillo, siempre dentro de medidas y presupuesto.
- **No**: lava líquida, humo blanco de chimenea de fábrica, calaveras, ni ojos entre las rocas.
  Tono de sitio vivo y peligroso, no de infierno.

## 5. Renders de revisión

Cycles, 32–48 muestras, denoise. **Fondo casi negro `#000203`** con niebla volumétrica, la emisión
activa y **sin luz cenital**. Para que se vea la roca, una luz fría y débil **desde la posición del
jugador** (el faro de la Batisfera). Nombres fijos:

1. `render-kit.png` — las 4 piezas en fila sobre un suelo, a 70 u, FOV 60, 1600×900: aquí se juzga la escala.
2. `render-oscuro.png` — la misma cámara **sin el faro**, solo emisión, 1600×900: qué ve el jugador antes de alumbrar.
3. `render-chimenea.png` — `stack` a 12 u, vista 3/4 desde abajo, 1600×900: aquí se juzga el estilo.
4. `render-fondo.png` — una composición de ejemplo: **unas 14 piezas repetidas** sobre un suelo ondulado, con la Batisfera sugerida como una esfera de 4 u para dar escala, cámara a 90 u, 1600×900.
5. `render-perfil.png` — las 4 de perfil sin niebla, con una regla graduada cada 5 u, 1600×900.

## 6. Criterios de aceptación

- [ ] Medidas, origen y ejes de la ficha técnica; bases anchas, sin pie flotando.
- [ ] Presupuesto por pieza y del kit (lo imprime `kit.export_parts`).
- [ ] Existen `spire`, `stack`, `cluster` y `flange`, con su pivote en la base, y `meta.plumes` y `meta.pieces`.
- [ ] En `render-fondo.png` la esfera de 4 u se ve **pequeña**: la escala es lo que se está juzgando.
- [ ] En `render-oscuro.png` las bocas calientes se leen como fuego, no como bombillas.
- [ ] El brillo va por vértice, con ceros exactos donde no brilla; ninguna pieza entera encendida.
- [ ] El `.glb` muestra el pigmento (colores de vértice conectados al material).
- [ ] En `render-chimenea.png` no hay conos ni cilindros que delaten primitivas.
- [ ] El script corre con `bpy-run.ps1` desde la instalación de Luis y regenera todo.

## 7. Entregables

En esta carpeta: `modelar-chimeneas.py`, `chimeneas.blend`, `chimeneas.glb`, `chimeneas.json`
(`kit.export_parts` con `meta`), los 5 renders y `ENTREGA.md`.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 apps-src\acordes-juego\art\blender\chimeneas-hidrotermales\modelar-chimeneas.py
```

**Aviso del integrador (pasó en el jardín de corales):** Blender invalida la referencia al atributo
de color cuando se añaden otros atributos después, y `kit.export_parts` exporta el JSON **sin
pigmento**. Reasigna `ob.data.color_attributes.active_color` **por nombre** justo antes de exportar
y comprueba que cada malla del JSON traiga `vertexColor`.

## 8. Rondas

Máximo 2 rondas de corrección. Si se agotan los tokens, Claude continúa desde `modelar-chimeneas.py`.
