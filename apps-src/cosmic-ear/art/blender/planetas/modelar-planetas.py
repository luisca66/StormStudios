"""Cosmic Ear — cinco juguetes musicales. Ejecutar con bpy-run.ps1.

Geometría en coordenadas Three (Y arriba); kit.make convierte a Blender.
No necesita texturas, fuentes, descargas ni complementos de terceros.
"""
from pathlib import Path
import sys
import math
import json
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

TAU = math.tau
SIN, COS = math.sin, math.cos
NAMES = ("piano", "cello", "corno", "coro", "fagot")
IVORY, BLACK = "#fff0cf", "#292039"
GOLD, PINK, TEAL = "#ffcf5a", "#ff6fb5", "#3fd2c7"
SILVER, WOOD, DARK = "#dce7eb", "#c87537", "#683849"


class Mesh:
    def __init__(self):
        self.v, self.f, self.c = [], [], []

    def add(self, verts, faces, color):
        start = len(self.v)
        rgb = kit.lin(color)
        for p in verts:
            # Pigmento suave y determinista, sin ruido aleatorio por cara.
            x, y, z = p
            k = 0.91 + 0.055 * SIN(5*x + 2*y) + 0.035 * COS(8*y - z)
            self.v.append(tuple(p))
            self.c.append(tuple(min(1, c*k) for c in rgb) + (1,))
        self.f.extend(tuple(start+i for i in f) for f in faces)

    def sphere(self, center, scale, color, n=24, rows=12, waist=0):
        v = [(center[0], center[1]+scale[1], center[2])]
        for j in range(1, rows):
            a = math.pi*j/rows
            y = COS(a)
            w = 1-waist*math.exp(-((y-0.12)/0.28)**2)
            for i in range(n):
                b = TAU*i/n
                v.append((center[0]+scale[0]*SIN(a)*COS(b)*w,
                          center[1]+scale[1]*y,
                          center[2]+scale[2]*SIN(a)*SIN(b)))
        v.append((center[0], center[1]-scale[1], center[2]))
        f = [(0, 1+i, 1+(i+1)%n) for i in range(n)]
        for j in range(rows-2):
            for i in range(n):
                a, b = 1+j*n+i, 1+j*n+(i+1)%n
                f.append((a, a+n, b+n, b))
        last = len(v)-1
        f.extend((last, 1+(rows-2)*n+(i+1)%n, 1+(rows-2)*n+i) for i in range(n))
        self.add(v, f, color)

    def tube(self, points, radius, color, sides=8, closed=False):
        pts = [Vector(p) for p in points]
        v, f = [], []
        normal = None
        for i, p in enumerate(pts):
            before = pts[(i-1)%len(pts)] if closed else pts[max(0, i-1)]
            after = pts[(i+1)%len(pts)] if closed else pts[min(len(pts)-1, i+1)]
            tangent = (after-before).normalized()
            if normal is None:
                normal = Vector((0, 0, 1)) if abs(tangent.z)<0.9 else Vector((1, 0, 0))
            normal = (normal-tangent*normal.dot(tangent)).normalized()
            bi = tangent.cross(normal).normalized()
            r = radius[i] if isinstance(radius, list) else radius
            for k in range(sides):
                v.append(tuple(p+r*(normal*COS(TAU*k/sides)+bi*SIN(TAU*k/sides))))
        for i in range(len(pts) if closed else len(pts)-1):
            j = (i+1)%len(pts)
            for k in range(sides):
                q = (k+1)%sides
                f.append((i*sides+k, j*sides+k, j*sides+q, i*sides+q))
        if not closed:
            f.extend((tuple(reversed(range(sides))), tuple((len(pts)-1)*sides+k for k in range(sides))))
        self.add(v, f, color)

    def hoop(self, radius, thickness, color, tilt=0.38, n=64, sides=8):
        self.tube([(radius*COS(TAU*i/n), radius*SIN(TAU*i/n)*SIN(tilt),
                    radius*SIN(TAU*i/n)*COS(tilt)) for i in range(n)],
                  thickness, color, sides, True)

    def box(self, center, scale, color):
        v, f = kit.g_box(*scale)
        self.add([(p[0]+center[0], p[1]+center[1], p[2]+center[2]) for p in v], f, color)

    def key(self, angle, inner, outer, width, height, color):
        # Segmento de teclado radial, cuatro muestras: bordes curvos reales.
        v, f = [], []
        for y in (-height/2, height/2):
            for r in (inner, outer):
                for i in range(4):
                    a = angle+width*(i/3-0.5)
                    x, z = r*COS(a), r*SIN(a)
                    v.append((x, y+z*SIN(0.30), z*COS(0.30)))
        for i in range(3):
            f.extend(((i,i+1,5+i,4+i), (8+i,12+i,13+i,9+i),
                      (i,8+i,9+i,i+1), (4+i,5+i,13+i,12+i)))
        f.extend(((0,4,12,8), (3,11,15,7)))
        self.add(v,f,color)

    def finish(self, name, metal, rough, emission=0):
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        bs = mat.node_tree.nodes.get("Principled BSDF")
        bs.inputs["Base Color"].default_value = (1,1,1,1)
        bs.inputs["Metallic"].default_value = metal
        bs.inputs["Roughness"].default_value = rough
        bs.inputs["Emission Color"].default_value = (*kit.lin(PINK if name.startswith("coro") else GOLD),1)
        bs.inputs["Emission Strength"].default_value = emission
        attr = mat.node_tree.nodes.new("ShaderNodeVertexColor")
        attr.layer_name = "Color"
        mat.node_tree.links.new(attr.outputs["Color"], bs.inputs["Base Color"])
        ob = kit.make(name,self.v,self.f,mat,part=name,tint=0,smooth_angle=0.8)
        colors = ob.data.color_attributes.new(name="Color",type="FLOAT_COLOR",domain="POINT")
        for item, color in zip(colors.data,self.c):
            item.color = color
        ob.data.color_attributes.active_color = colors
        return ob


