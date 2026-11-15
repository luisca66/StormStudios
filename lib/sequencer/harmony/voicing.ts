/**
 * voicing.ts — Todas las disposiciones SATB correctas de un acorde.
 *
 * Reglas de construcción (las mismas que revisa el Maestro Virtual en la
 * Lección 6, `satb-chords-validator.ts`):
 * - Tesituras y separaciones máximas del curso; sin cruce de voces.
 * - Nunca se suprime el fundamental ni la tercera; mayores y menores pueden
 *   suprimir la quinta; el disminuido va siempre completo.
 * - La sensible no se duplica.
 * - El bajo canta la nota que pide el estado (fundamental, 6/3 o 6/4).
 *
 * `voicingCost` ordena las disposiciones por lo que suena mejor (acorde
 * completo, fundamental duplicado, voces superiores juntas); no prohíbe nada.
 */
import { LESSON6_RANGES, LESSON6_SPACING, type KeyModel, type SatbVoice } from "@/lib/maestro-virtual/satb-chords-validator";
import type { ProgressionChord } from "@/lib/maestro-virtual/harmonic-material";
import { letterIndex, type Spelling } from "@/lib/maestro-virtual/spelling";
import type { Pitch } from "@/lib/maestro-virtual/voice-leading";

export type Member = "root" | "third" | "fifth";
export type VoicedNote = Pitch & { member: Member };
export type Voicing = Record<SatbVoice, VoicedNote>;

const pcOf = (midi: number) => ((midi % 12) + 12) % 12;
const diatonicStep = (p: Pitch) => Math.floor((p.midi - p.spelling.alter) / 12) * 7 + letterIndex(p.spelling.letter);
/** Número de intervalo por grafía (3 = tercera, 8 = octava). */
export const intervalNumber = (lower: Pitch, upper: Pitch) => diatonicStep(upper) - diatonicStep(lower) + 1;

/** Grafía científica del secuenciador: C4, F#3, Bb2. */
export function pitchName(p: Pitch): string {
  const { letter, alter } = p.spelling as Spelling;
  const octave = Math.floor((p.midi - alter) / 12) - 1;
  return letter.toUpperCase() + (alter > 0 ? "#".repeat(alter) : "b".repeat(-alter)) + octave;
}

export type VoicingOptions = {
  /** Nota obligada de la soprano (MIDI), para armonizar una melodía dada. */
  soprano?: number;
};

export function enumerateVoicings(model: KeyModel, chord: ProgressionChord, options: VoicingOptions = {}): Voicing[] {
  const triad = model.triads[chord.degree - 1];
  if (!triad || chord.inversion < 0 || chord.inversion > 2) return [];
  const diminished = chord.degree === 7;
  const notesFor = (voice: SatbVoice, only?: Member): VoicedNote[] => {
    const { min, max } = LESSON6_RANGES[voice];
    const out: VoicedNote[] = [];
    for (let midi = min; midi <= max; midi++) {
      const tone = triad.find(t => t.pc === pcOf(midi));
      if (tone && (!only || tone.member === only)) out.push({ midi, spelling: tone.spelling, member: tone.member });
    }
    return out;
  };
  const bassMember = triad[chord.inversion].member;
  const spacingOk = (upper: VoicedNote, lower: VoicedNote, pair: number) =>
    upper.midi > lower.midi && intervalNumber(lower, upper) <= LESSON6_SPACING[pair].max;

  const result: Voicing[] = [];
  const sopranos = notesFor("SOPRANO").filter(n => options.soprano === undefined || n.midi === options.soprano);
  for (const BASS of notesFor("BASS", bassMember)) {
    for (const TENOR of notesFor("TENOR")) {
      if (!spacingOk(TENOR, BASS, 2)) continue;
      for (const ALTO of notesFor("ALTO")) {
        if (!spacingOk(ALTO, TENOR, 1)) continue;
        for (const SOPRANO of sopranos) {
          if (!spacingOk(SOPRANO, ALTO, 0)) continue;
          const voices = [SOPRANO, ALTO, TENOR, BASS];
          const count = (member: Member) => voices.filter(v => v.member === member).length;
          if (!count("root") || !count("third")) continue;
          if (diminished && !count("fifth")) continue;
          if (voices.filter(v => pcOf(v.midi) === model.leadingPc).length > 1) continue;
          result.push({ SOPRANO, ALTO, TENOR, BASS });
        }
      }
    }
  }
  return result;
}

/** Preferencias de sonoridad; menor es mejor. */
export function voicingCost(voicing: Voicing, chord: ProgressionChord): number {
  const voices = [voicing.SOPRANO, voicing.ALTO, voicing.TENOR, voicing.BASS];
  const count = (member: Member) => voices.filter(v => v.member === member).length;
  let cost = 0;
  if (!count("fifth")) cost += 4; // acorde incompleto
  if (count("root") >= 3) cost += 2;
  if (chord.degree === 7) {
    if (count("third") !== 2) cost += 1.5; // en el disminuido se prefiere duplicar la tercera
  } else if (chord.inversion === 2) {
    if (count("fifth") !== 2) cost += 1.5; // en 6/4 se prefiere duplicar el bajo
  } else if (count("root") !== 2 && count("fifth")) cost += 1; // se prefiere duplicar el fundamental
  if (voicing.SOPRANO.midi - voicing.ALTO.midi > 12) cost += 3;
  if (voicing.ALTO.midi - voicing.TENOR.midi > 12) cost += 3;
  // Centro cómodo de cada voz: evita extremos de tesitura.
  const comfort: [VoicedNote, number][] = [[voicing.SOPRANO, 70], [voicing.ALTO, 64], [voicing.TENOR, 57], [voicing.BASS, 48]];
  for (const [note, center] of comfort) cost += Math.max(0, Math.abs(note.midi - center) - 5) * 0.25;
  return cost;
}
