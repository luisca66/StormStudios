/**
 * Storyboard contract: how an agent describes the stills of a lesson video.
 *
 * An agent reads a lesson (content/course/<locale>/<lesson>.mdx), writes one storyboard JSON per video
 * (content/storyboards/<locale>/<lesson>.json) and runs `npm run stills -- <storyboard.json>`.
 * The capture script renders every still at an exact size on /<locale>/sequencer/v4/stage and writes
 * PNGs plus a manifest.json (order, suggested duration, narration) that a later video step consumes.
 *
 * Positions are musical, never pixels: measure (one-based) and beat (quarter-note units, one-based,
 * fractions allowed: 2.5 = the "and" of beat 2), exactly like the editor inspector.
 */
import type { Score, ScoreAnnotation, VoiceId } from "./types";

export const STORYBOARD_VERSION = 1;

export type StillAspect = "16:9" | "9:16" | "1:1";
export type StillTheme = "storm" | "paper";
export type HighlightColor = "amber" | "rose" | "cyan" | "violet" | "green";

/** A score written with the editor's text grammar ("voz soprano / compas 1 / C4 negra; ..."). */
export type ScoreSetup = {
  mode: "single" | "satb";
  title?: string;
  key?: string; // "C", "G", "Bb", ... (major keys as in the editor)
  time?: [number, number]; // default [4, 4]
  measures: number; // measures to create before the text is applied
  tempo?: number;
  clef?: "treble" | "bass"; // melody clef in single mode
};

export type ProjectSource =
  | { file: string } // Score JSON saved from the editor ("Guardar JSON"), path relative to the storyboard
  | { score: Score }
  | { setup: ScoreSetup; text: string; annotations?: Array<Omit<ScoreAnnotation, "id">> };

export type Position = { measure: number; beat?: number };

export type Highlight = {
  measure: number;
  endMeasure?: number; // inclusive; defaults to measure
  beat?: number; // start beat inside `measure`; omitted = whole measure
  endBeat?: number; // exclusive end beat inside `endMeasure`
  voice?: VoiceId; // omitted = all visible voices
  color?: HighlightColor; // default "amber"
  label?: string; // short text drawn next to the box ("5ª justa", "semitono")
};

/** Colors specific notes (noteheads) without boxing them. */
export type NoteMark = { measure: number; beat: number; voice?: VoiceId; color?: HighlightColor; label?: string };

export type Still = {
  id: string; // file name without extension: "01-titulo" → 01-titulo.png. Unique, [a-z0-9-]
  kind?: "score" | "title"; // "title" = card with heading/caption only (no project needed)
  project?: string; // key in Storyboard.projects (required for kind "score")
  heading?: string; // large text drawn on the still
  caption?: string; // one or two lines under the heading
  narration?: string; // what the voice-over says while this still is on screen (not drawn)
  duration?: number; // suggested seconds on screen (default 5)
  measures?: [number, number]; // inclusive range; default: whole score
  voices?: VoiceId[] | "all"; // voices to show (others hidden). Default "all"
  focusVoice?: VoiceId; // shown at full strength; other visible voices dimmed
  reveal?: Position; // progressive build: music at/after this position is hidden
  highlights?: Highlight[];
  marks?: NoteMark[];
  cursor?: Position; // draws the playhead at this position
  showCiphers?: boolean; // roman numerals / annotations (default true)
  audio?: boolean; // export Piano WAV of the visible range
};

export type Storyboard = {
  version: typeof STORYBOARD_VERSION;
  lesson: string; // lessonId, e.g. "03-leccion-2"
  source?: string; // where the narration comes from (script file), for humans and agents
  locale: "es" | "en";
  title: string;
  format?: { aspect?: StillAspect; width?: number; theme?: StillTheme }; // defaults 16:9, 1920, storm
  projects: Record<string, ProjectSource>;
  stills: Still[];
};

/** Written next to the PNGs by the capture script. */
export type StillsManifest = {
  lesson: string;
  locale: "es" | "en";
  title: string;
  width: number;
  height: number;
  generatedAt: string;
  stills: Array<{ id: string; file: string; duration: number; heading?: string; caption?: string; narration?: string; audio?: string; music?: { from: number; to: number; tempo: number; beats: Array<{ cursor: Position; time: number }> } }>;
};
