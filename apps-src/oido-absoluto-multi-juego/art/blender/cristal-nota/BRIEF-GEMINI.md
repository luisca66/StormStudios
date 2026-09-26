# BRIEF-GEMINI — Cristal de nota · Walking AP Multi, nivel 3 «El Cosmos»

> Lo escribió Claude el 2026-09-26. Síguelo al pie de la letra y **no lo edites**. Reglas y plantilla
> del script: `plantillas-blender/INSTRUCCIONES-GEMINI.md`. **La receta ya se probó** con este Blender
> (salida: `EXPORT 2 partes 756 triangulos 13 KB`).

| | |
|---|---|
| Carpeta (única donde escribes) | `apps-src/oido-absoluto-multi-juego/art/blender/cristal-nota/` |
| Dueño | Gemini |
| Script | `modelar-cristal-nota.py` (desde la plantilla de `INSTRUCCIONES-GEMINI.md` §4) |
| Nombre del modelo en los archivos | `cristal-nota` |
| Semilla | `SEED = 5` |

## 1. Qué es

El **objetivo de nota** de El Cosmos: el alumno canta la nota y vuela hasta este cristal-estrella. Es **casi
blanco a propósito**: el juego lo tiñe con el color de la nota, lo escala ×2.5 y hace girar el aro.

## 2. Contrato técnico

| Dato | Valor |
|---|---|
| Origen (pivote) de cada parte | centro del cristal, en (0, 0, 0); el aro también (lo rodea) |
| Partes (`ob["part"]`) | `crystal` (núcleo + puntas), `ring` (aro con 4 cuentas) |
| Presupuesto | total ≤ 4 000 triángulos (esperado 756) |
| `ao` en `kit.export_glb` | `None` |
| `meta` | `dict(forward="+Z", note="casi blanco: el juego tiñe crystal y ring con el color de la nota y los escala x2.5; ring gira")` |
| `assert` del script | `assert parts == 2, parts` y `assert tris <= 4000, tris` |

## 4. Receta paso a paso

### 4.0 Funciones extra (pégalas debajo de `join()` en la plantilla, tal cual)

```python
def ice_color(co, n):
    """Casi blanco (el juego lo tiñe): caras de arriba más claras, de abajo un poco grises."""
    return mix("c9cfe0", "ffffff", 0.5 + 0.5 * n.z)


def shard(direction, length=2.2, base=0.55, mat=None):
    """Punta de cristal facetada (cono de 5 lados) que sale del centro hacia `direction`."""
    d = Vector(direction).normalized()
    bpy.ops.mesh.primitive_cone_add(vertices=5, radius1=base, radius2=0.0, depth=length, location=(0, 0, 0))
    ob = bpy.context.object
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
    ob.location = d * (0.55 + length / 2)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=False)
    ob.data.materials.append(mat)
    paint(ob, ice_color)
    return ob


def bead(position, radius, mat):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=radius, location=position)
    ob = bpy.context.object
    ob.data.materials.append(mat)
    paint(ob, lambda co, n: "ffffff")
    return ob


def faceted(ob):
    for f in ob.data.polygons:
        f.use_smooth = False
```

### 4.1 MODELO (sección MODELO de la plantilla, tal cual)

```python
gem = material("Cristal", roughness=0.15, emission=1.0, emission_hex="ffffff")
halo = material("Aro", roughness=0.3, emission=0.8, emission_hex="ffffff")

# núcleo: icosaedro estirado hacia arriba
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.8, location=(0, 0, 0))
core = bpy.context.object
core.scale = (1, 1, 1.25)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
core.data.materials.append(gem)
paint(core, ice_color)

dirs = [(0, 0, 1), (0, 0, -1), (1, 0, 0.15), (-1, 0, -0.15), (0.15, 1, 0), (-0.15, -1, 0)]
lengths = [2.4, 1.8, 2.0, 2.0, 1.9, 1.9]
spikes = [shard(d, length=l, mat=gem) for d, l in zip(dirs, lengths)]
small = [shard(d, length=1.2, base=0.3, mat=gem) for d in [(1, 1, 0.6), (-1, 1, -0.6), (1, -1, -0.6), (-1, -1, 0.6)]]
crystal = join([core] + spikes + small, "Cristal", "crystal")
faceted(crystal)

bpy.ops.mesh.primitive_torus_add(major_segments=48, minor_segments=6, major_radius=2.6, minor_radius=0.09)
aro = bpy.context.object
aro.data.materials.append(halo)
paint(aro, lambda co, n: "ffffff")
beads = [bead((2.6 * math.cos(a), 2.6 * math.sin(a), 0), 0.22, halo) for a in [k * math.tau / 4 for k in range(4)]]
ring = join([aro] + beads, "Aro", "ring")
ring.rotation_euler = (math.radians(62), 0, 0)
bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
```

Después sigue la plantilla: LIMPIEZA → EXPORTAR (con `meta`, `ao` y `assert` de §2) → RENDER con los cambios de §6.

## 5. Colores

Casi blanco (`c9cfe0` → `ffffff`), emisión blanca: **no lo colorees**; el color lo pone el juego.

## 6. Render (cambios a la plantilla)

| Dato | Valor |
|---|---|
| Archivo | `render-kit.png`, 1600 × 900 |
| Disposición | **no** muevas las piezas (quita el bucle «en fila» de la plantilla): el aro rodea al cristal |
| Fondo | `0b1438`, fuerza 0.8 |
| Sol | color `fff1d0`, energía 4.0 |
| Cámara | `cam.location = (0, -9, 2.5)`, mirando a `Vector((0, 0, 0))`; FOV 60° |

## 7. Lista de comprobación (además de `INSTRUCCIONES-GEMINI.md` §6)

- [ ] `EXPORT 2 partes 756 triangulos`.
- [ ] Se ve una estrella de cristal de 6 puntas grandes y 4 chicas, facetada, dentro de un aro con 4 cuentas.
- [ ] Todo blanco o gris muy claro: es correcto (el juego lo tiñe). Este punto **reemplaza** al de la §6 de las instrucciones que pide que no salga blanco.

## 8. Entregables

`modelar-cristal-nota.py`, `cristal-nota.blend`, `cristal-nota.glb`, `cristal-nota-juego.glb`,
`cristal-nota.json`, `render-kit.png` y `ENTREGA.md` (`Lista para: revisión`). Nada más en la carpeta.
