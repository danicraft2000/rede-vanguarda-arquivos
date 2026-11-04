"""Amplia um video com Real-ESRGAN (ONNX, CPU) em blocos retomaveis.
uso: upscale_chunks.py MODELO.onnx ENTRADA.mp4 PASTA_SAIDA [frames_por_bloco]
"""
import sys, os, subprocess, time, numpy as np, onnxruntime as ort

model, src, outdir = sys.argv[1:4]
CH = int(sys.argv[4]) if len(sys.argv) > 4 else 300
CROP = 'crop=632:474:4:3'           # remove a borda preta lateral, mantendo 4:3
W, H, S = 632, 474, 4
OUT_W, OUT_H = 1440, 1080
os.makedirs(outdir, exist_ok=True)

nb = int(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets',
    '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', src]).strip())
o = ort.SessionOptions(); o.intra_op_num_threads = 4
o.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
sess = ort.InferenceSession(model, o, providers=['CPUExecutionProvider'])

nchunks = (nb + CH - 1) // CH
print(f'{nb} quadros, {nchunks} blocos', flush=True)
for c in range(nchunks):
    final = f'{outdir}/bloco_{c:03d}.mkv'
    if os.path.exists(final):
        continue
    a, b = c * CH, min(nb, (c + 1) * CH)
    dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', src, '-an', '-vf',
        f'trim=start_frame={a}:end_frame={b},setpts=PTS-STARTPTS,{CROP},'
        'scale=in_color_matrix=bt709:in_range=tv,format=rgb24',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    tmp = final + '.part.mkv'
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
        '-s', f'{W*S}x{H*S}', '-r', '30000/1001', '-i', '-', '-vf',
        f'scale={OUT_W}:{OUT_H}:flags=lanczos:out_color_matrix=bt709:out_range=tv,format=yuv420p',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-tune', 'film',
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
        tmp], stdin=subprocess.PIPE)
    t0, n, prev_in, prev_out = time.time(), 0, None, None
    fsz = W * H * 3
    while True:
        buf = dec.stdout.read(fsz)
        if len(buf) < fsz:
            break
        if prev_in is not None and buf == prev_in:
            out = prev_out                      # quadro identico: reaproveita
        else:
            x = np.frombuffer(buf, np.uint8).reshape(H, W, 3).astype(np.float32) / 255.
            y = sess.run(None, {'input': x.transpose(2, 0, 1)[None]})[0][0]
            out = (np.clip(y.transpose(1, 2, 0), 0, 1) * 255 + .5).astype(np.uint8).tobytes()
        enc.stdin.write(out)
        prev_in, prev_out, n = buf, out, n + 1
    enc.stdin.close(); enc.wait(); dec.wait()
    if n != b - a or enc.returncode != 0:
        sys.exit(f'bloco {c}: esperado {b-a} quadros, obtido {n} (enc={enc.returncode})')
    os.rename(tmp, final)
    dt = time.time() - t0
    print(f'bloco {c+1}/{nchunks} pronto: {n} quadros em {dt:.0f}s ({dt/n:.2f}s/quadro)', flush=True)
print('TUDO PRONTO', flush=True)
