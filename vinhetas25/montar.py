#!/usr/bin/env python3
"""Monta o especial: mosaico das 25 vinhetas, transicoes (xfade), trilha e encode final.

Uso:
  python3 montar.py                 -> build/Rede_Vanguarda_25_Anos_Vinhetas.mp4 (alta qualidade)
  python3 montar.py --leve 95       -> tambem gera uma versao de ~95 MB (cabe no GitHub)
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent
B = ROOT / "build"
FPS = 30


def run(cmd):
    print("+", " ".join(str(c) for c in cmd[:12]), "..." if len(cmd) > 12 else "")
    subprocess.run([str(c) for c in cmd], check=True)


def linha_do_tempo():
    r = json.loads((ROOT / "roteiro.json").read_text(encoding="utf-8"))
    T = r["transicao"]
    t, out = 0.0, []
    for c in r["cenas"]:
        out.append({**c, "ini": t})
        t += c["dur"] - T
    return out, out[-1]["ini"] + out[-1]["dur"], T


def mosaico(cenas, dur):
    """grade 5x5 com as 25 vinhetas tocando juntas (as placas do logo dos 25 anos)"""
    out = B / "cenas" / "M.mp4"
    ids = [c["id"] for c in cenas if c["id"].isdigit() and 1 <= int(c["id"]) <= 25]
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    for i in ids:
        cmd += ["-ss", "2.0", "-t", "4.6", "-i", B / "cenas" / f"{i}.mp4"]
    f = []
    for k in range(25):
        row, col = divmod(k, 5)
        d = 0.15 + (row + col) * 0.09
        f.append(f"[{k}:v]setpts=PTS-STARTPTS,scale=376:208:flags=lanczos,pad=384:216:4:4:black,"
                 f"tpad=start_duration={d:.2f}:start_mode=add:color=black:stop_mode=clone:stop_duration={dur:.2f},"
                 f"fade=t=in:st={d:.2f}:d=0.35,trim=duration={dur:.2f},setpts=PTS-STARTPTS[t{k}]")
    lay = "|".join(f"{(k % 5) * 384}_{(k // 5) * 216}" for k in range(25))
    f.append("".join(f"[t{k}]" for k in range(25)) + f"xstack=inputs=25:layout={lay},fps={FPS},format=yuv420p[v]")
    cmd += ["-filter_complex", ";".join(f), "-map", "[v]", "-c:v", "libx264", "-preset", "medium", "-crf", "12",
            "-pix_fmt", "yuv420p", "-r", str(FPS), out]
    run(cmd)
    return out


def main():
    cenas, total, T = linha_do_tempo()
    faltando = [c["id"] for c in cenas if c.get("tipo") != "mosaico" and not (B / "cenas" / f"{c['id']}.mp4").exists()]
    if faltando:
        sys.exit(f"faltam cenas: {faltando} (rode node render.js)")
    m = next(c for c in cenas if c.get("tipo") == "mosaico")
    mosaico(cenas, m["dur"])
    trilha = B / "trilha.wav"
    if not trilha.exists():
        run([sys.executable, ROOT / "trilha.py", trilha])

    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-stats"]
    for c in cenas:
        cmd += ["-i", B / "cenas" / f"{c['id']}.mp4"]
    cmd += ["-i", trilha]
    f, prev = [], "[0:v]"
    for k in range(1, len(cenas)):
        tipo = cenas[k - 1].get("trans", "fade")
        f.append(f"{prev}[{k}:v]xfade=transition={tipo}:duration={T}:offset={cenas[k]['ini']:.3f}[x{k}]")
        prev = f"[x{k}]"
    f.append(f"{prev}format=yuv420p[v]")
    na = len(cenas)
    f.append(f"[{na}:a]loudnorm=I=-14:TP=-1.0:LRA=7,aresample=48000[a]")
    final = B / "Rede_Vanguarda_25_Anos_Vinhetas.mp4"
    cmd += ["-filter_complex", ";".join(f), "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-maxrate", "16M", "-bufsize", "32M",
            "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
            "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", "-t", f"{total:.3f}", final]
    run(cmd)
    print("pronto:", final)

    if "--leve" in sys.argv:
        mb = float(sys.argv[sys.argv.index("--leve") + 1])
        kbps = int(mb * 8192 / total - 192)
        leve = B / f"Rede_Vanguarda_25_Anos_Vinhetas_{int(mb)}MB.mp4"
        base = ["ffmpeg", "-y", "-loglevel", "error", "-stats", "-i", final, "-c:v", "libx264", "-preset", "slow",
                "-b:v", f"{kbps}k", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709"]
        run(base + ["-pass", "1", "-passlogfile", B / "x264", "-an", "-f", "mp4", "/dev/null"])
        run(base + ["-pass", "2", "-passlogfile", B / "x264", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", leve])
        print("pronto:", leve)


if __name__ == "__main__":
    main()
