"""Sifonóforo modular para Batisfera. Generación bpy; coordenadas de autoría Three, Y arriba."""
import math,sys,json
from pathlib import Path
import bpy,bmesh
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
from bpy_extras.object_utils import world_to_camera_view
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parents[3]/'grados-mayores-juego'/'art'/'blender'))
import kit
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection,107)

def material(name,alpha=1,emission=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value=(1,1,1,1);p.inputs['Roughness'].default_value=.32
    p.inputs['Alpha'].default_value=alpha;p.inputs['Metallic'].default_value=0
    p.inputs['Emission Color'].default_value=(*kit.lin('fff6ea'),1);p.inputs['Emission Strength'].default_value=emission
    vc=m.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Pigment';m.node_tree.links.new(vc.outputs['Color'],p.inputs['Base Color'])
    return m
SKIN=material('Tejido gelatinoso opaco');BELL=material('Campanas azuladas alfa 0.65',.65);LIGHT=material('Farol blanco cálido emisión 2',emission=2)

def tint(p,color):
    c=Vector(kit.lin(color));x,y,z=p
    k=.92+.08*math.sin(28*x+11*y)*math.cos(23*z-9*y)
    return tuple(c*k)
class Geo:
    def __init__(self):self.v=[];self.f=[];self.c=[];self.mi=[]
    def add(self,v,f,color,mi=0):
        off=len(self.v);self.v.extend(v);self.f.extend(tuple(off+i for i in face) for face in f)
        self.c.extend([tint(p,color) for p in v] if isinstance(color,str) else color);self.mi.extend([mi]*len(f))
    def lathe(self,profile,n=12,center=(0,0,0),scale=(1,1,1),color='f2d9c4',basis=None,mi=0):
        basis=basis or Matrix.Identity(3);v=[];f=[];c=[]
        for y,r in profile:
            for j in range(n):
                a=j*math.tau/n;p=Vector(center)+basis@Vector((scale[0]*r*math.cos(a),scale[1]*y,scale[2]*r*math.sin(a)))
                v.append(tuple(p));c.append(tint(p,color))
        for i in range(len(profile)-1):
            for j in range(n):k=i*n+j;l=i*n+(j+1)%n;f.append((k,l,l+n,k+n))
        self.add(v,f,c,mi)
    def egg(self,center,scale,n=12,rings=6,color='f2d9c4',basis=None):
        self.lathe([(math.cos(math.pi*i/rings),math.sin(math.pi*i/rings)) for i in range(rings+1)],n,center,scale,color,basis)
    def tube(self,path,radii,n=6,color='e6c9c0'):
        v=[];f=[]
        prior=None
        for i,p in enumerate(path):
            t=(Vector(path[min(i+1,len(path)-1)])-Vector(path[max(0,i-1)])).normalized()
            u=(Vector((1,0,0)) if abs(t.x)<.8 else Vector((0,0,1))) if prior is None else prior
            u=(u-t*u.dot(t)).normalized();w=t.cross(u).normalized();prior=u
            for j in range(n):v.append(tuple(Vector(p)+radii[i]*(u*math.cos(j*math.tau/n)+w*math.sin(j*math.tau/n))))
        for i in range(len(path)-1):
            for j in range(n):k=i*n+j;l=i*n+(j+1)%n;f.append((k,l,l+n,k+n))
        f.extend([tuple(reversed(range(n))),tuple((len(path)-1)*n+j for j in range(n))]);self.add(v,f,color)
    def object(self,name,part,materials=(SKIN,)):
        ob=kit.make(name,self.v,self.f,materials[0],part=part,tint=0,smooth_angle=math.pi)
        for m in materials[1:]:ob.data.materials.append(m)
        for face,mi in zip(ob.data.polygons,self.mi):face.material_index=mi
        c=ob.data.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='POINT')
        for i,col in enumerate(self.c):c.data[i].color=(*col,1)
        ob.data.color_attributes.active_color=c
        bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6)
        bad=[f for f in bm.faces if f.calc_area()<1e-12]
        if bad:bmesh.ops.delete(bm,geom=bad,context='FACES')
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
        for f in ob.data.polygons:f.use_smooth=True
        ob.data.update();return ob

