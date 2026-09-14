"""Calamar Vela: reproducible bpy asset, authored in Three coordinates, exported via kit."""
import bpy, bmesh, math, sys, random
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / 'grados-mayores-juego' / 'art' / 'blender'))
import kit
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection, 41)
rng=random.Random(41)
def material(name, emission=0, color='ffffff'):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*kit.lin(color),1)
    p.inputs['Roughness'].default_value=.30
    p.inputs['Metallic'].default_value=0
    p.inputs['Emission Color'].default_value=(*kit.lin('f4f1ff'),1)
    p.inputs['Emission Strength'].default_value=emission
    if not emission==2:
        a=m.node_tree.nodes.new('ShaderNodeVertexColor');a.layer_name='Pigment'
        m.node_tree.links.new(a.outputs['Color'],p.inputs['Base Color'])
    return m
skin=material('Piel satinada · pigmento por vertice')
armmat=material('Brazos · emision neutra 0.20',.20)
glowmat=material('Fotoforos · blanco familia',2,'f4f1ff')
class Geo:
    def __init__(self):self.v=[];self.f=[];self.c=[]
    def add(self,vs,fs,color):
        off=len(self.v);self.v.extend(vs);self.f.extend(tuple(off+i for i in f) for f in fs)
        self.c.extend([kit.lin(color)]*len(vs) if isinstance(color,str) else color)
    def sphere(self,pos,scale,color,n=12,rings=6):
        vs=[];fs=[]
        for i in range(rings+1):
            t=math.pi*i/rings
            for j in range(n):
                a=math.tau*j/n
                vs.append(tuple(Vector(pos)+Vector((scale[0]*math.sin(t)*math.cos(a),scale[1]*math.sin(t)*math.sin(a),scale[2]*math.cos(t)))))
        for i in range(rings):
            for j in range(n):
                a=i*n+j;b=i*n+(j+1)%n;fs.append((a,b,b+n,a+n))
        self.add(vs,fs,color)
    def tube(self,path,radii,color,n=8):
        vs=[];fs=[]
        for i,p in enumerate(path):
            t=(Vector(path[min(i+1,len(path)-1)])-Vector(path[max(0,i-1)])).normalized()
            u=t.cross(Vector((0,1,0))).normalized();v=t.cross(u).normalized()
            for j in range(n):vs.append(tuple(Vector(p)+radii[i]*(math.cos(j*math.tau/n)*u+math.sin(j*math.tau/n)*v)))
        for i in range(len(path)-1):
            for j in range(n):
                a=i*n+j;b=i*n+(j+1)%n;fs.append((a,b,b+n,a+n))
        fs.extend([tuple(reversed(range(n))),tuple((len(path)-1)*n+j for j in range(n))]);self.add(vs,fs,color)
    def object(self,name,part,pivot=(0,0,0),mat=skin,segment=None):
        ob=kit.make(name,[tuple(Vector(v)-Vector(pivot)) for v in self.v],self.f,mat,part=part,tint=0,smooth_angle=math.pi)
        ob.location=kit.B(pivot)
        a=ob.data.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='POINT')
        for i,c in enumerate(self.c):a.data[i].color=(*c,1)
        if segment is not None:ob['segment']=segment
        return ob
# Neck z=0; pointed mantle negative Z; crown positive Z.
profile=[(0,.26),(-.15,.34),(-.4,.39),(-.7,.38),(-1,.335),(-1.3,.27),(-1.55,.18),(-1.76,.08),(-1.86,.002)]
def radius(z):
    for (a,r),(b,s) in zip(profile,profile[1:]):
        if b<=z<=a:return r+(s-r)*(z-a)/(b-a)
    return .01
g=Geo();vs=[];cols=[];fs=[];N=40
for i,(z,r) in enumerate(profile):
    for j in range(N):
        a=j*math.tau/N;vs.append((r*math.cos(a),r*.83*math.sin(a),z))
        c=Vector(kit.lin('9c3446' if math.sin(a)<0 else '782333'))
        c*=.87+.13*math.sin(j*2.8+i*4.4)**2;cols.append(tuple(c))
