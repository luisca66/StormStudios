"""Landmarks de los biomas del Expreso Tonal — modelados con Blender 4.5 (bpy).

Cada pieza se autora en su espacio local de Three: Y arriba, y = 0 al pie (terreno), +X
hacia la derecha de la vía, Z a lo largo de la vía. scenery.ts la planta con la base
(right · up · −tangente) del punto de vía que le toca.

Piezas:
  waterTower   · Valle   · torre de agua ferroviaria (su tolva apunta a +X, hacia la vía)
  mill         · Valle   · molino en la orilla lejana del río; `millWheel` gira aparte
  viaductSpan  · Sierra  · tramo de viaducto de 18 u y ±17 de ancho (y = 0 = tablero)
  gorgeRiver   · Sierra  · río al fondo de la barranca
  tunnelHill   · Sierra  · montaña con portales de sillería (el túnel la atraviesa en Z)
  cascade      · Sierra  · peñasco con cascada y poza
  wagonWreck   · Desierto· carreta abandonada
  lighthouse   · Costa   · faro con casa del farero; `lighthouseBeam` gira aparte
  frozenPond   · Páramo  · estanque helado, apacheta y observatorio

Ejecutar:  powershell -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 art\\blender\\modelar-landmarks.py
"""
import sys
import bpy
import bmesh
import json
import math
import os
from pathlib import Path
from mathutils import Matrix, Vector, noise

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from kit import (KIT, B, T, lin, make, bevel, g_box, g_cyl, g_lathe, g_torus, g_prism,  # noqa: E402
                 g_ring_prism, combine, setup)
from kit import pipe as kit_pipe  # noqa: E402

GAME = ROOT.parent.parent
DATA = GAME / "src" / "3d" / "assets"
RENDER = os.environ.get("LAND_RENDER", "1") != "0"
SAMPLES = int(os.environ.get("LAND_SAMPLES", "32"))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
COL = bpy.data.collections.new("Landmarks")
STAGE = bpy.data.collections.new("Solo render")
scene.collection.children.link(COL)
scene.collection.children.link(STAGE)
setup(COL, 20260916)

MATS = {}


def material(key, hex_color, kind="paint", metal=0.0, rough=0.8, emit=0.0):
    m = bpy.data.materials.new(key)
    c = lin(hex_color)
    m.diffuse_color = (*c, 1)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*c, 1)
    p.inputs["Metallic"].default_value = metal
    p.inputs["Roughness"].default_value = rough
    if emit:
        p.inputs["Emission Color"].default_value = (*c, 1)
        p.inputs["Emission Strength"].default_value = emit
    m["kind"] = kind
    MATS[key] = m
    return m


WOOD = material("wood", "#7a5234")
WOOD_DARK = material("woodDark", "#4f3522")
WOOD_BLEACH = material("woodBleach", "#b9a78a")
IRON = material("iron", "#2e2d2f", "metal", 0.6, 0.55)
STONE = material("stone", "#8d877c", rough=0.95)
STONE_DARK = material("stoneDark", "#645f57", rough=0.95)
STONE_WARM = material("stoneWarm", "#a39073", rough=0.95)
ROOF_TILE = material("roofTile", "#9b4a32")
SHINGLE = material("shingle", "#4c3a2e")
PLASTER = material("plaster", "#e7dfcc")
ROCK = material("rock", "#5a605c", rough=1.0)
ROCK_SNOW = material("rockSnow", "#9aa3ad", rough=1.0)
SNOW = material("snow", "#eef2f7", rough=0.9)
ICE = material("ice", "#bfe0ec", "water", 0.1, 0.1)
WATER = material("water", "#5f9daa", "water", 0.18, 0.18)
FOAM = material("foam", "#e8f4f6", "water", 0.0, 0.3)
BONE = material("bone", "#d8ccb2")
RED = material("red", "#b3362c")
WHITE = material("white", "#efece4")
COPPER = material("copper", "#5f9e8a", "metal", 0.35, 0.55)
BRASS = material("brass", "#c9a227", "metal", 1.0, 0.3)
LAMP = material("lamp", "#ffe6a8", "lamp", emit=3.0)
WINDOW = material("window", "#ffcf85", "lamp", emit=1.2)
BEAM = material("beam", "#fff1c4", "beam", emit=1.0)
PINE = material("pine", "#24493a", rough=0.95)

PIECE = {"name": ""}


def mk(name, verts, faces, mat, M=None, **kw):
    ob = make(name, verts, faces, mat, M, **kw)
    ob["piece"] = PIECE["name"]
    return ob


def pipe(name, points, r, mat, sides=8, per=2):
    ob = kit_pipe(name, points, r, mat, sides=sides, per=per)
    ob["piece"] = PIECE["name"]
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


def lathe(name, profile, pos, mat, rot=(0, 0, 0), seg=20, **kw):
    v, f = g_lathe(profile, seg)
    return mk(name, v, f, mat, T(pos, rot), **kw)


