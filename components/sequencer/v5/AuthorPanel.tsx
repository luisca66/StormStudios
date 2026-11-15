"use client";
/**
 * Modo autor — SOLO para Luis. Genera voces y armoniza con las reglas del curso.
 *
 * Este archivo (y `lib/sequencer/harmony/score-bridge.ts`, `realize.ts`,
 * `harmonize.ts`) no debe llegar al alumno: StudioV5 lo carga únicamente cuando
 * NEXT_PUBLIC_SEQUENCER_AUTHOR=1, que existe solo en el `.env.local` de la PC
 * de Luis. En producción la variable no existe y este panel no se incluye.
 */
import { useState } from "react";
import { chordName } from "@/lib/sequencer/harmony/chords";
import type { Harmonization } from "@/lib/sequencer/harmony/harmonize";
import { applyHarmonization, harmonizeOptions, HarmonyError, realizeChordTrack } from "@/lib/sequencer/harmony/score-bridge";
import type { Studio } from "./useStudio";
import styles from "./studio.module.css";

export default function AuthorPanel({ s }: { s: Studio }) {
  const { t, es, score } = s;
  const [options, setOptions] = useState<Harmonization[]>([]);
  const run = (action: () => void) => { try { action(); } catch (error) { s.setError(error instanceof HarmonyError ? (es ? error.es : error.en) : error instanceof Error ? error.message : "Error"); } };
  const voice = () => run(() => { const result = realizeChordTrack(score); if (s.commit(result.score, es ? result.message.es : result.message.en)) { s.setSelected([]); s.patchDraft({ voice: "soprano" }); } });
  const harmonize = () => run(() => { setOptions([]); setOptions(harmonizeOptions(score, 4)); s.setMessage(t("Elige una armonización.", "Choose a harmonization.")); });
  const choose = (option: Harmonization) => run(() => { const result = applyHarmonization(score, option); if (s.commit(result.score, es ? result.message.es : result.message.en)) setOptions([]); });
  return <div className={styles.author} data-testid="author-panel">
    <p className={styles.authorBadge}>{t("Modo autor · solo en esta computadora · el alumno no lo ve", "Author mode · this computer only · students never see it")}</p>
    <div className={styles.authorActions}>
      <div>
        <button className={styles.primary} onClick={voice} data-testid="author-voice">{t("Repartir la pista de acordes a 4 voces", "Voice the chord track in 4 parts")}</button>
        <p className={styles.muted}>{t("Lee el cifrado de la pista y escribe soprano, contralto, tenor y bajo con la conducción del curso. Reemplaza lo que hubiera en ese tramo (se puede deshacer).", "Reads the chord track and writes soprano, alto, tenor and bass with the course's voice leading. Replaces that span (undoable).")}</p>
      </div>
      <div>
        <button className={styles.primary} onClick={harmonize} data-testid="author-harmonize">{t("Armonizar la soprano escrita", "Harmonize the written soprano")}</button>
        <p className={styles.muted}>{t("Propone progresiones del material del curso para la melodía de la soprano y escribe las otras tres voces.", "Proposes progressions from the course material for the soprano melody and writes the other three voices.")}</p>
        {options.length > 0 && <ol className={styles.options} data-testid="author-options">
          {options.map((option, index) => <li key={index}><span>{option.chords.map(chordName).join(" – ")}</span><button onClick={() => choose(option)}>{t("Escribir", "Write")}</button></li>)}
        </ol>}
      </div>
    </div>
  </div>;
}
