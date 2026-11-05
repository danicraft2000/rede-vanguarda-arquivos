"""FASE 4 - Comparação: original x conservador x restauração x avançado.

Uso: python3 scripts/04_comparacao.py [amostra|completo]
(roda depois de 03_presets.py no mesmo modo)

Gera espectrogramas lado a lado, espectrogramas do que foi removido, espectro médio e diferenças,
tabela de níveis/ruído/picos/dinâmica/duração e o kit de escuta A/B (cego e alternado).
"""
from __future__ import annotations

import json
import random
import sys
from pathlib import Path

import matplotlib
import numpy as np
import soundfile as sf

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

sys.path.insert(0, str(Path(__file__).parent))
import comum as C  # noqa: E402
import metricas as M  # noqa: E402

NOMES = {"original": "Original", "conservador": "Conservador", "restauracao": "Restauração", "avancado": "Avançado"}


def medidas_extras(m, sr, reg, inicio):
    f, t, S = C.stft_psd_db(m, sr, 4096, 1024)
    P = 10 ** (S / 10)
    kb = (f >= 6500) & (f < 10000)
    hf = 10 * np.log10(P[np.ix_(kb, reg["aberta"])].mean() + 1e-30) if reg["aberta"].any() else None
    ini = m[int(0.05 * sr):int((inicio - 0.05) * sr)]
    sub = C.passa_altas(m, sr, 5, 2)
    import scipy.signal as ss
    sos = ss.butter(4, 25, "lowpass", fs=sr, output="sos")
    sub = ss.sosfiltfilt(sos, sub)
    return {
        "chiado_6k5_10k_banda_aberta_db_hz": round(float(hf), 1) if hf is not None else None,
        "trecho_inicial_rms_dbfs": round(C.rms_db(ini), 2),
        "subsonico_5_25hz_rms_dbfs": round(C.rms_db(sub), 2),
    }


def main():
    modo = sys.argv[1] if len(sys.argv) > 1 else "amostra"
    pasta = C.RAIZ / ("amostra_20s" if modo == "amostra" else "comparacao")
    pasta.mkdir(exist_ok=True)
    dados = np.load(C.RAIZ / f".cache_versoes_{modo}.npz")
    sr = int(dados["sr"])
    v = {k: dados[k] for k in NOMES}
    m = v["original"]
    analise = json.loads((C.RAIZ / "analise" / "relatorio_analise.json").read_text())
    inicio = analise["inicio_musica_s"]
    reg = M.regioes(m, sr, inicio)

    # ------------------------------------------------------------ tabela
    tabela = {}
    for k, y in v.items():
        r = C.resumo_medidas(y, sr)
        r.update(medidas_extras(y, sr, reg, inicio))
        if k != "original":
            r["removido_rms_dbfs"] = round(C.rms_db(m - y), 2)
            r["removido_abaixo_4k5_rms_dbfs"] = round(C.rms_db(C.dividir_bandas(C.passa_altas(m, sr, 60, 2) - C.passa_altas(y, sr, 60, 2), sr, 4500)[0]), 1)
            r["atraso_amostras"] = C.atraso(m, y, 4096)
            r["correlacao_com_original"] = round(float(np.corrcoef(m, y)[0, 1]), 6)
            r.update({"vs_original": M.comparar(m, y, sr, reg)})
        tabela[k] = r
    (pasta / "comparacao.json").write_text(json.dumps(tabela, indent=2, ensure_ascii=False))
    escrever_md(tabela, pasta / "comparacao.md", modo)

    # ------------------------------------------------------------ gráficos
    graficos(v, sr, pasta, inicio, modo)

    # ------------------------------------------------------------ kit A/B (só para a música inteira)
    if modo == "completo":
        kit_ab(v, sr, pasta, modo, inicio)
    print(open(pasta / "comparacao.md").read())


