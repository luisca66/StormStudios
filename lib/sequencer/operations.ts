/**
 * Score edits that touch more than one event. Pure, like model.ts: every
 * operation returns a new validated score and never mutates its argument.
 */
import { durationTicks, measureTicks, newId, splitTicks, validateScore } from "./model";
import { PPQ, type NoteEvent, type Score } from "./types";

const TIME_DENOMINATORS = [1, 2, 4, 8, 16, 32];
const MAX_TIME_NUMERATOR = 32;

/**
 * Changes the time signature of one measure (one-based) and nothing else: the
 * other measures keep theirs, so call it once per measure to change a passage.
 *
 * Events store absolute ticks, so resizing a measure would slide every later
 * event into the wrong place. Instead each event of every voice (also the
 * voices outside the score's mode) keeps its measure and its offset inside
 * that measure, and its start tick is recomputed from the new bar lines. Ids,
 * values, pitches and ties are untouched; a tie over a bar line stays
 * effective because both sides move together. Scenes keep their measure
 * numbers, and so cover more or less time.
 *
 * Growing a measure leaves the new room empty at its end. Shrinking is
 * rejected when a note of any voice would no longer fit; rests that no longer
 * fit are dropped, since a gap is silence anyway.
 *
 * Throws on an invalid score, measure number or time signature. `score` is
 * left as it was in every case.
 */
export function changeTimeSignature(score: Score, measureNumber: number, time: [number, number]): Score {
  // validateScore returns a fresh copy, so it doubles as the clone.
  const next = validateScore(score);
  if (!Number.isInteger(measureNumber) || measureNumber < 1 || measureNumber > next.measures.length) {
    throw new RangeError(`El compás ${measureNumber} no existe (la partitura tiene ${next.measures.length})`);
  }
  if (!Array.isArray(time) || time.length !== 2) throw new Error(`Indicación de compás no válida: ${String(time)}`);
  const [numerator, denominator] = time;
  if (
    !Number.isInteger(numerator) || numerator < 1 || numerator > MAX_TIME_NUMERATOR
    || !TIME_DENOMINATORS.includes(denominator)
  ) {
    throw new Error(`Indicación de compás no válida: ${time.join("/")}`);
  }

  const target = measureNumber - 1;
  const boundsOf = () => {
    const bounds = [0];
    for (const measure of next.measures) bounds.push(bounds[bounds.length - 1] + measureTicks(measure));
    return bounds;
  };
  const before = boundsOf();
  next.measures[target].time = [numerator, denominator];
  const after = boundsOf();
  const room = after[target + 1] - after[target];

  for (const voice of next.voices) {
    let index = 0; // events are ordered by start, so the measure only moves forward
    voice.events = voice.events.filter(event => {
      while (event.start >= before[index + 1]) index += 1;
      const offset = event.start - before[index];
      if (index === target && offset + durationTicks(event) > room) {
        if (event.pitches.length === 0) return false;
        throw new Error(
          `El compás ${measureNumber} no puede pasar a ${numerator}/${denominator}: una nota de ${voice.name || voice.id} ya no cabría`,
        );
      }
      event.start = after[index] + offset;
      return true;
    });
  }
  return validateScore(next);
}

/**
 * Re-bars a passage to a new time signature the way notation editors do when the music does not fit:
 * notes keep their place in time, bar lines are redrawn, and anything crossing a new bar line is split
 * into tied pieces (rests are split without ties). Measures `from..to` (one-based, inclusive) become as
 * many measures of `time` as needed to hold their content; later measures and events shift by the
 * difference. Annotations follow their absolute position. Tuplets that would cross a bar line are rejected.
 * Returns the new score and how many events had to be split.
 */
