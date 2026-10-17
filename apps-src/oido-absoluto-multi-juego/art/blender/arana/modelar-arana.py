"""Arañita del pantano, nivel 4 «El Pantano» de Walking AP Multi. Modelada por Claude con bpy.

La araña simpática que a Luis le gusta, ahora visible en la penumbra: abdomen violeta-café con manchas
durazno y crema, cefalotórax redondo, colmillitos crema y cuatro ojos ámbar que brillan (dos grandes al
frente y dos chicos arriba). Las patas siguen siendo de código (environment.ts), con su caminata.
Espacio del juego (Three): Y arriba, la cabeza mira a −Z, como la araña de primitivas.
Partes: `body` y `eyes`, ambas con pivote en (0, 0.38, 0): el juego sube y baja el cuerpo desde ahí.
"""
import bpy, math, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection, 9)

PIVOT = (0, 0.38, 0)


def lin(h):
    return Vector(kit.lin(h))


def mix(a, b, t):
    return lin(a).lerp(lin(b), max(0.0, min(1.0, t)))


def material(name, roughness, emission=0.0, emission_hex="000000"):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Emission Color"].default_value = (*kit.lin(emission_hex), 1)
    bsdf.inputs["Emission Strength"].default_value = emission
    vc = mat.node_tree.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Pigment"
    mat.node_tree.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


SKIN = material("Cuerpo", 0.55)
EYE = material("Ojos", 0.15, emission=1.6, emission_hex="ffb020")


def paint(ob, fn):
    me = ob.data
    attr = me.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
    for v in me.vertices:
        b = ob.matrix_world @ v.co
        attr.data[v.index].color = (*fn(Vector((b.x, b.z, -b.y))), 1.0)
    me.color_attributes.active_color = attr


def ball(radius, center, scale, color_fn, mat, seg=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=max(6, seg // 2), radius=radius,
                                         location=kit.B(Vector(center)))
    ob = bpy.context.object
    ob.scale = (scale[0], scale[2], scale[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for f in ob.data.polygons:
        f.use_smooth = True
    ob.data.materials.append(mat)
    paint(ob, color_fn)
    return ob


def unite(objs, name, part):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name, ob["part"] = name, part
    bpy.context.scene.cursor.location = kit.B(Vector(PIVOT))
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    return ob


ABD_C = Vector((0, 0.41, 0.2))


def abdomen_color(p):
    """Violeta-café con un dibujo de manchas durazno en V y puntitos crema en el lomo."""
    rel = p - ABD_C
    if rel.y < -0.12:
        return lin("3a2846")                                   # panza oscura
    chevron = abs(abs(rel.x) * 1.6 - (rel.z + 0.25)) < 0.09 and rel.y > 0.05
    dots = math.sin(rel.x * 30) * math.sin(rel.z * 26) > 0.82 and rel.y > 0.12
    if chevron:
        return lin("e8956a")
    if dots:
        return lin("f6e3c4")
    return mix("5e3c78", "9068a8", 0.5 + rel.y * 2.0)


abdomen = ball(0.36, ABD_C, (1.0, 0.72, 1.35), abdomen_color, SKIN, seg=24)
head = ball(0.24, (0, 0.41, -0.32), (0.95, 0.8, 0.95), lambda p: mix("523470", "7c5696", 0.5 + (p.y - 0.41) * 3), SKIN)
waist = ball(0.08, (0, 0.39, -0.06), (1, 1, 1), lambda p: lin("3a2846"), SKIN, seg=10)
fangs = []
for sx in (-0.06, 0.06):
    v, f = kit.g_cyl(0.0, 0.035, 0.12, 6)
    fangs.append(kit.make("Colmillo", v, f, SKIN, kit.T(pos=(sx, 0.3, -0.52), rot=(math.radians(200), 0, 0)),
                          part="tmp", smooth_angle=0.5, tint=0))
    paint(fangs[-1], lambda p: lin("f2e6c8"))
body = unite([abdomen, head, waist] + fangs, "Cuerpo", "body")

eyes = []
for sx, y, z, r in ((-0.085, 0.47, -0.51, 0.08), (0.085, 0.47, -0.51, 0.08), (-0.055, 0.55, -0.45, 0.045), (0.055, 0.55, -0.45, 0.045)):
    eyes.append(ball(r, (sx, y, z), (1, 1, 1), lambda p: mix("ffb020", "fff0b0", (p.y - 0.45) / 0.15), EYE, seg=14))
eyes_ob = unite(eyes, "Ojos", "eyes")

meshes = [body, eyes_ob]
meta = dict(forward="-Z", note="las patas son de código; body y eyes pivotan en (0, 0.38, 0)")
parts, tris, size = kit.export_glb(ROOT / "arana-juego.glb", objects=meshes, meta=meta,
                                   ao={"distance": 0.2, "strength": 0.5}, json_path=ROOT / "arana.json")
assert parts == 2, parts
assert tris <= 8000, tris

# ------------------------------------------------------------------ render (con patas de muestra, solo para la foto)
legm = material("Patas", 0.6)
for i, z in enumerate((-0.22, -0.07, 0.07, 0.2)):
    for side in (-1, 1):
        knee = Vector((side * 0.55, 0.62, z * 1.6))
        for a, b2, r in (((side * 0.27, 0.34, z), knee, 0.035), (knee, Vector((side * 0.8, 0.0, z * 2.2)), 0.025)):
            d = Vector(b2) - Vector(a)
            v, f = kit.g_cyl(r * 0.7, r, d.length, 6)
            q = Vector((0, 1, 0)).rotation_difference(d.normalized())
            leg = kit.make("Pata", v, f, legm, kit.T(pos=tuple(Vector(a) + d / 2)) @ q.to_matrix().to_4x4(), part="tmp", tint=0)
            paint(leg, lambda p: lin("4a2f5a"))
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = "PNG"
scene.view_settings.look = "AgX - Medium High Contrast"
world = bpy.data.worlds.new("Pantano"); world.use_nodes = True; scene.world = world
world.node_tree.nodes["Background"].inputs[0].default_value = (*kit.lin("2b4a44"), 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.9
bpy.ops.object.light_add(type="SUN")
sun = bpy.context.object
sun.data.color = kit.lin("dff5e8"); sun.data.energy = 3.0
sun.rotation_euler = (math.radians(45), math.radians(10), math.radians(-35))
bpy.ops.mesh.primitive_plane_add(size=10, location=(0, 0, 0))
gm = bpy.data.materials.new("Barro"); gm.use_nodes = True
gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*kit.lin("4a4a2c"), 1)
bpy.context.object.data.materials.append(gm)
bpy.ops.object.camera_add(); cam = bpy.context.object; scene.camera = cam
cam.data.sensor_fit = "VERTICAL"; cam.data.sensor_height = 24
cam.data.lens = 24 / (2 * math.tan(math.radians(30)))
cam.location = kit.B(Vector((-1.1, 1.0, -1.8)))
cam.rotation_euler = (kit.B(Vector((0, 0.35, -0.1))) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1400, 900
scene.render.filepath = str(ROOT / "render-cerca.png")
bpy.ops.render.render(write_still=True)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "arana.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
