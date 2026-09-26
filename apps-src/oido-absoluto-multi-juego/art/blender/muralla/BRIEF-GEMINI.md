# BRIEF-GEMINI — Muralla perimetral · Walking AP Multi, La Pradera

> Lo escribió Claude el 2026-09-26. Síguelo al pie de la letra y **no lo edites**. Reglas y plantilla
> del script: `plantillas-blender/INSTRUCCIONES-GEMINI.md`. La receta ya se probó con este Blender.

| | |
|---|---|
| Carpeta (única donde escribes) | `apps-src/oido-absoluto-multi-juego/art/blender/muralla/` |
| Dueño | Gemini |
| Script | `modelar-muralla.py` (desde la plantilla de `INSTRUCCIONES-GEMINI.md` §4) |
| Nombre del modelo en los archivos | `muralla` |
| Semilla | `SEED = 31` |

## 1. Qué es

La **muralla que rodea toda La Pradera** (un cuadrado de 300 m de lado), en la misma piedra cálida del
castillo. El juego repite el tramo de 8 m unas 150 veces y pone torretas en las esquinas y junto al
portón. Se ve casi siempre de lejos (20–150 m): **pocos polígonos**, la silueta es lo que cuenta.

## 2. Contrato técnico

| Dato | Valor |
|---|---|
| Frente del modelo | no importa (el tramo es igual por las dos caras) |
| Origen (pivote) de cada parte | centro de la base, en (0, 0, 0); todo apoya en z = 0 |
| Partes (`ob["part"]`) | `wall_segment` (8 × 1.5 × 7 m, largo en X, con almenas), `wall_tower` (Ø ≈ 4.6 m, 11.2 m de alto) |
| Presupuesto | total ≤ 1 300 triángulos (se repite 150 veces) |
| `ao` en `kit.export_glb` | `{"distance": 1.0, "strength": 0.5}` |
| `meta` | `dict(forward="+Z", note="kit instanciado; tramo de 8 m a lo largo de X; pivote en la base")` |
| `assert` del script | `assert parts == 2, parts` y `assert tris <= 1300, tris` |

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
    mod.segments = 1
    apply_modifiers(ob)
    ob.data.materials.append(mat)
    return ob


def stone_color(co, z_top):
    """Piedra cálida: musgo en el primer medio metro, más clara hacia arriba, con variación suave."""
    t = max(0.0, min(1.0, co.z / max(z_top, 1e-6)))
    base = mix("b9a582", "e2d3b3", t)
    if co.z < 0.5:
        base = Vector(base).lerp(Vector(kit.lin("6f8f4a")), 0.6 * (1 - co.z / 0.5))
    k = 0.93 + 0.14 * rng.random()
    return tuple(c * k for c in base)


def world_paint(ob, z_top):
    paint(ob, lambda co, n: stone_color(co + ob.location, z_top))
```

### 3.2 Modelo (en la sección MODELO de la plantilla, tal cual)

```python
stone = material("Piedra", roughness=0.9)
roof = material("Teja", roughness=0.6)

# wall_segment: tramo de 8 m (largo en X), 1.5 m de grueso, 6 m de alto, con 4 almenas encima
body = box((8.0, 1.5, 6.0), (0, 0, 3.0), 0.08, stone)
world_paint(body, 7.0)
merlons = []
for x in (-3.0, -1.0, 1.0, 3.0):
    m = box((1.0, 1.6, 1.0), (x, 0, 6.5), 0.06, stone)
    world_paint(m, 7.0)
    merlons.append(m)
ledge = box((8.0, 1.8, 0.3), (0, 0, 5.85), 0.05, stone)
paint(ledge, lambda co, n: "d6c49e")
# piedras salientes sueltas en las dos caras, más oscuras o más claras que el muro
blocks = []
for side in (-1, 1):
    for i in range(6):
        bx = rng.uniform(-3.5, 3.5)
        bz = rng.uniform(0.8, 5.2)
        b = box((rng.uniform(0.6, 1.0), 0.12, rng.uniform(0.3, 0.45)), (bx, side * 0.78, bz), 0.03, stone)
        tone = rng.choice(["c9b58f", "a8946f", "d9c8a2"])
        paint(b, lambda co, n, tone=tone: tone)
        blocks.append(b)
wall = join([body, ledge, *merlons, *blocks], "Tramo de muralla", "wall_segment")

# wall_tower: torreta redonda de 8 m con techo cónico rojo (esquinas y junto al portón)
bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=1.8, depth=8.0, location=(0, 0, 4.0))
tower = bpy.context.object
tower.data.materials.append(stone)
world_paint(tower, 8.0)
bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=2.3, radius2=0.0, depth=3.2, location=(0, 0, 9.6))
cone = bpy.context.object
cone.data.materials.append(stone)
paint(cone, lambda co, n: mix("a83a36", "d9534f", (co.z + 1.6) / 3.2))
bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=2.0, depth=0.4, location=(0, 0, 7.8))
ring = bpy.context.object
ring.data.materials.append(stone)
paint(ring, lambda co, n: "d6c49e")
slits = []
for ang in (0.0, math.pi):
    s_ = box((0.25, 0.3, 1.1), (math.sin(ang) * 1.72, -math.cos(ang) * 1.72, 5.2), 0.02, stone)
    s_.rotation_euler = (0, 0, ang)
    paint(s_, lambda co, n: "3a2f28")
    slits.append(s_)
tw = join([tower, ring, cone, *slits], "Torreta", "wall_tower")

# Pivote en la base, en (0, 0, 0), para las dos partes
for ob in (wall, tw):
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
```

Después sigue la plantilla: LIMPIEZA → EXPORTAR → RENDER.

## 4. Colores

| Zona | Hex |
|---|---|
| Piedra, abajo → arriba | `b9a582` → `e2d3b3`, con musgo `6f8f4a` en el primer medio metro |
| Cornisas y anillo | `d6c49e` |
| Piedras salientes | `c9b58f`, `a8946f`, `d9c8a2` |
| Techo de la torreta | `a83a36` → `d9534f` |
| Aspilleras | `3a2f28` |

## 5. Render

| Dato | Valor |
|---|---|
| Archivo | `render-kit.png`, 1600 × 900 |
| Fondo | `a8d8f0`, fuerza 0.5; sol `fff1d0` |
| Disposición | en fila, **8 m** entre centros (cambia el `3.0` de la plantilla), después de exportar |
| Cámara | `cam.location = (0, -22, 6)`, mirando a `(0, 0, 4)` (cambia `Vector((0, 0, 1))` por `Vector((0, 0, 4))`), FOV vertical 60° |

## 6. Lista de comprobación (además de `INSTRUCCIONES-GEMINI.md` §6)

- [ ] `EXPORT 2 partes`, total ≤ 1 300 (esperado: 1 030).
- [ ] El tramo tiene cornisa, cuatro almenas y piedras salientes en las dos caras.
- [ ] La torreta tiene techo cónico rojo, anillo bajo el techo y dos aspilleras oscuras.

## 7. Entregables

`modelar-muralla.py`, `muralla.blend`, `muralla.glb`, `muralla-juego.glb`, `muralla.json`,
`render-kit.png` y `ENTREGA.md` (`Lista para: revisión`). Nada más en la carpeta.
