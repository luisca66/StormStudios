"""Estación de salida de Cosmic Ear, modelada por Claude con bpy (fase 3 de PLAN-COSMIC-EAR.md).

Plataforma de despegue flotante bajo la nave, como un trompo-isla del «sistema solar de juguete musical»:
cubierta violeta con borde crema y centro dorado, panza que se afila hasta una punta turquesa, cuatro
faroles magenta en las diagonales y un anillo dorado que la rodea. Espacio del juego (Three): Y arriba,
la cubierta en y = 0, radio 3.2. La nave se posa encima; el juego la coloca en (0, -1.1, 0).
Partes: `pad` (todo lo fijo), `pad_lights` (luces turquesa de la cubierta), `pad_beacons` (focos de los
faroles) y `pad_ring` (anillo dorado: el juego lo hace girar).
"""
import bpy, math, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection, 8)


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


PAINT = material("Pintura", 0.5)
LIGHTS = material("Luces", 0.3, emission=1.6, emission_hex="3fd2c7")
BEACONS = material("Focos", 0.3, emission=2.0, emission_hex="ff6fb5")
GOLD = material("Oro", 0.28, metallic=0.6, emission=0.35, emission_hex="ffcf5a")


def paint(ob, fn):
    """fn(p) con p en espacio Three -> color lineal."""
    me = ob.data
    attr = me.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
    for v in me.vertices:
        b = ob.matrix_world @ v.co
        attr.data[v.index].color = (*fn(Vector((b.x, b.z, -b.y))), 1.0)
    me.color_attributes.active_color = attr


def piece(name, geo, M, fn, mat=PAINT, part="pad", smooth=0.62):
    ob = kit.make(name, geo[0], geo[1], mat, M, part=part, smooth_angle=smooth, tint=0)
    paint(ob, fn)
    return ob


def unite(objs, name, part):
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
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    return ob


# ------------------------------------------------------------------ cuerpo: trompo-isla
# Perfil (radio, y) de la punta de abajo a la cubierta; los radios repetidos en y = 0 dan bandas nítidas.
profile = [(0.0, -2.9), (0.16, -2.78), (0.42, -2.4), (0.9, -1.85), (1.55, -1.3), (2.3, -0.8), (2.95, -0.45),
           (3.22, -0.28), (3.26, -0.14), (3.2, -0.02), (3.05, 0.0), (2.8, 0.0), (2.74, 0.0), (1.3, 0.0),
           (1.24, 0.0), (1.12, 0.0), (1.06, 0.0), (0.42, 0.0), (0.36, 0.0), (0.0, 0.0)]


def body_color(p):
    r = Vector((p.x, p.z)).length
    if p.y > -0.01:                                   # cubierta
        if r > 2.77:
            return lin("fff7ea")                      # borde crema
        if r < 0.39:
            return lin("ffcf5a")                      # centro dorado
        if 1.09 < r < 1.27:
            return lin("8c63b8")                      # anillo claro de aterrizaje
        return mix("3b2466", "4d2f80", r / 2.7)
    if p.y > -0.3:                                    # canto: franja magenta
        return lin("ff6fb5")
    if p.y < -2.6:
        return lin("3fd2c7")                          # punta turquesa
    return mix("2a1650", "6b4487", (p.y + 2.6) / 2.3)  # panza violeta que se oscurece hacia abajo


body = piece("Cuerpo", kit.g_lathe(profile, 48), kit.T(), body_color, smooth=0.5)

# ------------------------------------------------------------------ cuatro faroles en las diagonales
posts = []
for k in range(4):
    a = math.pi / 4 + k * math.pi / 2
    x, z = 2.92 * math.cos(a), 2.92 * math.sin(a)
    posts.append(piece(f"Poste {k}", kit.g_cyl(0.045, 0.08, 1.05, 10), kit.T(pos=(x, 0.52, z)),
                       lambda p: mix("c9a7e8", "fff7ea", p.y / 1.0)))
    posts.append(piece(f"Copa {k}", kit.g_lathe([(0.0, 0.0), (0.14, 0.02), (0.2, 0.12), (0.17, 0.16)], 14),
                       kit.T(pos=(x, 1.02, z)), lambda p: lin("ffcf5a")))
pad = unite([body] + posts, "Plataforma", "pad")

