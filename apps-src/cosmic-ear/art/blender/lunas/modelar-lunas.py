"""Lunas · Cosmic Ear. Encargo de Gemini; receta en BRIEF-GEMINI.md de esta carpeta."""
import bpy, bmesh, math, random, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

SEED = 81
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


def moon(name, part, subdivisions, radius, tex_type, noise_scale, strength, flat, light_hex, dark_hex, mat):
    """Luna de 1 m de radio aprox., centrada en (0, 0, 0). Casi blanca: el juego la tiñe con el color de su nota."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=radius, location=(0, 0, 0))
    ob = bpy.context.object
    ob.data.materials.append(mat)
    paint(ob, lambda co, n: mix(dark_hex, light_hex, 0.5 + 0.5 * co.z / radius))
    tex = bpy.data.textures.new(f"Ruido {name}", tex_type)
    tex.noise_scale = noise_scale
    mod = ob.modifiers.new("Displace", "DISPLACE")
    mod.texture = tex
    mod.strength = strength
    mod.mid_level = 0.5
    ob = join([ob], name, part)
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    if flat:
        bpy.ops.object.shade_flat()
    else:
        bpy.ops.object.shade_smooth()
    return ob


# ------------------------------------------------------------------ MODELO
rock = material("Luna", roughness=0.85)

# moon_smooth: luna lisa con ondulaciones suaves
moon("Luna lisa", "moon_smooth", 4, 1.0, "CLOUDS", 0.6, 0.08, False, "f4f1ea", "b9b4c8", rock)
# moon_crater: luna con cráteres (textura Voronoi, hundimientos redondos)
moon("Luna de cráteres", "moon_crater", 4, 1.0, "VORONOI", 0.35, 0.16, False, "ece8df", "a8a2b6", rock)
# moon_crystal: luna de hielo facetada (pocas caras, sombreado plano)
moon("Luna de cristal", "moon_crystal", 2, 1.0, "CLOUDS", 0.8, 0.22, True, "ffffff", "c9d3e8", rock)

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
meta = dict(forward="+Z", note="el juego tiñe cada luna con el color de su nota; pivote en el centro")
try:
    parts, tris, size = kit.export_glb(ROOT / "lunas-juego.glb", objects=meshes, meta=meta,
                                       ao=None,
                                       json_path=ROOT / "lunas.json")
except Exception as e:
    if "Node" in str(e) or "node" in str(e) or "json-to-glb" in str(e):
        print("AVISO: export_glb no pudo invocar Node, usando kit.export_parts:", e, flush=True)
        parts, tris = kit.export_parts(ROOT / "lunas.json", objects=meshes, meta=meta)
        size = (ROOT / "lunas.json").stat().st_size
    else:
        raise
assert parts == 3, parts
assert tris <= 6000, tris

bpy.ops.object.select_all(action="DESELECT")
for ob in meshes:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "lunas.glb"), export_format="GLB",
                          use_selection=True, export_extras=True, export_animations=False)

# ------------------------------------------------------------------ RENDER (cámara y luz del brief)
for i, ob in enumerate(meshes):          # en fila, solo para la foto
    ob.location.x = (i - (len(meshes) - 1) / 2) * 3.0
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 40
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = "PNG"
scene.view_settings.look = "AgX - Medium High Contrast"
world = bpy.data.worlds.new("Fondo"); world.use_nodes = True; scene.world = world
world.node_tree.nodes["Background"].inputs[0].default_value = (*kit.lin("1a1036"), 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.5
bpy.ops.object.light_add(type="SUN")
sun = bpy.context.object
sun.data.color = kit.lin("fff1d0"); sun.data.energy = 4.0
sun.rotation_euler = (math.radians(35), math.radians(-20), math.radians(30))
bpy.ops.object.camera_add(); cam = bpy.context.object; scene.camera = cam
cam.data.sensor_fit = "VERTICAL"; cam.data.sensor_height = 24
cam.data.lens = 24 / (2 * math.tan(math.radians(30)))      # FOV vertical 60°
cam.location = (0, -8, 1.5)
cam.rotation_euler = (Vector((0, 0, 0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.render.filepath = str(ROOT / "render-kit.png")
bpy.ops.render.render(write_still=True)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "lunas.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
