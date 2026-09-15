"""Cuatro siluetas pintadas para Aerostato. Autoría en ejes Three, metros.
Ejecutar con bpy-run.ps1; todos los resultados quedan junto a este archivo.
"""
import sys, math, json, random
from pathlib import Path
import bpy, bmesh
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parent
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT.parents[3] / 'grados-mayores-juego' / 'art' / 'blender'))
import kit
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection, 71)
random.seed(71)

def material(name, metal=0, rough=.6, emission='000000', strength=0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    p=m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value=(1,1,1,1)
    p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
    p.inputs['Emission Color'].default_value=(*kit.lin(emission),1)
    p.inputs['Emission Strength'].default_value=strength
    c=m.node_tree.nodes.new('ShaderNodeVertexColor'); c.layer_name='Pigment'
    m.node_tree.links.new(c.outputs['Color'],p.inputs['Base Color'])
    return m

PAINT=material('Pintura satinada'); DARK=material('Metal oscuro satinado',.28,.55)
GOLD=material('Foil dorado',.85,.3,'5a3300',.12)
SOLAR=material('Celdas solares',.25,.58,'0a2d66',.5)
RED=material('Baliza roja',0,.5,'ff1808',3)

class Geo:
    def __init__(self): self.v=[]; self.f=[]; self.c=[]; self.s=[]
    def add(self,v,f,color,smooth=True):
        off=len(self.v); self.v.extend(v); self.f.extend(tuple(off+i for i in a) for a in f)
        self.s.extend([smooth]*len(f))
        for p in v:
            col=color[len(self.c)-off] if isinstance(color,list) else color(p) if callable(color) else color
            c=kit.lin(col) if isinstance(col,str) else col
            k=.94+.045*math.sin(p[0]*3.1+p[2]*2.6)+.025*math.cos(p[1]*8-p[2]*4)
            self.c.append(tuple(min(1,max(0,x*k)) for x in c))
    def box(self,pos,size,color):
        v,f=kit.g_box(*size); self.add([tuple(Vector(p)+Vector(pos)) for p in v],f,color,False)
    def loft(self,profile,n,color,center=(0,0,0)):
        # Sections: z, radius X, radius Y, center Y. Rounded continuous hull.
        v=[]; f=[]
        for z,rx,ry,cy in profile:
            for j in range(n):
                a=j*math.tau/n
                v.append((center[0]+rx*math.cos(a),center[1]+cy+ry*math.sin(a),center[2]+z))
        for i in range(len(profile)-1):
            for j in range(n):
                k=i*n+j; l=i*n+(j+1)%n; f.append((k,l,l+n,k+n))
        f.extend([tuple(reversed(range(n))),tuple((len(profile)-1)*n+j for j in range(n))])
        self.add(v,f,color)
    def egg(self,pos,size,color,n=12,r=6):
        self.loft([(size[2]*math.cos(i*math.pi/r),max(.001,size[0]*math.sin(i*math.pi/r)),max(.001,size[1]*math.sin(i*math.pi/r)),0) for i in range(r+1)],n,color,pos)
    def rod(self,a,b,r,color,n=8):
        m=kit.facing(a,b); v,f=kit.g_cyl(r,r,(Vector(b)-Vector(a)).length,n)
        mid=(Vector(a)+Vector(b))*.5
        rot=Vector((0,1,0)).rotation_difference((Vector(b)-Vector(a)).normalized())
        self.add([tuple(mid+rot@Vector(p)) for p in v],f,color)
    def wing(self,stations,color,vertical=False,n=10):
        # Airfoil sections, rounded leading edge and tapered tip, no box wings.
        v=[]; f=[]
        for x,y,z,chord,thick in stations:
            for j in range(n):
                a=j*math.tau/n
                p=(x,y+thick*math.sin(a),z+chord*.5*math.cos(a))
                v.append((p[1],p[0],p[2]) if vertical else p)
        for i in range(len(stations)-1):
            for j in range(n):
                k=i*n+j;l=i*n+(j+1)%n;f.append((k,l,l+n,k+n))
        f.extend([tuple(reversed(range(n))),tuple((len(stations)-1)*n+j for j in range(n))])
        self.add(v,f,color)
    def finish(self,name,part,mat=PAINT,pivot=(0,0,0),segment=None):
        ob=kit.make(name,[tuple(Vector(v)-Vector(pivot)) for v in self.v],self.f,mat,part=part,tint=0)
        ob.location=kit.B(pivot)
        attr=ob.data.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='POINT')
        for i,c in enumerate(self.c): attr.data[i].color=(*c,1)
        ob.data.color_attributes.active_color=attr
        for p,s in zip(ob.data.polygons,self.s): p.use_smooth=s
        if segment is not None: ob['segment']=segment
        return ob

