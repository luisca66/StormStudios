# BRIEF — Portal del pantano · Walking AP Multi, nivel 4 «El Pantano»

> Brief en **modo Astra**: la idea y lo mínimo que el juego necesita. Forma, detalle y carácter los decides tú.
> Carpeta: `apps-src/oido-absoluto-multi-juego/art/blender/portal-pantano/`. Plan del nivel:
> `apps-src/oido-absoluto-multi-juego/PLAN-PANTANO-BLENDER.md`.

## 1. La idea

El nivel 4 es **«un pantano encantado al anochecer: agua que brilla, luciérnagas y hongos luminosos»**.
El jugador es un cocodrilo simpático que camina por el barro buscando fuegos fatuos de nota; al
completar el grupo, **el portal se abre** y lo lleva al último nivel (Las Nubes).

Un **portal de pantano de cuento**: un arco formado por raíces retorcidas de manglar y piedras
redondeadas con musgo, del que cuelgan lianas y quizá farolitos o hongos que brillan; dentro, aros de
luz verde-turquesa que giran alrededor de un remolino. Mágico y acogedor, nada de terror. Caricatura
amable, formas redondas y gruesas, como el resto de Walking AP Multi.

## 2. Contrato mínimo

| Dato | Valor |
|---|---|
| Unidades y ejes | 1 m = 1 u. En el juego Y es arriba. El portal **se para de pie mirando a +Z** (se atraviesa en Z); el juego lo gira hacia el centro del nivel |
| Tamaño | el hueco luminoso tiene **radio ≈ 3.6 m** con centro a **3.5 m del suelo**; el arco entero puede medir ~9–10 m de alto y ~10 m de ancho. El suelo es y = −3.5 respecto del centro del portal |
| Origen | el **centro del hueco** (0, 0, 0); el arco llega hasta y = −3.5 (suelo) |
| Partes (`part`) | `frame` (arco, raíces, piedras, lianas: fijo) · `ring` con `segment` 0…n (aros que giran en su eje Z; el juego alterna el sentido y acelera al abrir) · `core` (el remolino del centro: el juego lo hace latir y sube su emisión al abrir) |
| Presupuesto | tipo **objetivo**: ≤ 20 000 triángulos, ≤ 12 mallas |
| Paleta | niebla `#2b4a44`; musgo `#3f7a3a`→`#6fae52`; corteza `#6b5a3e`→`#4a3b28`; piedra `#6d7560`; luz de los aros turquesa `#5ff0d0` y verde lima `#b8ff7a`; acentos cálidos de farolito `#ffc070` y hongo magenta `#ff6fd0`. Los aros y el remolino brillan (emisión en su material) |
| Exportación | `kit.export_glb(ROOT / "portal-pantano-juego.glb", meta=..., ao={"distance": 1.0, "strength": 0.7}, json_path=ROOT / "portal-pantano.json")`; exporta con cada parte en su pivote antes de mover nada para los renders |

## 3. Renders

`render-juego.png`: el portal a ~25 m, de frente y un poco de lado, desde 2 m de altura, sobre fondo `#2b4a44`, 1600 × 900.
`render-cerca.png`: de cerca, el ángulo que más te guste.

## 4. Entrega

`modelar-portal-pantano.py`, `portal-pantano.blend`, `portal-pantano.glb`, `portal-pantano-juego.glb`,
`portal-pantano.json`, los renders y `ENTREGA.md`. Máximo 2 rondas.
