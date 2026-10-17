"""Resonancia — Dentro del coro. Autora: Astra. Ejecución pendiente en la PC de Luis.

Todas las coordenadas de autoría son Three (Y arriba). No necesita texturas,
descargas ni complementos. Exporta ANTES de disponer las piezas para las fotos.
"""
from pathlib import Path
import math
import sys
import json
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

TAU = math.tau
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection, 2718)


def material(name, roughness, metal=0, emission=0, glow="ffd995"):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = (1, 1, 1, 1)
    p.inputs["Roughness"].default_value = roughness
    p.inputs["Metallic"].default_value = metal
    p.inputs["Emission Color"].default_value = (*kit.lin(glow), 1)
    p.inputs["Emission Strength"].default_value = emission
    vc = m.node_tree.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Pigment"
    m.node_tree.links.new(vc.outputs["Color"], p.inputs["Base Color"])
    return m


STONE = material("Caliza miel", .84)
WOOD = material("Nogal tallado", .64)
GOLD = material("Voces de oro", .33, .35, .35)
GLASS = material("Vitral opaco luminoso", .32, .08, .55, "fff0d2")
PAPER = material("Papel marfil y tinta", .86)
CORE = material("Corazón de luz", .28, .1, 1.1, "ffe3a5")


class Mesh:
    """Acumula geometría en memoria; un material por malla/parte del kit."""
    def __init__(self):
        self.v, self.f, self.c = [], [], []

    def add(self, verts, faces, color, M=None):
        offset = len(self.v)
        coords = [tuple(M @ Vector(v)) if M is not None else tuple(v) for v in verts]
        self.v.extend(coords)
        self.f.extend(tuple(offset + i for i in face) for face in faces)
        base = kit.lin(color)
        # Variación continua pequeña: piedra, vetas y pigmento sin texturas externas.
        for x, y, z in coords:
            k = 1 + .045 * math.sin(x * 3.7 + z * 1.9) * math.cos(y * 4.3 + x)
            self.c.append(tuple(min(1, max(0, a * k)) for a in base))

    def box(self, size, pos, color, rot=(0, 0, 0)):
        self.add(*kit.g_box(*size), color, kit.T(pos=pos, rot=rot))

    def lathe(self, profile, pos, color, n=12):
        self.add(*kit.g_lathe(profile, n), color, kit.T(pos=pos))

    def ring(self, r, width, depth, pos, color, n=64, start=0, sweep=TAU):
        # Anillo de sección rectangular, también sirve para las bóvedas semicirculares.
        outer = [(math.cos(start + sweep*i/n)*(r+width/2), math.sin(start+sweep*i/n)*(r+width/2)) for i in range(n+1)]
        inner = [(math.cos(start + sweep*i/n)*(r-width/2), math.sin(start+sweep*i/n)*(r-width/2)) for i in range(n+1)]
        v = [(x,y,z) for z in (-depth/2, depth/2) for curve in (outer,inner) for x,y in curve]
        k = n+1
        f = []
        for i in range(n):
            j=i+1
            f += [(i,j,2*k+j,2*k+i), (k+j,k+i,3*k+i,3*k+j),
                  (2*k+i,2*k+j,3*k+j,3*k+i), (j,i,k+i,k+j)]
        if sweep < TAU-.001:
            f += [(0,2*k,k*3,k), (n,k+n,3*k+n,2*k+n)]
        self.add(v,f,color,kit.T(pos=pos))

    def beam(self, a, b, width, color):
        a,b=Vector(a),Vector(b)
        q=Vector((0,1,0)).rotation_difference((b-a).normalized())
        M=kit.T(pos=tuple((a+b)/2)) @ q.to_matrix().to_4x4()
        self.add(*kit.g_cyl(width,width,(b-a).length,6),color,M)

    def finish(self, name, part, mat, segment=None, pivot=(0,0,0)):
        o=kit.make(name,self.v,self.f,mat,part=part,tint=0,smooth_angle=.65)
        attr=o.data.color_attributes.new(name="Pigment",type="FLOAT_COLOR",domain="POINT")
        for dst,c in zip(attr.data,self.c):
            dst.color=(*c,1)
        o.data.color_attributes.active_color=attr
        if segment is not None:
            o["segment"]=segment
        bpy.context.scene.cursor.location=kit.B(pivot)
        bpy.ops.object.select_all(action="DESELECT")
        o.select_set(True)
        bpy.context.view_layer.objects.active=o
        bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
        return o


