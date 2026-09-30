import { describe, expect, it } from "vitest";
import { parseMidiBuffer } from "../maestro-virtual/midi-parser";
import { exportMidi, exportMusicXml } from "./export";
import { createScore, newId, parseScoreText } from "./model";
import type { Duration, NoteEvent, Score } from "./types";

const note = (start: number, pitches: string[], duration: Duration = "q", extra: Partial<NoteEvent> = {}): NoteEvent => ({
  id: newId(), start, duration, dotted: false, triplet: false, pitches, tie: false, ...extra,
});
const voiceOf = (score: Score, id: string) => score.voices.find(voice => voice.id === id)!;

it("exports inherited internal clefs, pedagogical note color and escaped lyric text",()=>{
  const score=createScore();score.measures[1].clefs={melody:"bass"};score.measures[3].clefs={melody:"treble"};
  score.voices[0].events=[note(0,["C4"],"q",{ornament:true,text:"a<&\""})];
  const xml=exportMusicXml(score);
  expect(xml.match(/<clef>/g)).toHaveLength(3);
  expect(xml).toContain('<note color="#ef4444">');
  expect(xml).toContain('<lyric><text>a&lt;&amp;&quot;</text></lyric>');
  expect(xml).toContain('<clef><sign>F</sign><line>4</line></clef>');
});
const written = (text: string, base: Score) => {
  const result = parseScoreText(text, base);
  expect(result.issues).toEqual([]);
  return result.score!;
};
const bytesOf = (text: string) => [...text].map(character => character.charCodeAt(0));
const indexOfBytes = (haystack: Uint8Array, needle: number[], from = 0) => {
  for (let index = from; index <= haystack.length - needle.length; index++) {
    if (needle.every((byte, offset) => haystack[index + offset] === byte)) return index;
  }
  return -1;
};
const parse = (midi: Uint8Array) => parseMidiBuffer(midi.buffer as ArrayBuffer);
/** Offset of every "MTrk" chunk. */
const tracksOf = (midi: Uint8Array) => {
  const starts: number[] = [];
  for (let at = indexOfBytes(midi, bytesOf("MTrk")); at !== -1; at = indexOfBytes(midi, bytesOf("MTrk"), at + 1)) starts.push(at);
  return starts;
};

function satb(): Score {
  const base = createScore("satb");
  base.title = "Coral <1> & \"dos\"";
  base.tempo = 90;
  base.measures[0].key = "D";
  base.measures[1].key = "D";
  base.measures[2] = { ...base.measures[2], key: "Eb", time: [3, 4] };
  base.measures[3] = { ...base.measures[3], key: "Eb", time: [3, 4] };
  return written(`voz soprano
compas 1
F#5 negra; silencio negra; A##4 blanca ligadura
compas 2
A##4 negra; B4 negra; Cb5 blanca
compas 3
Bb4 blanca puntillo
voz alto
compas 1
[D4 F#4] redonda
voz tenor
compas 1
A3 corchea tresillo; B3 corchea tresillo; C#4 corchea tresillo; D4 negra puntillo; silencio corchea; D4 negra
voz bajo
compas 1
D3 redonda ligadura
compas 2
D3 redonda ligadura
compas 3
Eb3 blanca puntillo`, base);
}

