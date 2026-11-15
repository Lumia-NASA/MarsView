// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const script = readFileSync('aresnav-mars-main/frontend/speech.js', 'utf8');
let voice: any;
let instances: any[];
const reply = () => ({ ok: true, headers: new Headers({ 'content-type': 'audio/mpeg' }), blob: async () => new Blob(['audio']) });
beforeEach(() => {
  localStorage.clear(); instances = [];
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.stubGlobal('Audio', class {
    play = vi.fn(async () => {}); pause = vi.fn(); load = vi.fn(); removeAttribute = vi.fn();
    onended: any; onerror: any;
    constructor(public src: string) { instances.push(this); }
  });
  vi.stubGlobal('fetch', vi.fn(async () => reply()));
  URL.createObjectURL = vi.fn(() => 'blob:voice'); URL.revokeObjectURL = vi.fn();
  new Function(script)(); voice = (window as any).MarsVoice;
});
afterEach(() => { voice.stop(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('dashboard natural voice playback', () => {
  it('preserves decimal values and lets the neural voice handle complete sentences', async () => {
    await voice.speak('Slope **11.5** degrees. Reserve: 30%.');
    expect(JSON.parse((fetch as any).mock.calls[0][1].body).text).toBe('Slope 11.5 degrees. Reserve: 30%.');
    expect(instances[0].play).toHaveBeenCalledOnce();
    expect(voice.status).toBe('speaking');
  });
  it('mutes immediately, releases audio and does not request muted speech', async () => {
    await voice.speak('Hello.'); voice.setEnabled(false);
    expect(instances[0].pause).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:voice');
    await voice.speak('Muted.'); expect(fetch).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('marsview-voice')).toBe('off');
  });
  it('never plays an old response after cancellation or a newer request', async () => {
    let resolve: any;
    (fetch as any).mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const old = voice.speak('Old.'); await voice.speak('New.'); resolve(reply()); await old;
    expect(instances).toHaveLength(1);
    expect(voice.status).toBe('speaking');
  });
  it('reports service failure without switching to a robotic browser fallback', async () => {
    (fetch as any).mockResolvedValue({ ok: false });
    await voice.speak('Hello.');
    expect(voice.status).toBe('unavailable'); expect(instances).toHaveLength(0);
  });
  it('handles blocked autoplay and releases the audio URL', async () => {
    vi.stubGlobal('Audio', class {
      play = async () => { throw new DOMException('Blocked', 'NotAllowedError'); };
      pause() {} load() {} removeAttribute() {}
    });
    await voice.speak('Hello.');
    expect(voice.status).toBe('blocked'); expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});
