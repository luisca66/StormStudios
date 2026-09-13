"""Modelado procedural de Nubes Cúmulo 3D (Hero Cloud Formation) para Aerostato.
Ejecutar con Blender 4.5.3 LTS (bpy) y Python 3.11:
powershell -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 apps-src\\acordes-cantar-juego\\art\\blender\\modelar-nube.py
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
# Materiales PBR y Sombreado de Nube
# -------------------------------------------------------------------------
def create_cloud_material(name):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()

    node_output = nodes.new(type='ShaderNodeOutputMaterial')
    node_output.location = (500, 0)

    node_bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
    node_bsdf.location = (200, 0)

    # Nodo de Atributo de Color para gradiente vertical
    node_attr = nodes.new(type='ShaderNodeAttribute')
    node_attr.location = (-100, 0)
    node_attr.attribute_name = "ColorGradiente"
    node_attr.attribute_type = 'GEOMETRY'

    # Conectar color de vértice a Base Color
    mat.node_tree.links.new(node_attr.outputs['Color'], node_bsdf.inputs['Base Color'])

    node_bsdf.inputs['Roughness'].default_value = 0.78
    node_bsdf.inputs['Alpha'].default_value = 0.85

    if 'Subsurface Weight' in node_bsdf.inputs:
        node_bsdf.inputs['Subsurface Weight'].default_value = 0.28
        if 'Subsurface Radius' in node_bsdf.inputs:
            node_bsdf.inputs['Subsurface Radius'].default_value = (1.0, 0.82, 0.65)
    elif 'Subsurface' in node_bsdf.inputs:
        node_bsdf.inputs['Subsurface'].default_value = 0.28

    mat.node_tree.links.new(node_bsdf.outputs['BSDF'], node_output.inputs['Surface'])
    return mat

cloud_mat = create_cloud_material('Material_Nube_Cumulo')

# -------------------------------------------------------------------------
# Deformación orgánica procedural de lóbulos
# -------------------------------------------------------------------------
def create_deformed_puff(name, center, radius, scale=(1.0, 1.0, 1.0), seed=0, flatten_base=True):
    rng = random.Random(seed)
    f1 = 2.2 + rng.random() * 0.6
    f2 = 4.2 + rng.random() * 0.8
    f3 = 1.2 + rng.random() * 0.4
    p1 = rng.random() * math.pi * 2
    p2 = rng.random() * math.pi * 2
    p3 = rng.random() * math.pi * 2
    amp = 0.18 * radius

    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=radius, location=(0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    mesh = obj.data

    for v in mesh.vertices:
        p = v.co
        r = p.length
        if r > 0.0001:
            theta = math.acos(max(-1.0, min(1.0, p.z / r)))
            phi = math.atan2(p.y, p.x)
            # Ondulaciones orgánicas multifrecuencia
            disp = math.sin(theta * f1 + p1) * math.cos(phi * f1 + p2) * amp
            disp += math.sin(theta * f2 + p2) * math.sin(phi * f2 + p3) * (amp * 0.45)
            disp += math.cos(theta * f3 - p3) * (amp * 0.3)
            new_r = r + disp
            new_p = Vector((p.x * (new_r / r) * scale[0],
                            p.y * (new_r / r) * scale[1],
                            p.z * (new_r / r) * scale[2]))
            if flatten_base and new_p.z < 0.0:
                new_p.z *= 0.30
            v.co = new_p

    mesh.update()
    obj.location = center
    return obj

print("Generando torres y cupulas diferenciadas...")

# 3 Torres Cúmulo con valles y terrazas escalonadas (Estilo Miyazaki / Ghibli)
puff_defs = [
    # --- TORRE CENTRAL MAYOR (Cumbre más alta) ---
    {"pos": (0.0, 0.5, 3.8), "r": 2.2, "scale": (1.1, 1.05, 1.2), "seed": 101},
    {"pos": (-0.4, 0.9, 4.4), "r": 1.7, "scale": (1.0, 1.1, 1.25), "seed": 102},
    {"pos": (0.5, 0.2, 4.1), "r": 1.8, "scale": (1.1, 1.0, 1.15), "seed": 103},
    {"pos": (-0.2, -0.4, 3.3), "r": 2.1, "scale": (1.15, 1.1, 1.1), "seed": 104},
    {"pos": (0.3, 1.5, 3.4), "r": 1.7, "scale": (1.05, 1.2, 1.1), "seed": 105},
    {"pos": (-0.7, -0.2, 2.7), "r": 1.6, "scale": (1.1, 1.0, 1.0), "seed": 106},

    # --- TORRE ESTE (Hombro derecho prominente) ---
    {"pos": (2.8, -0.2, 2.7), "r": 2.1, "scale": (1.1, 1.05, 1.2), "seed": 201},
    {"pos": (3.2, 0.4, 3.3), "r": 1.6, "scale": (1.0, 1.1, 1.2), "seed": 202},
    {"pos": (2.2, -0.8, 2.4), "r": 1.7, "scale": (1.1, 1.1, 1.05), "seed": 203},
    {"pos": (3.8, -0.5, 2.1), "r": 1.5, "scale": (1.15, 1.0, 0.95), "seed": 204},
    {"pos": (3.4, 1.2, 2.3), "r": 1.4, "scale": (1.0, 1.15, 1.0), "seed": 205},

    # --- TORRE OESTE (Hombro izquierdo en cascada) ---
    {"pos": (-2.6, 0.2, 2.5), "r": 2.0, "scale": (1.1, 1.1, 1.15), "seed": 301},
    {"pos": (-3.0, 0.8, 3.0), "r": 1.5, "scale": (1.0, 1.1, 1.2), "seed": 302},
    {"pos": (-2.1, -0.7, 2.1), "r": 1.7, "scale": (1.15, 1.0, 1.05), "seed": 303},
    {"pos": (-3.6, -0.4, 1.8), "r": 1.5, "scale": (1.2, 1.0, 0.9), "seed": 304},
    {"pos": (-3.1, 1.4, 1.9), "r": 1.4, "scale": (1.0, 1.2, 0.95), "seed": 305},

    # --- LÓBULOS FRONTALES Y VOLÚMENES BAJOS ---
    {"pos": (1.1, -1.6, 1.8), "r": 1.6, "scale": (1.2, 1.1, 0.95), "seed": 401},
    {"pos": (-1.2, -1.5, 1.7), "r": 1.6, "scale": (1.1, 1.2, 0.95), "seed": 402},
    {"pos": (0.0, -1.9, 1.4), "r": 1.5, "scale": (1.2, 1.1, 0.85), "seed": 403},
    {"pos": (2.2, -1.8, 1.3), "r": 1.4, "scale": (1.1, 1.1, 0.85), "seed": 404},
    {"pos": (-2.3, -1.7, 1.3), "r": 1.4, "scale": (1.1, 1.1, 0.85), "seed": 405},

    # --- BASE PLANA CONTINUA (Nivel de condensación inferior) ---
    {"pos": (0.0, 0.0, 0.6), "r": 3.0, "scale": (1.4, 1.3, 0.55), "seed": 501},
    {"pos": (-2.2, 0.0, 0.5), "r": 2.4, "scale": (1.3, 1.2, 0.5), "seed": 502},
    {"pos": (2.3, 0.0, 0.5), "r": 2.5, "scale": (1.3, 1.2, 0.5), "seed": 503},
    {"pos": (0.0, 1.8, 0.5), "r": 2.2, "scale": (1.2, 1.3, 0.5), "seed": 504},
    {"pos": (-1.5, 2.2, 0.6), "r": 1.9, "scale": (1.2, 1.1, 0.5), "seed": 505},
    {"pos": (1.6, 2.1, 0.6), "r": 1.9, "scale": (1.2, 1.1, 0.5), "seed": 506},
]

puff_objs = []
for i, p in enumerate(puff_defs):
    obj = create_deformed_puff(f"Puff_{i:02d}", p["pos"], p["r"], p["scale"], p["seed"])
    puff_objs.append(obj)

bpy.ops.object.select_all(action='DESELECT')
for obj in puff_objs:
    obj.select_set(True)
bpy.context.view_layer.objects.active = puff_objs[0]
bpy.ops.object.join()
hero_cloud = bpy.context.object
hero_cloud.name = "Nube_Cumulo_Principal"

bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

print("Aplicando fusion voxel y normales suaves...")
mod_remesh = hero_cloud.modifiers.new(name="VoxelFusion", type='REMESH')
mod_remesh.mode = 'VOXEL'
mod_remesh.voxel_size = 0.12  # Gran definición en las hendiduras entre cúpulas
mod_remesh.use_smooth_shade = True
bpy.ops.object.modifier_apply(modifier=mod_remesh.name)

mod_smooth = hero_cloud.modifiers.new(name="CloudSmooth", type='SMOOTH')
mod_smooth.factor = 0.20
mod_smooth.iterations = 1
bpy.ops.object.modifier_apply(modifier=mod_smooth.name)

mod_wn = hero_cloud.modifiers.new(name="WeightedNormal", type='WEIGHTED_NORMAL')
mod_wn.keep_sharp = False
bpy.ops.object.modifier_apply(modifier=mod_wn.name)

for poly in hero_cloud.data.polygons:
    poly.use_smooth = True

hero_cloud.data.materials.append(cloud_mat)

def apply_cloud_vertex_colors(obj):
    color_attr = obj.data.color_attributes.new(
        name="ColorGradiente",
        type='FLOAT_COLOR',
        domain='CORNER'
    )
    obj.data.color_attributes.active_color = color_attr

    # Paleta saturada de amanecer: sombras azul zafiro / lavanda, cuerpo albaricoque, crestas oro
    color_deep_shadow = Vector((0.24, 0.32, 0.52, 1.0))   # Azul atmósfera profundo en la base
    color_mid_cream   = Vector((0.96, 0.84, 0.70, 1.0))   # Crema melocotón cálido
    color_sun_crest   = Vector((1.00, 0.94, 0.80, 1.0))   # Oro iluminado

    z_min = min(v.co.z for v in obj.data.vertices)
    z_max = max(v.co.z for v in obj.data.vertices)
    z_range = max(0.001, z_max - z_min)

    mesh = obj.data
    for loop in mesh.loops:
        vz = mesh.vertices[loop.vertex_index].co.z
        t = (vz - z_min) / z_range
        if t < 0.30:
            sub_t = t / 0.30
            c = color_deep_shadow.lerp(color_mid_cream, sub_t)
        else:
            sub_t = (t - 0.30) / 0.70
            c = color_mid_cream.lerp(color_sun_crest, sub_t)
        color_attr.data[loop.index].color = (c.x, c.y, c.z, 1.0)

print("Generando gradiente de color de vertices...")
apply_cloud_vertex_colors(hero_cloud)

def create_wisp_cloud(name, location, scale=1.0, seed=500):
    wisp_puffs = [
        {"pos": (0.0, 0.0, 0.3 * scale), "r": 1.2 * scale, "scale": (1.1, 1.0, 0.9), "seed": seed + 1},
        {"pos": (-0.8 * scale, 0.2 * scale, 0.1 * scale), "r": 0.9 * scale, "scale": (1.2, 0.9, 0.8), "seed": seed + 2},
        {"pos": (0.9 * scale, -0.2 * scale, 0.15 * scale), "r": 0.85 * scale, "scale": (1.1, 1.1, 0.8), "seed": seed + 3},
        {"pos": (0.2 * scale, 0.7 * scale, 0.1 * scale), "r": 0.75 * scale, "scale": (0.9, 1.2, 0.75), "seed": seed + 4},
    ]
    objs = []
    for i, p in enumerate(wisp_puffs):
        o = create_deformed_puff(f"{name}_Puff_{i}", p["pos"], p["r"], p["scale"], p["seed"])
        objs.append(o)
    
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    wisp = bpy.context.object
    wisp.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    rem = wisp.modifiers.new(name="Remesh", type='REMESH')
    rem.mode = 'VOXEL'
    rem.voxel_size = 0.12 * scale
    rem.use_smooth_shade = True
    bpy.ops.object.modifier_apply(modifier=rem.name)

    sm = wisp.modifiers.new(name="Smooth", type='SMOOTH')
    sm.factor = 0.20
    sm.iterations = 1
    bpy.ops.object.modifier_apply(modifier=sm.name)

    for poly in wisp.data.polygons:
        poly.use_smooth = True
    wisp.data.materials.append(cloud_mat)
    apply_cloud_vertex_colors(wisp)
    wisp.location = location
    return wisp

wisp_a = create_wisp_cloud("Nube_Satelite_Este", (6.8, 2.8, 1.2), scale=1.1, seed=600)
wisp_b = create_wisp_cloud("Nube_Satelite_Oeste", (-7.2, -2.5, 1.6), scale=0.85, seed=700)

print("Configurando iluminacion atmosferica y camara...")
# Luz solar lateral dorada (Luz rasante a 60° del eje de visión para esculpir sombras)
bpy.ops.object.light_add(type='SUN', location=(-8.0, -12.0, 9.0))
sun = bpy.context.object
sun.name = "Sol_Amanecer"
sun.data.energy = 3.6
sun.data.color = (1.0, 0.84, 0.62) # Oro cálido
sun.rotation_euler = (math.radians(42), math.radians(-24), math.radians(45))

# Luz ambiental suave de cielo azul
bpy.ops.object.light_add(type='AREA', location=(6.0, 8.0, 10.0))
fill = bpy.context.object
fill.name = "Luz_Cielo_Relleno"
fill.data.shape = 'DISK'
fill.data.size = 18.0
fill.data.energy = 320.0
fill.data.color = (0.45, 0.62, 0.95)
fill.rotation_euler = (math.radians(-45), math.radians(20), math.radians(-130))

# Contraluz / rim light para iluminar las crestas superiores desde atrás
bpy.ops.object.light_add(type='AREA', location=(1.0, 11.0, 6.0))
rim = bpy.context.object
rim.name = "Contraluz_Silueta"
rim.data.shape = 'RECTANGLE'
rim.data.size = 20.0
rim.data.size_y = 10.0
rim.data.energy = 750.0
rim.data.color = (1.0, 0.92, 0.78)
rim.rotation_euler = (math.radians(-100), 0, math.radians(180))

bpy.context.scene.world.use_nodes = True
bg_node = bpy.context.scene.world.node_tree.nodes.get("Background")
if bg_node:
    bg_node.inputs['Color'].default_value = (0.22, 0.38, 0.60, 1.0) # Fondo azul cielo nítido
    bg_node.inputs['Strength'].default_value = 0.75

# Cámara en encuadre cinematográfico heroico
bpy.ops.object.camera_add(location=(12.0, -13.0, 4.8))
cam = bpy.context.object
cam.name = "Camara_Hero"
cam.data.lens = 46
look_target = Vector((0.0, 0.2, 2.2))
direction = look_target - cam.location
rot_quat = direction.to_track_quat('-Z', 'Y')
cam.rotation_euler = rot_quat.to_euler()

scene = bpy.context.scene
scene.camera = cam

blend_path = ROOT / "nube-cumulo.blend"
glb_path = ROOT / "nube-cumulo.glb"
preview_path = ROOT / "nube-cumulo-preview.png"

print("Guardando escena .blend...")
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

print("Exportando modelo .glb...")
bpy.ops.object.select_all(action='DESELECT')
hero_cloud.select_set(True)
wisp_a.select_set(True)
wisp_b.select_set(True)
bpy.context.view_layer.objects.active = hero_cloud
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

tri_count = len(hero_cloud.data.polygons) + len(wisp_a.data.polygons) + len(wisp_b.data.polygons)
print(f"EXITO: Nube generada correctamente. Total poligonos: {tri_count}")
print(f"Archivos creados en: {ROOT}")
