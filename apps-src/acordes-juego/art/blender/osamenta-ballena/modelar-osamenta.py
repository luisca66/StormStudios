"""Whale fall de Batisfera. Generador bpy, coordenadas Three, semilla fija.
Solo escribe junto a este archivo. Kit compartido sin modificaciones.
"""
import bpy, math, random, sys, json, struct
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parents[3]/'grados-mayores-juego'/'art'/'blender'))
import kit
from kit import B,lin
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
ART=bpy.data.collections.new('Osamenta y kit exportable');scene.collection.children.link(ART)
STAGE=bpy.data.collections.new('Revisión — no exportar');scene.collection.children.link(STAGE)
kit.setup(ART,190926);rng=random.Random(190926)
def mix(a,b,t):return tuple(x*(1-t)+y*t for x,y in zip(a,b))
def clamp(v):return max(0,min(1,v))
def bone(p):
    x,y,z=p;n=.5+.25*math.sin(x*3.7+z*2.4)+.15*math.sin(y*15+z*8+x*11)
    c=mix(lin('#7d7a70'),lin('#b9b3a4'),clamp(.3+.65*n))
    stain=.20*(.5+.5*math.sin(x*1.8-z*.8))**5
    return mix(c,lin('#554c4c'),stain)
def stone(p):
    x,y,z=p;n=.5+.5*math.sin(y*5+.25*math.sin(x*.9))
    return mix(lin('#0d151d'),lin('#293946'),.14+.73*n)
def material(name,emissive=False):
    m=bpy.data.materials.new(name);m.use_nodes=True;nt=m.node_tree;bs=nt.nodes['Principled BSDF']
    bs.inputs['Base Color'].default_value=(1,1,1,1);bs.inputs['Roughness'].default_value=.94;bs.inputs['Metallic'].default_value=0
    vc=nt.nodes.new('ShaderNodeVertexColor');vc.layer_name='Pigment';nt.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
    if emissive:
        im=bpy.data.images.new(name+' emisión embebida',width=256,height=1);im.colorspace_settings.name='Non-Color';pink=lin('#ff7fd0')
        im.pixels=[c for i in range(256) for c in (*[v*i/255 for v in pink],1)];im.pack()
        tx=nt.nodes.new('ShaderNodeTexImage');tx.image=im;tx.extension='EXTEND';tx.interpolation='Linear'
        nt.links.new(tx.outputs['Color'],bs.inputs['Emission Color']);bs.inputs['Emission Strength'].default_value=2.2
    return m
MATS={'bone':material('Hueso marfil erosionado · no emite'),'rock':material('Roca estratificada · no emite'),'life':material('Colonia y anémonas · emisión local rosa',True)}
V=[];F=[];C=[];E=[];OBJS=[];INFO={};EMASK={}
def add(v,f,color=bone,emission=0):
    off=len(V);V.extend(v);F.extend(tuple(off+i for i in face) for face in f)
    C.extend([color(p) if callable(color) else lin(color) if isinstance(color,str) else color for p in v])
    E.extend(emission if isinstance(emission,list) else [emission]*len(v))
def sweep(points,radii,sides=8,color=bone,emission=0,oval=1):
    pts=list(map(Vector,points));v=[];f=[];em=[];normal=Vector((0,1,0))
    if abs((pts[1]-pts[0]).normalized().y)>.9:normal=Vector((1,0,0))
    for i,p in enumerate(pts):
        tangent=(pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)]).normalized();normal=(normal-tangent*normal.dot(tangent)).normalized();cross=tangent.cross(normal)
        r=radii[i] if isinstance(radii,list) else radii
        e=emission[i] if isinstance(emission,list) else emission
        for j in range(sides):
            a=j*math.tau/sides;rr=r*(1+.045*math.sin(i*1.7+j*2.1));v.append(tuple(p+normal*(math.cos(a)*rr)+cross*(math.sin(a)*rr*oval)));em.append(e*(.35+.65*(.5+.5*math.cos(a))))
    for i in range(len(pts)-1):
        for j in range(sides):f.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    f.extend([tuple(reversed(range(sides))),tuple((len(pts)-1)*sides+j for j in range(sides))]);add(v,f,color,em)
def curved(points,n=5):return [tuple(p) for p in kit.catmull(points,n)]
def ellipsoid(center,scale,color=bone,seg=16,rings=8,emission=0):
    v=[];f=[]
    for k in range(rings+1):
        a=math.pi*(.006+(1-.012)*k/rings)
        for j in range(seg):
            b=j*math.tau/seg;r=1+.035*math.sin(b*3+a*7)
            v.append(tuple(center[i]+scale[i]*r*c for i,c in enumerate((math.sin(a)*math.cos(b),math.cos(a),math.sin(a)*math.sin(b)))))
    for k in range(rings):
        for j in range(seg):f.append((k*seg+j,k*seg+(j+1)%seg,(k+1)*seg+(j+1)%seg,(k+1)*seg+j))
    f.extend([tuple(reversed(range(seg))),tuple(rings*seg+j for j in range(seg))]);add(v,f,color,emission)
