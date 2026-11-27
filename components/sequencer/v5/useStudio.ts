"use client";
/**
 * useStudio — estado y acciones del Sequencer v5.
 *
 * Toda la lógica musical vive en lib/sequencer (la misma de la v4); este hook
 * solo la conecta con React: partitura, historial, selección, cursor, audio,
 * archivos y la API de agentes `window.stormSequencer`. La interfaz (StudioV5)
 * no modifica la partitura por su cuenta: siempre pasa por `commit`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { activeVoices, createScore, durationTicks, importScore, locateTick, measureStart, measureTicks, newId,
  parsePitchList, pitchToMidi, scoreTicks, transposePitches, validateScore } from "@/lib/sequencer/model";
import { exportMidi, exportMusicXml } from "@/lib/sequencer/export";
import { mapSelectedPitches, movePitch, normalizeSelection, noteKey, parseKey, removeSelectedPitches, resolveSelection, toggleKey } from "@/lib/sequencer/note-selection";
import { importMusicXml } from "@/lib/sequencer/import-musicxml";
import { changeTimeSignature, rebarTimeSignature } from "@/lib/sequencer/operations";
import { moveWithMouse, writeWithMouse } from "@/lib/sequencer/mouse-editing";
import { duplicateMeasure, insertMeasureAfter, removeMeasure } from "@/lib/sequencer/measure-edit";
import { spellMidi } from "@/lib/sequencer/midi-input";
import { moveSelection, movesAsGroup, staffSteps } from "@/lib/sequencer/group-move";
import { SequencerAudio, type AudioState } from "@/lib/sequencer/audio-engine";
import { downloadBlob } from "@/lib/sequencer/graphics";
import { installAgentApi } from "@/lib/sequencer/agent-api";
import { PPQ, type Duration, type NoteEvent, type Scene, type Score, type ScoreAnnotation, type Voice, type VoiceId } from "@/lib/sequencer/types";
import type { MouseEditing } from "../ScoreView";

export const STORAGE_KEY = "storm-sequencer-studio-v5";
/** Borrador de la v4: se adopta la primera vez que se abre la v5. */
const V4_STORAGE_KEY = "storm-sequencer-studio-v1";

export type Draft = { voice: VoiceId; measure: number; beat: number; pitches: string; duration: Duration; dotted: boolean; triplet: boolean; tie: boolean };
type Clip = { voice: VoiceId; event: NoteEvent };
const emptyDraft: Draft = { voice: "melody", measure: 1, beat: 1, pitches: "C4", duration: "q", dotted: false, triplet: false, tie: false };
const clone = <T,>(value: T): T => structuredClone(value);
const round = (beat: number) => Math.round(beat * 1e6) / 1e6;
const failure = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

