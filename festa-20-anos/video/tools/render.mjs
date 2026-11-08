// Renderiza um trecho de quadros e envia direto ao ffmpeg (H.264 quase sem perdas).
// uso: node tools/render.mjs <de> <ate(exclusivo)> <saida.mp4> <arquivo-progresso>
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { abrir } from './navegador.mjs';
const [de, ate, saida, prog] = process.argv.slice(2);
const DE = +de, ATE = +ate;
const nav = await abrir();
const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '12', '-pix_fmt', 'yuv420p', '-r', '30', saida], { stdio: ['pipe', 'inherit', 'inherit'] });
const escrever = (b) => new Promise((ok) => { if (!ff.stdin.write(b)) ff.stdin.once('drain', ok); else ok(); });
const t0 = Date.now();
for (let q = DE; q < ATE; q++) {
  const buf = await nav.quadro(q, 94);
  await escrever(buf);
  if ((q - DE) % 5 === 4 || q === ATE - 1) fs.writeFileSync(prog, JSON.stringify({ de: DE, ate: ATE, feitos: q - DE + 1, seg: (Date.now() - t0) / 1000 }));
}
ff.stdin.end();
await new Promise((ok) => ff.on('close', ok));
await nav.fechar();
fs.writeFileSync(prog, JSON.stringify({ de: DE, ate: ATE, feitos: ATE - DE, seg: (Date.now() - t0) / 1000, fim: true }));
