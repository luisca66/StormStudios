"""Resonancia / La guitarra gigante. Autora: Astra. v1, pendiente de ejecución.

Todas las coordenadas de autoría son Three (Y arriba); kit hace la conversión.
Sin texturas externas, sin modificadores, sin dependencias adicionales a bpy/kit.
Los prototipos se exportan ANTES de preparar las instancias de exposición.
"""
import math
import sys
import json
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

TAU = math.tau
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection, 1741)


def material(name, roughness, metal=0, emission=0, light="000000"):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    tree = mat.node_tree
    bs = tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bs.inputs["Roughness"].default_value = roughness
    bs.inputs["Metallic"].default_value = metal
    bs.inputs["Emission Color"].default_value = (*kit.lin(light), 1)
    bs.inputs["Emission Strength"].default_value = emission
    vc = tree.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Pigment"
    tree.links.new(vc.outputs["Color"], bs.inputs["Base Color"])
    return mat


EBONY = material("Ébano satinado", .36, .02)
CEDAR = material("Cedro de veta larga / barniz", .30)
SIDE = material("Aros de palosanto", .34)
INLAY = material("Nácar y purfling de hueso", .24, .12)
BRASS = material("Latón envejecido", .25, .78)
SILVER = material("Cuerdas agudas pulidas", .20, .62)
DARK = material("Interior de la caja", .89)
WALL = material("Marquetería del varetaje", .39, .12)
GLOW = material("Nácar resonante / turquesa", .25, .35, .24, "66c4bd")
CORE = material("Corazón de resonancia", .30, .10, 2.4, "73d9d0")


def pigment(hex_color, p, wood=False):
    x, y, z = p
    # Veta longitudinal que continúa entre piezas. El pigmento llega al GLB del kit.
    grain = math.sin(x * 5.3 + .35 * math.sin(z * .13) + .08 * z)
    fine = math.sin(x * 19.7 + math.sin(z * .23))
    k = 1 + (.11 * grain + .035 * fine if wood else .035 * math.sin(x * 2.1 + z * .7 + y))
    return tuple(max(0, min(1, c * k)) for c in kit.lin(hex_color)) + (1,)


class Mesh:
    """Acumula superficies de UN material y pigmentos diferentes, sin draw calls extra."""
    def __init__(self, name, part, mat, segment=None, pivot=(0, 0, 0)):
        self.name, self.part, self.mat = name, part, mat
        self.segment, self.pivot = segment, pivot
        self.v, self.f, self.c = [], [], []

    def add(self, verts, faces, color, M=None, wood=False):
        offset = len(self.v)
        pts = [tuple(M @ Vector(v)) if M is not None else tuple(v) for v in verts]
        self.v.extend(pts)
        self.f.extend(tuple(offset + i for i in f) for f in faces)
        self.c.extend(pigment(color, p, wood) for p in pts)

    def box(self, size, center, color, wood=False, rot=(0, 0, 0)):
        v, f = kit.g_box(*size)
        self.add(v, f, color, kit.T(pos=center, rot=rot), wood)

    def tube(self, a, b, r, color, sides=12):
        a, b = Vector(a), Vector(b)
        q = Vector((0, 1, 0)).rotation_difference((b - a).normalized())
        v, f = kit.g_cyl(r, r, (b - a).length, sides)
        self.add(v, f, color, kit.T(pos=(a + b) / 2) @ q.to_matrix().to_4x4())

    def ring(self, radius, width, depth, center, color, n=96, horizontal=False):
        outer = [(math.cos(i * TAU / n) * (radius + width / 2),
                  math.sin(i * TAU / n) * (radius + width / 2)) for i in range(n)]
        inner = [(math.cos(i * TAU / n) * (radius - width / 2),
                  math.sin(i * TAU / n) * (radius - width / 2)) for i in range(n)]
        v, f = kit.g_ring_prism(outer, inner, depth)
        rot = (-math.pi / 2, 0, 0) if horizontal else (0, 0, 0)
        self.add(v, f, color, kit.T(pos=center, rot=rot))

    def diamond(self, center, w, h, depth, color, horizontal=False):
        v, f = kit.g_prism([(0, h / 2), (-w / 2, 0), (0, -h / 2), (w / 2, 0)], depth)
        self.add(v, f, color, kit.T(pos=center, rot=(-math.pi / 2, 0, 0) if horizontal else (0, 0, 0)))

    def build(self):
        ob = kit.make(self.name, self.v, self.f, self.mat, part=self.part, tint=0, smooth_angle=.55)
        attr = ob.data.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
        for item, color in zip(attr.data, self.c):
            item.color = color
        ob.data.color_attributes.active_color = attr
        if self.segment is not None:
            ob["segment"] = self.segment
        bpy.context.scene.cursor.location = kit.B(self.pivot)
        bpy.ops.object.select_all(action="DESELECT")
        ob.select_set(True)
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
        expected = sum(len(face) - 2 for face in self.f)
        ob.data.calc_loop_triangles()
        assert len(ob.data.loop_triangles) == expected, self.name
        ob["triangles_authored"] = expected
        return ob


