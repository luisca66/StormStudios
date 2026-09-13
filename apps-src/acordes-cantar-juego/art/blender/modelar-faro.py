"""Modelado procedural monumental del Faro Atmosférico y los Picos de Cordillera para Aerostato.
Versión policromática de alta saturación y contraste (Studio Ghibli / Julio Verne):
- Macizo alpino de 3 cumbres (Pico Central, Aguja Derecha y Aguja Izquierda visibles en abanico)
- Estratos geológicos continuos con colores profundos y ricos (siena terracota, veta turquesa mineral, arenisca dorada, pizarra violeta y praderas verde esmeralda)
- Pinos alpinos verdes y alerces dorados otoñales situados en las repisas frontales
- Casita del farero con tejado azul cobalto y chimenea
- Faro victoriano esbelto con franjas rojo carmesí vivo y crema, cúpula turquesa, anillos de oro y banderines
- Encuadre fotográfico heroico con cámara a 42mm mostrando la torre completa y las cumbres alpinas

Ejecutar con Blender 4.5.3 LTS (bpy) y Python 3.11:
powershell -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 apps-src\\acordes-cantar-juego\\art\\blender\\modelar-faro.py
"""
import bpy
import math
import random
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parent
ROOT.mkdir(parents=True, exist_ok=True)

# Limpiar escena previa
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for block in list(bpy.data.meshes):
    bpy.data.meshes.remove(block)
for block in list(bpy.data.materials):
    bpy.data.materials.remove(block)

