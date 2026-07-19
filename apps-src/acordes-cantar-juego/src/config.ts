// Configuración central de Aerostato. TODOS los valores [tunable] del PLAN viven aquí
// (las fases siguientes irán añadiendo los suyos: capas, keyframes, física, tiempos…).

export type GameMode = "EXPEDITION" | "TIME_ATTACK" | "SURVIVAL";
export const GAME_MODES: GameMode[] = ["EXPEDITION", "TIME_ATTACK", "SURVIVAL"];

// Samples CDN R2 (PLAN §3.3) — ya en producción, no requiere setup.
export const AUDIO_BASE = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev";

// Música ambiental propia de Aerostato (bucket R2 storm-samples/music/aerostat/).
export const MUSIC_TRACK_URLS = Array.from(
  { length: 20 },
  (_, i) => `${AUDIO_BASE}/music/aerostat/aerostat-${String(i + 1).padStart(2, "0")}.mp3`,
);
// Misma mezcla y fundidos que Batisfera.
export const MUSIC_VOLUME_SCALE = 0.35;
export const MUSIC_FADE_OUT_MS = 320;
export const MUSIC_FADE_IN_MS = 900;
export const MUSIC_RESUME_AFTER_CHORD_MS = 1000;

// SFX de las aeronaves ambientales (misma carpeta R2 que la música).
export const FLYBY_SFX_URLS = {
  plane: `${AUDIO_BASE}/music/aerostat/cessna.mp3`,
  jet: `${AUDIO_BASE}/music/aerostat/jet.mp3`,
  strato: `${AUDIO_BASE}/music/aerostat/spy-jet.mp3`,
  satellite: `${AUDIO_BASE}/music/aerostat/satellite.mp3`,
} as const;

// Nombres EXACTOS de carpeta en el CDN.
export const INSTRUMENTS = ["Piano", "Coro", "Corno", "Cello", "Fagot"] as const;
export type Instrument = (typeof INSTRUMENTS)[number];
// "Aleatorio" elige un timbre al azar POR CUERDA de linternas (PLAN §3.3).
export type InstrumentChoice = Instrument | "Aleatorio";
export const INSTRUMENT_CHOICES: InstrumentChoice[] = [...INSTRUMENTS, "Aleatorio"];

// Registros vocales (PLAN §3.4): rangos MIDI inclusivos.
export type Register = "male" | "female";
export const REGISTERS: Record<Register, { lo: number; hi: number; i18nKey: string }> = {
  male: { lo: 41, hi: 67, i18nKey: "register.male" }, // F2–G4
  female: { lo: 55, hi: 81, i18nKey: "register.female" }, // G3–A5
};

// Modo de referencia al amarrar (decisión §2.11).
export type RefMode = "root" | "any";

// Las 5 capas del cielo (PLAN §5). yTop en unidades de mundo; metros narrativos.
export const LAYERS = [
  { num: 1, i18nKey: "layer.1.name", yBottom: 0, yTop: 150, mBottom: 0, mTop: 500 },
  { num: 2, i18nKey: "layer.2.name", yBottom: 150, yTop: 300, mBottom: 500, mTop: 3000 },
  { num: 3, i18nKey: "layer.3.name", yBottom: 300, yTop: 450, mBottom: 3000, mTop: 8000 },
  { num: 4, i18nKey: "layer.4.name", yBottom: 450, yTop: 600, mBottom: 8000, mTop: 20000 },
  { num: 5, i18nKey: "layer.5.name", yBottom: 600, yTop: 750, mBottom: 20000, mTop: 41000 },
] as const;

// Claves de localStorage (PLAN §7.7) — prefijo aerostato-.
export const STORAGE_KEYS = {
  progress: "aerostato-progress",
  atlas: "aerostato-atlas",
  settings: "aerostato-settings",
} as const;

// Paleta de consola (PLAN §4) [tunable].
export const PALETTE = {
  brass: "#c9a227",
  cream: "#f3ead7",
  wood: "#3d2b1f",
  sky: "#9fd4ff",
} as const;

