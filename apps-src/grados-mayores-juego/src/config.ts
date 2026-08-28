// config.ts — TODOS los valores [tunable] del PLAN viven aquí (PLAN §0.7).
// Luis es un maestro exigente: cualquier castigo, tiempo o cuota se ajusta SOLO en este
// archivo, jamás como constante enterrada en otro módulo.

// ---------------------------------------------------------------------------
// El viaje (PLAN §7)
// ---------------------------------------------------------------------------
export const DECISIONS_TO_ARRIVE = 20; // decisiones correctas netas para llegar
export const DETOUR_COST = 2;          // progreso perdido por desvío (piso 0)
export const WHISTLE_COUNT = 3;        // silbatos-tónica por viaje
export const WHISTLE_PAUSES_WINDOW = false; // gastar memoria cuesta tiempo (guiño al tirano)
export const DETOUR_DURATION_S = 10;   // duración aproximada del lazo del apartadero

// ---------------------------------------------------------------------------
// Geometría de la vía (PLAN §5.1) — unidades de mundo
// ---------------------------------------------------------------------------
export const SEGMENT_LENGTH = 140;     // tramo entre bifurcaciones
export const DEAD_ZONE_LENGTH = 40;    // respiro inicial del segmento (eventos ambientales)
export const ANSWER_DISTANCE = SEGMENT_LENGTH - DEAD_ZONE_LENGTH; // señal avanzada → aguja
export const SPRINT_FACTOR = 1.8;      // multiplicador de velocidad en zona muerta
export const LATERAL_WOBBLE = 30;      // offset lateral máx. de puntos de control
export const VERTICAL_WOBBLE = 6;      // ondulación vertical máx. (0 en aproximación)
export const DETOUR_LOOP_LENGTH = 200; // lazo del apartadero
export const RAIL_GAUGE = 1.6;         // separación de rieles
export const SLEEPER_SPACING = 1.6;    // separación de durmientes
export const SEGMENTS_AHEAD = 3;       // streaming: segmentos generados por delante
export const DISPOSE_BEHIND = 200;     // streaming: distancia para liberar segmentos

// Seed del mundo: fija por tonalidad para que cada ruta sea reconocible (PLAN §5.1).
export const WORLD_SEED_BASE = 20260719;

// ---------------------------------------------------------------------------
// Velocidades (PLAN §7.3) — la dificultad que ofrecemos nosotros
// ---------------------------------------------------------------------------
export type SpeedId = "SLOW" | "NORMAL" | "FAST" | "MASTER";

export interface SpeedSpec {
  id: SpeedId;
  unitsPerSecond: number; // velocidad durante la PREGUNTA (la ventana = ANSWER_DISTANCE / v)
  scoreMultiplier: number;
}

export const SPEEDS: SpeedSpec[] = [
  { id: "SLOW", unitsPerSecond: 8, scoreMultiplier: 1.0 },
  { id: "NORMAL", unitsPerSecond: 11, scoreMultiplier: 1.25 },
  { id: "FAST", unitsPerSecond: 16, scoreMultiplier: 1.5 },
  { id: "MASTER", unitsPerSecond: 25, scoreMultiplier: 2.0 },
];

export function answerWindowSeconds(speed: SpeedSpec): number {
  return ANSWER_DISTANCE / speed.unitsPerSecond;
}

// ---------------------------------------------------------------------------
// Puntuación (PLAN §7.5)
// ---------------------------------------------------------------------------
export const POINTS_BASE = 10;           // por acierto
export const POINTS_PER_STREAK = 2;      // × racha
export const POINTS_QUICK_MAX = 5;       // bonus por rapidez (fracción de ventana restante)
export const POINTS_ARRIVAL = 100;       // llegar a la Terminal (× multiplicador)
export const POINTS_PER_UNUSED_WHISTLE = 15;
export const POINTS_GALA = 150;          // 0 desvíos y 0 silbatos