# Decorado: exactamente una malla por acabado, todos con origen mundial cero.
ebony = Mesh("Diapasón y puente", "world", EBONY, 0)
cedar = Mesh("Tapa de cedro", "world", CEDAR, 1)
sides = Mesh("Aros y mástil", "world", SIDE, 2)
ivory = Mesh("Nácar y cenefas", "world", INLAY, 3)
brass = Mesh("Trastes, bordes y bordones", "world", BRASS, 4)
silver = Mesh("Primas y mecánica", "world", SILVER, 5)
interior = Mesh("Cavidad acústica", "world", DARK, 6)

# Silueta de guitarra continua, interpolada periódicamente; sin discos superpuestos.
anchors = [(0, -104), (22, -100), (31, -83), (28, -67), (19, -52),
           (25, -40), (21, -29), (0, -25), (-21, -29), (-25, -40),
           (-19, -52), (-28, -67), (-31, -83), (-22, -100)]
outline = []
for i in range(len(anchors)):
    p0, p1, p2, p3 = [Vector(anchors[j % len(anchors)]) for j in (i - 1, i, i + 1, i + 2)]
    for j in range(12):
        t = j / 12
        outline.append(tuple(.5 * (2*p1 + (-p0+p2)*t + (2*p0-5*p1+4*p2-p3)*t*t + (-p0+3*p1-3*p2+p3)*t*t*t)))
N = len(outline)  # 168; alinear el agujero con cada rayo evita tapas sobre la boca.
hole_z, hole_r = -68, 8.5
v, f = [], []
for row in range(25):
    t = row / 24
    for x, z in outline:
        d = Vector((x, z - hole_z)).normalized()
        hx, hz = d.x * hole_r, hole_z + d.y * hole_r
        v.append((hx * (1-t) + x*t, -.65, hz*(1-t) + z*t))
for row in range(24):
    for i in range(N):
        j = (i + 1) % N
        f.append((row*N+i, row*N+j, (row+1)*N+j, (row+1)*N+i))
cedar.add(v, f, "be7a43", wood=True)

# Aros curvos en tres alturas y trasera; boca realmente hundida, con pared interior.
v = [(x * scale, y, -64 + (z + 64) * scale)
     for scale, y in ((.992, -.66), (1, -1.0), (.997, -5.0), (.986, -5.3)) for x, z in outline]
f = [(row*N+i, row*N+(i+1)%N, (row+1)*N+(i+1)%N, (row+1)*N+i)
     for row in range(3) for i in range(N)]
sides.add(v, f, "60321f", wood=True)
interior.add([(x*.98, -5.25, -64+(z+64)*.98) for x, z in outline], [tuple(range(N))], "21150e")
interior.tube((0, -5.20, hole_z), (0, -5.12, hole_z), hole_r, "160f0a", sides=96)
# Cilindro hueco sin tapas: su borde superior queda debajo de la tapa.
v, f = kit.g_cyl(hole_r, hole_r, 4.4, 96, caps=False)
sides.add(v, f, "412819", kit.T(pos=(0, -2.86, hole_z)), wood=True)

# Binding continuo en los bordes de la caja, siguiendo su silueta real.
for scale, y, col, target in ((.997, -.60, "ead6a2", ivory), (.982, -.60, "39221b", sides),
                             (.971, -.60, "d4ab62", brass), (.994, -5.20, "ba995c", ivory)):
    v = [(x*s, y, -64+(z+64)*s) for s in (scale, scale-.005) for x, z in outline]
    f = [(i, (i+1)%N, N+(i+1)%N, N+i) for i in range(N)]
    target.add(v, f, col)

