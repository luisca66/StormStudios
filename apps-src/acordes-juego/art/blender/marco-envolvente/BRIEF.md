# BRIEF — Marco envolvente de la cabina · Batisfera (`acordes-juego`)

> Lo escribe Claude (integrador) el 2026-09-16. Astra lee este archivo y las referencias que cita.
> Carpeta de trabajo: `apps-src/acordes-juego/art/blender/marco-envolvente/` (checkout principal, no worktree).

## 0. Por qué este encargo

A Luis **le gusta mucho la cabina actual**: consolas, pantallas, materiales y luces. Lo que se
perdió es la **sensación de estar dentro de una esfera de cristal**. La primera Batisfera tenía
un gran ventanal redondo, y la referencia (`../cabina-scifi-referencia.png`) transmite lo mismo
porque **el vidrio envuelve al piloto**: ventanal frontal y dos ventanales laterales grandes en
ángulo, separados por pilares delgados, con el cristal bajando casi hasta las consolas.

En la cabina actual (`../cabina-scifi-pov.png`) los laterales quedaron en una rendija dentro de
pilares gruesos, así que se lee como un parabrisas. **El encargo es rehacer solo el marco**,
conservando todo lo demás.

Ya publicado en el juego (no lo modeles): el mundo se ve a través de un cristal curvo
(deformación de barril, halo de borde y reflejos en arco). Tu marco va encima, sin deformar.

## 1. Qué es y dónde se ve

- Papel: estructura de la cabina alrededor del cristal, vista desde el asiento del piloto.
- Dónde: toda la partida y el menú, en las 5 zonas (de agua soleada a fosa negra).
- Cámara: fija en el origen, mirando a −Z, FOV vertical 60°. El marco no se mueve.
- Aspectos que debe cubrir: panorámico 16:9 (referencia), ultrapanorámico 21:9 y 4:3.
  Por debajo de 1.1 (teléfono vertical) basta un marco simple: ver §3.

## 2. Ficha técnica (no negociable)

| Dato | Valor |
|---|---|
| Unidades | 1 u de Three.js = 1 m de Blender |
| Ejes | Y arriba, la cámara mira a −Z |
| Sistema de encuadre | **el mismo de `../modelar-cabina.py`**: módulos anclados a bordes de pantalla. `posición = (ax · mitadAncho · d, ay · H · d, −d)`, `H = tan 30°`, `mitadAncho = H · aspecto` |
| Escala de piezas | `k = clamp(mitadAncho / 1.03, 0.45, 1)` (ya la aplica el juego) |
| Presupuesto | ≤ 60 000 triángulos en total con las consolas · mismos 8 materiales (`petrol`, `graphite`, `steel`, `rubber`, `screen`, `cyan`, `amber`, `glassEdge`) |
| Transparencias | solo `glassEdge` (reflejo de borde con degradado en `uv.y`, igual que ahora) |
| Vista libre | el **65–70 % central** de la pantalla sin barras; ningún pilar cruza el centro |
| Fondo | agua azul clara en zona 1 hasta negro en zona 5: el marco no debe depender de un fondo claro |

## 3. Módulos: qué se conserva y qué se rehace

**Conservar tal cual** (copiar su código de `../modelar-cabina.py`): `consoleL`, `consoleR`,
`consoleC`, con sus anclas, profundidades y **esquinas de pantalla exportadas** (`sonar`,
`stats`, `answers`). El HUD HTML se coloca sobre esas esquinas: no pueden cambiar de posición.

**Rehacer**: `railTop`, `header`, `cornerL/R`, `railSill`, `chamferL/R`. Propuesta (Astra puede
cambiar nombres y número de módulos si respeta el contrato):

| Módulo | Ancla | Qué es |
|---|---|---|
| `railTopC` | (0, 1), se estira entre los pilares | techo delgado sobre el ventanal frontal; aquí puede quedar la placa BTH |
| `pillarL/R` | (±0.58, 1) aprox. | pilares delgados del techo al alféizar, con cable, tira cian y poca tornillería. Inclinados hacia fuera como en la referencia |
| `railTopL/R` | se estira del pilar al borde | techo de cada ventanal lateral, **bajando hacia fuera** para dar perspectiva de cúpula |
| `edgeL/R` | (±1, 1) | cierre exterior del ventanal lateral, pegado al borde de pantalla |
| `sillC`, `sillL/R` | abajo, se estiran | alféizar frontal y laterales; el lateral más bajo que el frontal, para que el cristal baje entre consola y pilar |
| `frameNarrow` | pantalla estrecha | marco simple de una pieza para aspecto < 1.1 (puede ser el actual) |

