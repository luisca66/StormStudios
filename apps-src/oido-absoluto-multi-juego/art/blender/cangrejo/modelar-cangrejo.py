"""Cangrejo del arrecife. bpy; autoría Three Y arriba, ojos +Z, marcha X.
Regenera JSON, GLB, BLEND, cuatro renders y ENTREGA.md en esta carpeta.
"""
import bpy, bmesh, math, sys, json, struct
from pathlib import Path
from mathutils import Vector, Matrix
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parents[3]/'grados-mayores-juego'/'art'/'blender'))
import kit
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection,116)
TAU=math.tau

def clamp(x):return max(0,min(1,x))
def mix(a,b,t):return tuple(Vector(kit.lin(a)).lerp(Vector(kit.lin(b)),clamp(t)))
def material(name,rough):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(1,1,1,1);p.inputs['Roughness'].default_value=rough
    p.inputs['Metallic'].default_value=0;p.inputs['Emission Strength'].default_value=0;p.inputs['Alpha'].default_value=1
    a=m.node_tree.nodes.new('ShaderNodeVertexColor');a.layer_name='Pigment';m.node_tree.links.new(a.outputs['Color'],p.inputs['Base Color']);return m
shellmat=material('Coral satinado',.44);legmat=material('Patas y juntas',.56);eyemat=material('Ojos y pedúnculos',.34)
class Geo:
    def __init__(self):self.v=[];self.f=[];self.c=[]
    def add(self,v,f,c):
        o=len(self.v);self.v.extend(v);self.f.extend(tuple(o+i for i in face) for face in f)
        self.c.extend([kit.lin(c)]*len(v) if isinstance(c,str) else c)
    def sphere(self,p,s,color,n=16,r=8):
        v=[];f=[]
        for i in range(r+1):
            a=math.pi*i/r
            for j in range(n):
                b=TAU*j/n;q=(p[0]+s[0]*math.sin(a)*math.cos(b),p[1]+s[1]*math.cos(a),p[2]+s[2]*math.sin(a)*math.sin(b));v.append(q)
        for i in range(r):
            for j in range(n):
                q=i*n+j;u=i*n+(j+1)%n;f.append((q,u,u+n,q+n))
        self.add(v,f,[color(p) for p in v] if callable(color) else color)
    def loft(self,controls,rows=16,n=10,pigment=None):
        # Controls: center XYZ, horizontal radius, vertical radius. Rounded continuous joints.
        v=[];f=[];c=[];centers=[];radii=[]
        for i in range(rows+1):
            t=i/rows*(len(controls)-1);k=min(len(controls)-2,int(t));u=t-k
            A=Vector(controls[max(0,k-1)]);B=Vector(controls[k]);C=Vector(controls[k+1]);D=Vector(controls[min(len(controls)-1,k+2)])
            q=.5*((2*B)+(-A+C)*u+(2*A-5*B+4*C-D)*u*u+(-A+3*B-3*C+D)*u*u*u)
            centers.append(Vector(q[:3]));radii.append((max(0,q[3]),max(0,q[4])))
        normal=None
        for i,p in enumerate(centers):
            tangent=(centers[min(i+1,rows)]-centers[max(i-1,0)]).normalized()
            if normal is None:
                ref=Vector((0,1,0)) if abs(tangent.y)<.9 else Vector((1,0,0));normal=tangent.cross(ref).normalized()
            else:normal=(normal-tangent*normal.dot(tangent)).normalized()
            vertical=tangent.cross(normal).normalized();rw,rh=radii[i]
            for j in range(n):
                a=TAU*j/n;q=p+normal*rw*math.cos(a)+vertical*rh*math.sin(a);v.append(tuple(q))
                c.append(pigment(i/rows,a,q) if pigment else kit.lin('e8472a'))
        for i in range(rows):
            for j in range(n):
                q=i*n+j;u=i*n+(j+1)%n;f.append((q,u,u+n,q+n))
        f.extend([tuple(reversed(range(n))),tuple(rows*n+j for j in range(n))]);self.add(v,f,c)
        return centers
    def object(self,name,part,mat,pivot=(0,0,0),segment=None):
        o=kit.make(name,[tuple(Vector(p)-Vector(pivot)) for p in self.v],self.f,mat,part=part,tint=0,smooth_angle=math.pi)
        o.location=kit.B(pivot)
        if segment is not None:o['segment']=segment
        a=o.data.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='POINT')
        for d,c in zip(a.data,self.c):d.color=(*c,1)
        bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6)
        bad=[f for f in bm.faces if f.calc_area()<1e-10]
        if bad:bmesh.ops.delete(bm,geom=bad,context='FACES')
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
        for face in o.data.polygons:face.use_smooth=True
        return o
