export interface Challenge {
  rootDisplay: string;
  rootMidi: number;
  answer: string;
  direction: number; // 1 = asc, -1 = desc
  intervalKey?: string; // e.g. "5J" — set per-challenge so mixed ("ALL") mode knows each target
}

export const ALL_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// 42 explicit challenges for Perfect Fifth (5J)
export const CHALLENGES_5J: [string, number, string, number][] = [
  // ── ASCENDING (D3 → C♭4) ──────────────────────────────────────
  ["D",   50, "A",   1],
  ["D#",  51, "A#",  1],
  ["D♭",  49, "A♭",  1],
  ["E",   52, "B",   1],
  ["E#",  53, "B#",  1],
  ["E♭",  51, "B♭",  1],
  ["F",   53, "C",   1],
  ["F#",  54, "C#",  1],
  ["F♭",  52, "C♭",  1],
  ["G",   55, "D",   1],
  ["G#",  56, "D#",  1],
  ["G♭",  54, "D♭",  1],
  ["A",   57, "E",   1],
  ["A#",  58, "E#",  1],
  ["A♭",  56, "E♭",  1],
  ["B",   59, "F#",  1],
  ["B#",  60, "F##", 1],
  ["B♭",  58, "F",   1],
  ["C",   60, "G",   1],
  ["C#",  61, "G#",  1],
  ["C♭",  59, "G♭",  1],
  // ── DESCENDING (D5 → E♭4) ─────────────────────────────────────
  ["D",   74, "G",   -1],
  ["D#",  75, "G#",  -1],
  ["D♭",  73, "G♭",  -1],
  ["C",   72, "F",   -1],
  ["C#",  73, "F#",  -1],
  ["C♭",  71, "F♭",  -1],
  ["B",   71, "E",   -1],
  ["B#",  72, "E#",  -1],
  ["B♭",  70, "E♭",  -1],
  ["A",   69, "D",   -1],
  ["A#",  70, "D#",  -1],
  ["A♭",  68, "D♭",  -1],
  ["G",   67, "C",   -1],
  ["G#",  68, "C#",  -1],
  ["G♭",  66, "C♭",  -1],
  ["F",   65, "B♭",  -1],
  ["F#",  66, "B",   -1],
  ["F♭",  64, "B♭♭", -1],
  ["E",   64, "A",   -1],
  ["E#",  65, "A#",  -1],
  ["E♭",  63, "A♭",  -1],
];

// 42 explicit challenges for Perfect Fourth (4J)
export const CHALLENGES_4J: [string, number, string, number][] = [
  // ── ASCENDING (D3 → C♭4) ──────────────────────────────────────
  ["D",   50, "G",    1],
  ["D#",  51, "G#",   1],
  ["D♭",  49, "G♭",   1],
  ["E",   52, "A",    1],
  ["E#",  53, "A#",   1],
  ["E♭",  51, "A♭",   1],
  ["F",   53, "B♭",   1],
  ["F#",  54, "B",    1],
  ["F♭",  52, "B♭♭",  1],
  ["G",   55, "C",    1],
  ["G#",  56, "C#",   1],
  ["G♭",  54, "C♭",   1],
  ["A",   57, "D",    1],
  ["A#",  58, "D#",   1],
  ["A♭",  56, "D♭",   1],
  ["B",   59, "E",    1],
  ["B#",  60, "E#",   1],
  ["B♭",  58, "E♭",   1],
  ["C",   60, "F",    1],
  ["C#",  61, "F#",   1],
  ["C♭",  59, "F♭",   1],
  // ── DESCENDING (D5 → E♭4) ─────────────────────────────────────
  ["D",   74, "A",    -1],
  ["D#",  75, "A#",   -1],
  ["D♭",  73, "A♭",   -1],
  ["C",   72, "G",    -1],
  ["C#",  73, "G#",   -1],
  ["C♭",  71, "G♭",   -1],
  ["B",   71, "F#",   -1],
  ["B#",  72, "F##",  -1],
  ["B♭",  70, "F",    -1],
  ["A",   69, "E",    -1],
  ["A#",  70, "E#",   -1],
  ["A♭",  68, "E♭",   -1],
  ["G",   67, "D",    -1],
  ["G#",  68, "D#",   -1],
  ["G♭",  66, "D♭",   -1],
  ["F",   65, "C",    -1],
  ["F#",  66, "C#",   -1],
  ["F♭",  64, "C♭",   -1],
  ["E",   64, "B",    -1],
  ["E#",  65, "B#",   -1],
  ["E♭",  63, "B♭",   -1],
];

