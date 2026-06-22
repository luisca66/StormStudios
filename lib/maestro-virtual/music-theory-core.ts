/**
 * music-theory-core.ts
 * Storm Studios Learning — Maestro Virtual
 * Motor de teoría musical: base para validación armónica
 * 
 * Método Shostakovich-Hernández Medrano
 * Autor: Luis Cárdenas / Claude (Anthropic)
 * Versión: 0.2.0 — Enarmonías correctas (spelling by degree)
 */

// ============================================================
// 1. NOTAS Y SISTEMA CROMÁTICO
// ============================================================

/**
 * Las 12 notas del sistema temperado igual.
 * Representación interna canónica en sostenidos.
 * Índice 0 = Do (C), índice 11 = Si (B)
 */
export const CHROMATIC_NOTES = [
  'C', 'C#', 'D', 'D#', 'E', 'F',
  'F#', 'G', 'G#', 'A', 'A#', 'B'
] as const;

export type NoteName = typeof CHROMATIC_NOTES[number];

/**
 * Las 7 letras musicales — la base de toda escritura tonal.
 * Cada grado de una escala ocupa exactamente una letra distinta.
 */
export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export type Letter = typeof LETTERS[number];

/**
 * Semitonos de cada letra natural (sin alteración)
 */
export const NATURAL_SEMITONES: Record<Letter, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

/**
 * Nombres en español por letra base
 */
export const LETTER_ES: Record<Letter, string> = {
  C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si',
};

/**
 * Nombres en español completos (incluyendo alteraciones)
 * Cubre naturales, sostenidos, bemoles y dobles alteraciones.
 */
export const NOTE_NAMES_ES: Record<string, string> = {
  'C': 'Do',   'C#': 'Do#',  'Cb': 'Dob',
  'D': 'Re',   'D#': 'Re#',  'Db': 'Reb',
  'E': 'Mi',   'E#': 'Mi#',  'Eb': 'Mib',
  'F': 'Fa',   'F#': 'Fa#',  'Fb': 'Fab',
  'G': 'Sol',  'G#': 'Sol#', 'Gb': 'Solb',
  'A': 'La',   'A#': 'La#',  'Ab': 'Lab',
  'B': 'Si',   'B#': 'Si#',  'Bb': 'Sib',
  // Dobles (raros pero posibles: Do# Mayor usa Si#)
  'C##': 'Dox', 'D##': 'Rex', 'F##': 'Fax', 'G##': 'Solx', 'A##': 'Lax',
};

/**
 * Calcula el pitch (0-11) de una nota dado su nombre completo.
 * Acepta: 'C', 'C#', 'Db', 'Bb', 'E#', 'Cb', etc.
 */
export function nameToPitch(name: string): number {
  const letter = name[0].toUpperCase() as Letter;
  const altStr = name.slice(1);
  if (!(letter in NATURAL_SEMITONES)) throw new Error(`Letra inválida: ${letter}`);
  let pitch = NATURAL_SEMITONES[letter];
  let i = 0;
  while (i < altStr.length) {
    const ch = altStr[i];
    if (ch === '#') { pitch++; i++; }
    else if (ch === 'b') { pitch--; i++; }
    else if (ch === 'x') { pitch += 2; i++; } // x = doble sostenido (##)
    else throw new Error(`Alteración desconocida: '${ch}' en '${name}'`);
  }
  return ((pitch % 12) + 12) % 12;
}

/**
 * Convierte un pitch (0-11) y una letra destino al nombre correcto con su alteración.
 * 
 * Principio fundamental de escritura tonal:
 * cada grado tiene su propia letra → la alteración resulta de la diferencia.
 * 
 * Ejemplo: pitch=10, letra=B → natural de B=11, diff=-1 → Bb ✓ (no A#)
 * Ejemplo: pitch=1,  letra=C → natural de C=0,  diff=+1 → C# ✓ (no Db)
 */
export function pitchToSpelledNote(pitch: number, letter: Letter): {
  nameEn: string;
  nameEs: string;
  alteration: string;
  pitch: number;
} {
  const natural = NATURAL_SEMITONES[letter];
  const diff = ((pitch - natural + 12) % 12);
  // diff: 0=natural, 1=#, 11=b, 2=##, 10=bb
  let alteration = '';
  if      (diff === 0)  alteration = '';
  else if (diff === 1)  alteration = '#';
  else if (diff === 11) alteration = 'b';
  else if (diff === 2)  alteration = '##';
  else if (diff === 10) alteration = 'bb';
  else throw new Error(`Alteración imposible: pitch=${pitch}, letra=${letter}, diff=${diff}`);

  // Display: ## shown as 'x' (double sharp symbol), bb stays 'bb'
  const altEs = alteration === '#' ? '#' : alteration === 'b' ? 'b'
              : alteration === '##' ? 'x' : alteration === 'bb' ? 'bb' : '';
  const nameEn = letter + alteration;
  const nameEs = LETTER_ES[letter] + altEs;

  return { nameEn, nameEs, alteration, pitch };
}

/**
 * Convierte un número MIDI (0-127) a pitch + octava.
 * Middle C = MIDI 60 = C4
 * Nota: devuelve el pitch crudo (0-11) — la enarmonía se resuelve en contexto de escala.
 */
export function midiToNote(midiNumber: number): { pitch: number; octave: number } {
  return {
    pitch: midiNumber % 12,
    octave: Math.floor(midiNumber / 12) - 1,
  };
}

/**
 * Convierte nombre de nota (con cualquier alteración) + octava a número MIDI
 */
export function noteToMidi(name: string, octave: number): number {
  const pitch = nameToPitch(name);
  return (octave + 1) * 12 + pitch;
}

/**
 * Índice cromático (0-11) de una nota por nombre
 */
export function noteIndex(name: string): number {
  return nameToPitch(name);
}

// ============================================================
// 2. INTERVALOS
// ============================================================

/**
 * Intervalos expresados en semitonos — referencia rápida.
 */
export const INTERVALS = {
  UNISON: 0,
  MINOR_SECOND: 1,
  MAJOR_SECOND: 2,
  MINOR_THIRD: 3,
  MAJOR_THIRD: 4,
  PERFECT_FOURTH: 5,
  AUGMENTED_FOURTH: 6,
  DIMINISHED_FIFTH: 6,
  PERFECT_FIFTH: 7,
  MINOR_SIXTH: 8,
  MAJOR_SIXTH: 9,
  MINOR_SEVENTH: 10,
  MAJOR_SEVENTH: 11,
  OCTAVE: 12,
} as const;

/**
 * Calidad de un intervalo según la teoría tonal clásica.
 * Los intervalos Justos (1ª 4ª 5ª 8ª) no pueden ser mayor/menor.
 * Los demás (2ª 3ª 6ª 7ª) no pueden ser Justos.
 */
export type IntervalQuality =
  | 'Justa'
  | 'Mayor' | 'Menor'
  | 'Aumentada' | 'Doble aumentada'
  | 'Disminuida' | 'Doble disminuida';

export interface IntervalResult {
  semitones: number;       // Distancia en semitonos (0-12+)
  generic: number;         // Número genérico: 1=unísono, 2=segunda... 8=octava
  quality: IntervalQuality;
  nameEs: string;          // Ej: "3ª Menor", "5ª Justa", "2ª Aumentada"
  nameEn: string;          // Ej: "Minor Third"
  isPerfectType: boolean;  // true = familia Justa (1ª 4ª 5ª 8ª)
  isConsonant: boolean;    // Consonancia clásica
  isDissonant: boolean;
}

/**
 * Semitonos esperados para los intervalos Justos y Mayores (grado genérico → semitonos).
 */
const PERFECT_SEMITONES: Record<number, number> = { 1:0, 4:5, 5:7, 8:12 };
const MAJOR_SEMITONES:   Record<number, number> = { 2:2, 3:4, 6:9, 7:11 };
const PERFECT_TYPE = new Set([1, 4, 5, 8]);

/**
 * Parsea una nota con cualquier alteración (incluyendo dobles) y devuelve {letter, semitones}.
 * Acepta: C, C#, Cb, C##, Cbb, Cx (x = doble sostenido)
 */
export function parseNoteFull(name: string): { letter: Letter; pitch: number } {
  const letter = name[0].toUpperCase() as Letter;
  const altStr = name.slice(1);
  if (!(letter in NATURAL_SEMITONES)) throw new Error(`Letra inválida: ${letter}`);
  let pitch = NATURAL_SEMITONES[letter];
  let i = 0;
  while (i < altStr.length) {
    const ch = altStr[i];
    if (ch === '#') { pitch++; i++; }
    else if (ch === 'b') { pitch--; i++; }
    else if (ch === 'x') { pitch += 2; i++; } // x = doble sostenido
    else throw new Error(`Alteración desconocida: '${ch}' en '${name}'`);
  }
  return { letter, pitch: ((pitch % 12) + 12) % 12 };
}

