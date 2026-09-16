"""Globo aerostático: el objetivo de nota de Las Nubes (nivel 5).

Partes (kit.export_parts, espacio Three, Y arriba; origen = centro del conjunto):
  envelope_color  gajos que el juego tiñe con el color de la nota (pigmento casi blanco)
  envelope_trim   gajos crema alternos, corona y faldón (conservan su pigmento)
  basket          canasta de mimbre, borde acolchado, cuerdas y quemador
  flame           llama del quemador (emisiva; el juego la hace titilar)
Ejecutar:
  powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 apps-src\\oido-absoluto-multi-juego\\art\\blender\\globo\\modelar-globo.py
"""
import bpy, math, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit
from kit import B, lin

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
COL = bpy.data.collections.new("Globo"); scene.collection.children.link(COL)
kit.setup(COL, 55)


def material(name, rough, emit=None, strength=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    bs = m.node_tree.nodes["Principled BSDF"]
    bs.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bs.inputs["Roughness"].default_value = rough
    if emit:
        bs.inputs["Emission Color"].default_value = (*lin(emit), 1)
        bs.inputs["Emission Strength"].default_value = strength
    vc = m.node_tree.nodes.new("ShaderNodeVertexColor"); vc.layer_name = "Pigment"
    m.node_tree.links.new(vc.outputs["Color"], bs.inputs["Base Color"])
    return m


FABRIC = material("Tela", 0.55)
WICKER = material("Mimbre", 0.9)
FIRE = material("Llama", 0.4, "#ffb347", 2.5)


def paint(ob, fn):
    me = ob.data
    attr = me.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
    for v, c in zip(me.vertices, attr.data):
        p = (v.co.x, v.co.z, -v.co.y)   # de vuelta a Three
        c.color = (*fn(p), 1)
    me.color_attributes.active_color = attr


# ---------------------------------------------------------------------------
# Envoltura: lágrima de 12 gajos inflados. Centro de la esfera en y = 0.75.
# ---------------------------------------------------------------------------
GORES, R, CY = 12, 1.35, 0.75
ROWS = 26


def radius_at(theta):
    """theta 0 = corona, pi = boca. Ancha arriba, se afila hacia el faldón."""
    s = math.sin(theta)
    taper = 1 - 0.62 * max(0.0, -math.cos(theta)) ** 1.35
    return R * s * taper


def point(theta, phi, bulge):
    r = radius_at(theta) * (1 + bulge)
    y = CY + R * 1.12 * math.cos(theta)
    return (math.sin(phi) * r, y, math.cos(phi) * r)


THETA_END = math.pi * 0.86
SUB = 5   # columnas por gajo
for group, parity in (("envelope_color", 0), ("envelope_trim", 1)):
    verts, faces = [], []
    for g in range(GORES):
        if g % 2 != parity:
            continue
        base = len(verts)
        for i in range(ROWS + 1):
            th = 0.02 + (THETA_END - 0.02) * i / ROWS
            for j in range(SUB + 1):
                u = j / SUB
                phi = (g + u) / GORES * math.tau
                # Cada gajo se infla entre costuras: la tela tira de las cuerdas de carga.
                bulge = 0.045 * math.sin(math.pi * u) * math.sin(th)
                verts.append(point(th, phi, bulge))
        for i in range(ROWS):
            for j in range(SUB):
                a = base + i * (SUB + 1) + j
                faces.append((a, a + 1, a + SUB + 2, a + SUB + 1))
    ob = kit.make("Envoltura " + group, verts, faces, FABRIC, part=group, smooth_angle=1.2)
    mod = ob.modifiers.new("Tela con grosor", "SOLIDIFY"); mod.thickness = 0.02; mod.offset = -1
    if group == "envelope_color":
        paint(ob, lambda p: Vector(lin("#ffffff")).lerp(Vector(lin("#e9e4f0")), max(0, min(1, (CY - p[1]) / 2.2))))
    else:
        paint(ob, lambda p: Vector(lin("#fff6e6")).lerp(Vector(lin("#f0dcc2")), max(0, min(1, (CY - p[1]) / 2.2))))

# Corona, franja de costura y faldón (trim).
trim = []
v, f = kit.g_torus(0.22, 0.06, 20, 8)
trim.append(kit.make("Corona", v, f, FABRIC, kit.T((0, CY + R * 1.12 - 0.01, 0), (math.pi / 2, 0, 0)), part="envelope_trim"))
th_band = math.pi * 0.62
v, f = kit.g_torus(radius_at(th_band) * 1.04, 0.045, 48, 8)
trim.append(kit.make("Banda", v, f, FABRIC, kit.T((0, CY + R * 1.12 * math.cos(th_band), 0), (math.pi / 2, 0, 0)), part="envelope_trim"))
mouth_r = radius_at(THETA_END)
mouth_y = CY + R * 1.12 * math.cos(THETA_END)
v, f = kit.g_lathe([(mouth_r, mouth_y), (mouth_r * 0.96, mouth_y - 0.28), (mouth_r * 1.02, mouth_y - 0.32)], 24)
skirt = kit.make("Faldón", v, f, FABRIC, part="envelope_trim", smooth_angle=1.0)
mod = skirt.modifiers.new("Grosor", "SOLIDIFY"); mod.thickness = 0.02
trim.append(skirt)
for ob in trim:
    paint(ob, lambda p: lin("#d9b77a"))

# ---------------------------------------------------------------------------
# Canasta, cuerdas y quemador.
# ---------------------------------------------------------------------------
BASKET_Y = -1.55   # centro de la canasta
basket_objs = []
v, f = kit.g_box(0.78, 0.52, 0.78)
body = kit.make("Canasta", v, f, WICKER, kit.T((0, BASKET_Y, 0)), part="basket")
kit.bevel(body, 0.06, 3)
basket_objs.append(body)
paint(body, lambda p: Vector(lin("#b07a42")).lerp(Vector(lin("#7a4f26")),
      0.5 + 0.5 * math.sin((p[1] - BASKET_Y) * 48) * math.sin((p[0] + p[2]) * 22)))
rim = kit.pipe("Borde acolchado", [(-.41, BASKET_Y + .27, -.41), (.41, BASKET_Y + .27, -.41), (.41, BASKET_Y + .27, .41),
                                   (-.41, BASKET_Y + .27, .41), (-.41, BASKET_Y + .27, -.41)], 0.055, WICKER, 8, 2, part="basket")
paint(rim, lambda p: lin("#5a3a22"))
basket_objs.append(rim)
for sx in (-1, 1):
    for sz in (-1, 1):
        top = (sx * mouth_r * 0.8, mouth_y - 0.3, sz * mouth_r * 0.8)
        rope = kit.pipe("Cuerda", [(sx * .36, BASKET_Y + .3, sz * .36), top], 0.018, WICKER, 6, 1, part="basket")
        paint(rope, lambda p: lin("#6b5a44"))
        basket_objs.append(rope)
BURNER_Y = BASKET_Y + 0.62
v, f = kit.g_cyl(0.13, 0.16, 0.16, 16)
burner = kit.make("Quemador", v, f, WICKER, kit.T((0, BURNER_Y, 0)), part="basket")
paint(burner, lambda p: lin("#8d949a"))
basket_objs.append(burner)
for sx, sz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
    strut = kit.pipe("Soporte quemador", [(sx * .36, BASKET_Y + .3, sz * .36), (sx * .14, BURNER_Y, sz * .14)], 0.015, WICKER, 6, 1, part="basket")
    paint(strut, lambda p: lin("#8d949a"))
    basket_objs.append(strut)

# Llama: pivote en la boca del quemador para que el juego la escale desde ahí.
v, f = kit.g_lathe([(0.001, 0.34), (0.05, 0.26), (0.10, 0.12), (0.09, 0.03), (0.001, 0.0)], 14)
flame = kit.make("Llama", v, f, FIRE, part="flame", smooth_angle=1.3)
flame.location = B((0, BURNER_Y + 0.08, 0))
paint(flame, lambda p: Vector(lin("#fff1a8")).lerp(Vector(lin("#ff7a2a")), min(1, p[1] / 0.3)))

# Unir por parte: una malla por `part`.
objects = []
for part in ["envelope_color", "envelope_trim", "basket", "flame"]:
    group = [o for o in COL.objects if o.get("part") == part]
    for ob in group:
        bpy.context.view_layer.objects.active = ob
        for m in list(ob.modifiers):
            bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.ops.object.select_all(action="DESELECT")
    for ob in group:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = group[0]
    if len(group) > 1:
        bpy.ops.object.join()
    ob = group[0]; ob.name = part; ob["part"] = part
    objects.append(ob)

meta = dict(note="origen en el centro del conjunto; envelope_color se tiñe con la nota; flame titila desde su base",
            height=round(CY + R * 1.12 - BASKET_Y + 0.26, 3))
parts, tris = kit.export_parts(ROOT / "globo.json", objects=objects, meta=meta)
assert parts == 4 and tris <= 12000, (parts, tris)
bpy.ops.object.select_all(action="DESELECT")
for ob in objects:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "globo.glb"), export_format="GLB", use_selection=True, export_extras=True)

