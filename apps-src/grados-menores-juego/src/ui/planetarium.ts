// planetarium.ts — La cúpula del observatorio por dentro (PLAN §7.6).
//
// Es la colección del juego: 15 placas, una por constelación. La figura se dibuja SIEMPRE
// —la constelación existe aunque no la hayas viajado— pero solo se enciende con sus
// estrellas si llegaste al Perihelio, y en dorado pleno si fue de gala.
//
// Debajo, la precisión por grado en el orden canónico de los 11, con los pares mutables
// hermanados: es donde el alumno ve, de un vistazo, si confunde el ♭7 con el #7.

import { CONSTELLATIONS, ROUTES, constellationStars, DECISIONS_TO_ARRIVE } from "@/config";
import { t, lang } from "@/i18n";
import { ALL_DEGREES_OPTIONS, DEGREE_GLOSSARY, DEGREE_SHORT_SUFFIX, mutablePartner, type Degree } from "@/music/degrees";
import { loadDegreeStats, loadRoutes, clearAll, type RouteRecord } from "@/game/persistence";

const MEDAL_ICON: Record<string, string> = { gold: "🥇", silver: "🥈", bronze: "🥉" };

export class Planetarium {
  private wipeArmed = false;

  constructor(
    private readonly board: HTMLElement,
    private readonly degreesBox: HTMLElement,
  ) {}

  render(): void {
    this.wipeArmed = false;
    this.renderBoard();
    this.renderDegrees();
  }

  // -------------------------------------------------------------------------
  // Las 15 placas
  // -------------------------------------------------------------------------
  private renderBoard(): void {
    const routes = loadRoutes();
    this.board.replaceChildren();

    for (const route of ROUTES) {
      const record = routes[route.scale];
      const plate = document.createElement("div");
      plate.className = "plate";
      if (record?.gala) plate.classList.add("gala");
      else if (record) plate.classList.add("arrived");

      plate.appendChild(this.figure(route.constellation, record));

      const name = document.createElement("div");
      name.className = "plate-name";
      name.textContent = route.scale;
      plate.appendChild(name);

      const constellation = document.createElement("div");
      constellation.className = "plate-constellation";
      constellation.textContent = CONSTELLATIONS[route.constellation][lang];
      plate.appendChild(constellation);

      const state = document.createElement("div");
      state.className = "plate-state";
      state.textContent = record
        ? (record.gala ? t("planetarium.gala") : t("planetarium.arrived"))
        : "—";
      plate.appendChild(state);

      if (record) plate.appendChild(this.records(record));
      else plate.title = CONSTELLATIONS[route.constellation][lang];
      this.board.appendChild(plate);
    }
  }

  /** La figura de la constelación, dibujada en un canvas pequeño. */
  private figure(id: keyof typeof CONSTELLATIONS, record: RouteRecord | undefined): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.className = "plate-figure";
    const W = 132, H = 92;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = 10;
    const toPx = (p: readonly [number, number]): [number, number] =>
      [pad + p[0] * (W - pad * 2), pad + p[1] * (H - pad * 2)];