# Diapasón de 36.8 × 130, superficie exactamente Y=0, retícula para veta continua.
sides.box((36.8, 2.5, 130), (0, -2.0, 9), "714027", wood=True)
v = [(-18.4 + x*36.8/48, 0, -56 + z*130/130) for z in range(131) for x in range(49)]
f = [(z*49+x, z*49+x+1, (z+1)*49+x+1, (z+1)*49+x) for z in range(130) for x in range(48)]
ebony.add(v, f, "24201e", wood=True)
for sx in (-1, 1):
    ebony.box((.20, .75, 130), (sx*18.30, -.375, 9), "181514")
    ivory.box((.075, .11, 130), (sx*18.36, -.19, 9), "d9c495")
    brass.box((.045, .04, 130), (sx*18.25, -.04, 9), "a98b4b")

for i in range(18):
    z = 55 - i*6.75
    brass.tube((-18.35, .075, z), (18.35, .075, z), .085, "cbb273", sides=12)
    if i in (3, 5, 7, 9, 12, 15, 17):
        for x in ((-1.2, 1.2) if i == 12 else (0,)):
            ivory.diamond((x, .012, z-3.3), .72, 1.05, .016, "e5e3cf", horizontal=True)
            # Una discreta marca lateral ayuda a orientarse sin llenar el piso.
        ivory.diamond((-18.25, .018, z-3.3), .18, .35, .015, "c9d5c9", horizontal=True)

# Roseta de marquetería: bandas finas, 96 teselas por fila, paleta de taller.
for r, w, col, target in ((8.64,.20,"e6c78b",ivory),(8.93,.12,"38251b",sides),
                         (11.12,.12,"38251b",sides),(11.39,.22,"ead5a3",ivory),
                         (11.64,.10,"af8947",brass)):
    target.ring(r, w, .035, (0, -.615, hole_z), col, horizontal=True)
for row in range(4):
    ri, ro = 9.1 + row*.46, 9.1 + (row+1)*.46 - .035
    for i in range(96):
        a, b = TAU*(i+.055)/96, TAU*(i+.945)/96
        color = ("e3cf9b", "653929", "335b58", "201e1a")[(i+row*3) % 4]
        ivory.add([(math.cos(a)*ri,-.59,hole_z+math.sin(a)*ri),
                   (math.cos(b)*ri,-.59,hole_z+math.sin(b)*ri),
                   (math.cos(b)*ro,-.59,hole_z+math.sin(b)*ro),
                   (math.cos(a)*ro,-.59,hole_z+math.sin(a)*ro)], [(0,1,2,3)], color)

# Puente tallado con extremos en ala, selleta y seis pequeños amarres.
profile = [(-20,-1),(-19,1),(-13,1.5),(-10,2.5),(10,2.5),(13,1.5),(19,1),(20,-1)]
v, f = kit.g_prism(profile, 3.8)
ebony.add(v, f, "30211b", kit.T(pos=(0,-1.25,-91)), wood=True)
ivory.box((31,.26,.40), (0,.98,-90.7), "e9d9b4")
for x in (-15,-9,-3,3,9,15):
    brass.tube((x,-.25,-92.6),(x,.78,-91.8),.18,"b99a5b")

# Clavijero calado: dos huecos largos reales, sin polígonos negros simulando ranuras.
# Las cinco piezas se unen visualmente por el mismo pigmento y cenefas del perímetro.
for x, w in ((-14.3,3.4),(0,5.2),(14.3,3.4)):
    sides.box((w,1.5,26),(x,-1.1,87),"95552f",wood=True)
for z in (75,99):
    sides.box((32,1.5,2),(0,-1.1,z),"95552f",wood=True)
    ivory.box((32,.06,.10),(0,-.30,z),"ead5a3")
for x in (-15.96,15.96):
    ivory.box((.10,.07,24),(x,-.30,87),"ddc591")
ivory.box((36.6,.40,.65),(0,.50,73.8),"ebdab7")
for side in (-1,1):
    for k in range(3):
        z = 79 + k*7.2
        silver.tube((side*3,-.50,z),(side*18,-.50,z),.42,"b6c8c2",sides=16)
        brass.box((1.5,.18,3.0),(side*14.3,-.22,z),"ae8b48")
        v,f = kit.g_lathe([(.65,-.65),(1.0,-.45),(1.12,0),(1.0,.45),(.65,.65)],16)
        ivory.add(v,f,"e3d5b0",kit.T(pos=(side*19,-.50,z),rot=(0,0,math.pi/2),scale=(1,1,1.5)))

