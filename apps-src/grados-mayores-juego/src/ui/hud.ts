// hud.ts — La CONSOLA DE LATÓN (PLAN §6). Overlay HTML sobre el canvas, bilingüe y
// nítido (patrón Batisfera). Construye su propio DOM: `index.html` solo aporta la
// sección vacía `#hud`.
//
// F5 la deja completa y viva con datos simulados. F6 sustituirá el simulador por el
// GameStateManager: esta clase NO tiene lógica de juego, solo pinta un `HudState` y
// avisa de las intenciones del jugador por callbacks.

import { t, lang } from "@/i18n";
import {
  DEGREE_GLOSSARY, DEGREE_SHORT_SUFFIX, sortDegrees, type Degree,
} from "@/music/degrees";
import { RouteMap } from "./routemap";

/** Atajos §8: diatónicos 1–7, cromáticos QWERT en ORDEN DE ESCALA (no el canónico). */
const DEGREE_KEYS: Record<Degree, string> = {
  I: "1", II: "2", III: "3", IV: "4", V: "5", VI: "6", VII: "7",
  IIfr: "Q", IIImen: "W", IVly: "E", VImen: "R", VIIST: "T",
};

export type LeverMark = "correct" | "wrong";

export interface HudState {
  progress: number;
  total: number;
  detours: number[];
  points: number;
  streak: number;
  speedLabel: string;
  whistlesLeft: number;
  whistlesTotal: number;
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
  onWhistle(): void;
  onRepeat(): void;
}

export class Hud {
  private readonly root: HTMLElement;
  private readonly levers = new Map<Degree, HTMLButtonElement>();
  private readonly routeMap: RouteMap;
  private degrees: Degree[] = [];
  private mounted = false;

  private leverRow!: HTMLElement;
  private windowFill!: HTMLElement;
  private windowBar!: HTMLElement;
  private telegram!: HTMLElement;
  private pointsEl!: HTMLElement;
  private streakEl!: HTMLElement;
  private speedEl!: HTMLElement;
  private whistleRow!: HTMLElement;
  private whistleBtn!: HTMLButtonElement;
  private repeatBtn!: HTMLButtonElement;
  private mapCanvas!: HTMLCanvasElement;

  constructor(root: HTMLElement, private readonly callbacks: HudCallbacks) {
    this.root = root;
    this.build();
    this.routeMap = new RouteMap(this.mapCanvas);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("resize", this.onResize);
  }

  // -------------------------------------------------------------------------
  // Construcción del DOM (una vez)
  // -------------------------------------------------------------------------
  private build(): void {
    this.root.innerHTML = "";
    this.root.classList.add("hud-layer");

    // Viñeta cálida: vende la cabina gratis y no intercepta el drag de la mirada.
    const vignette = document.createElement("div");
    vignette.className = "cab-vignette";
    this.root.appendChild(vignette);

    const console_ = document.createElement("div");
    console_.className = "console";

    // --- Fila superior: telegrama + ventana de respuesta ---
    this.telegram = document.createElement("p");
    this.telegram.className = "telegram";
    console_.appendChild(this.telegram);

    this.windowBar = document.createElement("div");
    this.windowBar.className = "answer-window";
    this.windowFill = document.createElement("div");
    this.windowFill.className = "answer-window-fill";
    this.windowBar.appendChild(this.windowFill);
    console_.appendChild(this.windowBar);

    // --- Fila principal: marcadores | palancas | tira de ruta y silbatos ---
    const row = document.createElement("div");
    row.className = "console-row";

    row.appendChild(this.buildScoreboard());

    this.leverRow = document.createElement("div");
    this.leverRow.className = "lever-row";
    row.appendChild(this.leverRow);

    row.appendChild(this.buildRightPanel());
    console_.appendChild(row);
    this.root.appendChild(console_);
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
    this.mapCanvas.className = "route-map";
    panel.appendChild(this.mapCanvas);

    const tools = document.createElement("div");
    tools.className = "console-tools";

    this.whistleRow = document.createElement("div");
    this.whistleRow.className = "whistle-icons";
    tools.appendChild(this.whistleRow);

    this.whistleBtn = document.createElement("button");
    this.whistleBtn.className = "btn tiny brass";
    this.whistleBtn.innerHTML = `𝄞 <span>${t("hud.whistle")}</span> <kbd>B</kbd>`;
    this.whistleBtn.onclick = () => this.callbacks.onWhistle();
    tools.appendChild(this.whistleBtn);

    this.repeatBtn = document.createElement("button");
    this.repeatBtn.className = "btn tiny";
    this.repeatBtn.innerHTML = `🔊 <span>${t("hud.repeat")}</span> <kbd>␣</kbd>`;
    this.repeatBtn.onclick = () => this.callbacks.onRepeat();
    tools.appendChild(this.repeatBtn);

    panel.appendChild(tools);
    return panel;
  }

