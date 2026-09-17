"""Baliza de expedición de Batisfera. Generador bpy, coordenadas de autoría Three.

Pieza 7 de PLAN-ENTORNO-BLENDER.md, hecha por Claude sin brief (pieza chica y repetida).
Sustituye al prototipo: un cilindro con una esfera encima. Son 14 balizas fondeadas en el pozo,
una junto a cada termoclina y dos por zona, con el letrero de profundidad del juego.

Convenciones:
- 1 u = 1 m. Y arriba, −Z hacia el centro del pozo. Origen = base de la baliza (y = 0).
- Dos partes: `body` (estructura, sin brillo) y `lamp` (la lámpara, lo único emisivo).
- El juego conserva el halo y el letrero: la lámpara queda centrada en y = 1.55 y la antena
  llega hasta y ≈ 2.9, justo debajo del letrero de profundidad.
- Pigmento por vértice en 'Pigment'.
"""
import bpy, math, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / 'grados-mayores-juego' / 'art' / 'blender'))
import kit
from kit import B, lin

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
ART = bpy.data.collections.new('Baliza exportable'); scene.collection.children.link(ART)
STAGE = bpy.data.collections.new('Solo revisión'); scene.collection.children.link(STAGE)
kit.setup(ART, 17092026)

LAMP_Y = 1.55  # el juego ya pone el halo y el letrero a esta altura


def material(name, color, rough, metal, emission=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    bs = m.node_tree.nodes['Principled BSDF']
    bs.inputs['Base Color'].default_value = (1, 1, 1, 1)
    bs.inputs['Roughness'].default_value = rough
    bs.inputs['Metallic'].default_value = metal
    vc = m.node_tree.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Pigment'
    m.node_tree.links.new(vc.outputs['Color'], bs.inputs['Base Color'])
    if emission:
        bs.inputs['Emission Color'].default_value = (*lin(color), 1)
        bs.inputs['Emission Strength'].default_value = emission
    return m


MATS = {
    'body': material('baliza-cuerpo', '#1a222c', .74, .45),
    'lamp': material('baliza-lampara', '#cfe8ff', .35, 0, 2.2),
}

DATA = {'body': ([], [], []), 'lamp': ([], [], [])}


def add(part, verts, faces, color):
    vs, fs, cs = DATA[part]
    off = len(vs)
    vs.extend(verts)
    fs.extend(tuple(off + i for i in f) for f in faces)
    cs.extend([lin(color)] * len(verts))


def tube(part, y0, y1, r0, r1, color, sides=10, twist=0.0):
    ring = lambda y, r, t: [(r * math.cos(math.tau * j / sides + t), y, r * math.sin(math.tau * j / sides + t))
                            for j in range(sides)]
    verts = ring(y0, r0, 0) + ring(y1, r1, twist)
    faces = [(j, (j + 1) % sides, sides + (j + 1) % sides, sides + j) for j in range(sides)]
    faces.append(tuple(reversed(range(sides))))
    faces.append(tuple(sides + j for j in range(sides)))
    add(part, verts, faces, color)


# ---------- cuerpo: lastre, mástil, jaula de la lámpara y antena ----------
# Lastre: prisma bajo y ancho, la parte que «cuelga» y estabiliza.
tube('body', 0.0, 0.30, 0.52, 0.62, '#151b24', sides=8)
tube('body', 0.30, 0.52, 0.62, 0.34, '#1a222c', sides=8)
# Tres aletas de estabilización.
for k in range(3):
    a = math.tau * k / 3
    c, s = math.cos(a), math.sin(a)
    inner, outer, top, bot = 0.34, 1.02, 0.50, 0.06
    w = 0.055
    quad = [
        (c * inner - s * w, bot, s * inner + c * w), (c * outer - s * w, bot + .12, s * outer + c * w),
        (c * outer + s * w, bot + .12, s * outer - c * w), (c * inner + s * w, bot, s * inner - c * w),
        (c * inner - s * w, top, s * inner + c * w), (c * outer - s * w, top - .06, s * outer + c * w),
        (c * outer + s * w, top - .06, s * outer - c * w), (c * inner + s * w, top, s * inner - c * w),
    ]
    add('body', quad, [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], '#222c38')
# Mástil.
tube('body', 0.52, 1.18, 0.14, 0.11, '#2a3542', sides=8)
# Collar bajo la lámpara.
tube('body', 1.14, 1.22, 0.26, 0.20, '#39485a', sides=10)
# Jaula: cuatro montantes alrededor de la lámpara y aro superior.
for k in range(4):
    a = math.tau * k / 4 + math.pi / 4
    c, s = math.cos(a), math.sin(a)
    r, w = 0.30, 0.045
    quad = [
        (c * (r - w), 1.18, s * (r - w)), (c * (r + w), 1.18, s * (r + w)),
        (c * (r + w), LAMP_Y + 0.40, s * (r + w)), (c * (r - w), LAMP_Y + 0.40, s * (r - w)),
    ]
    thick = [(x - s * w, y, z + c * w) for x, y, z in quad] + [(x + s * w, y, z - c * w) for x, y, z in quad]
    add('body', thick, [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], '#2a3542')
tube('body', LAMP_Y + 0.40, LAMP_Y + 0.52, 0.30, 0.17, '#39485a', sides=10)
# Antena hasta debajo del letrero de profundidad.
tube('body', LAMP_Y + 0.52, 2.90, 0.055, 0.03, '#39485a', sides=6)
tube('body', 2.72, 2.80, 0.12, 0.12, '#4a5c70', sides=6)

# ---------- lámpara: ovoide en el centro de la jaula (única parte emisiva) ----------
SEG, RINGS = 12, 8
verts, faces = [], []
for k in range(RINGS + 1):
    t = k / RINGS
    y = LAMP_Y - 0.34 + 0.68 * t
    r = 0.30 * math.sin(math.pi * t) ** 0.85
    verts.extend((r * math.cos(math.tau * j / SEG), y, r * math.sin(math.tau * j / SEG)) for j in range(SEG))
for k in range(RINGS):
    for j in range(SEG):
        faces.append((k * SEG + j, k * SEG + (j + 1) % SEG, (k + 1) * SEG + (j + 1) % SEG, (k + 1) * SEG + j))
add('lamp', verts, faces, '#cfe8ff')

OBJS = []
for part, (vs, fs, cs) in DATA.items():
    ob = kit.make(part, vs, fs, MATS[part], part=part, smooth_angle=.7 if part == 'lamp' else .5, tint=0)
    ca = ob.data.color_attributes.new(name='Pigment', type='FLOAT_COLOR', domain='POINT')
    for i, c in enumerate(cs):
        ca.data[i].color = (*c, 1)
    # Blender invalida la referencia al añadir atributos: se reactiva por nombre antes de exportar.
    ob.data.color_attributes.active_color = ob.data.color_attributes['Pigment']
    ob.data.color_attributes.render_color_index = ob.data.color_attributes.find('Pigment')
    OBJS.append(ob)

parts, tris = kit.export_parts(
    ROOT / 'baliza.json', objects=OBJS,
    meta=dict(lampCenter=[0, LAMP_Y, 0], labelY=3.1, height=2.9, forward='-Z'),
)
import json
payload = json.loads((ROOT / 'baliza.json').read_text(encoding='utf-8'))
counts = {m['part']: len(m['index']) // 3 for m in payload['meshes']}
assert parts == 2 and tris <= 2000, (parts, tris)
assert all(m.get('vertexColor') for m in payload['meshes']), 'JSON sin pigmento'
print('EXPORT', parts, 'partes', tris, 'triángulos', counts, flush=True)

bpy.ops.object.select_all(action='DESELECT')
for ob in OBJS:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / 'baliza.glb'), export_format='GLB',
                          use_selection=True, export_extras=True)

