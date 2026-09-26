"""Portal del Cosmos v1. Ejecutar con bpy-run.ps1; autoría en ejes Three.

Cuatro mallas, sin texturas ni modificadores. Exporta la pose neutra antes
de crear cámaras y luces. No instala dependencias. Semilla determinista.
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

TAU = math.tau
PALETTE = ["3fe0d0", "b8a4ff", "ff8fd8", "ffe66d", "ff7a6b"]
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
collection = bpy.data.collections.new("Portal del Cosmos")
bpy.context.scene.collection.children.link(collection)
kit.setup(collection, 303)


def material(name, emission, hue):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["Roughness"].default_value = 0.36
    bsdf.inputs["Metallic"].default_value = 0.08
    bsdf.inputs["Emission Color"].default_value = (*kit.lin(hue), 1)
    bsdf.inputs["Emission Strength"].default_value = emission
    vc = mat.node_tree.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Pigment"
    mat.node_tree.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


class Mesh:
    """Acumula geometría y pigmento en una sola parte y un solo material."""
    def __init__(self):
        self.vertices, self.faces, self.colors = [], [], []

    def add(self, vertices, faces, color, transform=None):
        offset = len(self.vertices)
        for p in vertices:
            q = transform @ Vector(p) if transform is not None else Vector(p)
            self.vertices.append(tuple(q))
            self.colors.append(tuple(color(q)))
        self.faces.extend(tuple(offset + i for i in f) for f in faces)

    def finish(self, name, part, mat, segment=None):
        ob = kit.make(name, self.vertices, self.faces, mat, part=part,
                      smooth_angle=math.pi, tint=0)
        attr = ob.data.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
        for i, rgb in enumerate(self.colors):
            attr.data[i].color = (*rgb, 1)
        ob.data.color_attributes.active_color = attr
        if segment is not None:
            ob["segment"] = segment
        return ob


def pigment(a, b, phase=0):
    ca, cb = Vector(kit.lin(a)), Vector(kit.lin(b))
    def color(p):
        t = 0.5 + 0.5 * math.sin(3 * math.atan2(p.y, p.x) + phase + 0.3 * p.z)
        return ca.lerp(cb, t) * (0.90 + 0.10 * math.cos(p.z * 1.6))
    return color


def star_geometry():
    # Estrella de cinco puntas con contorno suavizado y dos caras abombadas.
    corners = []
    for i in range(10):
        a = math.pi / 2 + i * TAU / 10
        r = 1.0 if i % 2 == 0 else 0.49
        corners.append((r * math.cos(a), r * math.sin(a)))
    outline = kit.rounded_poly(corners, 0.115, per=2)  # 30 puntos
    n = len(outline)
    v = [(x, y, -0.065) for x, y in outline] + [(x, y, 0.065) for x, y in outline]
    v += [(0, 0, -0.30), (0, 0, 0.30)]
    f = []
    for i in range(n):
        j = (i + 1) % n
        f += [(i, j, n + j, n + i), (2 * n, j, i), (2 * n + 1, n + i, n + j)]
    return v, f


STAR = star_geometry()


def add_star(mesh, pos, size, angle, hue):
    mesh.add(*STAR, pigment(hue, "ffe66d", angle),
             transform=kit.T(pos=pos, rot=(0, 0, angle), scale=(size, size, size)))


objects = []
# La profundidad separa los aros; las estrellas pertenecen al mismo objeto.
specs = [
    (15.15, 0.65, 0.0, 12, 12, "3fe0d0", "b8a4ff", 0.34),
    (13.85, 0.32, 0.48, 10, 8, "ff8fd8", "ff7a6b", 0.28),
    (12.70, 0.42, -0.40, 10, 0, "ffe66d", "3fe0d0", 0.40),
]
for segment, (radius, tube, depth, sides, stars, a, b, emission) in enumerate(specs):
    mesh = Mesh()
    mesh.add(*kit.g_torus(radius, tube, seg=128, tube=sides),
             pigment(a, b, segment), transform=kit.T(pos=(0, 0, depth)))
    for i in range(stars):
        angle = TAU * i / stars + segment * 0.19
        pos = (radius * math.cos(angle), radius * math.sin(angle), depth + tube * 0.8)
        add_star(mesh, pos, 0.97 if segment == 0 else 0.48, angle - math.pi / 2,
                 "ffe66d" if i % 3 else "ff8fd8")
    objects.append(mesh.finish("Aro_%02d" % segment, "ring",
                               material("Esmalte astral %d" % segment, emission, a), segment))


def spiral_point(t, phase):
    angle = phase + 1.13 * TAU * t
    radius = 11.7 - 8.65 * t
    return Vector((radius * math.cos(angle), radius * math.sin(angle), -0.85 - 4.2 * t))


def spiral_geometry(phase):
    # Sección circular y transporte por tangente. Extremos pequeños, cerrados.
    v, f = [], []
    steps, sides = 96, 8
    for i in range(steps + 1):
        t = i / steps
        p = spiral_point(t, phase)
        tangent = (spiral_point(min(1, t + 0.001), phase)
                   - spiral_point(max(0, t - 0.001), phase)).normalized()
        u = tangent.cross(Vector((0, 0, 1))).normalized()
        w = tangent.cross(u).normalized()
        thickness = 0.035 + 0.24 * math.sin(math.pi * t) ** 0.7
        for j in range(sides):
            a = TAU * j / sides
            v.append(tuple(p + thickness * (math.cos(a) * u + math.sin(a) * w)))
    for i in range(steps):
        for j in range(sides):
            k = (j + 1) % sides
            f.append((i * sides + j, i * sides + k, (i + 1) * sides + k, (i + 1) * sides + j))
    f += [tuple(reversed(range(sides))), tuple(steps * sides + j for j in range(sides))]
    return v, f


core = Mesh()
for arm in range(3):
    phase = arm * TAU / 3 + 0.23
    core.add(*spiral_geometry(phase), pigment(PALETTE[arm], "b8a4ff", arm))
    for i in range(7):
        t = 0.06 + i * 0.137
        p = spiral_point(t, phase)
        p.z += 0.16
        add_star(core, p, 0.64 - 0.30 * t, phase + t * TAU,
                 ["ffe66d", "ff8fd8", "3fe0d0"][i % 3])
objects.append(core.finish("Remolino_estelar", "core", material("Luz del umbral", 0.65, "b8a4ff")))

# Verificación real en Blender antes de cualquier exportación.
tris = 0
for ob in objects:
    ob.data.calc_loop_triangles()
    tris += len(ob.data.loop_triangles)
    assert ob.location.length < 1e-8 and tuple(ob.scale) == (1.0, 1.0, 1.0)
assert len(objects) == 4 and tris == 17756, (len(objects), tris)
assert tris <= 20000
points = [Vector((v.co.x, v.co.z, -v.co.y)) for ob in objects for v in ob.data.vertices]
lo = [min(p[i] for p in points) for i in range(3)]
hi = [max(p[i] for p in points) for i in range(3)]
dimensions = [hi[i] - lo[i] for i in range(3)]
meta = dict(forward="+Z", units="meters", origin=[0, 0, 0],
            portalCenter=[0, 0, 0], entryPoint=[0, 0, 2], exitPoint=[0, 0, -6],
            outerRadius=16.1, clearPassageRadius=2.7, dimensionsXYZ=dimensions,
            ringAngularVelocities=[0.12, -0.18, 0.24], openSpeedMultiplier=3.0,
            corePulseAmplitude=0.04, corePulseHz=0.65,
            note="Ejes Three; tres aros y remolino decorativo sin colisión. AO desactivada.")

export_warning = None
try:
    parts, exported_tris, size = kit.export_glb(
        ROOT / "portal-cosmos-juego.glb", objects=objects, meta=meta,
        ao=None, json_path=ROOT / "portal-cosmos.json")
    assert parts == 4 and exported_tris == tris
except RuntimeError as exc:
    # kit usa RuntimeError para Node ausente o convertidor no disponible.
    parts, exported_tris = kit.export_parts(ROOT / "portal-cosmos.json", objects=objects, meta=meta)
    size = 0
    export_warning = str(exc)
    print("ADVERTENCIA: JSON disponible; GLB de juego pendiente:", export_warning, flush=True)

bpy.ops.object.select_all(action="DESELECT")
for ob in objects:
    ob.select_set(True)
bpy.context.view_layer.objects.active = objects[0]
bpy.ops.export_scene.gltf(filepath=str(ROOT / "portal-cosmos.glb"), export_format="GLB",
                          use_selection=True, export_extras=True, export_animations=False)

# Escena de revisión: solamente luces y cámara además de las cuatro mallas.
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 64
scene.cycles.use_denoising = True
scene.cycles.device = "CPU"
scene.render.resolution_x = 1600
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "None"
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
world = bpy.data.worlds.new("Noche azul #0b1438")
world.use_nodes = True
scene.world = world
world.node_tree.nodes["Background"].inputs["Color"].default_value = (*kit.lin("0b1438"), 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0


def area(name, pos, energy, size, hue):
    data = bpy.data.lights.new(name, "AREA")
    ob = bpy.data.objects.new(name, data)
    scene.collection.objects.link(ob)
    ob.location = kit.B(pos)
    ob.rotation_euler = (-ob.location).to_track_quat("-Z", "Y").to_euler()
    data.energy, data.shape, data.size = energy, "DISK", size
    data.color = kit.lin(hue)


area("Luz suave frontal", (8, 18, 25), 6500, 22, "b8a4ff")
area("Reflejo turquesa", (-20, 2, 12), 4200, 18, "3fe0d0")
camera_data = bpy.data.cameras.new("Camara de revisión")
camera = bpy.data.objects.new("Camara de revisión", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera_data.clip_start, camera_data.clip_end = 0.1, 300
camera_data.sensor_fit = "VERTICAL"
camera_data.sensor_height = 24


def shot(filename, eye, target, lens):
    camera.location = kit.B(eye)
    camera.rotation_euler = (kit.B(target) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.lens = lens
    scene.render.filepath = str(ROOT / filename)
    bpy.ops.render.render(write_still=True)


shot("render-juego.png", (10, 4, 59), (0, 0, -0.7), 36)
shot("render-cerca.png", (21, 12, 39), (0, 0, -1.1), 28)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "portal-cosmos.blend"))

# Actualiza únicamente una sección generada; no presenta ejecución como revisión visual.
delivery = ROOT / "ENTREGA.md"
if delivery.exists():
    original = delivery.read_text(encoding="utf-8").split("\n<!-- RESULTADO-EJECUCION -->")[0]
    result = ("\n<!-- RESULTADO-EJECUCION -->\n## Resultado de ejecución automática\n\n"
              f"- Blender: {bpy.app.version_string}; {parts} mallas; {exported_tris} triángulos.\n"
              f"- Dimensiones XYZ: {dimensions[0]:.3f} × {dimensions[1]:.3f} × {dimensions[2]:.3f} m.\n"
              f"- GLB de juego: {size} bytes.\n"
              "- Escena, GLB de visor y dos renders generados. Revisión visual de Astra pendiente.\n")
    if export_warning:
        result += "- Exportación de juego incompleta; se conserva JSON. Motivo:\n\n```text\n" + export_warning + "\n```\n"
    delivery.write_text(original + result, encoding="utf-8")
print("EXPORT", parts, "partes", exported_tris, "triangulos", size // 1024,
      "KB", "DIMENSIONS XYZ", dimensions, flush=True)
