"""Estación Terminal del Expreso Tonal — catedral de hierro y cristal (PLAN §12).
Modelada con Blender 4.5 (bpy), diseño propio.

Espacio LOCAL del grupo `building` de station.ts: Y arriba, la boca de la nave en z = 0
y el fondo en z = −150; la vía corre por x = 0 y el tren se detiene en z ≈ −136. Se
conservan las medidas de la versión de primitivas (semiancho 34, altura 62, fondo 150,
torres en x = ±41, tope en z = −142) para no tocar la ceremonia de llegada.

Piezas exportadas:
- static   · el edificio, fusionado por material.
- spokes   · los 12 husos de cada rosetón, sueltos: el juego enciende los diatónicos.
- gate     · un pórtico de los 8 arcos (local a la vía, y = 0 al pie).
- medallion· el medallón del pórtico (eje Z), que se instancia y se enciende.

Ejecutar:  powershell -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 art\\blender\\modelar-terminal.py
Variables: TERM_RENDER=0 omite los renders; TERM_SAMPLES=n ajusta Cycles.
"""
import sys
import bpy
import json
import math
import os
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from kit import (B, T, lin, make, bevel, g_box, g_cyl, g_lathe, g_torus, g_prism,  # noqa: E402
                 combine, setup)
from kit import pipe as kit_pipe  # noqa: E402

GAME = ROOT.parent.parent
DATA = GAME / "src" / "3d" / "assets"
RENDER = os.environ.get("TERM_RENDER", "1") != "0"
SAMPLES = int(os.environ.get("TERM_SAMPLES", "40"))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
COL = bpy.data.collections.new("Terminal")
STAGE = bpy.data.collections.new("Solo render")
scene.collection.children.link(COL)
scene.collection.children.link(STAGE)
setup(COL, 20260915)

W, H, D = 34.0, 62.0, 150.0
TOWER_X, TOWER_Z = 41.0, -6.0

# ---------------------------------------------------------------------------
MATS = {}


def material(key, hex_color, metal=0.0, rough=0.6, emit_hex=None, emit=0.0, fog=True, opacity=1.0, double=False):
    m = bpy.data.materials.new(key)
    c = lin(hex_color)
    m.diffuse_color = (*c, 1)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*c, 1)
    p.inputs["Metallic"].default_value = metal
    p.inputs["Roughness"].default_value = rough
    if emit_hex:
        p.inputs["Emission Color"].default_value = (*lin(emit_hex), 1)
        p.inputs["Emission Strength"].default_value = emit
    m["game"] = dict(key=key, color=hex_color, metalness=metal, roughness=rough, emissive=emit_hex or "#000000",
                     emissiveIntensity=emit, fog=fog, opacity=opacity, doubleSide=double)
    MATS[key] = m
    return m


STONE = material("stone", "#c9b184", rough=0.9)
STONE_DARK = material("stoneDark", "#a08b62", rough=0.95)
IRON = material("iron", "#2a2622", 0.55, 0.62)
GOLD = material("gold", "#d4a93a", 1.0, 0.3)
COPPER = material("copper", "#5f9e8a", 0.35, 0.55)
SLATE = material("slate", "#4a4f57", 0.1, 0.7)
WOOD = material("wood", "#6b4a30", rough=0.8)
RED = material("red", "#8e2b20", rough=0.6)
DIAL = material("dial", "#1e2230", 0.2, 0.5)
GLASS = material("glass", "#ffdca8", 0.0, 0.25, "#ffb960", 1.15, fog=False, opacity=0.72, double=True)
WINDOW = material("window", "#ffcf85", 0.0, 0.4, "#ffb04a", 1.4, fog=False)
LAMP = material("lamp", "#ffe6b0", 0.0, 0.4, "#ffc46a", 2.4, fog=False)
BUFFER_LAMP = material("bufferLamp", "#ff5a3a", 0.0, 0.4, "#ff3a1a", 2.0, fog=False)
SPOKE = material("spoke", "#4a4238", rough=0.9)
MEDAL = material("medallion", "#6d6152", 0.4, 0.7)

PART = {"name": "static"}


def mk(name, verts, faces, mat, M=None, **kw):
    kw.setdefault("part", PART["name"])
    return make(name, verts, faces, mat, M, **kw)


def pipe(name, points, r, mat, sides=8, per=2):
    ob = kit_pipe(name, points, r, mat, sides=sides, per=per)
    ob["part"] = PART["name"]
    return ob


def box(name, size, pos, mat, rot=(0, 0, 0), bev=0.0, **kw):
    v, f = g_box(*size)
    ob = mk(name, v, f, mat, T(pos, rot), **kw)
    if bev:
        bevel(ob, bev)
    return ob


def cyl(name, r, h, pos, mat, rot=(0, 0, 0), seg=16, r2=None, **kw):
    v, f = g_cyl(r, r if r2 is None else r2, h, seg)
    return mk(name, v, f, mat, T(pos, rot), **kw)


def lathe(name, profile, pos, mat, rot=(0, 0, 0), seg=24, **kw):
    v, f = g_lathe(profile, seg)
    return mk(name, v, f, mat, T(pos, rot), **kw)


def arch_y(x):
    return H * (1 - (x / W) ** 2)


def arch_point(x, offset=0.0):
    """Punto de la parábola desplazado `offset` hacia afuera según su normal."""
    n = Vector((2 * H * x / (W * W), 1.0)).normalized()
    return Vector((x, arch_y(x))) + n * offset


def arch_points(count, offset=0.0, y_min=0.0, x_limit=W):
    pts = []
    for i in range(count + 1):
        x = -x_limit + 2 * x_limit * i / count
        p = arch_point(x, offset)
        if p.y >= y_min:
            pts.append(p)
    return pts


