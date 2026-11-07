#!/usr/bin/env bash
# Mostra o progresso do render: quadros prontos, porcentagem, velocidade e previsão de término.
cd "$(dirname "$0")/.."
TOTAL="${TOTAL:-7200}"; OUT="${OUT:-build/frames}"
n=$(ls "$OUT" 2>/dev/null | wc -l)
start=$(stat -c %Y build/logs/inicio 2>/dev/null || date +%s); now=$(date +%s); el=$((now - start))
base=$(cat build/logs/inicio_quadros 2>/dev/null || echo 0); feitos=$((n - base))
if [ "$feitos" -gt 0 ]; then rest=$(( (TOTAL - n) * el / feitos )); else rest=0; fi
printf 'QUADROS %d/%d (%d%%) | %.2f quadros/s | decorrido %dm%02ds | faltam ~%dm%02ds\n' "$n" "$TOTAL" $((n * 100 / TOTAL)) "$(awk -v a="$feitos" -v b="$el" 'BEGIN{print (b>0)?a/b:0}')" $((el / 60)) $((el % 60)) $((rest / 60)) $((rest % 60))
