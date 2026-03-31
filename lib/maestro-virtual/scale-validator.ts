/**
 * scale-validator.ts
 * Valida las 15 escalas mayores de la Lección 1.
 * Requiere key_signature meta-messages en el MIDI (exportados por el secuenciador Storm Studios).
 */

import type { VoiceData } from './midi-parser';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface ScaleError {
  rule: ScaleRuleId;
  severity: 'error' | 'warning';
  position: number;       // 1-15, posición de la escala
  degree?: string;        // 'I' 'II' ... "I'"
  titleEs: string;
  titleEn: string;
  detailEs: string;
  detailEn: string;
}

export type ScaleRuleId =
  | 'SCALE_COUNT'
  | 'SCALE_ORDER'
  | 'SCALE_NOTE_COUNT'
  | 'SCALE_WRONG_NOTE'
  | 'SCALE_DIRECTION'
  | 'SCALE_TONIC_CLOSURE'
  | 'SCALE_MISSING_KEYSIG';

// ── Datos de las 15 escalas ───────────────────────────────────────────────────

const LESSON1_ORDER = [
  'C','G','D','A','E','B','F#','C#',
  'F','Bb','Eb','Ab','Db','Gb','Cb',
] as const;

export type MajorKeyRoot = typeof LESSON1_ORDER[number];

const SCALE_NAMES: Record<MajorKeyRoot, { es: string; en: string }> = {
  'C':  { es: 'Do Mayor',   en: 'C Major'  },
  'G':  { es: 'Sol Mayor',  en: 'G Major'  },
  'D':  { es: 'Re Mayor',   en: 'D Major'  },
  'A':  { es: 'La Mayor',   en: 'A Major'  },
  'E':  { es: 'Mi Mayor',   en: 'E Major'  },
  'B':  { es: 'Si Mayor',   en: 'B Major'  },
  'F#': { es: 'Fa# Mayor',  en: 'F# Major' },
  'C#': { es: 'Do# Mayor',  en: 'C# Major' },
  'F':  { es: 'Fa Mayor',   en: 'F Major'  },
  'Bb': { es: 'Sib Mayor',  en: 'Bb Major' },
  'Eb': { es: 'Mib Mayor',  en: 'Eb Major' },
  'Ab': { es: 'Lab Mayor',  en: 'Ab Major' },
  'Db': { es: 'Reb Mayor',  en: 'Db Major' },
  'Gb': { es: 'Solb Mayor', en: 'Gb Major' },
  'Cb': { es: 'Dob Mayor',  en: 'Cb Major' },
};

// Pitch class sequence for each key (I II III IV V VI VII I')
const SCALE_PC: Record<MajorKeyRoot, number[]> = {
  'C':  [0,2,4,5,7,9,11,0],
  'G':  [7,9,11,0,2,4,6,7],
  'D':  [2,4,6,7,9,11,1,2],
  'A':  [9,11,1,2,4,6,8,9],
  'E':  [4,6,8,9,11,1,3,4],
  'B':  [11,1,3,4,6,8,10,11],
  'F#': [6,8,10,11,1,3,5,6],
  'C#': [1,3,5,6,8,10,0,1],
  'F':  [5,7,9,10,0,2,4,5],
  'Bb': [10,0,2,3,5,7,9,10],
  'Eb': [3,5,7,8,10,0,2,3],
  'Ab': [8,10,0,1,3,5,7,8],
  'Db': [1,3,5,6,8,10,0,1],
  'Gb': [6,8,10,11,1,3,5,6],
  'Cb': [11,1,3,4,6,8,10,11],
};

// Note names per key (pitch class → name in that key)
const SPELLINGS: Record<MajorKeyRoot, Record<number, string>> = {
  'C':  {0:'Do',  2:'Re',  4:'Mi',  5:'Fa',   7:'Sol', 9:'La',  11:'Si'},
  'G':  {7:'Sol', 9:'La',  11:'Si', 0:'Do',   2:'Re',  4:'Mi',  6:'Fa#'},
  'D':  {2:'Re',  4:'Mi',  6:'Fa#', 7:'Sol',  9:'La',  11:'Si', 1:'Do#'},
  'A':  {9:'La',  11:'Si', 1:'Do#', 2:'Re',   4:'Mi',  6:'Fa#', 8:'Sol#'},
  'E':  {4:'Mi',  6:'Fa#', 8:'Sol#',9:'La',   11:'Si', 1:'Do#', 3:'Re#'},
  'B':  {11:'Si', 1:'Do#', 3:'Re#', 4:'Mi',   6:'Fa#', 8:'Sol#',10:'La#'},
  'F#': {6:'Fa#', 8:'Sol#',10:'La#',11:'Si',  1:'Do#', 3:'Re#', 5:'Mi#'},
  'C#': {1:'Do#', 3:'Re#', 5:'Mi#', 6:'Fa#',  8:'Sol#',10:'La#',0:'Si#'},
  'F':  {5:'Fa',  7:'Sol', 9:'La',  10:'Sib', 0:'Do',  2:'Re',  4:'Mi'},
  'Bb': {10:'Sib',0:'Do',  2:'Re',  3:'Mib',  5:'Fa',  7:'Sol', 9:'La'},
  'Eb': {3:'Mib', 5:'Fa',  7:'Sol', 8:'Lab',  10:'Sib',0:'Do',  2:'Re'},
  'Ab': {8:'Lab', 10:'Sib',0:'Do',  1:'Reb',  3:'Mib', 5:'Fa',  7:'Sol'},
  'Db': {1:'Reb', 3:'Mib', 5:'Fa',  6:'Solb', 8:'Lab', 10:'Sib',0:'Do'},
  'Gb': {6:'Solb',8:'Lab', 10:'Sib',11:'Dob', 1:'Reb', 3:'Mib', 5:'Fa'},
  'Cb': {11:'Dob',1:'Reb', 3:'Mib', 4:'Fab',  6:'Solb',8:'Lab', 10:'Sib'},
};

