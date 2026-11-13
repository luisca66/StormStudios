export type Lang = "es" | "en";

export function detectLang(search = typeof window !== "undefined" ? window.location.search : ""): Lang {
  try {
    const params = new URLSearchParams(search);
    const raw = params.get("lang")?.toLowerCase();
    if (raw === "en") return "en";
  } catch {
    // Fallback a español
  }
  return "es";
}

export interface Strings {
  readonly appTitle: string;
  readonly homeSubtitle: string;
  readonly playButton: string;
  readonly howToPlayButton: string;
  readonly bestScore: (score: number) => string;
  readonly resetProgressButton: string;
  readonly resetDialogTitle: string;
  readonly resetDialogBody: string;
  readonly resetConfirm: string;
  readonly resetCancel: string;
  readonly instructionsTitle: string;
  readonly instructionsSteps: readonly string[];
  readonly instructionsMutationsTitle: string;
  readonly instructionsMutations: readonly string[];
  readonly instructionsFooter: string;
  readonly instructionsDismiss: string;
  readonly levelsTitle: string;
  readonly worldLabel: (num: number) => string;
  readonly worldSubtitleMaster: string;
  readonly backAria: string;
  readonly pauseAria: string;
  readonly levelHeader: string;
  readonly scoreHeader: string;
  readonly phaseMemorize: string;
  readonly phaseHidden: string;
  readonly phaseFind: string;
  readonly phaseResult: string;
  readonly level1Hint: string;
  readonly remainingTouches: (n: number) => string;
  readonly doneButton: string;
  readonly keyboardHint: string;
  readonly exitDialogTitle: string;
  readonly exitDialogBody: string;
  readonly exitConfirm: string;
  readonly exitCancel: string;
  readonly pauseDialogTitle: string;
  readonly pauseDialogBody: string;
  readonly pauseResume: string;
  readonly pauseExit: string;
  readonly gameOverTitle: string;
  readonly levelReached: string;
  readonly scoreLabel: string;
  readonly bestLabel: (score: number) => string;
  readonly newRecord: string;
  readonly retryButton: string;
  readonly levelsButton: string;
  readonly cellAria: (row: number, col: number, selected: boolean) => string;
}

const ES_STRINGS: Strings = {
  appTitle: "MUTACION",
  homeSubtitle: "Entrena tu memoria visual",
  playButton: "JUGAR",
  howToPlayButton: "Cómo jugar",
  bestScore: (score) => `Mejor puntuación: ${score}`,
  resetProgressButton: "Reiniciar progreso",
  resetDialogTitle: "Reiniciar progreso",
  resetDialogBody:
    "¿Reiniciar todo el progreso? Se bloquearán todos los niveles excepto el primero.",
  resetConfirm: "Reiniciar",
  resetCancel: "Cancelar",
  instructionsTitle: "Cómo jugar",
  instructionsSteps: [
    "1. MEMORIZA la cuadrícula de formas y colores",
    "2. La cuadrícula se ocultará brevemente y reaparecerá con cambios sutiles (mutaciones)",
    "3. TOCA las celdas que creas que cambiaron",
    '4. Presiona "Listo" cuando hayas encontrado todos los cambios',
  ],
  instructionsMutationsTitle: "Tipos de mutaciones:",
  instructionsMutations: [
    "Cambio de color",
    "Cambio de forma",
    "Intercambio de posición",
    "Rotación de forma",
    "Cambios sutiles de tono",
  ],
  instructionsFooter:
    "Tienes 3 vidas. Cada error te cuesta una vida. Encuentra todas las mutaciones para avanzar de nivel.",
  instructionsDismiss: "Entendido",
  levelsTitle: "NIVELES",
  worldLabel: (num) => `Mundo ${num}`,
  worldSubtitleMaster: "Modo maestro",
  backAria: "Volver",
  pauseAria: "Pausar (P)",
  levelHeader: "NIVEL",
  scoreHeader: "PUNTOS",
  phaseMemorize: "MEMORIZA",
  phaseHidden: "...",
  phaseFind: "ENCUENTRA LOS CAMBIOS",
  phaseResult: "RESULTADOS",
  level1Hint: "Toca la celda que cambió",
  remainingTouches: (n) => `Toques restantes: ${n}`,
  doneButton: "LISTO",
  keyboardHint: "Flechas: mover · Enter/Espacio: elegir · P: pausa",
  exitDialogTitle: "¿Salir del nivel?",
  exitDialogBody: "Perderás el progreso de esta ronda",
  exitConfirm: "Salir",
  exitCancel: "Continuar",
  pauseDialogTitle: "Juego en pausa",
  pauseDialogBody: "El temporizador está detenido.",
  pauseResume: "Continuar",
  pauseExit: "Salir del nivel",
  gameOverTitle: "GAME OVER",
  levelReached: "Nivel alcanzado",
  scoreLabel: "Puntuación",
  bestLabel: (score) => `Mejor: ${score}`,
  newRecord: "¡NUEVO RÉCORD!",
  retryButton: "REINTENTAR",
  levelsButton: "NIVELES",
  cellAria: (row, col, selected) =>
    `Fila ${row}, columna ${col}${selected ? ", seleccionada" : ""}`,
};

