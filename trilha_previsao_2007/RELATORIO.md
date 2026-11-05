# Relatório técnico: restauração da trilha da Previsão (gravação VHS de 2007)

**Arquivo de entrada:** `INPUT/trilhaPrevisao_2007.mp3` (somente leitura; SHA-256 `759c7e5e…70d80`, conferido no início e no fim de cada script)
**Referência auxiliar:** `INPUT/referencia_vinheta_2004-2005.mp3`, outra gravação da mesma música, usada só como guia de comparação e nunca misturada ao sinal
**Master escolhido:** PRESET 2 (Restauração), em `master/`
**Situação:** a validação foi objetiva, com medidas e espectrogramas. **A validação auditiva ainda está pendente.** O kit de escuta A/B está pronto em `comparacao/teste_AB/`. Por isso este relatório não declara a restauração "perfeita" nem "transparente".

---

## 1. Resumo

A gravação está em melhor estado do que se espera de uma VHS: não tem clipping, zumbido de rede nem estalos. Os danos que dominam vêm da cadeia digital posterior, com pelo menos duas gerações de codec com perdas (AAC do app InShot e depois MP3):

- banda cortada em ~10,35 kHz;
- em ~38% dos quadros, nada acima de 3–5 kHz;
- buracos espectrais.

Esses danos **não têm correção honesta**: o que o codec jogou fora não existe mais no arquivo.

Havia dois problemas tratáveis:

1. **Energia subsônica em excesso.** Há um pente de linhas em 9,8 / 19,6 / 29,3 Hz… e +19,5 dB abaixo de 25 Hz em relação à gravação de referência. Foi corrigido com passa-altas de fase zero.
2. **Chiado de fita/transmissão nos agudos.** Ele aparece só nos trechos fortes, quando o codec "abre" a banda, e some nos quietos. Foi atenuado com `afftdn` **só acima de 6 kHz**, num divisor de fase linear. Tudo abaixo disso sai idêntico ao original, inclusive os harmônicos musicais de 4,6–6 kHz.

O resultado no master é uma melhora **pequena e localizada**, coerente com o material:
- −5,8 dB de chiado nos trechos fortes;
- −13,9 dB de subsônico;
- nenhuma alteração mensurável em melodia, ritmo, tonalidade, dinâmica, nível ou duração.

---

## 2. Fase 1: análise (`scripts/01_analise.py` → `analise/`)

