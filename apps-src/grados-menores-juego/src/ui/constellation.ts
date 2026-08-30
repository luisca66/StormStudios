// constellation.ts — El mapa de progreso del HUD (PLAN §5.8, §6).
//
// Es el análogo de la tira de ruta del Expreso, pero aquí el progreso DIBUJA una figura:
// las 20 estrellas de la constelación de la tonalidad se encienden una por decisión
// acertada. Llegar al Perihelio es completar la figura.
//
// Las derivas no borran estrellas —el progreso baja, pero lo aprendido no se desaprende—:
// dejan una marca gris fuera de la figura, como una cicatriz del viaje.

import { CONSTELLATIONS, constellationStars, type ConstellationId } from "@/config";
import { lang } from "@/i18n";

const BRASS = "#c9a227";
const BRASS_BRIGHT = "#f0d98a";
const ICE = "#9fd8e8";
const DIM = "rgba(159,216,232,0.20)";
const SCAR = "rgba(224,69,69,0.55)";

export interface ConstellationState {
  progress: number;
  total: number;
  /** Cuántas derivas van: cada una deja su cicatriz. */
  drifts: number;
}

export class ConstellationMap {
  private id: ConstellationId = "LYRA";
  private stars: Array<[number, number]> = [];
  private width = 200;
  private height = 160;

  constructor(private readonly canvas: HTMLCanvasElement) {}

  setConstellation(id: ConstellationId, total: number): void {
    this.id = id;
    this.stars = constellationStars(id, total);
    this.render({ progress: 0, total, drifts: 0 });
  }

  /** El canvas se dibuja a la resolución real del dispositivo, o se ve borroso. */
  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(120, rect.width || 200);
    this.height = Math.max(100, rect.height || 160);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    const ctx = this.canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  render(state: ConstellationState): void {
    const ctx = this.canvas.getContext("2d");
    if (!ctx || !this.stars.length) return;
    const W = this.width, H = this.height;
    ctx.clearRect(0, 0, W, H);

    // Margen para que la figura no toque los bordes ni el rótulo de abajo.
    const padX = 16, padTop = 10, padBottom = 24;
    const toPx = (p: readonly [number, number]): [number, number] => [
      padX + p[0] * (W - padX * 2),
      padTop + p[1] * (H - padTop - padBottom),
    ];

    // Las líneas de la figura, tenues: la constelación EXISTE antes de recorrerla.
    ctx.strokeStyle = DIM;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const anchors = CONSTELLATIONS[this.id].anchors;
    for (let i = 0; i < anchors.length; i++) {
      const [x, y] = toPx(anchors[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Las estrellas: encendidas las conseguidas, apagadas las que faltan.
    for (let i = 0; i < this.stars.length; i++) {
      const [x, y] = toPx(this.stars[i]);
      const lit = i < state.progress;
      const isNext = i === state.progress;
      if (lit) {
        // Halo primero, para que el punto quede encima y se vea nítido.
        ctx.beginPath();
        ctx.arc(x, y, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(240,217,138,0.14)";
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(x, y, lit ? 2.6 : 1.6, 0, Math.PI * 2);
      ctx.fillStyle = lit ? BRASS_BRIGHT : DIM;
      ctx.fill();
      if (isNext) {
        // La siguiente se señala: dice dónde vas sin escribir un número.
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.strokeStyle = ICE;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Cicatrices de las derivas: fuera de la figura, abajo a la izquierda.
    for (let i = 0; i < state.drifts && i < 12; i++) {
      ctx.beginPath();
      ctx.arc(10 + i * 7, H - 12, 2, 0, Math.PI * 2);
      ctx.fillStyle = SCAR;
      ctx.fill();
    }

    // Rótulo: el nombre de la constelación y cuánto llevas.
    ctx.fillStyle = BRASS;
    ctx.font = "600 11px Rajdhani, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(
      CONSTELLATIONS[this.id][lang] + "  " + state.progress + "/" + state.total,
      W - 8, H - 8,
    );
  }
}
