# BRIEF-GEMINI — Asteroides decorativos · Cosmic Ear

> Lo escribió Claude el 2026-09-26. Síguelo al pie de la letra y **no lo edites**. Reglas y plantilla
> del script: `plantillas-blender/INSTRUCCIONES-GEMINI.md`. **La receta ya se probó** con este Blender
> (salida: `EXPORT 3 partes 1280 triangulos 36 KB`).

| | |
|---|---|
| Carpeta (única donde escribes) | `apps-src/cosmic-ear/art/blender/asteroides/` |
| Dueño | Gemini |
| Script | `modelar-asteroides.py` (desde la plantilla de `INSTRUCCIONES-GEMINI.md` §4) |
| Nombre del modelo en los archivos | `asteroides` |
| Semilla | `SEED = 42` |

## 1. Qué es

Kit de **3 asteroides** decorativos para Cosmic Ear («sistema solar de juguete musical»). El juego repite
cada asteroide decenas de veces en cinturones alrededor de los planetas, con escala y giro aleatorios.
Estilo **low-poly facetado** (caras planas), roca violeta-gris.

## 2. Contrato técnico

| Dato | Valor |
|---|---|
| Frente del modelo | no importa (el juego los gira al azar) |
| Origen (pivote) de cada parte | **centro** del asteroide, en (0, 0, 0) (flotan: no hay suelo) |
| Partes (`ob["part"]`) | `asteroid_a`, `asteroid_b`, `asteroid_c` |
| Presupuesto | total ≤ 2 400 triángulos (esperado 320 + 320 + 640 = 1 280) |
| `ao` en `kit.export_glb` | `{"distance": 0.3, "strength": 0.6}` |
| `meta` | `dict(forward="+Z", note="kit instanciado; pivote en el centro; el juego escala 0.3-1.2")` |
| `assert` del script | `assert parts == 3, parts` y `assert tris <= 2400, tris` |

## 3. Variantes

| `part` | Radios X, Y, Z (m) antes del ruido | Carácter |
|---|---|---|
| `asteroid_a` | 0.5, 0.46, 0.44 | redondo y grumoso |
| `asteroid_b` | 0.8, 0.42, 0.44 | alargado como una papa |
| `asteroid_c` | dos rocas pegadas | conglomerado, una grande y una chica |

## 4. Receta paso a paso

### 4.0 Funciones extra (pégalas debajo de `join()` en la plantilla, tal cual)

```python
def rock_color(co, n, radius):
    """Caras que miran arriba más claras; hondonadas más oscuras."""
    t = 0.5 + 0.5 * n.z
    base = mix("3d2547", "7a6690", t)
    if (co.length / radius) < 0.8:
        base = mix("2a1838", "3d2547", t)
    return base


def asteroid_blob(radius_xyz, noise_scale, strength, location=(0, 0, 0), mat=None):
    """Icosfera con bultos grandes (CLOUDS) y cráteres (VORONOI) ya aplicados, movida a `location`
    moviendo los vértices (el objeto se queda en el origen), con material y pintada."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1, location=(0, 0, 0))
    ob = bpy.context.object
    ob.scale = radius_xyz
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    lumps = bpy.data.textures.new(f"Bultos {ob.name}", "CLOUDS")
    lumps.noise_scale = noise_scale
    mod = ob.modifiers.new("Bultos", "DISPLACE")
    mod.texture = lumps
    mod.strength = strength
    mod.mid_level = 0.5
    craters = bpy.data.textures.new(f"Crateres {ob.name}", "VORONOI")
    craters.noise_scale = 0.3
    mod = ob.modifiers.new("Crateres", "DISPLACE")
    mod.texture = craters
    mod.strength = 0.1
    mod.mid_level = 0.5
    apply_modifiers(ob)
    for v in ob.data.vertices:
        v.co += Vector(location)
    ob.data.update()
    ob.data.materials.append(mat)
    r = max(radius_xyz)
    paint(ob, lambda co, n: rock_color(co - Vector(location), n, r))
    return ob


def recenter(ob):
    """Mueve los vértices para que el centro de la caja quede en el origen del objeto."""
    xs = [v.co.x for v in ob.data.vertices]; ys = [v.co.y for v in ob.data.vertices]; zs = [v.co.z for v in ob.data.vertices]
    c = Vector(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, (min(zs) + max(zs)) / 2))
    for v in ob.data.vertices:
        v.co -= c
    ob.data.update()
    ob.location = (0, 0, 0)


def flat_shading(ob):
    for f in ob.data.polygons:
        f.use_smooth = False
```

### 4.1 MODELO (sección MODELO de la plantilla, tal cual)

```python
rock = material("Asteroide", roughness=0.9)

a = asteroid_blob((0.5, 0.46, 0.44), 0.7, 0.32, mat=rock)
a = join([a], "Asteroide A", "asteroid_a"); recenter(a); flat_shading(a)

b = asteroid_blob((0.8, 0.42, 0.44), 0.6, 0.36, mat=rock)
b = join([b], "Asteroide B", "asteroid_b"); recenter(b); flat_shading(b)

c1 = asteroid_blob((0.46, 0.42, 0.4), 0.6, 0.28, location=(-0.18, 0, 0), mat=rock)
c2 = asteroid_blob((0.32, 0.3, 0.28), 0.6, 0.2, location=(0.34, 0.08, 0.12), mat=rock)
c = join([c1, c2], "Asteroide C", "asteroid_c"); recenter(c); flat_shading(c)
```

Después sigue la plantilla tal cual: LIMPIEZA → EXPORTAR (con el `meta`, `ao` y `assert` de §2) → RENDER.

## 5. Colores

| Zona | Hex |
|---|---|
| Hondonadas | `2a1838` |
| Roca | `3d2547` |
| Caras de arriba | `7a6690` |

Un solo material `material("Asteroide", roughness=0.9)` para los tres.

## 6. Render (cambios a la plantilla)

| Dato | Valor |
|---|---|
| Archivo | `render-kit.png`, 1600 × 900 |
| Disposición | en fila, **2.5 m** entre centros (cambia el `3.0` de la plantilla por `2.5`) |
| Fondo | `1a1036`, fuerza 0.8 |
| Sol | color `fff1d0`, energía 4.0 (el resto como la plantilla) |
| Cámara | `cam.location = (0, -6, 1.5)`, mirando a `Vector((0, 0, 0))`; FOV 60° como la plantilla |
| Suelo | ninguno |

## 7. Lista de comprobación (además de `INSTRUCCIONES-GEMINI.md` §6)

- [ ] `EXPORT 3 partes 1280 triangulos` (± poco).
- [ ] Tres siluetas distintas: redondo, alargado, dos rocas pegadas (se tocan, no flotan separadas).
- [ ] Caras planas visibles (facetado), color violeta-gris; no blancos ni grises neutros.
- [ ] Sin suelo en la escena exportada.

## 8. Entregables

`modelar-asteroides.py`, `asteroides.blend`, `asteroides.glb`, `asteroides-juego.glb`,
`asteroides.json`, `render-kit.png` y `ENTREGA.md` (`Lista para: revisión`). Nada más en la carpeta.
