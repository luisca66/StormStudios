import { activeVoices, measureStart, measureTicks } from "./model";
import type { Score } from "./types";
import type { Still } from "./storyboard";

export type CaptureLayout = { widths: Record<number, number>; scale: number; height: number; rowHeight: number; staveY: number; from: number; to: number };

/** Only score/range/voices affect engraving. Reveal and overlays never affect layout. */
export function captureLayout(score: Score, still: Still, width: number, height: number): CaptureLayout {
  const from = still.measures?.[0] ?? 1, to = still.measures?.[1] ?? score.measures.length;
  const voices = activeVoices(score).filter(v => !still.voices || still.voices === "all" || still.voices.includes(v.id));
  const rowHeight = 96, staveY = 24, naturalHeight = (voices.length - 1) * rowHeight + 180;
  const bars = score.measures.slice(from - 1, to).map((meta, i) => {
    const m = from + i, start = measureStart(score, m), end = start + measureTicks(meta);
    const ticks = new Set(voices.flatMap(v => v.events.filter(e => e.start >= start && e.start < end).map(e => e.start)));
    const previous = score.measures[m - 2];
    const signature = i === 0 ? (score.mode === "satb" ? 225 : 85) :
      (previous.key !== meta.key ? 65 : 0) + (previous.time.join() !== meta.time.join() ? 35 : 0);
    return { m, weight: Math.max(1, ticks.size), signature, minimum: Math.max(score.mode === "satb" ? 180 : 80, ticks.size * 34) + signature };
  });
  const scale = Math.min(2.4, height / naturalHeight, width / bars.reduce((sum, b) => sum + b.minimum, 0));
  const minimum = bars.reduce((sum, b) => sum + b.minimum, 0);
  // Short vocal examples keep a compact system; scaling remains limited by the paper height.
  const engravingWidth = score.mode === "satb" && bars.length <= 3 ? Math.min(width / scale, minimum + bars.length * 70) : width / scale;
  const extra = engravingWidth - minimum;
  const weight = bars.reduce((sum, b) => sum + b.weight, 0);
  return { widths: Object.fromEntries(bars.map(b => [b.m, b.minimum + extra * b.weight / weight])), scale, height: naturalHeight, rowHeight, staveY, from, to };
}