# ===========================================================================
# 1. BÓVEDA: cerchas de celosía parabólicas, columnas, correas, cristal, linterna
# ===========================================================================
RIBS = 13
SPRING_Y = 7.0
spring_x = W * math.sqrt(1 - SPRING_Y / H)
for i in range(RIBS):
    z = -D * i / (RIBS - 1)
    heavy = i in (0, RIBS - 1)
    outer = [p for p in arch_points(36, 0.9) if p.y >= SPRING_Y - 0.4]
    inner = [p for p in arch_points(36, -0.9) if p.y >= SPRING_Y]
    pipe("Cordón exterior", [(p.x, p.y, z) for p in outer], 0.42 if heavy else 0.32, IRON)
    pipe("Cordón interior", [(p.x, p.y, z) for p in inner], 0.42 if heavy else 0.32, IRON)
    web = []
    for k in range(len(inner) - 1):
        a = inner[k]
        b = outer[min(k + 1, len(outer) - 1)]
        mid = (a + b) / 2
        length = (b - a).length
        ang = math.atan2(b.y - a.y, b.x - a.x) - math.pi / 2
        wv, wf = g_box(0.22, length, 0.22)
        web.append((wv, wf, T((mid.x, mid.y, z), (0, 0, ang))))
    v, f = combine(web)
    mk("Celosía", v, f, IRON, smooth_angle=0.3)
    for s in (-1, 1):
        # Columna de hierro fundido con capitel que recibe la cercha.
        lathe("Columna de nave", [(0.9, 0), (0.9, 0.5), (0.55, 0.8), (0.45, 1.2), (0.38, SPRING_Y - 1.4),
                                  (0.6, SPRING_Y - 0.9), (1.0, SPRING_Y - 0.3), (1.0, SPRING_Y), (0.0001, SPRING_Y)],
              (s * spring_x, 0, z), IRON, seg=12)
        # Ménsula de voluta entre columna y cercha.
        pipe("Voluta", [(s * spring_x, SPRING_Y - 2.5, z), (s * (spring_x - 1.6), SPRING_Y - 0.8, z),
                        (s * (spring_x - 2.4), SPRING_Y + 1.4, z)], 0.18, IRON, per=4)
# Correas longitudinales y paños de vidrio entre cerchas.
purlin_x = [-30, -24, -17, -9, 0, 9, 17, 24, 30]
for x in purlin_x:
    p = arch_point(x, 0.95)
    box("Correa", (0.35, 0.35, D), (p.x, p.y, -D / 2), IRON)
glass_pts = arch_points(40, 0.6, y_min=SPRING_Y)
gv, gf = [], []
for k, p in enumerate(glass_pts):
    gv += [(p.x, p.y, 0.0), (p.x, p.y, -D)]
    if k < len(glass_pts) - 1:
        a = 2 * k
        gf.append((a, a + 2, a + 3, a + 1))
mk("Cristal de bóveda", gv, gf, GLASS, recalc=False, tint=0)
# Linterna de cumbrera.
box("Linterna · techo", (12, 0.5, D + 2), (0, H + 5.2, -D / 2), SLATE, bev=0.1)
for s in (-1, 1):
    box("Linterna · vidriera", (0.3, 4.2, D), (s * 5.4, H + 2.9, -D / 2), GLASS, tint=0)
for k in range(26):
    box("Linterna · montante", (11.2, 4.4, 0.35), (0, H + 2.9, -k * D / 25), IRON)

# ===========================================================================
# 2. FACHADA: frontispicio con arco de dovelas, clave dorada y pantalla de sol naciente
# ===========================================================================
FZ = 2.0
# El hueco baja 2 u bajo el suelo: sin caras coplanares en el booleano.
opening = [(p.x, p.y) for p in arch_points(40, 0.0)] + [(W, -2.0), (-W, -2.0)]
# Semiancho 35.4: más ancho taparía el borde interior de las esferas de las torres.
v, f = g_box(70.8, 72, 3)
front = mk("Frontispicio", v, f, STONE, T((0, 36, FZ)), tint=0)
hv, hf = g_prism(opening, 8)
cutter = mk("Hueco de la boca", hv, hf, STONE, T((0, 0, FZ)), part="cutter")
cutter.hide_render = cutter.hide_viewport = True
mod = front.modifiers.new("Boca", "BOOLEAN")
mod.object = cutter
mod.operation = "DIFFERENCE"
mod.solver = "EXACT"
# Dovelas alternadas.
VOUSSOIRS = 35
xs = [-W + 2 * W * k / VOUSSOIRS for k in range(VOUSSOIRS + 1)]
for k in range(VOUSSOIRS):
    a0, a1 = arch_point(xs[k], 0.0), arch_point(xs[k + 1], 0.0)
    b0, b1 = arch_point(xs[k], 4.2), arch_point(xs[k + 1], 4.2)
    quad = [(a0.x, a0.y), (a1.x, a1.y), (b1.x, b1.y), (b0.x, b0.y)]
    if (a1 - a0).cross(b0 - a0) < 0:
        quad = list(reversed(quad))
    key = k == VOUSSOIRS // 2
    v, f = g_prism(quad, 3.8)
    mk("Dovela", v, f, GOLD if key else (STONE_DARK if k % 2 else STONE), T((0, 0, FZ + 0.6)), tint=0.05)