/**
 * Calcula el intervalo completo entre dos notas con su nombre teórico correcto.
 *
 * A diferencia de contar semitonos, esta función considera la LETRA de cada nota
 * para determinar el número genérico (2ª, 3ª, etc.) y luego la calidad.
 *
 * Ejemplo:
 *   C → Ebb = 2 semitonos = 3ª Disminuida  (no "2ª Mayor" aunque suenen igual)
 *   C → D#  = 3 semitonos = 2ª Aumentada   (no "3ª Menor")
 *   G# → Ab = 0 semitonos = 2ª Disminuida  (no "Unísono")
 *
 * @param noteA  Nota inferior (cualquier alteración: C, F#, Bb, Ebb, Cx, etc.)
 * @param noteB  Nota superior
 * @param descending  Si true, permite intervalo descendente (default: false = ascendente)
 */
export function classifyInterval(noteA: string, noteB: string): IntervalResult {
  const { letter: la, pitch: pa } = parseNoteFull(noteA);
  const { letter: lb, pitch: pb } = parseNoteFull(noteB);

  // Número genérico: distancia entre letras (ascendente, 1-based)
  const idxA = LETTERS.indexOf(la);
  const idxB = LETTERS.indexOf(lb);
  let generic = ((idxB - idxA + 7) % 7) + 1; // 1-7 range, +1 for 1-based

  // Semitonos reales (ascendente, módulo 12)
  const semitones = (pb - pa + 12) % 12;

  // Special case: same letter (generic=1) but semitones suggest octave-range interval
  // e.g. C → Cb = same letter, semitones=11 → this is a Diminished Octave, not augmented unison
  // Rule: if same letter and semitones >= 6, treat as octave (generic=8, semitones stays)
  if (generic === 1 && semitones >= 6) {
    generic = 8;
  }

  // Calcular calidad
  let quality: IntervalQuality;
  const isPerfectType = PERFECT_TYPE.has(generic);

  if (isPerfectType) {
    const expected = PERFECT_SEMITONES[generic] ?? 0;
    const diff = semitones - expected;
    if      (diff === 0)  quality = 'Justa';
    else if (diff === 1)  quality = 'Aumentada';
    else if (diff === 2)  quality = 'Doble aumentada';
    else if (diff === -1) quality = 'Disminuida';
    else if (diff === -2) quality = 'Doble disminuida';
    else                  quality = diff > 0 ? 'Doble aumentada' : 'Doble disminuida';
  } else {
    const expected = MAJOR_SEMITONES[generic] ?? 0;
    const diff = semitones - expected;
    if      (diff === 0)  quality = 'Mayor';
    else if (diff === -1) quality = 'Menor';
    else if (diff === 1)  quality = 'Aumentada';
    else if (diff === 2)  quality = 'Doble aumentada';
    else if (diff === -2) quality = 'Disminuida';
    else if (diff === -3) quality = 'Doble disminuida';
    else                  quality = diff > 0 ? 'Doble aumentada' : 'Doble disminuida';
  }

  // Nombre en español
  const ordinal = ['','1ª','2ª','3ª','4ª','5ª','6ª','7ª','8ª'][generic] ?? `${generic}ª`;
  const nameEs = `${ordinal} ${quality}`;

  // Nombre en inglés
  const EN_QUALITY: Record<IntervalQuality, string> = {
    'Justa': 'Perfect', 'Mayor': 'Major', 'Menor': 'Minor',
    'Aumentada': 'Augmented', 'Doble aumentada': 'Double Augmented',
    'Disminuida': 'Diminished', 'Doble disminuida': 'Double Diminished',
  };
  const EN_ORDINAL = ['','Unison','Second','Third','Fourth','Fifth','Sixth','Seventh','Octave'];
  const nameEn = `${EN_QUALITY[quality]} ${EN_ORDINAL[generic] ?? `${generic}th`}`;

  // Consonancia clásica
  const isConsonant =
    (quality === 'Justa' && (generic === 1 || generic === 5 || generic === 8)) ||
    (quality === 'Justa' && generic === 4) ||  // 4ª justa — consonante imperfecta
    ((quality === 'Mayor' || quality === 'Menor') && (generic === 3 || generic === 6));
  const isDissonant = !isConsonant;

  return { semitones, generic, quality, nameEs, nameEn, isPerfectType, isConsonant, isDissonant };
}

/**
 * Calcula el intervalo en semitonos entre dos notas (ascendente, módulo 12).
 * Para el nombre teórico correcto usar classifyInterval().
 */
export function intervalBetween(noteA: string, noteB: string): number {
  const pa = parseNoteFull(noteA).pitch;
  const pb = parseNoteFull(noteB).pitch;
  return (pb - pa + 12) % 12;
}

/**
 * Calcula el intervalo en semitonos entre dos números MIDI.
 */
export function intervalBetweenMidi(midiA: number, midiB: number): number {
  return Math.abs(midiB - midiA);
}

/**
 * Inversión de un intervalo (complemento hasta la octava).
 * 2ª Mayor → 7ª Menor, 3ª Menor → 6ª Mayor, 5ª Justa → 4ª Justa, etc.
 */
export function invertInterval(interval: IntervalResult): IntervalResult {
  // Generic: 9 - n (2→7, 3→6, 4→5, etc.)
  const invGeneric = 9 - interval.generic;
  const invSemitones = 12 - interval.semitones;

  // Quality inversion: Mayor↔Menor, Justa↔Justa, Aumentada↔Disminuida
  const INVERT_QUALITY: Record<IntervalQuality, IntervalQuality> = {
    'Mayor': 'Menor', 'Menor': 'Mayor',
    'Justa': 'Justa',
    'Aumentada': 'Disminuida', 'Disminuida': 'Aumentada',
    'Doble aumentada': 'Doble disminuida', 'Doble disminuida': 'Doble aumentada',
  };
  const invQuality = INVERT_QUALITY[interval.quality];
  const ordinal = ['','1ª','2ª','3ª','4ª','5ª','6ª','7ª','8ª'][invGeneric] ?? `${invGeneric}ª`;

  return {
    semitones: invSemitones,
    generic: invGeneric,
    quality: invQuality,
    nameEs: `${ordinal} ${invQuality}`,
    nameEn: interval.nameEn, // simplified
    isPerfectType: PERFECT_TYPE.has(invGeneric),
    isConsonant: interval.isConsonant,
    isDissonant: interval.isDissonant,
  };
}

// ============================================================
// 3. FÓRMULAS DE ESCALAS
// ============================================================

/**
 * Las fórmulas de escalas se expresan como secuencias de intervalos
 * entre grados consecutivos (en semitonos).
 * T = tono (2), S = semitono (1)
 */

export type ScaleFormula = number[]; // 7 intervalos para escalas de 8 notas

export const SCALE_FORMULAS: Record<string, ScaleFormula> = {
  // --- Escalas básicas ---
  MAJOR:            [2, 2, 1, 2, 2, 2, 1], // T T S T T T S
  NATURAL_MINOR:    [2, 1, 2, 2, 1, 2, 2], // T S T T S T T
  HARMONIC_MINOR:   [2, 1, 2, 2, 1, 3, 1], // T S T T S T+S S
  MELODIC_MINOR:     [2, 1, 2, 2, 2, 2, 1], // T S T T T T S (ascendente — VI y VII mayores)
  // Descendente = Menor Natural (se define en buildScalePattern, no como fórmula separada)
  HARMONIC_MAJOR:    [2, 2, 1, 2, 1, 3, 1], // T T S T S T+S S — Mayor con VI menor

  // --- Modos de la escala mayor (desde cada grado) ---
  IONIAN:           [2, 2, 1, 2, 2, 2, 1], // = Escala mayor (I)
  DORIAN:           [2, 1, 2, 2, 2, 1, 2], // II
  PHRYGIAN:         [1, 2, 2, 2, 1, 2, 2], // III
  LYDIAN:           [2, 2, 2, 1, 2, 2, 1], // IV
  MIXOLYDIAN:       [2, 2, 1, 2, 2, 1, 2], // V
  AEOLIAN:          [2, 1, 2, 2, 1, 2, 2], // VI = Menor natural
  LOCRIAN:          [1, 2, 2, 1, 2, 2, 2], // VII
};


