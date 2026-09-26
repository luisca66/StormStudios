"""Castillo de La Pradera. Geometría en coordenadas Three, metros, frente +Z."""
import bpy, sys, math, random, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
sys.dont_write_bytecode=True
sys.path.insert(0,str(ROOT.parents[3]/'grados-mayores-juego'/'art'/'blender'))
import kit
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection,71);rng=random.Random(71)
bpy.context.preferences.filepaths.save_version=0

def material(name,rough=.8):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(1,1,1,1);p.inputs['Roughness'].default_value=rough
    a=m.node_tree.nodes.new('ShaderNodeVertexColor');a.layer_name='Pigment';m.node_tree.links.new(a.outputs['Color'],p.inputs['Base Color'])
    return m
class Batch:
    def __init__(self,name,mat,pivot=(0,0,0),segment=None):self.name=name;self.mat=mat;self.pivot=pivot;self.segment=segment;self.v=[];self.f=[];self.c=[];self.soft=[]
    def add(self,geo,pos=(0,0,0),color='e2d3b3',rot=0,soft=False):
        v,f=geo;o=len(self.v);M=kit.T(pos,(0,rot,0));base=kit.lin(color);k=rng.uniform(.94,1.04)
        if soft:self.soft.extend(range(o,o+len(v)))
        for p in v:
            q=M@Vector(p);self.v.append(tuple(q));t=k+.025*math.sin(q.y*.9+q.x*.6+q.z*.4)
            self.c.append(tuple(min(1,max(0,c*t)) for c in base))
        self.f.extend(tuple(i+o for i in face) for face in f)
    def finish(self):
        ob=kit.make(self.name,[tuple(Vector(p)-Vector(self.pivot)) for p in self.v],self.f,self.mat,part='flag' if self.segment is not None else 'static',tint=0)
        ob.location=kit.B(self.pivot)
        if self.segment is not None:ob['segment']=self.segment
        a=ob.data.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='POINT')
        for d,c in zip(a.data,self.c):d.color=(*c,1)
        if self.soft:
            group=ob.vertex_groups.new(name='Bisel selectivo')
            group.add(self.soft,1.0,'REPLACE')
        return ob
stone=Batch('Piedra miel',material('Piedra cálida'));trim=Batch('Molduras y dovelas',stone.mat)
roof=Batch('Tejados esmaltados',material('Teja satinada',.55));wood=Batch('Carpintería',material('Madera',.85))
green=Batch('Hiedra',material('Hojas',.9));flowers=Batch('Flores y emblemas',material('Pigmentos',.72));dark=Batch('Ventanas y herrajes',material('Herrajes',.65))
batches=[stone,trim,roof,wood,green,flowers,dark];flags=[]
def box(b,p,s,c='e2d3b3',rot=0,soft=False):b.add(kit.g_box(*s),p,c,rot,soft=soft)
def lat(b,p,prof,c='e2d3b3',n=40):b.add(kit.g_lathe(prof,n),p,c)
def arch(b,p,r,spring,w,depth,c='e2d3b3',rot=0,n=20):
    for i in range(n):
        a=math.pi*i/n+.003;z=math.pi*(i+1)/n-.003
        pts=[(math.cos(a)*r,spring+math.sin(a)*r),(math.cos(z)*r,spring+math.sin(z)*r),(math.cos(z)*(r+w),spring+math.sin(z)*(r+w)),(math.cos(a)*(r+w),spring+math.sin(a)*(r+w))]
        b.add(kit.g_prism(pts,depth),p,c,rot)
    for sign in [-1,1]:
        v=kit.T(p,(0,rot,0))@Vector((sign*(r+w/2),spring/2,0));box(b,v,(w,spring,depth),c,rot)
