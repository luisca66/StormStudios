# BRIEF — Jardín de corales bioluminiscentes · Batisfera (`acordes-juego`)

> Escrito por Claude (integrador) el 2026-09-17. Astra modela a partir de este archivo sin abrir el código.
> Carpeta de trabajo: `apps-src/acordes-juego/art/blender/jardin-corales/` (checkout principal).
> Plan del entorno: `../../../PLAN-ENTORNO-BLENDER.md` (esta es la pieza 3 de 7).
> Piezas hermanas ya integradas, **misma roca y mismas convenciones**: `../arcos-roca/` (pieza 2,
> la más cercana en espíritu: kit de dos variantes pegado a la pared) y `../barco-hundido/` (pieza 1).
> Precedente de kit instanciado: `../../../../oido-absoluto-multi-juego/art/blender/arrecife/`.
> **Plataforma: laptop y escritorio.**

## 1. Qué es y dónde se ve

- Papel: **el color de la zona 3** (Zona de Medianoche, 1 000–4 000 m). Aquí ya **no llega nada de
  luz del sol**: lo único que se ve es lo que brilla solo. El jardín es lo que le da vida a la zona.
- Batisfera es un juego de reconocer acordes: el jugador baja por un **pozo vertical** (radio 90 u)
  rodeado de pared de roca y captura criaturas. El jardín es **decorado**: no se toca ni suena.
- Hoy son 45 conos grises con la punta ámbar, repartidos en 6 manchones, saliendo de la pared hacia
  el centro. Se leen como conos.
- **Esto no es un hito único, es un kit**: piezas sueltas que el juego repite muchas veces por la
  pared. Por eso el presupuesto es chico y **cada pieza tiene que verse bien desde cualquier ángulo**.
- Distancias: el manchón se descubre a **50–80 u** (una mancha de luz ámbar en lo negro), se ve bien
  a **15–40 u** y el jugador puede pasar **rozándolo a 3–8 u** (no hay colisión con decorado).

## 2. Ficha técnica (no negociable)

| Dato | Valor |
|---|---|
| Unidades | 1 u de Three.js = 1 m de Blender |
| Ejes en el juego | Y arriba. **−Z apunta al centro del pozo** (a donde crece el coral); +Z es la pared |
| Origen de cada pieza | **el punto donde la base se pega a la roca**, en la cara de la pared (y = 0, z = 0) |
| Colocación | el juego pone el origen sobre la pared (radio ≈ 94 u), lo gira alrededor del eje del pozo, lo inclina al azar ±25° y lo escala entre **0.7 y 1.4** |
| Pared detrás | cilindro de radio ≈ 96 u; **cada pieza es chica frente a esa curva**, así que la base solo necesita una plaquita de roca que la case: ≤ 3 u de ancho y que se meta 1.5 u en +Z |
| Tamaño | **`fan` 5–8 u** de alto · **`tube` 4–7 u** · **`whip` 6–9 u** · **`crust` ≤ 4 u de ancho y ≤ 1.5 u de alto** |
| Presupuesto | **≤ 2 500 triángulos por pieza** y **≤ 10 000 en todo el kit** (son piezas instanciadas: el presupuesto es de verdad, no orientativo) |
| Transparencias | ninguna |
| Cámara del juego | perspectiva, FOV vertical 60°, near 0.1; el mundo se ve a través de un cristal curvo |
| Fondo del juego | agua `#0b2438` arriba de la zona a `#050d18` abajo, niebla exponencial 0.016–0.022, **sin sol**, luz ambiente azulada `#cfe8ff` de intensidad 0.30 → 0.12. Nieve marina en suspensión |

## 3. Partes que el juego necesita por separado

Cada pieza es un objeto MESH con propiedad personalizada `part`. El **origen del objeto es su pivote**
(la base pegada a la roca). Las cuatro piezas van en el **mismo** `.blend`, `.glb` y JSON, separadas
en X para los renders pero **cada una con su propio origen en (0, 0, 0)** en el JSON.

| `part` | Qué es | Cómo brilla |
|---|---|---|
| `fan` | **gorgonia de abanico**: malla ramificada plana, como un encaje, orientada de canto al pozo | nervaduras y puntas encendidas |
| `tube` | **coral de tubos**: racimo de 5–9 tubos de distinta altura, con la boca abierta | el interior de cada boca encendido, como brasas |
| `whip` | **látigo**: un solo tallo largo que se curva, con nudos a lo largo | puntitos en los nudos y la punta |
| `crust` | **costra**: placa baja que tapiza la roca, con lóbulos | vetas finas entre los lóbulos |