for i,x in enumerate((-15,-9,-3,3,9,15)):
    target, col = (brass,"cbb482") if i<3 else (silver,"d6e2dc")
    target.tube((x,.97,-91),(x,.97,74),.035+(5-i)*.012,col,sides=12)
    side = -1 if x<0 else 1
    z = 79 + (i if i<3 else 5-i)*7.2
    target.tube((x,.97,74),(side*8,-.02,z),.035+(5-i)*.012,col,sides=12)


def rail(mesh, length, center, color, along_z=False):
    """Panel con hombros biselados: 4 secciones octogonales, 60 triángulos."""
    # Contorno de la sección (espesor <= .34, altura <= 1.2).
    yz = [(.04,-.166),(.0,-.13),(.0,.13),(.04,.166),(1.14,.166),(1.20,.11),(1.20,-.11),(1.14,-.166)]
    verts = []
    for u, scale in ((-length/2,.86),(-length/2+.035,1),(length/2-.035,1),(length/2,.86)):
        for y,t in yz:
            xx, zz = (t*scale,u) if along_z else (u,t*scale)
            verts.append((xx+center[0], (y-.6)*scale+.6+center[1], zz+center[2]))
    faces = [(r*8+i,r*8+(i+1)%8,(r+1)*8+(i+1)%8,(r+1)*8+i) for r in range(3) for i in range(8)]
    faces += [tuple(reversed(range(8))),tuple(range(24,32))]
    mesh.add(verts,faces,color,wood=True)


def wall(part, length, along_z):
    m = Mesh("Varetaje / "+part,part,WALL)
    rail(m,length,(0,0,0),"895237",along_z)
    # Filetes pintados con pigmento sobre la misma malla: una sola llamada por instancia.
    for y in (.16,1.08):
        m.box((.34,.025,length-.08) if along_z else (length-.08,.025,.34),(0,y,0),"d4b471")
    for j in range(7):
        u = (j-3)*(length-.5)/7
        for sign in (-1,1):
            v,f = kit.g_prism([(0,.12),(-.08,0),(0,-.12),(.08,0)],.006)
            m.add(v,f,"dacda1" if j%2==0 else "365e56",
                  kit.T(pos=(sign*.167,.64,u) if along_z else (u,.64,sign*.167),
                        rot=(0,math.pi/2,0) if along_z else (0,0,0)))
    return m


wx, wz = wall("wall_x",5.0,False), wall("wall_z",5.7,True)
post = Mesh("Poste / capitel de hueso", "post", WALL)
v,f = kit.g_lathe([(.25,0),(.25,.08),(.21,.13),(.21,1.10),(.25,1.17),(.25,1.28),(.19,1.35)],8)
post.add(v,f,"8e5839",wood=True)
for y in (.10,1.19):
    v,f = kit.g_cyl(.252,.252,.025,8)
    post.add(v,f,"d6b97d",kit.T(pos=(0,y,0)))
v,f = kit.g_cyl(.19,.19,.035,8)
post.add(v,f,"ded6b8",kit.T(pos=(0,1.3325,0)))

# Portal: geometría centrada en su propio hueco; origen global de prototipo (0,2.3,0).
P = (0,2.3,0)
frame = Mesh("Portal / roseta tallada", "portal_frame", WALL, pivot=P)
frame.ring(2.48,.56,.34,P,"75432c",n=128)
for r in (2.22,2.73):
    frame.ring(r,.045,.38,P,"ddc18a",n=128)
for i in range(48):
    a = i*TAU/48
    frame.diamond((2.48*math.cos(a),2.3+2.48*math.sin(a),.179),.13,.24,.025,
                  ("d4b06c","44746b","ded4b1","34251d")[i%4])
for x in (-2.20,2.20):
    frame.box((1.0,.20,.9),(x,.10,0),"805034",wood=True)
    frame.box((.62,.45,.55),(x,.32,0),"b49459")