# Medallón de la clave: lira de oro.
top = arch_point(0, 2.1)
v, f = g_torus(2.2, 0.35, 32, 8)
mk("Aro de la clave", v, f, GOLD, T((0, top.y + 4.8, FZ + 2.8)), tint=0)
v, f = g_cyl(2.0, 2.0, 0.4, 32)
mk("Disco de la clave", v, f, DIAL, T((0, top.y + 4.8, FZ + 2.6), (math.pi / 2, 0, 0)), tint=0)
for s in (-1, 1):
    pipe("Brazo de la lira", [(s * 0.3, top.y + 3.3, FZ + 3.0), (s * 1.3, top.y + 4.4, FZ + 3.0),
                              (s * 1.1, top.y + 6.0, FZ + 3.0), (s * 0.5, top.y + 6.4, FZ + 3.0)], 0.16, GOLD, per=4)
for k in range(4):
    box("Cuerda de la lira", (0.06, 2.6, 0.06), (-0.45 + k * 0.3, top.y + 4.9, FZ + 3.0), GOLD, tint=0)
# Pantalla de vidrio: sol naciente con radios de hierro.
SUN_Y = 22.0
screen_x = W * math.sqrt(1 - SUN_Y / H)
screen = [(p.x, p.y) for p in arch_points(40, -0.2, y_min=SUN_Y, x_limit=screen_x)]
v = [(x, y, 0.4) for x, y in screen]
mk("Pantalla de vidrio", v, [tuple(range(len(v)))], GLASS, recalc=False, tint=0)
box("Travesaño del sol", (2 * screen_x + 2, 1.3, 1.4), (0, SUN_Y, 0.9), IRON)
for k in range(1, 18):
    a = math.pi * k / 18
    # Rayo desde el centro hasta la parábola (bisección simple).
    lo, hi = 0.0, 80.0
    for _ in range(30):
        mid = (lo + hi) / 2
        x, y = math.cos(a) * mid, SUN_Y + math.sin(a) * mid
        if y < arch_y(x) - 0.4:
            lo = mid
        else:
            hi = mid
    pipe("Rayo de hierro", [(0, SUN_Y, 0.9), (math.cos(a) * lo, SUN_Y + math.sin(a) * lo, 0.9)], 0.22, IRON, sides=6)
for R in (9.0, 20.0):
    ring = [(math.cos(math.pi * k / 30) * R, SUN_Y + math.sin(math.pi * k / 30) * R * 1.05, 0.9) for k in range(31)]
    ring = [p for p in ring if p[1] < arch_y(p[0]) - 0.5]
    pipe("Arco del sol", ring, 0.2, IRON, sides=6, per=2)
lathe("Sol dorado", [(0.0001, 0.3), (3.2, 0.3), (3.2, -0.3), (0.0001, -0.3)], (0, SUN_Y, 1.6), GOLD, (math.pi / 2, 0, 0), seg=32, tint=0)
# Cornisa, balaustrada y acrótera.
box("Cornisa", (72, 1.6, 4.4), (0, 72.6, FZ + 0.4), STONE_DARK, bev=0.15)
box("Friso", (70.8, 2.2, 3.4), (0, 70.0, FZ + 0.2), STONE_DARK)
for k in range(35):
    x = -34 + k * 2
    lathe("Balaustre", [(0.35, 0), (0.45, 0.3), (0.25, 0.8), (0.42, 1.4), (0.25, 2.0), (0.4, 2.3), (0.0001, 2.4)],
          (x, 73.4, FZ + 0.4), STONE, seg=8)
box("Pasamanos de balaustrada", (70, 0.5, 1.2), (0, 76.0, FZ + 0.4), STONE_DARK)
lathe("Acrótera del sol", [(0.0001, 0), (2.4, 0), (2.4, 0.8), (1.4, 1.5), (1.2, 3.5)], (0, 76.2, FZ + 0.4), STONE, seg=16)
v, f = g_torus(2.2, 0.35, 32, 8)
mk("Aureola", v, f, GOLD, T((0, 81.5, FZ + 0.4)), tint=0)
for k in range(12):
    a = k / 12 * math.tau
    box("Rayo de la aureola", (0.3, 1.6, 0.3), (math.cos(a) * 3.3, 81.5 + math.sin(a) * 3.3, FZ + 0.4), GOLD,
        rot=(0, 0, a - math.pi / 2), tint=0)
v, f = g_cyl(1.5, 1.5, 0.6, 24)
mk("Sol de la aureola", v, f, GOLD, T((0, 81.5, FZ + 0.4), (math.pi / 2, 0, 0)), tint=0)
# Óculos encendidos en las enjutas e imposta.
for s in (-1, 1):
    v, f = g_cyl(3.4, 3.4, 0.6, 32)
    mk("Óculo de fachada", v, f, WINDOW, T((s * 25.5, 52, FZ + 1.3), (math.pi / 2, 0, 0)), tint=0)
    v, f = g_torus(3.6, 0.45, 40, 8)
    mk("Aro del óculo", v, f, GOLD, T((s * 25.5, 52, FZ + 1.8)), tint=0)
    for k in range(4):
        a = k / 4 * math.pi
        box("Cruz del óculo", (0.3, 6.8, 0.3), (s * 25.5, 52, FZ + 1.7), IRON, rot=(0, 0, a), tint=0)
    ix = W * math.sqrt(1 - 38.0 / H) + 4.5
    box("Imposta", (35.4 - ix, 1.2, 1.0), (s * (ix + 35.4) / 2, 38, FZ + 1.9), STONE_DARK)
    box("Zócalo de fachada", (35.4 - W - 4.4, 6, 1.0), (s * (W + 4.4 + 35.4) / 2, 3, FZ + 1.9), STONE_DARK)
