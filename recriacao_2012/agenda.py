"""AGENDA VANGUARDA - recriacao estilo 2012 sem as telinhas (referencia: vinheta de 2003).

0,2-2,4 s  faixas coloridas (ciano, azul, amarelo, magenta, laranja) cruzam o logo e "pintam" as
           letras: o prata some e ficam A / GEN / DA coloridos (o E sobe de baixo, o N desce)
2,4-3,0 s  segura A / GEN / DA
3,0-3,7 s  o VANGUARDA prateado volta; GEN e DA encolhem e ficam por cima; o A amarelo fica no VAN
3,7-6,6 s  segura, com a sobra da faixa laranja a direita

uso: VG_FONT=fonte.ttf python agenda.py -- [--preview 0,60,90 --res 960x540] [--out pasta]
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import numpy as np
from mathutils import Vector

import vg_base as B

N_FRAMES = 199                       # 6,64 s
args = B.cli('quadros_agenda')
B.reset_scene(N_FRAMES)
B.studio_env()
B.fill_light(energy=380)

COL = dict(amarelo=(1.0, 0.70, 0.06), rosa=(0.85, 0.08, 0.30), azul=(0.04, 0.42, 0.85),
           laranja=(1.0, 0.30, 0.02), verde=(0.12, 0.62, 0.06), roxo=(0.33, 0.12, 0.80))
mats = {k: B.mat_letter('Agenda_' + k, rgb=v, col_metal=0.15, col_rough=0.2, coat=0.6) for k, v in COL.items()}
silver = mats['amarelo']               # qualquer um: com ob.color.r = 0 fica prata

lines = [B.V_ALT + B.A_ALT + 'N', 'GU' + B.A_ALT + 'R', 'D' + B.A_ALT]
wV, wG, wD = (B.line_extent(t) for t in lines)
pose = B.empty('POSE')
root, letters = B.build_logo(lines, silver, offsets=[0.14, 0.0, wG - wD], parent=pose)
V, A1, N1, G, U, A2, R, D, A3 = letters
capL = B.cap()
line_c = [(L.home.y - L.center.y) + capL / 2 for L in (V, G, D)]     # centro vertical de cada linha
pitch = line_c[0] - line_c[1]


def colored(ch, cor, home, size=1.0):
    L = B.Letter(ch, f'C_{ch}_{cor}', mats[cor], size=size, parent=root, depth=0.2, bevel=0.016)
    L.ob.color = (1, 0, 0, 0)
    L.home = Vector(home) + Vector((0, 0, 0.03))   # um pouco a frente do prata (sem faces coincidentes)
    L.ob.location = L.home
    return L


cA = colored(B.A_ALT, 'amarelo', A1.home)
cG = colored('G', 'rosa', G.home)
cE = colored('E', 'azul', U.home)
cN = colored('N', 'laranja', N1.home)
cD = colored('D', 'verde', D.home)
cA3 = colored(B.A_ALT, 'roxo', A3.home)
mid = {cA: cA.home, cG: cG.home, cE: Vector((U.home.x, line_c[1] - capL / 2 + cE.center.y, 0.03)),
       cN: Vector((A2.home.x, line_c[1] - capL / 2 + cN.center.y, 0.03)), cD: cD.home, cA3: cA3.home}

# posicoes finais: GEN pequeno sobre o GUAR, DA pequeno entre GUAR e DA
SM = 0.68
k = B.bl_scale() * SM
x = G.home.x + 0.36 * G.w
fin = {}
prev = None
for L, ch in ((cG, 'G'), (cE, 'E'), (cN, 'N')):
    if prev is not None:
        x += B.tight_advance(prev, ch, 0.05) * k
    gl = B.ink_left(ch) * k
    fin[L] = Vector((x + gl + L.w * SM / 2, line_c[1] + 0.02 * capL, 0.16))
    prev = ch
    if L is cG:
        x0g = x
xD = fin[cN].x - 0.05 * capL
yD = (line_c[1] + line_c[2]) / 2 - 0.02 * capL
fin[cD] = Vector((xD, yD, 0.20))
fin[cA3] = Vector((xD + (B.tight_advance('D', B.A_ALT, 0.05) * k) + (B.ink_left(B.A_ALT) - B.ink_left('D')) * k
                   + (cA3.w - cD.w) * SM / 2, yD, 0.20))
fin[cA] = cA.home

# ---------------------------------------------------------------- faixas coloridas
def bar(name, c_tail, c_head, horiz, lane, length, width, z=0.18, alpha=0.8, strength=1.15):
    m = B.mat_ribbon('Faixa_' + name, c_tail, c_head, strength, alpha)
    me = B.arrow_mesh(name, length, width, tip=0.0001)
    me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = root
    ob.color = (1, 1, 1, 0)
    return dict(ob=ob, horiz=horiz, lane=lane)


W = capL * 0.62
bars = {
    'ciano': bar('ciano', (0.0, 0.25, 0.25), (0.15, 0.95, 0.95), False, A1.home.x - 0.05, 2.6, W),
    'azul': bar('azul', (0.0, 0.05, 0.3), (0.12, 0.40, 1.0), True, line_c[1], 2.8, W),
    'amarelo': bar('amarelo', (0.25, 0.22, 0.0), (1.0, 0.92, 0.10), True, line_c[0], 2.8, W),
    'magenta': bar('magenta', (0.25, 0.0, 0.12), (1.0, 0.10, 0.55), False, N1.home.x + 0.02, 2.6, W),
    'laranja': bar('laranja', (0.18, 0.04, 0.0), (1.0, 0.38, 0.05), True, line_c[2] - 0.02, 2.8, W * 1.1, z=-0.12),
}
# (inicio, fim, posicao da ponta no inicio, no fim, direcao) - direcao +1/-1 ao longo do eixo
moves = {'ciano': (0.20, 1.25, -2.0, 2.6, +1), 'azul': (0.70, 1.65, 2.9, -2.6, -1),
         'amarelo': (0.95, 1.90, -2.9, 2.7, +1), 'magenta': (1.05, 2.05, 2.4, -2.4, -1),
         'laranja': (1.45, 2.45, -2.6, 1.95, +1)}
fades = {'ciano': (0.20, 1.6, 2.1), 'azul': (0.7, 2.0, 2.5), 'amarelo': (0.95, 2.1, 2.6),
         'magenta': (1.05, 2.4, 2.9)}

cam = B.camera(loc=(0, -4.05, 0), lens=35)


def anim(t):
    ch = []
    kk = B.ease_io(t / 6.64)
    pose.rotation_euler = (math.radians(B.lerp(5, 3, kk)), math.radians(B.lerp(-1.5, -0.5, kk)),
                           math.radians(B.lerp(-13, -8, kk)))
    pose.location = (B.lerp(-0.05, 0.08, kk), B.lerp(0.25, -0.05, kk), B.lerp(-0.02, 0.03, kk))
    ch += [(pose, 'rotation_euler'), (pose, 'location')]
    # faixas
    for nm, b in bars.items():
        t0, t1, s0, s1, dr = moves[nm]
        e = B.seg(t, t0, t1)
        s = B.lerp(s0, s1, B.ease_io(e) * 0.4 + e * 0.6)
        if nm == 'laranja':           # depois segue devagar e para encostada na direita
            s = s + 0.9 * B.ease_out(B.seg(t, t1, 4.2), 2)
        ob = b['ob']
        if b['horiz']:
            ob.location = (s, b['lane'], 0.18 if nm != 'laranja' else -0.12)
            ob.rotation_euler = (0, 0, 0 if dr > 0 else math.pi)
        else:
            ob.location = (b['lane'], s, 0.18)
            ob.rotation_euler = (0, 0, math.pi / 2 if dr > 0 else -math.pi / 2)
        if nm == 'laranja':
            a = B.clamp01(B.seg(t, t0, t0 + 0.15)) * B.lerp(1.0, 0.38, B.ease_io(B.seg(t, 2.6, 3.8)))
        else:
            fa, fb, fc = fades[nm]
            a = B.clamp01(B.seg(t, fa, fa + 0.15)) * (1 - B.ease_io(B.seg(t, fb, fc)))
        ob.color = (1, 1, 1, a)
        ch += [(ob, 'location'), (ob, 'rotation_euler'), (ob, 'color')]
    # prata some (pintado pelas faixas) e volta no fim
    back = B.ease_io(B.seg(t, 3.0, 3.6))
    out_t = {V: 1.45, A1: 1.40, N1: 1.50, G: 1.25, U: 0.95, A2: 1.15, R: 1.05, D: 1.95, A3: 2.05}
    for L, t0 in out_t.items():
        a = 1 - B.ease_io(B.seg(t, t0, t0 + 0.3))
        if L is not A1:
            a = max(a, back)
        L.ob.color = (0, 0, 0, a)
        ch.append((L.ob, 'color'))
    # letras coloridas aparecem no lugar do prata
    on_t = {cA: 1.35, cG: 1.20, cN: 1.45, cD: 1.90, cA3: 2.00}
    for L, t0 in on_t.items():
        L.ob.color = (1, 0, 0, B.ease_io(B.seg(t, t0, t0 + 0.3)))
    cE.ob.color = (1, 0, 0, B.ease_io(B.seg(t, 1.95, 2.15)))
    # E sobe de baixo, N desce para o GEN
    eE = B.ease_out(B.seg(t, 1.95, 2.4), 3)
    pE = mid[cE] + Vector((0, -1.3 * pitch * (1 - eE), 0))
    eN = B.ease_io(B.seg(t, 1.9, 2.35))
    pN = cN.home.lerp(mid[cN], eN)
    # encolhe e vai para a posicao final
    f = B.ease_io(B.seg(t, 3.0, 3.7))
    for L in (cA, cG, cE, cN, cD, cA3):
        p = pE if L is cE else pN if L is cN else mid[L]
        if L is cA:
            L.ob.location = p.lerp(fin[cA], f)
            s = 1.0
        else:
            L.ob.location = p.lerp(fin[L], f)
            s = B.lerp(1.0, SM, f)
        L.ob.scale = (s, s, s)
        ch += [(L.ob, 'color'), (L.ob, 'location'), (L.ob, 'scale')]
    return ch


B.bake(N_FRAMES, anim)
B.run(args, N_FRAMES, glow=0.3)
