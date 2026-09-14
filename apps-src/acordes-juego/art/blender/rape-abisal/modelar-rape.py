"""Rape Abisal / Batisfera. Run through bpy-run.ps1; all output stays beside this script."""
import bpy, bmesh, math, random, sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parents[3]/'grados-mayores-juego'/'art'/'blender'))
import kit
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection,73)
rng=random.Random(73)
def material(name,emission=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(1,1,1,1)
    p.inputs['Roughness'].default_value=.76;p.inputs['Metallic'].default_value=0
    p.inputs['Emission Color'].default_value=(*kit.lin('f7f3e8'),1);p.inputs['Emission Strength'].default_value=emission
    vc=m.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Pigment';m.node_tree.links.new(vc.outputs['Color'],p.inputs['Base Color'])
    if not emission:
        a=m.node_tree.nodes.new('ShaderNodeAttribute');a.attribute_name='Satin';m.node_tree.links.new(a.outputs['Fac'],p.inputs['Roughness'])
    return m
skin=material('Piel mate / dientes satinados por atributo')
luminous=material('Esca blanco calido / emision 2.7',2.7)
class Geo:
    def __init__(self):self.v=[];self.f=[];self.c=[];self.r=[]
    def add(self,v,f,color,rough=.76):
        off=len(self.v);self.v.extend(v);self.f.extend(tuple(off+i for i in face) for face in f)
        self.c.extend([kit.lin(color)]*len(v) if isinstance(color,str) else color);self.r.extend([rough]*len(v))
    def sphere(self,p,s,col,n=16,rings=8,rough=.76):
        v=[];f=[]
        for i in range(rings+1):
            a=math.pi*i/rings
            for j in range(n):
                b=math.tau*j/n;v.append((p[0]+s[0]*math.sin(a)*math.cos(b),p[1]+s[1]*math.sin(a)*math.sin(b),p[2]+s[2]*math.cos(a)))
        for i in range(rings):
            for j in range(n):a=i*n+j;b=i*n+(j+1)%n;f.append((a,b,b+n,a+n))
        self.add(v,f,col,rough)
    def tube(self,path,radii,col,n=8,rough=.76):
        v=[];f=[]
        for i,p in enumerate(path):
            tangent=(Vector(path[min(i+1,len(path)-1)])-Vector(path[max(0,i-1)])).normalized()
            u=tangent.cross(Vector((0,1,0)))
            if u.length<.01:u=tangent.cross(Vector((1,0,0)))
            u.normalize();w=tangent.cross(u).normalized()
            for j in range(n):v.append(tuple(Vector(p)+radii[i]*(u*math.cos(j*math.tau/n)+w*math.sin(j*math.tau/n))))
        for i in range(len(path)-1):
            for j in range(n):a=i*n+j;b=i*n+(j+1)%n;f.append((a,b,b+n,a+n))
        f.extend([tuple(reversed(range(n))),tuple((len(path)-1)*n+j for j in range(n))]);self.add(v,f,col,rough)
    def object(self,name,part,pivot=(0,0,0),mat=skin):
        ob=kit.make(name,[tuple(Vector(p)-Vector(pivot)) for p in self.v],self.f,mat,part=part,tint=0,smooth_angle=math.pi);ob.location=kit.B(pivot)
        c=ob.data.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='POINT')
        r=ob.data.attributes.new(name='Satin',type='FLOAT',domain='POINT')
        c=ob.data.color_attributes['Pigment'];r=ob.data.attributes['Satin']
        for i,col in enumerate(self.c):c.data[i].color=(*col,1);r.data[i].value=self.r[i]
        bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6)
        bad=[f for f in bm.faces if f.calc_area()<1e-12]
        if bad:bmesh.ops.delete(bm,geom=bad,context='FACES')
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free();ob.data.update()
        return ob
# Broad, flattened head with a distinct shoulder and taper; folds live in the skin.
def skin_color(x,y,z):
    belly=max(0,min(1,(-y+.04)/.65))
    col=Vector(kit.lin('3d3029')).lerp(Vector(kit.lin('8a7560')),belly*.85)
    mottles=math.sin(11*x+2*math.sin(5*z))*math.sin(12*z+2*math.sin(7*y))
    col*=.65+.65*(mottles+1)/2
    if mottles<-.15:col*=.45
    mouth=math.exp(-((z+.91)/.20)**2)
    return tuple(col*(1-.42*mouth))