Profundidad sugerida: frontal a `d = 1.0`; laterales y pilares entre `0.8` y `0.95` para que los
ventanales laterales se sientan más cerca, envolviendo.

### Contrato nuevo del JSON (lo integra Claude en `cockpit.ts`)

El JSON conserva el formato actual (`layout`, `materials`, `modules[]` con `name`, `anchor`,
`depth`, `stretchX`, `narrow`, `screens`, `meshes`) y **añade dos campos opcionales por módulo**:

- `span: [x0, x1]` — para módulos que se estiran solo en un tramo. Se autora con ancho 1 centrado
  en X = 0; el juego lo estira a `(x1 − x0) · mitadAncho · d` y lo centra en
  `(x0 + x1) / 2 · mitadAncho · d`. `x0` y `x1` van en fracción de `mitadAncho` (−1 a 1). Si un
  módulo tiene `span`, se ignora `anchor[0]`.
- `wide: false` — el módulo solo se dibuja en pantalla estrecha (lo contrario de `narrow: false`).

Si necesitas algo distinto, descríbelo en `ENTREGA.md` con la fórmula exacta: Claude adapta el
juego, tú no tocas el código.

## 4. Dirección artística

- Misma familia que la cabina actual: metal azul petróleo, grafito, acero satinado, cian
  contenido y pocos indicadores ámbar. **Que parezcan la misma nave.**
- De la referencia tomar: pilares articulados con cables y focos pequeños, techo segmentado que
  baja hacia los lados, ventanales laterales en ángulo. **No** tomar asientos, techo cerrado
  pesado ni los paneles que tapan la parte alta.
- Pilares delgados (≈ 4–5 % del ancho de pantalla en 16:9); el cristal manda.
- Detalle concentrado en pilares y uniones; silueta limpia en el borde del cristal.
- `glassEdge` en el contorno de **los tres** ventanales, para que el vidrio lateral se note.
- Submarino, no espacio: puede haber costillas de refuerzo tipo casco a presión, pero ninguna
  barra atraviesa el centro.
- Libertad de Astra: número de segmentos del techo, forma exacta de pilares y alféizares,
  pequeños detalles (rejillas, focos, cables), siempre dentro del presupuesto y la vista libre.

## 5. Renders de revisión

Cycles, 32–48 muestras, denoise, **fondo de agua azul medio (#2F7FB5) con un degradado más
oscuro abajo**, cámara en el origen y FOV vertical 60°, armando los módulos con la fórmula de
§2 (adaptar `layout_matrix` del script actual). Nombres fijos:

1. `render-16x9.png` — 1600×900. Es el que aprueba Luis.
2. `render-21x9.png` — 2100×900. Los tramos estirados no se deforman ni dejan huecos.
3. `render-4x3.png` — 1200×900.
4. `render-estrecho.png` — 900×1200 con `frameNarrow` y consolas en modo estrecho.
5. `render-pilar.png` — acercamiento a un pilar y la unión con el techo lateral, 1200×900.

## 6. Criterios de aceptación

- [ ] `consoleL/R/C` y sus esquinas de pantalla idénticas a las de `src/3d/assets/cabina-scifi.json` (comparar números en `ENTREGA.md`).
- [ ] En 16:9 se ven **tres ventanales**; los laterales ocupan al menos el 15 % del ancho cada uno.
- [ ] El 65–70 % central sin barras en 16:9, 21:9 y 4:3.
- [ ] Sin huecos entre módulos en 16:9, 21:9 y 4:3 (los tramos con `span` se solapan un poco).
- [ ] ≤ 60 000 triángulos y los mismos 8 materiales.
- [ ] Todo texto y dato sigue siendo HTML: no hornear números ni letras pequeñas en el modelo.
- [ ] `ENTREGA.md` documenta cada módulo (`anchor`, `span`, `depth`, `narrow`, `wide`) y cualquier fórmula nueva.
- [ ] El script corre con `bpy-run.ps1` desde la instalación de Luis y regenera todo.

## 7. Entregables

En esta carpeta: `modelar-marco.py` (a partir de `../modelar-cabina.py`, usando el mismo `kit`),
`cabina-envolvente.blend`, `cabina-envolvente.glb`, `cabina-envolvente.json` (**escríbelo aquí,
no en `src/3d/assets/`**), los 5 renders y `ENTREGA.md`.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 apps-src\acordes-juego\art\blender\marco-envolvente\modelar-marco.py
```

## 8. Rondas

Máximo 2 rondas de corrección. Si se agotan los tokens, Claude continúa desde `modelar-marco.py`.
