#!/usr/bin/env bash
# Junta os quadros JPEG (30 qps) com a trilha e gera o MP4 final (H.264 + AAC).
set -euo pipefail
FR="${1:-build/frames}"; AUD="${2:-build/trilha_3x.m4a}"; OUT="${3:-build/Daniel_20_Anos_Projeto_da_Festa.mp4}"
ffmpeg -v error -stats -y -framerate 30 -i "$FR/f_%05d.jpg" -i "$AUD" -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a copy -shortest -movflags +faststart "$OUT"
ls -la "$OUT"