# ---------- escenografía de revisión (no se exporta) ----------
kit.setup(STAGE, 1)
world = bpy.data.worlds.new('Agua'); scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes['Background']
bg.inputs['Color'].default_value = (*lin('#0b2438'), 1); bg.inputs['Strength'].default_value = .45
ld = bpy.data.lights.new('Faro', 'AREA'); ld.energy = 900; ld.shape = 'DISK'; ld.size = 4
ld.color = lin('#eaf6ff')
lamp = bpy.data.objects.new('Faro', ld); STAGE.objects.link(lamp)
lamp.location = B((2.2, 3.4, -3.2))
lamp.rotation_euler = (B((0, 1.4, 0)) - lamp.location).to_track_quat('-Z', 'Y').to_euler()

cd = bpy.data.cameras.new('Cámara revisión'); cam = bpy.data.objects.new('Cámara revisión', cd)
STAGE.objects.link(cam); scene.camera = cam
cd.sensor_fit = 'VERTICAL'; cd.clip_start = .05; cd.clip_end = 200; cd.angle = math.radians(60)
scene.render.engine = 'CYCLES'; scene.cycles.samples = 40; scene.cycles.use_denoising = True
scene.render.resolution_x = 1200; scene.render.resolution_y = 900
scene.view_settings.view_transform = 'AgX'


def camera(pos, target):
    cam.location = B(pos)
    cam.rotation_euler = (B(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()


def render(name):
    scene.render.filepath = str(ROOT / name)
    print('RENDER', name, flush=True)
    bpy.ops.render.render(write_still=True)


camera((1.6, 2.2, -4.4), (0, 1.5, 0)); render('render-baliza.png')
ld.energy = 0; render('render-oscuro.png')
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'baliza.blend'))
print('FINAL', counts, flush=True)