# Closed continuous scalloped shell: upper relief is displaced, not separate floating plates.
g=Geo();v=[];f=[];c=[];N=56;R=18
spots=[(-.92,-.25,.14),(-.60,.57,.12),(.8,.25,.13),(.95,-.45,.10),(-.25,.78,.10),(.3,-.68,.13),(-1.18,.05,.08),(.42,.58,.08),(.13,.12,.075),(-.42,-.48,.08)]
for i in range(R+1):
    a=math.pi*i/R;s=math.sin(a);up=math.cos(a)
    for j in range(N):
        b=TAU*j/N;edge=1+.018*math.cos(12*b)*s**12
        x=1.47*s*math.cos(b)*edge;z=1.08*s*math.sin(b)*edge
        y=1.08+.55*up+.014*math.cos(12*b)*s**16
        groove=0
        if up>0:
            for zz in (-.5,-.13,.28):groove+=math.exp(-((z-(zz+.12*(x/1.3)**2))/.08)**2)*math.exp(-(x/1.15)**8)
            groove*=1-math.exp(-(x*x+z*z)/.22)
            y-=.035*groove*clamp(up*3)
        v.append((x,y,z))
        if up<-.08:col=mix('e8472a','f1e2c4',clamp((-up-.02)*3.2))
        else:
            col=mix('e8472a','b8361f',clamp(up*.58+groove*.12))
            fleck=max(math.exp(-(((x-sx)/r)**2+((z-sz)/r)**2)*2) for sx,sz,r in spots)*clamp(up*3)
            col=tuple(Vector(col).lerp(Vector(kit.lin('ff9a70')),fleck*.9))
        c.append(col)
for i in range(R):
    for j in range(N):q=i*N+j;u=i*N+(j+1)%N;f.append((q,u,u+N,q+N))
g.add(v,f,c);shell_bounds=[max(p[k] for p in v)-min(p[k] for p in v) for k in range(3)]
# Cream ball sockets bury the start rings of each walking leg.
leg_roots=[]
for side in (-1,1):
    for z in (.62,.22,-.22,-.62):
        p=(side*1.13,.93,z);leg_roots.append(p);g.sphere(p,(.19,.19,.19),'f1e2c4',10,6)
# Suggested smiling mouth, following the anterior shell lip.
smile=[]
for i in range(13):
    x=-.36+.72*i/12;smile.append((x,.96-.06*(1-(x/.36)**2),1.083-.045*(x/.36)**2,.018,.018))
g.loft(smile,12,6,lambda t,a,p:kit.lin('7a2418'))
body=g.object('Caparazón y vientre','body',shellmat)
# Eyes share one central pivot; their root rings are submerged in the front crown.
g=Geo();eye_pivot=(0,1.24,.68);eye_bases=[]
for side in (-1,1):
    controls=[(side*.44,1.22,.64,.10,.10),(side*.48,1.48,.73,.085,.085),(side*.55,1.82,.81,.075,.075),(side*.56,2.02,.85,.105,.105)]
    g.loft(controls,9,10,lambda t,a,p:mix('f1e2c4','e8472a',clamp(t*1.6)))
    eye_bases.append(controls[0][:3])
    g.sphere((side*.56,2.06,.86),(.245,.255,.24),'fff7e7',18,10)
    g.sphere((side*.56,2.095,1.079),(.118,.137,.062),'191719',14,8)
    g.sphere((side*.56-.035,2.153,1.132),(.033,.039,.020),'ffffff',8,5)