// Medallas (PLAN §7.6): oro = 0 desvíos, plata ≤ este umbral, bronce = llegar.
export const SILVER_MAX_DETOURS = 2;

// ---------------------------------------------------------------------------
// Audio (PLAN §3.3, §9)
// ---------------------------------------------------------------------------
export const AUDIO_BASE = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev";

// Los sfx (lluvia, truenos, tren, fuegos) viven en R2 junto a los samples, bajo
// `expreso-tonal/`: son 11 MB de mp3 que no tienen por qué viajar en el bundle ni
// entrar al repo del sitio en cada despliegue.
//
// En dev van por el proxy `/r2` de vite.config.ts. No es capricho: el tren enruta su
// audio por WebAudio (`createMediaElementSource`), lo que exige un elemento limpio de
// CORS, y la lista del bucket no incluye el origen del servidor de desarrollo. Mismo
// origen = sin CORS de por medio.
export const SFX_DIR = "expreso-tonal";
export const SFX_BASE = import.meta.env.DEV ? "/r2" : AUDIO_BASE;
export const PRELOAD_TIMEOUT_MS = 3500;
// I – IV – V – I al partir. A 1.0 s las tríadas se solapaban entre sí y la cadencia
// sonaba a barro: cada acorde necesita respirar antes del siguiente.
export const CADENCE_CHORD_GAP_S = 2.0;
export const ARCH_NOTE_GAP_S = 0.9;      // los 8 arcos de la llegada
export const QUESTION_DUCK_LEVEL = 0.3;  // bed sintetizado durante pregunta (regla §2.10)
export const WHISTLE_STEAM_MIX = 0.35;   // capa de vapor sobre el acorde del silbato

// ---------------------------------------------------------------------------
// Cámara y cabina (PLAN §6)
// ---------------------------------------------------------------------------
export const CAMERA_FOV = 60;
export const YAW_CLAMP_DEG = 100;
export const PITCH_CLAMP_DEG = 35;
export const LOOK_RECENTER_S = 2.0;      // auto-recentrado al soltar el drag
export const SWAY_MAX_DEG = 0.8;         // balanceo base (dos senos desfasados)
export const CURVE_BANK_DEG = 1.5;       // peralte en curvas
export const RATTLE_AMPLITUDE = 0.05;    // microvibración proporcional a velocidad
export const CAB_EYE_HEIGHT = 2.6;       // altura del ojo del maquinista sobre el riel
export const CAB_VIEW_OFFSET_X = 0;      // puesto CENTRADO como la referencia de metro (antes -0.48, puesto izquierdo)
export const CAB_VIEW_OFFSET_Y = 0.28;   // gana lectura sobre la caldera sin falsear su escala
export const CAB_VIEW_OFFSET_Z = 0.3;    // un paso atrás: marco visible y caldera menos dominante
export const CAMERA_TRACK_PITCH_DEG = -8;// mirada de reposo inclinada hacia los rieles
export const LOOK_SENSITIVITY = 0.0035;  // rad por pixel de drag

// ---------------------------------------------------------------------------
// Física del tren y construcción de vía (F2)
// ---------------------------------------------------------------------------
export const TRAIN_ACCEL_RATE = 1.4;     // lerp/s hacia la velocidad objetivo
export const TRAIN_START_RAMP_S = 3;     // aceleración inicial de salida
export const CTRL_POINT_SPACING = 35;    // separación de puntos de control de la spline
export const TRACK_SAMPLE_SPACING = 2;   // muestreo de frames a lo largo de la vía
export const HEADING_JITTER = 0.35;      // rad/punto máx. de deriva del rumbo [suave]
export const BANK_CURVATURE_GAIN = 40;   // peralte = clamp(curvatura × gain)
export const JOINT_SPACING = 12;         // junta de riel cada N u (el "cla-clack")

