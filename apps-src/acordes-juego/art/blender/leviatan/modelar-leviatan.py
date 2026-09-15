"""Leviatán modular para Batisfera. Generación bpy; coordenadas de autoría Three, Y arriba."""
import math,sys,json
from pathlib import Path
import bpy,bmesh
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
from bpy_extras.object_utils import world_to_camera_view
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parents[3]/'grados-mayores-juego'/'art'/'blender'))
import kit
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection,107)

def material(name,alpha=1,emission=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value=(1,1,1,1);p.inputs['Roughness'].default_value=.46
    p.inputs['Alpha'].default_value=alpha;p.inputs['Metallic'].default_value=0
    p.inputs['Emission Color'].default_value=(*kit.lin('f2fff9'),1);p.inputs['Emission Strength'].default_value=emission
    vc=m.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Pigment';m.node_tree.links.new(vc.outputs['Color'],p.inputs['Base Color'])
    return m
SKIN=material('Piel pizarra satinada');LIGHT=material('Placas nacaradas emisión 2',emission=2)

def tint(p,color):
    c=Vector(kit.lin(color));x,y,z=p
    k=.92+.08*math.sin(28*x+11*y)*math.cos(23*z-9*y)
    return tuple(c*k)
class Geo:
    def __init__(self):self.v=[];self.f=[];self.c=[];self.mi=[]
    def add(self,v,f,color,mi=0):
        off=len(self.v);self.v.extend(v);self.f.extend(tuple(off+i for i in face) for face in f)
        self.c.extend([tint(p,color) for p in v] if isinstance(color,str) else color);self.mi.extend([mi]*len(f))
    def lathe(self,profile,n=12,center=(0,0,0),scale=(1,1,1),color='f2d9c4',basis=None,mi=0):
        basis=basis or Matrix.Identity(3);v=[];f=[];c=[]
        for y,r in profile:
            for j in range(n):
                a=j*math.tau/n;p=Vector(center)+basis@Vector((scale[0]*r*math.cos(a),scale[1]*y,scale[2]*r*math.sin(a)))
                v.append(tuple(p));c.append(tint(p,color))
        for i in range(len(profile)-1):
            for j in range(n):k=i*n+j;l=i*n+(j+1)%n;f.append((k,l,l+n,k+n))
        self.add(v,f,c,mi)
    def egg(self,center,scale,n=12,rings=6,color='f2d9c4',basis=None):
        self.lathe([(math.cos(math.pi*i/rings),math.sin(math.pi*i/rings)) for i in range(rings+1)],n,center,scale,color,basis)
    def tube(self,path,radii,n=6,color='e6c9c0'):
        v=[];f=[]
        prior=None
        for i,p in enumerate(path):
            t=(Vector(path[min(i+1,len(path)-1)])-Vector(path[max(0,i-1)])).normalized()
            u=(Vector((1,0,0)) if abs(t.x)<.8 else Vector((0,0,1))) if prior is None else prior
            u=(u-t*u.dot(t)).normalized();w=t.cross(u).normalized();prior=u
            for j in range(n):v.append(tuple(Vector(p)+radii[i]*(u*math.cos(j*math.tau/n)+w*math.sin(j*math.tau/n))))
        for i in range(len(path)-1):
            for j in range(n):k=i*n+j;l=i*n+(j+1)%n;f.append((k,l,l+n,k+n))
        f.extend([tuple(reversed(range(n))),tuple((len(path)-1)*n+j for j in range(n))]);self.add(v,f,color)
    def object(self,name,part,materials=(SKIN,)):
        ob=kit.make(name,self.v,self.f,materials[0],part=part,tint=0,smooth_angle=math.pi)
        for m in materials[1:]:ob.data.materials.append(m)
        for face,mi in zip(ob.data.polygons,self.mi):face.material_index=mi
        c=ob.data.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='POINT')
        for i,col in enumerate(self.c):c.data[i].color=(*col,1)
        ob.data.color_attributes.active_color=c
        bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6)
        bad=[f for f in bm.faces if f.calc_area()<1e-12]
        if bad:bmesh.ops.delete(bm,geom=bad,context='FACES')
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
        for f in ob.data.polygons:f.use_smooth=True
        ob.data.update();return ob

