# BRIEF — Mundo «La guitarra gigante» · Resonancia

> Brief en **modo Astra**: la idea y lo mínimo que el juego necesita. Forma, detalle y carácter los decides tú.
> Carpeta: `apps-src/oido-absoluto-guitarra-juego/art/blender/mundo-guitarra/`.

## 1. La idea

Resonancia es un juego de **oído absoluto**: un pequeño **robot luthier** (ya modelado, `art/blender/robot/`)
recorre un laberinto y debe llegar a la nota que escuchó. El primer mundo es **una guitarra clásica gigante**:
el laberinto está montado sobre el diapasón de ébano, entre los trastes de latón, con las seis cuerdas
corriendo a lo largo; al fondo la caja de cedro y la roseta de la boca, el puente, las clavijas del
clavijero a lo lejos. Hoy está hecho con cajas y cilindros en código (`src/world.ts`, `buildInstrumentWorld`
y `buildMaze`); hay que rehacerlo en Blender, hermoso: madera barnizada cálida, nácar en los puntos del
diapasón, latón y cuerdas brillantes. De cuento, acogedor, para explorarlo durante meses.

## 2. Contrato mínimo (igual para todos los mundos de Resonancia)

| Dato | Valor |
|---|---|
| Unidades y ejes | 1 m = 1 u. En el juego **Y es arriba**. El laberinto ocupa x ∈ [−17.5, 17.5], z ∈ [−50, 52.6], piso en y = 0 |
| Referencias de hoy (respétalas o mejóralas) | cuerdas a lo largo de Z en x = −15, −9, −3, 3, 9, 15, a y ≈ 0.97; diapasón de 36.8 m de ancho y 130 m de largo; caja (tapa) circular de radio ~31 m y la cintura de radio ~19 m |
| Partes (`part`) | `world` (todo el decorado fijo: puede ser varias mallas con `segment`, una por material), `wall_x` (tramo de muro de **5.0 m a lo largo de X**), `wall_z` (tramo de **5.7 m a lo largo de Z**), `post` (poste de unión en los cruces), `portal_frame` (marco fijo de la meta), `portal_ring` con `segment` 0…n (aros que giran en su eje Z), `portal_core` (centro que late y brilla al abrir) |
| Muros | 1.2 m de alto, 0.34 m de grueso, pivote en el **centro de la base**; el juego los repite y los gira. Hoy son paneles de madera con filete de latón: haz algo con más carácter de luthería (marquetería, purfiles, filetes) |
| Post | ~0.5 × 1.35 × 0.5 m, pivote en el centro de la base |
| Portal | inspirado en la **roseta** de la guitarra; de pie mirando a **+Z**, hueco de radio ~2.2 m con centro a 2.3 m del suelo; pivote en el centro del hueco |
| Mundo | origen en (0, 0, 0); puede extenderse hasta ~±80 m en X y −120…+120 m en Z; el piso del laberinto (y = 0) debe leerse claro: el robot camina encima |
| Presupuesto | `world` ≤ 60 000 triángulos; `wall_x`, `wall_z`, `post` ≤ 1 500 cada uno (se instancian cientos de veces); portal ≤ 15 000 |
| Exportación | `kit.export_glb(ROOT / "mundo-guitarra-juego.glb", meta=..., ao={"distance": 1.5, "strength": 0.7}, json_path=ROOT / "mundo-guitarra.json")`; exporta cada parte en su pivote antes de mover nada para los renders |

## 3. Renders

`render-juego.png`: una vista elevada del mundo con unos cuantos muros y postes colocados como laberinto
y el portal al fondo, 1600 × 900. `render-cerca.png`: un detalle que te guste.

## 4. Entrega

`modelar-mundo-guitarra.py`, `mundo-guitarra.blend`, `mundo-guitarra.glb`, `mundo-guitarra-juego.glb`,
`mundo-guitarra.json`, los renders y `ENTREGA.md`. Máximo 2 rondas.
