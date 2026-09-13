"""Modelado procedural de La Gran Ballena Celeste (El Leviatán del Éter) para Aerostato.
Criatura mítica de la Capa 5 (+675m):
- Silueta orgánica de rorcual azul con lomo azul ultramar índigo y vientre nacarado acanalado
- Fuselaje continuo y fluido que se estrecha anatómicamente hasta la rótula peduncular caudal
- Aletas caudales (flukes) articuladas en la muñeca caudal (-19.3m) con media luna hidrodinámica 3D
- Amplias alas pectorales de manta marina con origen exacto en los hombros (-0.5m, +/-3.8m)
- Crestas dérmicas con placas de cristal bioluminiscente (turquesa, esmeralda y oro)
- Arnés dorsal victoriano de latón remachado con argolla de anclaje a 4.2m para las linternas
- Farolillos victorianos de navegación suspendidos en los costados
- Render de control en Cycles en atmósfera estratosférica estrellada con auroras

Ejecutar con Blender 4.5.3 LTS (bpy) y Python 3.11:
powershell -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 apps-src\\acordes-cantar-juego\\art\\blender\\modelar-ballena.py
"""
import bpy
import math
from pathlib import Path
from mathutils import Vector

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
# Materiales de la Ballena Celeste y sus Arneses
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

mat_dorsal = create_mat("Ballena_Lomo_Indigo", (0.07, 0.13, 0.30), metallic=0.10, roughness=0.35)
mat_belly = create_mat("Ballena_Vientre_Nacar", (0.95, 0.92, 0.84), metallic=0.05, roughness=0.40)
mat_gold = create_mat("Laton_Oro_Pulido", (1.0, 0.82, 0.16), metallic=0.92, roughness=0.18)
mat_biolum_turq = create_mat("Cristal_Turquesa", (0.05, 0.85, 0.78), roughness=0.15, emission=(0.05, 0.85, 0.78), emission_str=8.0)
mat_biolum_emerald = create_mat("Cristal_Esmeralda", (0.12, 0.85, 0.35), roughness=0.15, emission=(0.12, 0.85, 0.35), emission_str=7.5)
mat_biolum_gold = create_mat("Cristal_Oro", (1.0, 0.82, 0.20), roughness=0.15, emission=(1.0, 0.82, 0.20), emission_str=8.5)
mat_eye_pupil = create_mat("Ojo_Ambar_Glow", (1.0, 0.75, 0.22), roughness=0.10, emission=(1.0, 0.75, 0.22), emission_str=5.0)
mat_glass_lantern = create_mat("Cristal_Farol", (1.0, 0.90, 0.50), roughness=0.10, emission=(1.0, 0.88, 0.40), emission_str=9.0, alpha=0.90)

def finish_obj(obj, name, material, smooth=True):
    obj.name = name
    if material:
        obj.data.materials.append(material)
    if smooth and hasattr(obj.data, "polygons"):
        for poly in obj.data.polygons:
            poly.use_smooth = True
    return obj

# -------------------------------------------------------------------------
# 1. Cuerpo Principal / Fuselaje de la Ballena (Continuo de +7.4m a -19.6m)
# -------------------------------------------------------------------------
print("Construyendo fuselaje orgánico continuo de la Ballena Celeste...")

sections = [
    # (x, ry, rz, cz)
    (  7.4, 0.20, 0.15,  0.20), # Punta redondeada del morro
    (  7.0, 1.10, 0.80,  0.22), # Proa
    (  5.8, 2.30, 1.70,  0.25), # Mandíbula y barbilla
    (  3.5, 3.50, 2.70,  0.28), # Ojos y espiráculo
    (  0.8, 4.25, 3.60,  0.12), # Hombros y arnés
    ( -2.5, 4.10, 3.50, -0.05), # Dorso medio
    ( -6.0, 3.60, 3.20, -0.15), # Vientre rorcual
    ( -9.5, 2.90, 2.75, -0.10), # Cintura posterior
    (-12.8, 2.15, 2.15,  0.00), # Base de pedúnculo
    (-15.0, 1.45, 1.60,  0.10), # Pedúnculo con quilla
    (-16.8, 0.95, 1.15,  0.20), # Estrechamiento caudal
    (-18.2, 0.60, 0.75,  0.24), # Muñeca caudal
    (-19.2, 0.40, 0.45,  0.25), # Inserción de aleta
    (-19.6, 0.20, 0.20,  0.25), # Rótula terminal redondeada
]

