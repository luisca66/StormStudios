export const PITCHES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export type Pitch = (typeof PITCHES)[number];
export type StringId = "low-e" | "a" | "d" | "g" | "b" | "high-e";

export type TimbreId = "guitarra" | "piano" | "corno" | "fagot" | "coro" | "cello";
export type RegisterId = "grave" | "medio" | "agudo";
/** Del entorno: cada mundo suena con su instrumento. Aleatorio: cada nota con un timbre al azar (alumnos avanzados). */
export type TimbreMode = "entorno" | "aleatorio";

export interface NoteSample {
  id: string;
  timbre: TimbreId;
  register: RegisterId;
  noteName: string;
  pitch: Pitch;
  octave: number;
  /** Sólo la guitarra: cuerda y traste. */
  stringId?: StringId;
  stringLabel?: string;
  fret?: number;
  /** Guitarra: ruta en el bucket de guitarra. Instrumentos: URL completa. */
  filePath?: string;
  url?: string;
}

export interface TimbreInfo {
  id: TimbreId;
  label: string;
  /** Octavas de cada registro, dentro de la tesitura real del instrumento (hay muestras de la 2 a la 6). */
  registers: Record<RegisterId, number[]>;
}

export const TIMBRES: TimbreInfo[] = [
  { id: "guitarra", label: "Guitarra", registers: { grave: [2], medio: [3], agudo: [4, 5] } },
  { id: "piano", label: "Piano", registers: { grave: [2, 3], medio: [4], agudo: [5, 6] } },
  { id: "corno", label: "Corno", registers: { grave: [2], medio: [3], agudo: [4] } },
  { id: "fagot", label: "Fagot", registers: { grave: [2], medio: [3], agudo: [4] } },
  { id: "coro", label: "Coro", registers: { grave: [2, 3], medio: [4], agudo: [5] } },
  { id: "cello", label: "Cello", registers: { grave: [2], medio: [3], agudo: [4, 5] } },
];

export const REGISTERS: { id: RegisterId; label: string; hint: string }[] = [
  { id: "grave", label: "Grave", hint: "Las notas más bajas" },
  { id: "medio", label: "Medio", hint: "El centro del instrumento" },
  { id: "agudo", label: "Agudo", hint: "Las notas más altas" },
];

export const timbreInfo = (id: TimbreId) => TIMBRES.find((t) => t.id === id) ?? TIMBRES[0];

const registerOf = (timbre: TimbreId, octave: number): RegisterId =>
  (Object.entries(timbreInfo(timbre).registers).find(([, octaves]) => octaves.includes(octave))?.[0] as RegisterId) ?? "medio";

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

const GUITAR_SAMPLES: NoteSample[] = GUITAR_STRINGS.flatMap((string) =>
  Array.from({ length: 13 }, (_, fret) => fret)
    .filter((fret) => !string.unavailableFrets?.includes(fret))
    .map((fret) => {
      const note = midiToNote(string.openMidi + fret);
      return {
        id: `${string.id}-${fret}`,
        timbre: "guitarra" as const,
        register: registerOf("guitarra", note.octave),
        stringId: string.id,
        stringLabel: string.label,
        fret,
        ...note,
        filePath: `${string.folder}/${note.noteName}.mp3`,
      };
    }),
);

// Instrumentos del sitio (bucket samples): {Inst}/{nota}{octava}.mp3, p. ej. Cello/C%233.mp3.
const INSTRUMENT_BASE = "https://samples.stormstudios.com.mx";
const INSTRUMENT_FOLDERS: Record<TimbreId, string> = { guitarra: "", piano: "Piano", corno: "Corno", fagot: "Fagot", coro: "Coro", cello: "Cello" };

const INSTRUMENT_SAMPLES: NoteSample[] = TIMBRES.filter((t) => t.id !== "guitarra").flatMap((timbre) =>
  (Object.entries(timbre.registers) as [RegisterId, number[]][]).flatMap(([register, octaves]) =>
    octaves.flatMap((octave) => PITCHES.map((pitch) => ({
      id: `${timbre.id}-${pitch}${octave}`,
      timbre: timbre.id,
      register,
      pitch,
      octave,
      noteName: `${pitch}${octave}`,
      url: `${INSTRUMENT_BASE}/${INSTRUMENT_FOLDERS[timbre.id]}/${encodeURIComponent(pitch)}${octave}.mp3`,
    }))),
  ),
);

export const ALL_SAMPLES: NoteSample[] = [...GUITAR_SAMPLES, ...INSTRUMENT_SAMPLES];

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

export interface SoundSelection {
  mode: TimbreMode;
  /** El timbre del entorno elegido (modo «Del entorno»). */
  timbre: TimbreId;
  strings: Set<StringId>;
  registers: Set<RegisterId>;
}

/** La guitarra del entorno se elige por cuerdas; cualquier otro caso, por registro. */
export const usesStrings = (selection: SoundSelection) => selection.mode === "entorno" && selection.timbre === "guitarra";

export function samplesFor(selection: SoundSelection, pitches: Pitch[]) {
  const byStrings = usesStrings(selection);
  return ALL_SAMPLES.filter((sample) =>
    pitches.includes(sample.pitch)
    && (selection.mode === "aleatorio" || sample.timbre === selection.timbre)
    && (byStrings ? selection.strings.has(sample.stringId!) : selection.registers.has(sample.register)));
}

export function pickSample(pool: NoteSample[], previous: NoteSample | null) {
  if (pool.length === 0) return null;
  const withoutExactRepeat = pool.filter((sample) => sample.id !== previous?.id);
  const withoutPitchRepeat = withoutExactRepeat.filter((sample) => sample.pitch !== previous?.pitch);
  const candidates = withoutPitchRepeat.length ? withoutPitchRepeat : withoutExactRepeat.length ? withoutExactRepeat : pool;
  // En aleatorio se sortea primero el timbre (así la guitarra, con más muestras, no domina) y luego la nota.
  const timbres = [...new Set(candidates.map((sample) => sample.timbre))];
  const timbre = timbres[Math.floor(Math.random() * timbres.length)];
  const ofTimbre = candidates.filter((sample) => sample.timbre === timbre);
  return ofTimbre[Math.floor(Math.random() * ofTimbre.length)] ?? candidates[0];
}
