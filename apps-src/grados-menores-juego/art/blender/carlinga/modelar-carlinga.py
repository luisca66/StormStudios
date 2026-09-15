"""Carlinga del Cometa. Autoría en coordenadas Three, Y arriba, frente -Z.
Generación bpy reproducible. Escribe solo en esta carpeta; kit se importa sin bytecode.
"""
import sys, math, random, json, struct
from pathlib import Path
import bpy, bmesh
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parent
sys.dont_write_bytecode=True
sys.path.insert(0,str(ROOT.parents[3]/'grados-mayores-juego'/'art'/'blender'))
import kit
random.seed(83)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version=0
kit.setup(bpy.context.collection,83)
TAU=math.tau
def lerp(a,b,t):return tuple(x*(1-t)+y*t for x,y in zip(a,b))
def mat(name,rough,metal=0,emission='000000',strength=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value=(1,1,1,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    p.inputs['Emission Color'].default_value=(*kit.lin(emission),1);p.inputs['Emission Strength'].default_value=strength
    c=m.node_tree.nodes.new('ShaderNodeVertexColor');c.layer_name='Pigment';m.node_tree.links.new(c.outputs['Color'],p.inputs['Base Color'])
    return m
ICE=mat('Hielo glaseado · pigmento',.38,.02)
BRASS=mat('Latón victoriano',.30,.85,'c9a227',.10)
NOSE=mat('Hielo fracturado · núcleo frío',.34,.025,'12303f',1.8)
WOOD=mat('Roble oscuro envejecido y escarcha',.88)

def ice_color(p):
    x,y,z=p;k=.5+.24*math.sin(x*9+y*6+z*3)+.18*math.cos(y*17-z*8+x*5)
    return lerp(kit.lin('20415a'),kit.lin('6fa8c4'),max(0,min(1,k)))
def grain(p):
    x,y,z=p
    warp=z+.014*math.sin(x*2.4)+.005*math.sin(x*7)
    knot=math.exp(-((x+.54)/.26)**2-((z-.09)/.10)**2)
    k=.48+.21*math.sin(warp*114+2.1*knot)+.12*math.sin(warp*39+x*.8)-.18*knot
    c=lerp(kit.lin('3a2a1e'),kit.lin('5a4230'),max(0,min(1,k)))
    corners=max(0,(abs(x)-1.13)/.31)*max(0,(abs(z)-.25)/.14)
    seams=max(0,1-abs(abs(z)-.13)/.012)*(.25+.75*max(0,(abs(x)-.7)/.74))
    frost=min(.9,(corners*.9+seams*.6)*(.58+.42*math.sin(32*x+91*z)**2)) if y>.04 else 0
    return lerp(c,kit.lin('bee9f5'),frost)

class Geo:
    def __init__(self):self.v=[];self.f=[];self.c=[];self.s=[]
    def add(self,v,f,color,smooth=True,M=None):
        v=[tuple(M@Vector(p)) for p in v] if M is not None else v
        off=len(self.v);self.v.extend(v);self.f.extend(tuple(off+i for i in face) for face in f);self.s.extend([smooth]*len(f))
        for i,p in enumerate(v):
            c=color(p) if callable(color) else color[i] if isinstance(color,list) else color
            c=kit.lin(c) if isinstance(c,str) else c
            k=.96+.04*math.sin(p[0]*7+p[1]*9+p[2]*11)
            self.c.append(tuple(a*k for a in c))
    def tube(self,path,r,color,n=8,closed=False,M=None):
        v=[];f=[];N=len(path);prior=None
        for i,p in enumerate(path):
            t=(Vector(path[(i+1)%N if closed else min(i+1,N-1)])-Vector(path[(i-1)%N if closed else max(i-1,0)])).normalized()
            u=t.cross(Vector((0,1,0)) if abs(t.y)<.85 else Vector((0,0,1))).normalized() if prior is None else (prior-t*prior.dot(t)).normalized();prior=u;w=t.cross(u)
            rr=r[i] if isinstance(r,list) else r
            for j in range(n):v.append(tuple(Vector(p)+rr*(u*math.cos(TAU*j/n)+w*math.sin(TAU*j/n))))
        for i in range(N if closed else N-1):
            for j in range(n):a=i*n+j;b=i*n+(j+1)%n;c=((i+1)%N)*n+(j+1)%n;d=((i+1)%N)*n+j;f.append((a,b,c,d))
        if not closed:f.extend([tuple(reversed(range(n))),tuple((N-1)*n+j for j in range(n))])
        self.add(v,f,color,M=M)
    def vein(self,path,width,color):
        v=[];f=[]
        for i,p in enumerate(path):
            tangent=Vector(path[min(i+1,len(path)-1)])-Vector(path[max(0,i-1)])
            u=Vector((-tangent.y,tangent.x,0)).normalized()*width
            v.extend([tuple(Vector(p)-u),tuple(Vector(p)+u)])
            if i:f.append((2*i-2,2*i-1,2*i+1,2*i))
        self.add(v,f,color)
    def egg(self,pos,scale,color,n=16,rings=8,M=None):
        v=[];f=[]
        for i in range(rings+1):
            a=math.pi*i/rings
            for j in range(n):
                b=TAU*j/n;v.append((pos[0]+scale[0]*math.sin(a)*math.cos(b),pos[1]+scale[1]*math.cos(a),pos[2]+scale[2]*math.sin(a)*math.sin(b)))
        for i in range(rings):
            for j in range(n):a=i*n+j;b=i*n+(j+1)%n;f.append((a,b,b+n,a+n))
        self.add(v,f,color,M=M)
    def lathe(self,profile,pos,color,n=48,M=None):
        v,f=kit.g_lathe(profile,n);v=[tuple(Vector(p)+Vector(pos)) for p in v];self.add(v,f,color,M=M)
    def slab(self,outline,levels,color,M=None):
        # Rounded, profiled board; outline in XZ, levels = height and inward scale.
        v=[];f=[];n=len(outline)
        for y,s in levels:
            v.extend((x*s,y,z*s) for x,z in outline)
        for i in range(len(levels)-1):
            for j in range(n):a=i*n+j;b=i*n+(j+1)%n;f.append((a,b,b+n,a+n))
        f.extend([tuple(reversed(range(n))),tuple((len(levels)-1)*n+j for j in range(n))]);self.add(v,f,color,M=M)
    def finish(self,name,part,material,pivot=(0,0,0),segment=None,local=False,tilt=0):
        v=self.v if local else [tuple(Vector(p)-Vector(pivot)) for p in self.v]
        ob=kit.make(name,v,self.f,material,part=part,tint=0,smooth_angle=math.pi)
        col=ob.data.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='POINT')
        for d,c in zip(col.data,self.c):d.color=(*c,1)
        ob.data.color_attributes.active_color=col
        for p,s in zip(ob.data.polygons,self.s):p.use_smooth=s
        bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
        bad=[f for f in bm.faces if f.calc_area()<1e-12]
        if bad:bmesh.ops.delete(bm,geom=bad,context='FACES')
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
        ob.location=kit.B(pivot);ob.rotation_euler.x=tilt
        if segment is not None:ob['segment']=segment
        return ob

# Frame: continuous rounded ice moulding, varying section, inset dark core and fine frost.
frame=Geo();brass=Geo()
outline=kit.rounded_poly([(-1.55,-.98),(1.55,-.98),(1.55,1.28),(-1.55,1.28)],.23,7)
# Subdivide straight spans for organic ice pigment and gradual taper.
path=[]
for i,p in enumerate(outline):
    q=outline[(i+1)%len(outline)];count=max(1,math.ceil((Vector(q)-Vector(p)).length/.22))
    for j in range(count):path.append(tuple(Vector(p).lerp(Vector(q),j/count)))
v=[];f=[];ns=10
for i,(x,y) in enumerate(path):
    tangent=(Vector(path[(i+1)%len(path)])-Vector(path[(i-1)%len(path)])).normalized();u=Vector((tangent.y,-tangent.x))
    radius=.155+.070*max(0,(-y-.4)/.6)
    for j in range(ns):
        a=TAU*j/ns;bulge=1+.045*math.sin(i*.7+j*.9)
        v.append((x+u.x*radius*math.cos(a)*bulge,y+u.y*radius*math.cos(a)*bulge,-1.5+.17*math.sin(a)))
for i in range(len(path)):
    for j in range(ns):a=i*ns+j;b=i*ns+(j+1)%ns;c=((i+1)%len(path))*ns+(j+1)%ns;d=((i+1)%len(path))*ns+j;f.append((a,b,c,d))
frame.add(v,f,ice_color)
for sign in (-1,1):
    # Hairline frost veins follow the visible rounded surface, branching inlaid chips.
    for k in range(4):
        y=-.60+k*.49
        frame.vein([(sign*(1.49+.026*math.sin(i*.8+k)),y+i*.025,-1.332) for i in range(7)],.0025,'92bccd')
    # Bronzed naval portlight: broad flange, recessed lip and rolled edge, no glazing.
    M=kit.T((sign*2.3,.15,-.2),(0,sign*math.radians(76),0))@kit.T(rot=(-math.pi/2,0,0))
    brass.lathe([(.57,-.035),(.585,-.052),(.68,-.052),(.715,-.02),(.725,.012),(.711,.055),(.684,.072),(.596,.07),(.57,.045),(.57,-.035)],(0,0,0),'c9a227',64,M)
    # Thick closed ice wall with a circular bore; the forward edge meets the jamb.
    wallv=[];wallf=[];n=64
    for back in (False,True):
        for t in (0,.20,1):
            for j in range(n):
                a=TAU*j/n;inner=M@Vector((.70*math.cos(a),.018,.70*math.sin(a)))
                u=(inner.z+.2)/(.70*math.sin(math.radians(76)));v=(inner.y-.15)/.70
                q=max(abs(u),abs(v));u/=q;v/=q
                outer=Vector((sign*(2.30+.13*max(0,u)-.68*max(0,-u)),.15+1.14*v,-.2+1.30*u))
                p=inner.lerp(outer,t)
                p.x+=sign*(.17 if back else -.018*math.sin(math.pi*t))
                wallv.append(tuple(p))
    for back in range(2):
        for k in range(2):
            for j in range(n):
                a=back*3*n+k*n+j;b=back*3*n+k*n+(j+1)%n;wallf.append((a,b,b+n,a+n))
    for k in (0,2):
        for j in range(n):
            a=k*n+j;b=k*n+(j+1)%n;wallf.append((a,b,b+3*n,a+3*n))
    frame.add(wallv,wallf,ice_color)
    for j in range(8):
        a=TAU*j/8;brass.egg((.652*math.cos(a),.079,.652*math.sin(a)),(.027,.018,.027),'e1c576',12,4,M)
    # Hinges seated on flange, two small knuckles at outside rim.
    for z in (-.16,.16):brass.lathe([(.034,-.06),(.044,-.045),(.044,.045),(.034,.06)],(.706,.02,z),'aa8035',16,M)

# Scalloped sill cap with shallow double bead; seven polished domed rivets.
brass.tube([(-1.64+3.28*i/32,-1.133,-1.375) for i in range(33)],.026,'c9a227',8)
brass.tube([(-1.62+3.24*i/24,-1.105,-1.352) for i in range(25)],.009,'edd397',6)
for i in range(-3,4):brass.egg((i*.44,-1.077,-1.347),(.032,.032,.022),'dabb61',12,6)
parts=[frame.finish('Marco_Hielo','frame_ice',ICE),brass.finish('Marco_Laton','frame_brass',BRASS)]

# Bow: a long fractured mass with offset ridges and buried, interlocking ice plates.
nose=Geo()
profile=[(-3.5,.56,.50,-2.30),(-3.82,.83,.65,-2.30),(-4.35,.95,.73,-2.30),(-5.05,.87,.65,-2.27),(-5.9,.72,.53,-2.25),(-6.7,.53,.42,-2.24),(-7.5,.39,.31,-2.27),(-8.2,.22,.20,-2.28),(-8.9,.015,.025,-2.26)]
v=[];f=[];N=15
for i,(z,rx,ry,cy) in enumerate(profile):
    for j in range(N):
        a=TAU*j/N;w=1+.085*math.sin(j*2.7+i*1.8);v.append((rx*math.cos(a)*w+.045*math.sin(i),cy+ry*math.sin(a)*w,z+.10*math.sin(j*2+i)))
for i in range(len(profile)-1):
    for j in range(N):a=i*N+j;b=i*N+(j+1)%N;f.extend([(a,b,b+N),(a,b+N,a+N)])
f.extend([tuple(reversed(range(N))),tuple((len(profile)-1)*N+j for j in range(N))])
nose.add(v,f,ice_color,False)
# Irregular wedge crystals: bevel edges for worn chipped facets, integrated bases.
def shard(center,scale,seed):
    rng=random.Random(seed);vv=[]
    for y,s in [(-.5,.72),(-.34,1),(.30,.84),(.57,.46)]:
        for j in range(5):
            a=TAU*j/5;vv.append((math.cos(a)*scale[0]*s,scale[1]*(y+rng.uniform(-.06,.06)),math.sin(a)*scale[2]*s))
    ff=[]
    for i in range(3):
        for j in range(5):a=i*5+j;b=i*5+(j+1)%5;ff.append((a,b,b+5,a+5))
    ff.extend([tuple(reversed(range(5))),tuple(15+j for j in range(5))])
    M=kit.T(center,(rng.uniform(-.4,.4),rng.uniform(-1,1),rng.uniform(-.35,.35)))
    nose.add(vv,ff,ice_color,False,M)
for i in range(11):
    z=-3.9-(i%4)*.66;side=-1 if i%2 else 1
    shard((side*(.44+.14*math.sin(i)),-1.99+.07*(i%3),z),(.39,.74,.55),80+i)
# v5 (Claude, 2026-09-15): las vetas eran 8 zigzags paralelos que parecían puntadas. Ahora una
# fisura principal quebrada recorre el lomo hacia la punta y siete ramas bajan por los costados,
# afinándose, como hielo que se abre bajo presión. Siguen proyectadas sobre la superficie real.
nbvh=BVHTree.FromPolygons(nose.v,nose.f,all_triangles=False)
crack_start=len(nose.v)
crng=random.Random(311)
def on_ice(x,z):
    loc,normal,_,_=nbvh.ray_cast(Vector((x,0,z)),Vector((0,-1,0)))
    return tuple(loc+normal*.004) if loc is not None else None
spine=[];x=.02
for i in range(26):
    z=-3.92-4.3*i/25
    x=max(-.16,min(.16,x+crng.uniform(-.06,.06)+(crng.choice((-.07,.07)) if i%6==3 else 0)))
    q=on_ice(x,z)
    if q:spine.append((q,i/25))
nose.tube([q for q,_ in spine],[.019*(1-t)**.7+.004 for _,t in spine],'6fd3ff',4)
for b in range(7):
    q0,t0=spine[min(len(spine)-2,2+b*3)];side=1 if b%2==0 else -1
    x,z=q0[0],q0[2];branch=[q0]
    for i in range(7):
        x+=side*crng.uniform(.05,.085);z+=crng.uniform(-.1,.06)
        q=on_ice(x,z)
        if q is None:break
        branch.append(q)
    if len(branch)>2:
        nose.tube(branch,[.012*(1-t0)*(1-i/len(branch))+.003 for i in range(len(branch))],'6fd3ff',4)
# Lift vertices, never the object pivot, and embed the one-material emission palette.
NOSE_LIFT=.75
nose.v=[(x,y+NOSE_LIFT,z) for x,y,z in nose.v]
emission_lookup={tuple(round(a,5) for a in p):i>=crack_start for i,p in enumerate(nose.v)}
noseob=nose.finish('Proa_Hielo','comet_nose',NOSE)
parts.append(noseob)
palette=bpy.data.images.new('Núcleo helado · paleta emisiva',width=2,height=1)
palette.pixels=[*kit.lin('12303f'),1,*kit.lin('6fd3ff'),1];palette.pack()
tex=NOSE.node_tree.nodes.new('ShaderNodeTexImage');tex.image=palette;tex.interpolation='Closest'
NOSE.node_tree.links.new(tex.outputs['Color'],NOSE.node_tree.nodes['Principled BSDF'].inputs['Emission Color'])
uv=noseob.data.uv_layers.new(name='EmissionPalette')
for loop in noseob.data.loops:
    p=kit._three(noseob.data.vertices[loop.vertex_index].co)
    bright=emission_lookup.get(tuple(round(a,5) for a in p),False)
    uv.data[loop.index].uv=(.75 if bright else .25,.5)

# Instruments authored on an inclined common work plane. +Y local is the dial normal.
TILT=.55;board_origin=Vector((0,-.90,-1.30));R=Matrix.Rotation(TILT,3,'X')
def bp(p):return tuple(board_origin+R@Vector(p))
BOARD_PIV=bp((0,.045,0));ORRERY=bp((-.95,.14,-.035));GAUGE=bp((.95,.115,-.045));LEVER=bp((.48,.095,.21))
board=Geo();gold=Geo()
outline=kit.rounded_poly([(-1.49,-.415),(1.49,-.415),(1.49,.415),(-1.49,.415)],.14,6)
board.slab(outline,[(-.055,.97),(-.045,1),(.012,1),(.038,.988),(.045,.972)],grain)
# Top has inset panels with a rolled wooden edge and elongated grain lines.
board.tube([(x*.985,.042,z*.985) for x,z in outline],.012,'493322',6,True)
# Tessellated wood surface: grain, knots and corner/joint frost are vertex pigment.
v=[];f=[];nx=18;nz=40
for j in range(nz+1):
    z=-.39+.78*j/nz;d=max(0,abs(z)-.26);extent=1.31+math.sqrt(max(0,.13**2-d*d))
    for i in range(nx+1):v.append((-extent+2*extent*i/nx,.046,z))
for j in range(nz):
    for i in range(nx):a=j*(nx+1)+i;f.append((a,a+1,a+nx+2,a+nx+1))
board.add(v,f,grain)
# Orrery footing and mast; three fine orbit races and a polished sun.
gold.lathe([(.12,.043),(.13,.05),(.13,.063),(.10,.074),(.048,.082),(.026,.093),(.025,.125)],(-.95,0,-.035),'b38b37',32)
gold.egg((-.95,.14,-.035),(.069,.069,.069),'edd091',20,10)
for radius in (.17,.28,.39):
    gold.tube([(-.95+radius*math.cos(TAU*i/48),.14,-.035+radius*math.sin(TAU*i/48)) for i in range(48)],.0055,'d6b858',5,True)
# Supporting radial spokes under orbits, recessed under the planets.
for a in (0,TAU/3,2*TAU/3):gold.tube([(-.95,.097,-.035),(-.95+.385*math.cos(a),.12,-.035+.385*math.sin(a))],.009,'947231',8)
# Sextant: inlaid ivory arc and shaped arm remain in the matte board part as requested.
angles=[math.radians(24)+math.radians(112)*i/36 for i in range(37)]
board.tube([(.29*math.cos(a),.081,-.03+.29*math.sin(a)) for a in angles],.022,'bdc6b7',8)
board.tube([(0,.08,-.03),(-.13,.08,.19)],.017,'91a5aa',8)
board.egg((0,.08,-.03),(.037,.012,.037),'c9d2ca',16,6)
for i,a in enumerate(angles[::2]):
    rr=.265 if i%4==0 else .278
    board.tube([(.29*math.cos(a),.105,-.03+.29*math.sin(a)),(rr*math.cos(a),.105,-.03+rr*math.sin(a))],.0026,'283f50',4)
# Pressure instrument: machined housing; dark dial kept in board for a matte finish.
gold.lathe([(.155,.045),(.19,.057),(.206,.073),(.212,.092),(.209,.113),(.19,.125),(.174,.122),(.170,.110)],(.95,0,-.045),'c9a227',48)
board.lathe([(.001,.111),(.169,.111),(.169,.108),(.001,.108)],(.95,0,-.045),'101e2b',64)
for i in range(41):
    a=math.radians(-120+240*i/40);r0=.133 if i%5==0 else .146
    board.tube([(.95+r0*math.sin(a),.113,-.045-r0*math.cos(a)),(.95+.159*math.sin(a),.113,-.045-.159*math.cos(a))],.0026 if i%5==0 else .0015,'dfdac0',4)
# Three subtle stars in the dial; analogue engraving, no HUD typography.
for x in (.92,.95,.98):board.egg((x,.114,.015),(.004,.001,.004),'9bb3c0',8,4)
# Telegraph plinth, hinge cheeks and contact studs.
keyoutline=kit.rounded_poly([(-.09,-.09),(.09,-.09),(.09,.09),(-.09,.09)],.025,5)
gold.slab(keyoutline,[(.047,1),(.067,1),(.081,.9)],'b9964b',kit.T((.48,0,.21)))
for x in (.433,.527):gold.egg((x,.095,.21),(.018,.023,.03),'ddb86c',12,6)
gold.egg((.48,.098,.33),(.022,.017,.022),'d9b972',12,6)
# Cabinet fasteners arranged only on the outer worktop, no floating ornaments.
for x in (-1.37,1.37):
    for z in (-.29,.29):gold.egg((x,.050,z),(.018,.010,.018),'c9a227',12,5)
parts.append(board.finish('Tablero','board',WOOD,BOARD_PIV,local=True,tilt=TILT))
# Recenter authoring coordinates at top surface while retaining body dimensions.
for vert in parts[-1].data.vertices:vert.co-=kit.B((0,.045,0))
parts.append(gold.finish('Instrumentos_Laton','board_brass',BRASS,BOARD_PIV,local=True,tilt=TILT))
for vert in parts[-1].data.vertices:vert.co-=kit.B((0,.045,0))

for i,(radius,phase) in enumerate(zip((.17,.28,.39),(.6,2.8,4.8))):
    g=Geo();pos=(radius*math.cos(phase),.032,radius*math.sin(phase))
    g.egg(pos,(.030,.030,.030),['d1a959','8aa5aa','bf7954'][i],20,10)
    # Each offset planet has a short standoff seated on its orbit race.
    g.tube([(pos[0],-.002,pos[2]),(pos[0],.020,pos[2])],.008,'d9b965',8)
    parts.append(g.finish(f'Planeta_{i}','orrery_planet',BRASS,ORRERY,segment=i,local=True,tilt=TILT))
needle=Geo()
needle.slab([(-.009,.027),(.009,.027),(.007,-.095),(0,-.143),(-.007,-.095)],[(.006,1),(.011,1)],'ebc76c')
needle.egg((0,.013,0),(.021,.011,.021),'e2c77e',16,6)
parts.append(needle.finish('Aguja_Manometro','gauge_needle',BRASS,GAUGE,local=True,tilt=TILT))
lever=Geo()
lever.tube([(0,0,-.033),(0,.024,.045),(0,.037,.135)],.013,'c9a227',12)
lever.egg((0,.036,.14),(.043,.022,.044),'374952',20,10)
lever.tube([(-.051,0,0),(.051,0,0)],.014,'dabc73',12)
parts.append(lever.finish('Palanca_Radiofaro','beacon_lever',BRASS,LEVER,local=True,tilt=TILT))

# Export contract and mechanical checks. No game build, integration or QA is executed.
bpy.context.view_layer.update()
assert len(parts)==10
required={'frame_ice','frame_brass','comet_nose','board','board_brass','orrery_planet','gauge_needle','beacon_lever'}
assert {o['part'] for o in parts}==required
for o in parts:assert len(o.data.materials)==1
planet_objs=[o for o in parts if o['part']=='orrery_planet']
assert [o['segment'] for o in planet_objs]==[0,1,2]
assert all((o.location-kit.B(ORRERY)).length<1e-7 for o in planet_objs)
# Sampling 360-degree orbit in the inclined board basis preserves each radius and plane.
orbit_error=0
for radius in (.17,.28,.39):
    for step in range(73):
        p=R@(Matrix.Rotation(TAU*step/72,3,'Y')@Vector((radius,.032,0)))
        orbit_error=max(orbit_error,abs(p.dot(R@Vector((0,1,0)))-.032))
assert orbit_error<1e-6
allverts=[o.matrix_world@v.co for o in parts for v in o.data.vertices]
lo=[min(v[i] for v in allverts) for i in range(3)];hi=[max(v[i] for v in allverts) for i in range(3)]
size=[hi[0]-lo[0],hi[2]-lo[2],hi[1]-lo[1]]
# Projected empty central rectangle: 84% width × 80% height = 67.2% of the screen.
bvh=[]
for o in parts:
    bvh.append(BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices],[tuple(p.vertices) for p in o.data.polygons]))