// Familias de acordes por capa (PLAN §5).
export const LAYER_FAMILIES: Record<number, string[]> = {
  1: ["TRIADS"],
  2: ["SEVENTHS"],
  3: ["SIXTHS", "SUS_ADD"],
  4: ["EXT_9"],
  5: ["EXT_11_13"],
};

// Modos de juego (PLAN §7.4) [tunable].
export const MODES = {
  EXPEDITION: { quota: 20 },
  TIME_ATTACK: { quota: 3, gasStart: 120, gasPerLantern: 6, gasPerString: 15 },
  SURVIVAL: { quota: 4, fabric: 3 },
} as const;
export const LAYER_BONUS = 50; // bonus por capa completada (§7.4)

// Medallas de precisión (§7.6) [tunable]: media de |cents| de la mejor pasada.
export const MEDAL_THRESHOLDS = { gold: 15, silver: 30 } as const;
export type Medal = "gold" | "silver" | "bronze";
export function medalFor(avgCents: number): Medal {
  if (avgCents <= MEDAL_THRESHOLDS.gold) return "gold";
  if (avgCents <= MEDAL_THRESHOLDS.silver) return "silver";
  return "bronze";
}
// Bonus de score por medalla (§7.4): oro +10, plata +5.
export const MEDAL_BONUS: Record<Medal, number> = { gold: 10, silver: 5, bronze: 0 };

// Gameplay (PLAN §5.3, §7) [tunable].
export const GAMEPLAY = {
  lanternSpacingPerSemitone: 0.55, // 1 st = 0.55 u — las terceras se VEN apiladas
  windTimerBase: 12, // T = base + porNota × n segundos (§7.2)
  windTimerPerNote: 10,
  completeImpulse: 6, // empujón de altitud al completar (§7.1)
  activeStrings: 4, // cuerdas simultáneas (3–4)
  spawnRadiusMin: 25,
  spawnRadiusMax: 70,
  spawnMinSeparation: 20,
  despawnDistance: 90,
  interactMaxDistance: 30, // alcance de amarre (click o E) = anillo verde del radar; obliga a navegar (paridad Batisfera)
  clickRadiusFactor: 1.5, // esfera de colisión = 1.5× el tamaño visual
  releaseHoldSeconds: 0.5, // S sostenida para soltar
} as const;

// Color por familia (PLAN §5.3 — MISMA paleta que Batisfera, continuidad del universo).
export const FAMILY_GLOW: Record<string, string> = {
  TRIADS: "#7fd7ff",
  SEVENTHS: "#b48cff",
  SIXTHS: "#ffd27f",
  SUS_ADD: "#ffd27f",
  EXT_9: "#ff7fd0",
  EXT_11_13: "#7fffc8",
};

// Afinador (PLAN §12) [tunable solo visual].
export const TUNER_GREEN_ZONE_CENTS = 15;
export const TUNER_NEEDLE_LERP = 0.2;

// ── Mundo (PLAN §5): eje Y = altitud 0…+750, 5 capas de 150 u ──
export const WORLD = {
  topY: 750,
  bottomY: 0,
  radius: 90, // cilindro virtual con empuje suave al centro
  seed: 20260717, // RNG sembrado: mundo idéntico entre sesiones
} as const;

// Altitud narrativa: interpolación lineal POR CAPA (Y∈[0,750] → 0…41 000 m).
export function altitudeMeters(y: number): number {
  const clamped = Math.max(0, Math.min(WORLD.topY, y));
  const layer =
    LAYERS.find((l) => clamped >= l.yBottom && clamped <= l.yTop) ?? LAYERS[LAYERS.length - 1];
  const t = (clamped - layer.yBottom) / (layer.yTop - layer.yBottom);
  return Math.round(layer.mBottom + t * (layer.mTop - layer.mBottom));
}

export function layerAtY(y: number): (typeof LAYERS)[number] {
  const clamped = Math.max(0, Math.min(WORLD.topY, y));
  return (
    LAYERS.find((l) => clamped >= l.yBottom && clamped < l.yTop) ?? LAYERS[LAYERS.length - 1]
  );
}