# Pilastras de la fachada.
for s in (-1, 1):
    for x in (33.5,):
        box("Pilastra", (3.2, 68, 1.2), (s * x, 34, FZ + 2.0), STONE_DARK, bev=0.1)
        box("Capitel de pilastra", (4.2, 1.8, 2.0), (s * x, 67.6, FZ + 2.2), STONE, bev=0.1)
        box("Basa de pilastra", (4.2, 2.2, 2.2), (s * x, 1.1, FZ + 2.2), STONE)

# ===========================================================================
# 3. TORRES DEL RELOJ (rosetón con husos vivos)
# ===========================================================================
for s in (-1, 1):
    x = s * TOWER_X
    z = TOWER_Z
    box("Basamento", (13, 6, 13), (x, 3, z), STONE_DARK, bev=0.2)
    for k in range(6):
        box("Almohadillado", (13.2, 0.25, 13.2), (x, 0.9 + k * 0.95, z), STONE, tint=0.02)
    box("Fuste de torre", (11, 40, 11), (x, 26, z), STONE)
    for cx in (-1, 1):
        for cz in (-1, 1):
            for k in range(10):
                box("Sillar de esquina", (1.3 if k % 2 else 1.0, 2.0, 1.3 if k % 2 else 1.0),
                    (x + cx * 5.4, 7 + k * 4, z + cz * 5.4), STONE_DARK, tint=0.03)
    for face_z, face_x, rot in ((z + 5.55, x, 0), (z, x + s * 5.55, math.pi / 2)):
        for wy in (16, 30):
            win = [(-1.3, -4.5), (1.3, -4.5), (1.3, 3.0)] + [
                (math.cos(math.pi * k / 10) * 1.3, 3.0 + math.sin(math.pi * k / 10) * 1.3) for k in range(1, 10)] + [(-1.3, 3.0)]
            v, f = g_prism(win, 0.3)
            mk("Ventanal de torre", v, f, WINDOW, T((face_x, wy, face_z), (0, rot, 0)), tint=0)
            v, f = g_box(0.25, 8.0, 0.4)
            mk("Parteluz", v, f, STONE_DARK, T((face_x, wy - 0.7, face_z), (0, rot, 0)))
    box("Cornisa de torre", (12.6, 1.6, 12.6), (x, 46.8, z), STONE_DARK, bev=0.1)
    # Cuerpo del reloj.
    box("Cuerpo del reloj", (12, 14, 12), (x, 55, z), STONE)
    DIAL_Z = z + 6.05
    v, f = g_cyl(5.6, 5.6, 0.5, 40)
    mk("Esfera", v, f, DIAL, T((x, 55, DIAL_Z), (math.pi / 2, 0, 0)), tint=0)
    v, f = g_torus(5.6, 0.45, 48, 8)
    mk("Bisel dorado", v, f, GOLD, T((x, 55, DIAL_Z + 0.3)), tint=0)
    v, f = g_torus(1.2, 0.3, 24, 6)
    mk("Cubo dorado", v, f, GOLD, T((x, 55, DIAL_Z + 0.5)), tint=0)
    PART["name"] = "spoke"
    for k in range(12):
        # Mismo orden que la versión anterior: huso k apunta a −(k/12)·360° desde arriba.
        angle = (k / 12) * math.tau - math.pi / 2
        v, f = g_prism([(-0.5, 1.6), (0.5, 1.6), (0.25, 5.0), (-0.25, 5.0)], 0.35)
        ob = mk("Huso", v, f, SPOKE, T((x, 55, DIAL_Z + 0.35), (0, 0, -angle - math.pi / 2)), tint=0)
        ob["spoke"] = k
    PART["name"] = "static"
    for cx in (-1, 1):
        box("Pináculo", (1.6, 4, 1.6), (x + cx * 5.6, 64, z + 5.6), STONE_DARK)
        box("Pináculo", (1.6, 4, 1.6), (x + cx * 5.6, 64, z - 5.6), STONE_DARK)
    # Campanario: pilares y arcos abiertos, campana dorada.
    box("Losa del campanario", (12.4, 1.0, 12.4), (x, 62.5, z), STONE_DARK)
    for cx in (-1, 1):
        for cz in (-1, 1):
            box("Pilar del campanario", (2.2, 9, 2.2), (x + cx * 4.6, 67.5, z + cz * 4.6), STONE)
    box("Arquitrabe", (12, 1.6, 12), (x, 72.6, z), STONE_DARK)
    lathe("Campana", [(0.0001, 3.2), (0.6, 3.1), (1.0, 2.6), (1.4, 1.2), (2.1, 0.2), (2.2, 0.0)], (x, 66.2, z), GOLD, seg=20, tint=0)
    # Cúpula de cobre, linterna y remate de oro.
    lathe("Cúpula", [(6.4, 0), (6.4, 0.8), (6.0, 2.5), (5.0, 5.0), (3.3, 7.5), (1.6, 9.2), (0.0001, 9.8)],
          (x, 73.4, z), COPPER, seg=8, smooth_angle=0.2)
    for cz in range(8):
        a = cz / 8 * math.tau + math.pi / 8
        pipe("Nervio de cúpula", [(x + math.sin(a) * 6.45, 74.2, z + math.cos(a) * 6.45),
                                  (x + math.sin(a) * 5.05, 78.4, z + math.cos(a) * 5.05),
                                  (x + math.sin(a) * 1.65, 82.6, z + math.cos(a) * 1.65)], 0.18, GOLD, sides=6, per=4)
    lathe("Linterna de cúpula", [(1.2, 0), (1.2, 2.2), (1.6, 2.4), (0.4, 3.6), (0.0001, 3.8)], (x, 82.8, z), COPPER, seg=8)
    lathe("Remate", [(0.0001, 0), (0.4, 0.2), (0.7, 0.9), (0.4, 1.6), (0.12, 2.0), (0.12, 3.6), (0.0001, 3.8)],
          (x, 86.4, z), GOLD, seg=12, tint=0)

