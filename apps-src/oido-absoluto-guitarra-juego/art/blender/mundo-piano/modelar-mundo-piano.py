"""Resonancia · Dentro del piano de cola. Astra, v1.

Ejecutar con bpy-run.ps1 en la PC de Luis. No requiere texturas ni recursos
externos. Geometría escrita en coordenadas Three (Y arriba), convertida por kit.
Primero valida y exporta prototipos; después monta una escena de presentación.
No integra ni modifica el juego. Todos los archivos se escriben junto al script.
"""
from pathlib import Path
import sys
import math
import json
from collections import defaultdict

import bpy
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / "grados-mayores-juego" / "art" / "blender"))
import kit

TAU = math.tau
PIVOT = (0, 2.3, 0)
AO = {"distance": 1.5, "strength": 0.7}


def material(name, rough, metal=0, emission=0, glow="ffce76"):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (1, 1, 1, 1)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    b.inputs["Emission Color"].default_value = (*kit.lin(glow), 1)
    b.inputs["Emission Strength"].default_value = emission
    vc = m.node_tree.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Pigment"
    m.node_tree.links.new(vc.outputs["Color"], b.inputs["Base Color"])
    return m


class Geo:
    """Acumulador en Three: pigmento por vértice, sin booleanas ni modificadores.

    Cada cara es plana y simple: sum(n-2) es el presupuesto exacto de triángulos.
    Las cajas biseladas tienen 60 tris, los cilindros cerrados 4*n-4.
    """
    def __init__(self):
        self.v, self.f, self.c = [], [], []

    def add(self, verts, faces, color, M=None, grain=0.045):
        M = M if M is not None else Matrix.Identity(4)
        off = len(self.v)
        base = kit.lin(color)
        for v in verts:
            p = M @ Vector(v)
            self.v.append(tuple(p))
            # Veta larga y suave; sin ruido aleatorio ni dependencia de texturas.
            k = 1 + grain * (0.65 * math.sin(p.x * 4.9 + p.z * .19)
                             + .35 * math.sin(p.z * .71 + p.y * 1.7))
            self.c.append(tuple(min(1, max(0, x * k)) for x in base))
        self.f.extend(tuple(off + i for i in f) for f in faces)

    def box(self, size, pos, color, bevel=0, rot=(0, 0, 0)):
        w, h, d = size
        if not bevel:
            v, f = kit.g_box(w, h, d)
        else:
            b = min(bevel, w * .24, h * .24, d * .24)
            def contour(hw, hd, cut):
                return [(-hw + cut, -hd), (hw - cut, -hd), (hw, -hd + cut),
                        (hw, hd - cut), (hw - cut, hd), (-hw + cut, hd),
                        (-hw, hd - cut), (-hw, -hd + cut)]
            v = []
            for y, inset in [(-h/2, b), (-h/2+b, 0), (h/2-b, 0), (h/2, b)]:
                v += [(x, y, z) for x, z in contour(w/2-inset, d/2-inset, b*.55)]
            f = [tuple(reversed(range(8))), tuple(range(24, 32))]
            for layer in range(3):
                for i in range(8):
                    j = (i+1) % 8
                    f.append((layer*8+i, layer*8+j, (layer+1)*8+j, (layer+1)*8+i))
        self.add(v, f, color, kit.T(pos=pos, rot=rot))

    def rod(self, a, b, radius, color, sides=10, end_radius=None):
        a, b = Vector(a), Vector(b)
        delta = b-a
        q = Vector((0, 1, 0)).rotation_difference(delta.normalized())
        v, f = kit.g_cyl(radius if end_radius is None else end_radius,
                         radius, delta.length, sides)
        self.add(v, f, color, Matrix.Translation((a+b)/2) @ q.to_matrix().to_4x4())

    def tube(self, path, radius, color, sides=8):
        pts = [Vector(p) for p in path]
        v, f = [], []
        normal = Vector((0, 1, 0))
        for i, p in enumerate(pts):
            tangent = (pts[min(i+1, len(pts)-1)] - pts[max(i-1, 0)]).normalized()
            if abs(normal.dot(tangent)) > .98:
                normal = Vector((1, 0, 0))
            normal = (normal-tangent*normal.dot(tangent)).normalized()
            cross = tangent.cross(normal).normalized()
            for k in range(sides):
                angle = TAU*k/sides
                v.append(tuple(p + radius*(math.cos(angle)*normal+math.sin(angle)*cross)))
        for i in range(len(pts)-1):
            for k in range(sides):
                j = (k+1) % sides
                f.append((i*sides+k, i*sides+j, (i+1)*sides+j, (i+1)*sides+k))
        f += [tuple(reversed(range(sides))), tuple((len(pts)-1)*sides+k for k in range(sides))]
        self.add(v, f, color)

    def torus(self, radius, tube, pos, color, seg=64, sides=8, rot=(0, 0, 0)):
        v, f = kit.g_torus(radius, tube, seg, sides)
        self.add(v, f, color, kit.T(pos=pos, rot=rot))

    def slab(self, outline, top, depth, color):
        # Contorno convexo en XZ; tapas planas, canto vertical cerrado.
        n = len(outline)
        v = [(x, y, z) for y in (top-depth, top) for x, z in outline]
        f = [tuple(reversed(range(n))), tuple(range(n, 2*n))]
        f += [(i, (i+1)%n, (i+1)%n+n, i+n) for i in range(n)]
        self.add(v, f, color)

    @property
    def triangles(self):
        return sum(len(f)-2 for f in self.f)

    def object(self, name, part, mat, pivot=(0, 0, 0), segment=None):
        ob = kit.make(name, self.v, self.f, mat, part=part, tint=0, smooth_angle=.7)
        attr = ob.data.color_attributes.new(name="Pigment", type="FLOAT_COLOR", domain="POINT")
        for item, c in zip(attr.data, self.c):
            item.color = (*c, 1)
        ob.data.color_attributes.active_color = attr
        if segment is not None:
            ob["segment"] = segment
        bpy.context.scene.cursor.location = kit.B(pivot)
        bpy.ops.object.select_all(action="DESELECT")
        ob.select_set(True)
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
        ob["triangles_planned"] = self.triangles
        return ob


