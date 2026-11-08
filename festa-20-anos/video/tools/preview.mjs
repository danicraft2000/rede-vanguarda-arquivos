// Prévia: renderiza quadros ou tempos específicos para conferência.
// uso: node tools/preview.mjs <pasta-saida> [--so=cena1,cena2] t=12.5 q=300 cena=local@0.5 ...
import fs from 'node:fs';
import path from 'node:path';
import { abrir } from './navegador.mjs';
const args = process.argv.slice(2);
const saida = args[0];
const so = (args.find((a) => a.startsWith('--so=')) || '').slice(5);
fs.mkdirSync(saida, { recursive: true });
const nav = await abrir({ so });
const roteiro = await nav.page.evaluate('window.ROTEIRO');
for (const a of args.slice(1)) {
  if (a.startsWith('--')) continue;
  let q;
  if (a.startsWith('t=')) q = Math.round(parseFloat(a.slice(2)) * 30);
  else if (a.startsWith('q=')) q = parseInt(a.slice(2));
  else if (a.startsWith('cena=')) {
    const [id, frac] = a.slice(5).split('@');
    const r = roteiro.find((x) => x.id === id);
    q = Math.round((r.ini + (r.fim - r.ini) * parseFloat(frac ?? '0.5')) * 30);
  }
  const t0 = Date.now();
  const buf = await nav.quadro(q, 90);
  const nome = path.join(saida, `q${String(q).padStart(5, '0')}.jpg`);
  fs.writeFileSync(nome, buf);
  console.log(nome, (Date.now() - t0) + 'ms');
}
await nav.fechar();
