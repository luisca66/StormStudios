/**
 * Pure score model for the sequencer: construction, timing, pitch spelling,
 * strict validation, legacy migration and the text grammar. No DOM, no audio.
 * All positions are integer ticks at 960 PPQ (see types.ts).
 */
import {
  INSTRUMENTS, PPQ, VOICE_IDS,
  type Duration, type Instrument, type Measure, type NoteEvent, type ParseResult,
  type Scene, type Score, type TextIssue, type Voice, type VoiceId,
} from "./types";

export const MAX_MEASURES = 128;
export const MAX_EVENTS = 4096;
export const MAX_SCENES = 32;
export const MAX_CHORD_PITCHES = 12;
export const MAX_ANNOTATIONS = 1024;
/** Upper bound for importScore input; a full 4096-event score is far below it. */
export const MAX_IMPORT_CHARS = 4_000_000;

const DURATIONS: readonly Duration[] = ["w", "h", "q", "8", "16", "32"];
const BASE_TICKS: Record<Duration, number> = {
  w: PPQ * 4, h: PPQ * 2, q: PPQ, "8": PPQ / 2, "16": PPQ / 4, "32": PPQ / 8,
};
export const TIME_DENOMINATORS = [1, 2, 4, 8, 16, 32];
export const MAX_TIME_NUMERATOR = 32;

const VOICE_DEFAULTS: Record<VoiceId, { name: string; clef: Voice["clef"] }> = {
  melody: { name: "Melodía", clef: "treble" },
  soprano: { name: "Soprano", clef: "treble" },
  alto: { name: "Alto", clef: "treble" },
  tenor: { name: "Tenor", clef: "bass" },
  bass: { name: "Bajo", clef: "bass" },
};

type NoteValue = Pick<NoteEvent, "duration" | "dotted" | "triplet">;

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

let idCounter = 0;

