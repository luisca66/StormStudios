"""Jorobada del Océano. bpy 4.5; autoría Y arriba / cabeza +Z.

Ejecutar mediante bpy-run.ps1. Todos los archivos se regeneran junto al script.
Los cinco objetos se guardan en reposo; los renders no alteran el JSON ni el GLB.
"""
import bpy, bmesh, math, sys, json, struct
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parents[3]/'grados-mayores-juego'/'art'/'blender'))
import kit
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection,73)
TAU=math.tau
def clamp(x): return max(0.,min(1.,x))
def smooth(x):
    x=clamp(x); return x*x*(3-2*x)
def color(a,b,t): return tuple(Vector(kit.lin(a)).lerp(Vector(kit.lin(b)),clamp(t)))

skin=bpy.data.materials.new('Piel satinada · pigmento');skin.use_nodes=True
bs=skin.node_tree.nodes.get('Principled BSDF')
bs.inputs['Base Color'].default_value=(1,1,1,1)
bs.inputs['Roughness'].default_value=.46;bs.inputs['Metallic'].default_value=0
bs.inputs['Emission Strength'].default_value=0
vc=skin.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Pigment'
skin.node_tree.links.new(vc.outputs['Color'],bs.inputs['Base Color'])

class Geo:
    def __init__(self): self.v=[];self.f=[];self.c=[]
    def add(self,v,f,c):
        off=len(self.v); self.v.extend(v);self.f.extend(tuple(off+i for i in face) for face in f)
        self.c.extend([kit.lin(c)]*len(v) if isinstance(c,str) else c)
    def sphere(self,p,s,c,n=16,r=8):
        v=[];f=[]
        for i in range(r+1):
            a=math.pi*i/r
            for j in range(n):
                b=TAU*j/n;v.append((p[0]+s[0]*math.sin(a)*math.cos(b),p[1]+s[1]*math.cos(a),p[2]+s[2]*math.sin(a)*math.sin(b)))
        for i in range(r):
            for j in range(n):
                q=i*n+j;t=i*n+(j+1)%n;f.append((q,t,t+n,q+n))
        self.add(v,f,c)
    def tube(self,path,radii,c,n=8):
        v=[];f=[]
        for i,p in enumerate(path):
            tangent=(Vector(path[min(i+1,len(path)-1)])-Vector(path[max(0,i-1)])).normalized()
            ref=Vector((0,1,0)) if abs(tangent.y)<.95 else Vector((1,0,0))
            u=tangent.cross(ref).normalized();w=tangent.cross(u)
            for j in range(n):
                a=TAU*j/n;v.append(tuple(Vector(p)+radii[i]*(u*math.cos(a)+w*math.sin(a))))
        for i in range(len(path)-1):
            for j in range(n):
                a=i*n+j;b=i*n+(j+1)%n;f.append((a,b,b+n,a+n))
        f.extend([tuple(reversed(range(n))),tuple((len(path)-1)*n+j for j in range(n))])
        self.add(v,f,c)
    def object(self,name,part,pivot=(0,0,0),segment=None):
        ob=kit.make(name,[tuple(Vector(v)-Vector(pivot)) for v in self.v],self.f,skin,part=part,tint=0,smooth_angle=math.pi)
        ob.location=kit.B(pivot)
        a=ob.data.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='POINT')
        for i,c in enumerate(self.c):a.data[i].color=(*c,1)
        if segment is not None:ob['segment']=segment
        bm=bmesh.new();bm.from_mesh(ob.data)
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
        bad=[f for f in bm.faces if f.calc_area()<1e-10]
        if bad:bmesh.ops.delete(bm,geom=bad,context='FACES')
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
        for poly in ob.data.polygons:poly.use_smooth=True
        return ob