PITCH=4.6
RADII=[3.0,2.85,2.63,2.38,2.08,1.76,1.43,1.12,.9]
WIDTH=.62
SKIN.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.60
SKIN.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=.22
LIGHT0=material('Placa craneal emisión 2',emission=2)
for m in (LIGHT,LIGHT0):
    nt=m.node_tree;pbr=nt.nodes['Principled BSDF'];vc=next(n for n in nt.nodes if n.type=='VERTEX_COLOR')
    nt.links.new(vc.outputs['Color'],pbr.inputs['Emission Color'])
originals=[];shells={};statistics=[]

def pigment(p,offset=0):
    x,y,z=p;z+=offset
    belly=max(0,min(1,(-y+.10)/2.5))
    col=Vector(kit.lin('172330')).lerp(Vector(kit.lin('45515e')),belly*.82)
    cloud=.5+.25*math.sin(.35*z+2*x)+.25*math.cos(3*y-.16*z)
    col*=.72+.42*cloud
    scar=abs(math.sin(5*y+.12*z+2*math.sin(.18*z)+x))
    if scar<.07 and y<1:col=col.lerp(Vector(kit.lin('75828c')),.20)
    return tuple(col)

def finish(g,name,part,pivot=(0,0,0),segment=None,light=False):
    ob=g.object(name,part,((LIGHT0 if segment==0 else LIGHT),) if light else (SKIN,));ob.location=kit.B(pivot)
    if segment is not None:ob['segment']=segment
    originals.append(ob);return ob

def rings(g,profile,n=40,offset=0):
    v=[];f=[];c=[]
    for z,rx,ry,yc in profile:
        for j in range(n):
            a=j*math.tau/n
            # Soft ventral folds and longitudinal compression; boundary rings are exact ellipses.
            p=(rx*math.cos(a),yc+ry*math.sin(a),z)
            v.append(p);c.append(pigment(p,offset))
    for i in range(len(profile)-1):
        for j in range(n):k=i*n+j;l=i*n+(j+1)%n;f.append((k,l,l+n,k+n))
    f.extend([tuple(reversed(range(n))),tuple((len(profile)-1)*n+j for j in range(n))])
    g.add(v,f,c)
    return v,f

def crest(g,zs,heights,width=.11):
    # Thin low membrane: a constant-height dorsal continuation, not discrete swollen collars.
    v=[];f=[]
    for z in zs:
        if 4.6 in zs:
            r0=heights[zs.index(0)];r1=heights[zs.index(4.6)]
            y=r0+(r1-r0)*z/4.6
        else:y=head_cross(max(head_profile[0][0],min(z,head_profile[-1][0])))[1]
        v.extend([(-.025,y-.12,z),(.025,y-.12,z),(.020,y+.18,z),(-.020,y+.18,z)])
    for i in range(len(zs)-1):
        for j in range(4):k=i*4+j;l=i*4+(j+1)%4;f.append((k,l,l+4,k+4))
    f.extend([(3,2,1,0),tuple((len(zs)-1)*4+j for j in range(4))]);g.add(v,f,'172330')

# Long cranium with deep occiput, flattened rostrum and a continuous lower jaw.
head_profile=[(-7.6,.08,.08,-.12),(-7.3,.48,.25,.05),(-6.6,.75,.45,.12),(-5.6,1.0,.70,.25),(-4.5,1.18,1.05,.40),(-3.3,1.35,1.55,.62),(-2.2,1.55,2.10,.60),(-.9,1.94,3.0,0),(0,1.86,3.0,0),(.3,1.78,2.90,0),(.65,1.38,1.95,0),(.95,0,0,0)]
# Interpolate each profile interval once for smooth curvature in the close camera.
# Catmull interpolation treats z as a fourth independent profile component.
def interpolate_profiles(src,steps=3):
    out=[]
    for i in range(len(src)-1):
        p0=Vector(src[max(0,i-1)]);p1=Vector(src[i]);p2=Vector(src[i+1]);p3=Vector(src[min(len(src)-1,i+2)])
        for j in range(steps):
            t=j/steps;v=.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)
            out.append((v[0],max(0,v[1]),max(0,v[2]),v[3]))
    out.append(src[-1]);return out
hg=Geo();shells['head']=rings(hg,interpolate_profiles(head_profile),48)
def head_cross(z):
    for a,b in zip(head_profile,head_profile[1:]):
        if a[0]<=z<=b[0]:
            t=(z-a[0])/(b[0]-a[0]);return [a[k]*(1-t)+b[k]*t for k in (1,2,3)]
def on_head(z,y,side,inflate=0):
    rx,ry,yc=head_cross(z);return (side*(rx*math.sqrt(max(0,1-((y-yc)/ry)**2))+inflate),y,z)
