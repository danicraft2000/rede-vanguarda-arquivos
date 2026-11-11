# Especial 25 Anos: as vinhetas de aniversário da Rede Vanguarda (2004 a 2028)

Homenagem de fã. Todas as vinhetas comemorativas da Rede Vanguarda (de 1 ano em 2004
até 25 anos em 2028) foram refeitas em **3D de verdade** e juntadas num único vídeo, com
transições e trilha sonora original. O visual lembra trabalho de Blender, After Effects e
Premiere, mas tudo foi feito só com código: as cenas são renderizadas no servidor pelo
three.js, num Chromium sem tela, e montadas pelo ffmpeg. Não precisa de nenhum programa
de edição nem de placa de vídeo.

> As marcas e os logotipos originais pertencem à Rede Vanguarda. Este material é
> recriação de fã, sem fins comerciais, feita para preservar a memória da TV.

## O vídeo

1920x1080, 30 qps, cerca de 3 min 30 s:

| # | Ano | Vinheta | Observação |
|---|-----|---------|------------|
| – | – | Abertura: voo por um túnel com as 25 placas (2004 a 2028) e o título do especial | nova |
| 1 | 2004 | VAN/GUAR/DA cromado azul-gelo com o "1" gigante e "ANO" vazado | recriada da referência |
| 2 | 2005 | Cromado de 2004 com uma fita de luz arco-íris orbitando o "2" | **perdida, releitura** |
| 3 | 2006 | "3" prateado em 3 fatias que giram como um cofre, letras arco-íris (ponte para 2007) | **perdida, releitura** |
| 4 | 2007 | Disco prateado recortado formando o "4", letras em degradê arco-íris | recriada |
| 5 | 2008 | Esfera azul com o nome; fita arco-íris desenhando o "5" | recriada |
| 6 | 2009 | "6" cinza com rastro de 6 cores e selo branco | recriada |
| 7 | 2010 | Painel lilás, faixa roxa diagonal com VANGUARDA | recriada |
| 8 | 2011 | Flor de rosquinhas coloridas sobre vista aérea de avenida (cidade em 3D) | recriada |
| 9 | 2012 | "NOVE ANOS" em placas que viram, com luz arco-íris | recriada |
| 10 | 2013 | "10" em 10 listras brilhantes | recriada |
| 11 | 2014 | Dois "1" cromados com rastros arco-íris | recriada |
| 12 | 2015 | Relógio-roda de cores com "12" | recriada |
| 13 | 2016 | Borboleta arco-íris batendo asas | recriada |
| 14 | 2017 | "14" em degradê com VANGUARDA perolado | recriada |
| 15 | 2018 | "ESPECIAL 15" com bolinhas coloridas | recriada |
| 16 | 2019 | "16" sobre placas translúcidas coloridas | recriada |
| 17 | 2020 | Triângulos coloridos em redemoinho formando o "17" | **releitura pedida** |
| 18 | 2021 | Persianas arco-íris, "18" e "21 DE AGOSTO" | recriada |
| 19 | 2022 | "19" geométrico (magenta, laranja, azul, verde-água) | recriada |
| 20 | 2023 | "20" de triângulos dourados com raios de luz | recriada |
| 21 | 2024 | "V" vazado com redemoinho de triângulos e "21" | recriada |
| 22 | 2025 | "22" prateado em estúdio | recriada |
| 23 | 2026 | "23" listrado sobre azul royal | recriada |
| 24 | 2027 | 24 barras de luz e um "24" de cristal fosco | **inédita, criada do zero** |
| 25 | 2028 | Mosaico de 25 placas (uma por ano), "25" gigante, confete | grande final |
| – | – | Mosaico 5x5 com as 25 vinhetas tocando juntas | nova |
| – | – | Encerramento: logo de 2004 de volta, "25 ANOS" e agradecimento | nova |

Em cada vinheta aparece no canto uma legenda discreta com o ano e a idade.

## Fonte tipográfica

O logotipo usa a **ITC Avant Garde Gothic Std Bold** com dois glifos especiais:

- `A` estilizado: **U+E000** (`A.alt01`)
- `V` estilizado: **U+E04F** (`V.alt02`)

A fonte é comercial e **não está no repositório**. Para renderizar, é preciso ter o arquivo
`.ttf`.

## Como gerar o vídeo

Precisa de Node 18+, Python 3, ffmpeg e o Chromium do Playwright.

```bash
cd vinhetas25
npm install                                     # three.js
pip install fonttools uharfbuzz numpy scipy
mkdir -p build
python3 gerar_fonte.py /caminho/ITCAvantGardeStd-Bold.ttf build/fonte.json
cp /caminho/ITCAvantGardeStd-Bold.ttf build/AvantGarde.ttf   # usada na legenda

node render.js --still "01:1.5,3.5"   # quadros de teste em build/stills/
node render.js                        # todas as cenas -> build/cenas/*.mp4 (retomável)
node render.js --fila 00,11,12 &      # vários processos dividem a fila (arquivos .lock)
python3 trilha.py                     # trilha original -> build/trilha.wav
python3 montar.py --leve 95           # vídeo final (+ versão de ~95 MB)
```

Cada quadro leva de 1,5 a 3 s em CPU (4 núcleos, WebGL por SwiftShader).
O especial completo tem cerca de 6.300 quadros.

## Como funciona

- `roteiro.json`: ordem, duração, legenda e transição de cada cena. É a fonte única dos
  tempos, usada pelo render, pela trilha e pela montagem.
- `web/engine.js`: o motor. Inclui o renderizador físico (PBR), os reflexos de estúdio
  (ambientes com painéis de luz), sombras suaves e o texto 3D letra por letra (com
  kerning da fonte). Faz também a pós-produção: bloom, aberração cromática, vinheta,
  grão de filme e flashes.
- `web/cenas/cNN_ANO.js`: uma cena por arquivo. Cada uma tem uma função `update(t)`
  determinística, então qualquer quadro pode ser renderizado em qualquer ordem.
- `render.js`: abre o Chromium sem tela, chama a cena quadro a quadro e entrega PNGs ao ffmpeg.
- `trilha.py`: música e efeitos sintetizados do zero (pads, arpejos, baixo, bateria,
  sinos FM, whooshes, risers e impactos). Cada vinheta dura 4 compassos e os tempos
  fortes caem no meio das transições. Não usa nenhum som da emissora.
- `montar.py`: monta o mosaico 5x5, encadeia as transições (`xfade`), normaliza o áudio
  (-14 LUFS) e faz o encode final em H.264.
