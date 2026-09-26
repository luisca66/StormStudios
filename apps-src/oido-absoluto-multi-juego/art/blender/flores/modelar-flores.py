"""Flores y matas de pasto · Walking AP Multi, La Pradera. Encargo de Gemini; receta en BRIEF-GEMINI.md."""
import bpy, bmesh, math, random, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

SEED = 71
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


# ------------------------------------------------------------------ MODELO
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
meta = dict(forward="+Z", note="kit instanciado; pivote en la base")
parts, tris, size = kit.export_glb(ROOT / "flores-juego.glb", objects=meshes, meta=meta,
                                   ao=None,
                                   json_path=ROOT / "flores.json")
assert parts == 5, parts
assert tris <= 4000, tris

bpy.ops.object.select_all(action="DESELECT")
for ob in meshes:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "flores.glb"), export_format="GLB",
                          use_selection=True, export_extras=True, export_animations=False)

# ------------------------------------------------------------------ RENDER (cámara y luz del brief)
for i, ob in enumerate(meshes):          # en fila, solo para la foto
    ob.location.x = (i - (len(meshes) - 1) / 2) * 0.9
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
cam.location = (0, -3.2, 1.1)
cam.rotation_euler = (Vector((0, 0, 0.3)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.render.filepath = str(ROOT / "render-kit.png")
bpy.ops.render.render(write_still=True)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "flores.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
