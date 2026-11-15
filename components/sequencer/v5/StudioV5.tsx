"use client";
/**
 * Storm Sequencer v5 — estudio de una sola pantalla (referencia: Cubase).
 *
 *   ┌ barra superior: proyecto · transporte · pantalla · volumen ┐
 *   │ pistas │ herramientas + editor (partitura/teclas) │ inspector │
 *   │        ├ zona inferior: acordes · texto · autor ──┤           │
 *   └ barra de estado ───────────────────────────────────────────┘
 *
 * La lógica está en `useStudio`; aquí solo hay interfaz. El modo autor
 * (generar voces) se carga únicamente con NEXT_PUBLIC_SEQUENCER_AUTHOR=1.
 */
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { clefAt, keySignature, parsePitchList, pitchToMidi, transposePitches } from "@/lib/sequencer/model";
import { setChordAt } from "@/lib/sequencer/harmony/chord-track";
import { INSTRUMENTS, PPQ, type Duration, type VoiceId } from "@/lib/sequencer/types";
import ScoreView, { type MouseEditing } from "../ScoreView";
import PianoRoll from "../PianoRoll";
import ChordPanel from "./ChordPanel";
import TextPanel from "./TextPanel";
import { useStudio, type Studio } from "./useStudio";
import styles from "./studio.module.css";

const AUTHOR = process.env.NEXT_PUBLIC_SEQUENCER_AUTHOR === "1";
const AuthorPanel = AUTHOR ? dynamic(() => import("./AuthorPanel"), { ssr: false }) : null;

const DURATIONS: Array<[Duration, string, string, string]> = [
  ["w", "Redonda", "Whole", "𝅝"], ["h", "Blanca", "Half", "𝅗𝅥"], ["q", "Negra", "Quarter", "♩"],
  ["8", "Corchea", "Eighth", "♪"], ["16", "Semicorchea", "Sixteenth", "𝅘𝅥𝅯"], ["32", "Fusa", "Thirty-second", "𝅘𝅥𝅰"],
];
const ACCIDENTALS: Array<[MouseEditing["accidental"], string, string, string]> = [
  ["key", "Armadura", "Key", "𝄞"], ["#", "Sostenido", "Sharp", "♯"], ["b", "Bemol", "Flat", "♭"], ["", "Becuadro", "Natural", "♮"], ["##", "Doble sostenido", "Double sharp", "𝄪"], ["bb", "Doble bemol", "Double flat", "𝄫"],
];
const KEYS = ["C", "G", "D", "A", "E", "B", "F#", "C#", "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"];
const METERS = ["4/4", "3/4", "2/4", "6/8", "9/8", "12/8", "5/4", "7/8"];
const VOICE_LABEL: Record<VoiceId, [string, string]> = { melody: ["Melodía", "Melody"], soprano: ["Soprano", "Soprano"], alto: ["Contralto", "Alto"], tenor: ["Tenor", "Tenor"], bass: ["Bajo", "Bass"] };
const INSTRUMENT_LABEL: Record<string, [string, string]> = { Piano: ["Piano", "Piano"], Cello: ["Cello", "Cello"], Corno: ["Corno", "Horn"], Coro: ["Coro", "Choir"], Fagot: ["Fagot", "Bassoon"], Synth: ["Sintetizador", "Synth"] };
type Zone = "chords" | "text" | "author";

const ICONS = {
  play: <path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none" />,
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />,
  toStart: <><rect x="5" y="6" width="2.4" height="12" rx="1" fill="currentColor" stroke="none" /><path d="M19 6v12l-9.5-6z" fill="currentColor" stroke="none" /></>,
  toEnd: <><rect x="16.6" y="6" width="2.4" height="12" rx="1" fill="currentColor" stroke="none" /><path d="M5 6v12l9.5-6z" fill="currentColor" stroke="none" /></>,
  loop: <><path d="M4 11V9a3 3 0 0 1 3-3h11l-3-3" /><path d="M20 13v2a3 3 0 0 1-3 3H6l3 3" /></>,
  metronome: <><path d="M9 3h6l4 18H5z" /><path d="M12 16l5-9" /></>,
  volume: <><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z" /><path d="M15.5 9a4 4 0 0 1 0 6" /></>,
  pencil: <path d="M4 20h4L19 9l-4-4L4 16z" />,
  pointer: <path d="M6 3l12 9-5.5 1.2L15.5 20l-2.6 1.1-3-6.7L6 18z" />,
  eraser: <><path d="M8 20h11" /><path d="M5.5 15.5l9-9 5 5-8 8H8z" /></>,
  undo: <><path d="M8 5L3 10l5 5" /><path d="M3 10h11a6 6 0 0 1 0 12h-3" /></>,
  redo: <><path d="M16 5l5 5-5 5" /><path d="M21 10H10a6 6 0 0 0 0 12h3" /></>,
} as const;
const Icon = ({ name }: { name: keyof typeof ICONS }) =>
  <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>;