export const INTERVALS: Record<string, number> = {
  "5J": 7,
  "4J": 5,
  "3M": 4,
  "3m": 3,
  "6M": 9,
  "6m": 8,
  "2M": 2,
  "2m": 1,
  "7M": 11,
  "7m": 10,
  "9M": 14,
  "9m": 13
};

export const INTERVAL_LETTER_STEPS: Record<string, number> = {
  "2M": 1,
  "2m": 1,
  "3M": 2,
  "3m": 2,
  "4J": 3,
  "5J": 4,
  "6M": 5,
  "6m": 5,
  "7M": 6,
  "7m": 6,
  "9M": 1,
  "9m": 1
};

export const LEVEL_INTERVALS: Record<number, string> = {
  1: "5J", 2: "4J", 3: "3M", 4: "3m",
  5: "6M", 6: "6m", 7: "2M", 8: "2m",
  9: "7M", 10: "7m", 11: "9M", 12: "9m",
  13: "ALL"
};

export const LEVEL_NAMES: Record<number, string> = {
  1: "Nivel 1 — 5ª Justa",
  2: "Nivel 2 — 4ª Justa",
  3: "Nivel 3 — 3ª Mayor",
  4: "Nivel 4 — 3ª Menor",
  5: "Nivel 5 — 6ª Mayor",
  6: "Nivel 6 — 6ª Menor",
  7: "Nivel 7 — 2ª Mayor",
  8: "Nivel 8 — 2ª Menor",
  9: "Nivel 9 — 7ª Mayor",
  10: "Nivel 10 — 7ª Menor",
  11: "Nivel 11 — 9ª Mayor",
  12: "Nivel 12 — 9ª Menor",
  13: "Nivel 13 — Aleatorio"
};

export function midiToFreq(midiNumber: number): number {
  return 440.0 * Math.pow(2.0, (midiNumber - 69.0) / 12.0);
}

// Map midi note name to MIDI number (0-127)
export function noteNameToMidi(noteName: string): number {
  const normalized = normalizeNoteSpelling(noteName);
  if (!normalized) return -1;
  const base = normalized[0];
  const alt = normalized.slice(1);
  const baseMap: Record<string, number> = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };
  let midi = baseMap[base];
  if (alt === "bb" || alt === "♭♭") {
    midi -= 2;
  } else if (alt === "b" || alt === "♭") {
    midi -= 1;
  } else if (alt === "##" || alt === "x" || alt === "𝄪") {
    midi += 2;
  } else if (alt === "#" || alt === "♯") {
    midi += 1;
  }
  return ((midi % 12) + 12) % 12;
}

export function formatAccidentalSuffix(offset: number): string {
  switch (offset) {
    case -2: return "♭♭";
    case -1: return "♭";
    case 0: return "";
    case 1: return "#";
    case 2: return "##";
    default: return "";
  }
}

