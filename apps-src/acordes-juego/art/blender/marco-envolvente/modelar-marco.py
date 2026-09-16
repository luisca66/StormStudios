import bpy
import json
import math
import os
import sys
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parent
GAME = ROOT.parents[2]
DATA = ROOT

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

for ob in list(CAB.objects):
    if not ob.get("module", "").startswith("console"):
        bpy.data.objects.remove(ob, do_unlink=True)
MODULES = {n:m for n,m in MODULES.items() if n.startswith("console")}

# Coordenadas proyectivas: x=u*d, y=v*H*d, z=1-d.
# layout screenSpace: pos=(0,0,-1), scale=(H*aspect,1,1).
# La profundidad cambia continuamente hacia el lateral, sin costuras.
def frame_module(name, narrow=False, wide=True):
    module(name, (0,0), 1, narrow=narrow)
    MODULES[name].update(screenSpace=True, wide=wide)

def depth(u):
    return 0.90 - 0.10 * max(0, min(1, (abs(u)-0.67)/0.33))

def projected(u,v,z=0):
    d=depth(u)+0.22*max(0,min(1,-v/0.40))
    return (u*d, v*H*d, 1-d+z)

def ribbon(name, pts, width, mat, thickness=0.018):
    # Ancho en coordenadas de pantalla, caras redondeadas por bisel.
    left=[]; right=[]
    for i,p in enumerate(pts):
        a=Vector(pts[max(0,i-1)]); b=Vector(pts[min(len(pts)-1,i+1)])
        t=(b-a).normalized(); n=Vector((-t.y,t.x))*width/2
        left.append(Vector(p)+n); right.append(Vector(p)-n)
    outline=left+list(reversed(right)); n=len(outline)
    front=0.005 if mat in (CYAN,STEEL) else (0.002 if mat==GRAPHITE else 0)
    verts=[projected(p.x,p.y,z+front) for z in (-thickness,0) for p in outline]
    faces=[tuple(reversed(range(n)))]+[(n+i,n+i+1,2*n-2-i,2*n-1-i) for i in range(len(left)-1)]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    ob=make(name,verts,faces,mat)
    bevel(ob,0.0018,3)
    ob.modifiers.new("Normales de superficie","WEIGHTED_NORMAL")
    return ob

def halo(name, pts, inward, width=0.032):
    for i,(a,b) in enumerate(zip(pts,pts[1:])):
        n=Vector(inward).normalized()*width
        verts=[projected(*a,-0.006),projected(*b,-0.006),
               projected(b[0]+n.x,b[1]+n.y,-0.006),projected(a[0]+n.x,a[1]+n.y,-0.006)]
        make(name+str(i),verts,[(0,1,2,3)],GLASS,uvs=[(0,0),(1,0),(1,1),(0,1)],recalc=False,tint=0)

def trim(name, pts, inward):
    ribbon(name+" casco",pts,0.044,PETROL)
    ribbon(name+" junta",pts,0.012,RUBBER,0.002)
    offset=[(x+inward[0]*0.015,y+inward[1]*0.015) for x,y in pts]
    ribbon(name+" acero",offset,0.005,STEEL,0.002)
    halo(name+" cristal",offset,inward)

frame_module("railTopC")
trim("Dintel frontal",[(-0.675,0.91),(0,0.935),(0.675,0.91)],(0,-1))
# Sin letras: placa pequeña para HTML opcional.
ribbon("Placa central",[(-0.10,0.951),(0.10,0.951)],0.068,GRAPHITE)
ribbon("Luz de dintel",[(-0.07,0.923),(0.07,0.923)],0.006,CYAN,0.003)

