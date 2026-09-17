"""Jardín de medianoche. Autoría Three (Y arriba, frente -Z), bpy reproducible."""
import bpy, math, random, sys, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parents[3]/'grados-mayores-juego'/'art'/'blender'))
import kit
from kit import B,lin
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
ART=bpy.data.collections.new('Kit coral');scene.collection.children.link(ART)
STAGE=bpy.data.collections.new('Solo revisión');scene.collection.children.link(STAGE)
kit.setup(ART,1709);rng=random.Random(1709)
def mix(a,b,t):return tuple(x*(1-t)+y*t for x,y in zip(a,b))
# Una rampa embebida permite emisión interpolada por vértice en glTF estándar.
img=bpy.data.images.new('Emisión ámbar — rampa embebida',width=256,height=1)
img.colorspace_settings.name='Non-Color'
warm=lin('#ffd27f');img.pixels=[c for i in range(256) for c in (*[v*i/255 for v in warm],1)];img.pack()
mat=bpy.data.materials.new('Coral · pigmento y emisión local');mat.use_nodes=True
nt=mat.node_tree;bs=nt.nodes['Principled BSDF'];bs.inputs['Base Color'].default_value=(1,1,1,1);bs.inputs['Roughness'].default_value=.92
vc=nt.nodes.new('ShaderNodeVertexColor');vc.layer_name='Pigment';nt.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
tex=nt.nodes.new('ShaderNodeTexImage');tex.image=img;tex.extension='EXTEND';tex.interpolation='Linear'
nt.links.new(tex.outputs['Color'],bs.inputs['Emission Color']);bs.inputs['Emission Strength'].default_value=2.8
V=[];F=[];C=[];E=[];OBJS=[];DATA={};META={}
def add(v,f,colors,em):
    off=len(V);V.extend(v);F.extend(tuple(off+i for i in face) for face in f);C.extend(colors);E.extend(em)
def sweep(pts,radii,glow,sides=8,color='#4a3b46'):
    vv=[];ff=[];cc=[];ee=[];pts=list(map(Vector,pts));normal=Vector((1,0,0))
    for i,p in enumerate(pts):
        t=(pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)]).normalized();normal=(normal-t*normal.dot(t)).normalized();w=t.cross(normal)
        for j in range(sides):
            a=j*math.tau/sides;vv.append(tuple(p+(normal*math.cos(a)+w*math.sin(a))*radii[i]));ee.append(glow[i]*(.4+.6*(.5+.5*math.cos(a+.6))))
            cc.append(mix(lin(color),lin('#6b6a63'),.25+.16*math.sin(i*.9+j*1.4)))
    for i in range(len(pts)-1):
        for j in range(sides):ff.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    ff.extend([tuple(reversed(range(sides))),tuple((len(pts)-1)*sides+j for j in range(sides))]);add(vv,ff,cc,ee)
def base():
    vv=[];ff=[];n=24
    for k in range(4):
        for j in range(n):
            a=j*math.tau/n;r=[.68,1,1,.72][k]*(1+.06*math.sin(a*5));x=1.28*r*math.cos(a);y=.45+.45*r*math.sin(a);z=[1.5,1.1,-.08,-.35][k]
            vv.append((x,y,z))
    for k in range(3):
        for j in range(n):ff.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
    ff.extend([tuple(reversed(range(n))),tuple(3*n+j for j in range(n))]);add(vv,ff,[mix(lin('#0d151d'),lin('#293946'),.35+.25*math.sin(p[0]*6+p[1]*8)) for p in vv],[0]*len(vv))
