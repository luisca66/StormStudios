# BRIEF-GEMINI — Planetas de fondo · Walking AP Multi, nivel 3 «El Cosmos»

> Lo escribió Claude el 2026-09-26. Síguelo al pie de la letra y **no lo edites**. Reglas y plantilla
> del script: `plantillas-blender/INSTRUCCIONES-GEMINI.md`. **La receta ya se probó** con este Blender
> (salida: `EXPORT 5 partes 13952 triangulos 83 KB`).

| | |
|---|---|
| Carpeta (única donde escribes) | `apps-src/oido-absoluto-multi-juego/art/blender/planetas-cosmos/` |
| Dueño | Gemini |
| Script | `modelar-planetas-cosmos.py` (desde la plantilla de `INSTRUCCIONES-GEMINI.md` §4) |
| Nombre del modelo en los archivos | `planetas-cosmos` |
| Semilla | `SEED = 33` |

## 1. Qué es

Tres **planetas de fondo** para El Cosmos («cosmos de libro de cuentos: noche azul profunda»): caramelos
con personalidad, no realistas. El juego los pone lejos (a 250–330 m) y los escala a radio 14–20 m; los
anillos giran despacio.

## 2. Contrato técnico

| Dato | Valor |
|---|---|
| Origen (pivote) de cada parte | centro del planeta, en (0, 0, 0); los anillos también |
| Partes (`ob["part"]`) | `planet_a`, `ring_a`, `planet_b`, `planet_c`, `ring_c` |
| Presupuesto | total ≤ 16 000 triángulos (esperado 13 952) |
| `ao` en `kit.export_glb` | `None` |
| `meta` | `dict(forward="+Z", note="radio 1; el juego los escala a 14-20 m; ring_a y ring_c giran en su eje")` |
| `assert` del script | `assert parts == 5, parts` y `assert tris <= 16000, tris` |

## 3. Variantes

| Parte | Carácter |
|---|---|
| `planet_a` + `ring_a` | rayas coral, durazno y crema; anillo turquesa grueso |
| `planet_b` | turquesa con cráteres suaves, sin anillo |
| `planet_c` + `ring_c` | rayas lavanda y rosa; anillo amarillo-coral delgado inclinado al revés |

## 4. Receta paso a paso

### 4.0 Funciones extra (pégalas debajo de `join()` en la plantilla, tal cual)

```python
BANDS_A = ["ff7a6b", "ffb38a", "fff0d6", "ffb38a", "ff7a6b", "e0525a", "ff7a6b", "ffb38a"]
BANDS_C = ["b8a4ff", "ff8fd8", "e6ddff", "b8a4ff", "8f7ae6", "ff8fd8", "b8a4ff", "e6ddff"]


def banded(bands):
    """Rayas horizontales por altura (co.z de -1 a 1), con borde suave entre franjas."""
    def fn(co, n):
        u = (co.z + 1) / 2 * len(bands)
        i = min(int(u), len(bands) - 1)
        j = min(i + 1, len(bands) - 1)
        f = u - int(u)
        return mix(bands[i], bands[j], max(0.0, (f - 0.8) / 0.2))
    return fn


def planet_ball(color_fn, mat, wobble=0.02):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=1, location=(0, 0, 0))
    ob = bpy.context.object
    ob.data.materials.append(mat)
    paint(ob, color_fn)
    if wobble > 0:
        tex = bpy.data.textures.new(f"Ondas {ob.name}", "CLOUDS")
        tex.noise_scale = 0.8
        mod = ob.modifiers.new("Ondas", "DISPLACE")
        mod.texture = tex
        mod.strength = wobble
    for f in ob.data.polygons:
        f.use_smooth = True
    return ob


def ring(inner_hex, outer_hex, mat, radius=1.85, width=0.38, tilt_deg=18):
    """Anillo plano y grueso alrededor del planeta, inclinado; pintado del borde interior al exterior."""
    bpy.ops.mesh.primitive_torus_add(major_segments=64, minor_segments=8, major_radius=radius, minor_radius=width)
    ob = bpy.context.object
    ob.scale = (1, 1, 0.14)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(mat)
    paint(ob, lambda co, n: mix(inner_hex, outer_hex, (Vector((co.x, co.y)).length - (radius - width)) / (2 * width)))
    ob.rotation_euler = (math.radians(tilt_deg), 0, 0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    for f in ob.data.polygons:
        f.use_smooth = True
    return ob


def crater_color(co, n):
    """Turquesa más claro arriba; el fondo de los cráteres (más hundido) se oscurece poco a poco."""
    lit = Vector(mix("1fa89c", "7ff0e4", 0.5 + 0.5 * co.z))
    deep = Vector(mix("0f5f59", "1a8a80", 0.5 + 0.5 * co.z))
    return tuple(lit.lerp(deep, max(0.0, min(1.0, (1.0 - co.length) / 0.07))))
```

