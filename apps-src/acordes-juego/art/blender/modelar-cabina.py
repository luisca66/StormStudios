"""Cabina sci-fi de Batisfera — modelada con Blender 4.5 (bpy), diseño propio.

Dirección: BRIEF-CABINA-SCIFI.md + cabina-scifi-concepto-v1.png (aprobado por Luis).
Ventanal panorámico octagonal, pilares laterales con rendija de ventana lateral,
consolas inclinadas en las esquinas inferiores (sonar a la izquierda, datos a la
derecha) y consola central baja para las respuestas. Todo texto y dato es HTML.

Encuadre adaptable: la cabina se exporta en MÓDULOS anclados a bordes de pantalla.
El juego los coloca según el aspecto (Three.js, cámara de la cabina FOV vertical 60°):
  posición = (ax · mitadAncho · d, ay · H · d, −d)   con H = tan 30°
Los rieles superior e inferior se estiran solo en X (perfil extruido, sin remaches).
Cada módulo se autora en su espacio local (Y arriba, cámara mirando a −Z).

Ejecutar desde apps-src/acordes-juego:
  powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 art\\blender\\modelar-cabina.py
Variables: CAB_RENDER=0 omite el render Cycles; CAB_SAMPLES=n ajusta la calidad.
Salidas: cabina-scifi.blend / .glb / -pov.png y src/3d/assets/cabina-scifi.json
"""
import bpy
import json
import math
import os
import sys
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parent
GAME = ROOT.parent.parent
DATA = GAME / "src" / "3d" / "assets"
DATA.mkdir(parents=True, exist_ok=True)
RENDER = os.environ.get("CAB_RENDER", "1") != "0"
SAMPLES = int(os.environ.get("CAB_SAMPLES", "40"))

# Generadores compartidos (conversión Three↔Blender, cajas, tornos, tubos, remaches).
sys.path.insert(0, str(GAME.parent / "grados-mayores-juego" / "art" / "blender"))
import kit  # noqa: E402
from kit import B, T, lin, bevel, g_box, g_cyl, g_lathe, g_prism, combine, rivets, rounded_poly  # noqa: E402

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
CAB = bpy.data.collections.new("Cabina")
STAGE = bpy.data.collections.new("Solo render")
scene.collection.children.link(CAB)
scene.collection.children.link(STAGE)
kit.setup(CAB, 20260913)

H = math.tan(math.radians(30))  # media altura visible a distancia 1
P = 0.075      # ancho del pilar
HB = 0.105     # franja superior (≈9 % de la altura)
TCX, TCY = 0.12, 0.10    # chaflán superior
SILL = 0.277   # borde inferior del ventanal, medido desde abajo
BCX, BCY = 0.30, 0.20    # chaflán inferior

# ---------------------------------------------------------------------------
# Materiales (paleta del brief); el JSON guarda los parámetros PBR
# ---------------------------------------------------------------------------
MATS = {}


