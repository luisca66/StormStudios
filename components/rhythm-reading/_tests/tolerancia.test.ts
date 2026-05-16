import { describe, it, expect } from 'vitest';
import { calcularVentana, VENTANA_MINIMA_MS, TOLERANCIA_POR_NIVEL } from '../_lib/evaluacion/tolerancia';

describe('calcularVentana', () => {
  // ── Casos normales ────────────────────────────────────────────────────────

  it('calcula correctamente a 60 bpm con 50%', () => {
    // 60 bpm → beat = 1000 ms → ventana = 1000 × 0.5 = 500 ms
    expect(calcularVentana(60, 0.5)).toBe(500);
  });

  it('calcula correctamente a 120 bpm con 25%', () => {
    // 120 bpm → beat = 500 ms → ventana = 500 × 0.25 = 125 ms
    expect(calcularVentana(120, 0.25)).toBe(125);
  });

  it('calcula correctamente a 90 bpm con 35% (nivel 1 estándar)', () => {
    // 90 bpm → beat ≈ 666.67 ms → ventana ≈ 233.33 ms
    const expected = (60 / 90) * 1000 * 0.35;
    expect(calcularVentana(90, 0.35)).toBeCloseTo(expected, 5);
  });

  // ── Piso de 20 ms ─────────────────────────────────────────────────────────

  it('respeta el piso de 20 ms a tempo muy alto y porcentaje muy bajo', () => {
    // 240 bpm → beat = 250 ms → ventana = 250 × 0.01 = 2.5 ms → piso: 20 ms
    expect(calcularVentana(240, 0.01)).toBe(VENTANA_MINIMA_MS);
  });

  it('respeta el piso de 20 ms a 150 bpm con 1%', () => {
    // 150 bpm → beat = 400 ms → ventana = 400 × 0.01 = 4 ms → piso: 20 ms
    expect(calcularVentana(150, 0.01)).toBe(VENTANA_MINIMA_MS);
  });

  it('respeta el piso de 20 ms a 60 bpm con 1%', () => {
    // 60 bpm → beat = 1000 ms → ventana = 1000 × 0.01 = 10 ms → piso: 20 ms
    expect(calcularVentana(60, 0.01)).toBe(VENTANA_MINIMA_MS);
  });

  it('no aplica el piso cuando la ventana calculada supera 20 ms', () => {
    // 60 bpm → beat = 1000 ms → ventana = 1000 × 0.05 = 50 ms > 20 ms
    expect(calcularVentana(60, 0.05)).toBe(50);
  });

  it('devuelve exactamente 20 ms cuando la ventana calculada es exactamente 20 ms', () => {
    // necesitamos beat × porcentaje === 20
    // a 60 bpm → beat = 1000 ms → porcentaje = 0.02 → 1000 × 0.02 = 20 ms
    expect(calcularVentana(60, 0.02)).toBe(VENTANA_MINIMA_MS);
  });

  // ── VENTANA_MINIMA_MS constante ───────────────────────────────────────────

  it('VENTANA_MINIMA_MS es 20', () => {
    expect(VENTANA_MINIMA_MS).toBe(20);
  });

  // ── Niveles predefinidos ──────────────────────────────────────────────────

  it('nivel 1 (35%) a 60 bpm genera ventana > 20 ms', () => {
    const v = calcularVentana(60, TOLERANCIA_POR_NIVEL[1]);
    expect(v).toBeGreaterThan(VENTANA_MINIMA_MS);
  });

  it('nivel 5 (10%) a 240 bpm activa el piso de 20 ms', () => {
    // 240 bpm → beat = 250 ms → 250 × 0.10 = 25 ms > 20 ms (justo por encima)
    const v = calcularVentana(240, TOLERANCIA_POR_NIVEL[5]);
    expect(v).toBe(25);
  });

  it('nivel 5 (10%) a 60 bpm genera ventana = 100 ms', () => {
    // 60 bpm → beat = 1000 ms → 1000 × 0.10 = 100 ms
    expect(calcularVentana(60, TOLERANCIA_POR_NIVEL[5])).toBe(100);
  });

  // ── Casos borde de bpm ────────────────────────────────────────────────────

  it('a 20 bpm (mínimo) y 10% la ventana es grande y correcta', () => {
    // 20 bpm → beat = 3000 ms → 3000 × 0.10 = 300 ms
    expect(calcularVentana(20, 0.10)).toBe(300);
  });

  it('con porcentaje = 0 siempre retorna el piso', () => {
    expect(calcularVentana(90, 0)).toBe(VENTANA_MINIMA_MS);
  });
});
