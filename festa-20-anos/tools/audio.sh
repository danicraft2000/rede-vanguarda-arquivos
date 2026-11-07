#!/usr/bin/env bash
# Trilha do vídeo: a música (80 s) tocada 3 vezes, cada passagem entrando exatamente 132 batidas
# depois da anterior (132 × 0,60372 s = 79,691 s), assim o ritmo nunca "tropeça" na emenda.
# A cauda de cada passagem se sobrepõe ao começo da próxima. Fade-out nos últimos 1,4 s.
set -euo pipefail
IN="${1:-assets/trilha.mp3}"; OUT="${2:-build/trilha_3x.m4a}"; DUR="${3:-240}"
ffmpeg -v error -y -i "$IN" -i "$IN" -i "$IN" -filter_complex "
 [0:a]aresample=48000[a0];
 [1:a]aresample=48000,adelay=79691|79691[a1];
 [2:a]aresample=48000,adelay=159382|159382[a2];
 [a0][a1][a2]amix=inputs=3:normalize=0:duration=longest,volume=-1dB,apad,atrim=0:${DUR},afade=t=out:st=$(awk -v d="$DUR" 'BEGIN{print d-1.4}'):d=1.4[a]" \
 -map "[a]" -c:a aac -b:a 192k "$OUT"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT"
