# BRIEF-GEMINI — Portón de madera · Walking AP Multi, La Pradera

> Lo escribió Claude el 2026-09-26. Síguelo al pie de la letra y **no lo edites**. Reglas y plantilla
> del script: `plantillas-blender/INSTRUCCIONES-GEMINI.md`. La receta ya se probó con este Blender.

| | |
|---|---|
| Carpeta (única donde escribes) | `apps-src/oido-absoluto-multi-juego/art/blender/porton/` |
| Dueño | Gemini |
| Script | `modelar-porton.py` (desde la plantilla de `INSTRUCCIONES-GEMINI.md` §4) |
| Nombre del modelo en los archivos | `porton` |
| Semilla | `SEED = 41` |

## 1. Qué es

El **portón de la muralla norte**: la compuerta del nivel. Cuando el alumno completa la racha, las dos
hojas se abren girando sobre sus bisagras y puede pasar al siguiente nivel. Madera de cuento con bandas
de hierro, postes de la misma piedra cálida del castillo.

## 2. Contrato técnico

| Dato | Valor |
|---|---|
| Frente del modelo | +Z del juego (−Y de Blender): la argolla va por esa cara |
| Partes (`ob["part"]`) | `frame` (postes y viga, estático, pivote en (0, 0, 0)); `door` segment 0 (hoja izquierda, **pivote en la bisagra** x = −3.0, altura 2.0 m); `door` segment 1 (hoja derecha, bisagra en x = +3.0, altura 2.0 m) |
| Medidas | hojas de 3 × 4 m; postes de 0.9 × 0.9 × 5 m en x = ±3.4 |
| Presupuesto | total ≤ 4 000 triángulos |
| `ao` en `kit.export_glb` | `{"distance": 0.4, "strength": 0.6}` |
| `meta` | `dict(forward="+Z", note="las hojas giran en Y alrededor de su pivote (bisagra)")` |
| `assert` del script | `assert parts == 3, parts` y `assert tris <= 4000, tris` |

## 3. Receta

### 3.1 Funciones extra (pégalas debajo de `join()` en la plantilla)

```python
def box(size_xyz, center_xyz, bevel_width, mat):
    """Caja biselada. size y center en metros de Blender (Z arriba)."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=center_xyz)
    ob = bpy.context.object
    ob.scale = size_xyz
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mod = ob.modifiers.new("Bisel", "BEVEL")
    mod.width = bevel_width
    mod.segments = 2
    apply_modifiers(ob)
    ob.data.materials.append(mat)
    return ob


def set_pivot(ob, pivot_xyz):
    """Deja la geometría donde está y mueve el origen (pivote) al punto dado."""
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.context.scene.cursor.location = pivot_xyz
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    bpy.context.scene.cursor.location = (0, 0, 0)


def door(x_from, x_to, wood, iron, name, segment):
    """Hoja de 3 m de ancho y 4 m de alto hecha de 5 tablones, con dos bandas de hierro y una argolla."""
    pieces = []
    width = abs(x_to - x_from)
    plank_w = width / 5
    tones = ["8a5a3b", "7a4e33", "9a6644", "84553a", "946040"]
    for i in range(5):
        cx = min(x_from, x_to) + plank_w * (i + 0.5)
        p = box((plank_w - 0.04, 0.22, 4.0 - rng.uniform(0.0, 0.12)), (cx, 0, 2.0), 0.03, wood)
        tone = tones[i]
        paint(p, lambda co, n, tone=tone: mix(tone, "5e3b25", 0.25 * (1 - co.z / 4.0)))
        pieces.append(p)
    for z in (0.9, 3.1):
        band = box((width - 0.1, 0.3, 0.18), ((x_from + x_to) / 2, 0, z), 0.02, iron)
        paint(band, lambda co, n: "4a4a52")
        pieces.append(band)
    # argolla junto al borde que se abre (lejos de la bisagra), en la cara de fuera (−Y de Blender = +Z del juego)
    ring_x = x_to - math.copysign(0.45, x_to - x_from)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.16, minor_radius=0.035, major_segments=16, minor_segments=6,
                                     location=(ring_x, -0.2, 2.0), rotation=(math.radians(90), 0, 0))
    ring = bpy.context.object
    apply_modifiers(ring)
    ring.data.materials.append(iron)
    paint(ring, lambda co, n: "d9a441")
    pieces.append(ring)
    ob = join(pieces, name, "door")
    ob["segment"] = segment
    set_pivot(ob, (x_from, 0, 2.0))       # bisagra: borde exterior de la hoja, a 2 m de altura
    return ob
```