def ico(radius, subdiv=1):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=radius)
    v = [tuple(x.co) for x in bm.verts]
    f = [tuple(x.index for x in face.verts) for face in bm.faces]
    bm.free()
    return v, f


def rock(name, pos, size, mat=ROCK, seed=0.0, squash=0.7):
    """Roca low-poly: icosfera deformada con ruido."""
    v, f = ico(1.0, 1)
    out = []
    for x, y, z in v:
        n = 1 + 0.35 * noise.noise(Vector((x * 1.7 + seed, y * 1.7, z * 1.7)))
        out.append((x * size[0] * n, max(y * size[1] * n * squash, -0.3 * size[1]), z * size[2] * n))
    return mk(name, out, f, mat, T(pos), smooth_angle=0.15, tint=0.1)


AXIS_X = (0, 0, math.pi / 2)
AXIS_Z = (math.pi / 2, 0, 0)

# ===========================================================================
# VALLE · torre de agua
# ===========================================================================
PIECE["name"] = "waterTower"
for sx in (-1, 1):
    for sz in (-1, 1):
        box("Zapata", (1.2, 0.6, 1.2), (sx * 2.2, 0.3, sz * 2.2), STONE, bev=0.05)
        pipe("Pata", [(sx * 2.2, 0.6, sz * 2.2), (sx * 1.8, 7.2, sz * 1.8)], 0.22, WOOD, sides=6)
for y0, y1 in ((0.8, 3.8), (3.8, 6.9)):
    k0 = 2.2 - (y0 - 0.6) / 6.6 * 0.4
    k1 = 2.2 - (y1 - 0.6) / 6.6 * 0.4
    for s in (-1, 1):
        pipe("Riostra", [(-k0, y0, s * k0), (k1, y1, s * k1)], 0.09, WOOD_DARK, sides=5)
        pipe("Riostra", [(k0, y0, s * k0), (-k1, y1, s * k1)], 0.09, WOOD_DARK, sides=5)
        pipe("Riostra", [(s * k0, y0, -k0), (s * k1, y1, k1)], 0.09, WOOD_DARK, sides=5)
        pipe("Riostra", [(s * k0, y0, k0), (s * k1, y1, -k1)], 0.09, WOOD_DARK, sides=5)
box("Plataforma", (5.2, 0.3, 5.2), (0, 7.25, 0), WOOD_DARK, bev=0.04)
staves = []
for k in range(28):
    a = k / 28 * math.tau
    sv, sf = g_box(0.58, 3.4, 0.14)
    staves.append((sv, sf, T((math.sin(a) * 2.55, 8.95, math.cos(a) * 2.55), (0, a, 0))))
v, f = combine(staves)
mk("Duelas", v, f, WOOD, smooth_angle=0.2, tint=0.08)
for y in (7.7, 8.9, 10.1):
    v, f = g_torus(2.66, 0.06, 36, 5)
    mk("Aro", v, f, IRON, T((0, y, 0), (math.pi / 2, 0, 0)), tint=0)
lathe("Techo cónico", [(2.95, 10.6), (2.95, 10.75), (0.15, 12.6), (0.0001, 12.7)], (0, 0, 0), SHINGLE, seg=16, smooth_angle=0.3)
lathe("Remate", [(0.0001, 12.5), (0.14, 12.6), (0.18, 13.0), (0.0001, 13.2)], (0, 0, 0), IRON, seg=8)
pipe("Tolva", [(2.4, 7.8, 0), (3.6, 7.3, 0), (5.0, 6.2, 0)], 0.28, IRON, sides=10, per=4)
pipe("Cadena", [(5.0, 6.2, 0), (4.6, 7.6, 0), (3.0, 10.4, 0)], 0.03, IRON, sides=4, per=3)
for k in range(12):
    box("Peldaño", (0.7, 0.07, 0.07), (-1.9 + k * 0.01, 1.0 + k * 0.55, 2.2 - k * 0.034), WOOD_DARK)
for s in (-1, 1):
    pipe("Larguero de escalera", [(-1.9 + s * 0.35, 0.6, 2.25), (-1.78 + s * 0.35, 7.2, 1.85)], 0.05, WOOD_DARK, sides=4)

# ===========================================================================
# VALLE · molino de agua (la rueda va aparte)
# ===========================================================================
PIECE["name"] = "mill"
box("Basamento de piedra", (6.4, 3.2, 8.4), (0, 1.6, 0), STONE_WARM, bev=0.08)
box("Piso de entramado", (6.2, 3.0, 8.2), (0, 4.7, 0), PLASTER)
for z in (-4.05, -1.4, 1.4, 4.05):
    for x in (-3.15, 3.15):
        box("Poste de entramado", (0.22, 3.0, 0.22), (x, 4.7, z), WOOD_DARK)
for x in (-3.16, 3.16):
    box("Carrera", (0.24, 0.24, 8.3), (x, 6.2, 0), WOOD_DARK)
    box("Solera", (0.24, 0.24, 8.3), (x, 3.3, 0), WOOD_DARK)
    for z0, z1 in ((-4.05, -1.4), (1.4, 4.05)):
        length = math.hypot(z1 - z0, 2.8)
        box("Tornapunta", (0.18, length, 0.18), (x, 4.75, (z0 + z1) / 2), WOOD_DARK, rot=(math.atan2(z1 - z0, 2.8), 0, 0))