def finish(part):
    ob=kit.make(part,V,F,mat,part=part,tint=0,smooth_angle=math.pi)
    ca=ob.data.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='POINT')
    for i,c in enumerate(C):ca.data[i].color=(*c,1)
    ea=ob.data.attributes.new(name='emission',type='FLOAT',domain='POINT')
    for i,e in enumerate(E):ea.data[i].value=e
    uv=ob.data.uv_layers.new(name='EmissionUV')
    for loop in ob.data.loops:uv.data[loop.index].uv=((.5+255*E[loop.vertex_index])/256,.5)
    # Blender invalida la referencia al añadir más atributos: se reactiva por nombre, si no
    # kit.export_parts no encuentra color activo y el JSON sale sin pigmento (cuerpos blancos).
    ob.data.color_attributes.active_color=ob.data.color_attributes['Pigment']
    ob.data.color_attributes.render_color_index=ob.data.color_attributes.find('Pigment')
    DATA[part]=(list(V),list(E));OBJS.append(ob)
    dims=[round(max(p[i] for p in V)-min(p[i] for p in V),3) for i in range(3)]
    peak=max(range(len(E)),key=lambda i:E[i]);META[part]=dict(height=dims[1],footprint=2.7,glowCenter=[round(v,4) for v in V[peak]],dimensions=dims)
# Gorgonia: red radial en plano vertical oblicuo, abierta en rombos, ramas soldadas visualmente.
base();ribs=[]
for j in range(7):
    a=-1.13+j*2.26/6;pts=[]
    for k in range(14):
        t=k/13;s=math.sin(a)*3.35*t**.8+.14*math.sin(t*8+j)*t;pts.append((s*.67, .55+t*(5.8*math.cos(a)+.4)+.1*math.sin(j*3)*t,-.25-2.9*t-s*.742))
    ribs.append(pts);sweep(pts,[.105*(1-k/18) for k in range(14)],[0 if k<3 else .18+.65*math.sin(k*.6+j)**2 for k in range(14)],6)
for level in [5,9,13]:
    for j in range(6):
        a=Vector(ribs[j][level]);b=Vector(ribs[j+1][max(3,level-(j%2))]);pts=[a.lerp(b,k/4)+Vector((0,.16*math.sin(k*math.pi/4),-.07*math.sin(k*math.pi/4))) for k in range(5)]
        sweep(pts,[.04,.047,.05,.046,.04],[.08,.25,0 if j%3==0 else .48,.25,.08],6)
finish('fan');V=[];F=[];C=[];E=[]
# Siete tubos con labios redondeados e interior profundo abierto.
base()
for j in range(7):
    a=j*2.399;h=[5.5,3.9,4.8,3.3,5.9,4.3,3.6][j];x=.77*math.cos(a);z=-.6+.62*math.sin(a);rad=.36+.065*(j%3)
    profile=[(.58,0),(.9,.15),(1,.5),(1.05,.85),(1.12,.97),(1.03,1),(.81,.985),(.73,.93),(.64,.76),(.3,.57)]
    vv=[];ff=[];cc=[];ee=[];n=16
    for k,(r,t) in enumerate(profile):
        for q in range(n):
            ang=q*math.tau/n;rr=rad*r*(1+.04*math.sin(ang*5+j));xx=x*(.35+.65*t)+.20*math.sin(t*2+j)*t;zz=z-1.05*t
            vv.append((xx+rr*math.cos(ang),.35+h*t+.72*rr*math.sin(ang),zz-1.6*t+.694*rr*math.sin(ang)))
            cc.append(mix(lin('#3d4a52'),lin('#6b6a63'),.3+.22*math.sin(t*9+ang*3+j)))
            ee.append([0,0,0,0,0,.25,.85,.08,0,0][k]*(.85+.15*math.cos(ang+j)))
    for k in range(len(profile)-1):
        for q in range(n):ff.append((k*n+q,k*n+(q+1)%n,(k+1)*n+(q+1)%n,(k+1)*n+q))
    ff.extend([tuple(reversed(range(n))),tuple(9*n+q for q in range(n))]);add(vv,ff,cc,ee)
finish('tube');V=[];F=[];C=[];E=[]
base();pts=[];r=[];e=[]
for i in range(113):
    t=i/112;pts.append((.8*math.sin(t*5)*t, .5+7.8*t,-.2-2.9*t+.5*math.sin(t*5)))
    knot=math.exp(-((i%12-6)/1.2)**2);r.append((.135*(1-.7*t))*(1+.65*knot));e.append((.9*knot if knot>.1 and t>.12 else 0) if t<.965 else .9)
