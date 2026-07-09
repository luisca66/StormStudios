/**
 * scale-validator.ts
 * Valida las 15 escalas mayores de la Lección 1.
 *
 * La TEORÍA (alturas y grafía correcta de cada escala) la provee el motor
 * `music-theory-core.ts` vía `buildScale(key, 'MAJOR')`. Este validador solo
 * define el EJERCICIO (qué 15 tonalidades) y compara contra lo que el core dice.
 *
 * Regla de orden: el alumno puede tocar las 15 escalas en CUALQUIER orden; solo
 * se exige que estén las 15 (sin faltantes ni duplicadas). La grafía enarmónica
 * de cada nota se valida con la grafía incrustada por el secuenciador (SP:…).
 */

import type { VoiceData } from './midi-parser';
import { buildScale, type ScaleNote } from './music-theory-core';
import {
  parseSpelling,
  sameSpelling,
  spellingName,
  type Spelling,
  type Letter,
} from './spelling';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface ScaleError {
  rule: ScaleRuleId;
  severity: 'error' | 'warning';
  position: number;       // 1-15, posición de la escala (0 = error global)
  degree?: string;        // 'I' 'II' ... "I'"
  titleEs: string;
  titleEn: string;
  detailEs: string;
  detailEn: string;
}

export type ScaleRuleId =
  | 'SCALE_COUNT'
  | 'SCALE_MISSING_KEY'
  | 'SCALE_DUPLICATE_KEY'
  | 'SCALE_UNKNOWN_KEY'
  | 'SCALE_NOTE_COUNT'
  | 'SCALE_WRONG_NOTE'
  | 'SCALE_ENHARMONIC'
  | 'SCALE_DIRECTION'
  | 'SCALE_TONIC_CLOSURE'
  | 'SCALE_MISSING_KEYSIG';

// ── Datos del ejercicio: las 15 tonalidades mayores ───────────────────────────
// El orden de esta lista ya NO se exige al alumno; solo enumera las 15 escalas
// esperadas (la elección de enarmonías —F# y Gb, C# y Db, B y Cb— es curricular).

const EXPECTED_KEYS = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#',
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb',
] as const;

const DEGREES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', "I'"] as const;

// ── Helpers que consultan el core ─────────────────────────────────────────────

/** Convierte un ScaleNote del core a la grafía {letter, alter} del comparador. */
function coreNoteToSpelling(n: ScaleNote): Spelling {
  const letter = n.letter.toLowerCase() as Letter;
  const alter =
    n.alteration === '##' ? 2 :
    n.alteration === '#'  ? 1 :
    n.alteration === 'b'  ? -1 :
    n.alteration === 'bb' ? -2 : 0;
  return { letter, alter };
}

/** Nombre legible de la escala mayor (ej. 'Sib Mayor' / 'Bb Major'). */
function scaleNames(key: string): { es: string; en: string } {
  const tonic = buildScale(key, 'MAJOR').notes[0];
  return { es: `${tonic.nameEs} Mayor`, en: `${tonic.nameEn} Major` };
}

// ── Parser de segmentos ───────────────────────────────────────────────────────

interface ScaleSegment {
  key: string;
  notes: number[];                   // MIDI numbers in order
  spellings: (string | undefined)[]; // grafía incrustada por nota (paralelo a notes)
}

/**
 * Extracts scale segments from VoiceData.
 * Each segment = one key_signature block + its notes.
 */