# Render de revisión: tinte de ejemplo (nota Do, rojo) sobre el cielo pastel.
color_ob = objects[0]
tint = bpy.data.materials.new("Tinte revisión"); tint.use_nodes = True
tb = tint.node_tree.nodes["Principled BSDF"]
tvc = tint.node_tree.nodes.new("ShaderNodeVertexColor"); tvc.layer_name = "Pigment"
mix = tint.node_tree.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
mix.inputs[0].default_value = 1.0
mix.inputs[7].default_value = (*lin("#ff4d6d"), 1)
tint.node_tree.links.new(tvc.outputs["Color"], mix.inputs[6])
tint.node_tree.links.new(mix.outputs[2], tb.inputs["Base Color"])
tb.inputs["Roughness"].default_value = 0.55
color_ob.data.materials[0] = tint

world = bpy.data.worlds.new("Cielo"); world.use_nodes = True; scene.world = world
world.node_tree.nodes["Background"].inputs[0].default_value = (*lin("#b8d9f5"), 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.9
sun_data = bpy.data.lights.new("Sol", "SUN"); sun_data.energy = 3.0; sun_data.color = lin("#fff0e0")
sun = bpy.data.objects.new("Sol", sun_data); COL.objects.link(sun)
sun.rotation_euler = (math.radians(35), math.radians(-25), math.radians(40))
cam_data = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_data); COL.objects.link(cam)
scene.camera = cam
cam_data.sensor_fit = "VERTICAL"; cam_data.angle = math.radians(35)
cam.location = B((4.2, 1.2, 8.5))
cam.rotation_euler = (B((0, -0.2, 0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.engine = "CYCLES"; scene.cycles.samples = 40; scene.cycles.use_denoising = True
scene.view_settings.view_transform = "AgX"
scene.render.resolution_x, scene.render.resolution_y = 900, 1100
scene.render.filepath = str(ROOT / "render-globo.png")
bpy.ops.render.render(write_still=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "globo.blend"))
print("EXPORT", parts, tris, meta, flush=True)
