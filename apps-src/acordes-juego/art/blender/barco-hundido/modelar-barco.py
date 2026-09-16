"""Barco hundido de Batisfera. Fuente bpy reproducible; todas las salidas junto al script."""
import bpy, math, json, sys, random
from pathlib import Path
from mathutils import Vector, Matrix
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parents[3]/"grados-mayores-juego"/"art"/"blender"))
import kit
from kit import B,T,lin
rng=random.Random(16092026)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
ART=bpy.data.collections.new("Barco hundido"); scene.collection.children.link(ART)
STAGE=bpy.data.collections.new("Solo revisión"); scene.collection.children.link(STAGE)
kit.setup(ART,16092026)
MATS={}
for key,rough in [("ledge",.95),("hull",.88),("debris",.94),("growth",.90),("lamp",.78)]:
    m=bpy.data.materials.new(key); m.use_nodes=True
    bs=m.node_tree.nodes["Principled BSDF"]
    bs.inputs["Base Color"].default_value=(1,1,1,1); bs.inputs["Roughness"].default_value=rough
    bs.inputs["Metallic"].default_value=.08 if key=="hull" else 0
    vc=m.node_tree.nodes.new("ShaderNodeVertexColor"); vc.layer_name="Pigment"
    m.node_tree.links.new(vc.outputs["Color"],bs.inputs["Base Color"])
    if key=="lamp":
        bs.inputs["Emission Color"].default_value=(*lin("#9fe8ff"),1)
        bs.inputs["Emission Strength"].default_value=1.2
    MATS[key]=m
CURRENT="hull"
SHIP=T((0,1.25,2), (math.radians(18),0,math.radians(3)))
def S(p): return tuple(SHIP@Vector(p))
def mix(a,b,t): return tuple(x*(1-t)+y*t for x,y in zip(a,b))
def pigment(p,base,kind):
    x,y,z=p
    noise=.5+.5*math.sin(x*1.4+math.sin(y*2.5)+z*1.7)*math.sin(y*.8+z*.6)
    color=lin(base)
    if kind=="hull":
        rust=lin("#7a4a30"); paint=lin("#4f5f5a")
        if base=="#5b3a2a":
            # Pintura vieja arriba; el óxido chorrea en vetas verticales desde la borda
            # y se come la pintura en manchas grandes, más abajo que arriba.
            streak=(.5+.5*math.sin(x*2.1+1.3*math.sin(x*.37)+z*.2))**3
            blotch=.5+.5*math.sin(x*.29+y*.35+1.7)*math.cos(x*.13-y*.5)
            drip=max(0,min(1,(sheer(x)-y)/4.0))
            eaten=max(0,min(1,.42+.6*streak*(.35+.65*drip)+.7*(blotch-.5)))
            color=mix(paint,lin("#5b3a2a"),eaten)
        color=mix(color,rust,.18*noise)
    return tuple(max(0,c*(.84+.28*noise)) for c in color)
def make(name,v,f,color,ship=False,smooth=.65,bev=0):
    vv=[S(p) for p in v] if ship else v
    ob=kit.make(name,vv,f,MATS[CURRENT],part=CURRENT,smooth_angle=smooth,tint=0)
    attr=ob.data.color_attributes.new(name="Pigment",type="FLOAT_COLOR",domain="POINT")
    for i,c in enumerate(attr.data): c.color=(*pigment(v[i],color,CURRENT),1)
    if bev: kit.bevel(ob,bev,2)
    return ob
def box(name,pos,size,color,ship=False,bev=.045,rot=(0,0,0)):
    v,f=kit.g_box(*size); mat=T(pos,rot)
    return make(name,[tuple(mat@Vector(p)) for p in v],f,color,ship,bev=bev)
def pipe(name,pts,r,color,ship=False,sides=8):
    verts=[]; faces=[]
    for i,p in enumerate(pts):
        tangent=Vector(pts[min(i+1,len(pts)-1)])-Vector(pts[max(0,i-1)])
        tangent.normalize(); ref=Vector((0,1,0)) if abs(tangent.y)<.9 else Vector((1,0,0))
        u=tangent.cross(ref).normalized(); w=tangent.cross(u).normalized()
        for j in range(sides):
            a=math.tau*j/sides
            verts.append(tuple(Vector(p)+r*(u*math.cos(a)+w*math.sin(a))))
    for i in range(len(pts)-1):
        for j in range(sides): faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    faces += [tuple(reversed(range(sides))),tuple((len(pts)-1)*sides+j for j in range(sides))]
    return make(name,verts,faces,color,ship,smooth=.9)
