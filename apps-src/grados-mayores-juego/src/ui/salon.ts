// salon.ts — El Salón de Rutas (PLAN §7.6): un tablero de salidas de estación de época.
// 15 filas = 15 tonalidades, con su estado, medalla, récords y la fecha de la primera
// llegada. Debajo, la precisión por grado en orden canónico, como el histórico de la
// webapp seria.

import { t, lang } from "@/i18n";
import { BIOME_SWATCH, routeForScale } from "@/config";
import {
  ALL_DEGREES_OPTIONS, DEGREE_GLOSSARY, DEGREE_SHORT_SUFFIX, SCALES,
} from "@/music/degrees";
import {
  clearAll, loadDegreeStats, loadRoutes, type RouteRecords, type DegreeStats,
} from "@/game/persistence";

const MEDAL_ICON = { gold: "🥇", silver: "🥈", bronze: "🥉" } as const;

export class Salon {
  private confirmingDelete = false;

  constructor(
    private readonly board: HTMLElement,
    private readonly degreesBox: HTMLElement,
  ) {}

  render(): void {
    this.confirmingDelete = false;
    this.renderBoard(loadRoutes());
    this.renderDegrees(loadDegreeStats());
  }

  private renderBoard(routes: RouteRecords): void {
    this.board.innerHTML = "";

    const header = document.createElement("div");
    header.className = "board-row board-head";
    for (const key of ["salon.route", "salon.state", "salon.best", "salon.streak", "salon.speed", "salon.since"]) {
      const cell = document.createElement("span");
      cell.textContent = t(key);
      header.appendChild(cell);
    }
    this.board.appendChild(header);

    for (const scale of SCALES) {
      const record = routes[scale];
      const route = routeForScale(scale);
      const row = document.createElement("div");
      row.className = "board-row";
      if (!record) row.classList.add("untravelled");
      if (record?.gala) row.classList.add("gala");

      // Ruta, con el swatch de bioma para reconocerla de un vistazo (igual que el menú).
      const name = document.createElement("span");
      name.className = "board-route";
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.background = BIOME_SWATCH[route.biome];
      name.append(swatch, document.createTextNode(scale));
      name.title = `${t(`biome.${route.biome}`)} · ${t(`time.${route.time}`)}`;

      const state = document.createElement("span");
      state.textContent = !record
        ? "—"
        : record.gala
          ? `${MEDAL_ICON[record.mejorMedalla]} ${t("salon.gala")}`
          : `${MEDAL_ICON[record.mejorMedalla]} ${t("salon.arrived")}`;
      if (record) state.title = `${record.llegadas} × ${t("salon.arrived")}`;

      const best = document.createElement("span");
      best.textContent = record ? String(record.mejorScore) : "—";
      const streak = document.createElement("span");
      streak.textContent = record ? `×${record.mejorRacha}` : "—";
      const speed = document.createElement("span");
      speed.textContent = record ? record.velocidadRecord : "—";
      const since = document.createElement("span");
      since.textContent = record
        ? new Date(record.primeraLlegadaISO).toLocaleDateString(lang === "en" ? "en-GB" : "es-ES")
        : "—";

      row.append(name, state, best, streak, speed, since);
      this.board.appendChild(row);
    }
  }

  private renderDegrees(stats: DegreeStats): void {
    this.degreesBox.innerHTML = "";

    const title = document.createElement("h3");
    title.className = "salon-subtitle";
    title.textContent = t("salon.degreeStats");
    this.degreesBox.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "degree-stats";
    let answered = 0;

    // Orden canónico SIEMPRE (§3.1), respondidos o no: la tabla no cambia de forma.
    for (const degree of ALL_DEGREES_OPTIONS) {
      const stat = stats[degree] ?? { correct: 0, total: 0 };
      answered += stat.total;
      const accuracy = stat.total ? stat.correct / stat.total : 0;

      const row = document.createElement("div");
      row.className = "degree-stat";
      row.title = DEGREE_GLOSSARY[degree][lang];

      const label = document.createElement("span");
      label.className = "degree-name";
      const suffix = DEGREE_SHORT_SUFFIX[degree];
      label.textContent = suffix ? `${degree} (${suffix})` : degree;

      const bar = document.createElement("div");
      bar.className = "degree-bar";
      const fill = document.createElement("div");
      fill.className = "degree-bar-fill";
      fill.style.width = `${Math.round(accuracy * 100)}%`;
      if (!stat.total) fill.classList.add("empty");
      bar.appendChild(fill);

      const value = document.createElement("span");
      value.className = "degree-value";
      value.textContent = stat.total ? `${stat.correct}/${stat.total}` : "—";

      row.append(label, bar, value);
      grid.appendChild(row);
    }
    this.degreesBox.appendChild(grid);

    if (answered === 0) {
      const empty = document.createElement("p");
      empty.className = "option-desc";
      empty.textContent = t("salon.empty");
      this.degreesBox.appendChild(empty);
    }

    // Borrado con confirmación en dos pasos (§13-F9): el primer clic solo avisa.
    const wipe = document.createElement("button");
    wipe.className = "btn tiny danger";
    wipe.textContent = t("salon.wipe");
    wipe.onclick = () => {
      if (!this.confirmingDelete) {
        this.confirmingDelete = true;
        wipe.textContent = t("salon.wipeConfirm");
        wipe.classList.add("confirming");
        return;
      }
      clearAll();
      this.render();
    };
    this.degreesBox.appendChild(wipe);
  }
}