def build_world(mats):
    wood, gold, steel, felt, glow = [Geo() for _ in range(5)]
    # Silueta de cola: frente ancho, hombro curvo y cola redondeada asimétrica.
    outline = [(-46, 79), (42, 79), (53, 59), (57, 26), (51, -13),
               (38, -53), (24, -81), (10, -96), (-9, -101),
               (-28, -94), (-40, -75), (-46, -41)]
    wood.slab(outline, -.20, 2.8, "8c492d")
    # Tabla lateral 3 cm bajo la pasarela: evita superficies coplanares.
    # Todos los cruces del laberinto quedan exactamente en y=0.
    wood.slab([(x*.975, z*.975) for x, z in outline], -.03, .20, "d9aa69")
    # Vetas a ras: polígonos sin volumen, pigmentados, fuera del rectángulo jugable.
    for i in range(43):
        x = -42 + i*2
        z0 = -64 + max(0, x-10)*1.5
        if x < -30:
            z0 = -65
        wood.box((.025, .008, 132-(z0+65)), (x, -.031, (z0+67)/2), "b7874c")
    # Pasarela visual de abeto claro: no escalón, no huecos, sin travesaños en la ruta.
    wood.box((39, .22, 116), (0, -.11, 1), "edca8d")
    for x in (-19.1, 19.1):
        gold.box((.09, .018, 116), (x, .009, 1), "c6984c")
        wood.box((.08, .008, 115), (x*.97, -.005, 1), "ba874c")
    # Borde de mueble y moldura de hierro dorado: recorrido suave, no cajas sueltas.
    # Catmull deja el canto continuo y suaviza el contorno del piano de cuento.
    curved = kit.catmull([(x, 1.1, z) for x, z in [outline[-1]]+outline+[outline[0], outline[1]]], per=4)
    # Se usa el tramo central cerrado, evitando las prolongaciones de Catmull.
    rim = curved[4:-4]
    wood.tube(rim, 1.15, "693420", 10)
    gold.tube([(p.x, .45, p.z) for p in rim], .48, "d6a04c", 10)
    gold.tube([(p.x, 2.1, p.z) for p in rim], .12, "ffe1a0", 8)
    # Arpa: costillas y puentes en los laterales, todo fuera del paso x=±17.5.
    for side in (-1, 1):
        x = side*22
        gold.rod((x, .45, 66), (x, .45, -67), .72, "cb9140", 12)
        for z in (-55, -24, 10, 43):
            endx = side*(38 if z < -40 else 43)
            gold.rod((side*21.2, .5, z), (endx, .5, z-8), .85, "e2b55c", 12)
            gold.torus(.92, .17, (side*24, 1.05, z-1.1), "f5cc7a", 24, 6,
                       rot=(math.pi/2, 0, 0))
        felt.box((1.6, .16, 133), (side*24.2, .3, -.5), "9d3646", .06)
    # 66 cuerdas longitudinales, en grupos de tres. Bajo el robot no hay obstáculos.
    for side in (-1, 1):
        for group in range(11):
            for course in range(3):
                x = side*(25.5+group*1.32+course*.18)
                end = -74 + group*3.6 + (9 if side == 1 else 0)
                steel.rod((x, .70, 63), (x, .70, end), .047 if group < 5 else .032,
                          "e3b66e" if side == -1 else "eee0b4", 6)
            # Clavijas altas con collar y cabeza cuadrada: escala monumental.
            x = side*(25.5+group*1.32)
            steel.rod((x, .2, 66), (x, 2.2, 66), .29, "a1a6a3", 10)
            gold.rod((x, .25, 66), (x, .54, 66), .52, "e8b85e", 12)
            steel.box((.63, .40, .63), (x, 2.2, 66), "d1c8ab", .07, rot=(0, group*.24, 0))
    # Mecánica transversal detrás de la entrada del laberinto.
    wood.box((84, 1.5, 4), (0, .75, 73), "9d6037", .4)
    felt.box((82, .24, 2.3), (0, 1.61, 73), "963b4c", .08)
    for i in range(28):
        x = -39+i*2.85
        wood.rod((x, 1, 72), (x, 4.9, 68), .22, "b47c49", 8)
        felt.box((1.9, 1.6, 2.7), (x, 5.1, 67.8), "f5dfb8", .34,
                 rot=(-.18, 0, 0))
        felt.box((1.94, .22, 2.5), (x, 4.55, 67.8), "b14d58", .07)
    # Apagadores gigantes en la periferia: varillas de latón y zapatas de fieltro.
    for side in (-1, 1):
        for i in range(16):
            x, z = side*40.2, -49+i*6.5
            gold.rod((x, .6, z), (x, 3.4, z), .12, "dcb45b", 8)
            wood.box((2.7, .46, 2.5), (x, 3.4, z), "7e462e", .14)
            felt.box((2.55, .55, 2.35), (x, 3.02, z), "56705a", .18)
    # Tapa abierta: hinge longitudinal a la izquierda, techo inclinado hacia el eje.
    # Su área queda x=-46..-7, y=7..49; conserva abierta la vista desde la derecha.
    a = Vector((-45, 6, -5))
    b = Vector((-8, 47, -5))
    angle = -math.atan2(b.y-a.y, b.x-a.x)
    lid_center = (a+b)/2
    lid_outline = [(-27, -82), (27, -82), (27, 63), (18, 80),
                   (-4, 85), (-23, 72), (-27, 35)]
    # Losa local horizontal, girada sobre Z para abrirla desde la bisagra.
    lid = Geo()
    lid.slab(lid_outline, .65, 1.3, "693323")
    lidM = kit.T(pos=tuple(lid_center), rot=(0, 0, -angle))
    wood.add(lid.v, lid.f, "743a25", lidM)
    # Casetones bajo la tapa, todos en su mismo plano inclinado.
    for z in (-62, -30, 2, 34, 62):
        local = Geo()
        local.box((48, .24, .35), (0, -.85, z), "bc7e43", .06)
        wood.add(local.v, local.f, "bc7e43", lidM)
    for x in (-24, 24):
        local = Geo()
        local.box((.45, .30, 142), (x, -.86, -1), "efc477", .08)
        gold.add(local.v, local.f, "efc477", lidM)
    gold.rod((-44, 4, 34), (-16, 38, 34), .48, "dfae57", 12)
    gold.rod((-44, 4, -45), (-16, 38, -45), .48, "dfae57", 12)
    # Rosetas y pequeñas luces geométricas: magia sin partículas ni transparencia.
    for side in (-1, 1):
        for z in (-58, -31, -4, 23, 50):
            x = side*21.6
            gold.torus(.6, .12, (x, .12, z), "edc879", 24, 6, rot=(math.pi/2, 0, 0))
            glow.rod((x, .12, z), (x, .30, z), .22, "ffe4a2", 8, .10)
    objects = []
    for segment, (g, key, name) in enumerate(zip(
            (wood, gold, steel, felt, glow),
            ("wood", "gold", "steel", "felt", "glow"),
            ("Tabla y tapa", "Arpa y molduras", "Cuerdas y clavijas", "Fieltros", "Rosetas luminosas"))):
        objects.append(g.object(name, "world", mats[key], segment=segment))
    return objects