roof = [(-3.9, 0), (3.9, 0), (0, 3.4)]
v, f = g_prism([(x, y) for x, y in roof], 9.4)
mk("Hastial", v, f, PLASTER, T((0, 6.2, 0)), smooth_angle=0.1)
for s in (-1, 1):
    length = math.hypot(3.9, 3.4) + 0.5
    box("Faldón de teja", (length, 0.25, 9.8), (s * 1.95, 7.95, 0), ROOF_TILE, rot=(0, 0, -s * math.atan2(3.4, 3.9)))
    for k in range(9):
        box("Hilada", (length, 0.08, 0.12), (s * 1.95, 8.12, -4.6 + k * 1.15), ROOF_TILE, rot=(0, 0, -s * math.atan2(3.4, 3.9)), tint=0.05)
box("Chimenea", (0.9, 3.2, 0.9), (1.4, 9.2, -2.6), STONE_WARM)
box("Puerta", (0.12, 2.2, 1.3), (3.25, 1.1, 1.6), WOOD_DARK)
for z in (-2.2, 2.2):
    box("Ventana", (0.1, 1.0, 0.9), (-3.22, 4.8, z), WINDOW, tint=0)
    box("Marco de ventana", (0.12, 1.2, 1.1), (-3.2, 4.8, z), WOOD_DARK)
# Canal de madera que baja el agua sobre la rueda.
box("Canal", (1.6, 0.5, 9.0), (-5.0, 7.4, -2.0), WOOD, rot=(0.12, 0, 0))
for z in (-5.5, -1.5, 2.0):
    box("Caballete del canal", (0.2, 7.0, 0.2), (-5.0, 3.6, z), WOOD_DARK)
box("Eje", (2.4, 0.3, 0.3), (-4.2, 3.4, 0), IRON)

PIECE["name"] = "millWheel"   # origen = centro del eje; gira en X
for x in (-0.55, 0.55):
    v, f = g_torus(3.3, 0.14, 40, 6)
    mk("Llanta", v, f, WOOD, T((x, 0, 0), (0, math.pi / 2, 0)), tint=0)
    for k in range(8):
        a = k / 8 * math.tau
        box("Rayo", (0.16, 3.2, 0.2), (x, math.sin(a) * 1.6, math.cos(a) * 1.6), WOOD_DARK, rot=(-a + math.pi / 2, 0, 0))
for k in range(16):
    a = k / 16 * math.tau
    box("Paleta", (1.4, 0.7, 0.1), (0, math.sin(a) * 3.45, math.cos(a) * 3.45), WOOD, rot=(-a, 0, 0), tint=0.06)
cyl("Cubo", 0.45, 1.4, (0, 0, 0), IRON, AXIS_X, 12)

# ===========================================================================
# SIERRA · viaducto (tramo de 18 u, y = 0 tablero, piers bajan hasta −38)
# ===========================================================================
PIECE["name"] = "viaductSpan"
# Tablero ASIMÉTRICO: de x = −17 a +5.5. El pretil derecho queda cerca de la cabina y el
# lado izquierdo, más ancho, sostiene el ramal del desvío (en este tramo sale siempre a la
# izquierda, a 13 u). Tramo de 18 u; y = 0 es el tablero; las pilas bajan hasta −38.
X_L, X_R, SPAN = -17.0, 5.5, 18.0
CX, WIDTH = (X_L + X_R) / 2, X_R - X_L
R = (SPAN - 3.0) / 2
SPRING = -1.8 - R
arc = [(R * math.cos(math.pi * k / 16), SPRING + R * math.sin(math.pi * k / 16)) for k in range(17)]
outline = [(-SPAN / 2, SPRING), (-SPAN / 2, -0.6), (SPAN / 2, -0.6), (SPAN / 2, SPRING)] + arc
v, f = g_prism([(z, y) for z, y in outline], WIDTH - 1.0)
mk("Tímpano", v, f, STONE, T((CX, 0, 0), (0, math.pi / 2, 0)), smooth_angle=0.1, tint=0.04)
pier = [(-1.5, SPRING), (1.5, SPRING), (2.3, -38.0), (-2.3, -38.0)]
v, f = g_prism([(z, y) for z, y in pier], WIDTH - 1.0)
mk("Pila", v, f, STONE, T((CX, 0, -SPAN / 2), (0, math.pi / 2, 0)), smooth_angle=0.1, tint=0.05)
outer = [((R + 1.2) * math.cos(math.pi * k / 16), SPRING + (R + 1.2) * math.sin(math.pi * k / 16)) for k in range(17)]
inner = [(R * math.cos(math.pi * k / 16), SPRING + R * math.sin(math.pi * k / 16)) for k in range(17)]
for face_x, s_out in ((X_L + 0.35, -1), (X_R - 0.35, 1)):
    for k in range(16):
        quad = [inner[k], inner[k + 1], outer[k + 1], outer[k]]
        v, f = g_prism([(z, y) for z, y in quad], 0.5)
        mk("Dovela", v, f, STONE_DARK if k % 2 else STONE, T((face_x, 0, 0), (0, math.pi / 2, 0)), smooth_angle=0.1, tint=0.05)
    box("Imposta", (0.5, 0.6, 3.6), (face_x + s_out * 0.05, SPRING + 0.3, -SPAN / 2), STONE_DARK)
    # Pretil con albardilla: lo que el maquinista ve al asomarse.
    box("Pretil", (0.7, 1.1, SPAN), (face_x, 0.55, 0), STONE, tint=0.03)
    box("Albardilla", (1.0, 0.25, SPAN), (face_x, 1.22, 0), STONE_DARK)
    box("Cornisa", (0.9, 0.5, SPAN), (face_x + s_out * 0.45, -0.75, 0), STONE_DARK)
    for k in range(6):
        box("Junta del pretil", (0.72, 0.04, 0.05), (face_x, 0.55 + (k % 2) * 0.2, -SPAN / 2 + 1.5 + k * 3), STONE_DARK, tint=0)
    box("Tajamar", (2.8, 2.8, 3.0), (face_x + s_out * 0.15, -34.0, -SPAN / 2), STONE_DARK, rot=(0, math.pi / 4, 0))
