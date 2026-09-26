"""Batisfera: catedrales minerales. Ejecutar exclusivamente con bpy-run.ps1.

Autoría en coordenadas Three (Y arriba); kit convierte a Blender.
No depende del directorio de ejecución. No modifica archivos fuera de ROOT.
"""
import json
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[3] / 'grados-mayores-juego' / 'art' / 'blender'))
import kit
from kit import B, lin

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
ART = bpy.data.collections.new('Chimeneas · cuatro originales')
STAGE = bpy.data.collections.new('Solo revisión · no exportar')
scene.collection.children.link(ART)
scene.collection.children.link(STAGE)
kit.setup(ART, 260917)
OBJS, RECORDS, PIECES = [], {}, {}
PLUMES = {'stack': [], 'cluster': []}
BLACK = (0., 0., 0.)
GREEN = lin('#7fffc8')
ORANGE = lin('#ff7a2f')
RED = lin('#8f2412')


def mix(a, b, t):
    return tuple(x * (1-t) + y*t for x, y in zip(a, b))


def mul(c, s):
    return tuple(x*s for x in c)


class Piece:
    def __init__(self, name):
        self.name = name
        self.v, self.f, self.c, self.e = [], [], [], []

    def profile(self, rings, n, center=(0, 0), phase=0, rock=False, glow=None):
        """Closed stratified shell, including recessed inner wall for mouths.

        rings = (height, radius). Caps seal the buried foot and deep cavity,
        never the open lip. Top irregularity is shared across lip rings.
        """
        start = len(self.v)
        for k, (y, r) in enumerate(rings):
            for j in range(n):
                a = math.tau*j/n
                lob = 1 + .12*math.sin(3*a+phase) + .065*math.sin(7*a-phase)
                rr = r*lob*(1 + .035*math.sin(k*2.7+j*1.9))
                wobble = min(.24, max(0, y)*.04)*math.sin(5*a+phase)
                p = (center[0]+rr*math.cos(a)+.025*y*math.sin(phase),
                     y+wobble, center[1]+rr*math.sin(a)+.035*y*math.cos(phase))
                self.v.append(p)
                t = .32+.23*math.sin(a*4+k*1.6+phase)
                c = mix(lin('#0d151d' if rock else '#161013'),
                        lin('#293946' if rock else '#2c2022'), t)
                # Discontinuous pale mineral crust: no all-over luminous wash.
                if not rock and k > 1 and math.sin(j*4.1+k*1.7+phase) > .84:
                    c = mix(c, lin('#6b5a3a'), .58)
                e = BLACK if glow is None else glow(k, j, n, a)
                if max(e) > .12 and not rock:
                    c = mix(c, RED, .35)
                self.c.append(c)
                self.e.append(e)
        for k in range(len(rings)-1):
            for j in range(n):
                a = start+k*n+j
                b = start+k*n+(j+1)%n
                self.f.append((a, b, b+n, a+n))
        self.f.append(tuple(start+j for j in reversed(range(n))))
        self.f.append(tuple(start+(len(rings)-1)*n+j for j in range(n)))

    def base(self, n=32):
        self.profile([(-1.5, 3.7), (-.9, 5), (.15, 4.9), (.9, 3.8), (1.5, 2.1)],
                     n, phase=.4, rock=True)

    def finish(self, width, height, depth):
        lo = [min(p[i] for p in self.v) for i in range(3)]
        hi = [max(p[i] for p in self.v) for i in range(3)]
        scales = [width/(hi[0]-lo[0]), height/(hi[1]-lo[1]), depth/(hi[2]-lo[2])]
        def transform(p):
            return ((p[0]-(hi[0]+lo[0])/2)*scales[0],
                    (p[1]-lo[1])*scales[1]-1.5,
                    (p[2]-(hi[2]+lo[2])/2)*scales[2])
        self.v = [transform(p) for p in self.v]
        if self.name in PLUMES:
            PLUMES[self.name] = [list(transform(p)) for p in PLUMES[self.name]]
        # One texel per original vertex, sampled at texel centers. This preserves
        # all three emission channels in standard glTF without custom shaders.
        image = bpy.data.images.new(self.name+' · emisión embebida', width=len(self.e), height=1)
        image.colorspace_settings.name = 'Non-Color'
        image.pixels = [v for e in self.e for v in (*e, 1)]
        image.pack()
        mat = bpy.data.materials.new(self.name+' · mineral poroso')
        mat.use_nodes = True
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        bs = nodes.get('Principled BSDF')
        bs.inputs['Base Color'].default_value = (1, 1, 1, 1)
        bs.inputs['Roughness'].default_value = .96
        bs.inputs['Metallic'].default_value = 0
        bs.inputs['Emission Strength'].default_value = 3.2
        vc = nodes.new('ShaderNodeVertexColor')
        vc.layer_name = 'Pigment'
        links.new(vc.outputs['Color'], bs.inputs['Base Color'])
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = image
        tex.extension = 'EXTEND'
        tex.interpolation = 'Linear'
        # Texture lookup by index must not interpolate neighboring vertex indices
        # across faces. Bake the RGB values into CORNER color for Cycles instead;
        # the GLB receives an explicitly baked per-triangle texture below.
        ec = nodes.new('ShaderNodeVertexColor')
        ec.layer_name = 'Heat'
        links.new(ec.outputs['Color'], bs.inputs['Emission Color'])
        ob = kit.make(self.name, self.v, self.f, mat, part=self.name,
                      tint=0, smooth_angle=.70 if self.name == 'spire' else 1.25)
        pigment = ob.data.color_attributes.new(name='Pigment', type='FLOAT_COLOR', domain='POINT')
        for i, c in enumerate(self.c):
            pigment.data[i].color = (*c, 1)
        heat = ob.data.color_attributes.new(name='Heat', type='FLOAT_COLOR', domain='POINT')
        for i, e in enumerate(self.e):
            heat.data[i].color = (*e, 1)
        # Per-face triangle atlas preserves interpolated RGB emission in glTF.
        ob.data.calc_loop_triangles()
        triangles = list(ob.data.loop_triangles)
        tile, columns = 8, 64
        rows = math.ceil(len(triangles)/columns)
        atlas = bpy.data.images.new(self.name+' · atlas calor', width=columns*tile, height=rows*tile)
        atlas.colorspace_settings.name = 'Non-Color'
        pixels = [0.]*(columns*tile*rows*tile*4)
        # Triangulate mesh explicitly so every triangle has independent UVs.
        faces = [tuple(t.vertices) for t in triangles]
        old = ob.data
        mesh = bpy.data.meshes.new(self.name+' · triangulada')
        mesh.from_pydata([v.co[:] for v in old.vertices], [], faces)
        mesh.update()
        mesh.materials.append(mat)
        for poly in mesh.polygons:
            poly.use_smooth = True
        mesh.set_sharp_from_angle(angle=.70 if self.name == 'spire' else 1.25)
        for name, values in [('Pigment', self.c), ('Heat', self.e)]:
            attr = mesh.color_attributes.new(name=name, type='FLOAT_COLOR', domain='POINT')
            for i, c in enumerate(values):
                attr.data[i].color = (*c, 1)
        uv = mesh.uv_layers.new(name='EmissionUV')
        for ti, poly in enumerate(mesh.polygons):
            tx, ty = (ti % columns)*tile, (ti//columns)*tile
            colors = [self.e[i] for i in poly.vertices]
            for yy in range(tile):
                for xx in range(tile):
                    u, v = (xx-1)/5, (yy-1)/5
                    # Padding is an extension of the nearest barycentric color.
                    weights = [max(0., 1-u-v), max(0., u), max(0., v)]
                    total = sum(weights)
                    rgb = [sum(colors[k][c]*weights[k]/total for k in range(3)) for c in range(3)]
                    idx = ((ty+yy)*columns*tile+tx+xx)*4
                    pixels[idx:idx+4] = [*rgb, 1]
            for li, (xx, yy) in zip(poly.loop_indices, [(1.5, 1.5), (6.5, 1.5), (1.5, 6.5)]):
                uv.data[li].uv = ((tx+xx)/(columns*tile), (ty+yy)/(rows*tile))
        atlas.pixels = pixels
        atlas.pack()
        tex.image = atlas
        links.new(tex.outputs['Color'], bs.inputs['Emission Color'])
        ob.data = mesh
        bpy.data.meshes.remove(old)
        bpy.data.images.remove(image)
        mesh.color_attributes.active_color = mesh.color_attributes['Pigment']
        mesh.color_attributes.render_color_index = mesh.color_attributes.find('Pigment')
        OBJS.append(ob)
        RECORDS[self.name] = self
        PIECES[self.name] = dict(height=height, footprint=width,
                                 dimensions=[width, height, depth], aboveGround=height-1.5)


spire = Piece('spire')
spire.base()
spire.profile([(i*45/17, (3.4*(1-i/18)**.7)*(1+.12*math.sin(i*2))) for i in range(18)],
              24, phase=1.4, rock=True,
              glow=lambda k,j,n,a: mul(GREEN,.009) if k in (3,8) and j in (4,5,6) else BLACK)
spire.profile([(i*24/9, 2.3*(1-i/13)) for i in range(10)], 16, (2.2,.4), 3.5, True)
for i in range(5):
    a = i*math.tau/5
    spire.profile([(k*10/6, 1.6*(1-k/7)) for k in range(7)], 12,
                  (2.6*math.cos(a), 2.6*math.sin(a)), a, True)
spire.finish(16, 47.5, 12)


def chimney(piece, x, z, h, r, n, ring_count, phase, power):
    outer_count = ring_count-5
    rings = []
    for k in range(outer_count):
        t = k/(outer_count-1)
        rings.append((.5+h*t, r*(1.35-.43*t)*(1+.11*math.sin(k*2.5+phase))))
    # Fold over ragged lip into deep, opaque, dark-ended throat.
    rings.extend([(.5+h+.08, r*.79), (.5+h-.20, r*.62),
                  (.5+h-.75, r*.57), (.5+h-1.7, r*.46), (.5+h-2.5, r*.27)])
    def glow(k,j,nn,a):
        patch = .30+.70*(.5+.5*math.sin(3*a+phase))**2
        if k == outer_count+1:
            return mul(ORANGE, power*patch)
        if k in (outer_count, outer_count+2):
            return mul(RED, power*.6*patch)
        if k in (outer_count-4, outer_count-3, outer_count-2) and j == int(phase*3)%nn:
            return mul(RED, power*.25)
        return BLACK
    piece.profile(rings,n,(x,z),phase,False,glow)
    PLUMES[piece.name].append([x+.025*(h+.5)*math.sin(phase),h+.58,
                               z+.035*(h+.5)*math.cos(phase)])


stack = Piece('stack')
stack.base()
chimney(stack,0,0,16,1.5,32,22,1.1,1)
for i in range(7):
    a = i*2.399
    y = 2+i*1.65
    stack.profile([(y-.8,.18),(y-.35,.52),(y,.66),(y+.25,.49),(y+.40,.15)],
                  12,(1.30*math.cos(a),1.30*math.sin(a)),a)
stack.finish(10,19.5,8)

cluster = Piece('cluster')
cluster.base()
for x,z,h,r,p in [(-2,-.8,6.4,.90,.4),(1.7,-1.4,4.6,.88,2.2),
                    (.9,1.8,7.5,1.05,4.1),(-1.4,1.9,3.8,.76,5.6)]:
    chimney(cluster,x,z,h,r,24,16,p,.62)
cluster.finish(12,10,10)

flange = Piece('flange')
flange.base(24)
flange.profile([(i*.62,1.25-.075*i) for i in range(8)],20,phase=2)
for i in range(3):
    y = 1.3+i*1.35
    r = 3.8-i*.62
    flange.profile([(y-.45,r*.31),(y-.30,r*.85),(y-.14,r),
                    (y+.05,r*1.02),(y+.21,r*.87),(y+.4,r*.53),(y+.47,r*.25)],
                   32,(i*.13,-i*.16),i+1,False,
                   lambda k,j,n,a: mul(GREEN,.014*(.5+.5*math.sin(a*3)**2))
                   if k==1 and j%9 not in (0,1,2) else BLACK)
flange.finish(8.8,5.8,7.6)

# Export before any presentation offsets: all four pivots exactly zero.
for ob in OBJS:
    ob.data.color_attributes.active_color = ob.data.color_attributes['Pigment']
    ob.data.color_attributes.render_color_index = ob.data.color_attributes.find('Pigment')
parts, tris = kit.export_parts(ROOT/'chimeneas.json', objects=OBJS,
                              meta=dict(plumes=PLUMES,pieces=PIECES,forward='-Z'))
payload = json.loads((ROOT/'chimeneas.json').read_text(encoding='utf-8'))
limits = dict(spire=5000,stack=4000,cluster=4000,flange=2500)
expected = dict(spire=2312,stack=2532,cluster=3372,flange=1884)
counts = {}
for entry in payload['meshes']:
    part = entry['part']
    source = RECORDS[part]
    ob = next(o for o in OBJS if o['part']==part)
    lookup = {}
    for v,e in zip(ob.data.vertices,source.e):
        key = tuple(round(c,5) for c in (v.co.x,v.co.z,-v.co.y))
        assert key not in lookup or lookup[key] == e, 'Coincident emission conflict'
        lookup[key] = e
    emission = [lookup[tuple(entry['position'][i:i+3])] for i in range(0,len(entry['position']),3)]
    entry['vertexEmission'] = [round(c,7) for rgb in emission for c in rgb]
    entry['emissionColor'] = [1,1,1]
    entry['emission'] = 3.2
    count = len(entry['index'])//3
    counts[part] = count
    assert count == expected[part] and count <= limits[part], (part,count)
    assert entry['pivot'] == [0,0,0]
    assert len(entry['vertexColor']) == len(entry['position'])
    assert len(entry['vertexEmission']) == len(entry['position'])
    assert BLACK in emission and any(max(e)>0 for e in emission)
    dims = [max(entry['position'][i::3])-min(entry['position'][i::3]) for i in range(3)]
    assert all(abs(a-b)<.001 for a,b in zip(dims,PIECES[part]['dimensions']))
assert parts == 4 and tris == 10100 and tris <= 14000
payload['vertexEmissionEncoding'] = 'linear RGB per vertex, 3 components; multiply by emission; exact zero is off'
(ROOT/'chimeneas.json').write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
bpy.ops.object.select_all(action='DESELECT')
for ob in OBJS:
    ob.select_set(True)
bpy.context.view_layer.objects.active = OBJS[0]
bpy.ops.export_scene.gltf(filepath=str(ROOT/'chimeneas.glb'),export_format='GLB',use_selection=True,export_extras=True)
print('EXPORT',parts,'partes',tris,'triángulos',counts,'DIMENSIONS',PIECES,'PLUMES',PLUMES,flush=True)

# Review stage, excluded from both exports. No sunlight or overhead light.
kit.setup(STAGE,260917)
scene.render.engine = 'CYCLES'
scene.cycles.samples = 40
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 6
scene.render.resolution_x = 1600
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'AgX'
world = bpy.data.worlds.new('Agua #000203 · sin ambiente')
scene.world = world
world.use_nodes = True
nt = world.node_tree
nt.nodes.clear()
out = nt.nodes.new('ShaderNodeOutputWorld')
bg = nt.nodes.new('ShaderNodeBackground')
bg.inputs['Color'].default_value = (*lin('#000203'),1)
bg.inputs['Strength'].default_value = 1
dark = nt.nodes.new('ShaderNodeBackground')
dark.inputs['Strength'].default_value = 0
lp = nt.nodes.new('ShaderNodeLightPath')
mix_shader = nt.nodes.new('ShaderNodeMixShader')
nt.links.new(lp.outputs['Is Camera Ray'],mix_shader.inputs[0])
nt.links.new(dark.outputs[0],mix_shader.inputs[1])
nt.links.new(bg.outputs[0],mix_shader.inputs[2])
nt.links.new(mix_shader.outputs[0],out.inputs['Surface'])
# Review water: absorption dominates. The previous scattering world illuminated
# the whole camera path, washing the frame blue before lighting the black rock.
# These are Cycles review coefficients, NOT the game's exponential fog density.
absorption = nt.nodes.new('ShaderNodeVolumeAbsorption')
absorption.inputs['Color'].default_value = (.15,.15,.15,1)
vol = nt.nodes.new('ShaderNodeVolumeScatter')
vol.inputs['Color'].default_value = (.32,.42,.5,1)
vol.inputs['Anisotropy'].default_value = .35
water = nt.nodes.new('ShaderNodeAddShader')
nt.links.new(absorption.outputs[0],water.inputs[0])
nt.links.new(vol.outputs[0],water.inputs[1])
nt.links.new(water.outputs[0],out.inputs['Volume'])


def review_water(enabled=True):
    absorption.inputs['Density'].default_value = .008 if enabled else 0
    vol.inputs['Density'].default_value = .00001 if enabled else 0


review_water()


def plain(name,color,emission=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bs = mat.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*lin(color),1)
    bs.inputs['Roughness'].default_value = .98
    bs.inputs['Emission Color'].default_value = (*lin(color),1)
    bs.inputs['Emission Strength'].default_value = emission
    return mat


ground_mat = plain('Sédiment froid','#101b24')
N = 48
gv = [(x*5,0,z*5) for z in range(-N//2,N//2+1) for x in range(-N//2,N//2+1)]
gf = [(j*(N+1)+i,j*(N+1)+i+1,(j+1)*(N+1)+i+1,(j+1)*(N+1)+i)
      for j in range(N) for i in range(N)]
ground = kit.make('Sol de revue',gv,gf,ground_mat,tint=0)
del ground['part']
cd = bpy.data.cameras.new('Caméra du joueur · 60 degrés verticaux')
cam = bpy.data.objects.new(cd.name,cd)
STAGE.objects.link(cam)
scene.camera = cam
cd.sensor_fit = 'VERTICAL'
cd.angle = math.radians(60)
cd.clip_start, cd.clip_end = .1, 500
ld = bpy.data.lights.new('Faro frío desde el jugador','SPOT')
ld.color = lin('#cfe8ff')
ld.spot_size = math.radians(100)
ld.spot_blend = .65
ld.shadow_soft_size = .6
light = bpy.data.objects.new(ld.name,ld)
STAGE.objects.link(light)


def camera(pos,target,level=65,underwater=True):
    cam.location = B(pos)
    cam.rotation_euler = (B(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    light.location = cam.location
    light.rotation_euler = cam.rotation_euler
    # Compensate inverse-square falloff and the light's two-way water path.
    # Large watt values are necessary at 70–90 metres with near-black pigment;
    # level controls review illumination, not the game's headlamp intensity.
    distance = (B(target)-cam.location).length
    ld.energy = level*distance**2*math.exp(.012*distance if underwater else 0)
    review_water(underwater)
    print('REVIEW LIGHT',round(distance,2),'u',round(ld.energy),'W',flush=True)


def render(name):
    scene.render.filepath = str(ROOT/name)
    print('RENDER',name,flush=True)
    bpy.ops.render.render(write_still=True)


offsets = [-24,-5,11,26]
for ob,x in zip(OBJS,offsets):
    ob.location = B((x,0,0))
camera((0,24,-70),(0,24,0))
# Save before rendering, so exports and editable scene survive a render failure.
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'chimeneas.blend'))
render('render-kit.png')
ld.energy = 0
render('render-oscuro.png')
for ob in OBJS:
    ob.hide_render = ob['part'] != 'stack'
OBJS[1].location = B((0,0,0))
target = Vector((0,13,0))
direction = Vector((-.65,-.32,-1)).normalized()
camera(tuple(target+direction*12),target)
render('render-chimenea.png')
for ob in OBJS:
    ob.hide_render = True


def floor_y(x,z):
    return 2.2*math.sin(x*.055)*math.cos(z*.043)+1.3*math.sin(z*.081+x*.02)


for v in ground.data.vertices:
    v.co.z = floor_y(v.co.x,-v.co.y)
copies = []
for i in range(14):
    src = OBJS[[0,1,0,2,0,3,1,0,2,0,1,3,0,2][i]]
    ob = src.copy()
    ob.data = src.data
    STAGE.objects.link(ob)
    del ob['part']
    ob.hide_render = False
    a = -.95+i*1.9/13
    radius = 47+(i%3)*13
    x,z = radius*math.sin(a),radius*math.cos(a)-48
    ob.location = B((x,floor_y(x,z),z))
    ob.rotation_euler.z = i*2.399
    s = [.72,1.1,1.5,.9,1.8,1.25,.65][i%7]
    ob.scale = (s,s,s)
    copies.append(ob)
bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,radius=2,location=B((-8,7,-13)))
sphere = bpy.context.object
sphere.name = 'Batisfera · referencia diámetro 4 u'
for coll in list(sphere.users_collection):
    coll.objects.unlink(sphere)
STAGE.objects.link(sphere)
sphere.data.materials.append(plain('Batisfera referencia','#496575',.06))
for poly in sphere.data.polygons:
    poly.use_smooth = True
camera((0,28,-90),(0,28,0))
render('render-fondo.png')
for ob in copies+[sphere]:
    ob.hide_render = True
for v in ground.data.vertices:
    v.co.z = 0
review_water(False)
for ob,x in zip(OBJS,offsets):
    ob.hide_render = False
    ob.location = B((0,0,x))
guides = []
guide_mat = plain('Regla 5 u','#7799a8',.6)
for y in range(0,51,5):
    vv,ff = kit.g_box(.07,.07,1.4)
    mark = kit.make('Marca '+str(y),[(x,y+yy,z-35) for x,yy,z in vv],ff,guide_mat,tint=0)
    del mark['part']
    guides.append(mark)
    cu = bpy.data.curves.new(str(y)+' u','FONT')
    cu.body,cu.size = str(y)+' u',1.2
    text_ob = bpy.data.objects.new(cu.name,cu)
    STAGE.objects.link(text_ob)
    text_ob.location = B((0,y,-39))
    cu.materials.append(guide_mat)
    guides.append(text_ob)
cd.type = 'ORTHO'
cd.ortho_scale = 98
camera((75,24,0),(0,24,0),level=100,underwater=False)
for ob in guides:
    if ob.type == 'FONT':
        ob.rotation_euler = cam.rotation_euler
render('render-perfil.png')
# Restore editable overview and save only once more, without .blend1 backups.
for ob in guides:
    ob.hide_render = True
for ob,x in zip(OBJS,offsets):
    ob.location = B((x,0,0))
cd.type = 'PERSP'
cd.angle = math.radians(60)
camera((0,24,-70),(0,24,0))
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'chimeneas.blend'))
print('LISTO: cinco renders generados; pendiente revisión visual de Astra.',flush=True)