def window(x,y,z,rot=0,scale=1):
    r=.48*scale;h=1.35*scale
    pts=[(-r,0),(r,0),(r,h)]+[(r*math.cos(i*math.pi/12),h+r*math.sin(i*math.pi/12)) for i in range(1,13)]
    dark.add(kit.g_prism(pts,.09),(x,y,z),'4a4a52',rot)
    # A continuous frame has no hidden side faces between individual voussoirs.
    # Keep 12 curve segments so the small arch silhouette stays smooth up close.
    inner=[(-r,0),(r,0)]+[(r*math.cos(i*math.pi/12),h+r*math.sin(i*math.pi/12)) for i in range(13)]
    outer=[(-r-.19*scale,0),(r+.19*scale,0)]+[((r+.19*scale)*math.cos(i*math.pi/12),h+(r+.19*scale)*math.sin(i*math.pi/12)) for i in range(13)]
    trim.add(kit.g_ring_prism(outer,inner,.28),(x,y,z),rot=rot)
    for dx in [-.24,.24]:
        p=kit.T((x,y,z),(0,rot,0))@Vector((dx*scale,.65*scale,.08));box(wood,p,(.35*scale,1.2*scale,.12),'8a5a3b',rot)
    p=kit.T((x,y,z),(0,rot,0))@Vector((0,-.08,.1));box(trim,p,(1.5*scale,.22,.55),rot=rot,soft=True)
def cone(x,z,y,r,h,col):
    # Curved bell eaves, successive overlapping courses, gently tapering cap.
    segments=40 if r>2 else 24
    for j in range(5):
        t=j/5;t2=(j+1)/5;rr=r*(1-t)**.86;rr2=max(.04,r*(1-t2)**.86)
        lat(roof,(x,0,z),[(rr*.96,y+h*t-.1),(rr+.14,y+h*t),(rr+.14,y+h*t+.12),(rr2,y+h*t2+.13)],col,segments)
    lat(flowers,(x,0,z),[(.01,y+h),(.22,y+h+.1),(.25,y+h+.3),(.1,y+h+.52),(.01,y+h+.58)],'ffd84d',16)
def flag(x,z,y,seg,col):
    lat(wood,(x,0,z),[(.085,y-1),(.085,y+2.5),(.01,y+2.6)],'8a5a3b',12)
    b=Batch('Banderín '+str(seg),flowers.mat,(x,y+2.3,z),seg)
    v=[];f=[]
    for i in range(13):
        t=i/12
        for j in range(3):v.append((x+t*2.8,y+2.3-j*.55*(1-.55*t),z+.25*math.sin(t*math.tau-.4)*t))
    for i in range(12):
        for j in range(2):a=i*3+j;f.append((a,a+3,a+4,a+1))
    b.add((v,f),color=col);flags.append(b)

# Main walls: outer surfaces exactly +/-20; no floor slab across the courtyard.
for x in [-19,19]:box(stone,(x,3,0),(2,6,40))
box(stone,(0,3,-19),(36,6,2))
for x in [-11.6,11.6]:box(stone,(x,3,19),(16.8,6,2))
# A full six-metre-wide, five-metre-high rectangle stays clear below the arch.
arch(trim,(0,0,19),3.2,5,.65,2.12,n=24)
for side in [-1,1]:
    pts=[(side*3.2,5),(side*3.2,9),(0,9),(0,8.2)]
    # Fill above the curved arch using individual radial-top panels.
for i in range(24):
    x0=-3.2+i*6.4/24;x1=-3.2+(i+1)*6.4/24
    y0=5+math.sqrt(max(0,3.2**2-x0*x0));y1=5+math.sqrt(max(0,3.2**2-x1*x1))
    stone.add(kit.g_prism([(x0,y0),(x1,y1),(x1,9),(x0,9)],2),(0,0,19))
for x in [-4.2,4.2]:box(stone,(x,4.5,19),(1.4,9,2.5))
box(trim,(0,9.05,19),(10,.4,2.8),soft=True)
for x in [-4,-2,0,2,4]:box(trim,(x,9.6,19),(1.1,.9,2.5),soft=True)
# Wall cornices, rounded crenels, restrained staggered ashlar accents.
for side in range(4):
    rot=side*math.pi/2
    for xx in range(-16,17,4):
        if side==0 and abs(xx)<6:continue
        p=kit.T(rot=(0,rot,0))@Vector((xx,6.45,19));box(trim,p,(1.65,.95,2.05),rot=rot,soft=True)
    for xx in [-11,11] if side==0 else [0]:
        p=kit.T(rot=(0,rot,0))@Vector((xx,5.8,19));box(trim,p,(14 if side==0 else 35,.3,2.2),rot=rot)
    for row in range(3):
        for xx in range(-16,17,4):
            if side==0 and abs(xx)<6:continue
            p=kit.T(rot=(0,rot,0))@Vector((xx+(row%2)*.8,1.1+row*1.45,20.015))
            box(trim,p,(1.3,.55,.1),rng.choice(['e2d3b3','b9a582','d4bf9c']),rot)
