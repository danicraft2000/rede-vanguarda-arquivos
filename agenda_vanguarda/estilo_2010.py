#!/usr/bin/env python3
"""
Agenda Vanguarda: refaz a vinheta de 2012 com o visual da vinheta de 2010.

Mexe só em três coisas, usando o vídeo de 2010 como referência:
  1. CORES   - monta uma LUT 3D medindo as cores do vídeo de 2010: as faces das
               telinhas ganham a luminosidade, a saturação e o matiz de 2010
               (carmim -> coral, roxo -> rosa-magenta, índigo -> roxo escuro...) e os
               cinzas ganham o tom azul-acinzentado de 2010. O vidro prateado
               fica fosco, como as caixas cinza-azuladas de 2010.
  2. CÂMERA  - câmera virtual livre: inclinação (roll), olhar para cima/lados
               (pitch/yaw, por homografia de rotação), empurrão lento de zoom e
               lente grande-angular com barril e vinheta, como em 2010.
               Na logo final a câmera assenta e para.
  3. PROPORÇÕES - quadro 4:3 com tarjas pretas (igual à referência de 2010) e as
               telinhas comprimidas na horizontal (16:9 -> 4:3), ficando com o
               formato mais "quadradinho" das telinhas de 2010 (~1,35:1).
               A logo final NÃO é comprimida, só enquadrada em 4:3.

Uso:
  python3 estilo_2010.py BASE_2012.mp4 REFERENCIA_2010.mp4 SAIDA.mp4 \
      [--cube lut_2010.cube] [--comparacao lado_a_lado.mp4] [--previa previa.jpg]

Depende de: ffmpeg/ffprobe, numpy, opencv-python-headless, scipy.
"""
import argparse
import json
import subprocess

import cv2
import numpy as np
from scipy.ndimage import gaussian_filter, gaussian_filter1d, maximum_filter1d

# ---------------------------------------------------------------- parâmetros
COMPRESSAO_TELINHAS = 0.75   # 16:9 -> 4:3: telinhas de ~1,75:1 viram ~1,3:1
LENTE_BARRIL = 0.06         # distorção grande-angular (0 = sem distorção)
VINHETA = 0.24               # escurecimento nos cantos
VIDRO_FOSCO = 0.6            # quanto tirar do brilho/reflexo do vidro prateado
TOM_FRIO = 0.04              # puxa os cinzas (vidro/fundo) para o azul-claro de 2010
LUT_NA_LOGO = 0.35           # força da cor de 2010 na logo (preserva as cores da marca)
SUPERAMOSTRAGEM = 2          # renderiza em 2x e reduz (evita serrilhado na compressão)
FOCAL = 1.0                  # focal da câmera virtual, em alturas de quadro (~53° vertical)
INTENSIDADE_CAMERA = 1.0     # 0 = câmera original; 1,5 = câmera livre mais solta (corta mais)


def camera_livre(t):
    """Movimento da câmera livre (graus) no tempo t (s): flutuação suave, sem tremer."""
    roll = 1.8 * np.sin(2 * np.pi * 0.21 * t + 0.6) + 0.7 * np.sin(2 * np.pi * 0.57 * t + 2.1)
    pitch = 1.2 * np.sin(2 * np.pi * 0.16 * t + 1.0)
    yaw = 1.5 * np.sin(2 * np.pi * 0.12 * t + 0.3) + 0.5 * np.sin(2 * np.pi * 0.43 * t + 1.7)
    return roll, pitch, yaw


# ---------------------------------------------------------------- vídeo E/S
def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height,r_frame_rate", "-of", "json", path],
        capture_output=True, text=True, check=True).stdout
    s = json.loads(out)["streams"][0]
    num, den = map(int, s["r_frame_rate"].split("/"))
    return s["width"], s["height"], num / den


def ler_quadros(path):
    w, h, fps = probe(path)
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-f", "rawvideo",
                          "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE)
    quadros, n = [], w * h * 3
    while True:
        buf = p.stdout.read(n)
        if len(buf) < n:
            break
        quadros.append(np.frombuffer(buf, np.uint8).reshape(h, w, 3))
    p.wait()
    return quadros, fps


