"""FASE 3 - Os três tratamentos, aplicados à amostra de 20 s (validação) ou à música inteira.

Uso:
  python3 scripts/03_presets.py amostra     # 0-20 s -> amostra_20s/
  python3 scripts/03_presets.py completo    # música inteira -> presets/  (só depois de validar a amostra)

Decisões vindas das fases 1 e 2 (ver analise/ e amostra_20s/testes_filtros.md):
- sem adeclick: nenhum estalo real (o FFmpeg altera 0 amostras com t>=4);
- sem adeclip: não há clipping (pico -11 dBFS, sem platôs; o FFmpeg altera 0 amostras);
- sem notch: não há zumbido de rede; o notch só tirava grave musical (-0,4 dB em 40-100 Hz);
- sem anlmdn: só atua nos trechos quietos, onde o codec já tinha removido o ruído (tiraria detalhe);
- sem realce de agudos: só aumentaria o chiado; a referência 2004-05 não indica perda tonal a corrigir;
- sem suavização de ganho (gs) no afftdn: ela arrasta a redução para os harmônicos musicais agudos;
- sem ganho/normalização: o nível original é mantido.
O que sobra e se justifica: passa-altas subsônico (excesso de +19 dB abaixo de 25 Hz em relação à
referência) e redução do chiado só nos agudos (acima de 6 kHz, ou 4,5 kHz no avançado), com graves e
médios intocados.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).parent))
import comum as C  # noqa: E402
import metricas as M  # noqa: E402

PRESETS = {
    "conservador": {
        "nome": "PRESET 1 - CONSERVADOR",
        "objetivo": "máxima preservação: só o subsônico e um toque leve no chiado acima de 6 kHz",
        "passa_altas_hz": 20, "passa_altas_ordem": 4,
        "corte_agudos_hz": 6000, "afftdn": "afftdn=nr=6:nf=-60:tn=1",
    },
    "restauracao": {
        "nome": "PRESET 2 - RESTAURAÇÃO",
        "objetivo": "equilíbrio: chiado acima de 6 kHz reduzido, harmônicos de 4,6-6 kHz intocados",
        "passa_altas_hz": 25, "passa_altas_ordem": 4,
        "corte_agudos_hz": 6000, "afftdn": "afftdn=nr=10:nf=-60:tn=1",
    },
    "avancado": {
        "nome": "PRESET 3 - RESTAURAÇÃO AVANÇADA",
        "objetivo": "limpeza mais funda (desde 4,5 kHz), sem suavização de ganho para não arrastar harmônicos",
        "passa_altas_hz": 30, "passa_altas_ordem": 4,
        "corte_agudos_hz": 4500, "afftdn": "afftdn=nr=12:nf=-60:tn=1",
    },
}
# Versão anterior (descartada após medir a perda nos harmônicos 4,6-7,6 kHz): divisor em 4,5 kHz nos três
# presets, com gs=3 (restauração) e gs=5 (avançado) -> harmônicos -1,7 e -2,4 dB em média.


def processar(m: np.ndarray, sr: int, p: dict) -> np.ndarray:
    y = C.passa_altas(m, sr, p["passa_altas_hz"], p["passa_altas_ordem"])
    y = C.afftdn_agudos(y, sr, p["corte_agudos_hz"], p["afftdn"])
    return y


def main():
    modo = sys.argv[1] if len(sys.argv) > 1 else "amostra"
    C.conferir_original()
    x, sr = C.decodificar(C.ENTRADA)
    canais = x.shape[1]
    analise = json.loads((C.RAIZ / "analise" / "relatorio_analise.json").read_text())
    m = C.mid(x)
    if modo == "amostra":
        m = m[:20 * sr]
        pasta = C.RAIZ / "amostra_20s"
    elif modo == "completo":
        pasta = C.RAIZ / "presets"
    else:
        raise SystemExit("modo deve ser 'amostra' ou 'completo'")
    pasta.mkdir(exist_ok=True)
    reg = M.regioes(m, sr, analise["inicio_musica_s"])

    sf.write(pasta / "0_original.flac", C.dual_mono(m, canais), sr, subtype="PCM_24")
    medidas = {"original": C.resumo_medidas(m, sr)}
    comparacoes = {}
    versoes = {"original": m}
    for i, (chave, p) in enumerate(PRESETS.items(), 1):
        y = processar(m, sr, p)
        versoes[chave] = y
        assert len(y) == len(m), "o comprimento mudou"
        if np.max(np.abs(y)) >= 1:
            raise SystemExit(f"{chave}: passaria de 0 dBFS")
        sf.write(pasta / f"{i}_{chave}.flac", C.dual_mono(y, canais), sr, subtype="PCM_24")
        sf.write(pasta / f"{i}_{chave}__removido.flac", C.dual_mono(m - y, canais), sr, subtype="PCM_24")
        medidas[chave] = C.resumo_medidas(y, sr)
        comparacoes[chave] = M.comparar(m, y, sr, reg)
        c = comparacoes[chave]
        print(f"{p['nome']:34s} chiado 6,5-10k {c['agudos_6k5_10k_banda_aberta_db']:+.2f} dB | médios "
              f"{c['medios_200_4k_trechos_fortes_db']:+.2f} | graves 40-100 {c['graves_40_100_trechos_fortes_db']:+.2f} | "
              f"<25 Hz {c['subsonico_5_25_db']:+.2f} | quietos {c['quietos_1k_10k_db']:+.2f} | música/removido "
              f"{c['sinal_residuo_100_4k_fortes_db']} dB | transientes {c['corr_transientes_agudos']} | "
              f"harm 4,6-6k {c['harmonicos_4k6_6k_media_db']} (pior {c['harmonicos_4k6_6k_pior_db']}) "
              f"6-7,6k {c['harmonicos_6k_7k6_media_db']} (pior {c['harmonicos_6k_7k6_pior_db']}) | "
              f"flutuação {c['flutuacao_agudos_db_orig']}->{c['flutuacao_agudos_db_proc']} dB | "
              f"LUFS {medidas[chave].get('lufs_integrado')} | pico {medidas[chave]['pico_dbfs']} | "
              f"amostras {medidas[chave]['amostras']} (orig {len(m)})", flush=True)

    out = {"modo": modo, "sr": sr, "canais": canais,
           "presets": PRESETS, "medidas": medidas, "comparacao_com_original": comparacoes}
    (pasta / "presets_medidas.json").write_text(json.dumps(out, indent=2, ensure_ascii=False))
    np.savez_compressed(C.RAIZ / ".cache_versoes_{}.npz".format(modo), sr=sr, **versoes)
    C.conferir_original()


if __name__ == "__main__":
    main()