hits=0;samples=0
for i in range(43):
    for j in range(31):
        sx=-.84+1.68*i/42;sy=-.60+1.60*j/30
        direction=kit.B((sx*math.tan(math.pi/6)*16/9,sy*math.tan(math.pi/6),-1)).normalized();samples+=1
        if any(tree.ray_cast(Vector((0,0,0)),direction,100)[0] is not None for tree in bvh):hits+=1
free_percent=100*(1-hits/samples)
# The front sill brass must never intercept rays to the orbit races or gauge face.
sill_ob=parts[1]
sill_bvh=BVHTree.FromPolygons([sill_ob.matrix_world@v.co for v in sill_ob.data.vertices],[tuple(p.vertices) for p in sill_ob.data.polygons])
instrument_probes=[]
for radius in (.17,.28,.39):
    instrument_probes.extend(bp((-.95+radius*math.cos(TAU*i/96),.14,-.035+radius*math.sin(TAU*i/96))) for i in range(96))
for radius in (0,.08,.16,.20):
    instrument_probes.extend(bp((.95+radius*math.cos(TAU*i/64),.115,-.045+radius*math.sin(TAU*i/64))) for i in range(64))
for p in instrument_probes:
    target=kit.B(p);hit=sill_bvh.ray_cast(Vector((0,0,0)),target.normalized(),target.length-.002)[0]
    assert hit is None,('Sill obscures instrument',p)
