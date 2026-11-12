"""VANGUARDA SERVICO - recriacao estilo 2012 sem as telinhas (referencia: vinheta de 2003).

0,0-2,4 s  logo prateado, faixas azuis com ponta de seta comecam a cruzar a tela
2,4-3,3 s  o V gira no proprio eixo e vira vermelho
3,2-4,0 s  SER entra pela esquerda e ICO pela direita formando SERVICO (vermelho)
4,0-8,0 s  segura, faixas continuam passando, camera em movimento lento

uso: VG_FONT=fonte.ttf python servico.py -- [--preview 0,90,200 --res 960x540] [--out pasta]
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: F401  (carrega mathutils)
import numpy as np
from mathutils import Vector

import vg_base as B

N_FRAMES = 240                       # 8,0 s a 29,97 qps
args = B.cli('quadros_servico')
B.reset_scene(N_FRAMES)
B.studio_env()
B.fill_light()

silver = B.mat_letter('Letra_Vermelha', rgb=(0.85, 0.02, 0.015), col_metal=0.0, col_rough=0.2, coat=1.0)
red_small = silver                    # mesmo material: ob.color.r = 1 deixa vermelho

lines = [B.V_ALT + B.A_ALT + 'N', 'GU' + B.A_ALT + 'R', 'D' + B.A_ALT]
wV, wG, wD = (B.line_extent(t) for t in lines)
pose = B.empty('POSE')
root, letters = B.build_logo(lines, silver, offsets=[wG - wV, 0.0, wG - wD], parent=pose)
V = letters[0]
capL = B.cap()

# ---------------------------------------------------------------- SERVICO (letras menores em vermelho)
S_SIZE = 0.62
ANG = math.radians(10)                # a palavra fica um pouco mais inclinada que o logo
u = Vector((math.cos(ANG), math.sin(ANG), 0))
n = Vector((-math.sin(ANG), math.cos(ANG), 0))
capS = capL * S_SIZE
GAP = 0.05
small = []                            # (Letter, pos_final, lado)


def word(txt, side):
    rows = B.layout([txt], size=S_SIZE)
    k = B.bl_scale() * S_SIZE
    W = B.line_extent(txt) * k
    lefts = []
    for ch, px, _ in rows[0]:
        L = B.Letter(ch, f'S_{ch}', red_small, size=S_SIZE, parent=root, depth=0.2, bevel=0.016)
        L.ob.color = (1, 0, 0, 0)
        lefts.append((L, px + L.center.x))
    x0 = min(px - L.w / 2 for L, px in lefts)
    for L, cx in lefts:
        cx -= x0
        if side < 0:
            d = -(V.w * 1.18 / 2 + GAP) - (W - cx)
        else:
            d = (V.w * 1.18 / 2 + GAP) + cx
        nofs = -capS / 2 + L.center.y - 0.16 * capL
        pos = V.home + u * d + n * nofs + Vector((0, 0, 0.10))
        small.append((L, pos, side))


word('SER', -1)
word('IÇO', +1)

# ---------------------------------------------------------------- faixas azuis com ponta de seta
rng = np.random.default_rng(2003)
rib_mats = [B.mat_ribbon('Faixa_A', (0.0, 0.03, 0.22), (0.05, 0.42, 1.0), 1.0, 0.8),
            B.mat_ribbon('Faixa_B', (0.0, 0.06, 0.35), (0.12, 0.60, 1.0), 0.9, 0.75),
            B.mat_ribbon('Faixa_C', (0.0, 0.02, 0.12), (0.02, 0.28, 0.85), 1.1, 0.85)]
ribbons = []
NR = 52
R = 4.2
for i in range(NR):
    r = rng.random()
    t0 = rng.uniform(-2.6, 1.2) if r < 0.22 else rng.uniform(1.0, 2.6) if r < 0.40 else rng.uniform(2.4, 7.6)
    horiz = rng.random() < 0.55
    length = rng.uniform(1.3, 3.4)
    width = rng.uniform(0.09, 0.24)
    speed = rng.uniform(1.0, 2.1)
    sign = 1 if rng.random() < 0.6 else -1
    lane = rng.uniform(-1.5, 1.5)
    z = rng.uniform(0.18, 0.55) if rng.random() < 0.30 else rng.uniform(-1.3, -0.15)
    me = B.arrow_mesh(f'faixa{i}', length, width, tip=width * 1.1)
    me.materials.append(rib_mats[i % 3])
    ob = B.bpy.data.objects.new(f'faixa{i}', me)
    B.bpy.context.scene.collection.objects.link(ob)
    ob.parent = root
    ob.color = (1, 1, 1, 1)
    ax = Vector((1, 0, 0)) if horiz else Vector((0, 1, 0))
    pp = Vector((0, 1, 0)) if horiz else Vector((-1, 0, 0))
    ob.rotation_euler = (0, 0, (0 if horiz else math.pi / 2) + (0 if sign > 0 else math.pi))
    # posicao da ponta: -R no instante t0, andando speed u/s (linear => 2 keyframes bastam)
    for t in (-3.0, 9.0):
        s = -R + speed * (t - t0)
        B.key(ob, 'location', t * B.FPS, ax * (s * sign) + pp * lane + Vector((0, 0, z)))
    ribbons.append(ob)


# ---------------------------------------------------------------- animacao
def anim(t):
    ch = []
    # camera/logo: deriva lenta
    k = B.ease_io(t / 8.0)
    pose.rotation_euler = (math.radians(B.lerp(-9, -11, k)), math.radians(B.lerp(-19, -23, k)),
                           math.radians(B.lerp(10, 6, k)))
    pose.location = (B.lerp(-0.22, -0.16, k), 0, B.lerp(-0.02, -0.06, k))
    ch += [(pose, 'rotation_euler'), (pose, 'location')]
    cam.location = (0, B.lerp(-4.55, -4.15, k), 0)
    ch.append((cam, 'location'))
    # V gira e fica vermelho
    f = B.ease_io(B.seg(t, 2.4, 3.35))
    V.ob.rotation_euler = (0, f * 2 * math.pi, 0)
    red = B.clamp01((f - 0.35) / 0.3)
    V.ob.color = (red, 0, 0, 1)
    V.ob.location = V.home + Vector((0, 0.03 * f, 0.10 * f))
    V.ob.scale = [1 + 0.18 * f] * 3
    ch += [(V.ob, 'rotation_euler'), (V.ob, 'color'), (V.ob, 'location'), (V.ob, 'scale')]
    # SER / ICO
    for L, pos, side in small:
        t0 = 3.15 if side < 0 else 3.3
        e = B.ease_out(B.seg(t, t0, t0 + 0.65), 3)
        L.ob.location = pos + u * (side * 1.4 * (1 - e))
        L.ob.rotation_euler = (0, 0, ANG)
        L.ob.color = (1, 0, 0, B.clamp01(B.seg(t, t0, t0 + 0.4)))
        ch += [(L.ob, 'location'), (L.ob, 'rotation_euler'), (L.ob, 'color')]
    return ch


cam = B.camera(loc=(0, -4.15, 0), lens=35)
B.bake(N_FRAMES, anim)
B.run(args, N_FRAMES, glow=0.35)