frame_module("sillC")
trim("Alféizar frontal",[(-0.68,-0.62),(0,-0.62),(0.68,-0.62)],(0,1))
for s,label in [(-1,"L"),(1,"R")]:
    frame_module("pillar"+label)
    # Ancho 0.04 NDC = 2 % del ancho total. Inclinación en profundidad.
    pts=[(s*0.67,0.925),(s*0.67,0.56),(s*0.67,-0.25),(s*0.67,-0.65)]
    ribbon("Pilar "+label,pts,0.040,PETROL,0.035)
    ribbon("Nervio "+label,[(s*0.670,0.84),(s*0.670,-0.57)],0.011,GRAPHITE,0.005)
    for direction in [-1,1]:
        halo("Vidrio pilar "+label+str(direction),[(s*0.67+direction*0.022,0.88),(s*0.67+direction*0.022,-0.62)],(direction,0),0.026)
    ribbon("Tira cian "+label,[(s*0.661,0.35),(s*0.661,-0.16)],0.004,CYAN,0.003)
    cable("Cable articulado "+label,[projected(s*(0.678+off),v,0.012) for off,v in [(0,0.86),(0.003,0.72),(0.002,0.3),(0.002,-0.3),(0,-0.56)]],0.003)
    for v in [0.85,0.57,-0.29,-0.57]:
        ribbon("Collar "+label+str(v),[(s*0.652,v),(s*0.688,v)],0.024,GRAPHITE,0.022)
        p=projected(s*0.67,v,0.025)
        bolts("Fijación "+label+str(v),[(p[0],p[1])],0.0032,p[2])
    p=projected(s*0.67,0.74,0.025)
    lamp("Testigo "+label,p[0],p[1],p[2],0.006,0.010,AMBER,Matrix.Identity(4))
    frame_module("railTop"+label)
    top=[(s*0.665,0.916),(s*0.82,0.83),(s*1.035,0.68)]
    trim("Techo lateral "+label,top,(0,-1))
    frame_module("edge"+label)
    trim("Cierre exterior "+label,[(s*1.012,0.72),(s*1.012,-0.91)],(-s,0))
    frame_module("sill"+label)
    trim("Alféizar lateral "+label,[(s*0.665,-0.62),(s*0.82,-0.76),(s*1.035,-0.88)],(0,1))

frame_module("frameNarrow",narrow=True,wide=False)
trim("Estrecho superior",[(-1.04,0.86),(0,0.96),(1.04,0.86)],(0,-1))
trim("Estrecho inferior",[(-1.04,-0.89),(1.04,-0.89)],(0,1))
for s in [-1,1]:
    trim("Estrecho canto"+str(s),[(s*1.012,0.9),(s*1.012,-0.93)],(-s,0))

# Cerrar la zona situada fuera del vidrio hasta más allá de la pantalla.
def roof_fill(name, pts):
    outline=pts+[(pts[-1][0],1.12),(pts[0][0],1.12)]
    n=len(outline)
    verts=[projected(u,v,z) for z in (-.02,-.002) for u,v in outline]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    bevel(make(name,verts,faces,PETROL),.0018,3)
CURRENT["name"]="railTopC"
roof_fill("Corona frontal",[(-.68,.922),(0,.947),(.68,.922)])
for s,label in [(-1,"L"),(1,"R")]:
    CURRENT["name"]="railTop"+label
    roof_fill("Corona lateral "+label,[(s*.665,.928),(s*.82,.842),(s*1.06,.675)])
CURRENT["name"]="frameNarrow"
roof_fill("Corona estrecha",[(-1.06,.872),(0,.972),(1.06,.872)])


# V4: detalle aditivo, proyectado dentro de las siluetas aprobadas.
# Estas funciones solo generan vértices; NO cambian layout_matrix ni projected.
def detail_point(u,v,relief=0):
    relief += .12 if CURRENT["name"]=="frameNarrow" and v>.8 else 0
    d=1-projected(u,v)[2]-relief
    return (u*d,v*H*d,1-d)

def detail_panel(name,outline,mat=PETROL,relief=.012,thickness=.018):
    n=len(outline)
    verts=[detail_point(u,v,r) for r in (relief-thickness,relief) for u,v in outline]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    ob=make(name,verts,faces,mat)
    bevel(ob,.0012,2)
    ob.modifiers.new("Normales panel","WEIGHTED_NORMAL")
    return ob

def rect(name,u0,u1,v0,v1,mat=PETROL,relief=.012,thickness=.018):
    return detail_panel(name,[(u0,v0),(u1,v0),(u1,v1),(u0,v1)],mat,relief,thickness)

def detail_grille(name,u,v,w,h,relief=.025):
    rect(name+" marco",u-w/2,u+w/2,v-h/2,v+h/2,GRAPHITE,relief)
    for i in range(5):
        y=v-h*.37+i*h*.185
        rect(name+" lama "+str(i),u-w*.41,u+w*.41,y-.002,y+.002,RUBBER,relief+.002,.003)

