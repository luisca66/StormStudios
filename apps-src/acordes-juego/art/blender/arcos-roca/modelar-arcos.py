"""Arcos estratificados de Batisfera. Generador bpy, coordenadas de autoría Three."""
import bpy, math, random, sys, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parents[3]/'grados-mayores-juego'/'art'/'blender'))
import kit
from kit import B, lin
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
ART=bpy.data.collections.new('Arcos exportables');scene.collection.children.link(ART)
STAGE=bpy.data.collections.new('Solo revisión');scene.collection.children.link(STAGE)
kit.setup(ART,17092026)
rng=random.Random(17092026)
MATS={}
for p in ['rock','growth','glow']:
    m=bpy.data.materials.new(p);m.use_nodes=True
    bs=m.node_tree.nodes['Principled BSDF'];bs.inputs['Base Color'].default_value=(1,1,1,1)
    bs.inputs['Roughness'].default_value=.95 if p=='rock' else .9
    vc=m.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Pigment'
    m.node_tree.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
    if p=='glow':
        bs.inputs['Emission Color'].default_value=(*lin('#b48cff'),1);bs.inputs['Emission Strength'].default_value=1.3
    MATS[p]=m
def mix(a,b,t):return tuple(x*(1-t)+y*t for x,y in zip(a,b))
def wallz(x):return math.sqrt(96**2-x*x)-96
def pigment(p):
    x,y,z=p
    band=.5+.5*math.sin(y*1.55+.12*math.sin(x*.34)+.035*z)
    c=mix(lin('#0d151d'),lin('#293946'),.22+.66*band)
    return c
DATA={};OBJS=[];META={}
def add(part,v,f,color=None):
    vs,fs,cs=DATA[part];off=len(vs);vs.extend(v);fs.extend(tuple(off+i for i in face) for face in f)
    cs.extend([lin(color) if color else pigment(p) for p in v])
def tube(pts,r,color,sides=6):
    v=[];f=[]
    for i,p in enumerate(pts):
        t=(Vector(pts[min(i+1,len(pts)-1)])-Vector(pts[max(0,i-1)])).normalized()
        u=t.cross(Vector((0,0,1))).normalized();w=t.cross(u)
        for j in range(sides):
            a=math.tau*j/sides;v.append(tuple(Vector(p)+(u*math.cos(a)+w*math.sin(a))*r*(1-.75*i/(len(pts)-1))))
    for i in range(len(pts)-1):
        for j in range(sides):f.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    f.extend([tuple(reversed(range(sides))),tuple((len(pts)-1)*sides+j for j in range(sides))]);add('growth',v,f,color)
def arch(t,u,d,variant):
    a=math.pi*t;s=math.sin(a);c=math.cos(a)
    half,h,top=(17,18.5,24) if variant=='A' else (13,25,30.5)
    foot=6.1+1.5*t
    x=(half+u*foot)*c+.7*s*s*math.sin(2*a)
    y=(h+u*(top-h))*s**(.70 if variant=='A' else .92)
    # Ruptures de lits horizontaux, atténuées sur l'intrados poli.
    rough=u*(.65*math.sin(y*1.55)+.25*math.sin(t*61+d*13))
    x+=rough*c;y+=u*.24*math.sin(t*49+d*6)*s
    front=wallz(x)-2-(21.6 if variant=='A' else 21.0)*s**1.4+u*(.55*math.sin(y*1.55)+.22*math.sin(t*39))
    z=front*(1-d)+(wallz(x)+3)*d
    return (x,y,z)