### 3.2 Modelo (en la sección MODELO de la plantilla, tal cual)

```python
wood = material("Madera", roughness=0.85)
iron = material("Herrajes", roughness=0.55, metallic=0.3)
stone = material("Piedra", roughness=0.9)

# frame: dos postes de piedra con remate y una viga de madera arriba (estático)
parts_frame = []
for sx in (-3.4, 3.4):
    post = box((0.9, 0.9, 5.0), (sx, 0, 2.5), 0.06, stone)
    paint(post, lambda co, n: mix("b9a582", "e2d3b3", co.z / 5.0))
    cap = box((1.1, 1.1, 0.35), (sx, 0, 5.15), 0.05, stone)
    paint(cap, lambda co, n: "d6c49e")
    parts_frame += [post, cap]
beam = box((7.8, 0.5, 0.55), (0, 0, 4.55), 0.04, wood)
paint(beam, lambda co, n: "7a4e33")
parts_frame.append(beam)
frame = join(parts_frame, "Marco", "frame")
frame.data.materials.clear(); frame.data.materials.append(stone)
set_pivot(frame, (0, 0, 0))

# door 0 (izquierda, bisagra en x = −3.0) y door 1 (derecha, bisagra en x = +3.0)
left = door(-3.0, 0.0, wood, iron, "Hoja izquierda", 0)
right = door(3.0, 0.0, wood, iron, "Hoja derecha", 1)
for ob in (left, right):
    ob.data.materials.clear(); ob.data.materials.append(wood)
```

Después sigue la plantilla: LIMPIEZA → EXPORTAR → RENDER, con este único cambio en RENDER: **no**
pongas las piezas en fila. En su lugar, entreabre las hojas para la foto:

```python
for ob in meshes:
    if ob.get("part") == "door":
        ob.rotation_euler.z = math.radians(-25 if ob["segment"] == 0 else 25)
```

## 4. Colores

| Zona | Hex |
|---|---|
| Tablones | `8a5a3b`, `7a4e33`, `9a6644`, `84553a`, `946040`, oscureciendo hacia `5e3b25` abajo |
| Viga | `7a4e33` |
| Bandas de hierro | `4a4a52` |
| Argollas | `d9a441` |
| Postes | `b9a582` → `e2d3b3`; remates `d6c49e` |

## 5. Render

| Dato | Valor |
|---|---|
| Archivo | `render-kit.png`, 1600 × 900 |
| Fondo | `a8d8f0`, fuerza 0.5; sol `fff1d0` |
| Cámara | `cam.location = (3, -11, 3)`, mirando a `(0, 0, 2.3)`, FOV vertical 60° |

## 6. Lista de comprobación (además de `INSTRUCCIONES-GEMINI.md` §6)

- [ ] `EXPORT 3 partes`, total ≤ 4 000 (esperado: 2 436).
- [ ] En el JSON, `door` segment 0 tiene `pivot` (−3, 2, 0) y segment 1 (3, 2, 0); `frame` (0, 0, 0).
- [ ] En el render, las hojas se ven entreabiertas girando desde los postes, no desde el centro.

## 7. Entregables

`modelar-porton.py`, `porton.blend`, `porton.glb`, `porton-juego.glb`, `porton.json`, `render-kit.png` y
`ENTREGA.md` (`Lista para: revisión`). Nada más en la carpeta.
