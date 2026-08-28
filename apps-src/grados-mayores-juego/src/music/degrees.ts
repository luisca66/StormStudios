// degrees.ts — Teoría musical portada VERBATIM de referencias/data.js (PLAN §3.1–3.5).
// El mapa scaleDegrees es SAGRADO: jamás derivar ortografías por semitono.

// Las 15 tonalidades mayores (mismo orden que la app base).
export const SCALES = [
  "C♭", "C", "C#", "D♭", "D", "E♭", "E", "F", "F#", "G♭", "G", "A♭", "A", "B♭", "B",
] as const;
export type Scale = (typeof SCALES)[number];

// Grados diatónicos y cromáticos (los "colores" del sistema Storm Studios).
export const DIATONIC_DEGREES = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;
export const CHROMATIC_DEGREES = ["IVly", "VImen", "IIfr", "VIIST", "IIImen"] as const;

export type Degree = (typeof DIATONIC_DEGREES)[number] | (typeof CHROMATIC_DEGREES)[number];

// Orden canónico de presentación (botones y estadísticas SIEMPRE en este orden).
export const ALL_DEGREES_OPTIONS: Degree[] = [...DIATONIC_DEGREES, ...CHROMATIC_DEGREES];

// Timbres (carpetas EXACTAS del bucket R2).
export const BASE_TIMBRES = ["Piano", "Cello", "Corno", "Coro", "Fagot"] as const;
export type BaseTimbre = (typeof BASE_TIMBRES)[number];
export const RANDOM_TIMBRE = "Aleatorio";
export const TIMBRES = [...BASE_TIMBRES, RANDOM_TIMBRE] as const;
export type Timbre = (typeof TIMBRES)[number];

export function resolveTimbre(choice: Timbre): BaseTimbre {
  if (choice !== RANDOM_TIMBRE) return choice as BaseTimbre;
  return BASE_TIMBRES[Math.floor(Math.random() * BASE_TIMBRES.length)];
}

// Inventario real de muestras (idéntico en los 5 timbres). 136 notas por timbre.
// VERBATIM de referencias/data.js — no editar a mano.
export const NOTE_FILES = ["A#2", "A#3", "A#4", "A#5", "A#6", "A♭♭2", "A♭♭3", "A♭♭4", "A♭♭5", "A♭♭6", "A♭2", "A♭3", "A♭4", "A♭5", "A♭6", "A2", "A3", "A4", "A5", "A6", "B#2", "B#3", "B#4", "B#5", "B#6", "B♭♭2", "B♭♭3", "B♭♭4", "B♭♭5", "B♭♭6", "B♭2", "B♭3", "B♭4", "B♭5", "B♭6", "B2", "B3", "B4", "B5", "B6", "C#2", "C#3", "C#4", "C#5", "C#6", "C♭3", "C♭4", "C♭5", "C♭6", "C♭7", "C2", "C3", "C4", "C5", "C6", "C7", "D#2", "D#3", "D#4", "D#5", "D#6", "D♭♭2", "D♭♭3", "D♭♭4", "D♭♭5", "D♭♭6", "D♭2", "D♭3", "D♭4", "D♭5", "D♭6", "D2", "D3", "D4", "D5", "D6", "E#2", "E#3", "E#4", "E#5", "E#6", "E♭♭2", "E♭♭3", "E♭♭4", "E♭♭5", "E♭♭6", "E♭2", "E♭3", "E♭4", "E♭5", "E♭6", "E2", "E3", "E4", "E5", "E6", "F##2", "F##3", "F##4", "F##5", "F##6", "F#2", "F#3", "F#4", "F#5", "F#6", "F♭2", "F♭3", "F♭4", "F♭5", "F♭6", "F2", "F3", "F4", "F5", "F6", "G#2", "G#3", "G#4", "G#5", "G#6", "G♭♭2", "G♭♭3", "G♭♭4", "G♭♭5", "G♭♭6", "G♭2", "G♭3", "G♭4", "G♭5", "G♭6", "G2", "G3", "G4", "G5", "G6"];