for variant in ['A','B']:
    DATA={p:([],[],[]) for p in MATS}
    N,U,D=56,12,5;v=[];f=[];lookup={}
    def vi(i,j,k):
        key=(i,j,k)
        if key not in lookup:lookup[key]=len(v);v.append(arch(i/N,j/U,k/D,variant))
        return lookup[key]
    # Une seule peau fermée: intrados, extrados, façade, raccord et bases.
    for j in [0,U]:
        for i in range(N):
            for k in range(D):f.append((vi(i,j,k),vi(i+1,j,k),vi(i+1,j,k+1),vi(i,j,k+1)))
    for k in [0,D]:
        for i in range(N):
            for j in range(U):f.append((vi(i,j,k),vi(i+1,j,k),vi(i+1,j+1,k),vi(i,j+1,k)))
    for i in [0,N]:
        for j in range(U):
            for k in range(D):f.append((vi(i,j,k),vi(i,j+1,k),vi(i,j+1,k+1),vi(i,j,k+1)))
    add('rock',v,f)
    if variant=='B':
        # Fracture pendante trapue, raccord noyé dans le lomo.
        v=[(2,25,-23),(6,25.5,-22),(6.8,25,-18),(1.5,25,-18),(3.1,20.8,-21.5),(4.5,20.4,-20.5)]
        add('rock',v,[(0,1,2,3),(0,4,5,1),(1,5,2),(2,5,4,3),(3,4,0)])
        for i in range(11):
            x=rng.uniform(12,18);z=wallz(x)-rng.uniform(1,3);w=rng.uniform(1.5,3.7);h=rng.uniform(1.0,3.2)
            vv,ff=kit.g_box(w,h,w*.8)
            vv=[(x+a+rng.uniform(-.3,.3),max(0,b+h/2),z+c+rng.uniform(-.3,.3)) for a,b,c in vv]
            add('rock',vv,ff)
    # Colonies épousant la surface, constellations irrégulières sur l'intrados.
    for i in range(235):
        t=rng.uniform(.035,.965);d=rng.choice([rng.uniform(.005,.07),rng.uniform(.10,.76)])
        p=Vector(arch(t,0,d,variant));tangent=(Vector(arch(t+.0001,0,d,variant))-p).normalized()
        normal=Vector((-math.cos(math.pi*t),-math.sin(math.pi*t),0));p+=normal*.045
        front_patch=i%2==0
        if front_patch:
            p=Vector(arch(t,rng.uniform(.012,.065),0,variant))+Vector((0,0,-.035))
        r=rng.uniform(.055,.19)*(1.6 if i%13==0 else 1)
        vv=[tuple(p)];ff=[]
        for j in range(7):
            a=j*math.tau/7;vv.append(tuple(p+tangent*math.cos(a)*r+(normal if front_patch else Vector((0,0,1)))*math.sin(a)*r*rng.uniform(.8,1.5)))
        for j in range(7):ff.append((0,j+1,(j+1)%7+1))
        add('glow',vv,ff,'#b48cff')
    # Esponjas huecas de copa, corales látigo y crinoideos en el borde de corriente.
    for i in range(14):
        t=rng.uniform(.13,.88);d=rng.uniform(.04,.38);p=Vector(arch(t,1,d,variant));size=rng.uniform(.4,.8)
        profile=[(.25,0),(.28,.35),(.65,.85),(.78,1),(.67,1.02),(.55,.82),(.12,.23)]
        vv,ff=kit.g_lathe([(r*size,y*size) for r,y in profile],16)
        vv=[tuple(p+Vector((x*(1+.12*math.sin(math.atan2(z,x)*3)),y,z))) for x,y,z in vv]
        add('growth',vv,ff,'#8e8a7c')
    for i in range(10):
        p=Vector(arch(rng.uniform(.16,.86),1,rng.uniform(.04,.24),variant));h=rng.uniform(1.1,2.0)
        tube([tuple(p+Vector((.35*math.sin(j*.3),h*j/10,.12*j/10))) for j in range(11)],.055,'#6a2f2c')
    for i in range(5):
        p=Vector(arch(rng.uniform(.2,.8),1,.12,variant));top=p+Vector((.12,.8,0))
        tube([tuple(p),tuple(p+Vector((.1,.4,0))),tuple(top)],.04,'#b9ad90')
        for k in range(7):
            a=k*math.tau/7;dr=Vector((math.cos(a),0,math.sin(a)))
            pts=[tuple(top+dr*(j*.16)+Vector((0,.25*math.sin(j*.5),0))) for j in range(6)]
            tube(pts,.028,'#b9ad90',5)
            for j in [2,4]:
                q=Vector(pts[j]);side=Vector((-math.sin(a),.2,math.cos(a)))
                for sign in [-1,1]:tube([tuple(q),tuple(q+dr*.12+side*.18*sign)],.018,'#b9ad90',4)
    for part,(vv,ff,cc) in DATA.items():
        ob=kit.make(variant+'_'+part,vv,ff,MATS[part],part=part,smooth_angle=.65 if part=='rock' else 1.3,tint=0)
        ob['variant']=variant;ca=ob.data.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='POINT')
        for i,c in enumerate(cc):ca.data[i].color=(*c,1)
        if part=='rock':
            for vert in ob.data.vertices:
                if vert.normal.z>.55:
                    c=ca.data[vert.index].color[:3];ca.data[vert.index].color=(*mix(c,lin('#3a4650'),.35),1)
        OBJS.append(ob)
    META[variant]=dict(span=34 if variant=='A' else 26,height=24 if variant=='A' else 30.5,reach=23.6 if variant=='A' else 23,passage=[0,9 if variant=='A' else 11,-11],clearance=[12,14,12])
