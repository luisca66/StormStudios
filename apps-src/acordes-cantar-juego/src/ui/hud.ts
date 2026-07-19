// La CONSOLA DE LATÓN (PLAN §6): overlay HTML inferior — afinador al centro,
// cuerda actual con medallones-linterna, temporizador de viento, altímetro,
// catalejo y score/racha. F5 la monta con datos reales de altitud y blips
// falsos; F6 conecta el loop de canto.

import { TunerView, type TunerRenderInput } from "./tuner";
import { CompassView, type CompassBlip } from "./compass";
import { t } from "../i18n";

export type MedallionState = "off" | "active" | "lit" | "ghost";

export interface Medallion {
  label: string; // etiqueta de grado (Fund., 3ª…) o nombre revelado
  state: MedallionState;
  color: string; // color de familia
}

export class HUD {
  private tuner: TunerView;
  private compass: CompassView;
  private altMeters: HTMLElement;
  private altLayer: HTMLElement;
  private scoreEl: HTMLElement;
  private streakEl: HTMLElement;
  private chordNameEl: HTMLElement;
  private medalsEl: HTMLElement;
  private windFill: HTMLElement;
  private windWrap: HTMLElement;
  private refBtn: HTMLButtonElement;
  private modeEl: HTMLElement;
  private lastStreak = 0;

  /** F6: re-escuchar la referencia (ilimitado, sin penalización). */
  onReference: (() => void) | null = null;

  constructor() {
    const $ = (id: string) => {
      const el = document.getElementById(id);
      if (!el) throw new Error(`HUD: falta #${id}`);
      return el;
    };
    this.tuner = new TunerView($("console-tuner") as HTMLCanvasElement);
    this.compass = new CompassView($("compass-canvas") as HTMLCanvasElement);
    this.altMeters = $("alt-meters");
    this.altLayer = $("alt-layer");
    this.scoreEl = $("hud-score");
    this.streakEl = $("hud-streak");
    this.chordNameEl = $("chord-name");
    this.medalsEl = $("lantern-medals");
    this.windFill = $("wind-fill");
    this.windWrap = $("wind-timer");
    this.refBtn = $("ref-btn") as HTMLButtonElement;
    this.modeEl = $("mode-meter");
    this.refBtn.addEventListener("click", () => this.onReference?.());
    this.setChord(null, []);
    this.setWindTimer(null);
    this.setScore(0);
    this.setStreak(0);
    this.setModeText("");
  }

  setAltitude(meters: number, layerKey: string): void {
    this.altMeters.textContent = `${meters.toLocaleString("es-MX")} m`;
    this.altLayer.textContent = t(layerKey);
  }

  setScore(score: number): void {
    this.scoreEl.textContent = String(score);
  }

  setStreak(streak: number): void {
    this.streakEl.textContent = `×${streak}`;
    if (streak > this.lastStreak) {
      this.streakEl.classList.remove("bump");
      void this.streakEl.offsetWidth; // reinicia la animación
      this.streakEl.classList.add("bump");
    }
    this.lastStreak = streak;
  }

  /** Cuerda actual: nombre anunciado + medallones. null = sin cuerda amarrada. */
  setChord(name: string | null, medallions: Medallion[]): void {
    this.chordNameEl.textContent = name ?? "—";
    this.refBtn.style.visibility = name ? "visible" : "hidden";
    this.medalsEl.innerHTML = "";
    for (const m of medallions) {
      const el = document.createElement("span");
      el.className = `medal ${m.state}`;
      el.textContent = m.label;
      if (m.state === "lit" || m.state === "active") {
        el.style.setProperty("--glow", m.color);
      }
      this.medalsEl.appendChild(el);
    }
  }

  /** frac 1→0 (cuerda deshilachándose). null = oculto. */
  setWindTimer(frac: number | null): void {
    this.windWrap.style.visibility = frac === null ? "hidden" : "visible";
    if (frac !== null) {
      const f = Math.max(0, Math.min(1, frac));
      this.windFill.style.width = `${f * 100}%`;
      this.windFill.classList.toggle("low", f < 0.25);
    }
  }

  /** Medidor de modo: gas (contrarreloj) o parches de tela (supervivencia). */
  setModeText(text: string): void {
    this.modeEl.textContent = text;
    this.modeEl.style.display = text ? "" : "none";
  }

  renderTuner(input: TunerRenderInput): void {
    this.tuner.render(input);
  }

  renderCompass(yaw: number, blips: CompassBlip[], elapsed: number): void {
    this.compass.render(yaw, blips, elapsed);
  }
}