# Lower jaw shares the cheek volume at its rear; actual gap between the two bony arches.
jaw_profile=[(-7.45,.02,.025,-.40),(-7.15,.42,.17,-.55),(-6.5,.69,.24,-.72),(-5.5,.96,.40,-1.05),(-4.4,1.15,.65,-1.50),(-3.3,1.25,.82,-1.80),(-2.5,1.20,1.0,-1.20),(-1.9,0,0,-.50)]
rings(hg,interpolate_profiles(jaw_profile,2),28)
# Recessed oral lining connects the jaw deep inside, leaving a visible narrow opening.
lining=Geo()
lining_profile=[(-7.30,.12,.045,-.32),(-6.6,.55,.10,-.43),(-5.6,.77,.12,-.58),(-4.5,.91,.14,-.76),(-3.3,1.02,.09,-.94),(-2.8,0,0,-.8)]
rings(lining,lining_profile,24)
hg.add(lining.v,lining.f,'070c12')
for side in (-1,1):
    eyez=-3.85;eyey=.60
    center=Vector(on_head(eyez,eyey,side,-.055))
    basis=Vector((0,0,1)).rotation_difference(Vector((side*.97,0,-.24))).to_matrix()
    hg.egg(center,(.15,.155,.075),20,8,'060e14',basis)
    hg.egg(center+Vector((side*.058,.032,-.019)),(.020,.016,.010),8,4,'b1c3c9',basis)
    # Straight heavy orbital shelf, tapered into the skull at both ends.
    path=[on_head(-4.35+j*1.02/16,.79+.02*j/16,side,.025) for j in range(17)]
    hg.tube(path,[.030+.10*math.sin(j*math.pi/16)**.45 for j in range(17)],8,'263441')
    # Retain the single operculum, attached to the slimmer cranium.
    path=[]
    for j in range(25):
        t=j/24;y=1.45-3.1*t;z=-2.1+.43*math.sin(t*math.pi)
        path.append(on_head(z,y,side,.015))
    hg.tube(path,[.012+.055*math.sin(j*math.pi/24) for j in range(25)],8,'263747')
    # Skin fold where the mouth corner descends into the cheek.
    path=[on_head(-3.5+j*.62/12,-.91-.28*math.sin(j*math.pi/24),side,.015) for j in range(13)]
    hg.tube(path,[.013+.035*math.sin(j*math.pi/12) for j in range(13)],6,'1b2935')
    # Four unequal conical teeth on each upper arcade; curved inward into the opening.
    for z,length in [(-6.78,.18),(-5.96,.28),(-5.12,.21),(-4.25,.32)]:
        rx,ry,yc=head_cross(z);base=Vector((side*rx*.75,yc-ry+.025,z))
        path=[]
        for j in range(6):
            t=j/5;path.append(base+Vector((-side*.09*t*t,-length*t,.06*t*t)))
        hg.tube(path,[.055*(1-j/5)**.8 for j in range(6)],8,'a4b5b3')

# Long pectoral paddles with bowed surface, visible ribs and softly undulating margins.
def pectoral(g,side):
    v=[];f=[];c=[];N=22;M=10
    for face in (-1,1):
        for i in range(N+1):
            s=i/N;width=.16*(1-s)+.85*math.sin(math.pi*s)**.65
            for j in range(M+1):
                u=2*j/M-1
                p=(side*(1.82+2.65*s+.24*width*u),-.68-.9*s+.48*math.sin(math.pi*s)*(1-u*u)+.045*math.sin(5*math.pi*u)*math.sin(math.pi*s)+face*(.18*(1-s)**3+.045*math.sin(math.pi*s))*(1-.8*u*u),-1.8+3.75*s+width*u)
                v.append(p)
                c.append(tuple(Vector(kit.lin('182632')).lerp(Vector(kit.lin('536271')),max(0,math.cos(5*math.pi*u))**4*.40+abs(u)*.10)))
    stride=(N+1)*(M+1)
    for sideface in range(2):
        off=sideface*stride
        for i in range(N):
            for j in range(M):k=off+i*(M+1)+j;face=(k,k+1,k+M+2,k+M+1);f.append(face if sideface else tuple(reversed(face)))
    for j in (0,M):
        for i in range(N):k=i*(M+1)+j;l=k+M+1;f.append((k,l,l+stride,k+stride))
    g.add(v,f,c)