eyes=g.object('Ojos sobre pedúnculos','eyes',eyemat,eye_pivot)
# Eight jointed, tapered walking legs. The cream knee band belongs to each continuous mesh.
legs=[];leg_geos=[]
for idx,pivot in enumerate(leg_roots):
    side=-1 if idx<4 else 1;j=idx%4;fan=(1,.35,-.35,-1)[j];z=pivot[2]
    controls=[(side*1.10,.93,z,.12,.12),(side*1.55,.91,z+fan*.13,.17,.14),(side*2.27,1.04,z+fan*.40,.12,.105),(side*2.51,.83,z+fan*.62,.10,.09),(side*2.95,.28,z+fan*.92,.085,.070),(side*3.25,0,z+fan*1.08,0,0)]
    g=Geo()
    def legcolor(t,a,p):
        band=math.exp(-((t-.49)/.05)**2)*.85
        base=mix('e8472a','b8361f',clamp(t*.75+.12*math.sin(a)))
        return tuple(Vector(base).lerp(Vector(kit.lin('f1e2c4')),max(band,clamp((.15-t)*7))))
    g.loft(controls,14,8,legcolor)
    g.v=[(x,max(0,y),z) for x,y,z in g.v]
    legs.append(g.object('Pata '+str(idx),'leg',legmat,pivot,idx));leg_geos.append(g)
# Sculpted chelae: continuous shoulder, forearm, palm and fixed thumb, plus moving opposing finger.
claws=[];pincers=[];claw_geos=[];pincer_geos=[];hinges=[];shoulders=[];fixed_tips=[]
for seg,side in enumerate((-1,1)):
    cx=side*1.90;shoulder=(side*.92,.98,.74);hinge=(cx+.30,1.03,2.63)
    shoulders.append(shoulder);hinges.append(hinge)
    controls=[(side*.89,.98,.71,.15,.15),(side*1.33,.83,1.16,.21,.18),(side*1.80,.92,1.64,.21,.19),(cx,1.02,2.12,.46,.31),(cx-.12,1.04,2.48,.53,.34),(cx-.36,1.05,2.84,.26,.24),(cx-.28,1.05,3.13,.16,.15),(cx-.04,1.05,3.30,.085,.085),(cx+.02,1.05,3.36,0,0)]
    g=Geo()
    def clawcolor(t,a,p):
        col=mix('e8472a','ff9a70',.14+.12*math.sin(a))
        col=tuple(Vector(col).lerp(Vector(kit.lin('f1e2c4')),math.exp(-((t-.245)/.05)**2)*.78))
        return tuple(Vector(col).lerp(Vector(kit.lin('7a2418')),clamp((t-.76)*3.8)))
    g.loft(controls,25,20,clawcolor)
    g.sphere(hinge,(.22,.21,.23),'f1e2c4',20,10)
    claws.append(g.object('Brazo y pinza '+str(seg),'claw',shellmat,shoulder,seg));claw_geos.append(g);fixed_tips.append(controls[-1][:3])
    g=Geo()
    controls=[(*hinge,.15,.15),(cx+.47,1.03,2.89,.23,.24),(cx+.40,1.04,3.16,.15,.16),(cx+.27,1.05,3.31,.09,.09),(cx+.22,1.05,3.37,0,0)]
    g.loft(controls,15,18,lambda t,a,p:mix('e8472a','7a2418',clamp((t-.45)*1.6)))
    pincers.append(g.object('Dedo móvil '+str(seg),'pincer',shellmat,hinge,seg));pincer_geos.append(g)
objects=[body,eyes,*legs,*claws,*pincers];bpy.context.view_layer.update()
# Pose validation: all requested rotation combinations, not merely neutral pivots.
def shell_inside(p):
    x,y,z=p
    return (x/1.48)**2+((y-1.08)/.55)**2+(z/1.10)**2 < .985

def transform(p,pivot,M):return M@(Vector(p)-Vector(pivot))+Vector(pivot)
root_exemption=.47;checked=0;worst_ground=0
for ax in (-.4,0,.4):
    for az in (-.1,0,.1):
        M=Matrix.Rotation(ax,4,'X')@Matrix.Rotation(az,4,'Z')
        for pivot,g in zip(leg_roots,leg_geos):
            for p in g.v:
                q=transform(p,pivot,M)
                # Intended insertion in the cream shoulder socket is not a surface collision.
                if (Vector(p)-Vector(pivot)).length>root_exemption:assert not shell_inside(q),('leg/shell',ax,az,q)
                worst_ground=min(worst_ground,q.y);checked+=1
            assert (transform(pivot,pivot,M)-Vector(pivot)).length<1e-8