# -------------------------------------------------------------------------
# Paleta de Materiales Vívidos y Saturados (Tonos Profundos, Cero Pastel)
# -------------------------------------------------------------------------
def create_mat(name, base_color, metallic=0.0, roughness=0.5, emission=None, emission_str=1.0, alpha=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    p = nodes.get("Principled BSDF")
    if p:
        p.inputs["Base Color"].default_value = (*base_color, 1.0)
        p.inputs["Metallic"].default_value = metallic
        p.inputs["Roughness"].default_value = roughness
        p.inputs["Alpha"].default_value = alpha
        if emission:
            p.inputs["Emission Color"].default_value = (*emission, 1.0)
            p.inputs["Emission Strength"].default_value = emission_str
    return mat

# --- Materiales del Faro y la Casita ---
mat_stripe_red = create_mat("Faro_Franja_Roja", (0.88, 0.03, 0.06), metallic=0.05, roughness=0.25) # Carmesí escarlata puro
mat_stripe_cream = create_mat("Faro_Franja_Crema", (0.98, 0.96, 0.88), metallic=0.02, roughness=0.30) # Crema marfil cálido
mat_stone_base = create_mat("Faro_Piedra_Marina", (0.06, 0.12, 0.28), metallic=0.10, roughness=0.60) # Azul marino profundo
mat_gold = create_mat("Laton_Oro_Pulido", (1.0, 0.82, 0.14), metallic=0.92, roughness=0.16) # Oro reluciente
mat_verdigris = create_mat("Cobre_Turquesa_Verdigris", (0.04, 0.80, 0.72), metallic=0.35, roughness=0.25) # Turquesa verdigrís vivo
mat_balcony_rail = create_mat("Hierro_Esmeralda", (0.04, 0.38, 0.22), metallic=0.70, roughness=0.35) # Verde esmeralda forjado
mat_window = create_mat("Ventana_Calida", (1.0, 0.85, 0.20), metallic=0.05, roughness=0.20, emission=(1.0, 0.85, 0.20), emission_str=6.5)
mat_glass = create_mat("Cristal_Lampara", (1.0, 0.95, 0.70), metallic=0.1, roughness=0.10, emission=(1.0, 0.92, 0.55), emission_str=9.5, alpha=0.90)
mat_beam = create_mat("Haz_Luz_Cono", (1.0, 0.90, 0.40), metallic=0.0, roughness=0.1, emission=(1.0, 0.88, 0.40), emission_str=3.2, alpha=0.35)

mat_cottage_wall = create_mat("Casita_Pared", (0.95, 0.90, 0.82), metallic=0.0, roughness=0.75) # Mampostería clara
mat_roof_blue = create_mat("Casita_Tejado_Azul", (0.08, 0.32, 0.85), metallic=0.05, roughness=0.35) # Tejas azul cobalto brillante
mat_brick_chimney = create_mat("Chimenea_Ladrillo", (0.82, 0.25, 0.15), metallic=0.0, roughness=0.85) # Ladrillo rojo
mat_wood = create_mat("Madera_Noble", (0.38, 0.18, 0.10), metallic=0.0, roughness=0.70) # Madera de nogal

# --- Materiales Geológicos de la Montaña (Colores Saturados y Vivos) ---
mat_rock_terracotta = create_mat("Roca_Terracota", (0.65, 0.20, 0.08), metallic=0.02, roughness=0.82) # Terracota siena tostada
mat_rock_golden = create_mat("Arenisca_Dorada", (0.84, 0.52, 0.10), metallic=0.02, roughness=0.78) # Ocre dorado cálido
mat_rock_turquoise = create_mat("Veta_Turquesa", (0.04, 0.58, 0.50), metallic=0.05, roughness=0.72) # Malaquita mineral intensa
mat_rock_violet = create_mat("Granito_Violeta", (0.28, 0.16, 0.36), metallic=0.02, roughness=0.88) # Pizarra violeta sombra
mat_meadow = create_mat("Pradera_Alpina", (0.12, 0.55, 0.12), metallic=0.0, roughness=0.75) # Verde pradera esmeralda
mat_snow = create_mat("Nieve_Escarchada", (0.98, 0.99, 1.0), metallic=0.0, roughness=0.18) # Nieve cristalina pura

# --- Flora y Vegetación ---
mat_pine_foliage = create_mat("Pino_Verde", (0.06, 0.42, 0.15), metallic=0.0, roughness=0.78) # Verde bosque alpino
mat_larch_foliage = create_mat("Alerce_Dorado", (0.98, 0.55, 0.08), metallic=0.0, roughness=0.78) # Naranja dorado otoñal
mat_pine_trunk = create_mat("Pino_Tronco", (0.32, 0.18, 0.10), metallic=0.0, roughness=0.90)

# --- Banderines Festivos ---
flag_materials = [
    create_mat("Banderin_Amarillo", (1.0, 0.88, 0.08), roughness=0.40),
    create_mat("Banderin_Azul", (0.08, 0.60, 0.98), roughness=0.40),
    create_mat("Banderin_Coral", (0.98, 0.25, 0.12), roughness=0.40),
    create_mat("Banderin_Verde", (0.12, 0.88, 0.35), roughness=0.40),
    create_mat("Banderin_Blanco", (0.98, 0.98, 0.98), roughness=0.40),
]

def finish_obj(obj, name, material, smooth=True):
    obj.name = name
    if material:
        obj.data.materials.append(material)
    if smooth and hasattr(obj.data, "polygons"):
        for poly in obj.data.polygons:
            poly.use_smooth = True
    return obj

# -------------------------------------------------------------------------
# 1. Macizo Alpino con 3 Cumbres Escénicas (Pico_Rocoso)
# -------------------------------------------------------------------------
print("Construyendo macizo alpino de 3 cumbres escénicas...")

def make_craggy_peak(name, center_xy, height, r_base, r_top, rings, segments, seed, ridges=4):
    rng = random.Random(seed)
    cx, cy = center_xy
    verts = []
    faces = []
    
    ridge_angles = [(k / ridges) * math.pi * 2 + (rng.random() - 0.5) * 0.4 for k in range(ridges)]

    for i in range(rings + 1):
        t = i / rings
        z = t * height
        curve = math.pow(1.0 - t, 0.70)
        r = r_top + (r_base - r_top) * curve

        for j in range(segments):
            a = (j / segments) * math.pi * 2
            ridge_mult = 1.0
            for ra in ridge_angles:
                diff = abs(math.atan2(math.sin(a - ra), math.cos(a - ra)))
                if diff < 0.6:
                    ridge_mult = max(ridge_mult, 1.0 + (0.6 - diff) * 1.8 * curve)

            dr = (rng.random() - 0.5) * 0.8 * curve
            r_final = max(r_top * 0.7, (r + dr) * ridge_mult)
            vx = cx + math.cos(a) * r_final
            vy = cy + math.sin(a) * r_final
            vz = z + (rng.random() - 0.5) * 0.4
            verts.append(Vector((vx, vy, vz)))

    for i in range(rings):
        for j in range(segments):
            next_j = (j + 1) % segments
            idx0 = i * segments + j
            idx1 = i * segments + next_j
            idx2 = (i + 1) * segments + next_j
            idx3 = (i + 1) * segments + j
            faces.append((idx0, idx1, idx2, idx3))

    top_idx = len(verts)
    verts.append(Vector((cx, cy, height)))
    for j in range(segments):
        next_j = (j + 1) % segments
        idx_c = rings * segments + j
        idx_n = rings * segments + next_j
        faces.append((idx_c, idx_n, top_idx))

    m = bpy.data.meshes.new(f"Mesh_{name}")
    m.from_pydata(verts, [], faces)
    m.update()
    o = bpy.data.objects.new(name, m)
    bpy.context.collection.objects.link(o)
    return o

# Cumbre Central Principal (soporta el faro en z=22.0)
peak_main = make_craggy_peak("Pico_Central", (0.0, 0.0), height=22.0, r_base=13.0, r_top=3.8, rings=16, segments=22, seed=137, ridges=4)

# Aguja Derecha Visible en el Frente (+X, -Y)
peak_east = make_craggy_peak("Pico_Aguja_Derecha", (8.5, -4.5), height=17.5, r_base=5.2, r_top=0.5, rings=12, segments=16, seed=241, ridges=3)

# Aguja Izquierda Visible en el Frente (-X, -Y)
peak_west = make_craggy_peak("Pico_Aguja_Izquierda", (-8.5, -4.0), height=15.0, r_base=5.5, r_top=0.8, rings=10, segments=16, seed=389, ridges=3)

# Unir las tres cumbres
bpy.ops.object.select_all(action='DESELECT')
peak_main.select_set(True)
peak_east.select_set(True)
peak_west.select_set(True)
bpy.context.view_layer.objects.active = peak_main
bpy.ops.object.join()
obj_rock = bpy.context.object
obj_rock.name = "Pico_Rocoso"

# Asignar los 6 materiales geológicos
obj_rock.data.materials.append(mat_rock_terracotta) # 0: Terracota
obj_rock.data.materials.append(mat_snow)            # 1: Nieve
obj_rock.data.materials.append(mat_meadow)          # 2: Pradera verde
obj_rock.data.materials.append(mat_rock_violet)     # 3: Granito violeta
obj_rock.data.materials.append(mat_rock_turquoise)  # 4: Veta turquesa
obj_rock.data.materials.append(mat_rock_golden)     # 5: Arenisca dorada

print("Pintando estratos geológicos continuos y vibrantes...")
for p in obj_rock.data.polygons:
    cz = p.center.z
    cx = p.center.x
    cy = p.center.y
    slope = p.normal.z
    
    # Inclinación geológica coherente
    layer_z = cz + cx * 0.14 + cy * 0.08

    # Nieve solo en las aristas superiores muy horizontales
    if layer_z > 21.0 and slope > 0.70:
        p.material_index = 1 # Nieve pura
    elif layer_z < 6.8:
        # Base: pradera verde alpina viva o talud terracota
        if slope > 0.20:
            p.material_index = 2 # Pradera verde viva
        else:
            p.material_index = 0 # Terracota
    elif 6.8 <= layer_z < 10.5:
        # Estrato terracota tostada
        p.material_index = 0
    elif 10.5 <= layer_z < 14.2:
        # Veta mineral turquesa y malaquita
        p.material_index = 4
    elif 14.2 <= layer_z < 18.0:
        # Arenisca dorada soleada
        p.material_index = 5
    elif 18.0 <= layer_z < 21.2:
        # Estrato alto: dorado soleado vs violeta en sombra
        if p.normal.x > -0.15:
            p.material_index = 5 # Arenisca dorada
        else:
            p.material_index = 3 # Granito violeta
    else:
        # Cumbre rocosa
        if slope > 0.60:
            p.material_index = 1 # Nieve en repisa
        elif p.normal.x > -0.10:
            p.material_index = 0 # Terracota
        else:
            p.material_index = 3 # Granito violeta

# -------------------------------------------------------------------------
# Pinos Alpinos y Alerces Dorados en Terrazas Frontales Bien Visibles
# -------------------------------------------------------------------------
print("Plantando arboledas de pinos verdes y alerces dorados...")
rock_parts = [obj_rock]
tree_data = [
    # Terrazas intermedias y altas en el frente de la cámara (z entre 8m y 18m)
    (5.5, -4.0, 12.5, 1.6, False), # Pino verde repisa derecha
    (7.2, -2.8, 10.8, 1.5, True),  # Alerce dorado repisa derecha
    (3.2, -6.2, 9.2, 1.7, False),  # Pino
    (1.2, -7.0, 7.8, 1.6, True),   # Alerce dorado
    (-4.5, -4.2, 11.2, 1.5, True), # Alerce dorado repisa izquierda
    (-6.5, -3.0, 9.8, 1.6, False), # Pino repisa izquierda
    (-2.5, -5.2, 13.8, 1.4, False),# Pino terraza media
    (2.8, -2.2, 16.2, 1.3, True),  # Alerce dorado alto
    (-3.8, -1.8, 16.8, 1.2, False),# Pino alto junto a la casita
    (6.8, 0.5, 13.0, 1.4, False),  # Pino
    (-5.8, 1.0, 12.0, 1.3, True),  # Alerce dorado
]

for t_i, (tx, ty, tz, t_scale, is_larch) in enumerate(tree_data):
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.20 * t_scale, depth=0.85 * t_scale, location=(tx, ty, tz + 0.42 * t_scale))
    trunk = finish_obj(bpy.context.object, f"Arbol_Tronco_{t_i}", mat_pine_trunk, smooth=False)
    rock_parts.append(trunk)

    foliage_mat = mat_larch_foliage if is_larch else mat_pine_foliage
    bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=1.25 * t_scale, depth=1.65 * t_scale, location=(tx, ty, tz + 1.2 * t_scale))
    cone1 = finish_obj(bpy.context.object, f"Arbol_C1_{t_i}", foliage_mat, smooth=False)
    rock_parts.append(cone1)

    bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=0.95 * t_scale, depth=1.40 * t_scale, location=(tx, ty, tz + 1.85 * t_scale))
    cone2 = finish_obj(bpy.context.object, f"Arbol_C2_{t_i}", foliage_mat, smooth=False)
    rock_parts.append(cone2)

