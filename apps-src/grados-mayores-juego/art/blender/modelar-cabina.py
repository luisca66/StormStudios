"""Cabina de vapor del Expreso Tonal — modelada con Blender 4.5 (bpy), diseño propio.

Referencias de Luis (solo forma e ideas, no se copian ni se incluyen): frente de caldera
rojo óxido con latón y remaches, puerta del hogar, nivel de agua, tuberías de cobre y
cuadrante del inversor; placas de manómetros esmaltadas y pedestal crema del freno.

Regla de oro del encuadre (validado por Luis): las tres ventanas NO se mueven y nada
cruza la línea ojo→borde inferior del parabrisas. Todo lo vistoso vive en la franja baja.

Coordenadas: se autora en el espacio LOCAL DE LA CABINA de Three.js (Y arriba, el tren
avanza hacia -Z, ancla = swayObject) y se convierte a Blender (Z arriba) al crear.
Ojo del maquinista = (0, 0.28, 0.3) · parabrisas en z = -1.75 · FOV vertical 60°.

Ejecutar:  powershell -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 art\\blender\\modelar-cabina.py
Variables: CAB_RENDER=0 omite los renders Cycles; CAB_SAMPLES=n ajusta la calidad.
Salidas: cabina-vapor.blend / .glb / -pov.png / -vista.png y src/3d/assets/cabina-vapor.json
"""
import bpy
import bmesh
import json
import math
import os
import random
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parent
GAME = ROOT.parent.parent
DATA = GAME / "src" / "3d" / "assets"
DATA.mkdir(parents=True, exist_ok=True)
RENDER = os.environ.get("CAB_RENDER", "1") != "0"
SAMPLES = int(os.environ.get("CAB_SAMPLES", "48"))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
CAB = bpy.data.collections.new("Cabina")
STAGE = bpy.data.collections.new("Solo render")
scene.collection.children.link(CAB)
scene.collection.children.link(STAGE)
rng = random.Random(20260913)

EYE = Vector((0, 0.28, 0.3))
FZ = -1.75

# ---------------------------------------------------------------------------
# Conversión Three (Y arriba) → Blender (Z arriba)
# ---------------------------------------------------------------------------
C3B = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))


def B(v):
    return Vector((v[0], -v[2], v[1]))


