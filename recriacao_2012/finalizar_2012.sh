#!/usr/bin/env bash
# Junta os quadros renderizados com o audio original de cada vinheta e monta a compilacao.
# uso: finalizar_2012.sh PASTA_QUADROS PASTA_AUDIOS PASTA_SAIDA
#   PASTA_QUADROS/<nome>/q_0000.png ...   (nome = servico, news, comunidade, agenda)
#   PASTA_AUDIOS/<nome>.mp4                (vinheta original de onde sai o audio)
set -euo pipefail
Q="$1"; A="$2"; OUT="$3"
mkdir -p "$OUT"
declare -A TITULO=([servico]="Vanguarda_Servico" [news]="Vanguarda_News" [comunidade]="Vanguarda_Comunidade" [agenda]="Agenda_Vanguarda")
ORDEM=(servico news comunidade agenda)
VENC=(-c:v libx264 -preset slow -crf 14 -tune animation -pix_fmt yuv420p
      -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv)
for n in "${ORDEM[@]}"; do
  [ -d "$Q/$n" ] || { echo "faltando $Q/$n"; continue; }
  ffmpeg -v error -y -framerate 30000/1001 -i "$Q/$n/q_%04d.png" -i "$A/$n.mp4" \
    -map 0:v -map 1:a -vf "scale=out_color_matrix=bt709:out_range=tv" "${VENC[@]}" \
    -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart "$OUT/${TITULO[$n]}_2012_recriada.mp4"
  echo "ok ${TITULO[$n]}"
done
# compilacao: as 4 em sequencia com 1 s de preto entre elas
ARGS=(); FILT=""; i=0
for n in "${ORDEM[@]}"; do
  f="$OUT/${TITULO[$n]}_2012_recriada.mp4"; [ -f "$f" ] || continue
  ARGS+=(-i "$f")
  FILT+="[$i:v]tpad=stop_duration=1:color=black[v$i];[$i:a]apad=pad_dur=1[a$i];"
  i=$((i+1))
done
if [ "$i" -gt 1 ]; then
  CAT=""; for k in $(seq 0 $((i-1))); do CAT+="[v$k][a$k]"; done
  ffmpeg -v error -y "${ARGS[@]}" -filter_complex "${FILT}${CAT}concat=n=$i:v=1:a=1[v][a]" \
    -map "[v]" -map "[a]" "${VENC[@]}" -c:a aac -b:a 256k -ar 48000 -movflags +faststart \
    "$OUT/Vinhetas_Rede_Vanguarda_2012_recriadas_sem_telinhas.mp4"
  echo "ok compilacao"
fi
# comparacao lado a lado: esquerda = 2003 original (4:3), direita = recriacao 2012 (16:9)
for n in "${ORDEM[@]}"; do
  f="$OUT/${TITULO[$n]}_2012_recriada.mp4"; [ -f "$f" ] || continue
  ffmpeg -v error -y -i "$A/$n.mp4" -i "$f" -filter_complex "
    [0:v]fps=30000/1001,scale=720:540:flags=lanczos,pad=960:540:120:0:black,
      drawtext=text='2003 (original)':fontcolor=white:fontsize=26:x=24:y=20:box=1:boxcolor=black@0.6:boxborderw=8[a];
    [1:v]scale=960:540:flags=lanczos,
      drawtext=text='2012 recriada (sem telinhas)':fontcolor=white:fontsize=26:x=w-tw-24:y=20:box=1:boxcolor=black@0.6:boxborderw=8[b];
    [a][b]hstack,pad=1920:1080:0:270:black,format=yuv420p[v]" \
    -map "[v]" -map 1:a -c:v libx264 -preset medium -crf 18 -c:a copy -shortest -movflags +faststart \
    "$OUT/comparacao_${TITULO[$n]}.mp4"
done
ls -la "$OUT"