def build_wall(length, along_z, mat):
    g = Geo()
    # Exactamente 5/5.7 x 1.2 x .34. Bisel sin modificadores; pigmento multimaterial.
    g.box((length, .24, .34), (0, .12, 0), "825037", .045)
    g.box((length, .12, .31), (0, .30, 0), "a83e4d", .025)
    g.box((length, .12, .30), (0, .94, 0), "bc9057", .025)
    for i in range(8):
        x = -length/2 + (i+.5)*length/8
        g.box((length/8*.70, .52, .25), (x, .62, 0), "c28b52", .035)
        g.box((length/8*.87, .20, .32), (x, 1.10, 0), "f1d6a6", .035)
    # Un material compartido por parte: se prioriza madera satinada y fieltro.
    if along_z:
        M = kit.T(rot=(0, math.pi/2, 0))
        g.v = [tuple(M @ Vector(v)) for v in g.v]
    return g.object("Apagadores Z" if along_z else "Apagadores X",
                    "wall_z" if along_z else "wall_x", mat)


def build_post(mat):
    g = Geo()
    g.box((.5, .16, .5), (0, .08, 0), "8b5437", .04)
    g.rod((0, .16, 0), (0, 1.18, 0), .17, "d8b16b", 12)
    g.rod((0, .93, 0), (0, 1.03, 0), .23, "9c3d4c", 12)
    g.box((.42, .17, .42), (0, 1.265, 0), "f4d18c", .045)
    return g.object("Clavija de unión", "post", mat)


