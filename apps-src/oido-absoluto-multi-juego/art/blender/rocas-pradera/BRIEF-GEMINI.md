# BRIEF-GEMINI — Rocas de La Pradera · Walking AP Multi

> Lo escribió Claude el 2026-09-26. Síguelo al pie de la letra y **no lo edites**. Reglas y plantilla
> del script: `plantillas-blender/INSTRUCCIONES-GEMINI.md`.

| | |
|---|---|
| Carpeta (única donde escribes) | `apps-src/oido-absoluto-multi-juego/art/blender/rocas-pradera/` |
| Dueño | Gemini |
| Script | `modelar-rocas-pradera.py` (desde la plantilla de `INSTRUCCIONES-GEMINI.md` §4) |
| Nombre del modelo en los archivos | `rocas-pradera` |
| Semilla | `SEED = 11` |

## 1. Qué es

Kit de **3 rocas** para el pasto de La Pradera, el primer nivel del juego (estilo de cuento ilustrado,
formas blandas, colores cálidos). El juego repite cada roca unas 15 veces, a 5–60 m del jugador, con
escala aleatoria de 0.5 a 1.8 y giro aleatorio. Tienen que verse como piedras redondeadas y amables,
no como cristales ni como esferas lisas.

## 2. Contrato técnico

| Dato | Valor |
|---|---|
| Frente del modelo | no importa (el juego las gira al azar) |
| Origen (pivote) de cada parte | centro de la base, en (0, 0, 0); la roca apoya en z = 0 y se hunde 0.08 m |
| Partes (`ob["part"]`) | `rock_a`, `rock_b`, `rock_c` |
| Presupuesto | ≤ 1 500 triángulos **por parte** · 3 partes · total ≤ 4 500 |
| `ao` en `kit.export_glb` | `{"distance": 0.4, "strength": 0.7}` |
| `meta` | `dict(forward="+Z", note="kit instanciado; pivote en la base; el juego escala 0.5-1.8")` |
| `assert` del script | `assert parts == 3, parts` y `assert tris <= 4500, tris` |

## 3. Variantes y medidas (antes del ruido)

| `part` | Ancho X (m) | Fondo Y (m) | Alto Z (m) | Carácter |
|---|---|---|---|---|
| `rock_a` | 1.4 | 1.1 | 0.8 | canto rodado, bajo y redondo |
| `rock_b` | 0.9 | 0.8 | 1.5 | roca alta con la punta achatada |
| `rock_c` | ~1.6 | ~1.0 | ~0.9 | grupo de tres piedras juntas |

## 4. Receta paso a paso

### 4.0 Funciones extra (pégalas debajo de `join()` en la plantilla)

```python
def stone_color(co, z_min, z_max):
    """Más clara arriba, musgo en el primer 30 % de la altura."""
    t = (co.z - z_min) / max(z_max - z_min, 1e-6)
    if t < 0.3:
        return mix("5f8f3e", "8a8270", t / 0.3)
    return mix("8a8270", "c4b99a", (t - 0.3) / 0.7)


def rock_blob(radius_xyz, subdivisions, noise_scale, strength, location=(0, 0, 0), stone_mat=None):
    """Icosfera escalada, pintada por altura y con ruido. Devuelve el objeto (modificador sin aplicar)."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1, location=location)
    ob = bpy.context.object
    ob.scale = radius_xyz
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(stone_mat)
    rx, ry, rz = radius_xyz
    paint(ob, lambda co, n: stone_color(co, -rz, rz))
    tex = bpy.data.textures.new(f"Ruido {ob.name}", "CLOUDS")
    tex.noise_scale = noise_scale
    mod = ob.modifiers.new("Displace", "DISPLACE")
    mod.texture = tex
    mod.strength = strength
    mod.mid_level = 0.5
    return ob


def sit_on_ground(ob, sink=0.08):
    """Aplica modificadores y baja la malla para que su punto más bajo quede a -sink.
    El origen del objeto se queda en (0, 0, 0): ese es el pivote."""
    apply_modifiers(ob)
    z_min = min(v.co.z for v in ob.data.vertices)
    for v in ob.data.vertices:
        v.co.z -= z_min + sink
    ob.data.update()


def flatten_top(ob, keep_fraction):
    """Corta la punta: ningún vértice pasa de keep_fraction de la altura."""
    zs = [v.co.z for v in ob.data.vertices]
    z_min, z_max = min(zs), max(zs)
    cap = z_min + (z_max - z_min) * keep_fraction
    for v in ob.data.vertices:
        v.co.z = min(v.co.z, cap)
    ob.data.update()


def smooth_by_angle(ob, degrees=40):
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(degrees))
```

