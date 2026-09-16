"""Portal atlante horizontal. bpy, espacio de autoría Three Y_UP.
Todo se regenera junto al script; no modifica el juego ni el kit compartido.
"""
import bpy, bmesh, math, sys, json, struct
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parents[3]/'grados-mayores-juego'/'art'/'blender'))
import kit
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection,316)
TAU=math.tau;H=3.50;Y=1.32;OPEN=math.radians(110)
C=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
def lin(c):return kit.lin(c)
def mix(a,b,t):return tuple(Vector(lin(a)).lerp(Vector(lin(b)),max(0,min(1,t))))
def ry(a):return Matrix.Rotation(a,4,'Y')
def material(name,rough,metal=0,emission=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(1,1,1,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    p.inputs['Emission Strength'].default_value=emission;p.inputs['Emission Color'].default_value=(*lin('7fe9ff'),1);p.inputs['Alpha'].default_value=1
    a=m.node_tree.nodes.new('ShaderNodeVertexColor');a.layer_name='Pigment';m.node_tree.links.new(a.outputs['Color'],p.inputs['Base Color']);return m
stone=material('Arenisca atlante',.78);gold=material('Oro atlante satinado',.30,.60);light=material('Paso turquesa',.65,emission=.22)
class Geo:
    def __init__(self):self.v=[];self.f=[];self.c=[]
    def add(self,v,f,color='dcd3bc',M=None):
        M=M if M is not None else Matrix.Identity(4);off=len(self.v);q=[tuple(M@Vector(p)) for p in v]
        self.v.extend(q);self.f.extend(tuple(off+i for i in face) for face in f)
        if callable(color):self.c.extend(color(p) for p in q)
        else:self.c.extend([lin(color)]*len(v))
    def object(self,name,part,mat,pivot=(0,0,0),segment=None):
        o=kit.make(name,[tuple(Vector(p)-Vector(pivot)) for p in self.v],self.f,mat,part=part,tint=0,smooth_angle=.65)
        o.location=kit.B(pivot)
        if segment is not None:o['segment']=segment
        a=o.data.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='POINT')
        for d,col in zip(a.data,self.c):d.color=(*col,1)
        bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6)
        bad=[f for f in bm.faces if f.calc_area()<1e-10]
        if bad:bmesh.ops.delete(bm,geom=bad,context='FACES')
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.set_sharp_from_angle(angle=.65)
        return o
frame=Geo();trim=Geo()
def stonepig(p):return mix('dcd3bc','b4a98f',.18+.10*math.sin(p[0]*3.3+p[2]*1.7)+.07*math.cos(p[1]*11-p[2]*5))
def hexr(apothem,a):
    local=(a+math.pi/6)%(math.pi/3)-math.pi/6
    return apothem/math.cos(local)
# The interior widens below the lip: room for real downward folding, not a solid torus.
profile=[('r',5.30,0),('r',5.40,.18),('r',5.28,.46),('r',5.18,1.06),('r',5.02,1.58),('h',3.74,1.58),('h',3.74,1.23),('h',4.45,0)]
for block in range(12):
    v=[];f=[];n=8;k=len(profile);a0=block*TAU/12+.003;a1=(block+1)*TAU/12-.003
    for i in range(n+1):
        a=a0+(a1-a0)*i/n
        for mode,r,y in profile:
            radius=hexr(r,a) if mode=='h' else r
            v.append((radius*math.sin(a),y,radius*math.cos(a)))
    for i in range(n):
        for j in range(k):f.append((i*k+j,i*k+(j+1)%k,(i+1)*k+(j+1)%k,(i+1)*k+j))
    f.extend([tuple(reversed(range(k))),tuple(n*k+j for j in range(k))]);frame.add(v,f,stonepig)
