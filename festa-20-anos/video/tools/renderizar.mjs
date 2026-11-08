// Renderiza o vídeo inteiro em blocos, com N processos em paralelo, e mostra o progresso.
// uso: node tools/renderizar.mjs <pasta-saida> [processos=3] [tamanho-do-bloco=600]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ } from './navegador.mjs';
const saida = path.resolve(process.argv[2] || path.join(RAIZ, 'saida'));
const N = +(process.argv[3] || 3), BLOCO = +(process.argv[4] || 600);
const TOTAL = 9018;
fs.mkdirSync(path.join(saida, 'blocos'), { recursive: true });
fs.mkdirSync(path.join(saida, 'progresso'), { recursive: true });
const blocos = [];
for (let de = 0, k = 0; de < TOTAL; de += BLOCO, k++) blocos.push({ k, de, ate: Math.min(TOTAL, de + BLOCO) });
const nome = (b) => path.join(saida, 'blocos', `bloco-${String(b.k).padStart(3, '0')}.mp4`);
const prog = (b) => path.join(saida, 'progresso', `bloco-${String(b.k).padStart(3, '0')}.json`);
// retomável: pula blocos já concluídos
const fila = blocos.filter((b) => { try { return !JSON.parse(fs.readFileSync(prog(b))).fim; } catch { return true; } });
console.log(`Total: ${TOTAL} quadros em ${blocos.length} blocos; faltam ${fila.length} blocos; ${N} processos.`);
async function trabalhador(id) {
  while (fila.length) {
    const b = fila.shift();
    await new Promise((ok, erro) => {
      const p = spawn('node', [path.join(RAIZ, 'tools/render.mjs'), b.de, b.ate, nome(b), prog(b)], { stdio: ['ignore', 'inherit', 'pipe'] });
      p.stderr.on('data', (d) => process.stderr.write(`[bloco ${b.k}] ${d}`));
      p.on('close', (c) => (c === 0 ? ok() : erro(new Error(`bloco ${b.k} falhou (${c})`))));
    });
    console.log(`bloco ${b.k} pronto (quadros ${b.de}–${b.ate - 1})`);
  }
}
await Promise.all(Array.from({ length: N }, (_, i) => trabalhador(i)));
fs.writeFileSync(path.join(saida, 'blocos', 'lista.txt'), blocos.map((b) => `file '${nome(b)}'`).join('\n') + '\n');
console.log('RENDER DOS BLOCOS CONCLUÍDO');
