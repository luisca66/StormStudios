import { describe, expect, it } from "vitest";
import {
  activeVoices, createScore, durationTicks, importScore, keySignature, locateTick, measureStart,
  measureTicks, midiToPitch, newId, normalizePitch, parsePitchList, parseScoreText, pitchToMidi,
  pitchToVex, scoreTicks, splitTicks, transposePitches, validateScore, clefAt,
} from "./model";
import { PPQ, VOICE_IDS, type Duration, type NoteEvent, type Score } from "./types";

const note = (start: number, pitches: string[], duration: Duration = "q", extra: Partial<NoteEvent> = {}): NoteEvent => ({
  id: newId(), start, duration, dotted: false, triplet: false, pitches, tie: false, ...extra,
});
const voiceOf = (score: Score, id: string) => score.voices.find(voice => voice.id === id)!;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

describe("legacy notation parity",()=>{
  it("inherits clef changes independently per voice and preserves optional metadata in JSON",()=>{
    const score=createScore("satb");
    score.measures[1].clefs={soprano:"bass"};score.measures[3].clefs={soprano:"treble",tenor:"treble"};
    score.voices[1].events=[note(0,["C4"],"q",{ornament:true,text:"sí & do"})];
    const roundtrip=importScore(JSON.stringify(validateScore(score)));
    expect([1,2,3,4].map(m=>clefAt(roundtrip,"soprano",m))).toEqual(["treble","bass","bass","treble"]);
    expect(clefAt(roundtrip,"tenor",3)).toBe("bass");expect(clefAt(roundtrip,"tenor",4)).toBe("treble");
    expect(roundtrip.voices[1].events[0]).toMatchObject({ornament:true,text:"sí & do"});
    expect(()=>clefAt(roundtrip,"soprano",0)).toThrow(/Compás/);
  });
  it("rejects unknown voice clefs and malformed optional note metadata",()=>{
    const score=createScore();score.voices[0].events=[note(0,["C4"])];
    expect(()=>validateScore({...score,measures:[{...score.measures[0],clefs:{unknown:"bass"}},...score.measures.slice(1)]})).toThrow(/desconocido/);
    score.voices[0].events[0].ornament="yes" as unknown as boolean;
    expect(()=>validateScore(score)).toThrow(/verdadero/);
    delete score.voices[0].events[0].ornament;score.voices[0].events[0].text="a".repeat(1001);
    expect(()=>validateScore(score)).toThrow(/1000/);
  });
  it("imports internal legacy clefs, red-note ornaments and note text without losing data",()=>{
    const score=importScore(JSON.stringify({projectData:{mode:"single",instrument:"Piano",tracks:{melody:[[12,{keys:["c/4"],duration:"w",isTied:false,isOrnament:true,text:"la"}]],soprano:[],alto:[],tenor:[],bass:[]}},
      measureSettings:{0:{time:"4/4",key:"C",clef:"treble"},1:{time:"4/4",key:"C",clef:"bass"}},totalMeasures:3,cipherData:{}}));
    expect([1,2,3].map(m=>clefAt(score,"melody",m))).toEqual(["treble","bass","bass"]);
    const events=score.voices[0].events;expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ornament:true,text:"la",tie:true});
    expect(events[1]).toMatchObject({ornament:true,tie:false});expect(events[1].text).toBeUndefined();
    expect(score.measures.map(m=>[m.keyChange,m.timeChange])).toEqual([[true,true],[true,true],[undefined,undefined]]);
    expect(importScore(JSON.stringify(score)).measures[1]).toMatchObject({keyChange:true,timeChange:true});
  });
});