stone,wood,gold,glass,paper=Mesh(),Mesh(),Mesh(),Mesh(),Mesh()
# Nave de 64 × 168 m. Superficie transitable exactamente en y=0, sin relieves.
stone.box((64,.24,168),(0,-.12,-6),"d9c8a3")
for row in range(28):
    for col in range(10):
        x=-28.8+col*6.4
        z=-87+row*6
        c=("eadfc7","e5d7ba","eee3cd")[(row+col)%3]
        stone.add([(x-3.17,0,z-2.97),(x+3.17,0,z-2.97),(x+3.17,0,z+2.97),(x-3.17,0,z+2.97)],[(0,3,2,1)],c)
# Dos cenefas periféricas: ningún patrón denso dentro del recorrido.
for x in (-19.1,19.1):
    for z in range(-84,73,6):
        stone.add([(x-.24,.001,z),(x,.001,z+1.3),(x+.24,.001,z),(x,.001,z-1.3)],[(0,1,2,3)],"bda477")

profile=[(1.35,0),(1.35,.36),(1.05,.55),(.84,.8),(.7,12.9),(.94,13.15),(1.22,13.5),(1.22,14)]
for z in range(-76,69,18):
    for x in (-24,24):
        stone.lathe(profile,(x,0,z),"e7d5af",16)
        # Fustes secundarios que hacen leer la columna como haz gótico.
        for dx in (-.66,.66):
            stone.lathe([(.16,.7),(.16,13.4)],(x+dx,0,z+.45),"f1e4c9",8)
    stone.ring(24,.58,.75,(0,14,z),"f1e2c2",48,0,math.pi)
# Bóveda continua de piedra clara; no se quita para las cámaras.
stone.ring(24.8,.3,162,(0,14,-6),"ecdfc3",64,0,math.pi)
# Cornisas longitudinales y zócalos laterales.
for x in (-25,25):
    stone.box((1.4,.6,164),(x,13.8,-6),"d7c199")
    stone.box((.8,.55,164),(x,.275,-6),"c9b48c")
# Fachada de fondo con apertura alrededor del gran vitral.
for x in (-22,22):
    stone.box((22,39,1.4),(x,19.5,-88),"e3d0aa")
stone.box((22,9,1.4),(0,4.5,-88),"e3d0aa")
stone.box((22,8,1.4),(0,35,-88),"e3d0aa")


def rose(s, g, v, center, radius, petals=12):
    x,y,z=center
    s.ring(radius,.45 if radius>5 else .23,.48,center,"f1dfb9",96 if radius>5 else 64)
    g.ring(radius*.94,radius*.018,.11,(x,y,z+.3),"d5aa56",96 if radius>5 else 64)
    palette=["e7b357","83bfc0","bd8fb9","ecb3a0","91aacf","b7c58b"]
    for i in range(petals):
        a=TAU*i/petals
        # Pétalos de vidrio en cuña, con huecos de plomo entre cada pétalo.
        pts=[]
        for j in range(9):
            t=a+.035+(TAU/petals-.07)*j/8
            pts.append((math.cos(t)*radius*.89, math.sin(t)*radius*.89))
        for j in range(8,-1,-1):
            t=a+.035+(TAU/petals-.07)*j/8
            pts.append((math.cos(t)*radius*.22, math.sin(t)*radius*.22))
        v.add(*kit.g_prism(pts,.07),palette[i%len(palette)],kit.T(pos=(x,y,z+.1)))
        g.beam((x+math.cos(a)*radius*.2,y+math.sin(a)*radius*.2,z+.25),
               (x+math.cos(a)*radius*.92,y+math.sin(a)*radius*.92,z+.25),radius*.012,"b08a4d")
    g.ring(radius*.22,radius*.025,.12,(x,y,z+.26),"d7af63",48)
    v.add(*kit.g_disc(radius*.19,32)[:2],"f9dc8f",kit.T(pos=(x,y,z+.12)))