profiles=[(-.91,.66,.51,-.03),(-.78,.79,.61,-.02),(-.61,.85,.71,-.02),(-.40,.85,.75,0),(-.18,.79,.71,-.015),(.02,.71,.62,-.02),(.22,.60,.51,-.03),(.43,.49,.40,-.04),(.65,.37,.30,-.04),(.85,.26,.23,-.04),(.99,.18,.17,-.04),(1.1,.09,.13,-.04)]
def surface(z,a):
    for lo,hi in zip(profiles,profiles[1:]):
        if lo[0]<=z<=hi[0]:
            t=(z-lo[0])/(hi[0]-lo[0]);rx=lo[1]*(1-t)+hi[1]*t;ry=lo[2]*(1-t)+hi[2]*t;yc=lo[3]*(1-t)+hi[3]*t;break
    sn=math.sin(a)
    flatten=min(1,max(0,(z+.91)/.25))
    top=sn if sn<0 else sn*(1-flatten)+(1-(1-sn)**2)*.84*flatten
    fold=.018*math.sin(34*z+5*a)*math.sin(a*3)**2*math.sin(math.pi*(z+.91)/2.01)
    return ((rx+fold)*math.cos(a),yc+ry*top+fold*.55,z)
g=Geo();N=48;v=[];f=[];c=[]
for z,rx,ry,yc in profiles:
    for j in range(N):
        pt=surface(z,j*math.tau/N);v.append(pt);c.append(skin_color(*pt))
for i in range(len(profiles)-1):
    for j in range(N):a=i*N+j;b=i*N+(j+1)%N;f.append((a,b,b+N,a+N))
f.append(tuple((len(profiles)-1)*N+j for j in range(N)));g.add(v,f,c)
# Interior closes behind the opening; concave rings, no front-facing plug.
v=[];f=[]
for z,rx,ry in [(-.915,.658,.508),(-.66,.57,.43),(-.37,.36,.29),(-.22,.02,.02)]:
    for j in range(N):a=j*math.tau/N;v.append((rx*math.cos(a),-.03+ry*math.sin(a),z))
for i in range(3):
    for j in range(N):a=i*N+j;b=i*N+(j+1)%N;f.append((a,a+N,b+N,b))
f.append(tuple(3*N+j for j in range(N)));g.add(v,f,'211518')
# Lip is an asymmetric fleshy strip merging back into the cheek, not a round tube.
def lip(g,lower=False):
    v=[];f=[];colors=[];steps=36
    for i in range(steps+1):
        a=(math.pi if lower else 0)+math.pi*i/steps
        sn=math.sin(a);cs=math.cos(a)
        width=(.105 if lower else .052)*(1+.23*math.sin(7*a)+.12*math.cos(13*a))
        for j in range(5):
            t=j/4;bulge=math.sin(math.pi*t)
            x=(.645+width*t)*cs;y=-.03+(.50+width*t)*sn
            z=-.924-(.07*abs(sn) if lower else 0)-bulge*width*.75+.16*t*t
            pt=(x,y,z);v.append(pt)
            colors.append(tuple(Vector(skin_color(*pt)).lerp(Vector(kit.lin('705444' if lower else '554034')),bulge*.50)))
    for i in range(steps):
        for j in range(4):a=i*5+j;f.append((a,a+1,a+6,a+5))
    g.add(v,f,colors)
lip(g)
for side in (-1,1):
    g.sphere((side*.59,.40,-.69),(.19,.15,.16),'3f322b',12,6)
    g.sphere((side*.642,.426,-.80),(.078,.083,.047),'11191b',16,8,.24)
    g.sphere((side*.655,.455,-.837),(.017,.013,.005),'829197',8,4,.22)
    brow=kit.catmull([(side*.43,.48,-.81),(side*.58,.58,-.71),(side*.74,.47,-.56)],5)
    # Eye socket blends directly into the head; no expressive eyebrow.
    line=[surface(-.47+i*1.23/12,.14 if side==1 else math.pi-.14) for i in range(13)]
    g.tube(line,[.016]*len(line),'6a5746',6)