describe("createScore and timing", () => {
  it("creates four 4/4 measures in C with the five voices empty and one scene", () => {
    const score = createScore();
    expect(score.version).toBe(1);
    expect(score.mode).toBe("single");
    expect(score.measures.map(m => [m.time, m.key])).toEqual(Array(4).fill([[4, 4], "C"]));
    expect(score.voices.map(v => v.id)).toEqual([...VOICE_IDS]);
    expect(score.voices.every(v => v.events.length === 0)).toBe(true);
    expect(score.voices.map(v => v.clef)).toEqual(["treble", "treble", "treble", "bass", "bass"]);
    expect(score.scenes).toHaveLength(1);
    expect(score.scenes[0]).toMatchObject({ startMeasure: 1, endMeasure: 4, highlightVoice: "all" });
    expect(validateScore(score)).toEqual(score);
    expect(createScore("satb").mode).toBe("satb");
  });

  it("gives unique ids", () => {
    const ids = new Set(Array.from({ length: 500 }, newId));
    expect(ids.size).toBe(500);
  });

  it("selects the voices of the mode", () => {
    expect(activeVoices(createScore("single")).map(v => v.id)).toEqual(["melody"]);
    expect(activeVoices(createScore("satb")).map(v => v.id)).toEqual(["soprano", "alto", "tenor", "bass"]);
  });

  it("computes integer ticks for every value, dotted and triplet", () => {
    expect(PPQ).toBe(960);
    expect(durationTicks({ duration: "q", dotted: false, triplet: false })).toBe(960);
    expect(durationTicks({ duration: "w", dotted: true, triplet: false })).toBe(5760);
    expect(durationTicks({ duration: "8", dotted: false, triplet: true })).toBe(320);
    expect(durationTicks({ duration: "32", dotted: false, triplet: true })).toBe(80);
    expect(durationTicks({ duration: "32", dotted: true, triplet: false })).toBe(180);
    expect(durationTicks({ duration: "q", dotted: true, triplet: true })).toBe(960);
    for (const duration of ["w", "h", "q", "8", "16", "32"] as const) {
      for (const dotted of [false, true]) {
        for (const triplet of [false, true]) {
          expect(Number.isInteger(durationTicks({ duration, dotted, triplet }))).toBe(true);
        }
      }
      // Three triplets fill exactly two plain values.
      expect(3 * durationTicks({ duration, dotted: false, triplet: true }))
        .toBe(2 * durationTicks({ duration, dotted: false, triplet: false }));
    }
    expect(() => durationTicks({ duration: "64" as Duration, dotted: false, triplet: false })).toThrow();
  });

  it("measures mixed time signatures", () => {
    const score = createScore();
    score.measures[1].time = [3, 4];
    score.measures[2].time = [6, 8];
    expect(score.measures.map(measureTicks)).toEqual([3840, 2880, 2880, 3840]);
    expect([1, 2, 3, 4].map(n => measureStart(score, n))).toEqual([0, 3840, 6720, 9600]);
    expect(scoreTicks(score)).toBe(13440);
    expect(() => measureStart(score, 0)).toThrow(RangeError);
    expect(() => measureStart(score, 5)).toThrow(RangeError);
    expect(() => measureStart(score, 1.5)).toThrow(RangeError);
  });

  it("locates ticks as measure and quarter-note beat", () => {
    const score = createScore();
    score.measures[1].time = [3, 4];
    expect(locateTick(score, 0)).toEqual({ measure: 1, beat: 1 });
    expect(locateTick(score, 3839)).toEqual({ measure: 1, beat: 1 + 3839 / 960 });
    expect(locateTick(score, 3840)).toEqual({ measure: 2, beat: 1 });
    expect(locateTick(score, 3840 + 1440)).toEqual({ measure: 2, beat: 2.5 });
    expect(locateTick(score, 6720 + 320)).toEqual({ measure: 3, beat: 1 + 1 / 3 });
    expect(locateTick(score, scoreTicks(score))).toEqual({ measure: 4, beat: 5 });
    expect(() => locateTick(score, -1)).toThrow(RangeError);
  });

  it("splits lengths into plain values", () => {
    const ticks = (length: number) => splitTicks(length)!.map(durationTicks);
    expect(ticks(3840)).toEqual([3840]);
    expect(ticks(1440)).toEqual([1440]);
    expect(ticks(480 + 120)).toEqual([480, 120]);
    expect(ticks(420 - 60)).toEqual([360]);
    for (let length = 120; length <= 5760; length += 120) {
      expect(ticks(length).reduce((a, b) => a + b, 0)).toBe(length);
    }
    expect(splitTicks(320)).toBeNull();
    expect(splitTicks(0)).toBeNull();
  });
});