for lift in (-.15,0,.15):
    for opening in (0,.25,.5):
        for i in (0,1):
            M=Matrix.Rotation(lift,4,'Z');Y=Matrix.Rotation(opening,4,'Y');shoulder=shoulders[i];hinge=hinges[i]
            for p in claw_geos[i].v:
                q=transform(p,shoulder,M)
                if (Vector(p)-Vector(shoulder)).length>.48:assert not shell_inside(q),('claw/shell',q)
                checked+=1
            moved_hinge=transform(hinge,shoulder,M)
            assert (transform(transform(hinge,hinge,Y),shoulder,M)-moved_hinge).length<1e-8
            for p in pincer_geos[i].v:
                q=transform(transform(p,hinge,Y),shoulder,M);assert not shell_inside(q),('finger/shell',q);checked+=1
for a in (-.15,.15):
    for p in eye_bases:assert shell_inside(transform(p,eye_pivot,Matrix.Rotation(a,4,'Z'))),'eye roots'
meta=dict(forward='+Z',walkAxis='X',pincerHinge0=hinges[0],pincerHinge1=hinges[1],pincerParent0='claw:0',pincerParent1='claw:1',pincerOpeningAxis='+Y',eyeBase=eye_pivot,poseChecks=checked,minimumFootYAtIndependentExtremes=round(worst_ground,4))
parts,tris=kit.export_parts(ROOT/'cangrejo.json',objects=objects,meta=meta)
pts=[kit._three(o.matrix_world@v.co) for o in objects for v in o.data.vertices]
dim=[max(p[i] for p in pts)-min(p[i] for p in pts) for i in range(3)]
assert parts==14 and tris<=10000,(parts,tris)
assert dim[0]<=7 and max(p[1] for p in pts)<=2.4 and abs(min(p[1] for p in pts))<1e-6,dim
assert sorted(o.get('segment') for o in legs)==list(range(8))
for o in objects:
    p=o.data.materials[0].node_tree.nodes.get('Principled BSDF');assert p.inputs['Emission Strength'].default_value==0 and p.inputs['Alpha'].default_value==1