sweep(pts,r,e,8,'#6b6a63');finish('whip');V=[];F=[];C=[];E=[]
base();vv=[];ff=[];cc=[];ee=[];n=64;nr=12
for k in range(nr):
    t=(k+1)/nr
    for j in range(n):
        a=j*math.tau/n;lob=1+.13*math.cos(7*a)+.06*math.sin(11*a);x=1.64*t*lob*math.cos(a);y=.66+.56*t*lob*math.sin(a);z=-.12-.45*math.sin(t*math.pi/2)-.13*math.sin(t*16+a*2)*math.sin(t*math.pi)
        vv.append((x,y,z));cc.append(mix(lin('#4a3b46'),lin('#6b6a63'),.35+.25*math.sin(a*7+t*8)));ee.append((.65+.25*math.sin(a*3)**2) if k in [4,8,10] and (j//4+k)%5 else 0)
for k in range(nr-1):
    for j in range(n):ff.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
ff.append(tuple(reversed(range(n))));add(vv,ff,cc,ee);finish('crust')
parts,tris=kit.export_parts(ROOT/'jardin-corales.json',objects=OBJS,meta=dict(pieces=META,wallRadius=96,forward='-Z'))
payload=json.loads((ROOT/'jardin-corales.json').read_text(encoding='utf-8'));counts={}
for entry in payload['meshes']:
    vv,ee=DATA[entry['part']];ob=next(o for o in OBJS if o['part']==entry['part']);lookup={tuple(round(c,5) for c in (v.co.x,v.co.z,-v.co.y)):e for v,e in zip(ob.data.vertices,ee)}
    vals=[lookup[tuple(entry['position'][i:i+3])] for i in range(0,len(entry['position']),3)]
    entry['vertexEmission']=[round(c*e,6) for e in vals for c in warm];entry['emissionColor']=[1,1,1];entry['emission']=2.8
    counts[entry['part']]=len(entry['index'])//3
    assert counts[entry['part']]<=2500 and any(e==0 for e in vals) and max(vals)>.5
assert parts==4 and tris<=10000
payload['vertexEmissionEncoding']='linear RGB, 3 components per exported vertex; multiply by emission (2.8); zero means off'
(ROOT/'jardin-corales.json').write_text(json.dumps(payload,separators=(',',':'),ensure_ascii=False),encoding='utf-8')
bpy.ops.object.select_all(action='DESELECT')
for ob in OBJS:ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'jardin-corales.glb'),export_format='GLB',use_selection=True,export_extras=True)
print('EXPORT',parts,'partes',tris,'triángulos',counts,'DIMENSIONS',META,flush=True)
# Escenografía exclusivamente de revisión.
kit.setup(STAGE,1)
world=bpy.data.worlds.new('Medianoche');scene.world=world;world.use_nodes=True
nt=world.node_tree;nt.nodes.clear();out=nt.nodes.new('ShaderNodeOutputWorld');bg=nt.nodes.new('ShaderNodeBackground');bg.inputs['Color'].default_value=(*lin('#050d18'),1)
zero=nt.nodes.new('ShaderNodeBackground');zero.inputs['Strength'].default_value=0;lp=nt.nodes.new('ShaderNodeLightPath');mx=nt.nodes.new('ShaderNodeMixShader');nt.links.new(lp.outputs['Is Camera Ray'],mx.inputs[0]);nt.links.new(zero.outputs[0],mx.inputs[1]);nt.links.new(bg.outputs[0],mx.inputs[2]);nt.links.new(mx.outputs[0],out.inputs[0])
ld=bpy.data.lights.new('Relleno lateral tenue','AREA');ld.energy=170;ld.size=12;ld.color=lin('#cfe8ff');light=bpy.data.objects.new(ld.name,ld);STAGE.objects.link(light);light.location=B((-5,3,-8));light.rotation_euler=(B((0,3,0))-light.location).to_track_quat('-Z','Y').to_euler()
cd=bpy.data.cameras.new('Revisión');cam=bpy.data.objects.new('Revisión',cd);STAGE.objects.link(cam);scene.camera=cam;cd.sensor_fit='VERTICAL';cd.angle=math.radians(60);cd.clip_start=.1;cd.clip_end=400
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.cycles.max_bounces=4
scene.render.resolution_x=1600;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
def camera(pos,target):
    cam.location=B(pos);cam.rotation_euler=(B(target)-cam.location).to_track_quat('-Z','Y').to_euler()