# Compare the whole projected bow silhouette (including below-frame pixels) with
# the visible portion from the exact resting eye. No extra test render is needed.
nose_tree=bvh[2];bow_total=0;bow_visible=0;bow_above_hud=0
for ix in range(71):
    for iy in range(91):
        sx=-.42+.84*ix/70;sy=-1.6+1.7*iy/90
        direction=kit.B((sx*math.tan(math.pi/6)*16/9,sy*math.tan(math.pi/6),-1)).normalized()
        hit,_,_,distance=nose_tree.ray_cast(Vector((0,0,0)),direction,100)
        if hit is None:continue
        bow_total+=1
        blocked=any(tree.ray_cast(Vector((0,0,0)),direction,distance-.003)[0] is not None for k,tree in enumerate(bvh) if k!=2)
        if not blocked:
            bow_visible+=1
            if sy>=-.5:bow_above_hud+=1
bow_fraction=bow_visible/bow_total
assert bow_fraction>=1/3,('Bow visibility',bow_fraction)
meta=dict(forward='-Z',size=size,eye=[0,0,0],boardTiltRadians=TILT,boardPivot=BOARD_PIV,orreryCenter=ORRERY,gaugeCenter=GAUGE,beaconHinge=LEVER,orbitRadii=[.17,.28,.39],orbitSpeeds=[.642857,.375,.264706],instrumentAxisY=list(R@Vector((0,1,0))),instrumentAxisX=[1,0,0],jsonRotationBaked=True,centralScreenRectangle=[-.84,.84,-.60,1.0],centralRectangleClearPercent=free_percent)
count,tris=kit.export_parts(ROOT/'carlinga.json',objects=parts,meta=meta)
assert count==10 and tris<=20000,(count,tris)
# kit has a constant emission color only. Supplement its output with a per-vertex
# emission channel so the integrator can reproduce the packed GLB emission palette.
payload=json.loads((ROOT/'carlinga.json').read_text(encoding='utf-8'))
emission_by_pos={}
for loop in noseob.data.loops:
    p=kit._three(noseob.data.vertices[loop.vertex_index].co)
    emission_by_pos[tuple(round(a,5) for a in p)]=uv.data[loop.index].uv.x>.5