# Nine upper teeth, curved toward the throat; ivory is vertex pigment.
for i in range(9):
    a=.19+(math.pi-.38)*i/8;base=Vector((.60*math.cos(a),-.03+.47*math.sin(a),-.943))
    length=.20+.10*math.sin(a)
    pts=[base,base+Vector((-.02*math.cos(a),-length*.50,-.01)),base+Vector((-.035*math.cos(a),-length,.07))]
    p=kit.catmull(pts,3);g.tube(p,[.020*(1-k/(len(p)-1))+.0015 for k in range(len(p))],'d9cfad',6,.34)
# Low dorsal crest and sparse blunt dermal papillae.
crest=[(0,surface(z,math.pi/2)[1]+height,z) for z,height in [(.03,.035),(.27,.14),(.52,.12),(.7,.10),(.96,.015)]]
g.tube(crest,[.025,.025,.022,.018,.008],'49392f',7)
v=[];f=[]
for x,y,z in crest:
    for lo,hi in zip(profiles,profiles[1:]):
        if lo[0]<=z<=hi[0]:
            t=(z-lo[0])/(hi[0]-lo[0]);base=surface(z,math.pi/2)[1]-.025;break
    v.extend([(-.018,base,z),(.018,base,z),(0,y,z)])
for i in range(len(crest)-1):
    for j in range(3):
        a=i*3+j;b=i*3+(j+1)%3;f.append((a,b,b+3,a+3))
f.extend([(2,1,0),(12,13,14)]);g.add(v,f,'49392f')
for i in range(22):
    z=rng.uniform(-.68,.68);a=rng.uniform(0,math.tau)
    pt=surface(z,a);size=rng.uniform(.018,.039)
    g.sphere(pt,(size,size*.8,size*1.3),'65513f',7,3)
body=g.object('Cuerpo ojos dientes superiores','body')
# Lower jaw: overlapping crescent rests around the lower oral rim.
g=Geo();lip(g,True)
# A small chin under the rim, blended by intersection; interior tongue behind it.
g.sphere((0,-.50,-.79),(.53,.16,.23),'594335',20,6)
g.sphere((0,-.424,-.70),(.43,.055,.22),'3d2022',16,5)
for i in range(8):
    a=math.pi+.23+(math.pi-.46)*i/7;base=Vector((.595*math.cos(a),-.03+.475*math.sin(a),-.992))
    length=.22+.095*(-math.sin(a));p=kit.catmull([base,base+Vector((-.01*math.cos(a),length*.55,-.015)),base+Vector((-.02*math.cos(a),length,.085))],3)
    g.tube(p,[.020*(1-k/(len(p)-1))+.0015 for k in range(len(p))],'e3d7b6',6,.34)
for i in range(7):
    x=-.43+i*.143;y=-.57+.12*(abs(x)/.43)**2
    p=kit.catmull([(x,y,-.96),(x*1.05,y-.085,-.98),(x*1.08,y-.10,-.92)],3)
    g.tube(p,[.017*(1-k/(len(p)-1))+.002 for k in range(len(p))],'726052',6)