# Broad gold molding bands with chamfered edges, one circular, one following the hexagonal opening.
def band(g,profile,hexagon=False,color='d9a441',n=96):
    v=[];f=[];k=len(profile)
    for i in range(n):
        a=TAU*i/n
        for r,y in profile:
            r=hexr(r,a) if hexagon else r;v.append((r*math.sin(a),y,r*math.cos(a)))
    for i in range(n):
        for j in range(k):f.append((i*k+j,((i+1)%n)*k+j,((i+1)%n)*k+(j+1)%k,i*k+(j+1)%k))
    g.add(v,f,color)
band(trim,[(4.98,1.56),(5.10,1.52),(5.10,1.64),(4.98,1.68)])
band(trim,[(3.76,1.59),(3.85,1.59),(3.85,1.66),(3.76,1.68)],True)
# Relief ribbons: center ridge, gently colored edges. No textures are required in the game.
def ribbon(g,path,width,y,color='d9a441',M=None):
    v=[];f=[];colors=[]
    for i,p in enumerate(path):
        prev=Vector(path[max(0,i-1)]);nxt=Vector(path[min(len(path)-1,i+1)]);d=(nxt-prev).normalized();n=Vector((-d.y,d.x))
        for side in (-1,0,1):
            q=Vector(p)+n*width*.5*side;v.append((q.x,y+(.018 if side==0 else 0),q.y));colors.append(mix(color,'f1d488',.16 if side==0 else 0))
    for i in range(len(path)-1):
        for j in range(2):f.append((i*3+j,(i+1)*3+j,(i+1)*3+j+1,i*3+j+1))
    off=len(g.v);g.add(v,f,color,M)
    g.c[off:]=colors
# Six carved shell emblems echo a ceremonial mirror, between the hinges.
for seg in range(6):
    M=ry(seg*math.pi/3+math.pi/6)@Matrix.Translation(Vector((0,0,4.55)))
    v=[];f=[];n=16
    for ring in range(4):
        r=ring/3
        for j in range(n):
            a=TAU*j/n;x=.49*r*math.cos(a);z=.28*r*math.sin(a)
            y=1.59+.18*math.sqrt(max(0,1-r*r))+.025*math.cos(6*a)*r*(1-r)
            v.append((x,y,z))
    for i in range(3):
        for j in range(n):q=i*n+j;u=i*n+(j+1)%n;f.append((q,u,u+n,q+n))
    frame.add(v,f,stonepig,M)
    M=ry(seg*math.pi/3)
    for path in [[(0,4.02),(0,4.30),(0,4.72)],[(-.22,4.49),(0,4.30),(.22,4.49)],[(-.16,4.10),(0,4.24),(.16,4.10)]]:ribbon(trim,path,.065,1.605,M=M)
# Hollow bearing barrels, with actual clearance around each leaf axle.
def axle(g,center,x0,x1,outer,inner=0,material_color='d9a441',M=None,n=12):
    # Axis X. Ring profile around X, including the hole for stationary bearings.
    prof=[(x0,outer),(x1,outer),(x1,inner),(x0,inner)];v=[];f=[]
    for i in range(n):
        a=TAU*i/n
        for x,r in prof:v.append((center[0]+x,center[1]+r*math.sin(a),center[2]+r*math.cos(a)))
    for i in range(n):
        for j in range(4):f.append((i*4+j,((i+1)%n)*4+j,((i+1)%n)*4+(j+1)%4,i*4+(j+1)%4))
    g.add(v,f,material_color,M)
for seg in range(6):
    M=ry(seg*math.pi/3)
    for x in (-.33,.33):
        axle(trim,(x,Y,H),-.075,.075,.205,.125,M=M)
        v,f=kit.g_box(.15,.16,.40);trim.add(v,f,'d9a441',M@Matrix.Translation(Vector((x,Y,3.84))))