for mesh in payload['meshes']:
    if mesh['part']=='comet_nose':
        values=[]
        for i in range(0,len(mesh['position']),3):
            bright=emission_by_pos.get(tuple(mesh['position'][i:i+3]),False)
            values.extend(kit.lin('6fd3ff' if bright else '12303f'))
        mesh['emissionVertexColor']=values
payload.update(noseLift=NOSE_LIFT,noseVisibleFraction=bow_fraction,noseEmissionStrength=1.8,noseEmissionPalette=['#12303f','#6fd3ff'],hudPreview=dict(bottomFraction=.25,blackOpacity=.78))
(ROOT/'carlinga.json').write_text(json.dumps(payload,separators=(',',':')),encoding='utf-8')
print('EXPORT',count,'partes',tris,'triangulos','DIMENSIONS X/Y/Z',size,'CENTRAL CLEAR',free_percent,flush=True)
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.export_scene.gltf(filepath=str(ROOT/'carlinga.glb'),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_animations=False)
blob=(ROOT/'carlinga.glb').read_bytes();L=struct.unpack_from('<I',blob,12)[0];doc=json.loads(blob[20:20+L])
assert len(doc['meshes'])==10 and all(len(m['primitives'])==1 for m in doc['meshes'])
assert all('COLOR_0' in m['primitives'][0]['attributes'] for m in doc['meshes'])
data=json.loads((ROOT/'carlinga.json').read_text(encoding='utf-8'))
assert all(m['alpha']==1 and len(m['vertexColor'])==len(m['position']) for m in data['meshes'])

