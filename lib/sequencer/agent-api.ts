import { activeVoices, importScore, locateTick, parseScoreText, validateScore } from "./model";
import type { ParseResult, Score } from "./types";

export type AgentHandlers = { getScore(): Score; loadScore(score: Score): void };
export type SequencerAgentApi = { version: 1; getScore(): Score; loadScore(json: unknown): void; loadText(text: string): ParseResult; describe(): string };
declare global { interface Window { stormSequencer?: SequencerAgentApi } }

/** Install from the editor's effect; handlers must read current state. Returns safe cleanup. */
export function installAgentApi(handlers: AgentHandlers): () => void {
  const api: SequencerAgentApi = {
    version: 1,
    getScore: () => structuredClone(handlers.getScore()),
    loadScore(json) { handlers.loadScore(typeof json === "string" ? importScore(json) : validateScore(json)); },
    loadText(text) {
      const result = parseScoreText(text, api.getScore());
      if (result.score) handlers.loadScore(structuredClone(result.score));
      return result;
    },
    describe() {
      const score = api.getScore();
      return [`${score.title} · ${score.mode} · ${score.tempo} BPM · ${score.measures.length} compases`,
        ...activeVoices(score).flatMap(v => [`Voz ${v.id} (${v.name}, ${v.clef})`, ...score.measures.map((m, i) => {
          const notes = v.events.filter(e => locateTick(score, e.start).measure === i + 1);
          return `  Compás ${i + 1} (${m.time.join("/")}, ${m.key}): ${notes.length} eventos; ${notes.map(e => `${locateTick(score, e.start).beat}: ${e.pitches.join("+") || "silencio"} ${e.duration}${e.dotted ? "." : ""}${e.triplet ? " tresillo" : ""}`).join("; ") || "vacío"}`;
        })])].join("\n");
    },
  };
  window.stormSequencer = api;
  return () => { if (window.stormSequencer === api) delete window.stormSequencer; };
}
