"""hongos · Walking AP Multi, nivel 4 «El Pantano». Modelado por Claude; plan en PLAN-PANTANO-BLENDER.md."""
import bpy, bmesh, math, random, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

SEED = 31
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
def mushroom(base, height, cap_r, cap_hex, mat, lean=(0.0, 0.0)):
    """Hongo: pie claro y sombrero redondo con pintitas claras."""
    out = []
    top = Vector(base) + Vector((lean[0], lean[1], height))
    bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=cap_r * 0.32, radius2=cap_r * 0.22, depth=height, location=(0, 0, 0))
    stem = bpy.context.object
    d = top - Vector(base)
    stem.rotation_mode = "QUATERNION"
    stem.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    stem.location = (Vector(base) + top) / 2
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=False)
    stem.data.materials.append(mat)
    paint(stem, lambda co, n: mix("cfd8c0", "f2f5e8", 0.5))
    out.append(stem)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=7, radius=1, location=(0, 0, 0))
    cap = bpy.context.object
    cap.scale = (cap_r, cap_r, cap_r * 0.62)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for v in cap.data.vertices:            # media esfera: aplana la parte de abajo
        if v.co.z < 0:
            v.co.z *= 0.25
    cap.data.update()
    cap.location = top
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    cap.data.materials.append(mat)

    def cap_color(co, n, c=cap_hex, t=top, r=cap_r):
        rel = co - t
        dots = math.sin(rel.x * 13 / r) * math.sin(rel.y * 11 / r) > 0.7 and rel.z > r * 0.2
        if rel.z < 0:
            return mix(c, "ffffff", 0.55)              # láminas de abajo, más claras
        return mix(c, "ffffff", 0.7) if dots else mix(c, "ffffff", 0.15 * (rel.z / (r * 0.62)))
    paint(cap, cap_color)
    for f in cap.data.polygons:
        f.use_smooth = True
    out.append(cap)
    return out


# ------------------------------------------------------------------ MODELO
glow_t = material("Hongo turquesa", roughness=0.4, emission=1.4, emission_hex="5ff0d0")
glow_m = material("Hongo magenta", roughness=0.4, emission=1.4, emission_hex="ff6fd0")
glow_l = material("Hongo lima", roughness=0.4, emission=1.3, emission_hex="c8ff5a")

join(mushroom((0, 0, -0.05), 0.9, 0.5, "5ff0d0", glow_t) + mushroom((0.45, 0.2, -0.05), 0.5, 0.3, "5ff0d0", glow_t, (0.1, 0.05)),
     "Hongos turquesa", "mush_tall")
cluster = []
for (x, y, h, r) in ((0, 0, 0.45, 0.28), (0.3, 0.15, 0.32, 0.2), (-0.25, 0.22, 0.28, 0.18), (0.08, -0.3, 0.22, 0.15)):
    cluster += mushroom((x, y, -0.05), h, r, "ff6fd0", glow_m, (x * 0.2, y * 0.2))
join(cluster, "Hongos magenta", "mush_cluster")
shelf = []
for (x, y, h, r) in ((0, 0, 0.12, 0.35), (0.42, 0.1, 0.1, 0.25), (-0.36, -0.12, 0.09, 0.22)):
    shelf += mushroom((x, y, -0.05), h, r, "c8ff5a", glow_l)
join(shelf, "Hongos lima", "mush_flat")
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
meta = dict(forward="+Z", note="kit instanciado; pivote en la base (z=0); brillan (emisión en el material)")
parts, tris, size = kit.export_glb(ROOT / "hongos-juego.glb", objects=meshes, meta=meta,
                                   ao=None, json_path=ROOT / "hongos.json")
assert parts == 3, parts
assert tris <= 12000, tris

# ------------------------------------------------------------------ RENDER
for i, ob in enumerate(meshes):
    ob.location.x = (i - (len(meshes) - 1) / 2) * 2.2
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
cam.location = (0, -5, 1.6)
cam.rotation_euler = (Vector((0, 0, 0.35)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.render.filepath = str(ROOT / "render-kit.png")
bpy.ops.render.render(write_still=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "hongos.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
