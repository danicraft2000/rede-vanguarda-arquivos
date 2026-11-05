"""Métricas objetivas para comparar o original com uma versão processada.

Nenhuma métrica substitui a escuta. Elas servem para descartar parâmetros que claramente
removem música ou criam artefatos, e para documentar o que cada filtro muda.
"""
from __future__ import annotations

import numpy as np
import scipy.signal as ss

import comum as C


def _banda(m, sr, lo, hi):
    sos = ss.butter(6, [lo, min(hi, sr / 2 - 100)], "bandpass", fs=sr, output="sos")
    return ss.sosfiltfilt(sos, m)


def regioes(m, sr, inicio_musica):
    """Máscaras de quadros (STFT 4096/1024): fortes, quietos, banda aberta (codec), trecho inicial."""
    f, t, S = C.stft_psd_db(m, sr, 4096, 1024)
    nivel = 10 * np.log10(np.mean(10 ** (S[(f > 100) & (f < 4000)] / 10), axis=0) + 1e-30)
    mus = t > inicio_musica + 0.2
    lim_f = np.percentile(nivel[mus], 70)
    lim_q = np.percentile(nivel[mus], 20)
    aberta = np.array([np.any(S[(f > 9000) & (f < 10300), j] > -125) for j in range(S.shape[1])])
    return {"t": t, "forte": mus & (nivel >= lim_f), "quieto": mus & (nivel <= lim_q),
            "aberta": mus & aberta & (nivel >= lim_f), "inicial": (t > 0.1) & (t < inicio_musica - 0.05)}