# Discreet asymmetric barnacles and mineral crack on the outer rim.
for i in range(6):
    a=2.14+i*.044;r=5.24;h=.075+.025*(i%3)
    v,f=kit.g_lathe([(.10,.29),(.115,.33),(.075,.33+h),(.035,.36+h),(.032,.33+h),(.05,.30)],10)
    frame.add(v,f,'c8b898',Matrix.Translation(Vector((r*math.sin(a),0,r*math.cos(a)))))
ribbon(frame,[(.06,4.96),(.09,4.75),(-.02,4.65),(.04,4.42)],.025,1.586,'839b9e',ry(2.35))
# Notched, softened petals. The notch leaves clear space for the bearing brackets.
outline=[(-.027,.13),(-1.86,3.40),(-.50,3.40),(-.50,2.95),(.50,2.95),(.50,3.40),(1.86,3.40),(.027,.13)]
rounded=kit.rounded_poly(outline,.035,2)
def extruded_leaf(g):
    # Three rings; side chamfers are real geometry, with a slight inset on the upper edge.
    v=[];f=[];n=len(rounded);center=Vector((0,2.22))
    for y,shrink in [(1.235,.995),(1.285,1),(1.385,.988)]:
        for p in rounded:
            q=center+(Vector(p)-center)*shrink;v.append((q.x,y,q.y))
    for i in range(2):
        for j in range(n):f.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
    f.extend([tuple(reversed(range(n))),tuple(2*n+j for j in range(n))]);g.add(v,f,stonepig)
leaves=[];pivots=[];axes=[]
for seg in range(6):
    g=Geo();extruded_leaf(g)
    # Sweeping almond outline and center vein: gold pigment, same matte leaf material.
    path=[]
    for i in range(25):
        a=TAU*i/24;z=1.63+1.04*math.cos(a);x=.48*math.sin(a)*(1+.30*math.cos(a));path.append((x,z))
    ribbon(g,path,.075,1.393)
    ribbon(g,[(0,.58),(0,1.44),(0,2.65)],.045,1.395)
    v,f=kit.g_box(.22,.12,.62);g.add(v,f,'d9a441',Matrix.Translation(Vector((0,Y,3.20))))
    axle(g,(0,Y,H),-.43,.43,.090,0)
    axle(g,(0,Y,H),-.15,.15,.115,0)
    M=ry(seg*math.pi/3);g.v=[tuple(M@Vector(p)) for p in g.v]
    pivot=tuple(M@Vector((0,Y,H)));axis=tuple(M.to_3x3()@Vector((-1,0,0)));pivots.append(pivot);axes.append(axis)
    leaves.append(g.object('Pétalo '+str(seg),'iris_leaf',stone,pivot,seg))
frame_ob=frame.object('Aro tallado','frame',stone);gold_ob=trim.object('Incrustaciones y cojinetes','frame_gold',gold)
g=Geo();v=[(0,.085,0)];n=96
for i in range(n):a=TAU*i/n;v.append((3.34*math.sin(a),.085,3.34*math.cos(a)))
f=[(0,i+1,(i+1)%n+1) for i in range(n)];g.add(v,f,'7fe9ff');glow=g.object('Luz del paso','glow',light,(0,.085,0))
objects=[frame_ob,*leaves,glow,gold_ob];bpy.context.view_layer.update()
neutral={o.name:o.matrix_world.copy() for o in objects}
def pose(angle):
    for i,o in enumerate(leaves):
        R=Matrix.Rotation(angle,4,Vector(axes[i]));o.matrix_world=C@Matrix.Translation(Vector(pivots[i]))@R@C.inverted()
    bpy.context.view_layer.update()
def bvh(o):
    o.data.calc_loop_triangles();return BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices],[tuple(t.vertices) for t in o.data.loop_triangles],all_triangles=True,epsilon=0)