def lathe(name,profile,pos,color,ship=False,segments=24,rot=(0,0,0)):
    v,f=kit.g_lathe(profile,segments)
    if name=="Esponja tubular":
        v=[(x*(1+.08*math.sin(math.atan2(z,x)*3+y*5))+.07*math.sin(y*4),
            y,z*(1+.10*math.cos(math.atan2(z,x)*3+y*4))) for x,y,z in v]
    mat=T(pos,rot)
    return make(name,[tuple(mat@Vector(p)) for p in v],f,color,ship,smooth=.9)
def rivet(name,pos,color="#76513b",ship=True,r=.045):
    # Petit dôme, huit secteurs, suffisamment lisse à la distance minimale.
    return lathe(name,[(r,0),(r*.9,r*.6),(.001,r)],pos,color,ship,8,rot=(math.pi/2,0,0))
# Repisa estratificada, raccord exact à la paroi cylindrique.
CURRENT="ledge"
xs=[-24+i*48/24 for i in range(25)]
def wallz(x): return math.sqrt(96**2-x*x)-84
perimeter=[(x,-3.0-.6*math.cos(x*.32)) for x in xs]+[(x,wallz(x)+2.0) for x in reversed(xs)]
N=len(perimeter); verts=[]
for layer,y in enumerate([0,-1.2,-2.0,-3.7,-4.5,-6.4,-7.1,-9.1,-11.8]):
    shrink=[1,1.0,.965,.97,.9,.89,.79,.65,.45][layer]
    for i,(x,z) in enumerate(perimeter):
        xx=x*shrink
        rear=i>=25
        zz=wallz(xx)+2 if rear else z+(1-shrink)*9+.3*math.sin(i*1.7+layer)
        yy=y if rear else y+(.18*math.sin(i*.9+layer) if layer else -.18*abs(math.sin(i)))
        verts.append((xx,yy,zz))
faces=[]
for k in range(8):
    for i in range(N):
        a=k*N+i;b=k*N+(i+1)%N;c=(k+1)*N+(i+1)%N;d=(k+1)*N+i
        faces.extend([(a,b,c),(a,c,d)])
# Surface rayonnée en triangles, origine au point d'appui.
verts.append((0,0,3)); top=len(verts)-1
for i in range(N): faces.append((top,i,(i+1)%N))
faces.append(tuple(reversed(range(8*N,9*N))))
ledge=make("Repisa de estratos rotos",verts,faces,"#1f2a33",smooth=.15)
# Bandes de schiste lisibles, pigment par strate.
attr=ledge.data.color_attributes["Pigment"]
for i,c in enumerate(attr.data):
    p=verts[i]; fac=.5+.5*math.sin(p[1]*3.0)
    c.color=(*mix(lin("#0d151d"),lin("#293946"),.28+.5*fac),1)
# Sedimento acumulado contra el casco: montículo bajo a lo largo de la quilla.
sv=[];sf=[];NX,NZ=26,10
for i in range(NX+1):
    for j in range(NZ+1):
        x=-20+40*i/NX; z=-4.4+8.8*j/NZ
        h=1.25*max(0,1-(z/4.4)**2)**1.3*max(0,1-(x/20)**4)
        sv.append((x,h-.08+.12*math.sin(x*1.3+z*2.1)*h,z+.8))
for i in range(NX):
    for j in range(NZ):
        q=i*(NZ+1)+j; sf.append((q,q+1,q+NZ+2,q+NZ+1))
mound=make("Sedimento contra la quilla",sv,sf,"#26323c",smooth=.6)
ma=mound.data.color_attributes["Pigment"]
for i,c in enumerate(ma.data):
    x,y,z=sv[i]; c.color=(*mix(lin("#1b2630"),lin("#3a4650"),min(1,.25+y*.45)),1)
# Coques du vapeur: 36 m, proue droite à +X.
CURRENT="hull"
def width(x):
    # Proa: se afila hasta la roda con un leve cóncavo. Popa: bovedilla redondeada.
    if x>6: return max(.04,3.65*(1-(min(1,(x-6)/12.0))**1.7))
    if x<-11: return max(.9,3.65*math.sqrt(max(0,1-(min(1,(-11-x)/7.6))**2.2)))
    return 3.65
def depth(x):
    # Calado: pie de roda curvo a proa y bovedilla que se levanta a popa.
    if x>11: return max(.35,4.85*(1-(min(1,(x-11)/7.2))**2.4))
    if x<-12: return max(1.6,4.85*(1-.66*(min(1,(-12-x)/6.0))**1.5))
    return 4.85