// Mapa grado tonal por tonalidad: tonalidad -> { pitchClass -> grado }.
// VERBATIM de referencias/data.js (port literal de MusicTheory.kt) — no editar a mano.
export const scaleDegrees: Record<Scale, Record<string, Degree>> = {
  "C♭": { "C♭": "I", "D♭": "II", "D♭♭": "IIfr", "E♭": "III", "E♭♭": "IIImen", "F♭": "IV", "F": "IVly", "G♭": "V", "A♭": "VI", "A♭♭": "VImen", "B♭": "VII", "B♭♭": "VIIST" },
  "C": { "C": "I", "D": "II", "D♭": "IIfr", "E": "III", "E♭": "IIImen", "F": "IV", "F#": "IVly", "G": "V", "A": "VI", "A♭": "VImen", "B": "VII", "B♭": "VIIST" },
  "C#": { "C#": "I", "D#": "II", "D": "IIfr", "E#": "III", "E": "IIImen", "F#": "IV", "F##": "IVly", "G#": "V", "A#": "VI", "A": "VImen", "B#": "VII", "B": "VIIST" },
  "D♭": { "D♭": "I", "E♭": "II", "E♭♭": "IIfr", "F": "III", "F♭": "IIImen", "G♭": "IV", "G": "IVly", "A♭": "V", "B♭": "VI", "B♭♭": "VImen", "C": "VII", "C♭": "VIIST" },
  "D": { "D": "I", "E": "II", "E♭": "IIfr", "F#": "III", "F": "IIImen", "G": "IV", "G#": "IVly", "A": "V", "B": "VI", "B♭": "VImen", "C#": "VII", "C": "VIIST" },
  "E♭": { "E♭": "I", "F": "II", "F♭": "IIfr", "G": "III", "G♭": "IIImen", "A♭": "IV", "A": "IVly", "B♭": "V", "C": "VI", "C♭": "VImen", "D": "VII", "D♭": "VIIST" },
  "E": { "E": "I", "F#": "II", "F": "IIfr", "G#": "III", "G": "IIImen", "A": "IV", "A#": "IVly", "B": "V", "C#": "VI", "C": "VImen", "D#": "VII", "D": "VIIST" },
  "F": { "F": "I", "G": "II", "G♭": "IIfr", "A": "III", "A♭": "IIImen", "B♭": "IV", "B": "IVly", "C": "V", "D": "VI", "D♭": "VImen", "E": "VII", "E♭": "VIIST" },
  "F#": { "F#": "I", "G#": "II", "G": "IIfr", "A#": "III", "A": "IIImen", "B": "IV", "B#": "IVly", "C#": "V", "D#": "VI", "D": "VImen", "E#": "VII", "E": "VIIST" },
  "G♭": { "G♭": "I", "A♭": "II", "A♭♭": "IIfr", "B♭": "III", "B♭♭": "IIImen", "C♭": "IV", "C": "IVly", "D♭": "V", "E♭": "VI", "E♭♭": "VImen", "F": "VII", "F♭": "VIIST" },
  "G": { "G": "I", "A": "II", "A♭": "IIfr", "B": "III", "B♭": "IIImen", "C": "IV", "C#": "IVly", "D": "V", "E": "VI", "E♭": "VImen", "F#": "VII", "F": "VIIST" },
  "A♭": { "A♭": "I", "B♭": "II", "B♭♭": "IIfr", "C": "III", "C♭": "IIImen", "D♭": "IV", "D": "IVly", "E♭": "V", "F": "VI", "F♭": "VImen", "G": "VII", "G♭": "VIIST" },
  "A": { "A": "I", "B": "II", "B♭": "IIfr", "C#": "III", "C": "IIImen", "D": "IV", "D#": "IVly", "E": "V", "F#": "VI", "F": "VImen", "G#": "VII", "G": "VIIST" },
  "B♭": { "B♭": "I", "C": "II", "C♭": "IIfr", "D": "III", "D♭": "IIImen", "E♭": "IV", "E": "IVly", "F": "V", "G": "VI", "G♭": "VImen", "A": "VII", "A♭": "VIIST" },
  "B": { "B": "I", "C#": "II", "C": "IIfr", "D#": "III", "D": "IIImen", "E": "IV", "E#": "IVly", "F#": "V", "G#": "VI", "G": "VImen", "A#": "VII", "A": "VIIST" },
};

