"""Resonancia — Dentro del corno. Astra, v1.

Autoría Y arriba. Geometría determinista, sin dependencias hasta main().
Ejecutar con bpy-run.ps1 en la PC de Luis. --audit cuenta sin cargar Blender.
Los prototipos se exportan ANTES de componer el laberinto de demostración.
"""
from pathlib import Path
import math
import sys
import json
from collections import defaultdict

ROOT = Path(__file__).resolve().parent
TAU = math.tau


def add(a, b):
    return tuple(x + y for x, y in zip(a, b))


def mul(a, s):
    return tuple(x * s for x in a)


def sub(a, b):
    return add(a, mul(b, -1))


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def cross(a, b):
    return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])


def norm(a):
    return mul(a, 1 / max(1e-12, math.sqrt(dot(a, a))))


class Mesh:
    def __init__(self, name, part, material, pivot=(0, 0, 0), segment=None):
        self.name, self.part, self.material = name, part, material
        self.pivot, self.segment = pivot, segment
        self.v, self.f, self.c = [], [], []

    def append(self, verts, faces, color):
        offset = len(self.v)
        for p in verts:
            self.v.append(p)
            # Variación continua y sutil del latón; veta de madera longitudinal.
            k = 0.94 + 0.06 * math.sin(p[0]*0.31 + p[1]*0.21 + p[2]*0.09)
            if self.material == 'wood':
                k = 0.91 + 0.09 * math.sin(p[0]*8.7 + math.sin(p[2]*0.12))
            self.c.append(tuple(min(1, c*k) for c in color))
        self.f.extend(tuple(i+offset for i in face) for face in faces)

    @property
    def tris(self):
        return sum(len(f)-2 for f in self.f)


GOLD = (0.78, 0.43, 0.12)
PALE = (0.95, 0.68, 0.27)
DARK = (0.32, 0.15, 0.045)
SILVER = (0.64, 0.72, 0.70)
WOOD = (0.29, 0.12, 0.055)
LIGHT = (1.0, 0.66, 0.23)


