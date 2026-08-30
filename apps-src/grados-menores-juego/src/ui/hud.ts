// hud.ts — La CONSOLA DE LATÓN Y HIELO (PLAN §6). Overlay HTML sobre el canvas,
// bilingüe y nítido (patrón de la casa). Construye su propio DOM: `index.html` solo
// aporta la sección vacía `#hud`.
//
// F5 la deja completa y viva con datos simulados. F6 sustituirá el simulador por el
// GameStateManager: esta clase NO tiene lógica de juego, solo pinta un `HudState` y
// avisa de las intenciones del jugador por callbacks.

import { t, lang } from "@/i18n";
import {
  DEGREE_GLOSSARY, DEGREE_SHORT_SUFFIX, sortDegrees, mutablePartner, type Degree,
} from "@/music/degrees";
import type { ConstellationId } from "@/config";
import { ConstellationMap } from "./constellation";

/**
 * Atajos §8: diatónicos 1–7 (I II III IV V VI VIIST) y cromáticos QWER en ORDEN DE
 * ESCALA (♭2, #4, #6, #7), que es como el alumno los piensa — no en el orden canónico.
 */
const DEGREE_KEYS: Record<Degree, string> = {
  I: "1", II: "2", III: "3", IV: "4", V: "5", VI: "6", VIIST: "7",
  IIfr: "Q", IVly: "W", VImel: "E", VIIsen: "R",
};

export type LeverMark = "correct" | "wrong";

export interface HudState {
  progress: number;
  total: number;
  drifts: number;
  points: number;
  streak: number;
  speedLabel: string;
  beaconsLeft: number;
  beaconsTotal: number;
  /** Fracción de ventana RESTANTE (1 → recién planteada, 0 → agotada). null = sin pregunta. */
  answerWindow: number | null;
  /** En Maestro la barra parpadea en el último 25 % (PLAN §6). */
  urgentWindow: boolean;
  message: string;
  /** Palancas ya usadas en esta pregunta: quedan bloqueadas. */
  locked: ReadonlySet<Degree>;
  marks: ReadonlyMap<Degree, LeverMark>;
}

export interface HudCallbacks {
  onDegree(degree: Degree): void;
  onBeacon(): void;
  onRepeat(): void;
}

export class Hud {
  private readonly levers = new Map<Degree, HTMLButtonElement>();
  private readonly constellation: ConstellationMap;
  private degrees: Degree[] = [];
  private mounted = false;

  private leverRow!: HTMLElement;
  private windowFill!: HTMLElement;
  private windowBar!: HTMLElement;
  private logLine!: HTMLElement;
  private pointsEl!: HTMLElement;
  private streakEl!: HTMLElement;
  private speedEl!: HTMLElement;
  private beaconRow!: HTMLElement;
  private beaconBtn!: HTMLButtonElement;
  private repeatBtn!: HTMLButtonElement;
  private mapCanvas!: HTMLCanvasElement;

  constructor(private readonly root: HTMLElement, private readonly callbacks: HudCallbacks) {
    this.build();
    this.constellation = new ConstellationMap(this.mapCanvas);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("resize", this.onResize);
  }

  // -------------------------------------------------------------------------
  // Construcción del DOM (una vez)
  // -------------------------------------------------------------------------
  private build(): void {
    this.root.innerHTML = "";
    this.root.classList.add("hud-layer");

    // Viñeta fría: vende la carlinga gratis y NO intercepta el drag de la mirada.
    const vignette = document.createElement("div");
    vignette.className = "cab-vignette";
    this.root.appendChild(vignette);

    const consoleEl = document.createElement("div");
    consoleEl.className = "console";

    // --- Fila superior: bitácora + ventana de respuesta ---
    this.logLine = document.createElement("p");
    this.logLine.className = "logline";
    consoleEl.appendChild(this.logLine);

    this.windowBar = document.createElement("div");
    this.windowBar.className = "answer-window idle";
    this.windowFill = document.createElement("div");
    this.windowFill.className = "answer-window-fill";
    this.windowBar.appendChild(this.windowFill);
    consoleEl.appendChild(this.windowBar);

    // --- Fila principal: marcadores | palancas | constelación y radiofaros ---
    const row = document.createElement("div");
    row.className = "console-row";
    row.appendChild(this.buildScoreboard());

    this.leverRow = document.createElement("div");
    this.leverRow.className = "lever-row";
    row.appendChild(this.leverRow);

    row.appendChild(this.buildRightPanel());
    consoleEl.appendChild(row);
    this.root.appendChild(consoleEl);
  }

