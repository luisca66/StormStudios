// fireworks-sound.ts — El show de fuegos de la gala (§12), con la pista que entregó
// Luis: `fireworks.mp3`, dos minutos de castillo real grabado de lejos.
//
// Manda el AUDIO, igual que en el apartadero manda el trueno: la grabación no se
// "acompaña" con fuegos, la grabación DISPARA los fuegos. Las 84 detonaciones del clip
// están medidas una a una sobre su envolvente (ventana de 20 ms, pico local ≥ 2× el
// entorno) y de cada una se guarda su segundo exacto y su fuerza relativa.
//
// El truco de sincronía: un cohete tarda 1–3 s en subir, así que la bomba se ENCARGA
// con antelación —`update` mira el `currentTime` del clip y avisa antes— para que el
// fogonazo caiga justo sobre el trueno. Disparar al oír el golpe llegaría tarde
// siempre; es el mismo problema que resolvieron los `onset` de los Thunder Clap, al
// revés.
//
// Nota de §2.10: nada fuera del material pedagógico puede tener altura reconocible. Un
// castillo de fuegos es ruido puro — no hay nada que afinar aquí.

import { sfxUrl } from "@/audio/samples";

const FIREWORKS_URL = sfxUrl("fireworks.mp3");

/**
 * Cuánto del volumen general se lleva el castillo. Es el premio del viaje perfecto y
 * tiene que sentirse, así que va al tope: 1 = todo el volumen que pidió el jugador.
 * Más que esto no cabe por aquí — `HTMLAudioElement.volume` corta en 1, y subirlo
 * pediría enrutar el clip por WebAudio con un gain, como hace el tren.
 */
const MIX = 1;

/**
 * Detonaciones del clip: `[segundo del golpe, fuerza 0–1]`. Medidas, no estimadas.
 * El show tiene su forma propia: entrada densa (0–26 s), tramos sueltos, y el gran
 * final encadenado a partir del segundo 86.
 */
const BOOMS: ReadonlyArray<readonly [number, number]> = [
  [0.46, 0.27], [1.66, 0.31], [2.14, 0.17], [3.38, 0.31], [5, 0.53], [6.44, 0.27],
  [7.26, 0.21], [8.7, 0.31], [10.12, 0.47], [11.4, 0.53], [12.8, 0.44], [13.12, 0.36],
  [14.72, 0.42], [16.06, 0.5], [17.66, 0.31], [18.06, 0.57], [18.96, 0.38], [19.4, 0.47],
  [20.28, 0.2], [20.94, 0.34], [21.96, 0.53], [22.76, 0.56], [23.5, 0.21], [24.34, 1],
  [25.22, 0.41], [25.58, 0.49], [36.9, 0.17], [40.5, 0.72], [41.84, 0.28], [44.94, 0.35],
  [45.32, 0.57], [45.84, 0.41], [46.18, 0.26], [60.4, 0.13], [63.88, 0.37], [64.16, 0.31],
  [64.82, 0.17], [67.08, 0.24], [67.4, 0.26], [67.86, 0.27], [68.64, 0.28], [70.66, 0.35],
  [71.06, 0.43], [71.32, 0.16], [72.1, 0.26], [74.22, 0.12], [75.56, 0.3], [76.06, 0.3],
  [76.5, 0.4], [77.68, 0.4], [79.3, 0.23], [79.96, 0.23], [80.18, 0.17], [81.28, 0.33],
  [81.8, 0.24], [82.74, 0.23], [84.04, 0.18], [85.02, 0.22], [85.88, 0.26], [86.46, 0.13],
  [86.84, 0.82], [87.44, 0.82], [88.12, 0.71], [89.2, 0.9], [89.68, 0.67], [90.4, 0.57],
  [90.8, 0.84], [92.04, 0.14], [92.54, 1], [93.32, 0.74], [93.64, 0.98], [95.2, 0.71],
  [95.96, 0.84], [96.26, 0.98], [96.54, 0.82], [97.92, 0.96], [98.76, 0.78], [99.28, 0.87],
  [100.72, 1], [102.62, 1], [105.08, 1], [105.42, 1], [108.14, 1], [108.62, 1],
];

/** Cuánto tarda en subir una bomba de fuerza `s`: las grandes suben más y tardan más. */
function fuseFor(strength: number): number {
  return 1.15 + strength * 1.85;
}

export interface BurstCue {
  /** Segundos que faltan para el trueno: es la mecha que le toca al cohete. */
  delay: number;
  strength: number;
}

export class FireworksSound {
  private readonly audio = new Audio(FIREWORKS_URL);
  private masterVolume = 0.8;
  private next = 0;
  private active = false;

  constructor() {
    this.audio.preload = "auto";
    this.audio.volume = 0;
  }

  /** Adelanta los 4.8 MB al revelarse la Terminal, no al empezar la gala. */
  preload(): void {
    this.audio.load();
  }

  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.active) this.audio.volume = this.masterVolume * MIX;
  }

  start(): void {
    this.active = true;
    this.next = 0;
    this.audio.currentTime = 0;
    this.audio.volume = this.masterVolume * MIX;
    void this.audio.play().catch(() => {
      // Sin gesto previo el navegador puede rechazar; el viaje ya lo desbloqueó. Si
      // aun así falla, `Fireworks` sigue tirando bombas por su cuenta: cielo sin banda.
    });
  }

  pause(): void {
    if (this.active) this.audio.pause();
  }

  resume(): void {
    if (this.active) void this.audio.play().catch(() => {});
  }

  stop(): void {
    this.active = false;
    this.audio.pause();
    this.audio.currentTime = 0;
    this.next = 0;
  }

  /**
   * Bombas que hay que encargar YA para que estallen sobre su trueno. Devuelve lista
   * porque el gran final encadena hasta tres en el mismo frame.
   */
  update(): BurstCue[] {
    if (!this.active || this.audio.paused) return [];
    const t = this.audio.currentTime;
    const cues: BurstCue[] = [];
    while (this.next < BOOMS.length) {
      const [at, strength] = BOOMS[this.next];
      if (t + fuseFor(strength) < at) break;
      this.next += 1;
      // Detonaciones que quedaron atrás (pestaña en segundo plano: el audio sigue y el
      // rAF no) se descartan en vez de vaciar el pool de golpe al volver.
      if (at - t > -0.4) cues.push({ delay: Math.max(0, at - t), strength });
    }
    return cues;
  }
}
