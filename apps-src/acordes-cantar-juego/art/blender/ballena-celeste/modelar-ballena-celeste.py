"""Gran Ballena Celeste. bpy 4.5; autoría Blender: Z arriba, hocico -Y.
Regenera exclusivamente los entregables junto a este archivo; sin dependencias del proyecto.
"""
from pathlib import Path
import math, random, json, struct
import bpy, bmesh
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parent
random.seed(13)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version = 0
TAU = math.tau
def lin(h):
    a=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in a)
def mix(a,b,t): return tuple(x*(1-t)+y*t for x,y in zip(a,b))
def clamp(v): return max(0,min(1,v))
def mat(name,rough=.5,metal=0,emission=None,strength=0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    p=m.node_tree.nodes['Principled BSDF'];p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    c=m.node_tree.nodes.new('ShaderNodeVertexColor');c.layer_name='Pigment'
    m.node_tree.links.new(c.outputs['Color'],p.inputs['Base Color'])
    if emission:
        p.inputs['Emission Color'].default_value=(*lin(emission),1);p.inputs['Emission Strength'].default_value=strength
    return m
MATS=[mat('Piel satinada',.5),mat('Latón remachado',.3,.85),mat('Cuero índigo cálido',.87),mat('Crestas celestes · pulso',.32,0,'5fe8d0',2.5),mat('Núcleo nacarado',.3,0,'c7fff1',2.5),mat('Farol babor rojo',.3,0,'ff463b',2.5),mat('Farol estribor verde',.3,0,'58ff9c',2.5),mat('Ojos obsidiana',.19)]

class Geo:
    def __init__(self):self.v=[];self.f=[];self.c=[];self.mi=[]
    def add(self,v,f,color,mi=0):
        off=len(self.v);self.v.extend(v);self.f.extend(tuple(off+i for i in face) for face in f)
        self.c.extend([lin(color)]*len(v) if isinstance(color,str) else color);self.mi.extend([mi]*len(f))
    def tube(self,path,r=.04,n=6,color='d8e4ee',mi=0,closed=False):
        v=[];f=[];N=len(path);prior=None
        for i,p in enumerate(path):
            t=(Vector(path[(i+1)%N if closed else min(i+1,N-1)])-Vector(path[(i-1)%N if closed else max(0,i-1)])).normalized()
            u=t.cross(Vector((0,0,1)) if abs(t.z)<.9 else Vector((0,1,0))).normalized() if prior is None else (prior-t*prior.dot(t)).normalized();w=t.cross(u);prior=u
            rr=r[i] if isinstance(r,list) else r
            for j in range(n):v.append(tuple(Vector(p)+rr*(u*math.cos(TAU*j/n)+w*math.sin(TAU*j/n))))
        for i in range(N if closed else N-1):
            for j in range(n):a=i*n+j;b=i*n+(j+1)%n;c=((i+1)%N)*n+(j+1)%n;d=((i+1)%N)*n+j;f.append((a,b,c,d))
        if not closed:f.extend([tuple(reversed(range(n))),tuple((N-1)*n+j for j in range(n))])
        self.add(v,f,color,mi)
    def egg(self,c,s,color,mi=0,n=12,rings=6):
        v=[];f=[]
        for i in range(rings+1):
            a=math.pi*i/rings
            for j in range(n):
                b=TAU*j/n;v.append((c[0]+s[0]*math.sin(a)*math.cos(b),c[1]+s[1]*math.sin(a)*math.sin(b),c[2]+s[2]*math.cos(a)))
        for i in range(rings):
            for j in range(n):a=i*n+j;b=i*n+(j+1)%n;f.append((a,b,b+n,a+n))
        self.add(v,f,color,mi)
    def object(self,name,pivot):
        mesh=bpy.data.meshes.new(name);mesh.from_pydata([tuple(Vector(v)-Vector(pivot)) for v in self.v],[],self.f);mesh.update()
        for m in MATS:mesh.materials.append(m)
        for p,mi in zip(mesh.polygons,self.mi):p.material_index=mi
        col=mesh.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='POINT')
        for d,c in zip(col.data,self.c):d.color=(*c,1)
        mesh.color_attributes.active_color=col
        bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
        bad=[f for f in bm.faces if f.calc_area()<1e-10]
        if bad:bmesh.ops.delete(bm,geom=bad,context='FACES')
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
        # Cristales (crestas y núcleo) con facetas planas; piel, latón y faroles suaves.
        for p,mi in zip(mesh.polygons,self.mi):p.use_smooth=mi not in (3,4)
        ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob);ob.location=pivot;ob['part']=name
        return ob

