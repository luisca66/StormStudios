"""Resonancia: Dentro del fagot. Fuente reproducible, Y arriba, metros.

Ejecutar con bpy-run.ps1 en la PC de Luis. --audit cuenta la geometría sin
importar bpy, sin cargar Blender y sin escribir archivos. Sin texturas externas.
Las piezas de juego se exportan ANTES de montar la escena de presentación.
"""
from pathlib import Path
import math
import random
import sys
from collections import defaultdict

ROOT = Path(__file__).resolve().parent
TAU = math.tau


def add(a, b):
    return tuple(x + y for x, y in zip(a, b))


def sub(a, b):
    return tuple(x - y for x, y in zip(a, b))


def mul(a, s):
    return tuple(x * s for x in a)


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def cross(a, b):
    return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])


def norm(a):
    return mul(a, 1 / math.sqrt(dot(a, a)))


def bezier(points, steps):
    """Bezier cúbica muestreada; no hay overshoot de las curvas hacia el camino."""
    result = []
    for i in range(steps + 1):
        t = i / steps
        weights = ((1-t)**3, 3*t*(1-t)**2, 3*t*t*(1-t), t**3)
        result.append(tuple(sum(points[k][j]*weights[k] for k in range(4)) for j in range(3)))
    return result


class Design:
    """Plan geométrico puro. Cada entrada se convierte en malla con kit.make."""
    def __init__(self):
        self.items = []

    def mesh(self, name, v, f, material, part="world", segment=None, pigment=None):
        self.items.append(dict(name=name, v=v, f=f, material=material, part=part,
                               segment=segment, pigment=pigment or material))

    def tube(self, name, path, radius, material, sides=16, part="world", segment=None,
             pigment=None, caps=True):
        # Parallel-transport frame. All paths here have distinct points.
        v, f = [], []
        previous = None
        for i, p in enumerate(path):
            tangent = norm(sub(path[min(i+1, len(path)-1)], path[max(0, i-1)]))
            n = previous or ((0, 1, 0) if abs(tangent[1]) < .9 else (1, 0, 0))
            n = sub(n, mul(tangent, dot(n, tangent)))
            if dot(n, n) < 1e-10:
                n = cross(tangent, (0, 0, 1))
            n = norm(n)
            b = cross(tangent, n)
            previous = n
            r = radius[i] if isinstance(radius, (list, tuple)) else radius
            for k in range(sides):
                a = TAU*k/sides
                v.append(add(p, mul(add(mul(n, math.cos(a)), mul(b, math.sin(a))), r)))
        for i in range(len(path)-1):
            for k in range(sides):
                j = (k+1) % sides
                f.append((i*sides+k, i*sides+j, (i+1)*sides+j, (i+1)*sides+k))
        if caps:
            f += [tuple(reversed(range(sides))), tuple((len(path)-1)*sides+k for k in range(sides))]
        self.mesh(name, v, f, material, part, segment, pigment)

    def bar(self, name, a, b, r, material, sides=12, **kw):
        self.tube(name, [a, b], r, material, sides, **kw)

    def ring(self, name, center, radius, thickness, material, normal=(0, 0, 1),
             steps=48, sides=8, part="world", segment=None, pigment=None):
        axis = norm(normal)
        u = norm(cross(axis, (0, 1, 0) if abs(axis[1]) < .9 else (1, 0, 0)))
        w = cross(axis, u)
        v, f = [], []
        for i in range(steps):
            a = TAU*i/steps
            radial = add(mul(u, math.cos(a)), mul(w, math.sin(a)))
            for j in range(sides):
                b = TAU*j/sides
                v.append(add(center, add(mul(radial, radius+thickness*math.cos(b)), mul(axis, thickness*math.sin(b)))))
        for i in range(steps):
            for j in range(sides):
                f.append((i*sides+j, ((i+1)%steps)*sides+j,
                          ((i+1)%steps)*sides+(j+1)%sides, i*sides+(j+1)%sides))
        self.mesh(name, v, f, material, part, segment, pigment)

    def lathe(self, name, center, profile, material, sides=48, part="world", pigment=None):
        v, f = [], []
        n = len(profile)
        for i in range(sides):
            a = TAU*i/sides
            for r, y in profile:
                v.append(add(center, (math.cos(a)*r, y, math.sin(a)*r)))
        for i in range(sides):
            for j in range(n-1):
                f.append((i*n+j, ((i+1)%sides)*n+j, ((i+1)%sides)*n+j+1, i*n+j+1))
        self.mesh(name, v, f, material, part, pigment=pigment)

    def panel(self, name, length, height, depth, material, part, along="x", pigment=None):
        # Chamfered outline; six longitudinal subdivisions carry readable maple grain.
        outline = [(-depth/2, .04), (-depth/2+.04, 0), (depth/2-.04, 0),
                   (depth/2, .04), (depth/2, height-.04), (depth/2-.04, height),
                   (-depth/2+.04, height), (-depth/2, height-.04)]
        v, f = [], []
        for i in range(7):
            x = -length/2 + length*i/6
            for z, y in outline:
                v.append((x, y, z) if along == "x" else (-z, y, x))
        for i in range(6):
            for k in range(8):
                f.append((i*8+k, i*8+(k+1)%8, (i+1)*8+(k+1)%8, (i+1)*8+k))
        f += [tuple(reversed(range(8))), tuple(48+k for k in range(8))]
        self.mesh(name, v, f, material, part, pigment=pigment)

    def key(self, name, center, radius, normal=(0, 0, 1), steps=24):
        """A real cup: silver rolled rim, shallow silver back, inset leather pad."""
        normal = norm(normal)
        self.ring(name+" · reborde", center, radius, radius*.10, "nickel", normal, steps, 6)
        self.bar(name+" · cazoleta", add(center, mul(normal, -.18)),
                 add(center, mul(normal, -.06)), radius*.94, "nickel", steps)
        self.bar(name+" · zapatilla", add(center, mul(normal, -.035)),
                 add(center, mul(normal, .015)), radius*.83, "leather", steps)

    def counts(self):
        counts = defaultdict(int)
        for item in self.items:
            counts[item["part"]] += sum(len(face)-2 for face in item["f"])
        return dict(counts)


