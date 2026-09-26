"""Cocodrilo del jugador, nivel 4 «El Pantano» de Walking AP Multi. Modelado por Claude con bpy.

El mismo cocodrilo de cajas que a Luis le encanta, mejorado: cuerpo, cabeza, cola y patas con bordes
redondeados, fila de escamas en el lomo, manchas claras, panza crema, dientecitos, fosas nasales, cejas y
ojos amarillos saltones con pupila rasgada. Mismas medidas y pivotes que `buildCrocodile` (player.ts), en
el espacio del modelo de Godot: la cabeza mira a −Z y el juego gira el modelo π.
Partes: body; head (pivote 0, 0.6, −1.5); eye y pupil 0/1 (pivote en el centro del ojo; el juego las
aplasta al parpadear); tail 0–3 (pivotes encadenados); leg 0–3 (pivote en la cadera).
"""
import bpy, math, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection, 4)


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


SKIN = material("Piel", 0.7)
EYE = material("Ojo", 0.25, emission=1.2, emission_hex="ffd21a")
PUPIL = material("Pupila", 0.2)

SKIN_HEX, BACK_HEX, BELLY_HEX, SPOT_HEX = "2d5a27", "21401a", "b8c78c", "4f7f3a"


def paint(ob, fn):
    """fn(p) con p en espacio del modelo (Three, Y arriba) -> color lineal."""
    me = ob.data
    attr = me.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
    for v in me.vertices:
        b = ob.matrix_world @ v.co
        attr.data[v.index].color = (*fn(Vector((b.x, b.z, -b.y))), 1.0)
    me.color_attributes.active_color = attr


def spots(p):
    """Manchas claras irregulares (determinista, sin texturas)."""
    return math.sin(p.x * 7.1 + p.z * 3.3) * math.sin(p.z * 5.7 - p.x * 2.1) > 0.55


def skin_color(belly_y):
    def fn(p):
        if p.y < belly_y:
            return mix(BELLY_HEX, "d6dfae", (belly_y - p.y) / 0.15)
        c = mix(SKIN_HEX, "3a6e30", (p.y - belly_y) / 0.5)
        return lin(SPOT_HEX) if spots(p) and p.y > belly_y + 0.12 else c
    return fn


def rbox(name, size, center, fn, bev=0.1, mat=SKIN, taper=None, segs=3):
    """Caja biselada. taper=(factor_x, factor_y) encoge el extremo −Z (hocico/punta de cola)."""
    v, f = kit.g_box(*size)
    if taper:
        hz = size[2] / 2
        v = [(x * (1 - (1 - taper[0]) * (hz - z) / (2 * hz)), y * (1 - (1 - taper[1]) * (hz - z) / (2 * hz)), z) for x, y, z in v]
    ob = kit.make(name, v, f, mat, kit.T(pos=center), part="tmp", smooth_angle=1.2, tint=0)
    kit.bevel(ob, width=bev, segments=segs)
    paint(ob, fn)
    return ob


def ball(name, radius, center, color, mat=SKIN, scale=(1, 1, 1), seg=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=max(6, seg // 2), radius=radius,
                                         location=kit.B(Vector(center)))
    ob = bpy.context.object
    ob.scale = (scale[0], scale[2], scale[1])      # Blender (x, y=−z Three, z=y Three)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for f in ob.data.polygons:
        f.use_smooth = True
    ob.data.materials.append(mat)
    paint(ob, color if callable(color) else (lambda p, c=color: lin(c)))
    return ob


def cone(name, r, h, base, tip_dir, color, sides=5, mat=SKIN):
    """Cono (diente, garra, escama) desde `base` hacia tip_dir."""
    d = Vector(tip_dir).normalized()
    v, f = kit.g_cyl(0.0, r, h, sides)
    up = Vector((0, 1, 0))
    q = up.rotation_difference(d)
    M = kit.T(pos=tuple(Vector(base) + d * h / 2)) @ q.to_matrix().to_4x4()
    ob = kit.make(name, v, f, mat, M, part="tmp", smooth_angle=0.4, tint=0)
    paint(ob, lambda p, c=color: lin(c))
    return ob


def unite(objs, name, part, pivot=(0, 0, 0), segment=None):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        bpy.context.view_layer.objects.active = o
        for mod in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=mod.name)
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name, ob["part"] = name, part
    if segment is not None:
        ob["segment"] = segment
    bpy.context.scene.cursor.location = kit.B(Vector(pivot))
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    return ob


# ------------------------------------------------------------------ cuerpo (centro 0, 0.5, 0)
body = rbox("Cuerpo", (1.24, 0.64, 3.0), (0, 0.52, 0), skin_color(0.3), bev=0.22)
scutes = []
for i in range(7):
    z = -1.2 + i * 0.42
    h = 0.2 - abs(i - 2.5) * 0.02
    for x in (-0.24, 0.0, 0.24):
        hh = h if x == 0 else h * 0.7
        scutes.append(cone("Escama", 0.1 if x == 0 else 0.08, hh, (x, 0.8, z), (0, 1, 0.15), BACK_HEX, sides=4))
body_ob = unite([body] + scutes, "Cuerpo", "body", pivot=(0, 0.5, 0))

# ------------------------------------------------------------------ cabeza (pivote 0, 0.6, −1.5)
skull = rbox("Cráneo", (1.06, 0.44, 0.92), (0, 0.74, -1.56), skin_color(0.56), bev=0.16)
snout = rbox("Hocico", (0.94, 0.34, 1.72), (0, 0.62, -2.45), skin_color(0.5), bev=0.13, taper=(0.72, 0.85))
jaw = rbox("Mandíbula", (0.84, 0.17, 1.6), (0, 0.38, -2.36), lambda p: mix(BELLY_HEX, "d6dfae", 0.4), bev=0.07,
           taper=(0.75, 1.0))
