"""Kit de salientes de roca para la pared de Batisfera. Generador bpy, coordenadas de autoría Three.

Pieza 6 de PLAN-ENTORNO-BLENDER.md, hecha por Claude sin brief (utilería instanciada, como el kit
de arrecife del Océano). Tres piezas que el juego repite por toda la pared del pozo para que deje
de leerse como un cilindro liso: repisa, espolón y bloque.

Convenciones, iguales a las piezas hermanas (arcos, corales):
- 1 u = 1 m. Y arriba, −Z hacia el centro del pozo, +Z hacia la pared.
- Origen de cada pieza = el punto donde se pega a la cara de la roca (y = 0, z = 0).
- Pigmento por vértice en el atributo 'Pigment'; sin emisión (esto es roca muerta).
"""
import bpy, math, random, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / 'grados-mayores-juego' / 'art' / 'blender'))
import kit
from kit import B, lin

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
ART = bpy.data.collections.new('Salientes exportables'); scene.collection.children.link(ART)
STAGE = bpy.data.collections.new('Solo revisión'); scene.collection.children.link(STAGE)
kit.setup(ART, 17092026)
rng = random.Random(17092026)

MAT = bpy.data.materials.new('roca'); MAT.use_nodes = True
_bsdf = MAT.node_tree.nodes['Principled BSDF']
_bsdf.inputs['Base Color'].default_value = (1, 1, 1, 1)
_bsdf.inputs['Roughness'].default_value = .95
_vc = MAT.node_tree.nodes.new('ShaderNodeVertexColor'); _vc.layer_name = 'Pigment'
MAT.node_tree.links.new(_vc.outputs['Color'], _bsdf.inputs['Base Color'])


def mix(a, b, t):
    return tuple(x * (1 - t) + y * t for x, y in zip(a, b))


def pigment(p):
    """Estratos horizontales; las caras que miran al pozo, un punto más claras (como los arcos)."""
    x, y, z = p
    band = .5 + .5 * math.sin(y * 1.9 + .3 * math.sin(x * .8) + .05 * z)
    facing = min(1, max(0, -z / 7))
    c = mix(lin('#0d151d'), lin('#46586a'), .10 + .78 * band ** 1.25)
    return mix(c, lin('#5a6c7e'), .26 * facing)


def stack(rings, cap_top=True, cap_bottom=True):
    """Cose anillos consecutivos del mismo número de puntos y devuelve (verts, faces)."""
    n = len(rings[0])
    verts = [p for ring in rings for p in ring]
    faces = []
    for k in range(len(rings) - 1):
        for j in range(n):
            faces.append((k * n + j, k * n + (j + 1) % n, (k + 1) * n + (j + 1) % n, (k + 1) * n + j))
    if cap_bottom:
        faces.append(tuple(reversed(range(n))))
    if cap_top:
        faces.append(tuple((len(rings) - 1) * n + j for j in range(n)))
    return verts, faces


OBJS, META = [], {}


def emit(part, verts, faces):
    ob = kit.make(part, verts, faces, MAT, part=part, smooth_angle=.6, tint=0)
    ca = ob.data.color_attributes.new(name='Pigment', type='FLOAT_COLOR', domain='POINT')
    for i, v in enumerate(ob.data.vertices):
        ca.data[i].color = (*pigment((v.co.x, v.co.z, -v.co.y)), 1)
    # Blender invalida la referencia al añadir atributos: se reactiva por nombre antes de exportar.
    ob.data.color_attributes.active_color = ob.data.color_attributes['Pigment']
    ob.data.color_attributes.render_color_index = ob.data.color_attributes.find('Pigment')
    OBJS.append(ob)
    dims = [round(max(p[i] for p in verts) - min(p[i] for p in verts), 3) for i in range(3)]
    META[part] = dict(dimensions=dims, height=dims[1], reach=round(-min(p[2] for p in verts), 3))


N = 16  # puntos por anillo: suficiente para que la silueta no sea un polígono


def outline(y, wide, deep, back, k):
    """Anillo de planta: sale de la pared (+Z) hacia el pozo (−Z) con la orilla mordida."""
    ring = []
    for j in range(N):
        a = math.tau * j / N
        bite = 1 + .12 * math.sin(a * 3 + k) + .07 * math.cos(a * 6 - k * 1.7)
        x = wide * bite * math.cos(a)
        sa = math.sin(a)
        z = (-deep * sa if sa > 0 else -back * sa) * bite
        ring.append((x, y + .3 * math.sin(a * 4 + k * 1.3), z))
    return ring


# ---------- shelf: repisa que sale de la pared, con el borde roto hacia abajo ----------
emit('shelf', *stack([
    outline(0, 5.6, 4.6, 1.5, 0),
    outline(-1.1, 5.2, 4.2, 1.5, 1),
    outline(-2.5, 3.4, 2.6, 1.4, 2),
    outline(-3.6, 1.3, 1.0, 1.2, 3),
]))