def sheer(x): return 5.0+.65*(abs(x)/18)**3+.45*max(0,x/18)
def hp(x,a): return (x,sheer(x)-depth(x)*math.sin(a),-width(x)*math.cos(a))
nx,na=72,28
v=[hp(-18+36*i/nx,math.pi*j/na) for i in range(nx+1) for j in range(na+1)]
# Apoyo del centro del casco sobre el origen; popa parcialmente encajada.
contact=min([S(p) for p in v if abs(p[0])<.01],key=lambda p:p[1])
for axis in range(3): SHIP[axis][3]-=contact[axis]
SHIP[1][3]-=1.15  # el casco se hunde en el sedimento de la repisa: no flota
f=[]
for i in range(nx):
    for j in range(na):
        x=-18+36*(i+.5)/nx; a=math.pi*(j+.5)/na; y=hp(x,a)[1]
        hole=((x-8.3)/3.2)**2+((y-3.1)/1.45)**2
        if a<1.18 and hole < 1+.17*math.sin(x*4+a*13): continue
        q=i*(na+1)+j; f.append((q,q+na+1,q+na+2,q+1))
# Corregir el contorno escalonado del muestreo: borde de rotura irregular radial.
edge_count={}
for face in f:
    for a,b in zip(face,face[1:]+face[:1]):
        key=tuple(sorted((a,b)));edge_count[key]=edge_count.get(key,0)+1
rim=set()
for (a,b),count in edge_count.items():
    if count==1 and all(4<v[k][0]<13 and v[k][2]<0 and 1<v[k][1]<4.95 for k in (a,b)):
        rim.update((a,b))
for i in rim:
    x,y,z=v[i];a=math.atan2((y-3.1)/1.45,(x-8.3)/3.2)
    r=1+.065*math.sin(5*a)+.035*math.sin(11*a)
    x=8.3+3.2*r*math.cos(a);y=3.1+1.45*r*math.sin(a)
    theta=math.asin(max(0,min(.99,(sheer(x)-y)/depth(x))))
    v[i]=(x,y,hp(x,theta)[2]-.04*math.sin(7*a))
hull=make("Casco remachado con boquete abierto",v,f,"#5b3a2a",True,smooth=.7)
sol=hull.modifiers.new("Chapa con espesor","SOLIDIFY"); sol.thickness=.16; sol.offset=-1
# Ligne de flottaison et taches larges sur la coque.
ca=hull.data.color_attributes["Pigment"]
for i,c in enumerate(ca.data):
    x,y,z=v[i]
    if y<1.8: c.color=(*pigment((x,y,z),"#6e2e25","hull"),1)
# Codaste y timón a popa, pegados a la bovedilla.
box("Codaste",(-17.2,sheer(-17.2)-depth(-17.2)-.9,0),(.35,2.2,.3),"#4a3024",True,.06)
box("Pala del timón",(-18.25,sheer(-18)-depth(-18)-1.0,0),(1.5,2.3,.22),"#5b3a2a",True,.08,rot=(0,.35,0))
# Pont en panneaux étroits, bastingages de proue/poupe.
for i in range(36):
    a=-17.8+i*.99;b=a+.975
    deck=[(a,sheer(a)-.10,-width(a)*.985),(b,sheer(b)-.10,-width(b)*.985),
          (b,sheer(b)-.10,width(b)*.985),(a,sheer(a)-.10,width(a)*.985)]
    make("Plaque de pont "+str(i),deck,[(0,1,2,3)],"#544e3e",True,smooth=.2)
# Nervures intérieures visibles dans la brèche et fond sombre.
box("Fond de cale", (7.5,1.25,.3),(11,.18,4.0),"#242827",True)
for x in [4,5.6,7.2,8.8,10.4,12]:
    pipe("Couple intérieur",[(x,hp(x,a)[1]+.18,hp(x,a)[2]*.84) for a in [j*math.pi/16 for j in range(1,16)]],.095,"#3d342b",True,6)
# Bordés, traces de joints et rangées de rivets sur la face joueur.
for row,y in enumerate([2.0,4.7]):
    pts=[]
    for x in [-16+i*.75 for i in range(44)]:
        a=math.asin(max(0,min(.99,(sheer(x)-y)/depth(x))))
        if row==0 and 5.5<x<11: continue
        p=hp(x,a); rivet("Rivet de coque", (p[0],p[1],p[2]-.02),r=.04)
for side in [-1,1]:
    for start,end in [(-16,-6),(5,17)]:
        pts=[(x,sheer(x)+.15,side*width(x)) for x in [start+(end-start)*i/24 for i in range(25)]]
        pipe("Lisse de pont",pts,.10,"#504e40",True)
        pipe("Main courante",[(x,y+1,z) for x,y,z in pts],.048,"#56584b",True,6)
        for x in range(start,end+1,2):
            pipe("Chandelle",[(x,sheer(x),side*width(x)),(x,sheer(x)+1.15,side*width(x))],.045,"#56584b",True,6)
