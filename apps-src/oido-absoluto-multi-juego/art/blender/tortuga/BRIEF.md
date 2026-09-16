# BRIEF — Tortuga marina · Walking AP Multi, Nivel 2 «El Océano»

> Escrito por Claude (integrador) el 2026-09-15. Astra modela a partir de este archivo sin abrir el código.
> Carpeta de trabajo: `apps-src/oido-absoluto-multi-juego/art/blender/tortuga/` (checkout principal).
> Plan del nivel: `../../../PLAN-OCEANO-BLENDER.md` · Piezas hermanas ya integradas: `../pez/`,
> `../almeja/` y `../ballena/` (esta última, tuya; su `modelar-ballena.py` es la mejor referencia).
> **Plataforma: laptop y escritorio.** No hay que recortar presupuesto pensando en teléfonos.

## 1. Qué es y dónde se ve

- Papel: **fauna media del arrecife**, la que puebla el agua entre el fondo y la superficie.
  Sustituye a ocho calamares de primitivas que hoy flotan a la altura de los ojos del jugador y son
  lo que peor se ve del nivel. No hay que tocarlas ni dan puntos: son vida del lugar.
- Cuántas a la vez: **3 o 4**, cada una en su propia órbita amplia y lenta.
- Recorrido: círculos de 35 a 85 u de radio alrededor del centro, entre −30 y 0 u de profundidad,
  subiendo y bajando suavemente. El juego las escala entre ×0.9 y ×1.4.
- Distancias: se cruzan con el jugador de **8 a 60 u**. A 8 u se le ven de cerca la cabeza y el
  caparazón; a 60 u solo cuenta la silueta.
- El juego les pone una esfera de colisión de ≈ 2.5 u de radio: el pez no las atraviesa.

## 2. Ficha técnica (no negociable)

| Dato | Valor |
|---|---|
| Unidades | 1 u de Three.js = 1 m de Blender |
| Ejes en el juego | Y arriba. **Cabeza hacia +Z**, cola hacia −Z. (Ojo: en el JSON exportado el frente acaba mirando a −Z; eso lo resuelve el integrador, tú autora con la cabeza a +Z como en la ballena.) |
| Origen del modelo | centro del caparazón, a la altura de la línea de las aletas |
| Tamaño | caparazón ≈ 3.0 u de largo × 2.4 u de ancho × 0.9 u de alto · largo total con cabeza y cola ≈ 4.0 u · envergadura con las aletas delanteras extendidas ≤ 5.0 u |
| Cámara del juego | perspectiva, FOV vertical 60°, near 0.1 |
| Presupuesto | **≤ 9 000 triángulos** y **≤ 8 mallas exportadas** |
| Transparencias | ninguna |
| Fondo del juego | arrecife soleado: agua turquesa `#2c86a3` con niebla, sol cálido `#fff3d6` casi vertical, arena `#d9c28f` con cáusticas |

## 3. Partes que el juego necesita por separado

Cada parte es un objeto MESH con propiedad personalizada `part` (y `segment` donde se indica).
El **origen del objeto es su pivote**.

| `part` | `segment` | Cuántas | Pivote | Qué hace el juego |
|---|---|---|---|---|
| `body` | — | 1 | origen del modelo | caparazón, plastrón y cola; fijo |
| `flipper` | `0` delantera −X · `1` delantera +X · `2` trasera −X · `3` trasera +X | 4 | articulación con el cuerpo | **delanteras**: remada tipo vuelo, giran en **Z** ±0.5 rad a ≈ 1.6 rad/s, en fase; **traseras**: timón, en **Z** ±0.15 rad a ≈ 0.8 rad/s |
| `head` | — | 1 | cuello, en el eje central | cabeceo lento en **X** ±0.12 rad y giro en **Y** ±0.25 rad al mirar alrededor |