# ===========================================================================
# 4. MUROS LATERALES con ventanas y contrafuertes · MURO DE FONDO con rosa
# ===========================================================================
for s in (-1, 1):
    x = s * (W + 2.5)
    box("Muro lateral", (1.6, 12, D - 12), (x, 6, -D / 2 - 6), STONE)
    box("Cornisa lateral", (2.6, 1.0, D - 12), (x, 12.4, -D / 2 - 6), STONE_DARK)
    for i in range(1, RIBS - 1):
        z = -D * i / (RIBS - 1)
        box("Contrafuerte", (3.0, 13, 2.2), (x + s * 1.3, 6.5, z), STONE_DARK, bev=0.1)
        zc = z - D / (RIBS - 1) / 2
        win = [(-2.2, -3.5), (2.2, -3.5), (2.2, 1.5)] + [
            (math.cos(math.pi * k / 10) * 2.2, 1.5 + math.sin(math.pi * k / 10) * 2.2) for k in range(1, 10)] + [(-2.2, 1.5)]
        v, f = g_prism(win, 1.8)
        mk("Ventana lateral", v, f, WINDOW, T((x, 6.5, zc), (0, math.pi / 2, 0)), tint=0)
    # Tejado de la nave lateral: sella el hueco entre el pie de la bóveda y el muro.
    x0, y0, x1, y1 = spring_x - 0.5, SPRING_Y + 0.4, W + 3.6, 13.0
    length = math.hypot(x1 - x0, y1 - y0)
    box("Tejado lateral", (length, 0.5, D - 12), (s * (x0 + x1) / 2, (y0 + y1) / 2, -D / 2 - 6), SLATE,
        rot=(0, 0, s * math.atan2(y1 - y0, x1 - x0)))
BACK_Z = -D - 1
v, f = g_box(2 * W + 8, H + 10, 2)
back = mk("Muro de fondo", v, f, STONE_DARK, T((0, (H + 10) / 2, BACK_Z)), tint=0)
hv, hf = g_prism([(math.cos(k / 48 * math.tau) * 17, 34 + math.sin(k / 48 * math.tau) * 17) for k in range(48)], 6)
cut = mk("Hueco del rosetón", hv, hf, STONE, T((0, 0, BACK_Z)), part="cutter")
cut.hide_render = cut.hide_viewport = True
mod = back.modifiers.new("Rosa", "BOOLEAN")
mod.object = cut
mod.operation = "DIFFERENCE"
mod.solver = "EXACT"
v, f = g_torus(17.6, 1.1, 64, 10)
mk("Moldura del rosetón", v, f, STONE, T((0, 34, BACK_Z + 1.4)), tint=0)
v, f = g_torus(21.0, 0.7, 64, 8)
mk("Aro exterior del rosetón", v, f, GOLD, T((0, 34, BACK_Z + 1.2)), tint=0)
for k in range(16):
    a = k / 16 * math.tau
    v, f = g_torus(1.4, 0.3, 16, 6)
    mk("Óculo", v, f, STONE, T((math.cos(a) * 19.3, 34 + math.sin(a) * 19.3, BACK_Z + 1.3)), tint=0)

# Portones del vestíbulo: lo que el maquinista tiene delante al detenerse en el tope.
# Sin ellos la resolución del viaje era un muro liso (el vitral queda por encima del cuadro).


def arch_shape(width, height, grow=0.0, per=12):
    r = width / 2 + grow
    spring = height - width / 2
    pts = [(-r, -grow), (r, -grow)]
    pts += [(math.cos(math.pi * k / per) * r, spring + math.sin(math.pi * k / per) * r) for k in range(per + 1)]
    return pts


HALL_Z = BACK_Z + 1.05
for cx, width, height in ((0, 10, 15), (-13, 6.5, 10.5), (13, 6.5, 10.5)):
    v, f = g_prism(arch_shape(width, height), 0.3)
    mk("Portón iluminado", v, f, WINDOW, T((cx, 0.2, HALL_Z)), tint=0)
    outer = arch_shape(width, height, 0.9)
    inner = arch_shape(width, height, 0.0)
    ring_outer = outer[2:] + outer[:2]
    ring_inner = inner[2:] + inner[:2]
    from kit import g_ring_prism
    v, f = g_ring_prism(ring_outer, ring_inner, 0.9)
    mk("Moldura del portón", v, f, STONE, T((cx, 0.2, HALL_Z + 0.3)), tint=0)
    spring = height - width / 2
    for k in range(1, 4 if width > 8 else 3):
        mx = cx - width / 2 + k * width / (4 if width > 8 else 3)
        box("Montante del portón", (0.22, spring, 0.3), (mx, 0.2 + spring / 2, HALL_Z + 0.25), IRON)
    for yy in (spring * 0.45, spring):
        box("Travesaño del portón", (width, 0.22, 0.3), (cx, 0.2 + yy, HALL_Z + 0.25), IRON)
    for k in range(1, 6):
        a = math.pi * k / 6
        R = width / 2
        pipe("Abanico del portón", [(cx, 0.2 + spring, HALL_Z + 0.25),
                                    (cx + math.cos(a) * R, 0.2 + spring + math.sin(a) * R, HALL_Z + 0.25)], 0.1, IRON, sides=5)
v, f = g_torus(1.6, 0.25, 32, 8)
mk("Estrella del vestíbulo · aro", v, f, GOLD, T((0, 18.2, HALL_Z + 0.4)), tint=0)
for k in range(5):
    a = math.pi / 2 + k / 5 * math.tau
    box("Punta de estrella", (0.35, 1.5, 0.3), (math.cos(a) * 0.85, 18.2 + math.sin(a) * 0.85, HALL_Z + 0.45), GOLD,
        rot=(0, 0, a - math.pi / 2), tint=0)