def render(name):
    scene.render.filepath=str(ROOT/name);print('RENDER',name,flush=True);bpy.ops.render.render(write_still=True)
offsets=[-7,-2.3,2.8,7]
for ob,x in zip(OBJS,offsets):ob.location=B((x,0,0))
camera((0,4,-19.5),(0,4,-1.5));render('render-piezas.png');ld.energy=0;render('render-oscuro.png');ld.energy=170
# Cercanía: dos paneles a 6 u exactas del objetivo, para conservar escala y ambas piezas.
scene.render.resolution_x=800
panel=[]
for ob in OBJS:ob.hide_render=True
for idx in [0,1]:
    ob=OBJS[idx];ob.hide_render=False;ob.location=B((0,0,0));target=Vector((0,3.5,-2.4));direction=Vector((-.75,.05,-1)).normalized() if idx==0 else Vector((.12,.3,-1)).normalized();camera(tuple(target+direction*6),target)
    scene.render.filepath=str(ROOT/('_panel'+str(idx)+'.png'));bpy.ops.render.render(write_still=True)
    im=bpy.data.images.load(scene.render.filepath,check_existing=False);panel.append(list(im.pixels));bpy.data.images.remove(im);(ROOT/('_panel'+str(idx)+'.png')).unlink();ob.hide_render=True
combined=bpy.data.images.new('Cercanía 6 u',width=1600,height=900);pixels=[]
for y in range(900):
    for p in panel:pixels.extend(p[y*800*4:(y+1)*800*4])
