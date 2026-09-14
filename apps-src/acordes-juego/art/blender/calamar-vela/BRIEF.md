# BRIEF — Calamar Vela · Batisfera

> Escrito por Claude (integrador) el 2026-09-13. Astra modela a partir de este archivo sin abrir el código.
> Carpeta de trabajo: `apps-src/acordes-juego/art/blender/calamar-vela/` (checkout principal).
> Modelos hermanos ya integrados, por si sirven de referencia visual: `../medusa-luna-preview.png`,
> `../pez-prisma-preview.png` y la cabina `../cabina-scifi-pov.png`.

## 1. Qué es y dónde se ve

- Papel: tercera criatura de Batisfera (juego de reconocer acordes bajo el mar). El jugador la
  toca, suena un acorde, la criatura destella nota por nota y el jugador responde.
- Dónde aparece: **zona 2 (200–1000 m, crepuscular)** y **zona 3 (1000–4000 m, medianoche)**.
- Cuántos a la vez: hasta 6 criaturas de varias especies; normalmente 1–3 calamares.
- Distancia a la cámara: aparece a 25–70 u; el jugador la activa a **≤ 30 u**.
- A 30 u ocupa ≈ 13 % de la altura de la pantalla → **la silueta y las luces deben leerse
  pequeñas**. El detalle fino solo se aprecia al acercarse (≈ 8–12 u).
- El juego la escala entre ×0.85 y ×1.35 según el registro del acorde.

## 2. Ficha técnica (no negociable)

| Dato | Valor |
|---|---|
| Unidades | 1 u de Three.js = 1 m de Blender |
| Ejes en el juego | Y arriba. **Punta del manto hacia −Z**; cabeza y brazos hacia +Z (en Blender: punta hacia +Y, brazos hacia −Y) |
| Origen del modelo | unión manto–cabeza (cuello), en el eje central |
| Tamaño | manto + cabeza ≈ 2.4 u · brazos ≈ 1.4 u · 2 tentáculos largos hasta ≈ 2.2 u · largo total ≤ 4.8 u · envergadura con aletas ≤ 1.8 u |
| Cámara del juego | perspectiva, FOV vertical 60°, near 0.1 |
| Presupuesto | **≤ 12 000 triángulos** y **≤ 14 mallas exportadas** por calamar |
| Transparencias | solo en bordes de aletas o membranas; el cuerpo principal opaco o casi opaco |
| Fondo del juego | niebla azul petróleo `#1b4f72` (zona 2) → `#0b2438` → casi negro `#050d18` (zona 3). Luz ambiental baja; el submarino ilumina con un foco blanco frío `#d6ecff` desde la cámara |

## 3. Partes que el juego necesita por separado

Cada parte es un objeto MESH con propiedad personalizada `part` (y `segment` donde se indica).
El **origen del objeto es su pivote**.

| `part` | `segment` | Cuántas | Pivote | Qué hace el juego |
|---|---|---|---|---|
| `mantle` | — | 1 | cuello (origen del modelo) | pulso de propulsión: se estrecha y alarga ±9 % en ciclos |
| `fin` | — | 2 (izq./der.) | línea de unión al manto | aleteo ondulante, simétrico |
| `head` | — | 1 | cuello | estática respecto al origen (ojos incluidos) |
| `arm` | `0`, `1`, `2`, `3` | 4 objetos, **cada uno = un par de brazos** (8 brazos) | anillo base de los brazos | ondulación; **destello de la nota i** en el par `segment = i` |
| `tentacle` | — | 2 (largos de caza) | base de cada tentáculo | ondulación lenta, retraso respecto a los brazos |
| `glow` | — | 1 (fotóforos del manto y bajo los ojos, fusionados) | **igual al pivote de `mantle`** (el juego lo mueve con el manto) | se **tiñe con el color de la familia del acorde** y pulsa con él |