def finish(part,material_key,pivot=(0,0,0)):
    global V,F,C,E
    local=[tuple(Vector(p)-Vector(pivot)) for p in V];ob=kit.make(part,local,F,MATS[material_key],part=part,tint=0,smooth_angle=.72 if material_key=='rock' else math.pi);ob.location=B(pivot)
    ca=ob.data.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='POINT')
    for i,c in enumerate(C):ca.data[i].color=(*c,1)
    if material_key=='life':
        at=ob.data.attributes.new(name='EmissionMask',type='FLOAT',domain='POINT')
        for i,e in enumerate(E):at.data[i].value=e
        uv=ob.data.uv_layers.new(name='EmissionUV')
        for loop in ob.data.loops:uv.data[loop.index].uv=((.5+255*E[loop.vertex_index])/256,.5)
        EMASK[part]=list(E)
    ob.data.color_attributes.active_color=ob.data.color_attributes['Pigment'];ob.data.color_attributes.render_color_index=ob.data.color_attributes.find('Pigment')
    mn=[min(p[i] for p in V) for i in range(3)];mx=[max(p[i] for p in V) for i in range(3)];INFO[part]=dict(min=mn,max=mx,dimensions=[round(mx[i]-mn[i],3) for i in range(3)])
    if material_key=='life':
        peak=max(range(len(E)),key=lambda i:E[i]);INFO[part]['glowCenter']=[round(x,4) for x in local[peak]]
    OBJS.append(ob);V=[];F=[];C=[];E=[];return ob
# Repisa: techo continuo y fracturas horizontales, trasera curva penetrando 1.2 m.
def wallz(x):return math.sqrt(96**2-x*x)-84
def floor(x,z):return -.08+.065*math.sin(x*.65)*math.sin(z*.8)
NX,NZ=40,7;vv=[];ff=[]
for k in range(2):
    for i in range(NX+1):
        x=-14.5+36*i/NX;front=-1.6+.55*math.sin(x*.71)+.13*math.sin(x*2.7);back=wallz(x)+1.2
        for j in range(NZ+1):
            t=j/NZ;z=front+(back-front)*t
            y=floor(x,z) if k==0 else -2.1-1.7*(math.sin(math.pi*i/NX)**.7)*(.65+.35*math.sin(t*math.pi))+.22*math.sin(x*1.7+t*7)
            vv.append((x,y,z))
stride=(NX+1)*(NZ+1)
for k in range(2):
    for i in range(NX):
        for j in range(NZ):
            a=k*stride+i*(NZ+1)+j;ff.append((a,a+1,a+NZ+2,a+NZ+1))
# Six strata along exposed lip; broken band contours.
for i in range(NX):
    a=i*(NZ+1);b=(i+1)*(NZ+1);prev=[a,b]
    for level in range(1,5):
        if level==4:cur=[stride+a,stride+b]
        else:
            cur=[]
            for idx in [a,b]:
                p=Vector(vv[idx]).lerp(Vector(vv[stride+idx]),level/4);p.z+=.34*math.sin(level*2+p.x*.8);cur.append(len(vv));vv.append(tuple(p))
        ff.append((prev[0],prev[1],cur[1],cur[0]));prev=cur
for i in range(NX):
    a=i*(NZ+1)+NZ;b=(i+1)*(NZ+1)+NZ;ff.append((a,b,stride+b,stride+a))
for i in [0,NX]:
    for j in range(NZ):
        a=i*(NZ+1)+j;ff.append((a,a+1,stride+a+1,stride+a))
add(vv,ff,stone);finish('ledge','rock')
# Cráneo de misticeto: dos maxilares laminares, hendidura rostral y neurocráneo.
# Loft cerrado por secciones X con contorno oval y cresta desigual.
def loft(sections,sides=20):
    vv=[];ff=[]
    for k,(x,y,z,ry,rz) in enumerate(sections):
        for j in range(sides):
            a=j*math.tau/sides;noise=1+.045*math.sin(j*2.3+k*1.7);vv.append((x,y+ry*math.cos(a)*noise,z+rz*math.sin(a)*noise))
    for k in range(len(sections)-1):
        for j in range(sides):ff.append((k*sides+j,k*sides+(j+1)%sides,(k+1)*sides+(j+1)%sides,(k+1)*sides+j))
    ff.extend([tuple(reversed(range(sides))),tuple((len(sections)-1)*sides+j for j in range(sides))]);add(vv,ff)
for sign in [-1,1]:
    sec=[]
    for k in range(18):
        t=k/17;x=-11.2+9.25*t;separation=.05+1.26*t**1.5;z=2.0+.82*t+sign*separation
        sec.append((x,.45+1.85*t**1.35,z,.05+.40*t,.06+.65*math.sin(t*math.pi*.78)))
    loft(sec,14)