for i in range(len(profile)-1):
    for j in range(N):a=i*N+j;b=i*N+(j+1)%N;fs.append((a,b,b+N,a+N))
fs.extend([tuple(reversed(range(N))),tuple((len(profile)-1)*N+j for j in range(N))]);g.add(vs,fs,cols)
# Pigmented spots are geometry fused into mantle; no texture dependency.
for i in range(70):
    z=rng.uniform(-1.6,-.18);a=rng.uniform(0,math.tau);r=radius(z)
    p=Vector((r*math.cos(a),r*.83*math.sin(a),z));normal=Vector((math.cos(a),math.sin(a)/.83,0)).normalized()
    u=Vector((0,0,1));v=normal.cross(u);sz=rng.uniform(.009,.022)
    points=[tuple(p+normal*.001)]+[tuple(p+normal*.001+sz*(u*math.cos(k*math.tau/7)+v*math.sin(k*math.tau/7))) for k in range(7)]
    g.add(points,[(0,1+k,1+(k+1)%7) for k in range(7)],'501c2b')
g.object('Manto','mantle')
for side in (-1,1):
    g=Geo();vs=[];cs=[];fs=[];rows=25;steps=7
    for i in range(rows):
        t=i/(rows-1);z=-1.76+1.64*t;r=radius(z)
        width=.56*math.sin(math.pi*t)**.8
        for j in range(steps):
            s=j/(steps-1);x=side*(r*.86+width*s)
            y=.018+(.105*math.sin(t*math.tau*2.2+side*.25)+.055)*s*s
            vs.append((x,y,z));cs.append(tuple(Vector(kit.lin('8c2e43')).lerp(Vector(kit.lin('e99aab')),s**4*.78)))
    for i in range(rows-1):
        for j in range(steps-1):a=i*steps+j;fs.append((a,a+1,a+1+steps,a+steps))
    g.add(vs,fs,cs)
    ob=g.object('Vela '+('izquierda' if side<0 else 'derecha'),'fin',(side*.27,0,-.85))
    # Thin opaque double surface avoids sorting artifacts in the JSON.
    mod=ob.modifiers.new('Espesor membrana','SOLIDIFY');mod.thickness=.006
    bpy.context.view_layer.objects.active=ob;bpy.ops.object.modifier_apply(modifier=mod.name)
g=Geo();g.sphere((0,0,.25),(.33,.285,.36),'913044',20,10)
for side in (-1,1):
    g.sphere((side*.29,.01,.28),(.145,.188,.19),'602236',16,8)
    g.sphere((side*.377,.012,.29),(.061,.142,.146),'536776',24,8)
    g.sphere((side*.421,.013,.30),(.026,.113,.118),'071522',24,8)
# Ventral siphon with an open dark bore.
g.tube([(0,-.21,.12),(0,-.29,.31),(0,-.31,.47)],[.085,.075,.063],'b15b68',12)
g.sphere((0,-.313,.475),(.047,.044,.008),'291b2a',12,4)
g.object('Cabeza ojos y sifon','head')
for pair in range(4):
    g=Geo()
    for k in (pair*2,pair*2+1):
        a=math.tau*(k+.5)/8
        path=[];rr=[]
        for i in range(17):
            t=i/16;rad=.20+.33*math.sin(t*math.pi*.80)
            angle=a+.20*math.sin(t*math.pi)
            path.append((rad*math.cos(angle),rad*.82*math.sin(angle),.48+1.37*t-.08*t*t))
            rr.append(.080*(1-t)**1.05+.007)
        g.tube(path,rr,'a34355',8)
        for i in range(2,13,2):
            p=Vector(path[i]);inward=Vector((-p.x,-p.y,0)).normalized();p+=inward*(rr[i]*.91)
            q=Vector((0,0,1)).rotation_difference(inward).to_matrix().to_4x4()
            vv,ff=kit.g_torus(.027*(1-i/20),.007,6,3)
            g.add([tuple(p+q.to_3x3()@Vector(v)) for v in vv],ff,'e7a5aa')
    g.object('Par de brazos '+str(pair),'arm',(0,0,.48),armmat,pair)
