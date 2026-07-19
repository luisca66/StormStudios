// Catalejo de viento (PLAN §6): franja de brújula con blips = cuerdas activas
// según el yaw de la cámara. Es el "sonar" de Aerostato.

import { PALETTE } from "@/config";

export interface CompassBlip {
  azimuth: number; // rad, ángulo mundo hacia el objetivo
  color: string;
  active?: boolean; // cuerda amarrada: blip destacado
}

const FOV = Math.PI * 0.9; // apertura visible de la franja

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

  /** yaw = rotación Y del jugador (three: 0 mira a −z; crece a la izquierda). */
  render(yaw: number, blips: CompassBlip[], elapsed: number): void {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(36,24,17,0.92)";
    ctx.strokeStyle = "rgba(201,162,39,0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(0.5, 0.5, w - 1, h - 1, 8);
    ctx.fill();
    ctx.stroke();

    // Rumbo de cámara en convención brújula: heading = −yaw (0 = norte = −z).
    const heading = -yaw;
    const toX = (azWorld: number) => {
      // Delta angular normalizado a [−π, π] respecto al rumbo.
      let d = azWorld - heading;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return w / 2 + (d / (FOV / 2)) * (w / 2 - 8);
    };

    // Marcas cada 15° + cardinales.
    ctx.textAlign = "center";
    ctx.font = "600 9px Rajdhani, sans-serif";
    const midY = h * 0.52;
    for (let deg = 0; deg < 360; deg += 15) {
      const az = (deg * Math.PI) / 180;
      const x = toX(az);
      if (x < 6 || x > w - 6) continue;
      const cardinal = deg % 90 === 0;
      ctx.strokeStyle = cardinal ? PALETTE.brass : "rgba(201,162,39,0.35)";
      ctx.lineWidth = cardinal ? 1.8 : 1;
      ctx.beginPath();
      ctx.moveTo(x, midY - (cardinal ? 8 : 4));
      ctx.lineTo(x, midY + (cardinal ? 8 : 4));
      ctx.stroke();
      if (cardinal) {
        ctx.fillStyle = PALETTE.cream;
        ctx.fillText(["N", "E", "S", "O"][deg / 90], x, midY - 12);
      }
    }

    // Blips de cuerdas: pulso suave; el activo, más grande y lleno.
    for (const b of blips) {
      const x = toX(b.azimuth);
      if (x < 4 || x > w - 4) continue;
      const pulse = 0.75 + Math.sin(elapsed * 3 + b.azimuth * 5) * 0.25;
      ctx.fillStyle = b.color;
      ctx.globalAlpha = b.active ? 1 : 0.65 * pulse;
      ctx.beginPath();
      ctx.arc(x, h * 0.78, b.active ? 4.5 : 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Aguja central (rumbo actual).
    ctx.strokeStyle = PALETTE.cream;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(w / 2, 4);
    ctx.lineTo(w / 2, h - 4);
    ctx.stroke();
  }
}
