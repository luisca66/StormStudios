import {
  letterIndex,
  sameSpelling,
  spellWithLetter,
  type Spelling,
} from "@/lib/maestro-virtual/spelling";

export type ChordSpellingSource = {
  intervals: readonly number[];
  degrees: readonly string[];
};

const PREFERRED_ROOTS: readonly Spelling[] = [
  { letter: "c", alter: 0 },
  { letter: "c", alter: 1 },
  { letter: "d", alter: 0 },
  { letter: "e", alter: -1 },
  { letter: "e", alter: 0 },
  { letter: "f", alter: 0 },
  { letter: "f", alter: 1 },
  { letter: "g", alter: 0 },
  { letter: "a", alter: -1 },
  { letter: "a", alter: 0 },
  { letter: "b", alter: -1 },
  { letter: "b", alter: 0 },
];

function modulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

export function degreeNumber(degree: string): number {
  const value = Number(degree.replace(/[♭♯]/g, ""));
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`Grado de acorde inválido: ${degree}`);
  }
  return value;
}

export function formatDegreeLabel(
  degree: string,
): string {
  const number = degreeNumber(degree);
  if (number === 1) return "F";
  return `${number}a`;
}

export function preferredRootSpelling(rootMidi: number): Spelling {
  return PREFERRED_ROOTS[modulo(rootMidi, 12)];
}

export function spellChord(
  rootMidi: number,
  chord: ChordSpellingSource,
): Spelling[] {
  if (chord.intervals.length !== chord.degrees.length) {
    throw new Error("Los intervalos y grados del acorde no están alineados");
  }

  const root = preferredRootSpelling(rootMidi);
  const rootLetterIndex = letterIndex(root.letter);

  return chord.intervals.map((interval, index) => {
    const letterOffset = degreeNumber(chord.degrees[index]) - 1;
    const targetPitchClass = modulo(rootMidi + interval, 12);
    const spelling = spellWithLetter(
      rootLetterIndex + letterOffset,
      targetPitchClass,
    );

    if (spelling.alter < -2 || spelling.alter > 2) {
      throw new Error(
        `La nota requiere una alteración fuera del rango doble: ${chord.degrees[index]}`,
      );
    }

    return spelling;
  });
}

export function isExactSpelling(
  answer: Spelling,
  expected: Spelling,
): boolean {
  return sameSpelling(answer, expected);
}
