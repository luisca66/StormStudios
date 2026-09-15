"""Canastilla del Aerostato en primera persona (Claude, 2026-09-14).

Cuatro módulos que el juego ancla a los bordes de la pantalla (como la cabina de Batisfera):
  rim     abajo    borde de cuero acolchado, pared de mimbre, altímetro, sacos y argollas
  postL/R lados    postes forrados de cuero con cable de acero y amarres de cuerda
  burner  arriba   barra del marco, quemador doble con serpentines, mangueras y faldón del globo
Cada módulo se autora con su origen en el punto de anclaje (ejes Three, metros) a la
profundidad `depth` del meta. El centro de la pantalla queda libre para las linternas.
Ejecutar con bpy-run.ps1; todo se genera junto a este archivo.
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
kit.setup(bpy.context.collection, 23)

H = math.tan(math.radians(30))        # media altura visible por unidad de profundidad
REF_ASPECT = 16 / 9
MODULES = {
    'rim': dict(parts=['rim', 'rimBrass', 'dial'], anchor=[0, -1], depth=1.0),
    'postL': dict(parts=['postL'], anchor=[-1, 0], depth=1.0, keepHeight=True),
    'postR': dict(parts=['postR'], anchor=[1, 0], depth=1.0, keepHeight=True),
    'burner': dict(parts=['frame', 'coil', 'hose', 'skirt'], anchor=[0, 1], depth=1.1),
}
BURNER_DY = -0.035
FLAME_ORIGINS = [[-0.1, -0.012 + BURNER_DY, 0.0], [0.1, -0.012 + BURNER_DY, 0.0]]


def material(name, metal=0.0, rough=0.7, emission='000000', strength=0.0):
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


WICKER = material('Mimbre y cuero', 0, 0.82)
BRASS = material('Latón pulido', 0.8, 0.34)
DIAL = material('Carátula esmaltada', 0, 0.45)
LEATHER = material('Cuero de postes', 0, 0.68)
STEEL = material('Marco de acero', 0.75, 0.32)
COPPER = material('Serpentín de cobre', 0.7, 0.38, 'ff7a1a', 0.0)
RUBBER = material('Mangueras y empuñaduras', 0, 0.55)
FABRIC = material('Tela del globo', 0, 0.9)


def shade(hex_color, k):
    return tuple(min(1.0, max(0.0, c * k)) for c in kit.lin(hex_color))


class Geo:
    """Malla con color de vértice por punto; las caras se autoran mirando hacia fuera o a la cámara (+Z)."""

    def __init__(self):
        self.v, self.f, self.c = [], [], []

    def add(self, verts, faces, color):
        off = len(self.v)
        for p in verts:
            self.v.append(tuple(p))
            col = color(p) if callable(color) else color
            self.c.append(kit.lin(col) if isinstance(col, str) else col)
        self.f.extend(tuple(off + i for i in face) for face in faces)

    def tube(self, points, radius, color, sides=12, per=6, cap=False):
        """Tubo por una curva Catmull-Rom con marcos de transporte; radius puede ser función de t."""
        path = kit.catmull(points, per)
        n = len(path)
        verts, faces = [], []
        tangent = (path[1] - path[0]).normalized()
        normal = Vector((0, 0, 1)) if abs(tangent.z) < 0.9 else Vector((1, 0, 0))
        normal = (normal - tangent * normal.dot(tangent)).normalized()
        frames = []
        for i, p in enumerate(path):
            if i > 0:
                t_new = (path[min(i + 1, n - 1)] - path[i - 1]).normalized()
                normal = (normal - t_new * normal.dot(t_new)).normalized()
                tangent = t_new
            binormal = tangent.cross(normal)
            t = i / (n - 1)
            r = radius(t) if callable(radius) else radius
            for k in range(sides):
                a = k / sides * math.tau
                verts.append(tuple(p + (normal * math.cos(a) + binormal * math.sin(a)) * r))
                frames.append((t, a))
        for i in range(n - 1):
            for k in range(sides):
                m = (k + 1) % sides
                faces.append((i * sides + k, i * sides + m, (i + 1) * sides + m, (i + 1) * sides + k))
        if cap:
            faces.append(tuple(reversed(range(sides))))
            faces.append(tuple((n - 1) * sides + k for k in range(sides)))
        off = len(self.v)
        for p, (t, a) in zip(verts, frames):
            self.v.append(p)
            col = color(p, t, a) if callable(color) else color
            self.c.append(kit.lin(col) if isinstance(col, str) else col)
        self.f.extend(tuple(off + i for i in face) for face in faces)

    def lathe(self, profile, M, color, seg=32):
        """Revolución alrededor del +Z local (carátulas y cajas que miran a la cámara)."""
        verts, faces = [], []
        n = len(profile)
        for i in range(seg):
            a = i / seg * math.tau
            for r, z in profile:
                verts.append(tuple(M @ Vector((math.cos(a) * r, math.sin(a) * r, z))))
        for i in range(seg):
            j = (i + 1) % seg
            for k in range(n - 1):
                faces.append((i * n + k, j * n + k, j * n + k + 1, i * n + k + 1))
        self.add(verts, faces, color)

    def blob(self, center, size, color, seg=16, rings=10, lump=0.0):
        verts, faces = [], []
        for i in range(rings + 1):
            th = i / rings * math.pi
            for j in range(seg):
                ph = j / seg * math.tau
                k = 1 + lump * math.sin(3 * ph + 2 * th) * math.sin(th)
                verts.append((center[0] + size[0] * math.sin(th) * math.cos(ph) * k,
                              center[1] + size[1] * math.cos(th) * k,
                              center[2] + size[2] * math.sin(th) * math.sin(ph) * k))
        for i in range(rings):
            for j in range(seg):
                m = (j + 1) % seg
                faces.append((i * seg + j, (i + 1) * seg + j, (i + 1) * seg + m, i * seg + m))
        self.add(verts, faces, color)

    def finish(self, name, part, mat, recalc=True, mirror=False, dy=0.0):
        verts, faces = [(x, y + dy, z) for x, y, z in self.v], self.f
        if mirror:
            verts = [(-x, y, z) for x, y, z in verts]
            faces = [tuple(reversed(f)) for f in faces]
        ob = kit.make(name, verts, faces, mat, part=part, tint=0, recalc=recalc, smooth_angle=1.3)
        attr = ob.data.color_attributes.new(name='Pigment', type='FLOAT_COLOR', domain='POINT')
        for i, c in enumerate(self.c):
            attr.data[i].color = (*c, 1)
        ob.data.color_attributes.active_color = attr
        return ob


objects = {}

# ---------------------------------------------------------------------------
# RIM — borde inferior (ancla 0,-1; profundidad 1.0). y = 0 es el borde de la pantalla.
# ---------------------------------------------------------------------------
X_SPAN = 1.8
g = Geo()
cols, rows = 288, 9
wall = []
for j in range(rows + 1):
    y = -0.10 + 0.175 * j / rows
    for i in range(cols + 1):
        x = -X_SPAN + 2 * X_SPAN * i / cols
        u, v = x / 0.05, (y + 0.1) / 0.0194
        over = (math.floor(u) + math.floor(v)) % 2
        bump = 0.0045 * abs(math.sin(math.pi * (u + 0.5 * over)))
        wall.append((x, y, -0.035 + bump))
faces = []
for j in range(rows):
    for i in range(cols):
        a = j * (cols + 1) + i
        faces.append((a, a + 1, a + cols + 2, a + cols + 1))


def wicker(p):
    x, y, _ = p
    u, v = x / 0.05, (y + 0.1) / 0.0194
    over = (math.floor(u) + math.floor(v)) % 2
    k = 0.62 + 0.38 * abs(math.sin(math.pi * (u + 0.5 * over)))
    k *= 0.9 + 0.1 * math.sin(v * 2.1 + u * 0.3)
    return shade('b08850', k * (1.0 - 0.35 * max(0.0, (0.05 - y) / 0.15)))


g.add(wall, faces, wicker)
# Rollo de cuero acolchado sobre el mimbre, con costura.


def leather_rim(p, t, a):
    stitch = abs(math.cos(a) + 0.2) < 0.18 and (t * 150) % 1 < 0.45
    k = 0.75 + 0.25 * math.sin(a + 0.8)
    return shade('d9c39a', 1.0) if stitch else shade('6e4527', k)


g.tube([(-X_SPAN, 0.105, -0.01), (0, 0.108, 0.0), (X_SPAN, 0.105, -0.01)], 0.042, leather_rim, sides=14, per=48)
# Correa bajo el altímetro y saco de arena con su cordel.
v, f = kit.g_box(0.13, 0.012, 0.09)
g.add([(x - 0.74, y + 0.152, z + 0.005) for x, y, z in v], f, shade('4a2d18', 1))
g.blob((0.8, 0.16, 0.01), (0.085, 0.052, 0.055), lambda p: shade('c9b58c', 0.85 + 0.15 * math.sin(p[0] * 90)), lump=0.08)
g.blob((0.8, 0.215, 0.005), (0.018, 0.02, 0.018), shade('b89a64', 1), seg=10, rings=6)
g.tube([(0.74, 0.19, 0.04), (0.8, 0.205, 0.058), (0.86, 0.19, 0.04)], 0.006, 'b89a64', sides=6, per=4)
# Rollo de cuerda junto al saco.
coil = [(0.55 + 0.045 * math.cos(s * 0.42), 0.155 + 0.0045 * s / 14, 0.012 + 0.03 * math.sin(s * 0.42)) for s in range(60)]
g.tube(coil, 0.008, lambda p, t, a: shade('c2a06a', 0.8 + 0.2 * math.sin(a * 2 + t * 80)), sides=6, per=2)
objects['rim'] = g.finish('Canasta • mimbre y cuero', 'rim', WICKER)

# Latón: caja del altímetro, bisel y argollas de amarre.
g = Geo()
alt_pos = Vector((-0.74, 0.215, 0.02))
M_alt = kit.facing(alt_pos, alt_pos + Vector((0, 0.42, 1)))
g.lathe([(0.0001, -0.022), (0.052, -0.022), (0.058, -0.012), (0.058, 0.008), (0.054, 0.014), (0.047, 0.012)], M_alt,
        lambda p: shade('c9a24a', 0.85 + 0.15 * math.sin(p[0] * 60)), seg=36)
g.lathe([(0.045, 0.012), (0.05, 0.02), (0.056, 0.016), (0.056, 0.012)], M_alt, shade('e3c46e', 1), seg=36)
for sx in (-0.45, 0.4):
    v, f = kit.g_torus(0.022, 0.0055, seg=18, tube=6)
    Mr = Matrix.Translation(Vector((sx, 0.165, 0.03))) @ Matrix.Rotation(0.25, 4, 'X')
    g.add([tuple(Mr @ Vector(p)) for p in v], [tuple(reversed(face)) for face in f], shade('c9a24a', 1))
objects['rimBrass'] = g.finish('Canasta • latón', 'rimBrass', BRASS)

# Carátula del altímetro: esmalte crema, marcas y aguja.
g = Geo()
ring_r = [0.0001, 0.012, 0.03, 0.038, 0.047]
seg = 60
verts, faces = [], []
for r in ring_r:
    for s in range(seg):
        a = s / seg * math.tau
        verts.append(tuple(M_alt @ Vector((math.cos(a) * r, math.sin(a) * r, 0.013))))
for i in range(len(ring_r) - 1):
    for s in range(seg):
        m = (s + 1) % seg
        faces.append((i * seg + s, (i + 1) * seg + s, (i + 1) * seg + m, i * seg + m))


def dial_color(p):
    local = M_alt.inverted() @ Vector(p)
    r = local.xy.length
    a = math.atan2(local.y, local.x)
    tick = r > 0.036 and (a / math.tau * 30) % 1 < 0.25
    return shade('2a241c', 1) if tick else shade('efe6cf', 0.95)


g.add(verts, faces, dial_color)
v, f = kit.g_box(0.004, 0.036, 0.003)
Mn = M_alt @ Matrix.Translation(Vector((0, 0, 0.016))) @ Matrix.Rotation(-0.7, 4, 'Z') @ Matrix.Translation(Vector((0, 0.014, 0)))
g.add([tuple(Mn @ Vector(p)) for p in v], f, shade('8c2a1c', 1))
objects['dial'] = g.finish('Canasta • carátula del altímetro', 'dial', DIAL)

# ---------------------------------------------------------------------------
# POSTES — ancla (±1, 0); se autora el derecho (hacia dentro es −X) y se refleja.
# ---------------------------------------------------------------------------


def build_post():
    g = Geo()
    # Largo de sobra: en pantallas estrechas el juego adelgaza el poste pero no lo acorta.
    pts = [(-0.05, -0.98, 0.0), (-0.065, -0.3, -0.02), (-0.085, 0.3, -0.05), (-0.11, 0.98, -0.1)]

    def sleeve(p, t, a):
        seam = (t * 26) % 1 < 0.06
        k = 0.7 + 0.3 * max(0.0, math.cos(a - 2.2))
        return shade('3e2616', 1) if seam else shade('5b3a22', k * (0.9 + 0.1 * math.sin(t * 17)))

    g.tube(pts, 0.022, sleeve, sides=12, per=12)
    base = kit.catmull(pts, 12)
    for t0 in (0.3, 0.64):
        idx = int(t0 * (len(base) - 1))
        c0, c1 = base[idx], base[min(idx + 1, len(base) - 1)]
        d = (c1 - c0).normalized()
        g.tube([tuple(c0 - d * 0.028), tuple(c0), tuple(c0 + d * 0.028)], 0.028,
               lambda p, t, a: shade('c2a06a', 0.75 + 0.25 * abs(math.sin(a * 3 + t * 9))), sides=12, per=4)
    g.tube([(-0.03, -0.98, -0.02), (-0.08, -0.1, -0.12), (-0.2, 0.98, -0.32)], 0.004,
           lambda p, t, a: shade('a4acb0', 0.7 + 0.3 * math.cos(a - 1.4)), sides=6, per=10)
    return g


objects['postR'] = build_post().finish('Canasta • poste derecho', 'postR', LEATHER)
objects['postL'] = build_post().finish('Canasta • poste izquierdo', 'postL', LEATHER, mirror=True)

# ---------------------------------------------------------------------------
# QUEMADOR — ancla (0, 1); profundidad 1.1. y = 0 es el borde superior de la pantalla.
# ---------------------------------------------------------------------------
g = Geo()
steel = lambda p, t, a: shade('b9bec2', 0.7 + 0.3 * math.cos(a - 1.2))
g.tube([(-1.9, -0.034, 0.0), (0, -0.034, 0.01), (1.9, -0.034, 0.0)], 0.018, steel, sides=12, per=24)
for sx in (-0.3, 0.3):
    g.tube([(sx, -0.034, 0.0), (sx, 0.1, -0.02), (sx * 1.05, 0.3, -0.05)], 0.014, steel, sides=10, per=4)
for sx in (-0.1, 0.1):
    # Cuerpo del quemador (lata) y boquilla superior.
    M = Matrix.Translation(Vector((sx, -0.075, 0.0))) @ Matrix.Rotation(-math.pi / 2, 4, 'X')
    g.lathe([(0.0001, -0.03), (0.036, -0.03), (0.04, -0.024), (0.04, 0.03), (0.03, 0.045), (0.018, 0.062), (0.0001, 0.062)],
            M, lambda p: shade('6d7377', 0.8 + 0.2 * math.sin(p[1] * 200)), seg=20)
# Bloque de válvulas con manómetro.
v, f = kit.g_box(0.3, 0.03, 0.06)
g.add([(x, y - 0.125, z + 0.01) for x, y, z in v], f, shade('c9a24a', 0.9))
gauge = Vector((0.0, -0.128, 0.05))
M_g = kit.facing(gauge, gauge + Vector((0, -0.25, 1)))
g.lathe([(0.0001, -0.008), (0.021, -0.008), (0.024, 0.0), (0.021, 0.006), (0.0001, 0.006)], M_g, shade('d9b85c', 1), seg=24)
objects['frame'] = g.finish('Quemador • marco y latas', 'frame', STEEL, dy=BURNER_DY)

g = Geo()
for sx in (-0.1, 0.1):
    helix = [(sx + 0.052 * math.cos(s * 0.35), -0.03 - 0.078 * s / 90, 0.052 * math.sin(s * 0.35)) for s in range(91)]
    g.tube(helix, 0.0075, lambda p, t, a: shade('b8733a', 0.75 + 0.25 * math.cos(a)), sides=8, per=1)
objects['coil'] = g.finish('Quemador • serpentines', 'coil', COPPER, dy=BURNER_DY)

g = Geo()
for s in (-1, 1):
    g.tube([(s * 0.14, -0.13, 0.03), (s * 0.19, -0.16, 0.09), (s * 0.23, -0.185, 0.14)], 0.011,
           lambda p, t, a: shade('1f1d1b', 0.8 + 0.2 * math.cos(a)), sides=10, per=5, cap=True)
    g.tube([(s * 0.15, -0.125, -0.01), (s * 0.4, -0.16, -0.02), (s * 0.75, -0.13, -0.08), (s * 1.05, -0.02, -0.14), (s * 1.3, 0.12, -0.2)], 0.012,
           lambda p, t, a: shade('2a2826', 0.75 + 0.25 * math.cos(a - 1)), sides=10, per=8)
objects['hose'] = g.finish('Quemador • mangueras y empuñaduras', 'hose', RUBBER, dy=BURNER_DY)

# Faldón del globo: tela a gajos que asoma en la parte alta y baja en las esquinas.
g = Geo()
cols, rows = 96, 7
verts = []
for j in range(rows + 1):
    s = j / rows
    for i in range(cols + 1):
        x = -2.0 + 4.0 * i / cols
        edge = 0.035 - 0.2 * max(0.0, (abs(x) - 0.5) / 1.1) ** 1.6
        y = edge + (0.42 - edge) * s
        z = -0.32 + 0.22 * (abs(x) / 2.0) ** 2 + 0.03 * math.sin(x * 12) * (1 - s)
        verts.append((x, y, z))
faces = []
for j in range(rows):
    for i in range(cols):
        a = j * (cols + 1) + i
        faces.append((a, a + 1, a + cols + 2, a + cols + 1))


def fabric(p):
    x, y, z = p
    gore = math.floor((x + 2.0) / 0.3)
    seam = abs(((x + 2.0) / 0.3) % 1 - 0.5) > 0.46
    edge = 0.035 - 0.2 * max(0.0, (abs(x) - 0.5) / 1.1) ** 1.6
    hem = y - edge < 0.035
    if hem:
        return shade('2d3b5a', 1)
    if seam:
        return shade('6b5a48', 1)
    return shade('b5402e' if gore % 2 else 'efe2c4', 0.82 + 0.18 * math.sin(x * 7 + y * 5))


g.add(verts, faces, fabric)
objects['skirt'] = g.finish('Globo • faldón', 'skirt', FABRIC)

# ---------------------------------------------------------------------------
# Exportación
# ---------------------------------------------------------------------------
meta = dict(
    layout=dict(H=H, refHalfWidth=H * REF_ASPECT, minScale=0.55),
    modules=MODULES,
    flameOrigins=FLAME_ORIGINS,
)
parts, tris = kit.export_parts(ROOT / 'canasta.json', objects=list(objects.values()), meta=meta)
assert tris <= 26000, tris
print('EXPORT', parts, 'partes', tris, 'triangulos', flush=True)
bpy.ops.object.select_all(action='DESELECT')
for o in objects.values():
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / 'canasta.glb'), use_selection=True, export_format='GLB', export_yup=True)

# ---------------------------------------------------------------------------
# Renders POV: cada módulo en su ancla para una pantalla dada, cámara en el ojo.
# ---------------------------------------------------------------------------
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.view_settings.view_transform = 'Standard'
world = bpy.data.worlds.new('Cielo')
scene.world = world
world.use_nodes = True
nt = world.node_tree
nt.nodes.clear()
tex = nt.nodes.new('ShaderNodeTexCoord')
sep = nt.nodes.new('ShaderNodeSeparateXYZ')
nt.links.new(tex.outputs['Normal'], sep.inputs[0])
ramp = nt.nodes.new('ShaderNodeValToRGB')
nt.links.new(sep.outputs['Z'], ramp.inputs[0])
ramp.color_ramp.elements[0].position = 0.0
ramp.color_ramp.elements[0].color = (*kit.lin('cfe6f8'), 1)
ramp.color_ramp.elements[1].position = 0.6
ramp.color_ramp.elements[1].color = (*kit.lin('5f9fe0'), 1)
bg = nt.nodes.new('ShaderNodeBackground')
nt.links.new(ramp.outputs[0], bg.inputs['Color'])
bg.inputs['Strength'].default_value = 0.9
out = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(bg.outputs[0], out.inputs[0])
sun_data = bpy.data.lights.new('Sol', 'SUN')
sun_data.energy = 3.0
sun_data.color = (1, 0.95, 0.86)
sun = bpy.data.objects.new('Sol', sun_data)
scene.collection.objects.link(sun)
sun.rotation_euler = kit.B((0.35, 1, 0.55)).to_track_quat('Z', 'Y').to_euler()
cam_data = bpy.data.cameras.new('Ojo')
cam_data.sensor_fit = 'VERTICAL'
cam_data.sensor_height = 32
cam_data.lens = 32 / (2 * H)
cam_data.clip_start = 0.05
cam = bpy.data.objects.new('Ojo', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
cam.location = (0, 0, 0)
cam.rotation_euler = kit.B((0, 0, -1)).to_track_quat('-Z', 'Y').to_euler()


def place(aspect):
    half_w = H * aspect
    k = min(1.0, max(0.55, half_w / (H * REF_ASPECT)))
    for name, spec in MODULES.items():
        ax, ay = spec['anchor']
        d = spec['depth']
        for part in spec['parts']:
            ob = objects[part]
            ob.location = kit.B((ax * half_w * d, ay * H * d, -d))
            ob.scale = (k, k, 1) if spec.get('keepHeight') else (k, k, k)  # Blender Z = Three Y
            if spec.get('keepHeight'):  # igual que basket.ts: postes arrimados al borde en pantallas estrechas
                ob.location.x += ax * (1 - k) * 0.05 * d


for label, (w, h) in [('panoramica', (1600, 900)), ('telefono', (540, 960))]:
    scene.render.resolution_x, scene.render.resolution_y = w, h
    place(w / h)
    scene.render.filepath = str(ROOT / f'render-pov-{label}.png')
    bpy.ops.render.render(write_still=True)

place(REF_ASPECT)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'canasta.blend'))
print('LISTO', json.dumps(dict(parts=parts, tris=tris)), flush=True)
