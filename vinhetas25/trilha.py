#!/usr/bin/env python3
"""Trilha sonora original, sintetizada do zero (numpy/scipy), sincronizada com o roteiro.

Pads, arpejos, baixo, bateria eletronica, sinos FM, "whooshes" nas transicoes,
risers e impactos nas revelacoes. Nao usa nenhum som/jingle da emissora.

Uso: python3 trilha.py [saida.wav]
"""
import json
import sys
from pathlib import Path

import numpy as np
from scipy import signal

SR = 48000
ROOT = Path(__file__).parent
RNG = np.random.default_rng(2028)


def linha_do_tempo():
    r = json.loads((ROOT / "roteiro.json").read_text(encoding="utf-8"))
    T = r["transicao"]
    t, out = 0.0, []
    for c in r["cenas"]:
        out.append({**c, "ini": t})
        t += c["dur"] - T
    total = out[-1]["ini"] + out[-1]["dur"]
    return out, total, T


# ------------------------------------------------------------------ utilidades
def tvec(d):
    return np.arange(int(d * SR)) / SR


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_adsr(n, a=0.01, d=0.1, s=0.7, r=0.2):
    t = np.arange(n) / SR
    dur = n / SR
    e = np.ones(n) * s
    e[t < a] = t[t < a] / max(a, 1e-6)
    m = (t >= a) & (t < a + d)
    e[m] = 1 - (1 - s) * (t[m] - a) / max(d, 1e-6)
    rr = t > dur - r
    e[rr] *= np.clip((dur - t[rr]) / max(r, 1e-6), 0, 1)
    return e


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="high", fs=SR, output="sos"), x)


class Mix:
    def __init__(self, total):
        self.n = int(total * SR) + SR
        self.dry = np.zeros((2, self.n))
        self.wet = np.zeros((2, self.n))

    def add(self, sig, t0, gain=1.0, pan=0.0, rev=0.25):
        i0 = int(t0 * SR)
        if i0 >= self.n:
            return
        if sig.ndim == 1:
            l = np.cos((pan + 1) * np.pi / 4)
            r = np.sin((pan + 1) * np.pi / 4)
            sig = np.vstack([sig * l, sig * r]) * np.sqrt(2)
        i1 = min(self.n, i0 + sig.shape[1])
        if i0 < 0:
            sig = sig[:, -i0:]
            i0 = 0
        seg_ = sig[:, : i1 - i0] * gain
        self.dry[:, i0:i1] += seg_
        self.wet[:, i0:i1] += seg_ * rev


# ------------------------------------------------------------------ instrumentos
def saw_add(f, t, nh=14, bright=1.0):
    y = np.zeros_like(t)
    ph = RNG.random() * 6.28
    for k in range(1, nh + 1):
        if f * k > 12000:
            break
        y += np.sin(2 * np.pi * f * k * t + ph * k) / k * np.exp(-(k - 1) / (5.0 * bright))
    return y


def pad(notes, dur, bright=1.0):
    t = tvec(dur)
    L = np.zeros_like(t)
    R = np.zeros_like(t)
    for m in notes:
        f = midi(m)
        for det, side in ((-0.12, -1), (0.0, 0), (0.11, 1)):
            v = saw_add(f * 2 ** (det / 12), t, nh=10, bright=bright)
            L += v * (0.75 - 0.35 * side)
            R += v * (0.75 + 0.35 * side)
    e = env_adsr(len(t), a=min(0.5, dur * 0.3), d=0.3, s=0.85, r=min(0.9, dur * 0.4))
    trem = 1 + 0.06 * np.sin(2 * np.pi * 0.25 * t)
    return np.vstack([L, R]) * e * trem / (len(notes) * 3)


def pluck(m, dur=0.5, bright=1.0):
    t = tvec(dur)
    f = midi(m)
    y = np.zeros_like(t)
    for k in range(1, 9):
        y += np.sin(2 * np.pi * f * k * t) / k ** 1.3 * np.exp(-t * (5 + k * 3.5 / bright))
    return y * np.minimum(1, t / 0.003)


def bell(m, dur=2.0, idx=3.5, ratio=3.5):
    t = tvec(dur)
    f = midi(m)
    I = idx * np.exp(-t * 3.0)
    y = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * ratio * t))
    y += 0.4 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 4)
    return y * np.exp(-t * 1.6) * np.minimum(1, t / 0.002)


def kick(gain=1.0):
    t = tvec(0.5)
    f = 46 + 110 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t * 7.5) + 0.25 * np.exp(-t * 300) * RNG.standard_normal(len(t))
    return np.tanh(y * 1.6) * gain


