"""Anillos y perihelio · El Cometa. Modelado por Claude.

Latón de instrumento antiguo (astrolabio, sextante) para la señalización de la órbita y la llegada a casa:
  nav_ring       anillo de navegación al final de cada segmento (R 7.5): graduaciones y esferas cardinales.
                 Los espadines de luz siguen en código (cambian de material y giran).
  pulsar_core    baliza que anuncia la pregunta: cristal tallado ámbar que late.
  pulsar_ring    su cardán de latón, gira en Z.
  peri_ring      anillos de la espiral del perihelio (R 8.5): doble aro con puentes y tachones.
  medallion      medallón del rosetón (R 0.9), cara hacia +Z, con estrella en relieve.
  observatory    la montaña con el observatorio del menú, pivote en la base, Y arriba.
  observatory_dome  la cúpula de latón (se enciende en la gala).

Contrato: Three Y arriba; los aros en el plano XY mirando a +Z (como TorusGeometry); pivotes en el centro,
salvo el observatorio (base).
"""
import bpy, bmesh, math, random, sys
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

SEED = 11
rng = random.Random(SEED)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection, SEED)


def material(name, roughness, metallic=0.0, emission=0.0, emission_hex="000000"):
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


def mix(a, b, t):
    return tuple(Vector(kit.lin(a)).lerp(Vector(kit.lin(b)), max(0.0, min(1.0, t))))


def paint(ob, fn):
    """fn(co_three, normal_three) -> rgb lineal. Coordenadas Three locales (Y arriba)."""
    me = ob.data
    attr = me.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
    for v in me.vertices:
        c = Vector((v.co.x, v.co.z, -v.co.y))
        n = Vector((v.normal.x, v.normal.z, -v.normal.y))
        attr.data[v.index].color = (*fn(c, n), 1.0)
    me.color_attributes.active_color = attr


def sphere(r, seg=10, rings=6):
    prof = [(math.sin(i / rings * math.pi) * r + 1e-4, -math.cos(i / rings * math.pi) * r) for i in range(rings + 1)]
    return kit.g_lathe(prof, seg)


def rotZ(a):
    return Matrix.Rotation(a, 4, "Z")


def at(x, y, z=0.0):
    return Matrix.Translation(Vector((x, y, z)))


brass = material("Laton", roughness=0.34, metallic=0.88)
amber = material("Cristal ambar", roughness=0.2, emission=1.4, emission_hex="ffc65a")
rock = material("Roca", roughness=0.95)


def brass_color(c, n):
    # Latón con pátina: más claro en las caras que miran al frente y arriba, bronce en los huecos.
    t = 0.5 + 0.35 * n.z + 0.15 * n.y
    return mix("7a5418", "e8c368", t)


objects = []

# ------------------------------------------------------------------ ANILLO DE NAVEGACIÓN (R 7.5)
R = 7.5
parts = [
    (*kit.g_torus(R, 0.22, 72, 8), Matrix.Identity(4)),
    (*kit.g_torus(R - 1.1, 0.09, 56, 6), Matrix.Identity(4)),
]
# Graduaciones entre los dos aros, como un limbo de astrolabio: 48 marcas, mayores cada 4.
for i in range(48):
    a = i / 48 * math.tau
    major = i % 4 == 0
    length = 0.95 if major else 0.5
    w = 0.09 if major else 0.05
    v, f = kit.g_box(length, w, 0.1 if major else 0.07)
    r_mid = R - 0.16 - length / 2
    parts.append((v, f, rotZ(a) @ at(r_mid, 0)))
# Esferas en los puntos cardinales y perlas a 45°.
for i in range(8):
    a = i / 8 * math.tau
    big = i % 2 == 0
    v, f = sphere(0.42 if big else 0.22, 12 if big else 8, 7 if big else 5)
    parts.append((v, f, rotZ(a) @ at(R, 0)))
v, f = kit.combine(parts)
nav = kit.make("Anillo de navegacion", v, f, brass, part="nav_ring", smooth_angle=0.9)
paint(nav, brass_color)
objects.append(nav)

# ------------------------------------------------------------------ BALIZA
# Cristal tallado: bipirámide de ocho lados, un poco alargada.
core_v = [(0, 0.78, 0), (0, -0.78, 0)]
for i in range(8):
    a = i / 8 * math.tau
    core_v.append((math.cos(a) * 0.5, 0, math.sin(a) * 0.5))
core_f = []
for i in range(8):
    j = (i + 1) % 8
    core_f.append((0, 2 + j, 2 + i))
    core_f.append((1, 2 + i, 2 + j))
core = kit.make("Cristal de la baliza", core_v, core_f, amber, part="pulsar_core", smooth_angle=0.1)
paint(core, lambda c, n: mix("ffb43c", "fff0c0", 0.5 + 0.5 * n.y))
objects.append(core)