  private buildScoreboard(): HTMLElement {
    const box = document.createElement("div");
    box.className = "scoreboard";
    const make = (labelKey: string): HTMLElement => {
      const cell = document.createElement("div");
      cell.className = "score-cell";
      const label = document.createElement("span");
      label.className = "score-label";
      label.textContent = t(labelKey);
      const value = document.createElement("strong");
      value.className = "score-value";
      cell.append(label, value);
      box.appendChild(cell);
      return value;
    };
    this.pointsEl = make("hud.points");
    this.streakEl = make("hud.streak");
    this.speedEl = make("hud.speed");
    return box;
  }

  private buildRightPanel(): HTMLElement {
    const panel = document.createElement("div");
    panel.className = "console-right";

    this.mapCanvas = document.createElement("canvas");
    this.mapCanvas.className = "constellation-map";
    panel.appendChild(this.mapCanvas);

    const tools = document.createElement("div");
    tools.className = "console-tools";

    this.beaconRow = document.createElement("div");
    this.beaconRow.className = "beacon-icons";
    tools.appendChild(this.beaconRow);

    this.beaconBtn = document.createElement("button");
    this.beaconBtn.className = "btn tiny brass";
    this.beaconBtn.append("📡 ", labelWithKey(t("hud.beacon"), "B"));
    this.beaconBtn.onclick = () => this.callbacks.onBeacon();
    tools.appendChild(this.beaconBtn);

    this.repeatBtn = document.createElement("button");
    this.repeatBtn.className = "btn tiny";
    this.repeatBtn.append("🔊 ", labelWithKey(t("hud.repeat"), "␣"));
    this.repeatBtn.onclick = () => this.callbacks.onRepeat();
    tools.appendChild(this.repeatBtn);

    panel.appendChild(tools);
    return panel;
  }

  /** La constelación de la ruta: el mapa de progreso (§5.8). */
  setConstellation(id: ConstellationId, total: number): void {
    this.constellation.resize();
    this.constellation.setConstellation(id, total);
  }

  // -------------------------------------------------------------------------
  // Palancas: SOLO los grados activos del setup, en orden canónico §3.1
  // -------------------------------------------------------------------------
  setDegrees(degrees: Iterable<Degree>): void {
    this.degrees = sortDegrees(degrees);
    this.leverRow.innerHTML = "";
    this.levers.clear();

    // Los pares mutables (VI/VImel, VIIST/VIIsen) se dibujan HERMANADOS dentro de un
    // arito, como las binarias del Cúmulo de Faroles (§5.7). Solo se hermanan si los
    // DOS están activos: con uno solo no hay confusión posible que señalar.
    const emitted = new Set<Degree>();
    for (const degree of this.degrees) {
      if (emitted.has(degree)) continue;
      const partner = mutablePartner(degree);
      if (partner && this.degrees.includes(partner)) {
        const pair = document.createElement("div");
        pair.className = "lever-pair";
        pair.title = DEGREE_GLOSSARY[degree][lang] + " · " + DEGREE_GLOSSARY[partner][lang];
        pair.append(this.buildLever(degree), this.buildLever(partner));
        this.leverRow.appendChild(pair);
        emitted.add(degree);
        emitted.add(partner);
      } else {
        this.leverRow.appendChild(this.buildLever(degree));
        emitted.add(degree);
      }
    }
    this.constellation.resize();
  }

