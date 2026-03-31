/**
 * minor-scale-validator.ts
 * Valida las 15 tonalidades menores de la Lección 2.
 * Cada tonalidad: natural (8) + armónica (8) + melódica↑ (8) + melódica↓ (7) = 31 notas.
 * Usa key_signature de la relativa mayor para identificar la tonalidad.
 */

import type { VoiceData } from './midi-parser';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface MinorScaleError {
  rule: MinorScaleRuleId;
  severity: 'error' | 'warning';
  position: number;       // 1–15
  scaleType?: string;     // 'natural' | 'armónica' | 'melódica↑' | 'melódica↓'
  degree?: string;
  titleEs: string;
  titleEn: string;
  detailEs: string;
  detailEn: string;
}

export type MinorScaleRuleId =
  | 'MINOR_COUNT'
  | 'MINOR_ORDER'
  | 'MINOR_NOTE_COUNT'
  | 'MINOR_WRONG_NOTE'
  | 'MINOR_DIRECTION'
  | 'MINOR_MISSING_KEYSIG';

// ── Datos de las 15 tonalidades menores ──────────────────────────────────────

const LESSON2_ORDER = [
  'Am','Em','Bm','F#m','C#m','G#m','D#m','A#m',
  'Dm','Gm','Cm','Fm','Bbm','Ebm','Abm',
] as const;

export type MinorKeyRoot = typeof LESSON2_ORDER[number];

interface MinorKeyData {
  tonic: number;    // pitch class 0–11
  rel: string;      // relative major key (matches MIDI key_signature)
  es: string;
  en: string;
}

const MINOR_DATA: Record<MinorKeyRoot, MinorKeyData> = {
  'Am':  { tonic:9,  rel:'C',  es:'La menor',   en:'A minor'  },
  'Em':  { tonic:4,  rel:'G',  es:'Mi menor',   en:'E minor'  },
  'Bm':  { tonic:11, rel:'D',  es:'Si menor',   en:'B minor'  },
  'F#m': { tonic:6,  rel:'A',  es:'Fa# menor',  en:'F# minor' },
  'C#m': { tonic:1,  rel:'E',  es:'Do# menor',  en:'C# minor' },
  'G#m': { tonic:8,  rel:'B',  es:'Sol# menor', en:'G# minor' },
  'D#m': { tonic:3,  rel:'F#', es:'Re# menor',  en:'D# minor' },
  'A#m': { tonic:10, rel:'C#', es:'La# menor',  en:'A# minor' },
  'Dm':  { tonic:2,  rel:'F',  es:'Re menor',   en:'D minor'  },
  'Gm':  { tonic:7,  rel:'Bb', es:'Sol menor',  en:'G minor'  },
  'Cm':  { tonic:0,  rel:'Eb', es:'Do menor',   en:'C minor'  },
  'Fm':  { tonic:5,  rel:'Ab', es:'Fa menor',   en:'F minor'  },
  'Bbm': { tonic:10, rel:'Db', es:'Sib menor',  en:'Bb minor' },
  'Ebm': { tonic:3,  rel:'Gb', es:'Mib menor',  en:'Eb minor' },
  'Abm': { tonic:8,  rel:'Cb', es:'Lab menor',  en:'Ab minor' },
};

// Relative major → minor key (used to identify segments from key_signature)
const REL_TO_MINOR: Record<string, MinorKeyRoot> = Object.fromEntries(
  LESSON2_ORDER.map(k => [MINOR_DATA[k].rel, k])
) as Record<string, MinorKeyRoot>;

// ── Scale pitch-class sequences ───────────────────────────────────────────────

type ScaleType = 'natural' | 'harmonic' | 'melodic_asc' | 'melodic_desc';

const INTERVALS: Record<ScaleType, number[]> = {
  natural:      [0,2,3,5,7,8,10,0],
  harmonic:     [0,2,3,5,7,8,11,0],
  melodic_asc:  [0,2,3,5,7,9,11,0],
  melodic_desc: [0,10,8,7,5,3,2,0],   // from octave tonic downward
};

function minorPCs(tonic: number, type: ScaleType): number[] {
  return INTERVALS[type].map(i => (tonic + i) % 12);
}

const DEGREES_ASC  = ['I','II','III','IV','V','VI','VII',"I'"] as const;
const DEGREES_DESC = ['VII','VI','V','IV','III','II','I'] as const;

// ── Sub-segment definitions ───────────────────────────────────────────────────
// Each minor key = 4 sub-segments totaling 31 notes

