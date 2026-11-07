// Fotos de teste do mundo 3D: node tools/still.mjs saida.jpg "cam=...&zones=..." [mais pares saida query]
import { createRequire } from 'node:module';
import path from 'node:path'; import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srv = await startServer(root);
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const a = process.argv.slice(2);
for (let i = 0; i < a.length; i += 2) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('[page error]', e));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text().slice(0, 300)); });
  await page.goto(`http://127.0.0.1:${srv.port}/src/index.html?${a[i + 1]}`);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 180000 });
  const t = Number(new URLSearchParams(a[i + 1]).get('t') ?? 3);
  const t0 = Date.now();
  const url = await page.evaluate((f) => window.renderFrame(f, 0.9), Math.round(t * 30));
  fs.writeFileSync(path.resolve(a[i]), Buffer.from(url.split(',')[1], 'base64'));
  console.log(a[i], (Date.now() - t0) + ' ms');
  await page.close();
}
await browser.close(); srv.close();