# Pont central à deux étages, parois inclinées et encadrements.
box("Base du château",(-2,6.05,.15),(7.5,2.0,5.5),"#5b3a2a",True,.13)
box("Passerelle supérieure",(-1.6,8.05,.45),(6.4,2.15,4.5),"#4f5f5a",True,.18)
box("Casquette passerelle",(-1.5,9.2,.45),(7.0,.22,5.05),"#3e4d49",True,.08)
box("Coursive inférieure",(-2,7.15,.1),(8.2,.20,6.1),"#4d5046",True,.06)
for level,y,z in [(0,6.05,-2.635),(1,8.25,-1.835)]:
    for x in [-4.0,-2.45,-.9,.65]:
        box("Cadre de baie", (x,y,z-.025),(1.13,.86,.15),"#73604a",True,.045)
        box("Baie obscure",(x,y,z-.11),(.92,.66,.025),"#0f2023",True,.035)
        pipe("Montant baie",[(x,y-.35,z-.14),(x,y+.35,z-.14)],.035,"#4f5f5a",True,6)
# Fenêtres sur la façade de proue.
for z in [-.9,.45,1.8]:
    box("Baie avant",(1.625,8.25,z),(.04,.68,.9),"#142328",True,.035)
# Ojos de buey en popa, discos mates con aros.
for x in [-13.8,-11.6,-9.4]:
    a=.16; p=hp(x,a)
    lathe("Ojo de buey aro",[(.28,0),(.31,.04),(.27,.08),(.205,.085)],p,"#7a6246",True,20,rot=(math.pi/2,0,0))
    lathe("Ojo de buey oscuro",[(.207,0),(.207,.014),(.001,.015)],(p[0],p[1],p[2]-.09),"#142328",True,20,rot=(math.pi/2,0,0))
# Chimenea hueca con faldón, anillos y boca negra.
lathe("Chimenea inclinada",[(1.25,0),(1.32,.18),(1.05,.45),(.86,1.0),(.83,5.0),(.91,5.05),(.91,5.35),(.64,5.35),(.64,4.55)],
      (-2.3,9.25,.6),"#5b3a2a",True,32,rot=(0,0,.12))
lathe("Banda chimenea",[(.87,0),(.87,.45)],(-2.74,12.85,.6),"#444d44",True,32,rot=(0,0,.12))
# Cale avant, couvercle ouvert et évent.
box("Écoutille ouverte",(7.2,5.2,.3),(3.5,.35,2.6),"#302f29",True,.08)
box("Panneau écoutille soulevé",(6.4,5.65,.5),(1.7,.14,2.4),"#5b3a2a",True,.07,rot=(0,0,.42))
# Mât cassé avec échardes métalliques, vergue abattue.
lathe("Mât de proue rompu",[(.34,0),(.36,.25),(.23,.6),(.19,6.1),(.14,6.3)],(11.5,5.55,.1),"#5b3a2a",True,20)
for i in range(5):
    a=math.tau*i/5
    pipe("Éclat du mât",[(11.5+.14*math.cos(a),11.5,.1+.14*math.sin(a)),(11.5+.19*math.cos(a),12.1+rng.random()*.45,.1+.19*math.sin(a))],.045,"#675644",True,6)
pipe("Botavara caída",[(10.8,5.65,-.6),(5.0,5.48,-2.2)],.16,"#64573e",True,12)
pipe("Tramo mástil caído",[(13,5.8,.7),(17.4,6.45,.3)],.14,"#5b3a2a",True,12)
for pts in [[(11.5,11.0,.1),(14,7.5,-1),(16.5,6.3,-1.4)],[(11.5,10.4,.1),(7,7,.3),(3,5.5,.7)]]:
    pipe("Jarcia floja",pts,.028,"#333d37",True,6)
# Farol de proa con jaula, lentille única emisiva.
lamp_local=(14.5,7.31,-1.2)
pipe("Brazo farol",[(14.5,6.05,-1.2),(14.5,7.9,-1.2)],.065,"#3b463e",True)
lathe("Base del farol",[(.30,0),(.30,.1),(.20,.16)],(14.5,6.91,-1.2),"#4a5142",True,20)
lathe("Sombrero del farol",[(.3,0),(.31,.08),(.12,.22)],(14.5,7.62,-1.2),"#4a5142",True,20)
for i in range(4):
    a=i*math.pi/2
    pipe("Jaula farol",[(14.5+.24*math.cos(a),6.99,-1.2+.24*math.sin(a)),(14.5+.24*math.cos(a),7.65,-1.2+.24*math.sin(a))],.022,"#3b463e",True,6)
