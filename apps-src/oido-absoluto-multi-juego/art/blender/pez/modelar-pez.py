"""Pez protagonista de El Oceano: asset bpy reproducible, autorado en espacio Three."""
import bpy, bmesh, math, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
kit.setup(bpy.context.collection, 27)


def material(name, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["Metallic"].default_value = 0
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Specular IOR Level"].default_value = 0.5
    vc = mat.node_tree.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Pigment"
    mat.node_tree.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


skin = material("Piel satinada · pigmento por vertice", 0.38)
eye_mat = material("Ojos brillantes · pigmento por vertice", 0.05)
fin_mat = material("Aletas satinadas · pigmento por vertice", 0.32)


class Geo:
    def __init__(self):
        self.v, self.f, self.c = [], [], []

    def add(self, verts, faces, colors):
        off = len(self.v)
        self.v.extend(verts)
        self.f.extend(tuple(off + i for i in face) for face in faces)
        if isinstance(colors, str):
            self.c.extend([kit.lin(colors)] * len(verts))
        else:
            self.c.extend(colors)

    def uv_sphere(self, pos, scale, color, seg=24, rings=12):
        verts, faces = [], []
        for i in range(rings + 1):
            t = math.pi * i / rings
            for j in range(seg):
                a = math.tau * j / seg
                verts.append((pos[0] + scale[0] * math.sin(t) * math.cos(a),
                              pos[1] + scale[1] * math.cos(t),
                              pos[2] + scale[2] * math.sin(t) * math.sin(a)))
        for i in range(rings):
            for j in range(seg):
                a = i * seg + j
                b = i * seg + (j + 1) % seg
                faces.append((a, a + seg, b + seg, b))
        self.add(verts, faces, color)

    def cap(self, pos, scale, color, t0, t1, seg=20, rings=6):
        """Casquete de elipsoide: usado como parpado carnoso sobre el ojo."""
        verts, faces = [], []
        for i in range(rings + 1):
            t = t0 + (t1 - t0) * i / rings
            for j in range(seg):
                a = math.tau * j / seg
                verts.append((pos[0] + scale[0] * math.sin(t) * math.cos(a),
                              pos[1] + scale[1] * math.cos(t),
                              pos[2] + scale[2] * math.sin(t) * math.sin(a)))
        for i in range(rings):
            for j in range(seg - 1):
                a = i * seg + j
                faces.append((a, a + seg, a + seg + 1, a + 1))
        self.add(verts, faces, color)

    def loft(self, rings, color):
        """Secciones elipticas (z, rx, ry, cy) encadenadas y cerradas en los extremos."""
        verts, faces, seg = [], [], 20
        for z, rx, ry, cy in rings:
            for j in range(seg):
                a = math.tau * j / seg
                verts.append((rx * math.cos(a), cy + ry * math.sin(a), z))
        for i in range(len(rings) - 1):
            for j in range(seg):
                a = i * seg + j; b = i * seg + (j + 1) % seg
                faces.append((a, b, b + seg, a + seg))
        faces += [tuple(reversed(range(seg))), tuple((len(rings) - 1) * seg + j for j in range(seg))]
        self.add(verts, faces, color)

    def tube(self, path, radii, color, sides=10):
        verts, faces = [], []
        for i, p in enumerate(path):
            tangent = (Vector(path[min(i + 1, len(path)-1)]) - Vector(path[max(i - 1, 0)])).normalized()
            ref = Vector((0, 1, 0)) if abs(tangent.y) < .88 else Vector((1, 0, 0))
            u = tangent.cross(ref).normalized()
            w = tangent.cross(u).normalized()
            for j in range(sides):
                a = math.tau * j / sides
                verts.append(tuple(Vector(p) + radii[i] * (math.cos(a)*u + math.sin(a)*w)))
        for i in range(len(path)-1):
            for j in range(sides):
                a = i*sides+j; b = i*sides+(j+1)%sides
                faces.append((a, b, b+sides, a+sides))
        faces += [tuple(reversed(range(sides))), tuple((len(path)-1)*sides+j for j in range(sides))]
        self.add(verts, faces, color)

    def object(self, name, part, pivot=(0, 0, 0), mat=skin, segment=None):
        ob = kit.make(name, [tuple(Vector(v)-Vector(pivot)) for v in self.v], self.f,
                      mat, part=part, tint=0, smooth_angle=math.pi)
        ob.location = kit.B(pivot)
        attr = ob.data.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
        for i, col in enumerate(self.c):
            attr.data[i].color = (*col, 1)
        if segment is not None:
            ob["segment"] = segment
        return ob


def soften_closed(points, rounds=2):
    pts=[Vector(p) for p in points]
    for _ in range(rounds):
        out=[]
        for i,p in enumerate(pts):
            q=pts[(i+1)%len(pts)]
            out.extend((p.lerp(q,.25),p.lerp(q,.75)))
        pts=out
    return [tuple(p) for p in pts]


def fin_mesh(name, part, pivot, outline, thickness, segment=None, dorsal=False):
    """Membrana curva, afinada al borde, con canto redondeado y radios suaves."""
    g = Geo(); outline=soften_closed(outline,2); n = len(outline)
    base=Vector(pivot)
    distances=[(Vector(p)-base).length for p in outline]; far=max(distances)
    half=[thickness*(.14+.86*max(0,1-d/far)**.65)/2 for d in distances]
    if dorsal:
        verts = [(x-half[i], y, z) for i,(x,y,z) in enumerate(outline)] + [(x+half[i], y, z) for i,(x,y,z) in enumerate(outline)]
    else:
        verts = [(x, y-half[i], z) for i,(x,y,z) in enumerate(outline)] + [(x, y+half[i], z) for i,(x,y,z) in enumerate(outline)]
    faces = [tuple(reversed(range(n))), tuple(range(n, 2*n))]
    for i in range(n):
        j = (i+1) % n; faces.append((i, j, n+j, n+i))
    cols = []
    for side in range(2):
        for i in range(n):
            edge = i not in (0, n-1)
            cols.append(kit.lin("ff9a70" if edge else "f04425"))
    g.add(verts, faces, cols)
    # Radios suaves, integrados en la misma parte.
    base = Vector(pivot)
    for idx in range(4, n-1, 6):
        tip = Vector(outline[idx])
        path = [tuple(base.lerp(tip, t)) for t in (0.12, .42, .72, .96)]
        g.tube(path, [.014, .012, .009, .004], "ffb08a", 6)
    ob=g.object(name, part, pivot, fin_mat, segment)
    bevel=ob.modifiers.new("Borde organico redondeado","BEVEL"); bevel.width=.012; bevel.segments=2
    bpy.context.view_layer.objects.active=ob; bpy.ops.object.modifier_apply(modifier=bevel.name)
    return ob


# Cuerpo compacto: una superficie organica, frente bulboso en +Z y vientre lleno.
g = Geo(); seg, rings = 48, 22
verts, faces, colors = [], [], []
for i in range(rings + 1):
    t = math.pi * i / rings
    y = .80 * math.cos(t)
    section = math.sin(t)
    for j in range(seg):
        a = math.tau*j/seg
        x = .60 * section * math.cos(a) * (1-.08*math.cos(t))
        z = .95 * section * math.sin(a) + .09*section*section
        # suave quilla ventral y frente mas alta, sin aspecto de esfera escalada
        y2 = y - .045*section*section + .035*math.sin(a)*section
        verts.append((x, y2, z))
        belly = max(0, min(1,(-y2 + .10)/.84))
        front = max(0, z/.98)
        top = max(0, y2/.82)
        coral = Vector(kit.lin("e8322e")); deep = Vector(kit.lin("a3141c")); yellow = Vector(kit.lin("ffd23d"))
        col = coral.lerp(deep, min(1, top*.72 + .12*(1-front)))
        orange=Vector(kit.lin("ff8a2a"))
        if belly>.24:
            col=col.lerp(orange,min(1,(belly-.24)/.34))
        if belly>.58:
            col=orange.lerp(yellow,min(.92,(belly-.58)/.40))
        # bandas tonales discretas que se leen de lejos sin textura.
        col *= .94 + .06*math.cos((z+.15)*14 + x*3)**2
        colors.append(tuple(col))
for i in range(rings):
    for j in range(seg):
        a=i*seg+j; b=i*seg+(j+1)%seg; faces.append((a,a+seg,b+seg,b))
g.add(verts, faces, colors)
# Labios curvos y sonrisa, fusionados en body.
g.tube([(-.22,-.12,.96),(-.11,-.17,1.035),(0,-.18,1.055),(.11,-.17,1.035),(.22,-.12,.96)],
       [.050,.055,.058,.055,.050], "ff785e", 12)
g.tube([(-.17,-.175,.985),(-.085,-.205,1.035),(0,-.21,1.05),(.085,-.205,1.035),(.17,-.175,.985)],
       [.020]*5, "62151a", 10)
# Operculos como arcos de relieve pegados al cuerpo.
for side in (-1,1):
    path=[]
    for k in range(9):
        a=-.9+1.8*k/8
        path.append((side*(.548+.012*math.cos(a)), -.08+.19*math.sin(a), .22+.14*math.cos(a)))
    g.tube(path,[.013]*9,"a51c23",7)
body = g.object("Cuerpo labios y operculos", "body")

# Ambos ojos, iris, pupilas y dos brillos en una sola malla exportada.
g=Geo()
for side in (-1,1):
    g.uv_sphere((side*.47,.27,.55),(.205,.235,.180),"fff4dc",24,12)
    g.uv_sphere((side*.583,.285,.600),(.104,.132,.064),"42b9c5",20,10)
    g.uv_sphere((side*.628,.290,.626),(.055,.080,.033),"141526",20,10)
    g.uv_sphere((side*.652,.333,.652),(.014,.020,.010),"ffffff",12,6)
    # Parpados: casquetes de piel, arriba y abajo, que envuelven el globo y lo funden con la cara.
    g.cap((side*.47,.27,.55),(.228,.258,.203),"d8342f",0.0,1.02,22,6)
    g.cap((side*.47,.27,.55),(.224,.254,.199),"c92c2a",math.pi,math.pi-0.52,22,4)
eyes=g.object("Ojos expresivos", "eyes", mat=eye_mat)

# Cola: pedunculo cerrado, suavemente fundido, y abanico VERTICAL en el plano Y-Z.
g=Geo()
# Arranca con el radio del propio cuerpo (elipsoide .60 × .80 × .95) y se afina hacia
# la base del abanico, asi que sale tangente a la piel y no deja arista ni cono encajado.
peduncle=[]
for k in range(15):
    u=k/14
    z=-.55-.64*u
    s=math.sqrt(max(0.0,1-(z/.95)**2))
    taper=u**1.45
    # .88 del radio del cuerpo: queda por dentro de la piel (sin coincidencia ni
    # arista) y emerge solo cuando el cuerpo ya se cierra.
    rx=(.88*.60*s)*(1-taper)+.085*taper
    ry=(.88*.80*s)*(1-taper)+.150*taper
    peduncle.append((z,rx,ry,-.045*s*s))
g.loft(peduncle,"e8322e")
outline=soften_closed([(0,0,-1.05),(0,.15,-1.13),(0,.48,-1.38),(0,.61,-1.64),(0,.22,-1.56),
                       (0,0,-1.43),(0,-.22,-1.56),(0,-.61,-1.64),(0,-.48,-1.38),(0,-.15,-1.13)],2)
n=len(outline); thick=.085; distances=[(Vector(p)-Vector((0,0,-1.08))).length for p in outline]; far=max(distances)
halves=[thick*(.16+.84*max(0,1-d/far)**.7)/2 for d in distances]
vv=[(x-halves[i],y,z) for i,(x,y,z) in enumerate(outline)]+[(x+halves[i],y,z) for i,(x,y,z) in enumerate(outline)]
ff=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)]
cc=[]
for _ in range(2): cc.extend([kit.lin("ff9a70" if abs(y)>.42 else "f04425") for x,y,z in outline])
g.add(vv,ff,cc)
for side in (-1,1):
    for ytip in (.25,.48):
        g.tube([(0,0,-1.14),(0,side*ytip*.55,-1.34),(0,side*ytip,-1.58)],[.014,.010,.004],"ffb08a",6)