bpy.ops.object.select_all(action='DESELECT')
for p in rock_parts:
    p.select_set(True)
bpy.context.view_layer.objects.active = obj_rock
bpy.ops.object.join()
obj_rock = bpy.context.object
obj_rock.name = "Pico_Rocoso"

# -------------------------------------------------------------------------
# 2. Casita Pintoresca del Farero (Cottage Victoriano de Tejado Azul)
# -------------------------------------------------------------------------
print("Construyendo casita pintoresca del farero...")
cottage_parts = []
z_cottage = 21.8

# Cuerpo de la casita
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-3.2, 1.5, z_cottage + 1.2))
cottage_body = bpy.context.object
cottage_body.scale = (3.0, 2.4, 2.2)
finish_obj(cottage_body, "Casita_Cuerpo", mat_cottage_wall, smooth=False)
cottage_parts.append(cottage_body)

# Tejado a dos aguas en tejas azul cobalto
bpy.ops.mesh.primitive_cylinder_add(vertices=3, radius=1.85, depth=3.2, location=(-3.2, 1.5, z_cottage + 2.8), rotation=(0, math.pi / 2, 0))
roof = bpy.context.object
roof.scale = (1.0, 0.9, 0.8)
finish_obj(roof, "Casita_Tejado", mat_roof_blue, smooth=False)
cottage_parts.append(roof)