loft([(-3.0,2.25,2.85,.32,.7),(-2.55,2.45,2.9,.6,1.1),(-1.9,2.75,3.0,1.02,1.55),(-1.1,2.9,3.1,1.27,1.65),(-.35,2.95,3.2,1.15,1.25),(.35,3.0,3.25,.75,.7),(.62,3.0,3.3,.47,.48)],20)
# Supraoccipital crest and paired orbital arches with actual holes.
pts=curved([(-3.0,2.8,2.85),(-2.1,3.65,3),(-1.1,4.2,3.2),(-.1,3.55,3.3)],5);sweep(pts,[.1+.14*math.sin(math.pi*i/(len(pts)-1)) for i in range(len(pts))],8,oval=.7)
for sign in [-1,1]:
    pts=[]
    for j in range(29):
        a=j*math.tau/28;pts.append((-1.85+1.33*math.cos(a),2.35+.73*math.sin(a),3.0+sign*(1.8+.22*math.sin(a))))
    sweep(pts,[.15+.10*(.5+.5*math.sin(j*math.tau/28)) for j in range(29)],8)
# Mandíbulas desarticuladas; dos arcos sin dientes, con cóndilos ensanchados.
for controls in [[(-.35,.48,-.10),(-2.6,.3,-1.14),(-6,.20,-1.20),(-9,.24,-.10),(-11.45,.28,1.4)],[(.10,.46,6.65),(-3,.24,7.1),(-6.5,.18,5.8),(-9.5,.2,3.5),(-10.8,.24,2.0)]]:
    pts=curved(controls,7);r=[.10+.22*(1-i/(len(pts)-1))+.12*math.exp(-(i/3)**2) for i in range(len(pts))];sweep(pts,r,10,oval=.72)
finish('skull','bone',pivot=(0,0,0))
# Veinticuatro vértebras: centros erosionados, procesos transversos y arcos neurales.
VERTEBRAE=[]
def spinal(x):return (x,4.25-.013*x*x+.23*math.sin(x*.38)-.8*math.exp(-x*x/2),3.3+.32*math.sin(x*.22))
for i in range(24):
    x=.92+i*.735;r=.64*(1-.66*(i/23)**1.4);p=Vector(spinal(x));p.y=max(.45,p.y);VERTEBRAE.append((p,r))
    vv=[];ff=[];ns=10
    for k in range(6):
        t=k/5;xr=(t-.5)*(.52 if i<15 else .42);rr=r*(1-.22*math.sin(math.pi*t))
        for j in range(ns):
            a=j*math.tau/ns;ir=rr*(1+.075*math.sin(a*3+i));vv.append(tuple(p+Vector((xr,math.cos(a)*ir,math.sin(a)*ir*.94))))
    for k in range(5):
        for j in range(ns):ff.append((k*ns+j,k*ns+(j+1)%ns,(k+1)*ns+(j+1)%ns,(k+1)*ns+j))
    for end in [0,5]:
        center=len(vv);xx=(-.26+.10) if end==0 else (.26-.10)
        if i>=15:xx*=.42/.52
        vv.append(tuple(p+Vector((xx,0,0))))
        for j in range(ns):ff.append((center,end*ns+j,end*ns+(j+1)%ns))
    add(vv,ff)
    for sign in [-1,1]:
        pts=curved([tuple(p+Vector((0,-.04,sign*r*.65))),tuple(p+Vector((.12,.04,sign*r*1.5))),tuple(p+Vector((.28,-.15,sign*r*2.0)))],2)
        sweep(pts,[r*.22,r*.25,r*.19,r*.12,r*.025],6,oval=.55)
    if i<12:
        pts=[tuple(p+Vector((0,r*(.55+.50*math.sin(a)),r*.62*math.cos(a)))) for a in [j*math.pi/8 for j in range(9)]];sweep(pts,r*.14,6)
        pts=curved([tuple(p+Vector((0,r*.96,0))),tuple(p+Vector((.3,r*1.58,.05))),tuple(p+Vector((.48,r*1.85,.07)))],2);sweep(pts,[r*.22,r*.21,r*.15,r*.10,.025],6,oval=.65)
# Tres centros rodados, rotos junto a la cola.
for x,z,r in [(12.8,.1,.45),(15.5,5.4,.33),(18.25,3.0,.23)]:
    ellipsoid((x,r*.65,z),(r*.9,r*.65,r),seg=12,rings=5)
finish('spine','bone')
# Costillas de sección oval, unas ausentes y dos truncadas. Caja vencida hacia el pozo.
RIB_PATHS=[]
for i in range(11):
    x=1.1+i*.91;root=Vector(spinal(x));size=1-.023*i
    for sign in [-1,1]:
        if (sign==-1 and i in [3,7]) or (sign==1 and i==9):continue
        dz=3.75*size if sign<0 else 3.6*size
        controls=[tuple(root+Vector((-.1,-.05,sign*.45))),tuple(root+Vector((.1,-.2,sign*dz*.52))), (x+.35,3.4,root.z+sign*dz), (x+.55,1.30,root.z+sign*dz*1.03),(x+.65,.15,root.z+sign*dz*.64)]
        pts=curved(controls,6)
        if (i,sign) in [(1,-1),(8,1)]:pts=pts[:16]
        radii=[(.20-.006*i)*(1-.48*j/(len(pts)-1))*(1+.28*math.exp(-(j/3)**2)) for j in range(len(pts))]
        sweep(pts,radii,8,oval=.75);RIB_PATHS.append(pts)
