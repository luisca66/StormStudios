// Constantes del juego (PLAN §3.3, §5, §6). Datos puros: sin lógica de escena ni UI.

import type { FamilyId } from "@/music/chords";

// ---------- Audio (CDN R2 en producción, PLAN §3.3) ----------
export const AUDIO_BASE = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev";
// Assets propios del juego (no compartidos con las demás apps) viven bajo /batisfera/.
export const AMBIENT_BUBBLES_URL = `${AUDIO_BASE}/batisfera/water-bubbles.mp3`;
export const AMBIENT_THRUSTERS_URL = `${AUDIO_BASE}/batisfera/thrusters.mp3`;

export const INSTRUMENTS = ["Piano", "Coro", "Corno", "Cello", "Fagot"] as const;
export type Instrument = (typeof INSTRUMENTS)[number];
export type InstrumentChoice = Instrument | "Aleatorio";

// ---------- Mundo ----------
export const WORLD = {
  zoneHeight: 150, // unidades de mundo por zona
  radius: 90, // cilindro virtual; empuje suave hacia el centro al acercarse
  bottomY: -750, // fondo de la fosa
} as const;

export interface ZoneDef {
  index: 1 | 2 | 3 | 4 | 5;
  nameKey: string; // clave i18n ("zone.1.name" …)
  yTop: number;
  yBottom: number;
  metersTop: number;
  metersBottom: number;
  families: FamilyId[];
  // Grupos de introducción de acordes (PLAN §6.3): grupo 2 entra a mitad de cuota,
  // grupo 3 a 3/4 de cuota.
  introGroups: string[][];
}

export const ZONES: ZoneDef[] = [
  {
    index: 1, nameKey: "zone.1.name", yTop: 0, yBottom: -150,
    metersTop: 0, metersBottom: 200, families: ["TRIADS"],
    introGroups: [["MAJOR", "MINOR"], ["AUGMENTED", "DIMINISHED"]],
  },
  {
    index: 2, nameKey: "zone.2.name", yTop: -150, yBottom: -300,
    metersTop: 200, metersBottom: 1000, families: ["SEVENTHS"],
    introGroups: [
      ["DOMINANT_7", "MINOR_7", "MAJOR_7"],
      ["MINOR_MAJOR_7", "DIMINISHED_7", "HALF_DIMINISHED_7"],
      ["DOMINANT_7_FLAT_5", "DOMINANT_7_SHARP_5"],
    ],
  },
  {
    index: 3, nameKey: "zone.3.name", yTop: -300, yBottom: -450,
    metersTop: 1000, metersBottom: 4000, families: ["SIXTHS", "SUS_ADD"],
    introGroups: [
      ["MAJOR_6", "MINOR_6", "SUS_4"],
      ["MINOR_SUS_4", "MAJOR_ADD_9", "MINOR_ADD_9"],
    ],
  },
  {
    index: 4, nameKey: "zone.4.name", yTop: -450, yBottom: -600,
    metersTop: 4000, metersBottom: 6000, families: ["EXT_9"],
    introGroups: [
      ["MAJOR_9", "MINOR_9", "DOMINANT_9"],
      ["MAJOR_6_9", "MINOR_6_9"],
      ["DOMINANT_FLAT_9", "DOMINANT_SHARP_9"],
    ],
  },
  {
    index: 5, nameKey: "zone.5.name", yTop: -600, yBottom: -750,
    metersTop: 6000, metersBottom: 11000, families: ["EXT_11_13"],
    introGroups: [
      ["MAJOR_11", "MINOR_11", "DOMINANT_11"],
      ["DOMINANT_SHARP_11", "MAJOR_SHARP_11"],
      ["MAJOR_13", "MINOR_13", "DOMINANT_13"],
    ],
  },
];

export function zoneAtY(y: number): ZoneDef {
  for (const z of ZONES) {
    if (y <= z.yTop && y > z.yBottom) return z;
  }
  return y > 0 ? ZONES[0] : ZONES[ZONES.length - 1];
}