- Ninguna parte emite luz y ningún color lo pone el juego.
- Cuello y aletas deben estar **fundidos con el cuerpo**: con `head` a ±0.25 rad en Y y las aletas
  delanteras a ±0.5 rad no puede aparecer un hueco ni una arista dura (compruébalo en el script con
  esas poses, como hiciste con la cola de la ballena).
- Punto en `meta`: `mouth` = punta del hocico, en espacio Three.

## 4. Dirección artística

- **Estilo:** caricatura 3D amable y pulida, la misma familia del pez protagonista y de la ballena:
  formas limpias, volúmenes redondeados, nada de realismo de documental. Serena y simpática, con
  cara de tortuga tranquila, sin exagerar los ojos.
- **Especie:** tortuga verde o carey, lo que te salga mejor en silueta. Lo que debe leerse de lejos
  es el **caparazón ovalado** y las **aletas delanteras largas** en pleno «vuelo».
- **Caparazón:** placas (escudos) marcadas en relieve suave y en pigmento, con el borde algo
  festoneado; es lo que más se ve desde arriba, que es como suele pasar bajo el jugador.
- **Paleta:** caparazón verde oliva `#4e7a4a` a `#2f5236`, con las placas perfiladas en ámbar
  `#c8a24a`; plastrón y cuello crema amarillento `#e6d9a8`; piel de las aletas
  verde grisáceo `#5d7f6a` con motas claras; ojo oscuro con párpado de piel.
- **Materiales:** caparazón satinado (rugosidad 0.35–0.5), piel más mate (0.55–0.7), sin metal.
- **Detalle:** el relieve de las placas y las motas de la piel se ven a 8 u; a 60 u solo cuenta la
  silueta, así que gasta el presupuesto en el caparazón y las aletas delanteras.
- **Libertad de Astra:** proporciones finas, número y dibujo de las placas, forma exacta de las
  aletas, patrón de motas y expresión, dentro de estos límites.

## 5. Renders de revisión

Cycles, 32–48 muestras, denoise, mundo `#2c86a3`, sol cálido casi vertical y ambiente azul claro.
Nombres fijos, en esta carpeta:

1. `render-juego.png` — cámara a **25 u**, 3/4 desde arriba (como la ve el jugador al pasar por
   debajo), FOV 60, 1600×900: ¿se reconoce la tortuga por caparazón y aletas?
2. `render-cerca.png` — 3/4 delantero a ≈ 6 u, FOV 60, 1600×900: cara, cuello y placas.
3. `render-arriba.png` — vista cenital completa, 1200×900: forma del caparazón y envergadura.
4. `render-pose.png` — aletas delanteras a +0.5 rad y `head` girada 0.25 rad, 1200×900: comprobar
   que no hay huecos en las articulaciones.

## 6. Criterios de aceptación

- [ ] Medidas, origen y ejes de la ficha técnica (cabeza a +Z en Three).
- [ ] ≤ 9 000 triángulos y ≤ 8 mallas (lo imprime `kit.export_parts`).
- [ ] Existen `body`, `head` y `flipper` con `segment` 0, 1, 2 y 3 en las posiciones indicadas.
- [ ] En las poses extremas del punto 3 no hay huecos ni piezas que se atraviesen.
- [ ] En `render-juego.png` se reconoce la tortuga a 25 u.
- [ ] En `render-cerca.png` no hay caras planas en curvas ni formas de primitiva suelta.
- [ ] `meta.mouth` presente.
- [ ] `tortuga.json`, `.blend`, `.glb`, renders y `ENTREGA.md` regenerados por `modelar-tortuga.py`.
- [ ] El script corre con `C:\Users\Luis\blender-bpy\bpy-run.ps1` sin rutas de Codex.

## 7. Rondas

Máximo 2 rondas de corrección de Astra. Si se agotan los tokens, Claude continúa desde
`modelar-tortuga.py`. La integración (órbitas, remada, colisión y retirada de los calamares) la hace
el integrador tras la aprobación de Luis.
