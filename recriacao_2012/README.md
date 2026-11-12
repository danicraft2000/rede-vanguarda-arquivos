# Recriação das vinhetas da Rede Vanguarda (padrão 2011/2012), sem as telinhas

Acervo de fã para preservação: as quatro vinhetas de programa da Rede Vanguarda no padrão
2011/2012 (Vanguarda Serviço, Vanguarda News, Vanguarda Comunidade e Agenda Vanguarda),
remontadas em 3D **sem a parede de telinhas** que cobria a identidade visual.
O material original pertence à Rede Vanguarda; aqui é só preservação de memória da TV.

Em 2011/2012 as animações de 2003 foram refeitas quase iguais e colocadas dentro das telinhas.
Esta recriação refaz as animações (tomando as de 2003 como guia de movimento e tempo) com as
letras de 2012, em 16:9, 1920x1080, 29,97 qps, e usa o áudio original de cada vinheta.

## Referências usadas
- Vinhetas de 2003 (4:3, sem telinha): `Servi_o.mp4`, `News.mp4`, `Comunidade.mp4`, `Agenda.mp4`.
- Pacote 2012 com telinhas (`lv_0_20261112100546.mp4`) para o visual das letras de 2012.
- Vanguarda News 2012 sem telinha (`lv_0_20261112100717.mp4`), a única que existe: guia do
  News (lasers em neon e final parado em VANews).
- Fonte ITC Avant Garde Gothic Demi. No logo de 2012 o V e o A são os alternativos da fonte:
  V = U+E04F (`V.alt02`) e A = U+E000 (`A.alt01`). A fonte é comercial e **não** está no repositório.

## O que cada vinheta faz
| Vinheta | Duração | Animação |
|---|---|---|
| Vanguarda Serviço | 8,0 s | logo prateado, faixas azuis com ponta de seta cruzando; o V gira e fica vermelho; SER e IÇO entram formando SERVIÇO |
| Vanguarda News | 6,7 s | o N fica vermelho e vira neon; cópias do N em neon (vermelho, magenta, roxo, azul, ciano) crescem e viram lasers; EWS acende; termina parado em VANews **sem** a segunda explosão de lasers do final de 2003 |
| Vanguarda Comunidade | 8,4 s | enxurrada de letras cromadas, letras gigantes passando rente à câmera, D dourado; o logo se monta e COMUNI/DADE saem do D laranja |
| Agenda Vanguarda | 6,6 s | faixas coloridas pintam as letras, forma A / GEN / DA, o VANGUARDA prateado volta com GEN e DA menores por cima |

O News usa V e A normais, como na versão 2012 sem telinha. As outras três usam os alternativos.

## Como reproduzir
```bash
python3 -m venv venv && venv/bin/pip install bpy==5.2.4 numpy scipy pillow OpenEXR
export VG_FONT=/caminho/ITCAvantGardeStd-Demi.ttf
# prévia rápida de alguns quadros
venv/bin/python servico.py -- --preview 0,120,239 --res 960x540 --out previa_servico
# render completo (retomável: pula os PNG que já existem), ~15 s por quadro em 4 núcleos
for n in servico news comunidade agenda; do venv/bin/python $n.py -- --out quadros/$n; done
# vídeo final com o áudio original, compilação e comparação 2003 x 2012
./finalizar_2012.sh quadros audios saida   # audios/servico.mp4, audios/news.mp4 ...
```

## Detalhes técnicos
- `vg_base.py`: letras 3D a partir da fonte (encaixe justo entre letras medido no glifo),
  prata com reflexo de um estúdio gerado em numpy (a câmera vê fundo preto), material por letra
  animável (prata ↔ cor, opacidade), faixas com degradê, tubos de neon seguindo o contorno do glifo,
  render Cycles (CPU, 12 amostras + OpenImageDenoise, motion blur) e brilho do neon feito no pós.
- Cada vinheta é um script com a linha do tempo descrita no topo do arquivo.
