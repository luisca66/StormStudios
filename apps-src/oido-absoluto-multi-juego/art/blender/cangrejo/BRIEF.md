# BRIEF — Cangrejo · Walking AP Multi, Nivel 2 «El Océano»

> Escrito por Claude (integrador) el 2026-09-16. Astra modela a partir de este archivo sin abrir el código.
> Carpeta de trabajo: `apps-src/oido-absoluto-multi-juego/art/blender/cangrejo/` (checkout principal).
> Plan del nivel: `../../../PLAN-OCEANO-BLENDER.md` · Piezas hermanas ya integradas: `../tortuga/`,
> `../ballena/`, `../almeja/` y `../atlantida/` (todas tuyas; la tortuga es la referencia más cercana
> en tamaño y en número de partes animadas).
> **Plataforma: laptop y escritorio.** No hay que recortar presupuesto pensando en teléfonos.

## 1. Qué es y dónde se ve

- Papel: **la fauna del fondo**. Cuatro cangrejos caminan de lado por la arena del arrecife, en
  círculos lentos alrededor de su rincón. No se tocan ni dan puntos: son vida del lugar. Hoy son de
  esferas y cilindros y **es lo más feo que queda del nivel**.
- Cuántos a la vez: 4, cada uno en su zona.
- Siempre **sobre la arena**. El jugador nada por encima, así que **casi siempre los ve desde arriba**
  o en 3/4 superior, a **5–40 u**.
- Caminan **de lado**: avanzan en la dirección de su eje X, no hacia donde miran.

## 2. Ficha técnica (no negociable)

| Dato | Valor |
|---|---|
| Unidades | 1 u de Three.js = 1 m de Blender |
| Ejes en el juego | Y arriba. **Ojos y pinzas hacia +Z**; camina de lado, a lo largo de **X** |
| Origen del modelo | centro del caparazón **a nivel del suelo**: las puntas de las patas apoyan en y = 0 |
| Tamaño | caparazón ≈ 3.0 u de ancho × 2.2 u de fondo × 1.1 u de alto · de punta a punta de las patas ≤ 7.0 u · alto total con ojos ≤ 2.4 u |
| Cámara del juego | perspectiva, FOV vertical 60°, near 0.1 |
| Presupuesto | **≤ 10 000 triángulos** y **≤ 14 mallas exportadas** |
| Transparencias | ninguna |
| Fondo del juego | arrecife soleado: arena `#d9c28f` con cáusticas, agua turquesa `#2c86a3`, sol cálido `#fff3d6` casi vertical |

## 3. Partes que el juego necesita por separado

Cada parte es un objeto MESH con propiedad personalizada `part` (y `segment` donde se indica).
El **origen del objeto es su pivote**.

| `part` | `segment` | Cuántas | Pivote | Qué hace el juego |
|---|---|---|---|---|
| `body` | — | 1 | origen del modelo | caparazón y parte inferior; sube y baja 0.1 u al caminar |
| `eyes` | — | 1 (los dos pedúnculos con sus ojos) | base de los pedúnculos, en el eje central | se mecen juntos en **Z** ±0.15 rad |
| `leg` | `0`–`3` lado −X (de delante a atrás) · `4`–`7` lado +X | 8 | articulación con el caparazón | paso: giran en **X** ±0.4 rad y en **Z** ±0.1 rad, en fases alternas |
| `claw` | `0` lado −X · `1` lado +X | 2 (brazo y pinza fija) | hombro, junto al caparazón | levantan y bajan en **Z** ±0.15 rad |
| `pincer` | `0` lado −X · `1` lado +X | 2 (dedo móvil de cada pinza) | charnela de la pinza | **abre y cierra** en **Y** 0 → 0.5 rad de vez en cuando |

- Ninguna parte emite luz y ningún color lo pone el juego.
- Las patas deben verse **articuladas** (dos o tres segmentos con codo marcado), no palitos rectos.
- `pincer` va colgado del mismo lado que su `claw`: el juego la mueve junto con el brazo. Dame en
  `meta` la posición de reposo de cada charnela, `pincerHinge0` y `pincerHinge1`, en espacio Three.
