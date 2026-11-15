import { describe, expect, it } from "vitest";
import { analyzeSatbChords, groupChords, MAJOR_KEYS, SATB_VOICES, type KeyModel } from "@/lib/maestro-virtual/satb-chords-validator";
import { checkProgression, MAJOR_LINKS, type ProgressionChord } from "@/lib/maestro-virtual/harmonic-material";
import type { VoiceData } from "@/lib/maestro-virtual/midi-parser";
import { checkHarmonicMotion, checkMelodicLine } from "@/lib/maestro-virtual/voice-leading";
import { createScore, pitchToMidi } from "../model";
import { keyModel, parseChordToken, parseProgression } from "./chords";
import { harmonize } from "./harmonize";
import { realize } from "./realize";
import { chordTrack, setChordAt, writeProgression } from "./chord-track";
import { applyHarmonization, harmonizeOptions, HarmonyError, realizeChordTrack } from "./score-bridge";
import { reviewScore } from "./review";
import { transposeToKey } from "./transpose";
import { enumerateVoicings, pitchName, type Voicing } from "./voicing";

const token = (v: Voicing[keyof Voicing]) => v.spelling.letter + (v.spelling.alter > 0 ? "#".repeat(v.spelling.alter) : "b".repeat(-v.spelling.alter));

/** Las mismas revisiones que hace el Maestro Virtual sobre un ejercicio entregado. */
function courseErrors(model: KeyModel, voicings: Voicing[]): string[] {
  const data: VoiceData = { ticksPerBeat: 480, keyChanges: [{ tick: 0, key: model.key }], beats: [], voices: {} };
  for (const voice of SATB_VOICES) data.voices[voice] = voicings.map((v, i) => ({ midi: v[voice].midi, pitch: v[voice].midi % 12, tick: i * 480, key: model.key, spelling: token(v[voice]) }));
  const errors = analyzeSatbChords(groupChords(data), model).feedback.filter(f => f.severity === "error").map(f => `${f.rule}@${f.position}`);
  for (let i = 0; i + 1 < voicings.length; i++) errors.push(...checkHarmonicMotion(SATB_VOICES, voicings[i], voicings[i + 1]).map(issue => `${issue.rule}@${i + 1}`));
  for (const voice of SATB_VOICES) errors.push(...checkMelodicLine(voicings.map(v => v[voice]), { leadingPc: model.leadingPc, allowRepeat: true }).map(issue => `${issue.rule}:${voice}@${issue.index + 1}`));
  return errors;
}
const chords = (text: string, key = "C") => parseProgression(text, key).chords;

describe("pista de acordes: lectura", () => {
  const c = keyModel("C");
  it("lee cifrado romano con estados", () => {
    expect(parseChordToken("I", c)).toMatchObject({ degree: 1, inversion: 0 });
    expect(parseChordToken("ii6", c)).toMatchObject({ degree: 2, inversion: 1 });
    expect(parseChordToken("V6/4", c)).toMatchObject({ degree: 5, inversion: 2 });
    expect(parseChordToken("vii°6", c)).toMatchObject({ degree: 7, inversion: 1 });
    expect(parseChordToken("IV6/3", c)).toMatchObject({ degree: 4, inversion: 1 });
  });
  it("lee cifrado americano diatónico y rechaza lo ajeno", () => {
    expect(parseChordToken("Dm", c)).toMatchObject({ degree: 2, inversion: 0 });
    expect(parseChordToken("G/B", c)).toMatchObject({ degree: 5, inversion: 1 });
    expect(parseChordToken("Bdim/D", c)).toMatchObject({ degree: 7, inversion: 1 });
    expect(parseChordToken("D", c)).toBeNull(); // Re mayor no es de Do mayor
    expect(parseChordToken("F#", keyModel("D"))).toBeNull(); // en Re mayor es F#m
    expect(parseChordToken("F#m", keyModel("D"))).toMatchObject({ degree: 3 });
    expect(parseChordToken("X9", c)).toBeNull();
  });
  it("separa progresiones con guiones, comas o barras y reporta errores", () => {
    expect(chords("I – IV – V – I").map(x => x.degree)).toEqual([1, 4, 5, 1]);
    expect(chords("C, F | G/B C").map(x => [x.degree, x.inversion])).toEqual([[1, 0], [4, 0], [5, 1], [1, 0]]);
    const parsed = parseProgression("I zz V", "C");
    expect(parsed.chords).toHaveLength(2);
    expect(parsed.issues).toEqual([expect.objectContaining({ index: 1, token: "zz" })]);
  });
});