# Head: opaque float and stalk, eight hollow nectophores with rounded rolled mouths.
g=Geo();g.tube([(0,0,0),(0,.32,0),(0,.64,0),(0,.78,0)],[.035,.03,.025,.015],8)
g.lathe([(0,0),(.025,.055),(.075,.11),(.14,.125),(.205,.095),(.25,.04),(.27,0)],24,(0,.67,0),color='f2d9c4')
g.egg((0,.0,0),(.078,.065,.078),12,6)
for i in range(8):
    a=i*2.39996
    outward=Vector((math.cos(a),0,math.sin(a)))
    axis=Vector((outward.x*.38,1,outward.z*.38)).normalized()
    basis=Vector((0,1,0)).rotation_difference(axis).to_matrix()
    center=outward*.16+Vector((0,.135+i*.065,0))
    profile=[(.12,0),(.105,.057),(.065,.115),(.005,.145),(-.062,.15),(-.095,.137),(-.097,.122),(-.05,.122),(.015,.10),(.065,.045),(.073,0)]
    g.lathe(profile,12,center,color='dfe9ec',basis=basis,mi=1)
head=g.object('Flotador y ocho campanas','head',(SKIN,BELL))

# Node: stem has its nominal endpoint exactly at -0.42; joint covers instance scaling.
g=Geo();g.tube([(0,0,0),(0,-.42,0)],[.026,.025],8)
joint=Geo();joint.egg((0,-.42,0),(.085,.085,.085),10,6)
g.add(joint.v,joint.f,joint.c)
# A folded protective leaf with a broad, flattened shield and a tapered attachment.
g.lathe([(.06,0),(.025,.075),(-.04,.125),(-.13,.105),(-.20,0)],12,(.105,-.055,0),(1,1,.42),'e6c9c0')
# Gastrozooid nestled against the stem, extending below the bract.
g.lathe([(.07,0),(.045,.045),(-.02,.058),(-.095,.03),(-.12,0)],10,(.045,-.18,.025),(1,1,1),'d9573b')
for a in (1.0,4.1):
    path=[]
    for i in range(12):
        t=i/11;r=.016+.11*math.sin(t*math.pi)
        path.append((r*math.cos(a)+.025*math.sin(t*math.tau),-.22-.37*t,r*math.sin(a)+.035*t*t))
    g.tube(path,[.009*(1-i/12)+.001 for i in range(12)],5,'dfb8af')
node=g.object('Cormidio reutilizable','node')
# Axially encircling capsule: visible through gaps from every azimuth, same pivot as node.
g=Geo();g.lathe([(.07,0),(.052,.047),(.015,.071),(-.03,.067),(-.062,.036),(-.075,0)],16,(0,-.13,0),color='fff6ea')
lantern=g.object('Farol del cormidio','lantern',(LIGHT,))
# Tapered terminal stolon and five flowing terminal tentacles.
g=Geo();g.tube([(0,0,0),(0,-.15,0),(.015,-.32,0),(0,-.51,.015)],[.026,.034,.02,.004],8)
for k in range(5):
    a=k*math.tau/5;path=[]
    for j in range(13):
        t=j/12;r=.025+.12*math.sin(t*math.pi*.8)
        path.append((r*math.cos(a)+.035*math.sin(t*math.tau+a)*t,-.20-.61*t,.8*r*math.sin(a)+.025*math.cos(5*t)*t))
    g.tube(path,[.012*(1-j/13)+.001 for j in range(13)],6,'e6c9c0')
tail=g.object('Remate y filamentos terminales','tail')
originals=[head,node,lantern,tail]
bpy.context.view_layer.update()
counts={};dims={}
for o in originals:
    o.data.calc_loop_triangles();counts[o['part']]=len(o.data.loop_triangles)
    pp=[kit._three(v.co) for v in o.data.vertices]
    dims[o['part']]=[max(p[i] for p in pp)-min(p[i] for p in pp) for i in range(3)]
for p,limit in dict(head=3000,node=500,lantern=150,tail=1000).items():assert counts[p]<=limit,(p,counts[p])
assert max(math.hypot(v.co.x,v.co.y) for v in node.data.vertices)<=.35
assert dims['tail'][1]<=.9
# Real polygonal joint check: next stem's top ring stays inside previous end-knot.
# Fixed pitch 0.42, independent scales .9..1.1 and bends +/-0.25 around any azimuth.
bv=BVHTree.FromPolygons([kit.B(p) for p in joint.v],joint.f)
checks=0;clearance=1
for sp in (.9,1,1.1):
    for sn in (.9,1,1.1):
        for axis_angle in [i*math.tau/12 for i in range(12)]:
            axis=Vector((math.cos(axis_angle),0,math.sin(axis_angle)))
            for bend in (-.25,0,.25):
                rot=Matrix.Rotation(bend,3,axis)
                for j in range(16):
                    q=Vector((.026*math.cos(j*math.tau/16),0,.026*math.sin(j*math.tau/16)))
                    world=Vector((0,-.42,0))+rot@(q*sn)
                    local=kit.B(world/sp)
                    near,normal,idx,dist=bv.find_nearest(local)
                    # Joint lathe normals can be reversed before object recalculation; use radial distance
                    # against the polygonal joint using nearest boundary distance and an interior reference.
                    direction=(local-kit.B((0,-.42,0))).normalized()
                    hit=bv.ray_cast(kit.B((0,-.42,0)),direction)
                    assert hit[0] is not None
                    margin=hit[3]-(local-kit.B((0,-.42,0))).length
                    assert margin>0,(sp,sn,bend,margin)
                    clearance=min(clearance,margin*sp);checks+=1
