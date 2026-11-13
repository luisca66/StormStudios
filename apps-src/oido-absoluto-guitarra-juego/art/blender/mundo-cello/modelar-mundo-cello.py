"""Resonancia — Dentro del cello. Fuente v1; ejecutar con bpy-run.ps1.

Autoría en Three (Y arriba). No importa ni modifica archivos del juego.
Exporta prototipos en sus pivotes ANTES de preparar la escena de presentación.
No necesita texturas, descargas, fuentes ni complementos externos.
"""
from pathlib import Path
import json
import math
import sys
from collections import defaultdict

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

TAU = math.tau
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection, 170626)
ASSETS = []
BUCKETS = defaultdict(list)


def material(name, rough, emission=0, color="000000", metal=0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = (1, 1, 1, 1)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    p.inputs["Emission Color"].default_value = (*kit.lin(color), 1)
    p.inputs["Emission Strength"].default_value = emission
    vc = m.node_tree.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Pigment"
    m.node_tree.links.new(vc.outputs["Color"], p.inputs["Base Color"])
    return m


WOOD = material("Arce miel satinado", .36)
DARK = material("Filete de ébano", .48)
BRASS = material("Cuerdas entorchadas cálidas", .32, metal=.65)
HAIR = material("Crin marfil", .64)
GLOW = material("Luz al otro lado de las efes", .65, 2.4, "ffd185")
RING = material("Ámbar de la voluta", .3, .22, "ffc477")
CORE = material("Resonancia dorada", .4, 1.7, "ffdb94")


def pigment(p, lo, hi, grain=True):
    # Longitudinal grain and maple flame; encoded in vertices, portable to Three.
    t = .48 + .19 * math.sin(p.x * 3.3 + .20 * math.sin(p.z * .21))
    if grain:
        t += .15 * math.sin(p.x * 12.7 + .12 * p.z)
        t += .11 * math.sin(p.z * .75 + p.x * .35)
    return Vector(kit.lin(lo)).lerp(Vector(kit.lin(hi)), max(0, min(1, t)))


def mesh(name, v, f, mat=WOOD, lo="9c4e22", hi="e7b66c", part="world", seg=None):
    ob = kit.make(name, v, f, mat, part=part, tint=0, smooth_angle=.9)
    attr = ob.data.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
    for vert in ob.data.vertices:
        p = vert.co
        attr.data[vert.index].color = (*pigment(Vector((p.x, p.z, -p.y)), lo, hi), 1)
    ob.data.color_attributes.active_color = attr
    if seg is not None:
        ob["segment"] = seg
    BUCKETS[(part, mat.name, seg)].append(ob)
    return ob


def box(name, size, pos, **kw):
    v, f = kit.g_box(*size)
    return mesh(name, [tuple(Vector(p) + Vector(pos)) for p in v], f, **kw)


def tube(name, points, radius, sides=8, **kw):
    # Direct path sampling: exact predictable topology, no modifiers.
    pts = [Vector(p) for p in points]
    v, f = [], []
    normal = None
    for i, p in enumerate(pts):
        tangent = (pts[min(i + 1, len(pts) - 1)] - pts[max(0, i - 1)]).normalized()
        if normal is None:
            normal = Vector((0, 1, 0)) if abs(tangent.y) < .9 else Vector((1, 0, 0))
        normal = (normal - tangent * normal.dot(tangent)).normalized()
        cross = tangent.cross(normal).normalized()
        for k in range(sides):
            a = TAU * k / sides
            v.append(tuple(p + radius * (math.cos(a) * normal + math.sin(a) * cross)))
    for i in range(len(pts) - 1):
        for k in range(sides):
            a, b = i * sides + k, i * sides + (k + 1) % sides
            f.append((a, b, b + sides, a + sides))
    f += [tuple(reversed(range(sides))), tuple((len(pts) - 1) * sides + k for k in range(sides))]
    return mesh(name, v, f, **kw)


def torus(name, radius, minor, center, steps=64, sides=8, horizontal=False, **kw):
    v, f = kit.g_torus(radius, minor, steps, sides)
    if horizontal:
        v = [(x,z,y) for x,y,z in v]
    return mesh(name, [tuple(Vector(p) + Vector(center)) for p in v], f, **kw)


def width(z):
    # Broad bouts and pinched waist, always outside the 35 m playable rectangle.
    return 25 + 12 * math.exp(-((z - 44) / 29) ** 2) + 9 * math.exp(-((z + 48) / 26) ** 2)


def roof(x, z):
    return 21 + 7 * (1 - (x / width(z)) ** 2)


def grid(name, nu, nv, fn, **kw):
    v = [fn(i / nu, j / nv) for j in range(nv + 1) for i in range(nu + 1)]
    f = []
    for j in range(nv):
        for i in range(nu):
            a = j * (nu + 1) + i
            f.append((a, a + 1, a + nu + 2, a + nu + 1))
    return mesh(name, v, f, **kw)


# Fondo: top surface exactly y=0, continuous clear traversable rectangle.
grid("Fondo de arce con veta", 96, 80,
     lambda u, v: ((2 * u - 1) * width(-90 + 180 * v), 0, -90 + 180 * v),
     lo="ad733d", hi="dfb878")

# Curved ribs. No ornament protrudes into maze x=[-17.5,17.5].
for side in (-1, 1):
    grid("Aro curvado", 1, 96,
         lambda u, v, s=side: (s * width(-90 + 180 * v), 21 * u, -90 + 180 * v))
    for y in (.3, 1.0, 20.3, 20.9):
        tube("Filete perimetral", [(side * width(z), y, z) for z in [-90 + 180 * k / 96 for k in range(97)]],
             .09, 6, mat=DARK, lo="382012", hi="664026")
    for z in (-81, -62, -42, -21, 0, 21, 42, 62, 81):
        box("Contrafuerte del aro", (.55, 20.5, .8), (side * (width(z) - .3), 10.4, z),
            lo="bd8445", hi="edc68c")

# Tapa: at every z row, split the roof around two actual S-shaped f apertures.
# The strip has zero width outside the aperture; no boolean, no roof over the light.
def aperture(z):
    t = max(0, min(1, (z + 35) / 70))
    c = 16.9 + 2.4 * math.sin(TAU * t - .65)
    half = (1.1 + .45 * math.cos(3 * TAU * t)) * math.sin(math.pi * t) ** .5 if -35 < z < 35 else 0
    return c, half


for side in (-1, 1):
    for band in range(2):
        def panel(u, v, s=side, b=band):
            z = -90 + 180 * v
            c, h = aperture(z)
            a, end = (0, c - h) if b == 0 else (c + h, width(z))
            x = s * (a + (end - a) * u)
            return (x, roof(x, z), z)
        grid("Tapa de abeto arqueada", 12, 144, panel, lo="9e5428", hi="dca15d")
    for edge in (-1, 1):
        pts = []
        for k in range(73):
            z = -35 + 70 * k / 72
            c, h = aperture(z)
            x = side * (c + edge * h)
            pts.append((x, roof(x, z) - .02, z))
        tube("Labio tallado de efe", pts, .16, 8, lo="6b331b", hi="b4753d")
    # Warm opaque backing is outside the shell, not a transparent plane over play.
    grid("Cielo dorado detrás de efe", 4, 72,
         lambda u, v, s=side: (s * (aperture(-35 + 70 * v)[0] + (2*u-1)*2.3),
                               30.5, -35 + 70*v), mat=GLOW, lo="f8ba64", hi="ffe6ac")

# End blocks complete the chamber without crossing the maze.
for z in (-90, 90):
    grid("Bloque de culata", 24, 4,
         lambda u, v, zz=z: ((2*u-1)*width(zz), roof((2*u-1)*width(zz), zz)*v, zz))

# Bass bar is a longitudinal beam under the top; soundpost touches both plates.
tube("Barra armónica", [(-11, roof(-11, z)-.65, z) for z in (-76, -50, -25, 0, 25, 50, 76)],
     .65, 10, lo="b88247", hi="edc58b")
tube("Alma de abeto", [(23, .02, -18), (23, roof(23, -18), -18)], 1.05, 24,
     lo="c79558", hi="f1d49d")
for y in (.3, roof(23, -18)-.3):
    torus("Extremo del alma", 1.06, .12, (23, y, -18), steps=32, horizontal=True,
          lo="aa713a", hi="dbad6a")

# Distant bridge: carved ring-prism creates a real arch between two splayed feet.
outer = [(-12, 0), (-11, 5), (-9, 11), (-5, 14), (0, 15), (5, 14), (9, 11), (11, 5), (12, 0)]
inner = [(-8.3, 0), (-8, 3), (-6, 7), (-3.3, 9.2), (0, 10), (3.3, 9.2), (6, 7), (8, 3), (8.3, 0)]
v, f = kit.g_ring_prism(outer, inner, 1.1)
mesh("Puente tallado al fondo", [(x, y, z-76) for x, y, z in v], f, lo="bf8d50", hi="f0d09a")
for x in (-10, 10):
    box("Pie del puente", (5, .7, 3.3), (x, .35, -76), lo="ba8343", hi="ebc78d")
for x in (-6, -2, 2, 6):
    y = 15 - abs(x)*.22
    tube("Una de las cuatro cuerdas", [(x, y+2, -89), (x, y, -76), (x, y+4, -56)],
         .15 if abs(x)==6 else .12, 10, mat=BRASS, lo="8f7150", hi="e5cb94")
    # Hand-cut commas flank the bridge heart (pigment, same maple material).
for s in (-1, 1):
    tube("Calado oscuro del puente", [(s*(5+1.2*math.cos(t)), 10+1.7*math.sin(t), -75.43)
                                     for t in [TAU*k/32 for k in range(33)]], .18, 6,
         mat=DARK, lo="4e2c19", hi="80502c")

# Bow set aside beyond the east maze edge, pale hair visibly separated from stick.
tube("Vara del arco apoyado", [(28, 1.5, -62), (31, 4.2, -29), (30, 4.8, 7), (27, 2, 44)],
     .28, 12, lo="532719", hi="a75c32")
for i in range(5):
    tube("Cinta de crin", [(27.85+i*.075, 1.35, -62), (27.0+i*.075, 1.8, 44)],
         .04, 4, mat=HAIR, lo="d5ba83", hi="fff0c4")
box("Talón de ébano del arco", (1.5, 1.1, 2.5), (28, 1.3, -61),
    mat=DARK, lo="281b14", hi="533a25")

# Instanced walls: beveled octagonal section, exact silhouette dimensions.
def wall(axis, length):
    section = [(-.12,0), (.12,0), (.17,.05), (.17,1.15), (.12,1.2), (-.12,1.2), (-.17,1.15), (-.17,.05)]
    v = []
    for end in (-length/2, length/2):
        for w, y in section:
            v.append((end,y,w) if axis == "x" else (w,y,end))
    f = [(k,(k+1)%8,(k+1)%8+8,k+8) for k in range(8)] + [tuple(reversed(range(8))),tuple(range(8,16))]
    part = "wall_"+axis
    # One material per part: filete is pigment on separate inset geometry.
    mesh("Listón de arce "+axis,v,f,part=part,lo="9b5128",hi="dba261")
    for side in (-1,1):
        for y in (.18,1.02):
            size=(length-.12,.035,.012) if axis=="x" else (.012,.035,length-.12)
            pos=(0,y,side*.166) if axis=="x" else (side*.166,y,0)
            box("Purfling del listón",size,pos,part=part,lo="302016",hi="4b2e1c")
        pts=[]
        for k in range(25):
            t=k/24
            a=TAU*1.3*t
            r=.26*(1-.84*t)
            along=r*math.cos(a)
            y=.6+r*math.sin(a)
            pts.append((along,y,side*.153) if axis=="x" else (side*.153,y,along))
        tube("Voluta grabada",pts,.017,6,part=part,lo="e0b57b",hi="f2d8a6")


wall("x",5.0)
wall("z",5.7)
v,f=kit.g_lathe([(0,0),(.21,0),(.25,.12),(.18,.24),(.18,1.08),(.25,1.2),(.21,1.3),(0,1.35)],12)
mesh("Poste torneado",v,f,part="post",lo="8e4824",hi="dfaf6c")

# Portal authored with ground y=0, origin at its aperture center (0,2.3,0).
PIVOT=(0,2.3,0)
torus("Marco de arce",2.48,.28,PIVOT,steps=96,sides=12,part="portal_frame",lo="85401d",hi="dfab62")
for side in (-1,1):
    box("Pie de voluta",(.7,.7,.85),(side*2.5,.35,0),part="portal_frame")
    pts=[]
    for k in range(97):
        t=k/96
        a=-math.pi/2+TAU*1.65*t
        r=.83*(1-.91*t)
        pts.append((side*(2.1+r*math.cos(a)),4.6+r*math.sin(a),.05))
    tube("Caracol tallado del clavijero",pts,.17,10,part="portal_frame",lo="9d5025",hi="edbd77")
for seg,(radius,minor,z) in enumerate([(2.29,.07,.14),(2.16,.045,.19)]):
    torus("Aro resonante",radius,minor,(0,2.3,z),steps=80,sides=8,part="portal_ring",seg=seg,
          mat=RING,lo="ba7b32",hi="ffda86")
v,f,_=kit.g_disc(2.08,80)
mesh("Centro al abrir",[(x,y+2.3,z-.07) for x,y,z in v],f,mat=CORE,
     part="portal_core",lo="df9d50",hi="ffe2a2")


def join_group(obs, part, matname, seg):
    bpy.ops.object.select_all(action="DESELECT")
    for ob in obs:
        ob.select_set(True)
    bpy.context.view_layer.objects.active=obs[0]
    if len(obs)>1:
        bpy.ops.object.join()
    ob=obs[0]
    ob.name=part+" · "+matname+(" · "+str(seg) if seg is not None else "")
    ob["part"]=part
    if seg is not None:
        ob["segment"]=seg
    pivot=PIVOT if part.startswith("portal_") else (0,0,0)
    bpy.context.scene.cursor.location=kit.B(pivot)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    ASSETS.append(ob)
    return ob


world_segment=0
for (part,matname,seg),obs in BUCKETS.items():
    if part=="world":
        seg=world_segment
        world_segment+=1
    join_group(obs,part,matname,seg)

# Verify final mesh budgets, dimensions and pivots before AO/export.
counts=defaultdict(int)
for ob in ASSETS:
    ob.data.calc_loop_triangles()
    counts[ob["part"]]+=len(ob.data.loop_triangles)
for part in ("wall_x","wall_z","post"):
    assert counts[part]<=1500,(part,counts[part])
assert counts["world"]<=60000,counts
assert sum(n for p,n in counts.items() if p.startswith("portal_"))<=15000,counts
for part,expected in [("wall_x",(5,1.2,.34)),("wall_z",(.34,1.2,5.7)),("post",(.5,1.35,.5))]:
    ob=next(o for o in ASSETS if o["part"]==part)
    bpy.context.view_layer.update()
    dims=(ob.dimensions.x,ob.dimensions.z,ob.dimensions.y)
    assert all(abs(a-b)<.01 for a,b in zip(dims,expected)),(part,dims)  # el filete de 4 mm sobresale

meta=dict(forward="+Z",worldOrigin=[0,0,0],playableBounds=[-17.5,17.5,-50,52.6],
          floorY=0,portalCenter=list(PIVOT),portalSuggestedPosition=[0,2.3,-58],
          soundpost=[23,0,-18],bassBar=[-11,26.35,0],bridge=[0,0,-76],
          fWindows=[[-17,25,0],[17,25,0]],triangleCounts=dict(counts),
          note="Y arriba; world fijo; muros/post en origen; portal centrado en pivote; cuatro cuerdas decorativas al fondo")
export_error=None
try:
    parts,tris,size=kit.export_glb(ROOT/"mundo-cello-juego.glb",objects=ASSETS,meta=meta,
                                 ao={"distance":1.5,"strength":.7},json_path=ROOT/"mundo-cello.json")
except RuntimeError as exc:
    # Only dependency/converter failures have the documented JSON fallback.
    if not any(s in str(exc) for s in ("Node","json-to-glb","npm install")):
        raise
    export_error=str(exc)
    copies,restore=kit.bake_ao(ASSETS,distance=1.5,strength=.7)
    try:
        parts,tris=kit.export_parts(ROOT/"mundo-cello.json",objects=copies,meta=meta)
    finally:
        restore()
    size=0
    with (ROOT/"ENTREGA.md").open("a",encoding="utf-8") as handle:
        handle.write("\n\n## Incidencia de ejecución\n\nGLB de juego pendiente; JSON con AO disponible.\n\n"+export_error+"\n")

bpy.ops.object.select_all(action="DESELECT")
for ob in ASSETS:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/"mundo-cello.glb"),export_format="GLB",
                          use_selection=True,export_extras=True,export_animations=False)

