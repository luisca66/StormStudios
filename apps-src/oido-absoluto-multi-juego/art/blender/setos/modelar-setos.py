"""Setos del laberinto · Walking AP Multi, La Pradera. Encargo de Gemini; receta en BRIEF-GEMINI.md."""
import bpy, bmesh, math, random, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

SEED = 21
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


# ------------------------------------------------------------------ FUNCIONES EXTRA
def leaf_color(co, z_max):
    """Más oscuro abajo, más claro arriba, con hojas claras y alguna flor sueltas."""
    t = max(0.0, min(1.0, co.z / max(z_max, 1e-6)))
    r = rng.random()
    if r < 0.015:
        return "ff8fb1" if rng.random() < 0.5 else "ffffff"
    if r < 0.13:
        return mix("8fcf5f", "b5e38a", t)
    return mix("2f6b3a", "4f9a3e", t / 0.6) if t < 0.6 else mix("4f9a3e", "7cc05a", (t - 0.6) / 0.4)


def leafy_block(size_xyz, bevel_width, voxel, noise_scale, strength, leaf_mat, location=(0, 0, 0)):
    """Bloque de follaje con la base en z = 0: cubo biselado, remallado, pintado y con ruido."""
    sx, sy, sz = size_xyz
    bpy.ops.mesh.primitive_cube_add(size=1, location=(location[0], location[1], location[2] + sz / 2))
    ob = bpy.context.object
    ob.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bev = ob.modifiers.new("Bisel", "BEVEL")
    bev.width = bevel_width
    bev.segments = 4
    rem = ob.modifiers.new("Remallado", "REMESH")
    rem.mode = "VOXEL"
    rem.voxel_size = voxel
    apply_modifiers(ob)
    ob.data.materials.append(leaf_mat)
    z_top = location[2] + sz
    paint(ob, lambda co, n: leaf_color(co + ob.location, z_top))
    tex = bpy.data.textures.new(f"Ruido {ob.name}", "CLOUDS")
    tex.noise_scale = noise_scale
    mod = ob.modifiers.new("Displace", "DISPLACE")
    mod.texture = tex
    mod.strength = strength
    mod.mid_level = 0.5
    return ob


def smooth_by_angle(ob, degrees=50):
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(degrees))


# ------------------------------------------------------------------ MODELO
leaves = material("Follaje", roughness=0.9)
pot_mat = material("Maceta", roughness=0.8)

# hedge_long: tramo de 4 m (a lo largo de X)
a = leafy_block((4.0, 2.0, 2.0), 0.45, 0.16, 0.3, 0.22, leaves)
smooth_by_angle(a)
a = join([a], "Seto largo", "hedge_long")
bpy.context.scene.cursor.location = (0, 0, 0)
bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
a["part"] = "hedge_long"; a.name = "Seto largo"

# hedge_short: tramo de 2 m, para completar largos impares
b = leafy_block((2.0, 2.0, 2.0), 0.45, 0.16, 0.3, 0.22, leaves)
smooth_by_angle(b)
b = join([b], "Seto corto", "hedge_short")
bpy.context.scene.cursor.location = (0, 0, 0)
bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
b["part"] = "hedge_short"; b.name = "Seto corto"

# topiary: maceta de barro, tronquito y bola de follaje
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.45, depth=0.6, location=(0, 0, 0.3))
pot = bpy.context.object
bev = pot.modifiers.new("Bisel", "BEVEL"); bev.width = 0.06; bev.segments = 3
apply_modifiers(pot)
pot.data.materials.append(pot_mat)
paint(pot, lambda co, n: mix("a64b2c", "d9774a", (co.z + 0.3) / 0.6))
bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.07, depth=0.7, location=(0, 0, 0.85))
trunk = bpy.context.object
trunk.data.materials.append(pot_mat)
paint(trunk, lambda co, n: "8a5a3b")
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=0.75, location=(0, 0, 1.75))
ball = bpy.context.object
ball.data.materials.append(leaves)
paint(ball, lambda co, n: leaf_color(co + Vector((0, 0, 1.75)), 2.5))
tex = bpy.data.textures.new("Ruido bola", "CLOUDS"); tex.noise_scale = 0.25
mod = ball.modifiers.new("Displace", "DISPLACE"); mod.texture = tex; mod.strength = 0.12; mod.mid_level = 0.5
c = join([pot, trunk, ball], "Topiario", "topiary")
c.data.materials.clear(); c.data.materials.append(leaves)
smooth_by_angle(c)
bpy.context.scene.cursor.location = (0, 0, 0)
bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
c["part"] = "topiary"; c.name = "Topiario"

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
meta = dict(forward="+Z", note="kit instanciado; pivote en la base; tramos a lo largo de X")
parts, tris, size = kit.export_glb(ROOT / "setos-juego.glb", objects=meshes, meta=meta,
                                   ao={"distance": 0.5, "strength": 0.6},
                                   json_path=ROOT / "setos.json")
assert parts == 3, parts
assert tris <= 12000, tris

bpy.ops.object.select_all(action="DESELECT")
for ob in meshes:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "setos.glb"), export_format="GLB",
                          use_selection=True, export_extras=True, export_animations=False)

# ------------------------------------------------------------------ RENDER (cámara y luz del brief)
for i, ob in enumerate(meshes):          # en fila, solo para la foto
    ob.location.x = (i - (len(meshes) - 1) / 2) * 4.5

# Suelo: después de exportar, un plano sin part
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
floor = bpy.context.object
floor_mat = bpy.data.materials.new("Suelo")
floor_mat.use_nodes = True
floor_mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*kit.lin("6fb54f"), 1)
floor_mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.95
floor.data.materials.append(floor_mat)

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
cam.location = (0, -12, 4)                                 # el brief da la posición
cam.rotation_euler = (Vector((0, 0, 1)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.render.filepath = str(ROOT / "render-kit.png")
bpy.ops.render.render(write_still=True)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "setos.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