num_rings = len(sections)
num_segs = 24

body_verts = []
body_faces = []

for s_idx, (sec_x, sec_ry, sec_rz, sec_cz) in enumerate(sections):
    for seg_idx in range(num_segs):
        ang = (seg_idx / num_segs) * math.pi * 2
        vy = math.sin(ang) * sec_ry
        vz = math.cos(ang) * sec_rz + sec_cz

        # Pliegues ventrales sutiles en la zona de la garganta y vientre
        if math.cos(ang) < -0.15 and -8.5 < sec_x < 5.5:
            pleat = math.sin(ang * 10.0) * 0.08 * min(1.0, sec_ry / 2.5)
            vy += math.sin(ang) * pleat
            vz += math.cos(ang) * pleat

        # Quilla dorsal y ventral suave en el pedúnculo
        if -18.5 < sec_x < -14.0:
            keel_dorsal = max(0.0, math.cos(ang)) ** 2 * 0.16
            keel_ventral = max(0.0, -math.cos(ang)) ** 2 * 0.14
            vz += keel_dorsal - keel_ventral

        body_verts.append(Vector((sec_x, vy, vz)))

for i in range(num_rings - 1):
    for j in range(num_segs):
        nj = (j + 1) % num_segs
        idx0 = i * num_segs + j
        idx1 = i * num_segs + nj
        idx2 = (i + 1) * num_segs + nj
        idx3 = (i + 1) * num_segs + j
        body_faces.append((idx0, idx1, idx2, idx3))

# Tapa frontal del morro
snout_tip_idx = len(body_verts)
body_verts.append(Vector((7.6, 0.0, 0.20)))
for j in range(num_segs):
    nj = (j + 1) % num_segs
    body_faces.append((j, nj, snout_tip_idx))

# Tapa trasera redondeada de la rótula peduncular
tail_tip_idx = len(body_verts)
body_verts.append(Vector(( -19.8, 0.0, 0.25)))
last_ring_base = (num_rings - 1) * num_segs
for j in range(num_segs):
    nj = (j + 1) % num_segs
    body_faces.append((last_ring_base + nj, last_ring_base + j, tail_tip_idx))

mesh_body = bpy.data.meshes.new("Mesh_Ballena_Cuerpo")
mesh_body.from_pydata(body_verts, [], body_faces)
mesh_body.update()

obj_body = bpy.data.objects.new("Ballena_Cuerpo", mesh_body)
bpy.context.collection.objects.link(obj_body)
obj_body.data.materials.append(mat_dorsal)
obj_body.data.materials.append(mat_belly)

for p in obj_body.data.polygons:
    p.use_smooth = True
    if p.center.z < 0.20 and p.center.x > -14.0:
        p.material_index = 1
    elif p.center.z < 0.0:
        p.material_index = 1
    else:
        p.material_index = 0

# -------------------------------------------------------------------------
# 2. Ojos Inteligentes Cetáceos con Engarces de Oro
# -------------------------------------------------------------------------
print("Esculpiendo ojos con engarces dorados...")
eye_parts = []
for side in [1, -1]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.40, depth=0.22, location=(3.2, side * 3.45, 0.35), rotation=(0, math.pi / 2, side * 0.15))
    casing = finish_obj(bpy.context.object, f"Ojo_Engarce_{side}", mat_gold, smooth=True)
    eye_parts.append(casing)

    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.33, location=(3.2, side * 3.55, 0.35))
    eye = finish_obj(bpy.context.object, f"Ojo_Pupila_{side}", mat_eye_pupil, smooth=True)
    eye_parts.append(eye)

# -------------------------------------------------------------------------
# 3. Alas Pectorales de Manta Marina con Origen en los Hombros
# -------------------------------------------------------------------------
print("Construyendo alas de manta marina articuladas...")

