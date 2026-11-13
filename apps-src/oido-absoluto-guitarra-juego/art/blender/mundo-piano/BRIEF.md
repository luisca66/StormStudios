# BRIEF — Mundo «Dentro del piano de cola» · Resonancia

> Brief en **modo Astra**: la idea y lo mínimo que el juego necesita. Forma, detalle y carácter los decides tú.
> Carpeta: `apps-src/oido-absoluto-guitarra-juego/art/blender/mundo-piano/`.

## 1. La idea

Resonancia es un juego de **oído absoluto**: un pequeño **robot luthier** (ya modelado, `art/blender/robot/`)
recorre un laberinto y debe llegar a la nota que escuchó. Hoy el laberinto está montado sobre una guitarra
gigante. Ahora tendrá **un mundo por instrumento**; este es el primero nuevo:

**«Dentro del piano de cola»**: el robot es diminuto y camina *dentro* de un gran piano de cola, donde
viven las cuerdas. Alrededor y por debajo del laberinto se ve el arpa de hierro dorada con sus cuerdas
tensas que corren a lo largo, las clavijas de afinación, la fila de martillos de fieltro, los apagadores,
la tabla armónica de abeto y, arriba y a lo lejos, la tapa abierta del piano como un techo inclinado.
Cálido, mágico y de cuento (madera barnizada, latón dorado, fieltro rojo o verde), como si el piano fuera
una catedral. Nada realista ni oscuro: tiene que dar ganas de explorarlo durante meses.

## 2. Contrato mínimo (igual para todos los mundos de Resonancia)

| Dato | Valor |
|---|---|
| Unidades y ejes | 1 m = 1 u. En el juego **Y es arriba**. El laberinto ocupa x ∈ [−17.5, 17.5], z ∈ [−50, 52.6], piso en y = 0 |
| Partes (`part`) | `world` (todo el decorado fijo: puede ser varias mallas con `segment`, una por material), `wall_x` (tramo de muro de **5.0 m a lo largo de X**), `wall_z` (tramo de **5.7 m a lo largo de Z**), `post` (poste de unión en los cruces), `portal_frame` (marco fijo de la meta), `portal_ring` con `segment` 0…n (aros que giran en su eje Z), `portal_core` (centro que late y brilla al abrir) |
| Muros | 1.2 m de alto, 0.34 m de grueso, pivote en el **centro de la base**; el juego los repite y los gira. Deben verse como parte del piano (p. ej. martillos alineados, apagadores, fieltro y madera, una fila de clavijas) |
| Post | ~0.5 × 1.35 × 0.5 m, pivote en el centro de la base |
| Portal | de pie mirando a **+Z**, hueco de radio ~2.2 m con centro a 2.3 m del suelo; pivote en el centro del hueco |
| Mundo | origen en (0, 0, 0); puede extenderse hasta ~±80 m en X y −120…+120 m en Z para llenar la vista; el piso del laberinto (y = 0) debe leerse claro: el robot camina encima |
| Presupuesto | `world` ≤ 60 000 triángulos; `wall_x`, `wall_z`, `post` ≤ 1 500 cada uno (se instancian cientos de veces); portal ≤ 15 000 |
| Exportación | `kit.export_glb(ROOT / "mundo-piano-juego.glb", meta=..., ao={"distance": 1.5, "strength": 0.7}, json_path=ROOT / "mundo-piano.json")`; exporta cada parte en su pivote antes de mover nada para los renders |

## 3. Renders

`render-juego.png`: una vista elevada del mundo con unos cuantos muros y postes colocados como laberinto
y el portal al fondo, 1600 × 900. `render-cerca.png`: un detalle que te guste (martillos, clavijas, arpa).

## 4. Entrega

`modelar-mundo-piano.py`, `mundo-piano.blend`, `mundo-piano.glb`, `mundo-piano-juego.glb`,
`mundo-piano.json`, los renders y `ENTREGA.md`. Máximo 2 rondas.