jaw=g.object('Mandibula inferior dientes y papilas','jaw',(0,-.035,-.72))
# Arch of the illicium. Endpoint is precisely the esca origin, in Three coordinates.
ROD_BASE=(0,.64,-.35);LURE=(0,1.055,-1.10)
p=kit.catmull([ROD_BASE,(0,1.04,-.39),(0,1.27,-.67),(0,1.24,-.97),LURE],7)
g=Geo();g.tube(p,[.041*(1-i/(len(p)-1))+.014 for i in range(len(p))],'695843',10)
# Gradient along rod vertices, lightening toward the esca.
for i in range(len(g.c)):
    t=(i//10)/(len(p)-1);g.c[i]=tuple(Vector(kit.lin('493b2f')).lerp(Vector(kit.lin('b8ac86')),t*t))
rod=g.object('Cana illicium','rod',ROD_BASE);rod['tip_three']=list(LURE)
g=Geo();g.sphere(LURE,(.105,.14,.10),'f7f3e8',20,10, .4)
# A three-lobed hanging bulb, all geometry kept close to its animation pivot.
for side in (-1,1):g.sphere((side*.065,1.012,-1.10),(.046,.067,.044),'f7f3e8',10,6,.4)
lure=g.object('Senuelo esca','lure',LURE,luminous)
# Closed thin fin patches with explicit raised rays, one mesh per appendage.
def fin_patch(g,rows,col,normal=(0,1,0)):
    v=[];f=[]
    for row in rows:v.extend(row)
    n=len(rows[0])
    for i in range(len(rows)-1):
        for j in range(n-1):a=i*n+j;f.append((a,a+1,a+1+n,a+n))
    count=len(v);vv=[tuple(Vector(p)+Vector(normal)*.004) for p in v]+[tuple(Vector(p)-Vector(normal)*.004) for p in v]
    ff=list(f)+[tuple(count+i for i in reversed(face)) for face in f]
    edges={}
    for face in f:
        for a,b in zip(face,face[1:]+face[:1]):
            key=tuple(sorted((a,b)));edges[key]=edges.get(key,0)+1
    for (a,b),uses in edges.items():
        if uses==1:ff.append((a,b,b+count,a+count))
    g.add(vv,ff,col)
# Smooth closed membranes; corrugation makes raised rays continuous with the web.
for side in (-1,1):
    g=Geo();base=Vector((side*.72,-.24,.05));rows=[]
    for i in range(25):
        t=i/24;row=[]
        for j in range(9):
            s=j/8;edge=1+.065*math.cos(8*math.pi*t)
            row.append((side*(.72+.41*s*math.sin(math.pi*t)**.55*edge),-.24-.23*s+.05*math.sin(math.pi*s)+.018*s*math.cos(8*math.pi*t),.05+.68*t*s*edge))
        rows.append(row)
    fin_patch(g,rows,'58483c')
    for k,pt in enumerate(g.v):
        i=(k%(25*9))//9;j=k%9
        ray=max(0,math.cos(8*math.pi*i/24))**4
        g.c[k]=tuple(Vector(kit.lin('44382f')).lerp(Vector(kit.lin('998066')),ray*.70+j/8*.13))
    ob=g.object('Pectoral '+str(side),'fin',base)
g=Geo();g.sphere((0,-.04,1.04),(.18,.20,.24),'3f342c',12,6)
rows=[]
for i in range(31):
    t=i/30;row=[]
    for j in range(9):
        s=j/8;wave=math.cos(10*math.pi*t)
        row.append((.055*math.sin(t*math.pi)*math.sin(s*math.pi)+.016*s*wave,-.04+(t-.5)*(.22+.64*s),1.13+.53*s-.045*s*math.cos(t*math.tau)+.018*s**3*wave))
    rows.append(row)
off=len(g.v);fin_patch(g,rows,'57483a',(1,0,0))
for k in range(off,len(g.v)):
    i=((k-off)%(31*9))//9;j=(k-off)%9;ray=max(0,math.cos(10*math.pi*i/30))**4
    g.c[k]=tuple(Vector(kit.lin('43382e')).lerp(Vector(kit.lin('998066')),ray*.70+j/8*.13))
tail=g.object('Cola caudal corta','tail',(0,-.04,.94))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];bpy.context.view_layer.update()
parts,tris=kit.export_parts(ROOT/'rape-abisal.json',meta=dict(forward='-Z',rodTip=list(LURE)))
assert parts==7 and tris<=10000,(parts,tris)
points=[kit._three(o.matrix_world@v.co) for o in meshes for v in o.data.vertices]
dims=[max(p[i] for p in points)-min(p[i] for p in points) for i in range(3)]
assert dims[2]<=3.0,dims
assert (kit.B(p[-1])-kit.B(LURE)).length<1e-6
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'rape-abisal.glb'),export_format='GLB',use_selection=True,export_extras=True,export_animations=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
world=bpy.data.worlds.new('Abisal');world.use_nodes=True;scene.world=world;nt=world.node_tree
ambient=nt.nodes['Background'];ambient.inputs[0].default_value=(*kit.lin('050d18'),1);ambient.inputs[1].default_value=.08
bg=nt.nodes.new('ShaderNodeBackground');lp=nt.nodes.new('ShaderNodeLightPath');mix=nt.nodes.new('ShaderNodeMixShader');nt.links.new(lp.outputs['Is Camera Ray'],mix.inputs[0]);nt.links.new(ambient.outputs[0],mix.inputs[1]);nt.links.new(bg.outputs[0],mix.inputs[2]);nt.links.new(mix.outputs[0],nt.nodes['World Output'].inputs[0])
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam
bpy.ops.object.light_add(type='SPOT');lamp=bpy.context.object;lamp.data.color=kit.lin('d6ecff');lamp.data.spot_size=math.radians(65);lamp.data.spot_blend=.6;lamp.data.shadow_soft_size=.55
scene.use_nodes=True;nt=scene.node_tree;nt.nodes.clear();rl=nt.nodes.new('CompositorNodeRLayers');gl=nt.nodes.new('CompositorNodeGlare');gl.glare_type='FOG_GLOW';gl.quality='HIGH';gl.threshold=1.2;gl.size=6;co=nt.nodes.new('CompositorNodeComposite');nt.links.new(rl.outputs['Image'],gl.inputs[0]);nt.links.new(gl.outputs[0],co.inputs[0])
def camera(pos,target,res,color):
    cam.location=kit.B(pos);cam.rotation_euler=(kit.B(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='PERSP';cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24;cam.data.lens=24/(2*math.tan(math.radians(30)));cam.data.clip_start=.1
    scene.render.resolution_x,scene.render.resolution_y=res;bg.inputs[0].default_value=(*kit.lin(color),1)
    lamp.location=cam.location;lamp.rotation_euler=cam.rotation_euler;lamp.data.energy=(cam.location-kit.B(target)).length**2*42
GAME_TARGET=Vector((0,.22,.1));GAME_POS=GAME_TARGET+Vector((.62,.25,-.74)).normalized()*25
for name,pos,target,res,color in [('render-juego.png',GAME_POS,GAME_TARGET,(1600,900),'050d18'),('render-cerca.png',GAME_TARGET+Vector((.62,.25,-.74)).normalized()*10,GAME_TARGET,(1600,900),'050d18'),('render-perfil.png',(4.1,.10,.15),(0,.18,.20),(1200,900),'0b2438'),('render-detalle.png',(1.95,.95,-3.1),(0,.27,-.52),(1200,900),'050d18')]:
    camera(pos,target,res,color);scene.render.filepath=str(ROOT/name);bpy.ops.render.render(write_still=True)
camera(GAME_POS,GAME_TARGET,(1600,900),'050d18');scene.render.filepath=str(ROOT/'render-juego.png');bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'rape-abisal.blend'))
animations={
'body':('Z','±0.045 rad','0.16 ciclos/s','Balanceo desde padre común'),
'jaw':('X','−0.25 a 0 rad','0.22 ciclos/s','Bisagra; apertura hacia abajo'),
'rod':('Z / X','±0.18 / ±0.045 rad','0.28 / 0.21 ciclos/s','Lure sigue rodTip transformado'),
'lure':('Escala XYZ / emisión','±5% / 0–2.7','0.8 ciclos/s / pulso de 0.18 s por nota','Escala desde centro; pulsos según acorde'),
'fin':('Z','±0.16 rad','0.55 ciclos/s','Signos opuestos izquierda/derecha'),
 'tail':('Y','±0.20 rad','0.42 ciclos/s','Ondulación lateral')}
