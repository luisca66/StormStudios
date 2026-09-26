"""Cubo de nota · Walking AP Multi, La Pradera. Encargo de Gemini; receta en BRIEF-GEMINI.md de esta carpeta."""
import bpy, bmesh, math, random, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

SEED = 51                      # el brief fija SEED = 51
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


def bar(p_from, p_to, radius, mat):
    """Barra cilíndrica de 8 lados entre dos puntos (Blender, Z arriba)."""
    a, b = Vector(p_from), Vector(p_to)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=radius, depth=(b - a).length, location=(a + b) / 2)
    ob = bpy.context.object
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(b - a)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    ob.data.materials.append(mat)
    return ob


# ------------------------------------------------------------------ MODELO
crystal = material("Cristal", roughness=0.15)
gold = material("Marco", roughness=0.35, metallic=0.6)
C = 1.2   # centro del cubo sobre el suelo del modelo (el juego lo hace flotar)
H = 0.7   # medio lado del marco (cubo de 1.4 m)

# glow: gema cúbica redondeada de 1.1 m; el juego la tiñe con el color de la nota
bpy.ops.mesh.primitive_cube_add(size=1.1, location=(0, 0, C))
gem = bpy.context.object
bev = gem.modifiers.new("Bisel", "BEVEL"); bev.width = 0.14; bev.segments = 3
apply_modifiers(gem)
gem.data.materials.append(crystal)
paint(gem, lambda co, n: mix("ffffff", "d8d8e8", max(0.0, -(co.z - C)) / 0.55))
gem = join([gem], "Gema", "glow")

# frame: las 12 aristas del cubo de 1.4 m y 8 esferitas en las esquinas
corners = [(sx * H, sy * H, C + sz * H) for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)]
edges = [(a, b) for i, a in enumerate(corners) for b in corners[i + 1:]
         if sum(1 for k in range(3) if abs(a[k] - b[k]) > 1e-6) == 1]
pieces = [bar(a, b, 0.05, gold) for a, b in edges]
for c in corners:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.1, location=c)
    s = bpy.context.object
    s.data.materials.append(gold)
    pieces.append(s)
for p in pieces:
    paint(p, lambda co, n: "d9a441")
frame = join(pieces, "Marco", "frame")

# Pivote de las dos partes en el centro del cubo, para que el juego las gire juntas
for ob in (gem, frame):
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.context.scene.cursor.location = (0, 0, C)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
bpy.context.scene.cursor.location = (0, 0, 0)


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
meta = dict(forward="+Z", note="glow: el juego lo tiñe con el color de la nota; pivote en el centro")
parts, tris, size = kit.export_glb(ROOT / "cubo-nota-juego.glb", objects=meshes, meta=meta,
                                   ao=None,
                                   json_path=ROOT / "cubo-nota.json")
assert parts == 2, parts
assert tris <= 3000, tris

bpy.ops.object.select_all(action="DESELECT")
for ob in meshes:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "cubo-nota.glb"), export_format="GLB",
                          use_selection=True, export_extras=True, export_animations=False)

# ------------------------------------------------------------------ RENDER (cámara y luz del brief)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 40
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = "PNG"
scene.view_settings.look = "AgX - Medium High Contrast"
world = bpy.data.worlds.new("Fondo"); world.use_nodes = True; scene.world = world
world.node_tree.nodes["Background"].inputs[0].default_value = (*kit.lin("a8d8f0"), 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.5
bpy.ops.object.light_add(type="SUN")
sun = bpy.context.object
sun.data.color = kit.lin("fff1d0"); sun.data.energy = 4.0
sun.rotation_euler = (math.radians(35), math.radians(-20), math.radians(30))
bpy.ops.object.camera_add(); cam = bpy.context.object; scene.camera = cam
cam.data.sensor_fit = "VERTICAL"; cam.data.sensor_height = 24
cam.data.lens = 24 / (2 * math.tan(math.radians(30)))      # FOV vertical 60°
cam.location = (2.5, -4.5, 2.4)
cam.rotation_euler = (Vector((0, 0, 1.2)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.render.filepath = str(ROOT / "render-kit.png")
bpy.ops.render.render(write_still=True)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "cubo-nota.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
