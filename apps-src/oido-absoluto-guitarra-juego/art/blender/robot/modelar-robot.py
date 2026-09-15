"""Autómata luthier de Resonancia, articulado para caminar (Claude, 2026-09-14).

Ejes Three, metros, frente hacia −Z (el jugador lo ve de espaldas, desde +Z). Pies en y = −0.45,
igual que el robot procedural anterior. Cada parte es un objeto con `part` (y `segment` 0 = lado +X, que es la
derecha del robot; 1 = lado −X) y su origen en la articulación:

  torso     cadera (0, 0.83, 0)       cuerpo, pelvis, cinturón con diapasón de afinar
  pack      igual que torso           mochila con forma de caja de guitarra, cuerdas y roseta
  core      boca de la guitarra       disco luminoso (el juego pulsa su emisión)
  head      cuello (0, 2.34, 0)       casco, visera, clavijas de afinación como orejas, antena
  eyes      igual que head            ojos luminosos
  halo      sobre la antena           tres anillos (segment 0..2) que giran por separado
  upperArm  hombro                    brazo superior
  forearm   codo                      antebrazo y mano
  thigh     cadera de la pierna       muslo
  shin      rodilla                   espinilla y bota
"""
import sys, math, json
from pathlib import Path
import bpy
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parent
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT.parents[3] / 'grados-mayores-juego' / 'art' / 'blender'))
import kit

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection, 31)