for side in (-1,1):pectoral(hg,side)
crest(hg,[-2.6,-1.8,-.9,0,.35],[2.75,2.94,3,3,2.75])
head=finish(hg,'Cabeza mandíbula y pectorales','head')

bodies=[]
for i in range(1,9):
    r0,r1=RADII[i-1],RADII[i]
    profile=[(-.95,0,0,0),(-.72,.65*WIDTH*r0,.65*r0,0),(-.50,.85*WIDTH*r0,.85*r0,0),(-.25,.97*WIDTH*r0,.97*r0,0)]
    for j in range(13):
        t=j/12;r=r0*(1-t)+r1*t
        # Shallow joint folds are geometry, but endpoints preserve exact adjacent radii.
        wrinkle=0
        profile.append((PITCH*t,WIDTH*r*(1+wrinkle),r*(1+wrinkle),0))
    profile.extend([(4.85,WIDTH*(r1+(r1-r0)*.25/PITCH),r1+(r1-r0)*.25/PITCH,0),(5.10,.94*WIDTH*r1,.94*r1,0),(5.35,.45*WIDTH*r1,.45*r1,0),(5.45,0,0,0)])
    g=Geo();shells[i]=rings(g,profile,40,(i-1)*PITCH)
    crest(g,[-.38,0,1.15,2.30,3.45,4.6,4.98],[r0*.95,r0,r0*.75+r1*.25,(r0+r1)/2,r0*.25+r1*.75,r1,r1*.87],.10*(r0/3)**.5)
    ob=finish(g,f'Cuerpo {i:02d}','body',(0,0,(i-1)*PITCH),i);bodies.append(ob)
    # Match the outer-skin normal field across overlaps instead of shading each collar as a ring.
    normals=[]
    for vert in ob.data.vertices:
        x,y,z=kit._three(vert.co);r=r0+(r1-r0)*z/PITCH
        radial=math.sqrt((x/WIDTH)**2+y*y)
        if -.45<z<5.15 and radial>.90*r and abs(y)<r*1.015:
            normal=kit.B(Vector((x/(WIDTH*WIDTH),y,-r*(r1-r0)/PITCH)).normalized())
        else:normal=vert.normal
        normals.append(normal)
    ob.data.normals_split_custom_set_from_vertices(normals)
# Tail: smooth peduncle opens into a long vertical ribbon with a scalloped trailing outline.
g=Geo();tailprof=[(-.95,0,0,0),(-.72,.65*WIDTH*.9,.65*.9,0),(-.5,.85*WIDTH*.9,.85*.9,0),(-.25,.97*WIDTH*.9,.97*.9,0),(0,WIDTH*.9,.9,0),(.6,.51,.73,0),(1.2,.35,.54,0),(1.8,.18,.37,0),(2.5,.08,.20,0),(3.0,0,0,0)]
shells['tail']=rings(g,tailprof,32,8*PITCH)
v=[];f=[];c=[];N=28;M=14
for face in (-1,1):
    for i in range(N+1):
        t=i/N;z=-.35+5.35*t;spread=(1.22-.45*t)*(1-t)**.60
        for j in range(M+1):
            u=2*j/M-1
            p=(face*.035*math.sin(math.pi*t)+.10*math.sin(math.pi*t)*math.cos(u*math.pi/2),u*spread,z+.045*math.sin(8*u)*abs(u)*t*(1-t))
            v.append(p);c.append(pigment(p,8*PITCH))
stride=(N+1)*(M+1)
for face in range(2):
    for i in range(N):
        for j in range(M):k=face*stride+i*(M+1)+j;q=(k,k+1,k+M+2,k+M+1);f.append(q if face else tuple(reversed(q)))
for j in (0,M):
    for i in range(N):k=i*(M+1)+j;l=k+M+1;f.append((k,l,l+stride,k+stride))
for i in (0,N):
    for j in range(M):k=i*(M+1)+j;f.append((k,k+1,k+1+stride,k+stride))
g.add(v,f,c);tail=finish(g,'Cola y aleta terminal','tail',(0,0,8*PITCH))

