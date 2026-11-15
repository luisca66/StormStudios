/**
 * chords.ts — Lectura de la pista de acordes del Sequencer v5.
 *
 * Convierte texto de cifrado en acordes del material del curso (tríadas
 * diatónicas del modo mayor, Medrano pp. 15–17). Acepta:
 * - Cifrado romano: I, II, V6, IV6/3, I6/4, VII6, vii°6 (mayúsculas o minúsculas).
 * - Cifrado americano diatónico: C, Dm, G/B, Bdim/D (en la tonalidad dada).
 *
 * Solo lee y nombra acordes: no genera voces. La generación vive en
 * `realize.ts` y es exclusiva del modo autor.
 */
import { MAJOR_KEY_MODELS, type KeyModel } from "@/lib/maestro-virtual/satb-chords-validator";
import { chordSymbol, type ProgressionChord } from "@/lib/maestro-virtual/harmonic-material";
import { parseSpelling, sameSpelling } from "@/lib/maestro-virtual/spelling";

export type ChordSpec = ProgressionChord & { source: string };
export type ChordIssue = { index: number; token: string; message: { es: string; en: string } };
export type ParsedProgression = { chords: ChordSpec[]; issues: ChordIssue[] };

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
const ROMAN_PATTERN = /^(VII|III|II|IV|VI|I|V)(°|º|o|dim)?(6\/4|64|6\/3|63|6)?$/i;
const LETTER_PATTERN = /^([A-G])(#|b)?(m|min|dim|°|º)?(?:\/([A-G])(#|b)?)?$/;

/** Calidad de la tríada de cada grado (base 0) en modo mayor. */
export const degreeQuality = (degreeIndex: number): "major" | "minor" | "diminished" =>
  degreeIndex === 6 ? "diminished" : [0, 3, 4].includes(degreeIndex) ? "major" : "minor";

export function keyModel(key: string): KeyModel {
  const model = MAJOR_KEY_MODELS.find(m => m.key === key);
  if (!model) throw new RangeError(`Tonalidad no disponible: ${key}`);
  return model;
}

/** Un token de cifrado → acorde, o null si no pertenece al material. */
export function parseChordToken(token: string, model: KeyModel): ChordSpec | null {
  const text = token.trim();
  const roman = ROMAN_PATTERN.exec(text);
  if (roman) {
    const degree = ROMAN.indexOf(roman[1].toUpperCase()) + 1;
    const figure = roman[3] ?? "";
    const inversion = figure === "" ? 0 : figure.includes("4") ? 2 : 1;
    return { degree, inversion, source: text };
  }
  const letter = LETTER_PATTERN.exec(text);
  if (!letter) return null;
  const rootSpelling = parseSpelling(letter[1] + (letter[2] ?? ""));
  if (!rootSpelling) return null;
  const degreeIndex = model.triads.findIndex(triad => sameSpelling(triad[0].spelling, rootSpelling));
  if (degreeIndex < 0) return null;
  const written = letter[3] === undefined ? "major" : /^m(in)?$/.test(letter[3]) ? "minor" : "diminished";
  if (written !== degreeQuality(degreeIndex)) return null;
  let inversion = 0;
  if (letter[4]) {
    const bass = parseSpelling(letter[4] + (letter[5] ?? ""));
    inversion = bass ? model.triads[degreeIndex].findIndex(tone => sameSpelling(tone.spelling, bass)) : -1;
    if (inversion < 0) return null;
  }
  return { degree: degreeIndex + 1, inversion, source: text };
}

/** Texto libre («I – IV – V – I», «C F G/B C») → progresión con errores por token. */
export function parseProgression(text: string, key: string): ParsedProgression {
  const model = keyModel(key);
  const tokens = text.split(/[\s,;|]+|\s*[–—]\s*|\s+-\s+/).map(t => t.trim()).filter(Boolean);
  const chords: ChordSpec[] = [];
  const issues: ChordIssue[] = [];
  tokens.forEach((token, index) => {
    const chord = parseChordToken(token, model);
    if (chord) chords.push(chord);
    else issues.push({
      index, token,
      message: {
        es: `«${token}» no es un acorde de ${key} mayor. Usa cifrado romano (I, IV6, V6/4) o americano diatónico (C, Dm, G/B).`,
        en: `"${token}" is not a chord of ${key} major. Use roman numerals (I, IV6, V6/4) or diatonic letter chords (C, Dm, G/B).`,
      },
    });
  });
  return { chords, issues };
}

/** Nombre romano del curso: I, II6/3, V6/4. */
export const chordName = (chord: ProgressionChord): string => chordSymbol(chord);
