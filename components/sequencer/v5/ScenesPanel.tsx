"use client";
/**
 * Pista de marcadores: las escenas de la partitura sobre una regla de compases.
 * Cada escena guarda rango, formato, explicación y voz resaltada; «Presentar»
 * muestra solo ese rango, listo para grabar o exportar como imagen.
 */
import type { Scene } from "@/lib/sequencer/types";
import type { Studio } from "./useStudio";
import styles from "./studio.module.css";

export default function ScenesPanel({ s }: { s: Studio }) {
  const { t, score, scene } = s;
  const count = score.measures.length;
  return <div className={styles.scenes}>
    <div className={styles.markerLane} style={{ gridTemplateColumns: `repeat(${count}, minmax(34px, 1fr))` }} data-testid="marker-lane">
      {score.measures.map((measure, index) => <button key={measure.id} className={styles.ruler} aria-pressed={s.draft.measure === index + 1} style={{ gridColumn: index + 1, gridRow: 1 }}
        onClick={() => { s.setSelected([]); s.patchDraft({ measure: index + 1, beat: 1 }); }} aria-label={t("Ir al compás ", "Go to measure ") + (index + 1)}>{index + 1}</button>)}
      {score.scenes.map((item, row) => <button key={item.id} className={styles.marker} aria-pressed={scene?.id === item.id} onClick={() => s.setSceneId(item.id)}
        style={{ gridColumn: `${item.startMeasure} / ${item.endMeasure + 1}`, gridRow: row + 2 }} title={item.caption || item.title}>{item.title}</button>)}
    </div>
    {scene && <div className={styles.sceneForm}>
      <label className={styles.grow}>{t("Título", "Title")}<input value={scene.title} maxLength={120} onChange={event => s.patchScene({ title: event.target.value })} /></label>
      <label>{t("Desde", "From")}<input type="number" min={1} max={scene.endMeasure} value={scene.startMeasure} onChange={event => { const n = Number(event.target.value); if (n >= 1 && n <= scene.endMeasure) s.patchScene({ startMeasure: n }); }} /></label>
      <label>{t("Hasta", "To")}<input type="number" min={scene.startMeasure} max={count} value={scene.endMeasure} onChange={event => { const n = Number(event.target.value); if (n >= scene.startMeasure && n <= count) s.patchScene({ endMeasure: n }); }} /></label>
      <label>{t("Formato", "Format")}<select value={scene.aspect} onChange={event => s.patchScene({ aspect: event.target.value as Scene["aspect"] })}><option>16:9</option><option>9:16</option></select></label>
      <label>{t("Resaltar", "Highlight")}<select value={scene.highlightVoice} onChange={event => s.patchScene({ highlightVoice: event.target.value as Scene["highlightVoice"] })}>
        <option value="all">{t("Todas", "All")}</option>{s.voices.map(voice => <option key={voice.id} value={voice.id}>{voice.name}</option>)}</select></label>
      <label className={styles.wide}>{t("Explicación", "Caption")}<input value={scene.caption} maxLength={300} onChange={event => s.patchScene({ caption: event.target.value })} /></label>
      <div className={styles.sceneButtons}>
        <button className={styles.primary} onClick={() => { s.stop(); s.setPresentation(true); }} data-testid="present-scene">{t("Presentar", "Present")}</button>
        <button onClick={s.addScene}>{t("Nueva escena aquí", "New scene here")}</button>
        <button onClick={s.removeScene} disabled={score.scenes.length < 2}>{t("Quitar", "Remove")}</button>
      </div>
    </div>}
  </div>;
}