# Nine structured dorsal sails: corrugated rays, irregular edge and roots buried in dorsal skin.
plates=[]
for seg in range(9):
    g=Geo();v=[];f=[];c=[];N=24;M=6
    length=3.55-.13*seg;height=2.50-.20*seg
    start=-3.10 if seg==0 else .10
    for face in (-1,1):
        for i in range(N+1):
            t=i/N;z=start+length*t
            skinheight=(head_cross(z)[1] if seg==0 else RADII[seg-1]*(1-z/PITCH)+RADII[seg]*(z/PITCH))
            base=skinheight-.26
            h=height*(math.sin(math.pi*t)**.72)*(1+.13*math.sin(8*math.pi*t+seg*.7))
            for j in range(M+1):
                q=j/M;ray=max(0,math.cos(8*math.pi*t+seg*.7))**6
                p=(face*(.09+.10*ray)*math.sin(math.pi*t)*(1-.72*q),base+(.40+h)*q,z+.25*q*math.sin(math.pi*t))
                v.append(p)
                blend=min(1,max(0,(q-.22)/.66));blend=blend*blend*(3-2*blend)
                col=Vector(kit.lin('172330')).lerp(Vector(kit.lin('a6c6ba')),blend)
                col*=1-(1-(.48+.52*ray))*blend
                c.append(tuple(col))
    stride=(N+1)*(M+1)
    for face in range(2):
        for i in range(N):
            for j in range(M):k=face*stride+i*(M+1)+j;quad=(k,k+1,k+M+2,k+M+1);f.append(quad if face else tuple(reversed(quad)))
    for j in (0,M):
        for i in range(N):k=i*(M+1)+j;l=k+M+1;f.append((k,l,l+stride,k+stride))
    g.add(v,f,c);pivot=(0,0,0 if seg==0 else (seg-1)*PITCH)
    plates.append(finish(g,f'Placa dorsal {seg:02d}','plate',pivot,seg,True))

bpy.context.view_layer.update()
# Each buried front ring remains inside the previous polygonal skin for combined yaw/pitch.
# Checking the overlap loop (rather than just centers) prevents an exposed seam around the joint.
def bvh_shell(key):
    vv,ff=shells[key]
    return BVHTree.FromPolygons([kit.B(p) for p in vv],ff)
checks=0;clearance=100
for joint in range(9):
    prev='head' if joint==0 else joint
    tree=bvh_shell(prev)
    basez=0 if joint==0 else PITCH
    r=RADII[joint]
    # Profile ring at -0.72 is already deeply buried, leaving >0.7 u longitudinal overlap.
    for yaw in (-.20,-.10,0,.10,.20):
        for pitch in (-.08,0,.08):
            rot=Matrix.Rotation(yaw,3,'Y')@Matrix.Rotation(pitch,3,'X')
            for j in range(80):
                a=j*math.tau/80
                pt=Vector((.65*WIDTH*r*math.cos(a),.65*r*math.sin(a),-.72))
                q=kit.B(Vector((0,0,basez))+rot@pt)
                # Ray parity from test point to outside: odd intersections means inside skin.
                direction=Vector((.973,.173,.149)).normalized();origin=q.copy();hits=0
                for _ in range(20):
                    hit=tree.ray_cast(origin,direction)
                    if hit[0] is None:break
                    hits+=1;origin=hit[0]+direction*1e-5
                assert hits%2==1,(joint,yaw,pitch,j)
                near=tree.find_nearest(q);clearance=min(clearance,near[3]);checks+=1
# Equal nominal radii are the shared source of truth for the two sides of each interface.
parts,tris=kit.export_parts(ROOT/'leviatan.json',objects=originals,meta=dict(forward='-Z',pointSpacing=PITCH,chainPoints=[[0,0,i*PITCH] for i in range(9)],bodyEnd=[0,0,PITCH],plateHosts=['head']+[f'body {i}' for i in range(1,9)],jointRadii=RADII))
assert parts==19 and tris<=30000,(parts,tris)
counts={};dimensions={}
for o in originals:
    o.data.calc_loop_triangles();key=o['part']+(' '+str(o['segment']) if 'segment' in o else '')
    counts[key]=len(o.data.loop_triangles)
    pp=[kit._three(v.co) for v in o.data.vertices]
    dimensions[key]=[max(p[i] for p in pp)-min(p[i] for p in pp) for i in range(3)]
points=[kit._three(o.matrix_world@v.co) for o in originals for v in o.data.vertices]
dims=[max(p[i] for p in points)-min(p[i] for p in points) for i in range(3)]
bpy.ops.object.select_all(action='DESELECT')
for o in originals:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'leviatan.glb'),export_format='GLB',use_selection=True,export_extras=True,export_animations=False)