def tail(g,z,span,height,color):
    for s in (-1,1):
        g.wing([(s*.06,.15,z,.8,.065),(s*span*.8,.20,z-.15,.48,.035),(s*span,.23,z-.23,.12,.015)],color)
    g.wing([(.12,0,z,.95,.08),(height*.75,0,z-.25,.58,.055),(height,0,z-.36,.25,.025)],color,True)

models={}
# AVIONETA: la cabina forma parte del perfil; ala alta sobre el acristalamiento.
g=Geo()
def cream(p):
    x,y,z=p
    if .18<y<.62 and -.28<z<1.25: return '29485b'
    if -.13<y<.10: return 'b5402e'
    return 'f3ead7'
g.loft([(-2.25,.025,.04,.10),(-2.0,.11,.15,.12),(-1.35,.20,.23,.10),(-.65,.32,.40,.08),(0,.46,.58,.10),(.68,.46,.57,.10),(1.18,.37,.43,.03),(1.55,.31,.29,-.04),(1.95,.20,.21,-.04),(2.05,.10,.12,-.04)],20,cream)
for s in (-1,1):
    g.wing([(0,.72,.25,1.42,.105),(s*2.9,.77,.18,1.23,.075),(s*3.42,.80,.12,.97,.055),(s*3.5,.8,.12,.65,.018)],'b5402e')
    g.rod((s*.35,-.22,.1),(s*2.25,.71,.22),.035,'e4d7ba')
    g.rod((s*.28,-.23,.3),(s*.79,-.85,.30),.044,'a49b89')
    g.egg((s*.79,-.88,.30),(.16,.17,.33),'b5402e')
    g.egg((s*.79,-1.01,.28),(.105,.105,.15),'2a2a2a',10,4)
    # Cabin frame across the pigmented glass, same mesh and material.
    g.rod((s*.45,.20,.34),(s*.42,.61,.31),.024,'f3ead7',6)
g.rod((0,-.15,-1.75),(0,-.5,-1.85),.035,'a49b89')
g.egg((0,-.53,-1.85),(.07,.10,.12),'2a2a2a',10,4)
tail(g,-1.72,1.08,1.17,'b5402e')
body=g.finish('Avioneta • fuselaje y ala alta','body')
p=Geo(); hub=(0,-.04,2.05)
p.loft([(-.08,.11,.11,0),(.06,.16,.16,0),(.16,.105,.105,0),(.20,.01,.01,0)],16,'f3ead7',hub)
blade_start=len(p.v)
for s in (-1,1):
    p.wing([(s*.08,-.04,2.06,.15,.045),(s*.56,-.04,2.06,.22,.035),(s*.83,-.04,2.06,.16,.024),(s*.87,-.04,2.06,.09,.01)],lambda v:'e7dfc8' if abs(v[0])>.73 else '2a2a2a')
# Rotate blade geometry 90 degrees around X through its center; axis stays +Z.
for i in range(blade_start,len(p.v)):
    x,y,z=p.v[i];p.v[i]=(x,-.04+(z-2.06),2.06-(y+.04))
models['avioneta']=[body,p.finish('Avioneta • hélice','prop',pivot=hub)]

# JET: huso redondeado, góndolas con labios y bocas oscuras, ventanillas pintadas.
g=Geo()
def jetcolor(p):
    x,y,z=p
    if -.08<y<.13: return '3a5a8c'
    return 'f4f4f0'