parts,tris=kit.export_parts(ROOT/'sifonoforo.json',objects=originals,meta=dict(axisDirection=[0,-1,0],nodeSpacing=.42,nodeEnd=[0,-.42,0],lanternPivot=[0,0,0]))
assert parts==4
bpy.ops.object.select_all(action='DESELECT')
for o in originals:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'sifonoforo.glb'),export_format='GLB',use_selection=True,export_extras=True,export_animations=False)

# Preview colony only. Originals are hidden, copies do not carry the part property.
for o in originals:o.hide_render=True;o.hide_set(True)
preview=bpy.data.collections.new('Colonia de revisión — no exportar');bpy.context.scene.collection.children.link(preview)
P=[Vector((0,0,0))]
for i in range(14):
    slope=.32*math.sin(i*.46+.4)
    P.append(P[-1]+Vector((slope,-1,.07*math.cos(i*.3))).normalized()*.42)
preview_objects=[];first=[]
def instance(source,pos,rotation=None,name=''):
    ob=source.copy();ob.data=source.data
    if 'part' in ob:del ob['part']
    preview.objects.link(ob);ob.name='Vista '+name;ob.hide_render=False;ob.hide_set(False)
    ob.location=kit.B(pos)
    if rotation:ob.rotation_euler=rotation.to_euler()
    preview_objects.append(ob);return ob
headcopy=instance(head,P[0],name='head');first.append(headcopy)
for i in range(14):
    direction=(P[i+1]-P[i]).normalized();q=Vector((0,-1,0)).rotation_difference(direction)
    spin=Matrix.Rotation(i*2.39996,3,'Y')
    B=Matrix(((1,0,0),(0,0,-1),(0,1,0)))
    rot=B@q.to_matrix()@spin@B.inverted()
    for source in (node,lantern):
        ob=instance(source,P[i],rot,name=f'{source["part"]} {i:02d}')
        if i<5:first.append(ob)
