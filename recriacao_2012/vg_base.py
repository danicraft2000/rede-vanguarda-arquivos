"""Base comum das vinhetas Vanguarda (recriacao estilo 2012, sem as telinhas).

Roda dentro do modulo `bpy` (Blender 5.2 como modulo Python, `pip install bpy==5.2.4`).
Monta as letras 3D com a fonte ITC Avant Garde Gothic Demi, o material prateado,
o ambiente de reflexo, a camera e o laco de renderizacao com pos-processamento (brilho do neon).

A fonte NAO vai no repositorio (e comercial): passe o caminho em VG_FONT.
"""
import math
import os
import subprocess

import bpy
import numpy as np
from mathutils import Matrix, Vector
from PIL import Image, ImageDraw, ImageFont

FONT_PATH = os.environ.get('VG_FONT', 'AvantGardeDemi.ttf')
V_ALT = ''   # V.alt02 (o V "cortado" do logo de 2012)
A_ALT = ''   # A.alt01 (o A inclinado sem travessao)
FPS_NUM, FPS_DEN = 30000, 1001
FPS = FPS_NUM / FPS_DEN
CAP = 0.722        # altura das maiusculas da Avant Garde Demi (em = 1 unidade)

_font = None


def font():
    global _font
    if _font is None or _font.name not in bpy.data.fonts:
        _font = bpy.data.fonts.load(FONT_PATH, check_existing=True)
    return _font


# ----------------------------------------------------------------------------- cena
def reset_scene(n_frames, res=(1920, 1080), samples=48):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    cy = sc.cycles
    cy.device = 'CPU'
    cy.samples = samples
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.015
    cy.use_denoising = True
    cy.denoiser = 'OPENIMAGEDENOISE'
    cy.max_bounces = 6
    cy.glossy_bounces = 4
    cy.diffuse_bounces = 2
    cy.transmission_bounces = 4
    cy.transparent_max_bounces = 16
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.sample_clamp_indirect = 4.0
    sc.render.fps, sc.render.fps_base = FPS_NUM, FPS_DEN
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.frame_start, sc.frame_end = 0, n_frames - 1
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.render.use_motion_blur = True
    sc.render.motion_blur_shutter = 0.5
    sc.view_layers[0].use_pass_emit = True
    im = sc.render.image_settings
    im.media_type = 'MULTI_LAYER_IMAGE'
    im.file_format = 'OPEN_EXR_MULTILAYER'
    im.color_depth = '16'
    im.exr_codec = 'ZIP'
    return sc


