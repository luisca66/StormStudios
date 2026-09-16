"""Almeja flotante. Coordenadas de autoría Three: Y arriba, frente +Z."""
import bpy, bmesh, math, sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parents[3]/'grados-mayores-juego'/'art'/'blender'))
import kit
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection,19)
H=(0,0,-1.32)
def mix(a,b,t): return tuple(Vector(kit.lin(a)).lerp(Vector(kit.lin(b)),t))
def mat(name,rough,emission=0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(1,1,1,1)
    p.inputs['Roughness'].default_value=rough; p.inputs['Emission Strength'].default_value=emission
    p.inputs['Emission Color'].default_value=(1,1,1,1)
    a=m.node_tree.nodes.new('ShaderNodeVertexColor'); a.layer_name='Pigment'
    m.node_tree.links.new(a.outputs['Color'],p.inputs['Base Color']); return m
outer=mat('Caliza crema con costillas',.67); inner=mat('Nácar frío',.16)
flesh=mat('Manto turquesa y violeta',.32); pearlmat=mat('Perla blanca teñible',.05,1.2)
def obj(name,part,v,f,c,m,pivot=H):
    ob=kit.make(name,[tuple(Vector(p)-Vector(pivot)) for p in v],f,m,part=part,tint=0,smooth_angle=math.pi)
    ob.location=kit.B(pivot)
    a=ob.data.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='POINT')
    for i,col in enumerate(c): a.data[i].color=(*col,1)
    bm=bmesh.new(); bm.from_mesh(ob.data); bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces)); bm.to_mesh(ob.data); bm.free()
    return ob
N=80; R=8
def surface(r,a,sign,inside=False):
    # Smooth flutes and matching sinusoidal lip; no separate rib primitives.
    wave=math.cos(10*a); fade=(1+math.sin(a))*.5
    radial=1+.035*wave*r*r
    x=1.65*r*math.cos(a)*radial; z=1.32*r*math.sin(a)*radial
    seam=.115*wave*fade*r**3
    depth=(.84 if inside else 1.055)*math.sqrt(max(0,1-r*r))
    rib=0 if inside else .065*wave*r*math.sin(math.pi*r)
    y=seam+sign*(depth+rib+.014)
    return (x,y,z)
tops=[]
for sign,label in [(-1,'lower'),(1,'upper')]:
    for inside in (False,True):
        v=[]; f=[]; c=[]
        for i in range(R+1):
            r=math.sin(math.pi*.5*i/R)
            for j in range(N):
                a=j*math.tau/N; v.append(surface(r,a,sign,inside))
                if inside: col=mix('bcd9e6','fdf6ee',.25+.75*r)
                else:
                    t=.18+.32*(.5+.5*math.cos(10*a))+.06*math.sin(r*65)**2
                    t+=.06*math.sin(a*17+r*31)**6
                    col=mix('efdfc0','c9ad86',t)
                c.append(col)
        for i in range(R):
            for j in range(N):
                a=i*N+j; b=i*N+(j+1)%N; f.append((a,b,b+N,a+N))
        # Rolled lip closes each valve thickness into the inner surface.
        if not inside:
            start=len(v)
            for j in range(N):
                a=j*math.tau/N; p=surface(1,a,sign,True)
                v.append(p); c.append(kit.lin('efdfc0'))
            for j in range(N): f.append((R*N+j,R*N+(j+1)%N,start+(j+1)%N,start+j))
        part=('lining_' if inside else 'shell_')+label
        ob=obj(('Nácar ' if inside else 'Valva ')+label,part,v,f,c,inner if inside else outer)
        if sign==1: tops.append(ob)
# Plump continuous mantle follows the lower inner lip and includes a pearl cradle.
v=[];f=[];c=[]
for j in range(N):
    a=j*math.tau/N; p=Vector(surface(.91,a,-1,True))
    for k in range(10):
        b=k*math.tau/10
        v.append(tuple(p+Vector((.075*math.cos(a)*math.cos(b),.065*math.sin(b),.075*math.sin(a)*math.cos(b)))))
        c.append(mix('3fd2c7','8f7bd6',max(0,math.cos(b))**3))