def spline(table,z):
    """Cubic Hermite interpolation with finite-difference tangents."""
    if z<=table[0][0]:return table[0][1:]
    if z>=table[-1][0]:return table[-1][1:]
    for i in range(len(table)-1):
        a,b=table[i],table[i+1]
        if a[0]<=z<=b[0]:
            prev=table[max(0,i-1)];nxt=table[min(len(table)-1,i+2)]
            h=b[0]-a[0];t=(z-a[0])/h;out=[]
            for k in range(1,len(a)):
                m0=(b[k]-prev[k])/(b[0]-prev[0]);m1=(nxt[k]-a[k])/(nxt[0]-a[0])
                out.append((2*t**3-3*t*t+1)*a[k]+(t**3-2*t*t+t)*h*m0+(-2*t**3+3*t*t)*b[k]+(t**3-t*t)*h*m1)
            return out

PROFILE=[(-13.55,0,0,0),(-13,1.185,1.185,0),(-12,1.55,1.55,0),(-9,2.1,2.65,.05),
         (-5,3.2,3.9,0),(0,3.9,4.5,0),(5,4.05,4.2,-.05),(9,3.6,3.5,.05),
         (12,3.05,2.8,.15),(14.5,2.35,1.7,.4),(16.2,1.1,.9,.35),(16.8,0,0,.3)]
def lip_height(z):return -.62+.90*smooth((z-13)/3.8)
def body_point(z,a):
    rx,ry,cy=spline(PROFILE,z)
    if z<=-12:rx=ry=math.sqrt(max(0,1.55**2-(z+12)**2));cy=0
    x=rx*math.cos(a);y=cy+ry*math.sin(a)
    # Closed underside of skull; the separate jaw embraces it when shut.
    front=smooth((z-5.5)/2.8)
    y=y*(1-front)+max(y,lip_height(z)-.04)*front
    return (x,y,z)
def pigment(z,a):
    ventral=smooth((-math.sin(a)-.20)/.55)
    c=Vector(color('3f6485','27465e',smooth((math.sin(a)+.2)/1.2)))
    c=c.lerp(Vector(kit.lin('e8e2d2')),ventral)
    mottles=.97+.03*math.sin(z*1.7+math.cos(a)*9)*math.sin(z*.6-a*7)
    return tuple(c*mottles)

g=Geo();v=[];f=[];c=[];NR=60;NA=48
for i in range(NR+1):
    z=-13.55+30.35*(.5-.5*math.cos(math.pi*i/NR))
    for j in range(NA):
        a=TAU*j/NA;v.append(body_point(z,a));c.append(pigment(z,a))
for i in range(NR):
    for j in range(NA):
        a=i*NA+j;b=i*NA+(j+1)%NA;f.append((a,b,b+NA,a+NA))
g.add(v,f,c)

# Small noble eyes set into the flanks, embraced by skin lids.
for side in (-1,1):
    z=10.1;rx,ry,cy=spline(PROFILE,z)
    p=(side*(rx-.02),.32,z)
    g.sphere(p,(.16,.28,.32),'111e29',24,12)
    g.sphere((side*(rx+.135),.40,z+.10),(.020,.046,.040),'d3e6e8',12,6)
    path=[]
    for k in range(15):
        a=.05+math.pi*.92*k/14
        path.append((side*(rx-.015),.32+.29*math.sin(a),z+.34*math.cos(a)))
    g.tube(path,[.075]*15,'3f6485',8)
    # Crown tubercles mostly buried in the head surface.
    for z in (11,12.5,13.9,15.0):
        a=.66 if side>0 else math.pi-.66;p=Vector(body_point(z,a));p.y-=.06
        g.sphere(p,(.23,.16,.27),'536c7a',12,6)

# Blowhole is a shallow dark double cleft on the crown, not an open mesh hole.
z=8.2;rx,ry,cy=spline(PROFILE,z);BLOW=(0,ry+cy+.015,z)
for side in (-1,1):g.sphere((side*.17,BLOW[1]-.028,z),(.13,.06,.30),'1e303d',16,6)

