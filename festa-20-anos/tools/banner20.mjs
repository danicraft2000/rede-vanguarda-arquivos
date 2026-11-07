// Gera build/banner_20anos.png a partir do banner original de 18 anos.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // Playwright pré-instalado (global)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srv = await startServer(root);
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => console.error('[page error]', e));
await page.goto(`http://127.0.0.1:${srv.port}/tools/banner20.html`);
await page.waitForFunction(() => window.RESULT, null, { timeout: 30000 });
const r = await page.evaluate(() => window.RESULT);
fs.mkdirSync(path.join(root, 'build'), { recursive: true });
fs.writeFileSync(path.join(root, 'build/banner_20anos.png'), Buffer.from(r.png.split(',')[1], 'base64'));
console.log('banner_20anos.png ok', { size: r.size.toFixed(2), largura: r.inkW.toFixed(1) });
await browser.close(); srv.close();