const EN_STRINGS: Strings = {
  appTitle: "MUTATION",
  homeSubtitle: "Train your visual memory",
  playButton: "PLAY",
  howToPlayButton: "How to play",
  bestScore: (score) => `Best score: ${score}`,
  resetProgressButton: "Reset progress",
  resetDialogTitle: "Reset progress",
  resetDialogBody:
    "Reset all progress? All levels except the first one will be locked.",
  resetConfirm: "Reset",
  resetCancel: "Cancel",
  instructionsTitle: "How to play",
  instructionsSteps: [
    "1. MEMORIZE the grid of shapes and colors",
    "2. The grid will hide briefly and reappear with subtle changes (mutations)",
    "3. TAP the cells you think changed",
    '4. Press "Done" when you have found all the changes',
  ],
  instructionsMutationsTitle: "Mutation types:",
  instructionsMutations: [
    "Color change",
    "Shape change",
    "Position swap",
    "Shape rotation",
    "Subtle shade changes",
  ],
  instructionsFooter:
    "You have 3 lives. Each mistake costs a life. Find all mutations to advance to the next level.",
  instructionsDismiss: "Got it",
  levelsTitle: "LEVELS",
  worldLabel: (num) => `World ${num}`,
  worldSubtitleMaster: "Master mode",
  backAria: "Back",
  pauseAria: "Pause (P)",
  levelHeader: "LEVEL",
  scoreHeader: "SCORE",
  phaseMemorize: "MEMORIZE",
  phaseHidden: "...",
  phaseFind: "FIND THE CHANGES",
  phaseResult: "RESULTS",
  level1Hint: "Tap the cell that changed",
  remainingTouches: (n) => `Remaining taps: ${n}`,
  doneButton: "DONE",
  keyboardHint: "Arrows: move · Enter/Space: select · P: pause",
  exitDialogTitle: "Exit level?",
  exitDialogBody: "You will lose your progress in this round",
  exitConfirm: "Exit",
  exitCancel: "Continue",
  pauseDialogTitle: "Game paused",
  pauseDialogBody: "The timer is paused.",
  pauseResume: "Resume",
  pauseExit: "Exit level",
  gameOverTitle: "GAME OVER",
  levelReached: "Level reached",
  scoreLabel: "Score",
  bestLabel: (score) => `Best: ${score}`,
  newRecord: "NEW RECORD!",
  retryButton: "RETRY",
  levelsButton: "LEVELS",
  cellAria: (row, col, selected) =>
    `Row ${row}, column ${col}${selected ? ", selected" : ""}`,
};

export function getStrings(lang: Lang): Strings {
  return lang === "en" ? EN_STRINGS : ES_STRINGS;
}