# Hermite cross sections: broad, depressed rostrum; full thorax; muscular narrowing tail.
PROFILE=[(-12,.02,.02,-.10),(-11.65,1.3,.50,-.08),(-10.8,2.2,.88,.0),(-9,2.7,1.55,0),(-6.5,3.05,2.65,0),(-3,3.1,3.35,0),(0,2.85,3.48,0),(3,2.3,2.9,.0),(6,1.45,1.85,.05),(8.5,.82,1.02,.04),(10.6,.50,.58,.0),(11.5,.30,.34,0)]
def section(y):
    idx=next((i for i in range(len(PROFILE)-1) if y<=PROFILE[i+1][0]),len(PROFILE)-2)
    a,b=PROFILE[idx:idx+2];t=clamp((y-a[0])/(b[0]-a[0]));out=[]
    for k in (1,2,3):
        prev=PROFILE[max(0,idx-1)];nxt=PROFILE[min(len(PROFILE)-1,idx+2)]
        m0=(b[k]-prev[k])/(b[0]-prev[0]);m1=(nxt[k]-a[k])/(nxt[0]-a[0]);d=b[0]-a[0]
        out.append((2*t**3-3*t*t+1)*a[k]+(t**3-2*t*t+t)*d*m0+(-2*t**3+3*t*t)*b[k]+(t**3-t*t)*d*m1)
    return out
def surface(y,a,offset=0):
    rx,rz,cz=section(y)
    # Pleats sculpted into ventral cross section, fade out along the belly.
    fold=.033*math.cos(a*22)*max(0,-math.sin(a))**4*math.sin(math.pi*clamp((y+11)/15))**2 if -11<y<4 else 0
    return ((rx+offset+fold)*math.cos(a),y,cz+(rz+offset+fold)*math.sin(a))
def pigment(p):
    x,y,z=p;rx,rz,cz=section(y);q=(z-cz)/max(.01,rz)
    t=clamp((-q-.02)/.70);t=t*t*(3-2*t)
    cloud=.5+.25*math.sin(y*.65+x*1.5+math.sin(z*1.8))+.25*math.sin(x*1.8-y*1.3+z*.6)
    dorsal=mix(lin('1f3563'),lin('3a5a94'),.18+.72*cloud)
    c=mix(dorsal,lin('d8e4ee'),t)
    spots=(math.sin(x*17+y*13+math.sin(z*7))*math.sin(y*22-z*14))
    if spots>.73:c=mix(c,lin('99b9d6'),.12*(1-t))
    return c
body=Geo();verts=[];faces=[]
N=54;S=40
for i in range(N+1):
    y=-12+23.5*i/N
    for j in range(S):verts.append(surface(y,TAU*j/S))
for i in range(N):
    for j in range(S):a=i*S+j;b=i*S+(j+1)%S;faces.append((a,b,b+S,a+S))
faces.extend([tuple(reversed(range(S))),tuple(N*S+j for j in range(S))])
body.add(verts,faces,[pigment(v) for v in verts])
# Long nacre throat pleats: flush slender ribbons, their grooves already sculpted in skin.
for j in range(13):
    angle=math.pi+(.24+(math.pi-.48)*j/12);v=[];f=[]
    for i in range(34):
        y=-10.9+13.2*i/33;a=angle+.045*math.sin(i/33*math.pi)
        width=.008*math.sin(math.pi*i/33)**.5+.001
        v.extend([surface(y,a-width,.012),surface(y,a+width,.012)])
        if i:f.append((2*i-2,2*i-1,2*i+1,2*i))
    body.add(v,f,'91acbe')
