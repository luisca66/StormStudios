# BRIEF — Atlántida hundida · Walking AP Multi, Nivel 2 «El Océano»

> Escrito por Claude (integrador) el 2026-09-15. Astra modela a partir de este archivo sin abrir el código.
> Carpeta de trabajo: `apps-src/oido-absoluto-multi-juego/art/blender/atlantida/` (checkout principal).
> Plan del nivel: `../../../PLAN-OCEANO-BLENDER.md` · Piezas hermanas ya integradas: `../pez/`,
> `../almeja/`, `../ballena/` (tuyas las dos últimas) y `../arrecife/`.
> **Plataforma: laptop y escritorio.** No hay que recortar presupuesto pensando en teléfonos.
> Es la pieza **más grande del nivel**: tómate el presupuesto completo.

## 1. Qué es y dónde se ve

- Papel: **el hito central del arrecife**. Una ciudad-palacio hundida, posada en la arena en el
  centro exacto del mapa. Es lo primero que ve el jugador al empezar la partida (aparece a 105 u
  al sur, mirándola de frente) y la referencia con la que se orienta durante toda la ronda.
- El jugador **no entra ni interactúa**: la rodea, se esconde tras sus torres y a veces choca.
- Cuántas: 1. Siempre visible desde media distancia.
- Distancias: se ve **entera a 80–130 u**, se recorre por fuera a **20–60 u** y el pez puede
  pegarse a sus muros a **5 u**.
- La sustituye a una versión de cilindros de 8 lados: el problema a resolver es justo ese, que hoy
  se lee como primitivas apiladas.

## 2. Ficha técnica (no negociable)

| Dato | Valor |
|---|---|
| Unidades | 1 u de Three.js = 1 m de Blender |
| Ejes en el juego | Y arriba. La **fachada principal (con el arco de entrada) mira a −Z**, que es de donde llega el jugador |
| Origen del modelo | **centro de la base, apoyada en y = 0** (el juego la coloca en `(0, −50, 0)`, sobre la arena) |
| Tamaño | huella ≤ **120 u de diámetro** (radio 60) · altura total ≤ **45 u** desde la base |
| Cámara del juego | perspectiva, FOV vertical 60°, near 0.1 |
| Presupuesto | **≤ 40 000 triángulos** y **≤ 12 mallas exportadas** |
| Transparencias | solo en los cristales (cúpula y remates); la piedra opaca |
| Fondo del juego | arrecife soleado: agua turquesa `#2c86a3` con niebla, sol cálido `#fff3d6` casi vertical, arena `#d9c28f` con cáusticas |

## 3. Partes que el juego necesita por separado

Cada parte es un objeto MESH con propiedad personalizada `part` (y `segment` donde se indica).
El **origen del objeto es su pivote**.

| `part` | `segment` | Cuántas | Pivote | Qué hace el juego |
|---|---|---|---|---|
| `base` | — | 1 | origen del modelo | plataforma escalonada, escalinatas y suelo del patio; fija |
| `palace` | — | 1 | centro de la base | cuerpo del palacio y su cúpula; fijo |
| `tower` | `0`–`3` | 4 | base de cada torre | fijas (separadas para poder retirarlas si hay que aligerar) |
| `colonnade` | — | 1 (todas las columnas fusionadas) | centro de la base | fija |
| `crystal` | — | 1 | centro del cristal del altar | **gira**: `rotation.y = t·0.5` y cabeceo `sin(t·0.3)·0.2`. Es el corazón de la ciudad |
| `glow` | — | 1 (ventanas, remates y vetas luminosas, fusionados) | centro de la base | late lentamente: el juego le sube y baja la emisión |

- `crystal` y `glow` son **las únicas partes emisivas**. Emisión 1.0–1.8, color turquesa claro
  `#7fe9ff`; el juego solo modula su intensidad, no las tiñe.
- El resto conserva su pigmento y no lleva emisión.
- **Colisión:** el juego usa cilindros verticales simples, no la malla. Dame en `meta` una lista
  `colliders` con los que hacen falta, en espacio Three y relativos al origen del modelo:
  `[{x, z, radius, base, height}, …]` (base = altura del pie del cilindro). Hacen falta uno por
  torre, uno para el cuerpo del palacio y uno para la plataforma escalonada; si añades un muro o un
  arco al que el jugador pueda chocar, inclúyelo. **Menos de 12 cilindros**, es un juego, no un CAD.
