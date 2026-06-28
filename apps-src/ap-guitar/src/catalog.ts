import type { GuitarNoteSample } from "./types";

export const stringOrder = [
  "Cuerda E (grave)",
  "Cuerda A",
  "Cuerda D",
  "Cuerda G",
  "Cuerda B",
  "Cuerda E (aguda)",
] as const;

export const answerOptions = [
  "A",
  "A#",
  "B",
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
] as const;

export const chromaticOrderMap = new Map(
  ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map(
    (note, index) => [note, index],
  ),
);

export const allSamples: GuitarNoteSample[] = [
  { stringName: "Cuerda E (grave)", noteName: "E2", filePath: "E String low/E2.mp3" },
  { stringName: "Cuerda E (grave)", noteName: "F2", filePath: "E String low/F2.mp3" },
  { stringName: "Cuerda E (grave)", noteName: "F#2", filePath: "E String low/F#2.mp3" },
  { stringName: "Cuerda E (grave)", noteName: "G2", filePath: "E String low/G2.mp3" },
  { stringName: "Cuerda E (grave)", noteName: "G#2", filePath: "E String low/G#2.mp3" },
  { stringName: "Cuerda E (grave)", noteName: "A2", filePath: "E String low/A2.mp3" },
  { stringName: "Cuerda E (grave)", noteName: "A#2", filePath: "E String low/A#2.mp3" },
  { stringName: "Cuerda E (grave)", noteName: "B2", filePath: "E String low/B2.mp3" },
  { stringName: "Cuerda E (grave)", noteName: "C3", filePath: "E String low/C3.mp3" },
  { stringName: "Cuerda E (grave)", noteName: "C#3", filePath: "E String low/C#3.mp3" },
  { stringName: "Cuerda E (grave)", noteName: "D3", filePath: "E String low/D3.mp3" },
  { stringName: "Cuerda E (grave)", noteName: "D#3", filePath: "E String low/D#3.mp3" },
  { stringName: "Cuerda E (grave)", noteName: "E3", filePath: "E String low/E3.mp3" },
  { stringName: "Cuerda A", noteName: "A2", filePath: "A String/A2.mp3" },
  { stringName: "Cuerda A", noteName: "A#2", filePath: "A String/A#2.mp3" },
  { stringName: "Cuerda A", noteName: "B2", filePath: "A String/B2.mp3" },
  { stringName: "Cuerda A", noteName: "C3", filePath: "A String/C3.mp3" },
  { stringName: "Cuerda A", noteName: "C#3", filePath: "A String/C#3.mp3" },
  { stringName: "Cuerda A", noteName: "D3", filePath: "A String/D3.mp3" },
  { stringName: "Cuerda A", noteName: "D#3", filePath: "A String/D#3.mp3" },
  { stringName: "Cuerda A", noteName: "E3", filePath: "A String/E3.mp3" },
  { stringName: "Cuerda A", noteName: "F3", filePath: "A String/F3.mp3" },
  { stringName: "Cuerda A", noteName: "F#3", filePath: "A String/F#3.mp3" },
  { stringName: "Cuerda A", noteName: "G3", filePath: "A String/G3.mp3" },
  { stringName: "Cuerda A", noteName: "G#3", filePath: "A String/G#3.mp3" },
  { stringName: "Cuerda A", noteName: "A3", filePath: "A String/A3.mp3" },
  { stringName: "Cuerda D", noteName: "D3", filePath: "D String/D3.mp3" },
  { stringName: "Cuerda D", noteName: "D#3", filePath: "D String/D#3.mp3" },
  { stringName: "Cuerda D", noteName: "E3", filePath: "D String/E3.mp3" },
  { stringName: "Cuerda D", noteName: "F3", filePath: "D String/F3.mp3" },
  { stringName: "Cuerda D", noteName: "F#3", filePath: "D String/F#3.mp3" },
  { stringName: "Cuerda D", noteName: "G3", filePath: "D String/G3.mp3" },
  { stringName: "Cuerda D", noteName: "G#3", filePath: "D String/G#3.mp3" },
  { stringName: "Cuerda D", noteName: "A3", filePath: "D String/A3.mp3" },
  { stringName: "Cuerda D", noteName: "A#3", filePath: "D String/A#3.mp3" },
  { stringName: "Cuerda D", noteName: "B3", filePath: "D String/B3.mp3" },
  { stringName: "Cuerda D", noteName: "C4", filePath: "D String/C4.mp3" },
  { stringName: "Cuerda D", noteName: "C#4", filePath: "D String/C#4.mp3" },
  { stringName: "Cuerda D", noteName: "D4", filePath: "D String/D4.mp3" },
  { stringName: "Cuerda G", noteName: "G3", filePath: "G String/G3.mp3" },
  { stringName: "Cuerda G", noteName: "G#3", filePath: "G String/G#3.mp3" },
  { stringName: "Cuerda G", noteName: "A3", filePath: "G String/A3.mp3" },
  { stringName: "Cuerda G", noteName: "A#3", filePath: "G String/A#3.mp3" },
  { stringName: "Cuerda G", noteName: "B3", filePath: "G String/B3.mp3" },
  { stringName: "Cuerda G", noteName: "C4", filePath: "G String/C4.mp3" },
  { stringName: "Cuerda G", noteName: "C#4", filePath: "G String/C#4.mp3" },
  { stringName: "Cuerda G", noteName: "D4", filePath: "G String/D4.mp3" },
  { stringName: "Cuerda G", noteName: "D#4", filePath: "G String/D#4.mp3" },
  { stringName: "Cuerda G", noteName: "E4", filePath: "G String/E4.mp3" },
  { stringName: "Cuerda G", noteName: "F4", filePath: "G String/F4.mp3" },
  { stringName: "Cuerda G", noteName: "F#4", filePath: "G String/F#4.mp3" },
  { stringName: "Cuerda G", noteName: "G4", filePath: "G String/G4.mp3" },
  { stringName: "Cuerda B", noteName: "B3", filePath: "B String/B3.mp3" },
  { stringName: "Cuerda B", noteName: "C4", filePath: "B String/C4.mp3" },
  { stringName: "Cuerda B", noteName: "C#4", filePath: "B String/C#4.mp3" },
  { stringName: "Cuerda B", noteName: "D4", filePath: "B String/D4.mp3" },
  { stringName: "Cuerda B", noteName: "D#4", filePath: "B String/D#4.mp3" },
  { stringName: "Cuerda B", noteName: "E4", filePath: "B String/E4.mp3" },
  { stringName: "Cuerda B", noteName: "F4", filePath: "B String/F4.mp3" },
  { stringName: "Cuerda B", noteName: "F#4", filePath: "B String/F#4.mp3" },
  { stringName: "Cuerda B", noteName: "G4", filePath: "B String/G4.mp3" },
  { stringName: "Cuerda B", noteName: "A4", filePath: "B String/A4.mp3" },
  { stringName: "Cuerda B", noteName: "A#4", filePath: "B String/A#4.mp3" },
  { stringName: "Cuerda B", noteName: "B4", filePath: "B String/B4.mp3" },
  { stringName: "Cuerda E (aguda)", noteName: "E4", filePath: "E String high/E4.mp3" },
  { stringName: "Cuerda E (aguda)", noteName: "F4", filePath: "E String high/F4.mp3" },
  { stringName: "Cuerda E (aguda)", noteName: "F#4", filePath: "E String high/F#4.mp3" },
  { stringName: "Cuerda E (aguda)", noteName: "G4", filePath: "E String high/G4.mp3" },
  { stringName: "Cuerda E (aguda)", noteName: "G#4", filePath: "E String high/G#4.mp3" },
  { stringName: "Cuerda E (aguda)", noteName: "A4", filePath: "E String high/A4.mp3" },
  { stringName: "Cuerda E (aguda)", noteName: "A#4", filePath: "E String high/A#4.mp3" },
  { stringName: "Cuerda E (aguda)", noteName: "B4", filePath: "E String high/B4.mp3" },
  { stringName: "Cuerda E (aguda)", noteName: "C5", filePath: "E String high/C5.mp3" },
  { stringName: "Cuerda E (aguda)", noteName: "C#5", filePath: "E String high/C#5.mp3" },
  { stringName: "Cuerda E (aguda)", noteName: "D5", filePath: "E String high/D5.mp3" },
  { stringName: "Cuerda E (aguda)", noteName: "D#5", filePath: "E String high/D#5.mp3" },
  { stringName: "Cuerda E (aguda)", noteName: "E5", filePath: "E String high/E5.mp3" },
];

export const allUniqueNoteNames = Array.from(new Set(allSamples.map((sample) => sample.noteName)));

export function noteBase(noteName: string) {
  return noteName.replace(/\d/g, "");
}

export function noteOctave(noteName: string) {
  const match = noteName.match(/\d+$/);
  return match ? Number(match[0]) : 0;
}

export function compareFullNotes(a: string, b: string) {
  const octaveDelta = noteOctave(a) - noteOctave(b);
  if (octaveDelta !== 0) return octaveDelta;
  return (chromaticOrderMap.get(noteBase(a)) ?? 99) - (chromaticOrderMap.get(noteBase(b)) ?? 99);
}

export function sampleId(sample: GuitarNoteSample) {
  return sample.filePath;
}
