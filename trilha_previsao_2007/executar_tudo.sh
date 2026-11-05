#!/usr/bin/env bash
# Roda as 5 fases em ordem. A música inteira só é processada depois da amostra de 20 s.
set -euo pipefail
cd "$(dirname "$0")"
python3 scripts/01_analise.py          > analise/saida_console.txt
python3 scripts/02_testes_filtros.py   > amostra_20s/saida_console_testes.txt
python3 scripts/03_presets.py amostra  > amostra_20s/saida_console_presets.txt
python3 scripts/04_comparacao.py amostra > amostra_20s/saida_console_comparacao.txt
python3 scripts/03_presets.py completo > presets/saida_console.txt
python3 scripts/04_comparacao.py completo > comparacao/saida_console.txt
python3 scripts/05_master.py "${1:-restauracao}" > master/saida_console.txt
(cd INPUT && sha256sum -c SHA256SUMS)
