// Tabla autoritativa de los 33 tipos de acorde (PLAN §3.1) — copiada tal cual del
// plan de Batisfera §3.1. Fuente pedagógica: webapp seria de Storm Studios.

export type FamilyId =
  | "TRIADS"
  | "SEVENTHS"
  | "SIXTHS"
  | "SUS_ADD"
  | "EXT_9"
  | "EXT_11_13";

export interface ChordType {
  id: string;
  es: string;
  en: string;
  family: FamilyId;
  intervals: number[]; // semitonos desde la fundamental
}

export const FAMILY_NAMES: Record<FamilyId, { es: string; en: string }> = {
  TRIADS: { es: "Tríadas", en: "Triads" },
  SEVENTHS: { es: "Séptimas", en: "Sevenths" },
  SIXTHS: { es: "Sextas", en: "Sixths" },
  SUS_ADD: { es: "Suspendidos y añadidos", en: "Suspended & added" },
  EXT_9: { es: "Novenas", en: "Ninths" },
  EXT_11_13: { es: "Oncenas y trecenas", en: "Elevenths & thirteenths" },
};

export const CHORD_TYPES: ChordType[] = [
  { id: "MAJOR", es: "Mayor", en: "Major", family: "TRIADS", intervals: [0, 4, 7] },
  { id: "MINOR", es: "Menor", en: "Minor", family: "TRIADS", intervals: [0, 3, 7] },
  { id: "AUGMENTED", es: "Aumentado", en: "Augmented", family: "TRIADS", intervals: [0, 4, 8] },
  { id: "DIMINISHED", es: "Disminuido", en: "Diminished", family: "TRIADS", intervals: [0, 3, 6] },

  { id: "DOMINANT_7", es: "7ª dominante", en: "Dominant 7", family: "SEVENTHS", intervals: [0, 4, 7, 10] },
  { id: "MINOR_7", es: "7ª menor", en: "Minor 7", family: "SEVENTHS", intervals: [0, 3, 7, 10] },
  { id: "MAJOR_7", es: "7ª mayor", en: "Major 7", family: "SEVENTHS", intervals: [0, 4, 7, 11] },
  { id: "MINOR_MAJOR_7", es: "Menor Maj7", en: "Minor major 7", family: "SEVENTHS", intervals: [0, 3, 7, 11] },
  { id: "DIMINISHED_7", es: "Disminuido 7", en: "Diminished 7", family: "SEVENTHS", intervals: [0, 3, 6, 9] },
  { id: "HALF_DIMINISHED_7", es: "Semidisminuido", en: "Half-diminished", family: "SEVENTHS", intervals: [0, 3, 6, 10] },
  { id: "DOMINANT_7_FLAT_5", es: "7ª dom ♭5", en: "Dominant 7 ♭5", family: "SEVENTHS", intervals: [0, 4, 6, 10] },
  { id: "DOMINANT_7_SHARP_5", es: "7ª dom ♯5", en: "Dominant 7 ♯5", family: "SEVENTHS", intervals: [0, 4, 8, 10] },

  { id: "MAJOR_6", es: "Mayor 6", en: "Major 6", family: "SIXTHS", intervals: [0, 4, 7, 9] },
  { id: "MINOR_6", es: "Menor 6", en: "Minor 6", family: "SIXTHS", intervals: [0, 3, 7, 9] },

  { id: "SUS_4", es: "Sus4", en: "Sus4", family: "SUS_ADD", intervals: [0, 5, 7] },
  { id: "MINOR_SUS_4", es: "Menor sus4", en: "Minor sus4", family: "SUS_ADD", intervals: [0, 3, 5, 7] },
  { id: "MAJOR_ADD_9", es: "Mayor add9", en: "Major add9", family: "SUS_ADD", intervals: [0, 4, 7, 14] },
  { id: "MINOR_ADD_9", es: "Menor add9", en: "Minor add9", family: "SUS_ADD", intervals: [0, 3, 7, 14] },

  { id: "MAJOR_9", es: "Maj 9", en: "Maj 9", family: "EXT_9", intervals: [0, 4, 7, 11, 14] },
  { id: "MINOR_9", es: "Min 9", en: "Min 9", family: "EXT_9", intervals: [0, 3, 7, 10, 14] },
  { id: "DOMINANT_9", es: "Dom 9", en: "Dom 9", family: "EXT_9", intervals: [0, 4, 7, 10, 14] },
  { id: "MAJOR_6_9", es: "Maj 6/9", en: "Maj 6/9", family: "EXT_9", intervals: [0, 4, 7, 9, 14] },
  { id: "MINOR_6_9", es: "Min 6/9", en: "Min 6/9", family: "EXT_9", intervals: [0, 3, 7, 9, 14] },
  { id: "DOMINANT_FLAT_9", es: "Dom ♭9", en: "Dom ♭9", family: "EXT_9", intervals: [0, 4, 7, 10, 13] },
  { id: "DOMINANT_SHARP_9", es: "Dom ♯9", en: "Dom ♯9", family: "EXT_9", intervals: [0, 4, 7, 10, 15] },

  { id: "MAJOR_11", es: "Maj 11", en: "Maj 11", family: "EXT_11_13", intervals: [0, 4, 7, 11, 17] },
  { id: "MINOR_11", es: "Min 11", en: "Min 11", family: "EXT_11_13", intervals: [0, 3, 7, 10, 17] },
  { id: "DOMINANT_11", es: "Dom 11", en: "Dom 11", family: "EXT_11_13", intervals: [0, 7, 10, 14, 17] },
  { id: "DOMINANT_SHARP_11", es: "Dom ♯11", en: "Dom ♯11", family: "EXT_11_13", intervals: [0, 7, 10, 14, 18] },
  { id: "MAJOR_SHARP_11", es: "Maj ♯11", en: "Maj ♯11", family: "EXT_11_13", intervals: [0, 7, 11, 14, 18] },
  { id: "MAJOR_13", es: "Maj 13", en: "Maj 13", family: "EXT_11_13", intervals: [0, 4, 7, 11, 21] },
  { id: "MINOR_13", es: "Min 13", en: "Min 13", family: "EXT_11_13", intervals: [0, 3, 7, 10, 21] },
  { id: "DOMINANT_13", es: "Dom 13", en: "Dom 13", family: "EXT_11_13", intervals: [0, 4, 7, 10, 21] },
];