describe("pitch spelling", () => {
  it("reads scientific spelling with octave crossings and double accidentals", () => {
    expect(pitchToMidi("C4")).toBe(60);
    expect(pitchToMidi("A4")).toBe(69);
    expect(pitchToMidi("C#4")).toBe(61);
    expect(pitchToMidi("Bbb3")).toBe(57);
    expect(pitchToMidi("Cb4")).toBe(59);
    expect(pitchToMidi("B#3")).toBe(60);
    expect(pitchToMidi("Cbb4")).toBe(58);
    expect(pitchToMidi("B##4")).toBe(73);
    expect(pitchToMidi("F##2")).toBe(43);
    expect(pitchToMidi("C-1")).toBe(0);
    expect(pitchToMidi("G9")).toBe(127);
    expect(pitchToMidi("b3")).toBe(59);
    expect(pitchToMidi("bb3")).toBe(58);
  });

  it("reads unicode accidentals and solfege", () => {
    expect(pitchToMidi("C♯4")).toBe(61);
    expect(pitchToMidi("B♭3")).toBe(58);
    expect(pitchToMidi("F𝄪4")).toBe(67);
    expect(pitchToMidi("B𝄫3")).toBe(57);
    expect(pitchToMidi("Cx4")).toBe(62);
    expect(pitchToMidi("D♮4")).toBe(62);
    expect(["Do4", "Re4", "Mi4", "Fa4", "Sol4", "La4", "Si4"].map(pitchToMidi)).toEqual([60, 62, 64, 65, 67, 69, 71]);
    expect(pitchToMidi("Do#4")).toBe(61);
    expect(pitchToMidi("Sib3")).toBe(58);
    expect(pitchToMidi("solb3")).toBe(54);
    expect(pitchToMidi("Dob4")).toBe(59);
    expect(pitchToMidi("Db4")).toBe(61);
    expect(pitchToMidi("Fab4")).toBe(64);
    expect(normalizePitch("Sib3")).toBe("Bb3");
    expect(normalizePitch("do♯4")).toBe("C#4");
    expect(normalizePitch("F𝄪4")).toBe("F##4");
  });

  it("rejects invalid spellings and pitches outside MIDI 0..127", () => {
    for (const bad of ["", "H4", "C", "4", "C###4", "C#b4", "Cb-1", "G#9", "C10", "C 4", "Dox", "C4.5"]) {
      expect(() => pitchToMidi(bad), bad).toThrow();
    }
    expect(() => pitchToMidi(60 as unknown as string)).toThrow();
  });

  it("names MIDI numbers with sharps", () => {
    expect(midiToPitch(60)).toBe("C4");
    expect(midiToPitch(61)).toBe("C#4");
    expect(midiToPitch(70)).toBe("A#4");
    expect(midiToPitch(0)).toBe("C-1");
    expect(midiToPitch(127)).toBe("G9");
    for (let midi = 0; midi <= 127; midi++) expect(pitchToMidi(midiToPitch(midi))).toBe(midi);
    for (const bad of [-1, 128, 60.5, NaN]) expect(() => midiToPitch(bad)).toThrow(RangeError);
  });

  it("converts to VexFlow keys preserving the spelling", () => {
    expect(pitchToVex("C#4")).toBe("c#/4");
    expect(pitchToVex("Bbb3")).toBe("bbb/3");
    expect(pitchToVex("Cb4")).toBe("cb/4");
    expect(pitchToVex("Sol♯5")).toBe("g#/5");
    expect(pitchToVex("C-1")).toBe("c/-1");
  });

  it("parses pitch lists", () => {
    expect(parsePitchList("C4 E4 G4")).toEqual(["C4", "E4", "G4"]);
    expect(parsePitchList("G4, c4,E4")).toEqual(["C4", "E4", "G4"]);
    expect(parsePitchList("[Do4 Mi4 Sol4]")).toEqual(["C4", "E4", "G4"]);
    expect(parsePitchList("Bb3")).toEqual(["Bb3"]);
    for (const rest of ["[]", "[ ]", "rest", "Silencio", "", "  "]) expect(parsePitchList(rest)).toEqual([]);
    expect(() => parsePitchList("C4 X4")).toThrow();
    expect(() => parsePitchList("C4 C4")).toThrow(/repite/);
    expect(() => parsePitchList("[C4 E4")).toThrow();
  });

  it("transposes: octaves keep the spelling, other shifts use sharps", () => {
    expect(transposePitches(["Bbb3", "Cb4", "E#4"], 12)).toEqual(["Bbb4", "Cb5", "E#5"]);
    expect(transposePitches(["Bbb3"], -24)).toEqual(["Bbb1"]);
    expect(transposePitches(["Db4"], 0)).toEqual(["Db4"]);
    expect(transposePitches(["C4", "Eb4", "B4"], 1)).toEqual(["C#4", "E4", "C5"]);
    expect(transposePitches(["C4"], -1)).toEqual(["B3"]);
    expect(transposePitches(["Cb4"], 2)).toEqual(["C#4"]);
    expect(transposePitches([], 5)).toEqual([]);
    expect(() => transposePitches(["G9"], 1)).toThrow(RangeError);
    expect(() => transposePitches(["C-1"], -12)).toThrow(RangeError);
    expect(() => transposePitches(["C4"], 1.5)).toThrow();
  });

  it("reads key signatures", () => {
    expect(keySignature("C")).toEqual({ fifths: 0, minor: false });
    expect(keySignature("F#")).toEqual({ fifths: 6, minor: false });
    expect(keySignature("Cb")).toEqual({ fifths: -7, minor: false });
    expect(keySignature("Am")).toEqual({ fifths: 0, minor: true });
    expect(keySignature("Ebm")).toEqual({ fifths: -6, minor: true });
    for (const bad of ["H", "G#", "Fb", "c", "C major", ""]) expect(() => keySignature(bad), bad).toThrow();
  });
});

