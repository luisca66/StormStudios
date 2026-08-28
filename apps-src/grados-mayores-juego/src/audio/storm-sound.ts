// storm-sound.ts — La tormenta del apartadero, con las pistas separadas que entregó Luis.
//
// `41 Rain.mp3` es la cama de lluvia (84 s, en bucle) y los tres `Thunder Clap` son los
// truenos sueltos. Tenerlos separados permite lo que pidió Luis: que cada relámpago
// coincida con SU trueno.
//
// El detalle que lo hace funcionar: los tres clips tienen ~1 s de entrada ANTES del
// golpe (medido: 1.16 / 0.96 / 0.86 s). Disparar el fogonazo al llamar a play() lo
// adelantaría un segundo entero. Por eso el relámpago espera a que el `currentTime` del
// propio clip alcance su golpe — sincronía garantizada aunque el clip tarde en arrancar.

import { sfxUrl } from "@/audio/samples";

const RAIN_URL = sfxUrl("41 Rain.mp3");

interface ClapSpec {
  url: string;
  /** Segundo EXACTO del golpe dentro del clip (analizado, no estimado). */
  onset: number;
  /** Fuerza relativa del trueno, del pico de su envolvente. */
  strength: number;
}

const CLAPS: ClapSpec[] = [
  { url: sfxUrl("03 Thunder Clap.mp3"), onset: 1.16, strength: 1.0 },
  { url: sfxUrl("04 Thunder Clap.mp3"), onset: 0.96, strength: 1.0 },
  { url: sfxUrl("05 Thunder Clap.mp3"), onset: 0.86, strength: 0.84 },
];

const FADE_IN_S = 0.35;      // la tormenta cae de golpe, como el gris del apartadero
const FADE_OUT_S = 2.0;      // y se va con el color, en los mismos 2 s
const FIRST_CLAP_S = 0.4;    // el desvío se estrena con trueno casi de inmediato
const CLAP_GAP_MIN_S = 3.2;
const CLAP_GAP_MAX_S = 6.5;

interface LiveClap {
  audio: HTMLAudioElement;
  onset: number;
  strength: number;
  flashed: boolean;
}

export class StormSound {
  private readonly rain = new Audio(RAIN_URL);
  private readonly pool = CLAPS.map((c) => ({ spec: c, audio: new Audio(c.url) }));
  private live: LiveClap[] = [];

  private masterVolume = 0.8;
  private level = 0;
  private active = false;
  private untilNextClap = 0;

  constructor() {
    this.rain.loop = true;
    this.rain.preload = "auto";
    this.rain.volume = 0;
    for (const p of this.pool) p.audio.preload = "auto";
  }

  /** Adelanta la descarga: se llama al empezar el viaje, no al fallar. */
  preload(): void {
    this.rain.load();
    for (const p of this.pool) p.audio.load();
  }

  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  start(): void {
    this.active = true;
    this.untilNextClap = FIRST_CLAP_S;
    // La lluvia entra por un punto al azar: dos desvíos seguidos no suenan igual.
    if (this.rain.readyState >= 1 && this.rain.duration > 0) {
      this.rain.currentTime = Math.random() * Math.max(0, this.rain.duration - 5);
    }
    void this.rain.play().catch(() => {
      // Sin gesto de usuario el navegador puede rechazar; el viaje ya lo desbloqueó.
    });
  }

  stop(): void {
    this.active = false;
  }

  private launchClap(): void {
    const pick = this.pool[Math.floor(Math.random() * this.pool.length)];
    // Se clona para que dos truenos puedan solaparse sin cortarse entre sí.
    const audio = pick.audio.cloneNode() as HTMLAudioElement;
    audio.volume = this.masterVolume * this.level;
    void audio.play().catch(() => {});
    this.live.push({
      audio, onset: pick.spec.onset, strength: pick.spec.strength, flashed: false,
    });
  }

  /**
   * Avanza la envolvente y devuelve la FUERZA del trueno cuyo golpe suena AHORA
   * (0 si ninguno). El disparo va por el `currentTime` del clip, no por un temporizador.
   */
  update(dt: number): number {
    const target = this.active ? 1 : 0;
    const rate = this.active ? dt / FADE_IN_S : dt / FADE_OUT_S;
    this.level = target > this.level
      ? Math.min(target, this.level + rate)
      : Math.max(target, this.level - rate);

    this.rain.volume = this.masterVolume * this.level * 0.7;
    if (this.level === 0 && !this.rain.paused) this.rain.pause();

    if (this.active) {
      this.untilNextClap -= dt;
      if (this.untilNextClap <= 0) {
        this.launchClap();
        this.untilNextClap = CLAP_GAP_MIN_S + Math.random() * (CLAP_GAP_MAX_S - CLAP_GAP_MIN_S);
      }
    }

    // Los truenos ya lanzados siguen su curso aunque el desvío termine: la cola de
    // retumbo se apaga con el mismo fundido que la lluvia.
    let flash = 0;
    for (const clap of this.live) {
      clap.audio.volume = this.masterVolume * Math.max(this.level, 0);
      if (!clap.flashed && clap.audio.currentTime >= clap.onset) {
        clap.flashed = true;
        flash = Math.max(flash, clap.strength);
      }
    }
    this.live = this.live.filter((c) => {
      const done = c.audio.ended || (this.level === 0 && c.flashed);
      if (done) { c.audio.pause(); }
      return !done;
    });
    return flash;
  }

  dispose(): void {
    this.active = false;
    this.level = 0;
    this.rain.pause();
    for (const c of this.live) c.audio.pause();
    this.live = [];
  }
}