CURRENT="lamp"
lathe("Farol de proa",[(.18,0),(.22,.07),(.22,.55),(.18,.62)],(14.5,7.0,-1.2),"#9fe8ff",True,24)
# Escombros sobre la repisa, detrás del borde.
CURRENT="debris"
crates=[(-15,-2.9,1.5,1.1,1.2),(-10.5,-3.1,1.1,.85,.9),(-9.2,-2.4,1.7,1.2,1.3),
        (1.5,-3.3,1.3,.9,1.0),(4.2,-2.8,.9,.7,.8),(14.5,-3.0,1.6,1.0,1.1)]
for i,(x,z,w,h,d) in enumerate(crates):
    rot=(rng.uniform(-.35,.35),rng.uniform(-.9,.9),rng.uniform(-.45,.45))
    y=h*.5-rng.uniform(.15,.45)   # medio enterradas
    tone=["#62533a","#57492f","#6b5a3c"][i%3]
    box("Carga de madera",(x,y,z),(w,h,d),tone,False,.06,rot)
    for dx in [-w*.32,w*.32]:
        box("Fleje carga",(x+dx,y,z-d*.51),(.08,h*.86,.05),"#363f37",False,.015,rot)
# Bote volcado: quille arrondie au-dessus de la repisa.
v=[];f=[]
for i in range(17):
    t=-1+2*i/16; w=.80*math.sqrt(max(.01,1-t*t))
    for j in range(13):
        a=math.pi*j/12
        v.append((-17+2.1*t,.25+.7*math.sin(a)*math.sqrt(max(.01,1-t*t)),-1.6+w*math.cos(a)))
for i in range(16):
    for j in range(12):
        q=i*13+j;f.append((q,q+13,q+14,q+1))
boat=make("Bote salvavidas volcado",v,f,"#67614b",smooth=.9)
sol=boat.modifiers.new("Espesor bote","SOLIDIFY");sol.thickness=.09
for i in range(7):
    x=-8+rng.random()*9; z=-2-rng.random()
    box("Tabla desprendida",(x,.14,z),(1.8,.13,.24),"#5b503a",False,.025,rot=(0,rng.uniform(-1,1),0))
# Chaîne à maillons alternés, suspendue au bord.
for k in range(19):
    y=.5-k*.37; z=-3.6-.35*math.sin(k*.09); x=-6+.22*math.sin(k*.20)
    pts=[]
    for j in range(13):
        a=math.tau*j/12
        pts.append((x+(.17*math.cos(a) if k%2==0 else 0),y+.25*math.sin(a),z+(.17*math.cos(a) if k%2 else 0)))
    pipe("Maillon ancre",pts,.045,"#4b3b2c",False,6)
pipe("Verge ancre",[(-6.05,-6.1,-3.9),(-6.05,-7.7,-3.9)],.12,"#4b3b2c",False,8)
pipe("Bras ancre",[(-7,-7.1,-3.9),(-6.8,-7.6,-3.9),(-6.05,-7.85,-3.9),(-5.3,-7.6,-3.9),(-5.1,-7.1,-3.9)],.13,"#4b3b2c",False,8)
# Colonisation en bouquets: éponges creuses, algues et anémones.
CURRENT="growth"
def sponge_cluster(p,r,col):
    # Tubos huecos de boca abierta, de alturas distintas e inclinados hacia fuera.
    x0,y0,z0=p
    for k in range(rng.randint(3,5)):
        a=rng.random()*math.tau; off=r*rng.uniform(0,.9)
        rr=r*rng.uniform(.22,.34); h=r*rng.uniform(1.8,3.6)
        prof=[(rr*1.15,0),(rr,h*.5),(rr*1.05,h),(rr*.72,h),(rr*.68,h*.55)]
        lathe("Esponja de tubo",prof,(x0+off*math.cos(a),y0-.05,z0+off*math.sin(a)),col,False,8,
              rot=(rng.uniform(-.28,.28),0,rng.uniform(-.28,.28)))
def anemone(p,r):
    # Pie corto y corona de tentáculos finos que se abren hacia arriba.
    x,y,z=p
    lathe("Pie de anémona",[(r*.55,0),(r*.45,r*.7),(r*.6,r*.95),(.001,r*.9)],p,"#b8a39a",False,10)
    for k in range(11):
        a=k*math.tau/11+rng.uniform(-.1,.1); L=r*rng.uniform(.8,1.2)
        pipe("Tentáculo",[(x+r*.45*math.cos(a),y+r*.9,z+r*.45*math.sin(a)),
                          (x+(r*.45+L*.55)*math.cos(a),y+r*.9+L*.45,z+(r*.45+L*.55)*math.sin(a)),
                          (x+(r*.45+L*.8)*math.cos(a),y+r*.9+L*.95,z+(r*.45+L*.8)*math.sin(a))],
             r*.06,"#e4cfc6",False,4)
