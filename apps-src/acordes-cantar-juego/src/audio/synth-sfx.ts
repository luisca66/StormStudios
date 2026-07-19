// SFX sintetizados con WebAudio, CERO assets (PLAN §9, patrón synth-sfx de
// Batisfera): rugido del quemador (noise filtrado + sub) y viento por capa.
// Usa el AudioContext ÚNICO compartido (§16). startAmbient(layer) queda como
// stub documentado para la música que producirá Luis (§9).

export class SynthSfx {
  private master: GainNode;
  private burnerGain: GainNode;
  private windGain: GainNode;
  private windFilter: BiquadFilterNode;
  private sub: OscillatorNode | null = null;
  private started = false;

  constructor(private ctx: AudioContext) {
    this.master = ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(ctx.destination);

    this.burnerGain = ctx.createGain();
    this.burnerGain.gain.value = 0;
    this.burnerGain.connect(this.master);

    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = "bandpass";
    this.windFilter.frequency.value = 420;
    this.windFilter.Q.value = 0.6;
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.master);
  }

  /** Llamar tras un gesto (el contexto ya está resumido). */
  start(): void {
    if (this.started) return;
    this.started = true;
    const noiseBuf = makeNoiseBuffer(this.ctx);

    // Viento: loop de ruido por bandpass.
    const windSrc = this.ctx.createBufferSource();
    windSrc.buffer = noiseBuf;
    windSrc.loop = true;
    windSrc.connect(this.windFilter);
    windSrc.start();

    // Quemador: ruido grave filtrado + sub oscilador.
    const burnSrc = this.ctx.createBufferSource();
    burnSrc.buffer = noiseBuf;
    burnSrc.loop = true;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    burnSrc.connect(lp).connect(this.burnerGain);
    burnSrc.start();

    this.sub = this.ctx.createOscillator();
    this.sub.type = "sine";
    this.sub.frequency.value = 52;
    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.5;
    this.sub.connect(subGain).connect(this.burnerGain);
    this.sub.start();
  }

  setVolume(v: number): void {
    this.master.gain.setTargetAtTime(0.7 * v, this.ctx.currentTime, 0.05);
  }

  /** Rugido del quemador según ascenso (0..1). */
  setBurner(intensity: number): void {
    const g = Math.max(0, Math.min(1, intensity)) * 0.5;
    this.burnerGain.gain.setTargetAtTime(g, this.ctx.currentTime, 0.12);
  }

  /** Viento: gana con la altitud y la velocidad (0..1). */
  setWind(level: number): void {
    const l = Math.max(0, Math.min(1, level));
    this.windGain.gain.setTargetAtTime(l * 0.28, this.ctx.currentTime, 0.25);
    this.windFilter.frequency.setTargetAtTime(300 + l * 700, this.ctx.currentTime, 0.3);
  }

  /** Ráfaga corta del quemador (cuerda completada). */
  burnerBurst(): void {
    const t = this.ctx.currentTime;
    this.burnerGain.gain.cancelScheduledValues(t);
    this.burnerGain.gain.setTargetAtTime(0.65, t, 0.03);
    this.burnerGain.gain.setTargetAtTime(0.0, t + 0.7, 0.25);
  }

  /** Chasquido de amarre (F6). */
  click(): void {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(720, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.09);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  /** Silbido de rasgadura (Supervivencia, F8). */
  tear(): void {
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(this.ctx);
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(2600, t);
    bp.frequency.exponentialRampToValueAtTime(700, t + 0.5);
    bp.Q.value = 2.5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.6);
  }

  // Música ambiental por capa: la producirá Luis (PLAN §9). Stub documentado —
  // cuando lleguen las pistas, cargar aquí la lista y hacer crossfade por capa.
  startAmbient(layer: number): void {
    void layer;
  }
}

let sharedNoise: AudioBuffer | null = null;
function makeNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (sharedNoise && sharedNoise.sampleRate === ctx.sampleRate) return sharedNoise;
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  sharedNoise = buf;
  return buf;
}
