// data.js - Teoria musical y textos para "Grados Escala Menor".
// Portado desde la app Android appgradosmenoresmulti de Storm Studios.

// Audio servido desde Cloudflare R2 (mismo bucket que las demás ear-training apps).
export const AUDIO_BASE = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev";

// Tonalidades menores disponibles (mismo orden que la app Android).
export const SCALES = [
  "Am", "Em", "Bm", "F#m", "C#m", "G#m", "D#m", "A#m",
  "Dm", "Gm", "Cm", "Fm", "B♭m", "E♭m", "A♭m",
];

// Grados diatónicos y cromáticos del sistema Storm Studios para modo menor.
export const DIATONIC_DEGREES = ["I", "II", "III", "IV", "V", "VI", "VIIST"];
export const CHROMATIC_DEGREES = ["IIfr", "IVly", "VImel", "VIIsen"];
export const ALL_DEGREES_OPTIONS = ["I", "II", "IIfr", "III", "IV", "IVly", "V", "VI", "VImel", "VIIST", "VIIsen"];

// Timbres: nombre lógico -> carpeta en el bucket R2.
// La Android usa "cello/corno" localmente; en R2 esas carpetas viven capitalizadas.
export const BASE_TIMBRES = ["Piano", "Cello", "Corno", "Coro", "Fagot"];
export const RANDOM_TIMBRE = "Aleatorio";
export const TIMBRES = [...BASE_TIMBRES, RANDOM_TIMBRE];

export const TIMBRE_DIRS = {
  Piano: "Piano",
  Cello: "Cello",
  Corno: "Corno",
  Coro: "Coro",
  Fagot: "Fagot",
};

// Inventario real de muestras útiles. R2 no tiene C♭2, así que se omite esa
// octava; C## y G## se conservan y se resuelven por fallback enharmónico.
export const NOTE_FILES = ["A#2","A#3","A#4","A#5","A#6","A♭2","A♭3","A♭4","A♭5","A♭6","A2","A3","A4","A5","A6","B#2","B#3","B#4","B#5","B#6","B♭♭2","B♭♭3","B♭♭4","B♭♭5","B♭♭6","B♭2","B♭3","B♭4","B♭5","B♭6","B2","B3","B4","B5","B6","C##2","C##3","C##4","C##5","C##6","C#2","C#3","C#4","C#5","C#6","C♭3","C♭4","C♭5","C♭6","C♭7","C2","C3","C4","C5","C6","C7","D##2","D##3","D##4","D##5","D##6","D#2","D#3","D#4","D#5","D#6","D♭2","D♭3","D♭4","D♭5","D♭6","D2","D3","D4","D5","D6","E#2","E#3","E#4","E#5","E#6","E♭2","E♭3","E♭4","E♭5","E♭6","E2","E3","E4","E5","E6","F##2","F##3","F##4","F##5","F##6","F#2","F#3","F#4","F#5","F#6","F♭2","F♭3","F♭4","F♭5","F♭6","F2","F3","F4","F5","F6","G##2","G##3","G##4","G##5","G##6","G#2","G#3","G#4","G#5","G#6","G♭2","G♭3","G♭4","G♭5","G♭6","G2","G3","G4","G5","G6"];

