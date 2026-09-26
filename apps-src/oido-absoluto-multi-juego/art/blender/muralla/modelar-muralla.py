"""Muralla perimetral · Walking AP Multi, La Pradera. Encargo de Gemini; receta en BRIEF-GEMINI.md de esta carpeta."""
import bpy, bmesh, math, random, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

SEED = 31
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
    mod.segments = 1
    apply_modifiers(ob)
    ob.data.materials.append(mat)
    return ob


def stone_color(co, z_top):
    """Piedra cálida: musgo en el primer medio metro, más clara hacia arriba, con variación suave."""
    t = max(0.0, min(1.0, co.z / max(z_top, 1e-6)))
    base = mix("b9a582", "e2d3b3", t)
    if co.z < 0.5:
        base = Vector(base).lerp(Vector(kit.lin("6f8f4a")), 0.6 * (1 - co.z / 0.5))
    k = 0.93 + 0.14 * rng.random()
    return tuple(c * k for c in base)


def world_paint(ob, z_top):
    paint(ob, lambda co, n: stone_color(co + ob.location, z_top))


# ------------------------------------------------------------------ MODELO
stone = material("Piedra", roughness=0.9)
roof = material("Teja", roughness=0.6)

# wall_segment: tramo de 8 m (largo en X), 1.5 m de grueso, 6 m de alto, con 4 almenas encima
body = box((8.0, 1.5, 6.0), (0, 0, 3.0), 0.08, stone)
world_paint(body, 7.0)
merlons = []
for x in (-3.0, -1.0, 1.0, 3.0):
    m = box((1.0, 1.6, 1.0), (x, 0, 6.5), 0.06, stone)
    world_paint(m, 7.0)
    merlons.append(m)
ledge = box((8.0, 1.8, 0.3), (0, 0, 5.85), 0.05, stone)
paint(ledge, lambda co, n: "d6c49e")
# piedras salientes sueltas en las dos caras, más oscuras o más claras que el muro
blocks = []
for side in (-1, 1):
    for i in range(6):
        bx = rng.uniform(-3.5, 3.5)
        bz = rng.uniform(0.8, 5.2)
        b = box((rng.uniform(0.6, 1.0), 0.12, rng.uniform(0.3, 0.45)), (bx, side * 0.78, bz), 0.03, stone)
        tone = rng.choice(["c9b58f", "a8946f", "d9c8a2"])
        paint(b, lambda co, n, tone=tone: tone)
        blocks.append(b)
wall = join([body, ledge, *merlons, *blocks], "Tramo de muralla", "wall_segment")

# wall_tower: torreta redonda de 8 m con techo cónico rojo (esquinas y junto al portón)
bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=1.8, depth=8.0, location=(0, 0, 4.0))
tower = bpy.context.object
tower.data.materials.append(stone)
world_paint(tower, 8.0)
bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=2.3, radius2=0.0, depth=3.2, location=(0, 0, 9.6))
cone = bpy.context.object
cone.data.materials.append(stone)
paint(cone, lambda co, n: mix("a83a36", "d9534f", (co.z + 1.6) / 3.2))
bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=2.0, depth=0.4, location=(0, 0, 7.8))
ring = bpy.context.object
ring.data.materials.append(stone)
paint(ring, lambda co, n: "d6c49e")
slits = []
for ang in (0.0, math.pi):
    s_ = box((0.25, 0.3, 1.1), (math.sin(ang) * 1.72, -math.cos(ang) * 1.72, 5.2), 0.02, stone)
    s_.rotation_euler = (0, 0, ang)
    paint(s_, lambda co, n: "3a2f28")
    slits.append(s_)
tw = join([tower, ring, cone, *slits], "Torreta", "wall_tower")

# Pivote en la base, en (0, 0, 0), para las dos partes
for ob in (wall, tw):
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")

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
meta = dict(forward="+Z", note="kit instanciado; tramo de 8 m a lo largo de X; pivote en la base")
parts, tris, size = kit.export_glb(ROOT / "muralla-juego.glb", objects=meshes, meta=meta,
                                   ao={"distance": 1.0, "strength": 0.5},
                                   json_path=ROOT / "muralla.json")
assert parts == 2, parts
assert tris <= 1300, tris

bpy.ops.object.select_all(action="DESELECT")
for ob in meshes:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "muralla.glb"), export_format="GLB",
                          use_selection=True, export_extras=True, export_animations=False)

# ------------------------------------------------------------------ RENDER (cámara y luz del brief)
for i, ob in enumerate(meshes):          # en fila, solo para la foto
    ob.location.x = (i - (len(meshes) - 1) / 2) * 8.0
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
cam.location = (0, -22, 6)
cam.rotation_euler = (Vector((0, 0, 4)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.render.filepath = str(ROOT / "render-kit.png")
bpy.ops.render.render(write_still=True)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "muralla.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
