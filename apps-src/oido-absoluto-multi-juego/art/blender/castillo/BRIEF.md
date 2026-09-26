# BRIEF — Castillo · Walking AP Multi, nivel 1 «La Pradera»

> Brief en **modo Astra**: la idea y lo mínimo que el juego necesita. Forma, detalle y carácter los
> decides tú. Carpeta: `apps-src/oido-absoluto-multi-juego/art/blender/castillo/` (checkout principal).

## 1. La idea

La Pradera es el **primer nivel** del juego: un niño entra, ve pasto verde, árboles, mariposas… y a lo
lejos **el castillo**. Tiene que dar ganas de ir corriendo a explorarlo. **Castillo de cuento ilustrado
a media mañana de primavera**: piedra cálida, techos cónicos de colores, banderines, madera y algún
detalle que premie acercarse (ventanitas, una escalera, hiedra, flores en las almenas…). Caricatura
amable, formas redondeadas y un poco blandas, nada de fortaleza sombría ni realismo.

El jugador es **Glub**, una bola rosa de 2.5 m de alto con pies grandes. Lo ve desde atrás, con la
cámara a 2.5 m de altura y 6 m detrás de él (FOV 60°). Aparece a unos **40 m del frente del castillo**
y puede entrar al patio por la puerta y caminar alrededor.

## 2. Contrato mínimo

| Dato | Valor |
|---|---|
| Unidades y ejes | 1 m = 1 u del juego. El frente (la puerta) mira a **+Z del juego** (−Y de Blender) |
| Origen | Centro de la planta, a nivel del piso |
| Planta | Muralla cuadrada de **40 × 40 m** (caras exteriores en ±20 m, ±1 m de tolerancia), muros de ~6 m de alto y ~2 m de grueso; una torre redonda en cada esquina (radio ~3 m); torre del homenaje central de ~10 × 10 m de base y ~15 m de alto (sin contar techos) |
| Puerta | En el centro del muro frontal: hueco libre de **6 m de ancho y 5 m de alto** (Glub tiene que pasar). Sin hoja que cierre; un rastrillo levantado o un arco está bien |
| Patio | Libre y caminable entre la muralla y la torre central |
| Alturas | Libres por encima de lo anterior (techos, banderas, torrecitas): que la silueta se lea desde lejos |
| Presupuesto | Tipo `hito`: ≤ 40 000 triángulos y ≤ 20 mallas exportadas |
| Paleta (La Pradera) | piedra `e2d3b3` → `b9a582`; techos rojo teja `d9534f` y azul `4a7fc1`; madera `8a5a3b`; herrajes `4a4a52`; banderines y flores con `ffd84d`, `ff8fb1`, `ffffff`, `b28dff`; hiedra y pasto `8fcf5f` → `4f9a3e` |
| Oclusión ambiental | `ao={"distance": 3.0, "strength": 0.8}` en `kit.export_glb` |
| Luz del juego | cielo `a8d8f0` con niebla del mismo color; sol cálido `fff1d0` alto desde (50, 80, −30) del juego |

## 3. Partes que el juego mueve

| `part` | `segment` | Pivote | Qué hace el juego |
|---|---|---|---|
| `static` | — | origen del modelo | nada; puedes separarlo en varias mallas por material (piedra, techos, madera) |
| `flag` | 0..n | donde la tela se une al mástil | la tela ondea girando en Y (da en `ENTREGA.md` amplitud y velocidad) |

Si pones otras cosas vivas (una veleta, un molino), agrégalas como `part` propia y descríbelas en la
entrega.

## 4. Renders

Los de siempre (`INSTRUCCIONES-ASTRA.md`), con estos dos obligatorios:

1. `render-juego.png` — cámara a 1.8 m de altura, **40 m frente a la puerta**, mirando al centro del
   castillo, FOV vertical 60°, 1600 × 900. Es la primera vista del alumno.
2. `render-cerca.png` — vista 3/4 desde ~15 m de una esquina frontal, 1600 × 900.

Luis aprueba con capturas del inspector con la luz del nivel; tus renders son tu revisión.

## 5. Entrega

`modelar-castillo.py`, `castillo.blend`, `castillo.glb`, `castillo-juego.glb` y `castillo.json`
(con `kit.export_glb`), los renders y `ENTREGA.md`. Máximo 2 rondas.