    // Las líneas SIEMPRE: la constelación existe aunque no la hayas viajado.
    ctx.strokeStyle = record ? "rgba(201,162,39,0.45)" : "rgba(159,216,232,0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const anchors = CONSTELLATIONS[id].anchors;
    for (let i = 0; i < anchors.length; i++) {
      const [x, y] = toPx(anchors[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Las estrellas solo se encienden si llegaste; doradas plenas si fue de gala.
    const stars = constellationStars(id, DECISIONS_TO_ARRIVE);
    for (const star of stars) {
      const [x, y] = toPx(star);
      ctx.beginPath();
      ctx.arc(x, y, record ? 2 : 1.2, 0, Math.PI * 2);
      ctx.fillStyle = record
        ? (record.gala ? "#ffe9a8" : "#c9a227")
        : "rgba(159,216,232,0.22)";
      ctx.fill();
    }
    return canvas;
  }

  /** Los récords de una ruta conquistada. */
  private records(record: RouteRecord): HTMLElement {
    const box = document.createElement("div");
    box.className = "plate-records";
    const line = (label: string, value: string) => {
      const row = document.createElement("div");
      const name = document.createElement("span");
      name.textContent = label;
      const strong = document.createElement("strong");
      strong.textContent = value;
      row.append(name, strong);
      box.appendChild(row);
    };
    line(t("planetarium.best"), `${MEDAL_ICON[record.mejorMedalla] ?? ""} ${record.mejorScore}`);
    line(t("planetarium.streak"), `×${record.mejorRacha}`);
    line(t("planetarium.speed"), record.velocidadRecord);
    line(t("planetarium.since"), formatDate(record.primeraLlegadaISO));
    return box;
  }

  // -------------------------------------------------------------------------
  // Precisión por grado
  // -------------------------------------------------------------------------
  private renderDegrees(): void {
    const stats = loadDegreeStats();
    this.degreesBox.replaceChildren();

    const title = document.createElement("h3");
    title.textContent = t("planetarium.degreeStats");
    this.degreesBox.appendChild(title);

    const total = Object.values(stats).reduce((a, s) => a + s.total, 0);
    if (total === 0) {
      const empty = document.createElement("p");
      empty.className = "option-desc";
      empty.textContent = t("planetarium.empty");
      this.degreesBox.appendChild(empty);
    } else {
      const list = document.createElement("div");
      list.className = "degree-stats";
      // Orden canónico de los 11, con los pares mutables hermanados: es donde se ve si
      // el alumno confunde el ♭7 con el #7 (§5.7).
      const emitted = new Set<Degree>();
      for (const degree of ALL_DEGREES_OPTIONS) {
        if (emitted.has(degree)) continue;
        const partner = mutablePartner(degree);
        if (partner) {
          const pair = document.createElement("div");
          pair.className = "stat-pair";
          pair.append(this.degreeRow(degree, stats), this.degreeRow(partner, stats));
          list.appendChild(pair);
          emitted.add(degree);
          emitted.add(partner);
        } else {
          list.appendChild(this.degreeRow(degree, stats));
          emitted.add(degree);
        }
      }
      this.degreesBox.appendChild(list);
    }

    // Borrado con confirmación: el primer clic arma, el segundo borra (§7.6).
    const wipe = document.createElement("button");
    wipe.className = "btn tiny wipe";
    wipe.textContent = t("planetarium.wipe");
    wipe.onclick = () => {
      if (!this.wipeArmed) {
        this.wipeArmed = true;
        wipe.textContent = t("planetarium.wipeConfirm");
        wipe.classList.add("armed");
        return;
      }
      clearAll();
      this.render();
    };
    this.degreesBox.appendChild(wipe);
  }

  private degreeRow(degree: Degree, stats: Record<string, { correct: number; total: number }>): HTMLElement {
    const stat = stats[degree];
    const pct = stat && stat.total ? stat.correct / stat.total : null;
    const row = document.createElement("div");
    row.className = "stat-row";
    if (pct === null) row.classList.add("untouched");

    const name = document.createElement("span");
    name.className = "stat-name";
    name.textContent = degree + (DEGREE_SHORT_SUFFIX[degree] ? ` ${DEGREE_SHORT_SUFFIX[degree]}` : "");
    name.title = DEGREE_GLOSSARY[degree][lang];

    const bar = document.createElement("div");
    bar.className = "stat-bar";
    const fill = document.createElement("div");
    fill.className = "stat-fill";
    fill.style.width = `${(pct ?? 0) * 100}%`;
    bar.appendChild(fill);

    const value = document.createElement("span");
    value.className = "stat-value";
    value.textContent = pct === null ? "—" : `${Math.round(pct * 100)}% (${stat.correct}/${stat.total})`;

    row.append(name, bar, value);
    return row;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(lang === "en" ? "en-US" : "es-MX", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return "—";
  }
}