def detail_disk(name,u,v,ru,rv,mat,relief):
    # Lente torneada con 32 segmentos y anillo biselado, sin facetas visibles.
    rings=[(.90,relief-.006),(1,relief-.003),(1,relief),(.85,relief+.002)]
    verts=[detail_point(u+ru*r*math.cos(i*math.tau/32),v+rv*r*math.sin(i*math.tau/32),z)
           for r,z in rings for i in range(32)]
    faces=[tuple(reversed(range(32)))]
    for j in range(3):
        faces += [(j*32+i,j*32+(i+1)%32,(j+1)*32+(i+1)%32,(j+1)*32+i) for i in range(32)]
    faces.append(tuple(range(96,128)))
    return make(name,verts,faces,mat,smooth_angle=.9)

def recessed_light(name,u,v,mat):
    detail_disk(name+" alojamiento",u,v,.016,.024,GRAPHITE,.060)
    detail_disk(name+" aro",u,v,.012,.018,STEEL,.066)
    detail_disk(name+" lente",u,v,.008,.012,mat,.069)

def roof_detail(name,xs,edge,lights):
    for i,(a,b) in enumerate(zip(xs,xs[1:])):
        lo,hi=sorted((a,b)); gap=.006
        detail_panel(name+" panel "+str(i),[(lo+gap,edge(lo)+.025),(hi-gap,edge(hi)+.025),
                     (hi-gap,1.105),(lo+gap,1.105)],PETROL,.014,.027)
    for i,u in enumerate(xs[1:-1]):
        # Costilla de sección escalonada enteramente sobre el dintel.
        detail_panel(name+" costilla "+str(i),[(u-.010,edge(u)+.026),(u+.010,edge(u)+.026),
                     (u+.010,1.1),(u-.010,1.1)],GRAPHITE,.038,.05)
        rect(name+" nervio "+str(i),u-.0025,u+.0025,edge(u)+.034,1.10,STEEL,.04,.004)
    for i,u in enumerate(lights):
        recessed_light(name+" foco "+str(i),u,edge(u)+.052,CYAN if i==0 else AMBER)

CURRENT["name"]="railTopC"
roof_detail("Frontal",[-.665,-.49,-.28,-.115,.115,.28,.49,.665],
            lambda u:.935-.025*abs(u)/.675,[-.39,.39])
for side,label in [(-1,"L"),(1,"R")]:
    CURRENT["name"]="railTop"+label
    edge=lambda u:.916-(abs(u)-.665)*(.236/.37)
    roof_detail("Lateral "+label,[side*x for x in [.675,.79,.90,1.04]],edge,[side*.765,side*.94])
    detail_grille("Ventilación techo "+label,side*.875,.982,.052,.04,.035)

# frameNarrow: mismo vocabulario, cuatro paneles y dos focos.
CURRENT["name"]="frameNarrow"
roof_detail("Estrecho",[-1.04,-.52,0,.52,1.04],lambda u:.96-.1*abs(u)/1.04,[-.70,.70])

# Pilares: retirar solo la tira continua; todos los cantos v3 permanecen.
for ob in list(CAB.objects):
    if ob.name.startswith("Tira cian "):
        bpy.data.objects.remove(ob,do_unlink=True)
for side,label in [(-1,"L"),(1,"R")]:
    CURRENT["name"]="pillar"+label
    x=side*.670
    # Espina profunda: proyección confinada al interior del perfil aprobado.
    rect("Espina profunda "+label,x-.010,x+.010,-.56,.88,GRAPHITE,.021,.080)
    for i in range(5):
        a=.35-i*.105
        rect("Tira cian segmentada "+label+str(i),side*.661-.002,side*.661+.002,a-.082,a,CYAN,.027,.006)
    for i,y in enumerate([.70,.43]):
        rect("Caja conexión "+label+str(i),x-.011,x+.011,y-.049,y+.049,GRAPHITE,.038,.04)
        rect("Tapa conexión "+label+str(i),x-.0085,x+.0085,y-.037,y+.037,PETROL,.043,.010)
        rect("Junta conexión "+label+str(i),x-.007,x+.007,y-.015,y-.011,RUBBER,.046,.003)
    # Cables con salida curva a cajas, sin sobrepasar la anchura del pilar.
    pts=[detail_point(side*(.679+off),y,.046) for off,y in
         [(0,.84),(-.002,.78),(-.002,.65),(.002,.60),(.002,.25),(.001,-.30),(0,-.52)]]
    cable("Mazo sujeto "+label,pts,.0024)
    for i,y in enumerate([.81,.60,.25,-.08,-.34]):
        rect("Abrazadera mazo "+label+str(i),side*.679-.005,side*.679+.005,y-.010,y+.010,STEEL,.050,.008)
        for u in [x-.007,x+.007]:
            pp=detail_point(u,y,.054)
            bolts("Remache pilar "+label+str(i),[(pp[0],pp[1])],.0018,pp[2])