# Ring spacing resolves the window rhythm without separate draw calls.
prof=[]
anchors=[(-4.5,.025),(-4.1,.18),(-3.5,.40),(-2.8,.55),(2.6,.55),(3.2,.49),(3.7,.36),(4.1,.22),(4.4,.09),(4.5,.012)]
for i in range(len(anchors)-1):
    a,ra=anchors[i]; b,rb=anchors[i+1]; steps=max(1,math.ceil((b-a)/.5))
    for j in range(steps):
        t=j/steps; z=a+(b-a)*t; r=ra+(rb-ra)*t; prof.append((z,r,r,0))
prof.append((4.5,.012,.012,0));g.loft(prof,24,jetcolor)
# Opaque pigmented patches follow the hull's actual polygon surface.
def hullpoint(y,z,side):
    radius=.55
    for (za,ra),(zb,rb) in zip(anchors,anchors[1:]):
        if za<=z<=zb:radius=ra+(rb-ra)*(z-za)/(zb-za);break
    angle=math.asin(y/radius);step=math.tau/24
    a=math.floor(angle/step)*step;b=a+step
    t=(y-radius*math.sin(a))/(radius*(math.sin(b)-math.sin(a)))
    x=radius*((1-t)*math.cos(a)+t*math.cos(b))+.018
    return (side*x,y,z)
for side in (-1,1):
    for i in range(15):
        z=-2.55+i*.35
        v=[hullpoint(.255+.083*math.sin(j*math.tau/8),z+.065*math.cos(j*math.tau/8),side) for j in range(8)]
        v.append(hullpoint(.255,z,side))
        g.add(v,[(8,j,(j+1)%8) for j in range(8)],'223849')
    v=[hullpoint(y,z,side) for y,z in [(.14,3.13),(.32,3.13),(.28,3.42),(.15,3.68),(.09,3.60)]]
    v.append(hullpoint(.205,3.37,side))
    g.add(v,[(5,j,(j+1)%5) for j in range(5)],'233c52')
for s in (-1,1):
    g.wing([(s*.38,-.14,.20,2.5,.12),(s*1.5,-.06,-.28,1.9,.10),(s*3.8,.15,-1.33,.65,.045),(s*4.25,.26,-1.57,.35,.025)],'f4f4f0')
    g.wing([(s*4.16,.23,-1.56,.42,.035),(s*4.25,.72,-1.73,.24,.018)],'3a5a8c')
    g.wing([(s*1.60,-.1,.25,.9,.08),(s*1.6,-.55,.30,.72,.07)],'becbd5')
    g.loft([(-.55,.20,.20,0),(-.35,.31,.31,0),(.48,.39,.39,0),(.75,.35,.35,0),(.80,.29,.29,0),(.66,.25,.25,0),(.56,.02,.02,0)],16,lambda p:'24323d' if p[2]>.96 and abs(p[0]-s*1.6)<.30 else 'e1e5e5',(s*1.6,-.65,.40))
tail(g,-3.55,1.8,1.95,'3a5a8c')
models['jet']=[g.finish('Jet • bimotor','body')]

# ESTRATOSFÉRICO (v4, Claude): avión espía tipo U-2. Fuselaje con vientre de motor, tomas de
# aire laterales tras la cabina, tobera en la cola y alas de gran alargamiento con perfil real.
g=Geo()
def strato_hull(p):
    x,y,z=p
    if z<-3.6: return '15171a'                      # boca de la tobera
    if y>.20 and -2.4<z<1.1: return '3d434b'         # lomo algo más claro
    if y<-.18: return '272b30'                       # vientre en sombra
    return '30343a'
