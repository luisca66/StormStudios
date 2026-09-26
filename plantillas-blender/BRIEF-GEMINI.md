# BRIEF-GEMINI — <Nombre del modelo> · <Juego>

> Lo escribe **Claude**. Gemini lo sigue al pie de la letra y **no lo edita**.
> Todo lo que Gemini necesita está aquí, más `plantillas-blender/INSTRUCCIONES-GEMINI.md`.
> Regla para quien escribe el brief: si una medida, un color o un paso no está escrito, Gemini lo va a
> inventar. **Escríbelo.**

| | |
|---|---|
| Carpeta (única donde escribes) | `apps-src/<juego>/art/blender/<modelo>/` |
| Dueño | Gemini |
| Script | `modelar-<modelo>.py` (desde la plantilla de `INSTRUCCIONES-GEMINI.md` §4) |
| Semilla | `SEED = <n>` |

## 1. Qué es

<Dos o tres frases: qué pieza es, dónde aparece en el juego, a qué distancia la ve el jugador y cuántas
copias hay. Ej.: «Kit de rocas para el pasto de La Pradera. El juego repite cada variante unas 15 veces
a 5–40 m del jugador.»>

## 2. Contrato técnico

| Dato | Valor |
|---|---|
| Frente del modelo | <+Z del juego = −Y de Blender / no importa (pieza simétrica)> |
| Origen (pivote) de cada parte | <centro de la base, z = 0> |
| Partes (`ob["part"]`) | <rock_a, rock_b, rock_c> |
| Presupuesto | ≤ <n> triángulos **por parte** · <n> partes en total |
| `ao` en `kit.export_glb` | <`{"distance": 0.5, "strength": 0.8}` / `None`> |
| `meta` | <`dict(forward="+Z", note="...")`; puntos extra si hacen falta> |

## 3. Variantes y medidas

| `part` | Ancho X (m) | Fondo Y (m) | Alto Z (m) | Notas |
|---|---|---|---|---|
| <rock_a> | <1.4> | <1.1> | <0.7> | <la más redonda> |

## 4. Receta paso a paso

<Numerada, una variante tras otra. Cada paso con la operación exacta de bpy y sus valores. Ejemplo:>

**<rock_a>**
1. `bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1, location=(0, 0, 0))`.
2. Escala `(0.7, 0.55, 0.35)` y aplícala (`bpy.ops.object.transform_apply(scale=True)`).
3. Pinta con `paint()`: color <`mix("8c8f7e", "b7b39a", (co.z + 0.35) / 0.7)`> (más claro arriba).
4. Modificador Displace con textura Clouds (`noise_scale = 0.6`, `strength = 0.18`).
5. Sube el objeto para que la base quede en z = 0: <`ob.location.z = 0.3`>, y fija el origen en la base
   (`bpy.context.scene.cursor.location = (0, 0, 0)`; `bpy.ops.object.origin_set(type="ORIGIN_CURSOR")`).
6. `join([ob], "Roca A", "rock_a")`.

## 5. Colores

| Zona | Hex | Material (rugosidad / metal / emisión) |
|---|---|---|
| <piedra base> | <`8c8f7e`> | <`material("Roca", 0.95)`> |

## 6. Render

| Dato | Valor |
|---|---|
| Archivo | `render-kit.png`, 1600 × 900 |
| Fondo | <`a0cce8`, fuerza 0.5> |
| Disposición | <las variantes en fila, 3 m entre centros> |
| Cámara | <`cam.location = (0, -14, 5)`, mirando a `(0, 0, 1)`, FOV vertical 60°> |

## 7. Lista de comprobación (además de la de `INSTRUCCIONES-GEMINI.md` §6)

- [ ] `EXPORT <n> partes`, cada parte ≤ <n> triángulos, total ≤ <n>.
- [ ] <criterio visible 1, p. ej. «las tres rocas se distinguen por su silueta»>
- [ ] <criterio visible 2>

## 8. Entregables

`modelar-<modelo>.py`, `<modelo>.blend`, `<modelo>.glb`, `<modelo>-juego.glb`, `<modelo>.json`,
`render-kit.png` y `ENTREGA.md` (`Lista para: revisión`). Nada más en la carpeta.