// Keyframes de cielo §5.1 [tunable]: interpolar linealmente por Y.
// horizon es TAMBIÉN el color del fog (misma variable — sin costuras, §16).
export interface SkyKeyframe {
  y: number;
  zenith: number;
  horizon: number;
  fogDensity: number;
  ambient: number;
  sun: number;
  sunColor: number;
}
export const SKY_KEYFRAMES: readonly SkyKeyframe[] = [
  { y: 0, zenith: 0x7fb2e8, horizon: 0xffd9a0, fogDensity: 0.010, ambient: 0.90, sun: 1.0, sunColor: 0xffe3b0 },
  { y: 150, zenith: 0x5f9fe0, horizon: 0xcfe6f8, fogDensity: 0.008, ambient: 1.00, sun: 1.2, sunColor: 0xfff1d6 },
  { y: 300, zenith: 0x3f7dd6, horizon: 0xa8cdf0, fogDensity: 0.006, ambient: 0.95, sun: 1.3, sunColor: 0xffffff },
  { y: 450, zenith: 0x244fae, horizon: 0x7aa8d8, fogDensity: 0.004, ambient: 0.80, sun: 1.4, sunColor: 0xffffff },
  { y: 600, zenith: 0x101f56, horizon: 0x3f5a94, fogDensity: 0.002, ambient: 0.60, sun: 1.5, sunColor: 0xffffff },
  { y: 750, zenith: 0x04061c, horizon: 0x131c3c, fogDensity: 0.001, ambient: 0.40, sun: 1.6, sunColor: 0xffffff },
];

// Aeronaves ambientales por capa (PLAN-AERONAVES-POR-CAPA) [tunable].
export const FLYBY = {
  intervalMin: 5, // s entre pasadas (min)
  intervalMax: 12, // s entre pasadas (máximo pedido por Luis)
  firstDelay: 5, // s antes del primer paso posible
  yClearance: 15, // |ΔY| mínimo respecto al jugador
  yVariationMax: 55, // |ΔY| máximo para variar claramente cada pasada
  edgeMargin: 20, // u fuera del radio para nacer/morir
  speeds: { plane: 9, jet: 14, strato: 10, satellite: 5 }, // u/s
  audioNearDistance: 15, // u: a esta distancia alcanza su volumen máximo
  audioFarDistance: 150, // u: fuera de aquí queda inaudible
  // El sample del jet requiere más ganancia que los demás para conservar presencia.
  audioMaxVolumes: { plane: 0.5, jet: 0.8, strato: 0.5, satellite: 0.5 },
} as const;

// Física de globo (PLAN §8) [tunable]. accelLerp equivale al α~0.03 por frame del
// plan a 60 fps, expresado por segundo para independencia del framerate.
export const PHYSICS = {
  maxSpeedH: 6, // u/s horizontal
  maxSpeedV: 4, // u/s vertical
  accelLerp: 1.8, // 1/s — masa de globo (más pesado que Batisfera)
  windSpeed: 0.4, // u/s deriva constante por capa
  // Navegación con rumbo estilo Batisfera (Luis 2026-07-19): A/D = timón,
  // drag = vista temporal que se recentra al soltar.
  turnSpeed: 0.4, // rad/s de giro con A/D o ←/→ (Luis: la mitad, 2026-07-19)
  lookSensitivity: 0.0035, // rad/px de drag horizontal (solo vista)
  lookYawMax: (40 * Math.PI) / 180, // mirada lateral máxima respecto a la proa
  lookRecenterLerp: 4, // recentrado horizontal al soltar
  peekPitchMax: (25 * Math.PI) / 180, // peek vertical máximo de la cámara
  peekSensitivity: 0.0028, // rad/px de drag vertical
  peekRecenterLerp: 4, // recentrado del peek al soltar
  bankMaxRoll: (5 * Math.PI) / 180, // banqueo cosmético máximo al girar
  bankFactor: 0.22, // roll = -velocidadDeGiro × factor
  accelDipMax: (2 * Math.PI) / 180, // cabeceo visual al acelerar/frenar
  camRollAmplitude: (1 * Math.PI) / 180, // balanceo ±1° (flotar, no nadar)
  camRollSpeed: 0.07, // Hz
} as const;
