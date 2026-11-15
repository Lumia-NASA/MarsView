import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative, extname, isAbsolute, sep } from 'node:path';
import { nasaWeather } from './nasa-weather.mjs';
import { createDashboard } from './dashboard.mjs';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

async function serveAsset(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    const within = relative(root, file);
    if (within === '..' || within.startsWith('..' + sep) || isAbsolute(within)) {
      res.writeHead(403).end();
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) throw new Error('Not a file');
    res.writeHead(200, {
      'Content-Type': extname(file) === '.mp3' ? 'audio/mpeg' : mime[extname(file)] || 'application/octet-stream',
      'Content-Length': info.size,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    if (req.method === 'HEAD') res.end();
    else createReadStream(file).on('error', () => res.destroy()).pipe(res);
  } catch {
    res.writeHead(404).end('Not found');
  }
}

const port = Number(process.env.PORT || 4173);
const dashboard = createDashboard();
const server = createServer((req, res) => {
  void dashboard.middleware(req, res, () => {
    void nasaWeather(req, res, () => { void serveAsset(req, res); });
  });
}).listen(port, process.env.HOST || '127.0.0.1', () => {
  console.log(`MarsView running on port ${port}`);
});
server.once('close', dashboard.close);