rose(stone,gold,glass,(0,20,-86.9),10)
# Sillería del coro a ambos lados, fuera del dominio jugable x=±17.5.
for side in (-1,1):
    x=side*21
    for k in range(20):
        z=-66+k*6.6
        wood.box((2.5,.3,4.5),(x,.8,z),"976338")
        wood.box((.3,3.9,4.5),(x+side*1.1,2,z),"70482f")
        for dz in (-2.05,2.05):
            wood.box((2.45,.17,.22),(x,1.5,z+dz),"ac7b47")
            wood.box((.2,1.4,.24),(x-side*.95,.7,z+dz),"70482f")
        # Rombo tallado sobre cada respaldo: volumen real, no textura.
        for dz in (-1,1):
            wood.box((.12,.72,.72),(x+side*.9,2.7,z+dz),"be8c50",rot=(math.pi/4,0,0))

# Atriles con libros abiertos; tinta geométrica sobre las dos páginas inclinadas.
for side in (-1,1):
    for z in (-57,-27,3,33,57):
        x=side*19.7
        wood.lathe([(.65,0),(.65,.15),(.12,.3),(.12,2.8)],(x,0,z),"805637",12)
        wood.box((1.9,.12,1.25),(x,2.9,z),"a77a43",rot=(.30,0,0))
        # El mismo marco de transformación para papel, pentagramas y notas.
        for page in (-1,1):
            M=kit.T(pos=(x,3,z),rot=(.30,0,page*.10))
            paper.add(*kit.g_box(.85,.025,1.06),"fff0cc",M @ kit.T(pos=(page*.45,0,0)))
            for staff in range(2):
                for line in range(5):
                    zz=-.34+staff*.43+line*.042
                    paper.add(*kit.g_box(.70,.008,.009),"6a5849",M @ kit.T(pos=(page*.45,.018,zz)))
                for note in range(4):
                    xx=page*.45-.24+note*.15
                    zz=-.31+staff*.43+(note%3)*.042
                    paper.add(*kit.g_box(.055,.009,.038),"544638",M @ kit.T(pos=(xx,.02,zz)))
                    paper.add(*kit.g_box(.009,.009,.13),"544638",M @ kit.T(pos=(xx+.025,.02,zz-.055)))

# Voix: rubans épais à deux faces, bords effilés, silhouette calme au-dessus des allées.
for i in range(8):
    verts=[]
    for j in range(65):
        t=j/64
        x=(-13 if i%2 else 13)+4*math.sin(t*TAU+i*.7)
        y=7+i*.7+1.4*math.sin(t*TAU*.8+i)
        z=-75+145*t
        w=.05+.30*math.sin(math.pi*t)**.6
        verts.extend([(x-w,y-.035,z),(x+w,y-.035,z),(x-w,y+.035,z),(x+w,y+.035,z)])
    faces=[]
    for j in range(64):
        a=j*4; b=a+4
        faces.extend([(a,b,b+1,a+1),(a+2,a+3,b+3,b+2),(a,a+2,b+2,b),(a+1,b+1,b+3,a+3)])
    faces.extend([(0,1,3,2),(256,258,259,257)])
    gold.add(verts,faces,"f2ce79")