**La emisión no es una parte aparte** (a diferencia de los arcos): aquí cada pieza lleva su propio
brillo en el mismo objeto, con **pigmento y emisión por vértice**. Así el juego dibuja un manchón
entero con una sola llamada de dibujo. Importante: la parte que **no** brilla debe quedar con
emisión 0 exacta, para que el juego pueda apagarla o modularla por vértice.

`meta` en el JSON (claves en la raíz, como en los arcos):

- `pieces`: por cada `part`, `{ "height": alto en u, "footprint": ancho de la base en u, "glowCenter": [x, y, z] }`
  (`glowCenter` = el punto más luminoso, para que el juego pueda poner ahí un destello).
- `wallRadius`: 96 · `forward`: "−Z".

## 4. Dirección artística

- Estilo: **realista estilizado**, igual que los arcos y las criaturas. Formas grandes y legibles;
  a esta profundidad **la silueta es solo lo que brilla**, así que el dibujo del brillo importa
  más que la geometría.
- Color del brillo: **ámbar `#ffd27f`**, que es el color de la zona 3 en el juego (los arcos de la
  zona 2 son violeta). Admite variación hacia oro `#ffb347` y hacia crema `#ffe9c2` entre piezas,
  **nunca hacia verde ni azul**.
- Cuerpo del coral, **apagado y frío** para que el contraste con el brillo sea el protagonista:
  hueso `#6b6a63`, ciruela apagado `#4a3b46`, gris azulado `#3d4a52`.
- Roca de la base: la misma familia que los arcos, azul negruzco `#0d151d` a `#293946`.
- El brillo **no es uniforme**: se enciende en puntas, bocas y nervaduras, y se apaga hacia la base.
  Debe haber zonas apagadas, para que se lea como un ser vivo y no como un letrero.
- Materiales: todo rugoso (roughness ≥ 0.85), metalness 0.
- Libertad de Astra: ramificación exacta, cuántos tubos, dónde se curva el látigo, reparto del brillo.
- **No**: caras ni ojos, formas de planta terrestre (flores, hojas, tallos con hojas), cristales,
  colores fluorescentes de neón, ni transparencias.

## 5. Renders de revisión

Cycles, 32–48 muestras, denoise. **Fondo casi negro `#050d18`**, la emisión de las piezas activa y
**sin luz cenital** (en esta zona no hay sol): solo una luz de relleno muy débil para que se adivine
el cuerpo. Nombres fijos:

1. `render-piezas.png` — las 4 piezas en fila, a 18 u, FOV 60, 1600×900: aquí se juzga el estilo.
2. `render-oscuro.png` — las mismas 4 **sin ninguna luz**, solo emisión, 1600×900: ¿cada una se distingue de las otras solo por su dibujo de luz?
3. `render-manchon.png` — una composición de ejemplo: **unas 20 piezas repetidas** sobre un trozo de pared curva de radio 96, vista a 45 u con niebla, 1600×900. Es la prueba de si el kit hace un jardín o un montón de copias.
4. `render-cerca.png` — la gorgonia (`fan`) y un coral de tubos (`tube`) a 6 u, 1600×900: lo que ve el jugador al rozarlos.
5. `render-perfil.png` — las 4 piezas de perfil sobre la curva de radio 96, sin niebla, con una regla o escala visible, 1600×900: confirma alturas y que las bases casan con la pared.

## 6. Criterios de aceptación

- [ ] Medidas, origen y ejes de la ficha técnica; la base de cada pieza casa con la curva de radio 96.
- [ ] ≤ 2 500 triángulos por pieza y ≤ 10 000 el kit entero (lo imprime `kit.export_parts`).
- [ ] Existen `fan`, `tube`, `whip` y `crust`, cada una con su pivote en la base, y `meta.pieces` completo.
- [ ] En `render-oscuro.png` las cuatro se distinguen entre sí **solo por su brillo**.
- [ ] En `render-manchon.png` la repetición no canta: se lee como un jardín, no como copias.
- [ ] El brillo tiene zonas apagadas; nada de piezas encendidas por completo.
- [ ] El `.glb` muestra el pigmento (colores de vértice conectados al material).
- [ ] La emisión va por vértice dentro de cada pieza; las zonas sin brillo quedan en emisión 0.
- [ ] El script corre con `bpy-run.ps1` desde la instalación de Luis y regenera todo.

## 7. Entregables

En esta carpeta: `modelar-corales.py`, `jardin-corales.blend`, `jardin-corales.glb`,
`jardin-corales.json` (`kit.export_parts` con `meta`), los 5 renders y `ENTREGA.md`.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 apps-src\acordes-juego\art\blender\jardin-corales\modelar-corales.py
```

## 8. Rondas

Máximo 2 rondas de corrección. Si se agotan los tokens, Claude continúa desde `modelar-corales.py`.