combined.pixels=pixels;combined.filepath_raw=str(ROOT/'render-cerca.png');combined.file_format='PNG';combined.save();bpy.data.images.remove(combined);scene.render.resolution_x=1600
# Pared real R96 y veinte instancias con semilla fija.
wm=bpy.data.materials.new('Roca de revisión');wm.use_nodes=True;wbs=wm.node_tree.nodes['Principled BSDF'];wbs.inputs['Base Color'].default_value=(*lin('#192732'),1);wbs.inputs['Roughness'].default_value=.97
vv=[(96*math.sin(-.3+i*.6/64),y,96*math.cos(-.3+i*.6/64)-96) for y in [-8,23] for i in range(65)]
wall=kit.make('Pared R96',vv,[(i,i+1,i+66,i+65) for i in range(64)],wm);del wall['part'];copies=[]
for i in range(20):
    src=OBJS[[0,1,3,2,1,0,3,1,2,3][i%10]];ob=src.copy();ob.data=src.data;STAGE.objects.link(ob);ob.hide_render=False;del ob['part'];a=(-.22+(i%7)*.072)+rng.uniform(-.018,.018);y=(i//7)*5.4+rng.uniform(-1,1)
    ob.location=B((96*math.sin(a),y,96*math.cos(a)-96));ob.rotation_euler=(math.radians(rng.uniform(-12,12)),math.radians(rng.uniform(-20,20)), -a);s=rng.uniform(.7,1.4);ob.scale=(s,s,s);copies.append(ob)
fm=bpy.data.materials.new('Bruma .018');fm.use_nodes=True;fn=fm.node_tree;fn.nodes.clear();fo=fn.nodes.new('ShaderNodeOutputMaterial');vol=fn.nodes.new('ShaderNodeVolumePrincipled');vol.inputs['Density'].default_value=.018;vol.inputs['Color'].default_value=(.25,.38,.5,1);fn.links.new(vol.outputs[0],fo.inputs['Volume'])
bpy.ops.mesh.primitive_cube_add(size=2,location=B((0,8,-24)));fog=bpy.context.object;fog.name='Agua solo manchón';fog.scale=(40,32,30);fog.data.materials.append(fm)
for co in list(fog.users_collection):co.objects.unlink(fog)
STAGE.objects.link(fog);camera((0,8,-47),(0,8,-2));render('render-manchon.png');fog.hide_render=True
for ob in copies:ob.hide_render=True
# Perfil: piezas escalonadas en altura junto a una misma sección cilíndrica.
wall.hide_render=True
profilewalls=[]
for i,ob in enumerate(OBJS):
    ob.hide_render=False;ob.location=B((0,0,-i*10))
    vv=[(x,y,math.sqrt(96**2-x*x)-96-i*10) for y in [-.5,9.5] for x in [-1.6+j*3.2/16 for j in range(17)]]
    pw=kit.make('Sección R96 '+ob.name,vv,[(j,j+1,j+18,j+17) for j in range(16)],wm);del pw['part'];profilewalls.append(pw)
wbs.inputs['Emission Color'].default_value=(*lin('#293946'),1);wbs.inputs['Emission Strength'].default_value=.3
# Regla vertical con marcas cada metro: malla y texto solo revisión.
gm=bpy.data.materials.new('Escala');gm.use_nodes=True;gbs=gm.node_tree.nodes['Principled BSDF'];gbs.inputs['Base Color'].default_value=(.4,.5,.6,1);gbs.inputs['Emission Color'].default_value=(.25,.35,.45,1);gbs.inputs['Emission Strength'].default_value=1
guides=[]
for i in range(10):
    vv,ff=kit.g_box(.035,.028,.5 if i%5==0 else .23);ob=kit.make('Marca '+str(i),[(x,y+i,z-5) for x,y,z in vv],ff,gm);del ob['part'];guides.append(ob)
for i in range(0,10,1):
    cu=bpy.data.curves.new(str(i)+' u','FONT');cu.body=str(i)+' u';cu.size=.6;ob=bpy.data.objects.new(cu.name,cu);STAGE.objects.link(ob);ob.location=B((0,i,-6.4));ob.rotation_euler=(math.pi/2,0,-math.pi/2);cu.materials.append(gm);guides.append(ob)
ld.energy=350;light.location=B((10,4,-15));light.rotation_euler=(B((0,4,-15))-light.location).to_track_quat('-Z','Y').to_euler();cd.type='ORTHO';cd.ortho_scale=24;camera((35,4,-16),(0,4,-16))
for ob in guides:
    if ob.type=='FONT':ob.rotation_euler=cam.rotation_euler
render('render-perfil.png')
for ob in profilewalls:ob.hide_render=True
for ob in guides:ob.hide_render=True
wall.hide_render=True
for ob,x in zip(OBJS,offsets):ob.location=B((x,0,0))
cd.type='PERSP';camera((0,4,-19.5),(0,4,-1.5));ld.energy=170;light.location=B((-5,3,-8));light.rotation_euler=(B((0,3,0))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'jardin-corales.blend'))
rows='\n'.join(f"| {p} | {counts[p]} | {' × '.join(map(str,META[p]['dimensions']))} | (0, 0, 0) | Fija; 0 rad; 0 rad/s |" for p in META)
report=f'''# ENTREGA — Jardín de corales bioluminiscentes · Batisfera

## Estado
Versión v3, segunda y última ronda de corrección. 2026-09-17. Lista para revisión de Luis.

## Archivos
| Archivo | Contenido |
|---|---|
| modelar-corales.py | Fuente bpy reproducible; regenera modelos, renders y esta entrega |
| jardin-corales.blend | Cuatro piezas editables separadas en X; escenografía en Solo revisión |
| jardin-corales.glb | Cuatro mallas en origen, pigmento conectado y rampa de emisión embebida |
| jardin-corales.json | kit.export_parts con vertexEmission añadido sin modificar kit |
| render-piezas.png / render-oscuro.png | Fila a 18 u, FOV vertical 60°, con relleno / solo emisión |
| render-manchon.png | 20 instancias, curva R96, cámara a 45 u, volumen .018 |
| render-cerca.png | Dos paneles fan y tube, cada cámara a 6 u, FOV 60° |
| render-perfil.png | Perfil ortográfico, curva R96 y regla graduada cada 1 u |

Regenerar desde esta carpeta:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 modelar-corales.py
```

## Datos técnicos y partes
{parts} mallas, **{tris} triángulos**. JSON: {(ROOT/'jardin-corales.json').stat().st_size/1024:.1f} KiB.
Dimensiones en X × Y × Z (ancho × alto × profundidad), unidades de juego.
| part / objeto | Triángulos | Dimensiones (u) | Pivote Three | Animación geométrica |
|---|---|---|---|---|
{rows}
Sin segment. Frente −Z; Y arriba. Bases de ancho <2.7 u, penetración máxima +1.5 u.
Orígenes locales en la cara de pared (0,0,0). Separación del blend solo para presentación.

## Materiales
Un material por pieza, alfa 1, metal 0, rugosidad .92.
Pigmento lineal por vértice: hueso #6b6a63, ciruela #4a3b46, gris #3d4a52; roca #0d151d–#293946.
Emisión ámbar #ffd27f, intensidad 2.8, máscara no uniforme; roca y cuerpos basales con cero exacto.
GLB usa UV que muestrean una rampa de emisión embebida y COLOR_0 para pigmento; no requiere texturas externas.
JSON: vertexEmission es RGB lineal por vértice, alineado con position, incluyendo duplicados de normales.
Multiplicar por emission=2.8; no aplicar emisión uniforme a todo el cuerpo. emissionColor blanco.
El atributo FLOAT emission en Blender guarda la máscara escalar original.

## Meta
Claves raíz pieces={json.dumps(META,ensure_ascii=False)}, wallRadius=96, forward="-Z".
glowCenter está en Three local y sitúa un destello; height mide toda la pieza, footprint limita la base.

## Diferencias con el brief
- kit no exporta emisión por vértice de fábrica: se añade vertexEmission tras kit.export_parts.
- GLB representa la emisión por vértice mediante una rampa de textura interpolada, porque glTF estándar no tiene atributo de emisión por vértice.
- Cercanía en dos paneles para mostrar ambas piezas a 6 u. Perfil ortográfico, cuatro secciones de pared R96 trasladadas horizontalmente para separar siluetas.
- La niebla de revisión es volumen Cycles .018, aproximación visual a la niebla exponencial del juego.

## Sugerencias para integrar
Instanciar cada part con su pivote cero. Una malla y un material por pieza.
Pulso sugerido de emisión: multiplicador 1 + 0.16 sin(2π·0.07·t + fase), ±16 %, .07 ciclos/s;
fase distinta por instancia. Geometría estática. Mantener ceros de vertexEmission.
No exportar cámara, pared, escala ni copias de revisión. Sin transparencias.
'''
report += '''
## Revisión propia y límites de aceptación
Revisados visualmente los cinco renders finales después de dos rondas de corrección.
- Medidas, cuatro pivotes cero y presupuestos: conformes; bases con penetración +1.5 u y huella conservadora 2.7 u.
- Siluetas en oscuridad: abanico reticulado, bocas, cadena de nudos y costra ondulada distinguibles.
- Manchón: 20 instancias con variación de tamaño e inclinación; el patrón del abanico sigue reconocible al repetirse.
- Volumen y detalle: tubos abiertos y labios suavizados; persisten facetas visibles en labios y cambios de dirección de algunas nervaduras en la vista cercana. Este criterio no queda plenamente satisfecho; se alcanzó el máximo de dos rondas.
- Pigmento variable y zonas sin emisión: presentes. El cuerpo frío resulta muy oscuro con el relleno exigido.
- Exportación: GLB con cuatro primitivas, COLOR_0 y textura emisiva embebida; JSON con ceros exactos en vertexEmission y meta completo.
- Reproducibilidad: ejecutado con bpy-run.ps1 de Luis, sin modificar kit ni archivos de integración.
- Las vistas cercanas son recortes de detalle a 6 u, no retratos completos. El perfil usa secciones de pared trasladadas y una emisión tenue de guía en la roca para localizar su superficie; no forma parte del activo exportado.
- El abanico es una red abierta de siete nervaduras principales y enlaces curvos, de lectura más esquemática que un encaje denso naturalista. Se entrega para revisión artística, sin afirmar aprobación de todos los criterios visuales.'''
(ROOT/'ENTREGA.md').write_text(report,encoding='utf-8')




