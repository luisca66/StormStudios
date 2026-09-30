import { z } from "zod";
import { activeVoices, createScore, importScore, measureStart, measureTicks, newId, parseScoreText, validateScore } from "./model";
import { PPQ, VOICE_IDS, type Score } from "./types";
import type { ProjectSource, Storyboard } from "./storyboard";

export const STILL_COLORS = { amber: "#f5b942", rose: "#f0567a", cyan: "#3cc7e0", violet: "#8b5cf6", green: "#34c77b" } as const;
const positive = z.number().finite().positive();
const measure = positive.int();
const voice = z.enum(VOICE_IDS);
const position = z.object({ measure, beat: positive.optional() }).strict();
const color = z.enum(["amber", "rose", "cyan", "violet", "green"]);
const highlight = position.extend({ endMeasure: measure.optional(), endBeat: positive.optional(), voice: voice.optional(), color: color.optional(), label: z.string().optional() });
const mark = position.extend({ beat: positive, voice: voice.optional(), color: color.optional(), label: z.string().optional() });
const setup = z.object({ mode: z.enum(["single", "satb"]), title: z.string().optional(), key: z.string().optional(), time: z.tuple([positive.int(), positive.int()]).optional(), measures: measure.max(128), tempo: positive.optional(), clef: z.enum(["treble", "bass"]).optional() }).strict();
const sourceSchema = z.union([
  z.object({ file: z.string().min(1) }).strict(),
  z.object({ score: z.unknown().refine(v => v !== undefined, "falta score") }).strict(),
  z.object({ setup, text: z.string(), annotations: z.array(z.object({ measure, beat: positive, text: z.string(), kind: z.enum(["roman", "text"]) }).strict()).optional() }).strict(),
]);
const stillSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), kind: z.enum(["score", "title"]).optional(), project: z.string().optional(),
  heading: z.string().optional(), caption: z.string().optional(), narration: z.string().optional(), duration: positive.optional(),
  measures: z.tuple([measure, measure]).optional(), voices: z.union([z.literal("all"), z.array(voice).min(1)]).optional(), focusVoice: voice.optional(),
  reveal: position.optional(), highlights: z.array(highlight).optional(), marks: z.array(mark).optional(), cursor: position.optional(), showCiphers: z.boolean().optional(), audio: z.boolean().optional(),
}).strict();
const schema = z.object({ version: z.literal(1), lesson: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/), source: z.string().optional(), locale: z.enum(["es", "en"]), title: z.string(),
  format: z.object({ aspect: z.enum(["16:9", "9:16", "1:1"]).optional(), width: positive.int().min(64).max(7680).optional(), theme: z.enum(["storm", "paper"]).optional() }).strict().optional(),
  projects: z.record(z.string(), sourceSchema), stills: z.array(stillSchema).min(1),
}).strict();

/** File I/O belongs to the CLI. Embed {file} as {score} before resolving. */
export function resolveProject(source: ProjectSource): Score {
  const checked = sourceSchema.safeParse(source);
  if (!checked.success) throw new Error(`Project: ${checked.error.message}`);
  if ("file" in source) throw new Error(`Project file "${source.file}": debe incrustarse con el comando stills antes de resolver`);
  if ("score" in source) return importScore(JSON.stringify(source.score));
  const base = createScore(source.setup.mode);
  base.title = source.setup.title ?? base.title;
  base.tempo = source.setup.tempo ?? base.tempo;
  base.measures = Array.from({ length: source.setup.measures }, () => ({ id: newId(), key: source.setup.key ?? "C", time: source.setup.time ?? [4, 4] }));
  base.scenes[0].endMeasure = base.measures.length;
  if (source.setup.clef) base.voices.find(v => v.id === "melody")!.clef = source.setup.clef;
  base.annotations = source.annotations?.map(a => ({ ...a, id: newId() })) ?? [];
  const result = parseScoreText(source.text, validateScore(base));
  if (!result.score) throw new Error(result.issues.map(i => `línea ${i.line}: ${i.message}`).join("\n"));
  return validateScore(result.score);
}

