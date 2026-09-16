"""Kit del cielo de Las Nubes (nivel 5): isla flotante, flor mágica, cometa y pájaro.

Todas las piezas en un solo JSON (kit.export_parts, espacio Three, Y arriba). El juego las
coloca y tiñe en `environment.ts`; aquí solo va la forma y el pigmento base.

  island_rock    roca flotante con césped y arbustos; pivote en el centro del césped (y = 0)
  island_cloud   faldón de nube bajo el borde de la isla (mismo pivote)
  flower_stem    tallo con hojas; pivote en la base
  flower_bloom   corola de seis pétalos con botón; pivote en el centro (pigmento blanco: se tiñe)
  kite_sail_a/b  vela de rombo con cuatro paños de color (dos combinaciones); pivote en el cruce
  kite_frame     varillas y botón central; mismo pivote
  kite_bow       moño de la cola (pigmento blanco: se tiñe); pivote en el nudo
  bird_body      cuerpo y cabeza (pigmento blanco: se tiñe con el color del pájaro); mira a +Z
  bird_details   pecho, pico y ojos (conservan su pigmento); mismo pivote
  bird_wing      ala derecha (+X), pivote en el hombro; el juego la espeja para la izquierda
Ejecutar:
  powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 apps-src\\oido-absoluto-multi-juego\\art\\blender\\cielo\\modelar-cielo.py
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
COL = bpy.data.collections.new("Cielo"); scene.collection.children.link(COL)
kit.setup(COL, 505)
rng = random.Random(505)

MAT = bpy.data.materials.new("Pigmento"); MAT.use_nodes = True
_bs = MAT.node_tree.nodes["Principled BSDF"]
_bs.inputs["Base Color"].default_value = (1, 1, 1, 1)
_bs.inputs["Roughness"].default_value = 0.7
_vc = MAT.node_tree.nodes.new("ShaderNodeVertexColor"); _vc.layer_name = "Pigment"
MAT.node_tree.links.new(_vc.outputs["Color"], _bs.inputs["Base Color"])


def paint(ob, fn):
    me = ob.data
    attr = me.color_attributes.get("Pigment") or me.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
    for v, c in zip(me.vertices, attr.data):
        c.color = (*fn((v.co.x, v.co.z, -v.co.y), v.normal), 1)
    me.color_attributes.active_color = attr


def solid(hexc):
    col = lin(hexc)
    return lambda p, n: col


def join(objs, name, part):
    for ob in objs:
        bpy.context.view_layer.objects.active = ob
        for m in list(ob.modifiers):
            bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.ops.object.select_all(action="DESELECT")
    for ob in objs:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    ob = objs[0]; ob.name = name; ob["part"] = part
    return ob


def ellipsoid(name, center, radii, part, seg=16, rings=10):
    v, f = [], []
    for i in range(rings + 1):
        th = math.pi * i / rings
        for j in range(seg):
            a = math.tau * j / seg
            v.append((center[0] + radii[0] * math.sin(th) * math.cos(a),
                      center[1] + radii[1] * math.cos(th),
                      center[2] + radii[2] * math.sin(th) * math.sin(a)))
    for i in range(rings):
        for j in range(seg):
            k = (j + 1) % seg
            f.append((i * seg + j, i * seg + k, (i + 1) * seg + k, (i + 1) * seg + j))
    return kit.make(name, v, f, MAT, part=part, smooth_angle=1.4)


def metaball_mesh(name, balls, part, max_tris, resolution=0.35):
    mb = bpy.data.metaballs.new(name + " (mb)")
    mb.resolution = mb.render_resolution = resolution
    mb.threshold = 0.5
    for x, y, z, r in balls:
        el = mb.elements.new(); el.co = B((x, y, z)); el.radius = r * 1.4; el.stiffness = 3.0
    mob = bpy.data.objects.new(name + " (mb)", mb); COL.objects.link(mob)
    bpy.context.view_layer.update()
    me = bpy.data.meshes.new_from_object(mob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(mob)
    ob = bpy.data.objects.new(name, me); COL.objects.link(ob)
    ob["part"] = part
    me.materials.append(MAT)
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    if tris > max_tris:
        dec = ob.modifiers.new("Aligerar", "DECIMATE"); dec.ratio = max_tris / tris
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.modifier_apply(modifier=dec.name)
    for p in me.polygons:
        p.use_smooth = True
    return ob


objects = []

# ---------------------------------------------------------------------------
# Isla flotante: césped abombado, borde de tierra y roca lavanda que se afila hacia abajo.
# ---------------------------------------------------------------------------
TOP_R, DEPTH = 6.2, 9.0
SEG, RINGS_SIDE, RINGS_TOP = 40, 14, 5
noise = [rng.uniform(-1, 1) for _ in range(SEG)]
v, f = [(0, 0.7, 0)], []
for k in range(1, RINGS_TOP + 1):
    r = TOP_R * k / RINGS_TOP
    for j in range(SEG):
        a = math.tau * j / SEG
        rr = r * (1 + 0.07 * noise[j] * k / RINGS_TOP)
        v.append((math.cos(a) * rr, 0.7 * (1 - (k / RINGS_TOP) ** 2), math.sin(a) * rr))
for i in range(1, RINGS_SIDE + 1):
    t = i / RINGS_SIDE
    y = -DEPTH * t ** 1.15
    for j in range(SEG):
        a = math.tau * j / SEG
        bump = 1 + 0.10 * noise[j] + 0.08 * math.sin(a * 5 + t * 7) + 0.06 * math.sin(a * 11 - t * 13)
        r = max(0.25, TOP_R * (1 - t) ** 0.85 * bump) if i < RINGS_SIDE else 0.15
        v.append((math.cos(a) * r, y, math.sin(a) * r))
f = [(0, 1 + (j + 1) % SEG, 1 + j) for j in range(SEG)]
total_rings = RINGS_TOP + RINGS_SIDE
for k in range(total_rings - 1):
    b0, b1 = 1 + k * SEG, 1 + (k + 1) * SEG
    for j in range(SEG):
        n = (j + 1) % SEG
        f.append((b0 + j, b0 + n, b1 + n, b1 + j))
last = 1 + (total_rings - 1) * SEG
v.append((0, -DEPTH - 0.4, 0)); tip = len(v) - 1
for j in range(SEG):
    f.append((last + j, last + (j + 1) % SEG, tip))
rock = kit.make("Isla", v, f, MAT, part="island_rock", smooth_angle=0.9)
GRASS, GRASS_D = Vector(lin("#9fe6b4")), Vector(lin("#6fcf97"))
SOIL, ROCK, ROCK_D = Vector(lin("#c79f7a")), Vector(lin("#c3b3de")), Vector(lin("#9a87bd"))


def island_color(p, n):
    y = p[1]
    if y > -0.15 and n.z > 0.2:
        return tuple(GRASS.lerp(GRASS_D, 0.5 + 0.5 * math.sin(p[0] * 1.3) * math.cos(p[2] * 1.1)))
    if y > -1.0:
        return tuple(SOIL)
    stripe = 0.5 + 0.5 * math.sin(y * 2.4)
    return tuple(ROCK.lerp(ROCK_D, 0.25 + 0.45 * stripe + 0.3 * min(1, -y / DEPTH)))


paint(rock, island_color)
bushes = []
for k in range(5):
    a = rng.uniform(0, math.tau); r = rng.uniform(2.0, 4.8)
    b = ellipsoid("Arbusto", (math.cos(a) * r, 0.55, math.sin(a) * r), (rng.uniform(.7, 1.1), .65, rng.uniform(.7, 1.1)), "island_rock", 12, 8)
    paint(b, lambda p, n: tuple(GRASS_D.lerp(Vector(lin("#4fb07e")), 0.5 - 0.5 * n.z)))
    bushes.append(b)
objects.append(join([rock, *bushes], "island_rock", "island_rock"))

balls = []
for k in range(26):
    a = k / 26 * math.tau + rng.uniform(-.05, .05)
    r = TOP_R * rng.uniform(0.82, 1.02)
    balls.append((math.cos(a) * r, rng.uniform(-2.2, -1.2), math.sin(a) * r, rng.uniform(0.9, 1.4)))
cloud = metaball_mesh("Faldón de nube", balls, "island_cloud", 3000)
paint(cloud, lambda p, n: tuple(Vector(lin("#d8d2ee")).lerp(Vector(lin("#ffffff")), max(0, min(1, 0.55 + 0.45 * n.z)))))
objects.append(cloud)

# ---------------------------------------------------------------------------
# Flor mágica: tallo con hojas y corola de seis pétalos.
# ---------------------------------------------------------------------------
stem = kit.pipe("Tallo", [(0, 0, 0), (0.12, 0.9, 0.05), (-0.05, 1.7, 0), (0, 2.2, 0)], 0.07, MAT, 8, 4, part="flower_stem")
paint(stem, solid("#5fbf7f"))
leaves = []
for side in (-1, 1):
    pts = [(0, 0.7, 0), (side * 0.45, 0.95, 0.05), (side * 0.75, 1.05, 0.0)]
    lv, lf = [], []
    path = kit.catmull(pts, 6)
    for i, p in enumerate(path):
        w = 0.2 * math.sin(math.pi * i / (len(path) - 1))
        lv.extend([(p.x, p.y, p.z - w), (p.x, p.y, p.z + w)])
    lf = [(i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2) for i in range(len(path) - 1)]
    leaf = kit.make("Hoja", lv, lf, MAT, part="flower_stem", smooth_angle=1.4)
    paint(leaf, solid("#7fd99a"))
    leaves.append(leaf)
objects.append(join([stem, *leaves], "flower_stem", "flower_stem"))

petals = []
for k in range(6):
    a = k / 6 * math.tau
    p = ellipsoid("Pétalo", (0, 0, 0), (0.28, 0.08, 0.55), "flower_bloom", 12, 8)
    p.matrix_world = kit.T((0, 0, 0), (0, 0, 0)).copy()  # se transforma abajo
    me = p.data
    for vert in me.vertices:
        x, y, z = vert.co.x, vert.co.z, -vert.co.y            # Three
        z += 0.5                                              # pétalo hacia fuera
        y += 0.25 * (z / 1.05) ** 2                           # la punta se curva hacia arriba
        xr = x * math.cos(a) + z * math.sin(a)
        zr = -x * math.sin(a) + z * math.cos(a)
        vert.co = B((xr, y, zr))
    me.update()
    paint(p, lambda q, n: tuple(Vector(lin("#ffffff")).lerp(Vector(lin("#f2ecff")), min(1, math.hypot(q[0], q[2]) / 1.0))))
    petals.append(p)
core = ellipsoid("Botón", (0, 0.08, 0), (0.24, 0.2, 0.24), "flower_bloom", 12, 8)
paint(core, solid("#fff3b0"))
objects.append(join([*petals, core], "flower_bloom", "flower_bloom"))

# ---------------------------------------------------------------------------
# Cometa: vela abombada de cuatro paños, varillas y moño de la cola.
# ---------------------------------------------------------------------------
TOPP, RIGHT, BOTTOM, LEFT = (0, 1.4), (1.0, 0.1), (0, -1.8), (-1.0, 0.1)
PANELS = [(TOPP, RIGHT), (RIGHT, BOTTOM), (BOTTOM, LEFT), (LEFT, TOPP)]


def sail(name, part, colors):
    v, f, cols = [], [], []
    N = 6
    for pi, (a, b) in enumerate(PANELS):
        base = len(v)
        for i in range(N + 1):
            for j in range(N + 1 - i):
                u, w = i / N, j / N
                x = a[0] * u + b[0] * w
                y = a[1] * u + b[1] * w
                billow = 0.14 * (1 - u - w) * 1.0 + 0.10 * u * w * 4 * (1 - u - w + 0.25)
                v.append((x, y, billow))
                cols.append(colors[pi])
        idx = {}
        c = base
        for i in range(N + 1):
            for j in range(N + 1 - i):
                idx[(i, j)] = c; c += 1
        for i in range(N):
            for j in range(N - i):
                f.append((idx[(i, j)], idx[(i + 1, j)], idx[(i, j + 1)]))
                if j + 1 <= N - i - 1:
                    f.append((idx[(i + 1, j)], idx[(i + 1, j + 1)], idx[(i, j + 1)]))
    ob = kit.make(name, v, f, MAT, part=part, smooth_angle=0.5, recalc=False)
    me = ob.data
    attr = me.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
    for i, c in enumerate(attr.data):
        c.color = (*lin(cols[i]), 1)
    me.color_attributes.active_color = attr
    return ob


objects.append(sail("Vela A", "kite_sail_a", ["#ff6699", "#ffcc33", "#66ddff", "#ff8833"]))
objects.append(sail("Vela B", "kite_sail_b", ["#66ddff", "#ff8833", "#cc66ff", "#66e68c"]))
frame_parts = [
    kit.pipe("Varilla", [(0, 1.45, 0.03), (0, -1.85, 0.03)], 0.028, MAT, 6, 1, part="kite_frame"),
    kit.pipe("Travesaño", [(-1.03, 0.1, 0.03), (1.03, 0.1, 0.03)], 0.024, MAT, 6, 1, part="kite_frame"),
    ellipsoid("Botón", (0, 0.1, 0.05), (0.09, 0.09, 0.06), "kite_frame", 10, 6),
]
for ob in frame_parts:
    paint(ob, solid("#fbf6ff"))
objects.append(join(frame_parts, "kite_frame", "kite_frame"))

bow_v, bow_f = [], []
for side in (-1, 1):
    base = len(bow_v)
    bow_v += [(0, 0, 0), (side * 0.32, 0.16, 0.02), (side * 0.36, 0, 0.03), (side * 0.32, -0.16, 0.02)]
    bow_f += [(base, base + 1, base + 2), (base, base + 2, base + 3)]
bow = kit.make("Moño", bow_v, bow_f, MAT, part="kite_bow", smooth_angle=1.0)
mod = bow.modifiers.new("Grosor", "SOLIDIFY"); mod.thickness = 0.03; mod.offset = 0
knot = ellipsoid("Nudo", (0, 0, 0.01), (0.07, 0.07, 0.05), "kite_bow", 8, 6)
paint(bow, solid("#ffffff")); paint(knot, solid("#ffffff"))
objects.append(join([bow, knot], "kite_bow", "kite_bow"))

# ---------------------------------------------------------------------------
# Pájaro redondo: cuerpo y cabeza (se tiñen), pecho, pico y ojos, y un ala con plumas.
# ---------------------------------------------------------------------------
torso = ellipsoid("Torso", (0, 0, 0), (0.72, 0.76, 0.78), "bird_body", 18, 12)
head = ellipsoid("Cabeza", (0, 0.72, 0.34), (0.52, 0.5, 0.52), "bird_body", 16, 12)
tail = []
for idx in (-1, 0, 1):
    t = ellipsoid("Pluma cola", (0, 0, 0), (0.12, 0.05, 0.42), "bird_body", 10, 6)
    for vert in t.data.vertices:
        x, y, z = vert.co.x, vert.co.z, -vert.co.y
        a = idx * 0.28
        z -= 0.35
        xr, zr = x * math.cos(a) + z * math.sin(a), -x * math.sin(a) + z * math.cos(a)
        vert.co = B((xr, y - 0.1 + 0.25 * zr * -0.4, zr - 0.62))
    t.data.update()
    tail.append(t)
for ob in (torso, head, *tail):
    paint(ob, lambda p, n: tuple(Vector(lin("#ffffff")).lerp(Vector(lin("#e6e6ee")), max(0, -n.z) * 0.6)))
objects.append(join([torso, head, *tail], "bird_body", "bird_body"))

belly = ellipsoid("Pecho", (0, -0.1, 0.46), (0.44, 0.42, 0.3), "bird_details", 14, 10)
paint(belly, solid("#fff8ee"))
v, f = kit.g_lathe([(0.001, 0.32), (0.08, 0.12), (0.13, 0.0)], 10)
beak = kit.make("Pico", v, f, MAT, kit.T((0, 0.66, 0.8), (math.pi / 2, 0, 0)), part="bird_details", smooth_angle=0.8)
paint(beak, solid("#ffb833"))
eyes = []
for s in (-1, 1):
    e = ellipsoid("Ojo", (s * 0.28, 0.84, 0.74), (0.085, 0.1, 0.06), "bird_details", 10, 6)
    paint(e, solid("#1a1a33"))
    hl = ellipsoid("Brillo", (s * 0.30, 0.88, 0.79), (0.03, 0.03, 0.02), "bird_details", 6, 4)
    paint(hl, solid("#ffffff"))
    eyes += [e, hl]
objects.append(join([belly, beak, *eyes], "bird_details", "bird_details"))

wing_parts = []
w = ellipsoid("Ala", (0.72, 0, 0), (0.78, 0.07, 0.46), "bird_wing", 14, 8)
paint(w, lambda p, n: tuple(Vector(lin("#ffffff")).lerp(Vector(lin("#e0e0ea")), min(1, p[0] / 1.5))))
wing_parts.append(w)
for k in range(3):
    fz = 0.28 - k * 0.24
    fe = ellipsoid("Pluma", (1.35 + 0.05 * k, -0.02, fz), (0.36 - 0.04 * k, 0.05, 0.12), "bird_wing", 10, 6)
    paint(fe, solid("#f0f0f6"))
    wing_parts.append(fe)
objects.append(join(wing_parts, "bird_wing", "bird_wing"))

for ob in objects:
    for p in ob.data.polygons:
        p.use_smooth = True

parts, tris = kit.export_parts(ROOT / "cielo.json", objects=objects,
                              meta=dict(note="piezas del cielo del nivel 5; ver docstring de modelar-cielo.py"))
assert parts == 11 and tris <= 24000, (parts, tris)
bpy.ops.object.select_all(action="DESELECT")
for ob in objects:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "cielo.glb"), export_format="GLB", use_selection=True, export_extras=True)

# Render de revisión: isla con flor, dos cometas con moños y un pájaro con alas abiertas.
by = {ob["part"]: ob for ob in objects}
by["island_rock"].location = B((-9, 4, 0)); by["island_cloud"].location = B((-9, 4, 0))
by["flower_stem"].location = B((-9, 4.6, 0)); by["flower_bloom"].location = B((-9, 6.8, 0))
by["flower_bloom"].scale = (1.6, 1.6, 1.6); by["flower_stem"].scale = (1.6, 1.6, 1.6)
by["flower_bloom"].location = B((-9, 4.6 + 2.2 * 1.6, 0))
by["kite_sail_a"].location = B((3, 6, 0)); by["kite_sail_b"].location = B((7, 5, 0))
by["kite_frame"].location = B((3, 6, 0))
for ob in (by["kite_sail_a"], by["kite_sail_b"], by["kite_frame"]):
    ob.scale = (1.5, 1.5, 1.5)
frame2 = by["kite_frame"].copy(); frame2.data = by["kite_frame"].data; COL.objects.link(frame2); frame2.location = B((7, 5, 0))
for k in range(4):
    bw = by["kite_bow"].copy(); bw.data = by["kite_bow"].data; COL.objects.link(bw)
    bw.location = B((3 + 0.2 * math.sin(k), 6 - 3.2 - k * 0.9, 0)); bw.scale = (1.5, 1.5, 1.5)
by["kite_bow"].location = B((7, 5 - 3.0, 0)); by["kite_bow"].scale = (1.5, 1.5, 1.5)
for key in ("bird_body", "bird_details"):
    by[key].location = B((12, 3, 0)); by[key].scale = (1.4, 1.4, 1.4)
    by[key].rotation_euler = (0, 0, math.radians(35))
by["bird_wing"].location = B((12 + 0.84 * 0.82, 3.07, -0.84 * 0.57)); by["bird_wing"].scale = (1.4, 1.4, 1.4)
by["bird_wing"].rotation_euler = (0, 0, math.radians(35))
wl = by["bird_wing"].copy(); wl.data = by["bird_wing"].data; COL.objects.link(wl)
wl.scale = (-1.4, 1.4, 1.4); wl.location = B((12 - 0.84 * 0.82, 3.07, 0.84 * 0.57))

world = bpy.data.worlds.new("Cielo"); world.use_nodes = True; scene.world = world
world.node_tree.nodes["Background"].inputs[0].default_value = (*lin("#b8d9f5"), 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.9
sun_data = bpy.data.lights.new("Sol", "SUN"); sun_data.energy = 3.0; sun_data.color = lin("#fff0e0")
sun = bpy.data.objects.new("Sol", sun_data); COL.objects.link(sun)
sun.rotation_euler = (math.radians(35), math.radians(-25), math.radians(30))
cam_data = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_data); COL.objects.link(cam)
scene.camera = cam
cam_data.sensor_fit = "VERTICAL"; cam_data.angle = math.radians(40)
cam.location = B((1, 7, 34))
cam.rotation_euler = (B((1, 2.5, 0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.engine = "CYCLES"; scene.cycles.samples = 32; scene.cycles.use_denoising = True
scene.view_settings.view_transform = "AgX"
scene.render.resolution_x, scene.render.resolution_y = 1800, 900
scene.render.filepath = str(ROOT / "render-kit.png")
bpy.ops.render.render(write_still=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "cielo.blend"))
print("EXPORT", parts, tris, {ob["part"]: sum(len(p.vertices) - 2 for p in ob.data.polygons) for ob in objects}, flush=True)