def make_manta_wing(name, side=1):
    shoulder = Vector((-0.5, side * 3.8, -0.8))
    w_verts = []
    w_faces = []
    
    sections = [
        (0.00,  0.0, 3.6, 0.70,  0.00),
        (0.20, -0.4, 3.2, 0.55, -0.15),
        (0.45, -1.0, 2.6, 0.42, -0.35),
        (0.70, -1.8, 1.9, 0.30, -0.60),
        (0.90, -2.8, 1.2, 0.20, -0.85),
        (1.00, -3.8, 0.5, 0.10, -1.10),
    ]
    span = 7.6
    w_segs = 12

    for t_sp, dx, cord, thick, zd in sections:
        y_loc = side * (t_sp * span)
        for j in range(w_segs):
            a_w = (j / w_segs) * math.pi * 2
            vx = dx - math.cos(a_w) * (cord * 0.5)
            vz = zd + math.sin(a_w) * (thick * 0.5)
            w_verts.append(Vector((vx, y_loc, vz)))

    for i in range(len(sections) - 1):
        for j in range(w_segs):
            nj = (j + 1) % w_segs
            idx0 = i * w_segs + j
            idx1 = i * w_segs + nj
            idx2 = (i + 1) * w_segs + nj
            idx3 = (i + 1) * w_segs + j
            w_faces.append((idx0, idx1, idx2, idx3))

    w_mesh = bpy.data.meshes.new(f"Mesh_{name}")
    w_mesh.from_pydata(w_verts, [], w_faces)
    w_mesh.update()
    w_obj = bpy.data.objects.new(name, w_mesh)
    bpy.context.collection.objects.link(w_obj)
    w_obj.location = shoulder
    finish_obj(w_obj, name, mat_dorsal, smooth=True)
    w_obj.data.materials.append(mat_biolum_turq)

    for poly in w_obj.data.polygons:
        # Franja bioluminiscente en el borde delantero de ataque
        if poly.center.x > 0.4:
            poly.material_index = 1

    return w_obj

wing_left = make_manta_wing("Aleta_Pectoral_Izq", side=1)
wing_right = make_manta_wing("Aleta_Pectoral_Der", side=-1)

# -------------------------------------------------------------------------
# 4. Aleta Caudal Hendida Hidrodinámica 3D Articulada en la Muñeca Caudal
# -------------------------------------------------------------------------
print("Construyendo aletas caudales integradas (flukes de rorcual)...")

tail_pivot = Vector((-19.3, 0.0, 0.25))

fluke_verts = []
fluke_faces = []

ny = 24
nx = 10
fluke_span = 9.6

for iy in range(ny + 1):
    ty = (iy / ny) * 2.0 - 1.0
    u = abs(ty)
    y_pos = ty * (fluke_span * 0.5)

    if u < 0.12:
        x_lead = 0.5 - (u / 0.12) * 0.7
    else:
        u_wing = (u - 0.12) / 0.88
        x_lead = -0.2 - 1.6 * (u_wing ** 1.3)

    notch = 0.65 * math.exp(-16.0 * (u ** 2))
    chord = (2.2 * (1.0 - 0.35 * u) + 0.3 * math.sin(u * math.pi)) * math.sqrt(max(0.04, 1.0 - u * u))
    x_trail = min(x_lead - 0.4, -0.2 - chord + notch)

    thick_blade = (0.26 * (1.0 - 0.70 * u) + 0.04)
    z_dihedral = 0.22 * (u ** 2)

    for ix in range(nx + 1):
        s = ix / nx
        x_pos = x_lead + s * (x_trail - x_lead)
        profile = 4.0 * math.sqrt(max(0.0, s)) * (1.0 - s)
        half_t = profile * thick_blade * 0.5

        if abs(y_pos) < 0.9:
            sleeve_t = max(0.0, 0.45 - 0.15 * (0.5 - x_pos))
            sleeve_falloff = math.cos((y_pos / 0.9) * (math.pi * 0.5)) ** 2
            half_t = max(half_t, sleeve_t * sleeve_falloff)

        fluke_verts.append(Vector((x_pos, y_pos, z_dihedral + half_t)))
        fluke_verts.append(Vector((x_pos, y_pos, z_dihedral - half_t)))

stride = (nx + 1) * 2
for iy in range(ny):
    for ix in range(nx):
        t0 = iy * stride + ix * 2
        t1 = iy * stride + (ix + 1) * 2
        t2 = (iy + 1) * stride + (ix + 1) * 2
        t3 = (iy + 1) * stride + ix * 2
        fluke_faces.append((t0, t3, t2, t1))

        b0 = t0 + 1
        b1 = t1 + 1
        b2 = t2 + 1
        b3 = t3 + 1
        fluke_faces.append((b0, b1, b2, b3))

    la0 = iy * stride
    la1 = (iy + 1) * stride
    fluke_faces.append((la0, la0 + 1, la1 + 1, la1))

    tr0 = iy * stride + nx * 2
    tr1 = (iy + 1) * stride + nx * 2
    fluke_faces.append((tr0, tr1, tr1 + 1, tr0 + 1))

