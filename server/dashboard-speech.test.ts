import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
const require = createRequire(import.meta.url);
const Fastify = require('../aresnav-mars-main/backend/node_modules/fastify');
const { registerSpeech, VOICE } = require('../aresnav-mars-main/backend/speech.js');
const apps: any[] = [];
function setup(generate: (text: string) => Promise<Buffer>, now?: () => number) {
  const app = Fastify(); apps.push(app); registerSpeech(app, { generate, now }); return app;
}
afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())); });
describe('natural speech endpoint', () => {
  it('returns MP3 and reuses repeated phrases without retaining browser cache', async () => {
    const generate = vi.fn(async () => Buffer.from('mp3-audio'));
    const app = setup(generate);
    for (let i = 0; i < 2; i++) {
      const r = await app.inject({ method: 'POST', url: '/api/v1/speech', payload: { text: 'Hello Mars.' } });
      expect(r.statusCode).toBe(200);
      expect(r.headers['content-type']).toBe('audio/mpeg');
      expect(r.headers['cache-control']).toBe('no-store');
      expect(r.headers['x-marsview-voice']).toBe(VOICE);
      expect(r.rawPayload.toString()).toBe('mp3-audio');
    }
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it('rejects missing, empty, whitespace-only and oversized text before synthesis', async () => {
    const generate = vi.fn(); const app = setup(generate);
    for (const payload of [{}, { text: '' }, { text: '  ' }, { text: 'a'.repeat(4001) }]) {
      expect((await app.inject({ method: 'POST', url: '/api/v1/speech', payload })).statusCode).toBe(400);
    }
    expect(generate).not.toHaveBeenCalled();
  });
  it('does not cache failures or expose provider errors', async () => {
    const generate = vi.fn().mockRejectedValueOnce(new Error('private provider details')).mockResolvedValue(Buffer.from('audio'));
    const app = setup(generate);
    const options = { method: 'POST', url: '/api/v1/speech', payload: { text: 'Hello.' } };
    const failure = await app.inject(options);
    expect(failure.statusCode).toBe(503);
    expect(failure.body).not.toContain('private provider details');
    expect((await app.inject(options)).statusCode).toBe(200);
  });
  it('expires stored audio after ten minutes', async () => {
    let time = 0;
    const generate = vi.fn(async () => Buffer.from('audio')); const app = setup(generate, () => time);
    const options = { method: 'POST', url: '/api/v1/speech', payload: { text: 'Hello.' } };
    await app.inject(options); time = 600001; await app.inject(options);
    expect(generate).toHaveBeenCalledTimes(2);
  });
  it('bounds concurrent synthesis and shares work for duplicate text', async () => {
    const resolvers: Array<(audio: Buffer) => void> = [];
    const generate = vi.fn(() => new Promise<Buffer>(resolve => resolvers.push(resolve)));
    const app = setup(generate); await app.ready();
    const post = (text: string) => app.inject({ method: 'POST', url: '/api/v1/speech', payload: { text } });
    const requests = ['one', 'two', 'three', 'one'].map(text => Promise.resolve(post(text)));
    await vi.waitFor(() => expect(generate).toHaveBeenCalledTimes(3));
    expect((await post('four')).statusCode).toBe(429);
    resolvers.forEach(resolve => resolve(Buffer.from('audio')));
    expect((await Promise.all(requests)).every(r => r.statusCode === 200)).toBe(true);
  });
});