export function spellIntervalNote(
  rootDisplay: string,
  rootMidi: number,
  semitones: number,
  direction: number,
  letterSteps: number
): string {
  const normalizedNote = rootDisplay.replace("♭", "b").replace("♯", "#").replace("𝄪", "##").replace("x", "##");
  if (normalizedNote.length === 0) return rootDisplay;

  const letters = ["C", "D", "E", "F", "G", "A", "B"];
  const naturalPcMap: Record<string, number> = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };
  
  const letter = normalizedNote.charAt(0);
  const rootLetterIdx = letters.indexOf(letter);
  if (rootLetterIdx === -1) return rootDisplay;

  const targetLetterIdx = (rootLetterIdx + direction * letterSteps) % letters.length;
  const targetLetter = letters[(targetLetterIdx + letters.length) % letters.length];
  
  const targetMidi = rootMidi + semitones * direction;
  const targetPc = ((targetMidi % 12) + 12) % 12;
  
  let accidentalOffset = targetPc - naturalPcMap[targetLetter];
  while (accidentalOffset > 2) accidentalOffset -= 12;
  while (accidentalOffset < -2) accidentalOffset += 12;

  return targetLetter + formatAccidentalSuffix(accidentalOffset);
}

export function normalizeNoteSpelling(note: string): string {
  let normalized = note.trim();
  // Use global regex: a note can carry two identical accidental glyphs (e.g. "E♭♭"),
  // and String.replace with a plain string only swaps the first occurrence.
  normalized = normalized.replace(/𝄫/g, "bb"); // double flat glyph (before single ♭)
  normalized = normalized.replace(/🝆/g, "bb"); // double flat variants
  normalized = normalized.replace(/🝇/g, "bb");
  normalized = normalized.replace(/♭/g, "b");
  normalized = normalized.replace(/𝄪/g, "##"); // double sharp glyph (before single ♯)
  normalized = normalized.replace(/🝄/g, "##"); // double sharp variant
  normalized = normalized.replace(/♯/g, "#");
  normalized = normalized.replace(/x/g, "##");
  if (normalized.length === 0) return "";

  const base = normalized.charAt(0).toUpperCase();
  if (!["A", "B", "C", "D", "E", "F", "G"].includes(base)) return "";

  const accidental = normalized.slice(1);
  if (!["", "b", "bb", "#", "##"].includes(accidental)) return "";

  return base + accidental;
}

export function noteSpellingMatches(submittedNote: string, correctNote: string): boolean {
  const submitted = normalizeNoteSpelling(submittedNote);
  const correct = normalizeNoteSpelling(correctNote);
  return submitted !== "" && submitted === correct;
}

export function getChallengesForInterval(intervalKey: string): Challenge[] {
  if (intervalKey === "ALL") {
    // Random mode: sample a few challenges from every interval, tagged individually
    const mixed: Challenge[] = [];
    for (const key of Object.keys(INTERVALS)) {
      mixed.push(...shuffle(getChallengesForInterval(key)).slice(0, 3));
    }
    return shuffle(mixed);
  }
  if (intervalKey === "5J") {
    return CHALLENGES_5J.map(([root, midi, ans, dir]) => ({
      rootDisplay: root,
      rootMidi: midi,
      answer: ans,
      direction: dir,
      intervalKey: "5J"
    }));
  }
  if (intervalKey === "4J") {
    return CHALLENGES_4J.map(([root, midi, ans, dir]) => ({
      rootDisplay: root,
      rootMidi: midi,
      answer: ans,
      direction: dir,
      intervalKey: "4J"
    }));
  }

  const semitones = INTERVALS[intervalKey];
  if (semitones === undefined) return [];
  const letterSteps = INTERVAL_LETTER_STEPS[intervalKey] ?? 0;

  return CHALLENGES_5J.map(([root, midi, , dir]) => ({
    rootDisplay: root,
    rootMidi: midi,
    answer: spellIntervalNote(root, midi, semitones, dir, letterSteps),
    direction: dir,
    intervalKey
  }));
}

// Convert MIDI number to note name with octave
export function midiToNoteWithOctave(midiNumber: number): string {
  const octave = Math.floor(midiNumber / 12) - 1;
  const pc = ((midiNumber % 12) + 12) % 12;
  return `${ALL_NOTES[pc]}${octave}`;
}

export function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
