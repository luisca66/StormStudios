import { describe, expect, it } from "vitest";
import {
  degreeNumber,
  formatDegreeLabel,
  isExactSpelling,
  preferredRootSpelling,
  spellChord,
} from "./spelling";

describe("ortografía de Cantar Acordes", () => {
  it("deletrea los grados compuestos por su letra musical", () => {
    expect(degreeNumber("♭♭7")).toBe(7);
    expect(degreeNumber("♯9")).toBe(9);
    expect(degreeNumber("13")).toBe(13);
  });

  it("muestra solo el grado ordinal, sin revelar la cualidad", () => {
    expect(formatDegreeLabel("1")).toBe("F");
    expect(formatDegreeLabel("3")).toBe("3a");
    expect(formatDegreeLabel("♭3")).toBe("3a");
    expect(formatDegreeLabel("5")).toBe("5a");
    expect(formatDegreeLabel("♭5")).toBe("5a");
    expect(formatDegreeLabel("♯5")).toBe("5a");
    expect(formatDegreeLabel("♭♭7")).toBe("7a");
    expect(formatDegreeLabel("♯11")).toBe("11a");
  });

  it("usa la misma grafía preferida que muestra la app para la fundamental", () => {
    expect(preferredRootSpelling(61)).toEqual({ letter: "c", alter: 1 });
    expect(preferredRootSpelling(63)).toEqual({ letter: "e", alter: -1 });
    expect(preferredRootSpelling(68)).toEqual({ letter: "a", alter: -1 });
  });

  it("genera sostenidos y dobles sostenidos sin aceptar enarmonías", () => {
    const notes = spellChord(61, {
      intervals: [0, 4, 8],
      degrees: ["1", "3", "♯5"],
    });

    expect(notes).toEqual([
      { letter: "c", alter: 1 },
      { letter: "e", alter: 1 },
      { letter: "g", alter: 2 },
    ]);
    expect(
      isExactSpelling(notes[2], { letter: "a", alter: 0 }),
    ).toBe(false);
  });

  it("genera bemoles y dobles bemoles", () => {
    expect(
      spellChord(63, {
        intervals: [0, 3, 6, 9],
        degrees: ["1", "♭3", "♭5", "♭♭7"],
      }),
    ).toEqual([
      { letter: "e", alter: -1 },
      { letter: "g", alter: -1 },
      { letter: "b", alter: -2 },
      { letter: "d", alter: -2 },
    ]);
  });

  it("ignora el índice porque compara solo letra y alteración", () => {
    expect(
      isExactSpelling(
        { letter: "f", alter: 2 },
        { letter: "f", alter: 2 },
      ),
    ).toBe(true);
  });
});
