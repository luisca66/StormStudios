# BRIEF — Leviatán · Batisfera

> Escrito por Claude (integrador) el 2026-09-13. Astra modela a partir de este archivo; puede
> consultar lo que necesite, pero aquí están los datos del juego.
> Carpeta de trabajo: `apps-src/acordes-juego/art/blender/leviatan/` (checkout principal).
> Referencia de método más reciente: `../sifonoforo/` (piezas que el juego encadena, comprobación
> de uniones y encuadre en el script). La cadena del Leviatán sigue la misma idea, con piezas distintas.

## 1. Qué es y dónde se ve

- Papel: la criatura legendaria de Batisfera (juego de reconocer acordes bajo el mar). **Rara:** aparece
  como mucho una vez por visita a la fosa, y acertar su acorde vale el doble.
- Al aparecer lanza un **"bramido" visual: una ola de luz recorre sus 9 placas dorsales** de la cabeza
  a la cola. Cuando el jugador la toca, **cada nota del acorde enciende una placa**.
- Dónde aparece: solo en la **zona 5 (6000–11 000 m, fosa hadal)**, casi negra. Acordes de 11ª y 13ª.
- Distancia a la cámara: aparece a **45–65 u** y cruza lentamente el campo visual; el jugador debe
  acercarse a ≤ 30 u para activarla. A 55 u su cuerpo (≈ 48 u) ocupa ≈ 40 % del ancho de la vista.
- El juego la escala entre ×0.85 y ×1.35 según el registro del acorde.

## 2. Cómo se arma en el juego (importante)

Como el Sifonóforo, el Leviatán **llega en piezas** que el juego coloca a lo largo de una curva que
ondula de lado a lado (natación anguiliforme):

```
P0 ── P1 ── P2 ── … ── P8          (separación de 4.6 u entre puntos)
head      (pivote P0, se extiende hacia delante, −Z)
body 1    (pivote P0, llega hasta P1)
body 2    (pivote P1, llega hasta P2)
…
body 8    (pivote P7, llega hasta P8)
tail      (pivote P8, se extiende hacia atrás, +Z)
plate 0…8 (placa i con el mismo pivote que su pieza: 0 → head, i → body i)
```

- Cada pieza de cuerpo se orienta para que su eje **+Z local apunte al siguiente punto**. El juego
  hace ondular la curva con hasta **±0.2 rad de giro lateral y ±0.08 rad de cabeceo entre piezas
  vecinas**: las uniones no deben abrir huecos con esos ángulos (collares, pliegues o solapes que
  cubran la articulación).
- El cuerpo **se afina de la cabeza a la cola**: cada `body` es distinto (no se repite), y el borde
  trasero de una pieza debe coincidir en grosor con el borde delantero de la siguiente.

## 3. Ficha técnica (no negociable)

| Dato | Valor |
|---|---|
| Unidades | 1 u de Three.js = 1 m de Blender |
| Ejes en el juego | Y arriba. **Nada hacia −Z**: cabeza en −Z, cola hacia +Z (en Blender: cabeza hacia +Y, cola hacia −Y) |
| Origen / P0 | unión cabeza–cuerpo, en el eje central |
| Separación entre puntos | **4.6 u** exactos |
| Tamaños | `head` ≈ 6 u de largo, radio ≈ 3.2 u · `body` 1–8 con radio de ≈ 3.0 u a ≈ 0.9 u · `tail` ≈ 5 u de largo · largo total ≈ 48 u |
| Cámara del juego | perspectiva, FOV vertical 60°, near 0.1, alcance 400 u |
| Presupuesto | **≤ 30 000 triángulos** en total y **≤ 20 mallas** (hay un solo Leviatán a la vez) |
| Transparencias | evitarlas |
| Fondo del juego | casi negro `#01050a` → `#000203`. Luz ambiental casi nula; el foco del submarino (`#d6ecff`, alcance ≈ 95 u) apenas lo roza: **es sobre todo una silueta con placas luminosas** |

## 4. Partes que el juego necesita por separado

Cada parte es un objeto MESH con propiedad personalizada `part` (y `segment`). El **origen del objeto
es su pivote**. Si armas copias o una pose curvada para los renders, que no lleven `part`.

| `part` | `segment` | Cuántas | Pivote | Qué hace el juego |
|---|---|---|---|---|
| `head` | — | 1 | P0 | sigue la curva; mandíbula e incluye ojos y aletas pectorales si las lleva |
| `body` | `1` … `8` | 8 | P(i−1) | cada una sigue su tramo de curva |
| `tail` | — | 1 | P8 | sigue el último tramo y ondula algo más |
| `plate` | `0` … `8` | 9 | igual que su pieza anfitriona | se enciende por nota y en la ola del bramido; se tiñe con la familia |

