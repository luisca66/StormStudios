"""Tortuga marina. Regeneración completa con bpy 4.5, coordenadas Three Y_UP."""
import bpy, bmesh, math, sys, json, struct
from pathlib import Path
from mathutils import Vector, Matrix
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parents[3]/'grados-mayores-juego'/'art'/'blender'))
import kit
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection,91)
TAU=math.tau
def clamp(t):return max(0,min(1,t))
def mix(a,b,t):return tuple(Vector(kit.lin(a)).lerp(Vector(kit.lin(b)),clamp(t)))
def material(name,rough):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(1,1,1,1)
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=0
    c=m.node_tree.nodes.new('ShaderNodeVertexColor');c.layer_name='Pigment'
    m.node_tree.links.new(c.outputs['Color'],p.inputs['Base Color']);return m
shellmat=material('Caparazón satinado',.43);skinmat=material('Piel mate',.62)
class Geo:
    def __init__(self):self.v=[];self.f=[];self.c=[]
    def add(self,v,f,c):
        off=len(self.v);self.v.extend(v);self.f.extend(tuple(off+i for i in face) for face in f)
        self.c.extend([kit.lin(c)]*len(v) if isinstance(c,str) else c)
    def sphere(self,p,s,c,n=16,r=8):
        v=[];f=[]
        for i in range(r+1):
            a=math.pi*i/r
            for j in range(n):
                b=TAU*j/n;v.append((p[0]+s[0]*math.sin(a)*math.cos(b),p[1]+s[1]*math.cos(a),p[2]+s[2]*math.sin(a)*math.sin(b)))
        for i in range(r):
            for j in range(n):
                a=i*n+j;b=i*n+(j+1)%n;f.append((a,b,b+n,a+n))
        self.add(v,f,c)
    def tube(self,path,r,c,n=6):
        v=[];f=[]
        for i,p in enumerate(path):
            t=(Vector(path[min(i+1,len(path)-1)])-Vector(path[max(i-1,0)])).normalized()
            u=t.cross(Vector((0,1,0))).normalized();w=t.cross(u)
            for j in range(n):v.append(tuple(Vector(p)+r*(u*math.cos(TAU*j/n)+w*math.sin(TAU*j/n))))
        for i in range(len(path)-1):
            for j in range(n):
                a=i*n+j;b=i*n+(j+1)%n;f.append((a,b,b+n,a+n))
        f += [tuple(reversed(range(n))),tuple((len(path)-1)*n+j for j in range(n))]
        self.add(v,f,c)
    def object(self,name,part,mat,pivot=(0,0,0),segment=None):
        ob=kit.make(name,[tuple(Vector(p)-Vector(pivot)) for p in self.v],self.f,mat,part=part,tint=0,smooth_angle=math.pi)
        ob.location=kit.B(pivot)
        col=ob.data.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='POINT')
        for i,c in enumerate(self.c):col.data[i].color=(*c,1)
        if segment is not None:ob['segment']=segment
        bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6)
        bad=[f for f in bm.faces if f.calc_area()<1e-10]
        if bad:bmesh.ops.delete(bm,geom=bad,context='FACES')
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
        for f in ob.data.polygons:f.use_smooth=True
        return ob
def spline(tab,t):
    if t<=tab[0][0]:return tab[0][1:]
    if t>=tab[-1][0]:return tab[-1][1:]
    for i in range(len(tab)-1):
        a,b=tab[i:i+2]
        if a[0]<=t<=b[0]:
            prev=tab[max(0,i-1)];nxt=tab[min(len(tab)-1,i+2)];h=b[0]-a[0];u=(t-a[0])/h
            return [(2*u**3-3*u*u+1)*a[k]+(u**3-2*u*u+u)*h*(b[k]-prev[k])/(b[0]-prev[0])+(-2*u**3+3*u*u)*b[k]+(u**3-u*u)*h*(nxt[k]-a[k])/(nxt[0]-a[0]) for k in range(1,len(a))]