# Exact mesh surface overlap checks through the travel, including complete opening.
static=[bvh(frame_ob),bvh(gold_ob)];checks=0
for deg in (0,15,30,45,60,75,90,110):
    pose(math.radians(deg));trees=[bvh(o) for o in leaves]
    for i,t in enumerate(trees):
        for j,s in enumerate(static):
            hits=t.overlap(s);assert not hits,('leaf/frame overlap',deg,i,j,len(hits));checks+=1
        for j in range(i):
            hits=t.overlap(trees[j]);assert not hits,('leaf/leaf overlap',deg,i,j,len(hits));checks+=1
pose(OPEN)
opened=[kit._three(o.matrix_world@v.co) for o in leaves for v in o.data.vertices]
open_min_y=min(p[1] for p in opened);clear_radius=min(math.hypot(p[0],p[2]) for p in opened)
assert clear_radius>3.34,clear_radius
pose(0)
meta=dict(radial=True,segment0Direction='+Z',segmentOrder='clockwise_from_above',hingeAxis=[-1,0,0],hingeAxes=[list(a) for a in axes],hingePivots=[list(p) for p in pivots],openAngle=OPEN,openingDuration=.7,glowCenter=[0,.085,0],glowRadius=3.34,glowEmissionClosed=.22,glowEmissionOpen=2.0,openMinimumY=round(open_min_y,4),openClearRadius=round(clear_radius,4),collisionChecks=checks)
parts,tris=kit.export_parts(ROOT/'portal.json',objects=objects,meta=meta)
pts=[kit._three(o.matrix_world@v.co) for o in objects for v in o.data.vertices];dims=[max(p[k] for p in pts)-min(p[k] for p in pts) for k in range(3)]
rad=max(math.hypot(p[0],p[2]) for p in pts)
assert parts<=10 and tris<=9000,(parts,tris)
assert rad<=5.5 and dims[1]<=2.5 and abs(min(p[1] for p in pts))<1e-5,(rad,dims)
for o in objects:
    p=o.data.materials[0].node_tree.nodes.get('Principled BSDF');assert p.inputs['Alpha'].default_value==1
    assert (p.inputs['Emission Strength'].default_value>0)==(o['part']=='glow')
print('EXPORT',parts,'partes',tris,'triangulos DIMENSIONS XYZ',dims,'DIAMETER',rad*2,'CHECKS',checks,'OPEN MIN Y',open_min_y,flush=True)
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'portal.glb'),export_format='GLB',use_selection=True,export_extras=True,export_animations=False)
b=(ROOT/'portal.glb').read_bytes();size=struct.unpack_from('<I',b,12)[0];doc=json.loads(b[20:20+size])
assert len(doc['meshes'])==parts and all('COLOR_0' in p['attributes'] for m in doc['meshes'] for p in m['primitives'])
# Review sand has a real central cutout. A solid game floor would cover the passage.
v=[];f=[];n=96
for r in (0,1):
    for i in range(n):
        a=TAU*i/n;rr=hexr(4.45,a) if r==0 else 150;v.append((rr*math.sin(a),-.018,rr*math.cos(a)))