/** Letra escrita con el teclado → nota con la armadura y la octava más cercana a la anterior. */
function typedPitch(letter: string, key: string, previous: string): string {
  const { fifths } = keySignature(key);
  const altered = (fifths > 0 ? "FCGDAEB" : "BEADGCF").slice(0, Math.abs(fifths)).includes(letter);
  const name = letter + (altered ? (fifths > 0 ? "#" : "b") : "");
  let last = 60; try { last = pitchToMidi(parsePitchList(previous)[0] ?? "C4"); } catch { /* sin referencia */ }
  return [2, 3, 4, 5, 6].map(octave => name + octave).sort((a, b) => Math.abs(pitchToMidi(a) - last) - Math.abs(pitchToMidi(b) - last))[0];
}

export default function StudioV5({ locale }: { locale: string }) {
  const s = useStudio(locale);
  const { t, score, draft } = s;
  const [view, setView] = useState<"staff" | "roll">("staff");
  const [zone, setZone] = useState<Zone>("chords"), [zoneOpen, setZoneOpen] = useState(true);
  const [tempoDraft, setTempoDraft] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const playing = s.audioState === "playing" || s.audioState === "loading";

  // Atajos de teclado en toda la pantalla, salvo al escribir en un campo.
  const keys = useRef<(event: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keys.current = event => {
      const target = event.target as HTMLElement;
      if (target.closest?.("input:not([type=checkbox]):not([type=range]),textarea,select,[contenteditable=true]")) return;
      const key = event.key, lower = key.toLowerCase(), command = event.ctrlKey || event.metaKey;
      const done = () => event.preventDefault();
      if (event.code === "Space") { done(); if (!event.repeat) { if (playing) s.stop(); else s.play(); } return; }
      if (command) {
        if (lower === "z") { done(); if (event.shiftKey) s.redo(); else s.undo(); }
        else if (lower === "y") { done(); s.redo(); }
        else if (lower === "c" && s.selected.length) { done(); s.copy(); }
        else if (lower === "x" && s.selected.length) { done(); s.cut(); }
        else if (lower === "v" && s.availability.clipboard) { done(); s.paste(); }
        else if (lower === "d" && s.selected.length) { done(); s.duplicateSelection(); }
        else if (lower === "a") { done(); s.selectAll(); }
        else if (lower === "s") { done(); s.saveJson(); }
        return;
      }
      if (event.altKey) return;
      if (key === "Home") { done(); s.goToStart(); }
      else if (key === "End") { done(); s.goToEnd(); }
      else if (key === "Escape") s.setSelected([]);
      else if ((key === "Delete" || key === "Backspace") && s.selected.length) { done(); s.removeSelection(); }
      else if (key === "ArrowUp" || key === "ArrowDown") { if (s.selected.length) { done(); s.shiftSelection((key === "ArrowUp" ? 1 : -1) * (event.shiftKey ? 12 : 1)); } }
      else if (key === "ArrowLeft" || key === "ArrowRight") { done(); s.stepCursor(key === "ArrowRight" ? 1 : -1); }
      else if (key === "PageUp" || key === "PageDown") { done(); s.attempt(() => s.patchDraft({ pitches: transposePitches(parsePitchList(draft.pitches), key === "PageUp" ? 12 : -12).join(" ") })); }
      else if (key === "Enter") { done(); s.insert(); }
      else if (/^[a-g]$/.test(lower)) { done(); const pitch = typedPitch(lower.toUpperCase(), s.measure.key, draft.pitches); s.patchDraft({ pitches: pitch }); s.insert([pitch]); }
      else if (lower === "r") { done(); s.insert([]); }
      else if (/^[1-6]$/.test(key)) s.applyNoteValue({ duration: DURATIONS[Number(key) - 1][0] });
      else if (key === ".") s.applyNoteValue({ dotted: !draft.dotted });
      else if (lower === "t") s.applyNoteValue({ tie: !draft.tie });
      else if (lower === "m") s.setMetronome(!s.metronome);
      else if (lower === "l") s.setLoop(!s.loop);
    };
  });
  useEffect(() => {
    const down = (event: KeyboardEvent) => keys.current(event);
    const up = (event: KeyboardEvent) => { if (event.code === "Space" && (event.target as HTMLElement).tagName === "BUTTON") event.preventDefault(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const chordNow = (score.annotations ?? []).filter(a => a.kind === "roman" && a.text.trim() && a.measure === s.cursor.measure && (a.beat - 1) * PPQ <= (s.cursor.beat - 1) * PPQ + 1e-6)
    .sort((a, b) => b.beat - a.beat)[0]?.text ?? "—";
  const meter = s.measure.time.join("/");
  const phase = { stopped: s.saved ? t("Guardado en este navegador", "Saved in this browser") : t("Guardando…", "Saving…"), loading: t("Cargando sonidos…", "Loading sounds…"), playing: t("Reproduciendo", "Playing"), exporting: t("Exportando audio…", "Exporting audio…") }[s.audioState];
  const applyTempo = () => { if (tempoDraft === null) return; const value = Math.round(Number(tempoDraft)); setTempoDraft(null); if (value >= 30 && value <= 240 && value !== score.tempo) s.setTempo(value); };
  const zones: Array<[Zone, string]> = [["chords", t("Pista de acordes", "Chord track")], ["text", t("Entrada por texto", "Text entry")], ...(AUTHOR ? [["author", t("Modo autor", "Author mode")] as [Zone, string]] : [])];

  return <main className={styles.studio} data-testid="studio-v5" data-audio={s.audioState} data-zone={zoneOpen ? "open" : "closed"} inert={!s.ready}>
    <header className={styles.top}>
      <div className={styles.brand}>
        <Link href={"/" + locale + "/curso-armonia"} className={styles.back} aria-label={t("Volver al curso de armonía", "Back to the harmony course")}>←</Link>
        <strong>Storm Sequencer</strong><span className={styles.version}>5</span>
        <input className={styles.title} aria-label={t("Título del proyecto", "Project title")} defaultValue={score.title} key={score.title} maxLength={80}
          onBlur={event => { if (event.target.value !== score.title) s.setTitle(event.target.value); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} />
      </div>
      <div className={styles.transport} role="group" aria-label={t("Transporte", "Transport")}>
        <button onClick={s.goToStart} aria-label={t("Ir al inicio", "Go to start")} title="Home"><Icon name="toStart" /></button>
        <button onClick={s.stop} className={styles.stop} aria-label={t("Detener", "Stop")}><Icon name="stop" /></button>
        <button onClick={playing ? s.stop : s.play} className={styles.play} aria-label={t("Reproducir", "Play")} aria-pressed={playing} title={t("Espacio", "Space")}><Icon name="play" /></button>
        <button onClick={s.goToEnd} aria-label={t("Ir al final", "Go to end")} title="End"><Icon name="toEnd" /></button>
        <button onClick={() => s.setLoop(!s.loop)} aria-pressed={s.loop} aria-label={t("Repetir", "Loop")} title="L"><Icon name="loop" /></button>
        <button onClick={() => s.setMetronome(!s.metronome)} aria-pressed={s.metronome} aria-label={t("Metrónomo", "Metronome")} title="M"><Icon name="metronome" /></button>
      </div>
      <div className={styles.lcd} aria-live="off">
        <div><span>{t("Posición", "Position")}</span><b data-testid="lcd-position">{s.cursor.measure}.{Math.floor(s.cursor.beat)}</b></div>
        <div><span>Tempo</span><input aria-label="Tempo" inputMode="numeric" value={tempoDraft ?? String(score.tempo)} onChange={event => setTempoDraft(event.target.value)} onBlur={applyTempo}
          onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") setTempoDraft(null); }} /></div>
        <div><span>{t("Tono · compás", "Key · meter")}</span><b>{s.measure.key} · {meter}</b></div>
        <div><span>{t("Acorde", "Chord")}</span><b data-testid="lcd-chord">{chordNow}</b></div>
      </div>
      <div className={styles.topRight}>
        <label className={styles.master}><Icon name="volume" /><input type="range" min="0" max="1" step="0.01" value={score.masterVolume} aria-label={t("Volumen general", "Master volume")}
          onChange={event => s.setMasterVolume(Number(event.target.value))} style={{ "--fill": score.masterVolume * 100 + "%" } as React.CSSProperties} /></label>
        <details className={styles.menu}>
          <summary>{t("Archivo", "File")}</summary>
          <div role="menu">
            <button role="menuitem" onClick={s.newProject}>{t("Nuevo proyecto", "New project")}</button>
            <button role="menuitem" onClick={() => fileInput.current?.click()}>{t("Abrir… (JSON, MusicXML)", "Open… (JSON, MusicXML)")}</button>
            <button role="menuitem" onClick={s.saveJson}>{t("Guardar proyecto", "Save project")} <kbd>Ctrl S</kbd></button>
            <hr />
            <button role="menuitem" onClick={s.saveMidi}>{t("Exportar MIDI", "Export MIDI")}</button>
            <button role="menuitem" onClick={s.saveMusicXml}>{t("Exportar MusicXML", "Export MusicXML")}</button>
            <button role="menuitem" onClick={() => void s.saveWav()}>{t("Exportar audio WAV", "Export WAV audio")}</button>
            <hr />
            <Link role="menuitem" href={"/" + locale + "/sequencer/v4"}>{t("Abrir en Sequencer v4", "Open in Sequencer v4")}</Link>
          </div>
        </details>
        <input ref={fileInput} type="file" hidden accept=".json,.xml,.musicxml,application/json" aria-label={t("Archivo de proyecto", "Project file")}
          onChange={event => { const file = event.target.files?.[0]; if (file) void s.loadFile(file); event.target.value = ""; }} />
      </div>
    </header>

    <aside className={styles.tracks} aria-label={t("Pistas", "Tracks")}>
      <div className={styles.modeSwitch} role="group" aria-label={t("Modo", "Mode")}>
        <button aria-pressed={score.mode === "single"} onClick={() => s.changeMode("single")}>{t("Melodía", "Melody")}</button>
        <button aria-pressed={score.mode === "satb"} onClick={() => s.changeMode("satb")}>SATB</button>
      </div>
      {s.voices.map(voice => <Track key={voice.id} s={s} id={voice.id} />)}
      <div className={styles.measureTools}>
        <span>{score.measures.length} {t("compases", "measures")}</span>
        <button onClick={s.removeLastMeasure} aria-label={t("Quitar el último compás", "Remove last measure")}>−</button>
        <button onClick={s.addMeasure} aria-label={t("Añadir compás", "Add measure")}>+</button>
      </div>
    </aside>

    <section className={styles.center}>
      <div className={styles.toolbar} role="toolbar" aria-label={t("Herramientas de escritura", "Writing tools")}>
        <div className={styles.group}>
          {([["write", "pencil", "Escribir", "Write"], ["select", "pointer", "Seleccionar", "Select"], ["erase", "eraser", "Borrar", "Erase"]] as const).map(([value, icon, es, en]) =>
            <button key={value} aria-pressed={s.tool === value} onClick={() => s.setTool(value)} aria-label={t(es, en)} title={t(es, en)}><Icon name={icon} /></button>)}
        </div>
        <div className={styles.group}>
          {DURATIONS.map(([value, es, en, glyph], index) =>
            <button key={value} className={styles.glyph} aria-pressed={draft.duration === value} onClick={() => s.applyNoteValue({ duration: value })} aria-label={t(es, en)} title={t(es, en) + " (" + (index + 1) + ")"}>{glyph}</button>)}
          <button aria-pressed={draft.dotted} onClick={() => s.applyNoteValue({ dotted: !draft.dotted })} aria-label={t("Puntillo", "Dotted")} title={t("Puntillo (.)", "Dotted (.)")}>•</button>
          <button aria-pressed={draft.triplet} onClick={() => s.applyNoteValue({ triplet: !draft.triplet })} aria-label={t("Tresillo", "Triplet")} title={t("Tresillo", "Triplet")}>3</button>
          <button aria-pressed={draft.tie} onClick={() => s.applyNoteValue({ tie: !draft.tie })} aria-label={t("Ligadura", "Tie")} title={t("Ligadura (T)", "Tie (T)")}>⌒</button>
        </div>
        <div className={styles.group}>
          {ACCIDENTALS.map(([value, es, en, glyph]) =>
            <button key={value || "natural"} className={styles.glyph} aria-pressed={s.accidental === value} onClick={() => s.applyAccidental(value)} aria-label={t(es, en)} title={t(es, en)}>{glyph}</button>)}
        </div>
        <div className={styles.group}>
          <button onClick={s.undo} disabled={!s.availability.undo} aria-label={t("Deshacer", "Undo")} title="Ctrl Z"><Icon name="undo" /></button>
          <button onClick={s.redo} disabled={!s.availability.redo} aria-label={t("Rehacer", "Redo")} title="Ctrl Y"><Icon name="redo" /></button>
        </div>
        <div className={styles.group + " " + styles.viewSwitch}>
          <button aria-pressed={view === "staff"} onClick={() => setView("staff")}>{t("Partitura", "Score")}</button>
          <button aria-pressed={view === "roll"} onClick={() => setView("roll")}>{t("Teclas", "Keys")}</button>
        </div>
      </div>
      <div className={styles.editor} data-view={view}>
        {view === "staff"
          ? <ScoreView score={score} selected={s.selected} locale={locale} onSelect={s.selectNote} mouse={s.mouse} tick={s.tick} cursorTick={s.positionTick} focusVoice="all" layout="line"
              showAnnotations onAnnotation={(measure, beat, text) => s.attempt(() => s.commit(setChordAt(score, measure, beat, text)))}
              onSelectMany={s.selectMany} onMeasure={n => { s.setSelected([]); s.patchDraft({ measure: n, beat: 1 }); }} />
          : <PianoRoll score={score} selected={s.selectedIds} mouse={s.mouse} voiceId={draft.voice} onSelect={s.selectNote} locale={locale} tick={s.tick} positionTick={s.positionTick} />}
      </div>
      <div className={styles.zone}>
        <div className={styles.zoneTabs} role="tablist">
          {zones.map(([value, label]) => <button key={value} role="tab" aria-selected={zoneOpen && zone === value} data-author={value === "author" || undefined}
            onClick={() => { if (zoneOpen && zone === value) setZoneOpen(false); else { setZone(value); setZoneOpen(true); } }}>{label}</button>)}
          <button className={styles.zoneToggle} onClick={() => setZoneOpen(!zoneOpen)} aria-label={zoneOpen ? t("Ocultar zona inferior", "Hide lower zone") : t("Mostrar zona inferior", "Show lower zone")}>{zoneOpen ? "▾" : "▴"}</button>
        </div>
        {zoneOpen && <div className={styles.zoneBody} role="tabpanel">
          {zone === "chords" && <ChordPanel s={s} />}
          {zone === "text" && <TextPanel s={s} />}
          {zone === "author" && AuthorPanel && <AuthorPanel s={s} />}
        </div>}
      </div>
    </section>

    <aside className={styles.inspector} aria-label="Inspector">
      <h2>{t("Cursor", "Cursor")}</h2>
      <div className={styles.row}>
        <label>{t("Compás", "Measure")}<input type="number" min={1} max={score.measures.length} value={draft.measure} onChange={event => { const n = Number(event.target.value); if (n >= 1 && n <= score.measures.length) s.patchDraft({ measure: n }); }} /></label>
        <label>{t("Pulso", "Beat")}<input type="number" min={1} step={0.25} max={s.measureLength / PPQ + 0.75} value={draft.beat} onChange={event => { const n = Number(event.target.value); if (n >= 1 && n < 1 + s.measureLength / PPQ) s.patchDraft({ beat: n }); }} /></label>
      </div>
      <label>{t("Notas (C4, o E4 G4 para acorde)", "Notes (C4, or E4 G4 for a chord)")}
        <input value={draft.pitches} onChange={event => s.patchDraft({ pitches: event.target.value })} onKeyDown={event => { if (event.key === "Enter") s.insert(); }} spellCheck={false} /></label>
      <div className={styles.row}>
        <button className={styles.primary} onClick={() => s.insert()}>{t("Insertar nota", "Insert note")}</button>
        <button onClick={() => s.insert([])}>{t("Silencio", "Rest")}</button>
      </div>
      <h2>{t("Compás", "Measure")} {draft.measure}</h2>
      <div className={styles.row}>
        <label>{t("Armadura", "Key")}<select value={s.measure.key} onChange={event => s.changeKey(event.target.value)}>{KEYS.map(key => <option key={key}>{key}</option>)}</select></label>
        <label>{t("Compás", "Meter")}<select value={meter} onChange={event => { const [n, d] = event.target.value.split("/").map(Number); s.changeMeter([n, d]); }}>
          {(METERS.includes(meter) ? METERS : [meter, ...METERS]).map(value => <option key={value}>{value}</option>)}</select></label>
      </div>
      <label>{t("Clave de", "Clef of")} {t(...VOICE_LABEL[draft.voice])}
        <select value={clefAt(score, draft.voice, Math.min(draft.measure, score.measures.length))} onChange={event => s.changeClef(event.target.value as "treble" | "bass")}>
          <option value="treble">{t("Clave de Sol", "Treble clef")}</option><option value="bass">{t("Clave de Fa", "Bass clef")}</option></select></label>
      <h2>{t("Selección", "Selection")}</h2>
      <p className={styles.muted}>{s.selected.length ? t(s.selected.length + " notas", s.selected.length + " notes") : t("Nada seleccionado", "Nothing selected")}</p>
      <div className={styles.row}>
        <button onClick={() => s.shiftSelection(12)} disabled={!s.selected.length}>{t("+8ª", "+8ve")}</button>
        <button onClick={() => s.shiftSelection(-12)} disabled={!s.selected.length}>{t("−8ª", "−8ve")}</button>
        <button onClick={s.duplicateSelection} disabled={!s.selected.length} title="Ctrl D">{t("Duplicar", "Duplicate")}</button>
      </div>
      <details className={styles.shortcuts}>
        <summary>{t("Atajos de teclado", "Keyboard shortcuts")}</summary>
        <dl>
          <dt>{t("Espacio", "Space")}</dt><dd>{t("Reproducir / detener", "Play / stop")}</dd>
          <dt>A–G · R</dt><dd>{t("Escribir nota · silencio", "Write note · rest")}</dd>
          <dt>1–6 · . · T</dt><dd>{t("Figura · puntillo · ligadura", "Value · dot · tie")}</dd>
          <dt>← →</dt><dd>{t("Mover el cursor", "Move the cursor")}</dd>
          <dt>↑ ↓</dt><dd>{t("Subir o bajar la selección (Mayús: octava)", "Move selection (Shift: octave)")}</dd>
          <dt>Ctrl C/X/V/D</dt><dd>{t("Copiar, cortar, pegar, duplicar", "Copy, cut, paste, duplicate")}</dd>
          <dt>Ctrl Z / Y</dt><dd>{t("Deshacer / rehacer", "Undo / redo")}</dd>
        </dl>
      </details>
    </aside>

    <footer className={styles.status} role="status">
      {s.error ? <span className={styles.error} data-testid="status-error">{s.error}</span> : <span data-testid="status-message">{s.message || t("Clic para escribir · clic derecho para borrar · arrastra para cambiar altura · Ctrl+clic añade al acorde", "Click to write · right-click to delete · drag to change pitch · Ctrl+click adds to chord")}</span>}
      {s.warning && <span className={styles.warn}>{t("Algunos sonidos no cargaron; se usa un sonido de reserva.", "Some sounds failed to load; a fallback sound is used.")}</span>}
      <span className={styles.phase}>{phase}</span>
    </footer>
  </main>;
}

function Track({ s, id }: { s: Studio; id: VoiceId }) {
  const voice = s.score.voices.find(v => v.id === id)!;
  const active = s.draft.voice === id;
  return <div className={styles.track} data-active={active || undefined} style={{ "--voice": `var(--v-${id})` } as React.CSSProperties}>
    <button className={styles.trackName} onClick={() => s.patchDraft({ voice: id })} aria-pressed={active}>{s.t(...VOICE_LABEL[id])}</button>
    <button className={styles.ms} aria-pressed={voice.mute} onClick={() => s.patchVoice(id, { mute: !voice.mute })} aria-label={s.t("Silenciar ", "Mute ") + s.t(...VOICE_LABEL[id])}>M</button>
    <button className={styles.ms} data-solo aria-pressed={voice.solo} onClick={() => s.patchVoice(id, { solo: !voice.solo })} aria-label={s.t("Solo de ", "Solo ") + s.t(...VOICE_LABEL[id])}>S</button>
    <select value={voice.instrument} aria-label={s.t("Instrumento de ", "Instrument of ") + s.t(...VOICE_LABEL[id])} onChange={event => s.patchVoice(id, { instrument: event.target.value as typeof INSTRUMENTS[number] })}>
      {INSTRUMENTS.map(name => <option key={name} value={name}>{s.t(...INSTRUMENT_LABEL[name])}</option>)}</select>
    <input type="range" min="0" max="1" step="0.01" value={voice.volume} aria-label={s.t("Volumen de ", "Volume of ") + s.t(...VOICE_LABEL[id])}
      onChange={event => s.patchVoice(id, { volume: Number(event.target.value) })} style={{ "--fill": voice.volume * 100 + "%" } as React.CSSProperties} />
  </div>;
}