print('EXPORT',parts,'partes',tris,'triangulos DIMENSIONS XYZ',dim,'SHELL XYZ',shell_bounds,'POSE CHECKS',checked,flush=True)
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'cangrejo.glb'),export_format='GLB',use_selection=True,export_extras=True,export_animations=False)
data=(ROOT/'cangrejo.glb').read_bytes();length=struct.unpack_from('<I',data,12)[0];glb=json.loads(data[20:20+length])
assert len(glb['meshes'])==14 and all('COLOR_0' in p['attributes'] for m in glb['meshes'] for p in m['primitives'])
# Review-only sand, never exported with the creature.
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.012));sand=bpy.context.object;sand.name='Arena — solo render'
m=bpy.data.materials.new('Arena');m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*kit.lin('d9c28f'),1);p.inputs['Roughness'].default_value=.85;sand.data.materials.append(m)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
w=bpy.data.worlds.new('Océano turquesa');w.use_nodes=True;scene.world=w;w.node_tree.nodes['Background'].inputs[0].default_value=(*kit.lin('2c86a3'),1);w.node_tree.nodes['Background'].inputs[1].default_value=.45
bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.data.energy=2.8;sun.data.angle=.22;sun.data.color=kit.lin('fff3d6');sun.rotation_euler=(.20,-.28,.15)
bpy.ops.object.light_add(type='AREA');fill=bpy.context.object;fill.location=kit.B((-3,7,5));fill.data.energy=450;fill.data.size=7;fill.data.color=kit.lin('bcecff');fill.rotation_euler=(kit.B((0,1,0))-fill.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24;cam.data.lens=24/(2*math.tan(math.pi/6));cam.data.clip_start=.1;cam.data.clip_end=500
neutral={o.name:o.matrix_world.copy() for o in objects}
C=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
def place(o,pivot,rot):o.matrix_world=C@Matrix.Translation(Vector(pivot))@rot@C.inverted()
def pose(extreme=False):
    for o in objects:o.matrix_world=neutral[o.name].copy()
    if extreme:
        for i,o in enumerate(legs):
            phase=1 if i%2==0 else -1;M=Matrix.Rotation(phase*.4,4,'X')@Matrix.Rotation(phase*.1,4,'Z');place(o,leg_roots[i],M)
        for i,o in enumerate(claws):
            side=-1 if i==0 else 1;M=Matrix.Rotation(side*.15,4,'Z');place(o,shoulders[i],M)
            h=transform(hinges[i],shoulders[i],M);place(pincers[i],h,M@Matrix.Rotation(.5,4,'Y'))
        place(eyes,eye_pivot,Matrix.Rotation(.15,4,'Z'));bpy.context.view_layer.update()
        # Whole assembly correction keeps the planted foot on sand without pulling any joint apart.
        low=min((o.matrix_world@v.co).z for o in objects for v in o.data.vertices)
        for o in objects:o.location.z-=low
    bpy.context.view_layer.update()
angle=math.radians(55);target=Vector((0,.8,.35));direction=Vector((math.cos(angle)*.42,math.sin(angle),math.cos(angle)*math.sqrt(1-.42**2)))
views=[('render-juego.png',target+direction*18,target,(1600,900),False),('render-cerca.png',(3.0,2.7,6.05),(0,1.15,1.0),(1600,900),False),('render-arriba.png',(0,11,.8),(0,0,.8),(1200,900),False),('render-pose.png',(6.2,7.1,8.6),(0,1.1,.6),(1200,900),True)]
for name,pos,target,res,extreme in views:
    pose(extreme);cam.location=kit.B(pos);cam.rotation_euler=(kit.B(target)-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.resolution_x,scene.render.resolution_y=res;scene.render.filepath=str(ROOT/name);bpy.ops.render.render(write_still=True)
pose(False);cam.location=kit.B(views[0][1]);cam.rotation_euler=(kit.B(views[0][2])-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.resolution_x=1600;scene.render.resolution_y=900
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'cangrejo.blend'))
rows=[]
for o in objects:
    part=o['part'];seg=o.get('segment','—');pivot=tuple(round(x,3) for x in kit._three(o.location))
    if part=='body':motion='Y, traslación | ±0.1 u | 3 rad/s | Aplicar al grupo articulado; no separar las raíces.'
    elif part=='eyes':motion='Z | ±0.15 rad | 0.8 rad/s | Pedúnculos solidarios.'
    elif part=='leg':motion=f'X / Z | ±0.4 / ±0.1 rad | 3 rad/s | Fase {0 if seg%2==0 else "π"}; lado {"−X" if seg<4 else "+X"}.'
    elif part=='claw':motion=f'Z | ±0.15 rad | 0.7 rad/s | Elevar con signo {"−" if seg==0 else "+"}; mover su pincer como hija.'
    else:motion='Y | 0 → +0.5 rad | apertura 1 rad/s; pausa 3–5 s | Charnela local respecto al brazo; véase jerarquía.'
    rows.append(f'| {o.name} | {part} | {seg} | {pivot} | {o.data.materials[0].name} | {motion} |')
report=f'''# ENTREGA — Cangrejo · Walking AP Multi

## Estado

- Versión: v3, segunda y última ronda de corrección visual. Fecha: 2026-09-16.
- Lista para: revisión de Luis; integración a cargo del integrador.

## Archivos

| Archivo | Contenido |
|---|---|
| modelar-cangrejo.py | Genera toda esta entrega con bpy |
| cangrejo.blend | Escena editable, reposo, arena y luces de revisión |
| cangrejo.glb | 14 mallas, COLOR_0 conectado; sin arena ni luces |
| cangrejo.json | kit.export_parts, pivotes, segmentos y metadatos Three |
| render-juego.png, render-cerca.png, render-arriba.png, render-pose.png | Cycles, 40 muestras, denoise, FOV vertical 60°, near 0.1 |

Regenerar desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 modelar-cangrejo.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Largo × alto × ancho total | {dim[2]:.3f} × {dim[1]:.3f} × {dim[0]:.3f} u |
| Caparazón, ancho × fondo × alto | {shell_bounds[0]:.3f} × {shell_bounds[2]:.3f} × {shell_bounds[1]:.3f} u |
| Origen | (0,0,0), centro del caparazón proyectado al suelo; puntas neutrales Y=0 |
| Frente / marcha | +Z / eje X |
| Triángulos / mallas | {tris} / {parts} |
| JSON | {(ROOT/'cangrejo.json').stat().st_size/1024:.1f} KiB |
| pincerHinge0 | {tuple(round(x,3) for x in hinges[0])}, charnela lado −X |
| pincerHinge1 | {tuple(round(x,3) for x in hinges[1])}, charnela lado +X |
| eyeBase | {eye_pivot}, pivote común de los pedúnculos |

Los campos pasados como meta se escriben en la raíz JSON, según kit. Otros campos: walkAxis=X, pincerParent0=claw:0, pincerParent1=claw:1, pincerOpeningAxis=+Y; poseChecks={checked}; minimumFootYAtIndependentExtremes={worst_ground:.4f} u.

## Partes

| Objeto | part | segment | Pivote Three | Material | Eje Three | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
'''+ '\n'.join(rows)+f'''

## Materiales

| Material | Pigmentos hex | Metal / rugosidad | Emisión | Alfa | Notas |
|---|---|---|---|---|---|
| Coral satinado | #e8472a, #b8361f, #ff9a70, crema #f1e2c4, puntas #7a2418 | 0 / 0.44 | 0 | 1 | Caparazón, vientre y pinzas comparten acabado; pigmento propio |
| Patas y juntas | Coral, rojo oscuro, crema | 0 / 0.56 | 0 | 1 | Rodillas claras y extremos oscuros |
| Ojos y pedúnculos | #fff7e7, #191719, #ffffff, coral y crema | 0 / 0.34 | 0 | 1 | Brillo geométrico blanco; no emisión |

## Diferencias con el brief

Los materiales se agrupan por parte: el vientre comparte rugosidad del caparazón y los pedúnculos la de los ojos. Ambas pinzas abren con +Y de 0 a 0.5 rad como se pide; por eso el dedo móvil está en el borde +X de ambas manos (interior en la izquierda, exterior en la derecha). La vista cercana está a 6.08 u del punto de mirada, aproximadamente 5 u de la superficie anterior. Sin clips horneados ni cáusticas horneadas.

## Sugerencias para integrar

Al colgar pincer de claw, su traslación local es pincerHinge menos el pivote del hombro: izquierda {tuple(round(hinges[0][i]-shoulders[0][i],3) for i in range(3))}, derecha {tuple(round(hinges[1][i]-shoulders[1][i],3) for i in range(3))}. No volver a sumar su pivote global. Aplicar la rotación Y del dedo después de la transformación del brazo.

La subida y bajada de 0.1 u debe trasladar el conjunto de articulaciones para conservar las inserciones. Las patas son mallas rígidas articuladas en el hombro: combinaciones independientes de X/Z pueden dejar puntas hasta {abs(worst_ground):.3f} u bajo la arena. En render-pose se compensa la altura de todo el conjunto hasta apoyar la punta más baja; no se cambia el reposo exportado. Para caminar, coordinar fase y altura del conjunto o resolver apoyo en el integrador. No hay esqueleto ni articulaciones internas de rodilla exportadas.

## Revisión propia

El script comprueba dimensiones, presupuesto, segmentos, opacidad, emisión cero y COLOR_0 en GLB. Recorre {checked} posiciones de vértices en los extremos y en reposo, comparándolos con una envolvente elipsoidal del caparazón. Excluye únicamente las inserciones deliberadas dentro de las rótulas; comprueba continuidad exacta de los pivotes y de las charnelas con brazo elevado y dedo abierto. Las raíces de los ojos permanecen dentro del caparazón en ±0.15 rad. Esta comprobación es aproximada por envolvente, no una prueba booleana exhaustiva de todas las superficies entre sí.
'''
report += '\n' + '''Revisados los cuatro renders finales: silueta reconocible a 18 u; ocho patas separadas en la vista cenital; ojos, sonrisa y pinzas redondeadas legibles de cerca; brazos y dedos permanecen unidos en la pose abierta. Los surcos del caparazón son sutiles y el moteado aporta la mayor variación visible. La pose extrema usa la compensación vertical descrita arriba.''' + '\n'
(ROOT/'ENTREGA.md').write_text(report,encoding='utf-8')
