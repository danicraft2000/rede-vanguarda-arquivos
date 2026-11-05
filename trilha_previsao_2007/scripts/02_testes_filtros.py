"""FASE 2 - Avaliação individual de cada filtro, em várias intensidades, numa amostra de 20 s.

Uso: python3 scripts/02_testes_filtros.py [inicio_s=0] [duracao_s=20]
A amostra 0-20 s tem: trecho inicial sem música (com os pulsos graves), entrada da música,
trecho forte com banda aberta pelo codec (4-11 s) e trecho quieto (11-20 s).

Saídas: amostra_20s/testes_filtros.json, amostra_20s/testes_filtros.md e, fora do git,
amostra_20s/testes_individuais/*.flac (cada teste e o que ele removeu).
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).parent))
import comum as C  # noqa: E402
import metricas as M  # noqa: E402

PASTA = C.RAIZ / "amostra_20s"
TESTES = PASTA / "testes_individuais"


def testes():
    T = []
    for t in (2, 4, 8):
        T.append(("adeclick", f"t={t}", f"adeclick=w=55:o=75:a=2:t={t}:b=2"))
    for t in (10, 5):
        T.append(("adeclip", f"t={t}", f"adeclip=w=55:o=75:a=8:t={t}:n=1000"))
    for q in (30, 60):
        T.append(("notch", f"60+120 Hz Q={q}", ("notch", [60.0, 120.0], q)))
    T.append(("notch", "60/120/180/240 Hz Q=30", ("notch", [60.0, 120.0, 180.0, 240.0], 30)))
    for fc in (15, 20, 25, 30, 35):
        T.append(("eq_passa_altas", f"{fc} Hz ordem 2 (fase zero, 24 dB/oit)", ("hpf", fc, 2)))
    for fc in (20, 25, 30):
        T.append(("eq_passa_altas", f"{fc} Hz ordem 4 (fase zero, 48 dB/oit)", ("hpf", fc, 4)))
    T.append(("eq_prateleira_agudos", "+3 dB 4-10 kHz (FIR fase linear)",
              ("fir", [2500, 4000, 10000, 10400, 11000], [0, 3, 3, 0, 0])))
    for nr in (6, 10, 15, 20):
        T.append(("afftdn", f"nr={nr} tn=1 (piso rastreado)", f"afftdn=nr={nr}:nf=-60:tn=1"))
    for nf in (-80, -70, -60):
        T.append(("afftdn", f"nr=10 nf={nf} tn=0 (piso fixo)", f"afftdn=nr=10:nf={nf}:tn=0"))
    for nr in (10, 15, 20):
        T.append(("afftdn", f"nr={nr} nf=-60 tn=1 gs=10", f"afftdn=nr={nr}:nf=-60:tn=1:gs=10"))
    # afftdn só acima de 4,5 kHz (divisor FIR de fase linear): graves e médios ficam intactos
    T.append(("afftdn_agudos", "> 4,5 kHz nr=6 tn=1", ("agudos", 4500, "afftdn=nr=6:nf=-60:tn=1")))
    T.append(("afftdn_agudos", "> 4,5 kHz nr=10 tn=1 gs=3", ("agudos", 4500, "afftdn=nr=10:nf=-60:tn=1:gs=3")))
    T.append(("afftdn_agudos", "> 4,5 kHz nr=15 tn=1 gs=5", ("agudos", 4500, "afftdn=nr=15:nf=-60:tn=1:gs=5")))
    T.append(("afftdn_agudos", "> 3 kHz nr=15 tn=1 gs=5", ("agudos", 3000, "afftdn=nr=15:nf=-60:tn=1:gs=5")))
    T.append(("afftdn_agudos", "> 4,5 kHz nr=10 tn=1", ("agudos", 4500, "afftdn=nr=10:nf=-60:tn=1")))
    T.append(("afftdn_agudos", "> 4,5 kHz nr=12 tn=1", ("agudos", 4500, "afftdn=nr=12:nf=-60:tn=1")))
    for nr in (6, 10, 12):
        T.append(("afftdn_agudos", f"> 6 kHz nr={nr} tn=1", ("agudos", 6000, f"afftdn=nr={nr}:nf=-60:tn=1")))
    T.append(("afftdn_agudos", "> 6 kHz nr=15 tn=1 gs=5", ("agudos", 6000, "afftdn=nr=15:nf=-60:tn=1:gs=5")))
    # perfil de ruído aprendido no trecho sem música (contém os pulsos graves!)
    T.append(("afftdn", "nr=10 perfil aprendido 0,3-3,6 s",
              "asendcmd=c='1.3 afftdn sn start; 4.6 afftdn sn stop',afftdn=nr=10:nf=-60"))
    # calibração: ajustes deliberadamente agressivos, só para ver as métricas reagirem
    T.append(("afftdn_calibracao", "nr=40 nf=-40 tn=0 (AGRESSIVO, só referência)", "afftdn=nr=40:nf=-40:tn=0"))
    for s in (0.00001, 0.0005, 0.002, 0.01, 0.05):
        T.append(("anlmdn", f"s={s:g}", f"anlmdn=s={s:g}:p=0.002:r=0.006:m=11"))
    return T


def aplicar(m, sr, op):
    if isinstance(op, str):
        return C.ffmpeg_filtro(m, sr, op)
    tipo = op[0]
    if tipo == "notch":
        return C.notch(m, sr, op[1], op[2])
    if tipo == "hpf":
        return C.passa_altas(m, sr, op[1], op[2])
    if tipo == "agudos":
        return C.afftdn_agudos(m, sr, op[1], op[2])
    if tipo == "fir":
        return C.eq_fir(m, sr, op[1], op[2])
    raise ValueError(tipo)


def main():
    ini = float(sys.argv[1]) if len(sys.argv) > 1 else 0.0
    dur = float(sys.argv[2]) if len(sys.argv) > 2 else 20.0
    C.conferir_original()
    x, sr = C.decodificar(C.ENTRADA)
    analise = json.loads((C.RAIZ / "analise" / "relatorio_analise.json").read_text())
    inicio_musica = analise["inicio_musica_s"] - ini
    m_total = C.mid(x)
    m = m_total[int(ini * sr):int((ini + dur) * sr)]
    PASTA.mkdir(exist_ok=True)
    TESTES.mkdir(exist_ok=True)
    sf.write(TESTES / "00_original.flac", C.dual_mono(m, x.shape[1]), sr, subtype="PCM_24")
    reg = M.regioes(m, sr, inicio_musica)

    resultados = []
    for i, (filtro, desc, op) in enumerate(testes(), 1):
        t0 = time.time()
        y = aplicar(m, sr, op)
        met = M.comparar(m, y, sr, reg)
        met["tempo_s"] = round(time.time() - t0, 1)
        nome = f"{i:02d}_{filtro}_{desc.split(' (')[0]}".replace(" ", "_").replace("/", "-").replace("=", "")
        sf.write(TESTES / f"{nome}.flac", C.dual_mono(y, x.shape[1]), sr, subtype="PCM_24")
        sf.write(TESTES / f"{nome}__removido.flac", C.dual_mono(m - y, x.shape[1]), sr, subtype="PCM_24")
        resultados.append({"id": i, "filtro": filtro, "parametros": desc,
                           "comando": op if isinstance(op, str) else str(op), **met})
        print(f"{i:02d} {filtro:22s} {desc:38s} agudos {met['agudos_6k5_10k_banda_aberta_db']!s:>6} "
              f"médios {met['medios_200_4k_trechos_fortes_db']!s:>6} graves {met['graves_40_100_trechos_fortes_db']!s:>6} "
              f"sub {met['subsonico_5_25_db']!s:>6} quietos {met['quietos_1k_10k_db']!s:>6} "
              f"inicial {met['trecho_inicial_200_10k_db']!s:>6} SRR {met['sinal_residuo_100_4k_fortes_db']:>6} "
              f"trans {met['corr_transientes_agudos']} flut {met['flutuacao_agudos_db_orig']}->{met['flutuacao_agudos_db_proc']} "
              f"harm {met['harmonicos_4k6_6k_media_db']}/{met['harmonicos_4k6_6k_pior_db']} | {met['harmonicos_6k_7k6_media_db']}/{met['harmonicos_6k_7k6_pior_db']} "
              f"alt {met['amostras_alteradas_pct']}% lag {met['atraso_amostras']}", flush=True)

    saida = {"amostra": {"inicio_s": ini, "duracao_s": dur, "sr": sr},
             "legenda": {
                 "agudos_6k5_10k_banda_aberta_db": "mudança de energia 6,5-10 kHz nos trechos fortes (onde o chiado aparece)",
                 "medios_200_4k_trechos_fortes_db": "mudança na faixa principal da música (ideal ~0)",
                 "graves_40_100_trechos_fortes_db": "mudança no baixo musical (ideal ~0)",
                 "subsonico_5_25_db": "mudança abaixo de 25 Hz (sem conteúdo musical)",
                 "quietos_1k_10k_db": "mudança nos trechos quietos",
                 "trecho_inicial_200_10k_db": "mudança no ruído do trecho sem música",
                 "sinal_residuo_100_4k_fortes_db": "música (100-4k) / o que foi removido nessa faixa; >30 dB = música intacta",
                 "corr_transientes_agudos": "preservação dos ataques agudos (1 = idêntico)",
                 "flutuacao_agudos_db": "desvio-padrão quadro a quadro do nível 6,5-10 kHz (bombeamento); subir é ruim",
                 "harmonicos": "perda nos 4 picos tonais mais fortes de 4,6-6 kHz e de 6-7,6 kHz (média/pior); ideal 0",
                 "amostras_alteradas_pct": "porcentagem de amostras alteradas em mais de 1e-5",
             },
             "testes": resultados}
    (PASTA / "testes_filtros.json").write_text(json.dumps(saida, indent=2, ensure_ascii=False))
    tabela(resultados)
    C.conferir_original()


def tabela(res):
    cab = ("| # | filtro | parâmetros | agudos 6,5-10k (dB) | médios 200-4k (dB) | graves 40-100 (dB) | "
           "<25 Hz (dB) | quietos (dB) | trecho inicial (dB) | música/removido (dB) | transientes | "
           "harmônicos 4,6-6k média/pior (dB) | harmônicos 6-7,6k média/pior (dB) | flutuação agudos (dB) | amostras alteradas |")
    linhas = [cab, "|" + "---|" * 15]
    for r in res:
        linhas.append(
            f"| {r['id']} | {r['filtro']} | {r['parametros']} | {r['agudos_6k5_10k_banda_aberta_db']} | "
            f"{r['medios_200_4k_trechos_fortes_db']} | {r['graves_40_100_trechos_fortes_db']} | "
            f"{r['subsonico_5_25_db']} | {r['quietos_1k_10k_db']} | {r['trecho_inicial_200_10k_db']} | "
            f"{r['sinal_residuo_100_4k_fortes_db']} | {r['corr_transientes_agudos']} | "
            f"{r['harmonicos_4k6_6k_media_db']} / {r['harmonicos_4k6_6k_pior_db']} | "
            f"{r['harmonicos_6k_7k6_media_db']} / {r['harmonicos_6k_7k6_pior_db']} | "
            f"{r['flutuacao_agudos_db_orig']} → {r['flutuacao_agudos_db_proc']} | {r['amostras_alteradas_pct']}% |")
    (PASTA / "testes_filtros.md").write_text("# Testes individuais de filtros (amostra 0-20 s)\n\n" + "\n".join(linhas) + "\n")


if __name__ == "__main__":
    main()
