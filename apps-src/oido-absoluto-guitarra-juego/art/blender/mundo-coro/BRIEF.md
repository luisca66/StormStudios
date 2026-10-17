# BRIEF — Mundo «Dentro del coro» · Resonancia

> Brief en **modo Astra**: la idea y lo mínimo que el juego necesita. Forma, detalle y carácter los decides tú.
> Carpeta: `apps-src/oido-absoluto-guitarra-juego/art/blender/mundo-coro/`.

## 1. La idea

Resonancia es un juego de **oído absoluto**: un pequeño **robot luthier** (ya modelado, `art/blender/robot/`)
recorre un laberinto y debe llegar a la nota que escuchó. Tiene **un mundo por instrumento**; este es el del
**coro**:

**«Dentro del coro»**: el robot es diminuto y camina por una **catedral de voces**: bóvedas de piedra
clara y altas columnas, la luz de un gran rosetón de colores al fondo, la sillería del coro tallada en
madera a los lados, atriles con partituras abiertas, y ondas de sonido doradas y suaves que flotan en el
aire como cintas (las voces). Cálido y luminoso (piedra color miel, madera, vitrales), sereno y mágico,
nada solemne ni oscuro, para explorarlo durante meses. El piso del laberinto puede ser el piso de piedra
con dibujos de la nave; que se lea claro.

## 2. Contrato mínimo (igual para todos los mundos de Resonancia)

| Dato | Valor |
|---|---|
| Unidades y ejes | 1 m = 1 u. En el juego **Y es arriba**. El laberinto ocupa x ∈ [−17.5, 17.5], z ∈ [−50, 52.6], piso en y = 0 |
| Partes (`part`) | `world` (todo el decorado fijo: puede ser varias mallas con `segment`, una por material), `wall_x` (tramo de muro de **5.0 m a lo largo de X**), `wall_z` (tramo de **5.7 m a lo largo de Z**), `post` (poste de unión en los cruces), `portal_frame` (marco fijo de la meta), `portal_ring` con `segment` 0…n (aros que giran en su eje Z), `portal_core` (centro que late y brilla al abrir) |
| Muros | 1.2 m de alto, 0.34 m de grueso, pivote en el **centro de la base**; el juego los repite y los gira. Que sean parte de la catedral del coro: tramos de sillería tallada, barandales de piedra con arquitos, o atriles en fila |
| Post | ~0.5 × 1.35 × 0.5 m, pivote en el centro de la base |
| Portal | inspirado en el **rosetón** de la catedral (un aro de piedra con vitral de colores); de pie mirando a **+Z**, hueco de radio ~2.2 m con centro a 2.3 m del suelo; pivote en el centro del hueco |
| Mundo | origen en (0, 0, 0); puede extenderse hasta ~±80 m en X y −120…+120 m en Z; el piso del laberinto (y = 0) debe leerse claro: el robot camina encima |
| Presupuesto | `world` ≤ 60 000 triángulos; `wall_x`, `wall_z`, `post` ≤ 1 500 cada uno (se instancian cientos de veces); portal ≤ 15 000 |
| Exportación | `kit.export_glb(ROOT / "mundo-coro-juego.glb", meta=..., ao={"distance": 1.5, "strength": 0.7}, json_path=ROOT / "mundo-coro.json")`; exporta cada parte en su pivote antes de mover nada para los renders |

## 3. Renders

`render-juego.png`: una vista elevada del mundo con unos cuantos muros y postes colocados como laberinto
y el portal al fondo, 1600 × 900. `render-cerca.png`: un detalle que te guste.

## 4. Entrega

`modelar-mundo-coro.py`, `mundo-coro.blend`, `mundo-coro.glb`, `mundo-coro-juego.glb`,
`mundo-coro.json`, los renders y `ENTREGA.md`. Máximo 2 rondas.
