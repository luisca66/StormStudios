# BRIEF-GEMINI — Árboles de La Pradera · Walking AP Multi

> Lo escribió Claude el 2026-09-26. Síguelo al pie de la letra y **no lo edites**. Reglas y plantilla
> del script: `plantillas-blender/INSTRUCCIONES-GEMINI.md`. La receta ya se probó con este Blender.

| | |
|---|---|
| Carpeta (única donde escribes) | `apps-src/oido-absoluto-multi-juego/art/blender/arboles/` |
| Dueño | Gemini |
| Script | `modelar-arboles.py` (desde la plantilla de `INSTRUCCIONES-GEMINI.md` §4) |
| Nombre del modelo en los archivos | `arboles` |
| Semilla | `SEED = 61` |

## 1. Qué es

Kit de **3 árboles y 1 arbusto** de cuento: troncos chaparritos con copas grandotas y redondas. El juego
planta unos 90 por el pasto con escala de 0.75 a 1.8 y giro al azar. Se ven de 5 a 150 m.

## 2. Contrato técnico

| Dato | Valor |
|---|---|
| Frente del modelo | no importa |
| Origen (pivote) de cada parte | la base del tronco, en (0, 0, 0) |
| Partes (`ob["part"]`) | `tree_round`, `tree_tall`, `tree_wide`, `bush` |
| Presupuesto | total ≤ 8 000 triángulos (se repiten ~90 veces) |
| `ao` en `kit.export_glb` | `{"distance": 1.2, "strength": 0.7}` |
| `meta` | `dict(forward="+Z", note="kit instanciado; pivote en la base del tronco")` |
| `assert` del script | `assert parts == 4, parts` y `assert tris <= 8000, tris` |

## 3. Receta

### 3.1 Funciones extra (pégalas debajo de `join()` en la plantilla)

```python
def trunk(height, r_bottom, r_top, bark_mat):
    """Tronco cónico con la base en z = 0, corteza más oscura abajo."""
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=r_bottom, radius2=r_top, depth=height,
                                    location=(0, 0, height / 2))
    ob = bpy.context.object
    ob.data.materials.append(bark_mat)
    paint(ob, lambda co, n: mix("4a3226", "7a5236", (co.z + height / 2) / height))
    return ob


def canopy_blob(center, radius, squash, dark_hex, light_hex, noise_scale, strength, leaf_mat):
    """Bola de follaje: icosfera deformada, más clara arriba, con hojas claras sueltas."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=radius, location=center)
    ob = bpy.context.object
    ob.scale = (1.0, 1.0, squash)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(leaf_mat)

    def color(co, n):
        t = max(0.0, min(1.0, (co.z / (radius * squash) + 1) / 2))
        if rng.random() < 0.1:
            return mix(light_hex, "c8ec9a", 0.4)
        return mix(dark_hex, light_hex, t)

    paint(ob, color)
    tex = bpy.data.textures.new(f"Ruido {ob.name}", "CLOUDS")
    tex.noise_scale = noise_scale
    mod = ob.modifiers.new("Displace", "DISPLACE")
    mod.texture = tex
    mod.strength = strength
    mod.mid_level = 0.5
    return ob


def tree(name, part, trunk_h, blobs, dark_hex, light_hex, bark_mat, leaf_mat):
    """blobs: lista de (x, y, z, radio, aplastado). Todo en una parte, pivote en la base del tronco."""
    pieces = [trunk(trunk_h, 0.3, 0.17, bark_mat)] if trunk_h > 0 else []
    for (x, y, z, r, sq) in blobs:
        pieces.append(canopy_blob((x, y, z), r, sq, dark_hex, light_hex, 0.5, r * 0.28, leaf_mat))
    ob = join(pieces, name, part)
    ob.data.materials.clear()
    ob.data.materials.append(leaf_mat)
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(80))
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    return ob
```

### 3.2 Modelo (en la sección MODELO de la plantilla, tal cual)

```python
bark = material("Corteza", roughness=0.95)
leaves = material("Follaje", roughness=0.85)

# tree_round: copa redonda grandota sobre tronco chaparrito (el árbol típico de La Pradera)
tree("Árbol redondo", "tree_round", 2.6,
     [(0, 0, 3.9, 2.3, 0.9), (1.1, 0.3, 4.4, 1.6, 0.85), (-1.0, -0.4, 4.3, 1.7, 0.85)],
     "2e7d32", "7cc05a", bark, leaves)
# tree_tall: copa ovalada alta
tree("Árbol alto", "tree_tall", 3.0,
     [(0, 0, 4.6, 1.7, 1.45), (0.3, 0.2, 6.3, 1.2, 1.2)],
     "1e6b3c", "5fb35a", bark, leaves)
# tree_wide: copa ancha de tres bolas
tree("Árbol ancho", "tree_wide", 2.2,
     [(-1.4, 0, 3.4, 1.8, 0.8), (1.4, 0.2, 3.5, 1.8, 0.8), (0, -0.2, 4.3, 1.9, 0.85)],
     "388e3c", "8fcf5f", bark, leaves)
# bush: arbusto bajo sin tronco
tree("Arbusto", "bush", 0,
     [(0, 0, 0.55, 0.9, 0.75), (0.8, 0.2, 0.45, 0.7, 0.75), (-0.7, -0.2, 0.45, 0.7, 0.75)],
     "2f6b3a", "7cc05a", bark, leaves)
```

Después sigue la plantilla: LIMPIEZA → EXPORTAR → RENDER.

## 4. Colores

| Zona | Hex |
|---|---|
| Corteza | `4a3226` → `7a5236` |
| Copas (oscuro → claro) | `tree_round` `2e7d32`→`7cc05a` · `tree_tall` `1e6b3c`→`5fb35a` · `tree_wide` `388e3c`→`8fcf5f` · `bush` `2f6b3a`→`7cc05a` |
| Hojas claras sueltas | mezcla hacia `c8ec9a` |

## 5. Render

| Dato | Valor |
|---|---|
| Archivo | `render-kit.png`, 1600 × 900 |
| Fondo | `a8d8f0`, fuerza 0.5; sol `fff1d0` |
| Disposición | en fila, **7 m** entre centros (cambia el `3.0` de la plantilla), después de exportar |
| Cámara | `cam.location = (0, -24, 5)`, mirando a `(0, 0, 3)`, FOV vertical 60° |

## 6. Lista de comprobación (además de `INSTRUCCIONES-GEMINI.md` §6)

- [ ] `EXPORT 4 partes`, total ≤ 8 000 (esperado: unos 3 600).
- [ ] Tres árboles distintos (redondo, alto, ancho) y un arbusto bajo sin tronco.
- [ ] Las copas son verdes con manchas claras, no grises; los troncos, cafés.

## 7. Entregables

`modelar-arboles.py`, `arboles.blend`, `arboles.glb`, `arboles-juego.glb`, `arboles.json`,
`render-kit.png` y `ENTREGA.md` (`Lista para: revisión`). Nada más en la carpeta.
