"""Unicornio-pegaso de Las Nubes (nivel 5), según BRIEF.md de esta carpeta. Modelado por Claude.

Espacio Three (Y arriba), hocico hacia +Z, cascos en y = 0. Cuerpo orgánico con metaballs
(torso, grupa, pecho, cuello, cabeza y hocico se funden solos); el resto son piezas animables
con su pivote en el origen del objeto:
  body            torso, cuello, cabeza, orejas y fosas (fijo)
  leg 0..3        trasera izq., trasera der., delantera izq., delantera der. (pivote: cadera/hombro)
  wing 0..1       izquierda (−X), derecha (+X) (pivote: articulación sobre la cruz)
  mane 0..5       mechones de la nuca a la cruz (pivote: raíz)
  tail 0..4       mechones de la cola (pivote: raíz común)
  horn            espiral dorada (pivote: base en la frente; única parte emisiva)
  eyes            ojos grandes con brillo (pivote: centro de la cabeza)
Ejecutar:
  powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 apps-src\\oido-absoluto-multi-juego\\art\\blender\\unicornio\\modelar-unicornio.py
"""
import bpy, math, random, sys
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit
from kit import B, lin

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
COL = bpy.data.collections.new("Unicornio"); scene.collection.children.link(COL)
kit.setup(COL, 1555)
rng = random.Random(1555)
RENDER = "--no-render" not in sys.argv


