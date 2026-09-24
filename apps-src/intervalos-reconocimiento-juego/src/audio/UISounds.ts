import * as Tone from 'tone';

export class UISounds {
  private static synth: Tone.Synth | null = null;
  private static polySynth: Tone.PolySynth | null = null;
  private static launchSynth: Tone.Synth | null = null;
  private static noise: Tone.NoiseSynth | null = null;
  private static boom: Tone.MembraneSynth | null = null;
  private static thrusterNoise: Tone.Noise | null = null;
  private static thrusterGain: Tone.Gain | null = null;
  private static thrusterOn = false;
  private static readonly THRUSTER_LEVEL = 0.05;
  private static readonly THRUSTER_DUCK = 0.012;
  private static initialized = false;

  public static async init() {
    if (this.initialized) return;
    await Tone.start();

    // Configurar sintetizadores
    this.synth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 }
    }).toDestination();
    this.synth.volume.value = -10; // Bajar el volumen un poco para no molestar

    this.polySynth = new Tone.PolySynth().toDestination();
    this.polySynth.volume.value = -10;

    // Whoosh de lanzamiento de misil (barrido de frecuencia)
    this.launchSynth = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.005, decay: 0.05, sustain: 0.4, release: 0.08 }
    }).toDestination();
    this.launchSynth.volume.value = -16;

    // Ruido filtrado para la explosión
    const boomFilter = new Tone.Filter(1400, 'lowpass').toDestination();
    this.noise = new Tone.NoiseSynth({
      noise: { type: 'brown' },
      envelope: { attack: 0.005, decay: 0.35, sustain: 0, release: 0.1 }
    }).connect(boomFilter);
    this.noise.volume.value = -6;

    // Golpe grave de la explosión
    this.boom = new Tone.MembraneSynth({
      pitchDecay: 0.08,
      octaves: 6,
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 }
    }).toDestination();
    this.boom.volume.value = -4;

    // Propulsor de la nave: ruido sin tono (digital), continuo y suave.
    const thrFilter = new Tone.Filter({ type: 'lowpass', frequency: 820, Q: 1 });
    const thrTrem = new Tone.Gain(0.8); // tremolo (modulado por LFO) -> textura digital
    this.thrusterGain = new Tone.Gain(0).toDestination();
    this.thrusterNoise = new Tone.Noise('pink');
    this.thrusterNoise.connect(thrFilter);
    thrFilter.connect(thrTrem);
    thrTrem.connect(this.thrusterGain);
    // Barrido lento del filtro para darle vida.
    const sweep = new Tone.LFO({ frequency: 0.5, min: 560, max: 1050 });
    sweep.connect(thrFilter.frequency);
    sweep.start();
    // Flutter rápido -> carácter digital.
    const flutter = new Tone.LFO({ frequency: 9, min: 0.6, max: 1.0 });
    flutter.connect(thrTrem.gain);
    flutter.start();
    this.thrusterNoise.start();

    this.initialized = true;
  }

  /** Arranca el zumbido del propulsor (suave, continuo). */
  public static startThruster() {
    if (!this.thrusterGain) return;
    this.thrusterOn = true;
    this.thrusterGain.gain.rampTo(this.THRUSTER_LEVEL, 0.4);
  }

  /** Apaga el propulsor. */
  public static stopThruster() {
    if (!this.thrusterGain) return;
    this.thrusterOn = false;
    this.thrusterGain.gain.rampTo(0, 0.3);
  }

  /** Baja el propulsor un momento (p. ej. mientras suena el intervalo) y lo restaura. */
  public static duckThruster(durationMs = 2600) {
    if (!this.thrusterOn || !this.thrusterGain) return;
    const now = Tone.now();
    this.thrusterGain.gain.cancelScheduledValues(now);
    this.thrusterGain.gain.rampTo(this.THRUSTER_DUCK, 0.1);
    this.thrusterGain.gain.rampTo(this.THRUSTER_LEVEL, 0.5, now + durationMs / 1000);
  }

  public static async play(type: 'correct' | 'wrong' | 'win') {
    if (!this.initialized) await this.init();

    if (type === 'correct' && this.synth) {
      this.synth.triggerAttackRelease("C5", "8n");
      setTimeout(() => this.synth?.triggerAttackRelease("E5", "8n"), 120);
      setTimeout(() => this.synth?.triggerAttackRelease("G5", "8n"), 240);
    } else if (type === 'wrong' && this.synth) {
      this.synth.triggerAttackRelease("C3", "4n");
      setTimeout(() => this.synth?.triggerAttackRelease("Gb2", "2n"), 200);
    } else if (type === 'win' && this.polySynth) {
      this.polySynth.triggerAttackRelease(["C4", "E4", "G4", "C5"], "1m");
    }
  }

  /** Whoosh de lanzamiento del misil. */
  public static async playLaunch() {
    if (!this.initialized) await this.init();
    if (!this.launchSynth) return;
    const now = Tone.now();
    this.launchSynth.triggerAttack(160, now);
    this.launchSynth.frequency.exponentialRampToValueAtTime(1100, now + 0.22);
    this.launchSynth.triggerRelease(now + 0.24);
  }

  /** Detonación: golpe grave + ráfaga de ruido. */
  public static async playExplosion(intensity = 1) {
    if (!this.initialized) await this.init();
    const now = Tone.now();
    if (this.boom) this.boom.triggerAttackRelease(intensity > 1.2 ? "C1" : "C2", "8n", now);
    if (this.noise) this.noise.triggerAttackRelease("8n", now);
  }
}