Colores de familia que usará el juego en `glow` y en el destello de `arm`: séptimas violeta
`#b48cff` (zona 2), sextas/sus ámbar `#ffd27f` (zona 3). Por eso:

- `glow`: emisión con color **casi blanco** (`#f4f1ff`) e intensidad 1.5–2.5; el juego lo tiñe.
- `arm`: pigmento propio + emisión **neutra** muy baja (0.15–0.3) para que el destello se note al subirla.
- El resto de materiales conserva su pigmento y no necesita emisión.

## 4. Dirección artística

- **Estilo:** coherente con la Medusa Luna y el Pez Prisma: realista estilizado, formas limpias,
  sin caricatura ni ojos humanizados. Criatura de aguas profundas elegante, no amenazante.
- **Idea "vela":** aletas grandes y ondulantes que recorren buena parte del manto como una vela,
  la seña de identidad de la especie. Deben leerse en la silueta a 30 u.
- **Silueta:** manto fusiforme alargado, cabeza más ancha con ojos grandes, corona de brazos
  cónicos que se afinan, dos tentáculos más largos con maza terminal.
- **Paleta sugerida:** manto rojo vino a borgoña translúcido (`#6e1f2e` – `#9c3446`) con motas de
  cromatóforos más oscuras; aletas con borde más claro y algo translúcido; ojos oscuros con iris
  reflectante discreto; fotóforos como puntos ordenados en filas ventrales y bajo los ojos.
- **Materiales:** piel satinada húmeda (rugosidad media-baja), sin metal.
- **Detalle:** ventosas sugeridas solo en la cara interna de los brazos y en las mazas; embudo
  (sifón) visible bajo la cabeza; nada de detalle que no se lea a 8–12 u.
- **Libertad de Astra:** proporciones finas, forma exacta de la vela, patrón de cromatóforos y
  fotóforos, curvatura de los brazos en reposo y paleta dentro del rango indicado.
- Referencias: formas de calamar de aleta ancha (Sepioteuthis) y calamares de profundidad; solo
  como guía de forma, sin copiar ni redistribuir imágenes.

## 5. Renders de revisión

Cycles, 32–48 muestras, denoise, mundo `#0b2438`, luz ambiental baja + un foco blanco frío desde
la cámara (como el submarino). Nombres fijos, en esta carpeta:

1. `render-juego.png` — cámara a **25 u**, vista 3/4 ligeramente desde arriba, FOV 60, 1600×900.
2. `render-perfil.png` — perfil lateral completo con fondo algo más claro (`#1b4f72`), 1200×900.
3. `render-detalle.png` — cabeza, ojos, fotóforos y base de brazos, 1200×900.

## 6. Criterios de aceptación

- [ ] Medidas, origen y ejes de la ficha técnica (punta del manto a −Z en Three).
- [ ] ≤ 12 000 triángulos y ≤ 14 mallas (lo imprime `kit.export_parts`).
- [ ] Existen `mantle`, 2 `fin`, `head`, 4 `arm` con `segment` 0–3, 2 `tentacle` y `glow`, con los pivotes indicados.
- [ ] Cada `arm` agrupa un par de brazos opuestos o contiguos y los 4 cubren la corona completa.
- [ ] En `render-juego.png` se reconoce un calamar y sus aletas-vela; los fotóforos se distinguen del cuerpo.
- [ ] Sin caras invertidas visibles ni huecos entre manto, cabeza y brazos.
- [ ] `calamar-vela.json`, `.blend`, `.glb`, renders y `ENTREGA.md` regenerados por el script.
- [ ] El script corre con `C:\Users\Luis\blender-bpy\bpy-run.ps1` sin rutas de Codex.

## 7. Rondas

Máximo 2 rondas de corrección de Astra. Si se agotan los tokens, Claude continúa desde
`modelar-calamar.py`. La integración en el juego (Three.js, animación, destello) la hace el
integrador después de que Luis apruebe los renders.