# Restrained mouth line, no smile: near-horizontal seam follows broad rostrum.
for sign in (-1,1):
    path=[]
    for i in range(38):
        y=-11.75+6.15*i/37;a=(-.15-.23*i/37) if sign==1 else math.pi+.15+.23*i/37
        path.append(surface(y,a,.026))
    body.tube(path,[.018+.018*math.sin(math.pi*i/37) for i in range(38)],6,'16283f')
    # Dark inset eye with fine orbital fold and muted iris, positioned on cheek.
    p=surface(-6.45, -.06 if sign==1 else math.pi+.06,.005)
    body.egg(p,(.075,.22,.14),'111d2b',0,12,6)
    body.egg((p[0]+sign*.064,p[1]-.025,p[2]),(.018,.068,.075),'6c9c9f',0,12,6)
    path=[(p[0]+sign*.025,p[1]+.29*math.cos(t),p[2]+.19*math.sin(t)) for t in [math.pi*i/14 for i in range(15)]]
    body.tube(path,.043,6,'45658a')
    for j in range(3):
        path=[surface(-9.5+j*.52+i*.07,(-.32 if sign==1 else math.pi+.32)+i*.025,.016) for i in range(9)]
        body.tube(path,.018,5,'99adbd')
# Small irregular barnacles embedded in rostrum, low relief.
for i in range(14):
    y=random.uniform(-10.6,-8);a=random.choice([.5,2.64])+random.uniform(-.23,.23);p=surface(y,a,.014);r=random.uniform(.06,.105)
    body.egg(p,(r,r*.85,r*.5),'a3b5c7',0,7,3)

