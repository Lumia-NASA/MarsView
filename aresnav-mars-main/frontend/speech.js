/* ARES natural English voice. All callers share cancellation and mute state. */
(function () {
  'use strict';
  let enabled = true;
  try { enabled = localStorage.getItem('marsview-voice') !== 'off'; } catch {}
  let run = 0, controller = null, player = null, objectUrl = null;
  let status = 'idle';
  const listeners = new Set();
  function publish(value) {
    status = value;
    for (const listener of listeners) listener({ enabled, status });
  }
  function stop() {
    run++;
    controller?.abort(); controller = null;
    if (player) {
      player.onended = null; player.onerror = null;
      player.pause(); player.removeAttribute('src'); player.load(); player = null;
    }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    publish('idle');
  }
  function setEnabled(value) {
    enabled = !!value;
    try { localStorage.setItem('marsview-voice', enabled ? 'on' : 'off'); } catch {}
    if (!enabled) stop();
    else publish('idle');
  }
  // Keep decimals, acronyms and punctuation for the neural model's own prosody.
  function clean(text) {
    return String(text || '').replace(/```[\s\S]*?```/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[*_`#]/g, '').replace(/\s+/g, ' ').trim();
  }
  async function speak(message) {
    stop();
    const text = clean(message);
    if (!enabled || !text || document.hidden) return;
    if (text.length > 4000) { publish('too-long'); return; }
    const current = run;
    controller = new AbortController();
    const request = controller;
    const timeout = setTimeout(() => request.abort(), 25000);
    publish('loading');
    try {
      const base = window.ARESNAV_API != null ? String(window.ARESNAV_API).replace(/\/$/, '') : (location.port === '5183' ? 'http://localhost:3000' : '');
      const response = await fetch(base + '/api/v1/speech', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }), signal: request.signal,
      });
      if (!response.ok || !response.headers.get('content-type')?.includes('audio/mpeg')) throw new Error('Voice unavailable');
      const blob = await response.blob();
      if (current !== run || !enabled || document.hidden) return;
      if (!blob.size) throw new Error('Empty speech audio');
      objectUrl = URL.createObjectURL(blob);
      player = new Audio(objectUrl);
      player.onended = () => { if (current === run) stop(); };
      player.onerror = () => { if (current === run) { stop(); publish('unavailable'); } };
      await player.play();
      if (current === run) publish('speaking');
    } catch (error) {
      if (current === run) {
        stop();
        publish(error.name === 'NotAllowedError' ? 'blocked' : 'unavailable');
      }
    } finally {
      clearTimeout(timeout);
      if (controller === request) controller = null;
    }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
  window.addEventListener('storage', event => {
    if (event.key === 'marsview-voice') setEnabled(event.newValue !== 'off');
  });
  window.MarsVoice = {
    speak, stop, setEnabled, get enabled() { return enabled; }, get status() { return status; },
    subscribe(listener) { listeners.add(listener); listener({ enabled, status }); return () => listeners.delete(listener); },
  };
})();