objects=[stone.finish("Nave y bóveda","world",STONE,0),
         wood.finish("Sillería tallada","world",WOOD,1),
         gold.finish("Voces y tracería","world",GOLD,2),
         glass.finish("Gran rosetón","world",GLASS,3),
         paper.finish("Partituras abiertas","world",PAPER,4)]


def wall(length, axis, name):
    m=Mesh()
    # Un único material mate con pigmentos: compatible con export_parts.
    m.box((length,.17,.34),(0,.085,0),"6c472f")
    m.box((length,.15,.34),(0,1.125,0),"b38950")
    m.box((length,.83,.16),(0,.585,0),"875a38")
    for k in range(6):
        x=-length/2+(k+.5)*length/6
        for z in (-.105,.105):
            # Contorno ojival tallado en relieve bajo, dentro del grosor contratado.
            pts=[(x-.25,.30,z),(x-.25,.76,z),(x,.98,z),(x+.25,.76,z),(x+.25,.30,z)]
            for a,b in zip(pts,pts[1:]):
                m.beam(a,b,.024,"c29556")
        m.box((.045,.86,.25),(x-length/12,.60,0),"a57542")
    if axis=="z":
        m.v=[(-z,y,x) for x,y,z in m.v]
    return m.finish(name,name,WOOD)


wx=wall(5,"x","wall_x"); wz=wall(5.7,"z","wall_z")
post=Mesh()
post.box((.5,.18,.5),(0,.09,0),"ad8650")
post.box((.34,.99,.34),(0,.675,0),"795234")
post.box((.5,.18,.5),(0,1.26,0),"bd965c")
po=post.finish("post","post",WOOD)
objects += [wx,wz,po]

# Portal: centro a y=2.3, hueco interior de radio 2.2. Pivote común centro del hueco.
pf=Mesh(); pr0=Mesh(); pr1=Mesh(); pc=Mesh()
pf.ring(2.38,.36,.42,(0,2.3,0),"eddbb5",80)
for x in (-2.48,2.48):
    pf.box((.45,2.3,.65),(x,1.15,0),"d8c299")
    pf.box((.65,.16,.8),(x,.08,0),"c8b087")
pr0.ring(2.08,.085,.10,(0,2.3,.26),"e0b15b",64)
pr1.ring(1.76,.07,.10,(0,2.3,.30),"e0b15b",64)
palette=["edbc68","8dc7c5","c09dce","efa995","a3b9e3","c1cf93"]
for i in range(12):
    a=i*TAU/12
    pts=[(math.cos(a-.10)*1.85,math.sin(a-.10)*1.85),
         (math.cos(a)*2.02,math.sin(a)*2.02),
         (math.cos(a+.10)*1.85,math.sin(a+.10)*1.85),
         (math.cos(a)*1.70,math.sin(a)*1.70)]
    pr0.add(*kit.g_prism(pts,.055),palette[i%6],kit.T(pos=(0,2.3,.28)))
    pr1.beam((math.cos(a)*1.5,2.3+math.sin(a)*1.5,.30),
             (math.cos(a+.15)*1.72,2.3+math.sin(a+.15)*1.72,.30),.025,"f5d48b")
# Centre fermé de faible profondeur, deux faces opaques: pas de tri de transparence.
pc.add(*kit.g_cyl(1.48,1.48,.045,64),"ffdda1",kit.T(pos=(0,2.3,.15),rot=(math.pi/2,0,0)))
portal=[pf.finish("Cadre du rosetón","portal_frame",STONE,pivot=(0,2.3,0)),
        pr0.finish("Pétalos giratorios","portal_ring",GLASS,0,pivot=(0,2.3,0)),
        pr1.finish("Tracería giratoria","portal_ring",GOLD,1,pivot=(0,2.3,0)),
        pc.finish("Luz de llegada","portal_core",CORE,pivot=(0,2.3,0))]
objects += portal


def count(o):
    o.data.calc_loop_triangles()
    return len(o.data.loop_triangles)


