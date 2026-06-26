/** i18n.ts — Cadenas ES/EN. El idioma llega por `?lang=` desde el wrapper Next. */

export type Lang = "es" | "en";

export function detectLang(): Lang {
  const param = new URLSearchParams(window.location.search).get("lang");
  return param === "en" ? "en" : "es";
}

interface Strings {
  splashTitle: string;
  splashTagline: string;
  splashStart: string;
  splashHint: string;
  sessionActive: string;
  sessionIdle: string;
  instrument: string;
  range: string;
  rangeStart: string;
  rangeEnd: string;
  chord: string;
  chordSize: string;
  notes: string;
  volume: string;
  volumeHint: string;
  newQuestion: string;
  repeat: string;
  muteNotes: string;
  listenAndAnswer: string;
  note: (n: number) => string;
  listening: string;
  promptStart: string;
  promptActive: string;
  stageReady: string;
  chordActive: string;
  // estados de marcador
  statePending: string;
  stateListening: string;
  stateSolved: string;
  stateMuted: string;
  // banners de resultado
  correct: (note: string) => string;
  incorrect: string;
  noClear: string;
  silence: string;
  notEnoughNotes: string;
  allMuted: string;
  listeningFor: (label: string) => string;
  micDenied: string;
  micError: string;
}

const ES: Strings = {
  splashTitle: "Desglose",
  splashTagline: "Aísla y canta cada nota dentro de un acorde.",
  splashStart: "Entrar al entrenamiento",
  splashHint: "Necesitamos tu micrófono para evaluar la afinación.",
  sessionActive: "Sesión activa",
  sessionIdle: "Sesión en espera",
  instrument: "Instrumento",
  range: "Rango",
  rangeStart: "Inicio",
  rangeEnd: "Fin",
  chord: "Acorde",
  chordSize: "Tamaño del acorde",
  notes: "notas",
  volume: "Volumen",
  volumeHint: "Bájalo si las muestras saturan en tu dispositivo.",
  newQuestion: "Nueva pregunta",
  repeat: "Repetir",
  muteNotes: "Silenciar notas",
  listenAndAnswer: "Escucha y responde",
  note: (n) => `Nota ${n}`,
  listening: "Escuchando…",
  promptStart: "Presiona Nueva pregunta para empezar",
  promptActive: "Escucha el acorde y canta las notas",
  stageReady: "Escenario listo",
  chordActive: "Acorde activo",
  statePending: "Preparada",
  stateListening: "Activa",
  stateSolved: "Lista",
  stateMuted: "Silenciada",
  correct: (note) => `Correcto. La nota era ${note}.`,
  incorrect: "Incorrecto. Inténtalo de nuevo.",
  noClear: "No se detectó una nota clara. Inténtalo de nuevo.",
  silence: "No se escuchó nada. Canta cerca del micrófono.",
  notEnoughNotes: "No hay suficientes notas en el rango para ese tamaño de acorde.",
  allMuted: "Todas las notas están silenciadas.",
  listeningFor: (label) => `Escuchando '${label}'…`,
  micDenied: "Permiso de micrófono denegado. Actívalo para responder.",
  micError: "No se pudo acceder al micrófono.",
};

const EN: Strings = {
  splashTitle: "Unlocking",
  splashTagline: "Isolate and sing each note inside a chord.",
  splashStart: "Enter the training",
  splashHint: "We need your microphone to evaluate pitch.",
  sessionActive: "Active session",
  sessionIdle: "Session idle",
  instrument: "Instrument",
  range: "Range",
  rangeStart: "Start",
  rangeEnd: "End",
  chord: "Chord",
  chordSize: "Chord size",
  notes: "notes",
  volume: "Volume",
  volumeHint: "Lower it if the samples distort on your device.",
  newQuestion: "New question",
  repeat: "Repeat",
  muteNotes: "Mute notes",
  listenAndAnswer: "Listen & answer",
  note: (n) => `Note ${n}`,
  listening: "Listening…",
  promptStart: "Press New question to start",
  promptActive: "Listen to the chord and sing the notes",
  stageReady: "Stage ready",
  chordActive: "Chord active",
  statePending: "Ready",
  stateListening: "Active",
  stateSolved: "Done",
  stateMuted: "Muted",
  correct: (note) => `Correct. The note was ${note}.`,
  incorrect: "Incorrect. Try again.",
  noClear: "No clear note detected. Try again.",
  silence: "Nothing was heard. Sing close to the microphone.",
  notEnoughNotes: "Not enough notes in the range for that chord size.",
  allMuted: "All notes are muted.",
  listeningFor: (label) => `Listening for '${label}'…`,
  micDenied: "Microphone permission denied. Enable it to answer.",
  micError: "Could not access the microphone.",
};

export function strings(lang: Lang): Strings {
  return lang === "en" ? EN : ES;
}
