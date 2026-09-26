"""Glub, el jugador de La Pradera (nivel 1), modelado por Claude con bpy.

Misma esencia que el Glub original: bola rosa con pies grandes y manos flotantes, sin brazos ni
piernas. Mejoras aprobadas por Luis (2026-09-26): volumen, degradado de rosa, rubor, dedos de pie
formados y ojos grandes que parpadean. Partes rígidas; player.ts ya anima pies y manos.

Espacio del juego (Three): Y arriba, frente +Z. Los pivotes coinciden con las posiciones que usa
player.ts (buildGlub), así que el juego solo cambia las mallas.
"""
import bpy, bmesh, math, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection, 1)

BODY_C = Vector((0, 1.5, 0))     # centro del cuerpo (Three)
FEET = [Vector((-0.6, 0.3, 0)), Vector((0.6, 0.3, 0))]
HANDS = [Vector((-1.1, 1.5, 0)), Vector((1.1, 1.5, 0))]


def lin(h):
    return Vector(kit.lin(h))


def mix(a, b, t):
    return lin(a).lerp(lin(b), max(0.0, min(1.0, t)))


def material(name, roughness, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    vc = mat.node_tree.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Pigment"
    mat.node_tree.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


SKIN = material("Piel", 0.38)
LIMB = material("Pies y manos", 0.45)
EYE = material("Ojo", 0.12)


def ellipsoid(center, radii, segs=48, rings=28, facing=None):
    """Elipsoide en espacio Three. radii = (ancho X, alto Y, fondo Z). `facing` gira su +Z hacia ese vector."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=rings, radius=1, location=(0, 0, 0))
    ob = bpy.context.object
    ob.scale = (radii[0], radii[2], radii[1])          # Blender: X, Y (= −Z Three), Z (= Y Three)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if facing is not None:
        ob.rotation_mode = "QUATERNION"
        ob.rotation_quaternion = kit.B(facing).to_track_quat("-Y", "Z")
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    ob.location = kit.B(center)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def paint(ob, fn):
    """fn(p) con p en espacio Three del juego -> color lineal."""
    me = ob.data
    attr = me.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
    for v in me.vertices:
        b = v.co
        c = fn(Vector((b.x, b.z, -b.y)))
        attr.data[v.index].color = (*c, 1.0)
    me.color_attributes.active_color = attr


def part(objs, name, part_name, pivot, mat, segment=None):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.data.materials.clear()
    ob.data.materials.append(mat)
    bpy.context.scene.cursor.location = kit.B(pivot)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    ob.name = name
    ob["part"] = part_name
    if segment is not None:
        ob["segment"] = segment
    return ob


def blush(p, center, radius):
    d = (p - center).length / radius
    return max(0.0, 1 - d * d)


# ------------------------------------------------------------------ cuerpo
body = ellipsoid(BODY_C, (1.0, 0.97, 0.98), segs=64, rings=40)
cheeks = [BODY_C + Vector((s * 0.58, -0.14, 0.78)) for s in (-1, 1)]


def body_color(p):
    t = (p.y - (BODY_C.y - 0.97)) / 1.94
    c = mix("c81f62", "ff4081", t / 0.55) if t < 0.55 else mix("ff4081", "ff86b0", (t - 0.55) / 0.45)
    # un toque más claro en la panza, al frente
    front = max(0.0, (p.z - BODY_C.z)) * max(0.0, 1 - abs(p.y - BODY_C.y + 0.25))
    c = c.lerp(lin("ff9cc0"), 0.25 * front)
    for ch in cheeks:
        c = c.lerp(lin("ff6f8f"), 0.55 * blush(p, ch, 0.28))
    return c


paint(body, body_color)
part([body], "Cuerpo", "body", BODY_C, SKIN)

# ------------------------------------------------------------------ ojos
for seg, s in enumerate((-1, 1)):
    d = Vector((s * 0.34, 0.30, 0.89)).normalized()
    center = BODY_C + d * 0.9
    sclera = ellipsoid(center, (0.21, 0.29, 0.15), 32, 18, facing=d)
    paint(sclera, lambda p: lin("fbf8ff"))
    look = Vector((-s * 0.035, 0.03, 0))                     # la mirada, un poco al centro y arriba
    pupil = ellipsoid(center + d * 0.1 + look, (0.12, 0.17, 0.075), 24, 14, facing=d)
    pc = center + d * 0.17 + look
    paint(pupil, lambda p, pc=pc: mix("3a1f5c", "140a24", 1 - (p - pc).length / 0.17))
    shine = ellipsoid(center + d * 0.2 + look + Vector((-0.045, 0.075, 0)), (0.045, 0.05, 0.03), 12, 8, facing=d)
    paint(shine, lambda p: lin("ffffff"))
    small = ellipsoid(center + d * 0.2 + look + Vector((0.04, -0.05, 0)), (0.02, 0.022, 0.015), 10, 6, facing=d)
    paint(small, lambda p: lin("ffffff"))
    part([sclera, pupil, shine, small], f"Ojo {seg}", "eye", center, EYE, seg)

# ------------------------------------------------------------------ pies (dedos al frente, +Z)
for seg, pv in enumerate(FEET):
    sole_y = pv.y - 0.28
    main = ellipsoid(pv + Vector((0, -0.02, 0.1)), (0.38, 0.26, 0.56), 40, 24)
    toes = [ellipsoid(pv + Vector((x, -0.1, 0.56 - abs(x) * 0.35)), (0.12, 0.13, 0.14), 20, 12)
            for x in (-0.19, 0, 0.19)]

    def foot_color(p, sole_y=sole_y):
        t = (p.y - sole_y) / 0.5
        return mix("7a0038", "c60055", t / 0.45) if t < 0.45 else mix("c60055", "e8337a", (t - 0.45) / 0.55)

    for o in [main, *toes]:
        paint(o, foot_color)
    part([main, *toes], f"Pie {seg}", "foot", pv, LIMB, seg)

# ------------------------------------------------------------------ manos (manopla con pulgar)
for seg, pv in enumerate(HANDS):
    s = -1 if seg == 0 else 1
    palm = ellipsoid(pv, (0.25, 0.3, 0.24), 36, 22)
    thumb = ellipsoid(pv + Vector((-s * 0.1, 0.14, 0.17)), (0.09, 0.12, 0.09), 18, 12)

    def hand_color(p, pv=pv):
        t = (p.y - (pv.y - 0.3)) / 0.6
        return mix("9e0047", "e8337a", t)

    for o in (palm, thumb):
        paint(o, hand_color)
    part([palm, thumb], f"Mano {seg}", "hand", pv, LIMB, seg)

# ------------------------------------------------------------------ exportar (antes de mover nada)
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH" and "part" in o]
meta = dict(forward="+Z", note="pivotes = posiciones de player.ts buildGlub; ojos: aplastar en Y para parpadear")
parts, tris, size = kit.export_glb(ROOT / "glub-juego.glb", objects=meshes, meta=meta, ao=None,
                                   json_path=ROOT / "glub.json")
assert parts == 7, parts
assert tris <= 30000, tris

bpy.ops.object.select_all(action="DESELECT")
for o in meshes:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "glub.glb"), export_format="GLB",
                          use_selection=True, export_extras=True, export_animations=False)

# ------------------------------------------------------------------ renders
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = "PNG"
scene.view_settings.look = "AgX - Medium High Contrast"
world = bpy.data.worlds.new("Pradera"); world.use_nodes = True; scene.world = world
world.node_tree.nodes["Background"].inputs[0].default_value = (*kit.lin("a8d8f0"), 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.6
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
grass = bpy.context.object
gm = bpy.data.materials.new("Pasto"); gm.use_nodes = True
gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*kit.lin("6fb54f"), 1)
grass.data.materials.append(gm)
bpy.ops.object.light_add(type="SUN")
sun = bpy.context.object
sun.data.color = kit.lin("fff1d0"); sun.data.energy = 3.5; sun.data.angle = math.radians(8)
sun.rotation_euler = (math.radians(40), 0, math.radians(150))
bpy.ops.object.camera_add(); cam = bpy.context.object; scene.camera = cam
cam.data.sensor_fit = "VERTICAL"; cam.data.sensor_height = 24
cam.data.lens = 24 / (2 * math.tan(math.radians(30)))
scene.render.resolution_x, scene.render.resolution_y = 1200, 900


def shot(name, eye, target):
    cam.location = kit.B(Vector(eye))
    cam.rotation_euler = (kit.B(Vector(target)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = str(ROOT / name)
    bpy.ops.render.render(write_still=True)


shot("render-cerca.png", (2.6, 2.3, 4.6), (0, 1.35, 0))       # 3/4 de frente: la cara
shot("render-juego.png", (0, 2.5, -6.0), (0, 1.2, 0))         # la cámara del juego, por detrás

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "glub.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