  private buildLever(degree: Degree): HTMLButtonElement {
    const lever = document.createElement("button");
    lever.className = "lever";
    lever.title = DEGREE_GLOSSARY[degree][lang];

    const roman = document.createElement("span");
    roman.className = "lever-roman";
    roman.textContent = romanOf(degree);
    lever.appendChild(roman);

    const suffix = DEGREE_SHORT_SUFFIX[degree];
    if (suffix) {
      const tag = document.createElement("span");
      tag.className = "lever-suffix";
      tag.textContent = suffix;
      lever.appendChild(tag);
    }

    const key = document.createElement("kbd");
    key.className = "lever-key";
    key.textContent = DEGREE_KEYS[degree];
    lever.appendChild(key);

    lever.onclick = () => this.press(degree);
    this.levers.set(degree, lever);
    return lever;
  }

  private press(degree: Degree): void {
    const lever = this.levers.get(degree);
    if (!lever || lever.disabled) return;
    this.callbacks.onDegree(degree);
  }

  // -------------------------------------------------------------------------
  // Pintado
  // -------------------------------------------------------------------------
  update(state: HudState): void {
    this.pointsEl.textContent = String(state.points);
    this.streakEl.textContent = "×" + state.streak;
    this.speedEl.textContent = state.speedLabel;
    this.logLine.textContent = state.message;

    // Ventana de respuesta: se vacía de derecha a izquierda.
    const hasWindow = state.answerWindow !== null;
    this.windowBar.classList.toggle("idle", !hasWindow);
    this.windowBar.classList.toggle("urgent", hasWindow && state.urgentWindow);
    const fill = Math.max(0, Math.min(1, state.answerWindow ?? 0));
    this.windowFill.style.width = (fill * 100) + "%";

    for (const [degree, lever] of this.levers) {
      const mark = state.marks.get(degree);
      lever.classList.toggle("correct", mark === "correct");
      lever.classList.toggle("wrong", mark === "wrong");
      lever.classList.toggle("locked", state.locked.has(degree));
      lever.disabled = state.locked.has(degree) || !hasWindow;
    }

    this.renderBeacons(state.beaconsLeft, state.beaconsTotal);
    this.beaconBtn.disabled = state.beaconsLeft <= 0;
    this.constellation.render({
      progress: state.progress, total: state.total, drifts: state.drifts,
    });
  }

  private renderBeacons(left: number, total: number): void {
    if (this.beaconRow.childElementCount !== total) {
      this.beaconRow.innerHTML = "";
      for (let i = 0; i < total; i++) {
        const icon = document.createElement("span");
        icon.className = "beacon-icon";
        icon.textContent = "📡";
        this.beaconRow.appendChild(icon);
      }
    }
    const icons = this.beaconRow.children;
    for (let i = 0; i < icons.length; i++) {
      icons[i].classList.toggle("spent", i >= left);
    }
  }

  show(): void {
    this.mounted = true;
    this.root.classList.remove("hidden");
    this.root.classList.add("active");
    this.constellation.resize();
  }

  hide(): void {
    this.mounted = false;
    this.root.classList.add("hidden");
    this.root.classList.remove("active");
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("resize", this.onResize);
  }

  // -------------------------------------------------------------------------
  // Teclado (PLAN §8). Los atajos solo responden si el grado está activo.
  // -------------------------------------------------------------------------
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.mounted || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.code === "Space") {
      event.preventDefault();
      this.callbacks.onRepeat();
      return;
    }
    const key = event.key.toUpperCase();
    if (key === "B") {
      event.preventDefault();
      if (!this.beaconBtn.disabled) this.callbacks.onBeacon();
      return;
    }
    for (const degree of this.degrees) {
      if (DEGREE_KEYS[degree] !== key) continue;
      event.preventDefault();
      this.press(degree);
      return;
    }
  };

  private readonly onResize = (): void => {
    if (this.mounted) this.constellation.resize();
  };
}

/** "IVly" → "IV", "VIIST" → "VII": la palanca muestra el romano, el sufijo va aparte. */
function romanOf(degree: Degree): string {
  const match = /^[IVX]+/.exec(degree);
  return match ? match[0] : degree;
}

/** Etiqueta + tecla, sin innerHTML: el texto viene de i18n y no se interpola en markup. */
function labelWithKey(label: string, key: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  const span = document.createElement("span");
  span.textContent = label;
  const kbd = document.createElement("kbd");
  kbd.textContent = key;
  frag.append(span, " ", kbd);
  return frag;
}