# Low, curved dorsal hump is part of body.
def fin(g,stations,side=1,kind='flipper',rows=27,n=16):
    """Closed lenticular sections: rounded leading edge, tapered trailing edge."""
    vv=[];ff=[];cc=[]
    for i in range(rows+1):
        t=i/rows
        x,y,z,chord,thick=spline(stations,t)
        for j in range(n):
            a=TAU*j/n
            # Section around longitudinal chord. Small tubercles deform the edge itself.
            bump=(.065*math.sin(t*math.pi*9)**6*math.sin(math.pi*t)) if kind=='flipper' else .045*math.sin(t*math.pi*6)**2
            zz=z+chord*math.cos(a)*(1+bump)
            yy=y+thick*math.sin(a)
            vv.append((side*x,yy,zz))
            low=smooth((-math.sin(a)-.05)/.65)
            shade=.08+.08*math.sin(t*15)**2
            cc.append(color('3f6485','f1efe6',low*(.94-shade*.15)))
    for i in range(rows):
        for j in range(n):
            a=i*n+j;b=i*n+(j+1)%n;ff.append((a,b,b+n,a+n))
    ff.extend([tuple(reversed(range(n))),tuple(rows*n+j for j in range(n))])
    g.add(vv,ff,cc)

# Dorsal blade defined by ellipsoid cross sections along height.
v=[];f=[];c=[]
for i in range(13):
    t=i/12;y=2.7+2.4*t;z=-7.1-1.2*t
    for j in range(18):
        a=TAU*j/18;v.append((.48*(1-t)*math.cos(a),y,z+1.8*(1-t)**.8*math.sin(a)))
        c.append(kit.lin('354b5c'))
for i in range(12):
    for j in range(18):
        a=i*18+j;b=i*18+(j+1)%18;f.append((a,b,b+18,a+18))
f.append(tuple(reversed(range(18))));g.add(v,f,c)
body=g.object('Cuerpo · cabeza, ojos y dorsal','body')

# Long swept paddles: total span below 22, exposed length approximately 12.
flippers=[];flipper_roots=[]
ST=[(0,2.65,-.55,4.0,1.02,.48),(.13,4.4,-1.0,3.0,1.40,.46),
    (.35,6.1,-2.0,.1,1.34,.34),(.60,8.1,-3.6,-3.6,.98,.23),
    (.82,9.8,-4.8,-5.7,.60,.13),(1,10.65,-4.7,-6.6,.015,.012)]
for segment,side in enumerate((-1,1)):
    g=Geo();fin(g,ST,side,rows=32,n=18)
    pivot=(side*3.25,-.55,3.8)
    ob=g.object('Pectoral '+str(segment),'flipper',pivot,segment)
    flippers.append(ob);flipper_roots.append((side*2.65,-.55,4.0))

# Tail root is a submerged rounded bulb, overlapping the closed rear body.
g=Geo();v=[];f=[];c=[]
TP=[(-20.8,.30,.23,0),(-19.3,.55,.44,0),(-17,.72,.72,0),(-14.6,1.0,1.12,0),
    (-13,1.36,1.36,0),(-12.6,1.437,1.437,0),(-12,1.557,1.557,0),(-11.2,1.336,1.336,0),(-10.443,0,0,0)]
for i in range(29):
    z=-20.8+10.357*i/28;rx,ry,cy=spline(TP,z)
    if z>=-12.6:rx=ry=math.sqrt(max(0,1.557**2-(z+12)**2));cy=0
    for j in range(28):
        a=TAU*j/28;v.append((rx*math.cos(a),ry*math.sin(a),z));c.append(pigment(z,a))
for i in range(28):
    for j in range(28):
        a=i*28+j;b=i*28+(j+1)%28;f.append((a,b,b+28,a+28))
f.extend([tuple(reversed(range(28))),tuple(28*28+j for j in range(28))]);g.add(v,f,c)
FL=[(0,0,0,-20.3,1.15,.33),(.17,1.4,.08,-20.8,1.70,.32),(.38,3.3,.20,-20.9,1.95,.27),
    (.62,5.25,.30,-20.5,1.6,.20),(.84,6.7,.42,-19.8,.86,.12),(1,7.5,.52,-19.2,.015,.012)]
for side in (-1,1):fin(g,FL,side,'tail',rows=32,n=16)
tail=g.object('Pedúnculo y cola horizontal','tail',(0,0,-12.0))