// Mapa grado tonal por tonalidad menor: tonalidad -> { pitchClass -> grado }.
export const scaleDegrees = {
  "Am": { "A": "I", "B": "II", "B♭": "IIfr", "C": "III", "D": "IV", "D#": "IVly", "E": "V", "F": "VI", "F#": "VImel", "G": "VIIST", "G#": "VIIsen" },
  "Em": { "E": "I", "F#": "II", "F": "IIfr", "G": "III", "A": "IV", "A#": "IVly", "B": "V", "C": "VI", "C#": "VImel", "D": "VIIST", "D#": "VIIsen" },
  "Bm": { "B": "I", "C#": "II", "C": "IIfr", "D": "III", "E": "IV", "E#": "IVly", "F#": "V", "G": "VI", "G#": "VImel", "A": "VIIST", "A#": "VIIsen" },
  "F#m": { "F#": "I", "G#": "II", "G": "IIfr", "A": "III", "B": "IV", "B#": "IVly", "C#": "V", "D": "VI", "D#": "VImel", "E": "VIIST", "E#": "VIIsen" },
  "C#m": { "C#": "I", "D#": "II", "D": "IIfr", "E": "III", "F#": "IV", "F##": "IVly", "G#": "V", "A": "VI", "A#": "VImel", "B": "VIIST", "B#": "VIIsen" },
  "G#m": { "G#": "I", "A#": "II", "A": "IIfr", "B": "III", "C#": "IV", "C##": "IVly", "D#": "V", "E": "VI", "E#": "VImel", "F#": "VIIST", "F##": "VIIsen" },
  "D#m": { "D#": "I", "E#": "II", "E": "IIfr", "F#": "III", "G#": "IV", "G##": "IVly", "A#": "V", "B": "VI", "B#": "VImel", "C#": "VIIST", "C##": "VIIsen" },
  "A#m": { "A#": "I", "B#": "II", "B": "IIfr", "C#": "III", "D#": "IV", "E##": "IVly", "E#": "V", "F#": "VI", "F##": "VImel", "G#": "VIIST", "G##": "VIIsen" },
  "Dm": { "D": "I", "E": "II", "E♭": "IIfr", "F": "III", "G": "IV", "G#": "IVly", "A": "V", "B♭": "VI", "B": "VImel", "C": "VIIST", "C#": "VIIsen" },
  "Gm": { "G": "I", "A": "II", "A♭": "IIfr", "B♭": "III", "C": "IV", "C#": "IVly", "D": "V", "E♭": "VI", "E": "VImel", "F": "VIIST", "F#": "VIIsen" },
  "Cm": { "C": "I", "D": "II", "D♭": "IIfr", "E♭": "III", "F": "IV", "F#": "IVly", "G": "V", "A♭": "VI", "A": "VImel", "B♭": "VIIST", "B": "VIIsen" },
  "Fm": { "F": "I", "G": "II", "G♭": "IIfr", "A♭": "III", "B♭": "IV", "B": "IVly", "C": "V", "D♭": "VI", "D": "VImel", "E♭": "VIIST", "E": "VIIsen" },
  "B♭m": { "B♭": "I", "C": "II", "C♭": "IIfr", "D♭": "III", "E♭": "IV", "E": "IVly", "F": "V", "G♭": "VI", "G": "VImel", "A♭": "VIIST", "A": "VIIsen" },
  "E♭m": { "E♭": "I", "F": "II", "F♭": "IIfr", "G♭": "III", "A♭": "IV", "A": "IVly", "B♭": "V", "C♭": "VI", "C": "VImel", "D♭": "VIIST", "D": "VIIsen" },
  "A♭m": { "A♭": "I", "B♭": "II", "B♭♭": "IIfr", "C♭": "III", "D♭": "IV", "D": "IVly", "E♭": "V", "F♭": "VI", "F": "VImel", "G♭": "VIIST", "G": "VIIsen" },
};

// Las 15 tonalidades tienen acorde menor de referencia (carpeta "Minor Chords").
export const CHORD_TONICS = SCALES;

export function minorChordFileName(scale) {
  return `${scale.endsWith("m") ? scale.slice(0, -1) : scale}minor.mp3`;
}

// Glosario de grados.
export const DEGREE_GLOSSARY = {
  I:      { es: "Tónica", en: "Tonic" },
  II:     { es: "Supertónica", en: "Supertonic" },
  IIfr:   { es: "II frigio (♭2)", en: "Phrygian II (♭2)" },
  III:    { es: "Mediante", en: "Mediant" },
  IV:     { es: "Subdominante", en: "Subdominant" },
  IVly:   { es: "IV lidio (#4)", en: "Lydian IV (#4)" },
  V:      { es: "Dominante", en: "Dominant" },
  VI:     { es: "Superdominante", en: "Submediant" },
  VImel:  { es: "VI melódico (#6)", en: "Melodic VI (#6)" },
  VIIST:  { es: "VII subtónica (♭7)", en: "Subtonic VII (♭7)" },
  VIIsen: { es: "VII sensible (#7)", en: "Leading-tone VII (#7)" },
};

