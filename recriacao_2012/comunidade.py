"""VANGUARDA COMUNIDADE - recriacao estilo 2012 sem as telinhas (referencia: vinheta de 2003).

0,3-2,6 s  enxurrada de letras cromadas voando da direita/alto para a esquerda/baixo, girando
2,2-5,4 s  letras gigantes passam rente a camera; o D dourado cruza a tela
5,0-7,0 s  as letras se juntam e montam VAN / GUAR / DA, com o D laranja
7,0-7,6 s  COMUNI e ADE saem do D laranja (COMUNI-DADE)
7,6-8,4 s  segura

uso: VG_FONT=fonte.ttf python comunidade.py -- [--preview 0,60,90 --res 960x540] [--out pasta]
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import numpy as np
from mathutils import Euler, Vector

import vg_base as B

N_FRAMES = 252                       # 8,4 s
args = B.cli('quadros_comunidade')
B.reset_scene(N_FRAMES)
B.studio_env()
B.fill_light(energy=300)

ORANGE = (1.0, 0.28, 0.0)
GOLD = (1.0, 0.62, 0.06)
mat = B.mat_letter('Letra_Laranja', rgb=ORANGE, col_metal=0.6, col_rough=0.22, coat=0.3)
mat_gold = B.mat_letter('Letra_Dourada', rgb=GOLD, col_metal=0.6, col_rough=0.15, coat=1.0)

lines = [B.V_ALT + B.A_ALT + 'N', 'GU' + B.A_ALT + 'R', 'D' + B.A_ALT]
wV, wG, wD = (B.line_extent(t) for t in lines)
pose = B.empty('POSE')
root, letters = B.build_logo(lines, mat, offsets=[0.16, 0.0, wG - wD], parent=pose)
capL = B.cap()
G = letters[3]
Dl = letters[7]

# ---------------------------------------------------------------- orange: D grande + COMUNI + ADE
oD = B.Letter('D', 'D_laranja', mat, parent=root, depth=0.2, bevel=0.016)
oD_home = Dl.home + Vector((-0.07, 0.10, 0.14))
oD.ob.color = (1, 0, 0, 1)
S_SIZE = 0.55
ANG = math.radians(13)
u = Vector((math.cos(ANG), math.sin(ANG), 0))
n = Vector((-math.sin(ANG), math.cos(ANG), 0))
small = []


def word(txt, start, base_n, z):
    """Palavra pequena laranja ao longo de u, comecando (tinta) em `start`, linha de base em base_n."""
    rows = B.layout([txt], size=S_SIZE, gap=0.05)
    objs = []
    for ch, px, _ in rows[0]:
        L = B.Letter(ch, f'O_{ch}', mat, size=S_SIZE, parent=root, depth=0.2, bevel=0.016)
        L.ob.color = (1, 0, 0, 0)
        objs.append((L, px))
    x0 = min(px + L.center.x - L.w / 2 for L, px in objs)
    for L, px in objs:
        d = px + L.center.x - x0
        pos = start + u * d + n * (base_n + L.center.y) + Vector((0, 0, z))
        small.append((L, pos))


baseG = G.home.y - G.center.y          # linha de base do GUAR
word('COMUNI', Vector((G.home.x - 0.02 * capL, baseG + 0.02 * capL, 0)), 0.0, 0.2)
d_right = oD_home.x + oD.w / 2 + 0.03
d_base = oD_home.y - oD.h / 2
word(B.A_ALT + 'DE', Vector((d_right, d_base + 0.40 * capL, 0)), 0.0, 0.2)

# ---------------------------------------------------------------- letras voando
rng = np.random.default_rng(1103)
CH_POOL = [B.V_ALT, B.A_ALT, 'N', 'G', 'U', B.A_ALT, 'R', 'D', B.A_ALT]
D_CAM = 4.4
fly = []


def screen_to_world(sx, sy, d):
    """Ponto na tela normalizada (-1..1) a uma profundidade d da camera (camera em y=-D_CAM)."""
    return Vector((sx * 0.514 * d, d - D_CAM, sy * 0.289 * d))


def add_flyer(ch, t0, t1, p0, p1, spin, rot0, mat_=mat, gold=False):
    L = B.Letter(ch, f'F_{len(fly)}', mat_, depth=0.2, bevel=0.016)
    L.ob.color = (1.0 if gold else 0.0, 0, 0, 1)
    L.ob.rotation_mode = 'XYZ'
    fly.append(dict(L=L, t0=t0, t1=t1, p0=p0, p1=p1, spin=spin, rot0=rot0))


# fase 1: enxurrada diagonal
for i in range(40):
    t0 = 0.3 + 1.9 * (i / 40) + rng.uniform(-0.1, 0.1)
    dur = rng.uniform(1.0, 1.6)
    d0, d1 = rng.uniform(6, 12), rng.uniform(1.4, 4.0)
    p0 = screen_to_world(rng.uniform(0.2, 1.5), rng.uniform(0.7, 1.5), d0)
    p1 = screen_to_world(rng.uniform(-1.9, -1.2), rng.uniform(-1.9, -1.2), d1)
    rot0 = Euler((math.pi / 2 + rng.uniform(-0.9, 0.9), rng.uniform(-0.6, 0.6) - 0.5, rng.uniform(-0.8, 0.8)))
    spin = Vector(rng.uniform(-2.5, 2.5, 3))
    add_flyer(CH_POOL[i % len(CH_POOL)], t0, t0 + dur, p0, p1, spin, rot0)

# fase 2: letras gigantes rente a camera (direita -> esquerda), D dourado (esquerda -> direita)
big = [('U', 2.2), ('R', 2.55), ('G', 2.9), ('D', 3.15), (B.A_ALT, 3.45), ('G', 3.7), (B.A_ALT, 3.95),
       ('R', 4.55), (B.A_ALT, 4.85), ('N', 5.05)]
for i, (ch, t0) in enumerate(big):
    d = rng.uniform(1.25, 2.4)
    dur = rng.uniform(0.85, 1.2)
    y0 = rng.uniform(-0.4, 0.4)
    p0 = screen_to_world(1.0 + 0.55 / d * 3, y0, d)
    p1 = screen_to_world(-1.0 - 0.55 / d * 3, y0 + rng.uniform(-0.5, 0.5), d * rng.uniform(0.8, 1.1))
    rot0 = Euler((math.pi / 2 + rng.uniform(-0.25, 0.25), rng.uniform(-0.35, 0.35), rng.uniform(-0.5, 0.2)))
    spin = Vector((rng.uniform(-0.4, 0.4), rng.uniform(-0.6, 0.6), rng.uniform(-0.3, 0.3)))
    add_flyer(ch, t0, t0 + dur, p0, p1, spin, rot0)
gd = 1.6
add_flyer('D', 4.15, 5.35, screen_to_world(-1.6, 0.15, gd), screen_to_world(1.7, -0.1, gd * 1.05),
          Vector((0.0, 0.5, 0.2)), Euler((math.pi / 2, 0.15, -0.1)), mat_=mat_gold, gold=True)

# fase 3: as letras do logo chegam de posicoes espalhadas (coordenadas da raiz do logo)
assemble = []
for i, L in enumerate(letters + [oD]):
    home = oD_home if L is oD else L.home
    off = Vector((rng.uniform(-2.2, 2.2), rng.uniform(-1.4, 1.4), rng.uniform(0.6, 3.0)))
    if L is oD:
        off = Vector((-1.6, 1.0, 2.2))
    t0 = rng.uniform(5.0, 5.5)
    t1 = rng.uniform(6.4, 6.95)
    rot = Vector(rng.uniform(-2.2, 2.2, 3))
    assemble.append(dict(L=L, home=home, off=off, t0=t0, t1=t1, rot=rot))

cam = B.camera(loc=(0, -D_CAM, 0), lens=35)


def anim(t):
    ch = []
    k = B.ease_io(B.seg(t, 4.8, 8.4))
    pose.rotation_euler = (math.radians(B.lerp(-4, -7, k)), math.radians(B.lerp(-26, -21, k)),
                           math.radians(B.lerp(-16, -11, k)))
    pose.location = (B.lerp(0.05, 0.02, k), B.lerp(0.2, -0.75, k), B.lerp(0.0, 0.02, k))
    ch += [(pose, 'rotation_euler'), (pose, 'location')]
    for f in fly:
        L = f['L']
        x = (t - f['t0']) / (f['t1'] - f['t0'])
        xc = min(1.0, max(0.0, x))
        L.ob.location = f['p0'].lerp(f['p1'], xc)
        r = f['rot0']
        dt = (t - f['t0'])
        L.ob.rotation_euler = (r.x + f['spin'].x * dt, r.y + f['spin'].y * dt, r.z + f['spin'].z * dt)
        vis = 0.0 < x < 1.0
        L.ob.scale = (1, 1, 1) if vis else (0.001, 0.001, 0.001)
        ch += [(L.ob, 'location'), (L.ob, 'rotation_euler'), (L.ob, 'scale')]
    for a in assemble:
        L = a['L']
        e = B.ease_out(B.seg(t, a['t0'], a['t1']), 3)
        L.ob.location = a['home'] + a['off'] * (1 - e)
        L.ob.rotation_euler = tuple(a['rot'] * (1 - e))
        vis = t >= a['t0']
        L.ob.scale = (1, 1, 1) if vis else (0.001, 0.001, 0.001)
        ch += [(L.ob, 'location'), (L.ob, 'rotation_euler'), (L.ob, 'scale')]
    # COMUNI / ADE saem do D laranja
    for i, (L, pos) in enumerate(small):
        t0 = 7.0 + 0.04 * i
        e = B.ease_out(B.seg(t, t0, t0 + 0.5), 3)
        ov = 1 + 0.12 * math.sin(math.pi * B.seg(t, t0 + 0.25, t0 + 0.6))
        L.ob.location = oD_home.lerp(pos, e)
        L.ob.rotation_euler = (0, 0, ANG * e)
        s = max(0.001, (0.15 + 0.85 * e) * ov)
        L.ob.scale = (s, s, s)
        L.ob.color = (1, 0, 0, B.clamp01(B.seg(t, t0, t0 + 0.12)))
        ch += [(L.ob, 'location'), (L.ob, 'rotation_euler'), (L.ob, 'scale'), (L.ob, 'color')]
    return ch


B.bake(N_FRAMES, anim)
B.run(args, N_FRAMES, glow=0.25)
