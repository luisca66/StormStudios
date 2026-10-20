import { ShapeType } from "./game";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export function computeStarPoints(
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  points: number
): Point[] {
  const result: Point[] = [];
  const angleStep = Math.PI / points;
  const startAngle = -Math.PI / 2;

  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = startAngle + i * angleStep;
    result.push({
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
    });
  }
  return result;
}

export function computePolygonPoints(
  centerX: number,
  centerY: number,
  radius: number,
  sides: number
): Point[] {
  const result: Point[] = [];
  const angleStep = (2 * Math.PI) / sides;
  const startAngle = -Math.PI / 2;

  for (let i = 0; i < sides; i++) {
    const angle = startAngle + i * angleStep;
    result.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }
  return result;
}

function pointsToSvgPolygon(points: readonly Point[]): string {
  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

/**
 * Generates a crisp inline SVG string matching ShapeDrawer.kt geometry:
 * - center = (50, 50)
 * - radius = 50 * 0.65 = 32.5
 */
export function renderGameShapeSvg(
  shape: ShapeType,
  color: string,
  rotation = 0
): string {
  const cx = 50;
  const cy = 50;
  const radius = 50 * 0.65; // 32.5

  let innerMarkup = "";
  switch (shape) {
    case "CIRCLE": {
      innerMarkup = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${color}" />`;
      break;
    }
    case "SQUARE": {
      const half = radius * 0.82;
      const x = (cx - half).toFixed(2);
      const y = (cy - half).toFixed(2);
      const size = (half * 2).toFixed(2);
      innerMarkup = `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${color}" />`;
      break;
    }
    case "TRIANGLE": {
      const pts: Point[] = [
        { x: cx, y: cy - radius },
        { x: cx + radius * 0.866, y: cy + radius * 0.5 },
        { x: cx - radius * 0.866, y: cy + radius * 0.5 },
      ];
      innerMarkup = `<polygon points="${pointsToSvgPolygon(pts)}" fill="${color}" />`;
      break;
    }
    case "DIAMOND": {
      const pts: Point[] = [
        { x: cx, y: cy - radius },
        { x: cx + radius * 0.65, y: cy },
        { x: cx, y: cy + radius },
        { x: cx - radius * 0.65, y: cy },
      ];
      innerMarkup = `<polygon points="${pointsToSvgPolygon(pts)}" fill="${color}" />`;
      break;
    }
    case "STAR": {
      const pts = computeStarPoints(cx, cy, radius, radius * 0.4, 5);
      innerMarkup = `<polygon points="${pointsToSvgPolygon(pts)}" fill="${color}" />`;
      break;
    }
    case "HEXAGON": {
      const pts = computePolygonPoints(cx, cy, radius, 6);
      innerMarkup = `<polygon points="${pointsToSvgPolygon(pts)}" fill="${color}" />`;
      break;
    }
  }

  const transformAttr =
    rotation !== 0 ? ` transform="rotate(${rotation} ${cx} ${cy})"` : "";

  return `<svg class="cell-shape-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g${transformAttr}>${innerMarkup}</g></svg>`;
}

/**
 * Draws the HomeScreen AnimatedLogo onto a 2D Canvas, matching HomeScreen.kt AnimatedLogo().
 */
export function drawAnimatedLogoOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rotationDeg: number
): void {
  ctx.clearRect(0, 0, width, height);
  const cx = width / 2;
  const cy = height / 2;
  const radius = (Math.min(width, height) / 2) * 0.8;

  // Outer rotating hexagon: AccentGreen (#00E676) with alpha 0.3
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = ((rotationDeg + i * 60) * Math.PI) / 180;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = "rgba(0, 230, 118, 0.3)";
  ctx.fill();
  ctx.restore();

  // Inner counter-rotating 5-pointed star: AccentYellow (#FFEA00) with alpha 0.6
  const innerRadius = radius * 0.5;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? innerRadius : innerRadius * 0.4;
    const angle = ((-rotationDeg * 1.5 + i * 36) * Math.PI) / 180;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = "rgba(255, 234, 0, 0.6)";
  ctx.fill();
  ctx.restore();
}