tail=g.object("Pedunculo y cola abanico", "tail", (0,0,-.88), fin_mat)
bevel=tail.modifiers.new("Borde caudal redondeado","BEVEL"); bevel.width=.014; bevel.segments=2
bpy.context.view_layer.objects.active=tail; bpy.ops.object.modifier_apply(modifier=bevel.name)

# Pectorales anchas como remos; X es ancho, Y arriba, Z longitudinal.
left_outline=[(-.47,-.05,.20),(-.62,-.08,.10),(-.91,-.19,-.02),(-1.13,-.31,-.20),(-1.16,-.38,-.36),(-1.03,-.36,-.47),(-.82,-.27,-.42),(-.60,-.13,-.18)]
right_outline=[(-x,y,z) for x,y,z in left_outline]
fin0=fin_mesh("Pectoral izquierda", "fin", (-.47,-.04,.18), left_outline, .055, 0)
fin1=fin_mesh("Pectoral derecha", "fin", (.47,-.04,.18), right_outline, .055, 1)

# Dorsal alta, arqueada y visible desde la camara trasera-superior.
dorsal_outline=[(0,.63,.16),(0,.72,.07),(0,.92,-.03),(0,1.18,-.22),(0,1.30,-.43),(0,1.25,-.57),(0,1.08,-.68),(0,.84,-.73),(0,.67,-.65),(0,.60,-.48)]
dorsal=fin_mesh("Aleta dorsal alta", "dorsal", (0,.62,.10), dorsal_outline, .065, dorsal=True)

meshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]
bpy.context.view_layer.update()
for ob in meshes:
    bm=bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
    bad=[f for f in bm.faces if f.calc_area()<1e-12]
    if bad: bmesh.ops.delete(bm,geom=bad,context="FACES")
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces)); bm.to_mesh(ob.data); bm.free(); ob.data.update()

meta=dict(forward="-Z", mouth=[0.0,-0.20,1.08])
parts,tris=kit.export_parts(ROOT/"pez.json",meta=meta)
pts=[ob.matrix_world@v.co for ob in meshes for v in ob.data.vertices]
dims=[max(v[i] for v in pts)-min(v[i] for v in pts) for i in range(3)]
assert parts==6 and tris<=14000,(parts,tris)
assert dims[0]<=2.4 and 2.52<=dims[1]<=3.08,(dims,"largo total")

bpy.ops.object.select_all(action="DESELECT")
for ob in meshes: ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/"pez.glb"),export_format="GLB",use_selection=True,
                          export_extras=True,export_animations=False)

scene=bpy.context.scene
scene.render.engine="BLENDER_EEVEE_NEXT" if not hasattr(scene,"cycles") else "CYCLES"
if scene.render.engine=="CYCLES":
    scene.cycles.samples=40; scene.cycles.use_denoising=True