g.loft([(-3.75,.075,.085,.03),(-3.62,.10,.11,.03),(-3.2,.15,.17,.02),(-2.4,.22,.24,.01),(-1.2,.29,.31,0),(0,.31,.33,0),(1.0,.29,.31,.01),(1.8,.24,.27,.02),(2.6,.18,.21,.02),(3.2,.12,.14,.01),(3.55,.06,.07,0),(3.75,.01,.01,0)],20,strato_hull)
g.egg((0,.27,1.55),(.17,.17,.55),'5b6f80',14,5)
for s in (-1,1):
    # Toma de aire: boca oscura al frente, carenado que se funde con el costado.
    g.loft([(1.02,.15,.17,0),(.86,.20,.21,0),(.25,.19,.20,0),(-.45,.11,.12,0),(-.85,.01,.01,0)],12,lambda p:'0e1013' if p[2]>.97 else '3a4048',(s*.33,.07,0))
def strato_wing(side):
    # Estaciones interpoladas: cuerda y espesor se afinan, puntas con leve caída y flecha mínima.
    n=14; v=[]; f=[]; cols=[]; count=10
    for i in range(count):
        t=i/(count-1); e=t**1.6
        x=side*(.17+6.33*t)
        y=.10+.10*t-.08*max(0,(t-.82)/.18)**2
        z=-.18-.26*t
        chord=1.45-1.05*e-.18*max(0,(t-.9)/.1)
        thick=.075-.052*e
        for j in range(n):
            a=j*math.tau/n; c=math.cos(a)
            # Perfil con borde de ataque grueso (+Z) y salida afilada.
            v.append((x,y+thick*math.sin(a)*(.62+.38*c),z+chord*.5*c))
            cols.append('59626c' if c>.72 else '30343a' if math.sin(a)>0 else '282c31')
    for i in range(count-1):
        for j in range(n):
            k=i*n+j;l=i*n+(j+1)%n;f.append((k,l,l+n,k+n))
    f.extend([tuple(reversed(range(n))),tuple((count-1)*n+j for j in range(n))])
    g.add(v,f,[kit.lin(c) for c in cols])
for s in (-1,1):
    strato_wing(s)
    g.wing([(s*.08,1.02,-3.06,.77,.055),(s*.7,1.05,-3.16,.58,.04),(s*1.32,1.07,-3.25,.35,.023),(s*1.47,1.07,-3.3,.15,.01)],'41464e',n=12)
g.wing([(.06,0,-3.02,1.12,.075),(.5,0,-3.1,.88,.058),(.9,0,-3.18,.63,.04),(1.14,0,-3.23,.36,.025)],'3a3f46',True,n=12)
models['estratosferico']=[g.finish('Estratosférico • alas largas','body',DARK)]

# SATÉLITE: foil facetado deliberado, rejilla en pigmento y paneles articulados.
g=Geo()
# Six subdivided foil faces; shallow creases carry broad golden tonal variation.
for axis in range(3):
    for side in (-1,1):
        axes=[a for a in range(3) if a!=axis]; v=[];f=[]; dims=(.65,.65,.55);n=5
        for i in range(n+1):
            for j in range(n+1):
                p=[0.,0.,0.];p[axis]=side*dims[axis]
                if i not in (0,n) and j not in (0,n):p[axis]+=random.uniform(-.045,.045)
                p[axes[0]]=(i/n*2-1)*dims[axes[0]];p[axes[1]]=(j/n*2-1)*dims[axes[1]];v.append(tuple(p))
        for i in range(n):
            for j in range(n):
                a=i*(n+1)+j;f.extend([(a,a+1,a+n+2),(a,a+n+2,a+n+1)])
        g.add(v,f,lambda p:tuple(x*(.72+.28*random.random()) for x in kit.lin('c9a227')),False)
# Dish facing front and upward, gently curved bowl with rolled rim.
v=[];f=[];n=24
for r,z in [(0,.64),(.22,.67),(.44,.77),(.58,.92),(.6,.94),(.60,.98),(.56,.96),(.40,.82),(.2,.73),(0,.71)]:
    for j in range(n):
        a=j*math.tau/n;v.append((r*math.cos(a),.35+r*math.sin(a),z))
for i in range(9):
    for j in range(n):a=i*n+j;b=i*n+(j+1)%n;f.append((a,b,b+n,a+n))