describe("validateScore", () => {
  const filled = () => {
    const score = createScore();
    score.voices[0].events = [note(960, ["E4", "c4", "G4"]), note(0, ["Do#4"], "q")];
    return score;
  };

  it("returns a normalized copy", () => {
    const score = filled();
    const valid = validateScore(score);
    expect(valid).not.toBe(score);
    expect(valid.voices[0].events.map(e => e.start)).toEqual([0, 960]);
    expect(valid.voices[0].events.map(e => e.pitches)).toEqual([["C#4"], ["C4", "E4", "G4"]]);
    expect(score.voices[0].events[0].pitches).toEqual(["E4", "c4", "G4"]); // input untouched
    expect(validateScore(clone(valid))).toEqual(valid);
  });

  const rejects = (mutate: (score: Score) => unknown, pattern?: RegExp) => {
    const score = filled();
    const replaced = mutate(score);
    const candidate = replaced === undefined ? score : replaced;
    if (pattern) expect(() => validateScore(candidate)).toThrow(pattern);
    else expect(() => validateScore(candidate)).toThrow();
  };

  it("rejects non-scores, unsupported versions and unknown or missing fields", () => {
    for (const bad of [null, undefined, 3, "x", [], {}]) expect(() => validateScore(bad)).toThrow();
    rejects(s => ({ ...s, version: 2 }), /versión no soportada/);
    rejects(s => ({ ...s, version: "1" }), /versión no soportada/);
    rejects(s => ({ ...s, extra: true }), /desconocido/);
    rejects(s => { delete (s as Partial<Score>).title; }, /falta "title"/);
    rejects(s => { (s.voices[0].events[0] as Record<string, unknown>).velocity = 3; }, /desconocido/);
    rejects(s => { delete (s.measures[0] as Partial<Score["measures"][number]>).key; }, /falta "key"/);
  });

  it("rejects out-of-range values", () => {
    rejects(s => { s.tempo = 0; });
    rejects(s => { s.tempo = NaN; });
    rejects(s => { s.masterVolume = 1.2; });
    rejects(s => { (s as { mode: string }).mode = "trio"; });
    rejects(s => { s.measures[0].time = [4, 3]; }, /denominador/);
    rejects(s => { s.measures[0].time = [0, 4]; });
    rejects(s => { s.measures[0].key = "H"; }, /tonalidad/);
    rejects(s => { s.voices[1].volume = -0.1; });
    rejects(s => { (s.voices[1] as { instrument: string }).instrument = "Banjo"; });
    rejects(s => { (s.voices[1] as { clef: string }).clef = "alto"; });
    rejects(s => { s.scenes[0].endMeasure = 5; });
    rejects(s => { s.scenes[0].startMeasure = 3; s.scenes[0].endMeasure = 2; });
    rejects(s => { (s.scenes[0] as { aspect: string }).aspect = "4:3"; });
  });

  it("enforces the size bounds", () => {
    rejects(s => { s.measures = []; });
    rejects(s => { s.measures = Array.from({ length: 129 }, () => ({ id: newId(), time: [4, 4], key: "C" })); });
    rejects(s => { s.scenes = Array.from({ length: 33 }, () => ({ ...s.scenes[0], id: newId() })); });
    rejects(s => { s.voices.pop(); });
    rejects(s => { s.voices[1] = { ...s.voices[0], events: [] }; }, /voz repetida/);

    const big = createScore("satb");
    big.measures = Array.from({ length: 128 }, () => ({ id: newId(), time: [4, 4], key: "C" }));
    const fill = (count: number) => Array.from({ length: count }, (_, index) => note(index * 120, ["C4"], "32"));
    big.voices[1].events = fill(4096);
    expect(validateScore(big).voices[1].events).toHaveLength(4096);
    big.voices[2].events = fill(1);
    expect(() => validateScore(big)).toThrow(/4096/);
  });

  it("requires unique ids per kind", () => {
    rejects(s => { s.measures[1].id = s.measures[0].id; }, /id repetido/);
    rejects(s => { s.scenes.push({ ...s.scenes[0] }); }, /id repetido/);
    rejects(s => { s.voices[1].events = [{ ...note(0, ["C4"]), id: s.voices[0].events[0].id }]; }, /id repetido/);
    rejects(s => { s.voices[0].events[0].id = ""; });
  });

  it("checks events: value, position, bar crossing, overlap and pitches", () => {
    rejects(s => { (s.voices[0].events[0] as { duration: string }).duration = "64"; });
    rejects(s => { s.voices[0].events[0].start = 0.5; }, /entero/);
    rejects(s => { s.voices[0].events[0].start = -1; });
    rejects(s => { s.voices[0].events[0].start = scoreTicks(s); });
    rejects(s => { s.voices[0].events = [note(3 * 3840 + 1920, ["C4"], "w")]; }, /final de la partitura/);
    rejects(s => { s.voices[0].events = [note(2880, ["C4"], "h")]; }, /cruza la barra del compás 1/);
    rejects(s => { s.voices[0].events = [note(0, ["C4"], "h"), note(960, ["D4"])]; }, /traslapa/);
    rejects(s => { s.voices[0].events = [note(0, ["C4"], "8", { triplet: true }), note(319, ["D4"])]; }, /traslapa/);
    rejects(s => { s.voices[0].events = [note(0, ["H4"])]; }, /Nota no válida/);
    rejects(s => { s.voices[0].events = [note(0, ["C4", "C4"])]; }, /repite/);
    rejects(s => { s.voices[0].events = [note(0, ["G#9"])]; }, /rango MIDI/);
    rejects(s => { (s.voices[0].events[0] as { pitches: unknown }).pitches = "C4"; });
    rejects(s => { (s.voices[0].events[0] as { tie: unknown }).tie = 1; });
  });

  it("accepts contiguous triplets, tied events across a bar and other voices at the same time", () => {
    const score = createScore("satb");
    voiceOf(score, "soprano").events = [
      note(0, ["C5"], "8", { triplet: true }), note(320, ["D5"], "8", { triplet: true }), note(640, [], "8", { triplet: true }),
      note(2880, ["E5"], "q", { tie: true }), note(3840, ["E5"], "h"),
    ];
    voiceOf(score, "alto").events = [note(0, ["E4", "G4"], "w")];
    expect(() => validateScore(score)).not.toThrow();
  });
});

