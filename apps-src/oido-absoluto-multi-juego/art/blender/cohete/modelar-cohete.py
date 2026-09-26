"""Cohete del jugador, nivel 3 «El Cosmos» de Walking AP Multi. Modelado por Claude con bpy.

Cohete de juguete retro: cuerpo crema redondeado con franjas coral y turquesa, nariz coral, cúpula de
cristal turquesa con aro dorado, aleta dorsal y dos alas en flecha con puntas amarillas. Espacio del juego
(Three): Y arriba, la nariz mira a +Z (como la nave anterior). Largo ~3.9 m, envergadura ~4.2 m.
Partes: `body` (todo lo fijo), `wing` segment 0 (izquierda, x < 0) y 1 (derecha), con pivote en la raíz
del ala (el juego las inclina al girar), y `flame` con pivote en la boca de la tobera (el juego la estira en Z).
"""
import bpy, math, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection, 3)

AXIS_Z = kit.T(rot=(math.pi / 2, 0, 0))       # eje Y del torno -> +Z (nariz)
TAIL_Z = -1.75                                # boca de la tobera


def lin(h):
    return Vector(kit.lin(h))


def mix(a, b, t):
    return lin(a).lerp(lin(b), max(0.0, min(1.0, t)))


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


PAINT = material("Pintura", 0.4)
FLAME = material("Llama", 0.3, emission=2.5, emission_hex="ffb35c")


def paint(ob, fn):
    """fn(p) con p en espacio Three -> color lineal."""
    me = ob.data
    attr = me.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
    for v in me.vertices:
        b = ob.matrix_world @ v.co
        attr.data[v.index].color = (*fn(Vector((b.x, b.z, -b.y))), 1.0)
    me.color_attributes.active_color = attr


def piece(name, geo, M, fn, part="body", mat=PAINT, smooth=0.62, bev=None):
    ob = kit.make(name, geo[0], geo[1], mat, M, part=part, smooth_angle=smooth, tint=0)
    if bev:
        kit.bevel(ob, width=bev, segments=2)
    paint(ob, fn)
    return ob


def unite(objs, name, part, pivot=(0, 0, 0), segment=None):
    """Aplica modificadores, une y pone el origen (pivote) en `pivot` (espacio Three)."""
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


# ------------------------------------------------------------------ cuerpo
# Perfil (radio, y) de la cola a la nariz; y del torno = z del juego.
profile = [(0.0, -1.62), (0.36, -1.6), (0.5, -1.45), (0.52, -1.37), (0.53, -1.33), (0.62, -1.0),
           (0.63, -0.96), (0.635, -0.94), (0.66, -0.73), (0.665, -0.71), (0.67, -0.63), (0.672, -0.61),
           (0.68, -0.51), (0.682, -0.49), (0.7, -0.3), (0.71, 0.2), (0.66, 0.75), (0.55, 1.2), (0.5, 1.4),
           (0.48, 1.46), (0.4, 1.6), (0.22, 1.92), (0.08, 2.08), (0.0, 2.12)]


def body_color(p):
    if p.z > 1.45:
        return mix("ff7a6b", "ff9e7a", (p.z - 1.45) / 0.6)          # nariz coral
    if -0.95 < p.z < -0.72:
        return lin("ff7a6b")                                         # franja coral
    if -0.62 < p.z < -0.5:
        return lin("3fe0d0")                                         # franja turquesa
    if p.z < -1.56:
        return lin("2a2f4a")                                         # fondo oscuro de la tobera
    if p.z < -1.35:
        return lin("ffe66d")                                         # anillo amarillo en la cola
    return mix("f3e6d0", "fffaf0", (p.y + 0.7) / 1.4)               # crema, más claro arriba


body = piece("Cuerpo", kit.g_lathe(profile, 40), AXIS_Z, body_color)

# tobera oscura con borde dorado
nozzle = piece("Tobera", kit.g_lathe([(0.46, 0.0), (0.5, -0.12), (0.42, -0.3), (0.34, -0.36)], 32),
               kit.T(pos=(0, 0, -1.4)) @ AXIS_Z,
               lambda p: lin("ffe66d") if p.z > -1.47 else mix("2a2f4a", "4a5070", (p.z + 1.76) / 0.3))

# cúpula de cristal turquesa con aro dorado
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1, location=(0, 0, 0))
dome = bpy.context.object
dome.scale = (0.38, 0.62, 0.3)                                        # Blender: X ancho, Y largo (-Z Three), Z alto
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
dome.location = kit.B(Vector((0, 0.55, 0.55)))
bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
for f in dome.data.polygons:
    f.use_smooth = True
dome.data.materials.append(PAINT)
dome["part"] = "body"
paint(dome, lambda p: mix("1aa89c", "b6fff6", (p.y - 0.55) / 0.3))
rim = piece("Aro cúpula", kit.g_torus(1.0, 0.07, 40, 8),
            kit.T(pos=(0, 0.58, 0.55), rot=(math.pi / 2, 0, 0), scale=(0.4, 0.64, 1)), lambda p: lin("ffe66d"))

