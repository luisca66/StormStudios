"""Atlántida. Autoría en espacio Three (Y arriba, fachada -Z). Regenera toda la entrega."""
import bpy, math, sys, random, json
from pathlib import Path
from mathutils import Vector, Matrix
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parents[3]/'grados-mayores-juego'/'art'/'blender'))
import kit
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection,42); rng=random.Random(42)

def material(name,rough,metal=0,em=0,alpha=1):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(1,1,1,1);p.inputs['Roughness'].default_value=rough
    p.inputs['Metallic'].default_value=metal;p.inputs['Alpha'].default_value=alpha
    p.inputs['Emission Strength'].default_value=em;p.inputs['Emission Color'].default_value=(*kit.lin('7fe9ff'),1)
    a=m.node_tree.nodes.new('ShaderNodeVertexColor');a.layer_name='Pigment';m.node_tree.links.new(a.outputs['Color'],p.inputs['Base Color'])
    if alpha<1:m.surface_render_method='DITHERED'
    return m
stone=material('Arenisca marina',.78);gold=material('Oro atlante satinado',.3,.6)
glass=material('Cristal turquesa',.1,alpha=.78);heart=material('Corazón luminoso',.1,em=1.6,alpha=.9)
glowmat=material('Vetas y ventanas',.25,em=1.3)
class Batch:
    def __init__(self,name,mat,pivot=(0,0,0),segment=None):self.name=name;self.mat=mat;self.pivot=pivot;self.segment=segment;self.v=[];self.f=[];self.c=[]
    def add(self,geo,pos=(0,0,0),color='dcd3bc',rot=0):
        v,f=geo;offset=len(self.v);M=kit.T(pos,(0,rot,0));base=Vector(kit.lin(color));k=rng.uniform(.93,1.05)
        for p in v:
            q=M@Vector(p);self.v.append(tuple(q));t=k+.018*math.sin(q.x*1.7+q.y*2.1+q.z*.8)
            self.c.append(tuple(max(0,min(1,x*t)) for x in base))
        self.f.extend(tuple(i+offset for i in face) for face in f)
    def finish(self):
        ob=kit.make(self.name,[tuple(Vector(p)-Vector(self.pivot)) for p in self.v],self.f,self.mat,part=self.name,tint=0,smooth_angle=.65)
        ob.location=kit.B(self.pivot)
        if self.segment is not None:ob['part']='tower';ob['segment']=self.segment
        a=ob.data.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='POINT')
        for d,c in zip(a.data,self.c):d.color=(*c,1)
        return ob
base=Batch('base',stone);palace=Batch('palace',stone);cols=Batch('colonnade',stone)
orn=Batch('gold',gold);roof=Batch('glass',glass);glow=Batch('glow',glowmat)
crystal=Batch('crystal',heart,(0,13,-15))

def lat(batch,profile,pos=(0,0,0),color='dcd3bc',n=48):batch.add(kit.g_lathe(profile,n),pos,color)
def box(batch,pos,size,color='dcd3bc',rot=0):batch.add(kit.g_box(*size),pos,color,rot)
def wedge(ri,ro,y0,y1,a0,a1,n=2):
    v=[]
    # Slight chamfer at upper and lower edges gives actual masonry relief.
    for y,r0,r1 in [(y0,ri,ro),(y1-.09,ri,ro),(y1,ri+.07,ro-.09)]:
        for r in (r0,r1):
            for i in range(n+1):
                a=a0+(a1-a0)*i/n;v.append((r*math.sin(a),y,r*math.cos(a)))
    f=[];s=2*(n+1)
    for j in range(2):
        for k in range(2):
            for i in range(n):
                q=j*s+k*(n+1)+i;f.append((q,q+1,q+s+1,q+s))
        for i in (0,n):f.append((j*s+i,j*s+n+1+i,(j+1)*s+n+1+i,(j+1)*s+i))
    for j in (0,2):
        for i in range(n):q=j*s+i;f.append((q,q+1,q+n+2,q+n+1))
    return v,f

def masonry(batch,cx,cz,r,y0,rows,height,count,skip=False):
    for row in range(rows):
        for j in range(count):
            a=(j+(row%2)*.5)*math.tau/count;b=a+math.tau/count
            mid=(a+b)/2%math.tau
            if skip and abs(mid-math.pi)<.69:continue
            color=rng.choices(['dcd3bc','cfc5ac','b4a98f','9fb6bd'],[6,5,1,1])[0]
            batch.add(wedge(r-.8,r,y0+row*height+.035,y0+(row+1)*height-.035,a+.008,b-.008,1),(cx,0,cz),color)