// ============================================================
// 3b. TETRACORDES
// ============================================================

/**
 * Los tetracordes son los módulos de 4 notas en que se divide cada escala.
 * Cada escala heptáfona tiene dos tetracordes separados por un tono:
 *   - Tetracorde Inferior: grados I-II-III-IV
 *   - Tetracorde Superior: grados V-VI-VII-VIII
 *
 * Los 4 tipos básicos (fórmula = 3 intervalos entre 4 notas):
 */
export const TETRACHORD_TYPES = {
  MAJOR:    { formula: [2, 2, 1], nameEs: 'Mayor',    symbol: 'M',   description: 'T-T-S — Do Re Mi Fa' },
  MINOR:    { formula: [2, 1, 2], nameEs: 'Menor',    symbol: 'm',   description: 'T-S-T — Re Mi Fa Sol' },
  HARMONIC: { formula: [1, 3, 1], nameEs: 'Armónico', symbol: 'Arm', description: 'S-T+S-S — Segunda aumentada' },
  PHRYGIAN: { formula: [1, 2, 2], nameEs: 'Frigio',   symbol: 'Fri', description: 'S-T-T — Se usa descendente' },
} as const;

export type TetrachordType = keyof typeof TETRACHORD_TYPES;

/**
 * Identifica el tipo de tetracorde dado sus 3 intervalos consecutivos.
 */
export function identifyTetrachord(steps: number[]): TetrachordType | null {
  for (const [type, info] of Object.entries(TETRACHORD_TYPES)) {
    if (JSON.stringify(info.formula) === JSON.stringify(steps)) {
      return type as TetrachordType;
    }
  }
  return null;
}

export interface TetrachordAnalysis {
  type: TetrachordType | null;
  typeLabel: string;
  symbol: string;
  notes: ScaleNote[];
  steps: number[];
}

/**
 * Analiza los dos tetracordes de una escala.
 * Devuelve inferior (I-IV) y superior (V-VIII).
 *
 * Nota: para la Menor Melódica, el análisis se hace sobre la forma ascendente.
 * El tetracorde superior de la bajada pertenece a la Menor Natural.
 */
export function analyzeScaleTetrachords(root: string, scaleType: string): {
  lower: TetrachordAnalysis;
  upper: TetrachordAnalysis;
} {
  const scale = buildScale(root, scaleType);
  const notes = scale.notes; // 8 notas: grados 1-8

  const lowerNotes = notes.slice(0, 4);  // I II III IV
  const upperNotes = notes.slice(4, 8);  // V VI VII VIII

  const lowerSteps = [0,1,2].map(i => lowerNotes[i+1].semitoneFromRoot - lowerNotes[i].semitoneFromRoot);
  const upperSteps = [0,1,2].map(i => upperNotes[i+1].semitoneFromRoot - upperNotes[i].semitoneFromRoot);

  const lowerType = identifyTetrachord(lowerSteps);
  const upperType = identifyTetrachord(upperSteps);

  return {
    lower: {
      type: lowerType,
      typeLabel: lowerType ? TETRACHORD_TYPES[lowerType].nameEs : 'Desconocido',
      symbol: lowerType ? TETRACHORD_TYPES[lowerType].symbol : '?',
      notes: lowerNotes,
      steps: lowerSteps,
    },
    upper: {
      type: upperType,
      typeLabel: upperType ? TETRACHORD_TYPES[upperType].nameEs : 'Desconocido',
      symbol: upperType ? TETRACHORD_TYPES[upperType].symbol : '?',
      notes: upperNotes,
      steps: upperSteps,
    },
  };
}

// ============================================================
// 4. CONSTRUCCIÓN DE ESCALAS (con enarmonías correctas)
// ============================================================

export interface ScaleNote {
  degree: number;          // Grado (1-8)
  nameEn: string;          // Nombre en inglés con alteración correcta (e.g. 'Bb', 'F#', 'E#')
  nameEs: string;          // Nombre en español correcto (e.g. 'Sib', 'Fa#', 'Mi#')
  letter: Letter;          // Letra base sin alteración (e.g. 'B', 'F', 'E')
  alteration: string;      // Alteración: '', '#', 'b', '##', 'bb'
  pitch: number;           // Pitch cromático 0-11
  midiBase: number;        // MIDI en octava 4 (referencia)
  semitoneFromRoot: number;// Distancia desde la tónica en semitonos
}

export interface Scale {
  root: string;            // Nombre de la tónica como se escribió ('Bb', 'F#', 'C', etc.)
  rootLetter: Letter;      // Letra base de la tónica
  type: string;
  formula: ScaleFormula;
  notes: ScaleNote[];
}

/**
 * Construye una escala con enarmonías correctas.
 * 
 * Regla fundamental: cada grado tiene su propia letra.
 * La escala de Re Mayor usa: D E F# G A B C# D  — nunca Gb ni Db.
 * La escala de Fa Mayor usa: F G A Bb C D E F   — nunca A#.
 * 
 * @param root  Tónica, e.g. 'C', 'F#', 'Bb', 'Eb'
 * @param type  Tipo, e.g. 'MAJOR', 'HARMONIC_MINOR', 'DORIAN'
 */
export function buildScale(root: string, type: string): Scale {
  const formula = SCALE_FORMULAS[type];
  if (!formula) throw new Error(`Tipo de escala desconocido: ${type}`);

  // Parsear la tónica
  const rootLetter = root[0].toUpperCase() as Letter;
  if (!LETTERS.includes(rootLetter)) throw new Error(`Letra inválida: ${rootLetter}`);

  const rootPitch = nameToPitch(root);
  const rootMidi = noteToMidi(root, 4);
  const letterIdx = LETTERS.indexOf(rootLetter);

  const notes: ScaleNote[] = [];
  let semitoneAccum = 0;

  for (let i = 0; i <= formula.length; i++) {
    const pitch = (rootPitch + semitoneAccum) % 12;
    const letter = LETTERS[(letterIdx + i) % 7];
    const spelled = pitchToSpelledNote(pitch, letter);

    notes.push({
      degree: i + 1,
      nameEn: spelled.nameEn,
      nameEs: spelled.nameEs,
      letter,
      alteration: spelled.alteration,
      pitch,
      midiBase: rootMidi + semitoneAccum,
      semitoneFromRoot: semitoneAccum,
    });

    if (i < formula.length) semitoneAccum += formula[i];
  }

  return { root, rootLetter, type, formula, notes };
}

/**
 * Devuelve las notas de una escala como array de nombres en español
 */
export function scaleNoteNames(root: string, type: string): string[] {
  return buildScale(root, type).notes.map(n => n.nameEs);
}

/**
 * Verifica si un pitch MIDI pertenece a una escala dada (sin importar octava)
 */
export function isNoteInScale(midiNote: number, root: string, type: string): boolean {
  const { pitch } = midiToNote(midiNote);
  const scale = buildScale(root, type);
  return scale.notes.some(n => n.pitch === pitch);
}

// ============================================================
// 5. MODOS — RELACIONES Y CARACTERÍSTICAS
// ============================================================

export interface ModeInfo {
  name: string;
  nameEs: string;
  degree: number;       // Grado de la escala mayor del que parte
  formula: ScaleFormula;
  character: string;    // Carácter modal (descripción pedagógica)
  thirdQuality: 'mayor' | 'menor';
  seventhQuality: 'mayor' | 'menor' | 'ninguna';
}

