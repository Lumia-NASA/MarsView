// A fixed upstream URL prevents this route from becoming an open proxy.
export const NASA_WEATHER_URL = 'https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json';

export async function nasaWeather(req, res, next) {
  if (req.url?.split('?')[0] !== '/api/mars-weather') return next();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.writeHead(405).end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  const cancel = () => { if (!res.writableEnded) controller.abort(); };
  res.on('close', cancel);
  try {
    const upstream = await fetch(NASA_WEATHER_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!upstream.ok) throw new Error(`NASA HTTP ${upstream.status}`);
    const data = await upstream.json();
    if (!Array.isArray(data.soles) || !data.soles.length) throw new Error('Missing NASA records');
    if (!res.destroyed) res.writeHead(200).end(JSON.stringify(data));
  } catch {
    if (!res.destroyed) res.writeHead(502).end(JSON.stringify({ error: 'NASA observations are temporarily unavailable.' }));
  } finally {
    clearTimeout(timer);
    res.off('close', cancel);
  }
}
