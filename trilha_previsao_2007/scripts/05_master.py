"""FASE 5 - Master final.

Uso: python3 scripts/05_master.py [restauracao|conservador|avancado]   (padrão: restauracao)

Refaz o preset escolhido a partir do original (não depende de arquivos intermediários) e exporta:
- WAV PCM 24 bits, 44,1 kHz (taxa original), 2 canais (mesmo número de canais, dual-mono);
- MP3 320 kbps CBR (LAME, qualidade máxima do algoritmo) como alternativa.
Sem ganho, sem normalização, sem limitador. Confere duração, canais, taxa e nível de cada arquivo.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).parent))
import comum as C  # noqa: E402

presets = __import__("03_presets")


def main():
    escolha = sys.argv[1] if len(sys.argv) > 1 else "restauracao"
    p = presets.PRESETS[escolha]
    sha = C.conferir_original()
    x, sr = C.decodificar(C.ENTRADA)
    canais = x.shape[1]
    m = C.mid(x)
    y = presets.processar(m, sr, p)
    assert len(y) == len(m)

    pasta = C.RAIZ / "master"
    pasta.mkdir(exist_ok=True)
    base = "trilhaPrevisao_2007_restaurada"
    wav = pasta / f"{base}.wav"
    mp3 = pasta / f"{base}_320k.mp3"
    C.salvar_wav(wav, C.dual_mono(y, canais), sr, "PCM_24")

    titulo = "Trilha da Previsão do Tempo (gravação VHS 2007) - restauração"
    comentario = (f"Preset {p['nome']}: passa-altas {p['passa_altas_hz']} Hz ordem {p['passa_altas_ordem']} "
                  f"fase zero; {p['afftdn']} só acima de {p['corte_agudos_hz']} Hz. Sem ganho/normalização.")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-c:a", "libmp3lame", "-b:a", "320k",
                    "-compression_level", "0", "-ar", str(sr), "-ac", str(canais),
                    "-metadata", f"title={titulo}", "-metadata", f"comment={comentario}",
                    "-id3v2_version", "3", str(mp3)], check=True)

    # ------------------------------------------------------------ conferências
    info_wav = C.ffprobe(wav)["streams"][0]
    info_mp3 = C.ffprobe(mp3)["streams"][0]
    lido, sr_w = sf.read(str(wav), always_2d=True)
    dec_mp3, sr_m = C.decodificar(mp3)
    n = min(len(dec_mp3), len(lido))
    lag_mp3 = C.atraso(lido[:n, 0], dec_mp3[:n, 0], 4096)
    dif_mp3 = lido[:n, 0] - dec_mp3[:n, 0]
    orig_med = C.resumo_medidas(m, sr)
    wav_med = C.resumo_medidas(lido[:, 0], sr_w)
    mp3_med = C.resumo_medidas(dec_mp3[:, 0], sr_m)
    erro_24 = float(np.max(np.abs(lido[:, 0] - y)))
    info = {
        "preset": escolha, "parametros": p,
        "original": {"arquivo": str(C.ENTRADA.relative_to(C.RAIZ)), "sha256": sha, "medidas": orig_med},
        "wav": {"arquivo": str(wav.relative_to(C.RAIZ)), "codec": info_wav["codec_name"],
                "bits": info_wav.get("bits_per_sample"), "sample_rate": int(info_wav["sample_rate"]),
                "canais": int(info_wav["channels"]), "amostras": int(len(lido)),
                "duracao_s": round(len(lido) / sr_w, 6), "L_igual_R": bool(np.array_equal(lido[:, 0], lido[:, 1])),
                "erro_quantizacao_24bit_max": erro_24, "medidas": wav_med,
                "sha256": C.sha256(wav)},
        "mp3": {"arquivo": str(mp3.relative_to(C.RAIZ)), "bitrate_kbps": round(int(info_mp3["bit_rate"]) / 1000),
                "sample_rate": int(info_mp3["sample_rate"]), "canais": int(info_mp3["channels"]),
                "amostras_decodificadas": int(len(dec_mp3)), "duracao_decodificada_s": round(len(dec_mp3) / sr_m, 6),
                "atraso_vs_wav_amostras": lag_mp3,
                "diferenca_vs_wav_rms_dbfs": round(C.rms_db(dif_mp3), 1), "medidas": mp3_med,
                "sha256": C.sha256(mp3)},
        "ganho_aplicado_db": 0.0,
        "diferenca_loudness_vs_original_lu": round(wav_med["lufs_integrado"] - orig_med["lufs_integrado"], 2),
    }
    (pasta / "master_info.json").write_text(json.dumps(info, indent=2, ensure_ascii=False))
    w, mm = info["wav"], info["mp3"]
    print(f"WAV: {w['codec']} {w['bits']} bits, {w['sample_rate']} Hz, {w['canais']} canais, {w['amostras']} amostras "
          f"({w['duracao_s']} s; original {orig_med['amostras']}), L==R {w['L_igual_R']}, erro 24 bits {erro_24:.2e}")
    print(f"     pico {w['medidas']['pico_dbfs']} dBFS, true peak {w['medidas']['true_peak_dbtp']} dBTP, "
          f"{w['medidas']['lufs_integrado']} LUFS (original {orig_med['lufs_integrado']}), LRA {w['medidas']['lra_lu']}")
    print(f"MP3: {mm['bitrate_kbps']} kbps, {mm['sample_rate']} Hz, {mm['canais']} canais, {mm['amostras_decodificadas']} "
          f"amostras decodificadas, atraso {mm['atraso_vs_wav_amostras']}, diferença vs WAV {mm['diferenca_vs_wav_rms_dbfs']} dBFS, "
          f"true peak {mm['medidas']['true_peak_dbtp']} dBTP")
    C.conferir_original()


if __name__ == "__main__":
    main()