| Item | Resultado | Como foi medido |
|---|---|---|
| Codec / bitrate | MP3 MPEG-1 Layer III, **VBR média de 136 kbps** (quadros de 32 a 224 kbps; 1019 quadros a 128 e 655 a 160), joint stereo, encoder Lavc60 (FFmpeg/LAME) | ffprobe + leitura dos cabeçalhos de cada quadro |
| Origem | O container de origem era **M4A** (InShot): VHS → digitalização → AAC → MP3 | tag `major_brand` |
| Taxa de amostragem | **44.100 Hz** | ffprobe |
| Canais | **2, mas é mono duplicado**: correlação L/R de 0,9999975, com o sinal lateral 59 dB abaixo do mid (resíduo do joint stereo) | NumPy |
| Duração | 57,957 s decodificados (2.555.904 amostras); o ffprobe declara 57,992 s porque conta o enchimento do codec | decodificação |
| Níveis | Pico de −11,06 dBFS, true peak de −11,1 dBTP, RMS de −27,3 dBFS, **−23,3 LUFS**, LRA de 16 LU, fator de crista de 16,3 dB, DC 1e-5 | ffmpeg ebur128, NumPy |
| Clipping | **Nenhum**: 0 amostras em fundo de escala, 0 platôs ≥ 4 amostras perto do pico, histograma sem acúmulo no topo (razão 0,37) | NumPy |
| Zumbido 50/60 Hz | **Nenhum confirmado.** As linhas em 60 e 120 Hz (+7 dB sobre o fundo local) acompanham o envelope da música (correlação de 0,6 a 0,7), oscilam ~5 dB e somem no trecho sem música: são graves do arranjo | Welch com 0,67 Hz de resolução + persistência em janelas de 1,5 s |
| Estalos | **Nenhum real.** O detector por resíduo de predição linear (LPC 24, > 9 desvios) achou 2 candidatos: a entrada abrupta da música (3,79 s) e o início de um pulso grave | `analise/estalos_detectados.png` |
| Ruído | Piso de −57,4 dBFS no trecho sem música (fora dos pulsos), concentrado nos graves. Chiado de **−107 dB/Hz em 6,5–10 kHz** nos trechos fortes, com nível quase constante entre os quadros (p50 −107,0 / p90 −105,5 dB/Hz), típico de ruído estacionário, misturado a brilho de pratos | estatística de mínimos na STFT |
| SNR estimada | **~36 dB** (pico da música × ruído) e **~26 dB** (mediana × ruído). A SNR real da fita era menor: os codecs apagaram o ruído fraco quando não havia música | quadros de 50 ms |
| Distorção | Sem indício de saturação analógica (sem platôs, crista normal). A degradação dominante é de codec. Sem uma cópia limpa, não há como medir THD numa música | — |
| Resposta em frequência | Graves cheios até 40 Hz. **−20 dB já em 3,7 kHz** e −40 dB em 6,7 kHz (relativo a 300–1000 Hz). **Corte de codec em 10,35 kHz** | Welch |
| Largura de banda por quadro | 38% dos quadros com conteúdo só até < 5 kHz, 13% até 5–9 kHz, 49% até ~10,3 kHz (o codec liga e desliga os agudos) | `analise/largura_de_banda_por_quadro.png` |
| Graves subsônicos | Pente de linhas a cada 9,8 Hz (grade de 102 ms) durante a música toda, **+19,5 dB em 5–25 Hz e +11,2 dB em 25–40 Hz** em relação à referência 2004-05 | autocorrelação do envelope 20–80 Hz, Welch |
| Pulsos no início (0–3,79 s) | 23 pulsos graves suaves (~8 ms, centroide de 59 Hz, pico de −31 dBFS) numa grade de 102 ms com batidas omitidas e **em fase com a entrada da música** (desvio de 0,06 da grade). Padrão rítmico, provavelmente parte do programa, por isso **não foi removido** | `analise/pulsos_trecho_inicial.png` |
| Comparação com a referência | É a mesma música (croma 0,915), na **mesma tonalidade** (afinação +0,02 × +0,03 semitom), então não há erro de velocidade a corrigir. Equilíbrio tonal parecido entre 90 Hz e 11 kHz (±1,3 dB, exceto +4,8 dB em 2,8–5,6 kHz). Acima de 11 kHz, a cópia 2007 não tem nada | croma CQT (librosa), Welch |

Gráficos: `espectrograma_original.png`, `espectrograma_graves.png`, `espectro_medio_e_ruido.png`, `zumbido_espectro_fino.png`, `estalos_detectados.png`, `pulsos_trecho_inicial.png`, `largura_de_banda_por_quadro.png` e `comparacao_referencia_2004_2005.png`. Todos os números estão em `analise/relatorio_analise.json`.

---

## 3. Fase 2: cada filtro avaliado sozinho (amostra 0–20 s; `scripts/02_testes_filtros.py`)

A amostra de 0–20 s contém o trecho sem música, a entrada da música, um trecho forte com a banda aberta pelo codec (4–11 s) e um trecho quieto (11–20 s). Foram **44 testes**. A tabela completa está em `amostra_20s/testes_filtros.md`, e o áudio de cada teste mais "o que ele removeu" é gerado em `amostra_20s/testes_individuais/` (fora do git, ~130 MB; basta rodar o script de novo).

O que as métricas medem (em dB, comparado ao original):
- **chiado**: energia de 6,5–10 kHz nos trechos fortes;
- **médios**: energia de 200 Hz–4 kHz nos trechos fortes (ideal = 0);
- **quietos**: energia de 1–10 kHz nos trechos quietos (ideal = 0);
- **música/removido**: razão entre a música e o que foi removido em 100 Hz–4 kHz; acima de 30 dB, a música está intacta;
- **ataques**: correlação do fluxo espectral de 4–10 kHz (1 = idêntico);
- **harmônicos**: perda nos picos tonais mais fortes de 4,6–6 kHz e de 6–7,6 kHz;
- **flutuação**: oscilação do chiado quadro a quadro; o original tem 0,88 dB, e subir indica bombeamento.

