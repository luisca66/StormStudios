"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import ScoreView from "./ScoreView";
import styles from "./stills.module.css";
import type { Score } from "@/lib/sequencer/types";
import type { Still, Storyboard } from "@/lib/sequencer/storyboard";
import { resolveProject, stillDimensions, validateStoryboard } from "@/lib/sequencer/storyboard-resolve";
import { captureLayout, type CaptureLayout } from "@/lib/sequencer/capture-layout";

export type StageContext = { lesson: string; title: string; index: number; total: number };

type StageApi = {
  render(still: Still, score: Score | null, format?: Storyboard["format"], context?: StageContext): Promise<void>;
  prepare(value: unknown): { storyboard: Storyboard; scores: Record<string, Score> };
};
declare global { interface Window { stormStage?: StageApi } }
const noop = () => {};
const selected: string[] = [];
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
type State = { still: Still; score: Score | null; format: Storyboard["format"]; serial: number; context: StageContext; layout?: CaptureLayout };

export default function StillStage({ locale }: { locale: "es" | "en" }) {
  const [state, setState] = useState<State | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let serial = 0, busy = false, disposed = false;
    let prepared: Storyboard | undefined;
    const api: StageApi = {
      prepare(value) {
        const storyboard = validateStoryboard(value);
        prepared = storyboard;
        return { storyboard, scores: Object.fromEntries(Object.entries(storyboard.projects).map(([id, source]) => [id, resolveProject(source)])) };
      },
      async render(still, score, format = {}, context) {
        if (busy) throw new Error("Hay otra captura en curso; espera a render()");
        busy = true;
        document.documentElement.dataset.stageReady = "0";
        try {
          const board = validateStoryboard({ version: 1, lesson: "stage", locale, title: "Stage", format, projects: score ? { current: { score } } : {}, stills: [{ ...still, project: still.kind === "title" ? undefined : "current" }] });
          const checked = board.stills[0];
          const index = prepared?.stills.findIndex(s => s.id === still.id) ?? -1;
          const info = context ?? { lesson: prepared?.lesson ?? "", title: prepared?.title ?? score?.title ?? "", index: index + 1 || 1, total: prepared?.stills.length ?? 1 };
          const next: State = { still: checked, score, format, serial: ++serial, context: info };
          flushSync(() => setState(next));
          if (score && checked.kind !== "title" && paper.current) {
            next.layout = captureLayout(score, checked, paper.current.clientWidth - 128, paper.current.clientHeight - 64);
            flushSync(() => setState({ ...next }));
          }
          await import("vexflow");
          const expected = checked.kind === "title" ? 0 : (checked.measures?.[1] ?? score!.measures.length) - (checked.measures?.[0] ?? 1) + 1;
          const deadline = performance.now() + 30000;
          while (expected && root.current?.querySelectorAll('svg[data-capture-ready="1"]').length !== expected) {
            if (disposed) throw new Error("Stage desmontado");
            const error = root.current?.querySelector('[role="alert"]');
            if (error) throw new Error(error.textContent ?? "Error VexFlow");
            if (performance.now() > deadline) throw new Error("VexFlow no terminó en 30 segundos");
            await frame();
          }
          await document.fonts.ready;
          await frame();
          await frame();
          document.documentElement.dataset.stageReady = "1";
        } catch (error) {
          throw new Error(`Still "${still.id}": ${(error as Error).message}`);
        } finally { busy = false; }
      },
    };
    window.stormStage = api;
    return () => { disposed = true; if (window.stormStage === api) delete window.stormStage; delete document.documentElement.dataset.stageReady; };
  }, [locale]);
  const format = state?.format ?? {};
  const dimensions = stillDimensions(format);
  const base = stillDimensions({ aspect: format.aspect });
  const still = state?.still;
  const lessonNumber = /(?:leccion|lesson)[-\s]+(\d+)/i.exec(state?.context.lesson ?? "")?.[1] ?? /(?:lección|lesson)\s+(\d+)/i.exec(state?.context.title ?? "")?.[1];
  return <div className={styles.overlay}>
    <style>{"nextjs-portal { display: none !important; }"}</style>
    <div ref={root} data-testid="still" className={styles.still} style={dimensions} data-theme={format.theme ?? "storm"} data-aspect={format.aspect ?? "16:9"}>
      <div className={styles.canvas} style={{ width: base.width, height: base.height, transform: `scale(${dimensions.width / base.width})` }}>
        <div className={styles.brand}>STORM STUDIOS LEARNING{lessonNumber ? ` · ${locale === "es" ? "LECCIÓN" : "LESSON"} ${lessonNumber}` : ""}</div>
        {still?.kind === "title" ? <div className={styles.title}><div className={styles.rule} /><h1>{still.heading}</h1><p>{still.caption}</p></div> : <>
          <header className={styles.heading}><h1>{still?.heading}</h1><p>{still?.caption}</p></header>
          <div ref={paper} className={styles.paper}>
            {state?.score && state.layout && <div key={state.serial} className={styles.music}>
              <ScoreView score={state.score} selected={selected} locale={locale} onSelect={noop} tick={null} from={still?.measures?.[0]} to={still?.measures?.[1]} focusVoice={still?.focusVoice ?? "all"} showAnnotations={still?.showCiphers ?? true} capture={still} captureLayout={state.layout} />
            </div>}
          </div>
        </>}
        <div className={styles.footer}><span>Storm Studios Learning{state?.context.title ? ` · ${state.context.title}` : ""}</span><span>{state ? `${state.context.index} / ${state.context.total}` : ""}</span></div>
      </div>
    </div>
  </div>;
}
