/**
 * review.ts — Revisión de una partitura SATB con las reglas del curso (modo autor).
 *
 * SOLO para el autor: sirve para comprobar un ejemplo antes de grabarlo. No se
 * importa desde código público; al alumno el secuenciador nunca le corrige
 * (decisión de Luis). El alumno entrega su ejercicio al Maestro Virtual.
 *
 * No hay teoría nueva aquí: construcción de acordes, movimientos armónicos y
 * melódicos y tabla de enlaces son las funciones del Maestro Virtual.
 */
import { analyzeSatbChords, identifySatbChord, SATB_VOICES, VOICE_NAMES, type Chord, type KeyModel, type SatbVoice } from "@/lib/maestro-virtual/satb-chords-validator";
import { checkProgression, chordSymbol, type ProgressionChord } from "@/lib/maestro-virtual/harmonic-material";
import type { ParsedNote } from "@/lib/maestro-virtual/midi-parser";
import { parseSpelling } from "@/lib/maestro-virtual/spelling";
import { checkHarmonicMotion, checkMelodicLine, intervalName, type Pitch } from "@/lib/maestro-virtual/voice-leading";
import { durationTicks, locateTick, pitchToMidi } from "../model";
import type { Score, VoiceId } from "../types";
import { keyModel } from "./chords";

export type Finding = { measure: number; beat: number; es: string; en: string };
export type Review = { chords: number; findings: Finding[]; progression: string };

const VOICE_OF: Record<SatbVoice, VoiceId> = { SOPRANO: "soprano", ALTO: "alto", TENOR: "tenor", BASS: "bass" };
const HARMONIC: Record<string, [string, string]> = {
  HARMONIC_PARALLEL_OCTAVES: ["8as paralelas", "parallel octaves"], HARMONIC_CONTRARY_OCTAVES: ["8as contrarias", "contrary octaves"],
  HARMONIC_PARALLEL_FIFTHS: ["5as paralelas", "parallel fifths"], HARMONIC_CONTRARY_FIFTHS: ["5as contrarias entre voces extremas", "contrary fifths in the outer voices"],
  HARMONIC_SIMULTANEOUS_LEAPS: ["saltos simultáneos en la misma dirección", "simultaneous leaps in the same direction"],
};
const MELODIC: Record<string, [string, string]> = {
  MELODIC_FORBIDDEN_INTERVAL: ["intervalo melódico no permitido", "melodic interval not allowed"],
  MELODIC_REPEATED_NOTE: ["nota repetida", "repeated note"],
  MELODIC_LEADING_TONE_OCTAVE: ["salto de 8a con la sensible", "octave leap on the leading tone"],
  MELODIC_DIMINISHED_UNRESOLVED: ["intervalo disminuido sin cambio de dirección", "diminished interval without a change of direction"],
  MELODIC_SUCCESSIVE_LEAPS: ["dos saltos seguidos en la misma dirección", "two successive leaps in the same direction"],
};

type Column = { tick: number; measure: number; beat: number; key: string; chord: Chord; pitches: Partial<Record<SatbVoice, Pitch>> };

/** Cada ataque de cualquier voz es una columna: la nota que suena en cada voz en ese instante. */
function columns(score: Score): { complete: Column[]; findings: Finding[] } {
  const findings: Finding[] = [];
  const events = Object.fromEntries(SATB_VOICES.map(voice => [voice, score.voices.find(v => v.id === VOICE_OF[voice])?.events ?? []])) as Record<SatbVoice, Score["voices"][number]["events"]>;
  const ticks = [...new Set(SATB_VOICES.flatMap(voice => events[voice].filter(e => e.pitches.length).map(e => e.start)))].sort((a, b) => a - b);
  const complete: Column[] = [];
  for (const tick of ticks) {
    const at = locateTick(score, tick), key = score.measures[at.measure - 1].key;
    const notes: Partial<Record<SatbVoice, ParsedNote>> = {}, pitches: Partial<Record<SatbVoice, Pitch>> = {};
    const missing: SatbVoice[] = [];
    for (const voice of SATB_VOICES) {
      const event = events[voice].find(e => e.start <= tick && tick < e.start + durationTicks(e));
      if (!event || event.pitches.length !== 1) { missing.push(voice); continue; }
      const name = event.pitches[0], spelling = parseSpelling(name.replace(/-?\d+$/, "")), midi = pitchToMidi(name);
      notes[voice] = { midi, pitch: midi % 12, tick, key, spelling: name.replace(/-?\d+$/, "").toLowerCase() };
      if (spelling) pitches[voice] = { midi, spelling };
    }
    if (missing.length) {
      findings.push({ measure: at.measure, beat: at.beat, es: `Falta una sola nota en ${missing.map(v => VOICE_NAMES[v].es).join(", ")}; este acorde no se revisa.`, en: `A single note is missing in the ${missing.map(v => VOICE_NAMES[v].en).join(", ")}; this chord is not reviewed.` });
      continue;
    }
    complete.push({ tick, measure: at.measure, beat: at.beat, key, chord: { position: complete.length + 1, tick, notes, problems: [] }, pitches });
  }
  return { complete, findings };
}