def arch(batch,pos,r,spring,thick,depth,rot=0,color='dcd3bc',segments=20):
    for i in range(segments):
        a=i*math.pi/segments+.008;b=(i+1)*math.pi/segments-.008
        pts=[(math.cos(a)*r,spring+math.sin(a)*r),(math.cos(b)*r,spring+math.sin(b)*r),(math.cos(b)*(r+thick),spring+math.sin(b)*(r+thick)),(math.cos(a)*(r+thick),spring+math.sin(a)*(r+thick))]
        batch.add(kit.g_prism(pts,depth),pos,color,rot)
    for s in (-1,1):
        p=Vector(pos)+kit.T(rot=(0,rot,0)).to_3x3()@Vector((s*(r+thick/2),spring/2,0))
        box(batch,p,(thick,spring,depth),color,rot)

# Three broad octagonal terraces, radial paved court and independent real stair treads.
for r,y in [(47,0),(44,1),(41,2)]:lat(base,[(0,y),(r-.25,y),(r,y+.18),(r,y+.8),(r-.25,y+1),(0,y+1)],n=64)
for i in range(8):
    a=i*math.tau/8
    for k in range(8):
        rad=40+k*.92;y=3.6-k*.30
        box(base,(math.sin(a)*rad,y/2,math.cos(a)*rad),(12,y,1.02),'d2c7af',a)
for i in range(48):
    a=i*math.tau/48
    base.add(wedge(24,35,3.005,3.055,a+.012,a+math.tau/48-.012,1),color='c4bfaa' if i%3 else '9fb6bd')
for r in (23.5,35.3):lat(orn,[(r,3.05),(r+.13,3.05),(r+.13,3.12),(r,3.12)],color='d9a441',n=64)
# Rear sanctuary, front opening, layered stone entablature and pointed sea-glass dome.
masonry(palace,0,10,17,3,8,2.75,24,True)
for y in (3,4,24.8,25.5):lat(palace,[(16.5,y),(17.6,y),(17.9,y+.3),(17.9,y+.6),(17.5,y+.85),(16.5,y+.85)],(0,0,10),n=64)
arch(palace,(0,3,-3.8),9.8,12,1.5,2.6,segments=32)
arch(orn,(0,3,-5.15),10.0,12,.22,.18,color='d9a441',segments=40)
lat(roof,[(17*math.cos(t*math.pi/2),26+13*math.sin(t*math.pi/2)) for t in [i/24 for i in range(25)]],(0,0,10),'5fd8e8',64)
for y,r in [(26,17.1),(27,17),(38.6,2.5)]:lat(orn,[(r,y),(r+.18,y+.12),(r+.18,y+.35),(r,y+.46)],(0,0,10),'d9a441',64)
# Eight sculpted radial ribs follow the dome profile.
for j in range(8):
    a=j*math.tau/8;v=[];f=[]
    for i in range(25):
        t=i/24*math.pi/2;r=17.05*math.cos(t);y=26+13.05*math.sin(t)
        for k in range(6):
            b=k*math.tau/6;v.append(((r+.16*math.cos(b))*math.sin(a)+.14*math.sin(b)*math.cos(a),y+.16*math.cos(b),(r+.16*math.cos(b))*math.cos(a)-.14*math.sin(b)*math.sin(a)))
    for i in range(24):
        for k in range(6):q=i*6+k;f.append((q,i*6+(k+1)%6,(i+1)*6+(k+1)%6,q+6))
    orn.add((v,f),(0,0,10),'d9a441')