def clap():
    t = tvec(0.35)
    n = RNG.standard_normal(len(t))
    e = np.zeros_like(t)
    for o in (0.0, 0.011, 0.023):
        e += (t >= o) * np.exp(-(t - o) * 55) * (t >= o)
    e += np.exp(-t * 14) * 0.5
    return bp(n, 900, 3200) * e


def hat(open_=False):
    t = tvec(0.25 if open_ else 0.07)
    return hp(RNG.standard_normal(len(t)), 7500) * np.exp(-t * (16 if open_ else 70))


def snare():
    t = tvec(0.25)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25)
    return body * 0.6 + bp(RNG.standard_normal(len(t)), 1500, 8000) * np.exp(-t * 18)


def noise_sweep(dur, f0, f1, shape="updown"):
    """ruido com banda passante que varre de f0 a f1 (STFT simples)"""
    n = int(dur * SR)
    x = RNG.standard_normal(n + 4096)
    f, tt, Z = signal.stft(x, fs=SR, nperseg=2048)
    pos = np.clip(tt / dur, 0, 1)
    fc = f0 * (f1 / f0) ** pos
    mask = np.exp(-0.5 * (np.log2((f[:, None] + 1) / fc[None, :]) / 0.6) ** 2)
    _, y = signal.istft(Z * mask, fs=SR, nperseg=2048)
    y = y[:n]
    tq = np.arange(n) / n
    if shape == "updown":
        e = np.sin(np.pi * tq) ** 1.5
    elif shape == "up":
        e = tq ** 2.2
    else:
        e = (1 - tq) ** 2
    return y * e / (np.abs(y).max() + 1e-9)


def whoosh(dur=0.9):
    a = noise_sweep(dur, 300, 6000, "updown")
    b = noise_sweep(dur, 5000, 400, "updown")
    return np.vstack([a * 0.8 + b * 0.4, a * 0.4 + b * 0.8])