# Four corner towers, flared cornices and coloured curved roofs.
for k,(x,z) in enumerate([(-19,19),(19,19),(-19,-19),(19,-19)]):
    top=10 if z>0 else 11.2
    lat(stone,(x,0,z),[(0,0),(3.15,0),(3.15,.45),(3,.8),(2.85,1.1),(2.85,top-.8),(3.05,top-.5),(3.22,top-.2),(3.22,top+.2),(0,top+.2)])
    for yy in [1.1,top-1,top]:lat(trim,(x,0,z),[(2.84,yy),(3.03,yy+.08),(3.04,yy+.27),(2.85,yy+.38)],n=32)
    cone(x,z,top+.25,3.65,5.5,'d9534f' if k%2==0 else '4a7fc1')
    window(x,top-4,z+2.86)
    window(x+2.86,top-4,z,math.pi/2)
    if z>0:flag(x,z,top+5.9,k,'ffd84d' if k==0 else 'ff8fb1')
# Tall central keep, softened square base and a clustered storybook crown.
box(stone,(0,7.5,0),(10,15,10))
for yy in [.4,5,10,14.8]:box(trim,(0,yy,0),(10.4,.38,10.4),soft=True)
for x in [-4.65,4.65]:
    for z in [-4.65,4.65]:
        lat(stone,(x,0,z),[(.9,.3),(.82,1),(.72,14.5),(.95,15),(.95,16),(0,16)],n=24)
        cone(x,z,16,1.3,3.4,'d9534f')
cone(0,0,15.3,7.35,8.3,'4a7fc1');flag(0,0,24.2,2,'ffd84d')
for y in [6.4,11.1]:
    for x in [-2.5,0,2.5]:window(x,y,5.05,scale=1.1)
    for z in [-2.5,0,2.5]:window(5.05,y,z,math.pi/2,1.1);window(-5.05,y,z,-math.pi/2,1.1)
arch(trim,(0,0,5.12),1.65,2.8,.35,.4,n=18)
wood.add(kit.g_prism([(-1.6,0),(1.6,0),(1.6,2.8)]+[(1.6*math.cos(i*math.pi/18),2.8+1.6*math.sin(i*math.pi/18)) for i in range(1,19)],.14),(0,0,5.05),'8a5a3b')
for x in [-1,-.5,0,.5,1]:box(wood,(x,1.6,5.16),(.055,3.1,.06),'b9a582')
for x in [-.4,.4]:dark.add(kit.g_torus(.16,.045,16,6),(x,1.6,5.25),'4a4a52')
# A sunny medallion above the gateway, no text to localize.
flowers.add(kit.g_disc(.59,32)[:2],(0,8.65,20.12),'ffd84d')
for j in range(8):
    a=j*math.tau/8;flowers.add(kit.g_prism([(-.09,0),(.09,0),(0,.35)],.08),(math.sin(a)*.7,8.65+math.cos(a)*.7,20.15),'ffd84d',a)
# Flower boxes and climbing ivy along the gate shoulders and sunny wall.
for cx in [-10,10]:
    box(wood,(cx,5.65,20.25),(3,.45,.65),'8a5a3b')
    for j in range(9):
        x=cx-1.2+j*.3;y=6.05+.12*math.sin(j)
        lat(green,(x,0,20.25),[(.045,5.75),(.045,y+.2)],'4f9a3e',6)
        for q in range(5):
            a=q*math.tau/5;flowers.add(kit.g_disc(.13,8)[:2],(x+.16*math.cos(a),y+.16*math.sin(a),20.35),['ff8fb1','ffffff','b28dff'][j%3])
        flowers.add(kit.g_disc(.09,8)[:2],(x,y,20.37),'ffd84d')