box("Tablero", (WIDTH - 1.0, 0.6, SPAN), (CX, -0.3, 0), STONE_DARK, tint=0)

PIECE["name"] = "gorgeRiver"
v = [(-140, 0, -5.5), (140, 0, -5.5), (140, 0, 5.5), (-140, 0, 5.5)]
mk("Río de la barranca", v, [(0, 3, 2, 1)], WATER, recalc=False, tint=0)
for k in range(24):
    rock(f"Canto rodado {k}", (-60 + k * 5.2 + math.sin(k) * 2, 0.0, (k % 3 - 1) * 5.6), (1.2 + (k % 4) * 0.4, 0.9, 1.1), ROCK, seed=k * 1.3)

# ===========================================================================
# SIERRA · montaña del túnel con portales (el túnel corre en Z, radio 4.6, largo 38)
# ===========================================================================
PIECE["name"] = "tunnelHill"
HILL_L = 38.0
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=28, v_segments=14, radius=1.0)
hv, hf = [], []
for vert in bm.verts:
    x, y, z = vert.co
    if y < 0:
        y = 0
    n = 1 + 0.22 * noise.noise(Vector((x * 2.3, y * 2.3, z * 2.3))) + 0.08 * noise.noise(Vector((x * 7, y * 7, z * 7)))
    hv.append((x * 42 * n, y * 26 * n, z * (HILL_L / 2 - 1.0) * (1 + 0.04 * (n - 1))))
hf = [tuple(vv.index for vv in face.verts) for face in bm.faces]
bm.free()
# Sin recalc: el aplanado del fondo deja caras degeneradas y recalc las voltearía.
# Sin booleano: el aplanado del fondo deja caras degeneradas y el barreno EXACT dejaba la
# montaña con 0 caras. Tampoco hace falta: desde dentro del túnel sus caras se ven por
# detrás y no se dibujan. Largo en Z ajustado para que los portales queden por delante.
hill = mk("Montaña", hv, hf, ROCK, smooth_angle=0.3, tint=0, recalc=False)
# Nieve/pinos en la ladera.
for k in range(34):
    a = k * 2.399
    r = 0.35 + 0.55 * ((k * 0.618) % 1)
    x, z = math.cos(a) * r * 38, math.sin(a) * r * 22
    y = 26 * math.sqrt(max(0.0, 1 - (x / 42) ** 2 - (z / 25) ** 2)) - 1.0
    if abs(x) < 8:
        continue
    lathe("Pino", [(1.6, 0), (0.2, 2.2), (1.2, 2.0), (0.1, 4.2), (0.8, 3.9), (0.0001, 5.6)], (x, y, z), PINE, seg=7, smooth_angle=0.1)