parts,tris=kit.export_parts(ROOT/'arcos-roca.json',objects=OBJS,meta=dict(variants=META,wallRadius=96,wallCenter=[0,0,-96],forward='-Z'))
payload=json.loads((ROOT/'arcos-roca.json').read_text(encoding='utf-8'))
for entry,ob in zip(payload['meshes'],OBJS):entry['variant']=ob['variant']
(ROOT/'arcos-roca.json').write_text(json.dumps(payload,separators=(',',':')),encoding='utf-8')
COUNTS={a:sum(len(m['index'])//3 for m in payload['meshes'] if m['variant']==a) for a in META}
assert all(n<=14000 for n in COUNTS.values()),COUNTS
assert parts==6
bpy.ops.object.select_all(action='DESELECT')
for ob in OBJS:ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'arcos-roca.glb'),export_format='GLB',use_selection=True,export_extras=True)
print('EXPORT',parts,'partes',tris,'triángulos',COUNTS,flush=True)
# Separación de presentación exclusivamente posterior a ambas exportaciones.
OFF={'A':-27,'B':27}
for ob in OBJS:ob.location.x=OFF[ob['variant']]
kit.setup(STAGE,1)
wm=bpy.data.materials.new('Pared de revisión');wm.diffuse_color=(*lin('#1f2a33'),1);wm.use_nodes=True
wm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*lin('#1f2a33'),1)
walls=[];guides=[]
for variant in META:
    vv=[(x+OFF[variant],y,wallz(x)) for y in [-150,150] for x in [-27+i*54/64 for i in range(65)]]
    ff=[(i,i+1,i+66,i+65) for i in range(64)]
    ob=kit.make('Pared R96 '+variant,vv,ff,wm);del ob['part'];walls.append(ob)
    cu=bpy.data.curves.new('Curva R96 '+variant,'CURVE');cu.dimensions='3D';cu.bevel_depth=.12;cu.bevel_resolution=2
    sp=cu.splines.new('POLY');sp.points.add(64)
    for i,p in enumerate(sp.points):
        x=-26+i*52/64;p.co=(*B((x+OFF[variant],35,wallz(x))),1)
    ob=bpy.data.objects.new(cu.name,cu);STAGE.objects.link(ob);guides.append(ob);ob.hide_render=True
    # Huella del volumen libre proyectada encima de la cubierta, solo planta.
    cu=bpy.data.curves.new('Paso libre 12 x 14 x 12 '+variant,'CURVE');cu.dimensions='3D';cu.bevel_depth=.09
    sp=cu.splines.new('POLY');sp.points.add(4)
    for p,(x,z) in zip(sp.points,[(-6,-17),(6,-17),(6,-5),(-6,-5),(-6,-17)]):p.co=(*B((x+OFF[variant],36,z)),1)
    ob=bpy.data.objects.new(cu.name,cu);STAGE.objects.link(ob);guides.append(ob);ob.hide_render=True