- Comprueba en el script las poses extremas: patas a ±0.4 rad, pinzas levantadas y abiertas. Ninguna
  pieza debe atravesar el caparazón ni despegarse de su articulación.

## 4. Dirección artística

- **Estilo:** caricatura 3D amable y pulida, la misma familia del pez, la tortuga y la ballena.
  Simpático, nunca amenazante: pinzas grandes y redondeadas, no garras afiladas.
- **Silueta desde arriba** (la vista del juego): caparazón ancho en forma de abanico o de óvalo
  ensanchado, ocho patas bien separadas y dos pinzas grandes al frente. Es lo que tiene que leerse.
- **Cara:** ojos grandes en pedúnculos, con pupila y brillo; boca sugerida bajo el borde frontal.
- **Paleta:** caparazón rojo coral `#e8472a` con el lomo más oscuro `#b8361f` y motas claras
  `#ff9a70`; parte inferior y articulaciones crema `#f1e2c4`; puntas de las pinzas más oscuras
  `#7a2418`; ojos blancos con pupila negra.
- **Materiales:** caparazón satinado (rugosidad 0.4–0.5), patas algo más mates, sin metal.
- **Detalle:** relieve suave en el caparazón (dos o tres surcos y el borde festoneado) y pinzas con
  volumen, no cajas. Gasta el presupuesto en caparazón y pinzas, que es lo que se ve desde arriba.
- **Libertad de Astra:** forma exacta del caparazón, proporción de las pinzas, dibujo de las motas y
  expresión, dentro de estos límites.

## 5. Renders de revisión

Cycles, 32–48 muestras, denoise, mundo `#2c86a3`, un plano de arena `#d9c28f` bajo el cangrejo, sol
cálido casi vertical y ambiente azul claro. Nombres fijos, en esta carpeta:

1. `render-juego.png` — **la vista del jugador**: cámara a **18 u**, 3/4 desde arriba (≈ 55° sobre el
   suelo), FOV 60, 1600×900. ¿Se reconoce un cangrejo simpático?
2. `render-cerca.png` — a ≈ 5 u, 3/4 delantero y bajo, FOV 60, 1600×900: cara, ojos y pinzas.
3. `render-arriba.png` — vista cenital completa, 1200×900: silueta, patas y pinzas.
4. `render-pose.png` — patas en paso extremo, pinzas levantadas y abiertas, 1200×900.

## 6. Criterios de aceptación

- [ ] Medidas, origen (patas en y = 0) y ejes de la ficha técnica.
- [ ] ≤ 10 000 triángulos y ≤ 14 mallas (lo imprime `kit.export_parts`).
- [ ] Existen `body`, `eyes`, `leg` 0–7, `claw` 0–1 y `pincer` 0–1 con los pivotes indicados.
- [ ] `meta.pincerHinge0` y `meta.pincerHinge1` presentes.
- [ ] En las poses extremas del punto 3 no hay piezas que atraviesen ni se despeguen.
- [ ] En `render-arriba.png` la silueta se lee como cangrejo, con ocho patas y dos pinzas.
- [ ] En `render-cerca.png` no hay caras planas en curvas ni formas de primitiva suelta.
- [ ] `cangrejo.json`, `.blend`, `.glb`, renders y `ENTREGA.md` regenerados por `modelar-cangrejo.py`.
- [ ] El script corre con `C:\Users\Luis\blender-bpy\bpy-run.ps1` sin rutas de Codex.

## 7. Rondas

Máximo 2 rondas de corrección de Astra. Si se agotan los tokens, Claude continúa desde
`modelar-cangrejo.py`. La integración (caminata de lado, paso de las patas, chasquido de pinzas y
retirada de los cangrejos de primitivas) la hace el integrador tras la aprobación de Luis.
