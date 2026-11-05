# Teste de escuta A/B

Use fones fechados ou monitores, num volume fixo e confortável. Não mexa no volume entre as versões.

Diferença de loudness em relação ao original (LU): {'Conservador': 0.0, 'Restauração': 0.0, 'Avançado': 0.0}. Como é < 0,1 LU, não precisa igualar o nível: a comparação é justa (a versão mais alta não leva vantagem).

## 1. Teste cego
`cego_A.wav` a `cego_D.wav` são as 4 versões (original incluído) do trecho 4-34 s, em ordem sorteada e com o mesmo tamanho de arquivo (WAV 16 bits). Ouça todas, anote para cada uma: (1) chiado nos trechos fortes, (2) brilho dos pratos/ataques, (3) ruído musical ou "água" no chiado, (4) grave cheio ou magro, (5) preferência geral. Só depois abra o gabarito.

## 2. Teste alternado (rápido)
- `alternado_forte_original_x_conservador.flac`: 4.2-9.2 s, ordem Original → Conservador → Original → Conservador
- `alternado_forte_original_x_restauracao.flac`: 4.2-9.2 s, ordem Original → Restauração → Original → Restauração
- `alternado_forte_original_x_avancado.flac`: 4.2-9.2 s, ordem Original → Avançado → Original → Avançado
- `alternado_quieto_original_x_conservador.flac`: 12.5-18.5 s, ordem Original → Conservador → Original → Conservador
- `alternado_quieto_original_x_restauracao.flac`: 12.5-18.5 s, ordem Original → Restauração → Original → Restauração
- `alternado_quieto_original_x_avancado.flac`: 12.5-18.5 s, ordem Original → Avançado → Original → Avançado
- `alternado_forte_2_original_x_conservador.flac`: 24.0-30.0 s, ordem Original → Conservador → Original → Conservador
- `alternado_forte_2_original_x_restauracao.flac`: 24.0-30.0 s, ordem Original → Restauração → Original → Restauração
- `alternado_forte_2_original_x_avancado.flac`: 24.0-30.0 s, ordem Original → Avançado → Original → Avançado

## 3. O que foi removido
Os arquivos `*__removido.flac` (pasta dos presets) contêm só o que cada preset tirou. O ideal é ouvir chiado e um "tum" grave muito baixo, sem melodia reconhecível. Se der para cantar a música ouvindo o removido, o preset está tirando música.
