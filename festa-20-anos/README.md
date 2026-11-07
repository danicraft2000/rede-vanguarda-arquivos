# Daniel 20 Anos — vídeo do projeto da festa (2029)

Vídeo-maquete (sem narração, só textos + música) apresentando o projeto da festa de 20 anos
do Daniel no **Espaço Armazém (Morenos Eventos), Vila Leopoldina — São Paulo**, com o tema
**Rede Vanguarda: objetos da antiguidade e da atualidade**.

- Cenário **3D** (three.js) renderizado quadro a quadro em 1920×1080, 30 qps.
- **Grafismo 2D** animado por cima (títulos de capítulo, cartões com listas, chamadas apontando
  para objetos 3D, relógio dos horários, minimapa da planta, transições com faixas arco-íris).
- Tipografia **ITC Avant Garde Gothic Bold** (com o "A" alternativo `A.alt01`, igual ao banner).
- Cortes no ritmo da trilha: ~99,4 BPM, frases de 6 tempos (3,62 s). A música (80 s) toca
  3 vezes emendada no tempo exato (132 batidas por passagem) para cobrir os 4 minutos.

## Roteiro (66 frases musicais)
| # | Seção | O que mostra |
|---|-------|--------------|
| — | Abertura | anel 3D de 2003 → letras cromadas VAN GUAR DA + "DANIEL 20 ANOS" |
| 01 | Localização | voo aéreo até a fachada + foto real do local |
| 02 | A maquete | vista geral sem telhado com todos os ambientes |
| 03 | Estacionamento | arco-íris no portão, passarela arco-íris, bandeiras/totens 2003 × hoje |
| 04 | Entrada | caixa de presentes + lembrancinhas (mini-fita VHS) |
| 05 | Sala de estar & banheiros | corredor-sala de estar + 4 banheiros temáticos |
| 06 | Vanguarda Especial | os 15 quadros históricos (documentários) |
| 07 | Salão principal | palco com 3 telões (DANIEL · arco-íris · 20 ANOS), mesas com cartão de agradecimento |
| 08–10 | Cardápio | 16h pizza · 18h30 Subway artesanal (fornos alugados) · 20h30 sobremesas |
| 11 | Museu | fitas em tamanho real, arquivo, câmeras cenográficas, CRTs |
| 12 | 1998 | o cone gigante em 3D |
| 13 | 2003 | anel 3D + réplica do estúdio do telejornal das 12h |
| 14 | O futuro | computador cenográfico, IA (holograma), TV do futuro |
| 15 | Atualmente | câmera 4K, PTZ, drone, celular, painel de LED |
| 16 | Espaço Kids | playground |
| — | Resumo + final | cortes rápidos em cada batida, "Te espero na festa!", "Obrigado!" |

## Arquivos que não vão para o Git
A pasta `assets/` fica fora do repositório (fonte comercial, música e imagens de terceiros).
Para renderizar de novo, coloque nela:
```
assets/ITCAvantGardeStd-Bold.ttf
assets/trilha.mp3                      (Trilha de patrocínio Bom Dia Brasil 1998–2019)
assets/banner_18anos.png               (banner original; gera build/banner_20anos.png)
assets/logos/{cone_1998.webp, vanguarda_2003.webp, anel_3d.webp, anel_3d_hd.webp, v_plano.webp, van_guar_da_preto.jpg}
assets/fotos/{fachada.jpg, salao_montagem1..3.jpg, foyer_evento.jpg, estudio_vanguarda_tv.jpg, vinhetas_grade.jpg, vanguarda_especial.jpg}
```

## Como gerar
```bash
npm install                                  # three.js + opentype.js
node tools/banner20.mjs                      # banner "20 ANOS" (já incluído em build/)
node tools/preview.mjs build/preview 0.6     # folhas de contato de cada plano (conferência)
date +%s > build/logs/inicio; N=3 ./tools/render_all.sh   # 7200 quadros (retomável)
./tools/progress.sh                          # quantos quadros já estão prontos
./tools/audio.sh && ./tools/encode.sh        # trilha 3x + MP4 final
```
Precisa do Chromium do Playwright (WebGL por software). Em 4 núcleos: ~1 s por quadro.

## Estrutura
- `src/world/` — modelagem: `layout.js` (planta em metros), `exterior.js`, `interior.js`,
  `hall.js` (salão/palco/buffet), `museum.js` + `props.js` (fitas, câmeras), `logos.js`
  (cone 1998, anel 2003, letras cromadas), `intro.js` (vinheta de abertura).
- `src/gfx/overlay.js` — biblioteca de grafismo 2D. `src/shots.js` — roteiro, câmeras e textos.
- `tools/` — renderização, pré-visualização, áudio e encode.
