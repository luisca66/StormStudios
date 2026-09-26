# BRIEF — Portal del Cosmos (agujero de gusano) · Walking AP Multi, nivel 3

> Brief en **modo Astra**: la idea y lo mínimo que el juego necesita. Forma, detalle y carácter los decides tú.
> Carpeta: `apps-src/oido-absoluto-multi-juego/art/blender/portal-cosmos/`. Plan del nivel:
> `apps-src/oido-absoluto-multi-juego/PLAN-COSMOS-BLENDER.md`.

## 1. La idea

El nivel 3 de Walking AP Multi es **«un cosmos de libro de cuentos: noche azul profunda llena de
maravillas»**. El alumno pilotea un cohete de juguete buscando cristales de nota; al completar el grupo,
**el portal se abre** y lo lleva al siguiente nivel. Es la meta del nivel: tiene que verse desde lejos y
dar ganas de llegar.

Un **agujero de gusano de cuento**: un gran aro (o varios aros concéntricos que giran en sentidos
alternos) con un remolino de estrellas en el centro. Puede tener constelaciones, pequeños planetas o
cometas enganchados al aro, runas de estrellas… lo que haga que se sienta mágico y no de ciencia ficción
dura. Caricatura amable, formas redondas, nada amenazante.

## 2. Contrato mínimo

| Dato | Valor |
|---|---|
| Unidades y ejes | 1 m = 1 u. En el juego Y es arriba. El aro **se para de pie mirando a +Z** (su hueco se atraviesa en la dirección Z); el juego lo gira para que mire al centro del nivel |
| Tamaño | aro exterior de **radio ≈ 16 m** (hoy es un toro de radio 16); el hueco debe ser holgado: el cohete mide 4 m de envergadura |
| Origen | el centro del aro |
| Partes (`part`) | `frame` (lo fijo, opcional) · `ring` con `segment` 0…n (cada aro que gira en su eje Z; el juego alterna el sentido y acelera al abrir) · `core` (el remolino del centro: el juego lo hace latir y sube su emisión al abrir) |
| Presupuesto | tipo **objetivo**: ≤ 20 000 triángulos, ≤ 12 mallas |
| Paleta | fondo azul medianoche `#0b1438`; acentos turquesa `#3fe0d0`, coral `#ff7a6b`, amarillo estrella `#ffe66d`, rosa aurora `#ff8fd8`, lavanda `#b8a4ff`. Los aros brillan (emisión en el material de cada parte) |
| Exportación | `kit.export_glb(ROOT / "portal-cosmos-juego.glb", meta=..., ao=None, json_path=ROOT / "portal-cosmos.json")`; exporta con cada parte en su pivote antes de mover nada para los renders |

## 3. Renders

`render-juego.png`: el portal a ~60 m, de frente y un poco de lado, sobre fondo `#0b1438`, 1600 × 900.
`render-cerca.png`: de cerca, el ángulo que más te guste.

## 4. Entrega

`modelar-portal-cosmos.py`, `portal-cosmos.blend`, `portal-cosmos.glb`, `portal-cosmos-juego.glb`,
`portal-cosmos.json`, los renders y `ENTREGA.md`. Máximo 2 rondas.