def material(name, rough, metal=0.0, emit=None, strength=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    bs = m.node_tree.nodes["Principled BSDF"]
    bs.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bs.inputs["Roughness"].default_value = rough
    bs.inputs["Metallic"].default_value = metal
    if emit:
        bs.inputs["Emission Color"].default_value = (*lin(emit), 1)
        bs.inputs["Emission Strength"].default_value = strength
    vc = m.node_tree.nodes.new("ShaderNodeVertexColor"); vc.layer_name = "Pigment"
    m.node_tree.links.new(vc.outputs["Color"], bs.inputs["Base Color"])
    return m


COAT = material("Pelaje", 0.5)
HAIR = material("Crin", 0.45)
FEATHER = material("Plumas", 0.55)
HORN = material("Cuerno", 0.25, 0.6, "#ffb300", 0.4)
EYE = material("Ojos", 0.15)


def paint(ob, fn):
    me = ob.data
    attr = me.color_attributes.get("Pigment") or me.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
    for v, c in zip(me.vertices, attr.data):
        wp = ob.matrix_world @ v.co
        c.color = (*fn((wp.x, wp.z, -wp.y), v.normal), 1)
    me.color_attributes.active_color = attr


def V(h):
    return Vector(lin(h))


def join(objs, name):
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
    objs[0].name = name
    return objs[0]


def set_pivot(ob, pivot, part, segment=None):
    """Mueve el origen del objeto al pivote (espacio Three) sin mover la geometría."""
    pb = B(pivot)
    ob.data.transform(Matrix.Translation(-pb))
    ob.location = pb
    ob["part"] = part
    if segment is not None:
        ob["segment"] = segment
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def metaball(name, balls, mat, max_tris, resolution):
    mb = bpy.data.metaballs.new(name + " (mb)")
    mb.resolution = mb.render_resolution = resolution
    mb.threshold = 0.6
    for x, y, z, r in balls:
        el = mb.elements.new(); el.co = B((x, y, z)); el.radius = r; el.stiffness = 2.0
    mob = bpy.data.objects.new(name + " (mb)", mb); COL.objects.link(mob)
    bpy.context.view_layer.update()
    me = bpy.data.meshes.new_from_object(mob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(mob)
    ob = bpy.data.objects.new(name, me); COL.objects.link(ob)
    me.materials.append(mat)
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    if tris > max_tris:
        dec = ob.modifiers.new("Aligerar", "DECIMATE"); dec.ratio = max_tris / tris
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.modifier_apply(modifier=dec.name)
    for p in me.polygons:
        p.use_smooth = True
    return ob


def chain(a, b, r0, r1, n):
    """Bolas a lo largo de un segmento, del radio r0 al r1 (para metaballs)."""
    out = []
    for i in range(n):
        t = i / max(1, n - 1)
        p = Vector(a).lerp(Vector(b), t)
        out.append((p.x, p.y, p.z, r0 + (r1 - r0) * t))
    return out


def ellipsoid(name, center, radii, mat, seg=16, rings=10, rot=None):
    v, f = [], []
    for i in range(rings + 1):
        th = math.pi * i / rings
        for j in range(seg):
            a = math.tau * j / seg
            v.append((radii[0] * math.sin(th) * math.cos(a), radii[1] * math.cos(th), radii[2] * math.sin(th) * math.sin(a)))
    for i in range(rings):
        for j in range(seg):
            k = (j + 1) % seg
            f.append((i * seg + j, i * seg + k, (i + 1) * seg + k, (i + 1) * seg + j))
    M = kit.T(center, rot or (0, 0, 0))
    return kit.make(name, v, f, mat, M, part="tmp", smooth_angle=1.5)


def tube(name, pts, r0, r1, mat, sides=10, per=6):
    """Tubo que se afila de r0 a r1 siguiendo una curva (mechones)."""
    path = kit.catmull(pts, per)
    n = len(path)
    v, f = [], []
    tangent = (path[1] - path[0]).normalized()
    normal = Vector((0, 1, 0)) if abs(tangent.y) < 0.9 else Vector((1, 0, 0))
    normal = (normal - tangent * normal.dot(tangent)).normalized()
    for i, p in enumerate(path):
        if i > 0:
            t_new = (path[min(i + 1, n - 1)] - path[i - 1]).normalized()
            normal = (normal - t_new * normal.dot(t_new)).normalized()
            tangent = t_new
        binormal = tangent.cross(normal)
        t = i / (n - 1)
        r = r0 + (r1 - r0) * t ** 0.8
        r *= 1 - 0.85 * max(0.0, (t - 0.9) / 0.1)   # punta cerrada
        for k in range(sides):
            a = k / sides * math.tau
            v.append(tuple(p + (normal * math.cos(a) * 1.25 + binormal * math.sin(a) * 0.8) * r))
    for i in range(n - 1):
        for k in range(sides):
            m = (k + 1) % sides
            f.append((i * sides + k, (i + 1) * sides + k, (i + 1) * sides + m, i * sides + m))
    f.append(tuple(reversed(range(sides))))
    f.append(tuple((n - 1) * sides + k for k in range(sides)))
    return kit.make(name, v, f, mat, part="tmp", smooth_angle=1.4)


objects = []
PEARL, LILAC, BLUSH = V("#faf6ff"), V("#e6dbf8"), V("#ffd9e8")

# ---------------------------------------------------------------------------
# Cuerpo: grupa redonda, torso, pecho, cuello arqueado y cabeza grande de peluche.
# ---------------------------------------------------------------------------
HEAD = (0.0, 3.35, 1.55)
body_balls = [
    (0, 1.95, -0.62, 1.05),  # grupa
    (0.34, 1.92, -0.7, 0.62), (-0.34, 1.92, -0.7, 0.62),
    (0, 1.85, 0.05, 1.02),   # torso
    (0, 1.72, 0.2, 0.8),     # panza
    (0, 2.0, 0.72, 0.95),    # pecho
]
body_balls += chain((0, 2.45, 0.9), (0, 3.05, 1.3), 0.66, 0.52, 5)     # cuello
body_balls += [
    (HEAD[0], HEAD[1], HEAD[2], 0.88),                                 # cráneo
    (0.2, 3.25, 1.75, 0.5), (-0.2, 3.25, 1.75, 0.5),                     # mejillas
    (0, 3.02, 2.18, 0.56),                                             # hocico
]
body = metaball("Cuerpo", body_balls, COAT, 13000, 0.085)
parts_body = [body]
# Orejas: conos con interior rosa.
for s in (-1, 1):
    v, f = kit.g_lathe([(0.001, 0.42), (0.1, 0.28), (0.15, 0.08), (0.12, 0.0)], 12)
    ear = kit.make("Oreja", v, f, COAT, kit.T((s * 0.36, 3.9, 1.28), (-0.25, 0, s * -0.35), (1, 1, 0.6)), part="tmp", smooth_angle=1.2)
    paint(ear, lambda p, n, s=s: tuple(PEARL))
    inner = ellipsoid("Oreja interior", (s * 0.36 + s * 0.02, 4.02, 1.33), (0.07, 0.15, 0.03), COAT, 10, 6, (-0.25, 0, s * -0.35))
    paint(inner, lambda p, n: tuple(V("#ffb0c0")))
    parts_body += [ear, inner]
for s in (-1, 1):
    nos = ellipsoid("Fosa", (s * 0.17, 3.06, 2.5), (0.06, 0.035, 0.03), COAT, 8, 5)
    paint(nos, lambda p, n: tuple(V("#e98fb0")))
    parts_body.append(nos)


def coat_color(p, n):
    x, y, z = p
    col = PEARL.lerp(LILAC, max(0.0, min(1.0, -n.z * 0.9)) * 0.8)          # panza lila suave
    if z > 2.2 and y < 3.3:
        col = col.lerp(BLUSH, min(1.0, (z - 2.2) / 0.5) * 0.6)                # hocico rosado
    return tuple(col)


paint(body, coat_color)
body = join(parts_body, "body")
set_pivot(body, (0, 0, 0), "body")
objects.append(body)

# ---------------------------------------------------------------------------
# Patas: muslo, rodilla, caña y casco lila. Pivote en cadera/hombro.
# ---------------------------------------------------------------------------
LEGS = [(-0.5, -0.7, "trasera"), (0.5, -0.7, "trasera"), (-0.46, 0.72, "delantera"), (0.46, 0.72, "delantera")]
for i, (x, z, kind) in enumerate(LEGS):
    hip = (x, 1.55, z)
    back = kind == "trasera"
    balls = chain(hip, (x * 1.02, 0.95, z + (-0.06 if back else 0.04)), 0.42 if back else 0.36, 0.28, 5)
    balls += chain((x * 1.02, 0.95, z + (-0.06 if back else 0.04)), (x, 0.3, z), 0.27, 0.23, 5)
    leg = metaball(f"Pata {i}", balls, COAT, 750, 0.05)
    v, f = kit.g_lathe([(0.001, 0.0), (0.2, 0.0), (0.22, 0.08), (0.19, 0.24), (0.14, 0.3), (0.001, 0.3)], 16)
    hoof = kit.make("Casco", v, f, COAT, kit.T((x, 0.0, z)), part="tmp", smooth_angle=0.9)
    paint(leg, lambda p, n: tuple(PEARL.lerp(LILAC, max(0.0, -n.z) * 0.5)))
    paint(hoof, lambda p, n: tuple(V("#eeaaff").lerp(V("#d58ae8"), 0.5 - 0.5 * n.z)))
    leg = join([leg, hoof], f"leg {i}")
    set_pivot(leg, hip, "leg", i)
    objects.append(leg)

# ---------------------------------------------------------------------------
# Alas: cobertoras, secundarias y primarias; plumas blancas con punta lavanda.
# ---------------------------------------------------------------------------
SHOULDER = (0.62, 2.62, 0.3)


def feather(center, length, width, yaw, lift, droop):
    """Pluma alargada acostada en XZ, apuntando en `yaw` (0 = +X), con punta que cae."""
    v, f = [], []
    SEGL, SEGW = 8, 4
    for i in range(SEGL + 1):
        t = i / SEGL
        w = width * math.sin(math.pi * (0.12 + 0.88 * t)) ** 0.7 * (1 - 0.35 * t)
        for j in range(SEGW + 1):
            u = j / SEGW * 2 - 1
            x = t * length
            z = u * w
            y = 0.05 * (1 - u * u) - droop * t * t
            v.append((x, y, z))
    for i in range(SEGL):
        for j in range(SEGW):
            a = i * (SEGW + 1) + j
            f.append((a, a + SEGW + 1, a + SEGW + 2, a + 1))
    ob = kit.make("Pluma", v, f, FEATHER, kit.T(center, (0, yaw, lift)), part="tmp", smooth_angle=1.4)
    mod = ob.modifiers.new("Grosor", "SOLIDIFY"); mod.thickness = 0.035; mod.offset = 0
    return ob


def wing(side, segment):
    sx = 1 if side > 0 else -1
    pieces = []
    base = Vector((SHOULDER[0] * sx, SHOULDER[1], SHOULDER[2]))

    def aim(phi):
        """phi: 0 = hacia fuera (±X), 90° = hacia atrás (−Z)."""
        phi = math.radians(phi)
        return phi if sx > 0 else math.pi - phi

    # Brazo del ala: masa suave que tapa las raíces de las plumas.
    arm = metaball("Brazo ala", chain(tuple(base), (sx * 2.15, 2.8, 0.1), 0.34, 0.2, 7), FEATHER, 900, 0.05)
    pieces.append(arm)
    # Primarias: abanico en la punta, de casi hacia fuera a hacia atrás.
    for k in range(6):
        c = (sx * (1.95 - 0.08 * k), 2.8, 0.1 - 0.02 * k)
        pieces.append(feather(c, 1.9 - 0.14 * k, 0.21, aim(12 + k * 13), 0.1, 0.16))
    # Secundarias: fila bajo el brazo apuntando atrás.
    for k in range(6):
        c = (sx * (0.75 + 0.2 * k), 2.72, 0.28 - 0.04 * k)
        pieces.append(feather(c, 1.25 - 0.03 * k, 0.19, aim(96 - k * 3), 0.05, 0.12))
    # Cobertoras: escamas cortas sobre el brazo.
    for k in range(6):
        c = (sx * (0.7 + 0.26 * k), 2.84, 0.38 - 0.05 * k)
        pieces.append(feather(c, 0.62, 0.17, aim(80 - k * 4), 0.08, 0.03))
    for ob in pieces:
        paint(ob, lambda p, n, sx=sx: tuple(V("#ffffff").lerp(V("#e6dbff"),
              max(0.0, min(1.0, (abs(p[0]) - 1.9) / 1.4)) + max(0.0, min(1.0, (-p[2] - 0.7) / 0.8)))))
    wg = join(pieces, f"wing {segment}")
    # Diedro: el ala sube desde el hombro (giro en Z de Three = −Y de Blender).
    bb = B(tuple(base))
    wg.data.transform(Matrix.Translation(bb) @ Matrix.Rotation(-0.32 * sx, 4, "Y") @ Matrix.Translation(-bb))
    set_pivot(wg, tuple(base), "wing", segment)
    return wg


objects.append(wing(-1, 0))
objects.append(wing(1, 1))

# ---------------------------------------------------------------------------
# Crin: seis mechones gruesos que caen alternando a los dos lados del cuello; cola en cascada.
# ---------------------------------------------------------------------------
RAINBOW = ["#ff6699", "#ffcc55", "#88ddff", "#aa66ff", "#66eebb", "#ff9ec7"]
mane_roots = [Vector((0.0, 3.98, 1.3)).lerp(Vector((0.0, 2.72, 0.42)), k / 5) for k in range(6)]
for k, root in enumerate(mane_roots):
    s = (1 if k % 2 == 0 else -1) * (1.0 if k < 4 else 0.8)   # alternan a ambos lados del cuello
    length = 0.95 - 0.06 * k
    pts = [tuple(root), tuple(root + Vector((0.28 * s, 0.05, -0.12))), tuple(root + Vector((0.55 * s, -0.4 * length, -0.2))),
           tuple(root + Vector((0.62 * s, -0.95 * length, -0.12))), tuple(root + Vector((0.45 * s, -1.15 * length, 0.02)))]
    lock = tube(f"Mechón {k}", pts, 0.27, 0.05, HAIR, 10, 5)
    c0, c1 = V(RAINBOW[k]), V(RAINBOW[(k + 1) % 6])
    paint(lock, lambda p, n, c0=c0, c1=c1, root=root: tuple(c0.lerp(c1, max(0.0, min(1.0, (root.y - p[1]) / 1.1)) * 0.5)))
    set_pivot(lock, tuple(root), "mane", k)
    objects.append(lock)
# Copete sobre la frente (fijo, parte del cuerpo visual; va con el mechón 0).

TAIL_ROOT = (0.0, 2.3, -0.95)
for k in range(5):
    dx = (k - 2) * 0.1
    r = Vector(TAIL_ROOT)
    pts = [tuple(r), tuple(r + Vector((dx * 0.6, 0.25, -0.45))), tuple(r + Vector((dx * 1.2, -0.2, -0.85))),
           tuple(r + Vector((dx * 1.5, -0.95, -0.85))), tuple(r + Vector((dx * 1.2, -1.55, -0.62))),
           tuple(r + Vector((dx * 0.6 + 0.12, -1.72, -0.42)))]
    lock = tube(f"Cola {k}", pts, 0.22 - 0.02 * abs(k - 2), 0.04, HAIR, 10, 5)
    c0, c1 = V(RAINBOW[k]), V(RAINBOW[(k + 2) % 6])
    paint(lock, lambda p, n, c0=c0, c1=c1: tuple(c0.lerp(c1, max(0.0, min(1.0, (TAIL_ROOT[1] - p[1]) / 1.7)) * 0.55)))
    set_pivot(lock, TAIL_ROOT, "tail", k)
    objects.append(lock)

# ---------------------------------------------------------------------------
# Cuerno: espiral dorada. Ojos grandes violeta con brillo.
# ---------------------------------------------------------------------------
HORN_BASE = (0.0, 3.82, 1.66)
H_LEN, SEGS, RINGS = 1.0, 20, 30
v, f = [], []
for i in range(RINGS + 1):
    t = i / RINGS
    for j in range(SEGS):
        a = j / SEGS * math.tau
        groove = 1 - 0.18 * (0.5 + 0.5 * math.sin(a * 2 + t * 5.5 * math.tau))
        r = max(0.004, 0.15 * (1 - t) ** 0.9) * groove
        v.append((math.cos(a) * r, t * H_LEN, math.sin(a) * r))
for i in range(RINGS):
    for j in range(SEGS):
        k = (j + 1) % SEGS
        f.append((i * SEGS + j, i * SEGS + k, (i + 1) * SEGS + k, (i + 1) * SEGS + j))
f.append(tuple(reversed(range(SEGS))))
horn = kit.make("Cuerno", v, f, HORN, kit.T(HORN_BASE, (0.3, 0, 0)), part="tmp", smooth_angle=1.0)
paint(horn, lambda p, n: tuple(V("#ffd23a").lerp(V("#fff1a8"), max(0.0, min(1.0, (p[1] - 4.0) / 1.0)))))
set_pivot(horn, HORN_BASE, "horn")
objects.append(horn)

eye_parts = []
for s in (-1, 1):
    c = Vector((s * 0.4, 3.42, 1.98))
    rot = (0, s * 0.7, 0)
    white = ellipsoid("Ojo", tuple(c), (0.2, 0.25, 0.1), EYE, 14, 10, rot)
    paint(white, lambda p, n: tuple(V("#ffffff")))
    fwd = Vector((s * 0.58, 0.0, 0.81)).normalized()
    iris = ellipsoid("Iris", tuple(c + fwd * 0.06 + Vector((0, -0.02, 0))), (0.15, 0.19, 0.07), EYE, 14, 10, rot)
    paint(iris, lambda p, n: tuple(V("#8822cc").lerp(V("#c77dff"), max(0.0, n.z * -0.0 + 0.3))))
    pupil = ellipsoid("Pupila", tuple(c + fwd * 0.11 + Vector((0, -0.02, 0))), (0.08, 0.1, 0.04), EYE, 12, 8, rot)
    paint(pupil, lambda p, n: tuple(V("#1a0b2e")))
    hl = ellipsoid("Brillo", tuple(c + fwd * 0.14 + Vector((s * -0.03, 0.08, 0))), (0.045, 0.05, 0.02), EYE, 8, 6, rot)
    paint(hl, lambda p, n: tuple(V("#ffffff")))
    eye_parts += [white, iris, pupil, hl]
eyes = join(eye_parts, "eyes")
set_pivot(eyes, HEAD, "eyes")
objects.append(eyes)

# ---------------------------------------------------------------------------
parts, tris = kit.export_parts(ROOT / "unicornio.json", objects=objects,
                              meta=dict(forward="+Z", origin="cascos en y=0", hornTip=[0, round(HORN_BASE[1] + math.cos(0.3) * H_LEN, 3), round(HORN_BASE[2] + math.sin(0.3) * H_LEN, 3)]))
counts = {}
for ob in objects:
    counts[ob["part"]] = counts.get(ob["part"], 0) + sum(len(p.vertices) - 2 for p in ob.data.polygons)
print("EXPORT", parts, tris, counts, flush=True)
assert parts == 20 and tris <= 34000, (parts, tris)
bpy.ops.object.select_all(action="DESELECT")
for ob in objects:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "unicornio.glb"), export_format="GLB", use_selection=True, export_extras=True)

