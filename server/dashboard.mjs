import { fork } from 'node:child_process';
import { request } from 'node:http';
import { fileURLToPath } from 'node:url';

export function createDashboard() {
  let child;
  let ready;
  let closed = false;
  const close = () => { closed = true; child?.kill(); };
  process.once('exit', close);

  function start() {
    if (ready) return ready;
    ready = new Promise((resolve, reject) => {
      if (closed) return reject(new Error('Dashboard stopped'));
      child = fork(fileURLToPath(new URL('./dashboard-worker.cjs', import.meta.url)), [], {
        env: { ...process.env, HOST: '127.0.0.1', LOG_LEVEL: 'error' },
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true,
      });
      const worker = child;
      const timer = setTimeout(() => { worker.kill(); reject(new Error('Dashboard startup timeout')); }, 15000);
      worker.once('message', message => {
        if (Number.isInteger(message?.port) && message.port > 0) {
          clearTimeout(timer); resolve(message.port);
        }
      });
      worker.once('error', () => { clearTimeout(timer); ready = undefined; reject(new Error('Dashboard could not start')); });
      worker.once('exit', () => { clearTimeout(timer); ready = undefined; reject(new Error('Dashboard stopped')); });
    });
    return ready;
  }

  function unavailable(res) {
    if (!res.headersSent && !res.destroyed) {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end('Dashboard temporarily unavailable. Please reload to try again.');
    }
  }

  async function middleware(req, res, next) {
    const pathname = req.url?.split('?')[0];
    if (pathname === '/dashboard') {
      res.writeHead(308, { Location: '/dashboard/' + (req.url.includes('?') ? '?' + req.url.split('?').slice(1).join('?') : '') });
      res.end(); return;
    }
    if (!pathname?.startsWith('/dashboard/') && !pathname?.startsWith('/api/v1/')) return next();
    try {
      const port = await start();
      if (res.destroyed) return;
      const headers = { ...req.headers, host: `127.0.0.1:${port}` };
      // Browser requests stay on the public origin. The private hop has no CORS origin.
      delete headers.origin;
      const upstream = request({
        hostname: '127.0.0.1', port,
        path: pathname.startsWith('/dashboard/') ? req.url.slice('/dashboard'.length) : req.url,
        method: req.method, headers,
      }, response => {
        const responseHeaders = { ...response.headers };
        if (responseHeaders.location?.startsWith('/') && !responseHeaders.location.startsWith('/api/'))
          responseHeaders.location = '/dashboard' + responseHeaders.location;
        res.writeHead(response.statusCode || 502, responseHeaders);
        response.pipe(res);
        response.on('error', () => res.destroy());
      });
      upstream.on('error', () => unavailable(res));
      upstream.setTimeout(60000, () => upstream.destroy());
      res.on('close', () => { if (!res.writableEnded) upstream.destroy(); });
      req.pipe(upstream);
    } catch { unavailable(res); }
  }

  return { middleware, close: () => { process.off('exit', close); close(); } };
}