interface SubSegment {
  type: ScaleType;
  labelEs: string;
  labelEn: string;
  noteCount: number;
  degrees: readonly string[];
  ascending: boolean;
  offset: number;   // start index in the 31-note block
}

const SUB_SEGMENTS: SubSegment[] = [
  { type:'natural',      labelEs:'natural',   labelEn:'natural',   noteCount:8, degrees:DEGREES_ASC,  ascending:true,  offset:0  },
  { type:'harmonic',     labelEs:'armónica',  labelEn:'harmonic',  noteCount:8, degrees:DEGREES_ASC,  ascending:true,  offset:8  },
  { type:'melodic_asc',  labelEs:'melódica↑', labelEn:'melodic↑',  noteCount:8, degrees:DEGREES_ASC,  ascending:true,  offset:16 },
  { type:'melodic_desc', labelEs:'melódica↓', labelEn:'melodic↓',  noteCount:7, degrees:DEGREES_DESC, ascending:false, offset:24 },
];

// ── Parser ────────────────────────────────────────────────────────────────────

interface KeySegment {
  relKey: string;
  notes: number[];
}

function extractSegments(voiceData: VoiceData): KeySegment[] {
  const sopranoNotes = (voiceData.voices['SOPRANO'] ?? [])
    .sort((a, b) => a.tick - b.tick);

  if (sopranoNotes.length === 0) return [];

  const segments: KeySegment[] = [];
  let currentKey = voiceData.keyChanges[0]?.key ?? 'C';
  let currentNotes: number[] = [];

  for (const note of sopranoNotes) {
    const kc = voiceData.keyChanges.find(k => k.tick === note.tick);
    if (kc && kc.key !== currentKey) {
      if (currentNotes.length > 0) {
        segments.push({ relKey: currentKey, notes: currentNotes });
      }
      currentKey = kc.key;
      currentNotes = [];
    }
    currentNotes.push(note.midi);
  }

  if (currentNotes.length > 0) {
    segments.push({ relKey: currentKey, notes: currentNotes });
  }

  return segments;
}

// ── Main validator ────────────────────────────────────────────────────────────

