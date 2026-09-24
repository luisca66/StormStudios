# BRIEF — <Nombre del modelo> · <Juego>

> Lo escribe el **integrador** (Claude o Gemini) ANTES de que Astra modele.
> Astra lee solo este archivo y las referencias que cita: **no necesita abrir el código del juego**.
> Carpeta de trabajo: `apps-src/<juego>/art/blender/<modelo>/` (checkout principal, no worktree).

## 1. Qué es y dónde se ve

- Papel en el juego: <criatura / vehículo / escenario / cabina…>
- Dónde aparece: <zona, capa, momento>
- Cuántos a la vez: <n> · Distancia típica a la cámara: <min–max u>
- Tamaño en pantalla a la distancia típica: <≈ % de la altura> → la **silueta** debe leerse a ese tamaño.

## 2. Ficha técnica (no negociable)

| Dato | Valor |
|---|---|
| Unidades | 1 u de Three.js = 1 m de Blender |
| Ejes en el juego | Y arriba; el frente del modelo mira a <−Z / +Z> |
| Origen del modelo | <centro de masa / base / pivote de montaje> |
| Tamaño total | <largo × alto × ancho en u, ±10 %> |
| Cámara del juego | perspectiva, FOV vertical <60>°, near <0.1> |
| Presupuesto | ≤ <n> triángulos · ≤ <n> mallas exportadas (≈ draw calls por ejemplar) · tipo `<protagonista/objetivo/hito/instanciado/cabina>` de `apps-src/shared-3d/presupuestos.json` |
| Luz del nivel | preset `<multi-1-pradera…>` del inspector (`apps-src/shared-3d/inspector/presets.ts`) |
| Oclusión ambiental | `ao=<{"distance": …, "strength": …} o None>` en `kit.export_glb` |
| Transparencias | <permitidas en…/evitar> |
| Fondo del juego | <color o descripción del agua/cielo/luz> |

## 3. Partes que el juego necesita por separado

Cada parte es un objeto MESH con propiedad personalizada `part` (y `segment` si aplica). El
origen del objeto es su **pivote** de animación.

| `part` | `segment` | Cuántas | Pivote | Qué hace el juego con ella |
|---|---|---|---|---|
| <body> | — | 1 | <…> | <cuerpo estático, pulso de escala…> |
| <…> | <0..n> | <…> | <…> | <destello por nota i, aleteo…> |

Materiales emisivos que el juego **tiñe o pulsa**: <partes y regla, p. ej. "glow: color de la
familia del acorde; el resto conserva su pigmento">.

## 4. Dirección artística

- Estilo del juego: <…>
- Silueta y proporciones: <…>
- Paleta: <hex…>
- Materiales: <…>
- Detalle: <dónde sí / dónde no>
- Referencias: <rutas en `referencias/` o enlaces; solo forma, no se redistribuyen>
- Libertad de Astra: <qué decide Astra dentro de estos límites>

## 5. Renders de revisión

**Luis aprueba con las capturas del inspector** (luz del nivel, distancia del juego) que genera el
integrador desde `<modelo>-juego.glb`. Los renders de Cycles son la revisión propia de Astra y la
referencia de estilo.

Cycles, 32–48 muestras, denoise, fondo <color>. Nombres fijos:

1. `render-juego.png` — <distancia típica del juego (p. ej. 25 u), FOV 60, 1600×900>: ¿se lee la silueta?
2. `render-cerca.png` — <≈ 10 u, vista 3/4, FOV 60, 1600×900>: lo que ve el jugador al activarla; aquí se juzga el estilo.
3. `render-perfil.png` — <perfil completo, 1200×900>
4. `render-detalle.png` — <acercamiento a…, 1200×900>

## 6. Criterios de aceptación

- [ ] Medidas, origen y ejes de la ficha técnica.
- [ ] Presupuesto de triángulos y mallas respetado (lo imprime `kit.export_parts`).
- [ ] Todas las partes de la sección 3 existen con `part`/`segment` y pivote correcto.
- [ ] La silueta se lee en `render-juego.png`.
- [ ] En `render-cerca.png` no hay caras planas visibles en curvas ni formas de primitiva suelta.
- [ ] El `.glb` muestra el pigmento (colores de vértice conectados al material).
- [ ] `<modelo>-juego.glb` y `<modelo>.json` salen de `kit.export_glb` sin errores.
- [ ] `ENTREGA.md` trae eje, amplitud y velocidad de animación para cada parte móvil.
- [ ] <criterios artísticos objetivos del modelo>
- [ ] El script corre con `bpy-run.ps1` desde la instalación de Luis y regenera todo.

## 7. Rondas

Máximo 2 rondas de corrección de Astra. Si se agotan los tokens, el integrador continúa desde
`modelar-<modelo>.py`.
