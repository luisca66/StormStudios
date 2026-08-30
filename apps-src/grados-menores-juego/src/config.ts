// config.ts — TODOS los valores [tunable] del PLAN viven aquí (PLAN §0.7).
// Luis es un maestro exigente: cualquier castigo, tiempo o cuota se ajusta SOLO en este
// archivo, jamás como constante enterrada en otro módulo.

// ---------------------------------------------------------------------------
// El viaje (PLAN §7)
// ---------------------------------------------------------------------------
export const DECISIONS_TO_ARRIVE = 20; // decisiones correctas netas para llegar
export const DRIFT_COST = 2;           // progreso perdido por deriva (piso 0)
export const BEACON_COUNT = 3;         // radiofaros-tónica por viaje
export const BEACON_PAUSES_WINDOW = false; // gastar memoria cuesta tiempo (guiño al tirano)
export const DRIFT_DURATION_S = 10;    // duración aproximada del lazo por la nebulosa

// ---------------------------------------------------------------------------
// Geometría de la órbita (PLAN §5.1) — unidades de mundo
// ---------------------------------------------------------------------------
export const SEGMENT_LENGTH = 140;     // tramo entre anillos de navegación
export const DEAD_ZONE_LENGTH = 40;    // respiro inicial del segmento (eventos ambientales)
export const ANSWER_DISTANCE = SEGMENT_LENGTH - DEAD_ZONE_LENGTH; // baliza → anillo
export const SPRINT_FACTOR = 1.8;      // multiplicador de velocidad en zona muerta
export const LATERAL_WOBBLE = 30;      // offset lateral máx. de puntos de control
export const VERTICAL_WOBBLE = 14;     // ondulación vertical máx. (en el espacio, mayor)
export const DRIFT_LOOP_LENGTH = 200;  // lazo de la nebulosa
export const TRAIL_GAUGE = 1.6;        // separación de las dos cintas de la estela
export const BUOY_SPACING = 18;        // boyas de navegación (el ritmo visual hipnótico)
export const SEGMENTS_AHEAD = 3;       // streaming: segmentos generados por delante
export const DISPOSE_BEHIND = 200;     // streaming: distancia para liberar segmentos

// Seed del mundo: fija por tonalidad para que cada ruta sea reconocible (PLAN §5.1).
export const WORLD_SEED_BASE = 20260829;

// ---------------------------------------------------------------------------
// Velocidades (PLAN §7.3) — la dificultad que ofrecemos nosotros
// ---------------------------------------------------------------------------
export type SpeedId = "SLOW" | "NORMAL" | "FAST" | "MASTER";