def escrever_md(t, caminho, modo):
    linhas = [f"# Comparação ({'amostra 0-20 s' if modo == 'amostra' else 'música inteira'})", "",
              "| medida | " + " | ".join(NOMES[k] for k in t) + " |", "|---|" + "---|" * len(t)]
    campos = [
        ("duração (s)", "duracao_s"), ("amostras", "amostras"), ("pico (dBFS)", "pico_dbfs"),
        ("true peak (dBTP)", "true_peak_dbtp"), ("loudness (LUFS)", "lufs_integrado"), ("LRA (LU)", "lra_lu"),
        ("RMS (dBFS)", "rms_dbfs"), ("fator de crista (dB)", "fator_crista_db"),
        ("faixa dinâmica quadros p95-p10 (dB)", "faixa_dinamica_p95_p10_db"),
        ("chiado 6,5-10 kHz nos trechos fortes (dB/Hz)", "chiado_6k5_10k_banda_aberta_db_hz"),
        ("trecho inicial sem música, RMS (dBFS)", "trecho_inicial_rms_dbfs"),
        ("subsônico 5-25 Hz, RMS (dBFS)", "subsonico_5_25hz_rms_dbfs"),
        ("removido, RMS (dBFS)", "removido_rms_dbfs"), ("removido entre 60 Hz e 4,5 kHz (dBFS)", "removido_abaixo_4k5_rms_dbfs"),
        ("atraso (amostras)", "atraso_amostras"), ("correlação com o original", "correlacao_com_original"),
    ]
    for nome, k in campos:
        linhas.append(f"| {nome} | " + " | ".join(str(t[v].get(k, "—")) for v in t) + " |")
    sub = [("médios 200-4k nos trechos fortes (dB)", "medios_200_4k_trechos_fortes_db"),
           ("graves 40-100 Hz (dB)", "graves_40_100_trechos_fortes_db"),
           ("trechos quietos 1-10k (dB)", "quietos_1k_10k_db"),
           ("música/removido 100-4k (dB)", "sinal_residuo_100_4k_fortes_db"),
           ("ataques agudos preservados (corr.)", "corr_transientes_agudos"),
           ("harmônicos 4,6-6 kHz, média / pior (dB)", ("harmonicos_4k6_6k_media_db", "harmonicos_4k6_6k_pior_db")),
           ("harmônicos 6-7,6 kHz, média / pior (dB)", ("harmonicos_6k_7k6_media_db", "harmonicos_6k_7k6_pior_db")),
           ("flutuação do chiado (dB; orig. {})", "flutuacao_agudos_db_proc")]
    for nome, k in sub:
        if "{}" in nome:
            nome = nome.format(t["conservador"]["vs_original"]["flutuacao_agudos_db_orig"])
        if isinstance(k, tuple):
            vals = [f"{t[v]['vs_original'][k[0]]} / {t[v]['vs_original'][k[1]]}" for v in t if v != "original"]
        else:
            vals = [str(t[v]["vs_original"][k]) for v in t if v != "original"]
        linhas.append(f"| {nome} | — | " + " | ".join(vals) + " |")
    caminho.write_text("\n".join(linhas) + "\n")


