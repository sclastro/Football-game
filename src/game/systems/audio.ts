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
    const first = !this.ctx;
    if (first) this.init();
    this.ctx?.resume();
    // Ease the crowd in rather than slamming it on with the first click. A bed
    // that appears at full volume the instant you press START reads as a glitch
    // no matter how good the bed itself is.
    if (first) this.fadeCrowdTo(AudioEngine.CROWD_BASE, 1.6);
  }

  private fadeCrowdTo(target: number, seconds: number) {
    const ctx = this.ctx;
    const crowd = this.crowd;
    if (!ctx || !crowd) return;
    crowd.gain.cancelScheduledValues(ctx.currentTime);
    crowd.gain.setValueAtTime(crowd.gain.value, ctx.currentTime);
    crowd.gain.linearRampToValueAtTime(target, ctx.currentTime + seconds);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.fadeCrowdTo(on ? AudioEngine.CROWD_BASE : 0, 0.25);
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

    // Pre-render six seconds of white noise. Longer than the old two seconds so
    // the loop point comes round far less often, and long enough that two
    // sources started at different offsets never line up audibly.
    const buf = ctx.createBuffer(1, ctx.sampleRate * 6, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;

    // Crowd ambience.
    //
    // This used to be white noise through a bandpass at 820 Hz, which is
    // literally the definition of hiss — it snapped on at full volume the
    // instant you pressed START and sounded like radio static. A crowd is
    // almost entirely low-frequency energy that swells and fades, so: filter
    // hard, keep the mid layer to a whisper, and modulate it slowly.
    const crowd = ctx.createGain();
    crowd.gain.value = 0; // faded in by resume(), never snapped on
    crowd.connect(master);
    this.crowd = crowd;

    const layer = (
      freq: number,
      type: BiquadFilterType,
      gain: number,
      offset: number,
      q = 0.5,
    ) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(f).connect(g).connect(crowd);
      // Offsetting each source hides the buffer's loop seam.
      src.start(0, offset);
      return g;
    };

    // Deep body of the crowd — this is nearly all of what you hear.
    layer(300, "lowpass", 0.85, 0);
    // A whisper of mid so it isn't pure rumble. Barely audible on its own.
    layer(700, "lowpass", 0.1, 2.3);

    // Slow breathing: two detuned LFOs so the swell never sounds mechanical.
    const breathe = (rate: number, depth: number) => {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = rate;
      lfoGain.gain.value = depth;
      lfo.connect(lfoGain).connect(crowd.gain);
      lfo.start();
    };
    breathe(0.11, 0.018);
    breathe(0.27, 0.009);
  }

  /** Base level the crowd bed sits at between events. */
  private static readonly CROWD_BASE = 0.055;

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

  /** Short bright blip when you select or take over a player. */
  select() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.enabled) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(760, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1180, ctx.currentTime + 0.07);
    g.gain.setValueAtTime(0.16, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
    osc.connect(g).connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  /** Lighter, higher tap than a shot — used for passes. */
  pass() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.enabled) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.07);
    g.gain.setValueAtTime(0.32, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    osc.connect(g).connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);

    const src = this.noise(0.04);
    if (src) {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 2400;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.16, ctx.currentTime);
      ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      src.connect(bp).connect(ng).connect(master);
    }
  }

  /** Scuffed thud for a tackle or a cut-out pass. */
  intercept() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.enabled) return;
    const src = this.noise(0.16);
    if (!src) return;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1400, ctx.currentTime);
    lp.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.32, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    src.connect(lp).connect(g).connect(master);
  }

  /** The long grass-scrape of a slide going in. */
  slide() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.enabled) return;
    const src = this.noise(0.42);
    if (!src) return;
    // A band that opens and then closes again reads as studs skidding through
    // turf; a flat noise burst just sounds like static.
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.7;
    bp.frequency.setValueAtTime(700, ctx.currentTime);
    bp.frequency.linearRampToValueAtTime(2200, ctx.currentTime + 0.12);
    bp.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.42);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42);
    src.connect(bp).connect(g).connect(master);
  }

  /** Body contact: the thump when a tackle actually connects. */
  tackle() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.enabled) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(46, ctx.currentTime + 0.18);
    g.gain.setValueAtTime(0.4, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(g).connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 0.21);
    this.intercept();
  }

  /** Airy whoosh for a flick over the top. */
  flick() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.enabled) return;
    const src = this.noise(0.3);
    if (!src) return;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.6;
    bp.frequency.setValueAtTime(900, ctx.currentTime);
    bp.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + 0.26);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    src.connect(bp).connect(g).connect(master);
  }

  /** Metallic ring for hitting the post or crossbar. */
  post() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.enabled) return;
    [1180, 1790, 2630].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      const peak = 0.22 / (i + 1);
      g.gain.setValueAtTime(peak, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1 - i * 0.25);
      osc.connect(g).connect(master);
      if (this.reverbSend) g.connect(this.reverbSend);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    });
  }

  /** Crowd "oooh" for a near miss — a short swell that falls away. */
  nearMiss() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.enabled) return;
    const src = this.noise(1.0);
    if (!src) return;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(700, ctx.currentTime);
    bp.frequency.linearRampToValueAtTime(420, ctx.currentTime + 0.9);
    bp.Q.value = 1.1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.34, ctx.currentTime + 0.18);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
    src.connect(bp).connect(g).connect(master);
  }

  /** Disappointed crowd groan — a saved or missed penalty. */
  groan() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.enabled) return;
    const src = this.noise(1.3);
    if (!src) return;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(520, ctx.currentTime);
    lp.frequency.linearRampToValueAtTime(240, ctx.currentTime + 1.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.3);
    src.connect(lp).connect(g).connect(master);
  }

  /**
   * Swell the crowd bed up for a moment (entrance walk-out, penalty tension)
   * and let it settle back to the ambient level.
   */
  swell(peak = 0.16, seconds = 4) {
    const ctx = this.ctx;
    const crowd = this.crowd;
    if (!ctx || !crowd || !this.enabled) return;
    crowd.gain.cancelScheduledValues(ctx.currentTime);
    crowd.gain.setValueAtTime(crowd.gain.value, ctx.currentTime);
    crowd.gain.linearRampToValueAtTime(peak, ctx.currentTime + seconds * 0.4);
    crowd.gain.linearRampToValueAtTime(
      AudioEngine.CROWD_BASE,
      ctx.currentTime + seconds,
    );
  }

  /**
   * A small, unprompted lift in the crowd — the murmur that runs round a ground
   * when something nearly happens. Called on a loose timer during play so the
   * stadium never sits at one flat level.
   */
  murmur() {
    this.swell(AudioEngine.CROWD_BASE + 0.03 + Math.random() * 0.03, 2.5 + Math.random() * 2);
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
