/**
 * modes-validator.ts
 * Valida el ejercicio de Modos de la Lección 2.
 *
 * El alumno elige UNA tónica (cualquier nota) y presenta los 7 modos
 * PARALELOS desde esa misma nota, en orden:
 *   jónico · dórico · frigio · lidio · mixolidio · eólico · locrio
 * Cada modo: 8 notas ascendentes (I→I'). Total 7 × 8 = 56 notas (1 canal Soprano).
 *
 * Toda la teoría (alturas y grafía de cada modo) la provee `music-theory-core.ts`
 * vía `buildScale(tónica, 'DORIAN')`, etc. Este validador solo define el ejercicio
 * (qué modos, en qué orden, todos desde la misma tónica) y compara.
 */

import type { VoiceData } from './midi-parser';
import { buildScale, MODES, SCALE_FORMULAS, type ScaleNote } from './music-theory-core';
import {
  parseSpelling,
  sameSpelling,
  spellingName,
  type Spelling,
  type Letter,
} from './spelling';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface ModeError {
  rule: ModeRuleId;
  severity: 'error' | 'warning';
  position: number;       // 1-7 (modo) · 0 = error global
  degree?: string;        // 'I' 'II' … "I'"
  titleEs: string;
  titleEn: string;
  detailEs: string;
  detailEn: string;
}

export type ModeRuleId =
  | 'MODE_COUNT'
  | 'MODE_WRONG_TONIC'
  | 'MODE_ORDER'
  | 'MODE_NOTE_COUNT'
  | 'MODE_WRONG_NOTE'
  | 'MODE_ENHARMONIC'
  | 'MODE_DIRECTION'
  | 'MODE_TONIC_CLOSURE'
  | 'MODE_BUILD_ERROR';

// ── Datos del ejercicio: los 7 modos en orden ─────────────────────────────────

const MODE_SEQUENCE = [
  'IONIAN', 'DORIAN', 'PHRYGIAN', 'LYDIAN', 'MIXOLYDIAN', 'AEOLIAN', 'LOCRIAN',
] as const;

const NOTES_PER_MODE = 8;
const TOTAL_NOTES = MODE_SEQUENCE.length * NOTES_PER_MODE; // 56

const DEGREES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', "I'"] as const;

// ── Helpers que consultan el core ─────────────────────────────────────────────

function modeNameEs(key: string): string { return MODES[key]?.nameEs ?? key; }
function modeNameEn(key: string): string { return MODES[key]?.name ?? key; }

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

/** Grafía {letter, alter} → nombre de raíz para buildScale (ej. 'Eb', 'F#'). */
function spellingToRootName(sp: Spelling): string {
  const acc =
    sp.alter === 2 ? '##' :
    sp.alter === 1 ? '#' :
    sp.alter === -1 ? 'b' :
    sp.alter === -2 ? 'bb' : '';
  return sp.letter.toUpperCase() + acc;
}

const CHROMATIC_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Identifica qué modo (de los 7) corresponde a la forma interválica de un grupo. */
function identifyMode(groupMidi: number[]): string | null {
  if (groupMidi.length !== NOTES_PER_MODE) return null;
  const steps = groupMidi.slice(1).map((m, i) => m - groupMidi[i]);
  for (const key of MODE_SEQUENCE) {
    if (JSON.stringify(SCALE_FORMULAS[key]) === JSON.stringify(steps)) return key;
  }
  return null;
}

// ── Main validator ────────────────────────────────────────────────────────────