world=bpy.data.worlds.new('Agua crepuscular');scene.world=world;world.use_nodes=True
bg=world.node_tree.nodes['Background'];bg.inputs['Color'].default_value=(*lin('#123a57'),1);bg.inputs['Strength'].default_value=.65
fm=bpy.data.materials.new('Agua volumétrica');fm.use_nodes=True;nt=fm.node_tree;nt.nodes.clear()
out=nt.nodes.new('ShaderNodeOutputMaterial');vol=nt.nodes.new('ShaderNodeVolumeScatter');vol.inputs['Density'].default_value=.002
vol.inputs['Color'].default_value=(.4,.65,.85,1);nt.links.new(vol.outputs[0],out.inputs['Volume'])
bpy.ops.mesh.primitive_cube_add(size=2,location=B((0,15,-35)));fog=bpy.context.object;fog.scale=(100,100,75);fog.data.materials.append(fm)
for co in list(fog.users_collection):co.objects.unlink(fog)
STAGE.objects.link(fog)
ld=bpy.data.lights.new('Cenital fría','AREA');ld.energy=42000;ld.shape='DISK';ld.size=65;ld.color=lin('#eaf6ff')
sun=bpy.data.objects.new('Cenital fría',ld);STAGE.objects.link(sun);sun.location=B((0,65,-20));sun.rotation_euler=(B((0,0,-5))-sun.location).to_track_quat('-Z','Y').to_euler()
cd=bpy.data.cameras.new('Cámara revisión');cam=bpy.data.objects.new('Cámara revisión',cd);STAGE.objects.link(cam);scene.camera=cam
cd.sensor_fit='VERTICAL';cd.clip_start=.1;cd.clip_end=500
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.cycles.max_bounces=4;scene.cycles.volume_bounces=0
scene.render.resolution_x=1600;scene.render.resolution_y=900;scene.render.resolution_percentage=100
cd.angle=math.radians(60);scene.view_settings.view_transform='AgX'
def camera(pos,target):
    cam.location=B(pos);cam.rotation_euler=(B(target)-cam.location).to_track_quat('-Z','Y').to_euler()
def render(name):
    scene.render.filepath=str(ROOT/name);print('RENDER',name,flush=True);bpy.ops.render.render(write_still=True)
camera((0,13,-80),(0,13,-10));render('render-juego.png')
ld.energy=0;bg.inputs['Color'].default_value=(*lin('#0b2438'),1);bg.inputs['Strength'].default_value=.35;render('render-oscuro.png')
ld.energy=42000;bg.inputs['Color'].default_value=(*lin('#123a57'),1);bg.inputs['Strength'].default_value=.65
target=Vector((27,16,-18));direction=Vector((.55,-.18,-1)).normalized();camera(tuple(target+direction*25),tuple(target));render('render-cerca.png')
camera((-30,9,-11),(-10,9,-11));render('render-paso.png')
fog.hide_render=True
for ob in walls:ob.hide_render=True
for ob in guides:ob.hide_render=False
cd.type='ORTHO';cd.ortho_scale=112;camera((0,100,-10),(0,0,-10));render('render-perfil.png')
cd.type='PERSP';fog.hide_render=False
for ob in walls:ob.hide_render=False
for ob in guides:ob.hide_render=True
camera((0,13,-80),(0,13,-10))
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'arcos-roca.blend'))
DIMS={}
for a in META:
    coords=[p for ob in OBJS if ob['variant']==a for p in [tuple((v.co.x,v.co.z,-v.co.y)) for v in ob.data.vertices]]
    DIMS[a]=[round(max(p[i] for p in coords)-min(p[i] for p in coords),3) for i in range(3)]