# Paneles inferiores inclinados: empiezan detrás del alféizar y terminan fuera
# de pantalla. La profundidad de 1.16–1.29 m los mantiene detrás de todo HUD.
def lower_point(u,v,relief=0):
    d=1.16+max(0,-v-.62)*.26-relief
    return (u*d,v*H*d,1-d)
def lower_panel(name,outline,mat,relief=0):
    n=len(outline)
    verts=[lower_point(u,v,relief+z) for z in [-.012,0] for u,v in outline]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    ob=make(name,verts,faces,mat)
    if "ranura" not in name: bevel(ob,.0015,2)
    return ob
def lower_fill(name,xs,edge):
    lo,hi=min(xs),max(xs)
    lower_panel(name+" cierre continuo",[(x,edge(x)) for x in sorted(xs)]+[(hi,-1.20),(lo,-1.20)],GRAPHITE,-.025)
    for i,(a,b) in enumerate(zip(xs,xs[1:])):
        lo,hi=sorted((a,b))
        lower_panel(name+" panel "+str(i),[(lo+.004,edge(lo)-.003),(hi-.004,edge(hi)-.003),
                    (hi-.004,-1.19),(lo+.004,-1.19)],PETROL,0)
        u=(lo+hi)/2
        # Rejillas hundidas, mayormente visibles en 21:9 junto a consola central.
        for j in range(4):
            v=min(-.83,edge(u)-.07)-j*.025
            lower_panel(name+" ranura "+str(i)+" "+str(j),
                        [(u-.034,v),(u+.034,v),(u+.034,v-.007),(u-.034,v-.007)],RUBBER,.003)
CURRENT["name"]="sillC"
lower_fill("Faldón frontal",[-.686,-.48,-.27,0,.27,.48,.686],lambda u:-.625)
for side,label in [(-1,"L"),(1,"R")]:
    CURRENT["name"]="sill"+label
    lower_fill("Faldón lateral "+label,[side*x for x in [.675,.82,1.06]],
               lambda u:-.625-(min(abs(u),.82)-.665)*(.14/.155)-max(0,abs(u)-.82)*(.12/.215))
CURRENT["name"]="frameNarrow"
lower_fill("Faldón estrecho",[-1.06,-.5,0,.5,1.06],lambda u:-.895)


APPROVED_CONTRACT = {'consoleL': {'name': 'consoleL', 'anchor': [-1, -1], 'depth': 0.86, 'stretchX': False, 'narrow': False, 'screens': {'sonar': [[0.035, 0.03889, 0.00608], [0.285, 0.03889, 0.00608], [0.285, 0.27145, -0.07099], [0.035, 0.27145, -0.07099]]}}, 'consoleR': {'name': 'consoleR', 'anchor': [1, -1], 'depth': 0.86, 'stretchX': False, 'narrow': False, 'screens': {'stats': [[-0.03, 0.03414, 0.00765], [-0.305, 0.03414, 0.00765], [-0.305, 0.27619, -0.07257], [-0.03, 0.27619, -0.07257]]}}, 'consoleC': {'name': 'consoleC', 'anchor': [0, -1], 'depth': 0.9, 'stretchX': False, 'narrow': True, 'screens': {'answers': [[-0.26, 0.00408, 0.00913], [0.26, 0.00408, 0.00913], [0.24, 0.14104, -0.05203], [-0.24, 0.14104, -0.05203]]}}, 'railTopC': {'name': 'railTopC', 'anchor': [0, 0], 'depth': 1, 'stretchX': False, 'narrow': False, 'screens': {}, 'screenSpace': True, 'wide': True}, 'sillC': {'name': 'sillC', 'anchor': [0, 0], 'depth': 1, 'stretchX': False, 'narrow': False, 'screens': {}, 'screenSpace': True, 'wide': True}, 'pillarL': {'name': 'pillarL', 'anchor': [0, 0], 'depth': 1, 'stretchX': False, 'narrow': False, 'screens': {}, 'screenSpace': True, 'wide': True}, 'railTopL': {'name': 'railTopL', 'anchor': [0, 0], 'depth': 1, 'stretchX': False, 'narrow': False, 'screens': {}, 'screenSpace': True, 'wide': True}, 'edgeL': {'name': 'edgeL', 'anchor': [0, 0], 'depth': 1, 'stretchX': False, 'narrow': False, 'screens': {}, 'screenSpace': True, 'wide': True}, 'sillL': {'name': 'sillL', 'anchor': [0, 0], 'depth': 1, 'stretchX': False, 'narrow': False, 'screens': {}, 'screenSpace': True, 'wide': True}, 'pillarR': {'name': 'pillarR', 'anchor': [0, 0], 'depth': 1, 'stretchX': False, 'narrow': False, 'screens': {}, 'screenSpace': True, 'wide': True}, 'railTopR': {'name': 'railTopR', 'anchor': [0, 0], 'depth': 1, 'stretchX': False, 'narrow': False, 'screens': {}, 'screenSpace': True, 'wide': True}, 'edgeR': {'name': 'edgeR', 'anchor': [0, 0], 'depth': 1, 'stretchX': False, 'narrow': False, 'screens': {}, 'screenSpace': True, 'wide': True}, 'sillR': {'name': 'sillR', 'anchor': [0, 0], 'depth': 1, 'stretchX': False, 'narrow': False, 'screens': {}, 'screenSpace': True, 'wide': True}, 'frameNarrow': {'name': 'frameNarrow', 'anchor': [0, 0], 'depth': 1, 'stretchX': False, 'narrow': True, 'screens': {}, 'screenSpace': True, 'wide': False}}
assert {n:dict(m) for n,m in MODULES.items()} == APPROVED_CONTRACT, "Contrato v3 alterado"

