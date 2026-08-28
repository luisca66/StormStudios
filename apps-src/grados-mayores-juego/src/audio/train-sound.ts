// train-sound.ts — El bed del viaje.
// La grabación sigue la velocidad real del tren mediante playbackRate y volumen;
// no añadimos golpes ni capas sintetizadas por encima del asset entregado por Luis.
//
// Es el ÚNICO sfx que pasa por WebAudio (`ensureEffects` le cuelga el eco del túnel),
// y eso obliga a `crossOrigin = "anonymous"`: un elemento remoto sin CORS no lanza
// error al enchufarlo — `createMediaElementSource` devuelve silencio, que es peor.
// El atributo va ANTES del `src`, o la carga arranca sin él.

import { sfxUrl } from "@/audio/samples";

const TRAIN_SOUND_URL = sfxUrl("smooth_train_sound.mp3");

export class TrainSound {
  private readonly audio = new Audio();
  private masterVolume = 0.8;
  private duck = 1;
  private active = false;
  private context: AudioContext | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private feedbackGain: GainNode | null = null;

  constructor() {
    this.audio.crossOrigin = "anonymous";
    this.audio.src = TRAIN_SOUND_URL;
    this.audio.loop = true;
    this.audio.preload = "auto";
  }

  start(volume: number): void {
    this.ensureEffects();
    void this.context?.resume();
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.active = true;
    this.audio.currentTime = 0;
    this.audio.volume = 0;
    void this.audio.play().catch(() => {
      // Un navegador puede rechazar audio hasta otro gesto; resume() lo reintenta.
    });
  }

  update(speed: number, referenceSpeed: number): void {
    if (!this.active) return;
    const motion = Math.max(0, Math.min(1, speed / Math.max(1, referenceSpeed)));
    this.audio.playbackRate = Math.max(0.7, Math.min(1.55, speed / 11));
    this.audio.volume = this.masterVolume * (0.18 + motion * 0.62) * this.duck;
  }

  /**
   * Regla de silencio pedagógica (PLAN §2.10): mientras hay pregunta viva el bed del
   * tren se agacha para que la nota NUNCA suene tapada. 1 = normal.
   */
  setDuck(level: number): void {
    this.duck = Math.max(0, Math.min(1, level));
  }