export interface SpeedSpec {
  id: SpeedId;
  unitsPerSecond: number; // velocidad durante la PREGUNTA (ventana = ANSWER_DISTANCE / v)
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
// Puntuación (PLAN §7.5) — fórmula idéntica al Expreso: los récords son comparables
// ---------------------------------------------------------------------------
export const POINTS_BASE = 10;           // por acierto
export const POINTS_PER_STREAK = 2;      // × racha
export const POINTS_QUICK_MAX = 5;       // bonus por rapidez (fracción de ventana restante)
export const POINTS_ARRIVAL = 100;       // llegar al Perihelio (× multiplicador)
export const POINTS_PER_UNUSED_BEACON = 15;
export const POINTS_GALA = 150;          // 0 derivas y 0 radiofaros

// Medallas (PLAN §7.6): oro = 0 derivas, plata ≤ este umbral, bronce = llegar.
export const SILVER_MAX_DRIFTS = 2;

// ---------------------------------------------------------------------------
// Audio (PLAN §3.3, §9)
// ---------------------------------------------------------------------------
export const AUDIO_BASE = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev";

// Los sfx propios del juego vivirán en R2 junto a los samples, bajo `el-cometa/`.
// En dev van por el proxy `/r2` de vite.config.ts: el audio del cometa se enruta por
// WebAudio (`createMediaElementSource`), que exige un elemento limpio de CORS, y la
// lista del bucket no incluye el origen de desarrollo. (Lección del Expreso.)
export const SFX_DIR = "el-cometa";
export const SFX_BASE = import.meta.env.DEV ? "/r2" : AUDIO_BASE;
export const PRELOAD_TIMEOUT_MS = 3500;
// i – iv – V – i al partir. El Expreso midió que a 1.0 s las tríadas se solapan y la
// cadencia suena a barro: cada acorde necesita respirar antes del siguiente.
export const CADENCE_CHORD_GAP_S = 2.0;
export const RING_NOTE_GAP_S = 0.9;      // los 15 anillos de la espiral de llegada
export const QUESTION_DUCK_LEVEL = 0.3;  // bed sintetizado durante pregunta (§2.11)
export const BEACON_STATIC_MIX = 0.35;   // capa de estática sobre el acorde del radiofaro
// Comparación pedagógica de pares mutables en la deriva (PLAN §2.7).
export const MUTABLE_COMPARISON_ENABLED = true;

// ---------------------------------------------------------------------------
// Cámara y carlinga (PLAN §6)
// ---------------------------------------------------------------------------
export const CAMERA_FOV = 60;
export const YAW_CLAMP_DEG = 100;
export const PITCH_CLAMP_DEG = 35;
export const LOOK_RECENTER_S = 2.0;      // auto-recentrado al soltar el drag
export const LOOK_SENSITIVITY = 0.0035;  // rad por pixel de drag
// En el espacio no hay traqueteo: hay flotación. Frecuencias más bajas y amplitudes algo
// mayores que las del tren (PLAN §6).
export const SWAY_MAX_DEG = 0.8;
export const SWAY_FREQ_HZ = 0.11;
export const CURVE_BANK_DEG = 2.0;
export const FLOAT_AMPLITUDE = 0.09;     // micro-deriva lateral lenta
export const CAB_EYE_HEIGHT = 2.2;
export const CAB_VIEW_OFFSET_X = 0;
export const CAB_VIEW_OFFSET_Y = 0.24;
export const CAB_VIEW_OFFSET_Z = 0.3;
export const CAMERA_TRACK_PITCH_DEG = -6; // mirada de reposo hacia la estela

// ---------------------------------------------------------------------------
// Física del cometa y construcción de la ruta (F2)
// ---------------------------------------------------------------------------
export const COMET_ACCEL_RATE = 1.2;     // lerp/s hacia la velocidad objetivo (más inercia
                                         // que el tren: masa en el vacío)
export const COMET_START_RAMP_S = 3;     // aceleración inicial de salida
export const CTRL_POINT_SPACING = 35;    // separación de puntos de control de la spline
export const TRACK_SAMPLE_SPACING = 2;   // muestreo de frames a lo largo de la ruta
export const HEADING_JITTER = 0.35;      // rad/punto máx. de deriva del rumbo [suave]
export const BANK_CURVATURE_GAIN = 40;   // roll = clamp(curvatura × gain)
export const SLINGSHOT_BOOST = 1.35;     // empujón de velocidad al acertar
export const SLINGSHOT_DURATION_S = 1.0;

// ---------------------------------------------------------------------------
// Decorado transversal y vida (PLAN §5.6 — F4)
// ---------------------------------------------------------------------------
export const DUST_PARTICLE_COUNT = 900;  // polvo cercano (parallax de velocidad)
export const DUST_BOX_SIZE = 120;        // caja reciclada alrededor de la cámara
export const TRAIL_SPRITE_MAX = 120;     // estela propia del cometa
export const FAUNA_COUNT = 14;           // bandadas de polvo / mantarrayas de gas
export const FAUNA_AHEAD = 130;
export const FAUNA_FLAP_HZ = 3.4;

// Cometa hermano que se cruza (PLAN §5.6): SOLO en zona muerta, nunca con pregunta activa.
export const SIBLING_COMET_MAX = 2;           // apariciones por viaje
export const SIBLING_COMET_SPEED = 26;        // u/s en sentido contrario
export const SIBLING_TRACK_OFFSET = 13;       // separación de la trayectoria paralela
export const SIBLING_ROAR_DURATION_S = 1.3;   // rugido SIN altura definida (§2.11)

// Guiños a las otras obras de Storm Studios (1 vez por viaje).
export const EXPRESO_THREAD_DISTANCE = 210;   // la vía dorada sobre el planeta natal
export const AEROSTATO_BALLOON_ALTITUDE = 150; // globo dorado al partir (acto 1)

// ---------------------------------------------------------------------------
// Rendimiento (PLAN §5.6)
// ---------------------------------------------------------------------------
export const TARGET_FPS_MIN = 50;
export const DRAW_CALL_BUDGET = 200;

// ---------------------------------------------------------------------------
// Rutas: región × variante por tonalidad (PLAN §5.4) — 15 = 5 regiones × 3 variantes
// ---------------------------------------------------------------------------
export type RegionId = "LUMBRE" | "ROCAS" | "HIELO" | "FAROLES" | "VACIO";
export type VarianteId =
  | "RESCOLDO" | "MAGENTA" | "DORADA"
  | "OCRE" | "GRIS_AZUL" | "VIOLETA"
  | "ZAFIRO" | "TURQUESA" | "PERLA"
  | "ORO_BLANCO" | "AZUL_ELECTRICO" | "AMBAR"
  | "NOCHE_ABSOLUTA" | "ALBA_GALACTICA" | "VIOLETA_PROFUNDO";

export interface RouteSpec {
  scale: string;      // clave de SCALES (music/degrees.ts)
  region: RegionId;
  variante: VarianteId;
  constellation: ConstellationId;
}

export const ROUTES: RouteSpec[] = [
  { scale: "Am", region: "LUMBRE", variante: "RESCOLDO", constellation: "LYRA" },
  { scale: "Dm", region: "LUMBRE", variante: "MAGENTA", constellation: "URSA" },
  { scale: "Em", region: "LUMBRE", variante: "DORADA", constellation: "CYGNUS" },
  { scale: "Gm", region: "ROCAS", variante: "OCRE", constellation: "ORION" },
  { scale: "Cm", region: "ROCAS", variante: "GRIS_AZUL", constellation: "CETUS" },
  { scale: "Fm", region: "ROCAS", variante: "VIOLETA", constellation: "SCORPIUS" },
  { scale: "Bm", region: "HIELO", variante: "ZAFIRO", constellation: "AQUILA" },
  { scale: "F#m", region: "HIELO", variante: "TURQUESA", constellation: "DELPHINUS" },
  { scale: "B♭m", region: "HIELO", variante: "PERLA", constellation: "CANIS" },
  { scale: "C#m", region: "FAROLES", variante: "ORO_BLANCO", constellation: "CASSIOPEIA" },
  { scale: "G#m", region: "FAROLES", variante: "AZUL_ELECTRICO", constellation: "DRACO" },
  { scale: "E♭m", region: "FAROLES", variante: "AMBAR", constellation: "CORONA" },
  { scale: "D#m", region: "VACIO", variante: "NOCHE_ABSOLUTA", constellation: "PHOENIX" },
  { scale: "A#m", region: "VACIO", variante: "ALBA_GALACTICA", constellation: "PEGASUS" },
  { scale: "A♭m", region: "VACIO", variante: "VIOLETA_PROFUNDO", constellation: "CRUX" },
];

// Swatch de región para el menú (PLAN §10).
export const REGION_SWATCH: Record<RegionId, string> = {
  LUMBRE: "#d4553f",
  ROCAS: "#8a7a63",
  HIELO: "#4aa6c4",
  FAROLES: "#e0c064",
  VACIO: "#6b5bb5",
};

export function routeForScale(scale: string): RouteSpec {
  const r = ROUTES.find((x) => x.scale === scale);
  if (!r) throw new Error(`Ruta desconocida: ${scale}`);
  return r;
}

// ---------------------------------------------------------------------------
// Las 15 constelaciones (PLAN §5.8)
// ---------------------------------------------------------------------------
// Cada figura es una POLILÍNEA de anclas en espacio 0..1 (x derecha, y abajo). Las 20
// estrellas del progreso se reparten uniformemente a lo largo de esa polilínea con
// `constellationStars()`: así el mapa de progreso del HUD dibuja la figura poco a poco,
// y cambiar una figura es mover anclas, no recontar estrellas.
//
// Son evocaciones de las figuras clásicas, no astronomía de catálogo: se dibujan a
// 200×160 px en una esquina del HUD.

export type ConstellationId =
  | "LYRA" | "CYGNUS" | "AQUILA" | "DELPHINUS" | "CASSIOPEIA"
  | "DRACO" | "PHOENIX" | "PEGASUS" | "URSA" | "ORION"
  | "CETUS" | "SCORPIUS" | "CANIS" | "CORONA" | "CRUX";

export interface ConstellationSpec {
  id: ConstellationId;
  es: string;
  en: string;
  anchors: ReadonlyArray<readonly [number, number]>;
}

export const CONSTELLATIONS: Record<ConstellationId, ConstellationSpec> = {
  LYRA: { id: "LYRA", es: "La Lira", en: "Lyra",
    anchors: [[0.50, 0.08], [0.30, 0.30], [0.24, 0.62], [0.44, 0.86], [0.68, 0.72], [0.72, 0.38], [0.50, 0.08]] },
  CYGNUS: { id: "CYGNUS", es: "El Cisne", en: "Cygnus",
    anchors: [[0.50, 0.06], [0.50, 0.48], [0.14, 0.44], [0.50, 0.48], [0.86, 0.42], [0.50, 0.48], [0.46, 0.92]] },
  AQUILA: { id: "AQUILA", es: "El Águila", en: "Aquila",
    anchors: [[0.12, 0.30], [0.38, 0.46], [0.50, 0.20], [0.62, 0.46], [0.88, 0.28], [0.62, 0.46], [0.52, 0.88]] },
  DELPHINUS: { id: "DELPHINUS", es: "El Delfín", en: "Delphinus",
    anchors: [[0.16, 0.62], [0.34, 0.34], [0.58, 0.28], [0.74, 0.46], [0.56, 0.60], [0.34, 0.34], [0.88, 0.78]] },
  CASSIOPEIA: { id: "CASSIOPEIA", es: "Casiopea", en: "Cassiopeia",
    anchors: [[0.08, 0.66], [0.28, 0.28], [0.48, 0.62], [0.70, 0.24], [0.92, 0.58]] },
  DRACO: { id: "DRACO", es: "El Dragón", en: "Draco",
    anchors: [[0.10, 0.86], [0.26, 0.60], [0.20, 0.34], [0.44, 0.22], [0.66, 0.34], [0.62, 0.60], [0.82, 0.70], [0.90, 0.44]] },
  PHOENIX: { id: "PHOENIX", es: "El Fénix", en: "Phoenix",
    anchors: [[0.50, 0.10], [0.34, 0.34], [0.10, 0.44], [0.34, 0.34], [0.50, 0.62], [0.66, 0.34], [0.90, 0.44], [0.66, 0.34], [0.50, 0.10]] },
  PEGASUS: { id: "PEGASUS", es: "El Pegaso", en: "Pegasus",
    anchors: [[0.24, 0.24], [0.72, 0.22], [0.76, 0.68], [0.26, 0.70], [0.24, 0.24], [0.06, 0.86]] },
  URSA: { id: "URSA", es: "La Osa", en: "Ursa Major",
    anchors: [[0.08, 0.70], [0.26, 0.62], [0.44, 0.66], [0.58, 0.52], [0.74, 0.44], [0.86, 0.28], [0.68, 0.22]] },
  ORION: { id: "ORION", es: "Orión", en: "Orion",
    anchors: [[0.24, 0.10], [0.16, 0.44], [0.42, 0.50], [0.50, 0.54], [0.58, 0.58], [0.84, 0.46], [0.76, 0.12], [0.84, 0.46], [0.66, 0.90], [0.34, 0.86], [0.16, 0.44]] },
  CETUS: { id: "CETUS", es: "La Ballena", en: "Cetus",
    anchors: [[0.06, 0.52], [0.26, 0.34], [0.52, 0.36], [0.74, 0.50], [0.90, 0.36], [0.90, 0.68], [0.74, 0.50], [0.46, 0.66], [0.20, 0.72]] },
  SCORPIUS: { id: "SCORPIUS", es: "El Escorpión", en: "Scorpius",
    anchors: [[0.10, 0.20], [0.28, 0.30], [0.44, 0.44], [0.56, 0.62], [0.60, 0.82], [0.76, 0.86], [0.86, 0.68], [0.78, 0.52]] },
  CANIS: { id: "CANIS", es: "El Can Mayor", en: "Canis Major",
    anchors: [[0.34, 0.16], [0.50, 0.36], [0.30, 0.52], [0.50, 0.36], [0.74, 0.44], [0.80, 0.74], [0.56, 0.82], [0.30, 0.52]] },
  CORONA: { id: "CORONA", es: "La Corona", en: "Corona Borealis",
    anchors: [[0.10, 0.62], [0.20, 0.36], [0.40, 0.22], [0.62, 0.24], [0.80, 0.38], [0.90, 0.64]] },
  CRUX: { id: "CRUX", es: "La Cruz del Sur", en: "Crux",
    anchors: [[0.50, 0.08], [0.50, 0.92], [0.50, 0.46], [0.16, 0.42], [0.50, 0.46], [0.86, 0.50]] },
};

/**
 * Reparte `count` estrellas uniformemente por la longitud de la polilínea de la figura.
 * El HUD las enciende una por decisión correcta (PLAN §5.8), así que la constelación se
 * dibuja al mismo ritmo que avanza el viaje.
 */
export function constellationStars(id: ConstellationId, count = DECISIONS_TO_ARRIVE): Array<[number, number]> {
  const pts = CONSTELLATIONS[id].anchors;
  // Longitud acumulada de cada tramo.
  const segLen: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segLen.push(d);
    total += d;
  }
  if (total === 0) return pts.slice(0, count).map((p) => [p[0], p[1]]);

  const out: Array<[number, number]> = [];
  for (let k = 0; k < count; k++) {
    // Reparto que incluye ambos extremos de la figura.
    const target = (k / Math.max(1, count - 1)) * total;
    let acc = 0;
    let i = 0;
    while (i < segLen.length - 1 && acc + segLen[i] < target) {
      acc += segLen[i];
      i++;
    }
    const f = segLen[i] === 0 ? 0 : (target - acc) / segLen[i];
    out.push([
      pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f,
      pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f,
    ]);
  }
  return out;
}

/**
 * ¿La revelación de la deriva incluye la NOTA además del acorde de tónica? (§2.6)
 *
 * El PLAN dice que sí. El Expreso Tonal acabó quitándola —Luis pidió que solo sonara el
 * acorde, porque "volver a soltar la nota la regala en vez de reanclar"—, pero aquí la
 * nota suele ser justo la que distingue una escala menor de otra, así que se mantiene.
 * Si al jugarlo convence más la versión del Expreso, basta poner esto en false.
 */
export const DRIFT_REVEAL_NOTE = true;