# Cardán: aro exterior que gira en Z, aro interior cruzado y pivotes.
parts = [
    (*kit.g_torus(1.1, 0.07, 40, 6), Matrix.Identity(4)),
    (*kit.g_torus(0.95, 0.045, 36, 6), Matrix.Rotation(math.pi / 2, 4, "Y")),
]
for x in (-1.0, 1.0):
    v, f = sphere(0.1, 8, 5)
    parts.append((v, f, at(x * 1.0, 0, 0)))
for y in (-1.1, 1.1):
    v, f = kit.g_cyl(0.06, 0.09, 0.22, 8)
    parts.append((v, f, at(0, y, 0)))
v, f = kit.combine(parts)
gimbal = kit.make("Cardan de la baliza", v, f, brass, part="pulsar_ring", smooth_angle=0.9)
paint(gimbal, brass_color)
objects.append(gimbal)

# ------------------------------------------------------------------ ANILLO DEL PERIHELIO (R 8.5)
R = 8.5
parts = [
    (*kit.g_torus(R, 0.3, 80, 10), Matrix.Identity(4)),
    (*kit.g_torus(R + 0.85, 0.09, 72, 6), Matrix.Identity(4)),
    (*kit.g_torus(R - 0.7, 0.07, 64, 6), Matrix.Identity(4)),
]
# Puentes en S entre el aro mayor y el exterior (24) y tachones en el aro mayor (12).
for i in range(24):
    a = (i + 0.5) / 24 * math.tau
    v, f = kit.g_box(0.62, 0.07, 0.07)
    parts.append((v, f, rotZ(a) @ at(R + 0.48, 0) @ Matrix.Rotation(0.5 if i % 2 else -0.5, 4, "Z")))
for i in range(12):
    a = i / 12 * math.tau
    v, f = kit.g_lathe([(0.0001, 0.2), (0.22, 0.12), (0.3, 0.0), (0.22, -0.12), (0.0001, -0.2)], 10)
    parts.append((v, f, rotZ(a) @ at(R, 0) @ Matrix.Rotation(math.pi / 2, 4, "X")))
    v, f = kit.g_box(0.5, 0.06, 0.06)
    parts.append((v, f, rotZ(a) @ at(R - 0.4, 0)))
v, f = kit.combine(parts)
peri = kit.make("Anillo del perihelio", v, f, brass, part="peri_ring", smooth_angle=0.9)
paint(peri, brass_color)
objects.append(peri)

# ------------------------------------------------------------------ MEDALLÓN DEL ROSETÓN (R 0.9)
# Disco con canto boleado y bisel, cara hacia +Z; estrella de doce puntas en relieve.
prof = [(0.0001, -0.08), (0.84, -0.08), (0.9, -0.03), (0.9, 0.03), (0.84, 0.08), (0.7, 0.08),
        (0.66, 0.05), (0.0001, 0.05)]
v, f = kit.g_lathe(prof, 32)
parts = [(v, f, Matrix.Rotation(math.pi / 2, 4, "X"))]
star = []
for i in range(24):
    a = i / 24 * math.tau + math.pi / 2
    r = 0.58 if i % 2 == 0 else 0.26
    star.append((math.cos(a) * r, math.sin(a) * r))
v, f = kit.g_prism(star, 0.06)
parts.append((v, f, at(0, 0, 0.07)))
v, f = sphere(0.12, 10, 5)
parts.append((v, f, at(0, 0, 0.1)))
v, f = kit.combine(parts)
medal = kit.make("Medallon", v, f, brass, part="medallion", smooth_angle=0.7)
paint(medal, lambda c, n: mix("8a6420", "f2d27a", 0.4 + 0.6 * max(0.0, n.z)) if c.z > 0.06
      else brass_color(c, n))
objects.append(medal)

# ------------------------------------------------------------------ OBSERVATORIO
# Montaña facetada de pizarra azul (el planeta es de noche) con nieve en la cima.
prof = [(2.6, 0.0), (2.4, 0.5), (1.9, 1.3), (1.4, 2.0), (1.15, 2.45), (1.05, 2.6), (0.0001, 2.62)]
v, f = kit.g_lathe(prof, 9)
v = [(x * (1 + rng.uniform(-0.12, 0.12)), y * (1 + rng.uniform(-0.05, 0.05)) if 0 < y < 2.6 else y, z * (1 + rng.uniform(-0.12, 0.12))) for x, y, z in v]
parts = [(v, f, Matrix.Identity(4))]
v, f = kit.combine(parts)
mount = kit.make("Montana", v, f, rock, part="observatory", smooth_angle=0.1)
paint(mount, lambda c, n: mix("1c2a3a", "3b5268", c.y / 2.6) if c.y < 2.2 else mix("6c8aa2", "c9dbe8", n.y))
objects.append(mount)