# Curved review assembly: source pieces stay straight; no preview copy has part or segment.
for o in originals:o.hide_render=True;o.hide_set(True)
collection=bpy.data.collections.new('Pose en S — solo revisión');bpy.context.scene.collection.children.link(collection)
P=[Vector((0,0,0))];rotations=[]
for i in range(8):
    yaw=.24*math.sin(i*.72);pitch=.035*math.sin(i*.61)
    rot=Matrix.Rotation(yaw,3,'Y')@Matrix.Rotation(pitch,3,'X');rotations.append(rot)
    P.append(P[-1]+rot@Vector((0,0,PITCH)))
B=Matrix(((1,0,0),(0,0,-1),(0,1,0)));copies=[];headgroup=[];neargroup=[]
for source in originals:
    part=source['part'];seg=source.get('segment',0)
    idx=8 if part=='tail' else (seg-1 if (part=='body' or part=='plate') and seg>0 else 0)
    ob=source.copy();ob.data=source.data
    for prop in ('part','segment'):
        if prop in ob:del ob[prop]
    collection.objects.link(ob);ob.name='Vista '+source.name;ob.hide_render=False;ob.hide_set(False)
    ob.location=kit.B(P[idx]);ob.rotation_euler=(B@rotations[min(idx,7)]@B.inverted()).to_euler()
    copies.append(ob)
    if part=='head' or (part=='plate' and seg==0):headgroup.append(ob)
    if idx<2:neargroup.append(ob)
bpy.context.view_layer.update()
allpoints=[o.matrix_world@v.co for o in copies for v in o.data.vertices]
center=Vector(tuple((min(p[i] for p in allpoints)+max(p[i] for p in allpoints))/2 for i in range(3)))
CENTER=kit._three(center);HEAD_CENTER=(0,.3,-2.5)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
world=bpy.data.worlds.new('Fosa hadal');world.use_nodes=True;scene.world=world;nt=world.node_tree
ambient=nt.nodes['Background'];ambient.inputs[0].default_value=(*kit.lin('01050a'),1);ambient.inputs[1].default_value=.035
bg=nt.nodes.new('ShaderNodeBackground');lp=nt.nodes.new('ShaderNodeLightPath');mix=nt.nodes.new('ShaderNodeMixShader')
nt.links.new(lp.outputs['Is Camera Ray'],mix.inputs[0]);nt.links.new(ambient.outputs[0],mix.inputs[1]);nt.links.new(bg.outputs[0],mix.inputs[2]);nt.links.new(mix.outputs[0],nt.nodes['World Output'].inputs[0])
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam
bpy.ops.object.light_add(type='SPOT');lamp=bpy.context.object;lamp.data.color=kit.lin('d6ecff');lamp.data.spot_size=math.radians(65);lamp.data.spot_blend=.65;lamp.data.shadow_soft_size=2
scene.use_nodes=True;nt=scene.node_tree;nt.nodes.clear();rl=nt.nodes.new('CompositorNodeRLayers');gl=nt.nodes.new('CompositorNodeGlare');gl.glare_type='FOG_GLOW';gl.threshold=1.2;co=nt.nodes.new('CompositorNodeComposite');nt.links.new(rl.outputs['Image'],gl.inputs[0]);nt.links.new(gl.outputs[0],co.inputs[0])
def camera(target,direction,distance,res,color,objects):
    target=Vector(target);cam.location=kit.B(target+Vector(direction).normalized()*distance)
    cam.rotation_euler=(kit.B(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='PERSP';cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24;cam.data.lens=24/(2*math.tan(math.radians(30)));cam.data.clip_start=.1;cam.data.clip_end=400
    scene.render.resolution_x,scene.render.resolution_y=res;bg.inputs[0].default_value=(*kit.lin(color),1)
    lamp.location=cam.location;lamp.rotation_euler=cam.rotation_euler;lamp.data.energy=distance**2*18
    bpy.context.view_layer.update()
    pp=[world_to_camera_view(scene,cam,o.matrix_world@v.co) for o in objects for v in o.data.vertices]
    assert abs((cam.location-kit.B(target)).length-distance)<1e-4
    return dict(width=100*(max(p.x for p in pp)-min(p.x for p in pp)),height=100*(max(p.y for p in pp)-min(p.y for p in pp)),inside=all(0<=p.x<=1 and 0<=p.y<=1 for p in pp))
coverage={}
for name,target,direction,dist,res,color,group in [
('render-juego.png',CENTER,(1,.16,-.30),55,(1600,900),'01050a',copies),
('render-cerca.png',HEAD_CENTER,(.75,.16,-1),25,(1600,900),'01050a',neargroup),
('render-cenital.png',CENTER,(0,1,.001),48,(1600,900),'0b2438',copies),
('render-perfil.png',CENTER,(1,.04,0),37,(1600,900),'0b2438',copies),
('render-detalle.png',HEAD_CENTER,(.9,.15,-1),12,(1200,900),'01050a',headgroup)]:
    detail=name=='render-detalle.png'
    scene.view_settings.exposure=-.65 if detail else 0
    for o in copies:o.hide_render=detail and o not in headgroup
    coverage[name]=camera(target,direction,dist,res,color,group)
    if name=='render-juego.png':assert coverage[name]['inside'] and 35<=coverage[name]['width']<=45,coverage
    scene.render.filepath=str(ROOT/name);bpy.ops.render.render(write_still=True)
for o in copies:o.hide_render=False
scene.view_settings.exposure=0
camera(CENTER,(1,.16,-.30),55,(1600,900),'01050a',copies);scene.render.filepath=str(ROOT/'render-juego.png')
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'leviatan.blend'))

