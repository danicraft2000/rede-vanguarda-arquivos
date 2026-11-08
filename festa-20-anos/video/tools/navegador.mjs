// Abre o Chromium headless (WebGL via SwiftShader) com o projeto servido localmente.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { startServer } from './server.mjs';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }

export const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const FESTA = path.resolve(RAIZ, '..');

function pastaFonte() {
  const c = [process.env.AVANT_GARDE_DIR, path.join(FESTA, 'fontes'), path.join(os.homedir(), '.local/share/fonts')];
  for (const d of c) if (d && fs.existsSync(path.join(d, 'ITCAvantGardeStd-Bold.ttf'))) return d;
  throw new Error('Coloque ITCAvantGardeStd-Bold.ttf em festa-20-anos/fontes/ (ou defina AVANT_GARDE_DIR).');
}

export async function abrir({ so = '', log = true } = {}) {
  const { srv, port } = await startServer([
    ['/fontes/', pastaFonte()], ['/svg/', FESTA], ['/ref/', path.join(RAIZ, 'assets/ref')], ['/', RAIZ],
  ]);
  const browser = await pw.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--font-render-hinting=none'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  if (log) {
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('[pagina]', m.text()); });
    page.on('pageerror', (e) => console.error('[erro na pagina]', e.message));
  }
  await page.goto(`http://127.0.0.1:${port}/src/index.html${so ? '?so=' + so : ''}`);
  await page.waitForFunction('window.PRONTO === true', null, { timeout: 600000 });
  const cdp = await page.context().newCDPSession(page);
  const quadro = async (q, qualidade = 92) => {
    await page.evaluate(`renderFrame(${q})`);
    const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: qualidade, optimizeForSpeed: true });
    return Buffer.from(r.data, 'base64');
  };
  const fechar = async () => { await browser.close(); srv.close(); };
  return { page, quadro, fechar };
}