lat(orn,[(.1,38.8),(.7,39),(.9,39.4),(.5,40),(.1,41)],(0,0,10),'d9a441',24)
# Four tapered towers with bonded ashlar, pilasters, crown and glazed spire.
towers=[];towerpos=[(-28,-22),(28,-22),(-28,22),(28,22)]
for seg,(x,z) in enumerate(towerpos):
    t=Batch('tower_'+str(seg),stone,(x,3,z),seg);towers.append(t);top=29 if seg<2 else 33
    lat(t,[(0,3),(6.1,3),(6.1,3.7),(5.6,4.3),(5,4.6),(4.7,5.3)],(x,0,z),n=48)
    masonry(t,x,z,4.8,5,7,(top-5)/7,12)
    for j in range(6):
        a=j*math.tau/6
        lat(t,[(.52,4.5),(.44,5),(.35,top-.8),(.7,top),(.7,top+.5)],(x+4.65*math.sin(a),0,z+4.65*math.cos(a)),n=12)
    lat(t,[(4.7,top-.5),(5.3,top),(5.6,top+.35),(5.6,top+.9),(5.1,top+1.3),(4.8,top+1.5)],(x,0,z),n=48)
    lat(orn,[(5.5,top+.45),(5.68,top+.6),(5.68,top+.82),(5.5,top+.95)],(x,0,z),'d9a441',48)
    lat(roof,[(4.8,top+1.3),(4.65,top+2),(3.9,top+3.2),(2.6,top+4.9),(1.1,top+6.4),(.03,top+8)],(x,0,z),'5fd8e8',40)
    for j in range(6):
        a=j*math.tau/6
        # Narrow turquoise lancets sit between structural pilasters.
        a+=math.pi/6;p=(x+4.82*math.sin(a),top-6,z+4.82*math.cos(a))
        pts=[(-.55,0),(.55,0),(.55,2.8),(0,3.8),(-.55,2.8)]
        glow.add(kit.g_prism(pts,.12),p,'7fe9ff',a)
# Two vaulted side galleries; clear central view of the heart.
profile=[(1.45,3),(1.45,3.35),(1.2,3.6),(.9,4),(.75,4.5),(.68,10.8),(.82,11.3),(1.12,11.7),(1.3,12),(1.3,12.5)]
for x in (-20,20):
    for z in (-26,-16,-6):lat(cols,profile,(x,0,z),n=24)
    for z in (-21,-11):arch(cols,(x,3,z),4.15,6.8,.85,1.5,math.pi/2,segments=24)
    box(cols,(x,14,-16),(2.6,.8,23),'cfc5ac');box(orn,(x,14.45,-16),(2.75,.22,23.2),'d9a441')
# Altar and hovering cut crystal: a clear swept sphere around its own center.
lat(base,[(0,3),(5.4,3),(5.4,3.6),(4.8,4),(4.4,4.6),(4.4,5),(3.8,5.5),(0,5.5)],(0,0,-15),n=64)
lat(orn,[(4.4,4.5),(4.55,4.65),(4.55,4.95),(4.4,5.1)],(0,0,-15),'d9a441',64)
lat(crystal,[(0,7),(2.7,9),(3.6,13.5),(2.5,17.2),(0,20)],(0,0,-15),'7fe9ff',8)
for j in range(8):
    a=j*math.tau/8
    box(glow,(math.sin(a)*7,3.09,-15+math.cos(a)*7),(.18,.1,2),'7fe9ff',a)
# Marine erosion: actual fissures, chipped steps and low asymmetric coral fans.
for x,z in [(-29,-27),(23,-27),(-37,8)]:
    for j in range(5):
        pts=[(0,0),(.32,1.1),(.22,2.1),(.55,2.7),(.42,3),(.03,2.2),(-.22,1.25),(-.35,.1)]
        base.add(kit.g_prism(pts,.22),(x+j*.45,3,z+.3*math.sin(j)),'bda18c',j*.45)
# Broken fragments on one stair only, cool mineral insets and incised cracks.
for i in range(12):box(base,(-7-rng.random()*4,.4+rng.random()*.5,-39-rng.random()*3),(rng.uniform(.3,1.1),.5,rng.uniform(.3,.8)),'b4a98f',rng.random()*2)
for x,y,z in [(-29,26,-26.8),(25.7,9,-26.2),(-9,9,-4.9)]:
    pts=[(0,0),(.08,.8),(-.12,1.4),(.25,2.1),(.18,1.35),(.22,.75),(.07,0)]
    palace.add(kit.g_prism(pts,.035),(x,y,z),'718f91')
objects=[b.finish() for b in [base,palace,*towers,cols,crystal,glow,orn,roof]]
cr=next(o for o in objects if o['part']=='crystal')
# Test actual maximum head tilt across a complete turn, preserving the neutral export pose.
for yaw in [i*math.tau/32 for i in range(33)]:
    for tilt in (-.2,.2):
        M=Matrix.Rotation(tilt,4,'X')@Matrix.Rotation(yaw,4,'Y')
        for p in crystal.v:
            q=M@(Vector(p)-Vector(crystal.pivot))+Vector(crystal.pivot)
            assert q.y>5.5 and math.hypot(q.x,q.z+15)<6.1,'Crystal clearance'