def abrir_encoder(path, w, h, fps, audio_de=None):
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24",
           "-s", f"{w}x{h}", "-r", str(fps), "-i", "-"]
    if audio_de:
        cmd += ["-i", audio_de, "-map", "0:v", "-map", "1:a?", "-c:a", "copy"]
    cmd += ["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
            "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
            "-movflags", "+faststart", path]
    return subprocess.Popen(cmd, stdin=subprocess.PIPE)


# ---------------------------------------------------------------- análise
def area_util(quadros, limiar=16, margem=6):
    """Retângulo sem as tarjas pretas (a referência de 2010 é 4:3 com tarjas)."""
    m = np.mean([q.mean(axis=2) for q in quadros], axis=0)
    cols = np.where(m.mean(0) > limiar)[0]
    rows = np.where(m.mean(1) > limiar)[0]
    return rows[0] + margem, rows[-1] + 1 - margem, cols[0] + margem, cols[-1] + 1 - margem


def inicio_da_logo(quadros, fps, limiar=6.0):
    """Primeiro quadro do trecho final parado (a logo)."""
    peq = [cv2.cvtColor(cv2.resize(q, (160, 90), interpolation=cv2.INTER_AREA),
                        cv2.COLOR_BGR2GRAY).astype(np.float32) for q in quadros]
    d = np.array([np.abs(peq[i + 1] - peq[i]).mean() for i in range(len(peq) - 1)])
    grandes = np.where(d >= limiar)[0]
    if len(grandes) == 0:
        return None
    inicio = int(grandes[-1]) + 1
    return inicio if len(quadros) - inicio >= fps else None


def centro_da_logo(quadro):
    """Centro horizontal das letras da logo (para enquadrar em 4:3 sem cortar)."""
    hsv = cv2.cvtColor(quadro, cv2.COLOR_BGR2HSV)
    s, v = hsv[..., 1] / 255.0, hsv[..., 2] / 255.0
    preto = (v < 0.10).astype(np.float32)
    perto_do_preto = cv2.boxFilter(preto, -1, (41, 41))
    letras = (((v > 0.55) | ((s > 0.45) & (v > 0.30))) & (perto_do_preto > 0.25) & (preto == 0))
    n, _, est, _ = cv2.connectedComponentsWithStats(letras.astype(np.uint8), 8)
    h, w = letras.shape
    x0, x1 = w, 0
    for i in range(1, n):
        x, y, bw, bh, area = est[i]
        if area < 1500 or bw > 350 or not 0.3 < bh / bw < 3.5:
            continue  # descarta ruído e as barras compridas da moldura prateada
        if x < 30 or y < 30 or x + bw > w - 30 or y + bh > h - 30:
            continue  # descarta o que encosta na borda do quadro
        x0, x1 = min(x0, x), max(x1, x + bw)
    return None if x1 <= x0 else (x0 + x1) / 2.0


# ---------------------------------------------------------------- cor
# matiz (h do LAB, graus) das cores das telinhas de 2012 -> cor equivalente medida em 2010
# (agrupamentos k-means das duas vinhetas): carmim 40° -> coral 30°, amarelo-oliva 101°
# -> dourado, roxo 320° -> rosa-magenta 336°, ameixa 345° -> malva 353°, índigo 309°
# -> roxo escuro 321°. Azul do fundo (263°) e verdes ficam onde estão.
ANCORAS_MATIZ = [(23, 23), (40, 30), (65, 57), (101, 92), (150, 150), (230, 230), (263, 263),
                 (298, 298), (309, 321), (320, 336), (345, 353), (358, 359)]
_Q = np.linspace(0, 1, 257)


def _rgb2lab(x):
    return cv2.cvtColor(x.reshape(-1, 1, 3).astype(np.float32), cv2.COLOR_RGB2LAB).reshape(-1, 3).astype(np.float64)


def _lab2rgb(x):
    return cv2.cvtColor(x.reshape(-1, 1, 3).astype(np.float32), cv2.COLOR_LAB2RGB).reshape(-1, 3).astype(np.float64)


