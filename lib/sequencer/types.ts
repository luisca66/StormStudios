/** Shared score contract. 960 PPQ represents all supported dotted/triplet values exactly. */
export const PPQ = 960;
export const VOICE_IDS = ["melody", "soprano", "alto", "tenor", "bass"] as const;
export type VoiceId = typeof VOICE_IDS[number];
export const INSTRUMENTS = ["Piano", "Cello", "Corno", "Coro", "Fagot", "Synth"] as const;
export type Instrument = typeof INSTRUMENTS[number];
export type Duration = "w" | "h" | "q" | "8" | "16" | "32";
export type Pitch = string; // Scientific spelling, e.g. C#4, Bbb3; MIDI 0..127.
export type NoteEvent = {
  id: string;
  start: number; // integer ticks from score start
  duration: Duration;
  dotted: boolean;
  triplet: boolean;
  pitches: Pitch[]; // [] = rest
  tie: boolean; // to next event in same voice, if same pitches and contiguous
  ornament?: boolean; // legacy pedagogical red-note marker, not a grace note
  text?: string; // preserve text attached to imported notes
};
export type Voice = {
  id: VoiceId;
  name: string;
  clef: "treble" | "bass";
  instrument: Instrument;
  volume: number; // 0..1
  mute: boolean;
  solo: boolean;
  events: NoteEvent[];
};
export type Measure = { id: string; time: [number, number]; key: string; clefs?: Partial<Record<VoiceId, Voice["clef"]>>;
  keyChange?: boolean; timeChange?: boolean; // explicit boundaries, even if the value repeats
};
export type Scene = {
  id: string; title: string; caption: string;
  startMeasure: number; endMeasure: number; // one-based inclusive
  aspect: "16:9" | "9:16";
  highlightVoice: VoiceId | "all";
};
export type ScoreAnnotation = { id:string; measure:number; beat:number; text:string; kind:"roman"|"text" };
export type Score = {
  version: 1; title: string; tempo: number; masterVolume: number;
  mode: "single" | "satb";
  measures: Measure[]; voices: Voice[]; scenes: Scene[];
  annotations?:ScoreAnnotation[];
};
export type TextIssue = { line: number; message: string };
export type ParseResult = { score: Score | null; issues: TextIssue[]; count: number };