// Profundímetro narrativo: mapeo lineal POR ZONA de unidades de mundo a metros.
export function depthMeters(y: number): number {
  const clamped = Math.min(0, Math.max(WORLD.bottomY, y));
  const z = zoneAtY(clamped);
  const t = (z.yTop - clamped) / (z.yTop - z.yBottom);
  return Math.round(z.metersTop + t * (z.metersBottom - z.metersTop));
}

// ---------- Luz y color por profundidad (PLAN §5.1) ----------
export interface DepthKeyframe {
  y: number;
  color: number; // color de agua/fog Y de background (mismo color, sin costuras)
  fogDensity: number;
  ambient: number;
  sun: number;
}

export const DEPTH_KEYFRAMES: DepthKeyframe[] = [
  { y: 0, color: 0x2e86c1, fogDensity: 0.008, ambient: 1.0, sun: 1.2 },
  { y: -150, color: 0x1b4f72, fogDensity: 0.012, ambient: 0.55, sun: 0.4 },
  { y: -300, color: 0x0b2438, fogDensity: 0.016, ambient: 0.3, sun: 0.0 },
  { y: -450, color: 0x050d18, fogDensity: 0.022, ambient: 0.12, sun: 0.0 },
  { y: -600, color: 0x01050a, fogDensity: 0.028, ambient: 0.05, sun: 0.0 },
  { y: -750, color: 0x000203, fogDensity: 0.032, ambient: 0.02, sun: 0.0 },
];

// Paleta de bioluminiscencia por familia (PLAN §7).
export const FAMILY_GLOW: Record<FamilyId, number> = {
  TRIADS: 0x7fd7ff,
  SEVENTHS: 0xb48cff,
  SIXTHS: 0xffd27f,
  SUS_ADD: 0xffd27f,
  EXT_9: 0xff7fd0,
  EXT_11_13: 0x7fffc8,
};

// ---------- Modos y reglas (PLAN §6.4) ----------
export type GameMode = "EXPEDITION" | "TIME_ATTACK" | "SURVIVAL";

export const MODES: Record<GameMode, { quota: number }> = {
  EXPEDITION: { quota: 8 },
  TIME_ATTACK: { quota: 4 },
  SURVIVAL: { quota: 6 },
};

export const TIME_ATTACK_O2_START = 90; // segundos
export const TIME_ATTACK_O2_PER_CAPTURE = 8;
export const SURVIVAL_HULL = 3;

export const SCORING = {
  base: 10,
  // La racha se incrementa antes de puntuar: la primera captura vale 12.
  streakBonus: 2, // puntos = base + racha resultante * streakBonus
  zoneBonus: 50,
  leviathanMultiplier: 2,
} as const;

// Generación de preguntas (PLAN §3.4)
export const ROOT_RANGE = { min: "C3", max: "C5" } as const;

// Interacción (PLAN §6.1, §6.2)
export const INTERACTION = {
  maxCreatures: 6,
  minCreatures: 4,
  spawnRadiusMin: 25,
  spawnRadiusMax: 70,
  minSeparation: 15,
  interactMaxDistance: 45, // si la criatura queda más lejos, vuelve a EXPLORANDO
  listenTimeoutSec: 30,
  recycleDistance: 90,
  clickRadiusFactor: 1.5,
} as const;

// Física de nado (PLAN §9)
export const PHYSICS = {
  maxSpeed: 8, // u/s
  accelLerp: 2.5, // factor exponencial de aceleración/freno
  lookSensitivity: 0.0035, // rad por pixel de drag
  pitchClamp: (85 * Math.PI) / 180,
  camRollAmplitude: (0.5 * Math.PI) / 180, // balanceo submarino
  camRollSpeed: 0.4,
} as const;

// ---------- Persistencia (PLAN §6.6) ----------
export const STORAGE_KEYS = {
  progress: "batisfera-progress",
  bitacora: "batisfera-bitacora",
  settings: "batisfera-settings",
} as const;
