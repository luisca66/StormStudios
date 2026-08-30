// comet-sound.ts — El bed del viaje (PLAN §9), 100 % sintetizado: CERO assets.
//
// El tren tenía traqueteo porque tenía juntas de riel; un cometa no. Lo que se oye aquí
// es lo que un cometa haría: un rumble grave de masa en movimiento y el SISEO del hielo
// sublimando, que es lo que forma la cola. Ambos siguen la velocidad real.
//
// Regla §2.11: nada de esto puede tener altura reconocible. Es ruido filtrado, no
// osciladores afinados — la única altura del mundo es la del material pedagógico.

const RUMBLE_HZ = 46;      // corte del paso-bajo del rumble a velocidad de crucero
const HISS_HZ = 2400;      // centro del paso-banda del siseo de hielo

export class CometSound {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private rumbleFilter: BiquadFilterNode | null = null;
  private rumbleGain: GainNode | null = null;
  private hissGain: GainNode | null = null;
  private noise: AudioBufferSourceNode | null = null;
  private masterVolume = 0.8;
  private duck = 1;
  private active = false;

  /** Un solo AudioContext para todo el módulo de audio sintetizado (PLAN §16). */
  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.context = new Ctor();
    } catch {
      return null;
    }
    return this.context;
  }

  /** Ruido rosa-ish de 2 s en bucle: la fuente de la que salen rumble y siseo. */
  private buildNoiseBuffer(context: AudioContext): AudioBuffer {
    const frames = context.sampleRate * 2;
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const data = buffer.getChannelData(0);
    // Integrador de un polo sobre ruido blanco: da un espectro más "de masa" que el
    // blanco puro, que suena a estática de televisión.
    let last = 0;
    for (let i = 0; i < frames; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    return buffer;
  }

  start(volume: number): void {
    const context = this.ensureContext();
    if (!context) return;
    void context.resume();
    this.masterVolume = Math.max(0, Math.min(1, volume));

    this.stopNodes();

    const noise = context.createBufferSource();
    noise.buffer = this.buildNoiseBuffer(context);
    noise.loop = true;

    // Rama 1: rumble grave (paso-bajo).
    const rumbleFilter = context.createBiquadFilter();
    rumbleFilter.type = "lowpass";
    rumbleFilter.frequency.value = RUMBLE_HZ;
    rumbleFilter.Q.value = 0.7;
    const rumbleGain = context.createGain();
    rumbleGain.gain.value = 0;

    // Rama 2: siseo de hielo (paso-banda agudo).
    const hissFilter = context.createBiquadFilter();
    hissFilter.type = "bandpass";
    hissFilter.frequency.value = HISS_HZ;
    hissFilter.Q.value = 0.6;
    const hissGain = context.createGain();
    hissGain.gain.value = 0;

    const master = context.createGain();
    master.gain.value = 1;

    noise.connect(rumbleFilter).connect(rumbleGain).connect(master);
    noise.connect(hissFilter).connect(hissGain).connect(master);
    master.connect(context.destination);
    noise.start();

    this.noise = noise;
    this.rumbleFilter = rumbleFilter;
    this.rumbleGain = rumbleGain;
    this.hissGain = hissGain;
    this.master = master;
    this.active = true;
  }

  /**
   * Sigue la velocidad real. A más velocidad, el rumble abre su filtro (se siente más
   * cuerpo) y el siseo gana presencia: es la cola creciendo.
   */
  update(speed: number, referenceSpeed: number): void {
    if (!this.active || !this.context) return;
    const motion = Math.max(0, Math.min(1.6, speed / Math.max(1, referenceSpeed)));
    const now = this.context.currentTime;
    const smooth = 0.12; // rampa corta: sin escalones al cambiar de velocidad

    this.rumbleFilter?.frequency.setTargetAtTime(RUMBLE_HZ * (0.6 + 0.7 * motion), now, smooth);
    this.rumbleGain?.gain.setTargetAtTime(
      this.masterVolume * (0.10 + 0.30 * motion) * this.duck, now, smooth,
    );
    this.hissGain?.gain.setTargetAtTime(
      this.masterVolume * (0.012 + 0.055 * motion) * this.duck, now, smooth,
    );
  }

  /**
   * Regla de silencio pedagógica (PLAN §2.11): mientras hay pregunta viva el bed se
   * agacha para que la nota NUNCA suene tapada. 1 = normal.
   */
  setDuck(level: number): void {
    this.duck = Math.max(0, Math.min(1, level));
  }

  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Crujido de hielo: la carlinga viva en las zonas muertas. Ruido con caída rápida y
   * un filtro que baja — sin altura definida (§2.11).
   */
  playIceCrack(strength = 1): void {
    const context = this.ensureContext();
    if (!context || this.masterVolume <= 0.001) return;
    void context.resume();

    const now = context.currentTime;
    const duration = 0.3;
    const frames = Math.ceil(context.sampleRate * duration);
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (frames * 0.12));
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(420, now + duration);
    filter.Q.value = 1.4;
    const gain = context.createGain();
    gain.gain.setValueAtTime(this.masterVolume * 0.16 * strength * this.duck, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(gain).connect(context.destination);
    source.start(now);
    source.stop(now + duration);
  }

  private stopNodes(): void {
    try {
      this.noise?.stop();
    } catch {
      // ya detenido
    }
    this.noise?.disconnect();
    this.master?.disconnect();
    this.noise = null;
    this.master = null;
    this.rumbleFilter = null;
    this.rumbleGain = null;
    this.hissGain = null;
  }

  stop(): void {
    this.active = false;
    this.stopNodes();
  }
}