rings=[]
for seg,(r,z,col) in enumerate(((2.28,.24,"79b8ad"),(2.44,.32,"dcc89a"),(2.60,.40,"be7c68"))):
    m = Mesh("Portal / aro "+str(seg),"portal_ring",GLOW,seg,pivot=P)
    m.ring(r,.045,.06,(0,2.3,z),col,n=96)
    for i in range(12):
        a = (i+.17*seg)*TAU/12
        m.diamond((r*math.cos(a),2.3+r*math.sin(a),z),.09,.16,.08,"dce8c9")
    rings.append(m)
core = Mesh("Portal / corazón", "portal_core", CORE, pivot=P)
# Lente opaca de dos caras; ocultar al reposar y hacer crecer al abrir.
v = [(0,2.3,.28)]
for r,z in ((1.5,.23),(1.89,.17)):
    v.extend((r*math.cos(i*TAU/96),2.3+r*math.sin(i*TAU/96),z) for i in range(96))
f = [(0,1+i,1+(i+1)%96) for i in range(96)]
f += [(1+i,97+i,97+(i+1)%96,1+(i+1)%96) for i in range(96)]
f.append(tuple(reversed(range(97,193))))
core.add(v,f,"69bcb1")

builders = [ebony,cedar,sides,ivory,brass,silver,interior,wx,wz,post,frame]+rings+[core]
models = [m.build() for m in builders]
counts = {}
for ob in models:
    counts[ob["part"]] = counts.get(ob["part"],0) + ob["triangles_authored"]
assert counts["world"] <= 60000, counts
for part in ("wall_x","wall_z","post"):
    assert counts[part] <= 1500, counts
assert sum(counts[k] for k in ("portal_frame","portal_ring","portal_core")) <= 15000, counts
assert abs(models[7].dimensions.x-5.0)<.001
assert abs(models[8].dimensions.y-5.7)<.001  # Blender Y equivale a -Z Three.

meta = dict(forward="+Z", units="meters", floorY=0,
            mazeBounds={"min":[-17.5,0,-50],"max":[17.5,0,52.6]},
            stringX=[-15,-9,-3,3,9,15], stringY=.97,
            portalPlacement=[0,2.3,-54], portalPivot=[0,2.3,0],
            portalOpeningRadius=2.2, soundholeCenter=[0,-.65,-68],
            bridgeCenter=[0,.98,-90.7], nutCenter=[0,.5,73.8],
            triangleCounts=counts,
            note="world segments 0-6: ebony, cedar, sides, inlay, brass, silver, cavity; portal uses shared center pivot; preview copies excluded")

# Los prototipos coinciden espacialmente por contrato. Hornear AO por pieza evita
# sombras falsas entre world, muros y portal aún sin colocar; conserva AO distance/strength.
# Llamar al kit por objeto y luego al exportador común sin un segundo bake.
ao_copies=[]
restorers=[]
try:
    # El mundo sí comparte su AO; las piezas repetibles se hornean aisladas.
    for group in ([o for o in models if o["part"]=="world"], *[[o] for o in models if o["part"]!="world"]):
        copies, restore = kit.bake_ao(group, distance=1.5, strength=.7)
        ao_copies.extend(copies)
        restorers.append(restore)
    try:
        parts,tris,size = kit.export_glb(ROOT/"mundo-guitarra-juego.glb",objects=ao_copies,
            meta=meta,ao=None,json_path=ROOT/"mundo-guitarra.json")
    except RuntimeError as exc:
        # Solo el convertidor Node puede usar este fallback: los errores de bpy deben subir.
        if "Node" not in str(exc) and "json-to-glb" not in str(exc):
            raise
        parts,tris = kit.export_parts(ROOT/"mundo-guitarra.json",objects=ao_copies,meta=meta)
        size=0
        with (ROOT/"ENTREGA.md").open("a",encoding="utf-8") as out:
            out.write("\n\nEjecución: conversión GLB de juego pendiente; JSON con AO exportado.\n")
        print("CONVERTIDOR PENDIENTE:",exc)
finally:
    for restore in reversed(restorers):
        restore()

bpy.ops.object.select_all(action="DESELECT")
for ob in models:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/"mundo-guitarra.glb"),export_format="GLB",
    use_selection=True,export_extras=True,export_animations=False)

