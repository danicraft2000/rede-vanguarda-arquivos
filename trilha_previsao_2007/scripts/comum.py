"""Funções comuns do projeto de restauração da trilha da Previsão (VHS 2007).

Regras que este módulo garante:
- o arquivo de entrada só é lido (nunca aberto para escrita) e o SHA-256 é conferido;
- decodificação na taxa e no número de canais originais (sem reamostrar);
- todo filtro preserva o número de amostras e o alinhamento (atraso medido e compensado).
"""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

import numpy as np
import scipy.signal as ss

RAIZ = Path(__file__).resolve().parents[1]
ENTRADA = RAIZ / "INPUT" / "trilhaPrevisao_2007.mp3"
REFERENCIA = RAIZ / "INPUT" / "referencia_vinheta_2004-2005.mp3"
SHA_ESPERADO = {
    "trilhaPrevisao_2007.mp3": "759c7e5ed2cbae18591dce5c6fdcc6d08423d14b2042e340bf08dedb94270d80",
    "referencia_vinheta_2004-2005.mp3": "5f73e3413494d72197788dbca0d01140ee938bca46d19e8ee5f45202a99777bf",
}
EPS = 1e-12


# ----------------------------------------------------------------------------- E/S
def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for bloco in iter(lambda: f.read(1 << 20), b""):
            h.update(bloco)
    return h.hexdigest()


def conferir_original(path: Path = ENTRADA) -> str:
    """Falha se o original tiver sido alterado."""
    d = sha256(path)
    esperado = SHA_ESPERADO.get(path.name)
    if esperado and d != esperado:
        raise SystemExit(f"ERRO: {path.name} foi alterado (sha256 {d} != {esperado})")
    return d


def ffprobe(path: Path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)],
        check=True, capture_output=True, text=True).stdout
    return json.loads(out)


def decodificar(path: Path) -> tuple[np.ndarray, int]:
    """Decodifica para float32 (N, canais) na taxa e nos canais originais."""
    info = ffprobe(path)["streams"][0]
    sr, ch = int(info["sample_rate"]), int(info["channels"])
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-acodec", "pcm_f32le", "-"],
        check=True, capture_output=True).stdout
    x = np.frombuffer(raw, dtype="<f4").reshape(-1, ch).astype(np.float64)
    return x, sr


def mid(x: np.ndarray) -> np.ndarray:
    return x.mean(axis=1) if x.ndim == 2 else x


def recensear_quadros_mp3(path: Path) -> dict:
    """Lê os cabeçalhos dos quadros MPEG-1 Layer III: distribuição de bitrate e modo."""
    d = Path(path).read_bytes()
    i = 0
    if d[:3] == b"ID3":
        i = 10 + ((d[6] << 21) | (d[7] << 14) | (d[8] << 7) | d[9])
    tab_br = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
    tab_sr = [44100, 48000, 32000, 0]
    modos = ["stereo", "joint_stereo", "dual_channel", "mono"]
    hist, cont_modo, n, xing = {}, {}, 0, None
    while i < len(d) - 4:
        if d[i] == 0xFF and (d[i + 1] & 0xE0) == 0xE0:
            b1, b2, b3 = d[i + 1], d[i + 2], d[i + 3]
            ver, layer = (b1 >> 3) & 3, (b1 >> 1) & 3
            bri, sri, pad, modo = (b2 >> 4) & 15, (b2 >> 2) & 3, (b2 >> 1) & 1, (b3 >> 6) & 3
            if ver == 3 and layer == 1 and bri not in (0, 15) and sri != 3:
                br, sr = tab_br[bri], tab_sr[sri]
                if n == 0:
                    cab = d[i:i + 400]
                    xing = {"Xing": b"Xing" in cab, "Info": b"Info" in cab,
                            "encoder": "Lavc (FFmpeg/LAME)" if b"Lavc" in cab else ("LAME" if b"LAME" in cab else "?")}
                else:  # o 1o quadro é o cabeçalho Xing, não conta como áudio
                    hist[br] = hist.get(br, 0) + 1
                    cont_modo[modos[modo]] = cont_modo.get(modos[modo], 0) + 1
                n += 1
                i += 144 * br * 1000 // sr + pad
                continue
        i += 1
    tot = sum(hist.values())
    media = sum(k * v for k, v in hist.items()) / max(tot, 1)
    return {"quadros_audio": tot, "histograma_kbps": dict(sorted(hist.items())),
            "bitrate_medio_quadros_kbps": round(media, 1),
            "tipo": "VBR" if len(hist) > 2 else "CBR", "modos": cont_modo, "cabecalho": xing}