const DEGREES = ['I','II','III','IV','V','VI','VII',"I'"] as const;

// ── Parser de segmentos ───────────────────────────────────────────────────────

interface ScaleSegment {
  key: string;
  notes: number[];   // MIDI numbers in order
}

/**
 * Extracts scale segments from VoiceData.
 * Each segment = one key_signature block + its notes.
 */
function extractSegments(voiceData: VoiceData): ScaleSegment[] {
  const sopranoNotes = (voiceData.voices['SOPRANO'] ?? [])
    .sort((a, b) => a.tick - b.tick);

  if (sopranoNotes.length === 0) return [];

  const segments: ScaleSegment[] = [];
  let currentKey = voiceData.keyChanges[0]?.key ?? 'C';
  let currentNotes: number[] = [];

  // Group notes by their key change
  for (const note of sopranoNotes) {
    // Check if key changed at this tick
    const kc = voiceData.keyChanges.find(k => k.tick === note.tick);
    if (kc && kc.key !== currentKey) {
      if (currentNotes.length > 0) {
        segments.push({ key: currentKey, notes: currentNotes });
      }
      currentKey = kc.key;
      currentNotes = [];
    }
    currentNotes.push(note.midi);
  }

  if (currentNotes.length > 0) {
    segments.push({ key: currentKey, notes: currentNotes });
  }

  return segments;
}

// ── Main validator ────────────────────────────────────────────────────────────

