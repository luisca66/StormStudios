"""Medusa Luna: authored and evaluated in Blender 4.5 bpy; no runtime primitives.
Run with Python 3.11 and the existing codex-blender/python-module on sys.path.
Outputs editable blend, animated GLB, Cycles preview and indexed game geometry.
"""
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
DATA = ROOT.parent.parent / 'src/3d/creatures/assets'
ROOT.mkdir(parents=True, exist_ok=True)
DATA.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, emission, strength, alpha=1):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, alpha)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = .28
    p.inputs['Emission Color'].default_value = (*emission, 1)
    p.inputs['Emission Strength'].default_value = strength
    p.inputs['Alpha'].default_value = alpha
    if alpha < 1:
        m.surface_render_method = 'DITHERED'
    return m

# Palette sampled visually from the user's pink/plum jellyfish reference.
pearl = material('Membrana rosa translucida', (.46,.065,.24), (.48,.045,.18), .12, .52)
rim = material('Borde malva', (.32,.055,.19), (.34,.055,.16), .08)
vein = material('Filamentos rosa palido', (.72,.30,.39), (.66,.23,.32), .10)
heart = material('Roseta frambuesa', (.48,.012,.13), (.60,.018,.16), .18)
silk = material('Brazos ciruela', (.22,.018,.085), (.30,.025,.10), .06)
pigment = material('Motas berenjena', (.038,.002,.019), (.038,.002,.019), 0)

def mesh(name, vertices, faces, mat, part='bell', pivot=(0,0,0)):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for p in data.polygons:
        p.use_smooth = True
    obj['part'] = part
    # Store actual local pivot: both GLB and JSON retain independent animation.
    for v in data.vertices:
        v.co -= Vector(pivot)
    obj.location = pivot
    return obj

def tubes(name, paths, radius, mat, part='bell', sides=5, pivot=(0,0,0)):
    vertices, faces = [], []
    for path in paths:
        offset = len(vertices)
        for i, point in enumerate(path):
            point = Vector(point)
            tangent = Vector(path[min(i+1,len(path)-1)]) - Vector(path[max(i-1,0)])
            tangent.normalize()
            ref = Vector((0,0,1)) if abs(tangent.z) < .9 else Vector((1,0,0))
            u = tangent.cross(ref).normalized()
            v = tangent.cross(u).normalized()
            r = radius * (1 - .72 * i / max(1,len(path)-1)) if part.startswith('tentacle') else radius
            for j in range(sides):
                a = j * math.tau / sides
                vertices.append(tuple(point+r*(math.cos(a)*u+math.sin(a)*v)))
        for i in range(len(path)-1):
            for j in range(sides):
                a = offset+i*sides+j
                b = offset+i*sides+(j+1)%sides
                faces.append((a,b,b+sides,a+sides))
    return mesh(name, vertices, faces, mat, part, pivot)

def bell_point(t,a):
    r = 1.12 * math.sin(t*math.pi/2)
    r *= 1 + .024 * math.cos(16*a) * t**5
    z = .70 * math.cos(t*math.pi/2) + .045*math.cos(16*a)*t**6
    return (r*math.cos(a),r*math.sin(a),z)

# Quad-built organic bell, with Blender subdivision and a rolled scalloped lip.
verts = [(0,0,.70)]
faces = []
N, R = 64, 12
for i in range(1,R+1):
    for j in range(N):
        verts.append(bell_point(i/R,j*math.tau/N))
for j in range(N):
    faces.append((0,1+j,1+(j+1)%N))
for i in range(R-1):
    for j in range(N):
        a=1+i*N+j; b=1+i*N+(j+1)%N
        faces.append((a,a+N,b+N,b))
bell=mesh('Campana ondulada',verts,faces,pearl)
sub=bell.modifiers.new('Superficie organica','SUBSURF'); sub.levels=1
# Flat pigment patches follow the existing bell surface, leaving its anatomy intact.
patch_vertices, patch_faces = [], []
for j in range(24):
    for row in range(2):
        center_a = j*math.tau/24 + .018*math.sin(j*3+row)
        center_t = .70 + row*.18 + .027*math.sin(j*2.3)
        offset = len(patch_vertices)
        def pigment_point(t,a):
            x,y,z=bell_point(t,a)
            return (x*1.004,y*1.004,z+.004)
        patch_vertices.append(pigment_point(center_t,center_a))
        for k in range(16):
            angle=k*math.tau/16
            irregular=1+.24*math.sin(k*2.4+j)
            patch_vertices.append(pigment_point(center_t+.048*math.cos(angle)*irregular,center_a+.027*math.sin(angle)*irregular))
        for k in range(16):
            patch_faces.append((offset,offset+1+k,offset+1+(k+1)%16))
mesh('Pigmentacion de la campana',patch_vertices,patch_faces,pigment)
tubes('Labio festoneado',[[bell_point(1,j*math.tau/128) for j in range(129)]],.023,rim,sides=6)
paths=[]
for j in range(24):
    a=j*math.tau/24
    paths.append([bell_point(.26+.71*i/22,a+.009*math.sin(i*.8)) for i in range(23)])
tubes('Canales de la campana',paths,.008,vein,sides=4)
paths=[]
for j in range(4):
    a=j*math.tau/4+math.pi/4
    path=[]
    for i in range(49):
        t=i*math.tau/48
        x=.29+.17*math.cos(t); y=.115*math.sin(t)
        path.append((x*math.cos(a)-y*math.sin(a),x*math.sin(a)+y*math.cos(a),.40+.035*math.cos(t)))
    paths.append(path)