export const CHORD_BY_ID: Record<string, ChordType> = Object.fromEntries(
  CHORD_TYPES.map((c) => [c.id, c]),
);

export function chordsOfFamily(family: FamilyId): ChordType[] {
  return CHORD_TYPES.filter((c) => c.family === family);
}

export function chordName(c: ChordType, lang: "es" | "en"): string {
  return lang === "en" ? c.en : c.es;
}

// Etiqueta de GRADO por semitono real (PLAN §3.1 ⚠️ y decisión §2.12): las linternas
// se etiquetan por el grado que ese intervalo cumple en el acorde, derivado del
// semitono — no de la posición en la lista (los 11ª sin 3ª saltan grados).
// Nota: 9 semitonos se etiqueta "6ª" (Maj6/Min6/6-9); en DIMINISHED_7 ese intervalo es
// formalmente una 7ª disminuida — se acepta la etiqueta 6ª por enarmonía (ver bitácora).
const DEGREE_LABELS: Record<number, { es: string; en: string }> = {
  0: { es: "Fund.", en: "Root" },
  3: { es: "3ª", en: "3rd" },
  4: { es: "3ª", en: "3rd" },
  5: { es: "4ª", en: "4th" },
  6: { es: "5ª", en: "5th" },
  7: { es: "5ª", en: "5th" },
  8: { es: "5ª", en: "5th" },
  9: { es: "6ª", en: "6th" },
  10: { es: "7ª", en: "7th" },
  11: { es: "7ª", en: "7th" },
  13: { es: "9ª", en: "9th" },
  14: { es: "9ª", en: "9th" },
  15: { es: "9ª", en: "9th" },
  17: { es: "11ª", en: "11th" },
  18: { es: "11ª", en: "11th" },
  21: { es: "13ª", en: "13th" },
};

export function intervalToDegreeLabel(semitones: number, lang: "es" | "en"): string {
  const entry = DEGREE_LABELS[semitones];
  if (!entry) throw new Error(`Intervalo sin etiqueta de grado: ${semitones}`);
  return lang === "en" ? entry.en : entry.es;
}