# Fragmentos curvos apoyados, no toros cerrados.
for controls in [[(4.2,.18,-.9),(5.1,.16,-1.1),(6.2,.15,-.75),(6.8,.18,.1)],[(8.3,.2,7.1),(9.1,.12,6.8),(10.0,.16,5.8)],[(11,.2,.1),(12,.13,-.25),(13.2,.13,.3)]]:
    pts=curved(controls,5);sweep(pts,[.13*(1-.35*j/(len(pts)-1)) for j in range(len(pts))],8,oval=.75)
finish('ribs','bone')
# La colonia es un solo material: película rugosa, valvas acanaladas y Osedax rojo.
PALE=lin('#c9c6b7');RED=lin('#7a2f3a')
def patch(center,rx,rz,ywave=.02):
    vv=[center];ff=[];n=15
    for j in range(n):
        a=j*math.tau/n;r=1+.14*math.sin(5*a+center[0]);vv.append((center[0]+rx*r*math.cos(a),center[1]+ywave*math.sin(a*3),center[2]+rz*r*math.sin(a)))
    for j in range(n):ff.append((0,j+1,(j+1)%n+1))
    add(vv,ff,lambda p:mix(lin('#7e8582'),lin('#cfe8ff'),.45+.16*math.sin(p[0]*14)),[.08]+[0 if j%4==0 else .025 for j in range(n)])
for i in range(24):
    x=rng.uniform(-10.2,17);z=rng.uniform(-1.0,7.5);patch((x,floor(x,z)+.03,z),rng.uniform(.25,.75),rng.uniform(.16,.42))
for i,(p,r) in enumerate(VERTEBRAE[:18]):
    patch((p.x,p.y+r+.022,p.z),.20,r*.35,.018)
    if i%2==0:
        for j in range(8):
            a=j*math.tau/8;root=p+Vector((rng.uniform(-.18,.18),r*.91,r*.25*math.sin(a)));h=rng.uniform(.16,.35)
            pts=[tuple(root),tuple(root+Vector((.015,h*.55,.01))),tuple(root+Vector((.05,h,.02)))]
            sweep(pts,[.026,.024,.008],4,color=lambda q:mix(RED,lin('#a94c58'),.24),emission=0)
# Patches on the jaw, supported on upper faces.
for x,z in [(-2.5,-1.05),(-5.8,-1.1),(-8.8,-.02),(-4.2,6.7)]:patch((x,.47,z),.32,.10,.015)
# Fan-shaped clam valves, radially fluted and joined along their hinge.
def clam(center,scale,angle):
    vv=[];ff=[];seg=8;nr=3
    for valve in [-1,1]:
        off=len(vv)
        for k in range(nr+1):
            t=.035+.965*k/nr
            for j in range(seg+1):
                a=-1.2+2.4*j/seg;xx=math.sin(a)*t*scale;zz=math.cos(a)*t*scale*1.35
                y=.025+scale*(.30*math.sin(t*math.pi)+.025*math.cos(j*math.pi))*abs(math.cos(a))
                if valve<0:y*=.3
                vv.append((center[0]+xx*math.cos(angle)-zz*math.sin(angle),center[1]+y,center[2]+xx*math.sin(angle)+zz*math.cos(angle)))
        for k in range(nr):
            for j in range(seg):
                a=off+k*(seg+1)+j;ff.append((a,a+1,a+seg+2,a+seg+1))
    add(vv,ff,lambda p:mix(lin('#8e9290'),lin('#d0cbc0'),.55+.25*math.sin(p[0]*24+p[2]*31)),0)
for i in range(22):
    center=rng.choice([(-7,.02,1),(0,.01,-.9),(5,.01,6.3),(11,.01,1),(14,.01,5)])
    x=center[0]+rng.uniform(-.65,.65);z=center[2]+rng.uniform(-.45,.45);clam((x,floor(x,z)+.025,z),rng.uniform(.15,.29),rng.uniform(-3,3))