export function validateLesson1Scales(voiceData: VoiceData): ScaleError[] {
  const errors: ScaleError[] = [];

  // Guard: needs key signatures
  if (voiceData.keyChanges.length === 0) {
    errors.push({
      rule: 'SCALE_MISSING_KEYSIG',
      severity: 'error',
      position: 0,
      titleEs: 'El archivo MIDI no contiene información de tonalidad',
      titleEn: 'MIDI file contains no key signature information',
      detailEs: 'Exporta el ejercicio desde el secuenciador Storm Studios. '
              + 'El archivo debe contener marcadores de tonalidad para cada escala.',
      detailEn: 'Export the exercise from the Storm Studios sequencer. '
              + 'The file must contain key signature markers for each scale.',
    });
    return errors;
  }

  const segments = extractSegments(voiceData);

  // ── Rule 1: Total count ───────────────────────────────────────────────────
  if (segments.length !== 15) {
    const diff = 15 - segments.length;
    errors.push({
      rule: 'SCALE_COUNT',
      severity: 'error',
      position: 0,
      titleEs: `Se encontraron ${segments.length} escalas, se esperan 15`,
      titleEn: `Found ${segments.length} scales, expected 15`,
      detailEs: diff > 0
        ? `Faltan ${diff} escala${diff > 1 ? 's' : ''}. El ejercicio completo requiere las 15 escalas mayores.`
        : `Hay ${Math.abs(diff)} escala${Math.abs(diff) > 1 ? 's' : ''} de más.`,
      detailEn: diff > 0
        ? `Missing ${diff} scale${diff > 1 ? 's' : ''}. The complete exercise requires all 15 major scales.`
        : `${Math.abs(diff)} extra scale${Math.abs(diff) > 1 ? 's' : ''}.`,
    });
  }

  // ── Rules 2–5: Per-scale validation ──────────────────────────────────────
  for (let pos = 0; pos < segments.length; pos++) {
    const { key, notes } = segments[pos];
    const expectedKey    = LESSON1_ORDER[pos] as MajorKeyRoot | undefined;
    const nameEs         = SCALE_NAMES[key as MajorKeyRoot]?.es ?? key;
    const nameEn         = SCALE_NAMES[key as MajorKeyRoot]?.en ?? key;

    // Rule 2: Order
    if (expectedKey && key !== expectedKey) {
      const expNameEs = SCALE_NAMES[expectedKey].es;
      const expNameEn = SCALE_NAMES[expectedKey].en;
      errors.push({
        rule: 'SCALE_ORDER',
        severity: 'error',
        position: pos + 1,
        titleEs: `Posición ${pos + 1}: se esperaba ${expNameEs}`,
        titleEn: `Position ${pos + 1}: expected ${expNameEn}`,
        detailEs: `En la posición ${pos + 1} está ${nameEs} pero debería ser ${expNameEs}. `
                + `Orden correcto: Do·Sol·Re·La·Mi·Si·Fa#·Do# (quintas ascendentes), `
                + `luego Fa·Sib·Mib·Lab·Reb·Solb·Dob (quintas descendentes).`,
        detailEn: `Position ${pos + 1} has ${nameEn} but should be ${expNameEn}. `
                + `Correct order: C·G·D·A·E·B·F#·C# (ascending fifths), `
                + `then F·Bb·Eb·Ab·Db·Gb·Cb (descending fifths).`,
      });
    }

    // Rule 3: Note count
    if (notes.length !== 8) {
      errors.push({
        rule: 'SCALE_NOTE_COUNT',
        severity: 'error',
        position: pos + 1,
        titleEs: `${nameEs}: ${notes.length} notas (se esperan 8)`,
        titleEn: `${nameEn}: ${notes.length} notes (expected 8)`,
        detailEs: `Cada escala debe ir de tónica a tónica: I II III IV V VI VII I'. `
                + `La escala de ${nameEs} tiene ${notes.length} nota${notes.length !== 1 ? 's' : ''}.`,
        detailEn: `Each scale must go from tonic to tonic: I II III IV V VI VII I'. `
                + `The ${nameEn} scale has ${notes.length} note${notes.length !== 1 ? 's' : ''}.`,
      });
      continue; // can't validate individual notes without 8
    }

    const keyRoot   = key as MajorKeyRoot;
    const expPc     = SCALE_PC[keyRoot];
    const spelling  = SPELLINGS[keyRoot];

    // Rule 4: Correct notes (pitch class)
    for (let deg = 0; deg < 8; deg++) {
      const gotPc = notes[deg] % 12;
      const expPc_ = expPc[deg];
      if (gotPc !== expPc_) {
        const gotName = spelling[gotPc]  ?? `(pc ${gotPc})`;
        const expName = spelling[expPc_] ?? `(pc ${expPc_})`;
        errors.push({
          rule: 'SCALE_WRONG_NOTE',
          severity: 'error',
          position: pos + 1,
          degree: DEGREES[deg],
          titleEs: `${nameEs}: nota incorrecta en grado ${DEGREES[deg]}`,
          titleEn: `${nameEn}: wrong note on degree ${DEGREES[deg]}`,
          detailEs: `Grado ${DEGREES[deg]}: se esperaba ${expName} y se tocó ${gotName}. `
                  + `Revisa la armadura de ${nameEs}.`,
          detailEn: `Degree ${DEGREES[deg]}: expected ${expName}, `
                  + `got ${gotName}. `
                  + `Check the key signature of ${nameEn}.`,
        });
      }
    }

    // Rule 5: Ascending direction
    for (let i = 1; i < 8; i++) {
      if (notes[i] <= notes[i - 1]) {
        errors.push({
          rule: 'SCALE_DIRECTION',
          severity: 'error',
          position: pos + 1,
          degree: DEGREES[i],
          titleEs: `${nameEs}: dirección incorrecta en grado ${DEGREES[i]}`,
          titleEn: `${nameEn}: wrong direction on degree ${DEGREES[i]}`,
          detailEs: `La escala debe tocarse ascendente. La nota ${DEGREES[i]} `
                  + `(MIDI ${notes[i]}) no es mayor que la anterior (MIDI ${notes[i-1]}).`,
          detailEn: `The scale must be played ascending. Note ${DEGREES[i]} `
                  + `(MIDI ${notes[i]}) is not higher than the previous (MIDI ${notes[i-1]}).`,
        });
      }
    }

    // Rule 6: Tonic closure
    if (notes[0] % 12 !== notes[7] % 12) {
      const startName = spelling[notes[0] % 12] ?? `pc ${notes[0] % 12}`;
      const endName   = spelling[notes[7] % 12] ?? `pc ${notes[7] % 12}`;
      errors.push({
        rule: 'SCALE_TONIC_CLOSURE',
        severity: 'error',
        position: pos + 1,
        titleEs: `${nameEs}: no cierra en tónica`,
        titleEn: `${nameEn}: doesn't close on tonic`,
        detailEs: `La escala empieza en ${startName} y termina en ${endName}. `
                + `La última nota debe ser la tónica (${startName}) en la octava superior.`,
        detailEn: `Scale starts on ${startName} and ends on ${endName}. `
                + `The last note must be the tonic (${startName}) one octave higher.`,
      });
    }
  }

  return errors;
}