# Preparación de exposición DESPUÉS de exportar: instancias enlazadas, sin cambiar el asset.
preview = bpy.data.collections.new("Exposición / NO exportar al juego")
bpy.context.scene.collection.children.link(preview)
def instance(source, pos, rz=0):
    ob=source.copy()
    ob.name="Muestra / "+source.name
    if "part" in ob:
        del ob["part"]
    if "segment" in ob:
        del ob["segment"]
    preview.objects.link(ob)
    ob.hide_render=False
    ob.hide_set(False)
    ob.location=kit.B(pos)
    ob.rotation_euler.z=-rz
    return ob

for ob in models:
    if ob["part"]!="world":
        ob.hide_render=True
        ob.hide_set(True)
for ob in models[10:]:
    instance(ob,(0,2.3,-54))

# Muestra dispersa de la cuadrícula real 5 × 5.7, con pasillos abiertos.
connections=set()
for row in range(1,17):
    z=-50+row*5.7
    for col in range(7):
        if (row*7+col*3)%5 in (0,1):
            x=-15+col*5
            instance(models[7],(x,0,z))
            connections.update(((x-2.5,z),(x+2.5,z)))
for row in range(18):
    z=-50+(row+.5)*5.7
    for col in range(1,7):
        if (row*3+col*7)%9 in (0,1):
            x=-17.5+col*5
            instance(models[8],(x,0,z))
            connections.update(((x,z-2.85),(x,z+2.85)))
for x,z in sorted({(round(x,4),round(z,4)) for x,z in connections}):
    instance(models[9],(x,0,z))

scene=bpy.context.scene
scene.render.engine="CYCLES"
scene.cycles.samples=64
scene.cycles.use_denoising=True
scene.render.resolution_x=1600
scene.render.resolution_y=900
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.view_settings.view_transform="AgX"
scene.view_settings.look="AgX - Medium High Contrast"
world=bpy.data.worlds.new("Taller / penumbra azul petróleo")
world.use_nodes=True
world.node_tree.nodes["Background"].inputs[0].default_value=(*kit.lin("344b52"),1)
world.node_tree.nodes["Background"].inputs[1].default_value=.45
scene.world=world

def area(name,eye,target,power,color,size):
    bpy.ops.object.light_add(type="AREA",location=kit.B(eye))
    ob=bpy.context.object
    ob.name=name
    ob.data.energy=power
    ob.data.shape="DISK"
    ob.data.size=size
    ob.data.color=kit.lin(color)
    ob.rotation_euler=(kit.B(target)-ob.location).to_track_quat("-Z","Y").to_euler()

area("Ventanal ámbar",(-38,60,5),(0,0,-25),105000,"ffe1b1",65)
area("Contraluz de la caja",(22,30,-90),(0,0,-40),68000,"a9dae0",40)
area("Rebote del taller",(30,22,55),(0,0,0),42000,"ffd3a0",45)
bpy.ops.object.light_add(type="SUN")
sun=bpy.context.object
sun.data.energy=1.6
sun.data.angle=math.radians(18)
sun.data.color=kit.lin("ffe5c2")
sun.rotation_euler=(.45,-.4,-.5)
bpy.ops.object.camera_add()
cam=bpy.context.object
scene.camera=cam
cam.data.clip_end=700

def shot(name,eye,target,lens):
    cam.location=kit.B(eye)
    cam.rotation_euler=(kit.B(target)-cam.location).to_track_quat("-Z","Y").to_euler()
    cam.data.lens=lens
    scene.render.filepath=str(ROOT/name)
    bpy.ops.render.render(write_still=True)

shot("render-juego.png",(118,165,188),(0,-.6,-4),34)
# Detalle reúne portal, roseta y la transición a cedro; ojo del luthier a escala del mundo.
shot("render-cerca.png",(13,13,-40),(0,1,-58),42)
# El .blend abre en la vista general, con cámara y luces editables.
cam.location=kit.B((118,165,188))
cam.rotation_euler=(kit.B((0,-.6,-4))-cam.location).to_track_quat("-Z","Y").to_euler()
cam.data.lens=34
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/"mundo-guitarra.blend"))
print("EXPORT",parts,"mallas",tris,"triángulos",size//1024,"KB",flush=True)
print("TRIÁNGULOS POR PARTE",json.dumps(counts,ensure_ascii=False),flush=True)
print("REVISIÓN VISUAL PENDIENTE: render-juego.png y render-cerca.png",flush=True)
