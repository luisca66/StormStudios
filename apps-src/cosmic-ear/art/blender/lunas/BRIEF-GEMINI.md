# BRIEF-GEMINI — Kit de lunas · Cosmic Ear

> Lo escribió Claude el 2026-09-26. Síguelo al pie de la letra y **no lo edites**. Reglas y plantilla
> del script: `plantillas-blender/INSTRUCCIONES-GEMINI.md`. La receta ya se probó con este Blender.

| | |
|---|---|
| Carpeta (única donde escribes) | `apps-src/cosmic-ear/art/blender/lunas/` |
| Script | `modelar-lunas.py` (desde la plantilla de `INSTRUCCIONES-GEMINI.md` §4) |
| Nombre del modelo en los archivos | `lunas` |
| Semilla | `SEED = 81` |

## 1. Qué es

Las **lunas** que orbitan los planetas de Cosmic Ear: cada luna es una nota del acorde, y el juego la tiñe
con el color de esa nota y la hace brillar al cantarla. Por eso van casi blancas. Tres formas distintas.

## 2. Contrato técnico

| Dato | Valor |
|---|---|
| Origen (pivote) de cada parte | el centro de la luna, en (0, 0, 0) |
| Partes (`ob["part"]`) | `moon_smooth`, `moon_crater`, `moon_crystal` (radio ≈ 1 m; el juego las escala) |
| Presupuesto | total ≤ 6 000 triángulos |
| `ao` en `kit.export_glb` | `None` (el juego las tiñe y las hace brillar) |
| `meta` | `dict(forward="+Z", note="el juego tiñe cada luna con el color de su nota; pivote en el centro")` |
| `assert` del script | `assert parts == 3, parts` y `assert tris <= 6000, tris` |

## 3. Receta

### 3.1 Funciones extra (pégalas debajo de `join()` en la plantilla)

```python
def moon(name, part, subdivisions, radius, tex_type, noise_scale, strength, flat, light_hex, dark_hex, mat):
    """Luna de 1 m de radio aprox., centrada en (0, 0, 0). Casi blanca: el juego la tiñe con el color de su nota."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=radius, location=(0, 0, 0))
    ob = bpy.context.object
    ob.data.materials.append(mat)
    paint(ob, lambda co, n: mix(dark_hex, light_hex, 0.5 + 0.5 * co.z / radius))
    tex = bpy.data.textures.new(f"Ruido {name}", tex_type)
    tex.noise_scale = noise_scale
    mod = ob.modifiers.new("Displace", "DISPLACE")
    mod.texture = tex
    mod.strength = strength
    mod.mid_level = 0.5
    ob = join([ob], name, part)
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    if flat:
        bpy.ops.object.shade_flat()
    else:
        bpy.ops.object.shade_smooth()
    return ob
```

### 3.2 Modelo (en la sección MODELO de la plantilla, tal cual)

```python
rock = material("Luna", roughness=0.85)

# moon_smooth: luna lisa con ondulaciones suaves
moon("Luna lisa", "moon_smooth", 4, 1.0, "CLOUDS", 0.6, 0.08, False, "f4f1ea", "b9b4c8", rock)
# moon_crater: luna con cráteres (textura Voronoi, hundimientos redondos)
moon("Luna de cráteres", "moon_crater", 4, 1.0, "VORONOI", 0.35, 0.16, False, "ece8df", "a8a2b6", rock)
# moon_crystal: luna de hielo facetada (pocas caras, sombreado plano)
moon("Luna de cristal", "moon_crystal", 2, 1.0, "CLOUDS", 0.8, 0.22, True, "ffffff", "c9d3e8", rock)
```

Después sigue la plantilla: LIMPIEZA → EXPORTAR → RENDER.

## 4. Render

| Dato | Valor |
|---|---|
| Archivo | `render-kit.png`, 1600 × 900 |
| Fondo | `1a1036` (espacio violeta), fuerza 0.5; sol `fff1d0` |
| Disposición | la de la plantilla: en fila, 3 m entre centros, después de exportar |
| Cámara | `cam.location = (0, -8, 1.5)`, mirando a `(0, 0, 0)` (cambia `Vector((0, 0, 1))` por `Vector((0, 0, 0))`), FOV vertical 60° |

## 5. Lista de comprobación (además de `INSTRUCCIONES-GEMINI.md` §6)

- [ ] `EXPORT 3 partes`, total ≤ 6 000 (esperado: 2 640).
- [ ] Una luna lisa, una con cráteres y una facetada de cristal, las tres casi blancas.

## 6. Entregables

`modelar-lunas.py`, `lunas.blend`, `lunas.glb`, `lunas-juego.glb`, `lunas.json`, `render-kit.png` y
`ENTREGA.md` (`Lista para: revisión`). Nada más en la carpeta.