def kelp(p,n):
    x,y,z=p
    for j in range(n):
        ang=rng.random()*math.tau; h=rng.uniform(.9,2.2); vv=[]
        for k in range(6):
            t=k/5; xx=x+math.sin(t*2.6+j)*.3; zz=z+math.cos(t*2.1+j)*.25
            w=.16*math.sin(math.pi*(t*.9+.05))
            vv.extend([(xx-w*math.cos(ang),y+h*t,zz-w*math.sin(ang)),(xx+w*math.cos(ang),y+h*t,zz+w*math.sin(ang))])
        make("Lámina de alga",vv,[(k*2,k*2+1,k*2+3,k*2+2) for k in range(5)],"#5d6838",smooth=.9)
# Cubierta: donde cae la nieve marina.
for i in range(12):
    x=rng.uniform(-16,15); z=rng.uniform(-2.2,2.2)
    if -6.5<x<2.5: x+=9 if x>-2 else -8   # fuera del puente
    base=S((x,sheer(x)-.05,z*width(x)/3.65))
    if i%3==2: anemone(base,rng.uniform(.28,.4))
    else: sponge_cluster(base,rng.uniform(.4,.65),["#c9b56a","#b9a45e","#d1bf7a"][i%3])
# Repisa, delante y a los lados del casco.
for i in range(11):
    x=rng.uniform(-22,21); z=rng.uniform(-3.1,-1.2) if i%2 else rng.uniform(5,10)
    p=(x,.02,z)
    if i%4==0: kelp(p,3)
    elif i%4==2: anemone(p,rng.uniform(.35,.5))
    else: sponge_cluster(p,rng.uniform(.5,.8),["#c9b56a","#a8955a"][i%2])
# Agrupar y aplicar toda geometría: exactamente cinco mallas y un material por parte.
objects=[]
for part in ["ledge","hull","debris","growth","lamp"]:
    group=[o for o in ART.objects if o.get("part")==part]
    for ob in group:
        bpy.context.view_layer.objects.active=ob
        for mod in list(ob.modifiers): bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.ops.object.select_all(action="DESELECT")
    for ob in group: ob.select_set(True)
    bpy.context.view_layer.objects.active=group[0]; bpy.ops.object.join()
    ob=group[0]; ob.name=part; ob["part"]=part
    bpy.context.scene.cursor.location=B(S(lamp_local)) if part=="lamp" else (0,0,0)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    objects.append(ob)
lamp_center=list(S(lamp_local))
vents=[list(S((7.2,5.6,.3))),list(S((-2.3-math.sin(.12)*5.2,9.25+math.cos(.12)*5.2,.6))),list(S((-8,5.5,.2)))]
meta=dict(forward="-Z",bubbleVents=vents,lampCenter=lamp_center,
 wallRadius=96,wallCenter=[0,0,-84],shipLength=36,heelDegrees=18,bowRiseDegrees=3)
parts,tris=kit.export_parts(ROOT/"barco-hundido.json",objects=objects,meta=meta)
assert parts==5 and tris<=40000,(parts,tris)
def bounds(obs):
    pp=[o.matrix_world@Vector(c) for o in obs for c in o.bound_box]
    lo=[min(p[i] for p in pp) for i in range(3)];hi=[max(p[i] for p in pp) for i in range(3)]
    return lo,hi,[hi[0]-lo[0],hi[2]-lo[2],hi[1]-lo[1]]
lo,hi,dims=bounds(objects)
lolo,hihi,ldims=bounds([objects[0]])
assert ldims[0]<=50 and ldims[2]<=18 and lo[2]>=-14 and hi[2]<=22,(dims,ldims,lo,hi)
print("EXPORT",parts,tris,"DIMENSIONS",dims,flush=True)
bpy.ops.object.select_all(action="DESELECT")
for ob in objects:ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/"barco-hundido.glb"),export_format="GLB",use_selection=True,export_apply=True,export_extras=True)
# Escena de revisión, excluida de GLB y JSON.
world=bpy.data.worlds.new("Agua azul");scene.world=world;world.use_nodes=True
world.node_tree.nodes["Background"].inputs[0].default_value=(*lin("#1f5f8f"),1)
world.node_tree.nodes["Background"].inputs[1].default_value=.65
wallmat=bpy.data.materials.new("Pared solo revisión");wallmat.use_nodes=True
pbs=wallmat.node_tree.nodes["Principled BSDF"];pbs.inputs["Base Color"].default_value=(*lin("#1c303e"),1);pbs.inputs["Roughness"].default_value=.98
v=[];f=[]
for y in [-180,180]:
    for i in range(193):
        a=-math.pi+math.tau*i/192
        v.append(B((96*math.sin(a),y,-84+96*math.cos(a))))
