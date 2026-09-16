# BRIEF — Almeja con perla (objetivo de nota) · Walking AP Multi, Nivel 2 «El Océano»

> Escrito por Claude (integrador) el 2026-09-15. Astra modela a partir de este archivo sin abrir el código.
> Carpeta de trabajo: `apps-src/oido-absoluto-multi-juego/art/blender/almeja/` (checkout principal).
> Plan del nivel: `../../../PLAN-OCEANO-BLENDER.md` · Pieza hermana ya integrada: `../pez/` (su
> `modelar-pez.py` y su `ENTREGA.md` son la mejor referencia de método y de estilo).

## 1. Qué es y dónde se ve

- Papel: **el objetivo que el jugador busca**. En cada ronda aparece una sola almeja en algún punto
  del arrecife; el jugador la busca, se acerca, y al tocarla suena la nota que debe reconocer.
  Sustituye a una «piñata» de conos que no tenía nada que ver con el mar.
- Cuántas a la vez: 1.
- Distancias: aparece a **80–130 u** del jugador (a esa distancia solo se ve el brillo de la perla,
  que el juego refuerza con su propia luz), se reconoce a **25–40 u**, y se activa al llegar a
  **3.2 u**, que es cuando el jugador la ve de cerca.
- Flota en el agua a cualquier profundidad (entre la arena y la superficie): **no se apoya en el
  suelo**. Gira despacio sobre su eje vertical y sube y baja suavemente.
- La perla se tiñe con **el color de la nota** (12 colores, de rojo a violeta), así que ese color no
  puede venir horneado en el modelo.

## 2. Ficha técnica (no negociable)

| Dato | Valor |
|---|---|
| Unidades | 1 u de Three.js = 1 m de Blender |
| Ejes en el juego | Y arriba. La almeja **abre hacia +Y**; su frente (donde se ve el interior) mira a **+Z** |
| Origen del modelo | centro de la perla, para que el giro y el rebote se vean centrados |
| Tamaño | ancho ≤ 3.6 u · alto cerrada ≈ 2.2 u · fondo ≤ 3.0 u · perla ⌀ 0.9–1.1 u |
| Cámara del juego | perspectiva, FOV vertical 60°, near 0.1 |
| Presupuesto | **≤ 9 000 triángulos** y **≤ 6 mallas exportadas** |
| Transparencias | ninguna (el juego ya usa transparencias en burbujas y agua) |
| Fondo del juego | arrecife turquesa `#1f7a99` con niebla; arena `#d9c28f`; luz de sol cálida casi vertical |

## 3. Partes que el juego necesita por separado

Cada parte es un objeto MESH con propiedad personalizada `part`. El **origen del objeto es su pivote**.

| `part` | Cuántas | Pivote | Qué hace el juego |
|---|---|---|---|
| `shell_lower` | 1 | charnela (bisagra trasera, en el eje central) | fija; sostiene la perla |
| `shell_upper` | 1 | **la misma charnela** | se abre girando en **X**: cerrada en reposo, hasta ≈ 0.9 rad al acercarse el jugador |
| `mantle` | 1 | charnela | labio carnoso del borde interior; late ±4 % de escala, muy lento |
| `pearl` | 1 | origen del modelo (0,0,0) | **el juego la tiñe con el color de la nota** y le sube la emisión al activarse |

- `pearl`: pigmento **casi blanco** (`#f6f2ea`) con emisión **1.0–1.5** y color de emisión blanco. El
  juego multiplica ese color; si la perla trae color propio, la nota se ve sucia.
- Las valvas y el manto conservan su pigmento y **no llevan emisión**.
- En reposo la almeja está **cerrada**: con `shell_upper` en 0 rad las dos valvas deben cerrar sin
  huecos ni caras que se atraviesen, y la perla debe quedar escondida salvo una rendija de luz.
- Puntos en `meta`: `hinge` = punto de la charnela y `pearlCenter` = centro de la perla, ambos en
  espacio Three.