# Presentation only. Hide unplaced prototypes; add linked samples with no part tags.
prototypes={p: [o for o in ASSETS if o["part"]==p] for p in counts if p!="world"}
for obs in prototypes.values():
    for ob in obs:
        ob.hide_render=True


def sample(part,pos):
    for proto in prototypes[part]:
        ob=proto.copy()
        ob.data=proto.data
        bpy.context.collection.objects.link(ob)
        ob.hide_render=False
        ob.location=kit.B(pos)
        for key in list(ob.keys()):
            del ob[key]
        ob.name="PRESENTACIÓN · "+part


for row in range(10):
    z=35-row*5.7
    for col in range(6):
        if (row*3+col*5)%7<3:
            sample("wall_x",(-12.5+col*5,0,z))
        if (row+col*2)%5<2:
            sample("wall_z",(-15+col*5,0,z-2.85))
    for col in (0,2,4,6):
        sample("post",(-15+col*5,0,z))
for part in ("portal_frame","portal_ring","portal_core"):
    sample(part,(0,2.3,-58))

scene=bpy.context.scene
scene.render.engine="CYCLES"
scene.cycles.samples=48
scene.cycles.use_denoising=True
scene.render.resolution_x=1600
scene.render.resolution_y=900
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.view_settings.view_transform="AgX"
scene.world=bpy.data.worlds.new("Luz de taller cálida")
scene.world.use_nodes=True
scene.world.node_tree.nodes["Background"].inputs[0].default_value=(*kit.lin("ffe7bd"),1)
scene.world.node_tree.nodes["Background"].inputs[1].default_value=.25


