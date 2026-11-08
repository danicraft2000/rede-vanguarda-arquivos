// Exporta os telões e os quadros SVG em PNG (para usar direto nos telões de LED / impressão).
// uso: node tools/exportar_png.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const b = await pw.chromium.launch();
for (const [pasta, w, h] of [['teloes', 1920, 1080], ['vanguarda-especial', 1200, 900]]) {
  const out = path.join(raiz, pasta, 'png');
  fs.mkdirSync(out, { recursive: true });
  const p = await b.newPage({ viewport: { width: w, height: h } });
  for (const f of fs.readdirSync(path.join(raiz, pasta)).filter((x) => x.endsWith('.svg'))) {
    await p.goto('file://' + path.join(raiz, pasta, f));
    await p.screenshot({ path: path.join(out, f.replace('.svg', '.png')) });
    console.log(pasta + '/png/' + f.replace('.svg', '.png'));
  }
  await p.close();
}
await b.close();