# aleta dorsal (plano YZ)
FIN = [(-1.5, 0.45), (-0.55, 0.55), (-1.0, 1.35), (-1.45, 1.4)]        # (z, y)
fv, ff = kit.g_prism(FIN, 0.1)
fin = piece("Aleta", (fv, ff), kit.T(rot=(0, -math.pi / 2, 0)),
            lambda p: lin("ffe66d") if p.y > 1.2 else mix("ff7a6b", "ff9e7a", (p.y - 0.5) / 0.7), smooth=0.3, bev=0.025)

# antena con bolita rosa
mast = piece("Antena", kit.g_cyl(0.02, 0.03, 0.45, 8), kit.T(pos=(0, 0.75, 1.15)), lambda p: lin("b8a4ff"))
bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.08, location=kit.B(Vector((0, 1.0, 1.15))))
tip = bpy.context.object
tip.data.materials.append(PAINT)
tip["part"] = "body"
paint(tip, lambda p: lin("ff8fd8"))

body_parts = [o for o in bpy.context.scene.objects if o.type == "MESH" and o.get("part") == "body"]
body_ob = unite([body] + [o for o in body_parts if o is not body], "Cuerpo", "body")

# ------------------------------------------------------------------ alas (pivote en la raíz)
WING = [(0.0, 0.25), (1.45, -0.55), (1.55, -1.0), (0.0, -1.05)]       # (x hacia afuera, z) en planta
WING_ROOT_X = 0.62


def wing(side):
    pts = [(x, z) for x, z in WING]
    v, f = kit.g_prism(pts, 0.1)
    # prisma en XY -> planta XZ del juego; x hacia afuera según el lado, algo caída hacia abajo (diedro)
    M = (kit.T(pos=(side * WING_ROOT_X, -0.12, -0.25), rot=(0, 0, side * math.radians(-8)))
         @ kit.T(scale=(side, 1, 1)) @ kit.T(rot=(math.pi / 2, 0, 0)))
    ob = piece("Ala " + ("der" if side > 0 else "izq"), (v, f), M,
               lambda p: lin("ffe66d") if abs(p.x) > WING_ROOT_X + 1.2 else mix("ff7a6b", "ffb38a", (abs(p.x) - WING_ROOT_X) / 1.2),
               part="wing", smooth=0.3, bev=0.03)
    return unite([ob], ob.name, "wing", pivot=(side * WING_ROOT_X, -0.12, -0.25), segment=0 if side < 0 else 1)


wings = [wing(-1), wing(1)]

# ------------------------------------------------------------------ llama (pivote en la boca de la tobera)
flame_v, flame_f = kit.g_lathe([(0.34, 0.0), (0.3, -0.25), (0.18, -0.65), (0.0, -1.0)], 24)
flame = piece("Llama", (flame_v, flame_f), kit.T(pos=(0, 0, TAIL_Z)) @ AXIS_Z,
              lambda p: mix("fff3b0", "ff7a6b", (TAIL_Z - p.z) / 1.0), part="flame", mat=FLAME)
flame = unite([flame], "Llama", "flame", pivot=(0, 0, TAIL_Z))

# ------------------------------------------------------------------ exportar
meshes = [body_ob] + wings + [flame]
meta = dict(forward="+Z", note="nariz a +Z; wing 0/1 pivotan en su raíz (rotation.z); flame en la boca de la tobera: escalar en Z")
parts, tris, size = kit.export_glb(ROOT / "cohete-juego.glb", objects=meshes, meta=meta,
                                   ao={"distance": 0.35, "strength": 0.5}, json_path=ROOT / "cohete.json")
assert parts == 4, parts
assert tris <= 20000, tris

bpy.ops.object.select_all(action="DESELECT")
for o in meshes:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "cohete.glb"), export_format="GLB",
                          use_selection=True, export_extras=True, export_animations=False)

# ------------------------------------------------------------------ renders
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = "PNG"
scene.view_settings.look = "AgX - Medium High Contrast"
world = bpy.data.worlds.new("Espacio"); world.use_nodes = True; scene.world = world
world.node_tree.nodes["Background"].inputs[0].default_value = (*kit.lin("0b1438"), 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.8
bpy.ops.object.light_add(type="SUN")
sun = bpy.context.object
sun.data.color = kit.lin("eaf4ff"); sun.data.energy = 3.2
sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(-30))
bpy.ops.object.camera_add(); cam = bpy.context.object; scene.camera = cam
cam.data.sensor_fit = "VERTICAL"; cam.data.sensor_height = 24
cam.data.lens = 24 / (2 * math.tan(math.radians(30)))
scene.render.resolution_x, scene.render.resolution_y = 1400, 900


def shot(name, eye, target):
    cam.location = kit.B(Vector(eye))
    cam.rotation_euler = (kit.B(Vector(target)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = str(ROOT / name)
    bpy.ops.render.render(write_still=True)


shot("render-cerca.png", (4.5, 2.4, 4.8), (0, 0.1, 0.2))      # 3/4 de frente
shot("render-juego.png", (0, 3.0, -9.0), (0, 0.3, 0))         # detrás, como la cámara del juego

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "cohete.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