# Chimenea de ladrillo
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-4.0, 2.1, z_cottage + 3.2))
chimney = bpy.context.object
chimney.scale = (0.55, 0.55, 1.6)
finish_obj(chimney, "Casita_Chimenea", mat_brick_chimney, smooth=False)
cottage_parts.append(chimney)

# Ventana cálida iluminada
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-3.2, 0.25, z_cottage + 1.2))
cottage_win = bpy.context.object
cottage_win.scale = (0.8, 0.2, 1.0)
finish_obj(cottage_win, "Casita_Ventana", mat_window, smooth=False)
cottage_parts.append(cottage_win)

# Puerta de madera noble
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-2.0, 0.25, z_cottage + 0.9))
cottage_door = bpy.context.object
cottage_door.scale = (0.65, 0.2, 1.45)
finish_obj(cottage_door, "Casita_Puerta", mat_wood, smooth=False)
cottage_parts.append(cottage_door)

# -------------------------------------------------------------------------
# 3. El Faro Atmosférico Victoriano (Franjas Carmesí y Crema)
# -------------------------------------------------------------------------
print("Construyendo torre policromática del faro...")
tower_parts = cottage_parts

z_base = 21.8

# Base zócalo octogonal en piedra azul marino con moldura dorada
bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=3.2, depth=1.6, location=(0, 0, z_base + 0.8))
base_plinth = finish_obj(bpy.context.object, "Faro_Plinto", mat_stone_base, smooth=False)
tower_parts.append(base_plinth)

bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=3.4, depth=0.28, location=(0, 0, z_base + 1.6))
base_trim = finish_obj(bpy.context.object, "Faro_Plinto_Remate", mat_gold, smooth=False)
tower_parts.append(base_trim)

# Cuerpo principal en 5 franjas cónicas alternadas (Rojo, Blanco, Rojo, Blanco, Rojo)
h_tower = 11.5
num_stripes = 5
stripe_h = h_tower / num_stripes

for s_idx in range(num_stripes):
    z_bottom = z_base + 1.6 + s_idx * stripe_h
    z_mid = z_bottom + stripe_h / 2
    fac_bot = 1.0 - (s_idx / num_stripes) * 0.28
    fac_top = 1.0 - ((s_idx + 1) / num_stripes) * 0.28
    r_bot = 2.5 * fac_bot
    r_top = 2.5 * fac_top

    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=1.0, depth=stripe_h, location=(0, 0, z_mid))
    stripe_obj = bpy.context.object
    for v in stripe_obj.data.vertices:
        t_v = (v.co.z / stripe_h) + 0.5
        r_curr = r_bot + (r_top - r_bot) * t_v
        v.co.x *= r_curr
        v.co.y *= r_curr
    stripe_obj.data.update()

    mat_curr = mat_stripe_red if (s_idx % 2 == 0) else mat_stripe_cream
    name_str = f"Faro_Franja_{'Roja' if s_idx % 2 == 0 else 'Crema'}_{s_idx}"
    finish_obj(stripe_obj, name_str, mat_curr, smooth=False)
    tower_parts.append(stripe_obj)

    # Anillo ornamental de latón dorado entre franjas
    if s_idx > 0:
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=r_bot + 0.09, depth=0.18, location=(0, 0, z_bottom))
        ring_gold = finish_obj(bpy.context.object, f"Faro_Anillo_Oro_{s_idx}", mat_gold, smooth=False)
        tower_parts.append(ring_gold)

# Ventanales ojivales cálidos con moldura dorada
for i, rot_a in enumerate([0, math.pi * 0.5, math.pi, math.pi * 1.5]):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0))
    win = bpy.context.object
    win.scale = (0.35, 0.6, 1.2)
    dist = 2.15
    win.location = (math.cos(rot_a) * dist, math.sin(rot_a) * dist, z_base + 6.8)
    win.rotation_euler = (0, 0, rot_a + math.pi / 2)
    finish_obj(win, f"Faro_Ventana_{i}", mat_window, smooth=False)
    tower_parts.append(win)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0))
    win_frame = bpy.context.object
    win_frame.scale = (0.42, 0.72, 1.35)
    win_frame.location = (math.cos(rot_a) * (dist - 0.04), math.sin(rot_a) * (dist - 0.04), z_base + 6.8)
    win_frame.rotation_euler = (0, 0, rot_a + math.pi / 2)
    finish_obj(win_frame, f"Faro_Ventana_Marco_{i}", mat_gold, smooth=False)
    tower_parts.append(win_frame)

