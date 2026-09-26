# BRIEF-GEMINI — Setos del laberinto · Walking AP Multi, La Pradera

> Lo escribió Claude el 2026-09-26. Síguelo al pie de la letra y **no lo edites**. Reglas y plantilla
> del script: `plantillas-blender/INSTRUCCIONES-GEMINI.md`. La receta ya se probó con este Blender.

| | |
|---|---|
| Carpeta (única donde escribes) | `apps-src/oido-absoluto-multi-juego/art/blender/setos/` |
| Dueño | Gemini |
| Script | `modelar-setos.py` (desde la plantilla de `INSTRUCCIONES-GEMINI.md` §4) |
| Nombre del modelo en los archivos | `setos` |
| Semilla | `SEED = 21` |

## 1. Qué es

Kit de **setos** para el laberinto de jardín de La Pradera (estilo cuento ilustrado, formas blandas). El
juego arma las paredes del laberinto repitiendo tramos de 4 m y 2 m en fila, y pone topiarios en
maceta como adorno. El jugador los ve de 3 a 40 m.

## 2. Contrato técnico

| Dato | Valor |
|---|---|
| Frente del modelo | no importa |
| Origen (pivote) de cada parte | centro de la base, en (0, 0, 0); todo apoya en z = 0 |
| Partes (`ob["part"]`) | `hedge_long` (4 × 2 × 2 m, largo en X), `hedge_short` (2 × 2 × 2 m), `topiary` (≈ 1.5 × 1.5 × 2.5 m) |
| Presupuesto | ≤ 4 000 triángulos por parte · 3 partes · total ≤ 12 000 |
| `ao` en `kit.export_glb` | `{"distance": 0.5, "strength": 0.6}` |
| `meta` | `dict(forward="+Z", note="kit instanciado; pivote en la base; tramos a lo largo de X")` |
| `assert` del script | `assert parts == 3, parts` y `assert tris <= 12000, tris` |

## 3. Receta

### 3.1 Funciones extra (pégalas debajo de `join()` en la plantilla)

```python
def leaf_color(co, z_max):
    """Más oscuro abajo, más claro arriba, con hojas claras y alguna flor sueltas."""
    t = max(0.0, min(1.0, co.z / max(z_max, 1e-6)))
    r = rng.random()
    if r < 0.015:
        return "ff8fb1" if rng.random() < 0.5 else "ffffff"
    if r < 0.13:
        return mix("8fcf5f", "b5e38a", t)
    return mix("2f6b3a", "4f9a3e", t / 0.6) if t < 0.6 else mix("4f9a3e", "7cc05a", (t - 0.6) / 0.4)


def leafy_block(size_xyz, bevel_width, voxel, noise_scale, strength, leaf_mat, location=(0, 0, 0)):
    """Bloque de follaje con la base en z = 0: cubo biselado, remallado, pintado y con ruido."""
    sx, sy, sz = size_xyz
    bpy.ops.mesh.primitive_cube_add(size=1, location=(location[0], location[1], location[2] + sz / 2))
    ob = bpy.context.object
    ob.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bev = ob.modifiers.new("Bisel", "BEVEL")
    bev.width = bevel_width
    bev.segments = 4
    rem = ob.modifiers.new("Remallado", "REMESH")
    rem.mode = "VOXEL"
    rem.voxel_size = voxel
    apply_modifiers(ob)
    ob.data.materials.append(leaf_mat)
    z_top = location[2] + sz
    paint(ob, lambda co, n: leaf_color(co + ob.location, z_top))
    tex = bpy.data.textures.new(f"Ruido {ob.name}", "CLOUDS")
    tex.noise_scale = noise_scale
    mod = ob.modifiers.new("Displace", "DISPLACE")
    mod.texture = tex
    mod.strength = strength
    mod.mid_level = 0.5
    return ob


def smooth_by_angle(ob, degrees=50):
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(degrees))
```

