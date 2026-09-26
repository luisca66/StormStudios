"""Portón de madera · Walking AP Multi, La Pradera. Encargo de Gemini; receta en BRIEF-GEMINI.md de esta carpeta."""
import bpy, bmesh, math, random, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

SEED = 41
rng = random.Random(SEED)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection, SEED)


def material(name, roughness=0.9, metallic=0.0, emission=0.0, emission_hex="000000"):
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


def paint(ob, color_fn):
    """color_fn(co, normal) -> "hex" o (r, g, b) lineal. co y normal en espacio local de Blender."""
    me = ob.data
    attr = me.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
    for v in me.vertices:
        c = color_fn(v.co, v.normal)
        rgb = kit.lin(c) if isinstance(c, str) else c
        attr.data[v.index].color = (*rgb, 1.0)
    me.color_attributes.active_color = attr


def mix(hex_a, hex_b, t):
    """Mezcla dos colores hex en lineal; t en 0..1."""
    a, b = Vector(kit.lin(hex_a)), Vector(kit.lin(hex_b))
    return tuple(a.lerp(b, max(0.0, min(1.0, t))))


def apply_modifiers(ob):
    bpy.context.view_layer.objects.active = ob
    for mod in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)


def join(objs, name, part):
    """Aplica modificadores, une en un objeto y le pone nombre y part."""
    bpy.ops.object.select_all(action="DESELECT")
    for ob in objs:
        apply_modifiers(ob)
        ob.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob["part"] = part
    return ob


def box(size_xyz, center_xyz, bevel_width, mat):
    """Caja biselada. size y center en metros de Blender (Z arriba)."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=center_xyz)
    ob = bpy.context.object
    ob.scale = size_xyz
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mod = ob.modifiers.new("Bisel", "BEVEL")
    mod.width = bevel_width
    mod.segments = 2
    apply_modifiers(ob)
    ob.data.materials.append(mat)
    return ob


def set_pivot(ob, pivot_xyz):
    """Deja la geometría donde está y mueve el origen (pivote) al punto dado."""
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.context.scene.cursor.location = pivot_xyz
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    bpy.context.scene.cursor.location = (0, 0, 0)


def door(x_from, x_to, wood, iron, name, segment):
    """Hoja de 3 m de ancho y 4 m de alto hecha de 5 tablones, con dos bandas de hierro y una argolla."""
    pieces = []
    width = abs(x_to - x_from)
    plank_w = width / 5
    tones = ["8a5a3b", "7a4e33", "9a6644", "84553a", "946040"]
    for i in range(5):
        cx = min(x_from, x_to) + plank_w * (i + 0.5)
        p = box((plank_w - 0.04, 0.22, 4.0 - rng.uniform(0.0, 0.12)), (cx, 0, 2.0), 0.03, wood)
        tone = tones[i]
        paint(p, lambda co, n, tone=tone: mix(tone, "5e3b25", 0.25 * (1 - co.z / 4.0)))
        pieces.append(p)
    for z in (0.9, 3.1):
        band = box((width - 0.1, 0.3, 0.18), ((x_from + x_to) / 2, 0, z), 0.02, iron)
        paint(band, lambda co, n: "4a4a52")
        pieces.append(band)
    # argolla junto al borde que se abre (lejos de la bisagra), en la cara de fuera (−Y de Blender = +Z del juego)
    ring_x = x_to - math.copysign(0.45, x_to - x_from)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.16, minor_radius=0.035, major_segments=16, minor_segments=6,
                                     location=(ring_x, -0.2, 2.0), rotation=(math.radians(90), 0, 0))
    ring = bpy.context.object
    apply_modifiers(ring)
    ring.data.materials.append(iron)
    paint(ring, lambda co, n: "d9a441")
    pieces.append(ring)
    ob = join(pieces, name, "door")
    ob["segment"] = segment
    set_pivot(ob, (x_from, 0, 2.0))       # bisagra: borde exterior de la hoja, a 2 m de altura
    return ob


# ------------------------------------------------------------------ MODELO
wood = material("Madera", roughness=0.85)
iron = material("Herrajes", roughness=0.55, metallic=0.3)
stone = material("Piedra", roughness=0.9)

# frame: dos postes de piedra con remate y una viga de madera arriba (estático)
parts_frame = []
for sx in (-3.4, 3.4):
    post = box((0.9, 0.9, 5.0), (sx, 0, 2.5), 0.06, stone)
    paint(post, lambda co, n: mix("b9a582", "e2d3b3", co.z / 5.0))
    cap = box((1.1, 1.1, 0.35), (sx, 0, 5.15), 0.05, stone)
    paint(cap, lambda co, n: "d6c49e")
    parts_frame += [post, cap]
beam = box((7.8, 0.5, 0.55), (0, 0, 4.55), 0.04, wood)
paint(beam, lambda co, n: "7a4e33")
parts_frame.append(beam)
frame = join(parts_frame, "Marco", "frame")
frame.data.materials.clear(); frame.data.materials.append(stone)
set_pivot(frame, (0, 0, 0))

# door 0 (izquierda, bisagra en x = −3.0) y door 1 (derecha, bisagra en x = +3.0)
left = door(-3.0, 0.0, wood, iron, "Hoja izquierda", 0)
right = door(3.0, 0.0, wood, iron, "Hoja derecha", 1)
for ob in (left, right):
    ob.data.materials.clear(); ob.data.materials.append(wood)

# ------------------------------------------------------------------ LIMPIEZA
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH" and "part" in o]
for ob in meshes:
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-6)
    bad = [f for f in bm.faces if f.calc_area() < 1e-12]
    if bad:
        bmesh.ops.delete(bm, geom=bad, context="FACES")
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(ob.data); bm.free(); ob.data.update()

# ------------------------------------------------------------------ EXPORTAR (antes de mover nada)
meta = dict(forward="+Z", note="las hojas giran en Y alrededor de su pivote (bisagra)")
parts, tris, size = kit.export_glb(ROOT / "porton-juego.glb", objects=meshes, meta=meta,
                                   ao={"distance": 0.4, "strength": 0.6},
                                   json_path=ROOT / "porton.json")
assert parts == 3, parts
assert tris <= 4000, tris

bpy.ops.object.select_all(action="DESELECT")
for ob in meshes:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "porton.glb"), export_format="GLB",
                          use_selection=True, export_extras=True, export_animations=False)

# ------------------------------------------------------------------ RENDER (cámara y luz del brief)
for ob in meshes:
    if ob.get("part") == "door":
        ob.rotation_euler.z = math.radians(-25 if ob["segment"] == 0 else 25)

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 40
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = "PNG"
scene.view_settings.look = "AgX - Medium High Contrast"
world = bpy.data.worlds.new("Fondo"); world.use_nodes = True; scene.world = world
world.node_tree.nodes["Background"].inputs[0].default_value = (*kit.lin("a8d8f0"), 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.5
bpy.ops.object.light_add(type="SUN")
sun = bpy.context.object
sun.data.color = kit.lin("fff1d0"); sun.data.energy = 4.0
sun.rotation_euler = (math.radians(35), math.radians(-20), math.radians(30))
bpy.ops.object.camera_add(); cam = bpy.context.object; scene.camera = cam
cam.data.sensor_fit = "VERTICAL"; cam.data.sensor_height = 24
cam.data.lens = 24 / (2 * math.tan(math.radians(30)))      # FOV vertical 60°
cam.location = (3, -11, 3)
cam.rotation_euler = (Vector((0, 0, 2.3)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.render.filepath = str(ROOT / "render-kit.png")
bpy.ops.render.render(write_still=True)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "porton.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
