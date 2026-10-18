"""Cometa hermano · El Cometa. Modelado por Claude.

El cometa que cruza de frente por la vía paralela (scenery.ts, buildSibling). Mismo lenguaje que
la proa de la carlinga: hielo facetado azul, hondonadas pizarra y escarcha en las crestas, más
cristales cian que brotan del núcleo y brillan solos. La coma y las dos colas siguen en código
(partículas), porque se mueven con la marcha.

Contrato: Three Y arriba, la marcha es -Z (la cola sale por +Z), pivote en el centro del núcleo,
radio ~1.1 u (el juego escala). Partes: `nucleus` (hielo, sin emisión), `crystals` (emisivo).
"""
import bpy, bmesh, math, random, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

SEED = 7
rng = random.Random(SEED)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection, SEED)


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


def mix(a, b, t):
    return tuple(Vector(kit.lin(a)).lerp(Vector(kit.lin(b)), max(0.0, min(1.0, t))))


def paint(ob, fn):
    me = ob.data
    attr = me.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
    for v in me.vertices:
        attr.data[v.index].color = (*fn(v.co, v.normal), 1.0)
    me.color_attributes.active_color = attr


def apply_modifiers(ob):
    bpy.context.view_layer.objects.active = ob
    for mod in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)


def flat(ob):
    for f in ob.data.polygons:
        f.use_smooth = False


ice = material("Hielo", roughness=0.42)
glow = material("Cristal", roughness=0.25, emission=1.6, emission_hex="3fd2ff")

# ------------------------------------------------------------------ NÚCLEO
# Un cuerpo de hielo alargado en la marcha (Blender: Y es la marcha, Z arriba) con rocas pegadas,
# como la proa de la carlinga: se lee como un bloque tallado, no como una bola.
def blob(scale, loc, subdiv, lumps):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv, radius=1, location=(0, 0, 0))
    ob = bpy.context.object
    ob.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for name, kind, size, strength in (("Bultos", "CLOUDS", 0.8, lumps), ("Facetas", "VORONOI", 0.4, lumps * 0.35)):
        tex = bpy.data.textures.new(name, kind)
        tex.noise_scale = size
        if kind == "CLOUDS":
            tex.noise_basis = "VORONOI_F1"   # bultos de bordes marcados, como roca tallada
        mod = ob.modifiers.new(name, "DISPLACE")
        mod.texture = tex
        mod.strength = strength
        mod.mid_level = 0.5
    apply_modifiers(ob)
    for v in ob.data.vertices:
        v.co += Vector(loc)
    return ob


pieces = [blob((1.0, 1.3, 0.85), (0, 0, 0), 3, 0.75)]
for _ in range(5):
    a = rng.uniform(0, math.tau)
    y = rng.uniform(-0.9, 0.6)
    r = rng.uniform(0.3, 0.48)
    loc = (math.cos(a) * 0.82, y, math.sin(a) * 0.7)
    pieces.append(blob((r, r * 1.1, r * 0.9), loc, 2, 0.35))
bpy.ops.object.select_all(action="DESELECT")
for ob in pieces:
    ob.select_set(True)
bpy.context.view_layer.objects.active = pieces[0]
bpy.ops.object.join()
nucleus = bpy.context.view_layer.objects.active
nucleus.name = "Nucleo"

# Recentrar en la caja y normalizar a radio ~1.1.
co = [v.co.copy() for v in nucleus.data.vertices]
lo = Vector((min(c.x for c in co), min(c.y for c in co), min(c.z for c in co)))
hi = Vector((max(c.x for c in co), max(c.y for c in co), max(c.z for c in co)))
center = (lo + hi) / 2
scale = 2.2 / max(hi - lo)
for v in nucleus.data.vertices:
    v.co = (v.co - center) * scale
nucleus.data.update()
mean_r = sum(v.co.length for v in nucleus.data.vertices) / len(nucleus.data.vertices)


def ice_color(c, n):
    # Hondonadas pizarra, crestas de hielo, escarcha en lo que mira arriba y al frente (-Z Three = +Y Blender).
    ridge = (c.length / mean_r - 0.82) / 0.3
    base = mix("16304f", "4f93c0", ridge)
    frost = max(0.0, 0.55 * n.z + 0.45 * n.y)
    rgb = Vector(base).lerp(Vector(kit.lin("bfe6f6")), 0.45 * frost * frost)
    k = 1 + rng.uniform(-0.05, 0.05)
    return tuple(x * k for x in rgb)