describe("exportMidi", () => {
  it("writes a format 1 file at 960 PPQ that the Maestro Virtual parser reads back", () => {
    const midi = exportMidi(satb());
    expect([...midi.slice(0, 14)]).toEqual([...bytesOf("MThd"), 0, 0, 0, 6, 0, 1, 0, 4, 0x03, 0xc0]);

    const data = parse(midi);
    expect(data.ticksPerBeat).toBe(960);
    // Each of the four tracks repeats the key signatures, so the parser lists them four times.
    const change = (tick: number, key: string) => Array.from({ length: 4 }, () => ({ tick, key }));
    expect(data.keyChanges).toEqual([...change(0, "D"), ...change(7680, "Eb")]);

    // The tied A## (half + quarter across the bar) is one note; the rest is skipped.
    expect(data.voices.SOPRANO!.map(n => [n.tick, n.midi, n.spelling])).toEqual([
      [0, 78, "f#"], [1920, 71, "a##"], [4800, 71, "b"], [5760, 71, "cb"], [7680, 70, "bb"],
    ]);
    expect(data.voices.SOPRANO!.map(n => n.key)).toEqual(["D", "D", "D", "D", "Eb"]);
    expect(data.voices.ALTO!.map(n => [n.tick, n.midi, n.spelling])).toEqual([[0, 62, "d"], [0, 66, "f#"]]);
    expect(data.voices.TENOR!.map(n => n.tick)).toEqual([0, 320, 640, 960, 2880]);
    // Bass: two tied whole notes merge; the Eb is a different pitch and starts anew.
    expect(data.voices.BASS!.map(n => [n.tick, n.midi, n.spelling])).toEqual([[0, 50, "d"], [7680, 51, "eb"]]);
    expect(data.beats[0]).toMatchObject({ tick: 0, key: "D", SOPRANO: 78, ALTO: 62, TENOR: 57, BASS: 50 });
  });

  it("writes tempo, time and key changes, track names and correct note lengths", () => {
    const midi = exportMidi(satb());
    const tempo = Math.round(60_000_000 / 90);
    expect(indexOfBytes(midi, [0xff, 0x51, 0x03, (tempo >> 16) & 0xff, (tempo >> 8) & 0xff, tempo & 0xff])).toBeGreaterThan(0);
    expect(indexOfBytes(midi, [0xff, 0x58, 0x04, 4, 2, 24, 8])).toBeGreaterThan(0);
    expect(indexOfBytes(midi, [0xff, 0x58, 0x04, 3, 2, 24, 8])).toBeGreaterThan(0);
    expect(indexOfBytes(midi, [0xff, 0x59, 0x02, 2, 0])).toBeGreaterThan(0);
    expect(indexOfBytes(midi, [0xff, 0x59, 0x02, 0xfd, 0])).toBeGreaterThan(0);
    for (const name of ["Soprano", "Alto", "Tenor", "Bajo"]) {
      expect(indexOfBytes(midi, [0xff, 0x03, name.length, ...bytesOf(name)]), name).toBeGreaterThan(0);
    }
    // Four tracks; tempo and time signatures live only in the first one, key signatures in all.
    const tracks = tracksOf(midi);
    expect(tracks).toHaveLength(4);
    expect(indexOfBytes(midi, [0xff, 0x51, 0x03], tracks[1])).toBe(-1);
    expect(indexOfBytes(midi, [0xff, 0x58, 0x04], tracks[1])).toBe(-1);
    tracks.forEach((start, index) => {
      const track = midi.slice(start, tracks[index + 1] ?? midi.length);
      expect(indexOfBytes(track, [0xff, 0x59, 0x02, 2, 0]), `track ${index}`).toBeGreaterThan(0);
      expect(indexOfBytes(track, [0xff, 0x59, 0x02, 0xfd, 0]), `track ${index}`).toBeGreaterThan(0);
    });
    // Bass, channel 3: D3 on, then off 7680 ticks later (VLQ 0xBC 0x00), right before the Eb3.
    // The key change falls on that same tick and comes first.
    const on = indexOfBytes(midi, [0x93, 50, 100], tracks[3]);
    expect(on).toBeGreaterThan(0);
    expect([...midi.slice(on + 3, on + 14)]).toEqual([0xbc, 0x00, 0xff, 0x59, 0x02, 0xfd, 0, 0x00, 0x83, 50, 0]);
    // Every track ends at the end of the score: 2880 ticks (VLQ 0x96 0x40) after the last note-off.
    expect([...midi.slice(-8)]).toEqual([0x83, 51, 0, 0x96, 0x40, 0xff, 0x2f, 0x00]);
  });

  it("gives every SATB voice the key of each note's own measure across a key change", () => {
    const base = createScore("satb");
    base.measures[0].key = "A";
    base.measures[1].key = "A";
    base.measures[2].key = "Ab";
    base.measures[3].key = "Ab";
    const score = written(`voz soprano
compas 1
A4 redonda; C#5 redonda; C5 redonda; Ab4 redonda
voz alto
compas 1
E4 blanca; E4 blanca; E4 blanca puntillo; G#4 negra; Ab4 negra; Eb4 blanca puntillo; Eb4 redonda
voz tenor
compas 1
C#4 redonda; silencio blanca; B3 blanca; silencio negra; C4 blanca puntillo; C4 redonda
voz bajo
compas 1
A2 redonda; E2 blanca; E2 blanca ligadura; E2 negra; Ab2 blanca puntillo; Ab2 redonda`, base);
    const midi = exportMidi(score);
    expect([...midi.slice(12, 14)]).toEqual([0x03, 0xc0]); // still 960 PPQ
    const data = parse(midi);
    const keyed = (voice: "SOPRANO" | "ALTO" | "TENOR" | "BASS") => data.voices[voice]!.map(n => [n.tick, n.key, n.spelling]);

    expect(keyed("SOPRANO")).toEqual([[0, "A", "a"], [3840, "A", "c#"], [7680, "Ab", "c"], [11520, "Ab", "ab"]]);
    expect(keyed("ALTO")).toEqual([
      [0, "A", "e"], [1920, "A", "e"], [3840, "A", "e"], [6720, "A", "g#"],
      [7680, "Ab", "ab"], [8640, "Ab", "eb"], [11520, "Ab", "eb"],
    ]);
    // The tenor rests on the downbeat of the key change and still gets the new key.
    expect(keyed("TENOR")).toEqual([[0, "A", "c#"], [5760, "A", "b"], [8640, "Ab", "c"], [11520, "Ab", "c"]]);
    // The bass E2 tied over the bar line is one note and keeps the key of its onset.
    expect(keyed("BASS")).toEqual([[0, "A", "a"], [3840, "A", "e"], [5760, "A", "e"], [8640, "Ab", "ab"], [11520, "Ab", "ab"]]);

    // The repeated signatures (four per change) do not disturb the beat grid.
    expect(data.keyChanges.map(change => `${change.tick}:${change.key}`)).toEqual([
      "0:A", "0:A", "0:A", "0:A", "7680:Ab", "7680:Ab", "7680:Ab", "7680:Ab",
    ]);
    expect(data.beats.map(beat => [beat.tick, beat.key])).toEqual([
      [0, "A"], [1920, "A"], [3840, "A"], [5760, "A"], [6720, "A"], [7680, "Ab"], [8640, "Ab"], [11520, "Ab"],
    ]);
    expect(data.beats[5]).toMatchObject({ SOPRANO: 72, ALTO: 68 });
    expect(data.beats[5].TENOR).toBeUndefined();
    expect(data.beats[6]).toMatchObject({ ALTO: 63, TENOR: 60, BASS: 44 });

    // Alto track at the key change: signature, the G#4 note-off, then the (spelling, note-on) pair for Ab4.
    const alto = tracksOf(midi)[1];
    const signature = indexOfBytes(midi, [0xff, 0x59, 0x02, 0xfc, 0], alto);
    expect(signature).toBeGreaterThan(alto);
    expect([...midi.slice(signature + 5, signature + 22)]).toEqual([
      0, 0x81, 68, 0,
      0, 0xff, 0x01, 5, ...bytesOf("SP:ab"),
      0, 0x91, 68, 100,
    ]);
  });

  it("writes each key change once for a single melody", () => {
    const base = createScore();
    base.measures[2].key = "F#m";
    base.measures[3].key = "F#m";
    const data = parse(exportMidi(written("C4 redonda; D4 redonda; C#4 redonda; F#4 redonda", base)));
    // The parser names a minor key by its relative major.
    expect(data.keyChanges).toEqual([{ tick: 0, key: "C" }, { tick: 7680, key: "A" }]);
    expect(data.voices.SOPRANO!.map(n => n.key)).toEqual(["C", "C", "A", "A"]);
  });

  it("uses channel 0 for a single melody and exports muted voices", () => {
    const score = written("C4 negra; [E4 G4 Bb4] negra; silencio blanca", createScore());
    voiceOf(score, "melody").mute = true;
    // Notes in voices outside the mode are not exported.
    voiceOf(score, "alto").events = [note(0, ["C3"], "w")];
    const midi = exportMidi(score);
    expect(midi[11]).toBe(1);
    const data = parse(midi);
    expect(data.voices.SOPRANO!.map(n => [n.tick, n.midi, n.spelling])).toEqual([
      [0, 60, "c"], [960, 64, "e"], [960, 67, "g"], [960, 70, "bb"],
    ]);
    expect(data.voices.ALTO).toBeUndefined();
    expect(indexOfBytes(midi, [0xff, 0x03, 8, ...new TextEncoder().encode("Melodía")])).toBeGreaterThan(0);
  });

  it("keeps a tie only when the next event is contiguous with the same pitches", () => {
    const score = createScore();
    voiceOf(score, "melody").events = [
      note(0, ["C4"], "q", { tie: true }), note(960, ["D4"], "q", { tie: true }),
      note(2880, ["D4"], "q", { tie: true }),
      note(3840, ["Db4"], "q", { tie: true }), note(4800, ["C#4"], "q"),
    ];
    expect(parse(exportMidi(score)).voices.SOPRANO!.map(n => [n.tick, n.spelling])).toEqual([
      [0, "c"], [960, "d"], [2880, "d"], [3840, "db"], [4800, "c#"],
    ]);
  });

  it("exports an empty score and minor keys, and rejects invalid scores", () => {
    const empty = createScore("satb");
    empty.measures.forEach(measure => { measure.key = "F#m"; });
    const midi = exportMidi(empty);
    expect(indexOfBytes(midi, [0xff, 0x59, 0x02, 3, 1])).toBeGreaterThan(0);
    expect(parse(midi).voices).toEqual({});
    const broken = createScore();
    broken.voices[0].events = [note(2880, ["C4"], "h")];
    expect(() => exportMidi(broken)).toThrow(/cruza la barra/);
    expect(() => exportMusicXml(broken)).toThrow(/cruza la barra/);
  });
});

