"""Cristal de nota · Walking AP Multi, El Cosmos. Encargo de Gemini; receta en BRIEF-GEMINI.md de esta carpeta."""
import bpy, bmesh, math, random, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

SEED = 5
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
def ice_color(co, n):
    """Casi blanco (el juego lo tiñe): caras de arriba más claras, de abajo un poco grises."""
    return mix("c9cfe0", "ffffff", 0.5 + 0.5 * n.z)


def shard(direction, length=2.2, base=0.55, mat=None):
    """Punta de cristal facetada (cono de 5 lados) que sale del centro hacia `direction`."""
    d = Vector(direction).normalized()
    bpy.ops.mesh.primitive_cone_add(vertices=5, radius1=base, radius2=0.0, depth=length, location=(0, 0, 0))
    ob = bpy.context.object
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
    ob.location = d * (0.55 + length / 2)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=False)
    ob.data.materials.append(mat)
    paint(ob, ice_color)
    return ob


def bead(position, radius, mat):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=radius, location=position)
    ob = bpy.context.object
    ob.data.materials.append(mat)
    paint(ob, lambda co, n: "ffffff")
    return ob


def faceted(ob):
    for f in ob.data.polygons:
        f.use_smooth = False


# ------------------------------------------------------------------ MODELO
gem = material("Cristal", roughness=0.15, emission=1.0, emission_hex="ffffff")
halo = material("Aro", roughness=0.3, emission=0.8, emission_hex="ffffff")

# núcleo: icosaedro estirado hacia arriba
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.8, location=(0, 0, 0))
core = bpy.context.object
core.scale = (1, 1, 1.25)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
core.data.materials.append(gem)
paint(core, ice_color)

dirs = [(0, 0, 1), (0, 0, -1), (1, 0, 0.15), (-1, 0, -0.15), (0.15, 1, 0), (-0.15, -1, 0)]
lengths = [2.4, 1.8, 2.0, 2.0, 1.9, 1.9]
spikes = [shard(d, length=l, mat=gem) for d, l in zip(dirs, lengths)]
small = [shard(d, length=1.2, base=0.3, mat=gem) for d in [(1, 1, 0.6), (-1, 1, -0.6), (1, -1, -0.6), (-1, -1, 0.6)]]
crystal = join([core] + spikes + small, "Cristal", "crystal")
faceted(crystal)

bpy.ops.mesh.primitive_torus_add(major_segments=48, minor_segments=6, major_radius=2.6, minor_radius=0.09)
aro = bpy.context.object
aro.data.materials.append(halo)
paint(aro, lambda co, n: "ffffff")
beads = [bead((2.6 * math.cos(a), 2.6 * math.sin(a), 0), 0.22, halo) for a in [k * math.tau / 4 for k in range(4)]]
ring = join([aro] + beads, "Aro", "ring")
ring.rotation_euler = (math.radians(62), 0, 0)
bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)

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
    if ob["part"] == "crystal":
        faceted(ob)

# ------------------------------------------------------------------ EXPORTAR (antes de mover nada)
meta = dict(forward="+Z", note="casi blanco: el juego tiñe crystal y ring con el color de la nota y los escala x2.5; ring gira")
try:
    parts, tris, size = kit.export_glb(ROOT / "cristal-nota-juego.glb", objects=meshes, meta=meta,
                                       ao=None,
                                       json_path=ROOT / "cristal-nota.json")
except Exception as e:
    if "Node" in str(e) or "node" in str(e) or "json-to-glb" in str(e):
        print("AVISO: export_glb no pudo invocar Node, usando kit.export_parts:", e, flush=True)
        parts, tris = kit.export_parts(ROOT / "cristal-nota.json", objects=meshes, meta=meta)
        size = (ROOT / "cristal-nota.json").stat().st_size
    else:
        raise
assert parts == 2, parts
assert tris <= 4000, tris

bpy.ops.object.select_all(action="DESELECT")
for ob in meshes:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "cristal-nota.glb"), export_format="GLB",
                          use_selection=True, export_extras=True, export_animations=False)

# ------------------------------------------------------------------ RENDER (cámara y luz del brief)
# No mover las piezas: el aro rodea al cristal
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
cam.location = (0, -9, 2.5)
cam.rotation_euler = (Vector((0, 0, 0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.render.filepath = str(ROOT / "render-kit.png")
bpy.ops.render.render(write_still=True)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "cristal-nota.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