box("Friso del vestíbulo", (2 * W + 6, 1.2, 1.2), (0, 20.8, HALL_Z + 0.5), STONE, bev=0.1)
for x in (-20, -6.8, 6.8, 20):
    box("Pilastra del vestíbulo", (1.4, 20.6, 0.8), (x, 10.3, HALL_Z + 0.4), STONE, bev=0.08)

# ===========================================================================
# 5. ANDENES: columnas-palmera con farol, bancas, carritos, reloj colgante, tope
# ===========================================================================
for s in (-1, 1):
    x = s * 9.5
    box("Andén", (11, 1.1, D - 6), (x, 0.55, -D / 2), STONE_DARK)
    box("Bordillo", (0.8, 0.2, D - 6), (s * 4.3, 1.2, -D / 2), STONE, tint=0)
    for i in range(9):
        z = -8 - i * ((D - 20) / 8)
        lathe("Columna palmera", [(0.55, 0), (0.55, 0.4), (0.3, 0.7), (0.22, 4.6), (0.35, 5.0), (0.3, 5.3), (0.0001, 5.35)],
              (x, 1.1, z), IRON, seg=10)
        for k in range(4):
            a = k / 4 * math.tau + math.pi / 4
            pipe("Fronda", [(x, 6.1, z), (x + math.cos(a) * 1.0, 6.9, z + math.sin(a) * 1.0),
                            (x + math.cos(a) * 1.9, 6.5, z + math.sin(a) * 1.9),
                            (x + math.cos(a) * 2.2, 5.8, z + math.sin(a) * 2.2)], 0.09, IRON, sides=5, per=3)
        lathe("Farol de andén", [(0.0001, -0.7), (0.4, -0.6), (0.65, -0.1), (0.6, 0.35), (0.35, 0.65), (0.0001, 0.7)],
              (x, 7.2, z), LAMP, seg=12, tint=0)
        lathe("Sombrerete", [(0.75, 0), (0.55, 0.3), (0.12, 0.7), (0.0001, 0.9)], (x, 7.85, z), GOLD, seg=12, tint=0)
        if i % 2 == 0 and i < 8:
            bz = z - 7.3
            box("Asiento de banca", (0.9, 0.12, 3.2), (x + s * 3.0, 1.75, bz), WOOD)
            box("Respaldo de banca", (0.12, 0.8, 3.2), (x + s * 3.45, 2.3, bz), WOOD)
            for dz in (-1.3, 1.3):
                box("Pata de banca", (0.9, 0.65, 0.12), (x + s * 3.0, 1.42, bz + dz), IRON)
    for cz in (-40, -104):
        box("Carrito de equipaje", (1.6, 0.9, 2.6), (x + s * 2.0, 2.2, cz), WOOD, bev=0.05)
        box("Maleta", (0.9, 0.55, 1.3), (x + s * 2.0, 2.9, cz + 0.4), RED, bev=0.08)
        box("Baúl", (1.0, 0.7, 0.9), (x + s * 2.0, 2.95, cz - 0.8), IRON, bev=0.05)
        for dz in (-0.9, 0.9):
            cyl("Rueda de carrito", 0.4, 0.15, (x + s * 2.85, 1.5, cz + dz), IRON, (0, 0, math.pi / 2), seg=12)
# Piso de la nave: losas de piedra entre el terreno (−0.02) y el balasto de la vía (+0.4).
box("Piso de la nave", (2 * W + 4, 0.1, D + 4), (0, 0.1, -D / 2), STONE_DARK, tint=0)
for k in range(1, 30):
    box("Junta de losa", (2 * W + 4, 0.02, 0.18), (0, 0.16, -k * D / 30), STONE, tint=0)
# Gran reloj colgante sobre la vía, a dos caras.
CLOCK_Z = -58.0
for cz in (0.45, -0.45):
    v, f = g_cyl(2.3, 2.3, 0.3, 40)
    mk("Esfera colgante", v, f, DIAL, T((0, 12.2, CLOCK_Z + cz), (math.pi / 2, 0, 0)), tint=0)
box("Caja del reloj colgante", (5.4, 5.4, 0.8), (0, 12.2, CLOCK_Z), GOLD, bev=0.3, tint=0)
for k in range(12):
    a = k / 12 * math.tau
    for cz in (0.65, -0.65):
        box("Hora", (0.18, 0.55, 0.06), (math.cos(a) * 1.85, 12.2 + math.sin(a) * 1.85, CLOCK_Z + cz), GOLD,
            rot=(0, 0, a - math.pi / 2), tint=0)
for cz in (0.65, -0.65):
    box("Manecilla", (0.14, 1.6, 0.05), (0.35, 12.9, CLOCK_Z + cz), GOLD, rot=(0, 0, -0.4), tint=0)
    box("Minutero", (0.1, 2.0, 0.05), (-0.2, 11.4, CLOCK_Z + cz), GOLD, rot=(0, 0, 2.6), tint=0)
for sx in (-1.8, 1.8):
    pipe("Tirante del reloj", [(sx, 15.0, CLOCK_Z), (sx * 6, 40.0, CLOCK_Z)], 0.1, IRON, sides=5)