def graficos(v, sr, pasta, inicio, modo):
    plt.rcParams.update({"figure.dpi": 110, "font.size": 9})
    # 1 - espectrogramas lado a lado
    fig, ax = plt.subplots(4, 1, figsize=(15, 13), sharex=True)
    for a, (k, y) in zip(ax, v.items()):
        f, t, S = C.stft_db(y, sr, 4096, 512)
        kf = f <= 12000
        im = a.pcolormesh(t, f[kf] / 1000, S[kf], vmin=-120, vmax=-20, cmap="magma", shading="auto")
        a.set_ylabel("kHz"); a.set_title(NOMES[k])
    ax[-1].set_xlabel("tempo (s)")
    fig.colorbar(im, ax=ax, label="dBFS", pad=0.01)
    fig.suptitle("Espectrogramas 0-12 kHz (acima de 10,35 kHz não há informação em nenhuma versão)")
    fig.savefig(pasta / "espectrogramas_4_versoes.png", bbox_inches="tight"); plt.close(fig)

    # 2 - o que cada preset removeu
    m = v["original"]
    fig, ax = plt.subplots(3, 1, figsize=(15, 10), sharex=True)
    for a, k in zip(ax, ["conservador", "restauracao", "avancado"]):
        f, t, S = C.stft_db(m - v[k], sr, 4096, 512)
        kf = f <= 12000
        im = a.pcolormesh(t, f[kf] / 1000, S[kf], vmin=-120, vmax=-20, cmap="magma", shading="auto")
        a.set_ylabel("kHz"); a.set_title(f"Removido pelo preset {NOMES[k]} (original - processado)")
    ax[-1].set_xlabel("tempo (s)")
    fig.colorbar(im, ax=ax, label="dBFS", pad=0.01)
    fig.savefig(pasta / "espectrogramas_removido.png", bbox_inches="tight"); plt.close(fig)

    # 3 - espectro médio e diferença
    fig, ax = plt.subplots(2, 1, figsize=(13, 9))
    fo, po = C.ltas(m, sr, 8192)
    for k, y in v.items():
        f, p = C.ltas(y, sr, 8192)
        ax[0].semilogx(f[1:], 10 * np.log10(p[1:] + 1e-30), lw=0.9, label=NOMES[k])
        if k != "original":
            ax[1].semilogx(f[1:], 10 * np.log10((p[1:] + 1e-30) / (po[1:] + 1e-30)), lw=1, label=NOMES[k])
    ax[0].set_xlim(5, 22050); ax[0].set_ylim(-180, -40); ax[0].legend(); ax[0].grid(True, which="both", alpha=0.3)
    ax[0].set_title("Espectro médio de longo prazo"); ax[0].set_ylabel("dB/Hz")
    ax[1].set_xlim(5, 11000); ax[1].set_ylim(-20, 2); ax[1].legend(); ax[1].grid(True, which="both", alpha=0.3)
    for fc, txt in ((4500, "4,5 kHz (avançado)"), (6000, "6 kHz")):
        ax[1].axvline(fc, color="k", ls="--", lw=0.6); ax[1].text(fc * 1.02, -18 + (fc == 6000) * 2, txt, fontsize=8)
    ax[1].set_title("Diferença em relação ao original (0 dB = intocado)"); ax[1].set_xlabel("Hz"); ax[1].set_ylabel("dB")
    fig.savefig(pasta / "espectro_medio_diferencas.png", bbox_inches="tight"); plt.close(fig)

    # 4 - zoom no chiado (trecho forte, 5-10,5 kHz)
    a0, a1 = (4.0, 10.5)
    fig, ax = plt.subplots(1, 4, figsize=(16, 4.5), sharey=True)
    for a, (k, y) in zip(ax, v.items()):
        seg = y[int(a0 * sr):int(a1 * sr)]
        f, t, S = C.stft_db(seg, sr, 2048, 256)
        kf = (f >= 5000) & (f <= 10500)
        a.pcolormesh(t + a0, f[kf] / 1000, S[kf], vmin=-125, vmax=-60, cmap="magma", shading="auto")
        a.set_title(NOMES[k]); a.set_xlabel("s")
    ax[0].set_ylabel("kHz")
    fig.suptitle("Zoom 5-10,5 kHz no trecho forte 4-10,5 s: chiado x ataques de pratos")
    fig.savefig(pasta / "zoom_chiado_trecho_forte.png", bbox_inches="tight"); plt.close(fig)

    # 5 - forma de onda / envelope / dinâmica
    fig, ax = plt.subplots(2, 1, figsize=(15, 7))
    for k, y in v.items():
        r, t = C.rms_quadros(y, sr, 0.4, 0.1)
        ax[0].plot(t, r, lw=0.9, label=NOMES[k])
    ax[0].set_ylabel("RMS 400 ms (dBFS)"); ax[0].legend(loc="lower right"); ax[0].grid(alpha=0.3)
    ax[0].set_title("Envelope de nível: as curvas devem coincidir (nenhum ganho, nenhuma compressão)")
    tt = np.arange(len(m)) / sr
    ax[1].plot(tt, m, lw=0.3, label="Original")
    ax[1].plot(tt, v["avancado"] - m, lw=0.3, label="Avançado - Original", color="r")
    ax[1].legend(loc="upper right"); ax[1].set_xlabel("tempo (s)")
    fig.savefig(pasta / "envelope_e_diferenca.png", bbox_inches="tight"); plt.close(fig)