def box(m, center, size, color):
    x, y, z = (s/2 for s in size)
    v = [add(center, p) for p in [(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),
                                 (-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]]
    m.append(v, [(0,3,2,1),(4,5,6,7),(0,1,5,4),(2,3,7,6),(1,2,6,5),(0,4,7,3)], color)


def sweep(m, points, radius, color=GOLD, sides=12, caps=True):
    """Tubo por transporte paralelo; cada punto es una sección explícita."""
    v, f = [], []
    tangent = norm(sub(points[1], points[0]))
    ref = (0,1,0) if abs(tangent[1]) < 0.9 else (1,0,0)
    normal = norm(sub(ref, mul(tangent, dot(ref,tangent))))
    for i, p in enumerate(points):
        t = norm(sub(points[min(i+1,len(points)-1)], points[max(i-1,0)]))
        normal = norm(sub(normal, mul(t,dot(normal,t))))
        binormal = cross(t,normal)
        for j in range(sides):
            a = TAU*j/sides
            v.append(add(p,mul(add(mul(normal,math.cos(a)),mul(binormal,math.sin(a))),radius)))
    for i in range(len(points)-1):
        for j in range(sides):
            k = (j+1)%sides
            f.append((i*sides+j,(i+1)*sides+j,(i+1)*sides+k,i*sides+k))
    if caps:
        f.extend([tuple(reversed(range(sides))),tuple((len(points)-1)*sides+j for j in range(sides))])
    m.append(v,f,color)


def torus(m, center, radius, tube, color=PALE, seg=64, sides=8, plane='xy'):
    v, f = [], []
    for i in range(seg):
        a = TAU*i/seg
        for j in range(sides):
            b = TAU*j/sides
            p = ((radius+tube*math.cos(b))*math.cos(a),
                 (radius+tube*math.cos(b))*math.sin(a),tube*math.sin(b))
            if plane == 'xz':
                p = (p[0],p[2],p[1])
            v.append(add(center,p))
    for i in range(seg):
        for j in range(sides):
            f.append((i*sides+j,((i+1)%seg)*sides+j,
                      ((i+1)%seg)*sides+(j+1)%sides,i*sides+(j+1)%sides))
    m.append(v,f,color)


def lathe(m, center, profile, color=GOLD, seg=64):
    """Perfil (radio,Z), eje +Z; perfil cerrado = espesor sin DoubleSide."""
    v, f = [], []
    n = len(profile)
    for i in range(seg):
        a = TAU*i/seg
        v.extend(add(center,(r*math.cos(a),r*math.sin(a),z)) for r,z in profile)
    for i in range(seg):
        for j in range(n-1):
            a,b,c,d = i*n+j,((i+1)%seg)*n+j,((i+1)%seg)*n+j+1,i*n+j+1
            if profile[j][0] == 0:
                f.append((a,c,d))
            elif profile[j+1][0] == 0:
                f.append((a,b,c))
            else:
                f.append((a,b,c,d))
    m.append(v,f,color)


def cylinder(m, a, b, radius, color=GOLD, sides=24):
    sweep(m,[a,b],radius,color,sides)


def build():
    world = Mesh('Salón de latón','world','brass',segment=0)
    nickel = Mesh('Níquel de mecanismos','world','nickel',segment=1)
    floor = Mesh('Tarima de la caja','world','wood',segment=2)
    glow = Mesh('Luceros del taller','world','glow',segment=3)
    # 88 × 192, cara superior exactamente Y=0, sin relieves en la zona caminable.
    for i in range(22):
        box(floor,(-42+4*i,-0.5,-12),(3.985,1,192),mul(WOOD,0.88+0.012*i))
    # Molduras fuera del rectángulo del laberinto.
    for x in (-44,44):
        cylinder(world,(x,0.1,-108),(x,0.1,84),0.22,PALE,12)
    # Tres vueltas gigantes: secciones inferiores bajo el piso, superiores como bóvedas.
    for k,z in enumerate((-37,-4,30)):
        pts = [(29*math.cos(TAU*i/112),10+20*math.sin(TAU*i/112),
                z+3.5*math.sin(2*TAU*i/112)) for i in range(113)]
        sweep(world,pts,1.25+0.12*k,GOLD,16)
        # Abrazaderas de níquel visibles a ambos lados, sin invadir los pasillos.
        for side in (-1,1):
            torus(nickel,(side*29,10,z),1.42+0.12*k,0.10,SILVER,32,6)
    # Serpentín exterior largo, con espiras legibles desde la cámara del jugador.
    for side in (-1,1):
        pts = [(side*(34+5*math.cos(TAU*i/100)),7+4*math.sin(TAU*i/100),
                63-152*i/100) for i in range(101)]
        sweep(world,pts,1.05,GOLD,14)
    # Trois corps de valves rotatives, axes Z (pas de pistons verticaux).
    for i in range(3):
        x,z = -29-7*i,-13-5*i
        cylinder(world,(x,7,z-2.2),(x,7,z+2.2),2.55,GOLD,48)
        cylinder(nickel,(x,7,z+2.2),(x,7,z+2.42),2.28,SILVER,48)
        torus(world,(x,7,z+2.45),2.25,0.12,PALE,48,8)
        cylinder(world,(x,7,z+2.4),(x,7,z+3),0.64,DARK,24)
        sweep(nickel,[(x,7,z+3),(x+1.4,9,z+3.1),(x+2,12,z+2.5)],0.25,SILVER,10)
        cylinder(world,(x+1.25,12,z+2.5),(x+2.75,12,z+2.5),0.62,PALE,24)
        # Boucles de raccordement et collier de sortie.
        pts = [(x+2.2+3*math.cos(math.pi*j/32),7+3*math.sin(math.pi*j/32),z-1) for j in range(33)]
        sweep(world,pts,0.62,GOLD,12)
    # Bombas de afinación: U dobles largas con tubos de níquel deslizantes.
    for i in range(3):
        x,z,h = 24+7*i,-33+22*i,9+3*i
        pts = [(x,2,z),(x,h,z)]
        pts += [(x+2.2-2.2*math.cos(math.pi*j/24),h+2.2*math.sin(math.pi*j/24),z) for j in range(1,25)]
        pts += [(x+4.4,2,z)]
        sweep(world,pts,0.66,GOLD,14)
        for dx in (0,4.4):
            cylinder(nickel,(x+dx,1.5,z),(x+dx,4.5,z),0.70,SILVER,24)
        sweep(nickel,[(x+1.4,h+1.6,z),(x+3,h+1.6,z)],0.17,SILVER,10)
    # Campana monumentale: esterno e interno continui, bordo arrotolato.
    outer = [(2.8,-30),(3.2,-25),(4,-20),(5.5,-15),(8,-10),(12,-6),(18,-2),(25,0)]
    inner = [(24.65,-0.2),(17.7,-2.3),(11.7,-6.3),(7.7,-10.3),(5.2,-15.3),(3.7,-20.3),(2.9,-25),(2.5,-30)]
    lathe(world,(0,24,-80),outer+inner+[outer[0]],PALE,112)
    torus(world,(0,24,-80),24.85,0.42,PALE,112,12)
    # Ciselure du pavillon: pétales géométriques très fins sur la lèvre.
    for i in range(24):
        a = TAU*i/24
        pts = [(r*math.cos(a+0.018*math.sin(math.pi*j/8)),
                24+r*math.sin(a+0.018*math.sin(math.pi*j/8)),-79.7-0.10*j)
               for j,r in enumerate([22.5,22.7,23,23.3,23.5,23.3,23,22.7,22.5])]
        sweep(world,pts,0.065,DARK,6)
    # Boquilla distante hacia el inicio; su copa plateada mira +Z.
    sweep(world,[(28,5,58),(35,9,66),(32,15,76),(22,17,79)],0.75,GOLD,16)
    lathe(nickel,(22,17,79),[(0.75,0),(0.9,2),(2.2,3),(2.35,3.3),(2.05,3.3),(0.6,2),(0.55,0),(0.75,0)],SILVER,48)
    # Luciérnagas de metal esmaltado, acotadas a los bordes; no dependen de bloom.
    for i in range(20):
        x = (-1 if i%2 else 1)*(20+3*math.sin(i*2.4))
        z = -57+6*i
        cylinder(world,(x,0,z),(x,2.5,z),0.11,DARK,8)
        lathe(glow,(x,2.8,z),[(0,-0.18),(0.24,0),(0,0.18)],LIGHT,12)
    # Módulos repetibles: panel opaco, raíles redondos y remaches; un material.
    modules = []
    for part,length,along_z in [('wall_x',5,False),('wall_z',5.7,True)]:
        m = Mesh(part,part,'brass')
        def p(x,y,z):
            return (z,y,x) if along_z else (x,y,z)
        box(m,p(0,0.53,0),(0.20,0.88,length) if along_z else (length,0.88,0.20),DARK)
        for y,r in [(0.17,0.11),(1.03,0.17)]:
            cylinder(m,p(-length/2,y,0),p(length/2,y,0),r,PALE,12)
        for x in (-length/2+0.16,length/2-0.16):
            cylinder(m,p(x,0.15,0),p(x,1.05,0),0.13,GOLD,10)
            for z in (-0.14,0.14):
                cylinder(m,p(x,0.53,z-0.015),p(x,0.53,z+0.015),0.065,PALE,8)
        # Frise en chevrons, entièrement contenue dans l'épaisseur 0.34.
        for x in (-1.2,0,1.2):
            for side in (-1,1):
                sweep(m,[p(x-0.35,0.52,side*0.12),p(x,0.76,side*0.12),p(x+0.35,0.52,side*0.12)],0.025,PALE,6)
        modules.append(m)
    post = Mesh('Cabestan de jonction','post','brass')
    cylinder(post,(0,0,0),(0,1.18,0),0.20,GOLD,16)
    cylinder(post,(0,0,0),(0,0.12,0),0.25,DARK,16)
    cylinder(post,(0,1.18,0),(0,1.30,0),0.25,PALE,16)
    torus(post,(0,1.27,0),0.19,0.06,PALE,24,8,plane='xz')
    # Portal: hueco radio 2.2; todos los pivotes en (0,2.3,0), frente +Z.
    pivot = (0,2.3,0)
    frame = Mesh('Borde de campana de la meta','portal_frame','brass',pivot)
    lathe(frame,pivot,[(2.2,-0.4),(2.3,-0.65),(2.55,-0.8),(2.85,-0.7),(3.02,-0.35),
                       (3.05,0),(2.95,0.15),(2.8,0.1),(2.55,-0.12),(2.2,-0.4)],GOLD,80)
    torus(frame,add(pivot,(0,0,0.1)),2.96,0.10,PALE,80,10)
    for x in (-2.2,2.2):
        box(frame,(x,0.17,-0.3),(1,0.34,1.1),DARK)
    for i in range(12):
        a = TAU*i/12
        cylinder(frame,(2.8*math.cos(a),2.3+2.8*math.sin(a),0.1),
                 (2.8*math.cos(a),2.3+2.8*math.sin(a),0.18),0.065,PALE,8)
    rings = []
    for i,r in enumerate((2.30,2.50)):
        m = Mesh('Aro orbital '+str(i),'portal_ring','brass',pivot,i)
        torus(m,add(pivot,(0,0,0.22+i*0.13)),r,0.045,PALE,80,8)
        for j in range(7):
            a = TAU*j/7+i*0.2
            cylinder(m,(r*math.cos(a),2.3+r*math.sin(a),0.20+i*0.13),
                     (r*math.cos(a),2.3+r*math.sin(a),0.30+i*0.13),0.085,PALE,10)
        rings.append(m)
    core = Mesh('Semilla de resonancia','portal_core','glow',pivot)
    # Coque biconvexe opaque: pas de tri des transparences et pas de faces uniques.
    lathe(core,pivot,[(0,-0.02),(0.75,0.02),(1.55,0.06),(2.12,0.12),
                      (1.55,0.18),(0.75,0.22),(0,0.24)],LIGHT,80)
    return [world,nickel,floor,glow]+modules+[post,frame]+rings+[core]


def audit(meshes):
    counts = defaultdict(int)
    for m in meshes:
        counts[m.part] += m.tris
        assert len(m.v) == len(m.c)
        assert all(math.isfinite(x) for p in m.v for x in p)
    assert counts['world'] <= 60000, counts
    for p in ('wall_x','wall_z','post'):
        assert counts[p] <= 1500, counts
    assert sum(counts[p] for p in ('portal_frame','portal_ring','portal_core')) <= 15000
    for m in meshes:
        if m.part in ('wall_x','wall_z'):
            ranges = [(min(v[i] for v in m.v),max(v[i] for v in m.v)) for i in range(3)]
            assert abs(ranges[1][1]-1.2)<1e-8 and ranges[1][0]>=0
            thick_axis = 0 if m.part=='wall_z' else 2
            assert ranges[thick_axis][1]-ranges[thick_axis][0] <= 0.340001
    return dict(counts)


def main():
    meshes = build()
    counts = audit(meshes)
    print('TRIANGULOS',json.dumps(counts,ensure_ascii=False),'TOTAL',sum(counts.values()),flush=True)
    if '--audit' in sys.argv:
        return
    import bpy
    from mathutils import Vector
    sys.path.insert(0,str(ROOT.parents[3]/'grados-mayores-juego'/'art'/'blender'))
    import kit
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    kit.setup(bpy.context.collection,17026)
    mats = {}
    for key,metal,rough,emission in [('brass',0.72,0.29,0),('nickel',0.80,0.24,0),
                                    ('wood',0.0,0.74,0),('glow',0.12,0.30,1.8)]:
        mat = bpy.data.materials.new(key)
        mat.use_nodes=True
        bsdf=mat.node_tree.nodes['Principled BSDF']
        bsdf.inputs['Base Color'].default_value=(1,1,1,1)
        bsdf.inputs['Metallic'].default_value=metal
        bsdf.inputs['Roughness'].default_value=rough
        vc=mat.node_tree.nodes.new('ShaderNodeVertexColor'); vc.layer_name='Pigment'
        mat.node_tree.links.new(vc.outputs['Color'],bsdf.inputs['Base Color'])
        if emission:
            mat.node_tree.links.new(vc.outputs['Color'],bsdf.inputs['Emission Color'])
            bsdf.inputs['Emission Color'].default_value=(*LIGHT,1)
            bsdf.inputs['Emission Strength'].default_value=emission
        mats[key]=mat
    objects=[]
    for m in meshes:
        ob=kit.make(m.name,m.v,m.f,mats[m.material],part=m.part,tint=0,smooth_angle=0.9)
        attr=ob.data.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='POINT')
        for i,c in enumerate(m.c):
            attr.data[i].color=(*c,1)
        ob.data.color_attributes.active_color=attr
        if m.segment is not None:
            ob['segment']=m.segment
        bpy.context.scene.cursor.location=kit.B(m.pivot)
        bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
        bpy.context.view_layer.objects.active=ob
        bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
        objects.append(ob)
    meta=dict(forward='+Z',worldOrigin=[0,0,0],floorY=0,
              mazeBounds=dict(x=[-17.5,17.5],z=[-50,52.6]),
              portalPlacement=[0,2.3,-61],portalPivot=[0,2.3,0],portalHoleRadius=2.2,
              portalRingSpeeds=[0.14,-0.10],trianglesByPart=counts,
              note='Prototipos en pivotes de contrato; portal trasladar Z=-61, sin sumar otra altura.')
    # El fallback conserva el JSON con AO que export_glb ya haya escrito.
    export_status='GLB de juego con AO correcto'
    try:
        parts,tris,size=kit.export_glb(ROOT/'mundo-corno-juego.glb',objects=objects,meta=meta,
                                      ao={'distance':1.5,'strength':0.7},json_path=ROOT/'mundo-corno.json')
        print('EXPORT',parts,'partes',tris,'triángulos',size//1024,'KB',flush=True)
    except RuntimeError as exc:
        if 'Node' not in str(exc) and 'json-to-glb' not in str(exc):
            raise
        if not (ROOT/'mundo-corno.json').exists():
            kit.export_parts(ROOT/'mundo-corno.json',objects=objects,meta=meta)
        export_status='FALTA GLB DE JUEGO: '+str(exc)
        print(export_status,flush=True)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:
        ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'mundo-corno.glb'),export_format='GLB',
                              use_selection=True,export_extras=True,export_animations=False)
    # A partir de aquí: escena de presentación. Las copias no llevan `part`.
    preview=bpy.data.collections.new('SOLO RENDER · laberinto de muestra')
    bpy.context.scene.collection.children.link(preview)
    proto={o['part']:o for o in objects if o['part'] in ('wall_x','wall_z','post')}
    for o in proto.values():
        o.hide_render=True; o.hide_set(True)
    def instance(part,pos):
        ob=proto[part].copy(); ob.data=proto[part].data
        preview.objects.link(ob)
        del ob['part']
        ob.hide_render=False; ob.hide_set(False); ob.location=kit.B(pos)
    for row in range(13):
        z=-44+row*7
        for col in range(6):
            x=-12.5+col*5
            if (row+col)%3 != 0:
                instance('wall_x',(x,0,z))
            if (2*row+col)%4 == 0:
                instance('wall_z',(x-2.5,0,z+2.85))
            if (row+col)%2 == 0:
                instance('post',(x-2.5,0,z))
    for ob in objects:
        if ob['part'].startswith('portal_'):
            ob.location += kit.B((0,0,-61))
    scene=bpy.context.scene
    scene.render.engine='CYCLES'; scene.cycles.samples=64
    scene.cycles.use_denoising=True
    scene.render.resolution_x=1600; scene.render.resolution_y=900
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.view_settings.view_transform='AgX'
    world=bpy.data.worlds.new('Atardecer de taller'); world.use_nodes=True; scene.world=world
    world.node_tree.nodes['Background'].inputs[0].default_value=(*kit.lin('b4c5d3'),1)
    world.node_tree.nodes['Background'].inputs[1].default_value=0.45
    def area(name,pos,target,power,color,size):
        data=bpy.data.lights.new(name,'AREA'); data.energy=power
        data.shape='DISK'; data.size=size; data.color=kit.lin(color)
        ob=bpy.data.objects.new(name,data); scene.collection.objects.link(ob)
        ob.location=kit.B(pos)
        ob.rotation_euler=(kit.B(target)-ob.location).to_track_quat('-Z','Y').to_euler()
    area('Techo cálido',(-20,46,15),(0,0,-10),65000,'ffe3b0',45)
    area('Campana al atardecer',(0,30,-68),(0,10,10),42000,'ffc37a',35)
    area('Reflejo de níquel',(45,26,15),(0,8,-10),42000,'dce9ff',32)
    area('Relleno frontal',(0,22,70),(0,5,-25),35000,'ffeacb',35)
    bpy.ops.object.camera_add(); camera=bpy.context.object; scene.camera=camera
    camera.data.clip_end=500; camera.data.lens=30
    def shot(name,eye,target,lens):
        camera.location=kit.B(eye)
        camera.rotation_euler=(kit.B(target)-camera.location).to_track_quat('-Z','Y').to_euler()
        camera.data.lens=lens; scene.render.filepath=str(ROOT/name)
        bpy.ops.render.render(write_still=True)
    shot('render-juego.png',(48,49,94),(0,10,-25),30)
    shot('render-cerca.png',(-14,17,7),(-34,8,-18),42)
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'mundo-corno.blend'))
    # Registro reproducible sin adelantar la aprobación visual de Astra.
    delivery=ROOT/'ENTREGA.md'
    if delivery.exists():
        content=delivery.read_text(encoding='utf-8').split('\n<!-- EJECUCION -->')[0]
        content+='\n<!-- EJECUCION -->\n## Resultado de ejecución\n\n'
        content+='Triángulos verificados: `'+json.dumps(counts,ensure_ascii=False)+'`.\n\n'
        content+=export_status+'\n\nRenders generados; revisión visual de Astra pendiente.\n'
        delivery.write_text(content,encoding='utf-8')


if __name__=='__main__':
    main()
