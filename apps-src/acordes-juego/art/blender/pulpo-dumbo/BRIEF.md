# BRIEF — Pulpo Dumbo · Batisfera

> Escrito por Claude (integrador) el 2026-09-13. Astra modela a partir de este archivo; puede
> consultar lo que necesite, pero aquí están los datos del juego.
> Carpeta de trabajo: `apps-src/acordes-juego/art/blender/pulpo-dumbo/` (checkout principal).
> Referencia de método más reciente: `../rape-abisal/` (v3: script, `ENTREGA.md` con valores de
> animación y renders). También `../calamar-vela/` para brazos con `segment`.

## 1. Qué es y dónde se ve

- Papel: quinta criatura de Batisfera (juego de reconocer acordes bajo el mar). El jugador la
  toca, suena un acorde y **cada brazo destella con una nota**; luego responde.
- Dónde aparece: **zona 4 (4000–6000 m, abisal)** y **zona 5 (6000–11 000 m, fosa hadal)**, las más
  oscuras del juego. Aquí suenan acordes de 9ª (5 notas) y de 11ª/13ª (hasta 7 notas).
- Cuántos a la vez: hasta 6 criaturas de varias especies; normalmente 1–2 pulpos.
- Distancia a la cámara: aparece a 25–70 u; el jugador la activa a **≤ 30 u**.
- A 30 u ocupa ≈ 8 % de la altura de la pantalla → la silueta con las dos "orejas" debe leerse.
- El juego la escala entre ×0.85 y ×1.35 según el registro del acorde.

## 2. Ficha técnica (no negociable)

| Dato | Valor |
|---|---|
| Unidades | 1 u de Three.js = 1 m de Blender |
| Ejes en el juego | Y arriba: **manto arriba, brazos hacia abajo (−Y)**. **Ojos mirando a −Z** (en Blender: brazos hacia −Z, ojos hacia +Y) |
| Origen del modelo | centro del manto-cabeza |
| Tamaño | manto-cabeza ≈ 1.7 u de ancho × 1.5 u de alto · envergadura con orejas ≤ 2.8 u · brazos hasta ≈ 1.3 u por debajo del origen · alto total ≤ 2.8 u |
| Cámara del juego | perspectiva, FOV vertical 60°, near 0.1 |
| Presupuesto | **≤ 12 000 triángulos** y **≤ 14 mallas exportadas** por pulpo |
| Transparencias | evitarlas; sugerir la translucidez con pigmento (bordes más claros) |
| Fondo del juego | casi negro: `#050d18` (zona 4) → `#01050a` → `#000203` (zona 5). Luz ambiental casi nula; el submarino ilumina con un foco blanco frío `#d6ecff` desde la cámara |

## 3. Partes que el juego necesita por separado

Cada parte es un objeto MESH con propiedad personalizada `part` (y `segment` donde se indica).
El **origen del objeto es su pivote**.

| `part` | `segment` | Cuántas | Pivote | Qué hace el juego |
|---|---|---|---|---|
| `body` | — | 1 | origen del modelo | giro lento del conjunto y leve respiración (incluye ojos) |
| `ear` | — | 2 (izq./der.) | unión de la aleta al manto | aleteo lento y amplio, lados opuestos: es su forma de nadar |
| `web` | — | 1 | base de la corona de brazos | la membrana entre brazos; se abre y cierra con un pulso suave de escala |
| `arm` | `0` … `7` | **8 objetos, un brazo cada uno**, en orden alrededor de la corona | base de cada brazo | ondulación; **destello de la nota i** en el brazo `segment = i` (hasta 7 notas) |

- `arm`: pigmento propio + emisión **neutra** muy baja (`#fff4f0`, 0.15–0.3): el juego la sube y la
  tiñe con la familia al destellar (novenas magenta `#ff7fd0` en zona 4, 11ª/13ª verde `#7fffc8` en
  zona 5). Si Astra quiere cirros o ventosas que brillen, van dentro de cada `arm`.
- `body`, `ear` y `web` sin emisión: se ven por el foco del submarino.
- La membrana `web` no debe dejar huecos visibles con los brazos cuando estos ondulan ±0.1 rad:
  que la unión quede ligeramente por dentro de cada brazo.