scene.render.image_settings.file_format="PNG"; scene.render.resolution_percentage=100
scene.view_settings.look="AgX - Medium High Contrast"
world=bpy.data.worlds.new("Oceano turquesa"); world.use_nodes=True; scene.world=world
world.node_tree.nodes["Background"].inputs[0].default_value=(*kit.lin("1f7a99"),1)
world.node_tree.nodes["Background"].inputs[1].default_value=.24
bpy.ops.object.light_add(type="SUN"); sun=bpy.context.object; sun.name="Sol calido"
sun.data.color=kit.lin("fff3d6"); sun.data.energy=4.0; sun.rotation_euler=(math.radians(20),math.radians(-18),math.radians(28))
bpy.ops.object.light_add(type="AREA"); fill=bpy.context.object; fill.name="Ambiente azul"
fill.data.color=kit.lin("d8efff"); fill.data.energy=65; fill.data.shape="DISK"; fill.data.size=5
bpy.ops.object.light_add(type="AREA"); bounce=bpy.context.object; bounce.name="Rebote calido del arrecife"
bounce.data.color=kit.lin("ffd98c"); bounce.data.energy=220; bounce.data.shape="DISK"; bounce.data.size=4
bounce.location=kit.B((0,-3,0)); bounce.rotation_euler=(kit.B((0,0,0))-bounce.location).to_track_quat("-Z","Y").to_euler()
bpy.ops.object.camera_add(); cam=bpy.context.object; scene.camera=cam
cam.data.type="PERSP"; cam.data.sensor_fit="VERTICAL"; cam.data.sensor_height=24
cam.data.lens=24/(2*math.tan(math.radians(30))); cam.data.clip_start=.1

def set_camera(pos,target,res):
    cam.location=kit.B(pos); cam.rotation_euler=(kit.B(target)-cam.location).to_track_quat("-Z","Y").to_euler()
    scene.render.resolution_x,scene.render.resolution_y=res
    fill.location=cam.location; fill.rotation_euler=cam.rotation_euler

def render(name,pos,target,res):
    set_camera(pos,target,res); scene.render.filepath=str(ROOT/name); bpy.ops.render.render(write_still=True)

# Vista de juego en pose, luego restaurar neutral.
tail.rotation_euler[2]=.15
fin0.rotation_euler[0]=.22; fin1.rotation_euler[0]=-.22
render("render-juego.png",(.72,1.8,-5.5),(0,.15,0),(1600,900))
tail.rotation_euler[2]=0; fin0.rotation_euler[0]=0; fin1.rotation_euler[0]=0
render("render-cerca.png",(2.45,1.35,3.25),(0,.05,.15),(1600,900))
render("render-perfil.png",(4.2,.35,0),(0,.08,-.22),(1200,900))
render("render-arriba.png",(0,4.5,-.15),(0,0,-.15),(1200,900))

