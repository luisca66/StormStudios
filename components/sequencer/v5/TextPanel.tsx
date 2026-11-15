"use client";
/** Entrada por texto: la misma gramática de la v4 (`parseScoreText`), para personas y agentes. */
import { useState } from "react";
import { parseScoreText } from "@/lib/sequencer/model";
import { SEQUENCER_EXAMPLES } from "@/lib/sequencer/examples";
import type { ParseResult } from "@/lib/sequencer/types";
import type { Studio } from "./useStudio";
import styles from "./studio.module.css";

export default function TextPanel({ s }: { s: Studio }) {
  const { t, es } = s;
  const [text, setText] = useState(SEQUENCER_EXAMPLES[0].text), [result, setResult] = useState<ParseResult | null>(null);
  const validate = () => { const parsed = parseScoreText(text, s.score); setResult(parsed); return parsed; };
  const apply = () => { const parsed = validate(); if (parsed.score && s.commit(structuredClone(parsed.score), t(parsed.count + " eventos escritos.", parsed.count + " events written."))) { s.setSelected([]); s.patchDraft({ voice: parsed.score.mode === "satb" ? "soprano" : "melody" }); } };
  return <div className={styles.textPanel}>
    <textarea value={text} onChange={event => { setText(event.target.value); setResult(null); }} spellCheck={false} aria-label={t("Música en texto", "Music as text")} data-testid="text-input" />
    <div className={styles.textSide}>
      <label>{t("Ejemplo", "Example")}
        <select value="" onChange={event => { const example = SEQUENCER_EXAMPLES.find(item => item.id === event.target.value); if (example) { setText(example.text); setResult(null); } }}>
          <option value="">{t("Elegir ejemplo", "Choose example")}</option>
          {SEQUENCER_EXAMPLES.map(example => <option key={example.id} value={example.id}>{es ? example.titleEs : example.titleEn}</option>)}</select></label>
      <div className={styles.row}>
        <button onClick={validate}>{t("Validar", "Validate")}</button>
        <button className={styles.primary} onClick={apply} data-testid="text-apply">{t("Aplicar", "Apply")}</button>
      </div>
      {result && <p className={result.issues.length ? styles.error : styles.ok} role="status">
        {result.issues.length ? result.issues.slice(0, 3).map(issue => t("Línea ", "Line ") + issue.line + ": " + issue.message).join(" · ") : t(result.count + " eventos, 0 errores.", result.count + " events, 0 errors.")}</p>}
    </div>
  </div>;
}