def build_portal(mats):
    g = Geo()
    # Hueco nominal 2.2. Torus exterior deja luz interior de 2.2 y toca el suelo.
    g.torus(2.47, .23, PIVOT, "d2a04d", 80, 10)
    g.torus(2.76, .09, (0, 2.3, -.08), "f6d58b", 80, 6)
    for side in (-1, 1):
        g.box((.8, .35, 1.25), (side*2.7, .175, 0), "a76d37", .10)
        g.rod((side*2.7, .35, 0), (side*2.7, 2.3, 0), .17, "d5aa60", 12)
        g.rod((side*2.7, 2.3, 0), (side*1.3, 4.8, 0), .12, "ecc57b", 10)
    # Corona de diapasón, reminiscencia del oficio del robot.
    for x in (-.4, .4):
        g.box((.18, 1.2, .28), (x, 5.3, 0), "efd28c", .045)
    g.box((.9, .18, .28), (0, 4.72, 0), "d3a257", .04)
    g.rod((0, 4.22, 0), (0, 4.72, 0), .13, "d3a257", 10)
    frame = g.object("Puerta del diapasón", "portal_frame", mats["gold"], PIVOT)
    rings = []
    for i, (r, depth) in enumerate(((2.15, .12), (1.96, .26))):
        ring = Geo()
        ring.torus(r, .055, (0, 2.3, depth), "ffe2a4", 80, 6)
        # Doce marcas asimétricas hacen legible el giro de los anillos.
        for k in range(12):
            a = TAU*k/12
            pos = (math.cos(a)*r, 2.3+math.sin(a)*r, depth)
            ring.box((.08, .21 if k % 3 else .35, .10), pos,
                     "8eb8a9" if k % 3 else "fff0c1", .018, rot=(0, 0, a-math.pi/2))
        rings.append(ring.object(f"Aro de afinación {i}", "portal_ring", mats["glow"], PIVOT, i))
    core = Geo()
    # Disco cerrado de bordes lenticulares, opaco: ocultar hasta desbloqueo.
    v = [(0, 0, -.10)]
    for r, z in ((1.7, -.08), (1.85, 0), (1.7, .08)):
        v.extend((r*math.cos(TAU*k/64), r*math.sin(TAU*k/64), z) for k in range(64))
    v.append((0, 0, .10))
    f = []
    for k in range(64):
        j = (k+1) % 64
        f.append((0, 1+j, 1+k))
        for ring in range(2):
            off = 1+ring*64
            f.append((off+k, off+j, off+64+j, off+64+k))
        f.append((193, 129+k, 129+j))
    core.add(v, f, "a7e3ca", kit.T(pos=PIVOT))
    center = core.object("Corazón de resonancia", "portal_core", mats["core"], PIVOT)
    return [frame]+rings+[center]


