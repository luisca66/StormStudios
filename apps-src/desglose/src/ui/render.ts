/**
 * render.ts — Construye la UI una vez y la actualiza por estado.
 *
 * Estrategia: el DOM estable (chips, selects, slider, botones) se crea al montar
 * y solo se actualizan sus partes dinámicas (selección, HUD, banner, marcadores
 * y los botones por nota). Así el slider y los selects no se reconstruyen.
 */
import {
  CHORD_SIZES,
  INSTRUMENT_OPTIONS,
  type Instrument,
} from "../config";
import type { GameController, GameState } from "../game/controller";
import { strings, type Lang } from "../i18n";

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function mountUI(root: HTMLElement, controller: GameController, lang: Lang): void {
  const t = strings(lang);

  // ── Estructura raíz ────────────────────────────────────────────────────────
  const app = el("div", "dg");

  // Escenario
  const stage = el("div", "dg-stage");
  const stageGlow = el("div", "dg-stage-glow");
  const caption = el("div", "dg-stage-caption");
  const kicker = el("span", "dg-stage-kicker");
  const title = el("h1", "dg-stage-title");
  const sub = el("span", "dg-stage-sub");
  caption.append(kicker, title, sub);
  const markers = el("div", "dg-markers");
  stage.append(stageGlow, caption, markers);

  // Panel
  const panel = el("div", "dg-panel");

  // HUD (4 métricas)
  const hud = el("div", "dg-hud");
  const hudInstrument = makeMetric(t.instrument);
  const hudRange = makeMetric(t.range);
  const hudChord = makeMetric(t.chord);
  const hudVolume = makeMetric(t.volume);
  hud.append(hudInstrument.wrap, hudRange.wrap, hudChord.wrap, hudVolume.wrap);

  // Banner de resultado
  const banner = el("div", "dg-banner");
  banner.hidden = true;

  // Instrumento
  const instrumentSection = makeSection(t.instrument);
  const instrumentChips = el("div", "dg-chips");
  const instrumentButtons = new Map<Instrument, HTMLButtonElement>();
  for (const option of INSTRUMENT_OPTIONS) {
    const chip = el("button", "dg-chip", instrumentLabel(option, t));
    chip.type = "button";
    chip.addEventListener("click", () => controller.setInstrument(option));
    instrumentButtons.set(option, chip);
    instrumentChips.append(chip);
  }
  instrumentSection.append(instrumentChips);

  // Rango
  const rangeSection = makeSection(t.range);
  const rangeRow = el("div", "dg-range");
  const startSelect = makeNoteSelect(controller.allNotes, t.rangeStart);
  const endSelect = makeNoteSelect(controller.allNotes, t.rangeEnd);
  startSelect.select.addEventListener("change", () =>
    controller.setStartNote(startSelect.select.value),
  );
  endSelect.select.addEventListener("change", () =>
    controller.setEndNote(endSelect.select.value),
  );
  rangeRow.append(startSelect.wrap, endSelect.wrap);
  rangeSection.append(rangeRow);

  // Tamaño del acorde
  const sizeSection = makeSection(t.chordSize);
  const sizeChips = el("div", "dg-chips");
  const sizeButtons = new Map<number, HTMLButtonElement>();
  for (const size of CHORD_SIZES) {
    const chip = el("button", "dg-chip", String(size));
    chip.type = "button";
    chip.addEventListener("click", () => controller.setNumberOfNotes(size));
    sizeButtons.set(size, chip);
    sizeChips.append(chip);
  }
  sizeSection.append(sizeChips);

  // Volumen
  const volumeSection = makeSection(t.volume);
  const volumeBox = el("div", "dg-volume");
  const volumeHead = el("div", "dg-volume-head");
  const volumeValue = el("span", "dg-volume-value");
  volumeHead.append(el("span", "dg-volume-label", t.volume), volumeValue);
  const slider = el("input", "dg-slider");
  slider.type = "range";
  slider.min = "15";
  slider.max = "100";
  slider.step = "1";
  slider.addEventListener("input", () =>
    controller.setVolume(Number(slider.value) / 100),
  );
  volumeBox.append(volumeHead, slider, el("span", "dg-volume-hint", t.volumeHint));
  volumeSection.append(volumeBox);

  // Respuestas (dinámico por acorde)
  const answers = el("div", "dg-answers");

  // Acciones
  const actions = el("div", "dg-actions");
  const newBtn = el("button", "dg-btn dg-btn-primary", t.newQuestion);
  newBtn.type = "button";
  newBtn.addEventListener("click", () => controller.newQuestion());
  const repeatBtn = el("button", "dg-btn dg-btn-secondary", t.repeat);
  repeatBtn.type = "button";
  repeatBtn.addEventListener("click", () => controller.repeat());
  actions.append(newBtn, repeatBtn);

  panel.append(
    hud,
    banner,
    instrumentSection,
    rangeSection,
    sizeSection,
    volumeSection,
    answers,
    actions,
  );

  app.append(stage, panel);

  // ── Splash ───────────────────────────────────────────────────────────────
  const splash = buildSplash(t, async (button) => {
    button.disabled = true;
    await controller.start();
    splash.remove();
  });

  root.append(app, splash);

  // ── Suscripción / actualización ────────────────────────────────────────────
  let lastChordKey = "";

  controller.subscribe((state) => {
    // Caption del escenario
    const active = state.currentChord.length > 0;
    kicker.textContent = active ? t.chordActive : t.stageReady;
    title.textContent = state.questionText;
    sub.textContent = `${instrumentLabel(state.instrument, t)} • ${state.numberOfNotes} ${t.notes}`;

    // HUD
    hudInstrument.value.textContent = instrumentLabel(state.instrument, t);
    hudRange.value.textContent = `${state.startNote} – ${state.endNote}`;
    hudChord.value.textContent = `${state.numberOfNotes} ${t.notes}`;
    hudVolume.value.textContent = `${Math.round(state.volume * 100)}%`;

    // Selección de chips
    for (const [option, chip] of instrumentButtons) {
      chip.classList.toggle("on", state.instrument === option);
    }
    for (const [size, chip] of sizeButtons) {
      chip.classList.toggle("on", state.numberOfNotes === size);
    }

    // Selects (sin romper foco)
    if (startSelect.select.value !== state.startNote) startSelect.select.value = state.startNote;
    if (endSelect.select.value !== state.endNote) endSelect.select.value = state.endNote;

    // Slider (solo si el valor lógico cambió desde fuera)
    const pct = Math.round(state.volume * 100);
    if (slider.value !== String(pct)) slider.value = String(pct);
    volumeValue.textContent = `${pct}%`;

    // Banner
    if (state.resultMessage) {
      banner.hidden = false;
      banner.textContent = state.resultMessage;
      banner.dataset.kind = state.resultKind;
    } else {
      banner.hidden = true;
    }

    // Botón repetir
    repeatBtn.disabled = !active;
    // Bloquea controles mientras se está escuchando una nota
    const listening = state.noteBeingRecorded !== null;
    newBtn.disabled = listening;

    // Marcadores del escenario
    renderMarkers(markers, state, t);

    // Respuestas por nota: reconstruir solo si cambió el acorde
    const chordKey = state.currentChord.join(",");
    if (chordKey !== lastChordKey) {
      lastChordKey = chordKey;
      renderAnswers(answers, state, t, controller);
    } else {
      updateAnswers(answers, state, t);
    }
  });
}