describe("disposiciones", () => {
  it("todas cumplen la construcción del curso, en todas las tonalidades", () => {
    for (const key of MAJOR_KEYS) {
      const model = keyModel(key);
      for (let degree = 1; degree <= 7; degree++) for (const inversion of [0, 1, 2]) {
        const all = enumerateVoicings(model, { degree, inversion });
        expect(all.length, `${key} ${degree}/${inversion}`).toBeGreaterThan(0);
        for (const voicing of [all[0], all[all.length >> 1], all[all.length - 1]]) expect(courseErrors(model, [voicing])).toEqual([]);
      }
    }
  });
  it("respeta la soprano obligada", () => {
    const all = enumerateVoicings(keyModel("C"), { degree: 1, inversion: 0 }, { soprano: 76 });
    expect(all.length).toBeGreaterThan(0);
    expect(all.every(v => v.SOPRANO.midi === 76)).toBe(true);
  });
});

describe("reparto de voces", () => {
  it("I–IV–V–I sin errores y con poco movimiento", () => {
    const model = keyModel("C");
    const [best] = realize(model, chords("I IV V I"));
    expect(best).toBeDefined();
    expect(courseErrors(model, best.voicings)).toEqual([]);
    const travel = best.voicings.slice(1).reduce((sum, v, i) => sum + ["SOPRANO", "ALTO", "TENOR"].reduce((s, voice) => s + Math.abs(v[voice as "ALTO"].midi - best.voicings[i][voice as "ALTO"].midi), 0), 0);
    expect(travel).toBeLessThanOrEqual(18);
  });
  it("realiza todos los enlaces de la tabla del curso en todas las tonalidades", () => {
    for (const key of MAJOR_KEYS) {
      const model = keyModel(key);
      for (const link of MAJOR_LINKS) {
        let [best] = realize(model, [link.from, link.to], { beam: 60 });
        // Un enlace con intervalo disminuido (p. ej. II6–V6 en el bajo) no puede ser final:
        // necesita un tercer acorde donde la voz cambie de dirección.
        if (!best) for (const next of MAJOR_LINKS.filter(l => l.from.degree === link.to.degree && l.from.inversion === link.to.inversion)) {
          [best] = realize(model, [link.from, link.to, next.to], { beam: 60 });
          if (best) break;
        }
        expect(best,`${key} ${link.from.degree}/${link.from.inversion}→${link.to.degree}/${link.to.inversion}`).toBeDefined();
        expect(courseErrors(model, best.voicings)).toEqual([]);
      }
    }
  });
  it("progresiones largas correctas en tonalidades con muchas alteraciones", () => {
    for (const key of ["C", "Eb", "F#", "Cb"]) {
      const model = keyModel(key);
      const progression = chords("I VI IV II V6 I IV6 V I", "C");
      expect(checkProgression(progression)).toEqual([]);
      const [best] = realize(model, progression);
      expect(best, key).toBeDefined();
      expect(courseErrors(model, best.voicings)).toEqual([]);
    }
  });
});

describe("armonizar una melodía", () => {
  it("ofrece varias armonizaciones correctas con la soprano intacta", () => {
    const model = keyModel("C");
    const melody = ["E5", "F5", "G5", "E5", "D5", "D5", "C5"].map(pitchToMidi);
    const options = harmonize(model, melody, { results: 3 });
    expect(options.length).toBeGreaterThanOrEqual(2);
    for (const option of options) {
      expect(option.voicings.map(v => v.SOPRANO.midi)).toEqual(melody);
      expect(checkProgression(option.chords as ProgressionChord[])).toEqual([]);
      expect(courseErrors(model, option.voicings)).toEqual([]);
      expect(option.chords[option.chords.length - 1]).toMatchObject({ degree: 1, inversion: 0 });
    }
    expect(new Set(options.map(o => JSON.stringify(o.chords))).size).toBe(options.length);
  });
});