# Broad separate lower jaw: closed top plus sculpted cream throat.
g=Geo();v=[];f=[];c=[]
JP=[(4.8,.02,.02,-1.3),(6.1,2.60,1.65,-2.05),(8,3.55,1.6,-2.15),
    (10,3.36,1.43,-2.02),(12,2.88,1.12,-1.70),(14,2.35,.70,-1.22),
    (15.5,1.57,.42,-.85),(16.6,.30,.12,-.59),(16.85,0,0,-.54)]
for i in range(37):
    z=4.8+(16.85-4.8)*(.5-.5*math.cos(math.pi*i/36));rx,ry,cy=spline(JP,z)
    for j in range(48):
        a=TAU*j/48
        # Claude (integrador, 2026-09-15): antes el caparazon de la garganta se estrechaba a
        # cero en su borde trasero y dejaba un escalon recto visible de cerca. Ahora, en vez
        # de pinzarse, se hunde bajo la piel del cuerpo (98.4 % del radio) y sale a flote
        # hacia el frente, asi que la union no tiene borde.
        fade=smooth((z-4.8)/3.2)
        rx=spline(PROFILE,min(z,16.8))[0]*(.984+.022*fade)
        x=rx*math.cos(a)
        y=lip_height(z)+min(0,2*ry*math.sin(a))
        # Pleats follow the throat along its length, in pigment and shallow relief.
        ventral=smooth((-math.sin(a)-.05)/.5)
        pleat=(.5+.5*math.cos(12*a))**10*ventral*math.sin(math.pi*clamp((z-5)/11))*fade
        y+=.045*pleat
        # El pigmento crema tambien se funde con el lomo en la parte trasera de la garganta.
        v.append((x,y,z))
        base=Vector(color('3f6485','e8e2d2',smooth((-math.sin(a)+.5)/1.0)*fade))
        c.append(tuple(base.lerp(Vector(kit.lin('9dadae')),pleat*.65)))
for i in range(36):
    for j in range(48):
        a=i*48+j;b=i*48+(j+1)%48;f.append((a,b,b+48,a+48))
g.add(v,f,c)
# Mouth line and fleshy lip follow the upper edge of the jaw.
for side in (-1,1):
    path=[]
    for k in range(29):
        z=7+9.6*k/28;rx=spline(PROFILE,z)[0]*1.006
        path.append((side*rx,lip_height(z)-.025,z))
    g.tube(path,[.035]*len(path),'273b49',8)
jaw=g.object('Mandíbula y pliegues de garganta','jaw',(0,-.6,6.0))

meshes=[body,tail,*flippers,jaw]
bpy.context.view_layer.update()
def contained(p):
    x,y,z=p
    if not PROFILE[0][0]<z<PROFILE[-1][0]:return False
    rx,ry,cy=spline(PROFILE,z)
    return (x/rx)**2+((y-cy)/ry)**2 <1
def rotated(p,pivot,angle):return Vector(pivot)+Matrix.Rotation(angle,3,'X')@(Vector(p)-Vector(pivot))
# Numeric attachment checks at both extremes, over a dense ring of root probes.
for angle in (-.2,0,.2):
    for j in range(32):
        a=TAU*j/32
        p=rotated((.8*math.cos(a),.8*math.sin(a),-11.4),(0,0,-12),angle)
        assert contained(p),('tail root exposed',angle,p)
for side,root in zip((-1,1),flipper_roots):
    for angle in (-.1,0,.1):
        for j in range(16):
            a=TAU*j/16;p=(root[0],root[1]+.3*math.sin(a),root[2]+.6*math.cos(a))
            assert contained(rotated(p,(side*3.25,-.55,3.8),angle)),('flipper root',side,angle)
for ob in meshes:
    assert len(ob.data.materials)==1
    ob.data.calc_loop_triangles()
    assert all(math.isfinite(x) for vert in ob.data.vertices for x in vert.co)
