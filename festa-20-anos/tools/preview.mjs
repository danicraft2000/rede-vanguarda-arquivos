// Pré-visualização: renderiza quadros em pontos de cada plano (fração u) e monta folhas de contato.
// uso: node tools/preview.mjs saida_dir [u=0.6] [planoInicial] [planoFinal]
import { createRequire } from 'node:module';
import path from 'node:path'; import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { startServer } from './serve.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [out = 'build/preview', uArg = '0.6', s0 = '0', s1 = '999'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const srv = await startServer(root);
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('[page error]', e));
page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text().slice(0, 300)); });
await page.goto(`http://127.0.0.1:${srv.port}/src/index.html`);
await page.waitForFunction(() => window.READY === true, null, { timeout: 180000 });
const shots = await page.evaluate(() => window.SHOTS.map((s) => ({ sec: s.sec, t0: s.t0, t1: s.t1 })));
const us = uArg.split(',').map(Number);
const files = [];
for (let i = +s0; i < Math.min(shots.length, +s1 + 1); i++) for (const u of us) {
  const s = shots[i], f = Math.round((s.t0 + (s.t1 - s.t0) * u) * 30);
  const url = await page.evaluate((f) => window.renderFrame(f, 0.85), f);
  const file = path.join(out, `p${String(i).padStart(2, '0')}_${s.sec}_${Math.round(u * 100)}.jpg`);
  fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64')); files.push(file);
  console.log(file, (f / 30).toFixed(2) + 's');
}
await browser.close(); srv.close();
for (let k = 0; k < files.length; k += 4) execSync(`montage ${files.slice(k, k + 4).join(' ')} -tile 2x2 -geometry 960x540+3+3 ${path.join(out, `sheet_${String(k / 4).padStart(2, '0')}.jpg`)}`);
