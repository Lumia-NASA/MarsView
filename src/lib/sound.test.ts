// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SoundEngine } from "./sound";

const parameter = () => ({
  value: 0,
  setValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
  cancelScheduledValues: vi.fn(),
});
const gainNode = () => ({ gain: parameter(), connect: vi.fn() });
const bufferNode = () => ({
  buffer: null,
  loop: false,
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
});
class AudioMock {
  state = "suspended";
  currentTime = 10;
  destination = {};
  gains: ReturnType<typeof gainNode>[] = [];
  sources: ReturnType<typeof bufferNode>[] = [];
  createGain() {
    const node = { gain: parameter(), connect: vi.fn() };
    this.gains.push(node);
    return node;
  }
  createBufferSource() {
    const node = {
      buffer: null,
      loop: false,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    this.sources.push(node);
    return node;
  }
  createOscillator() {
    return {
      type: "sine",
      frequency: parameter(),
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  decodeAudioData = vi.fn().mockResolvedValue({ duration: 96 });
  resume = vi.fn(async () => {
    this.state = "running";
  });
  suspend = vi.fn(async () => {
    this.state = "suspended";
  });
  close = vi.fn(async () => {
    this.state = "closed";
  });
}
let ctx: AudioMock;
let engine: SoundEngine;
let unmount: (() => void) | undefined;
const settle = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
  ctx = new AudioMock();
  vi.stubGlobal(
    "AudioContext",
    class {
      constructor() {
        return ctx;
      }
    },
  );
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      }),
  );
  engine = new SoundEngine();
  unmount = engine.mount();
});
afterEach(() => {
  unmount?.();
  engine.dispose();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("shared music and effects control", () => {
  it("loads nothing until enabled and starts one looping source", async () => {
    expect(fetch).not.toHaveBeenCalled();
    engine.toggleMute();
    await settle();
    expect(ctx.sources).toHaveLength(1);
    expect(ctx.sources[0].loop).toBe(true);
    expect(ctx.sources[0].start).toHaveBeenCalledOnce();
    engine.playHover();
    engine.playClick();
    expect(fetch).toHaveBeenCalledOnce();
    expect(
      ctx.gains.every(
        (gain) =>
          gain.connect.mock.calls[0][0] === ctx.gains[0] ||
          gain.connect.mock.calls[0][0] === ctx.destination,
      ),
    ).toBe(true);
  });
  it("mutes the entire bus and resumes the same source without stacking loops", async () => {
    engine.toggleMute();
    await settle();
    engine.toggleMute();
    await vi.advanceTimersByTimeAsync(120);
    expect(ctx.gains[0].gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      0,
      10.08,
    );
    expect(ctx.state).toBe("suspended");
    const gains = ctx.gains.length;
    engine.playClick();
    engine.playHover();
    expect(ctx.gains).toHaveLength(gains);
    engine.toggleMute();
    await settle();
    expect(ctx.state).toBe("running");
    expect(ctx.sources).toHaveLength(1);
  });
  it("does not start a late download after the user muted", async () => {
    let resolve!: (value: Response) => void;
    vi.mocked(fetch).mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }) as Promise<Response>,
    );
    engine.toggleMute();
    engine.toggleMute();
    resolve({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    } as Response);
    await settle();
    expect(ctx.sources).toHaveLength(0);
    engine.toggleMute();
    await settle();
    expect(ctx.sources).toHaveLength(1);
  });
  it("suspends in a hidden tab and preserves the user's mute choice on return", async () => {
    engine.toggleMute();
    await settle();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(120);
    expect(ctx.state).toBe("suspended");
    engine.toggleMute();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(engine.isMuted()).toBe(true);
    expect(ctx.state).toBe("suspended");
  });
  it("allows retry after a failed music download", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    engine.toggleMute();
    await settle();
    expect(engine.isMuted()).toBe(true);
    expect(engine.getError()).toContain("retry");
    engine.toggleMute();
    await settle();
    expect(engine.getError()).toBeNull();
    expect(ctx.sources).toHaveLength(1);
  });
  it("restores enabled preference only after a gesture, including on touch devices", async () => {
    unmount?.();
    engine.dispose();
    localStorage.setItem("marsview-sound", "on");
    ctx = new AudioMock();
    engine = new SoundEngine();
    unmount = engine.mount();
    expect(fetch).not.toHaveBeenCalled();
    document.dispatchEvent(new Event("pointerdown"));
    await settle();
    expect(ctx.sources).toHaveLength(1);
  });
});
