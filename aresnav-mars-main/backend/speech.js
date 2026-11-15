'use strict';
const { createHash } = require('node:crypto');
const { EdgeTTS } = require('node-edge-tts');

const VOICE = 'en-US-AvaMultilingualNeural';
const MAX_TEXT = 4000;

async function synthesize(text) {
  const tts = new EdgeTTS({
    voice: VOICE, lang: 'en-US', rate: 'default', pitch: 'default',
    outputFormat: 'audio-24khz-96kbitrate-mono-mp3', timeout: 20000,
  });
  const chunks = [];
  let size = 0;
  for await (const chunk of tts.streamAudio(text)) {
    if (!Buffer.isBuffer(chunk)) continue;
    size += chunk.length;
    if (size > 6 * 1024 * 1024) throw new Error('Speech audio too large');
    chunks.push(chunk);
  }
  if (!size) throw new Error('Empty speech audio');
  return Buffer.concat(chunks);
}

// Dependency injection keeps route/error/cache tests independent of the online service.
function registerSpeech(app, { generate = synthesize, now = Date.now } = {}) {
  const cache = new Map(), pending = new Map();
  let cacheBytes = 0;
  function prune() {
    for (const [key, item] of cache) {
      if (now() - item.time > 10 * 60 * 1000) {
        cache.delete(key); cacheBytes -= item.audio.length;
      }
    }
    while (cache.size > 24 || cacheBytes > 12 * 1024 * 1024) {
      const key = cache.keys().next().value;
      cacheBytes -= cache.get(key).audio.length; cache.delete(key);
    }
  }
  app.get('/api/v1/speech/status', async () => ({ provider: 'edge-tts', voice: VOICE, language: 'en-US', requiresInternet: true }));
  app.post('/api/v1/speech', {
    bodyLimit: 20000,
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    schema: { body: {
      type: 'object', required: ['text'], additionalProperties: false,
      properties: { text: { type: 'string', minLength: 1, maxLength: MAX_TEXT } },
    } },
  }, async (request, reply) => {
    const text = request.body.text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();
    reply.header('Cache-Control', 'no-store');
    if (!text) return reply.code(400).send({ error: 'Text is required.' });
    prune();
    const key = createHash('sha256').update(VOICE + '\0' + text).digest('hex');
    const cached = cache.get(key);
    if (!cached && !pending.has(key) && pending.size >= 3)
      return reply.code(429).header('Retry-After', '3').send({ error: 'Voice is busy. Please try again.' });
    try {
      if (!cached && !pending.has(key)) {
        const work = Promise.resolve().then(() => generate(text)).then(audio => {
          if (!Buffer.isBuffer(audio) || !audio.length) throw new Error('Empty speech audio');
          cache.set(key, { audio, time: now() }); cacheBytes += audio.length; prune();
          return audio;
        }).finally(() => pending.delete(key));
        pending.set(key, work);
      }
      const audio = cached?.audio || await pending.get(key);
      return reply.type('audio/mpeg').header('X-MarsView-Voice', VOICE).send(audio);
    } catch {
      // Do not log spoken text or provider connection details.
      return reply.code(503).send({ error: 'Natural voice is temporarily unavailable. The text remains available.' });
    }
  });
}

module.exports = { registerSpeech, VOICE, MAX_TEXT };
