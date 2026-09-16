# BRIEF — Barco hundido sobre repisa de roca · Batisfera (`acordes-juego`)

> Escrito por Claude (integrador) el 2026-09-16. Astra modela a partir de este archivo sin abrir el código.
> Carpeta de trabajo: `apps-src/acordes-juego/art/blender/barco-hundido/` (checkout principal).
> Plan del entorno: `../../../PLAN-ENTORNO-BLENDER.md` (esta es la pieza 1 de 7).
> Piezas hermanas ya integradas, para el estilo: `../leviatan/`, `../rape-abisal/`, `../pulpo-dumbo/`.
> Referencia de un hito grande con partes y `meta`: `../../../../oido-absoluto-multi-juego/art/blender/atlantida/`.
> **Plataforma: laptop y escritorio.**

## 1. Qué es y dónde se ve

- Papel: **el hito de la zona 1** (Zona Soleada, 0–200 m). Un vapor de carga de principios del
  siglo XX, hundido, que quedó **atascado en una repisa de roca que sale de la pared de la fosa**.
  Le cuenta al jugador, sin palabras, que está bajando a un lugar donde otros no volvieron.
- Batisfera es un juego de reconocer acordes: el jugador baja por un **pozo vertical** (radio 90 u)
  rodeado de pared de roca y captura criaturas. El barco es **decorado**: no se toca ni suena.
- Cuántos: 1. Siempre en el mismo lugar de la pared, cerca del fondo de la zona 1.
- Distancias: se descubre a **60–90 u** (silueta entre la niebla azul), se ve bien a **25–50 u** y
  el jugador puede pasar **rozándolo a 5–10 u** (no hay colisión con decorado).
- Sustituye a una caja con un cono y un cilindro. Tiene que leerse de lejos como **barco**
  (proa, puente, chimenea, mástil) y de cerca como **naufragio con años bajo el agua**.

## 2. Ficha técnica (no negociable)

| Dato | Valor |
|---|---|
| Unidades | 1 u de Three.js = 1 m de Blender |
| Ejes en el juego | Y arriba. **−Z apunta al centro del pozo** (de donde mira el jugador); +Z es la pared |
| Origen del modelo | **punto de la repisa donde apoya el casco, a la altura de su superficie** (y = 0) |
| Colocación | el juego pone el origen a 84 u del eje del pozo, en y ≈ −136, y solo gira el modelo alrededor del eje del pozo |
| Pared detrás | la roca del pozo es un cilindro de radio ≈ 96 u con centro en `(0, y, −84)` del espacio local: su cara queda ~12 u detrás del origen y **se curva hacia el jugador** en los extremos. La parte trasera de la repisa debe fundirse con esa curva (puede meterse hasta 4 u dentro de la pared) |
| Tamaño | barco de **32–38 u de eslora** · repisa ≤ 50 u de ancho, ≤ 18 u de fondo (de la pared hacia −Z) · altura total ≤ 22 u sobre la repisa y ≤ 14 u de roca por debajo |
| Orientación | casco **paralelo a la pared** (eslora a lo largo de X), escorado 15–20° hacia la pared, proa ligeramente más alta que la popa, como si hubiera resbalado |
| Cámara del juego | perspectiva, FOV vertical 60°, near 0.1; el mundo se ve a través de un cristal curvo |
| Presupuesto | **≤ 35 000 triángulos** y **≤ 8 mallas exportadas** |
| Transparencias | ninguna |
| Fondo del juego | agua azul `#2e86c1` arriba de la zona a `#1b4f72` abajo, niebla exponencial 0.008–0.012, sol frío `#eaf6ff` desde arriba, luz ambiente azulada `#cfe8ff`. Nieve marina en suspensión |

## 3. Partes que el juego necesita por separado

Cada parte es un objeto MESH con propiedad personalizada `part`. El **origen del objeto es su pivote**.

| `part` | Cuántas | Pivote | Qué hace el juego |
|---|---|---|---|
| `ledge` | 1 | origen del modelo | repisa de roca con el borde roto hacia abajo; fija |
| `hull` | 1 | origen del modelo | casco, cubierta, puente, chimenea y mástil fusionados; fijo |
| `debris` | 1 | origen del modelo | carga caída, un bote salvavidas volcado, cadena del ancla colgando por el borde de la repisa; fijo |
| `growth` | 1 | origen del modelo | incrustaciones, esponjas, anémonas y algas sobre casco y roca, con pigmento propio; fijo |
| `lamp` | 1 | centro del farol | **farol de proa todavía encendido**, débil: el juego pulsa su emisión muy despacio (única parte emisiva, `#9fe8ff`, emisión 1.0–1.5). Es el guiño que hace que el jugador se acerque |