# Claude (integrador, 2026-09-16), a pedido de Luis: tortugas mas gorditas en vertical.
# SHELL_H levanta la cupula del caparazon (y los escudos que la siguen) y BELLY da mas
# panza al plastron. Pivotes de aletas y cuello no cambian: quedan aun mas cubiertos.
SHELL_H=1.65
BELLY=.31
def dome(x,z):return .07+.60*SHELL_H*math.sqrt(max(0,1-(x/1.2)**2-(z/1.5)**2))
g=Geo();v=[];f=[];c=[]
# Continuous closed oval shell and plastron; lightly scalloped equatorial lip.
for i in range(21):
    a=math.pi*i/20
    for j in range(48):
        b=TAU*j/48;r=math.sin(a);sc=1-.008*(.5+.5*math.cos(20*b))*r**12
        x=1.2*r*math.cos(b)*sc;z=1.5*r*math.sin(b)*sc
        y=.07+(.49*SHELL_H if math.cos(a)>=0 else BELLY)*math.cos(a)
        v.append((x,y,z))
        c.append(mix('c8a24a','e6d9a8',clamp(-math.cos(a)*5)))
for i in range(20):
    for j in range(48):
        a=i*48+j;b=i*48+(j+1)%48;f.append((a,b,b+48,a+48))
g.add(v,f,c)
# Voronoi scutes clipped inside an oval: soft raised crowns over amber sutures.
seeds=[(0,z) for z in (-1.12,-.57,0,.57,1.12)]
seeds += [(s*.70,z) for s in (-1,1) for z in (-.94,-.32,.32,.94)]
outline=[(1.178*math.cos(TAU*j/48),1.473*math.sin(TAU*j/48)) for j in range(48)]
def clip(poly,n,d):
    out=[]
    for a,b in zip(poly,poly[1:]+poly[:1]):
        da=a[0]*n[0]+a[1]*n[1]-d;db=b[0]*n[0]+b[1]*n[1]-d
        if da<=0:out.append(a)
        if (da<0)!=(db<0):
            t=da/(da-db);out.append((a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])))
    return out
for idx,s in enumerate(seeds):
    poly=outline[:]
    for q in seeds:
        if q!=s:poly=clip(poly,(q[0]-s[0],q[1]-s[1]),(q[0]**2+q[1]**2-s[0]**2-s[1]**2)/2)
    center=Vector((sum(p[0] for p in poly)/len(poly),sum(p[1] for p in poly)/len(poly)))
    edge=[]
    for a,b in zip(poly,poly[1:]+poly[:1]):
        for k in range(2):edge.append(Vector(a).lerp(Vector(b),k/2))
    v=[];f=[];c=[];n=len(edge)
    for ring in (0,.45,.82,.965,1.0):
        for p in edge:
            x,z=center.lerp(p,ring);y=dome(x,z)+.006+.032*(1-ring**4)
            v.append((x,y,z));c.append(kit.lin('c8a24a') if ring==1.0 else mix('2f5236','4e7a4a',.35+.45*(1-ring)+.12*math.sin(idx*2.1)))
    for i in range(4):
        for j in range(n):
            a=i*n+j;b=i*n+(j+1)%n;f.append((a,b,b+n,a+n))
    g.add(v,f,c)
# Tapered tail buried beneath the rear shell lip.
g.sphere((0,-.035,-1.40),(.13,.115,.43),'5d7f6a',16,8)
body=g.object('Caparazón, plastrón y cola','body',shellmat)
# One continuous sculpted neck/head loft. Root lies well inside shell.
g=Geo();v=[];f=[];c=[]
HP=[(.91,.18,.08,.05),(1.18,.225,.15,.05),(1.42,.23,.205,.025),(1.64,.32,.265,.075),(1.86,.33,.255,.07),(2.06,.25,.19,.025),(2.18,.08,.09,.0),(2.20,0,0,0)]
for i in range(25):
    z=.91+1.29*(.5-.5*math.cos(math.pi*i/24));rx,ry,cy=spline(HP,z)
    for j in range(32):
        a=TAU*j/32;v.append((rx*math.cos(a),cy+ry*math.sin(a),z))
        c.append(mix('5d7f6a','e6d9a8',clamp((.35-math.sin(a))*1.4)))