counts={}
for o in objects:
    counts[o["part"]]=counts.get(o["part"],0)+count(o)
assert counts["world"] <= 60000, counts
for p in ("wall_x","wall_z","post"):
    assert counts[p] <= 1500, counts
assert sum(counts[p] for p in ("portal_frame","portal_ring","portal_core")) <= 15000, counts
# Verificación de dimensiones de las piezas que se instancian cientos de veces.
for o,expected in ((wx,(5,1.2,.34)),(wz,(.34,1.2,5.7)),(po,(.5,1.35,.5))):
    xyz=[(v.co.x,v.co.z,-v.co.y) for v in o.data.vertices]
    dims=tuple(max(p[a] for p in xyz)-min(p[a] for p in xyz) for a in range(3))
    assert all(abs(a-b)<.05 for a,b in zip(dims,expected)), (o.name,dims)  # margen: molduras de 2 cm (Claude)

meta=dict(forward="+Z", units="meters", floorY=0,
          mazeBounds=dict(x=[-17.5,17.5],z=[-50,52.6]),
          portalCenter=[0,2.3,0], portalRadius=2.2,
          portalPreviewPosition=[0,2.3,-70], roseCenter=[0,20,-86.9],
          animation=dict(portal_ring=[dict(segment=0,axis="Z",radPerSecond=.06),
                                       dict(segment=1,axis="Z",radPerSecond=-.04)],
                         portal_core=dict(scaleAmplitude=.035,cyclesPerSecond=.35)),
          note="world origen 0; portal pivote centro; buildEnvironmentPortal ya eleva el centro en world.ts")

# No se disponen instancias ni robot hasta haber exportado los modelos canónicos.
# Evita AO cruzada entre prototipos superpuestos en (0,0,0): hornear por familia.
ao=dict(distance=1.5,strength=.7)
ao_objects=[]; restores=[]
try:
    for family in ([o for o in objects if o["part"]=="world"],[wx],[wz],[po],portal):
        copies,restore=kit.bake_ao(family,**ao)
        ao_objects.extend(copies); restores.append(restore)
    try:
        parts,tris,size=kit.export_glb(ROOT/"mundo-coro-juego.glb",objects=ao_objects,
            meta=meta,ao=None,json_path=ROOT/"mundo-coro.json")
        export_status="GLB y JSON con AO por familia"
    except RuntimeError as exc:
        if "Node" not in str(exc) and "json-to-glb" not in str(exc):
            raise
        parts,tris=kit.export_parts(ROOT/"mundo-coro.json",objects=ao_objects,meta=meta)
        size=0
        export_status="Solo JSON con AO; conversión GLB pendiente: "+str(exc)
finally:
    for restore in reversed(restores):
        restore()

bpy.ops.object.select_all(action="DESELECT")
for o in objects:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/"mundo-coro.glb"),export_format="GLB",
    use_selection=True,export_extras=True,export_animations=False)

# Auditoría real generada al ejecutar. No sustituye la revisión visual de Astra.
(ROOT/"datos-tecnicos.json").write_text(json.dumps(dict(
    trianglesByPart=counts,totalTriangles=sum(counts.values()),meshCount=len(objects),
    trianglesByMesh={o.name:count(o) for o in objects},gameGlbBytes=size,
    status=export_status,ao=ao,visualReview="pendiente de Astra"),ensure_ascii=False,indent=2),encoding="utf-8")

# Presentación: los prototipos permanecen en una colección oculta, sin contaminar exports.
prototypes=bpy.data.collections.new("PROTOTIPOS — exportados sin disponer")
bpy.context.scene.collection.children.link(prototypes)
for o in [wx,wz,po]+portal:
    for c in list(o.users_collection):
        c.objects.unlink(o)
    prototypes.objects.link(o)
prototypes.hide_render=True
prototypes.hide_viewport=True


