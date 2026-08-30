// degrees.ts — Teoría musical portada VERBATIM de referencias/data.js (PLAN §3.1–3.5).
// El mapa scaleDegrees es SAGRADO: jamás derivar ortografías por semitono.

// Las 15 tonalidades menores (mismo orden que la webapp seria).
export const SCALES = [
  "Am", "Em", "Bm", "F#m", "C#m", "G#m", "D#m", "A#m",
  "Dm", "Gm", "Cm", "Fm", "B♭m", "E♭m", "A♭m",
] as const;
export type Scale = (typeof SCALES)[number];

// Grados del sistema Storm Studios para modo menor.
// OJO: el diatónico del menor natural lleva VIIST (♭7), no VII.
export const DIATONIC_DEGREES = ["I", "II", "III", "IV", "V", "VI", "VIIST"] as const;
export const CHROMATIC_DEGREES = ["IIfr", "IVly", "VImel", "VIIsen"] as const;

export type Degree = (typeof DIATONIC_DEGREES)[number] | (typeof CHROMATIC_DEGREES)[number];

// Orden canónico de presentación: 11 grados INTERCALADOS POR ALTURA (no "diatónicos
// primero" como en el Expreso Tonal). Botones y estadísticas SIEMPRE en este orden.
export const ALL_DEGREES_OPTIONS: Degree[] = [
  "I", "II", "IIfr", "III", "IV", "IVly", "V", "VI", "VImel", "VIIST", "VIIsen",
];

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

// Inventario real de muestras (idéntico en los 5 timbres). 131 notas por timbre.
// VERBATIM de referencias/data.js — no editar a mano.
// ⚠️ Difiere del inventario del Expreso: aquí hay C##/D##/F##/G## y B♭♭, pero NO
// A♭♭/D♭♭/E♭♭/G♭♭ ni C♭2. C## y G## se resuelven por fallback enharmónico al construir
// la URL (ver AUDIO_NOTE_FALLBACKS).
export const NOTE_FILES = ["A#2","A#3","A#4","A#5","A#6","A♭2","A♭3","A♭4","A♭5","A♭6","A2","A3","A4","A5","A6","B#2","B#3","B#4","B#5","B#6","B♭♭2","B♭♭3","B♭♭4","B♭♭5","B♭♭6","B♭2","B♭3","B♭4","B♭5","B♭6","B2","B3","B4","B5","B6","C##2","C##3","C##4","C##5","C##6","C#2","C#3","C#4","C#5","C#6","C♭3","C♭4","C♭5","C♭6","C♭7","C2","C3","C4","C5","C6","C7","D##2","D##3","D##4","D##5","D##6","D#2","D#3","D#4","D#5","D#6","D♭2","D♭3","D♭4","D♭5","D♭6","D2","D3","D4","D5","D6","E#2","E#3","E#4","E#5","E#6","E♭2","E♭3","E♭4","E♭5","E♭6","E2","E3","E4","E5","E6","F##2","F##3","F##4","F##5","F##6","F#2","F#3","F#4","F#5","F#6","F♭2","F♭3","F♭4","F♭5","F♭6","F2","F3","F4","F5","F6","G##2","G##3","G##4","G##5","G##6","G#2","G#3","G#4","G#5","G#6","G♭2","G♭3","G♭4","G♭5","G♭6","G2","G3","G4","G5","G6"];

/**
 * Clases que NO existen como archivo en el bucket y se sirven con su enarmónica.
 * VERBATIM de referencias/engine.js. El nombre TEÓRICO se conserva siempre para
 * mensajes y grados; solo cambia el archivo que se pide (PLAN §3.2).
 */
export const AUDIO_NOTE_FALLBACKS: Record<string, string> = {
  "C##": "D",
  "G##": "A",
};