// ---------------------------------------------------------------------------
// Decorado transversal y vida (PLAN §5.6 — F4)
// ---------------------------------------------------------------------------
export const TELEGRAPH_SPACING = 18;     // poste cada N u junto a la vía (ritmo hipnótico)
export const TELEGRAPH_SIDE_OFFSET = 11; // distancia lateral de la línea de postes
export const MILESTONE_SPACING = 70;     // mojones de km
export const FAUNA_COUNT = 14;           // aves (o liebres) vivas a la vez
export const FAUNA_AHEAD = 130;          // se reciclan a esta distancia por delante
export const FAUNA_FLAP_HZ = 3.4;        // aleteo (fase por individuo, en CPU)

// Tren de carga que se cruza (PLAN §5.6): SOLO en zona muerta, nunca con pregunta activa.
export const CROSSING_TRAIN_MAX = 2;          // apariciones por viaje
export const CROSSING_TRAIN_WAGONS = 10;
export const CROSSING_TRAIN_SPEED = 26;       // u/s en sentido contrario
export const CROSSING_TRACK_OFFSET = 13;      // separación de la vía paralela
export const CROSSING_HORN_DURATION_S = 1.3;  // bocina SIN altura definida (§2.10)

// Guiños a las otras obras de Storm Studios (1 vez por viaje).
export const AEROSTATO_BALLOON_ALTITUDE = 150; // globo dorado muy alto (Valle/Sierra)
export const BATISFERA_SHIP_DISTANCE = 190;    // barco con grúa y esfera (Costa)

// ---------------------------------------------------------------------------
// Rendimiento (PLAN §5.6)
// ---------------------------------------------------------------------------
export const TARGET_FPS_MIN = 50;
export const DRAW_CALL_BUDGET = 200;

// ---------------------------------------------------------------------------
// Rutas: bioma × hora por tonalidad (PLAN §5.4) — 15 = 5 biomas × 3 horas
// ---------------------------------------------------------------------------
export type BiomeId = "VALLE" | "DESIERTO" | "SIERRA" | "COSTA" | "PARAMO";
export type TimeOfDay = "AMANECER" | "MEDIODIA" | "ATARDECER" | "NOCHE" | "CREPUSCULO" | "AURORA";

export interface RouteSpec {
  scale: string; // clave de SCALES (music/degrees.ts)
  biome: BiomeId;
  time: TimeOfDay;
}

export const ROUTES: RouteSpec[] = [
  { scale: "C", biome: "VALLE", time: "MEDIODIA" },
  { scale: "G", biome: "VALLE", time: "AMANECER" },
  { scale: "F", biome: "VALLE", time: "ATARDECER" },
  { scale: "D", biome: "DESIERTO", time: "MEDIODIA" },
  { scale: "A", biome: "DESIERTO", time: "ATARDECER" },
  { scale: "E", biome: "DESIERTO", time: "AMANECER" },
  { scale: "E♭", biome: "SIERRA", time: "AMANECER" },
  { scale: "A♭", biome: "SIERRA", time: "MEDIODIA" },
  { scale: "B♭", biome: "SIERRA", time: "ATARDECER" },
  { scale: "F#", biome: "COSTA", time: "ATARDECER" },
  { scale: "B", biome: "COSTA", time: "MEDIODIA" },
  { scale: "D♭", biome: "COSTA", time: "AMANECER" },
  { scale: "C#", biome: "PARAMO", time: "NOCHE" },
  { scale: "C♭", biome: "PARAMO", time: "CREPUSCULO" },
  { scale: "G♭", biome: "PARAMO", time: "AURORA" },
];

// Swatch de bioma para el menú (PLAN §10).
export const BIOME_SWATCH: Record<BiomeId, string> = {
  VALLE: "#c8b23c",
  DESIERTO: "#d07840",
  SIERRA: "#4e7d5b",
  COSTA: "#3c9db0",
  PARAMO: "#7b5fd0",
};

export function routeForScale(scale: string): RouteSpec {
  const r = ROUTES.find((x) => x.scale === scale);
  if (!r) throw new Error(`Ruta desconocida: ${scale}`);
  return r;
}
