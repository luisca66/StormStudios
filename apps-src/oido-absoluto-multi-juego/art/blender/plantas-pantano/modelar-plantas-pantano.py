"""plantas-pantano · Walking AP Multi, nivel 4 «El Pantano». Modelado por Claude; plan en PLAN-PANTANO-BLENDER.md."""
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
def stick(a, b, r_a, r_b, mat, color, sides=6):
    a, b = Vector(a), Vector(b)
    d = b - a
    bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=r_a, radius2=r_b, depth=d.length, location=(0, 0, 0))
    ob = bpy.context.object
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    ob.location = (a + b) / 2
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=False)
    ob.data.materials.append(mat)
    paint(ob, color if callable(color) else (lambda co, n, c=color: c))
    for f in ob.data.polygons:
        f.use_smooth = True
    return ob


def lily_pad(radius, mat, z=0.02):
    """Hoja de nenúfar: disco fino con la muesca en V y borde levantado."""
    seg = 24
    verts = [(0, 0, z)]
    for i in range(seg + 1):
        a = 0.35 + i / seg * (math.tau - 0.7)          # deja la muesca entre -0.35 y 0.35 rad
        r = radius * (1.0 + 0.04 * math.sin(i * 1.7))
        verts.append((math.cos(a) * r, math.sin(a) * r, z + 0.025))
    faces = [(0, i + 1, i + 2) for i in range(seg)]
    me = bpy.data.meshes.new("Nenúfar")
    me.from_pydata(verts, [], faces)
    me.update()
    ob = bpy.data.objects.new("Nenúfar", me)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    paint(ob, lambda co, n: mix("2f5a24", "5f8f40", Vector((co.x, co.y)).length / radius))
    mod = ob.modifiers.new("Grosor", "SOLIDIFY")
    mod.thickness = 0.03
    return ob


def blossom(center, mat):
    """Flor de loto rosa: 8 pétalos alargados en corona y centro amarillo."""
    out = []
    for k in range(8):
        a = k / 8 * math.tau
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=0.12, location=(0, 0, 0))
        p = bpy.context.object
        p.scale = (0.9, 0.45, 1.9)
        p.rotation_euler = (0, math.radians(35), a)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        p.location = Vector(center) + Vector((math.cos(a) * 0.12, math.sin(a) * 0.12, 0.12))
        bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
        p.data.materials.append(mat)
        paint(p, lambda co, n: mix("ff9ec4", "fff0f6", (co.z - center[2]) / 0.3))
        out.append(p)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=0.08, location=(center[0], center[1], center[2] + 0.1))
    c = bpy.context.object
    c.data.materials.append(mat)
    paint(c, lambda co, n: "ffd84d")
    out.append(c)
    return out


def reeds(mat):
    """Mata de juncos: tallos finos e inclinados, algunos con espiga marrón."""
    out = []
    for k in range(9):
        a = k / 9 * math.tau + rng.uniform(-0.3, 0.3)
        r = rng.uniform(0.05, 0.35)
        h = rng.uniform(1.4, 2.6)
        base = (math.cos(a) * r, math.sin(a) * r, -0.05)
        top = (base[0] + math.cos(a) * 0.25, base[1] + math.sin(a) * 0.25, h)
        out.append(stick(base, top, 0.035, 0.012, mat, lambda co, n: mix("3f6a2e", "8fae5a", co.z / 2.6), sides=5))
        if k % 2 == 0:
            t = Vector(top)
            dirn = (t - Vector(base)).normalized()
            out.append(stick(t - dirn * 0.45, t - dirn * 0.05, 0.06, 0.05, mat, "5a3a1a", sides=6))
    return out


def fern(mat):
    """Helecho: 8 frondas de hojitas planas y alargadas que se arquean hacia afuera."""
    out = []
    for k in range(8):
        a = k / 8 * math.tau + rng.uniform(-0.15, 0.15)
        for dist, length, tilt, z in ((0.35, 0.5, 40, 0.32), (0.85, 0.45, 5, 0.52), (1.25, 0.32, -25, 0.42)):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=1, location=(0, 0, 0))
            ob = bpy.context.object
            ob.scale = (length, 0.13, 0.025)            # hoja: larga en X, angosta y muy fina
            ob.rotation_euler = (0, -math.radians(tilt), a)
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
            ob.location = (math.cos(a) * dist, math.sin(a) * dist, z)
            bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
            ob.data.materials.append(mat)
            paint(ob, lambda co, n: mix("2f5a24", "6fae52", min(1.0, Vector((co.x, co.y)).length / 1.4)))
            for f in ob.data.polygons:
                f.use_smooth = True
            out.append(ob)
    return out


def bush(mat):
    """Arbusto húmedo: tres bultos blandos de verde oscuro."""
    out = []
    for (x, y, r, h) in ((0, 0, 1.6, 1.3), (1.2, 0.4, 1.1, 0.9), (-1.0, -0.5, 1.2, 1.0)):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1, location=(0, 0, 0))
        ob = bpy.context.object
        ob.scale = (r, r, h)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        tex = bpy.data.textures.new(f"Hojas {ob.name}", "CLOUDS")
        tex.noise_scale = 0.6
        mod = ob.modifiers.new("Bultos", "DISPLACE")
        mod.texture = tex
        mod.strength = 0.3
        apply_modifiers(ob)
        for v in ob.data.vertices:
            v.co += Vector((x, y, h * 0.55))
        ob.data.update()
        ob.data.materials.append(mat)
        paint(ob, lambda co, n: mix("1e3a1b", "4f7f36", 0.5 + 0.5 * n.z))
        for f in ob.data.polygons:
            f.use_smooth = True
        out.append(ob)
    return out


# ------------------------------------------------------------------ MODELO
leafm = material("Hojas", roughness=0.6)

join([lily_pad(0.9, leafm)], "Nenúfar", "lily_pad")
join([lily_pad(0.7, leafm)] + blossom((0.0, 0.0, 0.04), leafm), "Nenúfar con flor", "lily_flower")
join(reeds(leafm), "Juncos", "reeds")
join(fern(leafm), "Helecho", "fern")
join(bush(leafm), "Arbusto", "bush")
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
meta = dict(forward="+Z", note="kit instanciado; pivote en la base (z=0); nenúfares sobre el agua")
parts, tris, size = kit.export_glb(ROOT / "plantas-pantano-juego.glb", objects=meshes, meta=meta,
                                   ao={"distance": 0.4, "strength": 0.6}, json_path=ROOT / "plantas-pantano.json")
assert parts == 5, parts
assert tris <= 16000, tris

# ------------------------------------------------------------------ RENDER
for i, ob in enumerate(meshes):
    ob.location.x = (i - (len(meshes) - 1) / 2) * 4
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
cam.location = (0, -11, 3.5)
cam.rotation_euler = (Vector((0, 0, 0.6)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.render.filepath = str(ROOT / "render-kit.png")
bpy.ops.render.render(write_still=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "plantas-pantano.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