def build(inst):
    c, r = Mesh(), Mesh()
    if inst == "piano":
        c.sphere((0,0,0),(1,1,1),IVORY)
        # Casquete oscuro, como la tapa de un piano de cuento.
        c.sphere((0,0.29,0),(0.88,0.73,0.88),BLACK)
        c.hoop(0.99,0.025,GOLD,tilt=0,n=48,sides=6)
        r.hoop(1.55,0.095,BLACK,tilt=0.30,n=64)
        for i in range(28):
            a = TAU*i/28
            r.key(a,1.25,1.98,TAU/28*0.94,0.14,IVORY)
            if i%7 in (0,1,3,4,5):
                r.key(a+TAU/56,1.25,1.68,TAU/28*0.52,0.29,BLACK)
    elif inst == "cello":
        c.sphere((0,0,0),(0.91,1,0.78),WOOD,n=32,rows=16,waist=0.31)
        c.box((0,0.44,0.77),(0.17,0.95,0.06),BLACK)
        c.box((0,-0.29,0.81),(0.40,0.08,0.10),IVORY)
        for x in (-0.066,-0.022,0.022,0.066):
            c.tube([(x,-0.78,0.67),(x,-0.29,0.89),(x,0.83,0.81)],0.009,SILVER,6)
        for side in (-1,1):
            pts = [(side*(0.40+0.07*SIN(TAU*i/20)),0.40-0.8*i/20,0.74) for i in range(21)]
            c.tube(pts,0.027,BLACK,6)
        r.hoop(1.69,0.075,WOOD,tilt=0.45)
        for j in range(4):
            x = (j-1.5)*0.19
            r.tube([(x,-0.67,-1.47),(x,0.67,1.47)],0.014,SILVER,6)
        pts=[]
        for i in range(49):
            a = TAU*1.5*i/48
            rad = 0.31*(1-i/60)
            pts.append((rad*COS(a),1.62+rad*SIN(a),0))
        r.tube(pts,0.068,WOOD,8)
    elif inst == "corno":
        c.sphere((0,0,0),(1,1,1),GOLD)
        for x in (-0.25,0,0.25):
            c.tube([(x,-0.1,0.97),(x,0.38,0.96)],0.065,"#d59036",8)
            c.sphere((x,0.4,0.97),(0.105,0.055,0.105),IVORY,12,6)
        pts=[]
        for i in range(113):
            a=TAU*1.7*i/112
            rad=1.21+0.56*i/112
            pts.append((rad*COS(a),rad*SIN(a)*0.68,rad*SIN(a)*0.73))
        r.tube(pts,0.095,GOLD,10)
        # Campana de doble pared, abierta; interior ámbar, labio redondo.
        profile=[(0.095,0),(0.11,0.14),(0.18,0.31),(0.32,0.48),(0.43,0.55),
                 (0.40,0.55),(0.29,0.47),(0.15,0.30),(0.08,0.14),(0.075,0)]
        v,f=kit.g_lathe(profile,32)
        r.add([(x+1.36,y+0.26,z+0.72) for x,y,z in v],f,GOLD)
        r.tube([pts[-1],(1.20,0.1,0.60),(1.36,0.26,0.72)],0.095,GOLD,10)
    elif inst == "coro":
        c.sphere((0,0,0),(0.90,0.90,0.90),"#e4dbf7")
        for i in range(7):
            a=TAU*i/7
            c.sphere((0.62*COS(a),0.62*SIN(a),0.10),(0.37,0.36,0.57),IVORY,16,8)
        # Tres bocas en O: lectura explícita de voces, sin depender de etiquetas.
        for x,y in ((-0.42,0.10),(0,0.34),(0.42,0.10)):
            c.sphere((x,y-0.11,0.87),(0.09,0.135,0.035),"#734c85",12,8)
            for dx in (-0.09,0.09):
                c.sphere((x+dx,y+0.12,0.87),(0.029,0.041,0.028),BLACK,8,4)
        for j in range(3):
            pts=[]
            for i in range(49):
                a=TAU*i/48
                pts.append(((1.38+j*0.23)*COS(a),0.24*SIN(3*a+j)+0.19*j,
                            (1.38+j*0.23)*SIN(a)))
            r.tube(pts,0.032, (IVORY,PINK,TEAL)[j],6)
        for j in range(5):
            a=TAU*j/5
            r.sphere((1.86*COS(a),0.56+0.12*SIN(a),1.86*SIN(a)),(0.065,0.14,0.065),GOLD,10,6)
    else:
        c.sphere((0,0,0),(0.70,1,0.64),DARK,32,16)
        for x in (-0.24,0.24):
            c.tube([(x,-0.77,0.48),(x,0.73,0.48)],0.16,"#894d3a",12)
        for y in (-0.61,0.48):
            c.box((0,y,0.63),(0.79,0.07,0.09),SILVER)
        for i in range(5):
            c.sphere((0.23,-0.42+i*0.18,0.66),(0.075,0.07,0.045),SILVER,12,6)
        c.tube([(-0.24,0.68,0.48),(-0.31,0.85,0.53),(-0.08,0.91,0.65),(0.09,0.82,0.69)],0.032,SILVER,8)
        r.hoop(1.65,0.085,DARK,tilt=-0.40,n=64,sides=10)
        r.hoop(1.66,0.025,SILVER,tilt=-0.40,n=64,sides=6)
        for i in range(10):
            a=TAU*i/10
            p=(1.65*COS(a),1.65*SIN(a)*SIN(-0.40),1.65*SIN(a)*COS(-0.40))
            q=(1.94*COS(a),p[1]+0.12,1.94*SIN(a)*COS(-0.40))
            r.tube([p,q],0.026,SILVER,6)
            r.sphere(q,(0.115,0.055,0.115),SILVER,12,6)
    # Radio envolvente exacto 1: incluye accesorios, conserva pivote central.
    radius=max(Vector(p).length for p in c.v)
    c.v=[tuple(Vector(p)/radius) for p in c.v]
    assert max(Vector(p).length for p in r.v)<=2.2, inst+": anillo fuera de radio"
    metal = {"piano":0.06,"cello":0.05,"corno":0.68,"coro":0.08,"fagot":0.18}[inst]
    return [c.finish(inst+"_core",metal,0.32),
            r.finish(inst+"_ring",metal,0.29,0.08 if inst=="coro" else 0)]