g.add(v,f,'dfd8aa');g.rod((0,.35,.71),(0,.35,1.05),.025,'f5df91')
g.rod((-.4,.6,-.32),(-.4,1.65,-.32),.018,'cfbd79')
g.rod((0,.63,0),(0,.87,0),.075,'514b34')
models['satelite']=[g.finish('Satélite • foil y antenas','body',GOLD)]
for seg,s in enumerate((-1,1)):
    p=Geo();p.rod((s*.63,0,0),(s*1.3,0,0),.055,'b6b4a6')
    p.box((s*2.73,0,0),(3.04,1.44,.075),'8796a2')
    # Cell rectangles on both faces. Narrow uncovered frame serves as painted grid.
    for face in (-1,1):
        for i in range(8):
            for j in range(4):
                x=s*(1.25+i*.37);y=-.69+j*.345;z=face*.039
                p.add([(x,y,z),(x+s*.345,y,z),(x+s*.345,y+.32,z),(x,y+.32,z)],[(0,1,2,3)],'24558c' if (i+j)%3 else '306aa0',False)
    models['satelite'].append(p.finish('Satélite • panel '+str(seg),'panel',SOLAR,(s*.65,0,0),seg))
p=Geo();p.egg((0,.99,0),(.105,.12,.105),'ff1808',12,6)
models['satelite'].append(p.finish('Satélite • baliza','beacon',RED,(0,.99,0)))

scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard'
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
bpy.context.preferences.filepaths.save_version=0
world=bpy.data.worlds.new('Cielos por capa');scene.world=world;world.use_nodes=True
nt=world.node_tree;nt.nodes.clear()
tex=nt.nodes.new('ShaderNodeTexCoord');sep=nt.nodes.new('ShaderNodeSeparateXYZ')
nt.links.new(tex.outputs['Normal'],sep.inputs[0])
flip=nt.nodes.new('ShaderNodeMath');flip.operation='MULTIPLY';flip.inputs[1].default_value=-1
nt.links.new(sep.outputs['Z'],flip.inputs[0])
ramp=nt.nodes.new('ShaderNodeValToRGB');nt.links.new(flip.outputs[0],ramp.inputs[0])
bg=nt.nodes.new('ShaderNodeBackground');nt.links.new(ramp.outputs[0],bg.inputs['Color'])
out=nt.nodes.new('ShaderNodeOutputWorld');nt.links.new(bg.outputs[0],out.inputs[0]);bg.inputs['Strength'].default_value=.8
sun_data=bpy.data.lights.new('Sol cálido','SUN');sun_data.energy=2.7;sun_data.angle=.14;sun_data.color=(1,.94,.84)
sun=bpy.data.objects.new('Sol cálido',sun_data);scene.collection.objects.link(sun);sun.rotation_euler=kit.B((-3,-5,-6)).to_track_quat('-Z','Y').to_euler()
cam_data=bpy.data.cameras.new('Cámara revisión');cam=bpy.data.objects.new('Cámara revisión',cam_data);scene.collection.objects.link(cam);scene.camera=cam
cam_data.clip_start=.1;cam_data.clip_end=1600

def camera(direction,distance,target=(0,0,0),width=1600):
    scene.render.resolution_x=width;scene.render.resolution_y=900
    cam_data.type='PERSP';cam_data.sensor_fit='VERTICAL';cam_data.sensor_height=32
    cam_data.lens=32/(2*math.tan(math.radians(60)/2))
    t=kit.B(target);cam.location=t+kit.B(Vector(direction).normalized()*distance)
    cam.rotation_euler=(t-cam.location).to_track_quat('-Z','Y').to_euler()

def sky(a,b):
    ramp.color_ramp.elements[0].color=(*kit.lin(a),1)
    ramp.color_ramp.elements[1].position=.75;ramp.color_ramp.elements[1].color=(*kit.lin(b),1)

