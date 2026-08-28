// routemap.ts — La tira de ruta (PLAN §6): 20 nudos hacia la silueta de la Terminal.
// Es "el altímetro de este juego": el progreso se VE, no solo se cuenta.
//
// Nudos completados en dorado, pendientes en hierro, el tren como punto que avanza, y
// los desvíos como lacitos grises añadidos EN EL NUDO donde ocurrieron — la cicatriz se
// queda a la vista todo el viaje.

const BRASS = "#c9a227";
const BRASS_BRIGHT = "#e8c65a";
const IRON = "#4a4a52";
const CREAM = "#f3ead7";
const DETOUR = "#8a8a92";

export interface RouteMapState {
  /** Decisiones correctas netas (posición del tren en la tira). */
  progress: number;
  /** Total de nudos hasta la Terminal. */
  total: number;
  /** Índice de nudo donde ocurrió cada desvío (puede repetirse). */
  detours: number[];
}

export class RouteMap {
  private readonly ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("RouteMap: sin contexto 2D");
    this.ctx = ctx;
    this.resize();
  }

  /** El canvas se dibuja a DPR real para que los nudos no salgan borrosos. */
  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(120, Math.round(rect.width));
    this.height = Math.max(28, Math.round(rect.height));
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  render(state: RouteMapState): void {
    const { ctx } = this;
    const w = this.width, h = this.height;
    ctx.clearRect(0, 0, w, h);

    const padLeft = 10;
    const padRight = 30; // sitio para la silueta de la Terminal
    const baseline = h * 0.62;
    const span = w - padLeft - padRight;
    const step = span / Math.max(1, state.total);
    const knotAt = (i: number): number => padLeft + i * step;

    // Vía: tramo recorrido en latón, tramo pendiente en hierro.
    const trainX = knotAt(Math.min(state.progress, state.total));
    ctx.lineWidth = 2;
    ctx.strokeStyle = IRON;
    ctx.beginPath();
    ctx.moveTo(padLeft, baseline);
    ctx.lineTo(padLeft + span, baseline);
    ctx.stroke();
    ctx.strokeStyle = BRASS;
    ctx.beginPath();
    ctx.moveTo(padLeft, baseline);
    ctx.lineTo(trainX, baseline);
    ctx.stroke();

    // Lacitos de desvío: un bucle gris por encima del nudo donde se falló. Si se falla
    // dos veces en el mismo nudo los lazos se apilan — si no, se taparían entre sí y la
    // cicatriz mentiría sobre cuántas veces te desviaste ahí.
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = DETOUR;
    const seen = new Map<number, number>();
    for (const index of state.detours) {
      const knot = Math.min(Math.max(index, 0), state.total);
      const stack = seen.get(knot) ?? 0;
      seen.set(knot, stack + 1);
      ctx.beginPath();
      ctx.ellipse(knotAt(knot), baseline - 7 - stack * 4.5, step * 0.36 + 2.5, 5.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Nudos.
    for (let i = 0; i <= state.total; i++) {
      const x = knotAt(i);
      const done = i <= state.progress;
      ctx.beginPath();
      ctx.arc(x, baseline, done ? 3 : 2.2, 0, Math.PI * 2);
      ctx.fillStyle = done ? BRASS_BRIGHT : IRON;
      ctx.fill();
    }

    // El tren: punto crema con halo, el único elemento que se mueve.
    ctx.beginPath();
    ctx.arc(trainX, baseline, 6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(243,234,215,.20)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(trainX, baseline, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = CREAM;
    ctx.fill();

    // Silueta de la Terminal al final (F8 la construye en 3D; aquí es el destino).
    const tx = padLeft + span + 8;
    ctx.fillStyle = state.progress >= state.total ? BRASS_BRIGHT : IRON;
    ctx.fillRect(tx, baseline - 12, 14, 12);
    ctx.beginPath();
    ctx.moveTo(tx - 2, baseline - 12);
    ctx.lineTo(tx + 7, baseline - 19);
    ctx.lineTo(tx + 16, baseline - 12);
    ctx.closePath();
    ctx.fill();
  }
}