| Filtro | Intensidades testadas | O que fez | Decisão |
|---|---|---|---|
| `adeclick` | t = 2, 4, 8 | t=4 e t=8 alteram **0 amostras**. t=2 altera 0,04%: falsos positivos em ataques | **Não usado**: não há estalos |
| `adeclip` | t = 10, 5 | **0 amostras** alteradas | **Não usado**: não há clipping (a regra pede clipping confirmado) |
| Notch (SciPy `iirnotch`, fase zero) | 60+120 Hz com Q 30 e 60; 60/120/180/240 Hz com Q 30 | Tira **−0,42 dB do baixo musical** (40–100 Hz) e −0,78 dB do trecho inicial; música/removido cai para 26–41 dB | **Não usado**: não há zumbido, o notch só remove música |
| Passa-altas (SciPy Butterworth, `sosfiltfilt`) | 15/20/25/30/35 Hz em ordem 2, e 20/25/30 Hz em ordem 4 | Ordem 4 a 25 Hz: subsônico −8,1 dB com baixo −0,06 dB. Ordem 2 a 35 Hz já tira −1,2 dB do baixo | **Usado**, ordem 4 (48 dB/oit), de 20 a 30 Hz conforme o preset |
| Prateleira de agudos (FIR de fase linear) | +3 dB em 4–10 kHz | Sobe o chiado em +3 dB junto com o pouco de agudo musical | **Não usado**: a referência não indica perda tonal a compensar |
| `afftdn` na banda inteira | nr 6/10/15/20 com piso rastreado; nr 10 com piso fixo de −80/−70/−60; gs=10 | nr 10: chiado −6,2 dB, ataques 0,984, flutuação 1,62, quietos −0,08 dB. Com gs=10, os quietos perdem −0,96 dB (detalhe) | Rejeitado na banda inteira: mexe nos médios sem necessidade |
| `afftdn` com perfil aprendido em 0,3–3,6 s | nr 10 | Aprende os pulsos graves como "ruído": **baixo −0,54 dB**, e o chiado só −0,65 dB | **Rejeitado** |
| `afftdn` só nos agudos (divisor FIR de fase linear, reconstrução perfeita com erro de 1e-18) | divisor a 3 / 4,5 / 6 kHz; nr 6 a 15; gs 0, 3 e 5 | Médios, graves e quietos: **0,00 dB** em todos. A troca está nos harmônicos: **gs=3 tira −1,7 dB e gs=5 tira −2,5 dB dos harmônicos de 4,6–6 kHz**. Sem gs, com divisor a 6 kHz, esses harmônicos ficam em **0,0 dB** | **Usado**: sem gs, divisor a 6 kHz (4,5 kHz no avançado) |
| `anlmdn` | s = 1e-5, 5e-4, 2e-3, 0,01, 0,05 | Não age no chiado (0,0 dB). Age só nos trechos quietos (−0,4 a −2,75 dB), onde o codec já tinha apagado o ruído: lá ele **removeria detalhe musical** | **Não usado** |
| Calibração (só referência) | `afftdn` nr 40, nf −40 | Chiado −18,5 dB, mas ataques 0,65 e quietos −2,1 dB: é assim que fica um filtro destrutivo, e as métricas detectam | Prova de que as métricas reagem |
| Wiener decision-directed (SciPy, protótipo) | piso = mediana dos quadros abertos; nr 10–15 | Só −0,9 a −1,4 dB de chiado. O codec reescreveu o chiado como coeficientes esparsos e fortes, que o Wiener toma por sinal. O `afftdn`, que estima o ruído por banda, é a ferramenta certa para este material | **Descartado** |

Erros encontrados e corrigidos durante a execução:

