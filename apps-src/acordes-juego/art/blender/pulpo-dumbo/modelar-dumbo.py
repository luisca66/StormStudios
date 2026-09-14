"""Pulpo Dumbo / Batisfera. Reproducible bpy model; coordinates authored in Three space."""
import math, sys, json
from pathlib import Path
import bpy, bmesh
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parents[3]/'grados-mayores-juego'/'art'/'blender'))
import kit
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection,91)

def mat(name,emit=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value=(1,1,1,1)
    p.inputs['Roughness'].default_value=.46
    p.inputs['Metallic'].default_value=0
    p.inputs['Emission Color'].default_value=(*kit.lin('fff4f0'),1)
    p.inputs['Emission Strength'].default_value=emit
    vc=m.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Pigment'
    m.node_tree.links.new(vc.outputs['Color'],p.inputs['Base Color'])
    return m
SKIN=mat('Piel satinada melocoton');ARM=mat('Brazos coral / emision neutra 0.20',.20)

def pigment(p,edge=0,underside=0):
    x,y,z=p
    tone=.5+.22*math.sin(5*x+3*z)+.15*math.cos(6*y-2*x)
    c=Vector(kit.lin('c9837a')).lerp(Vector(kit.lin('e8b4a6')),tone)
    c=c.lerp(Vector(kit.lin('f9d4be')),min(.8,edge*.72))
    c=c.lerp(Vector(kit.lin('b86f79')),underside*.32)
    spots=math.sin(41*x+2*math.sin(17*z))*math.cos(37*z+3*math.sin(13*y))*math.sin(39*y)
    if spots>.66:c*=.73
    return tuple(c)

class Geo:
    def __init__(self):self.v=[];self.f=[];self.c=[]
    def add(self,v,f,c):
        off=len(self.v);self.v.extend(v);self.f.extend(tuple(i+off for i in face) for face in f)
        self.c.extend([kit.lin(c)]*len(v) if isinstance(c,str) else c)
    def ellipsoid(self,center,scale,color,n=16,rings=8,basis=None):
        v=[];f=[]
        basis=basis or Matrix.Identity(3)
        for i in range(rings+1):
            t=math.pi*i/rings
            for j in range(n):
                a=math.tau*j/n
                q=Vector((scale[0]*math.sin(t)*math.cos(a),scale[1]*math.cos(t),scale[2]*math.sin(t)*math.sin(a)))
                v.append(tuple(Vector(center)+basis@q))
        for i in range(rings):
            for j in range(n):k=i*n+j;l=i*n+(j+1)%n;f.append((k,l,l+n,k+n))
        self.add(v,f,color)
    def object(self,name,part,pivot=(0,0,0),material=SKIN,segment=None):
        ob=kit.make(name,[Vector(p)-Vector(pivot) for p in self.v],self.f,material,part=part,tint=0,smooth_angle=math.pi)
        ob.location=kit.B(pivot)
        if segment is not None:ob['segment']=segment
        c=ob.data.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='POINT')
        for i,col in enumerate(self.c):c.data[i].color=(*col,1)
        ob.data.color_attributes.active_color=c
        bm=bmesh.new();bm.from_mesh(ob.data)
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6)
        bad=[f for f in bm.faces if f.calc_area()<1e-12]
        if bad:bmesh.ops.delete(bm,geom=bad,context='FACES')
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
        bm.to_mesh(ob.data);bm.free()
        for f in ob.data.polygons:f.use_smooth=True
        ob.data.update()
        return ob

# Continuous pear/bell mantle: broad lower cheeks and a softly narrowing dome.
g=Geo();v=[];f=[];c=[];N=40;R=22
for i in range(R+1):
    t=math.pi*i/R;y=.75*math.cos(t)
    rx=.85*math.sin(t)*(1-.15*math.cos(t))
    rz=.67*math.sin(t)*(1-.08*math.cos(t))
    for j in range(N):
        a=math.tau*j/N
        fold=.008*math.sin(6*a+2*t)*math.sin(t)**3
        p=((rx+fold)*math.cos(a),y,(rz+fold)*math.sin(a)+.025*math.sin(t))
        v.append(p);c.append(pigment(p))