for s in (-1, 1):
    zf = s * (HILL_L / 2)
    # Frente de sillería con hueco de herradura.
    face = [(-11, -0.5), (11, -0.5), (11, 12), (-11, 12)]
    hole = [(-4.8, -0.8), (4.8, -0.8)] + [(4.8 * math.cos(math.pi * k / 18), 0.7 + 4.8 * math.sin(math.pi * k / 18)) for k in range(19)]
    v, f = g_box(22, 12.5, 2.0)
    wall = mk("Frente del portal", v, f, STONE, T((0, 5.75, zf + s * 0.8)), tint=0)
    cv, cf = g_prism(hole, 6)
    cutter = mk("Hueco del portal", cv, cf, STONE, T((0, 0, zf)))
    cutter["piece"] = "cutter"
    cutter.hide_render = cutter.hide_viewport = True
    m2 = wall.modifiers.new("Hueco", "BOOLEAN")
    m2.object = cutter
    m2.operation = "DIFFERENCE"
    m2.solver = "EXACT"
    outer = [(6.1 * math.cos(math.pi * k / 18), 0.7 + 6.1 * math.sin(math.pi * k / 18)) for k in range(19)]
    inner = [(4.8 * math.cos(math.pi * k / 18), 0.7 + 4.8 * math.sin(math.pi * k / 18)) for k in range(19)]
    for k in range(18):
        quad = [inner[k], inner[k + 1], outer[k + 1], outer[k]]
        v, f = g_prism(quad[::-1], 0.8)
        mk("Dovela del portal", v, f, BRASS if k == 8 else (STONE_DARK if k % 2 else STONE_WARM),
           T((0, 0, zf + s * 1.9)), smooth_angle=0.1, tint=0.04)
    box("Cornisa del portal", (23, 0.9, 2.8), (0, 12.3, zf + s * 1.0), STONE_DARK, bev=0.05)
    for x in (-10.4, 10.4):
        box("Pilastra del portal", (1.4, 12.5, 0.8), (x, 5.75, zf + s * 2.0), STONE_DARK)
        box("Muro en ala", (1.2, 6.0, 9.0), (x * 1.12, 2.4, zf + s * 5.5), STONE, rot=(0, -s * math.copysign(0.45, x), 0))

# ===========================================================================
# SIERRA · cascada (la vía queda en −X; el peñasco mira hacia −X)
# ===========================================================================
PIECE["name"] = "cascade"
# Peñasco: media elipsoide deformada con ruido, su cara curva mira a −X (la vía).
CW, CH, CD = 9.0, 19.0, 13.0
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=14, radius=1.0)
cv, cf = [], []
for vert in bm.verts:
    x, y, z = vert.co
    y = max(y, 0.0)
    x = min(x, 0.35)
    n = 1 + 0.18 * noise.noise(Vector((x * 2.6 + 3, y * 2.6, z * 2.6))) + 0.07 * noise.noise(Vector((x * 8, y * 8, z * 8)))
    cv.append((x * CW * n + 4.0, y * CH * n, z * CD * n))
cf = [tuple(vv.index for vv in face.verts) for face in bm.faces]
bm.free()
mk("Peñasco", cv, cf, ROCK, smooth_angle=0.25, tint=0, recalc=False)


def surface_x(y):
    """Cara del peñasco a la altura y (sin ruido), un poco por fuera para el agua."""
    t = min(max(y / CH, 0.0), 0.98)
    return 4.0 - CW * math.sqrt(1 - t * t) - 0.5


# Velo de agua pegado a la roca: cinta de 14 tramos que se abre al bajar.
for i, (zc, top_w, bottom_w, mat) in enumerate(((0.0, 2.2, 4.2, WATER), (0.2, 1.0, 2.4, FOAM))):
    rv, rf = [], []
    rows = 14
    for r in range(rows + 1):
        y = CH * 0.92 * (1 - r / rows) + 0.2
        w = top_w + (bottom_w - top_w) * r / rows
        x = surface_x(y) - 0.12 * i
        rv += [(x, y, zc - w / 2), (x, y, zc + w / 2)]
        if r < rows:
            a = 2 * r
            rf.append((a, a + 2, a + 3, a + 1))
    mk(f"Velo de agua {i}", rv, rf, mat, recalc=False, tint=0)
lathe("Poza", [(0.0001, 0.08), (7.0, 0.08)], (-6.0, 0, 0), WATER, seg=28, tint=0)
lathe("Espuma de la poza", [(0.0001, 0.18), (3.2, 0.14)], (-5.6, 0, 0), FOAM, seg=18, tint=0)
for k in range(12):
    a = k / 12 * math.tau
    rock(f"Borde de poza {k}", (-6.0 + math.cos(a) * 7.3, 0.2, math.sin(a) * 7.3), (1.5, 1.0, 1.3), ROCK, seed=20 + k)
for k in range(6):
    lathe("Pino del peñasco", [(1.3, 0), (0.2, 1.9), (1.0, 1.7), (0.1, 3.6), (0.7, 3.4), (0.0001, 4.8)],
          (3.0 + (k % 3), CH * 0.72 + (k % 2) * 1.5, -8 + k * 3.2), PINE, seg=7, smooth_angle=0.1)

# ===========================================================================
# DESIERTO · carreta abandonada
# ===========================================================================
PIECE["name"] = "wagonWreck"


def spoked(name, radius, pos, rot, mat):
    v, f = g_torus(radius, 0.1, 24, 6)
    mk(f"{name} · llanta", v, f, mat, T(pos, rot), tint=0.05)
    parts = []
    for k in range(10):
        sv, sf = g_box(0.07, radius * 2 - 0.2, 0.07)
        parts.append((sv, sf, T((0, 0, 0), (0, 0, k / 10 * math.pi))))
    hv2, hf2 = g_cyl(0.22, 0.22, 0.3, 10)
    parts.append((hv2, hf2, T((0, 0, 0), AXIS_Z)))
    v, f = combine(parts)
    mk(f"{name} · rayos", v, f, mat, T(pos, rot), tint=0.05)