describe("exportMusicXml", () => {
  const measuresOf = (xml: string, part: string) => {
    const body = xml.split(`<part id="${part}">`)[1].split("</part>")[0];
    return body.split(/<measure number="\d+">/).slice(1);
  };
  const durations = (measure: string) => [...measure.matchAll(/<note>(<chord\/>)?.*?<duration>(\d+)<\/duration>/g)]
    .filter(match => !match[1]).map(match => Number(match[2]));

  it("writes one escaped, complete part per voice", () => {
    const xml = exportMusicXml(satb());
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<score-partwise version="4.0">');
    expect(xml).toContain("<work-title>Coral &lt;1&gt; &amp; &quot;dos&quot;</work-title>");
    expect(xml).not.toContain("<1>");
    expect([...xml.matchAll(/<score-part id="(P\d)"><part-name>(.*?)<\/part-name>/g)].map(m => [m[1], m[2]]))
      .toEqual([["P1", "Soprano"], ["P2", "Alto"], ["P3", "Tenor"], ["P4", "Bajo"]]);
    expect(xml.match(/<part id=/g)).toHaveLength(4);
    expect(xml.match(/<sound tempo="90"\/>/g)).toHaveLength(1);

    // Every measure of every part adds up to its time signature.
    for (const part of ["P1", "P2", "P3", "P4"]) {
      const measures = measuresOf(xml, part);
      expect(measures).toHaveLength(4);
      expect(measures.map(measure => durations(measure).reduce((a, b) => a + b, 0)), part).toEqual([3840, 3840, 2880, 2880]);
    }
  });

  it("writes attributes where they start or change", () => {
    const soprano = measuresOf(exportMusicXml(satb()), "P1");
    expect(soprano[0]).toContain("<attributes><divisions>960</divisions><key><fifths>2</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>");
    expect(soprano[1]).not.toContain("<attributes>");
    expect(soprano[2]).toContain("<attributes><key><fifths>-3</fifths><mode>major</mode></key><time><beats>3</beats><beat-type>4</beat-type></time></attributes>");
    expect(soprano[3]).not.toContain("<attributes>");
    expect(soprano[3]).toContain('<note><rest measure="yes"/><duration>2880</duration><voice>1</voice></note>');
    expect(measuresOf(exportMusicXml(satb()), "P4")[0]).toContain("<clef><sign>F</sign><line>4</line></clef>");
  });

  it("writes pitches, rests, dots, chords and ties", () => {
    const xml = exportMusicXml(satb());
    const soprano = measuresOf(xml, "P1");
    expect(soprano[0]).toContain("<note><pitch><step>F</step><alter>1</alter><octave>5</octave></pitch><duration>960</duration><voice>1</voice><type>quarter</type></note>");
    expect(soprano[0]).toContain("<note><rest/><duration>960</duration><voice>1</voice><type>quarter</type></note>");
    expect(soprano[0]).toContain('<note><pitch><step>A</step><alter>2</alter><octave>4</octave></pitch><duration>1920</duration><tie type="start"/><voice>1</voice><type>half</type><notations><tied type="start"/></notations></note>');
    expect(soprano[1]).toContain('<note><pitch><step>A</step><alter>2</alter><octave>4</octave></pitch><duration>960</duration><tie type="stop"/><voice>1</voice><type>quarter</type><notations><tied type="stop"/></notations></note>');
    expect(soprano[1]).toContain("<pitch><step>C</step><alter>-1</alter><octave>5</octave></pitch>");
    expect(soprano[1]).toContain("<pitch><step>B</step><octave>4</octave></pitch>");
    expect(soprano[2]).toContain("<duration>2880</duration><voice>1</voice><type>half</type><dot/></note>");

    const alto = measuresOf(xml, "P2")[0];
    expect(alto).toContain("<note><pitch><step>D</step><octave>4</octave></pitch><duration>3840</duration><voice>1</voice><type>whole</type></note>");
    expect(alto).toContain("<note><chord/><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>3840</duration><voice>1</voice><type>whole</type></note>");

    // Bass: D3 is tied over the bar; the tie asked from D3 to Eb3 is not written.
    const bass = measuresOf(xml, "P4");
    expect(bass[0]).toContain('<tie type="start"/>');
    expect(bass[1]).toContain('<tie type="stop"/><voice>1</voice>');
    expect(bass[1]).not.toContain('type="start"');
    expect(bass[2]).not.toContain("<tie");
    expect(bass[2]).toContain("<step>E</step><alter>-1</alter><octave>3</octave>");
  });

  it("chains ties through a middle note", () => {
    const score = createScore();
    voiceOf(score, "melody").events = [
      note(0, ["C4", "E4"], "q", { tie: true }), note(960, ["C4", "E4"], "q", { tie: true }), note(1920, ["C4", "E4"], "h"),
    ];
    const notes = measuresOf(exportMusicXml(score), "P1")[0].split("\n").map(line => line.trim()).filter(line => line.startsWith("<note>"));
    expect(notes).toHaveLength(6);
    for (const middle of [notes[2], notes[3]]) {
      expect(middle).toContain('<tie type="stop"/><tie type="start"/>');
      expect(middle).toContain('<notations><tied type="stop"/><tied type="start"/></notations>');
    }
    expect(notes[1]).toContain("<chord/>");
    expect(notes[5]).toContain('<tie type="stop"/><voice>1</voice>');
    expect(parse(exportMidi(score)).voices.SOPRANO!.map(n => [n.tick, n.midi])).toEqual([[0, 60], [0, 64]]);
  });

  it("writes triplets with time-modification and one bracket per group", () => {
    const tenor = measuresOf(exportMusicXml(satb()), "P3")[0];
    const modification = "<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>";
    expect(tenor.split(modification)).toHaveLength(4);
    expect(tenor).toContain(`<duration>320</duration><voice>1</voice><type>eighth</type>${modification}<notations><tuplet type="start" number="1"/></notations>`);
    expect(tenor).toContain(`<duration>320</duration><voice>1</voice><type>eighth</type>${modification}<notations><tuplet type="stop" number="1"/></notations>`);
    expect(tenor.match(/<tuplet type="start"/g)).toHaveLength(1);
    expect(tenor.match(/<tuplet type="stop"/g)).toHaveLength(1);
    expect(durations(tenor)).toEqual([320, 320, 320, 1440, 480, 960]);
  });

  it("fills gaps with rests, including the odd gap after an incomplete triplet", () => {
    const score = createScore();
    voiceOf(score, "melody").events = [
      note(1440, ["C4"], "q"),
      note(3840, ["D4"], "8", { triplet: true }),
      note(3840 + 960, ["E4"], "h", { dotted: true }),
    ];
    const melody = measuresOf(exportMusicXml(score), "P1");
    expect(durations(melody[0])).toEqual([1440, 960, 1440]);
    expect(melody[0]).toContain("<note><rest/><duration>1440</duration><voice>1</voice><type>quarter</type><dot/></note>");
    // 640 ticks of silence cannot be a plain value: a rest with only its duration.
    expect(durations(melody[1])).toEqual([320, 640, 2880]);
    expect(melody[1]).toContain("<note><rest/><duration>640</duration><voice>1</voice></note>");
    expect(melody[1]).toContain('<tuplet type="start" number="1"/><tuplet type="stop" number="1"/>');
  });

  it("exports muted voices, only the mode's voices, and strips characters XML cannot hold", () => {
    const score = written("C4 redonda", createScore());
    score.title = "A\u0001B 'c'";
    voiceOf(score, "melody").mute = true;
    voiceOf(score, "melody").name = "Voz <principal>";
    voiceOf(score, "bass").events = [note(0, ["C2"], "w")];
    const xml = exportMusicXml(score);
    expect(xml).toContain("<work-title>AB &apos;c&apos;</work-title>");
    expect(xml).toContain("<part-name>Voz &lt;principal&gt;</part-name>");
    expect(xml.match(/<part id=/g)).toHaveLength(1);
    expect(xml).toContain("<step>C</step><octave>4</octave>");
    expect(xml).not.toContain("<octave>2</octave>");
  });
});
