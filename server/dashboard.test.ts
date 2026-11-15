import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDashboard } from "./dashboard.mjs";

const dashboard = createDashboard();
let server: Server;
let origin: string;
beforeAll(async () => {
  server = createServer((req, res) => { void dashboard.middleware(req, res, () => { res.writeHead(404).end(); }); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing server address');
  origin = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  dashboard.close();
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
});
describe('dashboard integration', () => {
  it('canonicalizes the URL so relative scripts resolve inside the dashboard', async () => {
    const response = await fetch(origin + '/dashboard?view=map', { redirect: 'manual' });
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('/dashboard/?view=map');
  });
  it('serves the actual dashboard and its scripts, including direct reloads', async () => {
    for (const path of ['/dashboard/', '/dashboard/index.html']) {
      const response = await fetch(origin + path);
      expect(response.status).toBe(200);
      expect(await response.text()).toContain('boot.js');
    }
    const response = await fetch(origin + '/dashboard/app.js');
    expect(response.headers.get('content-type')).toContain('javascript');
    expect(await response.text()).toContain('const App');
  }, 20000);
  it('connects to the original backend and keeps landing routes separate', async () => {
    const health = await fetch(origin + '/dashboard/health');
    expect(health.status).toBe(200);
    const status = await fetch(origin + '/api/v1/copilot/status');
    expect(status.status).toBe(200);
    expect(status.headers.get('content-type')).toContain('application/json');
    expect((await fetch(origin + '/api/mars-weather')).status).toBe(404);
  });
});