finish('colony','life')
# Tres anémonas: columnas blandas plegadas y tentáculos; ningún ojo, hoja o esfera.
LANTERN_META={}
def polyp(center,height,radius,tentacles,sides,bodyrings,tentrings,phase):
    vv=[];ff=[];ee=[];nr=bodyrings
    # Profile returns inward to a recessed oral disc: closed base, open crown geometry.
    profile=[(.85,0),(.98,.05),(.65,.20),(.62,.47),(.82,.70),(1,.77),(.72,.78),(.20,.73)]
    # Resample to requested rings while preserving crown turn.
    if nr==6:profile=[profile[i] for i in [0,1,3,5,6,7]]
    for k,(r,t) in enumerate(profile):
        for j in range(sides):
            a=j*math.tau/sides;rr=radius*r*(1+.085*math.cos(a*6+phase));vv.append((center[0]+rr*math.cos(a)+.08*height*t*t*math.sin(phase),center[1]+height*t,center[2]+rr*math.sin(a)))
            ee.append(0 if k<3 else [.05,.18,.55,.40,.14][min(4,k-3)]*(.75+.25*math.sin(a*3)**2))
    for k in range(len(profile)-1):
        for j in range(sides):ff.append((k*sides+j,k*sides+(j+1)%sides,(k+1)*sides+(j+1)%sides,(k+1)*sides+j))
    ff.extend([tuple(reversed(range(sides))),tuple((len(profile)-1)*sides+j for j in range(sides))])
    add(vv,ff,lambda p:mix(lin('#594252'),lin('#ac758e'),clamp((p[1]-center[1])/height)),ee)
    for j in range(tentacles):
        a=j*math.tau/tentacles+phase;pts=[];rr=[];em=[]
        for k in range(tentrings):
            t=k/(tentrings-1);rad=radius*(.91+.72*math.sin(t*math.pi*.78));h=height*(.76+.24*t)+.04*math.sin(j*2)*t
            aa=a+.15*math.sin(t*math.pi);pts.append((center[0]+rad*math.cos(aa)+.08*height*.77**2*math.sin(phase),center[1]+h,center[2]+rad*math.sin(aa)))
            rr.append(radius*.12*(1-.83*t));em.append(.18+.65*t*t)
        sweep(pts,rr,6 if tentacles>8 else 5,color=lambda p:mix(lin('#ad708e'),lin('#ffd0e8'),clamp((p[1]/height-.65)*2)),emission=em)
polyp((0,0,0),2.15,.53,12,14,8,7,.2);a=finish('lantern-a','life')
polyp((0,0,0),3.15,.45,10,12,8,8,1.7);b=finish('lantern-b','life')
for center,h,r,ph in [((-.38,0,.12),1.65,.28,.2),((.32,0,.22),2.25,.3,2),((0,0,-.36),1.35,.25,4)]:polyp(center,h,r,6,10,6,5,ph)
c=finish('lantern-c','life')
for p in ['lantern-a','lantern-b','lantern-c']:LANTERN_META[p]=dict(height=INFO[p]['dimensions'][1],glowCenter=INFO[p]['glowCenter'])
ANCHORS=[[-9,.08,3.5],[-6,.02,6],[-2,.02,-.8],[1.5,.01,7],[4.8,.03,-.8],[7,.02,7.4],[10.8,.02,1],[14,.03,4.7],[16,.04,1.6],[-1.1,4.20,3.2]]
GAPS=[[3.88,2.0,1.3],[7.52,2.0,1.4],[11.2,1.5,2.0]]
for ob in OBJS:
    ob.data.color_attributes.active_color=ob.data.color_attributes['Pigment'];ob.data.color_attributes.render_color_index=ob.data.color_attributes.find('Pigment')
parts,tris=kit.export_parts(ROOT/'osamenta-ballena.json',objects=OBJS,meta=dict(lanternAnchors=ANCHORS,lanterns=LANTERN_META,ribGaps=GAPS,wallRadius=96,wallCenter=[0,0,-84],forward='-Z'))
payload=json.loads((ROOT/'osamenta-ballena.json').read_text(encoding='utf-8'));COUNTS={};pink=lin('#ff7fd0')
for entry,ob in zip(payload['meshes'],OBJS):
    part=entry['part'];COUNTS[part]=len(entry['index'])//3
    assert len(entry.get('vertexColor',[]))==len(entry['position']),f'Falta Pigment: {part}'
    if part in EMASK:
        lookup={tuple(round(c,5) for c in (v.co.x,v.co.z,-v.co.y)):e for v,e in zip(ob.data.vertices,EMASK[part])}
        es=[lookup[tuple(entry['position'][i:i+3])] for i in range(0,len(entry['position']),3)]
        entry['vertexEmission']=[round(v*e,6) for e in es for v in pink];entry['emissionColor']=[1,1,1];entry['emission']=2.2
        assert min(es)==0 and max(es)>0
    else:assert entry['emission']==0
