// One master bus controls the soundtrack and every interface effect.
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambient: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  private loading: Promise<void> | null = null;
  private request: AbortController | null = null;
  private suspendTimer: ReturnType<typeof setTimeout> | null = null;
  private muted = true;
  private unlocked = false;
  private mounted = false;
  private error: string | null = null;
  private listeners = new Set<(muted: boolean) => void>();

  constructor() {
    try {
      this.muted = localStorage.getItem("marsview-sound") !== "on";
    } catch {
      /* Private storage may be unavailable. */
    }
  }

  private canPlay() {
    return !this.muted && this.unlocked && this.mounted && !document.hidden;
  }

  // Mounted once by the shared header, independent of cursor or pointer type.
  public mount() {
    this.mounted = true;
    const gesture = (event: Event) => {
      if (
        event instanceof KeyboardEvent &&
        (event.ctrlKey || event.metaKey || event.altKey)
      )
        return;
      if ((event.target as Element | null)?.closest?.("[data-sound-toggle]"))
        return;
      if (!this.muted) {
        this.unlocked = true;
        this.activate();
      }
    };
    const visibility = () => {
      if (this.canPlay()) this.activate();
      else this.silence();
    };
    document.addEventListener("pointerdown", gesture, { passive: true });
    document.addEventListener("keydown", gesture);
    document.addEventListener("visibilitychange", visibility);
    if (this.canPlay()) this.activate();
    return () => {
      this.mounted = false;
      document.removeEventListener("pointerdown", gesture);
      document.removeEventListener("keydown", gesture);
      document.removeEventListener("visibilitychange", visibility);
      this.silence();
    };
  }

  private activate() {
    if (!this.canPlay()) return;
    if (this.suspendTimer) clearTimeout(this.suspendTimer);
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtx) throw new Error("Web Audio unavailable");
        this.ctx = new AudioCtx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.ctx.destination);
      }
      const ctx = this.ctx;
      const master = this.master!;
      // Resume in the gesture stack, before waiting for the music download.
      void ctx
        .resume()
        .then(() => {
          if (!this.canPlay()) return;
          master.gain.cancelScheduledValues(ctx.currentTime);
          master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
          master.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.7);
        })
        .catch(() => this.fail());
      void this.loadAmbient();
    } catch {
      this.fail();
    }
  }

  private async loadAmbient() {
    if (this.ambient || !this.ctx) return;
    if (this.loading) return this.loading;
    this.loading = (async () => {
      try {
        const ctx = this.ctx!;
        if (!this.buffer) {
          this.request = new AbortController();
          const timer = setTimeout(() => this.request?.abort(), 20000);
          try {
            const response = await fetch("/audio/decoherence-loop.mp3", {
              signal: this.request.signal,
            });
            if (!response.ok) throw new Error("Soundtrack unavailable");
            this.buffer = await ctx.decodeAudioData(
              await response.arrayBuffer(),
            );
          } finally {
            clearTimeout(timer);
          }
        }
        if (!this.canPlay() || ctx.state === "closed") return;
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        source.buffer = this.buffer;
        source.loop = true;
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2.5);
        source.connect(gain);
        gain.connect(this.master!);
        source.start();
        this.ambient = source;
      } catch {
        if (this.mounted) this.fail();
      } finally {
        this.loading = null;
      }
    })();
    await this.loading;
  }

  private silence() {
    if (this.suspendTimer) clearTimeout(this.suspendTimer);
    if (!this.ctx || !this.master || this.ctx.state === "closed") return;
    const ctx = this.ctx;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setValueAtTime(this.master.gain.value, ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
    // Freeze playback while muted/hidden; resume at the same musical position.
    this.suspendTimer = setTimeout(() => {
      if (!this.canPlay() && ctx.state !== "closed")
        void ctx.suspend().catch(() => {});
    }, 100);
  }

  private fail() {
    this.error =
      "Audio could not start. Click to retry music and sound effects.";
    this.muted = true;
    this.silence();
    this.notify();
  }

  public isMuted() {
    return this.muted;
  }
  public getError() {
    return this.error;
  }

  public toggleMute() {
    this.muted = !this.muted;
    this.error = null;
    try {
      localStorage.setItem("marsview-sound", this.muted ? "off" : "on");
    } catch {
      /* Keep session preference. */
    }
    if (this.muted) this.silence();
    else {
      this.unlocked = true;
      this.activate();
      this.playClick();
    }
    this.notify();
    return this.muted;
  }

  public subscribe(cb: (muted: boolean) => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.muted));
  }

  public dispose() {
    this.mounted = false;
    this.request?.abort();
    if (this.suspendTimer) clearTimeout(this.suspendTimer);
    this.ambient?.stop();
    if (this.ctx && this.ctx.state !== "closed")
      void this.ctx.close().catch(() => {});
    this.buffer = null;
    this.listeners.clear();
  }

  /** Subtle high-frequency micro-click on button/link hover */
  public playHover() {
    if (!this.canPlay() || !this.ctx || !this.master) return;
    try {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(1800, t + 0.03);

      gain.gain.setValueAtTime(0.02, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);

      osc.connect(gain);
      gain.connect(this.master);

      osc.start(t);
      osc.stop(t + 0.035);
    } catch {
      // Audio playback fails gracefully
    }
  }

  /** Crisp holographic futuristic confirm tone on click */
  public playClick() {
    if (!this.canPlay() || !this.ctx || !this.master) return;
    try {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(680, t);
      osc1.frequency.exponentialRampToValueAtTime(1360, t + 0.08);

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(1020, t);
      osc2.frequency.exponentialRampToValueAtTime(2040, t + 0.08);

      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.master);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.095);
      osc2.stop(t + 0.095);
    } catch {
      // Audio playback fails gracefully
    }
  }

  /** Deep planetary radar ping when interacting with Mars globe */
  public playGlobePing() {
    if (!this.canPlay() || !this.ctx || !this.master) return;
    try {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(160, t + 0.28);

      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);

      osc.connect(gain);
      gain.connect(this.master);

      osc.start(t);
      osc.stop(t + 0.31);
    } catch {
      // Audio playback fails gracefully
    }
  }
}

export const sound = new SoundEngine();
if (import.meta.hot) import.meta.hot.dispose(() => sound.dispose());
