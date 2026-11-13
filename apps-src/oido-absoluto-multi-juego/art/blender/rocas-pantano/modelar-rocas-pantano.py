"""rocas-pantano · Walking AP Multi, nivel 4 «El Pantano». Modelado por Claude; plan en PLAN-PANTANO-BLENDER.md."""
import bpy, bmesh, math, random, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

SEED = 12
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
    me = ob.data
    attr = me.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
    for v in me.vertices:
        c = color_fn(v.co, v.normal)
        rgb = kit.lin(c) if isinstance(c, str) else c
        attr.data[v.index].color = (*rgb, 1.0)
    me.color_attributes.active_color = attr


def mix(hex_a, hex_b, t):
    a, b = Vector(kit.lin(hex_a)), Vector(kit.lin(hex_b))
    return tuple(a.lerp(b, max(0.0, min(1.0, t))))


def apply_modifiers(ob):
    bpy.context.view_layer.objects.active = ob
    for mod in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)


def join(objs, name, part):
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


# --- funciones extra (Claude)
def mossy(co, n):
    """Piedra gris verdosa; musgo en lo que mira hacia arriba."""
    up = n.z
    if up > 0.45:
        return mix("3f6a2e", "5f8f40", (up - 0.45) / 0.55)
    return mix("3c4034", "6d7560", 0.5 + 0.5 * up)


def blob_rock(radius_xyz, noise, strength, mat):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1, location=(0, 0, 0))
    ob = bpy.context.object
    ob.scale = radius_xyz
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    tex = bpy.data.textures.new(f"Bultos {ob.name}", "CLOUDS")
    tex.noise_scale = noise
    mod = ob.modifiers.new("Bultos", "DISPLACE")
    mod.texture = tex
    mod.strength = strength
    apply_modifiers(ob)
    z_min = min(v.co.z for v in ob.data.vertices)
    for v in ob.data.vertices:            # apoya en el suelo y se hunde un poco
        v.co.z -= z_min + 0.12
    ob.data.update()
    ob.data.materials.append(mat)
    paint(ob, mossy)
    for f in ob.data.polygons:
        f.use_smooth = True
    return ob


def wood_color(co, n, half):
    """Corteza oscura y húmeda, musgo arriba, corte claro en las puntas (eje del tronco = X de Blender)."""
    if abs(co.x) > half - 0.03:
        return mix("8a7350", "b39a6e", 0.5)
    if n.z > 0.5:
        return mix("3f6a2e", "5f8f40", (n.z - 0.5) / 0.5)
    return mix("33281a", "5a4630", 0.5 + 0.5 * n.z)


def log(length, radius, mat):
    """Tronco caído: perfil torneado a lo largo (con anillos para pintar) acostado en X."""
    h = length / 2
    prof = [(0.0, -h), (radius * 0.88, -h), (radius, -h + 0.05), (radius * 1.04, -h * 0.6), (radius * 0.97, -h * 0.2),
            (radius * 1.02, h * 0.2), (radius * 0.95, h * 0.6), (radius * 0.93, h - 0.05), (radius * 0.84, h), (0.0, h)]
    v, f = kit.g_lathe(prof, 16)
    ob = kit.make("Tronco", v, f, mat, kit.T(pos=(0, radius * 0.8, 0), rot=(0, 0, math.pi / 2)), part="tmp",
                  smooth_angle=1.0, tint=0)
    tex = bpy.data.textures.new(f"Corteza {ob.name}", "CLOUDS")
    tex.noise_scale = 0.4
    mod = ob.modifiers.new("Rugoso", "DISPLACE")
    mod.texture = tex
    mod.strength = radius * 0.15
    apply_modifiers(ob)
    paint(ob, lambda co, n: wood_color(co, n, h))
    return ob


def stump(mat):
    """Tocón: base que se abre en raíces, corte claro arriba y musgo abajo."""
    prof = [(0.0, -0.1), (0.9, -0.1), (0.75, 0.12), (0.64, 0.35), (0.61, 0.7), (0.6, 1.05), (0.57, 1.15), (0.48, 1.2), (0.0, 1.24)]
    v, f = kit.g_lathe(prof, 16)
    ob = kit.make("Tocón", v, f, mat, kit.T(), part="tmp", smooth_angle=1.0, tint=0)
    tex = bpy.data.textures.new("Tocón", "CLOUDS")
    tex.noise_scale = 0.35
    mod = ob.modifiers.new("Rugoso", "DISPLACE")
    mod.texture = tex
    mod.strength = 0.08
    apply_modifiers(ob)
    paint(ob, lambda co, n: mix("8a7350", "b39a6e", 0.6) if co.z > 1.16 else
          (mix("3f6a2e", "5f8f40", 0.5) if co.z < 0.35 else mix("33281a", "5a4630", 0.4 + 0.3 * n.z)))
    return ob


# ------------------------------------------------------------------ MODELO
stone = material("Piedra", roughness=0.85)
bark_m = material("Madera", roughness=0.9)

a = blob_rock((1.1, 0.9, 0.7), 0.7, 0.35, stone)
a = join([a], "Roca A", "rock_moss_a")
b = blob_rock((0.7, 0.6, 1.0), 0.6, 0.3, stone)
b = join([b], "Roca B", "rock_moss_b")
lg = log(5.0, 0.45, bark_m)
mush = []
for k, x in enumerate((-1.2, 0.3, 1.5)):       # hongos de repisa en el tronco
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=0.22, location=(x, -0.42, 0.55 + k * 0.08))
    m = bpy.context.object
    m.scale = (1.0, 0.6, 0.35)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    m.data.materials.append(bark_m)
    paint(m, lambda co, n: "c9b48a")
    mush.append(m)
lg = join([lg] + mush, "Tronco caído", "log")
st = join([stump(bark_m)], "Tocón", "stump")
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

# ------------------------------------------------------------------ EXPORTAR
meta = dict(forward="+Z", note="kit instanciado; pivote en la base (z=0); se hunden 0.1 m")
parts, tris, size = kit.export_glb(ROOT / "rocas-pantano-juego.glb", objects=meshes, meta=meta,
                                   ao={"distance": 0.6, "strength": 0.7}, json_path=ROOT / "rocas-pantano.json")
assert parts == 4, parts
assert tris <= 12000, tris

# ------------------------------------------------------------------ RENDER
for i, ob in enumerate(meshes):
    ob.location.x = (i - (len(meshes) - 1) / 2) * 5
bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, 0))
gm = bpy.data.materials.new("Barro"); gm.use_nodes = True
gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*kit.lin("4a4a2c"), 1)
bpy.context.object.data.materials.append(gm)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 40
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = "PNG"
scene.view_settings.look = "AgX - Medium High Contrast"
world = bpy.data.worlds.new("Fondo"); world.use_nodes = True; scene.world = world
world.node_tree.nodes["Background"].inputs[0].default_value = (*kit.lin("2b4a44"), 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.8
bpy.ops.object.light_add(type="SUN")
sun = bpy.context.object
sun.data.color = kit.lin("dff5e8"); sun.data.energy = 4.0
sun.rotation_euler = (math.radians(35), math.radians(-20), math.radians(30))
bpy.ops.object.camera_add(); cam = bpy.context.object; scene.camera = cam
cam.data.sensor_fit = "VERTICAL"; cam.data.sensor_height = 24
cam.data.lens = 24 / (2 * math.tan(math.radians(30)))
cam.location = (0, -15, 4)
cam.rotation_euler = (Vector((0, 0, 0.6)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.render.filepath = str(ROOT / "render-kit.png")
bpy.ops.render.render(write_still=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "rocas-pantano.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
