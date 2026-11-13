# BRIEF — Arañita del pantano · Walking AP Multi, nivel 4 «El Pantano»

> Brief en **modo Astra**: la idea y lo mínimo que el juego necesita. Forma, detalle y carácter los decides tú.
> Carpeta: `apps-src/oido-absoluto-multi-juego/art/blender/arana-pantano/`. Plan del nivel:
> `apps-src/oido-absoluto-multi-juego/PLAN-PANTANO-BLENDER.md`.

## 1. La idea

El nivel 4 es **un pantano encantado al anochecer**: penumbra húmeda, niebla verde, hongos que brillan. El
jugador es un cocodrilo simpático. Por el barro deambulan 14 **arañitas** que a Luis (el dueño del
proyecto) le encantan: son parte del encanto del nivel, **no dan miedo**. Tienen que ser **tiernas y
bonitas**: de cuento, redondas, ojos grandes y brillantes, quizá algo «peludita» o con un dibujo bonito en
el lomo. Que se lean en la penumbra (ojos que brillan, colores que no sean negros), pero sin ser enormes:
miden lo que una araña grande de cuento al lado de un cocodrilo de 7 m.

Un intento anterior de Claude quedó «medio feo» (abdomen violeta liso y ojos ámbar). Hazla con más
encanto y personalidad.

## 2. Contrato mínimo (lo usa el código de caminata, que ya funciona)

| Dato | Valor |
|---|---|
| Unidades y ejes | 1 m = 1 u. En el juego **Y es arriba** y la araña **mira a −Z** (cabeza en −Z, abdomen en +Z) |
| Tamaño | cuerpo ≈ 1.1 m de largo, centro del cuerpo a ≈ 0.38 m del suelo; patas abiertas ≈ 2 m de punta a punta; el juego la escala ×0.8–1.2 |
| Partes (`part`) | `body` (cuerpo entero), `eyes` (ojos; con emisión), y `leg` con `segment` 0…7 (cada pata **rígida y completa**: muslo + tibia + punta) |
| Pivotes | `body` y `eyes`: (0, 0.38, 0) — el juego sube y baja el cuerpo desde ahí al caminar. Cada `leg`: en su articulación con el cuerpo, en (±0.27, 0.34, z) con z = −0.22, −0.07, 0.07, 0.20 (de adelante hacia atrás) |
| Orden de patas | `segment` = 2·i + (lado derecho ? 1 : 0), con i = 0…3 de adelante hacia atrás; izquierda es x < 0 |
| Pose de reposo | patas arqueadas como araña parada, puntas apoyadas en y ≈ 0. El juego hace girar cada pata alrededor de su pivote en X (±0.42 rad, paso) y un poco en Z (−0.08 rad, levanta), así que la pata debe verse bien con esos giros |
| Presupuesto | ≤ 8 000 triángulos en total, ≤ 12 mallas |
| Paleta | niebla `#2b4a44`, barro `#4a4a2c`. Libre para la araña, pero que contraste con el barro oscuro; los ojos con emisión cálida (ámbar `#ffb020` o la que elijas) |
| Exportación | `kit.export_glb(ROOT / "arana-pantano-juego.glb", meta=..., ao={"distance": 0.2, "strength": 0.5}, json_path=ROOT / "arana-pantano.json")`; exporta cada parte en su pivote antes de mover nada para los renders |

## 3. Renders

`render-cerca.png`: 3/4 de frente, de cerca, sobre fondo `#2b4a44` y un plano de barro `#4a4a2c`, 1400 × 900.
`render-juego.png`: desde ~6 m y 2 m de altura, como la ve el jugador.

## 4. Entrega

`modelar-arana-pantano.py`, `arana-pantano.blend`, `arana-pantano.glb`, `arana-pantano-juego.glb`,
`arana-pantano.json`, los renders y `ENTREGA.md`. Máximo 2 rondas.