rows=[];partrows=[]
for ob in originals:
    part=ob['part'];seg=ob.get('segment','—');key=part+(' '+str(seg) if seg!='—' else '')
    dx,dy,dz=dimensions[key]
    rows.append(f'| {key} | {counts[key]} | {dx:.3f} × {dy:.3f} × {dz:.3f} |')
    pivot=', '.join(f'{x:.2f}' for x in kit._three(ob.location))
    if part=='plate':axis='Matriz anfitriona / emisión';amp='2 reposo → 5 pulso';speed='0.16 s por placa';note='Misma matriz que cabeza o body correspondiente'
    elif part=='head':axis='Y / X';amp='±0.08 / ±0.03 rad';speed='0.10 / 0.08 ciclos/s';note='Mandíbula con dientes discretos y pectorales integradas: amplitud propia 0 rad, velocidad 0'
    elif part=='body':axis='Curva en X; orientación +Z';amp='Onda lateral ±1.4 u; vertical ±0.20 u';speed='0.10 ciclos/s; longitud de onda 36.8 u';note='Remuestrear por arco a 4.6 u; diferencias vecinas ≤0.20 Y y ≤0.08 X'
    else:axis='Y / X';amp='±0.12 / ±0.04 rad';speed='0.18 / 0.12 ciclos/s';note='Desde P8, siguiendo el último tramo'
    partrows.append(f'| {ob.name} | {part} | {seg} | {pivot} | {ob.data.materials[0].name} | {axis} | {amp} | {speed} | {note} |')