rows=[]
for o in meshes:
    axis,amp,speed,note=animations[o['part']]
    rows.append(f"| {o.name} | {o['part']} | — | {', '.join(f'{x:.3f}' for x in kit._three(o.location))} | {o.data.materials[0].name} | {axis} | {amp} | {speed} | {note} |")
report=f'''# ENTREGA — Rape Abisal · Batisfera

## Estado
- Versión / ronda: v3, ronda de corrección 1 solicitada por Luis (archivo previo rotulado v2)
- Fecha: 2026-09-13
- Lista para: revisión de Luis

## Archivos
| Archivo | Contenido |
|---|---|
| `modelar-rape.py` | Fuente reproducible, regenera todos los entregables |
| `rape-abisal.blend` | Escena editable, cámara de juego, foco y materiales |
| `rape-abisal.glb` | Modelo portable con pigmento por vértice y propiedades part |
| `rape-abisal.json` | Geometría generada con kit.export_parts |
| `render-juego.png`, `render-perfil.png`, `render-detalle.png`, `render-cerca.png` | Cycles, 40 muestras, denoise |

Regenerar desde esta carpeta:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 modelar-rape.py
```

## Datos técnicos
| Dato | Valor |
|---|---|
| Tamaño total largo × alto × ancho | {dims[2]:.3f} × {dims[1]:.3f} × {dims[0]:.3f} u |
| Cuerpo sin caña, cola ni pectorales | ≈2.1 × 1.38 × 1.7 u (corona aplanada) |
| Origen | Centro del cuerpo (0,0,0) |
| Frente | −Z Three; +Y Blender |
| Triángulos totales | {tris} |
| Mallas exportadas | {parts} |
| Peso JSON | {(ROOT/'rape-abisal.json').stat().st_size/1024:.1f} KiB |
| Punta rod (Three) | (0.000, 1.055, -1.100) |
| Centro / pivote lure (Three) | (0.000, 1.055, -1.100), coincidente con punta rod |

## Partes
| Objeto | part | segment | Pivote Three | Material | Eje Three | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
'''+ '\n'.join(rows)+'''

## Materiales
| Material | Color hex | Metal / rugosidad | Emisión | Alfa | Integración |
|---|---|---|---|---|---|
| Piel, cavidad, dientes | Blanco base × Pigment: piel #342b27–#625044; cavidad #211518; dientes #d9cfad / #e3d7b6 | 0 / 0.76; atributo Satin baja dientes a 0.34 y ojos a 0.24 en Blender | 0 | 1 | Activar vertexColors; no texturas externas |
| Esca | Blanco base × Pigment #f7f3e8 | 0 / 0.76 | #f7f3e8, 2.7 | 1 | Teñir base y emisión con la familia; halo externo |

## Cambios de esta corrección
Cabeza ancha con corona aplanada, hombro marcado y cuerpo afinado. Pliegues en la superficie y 22 papilas dispersas. Labios de sección variable integrados hacia la piel, inferior más grueso. Pectorales de 25 × 9 muestras y caudal de 31 × 9, cerradas, curvas, con borde ondulado y radios elevados pigmentados. Manchas pardas, vientre más claro y contorno oral oscuro. Se conserva origen, ejes, siete partes, pivotes, dientes y rodTip. Render cercano nuevo a 10 u del objetivo, 3/4 frontal, FOV vertical 60°, 1600 × 900.

## Diferencias con el brief
Corona aplanada: altura de piel ≈1.38 u, dentro del tamaño aproximado; cabeza conserva 1.7 u de ancho. El JSON compartido exporta una rugosidad uniforme por parte (0.76); el acabado satinado de dientes/ojos se define por atributo en Blender, que kit.export_parts no transporta. El pigmento sí se conserva en JSON y GLB. No hay transparencias ni otras partes emisivas.

## Revisión propia
Se revisaron los cuatro renders: silueta y señuelo legibles a distancia; boca y dientes visibles; labios curvos de grosor variable; aletas cerradas con radios y borde ondulado; pliegues y pigmento de piel. Cresta y línea lateral adaptadas a la nueva superficie. Exportación comprueba siete mallas, presupuesto y largo máximo. Ejes y pivotes conservados, rodTip coincide con lure.

## Sugerencias para integrar
Mandíbula: bisagra sobre X en (0,-0.035,-0.72), abrir hacia abajo hasta 0.25 rad de magnitud (rotación X negativa en Three). Rod: vaivén ±0.18 rad desde su base, mantener lure unido a la punta transformada, sin aplicarle dos veces la traslación. Lure parpadea por nota y usa su centro como origen. Tail oscila sobre Y. Pectorales aletean con lados opuestos. Mantener balanceo general desde un padre común. La boca tiene cavidad real, 9 dientes superiores y 8 inferiores. Sin animación horneada ni integración.
'''
(ROOT/'ENTREGA.md').write_text(report,encoding='utf-8')
print('EXPORT',parts,'partes',tris,'triangulos','DIMENSIONS',dims,flush=True)