def _casar(x, origem, alvo):
    """Curva crescente que leva a distribuição `origem` na distribuição `alvo`."""
    return np.interp(x, np.quantile(origem, _Q), np.quantile(alvo, _Q))


def _tom_por_L(lab, bins):
    """Tom médio (a, b) dos cinzas em cada faixa de luminosidade."""
    idx = np.clip(np.digitize(lab[:, 0], bins) - 1, 0, len(bins) - 2)
    n = np.bincount(idx, minlength=len(bins) - 1).astype(float)
    a = np.bincount(idx, lab[:, 1], minlength=len(bins) - 1)
    b = np.bincount(idx, lab[:, 2], minlength=len(bins) - 1)
    ok, cen = n > 50, (bins[:-1] + bins[1:]) / 2
    a = np.interp(cen, cen[ok], a[ok] / n[ok])
    b = np.interp(cen, cen[ok], b[ok] / n[ok])
    return cen, gaussian_filter1d(a, 1.5, mode="nearest"), gaussian_filter1d(b, 1.5, mode="nearest")


def aprender_lut(origem, alvo, n=33, forca_croma=0.7, forca_tom=0.7, forca_L_cinza=0.6):
    """LUT 3D (RGB 0-1) que dá às cores de 2012 o visual de 2010.

    origem/alvo: amostras de pixels RGB (0-1) das telinhas de 2012 e do vídeo de 2010.
    - Cores (faces das telinhas): luminosidade e saturação (croma) casadas com as
      distribuições medidas em 2010; matiz pelas âncoras ANCORAS_MATIZ.
    - Cinzas (vidro e fundo): curva de luminosidade + o tom azul-acinzentado que os
      cinzas de 2010 têm em cada faixa de brilho.
    As duas partes se misturam pela saturação da cor, e a LUT é suavizada no fim."""
    g = np.linspace(0, 1, n)
    grade = np.stack(np.meshgrid(g, g, g, indexing="ij"), -1).reshape(-1, 3)
    lo, la, lg = _rgb2lab(origem), _rgb2lab(alvo), _rgb2lab(grade)
    co_, ca_, cg = (np.hypot(x[:, 1], x[:, 2]) for x in (lo, la, lg))
    hg = np.degrees(np.arctan2(lg[:, 2], lg[:, 1])) % 360

    # --- faces coloridas das telinhas
    cor_o, cor_a = co_ > 20, ca_ > 20
    L = _casar(lg[:, 0], lo[cor_o, 0], la[cor_a, 0])
    C = cg + forca_croma * (_casar(cg, co_[cor_o], ca_[cor_a]) - cg)
    anc = np.array(ANCORAS_MATIZ, float)
    eixo = np.arange(360.0)
    delta = gaussian_filter1d(np.interp(eixo, anc[:, 0], anc[:, 1] - anc[:, 0], period=360), 4, mode="wrap")
    h = np.radians(hg + np.interp(hg, eixo, delta, period=360))
    cor = np.clip(_lab2rgb(np.stack([L, C * np.cos(h), C * np.sin(h)], 1)), 0, 1)

    # --- cinzas: vidro e fundo
    no, na = lo[co_ < 15], la[ca_ < 15]
    L2 = lg[:, 0] + forca_L_cinza * (_casar(lg[:, 0], no[:, 0], na[:, 0]) - lg[:, 0])
    bins = np.linspace(0, 100, 26)
    cen, ao, bo = _tom_por_L(no, bins)
    _, aa, ba = _tom_por_L(na, bins)
    lt, lt2 = np.minimum(lg[:, 0], 85), np.minimum(L2, 85)   # 2010 quase não tem branco puro
    sx = np.clip((lg[:, 0] - 85) / 15, 0, 1)
    f = forca_tom * (1 - 0.6 * sx * sx * (3 - 2 * sx))
    a2 = lg[:, 1] * 0.85 + f * (np.interp(lt2, cen, aa) - np.interp(lt, cen, ao))
    b2 = lg[:, 2] * 0.85 + f * (np.interp(lt2, cen, ba) - np.interp(lt, cen, bo))
    cinza = np.clip(_lab2rgb(np.stack([L2, a2, b2], 1)), 0, 1)

    w = np.clip((cg - 10) / 15, 0, 1)[:, None]
    w = w * w * (3 - 2 * w)
    desloc = (w * cor + (1 - w) * cinza - grade).reshape(n, n, n, 3)
    for k in range(3):
        desloc[..., k] = gaussian_filter(desloc[..., k], 1.0, mode="nearest")
    return np.clip(grade.reshape(n, n, n, 3) + desloc, 0, 1).astype(np.float32)


