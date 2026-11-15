"use client";
/** Presentación: una escena a pantalla completa, sin herramientas, para grabar o exportar como imagen. */
import { useRef } from "react";
import { downloadBlob, exportGraphic } from "@/lib/sequencer/graphics";
import ScoreView from "../ScoreView";
import type { Studio } from "./useStudio";
import styles from "./studio.module.css";

const noop = () => {};

export default function Stage({ s, locale }: { s: Studio; locale: string }) {
  const { t, score, scene } = s;
  const stage = useRef<HTMLDivElement>(null), paper = useRef<HTMLDivElement>(null);
  if (!scene) return null;
  const playing = s.audioState === "playing" || s.audioState === "loading";
  const save = async (png: boolean) => {
    try {
      if (!paper.current) return;
      const blob = await exportGraphic(paper.current, { title: scene.title, caption: scene.caption, aspect: scene.aspect, png });
      downloadBlob(blob, (scene.title.trim().replace(/[\\/:*?"<>|]+/g, "-") || "storm-scene") + (png ? ".png" : ".svg"));
      s.setMessage(t("Imagen exportada.", "Image exported."));
    } catch (error) { s.setError(error instanceof Error ? error.message : "Export failed"); }
  };
  return <div className={styles.present} data-testid="presentation">
    <div className={styles.presentBar}>
      <label>{t("Escena", "Scene")}<select value={scene.id} onChange={event => { s.stop(); s.setSceneId(event.target.value); }}>{score.scenes.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <button onClick={() => (playing ? s.stop() : s.play())}>{playing ? t("Detener", "Stop") : t("Reproducir", "Play")}</button>
      <button aria-pressed={s.loop} onClick={() => s.setLoop(!s.loop)}>{t("Repetir", "Loop")}</button>
      <button onClick={() => void stage.current?.requestFullscreen().catch(() => s.setError(t("El navegador no permitió pantalla completa.", "The browser did not allow fullscreen.")))}>{t("Pantalla completa", "Fullscreen")}</button>
      <button onClick={() => void save(true)}>PNG</button>
      <button onClick={() => void save(false)}>SVG</button>
      {s.error && <span className={styles.error}>{s.error}</span>}
      <button className={styles.primary} onClick={() => { s.stop(); s.setPresentation(false); }} data-testid="presentation-exit">{t("Volver a editar", "Back to editing")}</button>
    </div>
    <div className={styles.stage} data-aspect={scene.aspect} ref={stage} data-testid="presentation-stage">
      <header><span>Storm Studios Learning</span><h2>{scene.title || score.title}</h2>{scene.caption && <p>{scene.caption}</p>}</header>
      <div className={styles.stagePaper} ref={paper}>
        <ScoreView score={score} selected={[]} locale={locale} onSelect={noop} tick={s.tick} showAnnotations={s.cipherVisible}
          from={scene.startMeasure} to={scene.endMeasure} focusVoice={scene.highlightVoice} />
      </div>
      <footer><span>Storm Sequencer</span><span>{score.tempo} BPM</span></footer>
    </div>
  </div>;
}
