"""Nave del jugador de Cosmic Ear, modelada por Claude con bpy (fase 3 de PLAN-COSMIC-EAR.md).

Navecita de juguete del «sistema solar musical»: fuselaje crema con franja magenta, cabina de burbuja
turquesa, alas en flecha con puntas doradas, dos aletas de cola y tobera. Espacio del juego (Three):
Y arriba, la nariz mira a -Z y el motor a +Z (la cámara va detrás, en +Z). El juego la escala x0.7.
Partes: `hull` (todo lo fijo) y `engine` (disco del motor: el juego anima su opacidad).
"""
import bpy, bmesh, math, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection, 3)

NOSE = kit.T(rot=(-math.pi / 2, 0, 0))   # eje Y del torno -> -Z (nariz)


def lin(h):
    return Vector(kit.lin(h))


def mix(a, b, t):
    return lin(a).lerp(lin(b), max(0.0, min(1.0, t)))


def material(name, roughness, metallic=0.0, emission=0.0, emission_hex="000000", alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Emission Color"].default_value = (*kit.lin(emission_hex), 1)
    bsdf.inputs["Emission Strength"].default_value = emission
    bsdf.inputs["Alpha"].default_value = alpha
    vc = mat.node_tree.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Pigment"
    mat.node_tree.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


PAINT = material("Pintura", 0.42)
ENGINE = material("Motor", 0.3, emission=2.5, emission_hex="ff8a3d", alpha=0.9)


def paint(ob, fn):
    """fn(p) con p en espacio Three -> color lineal."""
    me = ob.data
    attr = me.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
    for v in me.vertices:
        b = ob.matrix_world @ v.co
        attr.data[v.index].color = (*fn(Vector((b.x, b.z, -b.y))), 1.0)
    me.color_attributes.active_color = attr


def piece(name, geo, M, fn, smooth=0.62, bev=None):
    verts, faces = geo[0], geo[1]
    ob = kit.make(name, verts, faces, PAINT, M, part="hull", smooth_angle=smooth, tint=0)
    if bev:
        kit.bevel(ob, width=bev, segments=2)
    paint(ob, fn)
    return ob


# ------------------------------------------------------------------ fuselaje
profile = [(0.0, -2.62), (0.34, -2.6), (0.56, -2.45), (0.7, -1.9), (0.76, -1.0), (0.77, 0.0), (0.72, 0.9),
           (0.6, 1.6), (0.44, 2.1), (0.26, 2.45), (0.1, 2.62), (0.0, 2.66)]


def hull_color(p):
    # franja magenta a lo largo del costado, panza un poco más oscura
    band = abs(p.y + 0.05) < 0.14 and p.z > -1.6
    c = lin("ff6fb5") if band else mix("d9cfe6", "fff7ea", (p.y + 0.8) / 1.5)
    if p.z < -2.25:                      # punta de la nariz dorada
        c = lin("ffcf5a")
    return c


fuselage = piece("Fuselaje", kit.g_lathe(profile, 36), NOSE, hull_color)

# anillo dorado en la cintura
ring = piece("Anillo", kit.g_torus(0.79, 0.05, 40, 8), kit.T(pos=(0, 0, 0.35)), lambda p: lin("ffcf5a"))

# ------------------------------------------------------------------ cabina de burbuja
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=18, radius=1, location=(0, 0, 0))
dome = bpy.context.object
dome.scale = (0.42, 0.85, 0.36)                  # Blender: X ancho, Y largo (= -Z Three), Z alto
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
dome.location = kit.B(Vector((0, 0.5, -0.75)))
bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
for f in dome.data.polygons:
    f.use_smooth = True
dome.data.materials.append(PAINT)
dome["part"] = "hull"
paint(dome, lambda p: mix("1d8f8a", "7ff0e6", (p.y - 0.4) / 0.45))

# ------------------------------------------------------------------ alas en flecha
WING = [(0.55, -0.35), (2.7, 0.95), (2.85, 1.45), (0.6, 1.5)]   # (x, z) en planta


def wing(side):
    pts = [(side * x, z) for x, z in WING]
    if side < 0:
        pts = list(reversed(pts))
    v, f = kit.g_prism(pts, 0.12)
    M = kit.T(pos=(0, -0.12, 0), rot=(math.pi / 2, 0, 0))    # plano XY del prisma -> XZ
    return piece("Ala " + ("der" if side > 0 else "izq"), (v, f), M,
                 lambda p: lin("ffcf5a") if abs(p.x) > 2.35 else mix("c94f93", "ff6fb5", abs(p.x) / 2.3),
                 smooth=0.3, bev=0.03)