for side in (-1,1):
    g=Geo();path=[]
    for i in range(25):
        t=i/24;path.append((side*(.16+.49*math.sin(t*math.pi*.65)), -.12-.12*math.sin(t*math.pi),.46+2.04*t))
    g.tube(path,[.038-.015*i/24 for i in range(25)],'9c3446',8)
    p=Vector(path[-1]);g.sphere(p,(.082,.055,.19),'bc6473',12,8)
    for i in range(5):g.sphere((p.x,p.y-.053,p.z-.115+i*.055),(.026,.009,.022),'efb6b8',8,4)
    g.object('Tentaculo '+str(side),'tentacle',path[0])
g=Geo()
for side in (-1,1):
    for i in range(10):
        z=-.17-i*.145;r=radius(z);a=-math.pi/2+side*.8
        g.sphere((r*math.cos(a)*1.017,r*.83*math.sin(a)*1.025,z),(.026,.022,.030),'f4f1ff',8,4)
    for i in range(4):g.sphere((side*(.23+i*.037),-.203,.25+i*.058),(.023,.018,.025),'f4f1ff',8,4)
g.object('Fotoforos ventrales y oculares','glow',mat=glowmat)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
# Weld coincident sphere poles and remove zero-area faces before both exports.
bpy.context.view_layer.update()
for o in meshes:
    bm=bmesh.new();bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=0.000001)
    bad=[f for f in bm.faces if f.calc_area()<1e-12]
    if bad:bmesh.ops.delete(bm,geom=bad,context='FACES')
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
parts,tris=kit.export_parts(ROOT/'calamar-vela.json',meta=dict(forward='-Z'))
assert parts==11 and tris<=12000,(parts,tris)
pts=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
dims=[max(v[i] for v in pts)-min(v[i] for v in pts) for i in range(3)]
assert dims[1]<=4.8 and dims[0]<=1.8,dims
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'calamar-vela.glb'),export_format='GLB',use_selection=True,export_extras=True,export_animations=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True
scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
world=bpy.data.worlds.new('Medianoche');world.use_nodes=True;scene.world=world
world.node_tree.nodes['Background'].inputs[0].default_value=(*kit.lin('0b2438'),1)
world.node_tree.nodes['Background'].inputs[1].default_value=.25
# Camera-ray background retains the requested color, independent of low ambient strength.
nt=world.node_tree;bg=nt.nodes.new('ShaderNodeBackground');bg.inputs[0].default_value=(*kit.lin('0b2438'),1)
lp=nt.nodes.new('ShaderNodeLightPath');mix=nt.nodes.new('ShaderNodeMixShader')
nt.links.new(lp.outputs['Is Camera Ray'],mix.inputs[0]);nt.links.new(nt.nodes['Background'].outputs[0],mix.inputs[1]);nt.links.new(bg.outputs[0],mix.inputs[2]);nt.links.new(mix.outputs[0],nt.nodes['World Output'].inputs[0])
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam
bpy.ops.object.light_add(type='SPOT');lamp=bpy.context.object;lamp.data.color=kit.lin('d6ecff');lamp.data.spot_size=math.radians(65);lamp.data.spot_blend=.6;lamp.data.shadow_soft_size=.8
scene.use_nodes=True;tree=scene.node_tree;tree.nodes.clear();rl=tree.nodes.new('CompositorNodeRLayers');gl=tree.nodes.new('CompositorNodeGlare');gl.glare_type='FOG_GLOW';gl.quality='HIGH';gl.threshold=1.3;gl.size=6;comp=tree.nodes.new('CompositorNodeComposite');tree.links.new(rl.outputs['Image'],gl.inputs['Image']);tree.links.new(gl.outputs['Image'],comp.inputs[0])
def camera(pos,target,res,bghex):
    cam.location=kit.B(pos);cam.rotation_euler=(kit.B(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='PERSP';cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24;cam.data.lens=24/(2*math.tan(math.radians(30)));cam.data.clip_start=.1
    scene.render.resolution_x,scene.render.resolution_y=res
    lamp.location=cam.location;lamp.rotation_euler=cam.rotation_euler;lamp.data.energy=(cam.location-kit.B(target)).length**2*48
    bg.inputs[0].default_value=(*kit.lin(bghex),1)
def render(name,pos,target,res,bghex):
    camera(pos,target,res,bghex);scene.render.filepath=str(ROOT/name);bpy.ops.render.render(write_still=True)
target=Vector((0,0,.35));direction=Vector((.78,.55,.53)).normalized()
render('render-juego.png',target+25*direction,target,(1600,900),'0b2438')
render('render-perfil.png',(5.3,.0,.35),(0,0,.35),(1200,900),'1b4f72')
render('render-detalle.png',(2.05,-1.05,1.85),(0,-.03,.40),(1200,900),'0b2438')
camera(target+25*direction,target,(1600,900),'0b2438')
scene.render.filepath=str(ROOT/'render-juego.png');bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'calamar-vela.blend'))
rows=[]
for o in meshes:
    pivot=kit._three(o.location);rows.append(f"| {o.name} | {o['part']} | {o.get('segment','—')} | {', '.join(f'{x:.3f}' for x in pivot)} | {o.data.materials[0].name} | {'Destello nota '+str(o['segment']) if 'segment' in o else 'Ver brief'} |")
