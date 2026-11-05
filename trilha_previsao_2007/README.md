# Trilha da Previsão: restauração da gravação VHS de 2007

Acervo de fã para preservação. O material original pertence à emissora; aqui estão só a análise e o tratamento sonoro.

**Comece por aqui:**
- Relatório técnico completo: [`RELATORIO.md`](RELATORIO.md)
- Master final (preset Restauração): `master/trilhaPrevisao_2007_restaurada.wav` (PCM 24 bits, 44,1 kHz, 2 canais) e `master/trilhaPrevisao_2007_restaurada_320k.mp3`
- Teste de escuta A/B: `comparacao/teste_AB/COMO_OUVIR.md`

| Pasta | Conteúdo |
|---|---|
| `INPUT/` | Original (somente leitura, `SHA256SUMS`) e a referência 2004-05 |
| `analise/` | Fase 1: `relatorio_analise.json` e espectrogramas |
| `amostra_20s/` | Fase 2 (teste de cada filtro: `testes_filtros.md`) e validação dos 3 presets nos 20 s |
| `presets/` | Fase 3: as 3 versões completas em FLAC 24 bits e o que cada uma removeu |
| `comparacao/` | Fase 4: tabela, espectrogramas e kit A/B (cego e alternado) |
| `master/` | Fase 5: WAV 24 bits e MP3 320 kbps, com `master_info.json` |
| `scripts/` | Código Python (NumPy, SciPy, librosa) e FFmpeg; `executar_tudo.sh` (nesta pasta) roda tudo |

Para reproduzir: `pip install numpy scipy librosa matplotlib soundfile`, ter `ffmpeg`/`ffprobe` instalados e rodar `./executar_tudo.sh`.
