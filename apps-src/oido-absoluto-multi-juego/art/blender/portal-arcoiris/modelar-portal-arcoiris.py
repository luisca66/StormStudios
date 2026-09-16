"""Portal arcoíris de Las Nubes (nivel 5): aro de nube esponjosa con siete bandas de arcoíris.

Partes (kit.export_parts, espacio Three, Y arriba). El portal mira a +Z y su centro está en el
origen; el juego lo coloca en (0, 8, −170).
  cloud_ring   aro de cúmulos que abraza el arcoíris (fijo)
  band 0…6     cintas planas de rojo a violeta, de dentro hacia fuera; el juego las gira en Z
               en sentidos alternos (pivote = centro)
  veil         velo del centro, degradado blanco→lavanda (el juego lo dibuja translúcido)
  stars        cinco estrellas doradas sobre el aro (emisivas)
Ejecutar:
  powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 apps-src\\oido-absoluto-multi-juego\\art\\blender\\portal-arcoiris\\modelar-portal-arcoiris.py
"""
import bpy, bmesh, math, random, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit
from kit import B, lin

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
COL = bpy.data.collections.new("Portal arcoíris"); scene.collection.children.link(COL)
kit.setup(COL, 77)
rng = random.Random(777)


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


CLOUD = material("Nube", 1.0)
BAND = material("Banda", 0.5)
VEIL = material("Velo", 1.0)
STAR = material("Estrella", 0.35, "#ffd23a", 1.2)


def paint(ob, fn):
    me = ob.data
    attr = me.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
    for v, c in zip(me.vertices, attr.data):
        c.color = (*fn((v.co.x, v.co.z, -v.co.y), v.normal), 1)
    me.color_attributes.active_color = attr


RAINBOW = ["#ff3b3b", "#ff9a1f", "#ffe01f", "#46d65a", "#3f8cff", "#7a3fe0", "#c05cff"]
R0, STEP, WIDTH = 8.0, 0.9, 0.78

# --- Cintas del arcoíris: anillos planos con canto redondeado, mirando a +Z. -----------------
bands = []
for i, hexc in enumerate(RAINBOW):
    r_in = R0 + i * STEP - WIDTH / 2
    r_out = r_in + WIDTH
    prof = [(r_in, -0.10), (r_in - 0.05, 0.0), (r_in, 0.10), (r_out, 0.10), (r_out + 0.05, 0.0), (r_out, -0.10)]
    seg = 96
    v, f = [], []
    for s in range(seg):
        a = s / seg * math.tau
        for r, z in prof:
            v.append((math.cos(a) * r, math.sin(a) * r, z))
    n = len(prof)
    for s in range(seg):
        t = (s + 1) % seg
        for k in range(n):
            m = (k + 1) % n
            f.append((s * n + k, t * n + k, t * n + m, s * n + m))
    ob = kit.make(f"Banda {i}", v, f, BAND, part="band", smooth_angle=0.9)
    ob["segment"] = i
    col = Vector(lin(hexc))
    paint(ob, lambda p, nrm, col=col: tuple(col))
    bands.append(ob)

# --- Aro de nube: metaballs alrededor del arcoíris, más gordos abajo (la nube "pesa"). ------
RING_R = R0 + 6 * STEP + 1.25   # la nube abraza la última banda sin dejar cielo entre ambas
mb = bpy.data.metaballs.new("Aro de nube (metaball)")
mb.resolution = mb.render_resolution = 0.42
mb.threshold = 0.5
count = 58
for i in range(count):
    a = i / count * math.tau + rng.uniform(-0.03, 0.03)
    weight = 1.0 + 0.35 * max(0.0, -math.sin(a))      # abajo más esponjoso
    rad = rng.uniform(1.25, 1.75) * weight
    rr = RING_R + rng.uniform(-0.4, 0.6)
    el = mb.elements.new()
    el.co = B((math.cos(a) * rr, math.sin(a) * rr, rng.uniform(-0.5, 0.5)))
    el.radius = rad * 1.4
    el.stiffness = 3.0
    if rng.random() < 0.6:  # lóbulos exteriores: silueta de coliflor
        el2 = mb.elements.new()
        ro = rr + rad * 0.9
        el2.co = B((math.cos(a + 0.05) * ro, math.sin(a + 0.05) * ro, rng.uniform(-0.8, 0.8)))
        el2.radius = rad * 0.75 * 1.4
        el2.stiffness = 3.0
mob = bpy.data.objects.new("Aro (metaball)", mb); COL.objects.link(mob)
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
me = bpy.data.meshes.new_from_object(mob.evaluated_get(dg)); me.name = "Aro de nube"
bpy.data.objects.remove(mob)
ring = bpy.data.objects.new("Aro de nube", me); COL.objects.link(ring)
ring["part"] = "cloud_ring"
me.materials.append(CLOUD)
for p in me.polygons:
    p.use_smooth = True
