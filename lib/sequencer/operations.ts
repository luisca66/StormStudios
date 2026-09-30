/**
 * Score edits that touch more than one event. Pure, like model.ts: every
 * operation returns a new validated score and never mutates its argument.
 */
import { durationTicks, measureTicks, validateScore } from "./model";
import type { Score } from "./types";

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
