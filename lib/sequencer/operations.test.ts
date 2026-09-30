import { describe, expect, it } from "vitest";
import { createScore, measureStart, newId, scoreTicks, validateScore } from "./model";
import { changeTimeSignature } from "./operations";
import type { Duration, NoteEvent, Score, VoiceId } from "./types";

const note = (start: number, pitches: string[], duration: Duration = "q", extra: Partial<NoteEvent> = {}): NoteEvent => ({
  id: newId(), start, duration, dotted: false, triplet: false, pitches, tie: false, ...extra,
});
const voiceOf = (score: Score, id: VoiceId) => score.voices.find(voice => voice.id === id)!;
const snapshot = (score: Score) => JSON.stringify(score);

/** Every event as (measure, offset inside it) plus everything that must survive an edit. */
function placed(score: Score, id: VoiceId) {
  return voiceOf(score, id).events.map(event => {
    let measure = 1;
    while (measure < score.measures.length && measureStart(score, measure + 1) <= event.start) measure += 1;
    const { start, ...music } = event;
    return { ...music, measure, offset: start - measureStart(score, measure) };
  });
}

/** Four 4/4 measures; SATB with music in every measure, a triplet and a tie over a bar line. */
function chorale(): Score {
  const score = createScore("satb");
  score.measures[2].key = "G";
  score.scenes = [
    { id: "intro", title: "Intro", caption: "", startMeasure: 1, endMeasure: 2, aspect: "16:9", highlightVoice: "all" },
    { id: "final", title: "Final", caption: "", startMeasure: 3, endMeasure: 4, aspect: "9:16", highlightVoice: "bass" },
  ];
  voiceOf(score, "soprano").events = [
    note(0, ["C5"], "w"),
    note(3840, ["D5"]), note(4800, ["E5"]), note(5760, ["F5"], "q", { tie: true }),
    note(7680, ["F5"], "h"), note(9600, ["A4", "C5", "E5"], "h"),
    note(11520, ["G5"], "8", { triplet: true }), note(11840, ["F5"], "8", { triplet: true }), note(12160, ["E5"], "8", { triplet: true }),
    note(12480, ["Bbb4"], "h", { dotted: true }),
  ];
  voiceOf(score, "alto").events = [note(3840, ["G4"], "h"), note(8640, ["F#4"], "q", { dotted: true })];
  voiceOf(score, "tenor").events = [note(4800, [], "q"), note(5760, ["B3"]), note(11520, ["C4"], "w")];
  voiceOf(score, "bass").events = [
    note(0, ["C3"], "w"), note(3840, ["G2"], "h", { dotted: true }),
    note(7680, ["C3"], "w", { tie: true }), note(11520, ["C3"], "w"),
  ];
  return validateScore(score);
}

