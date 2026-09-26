"""Portal del pantano, v1. Ejecutar con bpy-run.ps1; no necesita assets externos.

Geometría en coordenadas Three (Y arriba, frente +Z); kit convierte a Blender.
Todos los pivotes permanecen en el centro del hueco durante la exportación.
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
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection, 404)


def material(name, roughness, emission=0, hue="000000"):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bs = mat.node_tree.nodes["Principled BSDF"]
    bs.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bs.inputs["Roughness"].default_value = roughness
    bs.inputs["Emission Color"].default_value = (*kit.lin(hue), 1)
    bs.inputs["Emission Strength"].default_value = emission
    vc = mat.node_tree.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Pigment"
    mat.node_tree.links.new(vc.outputs["Color"], bs.inputs["Base Color"])
    return mat


WOOD = material("Raíces, piedra y musgo", 0.88)
WARM = material("Faroles de semilla", 0.5, 1.8, "ffc070")
TURQ = material("Agua turquesa", 0.34, 2.0, "5ff0d0")
LIME = material("Polen lima", 0.4, 1.6, "b8ff7a")
HEART = material("Remolino de agua", 0.48, 0.65, "5ff0d0")


class Mesh:
    def __init__(self):
        self.v, self.f, self.c = [], [], []

    def add(self, vertices, faces, hue, light=None):
        offset = len(self.v)
        self.v.extend(vertices)
        self.f.extend(tuple(offset + i for i in face) for face in faces)
        lo, hi = Vector(kit.lin(hue)), Vector(kit.lin(light or hue))
        for x, y, z in vertices:
            t = 0.5 + 0.24 * math.sin(x * 3.1 + y * 2.7) + 0.18 * math.sin(z * 6 + y)
            self.c.append((*lo.lerp(hi, max(0, min(1, t))), 1))

    def build(self, name, mat, part, segment=None):
        ob = kit.make(name, self.v, self.f, mat, part=part, tint=0, smooth_angle=1.5)
        attr = ob.data.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
        for item, color in zip(attr.data, self.c):
            item.color = color
        ob.data.color_attributes.active_color = attr
        if segment is not None:
            ob["segment"] = segment
        return ob


def tube(batch, points, radii, hue, light=None, sides=10):
    """Tubo cerrado con radio variable y marcos transportados suavemente."""
    path = [Vector(p) for p in points]
    verts, faces = [], []
    normal = Vector((0, 0, 1))
    for i, p in enumerate(path):
        tangent = (path[min(i + 1, len(path) - 1)] - path[max(0, i - 1)]).normalized()
        normal = normal - tangent * normal.dot(tangent)
        if normal.length < 0.01:
            normal = tangent.cross(Vector((0, 1, 0)))
        normal.normalize()
        binormal = tangent.cross(normal)
        r = radii[i] if isinstance(radii, list) else radii
        for j in range(sides):
            a = TAU * j / sides
            verts.append(tuple(p + r * (normal * math.cos(a) + binormal * math.sin(a))))
    for i in range(len(path) - 1):
        for j in range(sides):
            k = (j + 1) % sides
            faces.append((i*sides+j, i*sides+k, (i+1)*sides+k, (i+1)*sides+j))
    faces.extend([tuple(reversed(range(sides))), tuple((len(path)-1)*sides+j for j in range(sides))])
    batch.add(verts, faces, hue, light)


def pebble(batch, center, scale, hue, light=None, seg=16, rows=8):
    # Polos únicos: sin quads degenerados, contorno suave y ligeramente orgánico.
    x, y, z = center
    sx, sy, sz = scale
    verts = [(x, y + sy, z)]
    for i in range(1, rows):
        a = math.pi * i / rows
        for j in range(seg):
            b = TAU * j / seg
            wobble = 1 + 0.045 * math.sin(3*b + a*2)
            verts.append((x+sx*math.sin(a)*math.cos(b)*wobble,
                          y+sy*math.cos(a), z+sz*math.sin(a)*math.sin(b)*wobble))
    bottom = len(verts)
    verts.append((x, y-sy, z))
    faces = [(0, 1+j, 1+(j+1)%seg) for j in range(seg)]
    for i in range(rows-2):
        for j in range(seg):
            k = (j+1)%seg
            faces.append((1+i*seg+j, 1+(i+1)*seg+j, 1+(i+1)*seg+k, 1+i*seg+k))
    faces.extend((bottom, 1+(rows-2)*seg+(j+1)%seg, 1+(rows-2)*seg+j) for j in range(seg))
    batch.add(verts, faces, hue, light)


frame, lanterns = Mesh(), Mesh()
# Dos raíces madre se abrazan en la clave; hueco libre de postes y dinteles.
for side in (-1, 1):
    guide = [(side*4.75, -3.28, 0.20), (side*4.20, -2.55, 0),
             (side*4.20, -0.6, -0.10), (side*3.95, 1.75, 0),
             (side*2.75, 3.85, 0), (side*1.30, 4.80, 0), (0, 5.12, 0)]
    path = kit.catmull(guide, per=6)
    tube(frame, path, [0.48-0.20*i/(len(path)-1) for i in range(len(path))], "4a3b28", "6b5a3e", 12)
    # Una segunda raíz se enrosca por delante de cada tronco.
    path2 = [(p.x + side*0.26*math.sin(i*0.30), p.y,
              p.z+0.30*math.cos(i*0.30)) for i, p in enumerate(path)]
    tube(frame, path2, [0.24-0.10*i/(len(path)-1) for i in range(len(path))], "4a3b28", "6b5a3e", 10)
    for j in range(3):
        root = kit.catmull([(side*4.1, -1.65, 0), (side*(4.2+j*.2), -2.55, .25+j*.22),
                            (side*(4.55+j*.18), -3.26, .65+j*.30)], per=5)
        tube(frame, root, [0.26*(1-i/(len(root)*1.1)) for i in range(len(root))], "4a3b28", "6b5a3e")
    for j in range(4):
        cx, cy = side*(4.22+0.18*math.sin(j*2)), -2.96+j*.86
        pebble(frame, (cx, cy, -.18), (.65, .54, .62), "6d7560", "6d7560")
        pebble(frame, (cx, cy+.37, -.12), (.55, .19, .55), "3f7a3a", "6fae52", 12, 6)
    # Lianas que se quedan junto al borde superior, sin tapar el remolino.
    for j in range(3):
        x, y = side*(1.25+j*.82), 4.64-j*.53
        vine = kit.catmull([(x, y, .34), (x+side*.20, y-.38, .44),
                            (x+side*.13, y-.92, .47)], per=5)
        tube(frame, vine, .065, "3f7a3a", "6fae52", 8)
        for k in range(2):
            pebble(frame, (x+side*(.12+.13*k), y-.28-.33*k, .46), (.20,.12,.075), "3f7a3a", "6fae52", 10, 5)
    # Farolito con cáliz de madera integrado y semilla luminosa independiente.
    x, y = side*3.18, 2.10
    tube(frame, kit.catmull([(side*3.7, 2.8, .35), (x, 2.65, .55), (x, y+.22, .55)], 5), .075, "6b5a3e", sides=8)
    pebble(frame, (x,y-.24,.55), (.23,.10,.21), "4a3b28", "6b5a3e", 12, 6)
    pebble(lanterns, (x,y,.55), (.18,.29,.18), "ffc070", "ffc070", 16, 8)

# Musgo festoneado en la corona: pequeñas almohadillas adheridas a las raíces.
for j in range(11):
    a = math.pi * (.16 + .68*j/10)
    pebble(frame, (4.05*math.cos(a), 4.94*math.sin(a)+.16, .24),
           (.39,.17,.33), "3f7a3a", "6fae52", 12, 6)

objects = [frame.build("Marco de manglar", WOOD, "frame"),
           lanterns.build("Semillas cálidas fijas", WARM, "frame")]

# Anillos completos con tres brotes asimétricos: la rotación es legible.
for segment, (radius, depth, thickness) in enumerate([(3.53,.17,.07), (3.30,.36,.055), (3.08,.52,.045)]):
    batch = Mesh()
    hue = "b8ff7a" if segment == 1 else "5ff0d0"
    v, f = kit.g_torus(radius, thickness, 80, 8)
    batch.add([(x,y,z+depth) for x,y,z in v], f, hue)
    for j in range(3):
        a = j*TAU/3+segment*.48
        pebble(batch, (radius*math.cos(a), radius*math.sin(a), depth),
               (.11,.15,.09), hue, seg=10, rows=5)
    objects.append(batch.build("Aro %d" % segment, LIME if segment == 1 else TURQ, "ring", segment))

# Tres brazos de agua en espiral, con espacio negativo: entrada abierta y amable.
core = Mesh()
for arm in range(3):
    path, radii = [], []
    for i in range(61):
        t = i/60
        a = arm*TAU/3 + t*TAU*1.02
        r = .20+2.74*t
        path.append((r*math.cos(a), r*math.sin(a), -.12-.28*t))
        radii.append(.045+.16*math.sin(math.pi*t)**.8)
    tube(core, path, radii, "3f7a3a", "5ff0d0", 8)
pebble(core, (0,0,-.10), (.31,.31,.15), "5ff0d0", "b8ff7a", 20, 10)
objects.append(core.build("Corazón de corriente", HEART, "core"))

# Auditoría previa a exportar: geometría y pivotes sin poses de presentación.
triangles = 0
for ob in objects:
    ob.data.calc_loop_triangles()
    triangles += len(ob.data.loop_triangles)
    assert ob.location.length < 1e-8
assert len(objects) <= 12, len(objects)
assert triangles <= 20000, triangles
points = [Vector((v.co.x,v.co.z,-v.co.y)) for ob in objects for v in ob.data.vertices]
lower = [min(p[i] for p in points) for i in range(3)]
upper = [max(p[i] for p in points) for i in range(3)]
dimensions = [round(upper[i]-lower[i], 3) for i in range(3)]
meta = dict(forward="+Z", portalCenter=[0,0,0], groundY=-3.5,
            arrivalAnchor=[0,-3.5,1.5], apertureRadius=3.6,
            dimensionsXYZ=dimensions,
            note="Dos mallas frame fijas; ring segment 0..2 gira en Z; core pulsa. Sin colisión en el efecto luminoso.")

export_note = "GLB de juego con AO exportado."
try:
    parts, exported_tris, size = kit.export_glb(
        ROOT / "portal-pantano-juego.glb", objects=objects, meta=meta,
        ao={"distance": 1.0, "strength": 0.7}, json_path=ROOT / "portal-pantano.json")
except RuntimeError as exc:
    # Solo el fallo conocido del convertidor permite la entrega alternativa.
    if "necesita Node" not in str(exc) and "json-to-glb falló" not in str(exc):
        raise
    parts, exported_tris = kit.export_parts(ROOT / "portal-pantano.json", objects=objects, meta=meta)
    size = 0
    export_note = "PENDIENTE GLB de juego: convertidor no disponible; JSON alternativo SIN AO. " + str(exc)
assert exported_tris == triangles

bpy.ops.object.select_all(action="DESELECT")
for ob in objects:
    ob.select_set(True)
bpy.context.view_layer.objects.active = objects[0]
bpy.ops.export_scene.gltf(filepath=str(ROOT / "portal-pantano.glb"), export_format="GLB",
                          use_selection=True, export_extras=True, export_animations=False)

# Presentación, sin añadir mallas ni alterar los pivotes exportados.
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = "PNG"
scene.render.resolution_percentage = 100
scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.view_settings.view_transform = "AgX"
world = bpy.data.worlds.new("Niebla del pantano")
world.use_nodes = True
scene.world = world
world.node_tree.nodes["Background"].inputs[0].default_value = (*kit.lin("2b4a44"),1)
world.node_tree.nodes["Background"].inputs[1].default_value = .8


def aim(ob, target):
    ob.rotation_euler = (kit.B(Vector(target))-ob.location).to_track_quat("-Z", "Y").to_euler()


for name, position, energy, color, size_light in [
    ("Luna suave", (3,9,7), 1800, "b8ff7a", 7),
    ("Rebote cálido", (-6,3,5), 1100, "ffc070", 6),
    ("Ribete de agua", (1,4,-5), 1500, "5ff0d0", 5)]:
    bpy.ops.object.light_add(type="AREA", location=kit.B(Vector(position)))
    lamp = bpy.context.object
    lamp.name = name
    lamp.data.energy, lamp.data.size = energy, size_light
    lamp.data.color = kit.lin(color)
    aim(lamp, (0,1,0))
bpy.ops.object.camera_add()
cam = bpy.context.object
scene.camera = cam
cam.data.sensor_fit = "HORIZONTAL"
cam.data.sensor_width = 36
cam.data.clip_end = 200


def shot(name, eye, target, lens):
    cam.location = kit.B(Vector(eye))
    cam.data.lens = lens
    aim(cam, target)
    scene.render.filepath = str(ROOT / name)
    bpy.ops.render.render(write_still=True)


# Cámara a 2 m del suelo: y = -3.5 + 2, distancia horizontal ~25 m.
shot("render-juego.png", (4.5,-1.5,24.6), (0,.7,0), 42)
shot("render-cerca.png", (9,4,15), (0,.8,0), 39)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "portal-pantano.blend"))

# Añade evidencia de ejecución sin dar por hecha una revisión visual humana.
delivery = ROOT / "ENTREGA.md"
marker = "\n## Resultado de ejecución automática\n"
if delivery.exists():
    original = delivery.read_text(encoding="utf-8").split(marker)[0]
    delivery.write_text(original + marker +
        f"\n{parts} mallas; {triangles} triángulos; dimensiones XYZ {dimensions} m.\n\n" +
        export_note + "\n\nRenders generados; revisión visual de Astra pendiente.\n", encoding="utf-8")
print("EXPORT", parts, "partes", triangles, "triangulos", size//1024, "KB", "DIMENSIONS XYZ", dimensions, flush=True)
