#!/usr/bin/env bash
# Renderiza todos os quadros com N processos em paralelo (fila de blocos; retomável: pula quadros prontos).
set -uo pipefail
cd "$(dirname "$0")/.."
N="${N:-3}"; TOTAL="${TOTAL:-7200}"; BLOCK="${BLOCK:-300}"; OUT="${OUT:-build/frames}"
mkdir -p "$OUT" build/logs
seq 0 "$BLOCK" $((TOTAL - 1)) | xargs -P "$N" -I{} sh -c \
  'e=$(( {} + '"$BLOCK"' )); [ $e -gt '"$TOTAL"' ] && e='"$TOTAL"'; node tools/render.mjs --start {} --end $e --out '"$OUT"' --log build/logs/bloco_{}.log >> build/logs/render_stdout.log 2>&1'
echo "RENDER_CONCLUIDO $(ls "$OUT" | wc -l) quadros" >> build/logs/render_stdout.log
