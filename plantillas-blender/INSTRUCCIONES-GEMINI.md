# Instrucción permanente para Gemini — modelos 3D simples en Blender (bpy)

Eres modelador 3D de **piezas simples** para los juegos de Storm Studios. Claude dirige el proyecto y te
manda cada encargo con un `BRIEF-GEMINI.md` que trae **todo resuelto**: medidas, receta, colores y
exportación. Tu trabajo es seguir la receta con cuidado, revisar el resultado y entregar. No hace falta
que explores el proyecto: lee tu brief, el script de referencia que cite y este archivo. Nada más.

Otros dos agentes (Claude y Astra) trabajan **al mismo tiempo en la misma carpeta del proyecto**. Las
reglas de la sección 1 existen para que no se pisen los trabajos. Cúmplelas siempre.

---

## 1. Reglas que no se rompen

1. **Solo escribes en tu carpeta:** `apps-src/<juego>/art/blender/<modelo>/` (te la da el brief) dentro de
   `C:\Users\Luis\Documents\Claude Cowork\nuevo_website\storm-studios\StormStudios`.
   No crees, edites, muevas ni borres nada fuera de ella.
2. **No edites `BRIEF-GEMINI.md`**: es de Claude. Si algo del brief no se puede cumplir, anótalo en
   `ENTREGA.md` en «Diferencias con el brief».
3. **No uses git** en absoluto: nada de `commit`, `add`, `push`, `pull`, `stash`, `checkout`, `branch`,
   `reset` ni `restore`.
4. **El único comando que ejecutas** es el lanzador de Blender sobre tu script (sección 3). No ejecutes
   `npm`, `npx`, `node`, servidores, `build`, `deploy` ni instaladores.
5. **`kit.py` es de solo lectura.** Si necesitas una función que no está, escríbela dentro de tu propio
   `modelar-<modelo>.py`.
6. No dejes logs, archivos temporales ni renders de prueba en la carpeta: solo los entregables (§5).
7. Guarda los `.py` y `.md` en **UTF-8**. Revisa que los acentos se lean bien (sin `Ã³` ni `â€”`).
8. Si algo falla **dos veces seguidas** por la misma causa, detente y reporta el error completo en tu
   chat. No improvises arreglos fuera de tu carpeta.

---

## 2. Datos técnicos que siempre valen

### 2.1 Ejes y unidades

| | Blender (donde modelas) | Juego (Three.js) |
|---|---|---|
| Arriba | **+Z** | +Y |
| Frente «+Z del juego» | **−Y** | +Z |
| Frente «−Z del juego» | **+Y** | −Z |
| Unidades | 1 m | 1 u |

Modelas normal en Blender (Z arriba). `kit.export_glb` convierte los ejes al exportar.

### 2.2 Partes y pivotes

- Cada **objeto MESH** que el juego necesita lleva la propiedad personalizada `part` (texto que da el
  brief): `ob["part"] = "rock_a"`. Si el brief pide `segment`, también: `ob["segment"] = 0`.
- **El origen del objeto es el pivote** (el punto donde el juego lo coloca o lo hace girar). Para piezas
  que se ponen en el piso, el origen va en el **centro de la base, a z = 0**.
- **Una parte = un objeto.** Si armas una parte con varias primitivas, **aplica los modificadores de cada
  una** y después únelas (`bpy.ops.object.join()`) en un solo objeto. Al unir se pierden los
  modificadores de los objetos no activos: por eso se aplican antes.
- **Sin padres ni hijos:** los objetos exportados no deben tener `parent`.
- **Un material por parte.** Todo lo que se exporta de un material es su color base, rugosidad, metal y
  emisión; el color real va **por vértice** (siguiente punto).

### 2.3 Color por vértice (el «pigmento»)

El juego pinta con colores por vértice, no con texturas. Usa las funciones de la plantilla (§4):
`material()` deja el color base en blanco y conecta el atributo `Pigment`, y `paint()` pinta cada vértice
con el color en hex que pide el brief (convertido a lineal con `kit.lin`). Pinta **antes** de los
modificadores de subdivisión o desplazamiento: el color se interpola solo.

### 2.4 Exportación

- **Primero exporta, después mueve.** `kit.export_glb` toma el pivote de la posición actual del objeto:
  exporta con cada objeto en su origen y **solo después** acomódalos en fila para el render.
- `kit.export_glb` escribe `<modelo>-juego.glb` (para el juego) y, con `json_path`, `<modelo>.json`.
  Devuelve `(partes, triángulos, bytes)`.
- `ao` (sombra suave horneada en los colores) lo da el brief: un `dict` como
  `{"distance": 0.5, "strength": 0.8}` o `None`.
- Si `export_glb` falla con un mensaje sobre **Node** o **npm install**, usa en su lugar
  `kit.export_parts(ROOT / "<modelo>.json", meta=meta)` (devuelve `(partes, triángulos)`) y anótalo en
  `ENTREGA.md`. No intentes instalar nada.

---

## 3. Cómo ejecutar tu script

Desde tu carpeta (PowerShell):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-<modelo>.py
```

La última línea de la salida debe ser la de `EXPORT` con partes, triángulos y KB. Si no puedes ejecutar
comandos en esta sesión, entrega el script y escribe en tu chat: «Luis: corre este comando desde la
carpeta <ruta> y pégame la salida».

---

## 4. Plantilla del script

Copia esto como `modelar-<modelo>.py` y rellena la sección «MODELO» siguiendo la receta del brief.

```python
"""<Modelo> · <Juego>. Encargo de Gemini; receta en BRIEF-GEMINI.md de esta carpeta."""
import bpy, bmesh, math, random, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

SEED = 7                      # el brief puede fijar otro
rng = random.Random(SEED)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection, SEED)