def geometry_plan():
    d = Design()
    # The top surface is EXACTLY y=0, including the access to the portal at -70.
    # Shared grid vertices create grain without coplanar overlays or textures.
    v, f = [], []
    nx, nz = 32, 64
    for j in range(nz+1):
        for i in range(nx+1):
            v.append((-22+44*i/nx, 0, -82+146*j/nz))
    for j in range(nz):
        for i in range(nx):
            a = j*(nx+1)+i
            f.append((a, a+nx+1, a+nx+2, a+1))
    d.mesh("Camino continuo de arce", v, f, "floor")
    # Dark wooden edge skirts: no rails or ornaments over the playable footprint.
    for x in (-22, 22):
        d.mesh("Canto del cuerpo", [(x,0,-82),(x,0,64),(x,-1.1,64),(x,-1.1,-82)],
               [(0,1,2,3)], "wood")

    # Seven giant U-shaped bores. All wood stays beyond |x|=23.5.
    grove = [(-30, 40, 22), (31, 26, 28), (-34, 4, 32), (35,-18,36),
             (-32,-37,38), (29,-61,34), (-45,-77,42)]
    for i, (x,z,h) in enumerate(grove):
        sign = 1 if x > 0 else -1
        a, b = x, x+sign*9
        path = [(a,h,z), (a,9,z), (a,5,z), (a+sign*1.3,2.8,z),
                (x+sign*4.5,1.8,z), (b-sign*1.3,2.8,z), (b,5,z), (b,h*.88,z)]
        # Each bend softened with a cubic chain, avoiding a kinked boot joint.
        path = ([(a,h+(4-h)*j/10,z) for j in range(11)] +
                [(x+sign*(4.5-4.5*math.cos(math.pi*j/16)),
                  4-3.1*math.sin(math.pi*j/16),z) for j in range(1,17)] +
                [(b,4+(h*.88-4)*j/10,z) for j in range(1,11)])
        d.tube("Arce doblado %02d"%i, path, 2.65 if i%2 else 3.0, "wood", 24)
        # Joint ferrules and a long key spindle. No generic tree foliage.
        for y in (7.0, h*.60, h*.86):
            d.ring("Virola del tronco", (a,y,z), (2.65 if i%2 else 3.0)+.03,
                   .18, "nickel", (0,1,0), steps=32, sides=6)
        inward = a-sign*3.1
        d.bar("Varilla longitudinal", (inward,5,z+.5), (inward,h-1,z+.5), .19, "nickel")
        for k in range(3):
            y = 9+k*(h-12)/3
            end = (inward-sign*(3.5+k*.7), y+1.8, z+1.4)
            stem = bezier([(inward,y,z+.5), (inward-sign*2,y,z+.5),
                          (end[0],end[1]-.3,end[2]), end], 6)
            d.tube("Rama de mecanismo", stem, .19, "nickel", 10)
            d.key("Hoja de zapatilla", end, 1.05+k*.18, (.1*sign, .25, 1))

    # A silver bridge high above the maze, silhouette entirely above the camera.
    bridge = bezier([(-31,21,-31), (-18,35,-35), (18,35,-35), (35,25,-31)], 28)
    d.tube("Puente de varilla", bridge, .28, "nickel", 12)
    for x,y,z in (bridge[7], bridge[14], bridge[21]):
        d.key("Llave del puente", (x,y-1.2,z), 1.7, (0,-.3,1), steps=28)

    # Tower behind the goal: tapered wooden bore, opening with visible dark return.
    tower = (8,0,-95)
    profile = [(5.6,0),(5.9,1.2),(5.3,3),(4.25,23),(4.45,35),(4.9,43),
               (6.0,48),(6.3,49),(5.65,49.3),(5.2,48),(4.35,43),(3.85,35)]
    d.lathe("Pabellón torre hueca", tower, profile, "wood", 64)
    d.lathe("Sombra dentro del pabellón", tower, [(3.85,35),(3.5,29),(3.5,22)], "bore", 64)
    for y,r in ((1.0,5.9),(24,4.32),(44,5.17),(49,6.05)):
        d.ring("Anillo de la torre", (8,y,-95), r,.22,"nickel",(0,1,0),64,8)
    d.bar("Eje de llaves de torre", (2.5,5,-91),(3.7,43,-91),.24,"nickel",16)
    for k in range(4):
        center = (1.8,11+k*8,-90)
        d.bar("Brazo de torre", (3.0,10+k*8,-91),center,.22,"nickel")
        d.key("Llave de torre", center,1.45,(0,.12,1),32)

    # Crooked bocal and two separate flattened cane blades far from the walkway.
    bocal = bezier([(-29,25,-72),(-12,47,-78),(-13,45,-91),(-18,44,-87)],32)
    d.tube("Tudel curvo", bocal,[.72-.40*i/32 for i in range(33)],"nickel",20)
    tip = bocal[-1]
    direction = norm(sub(tip,bocal[-2]))
    side = norm(cross(direction,(0,0,1)))
    wide = norm(cross(side,direction))
    # Each blade tapers to a fine closed edge, with an actual dark double-reed slit.
    for sign in (-1,1):
        verts, faces = [], []
        for j,(distance,width,gap) in enumerate(((0,.30,.14),(1.1,.61,.21),(3.8,.72,.075),(5.0,.59,.035))):
            c = add(add(tip,mul(direction,distance)),mul(side,sign*gap))
            for u,t in ((-1,0),(1,0),(1,.065),(-1,.065)):
                verts.append(add(add(c,mul(wide,u*width)),mul(side,sign*t)))
        for j in range(3):
            for k in range(4):
                faces.append((j*4+k,j*4+(k+1)%4,(j+1)*4+(k+1)%4,(j+1)*4+k))
        faces += [(3,2,1,0),(12,13,14,15)]
        d.mesh("Caña doble · pala", verts,faces,"cane")
    for distance in (.28,.52,.78):
        d.ring("Atadura de caña",add(tip,mul(direction,distance)),.43,.07,"thread",direction,24,6)

    # Instanced barriers: each has ONE material for the existing instancer.
    for part,length,along in (("wall_x",5.0,"x"),("wall_z",5.7,"z")):
        d.panel("Panel de arce",length,1.2,.28,"composite",part,along,pigment="wood")
        def orient(p):
            return p if along == "x" else (-p[2],p[1],p[0])
        # Rod and cuffs never exceed the required .34 thickness / 1.2 height.
        d.bar("Varilla de muro",orient((-length/2,1.10,0)),orient((length/2,1.10,0)),
              .055,"composite",8,part=part,pigment="nickel")
        for x in (-length*.34,0,length*.34):
            a,b = orient((x,.05,0)),orient((x,1.15,0))
            d.bar("Virola del panel",a,b,.17,"composite",8,part=part,pigment="nickel")
        for x in (-length*.19,length*.19):
            # Small leather key pads on both sides: no one-sided maze walls.
            for sign in (-1,1):
                d.bar("Zapatilla de muro",orient((x,.72,sign*.136)),orient((x,.72,sign*.163)),
                      .16,"composite",12,part=part,pigment="leather")

    d.bar("Poste arce",(0,0,0),(0,1.35,0),.245,"composite",12,part="post",pigment="wood")
    for y in (.10,1.23):
        d.bar("Virola poste",(0,y-.055,0),(0,y+.055,0),.25,"composite",12,part="post",pigment="nickel")

    # Portal canonical local center = (0,0,0); placement is (0,2.3,-70).
    # Its wooden bell lip is a flared annulus with an honest 2.2 clear radius.
    v,f = [],[]
    section = [(2.2,.20),(2.23,.43),(2.40,.66),(2.67,.68),(2.82,.48),
               (2.78,.17),(2.52,-.28),(2.32,-.43),(2.2,-.34),(2.2,.20)]
    n=len(section)
    for i in range(80):
        a=TAU*i/80
        for r,z in section:
            v.append((r*math.cos(a),r*math.sin(a),z))
    for i in range(80):
        for j in range(n-1):
            f.append((i*n+j,((i+1)%80)*n+j,((i+1)%80)*n+j+1,i*n+j+1))
    d.mesh("Labio del pabellón portal",v,f,"wood","portal_frame")
    d.ring("Virola del pabellón portal",(0,0,.52),2.69,.105,"nickel",steps=80,sides=10,part="portal_frame")
    # Feet end at local y=-2.3; the opening's floor is .1 m above grade.
    for sign in (-1,1):
        d.bar("Apoyo del marco",(sign*1.52,-2.3,-.16),(sign*1.52,-1.72,-.16),
              .20,"wood",12,part="portal_frame")
    for seg,(r,z) in enumerate(((2.09,.31),(1.92,.37))):
        d.ring("Aro móvil %d"%seg,(0,0,z),r,.055,"glow",steps=64,sides=8,part="portal_ring",segment=seg)
        # Asymmetric three-key ornaments make axial rotation legible.
        for k in range(3):
            a=TAU*k/3+seg*.43
            c=(r*math.cos(a),r*math.sin(a),z)
            d.bar("Botón de aro",add(c,(0,0,-.03)),add(c,(0,0,.07)),.10,
                  "glow",12,part="portal_ring",segment=seg)
    # Closed shallow lens, opaque: no transparency sorting artifacts when opened.
    # Separate rings can spin; core can scale or vary emissiveIntensity.
    path=[(0,0,-.02),(0,0,.06),(0,0,.10),(0,0,.14),(0,0,.22)]
    d.tube("Corazón de resonancia",path,[.001,1.1,1.76,1.1,.001],"core",64,part="portal_core")
    return d