for i in range(24):
    for j in range(32):
        a=i*32+j;b=i*32+(j+1)%32;f.append((a,b,b+32,a+32))
f.append(tuple(reversed(range(32))));g.add(v,f,c)
for side in (-1,1):
    g.sphere((side*.295,.16,1.845),(.056,.076,.075),'182923',16,8)
    path=[(side*.304,.16+.079*math.sin(math.pi*k/12),1.845+.080*math.cos(math.pi*k/12)) for k in range(13)]
    g.tube(path,.025,'698670',6)
    g.sphere((side*.340,.181,1.873),(.009,.015,.014),'ede9d6',8,4)
    g.sphere((side*.098,.092,2.116),(.024,.019,.012),'3d5641',8,4)
# Gentle curved beak smile across the muzzle, not beneath the eye.
path=[]
for k in range(21):
    x=-.235+.47*k/20;z=2.168-.24*(x/.25)**2
    path.append((x,-.026+.048*(x/.235)**2,z))
g.tube(path,.012,'66724b',6)
head=g.object('Cabeza y cuello','head',skinmat,(0,0,1.10))
flippers=[]
for segment in range(4):
    side=-1 if segment%2==0 else 1;front=segment<2
    pivot=(side*(.82 if front else .70),.06,.65 if front else -.94)
    tab=([(0,.60,0,.65,.19,.15),(.18,1.03,-.015,.58,.33,.15),(.43,1.55,-.07,.22,.36,.105),(.70,2.04,-.13,-.20,.24,.068),(.91,2.34,-.10,-.55,.12,.032),(1,2.43,-.07,-.72,0,0)] if front else [(0,.49,0,-.94,.16,.12),(.3,.92,-.04,-1.09,.28,.10),(.65,1.24,-.055,-1.39,.23,.065),(1,1.39,-.03,-1.72,0,0)])
    g=Geo();v=[];f=[];c=[];rows=22 if front else 15;n=16
    for i in range(rows+1):
        t=i/rows;x,y,z,ch,th=spline(tab,t)
        for j in range(n):
            a=TAU*j/n;xx=side*x;yy=.06+y+th*math.sin(a);zz=z+ch*math.cos(a)
            v.append((xx,yy,zz))
            spot=clamp((math.sin(x*15+zz*8)*math.sin(zz*17-x*5)-.25)*2)
            base=Vector(mix('5d7f6a','b5c4a0',spot*.65))
            base=base.lerp(Vector(kit.lin('e6d9a8')),clamp(-math.sin(a))*.70)
            c.append(tuple(base))
    for i in range(rows):
        for j in range(n):
            a=i*n+j;b=i*n+(j+1)%n;f.append((a,b,b+n,a+n))
    f.append(tuple(reversed(range(n))));g.add(v,f,c)
    flippers.append(g.object(('Delantera ' if front else 'Trasera ')+str(segment),'flipper',skinmat,pivot,segment))
meshes=[body,head,*flippers];bpy.context.view_layer.update()
# Root-ring containment checks in the closed shell, both rotation extremes.
def inside(p):
    x,y,z=p;r2=(x/1.2)**2+(z/1.5)**2
    if r2>=1:return False
    return .07-BELLY*math.sqrt(1-r2)<y<dome(x,z)
for angle in (-.25,0,.25):
    for j in range(24):
        a=TAU*j/24;p=Vector((.13*math.cos(a),.05+.065*math.sin(a),1.02));pivot=Vector((0,0,1.10))
        assert inside(pivot+Matrix.Rotation(angle,3,'Y')@(p-pivot)),('neck',angle)
for segment in range(4):
    side=-1 if segment%2==0 else 1;front=segment<2;pivot=Vector((side*(.82 if front else .70),.06,.65 if front else -.94))
    for angle in ((-.5,0,.5) if front else (-.15,0,.15)):
        for j in range(24):
            a=TAU*j/24;p=Vector((side*(.64 if front else .53),.06+.045*math.sin(a),(.65 if front else -.94)+.10*math.cos(a)))
            assert inside(pivot+Matrix.Rotation(angle,3,'Z')@(p-pivot)),('flipper',segment,angle)