### 4.1 MODELO (sección MODELO de la plantilla, tal cual)

```python
skin = material("Planeta", roughness=0.7)
ring_mat = material("Anillo", roughness=0.5, emission=0.15, emission_hex="ffe66d")

a = planet_ball(banded(BANDS_A), skin)
a = join([a], "Planeta A", "planet_a")
ra = ring("22c7b8", "7ff0e4", ring_mat)
ra = join([ra], "Anillo A", "ring_a")

b = planet_ball(crater_color, skin, wobble=0.0)
cr = bpy.data.textures.new("Crateres", "VORONOI")
cr.noise_scale = 0.35
mod = b.modifiers.new("Crateres", "DISPLACE")
mod.texture = cr
mod.strength = 0.08
mod.mid_level = 0.8
b = join([b], "Planeta B", "planet_b")
paint_again = b.data.color_attributes.get("Pigment")
b.data.color_attributes.remove(paint_again)
paint(b, crater_color)                      # se repinta después del desplazamiento para ver los cráteres

c = planet_ball(banded(BANDS_C), skin)
c = join([c], "Planeta C", "planet_c")
rc = ring("ffe66d", "ff9e7a", ring_mat, radius=1.7, width=0.3, tilt_deg=-24)
rc = join([rc], "Anillo C", "ring_c")
```

Después sigue la plantilla: LIMPIEZA → EXPORTAR (con `meta`, `ao` y `assert` de §2) → RENDER con los cambios de §6.

## 5. Colores

Los da la receta (listas `BANDS_A` y `BANDS_C`, `crater_color` y los hex de `ring`). Dos materiales:
`Planeta` (rugosidad 0.7) y `Anillo` (rugosidad 0.5, emisión `ffe66d` 0.15).

## 6. Render (cambios a la plantilla)

| Dato | Valor |
|---|---|
| Archivo | `render-kit.png`, 1600 × 900 |
| Disposición | en lugar del bucle «en fila» de la plantilla, cada anillo va con su planeta: `SLOT = {"planet_a": -3.6, "ring_a": -3.6, "planet_b": 0.0, "planet_c": 3.6, "ring_c": 3.6}` y `for ob in meshes: ob.location.x = SLOT[ob["part"]]` |
| Fondo | `0b1438`, fuerza 0.8 |
| Sol | color `fff1d0`, energía 4.0 |
| Cámara | `cam.location = (0, -11, 2.5)`, mirando a `Vector((0, 0, 0))`; FOV 60° |

## 7. Lista de comprobación (además de `INSTRUCCIONES-GEMINI.md` §6)

- [ ] `EXPORT 5 partes 13952 triangulos` (± poco).
- [ ] Cada anillo rodea a su planeta en el render (no quedan sueltos).
- [ ] Los cráteres de `planet_b` se ven como hondonadas más oscuras, no como manchas cuadradas.
- [ ] Colores vivos de caramelo, nada gris.

## 8. Entregables

`modelar-planetas-cosmos.py`, `planetas-cosmos.blend`, `planetas-cosmos.glb`, `planetas-cosmos-juego.glb`,
`planetas-cosmos.json`, `render-kit.png` y `ENTREGA.md` (`Lista para: revisión`). Nada más en la carpeta.
