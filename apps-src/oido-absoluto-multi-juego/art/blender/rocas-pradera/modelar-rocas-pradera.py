"""Rocas de La Pradera · Walking AP Multi. Encargo de Gemini; receta en BRIEF-GEMINI.md de esta carpeta."""
import bpy, bmesh, math, random, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

SEED = 11
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


# ------------------------------------------------------------------ FUNCIONES BRIEF §4.0
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


# ------------------------------------------------------------------ MODELO
stone = material("Piedra", roughness=0.95)

# 4.2 rock_a — canto rodado
a = rock_blob((0.7, 0.55, 0.4), 4, noise_scale=0.35, strength=0.30, stone_mat=stone)
sit_on_ground(a)
smooth_by_angle(a)
a = join([a], "Roca A", "rock_a")

# 4.3 rock_b — roca alta con la punta achatada
b = rock_blob((0.45, 0.4, 0.75), 4, noise_scale=0.35, strength=0.35, stone_mat=stone)
b.rotation_euler = (math.radians(8), math.radians(-6), 0)
bpy.ops.object.select_all(action="DESELECT")
b.select_set(True)
bpy.context.view_layer.objects.active = b
bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
sit_on_ground(b)
flatten_top(b, 0.85)
smooth_by_angle(b)
b = join([b], "Roca B", "rock_b")

# 4.4 rock_c — grupo de tres piedras
c1 = rock_blob((0.5, 0.45, 0.42), 3, 0.3, 0.20, location=(0, 0, 0), stone_mat=stone)
c2 = rock_blob((0.34, 0.3, 0.28), 3, 0.3, 0.16, location=(0.62, 0.18, 0), stone_mat=stone)
c3 = rock_blob((0.24, 0.22, 0.2), 3, 0.3, 0.12, location=(-0.5, -0.3, 0), stone_mat=stone)
c = join([c1, c2, c3], "Roca C", "rock_c")
c.location = (0, 0, 0)
bpy.context.scene.cursor.location = (0, 0, 0)
bpy.ops.object.select_all(action="DESELECT")
c.select_set(True)
bpy.context.view_layer.objects.active = c
bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
sit_on_ground(c)
smooth_by_angle(c)
c["part"] = "rock_c"
c.name = "Roca C"

# ------------------------------------------------------------------ LIMPIEZA
meshes = [a, b, c]
for ob in meshes:
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-6)
    bad = [f for f in bm.faces if f.calc_area() < 1e-12]
    if bad:
        bmesh.ops.delete(bm, geom=bad, context="FACES")
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(ob.data); bm.free(); ob.data.update()

# ------------------------------------------------------------------ EXPORTAR (antes de mover nada)
meta = dict(forward="+Z", note="kit instanciado; pivote en la base; el juego escala 0.5-1.8")
parts, tris, size = kit.export_glb(ROOT / "rocas-pradera-juego.glb", objects=meshes, meta=meta,
                                   ao={"distance": 0.4, "strength": 0.7},
                                   json_path=ROOT / "rocas-pradera.json")
assert parts == 3, parts
assert tris <= 4500, tris

bpy.ops.object.select_all(action="DESELECT")
for ob in meshes:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "rocas-pradera.glb"), export_format="GLB",
                          use_selection=True, export_extras=True, export_animations=False)

# ------------------------------------------------------------------ RENDER (cámara y luz del brief)
for i, ob in enumerate(meshes):          # en fila, solo para la foto
    ob.location.x = (i - (len(meshes) - 1) / 2) * 3.0

bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
plane = bpy.context.object
plane.name = "Pasto"
pmat = bpy.data.materials.new("Pasto")
pmat.use_nodes = True
pmat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*kit.lin("6fb54f"), 1)
plane.data.materials.append(pmat)

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 40
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = "PNG"
scene.view_settings.look = "AgX - Medium High Contrast"

world = bpy.data.worlds.new("Fondo")
world.use_nodes = True
scene.world = world
world.node_tree.nodes["Background"].inputs[0].default_value = (*kit.lin("a8d8f0"), 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.5

bpy.ops.object.light_add(type="SUN")
sun = bpy.context.object
sun.data.color = kit.lin("fff1d0")
sun.data.energy = 4.0
sun.rotation_euler = (math.radians(35), math.radians(-20), math.radians(30))

bpy.ops.object.camera_add()
cam = bpy.context.object
scene.camera = cam
cam.data.sensor_fit = "VERTICAL"
cam.data.sensor_height = 24
cam.data.lens = 24 / (2 * math.tan(math.radians(30)))      # FOV vertical 60°
cam.location = (0, -9, 3)
cam.rotation_euler = (Vector((0, 0, 0.5)) - cam.location).to_track_quat("-Z", "Y").to_euler()

scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.render.filepath = str(ROOT / "render-kit.png")
bpy.ops.render.render(write_still=True)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "rocas-pradera.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
