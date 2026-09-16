# BRIEF — Ballena jorobada · Walking AP Multi, Nivel 2 «El Océano»

> Escrito por Claude (integrador) el 2026-09-15. Astra modela a partir de este archivo sin abrir el código.
> Carpeta de trabajo: `apps-src/oido-absoluto-multi-juego/art/blender/ballena/` (checkout principal).
> Plan del nivel: `../../../PLAN-OCEANO-BLENDER.md` · Piezas hermanas ya integradas: `../pez/` y
> `../almeja/` (sus `modelar-*.py` y `ENTREGA.md` son la referencia de método y de estilo).
> **No es la Ballena Celeste del Aerostato**: aquella es de cristal y vive en el cielo; esta es de
> carne y hueso y nada en un arrecife soleado.

## 1. Qué es y dónde se ve

- Papel: **el hito grande del nivel**, lo que le da escala al océano. Da vueltas lentas y amplias
  alrededor del arrecife, sube y baja, y suelta burbujas por el espiráculo. El jugador no la caza
  ni la necesita: es el «ahí hay algo enorme» que se ve de lejos y a veces le pasa cerca.
- Cuántas a la vez: 1.
- Recorrido: círculo de 80 u de radio alrededor del centro, entre −20 y −10 u de profundidad.
- Distancias: se ve a **60–150 u** (ahí debe leerse su silueta contra el agua clara) y puede pasar
  a **15–25 u** del jugador.
- El juego la rodea con una esfera de colisión de **12.5 u de radio**: el pez no la atraviesa.

## 2. Ficha técnica (no negociable)

| Dato | Valor |
|---|---|
| Unidades | 1 u de Three.js = 1 m de Blender |
| Ejes en el juego | Y arriba. **Cabeza hacia +Z**, cola hacia −Z |
| Origen del modelo | centro del cuerpo, a la altura de la línea de flotación de las aletas |
| Tamaño | largo total **38–42 u** (cabeza a cola) · alto del cuerpo ≈ 9 u · envergadura con aletas pectorales ≤ 22 u · ancho de la cola ≤ 16 u |
| Cámara del juego | perspectiva, FOV vertical 60°, near 0.1 |
| Presupuesto | **≤ 20 000 triángulos** y **≤ 8 mallas exportadas** |
| Transparencias | ninguna |
| Fondo del juego | arrecife soleado: agua turquesa `#2c86a3` con niebla, sol cálido `#fff3d6` casi vertical, arena `#d9c28f` con cáusticas |

## 3. Partes que el juego necesita por separado

Cada parte es un objeto MESH con propiedad personalizada `part` (y `segment` donde se indica).
El **origen del objeto es su pivote**.

| `part` | `segment` | Cuántas | Pivote | Qué hace el juego |
|---|---|---|---|---|
| `body` | — | 1 | origen del modelo | fijo; cabeza, ojos y garganta van aquí |
| `tail` | — | 1 (pedúnculo + cola) | unión cuerpo–pedúnculo, en el eje central | batido **vertical**: gira en **X** ±0.2 rad a ≈ 4 rad/s |
| `flipper` | `0` = lado −X, `1` = lado +X | 2 pectorales largas | articulación con el cuerpo | giran en **X** ±0.1 rad a ≈ 1.5 rad/s, muy lentas |
| `jaw` | — | 1 | charnela de la mandíbula, al fondo de la boca | abre girando en **X** hasta 0.25 rad, de vez en cuando |

- Ninguna parte emite luz; ningún color lo pone el juego.
- El pedúnculo debe estar **fundido con el cuerpo**, sin arista ni cono encajado: con `tail` a
  ±0.2 rad no puede aparecer un hueco (compruébalo en el script con esas poses).
- Punto obligatorio en `meta`: `blowhole` = (x, y, z) en espacio Three, en lo alto de la cabeza; de
  ahí salen las burbujas cada 0.25 s. Añade también `eye` (uno de los dos) si sirve para depurar.

## 4. Dirección artística

- **Estilo:** caricatura 3D amable y pulida, la misma familia del pez y la almeja: formas limpias,
  volúmenes redondeados, nada de realismo de documental. Debe verse **noble y tranquila**, nunca
  amenazante: es lo bonito del nivel, no un peligro.
- **Especie:** jorobada (*Megaptera*), porque sus rasgos se leen en silueta: **aletas pectorales
  larguísimas** (casi un tercio del cuerpo), **tubérculos** (bultitos) en el borde de la cabeza y de
  las aletas, mandíbula ancha y cola con el borde festoneado.
- **Silueta a 100 u:** debe reconocerse por las pectorales y la cola; el detalle fino no cuenta ahí.
- **Paleta:** lomo azul pizarra `#41586b` → `#2f4352`, vientre y garganta crema `#e8e2d2` con la
  transición en degradado suave; surcos de la garganta marcados en el pigmento; interior de las
  pectorales y de la cola casi blanco `#f1efe6`; ojo oscuro y pequeño, con párpado de piel.
- **Materiales:** piel húmeda satinada (rugosidad 0.4–0.55), sin metal. Manchas y motas discretas
  de tono, pero nada de percebes ni cicatrices de detalle.
- **Detalle:** se ve de cerca al pasar a 15 u, así que cuida el borde de la cola, la línea de la
  boca y la unión de las pectorales; el presupuesto es para gastarlo ahí.
- **Libertad de Astra:** proporciones finas, número y tamaño de tubérculos, forma exacta de la cola
  y de las pectorales, patrón del pigmento y expresión del ojo dentro de estos límites.

## 5. Renders de revisión

Cycles, 32–48 muestras, denoise, mundo `#2c86a3`, sol cálido casi vertical y ambiente azul claro.
Nombres fijos, en esta carpeta:

1. `render-juego.png` — cámara a **100 u**, 3/4 delantero ligeramente desde arriba, FOV 60, 1600×900:
   ¿se reconoce una ballena por su silueta?
2. `render-cerca.png` — pasada cercana a **18 u**, 3/4 desde abajo (como la ve el pez), FOV 60, 1600×900.
3. `render-perfil.png` — perfil lateral completo, 1600×900.
4. `render-cola.png` — cola y pedúnculo con `tail` a +0.2 rad, 1200×900: comprobar que no hay hueco.

## 6. Criterios de aceptación

- [ ] Medidas, origen y ejes de la ficha técnica (cabeza a +Z en Three).
- [ ] ≤ 20 000 triángulos y ≤ 8 mallas (lo imprime `kit.export_parts`).
- [ ] Existen `body`, `tail`, `flipper` segment 0 y 1, y `jaw`, con los pivotes indicados.
- [ ] Con `tail` a ±0.2 rad y `flipper` a ±0.1 rad no hay huecos ni piezas que se atraviesen.
- [ ] La mandíbula cerrada (0 rad) no deja ver el interior de la cabeza.
- [ ] En `render-juego.png` se reconoce la ballena por pectorales y cola.
- [ ] En `render-cerca.png` no hay caras planas en curvas ni formas de primitiva suelta.
- [ ] `meta.blowhole` presente y en lo alto de la cabeza.
- [ ] `ballena.json`, `.blend`, `.glb`, renders y `ENTREGA.md` regenerados por `modelar-ballena.py`.
- [ ] El script corre con `C:\Users\Luis\blender-bpy\bpy-run.ps1` sin rutas de Codex.

## 7. Rondas

Máximo 2 rondas de corrección de Astra. Si se agotan los tokens, Claude continúa desde
`modelar-ballena.py`. La integración (órbita, batido de cola, burbujas del espiráculo y colisión) la
hace el integrador tras la aprobación de Luis.