for i in range(192): f.append((i,i+1,i+194,i+193))
me=bpy.data.meshes.new("Curva R96");me.from_pydata(v,[],f);me.materials.append(wallmat)
wall=bpy.data.objects.new("Pared curva R96 — solo render",me);STAGE.objects.link(wall)
for po in me.polygons:po.use_smooth=True
# Volumen de agua uniforme, sin transparencia de materiales del activo.
fogmat=bpy.data.materials.new("Niebla solo revisión");fogmat.use_nodes=True
nt=fogmat.node_tree;nt.nodes.clear();out=nt.nodes.new("ShaderNodeOutputMaterial")
vol=nt.nodes.new("ShaderNodeVolumeScatter");vol.inputs["Color"].default_value=(.40,.65,.85,1);vol.inputs["Density"].default_value=.004;vol.inputs["Anisotropy"].default_value=.2
nt.links.new(vol.outputs[0],out.inputs["Volume"])
bpy.ops.mesh.primitive_cube_add(size=2,location=B((0,0,-25)));fog=bpy.context.object;fog.name="Volumen agua solo render";fog.scale=(100,100,80)
for c in list(fog.users_collection):c.objects.unlink(fog)
STAGE.objects.link(fog);fog.data.materials.append(fogmat)
def light(name,pos,target,energy,size,color):
    data=bpy.data.lights.new(name,"AREA");data.energy=energy;data.shape="DISK";data.size=size;data.color=lin(color)
    ob=bpy.data.objects.new(name,data);STAGE.objects.link(ob);ob.location=B(pos);ob.rotation_euler=(B(target)-ob.location).to_track_quat("-Z","Y").to_euler()
light("Sol frío",(-12,34,-15),(0,0,2),24000,28,"#eaf6ff")
light("Relleno azul",(18,12,-25),(0,4,1),11000,24,"#cfe8ff")
scene.render.engine="CYCLES";scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.cycles.max_bounces=4;scene.cycles.volume_bounces=0
scene.view_settings.view_transform="AgX";scene.render.resolution_percentage=100
cd=bpy.data.cameras.new("Revisión");cam=bpy.data.objects.new("Revisión",cd);STAGE.objects.link(cam);scene.camera=cam
cd.sensor_fit="VERTICAL";cd.angle=math.radians(60);cd.clip_start=.1;cd.clip_end=500
views=[("render-juego.png",(0,3,1),(0,.12,-1),70,1600,900,True),
       ("render-cerca.png",(1,4,1),(.36,.38,-1),25,1600,900,True),
       ("render-perfil.png",(0,3,1),(0,.03,-1),45,1600,900,False),
       ("render-detalle.png",S((10.7,4.8,-1.2)),(.45,.20,-1),12,1200,900,True)]
def camera(view):
    name,target,direction,dist,w,h,mist=view
    target=B(target);d=B(direction).normalized();cam.location=target+d*dist
    cam.rotation_euler=(target-cam.location).to_track_quat("-Z","Y").to_euler()
    scene.render.resolution_x=w;scene.render.resolution_y=h;fog.hide_render=not mist
    scene.render.filepath=str(ROOT/name)
for view in views:
    camera(view);print("RENDER",view[0],flush=True);bpy.ops.render.render(write_still=True)
camera(views[1]);scene.cursor.location=(0,0,0)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/"barco-hundido.blend"))
payload=json.loads((ROOT/"barco-hundido.json").read_text())
rows=[]
for m in payload["meshes"]:
    rows.append(f'| {m["part"]} | {len(m["index"])//3} | {", ".join(f"{x:.3f}" for x in m["pivot"])} |')