def kit_ab(v, sr, pasta, modo, inicio):
    ab = pasta / "teste_AB"
    ab.mkdir(exist_ok=True)
    canais = 2
    # (a) cego: as 4 versões com letras sorteadas; o gabarito fica num arquivo à parte.
    # WAV 16 bits com dither TPDF: todos os arquivos têm exatamente o mesmo tamanho (em FLAC o
    # tamanho entregaria qual é o original, que é o mais ruidoso e comprime menos).
    for velho in ab.glob("cego_*"):
        velho.unlink()
    rnd = random.Random(2007)
    chaves = list(v.keys())
    letras = ["A", "B", "C", "D"]
    rnd.shuffle(chaves)
    a0, a1 = (4.0, 34.0) if modo == "completo" else (0.0, 20.0)
    gerador = np.random.default_rng(7)
    gabarito = {"trecho_s": [a0, a1]}
    for L, k in zip(letras, chaves):
        seg = v[k][int(a0 * sr):int(a1 * sr)]
        tpdf = (gerador.random(len(seg)) - gerador.random(len(seg))) / 32768.0
        sf.write(ab / f"cego_{L}.wav", C.dual_mono(seg + tpdf, canais), sr, subtype="PCM_16")
        gabarito[L] = NOMES[k]
    (ab / "GABARITO_nao_abrir_antes_de_ouvir.json").write_text(json.dumps(gabarito, indent=2, ensure_ascii=False))
    # (b) alternado: o mesmo trecho em sequência O-X-O-X com 0,6 s de silêncio
    trechos = [("forte", 4.2, 9.2), ("quieto", 12.5, 18.5)]
    if modo == "completo":
        trechos.append(("forte_2", 24.0, 30.0))
    pausa = np.zeros(int(0.6 * sr))
    roteiro = []
    for nome, a, b in trechos:
        for k in ["conservador", "restauracao", "avancado"]:
            o = v["original"][int(a * sr):int(b * sr)]
            p = v[k][int(a * sr):int(b * sr)]
            rampa = np.minimum(1, np.minimum(np.arange(len(o)), np.arange(len(o))[::-1]) / (0.01 * sr))
            seq = np.concatenate([o * rampa, pausa, p * rampa, pausa, o * rampa, pausa, p * rampa])
            arq = f"alternado_{nome}_original_x_{k}.flac"
            sf.write(ab / arq, C.dual_mono(seq, canais), sr, subtype="PCM_24")
            roteiro.append(f"- `{arq}`: {a:.1f}-{b:.1f} s, ordem Original → {NOMES[k]} → Original → {NOMES[k]}")
    difs = {NOMES[k]: round(C.ebur128(y, sr)["lufs_integrado"] - C.ebur128(v['original'], sr)["lufs_integrado"], 2)
            for k, y in v.items() if k != "original"}
    (ab / "COMO_OUVIR.md").write_text(
        "# Teste de escuta A/B\n\n"
        "Use fones fechados ou monitores, num volume fixo e confortável. Não mexa no volume entre as versões.\n\n"
        f"Diferença de loudness em relação ao original (LU): {difs}. Como é < 0,1 LU, não precisa igualar o nível: "
        "a comparação é justa (a versão mais alta não leva vantagem).\n\n"
        "## 1. Teste cego\n"
        f"`cego_A.wav` a `cego_D.wav` são as 4 versões (original incluído) do trecho {a0:.0f}-{a1:.0f} s, em ordem sorteada "
        "e com o mesmo tamanho de arquivo (WAV 16 bits). Ouça todas, anote para "
        "cada uma: (1) chiado nos trechos fortes, (2) brilho dos pratos/ataques, (3) ruído musical ou \"água\" no "
        "chiado, (4) grave cheio ou magro, (5) preferência geral. Só depois abra o gabarito.\n\n"
        "## 2. Teste alternado (rápido)\n" + "\n".join(roteiro) + "\n\n"
        "## 3. O que foi removido\n"
        "Os arquivos `*__removido.flac` (pasta dos presets) contêm só o que cada preset tirou. O ideal é ouvir chiado "
        "e um \"tum\" grave muito baixo, sem melodia reconhecível. Se der para cantar a música ouvindo o removido, "
        "o preset está tirando música.\n")


if __name__ == "__main__":
    main()