export const MODES: Record<string, ModeInfo> = {
  IONIAN: {
    name: 'Ionian',
    nameEs: 'Jónico',
    degree: 1,
    formula: SCALE_FORMULAS.IONIAN,
    character: 'Brillante, estable. Es la escala mayor tradicional.',
    thirdQuality: 'mayor',
    seventhQuality: 'mayor',
  },
  DORIAN: {
    name: 'Dorian',
    nameEs: 'Dórico',
    degree: 2,
    formula: SCALE_FORMULAS.DORIAN,
    character: 'Menor con 6ª mayor. Sonido jazzístico y modal.',
    thirdQuality: 'menor',
    seventhQuality: 'menor',
  },
  PHRYGIAN: {
    name: 'Phrygian',
    nameEs: 'Frigio',
    degree: 3,
    formula: SCALE_FORMULAS.PHRYGIAN,
    character: 'Menor con 2ª menor. Sonido español, oscuro y exótico.',
    thirdQuality: 'menor',
    seventhQuality: 'menor',
  },
  LYDIAN: {
    name: 'Lydian',
    nameEs: 'Lidio',
    degree: 4,
    formula: SCALE_FORMULAS.LYDIAN,
    character: 'Mayor con 4ª aumentada. Sonido etéreo y fantasioso.',
    thirdQuality: 'mayor',
    seventhQuality: 'mayor',
  },
  MIXOLYDIAN: {
    name: 'Mixolydian',
    nameEs: 'Mixolidio',
    degree: 5,
    formula: SCALE_FORMULAS.MIXOLYDIAN,
    character: 'Mayor con 7ª menor. Sonido del blues y rock.',
    thirdQuality: 'mayor',
    seventhQuality: 'menor',
  },
  AEOLIAN: {
    name: 'Aeolian',
    nameEs: 'Eólico',
    degree: 6,
    formula: SCALE_FORMULAS.AEOLIAN,
    character: 'Menor natural. Base de la tonalidad menor.',
    thirdQuality: 'menor',
    seventhQuality: 'menor',
  },
  LOCRIAN: {
    name: 'Locrian',
    nameEs: 'Locrio',
    degree: 7,
    formula: SCALE_FORMULAS.LOCRIAN,
    character: 'Con 5ª disminuida. Inestable, raramente usado como centro tonal.',
    thirdQuality: 'menor',
    seventhQuality: 'menor',
  },
};

/**
 * Dado un modo y su tónica, encuentra la escala mayor "madre" de la que proviene.
 * Ej: Re Dórico → Do mayor
 */
export function findParentMajorScale(root: string, mode: string): string {
  const modeInfo = MODES[mode];
  if (!modeInfo) throw new Error(`Modo desconocido: ${mode}`);

  // La tónica del modo es el grado N de la escala mayor madre.
  // Encontramos la madre buscando qué mayor tiene 'root' en el grado correcto.
  const rootPitch = nameToPitch(root);
  const majorScale = buildScale('C', 'MAJOR');
  const semitoneOffset = majorScale.notes[modeInfo.degree - 1].semitoneFromRoot;
  const parentPitch = (rootPitch - semitoneOffset + 12) % 12;
  // Devolver el nombre correcto (con bemol si necesario) según la escala madre
  // Para simplificar usamos la lista estándar de tonalidades mayores
  const MAJOR_KEYS = ['C','G','D','A','E','B','F#','F','Bb','Eb','Ab','Db'];
  return MAJOR_KEYS.find(k => nameToPitch(k) === parentPitch) ?? CHROMATIC_NOTES[parentPitch];
}

/**
 * Dado una escala mayor, devuelve todos sus modos con sus tónicas correctas
 */
export function getAllModesFromMajor(majorRoot: string): Array<{ mode: string; root: string; scale: Scale }> {
  const majorScale = buildScale(majorRoot, 'MAJOR');
  const modeNames = ['IONIAN', 'DORIAN', 'PHRYGIAN', 'LYDIAN', 'MIXOLYDIAN', 'AEOLIAN', 'LOCRIAN'];

  return modeNames.map((modeName, i) => {
    const modeRoot = majorScale.notes[i].nameEn;
    return {
      mode: modeName,
      root: modeRoot,
      scale: buildScale(modeRoot, modeName),
    };
  });
}

// ============================================================
// 6. VERIFICACIÓN DE ESCALAS EN MIDI
// ============================================================

export interface ScaleVerificationResult {
  isCorrect: boolean;
  errors: string[];
  details: {
    expectedNotes: string[];   // Nombres esperados de las 15 notas
    foundNotes: string[];      // Nombres encontrados en la secuencia del alumno
    wrongPositions: Array<{ position: number; expected: string; found: string }>;
  };
}

/**
 * Construye el patrón completo de semitonos (15 notas: ida + vuelta)
 * para cualquier tipo de escala.
 *
 * Regla especial de la Menor Melódica:
 *   - Sube con VI y VII mayores (fórmula melódica)
 *   - Baja con VI y VII menores (= menor natural)
 *
 * Todas las demás escalas bajan con la misma fórmula que suben.
 *
 * Las 15 posiciones son:
 *   1-8:  tónica → octava (subida)
 *   9-14: g7desc → g2desc (bajada, 6 notas intermedias)
 *   15:   tónica baja final
 */
export function buildScalePattern(root: string, scaleType: string): {
  ascending: ScaleNote[];   // 8 notas subiendo (grados 1-8)
  descending: ScaleNote[];  // 8 notas bajando (octava→tónica, misma dirección)
  full: number[];           // 15 semitonos desde la tónica (para verificación MIDI)
  ascNotes: string[];       // Nombres en español, subida (8 notas)
  descNotes: string[];      // Nombres en español, bajada completa (8 notas, octava→tónica)
} {
  const ascScale = buildScale(root, scaleType);

  // Escala descendente: para melódica usa natural, para el resto usa la misma
  const descScaleType = scaleType === 'MELODIC_MINOR' ? 'NATURAL_MINOR' : scaleType;
  const descScale = buildScale(root, descScaleType);

  // Subida: grados 1→8 (semitonos crecientes)
  const ascSemitones = ascScale.notes.map(n => n.semitoneFromRoot); // [0,2,3,5,7,9,11,12]

  // Bajada: desde g7 hasta g2 (sin repetir octava ni tónica, que ya están en posiciones 8 y 15)
  // descScale.notes = [tónica(0), g2, g3, g4, g5, g6, g7, octava(12)]
  // Queremos: g7, g6, g5, g4, g3, g2 → invertir grados 2-7 = índices 1-6
  const descMiddleSemitones = descScale.notes
    .slice(1, 7)                          // g2, g3, g4, g5, g6, g7
    .reverse()                            // g7, g6, g5, g4, g3, g2
    .map(n => n.semitoneFromRoot);        // sus semitonos

  // Patrón completo de 15 semitonos:
  // [0, g2asc, g3asc, g4asc, g5asc, g6asc, g7asc, 12, g7desc, g6desc, g5desc, g4desc, g3desc, g2desc, 0]
  const full = [
    ...ascSemitones,        // 8 valores (incluye tónica=0 y octava=12)
    ...descMiddleSemitones, // 6 valores intermedios bajando
    0,                      // tónica baja final
  ]; // = 8 + 6 + 1 = 15 ✓

  // Nombres para las 15 posiciones
  const ascNotes   = ascScale.notes.map(n => n.nameEs);  // 8 nombres subiendo

  // Nombres bajando completo (octava → tónica = 8 nombres)
  const descNamesAll = [
    ascScale.notes[7].nameEs,                                          // octava (misma que subida)
    ...descScale.notes.slice(1, 7).reverse().map(n => n.nameEs),       // g7→g2 (6 nombres)
    descScale.notes[0].nameEs,                                         // tónica baja
  ]; // 8 nombres

  return {
    ascending:  ascScale.notes,
    descending: descScale.notes,
    full,
    ascNotes,
    descNotes: descNamesAll,
  };
}

/**
 * Verifica una secuencia MIDI de 15 notas contra una escala.
 * La tónica puede estar en cualquier octava — se toma de la primera nota del alumno.
 *
 * Para Menor Melódica: sube con la forma melódica, baja con la natural.
 * Para todas las demás: sube y baja con la misma fórmula.
 */
export function verifyScaleMidi(
  midiSequence: number[],
  root: string,
  scaleType: string,
): ScaleVerificationResult {
  const pattern = buildScalePattern(root, scaleType);
  const tonica = midiSequence[0]; // octava libre

  const errors: string[] = [];
  const wrongPositions: Array<{ position: number; expected: string; found: string }> = [];

  if (midiSequence.length !== 15) {
    errors.push(`Se esperaban 15 notas, se encontraron ${midiSequence.length}.`);
  }

  // Nombres esperados para cada una de las 15 posiciones
  // Posiciones 1-8:  nombres ascendentes (incluye octava en pos 8)
  // Posiciones 9-14: g7desc → g2desc (bajando, sin repetir octava)
  // Posición 15:     tónica baja
  const expectedNames = [
    ...pattern.ascNotes,                // 8 nombres subiendo (pos 1-8, pos 8 = octava)
    ...pattern.descNotes.slice(1, 7),   // 6 nombres intermedios bajando (pos 9-14, sin octava ni tónica)
    pattern.ascNotes[0],                // tónica baja final (pos 15)
  ]; // 8 + 6 + 1 = 15 ✓

  const compareCount = Math.min(midiSequence.length, pattern.full.length);

  for (let i = 0; i < compareCount; i++) {
    const expectedMidi = tonica + pattern.full[i];
    const foundMidi    = midiSequence[i];

    if (expectedMidi !== foundMidi) {
      const foundNote = midiToNote(foundMidi);
      // Para el nombre encontrado, mostrar con la enarmonía de la escala si pertenece,
      // o el nombre cromático simple si no pertenece
      const foundInAsc  = pattern.ascending.find(n => n.pitch === foundNote.pitch);
      const foundInDesc = pattern.descending.find(n => n.pitch === foundNote.pitch);
      const foundName   = (foundInAsc?.nameEs ?? foundInDesc?.nameEs ?? CHROMATIC_NOTES[foundNote.pitch]) + foundNote.octave;

      wrongPositions.push({
        position: i + 1,
        expected: expectedNames[i],
        found: foundName,
      });
      errors.push(
        `Nota ${i + 1}: se esperaba ${expectedNames[i]}, se encontró ${foundName}`
      );
    }
  }

  return {
    isCorrect: errors.length === 0,
    errors,
    details: {
      expectedNotes: expectedNames,
      foundNotes: midiSequence.map((m) => {
        const n = midiToNote(m);
        const inAsc  = pattern.ascending.find(s => s.pitch === n.pitch);
        const inDesc = pattern.descending.find(s => s.pitch === n.pitch);
        return (inAsc?.nameEs ?? inDesc?.nameEs ?? CHROMATIC_NOTES[n.pitch]) + n.octave;
      }),
      wrongPositions,
    },
  };
}

