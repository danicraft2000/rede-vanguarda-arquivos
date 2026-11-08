#!/usr/bin/env bash
# Junta os blocos renderizados e coloca a música. uso: tools/finalizar.sh <pasta-saida> <musica.m4a> <video-final.mp4>
set -euo pipefail
SAIDA="$1"; MUSICA="$2"; FINAL="$3"
ffmpeg -v error -y -f concat -safe 0 -i "$SAIDA/blocos/lista.txt" -c copy "$SAIDA/sem_audio.mp4"
ffmpeg -v error -y -i "$SAIDA/sem_audio.mp4" -i "$MUSICA" -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -tune animation -x264-params keyint=60 \
  -c:a aac -b:a 256k -shortest -movflags +faststart \
  -metadata title="Daniel 20 Anos — Projeto da Festa (tema Rede Vanguarda)" "$FINAL"
ffprobe -v error -show_entries format=duration,size,bit_rate -of default=nw=1 "$FINAL"