def salvar_wav(path: Path, x: np.ndarray, sr: int, subtipo: str = "PCM_24") -> None:
    import soundfile as sf
    path.parent.mkdir(parents=True, exist_ok=True)
    pico = np.max(np.abs(x))
    if pico >= 1.0:
        raise SystemExit(f"ERRO: {path.name} passaria de 0 dBFS (pico {pico:.4f}); nada foi gravado")
    sf.write(str(path), x.astype(np.float64), sr, subtype=subtipo)


def dual_mono(m: np.ndarray, canais: int) -> np.ndarray:
    """Repete o mesmo sinal mono nos canais originais (sem criar estéreo)."""
    return np.repeat(m[:, None], canais, axis=1)


# ----------------------------------------------------------------------------- filtros
def ffmpeg_filtro(m: np.ndarray, sr: int, grafo: str, margem_s: float = 1.0) -> np.ndarray:
    """Aplica um filtergraph do FFmpeg num sinal mono float, mantendo comprimento e alinhamento.

    O sinal recebe 1 s de silêncio antes e depois: assim o aquecimento das janelas (adeclick,
    adeclip) e a latência (afftdn ~1102 amostras, anlmdn ~353) não comem o início nem o fim.
    O atraso é medido por correlação cruzada e descontado."""
    pad = int(margem_s * sr)
    entrada = np.concatenate([np.zeros(pad), m, np.zeros(pad)])
    proc = subprocess.run(
        ["ffmpeg", "-v", "error", "-f", "f64le", "-ar", str(sr), "-ac", "1", "-i", "-",
         "-af", grafo, "-f", "f64le", "-acodec", "pcm_f64le", "-"],
        input=entrada.astype("<f8").tobytes(), capture_output=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg falhou com '{grafo}': {proc.stderr.decode()[-800:]}")
    y = np.frombuffer(proc.stdout, dtype="<f8").astype(np.float64)
    if len(y) < len(entrada):
        y = np.concatenate([y, np.zeros(len(entrada) - len(y))])
    lag = atraso(m, y[pad:pad + len(m)], maximo=pad // 2)
    lag_total = atraso(entrada, y[:len(entrada)], maximo=pad // 2)
    lag = lag_total if abs(lag_total) <= pad // 2 else lag
    return y[pad + lag:pad + lag + len(m)].copy()


def atraso(a: np.ndarray, b: np.ndarray, maximo: int = 8192) -> int:
    """Atraso (amostras) de b em relação a a, por correlação cruzada (FFT)."""
    n = min(len(a), len(b))
    nfft = 1 << int(np.ceil(np.log2(2 * n)))
    c = np.fft.irfft(np.conj(np.fft.rfft(a[:n], nfft)) * np.fft.rfft(b[:n], nfft), nfft)
    c = np.concatenate([c[-maximo:], c[:maximo + 1]])
    return int(np.argmax(c)) - maximo


def alinhar(ref: np.ndarray, y: np.ndarray) -> np.ndarray:
    lag = atraso(ref, y)
    if lag > 0:
        y = y[lag:]
    elif lag < 0:
        y = np.concatenate([np.zeros(-lag), y])
    if len(y) < len(ref):
        y = np.concatenate([y, np.zeros(len(ref) - len(y))])
    return y[:len(ref)]


def notch(m: np.ndarray, sr: int, freqs, q: float) -> np.ndarray:
    """Notch IIR de 2a ordem em cada frequência, fase zero (filtfilt)."""
    y = m.copy()
    for f0 in freqs:
        b, a = ss.iirnotch(f0, q, fs=sr)
        y = ss.filtfilt(b, a, y)
    return y


def passa_altas(m: np.ndarray, sr: int, fc: float, ordem: int = 2) -> np.ndarray:
    """Passa-altas Butterworth fase zero (ordem efetiva 2x por causa do filtfilt)."""
    sos = ss.butter(ordem, fc, "highpass", fs=sr, output="sos")
    return ss.sosfiltfilt(sos, m)


def eq_fir(m: np.ndarray, sr: int, pontos_hz, ganhos_db, ntaps: int = 4097) -> np.ndarray:
    """EQ corretiva FIR de fase linear (firwin2) com curva suave; atraso compensado."""
    f = np.concatenate([[0.0], np.asarray(pontos_hz, float), [sr / 2]])
    g = np.concatenate([[ganhos_db[0]], np.asarray(ganhos_db, float), [ganhos_db[-1]]])
    h = ss.firwin2(ntaps, f, 10 ** (g / 20), fs=sr, window="blackmanharris")
    y = ss.fftconvolve(m, h, mode="full")
    d = (ntaps - 1) // 2
    return y[d:d + len(m)]


def dividir_bandas(m: np.ndarray, sr: int, fc: float, ntaps: int = 2047):
    """Divisor de frequência FIR de fase linear com reconstrução perfeita: graves + agudos == m."""
    h = ss.firwin(ntaps, fc, fs=sr, window=("kaiser", 8.6))
    d = (ntaps - 1) // 2
    baixo = ss.fftconvolve(m, h, mode="full")[d:d + len(m)]
    return baixo, m - baixo


def afftdn_agudos(m: np.ndarray, sr: int, fc: float, grafo: str) -> np.ndarray:
    """Aplica o afftdn só acima de fc; abaixo de fc o sinal sai idêntico ao original."""
    baixo, alto = dividir_bandas(m, sr, fc)
    return baixo + ffmpeg_filtro(alto, sr, grafo)


# ----------------------------------------------------------------------------- medidas
def db(v):
    return 20 * np.log10(np.maximum(np.abs(v), EPS))


def rms_db(x):
    return float(db(np.sqrt(np.mean(np.square(x)))))


def rms_quadros(m, sr, quadro=0.05, salto=0.025):
    n, h = int(quadro * sr), int(salto * sr)
    k = 1 + max(0, (len(m) - n) // h)
    idx = np.arange(n)[None, :] + h * np.arange(k)[:, None]
    q = m[idx]
    return db(np.sqrt(np.mean(q ** 2, axis=1))), (np.arange(k) * h + n / 2) / sr


def ebur128(m: np.ndarray, sr: int, canais: int = 2) -> dict:
    """Loudness EBU R128 medido como o arquivo é tocado: o mono repetido nos 2 canais."""
    x = np.repeat(m[:, None], canais, axis=1) if m.ndim == 1 else m
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-f", "f64le", "-ar", str(sr), "-ac", str(x.shape[1]), "-i", "-",
         "-af", "ebur128=peak=true", "-f", "null", "-"],
        input=np.ascontiguousarray(x).astype("<f8").tobytes(), capture_output=True, text=False)
    txt = proc.stderr.decode(errors="ignore").split("Summary:")[-1]
    out = {}
    for linha in txt.splitlines():
        linha = linha.strip()
        for chave, nome in (("I:", "lufs_integrado"), ("LRA:", "lra_lu"), ("Peak:", "true_peak_dbtp")):
            if linha.startswith(chave):
                try:
                    out[nome] = float(linha.split()[1])
                except ValueError:
                    out[nome] = None
    return out


def ltas(m, sr, nperseg=8192):
    f, p = ss.welch(m, sr, nperseg=nperseg)
    return f, p


def niveis_bandas(f, p, bandas):
    df = f[1] - f[0]
    return {f"{lo}-{hi}": float(10 * np.log10(np.sum(p[(f >= lo) & (f < hi)]) * df + 1e-30))
            for lo, hi in bandas}


BANDAS_OITAVA = [(20, 45), (45, 90), (90, 180), (180, 355), (355, 710), (710, 1400),
                 (1400, 2800), (2800, 5600), (5600, 11200), (11200, 22050)]


def stft_db(m, sr, nfft=4096, salto=1024):
    f, t, Z = ss.stft(m, sr, nperseg=nfft, noverlap=nfft - salto, window="hann", boundary=None, padded=False)
    # scipy já divide por sum(janela): senoide de amplitude 1 => |Z| = 0,5 => 0 dB após *2
    mag = np.abs(Z) * 2
    return f, t, 20 * np.log10(mag + 1e-10)


def stft_psd_db(m, sr, nfft=4096, salto=1024):
    """STFT em densidade espectral (dB/Hz), mesma escala do Welch."""
    w = ss.get_window("hann", nfft)
    f, t, Z = ss.stft(m, sr, window=w, nperseg=nfft, noverlap=nfft - salto, boundary=None, padded=False)
    psd = np.abs(Z) ** 2 * np.sum(w) ** 2 / (sr * np.sum(w ** 2)) * 2
    return f, t, 10 * np.log10(psd + 1e-30)


def piso_ruido_espectral(m, sr, nfft=4096, salto=1024, percentil=10, mascara_t=None):
    """Estimativa de piso de ruído por estatística de mínimos (percentil baixo por bin), em dB/Hz.

    Retorna (f, piso_percentil, média_em_dB) na mesma escala do Welch."""
    f, t, S = stft_psd_db(m, sr, nfft, salto)
    if mascara_t is not None:
        S = S[:, mascara_t(t)]
    return f, np.percentile(S, percentil, axis=1), 10 * np.log10(np.mean(10 ** (S / 10), axis=1))


def detectar_estalos(m, sr, ordem=24, bloco=2048, k=9.0, mascara=None):
    """Estalos = picos no resíduo de predição linear (AR) acima de k desvios robustos.

    Retorna a lista de eventos (início, fim em s, pico do resíduo em desvios)."""
    import librosa
    salto = bloco // 2
    res = np.zeros_like(m)
    w = np.hanning(bloco)
    for s in range(0, len(m) - bloco, salto):
        q = m[s:s + bloco]
        if np.max(np.abs(q)) < 1e-6:
            continue
        try:
            a = librosa.lpc(q * w, order=ordem)
        except Exception:
            continue
        e = ss.lfilter(a, [1.0], q)
        e[:ordem] = 0
        sig = np.median(np.abs(e[ordem:])) / 0.6745 + EPS
        z = np.abs(e) / sig
        mid0, mid1 = bloco // 4, 3 * bloco // 4
        res[s + mid0:s + mid1] = np.maximum(res[s + mid0:s + mid1], z[mid0:mid1])
    pos = np.flatnonzero(res > k)
    if mascara is not None:
        pos = pos[mascara(pos / sr)]
    eventos = []
    if len(pos):
        ini, ant, pk = pos[0], pos[0], res[pos[0]]
        for p in pos[1:]:
            if p - ant > int(0.002 * sr):
                eventos.append((ini / sr, ant / sr, float(pk)))
                ini, pk = p, res[p]
            pk = max(pk, res[p])
            ant = p
        eventos.append((ini / sr, ant / sr, float(pk)))
    return eventos, res


def zumbido(m, sr, fundamentais=(50.0, 59.94, 60.0), harmonicos=8, nperseg=1 << 16):
    """Proeminência (dB acima do fundo local) e persistência temporal de cada harmônico."""
    f, p = ss.welch(m, sr, nperseg=nperseg)
    pd = 10 * np.log10(p + 1e-30)
    df = f[1] - f[0]
    # persistência: espectrograma com janelas de 1,5 s
    n2 = int(1.5 * sr)
    f2, t2, Z = ss.stft(m, sr, nperseg=n2, noverlap=n2 // 2)
    S2 = 20 * np.log10(np.abs(Z) + 1e-12)
    env = np.mean(S2[(f2 > 150) & (f2 < 4000)], axis=0)  # envelope da música por janela
    out = {}
    for f0 in fundamentais:
        lista = []
        for k in range(1, harmonicos + 1):
            fk = f0 * k
            i = np.argmin(np.abs(f - fk))
            janela = max(1, int(round(0.6 / df)))
            pico = float(pd[i - janela:i + janela + 1].max())
            viz = np.r_[pd[i - int(15 / df):i - int(3 / df)], pd[i + int(3 / df):i + int(15 / df)]]
            prom = pico - float(np.median(viz))
            j = np.argmin(np.abs(f2 - fk))
            vz = np.r_[S2[j - 12:j - 3], S2[j + 4:j + 13]]
            pers = float(np.mean(S2[j] - np.median(vz, axis=0) > 6))
            linha = S2[j - 1:j + 2].max(axis=0)
            # zumbido de rede tem nível constante; componente musical acompanha a música
            desvio = float(np.std(linha))
            corr = float(np.corrcoef(linha, env)[0, 1]) if len(linha) > 3 else 0.0
            lista.append({"harmonico": k, "freq_hz": round(fk, 2), "pico_db": round(pico, 1),
                          "proeminencia_db": round(prom, 1), "persistencia": round(pers, 2),
                          "desvio_nivel_db": round(desvio, 1), "corr_com_envelope_musica": round(corr, 2)})
        out[f"{f0:g}"] = lista
    return out


def resumo_medidas(m, sr, mascara_quieto=None):
    """Medidas usadas para comparar versões."""
    r, t = rms_quadros(m, sr)
    ativos = r[r > -60]
    e = ebur128(m, sr)
    f, p = ltas(m, sr)
    pico = float(db(np.max(np.abs(m))))
    rms = rms_db(m)
    out = {
        "duracao_s": round(len(m) / sr, 6), "amostras": int(len(m)),
        "pico_dbfs": round(pico, 2), "rms_dbfs": round(rms, 2),
        "fator_crista_db": round(pico - rms, 2),
        "quadros_p10_dbfs": round(float(np.percentile(r, 10)), 2),
        "quadros_p95_dbfs": round(float(np.percentile(r, 95)), 2),
        "faixa_dinamica_p95_p10_db": round(float(np.percentile(r, 95) - np.percentile(r, 10)), 2),
        "bandas_oitava_db": {k: round(v, 1) for k, v in niveis_bandas(f, p, BANDAS_OITAVA).items()},
        **e,
    }
    if mascara_quieto is not None:
        out["ruido_trecho_quieto_dbfs"] = round(rms_db(m[mascara_quieto]), 2)
    return out