rows='\n'.join(f"| {m['name']} | {m['part']} | {m['variant']} | {len(m['index'])//3} | (0,0,0) | Fija; 0 rad; 0 rad/s |" for m in payload['meshes'])
report=f'''# ENTREGA — Arcos de roca · Batisfera

## Estado
- Versión v3, segunda y última ronda de corrección visual. Fecha: 2026-09-17.
- Lista para revisión de Luis e integración por el otro modelo.

## Archivos
| Archivo | Contenido |
|---|---|
| modelar-arcos.py | Fuente bpy reproducible; regenera la entrega |
| arcos-roca.blend | Seis mallas editables; variantes separadas 54 u para revisión |
| arcos-roca.glb | Seis mallas, pivotes locales cero, Pigment conectado, extras variant |
| arcos-roca.json | kit.export_parts; variant añadido después de exportar |
| render-juego.png / render-oscuro.png | Comparación a 70 u, FOV vertical 60° |
| render-cerca.png | B a 25 u, tres cuartos inferior |
| render-paso.png | A, cámara a 3 u del passage mirando +X |
| render-perfil.png | Planta ortográfica sin niebla, curva R96 |

Regenerar desde esta carpeta:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 modelar-arcos.py
```

## Datos técnicos
- Triángulos: **{tris}**. A: **{COUNTS['A']}**; B: **{COUNTS['B']}**. Tres mallas por variante.
- Dimensiones X × Y × Z de todo el activo local: A **{DIMS['A']} u**; B **{DIMS['B']} u**.
- Origen: cara de pared, media luz, pie inferior y=0. Y arriba; frente −Z.
- JSON: {(ROOT/'arcos-roca.json').stat().st_size/1024:.1f} KiB.
- Trasera de pies y cubierta: z=sqrt(96²−x²)−96+3; penetración axial 3 u.
- Luz nominal A 34 u / B 26 u; altura de roca A ≈24 / B ≈30.5; alcance A 23.6 / B 23 u.
- Paso central conservador: caja de 12 × 14 × 12 u en cada variante; sin suelo exportado.
- Pies retraídos hacia la curva: la salida lateral discurre por delante de las raíces de roca.

## Partes
| Objeto | part | variant | Triángulos | Pivote Three | Movimiento |
|---|---|---|---|---|---|
{rows}
Sin segment. Todas fijas. Glow respira por emisión: 1.3 + 0.25·sin(2π·0.055·t + fase),
amplitud 19.23 %, 0.055 ciclos/s; fase A=0, B=1.7 rad. No animar geometría.

## Materiales
| Material | Paleta | Metal / rugosidad | Emisión | Alfa |
|---|---|---|---|---|
| rock | #0d151d…#293946, sedimento #3a4650 | 0 / .95 | 0 | 1 |
| growth | #8e8a7c, #6a2f2c, #b9ad90 | 0 / .90 | 0 | 1 |
| glow | #b48cff | 0 / .90 | 1.3, #b48cff | 1 |
Blanco multiplicado por Pigment; único material por parte. Colonias en parches superficiales;
usar DoubleSide en glow para visibilidad de ambos lados de la lámina.

## Meta
Claves raíz: variants={json.dumps(META,ensure_ascii=False)}, wallRadius=96,
wallCenter=[0,0,-96], forward="-Z". passage está en Three local y sirve como centro de cruce.
clearance es la caja conservadora libre X,Y,Z alrededor del passage.

## Diferencias con el brief
- Crecimiento concentrado en el lomo; pies sin colonias específicas. Espolón y derrumbe poco legibles en penumbra.
- Cámara conjunta a 70 u del objetivo desde el lado del centro del pozo; las dos paredes locales
  se presentan trasladadas junto con las variantes. No representa una colocación conjunta real en el cilindro.
- Niebla volumétrica de revisión 0.002; la niebla exponencial final corresponde al integrador.
- La planta es ortográfica; un rectángulo de 12 × 12 u proyecta el paso libre de 14 u de alto sobre la cubierta.
- kit no serializa variant: el script lo añade al resultado de kit.export_parts sin modificar el kit.

## Sugerencias para integrar
Agrupar por variant antes de instanciar; ambos conjuntos exportados se superponen en origen de forma intencional.
Colocar cada grupo a radio 96 y rotarlo alrededor de Y. La separación ±27 de Blender es solo presentación.
Al espejar X, mantener normales y material de doble cara de colonias. Pared, volumen, guía y luces no se exportan.

## Revisión propia
Cinco vistas Cycles, 32 muestras, denoise, 1600 × 900. Presupuesto y seis partes comprobados por el script.
Revisados los cinco renders finales: A ancho y bajo y B alto se distinguen; glow traza ambos ojos
con interrupciones naturales; la vista de paso muestra salida lateral tras retraer los pies.
Presupuesto, seis partes, pivotes cero, variant, pigmento y emisión exclusiva de glow comprobados.
Pared y lomo penetran 3 u; el volumen central libre se indica en meta y en la guía de planta.
El criterio de detalle cercano queda parcialmente resuelto: la penumbra oculta el espolón y parte
del derrumbe, y persisten facetas en los bordes rocosos. El crecimiento se concentra en el lomo,
sin colonias específicas en los pies. No se declara aceptación artística completa de esos puntos.
Se agotaron las dos rondas de corrección permitidas; no se ha realizado integración ni QA del juego.
'''
(ROOT/'ENTREGA.md').write_text(report,encoding='utf-8')
print('FINAL',COUNTS,DIMS,flush=True)