`meta` en el JSON:

- `bubbleVents`: 2–3 puntos `[x, y, z]` (espacio Three, relativos al origen) donde sale aire
  atrapado, por ejemplo por una escotilla o la chimenea. El juego ya sabe dibujar columnas de burbujas.
- `lampCenter`: centro del farol.

## 4. Dirección artística

- Estilo: **realista estilizado**, como las criaturas: formas limpias y legibles, sin ruido fino que
  desaparece a 40 u. La niebla se come el detalle chico; manda la silueta.
- Barco: vapor de carga con casco remachado, proa recta, puente central de dos niveles, una
  chimenea inclinada, mástil de proa **partido** y botavara caída. Ojos de buey oscuros. Un boquete
  visible en el costado que mira al jugador (el motivo del naufragio).
- Paleta del casco: acero oxidado `#5b3a2a` a `#7a4a30`, pintura desconchada gris verdosa
  `#4f5f5a`, línea de flotación roja apagada `#6e2e25`. **Óxido y pintura se leen como manchas
  grandes**, no como textura fina.
- Crecimiento (`growth`): esponjas amarillo pálido `#c9b56a`, anémonas blancas y rosa apagado,
  algas verde oliva. Más denso en cubierta y en la cara superior de la repisa (donde cae la nieve marina).
- Roca: la misma que la pared del pozo, azul negruzco `#0d151d` a `#1f2a33`, con estratos
  horizontales y aristas rotas. Puede tener una grieta que continúe hacia arriba en la pared.
- Materiales: sin metal brillante; todo rugoso (roughness ≥ 0.75), el óxido absorbe la luz.
- Libertad de Astra: forma exacta del casco, cuánto se hunde en la repisa, composición de los
  escombros y del crecimiento, siempre dentro de medidas y presupuesto.
- **No**: nombre del barco escrito, calaveras, esqueletos ni tesoro. Tono de misterio, no de terror.

## 5. Renders de revisión

Cycles, 32–48 muestras, denoise. **Fondo azul `#1f5f8f` con niebla volumétrica ligera** y luz
cenital fría, para juzgar cómo se lee dentro del agua. Incluir un plano curvo de radio 96 detrás
como pared, solo para los renders. Nombres fijos:

1. `render-juego.png` — a 70 u desde el centro del pozo, FOV 60, 1600×900: ¿se lee «barco» en la niebla?
2. `render-cerca.png` — a 25 u, vista 3/4 desde arriba, FOV 60, 1600×900: aquí se juzga el estilo.
3. `render-perfil.png` — frente completo a 45 u, sin niebla, 1600×900.
4. `render-detalle.png` — acercamiento al boquete del casco y al farol de proa, 1200×900.

## 6. Criterios de aceptación

- [ ] Medidas, origen y ejes de la ficha técnica; la parte trasera de la repisa sigue la curva de radio 96.
- [ ] ≤ 35 000 triángulos y ≤ 8 mallas (lo imprime `kit.export_parts`).
- [ ] Existen `ledge`, `hull`, `debris`, `growth` y `lamp` con su pivote, y `meta.bubbleVents` y `meta.lampCenter`.
- [ ] En `render-juego.png` se reconocen proa, puente y chimenea sin explicación.
- [ ] En `render-cerca.png` no hay cajas, cilindros ni conos sueltos que delaten primitivas.
- [ ] El `.glb` muestra el pigmento (colores de vértice conectados al material).
- [ ] `lamp` es la única parte emisiva.
- [ ] El script corre con `bpy-run.ps1` desde la instalación de Luis y regenera todo.

## 7. Entregables

En esta carpeta: `modelar-barco.py`, `barco-hundido.blend`, `barco-hundido.glb`,
`barco-hundido.json` (`kit.export_parts` con `meta`), los 4 renders y `ENTREGA.md`.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 apps-src\acordes-juego\art\blender\barco-hundido\modelar-barco.py
```

## 8. Rondas

Máximo 2 rondas de corrección. Si se agotan los tokens, Claude continúa desde `modelar-barco.py`.
