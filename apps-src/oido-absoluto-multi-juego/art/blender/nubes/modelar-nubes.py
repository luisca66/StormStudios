"""Kit de nubes de Las Nubes (nivel 5): cúmulos esponjosos en un solo JSON.

Cada variante es una `part` que el juego instancia decenas de veces (InstancedMesh) y tiñe
por ejemplar con colores pastel. Las formas salen de metaballs: lóbulos que se funden solos,
con la base aplanada como un cúmulo de verdad. El pigmento de vértice guarda la luz propia de
la nube (cima blanca, panza lavanda), así se lee esponjosa con cualquier luz del juego.

Autorado en espacio Three (Y arriba); pivote de todas las variantes: centro de la base (y = 0).
Ejecutar:
  powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 apps-src\\oido-absoluto-multi-juego\\art\\blender\\nubes\\modelar-nubes.py
"""
import bpy, bmesh, math, random, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit
from kit import B, lin

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
COL = bpy.data.collections.new("Nubes"); scene.collection.children.link(COL)
kit.setup(COL, 5)
rng = random.Random(20260916)

mat = bpy.data.materials.new("Nube")
mat.use_nodes = True
bsdf = mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
bsdf.inputs["Roughness"].default_value = 1.0
bsdf.inputs["Metallic"].default_value = 0.0
vc = mat.node_tree.nodes.new("ShaderNodeVertexColor"); vc.layer_name = "Pigment"
mat.node_tree.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])

TOP = Vector(lin("#ffffff"))
BELLY = Vector(lin("#d8d2ee"))   # lavanda suave en la panza
SHADE = Vector(lin("#ece8f8"))


def cloud(name, part, balls, base_y, max_tris):
    """balls = [(x, y, z, radio)] en espacio Three. Devuelve el objeto malla final."""
    mb = bpy.data.metaballs.new(name + " (metaball)")
    mb.resolution = mb.render_resolution = 0.32
    mb.threshold = 0.5
    for x, y, z, r in balls:
        el = mb.elements.new()
        el.co = B((x, y, z))
        el.radius = r * 1.4   # el metaball dibuja la superficie dentro del radio
        el.stiffness = 3.0     # lóbulos marcados: se tocan sin fundirse en una sola gota
    mob = bpy.data.objects.new(name + " (metaball)", mb)
    COL.objects.link(mob)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(mob.evaluated_get(dg))
    bpy.data.objects.remove(mob)
    me.name = name

    # Base aplanada: lo que baja de base_y se aplasta contra ella (Three Y = Blender Z).
    bm = bmesh.new(); bm.from_mesh(me)
    lo = min(v.co.z for v in bm.verts)
    for v in bm.verts:
        if v.co.z < base_y:
            v.co.z = base_y + (v.co.z - base_y) * 0.22
    lo = min(v.co.z for v in bm.verts)
    for v in bm.verts:
        v.co.z -= lo   # la base queda en y = 0
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-4)
    bm.to_mesh(me); bm.free()

    ob = bpy.data.objects.new(name, me)
    COL.objects.link(ob)
    ob["part"] = part
    me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = True

    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    if tris > max_tris:
        dec = ob.modifiers.new("Aligerar", "DECIMATE")
        dec.ratio = max_tris / tris
        bpy.context.view_layer.objects.active = ob
        ob.select_set(True)
        bpy.ops.object.modifier_apply(modifier=dec.name)
        ob.select_set(False)
    for p in me.polygons:
        p.use_smooth = True

    # Luz propia en el pigmento: cima blanca, panza lavanda, sombra suave en los pliegues.
    height = max(v.co.z for v in me.vertices) or 1
    attr = me.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
    for v, c in zip(me.vertices, attr.data):
        t = min(1.0, max(0.0, v.co.z / height))
        up = max(0.0, v.normal.z)
        col = BELLY.lerp(TOP, min(1.0, 0.25 + 0.9 * t ** 0.7))
        col = SHADE.lerp(col, 0.55 + 0.45 * up) if v.normal.z < 0.2 else col
        c.color = (*col, 1)
    me.color_attributes.active_color = attr
    return ob