// Glosario bilingüe de grados (leyenda y tooltips).
export const DEGREE_GLOSSARY: Record<Degree, { es: string; en: string }> = {
  I: { es: "Tónica", en: "Tonic" },
  II: { es: "Supertónica", en: "Supertonic" },
  III: { es: "Mediante", en: "Mediant" },
  IV: { es: "Subdominante", en: "Subdominant" },
  V: { es: "Dominante", en: "Dominant" },
  VI: { es: "Superdominante", en: "Submediant" },
  VII: { es: "Sensible", en: "Leading tone" },
  IVly: { es: "IV lidio (#4)", en: "Lydian IV (#4)" },
  VImen: { es: "VI menor (♭6)", en: "Minor VI (♭6)" },
  IIfr: { es: "II frigio (♭2)", en: "Phrygian II (♭2)" },
  VIIST: { es: "VII subtónica (♭7)", en: "Subtonic VII (♭7)" },
  IIImen: { es: "III menor (♭3)", en: "Minor III (♭3)" },
};

// Sufijo corto para palancas/chips (PLAN §6): el cromático muestra su alteración.
export const DEGREE_SHORT_SUFFIX: Partial<Record<Degree, string>> = {
  IVly: "#4",
  VImen: "♭6",
  IIfr: "♭2",
  VIIST: "♭7",
  IIImen: "♭3",
};

export function degreeOrderIndex(degree: Degree): number {
  const i = ALL_DEGREES_OPTIONS.indexOf(degree);
  return i === -1 ? 999 : i;
}

export function sortDegrees(degrees: Iterable<Degree>): Degree[] {
  return [...degrees].sort((a, b) => degreeOrderIndex(a) - degreeOrderIndex(b));
}

// pitchClass = nombre de archivo sin la cifra de octava final (port de getPitchClass()).
export function getPitchClass(baseName: string): string {
  return baseName.length ? baseName.slice(0, -1) : baseName;
}

// Grado de una pitch class escrita dentro de una tonalidad (para mensajes de consola).
export function degreeOfPitchClass(scale: Scale, pitchClass: string): Degree | undefined {
  return scaleDegrees[scale][pitchClass];
}

// ---------------------------------------------------------------------------
// Alturas MIDI de clases ESCRITAS (para la regla de octavas de las tríadas §3.5)
// ---------------------------------------------------------------------------
// Convención de los archivos de samples: la octava sigue a la LETRA, así que
// B#3 suena C4 (midi 60) y C♭4 suena B3 (midi 59). Por eso el inventario tiene
// C♭3..C♭7 mientras el resto va en octavas 2..6.

const NATURAL_SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function accidentalOffset(pitchClass: string): number {
  const acc = pitchClass.slice(1);
  if (acc === "") return 0;
  if (acc === "#") return 1;
  if (acc === "##") return 2;
  if (acc === "♭") return -1;
  if (acc === "♭♭") return -2;
  throw new Error(`Alteración desconocida en "${pitchClass}"`);
}

/** MIDI de una clase escrita en una octava de ARCHIVO (letra+octava, ver convención). */
export function writtenMidi(pitchClass: string, octave: number): number {
  const letter = pitchClass[0];
  const natural = NATURAL_SEMITONE[letter];
  if (natural === undefined) throw new Error(`Letra desconocida en "${pitchClass}"`);
  return 12 * (octave + 1) + natural + accidentalOffset(pitchClass);
}

// ---------------------------------------------------------------------------
// Tríadas de la cadencia I–IV–V–I (PLAN §3.5)
// ---------------------------------------------------------------------------
// Las clases de cada tríada salen del mapa scaleDegrees (siempre diatónicas, siempre
// en el inventario). NO usar samples "Major Chords" para IV/V: no existen para todas
// las fundamentales (ej. G#major en C# mayor).

const TRIAD_DEGREES: Record<"I" | "IV" | "V", [Degree, Degree, Degree]> = {
  I: ["I", "III", "V"],
  IV: ["IV", "VI", "I"],
  V: ["V", "VII", "II"],
};

const TRIAD_ROOT_OCTAVE = 3;