def three_bounds(ob):
    bpy.context.view_layer.update()
    p = [ob.matrix_world @ v.co for v in ob.data.vertices]
    q = [(v.x, v.z, -v.y) for v in p]
    return [[min(v[i] for v in q) for i in range(3)],
            [max(v[i] for v in q) for i in range(3)]]


def validate(objects):
    totals = defaultdict(int)
    rows = []
    for ob in objects:
        ob.data.calc_loop_triangles()
        n = len(ob.data.loop_triangles)
        assert n == ob["triangles_planned"], (ob.name, n, ob["triangles_planned"])
        totals[ob["part"]] += n
        rows.append(dict(name=ob.name, part=ob["part"], segment=ob.get("segment"),
                         triangles=n, bounds=three_bounds(ob)))
        assert len(ob.data.materials) == 1, ob.name
        assert ob.data.color_attributes.active_color is not None, ob.name
    for part, cap in (("world", 60000), ("wall_x", 1500), ("wall_z", 1500), ("post", 1500)):
        assert totals[part] <= cap, (part, totals[part], cap)
    assert sum(totals[p] for p in ("portal_frame", "portal_ring", "portal_core")) <= 15000
    for part, expected in (("wall_x", (5, 1.2, .34)), ("wall_z", (.34, 1.2, 5.7)),
                           ("post", (.5, 1.35, .5))):
        ob = next(o for o in objects if o["part"] == part)
        lo, hi = three_bounds(ob)
        assert max(abs((hi[i]-lo[i])-expected[i]) for i in range(3)) < 1e-4, (part, lo, hi)
        assert abs(lo[1]) < 1e-5
        assert ob.location.length < 1e-5
    assert {o.get("segment") for o in objects if o["part"] == "portal_ring"} == {0, 1}
    for ob in objects:
        if ob["part"].startswith("portal"):
            assert (ob.location-kit.B(PIVOT)).length < 1e-5
        elif ob["part"] == "world":
            assert ob.location.length < 1e-5
    print("PRESUPUESTO", json.dumps(dict(totals), ensure_ascii=False))
    return dict(totals), rows


def point_camera(name, pos, target, lens=46, ortho=None):
    data = bpy.data.cameras.new(name)
    ob = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = kit.B(pos)
    ob.rotation_euler = (kit.B(target)-ob.location).to_track_quat("-Z", "Y").to_euler()
    data.lens = lens
    data.clip_end = 650
    if ortho:
        data.type = "ORTHO"
        data.ortho_scale = ortho
    return ob