report=f'''# ENTREGA — Leviatán · Batisfera

## Estado
- Versión / ronda: v3, ronda de corrección 2/2 (final)
- Fecha: 2026-09-14
- Lista para: revisión de Luis

## Archivos
| Archivo | Contenido |
|---|---|
| `modelar-leviatan.py` | Fuente bpy reproducible |
| `leviatan.blend` | Originales rectos ocultos y colección de revisión en S |
| `leviatan.glb` | 19 piezas, pigmento por vértice conectado |
| `leviatan.json` | kit.export_parts, 19 piezas con pivotes y segmentos |
| `render-juego.png`, `render-cerca.png`, `render-perfil.png`, `render-detalle.png`, `render-cenital.png` | Cycles 40 muestras, denoise, foco frío |

Regenerar desde esta carpeta:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 modelar-leviatan.py
```

## Datos técnicos
- Total: **{tris} triángulos, {parts} mallas**.
- Tamaño recto completo largo × alto × ancho: **{dims[2]:.3f} × {dims[1]:.3f} × {dims[0]:.3f} u**, incluye placas y pectorales.
- P0=(0,0,0) en unión cabeza–cuerpo. Frente −Z Three / +Y Blender. Cola +Z Three / −Y Blender.
- Los pivotes se guardan en la pose recta: P_i=(0,0,4.6·i). Las posiciones de vértice del JSON son locales al pivote.
- Meta: forward=-Z; pointSpacing=4.6; chainPoints=P0…P8; bodyEnd=(0,0,4.6); plateHosts identifica head/body; jointRadii={RADII}.
- Radio vertical de interfaz común en cada unión; radio horizontal = 0.62 × radio vertical. Así coinciden los grosores nominales sin escalados del integrador.
- Extremos delanteros ocultos hasta −0.95 u y faldón posterior hasta +5.45 u: el solape cubre la articulación, el paso sigue siendo 4.6 u.
- **Uniones:** {checks} muestras dentro de la piel poligonal anterior con giro Y entre ±0.20 rad y X entre ±0.08 rad, combinados. Se comprueban cabeza/body1, body1…body8 y body8/cola. Margen mínimo de inserción {clearance:.4f} u.
- JSON: {(ROOT/'leviatan.json').stat().st_size/1024:.1f} KiB.
- Cámara de juego: distancia 55 u del centro del conjunto, FOV vertical 60°, near 0.1, far 400; ocupa {coverage['render-juego.png']['width']:.2f}% del ancho y cabe entero. Cercana a 25 u de (0,0.3,−2.5), cabeza y primeros cuerpos. Perfil completo; detalle solo head y plate0.

Dimensiones por pieza: ancho X × alto Y × largo Z, en coordenadas locales, incluyen solapes.

| Pieza | Triángulos | Dimensiones X × Y × Z (u) |
|---|---|---|
'''+ '\n'.join(rows)+'''

## Partes y animación sugerida
| Objeto | part | segment | Pivote Three | Material | Eje Three | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
'''+ '\n'.join(partrows)+'''

## Materiales
| Material | Color | Metal / rugosidad | Emisión | Alfa | Integración |
|---|---|---|---|---|---|
| Piel | Blanco × pigmento #172330, vientre #45515e, manchas y surcos; cresta #0b121c | 0 / 0.60 | 0 | 1 | Activar vertexColors; ojos incluidos en head |
| Placas | Pigmento nacarado #f2fff9 a #bbd5d0 | 0 / 0.46 | #f2fff9 × pigmento; 2 en plate0–8 | 1 | Teñir emisión con verde abisal #7fffc8; una placa por nota |

## Diferencias con el brief
La cabeza se alarga según la corrección final: hocico hasta Z=−7.6 u y longitud total de 49.4 u (aproximadamente 48 u en el brief). Plate0 vuelve a emisión 2, igual que las otras ocho placas. Solo render-detalle usa exposición −0.65 EV. La emisión de las crestas se modula con pigmento para conservar nervaduras y raíz oscura. La mandíbula prominente tiene dientes discretos expuestos. Mandíbula y pectorales forman parte de head y no tienen articulaciones independientes. Las longitudes geométricas de los cuerpos incluyen los solapes; la distancia funcional sigue siendo exactamente 4.6 u. Cabeza, ojos y pectorales comparten rugosidad 0.60, conservada en JSON y GLB. No se utilizan transparencias.

## Cambios de la ronda 2/2
Cabeza alargada y lateralmente estrecha, frente inclinada y hocico afilado. Mandíbula inferior ósea que se integra en las mejillas; abertura real con revestimiento interior oscuro y comisura descendente con pliegue. Cuatro dientes superiores por lado, cónicos, desiguales y curvados hacia dentro. Ojos pequeños hundidos bajo un borde óseo recto. La cresta oscura intermedia se sustituye por membrana baja de espesor continuo. Plate0 vuelve a emisión 2; exposición −0.65 EV solo en render-detalle. Cuerpo, cola, placas, pivotes y pectorales conservados; únicamente cambia la membrana intermedia y lo solicitado en cabeza.

## Revisión propia
Se revisaron visualmente los cinco renders: silueta anguiliforme completa y nueve placas legibles a 55 u; cabeza de curvas suaves, boca entreabierta y ojos pequeños hundidos; pectorales curvas; pigmento de vientre y manchas; cola en cinta. El encuadre medido se documenta en los datos técnicos. Comprobaciones geométricas de uniones y presupuesto incorporadas al generador. Las copias en S no llevan part ni segment y no se exportan.

## Sugerencias para integrar
Colocar head en P0; body i y plate i (i=1…8) en P(i−1), con +Z apuntando a Pi. Plate0 comparte la matriz de head; tail en P8. Sustituir la traslación recta por la posición de la curva; no sumarla dos veces. Longitud de onda sugerida 36.8 u, amplitud lateral 1.4 u y periodo 10 s; respetar el límite angular entre vecinos. Bramido: recorrer plate0…8 con separación 0.12 s, cada pulso de 0.16 s. Sin animaciones horneadas ni integración del juego.
'''
(ROOT/'ENTREGA.md').write_text(report,encoding='utf-8')
print('EXPORT',parts,'mallas',tris,'triángulos',counts,'DIMENSIONS largo alto ancho',dims[2],dims[1],dims[0],'UNIONES',checks,clearance,'RENDERS',coverage,flush=True)