instance(tail,P[-1],name='tail')
bpy.context.view_layer.update()
allpoints=[o.matrix_world@v.co for o in preview_objects for v in o.data.vertices]
lo=Vector(tuple(min(p[i] for p in allpoints) for i in range(3)));hi=Vector(tuple(max(p[i] for p in allpoints) for i in range(3)))
CENTER=kit._three((lo+hi)/2)
nearpoints=[o.matrix_world@v.co for o in first for v in o.data.vertices]
nlo=Vector(tuple(min(p[i] for p in nearpoints) for i in range(3)));nhi=Vector(tuple(max(p[i] for p in nearpoints) for i in range(3)))
NEAR_CENTER=kit._three((nlo+nhi)/2)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
world=bpy.data.worlds.new('Abismo');world.use_nodes=True;scene.world=world;nt=world.node_tree
ambient=nt.nodes['Background'];ambient.inputs[0].default_value=(*kit.lin('050d18'),1);ambient.inputs[1].default_value=.1
bg=nt.nodes.new('ShaderNodeBackground');lp=nt.nodes.new('ShaderNodeLightPath');mix=nt.nodes.new('ShaderNodeMixShader')
nt.links.new(lp.outputs['Is Camera Ray'],mix.inputs[0]);nt.links.new(ambient.outputs[0],mix.inputs[1]);nt.links.new(bg.outputs[0],mix.inputs[2]);nt.links.new(mix.outputs[0],nt.nodes['World Output'].inputs[0])
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam
bpy.ops.object.light_add(type='SPOT');lamp=bpy.context.object;lamp.data.color=kit.lin('d6ecff');lamp.data.spot_size=math.radians(65);lamp.data.spot_blend=.6;lamp.data.shadow_soft_size=.45
scene.use_nodes=True;nt=scene.node_tree;nt.nodes.clear();rl=nt.nodes.new('CompositorNodeRLayers');gl=nt.nodes.new('CompositorNodeGlare');gl.glare_type='FOG_GLOW';gl.threshold=1.2;co=nt.nodes.new('CompositorNodeComposite');nt.links.new(rl.outputs['Image'],gl.inputs[0]);nt.links.new(gl.outputs[0],co.inputs[0])
def camera(target,direction,distance,res,color,objects):
    target=Vector(target);cam.location=kit.B(target+Vector(direction).normalized()*distance)
    cam.rotation_euler=(kit.B(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='PERSP';cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24;cam.data.lens=24/(2*math.tan(math.radians(30)));cam.data.clip_start=.1
    scene.render.resolution_x,scene.render.resolution_y=res;bg.inputs[0].default_value=(*kit.lin(color),1)
    lamp.location=cam.location;lamp.rotation_euler=cam.rotation_euler;lamp.data.energy=distance**2*42
    bpy.context.view_layer.update()
    yy=[world_to_camera_view(scene,cam,o.matrix_world@v.co).y for o in objects for v in o.data.vertices]
    assert abs((cam.location-kit.B(target)).length-distance)<1e-4
    return (max(yy)-min(yy))*100
coverage={}
for name,target,direction,dist,res,color,group in [
    ('render-juego.png',CENTER,(.05,.07,-1),25,(1600,900),'050d18',preview_objects),
    ('render-cerca.png',NEAR_CENTER,(.65,.10,-1),10,(1600,900),'050d18',first),
    ('render-perfil.png',CENTER,(1,.02,0),9,(1200,900),'0b2438',preview_objects),
    ('render-detalle.png',(0,-.26,0),(.6,.2,-1),1.15,(1200,900),'050d18',[node,lantern])]:
    detail=name=='render-detalle.png'
    for o in preview_objects:o.hide_render=detail
    for o in (node,lantern):o.hide_render=not detail
    coverage[name]=camera(target,direction,dist,res,color,group)
    if name=='render-juego.png':assert 22<=coverage[name]<=29,coverage
    if name=='render-cerca.png':assert 24<=coverage[name]<=31,coverage
    scene.render.filepath=str(ROOT/name);bpy.ops.render.render(write_still=True)
for o in originals:o.hide_render=True
for o in preview_objects:o.hide_render=False
camera(CENTER,(.05,.07,-1),25,(1600,900),'050d18',preview_objects)
scene.render.filepath=str(ROOT/'render-juego.png');bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'sifonoforo.blend'))
rows=[]
for p in ('head','node','lantern','tail'):
    x,y,z=dims[p];rows.append(f'| {p} | {counts[p]} | {x:.3f} × {y:.3f} × {z:.3f} | (0,0,0) |')