// ============================================================
// 7. UTILIDADES DE CONSULTA (para el Maestro Virtual)
// ============================================================

/**
 * Lista todas las escalas mayores con sus notas
 */
export function allMajorScales(): Scale[] {
  return CHROMATIC_NOTES.map(note => buildScale(note, 'MAJOR'));
}

/**
 * Dado un conjunto de notas MIDI, identifica a qué escala/modo pertenecen
 * (útil para análisis armónico libre)
 */
export function identifyScale(midiNotes: number[]): Array<{ root: string; type: string; matchPercentage: number }> {
  // Desde MIDI crudo solo conocemos clases de altura (0-11), no la grafía
  // enarmónica, así que comparamos por pitch class (antes usaba midiToNote().name,
  // propiedad inexistente que rompía el build).
  const inputPcs = [...new Set(midiNotes.map(m => ((m % 12) + 12) % 12))];
  const results: Array<{ root: string; type: string; matchPercentage: number }> = [];

  const typesToCheck = Object.keys(SCALE_FORMULAS);

  for (const root of CHROMATIC_NOTES) {
    for (const type of typesToCheck) {
      const scalePcs = new Set(buildScale(root, type).notes.slice(0, 7).map(n => n.pitch));
      const matches = inputPcs.filter(p => scalePcs.has(p)).length;
      const matchPercentage = (matches / inputPcs.length) * 100;
      if (matchPercentage >= 70) { // Al menos 70% de notas coinciden
        results.push({ root, type, matchPercentage: Math.round(matchPercentage) });
      }
    }
  }

  return results.sort((a, b) => b.matchPercentage - a.matchPercentage);
}

// ============================================================
// 8. EXPORTS DE RESUMEN
// ============================================================

// ============================================================
// 5. ACORDES DE 5ª (TRÍADAS)
// ============================================================

/**
 * Los cuatro tipos de tríada del curso Shostakovich-Hernández Medrano.
 * Un acorde es mayor o menor por su 3ª, y aumentado o disminuido por su 5ª.
 */
export const TRIAD_TYPES = {
  MAJOR:      { third: 4, fifth: 7, nameEs: 'Mayor',      nameEn: 'Major',      symbol: 'M',  suffix: '' },
  MINOR:      { third: 3, fifth: 7, nameEs: 'Menor',      nameEn: 'Minor',      symbol: 'm',  suffix: 'm' },
  DIMINISHED: { third: 3, fifth: 6, nameEs: 'Disminuido', nameEn: 'Diminished', symbol: '°',  suffix: '°' },
  AUGMENTED:  { third: 4, fifth: 8, nameEs: 'Aumentado',  nameEn: 'Augmented',  symbol: '+',  suffix: '+' },
} as const;

export type TriadType = keyof typeof TRIAD_TYPES;

/**
 * Estado (inversión) de un acorde de 5ª.
 * Cifrado europeo del curso: F = fundamental, 6/3 = 1ª inv., 6/4 = 2ª inv.
 */
export const TRIAD_INVERSIONS = {
  ROOT:   { cifrado: 'F',   nameEs: 'Estado fundamental', nameEn: 'Root position',    bassInterval: 0 },
  FIRST:  { cifrado: '6/3', nameEs: 'Primera inversión',  nameEn: 'First inversion',  bassInterval: 3 }, // 3ª en el bajo
  SECOND: { cifrado: '6/4', nameEs: 'Segunda inversión',  nameEn: 'Second inversion', bassInterval: 7 }, // 5ª en el bajo
} as const;

export type TriadInversion = keyof typeof TRIAD_INVERSIONS;

export interface TriadNote {
  nameEs: string;
  nameEn: string;
  letter: Letter;
  pitch: number;
  midiBase: number;
  role: 'fundamental' | 'third' | 'fifth'; // función armónica
}

export interface TriadResult {
  root: string;              // Nota fundamental (ej: 'C', 'F#', 'Bb')
  type: TriadType;
  inversion: TriadInversion;
  notes: TriadNote[];        // [bajo, ..., soprano] según inversión
  bassNote: TriadNote;       // Nota en el bajo (determina el estado)
  cifrado: string;           // 'F', '6/3', '6/4'
  nameEs: string;            // Ej: 'Do Mayor F', 'Re Menor 6/3'
  // Análisis interválico
  thirdInterval: IntervalResult;
  fifthInterval: IntervalResult;
  // Región tonal (se completa al armonizar)
  degree?: number;           // Grado en la escala (1-7)
  degreeRoman?: string;      // 'I', 'II', 'iii', etc.
}

/**
 * Construye una tríada dado su fundamental, tipo e inversión.
 *
 * @param root     Nota fundamental: 'C', 'F#', 'Bb', 'D#', etc.
 * @param type     'MAJOR' | 'MINOR' | 'DIMINISHED' | 'AUGMENTED'
 * @param inversion 'ROOT' | 'FIRST' | 'SECOND'
 * @param octave   Octava MIDI de referencia para la fundamental (default 4 = octava media)
 */
export function buildTriad(
  root: string,
  type: TriadType,
  inversion: TriadInversion = 'ROOT',
  octave: number = 4
): TriadResult {
  const { letter: rootLetter, pitch: rootPitch } = parseNoteFull(root);
  const triadInfo = TRIAD_TYPES[type];
  const invInfo   = TRIAD_INVERSIONS[inversion];

  const rootIdx    = LETTERS.indexOf(rootLetter);
  const rootMidi   = (octave + 1) * 12 + rootPitch;

  // Calculate third: letter is rootLetter + 2 positions
  const thirdLetter = LETTERS[(rootIdx + 2) % 7] as Letter;
  const thirdPitch  = (rootPitch + triadInfo.third) % 12;
  const thirdSpell  = pitchToSpelledNote(thirdPitch, thirdLetter);

  // Calculate fifth: letter is rootLetter + 4 positions
  const fifthLetter = LETTERS[(rootIdx + 4) % 7] as Letter;
  const fifthPitch  = (rootPitch + triadInfo.fifth) % 12;
  const fifthSpell  = pitchToSpelledNote(fifthPitch, fifthLetter);

  // Build the three chord tones
  const fundamental: TriadNote = {
    nameEs: pitchToSpelledNote(rootPitch, rootLetter).nameEs,
    nameEn: pitchToSpelledNote(rootPitch, rootLetter).nameEn,
    letter: rootLetter,
    pitch:  rootPitch,
    midiBase: rootMidi,
    role: 'fundamental',
  };
  const third: TriadNote = {
    nameEs: thirdSpell.nameEs,
    nameEn: thirdSpell.nameEn,
    letter: thirdLetter,
    pitch:  thirdPitch,
    midiBase: rootMidi + triadInfo.third,
    role: 'third',
  };
  const fifth: TriadNote = {
    nameEs: fifthSpell.nameEs,
    nameEn: fifthSpell.nameEn,
    letter: fifthLetter,
    pitch:  fifthPitch,
    midiBase: rootMidi + triadInfo.fifth,
    role: 'fifth',
  };

  // Order notes by inversion (bass note first)
  let notes: TriadNote[];
  let bassNote: TriadNote;
  switch (inversion) {
    case 'ROOT':
      notes = [fundamental, third, fifth];
      bassNote = fundamental;
      break;
    case 'FIRST':
      notes = [third, fifth, fundamental];
      bassNote = third;
      break;
    case 'SECOND':
      notes = [fifth, fundamental, third];
      bassNote = fifth;
      break;
  }

  // Interval analysis (always from fundamental, ascending)
  const thirdInterval = classifyInterval(root, thirdSpell.nameEn);
  const fifthInterval = classifyInterval(root, fifthSpell.nameEn);

  const rootNameEs = fundamental.nameEs;
  const typeNameEs = triadInfo.nameEs;
  const nameEs = `${rootNameEs} ${typeNameEs} ${invInfo.cifrado}`;

  return {
    root,
    type,
    inversion,
    notes,
    bassNote,
    cifrado: invInfo.cifrado,
    nameEs,
    thirdInterval,
    fifthInterval,
  };
}