def area(name,pos,target,power,size,color):
    bpy.ops.object.light_add(type="AREA",location=kit.B(pos))
    ob=bpy.context.object
    ob.name=name
    ob.data.energy=power
    ob.data.shape="DISK"
    ob.data.size=size
    ob.data.color=kit.lin(color)
    ob.rotation_euler=(kit.B(target)-ob.location).to_track_quat("-Z","Y").to_euler()


for side in (-1,1):
    for z in (-24,10,29):
        area("Luz que entra por efe",(side*17,24,z),(side*4,0,z+8),8500,9,"ffd79b")
area("Rebote de madera",(0,14,48),(0,0,-15),6200,16,"ffe7c4")
area("Luz del puente",(0,20,-64),(0,5,-77),5000,10,"ffdc9b")
bpy.ops.object.camera_add()
cam=bpy.context.object
cam.data.lens=24
cam.data.clip_end=400
scene.camera=cam


def shot(filename,eye,target,lens):
    cam.location=kit.B(eye)
    cam.rotation_euler=(kit.B(target)-cam.location).to_track_quat("-Z","Y").to_euler()
    cam.data.lens=lens
    scene.render.filepath=str(ROOT/filename)
    bpy.ops.render.render(write_still=True)


shot("render-juego.png",(0,17.8,65),(0,6,-20),20)
shot("render-cerca.png",(12,5,10),(23,12,-18),24)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/"mundo-cello.blend"))
print("TRIÁNGULOS POR PARTE",json.dumps(dict(counts),ensure_ascii=False),flush=True)
print("EXPORT",parts,"partes",tris,"triángulos",size//1024,"KB",flush=True)
print("DIMENSIONES: z=180; y=30.5; x<75. Revisión visual pendiente de Astra.",flush=True)