# Identificadores y pigmento absoluto para GLB.
for ob in CAB.objects:
    ob["part"]=ob["module"]
    attr=ob.data.color_attributes.new(name="Pigment",type="FLOAT_COLOR",domain="POINT")
    tint=ob.get("tint",[1,1,1])
    for vi,c in enumerate(attr.data):
        alpha=(0.12 if vi<2 else 0.0) if ob.data.materials[0]==GLASS else 1.0
        c.color=(*(tint[i]*ob.data.materials[0].diffuse_color[i] for i in range(3)),alpha)
for mat in MATS.values():
    nt=mat.node_tree
    vc=nt.nodes.new("ShaderNodeVertexColor"); vc.layer_name="Pigment"
    mul=nt.nodes.new("ShaderNodeMixRGB"); mul.blend_type="MULTIPLY"
    mul.inputs[0].default_value=1
    mul.inputs[1].default_value=mat.diffuse_color
    nt.links.new(vc.outputs["Color"],mul.inputs[2])
    nt.links.new(vc.outputs["Color"],nt.nodes["Principled BSDF"].inputs["Base Color"])
    if mat==GLASS: nt.links.new(vc.outputs["Alpha"],nt.nodes["Principled BSDF"].inputs["Alpha"])
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



json_path=ROOT/"cabina-envolvente.json"
parts, shared_tris=kit.export_parts(json_path,objects=list(CAB.objects),meta=dict(forward="-Z"))
tris=0
for name,mod in MODULES.items():
    mod["meshes"]=harvest([o for o in CAB.objects if o.get("module")==name])
    tris+=sum(len(m["index"])//3 for m in mod["meshes"])
original=json.loads((GAME/"src/3d/assets/cabina-scifi.json").read_text(encoding="utf-8"))
comparisons={}
for name in ["consoleL","consoleR","consoleC"]:
    old=next(m for m in original["modules"] if m["name"]==name)
    comparisons[name]={key:MODULES[name][key]==old[key] for key in ["anchor","depth","stretchX","narrow","screens","meshes"]}
assert all(all(c.values()) for c in comparisons.values()), comparisons
assert tris<=45000, tris
payload=dict(generator="Blender "+bpy.app.version_string,space="three",forward="-Z",
 layout=dict(H=round(H,6),refHalfWidth=1.03,narrowAspect=1.1),
 materials=[m["game"].to_dict() for m in MATS.values()],modules=list(MODULES.values()),
 meta=dict(triangles=tris,parts=parts,sharedExportTriangles=shared_tris,
 screenSpaceFormula="position=(0,0,-1); scale=(H*aspect,1,1); replaces k only for screenSpace=true",
 consoleComparison=comparisons))
json_path.write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
print("EXPORT",parts,"partes",tris,"triangulos",flush=True)
C3B=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
parents={}
for name,mod in MODULES.items():
    empty=bpy.data.objects.new("Módulo "+name,None); CAB.objects.link(empty); parents[name]=empty
    for ob in list(CAB.objects):
        if ob.type=="MESH" and ob.get("module")==name: ob.parent=empty
def layout_matrix(mod,aspect):
    hw=H*aspect; k=max(.45,min(1,hw/1.03)); d=mod["depth"]; ax,ay=mod["anchor"]
    if mod.get("screenSpace"): return T((0,0,-1),scale=(hw,1,1))
    if "span" in mod:
        x0,x1=mod["span"]
        return T(((x0+x1)/2*hw*d,ay*H*d,-d),scale=((x1-x0)*hw*d,k,k))
    return T((ax*hw*d,ay*H*d,-d),scale=(2*hw*d+.3 if mod["stretchX"] else k,k,k))
def arrange(aspect):
    narrow=aspect<1.1
    for name,mod in MODULES.items():
        parents[name].matrix_world=C3B@layout_matrix(mod,aspect)@C3B.inverted()
        visible=mod.get("narrow",True) if narrow else mod.get("wide",True)
        for ob in parents[name].children:
            ob.hide_render=not visible; ob.hide_set(not visible)
    bpy.context.view_layer.update()
arrange(16/9)
for ob in bpy.context.scene.objects: ob.select_set(False)
for ob in CAB.objects:
    if ob.type=="EMPTY" or not ob.hide_render: ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/"cabina-envolvente.glb"),export_format="GLB",
 use_selection=True,export_apply=True,export_extras=True)
