# BRIEF-GEMINI — Flores y matas de pasto · Walking AP Multi, La Pradera

> Lo escribió Claude el 2026-09-26. Síguelo al pie de la letra y **no lo edites**. Reglas y plantilla
> del script: `plantillas-blender/INSTRUCCIONES-GEMINI.md`. La receta ya se probó con este Blender.

| | |
|---|---|
| Carpeta (única donde escribes) | `apps-src/oido-absoluto-multi-juego/art/blender/flores/` |
| Dueño | Gemini |
| Script | `modelar-flores.py` (desde la plantilla de `INSTRUCCIONES-GEMINI.md` §4) |
| Nombre del modelo en los archivos | `flores` |
| Semilla | `SEED = 71` |

## 1. Qué es

Matitas de **flores de 4 colores** y **matas de pasto** que el juego siembra por cientos en el prado para
que no se vea liso. Son chiquitas (0.3–0.6 m) y se ven de 2 a 30 m: estilo de juguete, pocos polígonos.

## 2. Contrato técnico

| Dato | Valor |
|---|---|
| Origen (pivote) de cada parte | la base, en (0, 0, 0) |
| Partes (`ob["part"]`) | `flower_yellow`, `flower_pink`, `flower_white`, `flower_purple`, `grass_tuft` |
| Presupuesto | total ≤ 4 000 triángulos (se repiten cientos de veces) |
| `ao` en `kit.export_glb` | `None` |
| `meta` | `dict(forward="+Z", note="kit instanciado; pivote en la base")` |
| `assert` del script | `assert parts == 5, parts` y `assert tris <= 4000, tris` |

## 3. Receta

### 3.1 Funciones extra (pégalas debajo de `join()` en la plantilla)

```python
def flower(x, y, height, petal_hex, center_hex, stem_mat, petal_mat):
    """Una flor: tallo, 6 pétalos aplastados en círculo y botón central. Devuelve sus objetos."""
    objs = []
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.025, depth=height, location=(x, y, height / 2))
    stem = bpy.context.object
    stem.data.materials.append(stem_mat)
    paint(stem, lambda co, n: "3f8a3a")
    objs.append(stem)
    for k in range(6):
        a = math.tau * k / 6
        bpy.ops.mesh.primitive_uv_sphere_add(segments=6, ring_count=4, radius=0.09,
                                             location=(x + math.cos(a) * 0.1, y + math.sin(a) * 0.1, height))
        p = bpy.context.object
        p.scale = (1.0, 0.6, 0.25)
        p.rotation_euler = (0, 0, a)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        p.data.materials.append(petal_mat)
        paint(p, lambda co, n: petal_hex)
        objs.append(p)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=6, ring_count=4, radius=0.06, location=(x, y, height + 0.02))
    c = bpy.context.object
    c.data.materials.append(petal_mat)
    paint(c, lambda co, n: center_hex)
    objs.append(c)
    return objs


def flower_clump(name, part, petal_hex, center_hex, stem_mat, petal_mat):
    """Matita de 3 flores de distinta altura con dos hojas en la base."""
    objs = []
    for (x, y, h) in [(0, 0, 0.55), (0.18, 0.1, 0.42), (-0.14, 0.12, 0.35)]:
        objs += flower(x, y, h, petal_hex, center_hex, stem_mat, petal_mat)
    for a in (0.3, 2.4):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=6, ring_count=4, radius=0.12,
                                             location=(math.cos(a) * 0.12, math.sin(a) * 0.12, 0.05))
        leaf = bpy.context.object
        leaf.scale = (1.4, 0.5, 0.3)
        leaf.rotation_euler = (0, 0, a)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        leaf.data.materials.append(stem_mat)
        paint(leaf, lambda co, n: "4f9a3e")
        objs.append(leaf)
    ob = join(objs, name, part)
    ob.data.materials.clear()
    ob.data.materials.append(petal_mat)
    return ob


def grass_tuft(name, part, stem_mat):
    """Mata de pasto: 9 hojas finas y curvas (conos inclinados), más oscuras abajo."""
    objs = []
    for k in range(9):
        a = math.tau * k / 9 + rng.uniform(-0.2, 0.2)
        h = rng.uniform(0.35, 0.6)
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.04, radius2=0.0, depth=h,
                                        location=(math.cos(a) * 0.05, math.sin(a) * 0.05, h / 2))
        b = bpy.context.object
        b.rotation_euler = (-math.sin(a) * 0.45, math.cos(a) * 0.45, 0)   # hojas abiertas hacia afuera
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        b.data.materials.append(stem_mat)
        paint(b, lambda co, n, h=h: mix("3f7a32", "a6dc6f", (co.z + h / 2) / h))
        objs.append(b)
    return join(objs, name, part)
```

### 3.2 Modelo (en la sección MODELO de la plantilla, tal cual)

```python
stems = material("Tallos", roughness=0.8)
petals = material("Pétalos", roughness=0.6)

flower_clump("Flores amarillas", "flower_yellow", "ffd84d", "e08a1e", stems, petals)
flower_clump("Flores rosas", "flower_pink", "ff8fb1", "ffd84d", stems, petals)
flower_clump("Flores blancas", "flower_white", "ffffff", "ffc93c", stems, petals)
flower_clump("Flores lilas", "flower_purple", "b28dff", "ffe27a", stems, petals)
grass_tuft("Mata de pasto", "grass_tuft", stems)

# Pivote de todas en (0, 0, 0): la base de la matita
for ob in [o for o in bpy.context.scene.objects if o.type == "MESH" and "part" in o]:
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
```

Después sigue la plantilla: LIMPIEZA → EXPORTAR → RENDER.

## 4. Colores

| Parte | Pétalos | Centro |
|---|---|---|
| `flower_yellow` | `ffd84d` | `e08a1e` |
| `flower_pink` | `ff8fb1` | `ffd84d` |
| `flower_white` | `ffffff` | `ffc93c` |
| `flower_purple` | `b28dff` | `ffe27a` |
| Tallos y hojas | `3f8a3a`, `4f9a3e` | |
| `grass_tuft` | `3f7a32` → `a6dc6f` hacia la punta | |

## 5. Render

| Dato | Valor |
|---|---|
| Archivo | `render-kit.png`, 1600 × 900 |
| Fondo | `a8d8f0`, fuerza 0.5; sol `fff1d0` |
| Disposición | en fila, **0.9 m** entre centros (cambia el `3.0` de la plantilla), después de exportar |
| Cámara | `cam.location = (0, -3.2, 1.1)`, mirando a `(0, 0, 0.3)`, FOV vertical 60° |

## 6. Lista de comprobación (además de `INSTRUCCIONES-GEMINI.md` §6)

- [ ] `EXPORT 5 partes`, total ≤ 4 000 (esperado: unos 3 600).
- [ ] Cuatro matitas de 3 flores (amarilla, rosa, blanca, lila) y una mata de pasto con las hojas
      **abiertas hacia afuera** (no juntas en punta como un tipi).

## 7. Entregables

`modelar-flores.py`, `flores.blend`, `flores.glb`, `flores-juego.glb`, `flores.json`, `render-kit.png` y
`ENTREGA.md` (`Lista para: revisión`). Nada más en la carpeta.
