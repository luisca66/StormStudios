"use client";
/** Lista de notas (accesible para lectores de pantalla y agentes) y anotaciones de texto. */
import { useState } from "react";
import { locateTick } from "@/lib/sequencer/model";
import type { Studio } from "./useStudio";
import styles from "./studio.module.css";

const VALUE: Record<string, [string, string]> = { w: ["entera", "whole"], h: ["mitad", "half"], q: ["cuarto", "quarter"], "8": ["octavo", "eighth"], "16": ["dieciseisavo", "sixteenth"], "32": ["treintaidosavo", "thirty-second"] };
const LIMIT = 300;

export default function EventsPanel({ s }: { s: Studio }) {
  const { t, score } = s;
  const [text, setText] = useState("");
  const rows = s.voices.flatMap(voice => voice.events.map(event => ({ voice, event }))).sort((a, b) => a.event.start - b.event.start);
  const notes = (score.annotations ?? []).filter(a => a.kind === "text").sort((a, b) => a.measure - b.measure || a.beat - b.beat);
  return <div className={styles.events}>
    <div className={styles.eventList}>
      <table data-testid="event-list">
        <caption>{rows.length} {t("eventos", "events")}{rows.length > LIMIT ? t(` (se muestran ${LIMIT})`, ` (showing ${LIMIT})`) : ""}</caption>
        <thead><tr><th>{t("Compás", "Measure")}</th><th>{t("Pulso", "Beat")}</th><th>{t("Voz", "Voice")}</th><th>{t("Notas", "Notes")}</th><th>{t("Figura", "Value")}</th></tr></thead>
        <tbody>{rows.slice(0, LIMIT).map(({ voice, event }) => {
          const at = locateTick(score, event.start), chosen = s.selectedIds.includes(event.id);
          return <tr key={event.id} aria-selected={chosen} onClick={() => s.selectNote(event.id)}>
            <td>{at.measure}</td><td>{Number(at.beat.toFixed(3))}</td><td>{voice.name}</td>
            <td><button onClick={clickEvent => { clickEvent.stopPropagation(); s.selectNote(event.id); }}>{event.pitches.join(" ") || t("silencio", "rest")}{event.ornament ? " ●" : ""}</button></td>
            <td>{t(...VALUE[event.duration])}{event.dotted ? t(" con puntillo", " dotted") : ""}{event.triplet ? t(" de tresillo", " triplet") : ""}{event.tie ? t(", ligada", ", tied") : ""}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    <div className={styles.textNotes}>
      <form className={styles.row} onSubmit={event => { event.preventDefault(); if (text.trim() && s.setAnnotation("text", text)) setText(""); }}>
        <label className={styles.grow}>{t("Texto en el cursor", "Text at the cursor")} ({s.draft.measure}.{s.draft.beat})
          <input value={text} onChange={event => setText(event.target.value)} maxLength={200} placeholder={t("p. ej. Cadencia auténtica", "e.g. Authentic cadence")} /></label>
        <button type="submit" className={styles.fixed}>{t("Añadir", "Add")}</button>
      </form>
      <ul>{notes.map(note => <li key={note.id}>
        <button onClick={() => { s.setSelected([]); s.patchDraft({ measure: note.measure, beat: note.beat }); }}><small>{note.measure}.{note.beat}</small> {note.text}</button>
        <button onClick={() => s.removeAnnotation(note.id)} aria-label={t("Quitar texto ", "Remove text ") + note.text}>×</button>
      </li>)}</ul>
    </div>
  </div>;
}