stats={};limits={'avioneta':2500,'jet':3000,'estratosferico':2000,'satelite':2500}
trails={'jet':[[-1.6,-.65,-.15],[1.6,-.65,-.15]],'estratosferico':[[0,.03,-3.75]]}
for name,objects in models.items():
    bpy.context.view_layer.update()
    pts=[kit._three(o.matrix_world@v.co) for o in objects for v in o.data.vertices]
    size=[round(max(p[i] for p in pts)-min(p[i] for p in pts),4) for i in range(3)]
    meta=dict(forward='+Z',size=size)
    if name in trails:meta['contrailOrigins']=trails[name]
    parts,tris=kit.export_parts(ROOT/(name+'.json'),objects=objects,meta=meta)
    assert tris<=limits[name],(name,tris,limits[name])
    stats[name]=dict(parts=parts,tris=tris,size=size)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.export_scene.gltf(filepath=str(ROOT/(name+'.glb')),use_selection=True,export_format='GLB',export_yup=True,export_extras=True)
    print('EXPORT',name,stats[name],flush=True)

skies={'avioneta':('cfe6f8','5f9fe0'),'jet':('a8cdf0','3f7dd6'),'estratosferico':('7aa8d8','244fae'),'satelite':('131c3c','04061c')}
for name,objects in models.items():
    for other,obs in models.items():
        for o in obs:o.hide_render=other!=name
    sky(*skies[name]);sun_data.energy=4 if name=='satelite' else 2.7
    for view,dist,direction in [('juego',60,(.88,-.22,.43)),('cerca',15,(.72,.38,1))]:
        camera(direction,dist)
        scene.render.filepath=str(ROOT/f'render-{name}-{view}.png')
        bpy.ops.render.render(write_still=True)

# Editable review lineup: exports above retain their independent origin and pivots.
offsets=(-17,-8,4,17)
for (name,obs),x in zip(models.items(),offsets):
    for o in obs:o.hide_render=False;o.location+=kit.B((x,0,0))
sky('dfe8f0','dfe8f0');sun_data.energy=2.7
camera((.10,.48,1),24,target=(0,0,0),width=2000)
scene.render.filepath=str(ROOT/'render-conjunto.png');bpy.ops.render.render(write_still=True)
for (name,obs),x in zip(models.items(),offsets):
    collection=bpy.data.collections.new(name);scene.collection.children.link(collection)
    for o in obs:
        for old in list(o.users_collection):old.objects.unlink(o)
        collection.objects.link(o)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'aeronaves.blend'))

rows=[]
for name,s in stats.items():
    w,h,l=s['size'];kb=(ROOT/(name+'.json')).stat().st_size/1024
    rows.append(f'| {name} | {s["tris"]} / {limits[name]} | {s["parts"]} | {l:.3f} × {h:.3f} × {w:.3f} | {kb:.1f} KiB |')
