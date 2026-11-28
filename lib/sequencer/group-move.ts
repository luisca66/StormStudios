/**
 * group-move.ts — Mover juntas todas las notas seleccionadas (Sequencer v5).
 *
 * Al arrastrar una nota que forma parte de una selección, las demás se mueven
 * lo mismo, como en un secuenciador profesional:
 * - En la partitura, por grados del pentagrama: cada nota sube o baja los
 *   mismos pasos (línea/espacio) y toma la alteración de la armadura de su
 *   compás, igual que cuando se arrastra una sola.
 * - En el editor de teclas, por semitonos; en el tiempo (en los dos editores)
 *   todas se corren la misma distancia.
 *
 * Una nota de acorde seleccionada sola mueve solo esa altura; en el tiempo se
 * mueve el acorde completo (un acorde no se parte al desplazarlo).
 */
import { durationTicks, keySignature, locateTick, newId, normalizePitch, pitchToMidi, scoreTicks, transposePitches, validateScore } from "./model";
import { writeWithMouse } from "./mouse-editing";
import { mapSelectedPitches, normalizeSelection, parseKey } from "./note-selection";
import type { NoteEvent, Score, VoiceId } from "./types";

const LETTERS = "CDEFGAB";

/** Sube o baja `steps` grados del pentagrama con la alteración que pide la armadura `key`. */
export function shiftByStaffSteps(pitch: string, steps: number, key: string): string {
  const match = /^([A-G])(?:##|bb|#|b)?(-?\d+)$/.exec(normalizePitch(pitch));
  if (!match) throw new Error(`Nota no válida: ${pitch}`);
  const position = Number(match[2]) * 7 + LETTERS.indexOf(match[1]) + steps;
  const letter = LETTERS[((position % 7) + 7) % 7], octave = Math.floor(position / 7);
  const { fifths } = keySignature(key);
  const altered = (fifths > 0 ? "FCGDAEB" : "BEADGCF").slice(0, Math.abs(fifths)).includes(letter);
  const result = letter + (altered ? (fifths > 0 ? "#" : "b") : "") + octave;
  pitchToMidi(result); // fuera del rango MIDI lanza un error
  return result;
}

/** Grados del pentagrama entre dos notas (por letra, sin contar alteraciones). */
export function staffSteps(from: string, to: string): number {
  const step = (pitch: string) => { const m = /^([A-G])(?:##|bb|#|b)?(-?\d+)$/.exec(normalizePitch(pitch))!; return Number(m[2]) * 7 + LETTERS.indexOf(m[1]); };
  return step(to) - step(from);
}

export type GroupMove =
  | { kind: "steps"; steps: number; ticks?: number }
  | { kind: "keys"; semitones: number; ticks: number };

/** ¿Hay más de una nota en la selección y `id` es una de ellas? */
export function movesAsGroup(score: Score, keys: string[], id: string): boolean {
  const selected = normalizeSelection(score, keys);
  return selected.length > 1 && selected.some(key => parseKey(key).id === id);
}

/**
 * Mueve toda la selección. Devuelve la partitura nueva y la selección con las
 * grafías y los ids nuevos, para que siga seleccionada después de moverla.
 */
export function moveSelection(score: Score, keys: string[], move: GroupMove): { score: Score; keys: string[] } {
  // 1. Alturas: solo las notas seleccionadas (respeta notas sueltas dentro de un acorde).
  const keyAt = (id: string) => {
    const event = score.voices.flatMap(v => v.events).find(e => e.id === id);
    return event ? score.measures[locateTick(score, event.start).measure - 1].key : "C";
  };
  const eventOf = new Map<string, string>(); // pitch-key → event id, para conocer el compás de cada altura
  for (const key of normalizeSelection(score, keys)) eventOf.set(key, parseKey(key).id);
  let current = keys;
  let next = score;
  if (move.kind === "steps" && move.steps) {
    // mapSelectedPitches no dice de qué evento viene cada altura: se mueve evento por evento.
    for (const id of new Set([...eventOf.values()])) {
      const ownKeys = current.filter(key => parseKey(key).id === id);
      const others = current.filter(key => parseKey(key).id !== id);
      const tonality = keyAt(id);
      const edit = mapSelectedPitches(next, ownKeys, pitch => shiftByStaffSteps(pitch, move.steps, tonality));
      next = edit.score; current = [...others, ...edit.keys];
    }
  } else if (move.kind === "keys" && move.semitones) {
    const edit = mapSelectedPitches(next, current, pitch => transposePitches([pitch], move.semitones)[0]);
    next = edit.score; current = edit.keys;
  }
  // 2. Tiempo: se corren los eventos completos que tienen algo seleccionado.
  const shift = move.ticks ?? 0;
  if (shift) {
    const ids = new Set(current.map(key => parseKey(key).id));
    const moving: { voice: VoiceId; event: NoteEvent }[] = [];
    const working = structuredClone(next);
    for (const voice of working.voices) {
      voice.events = voice.events.filter(event => {
        if (!ids.has(event.id)) return true;
        moving.push({ voice: voice.id, event: { ...event, start: event.start + shift } });
        return false;
      });
    }
    const first = Math.min(...moving.map(m => m.event.start)), last = Math.max(...moving.map(m => m.event.start + durationTicks(m.event)));
    if (first < 0) throw new Error("La selección no cabe antes del inicio de la partitura.");
    if (last > scoreTicks(working)) throw new Error("La selección se sale del final de la partitura. Añade un compás.");
    // Primero se quitan todas y luego se escriben, para que no se pisen entre sí.
    const rename = new Map<string, string>();
    let written = working;
    for (const { voice, event } of moving.sort((a, b) => a.event.start - b.event.start)) {
      const id = newId(); rename.set(event.id, id);
      written = writeWithMouse(written, voice, { ...event, id });
    }
    next = written;
    current = current.map(key => { const { id, pitch } = parseKey(key); const renamed = rename.get(id) ?? id; return pitch === undefined ? renamed : `${renamed}@${pitch}`; });
  }
  const valid = validateScore(next);
  return { score: valid, keys: normalizeSelection(valid, current) };
}