export function rebarTimeSignature(score: Score, from: number, to: number, time: [number, number]): { score: Score; split: number } {
  const next = validateScore(score);
  if (!Number.isInteger(from) || from < 1 || to < from || to > next.measures.length) {
    throw new RangeError(`Compases no válidos: ${from}–${to}`);
  }
  const [numerator, denominator] = time;
  if (!Number.isInteger(numerator) || numerator < 1 || numerator > MAX_TIME_NUMERATOR || !TIME_DENOMINATORS.includes(denominator)) {
    throw new Error(`Indicación de compás no válida: ${time.join("/")}`);
  }
  const bounds = [0];
  for (const measure of next.measures) bounds.push(bounds[bounds.length - 1] + measureTicks(measure));
  const start = bounds[from - 1], oldEnd = bounds[to];
  const size = measureTicks({ id: "", key: "C", time: [numerator, denominator] });
  const count = Math.max(1, Math.ceil((oldEnd - start) / size));
  const delta = count * size - (oldEnd - start);
  const containing = (tick: number) => next.measures[Math.max(from - 1, bounds.findIndex((b, i) => i < next.measures.length && tick >= b && tick < bounds[i + 1]))] ?? next.measures[to - 1];
  const rebarred = Array.from({ length: count }, (_, i) => {
    const old = containing(start + i * size);
    return { ...structuredClone(old), id: i === 0 ? next.measures[from - 1].id : newId(), time: [numerator, denominator] as [number, number],
      ...(i === 0 ? { timeChange: true } : { timeChange: undefined, keyChange: undefined }) };
  });
  rebarred.forEach(m => { if (m.timeChange === undefined) delete m.timeChange; if (m.keyChange === undefined) delete m.keyChange; });

  // Annotations: remember absolute positions before measures change.
  const annotations = (next.annotations ?? []).map(a => ({ a, tick: bounds[a.measure - 1] + Math.round((a.beat - 1) * PPQ) }));
  next.measures.splice(from - 1, to - from + 1, ...rebarred);
  const barlines = new Set(Array.from({ length: count - 1 }, (_, i) => start + (i + 1) * size));
  const newEnd = start + count * size;

  let split = 0;
  for (const voice of next.voices) {
    const events: NoteEvent[] = [];
    for (const event of voice.events) {
      if (event.start >= oldEnd) { events.push({ ...event, start: event.start + delta }); continue; }
      const end = event.start + durationTicks(event);
      const cuts = [...barlines].filter(b => b > event.start && b < end).sort((x, y) => x - y);
      if (!cuts.length || event.start < start) { events.push(event); continue; }
      if (event.triplet) throw new Error(`Un tresillo de ${voice.name || voice.id} quedaría cortado por la nueva barra de compás`);
      split += 1;
      const edges = [event.start, ...cuts, Math.min(end, newEnd)];
      const pieces: NoteEvent[] = [];
      for (let i = 0; i < edges.length - 1; i++) {
        let at = edges[i];
        for (const value of splitTicks(edges[i + 1] - edges[i]) ?? []) {
          pieces.push({ ...event, ...value, id: pieces.length ? newId() : event.id, start: at, tie: event.pitches.length > 0,
            ...(pieces.length ? { ornament: undefined, text: undefined } : {}) });
          at += durationTicks(value);
        }
      }
      pieces.forEach(p => { if (p.ornament === undefined) delete p.ornament; if (p.text === undefined) delete p.text; });
      pieces[pieces.length - 1].tie = event.tie;
      events.push(...pieces);
    }
    voice.events = events.sort((a, b) => a.start - b.start);
  }
  if (next.annotations) {
    const newBounds = [0];
    for (const measure of next.measures) newBounds.push(newBounds[newBounds.length - 1] + measureTicks(measure));
    next.annotations = annotations.map(({ a, tick }) => {
      const moved = tick >= oldEnd ? tick + delta : tick;
      const index = Math.max(0, newBounds.findIndex((b, i) => i < next.measures.length && moved >= b && moved < newBounds[i + 1]));
      return { ...a, measure: index + 1, beat: 1 + (moved - newBounds[index]) / PPQ };
    });
  }
  return { score: validateScore(next), split };
}