### 4.1 Material (en la sección MODELO, antes de las rocas)

```python
stone = material("Piedra", roughness=0.95)
```

### 4.2 `rock_a` — canto rodado

1. `a = rock_blob((0.7, 0.55, 0.4), 4, noise_scale=0.35, strength=0.30, stone_mat=stone)`
2. `sit_on_ground(a)`
3. `smooth_by_angle(a)`
4. `a = join([a], "Roca A", "rock_a")`

### 4.3 `rock_b` — roca alta con la punta achatada

1. `b = rock_blob((0.45, 0.4, 0.75), 4, noise_scale=0.35, strength=0.35, stone_mat=stone)`
2. Inclínala un poco: `b.rotation_euler = (math.radians(8), math.radians(-6), 0)` y
   `bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)` (con `b` activo y
   seleccionado).
3. `sit_on_ground(b)`
4. `flatten_top(b, 0.85)`
5. `smooth_by_angle(b)`
6. `b = join([b], "Roca B", "rock_b")`

### 4.4 `rock_c` — grupo de tres piedras

1. Tres piedras con subdivisión 3:
   - `c1 = rock_blob((0.5, 0.45, 0.42), 3, 0.3, 0.20, location=(0, 0, 0), stone_mat=stone)`
   - `c2 = rock_blob((0.34, 0.3, 0.28), 3, 0.3, 0.16, location=(0.62, 0.18, 0), stone_mat=stone)`
   - `c3 = rock_blob((0.24, 0.22, 0.2), 3, 0.3, 0.12, location=(-0.5, -0.3, 0), stone_mat=stone)`
2. `c = join([c1, c2, c3], "Roca C", "rock_c")` (ya las une en un objeto con origen en el de `c1`).
3. Asegura que el origen quede en (0, 0, 0): `c.location` debe ser `(0, 0, 0)`; si no, pon el cursor en
   el origen (`bpy.context.scene.cursor.location = (0, 0, 0)`) y usa
   `bpy.ops.object.origin_set(type="ORIGIN_CURSOR")` con `c` activo y seleccionado.
4. `sit_on_ground(c)`
5. `smooth_by_angle(c)`
6. Vuelve a poner `c["part"] = "rock_c"` y `c.name = "Roca C"` (por si alguna operación los cambió).

Después sigue la plantilla tal cual: LIMPIEZA → EXPORTAR → RENDER.

## 5. Colores

| Zona | Hex | Material |
|---|---|---|
| Musgo (base) | `5f8f3e` | `material("Piedra", roughness=0.95)`, un solo material para las tres |
| Piedra media | `8a8270` | |
| Piedra clara (arriba) | `c4b99a` | |

## 6. Render

| Dato | Valor |
|---|---|
| Archivo | `render-kit.png`, 1600 × 900 |
| Fondo | `a8d8f0`, fuerza 0.5 (cambia el hex de la plantilla) |
| Disposición | la de la plantilla: en fila, 3 m entre centros (**después** de exportar) |
| Suelo | agrega después de exportar un plano de pasto: `bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))`, con un material de color base `(*kit.lin("6fb54f"), 1)`; **sin** `part` |
| Cámara | `cam.location = (0, -9, 3)`, mirando a `(0, 0, 0.5)` (cambia `Vector((0, 0, 1))` por `Vector((0, 0, 0.5))`), FOV vertical 60° |
| Sol | el de la plantilla con color `fff1d0` |

## 7. Lista de comprobación (además de `INSTRUCCIONES-GEMINI.md` §6)

- [ ] `EXPORT 3 partes`, total ≤ 4 500 triángulos (esperado: 1 280 + 1 280 + 960 = 3 520).
- [ ] Las tres rocas se distinguen por su silueta: baja y redonda, alta y achatada, grupo de tres.
- [ ] La piedra se ve color arena cálida, no gris. En Cycles sale más clara y el musgo casi no se nota: es normal, no lo corrijas (Luis aprueba con capturas del juego).
- [ ] Ninguna roca flota: todas se hunden un poco en el plano de pasto.
- [ ] Las rocas tienen bultos y hendiduras irregulares, no parecen huevos lisos.

## 8. Entregables

`modelar-rocas-pradera.py`, `rocas-pradera.blend`, `rocas-pradera.glb`, `rocas-pradera-juego.glb`,
`rocas-pradera.json`, `render-kit.png` y `ENTREGA.md` (`Lista para: revisión`). Nada más en la carpeta.