describe("importScore", () => {
  it("loads a version-1 file and rejects malformed input", () => {
    const score = createScore("satb");
    voiceOf(score, "bass").events = [note(0, ["C3"], "w")];
    expect(importScore(JSON.stringify(score))).toEqual(score);
    expect(() => importScore("{not json")).toThrow(/JSON/);
    expect(() => importScore("")).toThrow(/JSON/);
    expect(() => importScore("[1,2]")).toThrow();
    expect(() => importScore("null")).toThrow();
    expect(() => importScore(JSON.stringify({ ...score, version: 2 }))).toThrow(/versión no soportada/);
    expect(() => importScore(JSON.stringify({ hello: "world" }))).toThrow();
    expect(() => importScore(12 as unknown as string)).toThrow();
  });

  const legacy = (overrides: Record<string, unknown> = {}, tracks: Record<string, unknown> = {}) => JSON.stringify({
    projectData: {
      mode: "quartet", instrument: "Cello",
      tracks: { melody: [], soprano: [], alto: [], tenor: [], bass: [], ...tracks },
    },
    measureSettings: { 0: { time: "4/4", key: "C", clef: "treble" } },
    totalMeasures: 3,
    cipherData: { 0: { 0: "I" } },
    ...overrides,
  });
  const old = (keys: string[], duration: string, isTied = false) =>
    ({ keys, duration, type: "note", clef: "treble", isTied, isOrnament: false });

  it("migrates a legacy serializeState project", () => {
    const score = importScore(legacy(
      { measureSettings: { 0: { time: "4/4", key: "G", clef: "treble" }, 2: { time: "3/4", key: "Eb", clef: "bass" } } },
      {
        soprano: [
          [4, old(["cn/5", "a##/4"], "d.")],
          [0, old(["c#/5"], "q")],
          [7, old(["bb/4"], "s")],
          [8, old(["cb/5"], "h.", true)],
        ],
        bass: [[0, old(["c/3"], "w.")], [32, old(["d/3"], "8.")]],
      },
    ));
    expect(score.mode).toBe("satb");
    expect(score.voices.every(v => v.instrument === "Cello")).toBe(true);
    expect(score.measures.map(m => [m.time.join("/"), m.key])).toEqual([["4/4", "G"], ["4/4", "G"], ["3/4", "Eb"]]);
    expect(score.scenes[0].endMeasure).toBe(3);

    const soprano = voiceOf(score, "soprano").events.map(e => [e.start, e.duration, e.dotted, e.pitches, e.tie]);
    expect(soprano).toEqual([
      [0, "q", false, ["C#5"], false],
      [960, "8", true, ["A##4", "C5"], false],
      [1680, "16", false, ["Bb4"], false],
      [1920, "h", false, ["Cb5"], true], // dotted half from beat 3: a half...
      [3840, "q", false, ["Cb5"], true], // ...tied over the bar to a quarter, keeping its own tie
    ]);
    // A dotted whole from measure 1 fills it and continues tied as a half.
    expect(voiceOf(score, "bass").events.map(e => [e.start, e.duration, e.dotted, e.tie])).toEqual([
      [0, "w", false, true], [3840, "h", false, false], [7680, "8", true, false],
    ]);
    expect(() => validateScore(score)).not.toThrow();
  });

  it("preserves legacy harmony ciphers at their measure and quarter-beat offsets",()=>{
    const score=importScore(legacy({cipherData:{0:{0:"I",4:"V7"},2:{8:"ii6"}}}));
    expect(score.annotations?.map(({measure,beat,text})=>({measure,beat,text}))).toEqual([
      {measure:1,beat:1,text:"I"},{measure:1,beat:2,text:"V7"},{measure:3,beat:3,text:"ii6"},
    ]);
    expect(()=>importScore(legacy({cipherData:{0:{16:"V7"}}}))).toThrow(/annotations/);
  });

  it("migrates single mode with the first measure's clef and the Sinte instrument", () => {
    const score = importScore(JSON.stringify({
      projectData: { mode: "single", instrument: "Sinte", tracks: { melody: [[0, old(["e/3"], "d")]] } },
      measureSettings: { 0: { time: "6/8", key: "F", clef: "bass" } },
      totalMeasures: 1,
    }));
    expect(score.mode).toBe("single");
    expect(voiceOf(score, "melody")).toMatchObject({ clef: "bass", instrument: "Synth" });
    expect(voiceOf(score, "melody").events).toMatchObject([{ start: 0, duration: "8", pitches: ["E3"] }]);
    expect(scoreTicks(score)).toBe(2880);
  });

  it("rejects legacy projects it cannot represent, as a whole", () => {
    expect(() => importScore(legacy({}, { soprano: [[0, old(["c/4"], "h")], [4, old(["d/4"], "q")]] }))).toThrow(/traslapadas/);
    expect(() => importScore(legacy({}, { soprano: [[44, old(["c/4"], "h")]] }))).toThrow(/fuera de los 3 compases/);
    expect(() => importScore(legacy({}, { soprano: [[48, old(["c/4"], "q")]] }))).toThrow(/fuera de los 3 compases/);
    expect(() => importScore(legacy({}, { soprano: [[0, old(["c/4"], "t")]] }))).toThrow(/duración desconocida/);
    expect(() => importScore(legacy({}, { soprano: [[0, old(["h/4"], "q")]] }))).toThrow(/nota no reconocida/);
    expect(() => importScore(legacy({}, { soprano: [[0.5, old(["c/4"], "q")]] }))).toThrow(/posición/);
    expect(() => importScore(legacy({}, { soprano: [[0, old([], "q")]] }))).toThrow(/sin alturas/);
    expect(() => importScore(legacy({}, { drums: [] }))).toThrow(/pista desconocida/);
    expect(() => importScore(legacy({ totalMeasures: 0 }))).toThrow(/totalMeasures/);
    expect(() => importScore(legacy({ totalMeasures: 129 }))).toThrow(/totalMeasures/);
    expect(() => importScore(legacy({ measureSettings: { 0: { time: "4/3", key: "C" } } }))).toThrow();
    expect(() => importScore(legacy({ measureSettings: { 0: { time: "4/4", key: "H" } } }))).toThrow(/tonalidad/);
    expect(() => importScore(JSON.stringify({ projectData: { mode: "trio", tracks: {} }, totalMeasures: 1 }))).toThrow(/modo/);
  });
});