spoked("Rueda enterrada", 1.5, (0, 0.8, 0), (1.2, 0.3, 0.35), WOOD_BLEACH)
spoked("Rueda caída", 1.3, (3.2, 0.12, 2.6), (math.pi / 2, 0, 0.2), WOOD_BLEACH)
box("Caja de carreta", (2.6, 0.9, 4.4), (3.2, 0.7, -1.2), WOOD_BLEACH, rot=(0.18, 0.4, -0.22), bev=0.03)
for k in range(5):
    box("Tabla suelta", (0.3, 0.06, 2.4), (5.4 + k * 0.45, 0.06, -3.4 + k * 0.3), WOOD_BLEACH, rot=(0, 0.2 * k, 0.05))
pipe("Pértiga", [(1.8, 0.4, -2.6), (-0.6, 0.1, -5.8)], 0.08, WOOD_BLEACH, sides=5)
lathe("Barril", [(0.0001, 0), (0.45, 0), (0.55, 0.45), (0.45, 0.9), (0.0001, 0.9)], (-1.8, 0.45, 2.4), WOOD, AXIS_X, seg=12)
for x in (-1.9, -1.4):
    v, f = g_torus(0.52, 0.03, 12, 4)
    mk("Aro de barril", v, f, IRON, T((x, 0.45, 2.4), (0, math.pi / 2, 0)), tint=0)
box("Cráneo", (0.6, 0.45, 0.8), (1.4, 0.25, 3.4), BONE, rot=(0, 0.6, 0), bev=0.12)
for s in (-1, 1):
    pipe("Cuerno", [(1.4 + s * 0.3, 0.45, 3.2), (1.4 + s * 0.9, 0.7, 3.0), (1.4 + s * 1.1, 1.1, 3.2)], 0.07, BONE, sides=5, per=3)
for k in range(5):
    rock(f"Piedra {k}", (-3 + k * 2.1, 0.2, -3 + (k % 2) * 6), (0.6 + k % 2 * 0.3, 0.5, 0.5), STONE_WARM, seed=30 + k)

# ===========================================================================
# COSTA · faro (x = 0 el faro; la casa hacia −X, la vía)
# ===========================================================================
PIECE["name"] = "lighthouse"
for k in range(14):
    a = k / 14 * math.tau
    rock(f"Escollera {k}", (math.cos(a) * 7.5, 1.0, math.sin(a) * 7.5), (2.8, 2.2, 2.4), ROCK, seed=40 + k)
cyl("Zócalo del faro", 5.6, 3.0, (0, 1.5, 0), STONE_WARM, seg=24)
for band in range(6):
    y0 = 3.0 + band * 3.7
    r0 = 3.4 - (y0 - 3.0) / 22 * 1.3
    r1 = 3.4 - (y0 + 3.7 - 3.0) / 22 * 1.3
    v, f = g_cyl(r1, r0, 3.7, 24, caps=False)
    mk("Franja", v, f, RED if band % 2 else WHITE, T((0, y0 + 1.85, 0)), smooth_angle=0.5, tint=0)
for y in (8.5, 16.0):
    box("Ventanuco", (0.6, 1.0, 0.2), (0, y, -2.9 + (y - 8.5) * 0.06), WINDOW, tint=0)
cyl("Galería", 3.1, 0.35, (0, 25.4, 0), IRON, seg=24)
for k in range(18):
    a = k / 18 * math.tau
    box("Balaustre", (0.06, 1.0, 0.06), (math.cos(a) * 2.95, 26.1, math.sin(a) * 2.95), IRON, tint=0)
v, f = g_torus(2.95, 0.05, 36, 4)
mk("Barandal", v, f, IRON, T((0, 26.6, 0), (math.pi / 2, 0, 0)), tint=0)
cyl("Linterna", 1.7, 2.6, (0, 26.9, 0), LAMP, seg=16, tint=0)
for k in range(8):
    a = k / 8 * math.tau
    box("Montante de linterna", (0.1, 2.6, 0.1), (math.cos(a) * 1.72, 26.9, math.sin(a) * 1.72), IRON, tint=0)
lathe("Cúpula del faro", [(2.1, 28.2), (1.8, 28.9), (1.0, 29.6), (0.0001, 29.9)], (0, 0, 0), RED, seg=16)
lathe("Veleta", [(0.0001, 29.8), (0.25, 30.1), (0.3, 30.4), (0.0001, 30.7)], (0, 0, 0), BRASS, seg=10, tint=0)
# Casa del farero.
box("Casa del farero", (5.0, 3.2, 6.0), (-5.6, 4.6, 0), WHITE, bev=0.05)
for s in (-1, 1):
    box("Tejado de la casa", (3.4, 0.22, 6.6), (-5.6 + s * 1.45, 7.0, 0), RED, rot=(0, 0, -s * 0.62))
