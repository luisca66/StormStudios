export type Direction = "asc" | "desc";

export interface IntervalDef {
  id:
    | "FIFTH"
    | "FOURTH"
    | "THIRD_MAJOR"
    | "THIRD_MINOR"
    | "SECOND_MAJOR"
    | "SECOND_MINOR"
    | "SIXTH_MAJOR"
    | "SIXTH_MINOR"
    | "SEVENTH_MAJOR"
    | "SEVENTH_MINOR"
    | "FOURTH_AUGMENTED";
  es: string;
  en: string;
  abbr: string;
  degree: number;
  semitones: number;
}

export interface Question {
  interval: IntervalDef;
  direction: Direction;
  startNote: string;
  expected: string;
  statKey: string;
}

export interface ParsedNote {
  letter: string;
  accidentalText: string;
  accidental: number;
  octave: number;
}

export interface PitchGrade {
  pitchCorrect: boolean;
  noteClassCorrect: boolean;
  detectedName: string | null;
  deviation?: number;
}

export const INTERVALS: IntervalDef[] = [
  { id: "FIFTH", es: "Quinta Justa", en: "Perfect Fifth", abbr: "P5", degree: 5, semitones: 7 },
  { id: "FOURTH", es: "Cuarta Justa", en: "Perfect Fourth", abbr: "P4", degree: 4, semitones: 5 },
  { id: "THIRD_MAJOR", es: "Tercera Mayor", en: "Major Third", abbr: "M3", degree: 3, semitones: 4 },
  { id: "THIRD_MINOR", es: "Tercera Menor", en: "Minor Third", abbr: "m3", degree: 3, semitones: 3 },
  { id: "SECOND_MAJOR", es: "Segunda Mayor", en: "Major Second", abbr: "M2", degree: 2, semitones: 2 },
  { id: "SECOND_MINOR", es: "Segunda Menor", en: "Minor Second", abbr: "m2", degree: 2, semitones: 1 },
  { id: "SIXTH_MAJOR", es: "Sexta Mayor", en: "Major Sixth", abbr: "M6", degree: 6, semitones: 9 },
  { id: "SIXTH_MINOR", es: "Sexta Menor", en: "Minor Sixth", abbr: "m6", degree: 6, semitones: 8 },
  { id: "SEVENTH_MAJOR", es: "Septima Mayor", en: "Major Seventh", abbr: "M7", degree: 7, semitones: 11 },
  { id: "SEVENTH_MINOR", es: "Septima Menor", en: "Minor Seventh", abbr: "m7", degree: 7, semitones: 10 },
  { id: "FOURTH_AUGMENTED", es: "Cuarta Aumentada", en: "Augmented Fourth", abbr: "A4", degree: 4, semitones: 6 },
];

export const INTERVAL_BY_ID = Object.fromEntries(
  INTERVALS.map((interval) => [interval.id, interval]),
) as Record<IntervalDef["id"], IntervalDef>;

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL_PITCH_CLASS: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};
const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export const ASC_START_NOTES = [
  "G2",
  "Ab2",
  "G#2",
  "A2",
  "A#2",
  "Bb2",
  "B2",
  "Cb3",
  "B#2",
  "C3",
  "C#3",
  "Db3",
  "D3",
  "D#3",
  "Eb3",
  "E3",
  "Fb3",
  "F3",
  "E#3",
  "F#3",
  "Gb3",
];

export const DESC_START_NOTES = ASC_START_NOTES.map((note) => shiftOctave(note, 1));

export function parseNote(note: string): ParsedNote {
  const letter = note[0]?.toUpperCase() ?? "C";
  let accidentalText = "";
  let octaveText = "";
  for (const char of note.slice(1)) {
    if (char >= "0" && char <= "9") octaveText += char;
    else accidentalText += char;
  }
  let accidental = 0;
  for (const char of accidentalText) {
    if (char === "#" || char === "♯") accidental += 1;
    if (char === "b" || char === "♭") accidental -= 1;
  }
  return {
    letter,
    accidentalText,
    accidental,
    octave: Number(octaveText || 4),
  };
}

