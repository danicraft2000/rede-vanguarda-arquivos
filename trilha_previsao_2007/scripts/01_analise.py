"""FASE 1 - Análise técnica da trilha da Previsão (VHS 2007).

Uso: python3 scripts/01_analise.py
Gera analise/relatorio_analise.json e os gráficos em analise/*.png.
Não altera o arquivo original (o SHA-256 é conferido antes e depois).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import librosa
import librosa.display
import matplotlib
import numpy as np
import scipy.signal as ss

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

sys.path.insert(0, str(Path(__file__).parent))
import comum as C  # noqa: E402

SAIDA = C.RAIZ / "analise"


def achar_inicio_musica(m, sr, limiar_db=-35.0):
    r, t = C.rms_quadros(m, sr, 0.02, 0.005)
    return float(t[np.argmax(r > limiar_db)] - 0.01)


def analisar_clipping(m, sr):
    pico = np.max(np.abs(m))
    a = np.abs(m)
    # 1) clipping digital: amostras no fundo de escala
    digital = int(np.sum(a >= 0.999))
    # 2) platôs: >=4 amostras seguidas quase iguais perto do pico do trecho
    perto = a > 0.85 * pico
    plano = np.r_[False, np.abs(np.diff(m)) < 2e-4 * pico]
    cand = perto & plano
    runs, n = 0, 0
    for v in cand:
        n = n + 1 if v else 0
        if n == 3:  # 3 diferenças ~0 => 4 amostras
            runs += 1
    # 3) histograma: sinal cortado acumula amostras logo abaixo do nível de corte
    h, borda = np.histogram(a[a > 0.5 * pico], bins=50)
    topo = h[-3:].mean()
    antes = h[-10:-3].mean()
    razao = float(topo / max(antes, 1))
    confirmado = digital > 0 or runs > 20 or razao > 1.5
    return {
        "pico_amostra": round(float(pico), 5),
        "pico_dbfs": round(float(C.db(pico)), 2),
        "amostras_em_fundo_de_escala": digital,
        "plateaus_4_amostras_perto_do_pico": runs,
        "razao_histograma_topo": round(razao, 3),
        "clipping_confirmado": bool(confirmado),
        "conclusao": ("clipping confirmado" if confirmado else
                      "sem clipping: pico 11 dB abaixo do fundo de escala, sem platôs e sem acúmulo "
                      "de amostras no topo do histograma (adeclip não se justifica)"),
    }


def analisar_pulsos_inicio(m, sr, inicio):
    seg = m[:int(inicio * sr)]
    pk, _ = ss.find_peaks(np.abs(seg), height=10 ** (-40 / 20), distance=int(0.02 * sr))
    inter = np.diff(pk) / sr
    grade = float(np.median(inter[inter < 0.15])) if np.any(inter < 0.15) else None
    mult = [round(float(v / grade), 2) for v in inter] if grade else []
    fora = np.ones(len(seg), bool)
    for p in pk:
        fora[max(0, p - int(0.004 * sr)):p + int(0.06 * sr)] = False
    # espectro de um pulso
    if len(pk):
        f, p = ss.welch(seg, sr, nperseg=8192)
        cen = float(np.sum(f * p) / np.sum(p))
    else:
        cen = None
    return {
        "n_pulsos": int(len(pk)), "tempos_s": [round(float(v), 3) for v in pk / sr],
        "grade_s": round(grade, 4) if grade else None,
        "intervalos_em_multiplos_da_grade": mult,
        "pico_dbfs": round(float(C.db(np.max(np.abs(seg)))), 1),
        "centroide_espectral_hz": round(cen, 1) if cen else None,
        "rms_entre_pulsos_dbfs": round(C.rms_db(seg[fora][int(0.05 * sr):]), 1),
        "interpretacao": ("pulsos graves e suaves (~8 ms, energia < 150 Hz) numa grade de ~102 ms, "
                          "com batidas omitidas em múltiplos inteiros da grade e em fase com a entrada da "
                          "música (o início da música cai exatamente na grade): padrão rítmico ligado ao "
                          "arranjo, não um defeito mecânico periódico. Não são removidos; só a parte "
                          "subsônica (<25 Hz) é atenuada pelo passa-altas (ver graves_subsonicos)"),
    }, fora


def faixa_por_quadro(m, sr, limiar=-105.0):
    f, t, S = C.stft_db(m, sr, 4096, 1024)
    acima = S > limiar
    corte = np.array([f[np.flatnonzero(c)[-1]] if c.any() else 0 for c in acima.T])
    return t, corte


def main():
    SAIDA.mkdir(parents=True, exist_ok=True)
    sha_antes = C.conferir_original()
    info = C.ffprobe(C.ENTRADA)
    st, fmt = info["streams"][0], info["format"]
    quadros = C.recensear_quadros_mp3(C.ENTRADA)
    x, sr = C.decodificar(C.ENTRADA)
    canais = x.shape[1]
    m = C.mid(x)
    dur = len(m) / sr

    # ---------------------------------------------------------------- canais
    L, R = x[:, 0], x[:, 1]
    S = (L - R) / 2
    canais_info = {
        "correlacao_L_R": round(float(np.corrcoef(L, R)[0, 1]), 7),
        "rms_L_dbfs": round(C.rms_db(L), 2), "rms_R_dbfs": round(C.rms_db(R), 2),
        "rms_lateral_S_dbfs": round(C.rms_db(S), 2),
        "lateral_abaixo_do_mid_db": round(C.rms_db(m) - C.rms_db(S), 1),
    }
    canais_info["conclusao"] = (
        "mono duplicado (dual-mono): L e R praticamente idênticos; a diferença L-R é resíduo do "
        "joint-stereo do MP3. Processar o sinal mid e gravá-lo igual nos 2 canais mantém a "
        "gravação mono, sem estéreo artificial" if canais_info["correlacao_L_R"] > 0.999 else "estéreo real")

    # ---------------------------------------------------------------- regiões
    ini = achar_inicio_musica(m, sr)
    pulsos, fora_pulso = analisar_pulsos_inicio(m, sr, ini)
    r, tq = C.rms_quadros(m, sr)
    musica = tq > ini + 0.2
    rm = r[musica]
    lim_quieto = np.percentile(rm, 10)

    # ---------------------------------------------------------------- níveis
    niveis = C.resumo_medidas(m, sr)
    niveis["dc_offset"] = round(float(np.mean(m)), 7)

    # ---------------------------------------------------------------- ruído
    f_n, piso, media_db = C.piso_ruido_espectral(m, sr, mascara_t=lambda t: t > ini + 0.2)
    f_l, p_lead = C.ltas(m[int(0.05 * sr):int(ini * sr)][fora_pulso[int(0.05 * sr):int(ini * sr)]], sr, 4096)
    f_m, p_mus = C.ltas(m[int((ini + 0.2) * sr):], sr, 4096)
    snr_bandas = {}
    for lo, hi in C.BANDAS_OITAVA:
        k = (f_n >= lo) & (f_n < hi)
        snr_bandas[f"{lo}-{hi}"] = round(float(np.mean(media_db[k]) - np.mean(piso[k])), 1)
    ruido_bandas = {k: round(v, 1) for k, v in C.niveis_bandas(f_l, p_lead, C.BANDAS_OITAVA).items()}
    sflat_lead = float(np.exp(np.mean(np.log(p_lead[(f_l > 100) & (f_l < 10000)] + 1e-30))) /
                       np.mean(p_lead[(f_l > 100) & (f_l < 10000)]))
    ruido_lead_rms = pulsos["rms_entre_pulsos_dbfs"]
    p95 = float(np.percentile(rm, 95))
    med = float(np.median(rm))
    ruido = {
        "nota_snr_por_oitava": "diferença entre a potência média e o percentil 10 de cada bin durante a música (estimativa)",
        "rms_trecho_inicial_entre_pulsos_dbfs": ruido_lead_rms,
        "quadros_musica_p10_dbfs": round(float(lim_quieto), 1),
        "quadros_musica_min_dbfs": round(float(rm.min()), 1),
        "espectro_ruido_inicial_por_oitava_db": ruido_bandas,
        "planura_espectral_ruido_100_10k": round(sflat_lead, 4),
        "snr_por_oitava_media_vs_piso_db": snr_bandas,
        "carater": "",
    }
    hf = ruido_bandas["5600-11200"]
    ruido["carater"] = (
        "ruído de fundo muito baixo e concentrado nos graves; chiado (hiss) de fita praticamente "
        "ausente no trecho sem música (>5,6 kHz em %.0f dB): os codecs com perdas (AAC/MP3) "
        "eliminaram o chiado fraco junto com os agudos fracos" % hf)

    # ---------------------------------------------------------------- SNR
    snr = {
        "sinal_quadros_p95_dbfs": round(p95, 1), "sinal_quadros_mediana_dbfs": round(med, 1),
        "ruido_referencia_dbfs": ruido_lead_rms,
        "snr_pico_musica_db": round(p95 - ruido_lead_rms, 1),
        "snr_mediana_musica_db": round(med - ruido_lead_rms, 1),
        "observacao": ("ruído medido no trecho inicial sem música (fora dos pulsos). Como os codecs "
                       "removem ruído fraco quando não há música, a SNR real da fita era menor; o "
                       "ruído que sobra durante a música é mascarado e modulado pelo codec"),
    }

    # ---------------------------------------------------------------- zumbido
    zmb = C.zumbido(m[int((ini + 0.2) * sr):], sr)
    zmb_ini = C.zumbido(m[int(0.05 * sr):int(ini * sr)], sr, nperseg=1 << 15)
    detectados, candidatos = [], []
    for f0, lista in zmb.items():
        for h in lista:
            if (h["proeminencia_db"] >= 6 and h["persistencia"] >= 0.6 and h["desvio_nivel_db"] <= 4
                    and h["corr_com_envelope_musica"] < 0.5):
                detectados.append({"familia": f0, **h})
            elif h["proeminencia_db"] >= 6 and h["persistencia"] >= 0.3:
                candidatos.append({"familia": f0, **h})
    zumbido_info = {
        "musica": zmb, "trecho_inicial": zmb_ini, "componentes_detectados": detectados,
        "candidatos_rejeitados": candidatos,
        "criterio": ("zumbido = proeminência >= 6 dB sobre o fundo local (±3-15 Hz), presente em >= 60% das "
                     "janelas de 1,5 s, nível estável (desvio <= 4 dB) e sem acompanhar o envelope da música "
                     "(corr < 0,5)"),
        "conclusao": ("nenhum zumbido de rede (50/60 Hz) confirmado. As linhas em 60/120 Hz variam junto "
                      "com a música (desvio de nível alto e correlação com o envelope) e somem no trecho "
                      "sem música: são graves do arranjo, não interferência elétrica. Notch não se justifica"
                      if not detectados else "zumbido confirmado nas componentes listadas"),
    }

    # ---------------------------------------------------------------- estalos
    ev, zres = C.detectar_estalos(m, sr, k=9.0)
    ev_mus = [e for e in ev if e[0] > ini]
    ev_ini = [e for e in ev if e[0] <= ini]
    estalos = {
        "interpretacao": ("os candidatos são a entrada abrupta da música (~%.2f s, transiente legítimo/edição) "
                          "e o início de um pulso grave do trecho inicial: nenhum estalo real de fita. "
                          "adeclick não é necessário" % ini),
        "metodo": "resíduo de predição linear (LPC ordem 24, blocos de 46 ms) > 9 desvios robustos",
        "eventos_total": len(ev), "eventos_trecho_inicial": len(ev_ini), "eventos_na_musica": len(ev_mus),
        "por_minuto_na_musica": round(len(ev_mus) / ((dur - ini) / 60), 1),
        "lista": [{"inicio_s": round(a, 4), "dur_ms": round((b - a) * 1000, 2), "pico_desvios": round(p, 1)}
                  for a, b, p in ev[:200]],
    }

    # ---------------------------------------------------------------- resposta em frequência
    fl, pl = C.ltas(m[int((ini + 0.2) * sr):], sr, 8192)
    pdb = 10 * np.log10(pl + 1e-30)
    ref = np.mean(pdb[(fl > 300) & (fl < 1000)])
    def ponto(queda):
        k = np.flatnonzero((fl > 1000) & (pdb > ref - queda))
        return float(fl[k[-1]]) if len(k) else None
    tq2, corte = faixa_por_quadro(m[int((ini + 0.2) * sr):], sr)
    corte_alto = float(np.percentile(corte, 90))
    resposta = {
        "ltas_por_oitava_db": {k: round(v, 1) for k, v in C.niveis_bandas(fl, pl, C.BANDAS_OITAVA).items()},
        "queda_rel_300_1k_db": {f"{fr}": round(float(pdb[np.argmin(abs(fl - fr))] - ref), 1)
                                for fr in [40, 63, 100, 2000, 3000, 4000, 6000, 8000, 10000, 12000]},
        "freq_queda_20db_hz": ponto(20), "freq_queda_40db_hz": ponto(40),
        "corte_superior_maximo_hz": round(corte_alto, 0),
        "corte_por_quadro_percentis_hz": {p: round(float(np.percentile(corte, p)), 0) for p in (10, 50, 90, 99)},
        "largura_de_banda_por_quadro_pct": {
            "<5 kHz": round(float(np.mean(corte < 5000)) * 100, 1),
            "5-9 kHz": round(float(np.mean((corte >= 5000) & (corte < 9000))) * 100, 1),
            ">=9 kHz": round(float(np.mean(corte >= 9000)) * 100, 1)},
        "conclusao": "",
    }
    resposta["conclusao"] = (
        "agudos muito atenuados (-20 dB já em ~%.0f Hz em relação a 300-1000 Hz) e corte abrupto em "
        "~%.1f kHz típico de codec; em muitos quadros o codec descartou tudo acima de 5 kHz. Acima do "
        "corte não há informação: nada a recuperar (sem upsampling, sem 'excitação' de agudos)"
        % (resposta["freq_queda_20db_hz"] or 0, corte_alto / 1000))

    # ---------------------------------------------------------------- chiado nos agudos (quando o codec abre a banda)
    fs_, ts_, Sp = C.stft_psd_db(m[int((ini + 0.2) * sr):], sr, 4096, 1024)
    aberto = corte[:Sp.shape[1]] >= 9000
    kb = (fs_ >= 6500) & (fs_ < 10000)
    km = (fs_ >= 200) & (fs_ < 2000)
    lin = 10 ** (Sp[kb] / 10)
    planura = np.exp(np.mean(np.log(lin + 1e-30), axis=0)) / np.mean(lin, axis=0)
    nivel_hf = 10 * np.log10(np.mean(lin, axis=0) + 1e-30)
    nivel_m = 10 * np.log10(np.mean(10 ** (Sp[km] / 10), axis=0) + 1e-30)
    chiado = {
        "quadros_com_banda_aberta_pct": round(float(np.mean(aberto)) * 100, 1),
        "nivel_6k5_10k_banda_aberta_db_hz": round(float(np.median(nivel_hf[aberto])), 1),
        "planura_espectral_6k5_10k_banda_aberta": round(float(np.median(planura[aberto])), 3),
        "nivel_6k5_10k_banda_aberta_percentis_db_hz": {
            q: round(float(np.percentile(nivel_hf[aberto], q)), 1) for q in (25, 50, 75, 90)},
        "corr_nivel_agudos_x_medios": round(float(np.corrcoef(nivel_hf[aberto], nivel_m[aberto])[0, 1]), 2),
        "interpretacao": ("acima de ~6,5 kHz o nível é quase constante entre os quadros fortes (percentis 50 a 90 "
                          "a ~1 dB um do outro), o que é típico de ruído estacionário (chiado de fita/transmissão). "
                          "A planura moderada e a correlação parcial com os médios mostram que há também brilho "
                          "de pratos misturado. O chiado só aparece quando o codec abre a banda (trechos fortes) "
                          "e some quando o codec corta em 3-5 kHz: ele 'liga e desliga' com a música"),
    }

    # ---------------------------------------------------------------- graves subsônicos (pente de ~9,8 Hz)
    def autocorr_env(sig, lo, hi, lag):
        sos = ss.butter(4, [lo, hi], "bandpass", fs=sr, output="sos")
        e = np.abs(ss.hilbert(ss.sosfiltfilt(sos, sig)))
        e = ss.decimate(ss.decimate(e, 10), 10)
        e = e - e.mean()
        ac = np.correlate(e, e, "full")[len(e) - 1:]
        return float(ac[int(round(lag * sr / 100))] / ac[0])
    grade = pulsos["grade_s"] or 0.102
    fz, pz = ss.welch(m[int((ini + 0.2) * sr):], sr, nperseg=1 << 15)
    pzd = 10 * np.log10(pz + 1e-30)
    def nivel(fr, ff=fz, pp=pzd):
        return round(float(pp[np.argmin(abs(ff - fr))]), 1)
    graves = {
        "linhas_pente_hz": [round(k / grade, 1) for k in range(1, 6)],
        "nivel_linhas_musica_db_hz": [nivel(k / grade) for k in range(1, 6)],
        "nivel_entre_linhas_musica_db_hz": [nivel((k + 0.5) / grade) for k in range(1, 5)],
        "autocorr_envelope_20_80hz_na_grade": {
            "trecho_inicial": round(autocorr_env(m[int(0.05 * sr):int(ini * sr)], 20, 80, grade), 2),
            "trecho_quieto_13_19s": round(autocorr_env(m[int(13 * sr):int(19 * sr)], 20, 80, grade), 2),
            "musica": round(autocorr_env(m[int((ini + 0.2) * sr):], 20, 80, grade), 2)},
        # distância (em frações da grade) entre a entrada da música e a grade dos pulsos; 0 = em fase
        "desvio_inicio_musica_da_grade": round(float(((ini + 0.01) - pulsos["tempos_s"][-1]) / grade
                                                     - round(((ini + 0.01) - pulsos["tempos_s"][-1]) / grade)), 2)
        if pulsos["tempos_s"] else None,
    }
    if C.REFERENCIA.exists():
        xr0, _ = C.decodificar(C.REFERENCIA)
        r0 = xr0[:, int(np.argmax([C.rms_db(xr0[:, c]) for c in range(xr0.shape[1])]))]
        a0 = m[int(4.06 * sr):int(4.06 * sr) + len(r0)]
        fa0, pa0 = ss.welch(a0, sr, nperseg=1 << 15)
        fr0, pr0 = ss.welch(r0, sr, nperseg=1 << 15)
        k = (fa0 > 355) & (fa0 < 1400)
        norm = np.mean(10 * np.log10(pa0[k])) - np.mean(10 * np.log10(pr0[k]))
        dif = {}
        for lo, hi in [(5, 25), (25, 40), (40, 60), (60, 100)]:
            ka, kr = (fa0 >= lo) & (fa0 < hi), (fr0 >= lo) & (fr0 < hi)
            dif[f"{lo}-{hi}"] = round(float(10 * np.log10(np.sum(pa0[ka]) / np.sum(pr0[kr])) - norm), 1)
        graves["excesso_2007_sobre_referencia_db"] = dif
    graves["conclusao"] = (
        "a grade de ~102 ms existe também na referência (é o ritmo da música), mas a cópia 2007 tem "
        "energia subsônica bem maior que a referência abaixo de 25 Hz (ver excesso). Abaixo de 25 Hz não "
        "há nota musical do arranjo: passa-altas suave em 20-25 Hz é correção justificada; acima disso os "
        "pulsos se misturam ao baixo e não são separáveis sem risco")

    # ---------------------------------------------------------------- distorção
    clip = C_clip = analisar_clipping(m, sr)
    distorcao = {
        "fator_crista_db": niveis["fator_crista_db"],
        "clipping": C_clip["conclusao"],
        "observacao": ("sem referência limpa não existe medida direta de THD em música. Indicadores: "
                       "sem platôs/cortes, fator de crista normal para música, e espectro sem "
                       "'spray' de harmônicos acima da banda útil. A degradação dominante é de codec "
                       "(banda limitada, buracos espectrais, pré-eco), não saturação analógica"),
    }

    # ---------------------------------------------------------------- referência 2004-2005
    referencia = None
    if C.REFERENCIA.exists():
        C.conferir_original(C.REFERENCIA)
        xr, srr = C.decodificar(C.REFERENCIA)
        ativo = int(np.argmax([C.rms_db(xr[:, c]) for c in range(xr.shape[1])]))
        yr = xr[:, ativo]
        hop = 2048
        ca = librosa.feature.chroma_cqt(y=m, sr=sr, hop_length=hop)
        cb = librosa.feature.chroma_cqt(y=yr, sr=srr, hop_length=hop)
        ca /= np.linalg.norm(ca, axis=0) + 1e-9
        cb /= np.linalg.norm(cb, axis=0) + 1e-9
        n = cb.shape[1]
        melhor = (-1, 0, 0)
        for sh in range(-2, 3):
            cbs = np.roll(cb, sh, axis=0)
            sc = np.array([np.mean(np.sum(ca[:, k:k + n] * cbs, axis=0)) for k in range(ca.shape[1] - n)])
            k = int(np.argmax(sc))
            if sc[k] > melhor[0]:
                melhor = (float(sc[k]), sh, k * hop / sr)
        off = int(melhor[2] * sr)
        trecho = m[off:off + len(yr)]
        fa, pa = C.ltas(trecho, sr, 8192)
        fb, pb = C.ltas(yr, srr, 8192)
        na = C.niveis_bandas(fa, pa, C.BANDAS_OITAVA)
        nb = C.niveis_bandas(fb, pb, C.BANDAS_OITAVA)
        k0 = ["355-710", "710-1400"]
        norm = np.mean([na[k] - nb[k] for k in k0])
        referencia = {
            "arquivo": C.REFERENCIA.name, "canais": int(xr.shape[1]), "canal_com_audio": ["L", "R"][ativo],
            "rms_outro_canal_dbfs": round(C.rms_db(xr[:, 1 - ativo]), 1),
            "duracao_s": round(len(yr) / srr, 3),
            "mesma_musica_score_croma": round(melhor[0], 3), "desvio_semitons": melhor[1],
            "posicao_na_trilha_2007_s": round(melhor[2], 2),
            "afinacao_2007_semitom": round(float(librosa.estimate_tuning(y=m, sr=sr)), 3),
            "afinacao_ref_semitom": round(float(librosa.estimate_tuning(y=yr, sr=srr)), 3),
            "diferenca_espectral_2007_menos_ref_db_por_oitava": {
                k: round(float(na[k] - nb[k] - norm), 1) for k in na},
            "conclusao": ("mesma composição, mesma tonalidade (afinações iguais em ±0,05 semitom): não há erro "
                          "de velocidade a corrigir. Em relação à referência (normalizada em 355-1400 Hz), a "
                          "cópia 2007 perde agudos acima de 5,6 kHz e não tem nada acima de ~10,5 kHz. A "
                          "referência só tem áudio num canal e a correlação de forma de onda é baixa: serve "
                          "como guia de equilíbrio tonal, não para mesclar sinais"),
        }

    rel = json.loads(json.dumps({
        "arquivo": str(C.ENTRADA.relative_to(C.RAIZ)), "sha256": sha_antes,
        "tamanho_bytes": int(fmt["size"]),
        "formato": {
            "codec": st["codec_name"], "bitrate_declarado_kbps": round(int(fmt["bit_rate"]) / 1000, 1),
            "bitrate_stream_kbps": round(int(st["bit_rate"]) / 1000, 1),
            "sample_rate_hz": sr, "canais": canais, "layout": st.get("channel_layout"),
            "duracao_ffprobe_s": float(fmt["duration"]), "duracao_decodificada_s": round(dur, 6),
            "amostras_decodificadas": int(len(m)),
            "encoder": st.get("tags", {}).get("encoder"),
            "container_de_origem": fmt.get("tags", {}).get("major_brand"),
            "quadros_mp3": quadros,
            "cadeia_provavel": ("VHS (2007) -> digitalização -> app InShot (exportou AAC/M4A, 'major_brand M4A') "
                                "-> MP3 VBR via FFmpeg/LAME: no mínimo 2 gerações de codec com perdas"),
        },
        "canais": canais_info, "niveis": niveis, "inicio_musica_s": round(ini, 3),
        "pulsos_trecho_inicial": pulsos, "clipping": clip, "ruido": ruido, "chiado_agudos": chiado, "graves_subsonicos": graves, "snr_estimada": snr,
        "zumbido": zumbido_info, "estalos": estalos, "distorcao": distorcao,
        "resposta_em_frequencia": resposta, "referencia_2004_2005": referencia,
    }, default=float))
    (SAIDA / "relatorio_analise.json").write_text(json.dumps(rel, indent=2, ensure_ascii=False))

    # ================================================================ gráficos
    graficos(m, sr, ini, f_n, piso, media_db, f_l, p_lead, zmb, zres, ev, fl, pdb, tq2, corte, pulsos,
             referencia, yr if referencia else None, off if referencia else 0)
    assert C.conferir_original() == sha_antes
    resumo(rel)


def graficos(m, sr, ini, f_n, piso, media_db, f_l, p_lead, zmb, zres, ev, fl, pdb, tq2, corte, pulsos,
             referencia, yr, off):
    plt.rcParams.update({"figure.dpi": 110, "font.size": 9})
    # 1 - espectrograma completo + forma de onda
    f, t, S = C.stft_db(m, sr, 4096, 512)
    fig, ax = plt.subplots(2, 1, figsize=(15, 8), gridspec_kw={"height_ratios": [3, 1]}, sharex=True)
    im = ax[0].pcolormesh(t, f / 1000, S, vmin=-120, vmax=-20, cmap="magma", shading="auto")
    ax[0].set_ylabel("kHz"); ax[0].set_title("Original 2007 - espectrograma (dBFS, banda inteira 0-22 kHz)")
    fig.colorbar(im, ax=ax, label="dBFS", pad=0.01)
    tt = np.arange(len(m)) / sr
    ax[1].plot(tt, m, lw=0.3, color="#246")
    ax[1].axvline(ini, color="r", lw=0.8, ls="--"); ax[1].text(ini + 0.3, 0.2, "início da música", color="r")
    ax[1].set_xlabel("tempo (s)"); ax[1].set_ylabel("amplitude"); ax[1].set_xlim(0, tt[-1])
    fig.savefig(SAIDA / "espectrograma_original.png", bbox_inches="tight"); plt.close(fig)

    # 2 - graves (zumbido) com alta resolução
    f2, t2, S2 = C.stft_db(m, sr, 16384, 2048)
    k = f2 <= 600
    fig, ax = plt.subplots(figsize=(15, 5))
    im = ax.pcolormesh(t2, f2[k], S2[k], vmin=-110, vmax=-20, cmap="magma", shading="auto")
    for h in range(1, 10):
        ax.axhline(60 * h, color="c", lw=0.4, ls=":")
    ax.set_ylabel("Hz"); ax.set_xlabel("tempo (s)")
    ax.set_title("Graves 0-600 Hz (resolução 2,7 Hz); linhas pontilhadas = harmônicos de 60 Hz")
    fig.colorbar(im, ax=ax, label="dBFS", pad=0.01)
    fig.savefig(SAIDA / "espectrograma_graves.png", bbox_inches="tight"); plt.close(fig)

    # 3 - espectro médio, piso de ruído e trecho inicial
    fig, ax = plt.subplots(figsize=(13, 5.5))
    ax.semilogx(fl[1:], pdb[1:], label="música (média de longo prazo, Welch)", lw=1.2)
    ax.semilogx(f_n[1:], piso[1:], label="piso durante a música: percentil 10 de cada bin", lw=0.9)
    ax.semilogx(f_l[1:], 10 * np.log10(p_lead[1:] + 1e-30), label="trecho inicial sem música (fora dos pulsos)", lw=0.9)
    ax.axvline(10350, color="k", lw=0.6, ls="--"); ax.text(10600, -60, "corte do codec\n~10,35 kHz", fontsize=8)
    ax.set_xlim(20, 22050); ax.set_ylim(-190, -40); ax.grid(True, which="both", alpha=0.3)
    ax.set_xlabel("Hz"); ax.set_ylabel("dB/Hz (Welch)"); ax.legend(loc="lower left")
    ax.set_title("Resposta em frequência: espectro médio da música x ruído")
    fig.savefig(SAIDA / "espectro_medio_e_ruido.png", bbox_inches="tight"); plt.close(fig)

    # 4 - zumbido: espectro fino 20-500 Hz
    seg = m[int((ini + 0.2) * sr):]
    fz, pz = ss.welch(seg, sr, nperseg=1 << 16)
    fq, pq = ss.welch(m[int(0.05 * sr):int(ini * sr)], sr, nperseg=1 << 15)
    fig, ax = plt.subplots(figsize=(13, 5))
    k = (fz > 15) & (fz < 500); kq = (fq > 15) & (fq < 500)
    ax.plot(fz[k], 10 * np.log10(pz[k]), lw=0.7, label="música (resolução 0,67 Hz)")
    ax.plot(fq[kq], 10 * np.log10(pq[kq]), lw=0.7, label="trecho inicial (com pulsos)")
    for h in range(1, 9):
        ax.axvline(60 * h, color="r", lw=0.5, ls=":")
        ax.axvline(50 * h, color="g", lw=0.4, ls=":")
    ax.set_xlabel("Hz"); ax.set_ylabel("dB/Hz"); ax.grid(alpha=0.3); ax.legend()
    ax.set_title("Busca de zumbido: vermelho = k·60 Hz, verde = k·50 Hz")
    fig.savefig(SAIDA / "zumbido_espectro_fino.png", bbox_inches="tight"); plt.close(fig)

    # 5 - estalos
    fig, ax = plt.subplots(2, 1, figsize=(15, 6), sharex=True)
    tt = np.arange(len(m)) / sr
    ax[0].plot(tt, m, lw=0.3)
    for a, b, p in ev:
        ax[0].axvline(a, color="r", lw=0.6, alpha=0.7)
    ax[0].set_title(f"Estalos candidatos (vermelho): {len(ev)} eventos")
    ax[1].plot(tt, zres, lw=0.3); ax[1].axhline(9, color="r", ls="--", lw=0.8)
    ax[1].set_ylabel("resíduo AR (desvios)"); ax[1].set_xlabel("tempo (s)"); ax[1].set_ylim(0, 30)
    fig.savefig(SAIDA / "estalos_detectados.png", bbox_inches="tight"); plt.close(fig)

    # 6 - pulsos no início
    fig, ax = plt.subplots(2, 1, figsize=(14, 6))
    seg = m[:int(ini * sr)]
    ax[0].plot(np.arange(len(seg)) / sr, seg, lw=0.5)
    ax[0].set_title(f"Trecho inicial: {pulsos['n_pulsos']} pulsos, grade ~{pulsos['grade_s']} s (batidas omitidas)")
    if pulsos["tempos_s"]:
        c = int(pulsos["tempos_s"][len(pulsos["tempos_s"]) // 2] * sr)
        z = np.arange(c - 400, c + 1500)
        ax[1].plot((z - c) / sr * 1000, m[z], ".-", ms=2, lw=0.6)
        ax[1].set_xlabel("ms"); ax[1].set_title("um pulso ampliado: forma suave, grave, não é estalo")
    fig.tight_layout(); fig.savefig(SAIDA / "pulsos_trecho_inicial.png", bbox_inches="tight"); plt.close(fig)

    # 7 - largura de banda por quadro
    fig, ax = plt.subplots(figsize=(14, 3.5))
    ax.plot(tq2 + ini + 0.2, corte / 1000, lw=0.6)
    ax.set_ylabel("kHz"); ax.set_xlabel("tempo (s)"); ax.grid(alpha=0.3)
    ax.set_title("Frequência mais alta com energia > -105 dBFS em cada quadro (corte dinâmico do codec)")
    fig.savefig(SAIDA / "largura_de_banda_por_quadro.png", bbox_inches="tight"); plt.close(fig)

    # 8 - referência
    if referencia:
        n = len(yr)
        fa, pa = C.ltas(m[off:off + n], sr, 8192)
        fb, pb = C.ltas(yr, sr, 8192)
        k = (fa > 355) & (fa < 1400)
        d = np.mean(10 * np.log10(pa[k])) - np.mean(10 * np.log10(pb[k]))
        fig, ax = plt.subplots(1, 2, figsize=(15, 5))
        ax[0].semilogx(fa[1:], 10 * np.log10(pa[1:]), lw=0.9, label="2007 (mesmo trecho)")
        ax[0].semilogx(fb[1:], 10 * np.log10(pb[1:]) + d, lw=0.9, label="referência 2004-05 (normalizada)")
        ax[0].set_xlim(20, 22050); ax[0].set_ylim(-180, -40); ax[0].grid(True, which="both", alpha=0.3)
        ax[0].legend(); ax[0].set_xlabel("Hz"); ax[0].set_title("Espectro médio: 2007 x referência 2004-05")
        f3, t3, S3 = C.stft_db(yr, sr, 4096, 512)
        ax[1].pcolormesh(t3, f3 / 1000, S3, vmin=-120, vmax=-20, cmap="magma", shading="auto")
        ax[1].set_title("Referência 2004-05 (canal com áudio)"); ax[1].set_ylabel("kHz"); ax[1].set_xlabel("s")
        fig.savefig(SAIDA / "comparacao_referencia_2004_2005.png", bbox_inches="tight"); plt.close(fig)


def resumo(rel):
    fm, n, c = rel["formato"], rel["niveis"], rel["canais"]
    print("=== ANÁLISE:", rel["arquivo"])
    print(f"bitrate {fm['bitrate_declarado_kbps']} kbps ({fm['quadros_mp3']['tipo']}, "
          f"quadros {fm['quadros_mp3']['histograma_kbps']}), {fm['sample_rate_hz']} Hz, {fm['canais']} canais, "
          f"{fm['duracao_decodificada_s']:.3f} s")
    print(f"canais: corr {c['correlacao_L_R']}, S {c['lateral_abaixo_do_mid_db']} dB abaixo -> {c['conclusao'][:40]}")
    print(f"pico {n['pico_dbfs']} dBFS | true peak {n.get('true_peak_dbtp')} | RMS {n['rms_dbfs']} | "
          f"{n.get('lufs_integrado')} LUFS | LRA {n.get('lra_lu')} | crista {n['fator_crista_db']} dB")
    print("clipping:", rel["clipping"]["conclusao"])
    print("ruído:", json.dumps(rel["ruido"]["espectro_ruido_inicial_por_oitava_db"]))
    print("SNR por oitava:", json.dumps(rel["ruido"]["snr_por_oitava_media_vs_piso_db"]))
    print("chiado agudos:", {k: v for k, v in rel["chiado_agudos"].items() if k != "interpretacao"})
    print("graves:", {k: v for k, v in rel["graves_subsonicos"].items() if k != "conclusao"})
    print("SNR:", {k: v for k, v in rel["snr_estimada"].items() if k != "observacao"})
    print("zumbido detectado:", rel["zumbido"]["componentes_detectados"])
    print("estalos:", {k: v for k, v in rel["estalos"].items() if k != "lista"})
    print("pulsos início:", {k: v for k, v in rel["pulsos_trecho_inicial"].items() if k in ("n_pulsos", "grade_s", "pico_dbfs", "centroide_espectral_hz", "rms_entre_pulsos_dbfs")})
    print("resposta:", {k: v for k, v in rel["resposta_em_frequencia"].items() if k != "conclusao"})
    if rel["referencia_2004_2005"]:
        r = rel["referencia_2004_2005"]
        print("referência:", {k: v for k, v in r.items() if k != "conclusao"})


if __name__ == "__main__":
    main()