v, f = g_prism([(-2.7, 0), (2.7, 0), (0, 1.9)], 6.0)
mk("Hastial de la casa", v, f, WHITE, T((-5.6, 6.2, 0)))
box("Puerta de la casa", (0.1, 1.9, 1.0), (-8.12, 3.95, 1.4), WOOD_DARK)
for z in (-1.4,):
    box("Ventana de la casa", (0.1, 1.0, 1.0), (-8.12, 4.8, z), WINDOW, tint=0)

PIECE["name"] = "lighthouseBeam"   # origen = centro de la linterna; gira en Y
for s in (-1, 1):
    v = [(0, 0.4, 0), (0, -0.4, 0), (s * 70, -4.0, 0), (s * 70, 4.0, 0)]
    mk("Haz", v, [(0, 1, 2, 3) if s > 0 else (0, 3, 2, 1)], BEAM, recalc=False, tint=0)
    v = [(0, 0, 0.4), (0, 0, -0.4), (s * 70, 0, -4.0), (s * 70, 0, 4.0)]
    mk("Haz cruzado", v, [(0, 1, 2, 3) if s > 0 else (0, 3, 2, 1)], BEAM, recalc=False, tint=0)

# ===========================================================================
# PÁRAMO · estanque helado, apacheta y observatorio
# ===========================================================================
PIECE["name"] = "frozenPond"
edge = []
for k in range(26):
    a = k / 26 * math.tau
    r = 16 * (1 + 0.12 * math.sin(k * 2.3) + 0.06 * math.cos(k * 5.1))
    edge.append((math.cos(a) * r, math.sin(a) * r))
v = [(0, 0.1, 0)] + [(x, 0.1, z) for x, z in edge]
mk("Hielo", v, [(0, (k + 1) % 26 + 1, k + 1) for k in range(26)], ICE, recalc=False, tint=0)
for k in range(9):
    a = k * 0.7
    pipe("Grieta", [(math.cos(a) * 2, 0.13, math.sin(a) * 2), (math.cos(a + 0.2) * 8, 0.13, math.sin(a + 0.2) * 8),
                    (math.cos(a - 0.1) * 13, 0.13, math.sin(a - 0.1) * 13)], 0.04, SNOW, sides=3, per=2)
for k, (x, z) in enumerate(edge):
    if k % 2 == 0:
        rock(f"Nieve de orilla {k}", (x * 1.06, 0.1, z * 1.06), (2.4, 0.7, 1.6), SNOW, seed=50 + k, squash=0.5)
# Apacheta: montículo de piedras apiladas.
for k in range(9):
    s_ = 1.4 - k * 0.14
    rock(f"Apacheta {k}", (19 + math.sin(k) * 0.2, 0.4 + k * 0.62, -9 + math.cos(k) * 0.2), (s_, 0.5, s_), ROCK_SNOW, seed=60 + k, squash=0.9)
# Observatorio: tambor de piedra, cúpula de cobre con ranura y telescopio.
OX, OZ = -20.0, 16.0
cyl("Tambor del observatorio", 4.2, 4.6, (OX, 2.3, OZ), STONE, seg=24)
lathe("Cúpula del observatorio", [(4.4, 4.6), (4.3, 5.8), (3.6, 7.4), (2.2, 8.6), (0.0001, 9.0)], (OX, 0, OZ), COPPER, seg=24, smooth_angle=0.4)
box("Ranura de la cúpula", (1.2, 4.6, 0.3), (OX + 1.2, 7.2, OZ - 3.1), IRON, rot=(0.6, 0.35, 0))
pipe("Telescopio", [(OX + 0.6, 6.4, OZ - 1.6), (OX + 1.7, 8.8, OZ - 4.2)], 0.38, BRASS, sides=12, per=2)
box("Puerta del observatorio", (1.3, 2.4, 0.2), (OX, 1.2, OZ + 4.2), WOOD_DARK)
box("Ventana del observatorio", (1.0, 0.9, 0.2), (OX - 3.0, 3.0, OZ + 3.0), WINDOW, rot=(0, -0.8, 0), tint=0)
lathe("Nieve sobre la cúpula", [(3.7, 7.3), (2.3, 8.55), (0.0001, 9.08)], (OX, 0.02, OZ), SNOW, seg=24)

# ===========================================================================
# EXPORTACIÓN
# ===========================================================================
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
PIECES = ["waterTower", "mill", "millWheel", "viaductSpan", "gorgeRiver", "tunnelHill", "cascade",
          "wagonWreck", "lighthouse", "lighthouseBeam", "frozenPond"]
PIVOTS = {"millWheel": Vector((-4.2, 3.4, 0)), "lighthouseBeam": Vector((0, 26.9, 0))}


def to_three(p):
    return (p.x, p.z, -p.y)