world=bpy.data.worlds.new("Agua"); scene.world=world; world.use_nodes=True
world.node_tree.nodes["Background"].inputs[0].default_value=(*lin("#2F7FB5"),1)
world.node_tree.nodes["Background"].inputs[1].default_value=.35
bg=bpy.data.materials.new("Agua de revisión"); bg.use_nodes=True
nt=bg.node_tree; nt.nodes.clear()
out=nt.nodes.new("ShaderNodeOutputMaterial"); em=nt.nodes.new("ShaderNodeEmission")
tex=nt.nodes.new("ShaderNodeTexCoord"); sep=nt.nodes.new("ShaderNodeSeparateXYZ")
ramp=nt.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].color=(*lin("#10354F"),1)
ramp.color_ramp.elements[1].color=(*lin("#2F7FB5"),1)
nt.links.new(tex.outputs["Generated"],sep.inputs[0]); nt.links.new(sep.outputs["Z"],ramp.inputs[0])
nt.links.new(ramp.outputs[0],em.inputs[0]); nt.links.new(em.outputs[0],out.inputs[0])
mesh=bpy.data.meshes.new("Fondo"); mesh.from_pydata([B(p) for p in [(-12,-4,-6),(12,-4,-6),(12,4,-6),(-12,4,-6)]],[],[(0,1,2,3)])
back=bpy.data.objects.new("Fondo agua",mesh); STAGE.objects.link(back); mesh.materials.append(bg)
def light(pos,power,color,size):
    data=bpy.data.lights.new("Luz de revisión","AREA"); data.energy=power; data.color=color; data.shape="DISK"; data.size=size
    ob=bpy.data.objects.new(data.name,data); STAGE.objects.link(ob); ob.location=B(pos)
    ob.rotation_euler=(B((0,0,-.9))-ob.location).to_track_quat("-Z","Y").to_euler()
light((0,.6,.15),35,(.72,.88,1),2)
light((0,-.4,.1),12,(.25,.66,.8),1.8)
scene.render.engine="CYCLES"; scene.cycles.device="CPU"; scene.cycles.samples=32; scene.cycles.use_denoising=True
scene.view_settings.view_transform="Standard"
camdata=bpy.data.cameras.new("Piloto"); cam=bpy.data.objects.new("Piloto",camdata); STAGE.objects.link(cam)
cam.rotation_euler=(math.pi/2,0,0); camdata.sensor_fit="VERTICAL"; camdata.angle=math.radians(60); camdata.clip_start=.01; scene.camera=cam
scene.render.resolution_percentage=100
for filename,w,h in [("render-16x9.png",1600,900),("render-21x9.png",2100,900),("render-4x3.png",1200,900),("render-estrecho.png",900,1200),("render-pilar.png",1200,900)]:
    arrange(16/9 if filename=="render-pilar.png" else w/h)
    cam.location=(0,0,0); cam.rotation_euler=(math.pi/2,0,0); camdata.angle=math.radians(60)
    if filename=="render-pilar.png":
        target=B((.68*H*(16/9)*.9,.65*H*.9,-.89))
        cam.location=B((.32,.16,-.32))
        cam.rotation_euler=(target-cam.location).to_track_quat("-Z","Y").to_euler()
        camdata.angle=math.radians(44)
    scene.render.resolution_x=w; scene.render.resolution_y=h; scene.render.filepath=str(ROOT/filename)
    print("RENDER",filename,flush=True)
    bpy.ops.render.render(write_still=True)