def T(pos=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    """Matriz Three: traslación · Rx · Ry · Rz · escala (orden Euler 'XYZ' de three)."""
    r = Matrix.Rotation(rot[0], 4, "X") @ Matrix.Rotation(rot[1], 4, "Y") @ Matrix.Rotation(rot[2], 4, "Z")
    s = Matrix.Diagonal((*scale, 1))
    return Matrix.Translation(Vector(pos)) @ r @ s


def facing(pos, target=EYE, up=(0, 1, 0)):
    """Marco cuyo +Z local mira hacia `target` (caras de manómetro hacia el ojo)."""
    z = (Vector(target) - Vector(pos)).normalized()
    x = Vector(up).cross(z).normalized()
    y = z.cross(x)
    m = Matrix.Identity(4)
    for i in range(3):
        m[i][0], m[i][1], m[i][2], m[i][3] = x[i], y[i], z[i], pos[i]
    return m


def lin(hex_color):
    h = hex_color.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(out)


# ---------------------------------------------------------------------------
# Materiales: el JSON guarda los parámetros PBR para reconstruirlos en Three
# ---------------------------------------------------------------------------
MATS = {}


def material(key, name, hex_color, metal=0.0, rough=0.5, emit_hex=None, emit=0.0):
    m = bpy.data.materials.new(name)
    color = lin(hex_color)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Metallic"].default_value = metal
    p.inputs["Roughness"].default_value = rough
    if emit_hex:
        p.inputs["Emission Color"].default_value = (*lin(emit_hex), 1)
        p.inputs["Emission Strength"].default_value = emit
    m["game"] = dict(key=key, color=hex_color, metalness=metal, roughness=rough,
                     emissive=emit_hex or "#000000", emissiveIntensity=emit)
    MATS[key] = m
    return m


PAINT = material("paint", "Rojo óxido de caldera", "#7a3527", 0.25, 0.55)
PAINT_DARK = material("paintDark", "Rojo óxido sombra", "#4f2219", 0.2, 0.6)
BRASS = material("brass", "Latón pulido", "#c9a227", 1.0, 0.3)
COPPER = material("copper", "Cobre", "#b86a40", 1.0, 0.36)
IRON = material("iron", "Hierro fundido", "#2b2b30", 0.55, 0.6)
STEEL = material("steel", "Acero satinado", "#8d9096", 0.9, 0.34)
WOOD = material("wood", "Caoba", "#5a3420", 0.0, 0.55)
FLOOR = material("floor", "Tablones gastados", "#4b433a", 0.0, 0.85)
CREAM = material("cream", "Esmalte crema", "#cdbb97", 0.05, 0.4)
ENAMEL = material("enamel", "Esmalte negro", "#18181c", 0.1, 0.3)
GAUGE = material("gauge", "Carátula de manómetro", "#f3ead7", 0.0, 0.35)
GLASS_TUBE = material("waterGlass", "Nivel de agua", "#9fc9c2", 0.1, 0.08, "#4d8f86", 0.35)
LAMP = material("lamp", "Farol", "#ffe2a8", 0.0, 0.3, "#ffc46b", 2.2)
FIRE = material("fire", "Resplandor del hogar", "#ff6a1a", 0.0, 0.6, "#ff4d0a", 1.5)
BLACK = material("rubber", "Empuñadura negra", "#121214", 0.0, 0.45)
INK = material("ink", "Tinta de escala", "#1f1b17", 0.0, 0.5)
RED = material("redScale", "Zona roja", "#b3362c", 0.0, 0.5)
NEEDLE_MAT = material("needle", "Aguja", "#3a1c12", 0.3, 0.4)
WINDOW = material("glass", "Cristal de ventana", "#d6edf0", 0.0, 0.05)
COAL = material("coal", "Carbón", "#1b1a1c", 0.25, 0.32)
CHECKER = material("checker", "Chapa estriada", "#55575b", 0.7, 0.5)

# ---------------------------------------------------------------------------
# Generadores de malla (espacio local Three)
# ---------------------------------------------------------------------------


def make(name, verts, faces, mat, M=None, part="static", smooth_angle=0.62, uvs=None,
         tint=0.06, recalc=True):
    M = M if M is not None else Matrix.Identity(4)
    me = bpy.data.meshes.new(name)
    me.from_pydata([B(M @ Vector(v)) for v in verts], [], faces)
    me.update()
    if uvs:
        layer = me.uv_layers.new(name="UV")
        for loop in me.loops:
            layer.data[loop.index].uv = uvs[loop.vertex_index]
    if recalc:
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
    for p in me.polygons:
        p.use_smooth = True
    me.set_sharp_from_angle(angle=smooth_angle)
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    CAB.objects.link(ob)
    ob["part"] = part
    # Variación de tono por pieza: tablones, placas y remaches no salen idénticos.
    k = 1 + rng.uniform(-tint, tint)
    ob["tint"] = [k, k * (1 + rng.uniform(-0.015, 0.015)), k]
    return ob


def bevel(ob, width=0.008, segments=2):
    mod = ob.modifiers.new("Bisel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    mod.harden_normals = True
    return ob


def g_box(w, h, d):
    x, y, z = w / 2, h / 2, d / 2
    v = [(-x, -y, -z), (x, -y, -z), (x, y, -z), (-x, y, -z), (-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (2, 3, 7, 6), (1, 2, 6, 5), (0, 4, 7, 3)]
    return v, f


def g_cyl(r_top, r_bot, h, seg=24, caps=True):
    v, f = [], []
    for y, r in ((-h / 2, r_bot), (h / 2, r_top)):
        for i in range(seg):
            a = i / seg * math.tau
            v.append((math.sin(a) * r, y, math.cos(a) * r))
    for i in range(seg):
        j = (i + 1) % seg
        f.append((i, j, seg + j, seg + i))
    if caps:
        f.append(tuple(reversed(range(seg))))
        f.append(tuple(range(seg, 2 * seg)))
    return v, f


def g_disc(r, seg=40):
    """Disco en el plano XY mirando a +Z, con UV radial (carátulas)."""
    v = [(0, 0, 0)] + [(math.cos(i / seg * math.tau) * r, math.sin(i / seg * math.tau) * r, 0) for i in range(seg)]
    f = [(0, 1 + i, 1 + (i + 1) % seg) for i in range(seg)]
    uv = [(0.5 + x / (2 * r), 0.5 + y / (2 * r)) for x, y, _ in v]
    return v, f, uv


def g_lathe(profile, seg=32):
    """Revolución alrededor de Y. profile = [(radio, y), ...]."""
    v, f = [], []
    n = len(profile)
    for i in range(seg):
        a = i / seg * math.tau
        for r, y in profile:
            v.append((math.sin(a) * r, y, math.cos(a) * r))
    for i in range(seg):
        j = (i + 1) % seg
        for k in range(n - 1):
            f.append((i * n + k, j * n + k, j * n + k + 1, i * n + k + 1))
    return v, f


def g_torus(R, r, seg=32, tube=8):
    """Anillo en el plano XY (eje +Z)."""
    v, f = [], []
    for i in range(seg):
        u = i / seg * math.tau
        for k in range(tube):
            w = k / tube * math.tau
            rr = R + math.cos(w) * r
            v.append((math.cos(u) * rr, math.sin(u) * rr, math.sin(w) * r))
    for i in range(seg):
        j = (i + 1) % seg
        for k in range(tube):
            m = (k + 1) % tube
            f.append((i * tube + k, j * tube + k, j * tube + m, i * tube + m))
    return v, f


def g_prism(pts, depth):
    """Polígono 2D (XY) extruido en Z centrado."""
    n = len(pts)
    v = [(x, y, -depth / 2) for x, y in pts] + [(x, y, depth / 2) for x, y in pts]
    f = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    f.append(tuple(reversed(range(n))))
    f.append(tuple(range(n, 2 * n)))
    return v, f


def g_ring_prism(outer, inner, depth):
    """Marco: contorno exterior e interior con el MISMO número de puntos."""
    n = len(outer)
    v = ([(x, y, -depth / 2) for x, y in outer] + [(x, y, depth / 2) for x, y in outer]
         + [(x, y, -depth / 2) for x, y in inner] + [(x, y, depth / 2) for x, y in inner])
    f = []
    for i in range(n):
        j = (i + 1) % n
        f.append((i, j, n + j, n + i))                  # canto exterior
        f.append((2 * n + j, 2 * n + i, 3 * n + i, 3 * n + j))  # canto interior
        f.append((n + i, n + j, 3 * n + j, 3 * n + i))  # cara frontal
        f.append((j, i, 2 * n + i, 2 * n + j))          # cara trasera
    return v, f


def combine(parts):
    """[(verts, faces, M)] → una sola malla (menos objetos, mismo material)."""
    V, F = [], []
    for verts, faces, M in parts:
        o = len(V)
        V.extend(tuple(M @ Vector(p)) for p in verts)
        F.extend(tuple(i + o for i in face) for face in faces)
    return V, F


def catmull(points, per=8):
    pts = [Vector(p) for p in points]
    out = []
    for i in range(len(pts) - 1):
        p0 = pts[max(i - 1, 0)]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[min(i + 2, len(pts) - 1)]
        for s in range(per):
            t = s / per
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(pts[-1])
    return out


def pipe(name, points, r, mat, sides=10, per=8, part="static"):
    """Tubo con marcos de transporte paralelos (sin giros bruscos en las curvas)."""
    path = catmull(points, per)
    v, f = [], []
    tangent = (path[1] - path[0]).normalized()
    normal = Vector((0, 1, 0)) if abs(tangent.y) < 0.9 else Vector((1, 0, 0))
    normal = (normal - tangent * normal.dot(tangent)).normalized()
    for i, p in enumerate(path):
        if i > 0:
            t_new = (path[min(i + 1, len(path) - 1)] - path[i - 1]).normalized()
            normal = (normal - t_new * normal.dot(t_new)).normalized()
            tangent = t_new
        binormal = tangent.cross(normal)
        for k in range(sides):
            a = k / sides * math.tau
            v.append(tuple(p + (normal * math.cos(a) + binormal * math.sin(a)) * r))
    n = len(path)
    for i in range(n - 1):
        for k in range(sides):
            m = (k + 1) % sides
            f.append((i * sides + k, (i + 1) * sides + k, (i + 1) * sides + m, i * sides + m))
    f.append(tuple(reversed(range(sides))))
    f.append(tuple((n - 1) * sides + k for k in range(sides)))
    return make(name, v, f, mat, part=part, smooth_angle=1.2)


def rivets(name, spots, r, mat=None, part="static"):
    """Remaches en cúpula. spots = [(pos, normal)]."""
    prof = [(r, 0), (r * 0.92, r * 0.38), (r * 0.7, r * 0.72), (r * 0.36, r * 0.94), (0.0001, r)]
    dv, df = g_lathe(prof, 8)
    parts = []
    for pos, nrm in spots:
        nrm = Vector(nrm).normalized()
        q = Vector((0, 1, 0)).rotation_difference(nrm).to_matrix().to_4x4()
        parts.append((dv, df, Matrix.Translation(Vector(pos)) @ q))
    v, f = combine(parts)
    return make(name, v, f, mat or PAINT, part=part, smooth_angle=1.5, recalc=False)


def rounded_poly(corners, r, per=6):
    """Réplica de roundedQuadPath de cab.ts (esquinas cuadráticas) muestreada."""
    n = len(corners)
    P = [Vector(c) for c in corners]
    out = []
    for i in range(n):
        c = P[i]
        before = (c - P[i - 1]).normalized()
        after = (P[(i + 1) % n] - c).normalized()
        a = c - before * r
        b = c + after * r
        for s in range(per + 1):
            t = s / per
            out.append(tuple(a * (1 - t) ** 2 + c * 2 * (1 - t) * t + b * t * t))
    return out


# Ventanas: MISMAS medidas que la cabina validada (cab.ts).
GLASS_Y_BOTTOM, GLASS_Y_TOP = -0.4, 1.22
GLASS_HW_BOTTOM, GLASS_HW_TOP = 1.3, 1.22
SIDE_IN_BOTTOM, SIDE_OUT_BOTTOM, SIDE_IN_TOP, SIDE_OUT_TOP = 1.53, 1.87, 1.45, 1.79


def glass_corners(g):
    return [(-GLASS_HW_BOTTOM - g, GLASS_Y_BOTTOM - g), (GLASS_HW_BOTTOM + g, GLASS_Y_BOTTOM - g),
            (GLASS_HW_TOP + g, GLASS_Y_TOP + g), (-GLASS_HW_TOP - g, GLASS_Y_TOP + g)]


def side_corners(s, g):
    iB, oB, iT, oT = SIDE_IN_BOTTOM - g, SIDE_OUT_BOTTOM + g, SIDE_IN_TOP - g, SIDE_OUT_TOP + g
    yB, yT = GLASS_Y_BOTTOM - g, GLASS_Y_TOP + g
    return ([(iB, yB), (oB, yB), (oT, yT), (iT, yT)] if s > 0
            else [(-oB, yB), (-iB, yB), (-iT, yT), (-oT, yT)])


def below_sightline(y, z):
    """¿Queda (y, z) por debajo de la visual ojo→borde inferior del parabrisas?"""
    k = (GLASS_Y_BOTTOM - EYE.y) / (FZ - EYE.z)
    return y < EYE.y + (z - EYE.z) * k


# ===========================================================================
# 1. PARED FRONTAL: chapa rojo óxido remachada con tres huecos y marcos de latón
# ===========================================================================
WALL_D = 0.08
v, f = g_box(4.24, 3.0, WALL_D)
wall = make("Pared frontal", v, f, PAINT, T((0, 0.13, FZ)), tint=0)
for i, (corners, rad) in enumerate([(glass_corners(0), 0.15)] + [(side_corners(s, 0), 0.09) for s in (-1, 1)]):
    hv, hf = g_prism(rounded_poly(corners, rad), 0.4)
    cutter = make(f"Hueco {i}", hv, hf, PAINT, T((0, 0, FZ)), part="cutter")
    cutter.hide_render = True
    cutter.hide_viewport = True
    mod = wall.modifiers.new(f"Hueco {i}", "BOOLEAN")
    mod.object = cutter
    mod.operation = "DIFFERENCE"
    mod.solver = "EXACT"
bevel(wall, 0.012, 2)

# Marcos de latón (hacia el maquinista) + cristales (se exportan aparte).
for i, (make_c, rad) in enumerate([(glass_corners, 0.15)] + [((lambda g, s=s: side_corners(s, g)), 0.09) for s in (-1, 1)]):
    outer = rounded_poly(make_c(0.07), rad + 0.06)
    inner = rounded_poly(make_c(0.0), rad)
    fv, ff = g_ring_prism(outer, inner, 0.035)
    bevel(make(f"Marco de latón {i}", fv, ff, BRASS, T((0, 0, FZ + WALL_D / 2 + 0.0175)), tint=0.02), 0.006)
    gv, gf = g_prism(inner, 0.004)
    make(f"Cristal {i}", gv, gf, WINDOW, T((0, 0, FZ - 0.012)), part="glass", tint=0)
    # Tornillería del marco: cabezas de latón cada ~16 cm sobre el contorno exterior.
    ring = rounded_poly(make_c(0.035), rad + 0.03, per=3)
    spots, acc = [], 0.0
    for a, b in zip(ring, ring[1:] + ring[:1]):
        seg_len = (Vector(b) - Vector(a)).length
        acc += seg_len
        if acc >= 0.16:
            acc = 0.0
            spots.append(((b[0], b[1], FZ + WALL_D / 2 + 0.037), (0, 0, 1)))
    rivets(f"Tornillos del marco {i}", spots, 0.011, BRASS)

# Hileras de remaches en las costuras de la chapa (arriba se ven al borde del encuadre).
spots = []
for y in (1.36, -0.56):
    for k in range(47):
        x = -2.07 + k * 0.09
        if y > 0 or abs(x) > 0.2:
            spots.append(((x, y, FZ + WALL_D / 2), (0, 0, 1)))
for x in (-2.07, 2.07):
    for k in range(30):
        spots.append(((x, -1.3 + k * 0.09, FZ + WALL_D / 2), (0, 0, 1)))
rivets("Remaches de costura", spots, 0.013)

# Repisa de caoba con canto de latón bajo el parabrisas.
v, f = g_box(4.2, 0.05, 0.17)
bevel(make("Repisa de caoba", v, f, WOOD, T((0, -0.47, FZ + 0.125))), 0.012)
v, f = g_box(4.2, 0.018, 0.014)
make("Canto de latón", v, f, BRASS, T((0, -0.455, FZ + 0.215)), tint=0)

# Viga superior de caoba (asoma en el borde alto de la vista) con placa de fábrica.
v, f = g_box(4.24, 0.34, 0.22)
bevel(make("Viga superior", v, f, WOOD, T((0, 1.5, FZ + 0.15))), 0.02)
for x in (-1.9, -0.95, 0.95, 1.9):
    v, f = g_box(0.05, 0.36, 0.24)
    make("Cartela de hierro", v, f, IRON, T((x, 1.5, FZ + 0.155)))

# ===========================================================================
# 2. TECHO ABOVEDADO de tablas con costillas de hierro · COSTADOS · PISO
# ===========================================================================
ROOF_Z0, ROOF_Z1 = FZ + 0.05, 1.3
for k in range(26):
    a0 = math.pi * (0.16 + 0.68 * k / 26)
    a1 = math.pi * (0.16 + 0.68 * (k + 1) / 26) - 0.004
    pts = []
    for a in (a0, a1):
        pts.append((math.cos(a) * 2.5, 0.55 + math.sin(a) * 1.28))
    x0, y0 = pts[0]
    x1, y1 = pts[1]
    length = math.hypot(x1 - x0, y1 - y0)
    ang = math.atan2(y1 - y0, x1 - x0)
    v, f = g_box(length, 0.035, ROOF_Z1 - ROOF_Z0)
    make("Tabla de techo", v, f, WOOD, T(((x0 + x1) / 2, (y0 + y1) / 2, (ROOF_Z0 + ROOF_Z1) / 2), (0, 0, ang)), tint=0.12)
for z in (FZ + 0.35, -0.55, 0.65):
    path = [(math.cos(a) * 2.46, 0.55 + math.sin(a) * 1.24, z) for a in [math.pi * (0.16 + 0.68 * i / 14) for i in range(15)]]
    pipe("Costilla de hierro", path, 0.03, IRON, sides=6, per=2)

for s in (-1, 1):
    # Costado: zócalo de caoba, chapa arriba y ventanilla abierta (sin cristal).
    # Hueco de la ventanilla: z [-1.25, 0.55] · y [-0.45, 0.95]. Paneles y marco lo rodean.
    WZ0, WZ1, WY0, WY1, WALL_TOP = -1.25, 0.55, -0.45, 0.95, 1.2
    x = s * 2.1
    v, f = g_box(0.06, 1.1, 3.1)
    bevel(make("Zócalo lateral", v, f, WOOD, T((x, -1.07, -0.25))), 0.01)
    v, f = g_box(0.06, WY0 + 0.52, 3.1)
    make("Alféizar lateral", v, f, PAINT, T((x, (WY0 - 0.52) / 2, -0.25)))
    v, f = g_box(0.06, WALL_TOP + 0.52, WZ0 - FZ + 0.04)
    make("Chapa lateral delantera", v, f, PAINT, T((x, (WALL_TOP - 0.52) / 2, (WZ0 + FZ - 0.04) / 2)))
    v, f = g_box(0.06, WALL_TOP + 0.52, 1.3 - WZ1)
    make("Chapa lateral trasera", v, f, PAINT, T((x, (WALL_TOP - 0.52) / 2, (WZ1 + 1.3) / 2)))
    v, f = g_box(0.06, WALL_TOP - WY1, WZ1 - WZ0)
    make("Dintel lateral", v, f, PAINT, T((x, (WALL_TOP + WY1) / 2, (WZ0 + WZ1) / 2)))
    # El marco se dibuja en el plano (z, y): Ry(-90°) lleva la X local a +Z del mundo.
    inner = rounded_poly([(WZ0, WY0), (WZ1, WY0), (WZ1, WY1), (WZ0, WY1)], 0.05)
    outer = rounded_poly([(WZ0 - 0.06, WY0 - 0.06), (WZ1 + 0.06, WY0 - 0.06), (WZ1 + 0.06, WY1 + 0.06),
                          (WZ0 - 0.06, WY1 + 0.06)], 0.09)
    fv, ff = g_ring_prism(outer, inner, 0.05)
    bevel(make("Marco de ventanilla", fv, ff, BRASS, T((x - s * 0.045, 0, 0), (0, -math.pi / 2, 0))), 0.005)
    rivets("Remaches laterales", [((x - s * 0.031, y, z), (-s, 0, 0)) for z in (FZ + 0.08, 1.24)
                                  for y in [-0.45 + k * 0.09 for k in range(18)]], 0.012)
    # Pasamanos de latón junto a la ventanilla.
    pipe("Pasamanos", [(s * 2.07, -0.3, 0.9), (s * 1.97, -0.25, 0.9), (s * 1.97, 0.75, 0.9), (s * 2.07, 0.8, 0.9)], 0.022, BRASS, per=4)

for k in range(15):
    v, f = g_box(0.275, 0.05, 3.1)
    make("Tablón de piso", v, f, FLOOR, T((-1.96 + k * 0.28, -1.64, -0.25)), tint=0.14)

# ===========================================================================
# 3. FRENTE DE CALDERA (la pieza protagonista) — por debajo de la visual
# ===========================================================================
BARREL_R, BARREL_Y = 0.95, -1.37
BACK_Z = -0.98                       # cara trasera, la que mira al maquinista
v, f = g_cyl(BARREL_R, BARREL_R, FZ + WALL_D / 2 - BACK_Z, 64, caps=False)
make("Cuerpo de caldera", v, f, PAINT, T((0, BARREL_Y, (FZ + WALL_D / 2 + BACK_Z) / 2), (math.pi / 2, 0, 0)), smooth_angle=0.3)
# Cara ligeramente abombada, con reborde.
prof = [(0.0001, 0.035), (0.45, 0.03), (0.8, 0.018), (0.93, 0.0), (0.965, -0.02), (0.965, -0.06)]
v, f = g_lathe(prof, 64)
make("Frente abombado", v, f, PAINT, T((0, BARREL_Y, BACK_Z), (math.pi / 2, 0, 0)), smooth_angle=0.5)
for z in (BACK_Z - 0.06, -1.42):
    v, f = g_torus(BARREL_R + 0.012, 0.02, 64, 6)
    make("Fleje de latón", v, f, BRASS, T((0, BARREL_Y, z)), smooth_angle=1.2, tint=0)
spots = []
for k in range(56):
    a = k / 56 * math.tau
    p = Vector((math.cos(a) * 0.88, BARREL_Y + math.sin(a) * 0.88, BACK_Z + 0.02))
    if p.y > -1.62:
        spots.append((tuple(p), (0, 0, 1)))
rivets("Remaches del frente", spots, 0.017)

# Puerta del hogar: anillo remachado, resplandor y rejilla de hierro en espiral.
DOOR = Vector((0, -1.12, BACK_Z + 0.065))
v, f = g_torus(0.3, 0.035, 48, 8)
make("Aro del hogar", v, f, IRON, T(DOOR), smooth_angle=1.2)
rivets("Remaches del hogar", [((DOOR.x + math.cos(a) * 0.36, DOOR.y + math.sin(a) * 0.36, DOOR.z), (0, 0, 1))
                              for a in [k / 22 * math.tau for k in range(22)]], 0.022, IRON)
v, f, _ = g_disc(0.27, 40)
make("Brasas", v, f, FIRE, T(DOOR + Vector((0, 0, -0.01))), tint=0, recalc=False)
grill = []
for k in range(8):
    spoke_v, spoke_f = g_box(0.018, 0.25, 0.02)
    grill.append((spoke_v, spoke_f, T((0, 0, 0), (0, 0, k / 8 * math.tau)) @ T((0, 0.13, 0))))
for R in (0.1, 0.19, 0.26):
    tv, tf = g_torus(R, 0.012, 40, 5)
    grill.append((tv, tf, Matrix.Identity(4)))
hv, hf = g_cyl(0.05, 0.05, 0.03, 20)
grill.append((hv, hf, T((0, 0, 0.01), (math.pi / 2, 0, 0))))
v, f = combine(grill)
make("Rejilla del hogar", v, f, IRON, T(DOOR + Vector((0, 0, 0.02))), smooth_angle=0.9)
v, f = g_box(0.3, 0.035, 0.035)
bevel(make("Pestillo", v, f, STEEL, T((0.3, -1.12, BACK_Z + 0.115))), 0.006)
v, f = g_box(0.08, 0.14, 0.06)
make("Bisagra", v, f, IRON, T((-0.33, -1.12, BACK_Z + 0.085)))

# Nivel de agua: tubo de vidrio con guardas de latón.
for x in (0.42,):
    v, f = g_cyl(0.022, 0.022, 0.38, 16)
    make("Tubo de nivel", v, f, GLASS_TUBE, T((x, -0.74, BACK_Z + 0.09)), tint=0)
    for y in (-0.53, -0.95):
        v, f = g_cyl(0.04, 0.04, 0.07, 16)
        make("Grifo del nivel", v, f, BRASS, T((x, y, BACK_Z + 0.09)), tint=0)
        v, f = g_box(0.03, 0.03, 0.1)
        make("Soporte del nivel", v, f, BRASS, T((x, y, BACK_Z + 0.04)))
    for dx in (-0.034, 0.034):
        v, f = g_box(0.008, 0.36, 0.008)
        make("Guarda del nivel", v, f, BRASS, T((x + dx, -0.74, BACK_Z + 0.11)))
    v, f = g_box(0.018, 0.12, 0.018)
    make("Llave de purga", v, f, BLACK, T((x + 0.08, -0.99, BACK_Z + 0.11), (0, 0, 0.9)))

# Colector sobre la caldera: tubo de latón, tres válvulas con volante y dos manómetros.
TOP_Y = BARREL_Y + BARREL_R           # -0.42
MAN_Z = -1.12
v, f = g_cyl(0.045, 0.045, 0.84, 20)
bevel(make("Colector", v, f, BRASS, T((0, TOP_Y + 0.02, MAN_Z), (0, 0, math.pi / 2)), tint=0), 0.004)
for x in (-0.42, 0.42):
    v, f = g_cyl(0.06, 0.06, 0.05, 20)
    make("Tapa del colector", v, f, BRASS, T((x, TOP_Y + 0.02, MAN_Z), (0, 0, math.pi / 2)))
wheel_parts = []
wv, wf = g_torus(0.062, 0.009, 28, 6)
wheel_parts.append((wv, wf, T((0, 0, 0), (math.pi / 2, 0, 0))))
for k in range(4):
    sv, sf = g_box(0.006, 0.006, 0.12)
    wheel_parts.append((sv, sf, T((0, 0, 0), (0, k * math.pi / 4, 0))))
hv, hf = g_cyl(0.014, 0.014, 0.03, 12)
wheel_parts.append((hv, hf, Matrix.Identity(4)))
WV, WF = combine(wheel_parts)
for x, h in ((-0.26, 0.05), (0.0, 0.07), (0.26, 0.05)):
    v, f = g_cyl(0.016, 0.02, h, 12)
    make("Vástago de válvula", v, f, BRASS, T((x, TOP_Y + 0.02 + h / 2, MAN_Z)))
    v, f = g_cyl(0.03, 0.03, 0.035, 14)
    make("Prensaestopas", v, f, BRASS, T((x, TOP_Y + 0.02 + h * 0.5, MAN_Z)))
    make("Volante de válvula", WV, WF, BRASS, T((x, TOP_Y + 0.03 + h, MAN_Z), (0.25, 0, 0)), smooth_angle=1.0, recalc=False)

GAUGES = []


def gauge(name, center, radius, kind, bezel=BRASS, stalk_to=None):
    """Manómetro: bisel, carátula con UV, cristal fingido y base para la aguja."""
    M = facing(center)
    prof = [(radius * 0.8, -0.05), (radius * 1.02, -0.035), (radius * 1.12, -0.012), (radius * 1.12, 0.012),
            (radius * 1.04, 0.022), (radius * 0.95, 0.012)]
    bv, bf = g_lathe(prof, 36)
    make(f"{name} · bisel", bv, bf, bezel, M @ T((0, 0, 0), (math.pi / 2, 0, 0)), smooth_angle=0.9, tint=0)
    dv, df, _ = g_disc(radius * 0.96, 40)
    make(f"{name} · carátula", dv, df, GAUGE, M @ T((0, 0, 0.004)), recalc=False, tint=0)
    # Escala como geometría (no textura): 9 marcas mayores, 16 menores y sector rojo final.
    ink, red = [], []
    for k in range(25):
        value = k / 24
        a = math.radians(225 - 270 * value)
        major = k % 3 == 0
        length = radius * (0.2 if major else 0.1)
        rr = radius * 0.86 - length / 2
        tv, tf = g_box(radius * (0.045 if major else 0.025), length, 0.002)
        (red if value > 0.8 else ink).append(
            (tv, tf, T((math.cos(a) * rr, math.sin(a) * rr, 0.006), (0, 0, a - math.pi / 2))))
    for bucket, mat, label in ((ink, INK, "escala"), (red, RED, "zona roja")):
        v, f = combine(bucket)
        make(f"{name} · {label}", v, f, mat, M, recalc=False, tint=0, smooth_angle=0.1)
    v, f = g_cyl(radius * 0.8, radius * 0.9, 0.05, 24)
    make(f"{name} · caja", v, f, IRON, M @ T((0, 0, -0.07), (math.pi / 2, 0, 0)))
    if stalk_to is not None:
        # Poste recto bajo la caja: nada pasa por delante de la carátula.
        top = M @ Vector((0, -radius * 0.7, -0.07))
        pipe(f"{name} · poste", [tuple(top), (top.x, (top.y + stalk_to[1]) / 2, top.z), (top.x, stalk_to[1], top.z)],
             0.014, BRASS, sides=10, per=2)
    base = M @ T((0, 0, 0.012))
    # Aguja solo para los renders; en el juego las agujas son un InstancedMesh vivo.
    value = {"SPEED": 0.55, "PRESSURE": 0.72}.get(kind, 0.45)
    nv, nf = g_prism([(-radius * 0.035, -radius * 0.18), (radius * 0.035, -radius * 0.18), (0, radius * 0.82)], 0.004)
    make(f"{name} · aguja (render)", nv, nf, NEEDLE_MAT, base @ T((0, 0, 0), (0, 0, math.radians(225 - 270 * value) - math.pi / 2)),
         part="preview", tint=0)
    GAUGES.append(dict(kind=kind, radius=radius * 0.96, matrix=base))


for x, kind in ((-0.66, "SPEED"), (0.66, "PRESSURE")):
    center = (x, -0.31, -1.1)
    assert below_sightline(center[1] + 0.11, center[2]), "manómetro sobre la visual"
    gauge("Manómetro principal", center, 0.1, kind, stalk_to=(x, BARREL_Y + math.sqrt(BARREL_R ** 2 - x * x) - 0.02, MAN_Z))

# Tuberías de cobre: del colector a la pared; la izquierda sube por el montante al silbato.
for s in (-1, 1):
    # Sale por debajo y por detrás de los manómetros: nada cruza una carátula.
    copper = [(s * 0.42, TOP_Y + 0.02, MAN_Z), (s * 0.54, -0.47, -1.2), (s * 0.9, -0.5, -1.4),
              (s * 1.2, -0.52, -1.6), (s * 1.34, -0.46, FZ + 0.1), (s * 1.4, -0.3, FZ + 0.09)]
    pipe("Tubería de cobre", copper, 0.024, COPPER, per=6)
    path = catmull(copper, 6)
    for i in (9, 21):
        tangent = (path[i + 1] - path[i - 1]).normalized()
        q = Vector((0, 1, 0)).rotation_difference(tangent).to_matrix().to_4x4()
        v, f = g_cyl(0.036, 0.036, 0.06, 14)
        make("Racor de latón", v, f, BRASS, Matrix.Translation(path[i]) @ q)
# Línea del silbato por el montante izquierdo (x de 1.415 abajo a 1.335 arriba).
pipe("Línea del silbato", [(-1.4, -0.3, FZ + 0.09), (-1.41, 0.2, FZ + 0.085), (-1.37, 0.9, FZ + 0.085),
                           (-1.33, 1.3, FZ + 0.1)], 0.02, COPPER, per=4)
whistle_path = catmull([(-1.4, -0.3, FZ + 0.09), (-1.41, 0.2, FZ + 0.085), (-1.37, 0.9, FZ + 0.085),
                        (-1.33, 1.3, FZ + 0.1)], 4)
for y in (0.1, 0.8):
    p = min(whistle_path, key=lambda q: abs(q.y - y))
    v, f = g_cyl(0.03, 0.03, 0.04, 12)
    make("Abrazadera", v, f, BRASS, T(tuple(p)))
    v, f = g_box(0.03, 0.03, 0.05)
    make("Pata de abrazadera", v, f, BRASS, T((p.x, p.y, p.z - 0.035)))

# ===========================================================================
# 4. PUESTO IZQUIERDO: placa esmaltada, freno de pedestal crema, palanca del silbato
# ===========================================================================
plate_c = Vector((-1.28, -0.42, -1.28))
assert below_sightline(plate_c.y + 0.14, plate_c.z)
PM = facing(plate_c)
v, f = g_box(0.46, 0.26, 0.03)
bevel(make("Placa esmaltada", v, f, ENAMEL, PM), 0.01)
v, f = g_ring_prism(rounded_poly([(-0.24, -0.14), (0.24, -0.14), (0.24, 0.14), (-0.24, 0.14)], 0.03),
                    rounded_poly([(-0.225, -0.125), (0.225, -0.125), (0.225, 0.125), (-0.225, 0.125)], 0.02), 0.02)
make("Marco de la placa", v, f, BRASS, PM @ T((0, 0, 0.01)))
for lx, kind in ((-0.11, "STEADY"), (0.1, "PRESSURE")):
    gauge("Manómetro de placa", tuple(PM @ Vector((lx, 0.01, 0.035))), 0.068, kind, bezel=STEEL)
rivets("Tornillos de placa", [(tuple(PM @ Vector((sx * 0.21, sy * 0.11, 0.02))), tuple(PM.to_3x3() @ Vector((0, 0, 1))))
                               for sx in (-1, 1) for sy in (-1, 1)], 0.01, BRASS)
v, f = g_box(0.08, 0.35, 0.08)
make("Ménsula de la placa", v, f, IRON, T((-1.3, -0.68, -1.33)))

# Freno de pedestal (esmalte crema), manija de latón con pomo negro.
BRAKE = Vector((-1.16, -1.62, -0.86))
prof = [(0.16, 0), (0.15, 0.06), (0.11, 0.1), (0.1, 0.8), (0.14, 0.86), (0.15, 1.0), (0.13, 1.08), (0.0001, 1.1)]
v, f = g_lathe(prof, 32)
make("Pedestal del freno", v, f, CREAM, T(BRAKE), smooth_angle=0.7)
v, f = g_torus(0.152, 0.012, 32, 6)
make("Aro del freno", v, f, BRASS, T(BRAKE + Vector((0, 0.93, 0)), (math.pi / 2, 0, 0)))
v, f = g_cyl(0.04, 0.05, 0.08, 16)
make("Eje del freno", v, f, BRASS, T(BRAKE + Vector((0, 1.13, 0))))
v, f = g_box(0.3, 0.035, 0.05)
bevel(make("Manija del freno", v, f, BRASS, T(BRAKE + Vector((0.13, 1.17, 0.03)), (0, -0.5, 0.08))), 0.01)
v, f = g_cyl(0.035, 0.03, 0.09, 16)
make("Pomo del freno", v, f, BLACK, T(BRAKE + Vector((0.27, 1.22, 0.1))))
assert below_sightline(BRAKE.y + 1.26, BRAKE.z)

# Palanca del silbato — pieza VIVA, exportada con su pivote.
WHISTLE_PIVOT = Vector((-0.8, -0.6, -0.95))
v, f = g_cyl(0.05, 0.06, 0.05, 18)
make("Base del silbato", v, f, BRASS, T(WHISTLE_PIVOT + Vector((0, -0.05, 0))))
v, f = g_box(0.07, 0.07, 0.05)
make("Horquilla del silbato", v, f, IRON, T(WHISTLE_PIVOT))
lever = []
av, af = g_cyl(0.013, 0.017, 0.2, 12)
lever.append((av, af, T((0, 0.1, 0))))
kv, kf = g_lathe([(0.0001, -0.03), (0.022, -0.026), (0.032, 0), (0.022, 0.026), (0.0001, 0.03)], 16)
lever.append((kv, kf, T((0, 0.22, 0))))
v, f = combine(lever)
make("Palanca del silbato", v, f, BRASS, T(WHISTLE_PIVOT), part="whistle", smooth_angle=1.0)
assert below_sightline(WHISTLE_PIVOT.y + 0.25, WHISTLE_PIVOT.z)

# Farol de latón en la esquina alta izquierda (se ve al mirar a ese lado).
LAMP_P = Vector((-1.93, 0.9, -1.35))
prof = [(0.0001, -0.2), (0.07, -0.18), (0.08, -0.12), (0.06, -0.1), (0.06, 0.1), (0.085, 0.12), (0.03, 0.2), (0.0001, 0.24)]
v, f = g_lathe(prof, 16)
make("Farol", v, f, BRASS, T(LAMP_P))
v, f = g_cyl(0.056, 0.056, 0.19, 16)
make("Llama del farol", v, f, LAMP, T(LAMP_P), tint=0)
v, f = g_box(0.14, 0.03, 0.03)
make("Brazo del farol", v, f, IRON, T(LAMP_P + Vector((-0.08, 0.02, 0))))

# ===========================================================================
# 5. PUESTO DERECHO: cuadrante del inversor y placa crema con indicador de velocidad
# ===========================================================================
REV = Vector((1.0, -1.05, -1.12))
sector = []
for k in range(19):
    a = math.radians(55 + k * 70 / 18)
    tv, tf = g_box(0.028, 0.035, 0.04)
    sector.append((tv, tf, T((0, math.sin(a) * 0.505, math.cos(a) * 0.505), (-(a - math.pi / 2), 0, 0))))
arc = []
for k in range(25):
    a = math.radians(50 + k * 80 / 24)
    arc.append((math.sin(a) * 0.49, math.cos(a) * 0.49))
inner = [(math.sin(math.radians(50 + k * 80 / 24)) * 0.44, math.cos(math.radians(50 + k * 80 / 24)) * 0.44) for k in range(25)]
# Arco macizo del cuadrante: se construye en el plano ZY local (x = espesor).
av = [(-0.02, y, z) for y, z in arc] + [(0.02, y, z) for y, z in arc] + [(-0.02, y, z) for y, z in inner] + [(0.02, y, z) for y, z in inner]
n = len(arc)
af = []
for i in range(n - 1):
    af += [(i, i + 1, n + i + 1, n + i), (2 * n + i + 1, 2 * n + i, 3 * n + i, 3 * n + i + 1),
           (i + 1, i, 2 * n + i, 2 * n + i + 1), (n + i, n + i + 1, 3 * n + i + 1, 3 * n + i)]
af += [(0, n, 3 * n, 2 * n), (n - 1, 3 * n - 1, 4 * n - 1, 2 * n - 1)]
sector.append((av, af, Matrix.Identity(4)))
v, f = combine(sector)
make("Cuadrante del inversor", v, f, IRON, T(REV), smooth_angle=0.5)
v, f = g_box(0.05, 0.62, 0.07)
bevel(make("Pie del cuadrante", v, f, IRON, T(REV + Vector((0, -0.25, 0)))), 0.01)
lever = []
lv, lf = g_box(0.035, 0.66, 0.045)
lever.append((lv, lf, T((0, 0.33, 0))))
lv, lf = g_box(0.05, 0.08, 0.02)
lever.append((lv, lf, T((0, 0.5, 0.03))))
v, f = combine(lever)
bevel(make("Barra del inversor", v, f, STEEL, T(REV + Vector((0.05, 0, 0)), (-0.18, 0, 0))), 0.006)
v, f = g_cyl(0.026, 0.026, 0.15, 12)
make("Empuñadura del inversor", v, f, BLACK, T(REV + Vector((0.05, 0, 0)), (-0.18, 0, 0)) @ T((0, 0.72, 0)))
v, f = g_cyl(0.05, 0.05, 0.07, 16)
make("Eje del inversor", v, f, BRASS, T(REV, (0, 0, math.pi / 2)))
assert below_sightline(REV.y + 0.8, REV.z - 0.1)

plate_c = Vector((1.3, -0.44, -1.3))
assert below_sightline(plate_c.y + 0.15, plate_c.z)
PM = facing(plate_c)
v, f = g_box(0.36, 0.3, 0.035)
bevel(make("Placa crema", v, f, CREAM, PM), 0.02)
gauge("Indicador de velocidad", tuple(PM @ Vector((0, 0.01, 0.04))), 0.1, "SPEED", bezel=IRON)
for k, mat in enumerate((BRASS, BLACK, BRASS)):
    v, f = g_cyl(0.014, 0.014, 0.02, 10)
    make("Botón de placa", v, f, mat, PM @ T((-0.12 + k * 0.12, -0.12, 0.025), (math.pi / 2, 0, 0)))
v, f = g_box(0.08, 0.4, 0.08)
make("Ménsula crema", v, f, IRON, T((1.32, -0.75, -1.36)))

# ===========================================================================
# 6. PARED TRASERA con ventanillas redondas · TÉNDER con carbón y pala
# ===========================================================================
REAR_Z = 1.3
arch = [(math.cos(a) * 2.5, 0.55 + math.sin(a) * 1.28) for a in [math.pi * (0.16 + 0.68 * i / 20) for i in range(21)]]
outline = [(-2.13, -1.62), (2.13, -1.62), (2.13, arch[0][1])] + arch + [(-2.13, arch[-1][1])]
v, f = g_prism(outline, 0.08)
rear = make("Pared trasera", v, f, PAINT, T((0, 0, REAR_Z)), tint=0)
door = rounded_poly([(-0.58, -1.9), (0.58, -1.9), (0.58, 0.8), (-0.58, 0.8)], 0.2)
spectacles = [[(sx + math.cos(a) * 0.3, 0.45 + math.sin(a) * 0.3) for a in [k / 28 * math.tau for k in range(28)]]
              for sx in (-1.32, 1.32)]
for i, hole in enumerate([door] + spectacles):
    hv, hf = g_prism(hole, 0.4)
    cutter = make(f"Hueco trasero {i}", hv, hf, PAINT, T((0, 0, REAR_Z)), part="cutter")
    cutter.hide_render = cutter.hide_viewport = True
    mod = rear.modifiers.new(f"Hueco {i}", "BOOLEAN")
    mod.object = cutter
    mod.operation = "DIFFERENCE"
    mod.solver = "EXACT"
bevel(rear, 0.01, 2)
for sx in (-1.32, 1.32):
    v, f = g_torus(0.32, 0.03, 36, 8)
    make("Aro de ventanilla trasera", v, f, BRASS, T((sx, 0.45, REAR_Z - 0.05)), smooth_angle=1.2, tint=0)
    rivets("Tornillos del aro", [((sx + math.cos(a) * 0.4, 0.45 + math.sin(a) * 0.4, REAR_Z - 0.04), (0, 0, -1))
                                 for a in [k / 10 * math.tau for k in range(10)]], 0.013, BRASS)
jamb_in = rounded_poly([(-0.58, -1.62), (0.58, -1.62), (0.58, 0.8), (-0.58, 0.8)], 0.2)
jamb_out = rounded_poly([(-0.66, -1.62), (0.66, -1.62), (0.66, 0.88), (-0.66, 0.88)], 0.26)
v, f = g_ring_prism(jamb_out, jamb_in, 0.05)
bevel(make("Marco de la puerta", v, f, WOOD, T((0, 0, REAR_Z - 0.06))), 0.008)
rivets("Remaches traseros", [((x, y, REAR_Z - 0.04), (0, 0, -1)) for y in (-0.95,)
                             for x in [-2.05 + k * 0.09 for k in range(46)] if abs(x) > 0.72], 0.013)

# Pasarela de chapa estriada hacia el ténder.
v, f = g_box(1.2, 0.05, 0.7)
make("Pasarela", v, f, CHECKER, T((0, -1.6, REAR_Z + 0.35)))
for k in range(9):
    v, f = g_box(1.1, 0.012, 0.025)
    make("Estría", v, f, CHECKER, T((0, -1.57, REAR_Z + 0.08 + k * 0.07), (0, 0.5 if k % 2 else -0.5, 0)), tint=0)

# Ténder: mamparo frontal, costados y la montaña de carbón.
TZ = REAR_Z + 0.7
v, f = g_box(3.4, 1.5, 0.08)
bevel(make("Mamparo del ténder", v, f, PAINT_DARK, T((0, -0.87, TZ))), 0.01)
v, f = g_box(0.9, 0.45, 0.1)
make("Boca de carbonera", v, f, IRON, T((0, -0.92, TZ - 0.02)))
for sx in (-1.7, 1.7):
    v, f = g_box(0.08, 2.1, 4.2)
    bevel(make("Costado del ténder", v, f, PAINT_DARK, T((sx, -0.57, TZ + 2.1))), 0.01)
    v, f = g_box(0.12, 0.08, 4.2)
    make("Borda de latón", v, f, BRASS, T((sx, 0.5, TZ + 2.1)), tint=0)
rows, cols = 18, 17
hv, hf = [], []
for r in range(rows):
    z = TZ + 0.05 + r / (rows - 1) * 4.0
    for c in range(cols):
        x = -1.66 + c / (cols - 1) * 3.32
        rise = min(1.0, (z - TZ) / 1.4)
        crown = 1 - (x / 1.9) ** 2 * 0.55
        y = -0.12 + 0.95 * rise * crown + rng.uniform(-0.05, 0.05)
        hv.append((x, y, z))
for r in range(rows - 1):
    for c in range(cols - 1):
        a, b = r * cols + c, r * cols + c + 1
        hf.append((a, a + cols, b + cols, b))
make("Montaña de carbón", hv, hf, COAL, recalc=False, smooth_angle=1.2, tint=0.1)
# (Sin terrones sueltos: con el giro máximo de 100° la carbonera no entra en cuadro.)

# Pala clavada en el carbón.
SHOVEL = Vector((0.45, 0.25, TZ + 0.9))
v, f = g_cyl(0.022, 0.026, 1.1, 10)
make("Mango de la pala", v, f, WOOD, T(tuple(SHOVEL + Vector((0, 0.45, -0.12))), (-0.25, 0, 0.12)))
v, f = g_box(0.3, 0.36, 0.02)
bevel(make("Hoja de la pala", v, f, STEEL, T(tuple(SHOVEL + Vector((-0.04, -0.12, 0.03))), (-0.25, 0, 0.12))), 0.006)

# ===========================================================================
# EXPORTACIÓN AL JUEGO (geometría evaluada, fusionada por material)
# ===========================================================================
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
PIVOTS = {"whistle": WHISTLE_PIVOT}


def to_three(p):
    return (p.x, p.z, -p.y)


def harvest(objs, pivot=Vector((0, 0, 0))):
    buckets = {}
    for ob in objs:
        ev = ob.evaluated_get(dg)
        me = ev.to_mesh()
        me.calc_loop_triangles()
        mw = ob.matrix_world
        nm = mw.to_3x3().inverted().transposed()
        uv = me.uv_layers.active
        tint = list(ob.get("tint", [1, 1, 1]))
        for tri in me.loop_triangles:
            mat = ob.material_slots[tri.material_index].material if ob.material_slots else ob.data.materials[0]
            key = mat["game"]["key"]
            b = buckets.setdefault(key, dict(material=key, position=[], normal=[], color=[], uv=[], index=[], _lookup={}))
            for li in tri.loops:
                p = Vector(to_three(mw @ me.vertices[me.loops[li].vertex_index].co)) - pivot
                n = Vector(to_three(nm @ me.corner_normals[li].vector)).normalized()
                t = tuple(uv.data[li].uv) if uv else (0.0, 0.0)
                k = (round(p.x, 4), round(p.y, 4), round(p.z, 4), round(n.x, 3), round(n.y, 3), round(n.z, 3),
                     round(t[0], 3), round(t[1], 3), round(tint[0], 3), round(tint[1], 3))
                idx = b["_lookup"].get(k)
                if idx is None:
                    idx = len(b["position"]) // 3
                    b["_lookup"][k] = idx
                    b["position"] += k[0:3]
                    b["normal"] += k[3:6]
                    b["uv"] += k[6:8]
                    b["color"] += [k[8], k[9], k[8]]
                b["index"].append(idx)
        ev.to_mesh_clear()
    out = []
    for b in buckets.values():
        del b["_lookup"]
        if b["material"] != "gauge":
            del b["uv"]
        out.append(b)
    return out


def objs(part):
    return [o for o in CAB.objects if o.get("part") == part and o.type == "MESH"]


def mat_list(M):
    return [round(M[r][c], 5) for c in range(4) for r in range(4)]


payload = dict(
    generator="Blender " + bpy.app.version_string,
    space="three · cabina local (ancla swayObject)",
    materials=[m["game"].to_dict() for m in MATS.values()],
    static=harvest(objs("static")),
    glass=harvest(objs("glass")),
    whistle=dict(pivot=list(WHISTLE_PIVOT),
                 meshes=harvest(objs("whistle"), WHISTLE_PIVOT)),
    gauges=[dict(kind=g["kind"], radius=round(g["radius"], 4), matrix=mat_list(g["matrix"])) for g in GAUGES],
)
json_path = DATA / "cabina-vapor.json"
json_path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
tris = sum(len(b["index"]) // 3 for group in (payload["static"], payload["glass"], payload["whistle"]["meshes"]) for b in group)
print(f"CABINA_JSON {json_path.stat().st_size / 1e6:.2f} MB · {tris} triángulos · "
      f"{len(payload['static'])} materiales estáticos · {len(GAUGES)} manómetros")

# GLB editable (sin cortadores) y .blend
for o in bpy.data.objects:
    o.select_set(o.get("part") not in ("cutter", "preview") and o.name in CAB.objects)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "cabina-vapor.glb"), export_format="GLB",
                          use_selection=True, export_apply=True)

# ===========================================================================
# RENDERS: vista del maquinista (misma cámara que el juego) y vista de conjunto
# ===========================================================================
if RENDER:
    world = bpy.data.worlds.new("Cielo de Valle")
    scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    sky = nodes.new("ShaderNodeTexSky")
    sky.sky_type = "NISHITA"
    sky.sun_elevation = math.radians(38)
    sky.sun_rotation = math.radians(160)
    world.node_tree.links.new(sky.outputs[0], nodes["Background"].inputs[0])
    nodes["Background"].inputs[1].default_value = 0.22

    def stage(name, verts, faces, mat, M):
        me = bpy.data.meshes.new(name)
        me.from_pydata([B(M @ Vector(p)) for p in verts], [], faces)
        ob = bpy.data.objects.new(name, me)
        me.materials.append(mat)
        STAGE.objects.link(ob)
        return ob

    grass = bpy.data.materials.new("Pasto")
    grass.use_nodes = True
    grass.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*lin("#6f8a45"), 1)
    ballast = bpy.data.materials.new("Balasto")
    ballast.use_nodes = True
    ballast.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*lin("#77716a"), 1)
    stage("Suelo", *g_box(600, 0.1, 600), grass, T((0, -2.75, -250)))
    stage("Balasto", *g_box(4.5, 0.12, 600), ballast, T((0, -2.68, -250)))
    for x in (-0.8, 0.8):
        stage("Riel", *g_box(0.08, 0.14, 600), MATS["steel"], T((x, -2.55, -250)))
    for k in range(120):
        stage("Durmiente", *g_box(2.4, 0.08, 0.25), MATS["wood"], T((0, -2.63, -2 - k * 1.6)))
    for k in range(40):
        stage("Poste", *g_box(0.15, 5, 0.15), MATS["wood"], T((-4.2, 0, -8 - k * 18)))

    bpy.ops.object.light_add(type="SUN", location=(0, 0, 10))
    sun = bpy.context.object
    sun.data.energy = 3.2
    sun.data.angle = math.radians(2)
    sun.rotation_euler = (math.radians(50), 0, math.radians(200))
    STAGE.objects.link(sun)
    scene.collection.objects.unlink(sun)
    # Relleno interior: aproxima la HemisphereLight del juego dentro de la cabina.
    bpy.ops.object.light_add(type="AREA", location=B((0, 1.2, 0.9)))
    fill = bpy.context.object
    fill.data.energy = 22
    fill.data.size = 3
    fill.data.color = (1, 0.92, 0.82)
    fill.rotation_euler = (math.radians(-60), 0, 0)

    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = True
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.exposure = -0.25
    for o in CAB.objects:
        if o.get("part") == "glass":
            o.hide_render = True
    scene.render.resolution_percentage = 100

    def shoot(filename, pos, target, fov_v, w, h):
        cam_data = bpy.data.cameras.new(filename)
        cam = bpy.data.objects.new(filename, cam_data)
        STAGE.objects.link(cam)
        cam.location = B(pos)
        cam.rotation_euler = (B(target) - B(pos)).to_track_quat("-Z", "Y").to_euler()
        cam_data.sensor_fit = "VERTICAL"
        cam_data.angle_y = math.radians(fov_v)
        cam_data.clip_start = 0.05
        cam_data.clip_end = 900
        scene.camera = cam
        scene.render.resolution_x, scene.render.resolution_y = w, h
        scene.render.filepath = str(ROOT / filename)
        bpy.ops.render.render(write_still=True)

    shoot("cabina-vapor-pov.png", EYE, EYE + Vector((0, 0, -10)), 60, 1600, 900)
    if os.environ.get("CAB_OVERVIEW", "1") != "0":
        shoot("cabina-vapor-vista.png", Vector((0.9, 0.15, 0.9)), Vector((-0.2, -0.75, -1.2)), 62, 1400, 1000)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "cabina-vapor.blend"))
print("CABINA_OK")