# Review scene: deep-space gradient, faint procedural nebula, warm interior and cold rim.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True
scene.render.image_settings.file_format='PNG';scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
world=bpy.data.worlds.new('Espacio nebuloso');scene.world=world;world.use_nodes=True
nt=world.node_tree;nt.nodes.clear();out=nt.nodes.new('ShaderNodeOutputWorld');bg=nt.nodes.new('ShaderNodeBackground');bg.inputs['Strength'].default_value=.55
tc=nt.nodes.new('ShaderNodeTexCoord');noise=nt.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=2.7;noise.inputs['Detail'].default_value=3
nt.links.new(tc.outputs['Normal'],noise.inputs['Vector']);ramp=nt.nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(*kit.lin('0d1030'),1);ramp.color_ramp.elements[1].color=(*kit.lin('1a1440'),1)
nt.links.new(noise.outputs['Fac'],ramp.inputs[0]);nt.links.new(ramp.outputs[0],bg.inputs['Color']);nt.links.new(bg.outputs[0],out.inputs[0])
def area(name,pos,target,power,color,size):
    bpy.ops.object.light_add(type='AREA',location=kit.B(pos));o=bpy.context.object;o.name=name;o.data.energy=power;o.data.color=color;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(kit.B(target)-o.location).to_track_quat('-Z','Y').to_euler();return o