MOUTH=(0,-.026,2.20)
parts,tris=kit.export_parts(ROOT/'tortuga.json',meta=dict(forward='+Z',mouth=list(MOUTH)))
points=[kit._three(o.matrix_world@v.co) for o in meshes for v in o.data.vertices]
dims=[max(p[i] for p in points)-min(p[i] for p in points) for i in range(3)]
assert parts==6 and tris<=9000,(parts,tris)
assert dims[0]<=5 and 3.8<dims[2]<4.3,dims
bpy.ops.object.select_all(action='DESELECT')
for ob in meshes:ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'tortuga.glb'),export_format='GLB',use_selection=True,export_extras=True,export_animations=False)
raw=(ROOT/'tortuga.glb').read_bytes();ln=struct.unpack_from('<I',raw,12)[0];gl=json.loads(raw[20:20+ln])
assert all('COLOR_0' in p['attributes'] for m in gl['meshes'] for p in m['primitives'])
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True
scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
w=bpy.data.worlds.new('Océano');w.use_nodes=True;scene.world=w;nt=w.node_tree
ambient=nt.nodes.get('Background');ambient.inputs[0].default_value=(*kit.lin('b4dce8'),1);ambient.inputs[1].default_value=.5
bg=nt.nodes.new('ShaderNodeBackground');bg.inputs[0].default_value=(*kit.lin('2c86a3'),1)
lp=nt.nodes.new('ShaderNodeLightPath');mixnode=nt.nodes.new('ShaderNodeMixShader')
nt.links.new(lp.outputs['Is Camera Ray'],mixnode.inputs[0]);nt.links.new(ambient.outputs[0],mixnode.inputs[1]);nt.links.new(bg.outputs[0],mixnode.inputs[2]);nt.links.new(mixnode.outputs[0],nt.nodes['World Output'].inputs[0])
bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.data.energy=2.0;sun.data.angle=.20;sun.data.color=kit.lin('fff3d6');sun.rotation_euler=(.25,-.20,.4)
for pos,power,size,col in [((-4,3,5),180,5,'c5e7f1'),((1,-3,3),100,4,'fff3d6')]:
    bpy.ops.object.light_add(type='AREA');o=bpy.context.object;o.location=kit.B(pos);o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler();o.data.energy=power;o.data.size=size;o.data.color=kit.lin(col)
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24;cam.data.lens=24/(2*math.tan(math.pi/6));cam.data.clip_start=.1
def camera(pos,target,res):
    cam.location=kit.B(pos);cam.rotation_euler=(kit.B(target)-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.resolution_x,scene.render.resolution_y=res
def render(name,pos,target,res):
    camera(pos,target,res);scene.render.filepath=str(ROOT/name);bpy.ops.render.render(write_still=True)
gamepos=Vector((.65,.8,1)).normalized()*25
render('render-juego.png',gamepos,(0,0,0),(1600,900))
target=Vector((0,.10,.2));render('render-cerca.png',target+Vector((.85,.65,1)).normalized()*6,target,(1600,900))
render('render-arriba.png',(0,5.4,.001),(0,0,0),(1200,900))
for ob in flippers[:2]:ob.rotation_euler.y=-.5
head.rotation_euler.z=.25
render('render-pose.png',(3.4,2.3,4.3),(0,0,.2),(1200,900))
for ob in meshes:ob.rotation_euler=(0,0,0)
camera(gamepos,(0,0,0),(1600,900));scene.render.filepath=str(ROOT/'render-juego.png');bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'tortuga.blend'))
report=f'''# ENTREGA — Tortuga marina · Walking AP Multi

## Estado

- Versión: v3; corrección propia 2 de 2. Fecha: 2026-09-15.
- Lista para revisión de Luis; integración a cargo del integrador.

## Archivos

| Archivo | Contenido |
|---|---|
| modelar-tortuga.py | Regenera todos los entregables. |
| tortuga.blend | Escena editable, seis partes en reposo. |
| tortuga.glb | COLOR_0 conectado, partes y segmentos en extras. |
| tortuga.json | Exportación neutral kit.export_parts. |
| render-juego.png, render-cerca.png, render-arriba.png, render-pose.png | Cycles 40 muestras y denoise; FOV vertical 60°, near 0.1. |

Regenerar desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 modelar-tortuga.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Largo × alto × ancho total | {dims[2]:.3f} × {dims[1]:.3f} × {dims[0]:.3f} u |
| Caparazón aproximado | 3.0 × 0.86 × 2.4 u, largo × alto × ancho |
| Origen | Centro del caparazón (0,0,0); articulaciones de aletas en Y=0.06. |
| Frente | +Z Three / −Y Blender. |
| Triángulos / mallas | {tris} / {parts} |
| JSON | {(ROOT/'tortuga.json').stat().st_size/1024:.1f} KiB |
| meta.mouth | {MOUTH}, hocico neutral, espacio Three; transformar con head al animar. |

## Partes

| Objeto | part | segment | Pivote Three | Material | Eje | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Caparazón, plastrón y cola | body | — | (0,0,0) | Caparazón | — | Fijo | 0 | Escudos en relieve. |
| Cabeza y cuello | head | — | (0,0,1.10) | Piel | X / Y | ±0.12 / ±0.25 rad | 0.45 / 0.30 rad/s | Mirada lenta. |
| Delantera 0 | flipper | 0 | (−0.82,0.06,0.65) | Piel | Z | ±0.5 rad | 1.6 rad/s | Lado −X. |
| Delantera 1 | flipper | 1 | (0.82,0.06,0.65) | Piel | Z | ±0.5 rad | 1.6 rad/s | Lado +X. |
| Trasera 2 | flipper | 2 | (−0.70,0.06,−0.94) | Piel | Z | ±0.15 rad | 0.8 rad/s | Timón. |
| Trasera 3 | flipper | 3 | (0.70,0.06,−0.94) | Piel | Z | ±0.15 rad | 0.8 rad/s | Timón. |

## Materiales

| Material | Pigmentos hex | Metal / rugosidad | Emisión | Alfa | Integración |
|---|---|---|---|---|---|
| Caparazón | #2f5236–#4e7a4a, suturas #c8a24a, plastrón #e6d9a8 | 0 / 0.43 | 0 | 1 | Un acabado en body, incluida cola. |
| Piel | #5d7f6a, motas #b5c4a0, cuello #e6d9a8, ojos #182923 | 0 / 0.62 | 0 | 1 | Ojos comparten acabado mate; destello geométrico sin emisión. |

## Diferencias con el brief

El kit preserva +Z en el JSON: meta.forward declara +Z sin invertir silenciosamente el modelo. Body comparte material satinado en plastrón y cola, por el límite de un material por parte. Las articulaciones quedan 0.06 u sobre el origen central para mantener las raíces cubiertas. No se incluyen cáusticas ni niebla horneadas en el modelo.

## Sugerencias para integrar

La pose solicitada usa +0.5 rad Z en ambas delanteras y +0.25 rad Y en cabeza. Para un vuelo bilateral simétrico, usar la misma fase temporal y signos contrarios de Z a cada lado; el mismo signo produce balanceo. Exportaciones en reposo, sin clips horneados. Meta se almacena en la raíz del JSON por convenio de kit. Para mouth móvil, restar el pivote de head antes de aplicar su matriz.

## Revisión propia

El generador comprueba presupuesto, dimensiones, seis partes, COLOR_0 del GLB y anillos interiores de articulación en los extremos ±0.5/±0.15 y ±0.25 rad. Esta comprobación cubre la continuidad de las raíces, no es una prueba de intersección de toda la superficie.

Revisados visualmente los cuatro renders finales: silueta reconocible a 25 u; caparazón ovalado con escudos continuos en ámbar y relieve suave; cabeza redondeada con ojos pequeños y párpados; aletas con grosor y moteado. En la pose +0.5/+0.25 no se observan huecos expuestos en las uniones visibles. Se corrigieron los cruces de la base con los escudos y las juntas oscuras. No se ha probado la animación dentro del juego.
'''
(ROOT/'ENTREGA.md').write_text(report,encoding='utf-8')
print('EXPORT',parts,'partes',tris,'triangulos','DIMENSIONS largo alto ancho',dims[2],dims[1],dims[0],flush=True)
