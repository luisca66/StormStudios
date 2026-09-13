"""Pez Prisma, authored with Blender bpy. Exports editable blend, GLB, JSON and Cycles preview."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
DATA=ROOT.parent.parent/'src/3d/creatures/assets'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def mat(name,color,metal=0,rough=.35,alpha=1):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,alpha);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;p.inputs['Alpha'].default_value=alpha
    if alpha<1:m.surface_render_method='DITHERED'
    return m
silver=mat('Escamas plata y petroleo',(1,1,1),.48,.33)
iris=mat('Iris plata dorada',(.52,.48,.30),.5,.25)
black=mat('Pupila y boca',(.003,.009,.012),.1,.16)
finmat=mat('Membranas de aletas',(.25,.39,.34),.12,.45,.45)
raymat=mat('Radios y operculo',(.15,.25,.23),.28,.36)

def mesh(name,verts,faces,material,part='body',colors=None):
    d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update()
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.data.materials.append(material);o['part']=part
    for p in d.polygons:p.use_smooth=True
    if colors:
        attr=d.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='POINT')
        for i,c in enumerate(colors):attr.data[i].color=(*c,1)
        n=material.node_tree.nodes.new('ShaderNodeVertexColor');n.layer_name='Pigment'
        material.node_tree.links.new(n.outputs['Color'],material.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    return o

# Nose points +X in Blender (+Z after conversion). Hand-shaped cross sections.
rings=[(-.87,.045,.06),(-.74,.058,.09),(-.60,.083,.14),(-.42,.115,.21),(-.22,.141,.265),(0,.151,.29),(.22,.15,.29),(.42,.137,.265),(.59,.118,.225),(.73,.096,.18),(.84,.071,.125),(.94,.038,.063),(1.0,.008,.018)]
verts=[];faces=[];colors=[];N=32
for ri,(x,w,h) in enumerate(rings):
    for j in range(N):
        a=j*math.tau/N;y=w*math.cos(a);z=h*math.sin(a)
        verts.append((x,y,z))
        top=max(0,(math.sin(a)-.12)/.88)**.65
        base=Vector((.64,.73,.71)).lerp(Vector((.012,.12,.13)),top)
        # Alternating scale glints remain vertex colors in both GLB and runtime.
        glint=.94+.06*math.cos(ri*3+j*2.5)
        if math.sin(a)<-.3:base=base.lerp(Vector((.82,.82,.70)),(-math.sin(a)-.3)*.5)
        colors.append(tuple(base*glint))
for i in range(len(rings)-1):
    for j in range(N):
        a=i*N+j;b=i*N+(j+1)%N;faces.append((a,b,b+N,a+N))
faces.extend([tuple(reversed(range(N))),tuple((len(rings)-1)*N+j for j in range(N))])
mesh('Cuerpo fusiforme',verts,faces,silver,colors=colors)

def line(name,points,r,material,part='body'):
    vs=[];fs=[];sides=4
    for i,p in enumerate(points):
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        tangent.normalize();u=tangent.cross(Vector((0,1,0)))
        if u.length<.01:u=tangent.cross(Vector((0,0,1)))
        u.normalize();v=tangent.cross(u).normalized()
        for j in range(sides):vs.append(tuple(Vector(p)+r*(math.cos(j*math.tau/sides)*u+math.sin(j*math.tau/sides)*v)))
    for i in range(len(points)-1):
        for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;fs.append((a,b,b+sides,a+sides))
    return mesh(name,vs,fs,material,part)

for side in (-1,1):
    for material,loc,scale,name in [(iris,(.70,side*.097,.072),(.072,.014,.072),'Iris'),(black,(.711,side*.109,.075),(.047,.006,.047),'Pupila')]:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=loc)
        o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(material);o['part']='body'
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        for p in o.data.polygons:p.use_smooth=True
    line('Operculo',[(.49+.065*math.cos(t),side*(.123+.009*math.sin(t)),.19*math.sin(t)) for t in [(-1.4+i*2.8/20) for i in range(21)]],.006,raymat)
    line('Boca',[(.99,side*.016,-.012),(.91,side*.057,-.035),(.83,side*.075,-.046)],.004,black)

def fin(name,outline,part='body'):
    # Fan with explicit rays, a slightly curved membrane and thin silhouette.
    center=outline[0];faces=[(0,i,i+1) for i in range(1,len(outline)-1)]
    mesh(name,outline,faces,finmat,part)
    for i in range(1,len(outline)-1):
        for k in range(3):
            end=tuple(Vector(outline[i]).lerp(Vector(outline[i+1]),k/3))
            line(name+' radio',[center,tuple(Vector(center).lerp(Vector(end),.5)+Vector((0,.004,0))),end],.002,raymat,part)

fin('Dorsal',[(.30,0,.25),(.18,0,.50),(.06,.008,.43),(-.08,.01,.34),(-.29,0,.22)])
fin('Anal',[(-.21,0,-.22),(-.39,0,-.36),(-.55,.005,-.23),(-.63,0,-.12)])
for side in (-1,1):
    fin('Pectoral',[(.42,side*.13,-.06),(.19,side*.32,-.17),(-.04,side*.24,-.22),(.12,side*.13,-.10)])
    fin('Pelvica',[(.02,side*.085,-.26),(-.21,side*.16,-.37),(-.25,side*.07,-.25)])
# Independent tail pivot; the open V between the lobes is preserved.
fin('Cola bifurcada',[(-.82,0,0),(-1.27,0,.32),(-1.20,.006,.13),(-1.04,.008,0),(-1.20,.006,-.13),(-1.27,0,-.32)],'tail')

def surface(x,zfraction,side):
    for i in range(len(rings)-1):
        lo,hi=rings[i],rings[i+1]
        if lo[0]<=x<=hi[0]:
            t=(x-lo[0])/(hi[0]-lo[0]);w=lo[1]*(1-t)+hi[1]*t;h=lo[2]*(1-t)+hi[2]*t
            return (x,side*(w*math.sqrt(1-zfraction*zfraction)+.0015),h*zfraction)
    raise ValueError(x)
for side in (-1,1):
    for row,z in enumerate((-.55,-.22,.12,.45)):
        for col in range(9):
            x=-.52+col*.10+(row%2)*.04
            points=[surface(x+.020*math.cos(a),z+.12*math.sin(a),side) for a in [(-1.25+i*2.5/5) for i in range(6)]]
            line('Borde de escama',points,.0012,raymat)

# Merge by material and animated part: seven draws for an entire school, not per fish.
for part in ('body','tail'):
    for material in (silver,iris,black,finmat,raymat):
        objs=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('part')==part and o.data.materials[0]==material]
        if not objs:continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:o.select_set(True)
        bpy.context.view_layer.objects.active=objs[0]
        if len(objs)>1:bpy.ops.object.join()
        o=bpy.context.object;o.name=part+' '+material.name
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        if part=='tail':
            for v in o.data.vertices:v.co.x+=.86
            o.location.x=-.86

bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();out=[]
for o in list(bpy.context.scene.objects):
    ev=o.evaluated_get(dg);me=ev.to_mesh();me.calc_loop_triangles();pos=[];norm=[];indices=[];colors=[];lookup={}
    ca=me.color_attributes.get('Pigment')
    for tri in me.loop_triangles:
        for li in tri.loops:
            vi=me.loops[li].vertex_index;p=me.vertices[vi].co;n=me.corner_normals[li].vector
            c=tuple(ca.data[vi].color[:3]) if ca else (1,1,1)
            key=tuple(round(v,5) for v in (p.y,p.z,p.x,n.y,n.z,n.x,*c))
            if key not in lookup:lookup[key]=len(pos)//3;pos.extend(key[:3]);norm.extend(key[3:6]);colors.extend(key[6:])
            indices.append(lookup[key])
    m=o.data.materials[0];p=m.node_tree.nodes['Principled BSDF']
    out.append(dict(name=o.name,part=o['part'],pivot=[o.location.y,o.location.z,o.location.x],position=pos,normal=norm,index=indices,vertexColor=colors,color=list(m.diffuse_color[:3]),alpha=m.diffuse_color[3],metalness=p.inputs['Metallic'].default_value,roughness=p.inputs['Roughness'].default_value))
    ev.to_mesh_clear()
(DATA/'pez-prisma.json').write_text(json.dumps(dict(generator='Blender '+bpy.app.version_string,axis='Y_UP',forward='+Z',meshes=out),separators=(',',':')),encoding='utf-8')

scene=bpy.context.scene;scene.frame_start=1;scene.frame_end=25;scene.render.fps=24
for o in scene.objects:
    if o['part']!='tail':continue
    for f in (1,7,13,19,25):
        o.rotation_euler.z=.30*math.sin((f-1)/24*math.tau);o.keyframe_insert(data_path='rotation_euler',frame=f)
scene.frame_set(1)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(ROOT/'pez-prisma.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_apply=True)
world=bpy.data.worlds.new('Estudio marino');world.use_nodes=True;scene.world=world
world.node_tree.nodes['Background'].inputs[0].default_value=(.025,.06,.085,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
for loc,power,size in [((1,-3,4),350,4),((-2,-2,0),230,3),((0,3,2),450,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=size;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(1.3,-5,1.25));cam=bpy.context.object;cam.rotation_euler=(Vector((-.12,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.1;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=1400;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.filepath=str(ROOT/'pez-prisma-preview.png')
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'pez-prisma.blend'));bpy.ops.render.render(write_still=True)
print('PRISMA_OK',len(out),'meshes',sum(len(m['index'])//3 for m in out),'triangles')