def riser(dur, f0=180, f1=1400):
    t = tvec(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = (np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.2 * np.sin(3.01 * ph)) * (t / dur) ** 2
    return tone * 0.35 + noise_sweep(dur, 400, 9000, "up") * 0.6


def rev_cymbal(dur=1.2):
    t = tvec(dur)
    return hp(RNG.standard_normal(len(t)), 4000) * (t / dur) ** 3


def impact():
    t = tvec(3.0)
    sub = np.sin(2 * np.pi * (38 + 40 * np.exp(-t * 6)) * t) * np.exp(-t * 1.6)
    crack = lp(RNG.standard_normal(len(t)), 3000) * np.exp(-t * 9)
    crash = hp(RNG.standard_normal(len(t)), 3500) * np.exp(-t * 1.8) * 0.5
    return np.tanh((sub * 1.4 + crack * 0.6 + crash) * 1.2)


def make_ir(dur=2.6):
    t = tvec(dur)
    irs = []
    for _ in range(2):
        n = RNG.standard_normal(len(t)) * np.exp(-t * 2.4)
        n = lp(n, 7000) * (1 - np.exp(-t * 200))
        irs.append(n / np.sqrt(np.sum(n ** 2)))
    return irs


# ------------------------------------------------------------------ musica
# Mi maior: I - V - vi - IV  (E, B, C#m, A)
PROG = [(52, "M"), (47, "M"), (49, "m"), (45, "M")]
FIN = [(54, "M"), (49, "M"), (51, "m"), (47, "M")]  # sobe um tom no final


def chord(root, q):
    return [root, root + (4 if q == "M" else 3), root + 7]


def main(dst):
    cenas, total, T = linha_do_tempo()
    by = {c["id"]: c for c in cenas}
    mx = Mix(total)
    BAR = 7.0 / 4  # cada vinheta (7,5 s - 0,5 s de transicao) = 4 compassos
    BEAT = BAR / 4
    G = by["01"]["ini"] + T / 2  # tempo forte alinhado ao meio de cada transicao
    S25 = by["25"]["ini"]
    HIT25 = S25 + 4.0
    SM, S26 = by["M"]["ini"], by["26"]["ini"]

    def nivel(t):  # intensidade do arranjo
        if t < G - 2 * BAR:
            return 0
        if t < by["07"]["ini"]:
            return 1
        if t < by["17"]["ini"]:
            return 2
        return 3

    # --- abertura: riser pelo tunel e impacto no titulo (~4,05 s)
    hit0 = 4.05
    mx.add(riser(3.6) * 0.5, hit0 - 3.6, pan=0, rev=0.4)
    for k in range(7):  # pulsos graves acelerando
        tt = hit0 - 3.5 + (1 - 0.82 ** k) * 3.1
        mx.add(kick(0.55), tt, rev=0.1)
    mx.add(rev_cymbal(1.4) * 0.35, hit0 - 1.4, rev=0.3)
    mx.add(impact() * 0.9, hit0, rev=0.5)
    mx.add(pad(chord(52, "M") + [64, 71], G - hit0 + 0.8, bright=1.3) * 1.6, hit0, rev=0.6)
    for i, m in enumerate([76, 80, 83, 88]):
        mx.add(bell(m, 2.5) * 0.18, hit0 + 0.05 + i * 0.09, pan=-0.5 + i * 0.33, rev=0.6)

    # --- groove principal: de G-2 compassos ate o rufar do final
    t_end_groove = S25 + 2.0
    nb = int((t_end_groove - (G - 2 * BAR)) / BAR) + 1
    for b in range(nb):
        t0 = G - 2 * BAR + b * BAR
        if t0 >= t_end_groove:
            break
        lv = nivel(t0 + 0.01)
        root, q = PROG[b % 4]
        notes = chord(root, q)
        mx.add(pad(notes + [notes[0] + 12], BAR + 0.6, bright=0.8 + 0.25 * lv) * (0.9 + 0.15 * lv), t0, rev=0.5)
        # baixo
        if lv >= 1:
            for k, off in enumerate([0, 1.5, 2, 3.5] if lv >= 2 else [0, 2]):
                ts = t0 + off * BEAT
                if ts < t_end_groove:
                    mx.add(lp(pluck(root - 12, 0.45, 0.5), 900) * (0.55 if k == 0 else 0.42), ts, rev=0.05)
        # arpejo em colcheias (semicolcheias no nivel 3)
        arp = [notes[0] + 24, notes[1] + 24, notes[2] + 24, notes[0] + 36, notes[2] + 24, notes[1] + 24, notes[2] + 24, notes[1] + 36]
        step = BEAT / 2 if lv < 3 else BEAT / 4
        for k in range(int(BAR / step)):
            ts = t0 + k * step
            if ts >= t_end_groove:
                break
            m = arp[k % len(arp)]
            mx.add(pluck(m, 0.4, 1.2) * (0.09 if lv < 3 else 0.07), ts, pan=0.45 * np.sin(k * 1.3), rev=0.35)
        # bateria
        for k in range(4):
            ts = t0 + k * BEAT
            if ts >= t_end_groove:
                break
            if lv >= 1 and (k in (0, 2) or lv >= 2):
                mx.add(kick(0.75 if lv >= 2 else 0.55), ts, rev=0.05)
            if lv >= 2 and k in (1, 3):
                mx.add(clap() * 0.32, ts, rev=0.3)
            if lv >= 2:
                mx.add(hat() * 0.12, ts + BEAT / 2, pan=0.3, rev=0.1)
            if lv >= 3:
                mx.add(hat() * 0.07, ts + BEAT / 4, pan=-0.3, rev=0.1)
                mx.add(hat() * 0.07, ts + 3 * BEAT / 4, pan=-0.3, rev=0.1)

    # --- transicoes e revelacoes de cada vinheta
    for c in cenas:
        cid = c["id"]
        if cid in ("00",):
            continue
        tc = c["ini"]  # inicio da transicao que traz esta cena
        mx.add(whoosh(1.0) * 0.28, tc - 0.5 + T / 2, rev=0.35)
        if cid.isdigit() and 1 <= int(cid) <= 24:
            b = int(round((tc + T / 2 - G) / BAR))
            root, q = PROG[(b + 1) % 4]
            notes = chord(root, q)
            reveal = tc + T / 2 + BAR  # um compasso depois do corte
            mx.add(rev_cymbal(0.9) * 0.12, reveal - 0.9, rev=0.4)
            for i, m in enumerate([notes[0] + 24, notes[1] + 24, notes[2] + 24, notes[0] + 36]):
                mx.add(bell(m, 2.2) * 0.13, reveal + i * 0.07, pan=-0.45 + i * 0.3, rev=0.55)
            mx.add(kick(0.5), reveal, rev=0.2)

    # --- 25 anos: rufar, riser, IMPACTO e refrao um tom acima
    for k in range(48):
        tt = S25 + 2.0 + 2.0 * (1 - (1 - k / 48) ** 1.4)
        mx.add(snare() * (0.08 + 0.3 * k / 48), tt, pan=0.1, rev=0.25)
    mx.add(riser(2.2, 220, 2200) * 0.55, HIT25 - 2.2, rev=0.4)
    mx.add(impact() * 1.0, HIT25, rev=0.6)
    for i, m in enumerate([78, 82, 85, 90, 94]):
        mx.add(bell(m, 3.0) * 0.16, HIT25 + 0.02 + i * 0.08, pan=-0.6 + i * 0.3, rev=0.7)
    nb25 = int((SM + T - HIT25) / BAR) + 1
    for b in range(nb25):
        t0 = HIT25 + b * BAR
        root, q = FIN[b % 4]
        notes = chord(root, q)
        last = t0 + BAR > SM + 1.0
        mx.add(pad(notes + [notes[0] + 12, notes[1] + 12], BAR + 0.8, bright=1.6) * 1.15, t0, rev=0.55)
        for k, off in enumerate([0, 1.5, 2, 3.5]):
            mx.add(lp(pluck(root - 12, 0.45, 0.6), 1000) * 0.55, t0 + off * BEAT, rev=0.05)
        arp = [notes[0] + 24, notes[1] + 24, notes[2] + 24, notes[0] + 36, notes[1] + 36, notes[2] + 24, notes[1] + 24, notes[0] + 36]
        for k in range(16):
            mx.add(pluck(arp[k % 8], 0.35, 1.4) * 0.07, t0 + k * BEAT / 4, pan=0.5 * np.sin(k), rev=0.35)
        if not last:
            for k in range(4):
                ts = t0 + k * BEAT
                mx.add(kick(0.8), ts, rev=0.05)
                if k in (1, 3):
                    mx.add(clap() * 0.35, ts, rev=0.3)
                mx.add(hat() * 0.1, ts + BEAT / 2, pan=0.3, rev=0.1)
                mx.add(hat(True) * 0.05, ts + BEAT / 2, pan=-0.3, rev=0.2)
        # sinos na melodia (motivo simples)
        mot = [notes[2] + 24, notes[1] + 24, notes[0] + 24, notes[1] + 24]
        for k, m in enumerate(mot):
            mx.add(bell(m, 1.6, idx=2.5) * 0.08, t0 + k * BEAT, pan=0.2, rev=0.6)

    # --- mosaico: respiracao (pads e sinos, sem bateria)
    tM = SM + T / 2
    for b in range(int((S26 - tM) / BAR) + 1):
        t0 = tM + b * BAR
        root, q = FIN[b % 4]
        notes = chord(root, q)
        mx.add(pad(notes + [notes[0] + 12], BAR + 0.8, bright=1.0) * 0.9, t0, rev=0.6)
        for k, m in enumerate([notes[0] + 24, notes[2] + 24, notes[1] + 36, notes[2] + 24]):
            mx.add(bell(m, 2.0, idx=2.0) * 0.07, t0 + k * BEAT, pan=-0.4 + 0.27 * k, rev=0.7)

    # --- encerramento: acorde final que se resolve e some
    t26 = S26 + T / 2
    mx.add(impact() * 0.55, t26 + 0.2, rev=0.6)
    fim = total - t26
    mx.add(pad([54, 61, 66, 70, 73, 78], fim, bright=1.2) * 1.4, t26, rev=0.7)
    mx.add(lp(pluck(42, 3.0, 0.4), 500) * 0.6, t26 + 0.2, rev=0.3)
    for i, m in enumerate([78, 82, 85, 90]):
        mx.add(bell(m, 3.5, idx=2.0) * 0.14, S26 + 1.0 + i * 0.12, pan=-0.5 + i * 0.33, rev=0.7)
    for i, m in enumerate([85, 90, 94]):
        mx.add(bell(m, 4.0, idx=1.5) * 0.09, S26 + 4.0 + i * 0.2, pan=0.4 - i * 0.4, rev=0.8)

    # --- reverb, master e fade final
    irs = make_ir()
    wet = np.vstack([signal.fftconvolve(mx.wet[i], irs[i])[: mx.n] for i in range(2)])
    y = mx.dry + wet * 0.9
    y = hp(y, 28)
    n = int(total * SR)
    y = y[:, :n]
    tt = np.arange(n) / SR
    fade = np.clip((total - tt) / 2.5, 0, 1) ** 1.5
    y *= fade
    # compressao suave + limitador
    y = y / (np.percentile(np.abs(y), 99.9) + 1e-9) * 0.7
    y = np.tanh(y * 1.25) / np.tanh(1.25) * 0.93
    pcm = (np.clip(y, -1, 1) * 32767).astype("<i2").T.copy()
    import wave

    with wave.open(str(dst), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"trilha: {total:.2f} s -> {dst}")


if __name__ == "__main__":
    main(Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "build" / "trilha.wav"))
