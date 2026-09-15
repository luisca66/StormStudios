# BRIEF — Carlinga del Cometa · El Cometa

> Escrito por Claude (integrador) el 2026-09-15. Astra modela a partir de este archivo; puede
> consultar lo que necesite, pero aquí están los datos del juego.
> Carpeta de trabajo: `apps-src/grados-menores-juego/art/blender/carlinga/` (checkout principal).
> Referencia de método: `apps-src/acordes-cantar-juego/art/blender/aeronaves/` (script,
> `kit.export_parts`, `ENTREGA.md`, varios JSON con `part`/`segment`). Referencia de género (cabina
> anclada a pantalla): `apps-src/acordes-cantar-juego/art/blender/canasta/` — mismo tipo de encargo,
> aunque ese lo modeló Claude sin Astra; el objetivo visual es el mismo nivel de detalle.
> Sustituye a las primitivas actuales del juego (conos, cajas, toros) en
> `apps-src/grados-menores-juego/src/3d/cab.ts`: **no las tomes como referencia de forma**, son un
> placeholder. Sí conserva sus posiciones aproximadas — ya están calibradas contra la cámara.

## 1. Qué es y dónde se ve

- Juego: El Cometa (cantar/tocar grados de escalas menores volando en un cometa por su órbita,
  hermano menor del Expreso Tonal). Estética: ilustración pintada de época — latón, madera y hielo
  cristalino, aire de Julio Verne en el espacio (mismo lenguaje que Aerostato y Batisfera).
- Papel: **la carlinga del cometa**, siempre en pantalla — es la cabina en primera persona del
  jugador durante toda la partida, como la caldera del Expreso o la canastilla de Aerostato. No es
  un objeto que se vea de lejos: el jugador vive dentro de ella.
- Encaja como **hijo de la cámara**, fija (no orbita, no se aleja). Cámara: perspectiva, FOV vertical
  **60°**, near 0.1. El jugador mira alrededor con drag de mouse (yaw ±100°, pitch ±35°) SIN pointer
  lock; la carlinga se ve desde distintos ángulos dentro de esos límites.
- Incluye la **proa de hielo del cometa** (lo que hoy el código llama "el cometa" visible desde
  dentro): el cuerpo helado que viaja por delante, justo detrás del cristal. No es el cometa completo
  visto desde fuera — eso no existe todavía en el juego y no es parte de este encargo.

## 2. Ficha técnica (no negociable)

| Dato | Valor |
|---|---|
| Unidades | 1 u de Three.js = 1 m de Blender |
| Ejes en el juego | Y arriba. **El frente (hacia donde mira el jugador, dentro de la pantalla) es Three −Z** (en Blender: **+Y**). |
| Origen del modelo | el ojo del jugador — coincide con la cámara, en (0, 0, 0) |
| Tamaño total aproximado | ancho 3.4 × alto 3.8 × fondo 6.5 u (desde el cristal hasta la punta de la proa) |
| Cámara del juego | perspectiva, FOV vertical 60°, near 0.1 |
| Presupuesto | ≤ 20 000 triángulos · ≤ 10 mallas exportadas (draw calls añadidos) — referencia real: la canastilla de Aerostato usó 22 404 tri en 9 partes con buen resultado |
| Materiales | **uno por parte** (`kit.export_parts` exporta solo el material principal); variación dentro de una parte va por **color de vértice** |
| Transparencias | ninguna (ni siquiera en el hielo: se pinta opaco, con color y brillo dando la sensación de cristal) |
| Sombras | el juego no usa sombras: la forma se lee por sombreado y color |
| Fondo típico del juego | espacio profundo con nebulosa tenue; la iluminación de cabina es cálida (latón) contra el frío del hielo |

No incluida en este encargo (sigue siendo código): la estela de motas de hielo que sale disparada
hacia atrás (partículas `THREE.Points`), el HUD 2D de la consola inferior.

## 3. Partes que el juego necesita por separado

Cada parte es un objeto MESH con propiedad personalizada `part` (y `segment` si aplica). El
**origen del objeto es su pivote** de animación. Un solo `carlinga.json` con
`kit.export_parts(ruta, meta=...)`.