arrange(16/9); cam.location=(0,0,0); cam.rotation_euler=(math.pi/2,0,0); camdata.angle=math.radians(60)
scene.render.resolution_x=1600; scene.render.resolution_y=900
bounds=[ob.matrix_world@Vector(p) for ob in CAB.objects if ob.type=="MESH" and not ob.hide_render for p in ob.bound_box]
dims=[max(p[i] for p in bounds)-min(p[i] for p in bounds) for i in range(3)]
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/"cabina-envolvente.blend"))
rows=[]
for n,m in MODULES.items():
    rows.append(f'| {n} | {m["anchor"]} | — | {m["depth"]} | {m["narrow"]} | {m.get("wide",True)} | {m.get("screenSpace",False)} |')
screens="\n".join(f'- **{n}**: {json.dumps(MODULES[n]["screens"],ensure_ascii=False)}' for n in comparisons)
matrows="\n".join(f'| {k} | {m["game"]["color"]} | {m["game"]["metalness"]} / {m["game"]["roughness"]} | {m["game"]["emissiveIntensity"]} | {0.12 if k=="glassEdge" else 1} |' for k,m in MATS.items())
report=f"""# ENTREGA — Marco envolvente · Batisfera

## Estado
- Versión: v4, ronda extra de detalle autorizada por Luis. Cinco renders revisados por Astra.
- Fecha: 2026-09-16.
- Lista para revisión de Luis e integración de v4; la composición v3 ya fue aprobada e integrada.

## Archivos
| Archivo | Contenido |
|---|---|
| modelar-marco.py | Fuente reproducible; conserva el código original de las consolas |
| cabina-envolvente.blend | Modelo editable, módulos y escena de revisión |
| cabina-envolvente.glb | Composición 16:9 con pigmento conectado al material |
| cabina-envolvente.json | Contrato modular, esquinas HUD y metadatos |
| render-16x9.png | 1600 × 900 |
| render-21x9.png | 2100 × 900 |
| render-4x3.png | 1200 × 900 |
| render-estrecho.png | 900 × 1200 |
| render-pilar.png | 1200 × 900, detalle |

Regenerar desde esta carpeta:
powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/Luis/blender-bpy/bpy-run.ps1 modelar-marco.py

## Datos técnicos
- Triángulos: **{tris:,}**, incluidas las consolas y el marco estrecho alternativo.
- Módulos: **{len(MODULES)}**. Objetos de malla: **{parts}**.
- JSON: {json_path.stat().st_size/1024:.1f} KiB.
- Dimensiones de la composición 16:9 en Three: X {dims[0]:.3f}, Y {dims[2]:.3f}, Z {dims[1]:.3f} m; no es un casco completo.
- Origen de cámara: (0,0,0); Y arriba, frente −Z.
- Cada objeto lleva part igual a su módulo. Sin segment ni partes móviles.
- Animación de todas las partes: ninguna; amplitud 0 rad, velocidad 0 rad/s.
- Pivotes locales: (0,0,0); posición de cada módulo según las fórmulas siguientes.
- meta: triangles, parts, sharedExportTriangles, screenSpaceFormula y consoleComparison; sin anclajes mecánicos adicionales.

## Módulos
| part / módulo | anchor | span | depth | narrow | wide | screenSpace |
|---|---|---|---|---|---|---|
{chr(10).join(rows)}

### Fórmula aprobada, sin cambios en v4
Para screenSpace=true: posición=(0,0,-1); escala=(H*aspecto,1,1).
Reemplaza el escalado k únicamente en el marco. Los vértices ya contienen la profundidad:
p=(u*d, v*H*d, 1-d), con d=0.90-0.10*clamp((abs(u)-0.67)/0.33,0,1)+0.22*clamp(-v/0.40,0,1).
Así el frontal queda a 0.9 m y el extremo lateral a 0.8 m, con techo y alféizar oblicuos. Abajo se aleja 0.22 m para quedar detrás de las consolas.
screenSpace es el contrato ya integrado en v3. V4 no requiere nuevas fórmulas, módulos ni campos.
Sin span: los tramos ya tienen extremos proyectivos compatibles y se solapan en las uniones.
Las consolas conservan la fórmula original y k=clamp(H*aspecto/1.03,0.45,1).
Visibilidad: aspecto<1.1 usa narrow; en los demás usa wide (por defecto true).
El GLB presenta la vista ancha; frameNarrow está en el blend y JSON.

## Conservación exacta de consolas
Comparación automática contra apps-src/acordes-juego/src/3d/assets/cabina-scifi.json:
anchor, depth, stretchX, narrow, screens y **meshes completos iguales**, incluidas posiciones,
normales, índices y pigmento. Diferencia máxima de cada número: **0**.
consoleL/R: anchor=(±1,-1), depth=0.86; consoleC: anchor=(0,-1), depth=0.9.
Esquinas locales en Three, idénticas:
{screens}

## Materiales
| Material | Color | Metal / rugosidad | Emisión | Alfa |
|---|---|---|---|---|
{matrows}
Solo glassEdge usa transparencia; uv.y=0 en marco, uv.y=1 hacia vidrio. En GLB el mismo degradado está codificado en alfa por vértice.
El JSON conserva el pigmento escalar original por vértice; GLB usa Pigment con el color base incorporado y conectado directamente al material.
No se hornean textos ni cifras.

## Cambios v4 y diferencias con el encargo de detalle
- Techo segmentado con paneles biselados, juntas, costillas escalonadas, rejillas y tres focos por lado (uno frontal y dos laterales).
- Pilares con espina de 8 cm de profundidad, dos cajas por lado, mazos con abrazaderas, remaches y cinco segmentos cian.
- Faldón oscuro inclinado tras las consolas, con paneles y ranuras, cierra bajo los alféizares hasta fuera de pantalla.
- frameNarrow incorpora cuatro paneles de techo, dos focos y cierre inferior.
- Sin cambios de fórmulas, anclas, módulos, materiales, límites de apertura ni esquinas HUD.
- Los detalles se confinan a las superficies metálicas existentes. El cierre inferior ocupa solo el hueco autorizado.
- Contrato completo de los 14 módulos comparado contra v3 mediante aserción reproducible: diferencia 0.
- Las consolas y las esquinas se comparan con el original en cada ejecución: diferencia 0.
- El detalle añade profundidad en los vértices del modelo, sin cambiar la fórmula de colocación del juego.

## Decisiones de composición heredadas de v3 (aprobadas)
- Pilares de aproximadamente 2 % del ancho cada uno, frente al 4–5 % sugerido:
  es necesario reducirlos para compatibilizar 65 % central y aproximadamente 15 % lateral.
  El área geométrica de cristal lateral entre u=0.69 y u=0.99 ocupa 15 % por lado;
  biseles, perspectiva de espesor y reflejos pueden reducir ligeramente el área visible.
- La vista central libre entre los pilares es aproximadamente 65 % del ancho, en los tres aspectos.
- Los pilares se inclinan en profundidad, no diagonalmente a través de la vista frontal.
- El marco usa screenSpace, fórmula documentada arriba, para conservar cierres y reparto de ventanales.
  Sus perfiles escalan horizontalmente con el aspecto; no es escalado isotrópico k.
- Se llama kit.export_parts y se adapta después al contrato modular del brief usando harvest original;
  el JSON final tiene modules, no el formato plano de kit, para preservar HUD y materiales.
- El render de detalle desplaza la cámara para acercarse al pilar. Las cuatro vistas de juego usan origen y FOV vertical 60°.

## Revisión propia y sugerencias para integrar
- Cycles CPU, 32 muestras, denoise; fondo azul #2F7FB5 degradado a #10354F abajo.
- Tres aperturas reales, sin caras de vidrio que bloqueen el mundo; glassEdge en sus cuatro contornos.
- Techo fino, cables sujetos, biseles de tres segmentos y tornillería contenida.
- Laterales descienden hacia las consolas; sin barras que atraviesen el centro.
- El JSON valida el límite de 45 000 triángulos, el contrato v3 de los 14 módulos y la igualdad completa de consolas al regenerarse.
- Revisados los cinco renders: cierre inferior continuo en 16:9, 21:9 y 4:3; detalles fuera del cristal; focos, juntas y cables legibles en el acercamiento.
- GLB comprobado: ocho materiales, pigmento COLOR_0 en todas las primitivas y solo glassEdge en modo BLEND.
- Mantener luces cian y ámbar emisivas en zonas oscuras; glassEdge sin escritura de profundidad y DoubleSide.
- No animar el marco. Todo HUD permanece HTML.
"""
(ROOT/"ENTREGA.md").write_text(report,encoding="utf-8")
print("FINAL",tris,len(MODULES),dims,comparisons,flush=True)