  // -------------------------------------------------------------------------
  // Palancas: SOLO los grados activos del setup, en orden canónico §3.1
  // -------------------------------------------------------------------------
  setDegrees(degrees: Iterable<Degree>): void {
    this.degrees = sortDegrees(degrees);
    this.leverRow.innerHTML = "";
    this.levers.clear();

    for (const degree of this.degrees) {
      const lever = document.createElement("button");
      lever.className = "lever";
      lever.title = DEGREE_GLOSSARY[degree][lang];

      const roman = document.createElement("span");
      roman.className = "lever-roman";
      roman.textContent = romanOf(degree);

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

      lever.append(roman, key);
      lever.onclick = () => this.press(degree);
      this.leverRow.appendChild(lever);
      this.levers.set(degree, lever);
    }
    this.routeMap.resize();
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
    this.streakEl.textContent = `×${state.streak}`;
    this.speedEl.textContent = state.speedLabel;
    this.telegram.textContent = state.message;

    // Ventana de respuesta: se vacía de derecha a izquierda.
    const hasWindow = state.answerWindow !== null;
    this.windowBar.classList.toggle("idle", !hasWindow);
    this.windowBar.classList.toggle("urgent", hasWindow && state.urgentWindow);
    this.windowFill.style.width = `${Math.max(0, Math.min(1, state.answerWindow ?? 0)) * 100}%`;

    for (const [degree, lever] of this.levers) {
      const mark = state.marks.get(degree);
      lever.classList.toggle("correct", mark === "correct");
      lever.classList.toggle("wrong", mark === "wrong");
      lever.classList.toggle("locked", state.locked.has(degree));
      lever.disabled = state.locked.has(degree) || !hasWindow;
    }

    this.renderWhistles(state.whistlesLeft, state.whistlesTotal);
    this.whistleBtn.disabled = state.whistlesLeft <= 0;
    this.routeMap.render(state);
  }

  private renderWhistles(left: number, total: number): void {
    if (this.whistleRow.childElementCount !== total) {
      this.whistleRow.innerHTML = "";
      for (let i = 0; i < total; i++) {
        const icon = document.createElement("span");
        icon.className = "whistle-icon";
        icon.textContent = "𝄞";
        this.whistleRow.appendChild(icon);
      }
    }
    const icons = this.whistleRow.children;
    for (let i = 0; i < icons.length; i++) {
      icons[i].classList.toggle("spent", i >= left);
    }
  }

  show(): void {
    this.mounted = true;
    this.root.classList.remove("hidden");
    this.root.classList.add("active");
    this.routeMap.resize();
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
  // Teclado (PLAN §8). Los atajos cromáticos solo responden si el grado está activo.
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
      if (!this.whistleBtn.disabled) this.callbacks.onWhistle();
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
    if (this.mounted) this.routeMap.resize();
  };
}

/** "IVly" → "IV", "VIIST" → "VII": la palanca muestra el romano, el sufijo va aparte. */
function romanOf(degree: Degree): string {
  const match = /^[IVX]+/.exec(degree);
  return match ? match[0] : degree;
}