describe("puente con la partitura", () => {
  it("la pista de acordes son las anotaciones romanas de la v4", () => {
    let score = createScore("satb");
    score = setChordAt(score, 1, 1, "I"); score = setChordAt(score, 1, 3, "IV");
    score = setChordAt(score, 2, 1, "V"); score = setChordAt(score, 2, 3, "I");
    const track = chordTrack(score);
    expect(track.map(s => [s.tick, s.endTick, s.chord?.degree])).toEqual([[0, 1920, 1], [1920, 3840, 4], [3840, 5760, 5], [5760, 7680, 1]]);
    expect(setChordAt(score, 1, 3, "").annotations).toHaveLength(3);
  });
  it("escribe una progresión de texto repartida por compás o por pulsos", () => {
    const whole = writeProgression(createScore("satb"), "I IV V I", 1, 4);
    expect(chordTrack(whole.score).map(s => [s.measure, s.beat, s.text])).toEqual([[1, 1, "I"], [2, 1, "IV"], [3, 1, "V"], [4, 1, "I"]]);
    const halves = writeProgression(createScore("satb"), "I IV V I I IV V I I", 1, 2);
    expect(halves.score.measures).toHaveLength(5); // añade el compás que falta
    expect(chordTrack(halves.score).at(-1)).toMatchObject({ measure: 5, beat: 1 });
    expect(halves.written).toBe(9);
  });
  it("reparte la pista en las cuatro voces", () => {
    let score = createScore("single");
    for (const [m, b, t] of [[1, 1, "I"], [1, 3, "IV"], [2, 1, "V"], [2, 3, "I"]] as const) score = setChordAt(score, m, b, t);
    const { score: voiced } = realizeChordTrack(score);
    expect(voiced.mode).toBe("satb");
    for (const id of ["soprano", "alto", "tenor", "bass"]) {
      const events = voiced.voices.find(v => v.id === id)!.events;
      expect(events.map(e => [e.start, e.duration])).toEqual([[0, "h"], [1920, "h"], [3840, "h"], [5760, "h"]]);
    }
    expect(voiced.voices.find(v => v.id === "bass")!.events.map(e => e.pitches[0].replace(/\d/, ""))).toEqual(["C", "F", "G", "C"]);
  });
  it("explica por qué no puede repartir", () => {
    expect(() => realizeChordTrack(createScore("satb"))).toThrow(HarmonyError);
    expect(() => realizeChordTrack(setChordAt(createScore("satb"), 1, 1, "Zz"))).toThrow(/no es un acorde/);
  });
  it("armoniza la soprano escrita y deja el cifrado", () => {
    const base = createScore("satb");
    const soprano = base.voices.find(v => v.id === "soprano")!;
    ["E5", "F5", "D5", "C5"].forEach((pitch, i) => soprano.events.push({ id: `n${i}`, start: i * 1920, duration: "h", dotted: false, triplet: false, pitches: [pitch], tie: false }));
    const [first] = harmonizeOptions(base);
    const { score } = applyHarmonization(base, first);
    expect(score.voices.find(v => v.id === "soprano")!.events.map(e => e.pitches[0])).toEqual(["E5", "F5", "D5", "C5"]);
    for (const id of ["alto", "tenor", "bass"]) expect(score.voices.find(v => v.id === id)!.events).toHaveLength(4);
    expect(chordTrack(score).map(s => s.chord?.degree)).toEqual(first.chords.map(c => c.degree));
    expect(pitchName(first.voicings[0].SOPRANO)).toBe("E5");
  });
});