/**
 * Identifica el tipo de tríada dado un array de tres notas (en cualquier orden).
 * Útil para analizar un acorde dado por el estudiante.
 */
export function identifyTriad(noteNames: string[]): {
  root: string;
  type: TriadType | null;
  inversion: TriadInversion;
} | null {
  if (noteNames.length !== 3) return null;

  // Try each note as potential root
  for (const potentialRoot of noteNames) {
    const { pitch: rp, letter: rl } = parseNoteFull(potentialRoot);
    const rootIdx = LETTERS.indexOf(rl);

    // Expected third and fifth letters
    const expectedThirdLetter = LETTERS[(rootIdx + 2) % 7];
    const expectedFifthLetter = LETTERS[(rootIdx + 4) % 7];

    // Find the notes that match those letters
    const thirdNote = noteNames.find(n => n[0].toUpperCase() === expectedThirdLetter);
    const fifthNote = noteNames.find(n => n[0].toUpperCase() === expectedFifthLetter);

    if (!thirdNote || !fifthNote) continue;

    const thirdSemitones = (parseNoteFull(thirdNote).pitch - rp + 12) % 12;
    const fifthSemitones  = (parseNoteFull(fifthNote).pitch  - rp + 12) % 12;

    // Match against triad types
    let matchedType: TriadType | null = null;
    for (const [ttype, info] of Object.entries(TRIAD_TYPES)) {
      if (info.third === thirdSemitones && info.fifth === fifthSemitones) {
        matchedType = ttype as TriadType;
        break;
      }
    }
    if (!matchedType) continue;

    // Determine inversion by bass note (first in array)
    const bassNote = noteNames[0];
    let inversion: TriadInversion = 'ROOT';
    if (bassNote[0].toUpperCase() === expectedThirdLetter) inversion = 'FIRST';
    else if (bassNote[0].toUpperCase() === expectedFifthLetter) inversion = 'SECOND';

    return { root: potentialRoot, type: matchedType, inversion };
  }
  return null;
}

/**
 * Construye todos los acordes de 5ª de una escala (armonización diatónica).
 * Devuelve los 7 acordes de la escala con su grado, tipo y cifrado romano.
 *
 * Notación romana del curso:
 *   Mayores    → I, IV, V  (mayúsculas)
 *   Menores    → II, III, VI (minúsculas en la práctica, pero el curso usa mayúsculas con 'm')
 *   Disminuido → VII° (ambos modos), II° (modo menor)
 *   Aumentado  → III+ (modo menor)
 */
export interface DiatonicTriad {
  degree: number;          // 1-7
  degreeRoman: string;     // 'I', 'II', 'III'... con símbolo de tipo
  root: string;            // Nota fundamental
  triad: TriadResult;
  region: 'tonica' | 'subdominante' | 'dominante';
}

// Región tonal de cada grado según el curso (p.10)
const TONAL_REGIONS: Record<number, 'tonica' | 'subdominante' | 'dominante'> = {
  1: 'tonica',
  2: 'subdominante',
  3: 'tonica',       // modal — puede pertenecer a dos regiones
  4: 'subdominante',
  5: 'dominante',
  6: 'tonica',       // modal — puede pertenecer a dos regiones
  7: 'dominante',
};

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

export function harmonizeScale(scaleRoot: string, scaleType: string): DiatonicTriad[] {
  const scale = buildScale(scaleRoot, scaleType);
  const notes = scale.notes.slice(0, 7); // grados I-VII

  return notes.map((scaleNote, i) => {
    const degree = i + 1;
    const root   = scaleNote.nameEn;

    // Find triad type that fits within the scale
    let matchedType: TriadType = 'MAJOR';
    for (const [ttype, info] of Object.entries(TRIAD_TYPES)) {
      const thirdPitch = (scaleNote.pitch + info.third) % 12;
      const fifthPitch  = (scaleNote.pitch + info.fifth)  % 12;
      // Check if third and fifth are in the scale
      const thirdInScale = notes.some(n => n.pitch === thirdPitch);
      const fifthInScale  = notes.some(n => n.pitch === fifthPitch);
      if (thirdInScale && fifthInScale) {
        matchedType = ttype as TriadType;
        break;
      }
    }

    const triad = buildTriad(root, matchedType);
    triad.degree      = degree;
    // Cifrado romano del curso: todos en mayúsculas + símbolo de tipo
    const sym = matchedType === 'MINOR' ? 'm' 
              : matchedType === 'DIMINISHED' ? '°'
              : matchedType === 'AUGMENTED' ? '+'
              : ''; // MAJOR: sin símbolo
    triad.degreeRoman = ROMAN[degree] + sym;

    const region = TONAL_REGIONS[degree];

    return { degree, degreeRoman: triad.degreeRoman, root, triad, region };
  });
}


// ⬇️ El objeto agregado `MusicTheoryCore` y su `export default` se definen al
//    FINAL del archivo (después de TODAS las declaraciones) para evitar el TDZ:
//    referencian VOICE_RANGES, analyzeSATBChord, etc., declarados más abajo.
//    (Antes estaban aquí y el módulo reventaba al importarse.)

// ============================================================
// 6. CUARTETO VOCAL SATB
// ============================================================

/**
 * Tesituras de las cuatro voces según el curso Hernández Medrano (p.12).
 * Expresadas en números MIDI. C4 = 60, C5 = 72, etc.
 *
 * Soprano:   C4–A5  (Do4–La5)
 * Contralto: G3–E5  (Sol3–Mi5)
 * Tenor:     C3–A4  (Do3–La4)  — escrita en clave de fa, suena una octava más grave
 * Bajo:      E2–C4  (Mi2–Do4)
 */
export const VOICE_RANGES = {
  SOPRANO:  { min: 60, max: 81, nameEs: 'Soprano',  nameEn: 'Soprano',  clef: 'treble', gender: 'F' },
  ALTO:     { min: 55, max: 76, nameEs: 'Contralto', nameEn: 'Alto',    clef: 'treble', gender: 'F' },
  TENOR:    { min: 48, max: 69, nameEs: 'Tenor',    nameEn: 'Tenor',    clef: 'bass',   gender: 'M' },
  BASS:     { min: 40, max: 60, nameEs: 'Bajo',     nameEn: 'Bass',     clef: 'bass',   gender: 'M' },
} as const;

export type Voice = keyof typeof VOICE_RANGES;

/**
 * Extensiones máximas entre voces adyacentes (p.12):
 * - Soprano–Contralto: máximo una octava (12 semitonos)
 * - Contralto–Tenor:   máximo una octava (12 semitonos) — la más estricta
 * - Tenor–Bajo:        máximo dos octavas (24 semitonos)
 */
export const MAX_VOICE_SPACING: Record<string, number> = {
  'SOPRANO-ALTO':  12,
  'ALTO-TENOR':    12,
  'TENOR-BASS':    24,
};

// ============================================================
// 6b. MOVIMIENTOS MELÓDICOS PERMITIDOS
// ============================================================

/**
 * Intervalos melódicos permitidos en el coral (p.13):
 * 2ªm, 2ªM, 3ªm, 3ªM, 4ªJ, 5ªJ, 6ªm, 6ªM, 8ªJ
 * No se permiten aumentados, disminuidos, 7ªs, ni mayores a la octava.
 *
 * Además se permiten ciertos intervalos DISMINUIDOS si a continuación
 * se cambia de dirección (compensación melódica).
 */
export const MELODIC_INTERVALS_ALLOWED = new Set([1, 2, 3, 4, 5, 7, 8, 9, 12]); // semitonos