for i in range(R):
    for j in range(N):k=i*N+j;l=i*N+(j+1)%N;f.append((k,l,l+N,k+N))
g.add(v,f,c)
# Dark, non-human eyes embedded in fleshy side sockets; no eyebrows or smile.
for side in (-1,1):
    n=Vector((side*.66,0,-.75)).normalized();u=Vector((.75,0,side*.66)).normalized();up=Vector((0,1,0))
    basis=Matrix((u,up,n)).transposed()
    center=Vector((side*.64,-.20,-.43))-n*.04
    g.ellipsoid(center,(.225,.25,.095),'cb8d82',24,8,basis)
    g.ellipsoid(center+n*.075,(.161,.183,.058),'172328',24,8,basis)
    g.ellipsoid(center+n*.127+u*(-side*.035)+up*.058,(.024,.019,.006),'b7c7c8',8,4,basis)
body=g.object('Manto cabeza y ojos','body')

# Two fleshy paddle fins. Cross sections are flattened lenses, not planar fans.
for side in (-1,1):
    g=Geo();v=[];f=[];c=[];L=16;C=20
    pivot=(side*.64,.37,.04)
    across=Vector((side*.91,-.415,0))
    for i in range(L+1):
        t=i/L
        center=Vector((side*(.64+.46*t+.03*math.sin(math.pi*t)),.37+1.00*t,.04+.10*math.sin(math.pi*t)-.06*t))
        width=.045*(1-t)+.31*math.sin(math.pi*t)**.50
        thick=.025*(1-t)+.073*math.sin(math.pi*t)
        for j in range(C):
            a=math.tau*j/C
            q=center+across*(width*math.cos(a))+Vector((0,0,thick*math.sin(a)))
            q.z+=.018*math.sin(3*math.pi*t)*math.cos(a)**2
            p=tuple(q);v.append(p);c.append(pigment(p,abs(math.cos(a))**7*.9+t**6*.4))
    for i in range(L):
        for j in range(C):k=i*C+j;l=i*C+(j+1)%C;f.append((k,l,l+C,k+C))
    f.extend([tuple(reversed(range(C))),tuple(L*C+j for j in range(C))])
    g.add(v,f,c);g.object('Oreja izquierda' if side<0 else 'Oreja derecha','ear',pivot)

# Arms share a deep broad root with the umbrella. Segment 0 points toward -Z;
# increasing indices turn from -Z toward +X, around the Y axis.
def arm_center(t,a):
    r=.32+.86*t-.12*t**4
    y=-.42-.91*math.sin(t*math.pi/2)+.11*t**8
    return Vector((r*math.sin(a),y,-r*math.cos(a)))
def arm_radius(t):return .22*math.sqrt(max(0,1-t))

def arm_frame(t,a):
    tangent=(arm_center(min(1,t+.001),a)-arm_center(max(0,t-.001),a)).normalized()
    u=Vector((math.cos(a),0,math.sin(a)))
    w=tangent.cross(u).normalized()
    return u,w
for seg in range(8):
    a=seg*math.tau/8;g=Geo();v=[];f=[];c=[];L=18;C=12
    for i in range(L+1):
        t=i/L;center=arm_center(t,a);u,w=arm_frame(t,a)
        for j in range(C):
            b=j*math.tau/C;p=tuple(center+arm_radius(t)*(u*math.cos(b)+w*math.sin(b)))
            v.append(p);c.append(pigment(p,edge=t*.25,underside=max(0,-math.sin(b))))
    for i in range(L):
        for j in range(C):k=i*C+j;l=i*C+(j+1)%C;f.append((k,l,l+C,k+C))
    f.extend([tuple(reversed(range(C))),tuple(L*C+j for j in range(C))]);g.add(v,f,c)
    # Three small recessed sucker cups along the exposed inner distal surface.
    for t in (.64,.77,.88):
        u,w=arm_frame(t,a);inward=w
        center=arm_center(t,a)+inward*(arm_radius(t)*.93)
        tangent=u.cross(inward).normalized()
        verts=[];faces=[];colors=[]
        for radius,depth,col in [(.034,0,'efc7b3'),(.026,.014,'f9d9c2'),(.014,.010,'bb7e7b'),(.004,-.005,'a76569')]:
            for j in range(8):
                b=j*math.tau/8;verts.append(tuple(center+u*(radius*math.cos(b))+tangent*(radius*math.sin(b))+inward*depth));colors.append(kit.lin(col))
        for i in range(3):
            for j in range(8):k=i*8+j;l=i*8+(j+1)%8;faces.append((k,l,l+8,k+8))
        faces.append(tuple(24+j for j in range(8)));g.add(verts,faces,colors)
    g.object(f'Brazo {seg:02d}','arm',tuple(arm_center(0,a)),ARM,seg)

