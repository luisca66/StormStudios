// Consola de la batisfera (PLAN §8). Marco, consolas e instrumental son el modelo de
// Blender (3d/cockpit.ts); este HUD pone encima los datos y botones reales, alineados
// con las pantallas del modelo mediante setLayout().

import { getLang, t } from "../i18n";
import { chordName, type ChordType } from "@/music/chords";
import { Sonar, type SonarBlip } from "./sonar";
import { INTERACTION } from "@/config";
import type { CockpitLayout, ScreenRect } from "../3d/cockpit";

export class HUD {
  private sonar: Sonar;
  private depthValue!: HTMLElement;
  private zoneName!: HTMLElement;
  private targetDistance!: HTMLElement;
  private scoreValue!: HTMLElement;
  private streakValue!: HTMLElement;
  /** Contenedor de botones de respuesta (lo llena F5). */
  answerArea!: HTMLElement;
  /** Prompt sobre los botones ("¿Qué acorde canta?"). */
  answerPrompt!: HTMLElement;
  /** Medidores por modo (F6). */
  o2Meter!: HTMLElement;
  hullMeter!: HTMLElement;
  /** Banner de feedback (F5). */
  feedback!: HTMLElement;
  /** Botón "Abortar misión" — main.ts conecta el click. */
  abortBtn!: HTMLElement;

  constructor(private root: HTMLElement) {
    root.innerHTML = `
      <div id="hull-cracks" class="hull-cracks"></div>
      <div id="hud-feedback" class="hud-feedback"></div>
      <button id="hud-abort" class="abort-btn" title="${t("hud.abort")}">✕ <span data-i18n="hud.abort">${t("hud.abort")}</span></button>

      <aside class="side-panel left">
        <div class="crt sonar-screen">
          <canvas id="sonar-canvas" width="120" height="120"></canvas>
          <div class="sonar-distance">
            <span data-i18n="hud.nearest">${t("hud.nearest")}</span>
            <b id="target-distance">—</b>
          </div>
        </div>
      </aside>

      <aside class="side-panel right">
        <div class="crt stat-screen depth-screen">
          <label data-i18n="hud.depth">${t("hud.depth")}</label>
          <div id="depth-value" class="depth-value">0 m</div>
          <div id="zone-name" class="zone-name"></div>
        </div>
        <div class="crt stat-screen stat-grid">
          <div>
            <label data-i18n="hud.score">${t("hud.score")}</label>
            <b id="hud-score" class="stat-big">0</b>
          </div>
          <div>
            <label data-i18n="hud.streak">${t("hud.streak")}</label>
            <b id="hud-streak" class="stat-big">0</b>
          </div>
          <div>
            <label data-i18n="hud.quota">${t("hud.quota")}</label>
            <b id="hud-quota" class="stat-big">0/8</b>
          </div>
        </div>
        <div id="o2-meter" class="meter hidden">
          <span data-i18n="hud.oxygen">${t("hud.oxygen")}</span>
          <div class="o2-bar"><div id="o2-fill" class="o2-fill"></div></div>
        </div>
        <div id="hull-meter" class="meter hidden"></div>
      </aside>

      <div class="touch-controls">
        <div id="joy-zone" class="joy-zone"><div id="joy-knob" class="joy-knob"></div></div>
        <div class="vert-btns">
          <button id="btn-up" type="button">▲</button>
          <button id="btn-down" type="button">▼</button>
        </div>
      </div>
      <div class="console-bottom">
        <div class="console-panel">
          <div id="answer-prompt" class="answer-prompt hidden"></div>
          <div id="answer-area" class="answer-area"></div>
        </div>
      </div>
    `;

    const q = <T extends HTMLElement>(sel: string): T => {
      const node = root.querySelector<T>(sel);
      if (!node) throw new Error(`HUD: falta ${sel}`);
      return node;
    };

    this.depthValue = q("#depth-value");
    this.zoneName = q("#zone-name");
    this.targetDistance = q("#target-distance");
    this.scoreValue = q("#hud-score");
    this.streakValue = q("#hud-streak");
    this.answerArea = q("#answer-area");
    this.answerPrompt = q("#answer-prompt");
    this.o2Meter = q("#o2-meter");
    this.hullMeter = q("#hull-meter");
    this.feedback = q("#hud-feedback");
    this.abortBtn = q("#hud-abort");
    this.sonar = new Sonar(q<HTMLCanvasElement>("#sonar-canvas"));
  }

  /** Alinea sonar, datos y respuestas con las pantallas del modelo 3D (px CSS). */
  setLayout(layout: CockpitLayout): void {
    this.root.classList.toggle("cabin-narrow", layout.narrow);
    const set = (name: string, rect?: ScreenRect): void => {
      if (!rect) return;
      this.root.style.setProperty(`--${name}-x`, `${rect.x.toFixed(1)}px`);
      this.root.style.setProperty(`--${name}-y`, `${rect.y.toFixed(1)}px`);
      this.root.style.setProperty(`--${name}-w`, `${rect.width.toFixed(1)}px`);
      this.root.style.setProperty(`--${name}-h`, `${rect.height.toFixed(1)}px`);
    };
    set("sonar", layout.sonar);
    set("stats", layout.stats);
    set("answers", layout.answers);
  }

