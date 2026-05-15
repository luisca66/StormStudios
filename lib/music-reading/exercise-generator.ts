import type {
  Clef,
  Exercise,
  ExerciseNote,
  MusicReadingLevel,
  NoteName,
  NotesPerExercise,
  Pitch,
} from "./types";

interface GenerateExerciseOptions {
  avoidFirstNote?: NoteName;
  seed?: string | number;
  exerciseIndex?: number;
}

const CLEF_PITCHES: Record<Clef, Record<NoteName, Pitch>> = {
  treble: {
    C: { note: "C", octave: 5 },
    D: { note: "D", octave: 5 },
    E: { note: "E", octave: 5 },
    F: { note: "F", octave: 5 },
    G: { note: "G", octave: 4 },
    A: { note: "A", octave: 4 },
    B: { note: "B", octave: 4 },
  },
  bass: {
    C: { note: "C", octave: 3 },
    D: { note: "D", octave: 3 },
    E: { note: "E", octave: 3 },
    F: { note: "F", octave: 3 },
    G: { note: "G", octave: 3 },
    A: { note: "A", octave: 3 },
    B: { note: "B", octave: 2 },
  },
};

export function generateExercise(
  level: MusicReadingLevel,
  options: GenerateExerciseOptions = {},
): Exercise {
  validateLevel(level);

  const random = createRandom(options.seed, options.exerciseIndex);
  const clef = pickRandom(level.clefs, random);
  const noteCount = resolveNotesPerExercise(level.notesPerExercise, random);
  const notes = generateExerciseNotes({
    avoidFirstNote: options.avoidFirstNote,
    clef,
    allowedNotes: level.allowedNotes,
    allowedPitches: level.pitchesByClef?.[clef],
    noteCount,
    random,
  });

  return {
    id: createExerciseId(level.id, clef, notes, options),
    levelId: level.id,
    clef,
    notes,
  };
}

export function generateRoundExercises(
  level: MusicReadingLevel,
  seed?: string | number,
): Exercise[] {
  const exercises: Exercise[] = [];
  let previousNote: NoteName | undefined;

  for (
    let exerciseIndex = 0;
    exerciseIndex < level.roundLength;
    exerciseIndex += 1
  ) {
    const exercise = generateExercise(level, {
      avoidFirstNote: previousNote,
      exerciseIndex,
      seed,
    });

    exercises.push(exercise);
    previousNote = exercise.notes.at(-1)?.answer;
  }

  return exercises;
}

export function resolveNotesPerExercise(
  notesPerExercise: NotesPerExercise,
  random: () => number = Math.random,
): number {
  if (typeof notesPerExercise === "number") {
    return notesPerExercise;
  }

  const min = Math.max(1, Math.floor(notesPerExercise.min));
  const max = Math.max(min, Math.floor(notesPerExercise.max));
  return min + Math.floor(random() * (max - min + 1));
}

function generateExerciseNotes({
  avoidFirstNote,
  clef,
  allowedNotes,
  allowedPitches,
  noteCount,
  random,
}: {
  avoidFirstNote?: NoteName;
  clef: Clef;
  allowedNotes: NoteName[];
  allowedPitches?: Pitch[];
  noteCount: number;
  random: () => number;
}): ExerciseNote[] {
  const notes: ExerciseNote[] = [];

  for (let index = 0; index < noteCount; index += 1) {
    const previous = index === 0 ? avoidFirstNote : notes.at(-1)?.answer;
    const pitch = pickPitch({
      allowedNotes,
      allowedPitches,
      clef,
      previous,
      random,
    });

    notes.push({
      answer: pitch.note,
      pitch,
    });
  }

  return notes;
}

function pickPitch({
  allowedNotes,
  allowedPitches,
  clef,
  previous,
  random,
}: {
  allowedNotes: NoteName[];
  allowedPitches?: Pitch[];
  clef: Clef;
  previous?: NoteName;
  random: () => number;
}): Pitch {
  const sourcePitches =
    allowedPitches ??
    allowedNotes.map((note) => {
      return CLEF_PITCHES[clef][note];
    });

  if (sourcePitches.length <= 1 || !previous) {
    return pickRandom(sourcePitches, random);
  }

  const availablePitches = sourcePitches.filter((pitch) => {
    return pitch.note !== previous;
  });

  return pickRandom(
    availablePitches.length > 0 ? availablePitches : sourcePitches,
    random,
  );
}

function pickRandom<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

function createRandom(
  seed?: string | number,
  exerciseIndex = 0,
): () => number {
  if (seed === undefined) {
    return Math.random;
  }

  let state = hashSeed(`${seed}:${exerciseIndex}`);

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string): number {
  let hash = 1779033703 ^ seed.length;

  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return hash >>> 0;
}

function createExerciseId(
  levelId: number,
  clef: Clef,
  notes: ExerciseNote[],
  options: GenerateExerciseOptions,
): string {
  const suffix =
    options.seed === undefined
      ? crypto.randomUUID()
      : `${options.seed}-${options.exerciseIndex ?? 0}`;

  const noteNames = notes
    .map((note) => `${note.pitch.note}${note.pitch.octave}`)
    .join("-");
  return `level-${levelId}-${clef}-${noteNames}-${suffix}`;
}

function validateLevel(level: MusicReadingLevel): void {
  if (level.clefs.length === 0) {
    throw new Error(`Level ${level.id} must include at least one clef.`);
  }

  const hasAllowedPitches = Object.values(level.pitchesByClef ?? {}).some(
    (pitches) => pitches.length > 0,
  );

  if (level.allowedNotes.length === 0 && !hasAllowedPitches) {
    throw new Error(`Level ${level.id} must include at least one note.`);
  }

  const noteCount = resolveNotesPerExercise(level.notesPerExercise, () => 0);

  if (noteCount < 1) {
    throw new Error(`Level ${level.id} must generate at least one note.`);
  }
}