# Continuous double surface umbrella. Radial seams run inside the arm centerlines.
# A +/-.1 rad arm turn displaces the seam less than the arm's radius throughout.
g=Geo();v=[];f=[];c=[];N=96;R=6
for face in (-1,1):
    for i in range(R+1):
        s=i/R
        for j in range(N):
            a=math.tau*j/N
            scallop=(.5-.5*math.cos(8*a))
            t=s*(.58-.14*scallop)
            p=arm_center(t,a);p.y+=face*.015+.012*math.sin(16*a)*s*s
            v.append(tuple(p));c.append(pigment(p,edge=s**6,underside=.6 if face<0 else 0))
stride=(R+1)*N
for side in range(2):
    off=side*stride
    for i in range(R):
        for j in range(N):k=off+i*N+j;l=off+i*N+(j+1)%N;face=(k,l,l+N,k+N);f.append(face if side else tuple(reversed(face)))
for ring in (0,R):
    for j in range(N):k=ring*N+j;l=ring*N+(j+1)%N;f.append((k,l,l+stride,k+stride))
g.add(v,f,c);web=g.object('Membrana paraguas','web',(0,-.42,0))

meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
bpy.context.view_layer.update()
# Geometric overlap bound for any rotation axis at +/-.1 rad, including web thickness.
margin=min(arm_radius(t)*math.cos(math.pi/12)-.001-(2*(arm_center(t,0)-arm_center(0,0)).length*math.sin(.1/2)+.038) for t in [i*.58/100 for i in range(101)])
assert margin>0,margin
# Check actual polygonal seams against each rotated arm, including web scale pulse.
from mathutils.bvhtree import BVHTree
checked=0
for ob in meshes:
    if ob.get('part')!='arm':continue
    a=ob['segment']*math.tau/8
    tree=BVHTree.FromPolygons([v.co for v in ob.data.vertices],[list(p.vertices) for p in ob.data.polygons])
    for v in web.data.vertices:
        world=web.matrix_world@v.co;three=kit._three(world)
        angle=math.atan2(three[0],-three[2])
        if abs(math.atan2(math.sin(angle-a),math.cos(angle-a)))>1e-4 or three[1]>-.50:continue
        for axis in [(1,0,0),(0,1,0),(0,0,1),(math.cos(a),0,math.sin(a))]:
            for theta in (-.1,.1):
                for scale in (.99,1.01):
                    q=Vector((world.x*scale,world.y*scale,world.z))-ob.location
                    local=Matrix.Rotation(-theta,3,kit.B(axis))@q
                    near,normal,index,dist=tree.find_nearest(local)
                    assert (local-near).dot(normal)<1e-5,(ob.name,theta,scale)
                    checked+=1
parts,tris=kit.export_parts(ROOT/'pulpo-dumbo.json',meta=dict(forward='-Z',armOrder='0=-Z; increasing toward +X around Y',webPivot=[0,-.42,0]))
assert parts==12 and tris<=12000,(parts,tris)
points=[kit._three(o.matrix_world@v.co) for o in meshes for v in o.data.vertices]
dims=[max(p[i] for p in points)-min(p[i] for p in points) for i in range(3)]
assert dims[0]<=2.8 and dims[1]<=2.8,dims
assert sorted(o['segment'] for o in meshes if o['part']=='arm')==list(range(8))
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'pulpo-dumbo.glb'),export_format='GLB',use_selection=True,export_extras=True,export_animations=False)

scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True
scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
world=bpy.data.worlds.new('Abismo');world.use_nodes=True;scene.world=world
nt=world.node_tree;ambient=nt.nodes['Background'];ambient.inputs[0].default_value=(*kit.lin('050d18'),1);ambient.inputs[1].default_value=.08
bg=nt.nodes.new('ShaderNodeBackground');lp=nt.nodes.new('ShaderNodeLightPath');mix=nt.nodes.new('ShaderNodeMixShader')
nt.links.new(lp.outputs['Is Camera Ray'],mix.inputs[0]);nt.links.new(ambient.outputs[0],mix.inputs[1]);nt.links.new(bg.outputs[0],mix.inputs[2]);nt.links.new(mix.outputs[0],nt.nodes['World Output'].inputs[0])
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam
bpy.ops.object.light_add(type='SPOT');lamp=bpy.context.object
lamp.data.color=kit.lin('d6ecff');lamp.data.spot_size=math.radians(65);lamp.data.spot_blend=.65;lamp.data.shadow_soft_size=.65

def camera(pos,target,res,color):
    scene.render.resolution_x,scene.render.resolution_y=res
    cam.location=kit.B(pos);cam.rotation_euler=(kit.B(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='PERSP';cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24
    cam.data.lens=24/(2*math.tan(math.radians(30)));cam.data.clip_start=.1
    bg.inputs[0].default_value=(*kit.lin(color),1)
    lamp.location=cam.location;lamp.rotation_euler=cam.rotation_euler;lamp.data.energy=Vector(pos).length_squared*48
    bpy.context.view_layer.update()
    ys=[world_to_camera_view(scene,cam,o.matrix_world@v.co).y for o in meshes for v in o.data.vertices]
    return (max(ys)-min(ys))*100
DIRECTION=Vector((.38,.10,-1)).normalized()
GAME=DIRECTION*25;NEAR=DIRECTION*10
renders=[('render-juego.png',GAME,(0,0,0),(1600,900),'050d18'),('render-cerca.png',NEAR,(0,0,0),(1600,900),'050d18'),('render-perfil.png',(4.2,.05,0),(0,0,0),(1200,900),'0b2438'),('render-detalle.png',(2.1,-1.7,-3.2),(0,-.15,0),(1200,900),'050d18')]
coverage={}
for name,pos,target,res,color in renders:
    coverage[name]=camera(pos,target,res,color)
    if name=='render-cerca.png':
        assert abs(cam.location.length-10)<1e-5
        assert 22<=coverage[name]<=28,coverage
    scene.render.filepath=str(ROOT/name);bpy.ops.render.render(write_still=True)
camera(GAME,(0,0,0),(1600,900),'050d18');scene.render.filepath=str(ROOT/'render-juego.png')
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'pulpo-dumbo.blend'))

rows=[]
for o in meshes:
    p=o['part'];seg=o.get('segment','—');pivot=', '.join(f'{x:.3f}' for x in kit._three(o.location))
    if p=='body':axis='Y / escala XYZ';amp='±0.10 rad / ±2%';speed='0.08 / 0.25 ciclos/s';note='Giro en padre común; respiración local'
    elif p=='ear':axis='Z';amp='±0.32 rad';speed='0.38 ciclos/s';note='Signos opuestos; pivote en inserción'
    elif p=='web':axis='Escala XZ';amp='±1%';speed='0.30 ciclos/s';note='Sin traslación; pulso suave coordinado'
    else:axis='X y Z';amp='±0.10 rad total';speed='0.30 ciclos/s';note=f'Rotación radial: X={math.cos(seg*math.tau/8):.3f}·θ, Z={math.sin(seg*math.tau/8):.3f}·θ; fase {seg*math.pi/4:.3f} rad'
    rows.append(f'| {o.name} | {p} | {seg} | {pivot} | {o.data.materials[0].name} | {axis} | {amp} | {speed} | {note} |')
