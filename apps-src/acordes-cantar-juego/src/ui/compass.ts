// Radar circular de la consola (estilo sonar de Batisfera, Luis 2026-07-19):
// blips relativos al RUMBO del globo — arriba = hacia donde apunta la proa.
// Canvas 2D autónomo; recibe datos por frame desde hud.renderCompass().

import { GAMEPLAY, PALETTE } from "@/config";

export interface CompassBlip {
  /** Rumbo relativo a la proa: 0 = al frente, + = a la derecha (radianes). */
  bearing: number;
  /** Distancia horizontal en unidades de mundo. */
  distance: number;
  /** La cuerda ya está a distancia de amarre por proximidad (tecla E). */
  inRange: boolean;
  color: string; // color de familia
  active?: boolean; // cuerda amarrada: blip destacado
}

const RANGE = GAMEPLAY.spawnRadiusMax; // distancia máx representada

export class CompassView {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly w: number;
  private readonly h: number;

  constructor(canvas: HTMLCanvasElement) {
    const dpr = window.devicePixelRatio || 1;
    this.w = canvas.width;
    this.h = canvas.height;
    canvas.style.width = `${this.w}px`;
    canvas.style.height = `${this.h}px`;
    canvas.width = Math.round(this.w * dpr);
    canvas.height = Math.round(this.h * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D no disponible");
    ctx.scale(dpr, dpr);
    this.ctx = ctx;
  }

  render(blips: CompassBlip[], elapsed: number): void {
    const { ctx, w, h } = this;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy) - 3;
    ctx.clearRect(0, 0, w, h);

    // Fondo de madera oscura y anillos de latón.
    ctx.fillStyle = "rgba(36, 24, 17, 0.92)";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(201, 162, 39, 0.4)";
    ctx.lineWidth = 1;
    for (const f of [1, 0.66, 0.33]) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius * f, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Anillo verde punteado: alcance real del amarre (click o E).
    ctx.strokeStyle = "rgba(74, 222, 128, 0.62)";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(cx, cy, radius * (GAMEPLAY.interactMaxDistance / RANGE), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // Marca de proa (arriba = hacia donde apuntas).
    ctx.strokeStyle = PALETTE.cream;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy - radius + 6);
    ctx.stroke();

    // Barrido dorado.
    const grad = ctx.createConicGradient((elapsed * 1.6) % (Math.PI * 2), cx, cy);
    grad.addColorStop(0, "rgba(201, 162, 39, 0.30)");
    grad.addColorStop(0.12, "rgba(201, 162, 39, 0)");
    grad.addColorStop(1, "rgba(201, 162, 39, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Blips de cuerdas: color de familia; halo verde cuando ya puedes amarrar (E).
    for (const b of blips) {
      const d = Math.min(1, b.distance / RANGE) * radius * 0.92;
      const x = cx + Math.sin(b.bearing) * d;
      const y = cy - Math.cos(b.bearing) * d;
      ctx.fillStyle = b.color;
      ctx.globalAlpha = b.active ? 1 : 0.85;
      ctx.beginPath();
      ctx.arc(x, y, b.active ? 4.5 : 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (b.inRange && !b.active) {
        ctx.strokeStyle = "rgba(74, 222, 128, 0.9)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(x, y, 5.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
}