# Galería y balcón perimetral en piedra azul marina con moldura dorada
z_gallery = z_base + 1.6 + h_tower
bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=3.1, depth=0.45, location=(0, 0, z_gallery + 0.22))
gallery_floor = finish_obj(bpy.context.object, "Faro_Balconada", mat_stone_base, smooth=False)
tower_parts.append(gallery_floor)

bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=3.25, depth=0.15, location=(0, 0, z_gallery + 0.08))
gallery_trim = finish_obj(bpy.context.object, "Faro_Balconada_Borde", mat_gold, smooth=False)
tower_parts.append(gallery_trim)

# Barandilla de hierro verde esmeralda con pasamanos dorado
bpy.ops.mesh.primitive_torus_add(major_radius=3.0, minor_radius=0.07, major_segments=24, minor_segments=6, location=(0, 0, z_gallery + 1.2))
railing_top = finish_obj(bpy.context.object, "Barandilla_Pasamanos_Oro", mat_gold, smooth=True)
tower_parts.append(railing_top)

for b_i in range(16):
    b_ang = (b_i / 16) * math.pi * 2
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.045, depth=1.1, location=(math.cos(b_ang) * 3.0, math.sin(b_ang) * 3.0, z_gallery + 0.65))
    bar = finish_obj(bpy.context.object, f"Barrote_{b_i}", mat_balcony_rail, smooth=True)
    tower_parts.append(bar)

# -------------------------------------------------------------------------
# 4. Cámara de la Linterna y Cúpula Turquesa Verdigrís
# -------------------------------------------------------------------------
print("Construyendo camara de la linterna y cupula turquesa...")
z_lantern = z_gallery + 0.45

bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=1.95, depth=2.4, location=(0, 0, z_lantern + 1.2))
lantern_glass = finish_obj(bpy.context.object, "Faro_Cristal", mat_glass, smooth=True)
tower_parts.append(lantern_glass)

for m_i in range(8):
    m_ang = (m_i / 8) * math.pi * 2
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.08, depth=2.5, location=(math.cos(m_ang) * 1.95, math.sin(m_ang) * 1.95, z_lantern + 1.2))
    strut = finish_obj(bpy.context.object, f"Montante_Oro_{m_i}", mat_gold, smooth=True)
    tower_parts.append(strut)

# Cúpula de cobre turquesa verdigrís
z_dome = z_lantern + 2.4
bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=2.15, location=(0, 0, z_dome))
dome = bpy.context.object
dome.scale = (1.0, 1.0, 0.72)
for v in dome.data.vertices:
    if v.co.z < 0:
        v.co.z = 0
dome.data.update()
finish_obj(dome, "Faro_Cupula_Turquesa", mat_verdigris, smooth=True)
tower_parts.append(dome)

# Remate superior con veleta de latón dorado y anemómetro
z_roof = z_dome + 1.55
bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.09, depth=1.6, location=(0, 0, z_roof + 0.8))
finial_rod = finish_obj(bpy.context.object, "Veleta_Eje", mat_gold, smooth=True)
tower_parts.append(finial_rod)

for rot in [0, math.pi / 2]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.04, depth=1.4, location=(0, 0, z_roof + 1.2), rotation=(0, math.pi / 2, rot))
    arm = finish_obj(bpy.context.object, f"Veleta_Brazo_{rot}", mat_gold, smooth=True)
    tower_parts.append(arm)