def harvest(piece):
    buckets = {}
    for ob in COL.objects:
        if ob.get("piece") != piece or ob.type != "MESH":
            continue
        ev = ob.evaluated_get(dg)
        me = ev.to_mesh()
        me.calc_loop_triangles()
        mw = ob.matrix_world
        nm = mw.to_3x3().inverted().transposed()
        tint = ob.get("tint", [1, 1, 1])
        for tri in me.loop_triangles:
            mat = ob.material_slots[tri.material_index].material
            kind = mat["kind"]
            base = mat.diffuse_color
            col = (round(base[0] * tint[0], 3), round(base[1] * tint[1], 3), round(base[2] * tint[2], 3))
            b = buckets.setdefault(kind, dict(kind=kind, position=[], normal=[], color=[], index=[], _k={}))
            for li in tri.loops:
                # Las piezas vivas se modelan ya en su origen: el pivote es solo su sitio en el padre.
                p = Vector(to_three(mw @ me.vertices[me.loops[li].vertex_index].co))
                n = Vector(to_three(nm @ me.corner_normals[li].vector)).normalized()
                key = (round(p.x, 2), round(p.y, 2), round(p.z, 2), round(n.x, 2), round(n.y, 2), round(n.z, 2), col)
                idx = b["_k"].get(key)
                if idx is None:
                    idx = len(b["position"]) // 3
                    b["_k"][key] = idx
                    b["position"] += key[0:3]
                    b["normal"] += key[3:6]
                    b["color"] += list(col)
                b["index"].append(idx)
        ev.to_mesh_clear()
    out = []
    for b in buckets.values():
        del b["_k"]
        out.append(b)
    return out


payload = dict(generator="Blender " + bpy.app.version_string,
               space="three · pieza local (y=0 pie, +x derecha de la vía)",
               pieces={name: harvest(name) for name in PIECES},
               pivots={k: list(v) for k, v in PIVOTS.items()},
               viaduct=dict(span=SPAN, left=X_L, right=X_R, depth=38.0))
path = DATA / "landmarks.json"
path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
tris = {k: sum(len(b["index"]) // 3 for b in v) for k, v in payload["pieces"].items()}
print(f"LANDMARKS_JSON {path.stat().st_size / 1e6:.2f} MB · {tris}")

for o in bpy.data.objects:
    o.select_set(o.name in COL.objects and o.get("piece") != "cutter")
bpy.ops.export_scene.gltf(filepath=str(ROOT / "landmarks.glb"), export_format="GLB", use_selection=True, export_apply=True)

# ===========================================================================
# RENDER: todas las piezas en fila
# ===========================================================================
if RENDER:
    LAYOUT = {"waterTower": (-150, 0), "mill": (-120, 0), "millWheel": (-120, 0), "cascade": (-85, 0),
              "wagonWreck": (-60, 0), "lighthouse": (-35, 0), "lighthouseBeam": (-35, 0), "frozenPond": (5, 0),
              "tunnelHill": (75, 0), "viaductSpan": (140, 40), "gorgeRiver": (140, 40)}
    for ob in list(COL.objects):
        piece = ob.get("piece")
        if piece in LAYOUT:
            dx, dy = LAYOUT[piece]
            if piece == "viaductSpan":
                for k in (-1, 1):
                    dup = ob.copy()
                    STAGE.objects.link(dup)
                    dup.matrix_world = Matrix.Translation(B((dx, dy, k * SPAN))) @ ob.matrix_world
            if piece in PIVOTS:
                ob.matrix_world = Matrix.Translation(B(PIVOTS[piece])) @ ob.matrix_world
            ob.matrix_world = Matrix.Translation(B((dx, dy, 0))) @ ob.matrix_world
    world = bpy.data.worlds.new("Cielo")
    scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    sky = nodes.new("ShaderNodeTexSky")
    sky.sky_type = "NISHITA"
    sky.sun_elevation = math.radians(30)
    world.node_tree.links.new(sky.outputs[0], nodes["Background"].inputs[0])
    nodes["Background"].inputs[1].default_value = 0.3
    bpy.ops.object.light_add(type="SUN")
    sun = bpy.context.object
    sun.data.energy = 3.0
    sun.rotation_euler = (math.radians(50), 0, math.radians(30))
    me = bpy.data.meshes.new("Suelo")
    me.from_pydata([B(p) for p in [(-400, -0.02, -400), (400, -0.02, -400), (400, -0.02, 400), (-400, -0.02, 400)]], [], [(0, 3, 2, 1)])
    ground = bpy.data.objects.new("Suelo", me)
    gm = bpy.data.materials.new("Pasto")
    gm.use_nodes = True
    gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*lin("#879258"), 1)
    me.materials.append(gm)
    STAGE.objects.link(ground)
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
        cd.clip_end = 3000
        scene.camera = cam
        scene.render.resolution_x, scene.render.resolution_y = w, h
        scene.render.filepath = str(ROOT / filename)
        bpy.ops.render.render(write_still=True)

    shoot("landmarks-valle-costa.png", (-95, 22, 60), (-95, 8, 0), 55, 1800, 900)
    shoot("landmarks-sierra-paramo.png", (70, 40, 110), (80, 5, 0), 55, 1800, 900)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "landmarks.blend"))
print("LANDMARKS_OK")