1. **Fim zerado.** O `afftdn` tem latência de 1102 amostras e o `anlmdn` de 353. Ao compensar o atraso, os últimos ~25 ms viravam zero. Agora o sinal recebe 1 s de silêncio antes e depois, e o atraso é medido por correlação cruzada.
2. **Início alterado.** O `adeclick` e o `adeclip` modificavam os primeiros 41 ms (aquecimento da janela). O mesmo preenchimento resolveu, e depois disso os dois alteram 0 amostras.
3. **Métrica insensível.** A primeira métrica de "ruído musical" (curtose, e depois ilhas tempo-frequência) não reagia nem ao ajuste destrutivo. Foi trocada pela flutuação do chiado, que reage.
4. **Presets recalibrados.** A primeira versão usava divisor a 4,5 kHz com gs=3 e gs=5. Ao medir os harmônicos de 4,6–7,6 kHz, apareceu uma perda de −1,7 a −2,5 dB, maior do que eu tinha estimado. Os presets foram refeitos (seção 4), e a amostra e a música inteira foram reprocessadas.

---

## 4. Fase 3: presets (`scripts/03_presets.py`)

Todos os presets seguem a mesma cadeia: passa-altas de fase zero, depois divisor de fase linear com `afftdn` aplicado só aos agudos, depois mono repetido nos 2 canais. Não há ganho, normalização, compressão ou limitador.

| Preset | Passa-altas | Divisor | `afftdn` | Objetivo |
|---|---|---|---|---|
| 1. Conservador | 20 Hz, ordem 4 | 6 kHz | `nr=6:nf=-60:tn=1` | Máxima preservação |
| 2. Restauração | 25 Hz, ordem 4 | 6 kHz | `nr=10:nf=-60:tn=1` | Equilíbrio entre limpeza e preservação |
| 3. Avançado | 30 Hz, ordem 4 | 4,5 kHz | `nr=12:nf=-60:tn=1` | Limpeza mais funda, sem gs (que arrastaria os harmônicos) |

Validação na amostra de 20 s (`amostra_20s/comparacao.md`):

| | Conservador | Restauração | Avançado |
|---|---|---|---|
| Chiado (trechos fortes) | −3,71 dB | −5,02 dB | −6,59 dB |
| Subsônico 5–25 Hz (RMS) | −7,5 dB | −13,9 dB | −19,5 dB |
| Baixo 40–100 Hz | −0,01 dB | −0,06 dB | −0,21 dB |
| Médios / quietos | 0,00 / 0,00 | 0,00 / 0,00 | 0,00 / 0,00 |
| Harmônicos 4,6–6 kHz | 0,00 dB | 0,00 dB | −0,88 dB (pior −1,29) |
| Harmônico 6–7,6 kHz | −0,65 dB | −0,76 dB | −1,06 dB |
| Ataques agudos | 0,998 | 0,997 | 0,986 |
| Flutuação do chiado (orig. 0,88 dB) | 1,30 | 1,68 | 1,84 |
| LUFS / pico / amostras | iguais ao original | iguais | iguais |

Como a amostra passou, a música inteira foi processada com os mesmos parâmetros.

---

## 5. Fase 4: comparação na música inteira (`scripts/04_comparacao.py` → `comparacao/`)

| Medida | Original | Conservador | Restauração | Avançado |
|---|---|---|---|---|
| Duração (amostras) | 2.555.904 | 2.555.904 | 2.555.904 | 2.555.904 |
| Pico (dBFS) | −11,06 | −11,09 | −11,10 | −11,09 |
| True peak (dBTP) | −11,1 | −11,1 | −11,1 | −11,1 |
| Loudness (LUFS) | −23,3 | −23,3 | −23,3 | −23,3 |
| LRA (LU) | 16,0 | 16,0 | 16,0 | 16,0 |
| Fator de crista (dB) | 16,25 | 16,22 | 16,21 | 16,22 |
| Faixa dinâmica dos quadros, p95−p10 (dB) | 23,9 | 24,1 | 24,1 | 24,1 |
| Chiado 6,5–10 kHz, trechos fortes (dB/Hz) | −106,0 | −110,2 | −111,8 | −113,7 |
| Subsônico 5–25 Hz (dBFS RMS) | −58,9 | −66,4 | −72,8 | −78,5 |
| Trecho inicial sem música (dBFS RMS) | −51,1 | −52,1 | −52,5 | −53,0 |
| Removido entre 60 Hz e 4,5 kHz (dBFS) | — | −103 | −95 | −88 |
| Música/removido 100 Hz–4 kHz (dB) | — | 113 | 111 | 76 |
| Ataques agudos preservados | — | 0,997 | 0,994 | 0,980 |
| Harmônicos 4,6–6 kHz | — | 0,0 dB | 0,0 dB | −0,76 dB (pior −1,22) |
| Flutuação do chiado (orig. 1,56 dB) | — | 1,86 | 2,23 | 2,43 |
| Correlação com o original | — | 0,99977 | 0,99962 | 0,99947 |
| Atraso | — | 0 | 0 | 0 |