for c_i in range(4):
    c_ang = (c_i / 4) * math.pi * 2
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=0.15, location=(math.cos(c_ang) * 0.7, math.sin(c_ang) * 0.7, z_roof + 1.2))
    cup = finish_obj(bpy.context.object, f"Copa_Anemometro_{c_i}", mat_gold, smooth=True)
    tower_parts.append(cup)

bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.28, depth=0.7, location=(0.4, 0, z_roof + 1.65), rotation=(0, math.pi / 2, 0))
arrow = finish_obj(bpy.context.object, "Veleta_Flecha", mat_gold, smooth=True)
tower_parts.append(arrow)

# -------------------------------------------------------------------------
# 5. Banderines Festivos Multicolores con Grosor 3D
# -------------------------------------------------------------------------
print("Añadiendo guirnaldas de banderines náuticos 3D...")
for g_i, g_angle in enumerate([math.pi * 0.15, math.pi * 0.65, math.pi * 1.15, math.pi * 1.65]):
    start_pt = Vector((math.cos(g_angle) * 0.8, math.sin(g_angle) * 0.8, z_roof + 0.4))
    end_pt = Vector((math.cos(g_angle) * 3.0, math.sin(g_angle) * 3.0, z_gallery + 1.25))
    
    num_flags = 7
    for f_idx in range(num_flags):
        tf = (f_idx + 0.6) / (num_flags + 0.5)
        sag = math.sin(tf * math.pi) * 0.45
        p_flag = start_pt.lerp(end_pt, tf)
        p_flag.z -= sag

        flag_w = 0.55
        flag_h = 0.75
        dir_side = Vector((-math.sin(g_angle), math.cos(g_angle), 0)).normalized()
        dir_thick = Vector((math.cos(g_angle), math.sin(g_angle), 0)).normalized() * 0.035

        p0_f = p_flag - dir_side * (flag_w * 0.5) + dir_thick
        p1_f = p_flag + dir_side * (flag_w * 0.5) + dir_thick
        p2_f = p_flag - Vector((0, 0, flag_h)) + dir_thick
        p0_b = p_flag - dir_side * (flag_w * 0.5) - dir_thick
        p1_b = p_flag + dir_side * (flag_w * 0.5) - dir_thick
        p2_b = p_flag - Vector((0, 0, flag_h)) - dir_thick

        verts_f = [p0_f, p1_f, p2_f, p0_b, p1_b, p2_b]
        faces_f = [
            (0, 1, 2),
            (5, 4, 3),
            (0, 3, 4, 1),
            (1, 4, 5, 2),
            (2, 5, 3, 0),
        ]
        fmesh = bpy.data.meshes.new(f"Mesh_Flag_{g_i}_{f_idx}")
        fmesh.from_pydata(verts_f, [], faces_f)
        fmesh.update()
        fobj = bpy.data.objects.new(f"Banderin_{g_i}_{f_idx}", fmesh)
        bpy.context.collection.objects.link(fobj)
        mat_f = flag_materials[(g_i * 3 + f_idx) % len(flag_materials)]
        finish_obj(fobj, fobj.name, mat_f, smooth=False)
        tower_parts.append(fobj)

bpy.ops.object.select_all(action='DESELECT')
for p in tower_parts:
    p.select_set(True)
bpy.context.view_layer.objects.active = tower_parts[0]
bpy.ops.object.join()
faro_tower = bpy.context.object
faro_tower.name = "Faro_Torre"

# -------------------------------------------------------------------------
# 6. Haz de Luz Volumétrico Giratorio (Ámbar Dorado Luminous)
# -------------------------------------------------------------------------
print("Construyendo haz de luz y lampara giratoria dorada...")
z_lens = z_lantern + 1.2

bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.6, depth=0.8, location=(0, 0, z_lens), rotation=(math.pi / 2, 0, 0))
lamp_core = finish_obj(bpy.context.object, "Faro_Lampara_Nucleo", mat_glass, smooth=True)

beam_length = 44.0
beam_r_end = 9.5
bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=beam_r_end, radius2=0.45, depth=beam_length, location=(0, beam_length / 2 + 0.4, z_lens), rotation=(math.pi / 2, 0, 0))
light_beam = finish_obj(bpy.context.object, "Haz_Luz", mat_beam, smooth=True)