// ── Helpers de construcción ───────────────────────────────────────────────────

function makeSection(titleText: string): HTMLElement {
  const wrap = el("section", "dg-section");
  wrap.append(el("span", "dg-section-title", titleText));
  return wrap;
}

function makeMetric(label: string): {
  wrap: HTMLElement;
  value: HTMLElement;
} {
  const wrap = el("div", "dg-metric");
  wrap.append(el("span", "dg-metric-label", label));
  const value = el("span", "dg-metric-value", "—");
  wrap.append(value);
  return { wrap, value };
}

function makeNoteSelect(
  notes: string[],
  label: string,
): { wrap: HTMLElement; select: HTMLSelectElement } {
  const wrap = el("label", "dg-field");
  wrap.append(el("span", "dg-field-label", label));
  const select = el("select", "dg-select");
  for (const note of notes) {
    const opt = el("option", undefined, note);
    opt.value = note;
    select.append(opt);
  }
  wrap.append(select);
  return { wrap, select };
}

function buildSplash(
  t: ReturnType<typeof strings>,
  onStart: (button: HTMLButtonElement) => void,
): HTMLElement {
  const splash = el("div", "dg-splash");
  const card = el("div", "dg-splash-card");
  card.append(el("h1", "dg-splash-title", t.splashTitle));
  card.append(el("p", "dg-splash-tagline", t.splashTagline));
  card.append(el("p", "dg-splash-hint", t.splashHint));
  const button = el("button", "dg-btn dg-btn-primary dg-splash-btn", t.splashStart);
  button.type = "button";
  button.addEventListener("click", () => onStart(button));
  card.append(button);
  splash.append(card);
  return splash;
}