export function validateLesson2Modes(voiceData: VoiceData): ModeError[] {
  const errors: ModeError[] = [];

  const soprano = (voiceData.voices['SOPRANO'] ?? []).slice().sort((a, b) => a.tick - b.tick);

  if (soprano.length === 0) {
    errors.push({
      rule: 'MODE_COUNT',
      severity: 'error',
      position: 0,
      titleEs: 'No se encontraron notas en el canal Soprano',
      titleEn: 'No notes found in the Soprano channel',
      detailEs: 'Exporta el ejercicio desde el secuenciador Storm Studios: los 7 modos en un solo canal.',
      detailEn: 'Export the exercise from the Storm Studios sequencer: the 7 modes in a single channel.',
    });
    return errors;
  }

  // ── Tónica: la primera nota define la tónica de todos los modos ───────────
  const tonicPc = ((soprano[0].midi % 12) + 12) % 12;
  const tonicSpelling = parseSpelling(soprano[0].spelling);
  const tonicName = tonicSpelling ? spellingToRootName(tonicSpelling) : CHROMATIC_SHARP[tonicPc];
  const tonicLabel = tonicSpelling ? spellingName(tonicSpelling, 'es') : CHROMATIC_SHARP[tonicPc];
  const tonicLabelEn = tonicSpelling ? spellingName(tonicSpelling, 'en') : CHROMATIC_SHARP[tonicPc];

  // ── Rule 1: Conteo total ──────────────────────────────────────────────────
  if (soprano.length !== TOTAL_NOTES) {
    const diff = TOTAL_NOTES - soprano.length;
    errors.push({
      rule: 'MODE_COUNT',
      severity: 'error',
      position: 0,
      titleEs: `Se encontraron ${soprano.length} notas, se esperan ${TOTAL_NOTES}`,
      titleEn: `Found ${soprano.length} notes, expected ${TOTAL_NOTES}`,
      detailEs: diff > 0
        ? `Faltan ${diff} nota${diff > 1 ? 's' : ''}. Son 7 modos de 8 notas cada uno (${TOTAL_NOTES} en total).`
        : `Hay ${Math.abs(diff)} nota${Math.abs(diff) > 1 ? 's' : ''} de más. Son 7 modos de 8 notas (${TOTAL_NOTES} en total).`,
      detailEn: diff > 0
        ? `Missing ${diff} note${diff > 1 ? 's' : ''}. There are 7 modes of 8 notes each (${TOTAL_NOTES} total).`
        : `${Math.abs(diff)} extra note${Math.abs(diff) > 1 ? 's' : ''}. There are 7 modes of 8 notes (${TOTAL_NOTES} total).`,
    });
  }

  // ── Validación modo por modo (los grupos completos de 8 que existan) ──────
  const groupsAvailable = Math.floor(soprano.length / NOTES_PER_MODE);
  const groupsToCheck = Math.min(groupsAvailable, MODE_SEQUENCE.length);

  for (let i = 0; i < groupsToCheck; i++) {
    const modeKey = MODE_SEQUENCE[i];
    const slice = soprano.slice(i * NOTES_PER_MODE, i * NOTES_PER_MODE + NOTES_PER_MODE);
    const groupMidi = slice.map(n => n.midi);
    const groupSpellings = slice.map(n => n.spelling);
    const nameEs = modeNameEs(modeKey);
    const nameEn = modeNameEn(modeKey);

    // Teoría esperada del core (modo i desde la tónica elegida)
    let expected: ScaleNote[];
    try {
      expected = buildScale(tonicName, modeKey).notes;
    } catch {
      errors.push({
        rule: 'MODE_BUILD_ERROR',
        severity: 'error',
        position: i + 1,
        titleEs: `No se pudo construir ${nameEs} desde ${tonicLabel}`,
        titleEn: `Could not build ${nameEn} from ${tonicLabelEn}`,
        detailEs: `La tónica elegida (${tonicLabel}) genera alteraciones imposibles para este modo. Elige otra tónica.`,
        detailEn: `The chosen tonic (${tonicLabelEn}) produces impossible accidentals for this mode. Pick another tonic.`,
      });
      continue;
    }

    // Rule 2: Primer grado = tónica (todos los modos parten de la misma nota)
    const firstPc = ((groupMidi[0] % 12) + 12) % 12;
    if (firstPc !== tonicPc) {
      errors.push({
        rule: 'MODE_WRONG_TONIC',
        severity: 'error',
        position: i + 1,
        titleEs: `${nameEs}: no empieza en la tónica`,
        titleEn: `${nameEn}: doesn't start on the tonic`,
        detailEs: `Todos los modos parten de la misma tónica (${tonicLabel}). El ${nameEs} empieza en otra nota.`,
        detailEn: `All modes start from the same tonic (${tonicLabelEn}). The ${nameEn} starts on a different note.`,
      });
      continue; // sin la tónica correcta no tiene sentido validar grado por grado
    }

    // Rule 3: Orden — ¿el grupo es en realidad OTRO modo? (notas bien, lugar mal)
    const actualMode = identifyMode(groupMidi);
    if (actualMode && actualMode !== modeKey) {
      errors.push({
        rule: 'MODE_ORDER',
        severity: 'error',
        position: i + 1,
        titleEs: `Posición ${i + 1}: se esperaba ${nameEs}`,
        titleEn: `Position ${i + 1}: expected ${nameEn}`,
        detailEs: `En la posición ${i + 1} va el modo ${nameEs}, pero tocaste el ${modeNameEs(actualMode)}. `
                + `El orden es: jónico · dórico · frigio · lidio · mixolidio · eólico · locrio.`,
        detailEn: `Position ${i + 1} should be ${nameEn}, but you played ${modeNameEn(actualMode)}. `
                + `The order is: Ionian · Dorian · Phrygian · Lydian · Mixolydian · Aeolian · Locrian.`,
      });
      continue; // ya identificamos el problema; no llenamos de errores de nota
    }

    // Rules 4 & 4b: alturas y grafía por grado
    for (let deg = 0; deg < NOTES_PER_MODE; deg++) {
      const gotPc = ((groupMidi[deg] % 12) + 12) % 12;
      const expNote = expected[deg];

      if (gotPc !== expNote.pitch) {
        const gotName = gotNoteName(groupSpellings[deg], gotPc);
        errors.push({
          rule: 'MODE_WRONG_NOTE',
          severity: 'error',
          position: i + 1,
          degree: DEGREES[deg],
          titleEs: `${nameEs}: nota incorrecta en grado ${DEGREES[deg]}`,
          titleEn: `${nameEn}: wrong note on degree ${DEGREES[deg]}`,
          detailEs: `Grado ${DEGREES[deg]}: se esperaba ${expNote.nameEs} y se tocó ${gotName}. `
                  + `Revisa el ${nameEs} de ${tonicLabel}.`,
          detailEn: `Degree ${DEGREES[deg]}: expected ${expNote.nameEn}, got ${gotName}. `
                  + `Check the ${nameEn} mode of ${tonicLabelEn}.`,
        });
        continue;
      }

      const got = parseSpelling(groupSpellings[deg]);
      if (got) {
        const exp = coreNoteToSpelling(expNote);
        if (!sameSpelling(got, exp)) {
          errors.push({
            rule: 'MODE_ENHARMONIC',
            severity: 'error',
            position: i + 1,
            degree: DEGREES[deg],
            titleEs: `${nameEs}: grafía incorrecta en grado ${DEGREES[deg]}`,
            titleEn: `${nameEn}: wrong spelling on degree ${DEGREES[deg]}`,
            detailEs: `Grado ${DEGREES[deg]}: escribiste ${spellingName(got, 'es')} pero en el ${nameEs} de ${tonicLabel} corresponde ${spellingName(exp, 'es')}. `
                    + `Suenan igual (enarmónicas) pero la grafía correcta es ${spellingName(exp, 'es')}.`,
            detailEn: `Degree ${DEGREES[deg]}: you wrote ${spellingName(got, 'en')} but the ${nameEn} mode of ${tonicLabelEn} requires ${spellingName(exp, 'en')}. `
                    + `They sound the same (enharmonic) but the correct spelling is ${spellingName(exp, 'en')}.`,
          });
        }
      }
    }

    // Rule 5: Dirección ascendente
    for (let k = 1; k < NOTES_PER_MODE; k++) {
      if (groupMidi[k] <= groupMidi[k - 1]) {
        errors.push({
          rule: 'MODE_DIRECTION',
          severity: 'error',
          position: i + 1,
          degree: DEGREES[k],
          titleEs: `${nameEs}: dirección incorrecta en grado ${DEGREES[k]}`,
          titleEn: `${nameEn}: wrong direction on degree ${DEGREES[k]}`,
          detailEs: `Cada modo debe tocarse ascendente. La nota ${DEGREES[k]} `
                  + `(MIDI ${groupMidi[k]}) no es mayor que la anterior (MIDI ${groupMidi[k - 1]}).`,
          detailEn: `Each mode must be played ascending. Note ${DEGREES[k]} `
                  + `(MIDI ${groupMidi[k]}) is not higher than the previous (MIDI ${groupMidi[k - 1]}).`,
        });
      }
    }

    // Rule 6: Cierre en la tónica (octava superior)
    const lastPc = ((groupMidi[NOTES_PER_MODE - 1] % 12) + 12) % 12;
    if (lastPc !== tonicPc) {
      errors.push({
        rule: 'MODE_TONIC_CLOSURE',
        severity: 'error',
        position: i + 1,
        titleEs: `${nameEs}: no cierra en la tónica`,
        titleEn: `${nameEn}: doesn't close on the tonic`,
        detailEs: `El ${nameEs} debe terminar en la tónica (${tonicLabel}) una octava arriba.`,
        detailEn: `The ${nameEn} mode must end on the tonic (${tonicLabelEn}) one octave higher.`,
      });
    }
  }

  return errors;
}

/** Nombre de la nota tocada para los mensajes (usa la grafía del alumno si la hay). */
function gotNoteName(spelling: string | undefined, pc: number): string {
  const got = parseSpelling(spelling);
  if (got) return spellingName(got, 'es');
  const CHROMATIC_ES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
  return CHROMATIC_ES[pc] ?? `(pc ${pc})`;
}