function extractSegments(voiceData: VoiceData): ScaleSegment[] {
  const sopranoNotes = [...(voiceData.voices['SOPRANO'] ?? [])]
    .sort((a, b) => a.tick - b.tick);

  if (sopranoNotes.length === 0) return [];

  const segments: ScaleSegment[] = [];
  let currentKey = voiceData.keyChanges[0]?.key ?? 'C';
  let currentNotes: number[] = [];
  let currentSpellings: (string | undefined)[] = [];
  const keyChangeAtTick = new Map<number, string>();

  for (const keyChange of voiceData.keyChanges) {
    // Conserva la semántica de Array#find: el primer cambio en el tick gana.
    if (!keyChangeAtTick.has(keyChange.tick)) {
      keyChangeAtTick.set(keyChange.tick, keyChange.key);
    }
  }

  for (const note of sopranoNotes) {
    const keyAtNote = keyChangeAtTick.get(note.tick);
    if (keyAtNote && keyAtNote !== currentKey) {
      if (currentNotes.length > 0) {
        segments.push({ key: currentKey, notes: currentNotes, spellings: currentSpellings });
      }
      currentKey = keyAtNote;
      currentNotes = [];
      currentSpellings = [];
    }
    currentNotes.push(note.midi);
    currentSpellings.push(note.spelling);
  }

  if (currentNotes.length > 0) {
    segments.push({ key: currentKey, notes: currentNotes, spellings: currentSpellings });
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

  // ── Rule 1: Total count (titular) ─────────────────────────────────────────
  if (segments.length !== 15) {
    const diff = 15 - segments.length;
    errors.push({
      rule: 'SCALE_COUNT',
      severity: 'error',
      position: 0,
      titleEs: `Se encontraron ${segments.length} escalas, se esperan 15`,
      titleEn: `Found ${segments.length} scales, expected 15`,
      detailEs: diff > 0
        ? `Faltan ${diff} escala${diff > 1 ? 's' : ''}. El ejercicio completo requiere las 15 escalas mayores (en cualquier orden).`
        : `Hay ${Math.abs(diff)} escala${Math.abs(diff) > 1 ? 's' : ''} de más.`,
      detailEn: diff > 0
        ? `Missing ${diff} scale${diff > 1 ? 's' : ''}. The complete exercise requires all 15 major scales (in any order).`
        : `${Math.abs(diff)} extra scale${Math.abs(diff) > 1 ? 's' : ''}.`,
    });
  }

  // ── Rule 2: Completitud del conjunto (sustituye a la antigua regla de orden) ──
  // El orden no importa; solo que estén las 15, una sola vez cada una.
  const counts = new Map<string, number>();
  for (const seg of segments) counts.set(seg.key, (counts.get(seg.key) ?? 0) + 1);

  for (const [key, count] of counts) {
    if (!(EXPECTED_KEYS as readonly string[]).includes(key)) {
      errors.push({
        rule: 'SCALE_UNKNOWN_KEY',
        severity: 'error',
        position: 0,
        titleEs: `Tonalidad inesperada: ${key}`,
        titleEn: `Unexpected key: ${key}`,
        detailEs: `${key} no es una de las 15 escalas mayores del ejercicio. Revisa la armadura.`,
        detailEn: `${key} is not one of the 15 major scales of this exercise. Check the key signature.`,
      });
    } else if (count > 1) {
      const { es, en } = scaleNames(key);
      errors.push({
        rule: 'SCALE_DUPLICATE_KEY',
        severity: 'error',
        position: 0,
        titleEs: `${es} aparece ${count} veces`,
        titleEn: `${en} appears ${count} times`,
        detailEs: `Cada escala debe aparecer una sola vez. ${es} está duplicada.`,
        detailEn: `Each scale must appear exactly once. ${en} is duplicated.`,
      });
    }
  }

  for (const key of EXPECTED_KEYS) {
    if (!counts.has(key)) {
      const { es, en } = scaleNames(key);
      errors.push({
        rule: 'SCALE_MISSING_KEY',
        severity: 'error',
        position: 0,
        titleEs: `Falta la escala de ${es}`,
        titleEn: `Missing the ${en} scale`,
        detailEs: `El ejercicio requiere las 15 escalas mayores; falta ${es}.`,
        detailEn: `The exercise requires all 15 major scales; ${en} is missing.`,
      });
    }
  }

  // ── Rules 3–6: Validación por escala (contra su PROPIA tonalidad declarada) ──
  for (let pos = 0; pos < segments.length; pos++) {
    const { key, notes, spellings } = segments[pos];

    // Si la tonalidad no es válida, ya se reportó arriba; no intentamos validar notas.
    if (!(EXPECTED_KEYS as readonly string[]).includes(key)) continue;

    const expScale = buildScale(key, 'MAJOR');   // teoría desde el core
    const { es: nameEs, en: nameEn } = scaleNames(key);

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
      continue; // no se pueden validar grados sin 8 notas
    }

    // Rule 4: Correct notes (pitch class) + Rule 4b: enharmonic spelling
    for (let deg = 0; deg < 8; deg++) {
      const gotPc = ((notes[deg] % 12) + 12) % 12;
      const expNote = expScale.notes[deg];
      const expPc = expNote.pitch;

      if (gotPc !== expPc) {
        const gotName = gotNoteName(spellings[deg], gotPc);
        errors.push({
          rule: 'SCALE_WRONG_NOTE',
          severity: 'error',
          position: pos + 1,
          degree: DEGREES[deg],
          titleEs: `${nameEs}: nota incorrecta en grado ${DEGREES[deg]}`,
          titleEn: `${nameEn}: wrong note on degree ${DEGREES[deg]}`,
          detailEs: `Grado ${DEGREES[deg]}: se esperaba ${expNote.nameEs} y se tocó ${gotName}. `
                  + `Revisa la armadura de ${nameEs}.`,
          detailEn: `Degree ${DEGREES[deg]}: expected ${expNote.nameEn}, got ${gotName}. `
                  + `Check the key signature of ${nameEn}.`,
        });
        continue; // altura ya incorrecta: no dupliquemos con error de grafía
      }

      // Rule 4b: misma altura pero ¿grafía enarmónica correcta? (ej. La## vs Si)
      const got = parseSpelling(spellings[deg]);
      if (got) {
        const exp = coreNoteToSpelling(expNote);
        if (!sameSpelling(got, exp)) {
          errors.push({
            rule: 'SCALE_ENHARMONIC',
            severity: 'error',
            position: pos + 1,
            degree: DEGREES[deg],
            titleEs: `${nameEs}: grafía incorrecta en grado ${DEGREES[deg]}`,
            titleEn: `${nameEn}: wrong spelling on degree ${DEGREES[deg]}`,
            detailEs: `Grado ${DEGREES[deg]}: escribiste ${spellingName(got, 'es')} pero en ${nameEs} corresponde ${spellingName(exp, 'es')}. `
                    + `Suenan igual (son enarmónicas) pero la grafía correcta de la escala es ${spellingName(exp, 'es')}.`,
            detailEn: `Degree ${DEGREES[deg]}: you wrote ${spellingName(got, 'en')} but ${nameEn} requires ${spellingName(exp, 'en')}. `
                    + `They sound the same (enharmonic) but the correct scale spelling is ${spellingName(exp, 'en')}.`,
          });
        }
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
                  + `(MIDI ${notes[i]}) no es mayor que la anterior (MIDI ${notes[i - 1]}).`,
          detailEn: `The scale must be played ascending. Note ${DEGREES[i]} `
                  + `(MIDI ${notes[i]}) is not higher than the previous (MIDI ${notes[i - 1]}).`,
        });
      }
    }

    // Rule 6: Tonic closure
    if (((notes[0] % 12) + 12) % 12 !== ((notes[7] % 12) + 12) % 12) {
      errors.push({
        rule: 'SCALE_TONIC_CLOSURE',
        severity: 'error',
        position: pos + 1,
        titleEs: `${nameEs}: no cierra en tónica`,
        titleEn: `${nameEn}: doesn't close on tonic`,
        detailEs: `La última nota debe ser la tónica (${expScale.notes[0].nameEs}) en la octava superior.`,
        detailEn: `The last note must be the tonic (${expScale.notes[0].nameEn}) one octave higher.`,
      });
    }
  }

  return errors;
}

/** Nombre de la nota tocada para los mensajes de error (usa la grafía del alumno). */
function gotNoteName(spelling: string | undefined, pc: number): string {
  const got = parseSpelling(spelling);
  if (got) return spellingName(got, 'es');
  // Sin grafía incrustada: nombre cromático aproximado en español.
  const CHROMATIC_ES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
  return CHROMATIC_ES[pc] ?? `(pc ${pc})`;
}