| `part` | `segment` | Pivote | Qué hace el juego con ella |
|---|---|---|---|
| `frame_ice` | — | origen del modelo | marco de la ventana (dintel, jambas, cuerpo del alféizar): **rígido, no se mueve** |
| `frame_brass` | — | origen del modelo | remaches del alféizar, filo de latón inferior, las dos portillas laterales: **rígido** |
| `comet_nose` | — | origen del modelo | la proa de hielo del cometa vista por la ventana, con sus bloques de hielo irregulares: **rígido** (la única animación es la deriva/balanceo de TODA la carlinga, que ya hace el juego) |
| `board` | — | centro del tablero, en su cara superior | tablero de madera/hielo, el arco y brazo del sextante, el óvalo oscuro del cuadrante: **rígido** |
| `board_brass` | — | mismo pivote que `board` | el sol y los tres anillos del orrery, el cuerpo/bisel del manómetro, la base del telégrafo: **rígido** |
| `orrery_planet` | `0`, `1`, `2` | **centro del orrery** (el sol), igual para los tres | cada planetita gira sobre su **+Y local** alrededor del sol a velocidad propia (más lejos = más lento); el juego ya trae el radio de órbita en la posición del propio planeta respecto al pivote |
| `gauge_needle` | — | centro del cuadrante del manómetro | gira sobre su **+Y local** según la velocidad del cometa (barre ~240°, con inercia) |
| `beacon_lever` | — | la bisagra/base de la palanca | gira sobre su **+X local** al transmitir el radiofaro y vuelve sola |

Todo cuelga del mismo origen (el ojo del jugador): no hace falta jerarquía padre-hijo entre partes,
basta con que cada pivote esté en el punto correcto dentro del espacio común.

**Posiciones de referencia** (Three, ya calibradas contra la cámara — puedes ajustar el detalle
dentro de ellas, pero mantén el hueco de la ventana y el encuadre libre en el centro):

| Elemento | Posición aprox. (Three) | Nota |
|---|---|---|
| Dintel | (0, 1.28, −1.5) | barra superior, 3.4 × 0.3 × 0.3 |
| Alféizar | (0, −0.98, −1.5) | barra inferior, 3.4 × 0.46 × 0.42 |
| Jambas | (±1.55, 0.15, −1.5) | 0.3 × 2.4 × 0.3 cada una — **sin montante central**: un poste a la mitad parte el juego en dos |
| Remaches | fila en y=−0.8, z=−1.32, x de −1.32 a 1.32 | 7, esféricos pequeños |
| Filo de latón | (0, −0.74, −1.36) | remate del alféizar, 3.4 × 0.07 × 0.1 |
| Portillas | (±2.3, 0.15, −0.2), giradas ~±76° en Y | anillos de bronce, radio 0.62 |
| Proa de hielo | (0, −2.3, −6.2) | cuerpo principal ≈ 5.4 u de largo, con bloques irregulares alrededor entre z=−4 y z=−6.5 |
| Tablero | (0, −1.16, −0.72), inclinado ≈ 31° hacia el jugador | 3.0 × 0.09 × 0.85 |
| Orrery | dentro del tablero, hacia la izquierda | sol central + 3 anillos concéntricos (radios ≈ 0.17 a 0.39) |
| Manómetro | dentro del tablero, hacia la derecha | cuadrante ≈ 0.19 u de radio |
| Telégrafo | dentro del tablero, centro-derecha | base + palanca |

El jugador mira a través de la ventana hacia el mundo (la proa y el espacio detrás): dentro del
marco **no** debe haber geometría que tape el centro — el 65–70 % central de la ventana queda libre
para ver el juego.

## 4. Dirección artística

- **Estilo:** el mismo lenguaje pintado y luminoso de Aerostato y Batisfera — latón victoriano, cuero
  y aquí además **hielo cristalino**, no metal ni cuero como material principal del casco.
- **Marco de la ventana (`frame_ice`):** hielo glaseado con vetas internas (sugiere profundidad, no
  transparencia real), engastando montantes de madera oscura o hueso — decide tú el acabado exacto
  dentro de la paleta. Bordes redondeados, no aristas de caja: el hielo real no tiene cantos vivos.