def material(name, metal=0.0, rough=0.5, emission='000000', strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (1, 1, 1, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    p.inputs['Emission Color'].default_value = (*kit.lin(emission), 1)
    p.inputs['Emission Strength'].default_value = strength
    c = m.node_tree.nodes.new('ShaderNodeVertexColor')
    c.layer_name = 'Pigment'
    m.node_tree.links.new(c.outputs['Color'], p.inputs['Base Color'])
    return m


METAL = material('Cobre y latón', 0.78, 0.36)
WOOD = material('Caja de guitarra', 0.0, 0.42)
GLOW = material('Resonancia cian', 0.1, 0.15, '39cfe8', 6.0)
EYE = material('Ojos', 0.05, 0.15, '59dff8', 5.0)
BRASS_RING = material('Anillo de latón', 0.82, 0.28)

COPPER, COPPER_DARK, BRASS, DARK = '9d5e35', '5d321f', 'c28a55', '1e2728'


def shade(hex_color, k=1.0):
    return tuple(min(1.0, max(0.0, c * k)) for c in kit.lin(hex_color))


class Geo:
    def __init__(self):
        self.v, self.f, self.c = [], [], []

    def add(self, verts, faces, color):
        off = len(self.v)
        for p in verts:
            self.v.append(tuple(p))
            col = color(p) if callable(color) else color
            self.c.append(kit.lin(col) if isinstance(col, str) else col)
        self.f.extend(tuple(off + i for i in face) for face in faces)

    def lathe(self, profile, color, center=(0, 0, 0), seg=28, M=None, sx=1.0, sz=1.0):
        """Revolución alrededor de Y. profile = [(r, y)] de abajo arriba; empieza y termina en r≈0."""
        M = M or Matrix.Identity(4)
        verts, faces = [], []
        n = len(profile)
        for i in range(seg):
            a = i / seg * math.tau
            for r, y in profile:
                p = Vector((center[0] + math.sin(a) * r * sx, center[1] + y, center[2] + math.cos(a) * r * sz))
                verts.append(tuple(M @ p))
        for i in range(seg):
            j = (i + 1) % seg
            for k in range(n - 1):
                faces.append((i * n + k, j * n + k, j * n + k + 1, i * n + k + 1))
        self.add(verts, faces, color)

    def tube(self, a, b, r0, r1, color, sides=14, rings=4, cap=True):
        a, b = Vector(a), Vector(b)
        axis = (b - a)
        length = axis.length
        rot = Vector((0, 1, 0)).rotation_difference(axis.normalized()).to_matrix().to_4x4()
        prof = [(0.0001, 0)] + [(r0 + (r1 - r0) * t / rings, length * t / rings) for t in range(rings + 1)] + [(0.0001, length)]
        self.lathe(prof, color, seg=sides, M=Matrix.Translation(a) @ rot)

    def ball(self, center, radius, color, seg=18, rings=10, scale=(1, 1, 1)):
        prof = [(math.sin(i / rings * math.pi) * radius + (0.0001 if i in (0, rings) else 0),
                 -math.cos(i / rings * math.pi) * radius) for i in range(rings + 1)]
        M = Matrix.Translation(Vector(center)) @ Matrix.Diagonal((*scale, 1))
        self.lathe(prof, color, seg=seg, M=M)

    def box(self, center, size, color, bevel=0.0):
        v, f = kit.g_box(*size)
        self.add([(x + center[0], y + center[1], z + center[2]) for x, y, z in v], f, color)

    def slab(self, outline, z0, z1, color):
        """Contorno 2D (x, y) cerrado extruido de z0 a z1, con tapa trasera y frontal."""
        n = len(outline)
        cx = sum(p[0] for p in outline) / n
        cy = sum(p[1] for p in outline) / n
        verts = [(x, y, z0) for x, y in outline] + [(x, y, z1) for x, y in outline] + [(cx, cy, z0), (cx, cy, z1)]
        faces = []
        for i in range(n):
            j = (i + 1) % n
            faces.append((i, j, n + j, n + i))
            faces.append((2 * n, j, i))
            faces.append((2 * n + 1, n + i, n + j))
        self.add(verts, faces, color)

    def finish(self, name, part, mat, pivot, segment=None):
        ob = kit.make(name, [tuple(Vector(v) - Vector(pivot)) for v in self.v], self.f, mat,
                      part=part, tint=0, smooth_angle=0.9)
        ob.location = kit.B(pivot)
        attr = ob.data.color_attributes.new(name='Pigment', type='FLOAT_COLOR', domain='POINT')
        for i, c in enumerate(self.c):
            attr.data[i].color = (*c, 1)
        ob.data.color_attributes.active_color = attr
        if segment is not None:
            ob['segment'] = segment
        return ob


def smooth(profile, per=4):
    """Suaviza un perfil (r, y) con Catmull-Rom conservando los extremos en el eje."""
    pts = kit.catmull([(r, y, 0) for r, y in profile], per)
    return [(max(0.0001, p.x), p.y) for p in pts]


objects = []
HIP = (0, 0.83, 0)
NECK = (0, 2.34, 0)

# ---------------------------------------------------------------------------
# TORSO: tonel de cobre con bandas de latón remachadas, pelvis oscura y cinturón.
# ---------------------------------------------------------------------------
g = Geo()


def torso_color(p):
    x, y, z = p
    band = abs(y - 1.36) < 0.035 or abs(y - 1.98) < 0.03
    seam = abs(math.atan2(x, z)) % (math.tau / 8) < 0.03
    if band:
        return shade(BRASS, 0.95 + 0.05 * math.sin(math.atan2(x, z) * 40))
    if y < 1.08:
        return shade(COPPER_DARK, 0.9)
    return shade(COPPER, 0.86 + 0.14 * max(0.0, -z) - (0.18 if seam else 0))


prof = [(0.0001, 1.02), (0.40, 1.03), (0.50, 1.1), (0.56, 1.3), (0.58, 1.55), (0.57, 1.8), (0.52, 2.02), (0.40, 2.18), (0.2, 2.25), (0.0001, 2.26)]
g.lathe(smooth(prof), torso_color, seg=40)
for ring_y, ring_r in ((1.36, 0.585), (1.98, 0.545)):
    for i in range(12):
        a = i / 12 * math.tau
        g.ball((math.sin(a) * ring_r, ring_y, math.cos(a) * ring_r), 0.022, shade(BRASS, 1.1), seg=8, rings=5)
# Pelvis y cinturón con hebilla y bolsas de herramientas.
g.lathe([(0.0001, 0.72), (0.34, 0.72), (0.4, 0.8), (0.42, 0.95), (0.4, 1.06), (0.0001, 1.07)], shade(DARK), seg=24)
g.lathe([(0.0001, 0.93), (0.455, 0.93), (0.465, 0.98), (0.455, 1.03), (0.0001, 1.03)], lambda p: shade('4a2d18', 0.9 + 0.1 * math.sin(p[0] * 30)), seg=28)
g.box((0, 0.98, -0.47), (0.12, 0.09, 0.03), shade(BRASS, 1.1))
for sx in (-0.33, 0.33):
    g.box((sx, 0.92, -0.3), (0.13, 0.15, 0.1), shade('5a3a22', 1))
# Diapasón de afinar colgado a la derecha (brazos de latón).
for dx in (-0.018, 0.018):
    g.tube((0.47 + dx, 0.7, 0.0), (0.47 + dx, 0.88, 0.0), 0.009, 0.009, shade(BRASS, 1.15), sides=8, rings=1)
g.tube((0.47, 0.62, 0.0), (0.47, 0.71, 0.0), 0.011, 0.011, shade(BRASS, 1.15), sides=8, rings=1)
# Placa del pecho con esfera oscura y marcas.
g.lathe([(0.0001, 0), (0.16, 0), (0.17, 0.02), (0.15, 0.045), (0.0001, 0.05)],
        lambda p: shade(DARK) if math.hypot(p[0], p[1] - 1.68) < 0.12 else shade(BRASS, 1.05), seg=28,
        M=Matrix.Translation(Vector((0, 1.68, -0.575))) @ Matrix.Rotation(-math.pi / 2, 4, 'X'))
# Cuello.
g.lathe([(0.0001, 2.2), (0.2, 2.2), (0.18, 2.3), (0.19, 2.37), (0.0001, 2.38)], shade(DARK), seg=18)
objects.append(g.finish('Robot • torso', 'torso', METAL, HIP))

# ---------------------------------------------------------------------------
# MOCHILA: caja de guitarra en la espalda (tapa de abeto, aros de palosanto, filete crema).
# ---------------------------------------------------------------------------
g = Geo()


def guitar_outline(scale=1.0, n=64):
    pts = []
    y0, y1 = 1.02, 2.2
    for i in range(n):
        t = i / (n - 1)
        y = y0 + (y1 - y0) * t
        w = 0.37 * math.exp(-((t - 0.24) / 0.2) ** 2) + 0.28 * math.exp(-((t - 0.74) / 0.18) ** 2) + 0.085
        w *= min(1.0, math.sin(math.pi * min(1.0, max(0.0, t))) ** 0.35 * 1.25)
        pts.append((w * scale, y))
    right = pts
    left = [(-x, y) for x, y in reversed(pts)]
    cy = 1.61
    return [(x, cy + (y - cy) * scale) for x, y in right + left]


BACK_Z0, BACK_Z1 = 0.5, 0.7
outer = guitar_outline(1.0)
g.slab(outer, BACK_Z0, BACK_Z1 - 0.012, lambda p: shade('5a2e18', 0.85 + 0.15 * math.sin(p[1] * 20)))


def top_color(p):
    x, y, z = p
    r = math.hypot(x, y - 1.44)
    if 0.16 < r < 0.2:
        return shade('e8d7b0', 0.9 + 0.1 * math.sin(math.atan2(x, y - 1.44) * 24))
    return shade('d9b06a', 0.88 + 0.12 * math.sin(x * 60))


g.slab(guitar_outline(0.955), BACK_Z1 - 0.013, BACK_Z1, top_color)
# Filete crema en el canto.
g.slab(guitar_outline(1.012), BACK_Z1 - 0.02, BACK_Z1 - 0.008, shade('efe2c4'))
# Puente, cuerdas y cejuela: el mástil corto asoma por arriba.
g.box((0, 1.2, BACK_Z1 + 0.012), (0.28, 0.04, 0.025), shade('2b1a10'))
for i in range(6):
    x = -0.085 + 0.034 * i
    g.box((x, 1.73, BACK_Z1 + 0.03), (0.006, 1.06, 0.006), shade('d8dde0', 1.1))
# Mástil corto y pala con clavijas asomando sobre el hombro.
g.box((0, 2.3, 0.66), (0.13, 0.26, 0.06), shade('3a2416'))
g.box((0, 2.5, 0.66), (0.19, 0.16, 0.05), shade('2b1a10'))
for sx in (-0.115, 0.115):
    for yy in (2.45, 2.5, 2.55):
        g.tube((sx * 0.8, yy, 0.66), (sx * 1.25, yy, 0.66), 0.012, 0.012, shade(BRASS, 1.2), sides=6, rings=1)
# Correas de cuero hacia los hombros.
for sx in (-0.3, 0.3):
    g.tube((sx, 1.3, 0.5), (sx * 0.85, 2.15, 0.42), 0.035, 0.035, shade('4a2d18'), sides=8, rings=2)
objects.append(g.finish('Robot • mochila de guitarra', 'pack', WOOD, HIP))

g = Geo()
g.lathe([(0.0001, 0), (0.155, 0), (0.155, 0.012), (0.0001, 0.018)], shade('92f4ff'), seg=32,
        M=Matrix.Translation(Vector((0, 1.44, BACK_Z1 - 0.004))) @ Matrix.Rotation(math.pi / 2, 4, 'X'))
objects.append(g.finish('Robot • boca luminosa', 'core', GLOW, (0, 1.44, BACK_Z1)))

# ---------------------------------------------------------------------------
# CABEZA: casco de cobre con cúpula de latón, visera, rejilla, clavijas y antena.
# ---------------------------------------------------------------------------
g = Geo()
HC = Vector((0, 2.7, 0))


def head_color(p):
    x, y, z = p
    if y > HC.y + 0.1:
        return shade(BRASS, 0.95 + 0.05 * math.sin(math.atan2(x, z) * 30))
    if y < HC.y - 0.2:
        return shade(COPPER_DARK, 0.95)
    return shade(COPPER, 0.9)


g.lathe(smooth([(0.0001, -0.44), (0.3, -0.42), (0.44, -0.28), (0.5, -0.05), (0.49, 0.12), (0.43, 0.3), (0.28, 0.44), (0.0001, 0.5)]),
        head_color, center=tuple(HC), seg=40, sz=0.95)
# Visera oscura frontal y rejilla de la boca.
# Visera: banda curva oscura que abraza el frente del casco, detrás de los ojos.
visor, vf = [], []
cols = 20
for i in range(cols + 1):
    a = -1.05 + 2.1 * i / cols
    for dy, rr in ((-0.12, 0.5), (0.15, 0.488)):
        visor.append((math.sin(a) * rr, HC.y + dy, -math.cos(a) * rr * 0.95 - 0.012))
for i in range(cols):
    k = 2 * i
    vf.append((k, k + 2, k + 3, k + 1))
g.add(visor, vf, shade(DARK, 1.2))
for i in range(4):
    g.box((-0.075 + i * 0.05, HC.y - 0.25, -0.445), (0.022, 0.08, 0.03), shade(DARK))
# Clavijas de afinación (orejas): eje de latón, tambor y paleta nacarada.
for s in (-1, 1):
    g.tube((s * 0.46, HC.y, 0), (s * 0.58, HC.y, 0), 0.075, 0.075, shade(BRASS, 1.1), sides=16, rings=1)
    g.tube((s * 0.58, HC.y, 0), (s * 0.66, HC.y, 0), 0.025, 0.025, shade(BRASS, 1.2), sides=10, rings=1)
    g.ball((s * 0.72, HC.y, 0), 0.07, shade('efe6d6', 1.0), seg=14, rings=8, scale=(0.45, 1.25, 0.9))
# Antena.
g.tube((0, HC.y + 0.46, 0), (0, HC.y + 0.74, 0), 0.025, 0.018, shade(BRASS, 1.1), sides=10, rings=1)
g.ball((0, HC.y + 0.78, 0), 0.07, shade(BRASS, 1.2), seg=14, rings=8)
objects.append(g.finish('Robot • cabeza', 'head', METAL, NECK))

g = Geo()
for s in (-1, 1):
    g.ball((s * 0.17, HC.y + 0.02, -0.475), 0.085, shade('bff8ff'), seg=16, rings=10, scale=(1, 0.8, 0.42))
objects.append(g.finish('Robot • ojos', 'eyes', EYE, NECK))

HALO = Vector((0, HC.y + 0.85, 0))
halo_specs = [(0.56, 0.013, (math.pi / 2.2, 0, 0.2), GLOW, '92f4ff'),
              (0.69, 0.011, (math.pi / 2.7, 0.55, -0.35), BRASS_RING, BRASS),
              (0.43, 0.01, (math.pi / 2, -0.45, 0.3), EYE, 'bff8ff')]
for seg_i, (R, r, rot, mat, col) in enumerate(halo_specs):
    g = Geo()
    v, f = kit.g_torus(R, r, seg=64, tube=8)
    M = Matrix.Translation(HALO) @ kit.T(rot=rot)
    g.add([tuple(M @ Vector(p)) for p in v], f, shade(col))
    objects.append(g.finish(f'Robot • halo {seg_i}', 'halo', mat, tuple(HALO), seg_i))

# ---------------------------------------------------------------------------
# BRAZOS (codo) y PIERNAS (rodilla). segment 0 = lado +X (derecha del robot, que mira a −Z).
# ---------------------------------------------------------------------------
for seg_i, s in enumerate((1, -1)):
    shoulder = Vector((s * 0.64, 2.06, 0))
    elbow = Vector((s * 0.74, 1.55, 0.02))
    wrist = Vector((s * 0.73, 1.13, -0.02))
    g = Geo()
    g.ball(tuple(shoulder), 0.17, shade(BRASS, 1.05))
    g.tube(tuple(shoulder + Vector((s * 0.02, -0.08, 0))), tuple(elbow + Vector((0, 0.07, 0))), 0.1, 0.085,
           lambda p: shade(COPPER_DARK, 0.95), sides=16, rings=3)
    g.lathe([(0.0001, 0), (0.108, 0), (0.108, 0.035), (0.0001, 0.035)], shade(BRASS, 1.1), seg=16,
            M=Matrix.Translation(shoulder + Vector((s * 0.05, -0.28, 0))))
    objects.append(g.finish('Robot • brazo', 'upperArm', METAL, tuple(shoulder), seg_i))

    g = Geo()
    g.ball(tuple(elbow), 0.115, shade(DARK, 1.2))
    g.tube(tuple(elbow + Vector((0, -0.05, 0))), tuple(wrist), 0.088, 0.075, shade(COPPER, 0.95), sides=16, rings=3)
    g.ball(tuple(wrist + Vector((0, -0.07, -0.02))), 0.1, shade(BRASS, 1.05), scale=(0.85, 1.05, 0.8))
    for fi in range(3):
        fx = (fi - 1) * 0.045
        g.tube(tuple(wrist + Vector((fx * s, -0.13, -0.05))), tuple(wrist + Vector((fx * s * 1.2, -0.23, -0.09))), 0.022, 0.018,
               shade(DARK, 1.3), sides=8, rings=1)
    g.tube(tuple(wrist + Vector((-s * 0.07, -0.08, -0.06))), tuple(wrist + Vector((-s * 0.1, -0.16, -0.11))), 0.022, 0.018,
           shade(DARK, 1.3), sides=8, rings=1)
    objects.append(g.finish('Robot • antebrazo y mano', 'forearm', METAL, tuple(elbow), seg_i))

    hip = Vector((s * 0.25, 0.745, 0))
    knee = Vector((s * 0.26, 0.2, 0.0))
    ankle = Vector((s * 0.255, -0.24, 0.0))
    g = Geo()
    g.ball(tuple(hip), 0.14, shade(BRASS, 1.05))
    g.tube(tuple(hip + Vector((0, -0.07, 0))), tuple(knee + Vector((0, 0.08, 0))), 0.105, 0.09, shade(COPPER_DARK, 0.95), sides=16, rings=3)
    objects.append(g.finish('Robot • muslo', 'thigh', METAL, tuple(hip), seg_i))

    g = Geo()
    g.ball(tuple(knee), 0.12, shade(DARK, 1.2))
    g.tube(tuple(knee + Vector((0, -0.06, 0))), tuple(ankle), 0.095, 0.08, shade(COPPER, 0.95), sides=16, rings=3)
    g.lathe([(0.0001, 0), (0.11, 0), (0.11, 0.04), (0.0001, 0.04)], shade(BRASS, 1.1), seg=16,
            M=Matrix.Translation(knee + Vector((0, -0.2, 0))))
    # Bota redondeada de latón con puntera y suela oscura.
    g.ball((ankle.x, -0.33, -0.07), 0.2, shade(BRASS, 1.0), seg=20, rings=10, scale=(0.78, 0.55, 1.2))
    g.box((ankle.x, -0.425, -0.08), (0.28, 0.05, 0.44), shade(DARK))
    objects.append(g.finish('Robot • espinilla y bota', 'shin', METAL, tuple(knee), seg_i))

# ---------------------------------------------------------------------------
# Exportación y renders
# ---------------------------------------------------------------------------
meta = dict(forward='-Z', height=[-0.45, 3.63],
            joints=dict(hip=list(HIP), neck=list(NECK)),
            parents=dict(torso=None, pack='torso', core='torso', head='torso', eyes='head', halo='head',
                         upperArm='torso', forearm='upperArm', thigh='torso', shin='thigh'))
parts, tris = kit.export_parts(ROOT / 'robot.json', objects=objects, meta=meta)
assert tris <= 30000, tris
print('EXPORT', parts, 'partes', tris, 'triangulos', flush=True)
bpy.ops.object.select_all(action='DESELECT')
for o in objects:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / 'robot.glb'), use_selection=True, export_format='GLB', export_yup=True)

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 40
scene.cycles.use_denoising = True
scene.view_settings.view_transform = 'Standard'
scene.render.resolution_x, scene.render.resolution_y = 1200, 900
world = bpy.data.worlds.new('Taller')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (*kit.lin('0b1416'), 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0


def light(name, kind, energy, color, pos, size=1.0):
    data = bpy.data.lights.new(name, kind)
    data.energy = energy
    data.color = kit.lin(color)
    if kind == 'AREA':
        data.size = size
    ob = bpy.data.objects.new(name, data)
    scene.collection.objects.link(ob)
    ob.location = kit.B(pos)
    ob.rotation_euler = (kit.B((0, 1.7, 0)) - ob.location).to_track_quat('-Z', 'Y').to_euler()
    return ob


light('Clave cálida', 'AREA', 900, 'ffd1a0', (4, 6, 5), 3)
light('Contra cian', 'AREA', 500, '5edfff', (-5, 4, -4), 3)
light('Relleno', 'AREA', 180, 'b45a24', (3, 1.5, -4), 2)
floor = kit.make('Suelo', [(-6, -0.45, -6), (6, -0.45, -6), (6, -0.45, 6), (-6, -0.45, 6)], [(0, 3, 2, 1)],
                 material('Suelo', 0.25, 0.7), part='review')
del floor['part']
cam_data = bpy.data.cameras.new('Cámara')
cam_data.lens = 45
cam = bpy.data.objects.new('Cámara', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam


def shoot(label, pos, target=(0, 1.55, 0)):
    cam.location = kit.B(pos)
    cam.rotation_euler = (kit.B(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(ROOT / f'render-{label}.png')
    bpy.ops.render.render(write_still=True)


shoot('espalda-juego', (0, 6.2, 9.5), (0, 1.2, -2))   # cámara del juego: detrás y arriba
shoot('frente', (3.2, 2.6, -6.4))
shoot('perfil', (7.5, 1.9, 0.6))
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'robot.blend'))
print('LISTO', json.dumps(dict(parts=parts, tris=tris)), flush=True)