# Thick hydrofoil lofts; section roots buried inside host with overlap for animation.
root_loops={}
def fin(g,sign,tail=False):
    v=[];f=[];loops=[];n=14;steps=24 if not tail else 20
    for i in range(steps+1):
        t=i/steps
        if not tail:
            x=sign*(1.90+6.60*t);yc=-3.8+4.5*t**1.4;zc=-.95-.90*math.sin(t*math.pi*.85)
            chord=(2.50*(1-t)**.64+.025);thick=.47*(1-t)**.7+.012
            bumps=.08*math.sin(t*math.pi*12)**2*math.sin(math.pi*t)
        else:
            x=sign*(.03+5.20*t);yc=11.0+.7*t+1.35*t*t;zc=.03+.16*math.sin(t*math.pi)
            chord=1.75*math.sin(math.pi*(.17+.83*t))**.7+.025;thick=.32*(1-t)**.6+.008;bumps=.10*math.sin(t*math.pi*7)**2
        ids=[]
        for j in range(n):
            a=TAU*j/n;c=math.cos(a);s=math.sin(a)
            p=(x,yc+chord*.5*c+(bumps if c<0 else -.035*math.sin(t*25)**2),zc+thick*s)
            ids.append(p);v.append(p)
        if i==0:loops=ids
    for i in range(steps):
        for j in range(n):a=i*n+j;b=i*n+(j+1)%n;f.append((a,b,b+n,a+n))
    f.extend([tuple(reversed(range(n))),tuple(steps*n+j for j in range(n))])
    colors=[]
    for i,p in enumerate(v):
        a=TAU*(i%n)/n;t=(i//n)/steps
        c=mix(lin('294c78'),lin('c6dce9'),clamp(-math.sin(a)*1.6+.1))
        c=mix(c,lin('86afc7'),.22*math.sin(t*27+p[1]*6)**6)
        colors.append(c)
    g.add(v,f,colors)
    return loops
parts=[]
for sign,name in [(-1,'Aleta_Pectoral_Izq'),(1,'Aleta_Pectoral_Der')]:
    g=Geo();root_loops[name]=fin(g,sign);parts.append(g.object(name,(sign*2.45,-3.8,-.95)))
tail=Geo();fin(tail,-1,True);fin(tail,1,True)
# A concealed muscular socket joins both flukes and buries its forward cap in peduncle.
tail.egg((0,10.75,0),(.44,.9,.40),'38597e',0,12,6)
root_loops['Aleta_Cola']=[(.30*math.cos(TAU*i/24),10.1,.28*math.sin(TAU*i/24)) for i in range(24)]
parts.append(tail.object('Aleta_Cola',(0,10.4,0)))

# Seven dimensional crystalline crests, embedded bases, bowed blade tips.
def crest(y,height,length,width,mi=3):
    v=[];f=[];cols=[];steps=6;n=8
    base=section(y)[1]-.20
    for i in range(steps+1):
        t=i/steps;factor=(1-t)**.65 if i<steps else .012
        for j in range(n):
            a=TAU*j/n;p=(width*factor*math.cos(a),y+length*.5*factor*math.sin(a)+.45*t,base+height*t)
            rx,rz,cz=section(p[1]);p=(p[0],p[1],cz+rz*math.sqrt(max(0,1-(p[0]/rx)**2))-.20+height*t)
            v.append(p);cols.append(mix(lin('1f3563'),lin('33507f'),t) if mi==0 else mix(lin('245e72'),lin('a9ffdf'),t**.6))  # dorsal con piel
    for i in range(steps):
        for j in range(n):a=i*n+j;b=i*n+(j+1)%n;f.append((a,b,b+n,a+n))
    body.add(v,f,cols,mi)
    if mi==3:
        # An inlaid luminous spine remains part of the same rigid mesh.
        path=[]
        for i in range(1,7):
            t=i/6;factor=(1-t)**.65 if i<6 else .012;py=y-length*.5*factor+.45*t
            rx,rz,cz=section(py);path.append((0,py,cz+rz-.20+height*t))
        body.tube(path,[.030,.035,.035,.027,.018,.005],5,'c7fff1',4)
# v4 (Claude, 2026-09-15): las crestas eran cuchillas planas tipo estegosaurio. Ahora cada placa es
# un racimo de cristales hexagonales que nace hundido en el lomo: núcleo nacarado alto al centro y
# tres cristales turquesa inclinados hacia fuera y atrás, de mayor a menor hacia la cola.
def crystal(base,axis,height,radius,mi,twist):
    axis=Vector(axis).normalized();u=axis.cross(Vector((1,0,0))).normalized();w=axis.cross(u)
    v=[];f=[];cols=[];n=6
    rings=[(-.28,1.0),(.62,.92),(.80,.55)]
    for k,(t,rf) in enumerate(rings):
        for j in range(n):
            a=TAU*j/n+twist;r=radius*rf*(1+.10*math.sin(3*a+twist*5))
            p=Vector(base)+axis*height*t+(u*math.cos(a)+w*math.sin(a))*r
            v.append(tuple(p))
    v.append(tuple(Vector(base)+axis*height))
    for k in range(len(rings)-1):
        for j in range(n):a=k*n+j;b=k*n+(j+1)%n;f.append((a,b,b+n,a+n))
    top=len(v)-1;last=(len(rings)-1)*n
    for j in range(n):f.append((last+j,last+(j+1)%n,top))
    f.append(tuple(reversed(range(n))))
    root,tip=('245e72','a9ffdf') if mi==3 else ('9fe8dc','f4fffb')
    for i,p in enumerate(v):
        t=1.0 if i==top else max(0,rings[i//n][0])
        cols.append(mix(lin(root),lin(tip),clamp(t)**.7))
    body.add(v,f,cols,mi)
def crest_cluster(y,height,radius):
    rx,rz,cz=section(y);top=cz+rz
    body_base=(0,y,top-.22)
    crystal(body_base,(0,.18,1),height,radius*.62,4,.3)
    for k,(sx,sy) in enumerate(((-1,.1),(1,.1),(0,.85))):
        lean=(sx*.55,.35+sy*.5,1)
        base=(sx*radius*.75,y+sy*radius*.9,top-.2-abs(sx)*.02)
        crystal(base,lean,height*(.66 if sy<.5 else .5),radius*.55,3,k*1.1+y)
for y,h in [(-5.1,1.25),(-3.2,1.12),(1.7,1.0),(3.5,.9),(5.2,.78),(6.75,.66),(8.1,.55)]:crest_cluster(y,h,.42*h+.12)
crest(6.15,1.40,2,.32,0)

# One fitted cinch. Elliptical ribbon samples actual body, rather than a torus approximation.
v=[];f=[]
for i in range(4):
    y=-.48+.96*i/3
    for j in range(64):v.append(surface(y,TAU*j/64,.035))
for i in range(3):
    for j in range(64):a=i*64+j;b=i*64+(j+1)%64;f.append((a,b,b+64,a+64))
body.add(v,f,'473932',2)
for y in (-.46,.46):body.tube([surface(y,TAU*j/64,.06) for j in range(64)],.032,4,'bfa06a',1,True)
# Dorsal saddle: curved brass surface fixed to cinch, riveted corners.
v=[];f=[]
for i in range(5):
    y=-.37+.74*i/4
    for j in range(13):v.append(surface(y,math.pi/2-.27+.54*j/12,.09))
for i in range(4):
    for j in range(12):a=i*13+j;f.append((a,a+1,a+14,a+13))
body.add(v,f,'b99a56',1)
for y in (-.29,.29):
    for a in (math.pi/2-.20,math.pi/2+.20):body.egg(surface(y,a,.12),(.072,.072,.048),'efd292',1,8,4)
# Ring centre EXACTLY (0,0,4.2) Blender -> (0,4.2,0) Three. Plane XZ.
RING=(0,0,4.2)
body.tube([( .51*math.cos(TAU*i/48),0,4.2+.51*math.sin(TAU*i/48)) for i in range(48)],.105,10,'c4a05e',1,True)
for x in (-.25,.25):body.tube([(x,0,3.54),(x,0,3.72)],.115,10,'a98b50',1)
# Lateral buckle / securely mounted navigation lights, no hanging unsupported pieces.
for sign in (-1,1):
    x=sign*2.89
    body.tube([(x,-.34,-.31),(x,-.34,.31),(x,.34,.31),(x,.34,-.31)],.065,8,'d5b676',1,True)
    body.tube([(x,0,-.03),(sign*3.18,0,-.03)],.11,8,'bda069',1)
    cx=sign*3.22
    body.egg((cx,0,-.03),(.21,.21,.33),'73dfb4' if sign==1 else 'e96856',6 if sign==1 else 5,12,6)
    for z in (-.38,.32):
        body.tube([(cx+.235*math.cos(TAU*i/16),.235*math.sin(TAU*i/16),z) for i in range(16)],.045,6,'c5a369',1,True)
    for a in (0,math.pi/2,math.pi,3*math.pi/2):body.tube([(cx+.23*math.cos(a),.23*math.sin(a),-.38),(cx+.23*math.cos(a),.23*math.sin(a),.32)],.029,5,'c5a369',1)
central=body.object('Ballena_Cuerpo_Central',(0,0,0));parts.insert(0,central)
for ob in parts[1:]:ob.parent=central
central['forward']='+Z';central['mooringRing_Three']=[0,4.2,0];central['crestCount']=7;central['crestStyle']='cristales v4'

# Geometry verification, independent of rendering and game integration.
def three(v):return (round(v[0],4),round(v[2],4),round(-v[1],4))
triangles=0;counts={}
for ob in parts:
    ob.data.calc_loop_triangles();counts[ob.name]=len(ob.data.loop_triangles);triangles+=counts[ob.name]
    assert all(abs(a)<1e-9 for a in ob.rotation_euler)
assert triangles<=16000,(triangles,counts)
assert len(parts)==4 and three(RING)==(0,4.2,0)
bpy.context.view_layer.update()
points=[ob.matrix_local@v.co for ob in parts for v in ob.data.vertices]
lo=[min(p[k] for p in points) for k in range(3)];hi=[max(p[k] for p in points) for k in range(3)]
dims=(hi[1]-lo[1],hi[2]-lo[2],hi[0]-lo[0]);assert 23.4<=dims[0]<=28.6 and 16<=dims[2]<=18
# Use actual body surface only; test hidden root rings throughout +/-0.2 rad.
shell=BVHTree.FromPolygons(verts,[tuple(reversed(f)) for f in faces],all_triangles=False)
min_depth=100;sample_count=0
for ob in parts[1:]:
    axis='X' if ob.name=='Aleta_Cola' else 'Y'
    for step in range(21):
        rot=Matrix.Rotation(-.2+.4*step/20,3,axis)
        for p in root_loops[ob.name]:
            q=Vector(ob.location)+rot@(Vector(p)-ob.location)
            hit,n,idx,dist=shell.find_nearest(q)
            assert (q-hit).dot(n)<0,(ob.name,step,tuple(q))
            min_depth=min(min_depth,dist);sample_count+=1
print('MODEL',triangles,'triangles',len(parts),'meshes','dimensions L/H/W',dims,'root depth',min_depth,flush=True)

scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.view_settings.view_transform='AgX';scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Cielo borde del espacio');scene.world.use_nodes=True
nt=scene.world.node_tree;nt.nodes.clear();out=nt.nodes.new('ShaderNodeOutputWorld')
bg=nt.nodes.new('ShaderNodeBackground');bg.inputs['Strength'].default_value=1
tex=nt.nodes.new('ShaderNodeTexCoord');sep=nt.nodes.new('ShaderNodeSeparateXYZ');nt.links.new(tex.outputs['Normal'],sep.inputs[0])
ramp=nt.nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=0;ramp.color_ramp.elements[0].color=(*lin('131c3c'),1);ramp.color_ramp.elements[1].position=1;ramp.color_ramp.elements[1].color=(*lin('04061c'),1)
nt.links.new(sep.outputs['Z'],ramp.inputs[0]);nt.links.new(ramp.outputs[0],bg.inputs['Color'])
ambient=nt.nodes.new('ShaderNodeBackground');ambient.inputs['Color'].default_value=(.55,.67,1,1);ambient.inputs['Strength'].default_value=.4
lp=nt.nodes.new('ShaderNodeLightPath');mixsh=nt.nodes.new('ShaderNodeMixShader');nt.links.new(lp.outputs['Is Camera Ray'],mixsh.inputs[0]);nt.links.new(ambient.outputs[0],mixsh.inputs[1]);nt.links.new(bg.outputs[0],mixsh.inputs[2]);nt.links.new(mixsh.outputs[0],out.inputs[0])
bpy.ops.object.light_add(type='SUN',location=(0,-10,15));sun=bpy.context.object;sun.name='Sol blanco 1.6';sun.data.energy=1.6;sun.rotation_euler=(.35,-.5,-.5);sun.data.angle=.12
# Camera only and illumination excluded from GLB.
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.clip_start=.1;cam.data.clip_end=1600;cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24;cam.data.lens=24/(2*math.tan(math.radians(60)/2))
scene.use_nodes=True;cn=scene.node_tree;cn.nodes.clear();rl=cn.nodes.new('CompositorNodeRLayers');gl=cn.nodes.new('CompositorNodeGlare');gl.glare_type='FOG_GLOW';gl.quality='HIGH';gl.threshold=1.5;gl.mix=-.94;co=cn.nodes.new('CompositorNodeComposite');cn.links.new(rl.outputs['Image'],gl.inputs['Image']);cn.links.new(gl.outputs['Image'],co.inputs['Image'])
def camera(position,target,ortho=None):
    cam.location=position;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO' if ortho else 'PERSP'
    if ortho:cam.data.ortho_scale=ortho
def shot(name,pos,target,size=(1600,900),ortho=None):
    camera(pos,target,ortho);scene.render.resolution_x,scene.render.resolution_y=size;scene.render.filepath=str(ROOT/name);bpy.ops.render.render(write_still=True)

bpy.ops.object.select_all(action='DESELECT')
for ob in parts:ob.select_set(True)
bpy.context.view_layer.objects.active=central
bpy.ops.export_scene.gltf(filepath=str(ROOT/'ballena-celeste.glb'),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_materials='EXPORT',export_normals=True,export_animations=False)
# Inspect emitted GLB contract, vertex pigment, emission and node transforms.
blob=(ROOT/'ballena-celeste.glb').read_bytes();length=struct.unpack_from('<I',blob,12)[0];gltf=json.loads(blob[20:20+length])
for name in counts:assert any(n.get('name')==name for n in gltf['nodes'])
assert len(gltf['meshes'])==4
assert sum(len(m['primitives']) for m in gltf['meshes'])<=10
assert sum(gltf['accessors'][p['indices']]['count']//3 for m in gltf['meshes'] for p in m['primitives'])==triangles
for m in gltf['meshes']:
    for p in m['primitives']:assert 'COLOR_0' in p['attributes']
assert any('emissiveFactor' in m for m in gltf['materials'])
for n in gltf['nodes']:
    if n.get('name') in counts:assert n.get('rotation',[0,0,0,1])==[0,0,0,1]

direction=Vector((.84,-.52,-.13)).normalized();gamepos=direction*40
camera(gamepos,(0,0,0));scene.render.resolution_x=1600;scene.render.resolution_y=900
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'ballena-celeste.blend'))
shot('render-juego.png',gamepos,(0,0,0))
head=Vector((0,-8,0));shot('render-cerca.png',head+Vector((.78,-.61,-.13)).normalized()*15,head)
ramp.color_ramp.elements[0].color=(*lin('2a3b66'),1);ramp.color_ramp.elements[1].color=(*lin('2a3b66'),1)
shot('render-perfil.png',(40,0,1),(0,0,1),ortho=18)
ramp.color_ramp.elements[0].color=(*lin('131c3c'),1);ramp.color_ramp.elements[1].color=(*lin('04061c'),1)
shot('render-arnes.png',(6,-5,7),(0,0,2.3),(1200,900))
shot('render-cenital.png',(0,0,40),(0,0,0),(1600,900),ortho=32)

rows=[]
for ob in parts:
    name=ob.name;axis='—' if ob==central else ('X' if name=='Aleta_Cola' else 'Z')
    rows.append(f'| {name} | {name} | — | {three(ob.location)} | Varios / pigmento | {axis} | '+('0' if ob==central else '±0.16 rad')+' | '+('0' if ob==central else '0.12 ciclos/s' if name=='Aleta_Cola' else '0.10 ciclos/s')+' | '+('Rígido; anillo, 7 crestas y arnés incluidos' if ob==central else 'Cola, desfase π/2' if name=='Aleta_Cola' else 'En espejo; izquierda fase 0, derecha π')+' |')
delivery=f'''# ENTREGA — Gran Ballena Celeste · Aerostato

## Estado
- Versión / ronda: v4. Rondas de Astra agotadas (2/2); crestas rehechas por Claude el 2026-09-15.
- Fecha: 2026-09-15.
- Lista para: revisión de Luis.

## Archivos
| Archivo | Contenido |
|---|---|
| `modelar-ballena-celeste.py` | Generador bpy reproducible, incluye comprobaciones geométricas |
| `ballena-celeste.blend` | Escena editable y cámara de juego |
| `ballena-celeste.glb` | Cuatro mallas glTF, diez primitivas de material y pigmento por vértice |
| `render-juego.png`, `render-cerca.png`, `render-perfil.png`, `render-arnes.png`, `render-cenital.png` | Cinco vistas Cycles, 40 muestras y denoise |

Regenerar desde esta carpeta:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 modelar-ballena-celeste.py
```

## Datos técnicos
| Dato | Valor |
|---|---|
| Dimensiones largo × alto total × ancho | {dims[0]:.3f} × {dims[1]:.3f} × {dims[2]:.3f} u |
| Altura del cuerpo sin crestas | 6.96 u aproximadamente |
| Origen | (0, 0, 0), bajo el anillo |
| Frente | +Z Three / −Y Blender |
| Triángulos | {triangles} |
| Mallas | 4; varias primitivas de material dentro del cuerpo |
| GLB | {len(blob)/1024:.1f} KiB |
| Punto de amarre | (0, 4.2, 0) Three, propiedad extra `mooringRing_Three` del cuerpo |

Triángulos por objeto: {', '.join(f'{k}: {v}' for k,v in counts.items())}.

## Partes
| Objeto | part | segment | Pivote (Three) | Material | Eje (Three) | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
{chr(10).join(rows)}

Las rotaciones iniciales son identidad, escalas unitarias. Pectorales y cola son hijas del cuerpo. Los pivotes están dentro de las uniones musculares; las raíces se prolongan dentro de la piel.

## Materiales
| Material | Color | Metal / rugosidad | Emisión | Alfa | Integración |
|---|---|---|---|---|---|
| Piel satinada | #1f3563 → #3a5a94; vientre #d8e4ee | 0 / 0.5 | 0 | 1 | COLOR_0 conectado a Base Color |
| Latón remachado | #c4a05e | 0.85 / 0.3 | 0 | 1 | Anillo, montura y herrajes |
| Cuero | #473932 | 0 / 0.87 | 0 | 1 | Una cincha ajustada |
| Crestas celestes · pulso | Raíz #245e72 → punta #a9ffdf | 0 / 0.32 | #5fe8d0 × 2.5 | 1 | Tres cristales turquesa por cresta, facetas planas, un material compartido |
| Núcleo nacarado | #c7fff1 | 0 / 0.3 | #c7fff1 × 2.5 | 1 | Cristal central alto de cada cresta, facetas planas |
| Faroles | Rojo babor / verde estribor | 0 / 0.3 | #ff463b / #58ff9c × 2.5 | 1 | Fijos a la cincha, jaula de latón |
| Ojos | #111d2b | 0 / 0.5 | 0 | 1 | Comparten piel; ojos pequeños, sin sonrisa |

## Comprobaciones del generador
- Presupuesto, nombres, dimensiones, rotaciones identidad y centro del anillo mediante aserciones.
- {sample_count} muestras de raíces a lo largo de ±0.2 rad; profundidad mínima dentro de la piel: {min_depth:.4f} u. Pectorales: Y Blender / Z Three; cola: X en ambos.
- Contrato del GLB leído después de exportar: nombres, COLOR_0 en cada primitiva y emisión conservados.
- Cámara de juego a 40 u del origen, FOV vertical 60°; cercana a 15 u de (0, 0, 8) Three. Perfil y cenital ortográficos.
- Renders Cycles 40 muestras, denoise, sol 1.6 y ambiental 0.4. No se exportan luces, cámara ni sombras.

## Diferencias con el brief
Sin JSON, conforme al encargo específico de GLB. El BRIEF.md original se conserva como documento fuente. Las siete crestas comparten material: admiten pulso simultáneo, no individual. Los ojos comparten el acabado satinado de la piel para limitar el GLB a diez primitivas de material. La geometría rígida contiene componentes solapados e integrados visualmente, no es una única superficie soldada.

## Revisión propia
Se revisan los cinco renders: silueta completa de rorcual, garganta con surcos, aletas de espesor real, cola horizontal bilobulada, siete crestas y dorsal menor. Corrección 1: pigmento menos contrastado, aro con sección continua, crestas ajustadas al lomo y encuadres de perfil/arnés más próximos. Las cicatrices y percebes quedan discretos. Corrección 2: nervaduras luminosas ajustadas a las crestas, sin puntas sobresalientes. v4 (Claude): las cuchillas planas se leían como placas de estegosaurio; cada cresta es ahora un racimo de cristales hexagonales hundido en el lomo (núcleo nacarado y tres cristales turquesa inclinados) y la aleta dorsal toma el color de la piel. Los renders se entregan para la valoración artística de Luis.

## Sugerencias para integrar
Buscar por nombre los cuatro nodos, aunque GLTFLoader represente el cuerpo multimaterial como grupo con primitivas hijas. Usar su transformación como pivote; no mover las primitivas por separado. Aleteo Z en espejo, ±0.16 rad a 0.10 ciclos/s; cola X ±0.16 rad a 0.12 ciclos/s. Límite comprobado: ±0.2 rad. Pulso simultáneo del material de crestas y núcleo: intensidad 2.5 ±0.5 a 0.08 ciclos/s. Faroles constantes. La cuerda se conecta al centro local (0,4.2,0). Sin animaciones horneadas.
'''
(ROOT/'ENTREGA.md').write_text(delivery,encoding='utf-8')
print('DELIVERY COMPLETE',flush=True)
