"""manglares · Walking AP Multi, nivel 4 «El Pantano». Modelado por Claude; plan en PLAN-PANTANO-BLENDER.md."""
import bpy, bmesh, math, random, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

SEED = 44
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
def stick(a, b, r_a, r_b, mat, color_fn, sides=7):
    """Tronco o raíz: cono de a (radio r_a) a b (radio r_b), pintado con color_fn."""
    a, b = Vector(a), Vector(b)
    d = b - a
    bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=r_a, radius2=r_b, depth=d.length, location=(0, 0, 0))
    ob = bpy.context.object
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    ob.location = (a + b) / 2
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=False)
    ob.data.materials.append(mat)
    paint(ob, color_fn)
    for f in ob.data.polygons:
        f.use_smooth = True
    return ob


def bark(co, n):
    return mix("4a3b28", "6b5a3e", min(1.0, co.z / 6.0))


def leaves(co, n):
    """Copa: más oscura abajo, más clara arriba."""
    return mix("1e3a1b", "4f7f36", 0.5 + 0.5 * n.z)


def canopy(center, radius, flat, mat):
    """Copa blanda: icosfera aplastada con bultos."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1, location=(0, 0, 0))
    ob = bpy.context.object
    ob.scale = (radius, radius, radius * flat)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    tex = bpy.data.textures.new(f"Copa {ob.name}", "CLOUDS")
    tex.noise_scale = radius * 0.6
    mod = ob.modifiers.new("Bultos", "DISPLACE")
    mod.texture = tex
    mod.strength = radius * 0.25
    apply_modifiers(ob)
    for v in ob.data.vertices:
        v.co += Vector(center)
    ob.data.update()
    ob.data.materials.append(mat)
    paint(ob, leaves)
    for f in ob.data.polygons:
        f.use_smooth = True
    return ob


def moss_strands(center, radius, count, length, mat):
    """Musgo que cuelga del borde de la copa (el toque húmedo)."""
    out = []
    for k in range(count):
        a = k / count * math.tau + rng.uniform(-0.3, 0.3)
        top = Vector(center) + Vector((math.cos(a) * radius * 0.8, math.sin(a) * radius * 0.8, -radius * 0.15))
        ln = length * rng.uniform(0.6, 1.2)
        out.append(stick(top, top + Vector((0, 0, -ln)), 0.08, 0.01, mat, lambda co, n: mix("5c6b45", "8a9a6a", 0.5), sides=4))
    return out


def mangrove(height, trunk_r, roots, crowns, lean=(0.0, 0.0), bark_mat=None, leaf_mat=None, moss=0):
    top = Vector((lean[0], lean[1], height))
    bend = Vector((-lean[1] * 0.5 + 0.35, lean[0] * 0.5, height * 0.5))   # el tronco se curva a media altura
    base = Vector((0, 0, 1.6))
    parts = [stick((0, 0, -0.1), base, trunk_r * 0.9, trunk_r, bark_mat, bark),
             stick(base, bend, trunk_r, trunk_r * 0.8, bark_mat, bark),
             stick(bend, top, trunk_r * 0.8, trunk_r * 0.5, bark_mat, bark)]
    for k in range(roots):                   # raíces aéreas en arco: salen alto y se abren hasta el barro
        a = k / roots * math.tau + 0.4
        out = Vector((math.cos(a), math.sin(a), 0))
        start = base + out * trunk_r * 0.6 + Vector((0, 0, 0.6))
        knee = out * (0.9 + trunk_r * 2.2) + Vector((0, 0, 1.1))
        foot = out * (1.6 + trunk_r * 3.2) + Vector((0, 0, -0.1))
        parts.append(stick(start, knee, trunk_r * 0.42, trunk_r * 0.34, bark_mat, bark, sides=5))
        parts.append(stick(knee, foot, trunk_r * 0.34, trunk_r * 0.26, bark_mat, bark, sides=5))
    for (dx, dy, dz, r, flat) in crowns:
        parts.append(canopy(top + Vector((dx, dy, dz)), r, flat, leaf_mat))
        if moss:
            parts += moss_strands(top + Vector((dx, dy, dz)), r, moss, r * 1.3, bark_mat)
    return parts


# ------------------------------------------------------------------ MODELO
wood = material("Corteza", roughness=0.9)
green = material("Hojas", roughness=0.85)

a = join(mangrove(5.5, 0.36, 5, [(0, 0, 0.6, 2.8, 0.6), (1.4, 0.6, 0.0, 2.0, 0.6), (-1.2, -0.5, -0.2, 1.8, 0.6)],
                  bark_mat=wood, leaf_mat=green, moss=7), "Manglar A", "mangrove_a")
b = join(mangrove(8.5, 0.34, 5, [(0, 0, 0.5, 2.6, 0.7), (-1.1, 0.4, -1.4, 1.9, 0.6), (1.0, -0.6, -0.8, 1.7, 0.6)],
                  lean=(0.9, 0.3), bark_mat=wood, leaf_mat=green, moss=7), "Manglar B", "mangrove_b")
c = join(mangrove(6.0, 0.46, 6, [(0, 0, 0.4, 3.4, 0.5), (2.2, 0.8, -0.3, 2.3, 0.5), (-2.0, -1.0, -0.2, 2.2, 0.5)],
                  lean=(-0.8, 0.0), bark_mat=wood, leaf_mat=green, moss=8), "Manglar C", "mangrove_c")
w = join(mangrove(10.0, 0.7, 7, [(0, 0, 0.6, 5.0, 0.55), (3.4, 1.2, -0.8, 3.6, 0.55), (-3.2, -1.4, -0.5, 3.8, 0.55),
                                 (0.4, -3.2, -1.4, 3.2, 0.6), (-0.6, 3.0, -1.0, 3.0, 0.6)], bark_mat=wood, leaf_mat=green, moss=10),
         "Manglar de borde", "mangrove_wall")
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
meta = dict(forward="+Z", note="kit instanciado; pivote en la base del tronco (z=0); las raíces se hunden 0.1 m")
parts, tris, size = kit.export_glb(ROOT / "manglares-juego.glb", objects=meshes, meta=meta,
                                   ao={"distance": 1.5, "strength": 0.7}, json_path=ROOT / "manglares.json")
assert parts == 4, parts
assert tris <= 30000, tris

# ------------------------------------------------------------------ RENDER
for i, ob in enumerate(meshes):
    ob.location.x = (i - (len(meshes) - 1) / 2) * 14
bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, 0))
gm = bpy.data.materials.new("Barro"); gm.use_nodes = True
gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*kit.lin("4a4a2c"), 1)
bpy.context.object.data.materials.append(gm)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 40
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = "PNG"
scene.view_settings.look = "AgX - Medium High Contrast"
world = bpy.data.worlds.new("Fondo"); world.use_nodes = True; scene.world = world
world.node_tree.nodes["Background"].inputs[0].default_value = (*kit.lin("2b4a44"), 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.8
bpy.ops.object.light_add(type="SUN")
sun = bpy.context.object
sun.data.color = kit.lin("dff5e8"); sun.data.energy = 4.0
sun.rotation_euler = (math.radians(35), math.radians(-20), math.radians(30))
bpy.ops.object.camera_add(); cam = bpy.context.object; scene.camera = cam
cam.data.sensor_fit = "VERTICAL"; cam.data.sensor_height = 24
cam.data.lens = 24 / (2 * math.tan(math.radians(30)))
cam.location = (0, -48, 10)
cam.rotation_euler = (Vector((0, 0, 5)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.render.filepath = str(ROOT / "render-kit.png")
bpy.ops.render.render(write_still=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "manglares.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
