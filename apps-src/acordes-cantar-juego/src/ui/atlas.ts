// Atlas del Aeronauta (PLAN §7.6): 33 constelaciones de linternas agrupadas
// por capa. Estados: No avistada (silueta) / Intentada (tenue) / Completada
// (constelación con intervalos reales + datos + medalla).

import { CHORD_TYPES, FAMILY_NAMES, chordName, type ChordType } from "@/music/chords";
import { FAMILY_GLOW, LAYER_FAMILIES, LAYERS, MEDAL_THRESHOLDS, medalFor } from "@/config";
import { loadAtlas, type AtlasEntry } from "@/game/persistence";
import { t, getLang } from "../i18n";

const MEDAL_EMOJI = { gold: "🥇", silver: "🥈", bronze: "🥉" } as const;

export function renderAtlas(grid: HTMLElement, counter: HTMLElement): void {
  const atlas = loadAtlas();
  const lang = getLang();
  grid.innerHTML = "";

  let catalogued = 0;
  for (const layer of LAYERS) {
    const fams = LAYER_FAMILIES[layer.num] ?? [];
    const header = document.createElement("h3");
    header.className = "atlas-layer";
    header.textContent = `${layer.num} · ${t(layer.i18nKey)}`;
    grid.appendChild(header);

    const row = document.createElement("div");
    row.className = "atlas-row";
    for (const type of CHORD_TYPES.filter((c) => fams.includes(c.family))) {
      const entry = atlas[type.id];
      if (entry && entry.completed > 0) catalogued++;
      row.appendChild(buildCard(type, entry, lang));
    }
    grid.appendChild(row);
  }
  counter.textContent = `${catalogued}/${CHORD_TYPES.length}`;
}

function buildCard(type: ChordType, entry: AtlasEntry | undefined, lang: "es" | "en"): HTMLElement {
  const status: "unseen" | "tried" | "done" =
    !entry || entry.attempts === 0 ? "unseen" : entry.completed > 0 ? "done" : "tried";
  const card = document.createElement("div");
  card.className = `atlas-card ${status}`;

  card.appendChild(constellation(type, status));

  const info = document.createElement("div");
  info.className = "atlas-info";
  const name = document.createElement("div");
  name.className = "atlas-name";
  name.textContent = status === "unseen" ? "???" : chordName(type, lang);
  info.appendChild(name);

  const fam = document.createElement("div");
  fam.className = "atlas-fam";
  fam.textContent = FAMILY_NAMES[type.family][lang];
  info.appendChild(fam);

  if (entry && status !== "unseen") {
    const stats = document.createElement("div");
    stats.className = "atlas-stats";
    const lines = [
      `${t("atlas.attempts")}: ${entry.attempts}`,
      `${t("atlas.completed")}: ${entry.completed}`,
    ];
    if (entry.bestStreak > 0) lines.push(`${t("atlas.bestStreak")}: ×${entry.bestStreak}`);
    if (entry.bestAvgCents !== null) {
      const medal = MEDAL_EMOJI[medalFor(entry.bestAvgCents)];
      lines.push(`${medal} ${entry.bestAvgCents.toFixed(1)} ¢`);
    }
    if (entry.firstCompletedISO) {
      lines.push(new Date(entry.firstCompletedISO).toLocaleDateString(lang === "es" ? "es-MX" : "en-US"));
    }
    stats.innerHTML = lines.map((l) => `<span>${l}</span>`).join("");
    info.appendChild(stats);
  }
  card.appendChild(info);
  return card;
}

// Mini-canvas: linternas apiladas en sus intervalos REALES (§7.6).
function constellation(type: ChordType, status: "unseen" | "tried" | "done"): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const w = 34;
  const h = 84;
  canvas.width = w * 2;
  canvas.height = h * 2;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);
  const maxInterval = 21; // escala común: todas las cartas comparables
  const color =
    status === "done" ? FAMILY_GLOW[type.family] : status === "tried" ? "#7c96b5" : "#4a4038";
  for (const interval of type.intervals) {
    const y = h - 8 - (interval / maxInterval) * (h - 16);
    ctx.beginPath();
    ctx.arc(w / 2, y, status === "done" ? 3.4 : 2.6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = status === "done" ? 1 : status === "tried" ? 0.55 : 0.4;
    ctx.fill();
    if (status === "done") {
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(w / 2, y, 6.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Cuerda vertical tenue
  ctx.globalAlpha = status === "unseen" ? 0.15 : 0.3;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2, 6);
  ctx.lineTo(w / 2, h - 6);
  ctx.stroke();
  ctx.globalAlpha = 1;
  return canvas;
}

export { MEDAL_THRESHOLDS };