for ix in range(nx):
    p0 = ix * 2
    p1 = (ix + 1) * 2
    fluke_faces.append((p0, p1, p1 + 1, p0 + 1))

    p2 = ny * stride + ix * 2
    p3 = ny * stride + (ix + 1) * 2
    fluke_faces.append((p2, p2 + 1, p3 + 1, p3))

mesh_tail = bpy.data.meshes.new("Mesh_Aleta_Cola")
mesh_tail.from_pydata(fluke_verts, [], fluke_faces)
mesh_tail.update()

obj_tail = bpy.data.objects.new("Aleta_Cola", mesh_tail)
bpy.context.collection.objects.link(obj_tail)
obj_tail.location = tail_pivot
finish_obj(obj_tail, "Aleta_Cola", mat_dorsal, smooth=True)
obj_tail.data.materials.append(mat_belly)
obj_tail.data.materials.append(mat_biolum_turq)

for p in obj_tail.data.polygons:
    if p.center.z < 0.0:
        p.material_index = 1
    # Borde de fuga bioluminiscente en las puntas exteriores
    if abs(p.center.y) > 3.8 and p.center.x < -1.8:
        p.material_index = 2

# Quilla estabilizadora dorsal sobre el pedúnculo
bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.35, depth=2.0, location=(-13.8, 0, 2.7), rotation=(0, math.pi * 0.35, 0))
dorsal_fin = finish_obj(bpy.context.object, "Aleta_Dorsal_Quilla", mat_dorsal, smooth=True)
dorsal_fin.scale = (1.5, 0.22, 0.9)

# -------------------------------------------------------------------------
# 5. Placas Rúnicas y Crestas Bioluminiscentes en el Lomo
# -------------------------------------------------------------------------
print("Esculpiendo placas bioluminiscentes en el lomo...")
crest_parts = [dorsal_fin]

plate_defs = [
    # (x, z, scale, mat)
    (3.5,  2.95, 0.75, mat_biolum_gold),
    (1.5,  3.50, 0.90, mat_biolum_turq),
    (-0.5, 3.70, 1.05, mat_biolum_emerald),
    (-2.5, 3.55, 1.00, mat_biolum_turq),
    (-5.0, 3.30, 0.90, mat_biolum_emerald),
    (-7.5, 2.95, 0.80, mat_biolum_gold),
    (-10.2, 2.45, 0.70, mat_biolum_turq),
]

for p_i, (px, pz, ps, pmat) in enumerate(plate_defs):
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.72 * ps, depth=0.20 * ps, location=(px, 0, pz))
    p_base = finish_obj(bpy.context.object, f"Placa_Base_{p_i}", mat_gold, smooth=False)
    crest_parts.append(p_base)

    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.58 * ps, depth=0.40 * ps, location=(px, 0, pz + 0.16 * ps))
    crystal = finish_obj(bpy.context.object, f"Cristal_Dorsal_{p_i}", pmat, smooth=False)
    crystal.scale = (1.4, 0.75, 1.0)
    crest_parts.append(crystal)

# -------------------------------------------------------------------------
# 6. Arnés Dorsal Victoriano y Argolla de Anclaje de Linternas (z=4.2m)
# -------------------------------------------------------------------------
print("Construyendo arnés victoriano de latón y punto de amarre...")
harness_parts = []
z_harness = 3.6
x_harness = -1.5

# Cincha principal de latón remachado que rodea el lomo
bpy.ops.mesh.primitive_torus_add(major_radius=3.9, minor_radius=0.18, major_segments=24, minor_segments=8, location=(x_harness, 0, 0))
girth_band = finish_obj(bpy.context.object, "Arnes_Cincha_Laton", mat_gold, smooth=True)
girth_band.scale = (1.0, 1.05, 0.96)
harness_parts.append(girth_band)