area('Luz interior cálida',(0,.6,.45),(0,-.8,-1.2),125,(1,.72,.40),3)
area('Hielo · luz rasante',(-3,3,-5),(0,-1,-4),650,(.40,.70,1),5)
area('Relleno de instrumentos',(1,.3,-.1),(0,-1.1,-.8),35,(.70,.85,1),2)
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.name='Ojo del piloto'
cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24;cam.data.lens=24/(2*math.tan(math.pi/6));cam.data.clip_start=.1;cam.data.clip_end=1600
def camera(pos,target):cam.location=kit.B(pos);cam.rotation_euler=(kit.B(target)-cam.location).to_track_quat('-Z','Y').to_euler()
def shot(name,pos,target,size):
    camera(pos,target);scene.render.resolution_x,scene.render.resolution_y=size;scene.render.filepath=str(ROOT/name);bpy.ops.render.render(write_still=True)
camera((0,0,0),(0,0,-1));scene.render.resolution_x=1600;scene.render.resolution_y=900
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'carlinga.blend'))
shot('render-juego.png',(0,0,0),(0,0,-1),(1600,900))
# HUD proof is a Blender compositor overlay only; no extra geometry or exported alpha.
scene.use_nodes=True;cn=scene.node_tree;cn.nodes.clear()
rl=cn.nodes.new('CompositorNodeRLayers');mask=cn.nodes.new('CompositorNodeBoxMask')
mask.inputs['Position'].default_value=(.5,.125)
# Box Mask measures both Size components against image width, not height.
mask.inputs['Size'].default_value=(1.01,.25*900/1600)
opacity=cn.nodes.new('CompositorNodeMath');opacity.operation='MULTIPLY';opacity.inputs[1].default_value=.78
mix=cn.nodes.new('CompositorNodeMixRGB');mix.blend_type='MIX';mix.inputs[2].default_value=(0,0,0,1)
out=cn.nodes.new('CompositorNodeComposite')
cn.links.new(mask.outputs[0],opacity.inputs[0]);cn.links.new(opacity.outputs[0],mix.inputs[0]);cn.links.new(rl.outputs['Image'],mix.inputs[1]);cn.links.new(mix.outputs[0],out.inputs[0])
shot('render-hud.png',(0,0,0),(0,0,-1),(1600,900));scene.use_nodes=False
shot('render-cerca.png',(0,0,0),(0,-math.sin(math.radians(20)),-math.cos(math.radians(20))),(1600,900))
shot('render-lateral.png',(0,0,0),(math.sin(math.radians(60)),0,-math.cos(math.radians(60))),(1200,900))
for o in parts:o.hide_render=o['part']!='comet_nose'
shot('render-proa.png',(3.1,1.4+NOSE_LIFT,-2.7),(0,-2.25+NOSE_LIFT,-6.0),(1200,900))
for o in parts:o.hide_render=False