// Mapa grado tonal por tonalidad menor: tonalidad -> { pitchClass -> grado }.
// VERBATIM de referencias/data.js — no editar a mano.
export const scaleDegrees: Record<Scale, Record<string, Degree>> = {
  "Am": { "A": "I", "B": "II", "B♭": "IIfr", "C": "III", "D": "IV", "D#": "IVly", "E": "V", "F": "VI", "F#": "VImel", "G": "VIIST", "G#": "VIIsen" },
  "Em": { "E": "I", "F#": "II", "F": "IIfr", "G": "III", "A": "IV", "A#": "IVly", "B": "V", "C": "VI", "C#": "VImel", "D": "VIIST", "D#": "VIIsen" },
  "Bm": { "B": "I", "C#": "II", "C": "IIfr", "D": "III", "E": "IV", "E#": "IVly", "F#": "V", "G": "VI", "G#": "VImel", "A": "VIIST", "A#": "VIIsen" },
  "F#m": { "F#": "I", "G#": "II", "G": "IIfr", "A": "III", "B": "IV", "B#": "IVly", "C#": "V", "D": "VI", "D#": "VImel", "E": "VIIST", "E#": "VIIsen" },
  "C#m": { "C#": "I", "D#": "II", "D": "IIfr", "E": "III", "F#": "IV", "F##": "IVly", "G#": "V", "A": "VI", "A#": "VImel", "B": "VIIST", "B#": "VIIsen" },
  "G#m": { "G#": "I", "A#": "II", "A": "IIfr", "B": "III", "C#": "IV", "C##": "IVly", "D#": "V", "E": "VI", "E#": "VImel", "F#": "VIIST", "F##": "VIIsen" },
  "D#m": { "D#": "I", "E#": "II", "E": "IIfr", "F#": "III", "G#": "IV", "G##": "IVly", "A#": "V", "B": "VI", "B#": "VImel", "C#": "VIIST", "C##": "VIIsen" },
  "A#m": { "A#": "I", "B#": "II", "B": "IIfr", "C#": "III", "D#": "IV", "E##": "IVly", "E#": "V", "F#": "VI", "F##": "VImel", "G#": "VIIST", "G##": "VIIsen" },
  "Dm": { "D": "I", "E": "II", "E♭": "IIfr", "F": "III", "G": "IV", "G#": "IVly", "A": "V", "B♭": "VI", "B": "VImel", "C": "VIIST", "C#": "VIIsen" },
  "Gm": { "G": "I", "A": "II", "A♭": "IIfr", "B♭": "III", "C": "IV", "C#": "IVly", "D": "V", "E♭": "VI", "E": "VImel", "F": "VIIST", "F#": "VIIsen" },
  "Cm": { "C": "I", "D": "II", "D♭": "IIfr", "E♭": "III", "F": "IV", "F#": "IVly", "G": "V", "A♭": "VI", "A": "VImel", "B♭": "VIIST", "B": "VIIsen" },
  "Fm": { "F": "I", "G": "II", "G♭": "IIfr", "A♭": "III", "B♭": "IV", "B": "IVly", "C": "V", "D♭": "VI", "D": "VImel", "E♭": "VIIST", "E": "VIIsen" },
  "B♭m": { "B♭": "I", "C": "II", "C♭": "IIfr", "D♭": "III", "E♭": "IV", "E": "IVly", "F": "V", "G♭": "VI", "G": "VImel", "A♭": "VIIST", "A": "VIIsen" },
  "E♭m": { "E♭": "I", "F": "II", "F♭": "IIfr", "G♭": "III", "A♭": "IV", "A": "IVly", "B♭": "V", "C♭": "VI", "C": "VImel", "D♭": "VIIST", "D": "VIIsen" },
  "A♭m": { "A♭": "I", "B♭": "II", "B♭♭": "IIfr", "C♭": "III", "D♭": "IV", "D": "IVly", "E♭": "V", "F♭": "VI", "F": "VImel", "G♭": "VIIST", "G": "VIIsen" },
};

// Glosario bilingüe de grados (leyenda y tooltips) — VERBATIM de referencias/data.js.
export const DEGREE_GLOSSARY: Record<Degree, { es: string; en: string }> = {
  I: { es: "Tónica", en: "Tonic" },
  II: { es: "Supertónica", en: "Supertonic" },
  IIfr: { es: "II frigio (♭2)", en: "Phrygian II (♭2)" },
  III: { es: "Mediante", en: "Mediant" },
  IV: { es: "Subdominante", en: "Subdominant" },
  IVly: { es: "IV lidio (#4)", en: "Lydian IV (#4)" },
  V: { es: "Dominante", en: "Dominant" },
  VI: { es: "Superdominante", en: "Submediant" },
  VImel: { es: "VI melódico (#6)", en: "Melodic VI (#6)" },
  VIIST: { es: "VII subtónica (♭7)", en: "Subtonic VII (♭7)" },
  VIIsen: { es: "VII sensible (#7)", en: "Leading-tone VII (#7)" },
};

// Sufijo corto para palancas/chips (PLAN §6): el cromático muestra su alteración.
export const DEGREE_SHORT_SUFFIX: Partial<Record<Degree, string>> = {
  IIfr: "♭2",
  IVly: "#4",
  VImel: "#6",
  VIIsen: "#7",
  VIIST: "♭7",
};