for j in range(N):
    for k in range(10): f.append((j*10+k,((j+1)%N)*10+k,((j+1)%N)*10+(k+1)%10,j*10+(k+1)%10))
mantle=obj('Manto ondulado','mantle',v,f,c,flesh)
# Rounded hinge and cushion belong to the existing mantle object.
for pos,scale in [((0,-.02,-1.25),(.32,.24,.23)),((0,-.65,0),(.64,.19,.58))]:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=10,location=kit.B(pos))
    ob=bpy.context.object; ob.scale=(scale[0],scale[2],scale[1]);ob.data.materials.append(flesh)
    attr=ob.data.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='POINT')
    for d in attr.data:d.color=(*kit.lin('3fd2c7'),1)
    for p in ob.data.polygons:p.use_smooth=True
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);mantle.select_set(True)
    bpy.context.view_layer.objects.active=mantle;bpy.ops.object.join()
bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=20,radius=.5)
pearl=bpy.context.object; pearl.name='Perla'; pearl['part']='pearl'; pearl.data.materials.append(pearlmat)
for p in pearl.data.polygons:p.use_smooth=True
a=pearl.data.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='POINT')
for d in a.data:d.color=(*kit.lin('f6f2ea'),1)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
def pose(angle):
    for o in tops:o.rotation_euler.x=-angle
    bpy.context.view_layer.update()