## 4. Dirección artística

- **Estilo:** caricatura 3D amable y pulida, la misma familia del pez protagonista (`../pez/`):
  formas limpias y redondeadas, sin realismo de documental y sin caras ni ojos.
- **Silueta:** almeja gigante tipo *Tridacna*, con el borde de las valvas **ondulado en zigzag
  suave** (la seña de identidad; debe reconocerse recortada contra el agua) y costillas radiales
  marcadas que van de la charnela al borde.
- **Paleta:** valvas en crema arena `#efdfc0` con las costillas algo más oscuras `#c9ad86` y
  manchas discretas; interior nacarado muy claro `#fdf6ee` con un degradado frío `#bcd9e6` hacia el
  fondo; manto interior turquesa vivo `#3fd2c7` con borde violeta `#8f7bd6` (paleta del arrecife).
- **Materiales:** valva exterior mate con relieve (rugosidad 0.6–0.75); interior nacarado liso y
  brillante (rugosidad 0.12–0.2); perla muy lisa (rugosidad ≈ 0.05).
- **Detalle:** líneas de crecimiento suaves en el exterior, siguiendo el borde; el interior se ve de
  cerca al abrirse, así que ahí sí vale gastar triángulos.
- **Libertad de Astra:** número y grosor de las costillas, forma exacta del zigzag del borde, patrón
  de manchas, forma del manto y proporción entre valva y perla dentro de las medidas.

## 5. Renders de revisión

Cycles, 32–48 muestras, denoise, mundo `#1f7a99`, sol cálido casi vertical y ambiente azul.
La perla en los renders puede ir blanca (el color lo pone el juego). Nombres fijos:

1. `render-lejos.png` — cerrada, cámara a **35 u**, FOV 60, 1600×900: ¿se reconoce una almeja y se
   distingue el brillo de la perla por la rendija?
2. `render-cerca.png` — **abierta** (`shell_upper` a 0.9 rad), 3/4 delantero a ≈ 5 u, FOV 60, 1600×900:
   aquí se juzga el estilo, el interior nacarado y el manto.
3. `render-cerrada.png` — cerrada, 3/4 delantero a ≈ 5 u, 1200×900: comprobar que cierra sin huecos.
4. `render-perfil.png` — perfil lateral, abierta a media apertura, 1200×900: ver la charnela.

## 6. Criterios de aceptación

- [ ] Medidas, origen (centro de la perla), ejes y apertura hacia +Y de la ficha técnica.
- [ ] ≤ 9 000 triángulos y ≤ 6 mallas (lo imprime `kit.export_parts`).
- [ ] Existen `shell_lower`, `shell_upper`, `mantle` y `pearl`, con la charnela como pivote de las tres primeras.
- [ ] `shell_upper` a 0 rad cierra sin huecos y sin atravesar la valva baja; a 0.9 rad no deja ver el hueco de la charnela.
- [ ] `pearl` con pigmento casi blanco y emisión 1.0–1.5; ninguna otra parte emite.
- [ ] En `render-lejos.png` la silueta se reconoce como almeja.
- [ ] En `render-cerca.png` no hay caras planas en curvas ni formas de primitiva suelta.
- [ ] `meta.hinge` y `meta.pearlCenter` presentes.
- [ ] `almeja.json`, `.blend`, `.glb`, renders y `ENTREGA.md` regenerados por `modelar-almeja.py`.
- [ ] El script corre con `C:\Users\Luis\blender-bpy\bpy-run.ps1` sin rutas de Codex.

## 7. Rondas

Máximo 2 rondas de corrección de Astra. Si se agotan los tokens, Claude continúa desde
`modelar-almeja.py`. La integración (reemplazar el objetivo de nota, apertura al acercarse, tinte por
nota, luz de baliza y rebote al activarla) la hace el integrador tras la aprobación de Luis.