if RENDER:
    world = bpy.data.worlds.new("Cielo"); world.use_nodes = True; scene.world = world
    world.node_tree.nodes["Background"].inputs[0].default_value = (*lin("#b8d9f5"), 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 1.0
    sun_data = bpy.data.lights.new("Sol", "SUN"); sun_data.energy = 3.2; sun_data.color = lin("#fff0e0")
    sun = bpy.data.objects.new("Sol", sun_data); COL.objects.link(sun)
    sun.rotation_euler = (math.radians(40), math.radians(-20), math.radians(150))
    cam_data = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_data); COL.objects.link(cam)
    scene.camera = cam
    cam_data.sensor_fit = "VERTICAL"
    scene.render.engine = "CYCLES"; scene.cycles.samples = 32; scene.cycles.use_denoising = True
    scene.view_settings.view_transform = "AgX"
    views = [
        ("render-juego.png", (0, 0.75 + 4.0, -9.0), (0, 2.6, 3.0), 60, 1600, 900),
        ("render-perfil.png", (11, 3.0, 0.6), (0, 2.5, 0.6), 40, 1600, 900),
        ("render-frente.png", (5.5, 4.2, 8.0), (0, 2.9, 0.8), 40, 1200, 900),
    ]
    for name, eye, target, fov, w, h in views:
        cam_data.angle = math.radians(fov)
        cam.location = B(eye)
        cam.rotation_euler = (B(target) - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.resolution_x, scene.render.resolution_y = w, h
        scene.render.filepath = str(ROOT / name)
        bpy.ops.render.render(write_still=True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "unicornio.blend"))