// ── Render dinámico ───────────────────────────────────────────────────────────

function markerState(state: GameState, note: string, index: number): {
  cls: string;
  label: string;
} {
  if (state.noteBeingRecorded === note) return { cls: "listening", label: "" };
  if (state.correctlyAnswered.has(note)) return { cls: "solved", label: "" };
  if (state.mutedNotes.has(index)) return { cls: "muted", label: "" };
  return { cls: "pending", label: "" };
}

function markerStateText(state: GameState, note: string, index: number, t: ReturnType<typeof strings>): string {
  if (state.noteBeingRecorded === note) {
    return t.holdProgress(Math.round(state.pitchHoldProgress * 100));
  }
  if (state.correctlyAnswered.has(note)) return t.stateSolved;
  if (state.mutedNotes.has(index)) return t.stateMuted;
  return t.statePending;
}

function renderMarkers(container: HTMLElement, state: GameState, t: ReturnType<typeof strings>): void {
  container.replaceChildren();
  state.currentChord.forEach((note, index) => {
    const { cls } = markerState(state, note, index);
    const marker = el("div", `dg-marker ${cls}`);
    marker.append(el("span", "dg-marker-name", t.note(index + 1)));
    marker.append(el("span", "dg-marker-state", markerStateText(state, note, index, t)));
    container.append(marker);
  });
}

function renderAnswers(
  container: HTMLElement,
  state: GameState,
  t: ReturnType<typeof strings>,
  controller: GameController,
): void {
  container.replaceChildren();
  if (state.currentChord.length === 0) return;

  // Silenciar notas
  const muteSection = el("section", "dg-section");
  muteSection.append(el("span", "dg-section-title", t.muteNotes));
  const muteRow = el("div", "dg-chips");
  state.currentChord.forEach((_, index) => {
    const chip = el("button", "dg-chip dg-mute", t.note(index + 1));
    chip.type = "button";
    chip.dataset.mute = String(index);
    chip.addEventListener("click", () => controller.toggleMute(index));
    muteRow.append(chip);
  });
  muteSection.append(muteRow);

  // Escucha y responde
  const answerSection = el("section", "dg-section");
  answerSection.append(el("span", "dg-section-title", t.listenAndAnswer));
  const answerRow = el("div", "dg-answer-grid");
  state.currentChord.forEach((note, index) => {
    const label = t.note(index + 1);
    const btn = el("button", "dg-answer", label);
    btn.type = "button";
    btn.dataset.answer = String(index);
    btn.addEventListener("click", () => void controller.listenForNote(note, label));
    answerRow.append(btn);
  });
  answerSection.append(answerRow);

  container.append(muteSection, answerSection);
  updateAnswers(container, state, t);
}

function updateAnswers(container: HTMLElement, state: GameState, t: ReturnType<typeof strings>): void {
  const listening = state.noteBeingRecorded !== null;
  container.querySelectorAll<HTMLButtonElement>("[data-mute]").forEach((chip) => {
    const index = Number(chip.dataset.mute);
    chip.classList.toggle("on", !state.mutedNotes.has(index));
  });
  container.querySelectorAll<HTMLButtonElement>("[data-answer]").forEach((btn) => {
    const index = Number(btn.dataset.answer);
    const note = state.currentChord[index];
    const isRecording = state.noteBeingRecorded === note;
    const isSolved = state.correctlyAnswered.has(note);
    btn.classList.toggle("recording", isRecording);
    btn.classList.toggle("solved", isSolved);
    btn.disabled = listening;
    btn.textContent = isRecording
      ? `${t.listening} ${Math.round(state.pitchHoldProgress * 100)}%`
      : t.note(index + 1);
  });
}

function instrumentLabel(
  instrument: Instrument,
  t: ReturnType<typeof strings>,
): string {
  return instrument === "random" ? t.randomInstrument : t.instrumentName(instrument);
}
