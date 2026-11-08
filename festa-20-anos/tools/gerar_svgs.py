"""Gera os 15 quadros do "Vanguarda Especial" (exposição da Sala de Estar)
e os 3 telões do palco (DANIEL | arco-íris | 20 ANOS) em SVG.

Uso:  python3 festa-20-anos/tools/gerar_svgs.py
Saída: festa-20-anos/vanguarda-especial/*.svg  e  festa-20-anos/teloes/*.svg

Os títulos são convertidos em contornos (paths) com a ITC Avant Garde Gothic Bold,
usando o V e o A alternativos (U+E04F / U+E000) do logotipo Vanguarda.
"""
import math
import os
import random

from textpath import FonteContorno, vanguarda

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
FONTE = FonteContorno()

# Arco-íris do V da Vanguarda (de cima para baixo)
ARCO = ["#7b3fe0", "#3d6ff0", "#27b3d6", "#2fc27a", "#9bd23a",
        "#f2d33a", "#f5a12e", "#f26b2a", "#e5342e", "#d6247e"]

W, H = 1200, 900
ARTE_H = 735  # altura da ilustração; abaixo fica a faixa de título


def lin(id_, cores, x1=0, y1=0, x2=0, y2=1):
    stops = "".join(
        f'<stop offset="{o}" stop-color="{c}"/>' for o, c in cores)
    return (f'<linearGradient id="{id_}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">'
            f'{stops}</linearGradient>')


def rad(id_, cores, cx=0.5, cy=0.5, r=0.5):
    stops = "".join(
        f'<stop offset="{o}" stop-color="{c}" stop-opacity="{a}"/>' for o, c, a in cores)
    return f'<radialGradient id="{id_}" cx="{cx}" cy="{cy}" r="{r}">{stops}</radialGradient>'


def faixa_titulo(numero, titulo, subtitulo):
    """Faixa inferior padrão da exposição (estilo vinheta Vanguarda)."""
    y0 = ARTE_H
    seg = W / len(ARCO)
    arco = "".join(
        f'<rect x="{i*seg:.1f}" y="{y0}" width="{seg+0.6:.1f}" height="9" fill="{c}"/>'
        for i, c in enumerate(ARCO))
    kicker = FONTE.path(vanguarda("VANGUARDA ESPECIAL"), 24, 60, y0 + 52, tracking=0.12)
    t = FONTE.path(titulo, 56 if len(titulo) < 26 else 46, 60, y0 + 115)
    num = FONTE.path(f"{numero:02d}", 92, W - 56, y0 + 122, ancora="end")
    return f'''
  <rect x="0" y="{y0}" width="{W}" height="{H-y0}" fill="url(#faixa)"/>
  {arco}
  <path d="{kicker}" fill="#ffffff" fill-opacity="0.72"/>
  <path d="{t}" fill="#ffffff"/>
  <text x="62" y="{y0+150}" font-family="Inter, 'Helvetica Neue', Arial, sans-serif" font-size="21" fill="#c9d1ff" letter-spacing="0.4">{subtitulo}</text>
  <path d="{num}" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/>'''


def quadro(numero, titulo, subtitulo, defs, arte):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <title>Vanguarda Especial — {titulo}</title>
  <defs>
    {lin("faixa", [(0, "#0d1233"), (1, "#05071a")])}
    {rad("vinheta", [(0.55, "#000", 0), (1, "#000", 0.45)], r=0.75)}
    <clipPath id="areaArte"><rect x="0" y="0" width="{W}" height="{ARTE_H}"/></clipPath>
    {defs}
  </defs>
  <g clip-path="url(#areaArte)">
    {arte}
    <rect x="0" y="0" width="{W}" height="{ARTE_H}" fill="url(#vinheta)"/>
  </g>
  {faixa_titulo(numero, titulo, subtitulo)}