export const MELODIC_INTERVAL_CLASSES: Record<number, string> = {
  1:  'Grado conjunto',   // 2ª menor
  2:  'Grado conjunto',   // 2ª mayor
  3:  'Camino corto',     // 3ª menor
  4:  'Camino corto',     // 3ª mayor
  5:  'Salto corto',      // 4ª justa
  7:  'Salto largo',      // 5ª justa
  8:  'Salto largo',      // 6ª menor
  9:  'Salto largo',      // 6ª mayor
  12: 'Salto largo',      // 8ª justa
};

// Intervalos disminuidos permitidos CON compensación (cambio de dirección)
export const MELODIC_DIMINISHED_WITH_COMPENSATION = new Set([6, 10]); // 4ªd/5ªd=6st, 7ªd=10st

// ============================================================
// 6c. CHORD VOICING — estado, posición melódica, disposición
// ============================================================

export type MelodicPosition = 'octava' | 'tercera' | 'quinta'; // posición melódica = nota en soprano
export type InternalDisposition = 'cerrada' | 'abierta';

export interface SATBChord {
  soprano: number;   // MIDI
  alto:    number;
  tenor:   number;
  bass:    number;
  // Derived
  root:    string;   // Nota fundamental del acorde
  triadType: TriadType;
  inversion: TriadInversion;
  melodicPosition: MelodicPosition;
  disposition: InternalDisposition;
}

/**
 * Dado un acorde SATB (4 notas MIDI), identifica:
 * - Inversión (F / 6/3 / 6/4) según la nota en el bajo
 * - Posición melódica según la nota en la soprano
 * - Disposición interna (cerrada / abierta)
 */
export function analyzeSATBChord(
  soprano: number, alto: number, tenor: number, bass: number,
  scaleRoot: string, scaleType: string
): SATBChord | null {
  // Get pitches (0-11)
  const pitches = [soprano, alto, tenor, bass].map(m => m % 12);
  const uniquePitches = [...new Set(pitches)];
  if (uniquePitches.length < 3) return null; // need at least 3 distinct pitches

  // Find the chord from scale harmonization
  const scale = harmonizeScale(scaleRoot, scaleType);
  for (const diatonic of scale) {
    const triad = diatonic.triad;
    // `triad.notes` es un arreglo de TriadNote; lo resolvemos por `role` para no
    // depender del orden ni de la inversión (antes accedía a .fundamental/.third
    // /.fifth como si fuera un objeto, lo cual era undefined).
    const fundamentalNote = triad.notes.find(n => n.role === 'fundamental')!;
    const thirdNote       = triad.notes.find(n => n.role === 'third')!;
    const fifthNote       = triad.notes.find(n => n.role === 'fifth')!;
    const chordPitches = new Set([
      fundamentalNote.pitch,
      thirdNote.pitch,
      fifthNote.pitch,
    ]);
    // Check if our notes match this triad
    const matchCount = uniquePitches.filter(p => chordPitches.has(p)).length;
    if (matchCount < 3 && uniquePitches.length === 3) continue;
    if (matchCount < 3) continue;

    // Determine inversion by bass note
    const bassPitch = bass % 12;
    let inversion: TriadInversion = 'ROOT';
    if (bassPitch === thirdNote.pitch) inversion = 'FIRST';
    else if (bassPitch === fifthNote.pitch) inversion = 'SECOND';

    // Determine melodic position by soprano note
    const sopranoPitch = soprano % 12;
    let melodicPosition: MelodicPosition = 'octava';
    if (sopranoPitch === thirdNote.pitch) melodicPosition = 'tercera';
    else if (sopranoPitch === fifthNote.pitch) melodicPosition = 'quinta';

    // Disposition: closed if no chord tone fits between any two upper voices
    const upperVoices = [soprano, alto, tenor].sort((a, b) => a - b);
    let isOpen = false;
    for (let i = 0; i < upperVoices.length - 1; i++) {
      const gap = upperVoices[i + 1] - upperVoices[i];
      if (gap > 4) { isOpen = true; break; } // more than a major third = open
    }

    return {
      soprano, alto, tenor, bass,
      root: diatonic.root,
      triadType: diatonic.triad.type,
      inversion,
      melodicPosition,
      disposition: isOpen ? 'abierta' : 'cerrada',
    };
  }
  return null;
}

// ============================================================
// 6d. VALIDACIÓN DE VOICING SATB
// ============================================================

export type ErrorSeverity = 'error' | 'warning';

export interface VoicingError {
  severity: ErrorSeverity;
  rule: string;       // Nombre de la regla
  description: string;
  voices?: Voice[];   // Voces involucradas
}

/**
 * Valida un acorde SATB aislado (reglas de voicing, p.12-13):
 * - Tesituras de cada voz
 * - Extensiones máximas entre voces adyacentes
 * - No cruzamiento de voces
 * - Duplicación de la sensible
 * - Completitud del acorde (disminuidos y aumentados siempre completos)
 */
export function validateSATBVoicing(
  chord: SATBChord,
  scaleRoot: string,
  scaleType: string,
  degree: number
): VoicingError[] {
  const errors: VoicingError[] = [];
  const { soprano, alto, tenor, bass } = chord;

  // 1. Tesituras
  const voices: [Voice, number][] = [
    ['SOPRANO', soprano], ['ALTO', alto], ['TENOR', tenor], ['BASS', bass]
  ];
  for (const [voice, midi] of voices) {
    const range = VOICE_RANGES[voice];
    if (midi < range.min || midi > range.max) {
      errors.push({
        severity: 'error',
        rule: 'TESITURA',
        description: `${range.nameEs}: nota ${midi} fuera de tesitura (${range.min}–${range.max})`,
        voices: [voice],
      });
    }
  }

  // 2. Extensiones máximas entre voces adyacentes
  const spacings: [string, number, number][] = [
    ['SOPRANO-ALTO', soprano, alto],
    ['ALTO-TENOR',   alto,    tenor],
    ['TENOR-BASS',   tenor,   bass],
  ];
  for (const [pair, upper, lower] of spacings) {
    const gap = upper - lower;
    const max = MAX_VOICE_SPACING[pair];
    if (gap > max) {
      errors.push({
        severity: 'error',
        rule: 'SPACING',
        description: `${pair.replace('-', '–')}: extensión de ${gap} semitonos supera el máximo (${max})`,
      });
    }
  }

  // 3. No cruzamiento de voces (soprano > alto > tenor > bass)
  if (soprano < alto)  errors.push({ severity: 'error', rule: 'CROSSING', description: 'Soprano cruza con Contralto', voices: ['SOPRANO','ALTO'] });
  if (alto < tenor)    errors.push({ severity: 'error', rule: 'CROSSING', description: 'Contralto cruza con Tenor', voices: ['ALTO','TENOR'] });
  if (tenor < bass)    errors.push({ severity: 'error', rule: 'CROSSING', description: 'Tenor cruza con Bajo', voices: ['TENOR','BASS'] });

  // 4. Sensible no duplicada en acordes III, V, VII (p.17d)
  const scale = buildScale(scaleRoot, scaleType);
  const leadingTonePitch = scale.notes[6].pitch; // VII grado = sensible
  if ([3, 5, 7].includes(degree)) {
    const pitches = [soprano, alto, tenor, bass].map(m => m % 12);
    const ltCount = pitches.filter(p => p === leadingTonePitch).length;
    if (ltCount > 1) {
      errors.push({
        severity: 'error',
        rule: 'LEADING_TONE_DOUBLED',
        description: `Sensible duplicada en acorde ${degree === 3 ? 'III' : degree === 5 ? 'V' : 'VII'} (p.17d)`,
      });
    }
  }

  // 5. Acorde completo: disminuidos y aumentados siempre completos (p.12)
  if (chord.triadType === 'DIMINISHED' || chord.triadType === 'AUGMENTED') {
    const pitches = new Set([soprano, alto, tenor, bass].map(m => m % 12));
    const triad = buildTriad(chord.root, chord.triadType);
    const needed = [triad.notes[0].pitch, triad.notes[1].pitch, triad.notes[2].pitch];
    const missing = needed.filter(p => !pitches.has(p));
    if (missing.length > 0) {
      errors.push({
        severity: 'error',
        rule: 'INCOMPLETE_CHORD',
        description: `Acorde ${chord.triadType === 'DIMINISHED' ? 'disminuido' : 'aumentado'} incompleto — debe presentarse siempre completo (p.12)`,
      });
    }
  }

  // 6. Siempre presentar la 3ª (p.17f)
  const triadCheck = buildTriad(chord.root, chord.triadType);
  const thirdPitch = triadCheck.notes[1].pitch; // notes[1] = third
  const pitches = [soprano, alto, tenor, bass].map(m => m % 12);
  if (!pitches.includes(thirdPitch)) {
    errors.push({
      severity: 'error',
      rule: 'MISSING_THIRD',
      description: 'Falta la 3ª del acorde — siempre debe estar presente (p.17f)',
    });
  }

  return errors;
}