export function newId(): string {
  const webCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (webCrypto && typeof webCrypto.randomUUID === "function") return webCrypto.randomUUID();
  idCounter += 1;
  return `id-${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Four 4/4 measures in C, the five voices configured and empty, one scene spanning the score. */
export function createScore(mode: "single" | "satb" = "single"): Score {
  const measures: Measure[] = Array.from({ length: 4 }, () => ({ id: newId(), time: [4, 4], key: "C" }));
  return {
    version: 1,
    annotations: [],
    title: "Sin título",
    tempo: 100,
    masterVolume: 0.8,
    mode,
    measures,
    voices: VOICE_IDS.map(id => ({
      id,
      name: VOICE_DEFAULTS[id].name,
      clef: VOICE_DEFAULTS[id].clef,
      instrument: "Piano",
      volume: 0.8,
      mute: false,
      solo: false,
      events: [],
    })),
    scenes: [{
      id: newId(), title: "Escena 1", caption: "",
      startMeasure: 1, endMeasure: measures.length,
      aspect: "16:9", highlightVoice: "all",
    }],
  };
}

/** Voices that belong to the score's mode, in VOICE_IDS order (mute/solo do not matter here). */
export function activeVoices(score: Score): Voice[] {
  const wanted: readonly VoiceId[] = score.mode === "single" ? ["melody"] : ["soprano", "alto", "tenor", "bass"];
  return wanted.flatMap(id => score.voices.filter(voice => voice.id === id));
}

// ---------------------------------------------------------------------------
// Timing
// ---------------------------------------------------------------------------

/** Integer ticks of a note value. Dotted and triplet together cancel out (3/2 * 2/3). */
export function durationTicks(event: NoteValue): number {
  const base = BASE_TICKS[event.duration];
  if (base === undefined) throw new Error(`Duración no válida: ${String(event.duration)}`);
  let ticks = base;
  if (event.dotted) ticks = (ticks * 3) / 2;
  if (event.triplet) ticks = (ticks * 2) / 3;
  return ticks;
}

export function measureTicks(measure: Measure): number {
  const [numerator, denominator] = measure.time;
  return (numerator * PPQ * 4) / denominator;
}

/** Start tick of each measure plus the score end: length = measures + 1. */
function measureBounds(measures: Measure[]): number[] {
  const bounds = [0];
  for (const measure of measures) bounds.push(bounds[bounds.length - 1] + measureTicks(measure));
  return bounds;
}

/** Zero-based measure containing `tick`, or -1 when the tick is outside [0, end). */
function measureIndexAt(bounds: number[], tick: number): number {
  if (tick < 0 || tick >= bounds[bounds.length - 1]) return -1;
  let low = 0;
  let high = bounds.length - 2;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (bounds[middle] <= tick) low = middle;
    else high = middle - 1;
  }
  return low;
}

/** Clef overrides inherit until the next explicit change in the same voice. */
export function clefAt(score: Score, voiceId: VoiceId, oneBased: number): Voice["clef"] {
  if (!Number.isInteger(oneBased) || oneBased < 1 || oneBased > score.measures.length) throw new RangeError("Compás no válido");
  for (let index = oneBased - 1; index >= 0; index--) {
    const clef = score.measures[index].clefs?.[voiceId];
    if (clef) return clef;
  }
  const voice = score.voices.find(v => v.id === voiceId);
  if (!voice) throw new RangeError("Voz no válida");
  return voice.clef;
}

export function measureStart(score: Score, oneBased: number): number {
  if (!Number.isInteger(oneBased) || oneBased < 1 || oneBased > score.measures.length) {
    throw new RangeError(`El compás ${oneBased} no existe (la partitura tiene ${score.measures.length})`);
  }
  let start = 0;
  for (let index = 0; index < oneBased - 1; index++) start += measureTicks(score.measures[index]);
  return start;
}

export function scoreTicks(score: Score): number {
  return score.measures.reduce((total, measure) => total + measureTicks(measure), 0);
}

/**
 * One-based measure and beat (in quarter notes: 1 + offset / PPQ) of a tick.
 * Ticks at or past the score end are reported relative to the last measure.
 */
export function locateTick(score: Score, tick: number): { measure: number; beat: number } {
  if (!Number.isFinite(tick) || tick < 0) throw new RangeError(`Tick no válido: ${tick}`);
  if (score.measures.length === 0) throw new RangeError("La partitura no tiene compases");
  const bounds = measureBounds(score.measures);
  const found = measureIndexAt(bounds, tick);
  const index = found === -1 ? score.measures.length - 1 : found;
  return { measure: index + 1, beat: 1 + (tick - bounds[index]) / PPQ };
}

/**
 * Breaks a length into untupleted note values, largest first. Returns null
 * when the length is not a multiple of a thirty-second (e.g. a lone triplet gap).
 */
export function splitTicks(ticks: number): NoteValue[] | null {
  const unit = BASE_TICKS["32"];
  if (!Number.isInteger(ticks) || ticks <= 0 || ticks % unit !== 0) return null;
  const values: NoteValue[] = [];
  let remaining = ticks;
  for (const duration of DURATIONS) {
    // A dotted thirty-second is left out so the greedy split always terminates exactly.
    const candidates: NoteValue[] = duration === "32"
      ? [{ duration, dotted: false, triplet: false }]
      : [{ duration, dotted: true, triplet: false }, { duration, dotted: false, triplet: false }];
    for (const candidate of candidates) {
      const size = durationTicks(candidate);
      while (remaining >= size) {
        values.push(candidate);
        remaining -= size;
      }
    }
  }
  return values;
}

// ---------------------------------------------------------------------------
// Pitch
// ---------------------------------------------------------------------------

const LETTER_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SOLFEGE_LETTERS: Record<string, string> = { do: "C", re: "D", mi: "E", fa: "F", sol: "G", la: "A", si: "B" };
const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const PITCH_PATTERN = /^(do|re|mi|fa|sol|la|si|[a-g])(##|#|bb|b|x)?(-?\d{1,2})$/i;

type ParsedPitch = { letter: string; alter: number; octave: number; midi: number };

function parsePitch(pitch: string): ParsedPitch {
  if (typeof pitch !== "string") throw new Error(`Nota no válida: ${String(pitch)}`);
  const ascii = pitch.trim()
    .replace(/𝄪/g, "##").replace(/𝄫/g, "bb")
    .replace(/♯/g, "#").replace(/♭/g, "b").replace(/♮/g, "");
  const match = PITCH_PATTERN.exec(ascii);
  if (!match) throw new Error(`Nota no válida: "${pitch}"`);
  const name = match[1].toLowerCase();
  const letter = SOLFEGE_LETTERS[name] ?? name.toUpperCase();
  const accidental = (match[2] ?? "").toLowerCase();
  const alter = accidental === "x" ? 2 : accidental.startsWith("#") ? accidental.length : -accidental.length;
  const octave = Number(match[3]);
  const midi = 12 * (octave + 1) + LETTER_SEMITONES[letter] + alter;
  if (midi < 0 || midi > 127) throw new Error(`Nota fuera del rango MIDI 0..127: "${pitch}"`);
  return { letter, alter, octave, midi };
}

function spell(parsed: Pick<ParsedPitch, "letter" | "alter">): string {
  return parsed.letter + (parsed.alter > 0 ? "#".repeat(parsed.alter) : "b".repeat(-parsed.alter));
}

/** Canonical ASCII scientific spelling (C#4, Bbb3) of any accepted input (Do#4, c♯4, Cx4...). */
export function normalizePitch(pitch: string): string {
  const parsed = parsePitch(pitch);
  return spell(parsed) + parsed.octave;
}

/** Octaves follow the written letter: Cb4 = 59 (B3) and B#3 = 60 (C4). */
export function pitchToMidi(pitch: string): number {
  return parsePitch(pitch).midi;
}

export function midiToPitch(midi: number): string {
  if (!Number.isInteger(midi) || midi < 0 || midi > 127) throw new RangeError(`MIDI fuera de rango 0..127: ${midi}`);
  return SHARP_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
}

/** VexFlow key (c#/4, bbb/3) preserving the written spelling. */
export function pitchToVex(pitch: string): string {
  const parsed = parsePitch(pitch);
  return `${spell(parsed).toLowerCase()}/${parsed.octave}`;
}

/** Canonical chord: normalized spellings, no repeats, low to high. */
function normalizeChord(pitches: string[]): string[] {
  if (pitches.length > MAX_CHORD_PITCHES) throw new Error(`Un acorde admite como máximo ${MAX_CHORD_PITCHES} notas`);
  const normalized = pitches.map(normalizePitch);
  if (new Set(normalized).size !== normalized.length) throw new Error("El acorde repite una nota");
  return normalized
    .map((pitch, index) => ({ pitch, index, midi: pitchToMidi(pitch) }))
    .sort((a, b) => a.midi - b.midi || a.index - b.index)
    .map(entry => entry.pitch);
}

/**
 * Pitches separated by spaces or commas, optionally wrapped in brackets.
 * "", "[]", "rest", "silencio" and "r" mean a rest and return []. The result
 * is normalized and ordered low to high; invalid or repeated pitches throw.
 */
export function parsePitchList(text: string): string[] {
  let body = text.trim();
  if (body.startsWith("[") && body.endsWith("]")) body = body.slice(1, -1).trim();
  if (body === "" || /^(rest|silencio|r)$/i.test(body)) return [];
  return normalizeChord(body.split(/[\s,]+/).filter(Boolean));
}

/**
 * Whole octaves keep the written spelling (Bbb3 +12 = Bbb4). Any other shift
 * is respelled with sharps (midiToPitch), so the original spelling is lost.
 * Throws when a result leaves MIDI 0..127.
 */
export function transposePitches(pitches: string[], semitones: number): string[] {
  if (!Number.isInteger(semitones)) throw new Error(`Transposición no válida: ${semitones}`);
  return pitches.map(pitch => {
    const parsed = parsePitch(pitch);
    const midi = parsed.midi + semitones;
    if (midi < 0 || midi > 127) throw new RangeError(`"${pitch}" transpuesta ${semitones} semitonos sale del rango MIDI`);
    return semitones % 12 === 0 ? spell(parsed) + (parsed.octave + semitones / 12) : midiToPitch(midi);
  });
}

/** Key signature of a major ("Eb") or minor ("Cm", "F#m") key, within 7 sharps/flats. */
export function keySignature(key: string): { fifths: number; minor: boolean } {
  const match = typeof key === "string" ? /^([A-G])([#b]?)(m?)$/.exec(key) : null;
  if (!match) throw new Error(`Tonalidad no válida: "${String(key)}"`);
  const letterFifths: Record<string, number> = { F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5 };
  const minor = match[3] === "m";
  const fifths = letterFifths[match[1]] + (match[2] === "#" ? 7 : match[2] === "b" ? -7 : 0) - (minor ? 3 : 0);
  if (fifths < -7 || fifths > 7) throw new Error(`Tonalidad no válida: "${key}"`);
  return { fifths, minor };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function fail(path: string, message: string): never {
  throw new Error(`Partitura no válida: ${path}: ${message}`);
}

function asRecord(value: unknown, path: string, keys: readonly string[], optional:readonly string[]=[]): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail(path, "se esperaba un objeto");
  const record = value as Record<string, unknown>;
  for (const key of keys) if (!(key in record)) fail(path, `falta "${key}"`);
  for (const key of Object.keys(record)) if (!keys.includes(key)&&!optional.includes(key)) fail(path, `campo desconocido "${key}"`);
  return record;
}

function asArray(value: unknown, path: string, min: number, max: number): unknown[] {
  if (!Array.isArray(value)) fail(path, "se esperaba una lista");
  if (value.length < min || value.length > max) fail(path, `debe tener entre ${min} y ${max} elementos`);
  return value;
}

function asString(value: unknown, path: string, maxLength: number, allowEmpty = true): string {
  if (typeof value !== "string") fail(path, "se esperaba un texto");
  if (value.length > maxLength) fail(path, `admite como máximo ${maxLength} caracteres`);
  if (!allowEmpty && value.trim() === "") fail(path, "no puede estar vacío");
  return value;
}

function asNumber(value: unknown, path: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(path, "se esperaba un número");
  if (value < min || value > max) fail(path, `debe estar entre ${min} y ${max}`);
  return value;
}

function asInteger(value: unknown, path: string, min: number, max: number): number {
  const number = asNumber(value, path, min, max);
  if (!Number.isInteger(number)) fail(path, "se esperaba un entero");
  return number;
}

function asBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") fail(path, "se esperaba verdadero o falso");
  return value;
}

function asOneOf<T extends string>(value: unknown, path: string, options: readonly T[]): T {
  if (typeof value !== "string" || !options.includes(value as T)) fail(path, `debe ser uno de: ${options.join(", ")}`);
  return value as T;
}

function uniqueId(value: unknown, path: string, seen: Set<string>): string {
  const id = asString(value, path, 64, false);
  if (seen.has(id)) fail(path, `id repetido "${id}"`);
  seen.add(id);
  return id;
}

/**
 * Strict validation of an untrusted version-1 score. Unknown fields, missing
 * fields and unsupported versions are rejected; nothing is filled in with
 * defaults. The result is a fresh copy normalized in three documented ways:
 * voices in VOICE_IDS order, each voice's events ordered by start, and pitches
 * in canonical spelling ordered low to high.
 *
 * Rules: 1..128 measures, at most 4096 events and 32 scenes; ids unique per
 * kind (measures, events across all voices, scenes); every event starts and
 * ends inside one measure (bar crossings must be written as tied events) and
 * events of a voice never overlap. `tie` is only a request: exports honour it
 * when the next event is contiguous with the same pitches.
 */
export function validateScore(value: unknown): Score {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const version = (value as Record<string, unknown>).version;
    if (version !== 1) fail("version", `versión no soportada (${String(version)})`);
  }
  const root = asRecord(value, "partitura", ["version", "title", "tempo", "masterVolume", "mode", "measures", "voices", "scenes"],["annotations"]);

  const measureIds = new Set<string>();
  const measures = asArray(root.measures, "measures", 1, MAX_MEASURES).map((item, index): Measure => {
    const path = `measures[${index}]`;
    const measure = asRecord(item, path, ["id", "time", "key"], ["clefs", "keyChange", "timeChange"]);
    const time = asArray(measure.time, `${path}.time`, 2, 2);
    const numerator = asInteger(time[0], `${path}.time[0]`, 1, MAX_TIME_NUMERATOR);
    const denominator = asInteger(time[1], `${path}.time[1]`, 1, 32);
    if (!TIME_DENOMINATORS.includes(denominator)) fail(`${path}.time[1]`, "denominador no soportado");
    const key = asString(measure.key, `${path}.key`, 3, false);
    try {
      keySignature(key);
    } catch {
      fail(`${path}.key`, `tonalidad no válida "${key}"`);
    }
    let clefs: Measure["clefs"];
    if (measure.clefs !== undefined) {
      const raw = asRecord(measure.clefs, `${path}.clefs`, [], VOICE_IDS);
      clefs = {};
      for (const id of VOICE_IDS) if (raw[id] !== undefined) clefs[id] = asOneOf(raw[id], `${path}.clefs.${id}`, ["treble", "bass"] as const);
    }
    return { id: uniqueId(measure.id, `${path}.id`, measureIds), time: [numerator, denominator], key, ...(clefs ? {clefs} : {}),
      ...(measure.keyChange!==undefined ? {keyChange:asBoolean(measure.keyChange, `${path}.keyChange`)} : {}),
      ...(measure.timeChange!==undefined ? {timeChange:asBoolean(measure.timeChange, `${path}.timeChange`)} : {}) };
  });
  const bounds = measureBounds(measures);
  const total = bounds[bounds.length - 1];

  const rawVoices = asArray(root.voices, "voices", VOICE_IDS.length, VOICE_IDS.length);
  const eventIds = new Set<string>();
  let eventCount = 0;
  const voicesById = new Map<VoiceId, Voice>();
  rawVoices.forEach((item, index) => {
    const path = `voices[${index}]`;
    const voice = asRecord(item, path, ["id", "name", "clef", "instrument", "volume", "mute", "solo", "events"]);
    const id = asOneOf<VoiceId>(voice.id, `${path}.id`, VOICE_IDS);
    if (voicesById.has(id)) fail(`${path}.id`, `voz repetida "${id}"`);
    const rawEvents = asArray(voice.events, `${path}.events`, 0, MAX_EVENTS);
    eventCount += rawEvents.length;
    if (eventCount > MAX_EVENTS) fail("voices", `la partitura admite como máximo ${MAX_EVENTS} eventos`);

    const events = rawEvents.map((rawEvent, eventIndex): NoteEvent => {
      const eventPath = `${path}.events[${eventIndex}]`;
      const event = asRecord(rawEvent, eventPath, ["id", "start", "duration", "dotted", "triplet", "pitches", "tie"], ["ornament", "text"]);
      const rawPitches = asArray(event.pitches, `${eventPath}.pitches`, 0, MAX_CHORD_PITCHES);
      let pitches: string[];
      try {
        pitches = normalizeChord(rawPitches.map((pitch, pitchIndex) => asString(pitch, `${eventPath}.pitches[${pitchIndex}]`, 16)));
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("Partitura no válida")) throw error;
        fail(`${eventPath}.pitches`, error instanceof Error ? error.message : "notas no válidas");
      }
      return {
        id: uniqueId(event.id, `${eventPath}.id`, eventIds),
        start: asInteger(event.start, `${eventPath}.start`, 0, Math.max(0, total - 1)),
        duration: asOneOf<Duration>(event.duration, `${eventPath}.duration`, DURATIONS),
        dotted: asBoolean(event.dotted, `${eventPath}.dotted`),
        triplet: asBoolean(event.triplet, `${eventPath}.triplet`),
        pitches,
        tie: asBoolean(event.tie, `${eventPath}.tie`),
        ...(event.ornament !== undefined ? {ornament: asBoolean(event.ornament, `${eventPath}.ornament`)} : {}),
        ...(event.text !== undefined ? {text: asString(event.text, `${eventPath}.text`, 1000)} : {}),
      };
    }).sort((a, b) => a.start - b.start);

    let previousEnd = 0;
    for (const event of events) {
      const end = event.start + durationTicks(event);
      const measureIndex = measureIndexAt(bounds, event.start);
      if (end > total) fail(`${path}.events`, `el evento "${event.id}" termina después del final de la partitura`);
      if (end > bounds[measureIndex + 1]) {
        fail(`${path}.events`, `el evento "${event.id}" cruza la barra del compás ${measureIndex + 1}; divídelo con ligadura`);
      }
      if (event.start < previousEnd) fail(`${path}.events`, `el evento "${event.id}" se traslapa con el anterior`);
      previousEnd = end;
    }

    voicesById.set(id, {
      id,
      name: asString(voice.name, `${path}.name`, 60),
      clef: asOneOf(voice.clef, `${path}.clef`, ["treble", "bass"] as const),
      instrument: asOneOf<Instrument>(voice.instrument, `${path}.instrument`, INSTRUMENTS),
      volume: asNumber(voice.volume, `${path}.volume`, 0, 1),
      mute: asBoolean(voice.mute, `${path}.mute`),
      solo: asBoolean(voice.solo, `${path}.solo`),
      events,
    });
  });

  const sceneIds = new Set<string>();
  const scenes = asArray(root.scenes, "scenes", 0, MAX_SCENES).map((item, index): Scene => {
    const path = `scenes[${index}]`;
    const scene = asRecord(item, path, ["id", "title", "caption", "startMeasure", "endMeasure", "aspect", "highlightVoice"]);
    const startMeasure = asInteger(scene.startMeasure, `${path}.startMeasure`, 1, measures.length);
    const endMeasure = asInteger(scene.endMeasure, `${path}.endMeasure`, 1, measures.length);
    if (endMeasure < startMeasure) fail(`${path}.endMeasure`, "no puede ser anterior a startMeasure");
    return {
      id: uniqueId(scene.id, `${path}.id`, sceneIds),
      title: asString(scene.title, `${path}.title`, 200),
      caption: asString(scene.caption, `${path}.caption`, 1000),
      startMeasure,
      endMeasure,
      aspect: asOneOf(scene.aspect, `${path}.aspect`, ["16:9", "9:16"] as const),
      highlightVoice: asOneOf(scene.highlightVoice, `${path}.highlightVoice`, [...VOICE_IDS, "all"] as const),
    };
  });

  const annotationIds=new Set([...measureIds,...eventIds,...sceneIds]);
  const annotations=asArray(root.annotations??[],"annotations",0,MAX_ANNOTATIONS).map((item,index)=>{
    const path=`annotations[${index}]`, annotation=asRecord(item,path,["id","measure","beat","text","kind"]);
    const measure=asInteger(annotation.measure,`${path}.measure`,1,measures.length);
    const beat=asNumber(annotation.beat,`${path}.beat`,1,1+measureTicks(measures[measure-1])/PPQ);
    if((beat-1)*PPQ>=measureTicks(measures[measure-1]))fail(`${path}.beat`,"debe estar dentro del compás");
    return {id:uniqueId(annotation.id,`${path}.id`,annotationIds),measure,beat,
      text:asString(annotation.text,`${path}.text`,200,false).trim(),
      kind:asOneOf(annotation.kind,`${path}.kind`,["roman","text"] as const)};
  });
  return {
    version: 1,
    annotations,
    title: asString(root.title, "title", 200),
    tempo: asNumber(root.tempo, "tempo", 20, 400),
    masterVolume: asNumber(root.masterVolume, "masterVolume", 0, 1),
    mode: asOneOf(root.mode, "mode", ["single", "satb"] as const),
    measures,
    // Every VOICE_IDS entry is present: five voices, none repeated.
    voices: VOICE_IDS.map(id => voicesById.get(id)!),
    scenes,
  };
}

// ---------------------------------------------------------------------------
// Import and legacy migration
// ---------------------------------------------------------------------------

const LEGACY_TICK = PPQ / 4; // the legacy grid counts sixteenths: 4 ticks per quarter
const LEGACY_DURATIONS: Record<string, NoteValue> = {
  w: { duration: "w", dotted: false, triplet: false },
  h: { duration: "h", dotted: false, triplet: false },
  q: { duration: "q", dotted: false, triplet: false },
  "8": { duration: "8", dotted: false, triplet: false },
  d: { duration: "8", dotted: false, triplet: false },
  "16": { duration: "16", dotted: false, triplet: false },
  s: { duration: "16", dotted: false, triplet: false },
  "w.": { duration: "w", dotted: true, triplet: false },
  "h.": { duration: "h", dotted: true, triplet: false },
  "q.": { duration: "q", dotted: true, triplet: false },
  "8.": { duration: "8", dotted: true, triplet: false },
  "d.": { duration: "8", dotted: true, triplet: false },
  "16.": { duration: "16", dotted: true, triplet: false },
  "s.": { duration: "16", dotted: true, triplet: false },
};

function legacyFail(message: string): never {
  throw new Error(`Proyecto anterior no válido: ${message}`);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Legacy VexFlow key ("c#/4", "cn/4") to scientific spelling. */
function legacyKeyToPitch(key: unknown): string {
  const match = typeof key === "string" ? /^([a-g])(n|#{1,2}|b{1,2})?\/(-?\d{1,2})$/i.exec(key.trim()) : null;
  if (!match) legacyFail(`nota no reconocida "${String(key)}"`);
  const accidental = match[2] && match[2].toLowerCase() !== "n" ? match[2] : "";
  return normalizePitch(match[1] + accidental + match[3]);
}

/**
 * Migrates the JSON written by serializeState in public/tools/secuenciador.html.
 *
 * Kept: mode (quartet -> satb), instrument (applied to every voice; "Sinte" ->
 * Synth), measure count, time and key per measure (inherited as in the legacy
 * editor), notes with their spelling, chords and ties. Legacy ticks (4 per
 * quarter) become 240 new ticks. A note that crosses a bar line is split into
 * tied pieces. Rests were implicit gaps and stay implicit.
 *
 * Ciphers become measure/beat harmony annotations. Note text, red ornament
 * markers and melodic clef changes are preserved (SATB clefs are
 * fixed). Tempo and title were never saved, so they take createScore's values.
 *
 * Rejected: unknown tracks or durations, overlapping notes in a track, and
 * notes that start or end past the last measure.
 */
function migrateLegacy(state: Record<string, unknown>): Score {
  const project = state.projectData;
  if (!isPlainObject(project)) legacyFail("falta projectData");
  const mode = project.mode === "quartet" ? "satb" : project.mode === "single" ? "single" : legacyFail(`modo desconocido "${String(project.mode)}"`);
  const score = createScore(mode);

  const instrument = project.instrument === "Sinte" ? "Synth" : project.instrument;
  if (instrument !== undefined && !INSTRUMENTS.includes(instrument as Instrument)) {
    legacyFail(`instrumento desconocido "${String(instrument)}"`);
  }

  const totalMeasures = state.totalMeasures;
  if (typeof totalMeasures !== "number" || !Number.isInteger(totalMeasures) || totalMeasures < 1 || totalMeasures > MAX_MEASURES) {
    legacyFail(`totalMeasures debe ser un entero entre 1 y ${MAX_MEASURES}`);
  }
  const settings = isPlainObject(state.measureSettings) ? state.measureSettings : {};
  let time: [number, number] = [4, 4];
  let key = "C";
  score.measures = [];
  for (let index = 0; index < totalMeasures; index++) {
    const setting = settings[String(index)];
    if (setting !== undefined && setting !== null) {
      if (!isPlainObject(setting)) legacyFail(`ajustes del compás ${index + 1} no válidos`);
      const match = typeof setting.time === "string" ? /^(\d{1,2})\/(\d{1,2})$/.exec(setting.time) : null;
      if (!match) legacyFail(`compás ${index + 1}: indicación de compás no válida "${String(setting.time)}"`);
      time = [Number(match[1]), Number(match[2])];
      if (typeof setting.key !== "string") legacyFail(`compás ${index + 1}: falta la tonalidad`);
      key = setting.key;
    }
    score.measures.push({ id: newId(), time: [time[0], time[1]], key,
      ...(isPlainObject(setting)?{keyChange:true,timeChange:true}:{}),
      ...(isPlainObject(setting) && (setting.clef === "bass" || setting.clef === "treble") ? {clefs: {melody: setting.clef}} : {}) });
  }
  score.scenes[0].endMeasure = totalMeasures;
  const firstSetting = settings["0"];
  const melodyClef = isPlainObject(firstSetting) && firstSetting.clef === "bass" ? "bass" : "treble";
  for (const voice of score.voices) {
    if (instrument !== undefined) voice.instrument = instrument as Instrument;
    if (voice.id === "melody") voice.clef = melodyClef;
  }
  // Validate the measures first so a bad time signature cannot produce NaN bounds.
  validateScore(score);
  const bounds = measureBounds(score.measures);
  const total = bounds[bounds.length - 1];

  if (!isPlainObject(project.tracks)) legacyFail("faltan las pistas");
  let entryCount = 0;
  for (const [trackName, entries] of Object.entries(project.tracks)) {
    const voice = score.voices.find(candidate => candidate.id === trackName);
    if (!voice) legacyFail(`pista desconocida "${trackName}"`);
    if (!Array.isArray(entries)) legacyFail(`la pista "${trackName}" no es una lista`);
    entryCount += entries.length;
    if (entryCount > MAX_EVENTS) legacyFail(`el proyecto supera ${MAX_EVENTS} eventos`);

    const notes = entries.map(entry => {
      if (!Array.isArray(entry) || entry.length !== 2 || !isPlainObject(entry[1])) legacyFail(`entrada mal formada en "${trackName}"`);
      const [tick, note] = entry as [unknown, Record<string, unknown>];
      if (typeof tick !== "number" || !Number.isInteger(tick) || tick < 0) legacyFail(`posición no válida en "${trackName}": ${String(tick)}`);
      const value = typeof note.duration === "string" ? LEGACY_DURATIONS[note.duration] : undefined;
      if (!value) legacyFail(`duración desconocida "${String(note.duration)}" en "${trackName}"`);
      const isRest = note.type === "rest";
      if (!isRest && (!Array.isArray(note.keys) || note.keys.length === 0)) legacyFail(`nota sin alturas en "${trackName}"`);
      let pitches: string[];
      try {
        pitches = isRest ? [] : normalizeChord((note.keys as unknown[]).map(legacyKeyToPitch));
      } catch (error) {
        legacyFail(error instanceof Error ? error.message.replace(/^Proyecto anterior no válido: /, "") : "nota no válida");
      }
      return { start: tick * LEGACY_TICK, ticks: durationTicks(value), pitches, tie: !isRest && note.isTied === true,
        ...(note.isOrnament !== undefined ? {ornament: asBoolean(note.isOrnament, "legacy.isOrnament")} : {}),
        ...(note.text !== undefined ? {text: asString(note.text, "legacy.text", 1000)} : {}) };
    }).sort((a, b) => a.start - b.start);

    let previousEnd = 0;
    for (const note of notes) {
      const at = locateTickLabel(bounds, note.start);
      if (note.start < previousEnd) legacyFail(`notas traslapadas en "${trackName}" (${at})`);
      if (note.start + note.ticks > total) legacyFail(`una nota de "${trackName}" (${at}) queda fuera de los ${totalMeasures} compases`);
      previousEnd = note.start + note.ticks;

      // Split at every bar line the note crosses; pieces are tied together.
      let position = note.start;
      let remaining = note.ticks;
      const pieces: NoteEvent[] = [];
      while (remaining > 0) {
        const room = bounds[measureIndexAt(bounds, position) + 1] - position;
        const segment = Math.min(remaining, room);
        for (const value of splitTicks(segment) ?? legacyFail(`duración no representable en "${trackName}" (${at})`)) {
          pieces.push({ id: newId(), start: position, ...value, pitches: [...note.pitches], tie: note.pitches.length > 0,
            ...(note.ornament !== undefined ? {ornament:note.ornament} : {}),
            ...(note.text !== undefined && pieces.length === 0 ? {text:note.text} : {}) });
          position += durationTicks(value);
        }
        remaining -= segment;
      }
      pieces[pieces.length - 1].tie = note.tie;
      voice.events.push(...pieces);
    }
  }
  if(state.cipherData!==undefined) {
    if(!isPlainObject(state.cipherData))legacyFail("cifrados no válidos");
    for(const [bar,ciphers] of Object.entries(state.cipherData)) {
      if(!isPlainObject(ciphers))legacyFail("cifrados de compás no válidos");
      if(!/^\d+$/.test(bar))legacyFail("posición de cifrado no válida");
      for(const [tick,text] of Object.entries(ciphers)) {
        if(!/^\d+(\.\d+)?$/.test(tick)||typeof text!=="string")legacyFail("cifrado no válido");
        score.annotations!.push({id:newId(),measure:Number(bar)+1,beat:1+Number(tick)/4,text,kind:"roman"});
      }
    }
  }
  return score;
}

function locateTickLabel(bounds: number[], tick: number): string {
  const index = measureIndexAt(bounds, tick);
  return index === -1 ? "después del último compás" : `compás ${index + 1}`;
}

/**
 * Loads a project file: a version-1 score, or a legacy serializeState project
 * (see migrateLegacy for what is kept and dropped). All or nothing: the
 * result always went through validateScore, otherwise an Error is thrown.
 */
export function importScore(text: string): Score {
  if (typeof text !== "string" || text.length > MAX_IMPORT_CHARS) throw new Error("El archivo es demasiado grande o no es texto");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("El archivo no es JSON válido");
  }
  if (!isPlainObject(data)) throw new Error("El archivo no contiene un proyecto del secuenciador");
  if ("projectData" in data && !("version" in data)) return validateScore(migrateLegacy(data));
  return validateScore(data);
}

// ---------------------------------------------------------------------------
// Text grammar
// ---------------------------------------------------------------------------

const TEXT_VOICES: Record<string, VoiceId> = {
  melody: "melody", melodia: "melody", soprano: "soprano", alto: "alto", tenor: "tenor", bass: "bass", bajo: "bass",
};
const TEXT_DURATIONS: Record<string, Duration> = {
  redonda: "w", blanca: "h", negra: "q", corchea: "8", semicorchea: "16", fusa: "32",
  entera: "w", mitad: "h", cuarto: "q", octavo: "8", dieciseisavo: "16", treintaidosavo: "32",
  whole: "w", half: "h", quarter: "q", eighth: "8", sixteenth: "16", "thirty-second": "32", thirtysecond: "32",
  w: "w", h: "h", q: "q", "8": "8", "16": "16", "32": "32",
};
const DOTTED_WORDS = ["puntillo", "dotted", "."];
const TRIPLET_WORDS = ["tresillo", "triplet"];
const TIE_WORDS = ["ligadura", "ligada", "tie"];

/** Lowercase without diacritics, for keywords only ("Compás" -> "compas"). */
function fold(word: string): string {
  return word.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function textDuration(token: string): { duration: Duration; dotted: boolean } | null {
  const word = fold(token);
  const dotted = word.length > 1 && word.endsWith(".");
  const duration = TEXT_DURATIONS[dotted ? word.slice(0, -1) : word];
  return duration ? { duration, dotted } : null;
}

/**
 * Parses the text notation onto a copy of `base` (never mutated).
 *
 * Lines hold items separated by ";". Blank lines and comments ("#..." lines,
 * or anything after "//") are ignored. Keywords ignore case and accents.
 *   voz|voice <melody|melodia|soprano|alto|tenor|bass|bajo>
 *   compas|compás|measure <N>
 *   <note> <value> [puntillo|dotted] [tresillo|triplet] [ligadura|tie]
 * where <note> is one pitch (C4, Bb3, Do#4), a chord ("[C4 E4 G4]" or
 * "C4 E4 G4"), or a rest (silencio, rest, r, []), and <value> is
 * redonda/blanca/negra/corchea/semicorchea/fusa or w/h/q/8/16/32 ("q." is
 * also dotted).
 *
 * Rules:
 * - Writing starts in measure 1 of the mode's first voice (melody / soprano).
 *   "compas N" moves the cursor to the start of measure N; "voz X" switches
 *   voice and returns to the start of the last measure named. Only voices of
 *   the score's mode can be written.
 * - Notes follow each other; when a measure fills up exactly the cursor goes
 *   on into the next one. A value that does not fit in the rest of its measure
 *   is an error (it is never split or tied automatically), and so is writing
 *   past the last measure: the score is never extended.
 * - Replacement is per voice and measure: each measure that receives at least
 *   one note or rest loses all its previous events in that voice. Everything
 *   else in `base` stays. Naming a measure without writing in it changes nothing.
 * - Writing the same voice and position twice in one text is a collision.
 *
 * After a placement error the rest of that voice/measure block is skipped, to
 * avoid a cascade of follow-up errors. On any issue `score` is null; `count`
 * is the number of notes and rests that were placed successfully.
 */
export function parseScoreText(text: string, base: Score): ParseResult {
  const issues: TextIssue[] = [];
  let count = 0;
  const bounds = measureBounds(base.measures);
  const total = bounds[bounds.length - 1];
  const writable = new Set(activeVoices(base).map(voice => voice.id));
  const placed = new Map<VoiceId, NoteEvent[]>();
  const touched = new Map<VoiceId, Set<number>>();

  let voiceId: VoiceId = base.mode === "single" ? "melody" : "soprano";
  let namedMeasure = 1;
  let cursor = 0;
  let blocked = false; // after an error, until the next valid directive

  const lines = String(text).split(/\r?\n/);
  lines.forEach((rawLine, lineIndex) => {
    const line = lineIndex + 1;
    const content = rawLine.replace(/\/\/.*$/, "").trim();
    if (content === "" || content.startsWith("#")) return;

    for (const item of content.split(";").map(part => part.trim()).filter(Boolean)) {
      const words = item.split(/\s+/);
      const directive = /^(voz|voice|compas|measure)(?![a-z0-9#])\s*[:=]?\s*(.*)$/.exec(fold(item));
      const keyword = directive ? directive[1] : "";

      if (keyword === "voz" || keyword === "voice") {
        const name = directive![2];
        const target = TEXT_VOICES[name];
        if (!target) {
          issues.push({ line, message: `Voz desconocida "${name}". Usa melody, soprano, alto, tenor o bass.` });
          blocked = true;
        } else if (!writable.has(target)) {
          issues.push({ line, message: `La voz "${name}" no existe en el modo ${base.mode === "single" ? "de una voz" : "SATB"}.` });
          blocked = true;
        } else {
          voiceId = target;
          cursor = bounds[namedMeasure - 1];
          blocked = false;
        }
        continue;
      }

      if (keyword === "compas" || keyword === "measure") {
        const argument = directive![2];
        const number = /^\d{1,4}$/.test(argument) ? Number(argument) : NaN;
        if (!Number.isInteger(number) || number < 1) {
          issues.push({ line, message: `Número de compás no válido: "${argument}".` });
          blocked = true;
        } else if (number > base.measures.length) {
          issues.push({ line, message: `El compás ${number} no existe: la partitura tiene ${base.measures.length} compases.` });
          blocked = true;
        } else {
          namedMeasure = number;
          cursor = bounds[number - 1];
          blocked = false;
        }
        continue;
      }

      // A note, chord or rest.
      let pitchText: string;
      let tail: string[];
      if (item.startsWith("[")) {
        const close = item.indexOf("]");
        if (close === -1) {
          issues.push({ line, message: `Falta cerrar el corchete en "${item}".` });
          continue;
        }
        pitchText = item.slice(0, close + 1);
        tail = item.slice(close + 1).trim().split(/\s+/).filter(Boolean);
      } else {
        const valueIndex = words.findIndex(word => textDuration(word) !== null);
        pitchText = words.slice(0, valueIndex === -1 ? words.length : valueIndex).join(" ");
        tail = valueIndex === -1 ? [] : words.slice(valueIndex);
      }
      const value = tail.length > 0 ? textDuration(tail[0]) : null;
      if (!value) {
        issues.push({ line, message: `Falta la figura (negra, corchea, q, 8...) en "${item}".` });
        continue;
      }
      if (pitchText === "") {
        issues.push({ line, message: `Falta la nota o "silencio" antes de la figura en "${item}".` });
        continue;
      }

      let pitches: string[];
      try {
        pitches = parsePitchList(pitchText);
      } catch (error) {
        issues.push({ line, message: error instanceof Error ? error.message : `Nota no válida en "${item}".` });
        continue;
      }

      let { dotted } = value;
      let triplet = false;
      let tie = false;
      let badModifier: string | null = null;
      for (const modifier of tail.slice(1).map(fold)) {
        if (DOTTED_WORDS.includes(modifier)) dotted = true;
        else if (TRIPLET_WORDS.includes(modifier)) triplet = true;
        else if (TIE_WORDS.includes(modifier)) tie = true;
        else if (modifier !== "con" && modifier !== "de") badModifier = modifier;
      }
      if (badModifier !== null) {
        issues.push({ line, message: `No se entiende "${badModifier}" en "${item}".` });
        continue;
      }
      if (tie && pitches.length === 0) {
        issues.push({ line, message: "Un silencio no puede llevar ligadura." });
        continue;
      }
      if (blocked) continue;

      const ticks = durationTicks({ duration: value.duration, dotted, triplet });
      const measureIndex = measureIndexAt(bounds, cursor);
      if (measureIndex === -1) {
        issues.push({ line, message: `No quedan compases: la partitura tiene ${base.measures.length} y "${item}" no cabe.` });
        blocked = true;
        continue;
      }
      const end = cursor + ticks;
      if (end > bounds[measureIndex + 1] || end > total) {
        const excess = (end - bounds[measureIndex + 1]) / PPQ;
        issues.push({ line, message: `"${item}" no cabe en el compás ${measureIndex + 1}: se pasa por ${Number(excess.toFixed(3))} tiempos de negra.` });
        blocked = true;
        continue;
      }
      const voiceEvents = placed.get(voiceId) ?? [];
      const start = cursor;
      if (voiceEvents.some(other => start < other.start + durationTicks(other) && other.start < end)) {
        issues.push({ line, message: `Colisión en ${voiceId}, compás ${measureIndex + 1}: "${item}" cae sobre una nota ya escrita en este texto.` });
        blocked = true;
        continue;
      }

      voiceEvents.push({ id: newId(), start, duration: value.duration, dotted, triplet, pitches, tie });
      placed.set(voiceId, voiceEvents);
      const measures = touched.get(voiceId) ?? new Set<number>();
      measures.add(measureIndex);
      touched.set(voiceId, measures);
      cursor = end;
      count += 1;
    }
  });

  if (issues.length > 0) return { score: null, issues, count };

  const result = JSON.parse(JSON.stringify(base)) as Score;
  for (const voice of result.voices) {
    const replaced = touched.get(voice.id);
    if (!replaced) continue;
    voice.events = [
      ...voice.events.filter(event => !replaced.has(measureIndexAt(bounds, event.start))),
      ...(placed.get(voice.id) ?? []),
    ].sort((a, b) => a.start - b.start);
  }
  try {
    return { score: validateScore(result), issues, count };
  } catch (error) {
    // Only reachable when `base` itself was not a valid score.
    return { score: null, issues: [{ line: 0, message: error instanceof Error ? error.message : "Partitura no válida." }], count };
  }
}