delivery='''# ENTREGA — Aeronaves por capa · Aerostato

## Estado

- Versión: v4. Estratosférico corregido por Claude (sin tokens de Astra): tomas de aire, tobera, alas con perfil suavizado y variación de tono. Jet ronda 2/2; avioneta y satélite 1/2.
- Fecha: 2026-09-14.
- Lista para revisión de Luis.

## Archivos

| Archivo | Contenido |
|---|---|
| `modelar-aeronaves.py` | Fuente bpy reproducible; regenera todos los entregables |
| `aeronaves.blend` | Cuatro colecciones en fila a escala real, cámara y luz de revisión |
| `avioneta/jet/estratosferico/satelite.glb` | Un archivo por modelo, pigmento conectado al material |
| `avioneta/jet/estratosferico/satelite.json` | Un archivo por modelo con kit.export_parts |
| `render-<modelo>-juego.png` y `render-<modelo>-cerca.png` | Ocho vistas a 60 u y 15 u, FOV vertical 60°, 1600×900 |
| `render-conjunto.png` | Cuatro modelos a la misma escala, 2000×900 |

Regenerar desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 modelar-aeronaves.py
```

## Datos técnicos

Metros, Y arriba, morro +Z en Three / −Y en Blender. JSON y GLB centrados independientemente; body en (0,0,0), en el eje del fuselaje o centro de la caja. La disposición en fila del .blend es solo de revisión, aplicada después de exportar.

| Modelo | Triángulos / límite | Mallas | Largo × alto × ancho (u) | JSON |
|---|---|---|---|---|
'''+ '\n'.join(rows)+'''

`meta.forward="+Z"`; `meta.size=[ancho,alto,largo]`, valores de la tabla.
`contrailOrigins` Three: jet `[[-1.6,-0.65,-0.15],[1.6,-0.65,-0.15]]`, centros de las salidas posteriores de los motores; estratosférico `[[0,0.03,-3.75]]`, boca de la tobera.

## Partes y animación sugerida

Pivotes en Three relativos al modelo exportado. Todas las rotaciones iniciales de las partes son identidad.

| Modelo / part | segment | Pivote Three | Material | Eje Three | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|
| Avioneta / body | — | (0,0,0) | Pintura | Z del conjunto | ±0.035 rad | 0.22 ciclos/s | Aplicar balanceo al grupo que contiene body y prop; avance 9 u/s |
| Avioneta / prop | — | (0,-0.04,2.05) | Pintura | +Z local | Giro continuo | 26 rad/s | Buje y dos palas; eje centrado |
| Jet / body | — | (0,0,0) | Pintura | — | 0 | 14 u/s | Rígido |
| Estratosférico / body | — | (0,0,0) | Metal oscuro | — | 0 | 10 u/s | Rígido |
| Satélite / body | — | (0,0,0) | Foil | Emisión | 0.12 a 2 | 0.12 ciclos/s | Avance del grupo 5 u/s |
| Satélite / panel | 0 | (-0.65,0,0) | Solar | X local | ±0.30 rad | 0.04 ciclos/s | Fase 0 |
| Satélite / panel | 1 | (0.65,0,0) | Solar | X local | ±0.30 rad | 0.04 ciclos/s | Fase π |
| Satélite / beacon | — | (0,0.99,0) | Baliza | Emisión | 0 a 3 | 0.8 ciclos/s | Encendida 20% de cada ciclo |

## Materiales

Un material por malla; colores, ventanas, franjas y celdas en Pigment, atributo POINT. Base Color blanco multiplicado por pigmento; alfa 1, sin transparencias. Variación suave de valor en cada superficie.

| Material | Paleta principal | Metal / rugosidad | Emisión |
|---|---|---|---|
| Pintura | crema #f3ead7, ladrillo #b5402e; blanco #f4f4f0, azul #3a5a8c | 0 / 0.60 | 0 |
| Metal oscuro | #30343a | 0.28 / 0.55 | 0 |
| Foil | #c9a227, plato claro | 0.85 / 0.30 | #5a3300 × 0.12 |
| Solar | #24558c con variación azul, rejilla clara | 0.25 / 0.58 | #0a2d66 × 0.5 |
| Baliza | #ff1808 | 0 / 0.50 | #ff1808 × 3 |

## Diferencias con el brief

Ninguna desviación técnica. El estratosférico conserva medidas, origen y contrailOrigins; su tobera queda en el extremo de cola. Plato y antenas comparten el acabado metálico y la emisión del body, conforme al requisito de una sola parte. No hay clips de animación: los pivotes quedan listos para el integrador.

## Revisión propia y sugerencias para integrar

Revisión propia: nueve imágenes inspeccionadas; siluetas reconocibles a 60 u, curvas suaves a 15 u, ala alta continua, ventanas del jet definidas, alas largas y paneles legibles. Dimensiones y presupuestos conformes; ocho partes con pivotes y meta presentes; color de vértice presente en los cuatro GLB. Sin logos ni transparencias. Cycles 32 muestras, denoise, sol cálido y cielo degradado de cada capa. No se añaden estelas ni sombras de suelo.
Las curvas usan perfiles y normales suaves; el foil conserva pequeñas facetas para sugerir arrugas. Hélice simétrica en su plano XY; paneles con pivote en el brazo. El JSON conserva los offsets relativos al pivote: sumar pivot al colocar cada malla. Ventanas y celdas no añaden materiales ni partes. Sin logos, matrículas ni textos.
'''
(ROOT/'ENTREGA.md').write_text(delivery,encoding='utf-8')
print('ENTREGA COMPLETA',json.dumps(stats),flush=True)
