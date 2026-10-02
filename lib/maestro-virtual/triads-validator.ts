import type { VoiceData } from './midi-parser';
import { buildScale, harmonizeScale, nameToPitch } from './music-theory-core';
import { parseSpelling, sameSpelling, spellingName } from './spelling';

export const TRIAD_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
export const TRIAD_VARIANTS = {
  MAJOR: { es: 'Mayor natural', en: 'Natural major', scale: 'MAJOR', descending: false },
  HARMONIC_MAJOR: { es: 'Mayor armónica', en: 'Harmonic major', scale: 'HARMONIC_MAJOR', descending: false },
  NATURAL_MINOR: { es: 'Menor natural', en: 'Natural minor', scale: 'NATURAL_MINOR', descending: false },
  HARMONIC_MINOR: { es: 'Menor armónica', en: 'Harmonic minor', scale: 'HARMONIC_MINOR', descending: false },
  MELODIC_MINOR: { es: 'Menor melódica ascendente', en: 'Ascending melodic minor', scale: 'MELODIC_MINOR', descending: false },
  MELODIC_MINOR_DESC: { es: 'Menor melódica descendente', en: 'Descending melodic minor', scale: 'NATURAL_MINOR', descending: true },
} as const;
export type TriadVariant = keyof typeof TRIAD_VARIANTS;
export type TriadError = {
  rule: string; severity: 'error'; position: number;
  titleEs: string; titleEn: string; detailEs: string; detailEn: string;
};

export function isTriadSelection(root: string, variant: string): variant is TriadVariant {
  return (TRIAD_ROOTS as readonly string[]).includes(root)
    && Object.prototype.hasOwnProperty.call(TRIAD_VARIANTS, variant);
}

/** I–VII–I′ en posición fundamental y cerrada; bajada: I′–VII–I. */
export function lesson4TriadPattern(root: string, variant: TriadVariant, tonicMidi = 60 + nameToPitch(root)) {
  if (!isTriadSelection(root, variant)) throw new Error('Selección de tríadas inválida');
  const info = TRIAD_VARIANTS[variant];
  const scale = buildScale(root, info.scale).notes;
  const chords = harmonizeScale(root, info.scale);
  const pattern = Array.from({ length: 8 }, (_, degree) => {
    const chord = chords[degree % 7];
    const notes = [0, 2, 4].map(offset => {
      const index = degree + offset;
      const note = scale[index % 7];
      return { name: note.nameEn, midi: tonicMidi + note.semitoneFromRoot + 12 * Math.floor(index / 7) };
    });
    return { degree: degree === 7 ? "I′" : chord.degreeRoman, notes };
  });
  return info.descending ? pattern.reverse() : pattern;
}

/** Tres notas simultáneas por acorde, sin duplicaciones, inversiones ni reglas SATB. */
export function validateLesson4Triads(data: VoiceData, root: string, variant: TriadVariant): TriadError[] {
  const errors: TriadError[] = [];
  const add = (rule: string, position: number, es: string, en: string) => {
    errors.push({ rule, severity: 'error', position, titleEs: es, titleEn: en, detailEs: es, detailEn: en });
  };
  if (!isTriadSelection(root, variant)) {
    add('TRIAD_SELECTION', 0, 'Tónica o variante no válida.', 'Invalid tonic or variant.');
    return errors;
  }
  const groups = new Map<number, { midi: number; spelling?: string }[]>();
  for (const notes of Object.values(data.voices)) for (const note of notes ?? []) {
    const group = groups.get(note.tick) ?? [];
    group.push(note);
    groups.set(note.tick, group);
  }
  const ordered = [...groups.entries()].sort(([a], [b]) => a - b).map(([, notes]) => notes.sort((a, b) => a.midi - b.midi));
  if (ordered.length !== 8) {
    add('TRIAD_COUNT', 0, `Se encontraron ${ordered.length} acordes; se esperan 8.`, `Found ${ordered.length} chords; expected 8.`);
    return errors;
  }
  // Registro libre para cada entrega; el recorrido permanece en una octava.
  const firstRoot = ordered[0][0].midi;
  const tonicMidi = firstRoot - (TRIAD_VARIANTS[variant].descending ? 12 : 0);
  if ((tonicMidi % 12 + 12) % 12 !== nameToPitch(root)) {
    add('TRIAD_TONIC', 1, `El primer acorde debe tener ${root} como fundamental.`, `The first chord must have ${root} as its root.`);
    return errors;
  }
  const pattern = lesson4TriadPattern(root, variant, tonicMidi);
  for (let i = 0; i < pattern.length; i++) {
    const got = ordered[i], expected = pattern[i];
    const label = `Acorde ${i + 1} (${expected.degree})`;
    const labelEn = `Chord ${i + 1} (${expected.degree})`;
    if (got.length !== 3) {
      add('TRIAD_NOTE_COUNT', i + 1, `${label}: se esperan 3 notas simultáneas, hay ${got.length}.`, `${labelEn}: expected 3 simultaneous notes, found ${got.length}.`);
      continue;
    }
    for (let j = 0; j < 3; j++) {
      const exp = expected.notes[j];
      if (got[j].midi !== exp.midi) {
        add('TRIAD_WRONG_NOTE', i + 1, `${label}: se esperaba ${exp.name} (MIDI ${exp.midi}), llegó MIDI ${got[j].midi}. Revisa el grado, la octava y el estado fundamental.`, `${labelEn}: expected ${exp.name} (MIDI ${exp.midi}), got MIDI ${got[j].midi}. Check the degree, octave and root position.`);
        continue;
      }
      const spelling = parseSpelling(got[j].spelling);
      if (!spelling) {
        add('TRIAD_MISSING_SPELLING', i + 1, `${label}: falta la grafía de una nota. Exporta desde Storm Sequencer.`, `${labelEn}: a note spelling is missing. Export from Storm Sequencer.`);
      } else if (!sameSpelling(spelling, parseSpelling(exp.name)!)) {
        add('TRIAD_ENHARMONIC', i + 1, `${label}: escribiste ${spellingName(spelling, 'es')}; corresponde ${exp.name}.`, `${labelEn}: you wrote ${spellingName(spelling, 'en')}; expected ${exp.name}.`);
      }
    }
  }
  return errors;
}