- **Latón (`frame_brass`, `board_brass`):** remaches, portillas, orrery, manómetro y telégrafo
  comparten el mismo latón cálido (`#c9a227`), pulido y con relieve real (no caras planas en los
  toros ni en las esferas pequeñas).
- **Proa de hielo (`comet_nose`):** cristalina, con facetas y grietas — es el cuerpo del cometa, así
  que puede llevar un brillo interior frío (emisión sutil azulada, intensidad baja) que sugiera el
  núcleo helado desprendiendo la estela. No liso ni perfectamente cónico: bloques y facetas
  irregulares, como hielo real fracturándose.
- **Tablero (`board`):** madera envejecida o hueso con vetas de escarcha, mate, sin brillo metálico.
- **Paleta:** hielo `#20415a` → `#6fa8c4` (con vetas más claras `#bee9f5`); latón `#c9a227`; tablero
  `#3d5f74`; núcleo de la proa con un asomo de `#12303f` emisivo.
- **Detalle:** el fino va en lo que se ve de cerca y fijo — remaches, vetas de hielo, facetas de la
  proa, esferas del orrery — porque el jugador lo mira toda la partida a menos de 2 u.
- **Libertad de Astra:** forma exacta de las facetas de hielo, relieve del latón, proporciones finas
  del tablero y sus instrumentos, dentro de las posiciones de referencia de la sección 3.

## 5. Renders de revisión

Cycles, 32–48 muestras, denoise, fondo espacial oscuro con un toque de nebulosa (`#0d1030` →
`#1a1440`), luz cálida tenue desde dentro de la carlinga (simula el latón) + una luz fría rasante
desde fuera (simula el espacio):

1. `render-juego.png` — cámara en (0, 0, 0) mirando hacia −Z (la vista real del jugador en reposo),
   FOV 60, 1600×900. ¿Se lee la carlinga completa: ventana, proa y tablero sin taparse entre sí?
2. `render-cerca.png` — cámara igual pero con un pequeño pitch hacia abajo (~−20°) para ver bien el
   tablero de instrumentos, FOV 60, 1600×900. Aquí se juzga el estilo del latón y la madera.
3. `render-lateral.png` — cámara girada ~60° en yaw (como con el drag del jugador) para revisar una
   portilla y una jamba de cerca, 1200×900.
4. `render-proa.png` — acercamiento a la proa de hielo sola, 1200×900, para juzgar las facetas.

## 6. Criterios de aceptación

- [ ] Frente a Three −Z, origen en (0,0,0), tamaños y presupuesto de la ficha técnica.
- [ ] Las 8 `part` de la sección 3 existen con sus pivotes correctos; `orrery_planet` trae los tres
      segmentos con el mismo pivote (centro del orrery).
- [ ] El hueco central de la ventana queda libre (65–70 %): nada de geometría cruzando el centro.
- [ ] Los tres planetas giran limpio alrededor del sol sin tambalearse (pivote exacto en el centro
      del orrery, no en cada planeta).
- [ ] La aguja del manómetro y la palanca del telégrafo giran sobre pivotes en su bisagra/centro real,
      no en un punto arbitrario.
- [ ] En `render-cerca.png` y `render-proa.png` no hay caras planas en curvas ni formas de primitiva
      suelta (nada de conos/cajas/toros reconocibles como tales).
- [ ] El `.glb` muestra el pigmento (colores de vértice conectados al material) en cada parte.
- [ ] `ENTREGA.md` trae, para `orrery_planet` (los tres radios y velocidades relativas sugeridas),
      `gauge_needle` y `beacon_lever`: eje, amplitud/rango en grados o radianes y velocidad sugerida.
- [ ] `modelar-carlinga.py` regenera `carlinga.blend`, `carlinga.glb`, `carlinga.json`, los 4 renders
      y `ENTREGA.md`, en UTF-8.
- [ ] En la carpeta quedan solo los entregables.
- [ ] El script corre con `C:\Users\Luis\blender-bpy\bpy-run.ps1` sin rutas de Codex.

## 7. Rondas

Máximo 2 rondas de corrección de Astra. Si se agotan los tokens, Claude continúa desde
`modelar-carlinga.py`. La integración (reemplazar `cab.ts`, conectar la aguja/palanca/orrery a las
lecturas reales, inspector, build, QA) la hace el integrador después de que Luis apruebe los renders.