def lobes(width, height, depth, count, seed, core=0.36, lobe=(0.20, 0.30)):
    """Núcleo bajo y ancho + racimo de lóbulos sobre su cáscara, más grandes arriba:
    la silueta de coliflor de un cúmulo."""
    r = random.Random(seed)
    balls = []
    base = max(3, count // 3)
    for i in range(base):
        t = (i + 0.5) / base * 2 - 1
        balls.append((t * width * 0.36, height * 0.22, r.uniform(-depth * .12, depth * .12), height * core))
    for i in range(count - base):
        # Punto sobre la cáscara de medio elipsoide (solo hemisferio superior).
        a = r.uniform(0, math.tau)
        e = r.uniform(0.15, 1.35)
        x = math.cos(a) * math.cos(e) * width * 0.40
        z = math.sin(a) * math.cos(e) * depth * 0.38
        y = height * (0.22 + 0.62 * math.sin(e))
        rad = height * r.uniform(*lobe) * (0.8 + 0.5 * math.sin(e))
        balls.append((x, y, z, rad))
    return balls


objects = [
    cloud("Nube chica", "puff_small", lobes(7, 4.2, 5, 14, 1), 0.9, 1400),
    cloud("Nube mediana", "puff_medium", lobes(12, 6.8, 8, 22, 2), 1.4, 2200),
    cloud("Nube grande", "puff_large", lobes(18, 10.5, 12, 26, 3, core=0.26, lobe=(0.17, 0.27)), 2.0, 3200),
    cloud("Nube alargada", "flat_long", [(x, 1.3 + .35 * math.sin(x * .7), rng.uniform(-1.5, 1.5), rng.uniform(1.7, 2.4))
                                          for x in [-11 + 22 * i / 11 for i in range(12)]] +
          [(rng.uniform(-6, 6), 2.6, rng.uniform(-1, 1), rng.uniform(1.6, 2.1)) for _ in range(4)], 0.9, 2200),
]

meta = dict(note="kit instanciado; pivote en el centro de la base (y=0); el juego tiñe por ejemplar")
parts, tris = kit.export_parts(ROOT / "nubes.json", objects=objects, meta=meta)
per_part = {}
for ob in objects:
    ob.data.calc_loop_triangles()
    per_part[ob["part"]] = len(ob.data.loop_triangles)
    dims = [max(v.co[i] for v in ob.data.vertices) - min(v.co[i] for v in ob.data.vertices) for i in range(3)]
    print("PART", ob["part"], per_part[ob["part"]], "tri", "dims(X,Zdepth,Yup)", [round(d, 2) for d in dims], flush=True)
assert parts == 4 and tris <= 10000, (parts, tris)

bpy.ops.object.select_all(action="DESELECT")
for ob in objects:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "nubes.glb"), export_format="GLB",
                          use_selection=True, export_extras=True, export_animations=False)

# Render de revisión: las cuatro variantes en fila sobre el cielo pastel del nivel.
xs = [-33, -18, 2, 30]
for ob, x in zip(objects, xs):
    ob.location = B((x, 0, 0))
world = bpy.data.worlds.new("Cielo"); world.use_nodes = True; scene.world = world
world.node_tree.nodes["Background"].inputs[0].default_value = (*lin("#b8d9f5"), 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.9
sun_data = bpy.data.lights.new("Sol", "SUN"); sun_data.energy = 3.2; sun_data.color = lin("#fff0e0")
sun = bpy.data.objects.new("Sol", sun_data); COL.objects.link(sun)
sun.rotation_euler = (math.radians(40), math.radians(-20), math.radians(30))
cam_data = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_data); COL.objects.link(cam)
scene.camera = cam
cam_data.sensor_fit = "VERTICAL"; cam_data.angle = math.radians(40)
cam.location = B((0, 10, 62))
cam.rotation_euler = (B((0, 4, 0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.engine = "CYCLES"; scene.cycles.samples = 32; scene.cycles.use_denoising = True
scene.view_settings.view_transform = "AgX"
scene.render.resolution_x, scene.render.resolution_y = 1800, 700
scene.render.filepath = str(ROOT / "render-kit.png")
bpy.ops.render.render(write_still=True)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "nubes.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", per_part, flush=True)