report=f"""# ENTREGA — Barco hundido sobre repisa · Batisfera

## Estado
- Versión: v4. v1–v3 de Astra; v4 de Claude (sin tokens de Astra), pedida por Luis tras revisar v3.
- Fecha: 2026-09-16. Integrada en el juego por Claude.

## Archivos
| Archivo | Contenido |
|---|---|
| modelar-barco.py | Generador bpy reproducible |
| barco-hundido.blend | Cinco partes editables y escenario de revisión separado |
| barco-hundido.glb | Cinco mallas con pigmento por vértice conectado |
| barco-hundido.json | kit.export_parts, cinco partes y meta |
| render-juego.png | 70 m, FOV vertical 60°, 1600 × 900, niebla |
| render-cerca.png | 25 m, tres cuartos superior, 1600 × 900, niebla |
| render-perfil.png | 45 m, frente completo, 1600 × 900, sin niebla |
| render-detalle.png | Boquete y farol, 12 m, 1200 × 900, niebla |

Regenerar desde esta carpeta:
powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/Luis/blender-bpy/bpy-run.ps1 modelar-barco.py

## Datos técnicos
- **{tris:,} triángulos**, **{parts} mallas**.
- Conjunto: ancho X {dims[0]:.3f} × alto Y {dims[1]:.3f} × fondo Z {dims[2]:.3f} m.
- Barco: eslora nominal 36 m, paralelo a X; proa +X. Escora 18° hacia +Z, arrufo global 3° hacia proa.
- Repisa: ancho {ldims[0]:.3f}, fondo {ldims[2]:.3f} m; superficie de apoyo y=0.
- Extremos verticales: y={lo[2]:.3f}…{hi[2]:.3f} m.
- Origen=(0,0,0), apoyo del casco; Y arriba, −Z hacia el jugador, +Z hacia la pared.
- Trasera de repisa: z=sqrt(96²−x²)−84+2. Penetra 2 m en la pared curva de radio 96.
- JSON: {(ROOT/"barco-hundido.json").stat().st_size/1024:.1f} KiB.

## Partes
| part | Triángulos | Pivote Three |
|---|---|---|
{chr(10).join(rows)}
Todas sin segment. ledge, hull, debris y growth: estáticas, amplitud 0 rad, velocidad 0 rad/s.
lamp: transformación fija; sugerencia de emisión 1.2+0.15·sin(2π·0.06·t), intervalo 1.05–1.35.
No añadir balanceo al barco ni a las algas fusionadas.

## Materiales
Un material por parte, blanco multiplicado por pigmento en JSON; GLB usa el atributo Pigment.
| Parte | Paleta | Metal / rugosidad | Emisión | Alfa |
|---|---|---|---|---|
| ledge | #0d151d a #293946, bandas de estratos | 0 / .95 | 0 | 1 |
| hull | #5b3a2a, #7a4a30, #4f5f5a, #6e2e25 | .08 / .88 | 0 | 1 |
| debris | Madera #62533a y hierro #4b3b2c | 0 / .94 | 0 | 1 |
| growth | #c9b56a, oliva #626b3b, rosa blanco #d3bab0 | 0 / .90 | 0 | 1 |
| lamp | #9fe8ff | 0 / .78 | 1.2, #9fe8ff | 1 |
Sin transparencias. Las ventanas y ojos de buey son superficies oscuras opacas; el boquete sí atraviesa la chapa.

## Meta
- bubbleVents = {json.dumps(vents)}. Escotilla, boca de chimenea y junta de cubierta.
- lampCenter = {json.dumps(lamp_center)}. Pivote del farol para luz o emisión pulsante.
- forward=-Z, wallRadius=96, wallCenter=(0,0,-84), shipLength=36, heelDegrees=18, bowRiseDegrees=3.
kit.export_parts escribe estos metadatos en la raíz del JSON, no en un objeto meta anidado.

## Cambios v4 (Claude)
- Casco con proa afilada y pie de roda curvo, bovedilla de popa, codaste y timón (antes: costados y fondo rectos, se leía como barcaza).
- Casco hundido 1.15 m en un montículo de sedimento (parte ledge): ya no flota sobre la repisa.
- Crecimiento rehecho: racimos de esponjas de tubo, anémonas con corona de 11 tentáculos y algas (antes: formas de jarra con asas).
- Cajas de tamaños y tonos distintos, inclinadas y medio enterradas.
- Pintura vieja con chorreones verticales de óxido en lugar de manchas de camuflaje.

## Diferencias con el brief
- Presupuesto: hasta 40 000 triángulos en lugar de 35 000 (decisión del integrador para escritorio).
- El bote y la cadena pertenecen a debris; toda la arquitectura y la jaula del farol a hull.
- La roca usa un acento #293946 para que los estratos se lean bajo luz azul; base azul negruzca.
- Cámara de descubrimiento: 70 m del objetivo, por el lado del centro del pozo; el eje exacto del pozo está a z=−84.
- Niebla de revisión: dispersión volumétrica 0.004; el juego aplicará su niebla exponencial propia.

## Revisión propia
Cuatro vistas Cycles, 32 muestras y denoise. Pared curva R96 y volumen solo en la colección de revisión;
no se exportan. Se revisaron silueta de vapor, profundidad del boquete, pigmento en manchas grandes,
espesor de chapa y crecimiento concentrado en las superficies superiores.
El script comprueba presupuesto, cantidad de partes y límites de repisa y altura.
"""
(ROOT/"ENTREGA.md").write_text(report,encoding="utf-8")
print("FINAL",tris,parts,dims,flush=True)