payload['vertexEmissionEncoding']='linear RGB triplet per vertex, same ordering as position; multiply by emission; exact zero is off (same as jardin-corales)'
(ROOT/'osamenta-ballena.json').write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
BONE_TRIS=sum(COUNTS[p] for p in ['ledge','skull','spine','ribs','colony'])
assert BONE_TRIS<=26000,(BONE_TRIS,COUNTS)
assert all(COUNTS[p]<=1200 for p in LANTERN_META),COUNTS
assert INFO['ledge']['dimensions'][0]<=44 and INFO['ledge']['dimensions'][2]<=16
skeletal=['skull','spine','ribs'];slen=max(INFO[p]['max'][0] for p in skeletal)-min(INFO[p]['min'][0] for p in skeletal)
assert 26<=slen<=32 and max(INFO[p]['max'][1] for p in skeletal)<=14
assert all(INFO[p]['dimensions'][1]<=h for p,h in [('lantern-a',2.5),('lantern-b',3.5),('lantern-c',3)])
assert parts==8
bpy.ops.object.select_all(action='DESELECT')
for ob in OBJS:ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'osamenta-ballena.glb'),export_format='GLB',use_selection=True,export_extras=True)
# Structural self-review of GLB pigment and single primitive per part.
raw=(ROOT/'osamenta-ballena.glb').read_bytes();g=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
assert len(g['meshes'])==8 and all(len(m['primitives'])==1 and 'COLOR_0' in m['primitives'][0]['attributes'] for m in g['meshes'])
print('EXPORT',parts,'partes',tris,'triángulos; OSAMENTA',BONE_TRIS,'COUNTS',COUNTS,'ESLORA',round(slen,3),'DIMENSIONS',INFO,flush=True)
# Escena de revisión. Copias de anémonas colocadas según meta, fuera de exportación.
kit.setup(STAGE,42);SKELETON=OBJS[:5];LANTERNS=OBJS[5:];copies=[]
for i,pos in enumerate(ANCHORS):
    src=LANTERNS[i%3];ob=src.copy();ob.data=src.data;STAGE.objects.link(ob);ob.location=B(pos);ob.rotation_euler.z=i*2.4;s=.65+.22*(i%3);ob.scale=(s,s,s);del ob['part'];copies.append(ob)
for i,ob in enumerate(LANTERNS):ob.location=B((26+i*3,0,0));ob.hide_render=True
wm=bpy.data.materials.new('Pared de revisión');wm.use_nodes=True;wbs=wm.node_tree.nodes['Principled BSDF'];wbs.inputs['Base Color'].default_value=(*lin('#111c28'),1);wbs.inputs['Roughness'].default_value=.97
vv=[(96*math.sin(-.55+i*1.1/80),y,96*math.cos(-.55+i*1.1/80)-84) for y in [-35,40] for i in range(81)]
wall=kit.make('Pared curva R96 — solo revisión',vv,[(i,i+1,i+82,i+81) for i in range(80)],wm);del wall['part']
world=bpy.data.worlds.new('Abismo sin luz ambiente');scene.world=world;world.use_nodes=True;nt=world.node_tree;nt.nodes.clear()
out=nt.nodes.new('ShaderNodeOutputWorld');bg=nt.nodes.new('ShaderNodeBackground');bg.inputs['Color'].default_value=(*lin('#01050a'),1)
black=nt.nodes.new('ShaderNodeBackground');black.inputs['Strength'].default_value=0;lp=nt.nodes.new('ShaderNodeLightPath');mx=nt.nodes.new('ShaderNodeMixShader');nt.links.new(lp.outputs['Is Camera Ray'],mx.inputs[0]);nt.links.new(black.outputs[0],mx.inputs[1]);nt.links.new(bg.outputs[0],mx.inputs[2]);nt.links.new(mx.outputs[0],out.inputs[0])
fm=bpy.data.materials.new('Agua · absorción volumétrica .006');fm.use_nodes=True;fn=fm.node_tree;fn.nodes.clear();fo=fn.nodes.new('ShaderNodeOutputMaterial');vol=fn.nodes.new('ShaderNodeVolumeAbsorption');vol.inputs['Density'].default_value=.006;vol.inputs['Color'].default_value=(.25,.4,.55,1);fn.links.new(vol.outputs[0],fo.inputs['Volume'])
bpy.ops.mesh.primitive_cube_add(size=2,location=B((0,10,-28)));fog=bpy.context.object;fog.name='Agua de revisión';fog.scale=(80,65,85);fog.data.materials.append(fm)
for co in list(fog.users_collection):co.objects.unlink(fog)
STAGE.objects.link(fog)
cd=bpy.data.cameras.new('Cámara Batisfera');cam=bpy.data.objects.new(cd.name,cd);STAGE.objects.link(cam);scene.camera=cam
cd.sensor_fit='VERTICAL';cd.sensor_height=24;cd.lens=24/(2*math.tan(math.radians(30)));cd.clip_start=.1;cd.clip_end=400
ld=bpy.data.lights.new('Faro frío del jugador','AREA');ld.volume_factor=0;ld.color=lin('#cfe8ff');ld.shape='DISK';ld.size=4
lamp=bpy.data.objects.new(ld.name,ld);STAGE.objects.link(lamp)
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.cycles.max_bounces=4;scene.cycles.volume_bounces=0
scene.render.resolution_x=1600;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
def camera(pos,target,power=None):
    cam.location=B(pos);cam.rotation_euler=(B(target)-cam.location).to_track_quat('-Z','Y').to_euler();lamp.location=cam.location;lamp.rotation_euler=cam.rotation_euler
    distance=(Vector(pos)-Vector(target)).length;ld.energy=power if power is not None else distance**2*8
    ld.size=max(1,distance*.045)
def render(name):
    scene.render.filepath=str(ROOT/name);print('RENDER',name,flush=True);bpy.ops.render.render(write_still=True)