def area(name, pos, target, power, color, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy, data.color, data.shape, data.size = power, kit.lin(color), "DISK", size
    ob = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = kit.B(pos)
    ob.rotation_euler = (kit.B(target)-ob.location).to_track_quat("-Z", "Y").to_euler()


def staging(objects):
    """Solo tras exportar. Copias vinculadas sin `part`; originales de plantilla ocultos."""
    scene = bpy.context.scene
    preview = bpy.data.collections.new("PRESENTACIÓN · no exportar")
    scene.collection.children.link(preview)
    protos = {o["part"]: o for o in objects if o["part"] in ("wall_x", "wall_z", "post")}
    for ob in protos.values():
        ob.hide_render = True
        ob.hide_set(True)
    def clone(part, x, z):
        ob = protos[part].copy()
        ob.data = protos[part].data
        preview.objects.link(ob)
        ob.name = "Muestra · " + part
        del ob["part"]
        ob.hide_render = False
        ob.hide_set(False)
        ob.location = kit.B((x, 0, z))
    # Recorrido demostrativo con celdas de 5 x 5.7, no un laberinto exportado.
    nodes = set()
    for row in range(17):
        z = -44.3+row*5.7
        for col in range(6):
            x = -15+col*5
            if (row*3+col*7) % 7 < 3:
                clone("wall_x", x, z)
                nodes.update(((x-2.5, z), (x+2.5, z)))
            if (row*5+col*3) % 9 < 3:
                clone("wall_z", x+2.5, z+2.85)
                nodes.update(((x+2.5, z), (x+2.5, z+5.7)))
    for x, z in sorted(nodes):
        clone("post", x, z)
    # Portal de fondo; cada malla conserva orientación +Z y posición relativa.
    for ob in objects:
        if ob["part"].startswith("portal"):
            ob.location += kit.B((0, 0, -58))
    # Usa el robot existente solo si existe un GLB portable; nunca lo remodela.
    robot_path = ROOT.parent / "robot" / "robot.glb"
    robot_status = "Robot no incluido en render: no se encontró robot.glb."
    if robot_path.exists():
        before = set(bpy.data.objects)
        try:
            bpy.ops.import_scene.gltf(filepath=str(robot_path))
            imported = set(bpy.data.objects)-before
            parent = bpy.data.objects.new("Robot · solo referencia", None)
            preview.objects.link(parent)
            for ob in imported:
                if ob.parent not in imported:
                    ob.parent = parent
                if "part" in ob:
                    del ob["part"]
            parent.location = kit.B((0, 0, 43))
            robot_status = "Robot existente importado solo para renders, sin cambiar escala."
        except Exception as exc:
            for ob in set(bpy.data.objects)-before:
                bpy.data.objects.remove(ob, do_unlink=True)
            robot_status = "Robot no incluido en render: " + str(exc)
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.cycles.device = "CPU"
    scene.render.resolution_x, scene.render.resolution_y = 1600, 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    world = bpy.data.worlds.new("Aire de miel")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (*kit.lin("b7c9c6"), 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = .55
    scene.world = world
    area("Luz bajo la tapa", (5, 65, 5), (0, 0, -10), 150000, "ffe0a6", 65)
    area("Ventana de la derecha", (75, 43, 32), (0, 0, -10), 120000, "e1f1ed", 65)
    area("Ámbar al fondo", (-10, 32, -84), (0, 0, -30), 65000, "ffd18c", 40)
    wide = point_camera("Juego · elevada", (105, 112, 154), (0, 8, -6), ortho=207)
    close = point_camera("Cerca · martillos y cuerdas", (54, 26, 90), (25, 2, 58), lens=44)
    scene.camera = wide
    previous_versions = bpy.context.preferences.filepaths.save_version
    try:
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "mundo-piano.blend"))
    finally:
        bpy.context.preferences.filepaths.save_version = previous_versions
    for cam, filename in ((wide, "render-juego.png"), (close, "render-cerca.png")):
        scene.camera = cam
        scene.render.filepath = str(ROOT / filename)
        bpy.ops.render.render(write_still=True)
    scene.camera = wide
    return robot_status


