"use client";
/**
 * Pista de acordes (público): el alumno escribe el cifrado a mano.
 * No genera notas ni corrige: reconocer el acorde solo sirve para mostrar su
 * nombre. La generación de voces es del modo autor (AuthorPanel).
 */
import { useMemo, useState } from "react";
import { chordTrack, clearChordTrack, setChordAt, writeProgression } from "@/lib/sequencer/harmony/chord-track";
import { chordName } from "@/lib/sequencer/harmony/chords";
import type { Studio } from "./useStudio";
import styles from "./studio.module.css";

export default function ChordPanel({ s }: { s: Studio }) {
  const { t, score, draft } = s;
  const [text, setText] = useState(""), [beats, setBeats] = useState(4);
  const slots = useMemo(() => chordTrack(score), [score]);
  const write = () => s.attempt(() => {
    const result = writeProgression(score, text, draft.measure, beats);
    if (!result.written) { s.setError(t("Escribe la progresión, por ejemplo: I IV V I", "Type the progression, for example: I IV V I")); return; }
    if (s.commit(result.score, t(`${result.written} acordes escritos desde el compás ${draft.measure}.`, `${result.written} chords written from measure ${draft.measure}.`))) setText("");
  });
  return <div className={styles.chords}>
    <form className={styles.chordForm} onSubmit={event => { event.preventDefault(); write(); }}>
      <label className={styles.grow}>{t("Progresión (romano o americano)", "Progression (roman or letter chords)")}
        <input value={text} maxLength={2048} onChange={event => setText(event.target.value)} placeholder="I  IV  V  I   ·   C  F  G/B  C" spellCheck={false} data-testid="progression-input" /></label>
      <label>{t("Un acorde cada", "One chord every")}
        <select value={beats} onChange={event => setBeats(Number(event.target.value))}>
          <option value={4}>{t("4 pulsos", "4 beats")}</option><option value={3}>{t("3 pulsos", "3 beats")}</option>
          <option value={2}>{t("2 pulsos", "2 beats")}</option><option value={1}>{t("1 pulso", "1 beat")}</option></select></label>
      <button type="submit" className={styles.primary}>{t("Escribir desde el compás", "Write from measure")} {draft.measure}</button>
      <button type="button" disabled={!slots.length} onClick={() => s.attempt(() => s.commit(clearChordTrack(score), t("Pista de acordes vacía.", "Chord track cleared.")))}>{t("Vaciar pista", "Clear track")}</button>
    </form>
    <ol className={styles.lane} aria-label={t("Acordes de la pista", "Chords on the track")} data-testid="chord-lane">
      {slots.length === 0 && <li className={styles.muted}>{t("La pista está vacía. Escribe una progresión arriba, o el cifrado directamente bajo cada pulso de la partitura.", "The track is empty. Type a progression above, or write each chord right under its beat in the score.")}</li>}
      {slots.map(slot => <li key={slot.id} data-known={slot.chord ? "" : undefined}>
        <button onClick={() => { s.setSelected([]); s.patchDraft({ measure: slot.measure, beat: slot.beat }); }} title={t("Ir a este acorde", "Go to this chord")}>
          <small>{slot.measure}.{slot.beat}</small><b>{slot.text}</b><small>{slot.chord ? chordName(slot.chord) + " · " + slot.key : t("texto libre", "free text")}</small>
        </button>
        <button className={styles.remove} onClick={() => s.attempt(() => s.commit(setChordAt(score, slot.measure, slot.beat, "")))} aria-label={t("Quitar ", "Remove ") + slot.text}>×</button>
      </li>)}
    </ol>
  </div>;
}