def salvar_cube(lut, path):
    n = lut.shape[0]
    with open(path, "w") as f:
        f.write('TITLE "Agenda Vanguarda 2010"\n')
        f.write(f"LUT_3D_SIZE {n}\n")
        for b in range(n):
            for g in range(n):
                for r in range(n):
                    f.write("%.6f %.6f %.6f\n" % tuple(lut[r, g, b]))


def aplicar_lut(img, lut):
    n = lut.shape[0]
    c = img[:, :, ::-1].astype(np.float32) * ((n - 1) / 255.0)
    i0 = np.clip(np.floor(c).astype(np.int32), 0, n - 2)
    f = c - i0
    r, g, b = i0[..., 0], i0[..., 1], i0[..., 2]
    fr, fg, fb = f[..., 0:1], f[..., 1:2], f[..., 2:3]
    out = 0
    for dr in (0, 1):
        for dg in (0, 1):
            for db in (0, 1):
                w = (fr if dr else 1 - fr) * (fg if dg else 1 - fg) * (fb if db else 1 - fb)
                out = out + w * lut[r + dr, g + dg, b + db]
    return out[:, :, ::-1] * 255.0  # BGR float


def vidro_fosco(img, forca, frio):
    """Tira o brilho/reflexo do vidro prateado (só nas áreas sem cor), como as
    caixas cinza-azuladas foscas de 2010, e esfria levemente os cinzas.
    As faces coloridas das telinhas não são tocadas."""
    if forca <= 0 and frio <= 0:
        return img
    hsv = cv2.cvtColor(np.clip(img, 0, 255).astype(np.uint8), cv2.COLOR_BGR2HSV)
    neutro = np.clip((0.25 - hsv[..., 1] / 255.0) / 0.15, 0, 1)[..., None].astype(np.float32)
    # borrão ponderado só pelos pixels cinzas: a cor das telinhas não vaza para o vidro
    soma = cv2.GaussianBlur(img * neutro, (0, 0), 6)
    peso = cv2.GaussianBlur(neutro, (0, 0), 6)[..., None]
    base = np.where(peso > 1e-3, soma / np.maximum(peso, 1e-3), img)
    out = base + (img - base) * (1 - forca * neutro)
    ganho = np.array([1 + frio, 1.0, 1 - frio], np.float32)  # B, G, R
    return out * (1 + (ganho - 1) * neutro)


# ---------------------------------------------------------------- câmera
def rotacao(roll, pitch, yaw):
    r, p, y = np.radians([roll, pitch, yaw])
    rz = np.array([[np.cos(r), -np.sin(r), 0], [np.sin(r), np.cos(r), 0], [0, 0, 1]])
    rx = np.array([[1, 0, 0], [0, np.cos(p), -np.sin(p)], [0, np.sin(p), np.cos(p)]])
    ry = np.array([[np.cos(y), 0, np.sin(y)], [0, 1, 0], [-np.sin(y), 0, np.cos(y)]])
    return rz @ rx @ ry


def projetar(X, Y, k, rot, f):
    """Coordenadas normalizadas de saída -> coordenadas normalizadas na origem (zoom 1)."""
    r2 = X * X + Y * Y
    X1, Y1 = X * (1 + k * r2), Y * (1 + k * r2)
    dx = rot[0, 0] * X1 + rot[0, 1] * Y1 + rot[0, 2] * f
    dy = rot[1, 0] * X1 + rot[1, 1] * Y1 + rot[1, 2] * f
    dz = rot[2, 0] * X1 + rot[2, 1] * Y1 + rot[2, 2] * f
    return f * dx / dz, f * dy / dz