# Argolla monumental central de amarre a 4.2m en Z (Punto de amarre del acorde 13)
bpy.ops.mesh.primitive_torus_add(major_radius=0.65, minor_radius=0.12, major_segments=16, minor_segments=8, location=(x_harness, 0, 4.25), rotation=(0, math.pi / 2, 0))
anchor_ring = finish_obj(bpy.context.object, "Arnes_Argolla_Cuerda", mat_gold, smooth=True)
harness_parts.append(anchor_ring)

# Faroles victorianos suspendidos en los costados
for side in [1, -1]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.08, depth=1.6, location=(x_harness, side * 3.7, 2.2), rotation=(0, side * math.pi * 0.25, 0))
    bracket = finish_obj(bpy.context.object, f"Arnes_Brazo_{side}", mat_gold, smooth=True)
    harness_parts.append(bracket)

    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.28, depth=0.65, location=(x_harness, side * 4.1, 1.4))
    lamp = finish_obj(bpy.context.object, f"Farol_Cuerpo_{side}", mat_glass_lantern, smooth=True)
    harness_parts.append(lamp)

    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.35, depth=0.3, location=(x_harness, side * 4.1, 1.85))
    lamp_cap = finish_obj(bpy.context.object, f"Farol_Cupula_{side}", mat_gold, smooth=True)
    harness_parts.append(lamp_cap)

# Unir cuerpo, ojos, placas y arnés en la estructura central
bpy.ops.object.select_all(action='DESELECT')
for p in eye_parts + crest_parts + harness_parts + [obj_body]:
    p.select_set(True)
bpy.context.view_layer.objects.active = obj_body
bpy.ops.object.join()
ballena_cuerpo = bpy.context.object
ballena_cuerpo.name = "Ballena_Cuerpo_Central"

# -------------------------------------------------------------------------
# Iluminación de Estudio Estratosférica y Cámara para Render Cycles
# -------------------------------------------------------------------------
print("Configurando iluminacion nocturna estratosférica y cámara...")

bpy.ops.object.light_add(type='SUN', location=(-20.0, -25.0, 20.0))
sun = bpy.context.object
sun.name = "Sol_Estratosferico"
sun.data.energy = 4.2
sun.data.color = (1.0, 0.92, 0.82)
sun.rotation_euler = (math.radians(45), math.radians(-20), math.radians(35))

bpy.ops.object.light_add(type='AREA', location=(10.0, 15.0, -12.0))
aurora = bpy.context.object
aurora.name = "Resplandor_Aurora"
aurora.data.shape = 'DISK'
aurora.data.size = 35.0
aurora.data.energy = 650.0
aurora.data.color = (0.15, 0.85, 0.72)
aurora.rotation_euler = (math.radians(60), math.radians(-15), math.radians(45))

bpy.context.scene.world.use_nodes = True
bg_node = bpy.context.scene.world.node_tree.nodes.get("Background")
if bg_node:
    bg_node.inputs['Color'].default_value = (0.02, 0.05, 0.12, 1.0)
    bg_node.inputs['Strength'].default_value = 0.50

# Cámara heroica encuadrando la ballena completa con su cola integrada
bpy.ops.object.camera_add(location=(24.0, -25.0, 12.0))
cam = bpy.context.object
cam.name = "Camara_Hero_Ballena"
cam.data.lens = 42
look_target = Vector((-4.0, 0.0, 0.5))
direction = look_target - cam.location
cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()

scene = bpy.context.scene
scene.camera = cam
scene.view_settings.view_transform = 'Standard'

# -------------------------------------------------------------------------
# Exportaciones (.blend, .glb, render Cycles)
# -------------------------------------------------------------------------
blend_path = ROOT / "ballena-celeste.blend"
glb_path = ROOT / "ballena-celeste.glb"
preview_path = ROOT / "ballena-celeste-preview.png"

print("Guardando escena .blend...")
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

print("Exportando modelo .glb optimizado...")
bpy.ops.object.select_all(action='DESELECT')
ballena_cuerpo.select_set(True)
wing_left.select_set(True)
wing_right.select_set(True)
obj_tail.select_set(True)
bpy.context.view_layer.objects.active = ballena_cuerpo
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

total_polys = len(ballena_cuerpo.data.polygons) + len(wing_left.data.polygons) + len(wing_right.data.polygons) + len(obj_tail.data.polygons)
print(f"EXITO: La Gran Ballena Celeste regenerada con cola integrada. Polígonos totales: {total_polys}")
print(f"Archivos creados en: {ROOT}")