describe("parseScoreText", () => {
  it("accepts the duration labels shown in both language versions", () => {
    for (const labels of [
      ["entera", "mitad", "cuarto", "octavo", "dieciseisavo", "treintaidosavo"],
      ["whole", "half", "quarter", "eighth", "sixteenth", "thirty-second"],
    ]) {
      const values = ["w", "h", "q", "8", "16", "32"];
      for (let i = 0; i < labels.length; i++) {
        const result = parseScoreText(`measure 1\nC4 ${labels[i]}`, createScore());
        expect(result.issues).toEqual([]);
        expect(result.score?.voices[0].events[0].duration).toBe(values[i]);
      }
    }
  });
  it("writes the documented examples onto an empty score", () => {
    const base = createScore();
    const before = clone(base);
    const result = parseScoreText(`voz melody
compas 1
C4 negra; D4 negra; E4 negra; F4 negra
compas 2
G4 q; A4 q; B4 q; C5 q`, base);
    expect(result.issues).toEqual([]);
    expect(result.count).toBe(8);
    expect(base).toEqual(before);
    const events = voiceOf(result.score!, "melody").events;
    expect(events.map(e => e.start)).toEqual([0, 960, 1920, 2880, 3840, 4800, 5760, 6720]);
    expect(events.map(e => e.pitches[0])).toEqual(["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"]);
    expect(new Set(events.map(e => e.id)).size).toBe(8);
  });

  it("reads chords, rests, dots, triplets, ties and every value name", () => {
    const result = parseScoreText(`
# comentario
Compás 1   // tresillos
[C4 E4 G4] corchea tresillo; Do4 Mi4 corchea tresillo; silencio 8 triplet; C4 negra con puntillo; rest corchea; D4 q tie
measure: 2
D4 blanca; [] q. // X9 nada: esto es comentario
compas 3
C4 redonda
compas 4
C4 semicorchea; C4 16; C4 fusa; C4 32; r h; C4 q tresillo`, createScore());
    expect(result.issues).toEqual([]);
    expect(result.count).toBe(15);
    const events = voiceOf(result.score!, "melody").events;
    expect(events.slice(0, 6).map(e => [e.start, e.duration, e.dotted, e.triplet, e.pitches, e.tie])).toEqual([
      [0, "8", false, true, ["C4", "E4", "G4"], false],
      [320, "8", false, true, ["C4", "E4"], false],
      [640, "8", false, true, [], false],
      [960, "q", true, false, ["C4"], false],
      [2400, "8", false, false, [], false],
      [2880, "q", false, false, ["D4"], true],
    ]);
    expect(events.slice(6, 9).map(e => [e.start, e.duration, e.dotted])).toEqual([[3840, "h", false], [5760, "q", true], [7680, "w", false]]);
    expect(events.slice(9).map(e => [e.start, e.duration])).toEqual([
      [11520, "16"], [11760, "16"], [12000, "32"], [12120, "32"], [12240, "h"], [14160, "q"],
    ]);
    expect(events[14]).toMatchObject({ triplet: true, pitches: ["C4"] });
  });

  it("writes SATB voices into the last measure named", () => {
    const result = parseScoreText(`compas 2
voz soprano
G4 blanca; F4 blanca
voz alto
E4 blanca; D4 blanca
voz tenor; C4 blanca; B3 blanca
voice bajo; C3 redonda`, createScore("satb"));
    expect(result.issues).toEqual([]);
    expect(result.count).toBe(7);
    for (const id of ["soprano", "alto", "tenor", "bass"]) {
      expect(voiceOf(result.score!, id).events[0].start, id).toBe(3840);
    }
    expect(voiceOf(result.score!, "melody").events).toEqual([]);
  });

  it("replaces only the voice and measures it writes", () => {
    const base = createScore("satb");
    voiceOf(base, "soprano").events = [note(0, ["C5"], "w"), note(3840, ["D5"], "h"), note(5760, ["E5"], "h"), note(7680, ["F5"], "w")];
    voiceOf(base, "alto").events = [note(3840, ["A4"], "w")];
    const result = parseScoreText("voz soprano\ncompas 2\nG5 negra\ncompas 4", base);
    expect(result.issues).toEqual([]);
    expect(voiceOf(result.score!, "soprano").events.map(e => [e.start, e.pitches[0]])).toEqual([[0, "C5"], [3840, "G5"], [7680, "F5"]]);
    expect(voiceOf(result.score!, "alto").events).toEqual(voiceOf(base, "alto").events);
    expect(voiceOf(base, "soprano").events).toHaveLength(4);
    // A full measure flows into the next one, which is then replaced too.
    const flow = parseScoreText("voz soprano; C5 w; B4 q", base);
    expect(voiceOf(flow.score!, "soprano").events.map(e => e.start)).toEqual([0, 3840, 7680]);
    // Nothing written: the base comes back unchanged.
    expect(parseScoreText("\n# nada\n", base)).toEqual({ score: base, issues: [], count: 0 });
  });

  it("reports bar overflow and the end of the score without extending it", () => {
    const overflow = parseScoreText("C4 blanca; D4 blanca puntillo; E4 negra\ncompas 2\nF4 negra", createScore());
    expect(overflow.score).toBeNull();
    expect(overflow.count).toBe(2);
    expect(overflow.issues).toHaveLength(1);
    expect(overflow.issues[0].line).toBe(1);
    expect(overflow.issues[0].message).toMatch(/no cabe en el compás 1/);

    const end = parseScoreText("compas 4\nC4 redonda\nD4 negra", createScore());
    expect(end).toMatchObject({ score: null, count: 1, issues: [{ line: 3 }] });
    expect(end.issues[0].message).toMatch(/No quedan compases/);

    const missing = parseScoreText("compas 5\nC4 negra; D4 negra", createScore());
    expect(missing).toMatchObject({ score: null, count: 0 });
    expect(missing.issues).toEqual([{ line: 1, message: expect.stringMatching(/compás 5 no existe/) }]);

    const triplet = parseScoreText("compas 1\nC4 h; C4 h tresillo; C4 h tresillo", createScore());
    expect(triplet.issues[0].message).toMatch(/no cabe en el compás 1/);
  });

  it("reports collisions inside the text", () => {
    const result = parseScoreText("compas 1\nC4 blanca\ncompas 1\nD4 negra", createScore());
    expect(result.score).toBeNull();
    expect(result.count).toBe(1);
    expect(result.issues).toEqual([{ line: 4, message: expect.stringMatching(/Colisión/) }]);
  });

  it("is transactional: any error returns no score and leaves the base alone", () => {
    const base = createScore("satb");
    const before = clone(base);
    const result = parseScoreText(`voz soprano
C5 negra; H4 negra; D5
voz melody
C4 negra
voz contralto
compas x
voz alto
E4 negra puntilo
E4 negra
[E4 G4 negra
silencio negra ligadura
; blanca`, base);
    expect(result.score).toBeNull();
    expect(base).toEqual(before);
    expect(result.count).toBe(2); // C5 and the alto E4
    expect(result.issues.map(issue => issue.line)).toEqual([2, 2, 3, 5, 6, 8, 10, 11, 12]);
    expect(result.issues[0].message).toMatch(/Nota no válida/);
    expect(result.issues[1].message).toMatch(/Falta la figura/);
    expect(result.issues[2].message).toMatch(/no existe en el modo SATB/);
    expect(result.issues[3].message).toMatch(/Voz desconocida/);
    expect(result.issues[4].message).toMatch(/compás no válido/);
    expect(result.issues[5].message).toMatch(/puntilo/);
    expect(result.issues[6].message).toMatch(/corchete/);
    expect(result.issues[7].message).toMatch(/silencio no puede/);
    expect(result.issues[8].message).toMatch(/Falta la nota/);
  });

  it("reports an invalid base instead of throwing", () => {
    const base = createScore();
    base.voices[0].events = [note(2880, ["C4"], "h")];
    const result = parseScoreText("compas 3\nC4 q", base);
    expect(result.score).toBeNull();
    expect(result.issues[0]).toMatchObject({ line: 0 });
  });
});
