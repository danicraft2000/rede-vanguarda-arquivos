#!/usr/bin/env node
// Renderiza as cenas do roteiro com o Chromium sem tela (WebGL via SwiftShader)
// e grava cada cena em build/cenas/<id>.mp4. E retomavel: pula cenas prontas.
//
//   node render.js                      -> todas as cenas que faltam
//   node render.js --so 01,05           -> so essas cenas (refaz)
//   node render.js --still 01:1.5,3,6   -> quadros soltos em build/stills/
//   node render.js --fps 30 --jpeg      -> opcoes
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = __dirname;
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes('--' + k);
const roteiro = JSON.parse(fs.readFileSync(path.join(ROOT, 'roteiro.json'), 'utf8'));
roteiro.cenas = roteiro.cenas.filter((c) => c.tipo !== 'mosaico'); // o mosaico e montado no ffmpeg
const FPS = +opt('fps', roteiro.fps || 30);

const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg' };
function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, resp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { resp.writeHead(404); resp.end(); return; }
      resp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(resp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

async function openPage(port) {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${port}/web/index.html`);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
  return { browser, page };
}

const decode = (dataURL) => Buffer.from(dataURL.slice(dataURL.indexOf(',') + 1), 'base64');

async function renderCena(page, c, wi) {
  const out = path.join(ROOT, `build/cenas/${c.id}.mp4`);
  await page.evaluate(([f, d, info]) => window.V.load(f, d, info), [c.arquivo, c.dur, c]);
  const n = Math.round(c.dur * FPS);
  const tmp = out + '.tmp.mp4';
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '10', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', tmp],
  { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < n; f++) {
    const url = await page.evaluate((tt) => window.V.frame(tt), f / FPS);
    if (!ff.stdin.write(decode(url))) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 60 === 0) console.log(`[w${wi}] ${c.id} ${f}/${n}  ${((Date.now() - t0) / (f + 1)).toFixed(0)} ms/quadro`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  fs.renameSync(tmp, out);
  console.log(`[w${wi}] ${c.id} pronta em ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

async function main() {
  const srv = await serve();
  const port = srv.address().port;
  const { browser, page } = await openPage(port);
  const cenas = roteiro.cenas;

  const still = opt('still', null);
  if (still) {
    fs.mkdirSync(path.join(ROOT, 'build/stills'), { recursive: true });
    for (const spec of still.split(';')) {
      const [id, ts] = spec.split(':');
      const c = cenas.find((x) => x.id === id);
      await page.evaluate(([f, d, info]) => window.V.load(f, d, info), [c.arquivo, c.dur, c]);
      for (const t of ts.split(',').map(Number)) {
        const t0 = Date.now();
        const url = await page.evaluate((tt) => window.V.frame(tt), t);
        const out = path.join(ROOT, `build/stills/${id}_${t.toFixed(2)}.png`);
        fs.writeFileSync(out, decode(url));
        console.log(out, (Date.now() - t0) + 'ms');
      }
    }
    await browser.close(); srv.close(); return;
  }

  // --so: refaz so essas cenas. --fila: divide a lista com outros processos (arquivos .lock)
  const so = opt('so', null), fila_ = opt('fila', null);
  let lista = so ? cenas.filter((c) => so.split(',').includes(c.id)) : cenas.filter((c) => (fila_ ? fila_.split(',').includes(c.id) : true) && !fs.existsSync(path.join(ROOT, `build/cenas/${c.id}.mp4`)));
  if (flag('reverso')) lista = lista.reverse();
  const usaLock = !so;
  fs.mkdirSync(path.join(ROOT, 'build/cenas'), { recursive: true });
  const nw = Math.max(1, +opt('workers', 1));
  const pages = [page];
  for (let i = 1; i < nw && i < lista.length; i++) pages.push((await openPage(port)).page);
  const fila = [...lista];
  await Promise.all(pages.map(async (pg, wi) => {
    while (fila.length) {
      const c = fila.shift();
      const lock = path.join(ROOT, `build/cenas/${c.id}.lock`);
      if (usaLock) {
        if (fs.existsSync(path.join(ROOT, `build/cenas/${c.id}.mp4`))) continue;
        try { fs.writeFileSync(lock, String(process.pid), { flag: 'wx' }); } catch { continue; }
      }
      try { await renderCena(pg, c, wi); } finally { if (usaLock) fs.rmSync(lock, { force: true }); }
    }
  }));
  await browser.close(); srv.close();
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