export function noteToMidi(note: string): number {
  const parsed = parseNote(note);
  return (parsed.octave + 1) * 12 + NATURAL_PITCH_CLASS[parsed.letter] + parsed.accidental;
}

export function midiToNote(midi: number, useFlat = false): string {
  const octave = Math.floor(midi / 12) - 1;
  const names = useFlat ? FLAT_NAMES : SHARP_NAMES;
  return `${names[mod(midi, 12)]}${octave}`;
}

export function stripOctave(note: string): string {
  return note.replace(/\d/g, "").replace(/b/g, "♭");
}

export function normalizeName(noteName: string): string {
  return noteName
    .replace(/\d/g, "")
    .replace(/♯/g, "#")
    .replace(/♭/g, "b")
    .toUpperCase();
}

export function spellTarget(startNote: string, interval: IntervalDef, direction: Direction): string {
  const start = parseNote(startNote);
  const startLetterIndex = LETTERS.indexOf(start.letter);
  const sign = direction === "asc" ? 1 : -1;
  const targetMidi = noteToMidi(startNote) + sign * interval.semitones;
  const targetDiatonic = start.octave * 7 + startLetterIndex + sign * (interval.degree - 1);
  const targetLetter = LETTERS[mod(targetDiatonic, 7)];
  const targetOctave = Math.floor(targetDiatonic / 7);
  const accidental = targetMidi - naturalMidi(targetLetter, targetOctave);
  return `${targetLetter}${formatAccidental(accidental)}${targetOctave}`;
}

export function startNotesFor(direction: Direction): string[] {
  return direction === "asc" ? ASC_START_NOTES : DESC_START_NOTES;
}

export function createQuestion(
  interval: IntervalDef,
  direction: Direction,
  startNote: string,
): Question {
  return {
    interval,
    direction,
    startNote,
    expected: spellTarget(startNote, interval, direction),
    statKey: `${interval.id}:${direction}`,
  };
}

export function frequencyToPreciseMidi(frequency: number): number {
  if (frequency <= 0) return 0;
  return 69 + 12 * Math.log2(frequency / 440);
}

export function gradePitch(
  frequencies: number[],
  expectedNote: string,
  tolerance: number,
): PitchGrade {
  if (frequencies.length === 0) {
    return { pitchCorrect: false, noteClassCorrect: false, detectedName: null };
  }

  const groups = new Map<number, number[]>();
  for (const frequency of frequencies) {
    const midi = frequencyToPreciseMidi(frequency);
    if (midi <= 0) continue;
    const key = Math.round(midi);
    const bucket = groups.get(key) ?? [];
    bucket.push(midi);
    groups.set(key, bucket);
  }

  let bestKey: number | null = null;
  let bestBucket: number[] = [];
  for (const [key, bucket] of groups) {
    if (bucket.length > bestBucket.length) {
      bestKey = key;
      bestBucket = bucket;
    }
  }

  if (bestKey === null) {
    return { pitchCorrect: false, noteClassCorrect: false, detectedName: null };
  }

  const average = bestBucket.reduce((sum, value) => sum + value, 0) / bestBucket.length;
  const detectedMidi = Math.round(average);
  const deviation = Math.abs(average - detectedMidi);
  const expectedMidi = noteToMidi(expectedNote);
  const noteClassCorrect = mod(detectedMidi, 12) === mod(expectedMidi, 12);
  const useFlat = expectedNote.includes("b") || expectedNote.includes("♭");

  return {
    pitchCorrect: noteClassCorrect && deviation < tolerance,
    noteClassCorrect,
    detectedName: midiToNote(detectedMidi, useFlat),
    deviation,
  };
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function randomItem<T>(items: T[], rng: () => number = Math.random): T {
  return items[Math.floor(rng() * items.length)];
}

export function shiftOctave(note: string, delta: number): string {
  const parsed = parseNote(note);
  return `${parsed.letter}${parsed.accidentalText}${parsed.octave + delta}`;
}

function naturalMidi(letter: string, octave: number): number {
  return (octave + 1) * 12 + NATURAL_PITCH_CLASS[letter];
}

function formatAccidental(value: number): string {
  if (value === 0) return "";
  if (value > 0) return "#".repeat(value);
  return "b".repeat(Math.abs(value));
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
