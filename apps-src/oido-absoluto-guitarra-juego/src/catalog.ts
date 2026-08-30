export const PITCHES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export type Pitch = (typeof PITCHES)[number];
export type StringId = "low-e" | "a" | "d" | "g" | "b" | "high-e";

export interface GuitarSample {
  id: string;
  stringId: StringId;
  stringLabel: string;
  shortLabel: string;
  noteName: string;
  pitch: Pitch;
  octave: number;
  fret: number;
  filePath: string;
}

interface GuitarString {
  id: StringId;
  label: string;
  shortLabel: string;
  folder: string;
  openMidi: number;
  unavailableFrets?: number[];
}

export const GUITAR_STRINGS: GuitarString[] = [
  { id: "low-e", label: "6ª · Mi grave", shortLabel: "E₂", folder: "E String low", openMidi: 40 },
  { id: "a", label: "5ª · La", shortLabel: "A₂", folder: "A String", openMidi: 45 },
  { id: "d", label: "4ª · Re", shortLabel: "D₃", folder: "D String", openMidi: 50 },
  { id: "g", label: "3ª · Sol", shortLabel: "G₃", folder: "G String", openMidi: 55 },
  { id: "b", label: "2ª · Si", shortLabel: "B₃", folder: "B String", openMidi: 59, unavailableFrets: [9] },
  { id: "high-e", label: "1ª · Mi agudo", shortLabel: "E₄", folder: "E String high", openMidi: 64 },
];

const midiToNote = (midi: number) => {
  const pitch = PITCHES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return { pitch, octave, noteName: `${pitch}${octave}` };
};

export const ALL_SAMPLES: GuitarSample[] = GUITAR_STRINGS.flatMap((string) =>
  Array.from({ length: 13 }, (_, fret) => fret)
    .filter((fret) => !string.unavailableFrets?.includes(fret))
    .map((fret) => {
      const note = midiToNote(string.openMidi + fret);
      return {
        id: `${string.id}-${fret}`,
        stringId: string.id,
        stringLabel: string.label,
        shortLabel: string.shortLabel,
        fret,
        ...note,
        filePath: `${string.folder}/${note.noteName}.mp3`,
      };
    }),
);

export interface LevelDefinition {
  id: number;
  name: string;
  place: string;
  description: string;
  groups: Pitch[][];
  accent: string;
}

export const LEVELS: LevelDefinition[] = [
  {
    id: 1,
    name: "El puente",
    place: "Primera resonancia",
    description: "Dos familias de altura separadas por tritono.",
    accent: "#74c7c9",
    groups: [["C", "F#"], ["C#", "G"], ["D", "G#"], ["D#", "A"], ["E", "A#"], ["F", "B"]],
  },
  {
    id: 2,
    name: "La tapa armónica",
    place: "Círculos aumentados",
    description: "Tres alturas relacionadas por terceras mayores.",
    accent: "#d8a64b",
    groups: [["C", "E", "G#"], ["C#", "F", "A"], ["D", "F#", "A#"], ["D#", "G", "B"]],
  },
  {
    id: 3,
    name: "La roseta",
    place: "Simetría disminuida",
    description: "Cuatro alturas relacionadas por terceras menores.",
    accent: "#cf6d82",
    groups: [["C", "D#", "F#", "A"], ["C#", "E", "G", "A#"], ["D", "F", "G#", "B"]],
  },
  {
    id: 4,
    name: "El mástil",
    place: "Dos senderos enteros",
    description: "Seis alturas dentro de una escala de tonos enteros.",
    accent: "#8ea4dd",
    groups: [["C", "D", "E", "F#", "G#", "A#"], ["C#", "D#", "F", "G", "A", "B"]],
  },
  {
    id: 5,
    name: "El clavijero",
    place: "Diapasón completo",
    description: "Las doce alturas cromáticas sin referencia previa.",
    accent: "#e8d8b5",
    groups: [[...PITCHES]],
  },
];

export function samplesFor(strings: Set<StringId>, pitches: Pitch[]) {
  return ALL_SAMPLES.filter((sample) => strings.has(sample.stringId) && pitches.includes(sample.pitch));
}

export function pickSample(pool: GuitarSample[], previous: GuitarSample | null) {
  if (pool.length === 0) return null;
  const withoutExactRepeat = pool.filter((sample) => sample.id !== previous?.id);
  const withoutPitchRepeat = withoutExactRepeat.filter((sample) => sample.pitch !== previous?.pitch);
  const candidates = withoutPitchRepeat.length ? withoutPitchRepeat : withoutExactRepeat.length ? withoutExactRepeat : pool;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? candidates[0];
}
