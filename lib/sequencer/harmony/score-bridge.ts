/**
 * score-bridge.ts — Puente entre la partitura (Score) y el motor de armonía.
 *
 * La pista de acordes NO añade nada al formato: son las anotaciones
 * `kind: "roman"` que ya existen en la v4, ordenadas en el tiempo. Así un
 * proyecto de la v5 se abre igual en la v4 y en el flujo de stills/video.
 *
 * Este archivo es SOLO del modo autor: genera voces (`realizeChordTrack`) y
 * armoniza la soprano (`harmonizeOptions`, `applyHarmonization`). Leer y
 * escribir cifrado a mano es público y vive en `chord-track.ts`.
 * No lo importes desde código que llegue al alumno.
 */
import { durationTicks, measureStart, newId, pitchToMidi, scoreTicks, splitTicks, validateScore } from "../model";
import { writeWithMouse } from "../mouse-editing";
import { PPQ, type NoteEvent, type Score, type VoiceId } from "../types";
import type { SatbVoice } from "@/lib/maestro-virtual/satb-chords-validator";
import { chordName, keyModel } from "./chords";
import { chordTrack } from "./chord-track";
import { harmonize, type Harmonization } from "./harmonize";
import { realize } from "./realize";
import { pitchName, type Voicing } from "./voicing";

export type BridgeResult = { score: Score; message: { es: string; en: string } };
export class HarmonyError extends Error {
  constructor(public es: string, public en: string) { super(es); }
}

const VOICE_OF: Record<SatbVoice, VoiceId> = { SOPRANO: "soprano", ALTO: "alto", TENOR: "tenor", BASS: "bass" };
const ORDER: SatbVoice[] = ["SOPRANO", "ALTO", "TENOR", "BASS"];

function writeNote(score: Score, voice: VoiceId, start: number, ticks: number, pitch: string): Score {
  const values = splitTicks(ticks);
  if (!values) throw new HarmonyError("La duración entre dos acordes no se puede escribir con figuras simples.", "The length between two chords cannot be written with plain note values.");
  let next = score, position = start;
  values.forEach((value, index) => {
    const event: NoteEvent = { id: newId(), start: position, ...value, pitches: [pitch], tie: index < values.length - 1 };
    next = writeWithMouse(next, voice, event);
    position += durationTicks(value);
  });
  return next;
}

function writeVoicings(score: Score, spans: { tick: number; endTick: number }[], voicings: Voicing[], voices: SatbVoice[]): Score {
  let next: Score = { ...structuredClone(score), mode: "satb" };
  spans.forEach((span, index) => {
    for (const voice of voices) next = writeNote(next, VOICE_OF[voice], span.tick, span.endTick - span.tick, pitchName(voicings[index][voice]));
  });
  return validateScore(next);
}

/** Modo autor: reparte las cuatro voces de la pista de acordes con la conducción del curso. */
export function realizeChordTrack(score: Score): BridgeResult {
  const slots = chordTrack(score);
  if (!slots.length) throw new HarmonyError("La pista de acordes está vacía.", "The chord track is empty.");
  const bad = slots.find(slot => !slot.chord);
  if (bad) throw new HarmonyError(`Compás ${bad.measure}: «${bad.text}» no es un acorde de ${bad.key} mayor.`, `Measure ${bad.measure}: "${bad.text}" is not a chord of ${bad.key} major.`);
  if (new Set(slots.map(slot => slot.key)).size > 1) throw new HarmonyError("La pista cambia de tonalidad; por ahora se reparte una tonalidad a la vez.", "The track changes key; for now one key is voiced at a time.");
  const model = keyModel(slots[0].key);
  const [best] = realize(model, slots.map(slot => slot.chord!));
  if (!best) throw new HarmonyError("No encontré un reparto que cumpla todas las reglas del curso para esta progresión.", "No voicing satisfies every course rule for this progression.");
  return {
    score: writeVoicings(score, slots, best.voicings, ORDER),
    message: { es: `${slots.length} acordes repartidos a cuatro voces.`, en: `${slots.length} chords voiced in four parts.` },
  };
}

/** Notas de la soprano (ligaduras fundidas), para armonizarlas. */
export function sopranoLine(score: Score): { tick: number; endTick: number; midi: number }[] {
  const events = [...(score.voices.find(v => v.id === "soprano")?.events ?? [])].sort((a, b) => a.start - b.start);
  const out: { tick: number; endTick: number; midi: number }[] = [];
  let tied = false;
  for (const event of events) {
    if (event.pitches.length !== 1) { if (event.pitches.length > 1) throw new HarmonyError("La soprano debe tener una sola nota a la vez.", "The soprano must sing one note at a time."); tied = false; continue; }
    const midi = pitchToMidi(event.pitches[0]), end = event.start + durationTicks(event);
    const last = out[out.length - 1];
    if (tied && last && last.midi === midi && last.endTick === event.start) last.endTick = end;
    else out.push({ tick: event.start, endTick: end, midi });
    tied = event.tie;
  }
  return out;
}

/** Modo autor: opciones de armonización de la soprano escrita. */
export function harmonizeOptions(score: Score, results = 3): Harmonization[] {
  const line = sopranoLine(score);
  if (!line.length) throw new HarmonyError("Escribe primero la melodía en la soprano.", "Write the melody in the soprano first.");
  if (line[line.length - 1].endTick > scoreTicks(score)) throw new HarmonyError("La melodía rebasa la partitura.", "The melody runs past the score.");
  const model = keyModel(score.measures[0].key);
  const options = harmonize(model, line.map(n => n.midi), { results });
  if (!options.length) throw new HarmonyError("No encontré una armonización con el material y las reglas del curso para esta melodía.", "No harmonization fits the course material and rules for this melody.");
  return options;
}

/** Modo autor: escribe una armonización elegida (contralto, tenor, bajo y cifrado). */
export function applyHarmonization(score: Score, option: Harmonization): BridgeResult {
  const line = sopranoLine(score);
  let next = writeVoicings(score, line, option.voicings, ["ALTO", "TENOR", "BASS"]);
  next = { ...next, annotations: (next.annotations ?? []).filter(a => a.kind !== "roman") };
  line.forEach((note, index) => {
    let measure = 1;
    while (measure < next.measures.length && measureStart(next, measure + 1) <= note.tick) measure++;
    const beat = 1 + (note.tick - measureStart(next, measure)) / PPQ;
    next.annotations!.push({ id: newId(), measure, beat, text: chordName(option.chords[index]), kind: "roman" });
  });
  return {
    score: validateScore(next),
    message: { es: `Armonización escrita: ${option.chords.map(chordName).join(" – ")}.`, en: `Harmonization written: ${option.chords.map(chordName).join(" – ")}.` },
  };
}
