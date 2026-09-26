# BRIEF-GEMINI — Cubo de nota · Walking AP Multi, La Pradera

> Lo escribió Claude el 2026-09-26. Síguelo al pie de la letra y **no lo edites**. Reglas y plantilla
> del script: `plantillas-blender/INSTRUCCIONES-GEMINI.md`. La receta ya se probó con este Blender.

| | |
|---|---|
| Carpeta (única donde escribes) | `apps-src/oido-absoluto-multi-juego/art/blender/cubo-nota/` |
| Dueño | Gemini |
| Script | `modelar-cubo-nota.py` (desde la plantilla de `INSTRUCCIONES-GEMINI.md` §4) |
| Nombre del modelo en los archivos | `cubo-nota` |
| Semilla | `SEED = 51` |

## 1. Qué es

El **objetivo de nota** de La Pradera: el alumno escucha una nota y camina hasta el cubo de su color. Es
una gema cúbica dentro de un marco dorado; flota y gira despacio. **El juego tiñe la gema** con el color
de la nota (12 colores), así que la gema va casi blanca.

## 2. Contrato técnico

| Dato | Valor |
|---|---|
| Partes (`ob["part"]`) | `glow` (la gema, el juego la tiñe) y `frame` (marco dorado, estático) |
| Pivote de las dos | el **centro del cubo**; en el script está a 1.2 m del suelo (`C`) |
| Medidas | marco de 1.4 m de lado; gema de 1.1 m con bordes redondeados |
| Presupuesto | total ≤ 3 000 triángulos |
| `ao` en `kit.export_glb` | `None` (se mueve y cambia de color) |
| `meta` | `dict(forward="+Z", note="glow: el juego lo tiñe con el color de la nota; pivote en el centro")` |
| `assert` del script | `assert parts == 2, parts` y `assert tris <= 3000, tris` |

## 3. Receta

### 3.1 Funciones extra (pégalas debajo de `join()` en la plantilla)

```python
def bar(p_from, p_to, radius, mat):
    """Barra cilíndrica de 8 lados entre dos puntos (Blender, Z arriba)."""
    a, b = Vector(p_from), Vector(p_to)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=radius, depth=(b - a).length, location=(a + b) / 2)
    ob = bpy.context.object
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(b - a)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    ob.data.materials.append(mat)
    return ob
```

### 3.2 Modelo (en la sección MODELO de la plantilla, tal cual)

```python
crystal = material("Cristal", roughness=0.15)
gold = material("Marco", roughness=0.35, metallic=0.6)
C = 1.2   # centro del cubo sobre el suelo del modelo (el juego lo hace flotar)
H = 0.7   # medio lado del marco (cubo de 1.4 m)

# glow: gema cúbica redondeada de 1.1 m; el juego la tiñe con el color de la nota
bpy.ops.mesh.primitive_cube_add(size=1.1, location=(0, 0, C))
gem = bpy.context.object
bev = gem.modifiers.new("Bisel", "BEVEL"); bev.width = 0.14; bev.segments = 3
apply_modifiers(gem)
gem.data.materials.append(crystal)
paint(gem, lambda co, n: mix("ffffff", "d8d8e8", max(0.0, -(co.z - C)) / 0.55))
gem = join([gem], "Gema", "glow")

# frame: las 12 aristas del cubo de 1.4 m y 8 esferitas en las esquinas
corners = [(sx * H, sy * H, C + sz * H) for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)]
edges = [(a, b) for i, a in enumerate(corners) for b in corners[i + 1:]
         if sum(1 for k in range(3) if abs(a[k] - b[k]) > 1e-6) == 1]
pieces = [bar(a, b, 0.05, gold) for a, b in edges]
for c in corners:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.1, location=c)
    s = bpy.context.object
    s.data.materials.append(gold)
    pieces.append(s)
for p in pieces:
    paint(p, lambda co, n: "d9a441")
frame = join(pieces, "Marco", "frame")

# Pivote de las dos partes en el centro del cubo, para que el juego las gire juntas
for ob in (gem, frame):
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.context.scene.cursor.location = (0, 0, C)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
bpy.context.scene.cursor.location = (0, 0, 0)
```

Después sigue la plantilla: LIMPIEZA → EXPORTAR → RENDER, con este único cambio en RENDER: **no**
pongas las piezas en fila (quita el bucle `for i, ob in enumerate(meshes)`), el cubo va armado.

## 4. Colores

| Zona | Hex |
|---|---|
| Gema | `ffffff` → `d8d8e8` hacia abajo (el juego la tiñe) |
| Marco | `d9a441`, metal 0.6, rugosidad 0.35 |

## 5. Render

| Dato | Valor |
|---|---|
| Archivo | `render-kit.png`, 1600 × 900 |
| Fondo | `a8d8f0`, fuerza 0.5; sol `fff1d0` |
| Cámara | `cam.location = (2.5, -4.5, 2.4)`, mirando a `(0, 0, 1.2)`, FOV vertical 60° |

## 6. Lista de comprobación (además de `INSTRUCCIONES-GEMINI.md` §6)

- [ ] `EXPORT 2 partes`, total ≤ 3 000 (esperado: 1 868).
- [ ] En el JSON, las dos partes tienen `pivot` (0, 1.2, 0).
- [ ] En el render se ve la gema clara dentro de un marco dorado con esferitas en las esquinas.

## 7. Entregables

`modelar-cubo-nota.py`, `cubo-nota.blend`, `cubo-nota.glb`, `cubo-nota-juego.glb`, `cubo-nota.json`,
`render-kit.png` y `ENTREGA.md` (`Lista para: revisión`). Nada más en la carpeta.