describe("revisión para el autor", () => {
  const satb = (lines: Record<string, string[]>) => {
    const score = createScore("satb");
    for (const [id, notes] of Object.entries(lines)) score.voices.find(v => v.id === id)!.events = notes.map((pitch, i) => ({ id: `${id}${i}`, start: i * 1920, duration: "h" as const, dotted: false, triplet: false, pitches: pitch ? [pitch] : [], tie: false }));
    return score;
  };
  it("no encuentra nada en lo que reparte el motor y nombra la progresión", () => {
    let score = createScore("satb");
    "I VI IV II V6 I IV V".split(" ").forEach((text, i) => { score = setChordAt(score, 1 + Math.floor(i / 2), 1 + (i % 2) * 2, text); });
    const review = reviewScore(realizeChordTrack(score).score);
    expect(review.findings).toEqual([]);
    expect(review.chords).toBe(8);
    expect(review.progression).toBe("I – VI – IV – II – V6/3 – I – IV – V");
  });
  it("señala quintas y octavas paralelas con su compás y pulso", () => {
    // I–II con todas las voces subiendo un grado: 5as y 8as paralelas.
    const review = reviewScore(satb({ soprano: ["G4", "A4"], alto: ["E4", "F4"], tenor: ["C4", "D4"], bass: ["C3", "D3"] }));
    const text = review.findings.map(f => f.es).join(" | ");
    expect(text).toMatch(/5as paralelas/);
    expect(text).toMatch(/8as paralelas/);
    expect(review.findings.every(f => f.measure === 1 && f.beat === 3)).toBe(true);
  });
  it("señala construcción, enlaces fuera de la tabla y voces que faltan", () => {
    // Sensible duplicada en V; V–IV (fundamental) no está en la tabla.
    const review = reviewScore(satb({ soprano: ["B4", "C5", "C5"], alto: ["D4", "F4", "E4"], tenor: ["B3", "A3", ""], bass: ["G2", "F2", "C3"] }));
    const text = review.findings.map(f => f.es).join(" | ");
    expect(text).toMatch(/[Ss]ensible duplicada/);
    expect(text).toMatch(/V–IV no está en la tabla/);
    expect(text).toMatch(/Falta una sola nota en tenor/);
    expect(review.chords).toBe(2);
  });
});

describe("pasar a otra tonalidad (autor)", () => {
  const voiced = () => {
    let score = createScore("satb");
    "I VI IV II V6 I IV V".split(" ").forEach((text, i) => { score = setChordAt(score, 1 + Math.floor(i / 2), 1 + (i % 2) * 2, text); });
    return realizeChordTrack(score).score;
  };
  it("conserva la progresión y sigue sin observaciones en las 15 tonalidades", () => {
    const source = voiced(), expected = reviewScore(source).progression;
    for (const key of MAJOR_KEYS) {
      const { score } = transposeToKey(source, key);
      expect(score.measures.every(m => m.key === key), key).toBe(true);
      const review = reviewScore(score);
      expect(review.progression, key).toBe(expected);
      expect(review.findings.filter(f => !/tesitura/.test(f.es)), key).toEqual([]);
    }
  });
  it("transporta por intervalo escrito: conserva la grafía de cada grado", () => {
    const score = createScore("single");
    score.measures.forEach(m => { m.key = "G"; });
    score.voices[0].events = ["G4", "F#4", "Bb4", "C#5"].map((pitch, i) => ({ id: `n${i}`, start: i * 960, duration: "q" as const, dotted: false, triplet: false, pitches: [pitch], tie: false }));
    const pitches = (key: string) => transposeToKey(score, key).score.voices[0].events.map(e => e.pitches[0]);
    expect(pitches("D")).toEqual(["D4", "C#4", "F4", "G#4"]);   // baja una 4a: queda más cerca
    expect(pitches("A")).toEqual(["A4", "G#4", "C5", "D#5"]);
    expect(pitches("Gb")).toEqual(["Gb4", "F4", "Bbb4", "C5"]);
    expect(pitches("G")).toEqual(["G4", "F#4", "Bb4", "C#5"]);
  });
  it("elige la octava con menos notas fuera de tesitura, lo avisa y rechaza partituras con modulación", () => {
    const source = voiced();
    const near = transposeToKey(source, "D");
    expect(near.outside).toBe(0);
    expect(reviewScore(near.score).findings).toEqual([]);
    // Un transporte parejo y lejano no siempre cabe: se cuenta, no se oculta.
    const far = transposeToKey(source, "G");
    expect(far.outside).toBeGreaterThan(0);
    expect(reviewScore(far.score).findings.filter(f => /tesitura/.test(f.es)).length).toBeGreaterThan(0);
    const modulating = voiced(); modulating.measures[2].key = "G";
    expect(() => transposeToKey(modulating, "D")).toThrow(/cambia de tonalidad/);
  });
});