/**
 * Valida el movimiento melódico de UNA voz entre dos acordes consecutivos.
 * Reglas de movimientos melódicos (p.13-14).
 */
export function validateMelodicMovement(
  voice: Voice,
  midiFrom: number,
  midiTo: number,
  isLeadingTone: boolean,
  nextChordHasTonic: boolean,
  sopranoVoice: boolean,
  prevIntervalSemitones?: number,
  prevDirection?: number,
): VoicingError[] {
  const errors: VoicingError[] = [];
  const semitones = Math.abs(midiTo - midiFrom);
  const direction = midiTo > midiFrom ? 1 : midiTo < midiFrom ? -1 : 0;

  if (direction === 0) return []; // nota repetida, siempre ok

  // 1. Intervalos melódicos permitidos
  const isDiminished = MELODIC_DIMINISHED_WITH_COMPENSATION.has(semitones);
  if (!MELODIC_INTERVALS_ALLOWED.has(semitones) && !isDiminished) {
    errors.push({
      severity: 'error',
      rule: 'MELODIC_INTERVAL',
      description: `${VOICE_RANGES[voice].nameEs}: intervalo melódico de ${semitones} semitonos no permitido (p.13)`,
      voices: [voice],
    });
  }

  // 2. No salto de 8ª con la sensible (p.13)
  if (semitones === 12 && isLeadingTone) {
    errors.push({
      severity: 'error',
      rule: 'LEADING_TONE_OCTAVE',
      description: `${VOICE_RANGES[voice].nameEs}: no se practica el salto de 8ª con la sensible (p.13)`,
      voices: [voice],
    });
  }

  // 3. Sensible asciende a tónica en soprano (p.17j)
  if (sopranoVoice && isLeadingTone && nextChordHasTonic && direction !== 1) {
    errors.push({
      severity: 'error',
      rule: 'LEADING_TONE_RESOLUTION',
      description: 'Soprano: la sensible debe ascender a tónica (p.17j)',
      voices: ['SOPRANO'],
    });
  }

  // 4. Dos saltos sucesivos en la misma dirección no permitidos
  // excepción: 4ª seguida de 5ª o viceversa (p.14)
  if (prevIntervalSemitones !== undefined && prevDirection !== undefined) {
    if (prevDirection === direction && prevIntervalSemitones > 2 && semitones > 2) {
      const is4th5th = (prevIntervalSemitones === 5 && semitones === 7) ||
                       (prevIntervalSemitones === 7 && semitones === 5);
      if (!is4th5th) {
        errors.push({
          severity: 'error',
          rule: 'CONSECUTIVE_LEAPS',
          description: `${VOICE_RANGES[voice].nameEs}: dos saltos sucesivos en la misma dirección (p.14)`,
          voices: [voice],
        });
      }
    }
  }

  return errors;
}

/**
 * Valida los movimientos ARMÓNICOS entre dos acordes SATB (p.14):
 * - No 5ªs paralelas justas
 * - No 8ªs paralelas
 * - No 5ªs contrarias
 * - No dos saltos simultáneos en la misma dirección (excepto 4ªJ)
 */
export function validateHarmonicMovement(
  chordA: SATBChord,
  chordB: SATBChord,
): VoicingError[] {
  const errors: VoicingError[] = [];

  const voiceList: [Voice, keyof SATBChord][] = [
    ['SOPRANO', 'soprano'], ['ALTO', 'alto'], ['TENOR', 'tenor'], ['BASS', 'bass']
  ];

  // Check all 6 pairs of voices for parallel/contrary motion
  for (let i = 0; i < voiceList.length; i++) {
    for (let j = i + 1; j < voiceList.length; j++) {
      const [voiceA, keyA] = voiceList[i];
      const [voiceB, keyB] = voiceList[j];

      const a1 = chordA[keyA] as number;
      const a2 = chordB[keyA] as number;
      const b1 = chordA[keyB] as number;
      const b2 = chordB[keyB] as number;

      const intervalBefore = Math.abs(a1 - b1) % 12;
      const intervalAfter  = Math.abs(a2 - b2) % 12;
      const dirA = Math.sign(a2 - a1);
      const dirB = Math.sign(b2 - b1);

      // Parallel motion: same direction, same interval
      if (dirA === dirB && dirA !== 0 && intervalBefore === intervalAfter) {
        // Parallel 5ths (7 semitones)
        if (intervalAfter === 7) {
          errors.push({
            severity: 'error',
            rule: 'PARALLEL_FIFTHS',
            description: `5ªs paralelas entre ${VOICE_RANGES[voiceA].nameEs} y ${VOICE_RANGES[voiceB].nameEs} (p.14)`,
            voices: [voiceA, voiceB],
          });
        }
        // Parallel octaves (0 semitones mod 12)
        if (intervalAfter === 0 && Math.abs(a1 - b1) >= 12) {
          errors.push({
            severity: 'error',
            rule: 'PARALLEL_OCTAVES',
            description: `8ªs paralelas entre ${VOICE_RANGES[voiceA].nameEs} y ${VOICE_RANGES[voiceB].nameEs} (p.14)`,
            voices: [voiceA, voiceB],
          });
        }
      }

      // Contrary 5ths: opposite direction, arrive at 5th
      if (dirA !== 0 && dirB !== 0 && dirA !== dirB && intervalAfter === 7 && intervalBefore === 7) {
        // Only forbidden in extreme voices (soprano-bass)
        const isExtremeVoices = (voiceA === 'SOPRANO' && voiceB === 'BASS') ||
                                 (voiceA === 'BASS' && voiceB === 'SOPRANO');
        if (isExtremeVoices) {
          errors.push({
            severity: 'warning',
            rule: 'CONTRARY_FIFTHS',
            description: `5ªs contrarias entre voces extremas: ${VOICE_RANGES[voiceA].nameEs} y ${VOICE_RANGES[voiceB].nameEs} (p.14)`,
            voices: [voiceA, voiceB],
          });
        }
      }
    }
  }

  // No two simultaneous leaps in same direction, except 4ªJ (p.15)
  const movements = voiceList.map(([, key]) => {
    const from = chordA[key] as number;
    const to   = chordB[key] as number;
    return { semitones: Math.abs(to - from), direction: Math.sign(to - from) };
  });

  const leaps = movements.filter(m => m.semitones > 2 && m.direction !== 0);
  if (leaps.length >= 2) {
    const sameDir = leaps.filter(l => l.direction === leaps[0].direction);
    const allFourths = sameDir.every(l => l.semitones === 5);
    if (sameDir.length >= 2 && !allFourths) {
      errors.push({
        severity: 'error',
        rule: 'SIMULTANEOUS_LEAPS',
        description: 'Dos saltos simultáneos en la misma dirección (p.15)',
      });
    }
  }

  return errors;
}

// ============================================================
// EXPORT AGREGADO — al final del archivo para evitar el TDZ
// (referencia símbolos declarados arriba; debe ir tras todos ellos)
// ============================================================

export const MusicTheoryCore = {
  // Notas
  CHROMATIC_NOTES,
  NOTE_NAMES_ES,
  midiToNote,
  noteToMidi,
  nameToPitch,
  parseNoteFull,
  pitchToSpelledNote,
  classifyInterval,
  invertInterval,
  noteIndex,
  // Intervalos
  INTERVALS,
  intervalBetween,
  intervalBetweenMidi,
  // Escalas
  SCALE_FORMULAS,
  buildScale,
  scaleNoteNames,
  isNoteInScale,
  allMajorScales,
  // Modos
  MODES,
  findParentMajorScale,
  getAllModesFromMajor,
  // SATB — Cuarteto Vocal
  VOICE_RANGES,
  MAX_VOICE_SPACING,
  MELODIC_INTERVALS_ALLOWED,
  MELODIC_INTERVAL_CLASSES,
  MELODIC_DIMINISHED_WITH_COMPENSATION,
  analyzeSATBChord,
  validateSATBVoicing,
  validateMelodicMovement,
  validateHarmonicMovement,
  // Acordes de 5ª
  TRIAD_TYPES,
  TRIAD_INVERSIONS,
  buildTriad,
  identifyTriad,
  harmonizeScale,
  // Tetracordes
  TETRACHORD_TYPES,
  identifyTetrachord,
  analyzeScaleTetrachords,
  // Verificación
  buildScalePattern,
  verifyScaleMidi,
  identifyScale,
};

export default MusicTheoryCore;

