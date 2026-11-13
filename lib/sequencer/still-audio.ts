import { activeVoices, locateTick, measureStart, measureTicks } from "./model";
import { PPQ, type Score } from "./types";
import type { Still } from "./storyboard";

/** The same exclusive reveal boundary used by engraving, in quarter-note ticks. */
export function stillMusic(score: Score, still: Still) {
  const [first, last] = still.measures ?? [1, score.measures.length];
  const from = measureStart(score, first);
  const end = measureStart(score, last) + measureTicks(score.measures[last - 1]);
  const to = still.reveal ? Math.min(end, measureStart(score, still.reveal.measure) + ((still.reveal.beat ?? 1) - 1) * PPQ) : end;
  if (to <= from) throw new Error(`Still "${still.id}": no hay música visible`);
  const visible = still.voices && still.voices !== "all" ? still.voices : activeVoices(score).map(v => v.id);
  const piano: Score = { ...score, voices: score.voices.map(v => ({ ...v, instrument: "Piano", mute: !visible.includes(v.id), solo: false })) };
  const beats = [];
  for (let tick = from; tick < to; tick += PPQ) {
    const position = locateTick(score, tick);
    beats.push({ cursor: { measure: position.measure, beat: position.beat }, time: (tick - from) / PPQ * 60 / score.tempo });
  }
  return { score: piano, from, to, tempo: score.tempo, beats };
}