export function stillDimensions(format: Storyboard["format"] = {}) {
  const aspect = format.aspect ?? "16:9";
  const width = format.width ?? (aspect === "16:9" ? 1920 : 1080);
  const [x, y] = aspect.split(":").map(Number);
  return { width, height: Math.round(width * y / x) };
}

/** Throws actionable errors; returns a validated, copied storyboard. Files must be embedded. */
export function validateStoryboard(value: unknown): Storyboard {
  const result = schema.safeParse(value);
  if (!result.success) {
    const raw = value as { stills?: { id?: unknown }[] } | null;
    throw new Error(result.error.issues.map(i => {
      const index = i.path[0] === "stills" ? Number(i.path[1]) : null;
      const id = index !== null && Array.isArray(raw?.stills) ? raw.stills[index]?.id : undefined;
      return `${index !== null ? `Still "${id ?? index}" ` : ""}${i.path.join(".")}: ${i.message}`;
    }).join("\n"));
  }
  const board = result.data as Storyboard;
  const scores = new Map<string, Score>();
  const ids = new Set<string>();
  for (const still of board.stills) {
    const fail = (message: string): never => { throw new Error(`Still "${still.id}": ${message}`); };
    if (ids.has(still.id)) fail("id duplicado");
    ids.add(still.id);
    if (still.kind === "title") continue;
    if (!still.project || !Object.hasOwn(board.projects, still.project)) fail(`project inexistente: ${still.project ?? "(falta project)"}`);
    const name = still.project!;
    if (!scores.has(name)) {
      try { scores.set(name, resolveProject(board.projects[name])); }
      catch (e) { fail(`project "${name}": ${(e as Error).message}`); }
    }
    const score = scores.get(name)!;
    const available = activeVoices(score).map(v => v.id);
    const visible = still.voices && still.voices !== "all" ? still.voices : available;
    if (new Set(visible).size !== visible.length) fail("voices contiene voces duplicadas");
    for (const v of [...visible, ...(still.focusVoice ? [still.focusVoice] : [])]) if (!available.includes(v)) fail(`voz inexistente: ${v}`);
    if (still.focusVoice && !visible.includes(still.focusVoice)) fail("focusVoice debe estar visible");
    const range = still.measures ?? [1, score.measures.length];
    if (range[0] > range[1] || range[1] > score.measures.length) fail("rango de compases fuera de rango o invertido");
    const at = (p: { measure: number; beat?: number }, label: string) => {
      if (p.measure < range[0] || p.measure > range[1]) fail(`${label}: compás ${p.measure} fuera del rango visible`);
      const max = 1 + measureTicks(score.measures[p.measure - 1]) / PPQ;
      if ((p.beat ?? 1) < 1 || (p.beat ?? 1) > max) fail(`${label}: pulso fuera de rango (1..${max})`);
      return measureStart(score, p.measure) + ((p.beat ?? 1) - 1) * PPQ;
    };
    if (still.reveal) at(still.reveal, "reveal");
    if (still.cursor) at(still.cursor, "cursor");
    for (const h of still.highlights ?? []) {
      const start = at(h, "highlight");
      const m = h.endMeasure ?? h.measure;
      const end = at({ measure: m, beat: h.endBeat ?? (score.measures[m - 1] ? 1 + measureTicks(score.measures[m - 1]) / PPQ : 1) }, "highlight.end");
      if (end <= start) fail("highlight: el final debe ser posterior al inicio");
      if (h.voice && !visible.includes(h.voice)) fail(`highlight: voz no visible ${h.voice}`);
    }
    for (const m of still.marks ?? []) {
      const tick = at(m, "mark");
      if (m.voice && !visible.includes(m.voice)) fail(`mark: voz no visible ${m.voice}`);
      if (!score.voices.some(v => visible.includes(v.id) && (!m.voice || v.id === m.voice) && v.events.some(e => e.start === tick && e.pitches.length))) fail(`mark: no hay nota en compás ${m.measure}, pulso ${m.beat}`);
    }
  }
  // Also validate unused projects so typos never remain latent.
  for (const [name, source] of Object.entries(board.projects)) if (!scores.has(name)) {
    try { resolveProject(source); } catch (e) { throw new Error(`Project "${name}": ${(e as Error).message}`); }
  }
  return board;
}
