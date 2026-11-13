import type { Still } from "./storyboard";
import { STILL_COLORS } from "./storyboard-resolve";
import type { ScoreAnnotation, VoiceId } from "./types";

export type CaptureRow = { voice: VoiceId; top: number; bottom: number; anchors: { tick: number; x: number }[]; left: number; right: number; notes?: { tick: number; top: number; bottom: number }[] };
/** Interpolate actual VexFlow tick contexts, never assumed uniform beats. */
export function captureX(row: CaptureRow, tick: number): number {
  const anchors = [...row.anchors].sort((a, b) => a.tick - b.tick);
  const a = anchors.filter(p => p.tick <= tick).at(-1) ?? anchors[0];
  const b = anchors.find(p => p.tick > tick) ?? a;
  return a.x + (b.x - a.x) * (b.tick === a.tick ? 0 : Math.max(0, Math.min(1, (tick - a.tick) / (b.tick - a.tick))));
}

export function decorateCapture(svg: SVGSVGElement, still: Still, measure: number, rows: CaptureRow[], positionTick: (measure: number, beat?: number) => number, scale = 1, annotations: ScoreAnnotation[] = [], sideLabels = false) {
  const ns = "http://www.w3.org/2000/svg";
  const add = (tag: string, attrs: Record<string, string | number>, text?: string) => {
    const el = document.createElementNS(ns, tag);
    if (tag === "text") el.setAttribute("stroke", "none");
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
    if (text) el.textContent = text;
    svg.appendChild(el);
    return el;
  };
  const px = (n: number) => n / scale;
  const textStyle = { fill: "#182030", "font-family": "var(--font-inter, Arial), sans-serif", "text-anchor": "middle" };
  const reveal = still.reveal ? positionTick(still.reveal.measure, still.reveal.beat) : Infinity;
  for (const a of annotations) if (a.measure === measure) {
    const tick = positionTick(measure, a.beat);
    add("text", { ...textStyle, x: captureX(rows[0], tick) + 5, y: rows.at(-1)!.bottom + px(88),
      "font-family": a.kind === "roman" ? "var(--font-dm-serif, Georgia), Georgia, serif" : textStyle["font-family"],
      "font-size": px(a.kind === "roman" ? 40 : 28), "data-annotation": a.kind,
      opacity: tick >= reveal ? 0 : 1 }, a.text);
  }
  for (const h of still.highlights ?? []) {
    if (measure < h.measure || measure > (h.endMeasure ?? h.measure)) continue;
    const selected = rows.filter(r => !h.voice || r.voice === h.voice);
    if (!selected.length) continue;
    const first = selected[0], last = selected.at(-1)!;
    const from = measure === h.measure && h.beat !== undefined ? positionTick(measure, h.beat) : -Infinity;
    const to = measure === (h.endMeasure ?? h.measure) && h.endBeat !== undefined ? positionTick(measure, h.endBeat) : Infinity;
    // Hug the notes that start inside the range (room for accidentals on the left); fall back to the beat slot.
    const inside = selected.flatMap(r => r.anchors.slice(0, -1).filter(p => p.tick >= from && p.tick < to).map(p => p.x));
    const x = inside.length ? Math.max(first.left, Math.min(...inside) - px(40)) : from === -Infinity ? first.left : captureX(first, from) - px(22);
    const right = inside.length ? Math.max(...inside) + px(64) : to === Infinity ? first.right : captureX(first, to) - px(22);
    const fill = STILL_COLORS[h.color ?? "amber"];
    // Voice highlights include the ink of only that voice and only events in this beat range.
    const ink = h.voice ? selected.flatMap(r => (r.notes ?? []).filter(n => n.tick >= from && n.tick < Math.min(to, reveal))) : [];
    const y = Math.min(first.top - px(30), ...ink.map(n => n.top - px(8)));
    const bottom = Math.max(last.bottom + px(30), ...ink.map(n => n.bottom + px(8)));
    const shape = { x, y, width: Math.max(px(8), right - x), height: bottom - y, rx: px(16) };
    if (h.voice) {
      // Put translucent fills behind the engraving, and every border above all fills.
      // Neighboring voices can share ledger-note space without losing either outline.
      const background = add("rect", { ...shape, fill, "fill-opacity": .18, stroke: "none" });
      svg.insertBefore(background, svg.firstChild);
      add("rect", { ...shape, fill: "none", stroke: fill, "stroke-width": px(3), "data-highlight": "true", "data-highlight-voice": h.voice });
    } else {
      add("rect", { ...shape, fill, "fill-opacity": .18, stroke: fill, "stroke-width": px(3), "data-highlight": "true" });
    }
    if (h.label && measure === h.measure) {
      // Single-measure systems have a free side gutter; keep voice labels clear of neighboring ledger notes.
      const beside = sideLabels && !!h.voice;
      const center = beside ? first.right + px(24) : (x + right) / 2;
      const labelY = beside ? (y + bottom) / 2 : y - px(25);
      const label = add("text", { ...textStyle, x: center, y: labelY, "text-anchor": beside ? "start" : "middle", fill: "#0b0f1d", "font-size": px(24), "font-weight": 600, "dominant-baseline": "central", "data-highlight-label": "true" }, h.label) as SVGTextElement;
      const labelWidth = label.getComputedTextLength() + px(32);
      const pill = add("rect", { x: beside ? center - px(16) : center - labelWidth / 2, y: labelY - px(20), width: labelWidth, height: px(40), rx: px(20), fill, stroke: "none" });
      svg.insertBefore(pill, label);
    }
  }
  for (const mark of still.marks ?? []) if (mark.measure === measure && mark.label) {
    const row = rows.find(r => !mark.voice || r.voice === mark.voice)!;
    const tick = positionTick(measure, mark.beat);
    const vocal = rows.some(r => r.voice !== "melody");
    add("text", { ...textStyle, x: captureX(row, tick) + (vocal ? px(44) : 5), y: vocal ? row.bottom + px(30) : row.top - px(40),
      "text-anchor": vocal ? "start" : "middle", "data-mark-label": "true", "font-size": px(22), "font-weight": 600, opacity: tick >= reveal ? 0 : 1 }, mark.label);
  }
  if (still.cursor?.measure === measure) {
    const x = captureX(rows[0], positionTick(measure, still.cursor.beat));
    add("line", { x1: x, x2: x, y1: rows[0].top - px(30), y2: rows.at(-1)!.bottom + px(30), stroke: "#3ee39a", "stroke-width": px(4), style: `filter:drop-shadow(0 0 ${px(5)}px #3ee39a88)`, "data-testid": "still-cursor" });
  }
  svg.setAttribute("data-capture-ready", "1");
}