export function useStudio(locale: string) {
  const es = locale === "es";
  const t = useCallback((spanish: string, english: string) => es ? spanish : english, [es]);
  const [score, setScore] = useState<Score>(() => ({ ...createScore(), title: es ? "Sin título" : "Untitled" }));
  const [ready, setReady] = useState(false), [saved, setSaved] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [message, setMessage] = useState(""), [error, setError] = useState(""), [warning, setWarning] = useState("");
  const [audioState, setAudioState] = useState<AudioState>("stopped"), [tick, setTick] = useState<number | null>(null);
  const [metronome, setMetronome] = useState(false), [loop, setLoop] = useState(false);
  const [tool, setTool] = useState<MouseEditing["tool"]>("write"), [accidental, setAccidental] = useState<MouseEditing["accidental"]>("key");
  const [cipherVisible, setCipherVisible] = useState(true);
  /** Snap (como en Cubase): la rejilla a la que caen las notas al escribir y al moverlas. "note" = la figura activa. */
  const [snap, setSnap] = useState<"note" | number>("note");
  const [sceneId, setSceneId] = useState(""), [presentation, setPresentation] = useState(false);
  const [availability, setAvailability] = useState({ undo: 0, redo: 0, clipboard: 0 });
  const history = useRef<Score[]>([]), future = useRef<Score[]>([]), clipboard = useRef<Clip[]>([]);
  const audio = useRef<SequencerAudio | null>(null);

  useEffect(() => {
    audio.current = new SequencerAudio(setAudioState, setTick, setWarning);
    queueMicrotask(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(V4_STORAGE_KEY);
        if (stored) { const parsed = importScore(stored); setScore(parsed); setDraft(prev => ({ ...prev, voice: parsed.mode === "satb" ? "soprano" : "melody" })); }
      } catch { setError(es ? "No se pudo recuperar el borrador. Puedes abrir un archivo JSON." : "Draft recovery failed. You can open a JSON file."); }
      setReady(true);
    });
    return () => { audio.current?.dispose(); };
  }, [es]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(score)); setSaved(true); }
      catch { setSaved(false); setError(es ? "No se pudo autoguardar. Descarga tu proyecto JSON." : "Autosave failed. Download your JSON project."); }
    }, 500);
    return () => clearTimeout(timer);
  }, [score, ready, es]);

  const resolved = useMemo(() => resolveSelection(score, selected), [score, selected]);
  const selection: Clip[] = resolved.map(s => ({ voice: s.voice, event: s.whole ? s.event : { ...s.event, pitches: s.pitches } }));
  const selectedIds = useMemo(() => resolved.map(s => s.event.id), [resolved]);
  const voices = activeVoices(score);
  const scene = score.scenes.find(item => item.id === sceneId) ?? score.scenes[0];
  const positionTick = measureStart(score, Math.min(draft.measure, score.measures.length)) + Math.round((draft.beat - 1) * PPQ);

  const commit = useCallback((next: Score, notice = "") => {
    try {
      const valid = validateScore(next);
      history.current.push(score); if (history.current.length > 80) history.current.shift();
      future.current = [];
      setAvailability(prev => ({ ...prev, undo: history.current.length, redo: 0 }));
      audio.current?.stop(); setTick(null); setScore(valid); setSaved(false); setError(""); setMessage(notice);
      // El cursor siempre apunta a una voz y a un compás que existen en la partitura nueva.
      setDraft(prev => ({ ...prev, measure: Math.min(prev.measure, valid.measures.length),
        voice: valid.mode === "single" ? "melody" : prev.voice === "melody" ? "soprano" : prev.voice }));
      return true;
    } catch (error) { setError(failure(error, "Invalid score")); return false; }
  }, [score]);
  /** Envuelve una operación que puede lanzar un error musical y lo muestra en la barra de estado. */
  const attempt = useCallback((action: () => void) => { try { action(); } catch (error) { setError(failure(error, "Error")); } }, []);

  const bridge = useRef({ score, commit });
  useEffect(() => { bridge.current = { score, commit }; }, [score, commit]);
  useEffect(() => {
    if (!ready) return;
    return installAgentApi({ getScore: () => bridge.current.score,
      loadScore: next => { if (bridge.current.commit(next, es ? "Partitura cargada por un agente." : "Score loaded by an agent.")) { setSelected([]); setDraft(prev => ({ ...prev, measure: 1, beat: 1 })); } } });
  }, [ready, es]);

  const patchDraft = useCallback((change: Partial<Draft>) => { setDraft(prev => ({ ...prev, ...change })); setError(""); }, []);
  const hear = useCallback((next: Score, voiceId: VoiceId, pitches: string[], held = false) => {
    const voice = next.voices.find(v => v.id === voiceId);
    if (voice && pitches.length) void audio.current?.preview(voice, pitches, next.masterVolume, held).catch(() => setWarning("audio"));
  }, []);

  // ── Escritura con el mouse (partitura y editor de teclas) ───────────────
  const writeMouse = useCallback((voice: VoiceId, start: number, pitch: string, chord = false) => attempt(() => {
    const existing = score.voices.find(v => v.id === voice)!.events.find(e => e.start === start);
    const event: NoteEvent = chord && existing ? { ...existing, pitches: [...new Set([...existing.pitches, pitch])] }
      : { id: newId(), start, pitches: [pitch], duration: draft.duration, dotted: draft.dotted, triplet: draft.triplet, tie: draft.tie };
    const next = writeWithMouse(score, voice, event);
    if (commit(next)) {
      const at = locateTick(next, start);
      setDraft(prev => ({ ...prev, voice, measure: at.measure, beat: at.beat, pitches: event.pitches.join(" ") })); setSelected([event.id]);
      hear(next, voice, event.pitches);
    }
  }), [score, commit, attempt, hear, draft.duration, draft.dotted, draft.triplet, draft.tie]);
  const eraseMouse = useCallback((id: string) => {
    const next = clone(score); next.voices.forEach(v => { v.events = v.events.filter(e => e.id !== id); });
    if (commit(next)) setSelected(prev => prev.filter(item => parseKey(item).id !== id));
  }, [score, commit]);
  /** Arrastre de una nota que es parte de una selección: se mueve todo el grupo. */
  const moveGroup = useCallback((id: string, from: string, pitch: string, start?: number) => {
    const event = score.voices.flatMap(v => v.events).find(e => e.id === id)!;
    // Sin `start` el arrastre vino de la partitura (por grados); con `start`, del editor de teclas.
    const result = start === undefined
      ? moveSelection(score, selected, { kind: "steps", steps: staffSteps(from, pitch) })
      : moveSelection(score, selected, { kind: "keys", semitones: pitchToMidi(pitch) - pitchToMidi(from), ticks: start - event.start });
    if (commit(result.score, t(`${result.keys.length} notas movidas juntas.`, `${result.keys.length} notes moved together.`))) setSelected(result.keys);
  }, [score, selected, commit, t]);
  const moveMouse = useCallback((id: string, pitch: string, start?: number, ticks?: number) => attempt(() => {
    const event = score.voices.flatMap(v => v.events).find(e => e.id === id);
    if (ticks === undefined && event?.pitches.length && movesAsGroup(score, selected, id)) { moveGroup(id, event.pitches[0], pitch, start); return; }
    const next = moveWithMouse(score, id, pitch, start, ticks);
    if (commit(next)) {
      const voice = next.voices.find(v => v.events.some(e => e.id === id))!, event = voice.events.find(e => e.id === id)!, at = locateTick(next, event.start);
      setSelected([id]); setDraft(prev => ({ ...prev, voice: voice.id, measure: at.measure, beat: at.beat, pitches: event.pitches.join(" "), duration: event.duration, dotted: event.dotted, triplet: event.triplet }));
    }
  }), [score, selected, commit, attempt, moveGroup]);
  /** Arrastre en la partitura que también cambia el tiempo: grados del pentagrama + distancia en ticks. */
  const moveStaffMouse = useCallback((id: string, grabbed: string, steps: number, ticks: number, single: boolean) => attempt(() => {
    const keys = movesAsGroup(score, selected, id) ? selected : [single ? noteKey(id, grabbed) : id];
    const result = moveSelection(score, keys, { kind: "steps", steps, ticks });
    if (commit(result.score, keys.length > 1 ? t(`${result.keys.length} notas movidas juntas.`, `${result.keys.length} notes moved together.`) : undefined)) {
      setSelected(result.keys);
      const moved = result.score.voices.flatMap(v => v.events.map(event => ({ voice: v.id, event }))).find(({ event }) => result.keys.some(k => parseKey(k).id === event.id));
      if (moved) { const at = locateTick(result.score, moved.event.start); setDraft(prev => ({ ...prev, voice: moved.voice, measure: at.measure, beat: at.beat })); }
    }
  }), [score, selected, commit, attempt, t]);
  const movePitchMouse = useCallback((id: string, from: string, to: string) => attempt(() => {
    if (movesAsGroup(score, selected, id)) { moveGroup(id, from, to); return; }
    const next = movePitch(score, id, from, to);
    if (commit(next)) setSelected(normalizeSelection(next, [noteKey(id, to)]));
  }), [score, selected, commit, attempt, moveGroup]);
  const previewMouse = useCallback((id: string, pitch: string, from?: string) => {
    const voice = score.voices.find(v => v.events.some(e => e.id === id)), event = voice?.events.find(e => e.id === id);
    if (!voice || !event?.pitches.length) return;
    try {
      const pitches = from ? event.pitches.map(p => p === from ? pitch : p) : event.pitches.length === 1 ? [pitch] : transposePitches(event.pitches, pitchToMidi(pitch) - pitchToMidi(event.pitches[0]));
      hear(score, voice.id, pitches, true);
    } catch { /* un arrastre puede salir del rango admitido */ }
  }, [score, hear]);
  const positionMouse = useCallback((voice: VoiceId, start: number) => {
    const at = locateTick(score, start); setDraft(prev => ({ ...prev, voice, measure: at.measure, beat: at.beat })); setSelected([]);
  }, [score]);
  const snapTicks = snap === "note" ? durationTicks(draft) : snap;
  const mouse = useMemo<MouseEditing>(() => ({ tool, accidental, step: durationTicks(draft), snap: snapTicks, onWrite: writeMouse, onErase: eraseMouse, onMove: moveMouse,
    onMovePitch: movePitchMouse, onMoveStaff: moveStaffMouse, onPreview: previewMouse, onPreviewEnd: () => audio.current?.stopPreview(), onPosition: positionMouse, dragWithSelect: true }),
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `draft` solo aporta la figura
  [tool, accidental, snapTicks, draft.duration, draft.dotted, draft.triplet, writeMouse, eraseMouse, moveMouse, movePitchMouse, moveStaffMouse, previewMouse, positionMouse]);

  // ── Selección ───────────────────────────────────────────────────────────
  const selectNote = useCallback((key: string, extend = false) => {
    const { id } = parseKey(key);
    const voice = score.voices.find(v => v.events.some(e => e.id === id)), event = voice?.events.find(e => e.id === id);
    if (!voice || !event) return;
    setSelected(prev => extend ? toggleKey(score, prev, key) : normalizeSelection(score, [key]));
    const at = locateTick(score, event.start);
    setDraft({ voice: voice.id, measure: at.measure, beat: round(at.beat), pitches: event.pitches.join(" "), duration: event.duration, dotted: event.dotted, triplet: event.triplet, tie: event.tie });
    setError("");
  }, [score]);
  const selectMany = useCallback((keys: string[], additive: boolean) => {
    setSelected(prev => normalizeSelection(score, additive ? [...prev, ...keys] : keys));
  }, [score]);
  const selectAll = () => selectMany(voices.flatMap(v => v.events.map(e => e.id)), false);

  // ── Edición ─────────────────────────────────────────────────────────────
  const insert = (pitches?: string[], quiet = false) => attempt(() => {
    const event: NoteEvent = { id: newId(), start: positionTick, duration: draft.duration, dotted: draft.dotted, triplet: draft.triplet, tie: draft.tie, pitches: pitches ?? parsePitchList(draft.pitches) };
    const next = writeWithMouse(score, draft.voice, event);
    if (commit(next)) {
      setSelected([]);
      const end = event.start + durationTicks(event);
      if (end < scoreTicks(next)) { const at = locateTick(next, end); patchDraft({ measure: at.measure, beat: round(at.beat) }); }
      if (!quiet) hear(next, draft.voice, event.pitches);
    }
  });
  const commitPitchEdit = (edit: { score: Score; keys: string[] }, notice = "") => {
    if (!commit(edit.score, notice)) return;
    setSelected(edit.keys);
    const first = resolveSelection(edit.score, edit.keys)[0]; if (!first) return;
    patchDraft({ pitches: first.event.pitches.join(" ") }); hear(edit.score, first.voice, first.pitches);
  };
  const shiftSelection = (semitones: number) => attempt(() => commitPitchEdit(mapSelectedPitches(score, selected, pitch => transposePitches([pitch], semitones)[0])));
  const removeSelection = () => { if (selected.length && commit(removeSelectedPitches(score, selected))) setSelected([]); };
  const applyNoteValue = (value: Partial<Pick<Draft, "duration" | "dotted" | "triplet" | "tie">>) => {
    patchDraft(value);
    if (!selectedIds.length) return;
    const next = clone(score);
    for (const voice of next.voices) for (const event of voice.events) if (selectedIds.includes(event.id)) Object.assign(event, value);
    commit(next);
  };
  const applyAccidental = (value: MouseEditing["accidental"]) => {
    setAccidental(value); if (value === "key" || !selected.length) return;
    attempt(() => commitPitchEdit(mapSelectedPitches(score, selected, pitch => {
      const match = pitch.match(/^([A-G])([#b]*)(-?\d+)$/)!;
      const alteration = value === "#" && match[2] === "#" ? "##" : value === "b" && match[2] === "b" ? "bb" : value;
      const changed = match[1] + alteration + match[3]; pitchToMidi(changed); return changed;
    })));
  };
  const restore = (from: Score[], to: Score[]) => {
    const target = from.pop(); if (!target) return;
    to.push(score); audio.current?.stop(); setTick(null); setScore(target); setSelected([]); setSaved(false); setError("");
    setAvailability(prev => ({ ...prev, undo: history.current.length, redo: future.current.length }));
    setDraft(prev => ({ ...prev, measure: Math.min(prev.measure, target.measures.length), voice: target.mode === "single" ? "melody" : prev.voice === "melody" ? "soprano" : prev.voice }));
  };
  const undo = () => restore(history.current, future.current), redo = () => restore(future.current, history.current);
  const copy = () => {
    if (!selection.length) return false;
    clipboard.current = clone(selection); setAvailability(prev => ({ ...prev, clipboard: selection.length }));
    setMessage(t(selection.length + " eventos copiados.", selection.length + " events copied.")); return true;
  };
  const pasteAt = (at: number, items: Clip[]) => {
    if (!items.length) return;
    const origin = Math.min(...items.map(s => s.event.start));
    const span = Math.max(...items.map(s => s.event.start + durationTicks(s.event))) - origin;
    const next = clone(score);
    while (scoreTicks(next) < at + span) { const last = next.measures.at(-1)!; next.measures.push({ id: newId(), key: last.key, time: [...last.time] }); }
    const target = (voice: VoiceId): VoiceId => score.mode === "single" ? "melody" : voice === "melody" ? draft.voice : voice;
    const pasted: string[] = [];
    for (const voiceId of new Set(items.map(item => target(item.voice)))) {
      const voice = next.voices.find(v => v.id === voiceId)!;
      voice.events = voice.events.filter(e => e.start + durationTicks(e) <= at || e.start >= at + span);
    }
    for (const item of items) { const id = newId(); pasted.push(id); next.voices.find(v => v.id === target(item.voice))!.events.push({ ...item.event, id, start: at + item.event.start - origin }); }
    next.voices.forEach(v => v.events.sort((x, y) => x.start - y.start));
    if (commit(next)) {
      setSelected(pasted);
      const end = locateTick(next, Math.min(at + span, scoreTicks(next) - 1));
      setDraft(prev => ({ ...prev, measure: end.measure, beat: round(end.beat) }));
    }
  };
  const paste = () => pasteAt(positionTick, clipboard.current);
  const duplicateSelection = () => {
    if (!selection.length) return;
    clipboard.current = clone(selection); setAvailability(prev => ({ ...prev, clipboard: selection.length }));
    pasteAt(Math.max(...selection.map(s => s.event.start + durationTicks(s.event))), selection);
  };
  const cut = () => { if (copy()) removeSelection(); };

  // ── Transporte ──────────────────────────────────────────────────────────
  const play = () => {
    const staged = presentation && scene;
    const from = staged ? measureStart(score, scene.startMeasure) : positionTick;
    const to = staged ? measureStart(score, scene.endMeasure) + measureTicks(score.measures[scene.endMeasure - 1]) : scoreTicks(score);
    if (from >= to) { setError(t("Elige una posición dentro de la partitura.", "Choose a position within the score.")); return; }
    void audio.current?.play(score, from, to, metronome, loop);
  };
  const stop = () => { audio.current?.stop(); setTick(null); };
  const moveCursor = (target: number) => {
    stop(); setSelected([]);
    const at = locateTick(score, Math.max(0, Math.min(target, scoreTicks(score) - 1)));
    patchDraft({ measure: at.measure, beat: round(at.beat) });
  };
  const goToStart = () => moveCursor(0);
  const goToEnd = () => {
    const lastEnd = Math.max(0, ...voices.flatMap(v => v.events.map(e => e.start + durationTicks(e))));
    moveCursor(lastEnd < scoreTicks(score) ? lastEnd : measureStart(score, score.measures.length));
  };
  const stepCursor = (direction: 1 | -1) => moveCursor(positionTick + direction * durationTicks(draft));

  // ── Proyecto, compases y pistas ─────────────────────────────────────────
  const patchScore = (change: (next: Score) => void, notice = "") => { const next = clone(score); change(next); return commit(next, notice); };
  const setTitle = (title: string) => patchScore(next => { next.title = title; });
  const setTempo = (tempo: number) => patchScore(next => { next.tempo = tempo; });
  const setMasterVolume = (volume: number) => { audio.current?.setMasterVolume(volume); setScore(prev => ({ ...prev, masterVolume: volume })); setSaved(false); };
  /** Mezcla en vivo: no entra al historial ni detiene la reproducción. */
  const patchVoice = (id: VoiceId, change: Partial<Pick<Voice, "instrument" | "volume" | "mute" | "solo">>) => {
    setScore(prev => ({ ...prev, voices: prev.voices.map(v => v.id === id ? { ...v, ...change } : v) })); setSaved(false);
  };
  const changeMode = (mode: Score["mode"]) => { if (patchScore(next => { next.mode = mode; })) { setSelected([]); patchDraft({ voice: mode === "satb" ? "soprano" : "melody" }); } };
  const changeKey = (key: string) => patchScore(next => {
    const index = draft.measure - 1, old = score.measures[index].key;
    for (let i = index; i < next.measures.length && (i === index || (!score.measures[i].keyChange && score.measures[i].key === old)); i++) next.measures[i].key = key;
    next.measures[index].keyChange = true;
  });
  const changeMeter = (time: [number, number]) => {
    const old = score.measures[draft.measure - 1].time.join("/"), end = score.measures.findIndex((m, i) => i >= draft.measure && (m.timeChange || m.time.join("/") !== old));
    const last = end < 0 ? score.measures.length : end;
    try {
      let next = clone(score); for (let i = draft.measure; i <= last; i++) next = changeTimeSignature(next, i, time);
      next.measures[draft.measure - 1].timeChange = true; commit(next);
    } catch {
      attempt(() => { const { score: next, split } = rebarTimeSignature(score, draft.measure, last, time);
        commit(next, split ? t(`Barras reacomodadas: ${split} notas se dividieron con ligadura.`, `Re-barred: ${split} notes were split and tied.`) : ""); });
    }
  };
  const changeClef = (clef: "treble" | "bass") => patchScore(next => { next.measures[draft.measure - 1].clefs = { ...next.measures[draft.measure - 1].clefs, [draft.voice]: clef }; });
  /** Siempre al final, sin importar dónde esté el cursor: no recorre ninguna nota. */
  const addMeasure = () => patchScore(next => { const last = next.measures.at(-1)!; next.measures.push({ id: newId(), key: last.key, time: [...last.time] }); });
  const insertMeasure = () => attempt(() => { commit(insertMeasureAfter(score, draft.measure), t(`Compás nuevo después del ${draft.measure}.`, `New measure after ${draft.measure}.`)); });
  const removeMeasureAt = () => attempt(() => {
    const start = measureStart(score, draft.measure), end = start + measureTicks(score.measures[draft.measure - 1]);
    const busy = score.voices.some(v => v.events.some(e => e.pitches.length && e.start >= start && e.start < end));
    if (busy && !window.confirm(t(`El compás ${draft.measure} tiene música. ¿Quitarlo? (se puede deshacer)`, `Measure ${draft.measure} has music. Remove it? (undoable)`))) return;
    if (commit(removeMeasure(score, draft.measure), t("Compás quitado.", "Measure removed."))) { setSelected([]); patchDraft({ beat: 1 }); }
  });
  const duplicateMeasureTo = (to: number) => attempt(() => { commit(duplicateMeasure(score, draft.measure, to), t(`Compás ${draft.measure} copiado al ${to}.`, `Measure ${draft.measure} copied to ${to}.`)); });

  // ── Selección: cambios finos ────────────────────────────────────────────
  const toggleOrnament = () => {
    if (!selectedIds.length) return;
    const on = !selection.every(item => item.event.ornament);
    patchScore(next => { for (const voice of next.voices) for (const event of voice.events) if (selectedIds.includes(event.id)) { if (on) event.ornament = true; else delete event.ornament; } });
  };
  /** Aplica a la selección las notas escritas en el inspector. */
  const updateSelection = () => attempt(() => {
    const pitches = parsePitchList(draft.pitches);
    patchScore(next => { for (const voice of next.voices) for (const event of voice.events) if (selectedIds.includes(event.id)) event.pitches = [...pitches]; }, t("Selección actualizada.", "Selection updated."));
  });
  const setNoteText = (text: string) => {
    if (selection.length !== 1) return;
    patchScore(next => { const event = next.voices.find(v => v.id === selection[0].voice)!.events.find(e => e.id === selection[0].event.id)!; if (text) event.text = text; else delete event.text; });
  };
  /** Teclado MIDI: un acorde de teclas → evento en el cursor, con la grafía de la armadura. */
  const insertMidi = (notes: number[], quiet = false) => attempt(() => insert(notes.map(note => spellMidi(note, score.measures[Math.min(draft.measure, score.measures.length) - 1].key)), quiet));

  // ── Anotaciones de texto y escenas (marcadores) ─────────────────────────
  const setAnnotation = (kind: ScoreAnnotation["kind"], text: string, id?: string) => patchScore(next => {
    const rest = (next.annotations ?? []).filter(a => a.id !== id && !(a.kind === kind && a.measure === draft.measure && Math.abs(a.beat - draft.beat) < 1e-6));
    if (text.trim()) rest.push({ id: id ?? newId(), measure: draft.measure, beat: draft.beat, text: text.trim(), kind });
    next.annotations = rest;
  });
  const removeAnnotation = (id: string) => patchScore(next => { next.annotations = (next.annotations ?? []).filter(a => a.id !== id); });
  const addScene = () => {
    const id = newId();
    if (patchScore(next => { next.scenes.push({ id, title: t("Escena ", "Scene ") + (next.scenes.length + 1), caption: "", startMeasure: draft.measure, endMeasure: Math.min(draft.measure + 1, next.measures.length), aspect: "16:9", highlightVoice: "all" }); })) setSceneId(id);
  };
  const patchScene = (change: Partial<Scene>) => { if (scene) patchScore(next => { Object.assign(next.scenes.find(item => item.id === scene.id)!, change); }); };
  const removeScene = () => { if (scene && score.scenes.length > 1 && patchScore(next => { next.scenes = next.scenes.filter(item => item.id !== scene.id); })) setSceneId(""); };
  const newProject = () => {
    if (!window.confirm(t("¿Empezar un proyecto nuevo? Se borra la partitura actual (puedes deshacerlo).", "Start a new project? The current score is cleared (you can undo it)."))) return;
    const next = createScore(score.mode); next.title = t("Sin título", "Untitled");
    if (commit(next, t("Proyecto nuevo.", "New project."))) { setDraft({ ...emptyDraft, voice: score.mode === "satb" ? "soprano" : "melody" }); setSelected([]); }
  };
  const loadFile = async (file: File) => {
    try {
      if (file.size > 4_000_000) {
        setError(t("El archivo es demasiado grande (máx. 4 MB).", "The file is too large (max 4 MB)."));
        return;
      }
      const text = await file.text(), xml = text.trimStart().startsWith("<");
      const next = xml ? importMusicXml(text) : importScore(text);
      if (commit(next, t("Proyecto abierto.", "Project opened."))) { setSelected([]); setDraft({ ...emptyDraft, voice: next.mode === "satb" ? "soprano" : "melody" }); }
    } catch (error) { setError(failure(error, "Invalid file")); }
  };
  const fileName = (extension: string) => (score.title.trim().replace(/[\\/:*?"<>|]+/g, "-") || "storm-sequencer") + "." + extension;
  const saveJson = () => downloadBlob(new Blob([JSON.stringify(score, null, 2)], { type: "application/json" }), fileName("json"));
  const saveMidi = () => attempt(() => downloadBlob(new Blob([exportMidi(score) as BlobPart], { type: "audio/midi" }), fileName("mid")));
  const saveMusicXml = () => attempt(() => downloadBlob(new Blob([exportMusicXml(score)], { type: "application/vnd.recordare.musicxml+xml" }), fileName("musicxml")));
  const saveWav = async () => { const blob = await audio.current?.wav(score, 0, scoreTicks(score)); if (blob) downloadBlob(blob, fileName("wav")); };

  const cursor = locateTick(score, Math.min(tick ?? positionTick, Math.max(0, scoreTicks(score) - 1)));
  const measure = score.measures[Math.min(draft.measure, score.measures.length) - 1];

  return {
    es, t, score, ready, saved, selected, selectedIds, selection, draft, voices, positionTick, cursor, measure,
    message, error, warning, audioState, tick, metronome, loop, tool, accidental, availability, mouse, snap, setSnap,
    setMessage, setError, setMetronome, setLoop, setTool, patchDraft, commit, attempt,
    selectNote, selectMany, selectAll, setSelected,
    insert, shiftSelection, removeSelection, applyNoteValue, applyAccidental, undo, redo, copy, cut, paste, duplicateSelection,
    play, stop, goToStart, goToEnd, stepCursor, moveCursor,
    setTitle, setTempo, setMasterVolume, patchVoice, changeMode, changeKey, changeMeter, changeClef, addMeasure, insertMeasure, removeMeasureAt, duplicateMeasureTo,
    toggleOrnament, updateSelection, setNoteText, insertMidi, setAnnotation, removeAnnotation,
    scene, setSceneId, addScene, patchScene, removeScene, presentation, setPresentation, cipherVisible, setCipherVisible,
    newProject, loadFile, saveJson, saveMidi, saveMusicXml, saveWav,
    measureLength: measure ? measureTicks(measure) : 0,
  };
}
export type Studio = ReturnType<typeof useStudio>;