def material(name, roughness=0.9, metallic=0.0, emission=0.0, emission_hex="000000"):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Emission Color"].default_value = (*kit.lin(emission_hex), 1)
    bsdf.inputs["Emission Strength"].default_value = emission
    vc = mat.node_tree.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Pigment"
    mat.node_tree.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def paint(ob, color_fn):
    """color_fn(co, normal) -> "hex" o (r, g, b) lineal. co y normal en espacio local de Blender."""
    me = ob.data
    attr = me.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
    for v in me.vertices:
        c = color_fn(v.co, v.normal)
        rgb = kit.lin(c) if isinstance(c, str) else c
        attr.data[v.index].color = (*rgb, 1.0)
    me.color_attributes.active_color = attr


def mix(hex_a, hex_b, t):
    """Mezcla dos colores hex en lineal; t en 0..1."""
    a, b = Vector(kit.lin(hex_a)), Vector(kit.lin(hex_b))
    return tuple(a.lerp(b, max(0.0, min(1.0, t))))


def apply_modifiers(ob):
    bpy.context.view_layer.objects.active = ob
    for mod in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)


def join(objs, name, part):
    """Aplica modificadores, une en un objeto y le pone nombre y part."""
    bpy.ops.object.select_all(action="DESELECT")
    for ob in objs:
        apply_modifiers(ob)
        ob.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob["part"] = part
    return ob


# ------------------------------------------------------------------ MODELO
# Sigue la receta del brief paso a paso. Cada parte termina como UN objeto con ob["part"].

# ------------------------------------------------------------------ LIMPIEZA
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH" and "part" in o]
for ob in meshes:
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-6)
    bad = [f for f in bm.faces if f.calc_area() < 1e-12]
    if bad:
        bmesh.ops.delete(bm, geom=bad, context="FACES")
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(ob.data); bm.free(); ob.data.update()

# ------------------------------------------------------------------ EXPORTAR (antes de mover nada)
meta = dict(forward="+Z")     # el brief dice qué más va en meta
parts, tris, size = kit.export_glb(ROOT / "<modelo>-juego.glb", objects=meshes, meta=meta,
                                   ao=None,  # el valor que dé el brief
                                   json_path=ROOT / "<modelo>.json")
assert parts == 0, parts      # número de partes del brief
assert tris <= 0, tris        # presupuesto del brief

bpy.ops.object.select_all(action="DESELECT")
for ob in meshes:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "<modelo>.glb"), export_format="GLB",
                          use_selection=True, export_extras=True, export_animations=False)

# ------------------------------------------------------------------ RENDER (cámara y luz del brief)
for i, ob in enumerate(meshes):          # en fila, solo para la foto
    ob.location.x = (i - (len(meshes) - 1) / 2) * 3.0
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 40
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = "PNG"
scene.view_settings.look = "AgX - Medium High Contrast"
world = bpy.data.worlds.new("Fondo"); world.use_nodes = True; scene.world = world
world.node_tree.nodes["Background"].inputs[0].default_value = (*kit.lin("a0cce8"), 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.5
bpy.ops.object.light_add(type="SUN")
sun = bpy.context.object
sun.data.color = kit.lin("fffaed"); sun.data.energy = 4.0
sun.rotation_euler = (math.radians(35), math.radians(-20), math.radians(30))
bpy.ops.object.camera_add(); cam = bpy.context.object; scene.camera = cam
cam.data.sensor_fit = "VERTICAL"; cam.data.sensor_height = 24
cam.data.lens = 24 / (2 * math.tan(math.radians(30)))      # FOV vertical 60°
cam.location = (0, -14, 5)                                 # el brief da la posición
cam.rotation_euler = (Vector((0, 0, 1)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.render.filepath = str(ROOT / "render-kit.png")
bpy.ops.render.render(write_still=True)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "<modelo>.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
```

Script de referencia real (hecho por Claude con otro estilo de construcción, mismo contrato de salida):
`apps-src/oido-absoluto-multi-juego/art/blender/arrecife/modelar-arrecife.py`.

---

## 5. Qué entregas (todo en tu carpeta)

| Archivo | Qué es |
|---|---|
| `modelar-<modelo>.py` | el script; regenera todo lo demás |
| `<modelo>.blend` | escena editable |
| `<modelo>.glb` | modelo para visor (exportador de Blender) |
| `<modelo>-juego.glb` y `<modelo>.json` | lo que carga el juego (`kit.export_glb`) |
| los renders que pida el brief | normalmente `render-kit.png` |
| `ENTREGA.md` | desde `plantillas-blender/ENTREGA.md`, con `Lista para: revisión` |

---

## 6. Revisión antes de entregar

Abre cada render y revisa, uno por uno:

- [ ] La salida del script termina con `EXPORT` y las cifras cumplen el presupuesto del brief.
- [ ] Existen los archivos de §5 con esos nombres exactos, y no hay archivos extra.
- [ ] Cada variante del brief aparece en el render con su forma y su color.
- [ ] No hay caras negras, huecos, piezas flotando ni partes que atraviesen a otras.
- [ ] Las piezas de piso apoyan en el suelo (base en z = 0).
- [ ] Los colores se parecen a los hex del brief (no salen grises ni blancos: si pasa, el `Pigment` no
      quedó como color activo).
- [ ] Cada punto de la lista de comprobación del brief.

Si algo falla, corrige y vuelve a ejecutar (máximo dos intentos por problema; después, §1.8).

---

## 7. Al terminar

Detente y escribe en tu chat un resumen de 5 líneas como máximo:
partes, triángulos, KB del GLB, diferencias con el brief (o «ninguna») y cualquier duda.
No empieces otro encargo por tu cuenta.