brows = [ball("Ceja", 0.22, (sx, 0.9, -1.58), SKIN_HEX, scale=(1.0, 0.8, 1.1)) for sx in (-0.45, 0.45)]
nostrils = [ball("Nariz", 0.075, (sx, 0.8, -3.12), "173016", scale=(1.0, 0.6, 1.0), seg=10) for sx in (-0.13, 0.13)]
teeth = []
for side in (-1, 1):
    for k in range(6):
        z = -1.95 - k * 0.2
        x = side * (0.43 - k * 0.025)
        teeth.append(cone("Diente", 0.045, 0.13, (x, 0.47, z), (0, -1, 0), "fbf6e6", sides=4))
head_ob = unite([skull, snout, jaw] + brows + nostrils + teeth, "Cabeza", "head", pivot=(0, 0.6, -1.5))

# ------------------------------------------------------------------ ojos y pupilas (miran hacia +Z: hacia la cámara)
eyes, pupils = [], []
for seg, sx in enumerate((-0.45, 0.45)):
    c = (sx, 0.92, -1.65)
    e = ball("Ojo", 0.17, c, lambda p: mix("ffe64d", "fff6b0", (p.y - 0.8) / 0.25), mat=EYE)
    eyes.append(unite([e], "Ojo", "eye", pivot=c, segment=seg))
    pu = ball("Pupila", 0.07, (sx, 0.93, -1.505), "0b0703", mat=PUPIL, scale=(0.35, 1.25, 0.5), seg=12)
    pupils.append(unite([pu], "Pupila", "pupil", pivot=c, segment=seg))

# ------------------------------------------------------------------ cola: 4 segmentos encadenados desde z = 1.5
tails = []
z0 = 1.5
for i, (ln, w, h) in enumerate([(0.8, 0.8, 0.42), (0.7, 0.64, 0.36), (0.6, 0.48, 0.3), (0.5, 0.34, 0.24)]):
    center = (0, 0.5, z0 + ln / 2)
    seg_ob = rbox(f"Cola {i}", (w, h, ln + 0.12), center, skin_color(0.5 - h * 0.4), bev=min(0.12, h * 0.3),
                  taper=None if i < 3 else (1.0, 1.0))
    parts = [seg_ob]
    for k in range(2):
        parts.append(cone("Escama cola", 0.07 - i * 0.01, 0.16 - i * 0.025, (0, 0.5 + h / 2 - 0.02, z0 + (k + 0.5) * ln / 2),
                          (0, 1, 0.3), BACK_HEX, sides=4))
    if i == 3:
        parts.append(cone("Punta", 0.15, 0.45, (0, 0.5, z0 + ln), (0, 0, 1), SKIN_HEX, sides=8))
    tails.append(unite(parts, f"Cola {i}", "tail", pivot=(0, 0.5, z0), segment=i))
    z0 += ln

# ------------------------------------------------------------------ patas (pivote en la cadera)
legs = []
for seg, (lx, ly, lz) in enumerate([(0.7, 0.8, -1.0), (-0.7, 0.8, -1.0), (0.7, 0.8, 1.0), (-0.7, 0.8, 1.0)]):
    leg = rbox("Pata", (0.32, 0.82, 0.34), (lx, ly - 0.4, lz), skin_color(-1.0), bev=0.1)
    foot = rbox("Pie", (0.42, 0.14, 0.5), (lx, ly - 0.8, lz - 0.08), skin_color(-1.0), bev=0.06)
    claws = [cone("Garra", 0.05, 0.17, (lx + (c - 1) * 0.13, ly - 0.84, lz - 0.3), (0, -0.35, -1), "e8dfb8", sides=5)
             for c in range(3)]
    legs.append(unite([leg, foot] + claws, "Pata", "leg", pivot=(lx, ly, lz), segment=seg))

# ------------------------------------------------------------------ exportar
meshes = [body_ob, head_ob] + eyes + pupils + tails + legs
meta = dict(forward="-Z", note="espacio de Godot: el juego gira el modelo pi; tail 0-3 se encadenan (cada uno cuelga del anterior)")
parts, tris, size = kit.export_glb(ROOT / "cocodrilo-juego.glb", objects=meshes, meta=meta,
                                   ao={"distance": 0.35, "strength": 0.55}, json_path=ROOT / "cocodrilo.json")
assert parts == 14, parts
assert tris <= 30000, tris

bpy.ops.object.select_all(action="DESELECT")
for o in meshes:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "cocodrilo.glb"), export_format="GLB",
                          use_selection=True, export_extras=True, export_animations=False)

# ------------------------------------------------------------------ renders
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
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
ground = bpy.context.object
gm = bpy.data.materials.new("Barro"); gm.use_nodes = True
gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*kit.lin("4a4a2c"), 1)
ground.data.materials.append(gm)
bpy.ops.object.camera_add(); cam = bpy.context.object; scene.camera = cam
cam.data.sensor_fit = "VERTICAL"; cam.data.sensor_height = 24
cam.data.lens = 24 / (2 * math.tan(math.radians(30)))
scene.render.resolution_x, scene.render.resolution_y = 1400, 900


def shot(name, eye, target):
    cam.location = kit.B(Vector(eye))
    cam.rotation_euler = (kit.B(Vector(target)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = str(ROOT / name)
    bpy.ops.render.render(write_still=True)


shot("render-cerca.png", (-4.2, 2.6, -5.2), (0, 0.5, -0.8))      # 3/4 de frente
shot("render-juego.png", (0, 3.2, 7.5), (0, 0.6, -0.5))          # detrás, como la cámara del juego

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "cocodrilo.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
