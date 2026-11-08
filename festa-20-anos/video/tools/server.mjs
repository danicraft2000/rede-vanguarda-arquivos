// Servidor estático mínimo (serve a pasta do projeto do vídeo + assets externos)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const MIME = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ttf':'font/ttf','.otf':'font/otf','.woff2':'font/woff2','.css':'text/css'};
export function startServer(roots, port = 0) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      for (const [prefix, dir] of roots) {
        if (!u.startsWith(prefix)) continue;
        const p = path.join(dir, u.slice(prefix.length));
        if (!p.startsWith(dir)) break;
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          res.writeHead(200, {'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'max-age=3600'});
          fs.createReadStream(p).pipe(res);
          return;
        }
      }
      res.writeHead(404); res.end('404 ' + u);
    });
    srv.listen(port, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}