def zoom_minimo(wc, hc, ws, hs, cx, sq, k, rot):
    """Menor zoom que mantém o quadro todo dentro da imagem original (sem bordas)."""
    t = np.linspace(-0.5, 0.5, 64)
    a = wc / hc / 2
    X = np.concatenate([t * 2 * a, t * 2 * a, np.full(64, -a), np.full(64, a)])
    Y = np.concatenate([np.full(64, -0.5), np.full(64, 0.5), t, t])
    X2, Y2 = projetar(X, Y, k, rot, FOCAL)
    z = [1.0]
    z.append(np.max(np.where(X2 > 0, X2 * hs / (sq * (ws - 1 - cx)), -X2 * hs / (sq * (cx - 1)))))
    z.append(np.max(np.abs(Y2) * hs / (hs / 2 - 1)))
    return float(max(z))


def mapas(wc, hc, ws, hs, cx, sq, k, rot, zoom, ss):
    u = (np.arange(wc * ss) + 0.5) / ss - wc / 2
    v = (np.arange(hc * ss) + 0.5) / ss - hc / 2
    X, Y = np.meshgrid(u / hc, v / hc)
    X2, Y2 = projetar(X, Y, k, rot, FOCAL)
    mx = cx + X2 * hs / (sq * zoom) - 0.5
    my = hs / 2 + Y2 * hs / zoom - 0.5
    return mx.astype(np.float32), my.astype(np.float32)


def vinheta(wc, hc, forca):
    u = (np.arange(wc) + 0.5 - wc / 2) / (wc / 2)
    v = (np.arange(hc) + 0.5 - hc / 2) / (hc / 2)
    X, Y = np.meshgrid(u, v)
    r = np.sqrt((X ** 2 + Y ** 2) / 2)
    m = 1 - forca * np.clip(r, 0, 1) ** 2.2
    # cantos levemente mais frios, como na lente de 2010
    return np.stack([m ** 0.85, m ** 1.0, m ** 1.12], -1).astype(np.float32)