A faixa dinâmica sobe +0,2 dB só porque os quadros mais quietos (o trecho inicial) perdem a energia subsônica. A dinâmica da música não muda: LRA, crista e envelope são iguais.

Gráficos: `espectrogramas_4_versoes.png`, `espectrogramas_removido.png` (o que cada preset tirou), `espectro_medio_diferencas.png` (0 dB = intocado), `zoom_chiado_trecho_forte.png` e `envelope_e_diferenca.png`.

**Escuta A/B:** não consigo ouvir áudio. Por isso não afirmo nada sobre como as versões *soam*. Preparei o kit em `comparacao/teste_AB/` (instruções em `COMO_OUVIR.md`):
- **teste cego**: 4 versões do trecho de 4–34 s com letras sorteadas, todas em WAV 16 bits do mesmo tamanho, para que o tamanho do arquivo não entregue o original;
- **teste alternado**: Original → Preset → Original → Preset, em três trechos;
- **arquivos `*__removido.flac`** em `presets/`.

A diferença de loudness entre as versões é de 0,0 LU, então a comparação é justa sem ajustar o volume.

---

## 6. Fase 5: master final (`scripts/05_master.py` → `master/`)

| Arquivo | Formato | Conferência |
|---|---|---|
| `trilhaPrevisao_2007_restaurada.wav` | PCM 24 bits, 44.100 Hz, 2 canais (L = R) | 2.555.904 amostras, igual ao original. Erro de quantização ≤ 1,2e-7. Pico −11,1 dBFS, −23,3 LUFS |
| `trilhaPrevisao_2007_restaurada_320k.mp3` | MP3 CBR 320 kbps, LAME com `compression_level 0`, 44.100 Hz, 2 canais | Decodifica com 2.555.904 amostras e atraso 0 (gapless). Diferença em relação ao WAV: −103 dBFS RMS. True peak −11,1 dBTP |

O ganho aplicado é 0 dB, e o nível original foi mantido de propósito: subir o volume não melhora a gravação e só deixaria o chiado mais alto. Se quiser normalizar para alguma plataforma, faça isso na hora de publicar, sem compressão.

**Por que o Restauração:**
- **Comparado ao Conservador:** corta 1,6 dB a mais de chiado (−5,8 contra −4,2 dB) e o dobro de subsônico. O custo é mínimo: ataques 0,994 contra 0,997, e o harmônico acima de 6 kHz perde −0,76 contra −0,65 dB.
- **Comparado ao Avançado:** este ganha mais 1,9 dB de chiado, mas é o único que tira harmônicos musicais de 4,6–6 kHz (−0,76 dB, pior −1,22). Ele também baixa os ataques para 0,980, tem a maior flutuação do chiado (+0,87 dB sobre o original) e um passa-altas a 30 Hz que já raspa a região de 30–40 Hz.
- **Restauração** é o ponto em que a limpeza ainda não custa detalhe abaixo de 6 kHz.

**Essa escolha ainda depende do teste cego.** Se a escuta preferir outro preset, basta rodar `python3 scripts/05_master.py conservador` (ou `avancado`) para refazer o master.

---

## 7. Artefatos introduzidos (medidos, no master)