</svg>
'''


rnd = random.Random(2029)


def estrelas(n, ymax, cor="#ffffff", rmax=1.8):
    return "".join(
        f'<circle cx="{rnd.uniform(0, W):.0f}" cy="{rnd.uniform(0, ymax):.0f}" r="{rnd.uniform(0.6, rmax):.1f}" '
        f'fill="{cor}" fill-opacity="{rnd.uniform(0.3, 0.9):.2f}"/>' for _ in range(n))


def nuvem(x, y, s, op=0.9, cor="#ffffff"):
    return (f'<g transform="translate({x} {y}) scale({s})" fill="{cor}" fill-opacity="{op}">'
            '<ellipse cx="0" cy="0" rx="60" ry="26"/><ellipse cx="-40" cy="6" rx="40" ry="20"/>'
            '<ellipse cx="45" cy="8" rx="42" ry="18"/><ellipse cx="5" cy="-18" rx="36" ry="26"/></g>')


# ---------------------------------------------------------------- 1 Aparecida
def q_aparecida():
    defs = (lin("ceu1", [(0, "#24245e"), (0.45, "#7b4b94"), (0.75, "#f08a5d"), (1, "#ffc574")]) +
            rad("sol1", [(0, "#fff1c1", 1), (0.35, "#ffd27a", 0.9), (1, "#ffb15c", 0)]) +
            lin("tijolo", [(0, "#c46a3e"), (1, "#8e3f22")]) +
            lin("cupula", [(0, "#8aa0c4"), (1, "#4d5f86")]) +
            lin("praca", [(0, "#a08670"), (1, "#5d4a3e")]))
    janelas = ""
    for fila, y in enumerate((505, 560)):
        for i in range(14):
            x = 352 + i * 37
            if 520 < x < 680 and fila == 0:
                continue
            janelas += f'<path d="M{x} {y+30} v-22 a8 8 0 0 1 16 0 v22 z" fill="#f4d6a8" fill-opacity="0.85"/>'
    raios = "".join(
        f'<path d="M600 300 L{600+math.cos(a)*900:.0f} {300+math.sin(a)*900:.0f} L{600+math.cos(a+0.05)*900:.0f} {300+math.sin(a+0.05)*900:.0f} Z" fill="#ffe2a6" fill-opacity="0.07"/>'
        for a in [i * 0.26 - math.pi for i in range(13)])
    romeiros = ""
    for i in range(46):
        x = rnd.uniform(60, 1140)
        y = rnd.uniform(668, 728)
        s = 0.6 + (y - 660) / 90
        romeiros += (f'<g transform="translate({x:.0f} {y:.0f}) scale({s:.2f})" fill="#2a1c22">'
                     '<circle cx="0" cy="-26" r="5"/><path d="M-6 -20 h12 l3 20 h-18 z"/></g>')
    arte = f'''
    <rect width="{W}" height="{ARTE_H}" fill="url(#ceu1)"/>
    {estrelas(40, 220)}
    <circle cx="930" cy="470" r="230" fill="url(#sol1)"/>
    {raios}
    <path d="M0 560 Q200 500 380 540 T760 520 T1200 540 V740 H0 Z" fill="#4a3c6b"/>
    <!-- Torre -->
    <rect x="215" y="250" width="78" height="400" fill="url(#tijolo)"/>
    <rect x="207" y="236" width="94" height="22" fill="#e9d2b5"/>
    <path d="M220 236 L254 140 L288 236 Z" fill="url(#cupula)"/>
    <rect x="251" y="108" width="6" height="36" fill="#f5e3c4"/><rect x="242" y="118" width="24" height="5" fill="#f5e3c4"/>
    {''.join(f'<rect x="232" y="{y}" width="12" height="30" rx="6" fill="#f4d6a8" fill-opacity="0.8"/><rect x="264" y="{y}" width="12" height="30" rx="6" fill="#f4d6a8" fill-opacity="0.8"/>' for y in range(285, 620, 52))}
    <!-- Nave -->
    <rect x="330" y="470" width="540" height="180" fill="url(#tijolo)"/>
    <rect x="322" y="458" width="556" height="18" fill="#e9d2b5"/>
    <path d="M330 470 L600 410 L870 470 Z" fill="#a64f2a"/>
    <!-- Cúpula -->
    <rect x="515" y="350" width="170" height="110" fill="url(#tijolo)"/>
    <rect x="507" y="340" width="186" height="14" fill="#e9d2b5"/>
    <path d="M512 342 Q512 230 600 214 Q688 230 688 342 Z" fill="url(#cupula)"/>
    {''.join(f'<path d="M{600+k*28} 342 Q{600+k*24} 260 600 216" fill="none" stroke="#c9d6ee" stroke-opacity="0.45" stroke-width="3"/>' for k in (-3,-2,-1,0,1,2,3))}
    <rect x="586" y="186" width="28" height="32" fill="#e9d2b5"/>
    <path d="M582 188 Q600 160 618 188 Z" fill="#6b7fa6"/>
    <rect x="597" y="130" width="6" height="40" fill="#fff4dc"/><rect x="587" y="142" width="26" height="6" fill="#fff4dc"/>
    {''.join(f'<path d="M{x} 425 v-34 a10 10 0 0 1 20 0 v34 z" fill="#f4d6a8" fill-opacity="0.9"/>' for x in (535, 565, 615, 645))}
    {janelas}
    <path d="M565 650 v-70 a35 35 0 0 1 70 0 v70 z" fill="#3a2117"/>
    <!-- Praça e romeiros -->
    <rect x="0" y="648" width="{W}" height="92" fill="url(#praca)"/>
    {''.join(f'<path d="M{600+k*120} 648 L{600+k*420} 740" stroke="#c9b6a0" stroke-opacity="0.35" stroke-width="2"/>' for k in range(-5,6))}
    {romeiros}'''
    return quadro(1, "Aparecida", "Fé, romaria e a Basílica que é coração do Vale do Paraíba", defs, arte)


# ---------------------------------------------------------------- 2 Mazzaropi
def q_mazzaropi():
    defs = (lin("ceu2", [(0, "#8fd0ea"), (0.7, "#fde7b0"), (1, "#ffd28a")]) +
            lin("palha", [(0, "#f3d58e"), (1, "#c9993f")]) +
            lin("palha2", [(0, "#e8c070"), (1, "#a8782c")]))
    trama = "".join(
        f'<path d="M{-170+i*22} -6 q11 10 22 0" fill="none" stroke="#9b6d27" stroke-opacity="0.5" stroke-width="2"/>'
        for i in range(16))
    furos = "".join(
        f'<rect x="12" y="{y}" width="22" height="16" rx="3" fill="#f7e9c8"/>' for y in range(18, ARTE_H, 40))
    arte = f'''
    <rect width="{W}" height="{ARTE_H}" fill="url(#ceu2)"/>
    {nuvem(300, 140, 1.2)}{nuvem(820, 90, 0.9)}{nuvem(1050, 200, 0.7, 0.8)}
    <path d="M0 470 Q220 380 460 450 T900 420 T1200 450 V740 H0 Z" fill="#9cc77a"/>
    <path d="M0 540 Q300 470 600 530 T1200 510 V740 H0 Z" fill="#7fb069"/>
    <path d="M0 620 Q350 560 700 610 T1200 600 V740 H0 Z" fill="#5b8c4a"/>
    <!-- estrada de terra -->
    <path d="M520 740 C560 650 700 600 640 540 C600 500 690 470 720 455 L735 458 C705 478 640 505 680 545 C760 610 650 660 700 740 Z" fill="#d9b375"/>
    <!-- casinha caipira -->
    <g transform="translate(760 400)">
      <rect x="0" y="20" width="120" height="70" fill="#fbf4e4"/>
      <path d="M-12 24 L60 -22 L132 24 Z" fill="#b5462c"/>
      <rect x="18" y="40" width="26" height="26" fill="#5b7fa6"/><rect x="74" y="44" width="28" height="46" fill="#7a4b2a"/>
      <rect x="92" y="-14" width="12" height="22" fill="#8a3b22"/>
      <path d="M98 -16 q-10 -20 6 -34 q-14 -12 2 -28" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="5" stroke-linecap="round"/>
    </g>
    {''.join(f'<rect x="{x}" y="500" width="6" height="34" fill="#8a5a32"/>' for x in range(880, 1200, 34))}
    <rect x="880" y="508" width="320" height="5" fill="#8a5a32"/><rect x="880" y="522" width="320" height="5" fill="#8a5a32"/>
    <!-- claquete -->
    <g transform="translate(150 560) rotate(-8)">
      <rect x="0" y="40" width="230" height="130" rx="6" fill="#1b1b1f"/>
      <rect x="14" y="70" width="202" height="2" fill="#ffffff" fill-opacity="0.5"/><rect x="14" y="110" width="202" height="2" fill="#ffffff" fill-opacity="0.5"/>
      <g transform="rotate(-14 0 40)"><rect x="0" y="0" width="230" height="38" fill="#1b1b1f"/>
      {''.join(f'<path d="M{10+i*44} 0 h22 l-22 38 h-22 z" fill="#f4f4f4"/>' for i in range(6))}</g>
      <text x="16" y="100" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700" fill="#f4f4f4">CENA 1 · TOMADA 1</text>
      <text x="16" y="150" font-family="Inter, Arial, sans-serif" font-size="20" fill="#f4f4f4" fill-opacity="0.8">TAUBATÉ · SP</text>
    </g>
    <!-- chapéu de palha -->
    <g transform="translate(860 610) rotate(-10)">
      <ellipse cx="0" cy="40" rx="250" ry="62" fill="#000" fill-opacity="0.18"/>
      <ellipse cx="0" cy="0" rx="250" ry="62" fill="url(#palha)"/>
      <ellipse cx="0" cy="-4" rx="200" ry="44" fill="none" stroke="#b07f34" stroke-opacity="0.5" stroke-width="3"/>
      <path d="M-120 -8 C-125 -120 125 -120 120 -8 Z" fill="url(#palha2)"/>
      <path d="M-122 -34 C-60 -16 60 -16 122 -34 L120 -8 C60 10 -60 10 -120 -8 Z" fill="#6b3e1e"/>
      <g transform="translate(0 -60)">{trama}</g>
      <path d="M-60 -95 q60 -20 120 0" fill="none" stroke="#fff3c8" stroke-opacity="0.5" stroke-width="5"/>
    </g>
    <!-- película -->
    <rect x="0" y="0" width="46" height="{ARTE_H}" fill="#14110d"/>{furos}
    <rect x="{W-46}" y="0" width="46" height="{ARTE_H}" fill="#14110d"/>
    {''.join(f'<rect x="{W-34}" y="{y}" width="22" height="16" rx="3" fill="#f7e9c8"/>' for y in range(18, ARTE_H, 40))}'''
    return quadro(2, "Mazzaropi", "O caipira de Taubaté que levou o interior paulista para o cinema", defs, arte)


# ---------------------------------------------------------------- 3 Alcatrazes
def fragata(x, y, s, rot=0, cor="#121826"):
    return (f'<path transform="translate({x} {y}) rotate({rot}) scale({s})" fill="{cor}" '
            'd="M0 0 C-20 -6 -40 -22 -70 -18 C-50 -12 -30 0 -18 6 L-6 6 L-10 26 L-2 12 L4 26 L2 6 '
            'L14 6 C30 0 50 -12 70 -18 C40 -22 20 -6 0 0 Z"/>')


def q_alcatrazes():
    defs = (lin("ceu3", [(0, "#3c5aa6"), (0.55, "#f39a72"), (1, "#ffd18b")]) +
            lin("mar3", [(0, "#2a7aa6"), (1, "#0b3352")]) +
            lin("ilha", [(0, "#5f8f48"), (1, "#2f4a2a")]) +
            rad("sol3", [(0, "#fff6d8", 1), (0.4, "#ffd18b", 0.8), (1, "#ffd18b", 0)]))
    ondas = "".join(
        f'<path d="M{x} {y} q14 -6 28 0" fill="none" stroke="#ffffff" stroke-opacity="{rnd.uniform(.2,.6):.2f}" stroke-width="2"/>'
        for x, y in [(rnd.uniform(0, W), rnd.uniform(520, 730)) for _ in range(70)])
    reflexo = "".join(
        f'<rect x="{560 + rnd.uniform(-60,60)*(1+(y-480)/200):.0f}" y="{y}" width="{rnd.uniform(30,110):.0f}" height="3" fill="#ffe6b0" fill-opacity="0.55"/>'
        for y in range(492, 730, 9))
    arte = f'''
    <rect width="{W}" height="500" fill="url(#ceu3)"/>
    <circle cx="600" cy="470" r="200" fill="url(#sol3)"/>
    <circle cx="600" cy="478" r="46" fill="#fff1c9"/>
    <rect y="488" width="{W}" height="260" fill="url(#mar3)"/>
    {reflexo}
    <!-- ilha principal -->
    <path d="M250 500 L330 430 L390 380 L440 300 L470 250 L500 230 L540 290 L590 340 L650 360 L720 410 L790 440 L880 500 Z" fill="url(#ilha)"/>
    <path d="M440 300 L470 250 L500 230 L540 290 L520 300 L495 270 L470 305 Z" fill="#7a7f6a"/>
    <path d="M250 500 L330 470 L420 480 L520 460 L640 478 L760 470 L880 500 Z" fill="#4b4a3f"/>
    <path d="M880 500 L930 470 L990 462 L1040 500 Z" fill="#3d5a34"/>
    <path d="M90 500 L130 478 L170 486 L200 500 Z" fill="#3d5a34"/>
    {ondas}
    {fragata(300, 160, 1.6, -6)}{fragata(420, 110, 1.0, 8)}{fragata(780, 140, 1.3, -10)}
    {fragata(900, 230, 0.8, 4)}{fragata(160, 260, 0.7, 12)}{fragata(660, 220, 0.6)}
    <!-- atobá na pedra -->
    <path d="M980 700 Q1040 640 1140 700 Z" fill="#2c2f2b"/>
    <g transform="translate(1060 650)">
      <ellipse cx="0" cy="0" rx="22" ry="34" fill="#f4f1e8"/><path d="M-20 -6 Q-30 30 -6 40 L0 0 Z" fill="#5a4a3a"/>
      <circle cx="0" cy="-38" r="14" fill="#f4f1e8"/><path d="M10 -40 L40 -34 L10 -32 Z" fill="#e7c25a"/>
      <circle cx="4" cy="-41" r="2.5" fill="#111"/>
    </g>'''
    return quadro(3, "Alcatrazes", "O arquipélago das aves no Litoral Norte paulista", defs, arte)


# ---------------------------------------------------------------- 4 Monteiro Lobato
def q_lobato():
    defs = (lin("ceu4", [(0, "#6fb8e8"), (1, "#d8f0ff")]) +
            lin("pag", [(0, "#fffdf6"), (1, "#eadfc6")]))
    linhas = "".join(
        f'<rect x="{x}" y="{y}" width="{rnd.uniform(120,170):.0f}" height="5" rx="2" fill="#7a6a55" fill-opacity="0.35"/>'
        for x in (340, 620) for y in range(560, 690, 18))
    letras = "".join(
        f'<text x="{560+i*42+rnd.uniform(-10,10):.0f}" y="{520-i*34:.0f}" font-family="Georgia, serif" font-size="{34-i*2}" '
        f'fill="#ffffff" fill-opacity="{0.95-i*0.08:.2f}" transform="rotate({rnd.uniform(-25,25):.0f} {560+i*42} {520-i*34})">{ch}</text>'
        for i, ch in enumerate("ABCDEFGHI"))
    arte = f'''
    <rect width="{W}" height="{ARTE_H}" fill="url(#ceu4)"/>
    {nuvem(220, 110, 1.0)}{nuvem(980, 80, 1.2)}
    <path d="M0 430 Q300 370 600 420 T1200 410 V740 H0 Z" fill="#8cc06a"/>
    <path d="M0 500 Q400 440 800 500 T1200 480 V740 H0 Z" fill="#6aa552"/>
    <!-- casa do sítio -->
    <g transform="translate(120 330)">
      <rect x="0" y="40" width="300" height="120" fill="#f5d77a"/>
      <path d="M-20 46 L150 -20 L320 46 Z" fill="#c4502e"/>
      <rect x="0" y="150" width="300" height="12" fill="#e5c260"/>
      {''.join(f'<rect x="{x}" y="70" width="40" height="50" fill="#ffffff"/><rect x="{x+4}" y="74" width="32" height="42" fill="#3b78b5"/>' for x in (24, 236))}
      <rect x="128" y="80" width="44" height="80" fill="#3b78b5"/><rect x="132" y="84" width="36" height="76" fill="#2d5f92"/>
      <rect x="-30" y="160" width="360" height="10" fill="#b18a5a"/>
    </g>
    <!-- árvore -->
    <rect x="905" y="300" width="34" height="210" fill="#6b4a2a"/>
    <path d="M922 380 L990 330" stroke="#6b4a2a" stroke-width="14"/>
    <circle cx="920" cy="250" r="120" fill="#3f8a3c"/><circle cx="1010" cy="300" r="90" fill="#4c9a44"/>
    <circle cx="840" cy="300" r="80" fill="#4c9a44"/><circle cx="950" cy="190" r="70" fill="#5aa84d"/>
    {''.join(f'<circle cx="{rnd.uniform(820,1060):.0f}" cy="{rnd.uniform(170,360):.0f}" r="7" fill="#2b1a3a"/>' for _ in range(26))}
    <!-- pica-pau amarelo no galho -->
    <g transform="translate(1000 318)">
      <ellipse cx="0" cy="0" rx="18" ry="30" fill="#f4c430"/>
      <path d="M-6 -6 Q-22 20 -8 34 L4 4 Z" fill="#1d1d1d"/>
      <circle cx="4" cy="-32" r="15" fill="#f4c430"/>
      <path d="M-6 -48 Q6 -62 16 -44 Q6 -46 -6 -40 Z" fill="#d62828"/>
      <path d="M17 -34 L42 -30 L17 -27 Z" fill="#555"/>
      <circle cx="9" cy="-35" r="3" fill="#111"/>
    </g>
    <!-- livro aberto -->
    <g>
      <path d="M300 720 Q440 690 600 720 L600 540 Q440 510 300 540 Z" fill="url(#pag)"/>
      <path d="M900 720 Q760 690 600 720 L600 540 Q760 510 900 540 Z" fill="url(#pag)"/>
      <path d="M290 728 Q440 700 600 730 Q760 700 910 728 L910 740 L290 740 Z" fill="#8a3b22"/>
      <path d="M600 540 L600 722" stroke="#bfae8f" stroke-width="3"/>
      {linhas}
    </g>
    {letras}'''
    return quadro(4, "Monteiro Lobato", "O escritor de Taubaté e o universo do Sítio do Picapau Amarelo", defs, arte)


# ---------------------------------------------------------------- 5 Via Dutra
def q_dutra():
    defs = (lin("ceu5", [(0, "#1f2056"), (0.55, "#7a4a8f"), (1, "#f59a5e")]) +
            lin("asf", [(0, "#4a4a58"), (1, "#1c1c24")]))
    vx, vy = 600, 420
    tracos = ""
    for lane in (-1, 1):
        for i in range(14):
            t1, t2 = (i / 14) ** 2, ((i + 0.45) / 14) ** 2
            x1 = vx + lane * 70 * t1 * 4.2
            x2 = vx + lane * 70 * t2 * 4.2
            y1 = vy + t1 * 320
            y2 = vy + t2 * 320
            w1, w2 = 1 + t1 * 10, 1 + t2 * 10
            tracos += f'<path d="M{x1-w1/2:.1f} {y1:.1f} L{x1+w1/2:.1f} {y1:.1f} L{x2+w2/2:.1f} {y2:.1f} L{x2-w2/2:.1f} {y2:.1f} Z" fill="#f5f5f0" fill-opacity="0.85"/>'
    rastros = ""
    for k, (cor, off) in enumerate([("#ff3b3b", -230), ("#ff6a4a", -120), ("#fff2c4", 140), ("#ffe08a", 250)]):
        rastros += (f'<path d="M{vx+off*0.02:.0f} {vy+2} Q{vx+off*0.5:.0f} {vy+120} {vx+off*2.4:.0f} {ARTE_H}" fill="none" '
                    f'stroke="{cor}" stroke-width="{6+k%2*3}" stroke-opacity="0.75" stroke-linecap="round"/>')
    arte = f'''
    <rect width="{W}" height="{ARTE_H}" fill="url(#ceu5)"/>
    {estrelas(60, 200)}
    <path d="M0 430 L120 330 L220 380 L330 290 L450 370 L540 340 L600 420 Z" fill="#3b3a6b"/>
    <path d="M600 420 L700 330 L790 370 L900 280 L1010 350 L1100 300 L1200 360 L1200 430 Z" fill="#3b3a6b"/>
    <path d="M0 440 L160 400 L300 420 L460 390 L600 420 L760 392 L920 418 L1080 396 L1200 420 V460 H0 Z" fill="#2c2b55"/>
    <path d="M0 740 L{vx-8} {vy} L{vx+8} {vy} L{W} 740 Z" fill="url(#asf)"/>
    <path d="M0 740 L{vx-8} {vy}" stroke="#f2d33a" stroke-width="5"/><path d="M{W} 740 L{vx+8} {vy}" stroke="#f2d33a" stroke-width="5"/>
    {tracos}{rastros}
    <!-- pórtico com placa -->
    <rect x="160" y="150" width="14" height="340" fill="#9aa0a8"/><rect x="1026" y="150" width="14" height="340" fill="#9aa0a8"/>
    <rect x="160" y="140" width="880" height="16" fill="#9aa0a8"/>
    <g transform="translate(360 160)">
      <rect width="480" height="150" rx="10" fill="#0b6e3a" stroke="#ffffff" stroke-width="5"/>
      <path d="M30 30 h70 v60 q-35 30 -70 0 z" fill="#ffffff"/>
      <text x="65" y="70" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="800" font-size="26" fill="#0b6e3a">116</text>
      <text x="125" y="62" font-family="Inter, Arial, sans-serif" font-weight="800" font-size="34" fill="#ffffff">VIA DUTRA</text>
      <text x="125" y="100" font-family="Inter, Arial, sans-serif" font-weight="600" font-size="22" fill="#ffffff">São Paulo ⟵ ⟶ Rio de Janeiro</text>
      <text x="125" y="132" font-family="Inter, Arial, sans-serif" font-weight="500" font-size="19" fill="#d5f0de">Vale do Paraíba</text>
    </g>'''
    return quadro(5, "Via Dutra", "A estrada que liga São Paulo ao Rio passando pelo Vale do Paraíba", defs, arte)


# ---------------------------------------------------------------- Futuro das Cidades (3 partes)
def predio(x, base, w, h, cor, janela, topo="reto", verde=False, rr=None):
    s = f'<rect x="{x}" y="{base-h}" width="{w}" height="{h}" fill="{cor}"/>'
    if topo == "redondo":
        s += f'<path d="M{x} {base-h} a{w/2} {w/2*0.8} 0 0 1 {w} 0 z" fill="{cor}"/>'
    elif topo == "ponta":
        s += f'<path d="M{x} {base-h} L{x+w/2} {base-h-w*0.9} L{x+w} {base-h} z" fill="{cor}"/>'
    for yy in range(int(base - h + 14), int(base - 8), 18):
        for xx in range(int(x + 8), int(x + w - 10), 16):
            if (rr or rnd).random() < 0.72:
                s += f'<rect x="{xx}" y="{yy}" width="8" height="9" fill="{janela}" fill-opacity="{rnd.uniform(.4,.95):.2f}"/>'
    if verde:
        for yy in range(int(base - h + 20), int(base - 10), 46):
            s += f'<rect x="{x-4}" y="{yy}" width="{w+8}" height="10" rx="5" fill="#4fbf6a"/>'
            s += "".join(f'<circle cx="{x-2+k*12}" cy="{yy}" r="7" fill="#3da85a"/>' for k in range(int(w / 12) + 1))
    return s


def q_futuro(parte):
    if parte == 1:
        defs = lin("ceuF", [(0, "#58c7f0"), (1, "#e6fbff")]) + lin("chaoF", [(0, "#c9f1e6"), (1, "#86d6c2")])
        arte = f'<rect width="{W}" height="{ARTE_H}" fill="url(#ceuF)"/>{nuvem(200,120,1)}{nuvem(900,90,.8)}'
        arte += "".join(
            f'<path d="M{x} {y} l30 -17 l30 17 l0 34 l-30 17 l-30 -17 z" fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2"/>'
            for x in range(0, W, 64) for y in range(30, 330, 104))
        prs = [(40, 120, 300, "#7fa8c9", "redondo", True), (170, 100, 420, "#9cc0dc", "ponta", False),
               (280, 140, 360, "#86b5d3", "reto", True), (430, 110, 520, "#e8f4fb", "redondo", True),
               (550, 150, 600, "#b9d9ee", "ponta", False), (710, 120, 470, "#90bcd8", "redondo", True),
               (840, 100, 380, "#e2f0f8", "reto", True), (950, 140, 520, "#a5c9e2", "ponta", True),
               (1100, 90, 330, "#86b5d3", "redondo", False)]
        arte += "".join(predio(x, 650, w, h, c, "#e9fbff", t, v) for x, w, h, c, t, v in prs)
        arte += (f'<rect y="640" width="{W}" height="100" fill="url(#chaoF)"/>'
                 '<path d="M0 600 C300 560 900 640 1200 590" fill="none" stroke="#ffffff" stroke-width="16" stroke-opacity="0.85"/>'
                 '<path d="M0 600 C300 560 900 640 1200 590" fill="none" stroke="#2fc27a" stroke-width="5"/>')
        arte += "".join(
            f'<g transform="translate({x} 690)"><rect x="-3" y="-40" width="6" height="40" fill="#6b4a2a"/><circle cx="0" cy="-48" r="22" fill="#3da85a"/></g>'
            for x in range(40, W, 110))
        sub = "Parte 1 · Como vamos morar, trabalhar e conviver amanhã"
    elif parte == 2:
        defs = lin("ceuF", [(0, "#070a24"), (1, "#3a1d6e")]) + lin("trem", [(0, "#ffffff"), (1, "#b7c3d6")])
        arte = f'<rect width="{W}" height="{ARTE_H}" fill="url(#ceuF)"/>{estrelas(90, 300)}'
        neon = ["#27d3ff", "#d6247e", "#7b3fe0", "#2fc27a"]
        for i in range(16):
            x = i * 78 - 20
            w = rnd.uniform(60, 90)
            h = rnd.uniform(200, 520)
            c = neon[i % 4]
            arte += predio(x, 640, w, h, "#12163a", c, ["reto", "ponta", "redondo"][i % 3])
            arte += f'<rect x="{x}" y="{640-h}" width="{w}" height="{h}" fill="none" stroke="{c}" stroke-opacity="0.8" stroke-width="2"/>'
        arte += ('<path d="M0 470 C300 440 900 500 1200 450" fill="none" stroke="#5f6a8a" stroke-width="10"/>'
                 '<g transform="translate(330 444) rotate(-1.5)"><path d="M0 0 h360 q40 0 60 22 h-420 z" fill="url(#trem)"/>'
                 + "".join(f'<rect x="{20+k*40}" y="5" width="28" height="10" rx="3" fill="#27d3ff"/>' for k in range(9)) +
                 '</g>')
        for k in range(6):
            arte += (f'<path d="M0 {660+k*12} C400 {640+k*10} 800 {690+k*8} 1200 {650+k*14}" fill="none" '
                     f'stroke="{["#ff3b3b","#fff2c4","#27d3ff"][k%3]}" stroke-width="4" stroke-opacity="0.7"/>')
        for (x, y) in [(200, 200), (880, 160), (1040, 300), (560, 240)]:
            arte += (f'<g transform="translate({x} {y})"><rect x="-18" y="-4" width="36" height="8" rx="4" fill="#cfd8ee"/>'
                     '<rect x="-30" y="-10" width="18" height="3" fill="#cfd8ee"/><rect x="12" y="-10" width="18" height="3" fill="#cfd8ee"/>'
                     '<circle cx="-14" cy="6" r="3" fill="#2fc27a"/><circle cx="14" cy="6" r="3" fill="#ff3b3b"/></g>')
        arte += f'<rect y="640" width="{W}" height="100" fill="#0b0d22"/>'
        sub = "Parte 2 · Mobilidade, conexão e tecnologia nas ruas"
    else:
        defs = lin("ceuF", [(0, "#7fd4f5"), (1, "#fff6d8")]) + rad("solF", [(0, "#fff8d0", 1), (1, "#ffe48a", 0)])
        arte = f'<rect width="{W}" height="{ARTE_H}" fill="url(#ceuF)"/><circle cx="1000" cy="120" r="160" fill="url(#solF)"/><circle cx="1000" cy="120" r="50" fill="#fff4b8"/>'
        arte += '<path d="M0 420 Q300 300 600 380 T1200 340 V740 H0 Z" fill="#8fd27a"/>'
        for (x, y, s) in [(160, 330, 1), (300, 300, 0.8), (430, 345, 0.9), (760, 330, 0.75)]:
            arte += (f'<g transform="translate({x} {y}) scale({s})"><path d="M-4 0 L-2 -170 L2 -170 L4 0 Z" fill="#f4f7fa"/>'
                     '<g transform="translate(0 -170)"><circle r="7" fill="#e6ecf2"/>'
                     + "".join(f'<path transform="rotate({a})" d="M0 -4 L70 -2 L70 2 L0 4 Z" fill="#ffffff"/>' for a in (15, 135, 255)) +
                     '</g></g>')
        prs = [(60, 160, 200, "#e8efe6"), (250, 130, 260, "#f5f0e4"), (420, 170, 230, "#e4ece9"),
               (630, 140, 300, "#efeae0"), (810, 180, 240, "#e8efe6"), (1020, 150, 280, "#f5f0e4")]
        for x, w, h, c in prs:
            arte += predio(x, 650, w, h, c, "#7fb6d6", "reto", False)
            arte += f'<rect x="{x-6}" y="{650-h-14}" width="{w+12}" height="16" rx="8" fill="#4fbf6a"/>'
            arte += "".join(
                f'<path d="M{x+6+k*28} {650-h-16} l20 -14 l8 0 l-20 14 z" fill="#2a4d8f"/>' for k in range(int(w / 28)))
        arte += ('<path d="M0 690 C300 650 700 720 1200 670 V740 H0 Z" fill="#3fa9d9"/>'
                 '<path d="M0 660 C300 620 700 690 1200 640" fill="none" stroke="#f2d33a" stroke-width="6" stroke-dasharray="20 14"/>')
        sub = "Parte 3 · Energia limpa, natureza e cidades sustentáveis"
    num = {1: 6, 2: 11, 3: 13}[parte]
    return quadro(num, f"Futuro das Cidades {parte}", sub, defs, arte)


# ---------------------------------------------------------------- 7 Vida Zen
def q_zen():
    defs = (lin("ceu7", [(0, "#cfe7ea"), (1, "#f7efe2")]) +
            lin("lago", [(0, "#a9d0d6"), (1, "#6fa5b0")]) +
            rad("sol7", [(0, "#fff7e6", 1), (1, "#ffe9c2", 0)]))
    petalas = "".join(
        f'<path transform="rotate({a})" d="M0 0 C-22 -30 -18 -78 0 -96 C18 -78 22 -30 0 0 Z" fill="{c}"/>'
        for a, c in [(-70, "#f7a8c4"), (-35, "#f490b5"), (0, "#fbbfd4"), (35, "#f490b5"), (70, "#f7a8c4"),
                     (-50, "#fcd2e1"), (50, "#fcd2e1"), (0, "#ffe1ec")])
    arte = f'''
    <rect width="{W}" height="{ARTE_H}" fill="url(#ceu7)"/>
    <circle cx="600" cy="300" r="260" fill="url(#sol7)"/>
    <circle cx="600" cy="300" r="120" fill="none" stroke="#2b3a42" stroke-opacity="0.75" stroke-width="22" stroke-dasharray="690 64" stroke-linecap="round" transform="rotate(-80 600 300)"/>
    <path d="M0 470 L140 330 L260 420 L380 300 L520 430 L640 360 L780 440 L900 320 L1040 420 L1200 340 V500 H0 Z" fill="#b6d3d8"/>
    <path d="M0 500 L180 400 L330 470 L480 390 L650 480 L820 410 L980 480 L1200 420 V520 H0 Z" fill="#8fb8c0"/>
    <rect y="500" width="{W}" height="240" fill="url(#lago)"/>
    {''.join(f'<rect x="{rnd.uniform(0,W):.0f}" y="{y}" width="{rnd.uniform(40,160):.0f}" height="2" fill="#ffffff" fill-opacity="0.45"/>' for y in range(510, 730, 11))}
    <!-- pedras empilhadas -->
    <g transform="translate(220 640)">
      <ellipse cx="0" cy="0" rx="90" ry="30" fill="#5d6b6f"/><ellipse cx="6" cy="-46" rx="70" ry="24" fill="#717f83"/>
      <ellipse cx="-4" cy="-86" rx="52" ry="19" fill="#85939a"/><ellipse cx="4" cy="-118" rx="36" ry="14" fill="#9aa8ae"/>
      <ellipse cx="0" cy="-142" rx="22" ry="10" fill="#b0bcc1"/>
    </g>
    <!-- lótus -->
    <g transform="translate(860 640)">
      <ellipse cx="0" cy="20" rx="170" ry="34" fill="#3f8a6a"/><ellipse cx="0" cy="18" rx="150" ry="26" fill="#55a07c"/>
      {petalas}
      <circle cx="0" cy="-12" r="14" fill="#f6d36b"/>
    </g>'''
    return quadro(7, "Vida Zen", "Equilíbrio, meditação e qualidade de vida", defs, arte)


# ---------------------------------------------------------------- 8 Cassiano Ricardo
def q_cassiano():
    defs = (lin("ceu8", [(0, "#2a2a6a"), (0.5, "#b2557a"), (1, "#f8b26a")]) +
            lin("banhado", [(0, "#5f7d4a"), (1, "#2c4430")]) +
            lin("pag8", [(0, "#fffaf0"), (1, "#e9dcc0")]))
    verso = ["Martim Cererê", "", "Vamos ver quem chega", "primeiro ao Brasil,", "ao sol, à terra nova…"]
    txt = "".join(
        f'<text x="370" y="{560+i*30}" font-family="Georgia, serif" font-style="italic" font-size="{30 if i==0 else 22}" '
        f'font-weight="{700 if i==0 else 400}" fill="#4a3a2a">{l}</text>' for i, l in enumerate(verso) if l)
    arte = f'''
    <rect width="{W}" height="{ARTE_H}" fill="url(#ceu8)"/>
    <circle cx="820" cy="390" r="70" fill="#ffd68a" fill-opacity="0.95"/>
    <path d="M0 380 L120 330 L260 360 L380 300 L520 350 L700 310 L860 350 L1000 300 L1200 340 V420 H0 Z" fill="#4b3d6e"/>
    <!-- cidade no alto da colina -->
    {''.join(f'<rect x="{x}" y="{400-h}" width="26" height="{h}" fill="#2b2448"/>' for x, h in [(60,60),(92,90),(124,50),(160,110),(200,70),(236,130),(272,80),(310,100),(350,60),(380,90)])}
    <path d="M0 400 Q300 380 600 420 T1200 410 V740 H0 Z" fill="url(#banhado)"/>
    {''.join(f'<ellipse cx="{rnd.uniform(0,W):.0f}" cy="{rnd.uniform(440,520):.0f}" rx="{rnd.uniform(40,120):.0f}" ry="{rnd.uniform(4,10):.0f}" fill="#f8b26a" fill-opacity="0.45"/>' for _ in range(14))}
    <!-- livro e pena -->
    <path d="M320 740 Q470 700 640 735 L640 520 Q470 490 320 525 Z" fill="url(#pag8)"/>
    <path d="M960 740 Q810 700 640 735 L640 520 Q810 490 960 525 Z" fill="url(#pag8)"/>
    <path d="M640 522 L640 735" stroke="#c4b08a" stroke-width="3"/>
    {txt}
    {''.join(f'<rect x="680" y="{560+k*26}" width="{rnd.uniform(150,240):.0f}" height="5" rx="2" fill="#7a6a55" fill-opacity="0.3"/>' for k in range(6))}
    <g transform="translate(1010 610)">
      <path d="M-30 40 h60 l-8 -50 h-44 z" fill="#1d2440"/><ellipse cx="0" cy="-10" rx="24" ry="6" fill="#0c0f1f"/>
      <path d="M-4 -6 C 40 -140 120 -220 170 -250 C 140 -190 90 -110 4 -4 Z" fill="#fbf6ea"/>
      <path d="M-2 -6 C 50 -110 110 -190 168 -248" stroke="#c9b48c" stroke-width="2" fill="none"/>
    </g>'''
    return quadro(8, "Cassiano Ricardo", "O poeta modernista de São José dos Campos", defs, arte)


# ---------------------------------------------------------------- 9 100 anos de aviação
def q_aviacao():
    defs = (lin("ceu9", [(0, "#2f7fd0"), (1, "#d7ecff")]) + lin("lona", [(0, "#fbf1d6"), (1, "#d9c393")]) +
            lin("jato", [(0, "#ffffff"), (1, "#c5d2e2")]))
    celula = lambda x, y, w, h: (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#lona)" stroke="#6b4a2a" stroke-width="3"/>'
                                 + "".join(f'<line x1="{x+k*w/4}" y1="{y}" x2="{x+k*w/4}" y2="{y+h}" stroke="#6b4a2a" stroke-width="2"/>' for k in range(1, 4)))
    arte = f'''
    <rect width="{W}" height="{ARTE_H}" fill="url(#ceu9)"/>
    {nuvem(150,520,1.6)}{nuvem(520,610,1.3)}{nuvem(980,560,1.8)}{nuvem(1040,430,0.9,0.8)}
    <text x="60" y="210" font-family="Inter, Arial, sans-serif" font-weight="900" font-size="112" fill="#ffffff" fill-opacity="0.22">1906 · 2006</text>
    <!-- 14-bis estilizado -->
    <g transform="translate(140 300) rotate(-4)">
      <line x1="60" y1="70" x2="470" y2="70" stroke="#6b4a2a" stroke-width="6"/>
      {celula(30, 40, 90, 60)}
      {celula(300, 0, 300, 50)}{celula(300, 90, 300, 50)}
      <line x1="300" y1="50" x2="300" y2="90" stroke="#6b4a2a" stroke-width="3"/><line x1="600" y1="50" x2="600" y2="90" stroke="#6b4a2a" stroke-width="3"/>
      <line x1="400" y1="50" x2="400" y2="90" stroke="#6b4a2a" stroke-width="3"/><line x1="500" y1="50" x2="500" y2="90" stroke="#6b4a2a" stroke-width="3"/>
      <ellipse cx="612" cy="70" rx="6" ry="40" fill="#5a3a1a"/>
      <circle cx="380" cy="64" r="9" fill="#2a1c12"/><path d="M372 72 h16 v14 h-16 z" fill="#2a1c12"/>
      <line x1="420" y1="140" x2="420" y2="175" stroke="#4a4a4a" stroke-width="4"/><circle cx="420" cy="182" r="9" fill="#333"/>
    </g>
    <!-- jato moderno -->
    <path d="M1200 60 C 1040 110 900 170 760 250" stroke="#ffffff" stroke-opacity="0.6" stroke-width="10" fill="none" stroke-linecap="round"/>
    <g transform="translate(760 250) rotate(-24)">
      <path d="M0 0 C 30 -12 160 -14 220 -8 C 240 -6 250 0 240 6 C 200 12 40 12 0 0 Z" fill="url(#jato)"/>
      <path d="M90 -4 L150 -70 L170 -70 L140 -4 Z" fill="#dfe7f1"/><path d="M90 6 L150 60 L170 60 L140 6 Z" fill="#c5d2e2"/>
      <path d="M200 -6 L232 -48 L246 -48 L232 -4 Z" fill="#1f5fa8"/>
      {''.join(f'<circle cx="{40+k*14}" cy="-3" r="2.6" fill="#1f3a5f"/>' for k in range(10))}
    </g>'''
    return quadro(9, "100 Anos de Aviação", "Do 14-bis de Santos Dumont ao polo aeroespacial do Vale", defs, arte)


# ---------------------------------------------------------------- 10 Sabores e Temperos
def q_sabores():
    defs = (lin("parede", [(0, "#4a2414"), (1, "#a8552a")]) + lin("mesa", [(0, "#9a6436"), (1, "#5e3a1d")]) +
            lin("barro", [(0, "#b4582f"), (1, "#6e2e16")]))
    graos = lambda x, y: "".join(
        f'<ellipse cx="{x+((k%3)-1)*12}" cy="{y-70+(k//3)*12}" rx="5" ry="6" fill="#f6cf3a" stroke="#d9a520" stroke-width="1"/>'
        for k in range(36))
    vapor = "".join(
        f'<path d="M{560+k*40} 330 q-20 -40 0 -80 q20 -40 0 -80" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="10" stroke-linecap="round"/>'
        for k in range(3))
    arte = f'''
    <rect width="{W}" height="{ARTE_H}" fill="url(#parede)"/>
    <circle cx="600" cy="260" r="360" fill="#ffcf8a" fill-opacity="0.08"/>
    <rect y="480" width="{W}" height="260" fill="url(#mesa)"/>
    {''.join(f'<line x1="0" y1="{y}" x2="{W}" y2="{y}" stroke="#3e2410" stroke-width="3"/>' for y in (540, 610, 680))}
    {vapor}
    <!-- panela de barro -->
    <ellipse cx="600" cy="610" rx="250" ry="34" fill="#000" fill-opacity="0.3"/>
    <path d="M370 430 Q370 620 600 625 Q830 620 830 430 Z" fill="url(#barro)"/>
    <ellipse cx="600" cy="430" rx="232" ry="40" fill="#5a240f"/>
    <ellipse cx="600" cy="434" rx="210" ry="30" fill="#c96a2c"/>
    {''.join(f'<circle cx="{600+rnd.uniform(-170,170):.0f}" cy="{434+rnd.uniform(-18,18):.0f}" r="{rnd.uniform(6,14):.0f}" fill="{rnd.choice(["#8a3a14","#e09a3a","#6aa84f","#b8461f"])}"/>' for _ in range(22))}
    <path d="M360 470 h-40 q-14 0 -14 14 v6 q0 14 14 14 h44" fill="none" stroke="#6e2e16" stroke-width="14"/>
    <path d="M840 470 h40 q14 0 14 14 v6 q0 14 -14 14 h-44" fill="none" stroke="#6e2e16" stroke-width="14"/>
    <!-- milho -->
    <g transform="translate(180 640) rotate(-28)"><ellipse cx="0" cy="-40" rx="26" ry="86" fill="#f6cf3a"/>{graos(0, 0)}
      <path d="M-26 20 Q-60 -40 -30 -110 Q-16 -40 0 30 Z" fill="#7fae4a"/><path d="M26 20 Q60 -40 30 -110 Q16 -40 0 30 Z" fill="#6a9a3a"/></g>
    <g transform="translate(250 660) rotate(-8)"><ellipse cx="0" cy="-40" rx="24" ry="80" fill="#f6cf3a"/>{graos(0, 4)}
      <path d="M-24 20 Q-56 -40 -28 -104 Q-14 -40 0 30 Z" fill="#7fae4a"/></g>
    <!-- pimentas -->
    {''.join(f'<path transform="translate({x} {y}) rotate({r})" d="M0 0 C 20 -6 60 -4 80 20 C 50 10 20 12 0 8 Z" fill="#d7261e"/><path transform="translate({x} {y}) rotate({r})" d="M0 2 l-14 -8" stroke="#3a7a2a" stroke-width="5"/>' for x, y, r in [(900,640,-10),(940,670,8),(980,630,-24),(1010,680,4)])}
    <!-- alho e ervas -->
    <g transform="translate(1080 600)"><path d="M0 0 C-40 -10 -40 -70 0 -80 C40 -70 40 -10 0 0 Z" fill="#f5efe2"/><path d="M0 -80 v-20" stroke="#cfc6b0" stroke-width="5"/></g>
    {''.join(f'<ellipse cx="{x}" cy="{y}" rx="16" ry="7" fill="#4f8a3a" transform="rotate({r} {x} {y})"/>' for x, y, r in [(120,560,-30),(150,545,10),(95,580,40),(1120,520,-20),(1150,540,30)])}
    <!-- colher de pau -->
    <g transform="translate(860 520) rotate(28)"><rect x="-6" y="-150" width="12" height="160" rx="6" fill="#d8a46a"/><ellipse cx="0" cy="-170" rx="24" ry="34" fill="#d8a46a"/></g>'''
    return quadro(10, "Sabores e Temperos da Terra", "A culinária caipira e os temperos do Vale do Paraíba", defs, arte)


# ---------------------------------------------------------------- 12 Antártida
def pinguim(x, y, s, flip=1):
    return (f'<g transform="translate({x} {y}) scale({s*flip} {s})">'
            '<ellipse cx="0" cy="0" rx="34" ry="60" fill="#1d2230"/><ellipse cx="6" cy="8" rx="24" ry="48" fill="#ffffff"/>'
            '<circle cx="2" cy="-62" r="24" fill="#1d2230"/><path d="M-8 -70 q10 -6 18 2" stroke="#ffffff" stroke-width="6" fill="none"/>'
            '<path d="M18 -60 L40 -54 L18 -50 Z" fill="#f28c28"/><circle cx="10" cy="-66" r="3" fill="#111"/>'
            '<path d="M-30 -10 Q-52 20 -40 40 L-26 10 Z" fill="#1d2230"/>'
            '<path d="M-14 56 h14 l-4 8 h-14 z M6 56 h14 l-4 8 h-14 z" fill="#f28c28"/></g>')


def q_antartida():
    defs = (lin("ceu12", [(0, "#4d8fd1"), (1, "#e9f6ff")]) + lin("mar12", [(0, "#1f5d8f"), (1, "#0d2f52")]) +
            lin("gelo", [(0, "#ffffff"), (1, "#bfe3f5")]))
    arte = f'''
    <rect width="{W}" height="{ARTE_H}" fill="url(#ceu12)"/>
    <path d="M0 160 C 300 80 500 220 800 120 C 1000 60 1100 140 1200 100" stroke="#7cf5c4" stroke-opacity="0.35" stroke-width="40" fill="none"/>
    <path d="M0 200 C 300 140 520 260 820 170 C 1000 120 1100 190 1200 160" stroke="#b07cf5" stroke-opacity="0.2" stroke-width="30" fill="none"/>
    <path d="M0 420 L90 300 L170 360 L260 250 L360 340 L470 280 L560 380 L640 420 Z" fill="url(#gelo)"/>
    <path d="M260 250 L300 420 L170 360 Z" fill="#a9d6ee"/>
    <path d="M700 420 L780 330 L860 360 L940 300 L1020 370 L1100 330 L1200 380 V420 Z" fill="url(#gelo)"/>
    <rect y="420" width="{W}" height="140" fill="url(#mar12)"/>
    <path d="M820 470 L860 430 L930 440 L960 480 Z" fill="#e8f6ff"/>
    <path d="M0 560 Q300 520 600 548 T1200 530 V740 H0 Z" fill="url(#gelo)"/>
    <!-- estação de pesquisa -->
    <g transform="translate(700 470)">
      {''.join(f'<rect x="{x}" y="40" width="6" height="40" fill="#5a6470"/>' for x in (10, 90, 170, 250))}
      <rect x="0" y="0" width="140" height="46" rx="6" fill="#e2672d"/><rect x="140" y="6" width="140" height="40" rx="6" fill="#2f8f5a"/>
      {''.join(f'<rect x="{x}" y="14" width="18" height="14" rx="2" fill="#dff3ff"/>' for x in (16, 46, 76, 106, 156, 186, 216, 246))}
      <rect x="300" y="-110" width="5" height="190" fill="#c9d1da"/>
      <g transform="translate(305 -110)"><rect width="78" height="54" fill="#009c3b"/><path d="M39 6 L72 27 L39 48 L6 27 Z" fill="#ffdf00"/><circle cx="39" cy="27" r="12" fill="#002776"/></g>
    </g>
    {pinguim(200, 640, 1.2)}{pinguim(290, 660, 1.0, -1)}{pinguim(380, 650, 1.1)}{pinguim(130, 680, 0.8, -1)}
    {''.join(f'<circle cx="{rnd.uniform(0,W):.0f}" cy="{rnd.uniform(0,ARTE_H):.0f}" r="{rnd.uniform(1,3):.1f}" fill="#ffffff" fill-opacity="0.7"/>' for _ in range(80))}'''
    return quadro(12, "Antártida", "Ciência brasileira no continente gelado", defs, arte)


# ---------------------------------------------------------------- 14 300 anos de Aparecida
def q_300():
    defs = (lin("ceu14", [(0, "#1a2350"), (0.5, "#6a4a8a"), (1, "#f6a96b")]) + lin("rio", [(0, "#c98a6a"), (1, "#2a3256")]) +
            rad("aura", [(0, "#fff1c2", 0.95), (0.4, "#ffd27a", 0.45), (1, "#ffd27a", 0)]) +
            lin("manto", [(0, "#2a4c9a"), (1, "#152a5c")]))
    rede = "".join(
        f'<path d="M{620+k*10} 520 Q{700+k*14} {600+k*4} {760+k*22} 640" fill="none" stroke="#e8dcc0" stroke-opacity="0.55" stroke-width="2"/>'
        for k in range(8))
    rede += "".join(
        f'<path d="M{625+j*4} {530+j*14} Q{720} {590+j*10} {770+j*16} {560+j*12}" fill="none" stroke="#e8dcc0" stroke-opacity="0.35" stroke-width="2"/>'
        for j in range(6))
    pescador = lambda x, s: (f'<g transform="translate({x} 548) scale({s})" fill="#141522"><circle cx="0" cy="-60" r="10"/>'
                             '<path d="M-10 -48 h20 l6 48 h-32 z"/><path d="M-22 -72 h44 l-8 -10 h-28 z"/></g>')
    arte = f'''
    <rect width="{W}" height="{ARTE_H}" fill="url(#ceu14)"/>
    {estrelas(50, 200)}
    <text x="600" y="210" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="900" font-size="150" fill="#ffffff" fill-opacity="0.12">1717 · 2017</text>
    <path d="M0 420 Q200 360 420 400 T860 380 T1200 400 V460 H0 Z" fill="#2c2a4a"/>
    <rect y="450" width="{W}" height="290" fill="url(#rio)"/>
    {''.join(f'<rect x="{rnd.uniform(0,W):.0f}" y="{y}" width="{rnd.uniform(60,200):.0f}" height="2" fill="#ffd9a8" fill-opacity="0.4"/>' for y in range(460, 735, 10))}
    <rect y="440" width="{W}" height="40" fill="#ffffff" fill-opacity="0.12"/>
    <!-- aura e imagem estilizada -->
    <circle cx="880" cy="430" r="190" fill="url(#aura)"/>
    {''.join(f'<path d="M880 430 L{880+math.cos(a)*260:.0f} {430+math.sin(a)*260:.0f}" stroke="#ffe7a8" stroke-opacity="0.35" stroke-width="3"/>' for a in [i*math.pi/12 for i in range(24)])}
    <g transform="translate(880 440)">
      <path d="M0 -92 C-34 -70 -48 10 -58 70 L58 70 C48 10 34 -70 0 -92 Z" fill="url(#manto)" stroke="#e8c15a" stroke-width="5"/>
      <circle cx="0" cy="-70" r="16" fill="#3a2a22"/>
      <path d="M-18 -92 L-12 -112 L-4 -98 L0 -118 L4 -98 L12 -112 L18 -92 Z" fill="#f2c94c"/>
      <path d="M-12 -40 L0 -20 L12 -40" fill="none" stroke="#e8c15a" stroke-width="3"/>
      {''.join(f'<circle cx="{math.cos(a)*30:.0f}" cy="{-108+math.sin(a)*10:.0f}" r="3" fill="#fff3c4"/>' for a in [i*math.pi/6 for i in range(12)])}
    </g>
    <!-- canoa com pescadores -->
    <path d="M240 560 Q420 600 640 556 L620 580 Q420 620 260 584 Z" fill="#3a2418"/>
    {pescador(320, 1.0)}{pescador(430, 1.05)}{pescador(560, 0.95)}
    <path d="M560 500 L620 520" stroke="#141522" stroke-width="6" stroke-linecap="round"/>
    {rede}'''
    return quadro(14, "300 Anos de Aparecida", "1717 – 2017 · O encontro da imagem nas águas do Rio Paraíba", defs, arte)


# ---------------------------------------------------------------- 15 15 anos da Rede Vanguarda
def q_15anos():
    listras = "".join(
        f'<rect x="0" y="{i*48}" width="{W}" height="44" fill="{c}"/>' for i, c in enumerate(ARCO))
    defs = (rad("fundo15", [(0, "#3a3fa8", 1), (0.6, "#141a54", 1), (1, "#070a26", 1)], cy=0.45, r=0.8) +
            lin("prata", [(0, "#ffffff"), (0.5, "#c6ccd8"), (1, "#8b93a6")], x2=1, y2=0) +
            f'<pattern id="arco15" patternUnits="userSpaceOnUse" x="0" y="210" width="{W}" height="480">{listras}</pattern>')
    numero = FONTE.path("15", 400, 330, 590, ancora="middle")
    confete = "".join(
        f'<rect x="{rnd.uniform(0,W):.0f}" y="{rnd.uniform(0,ARTE_H):.0f}" width="{rnd.uniform(8,18):.0f}" height="{rnd.uniform(4,8):.0f}" '
        f'fill="{rnd.choice(ARCO)}" transform="rotate({rnd.uniform(0,180):.0f} {rnd.uniform(0,W):.0f} {rnd.uniform(0,ARTE_H):.0f})"/>'
        for _ in range(140))
    v_listras = "".join(
        f'<path d="M{-150+i*15} {-80+i*30} L{150-i*15} {-80+i*30} L{150-(i+1)*15+2} {-80+(i+1)*30-3} L{-150+(i+1)*15-2} {-80+(i+1)*30-3} Z" fill="{c}"/>'
        for i, c in enumerate(ARCO))
    texto = FONTE.path(vanguarda("2003 – 2018"), 60, 900, 660, ancora="middle", tracking=0.04)
    arte = f'''
    <rect width="{W}" height="{ARTE_H}" fill="url(#fundo15)"/>
    {''.join(f'<path d="M600 300 L{600+math.cos(a)*1100:.0f} {300+math.sin(a)*1100:.0f}" stroke="#ffffff" stroke-opacity="0.05" stroke-width="40"/>' for a in [i*math.pi/10 for i in range(20)])}
    {confete}
    <path d="{numero}" fill="#000" fill-opacity="0.35" transform="translate(10 14)"/>
    <path d="{numero}" fill="url(#arco15)" stroke="#ffffff" stroke-width="8"/>
    <!-- logo V cilíndrico estilizado -->
    <g transform="translate(900 330) scale(0.9)">
      <ellipse cx="0" cy="150" rx="210" ry="30" fill="#000" fill-opacity="0.35"/>
      <path d="M-200 -90 L-200 130 Q0 175 200 130 L200 -90 Z" fill="url(#prata)"/>
      <ellipse cx="0" cy="-90" rx="200" ry="40" fill="#2b2f6a"/>
      <g>{v_listras}</g>
      <path d="M-200 -90 L-150 -80 L0 230 L-60 160 Z" fill="#e8ecf4" fill-opacity="0.0"/>
      <path d="M-170 -84 L-150 -80 L-4 222 L-24 214 Z" fill="#ffffff" fill-opacity="0.85"/>
      <path d="M170 -84 L150 -80 L4 222 L24 214 Z" fill="#ffffff" fill-opacity="0.85"/>
    </g>
    <path d="{texto}" fill="#ffffff"/>'''
    return quadro(15, "15 Anos da Rede Vanguarda", "2003 – 2018 · A TV do Vale, do Litoral Norte e da Mantiqueira", defs, arte)


QUADROS = [
    ("01-aparecida", q_aparecida), ("02-mazzaropi", q_mazzaropi), ("03-alcatrazes", q_alcatrazes),
    ("04-monteiro-lobato", q_lobato), ("05-via-dutra", q_dutra), ("06-futuro-das-cidades-1", lambda: q_futuro(1)),
    ("07-vida-zen", q_zen), ("08-cassiano-ricardo", q_cassiano), ("09-100-anos-de-aviacao", q_aviacao),
    ("10-sabores-e-temperos-da-terra", q_sabores), ("11-futuro-das-cidades-2", lambda: q_futuro(2)),
    ("12-antartida", q_antartida), ("13-futuro-das-cidades-3", lambda: q_futuro(3)),
    ("14-300-anos-de-aparecida", q_300), ("15-15-anos-da-rede-vanguarda", q_15anos),
]


# ---------------------------------------------------------------- Telões do palco
def telao(tipo):
    TW, TH = 1920, 1080
    defs = (rad("fundoT", [(0, "#2c2f86", 1), (0.55, "#12154a", 1), (1, "#05061c", 1)], cy=0.5, r=0.85) +
            lin("prataT", [(0, "#ffffff"), (0.48, "#e9edf5"), (0.52, "#b9c0cf"), (1, "#f4f6fb")]) +
            lin("arcoT", [(i / 9, c) for i, c in enumerate(ARCO)], x2=1, y2=0))
    grade = "".join(
        f'<rect x="{x}" y="{y}" width="118" height="118" fill="#ffffff" fill-opacity="{0.02 + 0.04*((x//120+y//120)%2)}"/>'
        for x in range(0, TW, 120) for y in range(0, TH, 120))
    base = f'<rect width="{TW}" height="{TH}" fill="url(#fundoT)"/>{grade}'
    if tipo == "centro":
        # V arco-íris (logo atual estilizado)
        faixas = ""
        n = len(ARCO)
        topo_y, base_y = 170, 930
        for i, c in enumerate(ARCO):
            y1 = topo_y + (base_y - topo_y) * i / n
            y2 = topo_y + (base_y - topo_y) * (i + 1) / n - 8
            hw1 = 560 * (1 - i / n)
            hw2 = 560 * (1 - (i + 1) / n) + 4
            faixas += f'<path d="M{960-hw1:.0f} {y1:.0f} L{960+hw1:.0f} {y1:.0f} L{960+hw2:.0f} {y2:.0f} L{960-hw2:.0f} {y2:.0f} Z" fill="{c}"/>'
        conteudo = f'''
  <ellipse cx="960" cy="560" rx="760" ry="430" fill="#7b3fe0" fill-opacity="0.12"/>
  <path d="M190 200 L330 200 Q350 200 360 220 L700 900 Q706 930 676 930 L230 930 Q190 930 190 890 Z" fill="url(#prataT)"/>
  <path d="M1730 200 L1590 200 Q1570 200 1560 220 L1220 900 Q1214 930 1244 930 L1690 930 Q1730 930 1730 890 Z" fill="url(#prataT)"/>
  {faixas}'''
    else:
        palavra = "DANIEL" if tipo == "esquerda" else "20 ANOS"
        tam = 400 if tipo == "esquerda" else 350
        d = FONTE.path(vanguarda(palavra), tam, 960, 690, ancora="middle", tracking=0.02)
        conteudo = f'''
  <rect x="0" y="880" width="{TW}" height="16" fill="url(#arcoT)"/>
  <path d="{d}" fill="#000" fill-opacity="0.45" transform="translate(12 16)"/>
  <path d="{d}" fill="url(#prataT)" stroke="#ffffff" stroke-width="3"/>
  <rect x="0" y="184" width="{TW}" height="16" fill="url(#arcoT)"/>'''
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {TW} {TH}" width="{TW}" height="{TH}">
  <title>Telão {tipo} — Daniel 20 Anos</title>
  <defs>{defs}</defs>
  {base}
  {conteudo}
</svg>
'''


def main():
    pasta = os.path.join(RAIZ, "vanguarda-especial")
    os.makedirs(pasta, exist_ok=True)
    for nome, fn in QUADROS:
        open(os.path.join(pasta, nome + ".svg"), "w", encoding="utf-8").write(fn())
        print("ok", nome)
    pasta_t = os.path.join(RAIZ, "teloes")
    os.makedirs(pasta_t, exist_ok=True)
    for tipo in ("esquerda", "centro", "direita"):
        nome = {"esquerda": "telao-esquerda-daniel", "centro": "telao-centro-arco-iris", "direita": "telao-direita-20-anos"}[tipo]
        open(os.path.join(pasta_t, nome + ".svg"), "w", encoding="utf-8").write(telao(tipo))
        print("ok", nome)


if __name__ == "__main__":
    main()
