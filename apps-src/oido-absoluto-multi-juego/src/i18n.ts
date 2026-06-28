export type Locale = "es" | "en";

export type InstrumentId = "Piano" | "Cello" | "Corno" | "Coro" | "Fagot" | "Aleatorio";

export const INSTRUMENTS: InstrumentId[] = ["Piano", "Cello", "Corno", "Coro", "Fagot", "Aleatorio"];

export const COPY = {
  es: {
    documentTitle: "Walking AP Multi — Oído Absoluto",
    eyebrow: "Entrenamiento Oído Absoluto",
    appTitle: "WALKING AP",
    appSubtitle: "Storm Studios Coclear Method",
    selectLevel: "Seleccionar Nivel",
    instrumentTone: "Timbre del Instrumento",
    back: "Volver",
    step1: "Paso 1 de 2",
    step2: "Paso 2 de 2",
    noteGroup: "Grupo de Notas",
    chooseGroup: "Elige el grupo de notas para entrenar el oído:",
    warmupTitle: "Calentamiento Auditivo",
    warmupCopy: "Presiona las teclas para memorizar la sensación coclear antes de jugar:",
    octave: "Octava",
    startGame: "¡COMENZAR JUEGO!",
    heardQuestion: "¿Qué nota escuchaste?",
    streak: "Racha",
    hits: "Aciertos",
    levelShort: "Lvl",
    exitToMenu: "Salir al Menú",
    correct: "¡CORRECTO!",
    wrong: "¡INCORRECTO!",
    correctSub: "+1 Acierto. Siguiente nota cargada.",
    wrongSub: "Racha reiniciada. Nota reubicada.",
    initialToastSub: "+1 Acierto",
    victoryTitle: "¡NIVEL COMPLETADO!",
    victoryBody: "Has logrado 20 aciertos consecutivos.",
    totalScore: "Puntaje Total",
    hitsLower: "aciertos",
    nextLevel: "Siguiente Nivel",
    mainMenu: "Volver al Menú Principal",
    instruments: {
      Piano: "Piano",
      Cello: "Cello",
      Corno: "Corno",
      Coro: "Coro",
      Fagot: "Fagot",
      Aleatorio: "Aleatorio",
    },
    levels: [
      { name: "La Pradera", menuSubtitle: "Cuarta aumentada." },
      { name: "El Océano", menuSubtitle: "Tercera mayor." },
      { name: "El Cosmos", menuSubtitle: "Tercera menor." },
      { name: "El Pantano", menuSubtitle: "Segunda mayor." },
      { name: "Las Nubes", menuSubtitle: "Escala cromática." },
    ],
    instructions: [
      "WASD / Flechas para girar. SPACE para caminar.<br>Camina hacia los cubos de colores.",
      "WASD para cabeceo/guiñada. QE para alabeo. SPACE para propulsión.<br>Nada hacia las burbujas.",
      "WASD para pitch/yaw. QE para roll. SPACE para empuje.<br>Vuela hacia los cristales espaciales.",
      "WASD para girar. SPACE para avanzar.<br>Camina por el fango hacia las luces fatuas.",
      "WASD para pitch/yaw. QE para roll. SPACE para volar.<br>Vuela hacia los globos aerostáticos.",
    ],
  },
  en: {
    documentTitle: "Walking AP Multi — Perfect Pitch",
    eyebrow: "Perfect Pitch Training",
    appTitle: "WALKING AP",
    appSubtitle: "Storm Studios Cochlear Method",
    selectLevel: "Select Level",
    instrumentTone: "Instrument Timbre",
    back: "Back",
    step1: "Step 1 of 2",
    step2: "Step 2 of 2",
    noteGroup: "Note Group",
    chooseGroup: "Choose the note group to train your ear:",
    warmupTitle: "Ear Warmup",
    warmupCopy: "Press the keys to memorize the cochlear sensation before playing:",
    octave: "Octave",
    startGame: "START GAME",
    heardQuestion: "Which note did you hear?",
    streak: "Streak",
    hits: "Hits",
    levelShort: "Lvl",
    exitToMenu: "Exit to Menu",
    correct: "CORRECT!",
    wrong: "WRONG!",
    correctSub: "+1 hit. Next note loaded.",
    wrongSub: "Streak reset. Note relocated.",
    initialToastSub: "+1 hit",
    victoryTitle: "LEVEL COMPLETE!",
    victoryBody: "You reached 20 consecutive correct answers.",
    totalScore: "Total Score",
    hitsLower: "hits",
    nextLevel: "Next Level",
    mainMenu: "Back to Main Menu",
    instruments: {
      Piano: "Piano",
      Cello: "Cello",
      Corno: "Horn",
      Coro: "Choir",
      Fagot: "Bassoon",
      Aleatorio: "Random",
    },
    levels: [
      { name: "The Meadow", menuSubtitle: "Augmented fourth." },
      { name: "The Ocean", menuSubtitle: "Major third." },
      { name: "The Cosmos", menuSubtitle: "Minor third." },
      { name: "The Swamp", menuSubtitle: "Major second." },
      { name: "The Clouds", menuSubtitle: "Chromatic scale." },
    ],
    instructions: [
      "WASD / arrow keys to turn. SPACE to walk.<br>Walk toward the colored cubes.",
      "WASD for pitch/yaw. QE to roll. SPACE for thrust.<br>Swim toward the bubbles.",
      "WASD for pitch/yaw. QE to roll. SPACE for thrust.<br>Fly toward the space crystals.",
      "WASD to turn. SPACE to move forward.<br>Wade through the mud toward the will-o'-the-wisps.",
      "WASD for pitch/yaw. QE to roll. SPACE to fly.<br>Fly toward the hot-air balloons.",
    ],
  },
} as const;

export type GameCopy = typeof COPY[Locale];

export function getLocale(): Locale {
  return new URLSearchParams(window.location.search).get("lang") === "en" ? "en" : "es";
}

export function applyDocumentLocale(locale: Locale = getLocale()): void {
  document.documentElement.lang = locale;
  document.title = COPY[locale].documentTitle;
}
