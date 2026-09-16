# BRIEF — Unicornio-pegaso · Walking AP Multi, Nivel 5 «Las Nubes»

> Escrito por Claude (integrador) el 2026-09-16. Astra modela a partir de este archivo sin abrir el código.
> Carpeta de trabajo: `apps-src/oido-absoluto-multi-juego/art/blender/unicornio/` (checkout principal).
> Contexto: `../../../AUDITORIA-NUBES-BLENDER.md`. Piezas hermanas del nivel ya integradas, de Claude:
> `../nubes/` y `../globo/`. Referencias de personaje tuyas: `../tortuga/` y `../cangrejo/`.
> **Plataforma: laptop y escritorio.**

## 1. Qué es y dónde se ve

- Papel: **el personaje del jugador** en el nivel 5, un juego de oído absoluto. El jugador vuela
  entre nubes pastel buscando globos aerostáticos; al tocar uno suena una nota y debe nombrarla.
- Cuántos: 1. **En pantalla todo el nivel.**
- Cámara: tercera persona **detrás y arriba**: 9 u atrás y 4 u arriba del origen, mirando un poco
  por delante. El jugador ve casi siempre **grupa, cola, crin, alas y la nuca con el cuerno**; de
  perfil solo al girar, y de frente solo en el menú. Ocupa ≈ 35 % de la altura de la pantalla.
- Sustituye a ~85 primitivas: la crin es un montón de huevos pastel que tapa el lomo, el cuerpo
  se ve gris y las alas son elipses planas. Es la pieza más visible del nivel.

## 2. Ficha técnica (no negociable)

| Dato | Valor |
|---|---|
| Unidades | 1 u de Three.js = 1 m de Blender |
| Ejes | Y arriba; **el frente (hocico) mira a +Z** |
| Origen | **bajo el vientre a la altura de los cascos** (y = 0 en la suela de los cascos), centrado en X y en el punto medio del cuerpo en Z |
| Tamaño | cuerpo de **3.0 u** de la grupa al hocico (±10 %) · **4.6 u** de alto hasta la punta del cuerno · envergadura con alas extendidas **7.0 u** |
| Cámara | perspectiva, FOV vertical 60°, near 0.1 |
| Presupuesto | **≤ 30 000 triángulos** y **≤ 22 mallas exportadas** |
| Transparencias | ninguna |
| Fondo | cielo pastel `#b8d9f5`, niebla lavanda clara, sol cálido `#fff0e0` alto; nubes blancas con panza lavanda |

## 3. Partes que el juego necesita por separado

Cada parte es un objeto MESH con `part` (y `segment` donde se indica). **El origen del objeto es
su pivote.** Hoy el juego ya anima todo esto; basta con respetar pivotes y ejes.

| `part` | `segment` | Cuántas | Pivote | Qué hace el juego |
|---|---|---|---|---|
| `body` | — | 1 | origen del modelo | torso, cuello y cabeza fusionados (sin cuerno, crin, ojos ni orejas); flota: sube y baja 0.13 u y se ladea ±0.02 rad |
| `leg` | `0` trasera izq., `1` trasera der., `2` delantera izq., `3` delantera der. | 4 | articulación de cadera/hombro | galope suave al volar: gira en **X** ±0.25 rad a 3.5–5.5 rad/s. Con casco lila incluido |
| `wing` | `0` izquierda (−X), `1` derecha (+X) | 2 | articulación en el lomo, sobre la cruz | aleteo en **Z**: ±0.24–0.32 rad a 1.4–2.0 rad/s. Plumas primarias y secundarias talladas, no una elipse |
| `mane` | `0`…`5` desde la nuca hasta la cruz | 6 | raíz de cada mechón en el cuello | se mece en **X** hasta 0.26 rad y en **Z** ±0.06 rad. Mechones de colores del arcoíris |
| `tail` | `0`…`4` | 5 | raíz de la cola, todos en el mismo punto | cada mechón gira en **X** hasta −0.48 rad al volar y en **Z** ±0.13 rad. Cascada de colores |
| `horn` | — | 1 | base del cuerno en la frente | fijo; espiral dorada |
| `eyes` | — | 1 | centro entre los ojos | fijo por ahora (se puede pedir parpadeo luego) |

- `horn` es **la única parte emisiva**: dorado `#ffd23a`, emisión 0.4. El juego añade encima un
  destello y una luz mágica rosa; no los modeles.
- Los colores de crin y cola van en el pigmento de vértice (no emisivos).

## 4. Dirección artística

- Estilo: **caricatura pastel, tierna y mágica**, a juego con nubes redondas y cometas. Formas
  llenas y suaves, sin detalle fino que se pierda a 9 u. Pensado para niños y adultos.
- Proporciones de peluche: cabeza grande (≈ 30 % del largo), ojos grandes, hocico corto y
  redondo, patas cortas y algo gruesas, grupa redonda (es lo que más se ve).
- Cuerpo: blanco perla `#faf6ff` con sombra lila muy suave `#ece2fb` en la panza; nada gris.
- Crin y cola: mechones gruesos con puntas en espiral o rizo, en franjas `#ff6699` rosa,
  `#ffcc55` amarillo, `#88ddff` celeste, `#aa66ff` violeta, `#66eebb` menta. Que la crin **caiga a
  un lado del cuello** y deje ver el lomo, no un montón encima.
- Alas: plumas blancas con puntas lavanda `#e6dbff`, forma de ala de ave con tres filas (cobertoras,
  secundarias, primarias). Bien visibles desde atrás.
- Cuerno: espiral dorada con 5–6 vueltas. Ojos violeta `#8822cc` con brillo blanco. Orejas con
  interior rosa `#ffb0c0`. Cascos lila `#eeaaff`.
- Libertad de Astra: forma exacta de mechones y plumas, expresión de la cara, pequeños detalles
  (estrellitas en los cascos, un mechón en la frente), siempre dentro del presupuesto y las partes.

## 5. Renders de revisión

Cycles, 32–48 muestras, denoise, fondo `#b8d9f5`. Nombres fijos:

1. `render-juego.png` — **vista de juego**: cámara 9 u detrás y 4 u arriba, mirando a 1 u por delante del hocico, FOV 60, 1600×900. Es el que aprueba Luis.
2. `render-perfil.png` — perfil completo con alas a media altura, 1600×900.
3. `render-frente.png` — 3/4 frontal, para la cara, 1200×900.
4. `render-alas.png` — vista de juego con alas arriba (+0.32 rad) y abajo (−0.32 rad) lado a lado, 1600×900.

## 6. Criterios de aceptación

- [ ] Medidas, origen (cascos en y = 0) y frente a +Z.
- [ ] ≤ 30 000 triángulos y ≤ 22 mallas.
- [ ] Todas las partes de la sección 3 con su `segment` y pivote; el aleteo y el galope no abren huecos en hombros ni caderas.
- [ ] En `render-juego.png` se leen grupa, cola, alas, crin y cuerno sin que la crin tape el lomo.
- [ ] El cuerpo se ve blanco perla, no gris, bajo la luz de los renders.
- [ ] `ENTREGA.md` con eje, amplitud y velocidad de cada parte móvil.
- [ ] El script corre con `bpy-run.ps1` desde la instalación de Luis y regenera todo.

## 7. Entregables

En esta carpeta: `modelar-unicornio.py`, `unicornio.blend`, `unicornio.glb`, `unicornio.json`
(`kit.export_parts`), los 4 renders y `ENTREGA.md`.

## 8. Rondas

Máximo 2 rondas de corrección. Si se agotan los tokens, Claude continúa desde `modelar-unicornio.py`.