# ---------- spur: espolón/aguja que sube pegado a la pared ----------
rings = []
H = 11.5
for k in range(9):
    t = k / 8
    y = H * t
    grow = (1 - t) ** .8
    ring = []
    for j in range(N):
        a = math.tau * j / N
        rx = 2.3 * grow * (1 + .16 * math.sin(a * 3 + k * .9))
        rz = 1.9 * grow * (1 + .2 * math.sin(a * 4 + k))
        # Se separa de la pared conforme sube y quiebra su eje: silueta de cuchillo de roca.
        lean = -2.6 * t ** 1.6 - .5 * math.sin(t * 5)
        step = .28 * math.sin(t * 22)  # escalones de estrato
        ring.append((rx * math.cos(a) + step, y, rz * math.sin(a) + lean + 1.2))
    rings.append(ring)
rings.append([(.2, H + 1.4, -1.7)] * N)
emit('spur', *stack(rings, cap_top=False))

# ---------- boulder: bloque encajado en la pared, medio desprendido ----------
rings = []
for k in range(8):
    t = k / 7
    ring = []
    for j in range(N):
        a = math.tau * j / N
        # Facetas grandes: cuarteado en planos, no una esfera.
        facet = 1 + .17 * math.sin(a * 4 + k * 1.7) + .09 * math.cos(a * 7 - k)
        r = 2.7 * math.sin(math.pi * (.20 + .72 * t)) * facet
        ring.append((r * math.cos(a), 4.6 * t, r * math.sin(a) * .8 + .8))
    rings.append(ring)
emit('boulder', *stack(rings))

parts, tris = kit.export_parts(
    ROOT / 'salientes-roca.json', objects=OBJS,
    meta=dict(pieces=META, wallRadius=96, forward='-Z'),
)
import json
payload = json.loads((ROOT / 'salientes-roca.json').read_text(encoding='utf-8'))
counts = {m['part']: len(m['index']) // 3 for m in payload['meshes']}
assert parts == 3 and tris <= 10000, (parts, tris)
assert all(m.get('vertexColor') for m in payload['meshes']), 'JSON sin pigmento'
print('EXPORT', parts, 'partes', tris, 'triángulos', counts, flush=True)

bpy.ops.object.select_all(action='DESELECT')
for ob in OBJS:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / 'salientes-roca.glb'), export_format='GLB',
                          use_selection=True, export_extras=True)

# ---------- escenografía de revisión (no se exporta) ----------
OFF = {'shelf': -14, 'spur': 0, 'boulder': 13}
for ob in OBJS:
    ob.location.x = OFF[ob['part']]
kit.setup(STAGE, 1)
wm = bpy.data.materials.new('Pared de revisión'); wm.use_nodes = True
wm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*lin('#16212b'), 1)
vv = [(x, y, 0) for y in [-20, 26] for x in [-26 + i * 52 / 48 for i in range(49)]]
wall = kit.make('Pared de revisión', vv, [(i, i + 1, i + 50, i + 49) for i in range(48)], wm)
del wall['part']

world = bpy.data.worlds.new('Agua abisal'); scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes['Background']
bg.inputs['Color'].default_value = (*lin('#0b2438'), 1); bg.inputs['Strength'].default_value = .5
ld = bpy.data.lights.new('Faro', 'AREA'); ld.energy = 9000; ld.shape = 'DISK'; ld.size = 14
ld.color = lin('#eaf6ff')
lamp = bpy.data.objects.new('Faro', ld); STAGE.objects.link(lamp)
lamp.location = B((6, 16, -26))
lamp.rotation_euler = (B((0, 4, 0)) - lamp.location).to_track_quat('-Z', 'Y').to_euler()

cd = bpy.data.cameras.new('Cámara revisión'); cam = bpy.data.objects.new('Cámara revisión', cd)
STAGE.objects.link(cam); scene.camera = cam
cd.sensor_fit = 'VERTICAL'; cd.clip_start = .1; cd.clip_end = 500; cd.angle = math.radians(60)
scene.render.engine = 'CYCLES'; scene.cycles.samples = 32; scene.cycles.use_denoising = True
scene.render.resolution_x = 1600; scene.render.resolution_y = 900
scene.view_settings.view_transform = 'AgX'


def camera(pos, target):
    cam.location = B(pos)
    cam.rotation_euler = (B(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()


def render(name):
    scene.render.filepath = str(ROOT / name)
    print('RENDER', name, flush=True)
    bpy.ops.render.render(write_still=True)


camera((0, 6, -34), (0, 5, 0)); render('render-piezas.png')
camera((-13, 4, -13), (-13, 1.5, 0)); render('render-repisa.png')
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'salientes-roca.blend'))
print('FINAL', counts, META, flush=True)
