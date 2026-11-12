# Agenda Vanguarda: vinheta de 2012 com o visual de 2010

A vinheta do *Agenda Vanguarda* de 2012 refeita com as cores, a câmera e as proporções
das telinhas da versão de 2010. O vídeo de 2010 serve de referência: é o primeiro segundo
da vinheta, 24 quadros. O início do vídeo de 2012 está cortado e **não** foi reconstruído;
o script só restiliza o que existe.
O material original pertence à Rede Vanguarda; aqui é só preservação de memória da TV.

## Fontes
- **Base (2012)**: 1280x720, 25 qps, 177 quadros (7,08 s), com o início cortado.
- **Referência (2010)**: 1280x720, 25 qps, 24 quadros (0,96 s). A imagem útil é 4:3,
  com tarjas pretas nas laterais (x ≈ 156–1122).

## O que muda (e de onde veio cada número)

| | 2012 (original) | 2010 (referência) | o script faz |
|---|---|---|---|
| **Telinhas** | largas, ~1,75:1 | mais "quadradinhas", ~1,35:1 | comprime na horizontal ×0,75 (16:9 → 4:3) |
| **Quadro** | 16:9 cheio | 4:3 com tarjas pretas | 4:3 (960x720) dentro de 1280x720 |
| **Faces das telinhas** | carmim, roxo, índigo, amarelo-oliva; croma mediano 40, L mediano 30 | coral, vermelho fosco, rosa-magenta, malva, roxo escuro; croma 28, L 51 | L e croma casados com as distribuições de 2010; matiz ancorado: carmim→coral, roxo→rosa-magenta, ameixa→malva, índigo→roxo escuro, oliva→dourado |
| **Vidro / fundo** | vidro prateado brilhante, fundo cinza | caixas cinza-azuladas foscas, fundo azul-claro | tira parte do reflexo do vidro (só nas áreas sem cor) e dá aos cinzas o tom de 2010 em cada faixa de brilho |
| **Câmera** | câmera do render 3D | grande-angular, mais solta | câmera livre virtual: balanço (roll ±2,5°), olhar para os lados/para cima (yaw/pitch, homografia de rotação), empurrão lento de zoom, lente com barril e vinheta |

Na **logo final** (a parte parada, encontrada automaticamente), a câmera assenta. A logo não
é comprimida, só centralizada no 4:3, e recebe só 35% da cor, para preservar as cores da
marca. A passagem acontece durante o giro rápido que já existe no vídeo (quadros 111–116).

O zoom é o mínimo necessário para que a rotação e a lente não mostrem bordas (cerca de
1,12–1,18 nas telinhas), e muda devagar para não "respirar" junto com o balanço. A imagem
é renderizada em 2x e reduzida, para não serrilhar com a compressão horizontal. O áudio
de 2012 é copiado sem alteração.

## Como reproduzir
```bash
pip install numpy opencv-python-headless scipy      # + ffmpeg/ffprobe no sistema
python3 estilo_2010.py VINHETA_2012.mp4 REFERENCIA_2010.mp4 Agenda_Vanguarda_2012_estilo_2010.mp4 \
    --cube agenda_vanguarda_2010.cube \
    --comparacao Comparacao_2012_x_estilo_2010.mp4
```
Leva ~1,5 min em 4 núcleos. `--cube` salva a correção de cor como LUT 3D (33³), que pode ser
usada em editores de vídeo (DaVinci, Premiere, Vegas, `ffmpeg -vf lut3d=`).
`--comparacao` gera um vídeo lado a lado (2012 original | estilo 2010).

## Ajustes rápidos (no topo do `estilo_2010.py`)
- `INTENSIDADE_CAMERA`: 0 deixa a câmera original; 1,5 deixa a câmera mais solta, mas corta mais a imagem.
- `COMPRESSAO_TELINHAS`: 0,75 é o 4:3 exato; 0,85 deixa as telinhas um pouco mais largas.
- `LENTE_BARRIL`, `VINHETA`, `VIDRO_FOSCO`, `TOM_FRIO`: aspecto da lente e do vidro.
- `LUT_NA_LOGO`: quanto da cor de 2010 vai para a logo final (0 = cores originais da marca).
- `ANCORAS_MATIZ`: para onde vai cada cor das telinhas (matiz LAB, em graus).