# Organic wall ivy: smooth tapered stems and irregular, open leaf clusters.
# Closed six-sided tubes and ten-sided lenticular leaves keep the cost explicit:
# 2 main stems * 296 + 18 branches * 68 + 54 leaves * 20 = 2896 triangles.
# They replace 1536 triangles, giving 38140 total from Claude's 36780 baseline.
ivy_rng=random.Random(173)
def ivy_tube(points,radius):
    v=[];f=[];count=len(points)
    for i,p in enumerate(points):
        tangent=(Vector(points[min(i+1,count-1)])-Vector(points[max(0,i-1)])).normalized()
        side=Vector((-tangent.y,tangent.x,0)).normalized()
        normal=tangent.cross(side).normalized();r=radius*(1-.62*i/(count-1))
        for k in range(6):
            a=k*math.tau/6;v.append(tuple(Vector(p)+r*(side*math.cos(a)+normal*math.sin(a))))
    for i in range(count-1):
        for k in range(6):f.append((i*6+k,i*6+(k+1)%6,(i+1)*6+(k+1)%6,(i+1)*6+k))
    f.extend([tuple(reversed(range(6))),tuple((count-1)*6+k for k in range(6))])
    green.add((v,f),color='4f9a3e')
def ivy_leaf(base,length,angle,color):
    # Two shallow domes, not extruded blocks; curved highlights and a pointed tip.
    outline=[(0,0),(-.35,.12),(-.5,.38),(-.43,.63),(-.24,.73),(0,1),(.24,.73),(.43,.63),(.5,.38),(.35,.12)]
    axis=Vector((math.sin(angle),math.cos(angle),ivy_rng.uniform(-.08,.12))).normalized()
    side=Vector((math.cos(angle),-math.sin(angle),0));normal=side.cross(axis).normalized()
    v=[tuple(Vector(base)+length*(side*x+axis*y)) for x,y in outline]
    v.extend([tuple(Vector(base)+length*(axis*.46+normal*.11)),tuple(Vector(base)+length*(axis*.46-normal*.035))])
    f=[]
    for k in range(10):f.extend([(10,k,(k+1)%10),(11,(k+1)%10,k)])
    green.add((v,f),color=color)
for vine,cx in enumerate([-7,14]):
    phase=vine*1.35
    def stem(t):return Vector((cx+.24*math.sin(t*5.2+phase)+.12*math.sin(t*9+phase),.18+4.65*t,20.14+.035*math.sin(t*6+phase)))
    ivy_tube([stem(i/24) for i in range(25)],.048)
    for j in range(9):
        t=.07+j*.102+ivy_rng.uniform(-.016,.016);start=stem(t)
        sign=-1 if (j+vine)%2 else 1
        reach=ivy_rng.uniform(.36,.73);rise=ivy_rng.uniform(.19,.43)
        branch=[start+Vector((sign*reach*u,rise*u+.09*math.sin(math.pi*u),.025+.055*u)) for u in [i/5 for i in range(6)]]
        ivy_tube(branch,.025)
        for k in range(3):
            base=branch[3 if k==0 else 5]
            angle=sign*(.65+(k-1)*.72)+ivy_rng.uniform(-.17,.17)
            ivy_leaf(base,ivy_rng.uniform(.34,.57),angle,'8fcf5f' if (j+k)%3 else '4f9a3e')
# Interior stair tucked against left wall; approach and ring remain unobstructed.
for j in range(18):box(stone,(-16.9,(j+1)*.17,-12+j*.53),(2,(j+1)*.34,.56))
# Festive small pennants fixed to a wooden beam inside the gate.
box(wood,(0,8.75,17.8),(7,.09,.09),'8a5a3b')
for i in range(9):flowers.add(kit.g_prism([(-.25,0),(.25,0),(0,-.65)],.035),(-3.1+i*.78,8.7,17.8),['ffd84d','ff8fb1','b28dff','ffffff'][i%4])
objects=[b.finish() for b in batches+flags]
# Keep the original softened structural masonry. Trim bevels are restricted to
# crenels, sills and the keep/gateway ledges, not every edge of every arch/ring.
for ob in objects[:2]:
    bpy.context.view_layer.objects.active=ob
    mod=ob.modifiers.new('Bordes suaves','BEVEL');mod.width=.09
    if ob==objects[0]:
        mod.segments=2;mod.limit_method='ANGLE';mod.angle_limit=.8
    else:
        mod.segments=1;mod.limit_method='VGROUP';mod.vertex_group='Bisel selectivo'
    bpy.ops.object.modifier_apply(modifier=mod.name)