### 3.2 Modelo (en la sección MODELO de la plantilla, tal cual)

```python
leaves = material("Follaje", roughness=0.9)
pot_mat = material("Maceta", roughness=0.8)

# hedge_long: tramo de 4 m (a lo largo de X)
a = leafy_block((4.0, 2.0, 2.0), 0.45, 0.16, 0.3, 0.22, leaves)
smooth_by_angle(a)
a = join([a], "Seto largo", "hedge_long")

# hedge_short: tramo de 2 m, para completar largos impares
b = leafy_block((2.0, 2.0, 2.0), 0.45, 0.16, 0.3, 0.22, leaves)
smooth_by_angle(b)
b = join([b], "Seto corto", "hedge_short")

# topiary: maceta de barro, tronquito y bola de follaje
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.45, depth=0.6, location=(0, 0, 0.3))
pot = bpy.context.object
bev = pot.modifiers.new("Bisel", "BEVEL"); bev.width = 0.06; bev.segments = 3
apply_modifiers(pot)
pot.data.materials.append(pot_mat)
paint(pot, lambda co, n: mix("a64b2c", "d9774a", (co.z + 0.3) / 0.6))
bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.07, depth=0.7, location=(0, 0, 0.85))
trunk = bpy.context.object
trunk.data.materials.append(pot_mat)
paint(trunk, lambda co, n: "8a5a3b")
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=0.75, location=(0, 0, 1.75))
ball = bpy.context.object
ball.data.materials.append(leaves)
paint(ball, lambda co, n: leaf_color(co + Vector((0, 0, 1.75)), 2.5))
tex = bpy.data.textures.new("Ruido bola", "CLOUDS"); tex.noise_scale = 0.25
mod = ball.modifiers.new("Displace", "DISPLACE"); mod.texture = tex; mod.strength = 0.12; mod.mid_level = 0.5
c = join([pot, trunk, ball], "Topiario", "topiary")
c.data.materials.clear(); c.data.materials.append(leaves)
smooth_by_angle(c)
bpy.context.scene.cursor.location = (0, 0, 0)
bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
c["part"] = "topiary"; c.name = "Topiario"
```

Después sigue la plantilla: LIMPIEZA → EXPORTAR → RENDER.

## 4. Colores

| Zona | Hex |
|---|---|
| Follaje: sombra → medio → claro | `2f6b3a` → `4f9a3e` → `7cc05a` |
| Hojas claras sueltas (13 %) | `8fcf5f` → `b5e38a` |
| Florecitas sueltas (1.5 %) | `ff8fb1`, `ffffff` |
| Maceta de barro | `a64b2c` → `d9774a`; tronco `8a5a3b` |

## 5. Render

| Dato | Valor |
|---|---|
| Archivo | `render-kit.png`, 1600 × 900 |
| Fondo | `a8d8f0`, fuerza 0.5; sol `fff1d0` |
| Disposición | en fila, **4.5 m** entre centros (cambia el `3.0` de la plantilla), después de exportar |
| Suelo | después de exportar, un plano `bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))` con color base `(*kit.lin("6fb54f"), 1)`, **sin** `part` |
| Cámara | `cam.location = (0, -12, 4)`, mirando a `(0, 0, 1)`, FOV vertical 60° |

## 6. Lista de comprobación (además de `INSTRUCCIONES-GEMINI.md` §6)

- [ ] `EXPORT 3 partes`, total ≤ 12 000 (esperado: unos 6 700).
- [ ] Los dos tramos se ven como setos frondosos y redondeados, no como cajas lisas.
- [ ] El topiario tiene maceta anaranjada, tronquito café y bola verde.
- [ ] Todo apoya en el pasto, nada flota.

## 7. Entregables

`modelar-setos.py`, `setos.blend`, `setos.glb`, `setos-juego.glb`, `setos.json`, `render-kit.png` y
`ENTREGA.md` (`Lista para: revisión`). Nada más en la carpeta.
