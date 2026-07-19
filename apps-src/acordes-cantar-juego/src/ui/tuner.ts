// El afinador de la consola (PLAN §12) — canvas 2D redibujado cada frame con
// getCurrentState(). Es el instrumento central del juego.

import type { PitchState } from "@/audio/mic";
import { TUNER_GREEN_ZONE_CENTS, TUNER_NEEDLE_LERP, PALETTE } from "@/config";
import { midiToNote, midiToFrequency } from "@/music/theory";
import { t } from "../i18n";

export interface TunerRenderInput {
  state: PitchState;
  listening: boolean; // false → reposo (sin target)
  familyColor: string; // tinte cuando isOnPitch
  showNames: boolean; // OFF: no revelar nota/Hz (decisión §2.12 / §12)
  targetMidi: number; // para nombrar la nota detectada más cercana al target
}

const SCALE_CENTS = 50; // escala visible −50…+50

export class TunerView {
  private readonly ctx: CanvasRenderingContext2D;
  private needleCents = 0; // aguja suavizada (lerp exponencial)
  private readonly cssWidth: number;
  private readonly cssHeight: number;

  constructor(canvas: HTMLCanvasElement) {
    const dpr = window.devicePixelRatio || 1;
    this.cssWidth = canvas.width;
    this.cssHeight = canvas.height;
    canvas.style.width = `${this.cssWidth}px`;
    canvas.style.height = `${this.cssHeight}px`;
    canvas.width = Math.round(this.cssWidth * dpr);
    canvas.height = Math.round(this.cssHeight * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D no disponible");
    ctx.scale(dpr, dpr);
    this.ctx = ctx;
  }

  render(input: TunerRenderInput): void {
    const { state, listening, familyColor, showNames, targetMidi } = input;
    const ctx = this.ctx;
    const w = this.cssWidth;
    const h = this.cssHeight;
    const voiced = listening && state.frequency > 0;

    // Aguja: sin voz cae al centro atenuada (§12).
    const targetNeedle = voiced ? Math.max(-SCALE_CENTS, Math.min(SCALE_CENTS, state.centsOff)) : 0;
    this.needleCents += (targetNeedle - this.needleCents) * TUNER_NEEDLE_LERP;

    ctx.clearRect(0, 0, w, h);

    // Fondo del instrumento: placa de latón oscuro.
    ctx.fillStyle = "rgba(36, 24, 17, 0.92)";
    roundRect(ctx, 1.5, 1.5, w - 3, h - 3, 10);
    ctx.fill();

    const scaleY = h * 0.42;
    const margin = 22;
    const scaleW = w - margin * 2;
    const centsToX = (c: number) => margin + ((c + SCALE_CENTS) / (2 * SCALE_CENTS)) * scaleW;

    // Zona verde central ±TUNER_GREEN_ZONE_CENTS [tunable solo visual].
    ctx.fillStyle = "rgba(143, 214, 148, 0.18)";
    ctx.fillRect(
      centsToX(-TUNER_GREEN_ZONE_CENTS),
      scaleY - 14,
      centsToX(TUNER_GREEN_ZONE_CENTS) - centsToX(-TUNER_GREEN_ZONE_CENTS),
      28,
    );

    // Escala: línea + marcas cada 10 cents.
    ctx.strokeStyle = "rgba(201, 162, 39, 0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, scaleY);
    ctx.lineTo(w - margin, scaleY);
    ctx.stroke();
    ctx.font = "600 9px Rajdhani, sans-serif";
    ctx.textAlign = "center";
    for (let c = -SCALE_CENTS; c <= SCALE_CENTS; c += 10) {
      const x = centsToX(c);
      const major = c === 0;
      ctx.strokeStyle = major ? PALETTE.brass : "rgba(201, 162, 39, 0.45)";
      ctx.lineWidth = major ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, scaleY - (major ? 12 : 7));
      ctx.lineTo(x, scaleY + (major ? 12 : 7));
      ctx.stroke();
      if (c % 25 === 0 && !major) {
        ctx.fillStyle = "rgba(243, 234, 215, 0.55)";
        ctx.fillText(`${c > 0 ? "+" : ""}${c}`, x, scaleY + 22);
      }
    }

    // Fuera de rango grueso (> 200 cents): flecha de dirección (§12).
    if (voiced && Math.abs(state.centsOff) > 200) {
      ctx.fillStyle = PALETTE.brass;
      ctx.font = "700 16px Rajdhani, sans-serif";
      ctx.fillText(state.centsOff < 0 ? "▲" : "▼", w / 2, scaleY - 18);
      ctx.font = "600 9px Rajdhani, sans-serif";
    }

    // Aguja.
    const needleX = centsToX(this.needleCents);
    const needleColor = !voiced
      ? "rgba(243, 234, 215, 0.35)"
      : state.isOnPitch
        ? familyColor
        : PALETTE.cream;
    ctx.strokeStyle = needleColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(needleX, scaleY - 16);
    ctx.lineTo(needleX, scaleY + 16);
    ctx.stroke();
    if (voiced && state.isOnPitch) {
      ctx.shadowColor = familyColor;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Anillo de hold: el borde del instrumento se llena con holdProgress (§12).
    const perimeterPath = new Path2D();
    addRoundRect(perimeterPath, 1.5, 1.5, w - 3, h - 3, 10);
    if (listening && state.holdProgress > 0) {
      const perimeter = 2 * (w - 3) + 2 * (h - 3);
      ctx.strokeStyle = state.isOnPitch ? familyColor : "rgba(201, 162, 39, 0.8)";
      ctx.lineWidth = 3;
      ctx.setLineDash([perimeter * state.holdProgress, perimeter]);
      ctx.stroke(perimeterPath);
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = "rgba(201, 162, 39, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke(perimeterPath);
    }

    // Lectura inferior: nombre+Hz SOLO con "Mostrar nombres" ON; si está OFF,
    // únicamente la desviación (el jugador no debe leer la respuesta aquí).
    ctx.textAlign = "center";
    ctx.font = "600 12px Rajdhani, sans-serif";
    const readoutY = h - 10;
    if (!voiced) {
      ctx.fillStyle = "rgba(243, 234, 215, 0.5)";
      ctx.fillText(listening ? t("tuner.listening") : "—", w / 2, readoutY);
    } else if (showNames) {
      const detectedMidi = targetMidi + Math.round(state.centsOff / 100);
      ctx.fillStyle = PALETTE.cream;
      ctx.fillText(
        `${midiToNote(detectedMidi)} · ${state.frequency.toFixed(1)} Hz`,
        w / 2,
        readoutY,
      );
    } else {
      ctx.fillStyle = PALETTE.cream;
      const c = Math.round(state.centsOff);
      ctx.fillText(`${c > 0 ? "+" : ""}${c} ¢`, w / 2, readoutY);
    }
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  traceRoundRect(ctx, x, y, w, h, r);
}

function addRoundRect(path: Path2D, x: number, y: number, w: number, h: number, r: number): void {
  traceRoundRect(path, x, y, w, h, r);
}

// Trazo de rectángulo redondeado empezando en el centro-arriba (así el anillo de
// hold se llena desde las 12 en punto). CanvasPath cubre ctx y Path2D.
function traceRoundRect(p: CanvasPath, x: number, y: number, w: number, h: number, r: number): void {
  p.moveTo(x + w / 2, y);
  p.arcTo(x + w, y, x + w, y + h, r);
  p.arcTo(x + w, y + h, x, y + h, r);
  p.arcTo(x, y + h, x, y, r);
  p.arcTo(x, y, x + w, y, r);
  p.closePath();
}

export function targetFrequencyForMidi(midi: number): number {
  return midiToFrequency(midi);
}