report=f'''# ENTREGA — Calamar Vela · Batisfera

## Estado
- Versión / ronda: v2, ronda de corrección 1
- Fecha: 2026-09-13
- Lista para: revisión de Luis

## Archivos
| Archivo | Contenido |
|---|---|
| `modelar-calamar.py` | Fuente reproducible; regenera todos los entregables |
| `calamar-vela.blend` | Escena editable con cámara de juego y foco |
| `calamar-vela.glb` | 11 mallas, pigmentos por vértice y propiedades part/segment |
| `calamar-vela.json` | Geometría mediante kit.export_parts |
| `render-juego.png`, `render-perfil.png`, `render-detalle.png` | Cycles, 40 muestras y denoise |

Regenerar desde esta carpeta:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 modelar-calamar.py
```

## Datos técnicos
| Dato | Valor |
|---|---|
| Tamaño largo × alto × ancho | {dims[1]:.3f} × {dims[2]:.3f} × {dims[0]:.3f} u |
| Origen | Cuello, (0,0,0) |
| Frente | Punta −Z en Three; +Y en Blender |
| Triángulos | {tris} |
| Mallas exportadas | {parts} |
| Peso JSON | {(ROOT/'calamar-vela.json').stat().st_size/1024:.1f} KiB |

## Partes
| Objeto | part | segment | Pivote Three | Material | Animación |
|---|---|---|---|---|---|
'''+ '\n'.join(rows)+'''

## Materiales
| Material | Color hex | Metal / rugosidad | Emisión | Alfa | Integración |
|---|---|---|---|---|---|
| Piel satinada | Blanco base × Pigment: #782333–#9c3446; aletas #8c2e43–#e99aab; ojos #071522 / #536776 | 0 / 0.30 | 0 | 1 | Usar vertexColor para conservar todos los detalles |
| Brazos | Blanco base × Pigment #a34355; ventosas #e7a5aa | 0 / 0.30 | #f4f1ff, 0.20 | 1 | Emisión neutra independiente de pigmento |
| Fotóforos | #f4f1ff | 0 / 0.30 | #f4f1ff, 2.0 | 1 | Teñir base y emisión por familia |

## Diferencias con el brief
Aletas opacas de espesor 0.006 u, con borde aclarado por pigmento en vez de transparencia opcional: mantiene el contorno y evita problemas de orden de dibujo. Sin otras diferencias técnicas previstas.

## Sugerencias para integrar
Aplicar vertexColors; cada objeto contiene un único material. Aleteo alrededor del eje Z local de Three, ±0.10 rad con lados opuestos. Mantle y glow comparten pivote: aplicarles el mismo pulso ±9 %. Brazos segment 0–3 agrupan pares contiguos de una corona completa; tentáculos con fase retrasada. Sin animaciones horneadas. Los fotóforos bajo los ojos pertenecen a glow según el encargo. No se realizó integración.
'''
(ROOT/'ENTREGA.md').write_text(report,encoding='utf-8')
print('EXPORT',parts,'partes',tris,'triangulos','DIMENSIONS',dims,flush=True)