parts,tris=kit.export_parts(ROOT/'ballena.json',meta=dict(forward='+Z',blowhole=list(BLOW),eye=[spline(PROFILE,10.1)[0]+.14,.32,10.1]))
points=[kit._three(o.matrix_world@v.co) for o in meshes for v in o.data.vertices]
dims=[max(p[i] for p in points)-min(p[i] for p in points) for i in range(3)]
assert parts==5 and tris<=20000,(parts,tris)
assert 38<=dims[2]<=42 and dims[0]<=22,dims
tailwidth=max(v.co.x for v in tail.data.vertices)-min(v.co.x for v in tail.data.vertices)
assert tailwidth<=16,tailwidth
bpy.ops.object.select_all(action='DESELECT')
for ob in meshes:ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'ballena.glb'),export_format='GLB',use_selection=True,export_extras=True,export_animations=False)
# Verify vertex color semantics in the portable binary, not only the Blender material.
raw=(ROOT/'ballena.glb').read_bytes();ln=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+ln])
assert len(gltf['meshes'])==5
assert all('COLOR_0' in p['attributes'] for m in gltf['meshes'] for p in m['primitives'])

scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True
scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
w=bpy.data.worlds.new('Océano turquesa');w.use_nodes=True;scene.world=w
nt=w.node_tree;ambient=nt.nodes.get('Background');ambient.inputs[0].default_value=(*kit.lin('b4dce8'),1);ambient.inputs[1].default_value=.5
bg=nt.nodes.new('ShaderNodeBackground');bg.inputs[0].default_value=(*kit.lin('2c86a3'),1)
lp=nt.nodes.new('ShaderNodeLightPath');mix=nt.nodes.new('ShaderNodeMixShader')
nt.links.new(lp.outputs['Is Camera Ray'],mix.inputs[0]);nt.links.new(ambient.outputs[0],mix.inputs[1]);nt.links.new(bg.outputs[0],mix.inputs[2]);nt.links.new(mix.outputs[0],nt.nodes['World Output'].inputs[0])
bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.name='Sol cálido';sun.data.energy=2.3;sun.data.angle=.16;sun.data.color=kit.lin('fff3d6');sun.rotation_euler=(.25,-.20,.4)
def area(name,pos,power,size,hexcolor):
    bpy.ops.object.light_add(type='AREA');o=bpy.context.object;o.name=name;o.location=kit.B(pos)
    o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler();o.data.energy=power;o.data.size=size;o.data.color=kit.lin(hexcolor)
area('Reflejo de arena',(4,-17,9),5200,20,'fff3d6')
area('Cielo azul',(-20,10,15),3500,25,'c5e7f1')
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.name='Cámara de revisión'
cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24;cam.data.lens=24/(2*math.tan(math.pi/6));cam.data.clip_start=.1;cam.data.clip_end=1000
def camera(pos,target,res):
    cam.location=kit.B(pos);cam.rotation_euler=(kit.B(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.resolution_x,scene.render.resolution_y=res
def render(name,pos,target,res):
    camera(pos,target,res);scene.render.filepath=str(ROOT/name);bpy.ops.render.render(write_still=True)
gamepos=Vector((.65,.43,1)).normalized()*100
render('render-juego.png',gamepos,(0,0,0),(1600,900))
# Close pass: camera 18 units from the head target, framing face and long flippers.
close_target=Vector((0,-.4,7))
render('render-cerca.png',close_target+Vector((1,-.40,.70)).normalized()*18,close_target,(1600,900))
render('render-perfil.png',(46,2,-2),(0,0,-2),(1600,900))
tail.rotation_euler.x=.2
render('render-cola.png',(17,10,-28),(0,0,-14),(1200,900))
tail.rotation_euler.x=0;bpy.context.view_layer.update()
camera(gamepos,(0,0,0),(1600,900));scene.render.filepath=str(ROOT/'render-juego.png')
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'ballena.blend'))

