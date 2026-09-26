"""Planetas de fondo · Walking AP Multi, El Cosmos. Encargo de Gemini; receta en BRIEF-GEMINI.md de esta carpeta."""
import bpy, bmesh, math, random, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

SEED = 33
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


# ------------------------------------------------------------------ RECETA DEL BRIEF
BANDS_A = ["ff7a6b", "ffb38a", "fff0d6", "ffb38a", "ff7a6b", "e0525a", "ff7a6b", "ffb38a"]
BANDS_C = ["b8a4ff", "ff8fd8", "e6ddff", "b8a4ff", "8f7ae6", "ff8fd8", "b8a4ff", "e6ddff"]


def banded(bands):
    """Rayas horizontales por altura (co.z de -1 a 1), con borde suave entre franjas."""
    def fn(co, n):
        u = (co.z + 1) / 2 * len(bands)
        i = min(int(u), len(bands) - 1)
        j = min(i + 1, len(bands) - 1)
        f = u - int(u)
        return mix(bands[i], bands[j], max(0.0, (f - 0.8) / 0.2))
    return fn


def planet_ball(color_fn, mat, wobble=0.02):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=1, location=(0, 0, 0))
    ob = bpy.context.object
    ob.data.materials.append(mat)
    paint(ob, color_fn)
    if wobble > 0:
        tex = bpy.data.textures.new(f"Ondas {ob.name}", "CLOUDS")
        tex.noise_scale = 0.8
        mod = ob.modifiers.new("Ondas", "DISPLACE")
        mod.texture = tex
        mod.strength = wobble
    for f in ob.data.polygons:
        f.use_smooth = True
    return ob


def ring(inner_hex, outer_hex, mat, radius=1.85, width=0.38, tilt_deg=18):
    """Anillo plano y grueso alrededor del planeta, inclinado; pintado del borde interior al exterior."""
    bpy.ops.mesh.primitive_torus_add(major_segments=64, minor_segments=8, major_radius=radius, minor_radius=width)
    ob = bpy.context.object
    ob.scale = (1, 1, 0.14)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(mat)
    paint(ob, lambda co, n: mix(inner_hex, outer_hex, (Vector((co.x, co.y)).length - (radius - width)) / (2 * width)))
    ob.rotation_euler = (math.radians(tilt_deg), 0, 0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    for f in ob.data.polygons:
        f.use_smooth = True
    return ob


def crater_color(co, n):
    """Turquesa más claro arriba; el fondo de los cráteres (más hundido) se oscurece poco a poco."""
    lit = Vector(mix("1fa89c", "7ff0e4", 0.5 + 0.5 * co.z))
    deep = Vector(mix("0f5f59", "1a8a80", 0.5 + 0.5 * co.z))
    return tuple(lit.lerp(deep, max(0.0, min(1.0, (1.0 - co.length) / 0.07))))


# ------------------------------------------------------------------ MODELO
skin = material("Planeta", roughness=0.7)
ring_mat = material("Anillo", roughness=0.5, emission=0.15, emission_hex="ffe66d")

a = planet_ball(banded(BANDS_A), skin)
a = join([a], "Planeta A", "planet_a")
ra = ring("22c7b8", "7ff0e4", ring_mat)
ra = join([ra], "Anillo A", "ring_a")

b = planet_ball(crater_color, skin, wobble=0.0)
cr = bpy.data.textures.new("Crateres", "VORONOI")
cr.noise_scale = 0.35
mod = b.modifiers.new("Crateres", "DISPLACE")
mod.texture = cr
mod.strength = 0.08
mod.mid_level = 0.8
b = join([b], "Planeta B", "planet_b")
paint_again = b.data.color_attributes.get("Pigment")
b.data.color_attributes.remove(paint_again)
paint(b, crater_color)                      # se repinta después del desplazamiento para ver los cráteres

c = planet_ball(banded(BANDS_C), skin)
c = join([c], "Planeta C", "planet_c")
rc = ring("ffe66d", "ff9e7a", ring_mat, radius=1.7, width=0.3, tilt_deg=-24)
rc = join([rc], "Anillo C", "ring_c")

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
    for f in ob.data.polygons:
        f.use_smooth = True

# ------------------------------------------------------------------ EXPORTAR (antes de mover nada)
meta = dict(forward="+Z", note="radio 1; el juego los escala a 14-20 m; ring_a y ring_c giran en su eje")
try:
    parts, tris, size = kit.export_glb(ROOT / "planetas-cosmos-juego.glb", objects=meshes, meta=meta,
                                       ao=None,
                                       json_path=ROOT / "planetas-cosmos.json")
except Exception as e:
    if "Node" in str(e) or "node" in str(e) or "json-to-glb" in str(e):
        print("AVISO: export_glb no pudo invocar Node, usando kit.export_parts:", e, flush=True)
        parts, tris = kit.export_parts(ROOT / "planetas-cosmos.json", objects=meshes, meta=meta)
        size = (ROOT / "planetas-cosmos.json").stat().st_size
    else:
        raise
assert parts == 5, parts
assert tris <= 16000, tris

bpy.ops.object.select_all(action="DESELECT")
for ob in meshes:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "planetas-cosmos.glb"), export_format="GLB",
                          use_selection=True, export_extras=True, export_animations=False)

# ------------------------------------------------------------------ RENDER (cámara y luz del brief)
SLOT = {"planet_a": -3.6, "ring_a": -3.6, "planet_b": 0.0, "planet_c": 3.6, "ring_c": 3.6}
for ob in meshes:
    ob.location.x = SLOT[ob["part"]]

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
cam.data.lens = 24 / (2 * math.tan(math.radians(30)))      # FOV vertical 60°
cam.location = (0, -11, 2.5)
cam.rotation_euler = (Vector((0, 0, 0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.render.filepath = str(ROOT / "render-kit.png")
bpy.ops.render.render(write_still=True)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "planetas-cosmos.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
