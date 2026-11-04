# Remasterização das Vinhetas da Rede Vanguarda (2004)

Acervo de fã: as vinhetas da Rede Vanguarda (São José dos Campos) de 2004,
ampliadas de 480p para 1080p (1440x1080, 4:3) com IA, para preservação.
O material original pertence à Rede Vanguarda; aqui é só preservação de memória da TV.

## Fonte
- `Vinhetas_da_Rede_Vanguarda_-_2004480P.mp4`: 640x480, 29,97 qps, H.264 ~650 kbps, 3min15s.
- Já vem progressivo (quase nenhum quadro entrelaçado), com borda escura de apagamento analógico nas laterais.

## O que foi feito
1. **Corte da borda escura da gravação analógica** (`crop=620:466:13:6`: ~12 px à esquerda,
   ~6 px à direita, 2-3 linhas em cima e embaixo), mantendo praticamente 4:3.
2. **Ampliação 4x com IA**: modelo Real-ESRGAN `realesr-animevideov3` (SRVGGNetCompact),
   rodando em CPU via ONNX Runtime. Ele limpa os blocos de compressão e o borrado
   sem serrilhar as letras. O `realesr-general-x4v3` também foi testado e foi descartado
   porque serrilhava as bordas das letras 3D.
3. **Redução para 1440x1080** (lanczos), H.264 CRF 16, cores BT.709.
4. **Áudio**: o original estava baixo (pico de -6,2 dB). Recebeu +5 dB de ganho
   (pico ~ -1,2 dB), sem compressão nem filtro, para não descaracterizar.

## Como reproduzir
```bash
python3 -m venv venv && venv/bin/pip install onnxruntime onnx numpy
curl -LO https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-animevideov3.pth
venv/bin/python pth2onnx.py realesr-animevideov3.pth realesr-animevideov3.onnx   # não precisa de PyTorch
venv/bin/python upscale_chunks.py realesr-animevideov3.onnx ORIGINAL.mp4 blocos/  # retomável, ~1,8 s/quadro em 4 núcleos
./finalizar.sh ORIGINAL.mp4 blocos/ remaster_1080p.mp4 comparacao_antes_depois.mp4
```