# Tambor del observatorio y telescopio (mismo `observatory`, otro material: latón).
parts = []
v, f = kit.g_cyl(0.92, 0.98, 0.62, 18)
parts.append((v, f, at(0, 2.62 + 0.31, 0)))
v, f = kit.g_cyl(1.02, 1.02, 0.08, 18)
parts.append((v, f, at(0, 2.62 + 0.64, 0)))
# Telescopio asomando por la ranura, apuntando al cielo hacia +Z (por donde llega el cometa).
tube = kit.g_cyl(0.13, 0.17, 1.5, 10)
parts.append((*tube, at(0, 3.55, 0.35) @ Matrix.Rotation(-0.55, 4, "X")))
v, f = kit.combine(parts)
drum = kit.make("Tambor del observatorio", v, f, brass, part="observatory", smooth_angle=0.8)
paint(drum, lambda c, n: mix("4a3410", "b98d3c", 0.5 + 0.5 * n.y))
objects.append(drum)

# Cúpula con la ranura abierta hacia +Z.
dome_v, dome_f = [], []
seg, rings_n, r = 20, 7, 1.0
for i in range(rings_n + 1):
    ph = i / rings_n * (math.pi / 2)
    for j in range(seg):
        a = j / seg * math.tau
        dome_v.append((math.sin(a) * math.cos(ph) * r, math.sin(ph) * r, math.cos(a) * math.cos(ph) * r))
for i in range(rings_n):
    for j in range(seg):
        if j in (0, seg - 1) and i >= 1:    # la ranura: dos gajos abiertos mirando a +Z
            continue
        k = (j + 1) % seg
        dome_f.append((i * seg + j, i * seg + k, (i + 1) * seg + k, (i + 1) * seg + j))
dome = kit.make("Cupula", dome_v, dome_f, brass, M=at(0, 3.3, 0), part="observatory_dome", smooth_angle=1.2)
paint(dome, lambda c, n: mix("9a7228", "f4d98a", 0.4 + 0.6 * n.y))
objects.append(dome)

for ob in objects:
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-5)
    bm.to_mesh(ob.data); bm.free(); ob.data.update()

# Los pivotes del observatorio van en la base; todo lo demás en su centro (ya están en el origen).

# ------------------------------------------------------------------ EXPORTAR (antes de mover nada)
meta = dict(note="Aros en el plano XY mirando a +Z; observatorio con pivote en la base e Y arriba",
            navRingRadius=7.5, periRingRadius=8.5, medallionRadius=0.9)
parts_n, tris, size = kit.export_glb(ROOT / "anillos-juego.glb", objects=objects, meta=meta,
                                     ao={"distance": 0.5, "strength": 0.5},
                                     json_path=ROOT / "anillos.json")
counts = {}
for ob in objects:
    me = ob.data; me.calc_loop_triangles()
    counts[ob["part"]] = counts.get(ob["part"], 0) + len(me.loop_triangles)
print("TRIANGULOS POR PARTE", counts, flush=True)
assert counts["nav_ring"] <= 4500 and counts["peri_ring"] <= 6000 and counts["medallion"] <= 800, counts

# ------------------------------------------------------------------ RENDER (vitrina)
layout = {
    "nav_ring": (-9.5, 0, 0), "peri_ring": (9.5, 0, 0),
    "pulsar_core": (-2.2, 5.5, 2), "pulsar_ring": (-2.2, 5.5, 2),
    "medallion": (2.2, 5.5, 2), "observatory": (0, -6, 0), "observatory_dome": (0, -6, 0),
}
for ob in objects:
    x, y, z = layout[ob["part"]]
    ob.location = kit.B((x, y, z))
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.view_settings.look = "AgX - Medium High Contrast"
world = bpy.data.worlds.new("Fondo"); world.use_nodes = True; scene.world = world
world.node_tree.nodes["Background"].inputs[0].default_value = (*kit.lin("0a1030"), 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 1.4
bpy.ops.object.light_add(type="SUN")
sun = bpy.context.object
sun.data.color = kit.lin("ffe9c4"); sun.data.energy = 4.5
sun.rotation_euler = (math.radians(40), math.radians(-30), math.radians(20))
bpy.ops.object.camera_add(); cam = bpy.context.object; scene.camera = cam
cam.data.lens = 35
cam.location = kit.B((0, 2, 30))
cam.rotation_euler = (kit.B((0, -0.5, 0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.render.filepath = str(ROOT / "render-anillos.png")
bpy.ops.render.render(write_still=True)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "anillos.blend"))
print("EXPORT", parts_n, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