## 4. Dirección artística

- **Estilo:** coherente con la Medusa Luna, el Calamar Vela y el Rape Abisal: realista estilizado.
  El Dumbo es la criatura **tierna** del abismo: redondeada y amable, sin caricatura (nada de
  pupilas humanas, cejas ni sonrisa).
- **Silueta:** manto-cabeza en forma de campana o gota invertida, dos aletas grandes en la parte
  superior como orejas, ojos grandes a los lados de la cabeza, corona de 8 brazos cortos unidos por
  membrana que forma una falda o paraguas.
- **Paleta sugerida:** rosa melocotón pálido a coral (`#e8b4a6` – `#c9837a`), membrana y cara
  inferior de los brazos algo más rosadas, bordes de orejas y membrana más claros (sensación de
  translucidez), motas finas más oscuras dispersas; ojos oscuros con reflejo discreto; cirros
  claros en los brazos.
- **Materiales:** piel satinada y blanda (rugosidad media), sin metal.
- **Detalle:** cirros o ventosas pequeños en la cara interna de los brazos, borde de la membrana
  ligeramente ondulado, pliegue sutil donde nacen las orejas. Nada de detalle que no se lea a ≈ 10 u.
- **Libertad de Astra:** proporciones finas, forma exacta de orejas y membrana, pose de reposo de
  los brazos (abiertos en paraguas o recogidos), patrón de motas y paleta dentro del rango.
- Referencias: pulpos dumbo (Grimpoteuthis); solo como guía de forma.

## 5. Renders de revisión

Cycles, 32–48 muestras, denoise, mundo `#050d18`, luz ambiental casi nula + foco blanco frío desde
la cámara (como el submarino); los brazos con su emisión base. Nombres fijos, en esta carpeta:

1. `render-juego.png` — cámara a **25 u** del origen, vista 3/4 frontal ligeramente desde arriba,
   FOV 60, 1600×900. El pulpo debe ocupar ≈ 10 % de la altura del cuadro.
2. `render-cerca.png` — cámara a **10 u** del origen, misma vista, FOV 60, 1600×900. **El pulpo
   debe ocupar ≈ 25 % de la altura del cuadro**; si sale más pequeño, la cámara no está a 10 u.
   Aquí se juzga el estilo.
3. `render-perfil.png` — perfil lateral completo con fondo algo más claro (`#0b2438`), 1200×900.
4. `render-detalle.png` — ojos, nacimiento de las orejas y cara inferior con brazos y membrana,
   1200×900.

## 6. Criterios de aceptación

- [ ] Medidas, origen y ejes de la ficha técnica (manto arriba, ojos hacia −Z en Three).
- [ ] ≤ 12 000 triángulos y ≤ 14 mallas (lo imprime `kit.export_parts`).
- [ ] Existen `body`, 2 `ear`, `web` y 8 `arm` con `segment` 0–7 en orden alrededor de la corona, con los pivotes indicados.
- [ ] Sin huecos entre membrana y brazos con ±0.1 rad de giro en cada brazo.
- [ ] En `render-juego.png` se reconoce el pulpo con sus dos orejas.
- [ ] En `render-cerca.png`, con el tamaño indicado, no hay caras planas en curvas ni formas de primitiva suelta.
- [ ] El `.glb` muestra el pigmento (colores de vértice conectados al material).
- [ ] `ENTREGA.md` trae eje, amplitud y velocidad de animación para cada parte móvil.
- [ ] `pulpo-dumbo.json`, `.blend`, `.glb`, renders y `ENTREGA.md` regenerados por `modelar-dumbo.py`.
- [ ] En la carpeta quedan solo los entregables (sin logs ni archivos temporales).
- [ ] El script corre con `C:\Users\Luis\blender-bpy\bpy-run.ps1` sin rutas de Codex.

## 7. Rondas

Máximo 2 rondas de corrección de Astra. Si se agotan los tokens, Claude continúa desde
`modelar-dumbo.py`. La integración en el juego (Three.js, animación, destello) la hace el
integrador después de que Luis apruebe los renders.