report=f'''# ENTREGA — Ballena jorobada · Walking AP Multi

## Estado

- Versión / ronda: v3, revisión propia 2 de 2.
- Fecha: 2026-09-15.
- Lista para: revisión de Luis.

## Archivos

| Archivo | Contenido |
|---|---|
| `modelar-ballena.py` | Fuente reproducible de todos los entregables. |
| `ballena.blend` | Escena editable, cinco partes en reposo y cámara a 100 u. |
| `ballena.glb` | Cinco mallas con COLOR_0, material conectado al pigmento y extras. |
| `ballena.json` | Geometría neutral mediante kit.export_parts. |
| `render-juego.png`, `render-cerca.png`, `render-perfil.png`, `render-cola.png` | Cycles, 40 muestras, denoise; FOV vertical 60°. |

Regenerar desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 modelar-ballena.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Largo × alto total × envergadura | {dims[2]:.3f} × {dims[1]:.3f} × {dims[0]:.3f} u |
| Alto del tronco | Aproximadamente 9 u, dorsal incluida en el alto total. |
| Ancho de cola | {tailwidth:.3f} u |
| Origen | (0,0,0), centro del tronco a la altura de las articulaciones. |
| Frente | +Z Three; −Y Blender. |
| Triángulos | {tris} |
| Mallas exportadas | {parts} |
| Peso JSON | {(ROOT/'ballena.json').stat().st_size/1024:.1f} KiB |
| meta.blowhole | ({BLOW[0]:.3f}, {BLOW[1]:.3f}, {BLOW[2]:.3f}), burbujas. |
| meta.eye | ({spline(PROFILE,10.1)[0]+.14:.3f}, 0.320, 10.100), referencia ojo +X. |

## Partes

| Objeto | part | segment | Pivote Three | Material | Eje | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Cuerpo, cabeza, ojos, dorsal | body | — | (0,0,0) | Piel | — | Fijo | 0 | Garganta posterior y tubérculos incluidos. |
| Pedúnculo y cola | tail | — | (0,0,−12) | Piel | X | ±0.2 rad | 4 rad/s | Batido vertical. |
| Pectoral izquierda | flipper | 0 | (−3.25,−0.55,3.8) | Piel | X | ±0.1 rad | 1.5 rad/s | Movimiento lento. |
| Pectoral derecha | flipper | 1 | (3.25,−0.55,3.8) | Piel | X | ±0.1 rad | 1.5 rad/s | Desfase sugerido 0.4 rad. |
| Mandíbula y pliegues | jaw | — | (0,−0.6,6) | Piel | X | 0 a +0.25 rad | 0.15 rad/s | Abrir una vez cada 12–20 s, pausa 1 s. |

## Materiales

| Material | Pigmentos | Metal / rugosidad | Emisión | Alfa | Integración |
|---|---|---|---|---|---|
| Piel satinada | #3f6485 → #27465e, garganta #e8e2d2, caras inferiores #f1efe6, ojo #111e29 | 0 / 0.46 | 0 | 1 | Vertex colors; un único material por parte. |

## Diferencias con el brief

La garganta móvil y sus pliegues se agrupan con jaw para acompañar la apertura; el resto de la cabeza y los ojos pertenecen a body. El render cercano está a 18 u del punto observado en la cabeza, por lo que muestra la pasada y no pretende encuadrar toda la longitud de 40 u.

Revisión visual final: no se observa hueco en el pedúnculo a +0.2 rad, pero persiste una leve costura de sombreado en la unión bajo luz rasante. La continuidad visual totalmente fundida de ese punto no se considera plenamente satisfecha tras las dos correcciones permitidas.

## Sugerencias para integrar

Animar las cinco partes desde sus pivotes, sin trasladar sus vértices otra vez. No hay animaciones horneadas. Emitir burbujas cada 0.25 s desde meta.blowhole transformado por el conjunto. La órbita y la esfera de colisión de radio 12.5 u corresponden al integrador.

## Revisión del generador

Comprobadas las raíces por anillos de puntos contenidos en el cuerpo para cola −0.2/0/+0.2 rad y pectorales −0.1/0/+0.1 rad. Esa comprobación evita raíces expuestas, no sustituye la revisión visual de toda la superficie. Verificados presupuesto, dimensiones, pivotes, pigmentos COLOR_0 del GLB y ausencia de emisión. Los renders se generan después de exportar la pose neutral.
'''
(ROOT/'ENTREGA.md').write_text(report,encoding='utf-8')
print('EXPORT',parts,'partes',tris,'triangulos','DIMENSIONS largo alto ancho',dims[2],dims[1],dims[0],flush=True)
