// data.js — Teoría musical y textos para "Grados Escala Mayor"
// Portado fielmente de la app Android (MusicTheory.kt) de Storm Studios.

// Audio servido desde Cloudflare R2 (mismo bucket que las demás ear-training apps).
// Para desarrollo offline puedes cambiarlo a "audio" (folder local incluido en el repo).
export const AUDIO_BASE = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev";

// Tonalidades mayores disponibles (mismo orden que la app).
export const SCALES = ["C♭", "C", "C#", "D♭", "D", "E♭", "E", "F", "F#", "G♭", "G", "A♭", "A", "B♭", "B"];

// Grados diatónicos y cromáticos (los "colores" cromáticos del sistema Storm Studios).
export const DIATONIC_DEGREES = ["I", "II", "III", "IV", "V", "VI", "VII"];
export const CHROMATIC_DEGREES = ["IVly", "VImen", "IIfr", "VIIST", "IIImen"];
export const ALL_DEGREES_OPTIONS = [...DIATONIC_DEGREES, ...CHROMATIC_DEGREES];

// Timbres: nombre lógico -> carpeta en el bucket R2 (nombres capitalizados, compartidos
// con las otras apps). El folder local `audio/` usa estos mismos nombres tras renombrar.
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

// Inventario real de muestras (idéntico en los 5 timbres). 136 notas por timbre.
export const NOTE_FILES = ["A#2", "A#3", "A#4", "A#5", "A#6", "A♭♭2", "A♭♭3", "A♭♭4", "A♭♭5", "A♭♭6", "A♭2", "A♭3", "A♭4", "A♭5", "A♭6", "A2", "A3", "A4", "A5", "A6", "B#2", "B#3", "B#4", "B#5", "B#6", "B♭♭2", "B♭♭3", "B♭♭4", "B♭♭5", "B♭♭6", "B♭2", "B♭3", "B♭4", "B♭5", "B♭6", "B2", "B3", "B4", "B5", "B6", "C#2", "C#3", "C#4", "C#5", "C#6", "C♭3", "C♭4", "C♭5", "C♭6", "C♭7", "C2", "C3", "C4", "C5", "C6", "C7", "D#2", "D#3", "D#4", "D#5", "D#6", "D♭♭2", "D♭♭3", "D♭♭4", "D♭♭5", "D♭♭6", "D♭2", "D♭3", "D♭4", "D♭5", "D♭6", "D2", "D3", "D4", "D5", "D6", "E#2", "E#3", "E#4", "E#5", "E#6", "E♭♭2", "E♭♭3", "E♭♭4", "E♭♭5", "E♭♭6", "E♭2", "E♭3", "E♭4", "E♭5", "E♭6", "E2", "E3", "E4", "E5", "E6", "F##2", "F##3", "F##4", "F##5", "F##6", "F#2", "F#3", "F#4", "F#5", "F#6", "F♭2", "F♭3", "F♭4", "F♭5", "F♭6", "F2", "F3", "F4", "F5", "F6", "G#2", "G#3", "G#4", "G#5", "G#6", "G♭♭2", "G♭♭3", "G♭♭4", "G♭♭5", "G♭♭6", "G♭2", "G♭3", "G♭4", "G♭5", "G♭6", "G2", "G3", "G4", "G5", "G6"];