- `plate`: emisión **casi blanca** (`#f2fff9`) e intensidad 1.5–2.5; el juego la tiñe de verde abisal
  `#7fffc8` (11ª/13ª). Cada placa es un grupo dorsal legible a 55 u (una aleta-cresta, una hilera de
  escamas o un órgano luminoso grande), no un punto diminuto.
- `head`, `body` y `tail` sin emisión.

## 5. Dirección artística

- **Estilo:** coherente con las demás criaturas de Batisfera (Medusa Luna, Calamar Vela, Rape Abisal,
  Sifonóforo, Pulpo Dumbo): realista estilizado. El Leviatán es **majestuoso y antiguo**, imponente
  pero no de terror: una criatura legendaria que el jugador celebra encontrar.
- **Silueta:** serpiente marina colosal entre pez remo y anguila gigante: cabeza robusta y alargada con
  mandíbula marcada, ojos pequeños, aletas pectorales largas; cuerpo largo y comprimido lateralmente,
  cresta dorsal continua donde se insertan las placas; cola que termina en aleta alargada.
- **Placas:** 9 crestas o escudos dorsales espaciados, de mayor a menor hacia la cola; son la firma
  visual de la especie.
- **Paleta sugerida:** piel negro azulado a gris pizarra (`#0b1016` – `#2a3440`), vientre algo más
  claro, cicatrices o manchas sutiles, cresta dorsal más oscura; placas nacaradas pálidas en reposo.
- **Materiales:** piel satinada (rugosidad media), sin metal.
- **Detalle:** escamas o surcos sugeridos con pigmento, pliegues en las uniones, dientes discretos;
  el detalle fino solo en la cabeza (se ve a ≤ 30 u); el cuerpo se lee como forma y placas.
- **Libertad de Astra:** forma exacta de cabeza, placas y aletas, patrón de pigmento y proporciones
  finas dentro de la ficha técnica.
- Referencias: pez remo (Regalecus), anguilas abisales, criaturas marinas legendarias; solo como guía de forma.

## 6. Renders de revisión

Cycles, 32–48 muestras, denoise, mundo `#01050a`, luz ambiental casi nula + foco frío desde la cámara;
placas con su emisión. Arma la pose con las piezas en una curva en S suave (±0.2 rad entre vecinas).
Nombres fijos, en esta carpeta:

1. `render-juego.png` — cámara a **55 u** del centro del cuerpo, vista lateral 3/4 ligeramente desde
   arriba, FOV 60, 1600×900. El Leviatán completo cabe en el cuadro y ocupa ≈ 35–45 % del ancho.
2. `render-cerca.png` — cámara a **25 u** de la cabeza, vista 3/4 frontal, FOV 60, 1600×900. Cabeza y
   primeras piezas; aquí se juzga el estilo.
3. `render-perfil.png` — perfil completo con fondo algo más claro (`#0b2438`), 1600×900.
4. `render-detalle.png` — cabeza y placa 0 de cerca, 1200×900.

## 7. Criterios de aceptación

- [ ] Ejes, P0, separación de 4.6 u y pivotes de la ficha técnica.
- [ ] ≤ 30 000 triángulos y ≤ 20 mallas (lo imprime `kit.export_parts`).
- [ ] Existen `head`, `body` 1–8, `tail` y `plate` 0–8 con los pivotes indicados.
- [ ] Sin huecos entre piezas vecinas con ±0.2 rad de giro lateral y ±0.08 rad de cabeceo (comprobado en el script).
- [ ] Grosores continuos entre el borde trasero de cada pieza y el delantero de la siguiente.
- [ ] En `render-juego.png` se lee la silueta y las 9 placas; en `render-cerca.png` la cabeza no muestra caras planas ni formas de primitiva suelta.
- [ ] El `.glb` muestra el pigmento (colores de vértice conectados al material).
- [ ] `ENTREGA.md` trae valores de animación sugeridos: velocidad, longitud de onda y amplitud de la ondulación, mandíbula y aletas si aplica.
- [ ] `leviatan.json`, `.blend`, `.glb`, renders y `ENTREGA.md` regenerados por `modelar-leviatan.py`, en UTF-8.
- [ ] En la carpeta quedan solo los entregables.
- [ ] El script corre con `C:\Users\Luis\blender-bpy\bpy-run.ps1` sin rutas de Codex.

## 8. Rondas

Máximo 2 rondas de corrección de Astra. Si se agotan los tokens, Claude continúa desde
`modelar-leviatan.py`. La integración (curva, ondulación, bramido y placas por nota) la hace el
integrador después de que Luis apruebe los renders.