  /**
   * Clunk de aguja: transitorio metálico del cambio de vía. Como la bocina, es ruido
   * filtrado y no un oscilador — regla §2.10: nada fuera del material pedagógico puede
   * tener altura reconocible.
   */
  playClunk(): void {
    if (this.masterVolume <= 0.001) return;
    this.ensureEffects();
    const context = this.context;
    if (!context) return;
    void context.resume();

    const now = context.currentTime;
    const duration = 0.22;
    const frames = Math.ceil(context.sampleRate * duration);
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const data = buffer.getChannelData(0);
    // Ruido con caída exponencial rápida: el golpe seco del espadín al asentar.
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (frames * 0.16));
    }
    const noise = context.createBufferSource();
    noise.buffer = buffer;

    const band = context.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1750;
    band.Q.value = 2.4;

    const gain = context.createGain();
    gain.gain.setValueAtTime(Math.max(0.0002, this.masterVolume * 0.55), now);
    gain.gain.exponentialRampToValueAtTime(0.0002, now + duration);

    noise.connect(band).connect(gain).connect(context.destination);
    noise.start(now);
    noise.stop(now + duration + 0.02);
  }

  pause(): void {
    this.audio.pause();
  }

  resume(): void {
    if (!this.active) return;
    void this.audio.play().catch(() => {});
  }

  stop(): void {
    this.active = false;
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /** Reverb corta de túnel aplicada al mismo asset; no añade otro SFX. */
  setTunnel(amount: number): void {
    if (!this.context || !this.dryGain || !this.wetGain || !this.feedbackGain) return;
    const t = Math.max(0, Math.min(1, amount));
    const now = this.context.currentTime;
    this.dryGain.gain.setTargetAtTime(1 - t * 0.18, now, 0.08);
    this.wetGain.gain.setTargetAtTime(t * 0.32, now, 0.08);
    this.feedbackGain.gain.setTargetAtTime(0.16 + t * 0.18, now, 0.08);
  }

  /**
   * Bocina del tren de carga que se cruza (PLAN §5.6). Regla §2.10: NADA fuera del
   * material pedagógico puede tener altura reconocible, así que no es un oscilador sino
   * un cluster de ruido pasado por dos pasabanda desafinados entre sí. El doppler es
   * manual: las frecuencias caen mientras el paneo barre de un lado al otro.
   *
   * @param fromLeft lado por el que aparece el tren cruzado.
   */
  playHorn(fromLeft: boolean, duration = 1.3): void {
    // Con el volumen al mínimo no hay bocina que dar: además una rampa exponencial no
    // admite 0 como destino y lanzaría, tumbando el frame loop entero.
    if (this.masterVolume <= 0.001) return;
    this.ensureEffects();
    const context = this.context;
    if (!context) return;
    void context.resume();

    const now = context.currentTime;
    const noise = context.createBufferSource();
    const frames = Math.ceil(context.sampleRate * duration);
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;

    // Dos pasabanda cercanos pero no armónicos: suena a bocina, no a nota.
    const bandA = context.createBiquadFilter();
    const bandB = context.createBiquadFilter();
    bandA.type = bandB.type = "bandpass";
    bandA.Q.value = 7.5;
    bandB.Q.value = 6;
    bandA.frequency.setValueAtTime(430, now);
    bandB.frequency.setValueAtTime(611, now);
    // Caída de doppler al pasar de largo.
    bandA.frequency.exponentialRampToValueAtTime(320, now + duration);
    bandB.frequency.exponentialRampToValueAtTime(455, now + duration);

    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, this.masterVolume * 0.5), now + 0.09);
    envelope.gain.setTargetAtTime(0.0001, now + duration * 0.45, duration * 0.28);

    noise.connect(bandA).connect(envelope);
    noise.connect(bandB).connect(envelope);

    // Paneo: entra por un lado y sale por el otro.
    if (typeof context.createStereoPanner === "function") {
      const panner = context.createStereoPanner();
      const from = fromLeft ? -0.85 : 0.85;
      panner.pan.setValueAtTime(from, now);
      panner.pan.linearRampToValueAtTime(-from, now + duration);
      envelope.connect(panner).connect(context.destination);
    } else {
      envelope.connect(context.destination);
    }

    noise.start(now);
    noise.stop(now + duration + 0.05);
  }

  /**
   * Campana de estación. Una campana real es INARMÓNICA —sus parciales no forman una
   * serie—, así que se sintetiza con cuatro parciales en razones irracionales: suena a
   * campana y no delata una altura, que es lo que exige §2.10.
   */
  playBell(strikes = 1): void {
    if (this.masterVolume <= 0.001) return;
    this.ensureEffects();
    const context = this.context;
    if (!context) return;
    void context.resume();

    const PARTIALS = [1, 2.76, 5.4, 8.93]; // razones de campana, no armónicos
    for (let s = 0; s < strikes; s++) {
      const at = context.currentTime + s * 1.15;
      for (const ratio of PARTIALS) {
        const osc = context.createOscillator();
        osc.type = "sine";
        osc.frequency.value = 233 * ratio;
        const gain = context.createGain();
        const peak = this.masterVolume * 0.16 / ratio;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0002, at + 3.2 / Math.sqrt(ratio));
        osc.connect(gain).connect(context.destination);
        osc.start(at);
        osc.stop(at + 3.4);
      }
    }
  }

  /** Frenos: ruido agudo filtrado que cae con el tren (§9). */
  playBrakes(duration = 3): void {
    if (this.masterVolume <= 0.001) return;
    this.ensureEffects();
    const context = this.context;
    if (!context) return;
    void context.resume();

    const now = context.currentTime;
    const frames = Math.ceil(context.sampleRate * duration);
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    const noise = context.createBufferSource();
    noise.buffer = buffer;

    const band = context.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 12;
    band.frequency.setValueAtTime(3400, now);
    band.frequency.exponentialRampToValueAtTime(900, now + duration);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, this.masterVolume * 0.22), now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0002, now + duration);

    noise.connect(band).connect(gain).connect(context.destination);
    noise.start(now);
    noise.stop(now + duration + 0.05);
  }

  private ensureEffects(): void {
    if (this.context) return;
    try {
      const context = new AudioContext();
      const source = context.createMediaElementSource(this.audio);
      const dry = context.createGain();
      const wet = context.createGain();
      const delay = context.createDelay(0.4);
      const feedback = context.createGain();
      delay.delayTime.value = 0.115;
      wet.gain.value = 0;
      feedback.gain.value = 0.16;
      source.connect(dry).connect(context.destination);
      source.connect(delay);
      delay.connect(wet).connect(context.destination);
      delay.connect(feedback).connect(delay);
      this.context = context;
      this.dryGain = dry;
      this.wetGain = wet;
      this.feedbackGain = feedback;
    } catch {
      // El elemento de audio conserva su salida directa si WebAudio no está disponible.
    }
  }
}