def suave(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


# ---------------------------------------------------------------- principal
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("base", help="vinheta de 2012 (vídeo a modificar)")
    ap.add_argument("referencia", help="vinheta de 2010 (referência)")
    ap.add_argument("saida")
    ap.add_argument("--cube", help="salva também a LUT de cor em .cube")
    ap.add_argument("--comparacao", help="vídeo lado a lado: 2012 original | estilo 2010")
    ap.add_argument("--previa", help="folha de quadros (jpg) antes/depois/referência")
    args = ap.parse_args()

    base, fps = ler_quadros(args.base)
    ref, _ = ler_quadros(args.referencia)
    hs, ws = base[0].shape[:2]
    y0, y1, x0, x1 = area_util(ref)
    print(f"base: {len(base)} quadros {ws}x{hs} @ {fps:g} qps | referência: {len(ref)} quadros, área útil x={x0}-{x1}")

    # trechos: telinhas -> transição -> logo parada
    logo = inicio_da_logo(base, fps)
    rampa = 5
    if logo is None:
        env = np.ones(len(base))
        cx_logo = ws / 2
        print("logo final parada não encontrada: tratando o vídeo todo como telinhas")
    else:
        idx = np.arange(len(base))
        env = 1 - suave((idx - (logo - rampa)) / rampa)
        cx_logo = centro_da_logo(base[-1]) or ws / 2
        print(f"telinhas: quadros 1-{logo - rampa} | transição até {logo} | logo parada a partir do {logo + 1}"
              f" (centro x={cx_logo:.0f})")

    # 1) cor: LUT aprendida da referência de 2010
    rng = np.random.default_rng(0)
    tel = [q for q, e in zip(base, env) if e >= 0.999]
    amostra_base = np.concatenate([q.reshape(-1, 3)[rng.choice(hs * ws, 4000, replace=False)] for q in tel])
    amostra_ref = np.concatenate([q[y0:y1, x0:x1].reshape(-1, 3)[rng.choice((y1 - y0) * (x1 - x0), 18000, replace=False)]
                                  for q in ref])
    lut = aprender_lut(amostra_base[:, ::-1] / 255.0, amostra_ref[:, ::-1] / 255.0)
    if args.cube:
        salvar_cube(lut, args.cube)
        print("LUT salva em", args.cube)

    # 2) e 3) câmera e proporções
    hc = hs
    wc = int(round(hc * 4 / 3)) // 2 * 2       # 960x720
    cx_logo = float(np.clip(cx_logo, wc / 2 + 1, ws - wc / 2 - 1))
    params = []
    for i, e in enumerate(env):
        t = i / fps
        roll, pitch, yaw = (e * INTENSIDADE_CAMERA * a for a in camera_livre(t))
        rot = rotacao(roll, pitch, yaw)
        sq = 1 - (1 - COMPRESSAO_TELINHAS) * e
        cx = e * ws / 2 + (1 - e) * cx_logo
        k = LENTE_BARRIL * e
        params.append(dict(rot=rot, sq=sq, cx=cx, k=k, e=e,
                           zmin=zoom_minimo(wc, hc, ws, hs, cx, sq, k, rot)))
    zmin = np.array([p["zmin"] for p in params])
    # zoom que respira devagar (não acompanha cada balanço) + leve empurrão de câmera
    zs = gaussian_filter1d(maximum_filter1d(zmin, 25, mode="nearest"), 5, mode="nearest")
    n_tel = max(1, int(np.sum(env >= 0.999)))
    empurrao = 1 + 0.05 * np.clip(np.arange(len(base)) / n_tel, 0, 1) * env
    zoom = np.maximum(zs * env + (1 - env) * zmin, zmin) * empurrao

    vin = vinheta(wc, hc, VINHETA)
    off = (ws - wc) // 2
    enc = abrir_encoder(args.saida, ws, hs, fps, audio_de=args.base)
    enc_cmp = abrir_encoder(args.comparacao, ws, hs // 2 + hs // 2, fps, audio_de=args.base) if args.comparacao else None
    previa = []
    for i, (q, p) in enumerate(zip(base, params)):
        e = p["e"]
        f = q.astype(np.float32)
        forca_lut = LUT_NA_LOGO + (1 - LUT_NA_LOGO) * e
        f = f + (aplicar_lut(q, lut) - f) * forca_lut
        f = vidro_fosco(f, VIDRO_FOSCO * e, TOM_FRIO * e)
        mx, my = mapas(wc, hc, ws, hs, p["cx"], p["sq"], p["k"], p["rot"], zoom[i], SUPERAMOSTRAGEM)
        g = cv2.remap(f, mx, my, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
        g = cv2.resize(g, (wc, hc), interpolation=cv2.INTER_AREA) * vin
        quadro = np.zeros((hs, ws, 3), np.uint8)
        quadro[:, off:off + wc] = np.clip(g + 0.5, 0, 255).astype(np.uint8)
        enc.stdin.write(quadro.tobytes())
        if enc_cmp:
            a = cv2.resize(q, (ws // 2, hs // 2), interpolation=cv2.INTER_AREA)
            b = cv2.resize(quadro, (ws // 2, hs // 2), interpolation=cv2.INTER_AREA)
            lado = np.zeros((hs // 2 + hs // 2, ws, 3), np.uint8)
            lado[hs // 4: hs // 4 + hs // 2] = np.hstack([a, b])
            cv2.putText(lado, "2012 original", (20, hs // 4 - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
            cv2.putText(lado, "estilo 2010", (ws // 2 + 20, hs // 4 - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
            enc_cmp.stdin.write(lado.tobytes())
        if args.previa and i % 16 == 0:
            previa.append(np.hstack([cv2.resize(q, (640, 360)), cv2.resize(quadro, (640, 360))]))
        if i % 25 == 0:
            print(f"  quadro {i + 1}/{len(base)}  zoom {zoom[i]:.3f}  compressão {p['sq']:.2f}")
    enc.stdin.close()
    enc.wait()
    if enc_cmp:
        enc_cmp.stdin.close()
        enc_cmp.wait()
    if args.previa:
        cv2.imwrite(args.previa, np.vstack(previa), [cv2.IMWRITE_JPEG_QUALITY, 88])
    print("pronto:", args.saida)


if __name__ == "__main__":
    main()