function pitchClassOfDegree(scale: Scale, degree: Degree): string {
  const entry = Object.entries(scaleDegrees[scale]).find(([, d]) => d === degree);
  if (!entry) throw new Error(`Grado ${degree} sin clase en ${scale}`);
  return entry[0];
}

/**
 * Archivos (relativos al timbre) de la tríada del grado dado, en posición cerrada
 * ascendente desde la fundamental en octava 3: cada voz toma la octava que la deja
 * dentro de (0, 12] semitonos REALES por encima de la fundamental.
 */
export function triadFiles(scale: Scale, triad: "I" | "IV" | "V", timbre: string): string[] {
  const [rootDeg, thirdDeg, fifthDeg] = TRIAD_DEGREES[triad];
  const rootClass = pitchClassOfDegree(scale, rootDeg);
  const rootMidi = writtenMidi(rootClass, TRIAD_ROOT_OCTAVE);

  const voice = (pitchClass: string): string => {
    for (const octave of [TRIAD_ROOT_OCTAVE, TRIAD_ROOT_OCTAVE + 1]) {
      const interval = writtenMidi(pitchClass, octave) - rootMidi;
      if (interval > 0 && interval <= 12) return `${pitchClass}${octave}`;
    }
    throw new Error(`Sin octava válida para ${pitchClass} sobre ${rootClass}${TRIAD_ROOT_OCTAVE}`);
  };

  const files = [`${rootClass}${TRIAD_ROOT_OCTAVE}`, voice(thirdDeg === rootDeg ? rootClass : pitchClassOfDegree(scale, thirdDeg)), voice(pitchClassOfDegree(scale, fifthDeg))];
  return files.map((f) => `${timbre}/${f}.mp3`);
}

// ---------------------------------------------------------------------------
// Los 8 arcos de la Terminal (PLAN §12)
// ---------------------------------------------------------------------------

const SCALE_WALK_ROOT_OCTAVE = 4;
const SCALE_WALK_DEGREES: Degree[] = ["I", "II", "III", "IV", "V", "VI", "VII"];

/**
 * La escala mayor ascendente completa I–II–III–IV–V–VI–VII–I(8ª), con la ORTOGRAFÍA de
 * la tonalidad (sale del mapa sagrado `scaleDegrees`, jamás de semitonos).
 *
 * Las octavas se eligen por MIDI real y no por número de grado, porque la convención de
 * los archivos hace que la octava siga a la LETRA: en G♭ mayor el IV es C♭, que escrito
 * "C♭4" suena por DEBAJO de la tónica G♭4 y rompería el ascenso — le toca C♭5. El mismo
 * cuidado que ya obligó la regla de octavas de las tríadas (§3.5).
 */
export function scaleWalkFiles(scale: Scale, timbre: string): string[] {
  const rootClass = pitchClassOfDegree(scale, "I");
  const rootMidi = writtenMidi(rootClass, SCALE_WALK_ROOT_OCTAVE);
  const out: string[] = [];
  let previousMidi = rootMidi;

  for (const degree of SCALE_WALK_DEGREES) {
    const pitchClass = pitchClassOfDegree(scale, degree);
    if (degree === "I") {
      out.push(`${rootClass}${SCALE_WALK_ROOT_OCTAVE}`);
      continue;
    }
    let chosen: string | null = null;
    for (const octave of [SCALE_WALK_ROOT_OCTAVE, SCALE_WALK_ROOT_OCTAVE + 1]) {
      const midi = writtenMidi(pitchClass, octave);
      if (midi > previousMidi && midi < rootMidi + 12) {
        chosen = `${pitchClass}${octave}`;
        previousMidi = midi;
        break;
      }
    }
    if (!chosen) throw new Error(`Sin octava ascendente para ${pitchClass} en ${scale}`);
    out.push(chosen);
  }

  // El 8º arco: la tónica una octava arriba. El viaje entero era el V–I.
  for (const octave of [SCALE_WALK_ROOT_OCTAVE + 1, SCALE_WALK_ROOT_OCTAVE + 2]) {
    if (writtenMidi(rootClass, octave) === rootMidi + 12) {
      out.push(`${rootClass}${octave}`);
      break;
    }
  }
  if (out.length !== 8) throw new Error(`Escala incompleta en ${scale}`);
  return out.map((f) => `${timbre}/${f}.mp3`);
}