def execution_report(totals, rows, export_error, robot_status):
    # Se añade evidencia real sin convertir ejecución automática en revisión visual.
    text = "\n\n## Resultado de ejecución (automático; revisión visual pendiente)\n\n"
    text += "| Parte | Segmento | Triángulos |\n|---|---|---:|\n"
    for r in rows:
        text += f"| `{r['part']}` | {r['segment'] if r['segment'] is not None else '—'} | {r['triangles']:,} |\n"
    text += f"\nTotal prototipos: **{sum(totals.values()):,} triángulos**.\n\n"
    wr = [r for r in rows if r["part"] == "world"]
    lo = [min(r["bounds"][0][i] for r in wr) for i in range(3)]
    hi = [max(r["bounds"][1][i] for r in wr) for i in range(3)]
    text += "Límites reales del mundo (Three, XYZ): " + str(lo) + " a " + str(hi) + ".\n\n"
    text += "Dimensiones XYZ: " + str([round(hi[i]-lo[i], 3) for i in range(3)]) + " m.\n\n"
    text += robot_status + "\n\n"
    if export_error:
        text += "**GLB de juego pendiente:** " + export_error.replace("\n", " ") + "\n\n"
        text += "Se dejó el JSON de respaldo sin AO; no equivale al GLB final con AO solicitado.\n\n"
    else:
        text += "GLB de juego y JSON generados con AO distance=1.5, strength=0.7.\n\n"
    for filename in ("mundo-piano.blend", "mundo-piano.glb", "mundo-piano-juego.glb", "mundo-piano.json",
                     "render-juego.png", "render-cerca.png"):
        p = ROOT / filename
        text += f"- `{filename}`: {p.stat().st_size:,} bytes.\n" if p.exists() else f"- `{filename}`: pendiente.\n"
    path = ROOT / "ENTREGA.md"
    original = path.read_text(encoding="utf-8")
    original = original.split("\n\n## Resultado de ejecución")[0]
    path.write_text(original+text, encoding="utf-8")


def main():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    kit.setup(bpy.context.collection, 171026)
    mats = {
        "wood": material("Abeto y nogal barnizado", .46),
        "gold": material("Hierro dorado y latón", .31, .68),
        "steel": material("Acero de cuerdas", .28, .72),
        "felt": material("Fieltro crema, carmín y salvia", .91),
        "glow": material("Marcas de afinación", .36, .25, .55),
        "core": material("Resonancia abierta", .42, .05, 1.6, "a7e3ca"),
        "wall": material("Apagador · pigmento satinado", .62, .08),
    }
    objects = build_world(mats)
    objects += [build_wall(5, False, mats["wall"]), build_wall(5.7, True, mats["wall"]),
                build_post(mats["wall"])]
    objects += build_portal(mats)
    totals, rows = validate(objects)
    meta = dict(
        name="Dentro del piano de cola", version=1, forward="+Z", units="m",
        mazeBounds={"min": [-17.5, 0, -50], "max": [17.5, 0, 52.6]},
        floorY=0, portalCenter=list(PIVOT), portalRadius=2.2,
        portalSuggestedPosition=[0, 0, -58], robotSuggestedPosition=[0, 0, 43],
        worldSegments={"0": "wood", "1": "gold", "2": "steel", "3": "felt", "4": "glow"},
        animation={"portal_ring": [{"segment": 0, "axis": "Z", "radPerSecond": .18},
                                     {"segment": 1, "axis": "Z", "radPerSecond": -.12}],
                   "portal_core": {"scaleAmplitude": .035, "cyclesPerSecond": .7,
                                     "hiddenUntilUnlocked": True}},
        note="Prototipos sin colocar; world origen 0. Portal centro local y=2.3. Escena blend contiene muestras solo de presentación.")
    # Exportación contractual, antes de mover los pivotes para las fotografías.
    export_error = None
    try:
        # Los originales se mantienen intactos para el GLB portable y el .blend.
        parts, tris, size = kit.export_glb(
            ROOT / "mundo-piano-juego.glb", objects=objects, meta=meta,
            ao={"distance": 1.5, "strength": .7}, json_path=ROOT / "mundo-piano.json")
        print("EXPORT", parts, "partes", tris, "triángulos", size//1024, "KB")
    except RuntimeError as exc:
        # Kit restaura las copias en finally si el conversor Node no está disponible.
        export_error = str(exc)
        kit.export_parts(ROOT / "mundo-piano.json", objects=objects, meta=meta)
        print("RESPALDO JSON; GLB JUEGO PENDIENTE:", export_error)
    bpy.ops.object.select_all(action="DESELECT")
    for ob in objects:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(filepath=str(ROOT / "mundo-piano.glb"), export_format="GLB",
                              use_selection=True, export_extras=True, export_animations=False,
                              export_yup=True)
    robot_status = staging(objects)
    execution_report(totals, rows, export_error, robot_status)
    print("LISTA PARA REVISIÓN PROPIA: render-juego.png y render-cerca.png")


if __name__ == "__main__":
    main()