/**
 * Los pares mutables del modo menor (PLAN §5.7): las dos parejas que el oído confunde,
 * porque son los grados que cambian entre las escalas natural, armónica y melódica.
 * En el juego se dibujan enlazadas, como estrellas binarias.
 */
export const MUTABLE_PAIRS: ReadonlyArray<readonly [Degree, Degree]> = [
  ["VI", "VImel"],
  ["VIIST", "VIIsen"],
];

/** Compañera de un grado dentro de su par mutable, si la tiene. */
export function mutablePartner(degree: Degree): Degree | null {
  for (const [a, b] of MUTABLE_PAIRS) {
    if (degree === a) return b;
    if (degree === b) return a;
  }
  return null;
}

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

/** Grado de una clase escrita dentro de una tonalidad (para mensajes de consola). */
export function degreeOfPitchClass(scale: Scale, pitchClass: string): Degree | undefined {
  return scaleDegrees[scale][pitchClass];
}

/**
 * Nombre del archivo de acorde menor de una tonalidad (port de `minorChordFileName`).
 * Es la firma sonora del radiofaro (PLAN §3.4): `{Timbre}/Minor Chords/{este nombre}`,
 * la misma ruta que usa la webapp seria en su `playChord()`.
 *
 * Los 75 acordes menores del bucket son archivos distintos, verificado por hash en F1.
 * (El defecto Piano=Cello que sufrió el Expreso es de los `Major Chords`, no de estos.)
 */
export function minorChordFileName(scale: Scale): string {
  return `${scale.endsWith("m") ? scale.slice(0, -1) : scale}minor.mp3`;
}

// ---------------------------------------------------------------------------
// Alturas MIDI de clases ESCRITAS (para las reglas de octava, PLAN §3.5 y §12)
// ---------------------------------------------------------------------------
// Convención de los archivos de samples: la octava sigue a la LETRA, así que B#3 suena
// C4 (midi 60) y C♭4 suena B3 (midi 59). Por eso el inventario tiene C♭3..C♭7 mientras
// el resto va en octavas 2..6. Las octavas se eligen SIEMPRE por MIDI real, nunca por
// número de grado (el Expreso documentó en su bitácora F1 por qué la regla simple falla).

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

/** Clase de altura de un grado en una tonalidad, según el mapa sagrado. */
export function pitchClassOfDegree(scale: Scale, degree: Degree): string {
  const entry = Object.entries(scaleDegrees[scale]).find(([, d]) => d === degree);
  if (!entry) throw new Error(`Grado ${degree} sin clase en ${scale}`);
  return entry[0];
}

// ---------------------------------------------------------------------------
// Tríadas de la cadencia i–iv–V–i (PLAN §3.5)
// ---------------------------------------------------------------------------
// Las clases de cada tríada salen del mapa scaleDegrees. Para iv y V NO hay samples de
// acorde en el bucket (solo existen los de las 15 tónicas), así que se apilan notas.
// La tónica sí tiene su sample y lo usa el radiofaro (§3.4); `triadFiles(scale, "i")`
// queda disponible igualmente para la cadencia.
//
// ⚠️ El V es MAYOR: su tercera es el VIIsen (la sensible de la escala armónica). Es el
// acorde que DEFINE el modo menor. Si suena menor, la tríada está mal construida.

export type TriadId = "i" | "iv" | "V";

const TRIAD_DEGREES: Record<TriadId, [Degree, Degree, Degree]> = {
  i: ["I", "III", "V"],
  iv: ["IV", "VI", "I"],
  V: ["V", "VIIsen", "II"],
};

const TRIAD_ROOT_OCTAVE = 3;

/**
 * Archivos (relativos al timbre) de la tríada pedida, en posición cerrada ascendente
 * desde la fundamental en octava 3: cada voz toma la octava que la deja dentro de
 * (0, 12] semitonos REALES por encima de la fundamental.
 */
export function triadFiles(scale: Scale, triad: TriadId, timbre: string): string[] {
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

  const files = [
    `${rootClass}${TRIAD_ROOT_OCTAVE}`,
    voice(pitchClassOfDegree(scale, thirdDeg)),
    voice(pitchClassOfDegree(scale, fifthDeg)),
  ];
  return files.map((f) => `${timbre}/${f}.mp3`);
}