describe("changeTimeSignature", () => {
  it("grows a measure and keeps every event in its measure at its local offset", () => {
    const score = chorale();
    const before = snapshot(score);
    const result = changeTimeSignature(score, 2, [6, 4]);

    expect(snapshot(score)).toBe(before);
    expect(result.measures.map(measure => measure.time)).toEqual([[4, 4], [6, 4], [4, 4], [4, 4]]);
    expect(result.measures.map(measure => [measure.id, measure.key])).toEqual(score.measures.map(measure => [measure.id, measure.key]));
    expect(scoreTicks(result)).toBe(scoreTicks(score) + 1920);
    // Same ids, values, pitches and ties, in the same measure and offset, for every voice.
    for (const id of ["soprano", "alto", "tenor", "bass"] as const) expect(placed(result, id), id).toEqual(placed(score, id));
    // Measures 1 and 2 did not move; measures 3 and 4 start two quarters later.
    expect(voiceOf(result, "soprano").events.map(event => event.start)).toEqual([
      0, 3840, 4800, 5760, 9600, 11520, 13440, 13760, 14080, 14400,
    ]);
    // The bass C3 tied over the last bar line is still contiguous with its continuation.
    expect(voiceOf(result, "bass").events.map(event => [event.start, event.tie])).toEqual([
      [0, false], [3840, false], [9600, true], [13440, false],
    ]);
    expect(result.scenes).toEqual(score.scenes);
    expect(result).toEqual(validateScore(result));
  });

  it("shrinks a measure whose music still fits and pulls the later measures back", () => {
    const score = chorale();
    const result = changeTimeSignature(score, 2, [3, 4]);
    expect(result.measures[1].time).toEqual([3, 4]);
    for (const id of ["soprano", "alto", "tenor", "bass"] as const) expect(placed(result, id), id).toEqual(placed(score, id));
    // Measure 2 lost its empty last beat, so the soprano F5 now ends exactly where measure 3 begins.
    const [, , , last, next] = voiceOf(result, "soprano").events;
    expect([last.start, last.tie, next.start, next.pitches]).toEqual([5760, true, 6720, ["F5"]]);
    expect(voiceOf(result, "bass").events.map(event => event.start)).toEqual([0, 3840, 6720, 10560]);
    expect(result.scenes).toEqual(score.scenes);
  });

  it("changes only the requested measure, also the first and the last", () => {
    const score = chorale();
    const first = changeTimeSignature(score, 1, [5, 4]);
    expect(first.measures.map(measure => measure.time.join("/"))).toEqual(["5/4", "4/4", "4/4", "4/4"]);
    for (const id of ["soprano", "alto", "tenor", "bass"] as const) expect(placed(first, id), id).toEqual(placed(score, id));
    expect(voiceOf(first, "alto").events.map(event => event.start)).toEqual([4800, 9600]);

    const last = changeTimeSignature(score, 4, [9, 8]);
    expect(last.measures.map(measure => measure.time.join("/"))).toEqual(["4/4", "4/4", "4/4", "9/8"]);
    expect(last.voices).toEqual(score.voices);
    expect(scoreTicks(last)).toBe(scoreTicks(score) + 480);
  });

  it("moves nothing when the new signature has the same length", () => {
    const score = chorale();
    const result = changeTimeSignature(score, 3, [8, 8]);
    expect(result.measures[2].time).toEqual([8, 8]);
    expect(result.voices).toEqual(score.voices);
    const same = changeTimeSignature(score, 3, [4, 4]);
    expect(same).toEqual(score);
    expect(same).not.toBe(score);
    expect(same.voices[1].events[0]).not.toBe(score.voices[1].events[0]);
  });

  it("rejects shrinking a measure whose notes no longer fit, without touching the score", () => {
    const score = chorale();
    const before = snapshot(score);
    // Measure 1 holds whole notes; in measure 2 the soprano sounds through the third beat.
    expect(() => changeTimeSignature(score, 1, [3, 4])).toThrow(/compás 1 no puede pasar a 3\/4.*Soprano/);
    expect(() => changeTimeSignature(score, 2, [2, 4])).toThrow(/compás 2 no puede pasar a 2\/4/);
    // A note that starts inside the new measure but ends past its bar line does not fit either.
    expect(() => changeTimeSignature(score, 3, [7, 8])).toThrow(/ya no cabría/);
    expect(snapshot(score)).toBe(before);
  });

  it("also protects notes in voices outside the score's mode", () => {
    const score = createScore("single");
    voiceOf(score, "melody").events = [note(0, ["C4"]), note(3840, ["D4"])];
    voiceOf(score, "bass").events = [note(1920, ["C2"], "h"), note(3840, ["D2"], "w")];
    expect(() => changeTimeSignature(score, 1, [3, 4])).toThrow(/Bajo/);
    const grown = changeTimeSignature(score, 1, [5, 4]);
    expect(voiceOf(grown, "melody").events.map(event => event.start)).toEqual([0, 4800]);
    expect(voiceOf(grown, "bass").events.map(event => event.start)).toEqual([1920, 4800]);
  });

  it("drops rests that no longer fit but keeps the notes", () => {
    const score = createScore();
    const events = [note(0, ["C4"], "h"), note(1920, [], "q"), note(2880, [], "q"), note(3840, ["D4"], "w")];
    voiceOf(score, "melody").events = events;
    const result = changeTimeSignature(score, 1, [5, 8]);
    // 5/8 = 2400 ticks: the half note fits, the first rest crosses the new bar line, the second starts past it.
    expect(voiceOf(result, "melody").events).toEqual([events[0], { ...events[3], start: 2400 }]);
    expect(voiceOf(score, "melody").events).toHaveLength(4);
    // A rest that still fits stays.
    expect(voiceOf(changeTimeSignature(score, 1, [3, 4]), "melody").events.map(event => event.id))
      .toEqual([events[0].id, events[1].id, events[3].id]);
  });

  it("rejects measure numbers and time signatures that do not exist", () => {
    const score = chorale();
    const before = snapshot(score);
    for (const measure of [0, 5, -1, 1.5, Number.NaN]) {
      expect(() => changeTimeSignature(score, measure, [3, 4]), String(measure)).toThrow(/no existe/);
    }
    for (const time of [[0, 4], [33, 4], [4, 3], [4, 64], [2.5, 4], [4, 0], [Number.NaN, 4]] as [number, number][]) {
      expect(() => changeTimeSignature(score, 4, time), time.join("/")).toThrow(/Indicación de compás no válida/);
    }
    expect(() => changeTimeSignature(score, 4, [4] as unknown as [number, number])).toThrow(/Indicación de compás no válida/);
    expect(() => changeTimeSignature(score, 4, "3/4" as unknown as [number, number])).toThrow(/Indicación de compás no válida/);
    expect(snapshot(score)).toBe(before);
  });

  it("rejects an invalid score instead of repairing it", () => {
    const broken = createScore();
    voiceOf(broken, "melody").events = [note(2880, ["C4"], "h")]; // crosses the bar line
    const before = snapshot(broken);
    expect(() => changeTimeSignature(broken, 1, [6, 4])).toThrow(/cruza la barra/);
    expect(snapshot(broken)).toBe(before);
  });

  it("can be applied measure by measure and undone", () => {
    const score = chorale();
    let waltz = score;
    // Only measure 3 (F5 half + chord half) cannot drop to 3/4.
    expect(() => changeTimeSignature(waltz, 3, [3, 4])).toThrow(/ya no cabría/);
    waltz = changeTimeSignature(waltz, 2, [3, 4]);
    waltz = changeTimeSignature(waltz, 3, [6, 4]);
    expect(waltz.measures.map(measure => measure.time.join("/"))).toEqual(["4/4", "3/4", "6/4", "4/4"]);
    for (const id of ["soprano", "alto", "tenor", "bass"] as const) expect(placed(waltz, id), id).toEqual(placed(score, id));
    expect(changeTimeSignature(changeTimeSignature(waltz, 3, [4, 4]), 2, [4, 4])).toEqual(score);
  });
});
