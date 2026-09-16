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
- Coste del nivel completo con la ballena dentro: 250 draw calls, 270 k triángulos, 60 fps en la PC
  de Luis (plataforma objetivo: laptop/escritorio).