v, f = g_torus(0.9, 0.2, 16, 6)
mk("Argolla", v, f, GOLD, T((0, 15.3, CLOCK_Z)), tint=0)
# Tope de vía ornamentado.
STOP_Z = -D + 8
box("Viga del tope", (4.4, 0.9, 0.7), (0, 1.35, STOP_Z + 0.2), RED, bev=0.08)
for s in (-1, 1):
    pipe("Brazo del tope", [(s * 1.6, 0.0, STOP_Z - 2.0), (s * 1.6, 1.3, STOP_Z - 0.5), (s * 1.6, 1.6, STOP_Z)], 0.16, IRON, per=3)
    cyl("Topera de latón", 0.4, 0.7, (s * 1.3, 1.35, STOP_Z + 0.8), GOLD, (math.pi / 2, 0, 0), seg=16, tint=0)
    lathe("Plato de topera", [(0.0001, 0), (0.55, 0), (0.55, 0.12), (0.0001, 0.14)], (s * 1.3, 1.35, STOP_Z + 1.15), GOLD, (math.pi / 2, 0, 0), seg=16, tint=0)
v, f = g_cyl(0.16, 0.16, 0.14, 16)
mk("Farol del tope", v, f, BUFFER_LAMP, T((0, 2.2, STOP_Z + 0.4), (math.pi / 2, 0, 0)), tint=0)
box("Base del tope", (4.8, 0.6, 3.0), (0, 0.3, STOP_Z - 0.8), STONE_DARK)

# ===========================================================================
# 6. PÓRTICO DE LOS 8 ARCOS (local a la vía) y su MEDALLÓN
# ===========================================================================
PART["name"] = "gate"
# Columnas esbeltas de hierro fundido: con el ritardando los 8 pórticos se juntan, y una
# celosía de cuatro montantes leía a jaula. Fuste estriado, collarines y capitel de oro.
for s in (-1, 1):
    x = s * 6.2
    lathe("Basa del pórtico", [(0.0001, 0), (0.62, 0), (0.62, 0.35), (0.48, 0.55), (0.4, 0.8), (0.0001, 0.8)],
          (x, 0, 0), STONE, seg=12)
    lathe("Fuste del pórtico", [(0.36, 0.8), (0.3, 1.4), (0.24, 2.0), (0.22, 10.0), (0.3, 10.4), (0.0001, 10.4)],
          (x, 0, 0), IRON, seg=12, smooth_angle=0.8)
    for k in range(8):
        a = k / 8 * math.tau
        box("Estría", (0.05, 7.6, 0.05), (x + math.cos(a) * 0.235, 6.1, math.sin(a) * 0.235), IRON, tint=0)
    for y in (2.1, 9.7):
        v, f = g_torus(0.28, 0.06, 16, 5)
        mk("Collarín dorado", v, f, GOLD, T((x, y, 0), (math.pi / 2, 0, 0)), tint=0)
    lathe("Capitel del pórtico", [(0.3, 10.4), (0.55, 10.8), (0.8, 11.1), (0.8, 11.3), (0.0001, 11.3)], (x, 0, 0), GOLD, seg=12, tint=0)
    pipe("Ménsula de voluta", [(x, 9.2, 0), (x - s * 1.2, 10.4, 0), (x - s * 2.0, 11.9, 0), (x - s * 1.5, 12.6, 0)], 0.11, IRON, per=4)
lintel = [(-6.4, 11.6, 0), (-3.2, 13.6, 0), (0, 14.4, 0), (3.2, 13.6, 0), (6.4, 11.6, 0)]
pipe("Dintel curvo", lintel, 0.26, IRON, sides=10, per=6)
pipe("Dintel curvo alto", [(x0, y0 + 0.9, z0) for x0, y0, z0 in lintel], 0.14, GOLD, sides=8, per=6)
v, f = g_torus(1.55, 0.22, 32, 8)
mk("Aro del medallón", v, f, GOLD, T((0, 14.2, 0)), tint=0)
for k in range(8):
    a = k / 8 * math.tau
    box("Rayo del medallón", (0.16, 0.9, 0.16), (math.cos(a) * 2.25, 14.2 + math.sin(a) * 2.25, 0), GOLD,
        rot=(0, 0, a - math.pi / 2), tint=0)
PART["name"] = "medallion"
lathe("Medallón", [(0.0001, 0.2), (0.8, 0.19), (1.15, 0.12), (1.15, -0.12), (0.8, -0.19), (0.0001, -0.2)],
      (0, 0, 0), MEDAL, (math.pi / 2, 0, 0), seg=32, smooth_angle=0.5, tint=0)
for k in range(5):
    a = math.pi / 2 + k / 5 * math.tau
    b = a + math.tau / 10
    for zz in (0.2, -0.2):
        v = [(0, 0, zz), (math.cos(a) * 0.85, math.sin(a) * 0.85, zz), (math.cos(b) * 0.35, math.sin(b) * 0.35, zz)]
        mk("Estrella", v, [(0, 1, 2) if zz > 0 else (0, 2, 1)], MEDAL, recalc=False, tint=0)
        v = [(0, 0, zz), (math.cos(b) * 0.35, math.sin(b) * 0.35, zz), (math.cos(a + math.tau / 5) * 0.85, math.sin(a + math.tau / 5) * 0.85, zz)]
        mk("Estrella", v, [(0, 1, 2) if zz > 0 else (0, 2, 1)], MEDAL, recalc=False, tint=0)
PART["name"] = "static"

# ===========================================================================
# EXPORTACIÓN
# ===========================================================================
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()


def to_three(p):
    return (p.x, p.z, -p.y)


