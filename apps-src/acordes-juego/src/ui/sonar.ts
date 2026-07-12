// Sonar circular de la consola (PLAN §8): blips relativos al rumbo de la cámara.
// Canvas 2D autónomo; recibe datos por frame desde hud.tick().

export interface SonarBlip {
  /** Rumbo relativo a la mirada: 0 = al frente, + = a la derecha (radianes). */
  bearing: number;
  /** Distancia en unidades de mundo. */
  distance: number;
  /** Resalta el blip (criatura en escucha). */
  active?: boolean;
  /** H4c: blip grande (bramido del Leviatán al aparecer). */
  strong?: boolean;
}

const RANGE = 70; // distancia máx representada (== spawnRadiusMax)

export class Sonar {
  private ctx: CanvasRenderingContext2D;
  private sweep = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Sonar: canvas 2D no disponible");
    this.ctx = ctx;
  }

  update(dt: number, blips: SonarBlip[]): void {
    this.sweep = (this.sweep + dt * 1.6) % (Math.PI * 2);

    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy) - 3;

    ctx.clearRect(0, 0, w, h);

    // Fondo y anillos.
    ctx.fillStyle = "rgba(3, 12, 20, 0.85)";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
    ctx.lineWidth = 1;
    for (const f of [1, 0.66, 0.33]) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius * f, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Marca de rumbo (arriba = hacia donde miras).
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy - radius + 6);
    ctx.stroke();

    // Barrido.
    const grad = ctx.createConicGradient(this.sweep, cx, cy);
    grad.addColorStop(0, "rgba(56, 189, 248, 0.30)");
    grad.addColorStop(0.12, "rgba(56, 189, 248, 0)");
    grad.addColorStop(1, "rgba(56, 189, 248, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Blips: "arriba" es el frente de la cámara.
    for (const blip of blips) {
      const d = Math.min(1, blip.distance / RANGE) * radius * 0.92;
      const x = cx + Math.sin(blip.bearing) * d;
      const y = cy - Math.cos(blip.bearing) * d;
      ctx.fillStyle = blip.strong
        ? "rgba(255, 160, 90, 0.95)"
        : blip.active
          ? "rgba(255, 210, 127, 0.95)"
          : "rgba(125, 211, 252, 0.9)";
      ctx.beginPath();
      ctx.arc(x, y, blip.strong ? 6 : blip.active ? 3.4 : 2.4, 0, Math.PI * 2);
      ctx.fill();
      if (blip.strong) {
        // Anillo de eco alrededor del bramido.
        ctx.strokeStyle = "rgba(255, 160, 90, 0.5)";
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
}