def fmt(v):return '('+', '.join(f'{a:.4f}' for a in v)+')'
rows=[]
for m in data['meshes']:
    p=m['part'];seg=m.get('segment','—');axis='—';amp='0';speed='0';notes='Rígida'
    if p=='orrery_planet':axis='+Y local / vector meta en JSON';amp='360° continuo';speed=f"{meta['orbitSpeeds'][seg]:.6f} rad/s";notes=f"Radio {meta['orbitRadii'][seg]:.2f} u"
    if p=='gauge_needle':axis='+Y local / vector meta en JSON';amp='−120° a +120° (±2.0944 rad)';speed='respuesta 6 s⁻¹';notes='Interpolación exponencial; reposo a 0'
    if p=='beacon_lever':axis='+X local';amp='0 a 0.42 rad';speed='ataque 12 s⁻¹; retorno 8 s⁻¹';notes='Bisagra física; retorno amortiguado'
    rows.append(f"| {m['name']} | {p} | {seg} | {fmt(m['pivot'])} | {axis} | {amp} | {speed} | {notes} |")
report=f'''# ENTREGA — Carlinga del Cometa · El Cometa

## Estado
- Versión: v5. v4 de Astra (ronda extra 3 autorizada por Luis) + grietas de la proa rehechas por Claude. Fecha: 2026-09-15.
- Lista para revisión de Luis; integración a cargo del otro modelo.

## Archivos
| Archivo | Contenido |
|---|---|
| `modelar-carlinga.py` | Fuente bpy; regenera todos los entregables |
| `carlinga.blend` | Escena editable, cámara exacta de reposo y luces de revisión |
| `carlinga.glb` | Diez mallas, un material por malla, pigmento conectado |
| `carlinga.json` | Exportación mediante kit.export_parts; posiciones relativas al pivote |
| `render-juego.png`, `render-cerca.png`, `render-lateral.png`, `render-proa.png` | Cycles 40 muestras y denoise |
| `render-hud.png` | Vista de reposo con máscara negra al 78% sobre el 25% inferior; solo compositor Blender |

Regenerar desde esta carpeta:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 modelar-carlinga.py
```

## Datos técnicos
| Dato | Valor |
|---|---|
| Triángulos | {tris} |
| Partes / mallas / materiales por malla | 10 / 10 / 1 |
| Categorías part | 8; orrery_planet tiene 3 segmentos |
| Dimensiones ancho × alto × fondo | {size[0]:.3f} × {size[1]:.3f} × {size[2]:.3f} u |
| Origen | Ojo del jugador (0,0,0) |
| Frente | −Z Three / +Y Blender |
| JSON | {(ROOT/'carlinga.json').stat().st_size/1024:.1f} KiB |
| GLB | {len(blob)/1024:.1f} KiB |
| Transparencias | Ninguna; hielo opaco |

## Partes y animación
| Objeto | part | segment | Pivote Three | Eje | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|
{chr(10).join(rows)}

## Materiales
| Material / partes | Color principal | Metal / rugosidad | Emisión | Alfa |
|---|---|---|---|---|
| Hielo / frame_ice | #20415a → #6fa8c4; vetas #bee9f5 | 0.02 / 0.38 | 0 | 1 |
| Latón / frame_brass, board_brass, planetas, aguja, palanca | #c9a227 con desgaste claro y pátina | 0.85 / 0.30 | #c9a227 × 0.10 | 1 |
| Proa / comet_nose | Hielo azul y fisuras #6fd3ff | 0.025 / 0.34 | #12303f → #6fd3ff × 1.8 | 1 |
| Tablero / board | Madera #3a2a1e → #5a4230; escarcha #bee9f5; cuadrante #101e2b | 0 / 0.88 | 0 | 1 |

## Metadatos y ejes de integración
`eye=(0,0,0)`, `forward=-Z`, `size` en orden ancho/alto/fondo.
`boardPivot={fmt(BOARD_PIV)}`, `orreryCenter={fmt(ORRERY)}`, `gaugeCenter={fmt(GAUGE)}`, `beaconHinge={fmt(LEVER)}`.
`boardTiltRadians=+0.55`; `instrumentAxisY={fmt(meta['instrumentAxisY'])}`, `instrumentAxisX=(1,0,0)`.
`orbitRadii=[0.17,0.28,0.39]`; `orbitSpeeds=[0.642857,0.375,0.264706]` rad/s.

GLB conserva Rx(+0.55) en las partes del tablero: componer esa orientación base con el giro local Y. El JSON de kit aplica esa inclinación a vértices/normales (`jsonRotationBaked=true`): para planetas y aguja, rotar alrededor de `instrumentAxisY` en el espacio común. No volver a inclinar los vértices del JSON. La palanca usa X en ambos formatos. Todas las partes son independientes, sin jerarquía necesaria. Los planetas incluyen su desplazamiento orbital; no sumar el radio otra vez.

La proa conserva su pivote (0,0,0); solo su geometría sube `noseLift=0.75`. El GLB lleva una paleta emisiva empaquetada como textura de dos colores dentro de su único material. Como kit solo exporta emisión uniforme, el generador añade `emissionVertexColor` a `comet_nose` en el JSON: RGB lineal por vértice, misma longitud/orden que `position`, multiplicado por `emission=1.8`. El integrador debe usar ese canal para reproducir las grietas localizadas del GLB; ignorarlo deja solo la emisión oscura uniforme de respaldo. No requiere nuevas partes ni draw calls. `noseEmissionPalette` y `noseEmissionStrength` documentan sus colores e intensidad. `hudPreview` describe únicamente el render de comprobación.

## Comprobaciones del generador
- 10 objetos y 8 etiquetas part; segmentos 0–2 y centro compartido exacto.
- Órbitas muestreadas en 73 ángulos: error de plano < 0.000001 u.
- Un material por parte; COLOR_0 presente en las diez primitivas GLB; pigmento y alfa 1 presentes en JSON.
- Rayos desde el ojo: rectángulo central de 84% de ancho × 80% de alto (67.2% de pantalla), libre en {free_percent:.2f}% de {samples} muestras. Límites normalizados X=[−0.84,0.84], Y=[−0.60,1.0].
- Cámara de reposo en el origen, FOV vertical 60°; cercana con pitch −20° y lateral con yaw +60°; proa aislada solo durante su render.
- {len(instrument_probes)} rayos hacia los tres anillos y el cuadrante/bisel: ninguno interceptado por el latón del alféizar. Pivotes, centros y ejes de v3 conservados.
- Proa: {bow_fraction*100:.2f}% de su silueta proyectada completa visible desde reposo, por encima del alféizar/tablero (requisito ≥33.33%). Muestreo: {bow_visible}/{bow_total} rayos; {bow_above_hud} muestras visibles también por encima del HUD.

## Diferencias con el brief
Se conservan los pivotes, ejes y posiciones de instrumentos de v3: tablero en (0,−0.90,−1.30), inclinación +0.55 rad, cara superior como pivote. No se desplazan para esquivar el HUD. Las portillas en ±2.3 u, sus nuevas paredes y la proa con punta aproximadamente Z=−8.9 hacen que el conjunto exceda la caja aproximada del brief original; las dimensiones medidas están arriba. El dintel a Y=1.28 sigue fuera del campo vertical de reposo.
Cambios autorizados en ronda 3: filo trasladado al frente inferior del alféizar, bajo el plano del tablero; madera oscura envejecida con veta por vértice y escarcha en juntas/esquinas; paredes laterales continuas de hielo con portillas empotradas, sin tubos ni tira oscura en jambas; proa elevada 0.75 u y grietas emisivas a intensidad 1.8; render adicional de HUD. La proa continúa siendo opaca. La extensión emisiva del JSON se explica arriba.
El sextante y cuadrante comparten acabado mate de board; la empuñadura oscura de la palanca comparte latón de beacon_lever por el límite de un material por parte. Sin cristal de ventana ni partículas/HUD. BRIEF.md se conserva como documento fuente.

## Revisión propia
v5 (Claude): las vetas de la proa eran zigzags paralelos que parecían puntadas; ahora una fisura principal quebrada recorre el lomo y siete ramas bajan por los costados afinándose, con la misma paleta emisiva. Revisión v4: cinco renders inspeccionados, incluyendo HUD. Instrumentos completos sin cruce del filo, madera oscura con veta y escarcha, pared de hielo sin tuberías ni tira oscura de jamba, proa visible sobre el alféizar y sobre la máscara del HUD. La máscara comienza en la fila 675 de una imagen de 900 píxeles de alto. Las facetas de la proa son intencionales; remaches, esferas y perfiles metálicos usan normales suaves. El dintel permanece fuera de la vista de reposo.
'''
(ROOT/'ENTREGA.md').write_text(report,encoding='utf-8')
print('ENTREGA COMPLETA',flush=True)