// Textos de interfaz bilingües.
export const I18N = {
  es: {
    appTitle: "Grados Escala Menor",
    appTagline: "Entrenamiento auditivo profesional para reconocer grados de las escalas menores.",
    creditsTitle: "Créditos",
    creditsBody: "Desarrollada por Luis Cárdenas para Storm Studios Learning",
    start: "Comenzar",

    chooseExperience: "Elige una experiencia",
    chooseSubtitle: "Selecciona el modo de entrenamiento y continúa desde ahí.",
    quickSummary: "Resumen rápido",
    attempts: "Intentos",
    accuracy: "Precisión",
    mostUsed: "Más usado",
    configure: "Configurar",
    statsTitle: "Estadísticas",
    statsSubtitle: "Revisa tu progreso histórico por grado.",
    viewProgress: "Ver progreso",

    setupTitle: "Configuración de sesión",
    selectedMode: "Modo seleccionado",
    duration: "Duración",
    keyAndTimbre: "Tonalidad y timbre",
    minorScale: "Escala menor",
    timbre: "Timbre",
    diatonicDegrees: "Grados diatónicos",
    chromaticColor: "Color cromático",
    onlyDiatonic: "Solo diatónicos",
    all: "Todo",
    sessionSummary: "Resumen de sesión",
    mode: "Modo",
    samples: "Muestras",
    key: "Escala",
    selectAtLeastOne: "Selecciona al menos un grado para habilitar la sesión.",
    activeDegrees: "Grados activos",
    startSession: "Iniciar",
    back: "Volver",

    sessionPrefix: "Sesión",
    sessionTitles: {
      CLASSIC: "Sesión clásica",
      TIME_ATTACK: "Sesión contrarreloj",
      SURVIVAL: "Sesión de supervivencia",
    },
    context: "Contexto",
    markers: "Marcadores",
    hits: "Aciertos",
    streak: "Racha",
    time: "Tiempo",
    points: "Puntos",
    controls: "Controles",
    listenNew: "Escuchar nueva",
    replay: "Repetir",
    loopActive: "Bucle activo",
    answer: "Respuesta",
    pickAnswer: "Selección de respuesta",
    sessionAccuracy: "Precisión de sesión",
    tonalCenter: "Centro tonal",
    tonalCenterHelp: "Usa los acordes menores para reubicar el oído cuando lo necesites.",
    sessionFinished: "Sesión finalizada",
    restart: "Reiniciar",
    exitSession: "Salir de la sesión",
    promptStart: "Pulsa \"Escuchar nueva\" para empezar.",
    promptListen: "Escucha con foco y responde el grado.",
    noSamples: "No hay muestras disponibles para esta sesión.",
    timeUp: "Tiempo agotado. Reinicia para volver a intentarlo.",
    correctMsg: (note, degree) => `Correcto. Era ${note} (${degree}).`,
    wrongMsg: (note, degree) => `Incorrecto. Era ${note} (${degree}).`,
    classicOpen: "La sesión clásica sigue abierta hasta que salgas.",
    timeAttackDone: (s) => `Contrarreloj terminado con ${s} puntos.`,
    survivalDone: (s) => `Supervivencia terminada con ${s} puntos.`,

    historyTitle: "Resumen histórico",
    mostPracticed: "Más practicado",
    noProgressTitle: "Aún no hay progreso",
    noProgressBody: "Completa algunas sesiones para empezar a ver precisión por grado.",
    clearStats: "Borrar todas las estadísticas",
    clearConfirmTitle: "Borrar progreso",
    clearConfirmBody: "Esta acción eliminará todas las estadísticas guardadas.",
    delete: "Borrar",
    cancel: "Cancelar",
    legend: "Leyenda de grados",

    modes: {
      CLASSIC: { title: "Clásico", subtitle: "Trabaja con calma y mide tu precisión por sesión." },
      TIME_ATTACK: { title: "Contrarreloj", subtitle: "Identifica grados rápido antes de que termine el tiempo." },
      SURVIVAL: { title: "Supervivencia", subtitle: "Cada error cuesta una vida. Mantente en juego." },
    },
    randomTimbre: "Aleatorio",
  },
  en: {
    appTitle: "Minor Scale Degrees",
    appTagline: "Professional ear training to recognize the degrees of minor scales.",
    creditsTitle: "Credits",
    creditsBody: "Developed by Luis Cárdenas for Storm Studios Learning",
    start: "Start",

    chooseExperience: "Choose an experience",
    chooseSubtitle: "Select the training mode and continue from there.",
    quickSummary: "Quick summary",
    attempts: "Attempts",
    accuracy: "Accuracy",
    mostUsed: "Most used",
    configure: "Configure",
    statsTitle: "Statistics",
    statsSubtitle: "Review your historical progress by degree.",
    viewProgress: "View progress",

    setupTitle: "Session setup",
    selectedMode: "Selected mode",
    duration: "Duration",
    keyAndTimbre: "Key and timbre",
    minorScale: "Minor scale",
    timbre: "Timbre",
    diatonicDegrees: "Diatonic degrees",
    chromaticColor: "Chromatic color",
    onlyDiatonic: "Diatonic only",
    all: "All",
    sessionSummary: "Session summary",
    mode: "Mode",
    samples: "Samples",
    key: "Key",
    selectAtLeastOne: "Select at least one degree to enable the session.",
    activeDegrees: "Active degrees",
    startSession: "Start",
    back: "Back",

    sessionPrefix: "Session",
    sessionTitles: {
      CLASSIC: "Classic session",
      TIME_ATTACK: "Time attack session",
      SURVIVAL: "Survival session",
    },
    context: "Context",
    markers: "Scoreboard",
    hits: "Correct",
    streak: "Streak",
    time: "Time",
    points: "Points",
    controls: "Controls",
    listenNew: "Play new",
    replay: "Replay",
    loopActive: "Loop on",
    answer: "Answer",
    pickAnswer: "Pick your answer",
    sessionAccuracy: "Session accuracy",
    tonalCenter: "Tonal center",
    tonalCenterHelp: "Use the minor chords to re-center your ear whenever you need it.",
    sessionFinished: "Session finished",
    restart: "Restart",
    exitSession: "Exit session",
    promptStart: "Press \"Play new\" to begin.",
    promptListen: "Listen carefully and answer the degree.",
    noSamples: "No samples available for this session.",
    timeUp: "Time's up. Restart to try again.",
    correctMsg: (note, degree) => `Correct. It was ${note} (${degree}).`,
    wrongMsg: (note, degree) => `Wrong. It was ${note} (${degree}).`,
    classicOpen: "The classic session stays open until you leave.",
    timeAttackDone: (s) => `Time attack finished with ${s} points.`,
    survivalDone: (s) => `Survival finished with ${s} points.`,

    historyTitle: "Historical summary",
    mostPracticed: "Most practiced",
    noProgressTitle: "No progress yet",
    noProgressBody: "Complete a few sessions to start seeing accuracy by degree.",
    clearStats: "Clear all statistics",
    clearConfirmTitle: "Clear progress",
    clearConfirmBody: "This action will remove all saved statistics.",
    delete: "Delete",
    cancel: "Cancel",
    legend: "Degree legend",

    modes: {
      CLASSIC: { title: "Classic", subtitle: "Work calmly and measure your accuracy per session." },
      TIME_ATTACK: { title: "Time attack", subtitle: "Identify degrees fast before time runs out." },
      SURVIVAL: { title: "Survival", subtitle: "Each mistake costs a life. Stay in the game." },
    },
    randomTimbre: "Random",
  },
};

export const MODE_KEYS = ["CLASSIC", "TIME_ATTACK", "SURVIVAL"];
export const TIME_ATTACK_OPTIONS = [60, 90, 120];
export const SURVIVAL_LIVES = 3;
