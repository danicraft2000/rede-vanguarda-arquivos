#!/usr/bin/env bash
# uso: finalizar.sh ORIGINAL.mp4 PASTA_BLOCOS SAIDA_REMASTER.mp4 SAIDA_COMPARACAO.mp4 [n_blocos]
set -euo pipefail
SRC="$1"; BL="$2"; OUT="$3"; CMP="$4"; N="${5:-}"
LIST="$BL/lista.txt"; : > "$LIST"
ls "$BL"/bloco_*.mkv | sort | { if [ -n "$N" ]; then head -n "$N"; else cat; fi; } | while read -r f; do echo "file '$f'" >> "$LIST"; done
NB=$(wc -l < "$LIST"); DUR=$(awk -v n="$NB" 'BEGIN{print n*300*1001/30000}')
# video ampliado + audio original com +5 dB (pico original -6,2 dB -> ~ -1,2 dB, sem compressao)
ffmpeg -v error -y -f concat -safe 0 -i "$LIST" -t "$DUR" -i "$SRC" -map 0:v -map 1:a -c:v copy \
  -af "volume=5dB" -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
# comparacao em tela dividida: esquerda = original (ampliado simples), direita = remasterizado
ffmpeg -v error -y -t "$DUR" -i "$SRC" -i "$OUT" -filter_complex "
 [0:v]format=rgb24,crop=620:466:13:6,scale=1440:1080:flags=bicubic,crop=720:1080:0:0,
   drawtext=text='ANTES (original 480p)':fontcolor=white:fontsize=36:x=24:y=24:box=1:boxcolor=black@0.6:boxborderw=10[a];
 [1:v]crop=720:1080:720:0,
   drawtext=text='DEPOIS (remaster IA 1080p)':fontcolor=white:fontsize=36:x=w-tw-24:y=24:box=1:boxcolor=black@0.6:boxborderw=10[b];
 [a][b]hstack,drawbox=x=718:y=0:w=4:h=ih:color=white@0.9:t=fill,format=yuv420p[v]" \
 -map "[v]" -map 1:a -c:v libx264 -preset medium -crf 18 -c:a copy -movflags +faststart "$CMP"
ls -la "$OUT" "$CMP"