def material(key, name, hex_color, metal=0.0, rough=0.5, emit_hex=None, emit=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    color = lin(hex_color)
    m.diffuse_color = (*color, alpha)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Metallic"].default_value = metal
    p.inputs["Roughness"].default_value = rough
    if emit_hex:
        p.inputs["Emission Color"].default_value = (*lin(emit_hex), 1)
        p.inputs["Emission Strength"].default_value = emit
    if alpha < 1:
        # Degradado como en el juego: opaco en el borde del marco (uv.y = 0), nulo hacia dentro.
        nt = m.node_tree
        uvn = nt.nodes.new("ShaderNodeUVMap")
        sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.elements[0].color = (alpha, alpha, alpha, 1)
        ramp.color_ramp.elements[1].color = (0, 0, 0, 1)
        nt.links.new(uvn.outputs[0], sep.inputs[0])
        nt.links.new(sep.outputs["Y"], ramp.inputs["Fac"])
        nt.links.new(ramp.outputs[0], p.inputs["Alpha"])
        m.surface_render_method = "BLENDED"
    m["game"] = dict(key=key, color=hex_color, metalness=metal, roughness=rough,
                     emissive=emit_hex or "#000000", emissiveIntensity=emit)
    MATS[key] = m
    return m


PETROL = material("petrol", "Metal azul petróleo", "#142B35", 0.6, 0.46)
GRAPHITE = material("graphite", "Grafito", "#242C32", 0.45, 0.58)
STEEL = material("steel", "Acero satinado", "#65747A", 0.85, 0.32)
RUBBER = material("rubber", "Goma", "#101619", 0.0, 0.82)
SCREEN = material("screen", "Fondo de pantalla", "#03080B", 0.0, 0.7)
CYAN = material("cyan", "Luz cian", "#63DCE5", 0.0, 0.4, "#63DCE5", 2.4)
AMBER = material("amber", "Indicador ámbar", "#E9B66B", 0.0, 0.4, "#E9B66B", 1.8)
GLASS = material("glassEdge", "Reflejo de cristal", "#9FE3EA", 0.0, 0.05, None, 0.0, alpha=0.12)

# ---------------------------------------------------------------------------
# Módulos
# ---------------------------------------------------------------------------
MODULES = {}
CURRENT = {"name": None}


def module(name, anchor, depth, stretch_x=False, narrow=True):
    MODULES[name] = dict(name=name, anchor=list(anchor), depth=depth, stretchX=stretch_x,
                         narrow=narrow, screens={})
    CURRENT["name"] = name


def tag(ob):
    ob["module"] = CURRENT["name"]
    return ob


def make(name, verts, faces, mat, M=None, **kw):
    return tag(kit.make(name, verts, faces, mat, M, **kw))


def box(name, x0, x1, y0, y1, z0, z1, mat, bev=0.0035, M=None):
    v, f = g_box(x1 - x0, y1 - y0, z1 - z0)
    local = T(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    ob = make(name, v, f, mat, (M @ local) if M is not None else local)
    return bevel(ob, bev, 2) if bev else ob


def plate(name, outline, z0, z1, mat, bev=0.004, M=None):
    v, f = g_prism(outline, z1 - z0)
    local = T((0, 0, (z0 + z1) / 2))
    ob = make(name, v, f, mat, (M @ local) if M is not None else local, smooth_angle=0.5)
    return bevel(ob, bev, 2) if bev else ob


def bar(name, p0, p1, width, z0, z1, mat, bev=0.002, M=None):
    """Listón recto en el plano XY entre dos puntos."""
    a, b = Vector((*p0, 0)), Vector((*p1, 0))
    d = b - a
    ang = math.atan2(d.y, d.x)
    mid = (a + b) / 2
    v, f = g_box(d.length, width, z1 - z0)
    local = T((mid.x, mid.y, (z0 + z1) / 2), (0, 0, ang))
    ob = make(name, v, f, mat, (M @ local) if M is not None else local)
    return bevel(ob, bev, 1) if bev else ob


def extrude_x(name, profile, x0, x1, mat, bev=0.003):
    """Perfil (y, z) extruido a lo largo de X: se puede estirar en X sin deformarse."""
    n = len(profile)
    v = [(x0, y, z) for y, z in profile] + [(x1, y, z) for y, z in profile]
    f = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    f.append(tuple(reversed(range(n))))
    f.append(tuple(range(n, 2 * n)))
    ob = make(name, v, f, mat, smooth_angle=0.5)
    return bevel(ob, bev, 2) if bev else ob


def glass_strip(name, p0, p1, inward, width=0.05, z=-0.012, M=None):
    """Reflejo del cristal pegado al borde del marco: uv.y = 0 en el borde, 1 hacia dentro."""
    a, b = Vector(p0), Vector(p1)
    n = Vector(inward).normalized() * width
    verts = [(a.x, a.y, z), (b.x, b.y, z), (b.x + n.x, b.y + n.y, z), (a.x + n.x, a.y + n.y, z)]
    uvs = [(0, 0), (1, 0), (1, 1), (0, 1)]
    return make(name, verts, [(0, 1, 2, 3)], GLASS, M, part="glass", uvs=uvs, recalc=False, tint=0)


def bolts(name, spots, r=0.0065, z=0.0, M=None):
    M = M if M is not None else Matrix.Identity(4)
    pts = [(tuple(M @ Vector((x, y, z))), tuple((M.to_3x3() @ Vector((0, 0, 1))).normalized())) for x, y in spots]
    return tag(rivets(name, pts, r, STEEL))


def knob(name, x, y, z, r, M):
    prof = [(r * 1.25, 0), (r * 1.25, r * 0.12), (r, r * 0.2), (r, r * 0.55), (r * 0.96, r * 0.62),
            (r * 0.96, r * 0.8), (r * 0.7, r * 0.95), (0.0001, r * 0.98)]
    v, f = g_lathe(prof, 28)
    ob = make(name, v, f, RUBBER, M @ T((x, y, z), (math.pi / 2, 0, 0)), smooth_angle=0.9)
    ring_v, ring_f = g_lathe([(r * 1.02, r * 0.52), (r * 1.06, r * 0.56), (r * 1.06, r * 0.64), (r * 1.02, r * 0.66)], 28)
    make(name + " aro", ring_v, ring_f, STEEL, M @ T((x, y, z), (math.pi / 2, 0, 0)))
    box(name + " marca", x - 0.0018, x + 0.0018, y + r * 0.35, y + r * 0.9, z + r * 0.95, z + r * 1.0, CYAN, 0, M)
    return ob


def toggle(name, x, y, z, M, up=True):
    box(name + " base", x - 0.011, x + 0.011, y - 0.016, y + 0.016, z, z + 0.006, GRAPHITE, 0.0015, M)
    v, f = g_cyl(0.0022, 0.0032, 0.024, 10)
    tilt = -0.45 if up else 0.45
    make(name + " palanca", v, f, STEEL, M @ T((x, y, z + 0.006), (math.pi / 2 + tilt, 0, 0)) @ T((0, 0.012, 0)))


def lamp(name, x, y, z, w, h, mat, M):
    box(name + " carcasa", x - w / 2 - 0.004, x + w / 2 + 0.004, y - h / 2 - 0.004, y + h / 2 + 0.004, z, z + 0.005, GRAPHITE, 0.0015, M)
    box(name, x - w / 2, x + w / 2, y - h / 2, y + h / 2, z + 0.005, z + 0.0075, mat, 0.001, M)


def grille(name, x0, x1, y0, y1, z, M, slats=6):
    box(name + " marco", x0, x1, y0, y1, z, z + 0.004, GRAPHITE, 0.0015, M)
    step = (y1 - y0) / slats
    for i in range(slats):
        yy = y0 + step * (i + 0.5)
        box(f"{name} lama {i}", x0 + 0.006, x1 - 0.006, yy - step * 0.22, yy + step * 0.22, z + 0.004, z + 0.007, RUBBER, 0, M)


def cable(name, points, r, M=None):
    M = M if M is not None else Matrix.Identity(4)
    return tag(kit.pipe(name, [tuple(M @ Vector(p)) for p in points], r, RUBBER, sides=8, per=6))


# ===========================================================================
# 1. Riel superior (ancla arriba-centro, se estira en X)
# ===========================================================================
module("railTop", (0, 1), 1.0, stretch_x=True)
extrude_x("Riel superior", [(0.07, -0.03), (0.07, 0.014), (-HB + 0.014, 0.014), (-HB, 0.002), (-HB, -0.03)], -0.5, 0.5, PETROL)
extrude_x("Canal del riel", [(-0.036, 0.014), (-0.036, 0.017), (-0.05, 0.017), (-0.05, 0.014)], -0.5, 0.5, GRAPHITE, 0)
extrude_x("Moldura del riel", [(-HB + 0.018, 0.014), (-HB + 0.018, 0.019), (-HB + 0.006, 0.019), (-HB + 0.006, 0.014)], -0.5, 0.5, STEEL, 0.001)
glass_strip("Reflejo superior", (-0.5, -HB), (0.5, -HB), (0, -1), 0.05)

# ===========================================================================
# 2. Placa central superior (ancla arriba-centro)
# ===========================================================================
module("header", (0, 1), 1.0)
plate("Placa BTH", [(-0.29, 0.03), (0.29, 0.03), (0.29, -0.075), (0.235, -0.128), (-0.235, -0.128), (-0.29, -0.075)],
      0.0, 0.03, PETROL, 0.005)
plate("Panel empotrado", [(-0.2, -0.045), (0.2, -0.045), (0.18, -0.105), (-0.18, -0.105)], 0.03, 0.036, GRAPHITE, 0.002)
box("Barra de luz superior", -0.14, 0.14, -0.024, -0.014, 0.03, 0.037, CYAN, 0.001)
box("Canal de luz", -0.15, 0.15, -0.028, -0.01, 0.028, 0.032, RUBBER, 0.001)
for sx in (-1, 1):
    box(f"Soporte placa {sx}", sx * 0.33 - 0.035, sx * 0.33 + 0.035, -0.06, 0.03, -0.004, 0.024, GRAPHITE, 0.003)
    bar(f"Diagonal placa {sx}", (sx * 0.29, -0.075), (sx * 0.235, -0.128), 0.006, 0.03, 0.036, STEEL)
    for i in range(3):
        box(f"Ranura soporte {sx}{i}", sx * 0.33 - 0.022, sx * 0.33 + 0.022, -0.045 + i * 0.022, -0.038 + i * 0.022,
            0.024, 0.027, RUBBER, 0)
bolts("Tornillos placa", [(-0.265, 0.012), (0.265, 0.012), (-0.215, -0.108), (0.215, -0.108),
                          (-0.265, -0.06), (0.265, -0.06)], 0.006, 0.03)

# ===========================================================================
# 3. Esquinas superiores + pilares (ancla arriba-izq / arriba-der)
# ===========================================================================


def corner(side):
    """side = −1 izquierda, +1 derecha. Se autora con x hacia dentro = +x·(−side)."""
    name = "cornerL" if side < 0 else "cornerR"
    module(name, (side, 1), 1.0)
    s = -side  # s·x apunta hacia el centro de la pantalla
    X = lambda x: s * x  # noqa: E731
    # Pilar: poste exterior + poste interior; la rendija entre ambos deja ver el agua.
    box("Poste exterior", *sorted((X(-0.08), X(0.012))), -3.0, 0.07, -0.03, 0.012, PETROL, 0.004)
    box("Poste interior", *sorted((X(0.03), X(P))), -3.0, 0.07, -0.03, 0.018, PETROL, 0.004)
    box("Fondo de rendija", *sorted((X(0.008), X(0.034))), -3.0, 0.07, -0.045, -0.036, GRAPHITE, 0)
    box("Canal de luz del pilar", *sorted((X(0.043), X(0.062))), -0.64, -0.34, 0.017, 0.022, RUBBER, 0.0015)
    box("Luz del pilar", *sorted((X(0.048), X(0.057))), -0.63, -0.35, 0.021, 0.025, CYAN, 0.001)
    # Chaflán superior
    outline = [(X(-0.08), 0.07), (X(P + TCX + 0.06), 0.07), (X(P + TCX + 0.06), -HB), (X(P + TCX), -HB),
               (X(P), -HB - TCY), (X(P), -HB - TCY - 0.04), (X(-0.08), -HB - TCY - 0.04)]
    if s < 0:
        outline.reverse()
    plate("Chaflán superior", outline, -0.03, 0.02, PETROL, 0.005)
    bar("Moldura del chaflán", (X(P + TCX), -HB + 0.004), (X(P - 0.003), -HB - TCY), 0.008, 0.02, 0.026, STEEL)
    glass_strip("Reflejo chaflán", (X(P + TCX), -HB), (X(P), -HB - TCY), (s * 0.64, -0.77), 0.05)
    glass_strip("Reflejo pilar", (X(P), -HB - TCY), (X(P), -3.0), (s, 0), 0.045)
    # Luces ámbar del marco, remaches y cable sujeto al pilar
    lamp("Ámbar del riel", X(P + TCX + 0.1), -0.045, 0.014, 0.034, 0.009, AMBER, Matrix.Identity(4))
    lamp("Ámbar del chaflán", X(0.028), -0.06, 0.02, 0.009, 0.03, AMBER, Matrix.Identity(4))
    bolts("Tornillos chaflán", [(X(0.012), 0.03), (X(0.1), 0.03), (X(0.19), 0.03), (X(0.012), -0.16), (X(0.052), -0.13)], 0.0055, 0.02)
    bolts("Tornillos pilar", [(X(0.064), -0.26 - i * 0.12) for i in range(8) if not -0.66 < -0.26 - i * 0.12 < -0.33] +
          [(X(-0.02), -0.3 - i * 0.14) for i in range(7)], 0.005, 0.018)
    for i, y in enumerate((-0.2, -0.46, -0.72)):
        box(f"Abrazadera {i}", *sorted((X(-0.052), X(-0.014))), y - 0.008, y + 0.008, 0.012, 0.03, STEEL, 0.002)
    cable("Cable del pilar", [(X(-0.033), 0.08, 0.02), (X(-0.033), -0.2, 0.022), (X(-0.035), -0.46, 0.024),
                              (X(-0.031), -0.72, 0.022), (X(-0.03), -1.1, 0.02)], 0.0065)
    cable("Cable secundario", [(X(-0.06), 0.08, 0.016), (X(-0.058), -0.3, 0.018), (X(-0.07), -0.6, 0.02),
                               (X(-0.075), -1.1, 0.02)], 0.0045)


corner(-1)
corner(1)

# ===========================================================================
# 4. Riel inferior (ancla abajo-centro, se estira en X)
# ===========================================================================
module("railSill", (0, -1), 1.0, stretch_x=True)
extrude_x("Riel inferior", [(-0.07, -0.03), (-0.07, 0.014), (SILL - 0.014, 0.014), (SILL, 0.002), (SILL, -0.03)], -0.5, 0.5, PETROL)
extrude_x("Moldura inferior", [(SILL - 0.018, 0.014), (SILL - 0.018, 0.019), (SILL - 0.006, 0.019), (SILL - 0.006, 0.014)],
          -0.5, 0.5, STEEL, 0.001)
for y in (0.2, 0.12):
    extrude_x(f"Canal inferior {y}", [(y, 0.014), (y, 0.017), (y - 0.012, 0.017), (y - 0.012, 0.014)], -0.5, 0.5, GRAPHITE, 0)
glass_strip("Reflejo inferior", (-0.5, SILL), (0.5, SILL), (0, 1), 0.05)

# ===========================================================================
# 5. Chaflanes inferiores (ancla abajo-izq / abajo-der)
# ===========================================================================


def lower_chamfer(side):
    name = "chamferL" if side < 0 else "chamferR"
    module(name, (side, -1), 1.0)
    s = -side
    X = lambda x: s * x  # noqa: E731
    top = SILL + BCY
    outline = [(X(-0.08), -0.08), (X(P + BCX + 0.07), -0.08), (X(P + BCX + 0.07), SILL), (X(P + BCX), SILL),
               (X(P), top), (X(-0.08), top)]
    if s < 0:
        outline.reverse()
    plate("Chaflán inferior", outline, -0.03, 0.026, PETROL, 0.005)
    bar("Moldura chaflán inferior", (X(P - 0.003), top), (X(P + BCX), SILL - 0.004), 0.008, 0.026, 0.032, STEEL)
    glass_strip("Reflejo chaflán inferior", (X(P), top), (X(P + BCX), SILL), (s * 0.55, 0.83), 0.05)
    bolts("Tornillos chaflán inferior", [(X(0.03), top - 0.03), (X(0.12), SILL + 0.1), (X(0.24), SILL + 0.02),
                                         (X(0.03), 0.12), (X(0.2), 0.12), (X(0.34), 0.12)], 0.0055, 0.026)
    grille("Rejilla del chaflán", *sorted((X(0.08), X(0.3))), 0.16, 0.24, 0.026, Matrix.Identity(4), 5)


lower_chamfer(-1)
lower_chamfer(1)

# ===========================================================================
# 6. Consolas laterales inclinadas (ancla abajo-izq / abajo-der, d = 0.86)
# ===========================================================================
TILT = -0.32


def side_console(side):
    left = side < 0
    name = "consoleL" if left else "consoleR"
    module(name, (side, -1), 0.86, narrow=False)
    s = -side
    X = lambda x: s * x  # noqa: E731
    M = T((0, 0, 0), (TILT, 0, 0))
    outline = [(X(-0.1), -0.1), (X(0.41), -0.1), (X(0.455), 0.05), (X(0.43), 0.25), (X(0.35), 0.315), (X(-0.1), 0.315)]
    if s < 0:
        outline.reverse()
    plate("Cuerpo de consola", outline, -0.07, 0.0, PETROL, 0.007, M)
    inner = [(X(-0.02), -0.03), (X(0.33), -0.03), (X(0.33), 0.295), (X(-0.02), 0.295)]
    if s < 0:
        inner.reverse()
    plate("Panel de instrumentos", inner, 0.0, 0.006, GRAPHITE, 0.003, M)
    bar("Moldura superior de consola", (X(0.35), 0.316), (X(0.431), 0.251), 0.007, -0.004, 0.008, STEEL, 0.0015, M)
    bar("Moldura de canto", (X(0.431), 0.251), (X(0.456), 0.05), 0.007, -0.004, 0.008, STEEL, 0.0015, M)

    # Pantalla: marco levantado + fondo oscuro; el HTML real se coloca encima.
    if left:
        sx0, sx1, sy0, sy1 = 0.035, 0.285, 0.035, 0.28
    else:
        sx0, sx1, sy0, sy1 = 0.03, 0.305, 0.03, 0.285
    outer = rounded_poly([(X(sx0 - 0.014), sy0 - 0.014), (X(sx1 + 0.014), sy0 - 0.014),
                          (X(sx1 + 0.014), sy1 + 0.014), (X(sx0 - 0.014), sy1 + 0.014)], 0.016, 3)
    screen = rounded_poly([(X(sx0), sy0), (X(sx1), sy0), (X(sx1), sy1), (X(sx0), sy1)], 0.01, 3)
    if s < 0:
        outer.reverse()
        screen.reverse()
    outer2 = [(p[0], p[1]) for p in outer]
    screen2 = [(p[0], p[1]) for p in screen]
    plate("Bisel de pantalla", outer2, 0.006, 0.016, GRAPHITE, 0.003, M)
    plate("Pantalla", screen2, 0.016, 0.0175, SCREEN, 0, M)
    corners = [M @ Vector((X(x), y, 0.018)) for x, y in ((sx0, sy0), (sx1, sy0), (sx1, sy1), (sx0, sy1))]
    MODULES[name]["screens"]["sonar" if left else "stats"] = [[round(c.x, 5), round(c.y, 5), round(c.z, 5)] for c in corners]
    bolts("Tornillos de pantalla", [(X(sx0 - 0.007), sy0 - 0.007), (X(sx1 + 0.007), sy0 - 0.007),
                                    (X(sx0 - 0.007), sy1 + 0.007), (X(sx1 + 0.007), sy1 + 0.007)], 0.0042, 0.016, M)

    # Controles en la columna exterior de la pantalla (hacia el centro).
    cx = sx1 + 0.058
    if left:
        knob("Perilla del sonar", X(cx), 0.215, 0.006, 0.026, M)
        toggle("Interruptor A", X(cx - 0.017), 0.105, 0.006, M, True)
        toggle("Interruptor B", X(cx + 0.017), 0.105, 0.006, M, False)
        lamp("Ámbar consola", X(cx - 0.02), 0.04, 0.006, 0.011, 0.011, AMBER, M)
        lamp("Cian consola", X(cx + 0.02), 0.04, 0.006, 0.011, 0.011, CYAN, M)
    else:
        for i, y in enumerate((0.25, 0.185, 0.12)):
            box(f"Botón {i}", X(cx) - 0.014, X(cx) + 0.014, y - 0.02, y + 0.02, 0.006, 0.016, RUBBER, 0.003, M)
            lamp(f"Luz botón {i}", X(cx), y + 0.009, 0.016, 0.014, 0.005, AMBER if i == 0 else CYAN, M)
        knob("Perilla de datos", X(cx), 0.05, 0.006, 0.018, M)
    grille("Rejilla de consola", *sorted((X(sx0 + 0.02), X(sx1 - 0.02))), -0.085, -0.03, 0.0, M, 4)
    # Asa sujeta al canto interior, como en el concepto.
    ax = 0.405
    for y in (0.07, 0.22):
        box(f"Soporte asa {y}", X(ax) - 0.007, X(ax) + 0.007, y - 0.007, y + 0.007, 0.0, 0.03, STEEL, 0.002, M)
    kit.KIT["collection"] = CAB
    tag(kit.pipe("Asa", [tuple(M @ Vector(p)) for p in ((X(ax), 0.06, 0.028), (X(ax), 0.14, 0.036), (X(ax), 0.23, 0.028))],
                 0.0075, STEEL, sides=10, per=6))
    bolts("Tornillos de consola", [(X(-0.005), 0.3), (X(0.34), 0.3), (X(0.43), 0.04), (X(0.35), -0.02)], 0.0055, 0.006, M)


side_console(-1)
side_console(1)

# ===========================================================================
# 7. Consola central baja (ancla abajo-centro, d = 0.9) — base de las respuestas
# ===========================================================================
module("consoleC", (0, -1), 0.9)
MC = T((0, 0, 0), (-0.42, 0, 0))
plate("Consola central", [(-0.43, -0.1), (0.43, -0.1), (0.37, 0.19), (-0.37, 0.19)], -0.07, 0.0, PETROL, 0.007, MC)
plate("Tapa central", [(-0.3, -0.02), (0.3, -0.02), (0.27, 0.165), (-0.27, 0.165)], 0.0, 0.008, GRAPHITE, 0.003, MC)
plate("Hueco de respuestas", [(-0.26, 0.0), (0.26, 0.0), (0.24, 0.15), (-0.24, 0.15)], 0.008, 0.0095, SCREEN, 0, MC)
box("Luz de consola", -0.2, 0.2, 0.168, 0.173, 0.008, 0.012, CYAN, 0.001, MC)
bar("Moldura central", (-0.37, 0.192), (0.37, 0.192), 0.008, -0.004, 0.008, STEEL, 0.0015, MC)
MODULES["consoleC"]["screens"]["answers"] = [[round(c.x, 5), round(c.y, 5), round(c.z, 5)] for c in
                                             (MC @ Vector((x, y, 0.01)) for x, y in ((-0.26, 0.0), (0.26, 0.0), (0.24, 0.15), (-0.24, 0.15)))]
for sx in (-1, 1):
    grille(f"Rejilla central {sx}", *sorted((sx * 0.3, sx * 0.39)), 0.0, 0.12, 0.0, MC, 6)
    lamp(f"Ámbar central {sx}", sx * 0.345, 0.155, 0.0, 0.02, 0.008, AMBER, MC)
bolts("Tornillos central", [(-0.28, 0.155), (0.28, 0.155), (-0.29, -0.01), (0.29, -0.01)], 0.005, 0.008, MC)

# ===========================================================================
# EXPORTACIÓN AL JUEGO: geometría evaluada por módulo y material
# ===========================================================================
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()


def to_three(p):
    return (p.x, p.z, -p.y)


def harvest(objs):
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
                p = to_three(mw @ me.vertices[me.loops[li].vertex_index].co)
                n = Vector(to_three(nm @ me.corner_normals[li].vector)).normalized()
                t = tuple(uv.data[li].uv) if uv else (0.0, 0.0)
                k = (round(p[0], 4), round(p[1], 4), round(p[2], 4), round(n.x, 3), round(n.y, 3), round(n.z, 3),
                     round(t[0], 3), round(t[1], 3), round(tint[0], 3))
                idx = b["_lookup"].get(k)
                if idx is None:
                    idx = len(b["position"]) // 3
                    b["_lookup"][k] = idx
                    b["position"] += k[0:3]
                    b["normal"] += k[3:6]
                    b["uv"] += k[6:8]
                    b["color"].append(k[8])
                b["index"].append(idx)
        ev.to_mesh_clear()
    out = []
    for b in buckets.values():
        del b["_lookup"]
        if b["material"] != "glassEdge":
            del b["uv"]
        out.append(b)
    return out


tris = 0
for name, mod in MODULES.items():
    mod["meshes"] = harvest([o for o in CAB.objects if o.get("module") == name and o.type == "MESH"])
    tris += sum(len(m["index"]) // 3 for m in mod["meshes"])

payload = dict(
    generator="Blender " + bpy.app.version_string,
    space="three · cámara de cabina en el origen mirando a −Z · FOV vertical 60°",
    layout=dict(H=round(H, 6), refHalfWidth=1.03, narrowAspect=1.1),
    materials=[m["game"].to_dict() for m in MATS.values()],
    modules=list(MODULES.values()),
)
json_path = DATA / "cabina-scifi.json"
json_path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
print(f"CABINA_JSON {json_path.stat().st_size / 1e6:.2f} MB · {tris} triángulos · {len(MODULES)} módulos · "
      f"{len(MATS)} materiales")

# ===========================================================================
# Encuadre de referencia 16:9 (mismo cálculo que src/3d/cockpit.ts) para GLB y render
# ===========================================================================
ASPECT = 16 / 9


def layout_matrix(mod, aspect):
    half_w = H * aspect
    k = max(0.45, min(1.0, half_w / 1.03))
    ax, ay = mod["anchor"]
    d = mod["depth"]
    pos = Vector((ax * half_w * d, ay * H * d, -d))
    if mod["stretchX"]:
        scale = (2 * half_w * d + 0.3, k, k)
    else:
        scale = (k, k, k)
    return T(tuple(pos), (0, 0, 0), scale)


for name, mod in MODULES.items():
    empty = bpy.data.objects.new("Módulo " + name, None)
    CAB.objects.link(empty)
    c3b = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
    empty.matrix_world = c3b @ layout_matrix(mod, ASPECT) @ c3b.inverted()
    for o in CAB.objects:
        if o.get("module") == name and o.type == "MESH":
            o.parent = empty

for o in bpy.data.objects:
    o.select_set(o.name in CAB.objects)
bpy.ops.export_scene.gltf(filepath=str(ROOT / "cabina-scifi.glb"), export_format="GLB",
                          use_selection=True, export_apply=True)

# ===========================================================================
# RENDER desde el asiento del piloto (misma cámara que el juego, 16:9)
# ===========================================================================
if RENDER:
    world = bpy.data.worlds.new("Agua")
    scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    nodes["Background"].inputs[0].default_value = (*lin("#0f5068"), 1)
    nodes["Background"].inputs[1].default_value = 1.0

    def light(kind, pos, energy, color, size=0.05, rot=None):
        data = bpy.data.lights.new(kind + str(pos), kind)
        data.energy = energy
        data.color = color
        if kind == "AREA":
            data.size = size
        elif kind == "POINT":
            data.shadow_soft_size = size
        ob = bpy.data.objects.new(data.name, data)
        STAGE.objects.link(ob)
        ob.location = B(pos)
        if rot:
            ob.rotation_euler = rot
        return ob

    half_w = H * ASPECT
    light("AREA", (0, 0.45, 0.3), 16, (0.82, 0.93, 1.0), 1.4, (math.radians(55), 0, 0))
    for sx in (-1, 1):
        light("POINT", (sx * (half_w - 0.12), -0.1, -0.85), 3.0, lin("#63DCE5"), 0.03)
        light("POINT", (sx * (half_w * 0.86 - 0.3), -0.36, -0.7), 0.8, lin("#E9B66B"), 0.03)

    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = True
    scene.view_settings.view_transform = "AgX"
    scene.render.film_transparent = False

    cam_data = bpy.data.cameras.new("Piloto")
    cam = bpy.data.objects.new("Piloto", cam_data)
    STAGE.objects.link(cam)
    cam.location = (0, 0, 0)
    cam.rotation_euler = (math.radians(90), 0, 0)  # mira a −Z de Three (= +Y de Blender)
    cam_data.sensor_fit = "VERTICAL"
    cam_data.angle_y = math.radians(60)
    cam_data.clip_start = 0.05
    scene.camera = cam
    scene.render.resolution_x, scene.render.resolution_y = 1600, 900
    scene.render.filepath = str(ROOT / "cabina-scifi-pov.png")
    bpy.ops.render.render(write_still=True)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "cabina-scifi.blend"))
print("CABINA_OK")
