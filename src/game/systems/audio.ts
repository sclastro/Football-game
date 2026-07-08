/**
 * Tiny synthesised sound engine using the Web Audio API — no external audio
 * files (keeps the build self-contained and CSP-safe). Must be resumed from a
 * user gesture (the KICK OFF button does this).
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private crowd: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private enabled = true;

  resume() {
    if (!this.ctx) this.init();
    this.ctx?.resume();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (this.crowd) this.crowd.gain.value = on ? 0.04 : 0;
    if (this.master) this.master.gain.value = on ? 0.9 : 0;
  }

  private init() {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);

    // Pre-render a second of white noise for reuse.
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;

    // Quiet looping crowd ambience.
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 550;
    const g = ctx.createGain();
    g.gain.value = this.enabled ? 0.04 : 0;
    src.connect(lp).connect(g).connect(this.master);
    src.start();
    this.crowd = g;
  }

  private noise(duration: number): AudioBufferSourceNode | null {
    if (!this.ctx || !this.noiseBuffer) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.start();
    src.stop(this.ctx.currentTime + duration);
    return src;
  }

  /** A short low thump for a kick. */
  kick() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.enabled) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.5, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.connect(g).connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  /** Referee whistle: two short high tones. */
  whistle() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.enabled) return;
    const blip = (at: number, dur: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(2100, ctx.currentTime + at);
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = 28;
      lfoG.gain.value = 120;
      lfo.connect(lfoG).connect(osc.frequency);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + at + 0.02);
      g.gain.setValueAtTime(0.18, ctx.currentTime + at + dur - 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + dur);
      osc.connect(g).connect(master);
      lfo.start(ctx.currentTime + at);
      osc.start(ctx.currentTime + at);
      lfo.stop(ctx.currentTime + at + dur);
      osc.stop(ctx.currentTime + at + dur);
    };
    blip(0, 0.16);
    blip(0.22, 0.28);
  }

  /** Crowd roar for a goal: a noise swell through a rising bandpass. */
  cheer() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.enabled) return;
    const src = this.noise(1.8);
    if (!src) return;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(400, ctx.currentTime);
    bp.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.5);
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.25);
    g.gain.setValueAtTime(0.5, ctx.currentTime + 1.0);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
    src.connect(bp).connect(g).connect(master);
  }
}

export const audio = new AudioEngine();