# Dejar escena neutral con la camara de juego.
set_camera((.72,1.8,-5.5),(0,.15,0),(1600,900))
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/"pez.blend"))

rows=[
"| Cuerpo labios y operculos | `body` | — | 0.000, 0.000, 0.000 | Piel satinada | escala Z / X-Y | +15 % / −7 % | ligada a velocidad | Balanceo idle ±0.035 rad Y, 1.2 rad/s. |",
"| Ojos expresivos | `eyes` | — | 0.000, 0.000, 0.000 | Ojos brillantes | — | 0 | — | Estaticos respecto al cuerpo. |",
"| Pedunculo y cola abanico vertical | `tail` | — | 0.000, 0.000, −0.880 | Aletas satinadas | Y | ±0.15 rad | 6 rad/s | Pivote y pedunculo solapados dentro del cuerpo; abanico en Y-Z. |",
"| Pectoral izquierda | `fin` | 0 | −0.470, −0.040, 0.180 | Aletas satinadas | X | ±0.40 rad | 10 rad/s | Idle ±0.10 rad a 1.5 rad/s. |",
"| Pectoral derecha | `fin` | 1 | 0.470, −0.040, 0.180 | Aletas satinadas | X | ±0.40 rad | 10 rad/s | Fase opuesta; idle ±0.10 rad. |",
"| Aleta dorsal alta | `dorsal` | — | 0.000, 0.620, 0.100 | Aletas satinadas | Z | ±0.08 rad | 2.0 rad/s | Ondulacion leve, fase retrasada. |"]
report=f'''# ENTREGA — Pez protagonista · Walking AP Multi

## Estado

- Version / ronda: v2, ronda de correccion 1/2
- Fecha: 2026-09-15
- Lista para: revision de Luis

## Archivos

| Archivo | Contenido |
|---|---|
| `modelar-pez.py` | Fuente reproducible; regenera todos los entregables. |
| `pez.blend` | Escena editable neutral, camara de juego y luces. |
| `pez.glb` | Seis mallas, pigmento por vertice y propiedades `part`/`segment`. |
| `pez.json` | Geometria mediante `kit.export_parts`. |
| `render-juego.png`, `render-cerca.png`, `render-perfil.png`, `render-arriba.png` | Cycles, 40 muestras y denoise. |

Regenerar desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 modelar-pez.py
```

## Datos tecnicos

| Dato | Valor |
|---|---|
| Tamano real (largo × alto × ancho, u) | {dims[1]:.3f} × {dims[2]:.3f} × {dims[0]:.3f} |
| Origen | Centro del cuerpo, (0, 0, 0). |
| Frente | +Z en espacio Three. |
| Triangulos totales | {tris} |
| Mallas exportadas | {parts} |
| Peso del JSON | {(ROOT/'pez.json').stat().st_size/1024:.1f} KiB |
| Puntos en `meta` | `mouth` = (0.000, −0.200, 1.080) Three; emision de burbujas. |

## Partes

| Objeto | `part` | `segment` | Pivote (Three) | Material | Eje (Three) | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
{chr(10).join(rows)}

## Materiales

| Material | Color (hex) | Metal / rugosidad | Emision | Alfa | Que debe tener en cuenta el juego |
|---|---|---|---|---|---|
| Piel satinada | Pigmento #e8322e → #a3141c; vientre #ffd23d; labios #ff785e | 0 / 0.38 | 0 | 1 | Activar vertex colors; un material por parte. |
| Ojos brillantes | #fff4dc, iris #42b9c5, pupila #141526, brillo #ffffff | 0 / 0.05 | 0 | 1 | Los dos ojos estan fusionados en una sola parte. |
| Aletas satinadas | #f04425 con borde/radios #ffb08a | 0 / 0.32 | 0 | 1 | Opacas y de doble cara; evita problemas de orden de transparencia. |

## Diferencias con el brief

Las aletas son opacas, con borde aclarado por pigmento, en lugar de usar la transparencia opcional. Se conservaron las seis partes y los pivotes del brief. Sin otras diferencias previstas.

## Sugerencias para integrar

Conservar `vertexColors`. Aplicar el estiramiento de velocidad a `body` y acompañarlo en `eyes` para que la cara permanezca unida. Cola y pectorales tienen solape en la base para tolerar sus amplitudes maximas sin huecos. No hay animaciones horneadas ni emision.
'''
(ROOT/"ENTREGA.md").write_text(report,encoding="utf-8")
print("EXPORT",parts,"partes",tris,"triangulos","DIMENSIONS",[round(x,3) for x in dims],flush=True)
