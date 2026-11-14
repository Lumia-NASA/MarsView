// Synthesized Web Audio engine for tactical sci-fi UI feedback (Lusion style)

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = true;
  private listeners: Set<(muted: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("marsview-sound");
      // Default to muted unless previously explicitly unmuted
      this.muted = saved === "on" ? false : true;
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (typeof window !== "undefined") {
      localStorage.setItem("marsview-sound", this.muted ? "off" : "on");
    }
    if (!this.muted) {
      this.initCtx();
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

  /** Subtle high-frequency micro-click on button/link hover */
  public playHover() {
    if (this.muted) return;
    try {
      this.initCtx();
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
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.035);
    } catch {
      // Audio playback fails gracefully
    }
  }

  /** Crisp holographic futuristic confirm tone on click */
  public playClick() {
    if (this.muted) return;
    try {
      this.initCtx();
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
      gain.connect(this.ctx.destination);

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
    if (this.muted) return;
    try {
      this.initCtx();
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
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.31);
    } catch {
      // Audio playback fails gracefully
    }
  }
}

export const sound = new SoundEngine();
