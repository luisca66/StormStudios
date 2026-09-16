"""Kit de arrecife de El Oceano: corales, rocas, alga y anemona en un solo JSON.

Cada variante es una `part` independiente que el juego instancia decenas de veces
(InstancedMesh), asi que el presupuesto es por variante, no por ejemplar.
Autorado en espacio Three (Y arriba); kit.py convierte a Blender al crear la malla.
"""
import bpy, bmesh, math, random, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection, 41)
rng = random.Random(41)


def material(name, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["Metallic"].default_value = 0
    bsdf.inputs["Roughness"].default_value = roughness
    vc = mat.node_tree.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Pigment"
    mat.node_tree.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


coral_mat = material("Coral", 0.72)
rock_mat = material("Roca", 0.95)
plant_mat = material("Planta", 0.66)


class Geo:
    def __init__(self):
        self.v, self.f, self.c = [], [], []

    def add(self, verts, faces, colors):
        off = len(self.v)
        self.v.extend(verts)
        self.f.extend(tuple(off + i for i in face) for face in faces)
        self.c.extend([kit.lin(colors)] * len(verts) if isinstance(colors, str) else colors)

    def blob(self, pos, scale, color, warp, seg=20, rings=11):
        """Esfera deformada por ondas: sirve de roca, cerebro de coral o base carnosa."""
        verts, colors = [], []
        base = Vector(kit.lin(color))
        for i in range(rings + 1):
            t = math.pi * i / rings
            for j in range(seg):
                a = math.tau * j / seg
                n = Vector((math.sin(t) * math.cos(a), math.cos(t), math.sin(t) * math.sin(a)))
                r = 1 + warp(n, i / rings, j / seg)
                verts.append((pos[0] + scale[0] * n.x * r,
                              pos[1] + scale[1] * n.y * r,
                              pos[2] + scale[2] * n.z * r))
                shade = 0.82 + 0.18 * max(0.0, n.y) + 0.06 * math.sin(a * 5)
                colors.append(tuple(min(1.0, c * shade) for c in base))
        faces = []
        for i in range(rings):
            for j in range(seg):
                a = i * seg + j
                b = i * seg + (j + 1) % seg
                faces.append((a, a + seg, b + seg, b))
        self.add(verts, faces, colors)

    def branch(self, start, direction, length, radius, color, depth, sides=7):
        """Rama conica que se bifurca: cuerno de ciervo del coral ramificado."""
        steps = 5
        path, radii = [], []
        p = Vector(start)
        d = Vector(direction).normalized()
        for k in range(steps + 1):
            path.append(tuple(p))
            radii.append(radius * (1 - 0.78 * k / steps))
            p = p + d * (length / steps)
            d = (d + Vector((rng.uniform(-.22, .22), rng.uniform(-.05, .16), rng.uniform(-.22, .22)))).normalized()
        self.tube(path, radii, color, sides)
        if depth > 0:
            for _ in range(rng.randint(2, 3)):
                t = rng.uniform(0.45, 0.85)
                idx = min(steps - 1, int(t * steps))
                side = (d + Vector((rng.uniform(-1, 1), rng.uniform(0.2, 0.9), rng.uniform(-1, 1)))).normalized()
                self.branch(path[idx], side, length * rng.uniform(0.45, 0.68),
                            radii[idx] * 0.8, color, depth - 1, sides)

    def tube(self, path, radii, color, sides=8):
        verts, faces = [], []
        for i, p in enumerate(path):
            tangent = (Vector(path[min(i + 1, len(path) - 1)]) - Vector(path[max(i - 1, 0)])).normalized()
            ref = Vector((0, 1, 0)) if abs(tangent.y) < .88 else Vector((1, 0, 0))
            u = tangent.cross(ref).normalized()
            w = tangent.cross(u).normalized()
            for j in range(sides):
                a = math.tau * j / sides
                verts.append(tuple(Vector(p) + radii[i] * (math.cos(a) * u + math.sin(a) * w)))
        for i in range(len(path) - 1):
            for j in range(sides):
                a = i * sides + j
                b = i * sides + (j + 1) % sides
                faces.append((a, b, b + sides, a + sides))
        faces += [tuple(reversed(range(sides))), tuple((len(path) - 1) * sides + j for j in range(sides))]
        self.add(verts, faces, color)

    def sheet(self, height, width, thick, color_root, color_tip, bend=0.0, twist=1.0,
              ripple=0.0, segs=16, cols=7, profile="leaf"):
        """Lamina vertical con seccion CERRADA (contorno superior + inferior): hoja de
        alga o abanico de mar. Al cerrar la seccion, las normales salen bien y no se ve
        el interior oscuro."""
        root, tip = Vector(kit.lin(color_root)), Vector(kit.lin(color_tip))
        ring_size = cols * 2
        base_index = len(self.v)
        verts, colors = [], []
        for i in range(segs + 1):
            t = i / segs
            y = height * t
            lean = math.sin(t * math.pi * twist) * bend
            # hoja: se ensancha y vuelve a cerrar; abanico: se abre hacia arriba
            w = (width * (0.20 + 0.80 * t ** 0.55) if profile == "fan"
                 else width * (0.35 + 0.65 * math.sin(math.pi * min(1.0, t * 1.12))))
            th = thick * (1 - 0.72 * t)
            col = tuple(root.lerp(tip, t)[k] for k in range(3))
            ring = []
            for j in range(cols):
                u = j / (cols - 1) - 0.5
                x = u * 2 * w + lean
                z = math.sin(u * math.pi * 2) * ripple * w
                ring.append((x, y, z))
            # contorno cerrado: cara frontal de izquierda a derecha, trasera de vuelta
            for x, yy, z in ring:
                verts.append((x, yy, z + th)); colors.append(col)
            for x, yy, z in reversed(ring):
                verts.append((x, yy, z - th)); colors.append(col)
        faces = []
        for i in range(segs):
            for j in range(ring_size):
                a = base_index + i * ring_size + j
                b = base_index + i * ring_size + (j + 1) % ring_size
                faces.append((a, b, b + ring_size, a + ring_size))
        faces.append(tuple(reversed(range(base_index, base_index + ring_size))))
        faces.append(tuple(range(base_index + segs * ring_size, base_index + (segs + 1) * ring_size)))
        self.v.extend(verts)
        self.c.extend(colors)
        self.f.extend(faces)

    def object(self, name, part):
        mat = coral_mat if part.startswith("coral") or part == "anemone" else (
            rock_mat if part.startswith("rock") else plant_mat)
        ob = kit.make(name, self.v, self.f, mat, part=part, tint=0, smooth_angle=math.pi)
        attr = ob.data.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
        for i, col in enumerate(self.c):
            attr.data[i].color = (*col, 1)
        return ob


def noise_warp(freq, amp, extra=0.0):
    def f(n, u, v):
        return (math.sin(n.x * freq + n.y * 2.1) * math.cos(n.z * freq * 0.8 + n.y * 1.7) * amp
                + math.sin((n.x + n.z) * freq * 2.3) * extra)
    return f


# ---------------------------------------------------------------- corales
# 1. Coral ramificado (cuerno de ciervo)
g = Geo()
for i in range(3):
    a = math.tau * i / 3 + rng.uniform(-.3, .3)
    g.branch((math.cos(a) * .22, 0, math.sin(a) * .22),
             (math.cos(a) * .35, 1, math.sin(a) * .35), 1.5, .16, "ff6f61", 2)
g.blob((0, .05, 0), (.42, .22, .42), "e0564c", noise_warp(4, .10))
coral_branch = g.object("Coral ramificado", "coral_branch")

# 2. Coral cerebro: surcos profundos y regulares
g = Geo()
g.blob((0, .55, 0), (.95, .78, .95), "c86bfa",
       lambda n, u, v: 0.14 * math.sin(n.x * 11 + n.y * 5) * math.cos(n.z * 11 - n.y * 3), 34, 20)
coral_brain = g.object("Coral cerebro", "coral_brain")

# 3. Coral copa (tipo Turbinaria): campana abierta hacia arriba
g = Geo()
# Naranja coral saturado: el melocoton original (#ff8c5a -> #ffd9a8) bajo el agua turquesa se
# veia beige, del mismo tono que la arena, y el coral desaparecia.
g.sheet(2.1, 1.45, .04, "e8472a", "ffb347", bend=.10, twist=.7, ripple=.06, segs=14, cols=11, profile="fan")
g.tube([(0, 0, 0), (0, .35, .02)], [.11, .07], "b8361f", 8)
coral_cup = g.object("Coral copa", "coral_cup")

# 4. Coral mesa
g = Geo()
g.tube([(0, 0, 0), (0, .38, 0), (0, .62, 0)], [.24, .17, .30], "ffb347", 10)
g.blob((0, .78, 0), (1.05, .17, 1.05), "ffc266", noise_warp(5, .07, .03), 26, 9)
coral_table = g.object("Coral mesa", "coral_table")

# ---------------------------------------------------------------- rocas
rock_specs = [("rock_a", (1.5, 1.05, 1.35), 3.1, .16), ("rock_b", (2.3, 1.2, 1.9), 2.4, .2),
              ("rock_c", (0.95, 0.8, 1.1), 4.2, .13)]
rocks = []
for part, scale, freq, amp in rock_specs:
    g = Geo()
    g.blob((0, scale[1] * .55, 0), scale, "8c8f7e", noise_warp(freq, amp, amp * .5), 22, 13)
    rocks.append(g.object(f"Roca {part[-1].upper()}", part))

# ---------------------------------------------------------------- plantas
# Alga: hoja alta con pivote en la base (el juego la mece rotandola)
g = Geo()
g.sheet(4.6, .42, .05, "1f7a4a", "7fd98f", bend=.55, twist=1.6, ripple=.10, segs=20, cols=5)
kelp = g.object("Alga", "kelp")

# Anemona: disco carnoso con corona de tentaculos
g = Geo()
g.blob((0, .18, 0), (.55, .30, .55), "8f7bd6", noise_warp(6, .09))
for i in range(26):
    a = math.tau * i / 26
    r = .18 + rng.uniform(0, .28)
    tip = Vector((math.cos(a) * (r + .35), .55 + rng.uniform(.15, .55), math.sin(a) * (r + .35)))
    base = Vector((math.cos(a) * r, .28, math.sin(a) * r))
    mid = base.lerp(tip, .55) + Vector((0, .08, 0))
    g.tube([tuple(base), tuple(mid), tuple(tip)], [.055, .040, .012], "3fd2c7", 5)
anemone = g.object("Anemona", "anemone")

meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
bpy.context.view_layer.update()
for ob in meshes:
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-6)
    bad = [f for f in bm.faces if f.calc_area() < 1e-12]
    if bad:
        bmesh.ops.delete(bm, geom=bad, context="FACES")
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(ob.data); bm.free(); ob.data.update()