# ------------------------------------------------------------------ luces turquesa de la cubierta
studs = []
for k in range(12):
    a = k * math.tau / 12
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=0.11,
                                         location=kit.B(Vector((2.45 * math.cos(a), 0.02, 2.45 * math.sin(a)))))
    s = bpy.context.object
    s.scale = (1, 1, 0.55)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    s.data.materials.append(LIGHTS)
    for f in s.data.polygons:
        f.use_smooth = True
    paint(s, lambda p: lin("aef8f0"))
    studs.append(s)
chevrons = []
for k in range(3):                                   # flechas hacia delante (-Z): por dónde se sale
    z = -1.55 - k * 0.38
    v, f = kit.g_prism([(-0.28, 0.0), (0.0, -0.2), (0.28, 0.0), (0.28, 0.1), (0.0, -0.1), (-0.28, 0.1)], 0.03)
    chevrons.append(piece(f"Flecha {k}", (v, f), kit.T(pos=(0, 0.02, z), rot=(math.pi / 2, 0, 0)),
                          lambda p: lin("aef8f0"), mat=LIGHTS, part="pad_lights", smooth=0.2))
lights = unite(studs + chevrons, "Luces", "pad_lights")

# ------------------------------------------------------------------ focos de los faroles
bulbs = []
for k in range(4):
    a = math.pi / 4 + k * math.pi / 2
    bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=8, radius=0.15,
                                         location=kit.B(Vector((2.92 * math.cos(a), 1.26, 2.92 * math.sin(a)))))
    s = bpy.context.object
    s.data.materials.append(BEACONS)
    for f in s.data.polygons:
        f.use_smooth = True
    paint(s, lambda p: lin("ffc2e0"))
    bulbs.append(s)
beacons = unite(bulbs, "Focos", "pad_beacons")

# ------------------------------------------------------------------ anillo dorado (gira en el juego)
ring = piece("Anillo", kit.g_torus(3.85, 0.07, 72, 8), kit.T(rot=(math.pi / 2, 0, 0)),
             lambda p: lin("ffcf5a"), mat=GOLD, part="pad_ring")
knobs = []
for k in range(6):                                   # cuentas en el anillo: se nota que gira
    a = k * math.tau / 6
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.16,
                                         location=kit.B(Vector((3.85 * math.cos(a), 0, 3.85 * math.sin(a)))))
    s = bpy.context.object
    s.data.materials.append(GOLD)
    for f in s.data.polygons:
        f.use_smooth = True
    paint(s, lambda p: lin("ffe29a"))
    knobs.append(s)
ring = unite([ring] + knobs, "Anillo", "pad_ring")

# ------------------------------------------------------------------ exportar
meshes = [pad, lights, beacons, ring]
meta = dict(forward="-Z", note="cubierta en y=0, radio 3.2; el juego la pone en (0,-1.1,0) bajo la nave; "
                               "pad_ring gira en Y; pad_lights y pad_beacons pueden latir")
parts, tris, size = kit.export_glb(ROOT / "estacion-juego.glb", objects=meshes, meta=meta,
                                   ao={"distance": 0.5, "strength": 0.6}, json_path=ROOT / "estacion.json")
assert parts == 4, parts
assert tris <= 8000, tris

bpy.ops.object.select_all(action="DESELECT")
for o in meshes:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "estacion.glb"), export_format="GLB",
                          use_selection=True, export_extras=True, export_animations=False)

# ------------------------------------------------------------------ renders
nave = ROOT.parent / "nave" / "nave.glb"          # la nave encima, solo para la foto
bpy.ops.import_scene.gltf(filepath=str(nave))
for o in bpy.context.selected_objects:
    if o.parent is None:
        o.scale = (0.7, 0.7, 0.7)
        o.location = kit.B(Vector((0, 1.1, 0)))

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
cam.data.lens = 24 / (2 * math.tan(math.radians(35)))     # FOV vertical 70°, el del juego
scene.render.resolution_x, scene.render.resolution_y = 1400, 900


def shot(name, eye, target):
    cam.location = kit.B(Vector(eye))
    cam.rotation_euler = (kit.B(Vector(target)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = str(ROOT / name)
    bpy.ops.render.render(write_still=True)


shot("render-cerca.png", (7.5, 4.5, -6.5), (0, -0.4, 0))
shot("render-juego.png", (0, 1.1 + 3, 10), (0, 1.1, 0))   # la cámara del juego al empezar (plataforma en y=-1.1)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "estacion.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
