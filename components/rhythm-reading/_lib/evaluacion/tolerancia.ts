/**
 * tolerancia.ts — Fórmula canónica de ventana de aceptación.
 *
 * La ventana de aceptación define cuántos ms antes/después de un beat
 * se considera que el alumno tocó a tiempo.
 *
 * Fórmula: ventana_ms = max(duracion_beat_ms × porcentaje, VENTANA_MINIMA_MS)
 *
 * Nivel 1 (principiante)  → porcentaje ≈ 0.35  (35 %)
 * Nivel 5 (avanzado)      → porcentaje ≈ 0.10  (10 %)
 * El piso de 20 ms protege contra latencias del sistema a tempo muy alto.
 */

/** Piso mínimo absoluto en ms (protege a tempo alto y latencias del sistema). */
export const VENTANA_MINIMA_MS = 20;

/**
 * Calcula la ventana de aceptación en milisegundos.
 *
 * @param bpm         Tempo en beats por minuto.
 * @param porcentaje  Fracción del beat (0-1) que define la tolerancia.
 *                    Ej: 0.35 = 35 % del beat → ventana de ±35 % antes/después.
 * @returns           Ventana en ms (nunca menor que VENTANA_MINIMA_MS).
 */
export function calcularVentana(bpm: number, porcentaje: number): number {
  const beatMs = (60 / bpm) * 1000;
  return Math.max(beatMs * porcentaje, VENTANA_MINIMA_MS);
}

/**
 * Porcentajes de tolerancia predefinidos por dificultad.
 * Usar con calcularVentana(bpm, TOLERANCIA_POR_NIVEL[nivel]).
 */
export const TOLERANCIA_POR_NIVEL: Record<number, number> = {
  1: 0.35,
  2: 0.28,
  3: 0.22,
  4: 0.16,
  5: 0.10,
};