def world_env(strength=1.0, tint=(0.86, 0.88, 1.0),
              ramp=((0.40, 0.0), (0.47, 0.10), (0.55, 0.45), (0.66, 0.85), (0.80, 1.0)), ygrad=(0.6, 1.2)):
    """Fundo preto para a camera; para os reflexos, um estudio claro atras da camera
    (as faces das letras ficam prateado-lilas como nas vinhetas de 2012)."""
    w = bpy.data.worlds.new('VG_World')
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    N = nt.nodes.new
    out = N('ShaderNodeOutputWorld')
    tc = N('ShaderNodeTexCoord')
    sep = N('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    # luminancia pela direcao: z>0 = atras da camera (claro), horizonte escuro, y>0 mais claro
    rz = N('ShaderNodeValToRGB')
    nt.links.new(sep.outputs['Z'], rz.inputs[0])   # Z em -1..1 -> ramp usa 0..1, entao remapeia
    mr = N('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = -1.0
    mr.inputs['From Max'].default_value = 1.0
    nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
    nt.links.new(mr.outputs['Result'], rz.inputs[0])
    els = rz.color_ramp.elements
    els[0].position, els[0].color = 0.0, (0.0, 0.0, 0.0, 1)
    els[1].position, els[1].color = 1.0, (1.0, 1.0, 1.0, 1)
    for pos, v in ramp:
        e = els.new(pos)
        e.color = (v, v, v, 1)
    my = N('ShaderNodeMapRange')
    my.inputs['From Min'].default_value = -1.0
    my.inputs['From Max'].default_value = 1.0
    my.inputs['To Min'].default_value = ygrad[0]
    my.inputs['To Max'].default_value = ygrad[1]
    nt.links.new(sep.outputs['Y'], my.inputs['Value'])
    mul = N('ShaderNodeMix')
    mul.data_type = 'RGBA'
    mul.blend_type = 'MULTIPLY'
    mul.inputs['Factor'].default_value = 1.0
    nt.links.new(rz.outputs['Color'], mul.inputs['A'])
    nt.links.new(my.outputs['Result'], mul.inputs['B'])
    tintn = N('ShaderNodeMix')
    tintn.data_type = 'RGBA'
    tintn.blend_type = 'MULTIPLY'
    tintn.inputs['Factor'].default_value = 1.0
    tintn.inputs['B'].default_value = (*tint, 1)
    nt.links.new(mul.outputs['Result'], tintn.inputs['A'])
    env = N('ShaderNodeBackground')
    env.inputs['Strength'].default_value = strength
    nt.links.new(tintn.outputs['Result'], env.inputs['Color'])
    black = N('ShaderNodeBackground')
    black.inputs['Color'].default_value = (0, 0, 0, 1)
    lp = N('ShaderNodeLightPath')
    mix = N('ShaderNodeMixShader')
    nt.links.new(lp.outputs['Is Camera Ray'], mix.inputs['Fac'])
    nt.links.new(env.outputs[0], mix.inputs[1])
    nt.links.new(black.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    return w


def studio_env(strength=1.0, boxes=None, base=(0.05, 0.015, 0.008), w=2048, tint=(0.90, 0.92, 1.0)):
    """Ambiente de estudio (equiretangular gerado em numpy) so para reflexos; a camera ve preto.
    Convencao da cena: camera em -Y olhando para +Y, Z para cima.
    boxes: lista de (azimute_graus, elevacao_graus, largura_graus, altura_graus, intensidade, suavidade_graus)
    azimute 0 = atras da camera (-Y), positivo para a direita da camera (+X)."""
    if boxes is None:   # caixas de luz calibradas contra o quadro final da vinheta News 2012
        boxes = [(-30, 20, 90, 70, 0.85, 60), (-50, 45, 40, 25, 0.8, 25),
                 (25, -20, 50, 30, 0.25, 30), (180, 10, 120, 60, 0.15, 30)]
    h = w // 2
    u = (np.arange(w) + 0.5) / w
    v = (np.arange(h) + 0.5) / h
    U, V = np.meshgrid(u, v)
    # Blender: u = 0.5 - atan2(dy, dx)/(2pi) ; v = elevacao/pi + 0.5 (linha 0 = embaixo)
    lon = (0.5 - U) * 2 * np.pi
    el = (V - 0.5) * np.pi
    dx, dy, dz = np.cos(lon) * np.cos(el), np.sin(lon) * np.cos(el), np.sin(el)
    az = np.degrees(np.arctan2(dx, -dy))          # 0 atras da camera (-Y), + para +X
    eld = np.degrees(el)
    sky, hor, gnd = base
    img = np.where(dz > 0, hor + (sky - hor) * dz, hor + (gnd - hor) * (-dz))
    img = img[..., None] * np.ones(3)
    for azc, elc, bw, bh, inten, soft in boxes:
        da = (az - azc + 180) % 360 - 180
        fa = 1 / (1 + np.exp((np.abs(da) - bw / 2) / (soft / 4)))
        fe = 1 / (1 + np.exp((np.abs(eld - elc) - bh / 2) / (soft / 4)))
        img += (fa * fe * inten)[..., None]
    img *= np.array(tint)
    im = bpy.data.images.new('VG_Studio', w, h, alpha=False, float_buffer=True)
    rgba = np.concatenate([img, np.ones((h, w, 1))], -1).astype(np.float32)
    im.pixels.foreach_set(rgba.ravel())
    im.pack()
    wd = bpy.data.worlds.new('VG_World')
    bpy.context.scene.world = wd
    wd.use_nodes = True
    nt = wd.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    N = nt.nodes.new
    out = N('ShaderNodeOutputWorld')
    tex = N('ShaderNodeTexEnvironment')
    tex.image = im
    tint_n = N('ShaderNodeMix')          # cor animavel do ambiente (luz colorida dos lasers etc.)
    tint_n.name = 'VG_Tint'
    tint_n.data_type = 'RGBA'
    tint_n.blend_type = 'MULTIPLY'
    tint_n.inputs['Factor'].default_value = 1.0
    tint_n.inputs['B'].default_value = (1, 1, 1, 1)
    nt.links.new(tex.outputs['Color'], tint_n.inputs['A'])
    env = N('ShaderNodeBackground')
    env.name = 'VG_Env'
    env.inputs['Strength'].default_value = strength
    nt.links.new(tint_n.outputs['Result'], env.inputs['Color'])
    black = N('ShaderNodeBackground')
    black.inputs['Color'].default_value = (0, 0, 0, 1)
    lp = N('ShaderNodeLightPath')
    mix = N('ShaderNodeMixShader')
    nt.links.new(lp.outputs['Is Camera Ray'], mix.inputs['Fac'])
    nt.links.new(env.outputs[0], mix.inputs[1])
    nt.links.new(black.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    return wd


def fill_light(energy=350.0, loc=(-2.5, -7.0, 3.0), size=8.0):
    """Luz de preenchimento so difusa (nao aparece no reflexo do prata):
    deixa as letras coloridas vivas sem mexer no cromado."""
    ld = bpy.data.lights.new('Preenchimento', 'AREA')
    ld.energy = energy
    ld.size = size
    ob = bpy.data.objects.new('Preenchimento', ld)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    look_at(ob, loc, (0, 0, 0))
    ob.visible_glossy = False
    ob.visible_camera = False
    return ob


def empty(name, parent=None, loc=(0, 0, 0), rot=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.parent = parent
    e.location = loc
    e.rotation_euler = rot
    return e


def build_logo(lines, mats, offsets=None, gap=0.045, pitch=1.135, depth=0.2, bevel=0.016, parent=None, names=None):
    """Monta o logo em 3 linhas. Retorna (raiz, lista de Letter).
    A raiz fica em pe (letras no plano XZ, frente para -Y), centrada na origem.
    mats: material unico ou funcao (indice_linha, indice_letra, ch) -> material."""
    root = empty('LOGO_ROOT', parent, rot=(math.pi / 2, 0, 0))
    rows = layout(lines, gap=gap, pitch=pitch, offsets=offsets)
    letters = []
    for li, row in enumerate(rows):
        for ci, (ch, x, y) in enumerate(row):
            m = mats(li, ci, ch) if callable(mats) else mats
            nm = names[li][ci] if names else f'L{li}{ci}'
            L = Letter(ch, nm, m, parent=root, depth=depth, bevel=bevel).place(x, y)
            L.line, L.idx = li, ci
            letters.append(L)
    xs = [L.home.x - L.w / 2 for L in letters] + [L.home.x + L.w / 2 for L in letters]
    ys = [L.home.y - L.h / 2 for L in letters] + [L.home.y + L.h / 2 for L in letters]
    c = Vector(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, 0))
    for L in letters:
        L.home = L.home - c
        L.ob.location = L.home
    root['extent'] = (max(xs) - min(xs), max(ys) - min(ys))
    return root, letters


def camera(loc=(0, 0, 10), lens=50.0, target=(0, 0, 0), roll=0.0):
    cd = bpy.data.cameras.new('Cam')
    cd.lens = lens
    cd.sensor_width = 36
    cd.clip_start = 0.05
    cd.clip_end = 500
    cam = bpy.data.objects.new('Cam', cd)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    look_at(cam, loc, target, roll)
    return cam


def look_at(cam, loc, target, roll=0.0):
    cam.location = Vector(loc)
    d = Vector(target) - Vector(loc)
    q = d.to_track_quat('-Z', 'Y')
    cam.rotation_mode = 'QUATERNION'
    cam.rotation_quaternion = q @ Matrix.Rotation(roll, 4, 'Z').to_quaternion()


# ----------------------------------------------------------------------------- materiais
def _principled(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    return m, b


def mat_silver(name='Prata', base=(0.88, 0.90, 0.98), rough=0.16):
    m, b = _principled(name)
    b.inputs['Base Color'].default_value = (*base, 1)
    b.inputs['Metallic'].default_value = 1.0
    b.inputs['Roughness'].default_value = rough
    return m


def mat_color(name, rgb, rough=0.30, metallic=0.35, coat=0.6, alpha=1.0):
    """Letra colorida brilhante (vermelho do SERVICO, laranja do COMUNIDADE, cores da AGENDA)."""
    m, b = _principled(name)
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    b.inputs['Coat Weight'].default_value = coat
    b.inputs['Coat Roughness'].default_value = 0.08
    b.inputs['Alpha'].default_value = alpha
    return m


def mat_emit(name, rgb, strength=4.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (*rgb, 1)
    em.inputs['Strength'].default_value = strength
    nt.links.new(em.outputs[0], out.inputs['Surface'])
    return m


def mat_letter(name, rgb=(0.8, 0.04, 0.03), silver_base=(0.88, 0.90, 0.98), silver_rough=0.16,
               col_rough=0.22, col_metal=0.25, coat=0.7, emit_rgb=None):
    """Material de letra animavel por objeto (keyframes em ob.color):
    R = 0 prata ... 1 colorida; G = emissao extra (neon); A = opacidade."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    N = nt.nodes.new
    out = N('ShaderNodeOutputMaterial')
    oi = N('ShaderNodeObjectInfo')
    sep = N('ShaderNodeSeparateColor')
    nt.links.new(oi.outputs['Color'], sep.inputs[0])
    sil = N('ShaderNodeBsdfPrincipled')
    sil.inputs['Base Color'].default_value = (*silver_base, 1)
    sil.inputs['Metallic'].default_value = 1.0
    sil.inputs['Roughness'].default_value = silver_rough
    col = N('ShaderNodeBsdfPrincipled')
    col.inputs['Base Color'].default_value = (*rgb, 1)
    col.inputs['Metallic'].default_value = col_metal
    col.inputs['Roughness'].default_value = col_rough
    col.inputs['Coat Weight'].default_value = coat
    col.inputs['Coat Roughness'].default_value = 0.06
    if emit_rgb is not None:
        col.inputs['Emission Color'].default_value = (*emit_rgb, 1)
        nt.links.new(sep.outputs['Green'], col.inputs['Emission Strength'])
    mix = N('ShaderNodeMixShader')
    nt.links.new(sep.outputs['Red'], mix.inputs['Fac'])
    nt.links.new(sil.outputs[0], mix.inputs[1])
    nt.links.new(col.outputs[0], mix.inputs[2])
    tr = N('ShaderNodeBsdfTransparent')
    mix2 = N('ShaderNodeMixShader')
    nt.links.new(oi.outputs['Alpha'], mix2.inputs['Fac'])
    nt.links.new(tr.outputs[0], mix2.inputs[1])
    nt.links.new(mix.outputs[0], mix2.inputs[2])
    nt.links.new(mix2.outputs[0], out.inputs['Surface'])
    return m


def mat_ribbon(name, c_tail=(0.0, 0.08, 0.35), c_head=(0.25, 0.65, 1.0), strength=1.6, alpha_max=0.85, core=0.0):
    """Faixa luminosa translucida com degrade ao longo do comprimento (UV.x: 0 cauda -> 1 ponta).
    ob.color.a multiplica a opacidade/brilho (para fade de entrada/saida)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    N = nt.nodes.new
    out = N('ShaderNodeOutputMaterial')
    uv = N('ShaderNodeTexCoord')
    sep = N('ShaderNodeSeparateXYZ')
    nt.links.new(uv.outputs['UV'], sep.inputs[0])
    ramp = N('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (*c_tail, 0.0)
    ramp.color_ramp.elements[1].position = 1.0
    ramp.color_ramp.elements[1].color = (*c_head, alpha_max)
    e = ramp.color_ramp.elements.new(0.6)
    e.color = (*[(a + b) / 2 for a, b in zip(c_tail, c_head)], alpha_max * 0.75)
    nt.links.new(sep.outputs['X'], ramp.inputs[0])
    # brilho extra no centro da largura (UV.y 0..1)
    oi = N('ShaderNodeObjectInfo')
    em = N('ShaderNodeEmission')
    em.inputs['Strength'].default_value = strength
    nt.links.new(ramp.outputs['Color'], em.inputs['Color'])
    am = N('ShaderNodeMath')
    am.operation = 'MULTIPLY'
    nt.links.new(ramp.outputs['Alpha'], am.inputs[0])
    nt.links.new(oi.outputs['Alpha'], am.inputs[1])
    tr = N('ShaderNodeBsdfTransparent')
    mix = N('ShaderNodeMixShader')
    nt.links.new(am.outputs[0], mix.inputs['Fac'])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    return m


def arrow_mesh(name, length, width, tip=None, tail_notch=0.0):
    """Faixa plana com ponta de seta (no +x). UV.x 0 na cauda, 1 na ponta; UV.y 0..1 na largura.
    Origem na ponta."""
    tip = width * 0.9 if tip is None else tip
    hw = width / 2
    L = length
    verts = [(-L, -hw, 0), (-tip, -hw, 0), (0, 0, 0), (-tip, hw, 0), (-L, hw, 0)]
    if tail_notch:
        verts.append((-L + tail_notch, 0, 0))
        faces = [(0, 1, 2, 5), (5, 2, 3, 4)]
    else:
        faces = [(0, 1, 2, 3, 4)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    uvl = me.uv_layers.new(name='UVMap')
    for poly in me.polygons:
        for li in poly.loop_indices:
            x, y, _ = verts[me.loops[li].vertex_index]
            uvl.data[li].uv = ((x + L) / L, (y + hw) / width)
    return me


def mat_obcolor_emit(name, strength=1.0):
    """Emissao cuja cor e intensidade vem de Object Color (RGB = cor, A = intensidade),
    para animar cada tubo/faixa individualmente com keyframes em ob.color."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    oi = nt.nodes.new('ShaderNodeObjectInfo')
    em = nt.nodes.new('ShaderNodeEmission')
    sepa = nt.nodes.new('ShaderNodeMath')
    sepa.operation = 'MULTIPLY'
    sepa.inputs[1].default_value = strength
    nt.links.new(oi.outputs['Color'], em.inputs['Color'])
    nt.links.new(oi.outputs['Alpha'], sepa.inputs[0])
    nt.links.new(sepa.outputs[0], em.inputs['Strength'])
    # transparente quando apagado (A=0), opaco a partir de A>=1
    cl = nt.nodes.new('ShaderNodeClamp')
    nt.links.new(oi.outputs['Alpha'], cl.inputs['Value'])
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(cl.outputs[0], mix.inputs['Fac'])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    return m


# ----------------------------------------------------------------------------- letras
def glyph_mesh(ch, size=1.0, depth=0.16, bevel=0.012, bevel_res=2, res_u=10):
    """Malha 3D de um caractere. Profundidade total ~ depth*size (em unidades de em).
    Origem: caneta na linha de base; z vai de -depth/2 a +depth/2 (frente em +z)."""
    cu = bpy.data.curves.new('tmp_' + ch, 'FONT')
    cu.body = ch
    cu.font = font()
    cu.size = size
    cu.resolution_u = res_u
    cu.bevel_depth = bevel * size
    cu.bevel_resolution = bevel_res
    cu.extrude = max(0.0, depth * size / 2 - bevel * size)
    cu.offset = -bevel * size * 0.0
    cu.align_x = 'LEFT'
    cu.align_y = 'BOTTOM_BASELINE'
    ob = bpy.data.objects.new('tmp_' + ch, cu)
    bpy.context.scene.collection.objects.link(ob)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob)
    bpy.data.curves.remove(cu)
    for p in me.polygons:
        p.use_smooth = False
    return me


def mesh_bbox(me):
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    return co.min(0), co.max(0)


_pil_cache = {}


def _pil_mask(ch, px=600):
    """Mascara 2D do glifo (para encaixe justo entre letras). Retorna (mask, x0_pen, baseline_y)."""
    key = (ch, px)
    if key not in _pil_cache:
        ft = ImageFont.truetype(FONT_PATH, px)
        W, H = int(px * 1.6), int(px * 1.4)
        im = Image.new('L', (W, H), 0)
        x0, by = int(px * 0.3), int(px * 1.1)
        ImageDraw.Draw(im).text((x0, by), ch, font=ft, fill=255, anchor='ls')
        _pil_cache[key] = (np.array(im) > 127, x0, by)
    return _pil_cache[key]


def tight_advance(left, right, gap, px=600):
    """Distancia (em em) entre as canetas de `left` e `right` para que a menor folga
    horizontal entre as tintas seja `gap` (em em)."""
    ml, xl, _ = _pil_mask(left, px)
    mr, xr, _ = _pil_mask(right, px)
    rows = np.where(ml.any(1) & mr.any(1))[0]
    best = -1e9
    for r in rows:
        rmax = np.nonzero(ml[r])[0].max() - xl
        lmin = np.nonzero(mr[r])[0].min() - xr
        best = max(best, rmax - lmin)
    return best / px + gap


def ink_left(ch, px=600):
    m, x0, _ = _pil_mask(ch, px)
    return (np.nonzero(m.any(0))[0].min() - x0) / px


def ink_right(ch, px=600):
    m, x0, _ = _pil_mask(ch, px)
    return (np.nonzero(m.any(0))[0].max() - x0) / px


def neon_mesh(ch, size=1.0, radius=0.012, bevel_res=3, res_u=12):
    """Tubo de neon seguindo o contorno do glifo (mesmo centro de tinta da letra solida)."""
    cu = bpy.data.curves.new('neon_' + ch, 'FONT')
    cu.body = ch
    cu.font = font()
    cu.size = size
    cu.resolution_u = res_u
    cu.fill_mode = 'NONE'
    cu.extrude = 0.0
    cu.bevel_depth = radius
    cu.bevel_resolution = bevel_res
    cu.align_x = 'LEFT'
    cu.align_y = 'BOTTOM_BASELINE'
    ob = bpy.data.objects.new('tmpn_' + ch, cu)
    bpy.context.scene.collection.objects.link(ob)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob)
    bpy.data.curves.remove(cu)
    lo, hi = mesh_bbox(me)
    c = (lo + hi) / 2
    c[2] = 0
    me.transform(Matrix.Translation(Vector(-c)))
    for p in me.polygons:
        p.use_smooth = True
    return me


def no_light(ob):
    """Objeto emissivo que nao ilumina nem reflete (evita ruido); o brilho vem do pos (bloom)."""
    ob.visible_diffuse = False
    ob.visible_glossy = False
    ob.visible_transmission = False
    ob.visible_volume_scatter = False
    ob.visible_shadow = False


class Letter:
    """Uma letra 3D com origem no centro da tinta (para girar/escalar em torno dela)."""

    def __init__(self, ch, name, mat, size=1.0, depth=0.16, bevel=0.012, parent=None, coll=None):
        me = glyph_mesh(ch, size, depth, bevel)
        lo, hi = mesh_bbox(me)
        c = (lo + hi) / 2
        c[2] = 0.0
        me.transform(Matrix.Translation(Vector(-c)))
        me.materials.append(mat)
        self.ob = bpy.data.objects.new(name, me)
        (coll or bpy.context.scene.collection).objects.link(self.ob)
        if parent:
            self.ob.parent = parent
        self.ob.color = (0, 0, 0, 1)
        self.ch, self.size, self.center = ch, size, Vector(c)
        self.w, self.h = hi[0] - lo[0], hi[1] - lo[1]

    def place(self, pen_x, base_y, z=0.0):
        """Posiciona pela caneta/linha de base (coordenadas do pai)."""
        self.home = Vector((pen_x + self.center.x, base_y + self.center.y, z))
        self.ob.location = self.home
        return self


_bl_scale = None


def bl_scale():
    """Fator entre a unidade do Blender (texto size=1) e o em da fonte (PIL)."""
    global _bl_scale, CAP
    if _bl_scale is None:
        me = glyph_mesh('H', depth=0.1, bevel=0.0)
        lo, hi = mesh_bbox(me)
        bpy.data.meshes.remove(me)
        m, _, by = _pil_mask('H')
        rows = np.nonzero(m.any(1))[0]
        h_pil = (rows.max() - rows.min() + 1) / 600
        _bl_scale = (hi[1] - lo[1]) / h_pil
        CAP = h_pil
    return _bl_scale


def cap():
    """Altura das maiusculas em unidades do Blender (size=1)."""
    k = bl_scale()
    return CAP * k


def layout(lines, gap=0.045, pitch=1.135, offsets=None, size=1.0):
    """Calcula canetas (x) de cada letra com encaixe justo.
    lines: lista de strings; offsets: deslocamento x (em em) do inicio da tinta de cada linha;
    pitch: distancia entre linhas em alturas de maiuscula.
    Retorna lista de listas (ch, pen_x, base_y) em unidades do Blender."""
    offsets = offsets or [0.0] * len(lines)
    k = bl_scale() * size
    out = []
    pitch_bl = pitch * CAP * k
    for li, (txt, off) in enumerate(zip(lines, offsets)):
        x = off - ink_left(txt[0])
        row = []
        for i, ch in enumerate(txt):
            if i:
                x += tight_advance(txt[i - 1], ch, gap)
            row.append((ch, x * k, -li * pitch_bl))
        out.append(row)
    return out


def line_extent(txt, gap=0.045):
    """Largura da tinta de uma linha (em em)."""
    x = 0.0
    for i in range(1, len(txt)):
        x += tight_advance(txt[i - 1], txt[i], gap)
    return x + ink_right(txt[-1]) - ink_left(txt[0])


# ----------------------------------------------------------------------------- animacao
def ease_io(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def ease_out(t, p=3):
    t = min(1.0, max(0.0, t))
    return 1 - (1 - t) ** p


def ease_in(t, p=2):
    t = min(1.0, max(0.0, t))
    return t ** p


def clamp01(t):
    return min(1.0, max(0.0, t))


def seg(t, a, b):
    """0..1 de t entre os tempos a e b (segundos)."""
    return clamp01((t - a) / (b - a)) if b > a else float(t >= a)


def lerp(a, b, t):
    return a + (b - a) * t


def lerpv(a, b, t):
    return Vector(a).lerp(Vector(b), t)


def bake(n_frames, fn, step=1):
    """Chama fn(t_segundos) para cada quadro e grava keyframes do que fn alterar.
    fn deve retornar uma lista de (objeto_ou_struct, caminho_rna)."""
    for f in range(0, n_frames, step):
        for target, path in fn(f / FPS):
            target.keyframe_insert(path, frame=f)
    # meio-quadro extra no fim para o motion blur nao extrapolar
    for target, path in fn((n_frames - 1 + 0.5) / FPS):
        target.keyframe_insert(path, frame=n_frames - 0.5)


# ----------------------------------------------------------------------------- render
def _read_exr(path):
    import OpenEXR
    with OpenEXR.File(path, separate_channels=True) as f:
        ch = f.channels()
        keys = list(ch.keys())

        def get(suffix):
            names = [k for k in keys if k.rsplit('.', 2)[-2:-1] == [suffix] and k[-1] in 'RGB']
            names.sort(key=lambda k: 'RGB'.index(k[-1]))
            if len(names) != 3:
                return None
            return np.stack([np.asarray(ch[n].pixels, dtype=np.float32) for n in names], -1)
        c = get('Combined')
        e = get('Emit')
    if e is None:
        e = np.zeros_like(c)
    return c, e


def _blur(img, sigma):
    from scipy.ndimage import gaussian_filter
    return np.stack([gaussian_filter(img[..., i], sigma, mode='constant') for i in range(img.shape[-1])], -1)


def srgb(x):
    x = np.clip(x, 0, None)
    return np.where(x <= 0.0031308, 12.92 * x, 1.055 * np.power(x, 1 / 2.4) - 0.055)


def post(comb, emit, glow=0.0, glow_sigmas=(4, 12, 32), extra=None, glow_thr=1.0):
    """Brilho (bloom) so a partir do passe de emissao: neon e faixas luminosas."""
    img = comb.copy()
    if glow > 0 and emit.max() <= 0:
        # o Blender 5.2 nao grava o passe de emissao no EXR: o brilho sai do que passa de 1.0
        # (neon e lasers tem intensidade 2-4; o prata fica abaixo de 1)
        emit = np.clip(comb - glow_thr, 0, None)
    if glow > 0 and emit.max() > 0:
        h, w = emit.shape[:2]
        small = emit[::2, ::2]
        acc = np.zeros_like(small)
        for s, wgt in zip(glow_sigmas, (0.5, 0.3, 0.2)):
            acc += _blur(small, s / 2) * wgt
        acc = np.repeat(np.repeat(acc, 2, 0), 2, 1)[:h, :w]
        img += acc * glow
    if extra is not None:
        img = extra(img)
    out = srgb(img)
    rng = np.random.default_rng()
    out = out * 255 + rng.uniform(-0.5, 0.5, out.shape)
    return np.clip(out + 0.5, 0, 255).astype(np.uint8)


def render_frames(out_dir, n_frames, glow=0.0, frames=None, extra=None, glow_sigmas=(4, 12, 32)):
    """Renderiza quadro a quadro (retomavel: pula PNGs ja existentes)."""
    os.makedirs(out_dir, exist_ok=True)
    sc = bpy.context.scene
    tmp = os.path.join(out_dir, '_tmp.exr')
    for f in (frames if frames is not None else range(n_frames)):
        png = os.path.join(out_dir, f'q_{f:04d}.png')
        if os.path.exists(png):
            continue
        sc.frame_set(f)
        sc.render.filepath = tmp
        bpy.ops.render.render(write_still=True)
        comb, emit = _read_exr(tmp)
        Image.fromarray(post(comb, emit, glow, glow_sigmas, extra)).save(png + '.part.png')
        os.replace(png + '.part.png', png)
        print(f'quadro {f} ok', flush=True)
    if os.path.exists(tmp):
        os.remove(tmp)


def encode(frames_dir, out_mp4, audio=None, audio_start=0.0, fade_out=0.0, n_frames=None, crf=14):
    cmd = ['ffmpeg', '-v', 'error', '-y', '-framerate', f'{FPS_NUM}/{FPS_DEN}',
           '-i', os.path.join(frames_dir, 'q_%04d.png')]
    if audio:
        cmd += ['-ss', str(audio_start), '-i', audio]
    cmd += ['-map', '0:v']
    if audio:
        cmd += ['-map', '1:a']
    cmd += ['-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf), '-pix_fmt', 'yuv420p',
            '-vf', 'scale=out_color_matrix=bt709:out_range=tv',
            '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv']
    if audio:
        dur = (n_frames or 0) / FPS
        af = []
        if fade_out > 0 and n_frames:
            af.append(f'afade=t=out:st={dur - fade_out:.3f}:d={fade_out:.3f}')
        if af:
            cmd += ['-af', ','.join(af)]
        cmd += ['-c:a', 'aac', '-b:a', '256k', '-shortest']
    cmd += ['-movflags', '+faststart', out_mp4]
    subprocess.run(cmd, check=True)


# ----------------------------------------------------------------------------- utilidades de execucao
def key(target, path, frame, value):
    setattr(target, path, value)
    target.keyframe_insert(path, frame=frame)


def cli(default_out):
    """Argumentos comuns: --preview 0,30,60 (quadros) --res 960x540 --spp 12 --out PASTA"""
    import argparse
    import sys
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument('--preview', default='')
    ap.add_argument('--res', default='1920x1080')
    ap.add_argument('--spp', type=int, default=12)
    ap.add_argument('--out', default=default_out)
    ap.add_argument('--step', type=int, default=1)
    ap.add_argument('--start', type=int, default=0)
    a = ap.parse_args(argv)
    a.res = tuple(int(v) for v in a.res.split('x'))
    a.frames = [int(v) for v in a.preview.split(',')] if a.preview else None
    return a


def run(args, n_frames, glow=0.0, glow_sigmas=(4, 12, 32), extra=None):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = args.res
    sc.cycles.samples = args.spp
    k = args.res[0] / 1920
    sig = tuple(s * k for s in glow_sigmas)
    frames = args.frames if args.frames is not None else range(args.start, n_frames, args.step)
    render_frames(args.out, n_frames, glow=glow, frames=frames, extra=extra, glow_sigmas=sig)
