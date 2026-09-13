"""Tren de carga que se cruza — locomotora de vapor hermana de la cabina, ténder y tres
vagones (caja de madera, góndola con carbón, cisterna). Modelado con Blender 4.5 (bpy).

Espacio LOCAL de cada pieza en Three: Y arriba, y = 0 a la altura del riel, +Z = hacia
donde AVANZA el convoy (en crossing-train.ts la base es right · up · −tangente). Los
rieles quedan en x = ±0.8.

Materiales: para un objeto que pasa en segundos, el color va horneado en vertex colors y
cada pieza se fusiona en solo tres clases (pintura · metal · farol). Partes vivas: ruedas
motrices (instanciadas, giran), ruedas del bogie delantero y las bielas laterales.

Ejecutar:  powershell -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 art\\blender\\modelar-tren-carga.py
Variables: TREN_RENDER=0 omite el render; TREN_SAMPLES=n ajusta Cycles.
Salidas: tren-carga.blend / .glb / -vista.png y src/3d/assets/tren-carga.json
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
from kit import (KIT, B, T, lin, make, bevel, g_box, g_cyl, g_lathe, g_torus, g_prism,  # noqa: E402
                 combine, rounded_poly, setup)
from kit import pipe as kit_pipe, rivets as kit_rivets  # noqa: E402

GAME = ROOT.parent.parent
DATA = GAME / "src" / "3d" / "assets"
DATA.mkdir(parents=True, exist_ok=True)
RENDER = os.environ.get("TREN_RENDER", "1") != "0"
SAMPLES = int(os.environ.get("TREN_SAMPLES", "48"))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
TRAIN = bpy.data.collections.new("Tren de carga")
STAGE = bpy.data.collections.new("Solo render")
scene.collection.children.link(TRAIN)
scene.collection.children.link(STAGE)
setup(TRAIN, 20260914)

# ---------------------------------------------------------------------------
# Materiales: color (hex) + clase de exportación
# ---------------------------------------------------------------------------
MATS = {}


def material(key, hex_color, kind="paint", metal=0.0, rough=0.6, emit=0.0):
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


OXBLOOD = material("oxblood", "#7a3527")
BLACK = material("black", "#202124", rough=0.55)
SMOKE = material("smokebox", "#2a2a2c", rough=0.8)
RED = material("wheelRed", "#9a2e22", rough=0.5)
BRASS = material("brass", "#c9a227", "metal", 1.0, 0.3)
STEEL = material("steel", "#9a9da2", "metal", 0.9, 0.35)
IRON = material("iron", "#3a3a3e", "metal", 0.6, 0.55)
LAMP = material("lamp", "#ffd98a", "lamp", emit=4.0)
WOOD = material("boxcar", "#8a4630", rough=0.85)
PLANK = material("plank", "#6b3524", rough=0.9)
ROOF = material("roof", "#3b3836", rough=0.8)
GREEN = material("gondola", "#4d5a48", rough=0.8)
COAL = material("coal", "#19191b", rough=0.4)
TANK = material("tank", "#8e9296", "metal", 0.55, 0.45)
WALK = material("walk", "#5b4a3a", rough=0.9)
TIRE = material("tire", "#4a4c50", "metal", 0.6, 0.6)


def tag(ob, piece):
    ob["piece"] = piece
    return ob


PIECE = {"name": "loco"}


def mk(name, verts, faces, mat, M=None, **kw):
    return tag(make(name, verts, faces, mat, M, **kw), PIECE["name"])


def pipe(*args, **kw):
    return tag(kit_pipe(*args, **kw), PIECE["name"])


def rivets(*args, **kw):
    return tag(kit_rivets(*args, **kw), PIECE["name"])


def box(name, size, pos, mat, rot=(0, 0, 0), bev=0.0, **kw):
    v, f = g_box(*size)
    ob = mk(name, v, f, mat, T(pos, rot), **kw)
    if bev:
        bevel(ob, bev)
    return ob


def cyl(name, r, h, pos, mat, rot=(0, 0, 0), seg=24, r2=None, **kw):
    v, f = g_cyl(r, r if r2 is None else r2, h, seg)
    return mk(name, v, f, mat, T(pos, rot), **kw)


def lathe(name, profile, pos, mat, rot=(0, 0, 0), seg=32, **kw):
    v, f = g_lathe(profile, seg)
    return mk(name, v, f, mat, T(pos, rot), **kw)


AXIS_Z = (math.pi / 2, 0, 0)   # cilindro con eje a lo largo de Z (la marcha)
AXIS_X = (0, 0, math.pi / 2)   # cilindro con eje a lo largo de X (ejes de rueda)

# ===========================================================================
# RUEDAS (geometría única en el origen; eje de giro = X local, cara exterior +X)
# ===========================================================================
DRIVER_R = 0.78
PONY_R = 0.45
CRANK = 0.3


def wheel(piece, radius, spokes, crank):
    PIECE["name"] = piece
    rim = [(radius * 0.8, -0.07), (radius, -0.07), (radius, 0.05), (radius * 1.07, 0.07),
           (radius * 1.07, 0.1), (radius * 0.8, 0.1)]
    v, f = g_lathe([(r, y) for r, y in rim] + [rim[0]], 40)
    mk("Llanta", v, f, TIRE, T((0, 0, 0), (0, 0, -math.pi / 2)), smooth_angle=0.5, tint=0)
    v, f = g_lathe([(radius * 0.8, -0.06), (radius * 0.72, -0.06), (radius * 0.72, 0.06), (radius * 0.8, 0.06),
                    (radius * 0.8, -0.06)], 40)
    mk("Aro", v, f, RED, T((0, 0, 0), (0, 0, -math.pi / 2)), smooth_angle=0.5, tint=0)
    parts = []
    for k in range(spokes):
        sv, sf = g_box(0.06, radius * 0.62, 0.07)
        parts.append((sv, sf, T((0, 0, 0), (k / spokes * math.tau, 0, 0)) @ T((0, radius * 0.42, 0))))
    hv, hf = g_cyl(radius * 0.2, radius * 0.2, 0.16, 20)
    parts.append((hv, hf, T((0, 0, 0), AXIS_X)))
    v, f = combine(parts)
    mk("Rayos y cubo", v, f, RED, smooth_angle=0.4, tint=0)
    if crank:
        # Contrapeso opuesto al muñón (el muñón queda ARRIBA con giro 0).
        arc = [(math.cos(a) * radius * 0.7, math.sin(a) * radius * 0.7) for a in
               [math.radians(-150 + k * 120 / 10) for k in range(11)]]
        inner = [(math.cos(a) * radius * 0.25, math.sin(a) * radius * 0.25) for a in
                 [math.radians(-150 + k * 120 / 10) for k in reversed(range(11))]]
        v, f = g_prism([(-z, y) for z, y in arc + inner], 0.05)
        mk("Contrapeso", v, f, BLACK, T((0.05, 0, 0), (0, math.pi / 2, 0)), tint=0)
        cyl("Muñón", 0.07, 0.2, (0.1, CRANK, 0), STEEL, AXIS_X, 14, tint=0)
        cyl("Tapa del cubo", radius * 0.13, 0.08, (0.1, 0, 0), BRASS, AXIS_X, 16, tint=0)


wheel("driver", DRIVER_R, 14, True)
wheel("pony", PONY_R, 8, False)

# ===========================================================================
# LOCOMOTORA (z de −4.4 a +4.8)
# ===========================================================================
PIECE["name"] = "loco"
BOILER_Y, BOILER_R = 2.35, 0.85
# Bastidor, travesaño delantero y quitapiedras.
for sx in (-0.6, 0.6):
    box("Larguero", (0.12, 0.42, 7.9), (sx, 1.12, 0.05), BLACK)
box("Travesaño delantero", (2.8, 0.45, 0.16), (0, 1.0, 3.92), RED, bev=0.02)
for k in range(9):
    x = -1.1 + k * 0.275
    box("Barra del quitapiedras", (0.07, 0.07, 1.25), (x * 0.55 + x * 0.45 * 0.0, 0.45, 4.35), RED,
        rot=(-0.62, math.atan2(-x * 0.45, 1.25), 0))
box("Arista del quitapiedras", (2.4, 0.08, 0.1), (0, 0.8, 3.98), RED)
box("Enganche delantero", (0.25, 0.22, 0.4), (0, 0.9, 4.15), IRON)

# Cilindros, guías y vástagos.
for s in (-1, 1):
    cyl("Cilindro", 0.38, 1.05, (s * 1.25, 1.2, 3.2), BLACK, AXIS_Z, 28)
    for z in (2.66, 3.74):
        cyl("Tapa de cilindro", 0.4, 0.06, (s * 1.25, 1.2, z), BRASS, AXIS_Z, 28, tint=0)
    box("Cofre de vapor", (0.5, 0.35, 0.95), (s * 1.2, 1.72, 3.2), BLACK, bev=0.03)
    for dy in (-0.1, 0.1):
        box("Guía de cruceta", (0.05, 0.05, 1.3), (s * 1.02, 0.78 + dy, 2.0), STEEL)
    cyl("Vástago", 0.045, 1.0, (s * 1.02, 0.78, 2.2), STEEL, AXIS_Z, 10)
    # Estribo y plataforma de marcha con canto de latón.
    box("Plataforma", (0.46, 0.06, 5.3), (s * 1.3, 1.58, 1.05), BLACK)
    box("Canto de plataforma", (0.03, 0.08, 5.3), (s * 1.54, 1.58, 1.05), BRASS, tint=0)

# Caldera, caja de humos, flejes y puerta.
cyl("Caldera", BOILER_R, 4.3, (0, BOILER_Y, 0.55), BLACK, AXIS_Z, 48, smooth_angle=0.3)
cyl("Caja de humos", 0.93, 1.05, (0, BOILER_Y, 3.2), SMOKE, AXIS_Z, 48, smooth_angle=0.3)
lathe("Puerta de caja de humos", [(0.0001, 0.12), (0.5, 0.1), (0.8, 0.05), (0.93, 0.0)], (0, BOILER_Y, 3.72), SMOKE, AXIS_Z, 40)
v, f = g_torus(0.93, 0.035, 48, 6)
mk("Aro de la puerta", v, f, BRASS, T((0, BOILER_Y, 3.72)), smooth_angle=1.2, tint=0)
v, f = g_torus(0.28, 0.035, 28, 6)
mk("Placa de número", v, f, BRASS, T((0, BOILER_Y + 0.25, 3.86)), smooth_angle=1.2, tint=0)
for z in (2.3, 1.0, -0.4, -1.45):
    v, f = g_torus(BOILER_R + 0.015, 0.025, 48, 6)
    mk("Fleje de latón", v, f, BRASS, T((0, BOILER_Y, z)), smooth_angle=1.2, tint=0)
rivets("Remaches de caja de humos", [((math.cos(a) * 0.94, BOILER_Y + math.sin(a) * 0.94, 2.72), (math.cos(a), math.sin(a), 0))
                                     for a in [k / 30 * math.tau for k in range(30)]], 0.03, SMOKE)

# Chimenea de diamante, campana, domo de vapor, domo de arena, silbato.
lathe("Chimenea de diamante", [(0.26, 2.9), (0.24, 3.25), (0.24, 3.9), (0.58, 4.45), (0.62, 4.55),
                               (0.36, 5.0), (0.3, 5.1), (0.0001, 5.1)], (0, 0, 3.2), BLACK, seg=28, smooth_angle=0.5)
v, f = g_torus(0.25, 0.03, 24, 6)
mk("Collar de la chimenea", v, f, BRASS, T((0, 3.6, 3.2), (math.pi / 2, 0, 0)), tint=0)
lathe("Domo de vapor", [(0.48, 2.95), (0.48, 3.45), (0.44, 3.62), (0.3, 3.78), (0.0001, 3.82)], (0, 0, 1.25), BRASS, seg=32, tint=0)
lathe("Domo de arena", [(0.36, 2.95), (0.36, 3.35), (0.3, 3.48), (0.0001, 3.52)], (0, 0, -0.55), OXBLOOD, seg=28)
v, f = g_torus(0.36, 0.03, 28, 6)
mk("Aro del domo de arena", v, f, BRASS, T((0, 3.35, -0.55), (math.pi / 2, 0, 0)), tint=0)
lathe("Campana", [(0.0001, 3.78), (0.08, 3.76), (0.13, 3.62), (0.16, 3.45), (0.22, 3.36), (0.22, 3.32)], (0, 0, 2.2), BRASS, seg=24, tint=0)
box("Yugo de la campana", (0.5, 0.35, 0.06), (0, 3.4, 2.2), IRON)
lathe("Silbato", [(0.06, 3.2), (0.06, 3.5), (0.09, 3.55), (0.09, 3.75), (0.03, 3.85), (0.0001, 3.86)], (0, 0, -1.3), BRASS, seg=16, tint=0)

# Farol de cabeza: caja negra con bisel de latón y lente encendida.
box("Caja del farol", (0.72, 0.62, 0.62), (0, 3.62, 3.45), BLACK, bev=0.03)
box("Techo del farol", (0.82, 0.08, 0.72), (0, 3.97, 3.45), BLACK)
v, f = g_torus(0.25, 0.04, 28, 6)
mk("Bisel del farol", v, f, BRASS, T((0, 3.62, 3.77)), tint=0)
v, f = g_cyl(0.23, 0.23, 0.04, 28)
mk("Lente del farol", v, f, LAMP, T((0, 3.62, 3.76), AXIS_Z), tint=0)
box("Base del farol", (0.4, 0.3, 0.4), (0, 3.2, 3.45), BLACK)

# Pasamanos de latón a lo largo de la caldera.
for s in (-1, 1):
    pipe("Pasamanos de caldera", [(s * 0.98, 2.75, 3.4), (s * 0.98, 2.75, -1.5)], 0.03, BRASS, sides=8, per=2)
    for z in (3.0, 1.6, 0.2, -1.2):
        box("Candelero", (0.14, 0.04, 0.04), (s * 0.91, 2.72, z), BRASS, tint=0)
tag_count = len(TRAIN.objects)

# Cabina rojo óxido (hermana de la nuestra): caja, ventanillas, techo arqueado.
CAB_Z0, CAB_Z1 = -3.95, -1.55
box("Frente de cabina", (2.9, 2.45, 0.08), (0, 2.75, CAB_Z1), OXBLOOD, bev=0.02)
for s in (-1, 1):
    box("Costado bajo de cabina", (0.08, 1.05, CAB_Z1 - CAB_Z0), (s * 1.45, 2.05, (CAB_Z0 + CAB_Z1) / 2), OXBLOOD)
    box("Poste delantero", (0.08, 1.4, 0.35), (s * 1.45, 3.28, CAB_Z1 - 0.17), OXBLOOD)
    box("Poste trasero", (0.08, 1.4, 0.5), (s * 1.45, 3.28, CAB_Z0 + 0.25), OXBLOOD)
    box("Poste central", (0.08, 1.4, 0.18), (s * 1.45, 3.28, -2.75), OXBLOOD)
    box("Dintel de cabina", (0.08, 0.2, CAB_Z1 - CAB_Z0), (s * 1.45, 3.88, (CAB_Z0 + CAB_Z1) / 2), OXBLOOD)
    for z0, z1 in ((-2.66, -1.9), (-3.62, -2.84)):
        outer = rounded_poly([(z0 - 0.05, 2.6), (z1 + 0.05, 2.6), (z1 + 0.05, 3.83), (z0 - 0.05, 3.83)], 0.06, 3)
        inner = rounded_poly([(z0, 2.65), (z1, 2.65), (z1, 3.78), (z0, 3.78)], 0.04, 3)
        v, f = [], []
        from kit import g_ring_prism
        v, f = g_ring_prism(outer, inner, 0.05)
        mk("Marco de ventanilla", v, f, BRASS, T((s * 1.49, 0, 0), (0, -math.pi / 2, 0)), tint=0)
    v, f = g_torus(0.22, 0.03, 24, 6)
    mk("Placa del número", v, f, BRASS, T((s * 1.5, 2.1, -2.75), (0, math.pi / 2, 0)), tint=0)
    box("Estribo", (0.35, 0.05, 0.4), (s * 1.45, 0.95, CAB_Z0 + 0.3), IRON)
    pipe("Asidero", [(s * 1.52, 1.2, CAB_Z0 + 0.05), (s * 1.52, 2.9, CAB_Z0 + 0.05)], 0.025, BRASS, sides=8, per=2)
box("Piso de cabina", (2.9, 0.1, CAB_Z1 - CAB_Z0), (0, 1.55, (CAB_Z0 + CAB_Z1) / 2), BLACK)
roof = [(math.cos(a) * 1.62, 3.98 + math.sin(a) * 0.32) for a in [math.pi * k / 16 for k in range(17)]]
v, f = g_prism(roof, CAB_Z1 - CAB_Z0 + 0.6)
mk("Techo de cabina", v, f, BLACK, T((0, 0, (CAB_Z0 + CAB_Z1) / 2)))
# Número 7 en latón a los dos lados.
for s in (-1, 1):
    bpy.ops.object.text_add()
    txt = bpy.context.object
    txt.data.body = "7"
    txt.data.align_x = "CENTER"
    txt.data.align_y = "CENTER"
    txt.data.size = 0.3
    txt.data.extrude = 0.012
    bpy.context.collection.objects.unlink(txt)
    TRAIN.objects.link(txt)
    M = T((s * 1.52, 2.1, -2.75), (0, s * math.pi / 2, 0))
    txt.matrix_world = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1))) @ M
    txt.data.materials.append(BRASS)
    txt["piece"] = "loco"
    txt["tint"] = [1, 1, 1]

# Ejes de referencia de las partes vivas.
DRIVERS = [(s * 0.8, DRIVER_R, z) for z in (1.35, -0.3, -1.95) for s in (-1, 1)]
PONIES = [(s * 0.8, PONY_R, z) for z in (3.25,) for s in (-1, 1)]
for s in (-1, 1):
    # Bielas: se autoran a la altura del eje; en el juego se desplazan con el muñón.
    PIECE["name"] = "rodR" if s > 0 else "rodL"
    x = s * 1.0
    box("Biela de acoplamiento", (0.07, 0.14, 3.3), (x, DRIVER_R, -0.3), STEEL, bev=0.01)
    for z in (1.35, -0.3, -1.95):
        cyl("Ojo de biela", 0.11, 0.09, (x, DRIVER_R, z), STEEL, AXIS_X, 16)
PIECE["name"] = "loco"

# ===========================================================================
# BOGIE DE CARGA (reutilizado por ténder y vagones): bastidor de arco + 2 ejes
# ===========================================================================


def bogie(z0):
    parts_black, parts_steel, parts_red = [], [], []
    for s in (-1, 1):
        fv, ff = g_box(0.1, 0.18, 2.0)
        parts_black.append((fv, ff, T((s * 0.95, 0.55, z0))))
        av, af = g_box(0.08, 0.1, 1.2)
        parts_black.append((av, af, T((s * 0.95, 0.72, z0))))
        for dz in (-0.7, 0.7):
            sv, sf = g_box(0.08, 0.35, 0.12)
            parts_black.append((sv, sf, T((s * 0.95, 0.6, z0 + dz))))
    tv, tf = g_box(1.9, 0.18, 0.35)
    parts_black.append((tv, tf, T((0, 0.78, z0))))
    for dz in (-0.7, 0.7):
        for s in (-1, 1):
            wv, wf = g_cyl(PONY_R, PONY_R, 0.12, 18)
            parts_steel.append((wv, wf, T((s * 0.8, PONY_R, z0 + dz), AXIS_X)))
            hv, hf = g_cyl(0.14, 0.14, 0.14, 12)
            parts_red.append((hv, hf, T((s * 0.8, PONY_R, z0 + dz), AXIS_X)))
    for mat, parts in ((IRON, parts_black), (TIRE, parts_steel), (BLACK, parts_red)):
        v, f = combine(parts)
        mk("Bogie", v, f, mat, smooth_angle=0.5, tint=0.03)


def coal_heap(name, x_half, z_half, y0, height, zc=0.0, lumps=90):
    rows, cols = 12, 9
    hv, hf = [], []
    for r in range(rows):
        z = zc - z_half + r / (rows - 1) * 2 * z_half
        for c in range(cols):
            x = -x_half + c / (cols - 1) * 2 * x_half
            edge = min(1.0, (z_half - abs(z - zc)) / 0.8) * (1 - (x / (x_half * 1.15)) ** 2)
            hv.append((x, y0 + height * max(0.0, edge) + KIT["rng"].uniform(-0.04, 0.04), z))
    for r in range(rows - 1):
        for c in range(cols - 1):
            a, b = r * cols + c, r * cols + c + 1
            hf.append((a, a + cols, b + cols, b))
    mk(name, hv, hf, COAL, recalc=False, smooth_angle=1.0, tint=0.1)


# ===========================================================================
# TÉNDER (z de −3.1 a 3.1)
# ===========================================================================
PIECE["name"] = "tender"
box("Bastidor del ténder", (2.6, 0.3, 6.2), (0, 1.05, 0), BLACK)
box("Caja del ténder", (2.84, 1.9, 5.9), (0, 2.15, -0.05), OXBLOOD, bev=0.04)
for y in (1.25, 3.08):
    box("Fleje del ténder", (2.9, 0.07, 5.96), (0, y, -0.05), BRASS, tint=0)
for s in (-1, 1):
    rivets("Remaches del ténder", [((s * 1.43, 2.95, z), (s, 0, 0)) for z in [-2.9 + k * 0.29 for k in range(21)]], 0.028, OXBLOOD)
    v, f = g_torus(0.24, 0.03, 24, 6)
    mk("Medallón del ténder", v, f, BRASS, T((s * 1.43, 2.15, 0), (0, math.pi / 2, 0)), tint=0)
coal_heap("Carbón del ténder", 1.35, 1.9, 3.05, 0.55, zc=0.9)
box("Caja de herramientas", (2.4, 0.4, 0.6), (0, 3.3, -2.55), BLACK, bev=0.03)
for s in (-1, 1):
    pipe("Escalera trasera", [(s * 0.45, 1.3, -3.02), (s * 0.45, 3.2, -3.02)], 0.025, IRON, sides=6, per=2)
for k in range(5):
    box("Peldaño", (0.9, 0.04, 0.04), (0, 1.5 + k * 0.38, -3.02), IRON)
bogie(1.75)
bogie(-1.75)

# ===========================================================================
# VAGONES (z de −4.3 a 4.3)
# ===========================================================================


def wagon_base():
    box("Bastidor", (2.7, 0.26, 8.6), (0, 1.08, 0), BLACK)
    for z in (-4.35, 4.35):
        box("Enganche", (0.25, 0.22, 0.3), (0, 0.95, z), IRON)
        box("Topera", (2.8, 0.3, 0.12), (0, 1.05, z * 0.99), BLACK)
    bogie(2.9)
    bogie(-2.9)


PIECE["name"] = "boxcar"
wagon_base()
box("Caja", (2.84, 2.5, 8.5), (0, 2.5, 0), WOOD, bev=0.03)
for s in (-1, 1):
    x = s * 1.425
    for k in range(29):
        z = -4.2 + k * 0.3
        if abs(z) < 0.95:
            continue
        box("Junta de tabla", (0.012, 2.4, 0.025), (x, 2.5, z), PLANK, tint=0.02)
    # Refuerzos en Z de hierro y postes.
    for z in (-4.15, -2.1, 2.1, 4.15):
        box("Poste de hierro", (0.03, 2.5, 0.1), (x + s * 0.015, 2.5, z), IRON, tint=0)
    for z0, z1 in ((-4.1, -2.15), (2.15, 4.1)):
        length = math.hypot(z1 - z0, 2.3)
        box("Tirante diagonal", (0.03, length, 0.08), (x + s * 0.015, 2.5, (z0 + z1) / 2), IRON,
            rot=(math.atan2(z1 - z0, 2.3) * (1 if z0 < 0 else -1), 0, 0), tint=0)
    # Puerta corrediza con rieles.
    box("Puerta", (0.05, 2.3, 1.9), (x + s * 0.04, 2.45, 0), PLANK, bev=0.01)
    for dz in (-0.5, 0.5):
        box("Travesaño de puerta", (0.03, 0.08, 1.8), (x + s * 0.07, 2.45 + dz * 1.4, 0), IRON, tint=0)
    for y in (1.25, 3.72):
        box("Riel de puerta", (0.05, 0.06, 4.0), (x + s * 0.06, y, 0), IRON, tint=0)
    box("Manija de puerta", (0.05, 0.3, 0.05), (x + s * 0.08, 2.4, 0.8), STEEL, tint=0)
roof = [(math.cos(a) * 1.55, 3.7 + math.sin(a) * 0.25) for a in [math.pi * k / 12 for k in range(13)]]
v, f = g_prism(roof, 8.7)
mk("Techo del vagón", v, f, ROOF)
box("Pasarela del techo", (0.5, 0.05, 8.7), (0, 3.98, 0), WALK)
for z in (-4.3, 4.3):
    for s in (-1, 1):
        pipe("Escalera de esquina", [(s * 1.3, 1.3, z * 1.005), (s * 1.3, 3.6, z * 1.005)], 0.02, IRON, sides=6, per=2)

PIECE["name"] = "gondola"
wagon_base()
box("Piso de góndola", (2.84, 0.12, 8.5), (0, 1.28, 0), GREEN)
for s in (-1, 1):
    box("Pared de góndola", (0.08, 1.1, 8.5), (s * 1.4, 1.85, 0), GREEN, bev=0.015)
    for k in range(10):
        box("Costilla", (0.06, 1.1, 0.1), (s * 1.46, 1.85, -4.05 + k * 0.9), IRON, tint=0)
for z in (-4.2, 4.2):
    box("Testero", (2.84, 1.1, 0.08), (0, 1.85, z), GREEN, bev=0.015)
coal_heap("Carbón de la góndola", 1.32, 4.1, 2.2, 0.6)

PIECE["name"] = "tank"
wagon_base()
box("Plataforma de cisterna", (2.9, 0.08, 8.6), (0, 1.3, 0), WALK)
cyl("Cisterna", 1.12, 7.6, (0, 2.55, 0), TANK, AXIS_Z, 40, smooth_angle=0.3)
for z, sign in ((3.8, 1), (-3.8, -1)):
    lathe("Casquete", [(1.12, 0), (1.05, 0.22), (0.7, 0.42), (0.0001, 0.5)], (0, 2.55, z), TANK,
          (sign * math.pi / 2, 0, 0), seg=40)
for z in (-2.6, 0.0, 2.6):
    v, f = g_torus(1.13, 0.03, 40, 6)
    mk("Fleje de cisterna", v, f, IRON, T((0, 2.55, z)), smooth_angle=1.2, tint=0)
lathe("Domo de carga", [(0.45, 3.4), (0.45, 3.9), (0.38, 4.0), (0.0001, 4.05)], (0, 0, 0), TANK, seg=28)
for s in (-1, 1):
    pipe("Barandal de cisterna", [(s * 1.35, 1.9, -3.9), (s * 1.35, 1.9, 3.9)], 0.025, IRON, sides=6, per=2)

# ===========================================================================
# EXPORTACIÓN
# ===========================================================================
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()


def to_three(p):
    return (p.x, p.z, -p.y)


def harvest(piece):
    buckets = {}
    for ob in TRAIN.objects:
        if ob.get("piece") != piece or ob.get("part") == "preview":
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
                p = to_three(mw @ me.vertices[me.loops[li].vertex_index].co)
                n = Vector(to_three(nm @ me.corner_normals[li].vector)).normalized()
                key = (round(p[0], 3), round(p[1], 3), round(p[2], 3), round(n.x, 2), round(n.y, 2), round(n.z, 2), col)
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


PIECES = ["loco", "tender", "boxcar", "gondola", "tank", "driver", "pony", "rodL", "rodR"]
payload = dict(
    generator="Blender " + bpy.app.version_string,
    space="three · pieza local (y=0 riel, +z = marcha)",
    pieces={name: harvest(name) for name in PIECES},
    lengths=dict(loco=9.4, tender=6.2, wagon=8.6),
    drivers=[list(p) for p in DRIVERS],
    ponies=[list(p) for p in PONIES],
    driverRadius=DRIVER_R, ponyRadius=PONY_R, crank=CRANK,
)
path = DATA / "tren-carga.json"
path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
tris = {k: sum(len(b["index"]) // 3 for b in v) for k, v in payload["pieces"].items()}
print(f"TREN_JSON {path.stat().st_size / 1e6:.2f} MB · triángulos {tris}")

# ===========================================================================
# ESCENA DE RENDER: convoy completo sobre la vía (copias colocadas solo para verlo)
# ===========================================================================
LAYOUT = [("loco", 0.0), ("tender", -8.2), ("boxcar", -16.0), ("gondola", -25.0), ("tank", -34.0)]
root_objs = [o for o in TRAIN.objects]
for piece, z in LAYOUT:
    for ob in root_objs:
        if ob.get("piece") == piece and z != 0.0:
            ob.matrix_world = Matrix.Translation(B((0, 0, z))) @ ob.matrix_world
for piece, positions, radius in (("driver", DRIVERS, DRIVER_R), ("pony", PONIES, PONY_R)):
    src = [o for o in root_objs if o.get("piece") == piece]
    for (x, y, z) in positions:
        for ob in src:
            dup = ob.copy()
            dup.data = ob.data
            dup["part"] = "preview"
            dup["piece"] = "preview"
            STAGE.objects.link(dup)
            flip = Matrix.Rotation(math.pi, 4, "Z") if x < 0 else Matrix.Identity(4)
            dup.matrix_world = Matrix.Translation(B((x, y, z))) @ flip @ ob.matrix_world
    for ob in src:
        ob.hide_render = True
for ob in root_objs:
    if ob.get("piece") in ("rodL", "rodR"):
        ob.matrix_world = Matrix.Translation(B((0, CRANK, 0))) @ ob.matrix_world

for o in bpy.data.objects:
    o.select_set(o.name in TRAIN.objects or o.name in STAGE.objects)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "tren-carga.glb"), export_format="GLB", use_selection=True, export_apply=True)

if RENDER:
    world = bpy.data.worlds.new("Cielo")
    scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    sky = nodes.new("ShaderNodeTexSky")
    sky.sky_type = "NISHITA"
    sky.sun_elevation = math.radians(35)
    sky.sun_rotation = math.radians(120)
    world.node_tree.links.new(sky.outputs[0], nodes["Background"].inputs[0])
    nodes["Background"].inputs[1].default_value = 0.25

    def stage(name, verts, faces, hex_color, M):
        me = bpy.data.meshes.new(name)
        me.from_pydata([B(M @ Vector(p)) for p in verts], [], faces)
        ob = bpy.data.objects.new(name, me)
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*lin(hex_color), 1)
        me.materials.append(m)
        STAGE.objects.link(ob)

    stage("Suelo", *g_box(400, 0.1, 400), "#6f8a45", T((0, -0.5, 0)))
    stage("Balasto", *g_box(4.0, 0.3, 120), "#77716a", T((0, -0.3, -10)))
    for x in (-0.8, 0.8):
        stage("Riel", *g_box(0.1, 0.14, 120), "#8a8378", T((x, -0.07, -10)))
    for k in range(70):
        stage("Durmiente", *g_box(2.4, 0.12, 0.25), "#4a3a2b", T((0, -0.16, 12 - k * 1.2)))
    bpy.ops.object.light_add(type="SUN")
    sun = bpy.context.object
    sun.data.energy = 3.5
    sun.rotation_euler = (math.radians(55), 0, math.radians(35))
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = True
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.exposure = -0.2

    def shoot(filename, pos, target, fov, w, h):
        cd = bpy.data.cameras.new(filename)
        cam = bpy.data.objects.new(filename, cd)
        STAGE.objects.link(cam)
        cam.location = B(pos)
        cam.rotation_euler = (B(target) - B(pos)).to_track_quat("-Z", "Y").to_euler()
        cd.sensor_fit = "VERTICAL"
        cd.angle_y = math.radians(fov)
        scene.camera = cam
        scene.render.resolution_x, scene.render.resolution_y = w, h
        scene.render.filepath = str(ROOT / filename)
        bpy.ops.render.render(write_still=True)

    shoot("tren-carga-vista.png", (9.5, 3.4, 9.0), (0, 2.0, -6.0), 38, 1600, 900)
    shoot("tren-carga-loco.png", (6.2, 2.6, 6.8), (0, 2.2, 0.2), 40, 1400, 1000)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "tren-carga.blend"))
print("TREN_OK")
