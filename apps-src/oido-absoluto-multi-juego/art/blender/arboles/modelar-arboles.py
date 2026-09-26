"""Árboles · Walking AP Multi. Encargo de Gemini; receta en BRIEF-GEMINI.md de esta carpeta."""
import bpy, bmesh, math, random, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

SEED = 61
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


# ------------------------------------------------------------------ FUNCIONES EXTRA (BRIEF §3.1)

def trunk(height, r_bottom, r_top, bark_mat):
    """Tronco cónico con la base en z = 0, corteza más oscura abajo."""
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=r_bottom, radius2=r_top, depth=height,
                                    location=(0, 0, height / 2))
    ob = bpy.context.object
    ob.data.materials.append(bark_mat)
    paint(ob, lambda co, n: mix("4a3226", "7a5236", (co.z + height / 2) / height))
    return ob


def canopy_blob(center, radius, squash, dark_hex, light_hex, noise_scale, strength, leaf_mat):
    """Bola de follaje: icosfera deformada, más clara arriba, con hojas claras sueltas."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=radius, location=center)
    ob = bpy.context.object
    ob.scale = (1.0, 1.0, squash)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(leaf_mat)

    def color(co, n):
        t = max(0.0, min(1.0, (co.z / (radius * squash) + 1) / 2))
        if rng.random() < 0.1:
            return mix(light_hex, "c8ec9a", 0.4)
        return mix(dark_hex, light_hex, t)

    paint(ob, color)
    tex = bpy.data.textures.new(f"Ruido {ob.name}", "CLOUDS")
    tex.noise_scale = noise_scale
    mod = ob.modifiers.new("Displace", "DISPLACE")
    mod.texture = tex
    mod.strength = strength
    mod.mid_level = 0.5
    return ob


def tree(name, part, trunk_h, blobs, dark_hex, light_hex, bark_mat, leaf_mat):
    """blobs: lista de (x, y, z, radio, aplastado). Todo en una parte, pivote en la base del tronco."""
    pieces = [trunk(trunk_h, 0.3, 0.17, bark_mat)] if trunk_h > 0 else []
    for (x, y, z, r, sq) in blobs:
        pieces.append(canopy_blob((x, y, z), r, sq, dark_hex, light_hex, 0.5, r * 0.28, leaf_mat))
    ob = join(pieces, name, part)
    ob.data.materials.clear()
    ob.data.materials.append(leaf_mat)
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(80))
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    return ob


# ------------------------------------------------------------------ MODELO (BRIEF §3.2)
bark = material("Corteza", roughness=0.95)
leaves = material("Follaje", roughness=0.85)

# tree_round: copa redonda grandota sobre tronco chaparrito (el árbol típico de La Pradera)
tree("Árbol redondo", "tree_round", 2.6,
     [(0, 0, 3.9, 2.3, 0.9), (1.1, 0.3, 4.4, 1.6, 0.85), (-1.0, -0.4, 4.3, 1.7, 0.85)],
     "2e7d32", "7cc05a", bark, leaves)
# tree_tall: copa ovalada alta
tree("Árbol alto", "tree_tall", 3.0,
     [(0, 0, 4.6, 1.7, 1.45), (0.3, 0.2, 6.3, 1.2, 1.2)],
     "1e6b3c", "5fb35a", bark, leaves)
# tree_wide: copa ancha de tres bolas
tree("Árbol ancho", "tree_wide", 2.2,
     [(-1.4, 0, 3.4, 1.8, 0.8), (1.4, 0.2, 3.5, 1.8, 0.8), (0, -0.2, 4.3, 1.9, 0.85)],
     "388e3c", "8fcf5f", bark, leaves)
# bush: arbusto bajo sin tronco
tree("Arbusto", "bush", 0,
     [(0, 0, 0.55, 0.9, 0.75), (0.8, 0.2, 0.45, 0.7, 0.75), (-0.7, -0.2, 0.45, 0.7, 0.75)],
     "2f6b3a", "7cc05a", bark, leaves)

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
meta = dict(forward="+Z", note="kit instanciado; pivote en la base del tronco")
parts, tris, size = kit.export_glb(ROOT / "arboles-juego.glb", objects=meshes, meta=meta,
                                   ao={"distance": 1.2, "strength": 0.7},
                                   json_path=ROOT / "arboles.json")
assert parts == 4, parts
assert tris <= 8000, tris

bpy.ops.object.select_all(action="DESELECT")
for ob in meshes:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "arboles.glb"), export_format="GLB",
                          use_selection=True, export_extras=True, export_animations=False)

# ------------------------------------------------------------------ RENDER (cámara y luz del brief)
for i, ob in enumerate(meshes):          # en fila, solo para la foto
    ob.location.x = (i - (len(meshes) - 1) / 2) * 7.0
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
cam.location = (0, -24, 5)                                 # el brief da la posición
cam.rotation_euler = (Vector((0, 0, 3)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.render.filepath = str(ROOT / "render-kit.png")
bpy.ops.render.render(write_still=True)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "arboles.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
