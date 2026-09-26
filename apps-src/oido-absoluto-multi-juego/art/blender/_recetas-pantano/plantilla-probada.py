"""Prueba de la receta de asteroides (Claude). No es entregable."""
import bpy, bmesh, math, random, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, r"C:\Users\Luis\Documents\Claude Cowork\nuevo_website\storm-studios\StormStudios\apps-src\grados-mayores-juego\art\blender")
import kit

SEED = 42
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
    me = ob.data
    attr = me.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
    for v in me.vertices:
        c = color_fn(v.co, v.normal)
        rgb = kit.lin(c) if isinstance(c, str) else c
        attr.data[v.index].color = (*rgb, 1.0)
    me.color_attributes.active_color = attr


def mix(hex_a, hex_b, t):
    a, b = Vector(kit.lin(hex_a)), Vector(kit.lin(hex_b))
    return tuple(a.lerp(b, max(0.0, min(1.0, t))))


def apply_modifiers(ob):
    bpy.context.view_layer.objects.active = ob
    for mod in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)


def join(objs, name, part):
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


# --- funciones extra del brief (§4.0)
def rock_color(co, n, radius):
    t = 0.5 + 0.5 * n.z                       # caras que miran arriba, más claras
    base = mix("3a4a78", "9aaddc", t)
    if (co.length / radius) < 0.8:            # hondonadas: más oscuras
        base = mix("26335a", "3a4a78", t)
    return base


def asteroid_blob(radius_xyz, noise_scale, strength, location=(0, 0, 0), mat=None):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1, location=(0, 0, 0))
    ob = bpy.context.object
    ob.scale = radius_xyz
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    lumps = bpy.data.textures.new(f"Bultos {ob.name}", "CLOUDS")
    lumps.noise_scale = noise_scale
    mod = ob.modifiers.new("Bultos", "DISPLACE")
    mod.texture = lumps
    mod.strength = strength
    mod.mid_level = 0.5
    craters = bpy.data.textures.new(f"Crateres {ob.name}", "VORONOI")
    craters.noise_scale = 0.3
    mod = ob.modifiers.new("Crateres", "DISPLACE")
    mod.texture = craters
    mod.strength = 0.1
    mod.mid_level = 0.5
    apply_modifiers(ob)
    for v in ob.data.vertices:
        v.co += Vector(location)
    ob.data.update()
    ob.data.materials.append(mat)
    r = max(radius_xyz)
    paint(ob, lambda co, n: rock_color(co - Vector(location), n, r))
    return ob


def recenter(ob):
    xs = [v.co.x for v in ob.data.vertices]; ys = [v.co.y for v in ob.data.vertices]; zs = [v.co.z for v in ob.data.vertices]
    c = Vector(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, (min(zs) + max(zs)) / 2))
    for v in ob.data.vertices:
        v.co -= c
    ob.data.update()
    ob.location = (0, 0, 0)


def flat_shading(ob):
    for f in ob.data.polygons:
        f.use_smooth = False


# ------------------------------------------------------------------ MODELO
rock = material("Asteroide", roughness=0.9)

a = asteroid_blob((0.5, 0.46, 0.44), 0.7, 0.32, mat=rock)
a = join([a], "Asteroide A", "asteroid_a"); recenter(a); flat_shading(a)

b = asteroid_blob((0.8, 0.42, 0.44), 0.6, 0.36, mat=rock)
b = join([b], "Asteroide B", "asteroid_b"); recenter(b); flat_shading(b)

c1 = asteroid_blob((0.46, 0.42, 0.4), 0.6, 0.28, location=(-0.18, 0, 0), mat=rock)
c2 = asteroid_blob((0.32, 0.3, 0.28), 0.6, 0.2, location=(0.34, 0.08, 0.12), mat=rock)
c = join([c1, c2], "Asteroide C", "asteroid_c"); recenter(c); flat_shading(c)

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

# ------------------------------------------------------------------ EXPORTAR
meta = dict(forward="+Z", note="kit instanciado; pivote en el centro; el juego escala 0.3-1.2")
parts, tris, size = kit.export_glb(ROOT / "asteroides-cosmos-juego.glb", objects=meshes, meta=meta,
                                   ao={"distance": 0.3, "strength": 0.6}, json_path=ROOT / "asteroides-cosmos.json")
assert parts == 3, parts
assert tris <= 2400, tris

# ------------------------------------------------------------------ RENDER
for i, ob in enumerate(meshes):
    ob.location.x = (i - (len(meshes) - 1) / 2) * 2.5
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 40
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = "PNG"
scene.view_settings.look = "AgX - Medium High Contrast"
world = bpy.data.worlds.new("Fondo"); world.use_nodes = True; scene.world = world
world.node_tree.nodes["Background"].inputs[0].default_value = (*kit.lin("0b1438"), 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.8
bpy.ops.object.light_add(type="SUN")
sun = bpy.context.object
sun.data.color = kit.lin("fff1d0"); sun.data.energy = 4.0
sun.rotation_euler = (math.radians(35), math.radians(-20), math.radians(30))
bpy.ops.object.camera_add(); cam = bpy.context.object; scene.camera = cam
cam.data.sensor_fit = "VERTICAL"; cam.data.sensor_height = 24
cam.data.lens = 24 / (2 * math.tan(math.radians(30)))
cam.location = (0, -6, 1.5)
cam.rotation_euler = (Vector((0, 0, 0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.render.filepath = str(ROOT / "render-kit.png")
bpy.ops.render.render(write_still=True)
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