- Puntos sueltos en `meta` si te sirven: `archCenter` (centro del arco de entrada).

## 4. Dirección artística

- **Estilo:** caricatura 3D amable y pulida, la familia del resto del nivel. Arquitectura
  **serena y luminosa**, no ruinas tétricas: una ciudad dormida bajo el agua, no un naufragio.
- **Idea:** palacio de piedra clara sobre una plataforma escalonada, con torres esbeltas en las
  esquinas, una columnata alrededor del patio, arcos de entrada y un gran cristal en el centro.
- **Lo que debe leerse a 100 u:** la silueta de la cúpula entre las cuatro torres, y el resplandor
  turquesa del cristal en el corazón.
- **Lo que debe aguantar a 5 u:** sillares (bloques) marcados, cornisas, escalones reales y algún
  desgaste marino discreto (una grieta, un borde comido, coral creciendo en la piedra baja).
- **Paleta:** piedra clara arenisca `#dcd3bc` a `#b4a98f` con vetas frías `#9fb6bd`; oro atlante
  `#d9a441` en cornisas y remates; cristales turquesa `#5fd8e8`; ventanas y vetas luminosas
  `#7fe9ff`. Nada de gris cemento.
- **Materiales:** piedra mate con relieve (rugosidad 0.7–0.85); oro satinado (rugosidad 0.3,
  metalness 0.5–0.7); cristal liso (rugosidad 0.1) y algo translúcido.
- **Simetría:** la planta puede ser simétrica, pero **evita la simetría perfecta en el desgaste**:
  una torre algo inclinada o una escalinata rota le dan siglos de encanto.
- **Libertad de Astra:** planta exacta (cuadrada, hexagonal u octogonal), número de escalones y de
  columnas, forma de la cúpula y de los remates, y dónde poner el desgaste, dentro de estos límites.

## 5. Renders de revisión

Cycles, 32–48 muestras, denoise, mundo `#2c86a3`, sol cálido casi vertical y ambiente azul claro.
Nombres fijos, en esta carpeta:

1. `render-juego.png` — **la primera vista del jugador**: cámara a 105 u al sur (−Z), 12 u de
   altura, mirando a la fachada, FOV 60, 1600×900. ¿Se lee la silueta y el resplandor del cristal?
2. `render-cerca.png` — a ≈ 25 u de la fachada, 3/4, FOV 60, 1600×900: aquí se juzga el estilo.
3. `render-detalle.png` — sillares, cornisa y una esquina con desgaste a ≈ 8 u, 1200×900.
4. `render-planta.png` — vista cenital completa, 1200×900: planta, patio y colocación de torres.

## 6. Criterios de aceptación

- [ ] Medidas, origen (base en y = 0) y fachada a −Z de la ficha técnica.
- [ ] ≤ 40 000 triángulos y ≤ 12 mallas (lo imprime `kit.export_parts`).
- [ ] Existen `base`, `palace`, `tower` con `segment` 0–3, `colonnade`, `crystal` y `glow`.
- [ ] `crystal` gira sobre su propio centro sin salirse de su hueco (compruébalo en el script con
      la rotación máxima).
- [ ] `meta.colliders` presente, con menos de 12 cilindros que cubran torres, palacio y plataforma.
- [ ] En `render-juego.png` se reconoce la ciudad a 105 u y se distingue el cristal.
- [ ] En `render-detalle.png` hay sillares y cornisas reales, no superficies lisas.
- [ ] Ninguna parte salvo `crystal` y `glow` es emisiva.
- [ ] `atlantida.json`, `.blend`, `.glb`, renders y `ENTREGA.md` regenerados por `modelar-atlantida.py`.
- [ ] El script corre con `C:\Users\Luis\blender-bpy\bpy-run.ps1` sin rutas de Codex.

## 7. Rondas

Máximo 2 rondas de corrección de Astra. Si se agotan los tokens, Claude continúa desde
`modelar-atlantida.py`. La integración (colocación, colisionadores, giro del cristal, latido del
resplandor y el claro donde aparece el jugador) la hace el integrador tras la aprobación de Luis.
