"""Arañita del pantano: jade, hojitas y ojos de luciérnaga.

Ejecutar con bpy-run.ps1 en la PC de Luis. Autoría en metros, Y arriba,
frente -Z; kit convierte a Blender. No requiere texturas ni recursos externos.
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit


def color(h):
    return Vector(kit.lin(h))


def blend(a, b, t):
    return color(a).lerp(color(b), max(0.0, min(1.0, t)))


def material(name, roughness, emission=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bs = mat.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bs.inputs["Roughness"].default_value = roughness
    bs.inputs["Emission Strength"].default_value = emission
    vc = mat.node_tree.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Pigment"
    mat.node_tree.links.new(vc.outputs["Color"], bs.inputs["Base Color"])
    if emission:
        # El kit conserva una emisión uniforme por parte: misma emisión cálida
        # en visor y juego, sin depender de que el exportador lea este enlace.
        bs.inputs["Emission Color"].default_value = (*kit.lin("ffe4a3"), 1)
    return mat


class Shape:
    """Acumula islas en una sola malla y un único material por parte."""
    def __init__(self):
        self.vertices, self.faces, self.colors = [], [], []

    def add(self, vertices, faces, pigment):
        offset = len(self.vertices)
        self.vertices.extend(vertices)
        self.faces.extend(tuple(offset + i for i in face) for face in faces)
        self.colors.extend(tuple(pigment(Vector(p))) for p in vertices)

    def oval(self, center, radii, pigment, segments=16, rings=8, organic=0):
        c = Vector(center)
        vertices = [tuple(c + Vector((0, radii[1], 0)))]
        for j in range(1, rings):
            phi = math.pi * j / rings
            for i in range(segments):
                a = math.tau * i / segments
                # Una irregularidad muy suave da volumen orgánico sin pelo fino.
                k = 1 + organic * math.sin(3 * a + 0.4) * math.sin(phi) ** 2
                vertices.append(tuple(c + Vector((
                    radii[0] * math.sin(phi) * math.cos(a) * k,
                    radii[1] * math.cos(phi),
                    radii[2] * math.sin(phi) * math.sin(a) * k))))
        bottom = len(vertices)
        vertices.append(tuple(c - Vector((0, radii[1], 0))))
        faces = []
        for i in range(segments):
            n = (i + 1) % segments
            faces.append((0, 1 + i, 1 + n))
            for j in range(rings - 2):
                a, b = 1 + j * segments + i, 1 + j * segments + n
                faces.append((a, a + segments, b + segments, b))
            last = 1 + (rings - 2) * segments
            faces.append((bottom, last + n, last + i))
        self.add(vertices, faces, pigment if callable(pigment) else lambda p: color(pigment))

    def tube(self, points, radii, pigment, sides=8, per=4):
        path = kit.catmull(points, per)
        vertices, faces = [], []
        normal = Vector((0, 1, 0))
        for i, p in enumerate(path):
            tangent = (path[min(i + 1, len(path) - 1)] - path[max(0, i - 1)]).normalized()
            normal = (normal - tangent * normal.dot(tangent)).normalized()
            binormal = tangent.cross(normal).normalized()
            u = i / per
            j = min(int(u), len(radii) - 2)
            radius = radii[j] + (radii[j + 1] - radii[j]) * (u - j)
            for s in range(sides):
                a = math.tau * s / sides
                vertices.append(tuple(p + radius * (normal * math.cos(a) + binormal * math.sin(a))))
        for i in range(len(path) - 1):
            for s in range(sides):
                n = (s + 1) % sides
                faces.append((i*sides+s, i*sides+n, (i+1)*sides+n, (i+1)*sides+s))
        faces += [tuple(reversed(range(sides))), tuple((len(path)-1)*sides+s for s in range(sides))]
        self.add(vertices, faces, pigment if callable(pigment) else lambda p: color(pigment))

    def build(self, name, part, pivot, mat, segment=None):
        ob = kit.make(name, self.vertices, self.faces, mat, part=part, tint=0, smooth_angle=math.pi)
        attr = ob.data.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
        for dst, src in zip(attr.data, self.colors):
            dst.color = (*src, 1)
        ob.data.color_attributes.active_color = attr
        if segment is not None:
            ob["segment"] = segment
        bpy.ops.object.select_all(action="DESELECT")
        ob.select_set(True)
        bpy.context.view_layer.objects.active = ob
        bpy.context.scene.cursor.location = kit.B(pivot)
        bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
        return ob


def back_pigment(p):
    c = blend("38756e", "9bc9a3", (p.y - 0.22) / 0.45)
    # Nervio central y tres parejas de hojas pintadas sobre el propio abdomen.
    # No hay calcomanías ni superficies superpuestas que produzcan z-fighting.
    if p.y > 0.48:
        vein = abs(p.x) < 0.014 and 0.03 < p.z < 0.48
        leaf = False
        for z in (0.11, 0.24, 0.37):
            for side in (-1, 1):
                dx, dz = side * p.x - 0.095, p.z - z
                leaf |= ((dx + dz * 0.65) / 0.084) ** 2 + (dz / 0.052) ** 2 < 1
        if vein or leaf:
            c = blend("dce5ac", "f5e2a2", (p.z - 0.05) / 0.45)
    return c


def face_pigment(p):
    c = blend("539b91", "afd9ba", (p.y - 0.22) / 0.43)
    if p.y < 0.34 and p.z < -0.40:
        c = blend("c5dcc0", "e3e8c9", (0.34 - p.y) / 0.12)
    return c


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection, 41)
skin = material("Jade y pigmentos de cuento", 0.64)
eye_mat = material("Ojos de luciérnaga", 0.24, 0.65)

body = Shape()
body.oval((0, 0.405, 0.22), (0.325, 0.275, 0.36), back_pigment, 32, 16, 0.025)
body.oval((0, 0.39, -0.27), (0.305, 0.255, 0.29), face_pigment, 28, 14, 0.012)
# Dos palpos redonditos, recogidos como pequeñas manoplas, nunca colmillos.
for side in (-1, 1):
    body.oval((side*0.09, 0.245, -0.505), (0.071, 0.064, 0.074), "cce1bf", 12, 8)
    body.oval((side*0.228, 0.355, -0.468), (0.063, 0.032, 0.027), "dc9f9c", 12, 6)
    # Pupilas y reflejos en body: conservan oscuridad y contraste aun con emisión.
    body.oval((side*0.135, 0.48, -0.647), (0.069, 0.090, 0.028), "162f35", 20, 10)
    body.oval((side*0.135-0.023, 0.520, -0.669), (0.025, 0.029, 0.011), "fff8dc", 12, 6)
    body.oval((side*0.135+0.025, 0.452, -0.671), (0.010, 0.012, 0.006), "e0f4e7", 12, 6)
# Sonrisa diminuta y limpia. Queda entre los ojos y los palpos.
body.tube([(-0.059,0.332,-0.554), (-0.032,0.315,-0.561), (0,0.310,-0.565),
           (0.032,0.315,-0.561), (0.059,0.332,-0.554)],
          [0.006]*5, "305d59", sides=6, per=3)
# Tres mechoncitos blandos, unidos visualmente al cráneo: silueta de peluche.
for x, y in ((-0.055,0.621), (0,0.639), (0.055,0.623)):
    body.oval((x,y,-0.226), (0.043,0.039,0.057), "acd4af", 10, 5)
body_ob = body.build("Cuerpo · guardiana de hojitas", "body", (0,0.38,0), skin)

eyes = Shape()
for side in (-1, 1):
    eyes.oval((side*0.135,0.475,-0.535), (0.132,0.151,0.125),
              lambda p: blend("e9ad50", "fff0bc", (p.y-0.35)/0.27), 24, 12)
eyes_ob = eyes.build("Ojos · luz de miel", "eyes", (0,0.38,0), eye_mat)

meshes = [body_ob, eyes_ob]
for i, z in enumerate((-0.22,-0.07,0.07,0.20)):
    # Abanico simétrico: no cruzar las patas ni ocultar la carita.
    spread_z = (-0.61,-0.27,0.25,0.57)[i]
    reach = (0.84,1.0,1.0,0.86)[i]
    for side in (-1, 1):
        pivot = (side*0.27,0.34,z)
        shape = Shape()
        shape.tube([pivot, (side*0.43,0.415,z+(spread_z-z)*0.22),
                    (side*reach*0.77,0.44,spread_z*0.80),
                    (side*reach*0.95,0.18,spread_z*0.98),
                    (side*reach,0.022,spread_z)],
                   [0.053,0.054,0.046,0.030,0.018],
                   lambda p: blend("447f78","b4cda0", max((p.y-0.18)/0.45, (0.12-p.y)/0.12)),
                   sides=8, per=4)
        seg = 2*i + (1 if side > 0 else 0)
        meshes.append(shape.build(f"Pata {seg}", "leg", pivot, skin, seg))

# Contrato y presupuesto: se verifican ANTES de AO, exportación y escenografía.
bpy.context.view_layer.update()
triangles = 0
for ob in meshes:
    ob.data.calc_loop_triangles()
    triangles += len(ob.data.loop_triangles)
assert len(meshes) == 10
assert triangles <= 8000, f"Presupuesto excedido: {triangles}"
assert sorted(o["segment"] for o in meshes if o["part"] == "leg") == list(range(8))
for ob in meshes:
    if ob["part"] == "leg":
        seg = ob["segment"]
        expected = Vector((0.27 if seg % 2 else -0.27, 0.34, (-0.22,-0.07,0.07,0.20)[seg//2]))
    else:
        expected = Vector((0,0.38,0))
    assert (ob.matrix_world.translation-kit.B(expected)).length < 1e-6
points = [ob.matrix_world @ v.co for ob in meshes for v in ob.data.vertices]
dimensions = (max(p.y for p in points)-min(p.y for p in points),
              max(p.z for p in points)-min(p.z for p in points),
              max(p.x for p in points)-min(p.x for p in points))
meta = dict(forward="-Z", bodyRestPivot=[0,0.38,0],
            legOrder="2*i+(right?1:0); left x<0; i front to back",
            design="Jade, hojas crema, ojos miel; pupilas y reflejos pertenecen a body",
            dimensionsLHW=list(dimensions))
export_status = "GLB de juego con AO"
try:
    parts, tris, size = kit.export_glb(ROOT / "arana-pantano-juego.glb", objects=meshes,
        meta=meta, ao={"distance":0.2,"strength":0.5}, json_path=ROOT / "arana-pantano.json")
except RuntimeError as exc:
    # Fallback solo para ausencia de Node/dependencias del convertidor.
    if "Node" not in str(exc) and "json-to-glb" not in str(exc):
        raise
    # El kit ya escribió el JSON con AO antes de invocar al convertidor.
    if not (ROOT / "arana-pantano.json").exists():
        kit.export_parts(ROOT / "arana-pantano.json", objects=meshes, meta=meta)
    parts, tris, size = len(meshes), triangles, 0
    export_status = "Solo JSON; conversión GLB pendiente: " + str(exc)
    print(export_status, flush=True)
assert parts == 10 and tris == triangles

bpy.ops.object.select_all(action="DESELECT")
for ob in meshes:
    ob.select_set(True)
bpy.context.view_layer.objects.active = body_ob
bpy.ops.export_scene.gltf(filepath=str(ROOT / "arana-pantano.glb"), export_format="GLB",
    use_selection=True, export_extras=True, export_animations=False)

# Escenografía solo para renders, creada DESPUÉS de ambas exportaciones.
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 64
scene.cycles.use_denoising = True
scene.render.resolution_x, scene.render.resolution_y = 1400, 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.view_settings.view_transform = "AgX"
world = bpy.data.worlds.new("Niebla verde")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (*kit.lin("2b4a44"),1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.45
bpy.ops.mesh.primitive_plane_add(size=200)
ground = bpy.context.object
ground.name = "Barro · solo render"
mud = bpy.data.materials.new("Barro")
mud.use_nodes = True
mud.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*kit.lin("4a4a2c"),1)
mud.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.91
ground.data.materials.append(mud)


def area(name, pos, energy, tint, size):
    bpy.ops.object.light_add(type="AREA", location=kit.B(pos))
    lamp = bpy.context.object
    lamp.name = name
    lamp.data.energy, lamp.data.shape, lamp.data.size = energy, "DISK", size
    lamp.data.color = kit.lin(tint)
    lamp.rotation_euler = (kit.B((0,0.35,0))-lamp.location).to_track_quat("-Z","Y").to_euler()


area("Luna suave", (-2.5,3.5,-3), 210, "e2f4e7", 4)
area("Rebote del pantano", (2,1.8,-1), 70, "a4d6bc", 3)
area("Borde de cuento", (0.8,2,2.5), 250, "b9e9db", 2.5)
bpy.ops.object.camera_add()
cam = bpy.context.object
scene.camera = cam
cam.data.lens = 48
cam.data.clip_start, cam.data.clip_end = 0.01, 250


def shot(name, eye, target):
    cam.location = kit.B(eye)
    cam.rotation_euler = (kit.B(target)-cam.location).to_track_quat("-Z","Y").to_euler()
    scene.render.filepath = str(ROOT / name)
    bpy.ops.render.render(write_still=True)


shot("render-cerca.png", (-1.95,1.45,-2.95), (0,0.31,-0.02))
shot("render-juego.png", (-0.8,2,-6), (0,0.3,0))
# El .blend abre en la toma cercana; el modelo continúa en su pose de reposo.
cam.location = kit.B((-1.95,1.45,-2.95))
cam.rotation_euler = (kit.B((0,0.31,-0.02))-cam.location).to_track_quat("-Z","Y").to_euler()
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "arana-pantano.blend"))

# Añade datos reales sin convertir automáticamente v1 en una aprobación visual.
delivery = ROOT / "ENTREGA.md"
if delivery.exists():
    contents = delivery.read_text(encoding="utf-8").split("\n<!-- EJECUCION -->")[0]
    contents += ("\n<!-- EJECUCION -->\n## Resultado de ejecución\n\n"
                 f"- {tris} triángulos; {parts} mallas.\n"
                 f"- Largo × alto × ancho: {dimensions[0]:.3f} × {dimensions[1]:.3f} × {dimensions[2]:.3f} m.\n"
                 f"- Exportación: {export_status}. GLB de juego: {size} bytes.\n"
                 "- Renders generados; revisión visual de Astra pendiente.\n")
    delivery.write_text(contents, encoding="utf-8")
print("EXPORT", parts, "partes", tris, "triangulos", size//1024, "KB", "DIMENSIONS LHW", dimensions, flush=True)
