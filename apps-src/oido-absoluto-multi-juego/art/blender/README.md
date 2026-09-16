# Arte 3D de Blender — Walking AP Multi (El Océano)

Método común y reglas: `PLAN-3D-BLENDER.md` (raíz del sitio). Plan del nivel: `../PLAN-OCEANO-BLENDER.md`.
Cada modelo vive en su carpeta con `BRIEF.md` (encargo), `modelar-<pieza>.py` (fuente reproducible),
`.blend`, `.glb`, `.json` (`kit.export_parts`), renders y `ENTREGA.md`.

Regenerar una pieza (desde su carpeta):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-<pieza>.py
```

## Piezas

| Pieza | Carpeta | Estado |
|---|---|---|
| Pez protagonista | `pez/` | ✅ integrado (2026-09-15). Modelado por **Sol** (v1 + ronda 1); Claude fundió el pedúnculo con el cuerpo, cambió el aro del ojo por párpados de piel y agrandó el iris. |
| Almeja con perla (objetivo de nota) | `almeja/` | ✅ integrada (2026-09-15). Modelada por **Astra** (v1, aprobada sin rondas). |
| Kit de arrecife (4 corales, 3 rocas, alga, anémona) | `arrecife/` | ✅ integrado (2026-09-15). Modelado por **Claude** con bpy, sin brief: es utilería instanciada. |
| Ballena jorobada | `ballena/` | ✅ integrada (2026-09-15). Modelada por **Astra** (v1 + dos revisiones propias); Claude fundió el borde de la garganta y saturó el azul pizarra. |
| Tortuga marina | `tortuga/` | ✅ integrada (2026-09-15). Modelada por **Astra** (v3, aprobada sin rondas del integrador). |
| Atlántida hundida | `atlantida/` | ✅ integrada (2026-09-16). Modelada por **Astra** (v1 con una corrección propia, aprobada sin rondas). |
| Cangrejo | `cangrejo/` | ✅ integrado (2026-09-16). Modelado por **Astra** (v3, aprobado sin cambios del integrador). |

### Pez protagonista

- 13 200 triángulos · 6 mallas · JSON 537 kB · 2.72 × 2.08 × 2.30 u (largo × alto × ancho).
- El juego lo carga en [src/3d/blender-fish.ts](../src/3d/blender-fish.ts) desde
  `src/3d/assets/pez.json` (copia del entregable; se pide al cargar el módulo, así que ya está
  en memoria cuando el jugador entra al nivel) y lo arma [player.ts](../src/3d/player.ts) `buildFish`.
- Partes y animación (de `pez/ENTREGA.md`, escrita por Sol): `body` estira ×1.15 en Z con la velocidad, `eyes`
  estáticos, `tail` guiña en Y ±0.15 rad a 6 rad/s, `fin` 0 y 1 giran en X ±0.4 rad a 10 rad/s,
  `dorsal` ondula en Z ±0.08 rad a 2 rad/s. El contenedor del pez recibe el estiramiento y el
  balanceo de reposo; la geometría ya viene proporcionada, su escala base es 1.
- El frente del modelo es +Z, igual que el avance del jugador: no lleva giro extra.
- **2026-09-16, a pedido de Luis:** el pez se ve al **50 %** del modelo (primero 70 %; Luis lo pidió aún más chico, «como Nemo») (`FISH_SCALE` en `player.ts`,
  con el radio de colisión escalado igual) y **parpadea**: los ojos pasaron de una parte `eyes` a
  dos partes `eye` (segment 0/1) con pivote en el centro del globo, y el juego las aplasta en Y a
  0.12 durante 0.14 s cada 2.5–6 s, con doble parpadeo ocasional. 7 mallas.

### Almeja con perla

- 8 640 triángulos · 6 mallas · JSON 380 kB · 3.42 u de ancho · perla ⌀ 1 u.
- Sustituye a la «piñata» de conos como objetivo de nota. La carga
  [src/3d/blender-clam.ts](../src/3d/blender-clam.ts) desde `src/3d/assets/almeja.json` y la usa
  `renderer.ts` en `buildNoteTargetMesh` (con la piñata como reserva si el JSON aún no llegó).
- **Cambio respecto al brief, decidido al integrar:** el brief la quería cerrada, abriéndose al
  acercarse el jugador. Se hizo al revés: **espera abierta con la perla encendida**, porque la perla
  es el faro que guía una búsqueda de 80–130 u, y **se cierra de golpe al tocarla**, cuando suena la
  nota. Si el jugador falla y la almeja se teletransporta, vuelve a abrirse (`reopen()`).
- La perla se tiñe con el color de la nota (pigmento y emisión) y lleva una `PointLight` del mismo
  color, alcance 90 u, que es lo que se ve de lejos. Al cerrarse, perla y luz se apagan.
- Valvas y nácar giran en X hasta −0.9 rad sobre la charnela `(0,0,−1.32)`; el manto late ±4 %.

### Kit de arrecife

- 9 variantes en un solo JSON: `coral_branch`, `coral_brain`, `coral_cup`, `coral_table`,
  `rock_a/b/c`, `kelp`, `anemone`. 7 844 triángulos **en total** (256–1 108 por variante).
- Cada variante se dibuja con un `InstancedMesh`: ~280 ejemplares por partida, 9 draw calls.
  Lo arma [src/3d/blender-reef.ts](../src/3d/blender-reef.ts); la siembra está en
  `environment.ts sowReef()` (llano + cinturón del borde, apoyados en `getFloorHeight`).
- Las algas se mecen recalculando sus matrices por cuadro; el resto es estático.
- Sustituye a los corales-esfera, las rocas-esfera y las algas-cilindro del prototipo, y viste
  la ladera del borde del mapa, que quedó pelada al quitar la pecera de vidrio.
- El pivote de todas las variantes es su base (y = 0), así que se apoyan solas en la arena.

### Ballena jorobada

- 19 434 triángulos · 5 mallas · JSON 861 kB · 39.75 × 10.06 × 21.30 u.
- La carga [src/3d/blender-whale.ts](../src/3d/blender-whale.ts) desde `src/3d/assets/ballena.json`;
  `environment.ts spawnWhale()` la cuelga de un pivote que orbita a 80 u del centro, entre −20 y
  −10 u de profundidad, con un obstáculo esférico de 12.5 u que la sigue.
- Animación (valores de `ballena/ENTREGA.md`): `tail` bate en X ±0.2 rad a 4 rad/s, las dos
  `flipper` en X ±0.1 rad a 1.5 rad/s con 0.4 rad de desfase, y `jaw` abre a 0.25 rad una vez cada
  12–20 s, con una pausa de 1 s (máquina de 4 fases, no un bucle).
- Las burbujas del espiráculo salen del punto `meta.blowhole` del propio modelo, no de una
  coordenada a mano como en el prototipo.
- **Rumbo:** la cabeza mira a +Z, así que el giro de la órbita es `-swimAngle`. Se comprobó
  midiendo el morro contra el vector de velocidad (`dot ≈ 0.99`), no a ojo: en pantalla es fácil
  confundir morro y cola a esa distancia.
- **Cola rehecha por Claude (2026-09-15)** sobre una referencia que mandó Luis: las estaciones
  de la aleta caudal (`FL` en el script) ya no dibujan una hoja simétrica, sino lóbulos
  **barridos hacia atrás** (el centro de cuerda retrocede de −19.35 en la raíz a −24.05 en la
  punta), con puntas afiladas y escotadura central marcada. Se añadió `render-cola-arriba.png`,
  vista cenital: es la única donde se juzga de verdad el recorte de la cola.
- Coste del nivel completo con la ballena dentro: 250 draw calls, 270 k triángulos, 60 fps en la PC
  de Luis (plataforma objetivo: laptop/escritorio).

### Tortuga marina

- 8 646 triángulos · 6 mallas · JSON 382 kB · 4.03 × 0.90 × 4.86 u.
- Sustituye a los 8 calamares de primitivas. La carga
  [src/3d/blender-turtle.ts](../src/3d/blender-turtle.ts); `environment.ts spawnTurtle()` pone
  **cuatro**, cada una en su órbita (radio 35–85 u, profundidad −30…0, vuelta completa en 1.5–2 min),
  escaladas ×0.9–1.4, con un obstáculo esférico de 2.5 u × escala que las sigue.
- Animación (de `tortuga/ENTREGA.md`): delanteras en Z ±0.5 rad a 1.6 rad/s, traseras en Z ±0.15 rad
  a 0.8 rad/s, cabeza ±0.12 rad en X y ±0.25 rad en Y. Cada tortuga lleva su propia fase, así que
  ninguna rema al mismo compás.
- **2026-09-16, a pedido de Luis: más gorditas.** En `modelar-tortuga.py`, `SHELL_H = 1.65`
  levanta la cúpula del caparazón y sus escudos, y `BELLY = 0.31` da más panza al plastrón: el alto
  pasó de 0.90 a 1.34 u. Pivotes, presupuesto y comprobaciones de articulaciones intactos.
- **Rumbo:** cabeza a +Z como la ballena, así que `rotation.y = -ángulo de órbita`. Comprobado
  midiendo morro contra velocidad (`dot ≈ 0.94`).
- Coste del nivel completo (pez, almeja, arrecife, ballena y 4 tortugas): 122 draw calls,
  286 k triángulos, 60 fps en la PC de Luis.

### Atlántida hundida

- 39 532 triángulos · 11 mallas · JSON 3.2 MB (**452 kB con gzip**) · 94 u de diámetro × 41 u de alto.
- La carga [src/3d/blender-atlantis.ts](../src/3d/blender-atlantis.ts); `environment.ts buildAtlantis()`
  la posa en `(0, −50, 0)`. Partes del brief (`base`, `palace`, `tower` ×4, `colonnade`, `crystal`,
  `glow`) más dos que añadió Astra para no perder acabados: `gold` (oro satinado) y `glass` (vidrio
  translúcido de cúpula y remates). Las translúcidas se dibujan a doble cara, sin escribir
  profundidad y después de la piedra.
- **Colisión desde el modelo:** los 8 cilindros de `colliders` (plataforma, palacio con arco, 4 torres
  y 2 galerías) se leen del JSON y se convierten a obstáculos del juego. Si Astra cambia la planta,
  no hay que tocar código.
- `crystal` gira (`y = t·0.5`, cabeceo `sin(t·0.3)·0.2`) con el mismo `altarCrystal` que ya animaba
  el prototipo; `glow` late `1.3 ± 0.3` a 0.5 rad/s.
- Ajustes del integrador al entrar: el claro del arrecife pasó de 68 u (la ciudad vieja medía 64 de
  radio) a **53 u**, a la medida de esta; y la colisión con cilindros ya no permite «salir por
  debajo» de un edificio apoyado en la arena (antes, en el eje del palacio, el pez quedaba atrapado).
- Coste del nivel completo: 119 draw calls, 324 k triángulos, 60 fps en la PC de Luis.

### Cangrejo

- 9 984 triángulos · 14 mallas · JSON 427 kB · 6.5 u de punta a punta de las patas.
- Sustituye a los cangrejos de primitivas. Lo arma [src/3d/blender-crab.ts](../src/3d/blender-crab.ts);
  `environment.ts spawnCrab()` pone **4** en sus rincones de siempre y `updateCrab()` los pasea en
  círculo siguiendo la altura de la arena.
- **Camina de lado:** su eje X (el de marcha, según la entrega) se alinea con la dirección de avance
  (`rotation.y = atan2(−dz, dx)`, girando por el camino corto). Medido: alineación 0.99.
- Animación: todo el cuerpo bota ±0.1 u al andar; patas en fases alternas a ±0.3 rad en X (menos que
  el ±0.4 de la entrega, porque en el extremo las puntas se hundían 0.54 u) y ±0.1 en Z; ojos ±0.15
  rad; brazos que se levantan ±0.15 rad; y cada **pinza chasquea** por su cuenta cada 3–5 s: abre
  despacio a 0.5 rad y cierra de golpe. El paso se acompasa a la velocidad real del cangrejo.
- `pincer` cuelga de su `claw` (con `attach`, conservando la charnela), como pedía la entrega.
- Coste del nivel completo: 125 draw calls, 350 k triángulos, 60 fps en la PC de Luis.

### Kit de nubes (nivel 5, Las Nubes)

- Modelado por **Claude** con bpy (`nubes/modelar-nubes.py`), a partir de la auditoría
  `AUDITORIA-NUBES-BLENDER.md`. 4 variantes en un JSON: `puff_small`, `puff_medium`,
  `puff_large`, `flat_long`; 9 000 triángulos en total. Metaballs con base aplanada; el pigmento
  de vértice guarda la luz propia (cima blanca, panza lavanda).
- [src/3d/blender-clouds.ts](../src/3d/blender-clouds.ts) arma un `InstancedMesh` por variante,
  teñido por ejemplar (paleta pastel) y con la misma deriva del prototipo. Lo siembran
  `spawnSkyClouds` (90 nubes) y `spawnBigFeatureClouds` (20 gigantes) en `environment.ts`.
- Sustituye ~540 esferas transparentes: la vista inicial pasó de 367 a 191 draw calls.
- Material Lambert con emisivo lavanda claro: sin él las panzas se veían grises.