report=f'''# ENTREGA — Pulpo Dumbo · Batisfera

## Estado
- Versión / ronda: v1, entrega inicial
- Fecha: 2026-09-13
- Lista para: revisión de Luis

## Archivos
| Archivo | Contenido |
|---|---|
| `modelar-dumbo.py` | Fuente bpy reproducible que regenera todos los entregables |
| `pulpo-dumbo.blend` | Escena editable, cámara de juego y foco frío |
| `pulpo-dumbo.glb` | 12 mallas con pigmento por vértice y propiedades |
| `pulpo-dumbo.json` | Exportación compartida kit.export_parts, coordenadas Three |
| `render-juego.png`, `render-cerca.png`, `render-perfil.png`, `render-detalle.png` | Cycles 40 muestras, denoise |

Regenerar desde esta carpeta:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 modelar-dumbo.py
```

## Datos técnicos
| Dato | Valor |
|---|---|
| Tamaño total largo × alto × ancho | {dims[2]:.3f} × {dims[1]:.3f} × {dims[0]:.3f} u |
| Manto-cabeza sin ojos | ≈1.72 ancho × 1.50 alto u |
| Origen | Centro del manto-cabeza (0,0,0) |
| Frente | −Z Three, +Y Blender; brazos −Y Three, −Z Blender |
| Triángulos | {tris} |
| Mallas | {parts}: body, 2 ear, web, 8 arm |
| JSON | {(ROOT/'pulpo-dumbo.json').stat().st_size/1024:.1f} KiB |
| Meta | forward=-Z; webPivot=(0,-0.42,0); armOrder describe segment 0 frente −Z, luego hacia +X alrededor de Y |
| Cámara juego | 25.000 u del origen, FOV vertical 60°, near 0.1, 1600×900; altura proyectada {coverage['render-juego.png']:.2f}% |
| Cámara cerca | 10.000 u del origen, misma vista 3/4 frontal, FOV vertical 60°, 1600×900; altura proyectada {coverage['render-cerca.png']:.2f}% |
| Comprobación de uniones | {checked} muestras de la malla real dentro del brazo con giros extremos y pulso web |
| Solape web/brazos | Margen conservador mínimo {margin:.4f} u con giro ±0.1 rad sobre cualquier eje, descontando grosor/ondulación de membrana y pulso XZ de ±1% |

## Partes
| Objeto | part | segment | Pivote Three | Material | Eje Three | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
'''+ '\n'.join(rows)+'''

## Materiales
| Material | Color | Metal / rugosidad | Emisión | Alfa | Integración |
|---|---|---|---|---|---|
| Piel satinada | Blanco × Pigment; melocotón #e8b4a6 y coral #c9837a, bordes #f9d4be, motas oscuras | 0 / 0.46 | 0 | 1 | body, ear, web; vertexColors, sin texturas |
| Brazos | Pigment coral, interior rosado y ventosas crema | 0 / 0.46 | Neutra #fff4f0, 0.20 | 1 | Cada segment destella por separado; teñir emisión con familia |

## Diferencias con el brief
Ninguna desviación intencional de presupuesto, partes, ejes o cámaras. Se eligen ventosas discretas en lugar de cirros. Ojos y piel comparten rugosidad 0.46 para conservar un material por parte también en JSON. La emisión neutra afecta todo el brazo, incluidas sus ventosas.

## Revisión propia
Se revisaron visualmente los cuatro renders: orejas reconocibles en juego, curvas suaves a 10 u, pigmento variable, ojos oscuros sin rasgos humanos y cara inferior con ventosas. Se corrigieron las inserciones de brazos, orientación de ventosas y puntas antes de entregar. El script verifica presupuesto, dimensiones, segmentos, distancia de cámara y altura proyectada. La unión radial de la membrana entra en el volumen de cada brazo; el margen geométrico se calcula para todo el tramo unido con ±0.1 rad de giro.

## Sugerencias para integrar
Padre común en origen para el giro del conjunto. Orejas sobre Z con signos opuestos. Los brazos tienen pivotes independientes, segment 0 frente −Z y segment 2 hacia +X; el orden continúa hasta 7. Usar θ=0.10·sin(2π·0.30·t+fase) con la combinación X/Z de la tabla. Emisión idle 0.20; pulso sugerido hasta 2.4 durante 0.18 s por nota, color magenta #ff7fd0 o verde #7fffc8. La membrana pulsa solo ±1% en XZ para conservar el solape. Sin animaciones horneadas; modelo preparado para animación del integrador.
'''
(ROOT/'ENTREGA.md').write_text(report,encoding='utf-8')
print('EXPORT',parts,'partes',tris,'triangulos','DIMENSIONS largo alto ancho',dims[2],dims[1],dims[0],'COVERAGE',coverage,'OVERLAP',margin,flush=True)


