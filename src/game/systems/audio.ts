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
    if (this.crowd) this.crowd.gain.value = on ? 0.06 : 0;
    if (this.master) this.master.gain.value = on ? 0.9 : 0;
  }

  private init() {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    this.master = master;

    // Gentle master reverb-ish tail via a short feedback delay: makes the
    // whole mix feel like it's in a big open stadium rather than a dry box.
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.09;
    const fb = ctx.createGain();
    fb.gain.value = 0.22;
    const wet = ctx.createGain();
    wet.gain.value = 0.18;
    delay.connect(fb).connect(delay);
    delay.connect(wet).connect(master);
    this.reverbSend = delay;

    // Pre-render two seconds of white noise for reuse.
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;

    // Crowd ambience: a low rumble layer + a mid murmur layer, each looping,
    // summed into one crowd gain the mute toggle controls.
    const crowd = ctx.createGain();
    crowd.gain.value = this.enabled ? 0.06 : 0;
    crowd.connect(master);
    this.crowd = crowd;

    const layer = (freq: number, type: BiquadFilterType, gain: number) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = 0.6;
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(f).connect(g).connect(crowd);
      src.start();
    };
    layer(240, "lowpass", 0.7); // deep rumble
    layer(820, "bandpass", 0.35); // mid crowd murmur
  }

  private reverbSend: DelayNode | null = null;

  private noise(duration: number): AudioBufferSourceNode | null {
    if (!this.ctx || !this.noiseBuffer) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.start();
    src.stop(this.ctx.currentTime + duration);
    return src;
  }

  /** A punchy kick: a low thump plus a short leathery "thwack" transient. */
  kick() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.enabled) return;

    // Low body thump.
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(190, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(58, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.5, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.connect(g).connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);

    // Leather transient: very short band-passed noise click.
    const src = this.noise(0.06);
    if (src) {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1700;
      bp.Q.value = 0.9;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.35, ctx.currentTime);
      ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      src.connect(bp).connect(ng).connect(master);
    }
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
      if (this.reverbSend) g.connect(this.reverbSend);
      lfo.start(ctx.currentTime + at);
      osc.start(ctx.currentTime + at);
      lfo.stop(ctx.currentTime + at + dur);
      osc.stop(ctx.currentTime + at + dur);
    };
    blip(0, 0.16);
    blip(0.22, 0.28);
  }

  /** Big goal roar: layered noise swell + a low boom, sent to the reverb. */
  cheer() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.enabled) return;

    // Rising bright roar.
    const src = this.noise(2.2);
    if (src) {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(400, ctx.currentTime);
      bp.frequency.linearRampToValueAtTime(1500, ctx.currentTime + 0.6);
      bp.Q.value = 0.7;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.2);
      g.gain.setValueAtTime(0.6, ctx.currentTime + 1.2);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.2);
      src.connect(bp).connect(g).connect(master);
      if (this.reverbSend) g.connect(this.reverbSend);
    }

    // Body layer for weight.
    const body = this.noise(2.0);
    if (body) {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 700;
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(0.0001, ctx.currentTime);
      bg.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.25);
      bg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);
      body.connect(lp).connect(bg).connect(master);
    }

    // Low celebratory boom.
    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.5);
    og.gain.setValueAtTime(0.0001, ctx.currentTime);
    og.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.05);
    og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    osc.connect(og).connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 0.72);
  }
}

export const audio = new AudioEngine();