def aim(ob,target):
    ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()


def main():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    scene=bpy.context.scene
    collection=bpy.data.collections.new("Cosmic Ear · planetas")
    scene.collection.children.link(collection)
    kit.setup(collection,20260926)
    objects=[ob for inst in NAMES for ob in build(inst)]
    counts={}
    dimensions={}
    for inst in NAMES:
        pair=[o for o in objects if o['part'].startswith(inst+'_')]
        for ob in pair:
            ob.data.calc_loop_triangles()
        counts[inst]=sum(len(ob.data.loop_triangles) for ob in pair)
        assert counts[inst]<=6000, (inst,counts[inst])
        pts=[kit._three(v.co) for ob in pair for v in ob.data.vertices]
        dimensions[inst]=[round(max(p[i] for p in pts)-min(p[i] for p in pts),4) for i in range(3)]
    assert len(objects)==10 and sum(counts.values())<=30000
    assert all(ob.location.length<1e-8 for ob in objects)
    meta=dict(forward="+Z",coreRadius=1,ringMaxRadius=2.2,instruments=list(NAMES),
              trianglesByPlanet=counts,dimensionsByPlanet=dimensions,
              note="Cada par comparte origen; mostrar un instrumento por instancia.")
    fallback=None
    try:
        parts,tris,size=kit.export_glb(ROOT/'planetas-juego.glb',objects=objects,meta=meta,
                                     ao=None,json_path=ROOT/'planetas.json')
        print('EXPORT',parts,'partes',tris,'triangulos',size//1024,'KB')
    except (RuntimeError,FileNotFoundError) as exc:
        fallback=str(exc)
        kit.export_parts(ROOT/'planetas.json',objects=objects,meta=meta)
        print('GLB DE JUEGO PENDIENTE:',fallback)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:
        ob.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'planetas.glb'),export_format='GLB',
                              use_selection=True,export_extras=True,export_yup=True)
    # Sólo ahora se acomodan los originales; ambos GLB conservan pivotes cero.
    for i,inst in enumerate(NAMES):
        for ob in objects:
            if ob['part'].startswith(inst+'_'):
                ob.location.x=(i-2)*4.55
    world=bpy.data.worlds.new('Fondo índigo')
    scene.world=world
    world.use_nodes=True
    world.node_tree.nodes['Background'].inputs['Color'].default_value=(*kit.lin('#1a1036'),1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=0.5
    for name,pos,power,color,scale in (
        ('Luz cálida',(-5,-8,10),2300,'#ffe3b0',10),
        ('Relleno',(7,-3,6),1900,'#d9dbff',9),
        ('Borde',(0,6,8),2600,'#ffcfdf',11)):
        data=bpy.data.lights.new(name,'AREA')
        data.energy=power
        data.color=kit.lin(color)
        data.shape='DISK'
        data.size=scale
        ob=bpy.data.objects.new(name,data)
        scene.collection.objects.link(ob)
        ob.location=pos
        aim(ob,(0,0,0))
    data=bpy.data.cameras.new('Cámara')
    cam=bpy.data.objects.new('Cámara',data)
    scene.collection.objects.link(cam)
    scene.camera=cam
    data.type='ORTHO'
    data.ortho_scale=23.3
    cam.location=(0,-24,15)
    aim(cam,(0,0,0))
    scene.render.engine='CYCLES'
    scene.cycles.samples=64
    scene.cycles.use_denoising=True
    scene.render.resolution_x=1600
    scene.render.resolution_y=900
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.view_settings.view_transform='AgX'
    scene.render.film_transparent=False
    scene.render.filepath=str(ROOT/'render-kit.png')
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'planetas.blend'))
    bpy.ops.render.render(write_still=True)
    # Corno: la campana y la espiral justifican el detalle de cerca.
    for ob in objects:
        ob.hide_render=not ob['part'].startswith('corno_')
    data.ortho_scale=5.3
    cam.location=(4,-8,6)
    aim(cam,(0,0,0))
    scene.render.filepath=str(ROOT/'render-cerca.png')
    bpy.ops.render.render(write_still=True)
    for ob in objects:
        ob.hide_render=False
    print('TRIÁNGULOS POR PLANETA',json.dumps(counts))
    print('DIMENSIONES XYZ THREE',json.dumps(dimensions))
    # Anexa mediciones reales sin afirmar que hubo revisión visual.
    delivery=ROOT/'ENTREGA.md'
    if delivery.exists():
        original=delivery.read_text(encoding='utf-8').split('\n## Resultado automático de ejecución')[0]
        result='\n## Resultado automático de ejecución\n\n'
        result+='Geometría y renders generados; revisión visual de Astra pendiente.\n\n'
        result+='| Planeta | Triángulos | Dimensiones XYZ (u) |\n|---|---:|---|\n'
        for inst in NAMES:
            result+=f'| {inst} | {counts[inst]} | {dimensions[inst]} |\n'
        result+=f'\nTotal: {sum(counts.values())} triángulos; 10 partes.\n'
        if fallback:
            result+='\nGLB de juego no generado; JSON disponible. Error del convertidor:\n\n```text\n'+fallback+'\n```\n'
        delivery.write_text(original+result,encoding='utf-8')


if __name__=='__main__':
    main()