colliders=[dict(x=0,z=0,radius=47.4,base=0,height=3.6),dict(x=0,z=10,radius=19,base=3,height=38)]
colliders += [dict(x=x,z=z,radius=6.2,base=3,height=34 if i<2 else 38) for i,(x,z) in enumerate(towerpos)]
colliders += [dict(x=x,z=-16,radius=12,base=3,height=11.6) for x in (-20,20)]
meta=dict(forward='-Z',colliders=colliders,archCenter=[0,15,-3.8],crystalCenter=[0,13,-15],crystalClearanceRadius=6.1,extraParts=['gold','glass'])
parts,tris=kit.export_parts(ROOT/'atlantida.json',objects,meta)
pts=[kit._three(o.matrix_world@v.co) for o in objects for v in o.data.vertices]
dims=[max(p[i] for p in pts)-min(p[i] for p in pts) for i in range(3)]
assert parts<=12 and tris<=40000,(parts,tris)
assert min(p[1] for p in pts)>=-1e-5 and dims[1]<=45 and max(math.hypot(p[0],p[2]) for p in pts)<=60
assert len(colliders)<12
print('EXPORT',parts,'partes',tris,'triangulos DIMENSIONS XYZ',dims,flush=True)
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'atlantida.glb'),export_format='GLB',use_selection=True,export_extras=True,export_animations=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True
scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
w=bpy.data.worlds.new('Agua turquesa');w.use_nodes=True;scene.world=w
w.node_tree.nodes['Background'].inputs[0].default_value=(*kit.lin('2c86a3'),1);w.node_tree.nodes['Background'].inputs[1].default_value=.65
bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.data.energy=2.6;sun.data.angle=.22;sun.data.color=kit.lin('fff3d6');sun.rotation_euler=(.25,-.3,-.4)
bpy.ops.object.light_add(type='AREA');fill=bpy.context.object;fill.location=kit.B((0,48,-32));fill.data.energy=19000;fill.data.size=65;fill.data.color=kit.lin('b8e9ff');fill.rotation_euler=(kit.B((0,10,0))-fill.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24;cam.data.lens=24/(2*math.tan(math.pi/6));cam.data.clip_start=.1;cam.data.clip_end=1000
# Restrained optical bloom, baked only into review renders, not exported geometry.
scene.use_nodes=True;nt=scene.node_tree;nt.nodes.clear();rl=nt.nodes.new('CompositorNodeRLayers');g=nt.nodes.new('CompositorNodeGlare');g.glare_type='FOG_GLOW';g.quality='HIGH';g.threshold=1.3;g.mix=-.92;out=nt.nodes.new('CompositorNodeComposite');nt.links.new(rl.outputs['Image'],g.inputs['Image']);nt.links.new(g.outputs['Image'],out.inputs[0])
views=[('render-juego.png',(0,12,-105),(0,17,0),(1600,900)),('render-cerca.png',(49,28,-58),(0,17,-4),(1600,900)),('render-detalle.png',(-33,30,-32),(-28,28,-26),(1200,900)),('render-planta.png',(0,125,0),(0,0,0),(1200,900))]
for name,pos,target,res in views:
    cam.location=kit.B(pos);cam.rotation_euler=(kit.B(target)-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.resolution_x,scene.render.resolution_y=res;scene.render.filepath=str(ROOT/name);bpy.ops.render.render(write_still=True)
cam.location=kit.B(views[0][1]);cam.rotation_euler=(kit.B(views[0][2])-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.resolution_x=1600;scene.render.resolution_y=900
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'atlantida.blend'))
rows=[]
for ob in objects:
    p=tuple(round(x,2) for x in kit._three(ob.location));part=ob['part'];seg=ob.get('segment','—')
    motion='Y giro / X cabeceo | continuo / ±0.2 rad | 0.5 rad/s / 0.3 rad/s' if part=='crystal' else ('emisión | 1.3 ±0.3 | 0.5 rad/s' if part=='glow' else '— | fija | 0')
    rows.append(f'| {ob.name} | {part} | {seg} | {p} | {ob.data.materials[0].name} | {motion} |')
report=f'''# ENTREGA — Atlántida hundida · Walking AP Multi

## Estado

- Versión / ronda: v1, una ronda de corrección visual.
- Fecha: 2026-09-16.
- Lista para: revisión de Luis; integración a cargo del integrador.

## Archivos

| Archivo | Contenido |
|---|---|
| modelar-atlantida.py | Generador reproducible de toda la entrega |
| atlantida.blend | Escena editable, cámara de llegada y luces |
| atlantida.glb | Once mallas, pigmento conectado a materiales |
| atlantida.json | kit.export_parts; ejes Three, pivotes y colisionadores |
| render-juego.png, render-cerca.png, render-detalle.png, render-planta.png | Cycles, 40 muestras, denoise |

Regenerar desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 modelar-atlantida.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Fondo × alto × ancho | {dims[2]:.3f} × {dims[1]:.3f} × {dims[0]:.3f} u |
| Huella | Diámetro envolvente {2*max(math.hypot(p[0],p[2]) for p in pts):.3f} u |
| Origen | Centro de plataforma, pie en Y=0 |
| Frente | −Z Three |
| Triángulos | {tris} |
| Mallas | {parts} |
| JSON | {(ROOT/'atlantida.json').stat().st_size/1024:.1f} KiB |
| archCenter | (0,15,−3.8), arranque superior del vano principal |
| crystalCenter | (0,13,−15), pivote del corazón |
| crystalClearanceRadius | 6.1 u; giro completo y cabeceo ±0.2 comprobados en el script, por encima del altar |

`kit.export_parts` coloca los campos de meta en la raíz del JSON: `colliders`, `archCenter`, `crystalCenter`, `forward`. No existe un contenedor JSON llamado meta.

## Partes

| Objeto | part | segment | Pivote Three | Material | Eje Three | Amplitud | Velocidad |
|---|---|---|---|---|---|---|---|
'''+ '\n'.join(rows)+f'''

## Materiales

| Material | Color por vértice | Metal / rugosidad | Emisión | Alfa |
|---|---|---|---|---|
| Arenisca | #dcd3bc, #cfc5ac, #b4a98f, #9fb6bd | 0 / 0.78 | 0 | 1 |
| Oro | #d9a441 | 0.6 / 0.3 | 0 | 1 |
| Vidrio | #5fd8e8 | 0 / 0.1 | 0 | 0.78 |
| Corazón | #7fe9ff | 0 / 0.1 | 1.6, #7fe9ff | 0.90 |
| Ventanas y vetas | #7fe9ff | 0 / 0.25 | 1.3, #7fe9ff | 1 |

## Colisión

Ocho cilindros en espacio Three, relativos al origen:

| x | z | radio | base | altura |
|---|---|---|---|---|
'''+ '\n'.join(f"| {c['x']} | {c['z']} | {c['radius']} | {c['base']} | {c['height']} |" for c in colliders)+'''

Los dos cilindros de galerías son conservadores y cierran sus vanos; la ciudad se recorre por fuera. El palacio incluye el arco de entrada. La plataforma usa un cilindro de 3.6 u de altura.

## Diferencias con el brief

La cúpula y los remates están en la parte adicional `glass`; las cornisas doradas en `gold`. Esto conserva vidrio translúcido y oro satinado también en JSON, cuyo exportador admite un solo material por parte. Las nueve partes requeridas permanecen; total once. La vista cercana usa cámara (49,28,−58), a unos 36 u del muro de la torre frontal en planta, en lugar de ≈25 u para conservar más contexto del conjunto. No hay animación horneada: los pivotes están preparados para la animación del juego. El desgaste asimétrico se concentra en fragmentos de escalera, fisuras y coral bajo; no se inclinan las torres.

## Sugerencias para integrar

Girar crystal.rotation.y=t*0.5 y crystal.rotation.x=sin(t*0.3)*0.2. Modular glow.emissiveIntensity=1.3+sin(t*0.5)*0.3. Solo crystal y glow emiten. Mantener los colores de vértice y baseColor blanco; no teñir. Usar alpha del JSON en glass y crystal, con transparent=true y depthWrite=false si el orden de transparencia lo requiere. Oro y vidrio agrupan adornos de las cuatro torres: al retirar una torre, sus adornos permanecerían; conservar el conjunto completo o filtrar sus geometrías en la integración. El modelo no contiene suelo ajeno a la plataforma, agua, niebla ni luces exportadas en GLB. Los renders incluyen un bloom discreto de revisión.
'''
(ROOT/'ENTREGA.md').write_text(report,encoding='utf-8')