camera((3,6,-62),(3,2.5,2.906));render('render-juego.png');ld.energy=0;render('render-oscuro.png')
target=Vector((2,2.5,2.5));direction=Vector((-.25,-.10,-1)).normalized();camera(tuple(target+direction*20),target);render('render-cerca.png')
scene.render.resolution_x=1200;target=Vector((-5.2,1.4,2.7));direction=Vector((-.25,.45,-1)).normalized();camera(tuple(target+direction*11.5),target);render('render-craneo.png')
# Dos paneles de 800 × 900, las tres variantes juntas, con/sin faro.
for ob in SKELETON+copies+[wall]:ob.hide_render=True
fog.hide_render=True
for ob,x in zip(LANTERNS,[-1.8,0,1.8]):ob.hide_render=False;ob.location=B((x,0,0))
scene.render.resolution_x=800;panels=[]
for i in range(2):
    target=Vector((0,1.6,0));direction=Vector((0,.12,-1)).normalized();camera(tuple(target+direction*6),target,power=100 if i==0 else 0)
    path=ROOT/('_panel-'+str(i)+'.png');scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
    im=bpy.data.images.load(str(path),check_existing=False);panels.append(list(im.pixels));bpy.data.images.remove(im);path.unlink()
combined=bpy.data.images.new('Anémonas · con faro / sin faro',width=1600,height=900);pix=[]
for y in range(900):
    for panel in panels:pix.extend(panel[y*800*4:(y+1)*800*4])