tris = sum(len(p.vertices) - 2 for p in me.polygons)
if tris > 9000:
    dec = ring.modifiers.new("Aligerar", "DECIMATE"); dec.ratio = 9000 / tris
    bpy.context.view_layer.objects.active = ring
    bpy.ops.object.modifier_apply(modifier=dec.name)
for p in me.polygons:
    p.use_smooth = True
TOP, BELLY = Vector(lin("#ffffff")), Vector(lin("#d8d2ee"))
paint(ring, lambda p, nrm: tuple(BELLY.lerp(TOP, max(0.0, min(1.0, 0.55 + 0.45 * nrm.z)))))

# --- Velo del centro: disco con degradado radial (el juego lo hace translúcido). ---------------
seg, rings_n = 64, 6
v = [(0, 0, 0)]
for k in range(1, rings_n + 1):
    r = (R0 - WIDTH / 2) * k / rings_n
    for s in range(seg):
        a = s / seg * math.tau
        v.append((math.cos(a) * r, math.sin(a) * r, 0))
f = [(0, 1 + s, 1 + (s + 1) % seg) for s in range(seg)]
for k in range(rings_n - 1):
    b0, b1 = 1 + k * seg, 1 + (k + 1) * seg
    for s in range(seg):
        t = (s + 1) % seg
        f.append((b0 + s, b1 + s, b1 + t, b0 + t))
veil = kit.make("Velo", v, f, VEIL, part="veil", smooth_angle=3.0)
W, L = Vector(lin("#ffffff")), Vector(lin("#d9c8ff"))
paint(veil, lambda p, nrm: tuple(W.lerp(L, min(1.0, math.hypot(p[0], p[1]) / R0))))

# --- Estrellas doradas sobre el aro (arriba y a los lados). ----------------------------------
stars = []
for k, ang in enumerate([90, 60, 120, 32, 148]):
    a = math.radians(ang)
    rr = RING_R + 2.6 + (0.5 if k == 0 else 0)
    size = 1.3 if k == 0 else 0.85
    pts = []
    for j in range(10):
        t = j / 10 * math.tau + math.pi / 2
        r = size if j % 2 == 0 else size * 0.45
        pts.append((math.cos(t) * r, math.sin(t) * r))
    v, f = kit.g_prism(pts, 0.28)
    ob = kit.make(f"Estrella {k}", v, f, STAR, kit.T((math.cos(a) * rr, math.sin(a) * rr, 0.3), (0, 0, a - math.pi / 2)),
                  part="stars", smooth_angle=0.3)
    kit.bevel(ob, 0.06, 2)
    paint(ob, lambda p, nrm: lin("#ffd23a"))
    stars.append(ob)

# Unir estrellas en una malla.
for ob in stars:
    bpy.context.view_layer.objects.active = ob
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
bpy.ops.object.select_all(action="DESELECT")
for ob in stars:
    ob.select_set(True)
bpy.context.view_layer.objects.active = stars[0]
bpy.ops.object.join()
stars[0].name = "stars"; stars[0]["part"] = "stars"

objects = [ring, *bands, veil, stars[0]]
meta = dict(note="centro en el origen, mira a +Z; band i gira en Z en sentidos alternos; veil translúcido",
            bandRadii=[R0 + i * STEP for i in range(7)], outerRadius=round(RING_R + 3.2, 2))
parts, tris = kit.export_parts(ROOT / "portal-arcoiris.json", objects=objects, meta=meta)
assert parts == 10 and tris <= 20000, (parts, tris)
bpy.ops.object.select_all(action="DESELECT")
for ob in objects:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "portal-arcoiris.glb"), export_format="GLB", use_selection=True, export_extras=True)

world = bpy.data.worlds.new("Cielo"); world.use_nodes = True; scene.world = world
world.node_tree.nodes["Background"].inputs[0].default_value = (*lin("#b8d9f5"), 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.9
sun_data = bpy.data.lights.new("Sol", "SUN"); sun_data.energy = 3.0; sun_data.color = lin("#fff0e0")
sun = bpy.data.objects.new("Sol", sun_data); COL.objects.link(sun)
sun.rotation_euler = (math.radians(35), math.radians(-25), math.radians(20))
cam_data = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_data); COL.objects.link(cam)
scene.camera = cam
cam_data.sensor_fit = "VERTICAL"; cam_data.angle = math.radians(60)
cam.location = B((8, 3, 38))
cam.rotation_euler = (B((0, 0, 0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.engine = "CYCLES"; scene.cycles.samples = 32; scene.cycles.use_denoising = True
scene.view_settings.view_transform = "AgX"
scene.render.resolution_x, scene.render.resolution_y = 1400, 1000
scene.render.filepath = str(ROOT / "render-portal.png")
bpy.ops.render.render(write_still=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "portal-arcoiris.blend"))
print("EXPORT", parts, tris, flush=True)