for i in range(n):f.append((i,(i+1)%n,n+(i+1)%n,n+i))
m=bpy.data.materials.new('Arena de revisión');m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*lin('d9c28f'),1);p.inputs['Roughness'].default_value=.85
sand=kit.make('Arena con hueco — no exportada',v,f,m,tint=0);del sand['part']
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
w=bpy.data.worlds.new('Agua turquesa');w.use_nodes=True;scene.world=w;w.node_tree.nodes['Background'].inputs[0].default_value=(*lin('2c86a3'),1);w.node_tree.nodes['Background'].inputs[1].default_value=.45
bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.data.energy=2.6;sun.data.angle=.22;sun.data.color=lin('fff3d6');sun.rotation_euler=(.25,-.3,-.4)
bpy.ops.object.light_add(type='AREA');fill=bpy.context.object;fill.location=kit.B((-4,10,6));fill.data.energy=1000;fill.data.size=10;fill.data.color=lin('b8e9ff');fill.rotation_euler=(kit.B((0,.8,0))-fill.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24;cam.data.lens=24/(2*math.tan(math.pi/6));cam.data.clip_start=.1;cam.data.clip_end=500
scene.use_nodes=True;nt=scene.node_tree;nt.nodes.clear();rl=nt.nodes.new('CompositorNodeRLayers');fog=nt.nodes.new('CompositorNodeGlare');fog.glare_type='FOG_GLOW';fog.quality='HIGH';fog.threshold=1.4;fog.mix=-.96;out=nt.nodes.new('CompositorNodeComposite');nt.links.new(rl.outputs['Image'],fog.inputs['Image']);nt.links.new(fog.outputs['Image'],out.inputs[0])
target=Vector((0,.8,0));direction=Vector((.25,math.sqrt(.5),math.sqrt(.5-.25**2)))
views=[('render-juego.png',target+direction*35,target,(1600,900),False),('render-cerca.png',target+direction*15,target,(1600,900),False),('render-abierto.png',target+direction*15,target,(1600,900),True),('render-planta.png',(0,13.8,0),(0,.8,0),(1200,900),False)]
for name,pos,look,res,opened_pose in views:
    pose(OPEN if opened_pose else 0);light.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=2.0 if opened_pose else .22
    cam.location=kit.B(pos);cam.rotation_euler=(kit.B(look)-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.resolution_x,scene.render.resolution_y=res;scene.render.filepath=str(ROOT/name);bpy.ops.render.render(write_still=True)
pose(0);light.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=.22;cam.location=kit.B(views[1][1]);cam.rotation_euler=(kit.B(target)-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.resolution_x=1600;scene.render.resolution_y=900
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'portal.blend'))
def fmt(p):return '('+', '.join(f'{x:.4f}' for x in p)+')'
rows=['| Aro tallado | frame | — | (0,0,0) | Piedra | — | fijo | 0 |', '| Incrustaciones y cojinetes | frame_gold | — | (0,0,0) | Oro | — | fijo | 0 |']
for i in range(6):rows.append(f'| Pétalo {i} | iris_leaf | {i} | {fmt(pivots[i])} | Piedra y pigmento oro | {fmt(axes[i])} | 0 → {OPEN:.6f} rad | {OPEN/.7:.3f} rad/s media, 0.7 s |')
rows.append('| Luz del paso | glow | — | (0,0.085,0) | Turquesa | intensidad emisiva | 0.22 → 2.0 | transición 0.7 s |')
report=f'''# ENTREGA — Portal atlante · Walking AP Multi

## Estado

- Versión: v1, generación inicial. Fecha: 2026-09-16.
- Lista para revisión de Luis; integración a cargo del integrador.

## Archivos

| Archivo | Contenido |
|---|---|
| modelar-portal.py | Regenera todos los entregables mediante bpy |
| portal.blend | Escena editable, iris cerrado; arena con hueco y luces de revisión |
| portal.glb | Nueve mallas, COLOR_0 conectado, sin arena ni luces |
| portal.json | kit.export_parts, ejes Three, bisagras, ángulo y metadatos |
| render-juego.png, render-cerca.png, render-abierto.png, render-planta.png | Cycles, 40 muestras y denoise; perspectivas FOV vertical 60°, near 0.1 |

Regenerar desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 modelar-portal.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Fondo × alto × ancho cerrado | {dims[2]:.3f} × {dims[1]:.3f} × {dims[0]:.3f} u |
| Diámetro máximo | {rad*2:.3f} u |
| Origen | Centro del mecanismo, pie del aro en Y=0 |
| Orientación | Radial; segmento 0 hacia +Z; 1 hacia +X,+Z; orden horario desde arriba |
| Triángulos / mallas | {tris} / {parts} |
| JSON | {(ROOT/'portal.json').stat().st_size/1024:.1f} KiB |
| Abierto | radio central libre ≥ {clear_radius:.3f} u; punto inferior Y={open_min_y:.3f} u |

## Partes

| Objeto | part | segment | Pivote Three | Material | Eje de giro Three | Amplitud | Velocidad |
|---|---|---|---|---|---|---|---|
'''+ '\n'.join(rows)+f'''

## Materiales

| Material | Pigmento hex | Metal / rugosidad | Emisión | Alfa | Integración |
|---|---|---|---|---|---|
| Arenisca | #dcd3bc a #b4a98f, vetas #d9a441 | 0 / 0.78 | 0 | 1 | Un material por hoja; vetas talladas con pigmento dorado mate |
| Oro fijo | #d9a441, luces #f1d488 | 0.6 / 0.30 | 0 | 1 | Malla adicional frame_gold: molduras, runas y cojinetes |
| Paso | #7fe9ff | 0 / 0.65 | 0.22 cerrado, 2.0 abierto; #7fe9ff | 1 | Disco opaco sin textura; única parte emisiva |

## Meta y apertura

El exportador escribe los campos de meta en la raíz del JSON. `hingeAxis=(-1,0,0)` es el eje de referencia del segmento 0, no un eje global idéntico para todas las hojas. `hingeAxes` contiene los seis ejes globales Three de la tabla; `hingePivots` contiene sus seis bisagras. Para segmento i, eje = RY(i·π/3)·(-1,0,0).

`openAngle={OPEN:.9f}` rad (110°), `openingDuration=0.7` s. Aplicar una rotación de eje arbitrario sobre el pivote de cada malla con su eje global correspondiente; las geometrías ya vienen orientadas radialmente, no volver a girarlas i·60°. Una interpolación suave entre 0 y openAngle abre hacia abajo y afuera. El centro queda despejado al llegar a 110°.

`glowCenter=(0,0.085,0)`, `glowRadius=3.34`, `glowEmissionClosed=0.22`, `glowEmissionOpen=2.0`. `openMinimumY={open_min_y:.4f}`, `openClearRadius={clear_radius:.4f}`, `collisionChecks={checks}`. `radial=true`, `segment0Direction=+Z`, `segmentOrder=clockwise_from_above`.

## Diferencias con el brief

Se añade frame_gold, novena malla, para conservar el oro satinado del aro. Las vetas y ejes de las seis hojas comparten rugosidad mate de la piedra: kit exporta un solo material por parte y separarlos excedería las diez mallas. El hueco interior es hexagonal, con exterior circular; permite seis bisagras tangenciales y pétalos que sellan sin solaparse. Abierto, las hojas bajan hasta Y={open_min_y:.3f}, bajo el plano de apoyo, como exige el plegado bajo el aro; la altura cerrada es {dims[1]:.3f} u.

## Sugerencias para integrar

Mantener frame y frame_gold fijos. Animar simultáneamente los seis iris_leaf y la emisión de glow durante 0.7 s; no cambiar su color. El render usa arena con una abertura real: el suelo del juego debe dejar visible el paso y permitir las hojas bajo Y=0. La zona de corte usada tiene apotema 4.45 u y queda cubierta por el aro. La arena, las luces y el bloom de revisión no se exportan en GLB/JSON. Exportaciones cerradas, sin clips horneados.

## Revisión propia

El script verifica {checks} pares de superficies mediante BVH de triángulos a 0°, 15°, 30°, 45°, 60°, 75°, 90° y 110°: cada hoja frente a las otras y frente a frame y frame_gold. No admite intersecciones en estas ocho poses. Los cilindros de bisagra giran dentro de cojinetes huecos con holgura. También verifica el radio central libre abierto, dimensiones cerradas, presupuesto, opacidad, emisión exclusiva de glow y COLOR_0 en cada primitiva GLB. Son ocho poses discretas, no una prueba continua del movimiento completo.
'''
(ROOT/'ENTREGA.md').write_text(report,encoding='utf-8')