wings = [wing(1), wing(-1)]

# ------------------------------------------------------------------ aletas de cola
FIN = [(1.35, 0.25), (2.35, 0.25), (2.55, 1.35), (2.1, 1.4)]    # (z, y) de perfil


def fin(side):
    v, f = kit.g_prism([(z, y) for z, y in FIN], 0.1)
    # prisma en XY -> plano ZY (girar 90° en Y) y abrir 22° hacia afuera
    M = kit.T(pos=(side * 0.38, 0, 0), rot=(0, 0, side * math.radians(-22))) @ kit.T(rot=(0, -math.pi / 2, 0))
    return piece("Aleta " + ("der" if side > 0 else "izq"), (v, f), M,
                 lambda p: mix("ffb347", "ffcf5a", (p.y - 0.25) / 1.1), smooth=0.3, bev=0.025)


fins = [fin(1), fin(-1)]

# ------------------------------------------------------------------ tobera y antena
nozzle = piece("Tobera", kit.g_lathe([(0.5, 0.0), (0.6, -0.25), (0.62, -0.45), (0.5, -0.47)], 32),
               kit.T(pos=(0, 0, 2.35), rot=(-math.pi / 2, 0, 0)) @ kit.T(rot=(math.pi, 0, 0)),
               lambda p: mix("3a3548", "6d6680", (p.z - 2.3) / 0.5))
mast = piece("Antena", kit.g_cyl(0.02, 0.03, 0.55, 8), kit.T(pos=(0, 1.0, 0.6)), lambda p: lin("6d6680"))
bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.07, location=kit.B(Vector((0, 1.3, 0.6))))
tip = bpy.context.object
tip.data.materials.append(PAINT)
tip["part"] = "hull"
paint(tip, lambda p: lin("3fd2c7"))

# unir todo lo fijo en una malla (una parte = un objeto), origen en (0, 0, 0)
hull_objs = [o for o in bpy.context.scene.objects if o.type == "MESH" and o.get("part") == "hull"]
bpy.ops.object.select_all(action="DESELECT")
for o in hull_objs:
    bpy.context.view_layer.objects.active = o
    for mod in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)
    o.select_set(True)
bpy.context.view_layer.objects.active = fuselage
bpy.ops.object.join()
hull = bpy.context.view_layer.objects.active
hull.name = "Casco"
hull["part"] = "hull"
bpy.context.scene.cursor.location = (0, 0, 0)
bpy.ops.object.origin_set(type="ORIGIN_CURSOR")

# ------------------------------------------------------------------ motor (parte viva)
v, f, _ = kit.g_disc(0.46, 32)
engine = kit.make("Motor", v, f, ENGINE, kit.T(pos=(0, 0, 2.81)), part="engine", tint=0)
paint(engine, lambda p: mix("ffd27a", "ff6a2a", Vector((p.x, p.y)).length / 0.46))

# ------------------------------------------------------------------ exportar
meshes = [hull, engine]
meta = dict(forward="-Z", note="nariz a -Z; engine: disco del motor en +Z, el juego anima su opacidad; escala x0.7 en el juego")
parts, tris, size = kit.export_glb(ROOT / "nave-juego.glb", objects=meshes, meta=meta,
                                   ao={"distance": 0.35, "strength": 0.55}, json_path=ROOT / "nave.json")
assert parts == 2, parts
assert tris <= 20000, tris

bpy.ops.object.select_all(action="DESELECT")
for o in meshes:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "nave.glb"), export_format="GLB",
                          use_selection=True, export_extras=True, export_animations=False)

# ------------------------------------------------------------------ renders
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = "PNG"
scene.view_settings.look = "AgX - Medium High Contrast"
world = bpy.data.worlds.new("Espacio"); world.use_nodes = True; scene.world = world
world.node_tree.nodes["Background"].inputs[0].default_value = (*kit.lin("1a1036"), 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.8
bpy.ops.object.light_add(type="SUN")
sun = bpy.context.object
sun.data.color = kit.lin("fff1d0"); sun.data.energy = 3.0
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


shot("render-cerca.png", (4.5, 2.6, -4.5), (0, 0.2, 0))      # 3/4 de frente
shot("render-juego.png", (0, 3.0 / 0.7, 10 / 0.7), (0, 0, 0))  # la cámara del juego, detrás

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "nave.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