def harvest(objs, precision=2):
    buckets = {}
    for ob in objs:
        ev = ob.evaluated_get(dg)
        me = ev.to_mesh()
        me.calc_loop_triangles()
        mw = ob.matrix_world
        nm = mw.to_3x3().inverted().transposed()
        tint = ob.get("tint", [1, 1, 1])
        for tri in me.loop_triangles:
            mat = ob.material_slots[tri.material_index].material
            key = mat["game"]["key"]
            b = buckets.setdefault(key, dict(material=key, position=[], normal=[], color=[], index=[], _k={}))
            for li in tri.loops:
                p = to_three(mw @ me.vertices[me.loops[li].vertex_index].co)
                n = Vector(to_three(nm @ me.corner_normals[li].vector)).normalized()
                k = (round(p[0], precision), round(p[1], precision), round(p[2], precision),
                     round(n.x, 2), round(n.y, 2), round(n.z, 2), round(tint[0], 3), round(tint[1], 3))
                idx = b["_k"].get(k)
                if idx is None:
                    idx = len(b["position"]) // 3
                    b["_k"][k] = idx
                    b["position"] += k[0:3]
                    b["normal"] += k[3:6]
                    b["color"] += [k[6], k[7], k[6]]
                b["index"].append(idx)
        ev.to_mesh_clear()
    out = []
    for b in buckets.values():
        del b["_k"]
        out.append(b)
    return out


def part(name):
    return [o for o in COL.objects if o.get("part") == name and o.type == "MESH"]


spokes = []
for ob in part("spoke"):
    tower = 1 if ob.matrix_world.translation.x > 0 else -1
    bucket = harvest([ob])[0]
    spokes.append(dict(tower=tower, spoke=ob["spoke"], **bucket))
payload = dict(
    generator="Blender " + bpy.app.version_string,
    space="three · grupo building de station.ts (boca z=0, fondo z=-150)",
    materials=[m["game"].to_dict() for m in MATS.values()],
    static=harvest(part("static")),
    spokes=spokes,
    gate=harvest(part("gate")),
    medallion=harvest(part("medallion"), 3),
)
path = DATA / "terminal.json"
path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
tri = lambda group: sum(len(b["index"]) // 3 for b in group)  # noqa: E731
print(f"TERMINAL_JSON {path.stat().st_size / 1e6:.2f} MB · estático {tri(payload['static'])} tri en "
      f"{len(payload['static'])} materiales · husos {len(spokes)} · pórtico {tri(payload['gate'])} · medallón {tri(payload['medallion'])}")

for o in bpy.data.objects:
    o.select_set(o.name in COL.objects and o.get("part") != "cutter")
bpy.ops.export_scene.gltf(filepath=str(ROOT / "terminal.glb"), export_format="GLB", use_selection=True, export_apply=True)

# ===========================================================================
# RENDERS
# ===========================================================================
if RENDER:
    # Los pórticos de muestra se colocan delante de la boca, sobre la vía.
    gate_objs = part("gate") + part("medallion")
    for ob in gate_objs:
        ob.matrix_world = Matrix.Translation(B((0, 0, 30))) @ ob.matrix_world
    for k in (1, 2):
        for ob in gate_objs:
            dup = ob.copy()
            STAGE.objects.link(dup)
            dup.matrix_world = Matrix.Translation(B((0, 0, 11 * k))) @ ob.matrix_world
    for ob in part("spoke"):
        if ob["spoke"] in (0, 2, 4, 5, 7, 9, 11):
            ob.material_slots[0].link = "OBJECT"
            ob.material_slots[0].material = LAMP

    world = bpy.data.worlds.new("Atardecer")
    scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    sky = nodes.new("ShaderNodeTexSky")
    sky.sky_type = "NISHITA"
    sky.sun_elevation = math.radians(9)
    sky.sun_rotation = math.radians(200)
    world.node_tree.links.new(sky.outputs[0], nodes["Background"].inputs[0])
    nodes["Background"].inputs[1].default_value = 0.35

    def stage(name, verts, faces, hex_color, M):
        me = bpy.data.meshes.new(name)
        me.from_pydata([B(M @ Vector(p)) for p in verts], [], faces)
        ob = bpy.data.objects.new(name, me)
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*lin(hex_color), 1)
        me.materials.append(m)
        STAGE.objects.link(ob)

    stage("Suelo", *g_box(900, 0.2, 900), "#7b8a52", T((0, -0.1, -100)))
    stage("Balasto", *g_box(4.4, 0.3, 400), "#77716a", T((0, 0.05, 50)))
    for x in (-0.8, 0.8):
        stage("Riel", *g_box(0.12, 0.16, 400), "#8a8378", T((x, 0.3, 50)))
    bpy.ops.object.light_add(type="SUN")
    sun = bpy.context.object
    sun.data.energy = 2.2
    sun.data.color = (1, 0.8, 0.6)
    sun.rotation_euler = (math.radians(75), 0, math.radians(20))
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = True
    scene.view_settings.view_transform = "AgX"

    def shoot(filename, pos, target, fov, w, h):
        cd = bpy.data.cameras.new(filename)
        cam = bpy.data.objects.new(filename, cd)
        STAGE.objects.link(cam)
        cam.location = B(pos)
        cam.rotation_euler = (B(target) - B(pos)).to_track_quat("-Z", "Y").to_euler()
        cd.sensor_fit = "VERTICAL"
        cd.angle_y = math.radians(fov)
        cd.clip_end = 2000
        scene.camera = cam
        scene.render.resolution_x, scene.render.resolution_y = w, h
        scene.render.filepath = str(ROOT / filename)
        bpy.ops.render.render(write_still=True)

    shoot("terminal-llegada.png", (0, 3.3, 70), (0, 30, -20), 60, 1600, 900)
    shoot("terminal-fachada.png", (-70, 30, 120), (0, 40, -30), 40, 1600, 900)
    shoot("terminal-nave.png", (0, 3.3, -30), (0, 18, -150), 60, 1600, 900)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "terminal.blend"))
print("TERMINAL_OK")