# Report actual tessellated geometry before spending time on AO/export/render.
preflight_tris=0
for ob in objects:
    ob.data.calc_loop_triangles()
    count=len(ob.data.loop_triangles);preflight_tris+=count
    print('PRESUPUESTO',ob.name,count,'triangulos',flush=True)
print('PRESUPUESTO TOTAL',preflight_tris,'triangulos',len(objects),'mallas',flush=True)
assert preflight_tris<=40000 and len(objects)<=20,(preflight_tris,len(objects))
pts=[kit._three(o.matrix_world@v.co) for o in objects for v in o.data.vertices]
dims=[max(p[i] for p in pts)-min(p[i] for p in pts) for i in range(3)]
meta=dict(forward='+Z',gateCenter=[0,0,19],gateClearWidth=6.4,gateClearHeight=5,wallOuterBounds=[-20,20],courtyardGroundY=0)
parts,tris,size=kit.export_glb(ROOT/'castillo-juego.glb',meta=meta,ao={'distance':3.0,'strength':.8},json_path=ROOT/'castillo.json')
assert tris<=40000 and parts<=20,(parts,tris)
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'castillo.glb'),export_format='GLB',use_selection=True,export_extras=True,export_animations=False)
print('EXPORT',parts,'partes',tris,'triangulos','DIMENSIONS',dims,flush=True)
# Review-only meadow and lighting. These are created after the two model exports.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1600;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
world=bpy.data.worlds.new('Cielo primavera');world.use_nodes=True;scene.world=world
world.node_tree.nodes['Background'].inputs[0].default_value=(*kit.lin('a8d8f0'),1);world.node_tree.nodes['Background'].inputs[1].default_value=.8
bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.name='Sol del nivel';sun.data.energy=2.3;sun.data.angle=.12;sun.data.color=kit.lin('fff1d0');sun.rotation_euler=(-kit.B((50,80,-30))).to_track_quat('-Z','Y').to_euler()
gm=bpy.data.materials.new('Pradera solo render');gm.diffuse_color=(*kit.lin('8fcf5f'),1)
bpy.ops.mesh.primitive_plane_add(size=2000,location=(0,0,-.03));ground=bpy.context.object;ground.name='Pradera SOLO RENDER';ground.data.materials.append(gm)
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24;cam.data.lens=24/(2*math.tan(math.pi/6));cam.data.clip_end=2500
def render(name,pos,target):
    cam.location=kit.B(pos);cam.rotation_euler=(kit.B(target)-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(ROOT/name);bpy.ops.render.render(write_still=True)
render('render-juego.png',(0,1.8,60),(0,10,0))
# Wider close view retains the tower finial/flag and its base in the frame.
cam.data.lens=24/(2*math.tan(math.radians(68)/2))
render('render-cerca.png',(31,10,30),(15,8.5,14))
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'castillo.blend'))
report=f'''# ENTREGA — Castillo de La Pradera · Walking AP Multi

## Estado
- Versión / ronda: v1-ronda1b
- Fecha: 2026-09-26
- Lista para: revisión

## Archivos
`modelar-castillo.py`, `castillo.blend`, `castillo.glb` (pigmento conectado), `castillo-juego.glb`, `castillo.json`, `render-juego.png`, `render-cerca.png`.

Regenerar desde esta carpeta:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 modelar-castillo.py
```

## Datos técnicos
| Dato | Valor |
|---|---|
| Dimensiones X × Y × Z (Three) | {dims[0]:.2f} × {dims[1]:.2f} × {dims[2]:.2f} m |
| Triángulos | {tris} |
| Mallas | {parts} |
| JSON / GLB juego | {(ROOT/'castillo.json').stat().st_size/1024:.1f} / {size/1024:.1f} KiB |
| Origen / frente | Centro de planta a suelo / +Z Three, −Y Blender |
| Muros | Exteriores ±20; 2 m grueso; 6 m alto más almenas |
| Torre central | 10 × 10 m; cuerpo 15 m |
| Puerta libre | 6.4 m ancho; rectángulo libre 5 m alto; arco llega a 8.2 m |
| AO | distance=3.0, strength=0.8 |

## Partes
| Objeto | part | segment | Pivote Three | Eje | Amplitud | Velocidad |
|---|---|---|---|---|---|---|
| Piedra miel, Molduras y dovelas, Tejados esmaltados, Carpintería, Hiedra, Flores y emblemas, Ventanas y herrajes | static | — | (0,0,0) | — | 0 | 0 |
| Banderín 0 | flag | 0 | (-19,18.2,19) | Y local | ±0.16 rad | 1.5 ciclos/s |
| Banderín 1 | flag | 1 | (19,18.2,19) | Y local | ±0.19 rad | 1.3 ciclos/s |
| Banderín 2 | flag | 2 | (0,26.5,0) | Y local | ±0.14 rad | 1.1 ciclos/s |

Animación sugerida: rotación Y = amplitud × sin(2π × frecuencia × tiempo + segment × 1.1). Tela con DoubleSide en juego y visor; los banderines pequeños del arco son estáticos.

## Materiales
Pigmento por vértice, metal 0, emisión 0, alfa 1. Piedra e2d3b3/b9a582 y tono intermedio d4bf9c, rugosidad .8; teja d9534f/4a7fc1, .55; madera 8a5a3b, .85; herrajes 4a4a52, .65; hojas 8fcf5f/4f9a3e, .9; flores y banderas ffd84d/ff8fb1/ffffff/b28dff, .72. Un material por malla.

## Meta
forward=+Z; gateCenter=(0,0,19); gateClearWidth=6.4; gateClearHeight=5; wallOuterBounds=(-20,20); courtyardGroundY=0. Unidades Three. Los metadatos de paso son informativos; no se incluyen colisionadores.

## Diferencias con el brief
- Puerta ensanchada de 6 a 6.4 m para dar holgura; mantiene íntegro el paso rectangular de 5 m bajo el arranque del arco.
- Torres en (±19,±19), radio del cuerpo 2.85 m y zócalo 3.15 m; tejados sobresalen hasta 3.79 m. Las dimensiones totales incluyen esos vuelos, no cambian la planta de muralla 40 × 40.
- La torre central tiene puerta decorativa cerrada: el espacio explorable solicitado es el patio. No hay hoja en la entrada de muralla.
- Escalera interior ornamental adosada al muro izquierdo, sin colisiones ni navegación incluidas. La pradera y las luces son solo de revisión, excluidas de los GLB.

## Revisión
Astra revisó render-juego.png y render-cerca.png de ronda 1, ejecutada por Claude: 36 780 triángulos, 10 mallas. La silueta, tejados de colores, banderas, volumen de torres y suavidad de piedra se leen bien. La hiedra se veía como bloques en zigzag: en ronda 1b se sustituye por dos tallos curvos, 18 ramas y 54 hojas abombadas en racimos abiertos, con variación de tamaño y orientación. La vista cercana cortaba el remate de la torre: FOV cercano ampliado a 68° y objetivo elevado a 8.5 m; cámara inicial sin cambios. Los nuevos renders deben comprobarse en la ejecución de Claude; esta revisión visual no los anticipa.
Recuento previsto por cambio de topología: 38 140 triángulos (margen 1 860). La tabla técnica de esta entrega contiene el recuento real de la ejecución que la genera. Se mantienen nombres, partes, pivotes, planta, puerta, dimensiones y paleta. Exportación con límites comprobados por el script. Cámara inicial (0,1.8,60), 40 m delante de la cara frontal, FOV vertical 60°, 1600 × 900; cámara cercana a 15.6 m de la esquina frontal derecha. La piedra de los renders recibe rebote verde de la pradera; valorar su calidez final con la luz del juego. La aprobación final corresponde a capturas del integrador con la luz real del nivel.
'''
(ROOT/'ENTREGA.md').write_text(report,encoding='utf-8')