- **Agudos acima de 6 kHz mais baixos.** O espectro médio cai de ~3 dB (6–7 kHz) a ~9 dB (9–10 kHz), como mostra `espectro_medio_diferencas.png`. A maior parte disso é o chiado, mas o brilho de pratos ocupa a mesma faixa. Os componentes tonais perdem bem menos: um harmônico de 6–7,6 kHz perdeu −0,76 dB. Em `espectrogramas_removido.png`, além do chiado, aparecem bem fracos alguns ataques de percussão acima de 6 kHz (ataques 0,994). Pode soar um pouco menos "aberto" que o original: verificar na escuta.
- **Bombeamento.** O nível do chiado que sobra oscila mais entre quadros: de 1,56 para 2,23 dB. Esse é o artefato com mais chance de ser audível, como uma "respiração" leve nos agudos dos trechos fortes. **Precisa ser verificado na escuta.**
- **Pré e pós-oscilação do passa-altas de fase zero.** Fica abaixo de 25 Hz, em nível muito baixo. Não deve ser audível.
- **Divisor de 6 kHz.** Não introduz artefato: a reconstrução é perfeita e o erro foi de 1e-18.
- **Nada muda abaixo de 6 kHz**, exceto o subsônico: melodia, harmonia, ritmo, tonalidade e dinâmica são os mesmos. A correlação com o original é de 0,9996, e o atraso é 0.

## 8. Limitações da gravação (não corrigíveis)

- **Banda limitada pelo codec.** Não há nada acima de 10,35 kHz, e em 38% do tempo nada acima de 3–5 kHz. Não fiz upsampling nem "excitação" de agudos: seria inventar frequências.
- **Artefatos de compressão.** O "liga e desliga" dos agudos, os buracos espectrais e a textura "aguada" de baixo bitrate estão na própria forma de onda e não se separam da música sem inventar conteúdo. O chiado que sobra também "liga e desliga" com o codec. A redução diminui o contraste, mas não o elimina.
- **Chiado entre 4,5 e 6 kHz.** No Restauração, não foi tratado de propósito, para não tocar nos harmônicos musicais. Nos trechos fortes, a própria música mascara essa faixa.
- **Mono.** A gravação é mono e continua mono nos 2 canais. Nenhum estéreo foi sintetizado.
- **Pulsos graves rítmicos.** Eles se misturam ao baixo acima de 30 Hz. Só a parte subsônica foi atenuada.
- **Entrada abrupta da música em 3,79 s.** Parece um corte de edição na origem. Foi mantida.
- **Nível baixo.** O original tem −23,3 LUFS e pico de −11 dBFS. Foi mantido.

## 9. Regras do projeto, item a item

1. **Original nunca sobrescrito.** O arquivo está em `INPUT/`, somente leitura, e o SHA-256 é conferido em todos os scripts e no `executar_tudo.sh`.
2. **Melodia, instrumentos, ritmo e tonalidade preservados.** A banda de 25 Hz a 6 kHz não muda, e a duração é idêntica.
3. **Sem IA generativa.** Só filtros clássicos: FFmpeg e SciPy.
4. **Nenhuma frequência inventada.** Nada foi realçado, e nada acima do corte foi sintetizado.
5. **Sem filtros agressivos.** Foram 44 testes de intensidade. Os ajustes destrutivos foram identificados e descartados. A escuta final ainda está pendente.
6. **Mono continua mono.** O mesmo sinal vai nos 2 canais.
7. **Sem upsampling.** A taxa ficou em 44,1 kHz.

## 10. Como reproduzir

```bash
pip install numpy scipy librosa matplotlib soundfile   # e ffmpeg/ffprobe 6.x no sistema
./executar_tudo.sh            # fases 1 a 5 em ordem (a música inteira só depois da amostra)
./executar_tudo.sh avancado   # o mesmo, com outro preset no master
```
Etapa por etapa: `scripts/01_analise.py`, `02_testes_filtros.py`, `03_presets.py amostra`, `04_comparacao.py amostra`, `03_presets.py completo`, `04_comparacao.py completo` e `05_master.py restauracao`.
Ambiente usado: FFmpeg 6.1.1, Python 3, NumPy, SciPy 1.18, librosa 1.0, soundfile 0.14 e matplotlib.
