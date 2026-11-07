// Renderiza os quadros do vídeo no Chromium headless (WebGL por software) e grava JPEGs numerados.
// uso: node tools/render.mjs --start 0 --end 7200 [--step 1] [--out build/frames] [--q 0.93] [--log build/progresso_0.log]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const start = +(args.start ?? 0), step = +(args.step ?? 1);
const outDir = path.resolve(root, args.out ?? 'build/frames');
const q = +(args.q ?? 0.93);
const list = args.frames ? args.frames.split(',').map(Number) : null;
const skipExisting = args.resume !== '0';
fs.mkdirSync(outDir, { recursive: true });
const logFile = args.log ? path.resolve(root, args.log) : null;
const log = (s) => { console.log(s); if (logFile) fs.appendFileSync(logFile, s + '\n'); };

const srv = await startServer(root);
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
page.on('pageerror', (e) => console.error('[page error]', e));
await page.goto(`http://127.0.0.1:${srv.port}/src/index.html?msaa=${args.msaa ?? 4}`);
await page.waitForFunction(() => window.READY === true, null, { timeout: 180000 });
const total = await page.evaluate(() => window.TOTAL_FRAMES);
const end = Math.min(+(args.end ?? total), total);
const frames = list ?? Array.from({ length: Math.ceil((end - start) / step) }, (_, i) => start + i * step);

const t0 = Date.now(); let done = 0;
for (const f of frames) {
  const file = path.join(outDir, `f_${String(f).padStart(5, '0')}.jpg`);
  if (skipExisting && !list && fs.existsSync(file) && fs.statSync(file).size > 1000) { done++; continue; }
  const url = await page.evaluate(([f, q]) => window.renderFrame(f, q), [f, q]);
  fs.writeFileSync(file, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
  done++;
  if (done % 10 === 0 || done === frames.length) {
    const el = (Date.now() - t0) / 1000;
    log(`QUADRO ${f} | ${done}/${frames.length} deste lote | ${(el / done).toFixed(2)} s/quadro`);
  }
}
log(`FIM ${start}-${end} em ${((Date.now() - t0) / 1000).toFixed(0)} s`);
await browser.close(); srv.close();