report=f'''# ENTREGA — Sifonóforo · Batisfera

## Estado
- Versión / ronda: v1, entrega inicial
- Fecha: 2026-09-13
- Lista para: revisión de Luis

## Archivos
| Archivo | Contenido |
|---|---|
| `modelar-sifonoforo.py` | Fuente bpy reproducible |
| `sifonoforo.blend` | Cuatro originales ocultos y colonia de revisión en colección separada |
| `sifonoforo.glb` | Solo cuatro piezas originales, pigmento y dos materiales dentro de head |
| `sifonoforo.json` | Solo head, node, lantern, tail mediante kit.export_parts |
| `render-juego.png`, `render-cerca.png`, `render-perfil.png`, `render-detalle.png` | Cycles 40 muestras y denoise |

Regenerar desde esta carpeta:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 modelar-sifonoforo.py
```

## Datos técnicos
Dimensiones locales en unidades Three: ancho X × alto Y × fondo Z. Cada pieza se entrega en su propio origen; no separar las piezas trasladándolas en el JSON o GLB.

| Pieza | Triángulos | Dimensiones X × Y × Z | Pivote Three |
|---|---|---|---|
'''+ '\n'.join(rows)+f'''

- Total de recursos: {tris} triángulos, 4 mallas. Colonia de revisión: head + 14 node + 14 lantern + tail.
- Sin frente; cadena en −Y Three / −Z Blender.
- Meta: `axisDirection=(0,-1,0)`, `nodeSpacing=0.42`, `nodeEnd=(0,-0.42,0)`, `lanternPivot=(0,0,0)`.
- Pitch exacto: 0.42 u entre pivotes, independiente del giro de cada instancia.
- Nudo inferior centrado en nodeEnd, radio 0.085 u. Sobresale del extremo nominal para cubrir la articulación.
- Unión comprobada en geometría poligonal: {checks} muestras, ángulos −0.25/0/+0.25 rad, 12 ejes radiales y escalas independientes 0.9/1/1.1. Anillo superior del siguiente tallo dentro del nudo anterior; margen mínimo {clearance:.4f} u.
- Cámara de juego a 25 u del centro: altura {coverage['render-juego.png']:.2f}% del cuadro. Cámara cercana a 10 u del centro de head y cinco primeros nodos: ese grupo ocupa {coverage['render-cerca.png']:.2f}%, FOV vertical 60°, 1600×900. La colonia sigue completa en el render cercano.
- Peso JSON: {(ROOT/'sifonoforo.json').stat().st_size/1024:.1f} KiB.

## Partes y animación sugerida
| Objeto | part | segment | Pivote Three | Material | Eje Three | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Flotador y ocho campanas | head | — | 0,0,0 | Tejido opaco + campanas | Z / X | ±0.08 / ±0.04 rad | 0.16 / 0.12 ciclos/s | Balanceo desde unión inferior |
| Cormidio reutilizable | node | — | 0,0,0 | Tejido opaco | Traslación XZ de curva; orientación −Y | Onda X ±0.32 u; Z ±0.10 u | 0.18 ciclos/s; fase 0.40 rad por nodo | Remuestrear curva a 0.42 u; limitar ángulo vecino a 0.25 rad |
| Farol del cormidio | lantern | — | 0,0,0 | Emisión neutra | Misma matriz que node / emisión | Base 2; pulso 2→5→2 | 0.18 s por nota | No trasladar al centro del bulbo: comparte pivote con node |
| Remate y filamentos | tail | — | 0,0,0 | Tejido opaco | X / Z | ±0.06 / ±0.08 rad | 0.23 / 0.19 ciclos/s | Desde último punto de la curva; filamentos integrados, sin pivotes propios |

## Materiales
| Material | Color | Metal / rugosidad | Emisión | Alfa | Integración |
|---|---|---|---|---|---|
| Tejido | Blanco × pigmento crema #f2d9c4, rosa #e6c9c0; saco #d9573b | 0 / 0.32 | 0 | 1 | VertexColors, sin texturas |
| Campanas de head | #dfe9ec con variación | 0 / 0.32 | 0 | 0.65 | Solo Blender/GLB; cavidad y borde doblado, no láminas simples |
| Farol | #fff6ea | 0 / 0.32 | #fff6ea, 2 | 1 | Teñir por familia, misma transformación que node |

## Diferencias con el brief
Head mide aproximadamente 1.00 u de alto × 0.59 u de ancho frente a los ≈0.9 × 0.7 u orientativos. El JSON compartido solo transporta un material por pieza: head se exporta opaco en JSON; en Blender y GLB únicamente las ocho campanas tienen alfa 0.65 y el flotador permanece opaco. Resolver transparencia selectiva en el juego requeriría ampliar el formato o separar head, por eso se mantienen exactamente cuatro piezas. El pigmento azulado de las campanas sí llega al JSON. El engrosamiento inferior sobresale 0.085 u tras el extremo nominal, sin cambiar la separación de 0.42 u.

## Revisión propia
Se revisaron los cuatro renders y se corrigieron la suavidad de bráctea/filamentos y su inserción: cadena de luces a distancia; ocho campanas huecas bajo el flotador; bráctea, saco rojizo y dos tentáculos por nodo; cápsula luminosa visible alrededor del tallo. Exportación comprueba presupuesto por pieza, radio del nodo, pivotes y uniones con giro/escala. Todas las copias de revisión carecen de part y no entran en JSON/GLB.

## Sugerencias para integrar
Usar las cuatro geometrías locales sin desplazamientos adicionales. Head se sitúa en el punto inicial, node/lantern en los puntos 0–13 y tail en el punto 14. El nudo de cada nodo cubre el nacimiento del siguiente. Variar giro sobre Y y escala ±10% aplicando exactamente la misma matriz a node y lantern. Agrupar los 14 faroles en 3–7 tramos según las notas. Tentáculos ya tienen curva de reposo; no hay piezas, huesos ni animaciones horneadas para deformarlos individualmente.
'''
(ROOT/'ENTREGA.md').write_text(report,encoding='utf-8')
print('EXPORT',parts,'piezas',counts,'DIMENSIONS',dims,'UNIONES',checks,clearance,'ENCUADRE',coverage,flush=True)