combined.pixels=pix;combined.filepath_raw=str(ROOT/'render-anemonas.png');combined.file_format='PNG';combined.save();bpy.data.images.remove(combined)
for ob in SKELETON+copies+[wall]:ob.hide_render=False
for i,ob in enumerate(LANTERNS):ob.location=B((26+i*3,0,0));ob.hide_render=True
scene.render.resolution_x=1600;target=Vector((3,1.3,3));camera(tuple(target+Vector((.18,.04,-1)).normalized()*45),target);render('render-perfil.png')
fog.hide_render=False;camera((3,6,-62),(3,2.5,2.906))
# Keep the separate kit visible in the saved workspace, excluded from the review camera.
for ob in LANTERNS:ob.hide_set(False)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'osamenta-ballena.blend'))
rows='\n'.join(f"| {p} | {COUNTS[p]} | {' × '.join(map(str,INFO[p]['dimensions']))} | (0, 0, 0) | Fija; 0 rad; 0 rad/s |" for p in COUNTS)
report=f'''# ENTREGA — Osamenta de ballena y anémonas-farol · Batisfera

## Estado
Versión v3, segunda y última ronda de corrección. 2026-09-17. Revisión propia completada; lista para revisión de Luis.

## Archivos
| Archivo | Contenido |
|---|---|
| modelar-osamenta.py | Fuente bpy reproducible; regenera todos los entregables |
| osamenta-ballena.blend | 5 partes del hito y 3 anémonas editables; escenografía separada |
| osamenta-ballena.glb | 8 mallas, un material por malla, pigmento y emisión embebida |
| osamenta-ballena.json | kit.export_parts; vertexColor en todas y vertexEmission solo en colonia/anémonas |
| render-juego.png / render-oscuro.png | 65 u, FOV vertical 60°, 1600×900, con/sin faro |
| render-cerca.png | 20 u, tres cuartos ligeramente inferior, 1600×900 |
| render-craneo.png | Cráneo y mandíbulas, 11.5 u, 1200×900 |
| render-anemonas.png | Con faro a la izquierda / solo emisión a la derecha; 6 u, 1600×900 |
| render-perfil.png | Perfil longitudinal a 45 u, curva R96, sin niebla, 1600×900 |

Regenerar desde esta carpeta:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 modelar-osamenta.py
```

## Datos técnicos y partes
Osamenta incluida repisa y colonia: **{BONE_TRIS} triángulos, 5 mallas**.
Kit completo: **{tris} triángulos, 8 mallas**. Esqueleto: **{slen:.3f} u de eslora X**.
Dimensiones de la repisa: **{INFO['ledge']['dimensions']} u**. Ejes: Y arriba; frente −Z; cráneo −X.
Origen: apoyo posterior del cráneo, superficie nominal y=0; exportación sin separaciones de presentación.
JSON: {(ROOT/'osamenta-ballena.json').stat().st_size/1024:.1f} KiB.

| Objeto / part | Triángulos | Dimensiones X × Y × Z (u) | Pivote Three | Animación geométrica |
|---|---|---|---|---|
{rows}
Sin segment. Geometría fija. El juego puede modular emisión; no mover la osamenta.

## Materiales
| Material / partes | Color | Metal / rugosidad | Emisión | Alfa |
|---|---|---|---|---|
| Hueso: skull, spine, ribs | Pigmento #7d7a70–#b9b3a4, manchas oscuras | 0 / .94 | 0 exacto | 1 |
| Roca: ledge | #0d151d–#293946, estratos | 0 / .94 | 0 exacto | 1 |
| Vida: colony y lantern-* | Bacterias pálidas, valvas marfil, Osedax #7a2f3a y tejidos rosa | 0 / .94 | Rosa #ff7fd0, 2.2 × máscara local | 1 |
Pigmento conectado a Base Color en Blender y COLOR_0 en GLB. Atributo reactivado por nombre inmediatamente antes de exportar.
Una sola llamada por malla: no hay parte emisiva adicional ni transparencias.
JSON conserva el convenio del jardín: vertexEmission contiene una terna RGB lineal por vértice (misma longitud que position); multiplicar por emission=2.2. emissionColor blanco. Los ceros son exactos.
El GLB reproduce esa máscara mediante EmissionUV y una rampa embebida. EmissionMask en Blender es escalar.
Almejas y gusanos no emiten; solo parches de bacterias y coronas de anémonas. Los huesos no tienen vertexEmission.

## Meta
Claves en la raíz del JSON:
- wallRadius=96; wallCenter=[0,0,-84]; forward="-Z".
- lanternAnchors={json.dumps(ANCHORS)}. Diez posiciones Three para instancias; las copias de revisión no se exportan.
- lanterns={json.dumps(LANTERN_META)}. glowCenter local sirve para un destello.
- ribGaps={json.dumps(GAPS)}. Tres centros de pasos entre costillas, sin volumen de colisión garantizado.
Trasera de repisa: z=sqrt(96²−x²)−84+1.2; penetración radial aproximada 1.2 u.

## Diferencias con el brief
- vertexEmission usa RGB como el jardín integrado, una terna por vértice en vez de un escalar; el atributo Blender sí es escalar.
- El volumen de revisión usa absorción Cycles .006, sin dispersión del faro para evitar un velo blanco; la niebla exponencial .022–.028 corresponde al integrador.
- Cámara de descubrimiento a 65 u del objetivo desde el lado del centro del pozo; no está sobre el eje exacto local z=−84.

## Sugerencias para integrar
Instanciar anémonas desde sus pivotes cero usando lanternAnchors; no importar copias de revisión, pared, volumen, cámara o faro.
Pulso suave de coronas: multiplicador 1 + 0.12 sin(2π·0.055·t + fase), ±12 %, .055 ciclos/s, fase distinta por instancia.
Colonia: multiplicador 1 + 0.06 sin(2π·0.025·t), ±6 %, .025 ciclos/s. Mantener todos los ceros; no iluminar el hueso por emisión.
No animar traslación, rotación o escala de la osamenta (0 rad, 0 rad/s).
'''
report += '''
## Revisión propia
Se miraron los seis renders finales; Cycles, 32 muestras, denoise y las resoluciones pedidas. Dos rondas de corrección agotadas.
- Medidas y pared: conformes. Hito completo X × Y × Z = 36.000 × 9.465 × 15.775 u; cota superior del hueso 5.489 u sobre y=0. La repisa penetra 1.2 u en la curva.
- Presupuesto: conformes las 5 mallas del hito y cada una de las 3 anémonas; comprobado por kit.export_parts y aserciones del generador.
- Anatomía y silueta: cráneo largo sin dientes, dos mandíbulas desarticuladas, 24 vértebras articuladas más 3 centros rodados, 19 costillas (2 truncadas) y 3 fragmentos caídos. Se distinguen cabeza, columna y caja abierta a 65 u con faro.
- Oscuridad: quedan coronas rosa separadas y pequeñas esteras; el hueso desaparece casi por completo al retirar el faro, salvo reflejos locales de la colonia.
- Volumen: maxilares, arcos orbitarios, cresta, procesos vertebrales y costillas ovales con curvas continuas. No se usaron toros cerrados como costillas ni cajas como cráneo.
- Cerca: las formas principales son suaves. Persisten pequeños quiebres de silueta en algunos tentáculos, especialmente lantern-c; el requisito de ausencia total de facetas no se considera plenamente cumplido. No se hizo una tercera ronda.
- Pigmento: variación por vértice en todas las partes; la erosión del hueso es sutil bajo el faro frío. Almejas y Osedax se reservan para las vistas próximas.
- Emisión: hueso y roca con emisión 0 y sin vertexEmission. Colonia y anémonas con máscara local y ceros exactos; sin emisión añadida al hueso para facilitar la vista distante.
- Exportación: las 8 mallas del GLB contienen COLOR_0 y una primitiva cada una; las 8 del JSON tienen vertexColor alineado con position. Todos los pivotes exportados son (0,0,0).
- Meta: 10 anclajes, 3 variantes con altura y glowCenter, 3 ribGaps y datos de pared completos. Las copias de anémonas de los renders pertenecen solo a la revisión.
- Reproducibilidad: ejecución completa con bpy-run.ps1 de Luis; todos los archivos se generan junto al script. Sin archivos temporales en la entrega.

Límite artístico pendiente de aprobación: las anémonas conservan un acabado algo facetado en las puntas; la osamenta es una interpretación estilizada, con la superficie picada representada de forma discreta mediante irregularidad y pigmento.'''
(ROOT/'ENTREGA.md').write_text(report,encoding='utf-8')