// Mapa grado tonal por tonalidad: tonalidad -> { pitchClass -> grado } (port literal de scaleDegrees).
export const scaleDegrees = {
  "C♭": { "C♭": "I", "D♭": "II", "D♭♭": "IIfr", "E♭": "III", "E♭♭": "IIImen", "F♭": "IV", "F": "IVly", "G♭": "V", "A♭": "VI", "A♭♭": "VImen", "B♭": "VII", "B♭♭": "VIIST" },
  "C": { "C": "I", "D": "II", "D♭": "IIfr", "E": "III", "E♭": "IIImen", "F": "IV", "F#": "IVly", "G": "V", "A": "VI", "A♭": "VImen", "B": "VII", "B♭": "VIIST" },
  "C#": { "C#": "I", "D#": "II", "D": "IIfr", "E#": "III", "E": "IIImen", "F#": "IV", "F##": "IVly", "G#": "V", "A#": "VI", "A": "VImen", "B#": "VII", "B": "VIIST" },
  "D♭": { "D♭": "I", "E♭": "II", "E♭♭": "IIfr", "F": "III", "F♭": "IIImen", "G♭": "IV", "G": "IVly", "A♭": "V", "B♭": "VI", "B♭♭": "VImen", "C": "VII", "C♭": "VIIST" },
  "D": { "D": "I", "E": "II", "E♭": "IIfr", "F#": "III", "F": "IIImen", "G": "IV", "G#": "IVly", "A": "V", "B": "VI", "B♭": "VImen", "C#": "VII", "C": "VIIST" },
  "E♭": { "E♭": "I", "F": "II", "F♭": "IIfr", "G": "III", "G♭": "IIImen", "A♭": "IV", "A": "IVly", "B♭": "V", "C": "VI", "C♭": "VImen", "D": "VII", "D♭": "VIIST" },
  "E": { "E": "I", "F#": "II", "F": "IIfr", "G#": "III", "G": "IIImen", "A": "IV", "A#": "IVly", "B": "V", "C#": "VI", "C": "VImen", "D#": "VII", "D": "VIIST" },
  "F": { "F": "I", "G": "II", "G♭": "IIfr", "A": "III", "A♭": "IIImen", "B♭": "IV", "B": "IVly", "C": "V", "D": "VI", "D♭": "VImen", "E": "VII", "E♭": "VIIST" },
  "F#": { "F#": "I", "G#": "II", "G": "IIfr", "A#": "III", "A": "IIImen", "B": "IV", "B#": "IVly", "C#": "V", "D#": "VI", "D": "VImen", "E#": "VII", "E": "VIIST" },
  "G♭": { "G♭": "I", "A♭": "II", "A♭♭": "IIfr", "B♭": "III", "B♭♭": "IIImen", "C♭": "IV", "C": "IVly", "D♭": "V", "E♭": "VI", "E♭♭": "VImen", "F": "VII", "F♭": "VIIST" },
  "G": { "G": "I", "A": "II", "A♭": "IIfr", "B": "III", "B♭": "IIImen", "C": "IV", "C#": "IVly", "D": "V", "E": "VI", "E♭": "VImen", "F#": "VII", "F": "VIIST" },
  "A♭": { "A♭": "I", "B♭": "II", "B♭♭": "IIfr", "C": "III", "C♭": "IIImen", "D♭": "IV", "D": "IVly", "E♭": "V", "F": "VI", "F♭": "VImen", "G": "VII", "G♭": "VIIST" },
  "A": { "A": "I", "B": "II", "B♭": "IIfr", "C#": "III", "C": "IIImen", "D": "IV", "D#": "IVly", "E": "V", "F#": "VI", "F": "VImen", "G#": "VII", "G": "VIIST" },
  "B♭": { "B♭": "I", "C": "II", "C♭": "IIfr", "D": "III", "D♭": "IIImen", "E♭": "IV", "E": "IVly", "F": "V", "G": "VI", "G♭": "VImen", "A": "VII", "A♭": "VIIST" },
  "B": { "B": "I", "C#": "II", "C": "IIfr", "D#": "III", "D": "IIImen", "E": "IV", "E#": "IVly", "F#": "V", "G#": "VI", "G": "VImen", "A#": "VII", "A": "VIIST" },
};

// Las 15 tonalidades tienen acorde mayor de referencia (carpeta "Major Chords").
export const CHORD_TONICS = SCALES;

// Glosario de los grados cromáticos (se muestra como leyenda y tooltips).
export const DEGREE_GLOSSARY = {
  I:      { es: "Tónica", en: "Tonic" },
  II:     { es: "Supertónica", en: "Supertonic" },
  III:    { es: "Mediante", en: "Mediant" },
  IV:     { es: "Subdominante", en: "Subdominant" },
  V:      { es: "Dominante", en: "Dominant" },
  VI:     { es: "Superdominante", en: "Submediant" },
  VII:    { es: "Sensible", en: "Leading tone" },
  IVly:   { es: "IV lidio (#4)", en: "Lydian IV (#4)" },
  VImen:  { es: "VI menor (♭6)", en: "Minor VI (♭6)" },
  IIfr:   { es: "II frigio (♭2)", en: "Phrygian II (♭2)" },
  VIIST:  { es: "VII subtónica (♭7)", en: "Subtonic VII (♭7)" },
  IIImen: { es: "III menor (♭3)", en: "Minor III (♭3)" },
};

// Textos de interfaz bilingües.
export const I18N = {
  es: {
    appTitle: "Grados Escala Mayor",
    appTagline: "Entrenamiento auditivo profesional para reconocer grados de las escalas mayores.",
    creditsTitle: "Créditos",
    creditsBody: "Desarrollada por Luis Cárdenas para Storm Studios Learning",
    visitWebsite: "Visitar website",
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
    majorScale: "Escala mayor",
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
    tonalCenterHelp: "Usa los acordes mayores para reubicar el oído cuando lo necesites.",
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
    appTitle: "Major Scale Degrees",
    appTagline: "Professional ear training to recognize the degrees of major scales.",
    creditsTitle: "Credits",
    creditsBody: "Developed by Luis Cárdenas for Storm Studios Learning",
    visitWebsite: "Visit website",
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
    majorScale: "Major scale",
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
    tonalCenterHelp: "Use the major chords to re-center your ear whenever you need it.",
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