def instance(source,pos):
    o=source.copy(); o.data=source.data
    bpy.context.scene.collection.objects.link(o)
    o.location=kit.B(pos)
    o.name="FOTO · "+source.name
    if "part" in o:
        del o["part"]
    return o


# Muestra dispersa, celdas reales de 5 × 5.7; ningún falso muro en el export.
nodes=set()
for row in range(2,17,2):
    z=-50+row*5.7
    for col in range(7):
        if (col+row//2)%3==0:
            continue
        x=-15+col*5
        instance(wx,(x,0,z))
        nodes.update(((x-2.5,z),(x+2.5,z)))
for row in range(1,17,2):
    for col in (1,3,5):
        if (row+col)%4==0:
            continue
        x=-17.5+col*5; z=-50+(row+.5)*5.7
        instance(wz,(x,0,z))
        nodes.update(((x,z-2.85),(x,z+2.85)))
for x,z in sorted(nodes):
    instance(po,(x,0,z))
for o in portal:
    instance(o,(0,2.3,-70))

# Robot existente, únicamente para escala en los renders. No modifica el archivo fuente.
robot_path=ROOT.parent/"robot"/"robot.blend"
if robot_path.exists():
    with bpy.data.libraries.load(str(robot_path),link=False) as (src,dst):
        dst.objects=[name for name in src.objects]
    robot_root=bpy.data.objects.new("FOTO · robot luthier",None)
    bpy.context.scene.collection.objects.link(robot_root)
    robot_root.location=kit.B((1.5,0,32))
    for o in dst.objects:
        if o is None:
            continue
        if o.type!="MESH" or "part" not in o:
            bpy.data.objects.remove(o,do_unlink=True)
            continue
        bpy.context.scene.collection.objects.link(o)
        o.parent=robot_root
        del o["part"]
else:
    raise FileNotFoundError("Falta robot/robot.blend para la referencia de escala")

scene=bpy.context.scene
scene.render.engine="CYCLES"
scene.cycles.samples=48
scene.cycles.use_denoising=True
scene.render.resolution_x=1600; scene.render.resolution_y=900
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.view_settings.view_transform="AgX"
world=bpy.data.worlds.new("Luz de mañana"); world.use_nodes=True; scene.world=world
world.node_tree.nodes["Background"].inputs[0].default_value=(*kit.lin("fff0d5"),1)
world.node_tree.nodes["Background"].inputs[1].default_value=.65


def area(name,pos,target,power,size,color):
    bpy.ops.object.light_add(type="AREA",location=kit.B(pos))
    o=bpy.context.object; o.name=name
    o.data.energy=power; o.data.shape="DISK"; o.data.size=size
    o.data.color=kit.lin(color)
    o.rotation_euler=(kit.B(target)-o.location).to_track_quat("-Z","Y").to_euler()


for z in (-62,-18,28,64):
    area("Luz alta cálida",(0,30,z),(0,0,z-10),6500,18,"ffedce")
    area("Rebote lateral",(-22,12,z),(10,3,z),2700,12,"dcecf0")
area("Luz del rosetón",(0,20,-84),(0,0,-35),5500,13,"ffe0a0")
bpy.ops.object.camera_add()
cam=bpy.context.object; scene.camera=cam
cam.data.clip_end=350


def shot(filename,eye,target,lens):
    cam.location=kit.B(eye)
    cam.rotation_euler=(kit.B(target)-cam.location).to_track_quat("-Z","Y").to_euler()
    cam.data.lens=lens
    scene.render.filepath=str(ROOT/filename)
    bpy.ops.render.render(write_still=True)


shot("render-juego.png",(1,26,72),(0,7,-34),22)
shot("render-cerca.png",(14.8,5.8,41),(21,2.8,32),33)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/"mundo-coro.blend"))
print("EXPORT",parts,"partes",tris,"triángulos",size//1024,"KB",counts,export_status,flush=True)