pose(0)
parts,tris=kit.export_parts(ROOT/'almeja.json',meta=dict(forward='+Z',hinge=H,pearlCenter=(0,0,0),openingAxis='-X',openingAngle=.9))
assert parts==6 and tris<=9000,(parts,tris)
pts=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
dim=[max(p[i] for p in pts)-min(p[i] for p in pts) for i in range(3)]
assert dim[0]<=3.6 and dim[1]<=3.0
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'almeja.glb'),export_format='GLB',use_selection=True,export_extras=True,export_animations=False)
scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=40; scene.cycles.use_denoising=True
scene.render.resolution_percentage=100; scene.view_settings.view_transform='AgX'
w=bpy.data.worlds.new('Agua turquesa'); w.use_nodes=True; scene.world=w
w.node_tree.nodes['Background'].inputs[0].default_value=(*kit.lin('1f7a99'),1)
w.node_tree.nodes['Background'].inputs[1].default_value=.45
nt=w.node_tree; bg=nt.nodes.new('ShaderNodeBackground'); bg.inputs[0].default_value=(*kit.lin('1f7a99'),1)
lp=nt.nodes.new('ShaderNodeLightPath'); mx=nt.nodes.new('ShaderNodeMixShader')
nt.links.new(lp.outputs['Is Camera Ray'],mx.inputs[0]); nt.links.new(nt.nodes['Background'].outputs[0],mx.inputs[1]); nt.links.new(bg.outputs[0],mx.inputs[2]); nt.links.new(mx.outputs[0],nt.nodes['World Output'].inputs[0])
bpy.ops.object.light_add(type='SUN'); sun=bpy.context.object; sun.data.energy=2.5; sun.data.angle=.25
sun.data.color=kit.lin('fff3d6'); sun.rotation_euler=(.25,-.3,.3)
bpy.ops.object.light_add(type='AREA'); light=bpy.context.object; light.data.energy=350;light.data.shape='DISK';light.data.size=5
light.location=kit.B((1,3,4)); light.rotation_euler=(-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(); cam=bpy.context.object;scene.camera=cam
cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24;cam.data.lens=24/(2*math.tan(math.pi/6));cam.data.clip_start=.1
def render(name,pos,angle,res,target=(0,0,0)):
    pose(angle); cam.location=kit.B(pos);cam.rotation_euler=(kit.B(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.resolution_x,scene.render.resolution_y=res;scene.render.filepath=str(ROOT/name);bpy.ops.render.render(write_still=True)
direction=Vector((.4,.25,1)).normalized()
render('render-lejos.png',direction*35,0,(1600,900))
render('render-cerca.png',(3,2.6,4.1),.9,(1600,900),(0,.35,0))
render('render-cerrada.png',(3,2.4,4.1),0,(1200,900))
render('render-perfil.png',(5,1,.15),.45,(1200,900))
pose(0);bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'almeja.blend'))
report=f'''# ENTREGA — Almeja con perla · Walking AP Multi

## Estado

- Versión / ronda: v1, dos ajustes de revisión propia.
- Fecha: 2026-09-15.
- Lista para: revisión de Luis.

## Archivos

| Archivo | Contenido |
|---|---|
| `modelar-almeja.py` | Generador reproducible de toda la entrega. |
| `almeja.blend` | Escena editable, cerrada. |
| `almeja.glb` | Colores por vértice conectados a materiales; seis mallas. |
| `almeja.json` | kit.export_parts, geometría neutral cerrada. |
| `render-lejos.png`, `render-cerca.png`, `render-cerrada.png`, `render-perfil.png` | Cycles, 40 muestras, denoise. |

Regenerar desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 modelar-almeja.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Fondo × alto cerrado × ancho | {dim[1]:.3f} × {dim[2]:.3f} × {dim[0]:.3f} u |
| Origen | Centro de la perla, (0,0,0). |
| Frente | +Z Three, apertura hacia +Y. |
| Triángulos | {tris} |
| Mallas | {parts} |
| Peso JSON | {(ROOT/'almeja.json').stat().st_size/1024:.1f} KiB |
| Perla | Diámetro 1.000 u. |
| Meta | hinge=(0,0,−1.32); pearlCenter=(0,0,0); openingAxis=−X; openingAngle=0.9. |

## Partes

| Objeto / part | Pivote Three | Material | Eje | Amplitud | Velocidad sugerida |
|---|---|---|---|---|---|
| Valva inferior / shell_lower | (0,0,−1.32) | Exterior | — | Fija | 0 |
| Valva superior / shell_upper | (0,0,−1.32) | Exterior | X | 0 a −0.9 rad | 1.2 rad/s |
| Nácar inferior / lining_lower | (0,0,−1.32) | Interior | — | Fija | 0 |
| Nácar superior / lining_upper | (0,0,−1.32) | Interior | X | 0 a −0.9 rad | 1.2 rad/s, sincronizada con shell_upper |
| Manto / mantle | (0,0,−1.32) | Manto | Escala XYZ | ±4 % | 0.8 rad/s |
| Perla / pearl | (0,0,0) | Perla | — | Tinte y emisión | Transición 0.25 s |

## Materiales

| Material | Pigmento | Metal / rugosidad | Emisión | Alfa |
|---|---|---|---|---|
| Exterior | #efdfc0 / #c9ad86, costillas y crecimiento | 0 / 0.67 | 0 | 1 |
| Interior | #bcd9e6 → #fdf6ee | 0 / 0.16 | 0 | 1 |
| Manto | #3fd2c7 / #8f7bd6 | 0 / 0.32 | 0 | 1 |
| Perla | #f6f2ea | 0 / 0.05 | 1.2, blanco | 1 |

## Diferencias con el brief

Dos mallas adicionales (lining_lower y lining_upper) conservan la rugosidad nacarada en JSON sin mezclarla con el exterior mate. Se respeta el máximo de seis. Con bisagra trasera en −Z y frente +Z, abrir hacia +Y requiere rotación X negativa: −0.9 rad, magnitud solicitada 0.9. Rendija de 0.028 u entre bordes coincidentes. A 35 u la silueta se reconoce, pero el brillo de la rendija no destaca: necesita la baliza prevista del juego. Esta condición visual del brief no se considera plenamente satisfecha por el modelo aislado.

## Sugerencias para integrar

Sincronizar lining_upper con shell_upper. Teñir base y emisión de pearl con la nota; el resto no emite. Girar el conjunto Y a 0.15 rad/s y desplazarlo verticalmente ±0.12 u a 0.8 rad/s alrededor del centro de la perla. No hay animaciones horneadas. La luz de baliza distante corresponde al juego.
'''
(ROOT/'ENTREGA.md').write_text(report,encoding='utf-8')
print('EXPORT',parts,'partes',tris,'triangulos','DIMENSIONS fondo alto ancho',dim[1],dim[2],dim[0],flush=True)