export function reviewScore(score: Score): Review {
  const { complete, findings } = columns(score);
  const where = (column: Column) => ({ measure: column.measure, beat: column.beat });
  const models = new Map<string, KeyModel | null>();
  const modelOf = (key: string) => { if (!models.has(key)) { try { models.set(key, keyModel(key)); } catch { models.set(key, null); } } return models.get(key)!; };
  const names: string[] = [];
  let run: { chords: ProgressionChord[]; columns: Column[] } = { chords: [], columns: [] };
  const closeRun = () => {
    for (const issue of checkProgression(run.chords)) {
      const a = run.chords[issue.index], b = run.chords[issue.index + 1], column = run.columns[issue.index + 1];
      if (issue.rule === "PROGRESSION_FORBIDDEN_LINK") findings.push({ ...where(column), es: `El enlace ${chordSymbol(a)}–${chordSymbol(b)} no está en la tabla de enlaces del curso.`, en: `The link ${chordSymbol(a)}–${chordSymbol(b)} is not in the course's table of links.` });
      else findings.push({ ...where(column), es: `Tras ${chordSymbol(a)}–${chordSymbol(b)} el curso pide continuar con ${issue.expected!.map(chordSymbol).join(" o ")}.`, en: `After ${chordSymbol(a)}–${chordSymbol(b)} the course asks to continue with ${issue.expected!.map(chordSymbol).join(" or ")}.` });
    }
    run = { chords: [], columns: [] };
  };
  complete.forEach((column, index) => {
    const model = modelOf(column.key);
    if (!model) { findings.push({ ...where(column), es: `La armadura ${column.key} no es una tonalidad mayor del curso; este acorde no se revisa.`, en: `Key ${column.key} is not a major key of the course; this chord is not reviewed.` }); closeRun(); names.push("?"); return; }
    // Construcción del acorde (Lección 6).
    for (const item of analyzeSatbChords([column.chord], model).feedback.filter(f => f.severity === "error"))
      findings.push({ ...where(column), es: [item.titleEs, item.detailEs].filter(Boolean).join(" "), en: [item.titleEn, item.detailEn].filter(Boolean).join(" ") });
    const identified = identifySatbChord(column.chord, model);
    names.push(identified ? chordSymbol(identified) : "?");
    const previous = complete[index - 1];
    if (previous && previous.key !== column.key) closeRun();
    if (identified) { run.chords.push(identified); run.columns.push(column); } else closeRun();
    if (!previous || previous.key !== column.key) return;
    // Movimientos armónicos entre este acorde y el anterior.
    for (const issue of checkHarmonicMotion(SATB_VOICES, previous.pitches, column.pitches))
      findings.push({ ...where(column), es: `${HARMONIC[issue.rule][0]} entre ${VOICE_NAMES[issue.upper].es} y ${VOICE_NAMES[issue.lower].es}: ${intervalName(issue.before, "es")} → ${intervalName(issue.after, "es")}.`,
        en: `${HARMONIC[issue.rule][1]} between ${VOICE_NAMES[issue.upper].en} and ${VOICE_NAMES[issue.lower].en}: ${intervalName(issue.before, "en")} → ${intervalName(issue.after, "en")}.` });
  });
  closeRun();
  // Movimientos melódicos de cada voz, por tramos de una misma tonalidad.
  for (const voice of SATB_VOICES) {
    let start = 0;
    for (let i = 1; i <= complete.length; i++) {
      if (i < complete.length && complete[i].key === complete[start].key) continue;
      const span = complete.slice(start, i), model = modelOf(span[0].key);
      const line = span.map(column => column.pitches[voice]);
      if (model && line.every(Boolean)) for (const issue of checkMelodicLine(line as Pitch[], { leadingPc: model.leadingPc, allowRepeat: true })) {
        const column = span[issue.index + 1];
        findings.push({ ...where(column), es: `${VOICE_NAMES[voice].es}: ${MELODIC[issue.rule][0]} (${intervalName(issue.interval, "es")}).`, en: `${VOICE_NAMES[voice].en}: ${MELODIC[issue.rule][1]} (${intervalName(issue.interval, "en")}).` });
      }
      start = i;
    }
  }
  findings.sort((a, b) => a.measure - b.measure || a.beat - b.beat);
  return { chords: complete.length, findings, progression: names.join(" – ") };
}