tubes('Roseta interior',paths,.027,heart,sides=6)

# Four ruffled oral arms: continuous ribbon surfaces, not cylinders.
for arm in range(4):
    a=arm*math.tau/4+math.pi/4
    vs,fs=[],[]
    for i in range(41):
        t=i/40
        cx=.18*math.cos(a)+.18*math.sin(t*5+arm)*t
        cy=.18*math.sin(a)+.12*math.cos(t*6+arm)*t
        width=.17*(1-t)**.7+.002
        for j in range(5):
            s=(j/4)*2-1
            wave=.045*math.sin(t*math.tau*6+arm)*abs(s)**1.5*(1-t)**.5
            vs.append((cx+s*width*math.cos(a),cy+s*width*math.sin(a)+wave,.15-1.75*t+.025*math.cos(t*14+s*3)))
    for i in range(40):
        for j in range(4):
            n=i*5+j; fs.append((n,n+1,n+6,n+5))
    obj=mesh('Brazo oral %02d'%arm,vs,fs,silk,'arm',(.18*math.cos(a),.18*math.sin(a),.15))
    solid=obj.modifiers.new('Membrana fina','SOLIDIFY'); solid.thickness=.009

# Eight independent clusters for the existing note-by-note lighting mechanic.
for j in range(8):
    a=j*math.tau/8
    paths=[]
    for k in range(3):
        angle=a+(k-1)*.07
        length=1.30+.32*math.sin(j*2.1+k)
        path=[]
        for i in range(27):
            t=i/26
            r=1.07+.14*math.sin(t*4+j)*t
            path.append((r*math.cos(angle)+.09*math.sin(t*7+j)*t,r*math.sin(angle)+.08*math.cos(t*8+j)*t,-.015-length*t))
        paths.append(path)
    tubes('Filamentos %02d'%j,paths,.011,vein,'tentacle',sides=4,pivot=(1.07*math.cos(a),1.07*math.sin(a),0))

# Serialize evaluated mesh positions/normals, indexed to keep the web asset small.
bpy.context.view_layer.update()
dg=bpy.context.evaluated_depsgraph_get()
out=[]
for obj in list(bpy.context.scene.objects):
    if obj.type != 'MESH': continue
    evaluated=obj.evaluated_get(dg); data=evaluated.to_mesh(); data.calc_loop_triangles()
    positions=[]; normals=[]; indices=[]; lookup={}
    for tri in data.loop_triangles:
        for li in tri.loops:
            p=data.vertices[data.loops[li].vertex_index].co; n=data.corner_normals[li].vector
            key=tuple(round(v,5) for v in (p.x,p.z,-p.y,n.x,n.z,-n.y))
            if key not in lookup:
                lookup[key]=len(positions)//3; positions.extend(key[:3]); normals.extend(key[3:])
            indices.append(lookup[key])
    m=obj.data.materials[0]; p=m.node_tree.nodes.get('Principled BSDF')
    out.append(dict(name=obj.name,part=obj['part'],pivot=[obj.location.x,obj.location.z,-obj.location.y],position=positions,normal=normals,index=indices,color=list(m.diffuse_color[:3]),alpha=m.diffuse_color[3],emission=p.inputs['Emission Strength'].default_value,emissionColor=list(p.inputs['Emission Color'].default_value[:3])))
    evaluated.to_mesh_clear()
payload=dict(generator='Blender '+bpy.app.version_string,axis='Y_UP',meshes=out)
(DATA/'medusa-luna.json').write_text(json.dumps(payload,separators=(',',':')),encoding='utf-8')

# Object animation in the editable .blend and exported .glb (4 second loop).
scene=bpy.context.scene; scene.frame_start=1; scene.frame_end=97; scene.render.fps=24
for obj in list(scene.objects):
    for frame in (1,25,49,73,97):
        phase=(frame-1)/96*math.tau
        if obj['part']=='bell':
            pulse=1+.06*math.sin(phase)
            obj.scale=(1/math.sqrt(pulse),1/math.sqrt(pulse),pulse)
            obj.keyframe_insert(data_path='scale',frame=frame)
        else:
            obj.rotation_euler.x=.07*math.sin(phase+obj.location.x)
            obj.rotation_euler.y=.06*math.cos(phase+obj.location.y)
            obj.keyframe_insert(data_path='rotation_euler',frame=frame)
scene.frame_set(1)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(ROOT/'medusa-luna.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_apply=True)

# Cycles portrait: pearl/cyan membranes against deep marine blue.
world=bpy.data.worlds.new('Agua profunda');scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.008,.026,.046,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.35
for loc,power,color,size in [((3,-4,5),500,(1,.93,.94),4),((-3,-1,1),350,(.70,.85,1),3),((0,3,3),650,(.90,.80,1),3)]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    o=bpy.context.object;o.data.energy=power;o.data.color=color;o.data.shape='DISK';o.data.size=size
    o.rotation_euler=(Vector((0,0,-.3))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(3.4,-6.5,2.1))
camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,-.42))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=4.6;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=1100;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.render.filepath=str(ROOT/'medusa-luna-preview.png')
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'medusa-luna.blend'))
bpy.ops.render.render(write_still=True)
print('MEDUSA_OK',len(out),'meshes',sum(len(o['index'])//3 for o in out),'triangles')