LIMITS = {"world":60000,"wall_x":1500,"wall_z":1500,"post":1500}


def audit(plan):
    counts=plan.counts()
    for part,limit in LIMITS.items():
        assert counts[part] <= limit, (part,counts[part],limit)
    assert sum(v for k,v in counts.items() if k.startswith("portal_")) <= 15000
    # Bounds include every vertex, with no evaluated modifiers to inflate budgets.
    for part, length in (("wall_x",5.0),("wall_z",5.7)):
        pts=[p for item in plan.items if item["part"]==part for p in item["v"]]
        extent=[max(p[i] for p in pts)-min(p[i] for p in pts) for i in range(3)]
        expected=(length,1.2,.34) if part=="wall_x" else (.34,1.2,length)
        assert all(abs(a-b)<1e-6 for a,b in zip(extent,expected)), (part,extent)
    print("TRIANGULOS POR PARTE",counts,"TOTAL",sum(counts.values()),flush=True)
    return counts


def main():
    plan=geometry_plan()
    counts=audit(plan)
    if "--audit" in sys.argv:
        return
    # Blender is imported ONLY during actual production on Luis's workstation.
    import bpy
    from mathutils import Vector
    sys.path.insert(0,str(ROOT.parents[3]/"grados-mayores-juego"/"art"/"blender"))
    import kit
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    collection=bpy.data.collections.new("FAGOT · piezas canónicas")
    bpy.context.scene.collection.children.link(collection)
    kit.setup(collection,171026)
    # A single material per exported mesh; all color uses vertex pigments.
    specs={"wood":("6f3019","ac6130",.0,.28),
           "floor":("92502c","c38a50",.0,.48),
           "nickel":("87979c","e3e5df",.82,.23),
           "leather":("67402b","c69b66",.0,.78),
           "bore":("160d0a","382014",.0,.72),
           "cane":("b68a42","edcf87",.0,.52),
           "thread":("784c25","b27e35",.15,.56),
           "composite":("ffffff","ffffff",.12,.34),
           "glow":("c5a464","ffe6ac",.45,.25),
           "core":("e9ac58","fff1c2",.05,.32)}
    materials={}
    for key,(dark,light,metal,rough) in specs.items():
        mat=bpy.data.materials.new(key)
        mat.use_nodes=True
        bsdf=mat.node_tree.nodes["Principled BSDF"]
        bsdf.inputs["Base Color"].default_value=(1,1,1,1)
        bsdf.inputs["Metallic"].default_value=metal
        bsdf.inputs["Roughness"].default_value=rough
        vc=mat.node_tree.nodes.new("ShaderNodeVertexColor")
        vc.layer_name="Pigment"
        mat.node_tree.links.new(vc.outputs["Color"],bsdf.inputs["Base Color"])
        if key in ("glow","core"):
            bsdf.inputs["Emission Color"].default_value=(*kit.lin("ffcf83"),1)
            bsdf.inputs["Emission Strength"].default_value=.3 if key=="glow" else 1.4
        materials[key]=mat

    buckets=defaultdict(list)
    rng=random.Random(171026)
    for item in plan.items:
        ob=kit.make(item["name"],item["v"],item["f"],materials[item["material"]],
                    part=item["part"],smooth_angle=.8,tint=0)
        pigment=item["pigment"]
        dark,light,*_=specs[pigment]
        c0,c1=Vector(kit.lin(dark)),Vector(kit.lin(light))
        attr=ob.data.color_attributes.new(name="Pigment",type="FLOAT_COLOR",domain="POINT")
        phase=rng.random()*TAU
        for vertex,p in zip(ob.data.vertices,item["v"]):
            x,y,z=p
            if pigment in ("wood","floor"):
                # Long flowing grain + transverse flamed maple, painted into vertices.
                wave=math.sin(x*3.1+.28*math.sin(z*.23)+y*.09)
                flame=math.sin(z*.75+y*1.8+.45*math.sin(x*.35))
                t=.47+.19*wave+.12*flame
            else:
                t=.52+.15*math.sin(x*.37+y*.43+z*.27+phase)
            attr.data[vertex.index].color=(*c0.lerp(c1,max(0,min(1,t))),1)
        ob.data.color_attributes.active_color=attr
        # Consolidate by part/segment/material, never collapsing distinct finishes.
        buckets[(item["part"],item["segment"],item["material"])].append(ob)
    meshes=[]
    world_segment=0
    for (part,segment,material),objects in buckets.items():
        bpy.ops.object.select_all(action="DESELECT")
        for ob in objects:
            ob.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1:
            bpy.ops.object.join()
        ob=bpy.context.object
        ob.name=part+"__"+material+("__%d"%segment if segment is not None else "")
        ob["part"]=part
        if part=="world":
            segment=world_segment
            world_segment+=1
        if segment is not None:
            ob["segment"]=segment
        # Every canonical pivot is zero; portal coordinates are local to aperture.
        bpy.context.scene.cursor.location=(0,0,0)
        bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
        meshes.append(ob)
    meta=dict(forward="+Z",units="meters",worldOrigin=[0,0,0],
              mazeBounds=dict(x=[-17.5,17.5],z=[-50,52.6],floorY=0),
              portalPlacement=[0,2.3,-70],portalPivotConvention="local aperture center at zero",
              portalClearRadius=2.2,towerTop=[8,49.3,-95],bocalEnd=list(tip_position()),
              triangleCounts=counts,
              note="Place portal group at portalPlacement; world remains at origin. Preview copies are not exported.")

    # Verify evaluated counts too: catch accidental modifiers or join regressions.
    evaluated=defaultdict(int)
    for ob in meshes:
        ob.data.calc_loop_triangles()
        evaluated[ob["part"]]+=len(ob.data.loop_triangles)
    assert dict(evaluated)==counts,(dict(evaluated),counts)
    bpy.context.view_layer.update()
    export_status="GLB de juego con AO 1.5 / 0.7"
    # Canonical prototypes share the origin, but do NOT coexist in the level.
    # Isolate bake groups to prevent crossed walls/portal darkening each other.
    # This changes only the imported module in this process, never kit.py on disk.
    standard_bake=kit.bake_ao

    def isolated_bake(objects, **options):
        groups=defaultdict(list)
        for ob in objects:
            key="portal" if ob["part"].startswith("portal_") else ob["part"]
            groups[key].append(ob)
        copies,callbacks=[],[]

        def restore_all():
            # Reverse order matters: later bakes saved earlier copies' visibility.
            for callback in reversed(callbacks):
                callback()

        try:
            for group in groups.values():
                batch,restore=standard_bake(group,**options)
                callbacks.append(restore)
                copies.extend(batch)
        except Exception:
            restore_all()
            raise
        return copies,restore_all

    kit.bake_ao=isolated_bake
    try:
        parts,tris,size=kit.export_glb(ROOT/"mundo-fagot-juego.glb",objects=meshes,meta=meta,
                 ao={"distance":1.5,"strength":.7},json_path=ROOT/"mundo-fagot.json")
    except RuntimeError as exc:
        # Only the documented Node/converter fallback. Never silently discard AO.
        if "Node" not in str(exc) and "json-to-glb" not in str(exc):
            raise
        copies,restore=kit.bake_ao(meshes,distance=1.5,strength=.7)
        try:
            parts,tris=kit.export_parts(ROOT/"mundo-fagot.json",objects=copies,meta=meta)
        finally:
            restore()
        size=0
        export_status="PENDIENTE GLB de juego: "+str(exc)
        print(export_status,flush=True)
    finally:
        kit.bake_ao=standard_bake

    bpy.ops.object.select_all(action="DESELECT")
    for ob in meshes:
        ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(ROOT/"mundo-fagot.glb"),export_format="GLB",
          use_selection=True,export_extras=True,export_animations=False,
          export_materials="EXPORT")

    # Presentation only: hide the canonical reusable kit and make linked copies.
    preview=bpy.data.collections.new("PRESENTACIÓN · no exportar al juego")
    bpy.context.scene.collection.children.link(preview)
    for ob in meshes:
        if ob["part"]!="world":
            ob.hide_render=True
            ob.hide_set(True)

    def place(part,pos,segment=None):
        result=[]
        for original in meshes:
            if original["part"]!=part or (segment is not None and original.get("segment")!=segment):
                continue
            ob=original.copy()
            ob.data=original.data
            preview.objects.link(ob)
            ob.name="VISTA__"+original.name
            del ob["part"]
            if "segment" in ob:
                del ob["segment"]
            ob.hide_render=False
            ob.hide_set(False)
            ob.location=kit.B(pos)
            result.append(ob)
        return result

    # A sparse but connected maze excerpt on the actual 5 x 5.7 grid.
    posts=set()
    for row in range(13):
        z=47.6-row*5.7
        for col in range(6):
            x=-12.5+col*5
            if (row*3+col)%5 in (0,1) and not (col==3 and row%3==0):
                place("wall_x",(x,0,z))
                posts.update(((x-2.5,z),(x+2.5,z)))
            if (row+col*2)%7 in (0,2):
                xx=x-2.5
                place("wall_z",(xx,0,z-2.85))
                posts.update(((xx,z),(xx,z-5.7)))
    for x,z in sorted(posts):
        place("post",(x,0,z))
    for part in ("portal_frame","portal_ring","portal_core"):
        place(part,(0,2.3,-70))

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
    world=bpy.data.worlds.new("Ámbar en el interior")
    world.use_nodes=True
    scene.world=world
    world.node_tree.nodes["Background"].inputs[0].default_value=(*kit.lin("354449"),1)
    world.node_tree.nodes["Background"].inputs[1].default_value=.45

    def area(name,pos,target,power,size,color):
        data=bpy.data.lights.new(name,"AREA")
        data.energy=power
        data.shape="DISK"
        data.size=size
        data.color=kit.lin(color)
        ob=bpy.data.objects.new(name,data)
        preview.objects.link(ob)
        ob.location=kit.B(pos)
        ob.rotation_euler=(kit.B(target)-ob.location).to_track_quat("-Z","Y").to_euler()

    area("Claridad de taller",(-20,45,30),(0,0,-10),70000,45,"ffe0b4")
    area("Luz al fondo",(10,52,-78),(0,4,-35),85000,35,"ffd099")
    area("Reflejo frío del níquel",(43,25,0),(0,12,-25),55000,30,"b2d8e4")
    area("Luz del detalle",(-18,12,22),(-26,10,2),6000,12,"ffe1b0")
    camera_data=bpy.data.cameras.new("Cámara de revisión")
    camera=bpy.data.objects.new("Cámara de revisión",camera_data)
    preview.objects.link(camera)
    scene.camera=camera
    camera_data.clip_end=500
    camera_data.lens=38

    def shot(filename,eye,target,lens):
        camera.location=kit.B(eye)
        camera.rotation_euler=(kit.B(target)-camera.location).to_track_quat("-Z","Y").to_euler()
        camera.data.lens=lens
        scene.render.filepath=str(ROOT/filename)
        bpy.ops.render.render(write_still=True)

    shot("render-juego.png",(66,63,102),(0,13,-24),38)
    # Close enough to judge maple, rolled metal rim and leather cup, together.
    shot("render-cerca.png",(-13,16,23),(-28,12,5),48)
    # Save the opening view in the editable .blend, preserving canonical parts.
    camera.location=kit.B((66,63,102))
    camera.rotation_euler=(kit.B((0,13,-24))-camera.location).to_track_quat("-Z","Y").to_euler()
    camera.data.lens=38
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/"mundo-fagot.blend"))
    print("EXPORT",parts,"mallas",tris,"triángulos",size//1024,"KiB",flush=True)
    print("ESTADO",export_status,flush=True)
    print("REVISIÓN VISUAL PENDIENTE: devolver ambos renders a Astra.",flush=True)


def tip_position():
    return (-18,44,-87)


if __name__=="__main__":
    main()