meta = dict(forward="+Z", note="cada part se instancia; el pivote de todas es su base (y=0)")
parts, tris = kit.export_parts(ROOT / "arrecife.json", meta=meta)
per_part = {ob["part"]: len(ob.data.polygons) for ob in meshes}
assert parts == 9, parts
assert tris <= 14000, tris

bpy.ops.object.select_all(action="DESELECT")
for ob in meshes:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "arrecife.glb"), export_format="GLB",
                          use_selection=True, export_extras=True, export_animations=False)

# Lamina de contacto: las nueve variantes en fila, como se veran en el juego.
for i, ob in enumerate(meshes):
    ob.location = kit.B(((i - len(meshes) / 2) * 3.2, 0, 0))

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 40
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = "PNG"
scene.view_settings.look = "AgX - Medium High Contrast"
world = bpy.data.worlds.new("Arrecife"); world.use_nodes = True; scene.world = world
world.node_tree.nodes["Background"].inputs[0].default_value = (*kit.lin("2c86a3"), 1)
world.node_tree.nodes["Background"].inputs[1].default_value = .35
bpy.ops.object.light_add(type="SUN")
sun = bpy.context.object
sun.data.color = kit.lin("fff3d6"); sun.data.energy = 4.5
sun.rotation_euler = (math.radians(18), math.radians(-16), math.radians(26))
bpy.ops.object.camera_add(); cam = bpy.context.object; scene.camera = cam
cam.data.sensor_fit = "VERTICAL"; cam.data.sensor_height = 24
cam.data.lens = 24 / (2 * math.tan(math.radians(30)))
cam.location = kit.B((0, 4.5, 20))
cam.rotation_euler = (kit.B((0, 1.6, 0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1800, 700
scene.render.filepath = str(ROOT / "render-kit.png")
bpy.ops.render.render(write_still=True)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "arrecife.blend"))
print("EXPORT", parts, "partes", tris, "triangulos", per_part, flush=True)