nucleus.data.materials.append(ice)
paint(nucleus, ice_color)
flat(nucleus)
nucleus["part"] = "nucleus"

# ------------------------------------------------------------------ CRISTALES
# Prismas hexagonales con punta, clavados a lo largo de la normal en puntos del núcleo; más en la
# cara de atrás, donde el hielo se sublima hacia la cola.
faces = list(nucleus.data.polygons)
crystal_obs = []
picked = []
while len(picked) < 7:
    f = rng.choice(faces)
    if f.normal.y > -0.15 or f.center.y > -0.2:   # sólo atrás, donde el hielo se sublima hacia la cola
        continue
    if any((f.center - p).length < 0.35 for p in picked):
        continue
    picked.append(f.center.copy())
    length = rng.uniform(0.2, 0.42)
    r = rng.uniform(0.06, 0.11)
    profile = [(0.0, -0.25), (r, -0.2), (r * 1.05, length * 0.7), (0.0, length)]
    v, fc = kit.g_lathe(profile, seg=6)
    me = bpy.data.meshes.new("Cristal")
    # kit.g_lathe es Three (Y = eje); aquí se arma en Blender directo con Z = eje y luego se orienta.
    me.from_pydata([Vector((x, z, y)) for x, y, z in v], [], fc)
    me.update()
    ob = bpy.data.objects.new("Cristal", me)
    bpy.context.collection.objects.link(ob)
    n = (f.normal + Vector((rng.uniform(-.25, .25), rng.uniform(-.25, .25), rng.uniform(-.25, .25)))).normalized()
    rot = n.to_track_quat("Z", "Y")
    for vert in me.vertices:
        vert.co = rot @ vert.co + f.center
    me.update()
    crystal_obs.append(ob)

bpy.ops.object.select_all(action="DESELECT")
for ob in crystal_obs:
    ob.select_set(True)
bpy.context.view_layer.objects.active = crystal_obs[0]
bpy.ops.object.join()
crystals = bpy.context.view_layer.objects.active
crystals.name = "Cristales"
bm = bmesh.new(); bm.from_mesh(crystals.data)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(crystals.data); bm.free()
crystals.data.materials.clear()
crystals.data.materials.append(glow)
paint(crystals, lambda c, n: mix("2fb8e6", "a8f0ff", rng.random()))
flat(crystals)
crystals["part"] = "crystals"

meshes = [nucleus, crystals]

# ------------------------------------------------------------------ EXPORTAR
meta = dict(forward="-Z", note="marcha hacia -Z, la cola sale por +Z; pivote en el centro; radio ~1.1")
parts, tris, size = kit.export_glb(ROOT / "cometa-hermano-juego.glb", objects=meshes, meta=meta,
                                   ao={"distance": 0.4, "strength": 0.6},
                                   json_path=ROOT / "cometa-hermano.json")
assert parts == 2, parts
assert tris <= 3000, tris

# ------------------------------------------------------------------ RENDER
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.view_settings.look = "AgX - Medium High Contrast"
world = bpy.data.worlds.new("Fondo"); world.use_nodes = True; scene.world = world
world.node_tree.nodes["Background"].inputs[0].default_value = (*kit.lin("050a24"), 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 1.0
bpy.ops.object.light_add(type="SUN")
sun = bpy.context.object
sun.data.color = kit.lin("fff1d0"); sun.data.energy = 3.5
sun.rotation_euler = (math.radians(50), math.radians(-25), math.radians(140))
bpy.ops.object.light_add(type="POINT", location=(0, -2.5, 0))
rim = bpy.context.object
rim.data.color = kit.lin("7fe6ff"); rim.data.energy = 120
bpy.ops.object.camera_add(); cam = bpy.context.object; scene.camera = cam
cam.data.lens = 50
cam.location = (4.8, -1.2, 2.0)
cam.rotation_euler = (Vector((0, 0, 0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1200, 900
scene.render.filepath = str(ROOT / "render-cometa.png")
bpy.ops.render.render(write_still=True)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "cometa-hermano.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB", flush=True)