def comparar(orig, proc, sr, reg):
    """Compara orig e proc (mono, mesmo comprimento) nas regiões dadas."""
    assert len(orig) == len(proc), "comprimento mudou"
    f, t, So = C.stft_psd_db(orig, sr, 4096, 1024)
    _, _, Sp = C.stft_psd_db(proc, sr, 4096, 1024)
    Po, Pp = 10 ** (So / 10), 10 ** (Sp / 10)

    def mudanca(mask_t, lo, hi):
        kf = (f >= lo) & (f < hi)
        if not mask_t.any():
            return None
        return round(float(10 * np.log10(Pp[np.ix_(kf, mask_t)].sum() / Po[np.ix_(kf, mask_t)].sum())), 2)

    res = orig - proc
    # resíduo nas faixas onde está a música (100 Hz-4 kHz): quanto menor, menos música foi removida
    mo, rr = _banda(orig, sr, 100, 4000), _banda(res, sr, 100, 4000)
    forte_amostras = np.zeros(len(orig), bool)
    salto = 1024
    for j in np.flatnonzero(reg["forte"]):
        forte_amostras[j * salto:j * salto + 4096] = True
    srr = 10 * np.log10(np.sum(mo[forte_amostras] ** 2) / (np.sum(rr[forte_amostras] ** 2) + 1e-30))

    # transientes agudos (pratos, chimbal): correlação do fluxo espectral 4-10 kHz
    kf = (f >= 4000) & (f < 10300)
    fo = np.maximum(np.diff(np.sqrt(Po[kf]), axis=1), 0).sum(0)
    fp = np.maximum(np.diff(np.sqrt(Pp[kf]), axis=1), 0).sum(0)
    corr_trans = float(np.corrcoef(fo, fp)[0, 1])

    # Artefatos de redução espectral: (a) "ruído musical" = ilhas tempo-frequência isoladas;
    # (b) "bombeamento" = o nível do chiado passa a oscilar quadro a quadro. Medimos (b) como o
    # desvio-padrão (dB) do nível 6,5-10 kHz nos quadros fortes de banda aberta, e (a) como a
    # fração de células 4-10 kHz >= 10 dB acima das 4 vizinhas (quadros sem sobreposição).
    kb = (f >= 6500) & (f < 10000)
    def flutuacao(P):
        if not reg["aberta"].any():
            return None
        nivel = 10 * np.log10(P[np.ix_(kb, reg["aberta"])].mean(0) + 1e-30)
        return float(np.std(np.diff(nivel)))
    def ilhas(sinal):
        ff, tt, A = C.stft_psd_db(sinal, sr, 1024, 1024)
        A = A[(ff >= 4000) & (ff < 10300)]
        c = A[1:-1, 1:-1]
        viz = np.maximum.reduce([A[:-2, 1:-1], A[2:, 1:-1], A[1:-1, :-2], A[1:-1, 2:]])
        validas = c > -135
        return float(np.sum((c - viz >= 10) & validas) / max(np.sum(validas), 1) * 1000)
    # harmônicos musicais agudos: os 4 picos tonais mais fortes do espectro médio dos quadros fortes de
    # banda aberta, em 4,6-6 kHz e em 6-7,6 kHz; mede quanto cada um perdeu (ideal 0 dB)
    def harmonicos(lo, hi):
        if not reg["aberta"].any():
            return None, None
        mo, mp = Po[:, reg["aberta"]].mean(1), Pp[:, reg["aberta"]].mean(1)
        kh = np.flatnonzero((f >= lo) & (f < hi))
        pk, _ = ss.find_peaks(10 * np.log10(mo[kh] + 1e-30), prominence=8)
        if not len(pk):
            return None, None
        top = kh[pk][np.argsort(mo[kh[pk]])[-4:]]
        perda = 10 * np.log10(mp[top] / mo[top])
        return float(np.mean(perda)), float(np.min(perda))
    h1m, h1p = harmonicos(4600, 6000)
    h2m, h2p = harmonicos(6000, 7600)
    ko, kp = flutuacao(Po), flutuacao(Pp)
    io, ip = ilhas(orig), ilhas(proc)

    # piso: percentil 10 por bin dentro da música (dB/Hz), média 1-10 kHz
    mus = reg["forte"] | reg["quieto"] | (~reg["inicial"] & (reg["t"] > 0))
    kfl = (f > 1000) & (f < 10000)
    piso_o = np.mean(np.percentile(So[np.ix_(kfl, mus)], 10, axis=1))
    piso_p = np.mean(np.percentile(Sp[np.ix_(kfl, mus)], 10, axis=1))

    return {
        "agudos_6k5_10k_banda_aberta_db": mudanca(reg["aberta"], 6500, 10300),
        "medios_200_4k_trechos_fortes_db": mudanca(reg["forte"], 200, 4000),
        "graves_40_100_trechos_fortes_db": mudanca(reg["forte"], 40, 100),
        "subsonico_5_25_db": mudanca(np.ones(len(t), bool), 5, 25),
        "quietos_1k_10k_db": mudanca(reg["quieto"], 1000, 10300),
        "trecho_inicial_200_10k_db": mudanca(reg["inicial"], 200, 10300),
        "trecho_inicial_total_db": mudanca(reg["inicial"], 5, 22050),
        "piso_p10_1k_10k_db": round(float(piso_p - piso_o), 2),
        "sinal_residuo_100_4k_fortes_db": round(float(srr), 1),
        "corr_transientes_agudos": round(corr_trans, 3),
        "harmonicos_4k6_6k_media_db": None if h1m is None else round(h1m, 2),
        "harmonicos_4k6_6k_pior_db": None if h1p is None else round(h1p, 2),
        "harmonicos_6k_7k6_media_db": None if h2m is None else round(h2m, 2),
        "harmonicos_6k_7k6_pior_db": None if h2p is None else round(h2p, 2),
        "flutuacao_agudos_db_orig": round(ko, 2) if ko is not None else None,
        "flutuacao_agudos_db_proc": round(kp, 2) if kp is not None else None,
        "ilhas_por_mil_orig": round(io, 2), "ilhas_por_mil_proc": round(ip, 2),
        "amostras_alteradas_pct": round(float(np.mean(np.abs(res) > 1e-5)) * 100, 2),
        "pico_dbfs": round(float(C.db(np.max(np.abs(proc)))), 2),
        "rms_dbfs": round(C.rms_db(proc), 2),
        "duracao_s": round(len(proc) / sr, 6),
        "atraso_amostras": C.atraso(orig, proc, 2048),
    }