bpy.ops.object.select_all(action='DESELECT')
lamp_core.select_set(True)
light_beam.select_set(True)
bpy.context.view_layer.objects.active = lamp_core
bpy.ops.object.join()
faro_rotator = bpy.context.object
faro_rotator.name = "Faro_Linterna_Giratoria"

# -------------------------------------------------------------------------
# Iluminación de Estudio Radiante con Alto Contraste (Sin Lavado de Color)
# -------------------------------------------------------------------------
print("Configurando iluminacion luminosa y camara heroica...")

# Sol cálido rasante (energía equilibrada para no sobreexponer)
bpy.ops.object.light_add(type='SUN', location=(-24.0, -32.0, 32.0))
sun = bpy.context.object
sun.name = "Sol_Rasante"
sun.data.energy = 3.6
sun.data.color = (1.0, 0.94, 0.86)
sun.rotation_euler = (math.radians(48), math.radians(-16), math.radians(38))

# Luz ambiental azul cerúleo suave (no blanquea las sombras)
bpy.ops.object.light_add(type='AREA', location=(16.0, 18.0, 24.0))
fill = bpy.context.object
fill.name = "Cielo_Azul"
fill.data.shape = 'DISK'
fill.data.size = 28.0
fill.data.energy = 160.0
fill.data.color = (0.22, 0.48, 0.85)
fill.rotation_euler = (math.radians(-50), math.radians(20), math.radians(-120))

# Luz interior del faro
bpy.ops.object.light_add(type='POINT', location=(0.0, 0.0, z_lens))
faro_pt = bpy.context.object
faro_pt.name = "Luz_Faro_Puntual"
faro_pt.data.energy = 1400.0
faro_pt.data.color = (1.0, 0.85, 0.30)
faro_pt.data.shadow_soft_size = 0.4

# Fondo del cielo: azul cobalto alpino atmosférico
bpy.context.scene.world.use_nodes = True
bg_node = bpy.context.scene.world.node_tree.nodes.get("Background")
if bg_node:
    bg_node.inputs['Color'].default_value = (0.12, 0.24, 0.52, 1.0)
    bg_node.inputs['Strength'].default_value = 0.60

# Cámara heroica: encuadre COMPLETO desde el pie de las agujas hasta la veleta
# El target está en Z=25.0 (mitad de la torre y cumbre)
bpy.ops.object.camera_add(location=(42.0, -50.0, 31.0))
cam = bpy.context.object
cam.name = "Camara_Hero_Faro"
cam.data.lens = 42
look_target = Vector((0.0, 0.0, 24.5))
direction = look_target - cam.location
cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()

scene = bpy.context.scene
scene.camera = cam

# Configurar View Transform 'Standard' para preservar máxima saturación de colores
scene.view_settings.view_transform = 'Standard'

# -------------------------------------------------------------------------
# Exportaciones (.blend, .glb, render Cycles)
# -------------------------------------------------------------------------
blend_path = ROOT / "faro-atmosferico.blend"
glb_path = ROOT / "faro-atmosferico.glb"
preview_path = ROOT / "faro-atmosferico-preview.png"

print("Guardando escena .blend...")
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

print("Exportando modelo .glb policromático...")
bpy.ops.object.select_all(action='DESELECT')
obj_rock.select_set(True)
faro_tower.select_set(True)
faro_rotator.select_set(True)
bpy.context.view_layer.objects.active = faro_tower
bpy.ops.export_scene.gltf(
    filepath=str(glb_path),
    export_format='GLB',
    use_selection=True
)

print("Renderizando vista previa con Cycles...")
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 36
scene.cycles.use_denoising = True
scene.render.resolution_x = 1200
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.filepath = str(preview_path)
bpy.ops.render.render(write_still=True)

total_polys = len(obj_rock.data.polygons) + len(faro_tower.data.polygons) + len(faro_rotator.data.polygons)
print(f"EXITO: Faro y macizo rocoso policromático generados correctamente. Poligonos totales: {total_polys}")
print(f"Archivos creados en: {ROOT}")