// ---------------------------------------------------------------------------
// La espiral de 15 anillos del Perihelio (PLAN §12)
// ---------------------------------------------------------------------------
// Sube MELÓDICA (8 anillos), baja NATURAL (7 anillos): el gesto clásico del modo menor
// hecho trayectoria. La ortografía sale SIEMPRE del mapa; las octavas, del MIDI real.

const SCALE_WALK_ROOT_OCTAVE = 4;

/** Los 8 anillos de subida: I II III IV V VImel VIIsen I(8ª). */
const MELODIC_UP_DEGREES: Degree[] = ["I", "II", "III", "IV", "V", "VImel", "VIIsen"];
/** Los 7 anillos de bajada, desde debajo de la 8ª: VIIST VI V IV III II I. */
const NATURAL_DOWN_DEGREES: Degree[] = ["VIIST", "VI", "V", "IV", "III", "II", "I"];

export type ScaleWalkId = "melodicUp" | "naturalDown";

/**
 * Archivos de una de las dos mitades de la espiral.
 *
 * `melodicUp` arranca en la tónica de la octava 4 y termina en la tónica una octava
 * arriba; `naturalDown` arranca justo por debajo de esa octava y aterriza en la MISMA
 * tónica en la que empezó la subida — así la espiral entera es un viaje de ida y vuelta.
 *
 * Las octavas se eligen por MIDI real y no por número de grado, porque la convención de
 * los archivos hace que la octava siga a la LETRA: en A♭m el III es C♭, que escrito
 * "C♭4" suena por DEBAJO de la tónica A♭4 y rompería el ascenso — le toca C♭5.
 */
export function scaleWalkFiles(scale: Scale, walk: ScaleWalkId, timbre: string): string[] {
  const rootClass = pitchClassOfDegree(scale, "I");
  const rootMidi = writtenMidi(rootClass, SCALE_WALK_ROOT_OCTAVE);
  const octaveMidi = rootMidi + 12;
  const out: string[] = [];

  const octaveFileFor = (midiTarget: number): string => {
    for (const octave of [SCALE_WALK_ROOT_OCTAVE + 1, SCALE_WALK_ROOT_OCTAVE + 2]) {
      if (writtenMidi(rootClass, octave) === midiTarget) return `${rootClass}${octave}`;
    }
    throw new Error(`Sin octava para la tónica ${rootClass} en ${scale}`);
  };

  if (walk === "melodicUp") {
    let previousMidi = rootMidi;
    for (const degree of MELODIC_UP_DEGREES) {
      if (degree === "I") {
        out.push(`${rootClass}${SCALE_WALK_ROOT_OCTAVE}`);
        continue;
      }
      const pitchClass = pitchClassOfDegree(scale, degree);
      let chosen: string | null = null;
      for (const octave of [SCALE_WALK_ROOT_OCTAVE, SCALE_WALK_ROOT_OCTAVE + 1]) {
        const midi = writtenMidi(pitchClass, octave);
        if (midi > previousMidi && midi < octaveMidi) {
          chosen = `${pitchClass}${octave}`;
          previousMidi = midi;
          break;
        }
      }
      if (!chosen) throw new Error(`Sin octava ascendente para ${pitchClass} en ${scale}`);
      out.push(chosen);
    }
    // El 8º anillo: la tónica una octava arriba. El viaje entero era el V–i.
    out.push(octaveFileFor(octaveMidi));
    if (out.length !== 8) throw new Error(`Subida melódica incompleta en ${scale}`);
  } else {
    let previousMidi = octaveMidi;
    for (const degree of NATURAL_DOWN_DEGREES) {
      const pitchClass = pitchClassOfDegree(scale, degree);
      if (degree === "I") {
        // El aterrizaje es la tónica exacta de la que partió la subida.
        out.push(`${rootClass}${SCALE_WALK_ROOT_OCTAVE}`);
        continue;
      }
      let chosen: string | null = null;
      for (const octave of [SCALE_WALK_ROOT_OCTAVE + 1, SCALE_WALK_ROOT_OCTAVE]) {
        const midi = writtenMidi(pitchClass, octave);
        if (midi < previousMidi && midi > rootMidi) {
          chosen = `${pitchClass}${octave}`;
          previousMidi = midi;
          break;
        }
      }
      if (!chosen) throw new Error(`Sin octava descendente para ${pitchClass} en ${scale}`);
      out.push(chosen);
    }
    if (out.length !== 7) throw new Error(`Bajada natural incompleta en ${scale}`);
  }

  return out.map((f) => `${timbre}/${f}.mp3`);
}
