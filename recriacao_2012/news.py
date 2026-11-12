"""VANGUARDA NEWS - recriacao estilo 2012 sem as telinhas.

Segue a vinheta de 2003 ate a primeira explosao de lasers e termina como a versao 2012
sem telinha (lv_0_...100717): VANews parado, SEM a segunda explosao de lasers do final de 2003.

0,00-1,75 s  logo prateado, camera em movimento lento
1,75-2,00 s  o N fica vermelho
2,00-2,30 s  o N vira contorno de neon vermelho
2,15-4,30 s  copias do N em neon (vermelho, magenta, roxo, azul, ciano) crescem e viram lasers
3,10-3,90 s  EWS acende em neon vermelho ao lado do N
4,30-6,70 s  lasers somem, VANews segura ate o fim

uso: VG_FONT=fonte.ttf python news.py -- [--preview 0,60,90 --res 960x540] [--out pasta]
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import numpy as np
from mathutils import Vector

import vg_base as B

N_FRAMES = 201                       # 6,71 s (duracao do audio original)
args = B.cli('quadros_news')
B.reset_scene(N_FRAMES)
world = B.studio_env()
B.fill_light()
tint = world.node_tree.nodes['VG_Tint'].inputs['B']

let_mat = B.mat_letter('Letra_News', rgb=(0.85, 0.02, 0.015), col_metal=0.0, col_rough=0.2, coat=1.0)
neon_mat = B.mat_obcolor_emit('Neon', strength=1.0)

# a versao 2012 do News usa V e A normais (como no lv_0 sem telinha)
lines = ['VAN', 'GUAR', 'DA']
wV, wG, wD = (B.line_extent(t) for t in lines)
pose = B.empty('POSE')
root, letters = B.build_logo(lines, let_mat, offsets=[0.24, 0.0, wG - wD], parent=pose)
Nl = letters[2]
capL = B.cap()

RED = (1.0, 0.03, 0.025)
# N em neon (mesmo centro da letra solida)
n_me = B.neon_mesh('N', radius=0.0085)
n_me.materials.append(neon_mat)
neonN = bpy.data.objects.new('NeonN', n_me)
bpy.context.scene.collection.objects.link(neonN)
neonN.parent = root
neonN.location = Nl.home + Vector((0, 0, 0.12))
neonN.color = (*RED, 0)
B.no_light(neonN)

# EWS em neon, menor, ao lado do N (topo um pouco abaixo do topo do N)
E_SIZE = 0.5
ews = []
k = B.bl_scale() * E_SIZE
rows = B.layout(['EWS'], size=E_SIZE, gap=0.05)
x_start = Nl.home.x + Nl.w / 2 + 0.035
top = Nl.home.y + Nl.h / 2 - 0.10 * capL
x0 = None
for ch, px, _ in rows[0]:
    me = B.neon_mesh(ch, size=E_SIZE, radius=0.0062)
    me.materials.append(neon_mat)
    lo, hi = B.mesh_bbox(me)
    ob = bpy.data.objects.new('Neon' + ch, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = root
    B.no_light(ob)
    # centro da tinta do glifo pequeno em relacao a caneta
    gm = B.glyph_mesh(ch, size=E_SIZE, depth=0.01, bevel=0.0)
    glo, ghi = B.mesh_bbox(gm)
    bpy.data.meshes.remove(gm)
    cx, cy = (glo[0] + ghi[0]) / 2, (glo[1] + ghi[1]) / 2
    if x0 is None:
        x0 = px + glo[0]
    capS = capL * E_SIZE
    ob.location = Vector((x_start + (px + cx - x0), top - capS + cy, 0.12))
    ob.rotation_euler = (0, 0, math.radians(4))
    ob.color = (*RED, 0)
    ews.append(ob)

# copias do N que crescem e viram lasers
PALETTE = [(1.0, 0.03, 0.03), (1.0, 0.05, 0.55), (0.62, 0.08, 1.0), (0.15, 0.22, 1.0),
           (0.05, 0.85, 0.95), (0.85, 0.1, 1.0), (0.3, 0.1, 1.0)]
rng = np.random.default_rng(2012)
copies = []
NC = 22
l_me = B.neon_mesh('N', radius=0.0032)   # copia fina: engrossa ao crescer e vira feixe de laser
l_me.materials.append(neon_mat)
for i in range(NC):
    if i < 4:
        tb, col = 2.12 + i * 0.09, PALETTE[0]
    else:
        tb = rng.uniform(2.35, 3.95)
        col = PALETTE[int(rng.integers(0, len(PALETTE)))]
    ob = bpy.data.objects.new(f'Laser{i}', l_me)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = root
    B.no_light(ob)
    life = rng.uniform(0.6, 1.0) if i >= 4 else 0.8
    smax = rng.uniform(8, 20)
    drift = Vector((rng.uniform(-1.0, 1.0), rng.uniform(-1.2, 0.4), 0))
    rot = math.radians(rng.uniform(-14, 14))
    z = rng.uniform(0.15, 0.45) if rng.random() < 0.7 else rng.uniform(-0.6, -0.1)
    copies.append(dict(ob=ob, tb=tb, life=life, smax=smax, drift=drift, rot=rot, z=z, col=col,
                       inten=rng.uniform(1.6, 2.6)))


def flick(t, t0, dur=0.35, seed=0):
    """Acende como neon: pisca algumas vezes e firma."""
    if t < t0:
        return 0.0
    x = (t - t0) / dur
    if x >= 1:
        return 1.0
    r = np.random.default_rng(seed + int(x * 9))
    return float(r.random() > 0.45) * (0.4 + 0.6 * x)


cam = B.camera(loc=(0, -4.3, 0), lens=35)


def anim(t):
    ch = []
    k = B.ease_io(t / 6.7)
    k2 = B.ease_out(t / 4.6, 2)
    pose.rotation_euler = (math.radians(B.lerp(-6, -9, k)), math.radians(B.lerp(-15, -22, k2)),
                           math.radians(B.lerp(12, 7, k)))
    pose.location = (B.lerp(0.18, 0.02, k2), 0, B.lerp(0.10, -0.06, k))
    cam.location = (0, B.lerp(-4.7, -4.12, k2), 0)
    ch += [(pose, 'rotation_euler'), (pose, 'location'), (cam, 'location')]
    # N vermelho solido -> neon
    red = B.ease_io(B.seg(t, 1.75, 2.0))
    solid_a = 1 - B.ease_io(B.seg(t, 2.05, 2.3))
    Nl.ob.color = (red, 0, 0, solid_a)
    Nl.ob.scale = [1 + 0.05 * math.sin(math.pi * B.seg(t, 1.75, 2.2))] * 3
    ch += [(Nl.ob, 'color'), (Nl.ob, 'scale')]
    settle = B.lerp(3.2, 2.3, B.ease_io(B.seg(t, 4.2, 5.0)))
    nI = flick(t, 2.0, 0.3, 11) * settle
    neonN.color = (*RED, nI)
    ch.append((neonN, 'color'))
    for j, (ob, t0) in enumerate(zip(ews, (3.1, 3.35, 3.7))):
        ob.color = (*RED, flick(t, t0, 0.3, 20 + j) * settle)
        ch.append((ob, 'color'))
    # lasers
    for c in copies:
        x = (t - c['tb']) / c['life']
        ob = c['ob']
        if x <= 0 or x >= 1:
            a, sc, xx = 0.0, 1.0, max(0.0, min(1.0, x))
        else:
            a = min(1.0, x / 0.06) * (1 - B.clamp01((x - 0.6) / 0.4))
            sc = 1 + (c['smax'] - 1) * x ** 2.2
            xx = x
        ob.scale = (sc, sc, sc)
        ob.location = Nl.home + c['drift'] * xx ** 1.5 + Vector((0, 0, c['z'] * xx + 0.12))
        ob.rotation_euler = (0, 0, c['rot'] * xx)
        ob.color = (*c['col'], a * c['inten'])
        ch += [(ob, 'scale'), (ob, 'location'), (ob, 'rotation_euler'), (ob, 'color')]
    # luz colorida dos lasers no prata (roxo/azul alternando)
    li = B.ease_io(B.seg(t, 2.25, 2.6)) * (1 - B.ease_io(B.seg(t, 4.15, 4.6)))
    ph = 0.5 + 0.5 * math.sin(t * 7.0)
    purple, blue = (0.85, 0.55, 1.2), (0.55, 0.68, 1.25)
    col = [B.lerp(1.0, B.lerp(p, b, ph), li) for p, b in zip(purple, blue)]
    tint.default_value = (*col, 1)
    ch.append((tint, 'default_value'))
    return ch


B.bake(N_FRAMES, anim)
B.run(args, N_FRAMES, glow=2.2, glow_sigmas=(5, 16, 48))
