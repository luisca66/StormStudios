"""Herramientas compartidas para modelar en Blender (bpy) en el espacio de Three.js.

Se autora con Y arriba y se convierte a Blender (Z arriba) al crear cada malla; la
exportación vuelve a Three. Lo usan los scripts de modelado del Expreso Tonal.
"""
import bmesh
import bpy
import math
import random
from mathutils import Matrix, Vector

# Colección destino y RNG sembrado: cada script los fija con `setup()`.
KIT = {"collection": None, "rng": random.Random(0)}


def setup(collection, seed):
    KIT["collection"] = collection
    KIT["rng"] = random.Random(seed)


def B(v):
    return Vector((v[0], -v[2], v[1]))


def T(pos=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    """Matriz Three: traslación · Rx · Ry · Rz · escala (orden Euler 'XYZ' de three)."""
    r = Matrix.Rotation(rot[0], 4, "X") @ Matrix.Rotation(rot[1], 4, "Y") @ Matrix.Rotation(rot[2], 4, "Z")
    s = Matrix.Diagonal((*scale, 1))
    return Matrix.Translation(Vector(pos)) @ r @ s


def facing(pos, target, up=(0, 1, 0)):
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
    KIT["collection"].objects.link(ob)
    ob["part"] = part
    # Variación de tono por pieza: tablones, placas y remaches no salen idénticos.
    k = 1 + KIT["rng"].uniform(-tint, tint)
    ob["tint"] = [k, k * (1 + KIT["rng"].uniform(-0.015, 0.015)), k]
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


def rivets(name, spots, r, mat, part="static"):
    """Remaches en cúpula. spots = [(pos, normal)]."""
    prof = [(r, 0), (r * 0.92, r * 0.38), (r * 0.7, r * 0.72), (r * 0.36, r * 0.94), (0.0001, r)]
    dv, df = g_lathe(prof, 8)
    parts = []
    for pos, nrm in spots:
        nrm = Vector(nrm).normalized()
        q = Vector((0, 1, 0)).rotation_difference(nrm).to_matrix().to_4x4()
        parts.append((dv, df, Matrix.Translation(Vector(pos)) @ q))
    v, f = combine(parts)
    return make(name, v, f, mat, part=part, smooth_angle=1.5, recalc=False)


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



# ---------------------------------------------------------------------------
# Exportación genérica por partes (flujo Astra → integrador, ver PLAN-3D-BLENDER.md)
# ---------------------------------------------------------------------------

def _three(v):
    return (v.x, v.z, -v.y)


def export_parts(path, objects=None, meta=None):
    """Escribe el JSON de juego de un modelo hecho en Blender (espacio Blender, Z arriba).

    Cada objeto MESH con la propiedad personalizada `part` se exporta por separado:
      name, part, segment (propiedad opcional, p. ej. 0..3 para el destello por nota),
      pivot (origen del objeto en espacio Three), position/normal relativos al pivote
      (con rotación y escala del objeto aplicadas), index, vertexColor (si la malla tiene
      atributo de color de esquina o de punto) y el material principal: color lineal,
      alpha, metalness, roughness, emission, emissionColor.
    Los modificadores se evalúan. Devuelve (partes, triángulos).
    """
    import json
    from pathlib import Path

    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    objects = objects if objects is not None else [o for o in bpy.context.scene.objects if o.type == "MESH" and "part" in o]
    out, tris = [], 0
    for ob in objects:
        ev = ob.evaluated_get(dg)
        me = ev.to_mesh()
        me.calc_loop_triangles()
        linear = ob.matrix_world.to_3x3()
        normal_m = linear.inverted().transposed()
        colors = me.color_attributes.active_color
        pos, nrm, col, idx, lookup = [], [], [], [], {}
        for tri in me.loop_triangles:
            for li in tri.loops:
                vi = me.loops[li].vertex_index
                p = _three(linear @ me.vertices[vi].co)
                n = _three((normal_m @ me.corner_normals[li].vector).normalized())
                c = ()
                if colors is not None:
                    src = colors.data[li] if colors.domain == "CORNER" else colors.data[vi]
                    c = tuple(round(x, 3) for x in src.color[:3])
                key = tuple(round(x, 5) for x in p) + tuple(round(x, 4) for x in n) + c
                i = lookup.get(key)
                if i is None:
                    i = lookup[key] = len(pos) // 3
                    pos.extend(key[0:3])
                    nrm.extend(key[3:6])
                    col.extend(c)
                idx.append(i)
        tris += len(idx) // 3
        mat = ob.material_slots[0].material if ob.material_slots else None
        bsdf = mat.node_tree.nodes.get("Principled BSDF") if mat and mat.use_nodes else None
        entry = dict(name=ob.name, part=ob["part"], pivot=list(_three(ob.matrix_world.translation)),
                     position=pos, normal=nrm, index=idx)
        if "segment" in ob:
            entry["segment"] = int(ob["segment"])
        if col:
            entry["vertexColor"] = col
        if bsdf:
            entry.update(
                color=list(bsdf.inputs["Base Color"].default_value[:3]),
                alpha=bsdf.inputs["Alpha"].default_value,
                metalness=bsdf.inputs["Metallic"].default_value,
                roughness=bsdf.inputs["Roughness"].default_value,
                emission=bsdf.inputs["Emission Strength"].default_value,
                emissionColor=list(bsdf.inputs["Emission Color"].default_value[:3]),
            )
        out.append(entry)
        ev.to_mesh_clear()
    payload = dict(generator="Blender " + bpy.app.version_string, axis="Y_UP", triangles=tris,
                   **(meta or {}), meshes=out)
    Path(path).write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    return len(out), tris