  show(): void {
    this.root.classList.remove("hidden");
  }

  hide(): void {
    this.root.classList.add("hidden");
  }

  setDepth(meters: number, zoneNameText: string): void {
    this.depthValue.textContent = `${meters.toLocaleString()} m`;
    this.zoneName.textContent = zoneNameText;
  }

  setScore(score: number): void {
    this.scoreValue.textContent = String(score);
  }

  setStreak(streak: number): void {
    this.streakValue.textContent = String(streak);
    this.streakValue.classList.toggle("hot", streak >= 3);
  }

  setQuota(current: number, total: number): void {
    const el = this.root.querySelector("#hud-quota");
    if (el) el.textContent = `${Math.min(current, total)}/${total}`;
  }

  /** Configura los medidores según el modo (F6). */
  setModeMeters(mode: "EXPEDITION" | "TIME_ATTACK" | "SURVIVAL"): void {
    this.o2Meter.classList.toggle("hidden", mode !== "TIME_ATTACK");
    this.hullMeter.classList.toggle("hidden", mode !== "SURVIVAL");
    const cracks = this.root.querySelector("#hull-cracks");
    if (cracks) cracks.innerHTML = "";
  }

  setO2(fraction: number): void {
    const fill = this.root.querySelector<HTMLElement>("#o2-fill");
    if (fill) fill.style.width = `${Math.max(0, Math.min(1, fraction)) * 100}%`;
  }

  setHull(remaining: number, total: number): void {
    this.hullMeter.innerHTML =
      `<span>${t("hud.hull")}</span><div class="hull-pips">` +
      Array.from({ length: total }, (_, i) =>
        `<i class="${i < remaining ? "ok" : "cracked"}"></i>`,
      ).join("") +
      `</div>`;
  }

  /** Grieta visual en el cristal (Supervivencia). */
  addCrack(): void {
    const cracks = this.root.querySelector("#hull-cracks");
    if (!cracks) return;
    const crack = document.createElement("span");
    crack.textContent = "✱";
    crack.style.left = `${25 + Math.random() * 50}%`;
    crack.style.top = `${20 + Math.random() * 45}%`;
    crack.style.transform = `rotate(${Math.random() * 90 - 45}deg) scale(${0.8 + Math.random() * 0.7})`;
    cracks.appendChild(crack);
  }

  /** Muestra los botones de respuesta (pool introducido o familia del eco). */
  showQuestion(
    options: ChordType[],
    onPick: (chordId: string) => void,
    onRelisten: () => void,
    familyLabel?: string,
  ): void {
    this.answerPrompt.textContent = familyLabel
      ? `${t("hud.family")}: ${familyLabel}`
      : t("hud.answer");
    this.answerPrompt.classList.remove("hidden");

    this.answerArea.innerHTML = "";
    const relisten = document.createElement("button");
    relisten.className = "answer-btn relisten";
    relisten.textContent = "🔊";
    relisten.title = t("hud.relisten");
    relisten.addEventListener("click", onRelisten);
    this.answerArea.appendChild(relisten);

    const lang = getLang();
    options.forEach((chord, i) => {
      const btn = document.createElement("button");
      btn.className = "answer-btn";
      btn.textContent = chordName(chord, lang);
      btn.dataset.key = String(i + 1);
      btn.addEventListener("click", () => onPick(chord.id));
      this.answerArea.appendChild(btn);
    });
  }

  clearQuestion(): void {
    this.answerArea.innerHTML = "";
    this.answerPrompt.classList.add("hidden");
  }

  /** Botón n (1..9) del panel actual — para responder con teclado. */
  pickByIndex(n: number): void {
    const btns = this.answerArea.querySelectorAll<HTMLButtonElement>(".answer-btn:not(.relisten)");
    btns[n - 1]?.click();
  }

  private feedbackTimer = 0;

  showFeedback(good: boolean, text: string): void {
    this.feedback.textContent = text;
    this.feedback.classList.remove("good", "bad");
    this.feedback.classList.add("show", good ? "good" : "bad");
    window.clearTimeout(this.feedbackTimer);
    this.feedbackTimer = window.setTimeout(
      () => this.feedback.classList.remove("show"),
      2300,
    );
  }

  /** Llamar cada frame: anima el sonar. */
  tick(dt: number, blips: SonarBlip[]): void {
    this.sonar.update(dt, blips);
    const nearest = blips.reduce<SonarBlip | null>(
      (best, blip) => (!best || blip.range < best.range ? blip : best),
      null,
    );
    this.targetDistance.textContent = nearest ? `${Math.round(nearest.range)} m` : "—";
    this.targetDistance.classList.toggle(
      "in-range",
      Boolean(nearest && nearest.range <= INTERACTION.interactMaxDistance),
    );
  }
}