export function validateLesson2Scales(voiceData: VoiceData): MinorScaleError[] {
  const errors: MinorScaleError[] = [];

  if (voiceData.keyChanges.length === 0) {
    errors.push({
      rule: 'MINOR_MISSING_KEYSIG',
      severity: 'error',
      position: 0,
      titleEs: 'El archivo MIDI no contiene información de tonalidad',
      titleEn: 'MIDI file contains no key signature information',
      detailEs: 'Exporta el ejercicio desde el secuenciador Storm Studios.',
      detailEn: 'Export the exercise from the Storm Studios sequencer.',
    });
    return errors;
  }

  const segments = extractSegments(voiceData);

  // ── Rule 1: Total count ───────────────────────────────────────────────────
  if (segments.length !== 15) {
    const diff = 15 - segments.length;
    errors.push({
      rule: 'MINOR_COUNT',
      severity: 'error',
      position: 0,
      titleEs: `Se encontraron ${segments.length} tonalidades, se esperan 15`,
      titleEn: `Found ${segments.length} keys, expected 15`,
      detailEs: diff > 0
        ? `Faltan ${diff} tonalidad${diff > 1 ? 'es' : ''}. El ejercicio requiere las 15 tonalidades menores.`
        : `Hay ${Math.abs(diff)} tonalidad${Math.abs(diff) > 1 ? 'es' : ''} de más.`,
      detailEn: diff > 0
        ? `Missing ${diff} key${diff > 1 ? 's' : ''}. The exercise requires all 15 minor keys.`
        : `${Math.abs(diff)} extra key${Math.abs(diff) > 1 ? 's' : ''}.`,
    });
  }

  // ── Rules 2–5: Per-key validation ────────────────────────────────────────
  for (let pos = 0; pos < segments.length; pos++) {
    const { relKey, notes } = segments[pos];
    const actualMinor   = REL_TO_MINOR[relKey];
    const expectedMinor = LESSON2_ORDER[pos] as MinorKeyRoot | undefined;

    const data    = actualMinor ? MINOR_DATA[actualMinor] : null;
    const nameEs  = data?.es ?? relKey;
    const nameEn  = data?.en ?? relKey;

    // Rule 2: Order
    if (expectedMinor && actualMinor !== expectedMinor) {
      const expData = MINOR_DATA[expectedMinor];
      errors.push({
        rule: 'MINOR_ORDER',
        severity: 'error',
        position: pos + 1,
        titleEs: `Posición ${pos + 1}: se esperaba ${expData.es}`,
        titleEn: `Position ${pos + 1}: expected ${expData.en}`,
        detailEs: `En la posición ${pos + 1} está ${nameEs} pero debería ser ${expData.es}. `
                + `Orden correcto: Am·Em·Bm·F#m·C#m·G#m·D#m·A#m (quintas ascendentes), `
                + `luego Dm·Gm·Cm·Fm·Bbm·Ebm·Abm (quintas descendentes).`,
        detailEn: `Position ${pos + 1} has ${nameEn} but should be ${expData.en}. `
                + `Correct order: Am·Em·Bm·F#m·C#m·G#m·D#m·A#m (ascending fifths), `
                + `then Dm·Gm·Cm·Fm·Bbm·Ebm·Abm (descending fifths).`,
      });
    }

    // Rule 3: Note count (must be exactly 31)
    if (notes.length !== 31) {
      errors.push({
        rule: 'MINOR_NOTE_COUNT',
        severity: 'error',
        position: pos + 1,
        titleEs: `${nameEs}: ${notes.length} notas (se esperan 31)`,
        titleEn: `${nameEn}: ${notes.length} notes (expected 31)`,
        detailEs: `Cada tonalidad debe tener: natural (8) + armónica (8) + melódica↑ (8) + melódica↓ (7) = 31 notas. `
                + `${nameEs} tiene ${notes.length}.`,
        detailEn: `Each key must have: natural (8) + harmonic (8) + melodic↑ (8) + melodic↓ (7) = 31 notes. `
                + `${nameEn} has ${notes.length}.`,
      });
      continue;
    }

    if (!data) continue;
    const tonic = data.tonic;

    // Rules 4 & 5: Validate each sub-segment
    for (const sub of SUB_SEGMENTS) {
      const subNotes = notes.slice(sub.offset, sub.offset + sub.noteCount);
      const gotPCs   = subNotes.map(n => n % 12);

      // Expected PCs (for melodic_desc, skip the initial tonic)
      let expPCs = minorPCs(tonic, sub.type);
      if (sub.type === 'melodic_desc') expPCs = expPCs.slice(1);

      // Rule 4: Correct notes
      for (let deg = 0; deg < sub.noteCount; deg++) {
        if (gotPCs[deg] !== expPCs[deg]) {
          errors.push({
            rule: 'MINOR_WRONG_NOTE',
            severity: 'error',
            position: pos + 1,
            scaleType: sub.labelEs,
            degree: sub.degrees[deg],
            titleEs: `${nameEs} ${sub.labelEs}: nota incorrecta en grado ${sub.degrees[deg]}`,
            titleEn: `${nameEn} ${sub.labelEn}: wrong note on degree ${sub.degrees[deg]}`,
            detailEs: `Grado ${sub.degrees[deg]}: pitch class esperado ${expPCs[deg]}, tocado ${gotPCs[deg]}. `
                    + `Revisa la ${sub.labelEs} de ${nameEs}.`,
            detailEn: `Degree ${sub.degrees[deg]}: expected pitch class ${expPCs[deg]}, got ${gotPCs[deg]}. `
                    + `Check the ${sub.labelEn} scale of ${nameEn}.`,
          });
        }
      }

      // Rule 5: Direction
      for (let i = 1; i < subNotes.length; i++) {
        const wrongDir = sub.ascending
          ? subNotes[i] <= subNotes[i - 1]
          : subNotes[i] >= subNotes[i - 1];

        if (wrongDir) {
          errors.push({
            rule: 'MINOR_DIRECTION',
            severity: 'error',
            position: pos + 1,
            scaleType: sub.labelEs,
            degree: sub.degrees[i],
            titleEs: `${nameEs} ${sub.labelEs}: dirección incorrecta en grado ${sub.degrees[i]}`,
            titleEn: `${nameEn} ${sub.labelEn}: wrong direction on degree ${sub.degrees[i]}`,
            detailEs: `La escala ${sub.labelEs} debe tocarse ${sub.ascending ? 'ascendente' : 'descendente'}. `
                    + `Nota ${sub.degrees[i]} (MIDI ${subNotes[i]}) no cumple esta dirección respecto a la anterior (MIDI ${subNotes[i-1]}).`,
            detailEn: `The ${sub.labelEn} scale must be played ${sub.ascending ? 'ascending' : 'descending'}. `
                    + `Note ${sub.degrees[i]} (MIDI ${subNotes[i]}) does not follow this direction from the previous (MIDI ${subNotes[i-1]}).`,
          });
        }
      }
    }
  }

  return errors;
}
