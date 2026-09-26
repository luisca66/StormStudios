# BRIEF — Planetas-instrumento · Cosmic Ear

> Brief en **modo Astra**: la idea y lo mínimo que el juego necesita. Forma, detalle y carácter los decides tú.
> Carpeta: `apps-src/cosmic-ear/art/blender/planetas/` (checkout principal).

## 1. La idea

Cosmic Ear es un **sistema solar de juguete musical**: el alumno pilotea una navecita entre planetas; al
tocar uno suena un acorde y debe cantar cada nota (las lunas). Cada planeta es un **mundo-instrumento**:
se nota a qué instrumento pertenece sin leer nada. Cálido, colorido, de cuento, nada realista ni frío
(El Cometa ya es el espacio helado; este es el espacio alegre).

Cinco planetas, uno por instrumento del juego:

- **Piano** — un mundo de marfil y ébano; anillos que evocan un teclado.
- **Cello** — madera cálida barnizada; un anillo de cuerdas tensas, quizá una voluta.
- **Corno** — dorado y brillante; su anillo se enrosca como el tubo de un corno.
- **Coro** — perla y nube; aura o anillos como voces que se levantan.
- **Fagot** — madera oscura y alargada; un anillo con llaves y juntas plateadas.

## 2. Contrato mínimo

| Dato | Valor |
|---|---|
| Unidades y ejes | 1 m = 1 u. Y arriba en el juego. Frente indiferente |
| Tamaño | el **cuerpo** del planeta mide **radio 1 u** (el juego lo escala entre 1.5 y 3.3); los anillos pueden salir hasta radio ~2.2 |
| Origen | el centro del planeta |
| Partes (`part`) | por instrumento, dos partes: `<inst>_core` (el cuerpo) y `<inst>_ring` (anillos/aura, el juego los hace girar y vibrar cuando suena el acorde). `<inst>` = `piano`, `cello`, `corno`, `coro`, `fagot` → 10 partes |
| Colocación | en el `.blend` pon los 5 en fila para los renders, pero **exporta cada parte con su origen en (0, 0, 0)** (exporta antes de acomodarlos) |
| Presupuesto | ≤ 6 000 triángulos por planeta (core + ring), ≤ 30 000 el kit |
| Paleta del juego | fondo índigo `#120a2e` → violeta `#2a1650`; acentos dorado `#ffcf5a`, magenta `#ff6fb5`, turquesa `#3fd2c7`. Cada planeta con su propio color dominante |
| Exportación | `kit.export_glb(ROOT / "planetas-juego.glb", meta=..., ao=None, json_path=ROOT / "planetas.json")` |

Los brillos (emisión) van en el material de la parte; el juego sumará el color de la nota encima.

## 3. Renders

Uno obligatorio: `render-kit.png`, los 5 planetas en fila sobre fondo `#1a1036`, 1600 × 900, a una
distancia a la que se lean los cinco. Otro de cerca del que más te guste: `render-cerca.png`.

## 4. Entrega

`modelar-planetas.py`, `planetas.blend`, `planetas.glb`, `planetas-juego.glb`, `planetas.json`, los renders y
`ENTREGA.md`. Máximo 2 rondas.
